'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName:    { type: String, required: [true, 'First name is required'], trim: true, maxlength: 60 },
  lastName:     { type: String, required: [true, 'Last name is required'],  trim: true, maxlength: 60 },
  email:        {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password:     { type: String, required: [true, 'Password is required'], minlength: 8, select: false },

  role: {
    type: String,
    enum: ['patient', 'nurse', 'doctor', 'pharmacy', 'admin'],
    required: [true, 'Role is required']
  },

  facility:     { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  facilityName: { type: String, trim: true },   // denormalised for quick display

  // Profile
  phone:        { type: String, trim: true },
  nationalId:   { type: String, trim: true },  // for patient role
  gender:       { type: String, enum: ['male', 'female', 'non-binary', 'prefer_not_to_say'] },
  dateOfBirth:  { type: Date },
  bloodType:    { type: String, enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-','unknown'], default: 'unknown' },
  address:      { type: String, trim: true },

  // Auth / security
  isActive:              { type: Boolean, default: true },
  isVerified:            { type: Boolean, default: false },
  emailVerified:         { type: Boolean, default: false },
  emailVerifyToken:      { type: String, select: false },
  emailVerifyExpires:    { type: Date,   select: false },
  refreshToken:   { type: String, select: false },
  otpHash:        { type: String, select: false },
  otpExpires:     { type: Date,   select: false },
  lastLogin:      { type: Date },
  loginAttempts:  { type: Number, default: 0 },
  lockUntil:      { type: Date }

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      delete ret.password;
      delete ret.refreshToken;
      delete ret.otpHash;
      delete ret.otpExpires;
      delete ret.__v;
      return ret;
    }
  }
});

// ── Indexes (defined once here — do NOT also set unique/sparse on the field above) ──
userSchema.index({ email: 1 },      { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ facility: 1 });
userSchema.index({ nationalId: 1 }, { sparse: true });

// ── Virtual: full name ──
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ── Virtual: initials ──
userSchema.virtual('initials').get(function () {
  return (this.firstName[0] + this.lastName[0]).toUpperCase();
});

// ── Pre-save: hash password ──
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

// ── Instance method: compare password ──
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ── Instance method: is account locked? ──
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

module.exports = mongoose.model('User', userSchema);
