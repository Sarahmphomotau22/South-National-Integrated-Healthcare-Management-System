/**
 * js/pages/telemedicine.js
 * Telemedicine powered by Daily.co — works for doctors and patients.
 * No WebRTC code needed — Daily handles everything via iframe embed.
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ══════════════════════════════
   SESSION LIST PAGE
══════════════════════════════ */
Pages['telemedicine'] = () => {
  const user     = API.getStoredUser();
  const isDoctor = ['doctor','nurse','admin'].includes(user?.role);

  setTimeout(() => _loadTeleSessions(isDoctor), 0);

  return `
    <div class="page-title">Telemedicine sessions</div>

    <div class="alert-box alert-info" style="margin-bottom:16px">
      <i class="ti ti-video"></i>
      ${isDoctor
        ? 'Click <strong>Start session</strong> to open the video call. Your patient will join via their link.'
        : 'Click <strong>Join session</strong> at your scheduled time. Allow camera and microphone access when prompted. No app download needed.'}
    </div>

    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div class="card-title" style="margin:0"><i class="ti ti-calendar-event"></i>Your sessions</div>
        <button class="btn btn-xs" onclick="_loadTeleSessions(${isDoctor})"><i class="ti ti-refresh"></i>Refresh</button>
      </div>
      <div id="tele-list" style="color:var(--text-muted);padding:16px">Loading…</div>
    </div>

    <!-- Video call overlay (injected when joining) -->
    <div id="tele-overlay" style="display:none;position:fixed;inset:0;background:#111;z-index:9999;flex-direction:column"></div>`;
};

