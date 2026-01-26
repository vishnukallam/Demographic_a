import React, { useEffect, useRef, useState } from 'react';
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
import { fromLonLat } from 'ol/proj';
import { Box, Paper, InputBase, IconButton, List, ListItem, ListItemText, Divider, Typography, Button, Avatar } from '@mui/material';
import { Search, Crosshair, MessageSquare } from 'lucide-react';
import { useSelector } from 'react-redux';
import io from 'socket.io-client';
import ChatOverlay from './ChatOverlay';

// Helper for distance (Haversine)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = deg2rad(lat2-lat1);
  var dLon = deg2rad(lon2-lon1);
  var a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

const MapComponent = () => {
    const mapRef = useRef();
    const [map, setMap] = useState(null);
    const [userSource] = useState(new VectorSource());
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);

    const { user } = useSelector(state => state.auth);
    const socketRef = useRef(null);
    const [socketReady, setSocketReady] = useState(false);
    const lastUpdateRef = useRef({ lat: 0, lng: 0, time: 0 });

    // Popover State
    const [selectedUser, setSelectedUser] = useState(null);
    // Chat State
    const [chatTarget, setChatTarget] = useState(null);

    useEffect(() => {
        // Socket Connection
        const apiUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
        socketRef.current = io(apiUrl, { withCredentials: true });
        setSocketReady(true);

        if (user) {
            // Register with User ID (MongoDB _id)
            socketRef.current.emit('register_user', user._id || user.id);
        }

        socketRef.current.on('nearby_users', (nearbyUsers) => {
            userSource.clear();
            nearbyUsers.forEach(u => {
                if (!u.location || !u.location.coordinates) return;
                const [lng, lat] = u.location.coordinates;

                const feature = new Feature({
                    geometry: new Point(fromLonLat([lng, lat])),
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
                        text: u.displayName,
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

        socketRef.current.on('chat_request', ({ from, fromName, roomId }) => {
            // from is userId
            // We need a user object for ChatOverlay.
            // Ideally we should fetch user details or have them passed.
            // Simplified: create a temp object.
            setChatTarget({
                _id: from,
                displayName: fromName || 'User',
                roomId: roomId
            });
            socketRef.current.emit('accept_chat', { roomId });
        });

        return () => socketRef.current.disconnect();
    }, [user, userSource]);

    // Initialize Map
    useEffect(() => {
        // Center on Vijayawada, AP initially
        const initialCenter = fromLonLat([80.6480, 16.5062]);

        const initialMap = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({ source: new OSM() }),
                new VectorLayer({ source: userSource, zIndex: 10 })
            ],
            view: new View({
                center: initialCenter,
                zoom: 7 // Zoomed out to see AP
            })
        });

        setMap(initialMap);

        // Click Handler
        initialMap.on('click', (e) => {
            const feature = initialMap.forEachFeatureAtPixel(e.pixel, (f) => f);
            if (feature && feature.get('type') === 'user') {
                setSelectedUser(feature.get('data'));
            } else {
                setSelectedUser(null);
            }
        });

        // Geolocation
        if ("geolocation" in navigator && user) {
            const watchId = navigator.geolocation.watchPosition((position) => {
                const { latitude, longitude } = position.coords;

                // Throttling Logic
                const now = Date.now();
                const dist = getDistanceFromLatLonInKm(
                    lastUpdateRef.current.lat,
                    lastUpdateRef.current.lng,
                    latitude,
                    longitude
                );

                // Update if > 100m moved OR > 30s elapsed
                if (dist > 0.1 || (now - lastUpdateRef.current.time) > 30000) {
                    if (socketRef.current) {
                        socketRef.current.emit('update_location', { lat: latitude, lng: longitude });
                        lastUpdateRef.current = { lat: latitude, lng: longitude, time: now };
                    }
                }
            }, (error) => {
                console.warn("Geolocation warning:", error.message);
            }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 });

            // Initial center if location found
            navigator.geolocation.getCurrentPosition((pos) => {
                initialMap.getView().animate({
                    center: fromLonLat([pos.coords.longitude, pos.coords.latitude]),
                    zoom: 14
                });
            }, (err) => {
                console.warn("Initial location fetch failed:", err.message);
            }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 });

            return () => navigator.geolocation.clearWatch(watchId);
        }

        return () => initialMap.setTarget(null);
    }, [userSource, user]);

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
        map.getView().animate({ center: coord, zoom: 14 });
        setSuggestions([]);
        setSearchQuery(place.display_name.split(',')[0]);
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

            <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>

            {/* User Popover */}
            {selectedUser && (
                <Paper sx={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100, p: 2, minWidth: 250, textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                        <Avatar src={selectedUser.profilePhoto} />
                        <Typography variant="h6">{selectedUser.displayName}</Typography>
                    </Box>
                    <Box sx={{ mt: 1, mb: 2 }}>
                        {selectedUser.interests && selectedUser.interests.map((int, i) => (
                            <Typography key={i} variant="caption" sx={{ display: 'inline-block', bgcolor: '#e0f7fa', borderRadius: 1, px: 1, mr: 0.5 }}>
                                {int.name || int}
                            </Typography>
                        ))}
                    </Box>
                    <Button variant="contained" startIcon={<MessageSquare size={16} />} size="small" onClick={handleStartChat}>
                        Chat
                    </Button>
                    <Button size="small" onClick={() => setSelectedUser(null)} sx={{ mt: 1, ml: 1 }}>Close</Button>
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

            <IconButton sx={{ position: 'absolute', bottom: 20, right: 20, bgcolor: 'white' }} onClick={() => {
                navigator.geolocation.getCurrentPosition((pos) => {
                    map.getView().animate({ center: fromLonLat([pos.coords.longitude, pos.coords.latitude]), zoom: 14 });
                });
            }}>
                <Crosshair color="#1976d2" />
            </IconButton>
        </Box>
    );
};

export default MapComponent;
