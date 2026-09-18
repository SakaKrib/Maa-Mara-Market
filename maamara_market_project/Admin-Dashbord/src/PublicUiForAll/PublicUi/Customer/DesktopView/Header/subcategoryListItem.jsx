import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../../../Services/Api";
import ProductCard from "./../Main/Trending/ItemReusableCard"; 
import { useWishlistContext } from "../../../../../cmponents/Hooks/WishListHook/Wishlist";

const SubcategoryProducts = () => {
  const { id } = useParams(); // subcategory id
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subcategoryName, setSubcategoryName] = useState("");

  const { wishlist, addToWishlist, removeFromWishlist } = useWishlistContext();

  const fetchItems = async (url) => {
    try {
      setLoading(true);
      const res = await api.get(url, {
        headers: { "Content-Type": "application/json" },
      });

      const data = res.data; // Axios returns data here
      console.log("Fetched data:", data);

      if (Array.isArray(data)) {
        setItems(data);

        if (data.length > 0) {
          const subcat = data[0].subcategory;
          if (typeof subcat === "string") {
            setSubcategoryName(subcat);
          } else if (subcat && typeof subcat === "object" && subcat.name) {
            setSubcategoryName(subcat.name);
          } else {
            setSubcategoryName("Products");
          }
        } else {
          setSubcategoryName("Products");
        }
      } else {
        setItems([]);
        setSubcategoryName("Products");
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching subcategory items:", error);
      setItems([]);
      setSubcategoryName("Products");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(`/api/subcategory/${id}/products/`);
  }, [id]);

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="py-10 px-4 md:px-10 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 border-b">
            {subcategoryName}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              wishlist={wishlist}
              addToWishlist={addToWishlist}
              removeFromWishlist={removeFromWishlist}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SubcategoryProducts;
