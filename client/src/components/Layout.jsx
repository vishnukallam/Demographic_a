import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton, Menu, MenuItem, Box, useMediaQuery, useTheme, Avatar } from '@mui/material';
import { Menu as MenuIcon, LogOut, Map as MapIcon, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';

const Layout = ({ children }) => {
    const { user } = useSelector(state => state.auth);
    const dispatch = useDispatch();
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
        // Call API logout endpoint (to destroy session)
        window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/logout`;
        // We don't need to dispatch logout because the page will reload/redirect or we could, but server redirect handles it
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <AppBar position="static">
                <Toolbar>
                    <MapIcon style={{ marginRight: '10px' }} />
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        KON-NECT
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
                                {user && (
                                    <MenuItem onClick={handleLogout}>
                                        <LogOut size={16} style={{ marginRight: 8 }} /> Logout
                                    </MenuItem>
                                )}
                            </Menu>
                        </>
                    ) : (
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            {user && (
                                <>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Avatar src={user.profilePhoto} alt={user.displayName} sx={{ width: 32, height: 32 }} />
                                        <Typography variant="subtitle1">{user.displayName}</Typography>
                                    </Box>
                                    <Button color="inherit" onClick={handleLogout} startIcon={<LogOut />}>
                                        Logout
                                    </Button>
                                </>
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
