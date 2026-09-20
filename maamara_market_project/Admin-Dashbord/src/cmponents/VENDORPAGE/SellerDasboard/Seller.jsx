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
    <main className="min-h-full w-full bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1800px] px-2 pb-24 pt-2 sm:px-4 lg:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              Vendor Dashboard
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Overview of your store performance, orders, products and activity.
            </p>
          </div>

          <div className="shrink-0 rounded-full border border-border bg-card p-1 shadow-sm">
            <VendorNotifications />
          </div>
        </div>

        <section
          aria-label="Vendor dashboard overview"
          className="grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <article className="row-span-2 min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-custom sm:col-span-2 xl:col-span-1">
            <TopBox />
          </article>

          <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-custom sm:col-span-2 xl:col-span-1">
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

          <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-custom sm:col-span-2 xl:col-span-1">
            <ChartBox {...monthlySales} />
          </article>

          <article className="row-span-2 min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-custom sm:col-span-2 xl:col-span-1">
            <BarVendor />
          </article>

          <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-custom sm:col-span-2 xl:col-span-1">
            <ChartBox {...orderStats} />
          </article>

          <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-custom sm:col-span-2 xl:col-span-1">
            <ChartBox {...vendorGrowthStats} />
          </article>

          <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-custom sm:col-span-2 xl:col-span-2">
            <Activities />
          </article>

          <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-custom sm:col-span-2 xl:col-span-1">
            <CombinedVendorStatsChart
              vendorStats={vendorStats}
              monthlySales={monthlySales}
              vendorGrowthStats={vendorGrowthStats}
              orderStats={orderStats}
            />
          </article>

          <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-custom sm:col-span-2 xl:col-span-1">
            <StockSummaryBox />
          </article>
        </section>

        <div className="mt-6 flex justify-center">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            Go To Shop
          </a>
        </div>
      </div>
    </main>
  );
};

export default Home;
