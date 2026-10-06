import React from "react";
import AddingNewItem from "../../VENDORPAGE/Products/Forms/AddingNewItem";

export default function AdminCreateVendorItemForm({
  vendor = null,
  vendorId = null,
  onSave = () => {},
  ...rest
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          Admin workflow
        </p>
        <h2 className="mt-1 text-sm font-semibold text-card-foreground">
          Create item for vendor
        </h2>
      </div>

      <AddingNewItem
        initialItem={null}
        vendorId={vendorId ?? vendor?.id ?? null}
        vendor={vendor}
        isAdmin
        adminCreateNew
        flow="admin-create"
        onSave={onSave}
        {...rest}
      />
    </div>
  );
}
