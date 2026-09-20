import React, { useEffect, useState } from "react";
import { FileText, Loader2, X } from "lucide-react";
import api from "../../../../../../Services/Api";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

const formatAmount = (amount, currency = "KES") => {
  const numeric = Number(amount || 0);
  return `${currency} ${numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const invoiceTitle = (invoice) =>
  invoice.invoice_type === "vendor_payout" ? "Vendor payout" : "Customer payment";

export default function Invoices({ open: controlledOpen, onClose, compact = false }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isControlled = typeof controlledOpen === "boolean";
  const open = isControlled ? controlledOpen : internalOpen;

  useEffect(() => {
    if (!open) return;

    let active = true;
    setLoading(true);
    setError("");

    api.get("/api/invoices/", { withCredentials: true })
      .then((response) => {
        if (!active) return;
        setInvoices(Array.isArray(response.data?.results) ? response.data.results : []);
      })
      .catch((requestError) => {
        if (!active) return;
        console.error("Invoice fetch failed:", requestError);
        setInvoices([]);
        setError(
          requestError?.response?.status === 401
            ? "Sign in to view invoices."
            : "Invoices could not be loaded right now."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open]);

  const close = () => {
    if (isControlled) {
      onClose?.();
    } else {
      setInternalOpen(false);
    }
  };

  const trigger = (
    <button
      type="button"
      onClick={() => setInternalOpen(true)}
      className={compact
        ? "mm-auth-light-button inline-flex w-full items-center justify-center gap-2"
        : "mm-auth-light-button inline-flex w-full items-center justify-center gap-2"}
    >
      <FileText size={17} />
      Invoices
    </button>
  );

  return (
    <>
      {!isControlled && trigger}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 p-3 sm:items-center">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-[#e5dfd4] bg-[#faf8f4] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e5dfd4] bg-white px-5 py-4">
              <div>
                <p className="text-lg font-semibold text-[#29251f]">Invoices</p>
                <p className="text-xs text-[#6f675c]">Your successful payments and confirmed payouts.</p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-full p-2 text-[#6f675c] hover:bg-[#f1ece3]"
                aria-label="Close invoices"
              >
                <X size={19} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-5">
              {loading ? (
                <div className="flex min-h-32 items-center justify-center">
                  <Loader2 className="animate-spin" size={24} />
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-[#e5dfd4] bg-white p-5 text-sm text-[#6f675c]">
                  {error}
                </div>
              ) : invoices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d8d0c3] bg-white p-7 text-center">
                  <FileText className="mx-auto mb-3 text-[#8a8175]" size={28} />
                  <p className="font-semibold text-[#29251f]">No invoices yet</p>
                  <p className="mt-1 text-sm text-[#6f675c]">
                    An invoice will appear here after a payment or payout is successfully confirmed.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="rounded-2xl border border-[#e5dfd4] bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#29251f]">{invoice.invoice_number}</p>
                          <p className="text-xs text-[#6f675c]">{invoiceTitle(invoice)}</p>
                        </div>
                        <span className="rounded-full bg-[#f6f2ea] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#625b51]">
                          {invoice.status}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <span className="text-[#8a8175]">Amount</span>
                          <p className="font-semibold text-[#29251f]">
                            {formatAmount(invoice.amount, invoice.currency)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[#8a8175]">Payment / provider</span>
                          <p className="font-medium text-[#29251f]">
                            {invoice.provider || "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[#8a8175]">Reference</span>
                          <p className="break-all font-mono text-xs text-[#514a41]">
                            {invoice.provider_reference || invoice.payout_reference || "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[#8a8175]">Issued</span>
                          <p className="text-[#514a41]">{formatDate(invoice.issued_at)}</p>
                        </div>
                      </div>

                      {invoice.order_id && (
                        <p className="mt-3 border-t border-[#eee8de] pt-3 text-xs text-[#6f675c]">
                          Order #{invoice.order_id}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
