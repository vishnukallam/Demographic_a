import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCurrentUser } from './store/authSlice';
import MapComponent from './components/Map';
import Layout from './components/Layout';
import Login from './components/Login';
import Register from './components/Register';
import Landing from './components/Landing';
import InterestModal from './components/InterestModal';
import Profile from './components/Profile';
import Chat from './components/Chat';
import { Box, CircularProgress } from '@mui/material';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useSelector(state => state.auth);
    if (!isAuthenticated) {
        return <Navigate to="/welcome" replace />;
    }
    return children;
};

const App = () => {
    const dispatch = useDispatch();
    const { loading } = useSelector(state => state.auth);

    useEffect(() => {
        dispatch(fetchCurrentUser());
    }, [dispatch]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/welcome" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <InterestModal />
                                <Routes>
                                    <Route path="/" element={<MapComponent />} />
                                    <Route path="/profile" element={<Profile />} />
                                    <Route path="/chat" element={<Chat />} />
                                </Routes>
                            </Layout>
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
