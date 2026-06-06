'use strict';
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Facility } = require('../models/index');

// GET /api/v1/facilities — PUBLIC (needed for registration dropdown)
router.get('/', async (req, res, next) => {
  try {
    const { province, type, q } = req.query;
    const filter = {};
    if (province) filter.province = province;
    if (type)     filter.type     = type;
    if (q)        filter.name     = { $regex: q, $options: 'i' };
    const data = await Facility.find(filter).sort({ name: 1 }).select('name type province isOnline');
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// POST /api/v1/facilities — admin only
router.post('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const f = await Facility.create(req.body);
    res.status(201).json({ success: true, data: f });
  } catch (err) { next(err); }
});

// PATCH /api/v1/facilities/:id — admin only
router.patch('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const f = await Facility.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!f) return res.status(404).json({ success: false, message: 'Facility not found.' });
    res.json({ success: true, data: f });
  } catch (err) { next(err); }
});

module.exports = router;
