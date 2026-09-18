import { Box } from "@mui/material";
import Header from "../../Header/Header";
import PieGraph from "../../cmponents/PieChart/pieChart";

const Pie = () => {
  return (
    <Box m="10px">
      <Header title="Pie Chart" subtitle="Monthly Sales Bar Chart" />
      <Box height="100vh">
        <PieGraph />
      </Box>
    </Box>
  );
};

export default Pie;