'use strict';
/**
 * Seeds today's appointments so the queue shows live data.
 * Run: node seeds/seedAppointments.js
 */
require('dotenv').config();
const mongoose    = require('mongoose');
const connectDB   = require('../config/db');
const User        = require('../models/User');
const Patient     = require('../models/Patient');
const { Facility, Appointment } = require('../models/index');

async function run() {
  await connectDB();

  const doctor   = await User.findOne({ role: 'doctor' });
  const facility = await Facility.findOne({ name: 'Johannesburg CHC' });
  const patients = await Patient.find({}).limit(5);

  if (!doctor || !facility || !patients.length) {
    console.error('Run node seeds/seed.js first to create base data.');
    process.exit(1);
  }

  // Clear today's appointments first
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today.getTime() + 86400000);
  await Appointment.deleteMany({ facility: facility._id, scheduledAt: { $gte: today, $lt: tomorrow } });

  const now = new Date();
  const appointmentsData = [
    {
      patient:     patients[0]._id,
      doctor:      doctor._id,
      facility:    facility._id,
      visitType:   'consultation',
      scheduledAt: new Date(now.getTime() - 30 * 60000),
      status:      'confirmed',
      priority:    true,
      reason:      'Hypertension review — BP elevated',
      queueToken:  'A-01',
      createdBy:   doctor._id
    },
    {
      patient:     patients[1]._id,
      doctor:      doctor._id,
      facility:    facility._id,
      visitType:   'consultation',
      scheduledAt: new Date(now.getTime() - 15 * 60000),
      status:      'confirmed',
      priority:    true,
      reason:      'Chest pain, shortness of breath',
      queueToken:  'A-02',
      createdBy:   doctor._id
    },
    {
      patient:     patients[2]._id,
      doctor:      doctor._id,
      facility:    facility._id,
      visitType:   'consultation',
      scheduledAt: new Date(now.getTime() + 10 * 60000),
      status:      'confirmed',
      priority:    false,
      reason:      'TB follow-up — monthly review',
      queueToken:  'A-03',
      createdBy:   doctor._id
    },
    {
      patient:     patients[0]._id,
      doctor:      doctor._id,
      facility:    facility._id,
      visitType:   'telemedicine',
      scheduledAt: new Date(now.getTime() + 30 * 60000),
      status:      'pending',
      priority:    false,
      reason:      'Diabetes follow-up — HbA1c review',
      queueToken:  'A-04',
      createdBy:   doctor._id
    },
    {
      patient:     patients[1]._id,
      doctor:      doctor._id,
      facility:    facility._id,
      visitType:   'lab',
      scheduledAt: new Date(now.getTime() + 60 * 60000),
      status:      'pending',
      priority:    false,
      reason:      'Blood draw — FBC, lipids',
      queueToken:  'A-05',
      createdBy:   doctor._id
    }
  ];

  await Appointment.insertMany(appointmentsData);
  console.log(`\n✅  ${appointmentsData.length} appointments seeded for today\n`);
  console.log('Facility:', facility.name);
  console.log('Doctor:  ', doctor.firstName, doctor.lastName);
  console.log('Patients:', patients.map(p => p.fullName).join(', '));

  await mongoose.connection.close();
  process.exit(0);
}

run().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
