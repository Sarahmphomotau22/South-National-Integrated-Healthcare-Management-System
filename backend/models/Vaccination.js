'use strict';

const mongoose = require('mongoose');

const vaccinationSchema = new mongoose.Schema(
  {
    // ── Client-generated ID (UUID from nurse.js) ──────────────────────────────
    id: { type: String, unique: true, sparse: true }, // frontend UUID; _id is the real Mongo id

    // ── Patient identifiers ───────────────────────────────────────────────────
    patientId:          { type: String, index: true },  // Mongo patient _id or API id
    patientName:        { type: String },
    patientNationalId:  { type: String, index: true },
    patientFileNumber:  { type: String, index: true },
    patientDob:         { type: String },
    patientSex:         { type: String, enum: ['Male', 'Female', 'Other', ''] },

    // ── Vaccine details ───────────────────────────────────────────────────────
    vaccineId:   { type: String, index: true },
    vaccine:     { type: String, required: true },
    dose:        { type: String },           // "Dose 1", "Dose 2", "Booster", etc.
    batch:       { type: String },
    date:        { type: String, index: true },  // ISO date string (YYYY-MM-DD)
    time:        { type: String },               // HH:MM

    // ── Notes / site / route ─────────────────────────────────────────────────
    notes:       { type: String },

    // ── Vaccinator ───────────────────────────────────────────────────────────
    vaccinator:        { type: String },  // staff _id
    vaccinatorName:    { type: String },
    vaccinatorReg:     { type: String },  // professional registration number
    vaccinatorStaffId: { type: String },

    // ── Recorder (may differ from vaccinator) ────────────────────────────────
    recordedBy:   { type: String },  // staff _id
    recordedById: { type: String },
    recordedAt:   { type: Date, default: () => new Date() },
    updatedBy:    { type: String },
    updatedAt:    { type: Date },

    // ── Facility / appointment ────────────────────────────────────────────────
    facilityId:    { type: String, index: true },
    appointmentId: { type: String, index: true },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['recorded', 'verified', 'voided'],
      default: 'recorded',
      index:   true,
    },
  },
  {
    timestamps:  true,             // adds createdAt / updatedAt (Mongoose managed)
    versionKey:  false,
    collection:  'vaccinations',
  }
);

// Compound index for the most common query: a patient's vaccination history
vaccinationSchema.index({ patientId: 1, date: -1 });
vaccinationSchema.index({ patientNationalId: 1, date: -1 });
vaccinationSchema.index({ facilityId: 1, date: -1 });

module.exports = mongoose.model('Vaccination', vaccinationSchema);
