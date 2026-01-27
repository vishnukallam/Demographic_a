import React from 'react';
import { Box, Typography, Container, Paper, Button } from '@mui/material';
import { Map as MapIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Chat = () => {
    const navigate = useNavigate();

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 5, textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom color="primary">
                    Messages
                </Typography>
                <Typography variant="body1" paragraph color="text.secondary">
                    Select a user on the Map to start a conversation!
                </Typography>

                <Box sx={{ my: 4 }}>
                    <img
                        src="https://cdn-icons-png.flaticon.com/512/1041/1041916.png"
                        alt="Chat Illustration"
                        style={{ width: '150px', opacity: 0.7 }}
                    />
                </Box>

                <Button
                    variant="contained"
                    size="large"
                    startIcon={<MapIcon />}
                    onClick={() => navigate('/')}
                >
                    Go to Map
                </Button>
            </Paper>
        </Container>
    );
};

export default Chat;
