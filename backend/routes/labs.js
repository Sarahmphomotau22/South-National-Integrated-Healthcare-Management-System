'use strict';
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { LabOrder } = require('../models/index');
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
      LabOrder.find(filter).populate('patient','firstName lastName nationalId').populate('orderedBy','firstName lastName').sort({ createdAt: -1 }).skip(skip).limit(+limit),
      LabOrder.countDocuments(filter)
    ]);
    res.json({ success: true, data, meta: { total, page: +page, limit: +limit } });
  } catch (err) { next(err); }
});
router.post('/', authorize('doctor','nurse'), async (req, res, next) => {
  try {
    const lab = await LabOrder.create({ ...req.body, orderedBy: req.user._id });
    res.status(201).json({ success: true, data: lab });
  } catch (err) { next(err); }
});
router.patch('/:id/status', authorize('doctor','nurse','admin'), async (req, res, next) => {
  try {
    const lab = await LabOrder.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!lab) return res.status(404).json({ success: false, message: 'Lab order not found.' });
    res.json({ success: true, data: lab });
  } catch (err) { next(err); }
});
module.exports = router;
