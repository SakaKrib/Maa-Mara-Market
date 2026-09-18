import React from "react";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";

const resolveImage = (value) => {
  if (!value) return null;
  return value.startsWith("http") ? value : `${baseUrl || ""}${value}`;
};

const ProductGallery = ({ item, selectedImage, selectedVariant, selectedSize, onSelectImage, onSelectColor }) => {
  const previewImages = item.images?.length ? item.images : [item.image];

  return (
    <section className="w-full lg:w-1/2 lg:sticky lg:top-0">
      <div className="h-[55vh] lg:h-[75vh] relative">
        <img
          src={resolveImage(selectedImage || selectedSize?.image || selectedVariant?.image || item.image)}
          className="object-cover rounded-md w-full h-full"
          alt={item.name}
        />
      </div>

      <div className="flex flex-wrap gap-4 mt-6">
        {previewImages.filter(Boolean).map((image, index) => {
          const url = resolveImage(image);
          return (
            <button
              type="button"
              key={`preview-${index}`}
              onClick={() => onSelectImage(image)}
              className={`w-20 h-20 rounded-md overflow-hidden cursor-pointer border ${selectedImage === image ? "ring-2 ring-black" : ""}`}
            >
              <img src={url} className="object-cover w-full h-full" alt={`Preview ${index + 1}`} />
            </button>
          );
        })}
      </div>

      {item.variants?.length > 0 && (
        <div className="flex flex-wrap gap-4 mt-6">
          {item.variants.map((variant) => (
            <button
              type="button"
              key={variant.id}
              onClick={() => onSelectColor(variant.color)}
              className={`w-20 h-20 rounded-md overflow-hidden cursor-pointer border ${selectedVariant?.id === variant.id ? "ring-2 ring-black" : ""}`}
              title={variant.color}
            >
              {variant.color_image ? (
                <img src={resolveImage(variant.color_image)} className="object-cover w-full h-full" alt={variant.color} />
              ) : (
                <span className="block w-full h-full" style={{ backgroundColor: variant.color?.toLowerCase() }} />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default ProductGallery;
