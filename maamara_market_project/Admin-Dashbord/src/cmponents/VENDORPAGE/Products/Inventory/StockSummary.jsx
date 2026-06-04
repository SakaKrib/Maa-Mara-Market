import React, { useState } from "react";
import { useVendorStockItems } from "../../../Hooks/StockInventory/StockInventoryHook";
import "./StockSummaryBox.css";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../theme";
import StockRangeModal from "./StockModal";

const StockSummaryBox = () => {
  const { lowStockItems, highStockItems, loading, error, refresh, updateStock } =
    useVendorStockItems(); // ✅ make sure to include updateStock and refresh

  const [open, setOpen] = useState(false);
  const [modalItems, setModalItems] = useState([]);

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  if (loading) return <p>Loading stock info...</p>;
  if (error) return <p>Error loading stock info: {error.message}</p>;

  // Flatten all items
  const allItems = [...lowStockItems, ...highStockItems];

  // FILTER RANGES
  const critical = allItems.filter((item) => item.in_stock < 10);
  const range10to20 = allItems.filter(
    (item) => item.in_stock >= 10 && item.in_stock <= 20
  );
  const range20to30 = allItems.filter(
    (item) => item.in_stock > 20 && item.in_stock <= 30
  );
  const above50 = allItems.filter((item) => item.in_stock >= 50);

  const handleOpen = (items) => {
    setModalItems(items);
    setOpen(true);
  };

  return (
    <div className="stock-summary-box">
      <h3 className="title border-b rounded-full flex justify-center items-center">
        Stock Summary
      </h3>

      <div className="space-y-2">
        {/* LOW STOCK */}
        {critical.length > 0 && (
        <div className="row ">
          <div className="status low-stock">
            <span className="dot red_dot blinking"></span>
            
              <span className="text-sm" style={{color:colors.redAccent[500]}}>
              Low Stock ({critical.length})
            </span>
           
            <span className="blinking text-[10px] bg-red-800 font-semibold p-1 text-gray-200" >
              Critical
            </span>
            <p className="text-xs  restock" style={{color:colors.gray[100]}}>
              please restock ASAP!
            </p>
          </div>
          <button
            className="ring py-2 px-4 text-xs rounded-full hover:bg-blue-800"
            onClick={() => handleOpen(critical)}
          >
            View
          </button>
        </div> ) }

        {/* 10–20 STOCK */}
      {range10to20 > 0 &&(
        <div className="row">
          <div className="status mid-stock">
            <span className="dot yellow"></span>
            <span className="text-yellow-500 text-sm">
              Stock 10–20 ({range10to20.length})
            </span>
          </div>
          <button
            className="ring py-2 px-4 text-xs rounded-full hover:bg-blue-800"
            onClick={() => handleOpen(range10to20)}
          >
            View
          </button>
        </div>)}

        {/* 20–30 STOCK */}
        {range20to30 > 0 && (
        <div className="row">
          <div className="status mid-high-stock">
            <span className="dot blue"></span>
            <span className="text-blue-700 text-sm">
              Stock 20–30 ({range20to30.length})
            </span>
          </div>
          <button
            className="ring py-2 px-4 text-xs rounded-full hover:bg-blue-800"
            onClick={() => handleOpen(range20to30)}
          >
            View
          </button>
        </div>)}

        {/* 50+ STOCK */}
      {above50 > 0 && (
        <div className="row">
          <div className="status high-stock">
            <span className="dot green"></span>
            <span className="text-green-800 text-sm">
              50+ in Stock ({above50.length})
            </span>
          </div>
          <button
            className="ring py-2 px-4 text-xs rounded-full hover:bg-blue-800"
            onClick={() => handleOpen(above50)}
          >
            View
          </button>
        </div>)}
      </div>

      {/* ---------- USE EXTERNAL MODAL ---------- */}
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
