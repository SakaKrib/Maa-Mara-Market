import React, { useMemo, useState } from "react";
import { Mail, MapPin, Phone, Search, Users } from "lucide-react";
import { useVendorCustomers } from "../../Hooks/Customer/CustomerHookFetchForVendor";

const getInitials = (name) =>
  (name || "Customer")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const Customer = () => {
  const { customers = [], loading, error } = useVendorCustomers();
  const [search, setSearch] = useState("");

  const visibleCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) => {
      const name =
        customer.full_name ||
        `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
      return [
        name,
        customer.email,
        customer.phone_number,
        customer.city,
        customer.country,
      ].some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [customers, search]);

  return (
    <section className="w-full space-y-5 text-[#222]">
      <header className="flex flex-col gap-4 rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
            Customer relationships
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Customers
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#595959]">
            View the customers associated with your shop and their available contact details.
          </p>
        </div>
        <div className="flex w-fit items-center gap-3 rounded-xl border border-[#e6e6e4] bg-[#f8f8f6] px-4 py-3">
          <Users className="h-5 w-5 text-blue-700" aria-hidden="true" />
          <div>
            <p className="text-xs font-medium text-[#595959]">Customers</p>
            <p className="text-xl font-bold leading-6">{customers.length}</p>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-[#e6e6e4] bg-white p-4 shadow-sm sm:p-5">
        <label htmlFor="vendor-customer-search" className="mb-2 block text-sm font-semibold text-[#333]">
          Search customers
        </label>
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777]" aria-hidden="true" />
          <input
            id="vendor-customer-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, phone or location"
            className="min-h-11 w-full rounded-xl border border-[#d9d9d6] bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
          />
        </div>
      </div>

      {loading && (
        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-[#e6e6e4] bg-white p-6 text-sm text-[#595959] shadow-sm" role="status">
          <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-blue-600/20 border-t-blue-700" />
          Loading customers…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">
          <p className="font-semibold">Unable to load customers</p>
          <p className="mt-1">{error?.response?.data?.detail || error?.message || "Please try again later."}</p>
        </div>
      )}

      {!loading && !error && customers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#d7d7d3] bg-white p-10 text-center shadow-sm">
          <Users className="mx-auto h-8 w-8 text-[#777]" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">No customers yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#595959]">
            Customers associated with your shop will appear here when data is available.
          </p>
        </div>
      )}

      {!loading && !error && customers.length > 0 && visibleCustomers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#d7d7d3] bg-white p-8 text-center text-sm text-[#595959]">
          No customers match “{search.trim()}”.
        </div>
      )}

      {!loading && !error && visibleCustomers.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleCustomers.map((customer, index) => {
            const name =
              customer.full_name ||
              `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
              "Customer";
            const location = [customer.city, customer.country].filter(Boolean).join(", ");

            return (
              <article
                key={customer.email || customer.phone_number || name + index}
                className="min-w-0 rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex min-w-0 items-center gap-3 border-b border-[#eeeeeb] pb-4">
                  {customer.profile_picture ? (
                    <img
                      src={customer.profile_picture}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-[#e6e6e4]"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-800" aria-hidden="true">
                      {getInitials(name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold">{name}</h2>
                    <p className="mt-0.5 truncate text-xs text-[#777]">Shop customer</p>
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="flex min-w-0 items-start gap-2.5 rounded-xl bg-[#f8f8f6] p-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#666]" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-xs font-medium text-[#777]">Email</dt>
                      <dd className="mt-1 break-words text-sm font-medium">{customer.email || "Not provided"}</dd>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-start gap-2.5 rounded-xl bg-[#f8f8f6] p-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#666]" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-xs font-medium text-[#777]">Phone</dt>
                      <dd className="mt-1 break-words text-sm font-medium">{customer.phone_number || "Not provided"}</dd>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-start gap-2.5 rounded-xl bg-[#f8f8f6] p-3 sm:col-span-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#666]" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-xs font-medium text-[#777]">Location</dt>
                      <dd className="mt-1 break-words text-sm font-medium">{location || "Not provided"}</dd>
                    </div>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default Customer;
