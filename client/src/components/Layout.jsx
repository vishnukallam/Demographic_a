import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton, Menu, MenuItem, Box, useMediaQuery, useTheme, BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { Menu as MenuIcon, LogOut, Map as MapIcon, MessageSquare, User } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import Avatar from './Avatar';
import { useNavigate, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
    const { user } = useSelector(state => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [anchorEl, setAnchorEl] = useState(null);

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        dispatch(logout());
    };

    const navItems = [
        { label: 'Map', icon: <MapIcon />, path: '/' },
        { label: 'Chat', icon: <MessageSquare />, path: '/chat' }, // Ensure route exists or modal
        { label: 'Profile', icon: <User />, path: '/profile' }, // Ensure route exists
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <AppBar position="static" elevation={1} sx={{ bgcolor: 'white', color: 'text.primary' }}>
                <Toolbar>
                    <MapIcon color="#1976d2" style={{ marginRight: '10px' }} />
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold', color: '#1976d2' }}>
                        KON-NECT
                    </Typography>

                    {/* Desktop Nav */}
                    {!isMobile && user && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            {navItems.map((item) => (
                                <Button
                                    key={item.label}
                                    startIcon={item.icon}
                                    onClick={() => navigate(item.path)}
                                    color={location.pathname === item.path ? "primary" : "inherit"}
                                >
                                    {item.label}
                                </Button>
                            ))}
                            <Box sx={{ width: 1, height: 24, bgcolor: 'divider', mx: 1 }} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar user={user} sx={{ width: 32, height: 32 }} />
                                <Typography variant="subtitle2">{user.displayName}</Typography>
                            </Box>
                            <IconButton onClick={handleLogout} color="default" title="Logout">
                                <LogOut size={20} />
                            </IconButton>
                        </Box>
                    )}

                    {/* Mobile Menu Icon (Logout/Profile specific if needed) */}
                    {isMobile && user && (
                        <IconButton
                            size="large"
                            edge="start"
                            color="inherit"
                            aria-label="menu"
                            onClick={handleMenu}
                        >
                            <Avatar user={user} sx={{ width: 30, height: 30 }} />
                        </IconButton>
                    )}
                    <Menu
                        id="menu-appbar"
                        anchorEl={anchorEl}
                        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                        keepMounted
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        open={Boolean(anchorEl)}
                        onClose={handleClose}
                    >
                        <MenuItem onClick={handleLogout}>
                            <LogOut size={16} style={{ marginRight: 8 }} /> Logout
                        </MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>

            <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden', pb: isMobile ? 7 : 0 }}>
                {children}
            </Box>

            {/* Mobile Bottom Nav */}
            {isMobile && user && (
                <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }} elevation={3}>
                    <BottomNavigation
                        showLabels
                        value={location.pathname}
                        onChange={(event, newValue) => {
                            navigate(newValue);
                        }}
                    >
                        {navItems.map((item) => (
                            <BottomNavigationAction
                                key={item.label}
                                label={item.label}
                                value={item.path}
                                icon={item.icon}
                            />
                        ))}
                    </BottomNavigation>
                </Paper>
            )}
        </Box>
    );
};

export default Layout;
