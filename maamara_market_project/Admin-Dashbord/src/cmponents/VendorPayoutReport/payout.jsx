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

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

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
      const res = await api.get("/api/admin-payouts/", {
        withCredentials: true,
      });

      const payouts = Array.isArray(res.data)
        ? res.data
        : res.data?.results || [];

      const formattedData = payouts.map((payout) => ({
        id: payout.id || payout.reference,
        Reference: payout.reference || `REF-${payout.id}`,
        Amount: new Intl.NumberFormat("en-KE", {
          style: "currency",
          currency: "KES",
        }).format(Number(payout.amount || payout.net_payout || 0)),
        CreatedAt: payout.payout_period_start || payout.created_at || "N/A",
        Paid: payout.paid ? "Yes" : "No",
        PaidAt: payout.paid_at
          ? new Date(payout.paid_at).toLocaleDateString()
          : payout.paid
            ? "Completed"
            : "Pending",
        VendorID: payout.vendor_id || payout.vendor?.id,
        VendorName:
          payout.vendor_name ||
          payout.vendor?.company_name ||
          [
            payout.vendor?.surname_name,
            payout.vendor?.middle_name,
            payout.vendor?.first_name,
          ]
            .filter(Boolean)
            .join(" ") ||
          "N/A",
        VendorEmail: payout.vendor_email || payout.vendor?.email || "N/A",
        Adjustment: Number(payout.adjustment_amount || 0),
        PaymentMethod: payout.vendor?.payment_method || "N/A",
        PayoutReference: payout.reference,
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

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const openConfirmDialog = (title, message, onConfirm) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      title: "",
      message: "",
      onConfirm: null,
    });
  };

  const handlePayVendor = (reference, vendorName) => {
    if (!reference) {
      showSnackbar("This payout has no valid reference.", "error");
      return;
    }

    openConfirmDialog(
      "Confirm Payout Submission",
      `Submit payout ${reference} for ${vendorName}? A successful provider submission is not the same as final settlement.`,
      async () => {
        closeConfirmDialog();
        setProcessing(true);

        try {
          const response = await api.post(
            `/api/vendor/payout/${encodeURIComponent(reference)}/pay/`,
            {},
            { withCredentials: true }
          );

          showSnackbar(
            response.data?.message ||
              `Payout submitted for "${vendorName}". Awaiting provider confirmation.`,
            "success"
          );
          await fetchReport();
        } catch (err) {
          const message =
            err.response?.data?.error ||
            err.response?.data?.detail ||
            `Payout submission failed for "${vendorName}".`;
          console.error("Payout submission failed:", err);
          showSnackbar(message, "error");
        } finally {
          setProcessing(false);
        }
      }
    );
  };

  const handlePayAll = () => {
    openConfirmDialog(
      "Confirm All Payout Submissions",
      "Submit all currently unpaid vendor payouts for the current payout period? Provider submission will remain pending until the provider confirms settlement.",
      async () => {
        closeConfirmDialog();
        setProcessing(true);

        try {
          const response = await api.post(
            "/api/payout/process-payouts-by-group/",
            {},
            { withCredentials: true }
          );

          showSnackbar(
            response.data?.status === "completed"
              ? "Payout submissions completed. Provider confirmation is still required."
              : "Payout submissions were sent for processing.",
            "success"
          );
          await fetchReport();
        } catch (err) {
          const message =
            err.response?.data?.error ||
            err.response?.data?.detail ||
            "Failed to process vendor payouts.";
          console.error("Bulk payout processing failed:", err);
          showSnackbar(message, "error");
        } finally {
          setProcessing(false);
        }
      }
    );
  };

  const handlepay = () => {
    navigate("payment-trigger");
  };

  const columns = [
    { field: "Reference", headerName: "Reference", flex: 1.1, minWidth: 130 },
    { field: "Amount", headerName: "Amount", flex: 1, minWidth: 120 },
    { field: "CreatedAt", headerName: "Period", flex: 1, minWidth: 110 },
    { field: "Paid", headerName: "Paid", flex: 0.6, minWidth: 80 },
    { field: "PaidAt", headerName: "Paid At", flex: 1, minWidth: 100 },
    { field: "VendorName", headerName: "Vendor Name", flex: 1.2, minWidth: 150 },
    { field: "VendorEmail", headerName: "Vendor Email", flex: 1.5, minWidth: 180 },
    { field: "PaymentMethod", headerName: "Method", flex: 1, minWidth: 120 },
    { field: "Adjustment", headerName: "Adjustment", flex: 1, minWidth: 110 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      minWidth: 130,
      renderCell: (params) => (
        <Button
          variant="contained"
          color="success"
          size="small"
          disabled={params.row.Paid === "Yes" || processing}
          onClick={() =>
            handlePayVendor(
              params.row.PayoutReference,
              params.row.VendorName
            )
          }
        >
          {params.row.Paid === "Yes" ? "Paid" : "Submit Payout"}
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
        gap={2}
        flexWrap="wrap"
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
          onClick={handlePayAll}
          className="hover:bg-blue-200 hover:text-blue-900 rounded-full"
        >
          {processing ? <CircularProgress size={24} /> : "💰 Submit All Payouts"}
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
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
            onClick={() =>
              confirmDialog.onConfirm && confirmDialog.onConfirm()
            }
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
