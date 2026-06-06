'use strict';
/**
 * utils/daily.js
 * Daily.co video room management.
 */
const https  = require('https');
const logger = require('./logger');

function dailyRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const DAILY_API_KEY = process.env.DAILY_API_KEY;
    if (!DAILY_API_KEY || DAILY_API_KEY.includes('YOUR_')) {
      reject(new Error('DAILY_API_KEY not configured in .env'));
      return;
    }
    const data    = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.daily.co',
      port:     443,
      path:     `/v1${path}`,
      method,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (res.statusCode >= 400) {
            const msg = parsed.error || parsed.info || `Daily API error ${res.statusCode}`;
            reject(new Error(msg));
          } else {
            resolve(parsed);
          }
        } catch { reject(new Error('Invalid Daily API response')); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

/**
 * createRoom — room name uses only lowercase alphanumeric + hyphens (Daily requirement)
 */
async function createRoom(appointmentId, scheduledAt) {
  // Daily room names: lowercase letters, numbers, hyphens only, max 255 chars
  const roomName = `nihms-appt-${String(appointmentId).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)}`;

  // Check if room exists
  try {
    const existing = await dailyRequest('GET', `/rooms/${roomName}`);
    if (existing.url) {
      logger.info(`Daily room exists: ${roomName}`);
      return { url: existing.url, name: roomName };
    }
  } catch { /* does not exist yet */ }

  // Expire 2 hours after scheduled time (or 2 hours from now if in past)
  const base = new Date(scheduledAt) > new Date() ? new Date(scheduledAt) : new Date();
  const exp  = Math.floor((base.getTime() + 2 * 60 * 60 * 1000) / 1000);

  const room = await dailyRequest('POST', '/rooms', {
    name:       roomName,
    privacy:    'public',          // public so token is optional — simpler for testing
    properties: {
      exp,
      enable_chat:       true,
      enable_knocking:   false,
      start_video_off:   false,
      start_audio_off:   false,
      max_participants:  10,
      enable_prejoin_ui: true,
      lang:              'en'
    }
  });

  logger.info(`Daily room created: ${room.url}`);
  return { url: room.url, name: roomName };
}

/**
 * createToken — optional, adds participant name to room
 */
async function createToken(roomName, participantName, isOwner = false) {
  try {
    const exp   = Math.floor(Date.now() / 1000) + 4 * 60 * 60; // 4 hours
    const token = await dailyRequest('POST', '/meeting-tokens', {
      properties: {
        room_name:  roomName,
        user_name:  participantName,
        is_owner:   isOwner,
        exp
      }
    });
    return token.token;
  } catch(e) {
    logger.warn(`Could not create meeting token: ${e.message} — using roomUrl without token`);
    return null; // non-fatal — participant can still join without token on public room
  }
}

async function deleteRoom(appointmentId) {
  const roomName = `nihms-appt-${String(appointmentId).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0,40)}`;
  try {
    await dailyRequest('DELETE', `/rooms/${roomName}`);
    logger.info(`Daily room deleted: ${roomName}`);
  } catch(e) {
    logger.warn(`Could not delete Daily room: ${e.message}`);
  }
}

module.exports = { createRoom, createToken, deleteRoom };
