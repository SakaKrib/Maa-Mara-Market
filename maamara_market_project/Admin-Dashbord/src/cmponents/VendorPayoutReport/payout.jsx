import { useEffect, useState } from "react";
import {
  DataGrid,
} from "@mui/x-data-grid";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useTheme } from "@mui/material";
import { tokens } from "../../theme";
import api from "../../Services/Api";
import { useNavigate } from "react-router-dom";

const VendorReport = () => {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info", // "success" | "error" | "warning" | "info"
  });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/vendor-net-payout/", {
        withCredentials: true,
      });
      const formattedData = res.data.map((vendor) => ({
        id: vendor.vendor_id,
        Reference: vendor.details?.reference || `REF-${vendor.vendor_id}`,
        Amount: new Intl.NumberFormat("en-KE", {
          style: "currency",
          currency: "KES",
        }).format(vendor.net_payout),
        CreatedAt: vendor.month || "N/A",
        Paid: vendor.details?.paid ? "Yes" : "No",
        PaidAt: vendor.details?.paid_at
          ? new Date(vendor.details.paid_at).toLocaleDateString()
          : "Pending",
        VendorID: vendor.vendor_id,
        VendorName: vendor.vendor_name,
        VendorEmail: vendor.vendor_email,
        Adjustment: vendor.details?.adjustment_amount || 0,
      }));

      setReport(formattedData);
    } catch (err) {
      console.error("Error fetching payout report:", err);
      showSnackbar("Failed to load payout report.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // Snackbar helper
  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Confirmation dialog helper
  const openConfirmDialog = (title, message, onConfirm) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, title: "", message: "", onConfirm: null });
  };

  // Pay Single Vendor
  const handlePayVendor = (vendorId, vendorName) => {
    openConfirmDialog(
      "Confirm Payment",
      `Are you sure you want to pay ${vendorName}?`,
      async () => {
        closeConfirmDialog();
        setProcessing(true);
        try {
          await api.post(`/api/pay-vendor/${vendorId}/`, {}, { withCredentials: true });
          showSnackbar(`✅ Vendor "${vendorName}" paid successfully!`, "success");
          await fetchReport();
        } catch (err) {
          console.error(err);
          showSnackbar(`❌ Payment failed for "${vendorName}".`, "error");
        } finally {
          setProcessing(false);
        }
      }
    );
  };

  // Pay All Vendors
  const handlePayAll = () => {
    openConfirmDialog(
      "Confirm Payment",
      "Are you sure you want to pay all vendors for this month?",
      async () => {
        closeConfirmDialog();
        setProcessing(true);
        try {
          await api.post(`/api/pay-all-vendors/`, {}, { withCredentials: true });
          showSnackbar("✅ All vendors paid successfully!", "success");
          await fetchReport();
        } catch (err) {
          console.error(err);
          showSnackbar("❌ Failed to pay all vendors.", "error");
        } finally {
          setProcessing(false);
        }
      }
    );
  };

  const handlepay = () => {
    navigate('payment-trigger')
  }
  const columns = [
    { field: "Reference", headerName: "Reference", flex: 1 },
    { field: "Amount", headerName: "Amount", flex: 1 },
    { field: "CreatedAt", headerName: "Created At", flex: 1 },
    { field: "Paid", headerName: "Paid", flex: 0.5 },
    { field: "PaidAt", headerName: "Paid At", flex: 1 },
    { field: "VendorName", headerName: "Vendor Name", flex: 1 },
    { field: "VendorEmail", headerName: "Vendor Email", flex: 1.5 },
    { field: "Adjustment", headerName: "Adjustment", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <Button
          variant="contained"
          color="success"
          size="small"
          disabled={params.row.Paid === "Yes" || processing}
          onClick={() => handlePayVendor(params.row.VendorID, params.row.VendorName)}
        >
          {params.row.Paid === "Yes" ? "Paid" : "Pay Vendor"}
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ height: 650, width: "100%", padding: 2 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h5" sx={{ color: colors.gray[100] }}>
          Vendor Payout Report —{" "}
          {new Date().toLocaleDateString("en-KE", {
            month: "long",
            year: "numeric",
          })}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          disabled={processing}
          onClick={handlepay}
          className="hover:bg-blue-200 hover:text-blue-900 rounded-full"
        >
          {processing ? <CircularProgress size={24} /> : "💰 Pay All Vendors"}
        </Button>
      </Box>

      <DataGrid
        rows={report}
        columns={columns}
        pageSize={10}
        rowsPerPageOptions={[10, 25, 50]}
        disableSelectionOnClick
        loading={loading || processing}
      />

      {/* Snackbar for feedback messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={closeConfirmDialog}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={() => confirmDialog.onConfirm && confirmDialog.onConfirm()}
            color="primary"
            disabled={processing}
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VendorReport;
