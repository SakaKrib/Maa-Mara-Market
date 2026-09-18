import { Outlet } from "react-router-dom";
import ProtectedRoute from "../ProtectRoute";
import HeaderTop from "../../../Portions/HederTop/HeaderTop";
import NavBar from "../../../Portions/NavBar/NavBarSide";

const AdminLayout = () => (
  <ProtectedRoute requiredRole="admin">
    <div className="etsy-manager">
      <HeaderTop />
      <NavBar />
      <main className="etsy-manager-main"><Outlet /></main>
    </div>
  </ProtectedRoute>
);
export default AdminLayout;
