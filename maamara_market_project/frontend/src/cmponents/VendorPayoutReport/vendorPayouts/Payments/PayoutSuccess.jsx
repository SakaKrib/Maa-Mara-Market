import { useCallback, useEffect, useState } from "react";
import { IonIcon } from "@ionic/react";
import { alertCircleOutline, checkmarkCircleOutline } from "ionicons/icons";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../../Services/Api";
import { PayoutPage, ReadOnlyField, PAYOUTS_HOME } from "../PayoutScreens";

const CHECK_EVERY_MS = 5000;

const formatKes = (value) =>
  `KES ${Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// Result page for a payout. It always reads the saved payout from the server, so it is
// correct after a refresh and for every payment method, and keeps checking until the
// provider has confirmed.
export default function PayoutSuccess() {
  const { reference } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/admin/payouts/${encodeURIComponent(reference)}/review/`);
      setItem(res.data);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to load this payout.");
    }
  }, [reference]);

  useEffect(() => {
    load();
  }, [load]);

  const finished = item?.state === "paid";
  useEffect(() => {
    if (finished || error) return undefined;
    const timer = setInterval(load, CHECK_EVERY_MS);
    return () => clearInterval(timer);
  }, [finished, error, load]);

  const failed = !finished && Boolean(item?.provider_failure);
  const tone = finished
    ? { cls: "border-emerald-500/40 bg-emerald-500/5", icon: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", title: "Payment successful" }
    : failed
      ? { cls: "border-destructive/40 bg-destructive/5", icon: "bg-destructive/15 text-destructive", title: "Payment failed" }
      : { cls: "border-amber-500/40 bg-amber-500/5", icon: "bg-amber-500/15 text-amber-700 dark:text-amber-300", title: "Waiting for confirmation" };

  return (
    <PayoutPage title="Payout result" subtitle="The provider's confirmation for this vendor payment.">
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          <p>{error}</p>
          <button type="button" onClick={load} className="mt-3 rounded-full border border-destructive/40 px-3 py-1.5 text-xs font-semibold">
            Try again
          </button>
        </div>
      )}

      {!item && !error && (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading payout…</p>
      )}

      {item && (
        <>
          <article className={`rounded-2xl border p-5 text-center shadow-sm sm:p-6 ${tone.cls}`} role="status">
            <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-3xl ${tone.icon}`}>
              {finished || failed ? (
                <IonIcon icon={finished ? checkmarkCircleOutline : alertCircleOutline} />
              ) : (
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-current/30 border-t-current" />
              )}
            </span>
            <h2 className="mt-3 text-lg font-bold text-card-foreground">{tone.title}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {finished
                ? `${formatKes(item.amount)} was confirmed by ${item.payment_method_label} for ${item.vendor.company_name}.`
                : failed
                  ? item.provider_failure
                  : `${item.payment_method_label} has not confirmed this payment yet. This page updates by itself.`}
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ReadOnlyField label="Vendor" value={item.vendor.company_name} />
              <ReadOnlyField label="Amount" value={formatKes(item.amount)} />
              <ReadOnlyField label="Paid to" value={item.destination.summary} />
              <ReadOnlyField label="Method" value={item.payment_method_label} />
              <ReadOnlyField label="Receipt / transaction ID" value={item.receipt} />
              <ReadOnlyField label="Confirmed at" value={finished ? formatDateTime(item.paid_at) : ""} />
              <ReadOnlyField label="Reference" value={item.reference} />
            </div>
          </article>

          <button
            type="button"
            onClick={() => navigate(PAYOUTS_HOME)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Back to payouts
          </button>
        </>
      )}
    </PayoutPage>
  );
}
