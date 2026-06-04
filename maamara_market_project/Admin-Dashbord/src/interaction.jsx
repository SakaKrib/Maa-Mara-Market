// src/hooks/useDashboardInteractions.js
import { useEffect, useContext } from 'react';
import { ColourModeContext } from './theme';// adjust path if needed

const useDashboardInteractions = () => {
  const colorMode = useContext(ColourModeContext);

  useEffect(() => {
    const navigationLinks = document.querySelectorAll('.navigate-bar li');
    const main = document.querySelector('.main-dashboard');
    const toggleB = document.querySelector('.toggle');
    const ShowUserName = document.querySelector('.user-name');
    const navigation = document.querySelector('.navigate-bar');
    const wrapNav = document.querySelector('.nav-container');
    const headerTop = document.querySelector('.header-top');
    const closeBtn = document.querySelector('.close');
    const searchInput = document.querySelector('form.search input');
    const searchBtn = document.querySelector('.press');
    const searchIcon = document.querySelector('.search-icon');
    const themeBtn = document.querySelector('.dark');
    const lightBtn = document.querySelector('.light');
    const settings =  document.querySelector('.config');
    console.log(settings)
    const toolkit = document.querySelector('.settings');
    // hovermenu stick
    const HoverMenu = document.querySelector('.has-child');

    // Highlight active navigation link
    function activeLink() {
      navigationLinks.forEach((item) => item.classList.remove('hovered'));
      this.classList.add('hovered');
    }

    navigationLinks.forEach((item) =>
      item.addEventListener('mouseover', activeLink)
    );

    // Toggle sidebar
    if (toggleB) {
      toggleB.onclick = () => {
        navigation?.classList.toggle('active');
        main?.classList.toggle('active');
        wrapNav?.classList.remove('active');
        headerTop?.classList.toggle('active');
        settings?.classList.toggle('active');
        toolkit?.classList.toggle('active');
        ShowUserName?.classList.toggle('active');

      };
    }

      //use settings
      {
        if (settings) {
          settings.onclick = () => {
            navigation?.classList.toggle('active');
            main?.classList.toggle('active');
            wrapNav?.classList.remove('active');
            headerTop?.classList.toggle('active');
            toolkit?.classList.toggle('active');
            ShowUserName?.classList.toggle('active');

          };
      }
    }

    //use settins btn
  //   {
  //     if (settings) {
  //       settings.addEventListener('click', () => {
  //         navigation?.classList.remove('active');
  //         wrapNav?.classList.remove('active');
  //         main?.classList.remove('active');
  //         headerTop?.classList.remove('active');
  //         settings?.classList.remove('active');
  //         toolkit?.classList.remove('active');
  //       });
  //   }
  // }
      
    

    // Close sidebar
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        navigation?.classList.remove('active');
        wrapNav?.classList.remove('active');
        main?.classList.remove('active');
        headerTop?.classList.remove('active');
        settings?.classList.remove('active');
        ShowUserName?.classList.remove('active');
        toolkit?.classList.toggle('active');

      });
    }

    // Search toggle
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        searchInput?.classList.toggle('active');
        searchIcon?.classList.toggle('active');
        searchBtn.classList.toggle('active');
      });
    }

    

    // Dark theme toggle
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        document.body.classList.add('dark-theme');
        themeBtn.classList.add('active');
        lightBtn?.classList.remove('active');
        document.querySelectorAll('.iconBox').forEach((icon) => icon.classList.add('active'));

        colorMode?.toggleColorMode(); // React state update
        window.dispatchEvent(new Event('theme-change')); // Notify React hook
      });
    }

    // Light theme toggle
    if (lightBtn) {
      lightBtn.addEventListener('click', () => {
        document.body.classList.remove('dark-theme');
        lightBtn.classList.add('active');
        themeBtn?.classList.remove('active');
        document.querySelectorAll('.iconBox').forEach((icon) => icon.classList.remove('active'));

        colorMode?.toggleColorMode(); // React state update
        window.dispatchEvent(new Event('theme-change')); // Notify React hook
      });
    }

    // Apply saved theme on load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
      themeBtn?.classList.add('active');
      document.querySelectorAll('.iconBox').forEach((icon) => icon.classList.add('active'));
    } else {
      document.body.classList.remove('dark-theme');
      lightBtn?.classList.add('active');
      document.querySelectorAll('.iconBox').forEach((icon) => icon.classList.remove('active'));
    }


    

    // Cleanup
    return () => {
      navigationLinks.forEach((item) =>
        item.removeEventListener('mouseover', activeLink)
      );
    };
  }, []);
};

export default useDashboardInteractions;
