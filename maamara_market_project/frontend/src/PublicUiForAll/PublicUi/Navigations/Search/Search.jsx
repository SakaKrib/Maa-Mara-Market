import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import { searchOutline } from "ionicons/icons";
import api from "../../../../Services/Api";

const SearchBar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setSuggestions([]);
      setSearching(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);

      try {
        const res = await api.get("/api/search-items/", {
          params: {
            q: trimmed,
            page: 1,
            page_size: 6,
            suggestions: 1,
          },
          signal: controller.signal,
        });

        const next = Array.isArray(res.data?.suggestions)
          ? res.data.suggestions
          : Array.isArray(res.data?.results)
            ? res.data.results
            : [];

        setSuggestions(next);
      } catch (err) {
        if (err.name !== "AbortError" && err.code !== "ERR_CANCELED") {
          console.error("Search suggestions error:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const recordSearch = async (value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return;

    try {
      await api.post("/api/search-events/", { query: trimmed });
    } catch {
      // Search navigation should never be blocked by analytics/recommendation
      // tracking if the tracking endpoint is temporarily unavailable.
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmed = query.trim();

    if (trimmed) {
      recordSearch(trimmed);
      navigate(`/list?name=${encodeURIComponent(trimmed)}&page=1`);
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = async (name) => {
    recordSearch(name);
    navigate(`/list?name=${encodeURIComponent(name)}&page=1`);
    setSuggestions([]);
    setQuery(name);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", flex: 1 }}>
      <form
        className="flex items-center justify-between gap-4 p-2 rounded-md flex-1 bg-gray-100"
        onSubmit={handleSearch}
        autoComplete="off"
      >
        <input
          type="text"
          name="name"
          id="name"
          autoComplete="off"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none rounded-full ring-1 z-10"
          aria-label="Search marketplace"
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
        />
        <button
          type="submit"
          className="cursor-pointer items-center flex primary-button"
          aria-label="Search"
        >
          <IonIcon icon={searchOutline} />
        </button>
      </form>

      {query.trim() && (suggestions.length > 0 || searching) && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "white",
            borderRadius: "0 0 0.375rem 0.375rem",
            boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
            maxHeight: "360px",
            overflowY: "auto",
            margin: 0,
            padding: 0,
            listStyle: "none",
            zIndex: 1000,
          }}
        >
          {searching && suggestions.length === 0 && (
            <li style={{ padding: "0.75rem 1rem", color: "#666", fontSize: "0.875rem" }}>
              Finding products…
            </li>
          )}

          {suggestions.map((item) => (
            <li
              key={item.id}
              onMouseDown={() => handleSuggestionClick(item.name)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSuggestionClick(item.name);
                }
              }}
              style={{
                padding: "0.65rem 1rem",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
              tabIndex={0}
              role="option"
              aria-label={`Search suggestion ${item.name}`}
            >
              <div style={{ fontWeight: "600" }}>{item.name}</div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#777",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginTop: "0.15rem",
                }}
              >
                {[item.category, item.subcategory, item.brand].filter(Boolean).join(" • ") ||
                  item.description ||
                  "Marketplace product"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
