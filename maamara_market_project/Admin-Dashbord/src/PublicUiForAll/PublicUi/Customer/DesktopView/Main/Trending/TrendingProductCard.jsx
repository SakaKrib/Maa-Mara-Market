import React from "react";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";
import { IonIcon } from "@ionic/react";
import { heart, heartOutline, eyeOutline, shareOutline } from "ionicons/icons";
import { Link } from "react-router-dom";
import AddToCartButton from "../CartActionButtons/AddToCartBtn";

const TrendingProductCard = ({ item, isWishlisted, onToggleWishlist, onOpen }) => {
  const image = item.image?.startsWith("http") ? item.image : `${baseUrl || ""}${item.image || ""}`;
  const hasDiscount = Number(item.discount_price || 0) > 0;

  return (
    <article className="border rounded-lg shadow-sm hover:shadow-md transition duration-300 bg-white">
      <div className="relative cursor-pointer" onClick={() => onOpen(item.id)}>
        <img src={image} alt={item.name} className="w-full h-52 object-cover rounded-t-lg" />
        <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
          <button type="button" onClick={onToggleWishlist} aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"} className="rounded-full p-2 bg-gray-100">
            <IonIcon icon={isWishlisted ? heart : heartOutline} className={isWishlisted ? "text-red-500" : "text-gray-400"} />
          </button>
          <IonIcon icon={eyeOutline} className="text-white bg-blue-500 rounded-full p-2 text-sm" />
          <IonIcon icon={shareOutline} className="text-white bg-green-500 rounded-full p-2 text-sm" />
        </div>
        {Number(item.discount || 0) > 0 && (
          <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">{item.discount}% OFF</div>
        )}
      </div>

      <div className="p-4">
        <Link to={`/item/${item.id}`} onClick={(e) => e.stopPropagation()}>
          <h3 className="text-base font-semibold text-gray-800 mb-1">{item.name}</h3>
        </Link>
        <p className="text-sm text-gray-500 mb-2">({item.rating ?? item.average_rating ?? 0} reviews)</p>
        <div className="flex items-center gap-4">
          <h2 className={`font-medium text-2xl ${hasDiscount ? "text-red-600" : ""}`}>
            Ksh {Number(hasDiscount ? item.final_discounted_price : item.final_price || item.price || 0).toLocaleString()}
          </h2>
          {hasDiscount && <h3 className="text-lg text-gray-400 line-through">Ksh {Number(item.final_price || 0).toLocaleString()}</h3>}
        </div>
        <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
          <p>{item.sold || 0} sold</p>
          <p>{item.in_stock || 0} in stock</p>
        </div>
        <AddToCartButton
          itemId={item.id}
          quantity={1}
          availableStock={item.in_stock}
          remainingStock={item.in_stock}
          disabled={item.in_stock === 0}
        />
      </div>
    </article>
  );
};

export default TrendingProductCard;
