import React, {useState} from "react";
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
  settingsOutline,
} from "ionicons/icons";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../Auth/AuthContext/Context";
import Maamara from "../../../assets/Logo/Maamara.jpg";
import { useVendorOrdersCombined } from "../../Hooks/Order/CombinedOrderHook";
import LogoutConfirmationModal from "../../Auth/LogoutConfirmationModal";

const VendorDashboardNav = ({ open = false, onClose }) => {
  const location = useLocation();
  const { pending } = useVendorOrdersCombined();
  const { user, logout } = useAuth();

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

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Vendor logout failed:", error);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`fixed inset-0 z-[1190] bg-black/30 transition-opacity sm:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-label="Close vendor navigation overlay"
      />

      <aside
        className={`etsy-shop-sidebar ${open ? "!w-[244px] shadow-2xl" : ""}`}
        style={{
          ...(open ? { width: "244px" } : {}),
        }}
        aria-label="Vendor dashboard navigation"
      >
        <div className="etsy-sidebar-brand">
          <a
            href="/vendors-dashboard"
            aria-label="Maa Mara Market"
            className="vendor-sidebar-logo"
          >
            <img src={Maamara} alt="Maa Mara Market" />
          </a>
          <div className="min-w-0">
             <div className="">
                <a href="/vendors-dashboard">Maa <span className="it-name">Mara</span> <span className="mkrt">Market</span></a>
              </div>
            <small>Vendor Manager</small>
          </div>
          <button
            type="button"
            onClick={onClose}
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
              onClick={onClose}
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
          <Link to="/vendors-dashboard/settings" onClick={() => setMobileOpen(false)}>
            <IonIcon icon={settingsOutline} aria-hidden="true" />
            <span>Settings</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowSignOutConfirm(true)}
            className="!text-[#595959] hover:!text-[#222]"
          >
            <IonIcon icon={logOutOutline} aria-hidden="true" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      <LogoutConfirmationModal
        open={showSignOutConfirm}
        onCancel={() => setShowSignOutConfirm(false)}
        onConfirm={handleLogout}
        description="Do you want to sign out of your Maa Mara vendor account?"
      />
    </>
  );
};

export default VendorDashboardNav;
