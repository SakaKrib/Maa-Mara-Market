import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Alert,
  useTheme
} from '@mui/material';
import { tokens } from '../../../theme';
import { useNavigate } from 'react-router-dom';
import LoginForm from './AdminLogin';

const LogoutButton = () => {
  const [csrfToken, setCsrfToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const baseUrl = "http://127.0.0.1:8000";
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // 🔐 Fetch CSRF token on mount
  useEffect(() => {
    fetch(`${baseUrl}/api/get-csrf-token/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setCsrfToken(data.csrfToken))
      .catch(err => console.error('CSRF fetch error:', err));
  }, []);

  // 🚪 Handle logout
  const handleLogout = async () => {
    setError('');
    setLoading(true);
  
    try {
      const response = await fetch(`${baseUrl}/api/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
  
      const contentType = response.headers.get('content-type');
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Logout error:", errorText);
        setError("Logout failed. Server returned an error.");
        return;
      }
  
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('Logout response:', data);
  
        if (data.success) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
  
          // ✅ Refresh the page
          setTimeout(() => {
            window.location.reload();
          }, 100);
          


        } else {
          setError(data.error || "Logout failed. Please try again.");
        }
      } else {
        const text = await response.text();
        console.error("Unexpected response format:", text);
        setError("Unexpected server response. Please contact support.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <Box sx={{ mt: 4, textAlign: 'center' }}>
      

      <Button
        variant="contained"
        onClick={() => {handleLogout()}}
        disabled={loading}
        sx={{ backgroundColor: colors.redAccent[700], "&:hover":{backgroundColor: colors.redAccent[500]} }}
      >
        {loading ? <CircularProgress size={24} /> : 'Logout'}
      </Button>
    </Box>
  );
};

export default LogoutButton;
