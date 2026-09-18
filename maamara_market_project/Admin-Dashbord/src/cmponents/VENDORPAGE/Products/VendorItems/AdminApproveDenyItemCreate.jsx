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
import { useNavigate } from "react-router-dom";

import CreateItemModal from "../../../../cmponents/AdminPages/Notifications/ApproveCreatedItem";

const POLL_INTERVAL = 10_000;

const VendorItemCreateRequests = ({ onCountChange }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const [readyForApproval, setReadyForApproval] = useState({});
  const [openModal, setOpenModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  // ======================
  // FETCH REQUESTS
  // ======================
  const fetchRequests = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const response = await api.get(`/api/vendor/requests/`, {
        withCredentials: true,
      });

      let data = response.data;
      let list = [];

      if (Array.isArray(data)) list = data;
      else if (data?.results) list = data.results;
      else if (data) list = [data];

      setRequests(list);
      onCountChange?.(list.length);
    } catch (error) {
      console.error("Error fetching requests:", error);
      setRequests([]);
      onCountChange?.(0);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(false);

    const interval = setInterval(() => {
      fetchRequests(true);
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // ======================
  // ACTIONS
  // ======================
  const handleAction = async (id, action) => {
    try {
      await api.post(
        `/api/vendor/requests/${id}/approve/`,
        { action },
        { withCredentials: true }
      );

      setSnackbar({
        open: true,
        message: `Request ${action}d successfully!`,
        severity: "success",
      });

      await fetchRequests(true);
    } catch (error) {
      console.error(error);
      setSnackbar({
        open: true,
        message: `Failed to ${action} request.`,
        severity: "error",
      });
    }
  };

  const sortedRequests = [...requests].sort((a, b) => {
    const aDone = a.status !== "pending";
    const bDone = b.status !== "pending";
    return aDone - bDone;
  });

  const handleOpenModal = (req) => {
    setSelectedItem(req);
    setOpenModal(true);
  };

  // split
  const pending = sortedRequests.filter((r) => r.status === "pending");
  const history = sortedRequests.filter((r) => r.status !== "pending");

  const shorten = (text = "", len = 60) =>
    text.length > len ? text.slice(0, len) + "..." : text;

  return (
    <Box
      sx={{
        p: 1,
        backgroundColor: colors.primary[600],
        height: "100%",
        color: colors.gray[100],
      }}
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        Vendor Item Requests
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <>
          {/* ======================
              PENDING
          ====================== */}
          {pending.map((req) => (
            <Box key={req.id} sx={{ mb: 2 }}>
              <Card sx={{ color: colors.gray[100] }}>
                <CardContent>
                  <Typography variant="h6">{req.name}</Typography>

                  <Typography variant="body2" color="text.secondary">
                    Vendor: {req.vendor.company_name}
                  </Typography>

                  <Typography variant="body2">
                    Price: KES {req.price}
                  </Typography>

                  <Typography variant="body2">
                    {req.description}
                  </Typography>

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

                  <Typography
                    fontSize={12}
                    sx={{ mt: 1 }}
                    color="warning.main"
                  >
                    Pending
                  </Typography>

                  {/* ACTIONS */}
                  <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                    <Button
                      variant="contained"
                      color="success"
                      disabled={!readyForApproval[req.id]}
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
                      onClick={() => handleOpenModal(req)}
                    >
                      Create Item
                    </Button>
                  </Box>

                  <Box sx={{ mt: 1 }}>
                    {readyForApproval[req.id] ? (
                      <Typography color="success.main" fontSize={12}>
                        Item ready ✔
                      </Typography>
                    ) : (
                      <Typography color="warning.main" fontSize={12}>
                        Pending item creation
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}

          {/* ======================
              APPROVED HISTORY
          ====================== */}
          {history.length > 0 && (
            <>
              <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
                Approved History
              </Typography>

              {history.map((req) => (
                <Box key={req.id} sx={{ mb: 2 }}>
                  <Card sx={{ opacity: 0.75 }}>
                    <CardContent>
                      <Typography variant="subtitle1">
                        {req.name}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        {shorten(req.description)}
                      </Typography>

                      <Typography
                        fontSize={12}
                        sx={{ mt: 1 }}
                        color="success.main"
                      >
                        Approved ✔
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </>
          )}
        </>
      )}

      {/* MODAL */}
      <CreateItemModal
        open={openModal}
        item={selectedItem}
        itemId={selectedItem?.id}
        onClose={() => setOpenModal(false)}
        onSave={(id) => {
          setReadyForApproval((prev) => ({
            ...prev,
            [id]: true,
          }));
        }}
      />

      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VendorItemCreateRequests;