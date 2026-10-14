import React, { useEffect, useState } from "react";
import { CircularProgress, Typography } from "@mui/material";
import api from "../../Services/Api";
import BarChart from "../../cmponents/BarChart/BarChart";

const BarChartPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    api.get("/api/admin/dashboard-chart-data/")
      .then(({ data: payload }) => {
        if (!active) return;
        if (!Array.isArray(payload?.sales_activity)) {
          throw new Error("The sales activity response was not in the expected format.");
        }
        setData(payload.sales_activity);
      })
      .catch((requestError) => {
        if (active) {
          console.error("Admin sales chart load failed:", requestError);
          setError("Unable to load the sales chart. Please try again.");
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [retryKey]);

  return (
    <section className="min-w-0 space-y-4">
      <header className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Marketplace analytics</p>
        <Typography variant="h4" component="h1" sx={{ mt: 0.5, fontWeight: 700, letterSpacing: "-0.025em" }}>
          Sales Chart
        </Typography>
        <p className="mt-1 text-sm text-muted-foreground">Daily sales totals and completed orders for the latest 30 days.</p>
      </header>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-card-foreground">Sales activity</h2>
          <p className="mt-1 text-xs text-muted-foreground">Sales are shown in KES.</p>
        </div>
        <div className="h-[360px] min-w-0 sm:h-[440px]">
          {loading ? (
            <div className="flex h-full items-center justify-center"><CircularProgress size={28} /></div>
          ) : error ? (
            <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground">
                Try again
              </button>
            </div>
          ) : (
            <BarChart data={data} />
          )}
        </div>
      </section>
    </section>
  );
};

export default BarChartPage;
