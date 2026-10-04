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

const cardClass =
  "min-w-0 overflow-hidden rounded-2xl border border-[#e6e6e4] bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5";

const Home = ({ vendor_id }) => {
  const vendorStats = useVendorStatsBox({ vendorId: vendor_id });
  const monthlySales = useMonthlySales();
  const vendorGrowthStats = useVendorItemGrowthStats();
  const orderStats = useVendorPendingOrdersStats();

  return (
    <section className="space-y-5 text-[#222] sm:space-y-6">
      <header className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
              Vendor workspace
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-[#222] sm:text-3xl">
              Vendor Dashboard
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#595959]">
              Monitor your store performance, products, orders, stock and recent activity.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/vendors-dashboard/add-item"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#262626] focus:outline-none focus:ring-2 focus:ring-black/20"
            >
              Add product
            </Link>
            <div className="inline-flex min-h-10 items-center rounded-full border border-[#d9d9d6] bg-white p-1 shadow-sm">
              <VendorNotifications />
            </div>
          </div>
        </div>
      </header>

      <section aria-label="Vendor dashboard shortcuts">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {[
            {
              to: "/vendors-dashboard/item-stats",
              label: "Item performance",
              title: "Growth & sales",
              description: "View detailed item statistics",
            },
            {
              to: "/vendors-dashboard/orders",
              label: "Orders",
              title: "Manage orders",
              description: "Review and process customer orders",
            },
            {
              to: "/vendors-dashboard/item-onsite",
              label: "Inventory",
              title: "Items on site",
              description: "Manage published inventory",
            },
            {
              to: "/vendors-dashboard/vendor-payouts/payout-report",
              label: "Payouts",
              title: "Payout report",
              description: "Review vendor payment activity",
            },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex min-h-[136px] min-w-0 items-center rounded-2xl border border-[#e6e6e4] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#595959]">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#222] sm:text-[15px]">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#595959]">
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Vendor dashboard analytics">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#222] sm:text-lg">Store overview</h2>
            <p className="mt-0.5 text-xs text-[#595959] sm:text-sm">
              Performance and activity across your vendor workspace.
            </p>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-12">
          {/* Keep the four primary metric cards compact and ordered for quick scanning. */}
          <article className={`${cardClass} min-h-[112px] p-3 sm:min-h-[120px] sm:p-4 xl:col-span-3`}>
            <ChartBox {...vendorGrowthStats} />
          </article>

          <article className={`${cardClass} min-h-[112px] p-3 sm:min-h-[120px] sm:p-4 xl:col-span-3`}>
            {vendorStats.loading ? (
              <div className="flex min-h-24 items-center justify-center text-sm text-[#595959]">
                Loading vendor stats...
              </div>
            ) : vendorStats.error ? (
              <div className="flex min-h-24 items-center justify-center text-center text-sm text-red-600">
                {vendorStats.error}
              </div>
            ) : (
              <ChartBox {...vendorStats} />
            )}
          </article>

          <article className={`${cardClass} min-h-[112px] p-3 sm:min-h-[120px] sm:p-4 xl:col-span-3`}>
            <ChartBox {...monthlySales} />
          </article>

          <article className={`${cardClass} min-h-[112px] p-3 sm:min-h-[120px] sm:p-4 xl:col-span-3`}>
            <ChartBox {...orderStats} />
          </article>

          <article className={`${cardClass} min-h-[128px] p-3 sm:min-h-[136px] sm:p-4 xl:col-span-4`}>
            <TopBox />
          </article>

          <article className={`${cardClass} min-h-[128px] p-3 sm:min-h-[136px] sm:p-4 xl:col-span-4`}>
            <StockSummaryBox />
          </article>

          <article className={`${cardClass} xl:col-span-4`}>
            <CombinedVendorStatsChart
              vendorStats={vendorStats}
              monthlySales={monthlySales}
              vendorGrowthStats={vendorGrowthStats}
              orderStats={orderStats}
            />
          </article>

          <article className={`${cardClass} min-h-[360px] xl:col-span-8`}>
            <BarVendor />
          </article>

          <article className={`${cardClass} xl:col-span-4`}>
            <Activities />
          </article>
        </div>
      </section>

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
        <Link
          to="/"
          className="pointer-events-auto inline-flex min-h-11 items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-black/10 transition hover:bg-[#262626] focus:outline-none focus:ring-2 focus:ring-black/20"
        >
          Go To Shop
        </Link>
      </div>
    </section>
  );
};

export default Home;
