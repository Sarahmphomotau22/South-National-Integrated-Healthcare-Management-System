'use strict';
/**
 * utils/reminders.js
 * Appointment reminders via email + SMS.
 * Called when appointment is booked and by the cron scheduler.
 */
const { sendEmail, sendSms } = require('./mailer');
const logger = require('./logger');

/**
 * Send booking confirmation to patient and doctor.
 */
async function sendBookingConfirmation({ appointment, patient, doctor, facility }) {
  const date = new Date(appointment.scheduledAt);
  const dateStr = date.toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const timeStr = date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  const token   = appointment.queueToken || '—';
  const type    = (appointment.visitType || 'consultation').replace('_', ' ');

  // ── Patient notification ──
  if (patient?.email) {
    await sendEmail({
      to:      patient.email,
      subject: `NIHMS — Appointment Confirmed · Token ${token}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
          <div style="background:#0F6E56;padding:20px;text-align:center;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:20px">NIHMS · Appointment Confirmed</h1>
          </div>
          <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #eee">
            <p style="color:#555">Hello <strong>${patient.firstName}</strong>,</p>
            <p style="color:#555">Your appointment has been booked successfully.</p>
            <div style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:16px;margin:16px 0">
              <table style="width:100%;font-size:14px;border-collapse:collapse">
                <tr><td style="color:#888;padding:6px 0">Queue token</td>
                    <td style="font-weight:700;font-size:22px;color:#0F6E56;font-family:monospace">${token}</td></tr>
                <tr><td style="color:#888;padding:6px 0">Type</td><td style="text-transform:capitalize">${type}</td></tr>
                <tr><td style="color:#888;padding:6px 0">Date</td><td>${dateStr}</td></tr>
                <tr><td style="color:#888;padding:6px 0">Time</td><td>${timeStr}</td></tr>
                <tr><td style="color:#888;padding:6px 0">Facility</td><td>${facility?.name || '—'}</td></tr>
                <tr><td style="color:#888;padding:6px 0">Doctor</td><td>${doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'To be assigned'}</td></tr>
              </table>
            </div>
            ${appointment.visitType === 'telemedicine' ? `
              <div style="background:#E1F5EE;border-radius:8px;padding:12px;margin-top:8px">
                <strong style="color:#0F6E56">📹 Telemedicine appointment</strong>
                <p style="color:#555;margin:4px 0 0">Your video call link will be sent 15 minutes before the appointment.</p>
              </div>` : ''}
            <p style="color:#888;font-size:12px;margin-top:16px">
              Present your queue token <strong>${token}</strong> at the clinic reception or join the video call at the scheduled time.
            </p>
          </div>
        </div>`
    });
  }

  // ── Patient SMS ──
  if (patient?.phone) {
    await sendSms({
      to: patient.phone,
      body: `NIHMS: Appointment confirmed! Token: ${token} | ${type} on ${dateStr} at ${timeStr} | ${facility?.name || ''} | Dr. ${doctor ? doctor.lastName : 'TBA'}`
    });
  }

  // ── Doctor notification ──
  if (doctor?.email) {
    await sendEmail({
      to:      doctor.email,
      subject: `NIHMS — New Appointment · ${patient?.firstName} ${patient?.lastName}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px">
          <p>Hello Dr. <strong>${doctor.firstName}</strong>,</p>
          <p>A new appointment has been booked for you:</p>
          <table style="width:100%;font-size:14px;border-collapse:collapse">
            <tr><td style="color:#888;padding:5px 0">Patient</td><td>${patient?.firstName} ${patient?.lastName}</td></tr>
            <tr><td style="color:#888;padding:5px 0">Token</td><td style="font-weight:700;color:#0F6E56;font-family:monospace">${token}</td></tr>
            <tr><td style="color:#888;padding:5px 0">Type</td><td style="text-transform:capitalize">${type}</td></tr>
            <tr><td style="color:#888;padding:5px 0">Date &amp; time</td><td>${dateStr} at ${timeStr}</td></tr>
            <tr><td style="color:#888;padding:5px 0">Reason</td><td>${appointment.reason || '—'}</td></tr>
          </table>
        </div>`
    });
  }

  logger.info(`Booking confirmation sent — token ${token} to patient ${patient?.email}, doctor ${doctor?.email}`);
}

