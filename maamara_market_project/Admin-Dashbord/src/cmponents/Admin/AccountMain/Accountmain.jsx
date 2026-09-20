import React from "react";
import { IonIcon } from "@ionic/react";
import { walletOutline, cardOutline, cashOutline, trendingUpOutline } from "ionicons/icons";
import PaymentsOverview from "../AdminAccounts/AdminCards";
import FastPayment from "../AdminAccounts/Reports/PaymentHistory";
import MonthlyReport from "../AdminAccounts/Reports/ReportsLedger";
import CryptoChart from "../AdminAccounts/Reports/LineGrahReactChart";
import Header from "../../../Header/Header";
import useDashboardData from "../../Hooks/AccountSummary/AccountSummaryHook";

const AdminAccounts = () => {
  const { data, loading, error } = useDashboardData();
  const monthlySummary = data.monthly_summary || [];

  return (
    <div className="min-h-full bg-background p-2 text-foreground sm:p-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-custom sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Money</p>
            <h1 className="mt-1 text-xl font-bold text-card-foreground sm:text-2xl">Accounts</h1>
            <p className="mt-1 text-sm text-muted-foreground">Payment accounts, ledger activity, and monthly financial performance.</p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <IonIcon icon={walletOutline} className="text-xl" />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">{String(error)}</div>
        ) : (
          <>
            <PaymentsOverview />
            <FastPayment />
            <MonthlyReport />
            <CryptoChart monthlySummary={monthlySummary} />
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAccounts;
