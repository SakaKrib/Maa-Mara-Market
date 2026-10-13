import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import Header from "../../Header/Header";
import api from "../../Services/Api";
import BarChart from "../../cmponents/BarChart/BarChart";

const Bar = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/api/revenue-analytics/", { withCredentials: true })
      .then(({ data: payload }) => {
        const rows = Array.isArray(payload)
          ? payload
          : payload?.monthly_revenue || payload?.results || [];
        if (!active) return;
        setData(rows.map((row, index) => ({
          label: row.month || row.label || row.period || `Period ${index + 1}`,
          sales: Number(row.revenue ?? row.sales ?? row.total_sales ?? 0),
          orders: Number(row.orders ?? row.order_count ?? 0),
        })));
      })
      .catch((requestError) => {
        if (active) setError(requestError?.response?.data?.detail || "Unable to load sales analytics.");
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  return (
    <Box m="10px">
      <Header title="Bar Chart" subtitle="Monthly Sales Bar Chart" />
      <Box sx={{ height: "70vh", minHeight: 320, position: "relative" }}>
        {loading ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Typography role="alert" color="error" sx={{ p: 2 }}>{error}</Typography>
        ) : (
          <BarChart data={data} />
        )}
      </Box>
    </Box>
  );
};

export default Bar;
