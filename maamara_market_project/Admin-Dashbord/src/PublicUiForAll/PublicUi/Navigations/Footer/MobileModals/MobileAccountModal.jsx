import React, { useEffect, useState } from "react";
import MobileBottomSheet from "./MobileBottomSheet";
import { UserRound, Package, Bell, Pencil, Save, LogIn, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "../../../../../../components/ui/input";
import { Button } from "../../../../../../components/ui/button";
import api from "../../../../../Services/Api";

const MobileAccountModal = ({ open, onClose, user }) => {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    address: "",
    city: "",
    country: "",
    location: "",
  });

  useEffect(() => {
    if (!open) return;

    let active = true;
    api.get("/api/user/account/", { withCredentials: true })
      .then((res) => {
        if (!active) return;
        const data = res.data || {};
        setAccount(data);
        setForm({
          first_name: data.user?.first_name || "",
          last_name: data.user?.last_name || "",
          phone_number: data.profile?.phone_number || "",
          address: data.profile?.address || "",
          city: data.profile?.city || "",
          country: data.profile?.country || "",
          location: data.profile?.location || "",
        });
      })
      .catch((error) => {
        if (active) console.error("Account loading failed:", error);
      });

    return () => { active = false; };
  }, [open]);

  const go = (path) => {
    onClose?.();
    navigate(path);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const response = await api.post("/api/user/update/", form, {
        withCredentials: true,
      });

      if (response.data?.success) {
        setAccount(response.data);
        setEditing(false);
      }
    } catch (error) {
      console.error("Account update failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const isVisitor = account?.authType === "visitor";
  const firstName = account?.user?.first_name || "";
  const lastName = account?.user?.last_name || "";
  const displayName = [firstName, lastName].filter(Boolean).join(" ") ||
    (isVisitor ? "Guest account" : account?.user?.username || "My Account");
  const email = account?.user?.email || "";
  const orderCount = account?.orders?.length || 0;

  return (
    <MobileBottomSheet open={open} onClose={onClose} title="Your Account">
      <div className="space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-lg font-semibold">
              {(displayName.charAt(0) || "M").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{displayName}</p>
              <p className="text-xs text-white/70 truncate">{email || "Visitor profile"}</p>
              <span className="mt-1 inline-flex rounded-full bg-white/15 px-2 py-0.5 text-[10px]">
                {isVisitor ? "Visitor account" : "Signed-in account"}
              </span>
            </div>
          </div>
          {isVisitor && (
            <p className="mt-3 text-xs leading-5 text-white/75">
              Your visitor account keeps your cart, orders, activity and profile connected to this browser.
            </p>
          )}
        </div>

        {!editing ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => go("/profile")} className="rounded-2xl border p-4 text-left hover:bg-gray-50">
                <UserRound size={19} className="mb-2" />
                <p className="text-sm font-semibold">Profile</p>
                <p className="text-xs text-gray-500">View and manage your profile</p>
              </button>

              <button type="button" onClick={() => go("/customer-order")} className="rounded-2xl border p-4 text-left hover:bg-gray-50">
                <Package size={19} className="mb-2" />
                <p className="text-sm font-semibold">Orders</p>
                <p className="text-xs text-gray-500">{orderCount} order{orderCount === 1 ? "" : "s"}</p>
              </button>
            </div>

            <div className="space-y-1 rounded-2xl border bg-white">
              <button type="button" onClick={() => go("/profile")} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left text-sm">
                <Bell size={17} /> Notifications
              </button>
              <button type="button" onClick={() => setEditing(true)} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left text-sm">
                <Pencil size={17} /> Edit account details
              </button>
              <button type="button" onClick={() => go("/vendor-register-form")} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm">
                <Store size={17} /> Become a vendor
              </button>
            </div>

            {isVisitor && (
              <Button variant="outline" className="w-full" onClick={() => go("/customer-login")}>
                <LogIn size={16} className="mr-2" /> Sign in / Create full account
              </Button>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="font-semibold">Manage your account</p>
              <p className="text-xs text-gray-500 mt-1">
                {isVisitor ? "These details are saved to your visitor profile and can be carried into a full account later." : "Update the details associated with your account."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              <Input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <Input placeholder="Phone number" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
            <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <Input placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>Back</Button>
              <Button className="flex-1" disabled={saving} onClick={handleSave}>
                <Save size={16} className="mr-2" /> {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </MobileBottomSheet>
  );
};

export default MobileAccountModal;
