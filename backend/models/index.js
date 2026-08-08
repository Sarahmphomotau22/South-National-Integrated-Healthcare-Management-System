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
  visitType: {
    type: String,
    enum: [
      'consultation', 'telemedicine', 'follow_up', 'lab',
      'immunisation', 'mental_health',
      'maternal_child_health',
      'pharmacy_pickup',
      'specialist_referral',
      'wellness',
      'emergency'
    ],
    default: 'consultation'
  },
  scheduledAt:  { type: Date, required: true },
  duration:     { type: Number, default: 20 },
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
  triageLevel:    { type: Number, min: 1, max: 5 },
  triageScore:    { type: Number, default: 0 },
  triageLabel:    { type: String },
  chiefComplaint: { type: String, trim: true },
  triageNotes:    { type: String, trim: true },
  triagedAt:      { type: Date },
  triagedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vitals: {
    bp:          { systolic: Number, diastolic: Number },
    heartRate:   Number,
    temperature: Number,
    spO2:        Number,
    weight:      Number
  },
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
  strength:     { type: String },
  category:     { type: String },
  stockQty:     { type: Number, default: 0, min: 0 },
  maxStock:     { type: Number, default: 1000 },
  reorderLevel: { type: Number, default: 50 },
  batchNumber:  { type: String },
  expiryDate:   { type: Date },
  supplier:     { type: String },
  unitCost:     { type: Number, default: 0 },
  facility:     { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

medicationSchema.index({ name: 1, facility: 1 });
medicationSchema.index({ expiryDate: 1 });

const Medication = mongoose.models.Medication || mongoose.model('Medication', medicationSchema);

// ════════════════════════════════════════
// PRESCRIPTION
// ════════════════════════════════════════
const prescriptionLineSchema = new mongoose.Schema({
  medication:     { type: mongoose.Schema.Types.ObjectId, ref: 'Medication' },
  medicationName: { type: String, required: true },
  dosage:         { type: String, required: true, trim: true },
  frequency:      { type: String, trim: true },
  durationDays:   { type: Number },
  quantity:       { type: Number },
  instructions:   { type: String, trim: true }
}, { _id: true });

const prescriptionSchema = new mongoose.Schema({
  patient:       { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  prescribedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appointment:   { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  facility:      { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  lines:         [prescriptionLineSchema],
  status:        { type: String, enum: ['pending','dispensed','cancelled','transferred'], default: 'pending' },
  dispensedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dispensedAt:   { type: Date },
  notes:         { type: String, trim: true },
  refillsAllowed: { type: Number, default: 0 },
  refillsUsed:    { type: Number, default: 0 }
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
    name:      { type: String, required: true },
    code:      { type: String },
    result:    { type: String },
    unit:      { type: String },
    flag:      { type: String, enum: ['normal','high','low','critical'] },
    resultAt:  { type: Date }
  }],
  priority:      { type: String, enum: ['routine','urgent','stat'], default: 'routine' },
  status:        { type: String, enum: ['ordered','in_lab','processing','ready','collected'], default: 'ordered' },
  clinicalNotes: { type: String, trim: true },
  estimatedAt:   { type: Date },
  completedAt:   { type: Date }
}, { timestamps: true });

labOrderSchema.index({ patient: 1, createdAt: -1 });
labOrderSchema.index({ facility: 1, status: 1 });

const LabOrder = mongoose.model('LabOrder', labOrderSchema);

// ════════════════════════════════════════
// CONSULTATION NOTE  ← ADD THIS
// ════════════════════════════════════════
const consultationNoteSchema = new mongoose.Schema({
  patient:          { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  appointment:      { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  facility:         { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  doctor:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Clinical content
  chiefComplaint:   { type: String, trim: true },
  clinicalNotes:    { type: String, trim: true },
  icd10Code:        { type: String, trim: true },
  icd10Description: { type: String, trim: true },
  treatmentPlan:    { type: String, trim: true },
  followUpDate:     { type: Date },
  followUpNotes:    { type: String, trim: true },

  // Doctor snapshot at time of writing
  doctorName:       { type: String },
  practiceNumber:   { type: String },
  facilityName:     { type: String },

  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

consultationNoteSchema.index({ patient: 1, createdAt: -1 });
consultationNoteSchema.index({ doctor: 1 });

const ConsultationNote = mongoose.model('ConsultationNote', consultationNoteSchema);

// ════════════════════════════════════════
// EXPORTS  ← ConsultationNote added here
// ════════════════════════════════════════
module.exports = { Facility, Appointment, Medication, Prescription, LabOrder, ConsultationNote };

 //═══════════════════════════════════════════════════════
 //SURVEY RESULT
// ════════════════════════════════════════
const surveySchema = new mongoose.Schema({
  patient:      { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  queueToken:   { type: String },
  appointment:  { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  facility:     { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  submittedAt:  { type: Date, default: Date.now },
  booking:      { type: mongoose.Schema.Types.Mixed },
  checkin:      { type: mongoose.Schema.Types.Mixed },
  queue:        { type: mongoose.Schema.Types.Mixed },
  consultation: { type: mongoose.Schema.Types.Mixed },
  pharmacy:     { type: mongoose.Schema.Types.Mixed },
  overall:      { type: mongoose.Schema.Types.Mixed },
  openText:     { type: mongoose.Schema.Types.Mixed },
  overallScore: { type: Number },
}, { timestamps: true });

surveySchema.index({ facility: 1, createdAt: -1 });
surveySchema.index({ patient: 1 });

const SurveyResult = mongoose.model('SurveyResult', surveySchema);

module.exports = { Facility, Appointment, Medication, Prescription, LabOrder, ConsultationNote, SurveyResult };

 //═══════════════════════════════════════════════════════