'use strict';

/**
 * routes/vaccinations.js
 * REST endpoints for immunisation vaccination records.
 *
 * Mounted in server.js as:
 *   app.use('/api/v1/vaccinations', require('./routes/vaccinations'));
 *
 * Also handles the sub-resource path called by nurse.js:
 *   POST /api/v1/patients/:patientId/vaccinations
 *   GET  /api/v1/patients/:patientId/vaccinations
 *   → those are registered separately in server.js (see comment at bottom)
 */

const express      = require('express');
const router       = express.Router();
const Vaccination  = require('../models/Vaccination');
const { protect }  = require('../middleware/auth');   // same JWT guard used by other routes

// ── Helper ────────────────────────────────────────────────────────────────────
function ok(res, data, statusCode = 200) {
  res.status(statusCode).json({ success: true, data });
}
function fail(res, message, statusCode = 400) {
  res.status(statusCode).json({ success: false, message });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/vaccinations
// Create a new vaccination record (called by nurse.js _nRecordVax)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const body = req.body || {};

    if (!body.vaccine) return fail(res, 'vaccine field is required');

    // Prevent duplicate if the client retries with the same UUID
    if (body.id) {
      const existing = await Vaccination.findOne({ id: body.id });
      if (existing) return ok(res, existing, 200);
    }

    const record = await Vaccination.create({
      id:                body.id,
      patientId:         body.patientId,
      patientName:       body.patientName,
      patientNationalId: body.patientNationalId,
      patientFileNumber: body.patientFileNumber,
      patientDob:        body.patientDob,
      patientSex:        body.patientSex,
      vaccineId:         body.vaccineId,
      vaccine:           body.vaccine,
      dose:              body.dose,
      batch:             body.batch,
      date:              body.date,
      time:              body.time,
      notes:             body.notes,
      vaccinator:        body.vaccinator,
      vaccinatorName:    body.vaccinatorName,
      vaccinatorReg:     body.vaccinatorReg,
      vaccinatorStaffId: body.vaccinatorStaffId,
      recordedBy:        body.recordedBy   || req.user?._id,
      recordedById:      body.recordedById || req.user?._id?.toString(),
      recordedAt:        body.recordedAt   ? new Date(body.recordedAt) : new Date(),
      facilityId:        body.facilityId,
      appointmentId:     body.appointmentId,
      status:            body.status || 'recorded',
    });

    return ok(res, record, 201);
  } catch (err) {
    // Duplicate key on the `id` field — client already retried; just return success
    if (err.code === 11000) {
      const existing = await Vaccination.findOne({ id: req.body?.id }).catch(() => null);
      return ok(res, existing || {}, 200);
    }
    console.error('[vaccinations] POST error:', err.message);
    return fail(res, err.message || 'Server error', 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/vaccinations
// List vaccinations — filterable by patientId, patientNationalId, date, facilityId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { patientId, patientNationalId, facilityId, date, from, to, limit = 100, page = 1 } = req.query;

    const filter = { status: { $ne: 'voided' } };
    if (patientId)         filter.patientId         = patientId;
    if (patientNationalId) filter.patientNationalId = patientNationalId;
    if (facilityId)        filter.facilityId        = facilityId;
    if (date)              filter.date              = date;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to)   filter.date.$lte = to;
    }

    const pageNum  = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(limit) || 100));

    const [records, total] = await Promise.all([
      Vaccination.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Vaccination.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data:    records,
      meta:    { total, page: pageNum, pages: Math.ceil(total / pageSize), limit: pageSize },
    });
  } catch (err) {
    console.error('[vaccinations] GET error:', err.message);
    return fail(res, err.message || 'Server error', 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/vaccinations/:id
// Fetch a single record by Mongo _id or client UUID
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const record  = await Vaccination.findOne({
      $or: [
        { _id: id.match(/^[a-f\d]{24}$/i) ? id : null },
        { id },
      ],
    }).lean();

    if (!record) return fail(res, 'Vaccination record not found', 404);
    return ok(res, record);
  } catch (err) {
    return fail(res, err.message || 'Server error', 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/vaccinations/:id
// Update status (e.g. void a record)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id', protect, async (req, res) => {
  try {
    const { id }   = req.params;
    const allowed  = ['status', 'notes', 'updatedBy', 'updatedAt'];
    const update   = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    update.updatedBy = req.user?._id?.toString();
    update.updatedAt = new Date();

    const record = await Vaccination.findOneAndUpdate(
      { $or: [{ _id: id.match(/^[a-f\d]{24}$/i) ? id : null }, { id }] },
      { $set: update },
      { new: true }
    ).lean();

    if (!record) return fail(res, 'Vaccination record not found', 404);
    return ok(res, record);
  } catch (err) {
    return fail(res, err.message || 'Server error', 500);
  }
});

module.exports = router;

/*
 * ── Sub-resource route for nurse.js _nRecordVax ─────────────────────────────
 *
 * nurse.js also POSTs to /api/v1/patients/:patientId/vaccinations
 * Add these two lines to server.js BEFORE the notFound middleware:
 *
 *   app.use('/api/v1/vaccinations', require('./routes/vaccinations'));
 *   app.use('/api/v1/patients/:patientId/vaccinations', (req, res, next) => {
 *     req.body = req.body || {};
 *     req.body.patientId = req.body.patientId || req.params.patientId;
 *     next();
 *   }, require('./routes/vaccinations'));
 *
 * That way the same router handles both paths.
 */
