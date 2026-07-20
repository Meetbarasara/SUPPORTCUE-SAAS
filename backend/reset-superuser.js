const connectDB = require('./src/config/db');
const User = require('./src/models/User');
require('dotenv').config();

const run = async () => {
  try {
    await connectDB();
    const superuser = await User.findOne({ role: 'superuser' });
    if (superuser) {
      superuser.password = 'Admin123!';
      await superuser.save();
      console.log(`Password for superuser ${superuser.email} has been reset to: Admin123!`);
    } else {
      console.log('No superuser found in the database!');
    }
  } catch (err) {
    console.error('Error resetting password:', err);
  } finally {
    process.exit();
  }
};

run();
