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
        title="Popular right now"
        description="Products getting the most attention from shoppers."
        items={feed.popular}
      />
      <DiscoverySection
        title="Frequently bought"
        description="Products with completed sales on Maa Mara Market."
        items={feed.best_selling}
      />
    </div>
  );
};

export default MarketplaceDiscovery;
