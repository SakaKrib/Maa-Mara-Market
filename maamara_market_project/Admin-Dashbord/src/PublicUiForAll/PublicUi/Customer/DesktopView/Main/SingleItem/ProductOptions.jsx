import React from "react";

const normalize = (value) => String(value ?? "").trim().toLowerCase();

const ProductOptions = ({ item, selectedVariant, selectedSize, onColorChange, onSizeChange }) => {
  const variants = Array.isArray(item?.variants) ? item.variants : [];
  const sizes = Array.isArray(selectedVariant?.sizes) ? selectedVariant.sizes : [];

  return (
    <div className="space-y-6">
      {variants.length > 0 && (
        <fieldset>
          <legend className="font-semibold text-sm mb-3">Color{selectedVariant?.color && <span className="ml-2 font-normal text-gray-500">· {selectedVariant.color}</span>}</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => {
              const selected = selectedVariant?.id === variant.id;
              const color = variant.color || "Other";
              return (
                <label key={variant.id} className="cursor-pointer">
                  <input type="radio" name="product-color" value={variant.id} checked={selected} onChange={() => onColorChange(color)} className="sr-only" />
                  <span className={"inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition " + (selected ? "border-gray-900 ring-2 ring-gray-900/10 bg-gray-50" : "border-gray-300 hover:border-gray-700 bg-white")}>
                    <span aria-hidden="true" className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: normalize(color) }} />
                    <span>{color}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {selectedVariant && sizes.length > 0 && (
        <fieldset>
          <legend className="font-semibold text-sm mb-3">Size{!selectedSize && <span className="ml-2 font-normal text-gray-500">· Required</span>}</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((sizeObj) => {
              const stock = Number(sizeObj.quantity_in_stock || 0);
              const selected = selectedSize?.id === sizeObj.id;
              const disabled = stock <= 0;
              return (
                <label key={sizeObj.id} className={disabled ? "cursor-not-allowed" : "cursor-pointer"}>
                  <input type="radio" name="product-size" value={sizeObj.id} checked={selected} onChange={() => onSizeChange(sizeObj)} disabled={disabled} className="sr-only" />
                  <span className={"inline-flex min-w-14 justify-center rounded-md border px-3 py-2 text-sm font-medium transition " + (selected ? "border-gray-900 bg-gray-900 text-white" : disabled ? "border-gray-200 bg-gray-50 text-gray-400 line-through" : "border-gray-300 bg-white hover:border-gray-900")}>
                    {sizeObj.size}
                  </span>
                </label>
              );
            })}
          </div>
          {selectedSize && <p className="mt-2 text-xs text-gray-500">{Number(selectedSize.quantity_in_stock || 0)} available in this size.</p>}
        </fieldset>
      )}
    </div>
  );
};

export default ProductOptions;