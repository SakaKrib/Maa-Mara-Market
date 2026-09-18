import React from "react";

export default function PaymentMethod({ register, error }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-gray-900">Payment method</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="rounded-xl border p-4 cursor-pointer">
          <input {...register("payment")} type="radio" value="Mpesa" className="mr-2" />
          M-Pesa
        </label>
        <label className="rounded-xl border p-4 cursor-pointer">
          <input {...register("payment")} type="radio" value="PayPal" className="mr-2" />
          PayPal
        </label>
      </div>
      {error?.message && <p className="text-sm text-red-600">{error.message}</p>}
    </section>
  );
}
