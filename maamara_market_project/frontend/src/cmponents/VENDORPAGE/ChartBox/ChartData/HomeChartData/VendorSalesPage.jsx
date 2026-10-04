import React from "react";
import { useMonthlySales } from "./SalesReport";

const currency = (value) =>
  `KSh ${Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const VendorSalesPage = () => {
  const {
    chartData: monthlySales,
    value: totalValue,
    duration,
    loading,
    error,
  } = useMonthlySales();

  const totalAmount = Number(totalValue || 0);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#e6e6e4] bg-white p-8 text-sm text-[#595959]">
        Loading monthly sales...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-8 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <section className="w-full space-y-5">
      <header className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
          Store analytics
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#222]">
          Monthly Sales
        </h1>
        <p className="mt-1 text-sm text-[#595959]">
          The same monthly sales data shown in the Vendor Dashboard chart.
        </p>
      </header>

      <section className="rounded-2xl border border-[#e6e6e4] bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e6e6e4] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#222]">
              {duration || "Last 6 Months"}
            </h2>
            <p className="mt-1 text-xs text-[#595959]">
              {monthlySales.length} month{monthlySales.length === 1 ? "" : "s"} of sales data
            </p>
          </div>
          <p className="text-xl font-bold text-[#222]">
            {currency(totalAmount)}
          </p>
        </div>

        {monthlySales.length ? (
          <div className="mt-5 overflow-hidden rounded-xl border border-[#e6e6e4]">
            <div className="grid grid-cols-[1fr_auto] border-b border-[#e6e6e4] bg-[#f8f8f6] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#595959] sm:px-5">
              <span>Month</span>
              <span>Sales</span>
            </div>

            <div className="divide-y divide-[#e6e6e4]">
              {monthlySales.map((month) => (
                <div
                  key={month.name}
                  className="grid grid-cols-[1fr_auto] items-center px-4 py-4 sm:px-5"
                >
                  <span className="text-sm font-medium text-[#222]">
                    {month.name}
                  </span>
                  <span className="text-sm font-semibold text-[#222]">
                    {currency(month.pv)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 flex min-h-40 items-center justify-center rounded-xl bg-[#f8f8f6] text-center text-sm text-[#595959]">
            No monthly sales recorded.
          </div>
        )}
      </section>
    </section>
  );
};

export default VendorSalesPage;
