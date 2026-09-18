import React from "react";
import { IonIcon } from "@ionic/react";
import { homeOutline, listOutline, receiptOutline, chatboxOutline, statsChartOutline, cashOutline, megaphoneOutline, helpCircleOutline, settingsOutline, calendarOutline, peopleOutline, logOutOutline, clipboardOutline } from "ionicons/icons";
import { Box } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../Auth/AuthContext/Context";

const items = [
  { label: "Dashboard", to: "/admin-dashboard", icon: homeOutline },
  { label: "Listings", to: "/admin-dashboard/vendors", icon: listOutline },
  { label: "Orders & shipping", to: "/admin-dashboard/vendor-payout", icon: receiptOutline },
  { label: "Messages", to: "/admin-dashboard/join-chat", icon: chatboxOutline },
  { label: "Stats", to: "/admin-dashboard/sales-Analytics", icon: statsChartOutline },
  { label: "Finances", to: "/admin-dashboard/Accounts", icon: cashOutline },
  { label: "Marketing", to: "/admin-dashboard/approve-banner", icon: megaphoneOutline },
  { label: "Customer requests", to: "/admin-dashboard/customer-requests", icon: clipboardOutline },
  { label: "Calendar", to: "/admin-dashboard/calendar", icon: calendarOutline },
  { label: "Vendors", to: "/admin-dashboard/vendors", icon: peopleOutline },
  { label: "Help & support", to: "/admin-dashboard/faq", icon: helpCircleOutline },
];

const NavBar = () => {
  const { logout } = useAuth();
  const location = useLocation();
  return (
    <Box className="etsy-shop-sidebar">
      <div className="etsy-sidebar-brand"><span className="etsy-brand-mark">M</span><div><strong>Maa Mara</strong><small>Shop Manager</small></div></div>
      <nav className="etsy-sidebar-nav" aria-label="Shop Manager">
        {items.map((item) => {
          const active = item.to === "/admin-dashboard" ? location.pathname === item.to : location.pathname.startsWith(item.to);
          return <Link key={item.label} to={item.to} className={active ? "active" : ""}><IonIcon icon={item.icon} /><span>{item.label}</span></Link>;
        })}
      </nav>
      <div className="etsy-sidebar-bottom">
        <Link to="/admin-dashboard/Accounts"><IonIcon icon={settingsOutline} /><span>Settings</span></Link>
        <button type="button" onClick={logout}><IonIcon icon={logOutOutline} /><span>Sign out</span></button>
      </div>
    </Box>
  );
};
export default NavBar;
