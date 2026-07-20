/**
 * Superuser Seed Script
 *
 * Creates the initial superuser account. Credentials are read from the
 * environment so that nothing sensitive lives in source control.
 *
 * Local:
 *   SUPERUSER_EMAIL=you@example.com SUPERUSER_PASSWORD='...' npm run seed:superuser
 *
 * Against a deployed database (e.g. Atlas), point MONGO_URI at it and run
 * this from your own machine — no shell on the host is required.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const SUPERUSER_NAME = process.env.SUPERUSER_NAME || 'Super Admin';
const SUPERUSER_EMAIL = process.env.SUPERUSER_EMAIL;
const SUPERUSER_PASSWORD = process.env.SUPERUSER_PASSWORD;

async function seed() {
  if (!SUPERUSER_EMAIL || !SUPERUSER_PASSWORD) {
    console.error('Refusing to seed: SUPERUSER_EMAIL and SUPERUSER_PASSWORD must be set.');
    console.error('Example:');
    console.error("  SUPERUSER_EMAIL=you@example.com SUPERUSER_PASSWORD='a-strong-password' npm run seed:superuser");
    process.exit(1);
  }

  if (SUPERUSER_PASSWORD.length < 12) {
    console.error('Refusing to seed: SUPERUSER_PASSWORD must be at least 12 characters.');
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.error('Refusing to seed: MONGO_URI is not set.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ role: 'superuser' });
    if (existing) {
      console.log(`Superuser already exists: ${existing.email} — nothing to do.`);
      process.exit(0);
    }

    const superuser = new User({
      name: SUPERUSER_NAME,
      email: SUPERUSER_EMAIL,
      password: SUPERUSER_PASSWORD,
      role: 'superuser'
    });

    await superuser.save();
    console.log('Superuser created successfully.');
    console.log(`   Email: ${SUPERUSER_EMAIL}`);
    console.log('   Password: (the value you supplied — not echoed)');

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
