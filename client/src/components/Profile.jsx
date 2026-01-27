import React from 'react';
import { useSelector } from 'react-redux';
import { Box, Paper, Typography, Avatar, Container, Chip, Button } from '@mui/material';
import { Edit } from 'lucide-react';

const Profile = () => {
    const { user } = useSelector(state => state.auth);

    if (!user) return null;

    return (
        <Container maxWidth="sm" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                    <Avatar
                        src={user.profilePhoto}
                        sx={{ width: 100, height: 100, mb: 2, fontSize: '2.5rem' }}
                    >
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </Avatar>
                    <Typography variant="h4" fontWeight="bold">
                        {user.displayName}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                        {user.email}
                    </Typography>
                </Box>

                <Box sx={{ textAlign: 'left', mb: 4 }}>
                    <Typography variant="h6" gutterBottom>Bio</Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9f9f9', minHeight: '60px' }}>
                        <Typography variant="body1">
                            {user.bio || "No bio yet. Tell us about yourself!"}
                        </Typography>
                    </Paper>
                </Box>

                <Box sx={{ textAlign: 'left', mb: 4 }}>
                    <Typography variant="h6" gutterBottom>Interests</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {user.interests && user.interests.length > 0 ? (
                            user.interests.map((int, index) => (
                                <Chip
                                    key={index}
                                    label={typeof int === 'string' ? int : int.name}
                                    color="primary"
                                    variant="outlined"
                                />
                            ))
                        ) : (
                            <Typography variant="body2" color="text.secondary">No interests selected.</Typography>
                        )}
                    </Box>
                </Box>

                <Button variant="contained" startIcon={<Edit />} fullWidth>
                    Edit Profile
                </Button>
            </Paper>
        </Container>
    );
};

export default Profile;
