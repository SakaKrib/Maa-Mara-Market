import React from "react";
import { useVendorCustomers } from "../../../Hooks/Customer/CustomerHookFetchForVendor"; // Adjust path accordingly
import { useAuth } from "../../../Auth/AuthContext/Context";
import { useTheme, Box, Typography, CircularProgress } from "@mui/material";
import { tokens } from "../../../../theme";

const getColorForLetter = (letter) => {
  const colors = [
    "#E57373", "#F06292", "#BA68C8", "#64B5F6", "#4DB6AC",
    "#81C784", "#FFD54F", "#FFB74D", "#A1887F", "#90A4AE",
    "#F44336", "#E91E63", "#9C27B0", "#2196F3", "#009688",
    "#4CAF50", "#FFC107", "#FF9800", "#795548", "#607D8B",
  ];
  if (!letter) return "#607D8B";
  const index = (letter.toUpperCase().charCodeAt(0) - 65) % colors.length;
  return colors[index];
};

const CustomerPage = () => {
  const { user } = useAuth();
  const vendorUserId = user?.id;
  const { customers, loading, error } = useVendorCustomers(vendorUserId);

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        padding: 4,
        color: colors.gray[100],
        display: "flex",
        flexDirection: "column",
        width: "100%", // fill entire width from page start
      }}
    >
      <Typography variant="h4" fontWeight="bold" mb={4}>
        Customers
      </Typography>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <CircularProgress color="secondary" />
        </Box>
      )}
      {error && (
        <Typography color="error" mb={2}>
          Error loading customers: {error.message}
        </Typography>
      )}

      {!loading && customers.length === 0 && (
        <Typography>No customers yet.</Typography>
      )}

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {customers.map((customer) => {
          const fullName =
            customer.full_name ||
            `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
          const initials = fullName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          const bgColor = getColorForLetter(initials[0]);

          return (
            <Box
              key={customer.id}
              sx={{
                borderRadius: 2,
                padding: 3,
                border: `1px solid ${colors.gray[700]}`,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 2 }}>
                {customer.profile_picture ? (
                  <Box
                    component="img"
                    src={customer.profile_picture}
                    alt={fullName || "No name"}
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      border: `2px solid ${colors.gray[100]}`,
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      backgroundColor: bgColor,
                      color: "white",
                      fontWeight: "bold",
                      fontSize: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `2px solid ${colors.gray[100]}`,
                      userSelect: "none",
                    }}
                  >
                    {initials}
                  </Box>
                )}

                <Box>
                  <Typography variant="h6" fontWeight="bold" color={colors.gray[100]}>
                    {fullName || "Guest User"}
                  </Typography>
                  <Typography color={colors.gray[300]}>{customer.email || "No email"}</Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 1.5,
                  color: colors.gray[200],
                  fontSize: 14,
                }}
              >
                <Typography>
                  <strong>Phone:</strong> {customer.phone_number || "N/A"}
                </Typography>
                <Typography>
                  <strong>Address:</strong> {customer.address || "N/A"}
                </Typography>
                <Typography>
                  <strong>City:</strong> {customer.city || "Nairobi"}
                </Typography>
                <Typography>
                  <strong>Country:</strong> {customer.country || "N/A"}
                </Typography>
                <Typography>
                  <strong>Loyalty Points:</strong> {customer.loyalty_points ?? 0}
                </Typography>
                <Typography>
                  <strong>Visitor ID:</strong> {customer.visitor_id || "N/A"}
                </Typography>
                <Typography>
                  <strong>Billing Address:</strong>{" "}
                  {customer.billing_address ? JSON.stringify(customer.billing_address) : "N/A"}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default CustomerPage;
