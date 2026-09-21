import React from "react";
import { useWishlistContext } from "../../../../../../cmponents/Hooks/WishListHook/Wishlist";
import { IonIcon } from "@ionic/react";
import { heart, heartOutline, eyeOutline, shareOutline } from "ionicons/icons";
import { Link, useNavigate } from "react-router-dom";
import FormattedCurrency from "../Currency/FormattedCurrency";

const TrendingProductCard = ({ item, isWishlisted: controlledWishlist, onToggleWishlist, onOpen }) => {
  const navigate = useNavigate();
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlistContext();

  const image = item.image || "";
  const hasDiscount = Number(item.discount_price || 0) > 0 || Number(item.discount || 0) > 0;
  const currentPrice = hasDiscount
    ? (item.final_discounted_price ?? item.discount_price ?? item.final_price ?? item.price ?? 0)
    : (item.final_price ?? item.price ?? 0);
  const originalPrice = item.original_price ?? item.price ?? item.final_price ?? 0;
  const savings = Math.max(0, Number(originalPrice) - Number(currentPrice));
  const discountPercent = Number(item.discount || item.percentage_discount || 0);
  const rating = item.rating ?? item.average_rating ?? 0;
  const reviewCount = item.review_count ?? item.reviews_count ?? item.reviews ?? 0;
  const stock = Number(item.in_stock ?? 0);
  const derivedWishlist = wishlist.some((entry) => entry.item?.id === item.id || entry.id === item.id);
  const isWishlisted = controlledWishlist ?? derivedWishlist;
  const displayName = String(item.name || "Marketplace product");
  const truncatedName = displayName.length > 42
    ? `${displayName.slice(0, 42).trimEnd()}…`
    : displayName;

  const openProduct = () => {
    if (onOpen) onOpen(item.id);
    else navigate(`/item/${item.id}`);
  };

  const toggleWishlist = async (event) => {
    event.stopPropagation();
    if (onToggleWishlist) return onToggleWishlist(event);
    if (isWishlisted) await removeFromWishlist(item.id);
    else await addToWishlist(item.id);
  };

  const shareProduct = async (event) => {
    event.stopPropagation();
    const url = window.location.origin + `/item/${item.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.name || "Maa Mara Market product", url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch (error) {
      if (error?.name !== "AbortError") console.error("Unable to share product", error);
    }
  };

  return (
    <article className="mm-product-card mm-card mm-card-interactive overflow-hidden bg-white">
      <div className="mm-product-media relative cursor-pointer" onClick={openProduct}>
        <img
          src={image || "/placeholder.png"}
          alt={item.name || "Marketplace product"}
          className="w-full aspect-square object-cover"
          loading="lazy"
        />

        <div className="mm-product-actions absolute top-2 right-2 flex flex-col gap-1.5 z-10">
          <button type="button" onClick={toggleWishlist} aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"} className="mm-product-action">
            <IonIcon icon={isWishlisted ? heart : heartOutline} />
          </button>
          <button type="button" onClick={(event) => { event.stopPropagation(); openProduct(); }} aria-label="View product" className="mm-product-action">
            <IonIcon icon={eyeOutline} />
          </button>
          <button type="button" onClick={shareProduct} aria-label="Share product" className="mm-product-action">
            <IonIcon icon={shareOutline} />
          </button>
        </div>

        {Number(item.discount || item.percentage_discount || 0) > 0 && (
          <span className="mm-product-discount">
            {Number(item.discount || item.percentage_discount)}% OFF
          </span>
        )}
      </div>

      <div className="mm-product-content p-3 sm:p-4 flex flex-col">
        <Link to={`/item/${item.id}`} onClick={(event) => event.stopPropagation()} className="block">
          <h3 className="text-sm sm:text-base font-medium text-gray-800 mb-1 truncate" title={displayName}>{truncatedName}</h3>
        </Link>

        <p className="mm-product-rating text-xs sm:text-sm text-gray-500 mb-1" aria-label={`${rating} rating from ${reviewCount} reviews`}>
          <span aria-hidden="true">★</span> {Number(rating).toFixed(1)}
          <span> · {reviewCount} reviews</span>
        </p>

        <div className="flex flex-wrap items-baseline gap-2 mb-2">
          <span className={`font-bold text-lg sm:text-xl ${hasDiscount ? "text-red-600" : "text-gray-900"}`}>
            <FormattedCurrency value={Number(currentPrice)} />
          </span>
          {hasDiscount && Number(originalPrice) > Number(currentPrice) && (
            <span className="text-xs sm:text-sm text-gray-400 line-through">
              <FormattedCurrency value={Number(originalPrice)} />
            </span>
          )}
        </div>


        {hasDiscount && Number(originalPrice) > Number(currentPrice) && (
          <div className="mt-0.5 leading-tight">
            {discountPercent > 0 && (
              <span className="block text-[10px] sm:text-xs font-semibold text-red-600">{discountPercent}% OFF</span>
            )}
            {savings > 0 && (
              <span className="block text-[10px] sm:text-xs font-medium text-green-600">
                Save up to <FormattedCurrency value={savings} />
              </span>
            )}
          </div>
        )}

      </div>
    </article>
  );
};

export default TrendingProductCard;
