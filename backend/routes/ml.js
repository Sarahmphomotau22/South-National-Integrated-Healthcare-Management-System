/**
 * backend/routes/ml.js
 * 
 * Proxies all ML requests from frontend → Node.js → FastAPI ML service.
 * Frontend never speaks directly to FastAPI.
 * 
 * Add to server.js:
 *   app.use('/api/v1/ml', require('./routes/ml'));
 */
'use strict';

const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const http    = require('http');

const ML_HOST = process.env.ML_SERVICE_HOST || 'localhost';
const ML_PORT = parseInt(process.env.ML_SERVICE_PORT || '8000');

router.use(protect);

/* Helper — forward request to FastAPI */
function mlProxy(path) {
  return async (req, res, next) => {
    try {
      const body = JSON.stringify({ ...req.body, role: req.user?.role || 'patient' });
      const options = {
        hostname: ML_HOST, port: ML_PORT,
        path, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      };
      const response = await new Promise((resolve, reject) => {
        const r = http.request(options, (resp) => {
          let data = '';
          resp.on('data', c => data += c);
          resp.on('end', () => resolve({ status: resp.statusCode, body: data }));
        });
        r.on('error', reject);
        r.write(body);
        r.end();
      });

      if (response.status === 200) {
        res.json({ success: true, ...JSON.parse(response.body) });
      } else {
        res.status(response.status).json({ success: false, message: 'ML service error' });
      }
    } catch (err) {
      /* ML service unavailable — return graceful degradation */
      res.json({
        success: false,
        unavailable: true,
        message: 'ML prediction is currently unavailable. The existing NIHMS functionality is still available. Please try again later.',
      });
    }
  };
}

/* Health check */
router.get('/health', async (req, res) => {
  try {
    const resp = await new Promise((resolve, reject) => {
      const r = http.request({ hostname: ML_HOST, port: ML_PORT, path: '/health', method: 'GET' }, (response) => {
        let data = '';
        response.on('data', c => data += c);
        response.on('end', () => resolve({ status: response.statusCode, body: data }));
      });
      r.on('error', reject);
      r.end();
    });
    res.json({ success: true, ml_service: JSON.parse(resp.body) });
  } catch {
    res.json({ success: false, ml_service: { status: 'unavailable' } });
  }
});

/* All prediction endpoints */
router.post('/wait-time',        mlProxy('/predict/wait-time'));
router.post('/queue-congestion', mlProxy('/predict/queue-congestion'));
router.post('/patient-volume',   mlProxy('/predict/patient-volume'));
router.post('/staff-demand',     mlProxy('/predict/staff-demand'));
router.post('/triage',           mlProxy('/predict/triage'));
router.post('/vital-trend',      mlProxy('/predict/vital-trend'));
router.post('/laboratory',       mlProxy('/predict/laboratory'));
router.post('/medication',       mlProxy('/predict/medication'));
router.post('/no-show',          mlProxy('/predict/no-show'));
router.post('/anomaly',          mlProxy('/predict/anomaly'));
router.post('/advice',           mlProxy('/advice'));

module.exports = router;
