// src/hooks/useMobileMenu.js
import { useEffect, useState } from 'react';

const useMobileMenu = () => {
  const [cartVisible, setCartVisible] = useState(false);

  useEffect(() => {
    // -----------------------
    // Copy menu content
    // -----------------------
    const dptCategory = document.querySelector('.dpt-cat');
    const dptPlace = document.querySelector('.departments');
    if (dptCategory && dptPlace) dptPlace.innerHTML = dptCategory.innerHTML;

    console.log(dptCategory)

    const mainNav = document.querySelector('.header-nav nav');
    const navPlace = document.querySelector('.off-canvas nav');
    if (mainNav && navPlace) navPlace.innerHTML = mainNav.innerHTML;

    const topNav = document.querySelector('.header-top-1 .wrapper');
    const topPlace = document.querySelector('.off-canvas .thetop-nav');
    if (topNav && topPlace) topPlace.innerHTML = topNav.innerHTML;

    // -----------------------
    // Menu toggle
    // -----------------------
    const menuButton = document.querySelector('.trigger');
    const closeButton = document.querySelector('.t-close');
    const site = document.querySelector('.site');

    const toggleMenu = () => site?.classList.toggle('showmenu');
    const closeMenu = () => site?.classList.remove('showmenu');

    menuButton?.addEventListener('click', toggleMenu);
    closeButton?.addEventListener('click', closeMenu);

    // -----------------------
    // Submenu toggle
    // -----------------------
    const subMenus = document.querySelectorAll('.has-child');
    const toggleSubMenu = (e) => {
      e.preventDefault();
      subMenus.forEach((item) => {
        if (item !== e.currentTarget) item.classList.remove('expand');
      });
      e.currentTarget.classList.toggle('expand');
    };
    subMenus.forEach((menu) => menu.addEventListener('click', toggleSubMenu));

    // -----------------------
    // Department menu toggle
    // -----------------------
    const dptTrigger = document.querySelector('.dpt-cat .dtp-trigger');
    const toggleDpt = () => site?.classList.toggle('showdtp');
    dptTrigger?.addEventListener('click', toggleDpt);

    // -----------------------
    // Mini-cart toggle
    // -----------------------
    const cartTrigger = document.querySelector('.cart-trigger');
    const miniCart = document.querySelector('.mini-cart');

    const handleCartToggle = () => {
      setTimeout(() => {
        setCartVisible((prev) => !prev);
      }, 250);
    };
    cartTrigger?.addEventListener('click', handleCartToggle);

    const handleClickOutside = (e) => {
      if (!e.target.closest('.mini-cart') && cartVisible) {
        setCartVisible(false);
      }
    };
    document.addEventListener('click', handleClickOutside);

    // -----------------------
    // Modal toggle
    // -----------------------
    const modalClose = document.querySelector('.modalclose');
    const showModal = () => site?.classList.add('showmodal');
    const hideModal = () => site?.classList.remove('showmodal');
    window.addEventListener('load', showModal);
    modalClose?.addEventListener('click', hideModal);

    // -----------------------
    // Search toggle
    // -----------------------
    const searchBtn = document.querySelector('.search');
    const searchClose = document.querySelector('.search-close');

    const toggleSearch = () => site?.classList.toggle('showsearch');
    const closeSearch = () => site?.classList.remove('showsearch');

    searchBtn?.addEventListener('click', toggleSearch);
    searchClose?.addEventListener('click', closeSearch);

    // Cleanup event listeners
    return () => {
      menuButton?.removeEventListener('click', toggleMenu);
      closeButton?.removeEventListener('click', closeMenu);
      subMenus.forEach((menu) => menu.removeEventListener('click', toggleSubMenu));
      dptTrigger?.removeEventListener('click', toggleDpt);
      cartTrigger?.removeEventListener('click', handleCartToggle);
      document.removeEventListener('click', handleClickOutside);
      modalClose?.removeEventListener('click', hideModal);
      window.removeEventListener('load', showModal);
      searchBtn?.removeEventListener('click', toggleSearch);
      searchClose?.removeEventListener('click', closeSearch);
    };
  }, [cartVisible]);
};

export default useMobileMenu;
