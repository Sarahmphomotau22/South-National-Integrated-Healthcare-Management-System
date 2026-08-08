'use strict';
/**
 * backend/routes/consultationNotes.js
 * 
 * Add to server.js / app.js:
 *   app.use('/api/v1/consultation-notes', require('./routes/consultationNotes'));
 * 
 * Add ConsultationNote schema to models/index.js (see bottom of this file)
 */
const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/auth');
const mongoose = require('mongoose');

/* ── Schema (add this to models/index.js and export as ConsultationNote) ── */
const consultationNoteSchema = new mongoose.Schema({
  patient:         { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  appointment:     { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  facility:        { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  doctor:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  /* Clinical content */
  chiefComplaint:  { type: String, trim: true },
  clinicalNotes:   { type: String, trim: true },
  icd10Code:       { type: String, trim: true },
  icd10Description:{ type: String, trim: true },
  treatmentPlan:   { type: String, trim: true },
  followUpDate:    { type: Date },
  followUpNotes:   { type: String, trim: true },

  /* Doctor context (snapshot at time of note) */
  doctorName:      { type: String },
  practiceNumber:  { type: String },
  facilityName:    { type: String },

  /* Metadata */
  isConfidential:  { type: Boolean, default: false },
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

consultationNoteSchema.index({ patient: 1, createdAt: -1 });
consultationNoteSchema.index({ doctor: 1 });

let ConsultationNote;
try {
  ConsultationNote = mongoose.model('ConsultationNote');
} catch(_) {
  ConsultationNote = mongoose.model('ConsultationNote', consultationNoteSchema);
}

router.use(protect);

/* GET /api/v1/consultation-notes?patient=:id — get all notes for a patient */
router.get('/', async (req, res, next) => {
  try {
    const { patient, limit = 50 } = req.query;
    if (!patient) return res.status(400).json({ success: false, message: 'patient ID required' });

    /* Patients can only see their own notes */
    if (req.user.role === 'patient') {
      const Patient = require('../models/Patient');
      const p = await Patient.findOne({ user: req.user._id });
      if (!p || String(p._id) !== String(patient))
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const notes = await ConsultationNote.find({ patient })
      .sort({ createdAt: -1 })
      .limit(+limit)
      .populate('doctor',   'firstName lastName practiceNumber hpcsa email')
      .populate('facility', 'name address')
      .populate('appointment', 'scheduledAt visitType');

    res.json({ success: true, data: notes });
  } catch(err) { next(err); }
});

/* POST /api/v1/consultation-notes — create a note */
router.post('/', authorize('doctor','nurse','admin','facility_admin'), async (req, res, next) => {
  try {
    const { patient, appointment, facility, chiefComplaint, clinicalNotes, icd10Code,
            icd10Description, treatmentPlan, followUpDate, followUpNotes } = req.body;

    if (!patient)       return res.status(400).json({ success: false, message: 'patient is required' });
    if (!clinicalNotes && !chiefComplaint)
      return res.status(400).json({ success: false, message: 'At least chiefComplaint or clinicalNotes is required' });

    /* Snapshot doctor details at time of writing */
    const User = require('../models/User');
    const doctor = await User.findById(req.user._id).select('firstName lastName practiceNumber hpcsa');
    const { Facility } = require('../models/index');
    const fac = facility ? await Facility.findById(facility).select('name') : null;

    const note = await ConsultationNote.create({
      patient, appointment, facility,
      doctor:           req.user._id,
      chiefComplaint,   clinicalNotes,
      icd10Code,        icd10Description,
      treatmentPlan,    followUpDate, followUpNotes,
      doctorName:       `Dr. ${doctor?.firstName||''} ${doctor?.lastName||''}`.trim(),
      practiceNumber:   doctor?.practiceNumber || doctor?.hpcsa || 'Not registered',
      facilityName:     fac?.name || '',
      createdBy:        req.user._id,
    });

    /* Also update the appointment notes field if appointment provided */
    if (appointment) {
      const { Appointment } = require('../models/index');
      await Appointment.findByIdAndUpdate(appointment, {
        notes:     clinicalNotes,
        icd10Code: icd10Code,
        status:    'in_progress',
      });
    }

    const populated = await ConsultationNote.findById(note._id)
      .populate('doctor',   'firstName lastName practiceNumber hpcsa')
      .populate('facility', 'name')
      .populate('appointment', 'scheduledAt visitType');

    res.status(201).json({ success: true, data: populated });
  } catch(err) { next(err); }
});

/* PATCH /api/v1/consultation-notes/:id — update a note */
router.patch('/:id', authorize('doctor','admin'), async (req, res, next) => {
  try {
    const note = await ConsultationNote.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
    if (String(note.doctor) !== String(req.user._id) && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'You can only edit your own notes' });

    Object.assign(note, req.body);
    await note.save();
    res.json({ success: true, data: note });
  } catch(err) { next(err); }
});

module.exports = router;

/*
 ═══════════════════════════════════════════════════════════════
 ADD TO backend/models/index.js:
 ═══════════════════════════════════════════════════════════════

 const consultationNoteSchema = new mongoose.Schema({
   patient:          { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
   appointment:      { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
   facility:         { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
   doctor:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
   chiefComplaint:   { type: String },
   clinicalNotes:    { type: String },
   icd10Code:        { type: String },
   icd10Description: { type: String },
   treatmentPlan:    { type: String },
   followUpDate:     { type: Date },
   followUpNotes:    { type: String },
   doctorName:       { type: String },
   practiceNumber:   { type: String },
   facilityName:     { type: String },
   createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
 }, { timestamps: true });
 consultationNoteSchema.index({ patient: 1, createdAt: -1 });
 const ConsultationNote = mongoose.model('ConsultationNote', consultationNoteSchema);

 ADD ConsultationNote to module.exports:
   module.exports = { ..., ConsultationNote };

 ADD TO backend/server.js or app.js:
   app.use('/api/v1/consultation-notes', require('./routes/consultationNotes'));
 ═══════════════════════════════════════════════════════════════
*/
