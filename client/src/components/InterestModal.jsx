import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateInterests } from '../store/authSlice';
import { Dialog, DialogTitle, DialogContent, Box, TextField, Button, Autocomplete, Chip, Typography } from '@mui/material';
import axios from 'axios';

const InterestModal = () => {
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [availableInterests, setAvailableInterests] = useState([]);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (user && (!user.interests || user.interests.length === 0)) {
            setOpen(true);
        } else {
            setOpen(false);
        }
    }, [user]);

    useEffect(() => {
        const fetchInterests = async () => {
            try {
                const apiUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
                const res = await axios.get(`${apiUrl}/api/interests`);
                setAvailableInterests(res.data);
            } catch (err) {
                console.error("Failed to load interests", err);
            }
        };
        fetchInterests();
    }, []);

    const handleSubmit = () => {
        if (selectedInterests.length > 0) {
            // Transform object array to string array if backend expects strings,
            // but backend schema says [String].
            // The availableInterests are { category, name }.
            // Let's store just the names or check how `server/index.js` handles it.
            // Server index.js: broadcast checks `oi.name === i.name` or `oi === i`.
            // User schema: [String].
            // So we should save names.
            const interestNames = selectedInterests.map(i => i.name || i);
            dispatch(updateInterests(interestNames));
        }
    };

    if (!open) return null;

    return (
        <Dialog open={open} disableEscapeKeyDown>
            <DialogTitle>Select Your Interests</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    You must select at least one interest to see nearby hotspots.
                </Typography>
                <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Autocomplete
                        multiple
                        options={availableInterests}
                        getOptionLabel={(option) => option.name || option}
                        value={selectedInterests}
                        onChange={(event, newValue) => {
                            setSelectedInterests(newValue);
                        }}
                        renderInput={(params) => (
                            <TextField {...params} label="Select Interests" placeholder="Interests" />
                        )}
                        renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => (
                                <Chip label={option.name || option} {...getTagProps({ index })} />
                            ))
                        }
                    />
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={selectedInterests.length === 0}
                    >
                        Start Exploring
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default InterestModal;
