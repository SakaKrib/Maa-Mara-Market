import React, { useState } from "react";
import { IonIcon } from "@ionic/react";
import { closeOutline, filterOutline } from "ionicons/icons";
import useCategoryFilters from "./CategoryFilter/useCategoryFilters";
import CategoryFilterSidebar from "./CategoryFilter/CategoryFilterSidebar";
import CategoryProductCard from "./CategoryFilter/CategoryProductCard";
import "../../../maamara.css";

const SingleCategory = () => {
  const {
    filters, selectedFilters, setSelectedFilters, products, nextUrl, prevUrl,
    loadingFilters, loadingProducts, error, fetchProducts, resetFilters, toggleFilter,
  } = useCategoryFilters();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  if (loadingFilters) return <main className="mm-page"><div className="mm-container p-10 text-center text-gray-500">Loading filters…</div></main>;
  if (!filters) return <main className="mm-page"><div className="mm-container p-10 text-center text-gray-500">No filters available.</div></main>;

  return (
    <main className="mm-page">
      <section className="mm-section">
        <div className="mm-container">
          <div className="flex flex-col lg:flex-row gap-5 lg:items-start">
            <div className={`mm-mobile-filter-drawer ${mobileFiltersOpen ? "is-open" : ""}`}>
              <div className="mm-mobile-filter-head">
                <strong>Filters</strong>
                <button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters">
                  <IonIcon icon={closeOutline} />
                </button>
              </div>
              <CategoryFilterSidebar filters={filters} selectedFilters={selectedFilters} toggleFilter={toggleFilter} />
              <div className="mm-mobile-filter-actions">
                <button type="button" onClick={resetFilters}>Clear all</button>
                <button type="button" onClick={() => setMobileFiltersOpen(false)} className="secondary-button">Show results</button>
              </div>
            </div>
            <div className="mm-mobile-filter-backdrop" onClick={() => setMobileFiltersOpen(false)} />

            <aside className="mm-desktop-filter">
              <CategoryFilterSidebar filters={filters} selectedFilters={selectedFilters} toggleFilter={toggleFilter} />
            </aside>

            <div className="w-full lg:flex-1 min-w-0">
              <div className="mm-card p-3 sm:p-4 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Maa Mara Market</p>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Shop products</h1>
                    <p className="text-sm text-gray-500 mt-1">{products.length ? `${products.length} products on this page` : "No products match these filters"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="mm-mobile-filter-button" onClick={() => setMobileFiltersOpen(true)}>
                      <IonIcon icon={filterOutline} /><span>Filter</span>
                    </button>
                    <select aria-label="Sort by" value={selectedFilters.sortBy}
                      onChange={(e) => setSelectedFilters((p) => ({ ...p, sortBy: e.target.value }))}
                      className="ring-1 ring-gray-300 p-2 rounded-md bg-white text-sm">
                      {["Default", "Product Name", "Price", "Brand"].map((sort) => <option key={sort}>{sort}</option>)}
                    </select>
                    <select aria-label="Products per page" value={selectedFilters.perPage}
                      onChange={(e) => setSelectedFilters((p) => ({ ...p, perPage: Number(e.target.value) }))}
                      className="ring-1 ring-gray-300 p-2 rounded-md bg-white text-sm">
                      {[10,20,30,40].map((num) => <option key={num} value={num}>{num} / page</option>)}
                    </select>
                    <button type="button" onClick={resetFilters} className="secondary-button px-3 py-2 rounded-md text-white">Clear filters</button>
                  </div>
                </div>
              </div>

              {error && <div className="mm-card p-4 mb-4 text-sm text-red-700 bg-red-50">{error}</div>}
              {loadingProducts ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
                  {Array.from({ length: 8 }).map((_, i) => <div key={i} className="mm-card aspect-[3/4] animate-pulse bg-gray-100" />)}
                </div>
              ) : products.length ? (
                <div className="category-product-grid">{products.map((item) => <CategoryProductCard key={item.id} item={item} />)}</div>
              ) : (
                <div className="mm-card p-10 text-center text-gray-500">No products found for the selected filters.</div>
              )}

              {(prevUrl || nextUrl) && !loadingProducts && (
                <div className="flex justify-center items-center gap-3 mt-6">
                  <button type="button" disabled={!prevUrl} onClick={() => prevUrl && fetchProducts(prevUrl)} className="secondary-button px-4 py-2 rounded-md text-white disabled:opacity-50">Previous</button>
                  <button type="button" disabled={!nextUrl} onClick={() => nextUrl && fetchProducts(nextUrl)} className="secondary-button px-4 py-2 rounded-md text-white disabled:opacity-50">Next</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
export default SingleCategory;
