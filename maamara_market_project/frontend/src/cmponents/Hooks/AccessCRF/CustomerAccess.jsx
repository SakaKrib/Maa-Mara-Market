import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../cmponents/Auth/AuthContext/Context"; // adjust path as needed

export const useCustomerAccessGuard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/customer-login");
    } else if (user?.role === "customer") {
      // ✅ allowed
    } else if (user?.role) {
      navigate("/unauthorized");
    } else {
      console.warn("⚠️ Unknown role");
      navigate("/unauthorized");
    }
  }, [isAuthenticated, user, navigate]);

  // Block rendering if not a customer
  const isAllowed = isAuthenticated && user?.role === "customer";

  return isAllowed;
};
