import React, { useState, useEffect, useCallback } from "react";
import Filter from "./Filter";
import kuba from "../../../../../assets/products/kuba wall hanging.jpg";
import ProductCard from "./Trending/TrendingProductCard";
import api from "../../../../../Services/Api";

const ITEMS_PER_PAGE = 15;

const ListPage = () => {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchFilteredItems = useCallback(async (filterParams, page) => {
    const query = new URLSearchParams();

    Object.entries(filterParams || {}).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        query.append(key, value);
      }
    });

    query.append("page", page);
    query.append("page_size", ITEMS_PER_PAGE);

    try {
      setLoading(true);
      const res = await api.get(`/api/filtered-items/?${query.toString()}`);
      const data = res.data || {};

      setItems(Array.isArray(data.results) ? data.results : []);
      setHasNext(Boolean(data.next));
      setHasPrev(Boolean(data.previous));
    } catch (err) {
      console.error("Failed to fetch items:", err);
      setItems([]);
      setHasNext(false);
      setHasPrev(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilteredItems(filters, currentPage);
  }, [filters, currentPage, fetchFilteredItems]);

  const handleFilterChange = useCallback((newFilters) => {
    setCurrentPage(1);
    setFilters((prev) =>
      JSON.stringify(prev) === JSON.stringify(newFilters) ? prev : newFilters
    );
  }, []);

  return (
    <section className="mm-section marketplace-page">
      <div className="mm-container">
        <div className="mm-card overflow-hidden flex flex-col-reverse md:flex-row items-center justify-between p-4 sm:p-6">
          <div className="w-full md:w-1/2 md:pr-8">
            <p className="text-sm font-semibold text-gray-500 mb-2">Featured savings</p>
            <h2 className="text-2xl md:text-4xl font-semibold leading-tight text-gray-800 mb-4">
              Grab up to 50% off on <br className="hidden sm:block" /> selected products
            </h2>
            <button className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-all">
              Buy now
            </button>
          </div>
          <div className="w-full md:w-1/2 h-48 sm:h-64 flex items-center justify-center bg-gray-50">
            <img src={kuba} alt="Campaign banner" className="object-contain h-full w-full" loading="lazy" />
          </div>
        </div>

        <div className="mt-8">
          <Filter onFilterChange={handleFilterChange} />
        </div>

        <div className="trending mt-8">
          <div className="mb-6 text-start sectop">
            <h2 className="title">Filtered Products</h2>
          </div>

          {loading ? (
            <p className="text-center text-gray-500 my-8">Loading products...</p>
          ) : items.length === 0 ? (
            <p className="text-center text-gray-500 my-8">No items found.</p>
          ) : (
            <div className="product-card-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
              {items.map((item) => (
                <ProductCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {(hasPrev || hasNext) && (
            <div className="flex justify-center mt-8 gap-4">
              {hasPrev && (
                <button className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}>
                  Previous
                </button>
              )}
              {hasNext && (
                <button className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400" onClick={() => setCurrentPage((p) => p + 1)}>
                  Next
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ListPage;