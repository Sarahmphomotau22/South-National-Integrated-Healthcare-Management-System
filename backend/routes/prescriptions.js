'use strict';
/**
 * routes/prescriptions.js — NIHMS Prescription workflow
 *
 * Changes from original:
 *  1. POST / — stock is NOT decremented on submission; only on dispense.
 *  2. POST /:id/dispense — decrements stock with a safe floor-at-zero check;
 *     marks status 'dispensed' only after stock update succeeds.
 *  3. POST / — validates required fields (patient, lines) before hitting the DB;
 *     returns a structured error instead of a Mongoose cast error on bad input.
 *  4. GET / — also supports ?prescriptionRef= query for cross-module lookups.
 *  5. prescribedBy is always set from req.user._id (the authenticated doctor);
 *     any prescribedBy in req.body is ignored so a caller cannot impersonate.
 *  6. facility is resolved from req.body.facility || req.user.facility so the
 *     prescription is always linked to the correct facility.
 */

const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Prescription, Medication } = require('../models/index');

router.use(protect);

/* ── GET / — list prescriptions ─────────────────────────────────────────── */
router.get('/', async (req, res, next) => {
  try {
    const {
      patient, facility, status, prescriptionRef,
      page = 1, limit = 20
    } = req.query;

    const filter = {};
    if (patient)         filter.patient         = patient;
    if (facility)        filter.facility         = facility;
    if (status)          filter.status           = status;
    if (prescriptionRef) filter.prescriptionRef  = prescriptionRef;

    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      Prescription.find(filter)
        .populate('patient',          'firstName lastName nationalId mrn dateOfBirth')
        .populate('prescribedBy',     'firstName lastName hpcsaNumber')
        .populate('facility',         'name')
        .populate('lines.medication', 'name strength')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Prescription.countDocuments(filter),
    ]);

    res.json({ success: true, data, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) { next(err); }
});

/* ── GET /:id — single prescription ────────────────────────────────────── */
router.get('/:id', async (req, res, next) => {
  try {
    const rx = await Prescription.findById(req.params.id)
      .populate('patient',          'firstName lastName nationalId mrn dateOfBirth')
      .populate('prescribedBy',     'firstName lastName hpcsaNumber')
      .populate('facility',         'name')
      .populate('lines.medication', 'name strength');

    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found.' });
    res.json({ success: true, data: rx });
  } catch (err) { next(err); }
});

/* ── POST / — create prescription (doctor only) ─────────────────────────── */
router.post('/', authorize('doctor'), async (req, res, next) => {
  try {
    const body = req.body;

    /* ── Server-side validation ──────────────────────────────────────── */
    const errors = [];
    if (!body.patient)                        errors.push('patient is required');
    if (!body.lines || !body.lines.length)    errors.push('at least one medication line is required');
    if (body.lines && body.lines.length) {
      body.lines.forEach(function (line, i) {
        if (!line.medicationName && !line.medication)
          errors.push('lines[' + i + '].medicationName is required');
        if (!line.dosage)
          errors.push('lines[' + i + '].dosage is required');
        if (!line.quantity)
          errors.push('lines[' + i + '].quantity is required');
      });
    }
    if (errors.length) {
      return res.status(422).json({ success: false, message: 'Validation failed.', errors });
    }

    /* ── Build the document ──────────────────────────────────────────── */
    const rxDoc = {
      /* Fields from body — spread first so explicit overrides below win */
      ...body,
      /* Always set prescribedBy from the authenticated session */
      prescribedBy: req.user._id,
      /* Facility: prefer body value; fall back to doctor's profile facility */
      facility: body.facility || (req.user.facility ? req.user.facility : undefined),
      /* Status starts as pending — never trust a status from the client */
      status: 'pending',
      /* Timestamps */
      prescribedAt: body.prescribedAt || new Date(),
      submittedAt:  new Date(),
    };

    /* Do NOT allow the caller to override prescribedBy or status */
    delete rxDoc.dispensedBy;
    delete rxDoc.dispensedAt;

    const rx = await Prescription.create(rxDoc);

    /* NOTE: Stock is NOT decremented here.
       Deduction happens in POST /:id/dispense when the pharmacist actually
       dispenses the medication, with a safe floor-at-zero guard.           */

    /* Populate for the response so the client gets full objects */
    await rx.populate([
      { path: 'patient',          select: 'firstName lastName nationalId mrn dateOfBirth' },
      { path: 'prescribedBy',     select: 'firstName lastName hpcsaNumber' },
      { path: 'facility',         select: 'name' },
      { path: 'lines.medication', select: 'name strength' },
    ]);

    res.status(201).json({ success: true, data: rx });
  } catch (err) { next(err); }
});

/* ── POST /:id/dispense — dispense (pharmacy only) ──────────────────────── */
router.post('/:id/dispense', authorize('pharmacy'), async (req, res, next) => {
  try {
    const rx = await Prescription.findById(req.params.id);
    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found.' });

    if (rx.status === 'dispensed') {
      return res.status(409).json({ success: false, message: 'Prescription has already been dispensed.' });
    }

    /* ── Decrement stock with safe floor-at-zero guard ───────────────── */
    const stockErrors = [];
    for (const line of rx.lines) {
      if (!line.medication) continue;           /* free-text medication — no stock record */

      const med = await Medication.findById(line.medication);
      if (!med) continue;                       /* medication record deleted — skip */

      const qty = Number(line.quantity) || 0;
      if (qty <= 0) continue;

      /* Only deduct what is actually available — prevent negative stock */
      const deduct = Math.min(qty, med.stockQty || 0);
      if (deduct < qty) {
        stockErrors.push(
          (med.name || String(line.medication)) +
          ': requested ' + qty + ', available ' + (med.stockQty || 0)
        );
      }

      if (deduct > 0) {
        await Medication.findByIdAndUpdate(line.medication, { $inc: { stockQty: -deduct } });
      }
    }

    /* Update the prescription status */
    rx.status      = 'dispensed';
    rx.dispensedBy = req.user._id;
    rx.dispensedAt = new Date();
    await rx.save();

    const response = { success: true, data: rx };
    if (stockErrors.length) {
      response.warning = 'Partial stock: ' + stockErrors.join('; ');
    }

    res.json(response);
  } catch (err) { next(err); }
});

module.exports = router;
