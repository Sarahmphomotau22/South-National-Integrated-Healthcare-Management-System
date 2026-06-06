'use strict';
/**
 * routes/queue.js
 * Queue management — digital tokens, priority triage, SMS updates
 */
const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Appointment, Facility } = require('../models/index');
const Patient  = require('../models/Patient');
const { sendSms, sendEmail } = require('../utils/mailer');
const logger   = require('../utils/logger');

router.use(protect);

/* ── Helper: notify patient of queue update ── */
async function notifyPatient(patient, message) {
  if (patient?.phone) {
    await sendSms({ to: patient.phone, body: `NIHMS Queue: ${message}` }).catch(e =>
      logger.warn('Queue SMS failed:', e.message));
  }
  if (patient?.email) {
    await sendEmail({
      to: patient.email,
      subject: 'NIHMS — Queue Update',
      html: `<div style="font-family:sans-serif;max-width:480px">
        <div style="background:#0F6E56;padding:16px;text-align:center;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">Queue Update</h2>
        </div>
        <div style="background:#f9f9f9;padding:20px;border-radius:0 0 8px 8px;border:1px solid #eee">
          <p style="font-size:15px;color:#333">${message}</p>
          <p style="color:#888;font-size:12px">Please proceed to the clinic reception. Thank you.</p>
        </div>
      </div>`
    }).catch(e => logger.warn('Queue email failed:', e.message));
  }
}

