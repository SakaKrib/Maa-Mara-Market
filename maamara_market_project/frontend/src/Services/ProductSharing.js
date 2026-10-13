import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { resolveApiAssetUrl } from "./Api";

const getProductUrl = (itemId) => {
  const isNativeApp =
    Capacitor.isNativePlatform() ||
    import.meta.env.VITE_BUILD_TARGET === "mobile";

  const configuredPublicOrigin = String(import.meta.env.VITE_PUBLIC_SITE_URL || "")
    .trim()
    .replace(/\/+$/, "");

  // Native WebViews use a local origin. Share links must instead target the
  // public storefront so they open the product page outside the installed app.
  const publicOrigin =
    configuredPublicOrigin ||
    (isNativeApp ? "https://maamaramarket.com" : window.location.origin);

  return `${publicOrigin}/item/${encodeURIComponent(String(itemId))}`;
};

const getImageUrl = (image, item) => {
  const candidate =
    image ??
    item?.image?.url ??
    item?.image_url ??
    item?.image ??
    item?.images?.[0]?.url ??
    item?.images?.[0];

  const rawUrl =
    typeof candidate === "string"
      ? candidate
      : candidate?.url || candidate?.image_url || candidate?.src || candidate?.path;

  return rawUrl ? resolveApiAssetUrl(rawUrl) : null;
};

const fetchImageBlob = async (imageUrl) => {
  if (!imageUrl) return null;

  const response = await fetch(imageUrl, { mode: "cors" });
  if (!response.ok) return null;

  const blob = await response.blob();
  const contentType = String(
    blob.type || response.headers.get("content-type") || ""
  )
    .split(";")[0]
    .trim()
    .toLowerCase();

  if (!contentType.startsWith("image/")) return null;

  return {
    blob: blob.type === contentType ? blob : new Blob([blob], { type: contentType }),
    contentType,
  };
};

const getImageExtension = (contentType) => {
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/svg+xml": "svg",
  };

  return extensions[contentType] || "jpg";
};

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const separator = dataUrl.indexOf(",");
      if (separator < 0) {
        reject(new Error("Unable to encode the product image for sharing."));
        return;
      }
      resolve(dataUrl.slice(separator + 1));
    };
    reader.onerror = () => reject(reader.error || new Error("Unable to read product image."));
    reader.readAsDataURL(blob);
  });

const createNativeShareImage = async (imageUrl, itemId) => {
  const result = await fetchImageBlob(imageUrl);
  if (!result) return null;

  const extension = getImageExtension(result.contentType);
  const safeItemId = String(itemId || "product").replace(/[^a-z0-9-_]/gi, "-");
  const path = `maa-mara-share-${safeItemId}-${Date.now()}.${extension}`;
  const data = await blobToBase64(result.blob);
  const savedFile = await Filesystem.writeFile({
    path,
    data,
    directory: Directory.Cache,
  });

  if (!savedFile?.uri) {
    try {
      await Filesystem.deleteFile({ path, directory: Directory.Cache });
    } catch {
      // Best-effort cleanup if the plugin didn't return a shareable URI.
    }
    return null;
  }

  return { path, uri: savedFile.uri };
};

const createWebShareFile = async (imageUrl, title) => {
  if (!imageUrl || typeof File === "undefined") return null;

  try {
    const result = await fetchImageBlob(imageUrl);
    if (!result) return null;

    const safeName =
      String(title || "maa-mara-product")
        .trim()
        .replace(/[^a-z0-9-_]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "maa-mara-product";

    return new File(
      [result.blob],
      `${safeName}.${getImageExtension(result.contentType)}`,
      { type: result.contentType }
    );
  } catch {
    // Cross-origin media may not permit fetching the image as a blob. Link
    // sharing remains available if a share target cannot receive the file.
    return null;
  }
};

const isShareCancelled = (error) => error?.name === "AbortError";

const shareNativeProduct = async ({ item, title, text, url, imageUrl }) => {
  let temporaryImage = null;

  try {
    try {
      temporaryImage = await createNativeShareImage(imageUrl, item.id);
    } catch {
      // Do not block sharing when media CORS/network rules prevent a local copy.
      temporaryImage = null;
    }

    const options = {
      title,
      text: `${text}\n${url}`,
      url,
      dialogTitle: "Share product",
      ...(temporaryImage?.uri ? { files: [temporaryImage.uri] } : {}),
    };

    try {
      await Share.share(options);
      return true;
    } catch (error) {
      if (isShareCancelled(error)) return true;

      // Some targets/platforms do not accept an image together with a URL.
      // Retry with the same public link and text before falling back to web.
      if (temporaryImage?.uri) {
        try {
          await Share.share({
            title,
            text: `${text}\n${url}`,
            url,
            dialogTitle: "Share product",
          });
          return true;
        } catch (fallbackError) {
          if (isShareCancelled(fallbackError)) return true;
        }
      }

      return false;
    }
  } finally {
    if (temporaryImage?.path) {
      try {
        await Filesystem.deleteFile({
          path: temporaryImage.path,
          directory: Directory.Cache,
        });
      } catch {
        // Cache cleanup is best-effort; a failed cleanup must not block sharing.
      }
    }
  }
};

const shareOnWeb = async ({ title, text, url, imageUrl }) => {
  try {
    if (typeof navigator.share === "function") {
      const file = await createWebShareFile(imageUrl, title);
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
          // Do not reopen the share sheet if the user intentionally dismissed it.
          if (isShareCancelled(error)) return;
          // Some targets/platforms reject files; retry with the product link.
        }
      }

      await navigator.share({ title, text, url });
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
  } catch (error) {
    // Dismissing the share sheet is a normal user action.
    if (!isShareCancelled(error)) {
      console.error("Unable to share product", error);
    }
  }
};

export const shareProduct = async ({ item, image }) => {
  if (!item?.id || typeof window === "undefined") return;

  const title = String(item.name || "Maa Mara Market product");
  const url = getProductUrl(item.id);
  const text = `Check out ${title} on Maa Mara Market.`;
  const imageUrl = getImageUrl(image, item);

  try {
    if (Capacitor.isNativePlatform()) {
      const handled = await shareNativeProduct({
        item,
        title,
        text,
        url,
        imageUrl,
      });

      if (handled) return;
    }

    await shareOnWeb({ title, text, url, imageUrl });
  } catch (error) {
    if (!isShareCancelled(error)) {
      console.error("Unable to share product", error);
    }
  }
};
