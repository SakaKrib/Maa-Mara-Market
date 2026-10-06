import React from "react";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import ProtectedRoute from "../ProtectRoute";
import HeaderTop from "../../../Portions/HeaderTop/HeaderTop";
import NavBar from "../../../Portions/NavBar/NavBarSide";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <HeaderTop onMenuToggle={() => setSidebarOpen((open) => !open)} />
        <NavBar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="min-h-screen pt-[72px] lg:pl-64">
          <div className="mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-5 lg:px-7 lg:py-6">
            <Outlet />
          </div>
        </main>
        <footer className="border-t border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 lg:pl-64">
          © {new Date().getFullYear()} Maa Mara Market. All rights reserved.
        </footer>
      </div>
    </ProtectedRoute>
  );
};

export default AdminLayout;
