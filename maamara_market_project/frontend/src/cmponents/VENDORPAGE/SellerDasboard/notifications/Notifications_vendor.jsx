import React from "react";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../theme";
import { useNavigate } from "react-router-dom";

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../../../../components/ui/sheet";

import { Bell } from "lucide-react";
import { useVendorNotificationsWS } from "../../../Hooks/VendorNotificationHook/VendorNotificationsHook";

export default function VendorNotifications() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  const {
    notifications,
    unseenCount,
  } = useVendorNotificationsWS();

  const handleNotificationClick = (notification) => {
    if (notification.url) navigate(notification.url);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="relative p-2 rounded-full ">
          <Bell className="h-6 w-6" style={{ color: colors.gray[100] }} />

          {unseenCount > 0 && (
            <span className="absolute -top-1 -right-1 text-white text-xs px-1.5 py-0.5 rounded-full" style={{backgroundColor: 'rgba(255, 0, 0, 0.56)'}}>
              {unseenCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:w-[420px] p-0"
        style={{
          backgroundColor: colors.primary[400],
          color: colors.gray[100],
          maxHeight: "89vh",
          top: 100,
        }}
      >
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle>🔔 Vendor Notifications</SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-3 max-h-[80vh] overflow-y-auto custom-scroll-form">
          {notifications.length === 0 ? (
            <p className="text-sm opacity-70">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className="cursor-pointer p-3 rounded-lg shadow-sm"
                style={{
                  backgroundColor: colors.primary[500],
                  borderLeft: `4px solid ${
                    n.seen ? colors.gray[500] : colors.greenAccent[500]
                  }`,
                  opacity: n.seen ? 0.7 : 1,
                }}
              >
                <p className="text-sm font-semibold">
                  {n.title}
                </p>
                <p className="text-sm">{n.message}</p>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}