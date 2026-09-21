import React from "react";
import useMarketplaceDiscovery from "./useMarketplaceDiscovery";
import DiscoverySection from "./DiscoverySection";

const MarketplaceDiscovery = () => {
  const { feed, loading } = useMarketplaceDiscovery();
  const hasItems = Object.values(feed).some(
    (items) => Array.isArray(items) && items.length
  );

  if (loading && !hasItems) {
    return (
      <section className="mm-section">
        <div className="mm-container mm-card p-8 text-center">
          Loading marketplace picks…
        </div>
      </section>
    );
  }

  return (
    <div className="discovery-section">
      <DiscoverySection
        title="Trending now"
        description="Products receiving measurable shopper activity in the last 7 days."
        items={feed.trending}
      />
      <DiscoverySection
        title="Best sellers"
        description="Products with at least 5 completed, non-refunded units sold in the last 30 days."
        items={feed.best_selling}
      />
      <DiscoverySection
        title="Most wanted"
        description="Products receiving recent wishlist activity from shoppers."
        items={feed.most_wanted}
      />
      <DiscoverySection
        title="Featured on Maa Mara"
        description="Products explicitly selected for marketplace featuring."
        items={feed.featured}
      />
    </div>
  );
};

export default MarketplaceDiscovery;
