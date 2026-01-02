import React, { useEffect, useState } from "react";
import { useAuth } from "../../Auth/AuthContext/Context";
import { useTheme } from "@mui/material";
import { tokens } from "../../../theme";
import { Progress } from "../../../../components/ui/progress";
import { Activity } from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { baseUrl } from "../../Constant/Constant";
import api from "../../../Services/Api";
import "./VendorProfile.css";
import { HoverCard, HoverCardContent, HoverCardTrigger} from "../../../../components/ui/hover-card";
import { IonIcon } from '@ionic/react';
import {
  shieldCheckmarkSharp,
  personCircleSharp,
  starSharp,
  storefrontSharp,
  chatbubbleEllipsesSharp,
  timeSharp
} from "ionicons/icons";
import Header from "../../../Header/Header";

import VendorProfileSheet from "./EditProfile";


const data = [
    { name: 'Page A', uv: 4000, pv: 2400 },
    { name: 'Page B', uv: 3000, pv: 1398 },
    { name: 'Page C', uv: 2000, pv: 9800 },
    { name: 'Page D', uv: 2780, pv: 3908 },
    { name: 'Page E', uv: 1890, pv: 4800 },
    { name: 'Page F', uv: 2390, pv: 3800 },
    { name: 'Page G', uv: 3490, pv: 4300 },
  ];



const SingleVendorProfile = () => {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const hasMissingFields =
    !vendor?.brand?.name ||
    !vendor?.brand?.description ||
    !vendor?.brand?.logo ||
    !vendor?.company ||
    !vendor?.address ||
    !vendor?.image;

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const user = useAuth();
  const [activityLogs, setActivityLogs] = useState([]);

  // 🔹 Fetch activity logs from API
  const fetchActivityLogs = async () => {
    try {
      const response = await api.get(`${baseUrl}/api/activity-logs/`, {
        withCredentials: true,
      });
  
      // Example: only include logs where actor_role === "vendor"
      const vendorLogs = (response.data || []).filter(
        (log) => log.actor_role === "vendor" || log.user === "vendor"
      );
  
      setActivityLogs(vendorLogs);
    } catch (error) {
      console.error("Failed to fetch activity logs", error);
    }
  };

  // 1️⃣ Base data: from vendor payout history or fallback
const chartData = vendor?.payouts || [
  { month: "Jan", payout: 1200 },
  { month: "Feb", payout: 900 },
  { month: "Mar", payout: 1500 },
];

console.log(vendor)
  // Transform activity logs into counts per month
const activityData = activityLogs.reduce((acc, log) => {
  const date = new Date(log.timestamp);
  const month = date.toLocaleString("default", { month: "short" });

  if (!acc[month]) {
    acc[month] = { month, activities: 0 };
  }
  acc[month].activities += 1;
  return acc;
}, {});

const mergedData = chartData.map((item) => ({
  month: item.month,
  payout: item.payout, // 💰 payout data
  activities: activityData[item.month]?.activities || 0, // 📊 logs
}));


const handleSave = async (updatedData) => {
  console.log("Updated Vendor Profile:", updatedData);

  try {
    const submission = new FormData();
    const brandData = {};

    Object.entries(updatedData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        if (key === "brand_name") {
          brandData.name = value;
        } else if (key === "brand_description") {
          brandData.description = value;
        } else if (key === "brand_logo") {
          // append file directly
          submission.append("brand_logo", value);
        } else {
          submission.append(key, value);
        }
      }
    });

    // append brand JSON if name/description exists
    if (Object.keys(brandData).length > 0) {
      submission.append("brand", JSON.stringify(brandData));
    }

    const res = await api.patch(`/api/vendor-update-profile/${vendor.id}/`, submission, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    alert("Profile updated successfully!");
    onSave(res.data); // send updated data back to parent
  } catch (err) {
    console.error("Error updating profile:", err.response?.data || err.message);
    alert("Failed to update profile");
  }
};




  

  // Fetch single vendor (current logged-in vendor, or static endpoint)
  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const response = await api.get(
          `${baseUrl}/api/vendor-profile/single-page/`,
          { withCredentials: true }
        );
        setVendor(response.data);
      } catch (err) {
        console.error("Failed to fetch vendor:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendor();
  }, []);

