import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import api from "../../Services/Api";
import PieGraph from "../../cmponents/PieChart/pieChart";

const Pie = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    api.get("/api/admin/dashboard-chart-data/")
      .then(({ data: payload }) => {
        if (!active) return;
        const categories = payload?.category_distribution;
        if (!Array.isArray(categories)) {
          throw new Error("The category distribution response was not in the expected format.");
        }
        setData(categories);
      })
      .catch((requestError) => {
        if (active) {
          console.error("Category distribution load failed:", requestError);
          setError("Unable to load Category Distribution. Please try again.");
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [retryKey]);

  return (
    <Box m={{ xs: 0, sm: 1 }} sx={{ minWidth: 0 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: "0.16em" }}>
          Marketplace analytics
        </Typography>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, letterSpacing: "-0.025em" }}>
          Category Distribution
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Completed-order item quantities grouped by product category.
        </Typography>
      </Box>
      <Box sx={{ height: { xs: "65vh", sm: "70vh" }, minHeight: 320, position: "relative", minWidth: 0 }}>
        {loading ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Box role="alert" sx={{ p: 3 }}>
            <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
            <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
              Try again
            </button>
          </Box>
        ) : (
          <PieGraph data={data} />
        )}
      </Box>
    </Box>
  );
};

export default Pie;
