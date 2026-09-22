import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useDynamicSearch from "../Hooks/SearchHook/GlobalSearchHook";

export default function SearchBarForVendorAdmin({ fullscreen = false, onClose }) {
  const navigate = useNavigate();
  const { search, data, loading } = useDynamicSearch({ url: "/api/search-all/" });
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (fullscreen) {
      requestAnimationFrame(() => wrapperRef.current?.querySelector("input")?.focus());
    }
  }, [fullscreen]);

  useEffect(() => {
    if (fullscreen) return undefined;
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fullscreen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        if (open) setOpen(false);
        else onClose?.();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (value.trim().length > 1) {
        search(value);
        setOpen(true);
      } else {
        setOpen(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [value, search]);

  const sections = Object.entries(data || {})
    .filter(([, items]) => Array.isArray(items) && items.length)
    .sort(([a], [b]) => {
      const priority = (name) => {
        const key = name.toLowerCase();
        if (key.includes("item") || key.includes("product")) return 0;
        if (key.includes("order")) return 1;
        if (key.includes("vendor") || key.includes("customer") || key.includes("user")) return 2;
        if (key.includes("request")) return 3;
        if (key.includes("activity") || key.includes("notification")) return 9;
        return 5;
      };
      return priority(a) - priority(b);
    });
  const hasResults = sections.length > 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!value.trim()) return;
    setOpen(false);
    onClose?.();
    navigate("/search/global-results?q=" + encodeURIComponent(value.trim()));
  };

  const handleClick = (item) => {
    setOpen(false);
    onClose?.();
    if (item?.type === "Item" && item?.id) {
      navigate("/item/" + item.id);
      return;
    }
    navigate("/search/global-results?q=" + encodeURIComponent(value.trim()));
  };

  return (
    <div ref={wrapperRef} className="relative w-full min-w-0">
      <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            autoComplete="off"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onFocus={() => value.trim().length > 1 && setOpen(true)}
            placeholder="Search your workspace..."
            className={fullscreen
              ? "h-12 w-full rounded-full border border-[#d9d9d6] bg-white pl-12 pr-12 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
              : "h-11 w-full rounded-full border border-[#d9d9d6] bg-white pl-10 pr-11 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"}
            aria-label="Search workspace"
            aria-expanded={open}
          />
          <button
            type="submit"
            disabled={!value.trim()}
            aria-label="Search"
            title="Search"
            className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black text-white transition hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

      </form>

      {open && value.trim().length > 1 && (
        <div className={fullscreen
          ? "absolute left-0 right-0 top-[calc(100%+12px)] z-[100] max-h-[calc(100vh-150px)] overflow-y-auto rounded-2xl border border-[#e6e6e4] bg-white p-2 shadow-2xl"
          : "absolute left-0 right-0 top-[calc(100%+8px)] z-[1600] max-h-[min(70vh,520px)] overflow-y-auto rounded-2xl border border-[#e6e6e4] bg-white p-2 shadow-2xl"}>
          {loading && <div className="px-4 py-3 text-sm text-gray-500">Searching your workspace...</div>}
          {!loading && !hasResults && (
            <div className="m-2 rounded-2xl border border-gray-300 bg-[#f8f8f6] px-5 py-7 text-center">
              <p className="text-sm font-semibold text-gray-900">No matching records found</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Try a product name, order number, customer, request, or another workspace record.
              </p>
            </div>
          )}
          {!loading && hasResults && sections.map(([section, items]) => (
            <section key={section} className="border-b border-[#e6e6e4] px-1 pb-2 pt-1 last:border-b-0">
              <div className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
                {section.replace(/_/g, " ")}
              </div>
              {items.slice(0, 8).map((item) => (
                <button
                  type="button"
                  key={String(item.type) + "-" + String(item.id)}
                  onClick={() => handleClick(item)}
                  className="flex w-full items-center gap-3 border-b border-gray-100 px-3 py-3 text-left transition last:border-b-0 hover:bg-[#f8f8f6]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold tracking-tight text-gray-900">
                      {item.display_name || item.name || item.title || item.company_name || "Untitled record"}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-gray-500">
                      {item.type || section.replace(/_/g, " ")}
                    </span>
                  </span>
                </button>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
