const router = require('express').Router();
const User = require('../models/User');
const hotspots = require('../hotspots.json');
const { isUserInHotspot, checkInterestMatch } = require('../utils/matching');

// Middleware to check if user is logged in
const requireLogin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).send({ error: 'You must log in!' });
  }
  next();
};

router.post('/location', requireLogin, async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(422).send({ error: 'Latitude and Longitude required' });
  }

  try {
    const user = await User.findById(req.user._id);
    user.location = { type: 'Point', coordinates: [longitude, latitude] };
    user.lastActive = Date.now();
    await user.save();

    // Matching Logic
    if (isUserInHotspot(latitude, longitude, hotspots)) {
      // Find users within 10km (10000m)
      const nearbyUsers = await User.find({
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: [longitude, latitude] },
            $maxDistance: 10000 // 10km
          }
        },
        _id: { $ne: user._id } // Exclude self
      });

      const io = req.app.get('io');
      const matches = [];

      for (let otherUser of nearbyUsers) {
        if (checkInterestMatch(user.interests, otherUser.interests)) {
            // Check if already notified
            const alreadyNotified = user.notifiedMatches.some(
                m => m.userId.toString() === otherUser._id.toString() &&
                (Date.now() - m.timestamp) < 24 * 60 * 60 * 1000 // 24 hours
            );

            if (!alreadyNotified) {
                matches.push(otherUser);

                // Update notified matches for both
                user.notifiedMatches.push({ userId: otherUser._id });
                otherUser.notifiedMatches.push({ userId: user._id });
                await otherUser.save();

                // Emit notification to other user
                io.to(otherUser._id.toString()).emit('match_notification', {
                    message: `You have a new interest match nearby: ${user.name}`,
                    user: user
                });
            }
        }
      }

      if (matches.length > 0) {
          await user.save();
           // Emit notification to current user
           io.to(user._id.toString()).emit('match_notification', {
               message: `You found ${matches.length} new people with similar interests nearby!`,
               users: matches
           });
      }
    }

    res.send(user);
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

router.put('/profile', requireLogin, async (req, res) => {
    const { name, about, interests, photo } = req.body;
    try {
        const user = await User.findByIdAndUpdate(req.user._id, {
            name, about, interests, photo
        }, { new: true });
        res.send(user);
    } catch(err) {
        res.status(500).send(err);
    }
});

router.get('/nearby', async (req, res) => {
    try {
        const users = await User.find({});
        if (req.user) {
            // Authenticated: Return full details (excluding sensitive auth info if needed)
            res.send(users);
        } else {
            // Unauthenticated: Return sanitized data
            const sanitized = users.map(u => ({
                _id: u._id,
                location: u.location,
                interests: u.interests
            }));
            res.send(sanitized);
        }
    } catch(err) {
        res.status(500).send(err);
    }
});

module.exports = router;