/* ─────────────────────────────────────────
   GET /api/v1/queue?facility=&date=
   Live queue for a facility — grouped by priority
───────────────────────────────────────── */
router.get('/', async (req, res, next) => {
  try {
    const { facility, date } = req.query;
    if (!facility) return res.status(400).json({ success:false, message:'facility required' });

    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);

    const appts = await Appointment.find({
      facility,
      scheduledAt: { $gte: d, $lt: new Date(d.getTime() + 86400000) },
      status: { $in: ['pending','confirmed','in_progress','triaged'] }
    })
    .populate('patient', 'firstName lastName nationalId mrn bloodType allergies latestVitals age')
    .populate('doctor',  'firstName lastName')
    .sort({ priority: -1, triageScore: -1, scheduledAt: 1 });

    // Queue stats
    const stats = {
      total:       appts.length,
      priority:    appts.filter(a => a.priority).length,
      waiting:     appts.filter(a => a.status === 'pending' || a.status === 'confirmed').length,
      inProgress:  appts.filter(a => a.status === 'in_progress').length,
      avgWaitMins: 0
    };

    if (stats.waiting > 0) {
      const now = Date.now();
      const waits = appts
        .filter(a => a.status === 'pending' || a.status === 'confirmed')
        .map(a => Math.max(0, Math.floor((now - new Date(a.scheduledAt)) / 60000)));
      stats.avgWaitMins = Math.round(waits.reduce((s,w) => s+w, 0) / waits.length);
    }

    res.json({ success: true, data: appts, stats });
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────
   POST /api/v1/queue/check-in
   Patient / nurse checks patient into queue → issues token
───────────────────────────────────────── */
router.post('/check-in', authorize('nurse','doctor','admin'), async (req, res, next) => {
  try {
    const { appointmentId, facilityId } = req.body;
    const appt = await Appointment.findById(appointmentId)
      .populate('patient', 'firstName lastName phone email nationalId mrn');

    if (!appt) return res.status(404).json({ success:false, message:'Appointment not found.' });
    if (appt.status === 'in_progress') return res.status(400).json({ success:false, message:'Already checked in.' });

    // Generate or keep existing token
    if (!appt.queueToken) {
      const d = new Date(); d.setHours(0,0,0,0);
      const count = await Appointment.countDocuments({
        facility: appt.facility,
        scheduledAt: { $gte: d, $lt: new Date(d.getTime() + 86400000) },
        queueToken: { $exists: true, $ne: null }
      });
      appt.queueToken = `A-${String(count + 1).padStart(2, '0')}`;
    }

    appt.status    = 'confirmed';
    appt.checkedInAt = new Date();
    await appt.save();

    const patient = appt.patient;
    await notifyPatient(patient,
      `You have checked in. Your queue token is ${appt.queueToken}. Please wait in the waiting area.`
    );

    logger.info(`Check-in: token ${appt.queueToken} for ${patient?.firstName} ${patient?.lastName}`);
    res.json({ success:true, data: appt, token: appt.queueToken });
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────
   POST /api/v1/queue/triage
   Nurse sets triage level, vitals, chief complaint
───────────────────────────────────────── */
router.post('/triage', authorize('nurse','doctor','admin'), async (req, res, next) => {
  try {
    const {
      appointmentId,
      triageLevel,   // 1=immediate, 2=urgent, 3=semi-urgent, 4=non-urgent, 5=minor
      chiefComplaint,
      vitals,        // { bp, heartRate, temperature, spO2, weight }
      notes
    } = req.body;

    if (!appointmentId || !triageLevel) {
      return res.status(422).json({ success:false, message:'appointmentId and triageLevel required.' });
    }

    const appt = await Appointment.findById(appointmentId)
      .populate('patient', 'firstName lastName phone email');

    if (!appt) return res.status(404).json({ success:false, message:'Appointment not found.' });

    // Triage score — lower number = higher priority
    const TRIAGE_LABELS = {
      1: { label:'Immediate (Red)',   priority: true,  score: 100, color:'#E24B4A' },
      2: { label:'Urgent (Orange)',   priority: true,  score: 80,  color:'#EF9F27' },
      3: { label:'Semi-urgent (Yellow)', priority:false,score: 60, color:'#F5D800' },
      4: { label:'Non-urgent (Green)',priority: false, score: 40,  color:'#1D9E75' },
      5: { label:'Minor (Blue)',      priority: false, score: 20,  color:'#185FA5' }
    };

    const triage = TRIAGE_LABELS[triageLevel] || TRIAGE_LABELS[4];

    appt.status          = 'triaged';
    appt.triageLevel     = triageLevel;
    appt.triageScore     = triage.score;
    appt.priority        = triage.priority;
    appt.triageLabel     = triage.label;
    appt.chiefComplaint  = chiefComplaint || '';
    appt.triageNotes     = notes || '';
    appt.triagedAt       = new Date();
    appt.triagedBy       = req.user._id;
    if (vitals) appt.vitals = vitals;

    await appt.save();

    // Notify patient if priority
    if (triage.priority) {
      await notifyPatient(appt.patient,
        `Your case has been marked as ${triage.label}. A clinician will see you shortly. Token: ${appt.queueToken}`
      );
    }

    logger.info(`Triage: ${triage.label} for token ${appt.queueToken}`);
    res.json({ success:true, data: appt });
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────
   PATCH /api/v1/queue/:id/call
   Doctor calls next patient → notify patient
───────────────────────────────────────── */
router.patch('/:id/call', authorize('doctor','nurse','admin'), async (req, res, next) => {
  try {
    const appt = await Appointment.findById(req.params.id)
      .populate('patient', 'firstName lastName phone email')
      .populate('doctor',  'firstName lastName');

    if (!appt) return res.status(404).json({ success:false, message:'Appointment not found.' });

    appt.status   = 'in_progress';
    appt.calledAt = new Date();
    await appt.save();

    const room = req.body.room || 'the consultation room';
    await notifyPatient(appt.patient,
      `Dr. ${appt.doctor?.lastName || 'your doctor'} is ready for you. Token: ${appt.queueToken}. Please proceed to ${room}.`
    );

    logger.info(`Called: token ${appt.queueToken} to ${room}`);
    res.json({ success:true, data: appt });
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────
   PATCH /api/v1/queue/:id/priority
   Elevate / lower priority (emergency, elderly, disability)
───────────────────────────────────────── */
router.patch('/:id/priority', authorize('nurse','doctor','admin'), async (req, res, next) => {
  try {
    const { priority, reason } = req.body;
    const appt = await Appointment.findByIdAndUpdate(
      req.params.id,
      { priority: !!priority, priorityReason: reason || '' },
      { new: true }
    ).populate('patient','firstName lastName phone email');

    if (!appt) return res.status(404).json({ success:false, message:'Appointment not found.' });

    if (priority) {
      await notifyPatient(appt.patient,
        `Your appointment has been elevated to priority. Token: ${appt.queueToken}. You will be seen shortly.`
      );
    }

    res.json({ success:true, data: appt });
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────
   POST /api/v1/queue/walk-in
   Register a walk-in patient without a booking
───────────────────────────────────────── */
router.post('/walk-in', authorize('nurse','admin'), async (req, res, next) => {
  try {
    const { patientId, facilityId, reason, priority, triageLevel } = req.body;
    if (!patientId || !facilityId) {
      return res.status(422).json({ success:false, message:'patientId and facilityId required.' });
    }

    // Generate today's token
    const d = new Date(); d.setHours(0,0,0,0);
    const count = await Appointment.countDocuments({
      facility: facilityId,
      scheduledAt: { $gte: d, $lt: new Date(d.getTime() + 86400000) }
    });
    const token = `W-${String(count + 1).padStart(2, '0')}`; // W = walk-in

    const TRIAGE = { 1:100, 2:80, 3:60, 4:40, 5:20 };
    const appt = await Appointment.create({
      patient:      patientId,
      facility:     facilityId,
      visitType:    'consultation',
      scheduledAt:  new Date(),
      status:       'confirmed',
      queueToken:   token,
      reason:       reason || 'Walk-in',
      priority:     !!priority,
      triageLevel:  triageLevel || 4,
      triageScore:  TRIAGE[triageLevel] || 40,
      isWalkIn:     true,
      checkedInAt:  new Date(),
      createdBy:    req.user._id
    });

    const patient = await Patient.findById(patientId);
    await notifyPatient(patient,
      `Walk-in registered. Your queue token is ${token}. Please wait to be called.`
    );

    logger.info(`Walk-in: token ${token}`);
    res.status(201).json({ success:true, data: appt, token });
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────
   GET /api/v1/queue/stats?facility=&date=
   Summary stats for the admin dashboard
───────────────────────────────────────── */
router.get('/stats', async (req, res, next) => {
  try {
    const { facility, date } = req.query;
    const d = date ? new Date(date) : new Date(); d.setHours(0,0,0,0);
    const filter = { scheduledAt: { $gte: d, $lt: new Date(d.getTime() + 86400000) } };
    if (facility) filter.facility = facility;

    const [total, priority, completed, cancelled, inProgress, walkins] = await Promise.all([
      Appointment.countDocuments(filter),
      Appointment.countDocuments({ ...filter, priority: true }),
      Appointment.countDocuments({ ...filter, status: 'completed' }),
      Appointment.countDocuments({ ...filter, status: 'cancelled' }),
      Appointment.countDocuments({ ...filter, status: 'in_progress' }),
      Appointment.countDocuments({ ...filter, isWalkIn: true })
    ]);

    res.json({ success:true, data: { total, priority, completed, cancelled, inProgress, walkins, waiting: total - completed - cancelled } });
  } catch (err) { next(err); }
});

module.exports = router;
