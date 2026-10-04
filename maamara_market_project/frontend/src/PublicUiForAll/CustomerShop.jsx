import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../PublicUiForAll/PublicUi/Customer/DesktopView/Header/Header";
import Footer from "./PublicUi/Navigations/Footer/Footer";
import MobileMenu from "./PublicUi/Navigations/Footer/MobileFooter";
import MessagingLauncher from "../cmponents/Messaging/MessagingLauncher";
import AnalyticsTracker from "./PublicUi/Customer/AnalyticsTracker";

const CustomerShop = () => {
  return (
    <>
      <AnalyticsTracker />
      <Header />
      <main className="relative flex flex-col min-h-screen">
        <Outlet />
      </main>
      <MobileMenu/>
      <Footer />
      <MessagingLauncher />
    </>
  );
};

export default CustomerShop;

