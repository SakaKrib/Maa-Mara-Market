import React from "react";
import { CheckCircle2, Clock3, PackageCheck, Truck } from "lucide-react";
import { useVendorOrdersCombined } from "./CombinedOrderHook";

const truncate = (text, length = 40) => {
  if (!text || typeof text !== "string") return "Item unavailable";
  return text.length > length ? `${text.substring(0, length)}…` : text;
};

const formatKes = (value) =>
  `KSh ${Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const TRACKING_STEPS = [
  "PAID",
  "PROCESSING",
  "PACKING",
  "READY_TO_SHIP",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "AWAITING_CONFIRMATION",
  "COMPLETED",
];

const normalizeStatus = (status) => String(status || "").trim().toUpperCase();

const statusLabel = (status) =>
  String(status || "Pending")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const OrderProgress = ({ status }) => {
  const normalized = normalizeStatus(status);
  const currentIndex = TRACKING_STEPS.indexOf(normalized);

  if (currentIndex < 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          Fulfillment progress
        </p>
        <span className="text-xs font-semibold text-gray-700">
          {statusLabel(normalized)}
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[720px] items-start">
          {TRACKING_STEPS.map((step, index) => {
            const reached = currentIndex >= index;
            const current = currentIndex === index;

            return (
              <React.Fragment key={step}>
                <div className="flex w-[72px] shrink-0 flex-col items-center text-center">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                      reached
                        ? "border-blue-200 bg-white text-blue-700"
                        : "border-gray-200 bg-white text-gray-400"
                    }`}
                  >
                    {index === 0 ? (
                      <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : index >= 4 && index <= 7 ? (
                      <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </span>
                  <span
                    className={`mt-1 text-[10px] leading-tight ${
                      current ? "font-bold text-blue-700" : "text-gray-500"
                    }`}
                  >
                    {statusLabel(step)}
                  </span>
                </div>

                {index < TRACKING_STEPS.length - 1 && (
                  <span
                    className={`mt-3 h-px min-w-5 flex-1 ${
                      currentIndex > index ? "bg-blue-300" : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const OrderCard = ({ order, status }) => {
  const normalizedStatus = normalizeStatus(order.status);

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Order
          </p>
          <h3 className="mt-1 text-lg font-bold text-gray-900">#{order.id}</h3>
        </div>
        <div className="text-left sm:text-right">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              status === "pending"
                ? "bg-amber-50 text-amber-700"
                : status === "in_process"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-green-50 text-green-700"
            }`}
          >
            {status === "pending"
              ? "Pending"
              : status === "in_process"
                ? statusLabel(normalizedStatus)
                : "Completed"}
          </span>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {formatKes(order.total_for_vendor)}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {(order.items || []).map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-lg bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-800">
                {truncate(item?.item_name || item?.item?.name || item?.name)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Quantity: {Number(item.quantity || 0).toLocaleString("en-KE")}
              </p>
            </div>
            <p className="text-sm font-semibold text-gray-700">
              {formatKes(item.final_price_for_vendor)}
            </p>
          </div>
        ))}
      </div>

      {status === "in_process" && <OrderProgress status={order.status} />}
    </article>
  );
};

const VendorOrdersPage = () => {
  const {
    pending = [],
    inProcess = [],
    completed = [],
    loading,
  } = useVendorOrdersCombined();

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium text-gray-600">Loading orders...</p>
      </div>
    );
  }

  const pendingTotal = pending.reduce(
    (sum, order) => sum + Number(order.total_for_vendor || 0),
    0
  );
  const inProcessTotal = inProcess.reduce(
    (sum, order) => sum + Number(order.total_for_vendor || 0),
    0
  );
  const completedTotal = completed.reduce(
    (sum, order) => sum + Number(order.total_for_vendor || 0),
    0
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <section className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b94b13]">
            Order management
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
            Orders
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Follow pending, in-process, and completed orders assigned to your vendor account.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:min-w-[460px]">
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase text-amber-700">Pending</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{pending.length}</p>
            <p className="text-xs text-gray-500">{formatKes(pendingTotal)}</p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs font-semibold uppercase text-blue-700">On Process</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{inProcess.length}</p>
            <p className="text-xs text-gray-500">{formatKes(inProcessTotal)}</p>
          </div>
          <div className="rounded-lg border border-green-100 bg-green-50 p-3">
            <p className="text-xs font-semibold uppercase text-green-700">Completed</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{completed.length}</p>
            <p className="text-xs text-gray-500">{formatKes(completedTotal)}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Orders on process</h2>
            <p className="text-sm text-gray-500">
              Paid orders currently moving through fulfillment. The progress view follows the order status.
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {inProcess.length} orders
          </span>
        </div>

        {inProcess.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {inProcess.map((order) => (
              <OrderCard key={order.id} order={order} status="in_process" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <Clock3 className="mx-auto mb-2 h-5 w-5 text-gray-400" aria-hidden="true" />
            <p className="text-sm text-gray-500">No orders are currently on process.</p>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pending orders</h2>
            <p className="text-sm text-gray-500">Orders that have not completed payment yet.</p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            {pending.length} orders
          </span>
        </div>

        {pending.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {pending.map((order) => (
              <OrderCard key={order.id} order={order} status="pending" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">No pending orders.</p>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Completed orders</h2>
            <p className="text-sm text-gray-500">Orders already completed for your shop.</p>
          </div>
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            {completed.length} orders
          </span>
        </div>

        {completed.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {completed.map((order) => (
              <OrderCard key={order.id} order={order} status="completed" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">No completed orders.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default VendorOrdersPage;
