import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useMarketData } from "@/hooks/useMarketData";
import { formatPrice, formatPercent } from "@/lib/format";
import type { MarketQuote } from "@/types";

function QuoteCell({ quote, fullWidthMobile }: { quote: MarketQuote; fullWidthMobile?: boolean }) {
  const isUp = quote.changePercent > 0.01;
  const isDown = quote.changePercent < -0.01;
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const colorClass = isUp ? "text-up" : isDown ? "text-down" : "text-muted-foreground";

  return (
    <div
      className={`
        flex flex-col sm:flex-row sm:items-baseline sm:justify-between
        gap-1 sm:gap-3 py-3 px-3 sm:px-4
        border-r border-b sm:border-b-0 border-border last:border-r-0 min-w-0
        ${fullWidthMobile ? "col-span-2 md:col-span-1 items-center sm:items-baseline text-center sm:text-left" : ""}
      `}
    >
      <div className="min-w-0">
        <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          {quote.label}
        </p>
        <p className="font-display text-base sm:text-xl font-semibold tabular-nums truncate">
          {formatPrice(quote.price)}
        </p>
      </div>
      <div className={`flex items-center gap-1 text-xs sm:text-sm font-mono tabular-nums ${colorClass} shrink-0`}>
        <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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

  // If there's an odd number of quotes, the last one spans both columns on mobile
  // to fill the row instead of leaving awkward whitespace.
  const isOdd = quotes.length % 2 === 1;

  return (
    <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-5">
        {quotes.map((quote, idx) => (
          <QuoteCell
            key={quote.symbol}
            quote={quote}
            fullWidthMobile={isOdd && idx === quotes.length - 1}
          />
        ))}
      </div>
    </div>
  );
};

export default MarketStrip;
