const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const passport = require('passport');
const cookieSession = require('cookie-session');
const csv = require('csv-parser');
require('dotenv').config();
require('./config/passport');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"]
  }
});

io.on('connection', (socket) => {
  console.log('New client connected', socket.id);

  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`User ${userId} joined room ${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(
  cookieSession({
    maxAge: 30 * 24 * 60 * 60 * 1000,
    keys: [process.env.COOKIE_KEY || 'secret_key']
  })
);
app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mapData')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

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
app.set('io', io);

// Legacy Location Logic
const JSON_FILE_PATH = path.join(__dirname, 'locations.json');
function handleJsonUpdate(newData) {
  fs.readFile(JSON_FILE_PATH, 'utf8', (err, data) => {
    let jsonArray = [];
    if (!err && data) {
      try {
        jsonArray = JSON.parse(data);
      } catch (e) {
        jsonArray = [];
      }
    }
    jsonArray.push(newData);
    fs.writeFile(JSON_FILE_PATH, JSON.stringify(jsonArray, null, 2), (writeErr) => {
      if (writeErr) console.error("Error writing JSON:", writeErr);
    });
  });
}

// Route Imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const chatRoutes = require('./routes/chat');

app.use('/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chats', chatRoutes);

// Legacy Route for Search Logging
app.post('/api/locations', (req, res) => {
  handleJsonUpdate(req.body);
  res.status(200).send({ status: 'saved' });
});

// Get Interests Endpoint
app.get('/api/interests', (req, res) => {
  res.json(interests);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
