const router = require('express').Router();
const passport = require('passport');

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', passport.authenticate('google'), (req, res) => {
  // Redirect to frontend after login
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  res.redirect(`${clientUrl}/profile`);
});

router.get('/logout', (req, res) => {
  req.logout();
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  res.redirect(clientUrl);
});

router.get('/current_user', (req, res) => {
  res.send(req.user || null);
});

module.exports = router;
