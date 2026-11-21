import { useMemo, useState } from "react";
import { IonIcon } from "@ionic/react";
import { chevronDownOutline, chevronUpOutline, downloadOutline } from "ionicons/icons";

const METHOD_LABELS = { MOBILE_MONEY: "M-Pesa", PAYPAL: "PayPal", BANK_TRANSFER: "Bank transfer" };

const STATUS = {
  paid: { label: "Paid", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  submitted: { label: "Awaiting confirmation", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  blocked: { label: "Needs attention", cls: "bg-destructive/10 text-destructive" },
  ready: { label: "Unpaid", cls: "bg-muted text-muted-foreground" },
};

const kes = (value) =>
  Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const stateOf = (payout) => (payout.payout_status ? "paid" : payout.review?.state || "ready");

// Spreadsheet apps run text starting with = + - @ as formulas: neutralise it.
const csvCell = (value) => {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};

export default function PayoutReviewTable({ groups, period }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");

  // Every vendor with something to be paid this period, whatever the payment method.
  const rows = useMemo(
    () =>
      groups
        .flatMap(([method, payouts]) =>
          payouts.map((payout) => {
            const vendor = payout.vendor_details || payout.vendor || {};
            const state = stateOf(payout);
            return {
              reference: payout.reference,
              company: vendor.company_name || vendor.name || "Unknown vendor",
              method: METHOD_LABELS[method] || method,
              destination: payout.review?.destination?.summary || "",
              amount: Number(payout.amount || 0),
              state,
            };
          })
        )
        .filter((row) => row.amount > 0)
        .sort((a, b) => a.company.localeCompare(b.company)),
    [groups]
  );

  const shown = filter === "all" ? rows : rows.filter((row) => (filter === "paid" ? row.state === "paid" : row.state !== "paid"));
  const sum = (list) => list.reduce((total, row) => total + row.amount, 0);
  const paidRows = rows.filter((row) => row.state === "paid");

  const download = () => {
    const header = ["Company", "Payment method", "Destination", "Amount (KES)", "Status", "Reference", "Period"];
    const lines = [header, ...shown.map((r) => [r.company, r.method, r.destination, r.amount.toFixed(2), STATUS[r.state]?.label || r.state, r.reference, period || ""])];
    const csv = "﻿" + lines.map((line) => line.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `vendor-payouts-${(period || "period").replace(/[^0-9A-Za-z]+/g, "-")}-${filter}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left sm:p-5"
      >
        <span className="min-w-0">
          <span className="block text-base font-bold text-card-foreground">Vendor payout review</span>
          <span className="block text-xs text-muted-foreground">
            {rows.length} vendor{rows.length === 1 ? "" : "s"} with sales this period · KES {kes(sum(rows))} total · {paidRows.length} paid (KES {kes(sum(paidRows))})
          </span>
        </span>
        <IonIcon icon={open ? chevronUpOutline : chevronDownOutline} className="shrink-0 text-lg text-muted-foreground" />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2" role="group" aria-label="Filter by status">
              {[["all", "All"], ["unpaid", "Unpaid"], ["paid", "Paid"]].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    filter === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={download}
              disabled={!shown.length}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              <IonIcon icon={downloadOutline} />
              Download CSV
            </button>
          </div>

          {shown.length ? (
            <div className="max-w-full overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    {["Company", "Method", "Pays to", "Amount (KES)", "Status"].map((heading) => (
                      <th key={heading} className={`px-4 py-3 ${heading.startsWith("Amount") ? "text-right" : ""}`}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shown.map((row) => (
                    <tr key={row.reference}>
                      <td className="px-4 py-3 font-semibold text-card-foreground">{row.company}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.method}</td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">{row.destination || "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{kes(row.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS[row.state]?.cls || STATUS.ready.cls}`}>
                          {STATUS[row.state]?.label || row.state}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/40 text-sm font-bold">
                  <tr>
                    <td className="px-4 py-3" colSpan={3}>Total ({shown.length})</td>
                    <td className="px-4 py-3 text-right tabular-nums">{kes(sum(shown))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No vendors match this filter.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
