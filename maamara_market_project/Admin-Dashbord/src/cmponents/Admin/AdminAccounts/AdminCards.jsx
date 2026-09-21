import React from "react";
import { IonIcon } from "@ionic/react";
import { calendarOutline, logoPaypal, phonePortraitOutline } from "ionicons/icons";
import MonthlyReport from "./Reports/ReportsLedger";

export default function PaymentsOverview({
  selectedDate = "",
  onDateChange,
  data = {},
  loading = false,
  error = null,
}) {
  const paypal = data.accounts?.paypal || {};
  const mpesa = data.accounts?.mpesa || {};

  const defaultCards = [
    {
      id: "paypal",
      provider: "PayPal",
      icon: logoPaypal,
      balance: paypal.amount || 0,
      holder: paypal.holder || "Maa Mara Market",
      primaryLabel: "Confirmed income",
      primaryValue: paypal.account || "Payment activity",
      secondaryLabel: "Status",
      secondaryValue: paypal.status || "No activity",
    },
    {
      id: "mpesa",
      provider: "M-Pesa",
      icon: phonePortraitOutline,
      balance: mpesa.amount || 0,
      holder: mpesa.holder || "Maa Mara Market",
      primaryLabel: "Confirmed income",
      primaryValue: mpesa.till || "Payment activity",
      secondaryLabel: "Status",
      secondaryValue: mpesa.agent_status || "No activity",
    },
  ];

  const items = data.accounts ? defaultCards : [];
  const formatKES = (value) =>
    "KES " +
    Number(value || 0).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <section className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-card-foreground sm:text-lg">Payment Accounts</h2>
          <p className="text-xs text-muted-foreground">
            Confirmed payment activity for the selected period.
          </p>
        </div>

        <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <IonIcon icon={calendarOutline} className="text-sm text-muted-foreground" />
          <span className="sr-only">Filter payment activity by date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => onDateChange?.(event.target.value)}
            className="bg-transparent text-xs text-foreground outline-none"
          />
        </label>
      </div>

      {loading ? (
        <div className="grid gap-4">{[1, 2].map((item) => <div key={item} className="h-44 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
          Error loading payment accounts.
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4">
          {items.map((item) => (
            <article key={item.id} className="relative min-w-0 overflow-hidden rounded-2xl border border-border bg-background">
              <div className="flex items-center justify-between gap-3 border-b border-border p-4">
                <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                    <IonIcon icon={item.icon} className="text-xl" />
                  </div>
                  <div className="mt-2 min-w-0 w-full">
                    <h3 className="truncate text-sm font-bold text-card-foreground">{item.provider}</h3>
                    <p className="truncate text-xs text-muted-foreground">{item.primaryValue}</p>
                  </div>
                </div>
                <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                  {item.secondaryValue}
                </span>
              </div>
              <div className="p-4">
                <p className="text-xs text-muted-foreground">{item.primaryLabel}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-card-foreground">{formatKES(item.balance)}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Account</p>
                    <p className="mt-1 truncate text-xs font-semibold text-card-foreground">{item.holder}</p>
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.secondaryLabel}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-card-foreground">{item.secondaryValue}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-5">
        <MonthlyReport data={data} loading={loading} error={error} />
      </div>
    </section>
  );
}
