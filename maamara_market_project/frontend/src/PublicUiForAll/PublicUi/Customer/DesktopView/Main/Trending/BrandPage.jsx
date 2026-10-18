import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import api, { resolveApiAssetUrl } from "../../../../../../Services/Api";
import useBrands from "../../../../../../cmponents/Hooks/Brand/BrandHook";
import TrendingProductCard from "./TrendingProductCard";

const PAGE_SIZE = 12;

const BrandPage = () => {
  const { id } = useParams();
  const { brands, loading: brandsLoading, error: brandsError } = useBrands();
  const [filters, setFilters] = useState(null);
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("Default");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);

  const brand = useMemo(
    () => brands.find((entry) => String(entry.id) === String(id)),
    [brands, id]
  );

  useEffect(() => {
    let active = true;
    api.get("/filters/")
      .then((response) => { if (active) setFilters(response.data || {}); })
      .catch(() => { if (active) setFilters({}); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!brand) return undefined;
    const controller = new AbortController();
    setLoadingProducts(true);
    setProductError("");
    const params = {
      brands: String(brand.id),
      page,
      perPage: PAGE_SIZE,
      sortBy,
    };
    if (search) params.search = search;
    if (category) params.categories = category;
    if (minPrice !== "" && Number.isFinite(Number(minPrice))) params.min_price = minPrice;
    if (maxPrice !== "" && Number.isFinite(Number(maxPrice))) params.max_price = maxPrice;

    api.get("/filter-products/", { params, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setProducts(Array.isArray(data) ? data : (data.results || []));
          setTotalCount(Number(data.count ?? data.results?.length ?? 0));
        }
      })
      .catch((error) => {
        if (error?.code !== "ERR_CANCELED") {
          setProducts([]);
          setTotalCount(0);
          setProductError("We couldn’t load this brand’s products. Please try again.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingProducts(false);
      });
    return () => controller.abort();
  }, [brand, page, search, category, sortBy, minPrice, maxPrice]);

  const categories = useMemo(() => {
    const result = [];
    (filters?.sections || []).forEach((section) => {
      (section.departments || []).forEach((department) => {
        (department.categories || []).forEach((entry) => {
          if (!result.some((item) => String(item.id) === String(entry.id))) result.push(entry);
        });
      });
    });
    return result.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [filters]);

  const logo = resolveApiAssetUrl(brand?.logo_url || brand?.vendor_logo_url);
  const heroImage = resolveApiAssetUrl(brand?.vendor_logo_url || brand?.logo_url);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (brandsLoading) {
    return <section className="mm-page"><div className="mm-container py-12"><div className="h-64 animate-pulse rounded-3xl bg-gray-100" /><div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-gray-100" />)}</div></div></section>;
  }

  if (brandsError || !brand) {
    return (
      <section className="mm-page">
        <div className="mm-container py-16 text-center">
          <h1 className="text-xl font-semibold text-gray-900">{brandsError ? "Unable to load brand" : "Brand not found"}</h1>
          <p className="mt-2 text-sm text-gray-500">{brandsError ? "Please try again later." : "This brand may have been removed or is no longer available."}</p>
          <Link to="/brands" className="mt-6 inline-flex rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-800">Browse all brands</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mm-page pb-10">
      <div className="mm-container pt-4 sm:pt-6">
        <Link to="/brands" className="mb-4 inline-flex text-sm font-semibold text-gray-600 transition hover:text-gray-950">← All brands</Link>

        <header className="relative isolate overflow-hidden rounded-[1.75rem] border border-gray-200 bg-slate-100 shadow-sm">
          <div className="absolute inset-0">
            {heroImage ? <img src={heroImage} alt="" className="h-full w-full object-cover object-center" /> : <div className="h-full w-full bg-gradient-to-br from-slate-200 via-stone-100 to-white" />}
            <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/10 to-white" />
            <div className="absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-white via-white/95 to-white/0" />
          </div>

          <div className="relative flex min-h-[340px] flex-col justify-end px-4 pb-5 pt-28 sm:min-h-[390px] sm:px-8 sm:pb-8 sm:pt-32 lg:min-h-[420px] lg:px-12">
            <div className="mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-white/90 bg-white p-2 shadow-xl sm:absolute sm:left-8 sm:top-8 sm:mb-0 sm:h-28 sm:w-28 lg:left-12">
              {logo ? <img src={logo} alt={brand.name + " logo"} className="h-full w-full object-contain" /> : <span className="text-center text-xs font-semibold text-gray-400">{brand.name}</span>}
            </div>
            <div className="max-w-4xl sm:pl-32 lg:pl-36">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Discover the brand</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">{brand.name}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-700 sm:text-base sm:leading-7">
                {brand.description || "Explore products from this brand, selected for you on Maa Mara Market."}
              </p>
            </div>
          </div>
        </header>

        <section className="mt-8 sm:mt-10" aria-labelledby="brand-products-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">The collection</p>
              <h2 id="brand-products-heading" className="mt-1 text-2xl font-bold text-gray-950 sm:text-3xl">Shop {brand.name}</h2>
              <p className="mt-1 text-sm text-gray-600">{totalCount} {totalCount === 1 ? "product" : "products"} from this brand</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.5fr)_minmax(150px,1fr)_minmax(120px,.7fr)_minmax(120px,.7fr)_minmax(160px,1fr)]">
              <label className="relative block">
                <span className="sr-only">Search this brand’s products</span>
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(1); }} placeholder="Search this brand…" className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200" />
              </label>
              <label className="relative">
                <span className="sr-only">Filter by category</span>
                <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200">
                  <option value="">All categories</option>
                  {categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                </select>
              </label>
              <label>
                <span className="sr-only">Minimum price</span>
                <input type="number" min="0" value={minPrice} onChange={(event) => { setMinPrice(event.target.value); setPage(1); }} placeholder="Min price" className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200" />
              </label>
              <label>
                <span className="sr-only">Maximum price</span>
                <input type="number" min="0" value={maxPrice} onChange={(event) => { setMaxPrice(event.target.value); setPage(1); }} placeholder="Max price" className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200" />
              </label>
              <label className="relative">
                <span className="sr-only">Sort products</span>
                <SlidersHorizontal size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); }} className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-9 pr-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200">
                  <option value="Default">Newest</option><option value="Product Name">Name A–Z</option><option value="Price">Price: low to high</option><option value="Brand">Brand</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
              <span className="text-xs text-gray-500">Search and filters apply to this brand’s full catalogue.</span>
              <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setCategory(""); setMinPrice(""); setMaxPrice(""); setSortBy("Default"); setPage(1); }} className="text-sm font-semibold text-red-700 hover:text-red-800">Clear filters</button>
            </div>
          </div>

          {productError && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{productError}</p>}
          {loadingProducts ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">{Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-gray-100" />)}</div>
          ) : products.length ? (
            <>
              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
                {products.map((item) => <TrendingProductCard key={item.id} item={item} />)}
              </div>
              <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-5 sm:flex-row">
                <p className="text-sm text-gray-600">Page {page} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={page <= 1} onClick={() => { setPage((current) => Math.max(1, current - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /> Previous</button>
                  <button type="button" disabled={page >= totalPages} onClick={() => { setPage((current) => Math.min(totalPages, current + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={16} /></button>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-gray-300 px-5 py-14 text-center">
              <h3 className="text-lg font-semibold text-gray-900">No matching products</h3>
              <p className="mt-2 text-sm text-gray-600">Try another search or clear some filters to see more from {brand.name}.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
};

export default BrandPage;
