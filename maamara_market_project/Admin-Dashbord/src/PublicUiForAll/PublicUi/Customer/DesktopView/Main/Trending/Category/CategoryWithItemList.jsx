import React, { useEffect, useState } from "react";
import api from "../../../../../../../Services/Api";
import { baseUrl } from "../../../../../../../cmponents/Constant/Constant";

const CategoryWithItems = ({ onSelectItem }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .get("/api/categories-with-items/")
      .then((res) => {
        if (!active) return;
        const data = Array.isArray(res.data?.results) ? res.data.results : [];
        setCategories(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("No Categories found.");
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="mm-card p-5 text-center text-gray-500">Loading categories...</div>;
  if (error) return <div className="mm-card p-5 text-center text-gray-500">{error}</div>;

  return (
    <div className="category mobile-hide">
      {categories.map((category) => {
        const allItems = category.subcategories
          ?.flatMap((subcat) => subcat.items || [])
          .filter(Boolean) || [];

        if (!allItems.length) return null;

        const firstItem = allItems[0];
        const imageUrl = firstItem.image
          ? (firstItem.image.startsWith?.("http") ? firstItem.image : `${baseUrl}${firstItem.image}`)
          : "/placeholder.jpg";

        return (
          <div key={category.id} className="item">
            <div
              className={category.featured ? "get-gray" : ""}
              onClick={() => onSelectItem?.(firstItem.id)}
              style={{ cursor: onSelectItem ? "pointer" : "default" }}
            >
              <h5>{category.name}</h5>
              <div className="image object-cover">
                <img src={imageUrl} alt={firstItem.name} loading="lazy" />
              </div>
              <div className="text-content fexcol">
                <h3>{firstItem.title || "Featured Product"}</h3>
                <h4>
                  <span>{firstItem.subtitle || "Special Offer!"}</span>
                  <br />
                  {firstItem.name}
                </h4>
                <a href={`/subcategory/${category.id}/products`} className="primary-button" onClick={(e) => e.stopPropagation()}>
                  Shop Now
                </a>
              </div>
              <a href={`/subcategory/${category.id}/products`} className="over-link" onClick={(e) => e.stopPropagation()} aria-label={`Shop ${category.name}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryWithItems;