import React from "react";
import useBrands from "../../../../../../cmponents/Hooks/Brand/BrandHook";

const BrandList = () => {
  const { brands, loading, error } = useBrands();

  if (loading) return <p className="text-center mt-10">Loading brands...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">Error fetching brands.</p>;

  return (
    <div className="brands mt-5">
      <div className="max-w-7xl mx-auto">
        <div className="cathead">
          <div className="container-head">
            <h1 className="border-b border-black py-2 text-xl font-bold">
              Companies &amp; Brands
            </h1>
          </div>
        </div>

        <div className="wrapper flex flex-wrap gap-4 mt-4 justify-center">
          {brands.length > 0 ? (
            brands.map((brand) => {
              const displayLogo = brand.logo_url || brand.vendor_logo_url;

              return (
                <div
                  key={brand.id}
                  className="item p-3 border rounded-full shadow-sm w-48 text-center bg-white hover:shadow-lg transition-shadow duration-200 relative"
                >
                  <a href={`/brands/${brand.id}`} className="block">
                    {displayLogo ? (
                      <img
                        src={displayLogo}
                        alt={brand.name}
                        className="w-full  object-cover mb-2 absolute"
                      />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center bg-gray-200 text-gray-500">
                        No Logo
                      </div>
                    )}
                    <h4 className="name icon-small font-semibold text-sm truncate">
                      {brand.name}
                    </h4>
                  </a>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500 mt-6">No brands available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrandList;
