import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../../../cmponents/Auth/AuthContext/Context";
import { useCategories } from "./SectionHook";
import { useCollections, useSiteContact, phoneHref, mailHref } from "../../../../../Services/siteContent";
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
  Info,
  Mail,
  Package,
  RotateCcw,
  BriefcaseBusiness,
  CircleHelp,
  ShoppingBag,
  Leaf,
  ShoppingCart,
  UserPlus,
  MessageCircle,
  LifeBuoy,
  MapPin,
  Phone,
} from "lucide-react";

const COLLECTION_ICONS = { women: Shirt, men: Users, sports: Dumbbell, children: Baby, unisex: Sparkles };

const DrawerFooterLink = ({ to, href, icon: Icon, onClick, children }) => {
  const content = (
    <>
      <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
      <span>{children}</span>
    </>
  );

  if (href) {
    return <a href={href} className="mm-mobile-drawer-link" onClick={onClick}>{content}</a>;
  }

  return <Link to={to} className="mm-mobile-drawer-link" onClick={onClick}>{content}</Link>;
};

const MobileNavigationDrawer = ({ open, onClose, nativeApp = false }) => {
  const { data, loading } = useCategories();
  const { collections: serverCollections } = useCollections();
  const contact = useSiteContact();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const isVendor = user?.role === "vendor";
  const canBecomeVendor = isAuthenticated && !isAdmin && !isVendor;
  const [expandedCategory, setExpandedCategory] = useState(null);

  const departments = useMemo(() => {
    const section =
      data?.sections?.find((item) =>
        ["inorganic", "departmental", "general"].includes(item?.name?.toLowerCase())
      ) || data?.sections?.[0];

    return section?.departments || [];
  }, [data]);

  // Normally the server supplies the collections with real "new" flags. If it cannot
  // be reached (or is an older backend), build the same lists from the category tree
  // so the Collections section never vanishes; they just carry no badges.
  const collections = useMemo(() => {
    if (serverCollections.length > 0) return serverCollections;
    const fashion = departments.find((d) => /fashion|apparel/i.test(d?.name || ""));
    const sports = departments.find((d) => /sport|outdoor/i.test(d?.name || ""));
    const pick = (list, patterns) => {
      const out = [];
      patterns.forEach((pattern) => {
        const match = (list || []).find((c) => new RegExp(pattern, "i").test(c?.name || ""));
        if (match && !out.includes(match)) out.push(match);
      });
      return out;
    };
    const shape = (cats) => cats.map((c) => ({
      id: c.id,
      name: c.name,
      new_count: 0,
      subcategories: (c.subcategories || []).map((sub) => ({ id: sub.id, name: sub.name, new_count: 0 })),
    }));
    const defs = [
      ["women", "Women", pick(fashion?.categories, ["women", "accessor", "shoes"])],
      ["men", "Men", pick(fashion?.categories, ["^men", "shoes"])],
      ["sports", "Sports", (sports?.categories || []).slice(0, 3)],
      ["children", "Children", pick(fashion?.categories, ["children|kids", "children.*shoes|kids.*shoes"])],
      ["unisex", "Unisex", pick(fashion?.categories, ["unisex"])],
    ];
    return defs
      .filter(([, , cats]) => cats.length > 0)
      .map(([key, label, cats]) => ({ key, label, is_new: false, new_count: 0, categories: shape(cats) }));
  }, [serverCollections, departments]);

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
        className={"mm-mobile-drawer " + (nativeApp ? "mm-native-drawer " : "") + (open ? "is-open" : "")}
        aria-hidden={!open}
        aria-label="Mobile navigation"
      >
        <div className="mm-mobile-drawer-head">
          {nativeApp ? (
            <div className="logo mm-drawer-wordmark">
              <a href="/">Maa <span className="it-name">Mara</span> <span className="mkrt">Market</span></a>
            </div>
          ) : (
            <strong>Maa Mara Market</strong>
          )}
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

          {collections.length > 0 && (
            <div className="mm-mobile-drawer-section">
              <div className="mm-mobile-drawer-section-title">Collections</div>

              {collections.map((collection) => {
                const key = "collection-" + collection.key;
                const Icon = COLLECTION_ICONS[collection.key] || Shirt;
                const isOpen = expandedCategory === key;
                return (
                  <div key={collection.key} className="mm-mobile-department">
                    <button
                      type="button"
                      className="mm-mobile-department-trigger"
                      aria-expanded={isOpen}
                      onClick={() => toggleCategory(key)}
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={19} strokeWidth={1.8} />
                        {collection.label}
                        {collection.is_new && <span className="mm-new-badge">New</span>}
                      </span>
                      <ChevronDown size={18} className={isOpen ? "rotate-180" : ""} />
                    </button>

                    {isOpen && (
                      <div className="mm-mobile-category-list">
                        {collection.categories.map((category) => (
                          <div key={category.id}>
                            <button
                              type="button"
                              className="mm-mobile-category"
                              onClick={() => go("/filter-category?category=" + category.id)}
                            >
                              {category.name}
                              {category.new_count > 0 && <span className="mm-new-badge mm-new-badge--small">New</span>}
                            </button>

                            {(category.subcategories || []).slice(0, 8).map((subcategory) => (
                              <button
                                type="button"
                                key={subcategory.id}
                                className="mm-mobile-subcategory"
                                onClick={() => go("/subcategory/" + subcategory.id + "/products")}
                              >
                                {subcategory.name}
                                {subcategory.new_count > 0 && <span className="mm-new-badge mm-new-badge--small">New</span>}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

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
                {nativeApp && (
                  <button type="button" onClick={() => go("/profile")} className={itemClass}>
                    <span className="flex items-center gap-3"><UserRound size={19} strokeWidth={1.8} />Profile</span>
                  </button>
                )}
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

          {nativeApp && (
            <>
              <div className="mm-mobile-drawer-section mm-mobile-footer-links">
                <div className="mm-mobile-drawer-section-title">Company</div>
                <DrawerFooterLink to="/about-us" icon={Info} onClick={onClose}>About Us</DrawerFooterLink>
                <DrawerFooterLink {...(contact.email ? { href: mailHref(contact.email, "Contact Maa Mara Market") } : { to: "/support" })} icon={Mail} onClick={onClose}>Contact us</DrawerFooterLink>
                <DrawerFooterLink to="/customer-order" icon={Package} onClick={onClose}>Order History</DrawerFooterLink>
                <DrawerFooterLink to="/request-returns" icon={RotateCcw} onClick={onClose}>Return Policy &amp; Returns</DrawerFooterLink>
                <DrawerFooterLink {...(contact.email ? { href: mailHref(contact.email, "Shipping Question") } : { to: "/support" })} icon={Truck} onClick={onClose}>Shipping</DrawerFooterLink>
                <DrawerFooterLink to="/careers/jobs" icon={BriefcaseBusiness} onClick={onClose}>Career</DrawerFooterLink>
                <DrawerFooterLink to="/faq" icon={CircleHelp} onClick={onClose}>Frequently Asked Questions</DrawerFooterLink>
              </div>
              <div className="mm-mobile-drawer-section mm-mobile-footer-links">
                <div className="mm-mobile-drawer-section-title">Shop</div>
                <DrawerFooterLink to="/list" icon={ShoppingBag} onClick={onClose}>All products</DrawerFooterLink>
                <DrawerFooterLink to="/organic" icon={Leaf} onClick={onClose}>Organic</DrawerFooterLink>
                <DrawerFooterLink to="/blogs" icon={Newspaper} onClick={onClose}>Journal</DrawerFooterLink>
                <DrawerFooterLink to="/filter-category" icon={Star} onClick={onClose}>Featured</DrawerFooterLink>
                <DrawerFooterLink to="/shopping-cart" icon={ShoppingCart} onClick={onClose}>Cart</DrawerFooterLink>
              </div>
              <div className="mm-mobile-drawer-section mm-mobile-footer-links">
                <div className="mm-mobile-drawer-section-title">Help &amp; contact</div>
                {canBecomeVendor && (
                  <button type="button" onClick={() => go("/vendor-register-form")} className={itemClass}>
                    <span className="flex items-center gap-3"><Store size={19} strokeWidth={1.8} />Become a vendor</span>
                  </button>
                )}
                <DrawerFooterLink to="/send-invitation" icon={UserPlus} onClick={onClose}>Invite friends</DrawerFooterLink>
                <DrawerFooterLink to="/messages" icon={MessageCircle} onClick={onClose}>Chat with us</DrawerFooterLink>
                <DrawerFooterLink to="/support" icon={LifeBuoy} onClick={onClose}>Support</DrawerFooterLink>
                <DrawerFooterLink to="/support" icon={CircleHelp} onClick={onClose}>Help</DrawerFooterLink>
                {contact.email && <DrawerFooterLink href={mailHref(contact.email)} icon={Mail} onClick={onClose}>{contact.email}</DrawerFooterLink>}
                {contact.phone && <DrawerFooterLink href={phoneHref(contact.phone)} icon={Phone} onClick={onClose}>{contact.phone}</DrawerFooterLink>}
                {contact.location && <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-500"><MapPin size={15} />{contact.location}</div>}
              </div>
              {isAuthenticated && (isAdmin || isVendor) && (
                <div className="mm-mobile-drawer-section mm-mobile-footer-links">
                  <div className="mm-mobile-drawer-section-title">Dashboard</div>
                  <DrawerFooterLink to={isAdmin ? "/admin-dashboard" : "/vendors-dashboard"} icon={LayoutDashboard} onClick={onClose}>Dashboard</DrawerFooterLink>
                </div>
              )}
            </>
          )}
        </nav>
      </aside>
    </>
  );
};

export default MobileNavigationDrawer;
