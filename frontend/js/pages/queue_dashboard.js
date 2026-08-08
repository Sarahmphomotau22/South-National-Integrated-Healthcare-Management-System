/**
 * Queue Dashboard pages — Doctor + Patient views
 * Matches the wireframe designs exactly
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ══════════════════════════════════════════════
   DOCTOR DASHBOARD (queue page)
══════════════════════════════════════════════ */
Pages['queue'] = () => {
  setTimeout(() => _loadDoctorQueue(), 0);
  return `
  <div id="doctor-dash">
    <!-- Doctor header -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:44px;height:44px;border-radius:50%;background:var(--green-light);color:var(--green-dark);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px" id="doc-initials">DM</div>
        <div>
          <div style="font-weight:600;font-size:15px" id="doc-name">Loading…</div>
          <div style="font-size:12px;color:var(--text-muted)" id="doc-sub">—</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" onclick="Router.setPage('telemedicine')"><i class="ti ti-video"></i>Start telemedicine ↗</button>
        <button class="btn" onclick="_showHandover()"><i class="ti ti-clipboard-list"></i>Handover</button>
        <button class="btn btn-xs" style="padding:7px 10px" onclick="_loadDoctorQueue()"><i class="ti ti-refresh"></i></button>
      </div>
    </div>

    <!-- Stats row -->
    <div class="metric-grid metric-grid-4" style="margin-bottom:20px">
      <div class="metric-card"><div class="metric-label">In queue</div><div class="metric-value" id="stat-queue">—</div></div>
      <div class="metric-card"><div class="metric-label">Seen today</div><div class="metric-value" id="stat-seen">—</div></div>
      <div class="metric-card"><div class="metric-label">Pending results</div><div class="metric-value" id="stat-results">—</div></div>
      <div class="metric-card"><div class="metric-label">Avg wait</div><div class="metric-value" id="stat-wait">—</div></div>
    </div>

    <!-- Queue + Active patient -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">

      <!-- Today's queue -->
      <div class="card" style="margin-bottom:0">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div class="card-title" style="margin:0"><i class="ti ti-users"></i>Today's queue</div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-xs" onclick="_showWalkIn()" title="Add walk-in"><i class="ti ti-user-plus"></i>Walk-in</button>
          </div>
        </div>
        <div id="queue-list" style="color:var(--text-muted);font-size:13px">Loading queue…</div>
      </div>

      <!-- Active patient panel -->
      <div class="card" style="margin-bottom:0" id="active-patient-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div class="card-title" style="margin:0"><i class="ti ti-user"></i>Active patient</div>
          <span class="badge badge-green" id="active-status" style="display:none">In consultation</span>
        </div>
        <div id="active-patient-body" style="color:var(--text-muted);font-size:13px;text-align:center;padding:24px 0">
          <i class="ti ti-user-off" style="font-size:36px;opacity:.3;display:block;margin-bottom:8px"></i>
          Select a patient from the queue to begin consultation
        </div>
      </div>
    </div>
  </div>

  <!-- Triage modal -->
  <div id="triage-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:center;justify-content:center">
    <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:440px;max-width:95vw;box-shadow:var(--shadow-md)">
      <div style="font-size:16px;font-weight:600;margin-bottom:4px">Triage patient</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px" id="triage-patient-name">—</div>
      <div class="f-group">
        <label class="f-label">Triage level <span style="color:var(--red)">*</span></label>
        <div style="display:flex;flex-direction:column;gap:8px" id="triage-levels">
          ${[
            [1,'Immediate (Red)','#E24B4A','Life-threatening — see immediately'],
            [2,'Urgent (Orange)','#EF9F27','Serious — see within 10 minutes'],
            [3,'Semi-urgent (Yellow)','#D4AC0D','Moderate — see within 30 minutes'],
            [4,'Non-urgent (Green)','#1D9E75','Stable — see within 60 minutes'],
            [5,'Minor (Blue)','#185FA5','Minor — see within 4 hours']
          ].map(([lvl,label,color,desc]) => `
            <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--radius);border:1px solid var(--border);cursor:pointer;transition:all .15s" id="tl-${lvl}">
              <input type="radio" name="triage-level" value="${lvl}" style="accent-color:${color}">
              <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
              <div>
                <div style="font-size:13px;font-weight:500">${label}</div>
                <div style="font-size:11px;color:var(--text-muted)">${desc}</div>
              </div>
            </label>`).join('')}
        </div>
      </div>
      <div class="f-group" style="margin-top:12px">
        <label class="f-label">Chief complaint</label>
        <input class="f-input" id="triage-complaint" placeholder="Patient's main complaint…">
      </div>
      <div class="f-group">
        <label class="f-label">Notes</label>
        <textarea class="f-textarea" id="triage-notes" style="height:60px" placeholder="Additional triage notes…"></textarea>
      </div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-green" onclick="_submitTriage()"><i class="ti ti-check"></i>Submit triage</button>
        <button class="btn" onclick="_closeTriage()">Cancel</button>
      </div>
    </div>
  </div>`;
};

