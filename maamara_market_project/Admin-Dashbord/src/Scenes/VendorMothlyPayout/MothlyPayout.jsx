import { Box } from "@mui/material";
import Header from "../../Header/Header";
import VendorReport from "../../cmponents/VendorPayoutReport/payout";
const VendorMothlyReport = () => {
  return (
    <Box m="10px"mb={5}>
      <Box height="inherit">
        <VendorReport />
      </Box>
    </Box>
  );
};

export default VendorMothlyReport;