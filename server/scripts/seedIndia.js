const mongoose = require('mongoose');
const User = require('../models/User'); // Adjust path as necessary
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

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

    // Adjust logic slightly, but simple offset is fine for small radius
    const newLat = city.lat + x;
    const newLng = city.lng + y / Math.cos(city.lat * Math.PI / 180);
    return { lat: newLat, lng: newLng };
};

const seed = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) throw new Error("MONGO_URI is missing");

        await mongoose.connect(mongoUri);
        console.log('MongoDB Connected');

        // Delete existing seeded users
        const deleteRes = await User.deleteMany({ email: { $regex: /@example\.com$/ } });
        console.log(`Deleted ${deleteRes.deletedCount} existing seeded users.`);

        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const users = [];

        // Generate 100 users scattered across the CITIES list
        for (let i = 0; i < 100; i++) {
            const city = CITIES[i % CITIES.length];
            const loc = getRandomLocationNearCity(city, 8); // Within 8km of city center (guaranteed land mostly)
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
                lastLogin: new Date(Date.now() - Math.floor(Math.random() * 12 * 60 * 60 * 1000)) // Active recently
            });
        }

        await User.insertMany(users);
        console.log(`✅ Successfully seeded ${users.length} users across major Indian cities.`);
        process.exit(0);
    } catch (err) {
        console.error("Seeding error:", err);
        process.exit(1);
    }
};

seed();
