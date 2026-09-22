import React, { useState } from "react";
import { IonIcon } from "@ionic/react";
import {
  statsChartOutline,
  addCircleOutline,
  bagCheckOutline,
  peopleOutline,
  chatbubbleEllipsesOutline,
  readerOutline,
  logOutOutline,
  calendar,
  arrowForwardCircleOutline,
  pencilOutline,
  listCircleOutline,
  closeOutline,
  menuOutline,
} from "ionicons/icons";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../Auth/AuthContext/Context";
import Maamara from "../../../assets/Logo/Maamara.jpg";
import { useVendorOrdersCombined } from "../../Hooks/Order/CombinedOrderHook";

const VendorDashboardNav = () => {
  const location = useLocation();
  const { pending } = useVendorOrdersCombined();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userName = user?.username || "Vendor";

  const isActive = (path, exact = false) =>
    exact
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(path + "/");

  const navItems = [
    { label: "Dashboard", to: "/vendors-dashboard", icon: statsChartOutline, exact: true },
    { label: "Profile", to: "/vendors-dashboard/vendor-profile", icon: peopleOutline },
    { label: "Add Products", to: "/vendors-dashboard/add-item", icon: addCircleOutline },
    { label: "Items OnSite", to: "/vendors-dashboard/item-onsite", icon: bagCheckOutline },
    { label: "Customers", to: "/vendors-dashboard/customers", icon: peopleOutline },
    { label: "Orders", to: "/vendors-dashboard/orders", icon: readerOutline, badge: pending?.length || 0 },
    { label: "Messages", to: "/vendors-dashboard/messages", icon: chatbubbleEllipsesOutline },
    { label: "Payout Report", to: "/vendors-dashboard/vendor-payouts/payout-report", icon: listCircleOutline },
    { label: "Sales Reports", to: "/vendors-dashboard/sales/report", icon: readerOutline },
    { label: "Transactions", to: "/vendors-dashboard/transactions", icon: arrowForwardCircleOutline },
    { label: "Calendar", to: "/vendors-dashboard/vendor-calender", icon: calendar },
    { label: "Reviews", to: "/vendors-dashboard/review-page", icon: pencilOutline },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Vendor logout failed:", error);
    }
  };

  return (
    <>
      {!mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed left-3 top-[72px] z-[1300] inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#e6e6e4] bg-white text-[#222] shadow-sm sm:hidden"
          aria-label="Open vendor navigation"
        >
          <IonIcon icon={menuOutline} className="text-xl" />
        </button>
      )}

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[1190] bg-black/30 sm:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close vendor navigation overlay"
        />
      )}

      <aside
        className={
          "etsy-shop-sidebar " +
          (mobileOpen ? "!w-[244px] shadow-2xl" : "")
        }
        style={{
          ...(mobileOpen
            ? { width: "244px" }
            : {}),
        }}
        aria-label="Vendor dashboard navigation"
      >
        <div className="etsy-sidebar-brand">
          <a
            href="/"
            aria-label="Maa Mara Market"
            className="vendor-sidebar-logo"
          >
            <img src={Maamara} alt="Maa Mara Market" />
          </a>
          <div className="min-w-0">
            <strong>Maa Mara Market</strong>
            <small>Vendor Manager</small>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#595959] hover:bg-[#f8f8f6] hover:text-[#222] sm:hidden"
            aria-label="Close vendor navigation"
          >
            <IonIcon icon={closeOutline} />
          </button>
        </div>

        <div className="px-2 pb-3 text-xs text-[#595959]">
          Welcome, <span className="font-semibold text-[#222]">{userName}</span>
        </div>

        <nav className="etsy-sidebar-nav" aria-label="Vendor sections">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={isActive(item.to, item.exact) ? "active" : ""}
            >
              <IonIcon icon={item.icon} aria-hidden="true" />
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span className="ml-auto rounded-full bg-[#f1641e] px-2 py-0.5 text-[11px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="etsy-sidebar-bottom">
          <button
            type="button"
            onClick={handleLogout}
            className="!text-[#595959] hover:!text-[#222]"
          >
            <IonIcon icon={logOutOutline} aria-hidden="true" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default VendorDashboardNav;
