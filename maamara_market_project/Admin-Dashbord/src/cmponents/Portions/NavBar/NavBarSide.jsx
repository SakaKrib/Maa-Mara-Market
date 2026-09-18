import React, { useEffect } from 'react';
import { IonIcon } from '@ionic/react';
import { useContext } from "react";
import { ColourModeContext } from '../../../theme';
import {
  closeOutline,
  homeOutline,
  keyOutline,
  peopleOutline,
  chatboxOutline,
  helpOutline,
  settingsOutline,
  sunnyOutline,
  moon,
  tabletPortraitSharp,
  tabletLandscapeSharp,
  logOutOutline,
  mailSharp,
  refreshCircleSharp,
  statsChartOutline,
  chevronDownOutline,
  calendarOutline,
  clipboardOutline
} from 'ionicons/icons';
import "../../../index.css"
import useDashboardInteractions from '../../../interaction';
import { Box, useTheme } from '@mui/material';
import { tokens } from '../../../theme';
import { Link } from 'react-router-dom';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useAuth } from '../../Auth/AuthContext/Context';
import { color } from 'framer-motion';



const NavBar = () => {
  const {logout} = useAuth();
  useDashboardInteractions();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode)
  const colorMode = useContext(ColourModeContext);


 

  useEffect(() => {
    const themeColapse = document.querySelector('.theme');
    const colapseThemeContent = document.querySelector('.theme-content');
    const layout = document.querySelector('.layout');
    const colapseLayoutContent = document.querySelector('.layout-content');
  
    if (!themeColapse || !colapseThemeContent) return;
    if (!layout || !colapseLayoutContent) return;
  
    const handleClick = () => {
      const isActive = themeColapse.classList.contains('active');
  
      if (isActive) {
        themeColapse.classList.remove('active');
        colapseThemeContent.classList.remove('active');
      } else {
        themeColapse.classList.add('active');
        colapseThemeContent.classList.add('active');
      }
    };
  
    const handleshift = () => {
      const isActive = layout.classList.contains('active');
  
      if (isActive) {
        layout.classList.remove('active');
        colapseLayoutContent.classList.remove('active');
      } else {
        layout.classList.add('active');
        colapseLayoutContent.classList.add('active');
      }
    };
  
    themeColapse.addEventListener('click', handleClick);
    layout.addEventListener('click', handleshift);
  
    return () => {
      themeColapse.removeEventListener('click', handleClick);
      layout.removeEventListener('click', handleshift);
    };
  }, []);
  



  
  return (
    <Box className="nav-container">
      <Box className="navigate-bar nav" sx={{
        backgroundColor: colors.primary[600]
      }} style={{'--primary-theme': colors.gray[100], '--green-col': colors.greenAccent[500], '--lihover-col': colors.gray[900]}}>
        <Box className="icon-large close">
          <IonIcon icon={closeOutline} />
        </Box>
        <ul>
          <li className=''>
            <Link to="/admin-dashboard">
              <span className='flex'>
                <span className="icon"><IonIcon icon={homeOutline} /></span>
                <span className="title">Admin Dashboard</span>
              </span>
            </Link>
          </li>
          <li>
            <Link to="Accounts/">
              <span className='flex'>
                <span className="icon"><IonIcon icon={keyOutline} /></span>
                <span className="title">Accounts</span>
              </span>
            </Link>
          </li>
          <li>
            <Link to="vendors">
              <span className='flex'>
                <span className="icon"><IonIcon icon={peopleOutline} /></span>
                <span className="title">Vendors</span>
              </span>
            </Link>
          </li>
          <li>
            <Link to="vendor-payout">
              <span className='flex'>
                <span className="icon"><AttachMoneyIcon/></span>
                <span className="title">Payouts</span>
              </span>
            </Link>
          </li>
          <li>
            <Link to="join-chat">
              <span className='flex'>
                <span className="icon"><IonIcon icon={chatboxOutline} /></span>
                <span className="title">Message</span>
              </span>
            </Link>
          </li>
          <li>
            <Link to="faq">
              <span className='flex'>
                <span className="icon"><IonIcon icon={helpOutline} /></span>
                <span className="title">Help &  FAQ</span>
              </span>
            </Link>
          </li>

          {/* Settings Section */}
          <li className="has-child">
             <span className="config flex">
                <span className="icon">
                  <IonIcon icon={settingsOutline} />
                </span>
                <span className="title">Settings</span>
            </span>
            <Box className="settings" sx={{
              backgroundColor: colors.primary[100]
            }} style={{'--primary-theme': colors.gray[100], '--green-col': colors.greenAccent[500], '--lihover-col': colors.gray[900],
              '--bg-color': colors.primary[400],
              '--h2-text-col': colors.blueAccent[100]
            }}>
              <ul>
            
                <h2>General Settings</h2>
  
                  <li><span>Manage Accounts</span></li>
                  <li><span>Timezone & Locale</span></li>
                  <li><span>Contact Info</span></li>
                  <li><span>Save Credentials</span></li>

                <h2>User Management</h2>

                  <li><span>Roles & Permissions</span></li>
                  <li><span>Change Passwords</span></li>
                  <li><span>Secure Login Sessions</span></li>
                  <li><span>Report an Issue</span></li>

                <h2>Appearance and Theme</h2>

                  <li className="has-child theme-li" style={{color:colors.gray[100]}}>
                    <span className='theme text-sm'>Theme Selector <IonIcon className="icon-small" icon={chevronDownOutline} /></span>
                    <ul className="content theme-content" style={{'--primary-theme': colors.gray[100], '--green-col': colors.greenAccent[500], '--lihover-col': colors.gray[900],
                      '--bg-color': colors.primary[400]
                    }}>
                     <li className="light list">
                      <span onClick={(e) => {
                        e.preventDefault();
                        colorMode.setLightMode();
                      }}>
                        <IonIcon icon={sunnyOutline} /> Light Mode
                      </span>
                    </li>

                    <li className="dark">
                      <span onClick={(e) => {
                        e.preventDefault();
                        colorMode.setDarkMode();
                      }}>
                        <IonIcon icon={moon} /> Night Mode
                      </span>
                    </li>
                      </ul>
                  </li>

                  <li className="has-child layout-li" style={{color:colors.gray[100]}}>
                    <span className='layout text-sm'>Screen Layout <IonIcon className="icon-small" icon={chevronDownOutline} /></span>
                    <ul className="content layout-content" style={{'--primary-theme': colors.gray[100], '--green-col': colors.greenAccent[500], '--lihover-col': colors.gray[900], '--bg-color': colors.primary[400]}}>
                      <li className="rich"><span><IonIcon icon={tabletPortraitSharp} />Landscape Mode</span></li>
                      <li><span><IonIcon icon={tabletLandscapeSharp} />Portrait Mode</span></li>
                    </ul>
                  </li>

                <h2>System Configurations</h2>
                  <li><span>Maintenance Mode <IonIcon className="icon-small" icon={chevronDownOutline} /></span></li>
                  <li><span>Database Backups <IonIcon className="icon-small" icon={chevronDownOutline} /></span></li>
              </ul>
            </Box>
          </li>

          <li>
            <span className='flex'>
              <span className="icon"><IonIcon icon={logOutOutline} onClick={logout} /></span>
              <span className="title">Sign-Out</span>
            </span>
          </li>

          <li>
            <Link to="calendar">
             <span className='flex'>
              <span className="icon"><IonIcon icon={calendarOutline} /></span>
              <span className="title">Calendar</span>
             </span>
            </Link>
          </li>

          {/* returns */}
          <li>
            <Link to="customer-requests">
              <span className='flex'>
                <span className="icon"><IonIcon icon={clipboardOutline} /></span>
                <span className="title">customer Requests</span>
              </span>
            </Link>
          </li>

          {/* Bottom Section */}
          <Box className="bottom">
           
            <li>
              <span className='flex'>
                <span className="icon">
                  <IonIcon icon={refreshCircleSharp} /><span className="fly-item">5</span>
                </span>
                <span className="title">Updates</span>
              </span>
            </li>
            <li>
              <span className='flex'>
                <span className="icon">
                  <IonIcon icon={mailSharp} /><span className="fly-item">0</span>
                </span>
                <span className="title">E-mails</span>
              </span>
            </li>
            {/* <li>
              <Link to="/item-update-post">
                <span className='flex'>
                  <span className="icon"><IonIcon icon={statsChartOutline} /></span>
                  <span className="title">Insights</span>
                </span>
              </Link>
            </li> */}
          </Box>
        </ul>
      </Box>
    </Box>
  );
};

export default NavBar;