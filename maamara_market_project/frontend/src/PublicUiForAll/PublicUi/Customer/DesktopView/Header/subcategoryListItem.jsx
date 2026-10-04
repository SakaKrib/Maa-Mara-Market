import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../../../Services/Api";
import { baseUrl } from "../../../../../cmponents/Constant/Constant";
import TrendingProductCard from "../Main/Trending/TrendingProductCard";
import "../../../maamara.css";

const SubcategoryProducts = () => {
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Products");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    api.get(`/api/subcategory/${id}/products/`, {
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
    })
      .then(({ data }) => {
        const next = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        setItems(next);
        const subcat = next[0]?.subcategory;
        setName(typeof subcat === "string" ? subcat : subcat?.name || "Products");
      })
      .catch((err) => {
        if (err.name !== "CanceledError" && err.name !== "AbortError") {
          setError("Unable to load these products.");
          setItems([]);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  const normalizeImage = (item) => {
    if (!item?.image) return "";
    return item.image.startsWith("http") ? item.image : `${baseUrl || ""}${item.image}`;
  };

  return (
    <main className="mm-page">
      <section className="mm-section">
        <div className="mm-container">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Shop</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{name}</h1>
            {!loading && <p className="text-sm text-gray-500 mt-1">{items.length} product{items.length === 1 ? "" : "s"}</p>}
          </div>

          {loading && <div className="mm-card p-10 text-center text-gray-500">Loading products…</div>}
          {error && !loading && <div className="mm-card p-10 text-center text-red-600">{error}</div>}
          {!loading && !error && !items.length && (
            <div className="mm-card p-10 text-center text-gray-500">No products found in this subcategory.</div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="product-card-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
              {items.map((item) => (
                <TrendingProductCard key={item.id} item={{ ...item, image: normalizeImage(item) }} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default SubcategoryProducts;
