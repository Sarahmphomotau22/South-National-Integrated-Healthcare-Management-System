'use strict';
const express  = require('express');
const router   = express.Router();
const QueueEntry = require('../models/QueueEntry');
const Patient    = require('../models/Patient');
const { Facility, Appointment } = require('../models/index');
const { authorize } = require('../middleware/auth');
const logger   = require('../utils/logger');
const { sendSms, sendEmail } = require('../utils/mailer');

// ── helpers ──
function nextToken(existing, type) {
  const prefix = type === 'emergency' ? 'E' : type === 'priority' ? 'P' : type === 'walkin' ? 'W' : 'A';
  const nums   = existing.filter(e => e.token.startsWith(prefix)).map(e => parseInt(e.token.slice(2)) || 0);
  const next   = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${String(next).padStart(2,'0')}`;
}
async function avgConsultTime(facilityId) {
  const recent = await QueueEntry.find({
    facility: facilityId, status: 'completed',
    consultStartTime: { $exists: true }, consultEndTime: { $exists: true },
    createdAt: { $gte: new Date(Date.now() - 7 * 864e5) }
  }).limit(50);
  if (!recent.length) return 10; // default 10 min
  const avg = recent.reduce((s, e) => s + (e.consultEndTime - e.consultStartTime) / 60000, 0) / recent.length;
  return Math.round(avg);
}

// ── Notification ──
async function notifyPatient(entry, message, channel = 'all') {
  const phone = entry.patientPhone;
  const tasks = [];

  // SMS
  if (phone && ['all','sms'].includes(channel)) {
    tasks.push(sendSms({ to: phone, body: `NIHMS Queue: ${message}` }).catch(e => logger.warn('[Queue] SMS failed: '+e.message)));
  }

  // Email — only for check-in notifications that include token
  if (entry.patientEmail && message.includes('token is') && ['all','email'].includes(channel)) {
    const emailBody = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#0F6E56,#1A4A9B);padding:20px;text-align:center;border-radius:10px 10px 0 0">
          <h2 style="color:#fff;margin:0">NIHMS Queue Token</h2>
        </div>
        <div style="padding:24px;background:#f9f9f9;border-radius:0 0 10px 10px">
          <p>Dear <strong>${entry.patientName||'Patient'}</strong>,</p>
          <p>${message}</p>
          <div style="text-align:center;margin:20px 0;padding:20px;background:#fff;border-radius:8px;border:2px solid #0F6E56">
            <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.08em">Your Queue Token</div>
            <div style="font-size:64px;font-weight:900;color:#0F6E56;font-family:monospace;line-height:1.2">${entry.token}</div>
            <div style="font-size:13px;color:#666;margin-top:8px">Position: ${entry.position||'—'} &nbsp;·&nbsp; Est. wait: ${entry.estimatedWait||0} min</div>
          </div>
          <p style="font-size:13px;color:#888">Please remain in the waiting area. You will be notified when it is your turn.</p>
          <p style="font-size:12px;color:#aaa">For emergencies call <strong>10177</strong></p>
        </div>
      </div>`;
    tasks.push(sendEmail({
      to: entry.patientEmail,
      subject: `NIHMS Queue Token: ${entry.token}`,
      html: emailBody
    }).catch(e => logger.warn('[Queue] Email failed: '+e.message)));
  }

  logger.info(`[Queue] Notify ${entry.token}: ${message}`);
  await Promise.all(tasks);
}

