const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const User = require('./models/User');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
    console.error('FATAL: MONGO_URI environment variable is not defined.');
    // We do not exit here to allow debugging on dashboard, but app is broken.
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'];
        if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost')) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST", "PUT"],
    credentials: true
  }
});

console.log("Attempting to connect to MongoDB Atlas...");
mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
    });

// --- Middleware ---
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'];
        if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost')) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());
app.set('trust proxy', 1); // Required for Render to handle secure cookies correctly

// --- Session Setup ---
let sessionStore;
try {
    sessionStore = MongoStore.create({
        mongoUrl: mongoUri,
        autoRemove: 'native'
    });
    sessionStore.on('error', (err) => {
        console.error('Session Store Error:', err);
    });
} catch (err) {
    console.error('Failed to initialize Session Store:', err);
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    store: sessionStore, // Might be undefined if failed, handling that?
    // If undefined, express-session warns and uses MemoryStore, which is fine for keeping server up
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        secure: true, // Required for SameSite=None
        sameSite: 'none' // Required for cross-site (Vercel -> Render)
    }
}));

// --- Passport Setup ---
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    proxy: true
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            user = await User.create({
                googleId: profile.id,
                displayName: profile.displayName,
                email: profile.emails?.[0]?.value,
                profilePhoto: profile.photos?.[0]?.value
            });
        } else {
            user.lastLogin = Date.now();
            await user.save();
        }
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// --- Auth Middleware ---
const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).send('Unauthorized');
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

async function broadcastNearbyUsers(socket, userId) {
    try {
        const currentUser = await User.findById(userId);
        if (!currentUser || !currentUser.location || !currentUser.location.coordinates) return;

        const [lng, lat] = currentUser.location.coordinates;

        // Find users within 10km
        const nearbyUsers = await User.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    $maxDistance: 10000 // 10km
                }
            },
            _id: { $ne: userId } // Exclude self
        }).select('displayName interests location profilePhoto'); // Select specific fields

        // Filter by shared interests
        const relevantUsers = nearbyUsers.filter(otherUser => {
            const sharedInterests = currentUser.interests.filter(i =>
                otherUser.interests.some(oi => oi === i || oi.name === i)
            );
            return sharedInterests.length > 0;
        });

        socket.emit('nearby_users', relevantUsers);
    } catch (err) {
        console.error('Error broadcasting nearby users:', err);
    }
}


// --- Routes ---
// Health Check for Render
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Auth Routes
app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: process.env.CLIENT_URL }),
    (req, res) => {
        // Redirect to client
        res.redirect(process.env.CLIENT_URL);
    }
);

app.get('/api/current_user', (req, res) => {
    if (!req.user) return res.status(401).send('');
    res.send(req.user);
});

app.get('/api/logout', (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).send(err);
        res.redirect(process.env.CLIENT_URL);
    });
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
         if(row[category]) {
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

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
