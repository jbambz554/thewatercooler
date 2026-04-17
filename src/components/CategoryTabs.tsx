import type { CategoryId } from "@/types";
import { CATEGORIES } from "@/lib/config";

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
          const isActive = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onTabChange(cat.id)}
              className={`
                relative py-5 text-base sm:text-lg font-semibold text-center transition-colors
                border-b-[3px]
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
              {cat.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default CategoryTabs;
