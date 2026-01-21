const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const csv = require('csv-parser');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"]
  }
});

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        // Allow any localhost origin
        if (origin.startsWith('http://localhost')) return callback(null, true);
        if (origin === process.env.CLIENT_URL) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());

// In-Memory User Store
// Map<socketId, { socketId, name, interests: [], location: {lat, lng} }>
const users = new Map();

// Calculate distance between two points in km
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1);
  var a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

io.on('connection', (socket) => {
  console.log('New client connected', socket.id);

  // Register User
  socket.on('register_user', (userData) => {
    // userData: { name, interests: [], location: {lat, lng} }
    users.set(socket.id, { ...userData, socketId: socket.id });
    console.log(`User registered: ${userData.name} (${socket.id})`);

    // Broadcast updated user list to relevant users (naive: broadcast to all for now, optimized later)
    broadcastNearbyUsers();
  });

  // Update Location
  socket.on('update_location', (location) => {
    const user = users.get(socket.id);
    if (user) {
      user.location = location;
      users.set(socket.id, user);
      broadcastNearbyUsers();
    }
  });

  // Chat Join
  socket.on('join_chat', (targetSocketId) => {
      // Logic for joining a private room
      const roomId = [socket.id, targetSocketId].sort().join('_');
      socket.join(roomId);
      const sender = users.get(socket.id);
      const senderName = sender ? sender.name : 'Someone';

      // Notify target user to join
      io.to(targetSocketId).emit('chat_request', {
          from: socket.id,
          fromName: senderName,
          roomId
      });
      socket.emit('chat_joined', { roomId });
  });

  socket.on('accept_chat', ({ roomId }) => {
      socket.join(roomId);
  });

  socket.on('send_message', ({ roomId, message, toName }) => {
      io.to(roomId).emit('receive_message', {
          text: message,
          senderId: socket.id,
          senderName: users.get(socket.id)?.name || 'Anonymous',
          timestamp: new Date()
      });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
    users.delete(socket.id);
    broadcastNearbyUsers();
  });
});

function broadcastNearbyUsers() {
    // For each user, find nearby users with shared interests
    users.forEach((currentUser, socketId) => {
        const nearby = [];
        users.forEach((otherUser, otherSocketId) => {
            if (socketId === otherSocketId) return; // Skip self

            if (currentUser.location && otherUser.location) {
                const dist = getDistanceFromLatLonInKm(
                    currentUser.location.lat, currentUser.location.lng,
                    otherUser.location.lat, otherUser.location.lng
                );

                if (dist <= 10) { // 10km radius
                    // Check shared interests
                    const sharedInterests = currentUser.interests.filter(i =>
                        otherUser.interests.some(oi => oi.name === i.name)
                    );

                    if (sharedInterests.length > 0) {
                        nearby.push({
                            socketId: otherUser.socketId,
                            name: otherUser.name,
                            interests: otherUser.interests, // Or just shared ones
                            location: otherUser.location,
                            distance: dist
                        });
                    }
                }
            }
        });
        io.to(socketId).emit('nearby_users', nearby);
    });
}

// Load Interests
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

app.set('interests', interests);

// Get Interests Endpoint
app.get('/api/interests', (req, res) => {
  res.json(interests);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
