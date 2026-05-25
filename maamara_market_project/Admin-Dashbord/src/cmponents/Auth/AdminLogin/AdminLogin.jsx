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
import { Eye, EyeOff } from "lucide-react"


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

  // set see password hide password
  const [showPassword, setShowPassword] = useState(false)

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
    setLoading(true);
  
    if (!username || !password) {
      setError("Both username and password are required.");
      setLoading(false);
      return;
    }
  
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
  
      const data = await response.json();
  
      if (!response.ok || !data.success) {
        setError(data.error || "Login failed");
        return;
      }

      console.log(data)
  
      // ✅ SAME FLOW as Google
      navigate("auth-success");
  
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{backgroundColor:colors.primary[500], color:colors.gray[100]}} width={"100%"} minHeight={'100vh'}>
    <Container maxWidth="xs" sx={{ border: '.1px solid', padding: '1em', position: 'relative', top: '50px', backgroundColor:colors.primary[500], minHeight:'100%' }}>
      
      <Box
        sx={{
          m: "50% 0",
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
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
          <div className='relative flex'>
            <TextField
              label="Password"
              variant="outlined"
              type={showPassword ? "text" : "password"}
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {/* Eye Icon */}
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 items-center"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

            {/* Google Login Button */}
            <Button
              type="button"
              variant="outlined"
              className="w-full flex items-center justify-center gap-2"
              sx={{
                backgroundColor: colors.primary[600],
                marginTop: '20px',
                color: colors.gray[100],
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: colors.primary[700],
                }
              }}
              onClick={() => {
                sessionStorage.setItem("postLoginRedirect", window.location.pathname);
                window.location.href = `${baseUrl}/accounts/google/login/`;
              }}
            >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path
                    fill="#FFC107"
                    d="M43.611 20.083H42V20H24v8h11.303C33.658 32.659 29.271 36 24 36
                    c-6.627 0-12-5.373-12-12s5.373-12 12-12
                    c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657
                    C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24
                    s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 12 24 12
                    c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657
                    C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238
                    C29.211 35.091 26.715 36 24 36
                    c-5.254 0-9.657-3.657-11.284-8.583l-6.54 5.025
                    C9.505 39.556 16.227 44 24 44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611 20.083H42V20H24v8h11.303
                    c-1.11 3.109-3.41 5.615-6.094 7.19l.002-.001
                    6.19 5.238C36.971 39.205 44 34 44 24
                    c0-1.341-.138-2.651-.389-3.917z"
                  />
                </svg>

                Continue with Google
              </Button>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{ mt: 5, backgroundColor: colors.gray[100], color: colors.gray[900] }}
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
