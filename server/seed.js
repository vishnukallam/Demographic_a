require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI;

// Andhra Pradesh Bounding Box
const LAT_MIN = 12.5;
const LAT_MAX = 19.0;
const LNG_MIN = 77.0;
const LNG_MAX = 84.5;

const INTERESTS_LIST = [
    'Sports & Outdoors', 'Special Interest Travel', 'Business & Industry',
    'Entertainment & Media', 'Food & Drink', 'Home Family & Pets',
    'Lifestyle & Values', 'Science & Education', 'Automotive',
    'Art & Design', 'History & Humanities', 'Programming and Technologies'
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

function getRandomCoordinate(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomInterests() {
    const num = Math.floor(Math.random() * 3) + 1; // 1 to 3 interests
    const shuffled = INTERESTS_LIST.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
}

async function seedUsers() {
    if (!MONGO_URI) {
        console.error('MONGO_URI not found in .env');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Optional: Clear existing "Seed" users? 
        // For now, let's just add new ones or maybe delete all if requested.
        // Let's delete users with email ending in @example.com to avoid duplicates on re-runs
        await User.deleteMany({ email: { $regex: /@example\.com$/ } });
        console.log('Cleared previous seed users');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const users = [];
        for (let i = 0; i < 80; i++) {
            const name = NAMES[i % NAMES.length] + ` ${Math.floor(Math.random() * 100)}`;
            const lat = getRandomCoordinate(LAT_MIN, LAT_MAX);
            const lng = getRandomCoordinate(LNG_MIN, LNG_MAX);

            users.push({
                displayName: name,
                email: `user${i}_${Date.now()}@example.com`,
                password: hashedPassword,
                bio: 'This is a simulated user for KON-NECT.',
                interests: getRandomInterests(),
                location: {
                    type: 'Point',
                    coordinates: [lng, lat] // MongoDB expects [lng, lat]
                },
                profilePhoto: null,
                lastLogin: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)) // Active within last 24h
            });
        }

        await User.insertMany(users);
        console.log(`✅ Successfully seeded ${users.length} users in Andhra Pradesh.`);
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seedUsers();
