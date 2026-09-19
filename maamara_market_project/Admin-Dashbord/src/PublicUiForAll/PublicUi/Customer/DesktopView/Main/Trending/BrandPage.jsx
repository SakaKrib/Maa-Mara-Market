import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import useBrands from "../../../../../../cmponents/Hooks/Brand/BrandHook";

const BrandPage = () => {
  const { id } = useParams();
  const { brands, loading, error } = useBrands();

  const brand = useMemo(
    () => brands.find((entry) => String(entry.id) === String(id)),
    [brands, id]
  );

  if (loading) {
    return (
      <section className="mm-page">
        <div className="mm-container py-12">
          <div className="mx-auto h-8 w-56 animate-pulse rounded bg-gray-200" />
          <div className="mx-auto mt-4 h-4 w-80 max-w-full animate-pulse rounded bg-gray-200" />
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="mm-card overflow-hidden">
                <div className="aspect-square animate-pulse bg-gray-200" />
                <div className="h-5 w-2/3 animate-pulse bg-gray-200 p-3" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mm-page">
        <div className="mm-container py-16 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Unable to load brand</h1>
          <p className="mt-2 text-sm text-gray-500">Please try again later.</p>
          <Link to="/brands" className="primary-button mt-6 inline-flex rounded-md px-4 py-2 text-white">
            Back to brands
          </Link>
        </div>
      </section>
    );
  }

  if (!brand) {
    return (
      <section className="mm-page">
        <div className="mm-container py-16 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Brand not found</h1>
          <p className="mt-2 text-sm text-gray-500">
            The brand may have been removed or is no longer available.
          </p>
          <Link to="/brands" className="primary-button mt-6 inline-flex rounded-md px-4 py-2 text-white">
            Browse brands
          </Link>
        </div>
      </section>
    );
  }

  const logo = brand.logo_url || brand.vendor_logo_url;

  return (
    <section className="mm-page">
      <div className="mm-container py-8 sm:py-10">
        <div className="mb-6">
          <Link to="/brands" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            ← All brands
          </Link>
        </div>

        <div className="mm-card overflow-hidden">
          <div className="grid gap-6 p-6 sm:grid-cols-[180px_1fr] sm:items-center sm:p-8">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-gray-100">
              {logo ? (
                <img src={logo} alt={brand.name} className="h-full w-full object-contain" />
              ) : (
                <span className="px-4 text-center text-sm text-gray-400">No logo available</span>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Brand
              </p>
              <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                {brand.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                {brand.description || "Discover products and collections from this brand on Maa Mara Market."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandPage;
