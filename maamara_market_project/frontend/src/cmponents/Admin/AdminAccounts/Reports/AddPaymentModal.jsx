import React, { useState } from "react";
import NativeAwareSelect from "../../../../components/NativeAwareSelect";

const initialForm = {
  category: "vendors",
  amount: "",
  payment_method: "mpesa",
};

export default function AddPaymentModal({ open, onClose, onSubmit, editingEntry = null }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (editingEntry) {
      setForm({
        category: editingEntry.category_key || "vendors",
        amount: editingEntry.amount == null ? "" : String(editingEntry.amount),
        payment_method: editingEntry.payment_method || "mpesa",
      });
    } else if (open) {
      setForm(initialForm);
    }
  }, [editingEntry, open]);
  if (!open) return null;

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
      setForm(initialForm);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 sm:p-5" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Accounts</p>
          <h2 className="mt-1 text-xl font-bold text-card-foreground">{editingEntry ? "Edit Bookkeeping Entry" : "Add Bookkeeping Entry"}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-card-foreground">Category</span>
            <NativeAwareSelect
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              options={[
                { value: "vendors", label: "Vendors" },
                { value: "staffs", label: "Staffs" },
                { value: "kra", label: "KRA Licenses" },
                { value: "rent", label: "Rent" },
                { value: "subscriptions", label: "Subscriptions" },
                { value: "training", label: "Training" },
                { value: "refund", label: "Refund" },
              ]}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-card-foreground">Amount (KES)</span>
            <input name="amount" type="number" min="0.01" step="0.01" required value={form.amount} onChange={handleChange} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-card-foreground">Payment Method</span>
            <NativeAwareSelect
              name="payment_method"
              value={form.payment_method}
              onChange={handleChange}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              options={[
                { value: "mpesa", label: "M-Pesa" },
                { value: "paypal", label: "PayPal" },
              ]}
            />
          </label>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-card-foreground hover:bg-muted disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving..." : editingEntry ? "Update Entry" : "Save Entry"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