/**
 * Send cancellation notice to both parties.
 */
async function sendCancellationNotice({ appointment, patient, doctor, cancelledBy }) {
  const date = new Date(appointment.scheduledAt);
  const dateStr = date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  const token   = appointment.queueToken || '—';
  const who     = cancelledBy === 'patient' ? 'the patient' : 'the clinic';

  const emails = [];
  if (patient?.email) emails.push({ to: patient.email, name: patient.firstName });
  if (doctor?.email)  emails.push({ to: doctor.email,  name: `Dr. ${doctor.firstName}` });

  for (const { to, name } of emails) {
    await sendEmail({
      to,
      subject: `NIHMS — Appointment Cancelled · Token ${token}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px">
          <div style="background:#A32D2D;padding:16px;text-align:center;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0">Appointment Cancelled</h2>
          </div>
          <div style="background:#f9f9f9;padding:20px;border-radius:0 0 8px 8px;border:1px solid #eee">
            <p>Hello <strong>${name}</strong>,</p>
            <p>Your appointment (Token: <strong>${token}</strong>) on <strong>${dateStr} at ${timeStr}</strong> has been cancelled by ${who}.</p>
            <p style="color:#888;font-size:13px">If this was unexpected, please contact the clinic or book a new appointment through NIHMS.</p>
          </div>
        </div>`
    });
  }

  if (patient?.phone) {
    await sendSms({ to: patient.phone, body: `NIHMS: Appointment cancelled. Token ${token} on ${dateStr} at ${timeStr} was cancelled by ${who}. Book a new appointment at your clinic.` });
  }

  logger.info(`Cancellation notice sent — token ${token}`);
}

/**
 * Send 24-hour and 1-hour reminder.
 */
async function sendReminder({ appointment, patient, doctor, hoursAhead }) {
  const date    = new Date(appointment.scheduledAt);
  const dateStr = date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  const token   = appointment.queueToken || '—';
  const label   = hoursAhead === 24 ? 'tomorrow' : 'in 1 hour';
  const type    = (appointment.visitType || 'consultation').replace('_', ' ');

  if (patient?.email) {
    await sendEmail({
      to:      patient.email,
      subject: `NIHMS — Reminder: Appointment ${label} · Token ${token}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px">
          <div style="background:#185FA5;padding:16px;text-align:center;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0">Appointment Reminder</h2>
          </div>
          <div style="background:#f9f9f9;padding:20px;border-radius:0 0 8px 8px;border:1px solid #eee">
            <p>Hello <strong>${patient.firstName}</strong>,</p>
            <p>This is a reminder that you have a <strong style="text-transform:capitalize">${type}</strong> appointment <strong>${label}</strong>.</p>
            <table style="font-size:14px;border-collapse:collapse">
              <tr><td style="color:#888;padding:5px 8px 5px 0">Token</td><td style="font-weight:700;color:#0F6E56;font-family:monospace">${token}</td></tr>
              <tr><td style="color:#888;padding:5px 8px 5px 0">Date</td><td>${dateStr}</td></tr>
              <tr><td style="color:#888;padding:5px 8px 5px 0">Time</td><td>${timeStr}</td></tr>
              <tr><td style="color:#888;padding:5px 8px 5px 0">Doctor</td><td>${doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : '—'}</td></tr>
            </table>
            ${appointment.visitType === 'telemedicine' && hoursAhead === 1 ? `
              <div style="background:#E1F5EE;border-radius:8px;padding:12px;margin-top:12px">
                <strong style="color:#0F6E56">📹 Join your video call</strong>
                <p style="color:#555;margin:4px 0 0">Your telemedicine session starts at ${timeStr}. Log in to NIHMS and go to Telemedicine to join.</p>
              </div>` : ''}
          </div>
        </div>`
    });
  }

  if (patient?.phone) {
    await sendSms({ to: patient.phone, body: `NIHMS Reminder: Your ${type} appointment is ${label} on ${dateStr} at ${timeStr}. Token: ${token}.${appointment.visitType==='telemedicine'&&hoursAhead===1?' Log in to join your video call.':''}` });
  }

  logger.info(`${hoursAhead}hr reminder sent — token ${token} to ${patient?.email}`);
}

module.exports = { sendBookingConfirmation, sendCancellationNotice, sendReminder };
