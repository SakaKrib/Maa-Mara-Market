import React from "react";
import NativeAwareSelect from "../../../components/NativeAwareSelect";
import { Button } from "../../../../components/ui/button";
import { MEDIA_KEYS, MPESA_TYPE_LABELS, resolveMpesaType } from "./vendorRequestChecks";

const BANK_FIELDS = ["bank_account_number", "bank_name", "bank_branch", "bank_account_name", "bank_swift_code", "bank_iban", "bank_country", "bank_currency", "intermediary_bank_name", "intermediary_swift_code"];
const MPESA_FIELDS = ["mpesa_type", "mpesa_number", "mpesa_till", "mpesa_paybill", "mpesa_paybill_account"];

// Which payment inputs apply to the current payment method / M-Pesa type.
const visiblePaymentKeys = (value) => {
  const method = value?.payment_method;
  if (method === "PAYPAL") return ["paypal_email"];
  if (method === "BANK_TRANSFER") return ["bank_account_number", "bank_name", "bank_branch", "bank_account_name"];
  if (method === "MOBILE_MONEY") {
    const type = resolveMpesaType(value || {});
    const typeKeys = { PHONE: ["mpesa_number"], TILL: ["mpesa_till"], LIPA_NA_MPESA: ["mpesa_paybill", "mpesa_paybill_account"] };
    return ["mpesa_type", ...(typeKeys[type] || [])];
  }
  return [];
};

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
        {(() => {
          const entries = Object.entries(value || {});
          const present = new Set(entries.map(([key]) => key));
          const shown = visiblePaymentKeys(value);
          const paymentKeys = new Set([...BANK_FIELDS, ...MPESA_FIELDS, "paypal_email"]);
          // Keep non-payment fields; show only the payment inputs that apply, adding any that are missing.
          const base = entries.filter(([key]) => !paymentKeys.has(key) && !MEDIA_KEYS.has(key) && key !== "draft_id");
          const extra = shown.map((key) => [key, present.has(key) ? value[key] : ""]);
          return [...base, ...extra];
        })().map(([key, fieldValue]) => {
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
                <NativeAwareSelect
                  id={key}
                  name={key}
                  value={fieldValue || ""}
                  onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                  options={[
                    { value: "", label: `Select ${label}` },
                    { value: "BANK_TRANSFER", label: "Bank Transfer" },
                    { value: "MOBILE_MONEY", label: "M-Pesa" },
                    { value: "PAYPAL", label: "PayPal" },
                  ]}
                  placeholder={`Select ${label}`}
                  className="w-full rounded-[12px] border border-border bg-card px-2 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            );
          }

          if (key === "mpesa_type") {
            return (
              <div key={key}>
                <label htmlFor={key} className="mb-1 block text-xs font-semibold">M-Pesa type</label>
                <NativeAwareSelect
                  id={key}
                  name={key}
                  value={resolveMpesaType(value || {}) || ""}
                  onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                  options={[
                    { value: "", label: "Select M-Pesa type" },
                    ...Object.entries(MPESA_TYPE_LABELS).map(([optionValue, optionLabel]) => ({ value: optionValue, label: optionLabel })),
                  ]}
                  placeholder="Select M-Pesa type"
                  className="w-full rounded-[12px] border border-border bg-card px-2 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
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
