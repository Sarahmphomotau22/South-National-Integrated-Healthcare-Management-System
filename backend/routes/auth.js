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

    const http   = require('http');
    const https  = require('https');
    const logger = require('../utils/logger');

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

    /* Use provided systemPrompt (clinical or patient) or detect role */
    const userRole = req.user?.role || 'patient';
    const isClinical = systemPrompt && systemPrompt.includes('PATIENT CONTEXT');

    const sys = systemPrompt || (
      ['doctor','nurse','facility_admin'].includes(userRole)
      ? `You are a clinical decision support AI for NIHMS South Africa, assisting qualified healthcare professionals.
RULES:
- Structure responses with: ASSESSMENT / DIFFERENTIAL DIAGNOSIS (with ICD-10) / RECOMMENDED INVESTIGATIONS / TREATMENT CONSIDERATIONS / RED FLAGS
- Use SA clinical guidelines (SAMF, DOH, NHI formulary)
- Use "consider", "consistent with", "suggestive of" — never diagnose definitively
- Include ICD-10 codes for all diagnoses
- Flag drug interactions when relevant
- Plain text only, no markdown asterisks or hashes
- End every response with: "Final clinical decision rests with the attending physician."
- Keep responses evidence-based and concise`
      : `You are NOMI, the NIHMS health assistant for South Africa.
RULES:
- NEVER show thinking process, reasoning steps, or numbered plans
- Reply in plain conversational text — no asterisks, no hashes
- Short paragraphs, simple language for all literacy levels
- Give practical actionable health information
- Include emergency guidance when relevant (call 10177)
- Mention consulting a doctor for personal medical decisions
- Tailor advice to SA public health context (NHI, public clinics)
- Never refuse to answer a health question
- Keep replies under 400 words`
    );

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

    // ── 2. Try Groq (free cloud) — model fallback chain ──────────────────
    if (process.env.GROQ_API_KEY) {
      // Try models in order until one works (handles decommissioned models)
      // Current live Groq models as of Aug 2026 — verified from Groq API
      // Models confirmed working — qwen first (known working on this account)
      const groqModels = [
        process.env.GROQ_MODEL,           // .env override — always first
        'qwen/qwen3.6-27b',               // confirmed working
        'qwen/qwen3-32b',                 // fallback
        'meta-llama/llama-4-maverick-17b-128e-instruct', // try if available
      ].filter(Boolean);

      let groqSuccess = false;
      for (const groqModel of groqModels) {
        try {
          const groqBody = JSON.stringify({
            model:       groqModel,
            max_tokens:  800,
            temperature: 0.7,
            messages:    [{ role: 'system', content: sys }, ...messages.slice(-10)]
          });
          const groqOpts = {
            hostname: 'api.groq.com', port: 443,
            path:     '/openai/v1/chat/completions', method: 'POST',
            headers: {
              'Content-Type':   'application/json',
              'Authorization':  'Bearer ' + process.env.GROQ_API_KEY,
              'Content-Length': Buffer.byteLength(groqBody)
            }
          };
          const resp = await makeRequest(https, groqOpts, groqBody);
          const data = JSON.parse(resp.body);

          if (resp.status === 200 && data.choices?.[0]?.message?.content) {
            logger.info('[AI] Groq responded with model: ' + groqModel);
            let reply = data.choices[0].message.content;

            // Strip thinking tokens — Qwen and some reasoning models leak their
            // internal chain-of-thought wrapped in <think>...</think> blocks
            reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

            // Also strip numbered "thinking process" headers that some models output
            // e.g. "1. Analyze User Input:" style preambles before the real answer
            const thinkingPatterns = [
              /^[\s\S]*?(?=Hello|Good\s(?:morning|afternoon|evening)|Dear|I\s(?:understand|can\s(?:see|help|explain)|would))/i,
            ];
            for (const pattern of thinkingPatterns) {
              const match = reply.match(pattern);
              if (match && match[0].length > 200 && match[0].includes('\n')) {
                // Only strip if there's a substantial preamble (likely thinking output)
                const stripped = reply.replace(pattern, '').trim();
                if (stripped.length > 50) reply = stripped;
              }
            }

            return res.json({ success: true, reply, provider: 'groq', model: groqModel });
          }

          // Log the specific error so you can see it in nodemon console
          const errMsg = data.error?.message || ('HTTP ' + resp.status);
          logger.warn('[AI] Groq model ' + groqModel + ' failed: ' + errMsg);

          // If model is decommissioned or not found, try next
          if (data.error?.code === 'model_not_found' || data.error?.code === 'model_decommissioned' ||
              errMsg.includes('decommissioned') || errMsg.includes('not found') ||
              errMsg.includes('does not exist') || resp.status === 404) {
            continue; // try next model
          }

          // For auth errors or rate limits, no point trying other models
          if (resp.status === 401 || resp.status === 403) {
            logger.error('[AI] Groq auth error — check GROQ_API_KEY in .env');
            break;
          }
          if (resp.status === 429) {
            logger.warn('[AI] Groq rate limited — try again in a moment');
            break;
          }

        } catch (groqErr) {
          logger.warn('[AI] Groq model ' + groqModel + ' error: ' + groqErr.message);
        }
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
      reply: [
              'Hello! I am NOMI, the NIHMS Health Assistant.',
              '',
              'I am currently having trouble connecting to the AI service.',
              'This usually means the API key needs to be refreshed.',
              '',
              'Please speak to a nurse or doctor at your clinic for health questions.',
              'For emergencies, call 10177 immediately.'
             ].join('\n')
    });

  } catch (err) { next(err); }
});

