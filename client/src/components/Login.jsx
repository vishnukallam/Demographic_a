import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Button, TextField, Typography, Paper, Alert, Divider, Link } from '@mui/material';
import { LogIn } from 'lucide-react';
import { loginUser } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error } = useSelector(state => state.auth);

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await dispatch(loginUser(formData));
        if (loginUser.fulfilled.match(result)) {
            navigate('/');
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
            bgcolor: '#f5f5f5'
        }}>
            <Paper elevation={3} sx={{ p: 4, textAlign: 'center', maxWidth: 400, width: '100%' }}>
                <Typography variant="h4" gutterBottom>
                    KON-NECT
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
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
                    />
                    <TextField
                        fullWidth
                        label="Password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        margin="normal"
                        required
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        size="large"
                        sx={{ mt: 2 }}
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </Button>
                </form>

                <Box sx={{ my: 2 }}>
                    <Divider>OR</Divider>
                </Box>

                <Button
                    variant="outlined"
                    startIcon={<LogIn />}
                    onClick={handleGoogleLogin}
                    fullWidth
                >
                    Login with Google
                </Button>

                <Box sx={{ mt: 3 }}>
                    <Typography variant="body2">
                        Don't have an account? <Link href="/register">Register</Link>
                    </Typography>
                </Box>
            </Paper>
        </Box>
    );
};

export default Login;
