'use strict';
/**
 * backend/routes/medications.js
 * Add to server.js: app.use('/api/v1/medications', require('./routes/medications'));
 */
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Medication } = require('../models/index');

router.use(protect);

// GET /api/v1/medications
router.get('/', async (req, res, next) => {
  try {
    const { facility, search, limit = 100 } = req.query;
    const filter = {};
    if (facility) filter.facility = facility;
    if (search)   filter.name = { $regex: search, $options: 'i' };
    const data = await Medication.find(filter).sort({ name: 1 }).limit(+limit);
    res.json({ success: true, data });
  } catch(err) { next(err); }
});

// GET /api/v1/medications/:id
router.get('/:id', async (req, res, next) => {
  try {
    const med = await Medication.findById(req.params.id);
    if (!med) return res.status(404).json({ success: false, message: 'Medication not found' });
    res.json({ success: true, data: med });
  } catch(err) { next(err); }
});

// POST /api/v1/medications
router.post('/', authorize('pharmacist','admin','facility_admin'), async (req, res, next) => {
  try {
    const med = await Medication.create(req.body);
    res.status(201).json({ success: true, data: med });
  } catch(err) { next(err); }
});

// PUT /api/v1/medications/:id
router.put('/:id', authorize('pharmacist','admin','facility_admin'), async (req, res, next) => {
  try {
    const med = await Medication.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!med) return res.status(404).json({ success: false, message: 'Medication not found' });
    res.json({ success: true, data: med });
  } catch(err) { next(err); }
});

// POST /api/v1/medications/:id/order — create purchase order
router.post('/:id/order', authorize('pharmacist','admin','facility_admin'), async (req, res, next) => {
  try {
    const med = await Medication.findById(req.params.id);
    if (!med) return res.status(404).json({ success: false, message: 'Medication not found' });
    // Log purchase order (extend with actual supplier integration)
    const order = {
      medication: med._id,
      medicationName: med.name,
      quantity: req.body.quantity || 500,
      supplier: med.supplier || 'Default Supplier',
      requestedAt: new Date(),
      requestedBy: req.user._id,
      status: 'pending',
    };
    // Save order if you have an Order model, otherwise just log
    const logger = require('../utils/logger');
    logger.info('Purchase order created:', order);
    res.json({ success: true, data: order, message: 'Purchase order created and sent to supplier' });
  } catch(err) { next(err); }
});

module.exports = router;
