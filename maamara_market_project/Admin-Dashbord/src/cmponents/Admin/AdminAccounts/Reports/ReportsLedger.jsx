import React from "react";
import { IonIcon } from "@ionic/react";
import { cashOutline, arrowDownOutline, bookOutline, walletOutline } from "ionicons/icons";
import useDashboardData from "../../../Hooks/AccountSummary/AccountSummaryHook";

export default function MonthlyReport() {
  const { data, loading, error } = useDashboardData();
  const summary = data.summary || {};
  const paymentsForVendors = Number(data.payments?.Vendors || 0);

  const formatKES = (value) => "KES " + Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return <div className="h-32 animate-pulse rounded-2xl bg-muted" />;
  if (error) return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">Error loading financial summary.</div>;

  const cards = [
    { title: "Income", icon: cashOutline, amount: summary.income?.amount, comparison: summary.income?.comparison, tone: "bg-green-500/10 text-green-600 dark:text-green-300" },
    { title: "Expenses", icon: arrowDownOutline, amount: summary.expenses?.amount, comparison: summary.expenses?.comparison, tone: "bg-orange-500/10 text-orange-600 dark:text-orange-300" },
    { title: "Cashbook", icon: bookOutline, amount: summary.cashbook?.amount, comparison: summary.cashbook?.comparison, tone: "bg-primary/10 text-primary" },
    { title: "Vendor Payments", icon: walletOutline, amount: paymentsForVendors, comparison: "Payments for this month", tone: "bg-purple-500/10 text-purple-600 dark:text-purple-300" },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
      <div className="mb-4"><h2 className="text-base font-bold text-card-foreground sm:text-lg">Financial Summary</h2><p className="text-xs text-muted-foreground">Income, expenses, cashbook and vendor payments.</p></div>
      <div className="grid grid-cols-1 gap-3">
        {cards.map((card) => (
          <article key={card.title} className="min-w-0 rounded-xl border border-border bg-background p-4 text-center">
            <div className="flex w-full flex-col items-center justify-center">
              <div className={"flex h-10 w-10 items-center justify-center rounded-xl " + card.tone}>
                <IonIcon icon={card.icon} className="text-lg" />
              </div>
              <div className="mt-2 flex w-full items-center justify-center gap-2">
                <p className="text-xs font-semibold text-muted-foreground">{card.title}</p>
                <span className={"rounded-full px-2 py-1 text-[9px] font-bold " + card.tone}>KES</span>
              </div>
            </div>
            <p className="mt-3 break-words text-lg font-bold tracking-tight text-card-foreground">{formatKES(card.amount)}</p>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{card.comparison || "No comparison available"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
