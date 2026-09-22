import React from "react";

const Customer = () => (
  <section className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm sm:p-6">
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">Customers</p>
    <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Customers</h1>
    <p className="mt-1 text-sm leading-6 text-gray-600">Customer activity and purchase relationships for your store will appear here.</p>
    <div className="mt-6 rounded-2xl border border-dashed border-[#d7d7d3] bg-[#f8f8f6] p-8 text-center">
      <p className="text-sm font-semibold text-gray-700">No customers yet</p>
      <p className="mt-1 text-xs text-gray-500">Customers will appear after they interact with your store.</p>
    </div>
  </section>
);
export default Customer;
