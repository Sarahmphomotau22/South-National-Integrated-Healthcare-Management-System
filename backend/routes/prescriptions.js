'use strict';
/**
 * routes/prescriptions.js
 */
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Prescription, Medication } = require('../models/index');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const { patient, facility, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (patient)  filter.patient  = patient;
    if (facility) filter.facility = facility;
    if (status)   filter.status   = status;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Prescription.find(filter)
        .populate('patient',     'firstName lastName nationalId')
        .populate('prescribedBy','firstName lastName')
        .populate('facility',    'name')
        .populate('lines.medication', 'name strength')
        .sort({ createdAt: -1 })
        .skip(skip).limit(+limit),
      Prescription.countDocuments(filter)
    ]);
    res.json({ success: true, data, meta: { total, page: +page, limit: +limit } });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const rx = await Prescription.findById(req.params.id)
      .populate('patient').populate('prescribedBy','firstName lastName').populate('facility','name');
    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found.' });
    res.json({ success: true, data: rx });
  } catch (err) { next(err); }
});

router.post('/', authorize('doctor'), async (req, res, next) => {
  try {
    const rx = await Prescription.create({ ...req.body, prescribedBy: req.user._id });
    // Decrement stock for each line
    for (const line of rx.lines) {
      await Medication.findByIdAndUpdate(line.medication, { $inc: { stockQty: -line.quantity } });
    }
    res.status(201).json({ success: true, data: rx });
  } catch (err) { next(err); }
});

router.post('/:id/dispense', authorize('pharmacy'), async (req, res, next) => {
  try {
    const rx = await Prescription.findByIdAndUpdate(
      req.params.id,
      { status: 'dispensed', dispensedBy: req.user._id, dispensedAt: new Date() },
      { new: true }
    );
    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found.' });
    res.json({ success: true, data: rx });
  } catch (err) { next(err); }
});

module.exports = router;