/* ── Load doctor queue ── */
async function _loadDoctorQueue() {
  const user = API.getStoredUser();
  if (!user) return;

  // Update header
  const nameEl = document.getElementById('doc-name');
  const subEl  = document.getElementById('doc-sub');
  const init   = document.getElementById('doc-initials');
  if (nameEl) nameEl.textContent = `Dr. ${user.firstName} ${user.lastName} · General Practice`;
  if (subEl)  subEl.textContent  = `${user.facilityName} · Shift ends 17:00`;
  if (init)   init.textContent   = (user.firstName[0]+user.lastName[0]).toUpperCase();

  // Load queue + stats
  try {
    const facilityId = user.facilityId;
    const today = new Date().toISOString().slice(0,10);

    const [queueRes, statsRes, labRes] = await Promise.all([
      API._fetchDirect(`/queue?facility=${facilityId}&date=${today}`, { method:'GET' }),
      API._fetchDirect(`/queue/stats?facility=${facilityId}&date=${today}`, { method:'GET' }),
      API.labs.list({ facility: facilityId, status:'ordered', limit:50 })
    ]);

    const stats = statsRes.data || {};
    _setEl('stat-queue',   stats.waiting    ?? '—');
    _setEl('stat-seen',    stats.completed  ?? '—');
    _setEl('stat-results', labRes.meta?.total ?? '—');
    _setEl('stat-wait',    (statsRes.stats?.avgWaitMins ?? 0) + ' min');

    _renderQueueList(queueRes.data || []);
  } catch(e) {
    const ql = document.getElementById('queue-list');
    if (ql) ql.innerHTML = `<div class="alert-box alert-danger" style="margin:0"><i class="ti ti-alert-circle"></i>${e.message}</div>`;
  }
}

