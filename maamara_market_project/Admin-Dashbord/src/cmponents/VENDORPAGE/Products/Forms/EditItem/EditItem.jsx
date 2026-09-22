import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import ItemAddNew from "../AddingNewItem";

const EditItem = ({ vendor, item, onSuccess, isAdmin = false }) => {
  const itemId = item?.id ?? null;
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!itemId) {
    return null;
  }

  const close = () => setIsOpen(false);

  const handleSave = () => {
    onSuccess?.();
    close();
  };

  return (
    <div className="inline-flex">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center rounded-lg bg-white px-2 py-1 text-xs font-semibold text-black transition hover:bg-gray-100"
      >
        Edit Item
      </button>

      {isOpen && (
        <div
          className="fixed inset-x-0 bottom-0 top-16 z-[1000] bg-black/40 sm:top-20"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`edit-item-title-${itemId}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              close();
            }
          }}
        >
          <div className="flex h-full w-full flex-col overflow-hidden border-border bg-card shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                  Inventory
                </p>
                <h2
                  id={`edit-item-title-${itemId}`}
                  className="truncate text-lg font-bold text-card-foreground sm:text-xl"
                >
                  Edit Item
                </h2>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  Update the product details and save your changes.
                </p>
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  close();
                }}
                aria-label="Close edit item"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-card-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f8f8f6] px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
              <div className="w-full rounded-none border-0 bg-card p-3 shadow-none sm:p-5 lg:p-6">
                <ItemAddNew
                  initialItem={item}
                  vendorId={vendor?.id}
                  itemId={itemId}
                  vendor={vendor}
                  isAdmin={isAdmin || Boolean(vendor?.isAdmin || vendor?.is_admin)}
                  onSave={handleSave}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditItem;
