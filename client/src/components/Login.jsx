import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Button, TextField, Typography, Paper, Alert, Divider, Link, InputAdornment, IconButton, CircularProgress } from '@mui/material';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { loginUser } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error, isAuthenticated } = useSelector(state => state.auth);

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    // Race Condition Fix: Removed useEffect dependency for navigation.
    // Handling navigation imperatively after thunk resolution.

    // const { loading, error, isAuthenticated } = useSelector(state => state.auth); // Keeping for UI state

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const resultAction = await dispatch(loginUser(formData));
            const user = resultAction.payload; // Or unwrap()

            if (loginUser.fulfilled.match(resultAction)) {
                // Synchronously set token if not already handled by thunk side-effect (safe measure)
                if (user && user.token) {
                    localStorage.setItem('token', user.token);
                }
                navigate('/', { replace: true });
            }
        } catch (err) {
            console.error("Login failed:", err);
        }
    };

    const handleGoogleLogin = () => {
        alert("Google Login is coming soon! Please register with email/password for now.");
    };

    return (
        <Box sx={{
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: 'transparent' // Handled by global background
        }}>
            <Paper
                elevation={10}
                sx={{
                    p: 4,
                    textAlign: 'center',
                    maxWidth: 400,
                    width: '90%',
                    borderRadius: 3,
                    background: 'rgba(30, 41, 59, 0.7)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white'
                }}
            >
                <Typography variant="h4" fontWeight="800" gutterBottom sx={{ background: 'linear-gradient(45deg, #38bdf8, #818cf8)', backgroundClip: 'text', textFillColor: 'transparent' }}>
                    CONNECT
                </Typography>
                <Typography variant="body1" sx={{ mb: 3, color: 'rgba(255,255,255,0.7)' }}>
                    Connect with people nearby who share your interests.
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error.error || 'Login failed'}</Alert>}

                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        margin="normal"
                        required
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                color: 'white',
                                borderRadius: '16px', // Matches new theme
                                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                                '&:hover fieldset': { borderColor: '#38bdf8' },
                                '&.Mui-focused fieldset': { borderColor: '#38bdf8' },
                            },
                            '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                            '& .MuiInputLabel-root.Mui-focused': { color: '#38bdf8' }
                        }}
                    />
                    <TextField
                        fullWidth
                        label="Password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleChange}
                        margin="normal"
                        required
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="toggle password visibility"
                                        onClick={() => setShowPassword(!showPassword)}
                                        edge="end"
                                        sx={{ color: 'rgba(255,255,255,0.7)' }}
                                    >
                                        {showPassword ? <EyeOff /> : <Eye />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                color: 'white',
                                borderRadius: '16px',
                                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                                '&:hover fieldset': { borderColor: '#38bdf8' },
                                '&.Mui-focused fieldset': { borderColor: '#38bdf8' },
                            },
                            '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                            '& .MuiInputLabel-root.Mui-focused': { color: '#38bdf8' }
                        }}
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        size="large"
                        sx={{
                            mt: 3,
                            mb: 2,
                            bgcolor: '#38bdf8',
                            color: '#0f172a',
                            fontWeight: 'bold',
                            borderRadius: '100px', // Pill shape
                            '&:hover': { bgcolor: '#7dd3fc' }
                        }}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
                    </Button>
                </form>

                <Box sx={{ my: 2 }}>
                    <Divider sx={{ '&::before, &::after': { borderColor: 'rgba(255,255,255,0.2)' }, color: 'rgba(255,255,255,0.5)' }}>OR</Divider>
                </Box>

                <Button
                    variant="outlined"
                    startIcon={<LogIn />}
                    onClick={handleGoogleLogin}
                    fullWidth
                    sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.05)' } }}
                >
                    Login with Google
                </Button>

                <Box sx={{ mt: 3 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        Don't have an account? <Link href="/register" sx={{ color: '#38bdf8', textDecoration: 'none' }}>Register</Link>
                    </Typography>
                </Box>
            </Paper>
        </Box>
    );
};

export default Login;
