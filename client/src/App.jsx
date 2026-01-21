import React, { useContext, useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import MapComponent from './components/Map';
import Layout from './components/Layout';
import { Snackbar, Alert, Dialog, DialogTitle, DialogContent, TextField, Button, Box, Autocomplete, Chip } from '@mui/material';
import io from 'socket.io-client';
import axios from 'axios';

// --- Global Notifications (moved inside App for context access) ---
// (We might remove this if no matching logic exists on server yet, but keeping structure)

// --- Welcome Modal for Guest Registration ---
const WelcomeModal = () => {
    const { user, setUser } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [availableInterests, setAvailableInterests] = useState([]);

    useEffect(() => {
        // Fetch interests from API (which now reads CSV)
        const fetchInterests = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const res = await axios.get(`${apiUrl}/api/interests`);
                setAvailableInterests(res.data);
            } catch (err) {
                console.error("Failed to load interests", err);
            }
        };
        fetchInterests();
    }, []);

    const handleJoin = () => {
        if (name && selectedInterests.length > 0) {
            setUser({ name, interests: selectedInterests });
        }
    };

    if (user) return null; // Don't show if already "logged in"

    return (
        <Dialog open={true} disableEscapeKeyDown>
            <DialogTitle>Welcome to Demographic</DialogTitle>
            <DialogContent>
                <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="Your Name"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

                    <Autocomplete
                        multiple
                        options={availableInterests}
                        getOptionLabel={(option) => option.name}
                        value={selectedInterests}
                        onChange={(event, newValue) => {
                            setSelectedInterests(newValue);
                        }}
                        renderInput={(params) => (
                            <TextField {...params} label="Select Interests" placeholder="Interests" />
                        )}
                        renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => (
                                <Chip label={option.name} {...getTagProps({ index })} />
                            ))
                        }
                    />

                    <Button variant="contained" onClick={handleJoin} disabled={!name || selectedInterests.length === 0}>
                        Join Nearby Community
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Layout>
                    <WelcomeModal />
                    <Routes>
                        <Route path="/" element={<MapComponent />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </Layout>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;