//   fetch every 5minutes
useEffect(() => {
    // fetch once on mount
    fetchActivityLogs();
  
    // then fetch every 5 minutes (300,000 ms)
    const interval = setInterval(() => {
      fetchActivityLogs();
    }, 300000);
  
    // cleanup on unmount
    return () => clearInterval(interval);
  }, []);
  

  if (loading) {
    return <p className="p-4">Loading vendor...</p>;
  }

  if (error) {
    return (
      <p className="p-4 text-red-500">
        <p>{error}</p>
        Failed to load vendor profile. Please try again later.
      </p>
    );
  }

  if (!vendor) {
    return <p className="p-4">No vendor found.</p>;
  }

  // Example chart data (replace with vendor.sales_history if backend provides it)
  

  return (
    <div className="flex gap-2 p-2 w-[100%] lg:w-full flex-wrap flex-col sm:w-[calc(100%-80px)] xxs:w-[calc(100%-80px)] md:relative xxs:top-1 sm:top-10 md:top-10 md:flex-col lg:flex-row" style={{ maxHeight:'165vh', overflowY:'hidden'}}>
      
        
      {/* LEFT SIDE (Vendor Info + Chart) */}
      <div className="flex md:w-[50%] lg:w-[49%] sm:w-[100%] flex-col gap-6">
        <Header title={'my profile'} />
        {/* Top section */}
        <div className="flex flex-col lg:flex-col gap-6">
          {/* Image + Badges */}
          <div className="flex flex-col md:flex-row gap-4 w-full">
            {/* Vendor Image */}
            <div className="flex justify-center md:justify-start">
              <img
                src={vendor?.profile_picture || "/default-avatar.png"}
                alt={vendor?.company_name}
                className="w-28 h-64 md:w-96 md:h-64 object-cover rounded-[5px] xxs:w-full sm:w-full"
              />
            </div>

            {/* Vendor Badges */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <span className="bg-blue-200 text-blue-700 px-2 py-1 rounded-md text-xs">
                  Vendor Code: {vendor?.vendor_code}
                </span>
                <span className="bg-green-200 text-green-700 px-2 py-1 rounded-md text-xs">
                  {vendor?.product_type === 'organic' ? "Food Vendor" : "Non-Food Vendor"}
                </span>
                {vendor?.Are_You_KEBS_certified && vendor?.product_type === 'organic' && (
                  <span className="bg-purple-200 text-purple-700 px-2 py-1 rounded-md text-xs">
                    KEBS Certified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Vendor Badges */}
          <div
              className="p-4 rounded-lg w-full md:full lg-full md:mt-0 h-fit lg:mt-auto lg:p-1 md:w-[24pc] "
              style={{ backgroundColor: colors.primary[600] }}
            >
              <h1 className="font-semibold text-lg md:text-xl sm-text-lg lg:hidden md:hidden " style={{ color: colors.gray[100] }}>
                Vendor Badges
              </h1>
              <div
                className="flex sm:flex-wrap sm:gap-4 md:gap-8 md:p-0 mt-4 justify-center sm:justify-start"
                style={{ color: colors.gray[100] }}
              >
                {/* Identity Verified */}
                <HoverCard>
                  <HoverCardTrigger>
                    <IonIcon
                      icon={shieldCheckmarkSharp}
                      className="text-2xl rounded-full p-1"
                      style={{
                        backgroundColor: colors.blueAccent[500],
                        border: `1px solid ${colors.blueAccent[900]}`,
                      }}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <h1 className="text-lg font-semibold text-start">Identity Verified</h1>
                    <p className="text-sm px-3 text-white">
                      This vendor’s identity has been verified by admin.
                    </p>
                  </HoverCardContent>
                </HoverCard>

                {/* Profile Completed */}
                <HoverCard>
                  <HoverCardTrigger>
                    <IonIcon
                      icon={personCircleSharp}
                      className="text-2xl rounded-full p-1"
                      style={{
                        backgroundColor: colors.greenAccent[500],
                        border: `1px solid ${colors.greenAccent[900]}`,
                      }}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <h1 className="text-lg font-semibold text-start">Profile Completed</h1>
                    <p className="text-sm px-3 text-white">
                      This vendor has completed their profile details.
                    </p>
                  </HoverCardContent>
                </HoverCard>

                {/* Active Vendor */}
                <HoverCard>
                  <HoverCardTrigger>
                    <IonIcon
                      icon={storefrontSharp}
                      className="text-2xl rounded-full p-1"
                      style={{
                        backgroundColor: colors.redAccent[500],
                        border: `1px solid ${colors.redAccent[900]}`,
                      }}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <h1 className="text-lg font-semibold text-start">Active Vendor</h1>
                    <p className="text-sm px-3 text-white">
                      This vendor has listed active products.
                    </p>
                  </HoverCardContent>
                </HoverCard>

                {/* Top Rated Vendor */}
                <HoverCard>
                  <HoverCardTrigger>
                    <IonIcon
                      icon={starSharp}
                      className="text-2xl rounded-full p-1"
                      style={{
                        backgroundColor: colors.yellowAccent[400],
                        border: `1px solid ${colors.yellowAccent[900]}`,
                        color: colors.gray[800],
                      }}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <h1 className="text-lg font-semibold text-start">Top Rated Vendor</h1>
                    <p className="text-sm px-3 text-white">
                      Highly rated by customers for quality and service.
                    </p>
                  </HoverCardContent>
                </HoverCard>

                {/* Fast Responder */}
                <HoverCard>
                  <HoverCardTrigger>
                    <IonIcon
                      icon={chatbubbleEllipsesSharp}
                      className="text-2xl rounded-full p-1"
                      style={{
                        backgroundColor: colors.tealAccent[500],
                        border: `1px solid ${colors.tealAccent[900]}`,
                        color: colors.gray[800],
                      }}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <h1 className="text-lg font-semibold text-start">Fast Responder</h1>
                    <p className="text-sm px-3 text-white">
                      Vendor responds quickly to customer inquiries.
                    </p>
                  </HoverCardContent>
                </HoverCard>

                {/* Long-term Vendor */}
                <HoverCard>
                  <HoverCardTrigger>
                    <IonIcon
                      icon={timeSharp}
                      className="text-2xl rounded-full p-1"
                      style={{
                        backgroundColor: colors.blueAccent[400],
                        color: colors.gray[800],
                        border: `1px solid ${colors.blueAccent[700]}`,
                      }}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <h1 className="text-lg font-semibold text-start">Long-term Vendor</h1>
                    <p className="text-sm px-3 text-white">
                      Selling with us since{" "}
                      {vendor?.regDate ? new Date(vendor.regDate).getFullYear() : "N/A"}.
                    </p>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </div>
        

          {/* Vendor Info */}
          <div
            className="space-y-4 p-4 rounded-md w-full"
            style={{
              color: colors.gray[100],
              backgroundColor: colors.primary[600],
            }}
          >
            <div className="flex justify-between items-center">
              <h1 className="text-lg md:text-xl">Vendor Information</h1>
               {/* Edit Profile */}
               <VendorProfileSheet vendor={vendor} onSave={handleSave} />
            </div>

            {/* Profile Completion */}
            <div className="flex flex-col gap-2 mb-6">
              <p className="text-sm md:text-lg text-muted-foreground">
                Profile Completion ({vendor.profile_completion}%)
              </p>
              <Progress value={vendor.profile_completion} />
            </div>

            {/* Vendor Details */}
            <div className="flex flex-col gap-2 text-sm md:text-base">
              <div className="flex items-center gap-2">
                <span className="font-bold">Full Name:</span>
                <span>
                  {vendor?.first_name} {vendor?.middle_name}{" "}
                  {vendor?.surname_name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Username:</span>
                <span>{vendor?.username}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Email:</span>
                <span>{vendor?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Phone:</span>
                <span>{vendor?.phone_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">National ID:</span>
                <span>{vendor?.id_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Vendor Code:</span>
                <span>{vendor?.vendor_code}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Location:</span>
                <span>
                  {vendor?.address}, {vendor?.address_2}, {vendor?.city},{" "}
                  {vendor?.country}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Company:</span>
                <span>{vendor?.company_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Workshop:</span>
                <span>{vendor?.workshop_location}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Product Type:</span>
                <span>{vendor?.product_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Food Item:</span>
                <span>{vendor?.is_food ? "Yes" : "No"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">KEBS Certified:</span>
                <span>{vendor?.Are_You_KEBS_certified ? "Yes" : "No"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Description:</span>
                <span>{vendor?.product_description}</span>
              </div>

              {/* Payment Info */}
              <div className="flex items-center gap-2">
                <span className="font-bold">Payment Method:</span>
                <span>{vendor?.payment_method}</span>
              </div>
              {vendor?.payment_method === "BANK_TRANSFER" && (
                <div className="flex items-center gap-2">
                  <span className="font-bold">Bank Account:</span>
                  <span>{vendor?.bank_account_number}</span>
                </div>
              )}
              {vendor?.payment_method === "MOBILE_MONEY" && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">M-Pesa Type:</span>
                    <span>{vendor?.mpesa_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Number:</span>
                    <span>
                      {vendor?.mpesa_number ||
                        vendor?.mpesa_till ||
                        vendor?.mpesa_paybill}
                    </span>
                  </div>
                </>
              )}
              {vendor?.payment_method === "PAYPAL" && (
                <div className="flex items-center gap-2">
                  <span className="font-bold">PayPal:</span>
                  <span>{vendor?.paypal_email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="font-bold">Tax Number:</span>
                <span>{vendor?.tax_number || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Website:</span>
                <span>{vendor?.website_url || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Joined On:</span>
                <span>
                  {vendor?.date_created
                    ? new Date(vendor.date_created).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div
          className="p-4 rounded-md"
          style={{
            color: colors.gray[100],
            backgroundColor: colors.gray[700],
          }}
        >
          <h2 className="text-lg md:text-xl mb-4">Performance Chart</h2>
          <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedData}>
                {/* X Axis */}
                <XAxis
                dataKey="month"  // month
                stroke={colors.gray[300]} // axis line
                tick={{ 
                    fill: colors.greenAccent[400], // ✅ tick label color
                    fontSize: 12,
                    fontWeight: 500
                }}
                />

                {/* Y Axis */}
                <YAxis
                stroke={colors.gray[300]}
                tick={{ 
                    fill: colors.greenAccent[400], // ✅ tick label color
                    fontSize: 12,
                    fontWeight: 500
                }}
                />

                <Tooltip />
                <Line
                type="monotone"
                dataKey="payouts"
                stroke={colors.primary[900]}
                strokeWidth={2}
                />
                <Line
                type="monotone"
                dataKey="activity"
                stroke={colors.redAccent[400]}
                strokeWidth={2}
                />
            </LineChart>
            </ResponsiveContainer>

          </div>
        </div>
      </div>

      {/* RIGHT SIDE (Activities) */}
      <div
      className="activities p-4 rounded-md md:w-[50%] lg:w-[50%] sm-w[100%]"
      style={{ color: colors.gray[100], backgroundColor: colors.primary[500], maxHeight:'100%', overflowY:'auto' }}
    >
      <h4 className="font-semibold mb-4 text-lg">Latest Activities</h4>
      <ul className="space-y-3 px-2 overflow-y-auto">
  {activityLogs.length > 0 ? (
    activityLogs.map((log, i) => (
      <li
        key={i}
        className="shadow-custom dark:border-gray-700 pb-2 border-l relative"
      >
        {/* <span
          className="absolute w-3 h-3 -left-1 top-2 rounded-full"
          style={{ backgroundColor: colors.yellowAccent[500] }}
        ></span> */}
        <div className="activity text-sm flex flex-col gap-1">
          <p className="relative">
            {log.description && log.description.trim() !== ""
              ? log.description
              : "No description available"}
          </p>
          <time className="text-gray-400">
            {log.timestamp
              ? new Date(log.timestamp).toLocaleString()
              : "Unknown time"}
          </time>
        </div>
      </li>
    ))
  ) : (
    <li className="text-gray-400 text-sm">No activities found</li>
  )}
</ul>

    </div>
    </div>
  );
};

export default SingleVendorProfile;