function _setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _renderQueueList(appts) {
  const wrap = document.getElementById('queue-list');
  if (!wrap) return;

  if (!appts.length) {
    wrap.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted)">
      <i class="ti ti-users" style="font-size:32px;opacity:.3;display:block;margin-bottom:8px"></i>No patients in queue today
    </div>`;
    return;
  }

  wrap.innerHTML = appts.map(a => {
    const p         = a.patient || {};
    const waitMins  = Math.max(0, Math.floor((Date.now() - new Date(a.scheduledAt)) / 60000));
    const isActive  = a.status === 'in_progress';
    const isPriority= a.priority;
    const isWalkIn  = a.isWalkIn;
    const tLabel    = a.triageLabel || '';

    const tagHtml = isPriority
      ? `<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;background:#FCEBEB;color:#A32D2D">${a.triageLevel===1?'Emergency':'Priority'}</span>`
      : isWalkIn
      ? `<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;background:#E6F1FB;color:#185FA5">Walk-in</span>`
      : '';

    return `
      <div onclick="_selectPatient('${a._id}')" style="
        display:flex;align-items:center;gap:10px;padding:9px 10px;
        border-radius:var(--radius);cursor:pointer;transition:all .12s;
        margin-bottom:4px;border:1px solid ${isActive?'var(--green)':'transparent'};
        background:${isActive?'var(--green-light)':'transparent'};
      " onmouseover="this.style.background='var(--bg-surface)'" onmouseout="this.style.background='${isActive?'var(--green-light)':'transparent'}'">
        <div style="
          min-width:42px;font-size:11px;font-weight:700;font-family:var(--mono);
          color:${isPriority?'#A32D2D':isActive?'var(--green-dark)':'var(--text-muted)'};
          background:${isPriority?'#FCEBEB':isActive?'var(--green-light)':'var(--bg-surface)'};
          padding:3px 6px;border-radius:6px;text-align:center
        ">${a.queueToken||'—'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${p.firstName||''} ${p.lastName||''}
          </div>
          <div style="font-size:11px;color:var(--text-muted)">${a.reason||a.visitType||'consultation'}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
          ${tagHtml}
          <span style="font-size:11px;color:${waitMins>30?'var(--coral)':'var(--text-muted)'}">${waitMins} min</span>
        </div>
      </div>`;
  }).join('');
}

let _selectedApptId = null;

async function _selectPatient(apptId) {
  _selectedApptId = apptId;
  const body = document.getElementById('active-patient-body');
  const stat = document.getElementById('active-status');
  if (body) body.innerHTML = `<div style="padding:16px;color:var(--text-muted)">Loading patient…</div>`;
  if (stat) stat.style.display = 'none';

  try {
    const res   = await API._fetchDirect(`/appointments/${apptId}`, { method:'GET' });
    const appt  = res.data;
    const p     = appt.patient || {};
    const dob   = p.dateOfBirth ? new Date(p.dateOfBirth) : null;
    const age   = dob ? Math.floor((Date.now()-dob.getTime())/(365.25*24*60*60*1000)) : '?';
    const dobStr= dob ? dob.toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}) : '—';
    const conds = (p.conditions||[]).filter(c=>c.status==='active'||c.status==='monitored');
    const meds  = []; // would come from prescriptions in full impl

    if (stat) { stat.style.display='inline-flex'; stat.textContent = appt.status === 'in_progress' ? 'In consultation' : appt.status; }

    if (body) body.innerHTML = `
      <!-- Patient header -->
      <div style="margin-bottom:14px">
        <div style="font-weight:600;font-size:15px;margin-bottom:2px">${p.firstName||''} ${p.lastName||''}</div>
        <div style="font-size:12px;color:var(--text-muted)">DOB: ${dobStr} (${age}) &nbsp;|&nbsp; ID: ${p.nationalId?p.nationalId.slice(0,6)+'****':'—'}</div>
        <div style="font-size:12px;color:var(--text-muted)">Blood type: ${p.bloodType||'—'} &nbsp;|&nbsp;
          ${(p.allergies||[]).length ? `<span style="color:var(--red)">Allergies: ${p.allergies.join(', ')}</span>` : 'No known allergies'}
        </div>
      </div>

      <!-- Conditions -->
      ${conds.length ? `
        <div style="margin-bottom:12px">
          <div style="font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-hint);margin-bottom:6px">Chronic conditions</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${conds.map(c=>`<span class="badge badge-amber">${c.name}</span>`).join('')}
          </div>
        </div>` : ''}

      <!-- Vitals if triaged -->
      ${appt.vitals ? `
        <div style="margin-bottom:12px">
          <div style="font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-hint);margin-bottom:6px">Triage vitals</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${appt.vitals.bp?`<span style="font-size:12px;background:var(--bg-surface);padding:3px 8px;border-radius:6px">BP: ${appt.vitals.bp.systolic}/${appt.vitals.bp.diastolic}</span>`:''}
            ${appt.vitals.heartRate?`<span style="font-size:12px;background:var(--bg-surface);padding:3px 8px;border-radius:6px">HR: ${appt.vitals.heartRate}</span>`:''}
            ${appt.vitals.temperature?`<span style="font-size:12px;background:var(--bg-surface);padding:3px 8px;border-radius:6px">Temp: ${appt.vitals.temperature}°C</span>`:''}
            ${appt.vitals.spO2?`<span style="font-size:12px;background:var(--bg-surface);padding:3px 8px;border-radius:6px">SpO2: ${appt.vitals.spO2}%</span>`:''}
          </div>
        </div>` : ''}

      <!-- Chief complaint -->
      ${appt.chiefComplaint ? `
        <div style="margin-bottom:14px;padding:10px;background:var(--bg-surface);border-radius:var(--radius);border-left:3px solid var(--green)">
          <div style="font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-hint);margin-bottom:3px">Chief complaint</div>
          <div style="font-size:13px">${appt.chiefComplaint}</div>
        </div>` : ''}

      <!-- Actions -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
        <button class="btn btn-green btn-sm" onclick="_callPatient('${apptId}')"><i class="ti ti-bell"></i>Call patient</button>
        <button class="btn btn-sm" onclick="_openTriage('${apptId}','${p.firstName} ${p.lastName}')"><i class="ti ti-heartbeat"></i>Triage</button>
        <button class="btn btn-sm" onclick="Router.setPage('consult')"><i class="ti ti-stethoscope"></i>New prescription ↗</button>
        <button class="btn btn-sm" onclick="Router.setPage('lab')"><i class="ti ti-flask"></i>Order lab ↗</button>
        <button class="btn btn-sm" onclick="UI.showToast('Referral form opened','ok')"><i class="ti ti-share"></i>Refer ↗</button>
      </div>`;
  } catch(e) {
    if (body) body.innerHTML = `<div class="alert-box alert-danger" style="margin:0"><i class="ti ti-alert-circle"></i>${e.message}</div>`;
  }
}

