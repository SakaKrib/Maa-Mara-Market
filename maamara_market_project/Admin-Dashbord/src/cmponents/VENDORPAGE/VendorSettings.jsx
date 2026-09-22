import React, { useEffect, useState } from "react";
import { Bell, Check, Globe2, Monitor, RefreshCw, Save, Settings as SettingsIcon, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Auth/AuthContext/Context.jsx";
import { useAdminPreferences } from "../Settings/AdminPreferencesContext";
import api from "../../Services/Api";
import LogoutConfirmationModal from "../Auth/LogoutConfirmationModal";

const VendorSettings = () => {
  const navigate = useNavigate();
  const { user, refreshAuth, logout } = useAuth();
  const { preferences, updatePreference, resetPreferences } = useAdminPreferences();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState({
    first_name: "", last_name: "", email: "", phone_number: "",
    location: "", city: "", country: "", address: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get("/api/user/account/", { withCredentials: true });
        const data = response.data || {};
        const account = data.user || {};
        const details = data.profile || {};
        setProfile({
          first_name: account.first_name || "",
          last_name: account.last_name || "",
          email: account.email || "",
          phone_number: details.phone_number || "",
          location: details.location || "",
          city: details.city || "",
          country: details.country || "",
          address: details.address || "",
        });
      } catch (err) {
        console.error("Failed to load vendor settings:", err);
        setError("We could not load your account settings.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const body = new FormData();
      Object.entries(profile).forEach(([key, value]) => body.append(key, value || ""));
      await api.post("/api/user/update/", body, { withCredentials: true });
      await refreshAuth();
      setMessage("Account details saved successfully.");
    } catch (err) {
      console.error("Failed to save vendor settings:", err);
      setError(err.response?.data?.detail || "Could not save your account details.");
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, type = "text") => (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={profile[key]}
        onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
      />
    </label>
  );

  return (
    <section className="space-y-5">
      <header className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <SettingsIcon size={19} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Vendor workspace</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-card-foreground sm:text-2xl">Settings</h1>
            <p className="mt-1 text-xs text-muted-foreground">Manage your vendor profile and workspace preferences.</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate("/vendors-dashboard")} className="rounded-xl border border-border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-[#1d4ed8] hover:text-white">
          Back
        </button>
      </header>

      {message && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700"><Check size={16} />{message}</div>}
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <form onSubmit={updateProfile} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-sm font-semibold text-card-foreground">Profile details</h2>
                <p className="mt-1 text-xs text-muted-foreground">Keep your vendor account information up to date.</p>
              </div>
              <UserRound size={18} className="text-primary" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {field("First name", "first_name")}
              {field("Last name", "last_name")}
              {field("Email", "email", "email")}
              {field("Phone number", "phone_number")}
              {field("Location", "location")}
              {field("City", "city")}
              {field("Country", "country")}
              {field("Address", "address")}
            </div>
            <button type="submit" disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60">
              <Save size={15} /> {saving ? "Saving..." : "Save changes"}
            </button>
          </form>

          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-card-foreground">Workspace preferences</h2>
                <p className="mt-1 text-xs text-muted-foreground">Saved for this browser and applied immediately.</p>
              </div>
              <div className="space-y-2">
                {[
                  ["notifications", "Notifications", "Show workspace notification feedback.", Bell],
                  ["compactMode", "Compact workspace", "Use a tighter layout where supported.", Monitor],
                  ["browserAlerts", "Browser alerts", "Allow browser notification preferences when supported.", Globe2],
                ].map(([key, title, description, Icon]) => (
                  <button key={key} type="button" onClick={() => updatePreference(key, !preferences[key])} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition hover:bg-muted">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${preferences[key] ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><Icon size={16} /></div>
                    <span className="min-w-0 flex-1"><strong className="block text-sm text-card-foreground">{title}</strong><small className="mt-0.5 block text-xs text-muted-foreground">{description}</small></span>
                    <span className={`h-5 w-9 rounded-full p-0.5 ${preferences[key] ? "bg-primary" : "bg-muted"}`}><span className={`block h-4 w-4 rounded-full bg-white shadow ${preferences[key] ? "translate-x-4" : ""}`} /></span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { resetPreferences(); setMessage("Preferences restored to their defaults."); }} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
                <RefreshCw size={14} /> Restore defaults
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-semibold text-card-foreground">Account</h2>
              <p className="mt-1 text-xs text-muted-foreground">Signed in as {user?.email || user?.username || "Vendor"}.</p>
              <button type="button" onClick={() => setShowSignOutConfirm(true)} className="mt-4 w-full rounded-xl border border-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-500/10">
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <LogoutConfirmationModal
        open={showSignOutConfirm}
        onCancel={() => setShowSignOutConfirm(false)}
        onConfirm={logout}
        description="Do you want to sign out of your Maa Mara vendor account?"
      />
    </section>
  );
};

export default VendorSettings;
