"use client";

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../../../../../components/ui/sheet";
import { ScrollArea } from "../../../../../../components/ui/scroll-area";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../../theme";
import ItemAddNew from "../AddingNewItem";

const EditItem = ({ vendor, item, onSuccess }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // Item data can briefly be unavailable while the parent refreshes.
  // Always resolve the id through optional chaining so the edit trigger
  // can never dereference a null item.
  const itemId = item?.id ?? null;

  if (!itemId) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger className="text-black px-2 py-1 rounded bg-white h-fit">
        <span className="px-1 p-0 rounded">Edit Item</span>
      </SheetTrigger>

      <SheetContent
        side="right"
        style={{
          backgroundColor: colors.primary[500],
          maxHeight: "90vh",
          overflowY: "auto",
          top: "100px",
          minWidth: "500px",
          padding: "1em",
          zIndex: 100,
        }}
      >
        <ScrollArea className="h-full w-full px-4 mt-10 absolute left-2">
          <SheetHeader>
            <SheetTitle
              className="mb-4"
              style={{ color: colors.blueAccent[100] }}
            >
              Edit Item
            </SheetTitle>
            <SheetDescription>
              Fill in the details below to update your item.
            </SheetDescription>
          </SheetHeader>

          <div className="relative top-10">
            <ItemAddNew
              initialItem={item}
              vendorId={vendor?.id}
              itemId={itemId}
              vendor={vendor}
              isAdmin={Boolean(vendor?.isAdmin || vendor?.is_admin)}
              onSave={() => {
                onSuccess?.();
              }}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default EditItem;
