import React, { useEffect, useState } from "react";
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
import { tokens } from "../../../theme";
import api from "../../../Services/Api";
import { baseUrl } from "../../Constant/Constant";
import { useNavigate, useParams } from "react-router-dom";

const VendorItemRequestDetail = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  // Fetch single request
  const fetchRequest = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `${baseUrl}/api/admin/vendorDashboard/vendoritemrequest/${id}/`,
        { withCredentials: true }
      );
      setRequest(response.data);
    } catch (error) {
      console.error("Error fetching request:", error);
      setRequest(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  // Handle approve/deny
  const handleAction = async (action) => {
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

      fetchRequest();
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
        p: 2,
        backgroundColor: colors.gray[700],
        height: "100%",
        color: colors.gray[100],
      }}
    >
      {loading ? (
        <CircularProgress />
      ) : !request ? (
        <Typography sx={{ color: colors.gray[400] }}>
          Request not found
        </Typography>
      ) : (
        <Card sx={{ color: colors.gray[100] }}>
          <CardContent>
            <Typography variant="h5">{request.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              Vendor: {request.vendor.company_name} ({request.vendor.id})
            </Typography>
            <Typography variant="body2">Price: KES {request.price}</Typography>
            <Typography variant="body2">{request.description}</Typography>
            {request.image && (
              <img
                src={request.image}
                alt={request.name}
                style={{
                  width: "150px",
                  marginTop: "10px",
                  borderRadius: "8px",
                }}
              />
            )}

            <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleAction("approve")}
              >
                Approve
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => handleAction("deny")}
              >
                Deny
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() =>
                  navigate("/vendor/create-item", { state: request })
                }
              >
                Create Item
              </Button>
            </Box>
          </CardContent>
        </Card>
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

export default VendorItemRequestDetail;
