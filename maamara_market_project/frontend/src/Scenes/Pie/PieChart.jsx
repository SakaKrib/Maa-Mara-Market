import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import api from "../../Services/Api";
import PieGraph from "../../cmponents/PieChart/pieChart";

const getCategoryLabel = (item) => {
  const value = item.category_name
    || (typeof item.category === "string" ? item.category : item.category?.name || item.category?.title)
    || item.subcategory_name
    || (typeof item.subcategory === "string" ? item.subcategory : item.subcategory?.name)
    || "Uncategorized";
  return String(value).trim() || "Uncategorized";
};

const Pie = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/api/items/", { withCredentials: true })
      .then(({ data: payload }) => {
        const items = Array.isArray(payload)
          ? payload
          : payload?.results || payload?.items || [];
        const counts = new Map();
        items.forEach((item) => {
          const label = getCategoryLabel(item);
          counts.set(label, (counts.get(label) || 0) + 1);
        });
        if (active) {
          setData([...counts.entries()].map(([label, value]) => ({ id: label, label, value })));
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError?.response?.data?.detail || "Unable to load category distribution.");
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  return (
    <Box m="10px">
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1">Pie Chart</Typography>
        <Typography variant="body2" color="text.secondary">Marketplace Category Distribution</Typography>
      </Box>
      <Box sx={{ height: "70vh", minHeight: 320, position: "relative" }}>
        {loading ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Typography role="alert" color="error" sx={{ p: 2 }}>{error}</Typography>
        ) : (
          <PieGraph data={data} />
        )}
      </Box>
    </Box>
  );
};

export default Pie;
