import React from "react";
import { useVendorOrdersCombined } from "./CombinedOrderHook";
import { useTheme, Box, Typography, Paper, Divider } from "@mui/material";
import { tokens } from "../../../theme";

// Safe truncate function
const truncate = (text, length = 30) => {
  if (!text || typeof text !== "string") return "";
  return text.length > length ? text.substring(0, length) + "..." : text;
};

const VendorOrdersPage = () => {
  const { pending, completed, loading, error } = useVendorOrdersCombined();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  if (loading) return <Typography>Loading orders...</Typography>;
  if (error) return <Typography color="error">Error loading orders.</Typography>;

  // Helper for safely getting item name
  const getItemName = (item) =>
    item?.item?.name ? truncate(item.item.name, 40) : "Unnamed Item";

  return (
    <Box
      p={3}
      sx={{
        
        minHeight: "100vh",
      }}
    >
      <Typography variant="h4" mb={3} style={{ color: colors.gray[100] }}>
        Vendor Orders
      </Typography>

      {/* ---------- Pending Orders ---------- */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 4,
          backgroundColor: colors.primary[500],
          borderRadius: "12px",
        }}
      >
        <Typography variant="h5" mb={2} color={colors.greenAccent[400]}>
          Pending Orders
        </Typography>

        {pending.length === 0 ? (
          <Typography style={{color:colors.gray[100]}}>No pending orders.</Typography>
        ) : (
          pending.map((order) => (
            <Box
              key={order.id}
              p={2}
              mb={2}
              sx={{
                backgroundColor: colors.primary[700],
                borderRadius: "10px",
              }}
            >
              <div className="flex justify-between items center">
              <Typography variant="h6" style={{color:colors.goldAccent[500]}}>Order # {order.id}</Typography>

              <Typography sx={{ mt: 1 }}>
                <strong>Total for Vendor:</strong>{" "}
                {order.total_for_vendor.toLocaleString()} KES
              </Typography>
              </div>
              <Divider sx={{ my: 1 }} />

              {order.items.map((item) => (
                <Box key={item.id} sx={{ mb: 1 }}>
                  <Typography>
                    <strong>{getItemName(item)}</strong> — x{item.quantity}
                  </Typography>

                  <Typography fontSize="13px">
                    Total Price:{" "}
                    {Number(item.final_price_for_vendor).toLocaleString()} KES
                  </Typography>
                </Box>
              ))}
            </Box>
          ))
        )}
      </Paper>

      {/* ---------- Completed Orders ---------- */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          backgroundColor: colors.primary[500],
          borderRadius: "12px",
        }}
      >
        <Typography variant="h5" mb={2} color={colors.blueAccent[400]}>
          Completed Orders
        </Typography>

        {completed.length === 0 ? (
          <Typography style={{color:colors.gray[100]}}>No completed orders.</Typography>
        ) : (
          completed.map((order) => (
            <Box
              key={order.id}
              p={2}
              mb={2}
              sx={{
                backgroundColor: colors.primary[700],
                borderRadius: "10px",
              }}
            >
              <div className="flex justify-between items center">
              <Typography variant="h6" style={{color:colors.greenAccent[500]}}>Order # {order.id}</Typography>

              <Typography sx={{ mt: 1 }}>
                <strong>Total for Vendor:</strong>{" "}
                {order.total_for_vendor.toLocaleString()} KES
              </Typography>
              </div>

              <Divider sx={{ my: 1 }} />

              {order.items.map((item) => (
                <Box key={item.id} sx={{ mb: 1 }}>
                  <Typography>
                    <strong>{getItemName(item)}</strong> — x{item.quantity}
                  </Typography>

                  <Typography fontSize="13px">
                    Total Price:{" "}
                    {Number(item.final_price_for_vendor).toLocaleString()} KES
                  </Typography>
                </Box>
              ))}
            </Box>
          ))
        )}
      </Paper>
    </Box>
  );
};

export default VendorOrdersPage;
