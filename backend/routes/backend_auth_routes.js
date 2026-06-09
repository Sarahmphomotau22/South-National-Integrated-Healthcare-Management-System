'use strict';
const express  = require('express');
const { body } = require('express-validator');
const router   = express.Router();
const ctrl     = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const pwdRules = [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
];

const newPwdRules = [
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
];

router.post('/register',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('role').isIn(['patient','nurse','doctor','pharmacy','admin']).withMessage('Invalid role'),
    ...pwdRules
  ],
  validate,
  ctrl.register
);

router.post('/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  ctrl.login
);

router.post('/refresh',  ctrl.refresh);
router.post('/logout',   protect, ctrl.logout);
router.get('/me',        protect, ctrl.getMe);

router.post('/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('Valid email required')],
  validate,
  ctrl.forgotPassword
);

// Reset password uses 'newPassword' field — separate rules to avoid conflict
router.post('/reset-password',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be exactly 6 digits'),
    ...newPwdRules
  ],
  validate,
  ctrl.resetPassword
);

// POST /api/v1/auth/change-password — logged-in user changes own password
router.post('/change-password', protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(422).json({ success: false, message: 'Current password and new password are required.' });
    }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(422).json({ success: false, message: 'New password must be at least 8 characters with one uppercase letter and one number.' });
    }
    const User   = require('../models/User');
    const bcrypt = require('bcryptjs');
    const user   = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const match = await user.comparePassword(currentPassword);
    if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    if (currentPassword === newPassword) {
      return res.status(422).json({ success: false, message: 'New password must be different from your current password.' });
    }

    user.password = newPassword;
    await user.save();

    const logger = require('../utils/logger');
    logger.info(`Password changed by user: ${user.email}`);
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) { next(err); }
});

// GET /api/v1/auth/verify-email?token=&email=
router.get('/verify-email', async (req, res, next) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) {
      return res.status(400).json({ success:false, message:'Invalid verification link.' });
    }

    const crypto = require('crypto');
    const User   = require('../models/User');

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      email:              email.toLowerCase(),
      emailVerifyToken:   hashedToken,
      emailVerifyExpires: { $gt: new Date() }
    }).select('+emailVerifyToken +emailVerifyExpires');

    if (!user) {
      return res.status(400).json({ success:false, message:'Verification link is invalid or has expired. Please register again or request a new link.' });
    }

    user.emailVerified       = true;
    user.isVerified          = true;
    user.emailVerifyToken    = undefined;
    user.emailVerifyExpires  = undefined;
    await user.save({ validateBeforeSave: false });

    const logger = require('../utils/logger');
    logger.info(`Email verified: ${email}`);
    res.json({ success:true, message:'Email verified successfully! You can now sign in.' });
  } catch (err) { next(err); }
});

// POST /api/v1/auth/resend-verification
router.post('/resend-verification', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success:false, message:'Email is required.' });

    const crypto = require('crypto');
    const User   = require('../models/User');
    const { sendWelcomeEmail } = require('../utils/mailer');
    const logger = require('../utils/logger');

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ success:true, message:'If that email exists, a new link has been sent.' });
    if (user.emailVerified) return res.status(400).json({ success:false, message:'This account is already verified.' });

    const verifyToken         = crypto.randomBytes(32).toString('hex');
    user.emailVerifyToken   = crypto.createHash('sha256').update(verifyToken).digest('hex');
    user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const clientUrl = (process.env.CLIENT_ORIGIN || 'http://localhost:5500').split(',')[0].trim();
    const verifyUrl = `${clientUrl}/verify-email.html?token=${verifyToken}&email=${encodeURIComponent(email)}`;
    await sendWelcomeEmail({ to: user.email, firstName: user.firstName, role: user.role, verifyUrl });

    logger.info(`Verification email resent to ${email}`);
    res.json({ success:true, message:'A new activation link has been sent to your email.' });
  } catch (err) { next(err); }
});

module.exports = router;
