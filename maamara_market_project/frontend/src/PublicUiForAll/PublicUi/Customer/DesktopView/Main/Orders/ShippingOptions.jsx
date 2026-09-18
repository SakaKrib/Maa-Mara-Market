import React from "react";

export default function ShippingOptions({ options = [], selectedShipping, onSelect, error }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold text-gray-900">Shipping</h2>
        <p className="text-sm text-gray-500">Request a quote, then select one of the live DHL or FedEx rates.</p>
      </div>
      {options.map((option, index) => {
        const key = `${option.provider}-${option.service}-${option.currency}-${option.price}-${index}`;
        const selected =
          selectedShipping?.provider === option.provider &&
          selectedShipping?.service === option.service &&
          selectedShipping?.currency === option.currency &&
          String(selectedShipping?.price) === String(option.price);
        return (
          <button
            type="button"
            key={key}
            onClick={() => onSelect(option)}
            className={`w-full text-left rounded-xl border p-4 ${selected ? "border-blue-600 ring-2 ring-blue-100" : "border-gray-200"}`}
          >
            <div className="flex justify-between gap-4">
              <div>
                <div className="font-semibold">{option.provider}</div>
                <div className="text-sm text-gray-600">{option.service || "Standard service"}</div>
                {option.delivery_time && <div className="text-xs text-gray-500 mt-1">{String(option.delivery_time)}</div>}
              </div>
              <div className="font-semibold whitespace-nowrap">{option.currency} {option.price}</div>
            </div>
          </button>
        );
      })}
      {error?.message && <p className="text-sm text-red-600">{error.message}</p>}
    </section>
  );
}
