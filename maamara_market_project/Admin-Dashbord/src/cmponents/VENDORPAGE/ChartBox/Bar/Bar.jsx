import "../CharBox.css";
import VendorBar from "../VendorBarGraph/VendorBarG";
import { useVendorPayoutHistory } from "../../../Hooks/Payouts/Payouts"; 
import { format } from "date-fns";

const BarVendor = () => {
  const { payouts, loading } = useVendorPayoutHistory();

  // Get month range dynamically
  const monthRange = (() => {
    if (!payouts || payouts.length === 0) return "N/A";

    // Extract valid dates from payout_period_start
    const validDates = payouts
      .map((p) => new Date(p.payout_period_start))
      .filter((d) => !isNaN(d.getTime())) // Keep only valid dates
      .sort((a, b) => a - b); // oldest → newest

    if (validDates.length === 0) return "No valid dates";

    const oldest = validDates[0];
    const newest = validDates[validDates.length - 1];

    const oldestLabel = format(oldest, "MMM ");
    const newestLabel = format(newest, "MMM ");

    if (oldestLabel === newestLabel) return newestLabel;

    return `${oldestLabel} – ${newestLabel}`;
  })();

  return (
    <div className="pie-chart">
      <h2 className="text-base font-bold leading-5 text-[#222] sm:text-lg">Sales for {monthRange}</h2>

      <div className="chart">
        {loading ? <p>Loading chart...</p> : <VendorBar payouts={payouts} />}
      </div>
    </div>
  );
};

export default BarVendor;
