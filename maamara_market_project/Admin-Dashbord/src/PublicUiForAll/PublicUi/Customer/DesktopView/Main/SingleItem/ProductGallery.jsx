import React, { useEffect, useMemo, useState } from "react";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";

const resolveImage = (value) => {
  if (!value) return null;
  return value.startsWith("http") ? value : `${baseUrl || ""}${value}`;
};

const ProductGallery = ({ item, selectedImage, selectedVariant, selectedSize, onSelectImage, onSelectColor }) => {
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  const media = useMemo(() => {
    const entries = [];

    if (item?.image) entries.push({ type: "image", value: item.image, key: "main" });

    const galleryEntries = Array.isArray(item?.additional_images)
      ? item.additional_images
      : Array.isArray(item?.gallery_images)
        ? item.gallery_images
        : Array.isArray(item?.gallery)
          ? item.gallery
          : [];

    galleryEntries.forEach((entry, index) => {
      const value =
        typeof entry === "string"
          ? entry
          : entry?.image || entry?.image_url || entry?.url;

      if (value) {
        entries.push({
          type: "image",
          value,
          key: `additional-${entry?.id || index}`,
        });
      }
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

  useEffect(() => {
    if (!isImageFullscreen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsImageFullscreen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isImageFullscreen]);

  return (
    <section className="w-full min-w-0">
      <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-muted/20 aspect-[4/5] max-h-[760px]">
        {activeUrl ? (
          <button
            type="button"
            className="block h-full w-full cursor-zoom-in"
            onClick={() => setIsImageFullscreen(true)}
            aria-label="View product image full screen"
          >
            <img
              src={activeUrl}
              className="block h-full w-full object-cover"
              alt={item.name}
            />
          </button>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No product image
          </div>
        )}
      </div>

      {isImageFullscreen && activeUrl && (
        <div
          className="fixed inset-0 z-[100] flex h-screen w-screen items-center justify-center bg-black/90 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Full screen product image"
          onClick={() => setIsImageFullscreen(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur transition-colors hover:bg-white/20"
            onClick={() => setIsImageFullscreen(false)}
            aria-label="Close full screen image"
          >
            ×
          </button>

          <img
            src={activeUrl}
            className="max-h-full max-w-full object-contain"
            alt={item.name}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-border bg-background p-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Product gallery
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {media.map((entry, index) => {
              const url = resolveImage(entry.value);
              const selected = activeImage === entry.value;
              return (
                <button
                  type="button"
                  key={entry.key}
                  onClick={() => onSelectImage(entry.value)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-background ${selected ? "border-gray-900 ring-2 ring-gray-900/10" : "border-border"}`}
                  aria-label={`Product gallery image ${index + 1}`}
                >
                  <img
                    src={url}
                    className="h-full w-full object-cover"
                    alt={entry.label || `Gallery preview ${index + 1}`}
                  />
                </button>
              );
            })}
          </div>
          {media.length === 0 && (
            <p className="text-xs text-muted-foreground">No additional gallery images.</p>
          )}
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-background p-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Color variants
          </p>
          {Array.isArray(item?.variants) && item.variants.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {item.variants.map((variant) => {
                const selected = selectedVariant?.id === variant.id;
                const variantImage = resolveImage(variant.image);
                return (
                  <button
                    type="button"
                    key={variant.id}
                    onClick={() => onSelectColor(variant)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-background ${selected ? "border-gray-900 bg-gray-900 ring-2 ring-gray-900/10" : "border-border"}`}
                    title={variant.color}
                    aria-label={variant.color}
                  >
                    {variantImage ? (
                      <img
                        src={variantImage}
                        className="h-full w-full object-cover"
                        alt={variant.color}
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-muted px-1 text-center text-[10px] font-medium text-muted-foreground">
                        {variant.color || "Color"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No color variants.</p>
          )}
        </div>
      </div>

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
