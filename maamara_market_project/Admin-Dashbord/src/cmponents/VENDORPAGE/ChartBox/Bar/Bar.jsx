import { useMemo } from "react";
import useMonthlySalesReport from "../../../Hooks/Sales/SalesReportHook";
import VendorBar from "../VendorBarGraph/VendorBarG";

const BarVendor = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthName = now.toLocaleDateString("en-KE", { month: "long" });
  const { sales, loading, error } = useMonthlySalesReport(year, month);

  const chartData = useMemo(() => {
    const grouped = {};
    (sales || []).forEach((sale) => {
      if (!sale.date_sold) return;
      const date = new Date(sale.date_sold);
      if (Number.isNaN(date.getTime())) return;
      const key = date.toISOString().slice(0, 10);
      grouped[key] = (grouped[key] || 0) + (Number(sale.calculated_total_price) || 0);
    });
    return Object.entries(grouped).map(([key, amount]) => ({
      name: new Date(key).toLocaleDateString("en-KE", { day: "2-digit", month: "short" }),
      amount,
      date: new Date(key),
    })).sort((a, b) => a.date - b.date);
  }, [sales]);

  return (
    <div className="min-w-0">
      <div className="border-b border-[#e6e6e4] pb-3">
        <h2 className="text-base font-bold text-[#222] sm:text-lg">Sales for {monthName} {year}</h2>
        <p className="mt-0.5 text-xs text-[#595959]">Current-month sales, grouped by day.</p>
      </div>
      <div className="mt-4 h-[280px] min-w-0">
        {loading ? <p className="text-sm text-[#595959]">Loading sales...</p> : error ? <p className="text-sm text-red-600">Unable to load sales.</p> : <VendorBar chartData={chartData} />}
      </div>
    </div>
  );
};

export default BarVendor;
