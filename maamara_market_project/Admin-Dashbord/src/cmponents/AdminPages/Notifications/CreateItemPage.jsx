import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../../../components/ui/button";
import AdminCreateExistingVendorItems from "../../VENDORPAGE/Products/Forms/CreateItem/AdminCreateItemForExistingVendor";

export default function CreateItemPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const item = location.state || null;

  return (
    <section className="min-h-full min-w-0 space-y-3 rounded-[12px] border border-border bg-card p-2 text-card-foreground">
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
        <AdminCreateExistingVendorItems
          initialItem={item}
          itemId={item?.id ?? null}
          vendorId={item?.vendor?.id ?? null}
          vendor={item?.vendor ?? null}
          onSave={() => navigate(-1)}
        />
      </div>
    </section>
  );
}
