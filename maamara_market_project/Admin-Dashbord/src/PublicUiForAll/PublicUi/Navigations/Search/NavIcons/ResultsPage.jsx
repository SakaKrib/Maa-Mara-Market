import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../../../../Services/Api";
import { baseUrl } from "../../../../../cmponents/Constant/Constant";
import TrendingProductCard from "../../../Customer/DesktopView/Main/Trending/TrendingProductCard";
import "../../../maamara.css";

const ITEMS_PER_PAGE = 12;

const SearchResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const searchTerm = query.get("name") || "";
  const categoryId = query.get("category_id") || "";
  const categoryName = query.get("category_name") || "";
  const requestedPage = Math.max(1, Number(query.get("page") || 1));

  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(requestedPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!searchTerm.trim() && !categoryId) {
      setResults([]);
      setTotalResults(0);
      setTotalPages(0);
      setPage(1);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");

    api.get("/api/search-items/", {
      params: {
        ...(searchTerm.trim() ? { q: searchTerm.trim() } : {}),
        ...(categoryId ? { category_id: categoryId } : {}),
        page: requestedPage,
        page_size: ITEMS_PER_PAGE,
      },
      signal: controller.signal,
    })
      .then((res) => {
        const data = res.data || {};
        const next = Array.isArray(data.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : [];

        setResults(next);
        setTotalResults(Number(data.total) || next.length);
        setTotalPages(Number(data.total_pages) || (next.length ? 1 : 0));
        setPage(Number(data.page) || requestedPage);
      })
      .catch((err) => {
        if (err.name !== "AbortError" && err.code !== "ERR_CANCELED") {
          setError(err.message || "Unable to load search results.");
          setResults([]);
          setTotalResults(0);
          setTotalPages(0);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [searchTerm, categoryId, requestedPage]);

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    const params = new URLSearchParams();
    if (searchTerm) params.set("name", searchTerm);
    if (categoryId) params.set("category_id", categoryId);
    if (categoryName) params.set("category_name", categoryName);
    params.set("page", nextPage);
    navigate(`/list?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const normalizeImage = (item) => {
    if (!item?.image) return "";
    return item.image.startsWith("http") ? item.image : `${baseUrl || ""}${item.image}`;
  };

  return (
    <main className="mm-page">
      <section className="mm-section">
        <div className="mm-container">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                Maa Mara Market
              </p>
              <h1 className="mm-search-results-title text-2xl sm:text-3xl font-medium text-gray-900">
                {searchTerm
                  ? `Search results for “${searchTerm}”`
                  : categoryName
                    ? categoryName
                    : "Search the marketplace"}
              </h1>
              {(searchTerm || categoryId) && !loading && (
                <p className="text-sm text-gray-500 mt-1">
                  {totalResults} result{totalResults === 1 ? "" : "s"}
                </p>
              )}
            </div>
          </div>

          {loading && (
            <div
              className="mm-search-loading"
              role="status"
              aria-live="polite"
              aria-label="Loading search results"
            >
              <span className="mm-search-spinner" aria-hidden="true" />
              <span>Loading products</span>
            </div>
          )}

          {error && !loading && (
            <div className="mm-card p-8 text-center text-sm text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && !searchTerm.trim() && !categoryId && (
            <div className="mm-card p-10 text-center">
              <h2 className="text-lg font-semibold mb-2">What are you looking for?</h2>
              <p className="text-sm text-gray-500">
                Use the search box above to discover products.
              </p>
            </div>
          )}

          {!loading && !error && (searchTerm.trim() || categoryId) && results.length === 0 && (
            <div className="mm-card p-10 text-center">
              <h2 className="text-lg font-semibold mb-2">No products found</h2>
              <p className="text-sm text-gray-500">
                Try a different keyword or browse all products.
              </p>
              <button
                type="button"
                className="mt-4 px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-semibold"
                onClick={() => navigate("/list")}
              >
                Browse products
              </button>
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <>
              <div className="product-card-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
                {results.map((item) => (
                  <TrendingProductCard
                    key={item.id}
                    item={{ ...item, image: normalizeImage(item) }}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <nav
                  className="flex items-center justify-center gap-4 mt-8"
                  aria-label="Search pagination"
                >
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                    className="px-4 py-2 rounded-md border border-gray-300 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                    className="px-4 py-2 rounded-md border border-gray-300 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
};

export default SearchResultsPage;
