import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import type { CategoryId } from "@/types";
import { useNews } from "@/hooks/useNews";
import { useNow } from "@/hooks/useNow";
import { CATEGORIES } from "@/lib/config";
import { formatTimeAgo } from "@/lib/format";
import StoryCard from "./StoryCard";

interface NewsFeedProps {
  category: CategoryId;
}

const NewsFeed = ({ category }: NewsFeedProps) => {
  const now = useNow(60_000);
  const { stories, isLoading, error, lastUpdated, refetch } = useNews(category);
  const categoryInfo = CATEGORIES.find((c) => c.id === category)!;

  return (
    <div className="animate-fade-in" key={category}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold leading-tight">
            {categoryInfo.label}
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">
            {categoryInfo.description}
          </p>
        </div>
        <button
          onClick={refetch}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 pb-1"
          aria-label="Refresh stories"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span className="font-mono tabular-nums">
            {lastUpdated ? formatTimeAgo(new Date(lastUpdated).toISOString(), now) : "—"}
          </span>
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-card p-6 sm:p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Couldn't load stories right now. Retrying automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {stories.map((story, idx) => (
              <StoryCard
                key={story.id}
                story={story}
                isTopStory={idx === 0}
                category={category}
                now={now}
              />
            ))}
          </div>
        )}
      </div>

      {error && stories.length > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          Live refresh failed — showing last cached stories.
        </p>
      )}
    </div>
  );
};

export default NewsFeed;
