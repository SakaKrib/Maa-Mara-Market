import React, { useState } from "react";
import { X } from "lucide-react";

const StockRangeModal = ({ open, onClose, items = [], refresh, updateStock }) => {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  if (!open) return null;

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditValue(String(item.in_stock ?? ""));
  };

  const saveUpdate = async (item) => {
    if (editValue === "" || Number.isNaN(Number(editValue))) return;
    try {
      const result = await updateStock(item.id, parseInt(editValue, 10));
      if (result?.success) {
        setEditingId(null);
        await refresh();
      }
    } catch (err) {
      console.error("Error updating stock:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/20 p-4">
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#e6e6e4] bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-range-title"
      >
        <header className="flex items-center justify-between border-b border-[#e6e6e4] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
              Inventory
            </p>
            <h2 id="stock-range-title" className="mt-1 text-lg font-bold text-[#222]">
              Items in stock
            </h2>
            <p className="mt-1 text-xs text-[#595959]">
              Review quantities and update stock directly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d9d9d6] text-[#595959] hover:bg-[#f8f8f6]"
            aria-label="Close stock items"
          >
            <X size={17} />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto bg-[#f8f8f6] p-4 sm:p-5">
          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#d7d7d3] bg-white p-6 text-center text-sm text-[#374151]">
                No items found.
              </div>
            ) : (
              items.map((item) => {
                const quantity = Number(item.in_stock) || 0;
                const critical = quantity < 10;
                const good = quantity > 20;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#e6e6e4] bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#222]">
                          {item.name || "Unnamed item"}
                        </p>
                        {editingId === item.id ? (
                          <input
                            type="number"
                            min="0"
                            value={editValue}
                            onChange={(event) => setEditValue(event.target.value)}
                            className="mt-2 w-full max-w-40 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-[#222] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
                          />
                        ) : (
                          <p className={`mt-1 text-xs font-semibold ${
                            critical ? "text-red-600" : good ? "text-green-700" : "text-amber-600"
                          }`}>
                            {critical ? "Critical stock" : good ? "Good stock" : "Watch stock"} · {quantity} available
                          </p>
                        )}
                      </div>

                      {editingId === item.id ? (
                        <div className="flex shrink-0 gap-2">
                          <button type="button" onClick={() => saveUpdate(item)} className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-[#262626]">Save</button>
                          <button type="button" onClick={() => setEditingId(null)} className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-[#222] hover:bg-gray-50">Cancel</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => startEditing(item)} className="shrink-0 rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-[#222] hover:bg-gray-50">
                          Update
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <footer className="flex justify-end border-t border-[#e6e6e4] bg-white px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#262626]">
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};

export default StockRangeModal;
