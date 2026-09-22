import React, { useMemo } from "react";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";

const resolveImage = (value) => {
  if (!value) return null;
  return value.startsWith("http") ? value : `${baseUrl || ""}${value}`;
};

const ProductGallery = ({ item, selectedImage, selectedVariant, selectedSize, onSelectImage, onSelectColor }) => {
  const media = useMemo(() => {
    const entries = [];

    if (item?.image) entries.push({ type: "image", value: item.image, key: "main" });

    (Array.isArray(item?.additional_images) ? item.additional_images : []).forEach((entry, index) => {
      const value = typeof entry === "string" ? entry : entry?.image;
      if (value) entries.push({ type: "image", value, key: `additional-${entry?.id || index}` });
    });

    (Array.isArray(item?.variants) ? item.variants : []).forEach((variant) => {
      if (variant?.image) {
        entries.push({
          type: "image",
          value: variant.image,
          key: `variant-${variant.id}`,
          variantId: variant.id,
          label: variant.color,
        });
      }
    });

    return entries.filter((entry, index, all) => all.findIndex((candidate) => candidate.value === entry.value) === index);
  }, [item]);

  const activeImage = selectedImage || selectedSize?.image || selectedVariant?.image || item?.image;
  const activeUrl = resolveImage(activeImage);

  return (
    <section className="w-full min-w-0">
      <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-muted/20 aspect-[4/5] max-h-[760px]">
        {activeUrl ? (
          <img
            src={activeUrl}
            className="block h-full w-full object-cover"
            alt={item.name}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No product image
          </div>
        )}
      </div>

      {media.length > 0 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {media.map((entry, index) => {
            const url = resolveImage(entry.value);
            const selected = activeImage === entry.value;
            return (
              <button
                type="button"
                key={entry.key}
                onClick={() => onSelectImage(entry.value)}
                className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-background ${selected ? "border-gray-900 ring-2 ring-gray-900/10" : "border-border"}`}
                aria-label={`Product image ${index + 1}`}
              >
                <img src={url} className="h-full w-full object-cover" alt={entry.label || `Preview ${index + 1}`} />
              </button>
            );
          })}
        </div>
      )}

      {Array.isArray(item?.variants) && item.variants.length > 0 && (
        <div className="mt-5">
          <p className="mb-3 text-sm font-semibold text-card-foreground">Color variants</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {item.variants.map((variant) => {
              const selected = selectedVariant?.id === variant.id;
              const variantImage = resolveImage(variant.image);
              return (
                <button
                  type="button"
                  key={variant.id}
                  onClick={() => onSelectColor(variant.color)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-background ${selected ? "border-gray-900 ring-2 ring-gray-900/10" : "border-border"}`}
                  title={variant.color}
                  aria-label={variant.color}
                >
                  {variantImage ? (
                    <img src={variantImage} className="h-full w-full object-cover" alt={variant.color} />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-muted px-1 text-center text-[10px] font-medium text-muted-foreground">
                      {variant.color || "Color"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {item?.video && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-black">
          <video controls preload="metadata" className="max-h-[420px] w-full">
            <source src={resolveImage(item.video)} />
            Your browser does not support product video.
          </video>
        </div>
      )}
    </section>
  );
};

export default ProductGallery;
