import { useState } from "react";
import type { CategoryId } from "@/types";
import Header from "@/components/Header";
import MarketStrip from "@/components/MarketStrip";
import Scoreboard from "@/components/Scoreboard";
import CategoryTabs from "@/components/CategoryTabs";
import NewsFeed from "@/components/NewsFeed";
import Footer from "@/components/Footer";

const App = () => {
  const [activeTab, setActiveTab] = useState<CategoryId>("markets");
  const isSports = activeTab === "sports";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-4 sm:py-10">
        <section className="mb-6 sm:mb-8" aria-label={isSports ? "Live scoreboard" : "Market snapshot"}>
          <div className="flex items-baseline justify-between mb-2 sm:mb-3">
            <h2 className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              {isSports ? "Live Scoreboard" : "Market Snapshot"}
            </h2>
          </div>
          {isSports ? <Scoreboard active={isSports} /> : <MarketStrip />}
        </section>

        <div className="mb-4 sm:mb-6">
          <CategoryTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <NewsFeed category={activeTab} />
      </main>

      <Footer />
    </div>
  );
};

export default App;
