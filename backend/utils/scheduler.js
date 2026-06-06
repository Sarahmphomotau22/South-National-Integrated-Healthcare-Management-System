'use strict';
/**
 * utils/scheduler.js
 * Cron jobs for appointment reminders.
 * Runs every 15 minutes to check for upcoming appointments.
 */
const cron    = require('node-cron');
const logger  = require('./logger');
const { sendReminder } = require('./reminders');

async function checkReminders() {
  try {
    const { Appointment } = require('../models/index');
    const User    = require('../models/User');
    const Patient = require('../models/Patient');

    const now   = new Date();
    // Windows: 24hr ahead ± 10 minutes
    const w24s  = new Date(now.getTime() + 23*60*60*1000 + 50*60*1000);
    const w24e  = new Date(now.getTime() + 24*60*60*1000 + 10*60*1000);
    // Window: 1hr ahead ± 10 minutes
    const w1s   = new Date(now.getTime() +  50*60*1000);
    const w1e   = new Date(now.getTime() +  70*60*1000);

    const appts24 = await Appointment.find({ scheduledAt: { $gte: w24s, $lte: w24e }, status: { $in: ['confirmed','pending'] }, reminder24Sent: { $ne: true } });
    const appts1  = await Appointment.find({ scheduledAt: { $gte: w1s,  $lte: w1e  }, status: { $in: ['confirmed','pending'] }, reminder1Sent:  { $ne: true } });

    for (const appt of appts24) {
      const [patient, doctor] = await Promise.all([
        Patient.findById(appt.patient),
        appt.doctor ? User.findById(appt.doctor) : null
      ]);
      await sendReminder({ appointment: appt, patient, doctor, hoursAhead: 24 });
      await Appointment.findByIdAndUpdate(appt._id, { reminder24Sent: true });
    }

    for (const appt of appts1) {
      const [patient, doctor] = await Promise.all([
        Patient.findById(appt.patient),
        appt.doctor ? User.findById(appt.doctor) : null
      ]);
      await sendReminder({ appointment: appt, patient, doctor, hoursAhead: 1 });
      await Appointment.findByIdAndUpdate(appt._id, { reminder1Sent: true });
    }

    if (appts24.length + appts1.length > 0) {
      logger.info(`Reminders sent: ${appts24.length} × 24hr, ${appts1.length} × 1hr`);
    }
  } catch (err) {
    logger.error('Reminder scheduler error:', err.message);
  }
}

function startScheduler() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', checkReminders);
  logger.info('Appointment reminder scheduler started (every 15 min)');
}

module.exports = { startScheduler };
