import React, { useState } from "react";
import { Box, Button, CircularProgress, useTheme } from "@mui/material";
import { tokens } from "../../../theme";
import api from "../../../Services/Api"; // centralized axios instance

const LogoutButton = () => {
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const handleLogout = async () => {
    if (loading) return; // prevent double clicks

    setLoading(true);

    try {
      // Call backend logout (clears cookies + blacklist token server-side)
      await api.post(
        "/api/logout/",
        {},
        {
          withCredentials: true, // REQUIRED for httpOnly cookie auth
        }
      );

      // Clear any frontend state storage
      localStorage.clear();
      sessionStorage.clear();

      // Hard redirect ensures full auth reset
      window.location.replace("/login");
    } catch (err) {
      console.error("Logout error:", err);

      // Fallback logout UX even if backend fails
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 2, textAlign: "center" }}>
      <Button
        variant="contained"
        onClick={handleLogout}
        disabled={loading}
        sx={{
          backgroundColor: 'rgba(255, 0, 0, 0.253)',
          "&:hover": {
            backgroundColor: "rgba(255, 0, 0, 0.2)",
          },
          minWidth: 120,
          fontWeight: 600,
        }}
      >
        {loading ? (
          <CircularProgress size={22} sx={{ color: "#fff" }} />
        ) : (
          "Logout"
        )}
      </Button>
    </Box>
  );
};

export default LogoutButton;