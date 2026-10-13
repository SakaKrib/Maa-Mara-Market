import React from "react";
import {
  Box,
  Typography,
  CircularProgress,
  useTheme,
} from "@mui/material";

import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";

import { tokens } from "../../../../theme";
import useRevenueGrowth from "../../../Hooks/TransactionHook/TransactionGrowth";

const RevenueGrowthCard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const hookResult = useRevenueGrowth() || {};
  const data = hookResult.data || {};
  const loading = hookResult.loading;
  const error = hookResult.error;

  // ⛔ LOADING STATE
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="220px"
        bgcolor={colors.primary[600]}
        borderRadius="0.8em"
      >
        <CircularProgress />
      </Box>
    );
  }

  // ⛔ ERROR STATE
  if (error) {
    return (
      <Box bgcolor={colors.primary[600]} borderRadius="0.8em" p={3}>
        <Typography sx={{ color: colors.redAccent[400] }}>
          Failed to load revenue analytics
        </Typography>
      </Box>
    );
  }

  // ✅ BACKEND MATCHING STRUCTURE
  const weekly = {
    this_week: Number(data.this_week || 0),
    previous_week: Number(data.previous_week || 0),
    growth: Number(data.growth || 0),
  };

  const isWeeklyUp = weekly.growth >= 0;

  return (
    <Box
      bgcolor={colors.primary[600]}
      borderRadius="0.8em"
      p={3}
      display="flex"
      flexDirection="column"
      gap={3}
      width="100%"
      height="100%"
    >
      {/* HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h6" fontWeight={700} color={colors.gray[100]}>
            Revenue Growth
          </Typography>

          <Typography variant="body2" color={colors.gray[300]}>
            Weekly revenue performance
          </Typography>
        </Box>

        <Box
          sx={{
            backgroundColor: colors.greenAccent[800],
            width: 50,
            height: 50,
            borderRadius: "50%",
          }}
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          <PaymentsOutlinedIcon
            sx={{ color: colors.greenAccent[300], fontSize: 28 }}
          />
        </Box>
      </Box>

      {/* WEEKLY CARD */}
      <Box bgcolor={colors.primary[500]} p={2} borderRadius="0.7em">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography color={colors.gray[100]} fontWeight={600}>
            Weekly Revenue
          </Typography>

          <Box display="flex" alignItems="center" gap={0.5}>
            {isWeeklyUp ? (
              <TrendingUpOutlinedIcon sx={{ color: colors.greenAccent[400] }} />
            ) : (
              <TrendingDownOutlinedIcon sx={{ color: colors.redAccent[400] }} />
            )}

            <Typography
              fontWeight={700}
              color={
                isWeeklyUp
                  ? colors.greenAccent[400]
                  : colors.redAccent[400]
              }
            >
              {weekly.growth}%
            </Typography>
          </Box>
        </Box>

        <Typography
          mt={1}
          variant="h4"
          fontWeight="bold"
          color={colors.greenAccent[400]}
        >
          KES {weekly.this_week.toLocaleString()}
        </Typography>

        <Typography mt={0.5} variant="body2" color={colors.gray[300]}>
          Previous Week: KES {weekly.previous_week.toLocaleString()}
        </Typography>
      </Box>
    </Box>
  );
};

export default RevenueGrowthCard;