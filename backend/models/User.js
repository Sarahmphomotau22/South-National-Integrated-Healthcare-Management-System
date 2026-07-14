'use strict';
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName:    { type: String, required: [true, 'First name is required'], trim: true, maxlength: 60 },
  lastName:     { type: String, required: [true, 'Last name is required'],  trim: true, maxlength: 60 },
  email: {
    type: String, required: [true, 'Email is required'],
    unique: true, lowercase: true, trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: { type: String, required: [true, 'Password is required'], minlength: 8, select: false },

  // ── ALL roles supported ──
  role: {
    type: String,
    enum: [
      'super_admin',    // system-wide administrator
      'admin',          // legacy alias — same level as super_admin
      'facility_admin', // manages one facility
      'doctor',         // medical doctor / clinician
      'nurse',          // registered nurse / triage
      'receptionist',   // front desk / patient check-in
      'lab_worker',     // laboratory technician
      'pharmacy',       // pharmacist / dispenser
      'finance',        // billing and finance officer
      'patient',        // registered patient
    ],
    required: [true, 'Role is required'],
    default: 'patient'
  },

  facility:     { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  facilityName: { type: String, trim: true },

  // Profile
  phone:       { type: String, trim: true },
  nationalId:  { type: String, trim: true, sparse: true },
  gender:      { type: String, enum: ['male', 'female', 'prefer_not_to_say'] },
  dateOfBirth: { type: Date },
  bloodType:   { type: String, enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-','unknown'], default: 'unknown' },
  address:     { type: String, trim: true },

  // Auth / security
  isActive:      { type: Boolean, default: true },
  isVerified:    { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  refreshToken:  { type: String, select: false },
  otpHash:       { type: String, select: false },
  otpExpires:    { type: Date,   select: false },
  lastLogin:     { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil:     { type: Date },

  // Staff registration flag
  registeredByStaff: { type: Boolean, default: false },

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      delete ret.password; delete ret.refreshToken;
      delete ret.otpHash;  delete ret.otpExpires;
      delete ret.__v;
      return ret;
    }
  }
});

// ── Indexes ──
userSchema.index({ role: 1 });
userSchema.index({ facility: 1 });

// ── Virtuals ──
userSchema.virtual('fullName').get(function () { return `${this.firstName} ${this.lastName}`; });
userSchema.virtual('initials').get(function () {
  return ((this.firstName||'U')[0] + (this.lastName||'S')[0]).toUpperCase();
});

// ── Pre-save: hash password ──
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

// ── Instance methods ──
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

module.exports = mongoose.model('User', userSchema);
