import React, { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import api from "../../../../Services/Api";

const formatKes = (value) => `KES ${Number(value || 0).toLocaleString()}`;

const RevenueGrowthCard = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    api.get("/api/revenue-analytics/")
      .then(({ data }) => {
        if (!active) return;
        const values = Array.isArray(data) ? data : data?.monthly_revenue;
        if (!Array.isArray(values)) throw new Error("Unexpected revenue analytics response.");
        setRows(values);
      })
      .catch((requestError) => {
        if (active) {
          console.error("Admin revenue growth load failed:", requestError);
          setError("Unable to load revenue analytics. Please try again.");
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [retryKey]);

  const summary = useMemo(() => {
    const totalRevenue = rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
    const totalProfit = rows.reduce((sum, row) => sum + Number(row.profit || 0), 0);
    const totalOrders = rows.reduce((sum, row) => sum + Number(row.orders || 0), 0);
    const latest = rows.length ? rows[rows.length - 1] : null;
    const previous = rows.length > 1 ? rows[rows.length - 2] : null;
    const latestRevenue = Number(latest?.revenue || 0);
    const previousRevenue = Number(previous?.revenue || 0);
    const growth = previousRevenue > 0
      ? ((latestRevenue - previousRevenue) / previousRevenue) * 100
      : latestRevenue > 0 ? 100 : 0;
    return { totalRevenue, totalProfit, totalOrders, latest, previous, latestRevenue, growth };
  }, [rows]);

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center"><CircularProgress /></div>;
  }

  return (
    <section className="min-w-0 space-y-5">
      <header className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Marketplace analytics</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-card-foreground sm:text-3xl">Revenue Growth</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Review completed-order revenue over time and compare the latest month with the preceding month.
        </p>
      </header>

      {error ? (
        <section role="alert" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm text-destructive">{error}</p>
          <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="mt-4 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground">
            Try again
          </button>
        </section>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total revenue</p>
              <p className="mt-2 text-xl font-bold text-card-foreground">{formatKes(summary.totalRevenue)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Across returned monthly records</p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profit</p>
              <p className="mt-2 text-xl font-bold text-emerald-600">{formatKes(summary.totalProfit)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Customer price minus vendor price</p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paid orders</p>
              <p className="mt-2 text-xl font-bold text-card-foreground">{summary.totalOrders.toLocaleString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">Included in the revenue trend</p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latest month</p>
              <p className="mt-2 text-xl font-bold text-card-foreground">{formatKes(summary.latestRevenue)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{summary.latest?.month || "No monthly data"}</p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month-on-month change</p>
              <p className={`mt-2 text-xl font-bold ${summary.growth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {summary.growth > 0 ? "+" : ""}{summary.growth.toFixed(1)}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.previous?.month ? `Compared with ${summary.previous.month}` : "Waiting for a previous month"}
              </p>
            </article>
          </div>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-card-foreground">Monthly revenue performance</h2>
              <p className="mt-1 text-sm text-muted-foreground">Revenue and completed orders by month.</p>
            </div>
            {rows.length === 0 ? (
              <p className="rounded-xl bg-muted p-6 text-sm text-muted-foreground">No completed-order revenue data is available yet.</p>
            ) : (
              <div className="space-y-4">
                {rows.map((row, index) => {
                  const revenue = Number(row.revenue || 0);
                  const maxRevenue = Math.max(...rows.map((item) => Number(item.revenue || 0)), 1);
                  return (
                    <div key={`${row.month || "month"}-${index}`} className="grid grid-cols-[68px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[90px_minmax(0,1fr)_150px]">
                      <span className="text-sm font-semibold text-foreground">{row.month || "Unknown"}</span>
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((revenue / maxRevenue) * 100, revenue > 0 ? 2 : 0)}%` }} />
                      </div>
                      <span className="col-start-2 text-xs text-muted-foreground sm:col-start-auto sm:text-right">{formatKes(revenue)} · {Number(row.orders || 0)} orders</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
};

export default RevenueGrowthCard;
