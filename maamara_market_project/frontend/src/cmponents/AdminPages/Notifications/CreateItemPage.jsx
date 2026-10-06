import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../../components/ui/button";
import AddingNewItem from "../../VENDORPAGE/Products/Forms/AddingNewItem";
import api from "../../../Services/Api/";

export default function CreateItemPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loadedRequest, setLoadedRequest] = useState(null);

  const stateRequest =
    location.state && typeof location.state === "object" ? location.state : null;

  useEffect(() => {
    let active = true;

    if (stateRequest?.id) {
      setLoadedRequest(stateRequest);
      return () => {
        active = false;
      };
    }

    if (!id) {
      setLoadedRequest(null);
      return () => {
        active = false;
      };
    }

    api
      .get(`/api/admin/vendorDashboard/vendoritemrequest/${id}/`, {
        withCredentials: true,
      })
      .then((response) => {
        if (active) {
          setLoadedRequest(response.data);
        }
      })
      .catch(() => {
        if (active) {
          setLoadedRequest(null);
        }
      });

    return () => {
      active = false;
    };
  }, [id, stateRequest?.id]);

  const request = loadedRequest || stateRequest || {};
  const requestId = request?.id ?? null;

  const item = useMemo(() => {
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

    return {
      ...request,
      ...draftData,
      id: requestId,
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
  }, [request, requestId]);

  const isLoading = Boolean(id) && !requestId;

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
        {isLoading ? (
          <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
            Loading vendor item request...
          </div>
        ) : requestId ? (
          <AddingNewItem
            initialItem={item}
            vendorId={request?.vendor?.id ?? null}
            vendor={request?.vendor ?? null}
            isAdmin
            approvalMode
            approvalRequestId={requestId}
            flow="admin-approve"
            onSave={() => navigate(-1)}
          />
        ) : (
          <div className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">
            Vendor item request could not be loaded.
          </div>
        )}
      </div>
    </section>
  );
}
