import * as React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, Typography, CircularProgress } from "@mui/material";
import { useVendorCompleteItems } from "../../../Hooks/Order/OrderComplete";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../theme";

export default function VendorCompleteOrdersTable() {
  const { data, loading, error } = useVendorCompleteItems();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // 🧩 Safe number parser
  const cleanNumber = (value) => {
    if (value == null || value === "" || isNaN(value)) return 0;
    if (typeof value === "string") return parseFloat(value.replace(/,/g, "")) || 0;
    return Number(value) || 0;
  };

  // 💰 Currency formatter
  const formatKsh = (num) =>
    `KSh ${cleanNumber(num).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // 🌀 Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="300px">
        <CircularProgress />
      </Box>
    );
  }

  // ⚠️ Error state
  if (error) {
    return (
      <Typography color="error" align="center">
        {error}
      </Typography>
    );
  }

  // 🧠 Data extraction (✅ use completed_items)
  const completedItems = Array.isArray(data?.completed_items)
    ? data.completed_items
    : [];

  const totalQuantity = cleanNumber(data?.total_quantity);
  const totalValue = completedItems.reduce(
    (acc, item) =>
      acc + cleanNumber(item?.item_price) * cleanNumber(item?.quantity),
    0
  );

  // 🧮 Rows
  const rows = completedItems.map((item, idx) => ({
    id: `${item?.order_id || idx}-${item?.item_name || "unknown"}`,
    ...item,
  }));

  // 🧩 Columns
  const columns = [
    { field: "order_id", headerName: "Order ID", width: 100 },
    { field: "item_name", headerName: "Item", flex: 1, minWidth: 150 },

    {
      field: "quantity",
      headerName: "Qty",
      width: 90,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Typography>{cleanNumber(params.row.quantity).toLocaleString("en-KE")}</Typography>
      ),
    },
    {
      field: "item_price",
      headerName: "Price (KSh)",
      width: 140,
      renderCell: (params) => (
        <Typography>{formatKsh(params.row.item_price)}</Typography>
      ),
    },
    {
      field: "total_value",
      headerName: "Total (KSh)",
      width: 150,
      renderCell: (params) => {
        const total =
          cleanNumber(params.row.item_price) * cleanNumber(params.row.quantity);
        return <Typography>{formatKsh(total)}</Typography>;
      },
    },
    { field: "customer", headerName: "Customer", flex: 1, minWidth: 180 },
    {
      field: "order_status",
      headerName: "Status",
      width: 120,
      renderCell: (params) => (
        <Box
          sx={{
            backgroundColor:
              params.value === "completed"
                ? "#4ade80" // ✅ green for completed
                : params.value === "pending"
                ? "#facc15"
                : "#f87171",
            color: "#000",
            px: 1,
            py: 0.3,
            borderRadius: "8px",
            fontSize: "0.8rem",
            fontWeight: "600",
            textTransform: "capitalize",
            textAlign: "center",
            width: "100%",
          }}
        >
          {params.value || "N/A"}
        </Box>
      ),
    },
    {
      field: "created_at",
      headerName: "Created",
      width: 200,
      renderCell: (params) => {
        let raw = params.row.created_at;

        if (!raw) return "N/A";

        // 🧹 Clean up potential microseconds (".036789Z" → "Z")
        const cleanDateStr = raw.replace(/\.\d+Z$/, "Z");
        const date = new Date(cleanDateStr);

        if (isNaN(date.getTime())) {
          console.warn("Invalid date:", raw);
          return "N/A";
        }

        return date.toLocaleString("en-KE", {
          dateStyle: "medium",
          timeStyle: "short",
        });
      },
    },
  ];

  // 🎨 Render
  return (
    <Box
      sx={{
        height: 600,
        width: "100%",
        backgroundColor: colors.primary[500],
        borderRadius: 2,
        boxShadow: 3,
        p: 2,
      }}
    >
      <Typography
        variant="h6"
        fontWeight="bold"
        mb={2}
        sx={{ color: colors.gray[100] }}
      >
        Completed Orders ({data?.total_completed_items || 0})
      </Typography>

      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        pageSize={8}
        disableSelectionOnClick
        sx={{
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.primary[600],
            color: colors.gray[100],
            fontWeight: "bold",
          },
          "& .MuiDataGrid-cell": {
            color: colors.gray[100],
          },
          "& .MuiTablePagination-root": {
            color: colors.gray[100],
          },
          "& .MuiDataGrid-row:hover": {
            backgroundColor: `${colors.primary[700]}55`,
          },
        }}
      />

      <Box mt={2} textAlign="right">
        <Typography variant="body2" sx={{ color: colors.gray[100] }}>
          <strong>Total Quantity:</strong>{" "}
          {totalQuantity.toLocaleString("en-KE")}
        </Typography>
        <Typography variant="body2" sx={{ color: colors.gray[100] }}>
          <strong>Total Value:</strong> {formatKsh(totalValue)}
        </Typography>
      </Box>
    </Box>
  );
}
