'use strict';
const mongoose = require('mongoose');

const vitalSchema = new mongoose.Schema({
  recordedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedAt:  { type: Date, default: Date.now },
  bp:          { systolic: Number, diastolic: Number },
  heartRate:   Number,
  temperature: Number,
  spO2:        Number,
  weight:      Number,
  height:      Number,
  bmi:         Number
}, { _id: false });

const conditionSchema = new mongoose.Schema({
  icd10Code:   { type: String, required: true },
  name:        { type: String, required: true },
  status:      { type: String, enum: ['active','resolved','monitored','chronic'], default: 'active' },
  diagnosedAt: { type: Date, default: Date.now },
  diagnosedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: true });

const patientSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },

  // ── Core identification ──
  firstName:    { type: String, required: true, trim: true },
  middleName:   { type: String, trim: true, default: '' },
  lastName:     { type: String, required: true, trim: true },
  dateOfBirth:  { type: Date, required: true },
  gender:       { type: String, enum: ['male','female','non-binary','prefer_not_to_say'], required: true },
  nationalId:   { type: String, required: true, trim: true },  // SA ID or passport
  idType:       { type: String, enum: ['sa_id','passport','other'], default: 'sa_id' },
  mrn:          { type: String, unique: true, sparse: true },  // auto-generated Medical Record Number
  bloodType:    { type: String, enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-','unknown'], default: 'unknown' },

  // ── Contact ──
  phone:        { type: String, trim: true },
  phoneAlt:     { type: String, trim: true, default: '' },
  email:        { type: String, trim: true, lowercase: true, default: '' },

  // ── Address ──
  address: {
    street:     { type: String, trim: true, default: '' },
    suburb:     { type: String, trim: true, default: '' },
    city:       { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
    province:   { type: String, trim: true, default: '' }
  },

  // ── Next of kin ──
  nextOfKin: {
    name:         { type: String, trim: true, default: '' },
    relationship: { type: String, trim: true, default: '' },
    phone:        { type: String, trim: true, default: '' },
    phoneAlt:     { type: String, trim: true, default: '' }
  },

  // ── ID document upload ──
  idDocument: {
    filename:   { type: String, default: '' },
    url:        { type: String, default: '' },   // S3/cloud URL in production
    uploadedAt: { type: Date }
  },

  // ── Medical ──
  allergies:      [{ type: String, trim: true }],
  conditions:     [conditionSchema],
  latestVitals:   vitalSchema,

  // ── Admin ──
  isVerified:      { type: Boolean, default: false },
  primaryFacility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  registeredBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  biometricHash:   { type: String, select: false }

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => { delete ret.__v; return ret; }
  }
});

// ── Indexes ──
patientSchema.index({ nationalId: 1 }, { unique: true });
patientSchema.index({ lastName: 1, firstName: 1 });
patientSchema.index({ phone: 1 });
patientSchema.index({ mrn: 1 }, { unique: true, sparse: true });

// ── Auto-generate MRN before first save ──
patientSchema.pre('save', async function (next) {
  if (this.mrn) return next();
  const count = await mongoose.model('Patient').countDocuments();
  this.mrn = 'MRN-' + String(count + 1).padStart(6, '0');
  next();
});

// ── Virtuals ──
patientSchema.virtual('fullName').get(function () {
  const mid = this.middleName ? ` ${this.middleName}` : '';
  return `${this.firstName}${mid} ${this.lastName}`;
});

patientSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  return Math.floor((Date.now() - this.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
});

patientSchema.virtual('initials').get(function () {
  return (this.firstName[0] + this.lastName[0]).toUpperCase();
});

module.exports = mongoose.model('Patient', patientSchema);
