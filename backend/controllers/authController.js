'use strict';

const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const bcrypt     = require('bcryptjs');
const User       = require('../models/User');
const { sendEmail } = require('../utils/mailer');
const logger     = require('../utils/logger');

// ── Token helpers ──

const signAccess = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });

const signRefresh = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });

const sendTokens = async (user, statusCode, res) => {
  const accessToken  = signAccess(user._id);
  const refreshToken = signRefresh(user._id);

  // Store hashed refresh token
  user.refreshToken = await bcrypt.hash(refreshToken, 10);
  user.lastLogin    = new Date();
  user.loginAttempts = 0;
  user.lockUntil    = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      id:           user._id,
      firstName:    user.firstName,
      lastName:     user.lastName,
      fullName:     user.fullName,
      initials:     user.initials,
      email:        user.email,
      role:         user.role,
      facility:     user.facility,
      facilityName: user.facilityName
    }
  });
};

// ════════════════════════════════════════
// POST /api/v1/auth/register
// ════════════════════════════════════════
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role, facilityId, facilityName, phone } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const user = await User.create({
      firstName, lastName, email, password,
      role, facility: facilityId, facilityName, phone
    });

    // Auto-create a Patient record for patient role registrations
    // This allows them to book appointments and view health records immediately
    if (role === 'patient') {
      try {
        const Patient = require('../models/Patient');
        const { Facility } = require('../models/index');
        const facility = facilityId ? await Facility.findById(facilityId) : null;
        await Patient.create({
          user:            user._id,
          firstName,
          lastName,
          nationalId:      req.body.nationalId || `AUTO-${user._id}`,
          idType:          req.body.idType || 'sa_id',
          dateOfBirth:     req.body.dateOfBirth || new Date('2000-01-01'),
          gender:          req.body.gender || 'prefer_not_to_say',
          phone:           phone || '',
          email:           email || '',
          primaryFacility: facility?._id || null,
          registeredBy:    user._id,
          isVerified:      false,
          allergies:       [],
          conditions:      []
        });
        logger.info(`Auto-created patient record for ${email}`);
      } catch (patErr) {
        // Non-fatal — user account created, patient record can be created at clinic
        logger.warn(`Could not auto-create patient record: ${patErr.message}`);
      }
    }

    logger.info(`New user registered: ${email} (${role})`);
    await sendTokens(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// ════════════════════════════════════════
// POST /api/v1/auth/login
// ════════════════════════════════════════
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshToken +lockUntil');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.isLocked()) {
      const wait = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(429).json({ success: false, message: `Account locked. Try again in ${wait} minute(s).` });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lock
        logger.warn(`Account locked after failed attempts: ${email}`);
      }
      await user.save({ validateBeforeSave: false });
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact admin.' });
    }

    logger.info(`User logged in: ${email}`);
    await sendTokens(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ════════════════════════════════════════
// POST /api/v1/auth/refresh
// ════════════════════════════════════════
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || !user.refreshToken) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    const valid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const newAccess  = signAccess(user._id);
    const newRefresh = signRefresh(user._id);
    user.refreshToken = await bcrypt.hash(newRefresh, 10);
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) {
    next(err);
  }
};

// ════════════════════════════════════════
// POST /api/v1/auth/logout
// ════════════════════════════════════════
exports.logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

// ════════════════════════════════════════
// POST /api/v1/auth/forgot-password
// ════════════════════════════════════════
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always respond 200 to avoid email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
    }

    // Generate 6-digit OTP
    const otp    = String(Math.floor(100000 + Math.random() * 900000));
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;

    user.otpHash    = await bcrypt.hash(otp, rounds);
    user.otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    await user.save({ validateBeforeSave: false });

    await sendOtp({
      email: user.email,
      phone: user.phone || null,
      otp
    });

    logger.info(`OTP sent to ${email}`);
    res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
  } catch (err) {
    next(err);
  }
};

// ════════════════════════════════════════
// POST /api/v1/auth/reset-password
// ════════════════════════════════════════
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email }).select('+otpHash +otpExpires');
    if (!user || !user.otpHash || !user.otpExpires) {
      return res.status(400).json({ success: false, message: 'No OTP request found for this email.' });
    }

    if (user.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    const valid = await bcrypt.compare(otp, user.otpHash);
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP.' });
    }

    user.password   = newPassword;
    user.otpHash    = undefined;
    user.otpExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil  = undefined;
    await user.save();

    logger.info(`Password reset for ${email}`);
    res.json({ success: true, message: 'Password updated successfully. Please log in.' });
  } catch (err) {
    next(err);
  }
};

// ════════════════════════════════════════
// GET /api/v1/auth/me
// ════════════════════════════════════════
exports.getMe = async (req, res) => {
  res.json({ success: true, data: req.user });
};
