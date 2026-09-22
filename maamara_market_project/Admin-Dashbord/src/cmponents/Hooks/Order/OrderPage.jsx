import React from "react";
import { useVendorOrdersCombined } from "./CombinedOrderHook";

const truncate = (text, length = 40) => {
  if (!text || typeof text !== "string") return "Unnamed Item";
  return text.length > length ? `${text.substring(0, length)}…` : text;
};

const formatKes = (value) =>
  `KSh ${Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const OrderCard = ({ order, status }) => (
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
              : "bg-green-50 text-green-700"
          }`}
        >
          {status === "pending" ? "Pending" : "Completed"}
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
              {truncate(item?.item?.name)}
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
  </article>
);

const VendorOrdersPage = () => {
  const { pending = [], completed = [], loading, error } = useVendorOrdersCombined();

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium text-gray-600">Loading orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h5 className="font-semibold text-red-800">Unable to load orders</h5>
        <p className="mt-1 text-sm text-red-700">{String(error)}</p>
      </div>
    );
  }

  const pendingTotal = pending.reduce(
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
            Track pending and completed orders assigned to your vendor account.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase text-amber-700">Pending</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{pending.length}</p>
            <p className="text-xs text-gray-500">{formatKes(pendingTotal)}</p>
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
            <h2 className="text-lg font-bold text-gray-900">Pending orders</h2>
            <p className="text-sm text-gray-500">Orders that still require attention.</p>
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
