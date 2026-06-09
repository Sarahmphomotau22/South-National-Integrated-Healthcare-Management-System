'use strict';
const express  = require('express');
const { body } = require('express-validator');
const router   = express.Router();
const ctrl     = require('../controllers/authController');
const logger   = require('../utils/logger');
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

    const origins   = (process.env.CLIENT_ORIGIN || 'http://localhost:5500').split(',').map(s=>s.trim()).filter(s=>s&&s!=='null');
    const clientUrl = origins.find(o => !o.includes('localhost') && !o.includes('127.0.0.1')) || origins[0];
    const verifyUrl = `${clientUrl}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`;
    await sendWelcomeEmail({ to: user.email, firstName: user.firstName, role: user.role, verifyUrl });

    logger.info(`Verification email resent to ${email}`);
    res.json({ success:true, message:'A new activation link has been sent to your email.' });
  } catch (err) { next(err); }
});

module.exports = router;

// POST /api/v1/auth/chat — AI chatbot proxy
// Tries providers in order: Ollama (local) → Anthropic → error
router.post('/chat', async (req, res, next) => {
  try {
    const { messages, systemPrompt } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'messages array required' });
    }

    const http  = require('http');
    const https = require('https');

    // ── Helper: make HTTP(S) request ──
    const makeRequest = (lib, options, body) => new Promise((resolve, reject) => {
      const req = lib.request(options, (r) => {
        let raw = '';
        r.on('data', c => raw += c);
        r.on('end', () => resolve({ status: r.statusCode, body: raw }));
      });
      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
      if (body) req.write(body);
      req.end();
    });

    const sys = systemPrompt || 'You are a helpful South African health assistant.';

    // ── 1. Try Ollama (local, free, no API key) ──
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';
    try {
      // Build prompt for Ollama (uses /api/chat with OpenAI-style messages)
      const ollamaBody = JSON.stringify({
        model:    ollamaModel,
        messages: [{ role: 'system', content: sys }, ...messages.slice(-10)],
        stream:   false,
        options:  { temperature: 0.7, num_predict: 800 }
      });

      const ollamaUrl  = new URL(ollamaHost + '/api/chat');
      const ollamaOpts = {
        hostname: ollamaUrl.hostname,
        port:     ollamaUrl.port || (ollamaUrl.protocol === 'https:' ? 443 : 80),
        path:     ollamaUrl.pathname,
        method:   'POST',
        headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(ollamaBody) }
      };

      const lib  = ollamaUrl.protocol === 'https:' ? https : http;
      const resp = await makeRequest(lib, ollamaOpts, ollamaBody);

      if (resp.status === 200) {
        const data  = JSON.parse(resp.body);
        const reply = data.message?.content || data.response || '';
        if (reply) {
          logger.info('[AI] Ollama responded successfully');
          return res.json({ success: true, reply, provider: 'ollama' });
        }
      }
    } catch (ollamaErr) {
      logger.info('[AI] Ollama not available: ' + ollamaErr.message);
    }

    // ── 2. Try Groq (free cloud, no credit card, Llama models) ──
    if (process.env.GROQ_API_KEY) {
      try {
        const groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
        const groqBody  = JSON.stringify({
          model:       groqModel,
          max_tokens:  800,
          temperature: 0.7,
          messages:    [{ role: 'system', content: sys }, ...messages.slice(-10)]
        });
        const groqOpts = {
          hostname: 'api.groq.com', port: 443,
          path:     '/openai/v1/chat/completions', method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
            'Content-Length': Buffer.byteLength(groqBody)
          }
        };
        const resp = await makeRequest(https, groqOpts, groqBody);
        const data = JSON.parse(resp.body);
        if (resp.status === 200 && data.choices?.[0]?.message?.content) {
          logger.info('[AI] Groq responded with model: ' + groqModel);
          return res.json({ success: true, reply: data.choices[0].message.content, provider: 'groq' });
        }
        logger.warn('[AI] Groq error: ' + (data.error?.message || resp.status));
      } catch (groqErr) {
        logger.warn('[AI] Groq error: ' + groqErr.message);
      }
    }

    // ── 3. Try Anthropic Claude (needs API key) ──
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const claudeBody = JSON.stringify({
          model:      'claude-haiku-4-5',
          max_tokens: 800,
          system:     sys,
          messages:   messages.slice(-10)
        });
        const claudeOpts = {
          hostname: 'api.anthropic.com', port: 443,
          path:     '/v1/messages', method: 'POST',
          headers: {
            'Content-Type':      'application/json',
            'x-api-key':         process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Length':    Buffer.byteLength(claudeBody)
          }
        };
        const resp = await makeRequest(https, claudeOpts, claudeBody);
        const data = JSON.parse(resp.body);
        if (resp.status === 200 && data.content?.[0]?.text) {
          logger.info('[AI] Anthropic Claude responded');
          return res.json({ success: true, reply: data.content[0].text, provider: 'anthropic' });
        }
      } catch (claudeErr) {
        logger.warn('[AI] Anthropic error: ' + claudeErr.message);
      }
    }

    // ── 4. No AI provider available ──
    return res.json({
      success: true,
      provider: 'none',
      reply: 'The AI assistant needs a quick setup. Choose one option:\n\n' +
             '**Option A — Groq (free cloud, easiest for online hosting):**\n' +
             '1. Go to console.groq.com — sign up free, no credit card\n' +
             '2. Create an API key\n' +
             '3. Add to backend/.env: GROQ_API_KEY=gsk_...\n' +
             '4. Restart the backend\n\n' +
             '**Option B — Ollama (free local AI, best when on same PC):**\n' +
             '1. Download from ollama.com\n' +
             '2. Run: ollama pull llama3.2\n' +
             '3. Restart the backend\n\n' +
             'For urgent health questions, call your clinic or dial 10177.'
    });

  } catch (err) { next(err); }
});

