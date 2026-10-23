import React from "react";
import { Link } from "react-router-dom";
import { useWishlistContext } from "../../../../../../cmponents/Hooks/WishListHook/Wishlist";
import useTrendingProducts from "./useTrendingProducts";
import FeaturedOffer from "./FeaturedOffer";
import TrendingProductCard from "./TrendingProductCard";
import ProductSkeleton from "./ProductSkelwton";

const TrendingProducts = () => {
  const { items, sections, collections, metadata, loading } = useTrendingProducts();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlistContext();

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

  const isRunningOffer = (item) =>
    item.in_offer && item.offer?.end_date && new Date(item.offer.end_date) > new Date();
  const runningOffers = items.filter(isRunningOffer);
  const featuredOfferItem = runningOffers[0];
  const moreOffers = runningOffers.slice(1, 7);

  const renderSection = (title, sectionItems, viewAllPath = "/list") => {
    const visibleItems = sectionItems.filter((item) => item.in_offer === false).slice(0, 6);

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

        {moreOffers.length > 0 && (
          <div className="mm-market-product-section">
            <div className="mm-market-section-header">
              <h2 className="mm-market-section-title">Items on offer</h2>
            </div>
            <div className="product-card-grid grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
              {moreOffers.map((item) => (
                <TrendingProductCard
                  key={item.id}
                  item={item}
                  isWishlisted={wishlist.some((entry) => entry.item?.id === item.id || entry.id === item.id)}
                  onToggleWishlist={async (event) => {
                    event.stopPropagation();
                    const saved = wishlist.some((entry) => entry.item?.id === item.id || entry.id === item.id);
                    if (saved) await removeFromWishlist(item.id);
                    else await addToWishlist(item.id);
                  }}
                />
              ))}
            </div>
          </div>
        )}

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
