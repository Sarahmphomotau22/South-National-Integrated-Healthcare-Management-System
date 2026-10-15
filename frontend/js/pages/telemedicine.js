/**
 * js/pages/telemedicine.js — NIHMS Patient Telemedicine Portal
 *
 * Patients can:
 *   • View their scheduled telemedicine appointments
 *   • Join a consultation directly inside NIHMS (Jitsi embedded via iframe)
 *   • Leave the consultation safely
 *   • Cancel an appointment
 *
 * Doctors who land on this page (via router) are redirected to the
 * doctor-specific view in doctor_new.js via the shared Pages registry.
 *
 * Dependencies: window.API (api.js), window.UI (ui.js), window.Router (router.js)
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ══════════════════════════════════════════════════════════════
   SESSION LIST PAGE
══════════════════════════════════════════════════════════════ */
Pages['telemedicine'] = Pages['telemedicine'] || function() {
  var user     = API.getStoredUser();
  var isDoctor = user && ['doctor','nurse','admin'].includes(user.role);

  /* Doctor portal has its own telemedicine in doctor_new.js —
     if it's already mounted in #doc-main, do nothing here */
  if (document.getElementById('doc-main') && isDoctor) return '';

  /* Load sessions after paint */
  setTimeout(function(){ _loadTeleSessions(isDoctor); }, 0);

  return '<div class="page-wrap" style="max-width:760px;margin:0 auto;padding:20px 16px">' +

    '<div style="font-size:20px;font-weight:800;color:var(--text,#1e293b);margin-bottom:16px">' +
      '<i class="ti ti-video" style="margin-right:8px;color:var(--green,#1D9E75)"></i>Telemedicine' +
    '</div>' +

    /* Info banner */
    '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 14px;display:flex;align-items:flex-start;gap:10px;margin-bottom:16px">' +
      '<i class="ti ti-info-circle" style="font-size:18px;color:#1d4ed8;flex-shrink:0;margin-top:1px"></i>' +
      '<div style="font-size:13px;color:#1e3a5f;line-height:1.5">' +
        (isDoctor
          ? 'Click <strong>Start session</strong> when your patient is ready. The video call opens inside NIHMS.'
          : 'Click <strong>Join session</strong> at your scheduled time. No downloads or account required — just click and connect. Make sure your camera and microphone are allowed in your browser.'
        ) +
      '</div>' +
    '</div>' +

    /* Session list card */
    '<div class="card" style="border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.06)">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
        '<div style="font-weight:700;font-size:14px;color:var(--text,#1e293b)">' +
          '<i class="ti ti-calendar-event" style="margin-right:6px"></i>Your sessions' +
        '</div>' +
        '<button class="btn btn-xs" onclick="_loadTeleSessions(' + isDoctor + ')">' +
          '<i class="ti ti-refresh"></i>Refresh' +
        '</button>' +
      '</div>' +
      '<div id="tele-list"><div style="color:var(--text-muted,#94a3b8);padding:16px">Loading…</div></div>' +
    '</div>' +

    /* Privacy notice */
    '<div style="font-size:11px;color:var(--text-muted,#94a3b8);margin-top:12px;text-align:center">' +
      '🔒 Video consultations are protected under POPIA. NIHMS does not record sessions by default. '+
      'You may report concerns to your facility\'s Information Officer.' +
    '</div>' +

    '</div>' +

    /* Full-screen video overlay — hidden until joined */
    '<div id="tele-overlay" style="display:none;position:fixed;inset:0;background:#111;z-index:9999;flex-direction:column"></div>';
};

