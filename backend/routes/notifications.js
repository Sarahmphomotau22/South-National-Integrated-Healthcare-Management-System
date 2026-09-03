'use strict';
/**
 * backend/routes/notifications.js
 * Handles SMS and email notifications via Twilio and Nodemailer
 */
const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const logger  = require('../utils/logger');

router.use(protect);

/* POST /api/v1/notifications/sms */
router.post('/sms', async (req, res, next) => {
  try {
    const { to, message } = req.body;
    if (!to || !message)
      return res.status(400).json({ success: false, message: 'to and message are required' });

    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from  = process.env.TWILIO_PHONE_NUMBER;

    if (!sid || !token || !from) {
      logger.warn('[SMS] Twilio not configured — skipping SMS to ' + to);
      return res.json({ success: true, skipped: true, message: 'SMS skipped — Twilio not configured' });
    }

    const twilio = require('twilio')(sid, token);
    const result = await twilio.messages.create({ to, from, body: message });
    logger.info('[SMS] Sent to ' + to + ' — SID: ' + result.sid);
    res.json({ success: true, sid: result.sid });
  } catch (err) {
    logger.warn('[SMS] Failed: ' + err.message);
    // Non-fatal — don't crash the request
    res.json({ success: false, message: err.message });
  }
});

/* POST /api/v1/notifications/email */
router.post('/email', async (req, res, next) => {
  try {
    const { to, subject, html, text } = req.body;
    if (!to || !subject)
      return res.status(400).json({ success: false, message: 'to and subject are required' });

    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
      logger.warn('[Email] Not configured — skipping email to ' + to);
      return res.json({ success: true, skipped: true, message: 'Email skipped — EMAIL_USER/PASS not configured' });
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from:    `"NIHMS" <${user}>`,
      to, subject,
      html:    html || text || '',
      text:    text || subject,
    });

    logger.info('[Email] Sent to ' + to + ' — ID: ' + info.messageId);
    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    logger.warn('[Email] Failed: ' + err.message);
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
