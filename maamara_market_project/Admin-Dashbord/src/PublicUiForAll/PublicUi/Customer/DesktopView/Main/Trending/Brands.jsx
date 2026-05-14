import React from "react";
import useBrands from "../../../../../../cmponents/Hooks/Brand/BrandHook";

const BrandList = () => {
  const { brands, loading, error } = useBrands();

  if (loading) return <p className="text-center mt-10 text-gray-600">Loading brands...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">Error fetching brands.</p>;

  return (
    <section className="brands mt-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <header className="mb-8 border-b border-gray-300 pb-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Companies &amp; Brands
          </h1>
        </header>

        {/* Brands Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {brands.length > 0 ? (
            brands.map((brand) => {
              const displayLogo = brand.logo_url || brand.vendor_logo_url;

              return (
                <a
                  key={brand.id}
                  href={`/brands/${brand.id}`}
                  className="group flex flex-col items-center bg-white rounded-lg p-4 shadow-sm hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                  title={brand.name}
                >
                  <div className="w-28 h-28 flex items-center justify-center rounded-full bg-gray-100 overflow-hidden mb-3 relative">
                    {displayLogo ? (
                      <img
                        src={displayLogo}
                        alt={brand.name}
                        className="object-contain w-full h-full transform group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium select-none">
                        No Logo
                      </div>
                    )}
                  </div>
                  <h4 className="text-center text-sm font-semibold text-gray-900 truncate w-full max-w-full group-hover:text-indigo-600 transition-colors duration-300">
                    {brand.name}
                  </h4>
                </a>
              );
            })
          ) : (
            <p className="text-center text-gray-500 col-span-full">
              No brands available yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default BrandList;
