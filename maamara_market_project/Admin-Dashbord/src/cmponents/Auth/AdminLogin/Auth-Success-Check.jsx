import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, CircularProgress, Typography, useTheme } from "@mui/material";
import { baseUrl } from "../../../cmponents/Constant/Constant";
import { tokens } from "../../../theme";

export default function AuthSuccess() {
  const navigate = useNavigate();
  const theme = useTheme();
  const Colors = tokens(theme.palette.mode);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/check-auth/`, {
          credentials: "include"
        });

        const data = await res.json();

        if (!data?.isAuthenticated) {
          navigate("/login");
          return;
        }

        const role = data?.user?.role;

        console.log('role',role)

        if (role === "admin") window.location.href = "/admin-dashboard";
        else if (role === "vendor") window.location.href = "/vendors-dashboard/";
        else navigate("/");

      } catch (err) {
        navigate("/login");
      }
    };

    checkAuth();
  }, [navigate]);

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",

        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",

        zIndex: 9999,

        backgroundColor: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",

        color: "#fff",
      }}
    >
      <CircularProgress size={55} thickness={4} />
      <Typography mt={2} variant="h6">
        Signing you in...
      </Typography>
    </Box>
  );
}