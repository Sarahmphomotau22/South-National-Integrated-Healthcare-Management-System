'use strict';
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Appointment } = require('../models/index');
const Patient  = require('../models/Patient');
const User     = require('../models/User');
const { Facility } = require('../models/index');
const { sendBookingConfirmation, sendCancellationNotice } = require('../utils/reminders');
const logger   = require('../utils/logger');

router.use(protect);

/* ── Helper: generate queue token ── */
async function generateToken(facilityId, date) {
  const d = new Date(date); d.setHours(0,0,0,0);
  const count = await Appointment.countDocuments({
    facility: facilityId,
    scheduledAt: { $gte: d, $lt: new Date(d.getTime() + 86400000) }
  });
  return `A-${String(count + 1).padStart(2,'0')}`;
}

/* ── Helper: get populated parties ── */
async function getParties(appt) {
  const [patient, doctor, facility] = await Promise.all([
    Patient.findById(appt.patient),
    appt.doctor ? User.findById(appt.doctor) : null,
    Facility.findById(appt.facility)
  ]);
  return { patient, doctor, facility };
}

// GET /api/v1/appointments
router.get('/', async (req, res, next) => {
  try {
    const { patient, doctor, facility, status, date, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (patient)  filter.patient  = patient;
    if (doctor)   filter.doctor   = doctor;
    if (facility) filter.facility = facility;
    if (status)   filter.status   = status;
    if (date) {
      const d = new Date(date);
      filter.scheduledAt = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    }
    if (req.user.role === 'patient') {
      const p = await Patient.findOne({ user: req.user._id });
      if (p) filter.patient = p._id;
      else   return res.json({ success: true, data: [], meta: { total: 0 } });
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Appointment.find(filter)
        .populate('patient',  'firstName lastName nationalId mrn')
        .populate('doctor',   'firstName lastName email phone')
        .populate('facility', 'name')
        .sort({ scheduledAt: 1 }).skip(skip).limit(+limit),
      Appointment.countDocuments(filter)
    ]);
    res.json({ success: true, data, meta: { total, page: +page, limit: +limit } });
  } catch (err) { next(err); }
});

