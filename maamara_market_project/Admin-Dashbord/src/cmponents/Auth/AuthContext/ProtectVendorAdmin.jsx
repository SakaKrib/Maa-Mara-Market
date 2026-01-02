import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./Context";

function HomeRedirectWrapper({ children }) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      if (user.role === "admin") navigate("/dashboard", { replace: true });
      else if (user.role === "vendor") navigate("/vendors-dashboard", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  return children;
}
export default HomeRedirectWrapper;