async function _callPatient(apptId) {
  const room = prompt('Which room? (e.g. Consulting Room 3)') || 'the consultation room';
  try {
    await API._fetchDirect(`/queue/${apptId}/call`, { method:'PATCH', body: JSON.stringify({ room }) });
    UI.showToast(`Patient called to ${room} — SMS sent`, 'ok');
    _loadDoctorQueue();
  } catch(e) { UI.showToast(e.message||'Could not call patient','err'); }
}

/* ── Triage modal ── */
let _triageApptId = null;
function _openTriage(apptId, name) {
  _triageApptId = apptId;
  const nameEl = document.getElementById('triage-patient-name');
  if (nameEl) nameEl.textContent = name;
  const modal = document.getElementById('triage-modal');
  if (modal) modal.style.display = 'flex';
}
function _closeTriage() {
  const modal = document.getElementById('triage-modal');
  if (modal) modal.style.display = 'none';
}
async function _submitTriage() {
  const level     = document.querySelector('input[name="triage-level"]:checked')?.value;
  const complaint = document.getElementById('triage-complaint')?.value?.trim();
  const notes     = document.getElementById('triage-notes')?.value?.trim();
  if (!level) { UI.showToast('Please select a triage level','err'); return; }
  try {
    await API._fetchDirect('/queue/triage', {
      method: 'POST',
      body: JSON.stringify({ appointmentId: _triageApptId, triageLevel: +level, chiefComplaint: complaint, notes })
    });
    _closeTriage();
    UI.showToast('Triage saved — queue reordered','ok');
    _loadDoctorQueue();
    if (_selectedApptId === _triageApptId) _selectPatient(_triageApptId);
  } catch(e) { UI.showToast(e.message||'Triage failed','err'); }
}

function _showHandover() {
  UI.showToast('Handover notes — coming soon','ok');
}

