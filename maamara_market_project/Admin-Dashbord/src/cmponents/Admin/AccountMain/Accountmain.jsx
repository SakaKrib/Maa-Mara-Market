import React, { useState } from "react";
import { IonIcon } from "@ionic/react";
import { walletOutline } from "ionicons/icons";
import PaymentsOverview from "../AdminAccounts/AdminCards";
import FastPayment from "../AdminAccounts/Reports/PaymentHistory";
import CryptoChart from "../AdminAccounts/Reports/LineGrahReactChart";
import useDashboardData from "../../Hooks/AccountSummary/AccountSummaryHook";

const AdminAccounts = () => {
  const [selectedDate, setSelectedDate] = useState("");
  const { data, loading, error, refetch } = useDashboardData(selectedDate);

  return (
    <div className="min-h-full bg-background p-2 text-foreground sm:p-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center shadow-custom sm:p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
            <IonIcon icon={walletOutline} className="text-xl" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Money</p>
            <h1 className="mt-1 text-xl font-bold text-card-foreground sm:text-2xl">Accounts</h1>
            <p className="mt-1 text-sm text-muted-foreground">Payment accounts, ledger activity, and financial performance.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">{String(error)}</div>
        ) : (
          <>
            <PaymentsOverview
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              data={data}
              loading={loading}
              error={error}
            />
            <FastPayment
              selectedDate={selectedDate}
              data={data}
              loading={loading}
              error={error}
              refetch={refetch}
            />
            <CryptoChart monthlySummary={data.monthly_summary || []} />
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAccounts;
