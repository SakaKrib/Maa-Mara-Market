import React from "react";
import { IonIcon } from "@ionic/react";
import {
  statsChartOutline,
  addCircleOutline,
  bagCheckOutline,
  peopleOutline,
  chatbubbleEllipsesOutline,
  readerOutline,
  settingsOutline,
  logOutOutline,
  calendar,
  arrowForwardCircleOutline,
  pencilOutline,
  listCircleOutline,
  closeOutline,
} from "ionicons/icons";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../Auth/AuthContext/Context";
import { useVendorOrdersCombined } from "../../Hooks/Order/CombinedOrderHook";

const VendorDashboardNav = () => {
  const location = useLocation();
  const { pending } = useVendorOrdersCombined();
  const { user } = useAuth();

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

  return (
    <aside className="etsy-shop-sidebar" aria-label="Vendor dashboard navigation">
      <div className="etsy-sidebar-brand">
        <div className="etsy-brand-mark" aria-hidden="true">M</div>
        <div>
          <strong>Maa Mara</strong>
          <small>Vendor Manager</small>
        </div>
      </div>

      <div className="px-2 pb-3 text-xs text-[#595959]">
        Welcome, <span className="font-semibold text-[#222]">{userName}</span>
      </div>

      <nav className="etsy-sidebar-nav" aria-label="Vendor sections">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
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
        <Link to="/vendors-dashboard">
          <IonIcon icon={settingsOutline} aria-hidden="true" />
          <span>Settings</span>
        </Link>
        <button type="button" title="Close navigation">
          <IonIcon icon={closeOutline} aria-hidden="true" />
          <span>Close Menu</span>
        </button>
        <button type="button">
          <IonIcon icon={logOutOutline} aria-hidden="true" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default VendorDashboardNav;
