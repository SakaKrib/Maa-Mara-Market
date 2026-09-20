import { useRef, useState, useEffect, useContext } from "react";
import { IonIcon } from "@ionic/react";
import { menuOutline, searchOutline, sunnyOutline, moon, closeOutline, cameraOutline, notificationsOutline } from "ionicons/icons";
import { useAuth } from "../../Auth/AuthContext/Context";
import { useCsrfToken } from "../../Hooks/AccessCRF/UseCSRFToken";
import { baseUrl } from "../../Constant/Constant";
import api from "../../../Services/Api";
import { ColourModeContext } from "../../../theme";
import LogoutButton from "../../Auth/AdminLogin/Logout";
import SearchBarForVendorAdmin from "../../SearchPage/GlobalSearchPage";
import Maamara from "../../../assets/Logo/Maamara.jpg";

const HeaderTop = ({ onMenuToggle }) => {
  const colorMode = useContext(ColourModeContext);
  const { isAuthenticated, loading, user } = useAuth();
  const csrfToken = useCsrfToken();

  const [openProfile, setOpenProfile] = useState(false);
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

  const profilePicture = profile?.profile?.profile_picture
    ? profile.profile.profile_picture.startsWith("http")
      ? profile.profile.profile_picture
      : `${baseUrl}${profile.profile.profile_picture}`
    : "/default-avatar.png";

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

  const closeProfile = () => {
    setOpenProfile(false);
    setActiveView("main");
    setEditMode(false);
  };

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 h-[72px] border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:left-64">
        <div className="flex h-full items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-7">
          <button
            type="button"
            aria-label="Open admin navigation"
            onClick={onMenuToggle}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted lg:hidden"
          >
            <IonIcon icon={menuOutline} className="text-xl" />
          </button>

          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-sm font-black text-white">M</span>
            <div className="leading-tight">
              <span className="block text-sm font-bold text-slate-900 dark:text-white">Maa Mara</span>
              <span className="block text-[10px] text-slate-400">Admin workspace</span>
            </div>
          </div>

          <div className="hidden min-w-0 max-w-2xl flex-1 sm:block">
            <div className="relative">
              <IonIcon icon={searchOutline} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
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
                <img src={previewImage || profilePicture} alt="Profile" className="h-20 w-20 rounded-full border-2 border-indigo-200 object-cover dark:border-indigo-500/40" />
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
                <button onClick={() => setActiveView("view")} className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">View account</button>
                <button onClick={() => setActiveView("edit")} className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Edit profile</button>
                <button onClick={() => setActiveView("manage")} className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Manage account</button>
                <button onClick={() => setActiveView("logout")} className="rounded-xl bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300">Sign out</button>
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
                <button onClick={() => setActiveView("main")} className="mt-3 w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold dark:bg-slate-800">Back</button>
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
                        className="h-10 rounded-xl border border-slate-200 bg-transparent px-3 text-sm text-slate-900 outline-none ring-indigo-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-white"
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
                    <button onClick={() => setEditMode(true)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Edit profile</button>
                  ) : (
                    <button onClick={handleSave} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Save changes</button>
                  )}
                  <button onClick={() => { setEditMode(false); setActiveView("main"); }} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold dark:bg-slate-800">Back</button>
                </div>
              </div>
            )}

            {activeView === "manage" && (
              <div className="mt-5 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white">Account settings</h3>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Security and account management controls can be added here.</p>
                <button onClick={() => setActiveView("main")} className="mt-4 rounded-xl bg-slate-100 px-4 py-2.5 font-semibold dark:bg-slate-800">Back</button>
              </div>
            )}

            {activeView === "logout" && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                <p className="font-semibold text-red-700 dark:text-red-300">Sign out of the admin workspace?</p>
                <LogoutButton />
                <button onClick={() => setActiveView("main")} className="mt-2 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold dark:bg-slate-900">Cancel</button>
              </div>
            )}

            <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Appearance</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => colorMode.setLightMode()} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  <IonIcon icon={sunnyOutline} className="mr-2 align-middle" /> Light
                </button>
                <button onClick={() => colorMode.setDarkMode()} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  <IonIcon icon={moon} className="mr-2 align-middle" /> Dark
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HeaderTop;
