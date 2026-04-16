import { Clock, ExternalLink } from "lucide-react";
import type { Story, CategoryId } from "@/types";
import { formatTimeAgo } from "@/lib/format";

interface StoryCardProps {
  story: Story;
  isTopStory: boolean;
  rank: number;
  category: CategoryId;
  now: number;
}

const StoryCard = ({ story, isTopStory, rank, category, now }: StoryCardProps) => {
  return (
    <article
      className={`
        group flex gap-4
        ${isTopStory ? "pb-5 border-b border-border" : "py-1"}
      `}
    >
      <div className="flex flex-col items-center shrink-0 pt-1">
        <span
          className="font-display font-bold text-sm tabular-nums"
          style={{ color: `hsl(var(--cat-${category}))` }}
        >
          {String(rank).padStart(2, "0")}
        </span>
        <span
          className="w-px flex-1 mt-1.5"
          style={{ backgroundColor: `hsl(var(--cat-${category}) / 0.2)` }}
          aria-hidden
        />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <a
          href={story.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block group/link"
        >
          <h3
            className={`
              font-display font-semibold leading-snug
              group-hover/link:underline decoration-2 underline-offset-4
              ${isTopStory ? "text-xl sm:text-2xl" : "text-base sm:text-lg"}
            `}
            style={{ textDecorationColor: `hsl(var(--cat-${category}))` }}
          >
            {story.headline}
            <ExternalLink className="inline-block w-3.5 h-3.5 ml-1.5 opacity-0 group-hover/link:opacity-60 transition-opacity -translate-y-0.5" />
          </h3>
        </a>

        {story.summary && isTopStory && (
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
            {story.summary}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
          <span className="font-semibold uppercase tracking-wider text-[11px]">
            {story.source}
          </span>
          <span className="opacity-40">•</span>
          <span className="flex items-center gap-1 font-mono tabular-nums">
            <Clock className="w-3 h-3" />
            {formatTimeAgo(story.publishedAt, now)}
          </span>
        </div>
      </div>
    </article>
  );
};

export default StoryCard;
