import React from "react";

const ALLOWED_COLORS = ["blue","brown","orange","turquise","yellow","red","green","purple","black"];

const ProductOptions = ({ item, selectedVariant, selectedSize, onColorChange, onSizeChange }) => {
  const availableColors = (item.variants || []).map((variant) => variant.color?.toLowerCase());

  return (
    <>
      <div>
        <p className="font-medium mb-2">Select Color</p>
        <div className="flex flex-wrap gap-4">
          {ALLOWED_COLORS.map((color) => {
            const available = availableColors.includes(color);
            return (
              <label key={color} className="inline-block">
                <input
                  type="radio"
                  name="color"
                  value={color}
                  checked={selectedVariant?.color?.toLowerCase() === color}
                  onChange={() => onColorChange(color)}
                  disabled={!available}
                  className="hidden"
                />
                <span
                  className={`block w-6 h-6 rounded-full border ${available ? "opacity-100 hover:ring-2 hover:ring-offset-1 cursor-pointer" : "opacity-40 cursor-not-allowed"}`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              </label>
            );
          })}
        </div>
      </div>

      {selectedVariant?.sizes?.length > 0 && (
        <div>
          <p className="font-medium mb-2">Select Size</p>
          <div className="flex flex-wrap gap-4">
            {selectedVariant.sizes.map((sizeObj) => (
              <label key={sizeObj.id}>
                <input
                  type="radio"
                  name="size"
                  checked={selectedSize?.id === sizeObj.id}
                  onChange={() => onSizeChange(sizeObj)}
                  className="hidden"
                  disabled={sizeObj.quantity_in_stock === 0}
                />
                <span
                  className={`inline-block border rounded px-2 py-1 text-sm cursor-pointer ${sizeObj.quantity_in_stock === 0 ? "opacity-40 cursor-not-allowed" : ""} ${selectedSize?.id === sizeObj.id ? "ring-2 ring-black" : ""}`}
                >
                  {sizeObj.size} {sizeObj.quantity_in_stock === 0 ? "(Out)" : ""}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default ProductOptions;
