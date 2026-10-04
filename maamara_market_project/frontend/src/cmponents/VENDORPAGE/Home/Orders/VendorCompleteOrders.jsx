import React from "react";
import { useVendorCompleteItems } from "../../../Hooks/Order/OrderComplete";

const money = (value) => `KSh ${(Number(value) || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function VendorCompleteOrdersTable() {
  const { data, loading, error } = useVendorCompleteItems();
  const items = Array.isArray(data?.completed_items) ? data.completed_items : [];
  const totalQuantity = Number(data?.total_quantity) || 0;
  const totalValue = items.reduce((sum, item) => sum + (Number(item?.item_price) || 0) * (Number(item?.quantity) || 0), 0);

  if (loading) return <section className="rounded-2xl border border-[#e6e6e4] bg-white p-6 text-sm text-gray-500">Loading completed orders...</section>;
  if (error) return <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load completed orders.</section>;

  return (
    <section className="rounded-2xl border border-[#e6e6e4] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-green-700">Orders</p>
          <h2 className="mt-1 text-xl font-bold text-gray-900">Completed orders</h2>
          <p className="mt-1 text-sm text-gray-500">Completed sales containing your products.</p>
        </div>
        <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">{items.length} line items</span>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d7d7d3] bg-[#f8f8f6] p-8 text-center">
          <p className="text-sm font-semibold text-gray-700">No completed orders yet</p>
          <p className="mt-1 text-xs text-gray-500">Completed sales will appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#e6e6e4]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#f8f8f6] text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>{["Order ID","Item","Qty","Price","Total","Customer","Status","Created"].map((h)=><th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#eeeeeb]">
              {items.map((item,index)=>{const total=(Number(item?.item_price)||0)*(Number(item?.quantity)||0);return <tr key={`${item?.order_id||index}-${item?.item_name||"item"}`} className="hover:bg-[#fcfcfa]">
                <td className="px-4 py-3 font-semibold text-gray-900">#{item?.order_id??"—"}</td>
                <td className="px-4 py-3 text-gray-700">{item?.item_name||"Item unavailable"}</td>
                <td className="px-4 py-3">{Number(item?.quantity||0).toLocaleString("en-KE")}</td>
                <td className="px-4 py-3">{money(item?.item_price)}</td><td className="px-4 py-3 font-semibold">{money(total)}</td>
                <td className="px-4 py-3 text-gray-600">{item?.customer||"Customer"}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold capitalize text-green-700">{item?.order_status||"completed"}</span></td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">{item?.created_at?new Date(item.created_at).toLocaleString("en-KE",{dateStyle:"medium",timeStyle:"short"}):"—"}</td>
              </tr>})}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-5 border-t border-[#e6e6e4] pt-4 text-sm">
        <span className="text-gray-600"><strong className="text-gray-900">Total quantity:</strong> {totalQuantity.toLocaleString("en-KE")}</span>
        <span className="text-gray-600"><strong className="text-gray-900">Total value:</strong> {money(totalValue)}</span>
      </div>
    </section>
  );
}
