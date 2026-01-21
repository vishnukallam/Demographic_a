import React, { useEffect, useRef, useState, useContext } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Style, Icon, Circle, Fill, Stroke, Text } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Box, Paper, InputBase, IconButton, List, ListItem, ListItemText, Divider, Typography, Button, Snackbar, Alert } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import ChatIcon from '@mui/icons-material/Chat';
import { AuthContext } from '../context/AuthContext';
import io from 'socket.io-client';
import ChatOverlay from './ChatOverlay';

const MapComponent = () => {
    const mapRef = useRef();
    const [map, setMap] = useState(null);
    const [userSource] = useState(new VectorSource());
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const { user } = useContext(AuthContext);
    const socketRef = useRef(null);

    // Error Handling State
    const [errorMsg, setErrorMsg] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    // Popover State
    const [selectedUser, setSelectedUser] = useState(null);
    // Chat State
    const [chatTarget, setChatTarget] = useState(null);

    useEffect(() => {
        // Socket Connection
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        socketRef.current = io(apiUrl);

        if (user) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords;
                socketRef.current.emit('register_user', {
                    name: user.name,
                    interests: user.interests,
                    location: { lat: latitude, lng: longitude }
                });
            }, (err) => console.error(err));
        }

        socketRef.current.on('nearby_users', (nearbyUsers) => {
            userSource.clear();
            nearbyUsers.forEach(u => {
                const feature = new Feature({
                    geometry: new Point(fromLonLat([u.location.lng, u.location.lat])),
                    type: 'user',
                    data: u
                });

                feature.setStyle(new Style({
                    image: new Circle({
                        radius: 10,
                        fill: new Fill({ color: '#1976d2' }),
                        stroke: new Stroke({ color: 'white', width: 2 })
                    }),
                    text: new Text({
                        text: u.name,
                        offsetY: -20,
                        font: '12px sans-serif',
                        fill: new Fill({ color: '#333' }),
                        backgroundFill: new Fill({ color: 'rgba(255,255,255,0.8)' }),
                        padding: [2, 2, 2, 2]
                    })
                }));
                userSource.addFeature(feature);
            });
        });

        // Listen for incoming chat requests
        socketRef.current.on('chat_request', ({ from, fromName, roomId }) => {
            // Auto-accept/Open for MVP simplicity
            setChatTarget({
                socketId: from,
                name: fromName,
                roomId: roomId // Pass roomId directly so Overlay knows
            });
            socketRef.current.emit('accept_chat', { roomId });
        });

        return () => socketRef.current.disconnect();
    }, [user, userSource]);

    // Initialize Map
    useEffect(() => {
        const initialMap = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({ source: new OSM() }),
                new VectorLayer({ source: userSource, zIndex: 10 })
            ],
            view: new View({
                center: fromLonLat([-74.006, 40.7128]), // Default NYC
                zoom: 12
            })
        });

        setMap(initialMap);

        // Click Handler for Users
        initialMap.on('click', (e) => {
            const feature = initialMap.forEachFeatureAtPixel(e.pixel, (f) => f);
            if (feature && feature.get('type') === 'user') {
                setSelectedUser(feature.get('data'));
            } else {
                setSelectedUser(null);
            }
        });

        // Initial Geolocation & Watch
        if ("geolocation" in navigator) {
            const watchId = navigator.geolocation.watchPosition((position) => {
                const { latitude, longitude } = position.coords;
                // Update server
                if (socketRef.current) {
                    socketRef.current.emit('update_location', { lat: latitude, lng: longitude });
                }
            }, (error) => {
                console.error("Geolocation error:", error);
            }, { enableHighAccuracy: true });

            // Center on load
            navigator.geolocation.getCurrentPosition((pos) => {
                initialMap.getView().animate({ center: fromLonLat([pos.coords.longitude, pos.coords.latitude]), zoom: 14 });
            });

            return () => navigator.geolocation.clearWatch(watchId);
        }

        return () => initialMap.setTarget(null);
    }, [userSource]);

    // Search Logic (Same as before)
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length > 2) {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`);
                    const data = await res.json();
                    setSuggestions(data);
                } catch (err) {
                    console.error(err);
                }
            } else {
                setSuggestions([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleSelectLocation = (place) => {
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);
        const coord = fromLonLat([lon, lat]);
        map.getView().animate({ center: coord, zoom: 14 });
        setSuggestions([]);
        setSearchQuery(place.display_name.split(',')[0]);
    };

    const handleStartChat = () => {
        if (selectedUser) {
            setChatTarget(selectedUser);
            setSelectedUser(null); // Close popover
        }
    };

    return (
        <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Search Bar */}
            <Box sx={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100, width: '90%', maxWidth: 400 }}>
                <Paper component="form" sx={{ p: '2px 4px', display: 'flex', alignItems: 'center' }} onSubmit={(e) => e.preventDefault()}>
                    <InputBase sx={{ ml: 1, flex: 1 }} placeholder="Search Location" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <IconButton type="button" sx={{ p: '10px' }}> <SearchIcon /> </IconButton>
                </Paper>
                {suggestions.length > 0 && (
                    <Paper sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
                        <List dense>
                            {suggestions.map((place) => (
                                <React.Fragment key={place.place_id}>
                                    <ListItem button onClick={() => handleSelectLocation(place)}>
                                        <ListItemText primary={place.display_name} />
                                    </ListItem>
                                    <Divider />
                                </React.Fragment>
                            ))}
                        </List>
                    </Paper>
                )}
            </Box>

            <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>

            {/* User Popover */}
            {selectedUser && (
                <Paper sx={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100, p: 2, minWidth: 250, textAlign: 'center' }}>
                    <Typography variant="h6">{selectedUser.name}</Typography>
                    <Box sx={{ mt: 1, mb: 2 }}>
                        {selectedUser.interests && selectedUser.interests.map((int, i) => (
                            <Typography key={i} variant="caption" sx={{ display: 'inline-block', bgcolor: '#e0f7fa', borderRadius: 1, px: 1, mr: 0.5 }}>
                                {int.name || int}
                            </Typography>
                        ))}
                    </Box>
                    <Button variant="contained" startIcon={<ChatIcon />} size="small" onClick={handleStartChat}>
                        Chat
                    </Button>
                    <Button size="small" onClick={() => setSelectedUser(null)} sx={{ mt: 1, ml: 1 }}>Close</Button>
                </Paper>
            )}

            {/* Chat Overlay */}
            {chatTarget && socketRef.current && (
                <ChatOverlay
                    socket={socketRef.current}
                    user={user}
                    targetUser={chatTarget}
                    onClose={() => setChatTarget(null)}
                />
            )}

            <IconButton sx={{ position: 'absolute', bottom: 20, right: 20, bgcolor: 'white' }} onClick={() => {
                navigator.geolocation.getCurrentPosition((pos) => {
                    map.getView().animate({ center: fromLonLat([pos.coords.longitude, pos.coords.latitude]), zoom: 14 });
                });
            }}>
                <MyLocationIcon color="primary" />
            </IconButton>
        </Box>
    );
};

export default MapComponent;
