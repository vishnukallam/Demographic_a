const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const authRoutes = require('./routes/auth');

// --- Global Error Handling to Prevent Crash on Auth Fail ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Do not exit process
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Do not exit process
});

// --- Database Connection ---
let mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
    console.error('FATAL: MONGO_URI environment variable is not defined.');
} else {
    // Attempt to handle special characters in password if present, though standard URI usually works.
    // This is a safety measure requested for "bad auth" debugging.
    try {
        if (mongoUri.includes('@') && mongoUri.includes('mongodb+srv://')) {
            const parts = mongoUri.split('@');
            const credentials = parts[0].split('//')[1];
            if (credentials.includes(':')) {
                const [user, pass] = credentials.split(':');
                const encodedPass = encodeURIComponent(pass);
                // Reconstruct only if password changed (encoding needed)
                if (pass !== encodedPass) {
                    mongoUri = `mongodb + srv://${user}:${encodedPass}@${parts[1]}`;
                    console.log("Encoded special characters in MongoDB password.");
                }
            }
        }
    } catch (e) {
        console.error("Error parsing/encoding MONGO_URI:", e);
    }
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            const clientUrl = (process.env.CLIENT_URL || "https://demographic-alpha.vercel.app").replace(/\/$/, "");
            const allowedOrigins = [clientUrl, 'https://demographic-alpha.vercel.app', 'http://localhost:5173', 'http://localhost:5000', 'http://localhost:3000'];
            if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost')) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true
    }
});

console.log("Attempting to connect to MongoDB Atlas...");
mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        process.exit(1); // Exit so platform restarts or logs failure clearly
    });

const allowedOrigin = (process.env.CLIENT_URL || "https://demographic-alpha.vercel.app").replace(/\/$/, "");
console.log("CORS allowed for: " + allowedOrigin);

