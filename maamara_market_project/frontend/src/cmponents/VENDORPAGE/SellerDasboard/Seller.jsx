import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Download, FileSpreadsheet, ImageDown, Package, ShoppingCart, ChartNoAxesCombined } from "lucide-react";
import api from "../../../Services/Api";
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
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportingKey, setExportingKey] = useState("");
  const [exportMessage, setExportMessage] = useState("");

  const getExportDate = () => {
    const now = new Date();
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const producedAt = new Intl.DateTimeFormat("en-KE", {
      timeZone: "Africa/Nairobi",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(now);
    return { date, producedAt };
  };

  const csvCell = (value) => {
    const text = value == null
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
    const safeText = typeof value === "string" && /^[=+@-]/.test(text) ? `'${text}` : text;
    return '"' + safeText.replace(/"/g, '""') + '"';
  };

  const downloadCsv = (filename, title, headers, rows, producedAt, date) => {
    const content = [
      ["MAA MARA MARKET"],
      ["Vendor report", title],
      ["Report date (Africa/Nairobi)", date],
      ["Generated at (Africa/Nairobi)", producedAt],
      [],
      [...headers, "Export generated at (Africa/Nairobi)"],
      ...rows.map((row) => [...row, producedAt]),
    ].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
  };

  const listFromResponse = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  const fetchAllPages = async (initialUrl) => {
    const records = [];
    let nextUrl = initialUrl;
    let pageCount = 0;
    while (nextUrl && pageCount < 100) {
      const response = await api.get(nextUrl, { withCredentials: true });
      const data = response.data;
      records.push(...listFromResponse(data));
      nextUrl = Array.isArray(data) ? null : (data?.next || null);
      pageCount += 1;
    }
    if (nextUrl) throw new Error("This export exceeds 100 pages. Please narrow the report and try again.");
    return records;
  };

  const downloadSalesChartPng = (chartData, date) => {
    if (!chartData.length) throw new Error("There is no sales chart data to export yet.");
    const width = 1200;
    const height = 680;
    const padding = { top: 72, right: 70, bottom: 110, left: 100 };
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare the chart image.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#172554";
    context.font = "bold 30px Arial";
    context.fillText("MAA MARA MARKET — MONTHLY SALES CHART", padding.left, 42);
    context.fillStyle = "#64748b";
    context.font = "16px Arial";
    context.fillText(`Last 6 months · Generated ${date}`, padding.left, 65);

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const values = chartData.map((point) => Math.max(0, Number(point.pv) || 0));
    const maxValue = Math.max(...values, 1);
    const gridLines = 4;
    context.strokeStyle = "#e2e8f0";
    context.fillStyle = "#475569";
    context.lineWidth = 1;
    context.font = "14px Arial";
    for (let index = 0; index <= gridLines; index += 1) {
      const y = padding.top + (plotHeight * index) / gridLines;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();
      const amount = maxValue * (1 - index / gridLines);
      context.fillText(`KSh ${amount.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`, 12, y + 5);
    }

    const points = chartData.map((point, index) => ({
      x: padding.left + (chartData.length === 1 ? plotWidth / 2 : (plotWidth * index) / (chartData.length - 1)),
      y: padding.top + plotHeight - ((Number(point.pv) || 0) / maxValue) * plotHeight,
      label: point.name || "",
      value: Number(point.pv) || 0,
    }));
    context.strokeStyle = "#1d4ed8";
    context.lineWidth = 5;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.beginPath();
    points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.stroke();
    points.forEach((point) => {
      context.fillStyle = "#1d4ed8";
      context.beginPath();
      context.arc(point.x, point.y, 7, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#172554";
      context.font = "bold 14px Arial";
      context.textAlign = "center";
      context.fillText(`KSh ${point.value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`, point.x, point.y - 16);
      context.fillStyle = "#475569";
      context.font = "14px Arial";
      context.fillText(point.label, point.x, height - padding.bottom + 32);
    });
    context.textAlign = "start";
    const anchor = document.createElement("a");
    anchor.href = canvas.toDataURL("image/png");
    anchor.download = `maa-mara-vendor-sales-chart-${date}.png`;
    anchor.click();
  };

  const exportVendorData = async (reportType) => {
    const { date, producedAt } = getExportDate();
    setExportingKey(reportType);
    setExportMessage("");
    try {
      if (reportType === "items") {
        const items = await fetchAllPages("/api/item-post/update/");
        downloadCsv(
          `maa-mara-vendor-items-${date}.csv`,
          "Vendor item list",
          ["Item ID", "Item name", "Category", "Subcategory", "Price (KES)", "Discount price (KES)", "Stock", "Available", "Created"],
          items.map((item) => [
            item.id ?? "",
            item.name ?? item.item_name ?? "",
            item.category_name ?? item.category?.name ?? item.category ?? "",
            item.subcategory_name ?? item.subcategory?.name ?? item.subcategory ?? "",
            item.price ?? "",
            item.discount_price ?? "",
            item.in_stock ?? item.stock ?? "",
            item.available ?? item.is_available ?? "",
            item.created_at ?? "",
          ]),
          producedAt,
          date
        );
      } else if (reportType === "orders") {
        const [pendingResponse, completeResponse] = await Promise.all([
          api.get("/api/vendor-pending-order/items/", { withCredentials: true }),
          api.get("/api/vendor-complete-order/items/", { withCredentials: true }),
        ]);
        const pendingItems = listFromResponse(pendingResponse.data?.pending_items ?? pendingResponse.data);
        const completeItems = listFromResponse(completeResponse.data?.completed_items ?? completeResponse.data);
        const rows = [
          ...pendingItems.map((item) => ({ ...item, export_status: item.order_status || "pending" })),
          ...completeItems.map((item) => ({ ...item, export_status: item.order_status || "completed" })),
        ];
        downloadCsv(
          `maa-mara-vendor-orders-${date}.csv`,
          "Vendor orders",
          ["Order ID", "Item", "Quantity", "Unit price (KES)", "Line total (KES)", "Customer", "Status", "Created"],
          rows.map((item) => [
            item.order_id ?? item.id ?? "",
            item.item_name ?? item.name ?? "",
            item.quantity ?? "",
            item.item_price ?? item.price ?? "",
            (Number(item.item_price ?? item.price) || 0) * (Number(item.quantity) || 0),
            item.customer ?? item.customer_name ?? "",
            item.export_status,
            item.created_at ?? "",
          ]),
          producedAt,
          date
        );
      } else if (reportType === "sales") {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const response = await api.get("/api/monthly-sales-report/", {
          params: { year, month },
          withCredentials: true,
        });
        const data = response.data || {};
        const sales = Array.isArray(data.sales) ? data.sales : [];
        downloadCsv(
          `maa-mara-vendor-sales-report-${year}-${String(month).padStart(2, "0")}.csv`,
          `Vendor sales report — ${year}-${String(month).padStart(2, "0")}`,
          ["Sale ID", "Item", "Unit/line amount (KES)", "Quantity sold", "Quantity remaining", "Date sold"],
          [
            ...sales.map((sale) => [
              sale.id ?? "",
              sale.item_name ?? sale.item?.name ?? "",
              sale.calculated_total_price ?? sale.total_price ?? sale.price ?? "",
              sale.quantity ?? "",
              sale.qty_remaining ?? "",
              sale.date_sold ?? "",
            ]),
            ["TOTAL", "", data.total_amount ?? sales.reduce((sum, sale) => sum + (Number(sale.calculated_total_price ?? sale.total_price ?? sale.price) || 0), 0), sales.reduce((sum, sale) => sum + (Number(sale.quantity) || 0), 0), "", ""],
          ],
          producedAt,
          date
        );
      } else if (reportType === "chart-data") {
        const chartData = Array.isArray(monthlySales.chartData) ? monthlySales.chartData : [];
        downloadCsv(
          `maa-mara-vendor-sales-chart-data-${date}.csv`,
          "Monthly sales chart data",
          ["Month", "Amount (KES)"],
          chartData.map((point) => [point.name ?? "", point.pv ?? 0]),
          producedAt,
          date
        );
      } else if (reportType === "chart-image") {
        downloadSalesChartPng(Array.isArray(monthlySales.chartData) ? monthlySales.chartData : [], date);
      } else {
        throw new Error("That export type is not supported.");
      }
      setExportMenuOpen(false);
      setExportMessage("Your download is ready.");
    } catch (error) {
      setExportMessage(
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error?.message ||
        "We couldn't prepare that download. Please try again."
      );
    } finally {
      setExportingKey("");
    }
  };

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

          <div className="relative w-full sm:w-auto">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={exportMenuOpen}
              disabled={Boolean(exportingKey)}
              onClick={() => setExportMenuOpen((open) => !open)}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-[#d9d9d6] bg-white px-4 py-2.5 text-sm font-semibold text-[#222] shadow-sm transition hover:bg-[#f8f8f6] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              {exportingKey ? <Download className="h-4 w-4 animate-pulse" /> : <Download className="h-4 w-4" />}
              {exportingKey ? "Preparing…" : "Export"}
              <ChevronDown className="h-4 w-4" />
            </button>
            {exportMenuOpen && (
              <div role="menu" aria-label="Vendor download options" className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#e6e6e4] bg-white p-1.5 shadow-xl">
                <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-[#777]">Download your data</p>
                {[
                  ["items", Package, "Item list (CSV)", "Your products, prices, stock and availability"],
                  ["orders", ShoppingCart, "Orders (CSV)", "Pending and completed order line items"],
                  ["sales", FileSpreadsheet, "Monthly sales report (CSV)", "Detailed sales for the current month"],
                  ["chart-data", ChartNoAxesCombined, "Sales chart data (CSV)", "Monthly values from your dashboard chart"],
                  ["chart-image", ImageDown, "Sales chart image (PNG)", "Download a shareable image of the chart"],
                ].map(([key, Icon, label, description]) => (
                  <button
                    key={key}
                    type="button"
                    role="menuitem"
                    disabled={Boolean(exportingKey)}
                    onClick={() => exportVendorData(key)}
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#f8f8f6] disabled:cursor-wait disabled:opacity-60"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#2563eb]" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#222]">{label}</span>
                      <span className="mt-0.5 block text-xs leading-4 text-[#777]">{description}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
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

      {exportMessage && (
        <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${exportMessage === "Your download is ready." ? "border-blue-200 bg-blue-50 text-blue-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          {exportMessage}
        </div>
      )}

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

      <div className="pointer-events-none fixed inset-x-0 bottom-14 z-40 flex justify-center px-4">
        <Link
          to="/"
          className="pointer-events-auto inline-flex min-h-11 items-center justify-center rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-lg ring-1 ring-black/10 transition hover:bg-[#262626] focus:outline-none focus:ring-2 focus:ring-black/20"
        >
          Go To Shop
        </Link>
      </div>
    </section>
  );
};

export default Home;
