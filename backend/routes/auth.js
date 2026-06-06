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

module.exports = router;
