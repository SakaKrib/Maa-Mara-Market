import { useTheme, Box } from "@mui/material";
import VendorApprovalPanel from "../VENDORPAGE/VendorRegistration/HandleApproveDeny";
import { tokens } from "../../theme";
import Header from "../../Header/Header";
import VendorItemCreateRequests from "../VENDORPAGE/Products/VendorItems/AdminApproveDenyItemCreate";
import AdminPriceApproval from "./ApproveItemPrice";
import AdminBlogApprovalPage from "./ApproveBlogs/ApproveBlogs";

const UiForVendorRequest = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Box sx={{ backgroundColor: colors.primary[500], minHeight: "100vh" }}>
      {/* Header */}
      <div style={{p:'10px'}}>
      <Header title="Vendor Requests" subtitle="Recent Requests" />
      </div>

      {/* Responsive Grid Layout */}
      <div className="flex p-4 flex-col gap-4">
        {/* Vendor Approval */}
        <div
          className="flex flex-col gap-4 rounded-xl p-4 shadow-md"
          style={{ backgroundColor: colors.primary[600], height:'max-content' }}
        >
          <h4 className="font-semibold text-xl md:text-2xl" style={{color:colors.blueAccent[100]}}>
            Vendor Request Awaiting Approval
          </h4>
          <VendorApprovalPanel />
        </div>

        {/* Item Create Approval */}
        <div
          className="flex flex-col gap-4 rounded-xl p-4 shadow-md"
          style={{ backgroundColor: colors.primary[600], height:'max-content' }}
        >
          <h4 className="font-semibold text-xl md:text-2xl" style={{color:colors.blueAccent[100] }}>
            Vendor Items Awaiting Approval
          </h4>
          <VendorItemCreateRequests />
        </div>

        {/* blogs approval */}
        <div
          className="flex flex-col gap-4 rounded-xl p-4 shadow-md"
          style={{ backgroundColor: colors.primary[600], height:'max-content' }}
        >
          <h4 className="font-semibold text-xl md:text-2xl" style={{color:colors.blueAccent[100] }}>
            Blogs Awaiting Approval
          </h4>
          <AdminBlogApprovalPage />
        </div>

        {/* Price Update Approval */}
        <div
          className="flex flex-col gap-4 rounded-xl p-4 shadow-md"
          style={{ backgroundColor: colors.primary[600], height:'max-content' }}
        >
          <h4 className="font-semibold text-xl md:text-2xl" style={{color:colors.blueAccent[100]}}>
            Vendor Price Updates Awaiting Approval
          </h4>
          {/* TODO: Add PriceUpdateApprovalPanel when ready */}
          <AdminPriceApproval/>
        </div>
      </div>
    </Box>
  );
};

export default UiForVendorRequest;
