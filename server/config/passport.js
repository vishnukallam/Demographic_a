const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then(user => {
    done(null, user);
  });
});

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET. Google Auth will not work.');
} else {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback'
      },
      async (accessToken, refreshToken, profile, done) => {
      try {
        const existingUser = await User.findOne({ googleId: profile.id });

        if (existingUser) {
          return done(null, existingUser);
        }

        const newUser = await new User({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails && profile.emails[0] ? profile.emails[0].value : '',
          photo: profile.photos && profile.photos[0] ? profile.photos[0].value : ''
        }).save();

        done(null, newUser);
      } catch (err) {
        done(err, null);
      }
    }
    )
  );
}
