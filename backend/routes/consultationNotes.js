'use strict';
/**
 * backend/routes/consultationNotes.js
 *
 * Add to server.js / app.js:
 *   app.use('/api/v1/consultation-notes', require('./routes/consultationNotes'));
 */
const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/auth');
const mongoose = require('mongoose');

/* ── Schema ── */
const consultationNoteSchema = new mongoose.Schema({
  patient:         { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: false },
  appointment:     { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  facility:        { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  doctor:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  /* Clinical content */
  chiefComplaint:    { type: String, trim: true },
  clinicalNotes:     { type: String, trim: true },   // saved from clinicianNotes / clinicalNotes
  icd10Code:         { type: String, trim: true },
  icd10Description:  { type: String, trim: true },
  treatmentPlan:     { type: String, trim: true },
  followUpDate:      { type: Date },
  followUpNotes:     { type: String, trim: true },

  /* Extended fields sent by the frontend consultation form */
  visitType:         { type: String, trim: true },
  consultationDate:  { type: String },
  consultationTime:  { type: String },
  registrationNo:    { type: String, trim: true },
  onset:             { type: String, trim: true },
  duration:          { type: String, trim: true },
  severity:          { type: String, trim: true },
  symptoms:          { type: String, trim: true },
  relevantHistory:   { type: String, trim: true },
  currentMeds:       { type: String, trim: true },
  allergies:         { type: String, trim: true },
  allergyDetails:    { type: String, trim: true },
  generalExamination:{ type: String, trim: true },
  systemExamination: { type: String, trim: true },
  outcomes:          [{ type: String }],
  vitals: {
    bloodPressure:   { type: String },
    pulse:           { type: String },
    temperature:     { type: String },
    spo2:            { type: String },
    respiratoryRate: { type: String },
    weight:          { type: String },
  },

  /* Doctor / facility snapshot at time of note */
  clinician:       { type: String },   // from frontend form field
  doctorName:      { type: String },   // resolved from DB
  practiceNumber:  { type: String },
  facilityName:    { type: String },   // plain-text name when no ObjectId

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

/* ─── helpers ─────────────────────────────────────────────────────── */
const isObjectId = v => /^[a-f\d]{24}$/i.test(String(v || ''));

/**
 * Strip fields that are empty strings but typed as ObjectId in the schema.
 * JSON.stringify drops `undefined`, but express bodyParser keeps empty strings.
 */
function sanitiseIds(body) {
  ['patient', 'facility', 'appointment'].forEach(k => {
    if (k in body && !isObjectId(body[k])) delete body[k];
  });
  return body;
}

router.use(protect);

/* ── GET /api/v1/consultation-notes?patient=:id ── */
router.get('/', async (req, res, next) => {
  try {
    const { patient, limit = 50 } = req.query;
    if (!patient) return res.status(400).json({ success: false, message: 'patient ID required' });

    if (req.user.role === 'patient') {
      const Patient = require('../models/Patient');
      const p = await Patient.findOne({ user: req.user._id });
      if (!p || String(p._id) !== String(patient))
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const notes = await ConsultationNote.find({ patient })
      .sort({ createdAt: -1 })
      .limit(+limit)
      .populate('doctor',      'firstName lastName practiceNumber hpcsa email')
      .populate('facility',    'name address')
      .populate('appointment', 'scheduledAt visitType');

    res.json({ success: true, data: notes });
  } catch(err) { next(err); }
});

/* ── POST /api/v1/consultation-notes ── */
router.post('/', authorize('doctor','nurse','admin','facility_admin','superadmin','medical_officer','gp','specialist'), async (req, res, next) => {
  try {
    const body = sanitiseIds({ ...req.body });

    /* Accept any field name the frontend may send for the notes */
    const clinicalNotes  = body.clinicianNotes || body.clinicalNotes || body.notes || body.clinician_notes || '';
    const chiefComplaint = body.chiefComplaint || body.chief_complaint || '';
    /* Don't block save if neither is filled — other fields (visitType, vitals etc.) are still useful */

    /* Snapshot doctor details */
    const User = require('../models/User');
    const doctor = await User.findById(req.user._id)
      .select('firstName lastName practiceNumber hpcsa');

    /* Resolve facility name — only look up if we have a valid ObjectId */
    let resolvedFacilityName = body.facilityName || '';
    if (body.facility && isObjectId(body.facility)) {
      try {
        const { Facility } = require('../models/index');
        const fac = await Facility.findById(body.facility).select('name');
        if (fac) resolvedFacilityName = fac.name;
      } catch(_) {}
    }

    const note = await ConsultationNote.create({
      /* IDs — already sanitised; missing ones just won't be set */
      patient:     body.patient,
      appointment: body.appointment,
      facility:    body.facility,
      doctor:      req.user._id,
      createdBy:   req.user._id,

      /* Clinical content */
      chiefComplaint,
      clinicalNotes,
      icd10Code:          body.icd10Code,
      icd10Description:   body.icd10Description,
      treatmentPlan:      body.treatmentPlan,
      followUpDate:       body.followUpDate || undefined,
      followUpNotes:      body.followUpNotes,

      /* Extended form fields */
      visitType:          body.visitType,
      consultationDate:   body.consultationDate,
      consultationTime:   body.consultationTime,
      registrationNo:     body.registrationNo,
      onset:              body.onset,
      duration:           body.duration,
      severity:           body.severity,
      symptoms:           body.symptoms,
      relevantHistory:    body.relevantHistory,
      currentMeds:        body.currentMeds,
      allergies:          body.allergies,
      allergyDetails:     body.allergyDetails,
      generalExamination: body.generalExamination,
      systemExamination:  body.systemExamination,
      outcomes:           body.outcomes || [],
      vitals:             body.vitals || {},

      /* Snapshots */
      clinician:      body.clinician || (`Dr. ${doctor?.firstName||''} ${doctor?.lastName||''}`.trim()),
      doctorName:     `Dr. ${doctor?.firstName||''} ${doctor?.lastName||''}`.trim(),
      practiceNumber: body.registrationNo || doctor?.practiceNumber || doctor?.hpcsa || '',
      facilityName:   resolvedFacilityName,
    });

    /* Update appointment status if linked */
    if (body.appointment) {
      try {
        const { Appointment } = require('../models/index');
        await Appointment.findByIdAndUpdate(body.appointment, {
          notes:     clinicalNotes,
          icd10Code: body.icd10Code,
          status:    'in_progress',
        });
      } catch(_) {}
    }

    const populated = await ConsultationNote.findById(note._id)
      .populate('doctor',      'firstName lastName practiceNumber hpcsa')
      .populate('facility',    'name')
      .populate('appointment', 'scheduledAt visitType');

    res.status(201).json({ success: true, data: populated });
  } catch(err) { next(err); }
});

/* ── PATCH /api/v1/consultation-notes/:id ── */
router.patch('/:id', authorize('doctor','admin'), async (req, res, next) => {
  try {
    const note = await ConsultationNote.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
    if (String(note.doctor) !== String(req.user._id) && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'You can only edit your own notes' });

    const body = sanitiseIds({ ...req.body });
    Object.assign(note, body);
    await note.save();
    res.json({ success: true, data: note });
  } catch(err) { next(err); }
});

module.exports = router;
