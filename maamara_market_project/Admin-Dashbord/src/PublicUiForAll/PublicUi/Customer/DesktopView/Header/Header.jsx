import React, {useState, useEffect} from "react";
import "../../../../PublicUi/maamara.css"; // Optional: your styles here
import SearchBar from "../../../Navigations/Search/Search";
import NavIcons from "../../../Navigations/Search/NavIcons/NavIcon";
import { Link } from "react-router-dom";
import useMobileMenu from "../../../../../MobileInterractions";
import { useNavigate } from "react-router-dom";
import useNewBlogs from "../../../../../cmponents/Hooks/BlogHooksNew/NewBlogs";
import { useCategories } from "./SectionHook";
import MegaMenu from "./WomenCat";
import MegaMenuMen from "./MenCat";
import MegaMenuChildren from "./ChildrenCat";
import HoverCategoryMenu from "./SideNavBar";
import Maamara from "../../../../../assets/Logo/Maamara.jpg"



const HeaderTop = () => {

  useMobileMenu();

  const [isFixed, setIsFixed] = useState(false);
  const navigate = useNavigate()
  const { newBlogCount, loading } = useNewBlogs();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setIsFixed(true);
      } else {
        setIsFixed(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header>
    <div className="header-top-1 mobile-hide">
      <div className="container1">
        <div className="wrapper flexitem justify-between w-full">
          {/* Left Section */}
          <div className="left">
            <ul className="flexitem main links ">
            <Link to="/blogs">

              <li className="relative">
                Blog
                {!loading && newBlogCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-max h-4 text-xs flex items-center justify-center p-1">
                    {newBlogCount}
                  </span>
                )}
              </li>

            </Link>
              <li><a href="#">Featured</a></li>
              <li><a href="#">Wishlist</a></li>
            </ul>
          </div>

          {/* Right Section */}
          <div className="right">
            <ul className="flexitem main links">
              <Link to='customer-login'><li>Sign Up</li></Link>
              <li><a href="#">My Account</a></li>
              <li><a href="#">Order Tracking</a></li>

              {/* Currency Dropdown */}
              <li className="dropdown">
                <a href="#">
                  USD <span className="icon-small"><i className="ri-arrow-down-s-line"></i></span>
                </a>
                <ul className="dropdown-menu">
                  <li className="current"><a href="#">KES</a></li>
                  <li><a href="#">USD</a></li>
                  <li><a href="#">EURO</a></li>
                  <li><a href="#">GBP</a></li>
                </ul>
              </li>

              {/* Language Dropdown */}
              <li className="dropdown">
                <a href="#">
                  English <span className="icon-small"><i className="ri-arrow-down-s-line"></i></span>
                </a>
                <ul className="dropdown-menu">
                  <li className="current"><a href="#">English</a></li>
                  <li><a href="#">Kiswahili</a></li>
                  <li><a href="#">Germany</a></li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    {/* header nav */}
    <div className={`${
          isFixed ? "fixed -top-20 left-0 w-full shadow-md bg-white z-50" : ""
        }`}>
    <div className='header-nav'>
      <div className="container-">
        <div className="wrapper flexcol">
          <a href="#" className="trigger desktop-hide">
            <span className="icon-large"><i className="ri-menu-2-line"></i></span>
          </a>
          
          <div className="left bg-white-500 mb-10">
            <div className="container">
            <div className="flex items-center gap-2 w-full p-2">
              <img src={Maamara} alt="maamara-logo" className="w-[50px] h-[50px] rounded-full ring p-1 ring-1 ring-green-500 xxs:-mt-20 xxs:relative xxs:-top-10 lg:mt-0 lg:top-0 z-[1000]" />
            <div className="logo xxs:-mt-20 xxs:relative xxs:-top-10 lg:mt-0 lg:top-0 ">
              <a href="#"> Maa <span className="it-name">Mara</span> <span className="mkrt">Market</span></a>
            </div>
            {isFixed && (
              <div className="transition-all duration-300 w-full p-4">
                <SearchBar />
              </div>
            )}
            </div>

            <nav className="mobile-hide flex justify-between w-full">
              <ul className="flexitem second-links ">
                <li><a href="#">Home</a></li>
                <li><a href="#">Shop</a></li>
                <li className="Women has-child">
                  <a href="#">Women
                    <div className="icon-small"><i className="ri-arrow-down-s-line"></i></div>
                  </a>
                  {/* category hook */}
                  <MegaMenu/>

                </li>
                <li className="men has-child"><a href="#">Men</a>
                <MegaMenuMen/>

                </li>
                <li>
                  <a href="#">Sports
                    <div className="fly-item"><span className="bg-blue-500 p-1 rounded-full -ml-4">New!</span></div>
                  </a>
                </li>
                <li className="children has-child"><a href="#">Children</a>
                  <MegaMenuChildren/>
                </li>
                <li><a href="#">Unisex</a></li>
              </ul>
              <div className="-top-[60px] relative w-fit ml-auto -mt-5 ">
            <NavIcons/>
          </div>
            </nav>
            
            </div>
            
          </div>
          {/* <div className="right container  ">
            <NavIcons/>
          </div> */}
        </div>
      </div>
    </div>
    </div>

    {/* header top */}
    <div className="header-main mobile-hide">
      <div className="container">
        <div className="wrapper flexitem">
          <div className="left">
            <div className="dpt-cat has-child relative">
              <div className="dpt-head ">
                <div className="main-text">All Departments</div>
                <div className="mini-text mobile-hide">Total 1003 products</div>
                <a href="#" className="dpt-trigger mobile-hide">
                  <i className="ri-menu-3-line ri-xl"></i>
                </a>
              </div>
              {/* category dropdown */}
              <HoverCategoryMenu/>

            </div>
          </div>

          <div className="right">
            <div className="search-box">
              <SearchBar/>
            </div>
          </div>

        </div>
      </div>
    </div>
    </header>
  );
};

export default HeaderTop;
