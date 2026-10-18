import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api from "../../../../../../Services/Api";
import TrendingProductCard from "../Trending/TrendingProductCard";

const SECTION_LABELS = {
  trending: "Trending now",
  best_selling: "Best sellers",
  most_wanted: "Most wanted",
  featured: "Featured on Maa Mara",
  occasion: "Shop this collection",
};

const DiscoveryCollectionPage = () => {
  const [searchParams] = useSearchParams();
  const section = searchParams.get("section") || "trending";
  const key = searchParams.get("key") || "";
  const [page, setPage] = useState(1);
  const [collectionName, setCollectionName] = useState("");
  const [products, setProducts] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageSize = 12;

  useEffect(() => {
    setPage(1);
  }, [section, key]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = { section, page, page_size: pageSize };
    if (section === "occasion") params.key = key;

    api.get("/api/discovery-collection/", { params, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setProducts(Array.isArray(data?.results) ? data.results : []);
          setCount(Number(data?.count || 0));
        }
      })
      .catch((requestError) => {
        if (requestError?.code !== "ERR_CANCELED") {
          setProducts([]);
          setCount(0);
          setError("We couldn’t load this collection. Please try again.");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [section, key, page]);

  useEffect(() => {
    let active = true;
    if (section !== "occasion" || !key) {
      setCollectionName("");
      return undefined;
    }
    api.get("/api/discovery/")
      .then(({ data }) => {
        if (!active) return;
        const collection = (data?.occasion_collections || []).find((entry) => entry.key === key);
        setCollectionName(collection?.title || key.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "));
      })
      .catch(() => {
        if (active) setCollectionName(key.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "));
      });
    return () => { active = false; };
  }, [section, key]);

  const title = section === "occasion" ? (collectionName || SECTION_LABELS.occasion) : (SECTION_LABELS[section] || "Discover products");
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <section className="mm-page mm-section">
      <div className="mm-container">
        <div className="mb-6">
          <Link to="/" className="text-sm font-semibold text-gray-600 hover:text-gray-950">← Back to home</Link>
        </div>
        <header className="mb-6 rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-gray-50 to-slate-100 p-5 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Maa Mara Market discovery</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Explore the full collection. Products shown in other homepage previews remain available here.</p>
          <p className="mt-3 text-sm text-gray-500">{count} {count === 1 ? "product" : "products"}</p>
        </header>

        {error && <div role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">{Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-gray-100" />)}</div>
        ) : products.length ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">{products.map((item) => <TrendingProductCard key={item.id} item={item} />)}</div>
            <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-5 sm:flex-row">
              <p className="text-sm text-gray-600">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => { setPage((current) => Math.max(1, current - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 disabled:opacity-40"><ChevronLeft size={16} /> Previous</button>
                <button type="button" disabled={page >= totalPages} onClick={() => { setPage((current) => Math.min(totalPages, current + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 disabled:opacity-40">Next <ChevronRight size={16} /></button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-14 text-center"><h2 className="text-lg font-semibold text-gray-900">No products available</h2><p className="mt-2 text-sm text-gray-600">This collection doesn’t have any eligible products right now.</p></div>
        )}
      </div>
    </section>
  );
};

export default DiscoveryCollectionPage;
