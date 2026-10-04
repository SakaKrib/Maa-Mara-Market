import React from "react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import { resolveApiAssetUrl } from "../../../Services/Api";

export default function VendorItemList({ items, onEdit, onBack }) {
  return (
    <section className="min-w-0 space-y-3 rounded-[12px] border border-border bg-card p-2 text-card-foreground">
      <div className="flex flex-col gap-2 border-b border-border pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Vendor approval</p>
          <h2 className="text-base font-bold">Edit item list</h2>
          <p className="text-xs text-muted-foreground">Select an item to edit it without opening another modal.</p>
        </div>
        <Button
          variant="outline"
          onClick={onBack}
          className="w-full rounded-[12px] border-border bg-transparent px-2 py-2 text-foreground hover:bg-muted sm:w-auto"
        >
          Back
        </Button>
      </div>

      {Array.isArray(items) && items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <Card key={index} className="rounded-[12px] border border-border bg-card shadow-sm">
              <CardContent className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1 text-sm">
                  <p className="font-semibold">{item.name || "Untitled item"}</p>
                  <p className="text-muted-foreground">{item.description || "No description provided."}</p>
                  <p><strong>Price:</strong> KES {item.price != null ? Number(item.price).toLocaleString() : "N/A"}</p>
                  {item.image && (
                    <img
                      src={resolveApiAssetUrl(item.image)}
                      alt={item.name || "Vendor item"}
                      className="mt-2 h-24 w-36 rounded-[12px] border border-border bg-muted/40 object-contain p-1"
                    />
                  )}
                </div>
                <Button
                  onClick={() => onEdit(index)}
                  className="w-full rounded-[12px] bg-blue-600 px-2 py-2 text-white hover:bg-blue-700 sm:w-auto"
                >
                  Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-[12px] border border-border bg-muted/40 p-2 text-sm text-muted-foreground">
          No items to edit.
        </div>
      )}
    </section>
  );
}
