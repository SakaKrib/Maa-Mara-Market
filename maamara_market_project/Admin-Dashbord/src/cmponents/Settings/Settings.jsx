import React, { useEffect, useState } from "react";
import { Bell, Check, ChevronRight, Globe2, KeyRound, LogOut, Monitor, RefreshCw, Save, Settings as SettingsIcon, ShieldCheck, UserRound, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext/Context";
import api from "../../Services/Api";

const preferenceDefaults = {
  notifications: true,
  compactMode: false,
  browserAlerts: true,
};

const Settings = () => {
  const navigate = useNavigate();
  const { user, refreshAuth, logout } = useAuth();
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    location: "",
    city: "",
    country: "",
    address: "",
  });
  const [preferences, setPreferences] = useState(() => {
    try {
      return { ...preferenceDefaults, ...JSON.parse(localStorage.getItem("maamara-admin-preferences") || "{}") };
    } catch {
      return preferenceDefaults;
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get("/api/user/account/");
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
        console.error("Failed to load settings:", err);
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
      await api.post("/api/user/update/", body);
      await refreshAuth();
      setMessage("Account details saved successfully.");
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError(err.response?.data?.detail || "Could not save your account details.");
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key, value) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    localStorage.setItem("maamara-admin-preferences", JSON.stringify(next));
    setMessage("Preference updated.");
    setError("");
  };

  const resetPreferences = () => {
    setPreferences(preferenceDefaults);
    localStorage.setItem("maamara-admin-preferences", JSON.stringify(preferenceDefaults));
    setMessage("Preferences restored to their defaults.");
    setError("");
  };

  const field = (label, key, type = "text") => (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={profile[key]}
        onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))}
        className="w-full rounded-[20px] border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
      />
    </label>
  );

  return (
    <section className="min-h-full bg-background p-2 text-foreground sm:p-4 lg:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SettingsIcon size={21} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Admin workspace</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-card-foreground">Settings</h1>
              <p className="mt-1 text-sm text-muted-foreground">Manage your administrator profile, preferences and account security.</p>
            </div>
          </div>
          <button type="button" onClick={() => navigate("/admin-dashboard")} aria-label="Close settings" className="shrink-0 rounded-xl border border-border bg-muted p-2 text-muted-foreground transition hover:bg-primary hover:text-primary-foreground">
            <X size={18} />
          </button>
        </header>

        {message && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"><Check size={16} />{message}</div>}
        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

        {loading ? (
          <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <div className="h-96 animate-pulse rounded-2xl bg-muted" />
            <div className="h-96 animate-pulse rounded-2xl bg-muted" />
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <form onSubmit={updateProfile} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h2 className="font-bold text-card-foreground">Profile details</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Keep the administrator account information up to date.</p>
                </div>
                <UserRound size={19} className="text-primary" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {field("First name", "first_name")}
                {field("Last name", "last_name")}
                {field("Email", "email", "email")}
                {field("Phone number", "phone_number")}
                {field("Location", "location")}
                {field("City", "city")}
                {field("Country", "country")}
                {field("Address", "address")}
              </div>
              <div className="mt-5 flex justify-end">
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
                  <Save size={16} /> {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>

            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-card-foreground">Workspace preferences</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Saved for this browser and applied immediately.</p>
                  </div>
                  <Monitor size={19} className="text-primary" />
                </div>
                <div className="space-y-2">
                  {[
                    ["notifications", "Admin notifications", "Show notification feedback in the workspace.", Bell],
                    ["compactMode", "Compact workspace", "Use a tighter layout where supported.", Monitor],
                    ["browserAlerts", "Browser alerts", "Allow browser notification preferences when supported.", Globe2],
                  ].map(([key, title, description, Icon]) => (
                    <button key={key} type="button" onClick={() => updatePreference(key, !preferences[key])} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition hover:bg-muted">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${preferences[key] ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><Icon size={17} /></div>
                      <span className="min-w-0 flex-1"><strong className="block text-sm text-card-foreground">{title}</strong><small className="mt-0.5 block text-xs text-muted-foreground">{description}</small></span>
                      <span className={`h-5 w-9 rounded-full p-0.5 transition ${preferences[key] ? "bg-primary" : "bg-muted"}`}><span className={`block h-4 w-4 rounded-full bg-white shadow transition ${preferences[key] ? "translate-x-4" : ""}`} /></span>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={resetPreferences} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><RefreshCw size={14} /> Restore defaults</button>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck size={19} /></div>
                  <div><h2 className="font-bold text-card-foreground">Security</h2><p className="text-xs text-muted-foreground">Account access and session controls.</p></div>
                </div>
                <div className="space-y-2">
                  <button type="button" onClick={() => navigate("/forgot-password")} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:bg-muted">
                    <KeyRound size={17} className="text-primary" />
                    <span className="flex-1"><strong className="block text-sm text-card-foreground">Reset password</strong><small className="text-xs text-muted-foreground">Start the existing secure password recovery flow.</small></span>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </button>
                  <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl border border-red-500/20 p-3 text-left text-red-600 hover:bg-red-500/10 dark:text-red-300">
                    <LogOut size={17} />
                    <span className="flex-1"><strong className="block text-sm">Sign out</strong><small className="text-xs text-red-600/70 dark:text-red-300/70">End this administrator session.</small></span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Signed in as</p>
                <p className="mt-1 truncate text-sm font-semibold text-card-foreground">{user?.email || profile.email || user?.username || "Administrator"}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Settings;
