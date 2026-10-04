import { Box } from "@mui/material";
import Header from "../../Header/Header";
import CustomAreaChart from "../../cmponents/LineGraph/LineGraph";

const Line = () => {
  return (
    <Box m="10px 0"padding={"1em 1.5em"}>
      <Header title="Proucts OnSite" subtitle="All Products" />
      <Box height="70vh">
        <CustomAreaChart />
      </Box>
    </Box>
  );
};

export default Line;
