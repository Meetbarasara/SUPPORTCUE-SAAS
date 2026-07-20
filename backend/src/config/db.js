const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log(`[DB] MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('[DB] MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Reconnection logging
mongoose.connection.on('disconnected', () => {
  console.warn('[DB] MongoDB disconnected — Mongoose will attempt to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('[DB] MongoDB reconnected successfully.');
});

mongoose.connection.on('error', (err) => {
  console.error('[DB] MongoDB connection error event:', err.message);
});

module.exports = connectDB;

