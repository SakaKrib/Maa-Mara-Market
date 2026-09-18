import React from "react";
import TrendingProductCard from "../Trending/TrendingProductCard";

/*
 * Category results intentionally reuse the marketplace product card.
 * This keeps pricing, ratings, stock, discount and cart behavior consistent
 * between discovery surfaces without changing the category API.
 */
const CategoryProductCard = ({ item }) => (
  <TrendingProductCard item={item} />
);

export default CategoryProductCard;
