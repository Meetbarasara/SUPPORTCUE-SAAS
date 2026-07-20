/**
 * Superuser Seed Script
 * Run this once to create the superuser account:
 *   node src/scripts/seedSuperuser.js
 *
 * Edit SUPERUSER_EMAIL and SUPERUSER_PASSWORD before running.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const SUPERUSER_NAME = 'Super Admin';
const SUPERUSER_EMAIL = 'superuser@supportcue.com';
const SUPERUSER_PASSWORD = 'SuperAdmin@123'; // Change this before running!

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/support_platform');
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ role: 'superuser' });
    if (existing) {
      console.log(`Superuser already exists: ${existing.email}`);
      process.exit(0);
    }

    const superuser = new User({
      name: SUPERUSER_NAME,
      email: SUPERUSER_EMAIL,
      password: SUPERUSER_PASSWORD,
      role: 'superuser'
    });

    await superuser.save();
    console.log(`✅ Superuser created successfully!`);
    console.log(`   Email:    ${SUPERUSER_EMAIL}`);
    console.log(`   Password: ${SUPERUSER_PASSWORD}`);
    console.log(`   ⚠️  Change the password after first login!`);

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
