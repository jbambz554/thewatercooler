import { useState } from "react";
import type { CategoryId } from "@/types";
import Header from "@/components/Header";
import MarketStrip from "@/components/MarketStrip";
import CategoryTabs from "@/components/CategoryTabs";
import NewsFeed from "@/components/NewsFeed";
import Footer from "@/components/Footer";

const App = () => {
  const [activeTab, setActiveTab] = useState<CategoryId>("markets");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-6 sm:py-10">
        <section className="mb-8" aria-label="Market snapshot">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Market Snapshot
            </h2>
          </div>
          <MarketStrip />
        </section>

        <div className="mb-6">
          <CategoryTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <NewsFeed category={activeTab} />
      </main>

      <Footer />
    </div>
  );
};

export default App;
