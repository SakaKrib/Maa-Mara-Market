import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../Services/Api";

const MobileSearchModal = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!open || !query.trim()) {
      setSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    api.get(`/api/search-items/?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((res) => setSuggestions(res.data || []))
      .catch((error) => { if (error?.name !== "AbortError") console.error(error); });
    return () => controller.abort();
  }, [open, query]);

  const submit = (event) => {
    event?.preventDefault();
    if (!query.trim()) return;
    navigate(`/list?name=${encodeURIComponent(query.trim())}`);
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="mm-mobile-search-layer">
      <button type="button" className="mm-mobile-sheet-backdrop" aria-label="Close search" onClick={onClose} />
      <div className="mm-mobile-search-sheet">
        <div className="mm-mobile-sheet-handle"><span /></div>
        <div className="mm-mobile-search-head">
          <strong>Search Maa Mara Market</strong>
          <button type="button" onClick={onClose} aria-label="Close search">×</button>
        </div>
        <form onSubmit={submit} className="mm-mobile-search-form">
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products..." />
          <button type="submit" className="primary-button">Search</button>
        </form>
        {suggestions.length > 0 && (
          <div className="mm-mobile-search-results">
            {suggestions.map((item, index) => (
              <button key={item.id || index} type="button" onClick={() => {
                navigate(`/list?name=${encodeURIComponent(item.name || item.title || "")}`);
                onClose?.();
              }}>
                {item.name || item.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileSearchModal;