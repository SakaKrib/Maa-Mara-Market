"use client";
import React from "react";
import { Box, Typography, Avatar, useTheme } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import useVendorTransactions from "../../Hooks/TransactionHook/TransactionHook";
import { tokens } from "../../../theme";

const TransactionTable = () => {
  const { transactions, loading } = useVendorTransactions(); // ✅ Correct destructuring
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const rows = Array.isArray(transactions)
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
    : [];

  const columns = [
    { field: "transactionId", headerName: "Transaction ID", flex: 1 },
    { field: "mpesa_receipt_number", headerName: "Mpesa Receipt", flex: 1 },
    { field: "vendor_name", headerName: "Vendor", flex: 1 },
    { field: "order_id", headerName: "Order ID", flex: 1 },
    { field: "phone_number", headerName: "Phone", flex: 1 },
    { field: "amount", headerName: "Amount", flex: 1 },
    {
      field: "item_image",
      headerName: "Image",
      flex: 1,
      renderCell: (params) =>
        params.value ? (
          <Avatar
            src={params.value}
            alt={params.row.item_name}
            sx={{ width: 40, height: 40 }}
          />
        ) : (
          <Avatar sx={{ width: 40, height: 40 }} />
        ),
    },
    { field: "item_name", headerName: "Item Name", flex: 1.5 },
    { field: "item_price", headerName: "Price", flex: 1 },
    { field: "quantity_sold", headerName: "Qty Sold", flex: 1 },
    { field: "remaining_qty", headerName: "Remaining Qty", flex: 1 },
    {
      field: "created_at",
      headerName: "Date",
      flex: 1.2,
      valueGetter: (params) =>
        new Date(params.value).toLocaleString("en-KE", {
          dateStyle: "short",
          timeStyle: "short",
        }),
    },
  ];

  return (
    <Box sx={{ height: 600, width: "100%", p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, color: colors.gray[100] }}>
        Transaction Records
      </Typography>
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        pageSize={10}
        rowsPerPageOptions={[10, 25, 50]}
        sx={{
          "& .MuiDataGrid-columnHeaders": { backgroundColor: "#f5f5f5" },
        }}
      />
    </Box>
  );
};

export default TransactionTable;
