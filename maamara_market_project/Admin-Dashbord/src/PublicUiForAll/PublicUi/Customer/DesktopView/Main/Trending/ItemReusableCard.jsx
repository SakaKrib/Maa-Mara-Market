import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import CartIcon from "@mui/icons-material/ShoppingCartOutlined";
import {
  shareOutline,
  heartOutline,
  eyeOutline,
  heart,
} from "ionicons/icons";
import AddToCartButton from "../CartActionButtons/AddToCartBtn";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";

const ProductCard = ({
  item,
  wishlist,
  addToWishlist,
  removeFromWishlist,
  onItemClick,
}) => {
  const navigate = useNavigate();

  const isWishlisted = wishlist.some(
    (w) => w.item?.id === item.id || w.id === item.id
  );

  const handleToggleWishlist = async (e) => {
    e.stopPropagation();
    if (isWishlisted) {
      await removeFromWishlist(item.id);
    } else {
      await addToWishlist(item.id);
    }
  };

  const handleCardClick = () => {
    if (onItemClick) onItemClick(item.id);
    else navigate(`/item/${item.id}`);
  };

  // Fix image URL with baseUrl fallback if not absolute URL
  const imageUrl = item.image && !/^https?:\/\//i.test(item.image) ? baseUrl + item.image : item.image;

  return (
    <div
      key={item.id}
      className="border rounded-lg shadow-sm hover:shadow-md transition duration-300 bg-white cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="relative">
        <img
          src={imageUrl}
          alt={item.name}
          className="w-full h-52 object-cover rounded-t-lg"
        />

        {/* Hover Icons */}
        <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
          <button
            type="button"
            onClick={handleToggleWishlist}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className={`rounded-full flex justify-center items-center p-2 transition-colors ${
              isWishlisted ? "bg-red-100" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            <IonIcon
              icon={isWishlisted ? heart : heartOutline}
              className={`text-lg ${isWishlisted ? "text-red-500" : "text-gray-400"}`}
            />
          </button>

          <IonIcon
            icon={eyeOutline}
            className="text-white bg-blue-500 rounded-full p-2 text-sm"
          />
          <IonIcon
            icon={shareOutline}
            className="text-white bg-green-500 rounded-full p-2 text-sm"
          />
        </div>

        {/* Discount Badge */}
        {(item.discount > 0 || (item.discount_price && item.discount_price !== "0.00")) && (
          <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
            {item.discount ? `${item.discount}% OFF` : "Discount"}
          </div>
        )}
      </div>

      <div className="p-4">
        <Link to={`/item/${item.id}`}>
          <h3 className="text-base font-semibold text-gray-800 mb-1">{item.name}</h3>
        </Link>
        <p className="text-sm text-gray-500 mb-2">({item.review_count || 0} reviews)</p>

        <div className="flex items-center gap-4">
          {item.discount_price !== "0.00" ? (
            <>
              <h2 className="font-medium text-2xl text-red-600">
                Ksh {item.final_discounted_price.toLocaleString()}
              </h2>
              <h3 className="text-lg text-gray-400 line-through">
                Ksh {item.final_price.toLocaleString()}
              </h3>
            </>
          ) : (
            <h2 className="font-medium text-2xl text-red-500">
              Ksh {item.final_price.toLocaleString()}
            </h2>
          )}
        </div>

        <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
          <p>{item.sold || 0} sold</p>
          <p>{item.in_stock || 0} in stock</p>
        </div>

        <AddToCartButton itemId={item.id} />
      </div>
    </div>
  );
};

export default ProductCard;
