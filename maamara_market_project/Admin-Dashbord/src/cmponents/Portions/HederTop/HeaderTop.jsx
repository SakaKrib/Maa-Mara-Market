import { useRef, useState, useEffect } from "react";
import { IonIcon } from '@ionic/react';
import "../../../index.css";
import {
  menuOutline,
  searchOutline
} from 'ionicons/icons';
import useDashboardInteractions from '../../../interaction';
import { useAuth } from '../../Auth/AuthContext/Context';
import CloseIcon from "@mui/icons-material/Close";
import { 
  useTheme, 
  Box,
  Modal,
  Typography,
  Avatar,
  Button,
  IconButton
 } from '@mui/material';
import { tokens } from '../../../theme';
import LogoutButton from '../../Auth/AdminLogin/Logout';
import { useCsrfToken } from '../../Hooks/AccessCRF/UseCSRFToken';
import { baseUrl } from '../../Constant/Constant';
import api from '../../../Services/Api';
import { sunnyOutline, moon } from "ionicons/icons";
import { useContext } from "react";
import { ColourModeContext } from "../../../theme";
import SearchBarForVendorAdmin from "../../SearchPage/GlobalSearchPage";

const HeaderTop = () => {
  useDashboardInteractions();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

const [openProfile, setOpenProfile] = useState(false);
const [activeView, setActiveView] = useState("main");
const [editMode, setEditMode] = useState(false);

const handleCloseProfile = () => {
  setOpenProfile(false);
  setActiveView("main");
  setEditMode(false);
};

  // function to mange modals

// theme change
const colorMode = useContext(ColourModeContext);



// handle change
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


const handleChange = (e) => {
  const { name, value } = e.target;

  setForm((prev) => ({
    ...prev,
    [name]: value,
  }));
};
const fileInputRef = useRef(null);
const [previewImage, setPreviewImage] = useState(null);

// ✅ KEEP ONLY ONE FILE STATE (this is the one you already use in handleSave)
const [imageFile, setImageFile] = useState(null);

  const { isAuthenticated, loading, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const csrfToken = useCsrfToken();

  const profilePicture =
  profile?.profile?.profile_picture
    ? profile.profile.profile_picture.startsWith("http")
      ? profile.profile.profile_picture
      : `${baseUrl}${profile.profile.profile_picture}`
    : "/default-avatar.png";


  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    setImageFile(file);
    setPreviewImage(URL.createObjectURL(file));
  
    const formData = new FormData();
    formData.append("profile_picture", file);
  
    try {
      const res = await api.post("/api/user/update/", formData, {
        withCredentials: true,
      });
  
      // update UI instantly
      setProfile((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          profile_picture: res.data.profile.profile_picture,
        },
      }));
  
      setPreviewImage(null);
      setImageFile(null);
    } catch (err) {
      console.error("Upload failed", err);
    }
  };
  
  // ================= FETCH PROFILE (FIXED) =================
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get(`api/user/account/`, {
          withCredentials: true,
          headers: {
            "X-CSRFToken": csrfToken,
          },
        });

        const data = response.data;
        const user = data.user || {};
        const profileData = data.profile || {};

        setProfile({
          user: data.user,
          profile: data.profile,
          wallet: data.wallet,
          referrals: data.referrals,
          voucher: data.voucher,
        });

        setForm({
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          email: user.email || "",
          phone_number: profileData.phone_number || "",
          location: profileData.location || "",
          address: profileData.address || "",
          city: profileData.city || "",
          country: profileData.country || "",
          date_of_birth: profileData.date_of_birth || "",
        });

      } catch (error) {
        console.error("Profile fetch error:", error);
      }
    };

    if (isAuthenticated && !loading) {
      fetchProfile();
    }
  }, [isAuthenticated, loading, csrfToken]);

  // ================= SAVE PROFILE (FIXED FOR DJANGO) =================
  const handleSave = async () => {
    const data = new FormData();

    // User model
    data.append("first_name", form.first_name);
    data.append("last_name", form.last_name);
    data.append("email", form.email);

    // Profile model
    data.append("phone_number", form.phone_number);
    data.append("location", form.location);
    data.append("address", form.address);
    data.append("city", form.city);
    data.append("country", form.country);
    data.append("date_of_birth", form.date_of_birth);

    // Image
    if (imageFile) {
      data.append("profile_picture", imageFile);
    }

    try {
      const res = await api.post(
        `api/user/update/`,
        data,
        {
          withCredentials: true,
          headers: {
            "X-CSRFToken": csrfToken,
          },
        }
      );

      const updatedUser = res.data.user || {};
      const updatedProfile = res.data.profile || {};

      setForm({
        first_name: updatedUser.first_name || "",
        last_name: updatedUser.last_name || "",
        email: updatedUser.email || "",
        phone_number: updatedProfile.phone_number || "",
        location: updatedProfile.location || "",
        address: updatedProfile.address || "",
        city: updatedProfile.city || "",
        country: updatedProfile.country || "",
        date_of_birth: updatedProfile.date_of_birth || "",
      });

      setEditMode(false);
      setImageFile(null);
      setPreviewImage(null);
    

    } catch (error) {
      console.error("Profile update failed:", error);
    }
  };

  
  // input styling helper
  const inputStyle = (colors) => ({
    padding: "10px",
    borderRadius: "8px",
    border: `1px solid ${colors.primary[400]}`,
    background: colors.primary[500],
    color: colors.gray[100],
    outline: "none",
  });
 
  

 

  return (
      <Box
      className="header-top"
      sx={{
        backgroundColor: colors.primary[600],
        width: {
          xs: "100%",
          md: "calc(100% - 80px)",
        },
        px: {
          xs: 1,
          sm: 2,
          md: 3,
        },
        zIndex: {
          xs: 99
        }
      }}
    >
      <Box
        className="topbar sm:w-full"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: {
            xs: 1,
            sm: 1.5,
            md: 2,
          },
          width: "100%",
        }}
      >
        <Box
          className="toggle"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent:'center',
            fontSize: {
              xs: "20px",
              sm: "24px",
              md: "28px",
            },
          }}
        >
          <IonIcon icon={menuOutline} />
        </Box>

        <Box
          className="title-head"
          style={{ "--span-color": colors.gray[100] }}
          sx={{
            fontSize: {
              xs: "0.8rem",
              sm: "0.95rem",
              md: "1.1rem",
            },
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <span className="header">
            Maa <strong>Mara</strong><span className="mkt">Market</span>
          </span>
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            mx: {
              xs: 0.5,
              sm: 1,
              md: 2,
            },
          }}
          style={{ "--placeholder-color": colors.gray[100] }}
        >
          <SearchBarForVendorAdmin />
        </Box>

        <Box
          sx={{
            mb: "1.5em",
            display: {
              xs: "none",
              sm: "none",
              md: "none",
              lg: "block",
            },
          }}
        >
          <LogoutButton />
        </Box>

        <Box
            className="users"
            onClick={(e) => {
              e.stopPropagation();
              setOpenProfile(true);
              setActiveView("main");
            }}
            sx={{ cursor: "pointer" }}
          >
           <Avatar
              src={previewImage || profilePicture}
              alt="User Profile"
              sx={{
                width: {
                  xs: 34,
                  sm: 38,
                  md: 42,
                },
                height: {
                  xs: 34,
                  sm: 38,
                  md: 42,
                },
              }}
            />

            {/* hidden file input */}
            <input
              type="file"
              hidden
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageChange}
            />

              <Modal
                open={openProfile}
                onClose={handleCloseProfile}
              >
              <Box
                onClick={(e) => e.stopPropagation()}
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: {
                    xs: "95%",
                    sm: "90%",
                    md: 420,
                  },
                  maxHeight: "90vh",
                  overflowY: "auto",
                  bgcolor: colors.primary[600],
                  borderRadius: "16px",
                  boxShadow: 24,
                  p: 3,
                  outline: "none",
                  backdropFilter: "blur(10px)",
                }}
                
              >
                {/* Close */}
                <IconButton
                  onClick={handleCloseProfile}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    color: colors.gray[100],
                  }}
                >
                  <CloseIcon />
                </IconButton>

                {/* ================= AVATAR ================= */}
                <Box display="flex" justifyContent="center" mb={2}>
                <Avatar
                  src={previewImage || profilePicture}
                  onClick={() => fileInputRef.current.click()}
                  sx={{
                    width: {
                      xs: 70,
                      sm: 80,
                    },
                    height: {
                      xs: 70,
                      sm: 80,
                    },
                    border: `2px solid ${colors.primary[400]}`,
                    cursor: "pointer",
                  }}
                />
                </Box>

                {/* ================= MAIN MENU ================= */}
                {activeView === "main" && (
                  <Box display="flex" flexDirection="column" gap={1} >
                    <Button sx={{color:colors.gray[100]}} onClick={() => setActiveView("view")}>
                      View Account
                    </Button>

                    <Button sx={{color:colors.gray[100]}} onClick={() => setActiveView("edit")}>
                      Edit Profile
                    </Button>

                    <Button sx={{color:colors.gray[100]}} onClick={() => setActiveView("manage")}>
                      Manage Account
                    </Button>

                  

                    <Button sx={{color:colors.gray[100]}} onClick={() => setActiveView("logout")}>
                      Logout
                    </Button>
                  </Box>
                )}

                {/* ================= VIEW ACCOUNT ================= */}
                  {activeView === "view" && (
                    <Box display="flex" flexDirection="column" gap={0.5}>

                      <Typography sx={{display:'flex', justifyContent:'space-between'}}>
                        First Name: <strong>{form.first_name}</strong>
                      </Typography>

                      <Typography sx={{display:'flex', justifyContent:'space-between'}}>
                        Last Name: <strong>{form.last_name}</strong>
                      </Typography>

                      <Typography sx={{display:'flex', justifyContent:'space-between'}}>
                        Email: <strong>{form.email}</strong>
                      </Typography>

                      <Typography sx={{display:'flex', justifyContent:'space-between'}}>
                        Phone Number: <strong>{form.phone_number}</strong>
                      </Typography>

                      <Typography sx={{display:'flex', justifyContent:'space-between'}}>
                        Location: <strong>{form.location}</strong>
                      </Typography>

                      <Typography sx={{display:'flex', justifyContent:'space-between'}}>
                        Address: <strong>{form.address}</strong>
                      </Typography>

                      <Typography sx={{display:'flex', justifyContent:'space-between'}}>
                        City: <strong>{form.city}</strong>
                      </Typography>

                      <Typography sx={{display:'flex', justifyContent:'space-between'}}>
                        Country: <strong>{form.country}</strong>
                      </Typography>

                      <Typography sx={{display:'flex', justifyContent:'space-between'}}>
                        Date of Birth: <strong>{form.date_of_birth}</strong>
                      </Typography>

                      <Button onClick={() => setActiveView("main")} sx={{color:colors.gray[100], backgroundColor:colors.primary[500]}}>
                        Back
                      </Button>
                    </Box>
                  )}

               {/* ================= EDIT PROFILE ================= */}
                {activeView === "edit" && (
                  <Box display="flex" flexDirection="column" gap={1}>
                    <input
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      disabled={!editMode}
                      placeholder="Username"
                      style={inputStyle(colors)}
                    />

                    <input
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      disabled={!editMode}
                      placeholder="Email"
                      style={inputStyle(colors)}
                    />

                    <input
                      name="first_name"
                      value={form.first_name}
                      onChange={handleChange}
                      disabled={!editMode}
                      placeholder="First Name"
                      style={inputStyle(colors)}
                    />

                    <input
                      name="last_name"
                      value={form.last_name}
                      onChange={handleChange}
                      disabled={!editMode}
                      placeholder="Last Name"
                      style={inputStyle(colors)}
                    />

                    {/* EXISTING FIELD (kept) */}
                    <input
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      disabled={!editMode}
                      placeholder="Location"
                      style={inputStyle(colors)}
                    />

                    {/* ✅ ADDED MISSING DJANGO FIELDS */}
                    <input
                      name="phone_number"
                      value={form.phone_number}
                      onChange={handleChange}
                      disabled={!editMode}
                      placeholder="Phone Number"
                      style={inputStyle(colors)}
                    />

                    <input
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      disabled={!editMode}
                      placeholder="Address"
                      style={inputStyle(colors)}
                    />

                    <input
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      disabled={!editMode}
                      placeholder="City"
                      style={inputStyle(colors)}
                    />

                    <input
                      name="country"
                      value={form.country}
                      onChange={handleChange}
                      disabled={!editMode}
                      placeholder="Country"
                      style={inputStyle(colors)}
                    />

                    <input
                      type="date"
                      name="date_of_birth"
                      value={form.date_of_birth || ""}
                      onChange={handleChange}
                      disabled={!editMode}
                      style={inputStyle(colors)}
                    />

                  <Box display="flex" gap={1}>
                    {!editMode ? (
                      <Button
                        variant="contained"
                        onClick={() => setEditMode(true)}
                        sx={{ backgroundColor: colors.purpleAccent[500], color: colors.gray[100] }}
                      >
                        Edit
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        onClick={handleSave}
                        sx={{ backgroundColor: colors.greenAccent[900], color: colors.gray[100] }}
                      >
                        Save
                      </Button>
                    )}

                    <Button
                      variant="outlined"
                      onClick={() => {
                        setEditMode(false);
                        setActiveView("main");
                      }}
                      sx={{ color: colors.gray[100] }}
                    >
                      Back
                    </Button>
                  </Box>
                  </Box>
                )}

                {/* ================= MANAGE ACCOUNT ================= */}
                {activeView === "manage" && (
                  <Box>
                    <Typography variant="h6">Account Settings</Typography>

                    <Typography>Security settings coming soon</Typography>

                    <Button onClick={() => setActiveView("main")} sx={{color:colors.gray[100], backgroundColor:colors.primary[500]}}>
                      Back
                    </Button>
                  </Box>
                )}

                {/* ================= THEME =================
                {activeView === "theme" && (
                  <Box>
                    <Typography variant="h6">Theme</Typography>

                    <Button
                      onClick={() => {
                        // hook into your theme context if available
                      }}
                    >
                      Toggle Dark/Light Mode
                    </Button>

                    <Button onClick={() => setActiveView("main")}>
                      Back
                    </Button>
                  </Box>
                )} */}

                {/* ================= LOGOUT ================= */}
                {activeView === "logout" && (
                  <Box>
                    <Typography>Are you sure you want to logout?</Typography>

                    <Box mt={1}>
                      <LogoutButton />
                    </Box>

                    <Button onClick={() => setActiveView("main")} sx={{color:colors.gray[100], backgroundColor:colors.primary[500]}}>
                      Cancel
                    </Button>
                  </Box>
                )}

              {activeView === "main" && (
                <Box display="flex" gap={1} mt={2}>
                  <Button
                    onClick={() => colorMode.setLightMode()}
                    startIcon={<IonIcon icon={sunnyOutline} />}
                    sx={{
                      flex: 1,
                      backgroundColor: "#f5f5f5",
                      color: "#111",
                      "&:hover": { backgroundColor: "#e0e0e0" },
                    }}
                  >
                    Light
                  </Button>

                  <Button
                    onClick={() => colorMode.setDarkMode()}
                    startIcon={<IonIcon icon={moon} />}
                    sx={{
                      flex: 1,
                      backgroundColor: "#1e1e1e",
                      color: "#fff",
                      "&:hover": { backgroundColor: "#333" },
                    }}
                  >
                    Dark
                  </Button>
                </Box>)}
              </Box>
            </Modal>

        </Box>
      </Box>
    </Box>
  );
};

export default HeaderTop;
