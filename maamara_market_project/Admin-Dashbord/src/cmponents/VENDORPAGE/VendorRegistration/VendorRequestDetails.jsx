import React from "react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import { resolveApiAssetUrl } from "../../../Services/Api";

export default function VendorRequestDetails({
  vendor,
  loading,
  onEditVendor,
  onEditItems,
  onApprove,
  onDeny,
  onBack,
}) {
  if (!vendor) return null;

  return (
    <section className="min-w-0 space-y-3 rounded-[12px] border border-border bg-card p-2 text-card-foreground">
      <div className="flex flex-col gap-2 border-b border-border pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Vendor approval</p>
          <h2 className="truncate text-base font-bold">Vendor details</h2>
          <p className="truncate text-xs text-muted-foreground">
            {vendor.vendor_data?.company_name || vendor.user?.email || "Vendor application"}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onBack}
          className="w-full rounded-[12px] border-border bg-transparent px-2 py-2 text-foreground hover:bg-muted sm:w-auto"
        >
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {vendor.vendor_data &&
          Object.entries(vendor.vendor_data).map(([key, value]) => {
            if (Array.isArray(value) || (typeof value === "object" && value !== null)) return null;
            return (
              <div key={key} className="rounded-[12px] border border-border bg-muted/40 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {key.replace(/_/g, " ")}
                </p>
                <p className="mt-1 break-words text-sm">{String(value)}</p>
              </div>
            );
          })}
      </div>

      {Array.isArray(vendor.item_list) && vendor.item_list.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
            <h3 className="text-sm font-semibold">Items</h3>
            <span className="text-xs text-muted-foreground">{vendor.item_list.length} item(s)</span>
          </div>

          <div className="space-y-2">
            {vendor.item_list.map((item, idx) => (
              <Card key={`${item.name || "item"}-${idx}`} className="rounded-[12px] border border-border bg-card shadow-sm">
                <CardContent className="p-2">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {item.image && (
                      <img
                        src={resolveApiAssetUrl(item.image)}
                        alt={item.name || "Vendor item"}
                        className="h-24 w-24 shrink-0 rounded-[12px] border border-border object-cover"
                      />
                    )}
                    <div className="min-w-0 space-y-1 text-sm">
                      {Object.entries(item).map(([itemKey, itemValue]) =>
                        itemKey === "image" ? null : (
                          <p key={itemKey} className="break-words text-muted-foreground">
                            <strong className="text-card-foreground">{itemKey.replace(/_/g, " ")}:</strong>{" "}
                            {typeof itemValue === "object" && itemValue !== null
                              ? JSON.stringify(itemValue)
                              : String(itemValue)}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-2 border-t border-border pt-2 sm:grid-cols-2 lg:grid-cols-5">
        <Button
          variant="outline"
          onClick={onEditVendor}
          className="w-full rounded-[12px] border-border bg-card px-2 py-2 text-foreground hover:bg-muted"
        >
          Edit vendor info
        </Button>
        <Button
          variant="outline"
          onClick={onEditItems}
          className="w-full rounded-[12px] border-border bg-card px-2 py-2 text-foreground hover:bg-muted"
        >
          Edit item list
        </Button>
        <Button
          disabled={loading}
          onClick={onApprove}
          className="w-full rounded-[12px] bg-blue-600 px-2 py-2 text-white hover:bg-blue-700"
        >
          Approve
        </Button>
        <Button
          disabled={loading}
          variant="destructive"
          onClick={onDeny}
          className="w-full rounded-[12px] px-2 py-2"
        >
          Deny
        </Button>
        <Button
          onClick={onBack}
          className="w-full rounded-[12px] border border-border bg-transparent px-2 py-2 text-foreground hover:bg-muted"
        >
          Close
        </Button>
      </div>
    </section>
  );
}
