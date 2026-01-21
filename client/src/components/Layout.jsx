import React, { useContext, useState } from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton, Menu, MenuItem, Box, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Layout = ({ children }) => {
    const { user } = useContext(AuthContext);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [anchorEl, setAnchorEl] = useState(null);
    const navigate = useNavigate();

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        window.location.href = `${apiUrl}/auth/logout`;
        handleClose();
    };

    const navLinks = [
        { title: 'Map', path: '/' },
        ...(user ? [
            { title: 'Chat', path: '/chat' },
            { title: 'Profile', path: '/profile' }
        ] : [])
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Social Map
                    </Typography>

                    {isMobile ? (
                        <>
                            <IconButton
                                size="large"
                                edge="start"
                                color="inherit"
                                aria-label="menu"
                                onClick={handleMenu}
                            >
                                <MenuIcon />
                            </IconButton>
                            <Menu
                                id="menu-appbar"
                                anchorEl={anchorEl}
                                anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                keepMounted
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                open={Boolean(anchorEl)}
                                onClose={handleClose}
                            >
                                {navLinks.map((link) => (
                                    <MenuItem key={link.title} onClick={() => { navigate(link.path); handleClose(); }}>
                                        {link.title}
                                    </MenuItem>
                                ))}
                                {user ? (
                                    <MenuItem onClick={handleLogout}>Logout</MenuItem>
                                ) : (
                                    <MenuItem onClick={() => { navigate('/login'); handleClose(); }}>Login</MenuItem>
                                )}
                            </Menu>
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            {navLinks.map((link) => (
                                <Button key={link.title} color="inherit" component={Link} to={link.path}>
                                    {link.title}
                                </Button>
                            ))}
                            {user ? (
                                <Button color="inherit" onClick={handleLogout}>Logout</Button>
                            ) : (
                                <Button color="inherit" component={Link} to="/login">Login</Button>
                            )}
                        </Box>
                    )}
                </Toolbar>
            </AppBar>
            <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
                {children}
            </Box>
        </Box>
    );
};

export default Layout;
