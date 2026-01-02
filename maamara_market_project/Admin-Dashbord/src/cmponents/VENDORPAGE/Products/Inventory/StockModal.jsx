import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField,
  useTheme
} from "@mui/material";
import { tokens } from "../../../../theme";

const StockRangeModal = ({ open, onClose, items, refresh, updateStock }) => {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditValue(item.in_stock);
  };

  const saveUpdate = async (item) => {
    console.log("💾 Saving update for:", item);
    console.log("📤 New stock value:", editValue);

    if (editValue === "" || isNaN(editValue)) {
      console.warn("⚠️ Invalid stock value:", editValue);
      return;
    }

    try {
      const result = await updateStock(item.id, parseInt(editValue));

      if (result.success) {
        console.log("✅ Stock updated successfully");
        setEditingId(null);
        refresh();
      } else {
        console.error("❌ Failed to update stock:", result.error);
      }
    } catch (err) {
      console.error("❌ Error updating stock:", err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle className="font-bold text-lg">Items in Stock Range</DialogTitle>

      <DialogContent dividers className="space-y-4" style={{ backgroundColor: colors.primary[800] }}>
        {items.length === 0 && (
          <p className="text-gray-500 text-sm">No items found in this range.</p>
        )}

        {items.map(item => (
          <div
            key={item.id}
            className="p-3 border rounded-lg flex justify-between items-center"
          >
            <div>
              <p className="font-semibold">{item.name}</p>

              {editingId === item.id ? (
                <TextField
                  size="small"
                  type="number"
                  value={editValue}
                  onChange={(e) => {
                    console.log("⌨️ Typing:", e.target.value);
                    setEditValue(e.target.value);
                  }}
                  className="mt-1"
                  label="Stock"
                />
              ) : (
                <p className="text-sm text-gray-500">In Stock: {item.in_stock}</p>
              )}
            </div>

            {editingId === item.id ? (
              <div className="flex gap-2">
                <Button variant="contained" onClick={() => saveUpdate(item)} className="hover:text-green-500">
                  Save
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    console.log("❌ Cancel editing for:", item.id);
                    setEditingId(null);
                  }}
                  style={{ color: colors.gray[100] }}
                  className="hover:bg-red-500"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outlined"
                onClick={() => startEditing(item)}
                className="hover:bg-blue-400"
                style={{ color: colors.gray[100] }}
              >
                Update
              </Button>
            )}
          </div>
        ))}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} style={{ color: colors.redAccent[500] }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StockRangeModal;
