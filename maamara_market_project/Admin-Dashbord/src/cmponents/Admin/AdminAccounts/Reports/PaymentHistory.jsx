import React, { useState } from "react";
import { IonIcon } from "@ionic/react";
import { addCircleOutline } from "ionicons/icons";
import useDashboardData from "../../../Hooks/AccountSummary/AccountSummaryHook";
import AddPaymentModal from "./AddPaymentModal";
import api from "../../../../Services/Api";

export default function FastPayment() {
  const [openModal, setOpenModal] = useState(false);
  const [notice, setNotice] = useState("");
  const { data, loading, error, refetch } = useDashboardData();

  const payments = data?.payments || {};
  const badge = {
    Vendors: "bg-primary/10 text-primary",
    Staffs: "bg-red-500/10 text-red-600 dark:text-red-300",
    "KRA Licenses": "bg-orange-500/10 text-orange-600 dark:text-orange-300",
    Refund: "bg-green-500/10 text-green-600 dark:text-green-300",
    Training: "bg-teal-500/10 text-teal-600 dark:text-teal-300",
    Subscriptions: "bg-purple-500/10 text-purple-600 dark:text-purple-300",
    Rent: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  };

  const handleAddPayment = async (form) => {
    setNotice("");
    try {
      await api.post("/api/transactions/", form, { withCredentials: true });
      await refetch();
      setNotice("Payment added successfully.");
    } catch (err) {
      setNotice(err?.response?.data?.error || err?.response?.data?.detail || "Failed to add payment.");
      throw err;
    }
  };

  return (
    <section className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-bold text-card-foreground sm:text-lg">Payments Summary</h2>
        <p className="text-xs text-muted-foreground">Manual ledger categories and current totals.</p>
      </div>

      {notice && <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary">{notice}</div>}
      {loading ? (
        <div className="flex gap-3"><div className="h-14 w-14 animate-pulse rounded-xl bg-muted" /><div className="h-14 w-40 animate-pulse rounded-xl bg-muted" /></div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">Error loading payment totals.</div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setOpenModal(true)} className="grid h-14 w-14 place-items-center rounded-xl border border-border bg-background text-primary transition hover:bg-primary/5" aria-label="Add payment">
            <IonIcon icon={addCircleOutline} className="text-2xl" />
          </button>

          {Object.entries(payments).map(([title, amount]) => {
            const numericAmount = Number(amount);
            if (!Number.isFinite(numericAmount) || numericAmount <= 0) return null;
            return (
              <div key={title} className="min-w-[145px] rounded-xl border border-border bg-background p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className={"h-2.5 w-2.5 rounded-full " + (badge[title] || "bg-muted")} />
                  <p className="text-xs font-semibold text-card-foreground">{title}</p>
                </div>
                <p className="mt-2 text-sm font-bold text-primary">KES {numericAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p>
              </div>
            );
          })}
        </div>
      )}

      <AddPaymentModal open={openModal} onClose={() => setOpenModal(false)} onSubmit={handleAddPayment} />
    </section>
  );
}
