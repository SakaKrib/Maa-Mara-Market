import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../../cmponents/Auth/AuthContext/Context";
import { useCategories } from "./SectionHook";
import MegaMenuWomen from "./WomenCat";
import MegaMenuMen from "./MenCat";
import MegaMenuChildren from "./ChildrenCat";
import MegaMenuSports from "./SportsCat";
import MegaMenuUnisex from "./UnisexCat";
import {
  Home,
  Store,
  Shirt,
  Users,
  Dumbbell,
  Baby,
  Sparkles,
  LogIn,
  UserRound,
  LogOut,
  LayoutDashboard,
  Truck,
  Newspaper,
  Heart,
  Star,
  ChevronDown,
  X,
} from "lucide-react";

const MobileNavigationDrawer = ({ open, onClose }) => {
  const { data, loading } = useCategories();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const isVendor = user?.role === "vendor";
  const canBecomeVendor = isAuthenticated && !isAdmin && !isVendor;
  const [expandedCategory, setExpandedCategory] = useState(null);

  const departments = useMemo(() => {
    const section =
      data?.sections?.find((item) =>
        ["departmental", "general"].includes(item?.name?.toLowerCase())
      ) || data?.sections?.[0];

    return section?.departments || [];
  }, [data]);

  useEffect(() => {
    if (!open) {
      setExpandedCategory(null);
      return;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const go = (path) => {
    onClose();
    navigate(path);
  };

  const toggleCategory = (category) => {
    setExpandedCategory((value) => (value === category ? null : category));
  };

  const itemClass =
    "flex items-center justify-between w-full px-5 py-4 border-b border-gray-100 font-medium text-[#222]";

  return (
    <>
      <div
        className={"mm-mobile-drawer-backdrop " + (open ? "is-open" : "")}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={"mm-mobile-drawer " + (open ? "is-open" : "")}
        aria-hidden={!open}
        aria-label="Mobile navigation"
      >
        <div className="mm-mobile-drawer-head">
          <strong>Maa Mara Market</strong>
          <button type="button" onClick={onClose} aria-label="Close menu">
            <X size={21} />
          </button>
        </div>

        <nav className="mm-mobile-drawer-nav">
          <button type="button" onClick={() => go("/")} className={itemClass}>
            <span className="flex items-center gap-3">
              <Home size={19} strokeWidth={1.8} />
              Home
            </span>
          </button>

          <button type="button" onClick={() => go("/list")} className={itemClass}>
            <span className="flex items-center gap-3">
              <Store size={19} strokeWidth={1.8} />
              Shop
            </span>
          </button>

          <div className="mm-mobile-drawer-section">
            <div className="mm-mobile-drawer-section-title">Departments</div>

            {loading ? (
              <div className="mm-mobile-drawer-loading">
                Loading categories…
              </div>
            ) : departments.length === 0 ? (
              <button
                type="button"
                onClick={() => go("/filter-category")}
                className={itemClass}
              >
                <span className="flex items-center gap-3">
                  <Store size={19} strokeWidth={1.8} />
                  Browse categories
                </span>
              </button>
            ) : (
              departments.map((department) => (
                <div key={department.id} className="mm-mobile-department">
                  <button
                    type="button"
                    className="mm-mobile-department-trigger"
                    onClick={() => toggleCategory("department-" + department.id)}
                  >
                    <span className="flex items-center gap-3">
                      <Shirt size={19} strokeWidth={1.8} />
                      {department.name}
                    </span>
                    <ChevronDown
                      size={18}
                      className={
                        expandedCategory === "department-" + department.id
                          ? "rotate-180"
                          : ""
                      }
                    />
                  </button>

                  {expandedCategory === "department-" + department.id && (
                    <div className="mm-mobile-category-list">
                      {(department.categories || []).map((category) => (
                        <div key={category.id}>
                          <button
                            type="button"
                            className="mm-mobile-category"
                            onClick={() =>
                              go("/filter-category?category=" + category.id)
                            }
                          >
                            {category.name}
                          </button>

                          {(category.subcategories || [])
                            .slice(0, 8)
                            .map((subcategory) => (
                              <button
                                type="button"
                                key={subcategory.id}
                                className="mm-mobile-subcategory"
                                onClick={() =>
                                  go(
                                    "/subcategory/" +
                                      subcategory.id +
                                      "/products"
                                  )
                                }
                              >
                                {subcategory.name}
                              </button>
                            ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="mm-mobile-drawer-section">
            <div className="mm-mobile-drawer-section-title">Collections</div>

            <div className="border-b border-gray-100">
              <button
                type="button"
                onClick={() => toggleCategory("women")}
                className={itemClass}
              >
                <span className="flex items-center gap-3">
                  <Shirt size={19} strokeWidth={1.8} />
                  Women
                </span>
                <ChevronDown
                  size={18}
                  className={expandedCategory === "women" ? "rotate-180" : ""}
                />
              </button>
              {expandedCategory === "women" && (
                <div className="px-5 pb-4">
                  <MegaMenuWomen />
                </div>
              )}
            </div>

            <div className="border-b border-gray-100">
              <button
                type="button"
                onClick={() => toggleCategory("men")}
                className={itemClass}
              >
                <span className="flex items-center gap-3">
                  <Users size={19} strokeWidth={1.8} />
                  Men
                </span>
                <ChevronDown
                  size={18}
                  className={expandedCategory === "men" ? "rotate-180" : ""}
                />
              </button>
              {expandedCategory === "men" && (
                <div className="px-5 pb-4">
                  <MegaMenuMen />
                </div>
              )}
            </div>

            <div className="border-b border-gray-100">
              <button
                type="button"
                onClick={() => toggleCategory("sports")}
                className={itemClass}
              >
                <span className="flex items-center gap-3">
                  <Dumbbell size={19} strokeWidth={1.8} />
                  Sports
                  <span className="bg-[var(--blue)] text-white text-[10px] px-2 py-1 rounded-full">
                    New!
                  </span>
                </span>
                <ChevronDown
                  size={18}
                  className={expandedCategory === "sports" ? "rotate-180" : ""}
                />
              </button>
              {expandedCategory === "sports" && (
                <div className="px-5 pb-4">
                  <MegaMenuSports />
                </div>
              )}
            </div>

            <div className="border-b border-gray-100">
              <button
                type="button"
                onClick={() => toggleCategory("children")}
                className={itemClass}
              >
                <span className="flex items-center gap-3">
                  <Baby size={19} strokeWidth={1.8} />
                  Children
                </span>
                <ChevronDown
                  size={18}
                  className={
                    expandedCategory === "children" ? "rotate-180" : ""
                  }
                />
              </button>
              {expandedCategory === "children" && (
                <div className="px-5 pb-4">
                  <MegaMenuChildren />
                </div>
              )}
            </div>

            <div className="border-b border-gray-200">
              <button
                type="button"
                onClick={() => toggleCategory("unisex")}
                className={itemClass}
              >
                <span className="flex items-center gap-3">
                  <Sparkles size={19} strokeWidth={1.8} />
                  Unisex
                </span>
                <ChevronDown
                  size={18}
                  className={
                    expandedCategory === "unisex" ? "rotate-180" : ""
                  }
                />
              </button>
              {expandedCategory === "unisex" && (
                <div className="px-5 pb-4">
                  <MegaMenuUnisex />
                </div>
              )}
            </div>
          </div>

          <div className="mm-mobile-drawer-section mt-4 border-t border-gray-200">
            <div className="mm-mobile-drawer-section-title">Account</div>

            {isAuthenticated ? (
              <>
                {canBecomeVendor && (
                  <button type="button" onClick={() => go("/vendor-register-form")} className={itemClass}>
                    <span className="flex items-center gap-3"><Store size={19} strokeWidth={1.8} />Become a vendor</span>
                  </button>
                )}
                <button type="button" onClick={() => go("/user-account")} className={itemClass}>
                  <span className="flex items-center gap-3"><UserRound size={19} strokeWidth={1.8} />My Account</span>
                </button>
                <button type="button" onClick={() => go("/customer-order")} className={itemClass}>
                  <span className="flex items-center gap-3"><Truck size={19} strokeWidth={1.8} />Order Tracking</span>
                </button>
                {(isAdmin || isVendor) && (
                  <button type="button" onClick={() => go(isAdmin ? "/admin-dashboard" : "/vendors-dashboard")} className={itemClass}>
                    <span className="flex items-center gap-3"><LayoutDashboard size={19} strokeWidth={1.8} />Dashboard</span>
                  </button>
                )}
                <button type="button" onClick={async () => { await logout(); onClose(); }} className={itemClass}>
                  <span className="flex items-center gap-3"><LogOut size={19} strokeWidth={1.8} />Log out</span>
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => go("/customer-login")} className={itemClass}>
                  <span className="flex items-center gap-3"><LogIn size={19} strokeWidth={1.8} />Sign In</span>
                </button>
                <button type="button" onClick={() => go("/register")} className={itemClass}>
                  <span className="flex items-center gap-3"><UserRound size={19} strokeWidth={1.8} />Sign Up</span>
                </button>
              </>
            )}

            <button type="button" onClick={() => go("/blogs")} className={itemClass}>
              <span className="flex items-center gap-3"><Newspaper size={19} strokeWidth={1.8} />Journal</span>
            </button>
            <button type="button" onClick={() => go("/filter-category")} className={itemClass}>
              <span className="flex items-center gap-3"><Heart size={19} strokeWidth={1.8} />Wishlist</span>
            </button>
            <button type="button" onClick={() => go("/filter-category")} className={itemClass}>
              <span className="flex items-center gap-3"><Star size={19} strokeWidth={1.8} />Featured</span>
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
};

export default MobileNavigationDrawer;