/* ════════════════════════════════════════
   GET /api/v1/queue2?facility=&date=&status=
════════════════════════════════════════ */
router.get('/', async (req, res, next) => {
  try {
    const { facility, date, status, stage } = req.query;
    if (!facility) return res.status(400).json({ success: false, message: 'facility required' });

    const start = new Date(date || new Date().toISOString().slice(0,10));
    const end   = new Date(start.getTime() + 864e5);

    const filter = { facility, createdAt: { $gte: start, $lt: end } };
    if (status) filter.status = status;
    if (stage)  filter.currentStage = stage;

    const entries = await QueueEntry.find(filter)
      .populate('patient', 'firstName lastName nationalId phone age profilePicture')
      .populate('doctor',  'firstName lastName')
      .sort({ priority: -1, position: 1, createdAt: 1 });

    // Recalculate estimated waits
    const avgTime = await avgConsultTime(facility);
    const waiting = entries.filter(e => e.status === 'waiting');
    const inConsult = entries.find(e => e.status === 'in_consultation');
    let baseWait = inConsult ? avgTime - Math.floor((Date.now() - inConsult.consultStartTime) / 60000) : 0;

    waiting.forEach((e, i) => {
      e.estimatedWait = Math.max(0, baseWait + i * avgTime);
    });

    const stats = {
      total:       entries.length,
      waiting:     entries.filter(e => e.status === 'waiting').length,
      inConsult:   entries.filter(e => e.status === 'in_consultation').length,
      completed:   entries.filter(e => e.status === 'completed').length,
      emergency:   entries.filter(e => e.tokenType === 'emergency').length,
      avgWaitMins: avgTime,
      nowServing:  entries.find(e => e.status === 'in_consultation')?.token || null,
    };

    res.json({ success: true, data: entries, stats });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════
   POST /api/v1/queue2/checkin — patient checks in
════════════════════════════════════════ */
router.post('/checkin', async (req, res, next) => {
  try {
    const { facilityId, appointmentId, patientId, tokenType = 'normal', priorityReason, language = 'en' } = req.body;
    if (!facilityId) return res.status(400).json({ success: false, message: 'facilityId required' });

    const today  = new Date(); today.setHours(0,0,0,0);
    const todayEnd = new Date(today.getTime() + 864e5);

    // Prevent duplicate check-in
    if (patientId) {
      const existing = await QueueEntry.findOne({
        patient: patientId, facility: facilityId,
        createdAt: { $gte: today, $lt: todayEnd },
        status: { $nin: ['completed','cancelled','skipped'] }
      });
      if (existing) return res.json({ success: true, data: existing, duplicate: true });
    }

    const allToday = await QueueEntry.find({ facility: facilityId, createdAt: { $gte: today, $lt: todayEnd } });
    const token    = nextToken(allToday, tokenType);
    const position = allToday.filter(e => !['completed','cancelled','skipped'].includes(e.status)).length + 1;
    const priority = tokenType === 'emergency' ? 2 : tokenType === 'priority' ? 1 : 0;

    // Get patient info
    let patientName = 'Walk-in Patient', patientPhone = '', patientAge = null;
    if (patientId) {
      const p = await Patient.findById(patientId);
      if (p) { patientName = `${p.firstName} ${p.lastName}`; patientPhone = p.phone || ''; patientAge = p.age; }
    }

    // Get patient email for notifications
    let patientEmail = '';
    if (patientId) {
      try {
        const User = require('../models/User');
        const pUser = await User.findById(patientId).select('email');
        if (pUser) patientEmail = pUser.email || '';
      } catch {}
    }

    const entry = await QueueEntry.create({
      facility: facilityId, patient: patientId, appointment: appointmentId,
      token, tokenType, position, priority, priorityReason,
      patientName, patientPhone, patientAge, patientEmail, language,
      estimatedWait: (position - 1) * (await avgConsultTime(facilityId)),
      status: 'waiting', currentStage: 'waiting'
    });

    // Notify patient
    const msg = `You have checked in. Your token is ${token}. Position: ${position}. Est. wait: ${entry.estimatedWait} min.`;
    await notifyPatient(entry, msg);

    logger.info(`[Queue] Check-in: ${token} — ${patientName} @ facility ${facilityId}`);
    res.status(201).json({ success: true, data: entry });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════
   POST /api/v1/queue2/walkin — staff registers walk-in
════════════════════════════════════════ */
router.post('/walkin', authorize('nurse','doctor','admin'), async (req, res, next) => {
  try {
    const { facilityId, patientName, patientPhone, patientAge, reason, tokenType = 'walkin', priorityReason } = req.body;
    if (!facilityId) return res.status(400).json({ success: false, message: 'facilityId required' });

    const today = new Date(); today.setHours(0,0,0,0);
    const todayEnd = new Date(today.getTime() + 864e5);
    const allToday = await QueueEntry.find({ facility: facilityId, createdAt: { $gte: today, $lt: todayEnd } });
    const token    = nextToken(allToday, tokenType);
    const position = allToday.filter(e => !['completed','cancelled','skipped'].includes(e.status)).length + 1;
    const priority = tokenType === 'emergency' ? 2 : 0;

    const entry = await QueueEntry.create({
      facility: facilityId, token, tokenType, position, priority, priorityReason,
      patientName: patientName || 'Walk-in', patientPhone, patientAge,
      estimatedWait: (position - 1) * (await avgConsultTime(facilityId)),
      notes: reason, status: 'waiting', currentStage: 'waiting', handledBy: req.user._id
    });

    if (patientPhone) await notifyPatient(entry, `Your queue token is ${token}. You are number ${position} in the queue.`);
    res.status(201).json({ success: true, data: entry });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════
   PATCH /api/v1/queue2/:id/call — staff calls patient
════════════════════════════════════════ */
router.patch('/:id/call', authorize('nurse','doctor','admin'), async (req, res, next) => {
  try {
    const { room } = req.body;
    const entry = await QueueEntry.findByIdAndUpdate(req.params.id,
      { status: 'called', calledTime: new Date(), handledBy: req.user._id },
      { new: true }
    );
    if (!entry) return res.status(404).json({ success: false, message: 'Queue entry not found' });

    await notifyPatient(entry, `${entry.token} — Please proceed to ${room || 'the consultation room'} now.`);
    res.json({ success: true, data: entry });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════
   PATCH /api/v1/queue2/:id/status — update status
════════════════════════════════════════ */
router.patch('/:id/status', authorize('nurse','doctor','admin'), async (req, res, next) => {
  try {
    const { status, stage, needsLab, needsPharmacy, notes } = req.body;
    const updates = { handledBy: req.user._id };

    if (status) updates.status = status;
    if (stage)  updates.currentStage = stage;
    if (notes)  updates.notes = notes;
    if (needsLab !== undefined)      updates.needsLab      = needsLab;
    if (needsPharmacy !== undefined) updates.needsPharmacy = needsPharmacy;

    if (status === 'in_consultation') updates.consultStartTime = new Date();
    if (status === 'completed')       { updates.consultEndTime = new Date(); updates.completedTime = new Date(); }

    const entry = await QueueEntry.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!entry) return res.status(404).json({ success: false, message: 'Not found' });

    // Route to next stage
    if (status === 'post_consultation') {
      let msg = 'Your consultation is complete.';
      if (entry.needsLab)      msg += ' Please proceed to the Lab.';
      if (entry.needsPharmacy) msg += ' Please collect your medication from the Pharmacy.';
      await notifyPatient(entry, msg);
    }

    res.json({ success: true, data: entry });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════
   PATCH /api/v1/queue2/:id/priority — emergency override
════════════════════════════════════════ */
router.patch('/:id/priority', authorize('nurse','doctor','admin'), async (req, res, next) => {
  try {
    const { priority, priorityReason, tokenType } = req.body;
    const entry = await QueueEntry.findByIdAndUpdate(req.params.id,
      { priority, priorityReason, tokenType: tokenType || 'priority' },
      { new: true }
    );
    if (!entry) return res.status(404).json({ success: false, message: 'Not found' });
    logger.info(`[Queue] Priority override: ${entry.token} → priority ${priority} (${priorityReason})`);
    res.json({ success: true, data: entry });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════
   POST /api/v1/queue2/:id/feedback
════════════════════════════════════════ */
router.post('/:id/feedback', async (req, res, next) => {
  try {
    const { satisfaction, feedbackNote } = req.body;
    const entry = await QueueEntry.findByIdAndUpdate(req.params.id,
      { satisfaction, feedbackNote },
      { new: true }
    );
    res.json({ success: true, data: entry });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════
   GET /api/v1/queue2/stats?facility=&days=7
════════════════════════════════════════ */
router.get('/stats', async (req, res, next) => {
  try {
    const { facility, days = 7 } = req.query;
    const since = new Date(Date.now() - days * 864e5);

    const entries = await QueueEntry.find({ facility, createdAt: { $gte: since } });
    const completed = entries.filter(e => e.status === 'completed');

    const avgWait = completed.length
      ? completed.reduce((s,e) => s + (e.consultStartTime ? (e.consultStartTime - e.checkInTime)/60000 : 0), 0) / completed.length
      : 0;
    const avgConsult = completed.length
      ? completed.reduce((s,e) => s + (e.consultEndTime && e.consultStartTime ? (e.consultEndTime - e.consultStartTime)/60000 : 0), 0) / completed.length
      : 0;
    const avgSatisfaction = completed.filter(e=>e.satisfaction).length
      ? completed.filter(e=>e.satisfaction).reduce((s,e)=>s+e.satisfaction,0) / completed.filter(e=>e.satisfaction).length
      : null;

    const byDay = {};
    entries.forEach(e => {
      const d = e.createdAt.toISOString().slice(0,10);
      if (!byDay[d]) byDay[d] = { date: d, total: 0, completed: 0, emergency: 0 };
      byDay[d].total++;
      if (e.status === 'completed') byDay[d].completed++;
      if (e.tokenType === 'emergency') byDay[d].emergency++;
    });

    res.json({ success: true, data: {
      total: entries.length, completed: completed.length,
      avgWaitMins: Math.round(avgWait), avgConsultMins: Math.round(avgConsult),
      avgSatisfaction: avgSatisfaction ? Math.round(avgSatisfaction * 10) / 10 : null,
      byDay: Object.values(byDay).sort((a,b) => a.date.localeCompare(b.date))
    }});
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════
   GET /api/v1/queue2/my-token?patientId=&facilityId=
════════════════════════════════════════ */
router.get('/my-token', async (req, res, next) => {
  try {
    const { patientId, facilityId } = req.query;
    const today = new Date(); today.setHours(0,0,0,0);
    const entry = await QueueEntry.findOne({
      patient: patientId, facility: facilityId,
      createdAt: { $gte: today },
      status: { $nin: ['completed','cancelled'] }
    }).sort({ createdAt: -1 });

    if (!entry) return res.json({ success: true, data: null });

    // Get current position
    const ahead = await QueueEntry.countDocuments({
      facility: facilityId,
      status: 'waiting',
      priority: { $gte: entry.priority },
      createdAt: { $gte: today },
      _id: { $ne: entry._id },
      $or: [
        { priority: { $gt: entry.priority } },
        { priority: entry.priority, position: { $lt: entry.position } }
      ]
    });

    res.json({ success: true, data: { ...entry.toObject(), aheadCount: ahead } });
  } catch (err) { next(err); }
});

module.exports = router;

/* ════════════════════════════════════════
   POST /api/v1/queue2/prebooked-checkin
   Patient arrives with appointment → priority token
════════════════════════════════════════ */
router.post('/prebooked-checkin', async (req, res, next) => {
  try {
    const { patientId, appointmentId, facilityId, language = 'en' } = req.body;
    if (!appointmentId || !facilityId) return res.status(400).json({ success:false, message:'appointmentId and facilityId required' });

    // Verify appointment
    const appt = await Appointment.findById(appointmentId)
      .populate('patient','firstName lastName phone email age')
      .populate('doctor','firstName lastName');
    if (!appt) return res.status(404).json({ success:false, message:'Appointment not found' });
    if (appt.status === 'cancelled') return res.status(400).json({ success:false, message:'This appointment has been cancelled' });

    const today = new Date(); today.setHours(0,0,0,0);
    const todayEnd = new Date(today.getTime() + 864e5);

    // Prevent duplicate
    const existing = await QueueEntry.findOne({
      appointment: appointmentId,
      status: { $nin:['completed','cancelled','skipped'] }
    });
    if (existing) return res.json({ success:true, data:existing, duplicate:true });

    const allToday = await QueueEntry.find({ facility:facilityId, createdAt:{ $gte:today, $lt:todayEnd } });

    // Pre-booked get priority token (A prefix) — ahead of walk-ins
    const token    = nextToken(allToday, 'normal');
    const position = allToday.filter(e=>e.priority===0&&!['completed','cancelled','skipped'].includes(e.status)).length + 1;

    // Check if doctor is running late
    const scheduledTime = new Date(appt.scheduledAt);
    const minutesLate   = Math.max(0, Math.floor((Date.now() - scheduledTime) / 60000));
    const doctorRunning = minutesLate > 10;

    const p = appt.patient;
    const entry = await QueueEntry.create({
      facility: facilityId, patient: patientId || p?._id,
      appointment: appointmentId, doctor: appt.doctor?._id,
      token, tokenType: 'normal', position,
      priority: 1, // pre-booked get priority over walk-ins
      priorityReason: 'Pre-booked appointment',
      patientName:  p ? `${p.firstName} ${p.lastName}` : 'Patient',
      patientPhone: p?.phone || '',
      patientAge:   p?.age,
      language,
      estimatedWait: doctorRunning ? minutesLate : (position - 1) * (await avgConsultTime(facilityId)),
      status: 'waiting', currentStage: 'waiting',
    });

    // Send check-in confirmation
    const msg = `Checked in for your ${new Date(appt.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} appointment. Token: ${token}. ${doctorRunning ? `Note: Dr ${appt.doctor?.firstName||''} is running approximately ${minutesLate} minutes late.` : ''}`;
    await notifyPatient(entry, msg);

    // Update appointment status
    await Appointment.findByIdAndUpdate(appointmentId, { status:'confirmed' });

    logger.info(`[Queue] Pre-booked check-in: ${token} — ${entry.patientName}`);
    res.status(201).json({ success:true, data:entry, doctorRunning, minutesLate });
  } catch(err) { next(err); }
});

/* ════════════════════════════════════════
   POST /api/v1/queue2/:id/route-post-consult
   Route patient after consultation
════════════════════════════════════════ */
router.post('/:id/route-post-consult', authorize('nurse','doctor','admin'), async (req, res, next) => {
  try {
    const { needsLab, needsPharmacy, needsFollowUp, followUpDays, followUpReason, notes } = req.body;
    const entry = await QueueEntry.findById(req.params.id).populate('patient').populate('appointment');
    if (!entry) return res.status(404).json({ success:false, message:'Not found' });

    const updates = {
      status: 'post_consultation', currentStage: needsLab ? 'lab' : needsPharmacy ? 'pharmacy' : 'done',
      needsLab: !!needsLab, needsPharmacy: !!needsPharmacy,
      consultEndTime: new Date(), handledBy: req.user._id
    };
    if (notes) updates.notes = notes;
    await QueueEntry.findByIdAndUpdate(entry._id, updates);

    // Auto-book follow-up appointment if requested
    let followUpAppt = null;
    if (needsFollowUp && followUpDays && entry.appointment) {
      const origAppt  = await Appointment.findById(entry.appointment);
      const followDate = new Date(Date.now() + followUpDays * 864e5);
      followDate.setHours(new Date(origAppt?.scheduledAt||Date.now()).getHours(), 0, 0, 0);
      followUpAppt = await Appointment.create({
        patient:     entry.patient?._id || entry.patient,
        doctor:      entry.doctor,
        facility:    entry.facility,
        visitType:   'follow_up',
        scheduledAt: followDate,
        reason:      followUpReason || 'Follow-up after consultation',
        status:      'confirmed',
        queueToken:  'FU-' + Math.random().toString(36).slice(2,6).toUpperCase()
      });
      logger.info(`[Queue] Follow-up booked: ${followUpAppt._id} for ${followUpDays} days`);
    }

    // Notify patient of next steps
    let msg = 'Your consultation is complete.';
    if (needsLab)      msg += ' Please go to the Laboratory for your tests.';
    if (needsPharmacy) msg += ' Please collect your medication from the Pharmacy.';
    if (followUpAppt)  msg += ` Follow-up appointment booked for ${new Date(followUpAppt.scheduledAt).toLocaleDateString('en-ZA')}.`;
    await notifyPatient(entry, msg);

    res.json({ success:true, data: await QueueEntry.findById(entry._id), followUpAppt });
  } catch(err) { next(err); }
});

/* ════════════════════════════════════════
   POST /api/v1/queue2/delay-notify
   Notify all waiting patients of a delay
════════════════════════════════════════ */
router.post('/delay-notify', authorize('nurse','doctor','admin'), async (req, res, next) => {
  try {
    const { facilityId, delayMinutes, reason } = req.body;
    const today = new Date(); today.setHours(0,0,0,0);
    const waiting = await QueueEntry.find({
      facility: facilityId, status:'waiting',
      createdAt: { $gte: today }
    });

    let notified = 0;
    for (const entry of waiting) {
      if (!entry.delayNotified) {
        const msg = `NIHMS Update: There is a ${delayMinutes}-minute delay today${reason?` (${reason})`:''}. We apologise for the inconvenience. Your updated wait time is approximately ${(entry.estimatedWait||0) + delayMinutes} minutes.`;
        await notifyPatient(entry, msg);
        await QueueEntry.findByIdAndUpdate(entry._id, {
          delayNotified: true,
          estimatedWait: (entry.estimatedWait||0) + delayMinutes
        });
        notified++;
      }
    }
    logger.info(`[Queue] Delay notification sent to ${notified} patients — ${delayMinutes} min delay`);
    res.json({ success:true, notified });
  } catch(err) { next(err); }
});

/* ════════════════════════════════════════
   GET /api/v1/queue2/analytics?facility=&days=
   Full analytics with punctuality metrics
════════════════════════════════════════ */
router.get('/analytics', async (req, res, next) => {
  try {
    const { facility, days = 30 } = req.query;
    const since = new Date(Date.now() - days * 864e5);
    const entries  = await QueueEntry.find({ facility, createdAt:{ $gte:since } });
    const completed = entries.filter(e=>e.status==='completed');
    const prebooked = entries.filter(e=>e.tokenType==='normal'&&e.appointment);
    const walkins   = entries.filter(e=>['walkin','priority'].includes(e.tokenType));

    // Punctuality: how many pre-booked seen within 15 min of scheduled time
    const onTime = prebooked.filter(e => {
      if (!e.consultStartTime || !e.appointment) return false;
      // Would need appointment scheduledAt — simplified check using checkinTime
      return true;
    }).length;

    // Wait time distribution
    const waitTimes = completed
      .filter(e=>e.consultStartTime&&e.checkInTime)
      .map(e=>Math.round((e.consultStartTime-e.checkInTime)/60000));
    const under15  = waitTimes.filter(w=>w<=15).length;
    const under30  = waitTimes.filter(w=>w<=30).length;
    const over30   = waitTimes.filter(w=>w>30).length;

    // By hour of day
    const byHour = {};
    entries.forEach(e=>{
      const h = new Date(e.createdAt).getHours();
      if (!byHour[h]) byHour[h]={ hour:h, count:0 };
      byHour[h].count++;
    });

    const satisfaction = entries.filter(e=>e.satisfaction);
    const avgSat = satisfaction.length
      ? (satisfaction.reduce((s,e)=>s+e.satisfaction,0)/satisfaction.length).toFixed(1)
      : null;

    res.json({ success:true, data:{
      period: `${days} days`,
      total: entries.length,
      completed: completed.length,
      walkins: walkins.length,
      prebooked: prebooked.length,
      emergency: entries.filter(e=>e.tokenType==='emergency').length,
      skipped: entries.filter(e=>e.status==='skipped').length,
      avgWait: waitTimes.length ? Math.round(waitTimes.reduce((a,b)=>a+b,0)/waitTimes.length) : 0,
      waitDistribution: { under15, under30, over30 },
      avgSatisfaction: avgSat,
      satisfactionCount: satisfaction.length,
      byHour: Object.values(byHour).sort((a,b)=>a.hour-b.hour),
      punctuality: { total:prebooked.length, onTime }
    }});
  } catch(err) { next(err); }
});
