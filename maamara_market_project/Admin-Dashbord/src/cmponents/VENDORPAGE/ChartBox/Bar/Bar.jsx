import { useMemo } from "react";
import { useVendorPayoutHistory } from "../../../Hooks/Payouts/Payouts";
import VendorBar from "../VendorBarGraph/VendorBarG";

const BarVendor = () => {
  const { payouts, loading, error } = useVendorPayoutHistory();
  const now = new Date();
  const monthName = now.toLocaleDateString("en-KE", { month: "long" });
  const year = now.getFullYear();

  const currentMonthPayouts = useMemo(
    () => (payouts || []).filter((payout) => {
      if (!payout.payout_period_start) return false;
      const date = new Date(payout.payout_period_start);
      return date.getFullYear() === year && date.getMonth() === now.getMonth();
    }),
    [payouts, year, now.getMonth()]
  );

  return (
    <div className="min-w-0">
      <div className="border-b border-[#e6e6e4] pb-3">
        <h2 className="text-base font-bold text-[#222] sm:text-lg">Sales for {monthName} {year}</h2>
        <p className="mt-0.5 text-xs text-[#595959]">Current-month vendor sales.</p>
      </div>
      <div className="mt-4 h-[280px] min-w-0">
        {loading ? (
          <p className="text-sm text-[#595959]">Loading sales...</p>
        ) : error ? (
          <p className="text-sm text-red-600">Unable to load sales.</p>
        ) : (
          <VendorBar payouts={currentMonthPayouts} />
        )}
      </div>
    </div>
  );
};

export default BarVendor;
