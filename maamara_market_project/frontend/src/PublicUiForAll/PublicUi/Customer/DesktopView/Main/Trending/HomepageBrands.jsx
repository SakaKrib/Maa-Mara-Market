import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Store } from "lucide-react";
import useBrands from "../../../../../../cmponents/Hooks/Brand/BrandHook";
import { resolveApiAssetUrl } from "../../../../../../Services/Api";

const shortDescription = (value, maxWords = 5) => {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "Discover products from this maker.";
  return words.length > maxWords ? `${words.slice(0, maxWords).join(" ")}…` : words.join(" ");
};

const HomepageBrands = () => {
  const { brands, loading, error } = useBrands();
  if (loading || error || !brands?.length) return null;

  return (
    <section className="mm-section">
      <div className="mm-container">
        <div className="mm-section-heading">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Meet the makers</p>
            <h2>Find your favorite brands</h2>
            <p>Explore the companies and makers behind the products you love.</p>
          </div>
          <Link to="/brands" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-gray-500 hover:bg-gray-50">
            Explore all <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
          {brands.slice(0, 6).map((brand) => {
            const logo = resolveApiAssetUrl(brand.vendor_logo_url || brand.logo_url);
            return (
              <article key={brand.id} className="group min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2.5 transition-shadow hover:shadow-md sm:p-3">
                <Link to={`/brands/${brand.id}`} className="block overflow-hidden rounded-xl bg-gray-50" aria-label={`View ${brand.name} brand details`}>
                  <div className="flex aspect-square w-full items-center justify-center overflow-hidden p-4 sm:p-5">
                    {logo ? (
                      <img src={logo} alt={`${brand.name} company logo`} loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400">
                        <Store size={28} strokeWidth={1.5} />
                        <span className="px-2 text-center text-xs font-semibold">{brand.name}</span>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="px-1 pb-1 pt-3">
                  <h3 className="truncate text-sm font-semibold text-gray-900" title={brand.name}>{brand.name}</h3>
                  <p className="mt-1 min-h-10 text-[11px] leading-5 text-gray-500">{shortDescription(brand.description)}</p>
                  <Link to={`/brands/${brand.id}`} className="mt-3 inline-flex rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-800 transition-colors hover:bg-gray-50">
                    View brand
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomepageBrands;
