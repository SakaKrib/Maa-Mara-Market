import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTheme } from "@mui/material";
import { tokens } from "../../../theme";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../../../../components/ui/hover-card";
import { IonIcon } from "@ionic/react";
import {
  starSharp,
  heartSharp,
  cartSharp,
  shareSocialSharp,
  timeSharp,
  pricetagSharp,
  eyeSharp,
  cashSharp,
} from "ionicons/icons";
import Header from "../../../Header/Header";
import api from "../../../Services/Api";
import { baseUrl } from "../../Constant/Constant";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import useItemActivityLogs from "../../../cmponents/Hooks/ActivityHook/ItemActivityHook";

dayjs.extend(relativeTime);

const SingleItemProfile = () => {
  const { id } = useParams();

  // Hooks must be unconditional and in same order
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // Custom hook for activity logs (make sure it follows hooks rules internally)
  const {
    activityLogs,
    fetchActivityLogs,
    deleteSingleLog,
    clearItemLogs,
  } = useItemActivityLogs(id);

  // Fetch item data
  useEffect(() => {
    if (!id) return;
  
    let isMounted = true; // to prevent setting state if unmounted
  
    const fetchItem = async () => {
      try {
        const res = await api.get(`/api/items-vendor/${id}/`, {
          withCredentials: true,
        });
        if (isMounted) setItem(res.data);
      } catch (err) {
        console.error("Failed to fetch item:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
  
    fetchItem();
    fetchActivityLogs();
  
    return () => {
      isMounted = false;
    };
  }, [id, fetchActivityLogs]);
  
  // Filter vendor logs (always called)
  const vendorActivityLogs = useMemo(() => {
    return activityLogs?.filter((log) => log.actor_type === "vendor") || [];
  }, [activityLogs]);

  // Prepare chart data from logs (always called)
  const chartData = useMemo(() => {
    const grouped = vendorActivityLogs.reduce((acc, log) => {
      const date = new Date(log.timestamp);
      const monthIndex = date.getMonth();
      const monthName = date.toLocaleString("default", { month: "short" });

      if (!acc[monthIndex]) {
        acc[monthIndex] = {
          monthIndex,
          month: monthName,
          activities: 0,
        };
      }
      acc[monthIndex].activities += 1;
      return acc;
    }, {});

    return Object.values(grouped)
      .sort((a, b) => a.monthIndex - b.monthIndex)
      .map((item) => ({
        month: item.month,
        activities: item.activities,
        sales: Math.floor(Math.random() * 800) + 200,
      }));
  }, [vendorActivityLogs]);

  // Activity icon helper
  const getActivityIcon = (action) => {
    switch (action) {
      case "item_viewed":
        return { icon: eyeSharp, color: colors.blueAccent[400], label: "Viewed" };
      case "item_added_to_cart":
        return { icon: cartSharp, color: colors.greenAccent[400], label: "Added to Cart" };
      case "item_purchased":
        return { icon: cashSharp, color: colors.greenAccent[400], label: "Purchased" };
      case "item_removed_from_cart":
        return { icon: cartSharp, color: colors.redAccent[400], label: "Removed from Cart" };
      case "item_added_to_wishlist":
        return { icon: heartSharp, color: colors.orangeAccent[400], label: "Wishlisted" };
      case "item_removed_from_wishlist":
        return { icon: heartSharp, color: colors.gray[400], label: "Wishlist Removed" };
      case "item_reviewed":
        return { icon: starSharp, color: colors.yellowAccent[400], label: "Reviewed" };
      case "item_shared":
        return { icon: shareSocialSharp, color: colors.purpleAccent[400], label: "Shared" };
      case "item_created":
        return { icon: pricetagSharp, color: colors.tealAccent[400], label: "Created" };
      case "item_sold":
        return { icon: cashSharp, color: colors.orangeAccent[400], label: "Sold" };
      default:
        return { icon: timeSharp, color: colors.gray[300], label: "Activity" };
    }
  };

  if (loading) return <p className="p-4">Loading item...</p>;
  if (!item) return <p className="p-4">Item not found.</p>;

  return (
    <div
      className="flex gap-2 p-2 w-full flex-wrap flex-col lg:flex-row"
      style={{ maxHeight: "165vh", overflowY: "hidden" }}
    >
      {/* LEFT SIDE */}
      <div className="flex flex-col gap-6 lg:w-[49%] md:w-[50%] sm:w-full">
        <Header title="Item" subtitle={item.name} />

        <div
          className="p-4 rounded-md"
          style={{ backgroundColor: colors.primary[600], color: colors.gray[100] }}
        >
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <img
              src={item.image || "/placeholder.png"}
              alt={item.name}
              className="w-64 h-64 rounded-md object-cover"
            />

            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">{item.name}</h2>
              <p className="text-sm text-gray-300">{item.description?.slice(0, 120)}...</p>
              <p className="text-md font-bold text-green-400">KES {item.price}</p>
              <p className="text-sm text-gray-400">
                Stock: {item.in_stock} | Category: {item.category}
              </p>
              <p className="text-sm text-gray-400">Department: {item.department}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            {[eyeSharp, cartSharp, heartSharp, shareSocialSharp, pricetagSharp].map(
              (icon, i) => (
                <HoverCard key={i}>
                  <HoverCardTrigger>
                    <IonIcon
                      icon={icon}
                      className="text-2xl p-2 rounded-full hover:scale-110 transition-transform"
                      style={{
                        backgroundColor: colors.primary[500],
                        border: `1px solid ${colors.gray[400]}`,
                      }}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent className="text-white text-sm">
                    {icon === eyeSharp && "Viewed"}
                    {icon === cartSharp && "Added to Cart"}
                    {icon === heartSharp && "Wishlisted"}
                    {icon === shareSocialSharp && "Shared"}
                    {icon === pricetagSharp && "Discounted"}
                  </HoverCardContent>
                </HoverCard>
              )
            )}
          </div>
        </div>

        {/* CHART */}
        <div
          className="p-4 rounded-md"
          style={{ backgroundColor: colors.gray[700], color: colors.gray[100] }}
        >
          <h2 className="text-lg md:text-xl mb-4">Item Activity & Sales Trend</h2>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.gray[500]} />
                <XAxis
                  dataKey="month"
                  stroke={colors.gray[300]}
                  tick={{ fill: colors.greenAccent[400], fontSize: 12 }}
                />
                <YAxis
                  stroke={colors.gray[300]}
                  tick={{ fill: colors.greenAccent[400] }}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke={colors.blueAccent[400]}
                  strokeWidth={2}
                  name="Sales"
                />
                <Line
                  type="monotone"
                  dataKey="activities"
                  stroke={colors.redAccent[400]}
                  strokeWidth={2}
                  name="Activity Count"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div
        className="p-4 rounded-md lg:w-[50%] md:w-[50%] sm:w-full"
        style={{
          
          color: colors.gray[100],
          overflowY: "auto",
          maxHeight: "165vh",
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold text-lg">Recent Item Activities</h4>

          {vendorActivityLogs.length > 0 && (
            <button
              onClick={clearItemLogs}
              className="text-sm px-2 py-1 bg-red-600 rounded hover:bg-red-500 transition"
            >
              Clear All
            </button>
          )}
        </div>

        <ul className="space-y-3 px-2">
          {vendorActivityLogs.length > 0 ? (
            vendorActivityLogs.map((log) => {
              const { icon, color, label } = getActivityIcon(log.action);
              return (
                <li
                  key={log.id}
                  className="border-b border-gray-600 pb-2 flex items-start justify-between gap-3 hover:bg-gray-800 rounded-md p-2 transition"
                >
                  <div className="flex items-start gap-3 shadow-custom">
                    <IonIcon icon={icon} style={{ color:colors.gray[100] }} className="text-xl mt-1" />
                    <div className="flex flex-col">
                      <p className="text-sm">{log.description || label}</p>
                      <time className="text-gray-400 text-xs">
                        {dayjs(log.timestamp).fromNow()}
                      </time>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteSingleLog(log.id)}
                    className="text-sm text-red-500 hover:text-red-400 transition"
                    aria-label="Delete log"
                  >
                    🗑️
                  </button>
                </li>
              );
            })
          ) : (
            <li className="text-gray-400 text-sm">No activities found</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default SingleItemProfile;
