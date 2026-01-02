"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../theme"; 
import { useNavigate } from "react-router-dom";
import api from "../../../../Services/Api";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../../../../components/ui/sheet"; // shadcn imports
import { Bell } from "lucide-react"; // bell icon for trigger

export default function VendorNotifications() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);

  // ✅ Fetch vendor notifications
  const fetchNotifications = async () => {
    try {
      const response = await api.get("/api/vendor-notifications/", {
        withCredentials: true,
      });
      const data = response.data || [];
      setNotifications(data);
      setUnseenCount(data.filter((n) => !n.seen).length);
    } catch (error) {
      console.error("Failed to fetch vendor notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Mark as seen & navigate
  const handleNotificationClick = async (notification) => {
    if (notification.url) navigate(notification.url);

    if (!notification.seen) {
      try {
        await api.post(
          `/api/notifications/${notification.id}/mark_seen/`,
          null,
          { withCredentials: true }
        );
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, seen: true } : n
          )
        );
        setUnseenCount((prev) => Math.max(prev - 1, 0));
      } catch (error) {
        console.error("Failed to mark notification as seen:", error);
      }
    }
  };

  return (
    <Sheet style={{ maxHeight: "60vh" }}>
      {/* 🔔 Trigger */}
      <SheetTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-gray-700 transition">
          <Bell className="h-6 w-6 text-white" />
          {unseenCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {unseenCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      {/* 📬 Sheet Content */}
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
        <SheetHeader className="px-4 py-3 border-b border-gray-700">
          <SheetTitle className="flex items-center gap-2">
            🔔 Vendor Notifications
          </SheetTitle>
        </SheetHeader>

        {/* Notification List */}
        <div className="p-4 space-y-3 max-h-[80vh] overflow-y-auto scroll">
          {notifications.length === 0 ? (
            <p className="text-sm opacity-70">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`cursor-pointer p-3 rounded-lg transition shadow-sm ${
                  n.seen ? "opacity-70" : "border-l-4 font-semibold"
                }`}
                style={{
                  backgroundColor: colors.primary[500],
                  borderLeftColor: n.seen
                    ? colors.gray[500]
                    : colors.greenAccent[500],
                }}
              >
                {n.title && (
                  <p
                    className="text-sm mb-1"
                    style={{ color: colors.greenAccent[400] }}
                  >
                    {n.title}
                  </p>
                )}
                <p className="text-sm">{n.message}</p>
                <span
                  className="text-xs block mt-1"
                  style={{ color: colors.gray[400] }}
                >
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
