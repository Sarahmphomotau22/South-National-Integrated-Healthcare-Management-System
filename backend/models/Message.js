'use strict';
/**
 * models/Message.js
 * Internal staff messaging — receptionist ↔ doctor ↔ nurse ↔ pharmacy
 */
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // ── Sender ──────────────────────────────────────────────────────────────────
  senderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderName:   { type: String, required: true },
  senderRole:   { type: String, required: true,
                  enum: ['RECEPTIONIST','DOCTOR','DOCTOR/CLINICIAN','NURSE','NURSE_STATION','PHARMACY','ADMIN','LAB','RADIOLOGY','PATIENT'] },

  // ── Recipient ────────────────────────────────────────────────────────────────
  recipientId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recipientRole: { type: String,
                   enum: ['RECEPTIONIST','DOCTOR','DOCTOR/CLINICIAN','NURSE','NURSE_STATION','PHARMACY','ADMIN','LAB','RADIOLOGY','PATIENT','ALL'] },
  recipientName: { type: String },

  // ── Content ──────────────────────────────────────────────────────────────────
  subject:  { type: String, default: '(No subject)', trim: true },
  body:     { type: String, required: true, trim: true },

  // ── Metadata ─────────────────────────────────────────────────────────────────
  priority:    { type: String, enum: ['Normal','High','Urgent'], default: 'Normal' },
  status:      { type: String, enum: ['sent','delivered','read','failed'], default: 'sent' },
  readStatus:  { type: String, enum: ['unread','read'], default: 'unread' },
  readAt:      { type: Date },
  sentAt:      { type: Date, default: Date.now },

  // ── Threading ────────────────────────────────────────────────────────────────
  threadId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }, // null = root message
  replyTo:     { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },

  // ── Soft delete ──────────────────────────────────────────────────────────────
  deletedBySender:    { type: Boolean, default: false },
  deletedByRecipient: { type: Boolean, default: false },

}, { timestamps: true });

// Indexes for the two main query patterns
messageSchema.index({ recipientRole: 1, sentAt: -1 });
messageSchema.index({ recipientId:   1, sentAt: -1 });
messageSchema.index({ senderId:       1, sentAt: -1 });
messageSchema.index({ senderRole:     1, sentAt: -1 });
messageSchema.index({ threadId:       1, sentAt:  1 });

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);