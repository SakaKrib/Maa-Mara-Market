// 📁 src/components/Hooks/Payouts/useMonthlySales.js
import { useEffect, useState } from "react";
import { useVendorPayoutHistory } from "../../../../Hooks/Payouts/Payouts";

export const useMonthlySales = () => {
  const { payouts, loading, error } = useVendorPayoutHistory();
  const [monthlySales, setMonthlySales] = useState([]);
  const [percentage, setPercentage] = useState("0%");

  useEffect(() => {
    if (!payouts || payouts.length === 0) return;

    // Group payouts by year-month (ISO string)
    const salesByMonth = {};

    payouts.forEach((p) => {
      if (!p.payout_period_start) return;

      // Extract "YYYY-MM" from payout_period_start
      const isoMonth = p.payout_period_start.slice(0, 7);

      const amount = parseFloat(p.amount) || 0;
      salesByMonth[isoMonth] = (salesByMonth[isoMonth] || 0) + amount;
    });

    // Convert to array, sort by date, and format for display
    const chartData = Object.entries(salesByMonth)
      .map(([isoMonth, total]) => {
        const date = new Date(isoMonth + "-01"); // safe date
        return {
          name: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          pv: total,
          date,
        };
      })
      .sort((a, b) => a.date - b.date)
      .slice(-6); // last 6 months

    setMonthlySales(chartData);

    // Calculate percentage change between last two months
    if (chartData.length >= 2) {
      const last = chartData[chartData.length - 1].pv;
      const prev = chartData[chartData.length - 2].pv;

      let change = 0;

      if (prev === 0 && last > 0) {
        change = 100;
      } else if (prev > 0) {
        change = ((last - prev) / prev) * 100;
      }

      const cappedChange = Math.min(Math.max(change, -100), 999);
      const formattedChange =
        cappedChange >= 0
          ? `+${cappedChange.toFixed(1)}%`
          : `${cappedChange.toFixed(1)}%`;

      setPercentage(formattedChange);
    } else {
      setPercentage("0%");
    }
  }, [payouts]);

  const total = monthlySales.reduce((sum, d) => sum + d.pv, 0).toFixed(2);

  return {
    title: "Monthly Sales",
    value: total,
    percentage,
    duration: "Last 6 Months",
    link: "vendor-sales",
    chartData: monthlySales,
    loading,
    error,
  };
};
