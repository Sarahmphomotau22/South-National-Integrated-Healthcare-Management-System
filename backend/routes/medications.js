'use strict';
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Medication } = require('../models/index');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const { facility, status, q } = req.query;
    const filter = { isActive: true };
    if (facility) filter.facility = facility;
    if (q) filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { genericName: { $regex: q, $options: 'i' } }
    ];
    if (status === 'low')      filter.$expr = { $lte: ['$stockQty', '$reorderLevel'] };
    if (status === 'critical') filter.stockQty = { $lte: 10 };
    const data = await Medication.find(filter).populate('facility','name').sort({ name: 1 });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/', authorize('admin','pharmacy'), async (req, res, next) => {
  try {
    const med = await Medication.create(req.body);
    res.status(201).json({ success: true, data: med });
  } catch (err) { next(err); }
});

router.patch('/:id/stock', authorize('admin','pharmacy'), async (req, res, next) => {
  try {
    const { qty, operation = 'set' } = req.body; // operation: set | increment | decrement
    const update = operation === 'increment' ? { $inc: { stockQty: qty } }
                 : operation === 'decrement' ? { $inc: { stockQty: -qty } }
                 : { stockQty: qty };
    const med = await Medication.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!med) return res.status(404).json({ success: false, message: 'Medication not found.' });
    res.json({ success: true, data: med });
  } catch (err) { next(err); }
});

module.exports = router;
