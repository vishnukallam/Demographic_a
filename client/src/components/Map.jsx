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
import { Box, TextField, Button, Paper } from '@mui/material';
import { AuthContext } from '../context/AuthContext';

const MapComponent = () => {
    const mapRef = useRef();
    const [map, setMap] = useState(null);
    const [markerSource] = useState(new VectorSource());
    const [userSource] = useState(new VectorSource()); // For other users
    const [searchQuery, setSearchQuery] = useState('');
    const { user } = useContext(AuthContext);

    useEffect(() => {
        const initialMap = new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({ source: new OSM() }),
                new VectorLayer({
                    source: markerSource, // Search result marker
                    style: new Style({
                         image: new Icon({
                            anchor: [0.5, 1],
                            src: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
                            scale: 0.05,
                        })
                    })
                }),
                new VectorLayer({
                    source: userSource, // Nearby users
                })
            ],
            view: new View({
                center: fromLonLat([-73.935242, 40.730610]), // NYC
                zoom: 12
            })
        });

        setMap(initialMap);

        // Click handler to save location (legacy)
        initialMap.on('click', (e) => {
             const [lon, lat] = toLonLat(e.coordinate);
             saveLocation(lat, lon, e.coordinate);
        });

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
                            name: u.name,
                            id: u._id
                        });

                        // Style for users
                        feature.setStyle(new Style({
                            image: new Circle({
                                radius: 8,
                                fill: new Fill({ color: '#1976d2' }),
                                stroke: new Stroke({ color: 'white', width: 2 })
                            }),
                            text: new Text({
                                text: u.name,
                                offsetY: -15,
                                font: '12px sans-serif',
                                fill: new Fill({ color: '#000' }),
                                backgroundFill: new Fill({ color: 'rgba(255,255,255,0.7)' })
                            })
                        }));

                        userSource.addFeature(feature);
                    }
                });
            } catch (err) {
                console.error(err);
            }
        };

        if (map && user) {
            fetchUsers();
            const interval = setInterval(fetchUsers, 10000); // Poll every 10s
            return () => clearInterval(interval);
        }
    }, [map, user, userSource]);

    // Live Location Tracking
    useEffect(() => {
        if ("geolocation" in navigator && user) {
            const watchId = navigator.geolocation.watchPosition(async (position) => {
                const { latitude, longitude } = position.coords;

                // Update Backend
                try {
                    await api.post('/api/user/location', { latitude, longitude });
                } catch(err) {
                    console.error("Error updating location", err);
                }

            }, (err) => console.error(err), { enableHighAccuracy: true });

            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, [user]);

    const saveLocation = async (lat, lon, coord) => {
        // Reverse Geocode
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            const addr = data.address || {};

            const locationDetails = {
                latitude: lat,
                longitude: lon,
                area: addr.suburb || addr.neighbourhood || "N/A",
                city: addr.city || addr.town || addr.village || "N/A",
                state: addr.state || "N/A",
                country: addr.country || "N/A",
            };

            // Save to Legacy JSON
            await api.post('/api/locations', locationDetails);

            // Marker
            markerSource.clear();
            markerSource.addFeature(new Feature({ geometry: new Point(coord) }));

        } catch (err) {
            console.error(err);
        }
    };

    const handleSearch = async () => {
         try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`);
            const data = await res.json();
            if (data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                const coord = fromLonLat([lon, lat]);
                map.getView().animate({ center: coord, zoom: 14 });
                saveLocation(lat, lon, coord);
            }
         } catch(err) {
             console.error(err);
         }
    };

    return (
        <Box sx={{ height: '80vh', position: 'relative' }}>
             <Paper sx={{ position: 'absolute', top: 10, left: 10, zIndex: 1, p: 1, display: 'flex', gap: 1 }}>
                <TextField
                    size="small"
                    placeholder="Search place..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button variant="contained" onClick={handleSearch}>Search</Button>
             </Paper>
             <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
        </Box>
    );
};

export default MapComponent;
