import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useWishlistContext } from "../../../../../../cmponents/Hooks/WishListHook/Wishlist";
import TrendingProductCard from "../Trending/TrendingProductCard";

const DiscoverySection = ({ title, description, items = [], viewAllTo }) => {
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
          {viewAllTo && (
            <Link to={viewAllTo} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-gray-500 hover:bg-gray-50">
              View all <ArrowRight size={16} />
            </Link>
          )}
        </div>
        <div className="product-card-grid grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6 mm-mobile-horizontal-scroll mm-mobile-discovery-rail">
          {items.map((item) => {
            const wishlisted = (wishlist || []).some((entry) => entry.item?.id === item.id || entry.id === item.id);
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
