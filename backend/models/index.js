'use strict';

const mongoose = require('mongoose');

// ════════════════════════════════════════
// FACILITY
// ════════════════════════════════════════
const facilitySchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  type:       { type: String, enum: ['clinic','CHC','regional','tertiary','national'], required: true },
  province:   { type: String, required: true },
  address:    { type: String },
  phone:      { type: String },
  email:      { type: String },
  isOnline:   { type: Boolean, default: true },
  lastSeen:   { type: Date, default: Date.now }
}, { timestamps: true });

facilitySchema.index({ province: 1 });

const Facility = mongoose.model('Facility', facilitySchema);

// ════════════════════════════════════════
// APPOINTMENT
// ════════════════════════════════════════
const appointmentSchema = new mongoose.Schema({
  patient:      { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  facility:     { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
  visitType:    {
    type: String,
    enum: ['consultation','telemedicine','lab','immunisation','specialist','mental_health'],
    required: true
  },
  scheduledAt:  { type: Date, required: true },
  duration:     { type: Number, default: 20 },          // minutes
  status:       { type: String, enum: ['pending','confirmed','in_progress','completed','cancelled','no_show'], default: 'pending' },
  queueToken:   { type: String },
  reason:       { type: String, trim: true, maxlength: 500 },
  notes:        { type: String, trim: true },
  icd10Code:    { type: String, trim: true },
  priority:     { type: Boolean, default: false },
  interpreterLanguage: { type: String },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reminder24Sent: { type: Boolean, default: false },
  reminder1Sent:  { type: Boolean, default: false },
  // Triage fields
  triageLevel:    { type: Number, min: 1, max: 5 },
  triageScore:    { type: Number, default: 0 },
  triageLabel:    { type: String },
  chiefComplaint: { type: String, trim: true },
  triageNotes:    { type: String, trim: true },
  triagedAt:      { type: Date },
  triagedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vitals:         {
    bp:          { systolic: Number, diastolic: Number },
    heartRate:   Number,
    temperature: Number,
    spO2:        Number,
    weight:      Number
  },
  // Queue fields
  checkedInAt:    { type: Date },
  calledAt:       { type: Date },
  priorityReason: { type: String },
  isWalkIn:          { type: Boolean, default: false },
  rescheduleReason:  { type: String, trim: true },
  rescheduledAt:     { type: Date },
  rescheduledBy:     { type: String }
}, { timestamps: true });

appointmentSchema.index({ patient: 1, scheduledAt: -1 });
appointmentSchema.index({ doctor: 1, scheduledAt: 1 });
appointmentSchema.index({ facility: 1, scheduledAt: 1 });
appointmentSchema.index({ status: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

// ════════════════════════════════════════
// MEDICATION (stock catalogue)
// ════════════════════════════════════════
const medicationSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  genericName:  { type: String, trim: true },
  strength:     { type: String, trim: true },
  form:         { type: String, enum: ['tablet','capsule','syrup','injection','cream','drops','inhaler'], default: 'tablet' },
  facility:     { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
  stockQty:     { type: Number, required: true, default: 0, min: 0 },
  reorderLevel: { type: Number, default: 50 },
  maxStock:     { type: Number, default: 500 },
  unit:         { type: String, default: 'units' },
  isActive:     { type: Boolean, default: true }
}, { timestamps: true });

medicationSchema.index({ facility: 1 });
medicationSchema.index({ name: 'text', genericName: 'text' });

const Medication = mongoose.model('Medication', medicationSchema);

// ════════════════════════════════════════
// PRESCRIPTION
// ════════════════════════════════════════
const prescriptionLineSchema = new mongoose.Schema({
  medication:   { type: mongoose.Schema.Types.ObjectId, ref: 'Medication', required: true },
  medicationName: { type: String, required: true },     // denormalised
  dosage:       { type: String, required: true, trim: true },
  frequency:    { type: String, required: true, trim: true },
  durationDays: { type: Number, required: true },
  quantity:     { type: Number, required: true },
  instructions: { type: String, trim: true }
}, { _id: true });

const prescriptionSchema = new mongoose.Schema({
  patient:       { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  prescribedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointment:   { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  facility:      { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
  lines:         [prescriptionLineSchema],
  status:        { type: String, enum: ['pending','dispensed','cancelled','transferred'], default: 'pending' },
  dispensedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dispensedAt:   { type: Date },
  notes:         { type: String, trim: true },
  refillsAllowed: { type: Number, default: 0 },
  refillsUsed:   { type: Number, default: 0 }
}, { timestamps: true });

prescriptionSchema.index({ patient: 1, createdAt: -1 });
prescriptionSchema.index({ facility: 1, status: 1 });
prescriptionSchema.index({ prescribedBy: 1 });

const Prescription = mongoose.model('Prescription', prescriptionSchema);

// ════════════════════════════════════════
// LAB ORDER
// ════════════════════════════════════════
const labOrderSchema = new mongoose.Schema({
  patient:      { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  orderedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointment:  { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  facility:     { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
  tests: [{
    name:    { type: String, required: true },
    code:    { type: String },
    result:  { type: String },
    unit:    { type: String },
    flag:    { type: String, enum: ['normal','high','low','critical'] },
    resultAt: { type: Date }
  }],
  priority:     { type: String, enum: ['routine','urgent','stat'], default: 'routine' },
  status:       { type: String, enum: ['ordered','in_lab','processing','ready','collected'], default: 'ordered' },
  clinicalNotes: { type: String, trim: true },
  estimatedAt:  { type: Date },
  completedAt:  { type: Date }
}, { timestamps: true });

labOrderSchema.index({ patient: 1, createdAt: -1 });
labOrderSchema.index({ facility: 1, status: 1 });

const LabOrder = mongoose.model('LabOrder', labOrderSchema);

module.exports = { Facility, Appointment, Medication, Prescription, LabOrder };
