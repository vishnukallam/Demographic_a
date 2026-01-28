import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Button, TextField, Typography, Paper, Alert, Link, Chip, FormControl, InputLabel, Select, MenuItem, OutlinedInput, Stack } from '@mui/material';
import { registerUser } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';
import { green } from '@mui/material/colors';

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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <Paper elevation={3} sx={{ p: 4, width: '90%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
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

                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                        Select Interests (at least one)
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {INTEREST_CATEGORIES.map((interest) => (
                            <Chip
                                key={interest}
                                label={interest}
                                onClick={() => {
                                    const selected = formData.interests.includes(interest);
                                    let newInterests;
                                    if (selected) {
                                        newInterests = formData.interests.filter(i => i !== interest);
                                    } else {
                                        newInterests = [...formData.interests, interest];
                                    }
                                    setFormData({ ...formData, interests: newInterests });
                                }}
                                color={formData.interests.includes(interest) ? "primary" : "default"}
                                variant={formData.interests.includes(interest) ? "filled" : "outlined"}
                                sx={{ cursor: 'pointer' }}
                            />
                        ))}
                    </Box>

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
