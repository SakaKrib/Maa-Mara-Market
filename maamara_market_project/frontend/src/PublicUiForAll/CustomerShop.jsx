import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Outlet } from "react-router-dom";
import Header from "../PublicUiForAll/PublicUi/Customer/DesktopView/Header/Header";
import Footer from "./PublicUi/Navigations/Footer/Footer";
import MobileMenu from "./PublicUi/Navigations/Footer/MobileFooter";
import MessagingLauncher from "../cmponents/Messaging/MessagingLauncher";
import AnalyticsTracker from "./PublicUi/Customer/AnalyticsTracker";
import MaintenancePage from "./MaintenancePage";
import api from "../Services/Api";

const MAINTENANCE_ALLOWED_PATHS = [
  /^\/customer-order\/?$/,
  /^\/customer-order\/track\/[^/]+\/?$/,
  /^\/customer-login\/?$/,
  /^\/auth-success\/?$/,
  /^\/forgot-password\/?$/,
  /^\/reset-password\//,
  /^\/payment-success\/?$/,
  /^\/payment-pesapal-callback\/?$/,
];

const CustomerShop = () => {
  const location = useLocation();
  const [maintenance, setMaintenance] = useState({ enabled: false, message: "" });

  useEffect(() => {
    let active = true;
    const refreshMaintenance = async () => {
      try {
        const response = await api.get("/api/maintenance/status/");
        if (active) {
          setMaintenance({
            enabled: response.data?.enabled === true,
            message: response.data?.message || "",
          });
        }
      } catch {
        // A status endpoint outage should not lock customers out of the site.
      }
    };

    refreshMaintenance();
    const intervalId = window.setInterval(refreshMaintenance, 30000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const pathAllowedDuringMaintenance = MAINTENANCE_ALLOWED_PATHS.some((pattern) =>
    pattern.test(location.pathname)
  );

  if (maintenance.enabled && !pathAllowedDuringMaintenance) {
    return <MaintenancePage message={maintenance.message} />;
  }

  return (
    <>
      <AnalyticsTracker />
      <Header />
      <main className="relative flex flex-col min-h-screen">
        <Outlet />
      </main>
      <MobileMenu />
      <Footer />
      <MessagingLauncher />
    </>
  );
};

export default CustomerShop;

