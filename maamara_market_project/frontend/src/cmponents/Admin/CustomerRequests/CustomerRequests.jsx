// src/components/admin/Requests/CustomerToAdminRequests.jsx
import React from "react";
import PendingReturnsList from "../Returns/ApproveReturns";
import { tokens } from "../../../theme";
import { useTheme, Box, Typography, Paper } from "@mui/material";

const CustomerToAdminRequests = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box
    
      sx={{
        backgroundColor: colors.primary[600],
        borderRadius: "12px",
        padding: "20px",
        boxShadow: 2,
        mt: '10px',
        margin: '20px 20px 10px 20px'
      }}
      
    >
      {/* Header */}
      <Box
        sx={{
          borderBottom: `2px solid ${colors.gray[700]}`,
          marginBottom: "20px",
          paddingBottom: "10px",
          padding: '20px'
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: "600",
            color: colors.greenAccent[400],
          }}
        >
          Pending Return Requests
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: colors.gray[300], marginTop: "4px" }}
        >
          Review and approve or reject customer refund and exchange requests.
        </Typography>
      </Box>

      {/* List Section */}
      <Paper
        elevation={0}
        sx={{
          backgroundColor: colors.primary[500],
          padding: "10px",
          borderRadius: "10px",
        }}
      >
        <PendingReturnsList />
      </Paper>
    </Box>
  );
};

export default CustomerToAdminRequests;

