const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateInterests } = require('../utils/moderation');

// Register
router.post('/register', async (req, res) => {
    try {
        const { displayName, email, password, bio, interests } = req.body;

        if (!displayName || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Check for existing user
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        // Moderation Check
        const moderationResult = validateInterests(interests);
        if (!moderationResult.valid) {
            return res.status(400).json({
                error: 'Interest rejected: Does not meet community safety guidelines.',
                flagged: moderationResult.flagged
            });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate Initials Avatar Fallback
        // If no profile photo (which is always true for manual register currently),
        // we can set a default or just handle it on client.
        // The prompt says: "the backend should return the initials string".
        // We will generate it here.
        const getInitials = (name) => {
             const parts = name.split(' ').filter(Boolean);
             if (parts.length === 0) return '?';
             if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
             return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        };
        const initials = getInitials(displayName);

        // Create User
        const newUser = new User({
            displayName,
            email,
            password: hashedPassword,
            bio,
            interests: interests || [],
            // We can treat profilePhoto as the initials string if it's not a URL,
            // OR we just return it in the response as requested.
            // Let's store it as null in DB (standard) but send it in response.
        });

        await newUser.save();

        // Issue JWT
        const token = jwt.sign(
            { id: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: newUser._id,
                displayName: newUser.displayName,
                email: newUser.email,
                bio: newUser.bio,
                interests: newUser.interests,
                location: newUser.location,
                profilePhoto: null, // explicit null
                initials: initials // explicit initials as requested
            }
        });

    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide email and password' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Update Last Login
        user.lastLogin = Date.now();
        await user.save();

        // Issue JWT
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Calculate initials for login response too
        const getInitials = (name) => {
             const parts = (name || '').split(' ').filter(Boolean);
             if (parts.length === 0) return '?';
             if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
             return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        };

        res.json({
            token,
            user: {
                id: user._id,
                displayName: user.displayName,
                email: user.email,
                bio: user.bio,
                interests: user.interests,
                location: user.location,
                profilePhoto: user.profilePhoto,
                initials: getInitials(user.displayName)
            }
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

module.exports = router;
