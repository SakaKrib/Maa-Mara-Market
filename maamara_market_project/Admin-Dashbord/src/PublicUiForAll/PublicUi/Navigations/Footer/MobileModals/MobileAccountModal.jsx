import React, { useEffect, useState } from "react";
import MobileBottomSheet from "./MobileBottomSheet";
import { UserRound, Package, Bell, Pencil, Save, LogIn, Store, FilePenLine, ChevronRight, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "../../../../../../components/ui/input";
import { Button } from "../../../../../../components/ui/button";
import api from "../../../../../Services/Api";
import Invoices from "../../../Customer/DesktopView/Main/Accounts/Invoices";

const MobileAccountModal = ({ open, onClose, user }) => {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [invoicesOpen, setInvoicesOpen] = useState(false);

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
    Promise.allSettled([
      api.get("/api/user-profile/", { withCredentials: true }),
      api.get("/api/vendor-draft/", { withCredentials: true }),
      api.get("/api/user-visitor-notifications/", { withCredentials: true }),
    ]).then(([accountResult, draftResult, notificationResult]) => {
      if (!active) return;
      if (accountResult.status === "fulfilled") {
        const data = accountResult.value.data || {};
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
      }
      setDraft(draftResult.status === "fulfilled" && draftResult.value.data?.exists ? draftResult.value.data : null);
      setNotifications(notificationResult.status === "fulfilled" ? (notificationResult.value.data?.results || []) : []);
    }).catch((error) => {
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
  const orderCount = Array.isArray(account?.orders) ? account.orders.length : 0;

  return (
    <MobileBottomSheet open={open} onClose={onClose} title="Your Account">
      <div className="space-y-4">
        <div className="mm-account-profile-card rounded-2xl border border-[#e5dfd4] bg-[#f6f2ea] p-5 text-[#29251f] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-lg font-semibold shadow-sm ring-1 ring-[#e5dfd4]">
              {(displayName.charAt(0) || "M").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{displayName}</p>
              <p className="text-xs text-[#6f675c] truncate">{email || "Visitor profile"}</p>
              <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[#625b51] ring-1 ring-[#e5dfd4]">
                {isVisitor ? "Visitor account" : "Signed-in account"}
              </span>
            </div>
          </div>
          {isVisitor && (
            <p className="mt-3 text-xs leading-5 text-[#6f675c]">
              Your cart, orders, activity and profile are saved with your visitor account. Sign in anytime to keep everything with your account.
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

            {draft && (
              <button type="button" onClick={() => go("/vendor-register-form")} className="w-full rounded-2xl border bg-[#f5f4f1] p-4 text-left">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white"><FilePenLine size={17} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold tracking-[0.12em] text-[#6f6a63]">SAVED DRAFT</span>
                    <span className="block truncate text-sm font-semibold">{draft.draft?.company_name || "Vendor registration"}</span>
                    <span className="block text-xs text-[#6f6a63]">Continue where you left off</span>
                  </span>
                  <ChevronRight size={18} />
                </div>
              </button>
            )}

            <div className="space-y-1 rounded-2xl border bg-white">
              <button type="button" onClick={() => go("/profile")} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left text-sm">
                <Bell size={17} /> Notifications
                {notifications.filter((n) => !n.is_read).length > 0 && <span className="ml-auto rounded-full bg-black px-2 py-0.5 text-[10px] text-white">{notifications.filter((n) => !n.is_read).length}</span>}
              </button>
              <button type="button" onClick={() => setEditing(true)} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left text-sm">
                <Pencil size={17} /> Edit account details
              </button>
              <button type="button" onClick={() => setInvoicesOpen(true)} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left text-sm">
                <FileText size={17} /> Invoices
              </button>
              <button type="button" onClick={() => go("/vendor-register-form")} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm">
                <Store size={17} /> Become a vendor
              </button>
            </div>

            {isVisitor && (
              <Button variant="outline" className="mm-auth-submit w-full" onClick={() => go("/customer-login")}>
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
              <div><label htmlFor="mobile-account-first-name" className="mb-1.5 block text-xs font-medium text-[#514a41]">First name</label><Input className="mm-auth-input" id="mobile-account-first-name" placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
              <div><label htmlFor="mobile-account-last-name" className="mb-1.5 block text-xs font-medium text-[#514a41]">Last name</label><Input className="mm-auth-input" id="mobile-account-last-name" placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
            </div>
            <div><label htmlFor="mobile-account-phone" className="mb-1.5 block text-xs font-medium text-[#514a41]">Phone number</label><Input className="mm-auth-input" id="mobile-account-phone" placeholder="Phone number" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} /></div>
            <div><label htmlFor="mobile-account-address" className="mb-1.5 block text-xs font-medium text-[#514a41]">Address</label><Input className="mm-auth-input" id="mobile-account-address" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="mobile-account-city" className="mb-1.5 block text-xs font-medium text-[#514a41]">City</label><Input className="mm-auth-input" id="mobile-account-city" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><label htmlFor="mobile-account-country" className="mb-1.5 block text-xs font-medium text-[#514a41]">Country</label><Input className="mm-auth-input" id="mobile-account-country" placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            </div>
            <div><label htmlFor="mobile-account-location" className="mb-1.5 block text-xs font-medium text-[#514a41]">Location</label><Input className="mm-auth-input" id="mobile-account-location" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="mm-auth-light-button flex-1" onClick={() => setEditing(false)}>Cancel</Button>
              <Button className="mm-auth-submit flex-1" disabled={saving} onClick={handleSave}>
                <Save size={16} className="mr-2" /> {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}
      </div>
      <Invoices open={invoicesOpen} onClose={() => setInvoicesOpen(false)} />
    </MobileBottomSheet>
  );
};

export default MobileAccountModal;