async function _loadTeleSessions(isDoctor) {
  const wrap = document.getElementById('tele-list');
  if (!wrap) return;
  wrap.innerHTML = '<div style="color:var(--text-muted);padding:16px">Loading…</div>';

  try {
    let appts = [];
    if (isDoctor) {
      const res = await API.appointments.list({ visitType:'telemedicine', limit:20 });
      appts = res.data || [];
    } else {
      const patRes = await API._fetchDirect('/patients/me', { method:'GET' });
      const p = patRes.data;
      if (p) {
        const res = await API.appointments.list({ patient: p._id, limit:30 });
        appts = (res.data||[]).filter(a => a.visitType === 'telemedicine');
      }
    }

    if (!appts.length) {
      wrap.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted)">
        <i class="ti ti-video-off" style="font-size:40px;opacity:.3;display:block;margin-bottom:10px"></i>
        No telemedicine sessions found.
        ${!isDoctor ? '<br><button class="btn btn-green" style="margin-top:12px" onclick="Router.setPage(\'book\')"><i class="ti ti-plus"></i>Book telemedicine visit</button>' : ''}
      </div>`;
      return;
    }

    // Sort: upcoming first, then past
    appts.sort((a,b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    wrap.innerHTML = appts.map(a => {
      const when      = new Date(a.scheduledAt);
      const now       = new Date();
      const isPast    = when < now && a.status !== 'in_progress';
      const isLive    = a.status === 'in_progress';
      const isSoon    = !isPast && (when - now) < 30 * 60 * 1000;
      const canJoin   = !['cancelled','completed'].includes(a.status);
      const canCancel = ['confirmed','pending'].includes(a.status) && !isPast;

      const badge = {
        confirmed:'badge-green', pending:'badge-amber',
        in_progress:'badge-blue', completed:'badge-gray', cancelled:'badge-gray'
      }[a.status] || 'badge-gray';

      const other = isDoctor
        ? `${a.patient?.firstName||''} ${a.patient?.lastName||''}`
        : `Dr. ${a.doctor?.firstName||''} ${a.doctor?.lastName||''}`;

      return `
        <div style="padding:14px;margin-bottom:8px;border-radius:var(--radius-lg);border:1px solid ${isLive?'var(--green)':isSoon?'var(--amber-mid)':'var(--border)'};background:${isLive?'var(--green-light)':isSoon?'var(--amber-light)':'var(--bg-card)'}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
            <div>
              <div style="font-weight:600;font-size:14px;margin-bottom:3px">
                ${other}
                ${isLive ? '<span style="font-size:11px;font-weight:500;padding:2px 8px;border-radius:20px;background:var(--green);color:#fff;margin-left:8px;animation:pulse 2s infinite">● Live</span>' : ''}
                ${isSoon && !isLive ? '<span style="font-size:11px;font-weight:500;padding:2px 8px;border-radius:20px;background:var(--amber-light);color:var(--amber);margin-left:8px">Starting soon</span>' : ''}
              </div>
              <div style="font-size:12px;color:var(--text-muted)">${a.reason || 'Telemedicine consultation'}</div>
              <div style="font-size:12px;color:var(--text-muted)">
                ${when.toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
                at ${when.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                &nbsp;·&nbsp; Token: <strong style="font-family:var(--mono)">${a.queueToken||'—'}</strong>
              </div>
              ${a.facility?.name ? `<div style="font-size:12px;color:var(--text-muted)">${a.facility.name}</div>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex-shrink:0">
              <span class="badge ${badge}">${a.status}</span>
              ${canJoin ? `
                <button class="btn btn-sm btn-green" onclick="_joinDailySession('${a._id}')">
                  <i class="ti ti-video"></i>${isLive ? 'Rejoin' : isSoon ? 'Join now' : 'Start session'}
                </button>` : ''}
              ${canCancel ? `
                <button class="btn btn-sm" style="color:var(--red);border-color:var(--red-mid)" onclick="_cancelTeleSession('${a._id}',this)">
                  <i class="ti ti-x"></i>Cancel
                </button>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');
  } catch(e) {
    wrap.innerHTML = `<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`;
  }
}

/* ══════════════════════════════
   JOIN SESSION (Daily.co)
══════════════════════════════ */
window._joinDailySession = async (appointmentId) => {
  const btn = event?.target?.closest('button');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="ti ti-loader-2"></i> Joining…'; }

  try {
    const res  = await API._fetchDirect(`/appointments/${appointmentId}/join`, { method:'GET' });
    const data = res.data;

    if (res.provider === 'none' || !data.roomUrl) {
      _showDailySetupInstructions();
      if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-video"></i>Start session'; }
      return;
    }

    if (res.provider === 'daily_error') {
      UI.showToast('Daily.co error — see setup guide', 'err');
      _showDailyError(res.message);
      if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-video"></i>Start session'; }
      return;
    }

    // Open Daily.co video call
    _openDailyCall(data);
  } catch(e) {
    UI.showToast(e.message || 'Could not join session', 'err');
    if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-video"></i>Start session'; }
  }
};

function _openDailyCall(session) {
  const overlay = document.getElementById('tele-overlay');
  if (!overlay) return;

  const user   = API.getStoredUser();
  const isDoc  = session.isDoctor;
  const other  = isDoc
    ? `${session.patient?.firstName||''} ${session.patient?.lastName||''}`
    : `Dr. ${session.doctor?.firstName||''} ${session.doctor?.lastName||''}`;

  const when = new Date(session.scheduledAt);

  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <style>
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
      #daily-frame{width:100%;height:100%;border:none}
    </style>

    <!-- Top bar -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#1a1a1a;flex-shrink:0;gap:12px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-weight:600;color:#fff;font-size:14px">
          <span style="color:var(--green-mid)">NIHMS</span> · Telemedicine
        </div>
        <div style="width:8px;height:8px;border-radius:50%;background:#1D9E75;animation:pulse 2s infinite"></div>
        <span style="color:#888;font-size:12px" id="daily-status">Connecting…</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="text-align:right">
          <div style="color:#ccc;font-size:13px;font-weight:500">${other}</div>
          <div style="color:#888;font-size:11px">${when.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · Token: <span style="font-family:monospace;color:var(--green-mid)">${session.queueToken||'—'}</span></div>
        </div>
        <button onclick="_endDailyCall('${session.roomId||''}')" style="background:#c0392b;border:none;border-radius:var(--radius);padding:7px 14px;color:#fff;cursor:pointer;font-size:13px;font-weight:500;display:flex;align-items:center;gap:6px">
          <i class="ti ti-phone-off"></i>End call
        </button>
      </div>
    </div>

    <!-- Daily.co iframe (handles all video/audio) -->
    <iframe
      id="daily-frame"
      src="${session.roomUrl}?t=${session.meetingToken}&userName=${encodeURIComponent(user?.firstName+' '+user?.lastName)}"
      allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
      allowfullscreen
    ></iframe>`;

  // Listen for Daily.co postMessage events
  window.addEventListener('message', _handleDailyMessage);

  // Update status after 3 seconds
  setTimeout(() => {
    const st = document.getElementById('daily-status');
    if (st) st.textContent = 'In session';
  }, 3000);
}

function _handleDailyMessage(event) {
  if (!event.data?.action) return;
  const { action } = event.data;
  if (action === 'left-meeting' || action === 'error') {
    _endDailyCall();
  }
}

window._endDailyCall = async (roomId) => {
  window.removeEventListener('message', _handleDailyMessage);
  const overlay = document.getElementById('tele-overlay');
  if (overlay) { overlay.style.display = 'none'; overlay.innerHTML = ''; }
  UI.showToast('Session ended', 'ok');
  // Refresh the session list
  const user = API.getStoredUser();
  _loadTeleSessions(['doctor','nurse','admin'].includes(user?.role));
};

/* ── Cancel session ── */
window._cancelTeleSession = async (id, btn) => {
  const reason = prompt('Reason for cancellation (optional — leave blank to skip):');
  if (reason === null) return;
  if (btn) { btn.disabled=true; btn.innerHTML='Cancelling…'; }
  try {
    await API._fetchDirect(`/appointments/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason })
    });
    UI.showToast('Session cancelled — notification sent to both parties', 'ok');
    const user = API.getStoredUser();
    _loadTeleSessions(['doctor','nurse','admin'].includes(user?.role));
  } catch(e) {
    UI.showToast(e.message || 'Could not cancel', 'err');
    if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-x"></i>Cancel'; }
  }
};

