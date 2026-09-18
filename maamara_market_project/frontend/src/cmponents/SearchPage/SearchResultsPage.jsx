import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import useGlobalSearch from "../Hooks/SearchHook/GlobalSearchHook";

export default function SearchGlobalResultsPage() {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get("q");

  const { search, results, loading } = useGlobalSearch();

  useEffect(() => {
    if (query) {
      search(query);
    }
  }, [query]);

  return (
    <div>
      <h2>Search Results for "{query}"</h2>

      {loading && <p>Loading...</p>}

      {Object.entries(results || {}).map(([type, items]) => (
        <div key={type}>
          <h3>{type}</h3>

          {items.map((item) => (
            <div key={item.id}>
              {item.name || item.title || item.company_name}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}