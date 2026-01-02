import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  TextField,
  Typography,
  Alert,
  useTheme,
  Snackbar
} from '@mui/material';
import { tokens } from '../../../theme';
import { baseUrl } from '../../Constant/Constant';
import api from '../../../Services/Api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext/Context';


const LoginForm = () => {
  const [csrfToken, setCsrfToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setIsAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);


  
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // 🔐 Fetch CSRF token on mount
  useEffect(() => {
    api.get(`${baseUrl}/api/get-csrf-token/`, { withCredentials: true })
      .then(res => setCsrfToken(res.data.csrfToken))
      .catch(err => console.error('CSRF fetch error:', err));
  }, []);
  

  // 🚀 Handle login submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError("Both username and password are required.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    try {
      const response = await fetch(`${baseUrl}/api/login/`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken
        }
      });
      
      const contentType = response.headers.get('content-type');

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error:", errorText);
        setError("Login failed. Server returned an error.");
        return;
      }

      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('Login response:', data);

        if (data.success) {
          // 🧠 Store tokens if provided (for JWT-based users)
          
          setOpen(true);
          console.log("login data", data.user.role)

          setUsername('');
          setPassword('');

          // 🔁 Redirect based on profile status
          if (data.user.role === "admin") {
            window.location.href = "/admin-dashboard";
          } else if (data.user.role === "vendor") {
            window.location.href = "/vendors-dashboard";
          } else {
            window.location.href = "/unauthorized";
          }
          
          
          
        } else {
          setError(data.error || "Login failed. Please try again.");
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
    <Box sx={{backgroundColor:colors.primary[500], color:colors.gray[100]}} width={"100%"}>
    <Container maxWidth="xs" sx={{ border: '.1px solid', padding: '1em', position: 'relative', top: '50px', backgroundColor:colors.primary[500] }}>
      
      <Box
        sx={{
          m: "50% 0",
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant="h3" component="h1" gutterBottom mb={2}>
          Login
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleLogin} sx={{ width: '100%' }}>
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <TextField
            label="Password"
            variant="outlined"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{ mt: 5, backgroundColor: colors.primary[600] }}
          >
            {loading ? <CircularProgress size={24} /> : 'Login'}
          </Button>
        </Box>
      </Box>
    </Container>
    <Snackbar
      open={open}
      autoHideDuration={3000}
      onClose={() => setOpen(false)}
      message="Login successful!"
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    />

    </Box>

  );
};

export default LoginForm;
