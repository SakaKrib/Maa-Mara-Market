import React from "react";
import { Link } from "react-router-dom";
import { useWishlistContext } from "../../../../../../cmponents/Hooks/WishListHook/Wishlist";
import useTrendingProducts from "./useTrendingProducts";
import FeaturedOffer from "./FeaturedOffer";
import TrendingProductCard from "./TrendingProductCard";
import ProductSkeleton from "./ProductSkelwton";
import useHomepageOffers from "./useHomepageOffers";

const TrendingProducts = () => {
  const { items, sections, collections, metadata, loading } = useTrendingProducts();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlistContext();
  const offerGroups = useHomepageOffers(6);

  if (loading) {
    return (
      <section className="py-10 px-4 md:px-10 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="mx-auto h-8 w-56 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="product-card-grid grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <ProductSkeleton key={index} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // An item appears once on the page: offers claim their items first, and every
  // later section skips anything already shown.
  const shownIds = new Set();
  const offerSections = offerGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !shownIds.has(item.id) && shownIds.add(item.id)),
    }))
    .filter((group) => group.items.length > 0);
  const featuredOfferItem = offerSections[0]?.items[0];
  if (featuredOfferItem) shownIds.add(featuredOfferItem.id);

  const renderSection = (title, sectionItems, viewAllPath = "/list") => {
    const visibleItems = sectionItems
      .filter((item) => item.in_offer === false && !shownIds.has(item.id))
      .slice(0, 6);
    visibleItems.forEach((item) => shownIds.add(item.id));

    if (!visibleItems.length) return null;

    return (
      <div className="mm-market-product-section">
        <div className="mm-market-section-header">
          <h2 className="mm-market-section-title">{title}</h2>
          <Link to={viewAllPath} className="mm-market-view-all">
            View all
          </Link>
        </div>

        <div className="product-card-grid grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
          {visibleItems.map((item) => {
            const isWishlisted = wishlist.some(
              (entry) => entry.item?.id === item.id || entry.id === item.id
            );

            const toggleWishlist = async (event) => {
              event.stopPropagation();
              if (isWishlisted) await removeFromWishlist(item.id);
              else await addToWishlist(item.id);
            };

            return (
              <TrendingProductCard
                key={item.id}
                item={item}
                isWishlisted={isWishlisted}
                onToggleWishlist={toggleWishlist}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section className="py-10 px-4 md:px-10 bg-white">
      <div className="max-w-7xl mx-auto">
        <FeaturedOffer item={featuredOfferItem} />

        {offerSections.map((group, groupIndex) => {
          const groupItems = groupIndex === 0 ? group.items.slice(1) : group.items;
          if (!groupItems.length) return null;
          return (
            <div className="mm-market-product-section" key={group.key}>
              <div className="mm-market-section-header">
                <h2 className="mm-market-section-title">{group.label}</h2>
                {group.has_more || group.total > groupItems.length ? (
                  <Link to={`/offers?group=${group.key}`} className="mm-market-view-all">
                    View more
                  </Link>
                ) : null}
              </div>
              <div className="product-card-grid grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
                {groupItems.map((item) => {
                  const saved = wishlist.some((entry) => entry.item?.id === item.id || entry.id === item.id);
                  return (
                    <TrendingProductCard
                      key={item.id}
                      item={item}
                      isWishlisted={saved}
                      onToggleWishlist={async (event) => {
                        event.stopPropagation();
                        if (saved) await removeFromWishlist(item.id);
                        else await addToWishlist(item.id);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {metadata.has_activity &&
          renderSection("Recommended for You", sections.personalized)}

        {metadata.has_search_history &&
          metadata.recent_search &&
          renderSection(
            `Inspired by your recent search: “${metadata.recent_search}”`,
            sections.search_related
          )}

        {renderSection("Popular Right Now", sections.popular)}

        {sections.best_selling.length > 0 &&
          renderSection("Best Selling", sections.best_selling)}

        {collections.map((collection) =>
          renderSection(
            collection.name,
            collection.items,
            `/list?category_id=${collection.id}&category_name=${encodeURIComponent(collection.name)}&page=1`
          )
        )}
      </div>
    </section>
  );
};

export default TrendingProducts;
