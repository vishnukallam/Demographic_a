import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { Point, Circle as GeomCircle } from 'ol/geom';
import { Style, Circle as StyleCircle, Fill, Stroke, Text } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Box, Paper, InputBase, IconButton, List, ListItem, ListItemText, Divider, Typography, Button, Avatar, Slider, Snackbar, Alert } from '@mui/material';
import { Search, Crosshair, MessageSquare, Globe } from 'lucide-react';
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
    const [radius, setRadius] = useState(10);
    const [showGlobalAlert, setShowGlobalAlert] = useState(false);

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
    const fetchNearbyUsers = useCallback(async (centerLat, centerLng, forceGlobal = false) => {
        if (!centerLat || !centerLng) return;
        try {
            let users = [];

            if (!forceGlobal) {
                const res = await api.get('/api/users/nearby', {
                    params: {
                        lat: centerLat,
                        lng: centerLng,
                        radius: radius,
                        interests: 'all'
                    }
                });
                users = res.data;
            }

            // Fallback to Global if no users found
            if (users.length === 0) {
                if (!forceGlobal) setShowGlobalAlert(true);
                const resGlobal = await api.get('/api/users/global');
                users = resGlobal.data;
            } else {
                setShowGlobalAlert(false);
            }

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
                const color = isMatch ? '#38bdf8' : '#eab308'; // Sky Blue (Match) vs Yellow (Others)

                feature.setStyle(new Style({
                    image: new StyleCircle({
                        radius: 8,
                        fill: new Fill({ color: color }),
                        stroke: new Stroke({ color: '#0f172a', width: 2 })
                    }),
                    text: new Text({
                        text: u.displayName,
                        offsetY: -20,
                        font: 'bold 13px Inter, sans-serif',
                        fill: new Fill({ color: '#fff' }),
                        stroke: new Stroke({ color: '#0f172a', width: 3 })
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
        const initialCenter = fromLonLat([80.6480, 16.5062]);

        const initialMap = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({
                    source: new OSM(),
                    className: 'dark-map-layer' // We will target this in CSS/sx
                }),
                new VectorLayer({ source: userSource, zIndex: 10 }),
                new VectorLayer({ source: selfSource, zIndex: 5 })
            ],
            view: new View({
                center: initialCenter,
                zoom: 9
            })
        });

        // Add CSS filter for Dark Mode Map directly to canvas (easiest way)
        initialMap.on('postrender', () => {
            // Handled via container style below
        });

        setMap(initialMap);

        // Implicit Location Update
        if (navigator.geolocation && user) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords;
                if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('update_location', { lat: latitude, lng: longitude });
                }
                // Center map on load
                initialMap.getView().animate({ center: fromLonLat([longitude, latitude]), zoom: 11 });
                fetchNearbyUsers(latitude, longitude);
            }, (err) => console.error("Location access denied or failed", err));
        }

        /** REMOVE CLICK HANDLER AND MOVEEND HERE TO AVOID DUPLICATES IF RE-RENDERING **/
        /** MOVED OUTSIDE FOR CLARITY OR KEPT IF DEPENDENCIES CORRECT **/
    }, []); // Run once on mount

    // Map Event Listeners (ensure map exists)
    useEffect(() => {
        if (!map) return;

        const clickHandler = (e) => {
            const feature = map.forEachFeatureAtPixel(e.pixel, (f) => f);
            if (feature && feature.get('type') === 'user') {
                setSelectedUser(feature.get('data'));
            } else {
                setSelectedUser(null);
            }
        };

        const moveHandler = () => {
            const center = toLonLat(map.getView().getCenter());
            // Debounce handled by user action or specific triggers usually, but here we update list on drag end
            fetchNearbyUsers(center[1], center[0]);
        };

        map.on('click', clickHandler);
        map.on('moveend', moveHandler);

        return () => {
            map.un('click', clickHandler);
            map.un('moveend', moveHandler);
        };
    }, [map, fetchNearbyUsers]);

    // Handle User Location Updates & Radius Circle
    useEffect(() => {
        if (!map || !user || !user.location || !user.location.coordinates) return;

        const [lng, lat] = user.location.coordinates;
        const userCoord = fromLonLat([lng, lat]);

        selfSource.clear();

        // 1. My Location Marker
        const selfFeature = new Feature({ geometry: new Point(userCoord) });
        selfFeature.setStyle(new Style({
            image: new StyleCircle({
                radius: 12,
                fill: new Fill({ color: '#38bdf8' }), // Sky 400
                stroke: new Stroke({ color: 'white', width: 3 })
            })
        }));
        selfSource.addFeature(selfFeature);

        // 2. Radius Circle
        const scale = 1 / Math.cos(lat * Math.PI / 180);
        const circleFeature = new Feature({
            geometry: new GeomCircle(userCoord, (radius * 1000) * scale)
        });
        circleFeature.setStyle(new Style({
            fill: new Fill({ color: 'rgba(56, 189, 248, 0.1)' }),
            stroke: new Stroke({ color: 'rgba(56, 189, 248, 0.4)', width: 1, lineDash: [10, 10] })
        }));
        selfSource.addFeature(circleFeature);

        // Fetch users around ME initially
        fetchNearbyUsers(lat, lng);

    }, [map, user, radius, selfSource, fetchNearbyUsers]);

    // Socket for Chat
    useEffect(() => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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
            {/* Search Bar - Glass */}
            <Box sx={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100, width: '90%', maxWidth: 400 }}>
                <Paper component="form" sx={{
                    p: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'rgba(30, 41, 59, 0.8)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white'
                }} onSubmit={(e) => e.preventDefault()}>
                    <InputBase
                        sx={{ ml: 1, flex: 1, color: 'white' }}
                        placeholder="Search Location"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <IconButton type="button" sx={{ p: '10px', color: '#38bdf8' }}> <Search /> </IconButton>
                </Paper>
                {suggestions.length > 0 && (
                    <Paper sx={{ mt: 1, maxHeight: 200, overflow: 'auto', bgcolor: '#1e293b', color: 'white' }}>
                        <List dense>
                            {suggestions.map((place) => (
                                <React.Fragment key={place.place_id}>
                                    <ListItem button onClick={() => handleSelectLocation(place)}>
                                        <ListItemText primary={place.display_name} primaryTypographyProps={{ color: 'white' }} />
                                    </ListItem>
                                    <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                                </React.Fragment>
                            ))}
                        </List>
                    </Paper>
                )}
            </Box>

            {/* Radius Slider Control - Glass */}
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
                alignItems: 'center',
                bgcolor: 'rgba(30, 41, 59, 0.8)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4
            }}>
                <Typography variant="body2" sx={{ color: '#38bdf8', fontWeight: 600, mb: 1 }}>
                    Discovery Radius: {radius} km
                </Typography>
                <Slider
                    value={radius}
                    onChange={(e, newVal) => setRadius(newVal)}
                    onChangeCommitted={(e, newVal) => {
                        if (map) {
                            const center = toLonLat(map.getView().getCenter());
                            fetchNearbyUsers(center[1], center[0]);
                        }
                    }}
                    min={1}
                    max={50}
                    step={1}
                    valueLabelDisplay="auto"
                    sx={{ color: '#38bdf8' }}
                />
            </Paper>

            {/* Global Fallback Alert (Snackbar) */}
            <Snackbar open={showGlobalAlert} autoHideDuration={6000} onClose={() => setShowGlobalAlert(false)}>
                <Alert severity="info" sx={{ bgcolor: '#334155', color: 'white' }} icon={<Globe color="#38bdf8" />}>
                    No one nearby? Showing global community.
                </Alert>
            </Snackbar>

            {/* Map Container with Dark Filter */}
            <div ref={mapRef} style={{ width: '100%', height: '100%', filter: 'grayscale(100%) invert(100%) contrast(90%) brightness(120%) hue-rotate(180deg)' }}></div>

            {/* User Popover - Premium Card */}
            {selectedUser && (
                <Paper sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 200,
                    p: 4, minWidth: 320, textAlign: 'center', borderRadius: 4,
                    bgcolor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(56, 189, 248, 0.3)', color: 'white',
                    boxShadow: '0 0 50px rgba(0,0,0,0.5)'
                }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Avatar src={selectedUser.profilePhoto} sx={{ width: 80, height: 80, border: '3px solid #38bdf8' }} />
                        <Typography variant="h5" fontWeight="bold">{selectedUser.displayName}</Typography>
                        {selectedUser.bio && <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>{selectedUser.bio}</Typography>}
                    </Box>
                    <Box sx={{ mt: 1, mb: 3 }}>
                        <Typography variant="caption" display="block" sx={{ color: '#38bdf8', mb: 1, fontWeight: 'bold' }}>INTERESTS</Typography>
                        {selectedUser.interests && selectedUser.interests.map((int, i) => (
                            <Typography key={i} variant="caption" sx={{ display: 'inline-block', bgcolor: 'rgba(56,189,248,0.2)', color: '#38bdf8', borderRadius: 1, px: 1, mx: 0.5, my: 0.2 }}>
                                {int.name || int}
                            </Typography>
                        ))}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <Button variant="contained" startIcon={<MessageSquare size={16} />} onClick={handleStartChat} sx={{ bgcolor: '#38bdf8', color: '#0f172a', fontWeight: 'bold' }}>
                            Chat
                        </Button>
                        <Button variant="outlined" onClick={() => setSelectedUser(null)} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>Close</Button>
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

            <IconButton sx={{ position: 'absolute', bottom: 120, right: 20, bgcolor: '#38bdf8', color: '#0f172a', '&:hover': { bgcolor: '#7dd3fc' } }} onClick={() => {
                navigator.geolocation.getCurrentPosition((pos) => {
                    if (map) {
                        map.getView().animate({ center: fromLonLat([pos.coords.longitude, pos.coords.latitude]), zoom: 12 });
                        fetchNearbyUsers(pos.coords.latitude, pos.coords.longitude);
                    }
                });
            }}>
                <Crosshair />
            </IconButton>
        </Box>
    );
};

export default MapComponent;
