import React from "react";
import useMarketplaceDiscovery from "./useMarketplaceDiscovery";
import DiscoverySection from "./DiscoverySection";

const MarketplaceDiscovery = () => {
  const { feed, loading } = useMarketplaceDiscovery();
  if (loading && !Object.values(feed).some((items) => items.length)) {
    return <section className="mm-section"><div className="mm-container mm-card p-8 text-center">Loading marketplace picks…</div></section>;
  }

  return (
    <>
      <DiscoverySection title="Popular right now" description="Products getting the most attention from shoppers." items={feed.popular} />
      <DiscoverySection title="Most wanted" description="Products attracting strong wishlist interest." items={feed.most_wanted} />
      <DiscoverySection title="Frequently bought" description="Products with completed sales on Maa Mara Market." items={feed.best_selling} />
      <DiscoverySection title="Featured" description="Selected marketplace highlights." items={feed.featured} />
    </>
  );
};

export default MarketplaceDiscovery;
