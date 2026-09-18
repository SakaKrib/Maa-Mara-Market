import React from "react";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";
import { IonIcon } from "@ionic/react";
import { heart, heartOutline, eyeOutline, shareOutline } from "ionicons/icons";
import { Link, useNavigate } from "react-router-dom";
import AddToCartButton from "../CartActionButtons/AddToCartBtn";

const TrendingProductCard = ({ item, isWishlisted = false, onToggleWishlist, onOpen }) => {
  const navigate = useNavigate();
  const image = item.image?.startsWith("http") ? item.image : `${baseUrl || ""}${item.image || ""}`;
  const hasDiscount = Number(item.discount_price || 0) > 0 || Number(item.discount || 0) > 0;
  const currentPrice = hasDiscount
    ? (item.final_discounted_price ?? item.discount_price ?? item.final_price ?? item.price ?? 0)
    : (item.final_price ?? item.price ?? 0);
  const originalPrice = item.final_price ?? item.original_price ?? item.price ?? 0;
  const rating = item.rating ?? item.average_rating ?? 0;

  const openProduct = () => {
    if (onOpen) onOpen(item.id);
    else navigate(`/item/${item.id}`);
  };

  return (
    <article className="mm-card mm-card-interactive h-full overflow-hidden bg-white">
      <div className="relative cursor-pointer" onClick={openProduct}>
        <img src={image || "/placeholder.png"} alt={item.name || "Marketplace product"} className="w-full aspect-square object-cover" loading="lazy" />
        <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
          {onToggleWishlist && (
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); onToggleWishlist(event); }}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              className="rounded-full p-2 bg-white/90 shadow-sm"
            >
              <IonIcon icon={isWishlisted ? heart : heartOutline} className={isWishlisted ? "text-red-500" : "text-gray-500"} />
            </button>
          )}
          <button type="button" onClick={(event) => event.stopPropagation()} aria-label="View product" className="rounded-full p-2 bg-white/90 shadow-sm">
            <IonIcon icon={eyeOutline} className="text-gray-600" />
          </button>
          <button type="button" onClick={(event) => event.stopPropagation()} aria-label="Share product" className="rounded-full p-2 bg-white/90 shadow-sm">
            <IonIcon icon={shareOutline} className="text-gray-600" />
          </button>
        </div>
        {Number(item.discount || 0) > 0 && (
          <span className="absolute bottom-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
            {item.discount}% OFF
          </span>
        )}
      </div>

      <div className="p-3 sm:p-4 flex flex-col h-full">
        <Link to={`/item/${item.id}`} onClick={(event) => event.stopPropagation()}>
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-1 line-clamp-2">{item.name}</h3>
        </Link>
        <p className="text-xs sm:text-sm text-gray-500 mb-2" aria-label={`${rating} rating from reviews`}>
          ★ {Number(rating).toFixed(1)} <span>({item.review_count ?? item.reviews_count ?? item.reviews ?? 0} reviews)</span>
        </p>
        <div className="flex flex-wrap items-baseline gap-2 mb-2">
          <span className={`font-bold text-lg sm:text-xl ${hasDiscount ? "text-red-600" : "text-gray-900"}`}>
            KES {Number(currentPrice).toLocaleString()}
          </span>
          {hasDiscount && Number(originalPrice) > Number(currentPrice) && (
            <span className="text-xs sm:text-sm text-gray-400 line-through">
              KES {Number(originalPrice).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex justify-between gap-2 text-[11px] sm:text-xs text-gray-500 mb-3">
          <span>{item.sold || 0} sold</span>
          <span>{item.in_stock || 0} in stock</span>
        </div>
        <AddToCartButton
          itemId={item.id}
          quantity={1}
          availableStock={item.in_stock}
          remainingStock={item.in_stock}
          disabled={Number(item.in_stock || 0) <= 0}
        />
      </div>
    </article>
  );
};

export default TrendingProductCard;