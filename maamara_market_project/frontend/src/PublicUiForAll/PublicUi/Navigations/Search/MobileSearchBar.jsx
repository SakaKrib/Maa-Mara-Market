import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../Services/Api";

const MobileSearchModal = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();

    if (!open || !trimmed) {
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
      } catch (error) {
        if (error?.name !== "AbortError" && error?.code !== "ERR_CANCELED") {
          console.error("Mobile search suggestions error:", error);
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const submit = (event) => {
    event?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    // Do not make analytics a prerequisite for navigation.
    api.post("/api/search-events/", { query: trimmed }).catch(() => {});
    navigate(`/list?name=${encodeURIComponent(trimmed)}&page=1`);
    onClose?.();
  };

  const chooseSuggestion = (name) => {
    const value = String(name || "").trim();
    if (!value) return;

    api.post("/api/search-events/", { query: value }).catch(() => {});
    navigate(`/list?name=${encodeURIComponent(value)}&page=1`);
    onClose?.();
    setQuery(value);
  };

  if (!open) return null;

  return (
    <div className="mm-mobile-search-layer">
      <button
        type="button"
        className="mm-mobile-sheet-backdrop"
        aria-label="Close search"
        onClick={onClose}
      />

      <div className="mm-mobile-search-sheet">
        <div className="mm-mobile-sheet-handle"><span /></div>

        <div className="mm-mobile-search-head">
          <strong>Search Maa Mara Market</strong>
          <button type="button" onClick={onClose} aria-label="Close search">×</button>
        </div>

        <form onSubmit={submit} className="mm-mobile-search-form">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
            autoComplete="off"
          />
          <button type="submit" className="primary-button">Search</button>
        </form>

        {query.trim() && (searching || suggestions.length > 0) && (
          <div className="mm-mobile-search-results" role="listbox" aria-label="Search suggestions">
            {searching && suggestions.length === 0 && (
              <div className="mm-mobile-search-loading">
                <span className="mm-search-spinner" aria-hidden="true" />
                <span>Searching…</span>
              </div>
            )}

            {suggestions.map((item, index) => (
              <button
                key={item.id || index}
                type="button"
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseSuggestion(item.name || item.title)}
              >
                <strong>{item.name || item.title}</strong>
                {(item.category || item.subcategory || item.brand) && (
                  <small>
                    {[item.category, item.subcategory, item.brand]
                      .filter(Boolean)
                      .join(" • ")}
                  </small>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileSearchModal;