import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Style, Circle, Fill, Stroke, Text } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Box, Paper, InputBase, IconButton, List, ListItem, ListItemText, Divider, Typography, Button, Avatar, Slider } from '@mui/material';
import { Search, Crosshair, MessageSquare } from 'lucide-react';
import { useSelector } from 'react-redux';
import io from 'socket.io-client';
import ChatOverlay from './ChatOverlay';
import api from '../utils/api';

const MapComponent = () => {
    const mapRef = useRef();
    const [map, setMap] = useState(null);
    const [userSource] = useState(new VectorSource());
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);

    // Dynamic Radius State
    const [radius, setRadius] = useState(10); // Default 10km

    const { user } = useSelector(state => state.auth);
    const socketRef = useRef(null);
    const [socketReady, setSocketReady] = useState(false);

    // Popover State
    const [selectedUser, setSelectedUser] = useState(null);
    // Chat State
    const [chatTarget, setChatTarget] = useState(null);

    // Helper to check interest match
    const checkInterestMatch = (userInterests, myInterests) => {
        if (!userInterests || !myInterests) return false;
        const set1 = new Set(myInterests.map(i => typeof i === 'string' ? i : i.name));
        return userInterests.some(i => set1.has(typeof i === 'string' ? i : i.name));
    };

    // My Location & Radius Source
    const [selfSource] = useState(new VectorSource());

    // Fetch Users based on dynamic radius
    const fetchNearbyUsers = useCallback(async (centerLat, centerLng) => {
        if (!centerLat || !centerLng) return;
        try {
            const res = await api.get('/api/users/nearby', {
                params: {
                    lat: centerLat,
                    lng: centerLng,
                    radius: radius,
                    interests: 'all'
                }
            });
            const users = res.data;
            userSource.clear();

            users.forEach(u => {
                if (!u.location || !u.location.coordinates) return;
                const [lng, lat] = u.location.coordinates;

                const feature = new Feature({
                    geometry: new Point(fromLonLat([lng, lat])),
                    type: 'user',
                    data: u
                });

                // Style Logic
                const isMatch = user && checkInterestMatch(u.interests, user.interests);
                const color = isMatch ? '#4caf50' : '#ff9800'; // Green for match, Yellow for others

                feature.setStyle(new Style({
                    image: new Circle({
                        radius: 8,
                        fill: new Fill({ color: color }),
                        stroke: new Stroke({ color: 'white', width: 2 })
                    }),
                    text: new Text({
                        text: u.displayName, // Only show name on hover/click? Or always? Keeping always for now
                        offsetY: -15,
                        font: '12px Roboto, sans-serif',
                        fill: new Fill({ color: '#333' }),
                        backgroundFill: new Fill({ color: 'rgba(255,255,255,0.8)' }),
                        padding: [2, 2, 2, 2]
                    })
                }));
                userSource.addFeature(feature);
            });

        } catch (err) {
            console.error("Failed to fetch nearby users:", err);
        }
    }, [radius, userSource, user]);

    // Initial Map Setup (Run ONCE)
    useEffect(() => {
        // Default Center (Vijayawada/AP)
        const initialCenter = fromLonLat([80.6480, 16.5062]);

        const initialMap = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({ source: new OSM() }),
                new VectorLayer({ source: userSource, zIndex: 10 }),
                new VectorLayer({ source: selfSource, zIndex: 5 }) // Radius/Self layer
            ],
            view: new View({
                center: initialCenter,
                zoom: 9
            })
        });

        setMap(initialMap);

        // Click Handler for Pins
        initialMap.on('click', (e) => {
            const feature = initialMap.forEachFeatureAtPixel(e.pixel, (f) => f);
            if (feature && feature.get('type') === 'user') {
                setSelectedUser(feature.get('data'));
            } else {
                setSelectedUser(null);
            }
        });

        // Listen for map move end to re-fetch users? 
        initialMap.on('moveend', () => {
            const center = toLonLat(initialMap.getView().getCenter());
            // Debounce this inside fetchNearbyUsers or here? 
            // Ideally we shouldn't spam the API. 
            // For now, let's rely on manual refresh or radius change, 
            // but user requested "Global Connection philosophy".
            // Let's call it but maybe userSource limits flickering.
            fetchNearbyUsers(center[1], center[0]);
        });

        return () => initialMap.setTarget(null);
    }, []); // Empty dependency array to fix Ocean Reset Bug

    // Handle User Location Updates & Radius Circle
    useEffect(() => {
        if (!map || !user || !user.location || !user.location.coordinates) return;

        const [lng, lat] = user.location.coordinates;
        const userCoord = fromLonLat([lng, lat]);

        // Clear previous self markers
        selfSource.clear();

        // 1. My Location Marker (Blue)
        const selfFeature = new Feature({
            geometry: new Point(userCoord)
        });
        selfFeature.setStyle(new Style({
            image: new Circle({
                radius: 10,
                fill: new Fill({ color: '#2196f3' }), // Blue
                stroke: new Stroke({ color: 'white', width: 3 })
            })
        }));
        selfSource.addFeature(selfFeature);

        // 2. Radius Circle
        // OpenLayers Circle geometry is in map projection units (meters if View is generic, depends).
        // Since we are using EPSG:3857 (Web Mercator) from OSM, Circle radius is tricky near poles.
        // Best approach: Use a circular polygon or adjust radius resolution.
        // Simple approach: Tissot's indicatrix approximation or just geometry.Circle with transformation?
        // Let's use ol/geom/Circle with proper projection handling or draw a polygon approximation.
        // Actually, creating a circle in LonLat and transforming it is standard.
        // However, ol.geom.Circle takes radius in projection units.
        // 1 meter at equator is approx 1 unit in 3857.
        // Let's use `circular` from `ol/geom/Polygon` if available or approximation.
        // For simplicity in this fix, we will use a rough approximation: radius * 1000 meters
        // Note: In Web Mercator, meters distortion increases with latitude.
        // A better way is to make a circular polygon.

        // Let's try simple Circle first, recognizing it might be slightly distorted.
        // Radius in meters / resolution at latitude.
        const metersPerUnit = map.getView().getProjection().getMetersPerUnit();
        // This is complex. Let's use a simpler visual for now or just the pin.
        // User requested "Radius Circle".
        // Let's try drawing a feature with a style that is a circle, but that's fixed pixels.
        // We need a geometry circle.

        // Simplified:
        const circleParams = {
            center: userCoord,
            radius: radius * 1000 // This is technically in map units, which is roughly meters at equator.
        };
        // Adjustment factor for latitude: 1 / cos(lat)
        const scale = 1 / Math.cos(lat * Math.PI / 180);

        const circleFeature = new Feature({
            geometry: new Circle(userCoord, (radius * 1000) * scale) // Adjust for latitude distortion
        });
        circleFeature.setStyle(new Style({
            fill: new Fill({ color: 'rgba(33, 150, 243, 0.1)' }), // Blue with 0.1 opacity
            stroke: new Stroke({ color: '#2196f3', width: 1 })
        }));
        selfSource.addFeature(circleFeature);

        // Center map on user ONLY on first load or explicit request
        // map.getView().animate({ center: userCoord, zoom: 11 }); // Removed to prevent "Ocean Bug" causing forced jumps

        // Fetch users around ME initially
        fetchNearbyUsers(lat, lng);

    }, [map, user, radius, selfSource, fetchNearbyUsers]);

    // Socket for Chat
    useEffect(() => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'; // Make sure port matches
        socketRef.current = io(apiUrl, { withCredentials: true });
        setSocketReady(true);

        if (user) {
            socketRef.current.emit('register_user', user._id || user.id);
        }

        socketRef.current.on('chat_request', ({ from, fromName, roomId }) => {
            setChatTarget({
                _id: from,
                displayName: fromName || 'User',
                roomId: roomId
            });
            socketRef.current.emit('accept_chat', { roomId });
        });

        return () => socketRef.current.disconnect();
    }, [user]);

    // Search Logic
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
        map.getView().animate({ center: coord, zoom: 12 });
        setSuggestions([]);
        setSearchQuery(place.display_name.split(',')[0]);
        // Trigger fetch
        fetchNearbyUsers(lat, lon);
    };

    const handleStartChat = () => {
        if (selectedUser) {
            setChatTarget(selectedUser);
            setSelectedUser(null);
        }
    };

    return (
        <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Search Bar */}
            <Box sx={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100, width: '90%', maxWidth: 400 }}>
                <Paper component="form" sx={{ p: '2px 4px', display: 'flex', alignItems: 'center' }} onSubmit={(e) => e.preventDefault()}>
                    <InputBase sx={{ ml: 1, flex: 1 }} placeholder="Search Location" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <IconButton type="button" sx={{ p: '10px' }}> <Search /> </IconButton>
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

            {/* Radius Slider Control */}
            <Paper sx={{
                position: 'absolute',
                bottom: 30,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                width: '80%',
                maxWidth: 400,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                    Discovery Radius: {radius} km
                </Typography>
                <Slider
                    value={radius}
                    onChange={(e, newVal) => setRadius(newVal)}
                    onChangeCommitted={(e, newVal) => {
                        // Re-fetch when slider stops moving
                        if (map) {
                            const center = toLonLat(map.getView().getCenter());
                            fetchNearbyUsers(center[1], center[0]);
                        }
                    }}
                    min={1}
                    max={10}
                    step={1}
                    valueLabelDisplay="auto"
                    marks={[
                        { value: 1, label: '1km' },
                        { value: 5, label: '5km' },
                        { value: 10, label: '10km' },
                    ]}
                />
            </Paper>

            <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>

            {/* User Popover */}
            {selectedUser && (
                <Paper sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 200, p: 3, minWidth: 300, textAlign: 'center', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Avatar src={selectedUser.profilePhoto} sx={{ width: 64, height: 64 }} />
                        <Typography variant="h5">{selectedUser.displayName}</Typography>
                        {selectedUser.bio && <Typography variant="body2" color="text.secondary">{selectedUser.bio}</Typography>}
                    </Box>
                    <Box sx={{ mt: 1, mb: 3 }}>
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>Interests</Typography>
                        {selectedUser.interests && selectedUser.interests.map((int, i) => (
                            <Typography key={i} variant="caption" sx={{ display: 'inline-block', bgcolor: '#e0f7fa', borderRadius: 1, px: 1, mx: 0.5, my: 0.2 }}>
                                {int.name || int}
                            </Typography>
                        ))}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <Button variant="contained" startIcon={<MessageSquare size={16} />} onClick={handleStartChat}>
                            Chat
                        </Button>
                        <Button variant="outlined" onClick={() => setSelectedUser(null)}>Close</Button>
                    </Box>
                </Paper>
            )}

            {/* Chat Overlay */}
            {chatTarget && socketReady && (
                <ChatOverlay
                    socket={socketRef.current}
                    user={user}
                    targetUser={chatTarget}
                    onClose={() => setChatTarget(null)}
                />
            )}

            <IconButton sx={{ position: 'absolute', bottom: 120, right: 20, bgcolor: 'white' }} onClick={() => {
                navigator.geolocation.getCurrentPosition((pos) => {
                    if (map) {
                        map.getView().animate({ center: fromLonLat([pos.coords.longitude, pos.coords.latitude]), zoom: 12 });
                        fetchNearbyUsers(pos.coords.latitude, pos.coords.longitude);
                    }
                });
            }}>
                <Crosshair color="#1976d2" />
            </IconButton>
        </Box>
    );
};

export default MapComponent;
