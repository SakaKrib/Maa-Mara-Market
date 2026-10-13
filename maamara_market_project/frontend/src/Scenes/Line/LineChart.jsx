import React from "react";
import { Box } from "@mui/material";
import CustomAreaChart from "../../cmponents/LineGraph/LineGraph";

const Line = () => {
  return (
    <Box m="10px 0" padding="1em 1.5em">
      <Box height="70vh">
        <CustomAreaChart />
      </Box>
    </Box>
  );
};

export default Line;
