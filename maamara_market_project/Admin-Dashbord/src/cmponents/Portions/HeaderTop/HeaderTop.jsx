import { useRef, useState, useEffect, useContext } from "react";
import { IonIcon } from "@ionic/react";
import { UserRound } from "lucide-react";
import { menuOutline, searchOutline, sunnyOutline, moon, closeOutline, cameraOutline, notificationsOutline } from "ionicons/icons";
import { useAuth } from "../../Auth/AuthContext/Context";
import { useCsrfToken } from "../../Hooks/AccessCRF/UseCSRFToken";
import api from "../../../Services/Api";
import { ColourModeContext } from "../../../theme";
import SearchBarForVendorAdmin from "../../SearchPage/GlobalSearchPage";
import Maamara from "../../../assets/Logo/Maamara.jpg";

const HeaderTop = ({ onMenuToggle }) => {
  const colorMode = useContext(ColourModeContext);
  const { isAuthenticated, loading, user } = useAuth();
  const csrfToken = useCsrfToken();

  const [openProfile, setOpenProfile] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [activeView, setActiveView] = useState("main");
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    location: "",
    phone_number: "",
    address: "",
    city: "",
    country: "",
    date_of_birth: "",
  });

  const displayName = form.first_name?.trim() || user?.username || "Admin";
  const shortDisplayName = displayName.length > 12 ? `${displayName.slice(0, 12)}…` : displayName;

  const profilePicture = profile?.profile?.profile_picture || "";
  const profileInitials = `${form.first_name?.trim()?.[0] || displayName?.[0] || "A"}${form.last_name?.trim()?.[0] || ""}`.toUpperCase();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/api/user/account/", {
          withCredentials: true,
          headers: csrfToken ? { "X-CSRFToken": csrfToken } : undefined,
        });
        const data = response.data || {};
        const nextUser = data.user || {};
        const nextProfile = data.profile || {};

        setProfile(data);
        setForm({
          username: nextUser.username || "",
          first_name: nextUser.first_name || "",
          last_name: nextUser.last_name || "",
          email: nextUser.email || "",
          phone_number: nextProfile.phone_number || "",
          location: nextProfile.location || "",
          address: nextProfile.address || "",
          city: nextProfile.city || "",
          country: nextProfile.country || "",
          date_of_birth: nextProfile.date_of_birth || "",
        });
      } catch (error) {
        console.error("Admin profile fetch failed:", error);
      }
    };

    if (isAuthenticated && !loading) fetchProfile();
  }, [isAuthenticated, loading, csrfToken]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setPreviewImage(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("profile_picture", file);

    try {
      const response = await api.post("/api/user/update/", formData, { withCredentials: true });
      setProfile((current) => ({
        ...current,
        profile: {
          ...current?.profile,
          profile_picture: response.data?.profile?.profile_picture,
        },
      }));
      setImageFile(null);
      setPreviewImage(null);
    } catch (error) {
      console.error("Admin profile image upload failed:", error);
    }
  };

  const handleSave = async () => {
    const data = new FormData();
    Object.entries({
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone_number: form.phone_number,
      location: form.location,
      address: form.address,
      city: form.city,
      country: form.country,
      date_of_birth: form.date_of_birth,
    }).forEach(([key, value]) => data.append(key, value || ""));

    if (imageFile) data.append("profile_picture", imageFile);

    try {
      const response = await api.post("/api/user/update/", data, {
        withCredentials: true,
        headers: csrfToken ? { "X-CSRFToken": csrfToken } : undefined,
      });

      const updatedUser = response.data?.user || {};
      const updatedProfile = response.data?.profile || {};
      setProfile((current) => ({ ...current, user: updatedUser, profile: updatedProfile }));
      setForm((current) => ({
        ...current,
        username: updatedUser.username || current.username,
        first_name: updatedUser.first_name || "",
        last_name: updatedUser.last_name || "",
        email: updatedUser.email || "",
        phone_number: updatedProfile.phone_number || "",
        location: updatedProfile.location || "",
        address: updatedProfile.address || "",
        city: updatedProfile.city || "",
        country: updatedProfile.country || "",
        date_of_birth: updatedProfile.date_of_birth || "",
      }));
      setEditMode(false);
      setImageFile(null);
      setPreviewImage(null);
    } catch (error) {
      console.error("Admin profile update failed:", error);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await api.post("/api/logout/", {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace("/login");
    }
  };

  const closeProfile = () => {
    setOpenProfile(false);
    setActiveView("main");
    setEditMode(false);
  };

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 h-[72px] border-b border-border bg-background/95 text-foreground backdrop-blur lg:left-64">
        <div className="flex h-full items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-7">
          <button
            type="button"
            aria-label="Open dashboard navigation"
            onClick={onMenuToggle}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted lg:hidden"
          >
            <IonIcon icon={menuOutline} className="text-xl" />
          </button>

          <div className="logo flex min-w-0 shrink-0 items-center">
            <a
              href="/"
              aria-label="Maa Mara Market"
              className="flex w-auto items-center gap-0.5 rounded-[5px] border border-yellow-500 bg-background p-0.5 font-[Poppins] text-[1.05rem] leading-none tracking-tight text-foreground sm:text-[1.3rem]"
            >
              <span className="whitespace-nowrap">Maa</span>
              <span className="relative whitespace-nowrap rounded-l-[5px] border-l-[5px] border-green-500 bg-red-500/20 px-2 py-1">
                Mara
              </span>
              <span className="whitespace-nowrap font-bold text-green-600">Market</span>
            </a>
          </div>

          <div className="hidden min-w-0 max-w-2xl flex-1 md:block">
            <div className="relative min-w-0">
              <IonIcon icon={searchOutline} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
              <SearchBarForVendorAdmin />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpenProfile(true)}
              className="flex items-center gap-2 rounded-xl p-1.5 pr-2 hover:bg-muted"
              aria-label="Open admin profile"
            >
              <img
                src={previewImage || profilePicture}
                alt="Admin profile"
                className="h-9 w-9 rounded-full border border-border object-cover"
              />
              <span className="hidden max-w-28 truncate text-left text-xs font-semibold text-foreground sm:block">
                {displayName}
              </span>
            </button>
          </div>
        </div>
      </header>

      {openProfile && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3" onMouseDown={closeProfile}>
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Administrator</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Account</h2>
              </div>
              <button type="button" onClick={closeProfile} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <IonIcon icon={closeOutline} className="text-xl" />
              </button>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="relative shrink-0">
                {previewImage || profilePicture ? (
                  <img src={previewImage || profilePicture} alt="Profile" className="h-20 w-20 rounded-full border-2 border-[#2563eb]/20 object-cover dark:border-[#2563eb]/40" />
                ) : (
                  <span className="grid h-20 w-20 place-items-center rounded-full border-2 border-[#2563eb]/20 bg-[#2563eb] text-xl font-bold tracking-wide text-white dark:border-[#2563eb]/40" aria-label={displayName}>
                    {profileInitials}
                  </span>
                )}
                <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-white">
                  <IonIcon icon={cameraOutline} />
                </span>
              </button>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900 dark:text-white">{form.first_name || "Administrator"} {form.last_name}</p>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">{form.email || user?.username}</p>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageChange} />
              </div>
            </div>

            {activeView === "main" && (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button onClick={() => setActiveView("view")} className="rounded-full border border-border bg-transparent px-4 py-3 text-left text-sm font-semibold text-foreground transition hover:bg-muted">View account</button>
                <button onClick={() => setActiveView("edit")} className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Edit profile</button>
                <button onClick={() => setActiveView("manage")} className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Manage account</button>
                <button type="button" onClick={() => setShowSignOutConfirm(true)} className="rounded-full border border-transparent bg-transparent px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10">Sign out</button>
              </div>
            )}

            {activeView === "view" && (
              <div className="mt-5 space-y-2 text-sm">
                {[
                  ["First name", form.first_name],
                  ["Last name", form.last_name],
                  ["Email", form.email],
                  ["Phone", form.phone_number],
                  ["Location", form.location],
                  ["Address", form.address],
                  ["City", form.city],
                  ["Country", form.country],
                  ["Date of birth", form.date_of_birth],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 border-b border-slate-100 py-2.5 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">{label}</span>
                    <span className="max-w-[65%] truncate text-right font-medium text-slate-900 dark:text-slate-100">{value || "—"}</span>
                  </div>
                ))}
                <button onClick={() => setActiveView("main")} className="mt-3 w-full rounded-full bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#262626]">Back</button>
              </div>
            )}

            {activeView === "edit" && (
              <div className="mt-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["username", "Username"],
                    ["email", "Email"],
                    ["first_name", "First name"],
                    ["last_name", "Last name"],
                    ["location", "Location"],
                    ["phone_number", "Phone number"],
                    ["address", "Address"],
                    ["city", "City"],
                    ["country", "Country"],
                  ].map(([name, label]) => (
                    <label key={name} className="grid gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {label}
                      <input
                        name={name}
                        value={form[name] || ""}
                        onChange={handleChange}
                        disabled={!editMode}
                        className="h-11 rounded-[20px] border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </label>
                  ))}
                  <label className="grid gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Date of birth
                    <input
                      type="date"
                      name="date_of_birth"
                      value={form.date_of_birth || ""}
                      onChange={handleChange}
                      disabled={!editMode}
                      className="h-10 rounded-xl border border-slate-200 bg-transparent px-3 text-sm text-slate-900 outline-none ring-indigo-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-white"
                    />
                  </label>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {!editMode ? (
                    <button onClick={() => setEditMode(true)} className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#262626]">Edit profile</button>
                  ) : (
                    <button onClick={handleSave} className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#262626]">Save changes</button>
                  )}
                  <button onClick={() => { setEditMode(false); setActiveView("main"); }} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold dark:bg-slate-800">Back</button>
                </div>
              </div>
            )}

            {activeView === "manage" && (
              <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-5 text-sm">
                <h3 className="text-base font-semibold text-foreground">Account settings</h3>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Manage security, password changes, notifications, and other administrator preferences.</p>
                <a href="/admin-dashboard/settings" onClick={closeProfile} className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-border bg-transparent px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted">Open account settings</a>
                <button type="button" onClick={() => setActiveView("main")} className="mt-4 w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#262626]">Back</button>
              </div>
            )}

            </div>
        </div>
      )}

      {showSignOutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="admin-signout-title" onMouseDown={() => !signingOut && setShowSignOutConfirm(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="admin-signout-title" className="text-lg font-bold text-foreground">Sign out?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Are you sure you want to sign out of the administrator account?</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button type="button" disabled={signingOut} onClick={() => setShowSignOutConfirm(false)} className="w-full rounded-full border border-border bg-transparent px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50">Cancel</button>
              <button type="button" disabled={signingOut} onClick={handleSignOut} className="w-full rounded-full border border-red-600 bg-transparent px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50">{signingOut ? "Signing out..." : "Confirm sign out"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HeaderTop;
