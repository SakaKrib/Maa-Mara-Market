import React, { useState, useEffect, useCallback } from "react";
import Filter from "./Filter";
import kuba from "../../../../../assets/products/kuba wall hanging.jpg";
import ProductCard from "./Trending/ItemReusableCard";
import api from "../../../../../Services/Api";

const ITEMS_PER_PAGE = 15;

const ListPage = () => {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({}); // ✅ IMPORTANT FIX
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ================= FETCH ================= */
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

      const res = await api.get(
        `/api/filtered-items/?${query.toString()}`
      );

      const data = res.data;

      setItems(data.results || []);
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

  

  /* ================= EFFECT ================= */
  useEffect(() => {
    if (!filters) return; // ✅ prevents initial useless call

    fetchFilteredItems(filters, currentPage);
  }, [filters, currentPage, fetchFilteredItems]);

  /* ================= FILTER CHANGE ================= */
  const handleFilterChange = useCallback((newFilters) => {
    setCurrentPage(1);

    setFilters((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(newFilters)) {
        return prev;
      }
      return newFilters;
    });
  }, []);

  return (
    <div className="px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64 relative marketplace-page">

      {/* CAMPAIGN */}
      <div className="relative flex flex-col-reverse md:flex-row items-center justify-between bg-gray-100 p-6 rounded-lg mt-6">
        <div className="md:w-1/2 mb-6 md:mb-0">
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-gray-800 mb-4">
            Grab up to 50% off on <br /> selected products
          </h1>

          <button className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-all">
            Buy now
          </button>
        </div>

        <div className="md:w-1/2 h-64 flex items-center justify-center">
          <img
            src={kuba}
            alt="Campaign banner"
            className="object-contain h-full w-full"
          />
        </div>
      </div>

      {/* FILTER */}
      <div className="mt-10">
        <Filter onFilterChange={handleFilterChange} />
      </div>

      {/* PRODUCTS */}
      <div className="trending">
        <div className="max-w-7xl mx-auto">

          <div className="mb-6 text-start sectop mt-5">
            <h2 className="title">Filtered Products</h2>
          </div>

          {!filters ? (
            <p className="text-center text-gray-500 my-8">
              Apply filters to see items
            </p>
          ) : loading ? (
            <p className="text-center text-gray-500 my-8">
              Loading products...
            </p>
          ) : items.length === 0 ? (
            <p className="text-center text-gray-500 my-8">
              No items found.
            </p>
          ) : (
            <div className="product-card-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
              {items.map((item) => (
                <ProductCard key={item.id} mode="card" item={item} />
              ))}
            </div>
          )}

          {/* PAGINATION */}
          {(hasPrev || hasNext) && (
            <div className="flex justify-center mt-6 gap-4">
              {hasPrev && (
                <button
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  onClick={() =>
                    setCurrentPage((p) => Math.max(p - 1, 1))
                  }
                >
                  Previous
                </button>
              )}

              {hasNext && (
                <button
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ListPage;