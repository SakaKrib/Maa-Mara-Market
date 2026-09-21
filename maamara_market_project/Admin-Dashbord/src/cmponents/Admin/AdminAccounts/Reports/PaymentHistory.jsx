import React, { useCallback, useEffect, useState } from "react";
import { IonIcon } from "@ionic/react";
import { addCircleOutline, calendarOutline } from "ionicons/icons";
import AddPaymentModal from "./AddPaymentModal";
import api from "../../../../Services/Api";

const badge = {
  Vendors: "bg-primary/10 text-primary",
  Staffs: "bg-red-500/10 text-red-600 dark:text-red-300",
  "KRA Licenses": "bg-orange-500/10 text-orange-600 dark:text-orange-300",
  Refund: "bg-green-500/10 text-green-600 dark:text-green-300",
  Training: "bg-teal-500/10 text-teal-600 dark:text-teal-300",
  Subscriptions: "bg-purple-500/10 text-purple-600 dark:text-purple-300",
  Rent: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
};

const formatKES = (value) =>
  "KES " +
  Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
};

export default function FastPayment({
  selectedDate = "",
  data = {},
  loading = false,
  error = null,
  refetch,
}) {
  const [openModal, setOpenModal] = useState(false);
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await api.get("/api/transactions/history/", {
        params: selectedDate ? { date: selectedDate } : undefined,
        withCredentials: true,
      });
      setHistory(Array.isArray(response.data?.results) ? response.data.results : []);
    } catch (err) {
      setHistoryError(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          "Unable to load payment history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleAddPayment = async (form) => {
    setNotice("");
    try {
      await api.post("/api/transactions/", form, { withCredentials: true });
      await Promise.all([refetch?.(true), fetchHistory()]);
      setNotice("Bookkeeping entry added successfully.");
    } catch (err) {
      setNotice(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          "Failed to add bookkeeping entry."
      );
      throw err;
    }
  };

  const payments = data?.payments || {};

  return (
    <section className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-card-foreground sm:text-lg">Payment Summary</h2>
          <p className="text-xs text-muted-foreground">
            Manual bookkeeping categories and the recorded transaction history.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpenModal(true)}
          className="flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-xl border border-border bg-background text-primary transition hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/20"
          aria-label="Add bookkeeping payment"
          title="Add bookkeeping payment"
        >
          <IonIcon icon={addCircleOutline} className="text-2xl" />
        </button>
      </div>

      {notice && (
        <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
          Error loading payment totals.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(payments).map(([title, amount]) => {
            const numericAmount = Number(amount);
            if (!Number.isFinite(numericAmount)) return null;
            return (
              <div key={title} className="min-w-0 rounded-xl border border-border bg-background p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className={"h-2.5 w-2.5 shrink-0 rounded-full " + (badge[title] || "bg-muted")} />
                  <p className="truncate text-xs font-semibold text-card-foreground">{title}</p>
                </div>
                <p className="mt-2 text-sm font-bold text-primary">{formatKES(numericAmount)}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 border-t border-border pt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-card-foreground">Recorded Payment History</h3>
            <p className="text-xs text-muted-foreground">
              {selectedDate ? `Entries recorded on ${selectedDate}.` : "Most recent ledger and payment records."}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            <IonIcon icon={calendarOutline} />
            <span>{selectedDate || "All recent dates"}</span>
          </div>
        </div>

        {historyLoading ? (
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
        ) : historyError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
            {historyError}
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background p-6 text-center">
            <p className="text-sm font-semibold text-card-foreground">No payment records found.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a bookkeeping entry or choose another date.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Method</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((item) => (
                    <tr key={item.id} className="bg-background">
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(item.created_at)}</td>
                      <td className="px-4 py-3 font-semibold text-card-foreground">{item.category || "Payment"}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{item.payment_method || "—"}</td>
                      <td className="px-4 py-3 font-bold text-card-foreground">{formatKES(item.amount)}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{item.status || "—"}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{item.txid || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {history.map((item) => (
                <article key={item.id} className="bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-card-foreground">{item.category || "Payment"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-primary">{formatKES(item.amount)}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Method</p>
                      <p className="mt-1 font-semibold capitalize text-card-foreground">{item.payment_method || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="mt-1 font-semibold capitalize text-card-foreground">{item.status || "—"}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>

      <AddPaymentModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSubmit={handleAddPayment}
      />
    </section>
  );
}
