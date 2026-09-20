import React from "react";
import { IonIcon } from "@ionic/react";
import {
  homeOutline,
  peopleOutline,
  cashOutline,
  chatboxOutline,
  statsChartOutline,
  helpCircleOutline,
  settingsOutline,
  calendarOutline,
  clipboardOutline,
  megaphoneOutline,
  briefcaseOutline,
  closeOutline,
  logOutOutline,
  cubeOutline,
  cardOutline,
  shieldCheckmarkOutline,
} from "ionicons/icons";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../Auth/AuthContext/Context";

const navigation = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", to: "/admin-dashboard", icon: homeOutline },
      { label: "Analytics", to: "/admin-dashboard/sales-Analytics", icon: statsChartOutline },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { label: "Vendors", to: "/admin-dashboard/vendors", icon: peopleOutline },
      { label: "Vendor requests", to: "/admin-dashboard/vendor-requests", icon: shieldCheckmarkOutline },
      { label: "Item requests", to: "/admin-dashboard/vendor/create-items/requests", icon: cubeOutline },
      { label: "Returns & customer requests", to: "/admin-dashboard/customer-requests", icon: clipboardOutline },
    ],
  },
  {
    label: "Money",
    items: [
      { label: "Payouts", to: "/admin-dashboard/vendor-payout", icon: cashOutline },
      { label: "Accounts", to: "/admin-dashboard/Accounts", icon: cardOutline },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Messages", to: "/admin-dashboard/join-chat", icon: chatboxOutline },
      { label: "Careers", to: "/admin-dashboard/create-career", icon: briefcaseOutline },
      { label: "Support", to: "/admin-dashboard/create-support", icon: helpCircleOutline },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Marketing & banners", to: "/admin-dashboard/approve-banner", icon: megaphoneOutline },
      { label: "FAQ", to: "/admin-dashboard/faq", icon: helpCircleOutline },
    ],
  },
];

const NavBar = ({ open = false, onClose }) => {
  const { logout } = useAuth();
  const location = useLocation();

  const isActive = (to) => {
    if (to === "/admin-dashboard") return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close admin navigation"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/45 transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 lg:shadow-none ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
          <Link to="/admin-dashboard" onClick={onClose} className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-lg font-black text-white shadow-sm">
              M
            </span>
            <span className="leading-tight">
              <strong className="block text-sm font800 font-semibold tracking-tight text-slate-900 dark:text-white">Maa Mara</strong>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Shop Manager</span>
            </span>
          </Link>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800">
            <IonIcon icon={closeOutline} className="text-xl" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin dashboard navigation">
          {navigation.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item.to);
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={onClose}
                      className={`group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"}`}
                    >
                      <IonIcon icon={item.icon} className={`shrink-0 text-lg ${active ? "text-indigo-600 dark:text-indigo-300" : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"}`} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">
          <Link
            to="/admin-dashboard/calendar"
            onClick={onClose}
            className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive("/admin-dashboard/calendar") ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
          >
            <IonIcon icon={calendarOutline} className="text-lg" />
            Calendar
          </Link>
          <Link
            to="/admin-dashboard/Accounts"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <IonIcon icon={settingsOutline} className="text-lg" />
            Settings
          </Link>
          <button
            type="button"
            onClick={logout}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-500/10 dark:hover:text-red-300"
          >
            <IonIcon icon={logOutOutline} className="text-lg" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
};

export default NavBar;
