import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme, Box, Button, Typography, Divider } from "@mui/material";
import { tokens } from "../../theme";
import api from "../../Services/Api";

const CustomAreaChart = ({showSummary = true }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [data, setData] = useState([]);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    api.get("/api/revenue-analytics/").then((res) => {
      setData(res.data);
    });
  }, []);

  const totalRevenue = data.reduce((sum, d) => sum + (d.revenue || 0), 0);
  const totalOrders = data.reduce((sum, d) => sum + (d.orders || 0), 0);

  return (
    <Box sx={{ width: "100%", height: 380, position: "relative" }}>

      {/* 🔘 SUMMARY BUTTON (THEMED) */}
      {showSummary && (
      <Box sx={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}>
        <Button
          size="small"
          variant="contained"
          onClick={() => setSummaryOpen(true)}
          sx={{
            backgroundColor: colors.greenAccent[600],
            color: colors.gray[100],
            fontWeight: 600,
            textTransform: "none",
            borderRadius: "8px",
            boxShadow: `0px 4px 12px ${colors.primary[900]}`,
            "&:hover": {
              backgroundColor: colors.greenAccent[700],
            },
          }}
        >
          Summary
        </Button>
      </Box>)}

      {/* 📊 CHART */}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>

          <defs>
            <linearGradient id="revenueColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.greenAccent[500]} stopOpacity={0.8} />
              <stop offset="95%" stopColor={colors.greenAccent[500]} stopOpacity={0} />
            </linearGradient>

            <linearGradient id="ordersColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.blueAccent[500]} stopOpacity={0.8} />
              <stop offset="95%" stopColor={colors.blueAccent[500]} stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="month"
            stroke={colors.gray[300]}
            tick={{ fill: colors.gray[300] }}
          />

          <YAxis
            stroke={colors.gray[300]}
            tick={{ fill: colors.gray[300] }}
          />

          <CartesianGrid strokeDasharray="3 3" stroke={colors.primary[700]} />
          <Tooltip />

          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue (KES)"
            stroke={colors.greenAccent[500]}
            fill="url(#revenueColor)"
          />

          <Area
            type="monotone"
            dataKey="orders"
            name="Orders"
            stroke={colors.blueAccent[500]}
            fill="url(#ordersColor)"
          />

        </AreaChart>
      </ResponsiveContainer>

      {/* 📋 SUMMARY PANEL (FULL MUI STYLE) */}
      {summaryOpen && (
        <Box
          sx={{
            position: "absolute",
            top: 60,
            right: 12,
            width: 280,
            backgroundColor: colors.primary[600],
            borderRadius: "12px",
            p: 2,
            boxShadow: `0 8px 24px rgba(0,0,0,0.35)`,
            border: `1px solid ${colors.primary[700]}`,
          }}
        >
          <Typography variant="h6" fontWeight="bold" color={colors.gray[100]}>
            Revenue Summary
          </Typography>

          <Divider sx={{ my: 1, borderColor: colors.primary[700] }} />

          <Typography fontSize={14} color={colors.gray[300]}>
            📊 Months: {data.length}
          </Typography>

          <Typography fontSize={14} color={colors.gray[300]}>
            💰 Total Revenue
          </Typography>

          <Typography fontWeight="bold" color={colors.greenAccent[500]}>
            KES {totalRevenue.toLocaleString()}
          </Typography>

          <Box mt={1} />

          <Typography fontSize={14} color={colors.gray[300]}>
            📦 Total Orders
          </Typography>

          <Typography fontWeight="bold" color={colors.blueAccent[500]}>
            {totalOrders}
          </Typography>

          <Box mt={2} />

          <Button
            fullWidth
            size="small"
            onClick={() => setSummaryOpen(false)}
            sx={{
              backgroundColor: colors.primary[700],
              color: colors.gray[100],
              textTransform: "none",
              "&:hover": {
                backgroundColor: colors.primary[800],
              },
            }}
          >
            Close
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default CustomAreaChart;