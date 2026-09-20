import React, { useEffect, useState } from "react";
import api from "../../Services/Api";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  useTheme,
  Divider,
  Chip,
  Stack,
  Paper,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import PersonIcon from "@mui/icons-material/Person";
import NotesIcon from "@mui/icons-material/Notes";
import Inventory2Icon from "@mui/icons-material/Inventory2";

import { tokens } from "../../theme";


const AdminPriceApproval = ({ onCountChange }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [approvingId, setApprovingId] = useState(null);

  // =========================
  // FETCH PENDING REQUESTS
  // =========================
  const fetchRequests = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const res = await api.get(
        `/api/price-change-requests/?status=pending`,
        { withCredentials: true }
      );

      const list = Array.isArray(res.data)
        ? res.data
        : res.data.results || [];

      setRequests(list);

      onCountChange?.(list.length);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // =========================
  // FETCH APPROVAL HISTORY
  // =========================
  const fetchHistory = async () => {
    setHistoryLoading(true);

    try {
      const res = await api.get(
        `/api/price-change-requests/?status=approved`,
        { withCredentials: true }
      );

      const list = Array.isArray(res.data)
        ? res.data
        : res.data.results || [];

      setHistory(list);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(false);
    fetchHistory();
  }, []);

  // =========================
  // APPROVE REQUEST
  // =========================
  const handleApprove = async (requestId) => {
    setApprovingId(requestId);

    try {
      await api.post(
        `/api/item-price-change/approve/${requestId}/price-change/`,
        {},
        { withCredentials: true }
      );

      setRequests((prev) => {
        const updated = prev.filter((r) => r.id !== requestId);

        onCountChange?.(updated.length);

        return updated;
      });

      // refresh history after approval
      fetchHistory();
    } catch (err) {
      console.error("Error approving request:", err);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* =========================
          PENDING APPROVALS
      ========================= */}
      <Box
        sx={{
          backgroundColor: colors.primary[500],
          borderRadius: "16px",
          p: 3,
          mb: 4,
          boxShadow: 3,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            mb: 3,
            color: colors.gray[100],
            
          }}
        >
          Pending Price Change Requests
        </Typography>

        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 5,
            }}
          >
            <CircularProgress />
          </Box>
        ) : requests.length === 0 ? (
          <Typography
            sx={{
              textAlign: "center",
              color: colors.gray[400],
              py: 3,
            }}
          >
            No pending requests.
          </Typography>
        ) : (
          <Stack spacing={3}>
            {requests.map((req) => (
              <Paper
                key={req.id}
                elevation={4}
                sx={{
                  p: 3,
                  borderRadius: "16px",
                  backgroundColor: colors.primary[400],
                  border: `1px solid ${colors.primary[300]}`,
                }}
              >
                <Stack spacing={2}>
                  {/* ITEM */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Inventory2Icon sx={{ color: colors.greenAccent[400] }} />

                    <Typography
                      variant="h6"
                      sx={{
                        color: colors.gray[100],
                        fontWeight: 700,
                      }}
                    >
                      {req.item_name}
                    </Typography>
                  </Box>

                  {/* REQUESTED BY */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PersonIcon sx={{ color: colors.blueAccent[300] }} />

                    <Typography sx={{ color: colors.gray[200] }}>
                      Requested by:{" "}
                      <strong>{req.requested_by_name || "Vendor"}</strong>
                    </Typography>
                  </Box>

                  {/* PRICE */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <MonetizationOnIcon
                      sx={{ color: colors.greenAccent[400] }}
                    />

                    <Typography sx={{ color: colors.gray[100] }}>
                      New Price:{" "}
                      <strong>KES {req.new_price}</strong>
                    </Typography>
                  </Box>

                  {/* REASON */}
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <NotesIcon sx={{ color: colors.redAccent[300] }} />

                    <Typography sx={{ color: colors.gray[300] }}>
                      {req.reason}
                    </Typography>
                  </Box>

                  {/* BUTTON */}
                  <Box sx={{ pt: 1 }}>
                    <Button
                      variant="contained"
                      onClick={() => handleApprove(req.id)}
                      disabled={approvingId === req.id}
                      sx={{
                        px: 4,
                        py: 1.2,
                        borderRadius: "12px",
                        textTransform: "none",
                        fontWeight: "bold",
                        backgroundColor: colors.greenAccent[500],
                        color: "#fff",
                        "&:hover": {
                          backgroundColor: colors.greenAccent[600],
                        },
                      }}
                    >
                      {approvingId === req.id ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        "Approve Price Change"
                      )}
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>

      {/* =========================
          APPROVAL HISTORY
      ========================= */}
      <Box
        sx={{
          backgroundColor: colors.primary[500],
          borderRadius: "16px",
          p: 3,
          boxShadow: 3,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            mb: 3,
            color: colors.gray[100],
            
          }}
        >
          Approval History
        </Typography>

        {historyLoading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 5,
            }}
          >
            <CircularProgress />
          </Box>
        ) : history.length === 0 ? (
          <Typography
            sx={{
              textAlign: "center",
              color: colors.gray[400],
            }}
          >
            No approval history yet.
          </Typography>
        ) : (
          <Stack spacing={3}>
            {history.map((item) => (
              <Paper
                key={item.id}
                elevation={3}
                sx={{
                  p: 3,
                  borderRadius: "16px",
                  backgroundColor: colors.primary[400],
                  borderLeft: `5px solid ${colors.greenAccent[500]}`,
                }}
              >
                <Stack spacing={2}>
                  {/* TITLE */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: colors.gray[100],
                        fontWeight: "bold",
                      }}
                    >
                      {item.item_name} - KES {item.new_price}
                    </Typography>

                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Approved"
                      sx={{
                        backgroundColor: colors.greenAccent[500],
                        color: "#fff",
                        fontWeight: "bold",
                      }}
                    />
                  </Box>

                  <Divider />

                  {/* DETAILS */}
                  <Stack spacing={1.5}>
                    <Typography sx={{ color: colors.gray[200] }}>
                      <strong>Requested by:</strong>{" "}
                      {item.requested_by_name || "Vendor"}
                    </Typography>

                    <Typography sx={{ color: colors.gray[200] }}>
                      <strong>Reason:</strong> {item.reason}
                    </Typography>

                    <Typography sx={{ color: colors.gray[200] }}>
                      <strong>Approved by:</strong>{" "}
                      {item.approved_by_name || "Admin"}
                    </Typography>

                    {/* DATE */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mt: 1,
                      }}
                    >
                      <AccessTimeIcon
                        sx={{ color: colors.blueAccent[300] }}
                      />

                      <Typography sx={{ color: colors.gray[300] }}>
                        Approved at:{" "}
                        <strong>
                          {item.approved_at
                            ? new Date(item.approved_at).toLocaleString()
                            : "N/A"}
                        </strong>
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default AdminPriceApproval;