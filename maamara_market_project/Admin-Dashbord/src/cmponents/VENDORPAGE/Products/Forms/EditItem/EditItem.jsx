"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import ItemAddNew from "../AddingNewItem";

const EditItem = ({ vendor, item, onSuccess }) => {
  const itemId = item?.id ?? null;

  useEffect(() => {
    if (!itemId) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        window.dispatchEvent(new CustomEvent("maamara:close-edit-item"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [itemId]);

  const close = () => {
    window.dispatchEvent(new CustomEvent("maamara:close-edit-item"));
  };

  if (!itemId) {
    return null;
  }

  return (
    <div className="inline-flex">
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(
            new CustomEvent("maamara:open-edit-item", { detail: itemId })
          );
        }}
        className="inline-flex items-center rounded-lg bg-white px-2 py-1 text-xs font-semibold text-black transition hover:bg-gray-100"
      >
        Edit Item
      </button>

      <EditItemPanel
        item={item}
        itemId={itemId}
        vendor={vendor}
        onSuccess={onSuccess}
        close={close}
      />
    </div>
  );
};

const EditItemPanel = ({ item, itemId, vendor, onSuccess, close }) => {
  const isOpen = useEditItemOpen(itemId);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSuccess?.();
    close();
  };

  return (
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
      <div className="ml-auto flex h-full w-full flex-col overflow-hidden border-l border-border bg-card shadow-2xl sm:max-w-3xl lg:max-w-5xl">
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
            onClick={close}
            aria-label="Close edit item"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-card-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f8f8f6] px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
          <div className="mx-auto w-full max-w-5xl rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <ItemAddNew
              initialItem={item}
              vendorId={vendor?.id}
              itemId={itemId}
              vendor={vendor}
              isAdmin={Boolean(vendor?.isAdmin || vendor?.is_admin)}
              onSave={handleSave}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const useEditItemOpen = (itemId) => {
  const [open, setOpen] = React.useState(false);

  useEffect(() => {
    const handleOpen = (event) => {
      if (event.detail === itemId) {
        setOpen(true);
      }
    };

    const handleClose = () => setOpen(false);

    window.addEventListener("maamara:open-edit-item", handleOpen);
    window.addEventListener("maamara:close-edit-item", handleClose);

    return () => {
      window.removeEventListener("maamara:open-edit-item", handleOpen);
      window.removeEventListener("maamara:close-edit-item", handleClose);
    };
  }, [itemId]);

  return open;
};

export default EditItem;
