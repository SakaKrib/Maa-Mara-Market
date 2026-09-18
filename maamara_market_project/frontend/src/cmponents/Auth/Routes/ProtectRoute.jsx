// ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext/Context";
import { CircularProgress, Box } from "@mui/material";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();

  // 🔹 Show loader while auth state is being determined
  if (loading) {
    return (
      <Box className="flex justify-center items-center h-screen">
        <CircularProgress />
      </Box>
    );
  }

  // 🔹 If user is not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 🔹 Role-based protection (supports single role or array of roles)
  if (requiredRole) {
    if (Array.isArray(requiredRole)) {
      if (!requiredRole.includes(user?.role)) {
        return <Navigate to="/unauthorized" replace />;
      }
    } else if (user?.role !== requiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // 🔹 If everything checks out, render the page
  return children;
};

export default ProtectedRoute;
