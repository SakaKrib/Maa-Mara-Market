import React from "react";
import useBrands from "../../../../../../cmponents/Hooks/Brand/BrandHook";

const BrandList = () => {
  const { brands, loading, error } = useBrands();

  if (loading) return <p className="text-center mt-10 text-gray-600">Loading brands...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">Error fetching brands.</p>;

  return (
    <section className="brands mm-section">
      <div className="mm-container">
        <header className="mm-section-heading">
          <div>
            <h2>Companies &amp; Brands</h2>
            <p>Explore makers and sellers available on Maa Mara Market.</p>
          </div>
        </header>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
          {brands.length > 0 ? brands.map((brand) => {
            const displayLogo = brand.logo_url || brand.vendor_logo_url;
            return (
              <a key={brand.id} href={`/brands/${brand.id}`} className="mm-card mm-card-interactive group flex flex-col items-center p-3 sm:p-4 cursor-pointer" title={brand.name}>
                <div className="w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center rounded-full bg-gray-100 overflow-hidden mb-3">
                  {displayLogo ? (
                    <img src={displayLogo} alt={brand.name} className="object-contain w-full h-full transform group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium select-none">No Logo</div>
                  )}
                </div>
                <h4 className="text-center text-sm font-semibold text-gray-900 truncate w-full">{brand.name}</h4>
              </a>
            );
          }) : (
            <p className="text-center text-gray-500 col-span-full py-8">No brands available yet.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default BrandList;