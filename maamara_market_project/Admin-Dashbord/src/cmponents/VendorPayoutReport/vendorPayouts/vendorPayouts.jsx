import React, { useMemo } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useVendorPayoutHistory } from "../../../cmponents/Hooks/Payouts/Payouts";
import { tokens } from "../../../theme";
import Header from "../../../Header/Header";

const PayoutsPage = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { payouts, loading, error } = useVendorPayoutHistory();

  const cleanNumber = (value) => {
    if (value == null) return 0;
    if (typeof value === "string") return parseFloat(value.replace(/,/g, "")) || 0;
    if (typeof value === "number") return value;
    return 0;
  };

  const payoutsFormatted = useMemo(() => {
    return payouts.map((p) => {
      const month = p.payout_period_start
        ? new Date(p.payout_period_start).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
          })
        : "N/A";
  
      const payout_period = p.payout_period_start && p.payout_period_end
        ? `${new Date(p.payout_period_start).toLocaleDateString("en-GB")} - ${new Date(p.payout_period_end).toLocaleDateString("en-GB")}`
        : "N/A";
  
      return {
        id: p.id || `${p.reference}-${p.payout_period_start}`,
        reference: p.reference || "N/A",
        gross_sales: cleanNumber(p.gross_sales),
        amount: cleanNumber(p.amount),
        adjustment_amount: cleanNumber(p.adjustment_amount),
        month,
        payment_method: p.vendor?.payment_method,
        paid: p.paid || false,
        vendor_name: p.vendor
          ? `${p.vendor.surname_name || ""} ${p.vendor.middle_name || ""} ${p.vendor.first_name || ""}`.trim()
          : "N/A",
        vendor_email: p.vendor?.email || "N/A",
        payout_period_start: p.payout_period_start,
        payout_period,  // add this for display
      };
    });
  }, [payouts]);
  
  

  // Sort descending by payout_period_start date
  const sorted = useMemo(
    () =>
      [...payoutsFormatted].sort(
        (a, b) => new Date(b.payout_period_start) - new Date(a.payout_period_start)
      ),
    [payoutsFormatted]
  );

  const now = new Date();
  const currentMonthPayout = sorted.filter((p) => {
    const d = new Date(p.payout_period_start);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const currentMonth =
    currentMonthPayout.length > 0 ? currentMonthPayout : sorted.length > 0 ? [sorted[0]] : [];

  const currentIds = new Set(currentMonth.map((p) => p.id));
  const pastMonths = sorted.filter((p) => !currentIds.has(p.id));

  const totalCurrent = currentMonth.reduce((sum, p) => sum + p.amount, 0);
  const totalPast = pastMonths.reduce((sum, p) => sum + p.amount, 0);

  const formatKsh = (num) =>
    `Ksh ${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    const columns = [
      { field: "reference", headerName: "Reference", flex: 1 },
      {
        field: "gross_sales",
        headerName: "Gross Sales",
        flex: 1,
        renderCell: (params) => formatKsh(params.value || 0),
      },
      {
        field: "amount",
        headerName: "Net Payout",
        flex: 1,
        renderCell: (params) => formatKsh(params.value || 0),
      },
      {
        field: "adjustment_amount",
        headerName: "Adjustments",
        flex: 1,
        renderCell: (params) => formatKsh(params.value || 0),
      },
      { field: "month", headerName: "Month", flex: 1 },
      { field: "payment_method", headerName: "Payment Method", flex: 1.5 },
      { field: "payout_period", headerName: "Payout Period", flex: 1.5 },
      {
        field: "paid",
        headerName: "Paid",
        flex: 0.7,
        renderCell: (params) => (
          <span
            style={{
              color: params.value ? colors.greenAccent[500] : colors.redAccent[700],
              fontWeight: "600",
            }}
          >
            {params.value ? "🟢 Paid" : "🟡 Pending"}
          </span>
        ),
      },
      { field: "vendor_name", headerName: "Vendor Name", flex: 1.5 },
      { field: "vendor_email", headerName: "Vendor Email", flex: 1.5 },
    ];
    

  if (loading) return <Typography>Loading payouts...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!payouts?.length)
    return <Typography>No payout history available.</Typography>;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row", lg: "row" },
        gap: 4,
        p: 3,
        flexWrap: "wrap",
        maxWidth: "100%",
      }}
    >
      <Header title="Payouts" subtitle="Monthly Vendor Payouts Overview" />

      <Box sx={{ flex: 1, minHeight: 400, maxWidth: "100%" }}>
        <Typography variant="h6" gutterBottom sx={{ color: colors.gray[100] }}>
          Current Month Payout
        </Typography>

        <DataGrid
          rows={currentMonth}
          columns={columns}
          getRowId={(row) => row.id}
          pageSize={5}
          rowsPerPageOptions={[5]}
          sx={{
            backgroundColor: colors.primary[600],
            color: colors.gray[100],
            borderRadius: "12px",
          }}
          disableRowSelectionOnClick
          autoHeight
        />

        <Typography sx={{ mt: 2, color: colors.gray[100] }}>
          <strong>Total Current Month:</strong> {formatKsh(totalCurrent)}
        </Typography>
      </Box>

      <Box sx={{ flex: 2, minHeight: 400, maxWidth: "100%", mt:'-100px' }}>
        <Typography variant="h6" gutterBottom sx={{ color: colors.gray[100] }}>
          Previous Months
        </Typography>

        <DataGrid
          rows={pastMonths}
          columns={columns}
          getRowId={(row) => row.id}
          pageSize={6}
          rowsPerPageOptions={[6, 12, 100]}
          sx={{
            backgroundColor: colors.primary[600],
            color: colors.gray[100],
            borderRadius: "12px",
          }}
          disableRowSelectionOnClick
          autoHeight
        />

        <Typography sx={{ mt: 2, color: colors.gray[100] }}>
          <strong>Total Previous Months:</strong> {formatKsh(totalPast)}
        </Typography>
      </Box>
    </Box>
  );
};

export default PayoutsPage;
