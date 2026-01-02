import { IonIcon } from '@ionic/react';
import "../../../index.css";
import {
  menuOutline,
  searchOutline
} from 'ionicons/icons';
import useDashboardInteractions from '../../../interaction';
import { useAuth } from '../../Auth/AuthContext/Context';
import { useState, useEffect } from 'react';
import { useTheme, Box } from '@mui/material';
import { tokens } from '../../../theme';
import LogoutButton from '../../Auth/AdminLogin/Logout';
import { useCsrfToken } from '../../Hooks/AccessCRF/UseCSRFToken';
import { baseUrl } from '../../Constant/Constant';
import api from '../../../Services/Api';

const HeaderTop = () => {
  useDashboardInteractions();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const { isAuthenticated, loading, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const csrfToken = useCsrfToken();

 
  

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get(`${baseUrl}/api/profile/`, {
          headers: {
            'X-CSRFToken': csrfToken
          },
          withCredentials: true
        });

        const data = response.data;
        console.log('this is data', data);
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    if (isAuthenticated && !loading && csrfToken) {
      fetchProfile();
    }
  }, [isAuthenticated, loading, csrfToken]);

  return (
    <Box className="header-top" sx={{ backgroundColor: colors.primary[600], width:{
      md:"calc(100% - 80px)"
    } }}>
      <Box className="topbar sm:w-full">
        <Box className="toggle">
          <IonIcon icon={menuOutline} />
        </Box>

        <Box className="title-head" style={{ '--span-color': colors.gray[100] }}>
          <span className="header">
            Maa <strong>Mara</strong><span className="mkt">Market</span>
          </span>
        </Box>

        <Box style={{ '--placeholder-color': colors.gray[100] }}>
          <form className="search">
            <label htmlFor="search">
              <input
                type="text"
                placeholder="search here"
                id="search"
                style={{
                  backgroundColor: colors.primary[500],
                  color: colors.gray[100],
                  border: `1px solid ${colors.primary[500]}`,
                  padding: ' 0 30px'
                }}
              />
              <IonIcon className="search-icon" icon={searchOutline} style={{color:colors.gray[100]}}/>
            </label>
            <button className="primary-button mobile-hide" type="submit">search</button>
            <button className="desktop-hide none" type="submit">
              <span className="icon-large press">
                <IonIcon icon={searchOutline} />
              </span>
            </button>
          </form>
        </Box>

        <Box sx={{ mb: '1.5em' }}>
          <LogoutButton />
        </Box>

        <Box className="users">
        <img
          src={
            profile?.vendor_profile_picture
              ? `${baseUrl}${profile.vendor_profile_picture}` // use vendor profile pic if exists
              : profile?.profile_picture
              ? `${baseUrl}${profile.profile_picture}`        // fallback to normal profile pic
              : "/default-avatar.png"                         // final fallback
          }
          alt="User Profile"
          
        />


        </Box>
      </Box>
    </Box>
  );
};

export default HeaderTop;
