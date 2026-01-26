import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton, Menu, MenuItem, Box, useMediaQuery, useTheme } from '@mui/material';
import { Menu as MenuIcon, LogOut, Map as MapIcon } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import Avatar from './Avatar';

const Layout = ({ children }) => {
    const { user } = useSelector(state => state.auth);
    const dispatch = useDispatch();
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
        // Since logout clears the state and localStorage, and ProtectedRoute watches state,
        // the user will be redirected to login automatically or we can force it if needed.
        // But ProtectedRoute inside App.jsx should handle it.
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
                                        <Avatar user={user} sx={{ width: 32, height: 32 }} />
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
