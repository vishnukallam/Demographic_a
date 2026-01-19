const router = require('express').Router();
const passport = require('passport');

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', passport.authenticate('google'), (req, res) => {
  // Redirect to frontend after login
  res.redirect('http://localhost:5173/profile');
});

router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('http://localhost:5173');
});

router.get('/current_user', (req, res) => {
  res.send(req.user);
});

module.exports = router;
