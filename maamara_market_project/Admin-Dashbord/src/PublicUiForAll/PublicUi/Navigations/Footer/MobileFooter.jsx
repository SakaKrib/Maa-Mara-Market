import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, UserRound, Heart, Search, ShoppingCart } from "lucide-react";
import MobileCartModal from "./MobileModals/MobileCartMadals";
import MobileWishlistModal from "./MobileModals/MobileWishList";
import MobileAccountModal from "./MobileModals/MobileAccountModal";
import MobileSearchModal from "../Search/MobileSearchBar";
import { useCartContext } from "../../Customer/DesktopView/Main/CartHook/cart";
import { useWishlistContext } from "../../../../cmponents/Hooks/WishListHook/Wishlist";

const MobileMenu = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [activeSheet, setActiveSheet] = useState(null);
  const { order } = useCartContext();
  const { wishlist = [] } = useWishlistContext();

  const cartCount = Number(order?.order?.total_qty || order?.items?.length || 0);
  const wishlistCount = wishlist.length;
  const open = (name) => setActiveSheet(name);
  const close = () => setActiveSheet(null);

  const items = useMemo(() => [
    { key: "trending", label: "Trending", Icon: TrendingUp, action: () => navigate("/") },
    { key: "account", label: "Account", Icon: UserRound, action: () => open("account") },
    { key: "wishlist", label: "Wishlist", Icon: Heart, badge: wishlistCount, action: () => open("wishlist") },
    { key: "search", label: "Search", Icon: Search, action: () => open("search") },
    { key: "cart", label: "Cart", Icon: ShoppingCart, badge: cartCount, action: () => open("cart") },
  ], [cartCount, wishlistCount]);

  return (
    <>
      <nav className="mm-mobile-bottom-nav" aria-label="Mobile storefront navigation">
        {items.map(({ key, label, Icon, badge, action }) => (
          <button key={key} type="button" className={`mm-mobile-bottom-item ${activeSheet === key ? "is-active" : ""}`} onClick={action}>
            <span className="mm-mobile-bottom-icon">
              <Icon size={20} strokeWidth={1.8} />
              {badge > 0 && <span className="mm-mobile-bottom-badge">{badge}</span>}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="mm-mobile-bottom-spacer" aria-hidden="true" />
      <MobileCartModal open={activeSheet === "cart"} onClose={close} />
      <MobileWishlistModal open={activeSheet === "wishlist"} onClose={close} />
      <MobileAccountModal open={activeSheet === "account"} onClose={close} user={user} onLogout={onLogout} />
      <MobileSearchModal open={activeSheet === "search"} onClose={close} />
    </>
  );
};

export default MobileMenu;