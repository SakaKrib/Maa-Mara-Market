import React, { useMemo } from "react";
import AddingNewItem from "../../VENDORPAGE/Products/Forms/AddingNewItem";

const MEDIA_KEYS = ["url", "image", "file", "path", "src", "image_url", "file_url", "video_url"];

const firstMediaValue = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    for (const key of MEDIA_KEYS) {
      if (value[key]) return firstMediaValue(value[key]);
    }
  }
  return "";
};

const buildItem = (request) => {
  const draftData =
    request?.draft_item && typeof request.draft_item === "object"
      ? request.draft_item
      : {};
  const draftMedia = Array.isArray(request?.draft_media) ? request.draft_media : [];

  const mainMedia = draftMedia.find((asset) => asset.kind === "main");
  const videoMedia = draftMedia.find((asset) => asset.kind === "video");
  const mediaByVariant = new Map(
    draftMedia
      .filter((asset) => asset.kind === "variant" && asset.variant_key)
      .map((asset) => [String(asset.variant_key).toLowerCase(), asset.url])
  );

  const resolvedImage =
    firstMediaValue(mainMedia?.url) ||
    firstMediaValue(draftData.image) ||
    firstMediaValue(request?.image ?? request?.image_url);

  const resolvedVideo =
    firstMediaValue(videoMedia?.url) ||
    firstMediaValue(draftData.video) ||
    firstMediaValue(request?.video ?? request?.video_url);

  const rawVariants =
    draftData.color_variants ||
    draftData.variants ||
    request?.variants ||
    [];

  const variants = rawVariants.map((variant) => {
    const image =
      mediaByVariant.get(String(variant.color).toLowerCase()) ||
      firstMediaValue(variant.color_image) ||
      firstMediaValue(variant.image) ||
      null;

    return { ...variant, image, color_image: image };
  });

  return {
    ...request,
    ...draftData,
    id: request?.id,
    name: draftData.name ?? request?.name ?? "",
    description: draftData.description ?? request?.description ?? "",
    price: draftData.price ?? request?.price ?? 0,
    image: resolvedImage,
    video: resolvedVideo,
    draft_media: draftMedia,
    variants,
    color_variants: variants,
  };
};

export default function AdminApproveVendorRequestForm({
  request = null,
  vendor = null,
  onSave = () => {},
  ...rest
}) {
  const initialItem = useMemo(() => (request ? buildItem(request) : null), [request]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600">
          Admin workflow
        </p>
        <h2 className="mt-1 text-sm font-semibold text-card-foreground">
          Review and approve vendor request
        </h2>
      </div>

      <AddingNewItem
        key={request?.id ?? "admin-approval"}
        initialItem={initialItem}
        vendorId={request?.vendor?.id ?? vendor?.id ?? null}
        vendor={request?.vendor ?? vendor ?? null}
        isAdmin
        approvalMode
        approvalRequestId={request?.id ?? null}
        flow="admin-approve"
        onSave={onSave}
        {...rest}
      />
    </div>
  );
}
