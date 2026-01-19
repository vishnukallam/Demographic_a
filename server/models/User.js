const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: String,
  about: {
    type: String,
    default: ''
  },
  photo: String,
  interests: {
    type: [String],
    default: []
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  // To track who we have already notified about to avoid spamming
  notifiedMatches: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

// Create a geospatial index on the location field
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
