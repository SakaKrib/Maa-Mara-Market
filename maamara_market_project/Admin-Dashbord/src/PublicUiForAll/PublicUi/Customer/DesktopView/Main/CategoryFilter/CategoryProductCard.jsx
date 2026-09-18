import React from "react";
import { Link } from "react-router-dom";
import { baseUrl } from "../../../../../cmponents/Constant/Constant";
import AddToCartButton from "../CartActionButtons/AddToCartBtn";

const CategoryProductCard = ({ item }) => {
  const image = item.image?.startsWith("http") ? item.image : `${baseUrl || ""}${item.image || ""}`;
  return (
    <article className="category-product-card bg-white shadow-sm rounded-xl overflow-hidden relative h-full flex flex-col">
      <Link to={`/item/${item.id}`}>
        <div className="relative aspect-square overflow-hidden">
          <img src={image || "/placeholder.png"} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
          {Number(item.discount || 0) > 0 && <span className="absolute bottom-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">{item.discount}% OFF</span>}
        </div>
      </Link>
      <div className="p-3 flex flex-col flex-1">
        <Link to={`/item/${item.id}`}>
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 line-clamp-2">{item.name}</h3>
        </Link>
        <p className="text-xs sm:text-sm text-gray-500 my-1">({item.rating || 0} reviews)</p>
        <div className="flex flex-wrap items-center gap-1 mb-2">
          <span className="text-sm sm:text-lg font-bold text-red-600">KES {Number(item.final_price || 0).toLocaleString()}</span>
          {Number(item.discount || 0) > 0 && <span className="line-through text-gray-400 text-xs">KES {Number(item.original_price || item.final_price || 0).toLocaleString()}</span>}
        </div>
        <div className="flex justify-between gap-2 text-[11px] sm:text-xs text-gray-500 mb-2">
          <span>{item.sold || 0} sold</span><span>{item.in_stock || 0} in stock</span>
        </div>
        <AddToCartButton itemId={item.id} quantity={1} availableStock={item.in_stock} remainingStock={item.in_stock} disabled={item.in_stock === 0} />
      </div>
    </article>
  );
};

export default CategoryProductCard;
