import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  useTheme,
} from "@mui/material";
import { tokens } from "../../../theme";

const LogoutButton = () => {
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const baseUrl = "http://127.0.0.1:8000";

  const handleLogout = async () => {
    setLoading(true);

    try {
      await fetch(`${baseUrl}/api/logout/`, {
        method: "POST",
        credentials: "include", // 🔥 required for HTTP-only cookies
      });

      // 🔥 force clean redirect (best for auth systems)
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout error:", err);

      // still force logout UX even if backend fails
      window.location.href = "/login";
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
          backgroundColor: colors.redAccent[700],
          "&:hover": { backgroundColor: colors.redAccent[500] },
        }}
      >
        {loading ? <CircularProgress size={24} /> : "Logout"}
      </Button>
    </Box>
  );
};

export default LogoutButton;