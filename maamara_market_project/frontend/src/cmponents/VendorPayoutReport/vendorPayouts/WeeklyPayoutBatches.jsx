import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../Services/Api";
import AppSnackbar from "../../../../components/ui/app-snackbar";
import { useConfirmDialog } from "../../../../components/ui/confirm-dialog";
import { PayoutPage, PAYOUTS_HOME } from "./PayoutScreens";

const formatKes = (value) =>
  `KES ${Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const errorText = (err, fallback) => err?.response?.data?.error || err?.response?.data?.detail || fallback;

const STATUS_LABEL = {
  DRAFT: "Draft - awaiting audit",
  AUDITED: "Audited - awaiting a different admin to approve",
  APPROVED: "Approved - payouts may be sent",
};

const SEND_ROUTE = {
  MOBILE_MONEY: "mpesa-payment/single-vendor",
  PAYPAL: "paypal-payment/single-vendor",
  BANK_TRANSFER: "bank-transfer-payment-group",
};

const formatWhen = (iso) =>
  iso ? new Date(iso).toLocaleString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "short" }) : "";

function Chip({ tone, children }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    muted: "bg-muted text-muted-foreground",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export default function WeeklyPayoutBatches() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, enabled: false, batches: [] });
  const [busy, setBusy] = useState("");
  const [confirm, confirmNode] = useConfirmDialog();
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  const notify = (message, severity) => setSnackbar({ open: true, message, severity });

  const load = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/payout-batches/");
      setState({ loading: false, enabled: !!res.data.enabled, batches: res.data.batches || [] });
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false }));
      notify(errorText(err, "Could not load weekly payout batches."), "error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (key, request, success, confirmOptions) => {
    if (confirmOptions && !(await confirm(confirmOptions))) return;
    setBusy(key);
    try {
      await request();
      notify(success, "success");
      await load();
    } catch (err) {
      notify(errorText(err, "That action failed."), "error");
    } finally {
      setBusy("");
    }
  };

  const createLastWeek = () =>
    act("create", () => api.post("/api/admin/payout-batches/create/", {}), "Weekly batch created.");

  return (
    <PayoutPage
      title="Weekly payout batches"
      subtitle="Items become payable once the customer accepted them or the 72-hour window passed with no issue. One admin audits a batch and a different admin approves it before any payout can be sent."
    >
      {!state.loading && !state.enabled && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Weekly payouts are switched off on the server, so batches cannot be created. Payouts remain monthly.
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={createLastWeek}
          disabled={!state.enabled || busy === "create"}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "create" ? "Creating…" : "Create last week's batch"}
        </button>
      </div>

      {confirmNode}
      {state.loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!state.loading && state.batches.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">No weekly batches yet.</p>
      )}

      {state.batches.map((batch) => (
        <article key={batch.id} className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-card-foreground">
                Week {batch.week_start} to {batch.week_end}
              </h2>
              <p className="text-xs text-muted-foreground">Cutoff {formatWhen(batch.cutoff_at)} (Nairobi)</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-card-foreground">{formatKes(batch.total)}</p>
              <p className="text-xs font-semibold text-muted-foreground">{STATUS_LABEL[batch.status] || batch.status}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Created by {batch.created_by || "-"}
            {batch.audited_by ? ` · Audited by ${batch.audited_by}` : ""}
            {batch.approved_by ? ` · Approved by ${batch.approved_by}` : ""}
          </p>

          <ul className="divide-y divide-border rounded-xl border border-border">
            {batch.payouts.length === 0 && <li className="p-3 text-sm text-muted-foreground">No payable items.</li>}
            {batch.payouts.map((row) => (
              <li key={row.payout_reference} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-card-foreground">{row.vendor}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.items} item{row.items === 1 ? "" : "s"} · {formatKes(row.amount)} · {row.payment_method?.replace("_", " ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {row.paid ? (
                    <Chip tone="green">Paid (provider confirmed)</Chip>
                  ) : row.submitted ? (
                    <Chip tone="amber">Submitted - awaiting provider</Chip>
                  ) : (
                    <Chip tone="muted">Not sent</Chip>
                  )}
                  {batch.status === "APPROVED" && !row.paid && !row.submitted && SEND_ROUTE[row.payment_method] && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`${PAYOUTS_HOME}/${SEND_ROUTE[row.payment_method]}?reference=${encodeURIComponent(row.payout_reference)}`)
                      }
                      className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-card-foreground transition hover:bg-muted"
                    >
                      Review &amp; send
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {batch.skipped?.length > 0 && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer font-semibold">{batch.skipped.length} item(s) not included</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {batch.skipped.map((entry, index) => (
                  <li key={index}>
                    {entry.order_item ? `Order item ${entry.order_item}` : `Vendor ${entry.vendor}`}: {entry.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {batch.status === "DRAFT" && (
              <button
                type="button"
                disabled={busy === `audit-${batch.id}`}
                onClick={() =>
                  act(
                    `audit-${batch.id}`,
                    () => api.post(`/api/admin/payout-batches/${batch.id}/audit/`),
                    "Batch audited.",
                    {
                      title: "Mark this batch as audited?",
                      subtitle: `Week ${batch.week_start} to ${batch.week_end}`,
                      rows: [["Total", formatKes(batch.total)], ["Vendors", String(batch.payouts.length)]],
                      note: "Confirm you have reviewed every vendor and amount in this batch. A different admin must approve it next.",
                      confirmLabel: "Mark audited",
                    },
                  )
                }
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                Mark audited
              </button>
            )}
            {batch.status === "AUDITED" && (
              <button
                type="button"
                disabled={busy === `approve-${batch.id}`}
                onClick={() =>
                  act(
                    `approve-${batch.id}`,
                    () => api.post(`/api/admin/payout-batches/${batch.id}/approve/`),
                    "Batch approved.",
                    {
                      title: "Approve this batch?",
                      subtitle: `Week ${batch.week_start} to ${batch.week_end}`,
                      rows: [["Total", formatKes(batch.total)], ["Vendors", String(batch.payouts.length)]],
                      note: "Its payouts can then be sent. You cannot approve a batch you audited yourself.",
                      confirmLabel: "Approve batch",
                    },
                  )
                }
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                Approve batch
              </button>
            )}
          </div>
        </article>
      ))}

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </PayoutPage>
  );
}
