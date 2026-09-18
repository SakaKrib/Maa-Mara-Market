import React, { useEffect, useState } from "react";
import axios from "axios";
import api from "../../../Services/Api";
import { Box, Typography, Button, CircularProgress, useTheme } from "@mui/material";
import { tokens } from "../../../theme"; 
import { baseUrl } from "../../Constant/Constant";
import { useParams } from "react-router-dom";

const AdminPriceRequestDetail = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { id } = useParams();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  const fetchRequest = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${baseUrl}/api/admin/vendorDashboard/vendoritemrequest/price-change/request/${id}/`, {
        withCredentials: true,
      });
      setRequest(res.data);
    } catch (err) {
      console.error("Error fetching request detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await api.post(
        `${baseUrl}/api/item-price-change/approve/${id}/price-change/`,
        {},
        { withCredentials: true }
      );
      // Optionally update local state after approval
      setRequest((prev) => ({ ...prev, status: "approved" }));
    } catch (err) {
      console.error("Error approving request:", err);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!request) {
    return (
      <Typography sx={{ textAlign: "center", mt: 4, color: colors.gray[400] }}>
        Request not found.
      </Typography>
    );
  }

  return (
    <Box sx={{ p: 2, backgroundColor: colors.gray[700], maxHeight: "100vh", overflowY: "auto" }}>
      <Typography
        variant="h6"
        sx={{ mb: 3, textAlign: "start", color: colors.gray[100] }}
      >
        Price Change Request Detail
      </Typography>

      <Box
        sx={{
          p: 3,
          borderRadius: "10px",
          backgroundColor: colors.primary[500],
          color: colors.gray[100],
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h6" fontSize={"14px"} sx={{ mb: 1 }}>
            {request.item_name}
          </Typography>
          <Typography>
            Requested by: {request.requested_by_username}
          </Typography>
          <Typography>
            Old Price: {request.old_price} | New Price: {request.new_price}
          </Typography>
          <Typography fontSize={"14px"} sx={{ color: colors.blueAccent[400] }} className="first-letter:uppercase">
            Reason: {request.reason}
          </Typography>
          <Typography
            fontSize="14px"
            sx={{
              color: request.approved ? colors.greenAccent[400] : colors.redAccent[400],
              mt: 1,
            }}
          >
            Status: {request.approved ? "approved" : "not approved"}
          </Typography>

        </Box>

        {request.status !== "approved" && (
          <Button
            variant="contained"
            sx={{
              backgroundColor: colors.blueAccent[500],
              color: colors.gray[100],
              "&:hover": { backgroundColor: colors.yellowAccent[700] },
            }}
            onClick={handleApprove}
            disabled={approving}
          >
            {approving ? <CircularProgress size={20} /> : "Approve"}
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default AdminPriceRequestDetail;
