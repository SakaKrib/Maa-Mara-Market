import React, { useEffect, useState } from "react";
import { Heart, MapPin, ShoppingBag, UserRound, Menu, Search, Sparkles } from "lucide-react";
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
            <Menu size={21} strokeWidth={1.8} aria-hidden="true" />
          </button>

           <div className="w-full flex flex-row items-center gap-3 ">
            <img
            src={Maamara}
            alt="maamara-logo"
            className="w-[50px] h-[50px] rounded-full ring p-1 ring-1 ring-green-500 xxs:-mt-20 xxs:relative xxs:-top-10 lg:mt-0 lg:top-0 z-[10]"
          />

          <div className="mm-brand xxs:-mt-20 xxs:relative xxs:-top-10 lg:mt-0 lg:top-0">
            <Link to="/" className="font-[Poppins] text-[1.35rem] font-medium tracking-[-0.02em] text-[#222] no-underline whitespace-nowrap">
              Maa <strong className="font-extrabold">Mara</strong> <span className="font-medium text-[#6f6a63]">Market</span>
            </Link>
          </div>
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
            <Link to="/" className="flex items-center gap-1.5"><Search size={15} />Home</Link>
            <Link to="/list" className="flex items-center gap-1.5"><ShoppingBag size={15} />Shop</Link>
            <Link to="/blogs" className="flex items-center gap-1.5"><Heart size={15} />Journal</Link>
            <Link to="/organic" className="flex items-center gap-1.5"><Sparkles size={15} />Organic</Link>
            <Link to="/user-account" className="flex items-center gap-1.5"><UserRound size={15} />Account</Link>
            <span className="flex items-center gap-1.5 text-[#6f6a63]"><MapPin size={15} />Kenya</span>
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
