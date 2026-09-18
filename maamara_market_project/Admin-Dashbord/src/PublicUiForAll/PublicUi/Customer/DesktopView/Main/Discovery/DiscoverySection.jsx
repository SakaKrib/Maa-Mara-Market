import React from "react";
import { useWishlistContext } from "../../../../../../cmponents/Hooks/WishListHook/Wishlist";
import TrendingProductCard from "../Trending/TrendingProductCard";

const DiscoverySection = ({ title, description, items = [] }) => {
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlistContext();

  if (!items.length) return null;

  return (
    <section className="mm-section discovery-section">
      <div className="mm-container">
        <div className="mm-section-heading">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
        </div>
        <div className="product-card-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
          {items.map((item) => {
            const wishlisted = wishlist.some((entry) => entry.item?.id === item.id || entry.id === item.id);
            return (
              <TrendingProductCard
                key={item.id}
                item={item}
                isWishlisted={wishlisted}
                onToggleWishlist={() => wishlisted ? removeFromWishlist(item.id) : addToWishlist(item.id)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DiscoverySection;
