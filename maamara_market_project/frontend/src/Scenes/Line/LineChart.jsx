import React from "react";
import { Box, Typography } from "@mui/material";
import CustomAreaChart from "../../cmponents/LineGraph/LineGraph";

const Line = () => {
  return (
    <Box m={{ xs: 0, sm: "10px 0" }} padding={{ xs: "0.25em", sm: "1em 1.5em" }} sx={{ minWidth: 0 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: "0.16em" }}>
          Marketplace analytics
        </Typography>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, letterSpacing: "-0.025em" }}>
          Revenue Trend
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monthly revenue and completed-order activity.
        </Typography>
      </Box>
      <Box sx={{ height: { xs: "65vh", sm: "70vh" }, minHeight: 320, minWidth: 0 }}>
        <CustomAreaChart />
      </Box>
    </Box>
  );
};

export default Line;
