import { useState, useEffect, useRef } from "react";
import { IonIcon } from "@ionic/react";
import { cartOutline, heartOutline, notificationsOutline } from "ionicons/icons";
import { Link, useNavigate } from "react-router-dom";
import profileImage from "../../../../../../src/assets/profile/default-sender.jpg";
import "../../../../../index.css";
import CartModal from "../../CartModal/CartModal";
import { useCartContext } from "../../../Customer/DesktopView/Main/CartHook/cart";
import { useWishlistContext } from "../../../../../cmponents/Hooks/WishListHook/Wishlist";
import WishlistModal from "../../WishlistModal/WishlistModal";
import { useAuth } from "../../../../../cmponents/Auth/AuthContext/Context";
import api from '../../../../../Services/Api'

const NavIcons = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const { order } = useCartContext();
  const { wishlist } = useWishlistContext();
  const { user, logout, isAuthenticated } = useAuth();

  const navigate = useNavigate();
   useEffect(() => {
    let active = true;
    api.get("/api/user-visitor-notifications/", { withCredentials: true })
      .then(({ data }) => {
        if (active) setUnreadNotifications(Number(data?.unread_count || 0));
      })
      .catch(() => {
        if (active) setUnreadNotifications(0);
      });
    return () => { active = false; };
  }, [isAuthenticated]);

  // 🔗 Refs for detecting outside clicks
  const profileRef = useRef(null);
   
    const wishlistRef = useRef(null);
    const cartRef = useRef(null);

  // ✅ Close all dropdowns/modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideProfile =
        profileRef.current && !profileRef.current.contains(event.target);
      const clickedOutsideWishlist =
        wishlistRef.current && !wishlistRef.current.contains(event.target);
      const clickedOutsideCart =
        cartRef.current && !cartRef.current.contains(event.target);

      if (clickedOutsideProfile) setIsProfileOpen(false);
      if (clickedOutsideWishlist) setIsWishlistOpen(false);
      if (clickedOutsideCart) setIsCartOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setIsProfileOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      // 1. Call backend logout endpoint (clears JWT cookies + blacklists refresh token)
      await api.post(
        "/api/logout/",
        {},
        {
          withCredentials: true,
        }
      );
  
      // 2. Clear frontend auth state
      logout(); // from AuthContext
  
      // 3. Close dropdown
      setIsProfileOpen(false);
  
      // 4. Clear UI storage (if you use any)
      localStorage.clear();
      sessionStorage.clear();
  
      // 5. Force clean navigation
      navigate("/customer-login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
  
      // Fallback: still log user out locally
      logout();
      setIsProfileOpen(false);
      localStorage.clear();
      sessionStorage.clear();
  
      navigate("/customer-login", { replace: true });
    }
  };

  return (
    <ul className="flex items-center gap-4 ml-auto relative z-40">
      {/* --- Profile --- */}
      <li ref={profileRef} className="relative">
        <div
          className="flex items-center text-sm cursor-pointer"
          onClick={handleProfileClick}
        >
          {isAuthenticated && <p className="mr-2 font-medium">{user?.username}</p>}
          <div className="relative ring-1 ring-black p-1 rounded-full">
            <img
              src={user?.profile_picture || profileImage}
              alt="Profile"
              width={22}
              height={22}
              className="rounded-full object-cover -mt-2 "
            />
          </div>
        </div>

        {/* --- Dropdown --- */}
        {isProfileOpen && (
          <div className="absolute p-4 rounded-md top-7 left-0 text-sm shadow-[0_3px_10px_rgb(0,0,0,0.2)] bg-white z-50 flex flex-col gap-2 min-w-[150px]">
            {isAuthenticated ? (
              <>
                <Link to="profile" onClick={() => setIsProfileOpen(false)}>
                  Profile
                </Link>
                <Link to="user-account" onClick={() => setIsProfileOpen(false)}>
                  Account
                </Link>
                <div
                  className="cursor-pointer text-red-500 hover:underline"
                  onClick={handleLogout}
                >
                  Logout
                </div>
              </>
            ) : (
              <>
                <Link to="customer-login" onClick={() => setIsProfileOpen(false)}>
                  Login
                </Link>
                <Link to="profile" onClick={() => setIsProfileOpen(false)}>
                  Profile
                </Link>
              </>
            )}
          </div>
        )}
      </li>

      {/* --- Notifications --- */}
      <li className="relative hidden md:block">
        <button
          type="button"
          className="flex items-center"
          onClick={() => navigate("/profile")}
          aria-label={unreadNotifications ? (unreadNotifications + " unread notifications") : "Notifications"}
        >
          <div className="relative text-xl">
            <IonIcon icon={notificationsOutline} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}
          </div>
        </button>
      </li>

      {/* --- Wishlist --- */}
      <li ref={wishlistRef} className="relative hidden md:block">
        <button
          type="button"
          className="flex items-center"
          onClick={() => setIsWishlistOpen((prev) => !prev)}
        >
          <div className="relative text-xl">
            <IonIcon icon={heartOutline} />
            {wishlist?.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-black text-white text-xs px-1 rounded-full">
                {wishlist.length}
              </span>
            )}
          </div>
        </button>
        {isWishlistOpen && <WishlistModal />}
      </li>

      {/* --- Cart --- */}
      <li ref={cartRef} className="relative">
        <button
          type="button"
          className="flex items-center"
          onClick={() => setIsCartOpen((prev) => !prev)}
        >
          <div className="relative text-xl">
            <IonIcon icon={cartOutline} />
            {order?.order?.total_qty > 0 && (
              <span className="absolute -top-2 -right-2 bg-black text-white text-xs px-1 rounded-full">
                {order.order.total_qty}
              </span>
            )}
          </div>

          <div className="ml-2 text-left">
            <div className="mini-text text-gray-500 text-xs">Total</div>
            <div className="cart-total font-semibold">
              KES {order?.order?.final_total?.toLocaleString() || "0.00"}
            </div>
          </div>
        </button>

        {isCartOpen && <CartModal />}
      </li>
    </ul>
  );
};

export default NavIcons;