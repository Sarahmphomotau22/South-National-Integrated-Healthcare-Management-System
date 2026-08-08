'use strict';
/**
 * backend/routes/surveys.js
 * 
 * Add to backend/server.js:
 *   app.use('/api/v1/surveys', require('./routes/surveys'));
 * 
 * Add SurveyResult schema to backend/models/index.js (see bottom)
 */
const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/auth');
const mongoose = require('mongoose');

/* ── Schema ─────────────────────────────────────────────────────────────── */
const surveySchema = new mongoose.Schema({
  patient:       { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  queueToken:    { type: String },
  appointment:   { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  facility:      { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
  submittedAt:   { type: Date, default: Date.now },

  booking:       { type: mongoose.Schema.Types.Mixed },
  checkin:       { type: mongoose.Schema.Types.Mixed },
  queue:         { type: mongoose.Schema.Types.Mixed },
  consultation:  { type: mongoose.Schema.Types.Mixed },
  pharmacy:      { type: mongoose.Schema.Types.Mixed },
  overall:       { type: mongoose.Schema.Types.Mixed },
  openText:      { type: mongoose.Schema.Types.Mixed },
  overallScore:  { type: Number },
}, { timestamps: true });

surveySchema.index({ facility: 1, createdAt: -1 });
surveySchema.index({ patient: 1 });

let SurveyResult;
try { SurveyResult = mongoose.model('SurveyResult'); }
catch(_) { SurveyResult = mongoose.model('SurveyResult', surveySchema); }

router.use(protect);

/* POST /api/v1/surveys — submit survey */
router.post('/', async (req, res, next) => {
  try {
    const survey = await SurveyResult.create(req.body);
    res.status(201).json({ success: true, data: survey });
  } catch(err) { next(err); }
});

/* GET /api/v1/surveys/summary?facility=:id — admin dashboard summary */
router.get('/summary', async (req, res, next) => {
  try {
    const { facility, days = 30 } = req.query;
    const since = new Date(Date.now() - days * 86400000);
    const filter = { createdAt: { $gte: since } };
    if (facility) filter.facility = facility;

    const surveys = await SurveyResult.find(filter).lean();
    if (!surveys.length)
      return res.json({ success: true, data: { total: 0, averages: {} } });

    const avg = (field) => {
      const vals = surveys.map(s => s[field]?.sectionAvg).filter(v => typeof v === 'number');
      return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10 : null;
    };

    res.json({ success: true, data: {
      total:     surveys.length,
      dateRange: { from: since, to: new Date() },
      averages: {
        booking:      avg('booking'),
        checkin:      avg('checkin'),
        queue:        avg('queue'),
        consultation: avg('consultation'),
        pharmacy:     avg('pharmacy'),
        overall:      avg('overall'),
        overallScore: surveys.filter(s=>s.overallScore!=null).length
          ? Math.round(surveys.filter(s=>s.overallScore!=null)
              .reduce((a,s)=>a+s.overallScore,0)/surveys.filter(s=>s.overallScore!=null).length*10)/10
          : null,
      },
      /* Identify lowest scoring area */
      lowestArea: Object.entries({
        Booking: avg('booking'), Checkin: avg('checkin'),
        Queue: avg('queue'), Consultation: avg('consultation'), Pharmacy: avg('pharmacy'),
      }).filter(([,v])=>v!==null).sort(([,a],[,b])=>a-b)[0]?.[0] || null,
      /* Open text comments */
      comments: surveys
        .filter(s => s.openText?.didWell || s.openText?.improve)
        .slice(-10)
        .map(s => ({
          didWell: s.openText?.didWell || '',
          improve: s.openText?.improve || '',
          problems: s.openText?.problemDesc || '',
          date: s.submittedAt,
        })),
    }});
  } catch(err) { next(err); }
});

/* GET /api/v1/surveys — list surveys (admin) */
router.get('/', async (req, res, next) => {
  try {
    const { facility, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (facility) filter.facility = facility;
    const surveys = await SurveyResult.find(filter)
      .sort({ createdAt: -1 })
      .skip((page-1)*limit).limit(+limit)
      .populate('patient','firstName lastName mrn')
      .populate('facility','name');
    const total = await SurveyResult.countDocuments(filter);
    res.json({ success: true, data: surveys, meta: { total } });
  } catch(err) { next(err); }
});

module.exports = router;

/*

*/
