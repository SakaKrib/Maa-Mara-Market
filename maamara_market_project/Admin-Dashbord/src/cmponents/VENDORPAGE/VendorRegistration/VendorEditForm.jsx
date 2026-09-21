import React from "react";
import { Button } from "../../../../components/ui/button";

export default function VendorEditForm({
  vendor,
  value,
  loading,
  onChange,
  onSave,
  onCancel,
}) {
  if (!vendor) return null;

  return (
    <section className="min-w-0 space-y-3 rounded-[12px] border border-border bg-card p-2 text-card-foreground">
      <div className="flex flex-col gap-2 border-b border-border pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Vendor approval</p>
          <h2 className="text-base font-bold">Edit vendor information</h2>
        </div>
        <Button
          variant="outline"
          onClick={onCancel}
          className="w-full rounded-[12px] border-border bg-transparent px-2 py-2 text-foreground hover:bg-muted sm:w-auto"
        >
          Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {Object.entries(value || {}).map(([key, fieldValue]) => {
          const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

          if (typeof fieldValue === "string" && (fieldValue === "yes" || fieldValue === "no")) {
            return (
              <label
                key={key}
                htmlFor={key}
                className="flex min-h-9 items-center gap-2 rounded-[12px] border border-border bg-muted/40 px-2 py-2 text-sm"
              >
                <input
                  id={key}
                  type="checkbox"
                  checked={fieldValue === "yes"}
                  onChange={(e) =>
                    onChange({ ...value, [key]: e.target.checked ? "yes" : "no" })
                  }
                  className="h-4 w-4 accent-primary"
                />
                <span>{label}</span>
              </label>
            );
          }

          if (
            key.toLowerCase().includes("description") ||
            (typeof fieldValue === "string" && fieldValue.length > 50)
          ) {
            return (
              <div key={key} className="md:col-span-2">
                <label htmlFor={key} className="mb-1 block text-xs font-semibold">
                  {label}
                </label>
                <textarea
                  id={key}
                  value={fieldValue || ""}
                  onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                  placeholder={label}
                  rows={4}
                  className="w-full rounded-[12px] border border-border bg-card px-2 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            );
          }

          if (key === "payment_method") {
            return (
              <div key={key} className="md:col-span-2">
                <label htmlFor={key} className="mb-1 block text-xs font-semibold">
                  {label}
                </label>
                <select
                  id={key}
                  value={fieldValue || ""}
                  onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                  className="w-full rounded-[12px] border border-border bg-card px-2 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select {label}</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
            );
          }

          return (
            <div key={key}>
              <label htmlFor={key} className="mb-1 block text-xs font-semibold">
                {label}
              </label>
              <input
                id={key}
                type={key.toLowerCase().includes("email") ? "email" : "text"}
                value={fieldValue || ""}
                onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                placeholder={label}
                className="w-full rounded-[12px] border border-border bg-card px-2 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-col justify-end gap-2 border-t border-border pt-2 sm:flex-row">
        <Button
          variant="outline"
          onClick={onCancel}
          className="w-full rounded-[12px] border-border bg-transparent px-2 py-2 text-foreground hover:bg-muted sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          disabled={loading}
          onClick={onSave}
          className="w-full rounded-[12px] bg-blue-600 px-2 py-2 text-white hover:bg-blue-700 sm:w-auto"
        >
          Save
        </Button>
      </div>
    </section>
  );
}
