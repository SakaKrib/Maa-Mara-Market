import React from "react";

const ProductSkeleton = () => (
  <div className="mm-card overflow-hidden bg-white" aria-hidden="true">
    <div className="aspect-square w-full animate-pulse bg-gray-200" />
    <div className="space-y-3 p-3 sm:p-4">
      <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
      <div className="flex gap-2">
        <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
      <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
    </div>
  </div>
);

export { ProductSkeleton };
export default ProductSkeleton;