/* ══════════════════════════════════════════════════════════════
   LOAD SESSIONS
══════════════════════════════════════════════════════════════ */
window._loadTeleSessions = async function(isDoctor) {
  var wrap = document.getElementById('tele-list');
  if (!wrap) return;
  wrap.innerHTML = '<div style="color:var(--text-muted,#94a3b8);padding:20px;text-align:center">Loading…</div>';

  try {
    var appts = [];

    if (isDoctor) {
      var res = await API.appointments.list({ visitType: 'telemedicine', limit: 50 });
      appts = (res && res.data) || [];
    } else {
      /* Patient: fetch own patient record first, then their telemedicine appointments */
      var patRes = await API._fetchDirect('/patients/me', { method: 'GET' });
      var p = patRes && patRes.data;
      if (!p) {
        wrap.innerHTML = '<div style="padding:20px;color:var(--text-muted,#94a3b8);font-size:13px">No patient record found. Please contact your facility.</div>';
        return;
      }
      var aRes = await API.appointments.list({ patient: p._id, limit: 50 });
      appts = ((aRes && aRes.data) || []).filter(function(a) {
        return ['telemedicine', 'video'].includes((a.visitType || '').toLowerCase());
      });
    }

    if (!appts.length) {
      wrap.innerHTML =
        '<div style="text-align:center;padding:40px;color:var(--text-muted,#94a3b8)">' +
          '<i class="ti ti-video-off" style="font-size:44px;opacity:.25;display:block;margin-bottom:12px"></i>' +
          '<div style="font-weight:600;font-size:14px;margin-bottom:6px">No telemedicine sessions</div>' +
          '<div style="font-size:12px;margin-bottom:16px">Upcoming telemedicine appointments will appear here.</div>' +
          (!isDoctor
            ? '<button class="btn btn-green" onclick="Router.setPage(\'book\')">' +
                '<i class="ti ti-plus"></i>Book a telemedicine visit' +
              '</button>'
            : '') +
        '</div>';
      return;
    }

    appts.sort(function(a, b) { return new Date(a.scheduledAt) - new Date(b.scheduledAt); });

    var statusStyles = {
      confirmed:   { bg: '#dcfce7', color: '#15803d', label: 'Confirmed' },
      pending:     { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
      in_progress: { bg: '#dbeafe', color: '#1d4ed8', label: 'In progress' },
      completed:   { bg: '#f1f5f9', color: '#64748b', label: 'Completed' },
      cancelled:   { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' }
    };

    wrap.innerHTML = appts.map(function(a) {
      var when    = new Date(a.scheduledAt);
      var now     = new Date();
      var isLive  = a.status === 'in_progress';
      var isPast  = when < now && !isLive;
      var isSoon  = !isPast && (when - now) < 30 * 60 * 1000;
      var canJoin = !['cancelled', 'completed'].includes(a.status);
      var canAct  = ['confirmed', 'pending'].includes(a.status) && !isPast;
      var ss      = statusStyles[a.status] || { bg: '#f1f5f9', color: '#64748b', label: a.status };

      var other = isDoctor
        ? (((a.patient && a.patient.firstName) || '') + ' ' + ((a.patient && a.patient.lastName) || '')).trim() || 'Patient'
        : ('Dr. ' + ((a.doctor && a.doctor.firstName) || '') + ' ' + ((a.doctor && a.doctor.lastName) || '')).trim() || 'Doctor';

      var ini = other.replace(/^Dr\.\s*/,'').split(' ').map(function(n){return n[0]||'';}).join('').slice(0,2).toUpperCase();
      var cardBorder = isLive ? 'var(--green,#1D9E75)' : isSoon ? '#f59e0b' : 'var(--border,#e2e8f0)';
      var cardBg     = isLive ? '#f0fdf4' : isSoon ? '#fffbeb' : 'var(--bg-card,#fff)';

      return '<div style="padding:14px;margin-bottom:10px;border-radius:10px;border:2px solid ' + cardBorder + ';background:' + cardBg + '">' +
        '<div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">' +

          /* Avatar */
          '<div style="width:42px;height:42px;border-radius:50%;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">' + ini + '</div>' +

          /* Details */
          '<div style="flex:1;min-width:0">' +
            '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">' +
              '<span style="font-size:14px;font-weight:700;color:var(--text,#1e293b)">' + other + '</span>' +
              (isLive  ? '<span style="font-size:11px;font-weight:600;padding:2px 10px;border-radius:20px;background:var(--green,#1D9E75);color:#fff">● Live now</span>' : '') +
              (isSoon && !isLive ? '<span style="font-size:11px;font-weight:600;padding:2px 10px;border-radius:20px;background:#f59e0b;color:#fff">Starting soon</span>' : '') +
              '<span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;background:' + ss.bg + ';color:' + ss.color + '">' + ss.label + '</span>' +
            '</div>' +
            '<div style="font-size:12px;color:var(--text-muted,#64748b);margin-bottom:2px">' + (a.reason || 'Telemedicine consultation') + '</div>' +
            '<div style="font-size:11px;color:var(--text-muted,#94a3b8)">' +
              '📅 ' + when.toLocaleDateString('en-ZA', { weekday:'short', day:'numeric', month:'short', year:'numeric' }) +
              '&nbsp; 🕐 ' + when.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) +
              (a.queueToken ? '&nbsp; 🎫 Token: <strong style="font-family:monospace">' + a.queueToken + '</strong>' : '') +
            '</div>' +
            /* Cancelled / past message */
            (a.status === 'cancelled' ? '<div style="font-size:12px;color:#dc2626;margin-top:4px">This appointment was cancelled.</div>' : '') +
            (isPast && a.status !== 'completed' && a.status !== 'cancelled'
              ? '<div style="font-size:12px;color:#f59e0b;margin-top:4px">This session time has passed. Please contact your facility to reschedule.</div>'
              : '') +
          '</div>' +

          /* Actions */
          '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0">' +
            (canJoin
              ? '<button onclick="_joinTeleSession(\'' + a._id + '\')" style="padding:9px 18px;border-radius:8px;border:none;background:var(--green,#1D9E75);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px">' +
                  '<i class="ti ti-video"></i>' + (isLive ? 'Rejoin session' : isSoon ? 'Join now' : 'Join session') +
                '</button>'
              : '') +
            (canAct && !isDoctor
              ? '<button onclick="_cancelTeleAppt(\'' + a._id + '\')" style="padding:5px 10px;border-radius:6px;border:1px solid #fca5a5;background:#fff;color:#dc2626;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">✕ Cancel</button>'
              : '') +
            (canAct && isDoctor
              ? '<button onclick="_docReschedule(\'' + a._id + '\',\'telemedicine\',\'' + new Date(a.scheduledAt).toISOString().slice(0,16) + '\')" style="padding:5px 10px;border-radius:6px;border:1px solid var(--border,#e2e8f0);background:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">↩ Reschedule</button>'
              : '') +
          '</div>' +

        '</div>' +
      '</div>';
    }).join('');

  } catch (err) {
    wrap.innerHTML =
      '<div style="padding:14px;background:#fee2e2;border-radius:8px;color:#991b1b;font-size:13px">' +
        '⚠ Could not load your sessions: ' + (err.message || 'Network error') + '. Please try again.' +
      '</div>';
  }
};

/* ══════════════════════════════════════════════════════════════
   JOIN SESSION
══════════════════════════════════════════════════════════════ */
window._joinTeleSession = async function(appointmentId) {
  /* Disable the join button while loading */
  var btns = document.querySelectorAll('#tele-list button');
  btns.forEach(function(b) {
    if ((b.getAttribute('onclick') || '').includes(appointmentId)) {
      b.disabled = true;
      b.innerHTML = '<i class="ti ti-loader-2"></i> Joining…';
    }
  });

  try {
    var res  = await API._fetchDirect('/appointments/' + appointmentId + '/join', { method: 'GET' });
    var data = res && res.data;
    if (!data) throw new Error('No session data returned from server.');
    _openTeleRoom(data);
  } catch (err) {
    if (window.UI && window.UI.showToast) {
      window.UI.showToast('Could not join: ' + (err.message || 'Check your appointment type'), 'err');
    }
    var user = API.getStoredUser();
    _loadTeleSessions(user && ['doctor','nurse','admin'].includes(user.role));
  }
};

/* ══════════════════════════════════════════════════════════════
   VIDEO ROOM OVERLAY
══════════════════════════════════════════════════════════════ */
function _openTeleRoom(session) {
  var overlay = document.getElementById('tele-overlay');
  if (!overlay) return;

  var when  = session.scheduledAt ? new Date(session.scheduledAt) : null;
  var isDoc = !!session.isDoctor;
  var other = isDoc
    ? (((session.patient && session.patient.firstName) || '') + ' ' + ((session.patient && session.patient.lastName) || '')).trim() || 'Patient'
    : ('Dr. ' + ((session.doctor && session.doctor.firstName) || '') + ' ' + ((session.doctor && session.doctor.lastName) || '')).trim() || 'Doctor';

  overlay.style.display = 'flex';
  overlay.innerHTML =
    '<style>' +
      '@keyframes nihms-live{0%,100%{opacity:1}50%{opacity:.4}}' +
      '#tele-jitsi-frame{width:100%;border:none;flex:1;min-height:0}' +
    '</style>' +

    /* ── Top control bar ── */
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#1a1a1a;flex-shrink:0;gap:12px;flex-wrap:wrap">' +
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="font-size:15px;font-weight:800;color:#fff;letter-spacing:-.3px">NI<span style="color:#1D9E75">HMS</span></div>' +
        '<div style="width:8px;height:8px;border-radius:50%;background:#1D9E75;animation:nihms-live 2s infinite"></div>' +
        '<span style="color:#ccc;font-size:13px">Video session with <strong style="color:#fff">' + other + '</strong></span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
        (when ? '<span style="color:#888;font-size:11px">🕐 ' + when.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + (session.queueToken ? ' &nbsp;🎫 ' + session.queueToken : '') + '</span>' : '') +
        '<button onclick="_endTeleCall()" style="padding:8px 16px;border-radius:8px;border:none;background:#dc2626;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">' +
          '📵 Leave session' +
        '</button>' +
        '<button onclick="window.open(\'' + session.roomUrl + '\',\'_blank\')" style="padding:8px 16px;border-radius:8px;border:1px solid #444;background:#2a2a2a;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">' +
          '↗ New tab' +
        '</button>' +
      '</div>' +
    '</div>' +

    /* ── Info strip ── */
    '<div style="display:flex;align-items:center;gap:12px;padding:7px 16px;background:#141414;flex-shrink:0;border-bottom:1px solid #333;flex-wrap:wrap">' +
      '<span style="font-size:11px;color:#888">' + (isDoc ? 'Patient:' : 'Doctor:') + '</span>' +
      '<span style="font-size:13px;font-weight:600;color:#fff">' + other + '</span>' +
      (when ? '<span style="font-size:11px;color:#888;margin-left:8px">📅 ' + when.toLocaleDateString('en-ZA', {day:'numeric', month:'short', year:'numeric'}) + '</span>' : '') +
      '<span style="font-size:11px;color:#555;margin-left:auto">🔒 Not recorded by default · POPIA protected</span>' +
    '</div>' +

    /* ── Waiting state (shown while iframe loads) ── */
    '<div id="tele-waiting" style="position:absolute;inset:0;top:90px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#111;color:#fff;z-index:1;pointer-events:none">' +
      '<div style="font-size:36px;margin-bottom:12px;animation:nihms-live 1.5s infinite">📹</div>' +
      '<div style="font-size:14px;font-weight:600;margin-bottom:6px">Connecting to video room…</div>' +
      '<div style="font-size:12px;color:#888">Allow camera and microphone when prompted by your browser</div>' +
    '</div>' +

    /* ── Jitsi iframe ── */
    '<iframe id="tele-jitsi-frame" ' +
      'src="' + session.iframeUrl + '" ' +
      'allow="camera; microphone; fullscreen; speaker; display-capture; autoplay; clipboard-read; clipboard-write" ' +
      'allowfullscreen ' +
      'onload="var w=document.getElementById(\'tele-waiting\');if(w)w.style.display=\'none\'" ' +
    '></iframe>';
}

/* ── Leave call ── */
window._endTeleCall = function() {
  var overlay = document.getElementById('tele-overlay');
  if (overlay) { overlay.style.display = 'none'; overlay.innerHTML = ''; }
  if (window.UI && window.UI.showToast) window.UI.showToast('You have left the session', 'ok');
  var user = API.getStoredUser();
  _loadTeleSessions(user && ['doctor','nurse','admin'].includes(user.role));
};

/* ── Patient cancel ── */
window._cancelTeleAppt = function(id) {
  var reason = window.prompt('Reason for cancellation (optional):');
  if (reason === null) return; /* User pressed Cancel on the prompt */
  API.appointments.cancel(id, reason || '')
    .then(function() {
      if (window.UI && window.UI.showToast) window.UI.showToast('Appointment cancelled. You will receive a confirmation.', 'ok');
      _loadTeleSessions(false);
    })
    .catch(function(e) {
      if (window.UI && window.UI.showToast) window.UI.showToast(e.message || 'Could not cancel. Please contact your facility.', 'err');
    });
};
