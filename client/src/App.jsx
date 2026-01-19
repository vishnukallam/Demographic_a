import React, { useContext, useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Profile from './pages/Profile';
import MapComponent from './components/Map';
import Chat from './components/Chat';
import { AppBar, Toolbar, Typography, Button, Snackbar, Alert, Box } from '@mui/material';
import io from 'socket.io-client';

const Navigation = () => {
    const { user } = useContext(AuthContext);
    const [notification, setNotification] = useState(null);
    const socketRef = useRef();

    useEffect(() => {
        if (user) {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            socketRef.current = io(apiUrl);
            socketRef.current.emit('join', user._id);

            socketRef.current.on('match_notification', (data) => {
                setNotification(data.message);
            });

            return () => socketRef.current.disconnect();
        }
    }, [user]);

    const handleLogout = () => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        window.location.href = `${apiUrl}/auth/logout`;
    };

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Social Map
                    </Typography>
                    {user ? (
                        <>
                            <Button color="inherit" component={Link} to="/map">Map</Button>
                            <Button color="inherit" component={Link} to="/chat">Chat</Button>
                            <Button color="inherit" component={Link} to="/profile">Profile</Button>
                            <Button color="inherit" onClick={handleLogout}>Logout</Button>
                        </>
                    ) : (
                        <Button color="inherit" component={Link} to="/">Login</Button>
                    )}
                </Toolbar>
            </AppBar>

            <Snackbar
                open={!!notification}
                autoHideDuration={6000}
                onClose={() => setNotification(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert onClose={() => setNotification(null)} severity="success" sx={{ width: '100%' }}>
                    {notification}
                </Alert>
            </Snackbar>
        </>
    );
};

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);
    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/" />;
    return children;
};

const App = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Navigation />
                <Box sx={{ p: 2 }}>
                    <Routes>
                        <Route path="/" element={<Login />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/map" element={
                            <ProtectedRoute>
                                <MapComponent />
                            </ProtectedRoute>
                        } />
                        <Route path="/chat" element={
                            <ProtectedRoute>
                                <Chat />
                            </ProtectedRoute>
                        } />
                    </Routes>
                </Box>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;
