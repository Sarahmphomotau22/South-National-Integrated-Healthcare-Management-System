'use strict';
/**
 * utils/mailer.js
 * Sends OTP via email (nodemailer) AND SMS (Twilio).
 * Falls back to terminal logging if credentials not configured.
 */

const nodemailer = require('nodemailer');
const logger     = require('./logger');

/* ── Email transporter ── */
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT   === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  return _transporter;
}

function isEmailConfigured() {
  return process.env.SMTP_USER &&
         process.env.SMTP_PASS &&
         !process.env.SMTP_PASS.includes('YOUR_') &&
         process.env.SMTP_USER !== 'apikey' &&
         process.env.SMTP_USER.includes('@');
}

function isSmsConfigured() {
  return process.env.TWILIO_ACCOUNT_SID &&
         process.env.TWILIO_AUTH_TOKEN  &&
         process.env.TWILIO_PHONE_FROM  &&
         !process.env.TWILIO_ACCOUNT_SID.includes('YOUR_');
}

/* ── Send OTP via email ── */
async function sendEmail({ to, subject, html, text }) {
  // Extract OTP from message for terminal display
  const otpMatch = (html || text || '').match(/\b(\d{6})\b/);
  const otp      = otpMatch ? otpMatch[1] : null;

  // Always log to terminal
  logger.info('─────────────────────────────────────────');
  logger.info(`📧  OTP Email → ${to}`);
  if (otp) logger.info(`    Code: ${otp}`);
  logger.info(`    Subject: ${subject}`);
  logger.info('─────────────────────────────────────────');

  if (!isEmailConfigured()) {
    logger.warn('[EMAIL] Not configured — see OTP in terminal above');
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const info = await getTransporter().sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'NIHMS'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to, subject, html, text
    });
    logger.info(`[EMAIL] Sent: ${info.messageId} → ${to}`);
    return { sent: true };
  } catch (err) {
    logger.error(`[EMAIL] Failed: ${err.message}`);
    return { sent: false, reason: err.message };
  }
}

/* ── Send OTP via SMS (Twilio) ── */
async function sendSms({ to, body }) {
  // Extract OTP for terminal log
  const otpMatch = body.match(/\b(\d{6})\b/);
  const otp      = otpMatch ? otpMatch[1] : null;

  logger.info('─────────────────────────────────────────');
  logger.info(`📱  OTP SMS → ${to}`);
  if (otp) logger.info(`    Code: ${otp}`);
  logger.info('─────────────────────────────────────────');

  if (!isSmsConfigured()) {
    logger.warn('[SMS] Twilio not configured — see OTP in terminal above');
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const twilio = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    const msg = await twilio.messages.create({
      body,
      from: process.env.TWILIO_PHONE_FROM,
      to
    });
    logger.info(`[SMS] Sent: ${msg.sid} → ${to}`);
    return { sent: true };
  } catch (err) {
    logger.error(`[SMS] Failed: ${err.message}`);
    return { sent: false, reason: err.message };
  }
}

/**
 * sendOtp({ email, phone, otp })
 * Sends OTP via both email and SMS simultaneously.
 */
async function sendOtp({ email, phone, otp }) {
  const emailHtml = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#0F6E56;padding:20px;text-align:center;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:22px">NIHMS</h1>
      </div>
      <div style="background:#f9f9f9;padding:28px;border-radius:0 0 8px 8px;border:1px solid #eee">
        <h2 style="margin:0 0 12px;font-size:18px;color:#1a1a1a">Password Reset OTP</h2>
        <p style="color:#555;margin:0 0 20px">Use the code below to reset your NIHMS password. It expires in <strong>15 minutes</strong>.</p>
        <div style="background:#fff;border:2px dashed #0F6E56;border-radius:8px;padding:20px;text-align:center;margin-bottom:20px">
          <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#0F6E56;font-family:monospace">${otp}</span>
        </div>
        <p style="color:#999;font-size:12px;margin:0">If you did not request this, please ignore this email. Do not share this code with anyone.</p>
      </div>
    </div>`;

  const smsBody = `Your NIHMS password reset code is: ${otp}. It expires in 15 minutes. Do not share this code.`;

  const results = await Promise.allSettled([
    email ? sendEmail({ to: email, subject: 'NIHMS — Password Reset OTP', html: emailHtml }) : Promise.resolve(),
    phone ? sendSms({ to: phone, body: smsBody }) : Promise.resolve()
  ]);

  return results;
}

module.exports = { sendEmail, sendSms, sendOtp };
