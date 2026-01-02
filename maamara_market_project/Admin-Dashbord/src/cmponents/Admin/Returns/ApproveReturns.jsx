// src/components/admin/returns/PendingReturnsList.jsx
import React, { useState } from "react";
import { usePendingReturns } from "../../Hooks/ReturnHook/ReturnHook";
import {
  Skeleton,
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../../Services/Api";

const PendingReturnsList = () => {
  const { returns, data, isLoading, error } = usePendingReturns();
  const queryClient = useQueryClient();
  const [loadingId, setLoadingId] = useState(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleCloseSnackbar = (_, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // ✅ Approve/Reject mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, action, admin_note }) => {
      const res = await api.post(
        `/api/returns/${id}/approve/`,
        { action, admin_note },
        { withCredentials: true }
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["pendingReturns"]);
      setSnackbar({
        open: true,
        message: data?.message || "Action completed successfully.",
        severity: "success",
      });
    },
    onError: (err) => {
      console.error("❌ Action failed:", err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || "Something went wrong.",
        severity: "error",
      });
    },
  });

  const handleAction = async (id, action) => {
    setLoadingId(id);
    try {
      await approveMutation.mutateAsync({
        id,
        action,
        admin_note:
          action === "approve"
            ? "Return approved successfully."
            : "Return rejected.",
      });
    } catch {
      // handled by onError
    } finally {
      setLoadingId(null);
    }
  };

  // 🦴 Skeleton loader
  if (isLoading) {
    return (
      <Box className="space-y-4 mt-10">
        {[...Array(4)].map((_, i) => (
          <Paper key={i} className="p-4 rounded-xl shadow-sm">
            <Skeleton variant="text" width="40%" height={30} />
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="rectangular" width="100%" height={20} />
          </Paper>
        ))}
      </Box>
    );
  }

  // ⚠️ Error display
  if (error) {
    return (
      <Typography color="error">
        Failed to load pending returns: {error.message}
      </Typography>
    );
  }

  // 📦 Empty state
  if (!data?.results?.length) {
    return (
      <Typography color="text.secondary">
        No pending return requests at the moment.
      </Typography>
    );
  }

  // ✅ Display pending returns
  return (
    <Box className="space-y-4 p-4">
      <Typography variant="h6" className="font-semibold mb-4">
        Pending Return Requests
      </Typography>

      {data.results.map((ret) => (
        <Paper
          key={ret.id}
          className="p-4 rounded-xl shadow-sm bg-gray-50 dark:bg-gray-800"
        >
          <Typography variant="subtitle1" fontWeight="bold">
            {ret.item_name || `Item #${ret.item}`}
          </Typography>
          <Typography variant="body2">
            Preference: {ret.customer_preference}
          </Typography>
          <Typography variant="body2">
            Status:{" "}
            <span className="text-yellow-600 dark:text-yellow-400">
              {ret.status}
            </span>
          </Typography>
          <Typography variant="body2">
            Requested on: {new Date(ret.created_at).toLocaleString()}
          </Typography>

          <Stack direction="row" spacing={2} mt={2}>
            <Button
              variant="contained"
              color="success"
              size="small"
              disabled={loadingId === ret.id}
              onClick={() => handleAction(ret.id, "approve")}
            >
              {loadingId === ret.id ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                "Approve"
              )}
            </Button>

            <Button
              variant="outlined"
              color="error"
              size="small"
              disabled={loadingId === ret.id}
              onClick={() => handleAction(ret.id, "reject")}
            >
              {loadingId === ret.id ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                "Reject"
              )}
            </Button>
          </Stack>
        </Paper>
      ))}

      {/* ✅ Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PendingReturnsList;

