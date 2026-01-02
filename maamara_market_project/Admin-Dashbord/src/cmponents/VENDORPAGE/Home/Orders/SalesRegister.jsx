import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Stack,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import useMonthlySalesReport from "../../../Hooks/Sales/SalesReportHook";
import { tokens } from "../../../../theme";

const SalesReportPage = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const {
    sales = [],
    totalAmount = 0,
    availableMonths = [],
    loading,
    error,
  } = useMonthlySalesReport(year, month);

  const formatMonthLabel = (m) => {
    const date = new Date(m.year, m.month - 1);
    return date.toLocaleDateString("en-KE", { month: "short", year: "numeric" });
  };

  // Map and format data upfront
  const rows = sales.map((sale) => ({
    ...sale,
    id: sale.id,
    total_price_for_vendor: new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(sale.calculated_total_price ?? 0),
    formatted_date_sold: sale.date_sold
      ? new Date(sale.date_sold).toLocaleDateString("en-KE", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "",
  }));

  const columns = [
    {
      field: "item_name",
      headerName: "Item Name",
      flex: 1,
      minWidth: 150,
    },
    {
      field: "total_price_for_vendor",
      headerName: "Total Price (KES)",
      flex: 1,
      minWidth: 140,
    },
    {
      field: "quantity",
      headerName: "Qty Sold",
      flex: 0.5,
      minWidth: 100,
    },
    {
      field: "qty_remaining",
      headerName: "Qty Remaining",
      flex: 0.5,
      minWidth: 120,
    },
    {
      field: "formatted_date_sold",
      headerName: "Sold Date",
      flex: 0.7,
      minWidth: 140,
    },
  ];

  return (
    <Box
      sx={{
        p: 3,
        bgcolor: colors.primary[500],
        minHeight: "100vh",
      }}
    >
      <Typography variant="h4" gutterBottom color={colors.gray[100]}>
        Sales Report
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: "wrap" }}>
        {availableMonths.length === 0 && !loading && (
          <Typography color={colors.gray[300]}>
            No sales data available.
          </Typography>
        )}
        {availableMonths.map((m) => (
          <Button
          key={`${m.year}-${m.month}`}
          variant={m.year === year && m.month === month ? "contained" : "outlined"}
          onClick={() => {
            setYear(m.year);
            setMonth(m.month);
          }}
          color={m.year === year && m.month === month ? "primary" : "secondary"}
          sx={{
            mb: 1,
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor:
                m.year === year && m.month === month
                  ? colors.tealAccent[900]
                  : colors.blueAccent[400],
              transform: "scale(1.05)",
              boxShadow: 3,
            },
          }}
        >
          View Sales for {formatMonthLabel(m)}
        </Button>
        
        ))}
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Box
          sx={{
            height: 600,
            width: "100%",
            bgcolor: colors.primary[600],
            borderRadius: 2,
            boxShadow: 2,
            borderColor: colors.gray[700],
          }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 20, 50]}
            disableSelectionOnClick
            getRowId={(row) => row.id}
            sx={{
              color: colors.gray[100],
              borderColor: colors.primary[700],
              "& .MuiDataGrid-cell": {
                borderColor: colors.gray[700],
              },
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: colors.primary[800],
                color: colors.gray[100],
                borderBottom: `1px solid ${colors.gray[700]}`,
              },
              "& .MuiDataGrid-footerContainer": {
                backgroundColor: colors.primary[800],
                borderTop: `1px solid ${colors.gray[700]}`,
                color: colors.gray[100],
              },
              "& .MuiCheckbox-root": {
                color: `${colors.gray[100]} !important`,
              },
            }}
            components={{
              Footer: () => (
                <Box
                  key="footer-total-amount"
                  sx={{
                    p: 1,
                    textAlign: "left",
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                    backgroundColor: colors.primary[700],
                    color: colors.gray[100],
                  }}
                >
                  Total Amount:{" "}
                  {totalAmount != null
                    ? new Intl.NumberFormat("en-KE", {
                        style: "currency",
                        currency: "KES",
                      }).format(totalAmount)
                    : ""}
                    
                </Box>
              ),
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default SalesReportPage;
