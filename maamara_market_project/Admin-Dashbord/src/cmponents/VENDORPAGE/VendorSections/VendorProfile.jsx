import React, { useEffect, useMemo, useState } from "react";
import { Progress } from "../../../../components/ui/progress";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { baseUrl } from "../../Constant/Constant";
import api from "../../../Services/Api";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../../../../components/ui/hover-card";
import { IonIcon } from "@ionic/react";
import {
  shieldCheckmarkSharp,
  personCircleSharp,
  starSharp,
  storefrontSharp,
  chatbubbleEllipsesSharp,
  timeSharp,
} from "ionicons/icons";
import VendorProfileSheet from "./EditProfile";

const infoValue = (value) =>
  value === null || value === undefined || value === "" ? "N/A" : value;

const mediaUrl = (value) => {
  if (!value) return "";
  if (/^(https?:)?\\/\\//i.test(value) || value.startsWith("data:")) return value;
  const normalized = value.startsWith("/") ? value : `/${value}`;
  return `${baseUrl}${normalized}`;
};

const SingleVendorProfile = () => {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  const fetchActivityLogs = async () => {
    try {
      const response = await api.get(`${baseUrl}/api/activity-logs/`, {
        withCredentials: true,
      });

      const vendorLogs = (response.data || []).filter(
        (log) => log.actor_role === "vendor" || log.user === "vendor"
      );

      setActivityLogs(vendorLogs);
    } catch (activityError) {
      console.error("Failed to fetch activity logs", activityError);
    }
  };

  const fetchVendor = async () => {
    try {
      setError(null);
      const response = await api.get(
        `${baseUrl}/api/vendor-profile/single-page/`,
        { withCredentials: true }
      );
      setVendor(response.data);
    } catch (vendorError) {
      console.error("Failed to fetch vendor:", vendorError);
      setError(vendorError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendor();
  }, []);

  useEffect(() => {
    fetchActivityLogs();

    const interval = setInterval(fetchActivityLogs, 300000);
    return () => clearInterval(interval);
  }, []);

  const chartData = useMemo(() => {
    const payouts =
      vendor?.payouts?.length > 0
        ? vendor.payouts
        : [
            { month: "Jan", payout: 1200 },
            { month: "Feb", payout: 900 },
            { month: "Mar", payout: 1500 },
          ];

    const activityByMonth = activityLogs.reduce((acc, log) => {
      if (!log.timestamp) return acc;

      const date = new Date(log.timestamp);
      if (Number.isNaN(date.getTime())) return acc;

      const month = date.toLocaleString("default", { month: "short" });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    return payouts.map((item) => ({
      month: item.month,
      payout: item.payout ?? item.payouts ?? item.amount ?? 0,
      activities: activityByMonth[item.month] || 0,
    }));
  }, [vendor?.payouts, activityLogs]);

  const handleSave = async (updatedData) => {
    try {
      const submission = new FormData();
      const brandData = {};

      Object.entries(updatedData).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") return;

        if (key === "brand" && typeof value === "object") {
          if (value.name) brandData.name = value.name;
          if (value.description) brandData.description = value.description;
          if (value.logo instanceof File) submission.append("brand_logo", value.logo);
          return;
        }

        if (key === "brand_name") {
          brandData.name = value;
          return;
        }

        if (key === "brand_description") {
          brandData.description = value;
          return;
        }

        if (key === "brand_logo") {
          if (value instanceof File) submission.append("brand_logo", value);
          return;
        }

        if (key.endsWith("_existing") || key.endsWith("_new")) return;

        submission.append(key, value);
      });

      if (updatedData.profile_picture_new instanceof File) {
        submission.append("profile_picture", updatedData.profile_picture_new);
      }

      if (updatedData.company_logo_new instanceof File) {
        submission.append("company_logo", updatedData.company_logo_new);
      }

      if (updatedData.brand_logo_new instanceof File) {
        submission.append("brand_logo", updatedData.brand_logo_new);
      }

      if (Object.keys(brandData).length > 0) {
        submission.append("brand", JSON.stringify(brandData));
      }

      const response = await api.patch(
        `/api/vendor-update-profile/${vendor.id}/`,
        submission,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setVendor(response.data);
      alert("Profile updated successfully!");
    } catch (saveError) {
      console.error(
        "Error updating profile:",
        saveError.response?.data || saveError.message
      );
      alert("Failed to update profile");
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#e6e6e4] bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-gray-600">Loading vendor profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-base font-semibold text-red-800">Unable to load profile</h2>
        <p className="mt-1 text-sm text-red-700">
          Please try again. Your vendor profile could not be loaded.
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            fetchVendor();
          }}
          className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-gray-600">No vendor profile was found.</p>
      </div>
    );
  }

  const fullName = [vendor.first_name, vendor.middle_name, vendor.surname_name]
    .filter(Boolean)
    .join(" ");

  const location = [vendor.address, vendor.address_2, vendor.city, vendor.country]
    .filter(Boolean)
    .join(", ");

  const badges = [
    {
      icon: shieldCheckmarkSharp,
      label: "Identity Verified",
      description: "This vendor’s identity has been verified by admin.",
    },
    {
      icon: personCircleSharp,
      label: "Profile Completed",
      description: "Profile details are available for this vendor account.",
    },
    {
      icon: storefrontSharp,
      label: "Active Vendor",
      description: "This vendor can manage products from the seller dashboard.",
    },
    {
      icon: starSharp,
      label: "Top Rated Vendor",
      description: "Customer ratings and reviews contribute to seller reputation.",
    },
    {
      icon: chatbubbleEllipsesSharp,
      label: "Fast Responder",
      description: "Messaging activity can help customers reach this vendor.",
    },
    {
      icon: timeSharp,
      label: "Long-term Vendor",
      description: `Selling with Maa Mara since ${
        vendor?.regDate
          ? new Date(vendor.regDate).getFullYear()
          : vendor?.date_created
          ? new Date(vendor.date_created).getFullYear()
          : "N/A"
      }.`,
    },
  ];

  const detailRows = [
    ["Full Name", infoValue(fullName)],
    ["Username", infoValue(vendor.username)],
    ["Email", infoValue(vendor.email)],
    ["Phone", infoValue(vendor.phone_number)],
    ["National ID", infoValue(vendor.id_number)],
    ["Vendor Code", infoValue(vendor.vendor_code)],
    ["Location", infoValue(location)],
    ["Company", infoValue(vendor.company_name)],
    ["Workshop", infoValue(vendor.workshop_location)],
    ["Product Type", infoValue(vendor.product_type)],
    ["Food Item", vendor.is_food ? "Yes" : "No"],
    ["KEBS Certified", vendor.Are_You_KEBS_certified ? "Yes" : "No"],
    ["Description", infoValue(vendor.product_description)],
    ["Payment Method", infoValue(vendor.payment_method)],
  ];

  if (vendor.payment_method === "BANK_TRANSFER") {
    detailRows.push(["Bank Account", infoValue(vendor.bank_account_number)]);
  }

  if (vendor.payment_method === "MOBILE_MONEY") {
    detailRows.push(["M-Pesa Type", infoValue(vendor.mpesa_type)]);
    detailRows.push([
      "M-Pesa Number",
      infoValue(vendor.mpesa_number || vendor.mpesa_till || vendor.mpesa_paybill),
    ]);
  }

  if (vendor.payment_method === "PAYPAL") {
    detailRows.push(["PayPal", infoValue(vendor.paypal_email)]);
  }

  detailRows.push(
    ["Tax Number", infoValue(vendor.tax_number)],
    ["Website", infoValue(vendor.website_url)],
    [
      "Joined On",
      vendor.date_created
        ? new Date(vendor.date_created).toLocaleDateString()
        : "N/A",
    ]
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <section className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2563eb]">
            Seller account
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
            Vendor Profile
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Review your business identity, payout details, profile completion, and recent account activity.
          </p>
        </div>
        <VendorProfileSheet vendor={vendor} onSave={handleSave} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div>
                <img
                  src={mediaUrl(vendor.profile_picture) || mediaUrl("/default-avatar.png")}
                  alt={vendor.company_name || fullName || "Vendor profile"}
                  className="h-56 w-full rounded-xl border border-gray-200 object-cover"
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {vendor.company_name || fullName || "Vendor"}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {vendor.vendor_code ? `Vendor code: ${vendor.vendor_code}` : "Vendor account"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2563eb]">
                      {vendor.product_type || "Vendor"}
                    </span>
                    {vendor.Are_You_KEBS_certified && vendor.product_type === "organic" && (
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        KEBS Certified
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-gray-700">Profile completion</span>
                    <span className="font-bold text-gray-900">
                      {vendor.profile_completion ?? 0}%
                    </span>
                  </div>
                  <Progress value={vendor.profile_completion ?? 0} />
                </div>

                <div className="mt-6 border-t border-gray-100 pt-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Vendor badges
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {badges.map((badge) => (
                      <HoverCard key={badge.label}>
                        <HoverCardTrigger asChild>
                          <button
                            type="button"
                            aria-label={badge.label}
                            className="grid h-10 w-10 place-items-center rounded-full border border-gray-200 bg-gray-50 text-gray-700 transition hover:border-[#d9d9d6] hover:bg-blue-50 hover:text-[#2563eb]"
                          >
                            <IonIcon icon={badge.icon} className="text-xl" />
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent>
                          <h3 className="font-semibold text-gray-900">{badge.label}</h3>
                          <p className="mt-1 text-sm text-gray-600">{badge.description}</p>
                        </HoverCardContent>
                      </HoverCard>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Vendor information</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Account, business, location, and payout details.
                </p>
              </div>
            </div>

            <dl className="grid gap-x-8 sm:grid-cols-2">
              {detailRows.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 border-b border-gray-100 py-3 text-sm"
                >
                  <dt className="font-semibold text-gray-700">{label}</dt>
                  <dd className="min-w-0 break-words text-gray-600">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-gray-900">Performance overview</h2>
              <p className="mt-1 text-sm text-gray-500">
                Payout history and vendor activity by month.
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 12, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="payout"
                    name="Payout"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="activities"
                    name="Activities"
                    stroke="#374151"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-gray-200 bg-white shadow-sm xl:sticky xl:top-24 xl:self-start">
          <div className="border-b border-gray-200 p-5 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900">Latest activities</h2>
            <p className="mt-1 text-sm text-gray-500">
              Recent actions recorded for your vendor account.
            </p>
          </div>

          <div className="max-h-[760px] overflow-y-auto p-5 sm:p-6">
            {activityLogs.length > 0 ? (
              <ul className="space-y-5">
                {activityLogs.map((log, index) => (
                  <li
                    key={log.id || `${log.timestamp || "activity"}-${index}`}
                    className="relative border-l-2 border-blue-100 pl-5"
                  >
                    <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-[#2563eb]" />
                    <p className="text-sm font-medium leading-6 text-gray-800">
                      {log.description?.trim() || "No description available"}
                    </p>
                    <time className="mt-1 block text-xs text-gray-500">
                      {log.timestamp
                        ? new Date(log.timestamp).toLocaleString()
                        : "Unknown time"}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <p className="text-sm text-gray-500">No vendor activities found yet.</p>
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
};

export default SingleVendorProfile;
