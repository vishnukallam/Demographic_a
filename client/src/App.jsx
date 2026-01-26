import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCurrentUser } from './store/authSlice';
import MapComponent from './components/Map';
import Layout from './components/Layout';
import Login from './components/Login';
import InterestModal from './components/InterestModal';
import { Box, CircularProgress } from '@mui/material';

const App = () => {
    const dispatch = useDispatch();
    const { user, isAuthenticated, loading } = useSelector(state => state.auth);

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

    if (!isAuthenticated) {
        return <Login />;
    }

    return (
        <BrowserRouter>
            <Layout>
                <InterestModal />
                <Routes>
                    <Route path="/" element={<MapComponent />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Layout>
        </BrowserRouter>
    );
};

export default App;
