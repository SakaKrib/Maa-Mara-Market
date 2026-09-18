import React from "react";
import useCategoryFilters from "./CategoryFilter/useCategoryFilters";
import CategoryFilterSidebar from "./CategoryFilter/CategoryFilterSidebar";
import CategoryProductCard from "./CategoryFilter/CategoryProductCard";

const SingleCategory = () => {
  const {
    filters,
    selectedFilters,
    setSelectedFilters,
    products,
    nextUrl,
    prevUrl,
    loadingFilters,
    loadingProducts,
    error,
    fetchProducts,
    resetFilters,
    toggleFilter,
  } = useCategoryFilters();

  if (loadingFilters) return <p className="p-8 text-center">Loading filters...</p>;
  if (!filters) return <p className="p-8 text-center">No filters available</p>;

  return (
    <section className="single-category mm-page mm-section">
      <div className="mm-container">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
          <CategoryFilterSidebar
            filters={filters}
            selectedFilters={selectedFilters}
            toggleFilter={toggleFilter}
          />

          <main className="w-full lg:flex-1 min-w-0 p-0 sm:p-2">
            <div className="mm-card p-3 sm:p-4 mb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold">Shop products</h1>
                  <p className="text-sm text-gray-500">
                    {products.length ? `${products.length} products on this page` : "No products match these filters"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-sm">
                    <span className="sr-only">Sort by</span>
                    <select
                      value={selectedFilters.sortBy}
                      onChange={(e) => setSelectedFilters((p) => ({ ...p, sortBy: e.target.value }))}
                      className="ring-1 ring-gray-300 p-2 rounded-md bg-white"
                    >
                      {["Default", "Product Name", "Price", "Brand"].map((sort) => (
                        <option key={sort}>{sort}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    <span className="sr-only">Products per page</span>
                    <select
                      value={selectedFilters.perPage}
                      onChange={(e) => setSelectedFilters((p) => ({ ...p, perPage: Number(e.target.value) }))}
                      className="ring-1 ring-gray-300 p-2 rounded-md bg-white"
                    >
                      {[10, 20, 30, 40].map((num) => (
                        <option key={num} value={num}>{num} / page</option>
                      ))}
                    </select>
                  </label>

                  <button type="button" onClick={resetFilters} className="secondary-button px-3 py-2 rounded-md text-white">
                    Clear filters
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mm-card p-4 mb-4 text-sm text-red-700 bg-red-50">
                {error}
              </div>
            )}

            {loadingProducts ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
                {Array.from({ length: selectedFilters.perPage > 20 ? 8 : 6 }).map((_, index) => (
                  <div key={index} className="mm-card aspect-[3/4] animate-pulse bg-gray-100" />
                ))}
              </div>
            ) : products.length ? (
              <div className="category-product-grid">
                {products.map((item) => <CategoryProductCard key={item.id} item={item} />)}
              </div>
            ) : (
              <div className="mm-card p-10 text-center text-gray-500">
                No products found for the selected filters.
              </div>
            )}

            {(prevUrl || nextUrl) && !loadingProducts && (
              <div className="flex justify-center items-center gap-3 mt-6">
                <button
                  type="button"
                  disabled={!prevUrl}
                  onClick={() => prevUrl && fetchProducts(prevUrl)}
                  className="secondary-button px-4 py-2 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!nextUrl}
                  onClick={() => nextUrl && fetchProducts(nextUrl)}
                  className="secondary-button px-4 py-2 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  );
};

export default SingleCategory;
