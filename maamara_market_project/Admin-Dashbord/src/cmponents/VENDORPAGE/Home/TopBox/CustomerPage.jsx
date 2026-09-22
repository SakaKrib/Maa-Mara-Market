import React from "react";
import { useVendorCustomers } from "../../../Hooks/Customer/CustomerHookFetchForVendor";
import { useAuth } from "../../../Auth/AuthContext/Context";
import { Link } from "react-router-dom";

const getColorForLetter = (letter) => {
  const colors = [
    "bg-red-400", "bg-pink-400", "bg-purple-400", "bg-blue-400",
    "bg-teal-400", "bg-green-400", "bg-yellow-400", "bg-orange-400",
    "bg-stone-400", "bg-slate-400", "bg-red-500", "bg-pink-500",
    "bg-purple-500", "bg-blue-500", "bg-teal-500", "bg-green-500",
    "bg-yellow-500", "bg-orange-500", "bg-stone-500", "bg-slate-500",
  ];

  if (!letter) return "bg-slate-500";

  const index =
    (letter.toUpperCase().charCodeAt(0) - 65 + colors.length) % colors.length;

  return colors[index];
};

const CustomerPage = () => {
  const { user } = useAuth();
  const vendorUserId = user?.id;
  const { customers = [], loading, error } = useVendorCustomers(vendorUserId);

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f1641e]">
            Customer management
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#222]">
            Customers
          </h1>
          <p className="mt-1 text-sm text-[#595959]">
            Customers associated with your shop.
          </p>
        </div>

        <div className="rounded-xl border border-[#e6e6e4] bg-[#f8f8f6] px-4 py-3">
          <p className="text-xs font-medium text-[#595959]">Total customers</p>
          <p className="text-xl font-bold text-[#222]">{customers.length}</p>
        </div>
      </div>

      {loading && (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-[#e6e6e4] bg-white shadow-sm">
          <div className="flex flex-col items-center gap-3 text-sm text-[#595959]">
            <div
              className="h-8 w-8 animate-spin rounded-full border-4 border-[#f1641e]/20 border-t-[#f1641e]"
              aria-label="Loading customers"
            />
            Loading customers...
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">Unable to load customers</p>
          <p className="mt-1">
            {error.message || "Something went wrong while loading your customers."}
          </p>
        </div>
      )}

      {!loading && !error && customers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#d7d7d3] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0e8] text-xl text-[#f1641e]">
            👥
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[#222]">
            No customers yet
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#595959]">
            Customers will appear here as they interact with your shop.
          </p>
          <Link
            to="/vendors-dashboard"
            className="mt-5 inline-flex items-center rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
          >
            Back to dashboard
          </Link>
        </div>
      )}

      {!loading && !error && customers.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {customers.map((customer) => {
            const fullName =
              customer.full_name ||
              `${customer.first_name || ""} ${customer.last_name || ""}`.trim();

            const initials = (fullName || "Guest User")
              .split(" ")
              .filter(Boolean)
              .map((name) => name[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            const bgColor = getColorForLetter(initials[0]);

            return (
              <article
                key={customer.id}
                className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex min-w-0 items-center gap-4 border-b border-[#eeeeeb] pb-4">
                  {customer.profile_picture ? (
                    <img
                      src={customer.profile_picture}
                      alt={fullName || "Customer profile"}
                      className="h-14 w-14 shrink-0 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-[#e6e6e4]"
                    />
                  ) : (
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-sm ${bgColor}`}
                      aria-hidden="true"
                    >
                      {initials}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold text-[#222]">
                      {fullName || "Guest User"}
                    </h2>
                    <p className="mt-0.5 truncate text-sm text-[#595959]">
                      {customer.email || "No email"}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#f8f8f6] p-3">
                    <dt className="text-xs font-medium text-[#777]">Phone</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-[#222]">
                      {customer.phone_number || "N/A"}
                    </dd>
                  </div>

                  <div className="rounded-xl bg-[#f8f8f6] p-3">
                    <dt className="text-xs font-medium text-[#777]">City</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-[#222]">
                      {customer.city || "Nairobi"}
                    </dd>
                  </div>

                  <div className="rounded-xl bg-[#f8f8f6] p-3">
                    <dt className="text-xs font-medium text-[#777]">Country</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-[#222]">
                      {customer.country || "N/A"}
                    </dd>
                  </div>

                  <div className="rounded-xl bg-[#f8f8f6] p-3">
                    <dt className="text-xs font-medium text-[#777]">Loyalty points</dt>
                    <dd className="mt-1 text-sm font-semibold text-[#222]">
                      {customer.loyalty_points ?? 0}
                    </dd>
                  </div>

                  <div className="rounded-xl bg-[#f8f8f6] p-3 sm:col-span-2">
                    <dt className="text-xs font-medium text-[#777]">Address</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-[#222]">
                      {customer.address || "N/A"}
                    </dd>
                  </div>

                  <div className="rounded-xl bg-[#f8f8f6] p-3 sm:col-span-2">
                    <dt className="text-xs font-medium text-[#777]">Billing address</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-[#222]">
                      {customer.billing_address
                        ? JSON.stringify(customer.billing_address)
                        : "N/A"}
                    </dd>
                  </div>

                  <div className="rounded-xl bg-[#f8f8f6] p-3 sm:col-span-2">
                    <dt className="text-xs font-medium text-[#777]">Visitor ID</dt>
                    <dd className="mt-1 break-all font-mono text-xs font-semibold text-[#222]">
                      {customer.visitor_id || "N/A"}
                    </dd>
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

export default CustomerPage;
