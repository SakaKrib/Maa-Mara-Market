import "../../../index.css";
import React from "react";
import { IonIcon } from '@ionic/react';
import {
  personOutline,
  statsChartOutline,
  addCircleOutline,
  bagCheckOutline,
  peopleOutline,
  chatbubbleEllipsesOutline,
  listCircleOutline,
  pencilOutline,
  moon,
  readerOutline,
  settingsOutline,
  logOutOutline,
  closeOutline,
  sunnyOutline,
  calendar,
  arrowForwardCircleOutline,
  chevronDownOutline
} from "ionicons/icons";
import useDashboardInteractions from "../../../interaction";
import { useTheme, Box } from "@mui/material";
import { tokens } from "../../../theme";
import "../../../index.css"
import { Link } from "react-router-dom";
import { useAuth } from "../../Auth/AuthContext/Context";
import { useVendorOrdersCombined } from "../../Hooks/Order/CombinedOrderHook";


const VendorDashboardNav = () => {
  useDashboardInteractions();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { pending } = useVendorOrdersCombined();
  const {user} = useAuth();

  const UserName = user.username


  // settings ref det

  return (
    <Box className="nav-container">
      <Box className="navigate-bar nav" sx={{
        backgroundColor: colors.primary[600]
      }} style={{'--primary-theme': colors.gray[100], '--green-col': colors.greenAccent[500], '--lihover-col': colors.gray[900]}}>

      <Box className="icon-large close">
          <IonIcon icon={closeOutline} />
        </Box>

        <ul>
          <li>
            
              <span className="icon">
                <IonIcon icon={personOutline}/>
              </span>
              <span className="flex relative -mt-4 p-2" style={{color:colors.goldAccent[400]}}>
                Welcome <strong className="absolute top-6  justify-center" style={{color:colors.purpleAccent[500]}}>{UserName}</strong>
              </span>
            
          </li>

          <li>
               <Link to='/vendors-dashboard'>
              <span className="icon">
                <IonIcon icon={statsChartOutline}/>
              </span>
              <span className="title">Dashboard</span>
              </Link> 
          </li>

          <li>
                <Link to="vendor-profile">
              <span className="icon">
                <IonIcon icon={personOutline}/>
              </span>
              <span className="title">Profile</span>
            </Link>
          </li>

          <li>
                <Link to={'add-item/'}>
              <span className="icon">
                <IonIcon icon={addCircleOutline}/>
              </span>
              <span className="title">Add Products</span>
            </Link>
          </li>

          <li>
                <Link to='item-onsite/'>
              <span className="icon">
                <IonIcon icon={bagCheckOutline}/>
              </span>
              <span className="title">Items OnSite</span>
              </Link>
          </li>

          <li>
                <Link to='customers'>
              <span className="icon">
                <IonIcon icon={peopleOutline}/>
              </span>
              <span className="title">Customers</span>
              </Link>
          </li>

            
              <li className="fly">
              
                    <Link to="orders">
                  <span className="icon">
                    <IonIcon icon={readerOutline}/>
                    <span className="fly-item" style={{backgroundColor:colors.primary[900]}}>{pending.length}</span>
                  </span>
                  <span className="title">Orders</span>
                    </Link>
                    
              </li> 
          

          <li>
                <Link>
              <span className="icon">
                <IonIcon icon={chatbubbleEllipsesOutline}/>
              </span>
              <span className="title">Chat</span>
              </Link>
          </li>

          {/* Settings Section */}
          <li className="has-child">
            <a href="#" className='config'>
              <span className="icon"><IonIcon icon={settingsOutline} /></span>
              <span className="title">Settings</span>
            </a>
            <Box className="settings" sx={{
              backgroundColor: colors.primary[100]
            }} style={{'--primary-theme': colors.gray[100], '--green-col': colors.greenAccent[500], '--lihover-col': colors.gray[900],
              '--bg-color': colors.primary[400],
              '--h2-text-col': colors.blueAccent[100]
            }}>
              <ul>
            
                <h2>General Settings</h2>
  
                  <li><a href="#">Manage Accounts</a></li>
                  <li><a href="#">Timezone & Locale</a></li>
                  <li><a href="#">Contact Info</a></li>
                  <li><a href="#">Save Credentials</a></li>

                <h2>User Management</h2>

                  <li><a href="#">Roles & Permissions</a></li>
                  <li><a href="#">Change Passwords</a></li>
                  <li><a href="#">Secure Login Sessions</a></li>
                  <li><a href="#">Report an Issue</a></li>

                <h2>Appearance and Theme</h2>

                  <li className="has-child theme-li text-gray-100 text-sm">
                    <span className='theme'>Theme Selector <IonIcon className="icon-small" icon={chevronDownOutline} /></span>
                    <ul className="content theme-content" style={{'--primary-theme': colors.gray[100], '--green-col': colors.greenAccent[500], '--lihover-col': colors.gray[900],
                      '--bg-color': colors.primary[400]
                    }}>
                      <li className="light list"><a href="#"><IonIcon icon={sunnyOutline} />Light Mode</a></li>
                      <li className="dark"><a href="#"><IonIcon icon={moon} />Night Mode</a></li>
                    </ul>
                  </li>

                
              </ul>
            </Box>
          </li>

          <li>
                <Link to='vendor-payouts/payout-report'>
              <span className="icon">
                <IonIcon icon={listCircleOutline}/>
              </span>
              <span className="title">Payout Report</span>
              </Link>
          </li>

          <li>
                <Link to='sales/report'>
              <span className="icon">
                <IonIcon icon={readerOutline}/>
              </span>
              <span className="title">Sales reports</span>
                </Link>
          </li>

          <li>
                <Link to="transactions/">
              <span className="icon">
                <IonIcon icon={arrowForwardCircleOutline}/>
              </span>
              <span className="title">Transaction</span>
                </Link>
          </li>

          <li>
                <Link to="vendor-calender">
              <span className="icon">
                <IonIcon icon={calendar}/>
              </span>
              <span className="title">Calender</span>
                </Link>
          </li>

          

          <li>
                <Link to="review-page">
              <span className="icon">
                <IonIcon icon={pencilOutline}/>
              </span>
              <span className="title">Reviews</span>
                </Link>
          </li>

          

          <li>
                <Link>
              <span className="icon">
                <IonIcon icon={logOutOutline}/>
              </span>
              <span className="title">Log Out</span>
                </Link>
          </li>
        </ul>
      </Box>
    </Box>
  );
};

export default VendorDashboardNav;
