import React, { useEffect, useState } from "react";
import axios from "axios"; // added
import api from "../../Services/Api";
import { Box, Typography, Button, CircularProgress, useTheme } from "@mui/material";
import { tokens } from "../../theme"; 
import { baseUrl } from "../Constant/Constant";

const AdminPriceApproval = ({ onCountChange }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  const fetchRequests = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const res = await api.get(
        `${baseUrl}/api/price-change-requests/?status=pending`,
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

  useEffect(() => {
    fetchRequests(false);

    const interval = setInterval(() => {
      fetchRequests(true);
    }, 10_000);

    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (requestId) => {
    setApprovingId(requestId);

    try {
      await axios.post(
        `${baseUrl}/api/item-price-change/approve/${requestId}/price-change/`,
        {},
        { withCredentials: true }
      );

      setRequests((prev) => {
        const updated = prev.filter((r) => r.id !== requestId);
        onCountChange?.(updated.length);
        return updated;
      });

    } catch (err) {
      console.error("Error approving request:", err);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <Box sx={{ p: 1, backgroundColor: colors.gray[700] }}>
      <Typography variant="h6" sx={{ mb: 3, color: colors.gray[100] }}>
        Pending Price Change Requests
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : requests.length === 0 ? (
        <Typography sx={{ textAlign: "center", mt: 4, color: colors.gray[400] }}>
          No pending requests.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {requests.map((req) => (
            <Box key={req.id} sx={{ p: 3, borderRadius: 2, backgroundColor: colors.primary[500] }}>
              <Typography>{req.item_name}</Typography>
              <Button
                onClick={() => handleApprove(req.id)}
                disabled={approvingId === req.id}
              >
                {approvingId === req.id ? <CircularProgress size={20} /> : "Approve"}
              </Button>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default AdminPriceApproval;
