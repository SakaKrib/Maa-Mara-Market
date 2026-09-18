import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { baseUrl } from "../../../../../cmponents/Constant/Constant";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function truncate(text, maxLength) {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
}


const ITEMS_PER_PAGE = 10;

const SearchResultsPage = () => {
  const query = useQuery();
  const navigate = useNavigate();

  const searchTerm = query.get("name") || "";
  const pageParam = parseInt(query.get("page") || "1", 10);

  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(pageParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🔹 Keep page in sync with URL
  useEffect(() => {
    setPage(pageParam);
  }, [pageParam]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setTotalResults(0);
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetch(
      `/api/search-items/?q=${encodeURIComponent(
        searchTerm
      )}&page=${page}&page_size=${ITEMS_PER_PAGE}`,
      { signal: controller.signal }
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch results");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data?.results)) {
          setResults(data.results);
          setTotalResults(Number.isInteger(data.total) ? data.total : 0);
        } else if (Array.isArray(data)) {
          setResults(data);
          setTotalResults(data.length);
        } else {
          setResults([]);
          setTotalResults(0);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message || "Error fetching results");
          setResults([]);
          setTotalResults(0);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [searchTerm, page]);

  const totalPages = Math.max(1, Math.ceil(totalResults / ITEMS_PER_PAGE));

  const goToPage = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    navigate(`/list?name=${encodeURIComponent(searchTerm)}&page=${newPage}`);
  };

  return (
    <main
      style={{
        maxWidth: 700,
        margin: "2rem auto",
        padding: "6rem 1rem 1rem", // 🔹 space for fixed header
        minHeight: "100vh",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      {/* Header */}
      <div className="logo flex items-center justify-between border-b border-gray-300 pb-4 mb-6 fixed top-0 left-0 w-full px-4 bg-white z-10">
        <a className="flex items-center space-x-2 text-2xl font-bold text-gray-800 mt-1">
          <span className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
            MMM
          </span>
          <span>
            Maa <span className="it-name">Mara</span>{" "}
            <span className="mkrt">Market</span>
          </span>
        </a>
        <span
          className="font-semibold hover:underline cursor-pointer"
          onClick={() => navigate("/")}
        >
          go to shop
        </span>
      </div>

      <h1 style={{ marginBottom: "1rem" }}>
        Search results for <q className="text-2xl">{truncate (searchTerm, 20)}</q>
      </h1>

      <div className="flex justify-between items-center border-b b-1 bg-gray-100 rounded-md p-2">
        <p className="text-sm font-semibold">Found </p>
        <strong>{results.length}</strong>
      </div>

      {loading && <p style={{ fontStyle: "italic" }}>Loading results...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && results.length === 0 && (
        <p>No results found. Try different keywords.</p>
      )}

      {!loading && results.length > 0 && (
        <>
          <ul style={{ listStyle: "none", padding: 0, marginTop:'10px' }}>
            {results.map(({ id, name, description, image }) => (
              <li
                key={id}
                style={{
                  display: "flex",
                  gap: "1rem",
                  padding: "1rem 1rem",
                  borderBottom: "1px solid #ddd",
                }}
                className="cursor-pointer hover:bg-gray-100 rounded-lg transition-1 "
              >
                {image ? (
                  <img
                    src={image.startsWith("http") ? image : baseUrl + image}
                    alt={name}
                    style={{
                      width: 80,
                      height: 80,
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      background: "#eee",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#999",
                      fontSize: "0.8rem",
                    }}
                  >
                    No Image
                  </div>
                )}

                <div>
                  <h2 style={{ margin: 0 }} className="text-lg">{name}</h2>
                  <p style={{ margin: "0.25rem 0" }} className="text-sm text-gray-500">
                  {truncate(description, 100) || "No description available."}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "1rem",
                marginTop: "1rem",
              }}
            >
              <button
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Previous
              </button>

              <span>
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  );
};

export default SearchResultsPage;
