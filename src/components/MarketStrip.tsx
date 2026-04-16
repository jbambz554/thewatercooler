import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useMarketData } from "@/hooks/useMarketData";
import { formatPrice, formatPercent } from "@/lib/format";
import type { MarketQuote } from "@/types";

function QuoteCell({ quote }: { quote: MarketQuote }) {
  const isUp = quote.changePercent > 0.01;
  const isDown = quote.changePercent < -0.01;
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const colorClass = isUp ? "text-up" : isDown ? "text-down" : "text-muted-foreground";

  return (
    <div className="flex items-baseline justify-between gap-3 py-3 px-4 border-r border-border last:border-r-0 min-w-0">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          {quote.label}
        </p>
        <p className="font-display text-xl font-semibold tabular-nums truncate">
          {formatPrice(quote.price)}
        </p>
      </div>
      <div className={`flex items-center gap-1 text-sm font-mono tabular-nums ${colorClass} shrink-0`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{formatPercent(quote.changePercent)}</span>
      </div>
    </div>
  );
}

const MarketStrip = () => {
  const { quotes, isLoading } = useMarketData();

  if (isLoading && quotes.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-card">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="py-3 px-4 space-y-2">
              <div className="h-2.5 w-16 bg-muted rounded animate-pulse" />
              <div className="h-5 w-20 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-card p-4">
        <p className="text-sm text-muted-foreground text-center">
          Market data unavailable right now. Will retry automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-5">
        {quotes.map((quote) => (
          <QuoteCell key={quote.symbol} quote={quote} />
        ))}
      </div>
    </div>
  );
};

export default MarketStrip;
