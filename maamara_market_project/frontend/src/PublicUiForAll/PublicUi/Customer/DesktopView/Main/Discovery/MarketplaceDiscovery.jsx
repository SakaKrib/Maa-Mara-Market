import React, { useEffect, useMemo, useState } from "react";
import useMarketplaceDiscovery from "./useMarketplaceDiscovery";
import DiscoverySection from "./DiscoverySection";

const getId = (item) => String(item?.id ?? "");

const MarketplaceDiscovery = () => {
  const { feed, loading, refresh } = useMarketplaceDiscovery();
  const [mobileCollectionIds, setMobileCollectionIds] = useState(() => (
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
      ? (window.__mmHomepageCollectionIds || [])
      : []
  ));

  useEffect(() => {
    const refreshCollectionIds = () => {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      const ids = isMobile ? (window.__mmHomepageCollectionIds || []) : [];
      setMobileCollectionIds(ids);
      if (isMobile && ids.length) refresh(ids);
    };
    window.addEventListener("mm:homepage-collections-updated", refreshCollectionIds);
    window.addEventListener("resize", refreshCollectionIds);
    refreshCollectionIds();
    return () => {
      window.removeEventListener("mm:homepage-collections-updated", refreshCollectionIds);
      window.removeEventListener("resize", refreshCollectionIds);
    };
  }, [refresh]);

  const uniqueFeed = useMemo(() => {
    const used = new Set(mobileCollectionIds.map(String));
    const takeUnique = (items = [], limit = 8) => {
      const selected = [];
      for (const item of items) {
        if (selected.length >= limit) break;
        const id = getId(item);
        if (!id || used.has(id)) continue;
        used.add(id);
        selected.push(item);
      }
      return selected;
    };

    // This order is intentional: earlier sections have display priority.
    // Extra API candidates let later sections replace overlaps rather than shrink.
    const trending = takeUnique(feed.trending);
    const best_selling = takeUnique(feed.best_selling);
    const most_wanted = takeUnique(feed.most_wanted);
    const featured = takeUnique(feed.featured);
    const occasion_collections = (feed.occasion_collections || []).map((collection) => ({
      ...collection,
      items: takeUnique(collection.items || []),
    }));
    return { trending, best_selling, most_wanted, featured, occasion_collections };
  }, [feed, mobileCollectionIds]);

  const hasItems = Object.values(uniqueFeed).some(
    (items) => Array.isArray(items) && (items.some((item) => item) || items.length)
  );

  if (loading && !hasItems) {
    return <section className="mm-section"><div className="mm-container mm-card p-8 text-center">Loading marketplace picks…</div></section>;
  }

  return (
    <div className="discovery-section">
      <DiscoverySection title="Trending now" description="Products receiving measurable shopper activity in the last 7 days." items={uniqueFeed.trending} viewAllTo="/discovery?section=trending" />
      <DiscoverySection title="Best sellers" description="Products with at least 5 completed, non-refunded units sold in the last 30 days." items={uniqueFeed.best_selling} viewAllTo="/discovery?section=best_selling" />
      <DiscoverySection title="Most wanted" description="Products receiving recent wishlist activity from shoppers." items={uniqueFeed.most_wanted} viewAllTo="/discovery?section=most_wanted" />
      <DiscoverySection title="Featured on Maa Mara" description="Products explicitly selected for marketplace featuring." items={uniqueFeed.featured} viewAllTo="/discovery?section=featured" />
      {uniqueFeed.occasion_collections.map((collection) => (
        <DiscoverySection key={collection.key} title={collection.title} description={collection.description} items={collection.items} viewAllTo={`/discovery?section=occasion&key=${encodeURIComponent(collection.key)}`} />
      ))}
    </div>
  );
};

export default MarketplaceDiscovery;
