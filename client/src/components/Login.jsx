import React from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { LogIn } from 'lucide-react';

const Login = () => {
    const handleLogin = () => {
        window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/google`;
    };

    return (
        <Box sx={{
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: '#f5f5f5'
        }}>
            <Paper elevation={3} sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
                <Typography variant="h4" gutterBottom>
                    Hotspot Connect
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                    Connect with people nearby who share your interests.
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<LogIn />}
                    onClick={handleLogin}
                    size="large"
                    fullWidth
                >
                    Login with Google
                </Button>
            </Paper>
        </Box>
    );
};

export default Login;
