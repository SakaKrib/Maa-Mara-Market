import React, { useEffect, useState } from "react";
import { Heart, ShoppingBag, UserRound, Menu, Search, Sparkles, ChevronDown, Globe2 } from "lucide-react";
import "../../../../PublicUi/maamara.css";
import SearchBar from "../../../Navigations/Search/Search";
import { Link } from "react-router-dom";
import useNewBlogs from "../../../../../cmponents/Hooks/BlogHooksNew/NewBlogs";
import Maamara from "../../../../../assets/Logo/Maamara.jpg";
import CategoryNavigation from "./CategoryNavigation";
import MegaMenuWomen from "./WomenCat";
import MegaMenuMen from "./MenCat";
import MegaMenuChildren from "./ChildrenCat";
import MegaMenuSports from "./SportsCat";
import MegaMenuUnisex from "./UnisexCat";
import MobileNavigationDrawer from "./MobileNavigationDrawer";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [isFixed, setIsFixed] = useState(false);
  const [currency, setCurrency] = useState(() => localStorage.getItem("mm_currency") || "KES");
  const [location, setLocation] = useState("Detecting location…");
  const [megaMenu, setMegaMenu] = useState(null);
  const { newBlogCount, loading } = useNewBlogs();

  const currencies = { KES: { label: "KES", flag: "🇰🇪" }, USD: { label: "USD", flag: "🇺🇸" }, EUR: { label: "EUR", flag: "🇪🇺" }, GBP: { label: "GBP", flag: "🇬🇧" } };
  useEffect(() => { localStorage.setItem("mm_currency", currency); }, [currency]);
  useEffect(() => { let active=true; fetch("https://ipapi.co/json/").then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(active&&d?.country_name)setLocation(d.country_name);}).catch(()=>{if(active)setLocation("Location unavailable");}); return ()=>{active=false;}; }, []);

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
            <span className="flex items-center gap-1"><Globe2 size={13} />{location}</span>
            <span className="mm-utility-separator">·</span>
            <label className="flex items-center gap-1 cursor-pointer" aria-label="Select currency"><span>{currencies[currency].flag}</span><select value={currency} onChange={e=>setCurrency(e.target.value)} className="bg-transparent border-0 outline-none cursor-pointer"><option value="KES">KES</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></label>
          </div>
        </div>
      </div>

      <div className="mm-main-header">
        <div className="mm-container mm-main-header-inner">
          <button type="button" className="mm-mobile-menu-trigger desktop-hide" aria-label="Open menu" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)}>
            <Menu size={21} strokeWidth={1.8} aria-hidden="true" />
          </button>

            <div className="w-full flex flex-row gap-4 items-center">
              <img
              src={Maamara}
              alt="maamara-logo"
              className="w-[50px] h-[50px] rounded-full ring p-1 ring-1 ring-green-500 xxs:-mt-20 xxs:relative xxs:-top-10 lg:mt-0 lg:top-0 z-[10]"
            />

            <div>
              <div className="logo xxs:-mt-20 xxs:relative xxs:-top-10 lg:mt-0 lg:top-0 ">
              <a href="/">
                Maa{" "}
                <span className="it-name">
                  Mara
                </span>{" "}
                <span className="mkrt">
                  Market
                </span>
              </a>
            </div>
               </div>

                    
          <div className="mm-header-search">
            <SearchBar />
          </div>
            </div>
        </div>
      </div>

      <div className="mm-desktop-nav">
        <div className="mm-container mm-desktop-nav-inner">
          <nav className="mm-primary-links" aria-label="Main navigation">
            <Link to="/" className="flex items-center gap-1.5"><Search size={15} />Home</Link>
            <Link to="/list" className="flex items-center gap-1.5"><ShoppingBag size={15} />Shop</Link>
            {[
              ["Women", MegaMenuWomen], ["Men", MegaMenuMen], ["Children", MegaMenuChildren],
              ["Sports", MegaMenuSports], ["Unisex", MegaMenuUnisex]
            ].map(([label, MenuComponent]) => (
              <div key={label} className="relative" onMouseEnter={()=>setMegaMenu(label)} onMouseLeave={()=>setMegaMenu(null)}>
                <button type="button" className="flex items-center gap-1.5 px-2 py-3 font-medium text-[#222] hover:text-[#6f6a63]">
                  {label}<ChevronDown size={13} />
                </button>
                {megaMenu === label && <div className="absolute left-0 top-full z-[100] pt-1" onMouseEnter={()=>setMegaMenu(label)}><MenuComponent /></div>}
              </div>
            ))}
            <Link to="/blogs" className="flex items-center gap-1.5"><Heart size={15} />Journal</Link>
            <Link to="/organic" className="flex items-center gap-1.5"><Sparkles size={15} />Organic</Link>
            <Link to="/user-account" className="flex items-center gap-1.5"><UserRound size={15} />Account</Link>
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
