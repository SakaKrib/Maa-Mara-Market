import React, { useMemo, useState } from "react";
import useMonthlySalesReport from "../../../Hooks/Sales/SalesReportHook";

const SalesReportPage = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const {
    sales = [],
    totalAmount = 0,
    availableMonths = [],
    loading,
    error,
  } = useMonthlySalesReport(year, month);

  const formatMonthLabel = (m) => {
    const date = new Date(m.year, m.month - 1);
    return date.toLocaleDateString("en-KE", {
      month: "short",
      year: "numeric",
    });
  };

  const formatKsh = (value) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);

  const rows = useMemo(
    () =>
      sales.map((sale) => ({
        ...sale,
        total_price_for_vendor: Number(sale.calculated_total_price) || 0,
        formatted_date_sold: sale.date_sold
          ? new Date(sale.date_sold).toLocaleDateString("en-KE", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
      })),
    [sales]
  );

  const totalQuantity = rows.reduce(
    (sum, row) => sum + (Number(row.quantity) || 0),
    0
  );

  return (
    <section className="w-full space-y-6">
      <header className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f1641e]">
              Sales performance
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#222]">
              Sales Report
            </h1>
            <p className="mt-1 text-sm text-[#595959]">
              Review item sales and revenue by available month.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#e6e6e4] bg-[#f8f8f6] px-4 py-3">
              <p className="text-xs font-medium text-[#595959]">Items sold</p>
              <p className="mt-1 text-lg font-bold text-[#222]">{totalQuantity}</p>
            </div>
            <div className="rounded-xl border border-[#ffe0cf] bg-[#fff7f2] px-4 py-3">
              <p className="text-xs font-medium text-[#b94b13]">Month total</p>
              <p className="mt-1 text-lg font-bold text-[#222]">{formatKsh(totalAmount)}</p>
            </div>
            <div className="col-span-2 rounded-xl border border-[#e6e6e4] bg-white px-4 py-3 sm:col-span-1">
              <p className="text-xs font-medium text-[#595959]">Sales lines</p>
              <p className="mt-1 text-lg font-bold text-[#222]">{rows.length}</p>
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-[#e6e6e4] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-[#222]">Available months</h2>
            <p className="text-sm text-[#777]">
              Select a month to view its sales.
            </p>
          </div>
          <div className="text-sm font-semibold text-[#f1641e]">
            {formatMonthLabel({ year, month })}
          </div>
        </div>

        {availableMonths.length === 0 && !loading ? (
          <p className="mt-4 rounded-xl bg-[#f8f8f6] p-4 text-sm text-[#595959]">
            No sales data available.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {availableMonths.map((m) => {
              const selected = m.year === year && m.month === month;

              return (
                <button
                  key={`${m.year}-${m.month}`}
                  type="button"
                  onClick={() => {
                    setYear(m.year);
                    setMonth(m.month);
                  }}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    selected
                      ? "border-[#2563eb] bg-[#2563eb] text-white shadow-sm"
                      : "border-[#d9d9d6] bg-white text-[#222] hover:border-[#2563eb] hover:bg-[#eff6ff]"
                  }`}
                >
                  {formatMonthLabel(m)}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-[#e6e6e4] bg-white shadow-sm">
          <div className="flex flex-col items-center gap-3 text-sm text-[#595959]">
            <div
              className="h-8 w-8 animate-spin rounded-full border-4 border-[#f1641e]/20 border-t-[#f1641e]"
              aria-label="Loading sales"
            />
            Loading sales report...
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">Unable to load sales report</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d7d7d3] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0e8] text-sm font-bold text-[#f1641e]">
            KSh
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[#222]">No sales for this month</h2>
          <p className="mt-1 text-sm text-[#595959]">
            Select another available month to review its sales.
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-[#e6e6e4] bg-white shadow-sm">
          <div className="border-b border-[#eeeeeb] p-4 sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-[#222]">
                  Sales for {formatMonthLabel({ year, month })}
                </h2>
                <p className="text-sm text-[#777]">
                  {rows.length} sales line{rows.length === 1 ? "" : "s"} recorded
                </p>
              </div>
              <p className="text-base font-bold text-[#f1641e]">
                {formatKsh(totalAmount)}
              </p>
            </div>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[820px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#e6e6e4] bg-[#f8f8f6] text-xs uppercase tracking-wide text-[#595959]">
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 font-semibold">Total price</th>
                  <th className="px-4 py-3 font-semibold">Qty sold</th>
                  <th className="px-4 py-3 font-semibold">Qty remaining</th>
                  <th className="px-4 py-3 font-semibold">Sold date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#eeeeeb] last:border-0 hover:bg-[#fcfcfa]"
                  >
                    <td className="px-4 py-4 font-semibold text-[#222]">
                      {row.item_name || "Unnamed item"}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-[#222]">
                      {formatKsh(row.total_price_for_vendor)}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[#222]">
                      {row.quantity ?? 0}
                    </td>
                    <td className="px-4 py-4 text-sm text-[#595959]">
                      {row.qty_remaining ?? 0}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-[#777]">
                      {row.formatted_date_sold}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#fff7f2]">
                  <td className="px-4 py-4 font-bold text-[#222]">Total</td>
                  <td className="px-4 py-4 font-bold text-[#f1641e]">
                    {formatKsh(totalAmount)}
                  </td>
                  <td className="px-4 py-4 font-bold text-[#222]">{totalQuantity}</td>
                  <td className="px-4 py-4" />
                  <td className="px-4 py-4" />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="divide-y divide-[#eeeeeb] md:hidden">
            {rows.map((row) => (
              <article key={row.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 flex-1 font-bold text-[#222]">
                    {row.item_name || "Unnamed item"}
                  </h3>
                  <span className="shrink-0 text-sm font-bold text-[#f1641e]">
                    {formatKsh(row.total_price_for_vendor)}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-[#f8f8f6] p-3">
                    <dt className="text-xs text-[#777]">Qty sold</dt>
                    <dd className="mt-1 text-sm font-semibold text-[#222]">
                      {row.quantity ?? 0}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-[#f8f8f6] p-3">
                    <dt className="text-xs text-[#777]">Remaining</dt>
                    <dd className="mt-1 text-sm font-semibold text-[#222]">
                      {row.qty_remaining ?? 0}
                    </dd>
                  </div>
                  <div className="col-span-2 rounded-lg bg-[#f8f8f6] p-3">
                    <dt className="text-xs text-[#777]">Sold date</dt>
                    <dd className="mt-1 text-sm font-semibold text-[#222]">
                      {row.formatted_date_sold}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
};

export default SalesReportPage;
