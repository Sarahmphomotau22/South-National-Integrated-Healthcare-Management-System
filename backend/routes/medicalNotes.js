'use strict';
/**
 * backend/routes/medicalNotes.js
 *
 * Persists Diagnosis & Clinical Assessment records.
 * Each record is linked to a patient, the authoring doctor, and optionally
 * to a consultation-note or appointment.
 *
 * Register in server.js / app.js:
 *   app.use('/api/v1/medical-notes', require('./routes/medicalNotes'));
 */

const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/auth');
const mongoose = require('mongoose');

/* ── Schema ──────────────────────────────────────────────────────────────── */
const medicalNoteSchema = new mongoose.Schema({
  /* Links */
  patient:          { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor:           { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  consultationNote: { type: mongoose.Schema.Types.ObjectId, ref: 'ConsultationNote' },
  appointment:      { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },

  /* Patient snapshot (for quick display without populate) */
  patientName:      { type: String, trim: true },

  /* Required clinical fields */
  primaryDiagnosis: { type: String, trim: true, required: [true, 'Primary diagnosis is required'] },
  icd10:            { type: String, trim: true, required: [true, 'ICD-10 code is required'] },
  diagnosisStatus:  {
    type: String,
    enum: ['Provisional', 'Confirmed', 'Differential', 'Resolved', 'Chronic'],
    required: [true, 'Diagnosis status is required'],
  },
  clinicalAssessment: { type: String, trim: true, required: [true, 'Clinical assessment is required'] },
  clinicalFindings:   { type: String, trim: true, required: [true, 'Clinical findings are required'] },

  /* Optional clinical fields */
  differentialDiagnosis: { type: String, trim: true },
  riskLevel: {
    type: String,
    enum: ['Stable', 'Requires Monitoring', 'High Risk', 'Emergency'],
    default: 'Stable',
  },
  confirmationBasis: [{ type: String }],
  additionalNotes:   { type: String, trim: true },

  /* Doctor snapshot */
  orderedByName: { type: String },
  recordedAt:    { type: Date, default: Date.now },

  /* Prevent duplicate submissions from retry clicks */
  idempotencyKey: { type: String, index: true, sparse: true },
}, { timestamps: true });

medicalNoteSchema.index({ patient: 1, createdAt: -1 });
medicalNoteSchema.index({ doctor:  1, createdAt: -1 });
medicalNoteSchema.index({ consultationNote: 1 });

let MedicalNote;
try {
  MedicalNote = mongoose.model('MedicalNote');
} catch (_) {
  MedicalNote = mongoose.model('MedicalNote', medicalNoteSchema);
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const isObjectId = v => /^[a-f\d]{24}$/i.test(String(v || ''));

function sanitiseIds(body) {
  ['patient', 'consultationNote', 'appointment'].forEach(k => {
    if (k in body && !isObjectId(body[k])) delete body[k];
  });
  return body;
}

router.use(protect);

/* ── GET /api/v1/medical-notes?patient=:id ───────────────────────────────── */
router.get('/', async (req, res, next) => {
  try {
    const { patient, limit = 50, consultationNote } = req.query;

    if (!patient) {
      return res.status(400).json({ success: false, message: 'patient ID required' });
    }

    /* Patients may only read their own notes */
    if (req.user.role === 'patient') {
      const Patient = require('../models/Patient');
      const p = await Patient.findOne({ user: req.user._id });
      if (!p || String(p._id) !== String(patient)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const filter = { patient };
    if (consultationNote && isObjectId(consultationNote)) {
      filter.consultationNote = consultationNote;
    }

    const notes = await MedicalNote.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('doctor',           'firstName lastName hpcsa practiceNumber')
      .populate('consultationNote', 'visitType consultationDate chiefComplaint');

    res.json({ success: true, count: notes.length, data: notes });
  } catch (err) { next(err); }
});

/* ── GET /api/v1/medical-notes/:id ──────────────────────────────────────── */
router.get('/:id', async (req, res, next) => {
  try {
    const note = await MedicalNote.findById(req.params.id)
      .populate('doctor',           'firstName lastName hpcsa practiceNumber')
      .populate('consultationNote', 'visitType consultationDate chiefComplaint')
      .populate('patient',          'fullName nationalId dateOfBirth');

    if (!note) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: note });
  } catch (err) { next(err); }
});

/* ── POST /api/v1/medical-notes ─────────────────────────────────────────── */
router.post(
  '/',
  authorize('doctor', 'nurse', 'admin', 'facility_admin', 'superadmin', 'medical_officer', 'gp', 'specialist'),
  async (req, res, next) => {
    try {
      const body = sanitiseIds({ ...req.body });

      /* Idempotency: if the frontend sends a key and we already have it, return the existing record */
      if (body.idempotencyKey) {
        const existing = await MedicalNote.findOne({ idempotencyKey: body.idempotencyKey });
        if (existing) {
          return res.status(200).json({ success: true, data: existing, duplicate: true });
        }
      }

      /* Validate required fields explicitly so we can return a clear message */
      const missing = [];
      if (!body.patient)            missing.push('patient');
      if (!body.primaryDiagnosis)   missing.push('primaryDiagnosis');
      if (!body.icd10)              missing.push('icd10');
      if (!body.diagnosisStatus)    missing.push('diagnosisStatus');
      if (!body.clinicalAssessment) missing.push('clinicalAssessment');
      if (!body.clinicalFindings)   missing.push('clinicalFindings');

      if (missing.length) {
        return res.status(422).json({
          success: false,
          message: `Missing required fields: ${missing.join(', ')}`,
          missing,
        });
      }

      /* Doctor snapshot */
      const User = require('../models/User');
      const doctor = await User.findById(req.user._id)
        .select('firstName lastName hpcsa practiceNumber');
      const doctorName = doctor
        ? `Dr. ${(doctor.firstName || '')} ${(doctor.lastName || '')}`.trim()
        : (body.orderedByName || '');

      const note = await MedicalNote.create({
        patient:             body.patient,
        doctor:              req.user._id,
        consultationNote:    body.consultationNote || body.consultationId || undefined,
        appointment:         body.appointment || undefined,
        patientName:         body.patientName || '',
        primaryDiagnosis:    body.primaryDiagnosis,
        icd10:               body.icd10,
        diagnosisStatus:     body.diagnosisStatus,
        clinicalAssessment:  body.clinicalAssessment,
        clinicalFindings:    body.clinicalFindings,
        differentialDiagnosis: body.differentialDiagnosis || '',
        riskLevel:           body.riskLevel || 'Stable',
        confirmationBasis:   Array.isArray(body.confirmationBasis) ? body.confirmationBasis : [],
        additionalNotes:     body.additionalNotes || '',
        orderedByName:       doctorName,
        recordedAt:          body.recordedAt ? new Date(body.recordedAt) : new Date(),
        idempotencyKey:      body.idempotencyKey || undefined,
      });

      /* Optionally update the linked consultation note with icd10 */
      if (body.consultationNote && isObjectId(body.consultationNote)) {
        try {
          let ConsultationNote;
          try { ConsultationNote = mongoose.model('ConsultationNote'); } catch (_) {}
          if (ConsultationNote) {
            await ConsultationNote.findByIdAndUpdate(body.consultationNote, {
              icd10Code:        body.icd10,
              icd10Description: body.primaryDiagnosis,
            });
          }
        } catch (_) { /* non-fatal */ }
      }

      const populated = await MedicalNote.findById(note._id)
        .populate('doctor', 'firstName lastName hpcsa practiceNumber');

      res.status(201).json({ success: true, data: populated });
    } catch (err) { next(err); }
  }
);

/* ── PATCH /api/v1/medical-notes/:id ────────────────────────────────────── */
router.patch(
  '/:id',
  authorize('doctor', 'admin', 'superadmin'),
  async (req, res, next) => {
    try {
      const note = await MedicalNote.findById(req.params.id);
      if (!note) return res.status(404).json({ success: false, message: 'Record not found' });

      if (String(note.doctor) !== String(req.user._id) && !['admin', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'You can only amend your own records' });
      }

      const allowed = [
        'primaryDiagnosis', 'icd10', 'diagnosisStatus',
        'clinicalAssessment', 'clinicalFindings',
        'differentialDiagnosis', 'riskLevel', 'confirmationBasis', 'additionalNotes',
      ];
      allowed.forEach(k => { if (k in req.body) note[k] = req.body[k]; });
      await note.save();

      res.json({ success: true, data: note });
    } catch (err) { next(err); }
  }
);

module.exports = router;
