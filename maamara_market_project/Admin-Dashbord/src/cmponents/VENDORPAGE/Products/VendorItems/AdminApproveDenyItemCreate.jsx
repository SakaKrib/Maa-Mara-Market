import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  useTheme,
} from "@mui/material";
import { tokens } from "../../../../theme";
import api from "../../../../Services/Api";
import { baseUrl } from "../../../Constant/Constant";
import { useNavigate } from "react-router-dom";

const POLL_INTERVAL = 10_000; // 10 seconds

const VendorItemCreateRequests = ({ onCountChange }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true); // true initially for spinner only on first load
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const isFirstLoad = useRef(true);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  // Fetch pending requests
  const fetchRequests = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get(`${baseUrl}/api/vendor/requests/`, {
        withCredentials: true,
      });

      let data = response.data;
      let list = [];

      if (Array.isArray(data)) {
        list = data;
      } else if (data.results && Array.isArray(data.results)) {
        list = data.results;
      } else if (data) {
        list = [data];
      } else {
        list = [];
      }

      setRequests(list);

      // Report count up
      onCountChange?.(list.length);
    } catch (error) {
      console.error("Error fetching requests:", error);
      setRequests([]);
      onCountChange?.(0);
    } finally {
      if (!silent) setLoading(false);
      isFirstLoad.current = false;
    }
  };

  useEffect(() => {
    // Initial fetch with spinner
    fetchRequests(false);

    // Polling every 10 seconds, silent refresh (no flicker)
    const interval = setInterval(() => {
      fetchRequests(true);
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Handle approve/deny action
  const handleAction = async (id, action) => {
    try {
      await api.post(
        `${baseUrl}/api/vendor/requests/${id}/approve/`,
        { action },
        { withCredentials: true }
      );

      setSnackbar({
        open: true,
        message: `Request ${action}d successfully!`,
        severity: "success",
      });

      // Update requests list immediately to avoid refetch flicker
      setRequests((prev) => {
        const updated = prev.filter((r) => r.id !== id);
        onCountChange?.(updated.length);
        return updated;
      });
    } catch (error) {
      console.error(`Error ${action} request:`, error);
      setSnackbar({
        open: true,
        message: `Failed to ${action} request.`,
        severity: "error",
      });
    }
  };

  return (
    <Box
      sx={{
        p: 1,
        backgroundColor: colors.gray[700],
        height: "100%",
        color: colors.gray[100],
      }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        Vendor Item Requests
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : requests.length === 0 ? (
        <Typography sx={{ color: colors.gray[400] }}>
          No pending requests
        </Typography>
      ) : (
        requests.map((req) => (
          <Box
            key={req.id}
            sx={{
              mb: 2,
              borderRadius: 1,
            }}
          >
            <Card sx={{ color: colors.gray[100] }}>
              <CardContent>
                <Typography variant="h6">{req.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Vendor: {req.vendor.company_name} ({req.vendor.id})
                </Typography>
                <Typography variant="body2">Price: KES {req.price}</Typography>
                <Typography variant="body2">{req.description}</Typography>
                {req.image && (
                  <img
                    src={req.image}
                    alt={req.name}
                    style={{
                      width: "120px",
                      marginTop: "10px",
                      borderRadius: "8px",
                    }}
                  />
                )}

                <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleAction(req.id, "approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleAction(req.id, "deny")}
                  >
                    Deny
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate("/vendor/create-item", { state: req })}
                  >
                    Create Item
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VendorItemCreateRequests;
