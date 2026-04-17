import type { Handler } from "@netlify/functions";

interface MarketQuote {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
}

const INDICES: { symbol: string; stooqId: string; label: string }[] = [
  { symbol: "SPX", stooqId: "^spx", label: "S&P 500" },
  { symbol: "DJI", stooqId: "^dji", label: "Dow" },
  { symbol: "IXIC", stooqId: "^ndq", label: "Nasdaq" },
];

async function fetchStooq(
  stooqId: string,
  symbol: string,
  label: string
): Promise<MarketQuote | null> {
  try {
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqId)}&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WaterCoolerBot/1.0)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;
    const cols = lines[1].split(",");
    const open = parseFloat(cols[3]);
    const close = parseFloat(cols[6]);
    if (Number.isNaN(open) || Number.isNaN(close) || open === 0) return null;
    const change = close - open;
    const changePercent = (change / open) * 100;
    return { symbol, label, price: close, change, changePercent };
  } catch (err) {
    console.warn(`Stooq ${symbol} failed:`, err);
    return null;
  }
}

async function fetchCrypto(): Promise<MarketQuote[]> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true",
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; WaterCoolerBot/1.0)" },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const quotes: MarketQuote[] = [];
    if (data.bitcoin) {
      const price = data.bitcoin.usd;
      const pct = data.bitcoin.usd_24h_change ?? 0;
      quotes.push({
        symbol: "BTC",
        label: "Bitcoin",
        price,
        change: (price * pct) / 100,
        changePercent: pct,
      });
    }
    if (data.ethereum) {
      const price = data.ethereum.usd;
      const pct = data.ethereum.usd_24h_change ?? 0;
      quotes.push({
        symbol: "ETH",
        label: "Ethereum",
        price,
        change: (price * pct) / 100,
        changePercent: pct,
      });
    }
    return quotes;
  } catch (err) {
    console.warn("CoinGecko failed:", err);
    return [];
  }
}

export const handler: Handler = async () => {
  const [indexResults, cryptoResults] = await Promise.all([
    Promise.all(INDICES.map((i) => fetchStooq(i.stooqId, i.symbol, i.label))),
    fetchCrypto(),
  ]);

  const quotes = [
    ...indexResults.filter((q): q is MarketQuote => q !== null),
    ...cryptoResults,
  ];

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=30, s-maxage=60",
    },
    body: JSON.stringify({ quotes, fetchedAt: new Date().toISOString() }),
  };
};
