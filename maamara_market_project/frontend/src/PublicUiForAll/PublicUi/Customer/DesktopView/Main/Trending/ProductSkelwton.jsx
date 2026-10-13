import React from "react";

const ProductSkeleton = () => (
  <article className="mm-product-card mm-card mm-card-interactive overflow-hidden bg-white mm-product-skeleton-card" aria-hidden="true">
    <div className="mm-product-media relative">
      <div className="aspect-square w-full animate-pulse bg-gray-200" />
    </div>

    <div className="mm-product-content p-3 sm:p-4 flex flex-col">
      <div className="mb-1 h-5 w-3/4 animate-pulse rounded bg-gray-200" />

      <div className="mb-[6px] flex min-h-[18px] items-center gap-2">
        <div className="h-3 w-10 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
      </div>

      <div className="mm-product-price-row" aria-hidden="true">
        <div className="h-4 w-20 animate-pulse rounded bg-gray-300" />
        <div className="h-3 w-14 animate-pulse rounded bg-gray-200" />
      </div>

      <div className="mm-product-promotion" aria-hidden="true">
        <div className="h-3 w-14 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  </article>
);

export { ProductSkeleton };
export default ProductSkeleton;
