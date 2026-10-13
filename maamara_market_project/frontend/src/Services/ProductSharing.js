import { resolveApiAssetUrl } from "./Api";

const getProductUrl = (itemId) => {
  const isNativeApp =
    typeof window !== "undefined" &&
    (Boolean(window.Capacitor?.isNativePlatform?.()) ||
      import.meta.env.VITE_BUILD_TARGET === "mobile");

  const configuredPublicOrigin = String(import.meta.env.VITE_PUBLIC_SITE_URL || "")
    .trim()
    .replace(/\/+$/, "");

  // A native WebView's origin is local (for example capacitor://localhost),
  // so shared product links must point to the public storefront instead.
  const publicOrigin =
    configuredPublicOrigin ||
    (isNativeApp ? "https://maamaramarket.com" : window.location.origin);

  return `${publicOrigin}/item/${itemId}`;
};

const createImageFile = async (imageUrl, title) => {
  if (!imageUrl || typeof File === "undefined") return null;

  try {
    const response = await fetch(resolveApiAssetUrl(imageUrl), { mode: "cors" });
    if (!response.ok) return null;

    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;

    const extension = blob.type.split("/")[1]?.split("+")[0] || "jpg";
    const safeName = String(title || "maa-mara-product")
      .trim()
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "maa-mara-product";

    return new File([blob], `${safeName}.${extension}`, { type: blob.type });
  } catch {
    // Remote media may not permit cross-origin downloads. Link sharing remains
    // available in that case.
    return null;
  }
};

export const shareProduct = async ({ item, image }) => {
  if (!item?.id || typeof window === "undefined") return;

  const title = String(item.name || "Maa Mara Market product");
  const url = getProductUrl(item.id);
  const text = `Check out ${title} on Maa Mara Market.`;

  try {
    if (typeof navigator.share === "function") {
      const file = await createImageFile(image, title);
      let canShareImage = false;

      if (file && typeof navigator.canShare === "function") {
        try {
          canShareImage = navigator.canShare({ files: [file] });
        } catch {
          canShareImage = false;
        }
      }

      if (canShareImage) {
        try {
          await navigator.share({ title, text, url, files: [file] });
          return;
        } catch (error) {
          // Don't reopen the share sheet if the user intentionally dismissed it.
          if (error?.name === "AbortError") return;
          // Some share targets/platforms reject files; retry with the product link.
        }
      }

      await navigator.share({ title, text, url });
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
  } catch (error) {
    // Dismissing the native share sheet is a normal user action.
    if (error?.name !== "AbortError") {
      console.error("Unable to share product", error);
    }
  }
};
