/**
 * js/pages/telemedicine.js — Jitsi Meet telemedicine, simplified and robust.
 */
if (typeof Pages === 'undefined') window.Pages = {};

Pages['telemedicine'] = () => {
  const user     = API.getStoredUser();
  const isDoctor = ['doctor','nurse','admin'].includes(user?.role);
  setTimeout(() => _loadTeleSessions(isDoctor), 0);

  return `
    <div class="page-title">Telemedicine sessions</div>

    <div class="card" style="margin-bottom:14px;background:var(--blue-light);border-color:var(--blue-mid)">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <i class="ti ti-info-circle" style="font-size:18px;color:var(--blue);flex-shrink:0;margin-top:1px"></i>
        <div style="font-size:13px;color:var(--blue-dark)">
          ${isDoctor
            ? 'Click <strong>Start session</strong> — the video call opens in a new browser tab. Share the <strong>Join link</strong> with your patient if needed.'
            : 'Click <strong>Join session</strong> at your scheduled time. The video call opens in a new browser tab — no app download or account needed.'}
        </div>
      </div>
    </div>

    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div class="card-title" style="margin:0"><i class="ti ti-calendar-event"></i>Sessions</div>
        <button class="btn btn-xs" onclick="_loadTeleSessions(${isDoctor})">
          <i class="ti ti-refresh"></i>Refresh
        </button>
      </div>
      <div id="tele-list"><div style="color:var(--text-muted);padding:16px">Loading…</div></div>
    </div>`;
};

