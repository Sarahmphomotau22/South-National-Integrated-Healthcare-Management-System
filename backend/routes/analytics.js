'use strict';
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Appointment, Medication, Facility } = require('../models/index');

router.use(protect);

// Overview — admin, doctor, nurse, pharmacy can all see summary stats
router.get('/overview', authorize('admin','doctor','nurse','pharmacy'), async (req, res, next) => {
  try {
    const today    = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today.getTime() + 86400000);
    const [consultationsToday, facilitiesTotal, facilitiesOnline, criticalStock] = await Promise.all([
      Appointment.countDocuments({ scheduledAt: { $gte: today, $lt: tomorrow }, status: { $in: ['completed','in_progress'] } }),
      Facility.countDocuments(),
      Facility.countDocuments({ isOnline: true }),
      Medication.countDocuments({ $expr: { $lte: ['$stockQty', 10] } })
    ]);
    res.json({ success: true, data: {
      consultationsToday, facilitiesTotal, facilitiesOnline,
      facilitiesOffline: facilitiesTotal - facilitiesOnline, criticalStock
    }});
  } catch (err) { next(err); }
});

// Patient flow — admin and doctor only
router.get('/patient-flow', authorize('admin','doctor'), async (req, res, next) => {
  try {
    const { facility, date } = req.query;
    const d = date ? new Date(date) : new Date(); d.setHours(0,0,0,0);
    const filter = { scheduledAt: { $gte: d, $lt: new Date(d.getTime() + 86400000) } };
    if (facility) filter.facility = facility;
    const byStatus = await Appointment.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    res.json({ success: true, data: byStatus });
  } catch (err) { next(err); }
});

module.exports = router;
