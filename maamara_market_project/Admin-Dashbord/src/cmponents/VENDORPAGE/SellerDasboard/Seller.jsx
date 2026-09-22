import { Link } from "react-router-dom";
import TopBox from "../Home/TopBox/TopBox";
import ChartBox from "../ChartBox/CharBox";
import CombinedVendorStatsChart from "../ChartBox/PieChart2";
import BarVendor from "../ChartBox/Bar/Bar";
import Activities from "../ChartBox/Bar/RecentActivities/Activities";
import useVendorStatsBox from "../../Hooks/ItemStats/ItemStatsHook";
import VendorNotifications from "./notifications/Notifications_vendor";
import { useMonthlySales } from "../ChartBox/ChartData/HomeChartData/SalesReport";
import { useVendorItemGrowthStats } from "../../Hooks/ItemStats/VendorItemStats";
import { useVendorPendingOrdersStats } from "../../Hooks/ItemStats/PendingOrderStat";
import StockSummaryBox from "../Products/Inventory/StockSummary";

const Home = ({ vendor_id }) => {
  const vendorStats = useVendorStatsBox({ vendorId: vendor_id });
  const monthlySales = useMonthlySales();
  const vendorGrowthStats = useVendorItemGrowthStats();
  const orderStats = useVendorPendingOrdersStats();

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Vendor workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-card-foreground sm:text-3xl">
            Vendor Dashboard
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Monitor your store performance, products, orders, stock and recent activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/vendors-dashboard/add-item"
            className="inline-flex items-center justify-center rounded-xl bg-[#2563eb] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1d4ed8]"
          >
            Add product
          </Link>
          <div className="rounded-xl border border-border bg-card p-1 shadow-sm">
            <VendorNotifications />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Link
          to="/vendors-dashboard/item-stats"
          className="group flex min-h-[132px] w-full items-center justify-center rounded-2xl border border-border bg-card p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-[136px] sm:p-4"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Item performance
            </p>
            <p className="mt-1.5 text-sm font-semibold text-card-foreground">
              Growth &amp; sales
            </p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              View detailed item statistics
            </p>
          </div>
        </Link>

        <Link
          to="/vendors-dashboard/orders"
          className="group flex min-h-[132px] w-full items-center justify-center rounded-2xl border border-border bg-card p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-[136px] sm:p-4"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Orders
            </p>
            <p className="mt-2 text-sm font-bold text-card-foreground">
              Manage orders
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Review and process customer orders
            </p>
          </div>
        </Link>

        <Link
          to="/vendors-dashboard/item-onsite"
          className="group flex min-h-[132px] w-full items-center justify-center rounded-2xl border border-border bg-card p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-[136px] sm:p-4"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Inventory
            </p>
            <p className="mt-2 text-sm font-bold text-card-foreground">
              Items on site
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage published inventory
            </p>
          </div>
        </Link>

        <Link
          to="/vendors-dashboard/vendor-payouts/payout-report"
          className="group flex min-h-[132px] w-full items-center justify-center rounded-2xl border border-border bg-card p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-[136px] sm:p-4"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payouts
            </p>
            <p className="mt-2 text-sm font-bold text-card-foreground">
              Payout report
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Review vendor payment activity
            </p>
          </div>
        </Link>
      </div>

      <section
        aria-label="Vendor dashboard analytics"
        className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-12"
      >
        <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm xl:col-span-3">
          <TopBox />
        </article>

        <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm xl:col-span-3">
          {vendorStats.loading ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
              Loading vendor stats...
            </div>
          ) : vendorStats.error ? (
            <div className="flex min-h-40 items-center justify-center text-center text-sm text-destructive">
              {vendorStats.error}
            </div>
          ) : (
            <ChartBox {...vendorStats} />
          )}
        </article>

        <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm xl:col-span-3">
          <ChartBox {...monthlySales} />
        </article>

        <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm xl:col-span-3">
          <ChartBox {...orderStats} />
        </article>

        <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm xl:col-span-4">
          <ChartBox {...vendorGrowthStats} />
        </article>

        <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm xl:col-span-4">
          <StockSummaryBox />
        </article>

        <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm xl:col-span-4">
          <CombinedVendorStatsChart
            vendorStats={vendorStats}
            monthlySales={monthlySales}
            vendorGrowthStats={vendorGrowthStats}
            orderStats={orderStats}
          />
        </article>

        <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm xl:col-span-7">
          <BarVendor />
        </article>

        <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm xl:col-span-5">
          <Activities />
        </article>
      </section>

      <div className="flex justify-center pb-4">
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-card-foreground shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Go To Shop
        </Link>
      </div>
    </section>
  );
};

export default Home;
