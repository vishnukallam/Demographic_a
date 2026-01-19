import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Container, TextField, Button, Typography, Box, Chip, Autocomplete, Alert } from '@mui/material';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
    const { user, setUser } = useContext(AuthContext);
    const [name, setName] = useState(user?.name || '');
    const [about, setAbout] = useState(user?.about || '');
    // Ensure selectedInterests matches user's saved interests (strings) mapped to objects if needed
    const [selectedInterests, setSelectedInterests] = useState(user?.interests || []);
    const [availableInterests, setAvailableInterests] = useState([]);
    const [msg, setMsg] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
             navigate('/');
             return;
        }

        api.get('/api/interests').then(res => {
            setAvailableInterests(res.data);
        }).catch(err => console.error(err));

    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const interestsToSave = selectedInterests.map(i => typeof i === 'string' ? i : i.name);
            const res = await api.put('/api/user/profile', {
                name,
                about,
                interests: interestsToSave
            });
            setUser(res.data);
            setMsg('Profile updated successfully!');
            setTimeout(() => navigate('/map'), 1000);
        } catch (err) {
            console.error(err);
            setMsg('Error updating profile');
        }
    };

    if (!user) return null;

    return (
        <Container maxWidth="md">
            <Box sx={{ mt: 4 }}>
                <Typography variant="h4" gutterBottom>Edit Profile</Typography>
                {msg && <Alert severity="info" sx={{ mb: 2 }}>{msg}</Alert>}
                <form onSubmit={handleSubmit}>
                    <TextField
                        label="Name"
                        fullWidth
                        margin="normal"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <TextField
                        label="About"
                        fullWidth
                        margin="normal"
                        multiline
                        rows={4}
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                    />

                    <Autocomplete
                        multiple
                        id="interests-tags"
                        options={availableInterests}
                        groupBy={(option) => option.category}
                        getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                        value={selectedInterests.map(i => {
                             if (typeof i === 'object') return i;
                             return availableInterests.find(ai => ai.name === i) || { name: i, category: 'Custom' };
                        })}
                        onChange={(event, newValue) => {
                            setSelectedInterests(newValue);
                        }}
                        isOptionEqualToValue={(option, value) => option.name === value.name}
                        renderInput={(params) => (
                            <TextField {...params} label="Interests" margin="normal" placeholder="Favorites" />
                        )}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => {
                                const { key, ...tagProps } = getTagProps({ index });
                                return (
                                  <Chip label={option.name} key={key} {...tagProps} />
                                );
                            })
                        }
                    />

                    <Button type="submit" variant="contained" color="primary" sx={{ mt: 3 }}>
                        Save & Continue
                    </Button>
                </form>
            </Box>
        </Container>
    );
};

export default Profile;
