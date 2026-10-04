import React, { useMemo } from "react";
import { resolveApiAssetUrl } from "../../../../../../Services/Api";

const resolveImage = (value) => resolveApiAssetUrl(value);

const ProductGallery = ({
  item,
  selectedImage,
  selectedVariant,
  onSelectImage,
}) => {
  const images = useMemo(() => {
    const candidates = [];

    const add = (value, key) => {
      const url = resolveImage(value);
      if (!url || candidates.some((entry) => entry.url === url)) return;
      candidates.push({ key: key || url, url });
    };

    // The selected color variant image takes priority when a variant is active.
    add(selectedVariant?.image?.url || selectedVariant?.image, "variant");

    add(item?.image?.url || item?.image || item?.image_url || item?.imageUrl, "main");

    (Array.isArray(item?.additional_images) ? item.additional_images : []).forEach(
      (entry, index) => {
        add(entry?.image?.url || entry?.image, `additional-${entry?.id || index}`);
      }
    );

    return candidates;
  }, [item, selectedVariant]);

  const activeImage = resolveImage(selectedImage) || images[0]?.url || null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted">
        {activeImage ? (
          <img
            src={activeImage}
            alt={item?.name || "Product image"}
            className="h-full w-full object-contain"
            onError={(event) => {
              event.currentTarget.style.display = "none";
              event.currentTarget.nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <div className={`flex h-full w-full items-center justify-center bg-muted ${activeImage ? "hidden" : ""}`}>
          <span className="text-xs text-muted-foreground">Product image unavailable</span>
        </div>
      </div>

      {images.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {images.map((image) => (
            <button
              key={image.key}
              type="button"
              onClick={() => onSelectImage?.(image.url)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-background ${activeImage === image.url ? "border-gray-900" : "border-border"}`}
              aria-label={`View ${item?.name || "product"} image`}
              aria-pressed={activeImage === image.url}
            >
              <img
                src={image.url}
                alt=""
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.opacity = "0";
                }}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default ProductGallery;
