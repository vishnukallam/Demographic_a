import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Container, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, Globe, ChevronLeft, ChevronRight } from 'lucide-react';

const Landing = () => {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            title: "Connect. Engage. Belong.",
            subtext: "Discover interesting people right in your neighborhood and turn digital connections into real-world friendships."
        },
        {
            title: "Your tribe is closer than you think.",
            subtext: "Use our dynamic radius to find communities and events tailored specifically to your unique interests."
        },
        {
            title: "Connect globally, belong anywhere.",
            subtext: "Expand your social circle across borders and bridge the gap between cultures with one click."
        }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000); // Auto-scroll every 5 seconds
        return () => clearInterval(timer);
    }, []);

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: '#f0f2f5',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #ffffff 0%, #ffffff 100%)'
        }}>
            <Container maxWidth="md" >
                <Paper elevation={3} sx={{ p: 1, borderRadius: 1, textAlign: 'center', backdropFilter: 'blur(10px)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                        <MapPin size={48} color="#1976d2" />
                        <Users size={48} color="#1976d2" />
                    </Box>

                    <Typography variant="h2" component="h1" sx={{ fontWeight: 'bold', color: '#ffffff', mb: 1 }}>
                        CONNECT
                    </Typography>

                    {/* Auto-scrolling carousel */}
                    <Box sx={{ 
                        mb: 4, 
                        mt: -1,
                        position: 'relative', 
                        minHeight: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pr: 6,
                        pl: 6
                    }}>
                        {slides.map((slide, index) => (
                            <Box
                                key={index}
                                sx={{
                                    position: 'absolute',
                                    opacity: currentSlide === index ? 1 : 0,
                                    transition: 'opacity 1.5s ease-in-out',
                                    textAlign: 'center',
                                    width: 'calc(100% - 120px)',
                                    px: 2
                                }}
                            >
                                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ffffff', mb: 2 }}>
                                    {slide.title}
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                                    {slide.subtext}
                                </Typography>
                            </Box>
                        ))}
                        
                        {/* Navigation buttons */}
                        <Button
                            onClick={prevSlide}
                            sx={{
                                position: 'absolute',
                                left: 0,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                minWidth: 'auto',
                                p: 1,
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' }
                            }}
                        >
                            <ChevronLeft size={32} color="#ffffff" />
                        </Button>
                        <Button
                            onClick={nextSlide}
                            sx={{
                                position: 'absolute',
                                right: 0,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                minWidth: 'auto',
                                p: 1,
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' }
                            }}
                        >
                            <ChevronRight size={32} color="#ffffff" />
                        </Button>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 6 }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Globe size={32} color="#ffffff" />
                            <Typography variant="subtitle1" sx={{ mt: 1 }}>Global Reach</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                            <MapPin size={32} color="#ffffff" />
                            <Typography variant="subtitle1" sx={{ mt: 1 }}>Dynamic Radius</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                            <Users size={32} color="#ffffff" />
                            <Typography variant="subtitle1" sx={{ mt: 1 }}>Interest Matching</Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={() => navigate('/login')}
                            sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}
                        >
                            Login
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            onClick={() => navigate('/register')}
                            sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}
                        >
                            Register
                        </Button>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default Landing;
