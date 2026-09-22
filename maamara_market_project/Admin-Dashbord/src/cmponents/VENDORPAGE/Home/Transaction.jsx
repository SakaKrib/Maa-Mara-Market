import React, { useMemo, useState } from "react";
import useVendorTransactions from "../../Hooks/TransactionHook/TransactionHook";

const TransactionTable = () => {
  const { transactions, loading } = useVendorTransactions();
  const [search, setSearch] = useState("");

  const rows = useMemo(
    () =>
      Array.isArray(transactions)
        ? transactions.flatMap((transaction) =>
            (transaction.items || []).map((item) => ({
              id: `${transaction.id}-${item.id}`,
              transactionId: transaction.id,
              mpesa_receipt_number: transaction.mpesa_receipt_number,
              vendor_name: transaction.vendor_name,
              order_id: transaction.order_id,
              phone_number: transaction.phone_number,
              amount: transaction.amount,
              created_at: transaction.created_at,
              item_name: item.name,
              item_price: item.price,
              item_image: item.image,
              quantity_sold: item.quantity_sold,
              remaining_qty: item.remaining_qty,
            }))
          )
        : [],
    [transactions]
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) =>
      [
        row.transactionId,
        row.mpesa_receipt_number,
        row.order_id,
        row.phone_number,
        row.vendor_name,
        row.item_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [rows, search]);

  const formatCurrency = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "KSh 0.00";
    return `KSh ${amount.toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const totalAmount = rows.reduce(
    (sum, row) => sum + (Number(row.amount) || 0),
    0
  );
  const totalItems = rows.reduce(
    (sum, row) => sum + (Number(row.quantity_sold) || 0),
    0
  );

  return (
    <section className="w-full space-y-6">
      <div className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
              Financial activity
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#222]">
              Transaction Records
            </h1>
            <p className="mt-1 text-sm text-[#595959]">
              Review transactions, payments, items sold, and remaining stock.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="min-w-[140px] rounded-xl border border-[#e6e6e4] bg-[#f8f8f6] px-4 py-3">
              <p className="text-xs font-medium text-[#595959]">Transaction lines</p>
              <p className="mt-1 text-lg font-bold text-[#222]">{rows.length}</p>
            </div>
            <div className="min-w-[140px] rounded-xl border border-[#e6e6e4] bg-[#f8f8f6] px-4 py-3">
              <p className="text-xs font-medium text-[#595959]">Items sold</p>
              <p className="mt-1 text-lg font-bold text-[#222]">{totalItems}</p>
            </div>
            <div className="min-w-[160px] rounded-xl border border-[#e6e6e4] bg-[#f8f8f6] px-4 py-3">
              <p className="text-xs font-medium text-[#595959]">Recorded amount</p>
              <p className="mt-1 text-lg font-bold text-[#222]">
                {formatCurrency(totalAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e6e6e4] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#eeeeeb] p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-bold text-[#222]">All transactions</h2>
            <p className="text-sm text-[#777]">
              {loading ? "Refreshing transaction data..." : `${filteredRows.length} records shown`}
            </p>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transactions..."
            className="w-full rounded-xl border border-[#d9d9d6] bg-white px-4 py-2.5 text-sm text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 md:max-w-xs"
            aria-label="Search transactions"
          />
        </div>

        {loading && rows.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center p-8">
            <div className="flex flex-col items-center gap-3 text-sm text-[#595959]">
              <div
                className="h-8 w-8 animate-spin rounded-full border-4 border-[#2563eb]/20 border-t-[#2563eb]"
                aria-label="Loading transactions"
              />
              Loading transactions...
            </div>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl text-[#2563eb]">
              ₵
            </div>
            <h3 className="mt-4 text-lg font-semibold text-[#222]">
              {search ? "No matching transactions" : "No transactions yet"}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#595959]">
              {search
                ? "Try a different transaction ID, order ID, receipt, phone number, or item name."
                : "Transactions will appear here when customer purchases are recorded."}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 rounded-xl border border-[#d9d9d6] px-4 py-2 text-sm font-semibold text-[#222] transition hover:bg-[#f8f8f6]"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-[1200px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#e6e6e4] bg-[#f8f8f6] text-xs uppercase tracking-wide text-[#595959]">
                    <th className="px-4 py-3 font-semibold">Transaction</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-4 py-3 font-semibold">Order</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Qty</th>
                    <th className="px-4 py-3 font-semibold">Remaining</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[#eeeeeb] last:border-0 hover:bg-[#fcfcfa]"
                    >
                      <td className="px-4 py-4 align-top">
                        <p className="font-semibold text-[#222]">#{row.transactionId}</p>
                        <p className="mt-1 text-xs text-[#777]">{row.vendor_name || "Your shop"}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-[#222]">
                          {row.mpesa_receipt_number || "—"}
                        </p>
                        <p className="mt-1 text-xs text-[#777]">{row.phone_number || "—"}</p>
                      </td>
                      <td className="px-4 py-4 align-top font-medium text-[#222]">
                        {row.order_id || "—"}
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-[#595959]">
                        {row.phone_number || "—"}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex min-w-[180px] items-center gap-3">
                          {row.item_image ? (
                            <img
                              src={row.item_image}
                              alt={row.item_name || "Item"}
                              className="h-10 w-10 shrink-0 rounded-lg border border-[#e6e6e4] object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f8f8f6] text-xs text-[#999]">
                              —
                            </div>
                          )}
                          <span className="font-medium text-[#222]">
                            {row.item_name || "Unnamed item"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-sm font-semibold text-[#222]">
                        {formatCurrency(row.item_price)}
                      </td>
                      <td className="px-4 py-4 align-top text-sm font-semibold text-[#222]">
                        {row.quantity_sold ?? 0}
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-[#595959]">
                        {row.remaining_qty ?? 0}
                      </td>
                      <td className="px-4 py-4 align-top text-sm font-bold text-[#222]">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-4 py-4 align-top whitespace-nowrap text-xs text-[#777]">
                        {formatDate(row.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[#eeeeeb] lg:hidden">
              {filteredRows.map((row) => (
                <article key={row.id} className="p-4 sm:p-5">
                  <div className="flex gap-3">
                    {row.item_image ? (
                      <img
                        src={row.item_image}
                        alt={row.item_name || "Item"}
                        className="h-14 w-14 shrink-0 rounded-xl border border-[#e6e6e4] object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#f8f8f6] text-xs text-[#999]">
                        —
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-[#222]">
                        {row.item_name || "Unnamed item"}
                      </h3>
                      <p className="mt-1 text-xs text-[#777]">
                        Transaction #{row.transactionId} · Order {row.order_id || "—"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#222]">
                        {formatCurrency(row.amount)}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-[#f8f8f6] p-3">
                      <dt className="text-xs text-[#777]">Receipt</dt>
                      <dd className="mt-1 break-words text-xs font-semibold text-[#222]">
                        {row.mpesa_receipt_number || "—"}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-[#f8f8f6] p-3">
                      <dt className="text-xs text-[#777]">Phone</dt>
                      <dd className="mt-1 break-words text-xs font-semibold text-[#222]">
                        {row.phone_number || "—"}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-[#f8f8f6] p-3">
                      <dt className="text-xs text-[#777]">Price</dt>
                      <dd className="mt-1 text-xs font-semibold text-[#222]">
                        {formatCurrency(row.item_price)}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-[#f8f8f6] p-3">
                      <dt className="text-xs text-[#777]">Quantity</dt>
                      <dd className="mt-1 text-xs font-semibold text-[#222]">
                        {row.quantity_sold ?? 0} sold · {row.remaining_qty ?? 0} left
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-3 text-xs text-[#777]">{formatDate(row.created_at)}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default TransactionTable;
