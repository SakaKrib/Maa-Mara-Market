import React, { useEffect, useState } from "react";
import "../../../../PublicUi/maamara.css";
import SearchBar from "../../../Navigations/Search/Search";
import NavIcons from "../../../Navigations/Search/NavIcons/NavIcon";
import { Link } from "react-router-dom";
import useNewBlogs from "../../../../../cmponents/Hooks/BlogHooksNew/NewBlogs";
import Maamara from "../../../../../assets/Logo/Maamara.jpg";
import CategoryNavigation from "./CategoryNavigation";
import MobileNavigationDrawer from "./MobileNavigationDrawer";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [isFixed, setIsFixed] = useState(false);
  const { newBlogCount, loading } = useNewBlogs();

  useEffect(() => {
    const handleScroll = () => setIsFixed(window.scrollY > 120);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`mm-site-header ${isFixed ? "is-scrolled" : ""}`}>
      <div className="mm-utility-bar">
        <div className="mm-container mm-utility-inner">
          <nav aria-label="Utility navigation">
            <Link to="/blogs">
              Blog
              {!loading && newBlogCount > 0 && <span className="mm-notification-badge">{newBlogCount}</span>}
            </Link>
            <Link to="/filter-category">Featured</Link>
            <Link to="/user-account">My account</Link>
          </nav>
          <div className="mm-utility-right">
            <Link to="/customer-login">Sign in</Link>
            <span className="mm-utility-separator">·</span>
            <span>Kenya</span>
            <span className="mm-utility-separator">·</span>
            <span>KES</span>
          </div>
        </div>
      </div>

      <div className="mm-main-header">
        <div className="mm-container mm-main-header-inner">
          <button type="button" className="mm-mobile-menu-trigger desktop-hide" aria-label="Open menu" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)}>
            <span aria-hidden="true">☰</span>
          </button>

          <div className="mm-brand">
            <Link to="/" aria-label="Maa Mara Market home">
              <img src={Maamara} alt="" className="mm-brand-logo" />
              <span className="font-[Poppins] text-[1.75rem] font-extrabold tracking-[-0.02em] text-[#222] whitespace-nowrap">
                Maa <strong className="font-extrabold text-[#222]">Mara</strong> <span className="font-medium text-[#6f6a63]">Market</span>
              </span>
            </Link>
          </div>

          <div className="mm-header-search">
            <SearchBar />
          </div>

          <div className="mm-header-actions">
            <NavIcons />
          </div>
        </div>
      </div>

      <div className="mm-desktop-nav">
        <div className="mm-container mm-desktop-nav-inner">
          <nav className="mm-primary-links" aria-label="Main navigation">
            <Link to="/">Home</Link>
            <Link to="/list">Shop</Link>
            <Link to="/blogs">Journal</Link>
            <Link to="/organic">Organic</Link>
          </nav>
        </div>
      </div>

      <div className="mm-category-row">
        <CategoryNavigation />
      </div>
      <MobileNavigationDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </header>
  );
};

export default Header;
