import { useEffect } from "react";
import { Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import useGlobalSearch from "../Hooks/SearchHook/GlobalSearchHook";

export default function SearchGlobalResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search).get("q") || "";
  const { search, data, loading } = useGlobalSearch();

  useEffect(() => {
    if (query) search(query);
  }, [query, search]);

  const sections = Object.entries(data || {}).filter(([, items]) => Array.isArray(items) && items.length);
  const total = sections.reduce((sum, [, items]) => sum + items.length, 0);

  return (
    <section className="space-y-5 text-gray-900">
      <header className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563eb]">
            <Search size={18} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2563eb]">Workspace search</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Search results</h1>
            <p className="mt-1 text-sm text-gray-600">
              Results available to your current workspace role for “{query}”.
            </p>
          </div>
        </div>
      </header>

      {loading && (
        <div className="rounded-2xl border border-[#e6e6e4] bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Searching...
        </div>
      )}

      {!loading && !sections.length && (
        <div className="rounded-2xl border border-dashed border-[#d7d7d3] bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">No results found</h2>
          <p className="mt-1 text-sm text-gray-500">Try another name, reference, email, title, or ID.</p>
        </div>
      )}

      {!loading && sections.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-gray-500">{total} matching record{total === 1 ? "" : "s"} shown</div>
          {sections.map(([type, items]) => (
            <article key={type} className="rounded-2xl border border-[#e6e6e4] bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 border-b border-[#e6e6e4] pb-3">
                <h2 className="text-base font-semibold capitalize text-gray-900">{type.replace(/_/g, " ")}</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <button
                    key={String(item.type) + "-" + String(item.id)}
                    type="button"
                    onClick={() => {
                      if (item.type === "Item" && item.id) navigate("/item/" + item.id);
                    }}
                    className="rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-gray-300 hover:bg-[#f8f8f6]"
                  >
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {item.display_name || item.name || item.title || item.company_name || "Untitled record"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.type || type.replace(/_/g, " ")} · ID {item.id}
                    </p>
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
