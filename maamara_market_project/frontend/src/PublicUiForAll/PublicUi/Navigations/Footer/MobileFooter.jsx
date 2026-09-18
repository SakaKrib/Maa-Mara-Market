import React from 'react';
import { 
  RiBarChartLine, 
  RiUser6Line, 
  RiHeartLine, 
  RiSearchLine, 
  RiShoppingCartLine 
} from 'react-icons/ri';

const MobileMenu = ({ cartCount = 0, onCartClick }) => {
  return (
    <div className="menu-button desktop-hide">
      <div className="container">
        <div className="wrapper">
          <ul className="flex justify-between mt-5">
            <li>
              <a href="#">
                <RiBarChartLine size={20} />
                <span>Trending</span>
              </a>
            </li>

            <li>
              <a href="#" className="t-search">
                <RiUser6Line size={20} />
                <span>Account</span>
              </a>
            </li>

            <li>
              <a href="#">
                <RiHeartLine size={20} />
                <span>Wishlist</span>
              </a>
            </li>

            <li>
              <a href="#">
                <RiSearchLine size={20} />
                <span>Search</span>
              </a>
            </li>

            <li>
              <button 
                type="button" 
                className="cart-trigger" 
                onClick={onCartClick}
              >
                <RiShoppingCartLine size={20} />
                <span>Cart</span>
                <div className="absolute bg-purple-900 top-3 w-6 right-1 rounded-full text-sm text-gray-100 font-semibold">
                  <div className="item-number relative">{cartCount}</div>
                </div>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;

