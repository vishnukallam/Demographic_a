import React, { useEffect, useRef, useState, useCallback, useContext, createContext } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { Point, Circle as GeomCircle, LineString } from 'ol/geom';
import { Style, Circle as StyleCircle, Fill, Stroke, Text } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Box, Paper, InputBase, IconButton, List, ListItem, ListItemText, Divider, Typography, Button, Avatar, Slider, Snackbar, Alert, Switch, useTheme, Fab } from '@mui/material';
import { Search, Crosshair, MessageSquare, Globe, Palette, Navigation, User } from 'lucide-react';
import { useSelector } from 'react-redux';
import io from 'socket.io-client';
import ChatOverlay from './ChatOverlay';
import api from '../utils/api';
import { ColorModeContext } from '../App';
import Polyline from 'ol/format/Polyline'; // For OSRM decoding if needed, or manual parsing

// --- Map Context & Controller ---
const MapContext = createContext(null);

const MapController = ({ center, zoom, active }) => {
    const { map } = useContext(MapContext);

    useEffect(() => {
        if (!map || !center || !active) return;
        // FlyTo animation for smoother transitions
        map.getView().animate({
            center: center,
            zoom: zoom || 12,
            duration: 1500, // Smooth fly
            easing: (t) => t // Linear for now, or import easeOut
        });
    }, [map, center, zoom, active]);

    return null;
};

