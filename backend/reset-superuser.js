/**
 * Superuser Password Reset
 *
 * Resets the existing superuser's password. The new password is read from
 * the environment so nothing sensitive lives in source control.
 *
 *   SUPERUSER_PASSWORD='a-strong-password' npm run reset:superuser
 */

require('dotenv').config();
const connectDB = require('./src/config/db');
const User = require('./src/models/User');

const NEW_PASSWORD = process.env.SUPERUSER_PASSWORD;

const run = async () => {
  if (!NEW_PASSWORD || NEW_PASSWORD.length < 12) {
    console.error('Refusing to reset: SUPERUSER_PASSWORD must be set and at least 12 characters.');
    console.error("Example:");
    console.error("  SUPERUSER_PASSWORD='a-strong-password' npm run reset:superuser");
    process.exit(1);
  }

  try {
    await connectDB();
    const superuser = await User.findOne({ role: 'superuser' });

    if (!superuser) {
      console.log('No superuser found in the database.');
      process.exit(1);
    }

    superuser.password = NEW_PASSWORD;
    await superuser.save();
    console.log(`Password reset for superuser ${superuser.email}.`);
    process.exit(0);
  } catch (err) {
    console.error('Error resetting password:', err.message);
    process.exit(1);
  }
};

run();
