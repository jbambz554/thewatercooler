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
                relative py-5 font-display text-lg sm:text-xl font-semibold tracking-tight text-center transition-colors
                border-b-[3px]
                flex items-center justify-center gap-2.5
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
                className="w-5 h-5 sm:w-[22px] sm:h-[22px] shrink-0"
                style={isActive ? { color: `hsl(var(--cat-${cat.id}))` } : undefined}
                strokeWidth={1.75}
                aria-hidden
              />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default CategoryTabs;