// --- Main Map Component ---
const MapComponent = () => {
    const mapRef = useRef();
    const [map, setMap] = useState(null);
    const [userSource] = useState(new VectorSource());
    const [selfSource] = useState(new VectorSource());
    const [routeSource] = useState(new VectorSource()); // Layer for Navigation Route

    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [radius, setRadius] = useState(10);
    const [showGlobalAlert, setShowGlobalAlert] = useState(false);
    const [showGlobalUsers, setShowGlobalUsers] = useState(false);

    // Controller State
    const [viewState, setViewState] = useState({ center: fromLonLat([80.6480, 16.5062]), zoom: 9, active: false });

    // Routing State
    const [myLocation, setMyLocation] = useState(null); // {lat, lng}

    const { user } = useSelector(state => state.auth);
    const socketRef = useRef(null);
    const [socketReady, setSocketReady] = useState(false);

    // Theme
    const theme = useTheme();
    const { toggleColorMode, setAccent, mode } = useContext(ColorModeContext);

    // Interaction State
    const [selectedUser, setSelectedUser] = useState(null);
    const [chatTarget, setChatTarget] = useState(null);

    // --- Helpers ---
    const checkInterestMatch = (userInterests, myInterests) => {
        if (!userInterests || !myInterests) return false;
        const set1 = new Set(myInterests.map(i => typeof i === 'string' ? i : i.name));
        return userInterests.some(i => set1.has(typeof i === 'string' ? i : i.name));
    };

    // --- OSRM Navigation ---
    const handleNavigate = async (targetLeg) => { // targetLeg: {lat, lng}
        if (!myLocation || !targetLeg) return;

        try {
            // Un-hide if needed (logic to clear route?)
            routeSource.clear();

            // OSRM Public API (Demo server)
            // Coordinates in OSRM are {lon},{lat};{lon},{lat}
            const start = `${myLocation.lng},${myLocation.lat}`;
            const end = `${targetLeg.lng},${targetLeg.lat}`;
            const url = `https://router.project-osrm.org/route/v1/walking/${start};${end}?overview=full&geometries=geojson`;

            const resp = await fetch(url);
            const data = await resp.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates; // [[lon, lat], ...]

                // Convert to Map Projection
                const projectedCoords = coordinates.map(coord => fromLonLat(coord));

                const routeFeature = new Feature({
                    geometry: new LineString(projectedCoords)
                });

                routeFeature.setStyle(new Style({
                    stroke: new Stroke({
                        color: theme.palette.primary.main,
                        width: 5,
                        lineDash: [10, 10] // Walking path style
                    })
                }));

                routeSource.addFeature(routeFeature);

                // Zoom to fit route
                const extent = routeFeature.getGeometry().getExtent();
                map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 1000 });

                setSelectedUser(null); // Close popover to show route
            }
        } catch (e) {
            console.error("Routing Error", e);
            alert("Could not fetch walking path.");
        }
    };

    // --- Fetch Users ---
    const fetchNearbyUsers = useCallback(async (centerLat, centerLng, forceGlobal = false) => {
        if (!centerLat || !centerLng) return;
        try {
            let users = [];
            if (!forceGlobal) {
                const res = await api.get('/api/users/nearby', {
                    params: { lat: centerLat, lng: centerLng, radius: radius, interests: 'all' }
                });
                users = res.data;
            }

            if (users.length === 0) {
                if (!forceGlobal) setShowGlobalAlert(true);
                const resGlobal = await api.get('/api/users/global');
                users = resGlobal.data;
            } else {
                setShowGlobalAlert(false);
            }

            userSource.clear();
            users.forEach(u => {
                if (!u.location?.coordinates) return;
                const [lng, lat] = u.location.coordinates;

                // Filter Logic
                const isMatch = user && checkInterestMatch(u.interests, user.interests);
                if (!showGlobalUsers && !isMatch) return;

                const isOnline = u.lastLogin && (new Date() - new Date(u.lastLogin)) < (15 * 60 * 1000);

                // Marker Styling (Material You Colors)
                let fillColor = theme.palette.text.disabled;
                let strokeColor = theme.palette.background.paper;

                if (isOnline) {
                    fillColor = isMatch ? theme.palette.primary.main : theme.palette.warning.main;
                } else {
                    fillColor = theme.palette.action.disabledBackground; // Grey
                }

                const feature = new Feature({
                    geometry: new Point(fromLonLat([lng, lat])),
                    type: 'user',
                    data: u
                });

                feature.setStyle(new Style({
                    image: new StyleCircle({
                        radius: 10, // Slightly larger
                        fill: new Fill({ color: fillColor }),
                        stroke: new Stroke({ color: strokeColor, width: 3 })
                    }),
                    // Only show name on hover or close zoom ideally, but keeping it for now
                    text: new Text({
                        text: u.displayName,
                        offsetY: -22,
                        font: '600 12px "Roboto Flex"',
                        fill: new Fill({ color: theme.palette.text.primary }),
                        stroke: new Stroke({ color: theme.palette.background.paper, width: 3 }),
                        scale: 1
                    })
                }));
                userSource.addFeature(feature);
            });

        } catch (err) {
            console.error("Fetch Error:", err);
        }
    }, [radius, userSource, user, showGlobalUsers, theme]);

    // --- Initialization ---
    useEffect(() => {
        // Initialize Map ONCE
        const initialMap = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({
                    source: new OSM(),
                    className: 'map-tile-layer'
                }),
                new VectorLayer({ source: routeSource, zIndex: 1 }), // Route below users
                new VectorLayer({ source: selfSource, zIndex: 5 }),
                new VectorLayer({ source: userSource, zIndex: 10 })
            ],
            view: new View({
                center: fromLonLat([80.6480, 16.5062]),
                zoom: 9
            }),
            controls: [] // Custom controls only
        });

        setMap(initialMap);

        // Click Handler
        initialMap.on('click', (e) => {
            const feature = initialMap.forEachFeatureAtPixel(e.pixel, f => f);
            if (feature && feature.get('type') === 'user') {
                setSelectedUser(feature.get('data'));
            } else {
                setSelectedUser(null);
            }
        });

        // Move End Handler for refreshing search results if needed
        initialMap.on('moveend', () => {
            // Optional: Refetch users on drag? 
            // Currently users are fetched based on "My Location" or "Search Location"
        });

        return () => initialMap.setTarget(null);
    }, []);

    // --- Location Tracking & Updates ---
    useEffect(() => {
        if (navigator.geolocation && user && map) {
            const watchId = navigator.geolocation.watchPosition((pos) => {
                const { latitude, longitude } = pos.coords;
                setMyLocation({ lat: latitude, lng: longitude });

                // Socket Update
                if (socketRef.current?.connected) {
                    socketRef.current.emit('update_location', { lat: latitude, lng: longitude });
                }

                // Update Self Marker & Radius
                const userCoord = fromLonLat([longitude, latitude]);
                selfSource.clear();

                const selfFeature = new Feature({ geometry: new Point(userCoord) });
                selfFeature.setStyle(new Style({
                    image: new StyleCircle({
                        radius: 14,
                        fill: new Fill({ color: theme.palette.primary.main }),
                        stroke: new Stroke({ color: '#fff', width: 4 })
                    })
                }));
                selfSource.addFeature(selfFeature);

                // Radius Circle (Themed)
                const scale = 1 / Math.cos(latitude * Math.PI / 180);
                const circleFeature = new Feature({
                    geometry: new GeomCircle(userCoord, (radius * 1000) * scale)
                });
                circleFeature.setStyle(new Style({
                    fill: new Fill({ color: theme.palette.primary.main + '33' }), // 20% opacity hex
                    stroke: new Stroke({ color: theme.palette.primary.main, width: 1, lineDash: [5, 5] })
                }));
                selfSource.addFeature(circleFeature);

                // Initial fetch
                fetchNearbyUsers(latitude, longitude);

            }, (err) => console.warn(err), { enableHighAccuracy: true });

            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, [map, user, radius, theme, fetchNearbyUsers]);

    // Update fetch when radius/filter changes
    useEffect(() => {
        if (myLocation) fetchNearbyUsers(myLocation.lat, myLocation.lng);
    }, [radius, showGlobalUsers, fetchNearbyUsers, myLocation]);

    // Socket Setup
    useEffect(() => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        socketRef.current = io(apiUrl, { withCredentials: true });
        setSocketReady(true);
        if (user) socketRef.current.emit('register_user', user._id || user.id);
        socketRef.current.on('chat_request', ({ from, fromName, roomId }) => {
            setChatTarget({ _id: from, displayName: fromName || 'User', roomId: roomId });
            socketRef.current.emit('accept_chat', { roomId });
        });
        return () => socketRef.current.disconnect();
    }, [user]);

    // Handlers
    const handleSelectLocation = (place) => {
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);
        setViewState({ center: fromLonLat([lon, lat]), zoom: 12, active: true });
        setSuggestions([]);
        setSearchQuery(place.display_name.split(',')[0]);
        // Also fetch users at this new "virtual" location?
        fetchNearbyUsers(lat, lon);
    };

    const handleCenterOnMe = () => {
        if (myLocation) {
            setViewState({ center: fromLonLat([myLocation.lng, myLocation.lat]), zoom: 14, active: true });
        }
    };

    return (
        <MapContext.Provider value={{ map }}>
            <Box sx={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>

                {/* Controller Logic */}
                <MapController center={viewState.center} zoom={viewState.zoom} active={viewState.active} />

                {/* 1. Theme & Settings Panel */}
                <Paper elevation={0} sx={{
                    position: 'absolute', top: 20, right: 20, zIndex: 50, p: 2,
                    display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start',
                    backdropFilter: 'blur(20px)', bgcolor: 'background.paper', borderRadius: 4,
                    border: '1px solid', borderColor: 'divider'
                }}>
                    <Switch
                        checked={showGlobalUsers}
                        onChange={(e) => setShowGlobalUsers(e.target.checked)}
                        sx={{ ml: 'auto' }}
                    />
                    <Typography variant="caption" sx={{ mt: -1, ml: 'auto', display: 'block' }}>
                        {showGlobalUsers ? 'Global View' : 'Relevant Only'}
                    </Typography>

                    <Divider flexItem />

                    {/* Color Picker */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {['blue', 'green', 'violet', 'orange'].map(c => (
                            <Box key={c} onClick={() => setAccent(c)} sx={{
                                width: 16, height: 16, borderRadius: '50%', cursor: 'pointer',
                                bgcolor: c === 'blue' ? '#3b82f6' : c === 'green' ? '#22c55e' : c === 'violet' ? '#8b5cf6' : '#f97316',
                                boxShadow: user?.accent === c ? '0 0 0 2px white, 0 0 0 4px ' + c : 'none'
                            }} />
                        ))}
                    </Box>

                    <Button
                        size="small"
                        fullWidth
                        startIcon={<Palette size={14} />}
                        onClick={toggleColorMode}
                        sx={{ mt: 1, borderRadius: 20, fontSize: '0.75rem' }}
                    >
                        {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </Button>
                </Paper>

                {/* 2. Search Bar */}
                <Box sx={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 50, width: '90%', maxWidth: 360 }}>
                    <Paper component="form" elevation={4} sx={{
                        p: '4px 12px', display: 'flex', alignItems: 'center', borderRadius: 28, height: 56
                    }} onSubmit={(e) => e.preventDefault()}>
                        <Search size={20} color={theme.palette.text.secondary} />
                        <InputBase
                            sx={{ ml: 2, flex: 1, fontWeight: 500 }}
                            placeholder="Find a place..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)} // ToDo: Add Debounced Autocomplete logic again
                        />
                    </Paper>
                </Box>

                {/* 3. Bottom Controls (Radius & Recenter) */}
                <Paper elevation={4} sx={{
                    position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 50,
                    width: 'auto', minWidth: 280, p: 2, px: 4, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2
                }}>
                    <Typography variant="body2" fontWeight="bold" noWrap>
                        {radius} km
                    </Typography>
                    <Slider
                        value={radius}
                        onChange={(e, v) => setRadius(v)}
                        min={1} max={50}
                        sx={{ width: 150 }}
                    />
                </Paper>

                <Fab
                    color="primary"
                    aria-label="my-location"
                    onClick={handleCenterOnMe}
                    sx={{ position: 'absolute', bottom: 32, right: 32, zIndex: 50 }}
                >
                    <Crosshair />
                </Fab>


                {/* Map Container */}
                <div ref={mapRef} style={{ width: '100%', height: '100%', filter: mode === 'dark' ? 'grayscale(100%) invert(100%) contrast(90%) brightness(120%) hue-rotate(180deg)' : 'none' }} />


                {/* 4. User Detail Card (Glassmorphism) */}
                {selectedUser && (
                    <Paper elevation={24} sx={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100,
                        width: 320, p: 4, borderRadius: 6,
                        background: mode === 'dark' ? 'rgba(30,30,45,0.85)' : 'rgba(255,255,255,0.85)',
                        backdropFilter: 'blur(16px)',
                        textAlign: 'center',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        <Avatar
                            src={selectedUser.profilePhoto}
                            sx={{ width: 96, height: 96, mx: 'auto', mb: 2, border: `4px solid ${theme.palette.background.paper}`, boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}
                        />
                        <Typography variant="h5" fontWeight="800" gutterBottom>
                            {selectedUser.displayName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontStyle: 'italic' }}>
                            {selectedUser.bio || "No bio available"}
                        </Typography>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, mb: 4 }}>
                            {selectedUser.interests?.map((int, i) => (
                                <Box key={i} sx={{
                                    px: 1.5, py: 0.5, borderRadius: 2,
                                    bgcolor: theme.palette.action.hover,
                                    fontSize: '0.75rem', fontWeight: 600, color: theme.palette.text.primary
                                }}>
                                    {typeof int === 'string' ? int : int.name}
                                </Box>
                            ))}
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                            {/* Navigation Button */}
                            <Button
                                variant="contained"
                                color="secondary"
                                sx={{ borderRadius: 4, minWidth: 50, px: 2 }}
                                onClick={() => handleNavigate({
                                    lat: selectedUser.location.coordinates[1],
                                    lng: selectedUser.location.coordinates[0]
                                })}
                            >
                                <Navigation size={20} />
                            </Button>

                            <Button
                                variant="contained"
                                startIcon={<MessageSquare size={18} />}
                                onClick={() => { setChatTarget(selectedUser); setSelectedUser(null); }}
                                sx={{ borderRadius: 100, flex: 1 }}
                            >
                                Connect
                            </Button>
                        </Box>

                        <IconButton
                            onClick={() => setSelectedUser(null)}
                            sx={{ position: 'absolute', top: 8, right: 8, color: 'text.disabled' }}
                        >
                            <Box component="span" sx={{ fontSize: 24 }}>&times;</Box>
                        </IconButton>
                    </Paper>
                )}

                {/* Chat */}
                {chatTarget && socketReady && (
                    <ChatOverlay
                        socket={socketRef.current}
                        user={user}
                        targetUser={chatTarget}
                        onClose={() => setChatTarget(null)}
                    />
                )}
            </Box>
        </MapContext.Provider>
    );
};

export default MapComponent;
