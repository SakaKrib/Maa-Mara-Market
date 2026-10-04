import { Box } from "@mui/material";
import Header from "../../Header/Header";
import BarChart from "../../cmponents/BarChart/BarChart";

const Bar = () => {
  return (
    <Box m="10px">
      <Header title="Bar Chart" subtitle="Monthly Sales Bar Chart" />
      <Box height="100vh">
        <BarChart />
      </Box>
    </Box>
  );
};

export default Bar;
