import { Box } from "@mui/material";
import Header from "../../Header/Header";
import CustomAreaChart from "../../cmponents/LineGraph/LineGraph";

const Line = () => {
  return (
    <Box m="10px 0"padding={"1em 1.5em"}>
      <Header title="Line Chart" subtitle="Monthly Sales Bar Chart" />
      <Box height="70vh">
        <CustomAreaChart />
      </Box>
    </Box>
  );
};

export default Line;
