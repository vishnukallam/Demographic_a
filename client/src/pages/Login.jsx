import React from 'react';
import { Button, Container, Typography, Box, Paper } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

const Login = () => {
    const handleLogin = () => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        window.location.href = `${apiUrl}/auth/google`;
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <Typography component="h1" variant="h4" gutterBottom>
                        Welcome
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
                        Connect with people who share your interests nearby.
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<GoogleIcon />}
                        onClick={handleLogin}
                        fullWidth
                        size="large"
                    >
                        Login with Google
                    </Button>
                </Paper>
            </Box>
        </Container>
    );
};

export default Login;
