import React from "react";
import AddingNewItem from "../../VENDORPAGE/Products/Forms/AddingNewItem";

export default function AdminEditVendorItemForm({
  initialItem = null,
  vendor = null,
  vendorId = null,
  itemId = null,
  onSave = () => {},
  ...rest
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-600">
          Admin workflow
        </p>
        <h2 className="mt-1 text-sm font-semibold text-card-foreground">
          Edit item as admin
        </h2>
      </div>

      <AddingNewItem
        key={itemId ?? initialItem?.id ?? "admin-edit"}
        initialItem={initialItem}
        vendorId={vendorId ?? vendor?.id ?? initialItem?.vendor_id ?? null}
        vendor={vendor}
        isAdmin
        itemId={itemId ?? initialItem?.id ?? null}
        flow="edit"
        onSave={onSave}
        {...rest}
      />
    </div>
  );
}
