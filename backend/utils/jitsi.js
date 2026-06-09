'use strict';
/**
 * utils/jitsi.js — Jitsi Meet room management
 * Free, no API key, works in any browser.
 */

function getRoomName(appointmentId) {
  return `nihms-${String(appointmentId).replace(/[^a-zA-Z0-9]/g,'').toLowerCase()}`;
}

function getRoomUrl(appointmentId) {
  return `https://meet.jit.si/${getRoomName(appointmentId)}`;
}

/**
 * Build Jitsi URL with display name and config pre-set.
 * Opens reliably in a new tab — no API key needed.
 */
function getIframeUrl(appointmentId, displayName, isDoctor = false) {
  const room = getRoomName(appointmentId);
  const name = encodeURIComponent(displayName || 'Guest');
  return [
    `https://meet.jit.si/${room}`,
    `#userInfo.displayName="${name}"`,
    `&config.prejoinPageEnabled=false`,
    `&config.startWithAudioMuted=false`,
    `&config.startWithVideoMuted=false`,
    `&config.disableDeepLinking=true`,
    `&config.enableWelcomePage=false`,
    `&config.lobby.enabled=false`,
    `&config.requireDisplayName=false`,
    `&config.toolbarButtons=["microphone","camera","chat","desktop","fullscreen","hangup","participants-pane","tileview"]`
  ].join('');
}

module.exports = { getRoomName, getRoomUrl, getIframeUrl };