/* ── Walk-in ── */
function _showWalkIn() {
  UI.showToast('Walk-in registration — use the Nurse registration screen','ok');
}

/* ═══════════════════════════════════════════════
   PATIENT HOME DASHBOARD
═══════════════════════════════════════════════ */
Pages['myhealth'] = () => {
  const user = API.getStoredUser();
  const greetHour = new Date().getHours();
  const greet = greetHour < 12 ? 'Good morning' : greetHour < 17 ? 'Good afternoon' : 'Good evening';

  setTimeout(() => _loadPatientHome(), 0);

  return `
  <div id="patient-home">
    <div class="page-title">${greet}, ${user?.firstName||''}!</div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">

      <!-- HOME card -->
      <div class="card" style="margin-bottom:0">
        <div class="card-title"><i class="ti ti-home"></i>Home</div>
        <div id="ph-greeting" style="background:var(--bg-surface);border-radius:var(--radius);padding:12px;margin-bottom:14px">
          <div style="font-size:12px;color:var(--text-muted)">${greet}</div>
          <div style="font-weight:600;font-size:15px" id="ph-name">—</div>
          <div style="font-size:12px;color:var(--text-muted)" id="ph-id">ID: —</div>
        </div>

        <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px">Quick actions</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
          <button onclick="Router.setPage('book')" style="padding:12px 8px;border-radius:var(--radius);border:1px solid var(--border);background:var(--blue-light);color:var(--blue);cursor:pointer;font-size:13px;font-weight:500;display:flex;flex-direction:column;align-items:center;gap:6px">
            <i class="ti ti-calendar-plus" style="font-size:20px"></i>Book appt
          </button>
          <button onclick="Router.setPage('telemedicine')" style="padding:12px 8px;border-radius:var(--radius);border:1px solid var(--border);background:var(--green-light);color:var(--green-dark);cursor:pointer;font-size:13px;font-weight:500;display:flex;flex-direction:column;align-items:center;gap:6px">
            <i class="ti ti-video" style="font-size:20px"></i>See doctor
          </button>
          <button onclick="Router.setPage('myrecords');setTimeout(function(){window._mrTab&&_mrTab(3);},400)" style="padding:12px 8px;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg-surface);cursor:pointer;font-size:13px;font-weight:500;display:flex;flex-direction:column;align-items:center;gap:6px">
            <i class="ti ti-pill" style="font-size:20px;color:var(--coral)"></i>Medications
          </button>
          <button onclick="Router.setPage('myrecords')" style="padding:12px 8px;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg-surface);cursor:pointer;font-size:13px;font-weight:500;display:flex;flex-direction:column;align-items:center;gap:6px">
            <i class="ti ti-clipboard-list" style="font-size:20px;color:var(--blue)"></i>My records
          </button>
        </div>

        <div id="ph-next-appt" style="background:var(--amber-light);border-radius:var(--radius);padding:12px">
          <div style="font-size:11px;font-weight:600;color:var(--amber);margin-bottom:4px">Next appointment</div>
          <div style="font-size:13px;color:var(--text-muted)">Loading…</div>
        </div>
      </div>

      <!-- MY QUEUE TICKET -->
      <div class="card" style="margin-bottom:0">
        <div class="card-title"><i class="ti ti-ticket"></i>My queue ticket</div>
        <div id="ph-queue-ticket">
          <div style="text-align:center;padding:16px 0">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Your token</div>
            <div id="ph-token" style="font-size:52px;font-weight:700;font-family:var(--mono);letter-spacing:4px;color:var(--green-dark)">—</div>
            <div id="ph-facility-type" style="font-size:12px;color:var(--text-muted);margin-top:4px">—</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
            <div style="background:var(--bg-surface);border-radius:var(--radius);padding:10px;text-align:center">
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">Now serving</div>
              <div id="ph-now-serving" style="font-size:20px;font-weight:700;font-family:var(--mono)">—</div>
            </div>
            <div style="background:var(--bg-surface);border-radius:var(--radius);padding:10px;text-align:center">
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">Est. wait</div>
              <div id="ph-est-wait" style="font-size:20px;font-weight:700">—</div>
            </div>
          </div>
          <div id="ph-queue-msg" style="background:var(--green-light);border-radius:var(--radius);padding:10px;text-align:center;font-size:12px;color:var(--green-dark);margin-bottom:10px">
            Book an appointment to get your queue ticket
          </div>
          <div style="margin-bottom:6px">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:4px">
              <span>Queue progress</span>
              <span id="ph-queue-progress-label">—</span>
            </div>
            <div style="height:6px;background:var(--bg-surface);border-radius:3px;overflow:hidden">
              <div id="ph-queue-bar" style="height:100%;background:var(--green);border-radius:3px;width:0%;transition:width .5s"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- MY HEALTH -->
      <div class="card" style="margin-bottom:0">
        <div class="card-title"><i class="ti ti-heart-rate-monitor"></i>My health</div>
        <div id="ph-health-body">
          <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px">Active conditions</div>
          <div id="ph-conditions" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
            <div style="color:var(--text-hint);font-size:13px">Loading…</div>
          </div>
          <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px">Current medications</div>
          <div id="ph-meds" style="font-size:13px;color:var(--text-muted);margin-bottom:14px">Loading…</div>
          <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px">Recent visits</div>
          <div id="ph-visits" style="font-size:13px;color:var(--text-muted)">Loading…</div>
        </div>
      </div>

    </div>
  </div>`;
};

