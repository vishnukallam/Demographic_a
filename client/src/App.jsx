import React, { useEffect, useState, useMemo, createContext, useContext } from 'react';
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
import { Box, CircularProgress, ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from './theme';

// Theme Context
export const ColorModeContext = createContext({
    toggleColorMode: () => { },
    setAccent: () => { },
    mode: 'dark',
    accent: 'blue'
});

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

    // Theme State
    const [mode, setMode] = useState('dark');
    const [accent, setAccent] = useState('blue');

    const colorMode = useMemo(() => ({
        toggleColorMode: () => {
            setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
        },
        setAccent: (newAccent) => {
            setAccent(newAccent);
        },
        mode,
        accent
    }), [mode, accent]);

    const theme = useMemo(() => getTheme(mode, accent), [mode, accent]);

    useEffect(() => {
        dispatch(fetchCurrentUser());
    }, [dispatch]);

    if (loading) {
        return (
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
                    <CircularProgress />
                </Box>
            </ThemeProvider>
        );
    }

    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <BrowserRouter>
                    <Routes>
                        <Route path="/welcome" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route
                            path="/*"
                            element={
                                <ProtectedRoute>
                                    <Layout>
                                        <InterestModal />
                                        <Routes>
                                            <Route path="/" element={<MapComponent />} />
                                            <Route path="/profile" element={<Profile />} />
                                            <Route path="/chat" element={<Chat />} />
                                            <Route path="*" element={<Navigate to="/" />} />
                                        </Routes>
                                    </Layout>
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </BrowserRouter>
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
};

export default App;
