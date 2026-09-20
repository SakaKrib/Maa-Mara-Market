import React, { useEffect, useState } from "react";
import { useAuth } from "../../../../../../cmponents/Auth/AuthContext/Context";
import api from "../../../../../../Services/Api";

import { Card, CardHeader, CardContent } from "../../../../../../../components/ui/card";
import { Separator } from "../../../../../../../components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../../../../../../../components/ui/avatar";
import { Badge } from "../../../../../../../components/ui/badge";
import { Skeleton } from "../../../../../../../components/ui/skeleton";
import { Button } from "../../../../../../../components/ui/button";
import RequestReturnForm from "../Return/Return";
import Invoices from "./Invoices";
import { useUserExtras } from "../../../../../../cmponents/Hooks/UserVisitorLogs/VisitorUserLogs";

import {
  Mail,
  MapPin,
  Calendar,
  Wallet as WalletIcon,
  Gift,
  Users,
  ShoppingBag,
  Undo2,
  Bell,
  Activity
} from "lucide-react";

export default function PublicProfile() {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const {activities, notifications ,loadingExtras} = useUserExtras()
 

    console.log(selectedItem)
  

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/user-profile/", { withCredentials: true });
        setProfile(res.data);
      } catch (err) {
        console.error("❌ Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="mm-page min-h-screen bg-white text-[#29251f]">
      <div className="flex justify-center mt-16">
        <Skeleton className="h-64 w-96 rounded-xl" />
      </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center mt-10 text-gray-500">
        <p>Profile not found.</p>
      </div>
    );
  }

  const { user, wallet, referral, vouchers, orders, profile: profileDetails } = profile;

  return (
    <div className="mm-page flex flex-col py-2 px-0 bg-white text-[#29251f] min-h-screen">
    <div className="flex justify-center px-4 pt-6 pb-8 sm:pt-8">
      <Card className="mm-profile-card w-full max-w-3xl overflow-hidden rounded-3xl border-[#e5dfd4] bg-white shadow-[0_10px_35px_rgba(54,45,32,0.08)]">
        <CardHeader className="flex flex-col items-center text-center space-y-3 border-b border-[#eee8de] bg-[#f6f2ea] px-6 py-8">
          <Avatar className="h-24 w-24">
            <AvatarImage
              src={profileDetails?.avatar || user?.profile_picture || "/default-avatar.png"}
              alt={user?.first_name || "User"}
            />
            <AvatarFallback>
              {user?.first_name?.[0] || "?"}
              {user?.last_name?.[0] || ""}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">
              {user?.first_name} {user?.last_name}
            </h2>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-7 p-5 sm:p-7">
          {/* About */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[#29251f]">
              <Calendar className="h-4 w-4" /> About
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
              <p>
                <Calendar className="h-4 w-4 inline mr-1" />
                {profileDetails?.date_of_birth || "Not provided"}
              </p>
              <p>
                <MapPin className="h-4 w-4 inline mr-1" />
                {profileDetails?.location || "No location set"}
              </p>
              <p className="col-span-2">
                <Mail className="h-4 w-4 inline mr-1" />
                {user?.email}
              </p>
            </div>
          </div>

           {/* Orders */}
           <>
            {orders && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium text-lg mb-2 flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" /> Orders
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
                            {/* Header */}
                            <div className="flex justify-between items-center border-b pb-1 mb-2">
                              <span className="font-medium">
                                Order #{o.paypal_order_id}
                              </span>
                              <span className="text-xs text-green-600 font-semibold">
                                {o.status.toUpperCase()}
                              </span>
                            </div>

                            {/* Items */}
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
                                    onClick={() => setSelectedItem(itemObj)}
                                    className="text-xs ring-1 hover:bg-red-300"
                                  >
                                    <Undo2 className="h-3.5 w-3.5 mr-1" />
                                    Return
                                  </Button>
                                </div>
                              );
                            })}

                            {/* Total */}
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
                </div>
              </>
            )}

            {/* Modal Form for Return Request */}
            {selectedItem && (
              <RequestReturnForm
                open={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                selectedItem={selectedItem}
              />
            )}
          </>


          {/* Referral (visible to all) */}
          {referral && (
            <>
              <Separator />
              <div>
                <h3 className="font-medium text-lg mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Referral
                </h3>
                <p className="text-sm text-muted-foreground">
                  Code: <Badge variant="outline">{referral.referral_code}</Badge>
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Referred: {referral.referred_users_count || 0}
                </p>
              </div>
            </>
          )}

          {/* Authenticated-only sections */}
          {isAuthenticated ? (
            <>
              {/* Wallet */}
              {wallet && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium text-lg mb-2 flex items-center gap-2">
                      <WalletIcon className="h-4 w-4" /> Wallet
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Balance: <strong>{wallet.balance}</strong> {wallet.currency}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Updated:{" "}
                      {wallet.last_updated
                        ? new Date(wallet.last_updated).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </>
              )}

            

              {/* Vouchers */}
              {vouchers && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium text-lg mb-2 flex items-center gap-2">
                      <Gift className="h-4 w-4" /> Vouchers
                    </h3>
                    {vouchers.length ? (
                      vouchers.map((v) => (
                        <div
                          key={v.id}
                          className="flex justify-between text-sm border-b pb-1 text-muted-foreground"
                        >
                          <span className="font-mono">{v.code}</span>
                          <span className="text-green-600">
                            {v.discount_value}
                            {v.discount_type === "percent" ? "%" : " KSh"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No active vouchers</p>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-center mt-4">
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground mb-3">
                Please log in, invite friends and earn Coins and Vouchers.
              </p>
              <Button
                className="mm-auth-submit w-full sm:w-auto"
                onClick={() => (window.location.href = "/customer-login")}
              >
                Login to View Account
              </Button>
              <div className="mt-4" />
            </div>
            
          )}

          <div className="mt-5">
            <Invoices />
          </div>
        </CardContent>
      </Card>
    </div>
    {/* show notifications here */}
    {/* --- Notifications & Activity Section --- */}
    <div className="flex justify-center px-4 pb-24 pt-2 sm:pb-20">
      <div className="w-full max-w-2xl space-y-8">
        {/* Notifications */}
        <Card className="overflow-hidden rounded-3xl border-[#e5dfd4] bg-white shadow-[0_8px_28px_rgba(54,45,32,0.06)]">
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
              <span className="ml-auto text-xs font-semibold bg-blue-500 text-white rounded-full px-2 py-0.5">
                {notifications.length}
              </span>
            </h3>
          </CardHeader>
          <CardContent
            style={{ maxHeight: "30vh", overflowY: "auto" }}
            className="pr-2"
          >
            {loadingExtras ? (
              <Skeleton className="h-20 w-full rounded-md" />
            ) : notifications.length ? (
              notifications.map((n) => (
                <div key={n.id} className="border-b py-2 last:border-0 text-sm">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-gray-600 text-xs">{n.message}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No notifications found.</p>
            )}
          </CardContent>
        </Card>

        {/* Activity */}
        <Card className="border rounded-2xl shadow-sm">
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
              <span className="ml-auto text-xs font-semibold bg-green-500 text-white rounded-full px-2 py-0.5">
                {activities.length}
              </span>
            </h3>
          </CardHeader>
          <CardContent
            style={{ maxHeight: "30vh", overflowY: "auto" }}
            className="pr-2"
          >
            {loadingExtras ? (
              <Skeleton className="h-20 w-full rounded-md" />
            ) : activities.length ? (
              activities.map((a) => (
                <div key={a.id} className="border-b py-2 last:border-0 text-sm">
                  <p>{a.action}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(a.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent activities.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>


    </div>
  );
}
