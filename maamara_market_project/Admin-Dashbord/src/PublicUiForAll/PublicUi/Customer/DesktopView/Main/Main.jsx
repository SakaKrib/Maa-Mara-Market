import React from "react";
import "../../../../PublicUi/maamara.css";
import HomepageHero from "./HomepageHero";
import CategoryWithItems from "./Trending/Category/CategoryWithItemList";
import MarketplaceDiscovery from "./Discovery/MarketplaceDiscovery";
import AccountHighlights from "./AccountHighlights";

const Main = () => (
  <main className="mm-page">
    <HomepageHero />
    <AccountHighlights />

    <section className="category-collections mm-section">
      <div className="mm-container">
        <CategoryWithItems />
      </div>
    </section>

    <MarketplaceDiscovery />
  </main>
);

export default Main;
