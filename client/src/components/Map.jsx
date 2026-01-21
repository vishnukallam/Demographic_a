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
import api from '../api';
import { Box, Paper, InputBase, IconButton, List, ListItem, ListItemText, Divider, Popover, Typography, Button, Snackbar, Alert } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { AuthContext } from '../context/AuthContext';

const MapComponent = () => {
    const mapRef = useRef();
    const [map, setMap] = useState(null);
    const [markerSource] = useState(new VectorSource()); // User location / Search result
    const [userSource] = useState(new VectorSource()); // Nearby users
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const { user } = useContext(AuthContext);

    // Error Handling State
    const [errorMsg, setErrorMsg] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    // Popover State
    const [popoverContent, setPopoverContent] = useState(null);

    const handleGeolocationError = (error) => {
        console.error("Geolocation error:", error);
        let msg = "Could not retrieve your location.";
        if (error.code === 1) msg = "Location permission denied. Please enable location services.";
        else if (error.code === 2) msg = "Location unavailable.";
        else if (error.code === 3) msg = "Location request timed out.";
        setErrorMsg(msg);
        setSnackbarOpen(true);
    };

    // Initialize Map
    useEffect(() => {
        const initialMap = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({ source: new OSM() }),
                new VectorLayer({
                    source: markerSource,
                    zIndex: 10
                }),
                new VectorLayer({
                    source: userSource,
                    zIndex: 5
                })
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
                const userData = feature.get('data');
                setPopoverContent(userData);
            }
        });

        // Initial Geolocation
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                const coord = fromLonLat([longitude, latitude]);
                initialMap.getView().animate({ center: coord, zoom: 14 });

                // Add "You" marker
                const youFeature = new Feature({
                    geometry: new Point(coord)
                });
                youFeature.setStyle(new Style({
                    image: new Circle({
                        radius: 8,
                        fill: new Fill({ color: '#2e7d32' }),
                        stroke: new Stroke({ color: 'white', width: 2 })
                    }),
                    text: new Text({
                        text: 'You',
                        offsetY: -15,
                        font: 'bold 12px sans-serif',
                        fill: new Fill({ color: '#2e7d32' }),
                        stroke: new Stroke({ color: 'white', width: 2 })
                    })
                }));
                markerSource.addFeature(youFeature);

            }, handleGeolocationError, { enableHighAccuracy: true, timeout: 5000 });
        } else {
            setErrorMsg("Geolocation is not supported by your browser.");
            setSnackbarOpen(true);
        }

        return () => initialMap.setTarget(null);
    }, []);

    // Fetch Nearby Users
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await api.get('/api/user/nearby');
                userSource.clear();

                res.data.forEach(u => {
                    if (u.location && u.location.coordinates && u._id !== user?._id) {
                        const [lon, lat] = u.location.coordinates;
                        const feature = new Feature({
                            geometry: new Point(fromLonLat([lon, lat])),
                            type: 'user',
                            data: u // Attach user data
                        });

                        // Dynamic Style based on Auth
                        const color = user ? '#1976d2' : '#757575'; // Blue if logged in, Grey if guest

                        feature.setStyle(new Style({
                            image: new Circle({
                                radius: 8,
                                fill: new Fill({ color: color }),
                                stroke: new Stroke({ color: 'white', width: 2 })
                            }),
                            text: new Text({
                                text: user ? (u.name || 'User') : 'Guest', // Hide name if not logged in
                                offsetY: -15,
                                font: '12px sans-serif',
                                fill: new Fill({ color: '#333' }),
                                backgroundFill: new Fill({ color: 'rgba(255,255,255,0.8)' }),
                                padding: [2, 2, 2, 2]
                            })
                        }));

                        userSource.addFeature(feature);
                    }
                });
            } catch (err) {
                console.error("Error fetching users:", err);
            }
        };

        if (map) {
            fetchUsers();
            const interval = setInterval(fetchUsers, 10000);
            return () => clearInterval(interval);
        }
    }, [map, user, userSource]);

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

        // Add Marker
        const feature = new Feature({
             geometry: new Point(coord)
        });
        feature.setStyle(new Style({
             image: new Icon({
                anchor: [0.5, 1],
                src: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
                scale: 0.05,
            })
        }));

        // Clear previous search markers (keep 'You' marker if implementing distinct sources/layers or filtering)
        // For simplicity, we just add to the same source. Ideally, 'You' marker should be separate.
        markerSource.addFeature(feature);

        setSuggestions([]);
        setSearchQuery(place.display_name.split(',')[0]); // Shorten name
    };

    // Live Location Update (Logged In Only)
    useEffect(() => {
        if ("geolocation" in navigator && user) {
            const watchId = navigator.geolocation.watchPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    await api.post('/api/user/location', { latitude, longitude });
                } catch(err) {
                    // silent fail
                }
            }, null, { enableHighAccuracy: true });
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, [user]);

    return (
        <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>

            {/* Search Bar */}
            <Box sx={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                width: '90%',
                maxWidth: 400
            }}>
                <Paper
                    component="form"
                    sx={{ p: '2px 4px', display: 'flex', alignItems: 'center' }}
                    onSubmit={(e) => e.preventDefault()}
                >
                    <InputBase
                        sx={{ ml: 1, flex: 1 }}
                        placeholder="Search Location"
                        inputProps={{ 'aria-label': 'search location' }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <IconButton type="button" sx={{ p: '10px' }} aria-label="search">
                        <SearchIcon />
                    </IconButton>
                </Paper>

                {/* Suggestions List */}
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

            {/* Map Container */}
            <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>

            {/* User Info Card (Overlay) */}
            {popoverContent && (
                <Paper sx={{
                    position: 'absolute',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100,
                    p: 2,
                    minWidth: 250,
                    textAlign: 'center'
                }}>
                    {user ? (
                        <>
                            <Typography variant="h6">{popoverContent.name}</Typography>
                            <Typography variant="body2" color="text.secondary">{popoverContent.about || "No bio available."}</Typography>
                            <Box sx={{ mt: 1 }}>
                                {popoverContent.interests && popoverContent.interests.map((int, i) => (
                                    <Typography key={i} variant="caption" sx={{ display: 'inline-block', bgcolor: '#eee', borderRadius: 1, px: 1, mr: 0.5 }}>
                                        {typeof int === 'string' ? int : int.name}
                                    </Typography>
                                ))}
                            </Box>
                        </>
                    ) : (
                        <>
                            <Typography variant="h6">User Nearby</Typography>
                            <Typography variant="body2" color="text.secondary">Login to see who this is!</Typography>
                            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                                Interests: {popoverContent.interests?.length || 0}
                            </Typography>
                        </>
                    )}
                    <Button size="small" onClick={() => setPopoverContent(null)} sx={{ mt: 1 }}>Close</Button>
                </Paper>
            )}

            {/* Floating 'My Location' Button */}
            <IconButton
                sx={{ position: 'absolute', bottom: 20, right: 20, bgcolor: 'white', '&:hover': { bgcolor: '#f5f5f5' } }}
                onClick={() => {
                     if ("geolocation" in navigator) {
                        navigator.geolocation.getCurrentPosition((position) => {
                            const { latitude, longitude } = position.coords;
                            if (map) {
                                map.getView().animate({ center: fromLonLat([longitude, latitude]), zoom: 14 });
                            }
                        }, handleGeolocationError, { enableHighAccuracy: true, timeout: 5000 });
                     } else {
                         setErrorMsg("Geolocation is not supported.");
                         setSnackbarOpen(true);
                     }
                }}
            >
                <MyLocationIcon color="primary" />
            </IconButton>

            {/* Error Notification */}
            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
                <Alert onClose={() => setSnackbarOpen(false)} severity="error" sx={{ width: '100%' }}>
                    {errorMsg}
                </Alert>
            </Snackbar>

        </Box>
    );
};

export default MapComponent;
