import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Landmark, Pencil, Save } from "lucide-react";
import api from "../../Services/Api";
import NativeAwareSelect from "../../components/NativeAwareSelect";

const EMPTY = {
  payment_method: "BANK_TRANSFER", bank_name: "", bank_branch: "", bank_account_name: "",
  bank_account_number: "", bank_swift_code: "", bank_iban: "", bank_country: "", bank_currency: "",
  intermediary_bank_name: "", intermediary_swift_code: "", mpesa_type: "", mpesa_number: "",
  mpesa_till: "", mpesa_paybill: "", mpesa_paybill_account: "", paypal_email: "", tax_number: "",
};

const MASKED_KEYS = ["bank_account_number", "bank_iban", "mpesa_number", "mpesa_till", "mpesa_paybill", "mpesa_paybill_account"];
const maskValue = (value) => {
  const text = String(value || "");
  return text.length > 4 ? `${"•".repeat(Math.min(text.length - 4, 8))}${text.slice(-4)}` : text;
};

const DESTINATION_KEYS = Object.keys(EMPTY).filter((key) => key !== "tax_number");
const inputClass = "w-full rounded-xl border border-[#e6e6e4] bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10";

const formatDate = (iso) => {
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); } catch { return iso; }
};

export default function VendorPaymentDetails() {
  const [saved, setSaved] = useState(EMPTY);
  const [form, setForm] = useState(EMPTY);
  const [meta, setMeta] = useState({ hold_hours: 48, hold_until: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const apply = (data) => {
    const values = { ...EMPTY };
    Object.keys(EMPTY).forEach((key) => { values[key] = data?.[key] ?? ""; });
    setSaved(values);
    setForm(values);
    setMeta({ hold_hours: data?.hold_hours ?? 48, hold_until: data?.hold_until ?? null });
  };

  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    api.get("/api/vendor/payment-details/", { withCredentials: true })
      .then((res) => { if (active) { apply(res.data); setError(""); } })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load payment details:", { status: err.response?.status, data: err.response?.data, message: err.message });
        setLoadFailed(true);
        const status = err.response?.status;
        setError(
          status === 401 || status === 403
            ? "Your session could not be verified. Please sign in again."
            : status
              ? `We could not load your payment details (server returned ${status}). Please try again.`
              : "We could not reach the server to load your payment details. Check your connection and try again."
        );
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);

  const destinationChanged = useMemo(
    () => DESTINATION_KEYS.some((key) => String(form[key] || "").trim() !== String(saved[key] || "").trim()),
    [form, saved]
  );
  const dirty = destinationChanged || form.tax_number !== saved.tax_number;

  const set = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setMessage("");
  };

  const input = (label, key, props = {}) => (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</span>
      <input
        value={!editing && MASKED_KEYS.includes(key) ? maskValue(form[key]) : form[key]}
        onChange={set(key)}
        readOnly={!editing}
        tabIndex={editing ? undefined : -1}
        className={`${inputClass} ${editing ? "" : "cursor-default bg-gray-50 text-gray-700 focus:border-[#e6e6e4] focus:ring-0"}`}
        {...props}
      />
      {fieldErrors[key] && <span className="mt-1 block text-[11px] text-red-600">{fieldErrors[key]}</span>}
    </label>
  );

  const submit = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await api.patch("/api/vendor/payment-details/", form, { withCredentials: true });
      apply(res.data);
      setMessage(res.data?.detail || "Payment details saved.");
      setConfirming(false);
      setEditing(false);
    } catch (err) {
      setConfirming(false);
      setFieldErrors(err.response?.data?.errors || {});
      setError(err.response?.data?.detail || "Could not save your payment details.");
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (saving || !editing || !dirty) return;
    if (destinationChanged) setConfirming(true);
    else submit();
  };

  const method = form.payment_method;
  const holdActive = meta.hold_until && new Date(meta.hold_until) > new Date();

  return (
    <div className="rounded-2xl border border-[#e6e6e4] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-3 border-b border-[#e6e6e4] pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#2563eb]"><Landmark size={17} /></div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Payment details</h2>
          <p className="mt-1 text-xs text-gray-600">Where your payouts are sent. Press Edit to change them.</p>
        </div>
      </div>

      {holdActive && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>Your payment details changed recently. Payouts are on hold until {formatDate(meta.hold_until)}.</span>
        </div>
      )}
      {message && <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">{message}</div>}
      {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{error}</div>}

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
      ) : loadFailed ? (
        <button type="button" onClick={() => setReloadKey((n) => n + 1)} className="rounded-full border border-[#e6e6e4] px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100">
          Try again
        </button>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-gray-600">Payment method</span>
            <NativeAwareSelect
              value={method}
              onChange={set("payment_method")}
              disabled={!editing}
              options={[
                { value: "BANK_TRANSFER", label: "Bank transfer" },
                { value: "MOBILE_MONEY", label: "M-Pesa" },
                { value: "PAYPAL", label: "PayPal" },
              ]}
              className={`${inputClass} ${editing ? "" : "cursor-default bg-gray-50 text-gray-700"}`}
            />
            {fieldErrors.payment_method && <span className="mt-1 block text-[11px] text-red-600">{fieldErrors.payment_method}</span>}
          </label>

          {method === "BANK_TRANSFER" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {input("Bank name", "bank_name")}
              {input("Branch", "bank_branch")}
              {input("Account name", "bank_account_name")}
              {input("Account number", "bank_account_number", { inputMode: "numeric" })}
              {input("SWIFT / BIC", "bank_swift_code")}
              {input("IBAN", "bank_iban")}
              {input("Bank country", "bank_country")}
              {input("Currency", "bank_currency")}
              {input("Intermediary bank", "intermediary_bank_name")}
              {input("Intermediary SWIFT", "intermediary_swift_code")}
            </div>
          )}

          {method === "MOBILE_MONEY" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-gray-600">M-Pesa type</span>
                <NativeAwareSelect
                  value={form.mpesa_type}
                  onChange={set("mpesa_type")}
                  disabled={!editing}
                  placeholder="Select type"
                  options={[
                    { value: "", label: "Select type" },
                    { value: "PHONE", label: "Phone number" },
                    { value: "TILL", label: "Till number (Buy Goods)" },
                    { value: "LIPA_NA_MPESA", label: "Paybill" },
                  ]}
                  className={`${inputClass} ${editing ? "" : "cursor-default bg-gray-50 text-gray-700"}`}
                />
                {fieldErrors.mpesa_type && <span className="mt-1 block text-[11px] text-red-600">{fieldErrors.mpesa_type}</span>}
              </label>
              {form.mpesa_type === "PHONE" && input("M-Pesa number", "mpesa_number", { inputMode: "tel", placeholder: "0712345678" })}
              {form.mpesa_type === "TILL" && input("Till number", "mpesa_till", { inputMode: "numeric" })}
              {form.mpesa_type === "LIPA_NA_MPESA" && (
                <>
                  {input("Paybill number", "mpesa_paybill", { inputMode: "numeric" })}
                  {input("Paybill account number", "mpesa_paybill_account", { maxLength: 13 })}
                </>
              )}
            </div>
          )}

          {method === "PAYPAL" && input("PayPal email", "paypal_email", { type: "email" })}

          <div className="border-t border-[#e6e6e4] pt-3">
            {input("Tax number (KRA PIN / VAT)", "tax_number")}
            <span className="mt-1 block text-[11px] text-gray-500">Changing your tax number does not delay payouts.</span>
          </div>

          {editing && destinationChanged && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>You are changing where your payouts go. If a payout date arrives meanwhile, payouts will be postponed for {meta.hold_hours} hours after you save.</span>
            </div>
          )}

          {editing ? (
            <div className="flex gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => { setForm(saved); setFieldErrors({}); setError(""); setEditing(false); }}
                className="flex-1 rounded-full border border-[#e6e6e4] px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button type="submit" disabled={saving || !dirty} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#262626] disabled:opacity-50">
                <Save size={15} /> {saving ? "Saving..." : "Save"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setMessage(""); setEditing(true); }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#262626]"
            >
              <Pencil size={15} /> Edit payment details
            </button>
          )}
        </form>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">Change payout details?</h3>
            <p className="mt-2 text-sm text-gray-600">
              For your security, payouts to new details are held for {meta.hold_hours} hours. If a payout date arrives
              during that time, it will be postponed until the hold ends.
            </p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setConfirming(false)} className="flex-1 rounded-full border border-[#e6e6e4] px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100">Cancel</button>
              <button type="button" onClick={submit} disabled={saving} className="flex-1 rounded-full bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving..." : "Confirm & save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
