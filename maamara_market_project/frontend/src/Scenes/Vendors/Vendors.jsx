import { Box } from "@mui/material";
import Header from "../../Header/Header";
import DataTable from "../../cmponents/DataTable/DataTable";
import Vendor_list from "../../cmponents/Vendors/Vendors";
import ProductOnsite from "../../cmponents/Onsite/Onsite";
const Vendors = () => {
  return (
    <Box m="10px"mb={5}>
      <Box height="inherit">
        <Vendor_list />
      </Box>

    </Box>
  );
};

export default Vendors;