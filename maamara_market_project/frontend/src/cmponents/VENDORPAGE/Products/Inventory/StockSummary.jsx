import React, { useMemo, useState } from "react";
import { useVendorStockItems } from "../../../Hooks/StockInventory/StockInventoryHook";
import StockRangeModal from "./StockModal";

const StockSummaryBox = () => {
  const { lowStockItems, highStockItems, loading, error, refresh, updateStock } =
    useVendorStockItems();
  const [open, setOpen] = useState(false);
  const [modalItems, setModalItems] = useState([]);

  const allItems = useMemo(() => {
    const map = new Map();
    [...(lowStockItems || []), ...(highStockItems || [])].forEach((item) => {
      if (item?.id != null) map.set(item.id, item);
    });
    return [...map.values()].sort(
      (a, b) => (Number(a.in_stock) || 0) - (Number(b.in_stock) || 0)
    );
  }, [lowStockItems, highStockItems]);

  const criticalCount = allItems.filter((item) => Number(item.in_stock) < 10).length;

  const handleOpen = (items = allItems) => {
    setModalItems(items);
    setOpen(true);
  };

  if (loading) {
    return <p className="text-sm text-[#595959]">Loading stock information...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">Error loading stock information.</p>;
  }

  return (
    <div className="flex min-h-[136px] min-w-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-[#e6e6e4] pb-3">
        <div>
          <h3 className="text-base font-bold text-[#222] sm:text-lg">Stock Summary</h3>
          <p className="mt-0.5 text-xs text-[#595959]">
            {allItems.length} item{allItems.length === 1 ? "" : "s"} tracked
          </p>
        </div>
        {criticalCount > 0 && (
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">
            {criticalCount} critical
          </span>
        )}
      </div>

      <div className="mt-3 max-h-[230px] space-y-2 overflow-y-auto pr-1">
        {allItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d7d7d3] bg-[#f8f8f6] p-4 text-sm text-[#374151]">
            No inventory items available.
          </div>
        ) : (
          allItems.map((item) => {
            const quantity = Number(item.in_stock) || 0;
            const critical = quantity < 10;
            const good = quantity > 20;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#eeeeeb] bg-[#fcfcfa] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#222]">
                    {item.name || "Unnamed item"}
                  </p>
                  <p
                    className={`mt-0.5 text-xs font-semibold ${
                      critical
                        ? "text-red-600"
                        : good
                        ? "text-green-700"
                        : "text-amber-600"
                    }`}
                  >
                    {critical ? "Critical stock" : good ? "Good stock" : "Watch stock"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                    critical
                      ? "bg-red-50 text-red-700"
                      : good
                      ? "bg-green-50 text-green-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {quantity}
                </span>
              </div>
            );
          })
        )}
      </div>

      <button
        type="button"
        onClick={() => handleOpen(allItems)}
        className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-[#d9d9d6] bg-white px-4 py-2 text-xs font-semibold text-[#222] transition hover:bg-[#f8f8f6]"
      >
        View all items
      </button>

      <StockRangeModal
        open={open}
        onClose={() => setOpen(false)}
        items={modalItems}
        refresh={refresh}
        updateStock={updateStock}
      />
    </div>
  );
};

export default StockSummaryBox;