// --- Middleware ---
app.use(cors({
    origin: allowedOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Fix for Path-to-Regexp wildcard crash in Express 5+ / new libs
// Using named wildcard '*path' is the standard Express 5 way to match everything
app.options('*path', cors());

app.use(express.json());
app.set('trust proxy', 1); // Required for Render to handle secure cookies correctly

// --- Auth Routes ---
// Explicitly exempt from any global auth middleware (mounted at root level)
app.use('/api/auth', authRoutes);

// --- Auth Middleware (JWT) ---
const requireAuth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Contains { id: ... }
        req.user.id = decoded.id; // Compatibility alias
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// --- Socket.io Logic ---
// Map<socketId, userId> to track active connections
const socketToUser = new Map();

io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    socket.on('register_user', async (userId) => {
        if (!userId) return;
        socketToUser.set(socket.id, userId);
        socket.join(userId); // Join a room named after the userId for private messaging
        console.log(`Socket ${socket.id} mapped to User ${userId}`);

        // Trigger an initial broadcast for this user
        broadcastNearbyUsers(socket, userId);
    });

    socket.on('update_location', async (data) => {
        // data: { lat, lng }
        const userId = socketToUser.get(socket.id);
        if (!userId || !data) return;

        try {
            // Update DB
            await User.findByIdAndUpdate(userId, {
                location: {
                    type: 'Point',
                    coordinates: [data.lng, data.lat]
                }
            });
            // Broadcast new nearby users
            broadcastNearbyUsers(socket, userId);
        } catch (err) {
            console.error('Error updating location:', err);
        }
    });

    socket.on('join_chat', async ({ targetUserId }) => {
        const currentUserId = socketToUser.get(socket.id);
        if (!currentUserId) return;

        try {
            const currentUser = await User.findById(currentUserId);
            const fromName = currentUser ? currentUser.displayName : 'User';

            const roomId = [currentUserId, targetUserId].sort().join('_');
            socket.join(roomId);

            // Find the target user's socket(s)
            io.to(targetUserId).emit('chat_request', {
                from: currentUserId,
                fromName,
                roomId
            });
            socket.emit('chat_joined', { roomId });
        } catch (err) {
            console.error('Error joining chat:', err);
        }
    });

    socket.on('accept_chat', ({ roomId }) => {
        socket.join(roomId);
    });

    socket.on('send_message', ({ roomId, message }) => {
        const userId = socketToUser.get(socket.id);
        io.to(roomId).emit('receive_message', {
            text: message,
            senderId: userId,
            timestamp: new Date()
        });
    });

    socket.on('disconnect', () => {
        socketToUser.delete(socket.id);
        console.log('Client disconnected', socket.id);
    });
});

// --- New API Routes for Dynamic Discovery ---

// Get Nearby Users (Dynamic Radius)
app.get('/api/users/nearby', requireAuth, async (req, res) => {
    try {
        const { lat, lng, radius, interests } = req.query;
        const userId = req.user.id;

        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and Longitude required' });
        }

        const maxDistance = (radius ? parseFloat(radius) : 10) * 1000; // Default 10km, convert to meters

        // Find users within radius
        // Note: $near requires geospatial index (added in User model)
        const nearbyUsers = await User.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: maxDistance
                }
            },
            lastLogin: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Active within last 24h
            _id: { $ne: userId } // Exclude self
        }).select('displayName interests location profilePhoto bio');

        // Optional Interest Filtering
        let filteredUsers = nearbyUsers;
        if (interests && interests !== 'all') {
            const userInterests = interests.split(',');
            filteredUsers = nearbyUsers.filter(u =>
                u.interests.some(i => userInterests.includes(typeof i === 'string' ? i : i.name))
            );
        }

        res.json(filteredUsers);
    } catch (err) {
        console.error('Error fetching nearby users:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Temporary Seeding Route (Protected by simple secret)
app.get('/api/admin/seed', async (req, res) => {
    const { secret } = req.query;
    if (secret !== 'KONNECT_SECRET_SEED') {
        return res.status(403).json({ error: 'Unauthorized access to seeding' });
    }

    try {
        console.log('Starting remote seeding (Land Only)...');
        const bcrypt = require('bcryptjs');

        // Clear existing seed users
        await User.deleteMany({ email: { $regex: /@example\.com$/ } });
        console.log('Cleared previous seed users');

        // Data Helpers
        const CITIES = [
            { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
            { name: 'Vijayawada', lat: 16.5062, lng: 80.6480 },
            { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185 },
            { name: 'Guntur', lat: 16.3067, lng: 80.4365 },
            { name: 'Nellore', lat: 14.4426, lng: 79.9865 },
            { name: 'Kurnool', lat: 15.8281, lng: 78.0373 },
            { name: 'Rajahmundry', lat: 17.0005, lng: 81.8040 },
            { name: 'Tirupati', lat: 13.6288, lng: 79.4192 },
            { name: 'Kakinada', lat: 16.9891, lng: 82.2475 },
            { name: 'Warangal', lat: 17.9689, lng: 79.5941 },
            { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
            { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
            { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
            { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
            { name: 'Kolkata', lat: 22.5726, lng: 88.3639 }
        ];

        const NAMES = [
            "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
            "Diya", "Saanvi", "Aditi", "Myra", "Ananya", "Pari", "Riya", "Aarya", "Anika", "Navya",
            "Ganesh", "Ravi", "Suresh", "Ramesh", "Lakshmi", "Venkatesh", "Srinivas", "Nagarjuna", "Chiranjeevi", "Pawan",
            "Mahesh", "Prabhas", "Allu", "Ram", "NTR", "Vijay", "Samantha", "Kajal", "Tamannaah", "Rashmika",
            "Charan", "Tarak", "Bunny", "Cherry", "Nani", "Karthik", "Surya", "Vikram", "Dhanush", "Siddharth",
            "Amara", "Bhavya", "Chandana", "Deepika", "Esha", "Farida", "Gitanjali", "Harini", "Indu", "Jaya",
            "Kavya", "Lavanya", "Meghana", "Nithya", "Oormila", "Padma", "Quincy", "Radha", "Sandhya", "Tejaswini",
            "Uma", "Vani", "Yamini", "Zara", "Abhi", "Balaji", "Chaitanya", "Deepak", "Eswar", "Gopi"
        ];

        const INTERESTS_LIST = [
            'Sports & Outdoors', 'Special Interest Travel', 'Business & Industry',
            'Entertainment & Media', 'Food & Drink', 'Home Family & Pets',
            'Lifestyle & Values', 'Science & Education', 'Automotive',
            'Art & Design', 'History & Humanities', 'Programming and Technologies'
        ];

        const getRandomInterests = () => {
            const num = Math.floor(Math.random() * 3) + 1;
            const shuffled = INTERESTS_LIST.sort(() => 0.5 - Math.random());
            return shuffled.slice(0, num);
        };

        // Function to generate random point within X km of a city
        const getRandomLocationNearCity = (city, radiusKm = 5) => {
            const r = radiusKm / 111.32; // Rough conversion to degrees
            const u = Math.random();
            const v = Math.random();
            const w = r * Math.sqrt(u);
            const t = 2 * Math.PI * v;
            const x = w * Math.cos(t);
            const y = w * Math.sin(t);

            const newLat = city.lat + x;
            const newLng = city.lng + y / Math.cos(city.lat * Math.PI / 180);
            return { lat: newLat, lng: newLng };
        };

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const users = [];

        for (let i = 0; i < 100; i++) {
            const city = CITIES[i % CITIES.length];
            const loc = getRandomLocationNearCity(city, 8); // Within 8km
            const name = NAMES[i % NAMES.length] + ` ${Math.floor(Math.random() * 99)}`;

            users.push({
                displayName: name,
                email: `user${i}_${Date.now()}@example.com`,
                password: hashedPassword,
                bio: `Hello from ${city.name}! I love connecting.`,
                interests: getRandomInterests(),
                location: {
                    type: 'Point',
                    coordinates: [loc.lng, loc.lat]
                },
                profilePhoto: null,
                lastLogin: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000))
            });
        }

        await User.insertMany(users);
        console.log(`✅ Successfully seeded ${users.length} users across major Indian cities.`);
        res.json({ success: true, message: `Seeded ${users.length} users successfully (On Land).` });

    } catch (err) {
        console.error('Seeding failed:', err);
        res.status(500).json({ error: 'Seeding failed', details: err.message });
    }
});

// Get Global Users (For when no one is nearby or explicit global search)
app.get('/api/users/global', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        // Fetch recent 50 users globally, excluding self
        const globalUsers = await User.find({ _id: { $ne: userId } })
            .sort({ lastLogin: -1 }) // active users first
            .limit(50)
            .select('displayName interests location profilePhoto bio');

        res.json(globalUsers);
    } catch (err) {
        console.error('Error fetching global users:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


async function broadcastNearbyUsers(socket, userId) {
    // Deprecated in favor of REST API for map polling/radius, 
    // but kept for initial socket connection if needed.
    // For now, doing nothing to avoid conflicting with the new frontend logic
    // which handles fetching data via API.
}


// --- Routes ---
// Health Check for Render
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/api/current_user', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// User Updates - Protected
app.post('/api/user/interests', requireAuth, async (req, res) => {
    try {
        const { interests } = req.body; // Expecting array of strings
        await User.findByIdAndUpdate(req.user.id, { interests });
        res.send(await User.findById(req.user.id));
    } catch (err) {
        res.status(500).send(err);
    }
});

// Load Interests CSV
const interests = [];
fs.createReadStream(path.join(__dirname, 'Interests.csv'))
    .pipe(csv())
    .on('data', (row) => {
        Object.keys(row).forEach(category => {
            if (row[category]) {
                interests.push({ category, name: row[category] });
            }
        });
    })
    .on('end', () => {
        console.log('Interests loaded');
    });

// Interests - Protected
app.get('/api/interests', requireAuth, (req, res) => {
    res.json(interests);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
