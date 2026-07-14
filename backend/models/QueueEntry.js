'use strict';
const mongoose = require('mongoose');

const queueEntrySchema = new mongoose.Schema({
  // Identity
  facility:      { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
  patient:       { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  appointment:   { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  doctor:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Token
  token:         { type: String, required: true },        // e.g. A-01, E-01, W-01
  tokenType:     { type: String, enum: ['normal','emergency','priority','walkin'], default: 'normal' },
  qrCode:        { type: String },                        // base64 QR or URL

  // Patient info (cached for display)
  patientName:   { type: String },
  patientPhone:  { type: String },
  patientAge:    { type: Number },
  patientEmail:  { type: String },

  // Priority
  priority:      { type: Number, default: 0 },            // 0=normal, 1=priority, 2=emergency
  priorityReason:{ type: String },                        // elderly, pregnant, disabled, emergency

  // Status flow
  status: { type: String,
    enum: ['waiting','called','in_consultation','post_consultation','lab','pharmacy','completed','skipped','cancelled'],
    default: 'waiting'
  },
  currentStage:  { type: String, enum: ['waiting','consultation','lab','pharmacy','billing','done'], default: 'waiting' },

  // Queue position
  position:      { type: Number },
  estimatedWait: { type: Number, default: 0 },            // minutes

  // Timing
  checkInTime:       { type: Date, default: Date.now },
  calledTime:        { type: Date },
  consultStartTime:  { type: Date },
  consultEndTime:    { type: Date },
  completedTime:     { type: Date },

  // Routing flags
  needsLab:      { type: Boolean, default: false },
  needsPharmacy: { type: Boolean, default: false },
  needsBilling:  { type: Boolean, default: false },

  // Notifications sent
  notified1:     { type: Boolean, default: false },       // 3 places away
  notified2:     { type: Boolean, default: false },       // 1 place away
  delayNotified: { type: Boolean, default: false },

  // Feedback
  satisfaction:  { type: Number, min: 1, max: 5 },
  feedbackNote:  { type: String },

  // Audit
  notes:         { type: String },
  handledBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  language:      { type: String, default: 'en' },

}, { timestamps: true });

queueEntrySchema.index({ facility: 1, status: 1, priority: -1, position: 1 });
queueEntrySchema.index({ patient: 1, createdAt: -1 });
queueEntrySchema.index({ token: 1, facility: 1 });

module.exports = mongoose.model('QueueEntry', queueEntrySchema);
