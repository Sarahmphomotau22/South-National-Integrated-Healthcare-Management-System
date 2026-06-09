/**
 * Run: node scripts/fix-patient-records.js
 * Creates missing Patient records for all patient users.
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  const User    = require('../models/User');
  const Patient = require('../models/Patient');

  const users = await User.find({ role: 'patient' });
  console.log(`Found ${users.length} patient accounts\n`);

  let created = 0, exists = 0;

  for (const user of users) {
    const existing = await Patient.findOne({ user: user._id });
    if (existing) {
      console.log(`✅  ${user.email} — record exists (MRN: ${existing.mrn})`);
      exists++;
      continue;
    }

    const count = await Patient.countDocuments();
    const mrn   = 'MRN-' + String(count + 1).padStart(6, '0');

    await Patient.create({
      user:        user._id,
      firstName:   user.firstName,
      lastName:    user.lastName,
      nationalId:  user.nationalId || `AUTO-${String(user._id)}`,
      dateOfBirth: user.dateOfBirth || new Date('1990-01-01'),
      gender:      user.gender || 'prefer_not_to_say',
      phone:       user.phone || '',
      email:       user.email || '',
      mrn,
      isVerified:  false,
      allergies:   [],
      conditions:  []
    });

    console.log(`🆕  ${user.email} — created (MRN: ${mrn})`);
    created++;
  }

  console.log(`\nDone: ${created} created, ${exists} already existed`);
  await mongoose.connection.close();
  process.exit(0);
}

run().catch(err => { console.error(err.message); process.exit(1); });
