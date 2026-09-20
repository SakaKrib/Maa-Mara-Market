import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "../../../../../../../components/ui/card";
import { Button } from "../../../../../../../components/ui/button";
import { Input } from "../../../../../../../components/ui/input";
import {
  User,
  Coins,
  Gift,
  Edit2,
  Save,
  Loader2,
  Wallet,
  Users,
  ImagePlus,
  MapPin,
  Calendar,
  ShoppingBag,
  Undo2,
} from "lucide-react";
import api from "../../../../../../Services/Api";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import RequestReturnForm from "../Return/Return";
import { Avatar } from "@mui/material";

export default function UserAccount() {
  const [userData, setUserData] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [voucher, setVouchers] = useState(null);
  const [referral, setReferral] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    profile_picture: null,
    date_of_birth: "",
    location: "",
    phone_number: "",
    address: "",
    city: "",
    country: "",
  });
  
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });


  // Fetch user data
  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const res = await api.get("/api/user/account/", {
          withCredentials: true,
        });
        const data = res.data;
  
        if (data.success) {
          setUserData(data.user);
          setWallet(data.wallet);
          setVouchers(data.voucher);
          setReferral(data.referrals);
          setProfile(data.profile);
          setOrders(data.orders || []);
  
          setFormData({
            first_name: data.user.first_name || "",
            last_name: data.user.last_name || "",
            email: data.user.email || "",
            date_of_birth: data.profile?.date_of_birth || "",
            phone_number: data.profile?.phone_number || "",
            address: data.profile?.address || "",
            city: data.profile?.city || "",
            country: data.profile?.country || "",
            location: data.profile?.location || "",
            profile_picture: data.profile?.profile_picture || null,
          });
          
        }
      } catch (err) {
        console.error("Error fetching account:", err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchAccount();
  }, []);
  

  // Handle form field changes
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Handle profile picture selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, profile_picture: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  // Save or create profile
  const handleSave = async () => {
    const form = new FormData();
  form.append("first_name", formData.first_name);
  form.append("last_name", formData.last_name);
  form.append("email", formData.email);
  form.append("date_of_birth", formData.date_of_birth);
  form.append("location", formData.location);
  form.append("phone_number", formData.phone_number);
  form.append("address", formData.address);
  form.append("city", formData.city);
  form.append("country", formData.country);

    if (formData.profile_picture instanceof File) {
      form.append("profile_picture", formData.profile_picture);
    }

    try {
      const res = await api.post("/api/user/update/", form, {
        withCredentials: true,
      });

      const data = res.data;
      if (data.success) {
        setUserData(data.user);
        setProfile(data.profile);
        setEditing(false);
        setToast({
          open: true,
          message: "✅ Profile updated successfully!",
          severity: "success",
        });
      } else {
        setToast({
          open: true,
          message: "⚠️ Failed to update profile.",
          severity: "error",
        });
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setToast({
        open: true,
        message: "❌ Error updating profile. Try again.",
        severity: "error",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin w-8 h-8 text-gray-500" />
      </div>
    );
  }

  return (
    <>
      <div className="mm-account-page px-2 py-4 md:px-6 md:py-6 flex justify-center">
        <Card className="mm-account-card w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-lg">
          <CardContent className="mm-account-content p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="mm-account-header flex justify-between items-center gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <User className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-semibold mm-account-title">Account Settings</h2>
              </div>
              <Button
                variant="secondary"
                onClick={() => (editing ? handleSave() : setEditing(true))}
                className="mm-account-edit-button flex items-center gap-2"
              >
                {editing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                {editing ? "Save" : "Edit"}
              </Button>
            </div>

            {/* Profile Picture */}
            <div className="mm-account-profile flex items-center gap-4 mt-4">
              <img
                src={preview || profile?.profile_picture || "/default-avatar.png"}
                alt="Profile"
                className="mm-account-avatar w-24 h-24 rounded-full object-cover border-2 border-gray-300"
              />
              {editing && (
                <label className="mm-account-upload flex items-center gap-2 text-sm cursor-pointer text-blue-500">
                  <ImagePlus className="w-4 h-4" />
                  <span>Upload New</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>

            {/* User Info */}
            <div className="mm-account-form grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mm-account-label text-sm text-gray-500">First Name</label>
                <Input className="mm-account-input"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </div>
              <div>
                <label className="mm-account-label text-sm text-gray-500">Last Name</label>
                <Input className="mm-account-input"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="mm-account-label text-sm text-gray-500">Email</label>
                <Input className="mm-account-input"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </div>
              <div>
                <label className="mm-account-label text-sm text-gray-500 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Date of Birth
                </label>
                <Input className="mm-account-input"
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </div>

               {/* 🆕 Phone Number */}
               <div>
                <label className="mm-account-label text-sm text-gray-500 flex items-center gap-1">
                  📞 Phone Number
                </label>
                <Input className="mm-account-input"
                  name="phone_number"
                  value={formData.phone_number || ""}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </div>

              <div>
                <label className="mm-account-label text-sm text-gray-500 flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> Location
                </label>
                <Input className="mm-account-input"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </div>


              {/* 🆕 City */}
              <div>
                <label className="mm-account-label text-sm text-gray-500 flex items-center gap-1">
                  Country
                </label>
                <Input className="mm-account-input"
                  name="country"
                  value={formData.country || ""}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </div>

              {/* 🆕 City */}
              <div>
                <label className="mm-account-label text-sm text-gray-500 flex items-center gap-1">
                  🏙️ City / State
                </label>
                <Input className="mm-account-input"
                  name="city"
                  value={formData.city || ""}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </div>

              {/* 🆕 Address */}
              <div className="col-span-1">
                <label className="mm-account-label text-sm text-gray-500 flex items-center gap-1">
                  🏠 Address
                </label>
                <Input className="mm-account-input"
                  name="address"
                  value={formData.address || ""}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </div>
            </div>

            <div className="mm-account-invite flex justify-center">
              <Button className='mm-account-primary-button w-full sm:w-auto' >
                Invite a Friend
              </Button>
            </div>

            {/* Orders Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mm-account-section bg-gray-50 dark:bg-gray-800 p-4 md:p-5 rounded-xl shadow-sm space-y-4"
            >
              <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <ShoppingBag className="w-5 h-5 text-indigo-500" />
                Completed Orders
              </h3>

              {orders.length ? (
                <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2">
                  {orders
                    .filter((o) => o.status === "completed")
                    .map((o) => (
                      <div
                        key={o.id}
                        className="border rounded-lg p-3 shadow-sm bg-muted/30"
                      >
                        <div className="flex justify-between items-center border-b pb-1 mb-2">
                          <span className="font-medium">Order #{o.paypal_order_id}</span>
                          <span className="text-xs text-green-600 font-semibold">
                            {o.status.toUpperCase()}
                          </span>
                        </div>

                        {o.items.map((itemObj) => {
                          const item = itemObj.item;
                          const price =
                            item.final_discounted_price || item.final_price;
                          return (
                            <div
                              key={itemObj.id}
                              className="flex justify-between items-center text-sm text-muted-foreground mb-2"
                            >
                              <div>
                                <span>{item.name}</span>{" "}
                                <span className="ml-1 text-xs text-gray-500">
                                  ({itemObj.quantity} × KES {price.toFixed(2)})
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedItem({ ...itemObj, order: o })}
                                className="text-xs"
                              >
                                <Undo2 className="h-3.5 w-3.5 mr-1" />
                                Return
                              </Button>
                            </div>
                          );
                        })}

                        <div className="flex justify-between text-sm font-medium mt-2 border-t pt-1">
                          <span>Total</span>
                          <span>KES {o.final_total.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No completed orders yet.
                </p>
              )}
            </motion.div>

            {/* Wallet Info */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mm-account-section bg-gray-50 dark:bg-gray-800 p-4 md:p-5 rounded-xl space-y-3"
            >
              <h3 className="font-semibold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-500" />
                Wallet Overview
              </h3>
              <div className="flex justify-between">
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Coins className="w-4 h-4 text-yellow-500" /> Coins
                </span>
                <span className="font-medium">{wallet?.balance || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">KES Value</span>
                <span className="font-medium">KSh {wallet?.total_kes || 0}</span>
              </div>
            </motion.div>

            {/* Referral Info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mm-account-section bg-gray-50 dark:bg-gray-800 p-4 md:p-5 rounded-xl shadow-sm space-y-4 border border-gray-100 dark:border-gray-700"
            >
              {/* Header */}
              <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <Users className="w-5 h-5 text-purple-500" />
                Referral Stats
              </h3>

              {/* Referral Code */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Referral Code</span>
                <span className="font-mono text-sm text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded-md">
                  {referral?.referral_code || "N/A"}
                </span>
              </div>

              {/* Total Referrals */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Total Referrals</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {referral?.total_referrals ?? 0}
                </span>
              </div>

              {/* Created At */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Created</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {referral?.created_at
                    ? new Date(referral.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </span>
              </div>

              {/* Optional: Copy referral code */}
              {referral?.referral_code && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(referral.referral_code);
                  }}
                  className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 7.5v-1.125A2.625 2.625 0 0110.875 3.75h7.5A2.625 2.625 0 0121 6.375v10.5a2.625 2.625 0 01-2.625 2.625H17.25m-9-12.75H6.375A2.625 2.625 0 003.75 9.375v10.5A2.625 2.625 0 006.375 22.5h7.5a2.625 2.625 0 002.625-2.625V18"
                    />
                  </svg>
                  Copy Code
                </button>
              )}
            </motion.div>



            {/* Vouchers */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mm-account-section bg-gray-50 dark:bg-gray-800 p-4 md:p-5 rounded-xl space-y-3 shadow-sm"
            >
              {/* Header */}
              <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <Gift className="w-5 h-5 text-pink-500" />
                Active Voucher
              </h3>

              {/* Voucher Details */}
              {voucher ? (
                <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 py-2">
                  <div>
                    <span className="font-mono text-blue-600">{voucher.code}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {voucher.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-green-600">{voucher.discount}</span>
                    {voucher.expiry_date && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Expires: {new Date(voucher.expiry_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No active vouchers</p>
              )}
            </motion.div>

          </CardContent>
        </Card>
      </div>

      {/* ✅ Return Form Modal */}
      {selectedItem && (
        <RequestReturnForm
          selectedItem={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* ✅ Snackbar Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <MuiAlert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.message}
        </MuiAlert>
      </Snackbar>
    </>
  );
}
