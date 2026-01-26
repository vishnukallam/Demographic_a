import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCurrentUser } from './store/authSlice';
import MapComponent from './components/Map';
import Layout from './components/Layout';
import Login from './components/Login';
import Register from './components/Register';
import InterestModal from './components/InterestModal';
import { Box, CircularProgress } from '@mui/material';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useSelector(state => state.auth);
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
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
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <InterestModal />
                                <MapComponent />
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
