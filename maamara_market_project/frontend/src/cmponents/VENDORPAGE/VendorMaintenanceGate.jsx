import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Clock3, PackageCheck, Wrench } from "lucide-react";
import api from "../../Services/Api";

const VENDOR_ORDER_PATHS = [
  /^\/vendors-dashboard\/orders\/?$/,
  /^\/vendors-dashboard\/pending-orders\/?$/,
  /^\/vendors-dashboard\/order-stats\/?$/,
];

export default function VendorMaintenanceGate({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [maintenance, setMaintenance] = useState({ enabled: false, message: "" });

  useEffect(() => {
    let active = true;
    const refreshMaintenance = async () => {
      try {
        const response = await api.get("/api/maintenance/status/");
        if (active) {
          setMaintenance({
            enabled: response.data?.enabled === true,
            message: response.data?.message || "",
          });
        }
      } catch {
        // Fail open if the public status endpoint is temporarily unavailable.
      }
    };

    refreshMaintenance();
    const intervalId = window.setInterval(refreshMaintenance, 30000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const canViewOrders = VENDOR_ORDER_PATHS.some((pattern) => pattern.test(location.pathname));

  if (!maintenance.enabled || canViewOrders) return children;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground sm:px-6">
      <section className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 text-center shadow-xl sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Wrench size={29} />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-primary">Maa Mara Market</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-card-foreground sm:text-3xl">Vendor workspace is temporarily paused</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
          {maintenance.message || "We're making a few improvements to Maa Mara Market. Vendor product changes are paused during maintenance."}
        </p>
        <div className="mx-auto mt-6 flex max-w-md items-start gap-3 rounded-2xl border border-border bg-muted/50 p-4 text-left">
          <PackageCheck size={21} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-card-foreground">Existing orders remain accessible</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">You can still review current orders and their delivery progress. Product edits and other vendor changes are paused.</p>
          </div>
        </div>
        <div className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Clock3 size={14} /> Maintenance mode is active
        </div>
        <button
          type="button"
          onClick={() => navigate("/vendors-dashboard/orders")}
          className="mt-6 inline-flex w-full items-center justify-center rounded-[20px] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 sm:w-auto"
        >
          View existing orders
        </button>
      </section>
    </main>
  );
}
