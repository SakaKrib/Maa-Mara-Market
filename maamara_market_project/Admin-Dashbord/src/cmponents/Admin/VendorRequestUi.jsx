import { useTheme, Box, Button } from "@mui/material";
import { useState } from "react";
import VendorApprovalPanel from "../VENDORPAGE/VendorRegistration/HandleApproveDeny";
import { tokens } from "../../theme";
import Header from "../../Header/Header";
import VendorItemCreateRequests from "../VENDORPAGE/Products/VendorItems/AdminApproveDenyItemCreate";
import AdminPriceApproval from "./ApproveItemPrice";
import AdminBlogApprovalPage from "./ApproveBlogs/ApproveBlogs";
import AdminBannerApprovalPage from "./ApproveBanner/aprroveBanner";

const UiForVendorRequest = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const getButtonStyle = (key) => ({
    color: activeSection === key ? colors.gray[100] : colors.gray[300],
    backgroundColor: activeSection === key ? colors.primary[400] : "transparent",
    border: `1px solid ${colors.primary[400]}`,
  });

  const [activeSection, setActiveSection] = useState("vendors");

  return (
    <Box sx={{ backgroundColor: colors.primary[500], minHeight: "100vh" }}>
      
      {/* Header */}
      <div style={{ padding: "10px" }}>
        <Header title="Vendor Requests" subtitle="Recent Requests" />
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3 px-4 pb-4">

      <Button
        variant="outlined"
        onClick={() => setActiveSection("vendors")}
        sx={getButtonStyle("vendors")}
      >
        Vendor Requests
      </Button>

      <Button
        variant="outlined"
        onClick={() => setActiveSection("items")}
        sx={getButtonStyle("items")}
      >
        Item Requests
      </Button>

      <Button
        variant="outlined"
        onClick={() => setActiveSection("blogs")}
        sx={getButtonStyle("blogs")}
      >
        Blog Requests
      </Button>

      <Button
        variant="outlined"
        onClick={() => setActiveSection("prices")}
        sx={getButtonStyle("prices")}
      >
        Price Updates
      </Button>

      <Button
        variant="outlined"
        onClick={() => setActiveSection("banners")}
        sx={getButtonStyle("banners")}
      >
        Banner Requests
      </Button>

  
       

      </div>

      {/* Content */}
      <div className="flex p-4 flex-col gap-4">

        {/* Vendors */}
        {activeSection === "vendors" && (
          <div
            className="flex flex-col gap-4 rounded-xl p-4 shadow-md"
            style={{ backgroundColor: colors.primary[600] }}
          >
            <h4 style={{ color: colors.blueAccent[100] }}>
              Vendor Request Awaiting Approval
            </h4>
            <VendorApprovalPanel />
          </div>
        )}

        {/* Items */}
        {activeSection === "items" && (
          <div
            className="flex flex-col gap-4 rounded-xl p-4 shadow-md"
            style={{ backgroundColor: colors.primary[600] }}
          >
            <h4 style={{ color: colors.blueAccent[100] }}>
              Vendor Items Awaiting Approval
            </h4>
            <VendorItemCreateRequests />
          </div>
        )}

        {/* Blogs */}
        {activeSection === "blogs" && (
          <div
            className="flex flex-col gap-4 rounded-xl p-4 shadow-md"
            style={{ backgroundColor: colors.primary[600] }}
          >
            <h4 style={{ color: colors.blueAccent[100] }}>
              Blogs Awaiting Approval
            </h4>
            <AdminBlogApprovalPage />
          </div>
        )}

        {/* Prices */}
        {activeSection === "prices" && (
          <div
            className="flex flex-col gap-4 rounded-xl p-4 shadow-md"
            style={{ backgroundColor: colors.primary[600] }}
          >
            <h4 style={{ color: colors.blueAccent[100] }}>
              Vendor Price Updates Awaiting Approval
            </h4>
            <AdminPriceApproval />
          </div>
        )}

        {/* ✅ NEW: Banners */}
        {activeSection === "banners" && (
          <div
            className="flex flex-col gap-4 rounded-xl p-4 shadow-md"
            style={{ backgroundColor: colors.primary[600] }}
          >
            <h4 style={{ color: colors.blueAccent[100] }}>
              Banner Requests Awaiting Approval
            </h4>
            <AdminBannerApprovalPage />
          </div>
        )}

      </div>
    </Box>
  );
};

export default UiForVendorRequest;