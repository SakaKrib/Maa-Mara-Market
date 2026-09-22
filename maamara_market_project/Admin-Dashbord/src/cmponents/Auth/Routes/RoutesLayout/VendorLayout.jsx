import { Outlet } from "react-router-dom";
import ProtectedRoute from "../ProtectRoute";
import HeaderTop from "../../../Portions/HeaderTop/HeaderTop";
import VendorDashboardNav from "../../../VENDORPAGE/Home/VendorDashboardNav";

const VendorLayout = () => (
  <ProtectedRoute requiredRole="vendor">
    <div className="etsy-manager">
      <HeaderTop />
      <VendorDashboardNav />
      <main className="etsy-manager-main">
        <Outlet />
      </main>
    </div>
  </ProtectedRoute>
);

export default VendorLayout;
