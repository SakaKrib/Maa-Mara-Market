import { useEffect, useState } from 'react';
import api from '../../../Services/Api';
import { jwtDecode } from 'jwt-decode';

export const useAuthentication = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');

      if (token) {
        try {
          const decoded = jwtDecode(token);
          const tokenExpiration = decoded.exp;
          const now = Date.now() / 1000;

          if (tokenExpiration < now) {
            // Token expired — try to refresh
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              try {
                const response = await api.post('/api/token/refresh/', {
                  refresh: refreshToken
                });
                localStorage.setItem('accessToken', response.data.access);
                setIsAuthorized(true);
              } catch (err) {
                console.error('Token refresh failed:', err);
                setIsAuthorized(false);
              }
            } else {
              setIsAuthorized(false);
            }
          } else {
            // Token is valid
            setIsAuthorized(true);
          }
        } catch (err) {
          console.error('Token decode failed:', err);
          setIsAuthorized(false);
        }
      } else {
        setIsAuthorized(false);
      }
    };

    checkAuth();
  }, []);

  return isAuthorized;
};
