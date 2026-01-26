import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Button, TextField, Typography, Paper, Alert, Link, Chip, FormControl, InputLabel, Select, MenuItem, OutlinedInput, Stack } from '@mui/material';
import { registerUser } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';

const INTEREST_CATEGORIES = [
    'Sports & Outdoors',
    'Special Interest Travel',
    'Business & Industry',
    'Entertainment & Media',
    'Food & Drink',
    'Home Family & Pets',
    'Lifestyle & Values',
    'Science & Education',
    'Automotive',
    'Art & Design',
    'History & Humanities',
    'Programming and Technologies'
];

const Register = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error } = useSelector(state => state.auth);

    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        bio: '',
        interests: []
    });

    const [customInterest, setCustomInterest] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleInterestChange = (event) => {
        const { target: { value } } = event;
        setFormData({
            ...formData,
            interests: typeof value === 'string' ? value.split(',') : value,
        });
    };

    const handleAddCustomInterest = () => {
        if (customInterest && !formData.interests.includes(customInterest)) {
            setFormData({
                ...formData,
                interests: [...formData.interests, customInterest]
            });
            setCustomInterest('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await dispatch(registerUser(formData));
        if (registerUser.fulfilled.match(result)) {
            navigate('/');
        }
    };

    return (
        <Box sx={{
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: '#f5f5f5',
            overflowY: 'auto',
            py: 4
        }}>
            <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 500 }}>
                <Typography variant="h4" gutterBottom align="center">
                    Register
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error.error || 'Registration failed'}</Alert>}

                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Display Name"
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleChange}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        margin="normal"
                        required
                        helperText="Minimum 8 characters"
                    />
                    <TextField
                        fullWidth
                        label="Bio (Optional)"
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        margin="normal"
                        multiline
                        rows={3}
                    />

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Interests</InputLabel>
                        <Select
                            multiple
                            value={formData.interests}
                            onChange={handleInterestChange}
                            input={<OutlinedInput label="Interests" />}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => (
                                        <Chip key={value} label={value} />
                                    ))}
                                </Box>
                            )}
                        >
                            {INTEREST_CATEGORIES.map((name) => (
                                <MenuItem key={name} value={name}>
                                    {name}
                                </MenuItem>
                            ))}
                            {/* Allow selecting previously added custom interests if needed,
                                but mainly they are added via the text field below */}
                        </Select>
                    </FormControl>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2 }}>
                        <TextField
                            label="Add Custom Interest"
                            value={customInterest}
                            onChange={(e) => setCustomInterest(e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <Button variant="outlined" onClick={handleAddCustomInterest}>
                            Add
                        </Button>
                    </Box>

                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        size="large"
                        sx={{ mt: 3 }}
                        disabled={loading}
                    >
                        {loading ? 'Registering...' : 'Register'}
                    </Button>
                </form>

                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="body2">
                        Already have an account? <Link href="/login">Login</Link>
                    </Typography>
                </Box>
            </Paper>
        </Box>
    );
};

export default Register;
