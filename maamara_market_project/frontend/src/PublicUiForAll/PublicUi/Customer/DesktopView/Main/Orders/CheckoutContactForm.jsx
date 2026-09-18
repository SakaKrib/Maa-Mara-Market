import React from "react";

export default function CheckoutContactForm({ register, errors, countries }) {
  const field = (name, label, type = "text", required = true) => (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        {...register(name)}
        type={type}
        className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        required={required}
      />
      {errors?.[name]?.message && <span className="text-sm text-red-600">{errors[name].message}</span>}
    </label>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {field("firstName", "First name")}
      {field("lastName", "Last name")}
      {field("email", "Email", "email")}
      {field("phone", "Phone")}
      <div className="md:col-span-2">{field("address", "Street address")}</div>
      {field("apartment", "Apartment / unit", "text", false)}
      {field("city", "City")}
      {field("state", "State / county", "text", false)}
      {field("zip", "ZIP / postal code")}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Country</span>
        <select {...register("country")} className="rounded-lg border border-gray-300 px-3 py-2 bg-white">
          <option value="">Select country</option>
          {(countries || []).map((country) => (
            <option key={country.code} value={country.code}>{country.name}</option>
          ))}
        </select>
        {errors?.country?.message && <span className="text-sm text-red-600">{errors.country.message}</span>}
      </label>
    </div>
  );
}
