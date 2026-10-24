import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Store } from "lucide-react";
import useBrands from "../../../../../../cmponents/Hooks/Brand/BrandHook";
import { resolveApiAssetUrl } from "../../../../../../Services/Api";
import BrandSelect from "./BrandSelect";

const shortDescription = (value, maxWords = 5) => {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "Discover products from this maker.";
  return words.length > maxWords ? `${words.slice(0, maxWords).join(" ")}…` : words.join(" ");
};

const BrandList = () => {
  const { brands, loading, error } = useBrands();
  const [search, setSearch] = useState("");
  const [letter, setLetter] = useState("");
  const [sortOrder, setSortOrder] = useState("az");

  const filteredBrands = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (brands || [])
      .filter((brand) => brand && typeof brand === "object")
      .filter((brand) => !term || String(brand.name || "").toLowerCase().includes(term) || String(brand.description || "").toLowerCase().includes(term))
      .filter((brand) => !letter || String(brand.name || "").trim().toUpperCase().startsWith(letter))
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")) * (sortOrder === "za" ? -1 : 1));
  }, [brands, search, letter, sortOrder]);

  if (loading) return (
    <section className="mm-page mm-section">
      <div className="mm-container">
        <header className="mb-6 space-y-3">
          <div className="h-3 w-28 animate-pulse rounded bg-gray-200" />
          <div className="h-9 w-64 max-w-full animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-gray-200" />
        </header>
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(220px,1fr)_180px_180px]">
          <div className="h-12 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-12 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-12 animate-pulse rounded-2xl bg-gray-200" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <article key={i} className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-3">
              <div className="aspect-square animate-pulse rounded-xl bg-gray-200" />
              <div className="space-y-2 px-1 pb-1 pt-3">
                <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
                <div className="mt-3 h-7 w-24 animate-pulse rounded-full bg-gray-200" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
  if (error) return <section className="mm-page"><div className="mm-container py-16 text-center"><h1 className="text-xl font-semibold text-gray-900">Unable to load brands</h1><p className="mt-2 text-sm text-gray-600">Please check your connection and try again.</p></div></section>;

  return (
    <section className="mm-page mm-section">
      <div className="mm-container">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Meet the makers</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">Companies &amp; brands</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Discover the makers and companies behind products on Maa Mara Market.</p>
          </div>
          <p className="text-sm text-gray-500">{filteredBrands.length} {filteredBrands.length === 1 ? "brand" : "brands"}</p>
        </header>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(220px,1fr)_180px_180px]">
          <label className="relative block">
            <span className="sr-only">Search brands</span>
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by brand or company name…" className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200" />
          </label>
          <label>
            <span className="sr-only">Filter brands by first letter</span>
            <BrandSelect
              value={letter}
              onChange={setLetter}
              ariaLabel="Filter brands by first letter"
              options={[
                { value: "", label: "All letters" },
                ...("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((value) => ({ value, label: `Starts with ${value}` }))),
              ]}
            />
          </label>
          <label>
            <span className="sr-only">Sort brands</span>
            <BrandSelect
              value={sortOrder}
              onChange={setSortOrder}
              ariaLabel="Sort brands"
              options={[
                { value: "az", label: "Name: A to Z" },
                { value: "za", label: "Name: Z to A" },
              ]}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredBrands.map((brand) => {
            const logo = resolveApiAssetUrl(brand.vendor_logo_url || brand.logo_url);
            return (
              <article key={brand.id} className="group min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2.5 transition-shadow hover:shadow-md sm:p-3">
                <Link to={`/brands/${brand.id}`} className="block overflow-hidden rounded-xl bg-gray-50" aria-label={`View ${brand.name} brand details`}>
                  <div className="flex aspect-square w-full items-center justify-center overflow-hidden p-2 sm:p-2.5">
                    {logo ? <img src={logo} alt={`${brand.name} company logo`} loading="lazy" className="h-full w-full rounded-xl object-cover transition-transform duration-300 group-hover:scale-105" /> : <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400"><Store size={28} strokeWidth={1.5} /><span className="px-2 text-center text-xs font-semibold">{brand.name}</span></div>}
                  </div>
                </Link>
                <div className="px-1 pb-1 pt-3">
                  <h2 className="truncate text-sm font-semibold text-gray-900" title={brand.name}>{brand.name}</h2>
                  <p className="mt-1 min-h-10 text-[11px] leading-5 text-gray-500">{shortDescription(brand.description)}</p>
                  <Link to={`/brands/${brand.id}`} className="mt-3 inline-flex rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-800 transition-colors hover:bg-gray-50">
                    View details
                  </Link>
                </div>
              </article>
            );
          })}
          {!filteredBrands.length && <div className="col-span-full rounded-2xl border border-dashed border-gray-300 px-5 py-14 text-center"><h2 className="font-semibold text-gray-900">No brands found</h2><p className="mt-2 text-sm text-gray-600">Try a different search term.</p></div>}
        </div>
      </div>
    </section>
  );
};

export default BrandList;
