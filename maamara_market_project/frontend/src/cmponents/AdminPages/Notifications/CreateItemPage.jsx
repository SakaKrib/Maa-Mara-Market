import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../../../components/ui/button";
import AddingNewItem from "../../VENDORPAGE/Products/Forms/AddingNewItem";

export default function CreateItemPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const request = location.state || {};
  const draftData =
    request.draft_item && typeof request.draft_item === "object"
      ? request.draft_item
      : {};
  const draftMedia = Array.isArray(request.draft_media) ? request.draft_media : [];
  const mainMedia = draftMedia.find((asset) => asset.kind === "main");
  const mediaByVariant = new Map(
    draftMedia
      .filter((asset) => asset.kind === "variant" && asset.variant_key)
      .map((asset) => [String(asset.variant_key).toLowerCase(), asset.url])
  );

  const item = {
    ...request,
    ...draftData,
    name: draftData.name ?? request.name ?? "",
    description: draftData.description ?? request.description ?? "",
    price: draftData.price ?? request.price ?? 0,
    image: mainMedia?.url ?? draftData.image ?? request.image ?? "",
    draft_media: draftMedia,
    color_variants: (draftData.color_variants || draftData.variants || []).map((variant) => ({
      ...variant,
      color_image:
        mediaByVariant.get(String(variant.color).toLowerCase()) ||
        variant.color_image ||
        variant.image ||
        null,
    })),
  };

  return (
    <section className="min-w-0 space-y-3 rounded-[12px] border border-border bg-card p-2 text-card-foreground">
      <div className="flex flex-col gap-2 border-b border-border pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Marketplace</p>
          <h1 className="text-base font-bold">Create / Edit Item</h1>
          <p className="text-xs text-muted-foreground">
            Review and update the vendor item without opening another modal.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="w-full rounded-[12px] border-border bg-transparent px-2 py-2 text-foreground hover:bg-muted sm:w-auto"
        >
          Back
        </Button>
      </div>

      <div className="min-w-0">
        <AddingNewItem
          initialItem={item}
          vendorId={request?.vendor?.id ?? null}
          vendor={request?.vendor ?? null}
          isAdmin
          approvalMode
          approvalRequestId={request?.id ?? null}
          onSave={() => navigate(-1)}
        />
      </div>
    </section>
  );
}