/* ── Show Daily.co specific error ── */
function _showDailyError(message) {
  const overlay = document.getElementById('tele-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#1a1a1a;flex-shrink:0">
      <div style="color:#fff;font-weight:600"><span style="color:var(--green-mid)">NIHMS</span> · Telemedicine Error</div>
      <button onclick="document.getElementById('tele-overlay').style.display='none'" style="background:transparent;border:1px solid #555;border-radius:6px;padding:5px 12px;color:#ccc;cursor:pointer"><i class="ti ti-x"></i> Close</button>
    </div>
    <div style="flex:1;padding:32px;max-width:560px;margin:0 auto;color:#ccc">
      <div style="background:#FCEBEB;border-radius:10px;padding:16px;margin-bottom:20px;border-left:4px solid #E24B4A">
        <div style="font-weight:600;color:#A32D2D;margin-bottom:4px">Daily.co connection error</div>
        <div style="font-size:13px;color:#A32D2D">${message}</div>
      </div>
      <div style="font-size:14px;font-weight:600;color:#fff;margin-bottom:12px">How to fix:</div>
      <div style="font-size:13px;color:#aaa;line-height:1.8">
        <div style="margin-bottom:8px"><strong style="color:#fff">1.</strong> Go to <a href="https://dashboard.daily.co" target="_blank" style="color:var(--green-mid)">dashboard.daily.co</a></div>
        <div style="margin-bottom:8px"><strong style="color:#fff">2.</strong> Click <strong style="color:#fff">Developers</strong> → copy your <strong style="color:#fff">API key</strong></div>
        <div style="margin-bottom:8px"><strong style="color:#fff">3.</strong> Open <code style="background:#2a2a2a;padding:2px 6px;border-radius:4px">backend/.env</code> and set:</div>
        <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:12px;font-family:monospace;font-size:13px;line-height:1.8;margin-bottom:8px">
          DAILY_API_KEY=paste_your_key_here<br>DAILY_DOMAIN=yourname.daily.co
        </div>
        <div><strong style="color:#fff">4.</strong> Restart backend: <code style="background:#2a2a2a;padding:2px 6px;border-radius:4px">npm run dev</code></div>
      </div>
    </div>`;
}

/* ── Setup instructions when Daily.co not configured ── */
function _showDailySetupInstructions() {
  const overlay = document.getElementById('tele-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#1a1a1a;flex-shrink:0">
      <div style="color:#fff;font-weight:600"><span style="color:var(--green-mid)">NIHMS</span> · Telemedicine Setup</div>
      <button onclick="document.getElementById('tele-overlay').style.display='none'" style="background:transparent;border:1px solid #555;border-radius:6px;padding:5px 12px;color:#ccc;cursor:pointer">
        <i class="ti ti-x"></i> Close
      </button>
    </div>
    <div style="flex:1;overflow-y:auto;padding:32px;max-width:600px;margin:0 auto;color:#ccc">
      <div style="font-size:22px;font-weight:600;color:#fff;margin-bottom:8px">Set up video calls (5 minutes)</div>
      <div style="font-size:14px;color:#888;margin-bottom:28px">Daily.co is free, HIPAA-compliant, and works in any browser with no app download.</div>

      ${[
        ['1','Sign up free at Daily.co','Go to <a href="https://dashboard.daily.co" target="_blank" style="color:var(--green-mid)">dashboard.daily.co</a> — no credit card needed. Free plan includes 2,000 minutes/month.'],
        ['2','Copy your API key','Dashboard → <strong>Developers</strong> → copy the <strong>API key</strong>'],
        ['3','Note your domain','Dashboard → top of page → copy your domain e.g. <code style="background:#2a2a2a;padding:2px 6px;border-radius:4px">yourname.daily.co</code>'],
        ['4','Add to your .env file','Open <code style="background:#2a2a2a;padding:2px 6px;border-radius:4px">backend/.env</code> in Notepad and add:<br><br><div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:12px;font-family:monospace;font-size:13px;line-height:1.8">DAILY_API_KEY=your_api_key_here<br>DAILY_DOMAIN=yourname.daily.co</div>'],
        ['5','Restart the backend','In PowerShell: <code style="background:#2a2a2a;padding:2px 6px;border-radius:4px">npm run dev</code>'],
        ['6','Done!','Click "Start session" on any telemedicine appointment. Both doctor and patient get a private video call link with camera, microphone, chat, and screen sharing.']
      ].map(([n,title,desc]) => `
        <div style="display:flex;gap:14px;margin-bottom:20px">
          <div style="width:28px;height:28px;border-radius:50%;background:var(--green-dark);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;margin-top:2px">${n}</div>
          <div>
            <div style="font-size:14px;font-weight:600;color:#fff;margin-bottom:4px">${title}</div>
            <div style="font-size:13px;color:#888;line-height:1.6">${desc}</div>
          </div>
        </div>`).join('')}

      <div style="background:#0F6E56;border-radius:10px;padding:16px;margin-top:8px">
        <div style="font-weight:600;color:#fff;margin-bottom:4px">✅ Why Daily.co for NIHMS?</div>
        <div style="font-size:13px;color:rgba(255,255,255,.8);line-height:1.7">
          HIPAA-compliant · End-to-end encrypted · No app download for patients ·
          Works on any device · Free tier: 2,000 minutes/month · Up to 200 participants per room
        </div>
      </div>
    </div>`;
}
