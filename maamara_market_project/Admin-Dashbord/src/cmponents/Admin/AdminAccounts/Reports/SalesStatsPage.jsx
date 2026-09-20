import { useEffect, useMemo, useState } from "react";
import { IonIcon } from "@ionic/react";
import { cashOutline, trendingUpOutline } from "ionicons/icons";
import { useNavigate } from "react-router-dom";
import api from "../../../../Services/Api";
import useDashboardStats from "../../../Hooks/StockInventory/SalesStats";

const SalesPage = () => {
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [error, setError] = useState("");
  const { stats, loading } = useDashboardStats();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        setLoadingRows(true);
        setError("");
        const res = await api.get("/api/admin/dashboard/vendor-sales/");
        const vendors = Array.isArray(res.data) ? res.data : [];

        const formatted = vendors.flatMap((vendor) =>
          (Array.isArray(vendor.items) ? vendor.items : []).map((item, index) => ({
            id: `${vendor.vendor_name || "vendor"}-${item.item_id || item.item_name || index}`,
            vendor: vendor.vendor_name || "Unknown vendor",
            item: item.item_name || "Unnamed item",
            qty_sold: Number(item.qty_sold || 0),
            total_qty: Number(item.total_qty || 0),
            remaining:
              item.current_stock !== undefined && item.current_stock !== null
                ? Number(item.current_stock)
                : Math.max(Number(item.total_qty || 0) - Number(item.qty_sold || 0), 0),
          }))
        );

        if (active) setRows(formatted);
      } catch (err) {
        console.error("Vendor sales load failed:", err);
        if (active) {
          setRows([]);
          setError("Unable to load vendor sales right now.");
        }
      } finally {
        if (active) setLoadingRows(false);
      }
    };

    fetchData();
    return () => { active = false; };
  }, []);

  const totals = useMemo(
    () => ({
      sold: rows.reduce((sum, row) => sum + row.qty_sold, 0),
      stock: rows.reduce((sum, row) => sum + row.total_qty, 0),
      remaining: rows.reduce((sum, row) => sum + row.remaining, 0),
    }),
    [rows]
  );

  const statsProgress =
    Number(stats?.total_orders || 0) > 0
      ? Number(stats?.completed_orders || 0) / Number(stats.total_orders)
      : 0;

  if (loading && loadingRows) {
    return (
      <section className="flex min-h-[40vh] items-center justify-center p-4 text-sm text-muted-foreground">
        Loading vendor sales...
      </section>
    );
  }

  return (
    <section className="min-w-0 space-y-5 p-2 sm:p-4 lg:p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Sales reporting</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Vendor Sales</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Review vendor item sales, stock levels and remaining inventory.
        </p>
      </header>

      <section aria-label="Sales statistics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <IonIcon icon={cashOutline} className="text-xl" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sales</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {Number(stats?.total_sales || 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{Number(stats?.total_orders || 0).toLocaleString()} orders</span>
            <span>{Math.round(statsProgress * 100)}% completed</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(statsProgress * 100, 100)}%` }} />
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantity sold</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{totals.sold.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">Across returned vendor items</p>
        </article>

        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total stock</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{totals.stock.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">Recorded vendor inventory</p>
        </article>

        <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Remaining</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{totals.remaining.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">Current available quantity</p>
        </article>
      </section>

      <div className="flex justify-start sm:justify-end">
        <button
          type="button"
          onClick={() => navigate("transaction-growth-track")}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:w-auto"
        >
          <IonIcon icon={trendingUpOutline} />
          View Revenue Growth
        </button>
      </div>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <h2 className="text-lg font-bold text-foreground">Sales</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {rows.length.toLocaleString()} vendor item records
          </p>
        </div>

        {error ? (
          <div className="p-6 text-sm text-destructive">{error}</div>
        ) : loadingRows ? (
          <div className="p-6 text-sm text-muted-foreground">Loading sales...</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No vendor sales data available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Vendor</th>
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 text-right font-semibold">Qty Sold</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Stock</th>
                  <th className="px-4 py-3 text-right font-semibold">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-muted/50">
                    <td className="max-w-[220px] truncate px-4 py-3 font-medium text-foreground">{row.vendor}</td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-muted-foreground">{row.item}</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{row.qty_sold.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{row.total_qty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">{row.remaining.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
};

export default SalesPage;