async function _loadPatientHome() {
  try {
    const patRes = await API._fetchDirect('/patients/me', { method:'GET' });
    const p = patRes.data;
    if (!p) return;

    // Greeting card
    const nameEl = document.getElementById('ph-name');
    const idEl   = document.getElementById('ph-id');
    if (nameEl) nameEl.textContent = p.fullName || `${p.firstName} ${p.lastName}`;
    if (idEl && p.nationalId) idEl.textContent = `ID: ****${p.nationalId.slice(-4)}`;

    // Conditions
    const condsEl = document.getElementById('ph-conditions');
    const conds = (p.conditions||[]).filter(c=>c.status==='active'||c.status==='monitored');
    if (condsEl) condsEl.innerHTML = conds.length
      ? conds.map(c=>`<span class="badge badge-amber">${c.name}</span>`).join('')
      : '<span style="color:var(--text-hint);font-size:13px">No active conditions</span>';

    // Prescriptions / meds
    const medsEl = document.getElementById('ph-meds');
    try {
      const rxRes = await API.prescriptions.list({ patient: p._id, status:'pending', limit:5 });
      if (medsEl) medsEl.innerHTML = (rxRes.data||[]).length
        ? (rxRes.data||[]).flatMap(rx => (rx.lines||[]).map(l=>`<div style="margin-bottom:4px">${l.medicationName} · ${l.dosage}</div>`)).join('').slice(0,3) || 'No active medications'
        : 'No active medications';
    } catch { if (medsEl) medsEl.textContent = 'No active medications'; }

    // Appointments
    const apptRes = await API.appointments.list({ patient: p._id, limit:10 });
    const appts   = apptRes.data || [];

    // Next appointment
    const nextAppt = appts.filter(a=>['pending','confirmed'].includes(a.status)&&new Date(a.scheduledAt)>new Date())
      .sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt))[0];
    const nextEl = document.getElementById('ph-next-appt');
    if (nextEl) {
      if (nextAppt) {
        const d = new Date(nextAppt.scheduledAt);
        nextEl.innerHTML = `
          <div style="font-size:11px;font-weight:600;color:var(--amber);margin-bottom:4px">Next appointment</div>
          <div style="font-weight:500;font-size:13px">${d.toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short'})} · ${d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
          <div style="font-size:12px;color:var(--text-muted)">${nextAppt.facility?.name||'—'} · ${nextAppt.doctor?'Dr. '+nextAppt.doctor.lastName:'Doctor TBA'}</div>`;
      } else {
        nextEl.innerHTML = `<div style="font-size:11px;font-weight:600;color:var(--amber);margin-bottom:4px">Next appointment</div>
          <div style="font-size:13px;color:var(--text-muted)">No upcoming appointments
            <button class="btn btn-xs btn-green" style="margin-left:8px" onclick="Router.setPage('book')">Book now</button>
          </div>`;
      }
    }

    // Recent visits
    const visitsEl = document.getElementById('ph-visits');
    const past = appts.filter(a=>a.status==='completed').sort((a,b)=>new Date(b.scheduledAt)-new Date(a.scheduledAt)).slice(0,3);
    if (visitsEl) visitsEl.innerHTML = past.length
      ? past.map(a=>`<div style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid var(--border)">
          <div style="font-size:12px;font-weight:500">${new Date(a.scheduledAt).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'})}</div>
          <div style="font-size:11px;color:var(--text-muted)">${a.reason||a.visitType||'Consultation'}</div>
        </div>`).join('')
      : '<span style="color:var(--text-hint)">No visits on record</span>';

    // Queue ticket — find today's appointment with token
    const todayAppt = appts.filter(a => {
      const d = new Date(a.scheduledAt);
      const today = new Date(); today.setHours(0,0,0,0);
      return d >= today && ['pending','confirmed','in_progress'].includes(a.status) && a.queueToken;
    }).sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt))[0];

    if (todayAppt) {
      _setEl('ph-token', todayAppt.queueToken || '—');
      _setEl('ph-facility-type', `${todayAppt.facility?.name||'—'} · ${todayAppt.visitType||'General'}`);

      // Load queue position
      const facilityId = todayAppt.facility?._id || todayAppt.facility;
      if (facilityId) {
        try {
          const queueRes = await API._fetchDirect(`/queue?facility=${facilityId}&date=${new Date().toISOString().slice(0,10)}`, { method:'GET' });
          const queue = queueRes.data || [];
          const myPos = queue.findIndex(a => a.queueToken === todayAppt.queueToken);
          const serving = queue.find(a => a.status === 'in_progress');
          const total   = queue.length;
          const seen    = (queueRes.stats?.completed) || 0;

          _setEl('ph-now-serving', serving?.queueToken || (queue[0]?.queueToken) || '—');

          const waitMins = myPos >= 0 ? myPos * 12 : 0;
          _setEl('ph-est-wait', waitMins > 0 ? `${waitMins} min` : 'Soon');

          const msg = document.getElementById('ph-queue-msg');
          if (msg) {
            if (myPos === 0 || todayAppt.status === 'in_progress') {
              msg.style.background = 'var(--green-light)';
              msg.style.color = 'var(--green-dark)';
              msg.textContent = todayAppt.status === 'in_progress' ? '✅ You are being seen now!' : '🔔 You are next! Please go to the consultation room.';
            } else if (myPos >= 0) {
              const alertAt = queue[myPos - 2]?.queueToken || queue[myPos - 1]?.queueToken || '—';
              msg.textContent = `You are ${myPos} patient${myPos!==1?'s':''} away. SMS sent when ${alertAt} is called.`;
            }
          }

          const bar = document.getElementById('ph-queue-bar');
          const progressLabel = document.getElementById('ph-queue-progress-label');
          const pct = total > 0 ? Math.round((seen / (seen + total)) * 100) : 0;
          if (bar) bar.style.width = `${pct}%`;
          if (progressLabel) progressLabel.textContent = `${seen} of ${seen+total} seen`;
        } catch(e) { console.warn('Queue load failed:', e.message); }
      }
    } else {
      _setEl('ph-token', '—');
      _setEl('ph-now-serving', '—');
      _setEl('ph-est-wait', '—');
    }

  } catch(e) {
    console.warn('Patient home load error:', e.message);
  }
}
