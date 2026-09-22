import { useState } from "react";
import { Outlet } from "react-router-dom";
import ProtectedRoute from "../ProtectRoute";
import HeaderTop from "../../../Portions/HeaderTop/HeaderTop";
import VendorDashboardNav from "../../../VENDORPAGE/Home/VendorDashboardNav";

const VendorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute requiredRole="vendor">
      <div className="etsy-manager">
        <HeaderTop onMenuToggle={() => setSidebarOpen((open) => !open)} />
        <VendorDashboardNav
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="etsy-manager-main">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default VendorLayout;
