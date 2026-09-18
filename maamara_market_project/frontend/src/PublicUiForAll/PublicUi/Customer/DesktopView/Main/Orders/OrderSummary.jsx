import React from "react";

export default function OrderSummary({ order, subtotal = 0, shippingCost = 0 }) {
  const itemCount = (order?.items || []).reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
  const total = subtotal + shippingCost;
  return (
    <aside className="bg-white p-6 rounded-2xl shadow-md h-fit">
      <h2 className="text-lg font-semibold mb-4">Order summary</h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between"><span>Items ({itemCount})</span><span>KES {subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Shipping</span><span>{shippingCost ? `KES ${shippingCost.toFixed(2)}` : "Select a rate"}</span></div>
        <div className="border-t pt-3 flex justify-between text-base font-semibold"><span>Total</span><span>KES {total.toFixed(2)}</span></div>
      </div>
    </aside>
  );
}
