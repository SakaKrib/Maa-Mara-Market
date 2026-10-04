import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import { arrowBackOutline } from "ionicons/icons";
import ProtectedRoute from "../ProtectRoute";
import HeaderTop from "../../../Portions/HeaderTop/HeaderTop";
import VendorDashboardNav from "../../../VENDORPAGE/Home/VendorDashboardNav";

const VendorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isDashboard = location.pathname === "/vendors-dashboard";

  return (
    <ProtectedRoute requiredRole="vendor">
      <div className="etsy-manager">
        <HeaderTop onMenuToggle={() => setSidebarOpen((open) => !open)} />
        <VendorDashboardNav
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="etsy-manager-main">
          {!isDashboard && (
            <div className="mb-5">
              <Link
                to="/vendors-dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-transparent px-4 py-2.5 text-sm font-semibold text-gray-900 transition duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300/30"
                aria-label="Back to vendor dashboard"
              >
                <IonIcon icon={arrowBackOutline} aria-hidden="true" className="text-base" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default VendorLayout;