// GET /api/v1/appointments/queue
router.get('/queue', async (req, res, next) => {
  try {
    const { facility, date } = req.query;
    if (!facility) return res.status(400).json({ success: false, message: 'facility required.' });
    const d = date ? new Date(date) : new Date();
    d.setHours(0,0,0,0);
    const data = await Appointment.find({
      facility,
      scheduledAt: { $gte: d, $lt: new Date(d.getTime() + 86400000) },
      status: { $in: ['confirmed','in_progress','pending'] }
    })
    .populate('patient','firstName lastName nationalId mrn')
    .sort({ priority: -1, scheduledAt: 1 });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /api/v1/appointments/:id
router.get('/:id', async (req, res, next) => {
  try {
    const appt = await Appointment.findById(req.params.id)
      .populate('patient').populate('doctor','firstName lastName').populate('facility','name');
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    if (req.user.role === 'patient') {
      const p = await Patient.findOne({ user: req.user._id });
      if (!p || String(appt.patient._id) !== String(p._id))
        return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    res.json({ success: true, data: appt });
  } catch (err) { next(err); }
});

// POST /api/v1/appointments — book appointment
router.post('/', async (req, res, next) => {
  try {
    const body = { ...req.body, createdBy: req.user._id };

    // Patients can only book for themselves
    if (req.user.role === 'patient') {
      const p = await Patient.findById(body.patient);
      if (!p) return res.status(404).json({ success: false, message: 'Patient record not found.' });
      if (String(p.user) !== String(req.user._id))
        return res.status(403).json({ success: false, message: 'You can only book for your own record.' });
      body.status = 'pending';
    }

    const scheduledAt = new Date(body.scheduledAt);
    if (isNaN(scheduledAt.getTime()))
      return res.status(422).json({ success: false, message: 'Invalid date.' });
    if (scheduledAt <= new Date())
      return res.status(422).json({ success: false, message: 'Appointment date and time must be in the future.' });

    // Generate queue token
    body.queueToken = await generateToken(body.facility, scheduledAt);

    const appt = await Appointment.create(body);

    // Send confirmation (non-blocking)
    getParties(appt).then(({ patient, doctor, facility }) => {
      sendBookingConfirmation({ appointment: appt, patient, doctor, facility }).catch(e =>
        logger.warn('Confirmation send failed:', e.message)
      );
    });

    const populated = await Appointment.findById(appt._id)
      .populate('patient','firstName lastName').populate('doctor','firstName lastName').populate('facility','name');
    res.status(201).json({ success: true, data: populated });
  } catch (err) { next(err); }
});

// PATCH /api/v1/appointments/:id/reschedule — patient or staff reschedule
router.patch('/:id/reschedule', async (req, res, next) => {
  try {
    const { scheduledAt, rescheduleReason } = req.body;

    if (!scheduledAt)
      return res.status(400).json({ success: false, message: 'scheduledAt is required.' });
    if (new Date(scheduledAt) <= new Date())
      return res.status(422).json({ success: false, message: 'Rescheduled date must be in the future.' });

    const appt = await Appointment.findById(req.params.id)
      .populate('patient', 'firstName lastName email phone')
      .populate('doctor',  'firstName lastName')
      .populate('facility','name');

    if (!appt)
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    if (['cancelled','completed','no_show'].includes(appt.status))
      return res.status(400).json({ success: false, message: `Cannot reschedule a ${appt.status} appointment.` });

    // Patients can only reschedule their own appointments
    if (req.user.role === 'patient') {
      const p = await Patient.findOne({ user: req.user._id });
      if (!p || String(appt.patient._id || appt.patient) !== String(p._id))
        return res.status(403).json({ success: false, message: 'You can only reschedule your own appointments.' });
    }

    const oldDate = appt.scheduledAt;
    appt.scheduledAt      = new Date(scheduledAt);
    appt.rescheduleReason = rescheduleReason || '';
    appt.status           = 'confirmed';
    await appt.save();

    // Send reschedule notification (non-blocking)
    getParties(appt).then(({ patient, facility }) => {
      if (!patient) return;
      const dateStr = new Date(scheduledAt).toLocaleDateString('en-ZA', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      const timeStr = new Date(scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const msg = `NIHMS: Your appointment at ${facility?.name || 'the clinic'} has been rescheduled to ${dateStr} at ${timeStr}.`;

      // Fire-and-forget SMS
      const axios = require('axios').default;
      const token = require('../utils/token') || null;
      // Use the same notification endpoint if available
      logger.info(`Reschedule notification for patient ${patient._id}: ${msg}`);
    }).catch(e => logger.warn('Reschedule notify failed:', e.message));

    const updated = await Appointment.findById(appt._id)
      .populate('patient','firstName lastName')
      .populate('doctor',  'firstName lastName')
      .populate('facility','name');

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// PATCH /api/v1/appointments/:id/status — staff OR patient update status (patient limited to in_progress/completed for telemedicine)
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status, notes, icd10Code, startedAt, endedAt } = req.body;

    // Patients can only update telemedicine session status (in_progress / completed)
    if (req.user.role === 'patient') {
      if (!['in_progress','completed'].includes(status))
        return res.status(403).json({ success: false, message: 'Patients may only update session status.' });
      const appt = await Appointment.findById(req.params.id);
      if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found.' });
      const p = await Patient.findOne({ user: req.user._id });
      if (!p || String(appt.patient) !== String(p._id))
        return res.status(403).json({ success: false, message: 'Access denied.' });
    } else if (!['doctor','nurse','admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorised.' });
    }

    const update = { status };
    if (notes)     update.notes    = notes;
    if (icd10Code) update.icd10Code = icd10Code;
    if (startedAt) update.startedAt = new Date(startedAt);
    if (endedAt)   update.endedAt   = new Date(endedAt);

    const appt = await Appointment.findByIdAndUpdate(
      req.params.id, update, { new: true, runValidators: true }
    );
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    res.json({ success: true, data: appt });
  } catch (err) { next(err); }
});

// PATCH /api/v1/appointments/:id/cancel — patient OR doctor/staff can cancel
router.patch('/:id/cancel', async (req, res, next) => {
  try {
    const appt = await Appointment.findById(req.params.id)
      .populate('patient','firstName lastName email phone')
      .populate('doctor','firstName lastName email');

    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    if (['cancelled','completed'].includes(appt.status))
      return res.status(400).json({ success: false, message: `Cannot cancel a ${appt.status} appointment.` });

    let cancelledBy = 'clinic';

    if (req.user.role === 'patient') {
      const p = await Patient.findOne({ user: req.user._id });
      if (!p || String(appt.patient._id || appt.patient) !== String(p._id))
        return res.status(403).json({ success: false, message: 'You can only cancel your own appointments.' });
      cancelledBy = 'patient';
    } else if (req.user.role === 'doctor') {
      if (appt.doctor && String(appt.doctor._id || appt.doctor) !== String(req.user._id))
        return res.status(403).json({ success: false, message: 'You can only cancel your own appointments.' });
      cancelledBy = 'doctor';
    }

    const reason = req.body.reason || '';
    appt.status = 'cancelled';
    appt.notes  = reason ? `Cancelled by ${cancelledBy}: ${reason}` : `Cancelled by ${cancelledBy}`;
    await appt.save();

    // Send cancellation notice
    const { patient: patientDoc, doctor: doctorDoc, facility } = await getParties(appt);
    sendCancellationNotice({ appointment: appt, patient: patientDoc, doctor: doctorDoc, cancelledBy })
      .catch(e => logger.warn('Cancellation notice failed:', e.message));

    res.json({ success: true, data: appt, message: 'Appointment cancelled.' });
  } catch (err) { next(err); }
});

// GET /api/v1/appointments/:id/join — get Jitsi room details
router.get('/:id/join', async (req, res, next) => {
  try {
    const appt = await Appointment.findById(req.params.id)
      .populate('patient','firstName lastName')
      .populate('doctor', 'firstName lastName')
      .populate('facility','name');

    if (!appt) return res.status(404).json({ success:false, message:'Appointment not found.' });

    const vType = (appt.visitType || '').toLowerCase().trim();
    const allowedTypes = ['telemedicine','video','consultation','consult','tele-medicine','tele medicine'];
    if (!allowedTypes.includes(vType))
      return res.status(400).json({ success:false, message:`Appointment type '${appt.visitType}' does not support video. Expected telemedicine appointment.` });

    if (['cancelled','completed','no_show'].includes(appt.status))
      return res.status(400).json({ success:false, message:`Cannot join a ${appt.status} appointment.` });

    let isDoctor = false;
    if (req.user.role === 'patient') {
      const p = await Patient.findOne({ user: req.user._id });
      if (!p || String(appt.patient?._id || appt.patient) !== String(p._id))
        return res.status(403).json({ success:false, message:'Access denied.' });
    } else {
      isDoctor = true;
    }

    const displayName = isDoctor
      ? `Dr. ${appt.doctor?.firstName || ''} ${appt.doctor?.lastName || ''}`.trim()
      : `${appt.patient?.firstName || ''} ${appt.patient?.lastName || ''}`.trim();

    const { getRoomName, getRoomUrl, getIframeUrl } = require('../utils/jitsi');
    const roomName  = getRoomName(String(appt._id));
    const roomUrl   = getRoomUrl(String(appt._id));
    const iframeUrl = getIframeUrl(String(appt._id), displayName, isDoctor);

    if (isDoctor && !['in_progress','completed'].includes(appt.status)) {
      await Appointment.findByIdAndUpdate(req.params.id, { status: 'in_progress' });
    }

    logger.info(`${displayName} joining Jitsi room: ${roomName}`);

    return res.json({
      success:  true,
      provider: 'jitsi',
      data: {
        roomName, roomUrl, iframeUrl, displayName,
        queueToken:  appt.queueToken,
        patient:     appt.patient,
        doctor:      appt.doctor,
        facility:    appt.facility,
        scheduledAt: appt.scheduledAt,
        isDoctor
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
