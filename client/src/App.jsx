import React, { useContext, useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Profile from './pages/Profile';
import MapComponent from './components/Map';
import Chat from './components/Chat';
import Layout from './components/Layout';
import { Snackbar, Alert } from '@mui/material';
import io from 'socket.io-client';

const GlobalNotifications = () => {
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

    return (
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
    );
};

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);
    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" />;
    return children;
};

const App = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Layout>
                    <GlobalNotifications />
                    <Routes>
                        <Route path="/" element={<MapComponent />} />
                        <Route path="/login" element={<LoginWrapper />} />
                        <Route path="/profile" element={
                            <ProtectedRoute>
                                <Profile />
                            </ProtectedRoute>
                        } />
                        <Route path="/chat" element={
                            <ProtectedRoute>
                                <Chat />
                            </ProtectedRoute>
                        } />
                    </Routes>
                </Layout>
            </BrowserRouter>
        </AuthProvider>
    );
};

const LoginWrapper = () => {
    const { user, loading } = useContext(AuthContext);
    if (loading) return <div>Loading...</div>;
    if (user) return <Navigate to="/" />;
    return <Login />;
};

export default App;
