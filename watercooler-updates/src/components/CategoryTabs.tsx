import type { CategoryId } from "@/types";
import { CATEGORIES } from "@/lib/config";

interface CategoryTabsProps {
  activeTab: CategoryId;
  onTabChange: (tab: CategoryId) => void;
}

const CategoryTabs = ({ activeTab, onTabChange }: CategoryTabsProps) => {
  return (
    <nav className="border-b border-border" aria-label="Categories">
      <div className="grid grid-cols-5 -mb-px">
        {CATEGORIES.map((cat) => {
          const isActive = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onTabChange(cat.id)}
              className={`
                relative px-2 py-3 text-sm font-semibold text-center transition-colors
                border-b-2 -mb-px
                ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground border-transparent hover:text-foreground"
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
