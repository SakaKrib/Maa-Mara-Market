import { Box } from "@mui/material";
import Header from "../../Header/Header";
import VendorReport from "../../cmponents/VendorPayoutReport/payout";
const PaymentReport = () => {
  return (
    <Box m="10px">
      <Header title="Vendor Payout" subtitle="Monthly Sales Report" />
      <Box height="100vh">
        <VendorReport />
      </Box>
    </Box>
  );
};

export default PaymentReport;