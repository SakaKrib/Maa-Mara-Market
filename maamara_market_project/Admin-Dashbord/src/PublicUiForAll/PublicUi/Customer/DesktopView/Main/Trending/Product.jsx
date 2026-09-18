import React from "react";
import { useNavigate } from "react-router-dom";
import { useWishlistContext } from "../../../../../../cmponents/Hooks/WishListHook/Wishlist";
import api from "../../../../../../Services/Api";
import useTrendingProducts from "./useTrendingProducts";
import FeaturedOffer from "./FeaturedOffer";
import TrendingProductCard from "./TrendingProductCard";

const TrendingProducts = () => {
  const { items, loading, nextUrl, prevUrl, fetchItems } = useTrendingProducts();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlistContext();
  const navigate = useNavigate();

  const handleItemClick = async (id) => {
    try {
      await api.get(`/api/items/${id}/`);
    } finally {
      navigate(`/item/${id}`);
    }
  };

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  const featuredOfferItem = items.find((item) => item.in_offer && item.offer?.end_date);
  const regularItems = items.filter((item) => item.in_offer === false);

  return (
    <section className="py-10 px-4 md:px-10 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Trending Products</h2>
        </div>

        <FeaturedOffer item={featuredOfferItem} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {regularItems.map((item) => {
            const isWishlisted = wishlist.some((entry) => entry.item?.id === item.id || entry.id === item.id);
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
                onOpen={handleItemClick}
              />
            );
          })}
        </div>

        {(prevUrl || nextUrl) && (
          <div className="flex justify-between items-center mt-10">
            {prevUrl ? (
              <button onClick={() => fetchItems(prevUrl)} className="secondary-button px-4 py-2 rounded-md text-white">
                Previous
              </button>
            ) : <span />}
            {nextUrl && (
              <button onClick={() => fetchItems(nextUrl)} className="secondary-button px-4 py-2 rounded-md text-white">
                Next
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default TrendingProducts;
