import { LineChart, Landmark, Globe2, Trophy, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CategoryId } from "@/types";
import { CATEGORIES } from "@/lib/config";

const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  markets: LineChart,
  politics: Landmark,
  global: Globe2,
  sports: Trophy,
  culture: Sparkles,
};

// Shorter labels for mobile where space is tight
const MOBILE_LABELS: Record<CategoryId, string> = {
  markets: "Markets",
  politics: "Politics",
  global: "Global",
  sports: "Sports",
  culture: "Culture",
};

interface CategoryTabsProps {
  activeTab: CategoryId;
  onTabChange: (tab: CategoryId) => void;
}

const CategoryTabs = ({ activeTab, onTabChange }: CategoryTabsProps) => {
  return (
    <nav
      className="border-y border-border bg-card/40 w-screen relative left-1/2 -translate-x-1/2"
      aria-label="Categories"
    >
      <div className="grid grid-cols-5">
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id];
          const isActive = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onTabChange(cat.id)}
              className={`
                relative py-3 sm:py-5 px-1 font-display text-sm sm:text-xl font-semibold tracking-tight text-center transition-colors
                border-b-[3px]
                flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5
                ${
                  isActive
                    ? "text-foreground bg-background"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-background/50"
                }
              `}
              style={
                isActive
                  ? { borderBottomColor: `hsl(var(--cat-${cat.id}))` }
                  : undefined
              }
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className="w-4 h-4 sm:w-[22px] sm:h-[22px] shrink-0"
                style={isActive ? { color: `hsl(var(--cat-${cat.id}))` } : undefined}
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="hidden sm:inline">{cat.label}</span>
              <span className="sm:hidden text-xs">{MOBILE_LABELS[cat.id]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default CategoryTabs;
