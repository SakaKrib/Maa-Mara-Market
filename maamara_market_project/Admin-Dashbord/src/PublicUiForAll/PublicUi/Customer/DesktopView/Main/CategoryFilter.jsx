import React from "react";
import { baseUrl } from "../../../../../cmponents/Constant/Constant";
import useCategoryFilters from "./CategoryFilter/useCategoryFilters";
import CategoryFilterSidebar from "./CategoryFilter/CategoryFilterSidebar";
import CategoryProductCard from "./CategoryFilter/CategoryProductCard";

const SingleCategory = () => {
  const { filters, selectedFilters, setSelectedFilters, products, loadingFilters, loadingProducts, toggleFilter } = useCategoryFilters();

  if (loadingFilters) return <p className="p-8 text-center">Loading filters...</p>;
  if (!filters) return <p className="p-8 text-center">No filters available</p>;

  return (
    <section className="single-category">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <CategoryFilterSidebar filters={filters} selectedFilters={selectedFilters} toggleFilter={toggleFilter} />

          <main className="w-full lg:w-3/4 p-2 sm:p-4">
            <div className="flex flex-wrap justify-between gap-3 mb-4">
              <label className="text-sm">Sort by{" "}
                <select value={selectedFilters.sortBy} onChange={(e) => setSelectedFilters((p) => ({ ...p, sortBy: e.target.value }))} className="ring-1 p-2 rounded-md">
                  {["Default", "Product Name", "Price", "Brand"].map((sort) => <option key={sort}>{sort}</option>)}
                </select>
              </label>
              <label className="text-sm">Show{" "}
                <select value={selectedFilters.perPage} onChange={(e) => setSelectedFilters((p) => ({ ...p, perPage: parseInt(e.target.value, 10) }))} className="ring-1 p-2 rounded-md">
                  {[10, 20, 30, 40].map((num) => <option key={num} value={num}>{num}</option>)}
                </select>
              </label>
            </div>

            {loadingProducts ? (
              <p className="text-center p-8">Loading products...</p>
            ) : products.length ? (
              <div className="category-product-grid">
                {products.map((item) => <CategoryProductCard key={item.id} item={item} />)}
              </div>
            ) : (
              <p className="text-center p-8 text-gray-500">No products found for selected filters.</p>
            )}
          </main>
        </div>
      </div>
    </section>
  );
};

export default SingleCategory;