async function _loadTeleSessions(isDoctor) {
  const wrap = document.getElementById('tele-list');
  if (!wrap) return;

  try {
    let appts = [];
    if (isDoctor) {
      // Doctors see all telemedicine appointments
      const res = await API.appointments.list({ visitType: 'telemedicine', limit: 50 });
      appts = res.data || [];
    } else {
      // Patients see their own telemedicine appointments
      const patRes = await API._fetchDirect('/patients/me', { method: 'GET' });
      const p = patRes?.data;
      if (!p) { wrap.innerHTML = '<p style="color:var(--text-muted)">No patient record found.</p>'; return; }
      const res = await API.appointments.list({ patient: p._id, limit: 50 });
      appts = (res.data || []).filter(a =>
        ['telemedicine', 'video'].includes((a.visitType || '').toLowerCase())
      );
    }

    if (!appts.length) {
      wrap.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--text-muted)">
          <i class="ti ti-video-off" style="font-size:44px;opacity:.25;display:block;margin-bottom:12px"></i>
          <div style="font-weight:500;margin-bottom:8px">No telemedicine sessions</div>
          ${!isDoctor ? `<button class="btn btn-green" onclick="Router.setPage('book')"><i class="ti ti-plus"></i>Book a telemedicine visit</button>` : ''}
        </div>`;
      return;
    }

    appts.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    wrap.innerHTML = appts.map(a => {
      const when    = new Date(a.scheduledAt);
      const now     = new Date();
      const isLive  = a.status === 'in_progress';
      const isPast  = when < now && !isLive;
      const isSoon  = !isPast && (when - now) < 30 * 60 * 1000;
      const canJoin = !['cancelled', 'completed'].includes(a.status);
      const canAct  = ['confirmed', 'pending'].includes(a.status) && !isPast;

      const badge = {
        confirmed: 'badge-green', pending: 'badge-amber',
        in_progress: 'badge-blue', completed: 'badge-gray', cancelled: 'badge-gray'
      }[a.status] || 'badge-gray';

      const other = isDoctor
        ? `${a.patient?.firstName || ''} ${a.patient?.lastName || ''}`.trim() || 'Patient'
        : `Dr. ${a.doctor?.firstName || ''} ${a.doctor?.lastName || ''}`.trim() || 'Doctor';

      // Build Jitsi URL directly on the frontend — no backend call needed to get the URL
      const roomName = `nihms-${String(a._id).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
      const userName = encodeURIComponent(API.getStoredUser()?.firstName + ' ' + API.getStoredUser()?.lastName);
      const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${userName}"&config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.disableDeepLinking=true`;

      return `
        <div style="padding:16px;margin-bottom:10px;border-radius:var(--radius-lg);
          border:2px solid ${isLive ? 'var(--green)' : isSoon ? 'var(--amber-mid)' : 'var(--border)'};
          background:${isLive ? 'var(--green-light)' : isSoon ? 'var(--amber-light)' : 'var(--bg-card)'}">

          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
                <div style="font-weight:700;font-size:15px">${other}</div>
                ${isLive ? '<span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:var(--green);color:#fff">● Live now</span>' : ''}
                ${isSoon && !isLive ? '<span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:var(--amber);color:#fff">Starting soon</span>' : ''}
                <span class="badge ${badge}">${a.status}</span>
              </div>
              <div style="font-size:13px;color:var(--text-muted);margin-bottom:2px">${a.reason || 'Telemedicine consultation'}</div>
              <div style="font-size:12px;color:var(--text-muted)">
                📅 ${when.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                &nbsp;🕐 ${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                &nbsp;🎫 Token: <strong style="font-family:var(--mono)">${a.queueToken || '—'}</strong>
              </div>
              ${a.rescheduleReason ? `<div style="font-size:11px;color:var(--text-hint);margin-top:4px">↩ Rescheduled: ${a.rescheduleReason}</div>` : ''}
            </div>

            <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;flex-shrink:0">
              ${canJoin ? `
                <button class="btn btn-green"
                  onclick="window.open('${jitsiUrl}','_blank','noopener');_markInProgress('${a._id}',this)"
                  style="font-size:14px;padding:9px 18px">
                  <i class="ti ti-video"></i>${isLive ? 'Rejoin session' : 'Start / Join session'}
                </button>
                <div style="font-size:11px;color:var(--text-muted);text-align:right">
                  <a href="${jitsiUrl}" target="_blank" style="color:var(--green-dark);text-decoration:none">
                    <i class="ti ti-link" style="font-size:11px"></i> Share join link
                  </a>
                </div>` : ''}
              <div style="display:flex;gap:6px">
                ${canAct && isDoctor ? `
                  <button class="btn btn-xs" onclick="_docReschedule('${a._id}','${a.visitType}','${new Date(a.scheduledAt).toISOString().slice(0, 16)}')">
                    <i class="ti ti-calendar-event"></i>Reschedule
                  </button>` : ''}
                ${canAct ? `
                  <button class="btn btn-xs" style="color:var(--red);border-color:var(--red-mid)"
                    onclick="${isDoctor ? `_docCancelAppt('${a._id}')` : `_showCancelAppt('${a._id}')`}">
                    <i class="ti ti-x"></i>Cancel
                  </button>` : ''}
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

  } catch (e) {
    wrap.innerHTML = `<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`;
  }
}

/* Mark appointment as in_progress when doctor starts the call */
window._markInProgress = async (apptId, btn) => {
  try {
    await API._fetchDirect(`/appointments/${apptId}/join`, { method: 'GET' });
    // Refresh list after a moment so status updates
    setTimeout(() => {
      const user = API.getStoredUser();
      _loadTeleSessions(['doctor','nurse','admin'].includes(user?.role));
    }, 2000);
  } catch (e) {
    // Non-fatal — the Jitsi window already opened
    console.warn('Could not update appointment status:', e.message);
  }
};

/* Patient cancel fallback */
window._showCancelAppt = window._showCancelAppt || function(id) {
  const reason = prompt('Reason for cancellation:') ?? '';
  if (reason === null) return;
  API.appointments.cancel(id, reason)
    .then(() => {
      UI.showToast('Cancelled — notifications sent', 'ok');
      const user = API.getStoredUser();
      _loadTeleSessions(['doctor','nurse','admin'].includes(user?.role));
    })
    .catch(e => UI.showToast(e.message || 'Could not cancel', 'err'));
};
