import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { resolveApiAssetUrl } from "./Api";

// Keep native sharing responsive and ensure only the latest pending product request opens.
const SHARE_IMAGE_PREPARATION_TIMEOUT_MS = 1200;
let latestShareRequestId = 0;
let pendingNativePreparationController = null;
let nativeShareDialogOpen = false;

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

const fetchImageBlob = async (imageUrl, signal) => {
  if (!imageUrl || signal?.aborted) return null;

  const response = await fetch(imageUrl, { mode: "cors", signal });
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

const createNativeShareImage = async (imageUrl, itemId, signal) => {
  const result = await fetchImageBlob(imageUrl, signal);
  if (!result || signal?.aborted) return null;

  const extension = getImageExtension(result.contentType);
  const safeItemId = String(itemId || "product").replace(/[^a-z0-9-_]/gi, "-");
  const path = `maa-mara-share-${safeItemId}-${Date.now()}.${extension}`;
  const data = await blobToBase64(result.blob);
  if (signal?.aborted) return null;

  const savedFile = await Filesystem.writeFile({
    path,
    data,
    directory: Directory.Cache,
  });

  if (signal?.aborted) {
    try {
      await Filesystem.deleteFile({ path, directory: Directory.Cache });
    } catch {
      // Best-effort cleanup when a newer share request supersedes this one.
    }
    return null;
  }

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

const shareNativeProduct = async ({
  item,
  title,
  text,
  url,
  imageUrl,
  requestId,
}) => {
  let temporaryImage = null;
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    SHARE_IMAGE_PREPARATION_TIMEOUT_MS
  );

  // A tap on another product supersedes image preparation for the previous one.
  pendingNativePreparationController?.abort();
  pendingNativePreparationController = controller;

  try {
    try {
      temporaryImage = await createNativeShareImage(imageUrl, item.id, controller.signal);
    } catch {
      // The image is optional: network/CORS/filesystem issues must not block sharing.
      temporaryImage = null;
    }

    if (requestId !== latestShareRequestId) return false;

    const options = {
      title,
      text: `${text}\n${url}`,
      url,
      dialogTitle: "Share product",
      ...(temporaryImage?.uri ? { files: [temporaryImage.uri] } : {}),
    };

    // Never open a second native dialog while one is already active.
    if (nativeShareDialogOpen) return false;

    nativeShareDialogOpen = true;
    try {
      await Share.share(options);
    } catch (error) {
      // Do not retry with a second dialog: a rejected native call may already
      // have opened the system share sheet on some Android versions.
      if (!isShareCancelled(error)) {
        console.error("Unable to open native product sharing", error);
      }
    } finally {
      nativeShareDialogOpen = false;
    }

    // Once Share.share has been attempted, don't fall through to web sharing.
    return true;
  } finally {
    clearTimeout(timeoutId);
    if (pendingNativePreparationController === controller) {
      pendingNativePreparationController = null;
    }
    if (temporaryImage?.path) {
      try {
        await Filesystem.deleteFile({
          path: temporaryImage.path,
          directory: Directory.Cache,
        });
      } catch {
        // Cache cleanup is best-effort and must not block sharing.
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
  if (!item?.id || typeof window === "undefined") return false;

  // Ignore taps while the system share sheet is already open. During image
  // preparation, a newer tap is allowed to replace the older pending product.
  if (Capacitor.isNativePlatform() && nativeShareDialogOpen) return false;

  const requestId = ++latestShareRequestId;
  const title = String(item.name || "Maa Mara Market product");
  const url = getProductUrl(item.id);
  const text = `Check out ${title} on Maa Mara Market.`;
  const imageUrl = getImageUrl(image, item);

  try {
    if (Capacitor.isNativePlatform()) {
      await shareNativeProduct({
        item,
        title,
        text,
        url,
        imageUrl,
        requestId,
      });
      return true;
    }

    await shareOnWeb({ title, text, url, imageUrl });
    return true;
  } catch (error) {
    if (!isShareCancelled(error)) {
      console.error("Unable to share product", error);
    }
    return false;
  }
};
