import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import { searchOutline } from "ionicons/icons";
import api from "../../../../Services/Api";

const SearchBar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    if (query.trim() === "") {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    api.get(`/api/search-items/?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        setSuggestions(res.data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error(err);
        }
      });

    return () => controller.abort();
  }, [query]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/list?name=${encodeURIComponent(query.trim())}`);
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (name) => {
    navigate(`/list?name=${encodeURIComponent(name)}`);
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
        />
        <button
          type="submit"
          className="cursor-pointer items-center flex primary-button"
        >
          <IonIcon icon={searchOutline} />
        </button>
      </form>

      {suggestions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "white",
            borderRadius: "0 0 0.375rem 0.375rem", // rounded-b-md in tailwind
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            maxHeight: "240px",
            overflowY: "auto",
            margin: 0,
            padding: 0,
            listStyle: "none",
            zIndex: 1000,
          }}
        >
          {suggestions.map((item) => (
            <li
              key={item.id}
              onMouseDown={() => handleSuggestionClick(item.name)}
              style={{
                padding: "0.5rem 1rem",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSuggestionClick(item.name);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Search suggestion ${item.name}`}
            >
              <div style={{ fontWeight: "600" }}>{item.name}</div>
              {item.description && (
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#555",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.description}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
    
  );
};

export default SearchBar;
