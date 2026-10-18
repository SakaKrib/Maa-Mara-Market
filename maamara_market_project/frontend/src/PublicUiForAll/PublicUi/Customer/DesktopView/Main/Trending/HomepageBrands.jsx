import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import useBrands from "../../../../../../cmponents/Hooks/Brand/BrandHook";
import { resolveApiAssetUrl } from "../../../../../../Services/Api";

const HomepageBrands = () => {
  const { brands, loading, error } = useBrands();
  if (loading || error || !brands?.length) return null;

  const featured = brands.slice(0, 8);
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-8">
          {featured.map((brand) => {
            const logo = resolveApiAssetUrl(brand.vendor_logo_url || brand.logo_url);
            return (
              <Link key={brand.id} to={`/brands/${brand.id}`} className="group flex min-w-0 flex-col items-center rounded-2xl border border-gray-200 bg-white p-3 text-center transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md sm:p-4">
                <div className="flex aspect-square w-full max-w-28 items-center justify-center overflow-hidden rounded-xl bg-gray-50 p-3">
                  {logo ? <img src={logo} alt={brand.name + " logo"} loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" /> : <span className="text-xs font-semibold text-gray-400">{brand.name}</span>}
                </div>
                <span className="mt-2 w-full truncate text-sm font-semibold text-gray-900">{brand.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomepageBrands;
