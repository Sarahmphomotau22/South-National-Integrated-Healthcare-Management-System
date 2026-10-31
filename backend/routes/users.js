'use strict';
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');

router.use(protect);

router.get('/', authorize('admin'), async (req, res, next) => {
  try {
    const { role, facility, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (role)     filter.role     = role;
    if (facility) filter.facility = facility;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      User.find(filter).skip(skip).limit(+limit).populate('facility','name').sort({ createdAt: -1 }),
      User.countDocuments(filter)
    ]);
    res.json({ success: true, data, meta: { total, page: +page, limit: +limit } });
  } catch (err) { next(err); }
});

// Any authenticated staff member can fetch the doctors list (for messaging recipient picker)
router.get('/doctors', async (req, res, next) => {
  try {
    const doctors = await User.find({ role: 'DOCTOR' }, 'firstName lastName email _id')
      .limit(200)
      .sort({ lastName: 1, firstName: 1 })
      .lean();
    res.json({ success: true, data: doctors });
  } catch (err) { next(err); }
});

router.get('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('facility','name');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.put('/me', async (req, res, next) => {
  try {
    const allowed = ['firstName','lastName','phone','address'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.patch('/:id/status', authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

module.exports = router;