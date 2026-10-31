import React, { useEffect, useState } from "react";
import { IonIcon } from "@ionic/react";
import { closeOutline, filterOutline } from "ionicons/icons";
import useCategoryFilters from "./CategoryFilter/useCategoryFilters";
import NativeAwareSelect from "../../../../../components/NativeAwareSelect";
import CategoryFilterSidebar from "./CategoryFilter/CategoryFilterSidebar";
import CategoryProductCard from "./CategoryFilter/CategoryProductCard";
import ProductSkeleton from "./Trending/ProductSkelwton";
import { useSearchParams } from "react-router-dom";
import "../../../maamara.css";

const SingleCategory = () => {
  const [pageParams] = useSearchParams();
  const categoryName = pageParams.get("category_name") || "";
  const {
    searchTerm, filters, selectedFilters, setSelectedFilters, products, nextUrl, prevUrl,
    currentPage, totalCount, goToPage,
    loadingFilters, loadingProducts, error, fetchProducts, resetFilters, toggleFilter,
  } = useCategoryFilters();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(false);

  // Keep the page behind the filter drawer still while allowing its own
  // category list to scroll. Preserve the exact scroll position on close.
  useEffect(() => {
    if (!mobileFiltersOpen || !window.matchMedia("(max-width: 639px)").matches) {
      return undefined;
    }

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    const previous = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
    };

    body.classList.add("mm-filter-drawer-open");
    html.classList.add("mm-filter-drawer-open");
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    return () => {
      body.classList.remove("mm-filter-drawer-open");
      html.classList.remove("mm-filter-drawer-open");
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.left = previous.bodyLeft;
      body.style.right = previous.bodyRight;
      body.style.width = previous.bodyWidth;
      body.style.overflow = previous.bodyOverflow;
      html.style.overflow = previous.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [mobileFiltersOpen]);

  if (loadingFilters) return <main className="mm-page"><div className="mm-container p-10 text-center text-gray-500">Loading filters…</div></main>;
  if (!filters) return <main className="mm-page"><div className="mm-container p-10 text-center text-gray-500">No filters available.</div></main>;

  return (
    <main className="mm-page">
      <section className="mm-section">
        <div className="mm-container">
          <div className="mm-shop-layout flex flex-col lg:flex-row gap-5 lg:items-start">
            <div id="mm-mobile-filter-panel" className={`mm-mobile-filter-drawer ${mobileFiltersOpen ? "is-open" : ""}`} role="dialog" aria-modal="true" aria-label="Product filters">
              <div className="mm-mobile-filter-head">
                <strong>Filters</strong>
                <button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters">
                  <IonIcon icon={closeOutline} />
                </button>
              </div>
              <CategoryFilterSidebar filters={filters} selectedFilters={selectedFilters} toggleFilter={toggleFilter} />
              <div className="mm-mobile-filter-actions">
                <button type="button" className="mm-filter-clear-button" onClick={resetFilters}>Clear all</button>
                <button type="button" onClick={() => setMobileFiltersOpen(false)} className="mm-filter-apply-button">Show results</button>
              </div>
            </div>
            <div className={`mm-mobile-filter-backdrop ${mobileFiltersOpen ? "is-open" : ""}`} onClick={() => setMobileFiltersOpen(false)} aria-hidden="true" />

            <aside id="mm-desktop-filter-panel" className={`mm-desktop-filter ${desktopFiltersOpen ? "is-open" : ""}`} aria-hidden={!desktopFiltersOpen}>
              {desktopFiltersOpen && (
                <div className="mm-desktop-filter-head">
                  <strong>Filters</strong>
                  <button type="button" onClick={() => setDesktopFiltersOpen(false)} aria-label="Close filters">
                    <IonIcon icon={closeOutline} />
                  </button>
                </div>
              )}
              <CategoryFilterSidebar filters={filters} selectedFilters={selectedFilters} toggleFilter={toggleFilter} />
              {desktopFiltersOpen && (
                <div className="mm-desktop-filter-actions">
                  <button type="button" className="mm-filter-clear-button" onClick={resetFilters}>Clear all</button>
                  <button type="button" className="mm-filter-apply-button" onClick={() => setDesktopFiltersOpen(false)}>Done</button>
                </div>
              )}
            </aside>

            <div className="w-full lg:flex-1 min-w-0">
              <div className="mm-card p-3 sm:p-4 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Maa Mara Market</p>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {searchTerm
                        ? `Search results for “${searchTerm}”`
                        : (filters.sections || []).filter((section) => selectedFilters.sections.includes(section.id)).map((section) => String(section.name).toLowerCase()).join() === "organic"
                          ? "Organic products"
                          : categoryName || "Shop products"}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                      {totalCount != null && totalCount > 0
                        ? `Showing ${((currentPage - 1) * Number(selectedFilters.perPage)) + 1}–${Math.min(currentPage * Number(selectedFilters.perPage), totalCount)} of ${totalCount} products`
                        : products.length ? `${products.length} products on this page` : "No products match these filters"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="mm-mobile-filter-button"
                      onClick={() => {
                        if (window.matchMedia("(max-width: 639px)").matches) {
                          setMobileFiltersOpen(true);
                        } else {
                          setDesktopFiltersOpen((open) => !open);
                        }
                      }}
                      aria-expanded={window.matchMedia("(max-width: 639px)").matches ? mobileFiltersOpen : desktopFiltersOpen}
                      aria-controls={window.matchMedia("(max-width: 639px)").matches ? "mm-mobile-filter-panel" : "mm-desktop-filter-panel"}
                    >
                      <IonIcon icon={filterOutline} /><span>Filter</span>
                    </button>
                    <NativeAwareSelect
                      aria-label="Sort by"
                      value={selectedFilters.sortBy}
                      onChange={(event) => setSelectedFilters((previous) => ({ ...previous, sortBy: event.target.value }))}
                      className="ring-1 ring-gray-300 p-2 rounded-md bg-white text-sm"
                      options={["Default", "Product Name", "Price", "Brand"].map((sort) => ({ value: sort, label: sort }))}
                    />
                    <NativeAwareSelect
                      aria-label="Products per page"
                      value={selectedFilters.perPage}
                      onChange={(event) => setSelectedFilters((previous) => ({ ...previous, perPage: Number(event.target.value) }))}
                      className="ring-1 ring-gray-300 p-2 rounded-md bg-white text-sm"
                      options={[10, 20, 30, 40].map((num) => ({ value: num, label: `${num} / page` }))}
                    />
                    <button type="button" onClick={resetFilters} className="mm-filter-clear-button">Clear filters</button>
                  </div>
                </div>
              </div>

              {error && <div className="mm-card p-4 mb-4 text-sm text-red-700 bg-red-50">{error}</div>}
              {loadingProducts ? (
                <div
                  className="category-product-skeleton"
                  role="status"
                  aria-label="Loading products"
                  aria-busy="true"
                >
                  {Array.from({ length: 6 }, (_, index) => (
                    <ProductSkeleton key={index} />
                  ))}
                  <span className="sr-only">Loading products, please wait.</span>
                </div>
              ) : products.length ? (
                <div className="category-product-grid">{products.map((item) => <CategoryProductCard key={item.id} item={item} />)}</div>
              ) : (
                <div className="mm-card p-10 text-center text-gray-500">No products found for the selected filters.</div>
              )}

              {(prevUrl || nextUrl || (totalCount != null && totalCount > Number(selectedFilters.perPage))) && !loadingProducts && (
                <nav className="mm-shop-pagination mt-6" aria-label="Product pages">
                  <button type="button" disabled={!prevUrl} onClick={() => prevUrl && fetchProducts(prevUrl)} className="mm-shop-page-button">Previous</button>
                  {totalCount != null && Array.from({ length: Math.min(5, Math.ceil(totalCount / Number(selectedFilters.perPage))) }, (_, index) => {
                    const totalPages = Math.ceil(totalCount / Number(selectedFilters.perPage));
                    const firstPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                    return firstPage + index;
                  }).map((page) => (
                    <button key={page} type="button" onClick={() => goToPage(page)} aria-current={page === currentPage ? "page" : undefined} className={`mm-shop-page-button ${page === currentPage ? "is-current" : ""}`}>
                      {page}
                    </button>
                  ))}
                  <button type="button" disabled={!nextUrl} onClick={() => nextUrl && fetchProducts(nextUrl)} className="mm-shop-page-button">Next</button>
                </nav>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
export default SingleCategory;
