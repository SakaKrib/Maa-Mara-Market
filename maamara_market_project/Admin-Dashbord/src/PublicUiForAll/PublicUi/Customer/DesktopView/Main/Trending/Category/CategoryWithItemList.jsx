import React, { useEffect, useState } from "react";
import api from "../../../../../../../Services/Api";
import { baseUrl } from "../../../../../../../cmponents/Constant/Constant";

const CategoryWithItems = ({ onSelectItem }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/api/categories-with-items/") // Your API endpoint
      .then((res) => {
        const data = Array.isArray(res.data.results) ? res.data.results : [];
        setCategories(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load categories");
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading categories...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="category  mobile-hide ">
      {categories.map((category) => {
        // Flatten items from all subcategories of this category
        const allItems = category.subcategories
          ?.flatMap((subcat) => subcat.items || [])
          .filter(Boolean) || [];

        if (allItems.length === 0) return null; // Skip categories without items

        const firstItem = allItems[0];

        // Construct full image URL with baseUrl prefix
        const imageUrl = firstItem.image
          ? `${baseUrl}${firstItem.image}`
          : "/placeholder.jpg";

        return (
          <div key={category.id} className="item">
            <div
              className={` ${category.featured ? "get-gray" : ""}`}
              onClick={() => onSelectItem(firstItem.id)}
              style={{ cursor: "pointer" }}
              
            >
              <h5>{category.name}</h5>

              <div className="image object-cover">
                <img
                  src={imageUrl}
                  alt={firstItem.name}
                  loading="lazy"
                />
              </div>

              <div className="text-content fexcol">
                <h3>{firstItem.title || "Featured Product"}</h3>
                <h4>
                  <span>{firstItem.subtitle || "Special Offer!"}</span>
                  <br />
                  {firstItem.name}
                </h4>

                <a
                  href={`/subcategory/${category.id}/products`}
                  className="primary-button"
                  onClick={(e) => e.stopPropagation()}
                >
                  Shop Now
                </a>
              </div>

              <a
                href={`/subcategory/${category.id}/products`}
                className="over-link"
                onClick={(e) => e.stopPropagation()}
              ></a>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryWithItems;
