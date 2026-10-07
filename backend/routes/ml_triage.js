/**
 * backend/routes/ml_triage.js
 *
 * Save this file as: backend/routes/ml_triage.js
 *
 * This extends the existing /api/v1/ml routes already in ml.js.
 * Adds: /api/v1/ml/triage  (POST)
 *       /api/v1/ml/health   (GET  — ML service health)
 *       /api/v1/ml/alerts   (GET  — all AI-flagged predictions from MongoDB)
 *       /api/v1/ml/predictions/:patientId (GET)
 *       /api/v1/ml/predictions/:id/review (PATCH)
 *
 * server.js already has:
 *   app.use('/api/v1/ml', require('./routes/ml'));
 *   app.use('/api/v1/ml', require('./routes/ml_triage'));  ← this file
 * Both mount on /api/v1/ml — Express merges them fine.
 */
'use strict';

const express   = require('express');
const router    = express.Router();
const http      = require('http');
const mongoose  = require('mongoose');
const { protect } = require('../middleware/auth');

const ML_HOST = process.env.ML_SERVICE_HOST || 'localhost';
const ML_PORT = parseInt(process.env.ML_SERVICE_PORT || '8000');

/* ── AIPrediction model (inline — no separate model file needed) ─────────── */
const AIPredictionSchema = new mongoose.Schema({
  patientId:     { type: String, required: true, index: true },
  encounterId:   { type: String, default: null },
  vitalSnapshot: {
    heartRate:   Number,
    spo2:        Number,
    systolicBP:  Number,
    diastolicBP: Number,
    temperature: Number,
  },
  riskLevel:     { type: String, enum: ['LOW','MEDIUM','HIGH'], required: true },
  confidence:    { type: Number, default: null },
  abnormalVitals:{ type: Array,  default: [] },
  reasons:       { type: Array,  default: [] },
  aiRiskNote:    { type: String, default: '' },
  modelVersion:  { type: String, default: 'triage-v2.0' },
  createdAt:     { type: Date,   default: Date.now },
  reviewed:      { type: Boolean,default: false },
  reviewedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt:    { type: Date,   default: null },
  reviewNotes:   { type: String, default: '' },
}, { collection: 'aipredictions' });

const AIPrediction =
  mongoose.models.AIPrediction ||
  mongoose.model('AIPrediction', AIPredictionSchema);

/* ── Helper: call FastAPI ─────────────────────────────────────────────────── */
function callFastAPI(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: ML_HOST,
      port:     ML_PORT,
      path,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('Invalid JSON from ML service')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('ML service timeout')); });
    req.write(data);
    req.end();
  });
}

function callFastAPIGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: ML_HOST, port: ML_PORT, path, timeout: 5000 }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch(e) { resolve({ status:'error' }); }});
    });
    req.on('error', reject);
  });
}

/* ── GET /api/v1/ml/health ────────────────────────────────────────────────── */
router.get('/health', async (_req, res) => {
  try {
    const result = await callFastAPIGet('/health');
    res.json(result);
  } catch (e) {
    res.status(503).json({
      status:      'unavailable',
      modelLoaded: false,
      error:       e.message,
    });
  }
});

/* ── POST /api/v1/ml/triage ───────────────────────────────────────────────── */
router.post('/triage', protect, async (req, res) => {
  try {
    /* Role guard — receptionist and patient must not see clinical ML data */
    const role = req.user?.role || 'patient';
    if (!['doctor', 'nurse', 'admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        error:   'Access denied. Clinical roles only.',
      });
    }

    /* Destructure and validate */
    const {
      heartRate, spo2, systolicBP, diastolicBP, temperature,
      patientId, encounterId,
    } = req.body;

    const vitals = { heartRate, spo2, systolicBP, diastolicBP, temperature };
    const missing = Object.entries(vitals)
      .filter(([, v]) => v == null || v === '' || isNaN(Number(v)))
      .map(([k]) => k);

    if (missing.length) {
      return res.status(400).json({
        success: false,
        error: `Insufficient information to generate this prediction. ` +
               `Missing or invalid: ${missing.join(', ')}. ` +
               `Please verify the required information.`,
      });
    }

    /* Forward to FastAPI — field names must match FastAPI schema exactly */
    const mlPayload = {
      heartRate:   Number(heartRate),
      spo2:        Number(spo2),
      systolicBP:  Number(systolicBP),
      diastolicBP: Number(diastolicBP),
      temperature: Number(temperature),
      role,
    };

    const mlResult = await callFastAPI('/predict/triage', mlPayload);

    if (!mlResult.success) {
      return res.status(422).json(mlResult);
    }

    /* Save prediction to MongoDB */
    let predictionId = null;
    if (patientId) {
      try {
        const saved = await AIPrediction.create({
          patientId:     String(patientId),
          encounterId:   encounterId || null,
          vitalSnapshot: {
            heartRate:   Number(heartRate),
            spo2:        Number(spo2),
            systolicBP:  Number(systolicBP),
            diastolicBP: Number(diastolicBP),
            temperature: Number(temperature),
          },
          riskLevel:     mlResult.riskLevel,
          confidence:    mlResult.confidence ?? null,
          abnormalVitals:mlResult.abnormalVitals || [],
          reasons:       mlResult.reasons        || [],
          aiRiskNote:    mlResult.aiRiskNote      || '',
          modelVersion:  mlResult.modelVersion    || 'triage-v2.0',
        });
        predictionId = saved._id;
      } catch (dbErr) {
        /* Don't fail the request if DB write fails — log and continue */
        console.error('[ml_triage] MongoDB save error:', dbErr.message);
      }
    }

    res.json({ ...mlResult, predictionId });

  } catch (e) {
    if (
      e.code === 'ECONNREFUSED' ||
      e.message?.includes('timeout') ||
      e.message?.includes('ECONNREFUSED')
    ) {
      return res.status(503).json({
        success: false,
        error: 'ML prediction is currently unavailable. ' +
               'The existing NIHMS functionality is still available. ' +
               'Please try again later.',
      });
    }
    console.error('[ml_triage] /triage error:', e);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

/* ── GET /api/v1/ml/alerts ────────────────────────────────────────────────── */
router.get('/alerts', protect, async (req, res) => {
  try {
    const role = req.user?.role || 'patient';
    if (!['doctor', 'nurse', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { risk, from, to, reviewed, limit = 100 } = req.query;
    const filter = {};
    if (risk && risk !== 'All')  filter.riskLevel = risk.toUpperCase();
    if (reviewed !== undefined)  filter.reviewed  = reviewed === 'true';
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

    const alerts = await AIPrediction
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ success: true, count: alerts.length, alerts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── GET /api/v1/ml/predictions/:patientId ───────────────────────────────── */
router.get('/predictions/:patientId', protect, async (req, res) => {
  try {
    const role = req.user?.role || 'patient';
    if (!['doctor', 'nurse', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const preds = await AIPrediction
      .find({ patientId: req.params.patientId })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, predictions: preds });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── PATCH /api/v1/ml/predictions/:id/review ─────────────────────────────── */
router.patch('/predictions/:id/review', protect, async (req, res) => {
  try {
    const role = req.user?.role || 'patient';
    if (!['doctor', 'nurse', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const pred = await AIPrediction.findByIdAndUpdate(
      req.params.id,
      {
        reviewed:    true,
        reviewedBy:  req.user._id,
        reviewedAt:  new Date(),
        reviewNotes: req.body.reviewNotes || '',
      },
      { new: true }
    );
    if (!pred) return res.status(404).json({ error: 'Prediction not found.' });
    res.json({ success: true, prediction: pred });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
