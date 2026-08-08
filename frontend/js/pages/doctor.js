/**
 * js/pages/doctor.js
 * Doctor portal — queue, consult, telemedicine, patients, lab, referrals, records
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ── Doctor cancel/join helpers ── */
window._docCancelAppt = async (id) => {
  _showDocCancel(id);
};

window._docReschedule = async (id, currentType, currentDatetime) => {
  _showDocReschedule(id, currentType, currentDatetime);
};

/* ── Doctor reschedule modal ── */
let _docRsId = null;
let _docCancelId = null;

window._showDocReschedule = (id, currentType, currentDatetime) => {
  _docRsId = id;
  // Inject modal if not present
  if (!document.getElementById('doc-rs-modal')) {
    const m = document.createElement('div');
    m.id = 'doc-rs-modal';
    m.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:center;justify-content:center';
    m.innerHTML = `
      <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:460px;max-width:95vw;box-shadow:var(--shadow-md)">
        <div style="font-size:16px;font-weight:600;margin-bottom:4px">Reschedule appointment</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Change the date, time, or appointment type. Patient will be notified.</div>
        <div class="f-group"><label class="f-label">New date & time *</label>
          <input type="datetime-local" class="f-input" id="doc-rs-dt" style="margin:0"></div>
        <div class="f-group" style="margin-top:12px"><label class="f-label">Appointment type</label>
          <select class="f-select" id="doc-rs-type" style="margin:0">
            <option value="consultation">In-person consultation</option>
            <option value="telemedicine">Telemedicine (video)</option>
            <option value="lab">Lab / blood draw</option>
            <option value="immunisation">Immunisation</option>
            <option value="mental_health">Mental health</option>
          </select>
        </div>
        <div class="f-group" style="margin-top:12px"><label class="f-label">Reason for rescheduling *</label>
          <select class="f-select" id="doc-rs-reason-sel" style="margin:0" onchange="document.getElementById('doc-rs-reason-other').style.display=this.value==='other'?'block':'none'">
            <option value="">— Select reason —</option>
            <option value="Doctor unavailable">Doctor unavailable</option>
            <option value="Emergency patient">Emergency patient priority</option>
            <option value="Clinical requirement">Clinical requirement</option>
            <option value="Facility issue">Facility issue</option>
            <option value="Patient request">Patient requested change</option>
            <option value="other">Other (specify)</option>
          </select>
          <input class="f-input" id="doc-rs-reason-other" placeholder="Specify reason…" style="margin-top:8px;display:none">
        </div>
        <div id="doc-rs-alert" class="alert hidden" style="margin-bottom:10px"></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-green" id="doc-rs-btn" onclick="_submitDocReschedule()"><i class="ti ti-calendar-check"></i>Confirm reschedule</button>
          <button class="btn" onclick="document.getElementById('doc-rs-modal').style.display='none'">Close</button>
        </div>
      </div>`;
    document.body.appendChild(m);
  }
  const dtEl   = document.getElementById('doc-rs-dt');
  const typeEl = document.getElementById('doc-rs-type');
  if (dtEl && currentDatetime) dtEl.value = currentDatetime;
  if (dtEl) dtEl.min = new Date(new Date().getTime() + 60000 - new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
  if (typeEl && currentType) typeEl.value = currentType;
  const alertEl = document.getElementById('doc-rs-alert');
  if (alertEl) alertEl.classList.add('hidden');
  document.getElementById('doc-rs-modal').style.display = 'flex';
};

window._submitDocReschedule = async () => {
  const datetime  = document.getElementById('doc-rs-dt')?.value;
  const type      = document.getElementById('doc-rs-type')?.value;
  const reasonSel = document.getElementById('doc-rs-reason-sel')?.value;
  const reasonOth = document.getElementById('doc-rs-reason-other')?.value?.trim();
  const reason    = reasonSel === 'other' ? reasonOth : reasonSel;
  const alertEl   = document.getElementById('doc-rs-alert');
  const btn       = document.getElementById('doc-rs-btn');

  const showAlert = (msg) => { if (alertEl) { alertEl.className='alert alert-error'; alertEl.innerHTML=`<i class="ti ti-alert-circle"></i> ${msg}`; alertEl.classList.remove('hidden'); } };

  if (!datetime) { showAlert('Please select a new date and time.'); return; }
  if (new Date(datetime) <= new Date()) { showAlert('New date must be in the future.'); return; }
  if (!reason) { showAlert('Please select a reason.'); return; }

  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div> Saving…'; }
  try {
    await API.appointments.reschedule(_docRsId, {
      scheduledAt: new Date(datetime).toISOString(),
      visitType: type,
      rescheduleReason: reason
    });
    document.getElementById('doc-rs-modal').style.display = 'none';
    UI.showToast('Appointment rescheduled — patient notified', 'ok');
    Router.setPage(Router.current.page);
  } catch(e) {
    showAlert(e.message || 'Failed to reschedule.');
    if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-calendar-check"></i>Confirm reschedule'; }
  }
};

window._showDocCancel = (id) => {
  _docCancelId = id;
  if (!document.getElementById('doc-cancel-modal')) {
    const m = document.createElement('div');
    m.id = 'doc-cancel-modal';
    m.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:center;justify-content:center';
    m.innerHTML = `
      <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:420px;max-width:95vw;box-shadow:var(--shadow-md)">
        <div style="font-size:16px;font-weight:600;margin-bottom:4px">Cancel appointment</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Patient will be notified by SMS and email.</div>
        <div class="f-group"><label class="f-label">Reason *</label>
          <select class="f-select" id="doc-cancel-sel" style="margin:0" onchange="document.getElementById('doc-cancel-other').style.display=this.value==='other'?'block':'none'">
            <option value="">— Select reason —</option>
            <option value="Doctor unavailable">Doctor unavailable</option>
            <option value="Emergency">Emergency — please rebook</option>
            <option value="Facility closed">Facility closed</option>
            <option value="Patient no-show">Patient no-show</option>
            <option value="Clinical decision">Clinical decision</option>
            <option value="other">Other</option>
          </select>
          <input class="f-input" id="doc-cancel-other" placeholder="Specify reason…" style="margin-top:8px;display:none">
        </div>
        <div class="alert-box alert-warn" style="margin-bottom:12px"><i class="ti ti-alert-triangle"></i>This will notify the patient immediately.</div>
        <div id="doc-cancel-alert" class="alert hidden" style="margin-bottom:10px"></div>
        <div style="display:flex;gap:8px">
          <button class="btn" style="background:var(--red);border-color:var(--red);color:#fff" id="doc-cancel-btn" onclick="_submitDocCancel()">
            <i class="ti ti-x"></i>Cancel appointment
          </button>
          <button class="btn" onclick="document.getElementById('doc-cancel-modal').style.display='none'">Keep it</button>
        </div>
      </div>`;
    document.body.appendChild(m);
  }
  const alertEl = document.getElementById('doc-cancel-alert');
  if (alertEl) alertEl.classList.add('hidden');
  document.getElementById('doc-cancel-modal').style.display = 'flex';
};

window._submitDocCancel = async () => {
  const sel   = document.getElementById('doc-cancel-sel')?.value;
  const other = document.getElementById('doc-cancel-other')?.value?.trim();
  const reason= sel === 'other' ? other : sel;
  const alertEl = document.getElementById('doc-cancel-alert');
  const btn   = document.getElementById('doc-cancel-btn');
  if (!reason) { if(alertEl){alertEl.className='alert alert-error';alertEl.innerHTML='<i class="ti ti-alert-circle"></i> Please select a reason.';alertEl.classList.remove('hidden');} return; }
  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div> Cancelling…'; }
  try {
    await API.appointments.cancel(_docCancelId, reason);
    document.getElementById('doc-cancel-modal').style.display = 'none';
    UI.showToast('Appointment cancelled — patient notified', 'ok');
    Router.setPage(Router.current.page);
  } catch(e) {
    if(alertEl){alertEl.className='alert alert-error';alertEl.innerHTML=`<i class="ti ti-alert-circle"></i> ${e.message}`;alertEl.classList.remove('hidden');}
    if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-x"></i>Cancel appointment'; }
  }
};

window._docJoinTele = async (id) => {
  const btn = event?.target?.closest('button');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="ti ti-loader-2"></i> Joining…'; }
  try {
    const res = await API._fetchDirect(`/appointments/${id}/join`, { method:'GET' });
    if (res.data && window._openJitsiRoom) {
      _openJitsiRoom(res.data);
    } else {
      Router.setPage('telemedicine');
    }
  } catch(e) {
    UI.showToast(e.message||'Cannot join session','err');
  } finally {
    if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-video"></i>Start'; }
  }
};

function _badge(status) {
  const map = { confirmed:'badge-green', completed:'badge-green', active:'badge-green', ready:'badge-green',
    pending:'badge-amber', monitored:'badge-amber', in_progress:'badge-blue', in_lab:'badge-blue',
    cancelled:'badge-gray', no_show:'badge-gray' };
  return map[status] || 'badge-gray';
}

/* ══════════════════════════════
   QUEUE
══════════════════════════════ */
Pages['queue'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('queue-list');
    if (!wrap) return;
    try {
      const user = API.getStoredUser();
      const today = new Date().toISOString().slice(0,10);
      const res  = await API._fetchDirect(`/queue?facility=${user?.facilityId||''}&date=${today}`, { method:'GET' });
      const items = res.data || [];
      const stats = res.stats || {};
      _setEl('m-waiting', stats.waiting ?? items.filter(a=>a.status!=='in_progress').length);
      _setEl('m-seen',    stats.completed ?? '—');
      _setEl('m-wait',    (stats.avgWaitMins||0) + ' min');
      if (!items.length) { wrap.innerHTML = '<p style="color:var(--text-muted);padding:16px 0">Queue is empty.</p>'; return; }
      wrap.innerHTML = items.map((a,i) => {
        const p       = a.patient || {};
        const wait    = Math.max(0, Math.floor((Date.now() - new Date(a.scheduledAt))/60000));
        const isPri   = a.priority;
        return `<div class="queue-row">
          <div class="queue-num ${isPri?'q-priority':'q-normal'}">${isPri?'!':i+1}</div>
          <div class="q-info">
            <div class="q-name">${p.firstName||''} ${p.lastName||''} <span style="font-weight:400;color:var(--text-muted);font-size:12px">· ${a.queueToken||''}</span></div>
            <div class="q-sub">${a.reason||a.visitType||'—'}</div>
          </div>
          <div style="font-size:12px;color:var(--text-muted)">${wait} min</div>
          <button class="btn btn-sm btn-green" onclick="Router.setPage('consult')"><i class="ti ti-stethoscope"></i>Consult</button>
        </div>`;
      }).join('');
    } catch(e) { const w=document.getElementById('queue-list'); if(w) w.innerHTML=`<div class="alert-box alert-danger" style="margin:0"><i class="ti ti-alert-circle"></i>${e.message}</div>`; }
  }, 0);
  return `
    <div class="page-title">Today's queue</div>
    <div class="metric-grid metric-grid-3" style="max-width:580px">
      <div class="metric-card"><div class="metric-label">Waiting</div><div class="metric-value" id="m-waiting">—</div></div>
      <div class="metric-card"><div class="metric-label">Seen today</div><div class="metric-value" id="m-seen">—</div></div>
      <div class="metric-card"><div class="metric-label">Avg wait</div><div class="metric-value" id="m-wait">—</div></div>
    </div>
    <div class="card"><div class="card-title"><i class="ti ti-users"></i>Queue</div>
      <div id="queue-list" style="color:var(--text-muted);padding:16px">Loading…</div>
    </div>`;
};
function _setEl(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}

/* ══════════════════════════════
   CONSULT
══════════════════════════════ */
Pages['consult'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('consult-patient-sel');
    if (!wrap) return;
    try {
      const res = await API.patients.list({ limit:20 });
      wrap.innerHTML = `<option value="">— Select patient —</option>` +
        (res.data||[]).map(p=>`<option value="${p._id}">${p.fullName||p.firstName+' '+p.lastName} (${p.nationalId||p.mrn||'—'})</option>`).join('');
    } catch(e) { wrap.innerHTML='<option>Failed to load patients</option>'; }
  }, 0);
  return `
    <div class="page-title">Consultation</div>
    <div class="f-group" style="max-width:400px;margin-bottom:16px">
      <label class="f-label">Select patient</label>
      <select class="f-select" id="consult-patient-sel" onchange="_loadConsultPatient(this.value)" style="margin:0">
        <option>Loading patients…</option>
      </select>
    </div>
    <div id="consult-body">
      <div style="color:var(--text-muted);text-align:center;padding:48px">
        <i class="ti ti-user-search" style="font-size:40px;opacity:.3;display:block;margin-bottom:10px"></i>
        Select a patient above to begin
      </div>
    </div>`;
};

window._loadConsultPatient = async (patientId) => {
  if (!patientId) return;
  const wrap = document.getElementById('consult-body');
  if (!wrap) return;
  wrap.innerHTML = '<div style="color:var(--text-muted);padding:16px">Loading…</div>';
  try {
    const res = await API.patients.get(patientId);
    const p   = res.data;
    const v   = p.latestVitals || {};
    const conds = (p.conditions||[]);
    wrap.innerHTML = `
      <div class="two-col">
        <div>
          <div class="card">
            <div class="card-title"><i class="ti ti-user"></i>Patient summary</div>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
              <div class="avatar" style="width:44px;height:44px;font-size:14px;background:var(--green-light);color:var(--green-dark);font-weight:600">${p.initials||'??'}</div>
              <div>
                <div style="font-weight:600">${p.fullName||p.firstName+' '+p.lastName}</div>
                <div style="font-size:12px;color:var(--text-muted)">MRN: ${p.mrn||'—'} · ${p.age||'?'}y · ${p.gender||'?'} · ${p.bloodType||'?'}</div>
                ${(p.allergies||[]).length?`<span class="badge badge-red" style="margin-top:4px"><i class="ti ti-alert-triangle" style="font-size:11px"></i>Allergy: ${p.allergies.join(', ')}</span>`:''}
              </div>
            </div>
            <!-- Vitals display -->
            <div class="vitals-grid" id="vitals-display-${p._id}">
              <div class="vital-box"><div class="vital-val ${v.bp?.systolic>140?'style="color:var(--coral)"':''}">${v.bp?`${v.bp.systolic}/${v.bp.diastolic}`:'—'}</div><div class="vital-lbl">BP</div></div>
              <div class="vital-box"><div class="vital-val">${v.heartRate||'—'}</div><div class="vital-lbl">HR</div></div>
              <div class="vital-box"><div class="vital-val">${v.temperature||'—'}°C</div><div class="vital-lbl">Temp</div></div>
              <div class="vital-box"><div class="vital-val">${v.spO2||'—'}%</div><div class="vital-lbl">SpO2</div></div>
              <div class="vital-box"><div class="vital-val">${v.weight||'—'} kg</div><div class="vital-lbl">Weight</div></div>
              <div class="vital-box"><div class="vital-val">${v.bmi||'—'}</div><div class="vital-lbl">BMI</div></div>
            </div>
            <button class="btn btn-xs" style="margin-top:8px" onclick="_toggleVitalsEdit('${p._id}')"><i class="ti ti-pencil"></i>Update vitals</button>
            <!-- Vitals edit form (hidden by default) -->
            <div id="vitals-edit-${p._id}" style="display:none;margin-top:10px;padding:12px;background:var(--bg-surface);border-radius:10px">
              <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Update Vitals</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <div class="f-group" style="margin:0"><label class="f-label" style="font-size:10px">BP Systolic</label><input class="f-input" id="v-systolic" type="number" placeholder="e.g. 120" value="${v.bp?.systolic||''}" style="margin:0;padding:7px"></div>
                <div class="f-group" style="margin:0"><label class="f-label" style="font-size:10px">BP Diastolic</label><input class="f-input" id="v-diastolic" type="number" placeholder="e.g. 80" value="${v.bp?.diastolic||''}" style="margin:0;padding:7px"></div>
                <div class="f-group" style="margin:0"><label class="f-label" style="font-size:10px">Heart Rate (bpm)</label><input class="f-input" id="v-hr" type="number" placeholder="e.g. 72" value="${v.heartRate||''}" style="margin:0;padding:7px"></div>
                <div class="f-group" style="margin:0"><label class="f-label" style="font-size:10px">Temperature (°C)</label><input class="f-input" id="v-temp" type="number" step="0.1" placeholder="e.g. 36.6" value="${v.temperature||''}" style="margin:0;padding:7px"></div>
                <div class="f-group" style="margin:0"><label class="f-label" style="font-size:10px">SpO2 (%)</label><input class="f-input" id="v-spo2" type="number" placeholder="e.g. 98" value="${v.spO2||''}" style="margin:0;padding:7px"></div>
                <div class="f-group" style="margin:0"><label class="f-label" style="font-size:10px">Weight (kg)</label><input class="f-input" id="v-weight" type="number" step="0.1" placeholder="e.g. 70" value="${v.weight||''}" style="margin:0;padding:7px"></div>
                <div class="f-group" style="margin:0"><label class="f-label" style="font-size:10px">Height (cm)</label><input class="f-input" id="v-height" type="number" placeholder="e.g. 165" value="${v.height||''}" style="margin:0;padding:7px"></div>
              </div>
              <div style="display:flex;gap:6px;margin-top:10px">
                <button class="btn btn-xs btn-green" onclick="_saveVitals('${p._id}')"><i class="ti ti-check"></i>Save vitals</button>
                <button class="btn btn-xs" onclick="_toggleVitalsEdit('${p._id}')">Cancel</button>
              </div>
              <div id="vitals-save-status" style="font-size:12px;margin-top:6px"></div>
            </div>
          </div>

          <!-- Conditions -->
          <div class="card">
            <div class="card-title"><i class="ti ti-clipboard-list"></i>Conditions
              <button class="btn btn-xs btn-green" style="margin-left:auto" onclick="_showAddCondition('${p._id}')"><i class="ti ti-plus"></i>Add</button>
            </div>
            <div id="cond-list">
              ${conds.length ? conds.map(c=>`
                <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">
                  <div>
                    <div style="font-size:13px;font-weight:500">${c.name}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${c.icd10Code} · ${c.status}</div>
                  </div>
                  <span class="badge ${c.status==='active'?'badge-amber':c.status==='resolved'?'badge-gray':'badge-blue'}">${c.status}</span>
                </div>`).join('')
              : '<p style="color:var(--text-muted);font-size:13px">No conditions recorded.</p>'}
            </div>
          </div>

          <!-- Patient records -->
          <div class="card">
            <div class="card-title"><i class="ti ti-folder-open"></i>Patient records</div>
            ${p.idDocument?.url ? `
              <div class="alert-box alert-ok" style="margin-bottom:10px">
                <i class="ti ti-file-check"></i>
                <div style="flex:1">
                  <div style="font-weight:500;font-size:13px">${p.idDocument.filename}</div>
                  <div style="font-size:11px">Uploaded ${new Date(p.idDocument.uploadedAt).toLocaleDateString('en-ZA')}</div>
                </div>
                <a href="http://localhost:5000${p.idDocument.url}" target="_blank" download class="btn btn-xs"><i class="ti ti-download"></i>Download</a>
              </div>` : '<p style="color:var(--text-muted);font-size:13px;margin-bottom:10px">No ID document uploaded.</p>'}

            <!-- Upload record -->
            <div style="border:2px dashed var(--border-md);border-radius:var(--radius);padding:16px;text-align:center;cursor:pointer" onclick="document.getElementById('doc-upload-${p._id}').click()">
              <i class="ti ti-upload" style="font-size:24px;color:var(--text-hint);display:block;margin-bottom:6px"></i>
              <div style="font-size:13px;color:var(--text-muted)">Upload medical record / document</div>
              <div style="font-size:11px;color:var(--text-hint)">PDF, JPG, PNG · Max 5 MB</div>
            </div>
            <input type="file" id="doc-upload-${p._id}" accept=".pdf,.jpg,.jpeg,.png" style="display:none" onchange="_uploadPatientDoc('${p._id}',this)">
            <div id="upload-status-${p._id}" style="margin-top:8px"></div>

            <!-- Download full record -->
            <button class="btn" style="width:100%;margin-top:10px" onclick="_downloadPatientRecord('${p._id}','${(p.fullName||p.firstName+' '+p.lastName).replace(/'/g,'')}')">
              <i class="ti ti-file-download"></i>Download full patient record (PDF)
            </button>
          </div>
        </div>

        <div>
          <!-- Consultation notes -->
          <div class="card">
            <div class="card-title"><i class="ti ti-notes"></i>Consultation notes</div>
            <div class="f-group"><label class="f-label">Chief complaint</label><input class="f-input" id="cc-input" placeholder="Presenting complaint…"></div>
            <div class="f-group"><label class="f-label">Clinical notes</label><textarea class="f-textarea" style="height:80px" id="notes-input" placeholder="Clinical observations…"></textarea></div>
            <div class="f-group"><label class="f-label">ICD-10 diagnosis</label><input class="f-input" id="icd10-input" placeholder="e.g. I10 — Essential hypertension"></div>
            <div class="f-group"><label class="f-label">Treatment plan</label><input class="f-input" id="treatment-input" placeholder="e.g. Continue current medication, review in 4 weeks"></div>
            <div class="two-col">
              <div class="f-group"><label class="f-label">Follow-up date</label><input class="f-input" type="date" id="followup-date"></div>
              <div class="f-group"><label class="f-label">ICD-10 description</label><input class="f-input" id="icd10-desc" placeholder="e.g. Essential hypertension"></div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-sm btn-green" onclick="_saveConsultNotes('${p._id}')"><i class="ti ti-device-floppy"></i>Save notes</button>
              <button class="btn btn-sm" onclick="_openReferral('${p._id}','${p.fullName||p.firstName+' '+p.lastName}')"><i class="ti ti-share"></i>Refer patient</button>
              <button class="btn btn-sm" onclick="Router.setPage('lab')"><i class="ti ti-flask"></i>Order labs</button>
            </div>
            <div id="consult-saved-note" style="display:none"></div>
          </div>

          <!-- Prescribe -->
          <div class="card">
            <div class="card-title"><i class="ti ti-pill"></i>Prescribe medication</div>
            <div class="f-group"><label class="f-label">Medication</label><input class="f-input" id="rx-med" placeholder="Start typing medication name…"></div>
            <div class="two-col">
              <div class="f-group"><label class="f-label">Dosage</label><input class="f-input" id="rx-dose" placeholder="e.g. 500mg"></div>
              <div class="f-group"><label class="f-label">Duration (days)</label><input class="f-input" type="number" id="rx-days" value="30" min="1"></div>
            </div>
            <div class="f-group"><label class="f-label">Instructions</label><input class="f-input" id="rx-instructions" placeholder="e.g. Take 1 tablet twice daily with food"></div>
            <div id="rx-alert" style="display:none;margin-bottom:8px;padding:8px 12px;background:#FEF2F2;border-left:4px solid var(--red);border-radius:8px;font-size:12px;color:#991B1B"></div>
            <button class="btn btn-sm btn-green" onclick="_sendRx('${p._id}')"><i class="ti ti-send"></i>Send to pharmacy</button>
          </div>
        </div>
      </div>

      <!-- Add condition modal -->
      <div id="add-condition-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:center;justify-content:center">
        <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:420px;max-width:95vw;box-shadow:var(--shadow-md)">
          <div style="font-size:16px;font-weight:600;margin-bottom:16px">Add condition</div>
          <div class="f-group"><label class="f-label">ICD-10 code <span style="color:var(--red)">*</span></label>
            <input class="f-input" id="cond-icd10" placeholder="e.g. I10"></div>
          <div class="f-group"><label class="f-label">Condition name <span style="color:var(--red)">*</span></label>
            <input class="f-input" id="cond-name" placeholder="e.g. Essential hypertension"></div>
          <div class="f-group"><label class="f-label">Status</label>
            <select class="f-select" id="cond-status" style="margin:0">
              <option value="active">Active</option>
              <option value="chronic">Chronic</option>
              <option value="monitored">Monitored</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div id="cond-alert" class="alert hidden" style="margin-bottom:10px"></div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-green" onclick="_saveCondition('${p._id}')"><i class="ti ti-check"></i>Save condition</button>
            <button class="btn" onclick="document.getElementById('add-condition-modal').style.display='none'">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Referral modal -->
      <div id="referral-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:center;justify-content:center">
        <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:520px;max-width:95vw;box-shadow:var(--shadow-md);max-height:90vh;overflow-y:auto">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div style="font-size:16px;font-weight:600">Referral letter</div>
            <button class="btn btn-xs" onclick="document.getElementById('referral-modal').style.display='none'"><i class="ti ti-x"></i>Close</button>
          </div>
          <div class="f-group"><label class="f-label">Refer to (specialist / department) <span style="color:var(--red)">*</span></label>
            <input class="f-input" id="ref-to" placeholder="e.g. Cardiology, Dr. Nkosi"></div>
          <div class="f-group"><label class="f-label">Referring facility</label>
            <input class="f-input" id="ref-facility" placeholder="e.g. Helen Joseph Hospital"></div>
          <div class="f-group"><label class="f-label">Urgency</label>
            <select class="f-select" id="ref-urgency" style="margin:0">
              <option value="routine">Routine (within 4 weeks)</option>
              <option value="urgent">Urgent (within 1 week)</option>
              <option value="emergency">Emergency (same day)</option>
            </select>
          </div>
          <div class="f-group" style="margin-top:10px"><label class="f-label">Reason for referral <span style="color:var(--red)">*</span></label>
            <textarea class="f-textarea" id="ref-reason" style="height:80px" placeholder="Clinical reason for referral…"></textarea></div>
          <div class="f-group"><label class="f-label">Relevant history &amp; findings</label>
            <textarea class="f-textarea" id="ref-history" style="height:80px" placeholder="Relevant medical history, examination findings, investigations…"></textarea></div>
          <div class="f-group"><label class="f-label">Current medications</label>
            <textarea class="f-textarea" id="ref-meds" style="height:60px" placeholder="List current medications…"></textarea></div>
          <div id="ref-alert" class="alert hidden" style="margin-bottom:10px"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-green" onclick="_generateReferral('${p._id}','${(p.fullName||p.firstName+' '+p.lastName).replace(/'/g,'')}','${p.nationalId||'—'}','${p.age||'?'}')">
              <i class="ti ti-file-download"></i>Generate & download referral
            </button>
            <button class="btn" onclick="_printReferral('${p._id}','${(p.fullName||p.firstName+' '+p.lastName).replace(/'/g,'')}','${p.nationalId||'—'}','${p.age||'?'}')">
              <i class="ti ti-printer"></i>Print
            </button>
          </div>
        </div>
      </div>`;
  } catch(e) { wrap.innerHTML = `<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`; }
};

/* ── Add condition ── */
window._showAddCondition = (patientId) => {
  const modal = document.getElementById('add-condition-modal');
  if (modal) modal.style.display = 'flex';
};

window._saveCondition = async (patientId) => {
  const icd10  = document.getElementById('cond-icd10')?.value?.trim();
  const name   = document.getElementById('cond-name')?.value?.trim();
  const status = document.getElementById('cond-status')?.value;
  const alert  = document.getElementById('cond-alert');

  const showAlert = (msg, type='error') => {
    if (!alert) return;
    alert.className = 'alert alert-' + (type==='error'?'error':'success');
    alert.innerHTML = `<i class="ti ti-${type==='error'?'alert-circle':'check'}"></i> ${msg}`;
    alert.classList.remove('hidden');
  };

  if (!icd10) { showAlert('ICD-10 code is required.'); return; }
  if (!name)  { showAlert('Condition name is required.'); return; }

  const btn = document.querySelector('#add-condition-modal .btn-green');
  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div> Saving…'; }

  try {
    // Get current patient, merge new condition
    const res = await API.patients.get(patientId);
    const p   = res.data;
    const conditions = [...(p.conditions||[]), { icd10Code: icd10, name, status }];
    await API.patients.update(patientId, { conditions });
    document.getElementById('add-condition-modal').style.display = 'none';
    UI.showToast('Condition added successfully','ok');
    // Reload consult
    _loadConsultPatient(patientId);
    // Clear form
    ['cond-icd10','cond-name'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  } catch(e) {
    showAlert(e.message || 'Failed to save condition.');
    if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-check"></i>Save condition'; }
  }
};

/* ── Save consult notes ── */
window._saveConsultNotes = async (patientId) => {
  const chiefComplaint = (document.getElementById('cc-input')?.value||'').trim();
  const notes          = (document.getElementById('notes-input')?.value||'').trim();
  const icd10          = (document.getElementById('icd10-input')?.value||'').trim();
  const treatment      = (document.getElementById('treatment-input')?.value||'').trim();
  const followUp       = (document.getElementById('followup-date')?.value||'');

  if (!notes && !chiefComplaint) { UI.showToast('Please enter at least a chief complaint or clinical notes','err'); return; }

  const btn = event?.target?.closest('button');
  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner" style="width:12px;height:12px"></div> Saving…'; }

  try {
    const user = API.getStoredUser();

    /* 1. Find today's appointment for context */
    let apptId = window._dcCurrentApptId;
    let facilityId = user?.facilityId || user?.facility;
    if (!apptId) {
      try {
        const ar = await API.appointments.list({ patient: patientId, limit: 10 });
        const today = new Date().toDateString();
        const todayAppt = (ar.data||[]).find(a =>
          new Date(a.scheduledAt).toDateString() === today &&
          ['confirmed','pending','in_progress'].includes(a.status)
        );
        if (todayAppt) { apptId = todayAppt._id; facilityId = facilityId || todayAppt.facility?._id || todayAppt.facility; }
      } catch(_) {}
    }

    /* 2. POST to /consultation-notes — creates official medical record */
    const noteRes = await API._fetchDirect('/consultation-notes', {
      method: 'POST',
      body: JSON.stringify({
        patient:          patientId,
        appointment:      apptId || undefined,
        facility:         facilityId || undefined,
        chiefComplaint,
        clinicalNotes:    notes,
        icd10Code:        icd10 || undefined,
        icd10Description: icd10 ? document.getElementById('icd10-desc')?.value?.trim() || icd10 : undefined,
        treatmentPlan:    treatment || undefined,
        followUpDate:     followUp ? new Date(followUp).toISOString() : undefined,
      })
    });

    /* 3. Also update appointment status to in_progress + save notes there */
    if (apptId) {
      await API._fetchDirect('/appointments/'+apptId+'/status', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'in_progress',
          notes: [chiefComplaint?'CC: '+chiefComplaint:'', notes].filter(Boolean).join('\n'),
          icd10Code: icd10 || undefined,
        })
      }).catch(() => {});
    }

    UI.showToast('✅ Consultation notes saved to patient medical file','ok');

    /* Clear & feedback */
    if (btn) {
      btn.innerHTML='<i class="ti ti-check"></i> Saved!';
      btn.style.background='var(--green-dark)';
      setTimeout(() => { btn.disabled=false; btn.innerHTML='<i class="ti ti-device-floppy"></i>Save notes'; btn.style.background=''; }, 2500);
    }

    /* Show saved note inline below the form */
    const savedEl = document.getElementById('consult-saved-note');
    if (savedEl && noteRes?.data) {
      const n = noteRes.data;
      savedEl.innerHTML =
        '<div style="padding:12px 14px;background:#EDFBF3;border-radius:10px;border:1.5px solid var(--green);margin-top:10px;font-size:12px">' +
        '<div style="font-weight:700;color:var(--green-dark);margin-bottom:6px"><i class="ti ti-circle-check"></i> Saved to patient medical file</div>' +
        '<div style="color:var(--text-muted)">Dr. '+(user?.firstName||'')+(user?.lastName?' '+user.lastName:'')+
        ' · '+(n.facilityName||'')+ ' · '+new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})+'</div>'+
        '</div>';
      savedEl.style.display='block';
    }

  } catch(e) {
    UI.showToast(e.message||'Failed to save notes','err');
    if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-device-floppy"></i>Save notes'; }
  }
};

/* ── Send prescription ── */
window._sendRx = async (patientId) => {
  const med   = document.getElementById('rx-med')?.value?.trim();
  const dose  = document.getElementById('rx-dose')?.value?.trim();
  const days  = parseInt(document.getElementById('rx-days')?.value) || 30;
  const instr = document.getElementById('rx-instructions')?.value?.trim() || dose;
  const user  = API.getStoredUser();

  if (!med)  { UI.showToast('Please enter a medication name', 'err'); return; }
  if (!dose) { UI.showToast('Please enter the dosage', 'err'); return; }

  const btn = event?.target?.closest('button');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:12px;height:12px"></div> Sending…'; }

  try {
    /* Try to find medication in stock catalogue (optional — won't block if not found) */
    let medicationId = null;
    try {
      const medsRes = await API._fetchDirect('/medications?search=' + encodeURIComponent(med) + '&facility=' + (user?.facilityId||'') + '&limit=5', { method: 'GET' });
      const match = (medsRes.data||[]).find(m => m.name.toLowerCase().includes(med.toLowerCase()));
      if (match) medicationId = match._id;
    } catch(_) { /* Stock lookup failed — still send prescription */ }

    /* Create prescription regardless of stock match */
    await API.prescriptions.create({
      patient:  patientId,
      facility: user?.facilityId || user?.facility,
      prescribedBy: user?._id,
      lines: [{
        ...(medicationId ? { medication: medicationId } : {}),
        medicationName: med,
        dosage:         dose,
        frequency:      instr,
        durationDays:   days,
        quantity:       days,
        instructions:   instr,
      }],
      status: 'pending',
      notes: 'Prescribed by Dr. ' + (user?.firstName||'') + ' ' + (user?.lastName||''),
    });

    /* Clear fields */
    const clear = (id) => { const el = document.getElementById(id); if(el) el.value = id==='rx-days'?'30':''; };
    ['rx-med','rx-dose','rx-days','rx-instructions'].forEach(clear);

    /* Success feedback */
    UI.showToast('✅ Prescription sent to pharmacy', 'ok');
    if (btn) {
      btn.innerHTML = '<i class="ti ti-check"></i> Sent!';
      btn.style.background = 'var(--green-dark)';
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="ti ti-send"></i>Send to pharmacy';
        btn.style.background = '';
      }, 2000);
    }

  } catch(e) {
    UI.showToast(e.message || 'Failed to send prescription', 'err');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-send"></i>Send to pharmacy'; }
  }
};

/* ── Upload patient document ── */
window._uploadPatientDoc = async (patientId, input) => {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5*1024*1024) { UI.showToast('File must be under 5 MB','err'); return; }
  const statusEl = document.getElementById(`upload-status-${patientId}`);
  if (statusEl) statusEl.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">Uploading…</div>';
  try {
    const token = API.Tokens.getAccess();
    const form  = new FormData();
    form.append('idDocument', file);
    // Staff uploading on behalf of patient — use patient-specific endpoint
    const res = await fetch(`http://localhost:5000/api/v1/patients/${patientId}/upload-doc`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: form
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    UI.showToast('Document uploaded successfully','ok');
    if (statusEl) statusEl.innerHTML = `<div class="alert-box alert-ok" style="margin:0;font-size:12px"><i class="ti ti-check"></i>${file.name} uploaded</div>`;
    setTimeout(() => _loadConsultPatient(patientId), 1000);
  } catch(e) {
    UI.showToast(e.message||'Upload failed','err');
    if (statusEl) statusEl.innerHTML = `<div class="alert-box alert-danger" style="margin:0;font-size:12px"><i class="ti ti-alert-circle"></i>${e.message}</div>`;
  }
};

/* ── Download patient record as printable HTML→PDF ── */
window._downloadPatientRecord = async (patientId, patientName) => {
  try {
    const [patRes, rxRes, apptRes, notesRes] = await Promise.all([
      API.patients.get(patientId),
      API.prescriptions.list({ patient: patientId, limit: 50 }),
      API.appointments.list({ patient: patientId, limit: 30 }),
      API._fetchDirect('/consultation-notes?patient=' + patientId + '&limit=20', { method: 'GET' })
        .catch(() => ({ data: [] })),
    ]);
    const p     = patRes.data;
    const rxs   = rxRes.data || [];
    const appts = apptRes.data || [];
    const notes = notesRes.data || [];
    const user  = API.getStoredUser();
    const now   = new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});

    /* Build consultation notes HTML for report */
    const notesHtml = notes.length
      ? notes.map(n => `
          <div style="margin-bottom:14px;padding:10px 12px;border:1px solid #e0e0e0;border-radius:6px;page-break-inside:avoid">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <div style="font-weight:600;font-size:12px">${new Date(n.createdAt).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'long',year:'numeric'})}</div>
              <div style="font-size:11px;color:#888">${n.doctorName||''} · ${n.facilityName||''} · Practice: ${n.practiceNumber||'—'}</div>
            </div>
            ${n.icd10Code ? `<div style="margin-bottom:4px"><span style="background:#e8f4f0;color:#0F6E56;padding:1px 6px;border-radius:4px;font-size:11px;font-weight:700">${n.icd10Code}</span>${n.icd10Description?' — '+n.icd10Description:''}</div>` : ''}
            ${n.chiefComplaint ? `<div style="margin-bottom:3px"><strong style="font-size:11px">Chief complaint:</strong> ${n.chiefComplaint}</div>` : ''}
            ${n.clinicalNotes  ? `<div style="margin-bottom:3px"><strong style="font-size:11px">Notes:</strong> ${n.clinicalNotes}</div>` : ''}
            ${n.treatmentPlan  ? `<div style="margin-bottom:3px"><strong style="font-size:11px">Treatment:</strong> ${n.treatmentPlan}</div>` : ''}
            ${n.followUpDate   ? `<div style="color:#1A4A9B;font-size:11px"><strong>Follow-up:</strong> ${new Date(n.followUpDate).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})}</div>` : ''}
          </div>`).join('')
      : '<p style="color:#888">No consultation notes recorded.</p>';

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Patient Record — ${patientName}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:13px;color:#222;margin:40px;line-height:1.6}
        h1{font-size:20px;margin-bottom:4px}
        h2{font-size:14px;font-weight:600;border-bottom:2px solid #0F6E56;padding-bottom:4px;margin:20px 0 10px;color:#0F6E56}
        .header{display:flex;justify-content:space-between;border-bottom:2px solid #222;padding-bottom:12px;margin-bottom:20px}
        .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:#FAEEDA;color:#854F0B;margin-right:4px}
        table{width:100%;border-collapse:collapse;margin-bottom:12px}
        th{text-align:left;font-size:11px;text-transform:uppercase;color:#888;padding:4px 8px;border-bottom:1px solid #ddd}
        td{padding:6px 8px;border-bottom:1px solid #f0f0f0}
        .footer{margin-top:40px;padding-top:12px;border-top:1px solid #ddd;font-size:11px;color:#888;text-align:center}
        @media print{body{margin:20px}}
      </style>
    </head><body>
      <div class="header">
        <div>
          <h1>NIHMS — Patient Medical Record</h1>
          <div style="color:#888;font-size:12px">Generated: ${now} by Dr. ${user?.firstName} ${user?.lastName}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:#888">MRN: ${p.mrn||'—'}</div>
          <div style="font-size:11px;color:#888">Facility: ${p.primaryFacility?.name||'—'}</div>
        </div>
      </div>

      <h2>Patient Information</h2>
      <table>
        <tr><td><strong>Full name</strong></td><td>${p.fullName||p.firstName+' '+p.lastName}</td>
            <td><strong>Date of birth</strong></td><td>${p.dateOfBirth?new Date(p.dateOfBirth).toLocaleDateString('en-ZA'):'-'} (${p.age||'?'}y)</td></tr>
        <tr><td><strong>National ID</strong></td><td>${p.nationalId||'—'}</td>
            <td><strong>Gender</strong></td><td>${p.gender||'—'}</td></tr>
        <tr><td><strong>Blood type</strong></td><td>${p.bloodType||'—'}</td>
            <td><strong>Allergies</strong></td><td style="color:#c0392b">${(p.allergies||[]).join(', ')||'None known'}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${p.phone||'—'}</td>
            <td><strong>Address</strong></td><td>${p.address?.street?`${p.address.street}, ${p.address.city}`:'—'}</td></tr>
      </table>

      <h2>Active Conditions</h2>
      ${(p.conditions||[]).length ? `<table>
        <tr><th>ICD-10</th><th>Condition</th><th>Status</th></tr>
        ${(p.conditions||[]).map(c=>`<tr><td>${c.icd10Code}</td><td>${c.name}</td><td>${c.status}</td></tr>`).join('')}
      </table>` : '<p style="color:#888">No conditions recorded.</p>'}

      <h2>Current Prescriptions</h2>
      ${rxs.filter(r=>['pending','dispensed'].includes(r.status)).length ? `<table>
        <tr><th>Medication</th><th>Dosage</th><th>Instructions</th><th>Duration</th><th>Qty</th><th>Status</th><th>Date</th></tr>
        ${rxs.filter(r=>['pending','dispensed'].includes(r.status)).flatMap(r=>(r.lines||[]).map(l=>`
          <tr>
            <td><strong>${l.medicationName}</strong></td>
            <td>${l.dosage||'—'}</td>
            <td style="font-size:11px;color:#555">${l.instructions||l.frequency||'—'}</td>
            <td>${l.durationDays||'—'} days</td>
            <td>${l.quantity||'—'}</td>
            <td><span style="padding:2px 7px;border-radius:10px;font-size:11px;font-weight:600;background:${r.status==='dispensed'?'#d1fae5':'#fef3c7'};color:${r.status==='dispensed'?'#065f46':'#92400e'}">${r.status}</span></td>
            <td>${new Date(r.createdAt).toLocaleDateString('en-ZA')}</td>
          </tr>`)).join('')}
      </table>` : '<p style="color:#888">No prescriptions on record.</p>'}

      <h2>Consultation Notes</h2>
      ${notesHtml}

      <h2>Visit History</h2>
      ${appts.filter(a=>a.status==='completed').length ? `<table>
        <tr><th>Date</th><th>Type</th><th>Reason / ICD-10</th><th>Doctor</th></tr>
        ${appts.filter(a=>a.status==='completed').map(a=>`
          <tr><td>${new Date(a.scheduledAt).toLocaleDateString('en-ZA')}</td>
          <td>${a.visitType||'consultation'}</td>
          <td>${a.reason||a.icd10Code||'—'}</td>
          <td>${a.doctor?'Dr. '+a.doctor.firstName+' '+a.doctor.lastName:'—'}</td></tr>`).join('')}
      </table>` : '<p style="color:#888">No visit history.</p>'}

      <div class="footer">
        This is an official medical record generated by NIHMS. Confidential — for authorised use only.
        <br>Dr. ${user?.firstName} ${user?.lastName} · ${user?.facilityName} · ${now}
      </div>
    </body></html>`;

    // Open in new window and trigger print/save
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  } catch(e) { UI.showToast(e.message||'Failed to generate record','err'); }
};

/* ── Open referral modal ── */
window._openReferral = (patientId, patientName) => {
  const modal = document.getElementById('referral-modal');
  if (modal) modal.style.display = 'flex';
};

/* ── Generate referral letter ── */
window._generateReferral = (patientId, patientName, nationalId, age) => {
  const to       = document.getElementById('ref-to')?.value?.trim();
  const facility = document.getElementById('ref-facility')?.value?.trim();
  const urgency  = document.getElementById('ref-urgency')?.value;
  const reason   = document.getElementById('ref-reason')?.value?.trim();
  const history  = document.getElementById('ref-history')?.value?.trim();
  const meds     = document.getElementById('ref-meds')?.value?.trim();
  const alertEl  = document.getElementById('ref-alert');
  const user     = API.getStoredUser();
  const now      = new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});

  if (!to || !reason) {
    if (alertEl) { alertEl.className='alert alert-error'; alertEl.innerHTML='<i class="ti ti-alert-circle"></i> Refer to and reason are required.'; alertEl.classList.remove('hidden'); }
    return;
  }

  const urgencyLabel = { routine:'Routine (within 4 weeks)', urgent:'Urgent (within 1 week)', emergency:'Emergency (same day)' }[urgency] || urgency;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Referral Letter — ${patientName}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:13px;color:#222;margin:50px;line-height:1.7}
      .letterhead{border-bottom:3px solid #0F6E56;padding-bottom:16px;margin-bottom:24px;display:flex;justify-content:space-between}
      h2{font-size:16px;text-align:center;margin:20px 0;text-transform:uppercase;letter-spacing:.05em}
      .section{margin-bottom:16px}
      .label{font-size:11px;font-weight:600;text-transform:uppercase;color:#888;letter-spacing:.05em}
      .value{margin-top:2px;padding:8px;background:#f9f9f9;border-radius:4px;border-left:3px solid #0F6E56}
      .urgency-box{padding:10px 14px;border-radius:6px;font-weight:600;font-size:14px;margin:16px 0;
        background:${{routine:'#E1F5EE',urgent:'#FAEEDA',emergency:'#FCEBEB'}[urgency]};
        color:${{routine:'#0F6E56',urgent:'#854F0B',emergency:'#A32D2D'}[urgency]};
        border-left:4px solid ${{routine:'#1D9E75',urgent:'#EF9F27',emergency:'#E24B4A'}[urgency]}}
      .sig{margin-top:40px;padding-top:16px;border-top:1px solid #ddd}
      @media print{body{margin:25mm}}
    </style>
  </head><body>
    <div class="letterhead">
      <div>
        <div style="font-size:18px;font-weight:700;color:#0F6E56">NIHMS</div>
        <div style="font-size:12px;color:#888">National Integrated Healthcare Management System</div>
        <div style="font-size:12px;color:#888">${user?.facilityName||'—'}</div>
      </div>
      <div style="text-align:right;font-size:12px;color:#888">
        <div>${now}</div>
        <div>Ref: REF-${Date.now().toString().slice(-6)}</div>
      </div>
    </div>

    <h2>Patient Referral Letter</h2>

    <div class="urgency-box">🚨 Urgency: ${urgencyLabel}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="section"><div class="label">Patient name</div><div class="value">${patientName}</div></div>
      <div class="section"><div class="label">National ID</div><div class="value">${nationalId}</div></div>
      <div class="section"><div class="label">Age</div><div class="value">${age} years</div></div>
      <div class="section"><div class="label">Date</div><div class="value">${now}</div></div>
    </div>

    <div class="section"><div class="label">Refer to</div><div class="value">${to}${facility?' — '+facility:''}</div></div>
    <div class="section"><div class="label">Reason for referral</div><div class="value">${reason}</div></div>
    ${history?`<div class="section"><div class="label">Relevant history &amp; findings</div><div class="value">${history}</div></div>`:''}
    ${meds?`<div class="section"><div class="label">Current medications</div><div class="value">${meds}</div></div>`:''}

    <div class="sig">
      <div>Yours faithfully,</div>
      <div style="margin-top:32px;border-top:1px solid #222;display:inline-block;min-width:200px"></div>
      <div style="font-weight:600;margin-top:4px">Dr. ${user?.firstName||''} ${user?.lastName||''}</div>
      <div style="font-size:12px;color:#888">${user?.facilityName||''}</div>
    </div>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
  document.getElementById('referral-modal').style.display = 'none';
  UI.showToast('Referral letter opened — print or save as PDF','ok');
};

window._printReferral = (patientId, patientName, nationalId, age) => {
  _generateReferral(patientId, patientName, nationalId, age);
};

/* ══════════════════════════════
   TELEMEDICINE (Doctor view — all sessions, not just today)
══════════════════════════════ */
Pages['telemedicine'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('tele-list');
    if (!wrap) return;
    try {
      // Load ALL telemedicine appointments for this doctor (not filtered by date)
      const user = API.getStoredUser();
      const res  = await API.appointments.list({ visitType:'telemedicine', limit:50 });
      const items = (res.data||[]).sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt));

      if (!items.length) {
        wrap.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted)">
          <i class="ti ti-video-off" style="font-size:40px;opacity:.3;display:block;margin-bottom:10px"></i>
          No telemedicine sessions found.
        </div>`;
        return;
      }

      wrap.innerHTML = items.map(a => {
        const when     = new Date(a.scheduledAt);
        const now      = new Date();
        const isLive   = a.status === 'in_progress';
        const isPast   = when < now && !isLive;
        const isSoon   = !isPast && (when - now) < 30*60*1000;
        const canJoin  = !['cancelled','completed'].includes(a.status);
        const canCancel= ['confirmed','pending'].includes(a.status);
        const badge    = {confirmed:'badge-green',pending:'badge-amber',in_progress:'badge-blue',completed:'badge-gray',cancelled:'badge-gray'}[a.status]||'badge-gray';

        return `<div style="padding:14px;margin-bottom:8px;border-radius:var(--radius-lg);
          border:1px solid ${isLive?'var(--green)':isSoon?'var(--amber-mid)':'var(--border)'};
          background:${isLive?'var(--green-light)':isSoon?'var(--amber-light)':'var(--bg-card)'}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
            <div>
              <div style="font-weight:600;font-size:14px;margin-bottom:3px">
                ${a.patient?.firstName||''} ${a.patient?.lastName||''}
                ${isLive?'<span style="font-size:11px;padding:2px 8px;border-radius:20px;background:var(--green);color:#fff;margin-left:8px">● Live</span>':''}
                ${isSoon&&!isLive?'<span style="font-size:11px;padding:2px 8px;border-radius:20px;background:var(--amber-light);color:var(--amber);margin-left:8px">Starting soon</span>':''}
              </div>
              <div style="font-size:12px;color:var(--text-muted)">${a.reason||'Telemedicine consultation'}</div>
              <div style="font-size:12px;color:var(--text-muted)">
                ${when.toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
                at ${when.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                · Token: <strong style="font-family:var(--mono)">${a.queueToken||'—'}</strong>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap">
              <span class="badge ${badge}">${a.status}</span>
              ${canJoin?`<button class="btn btn-sm btn-green" onclick="_docJoinTele('${a._id}')">
                <i class="ti ti-video"></i>${isLive?'Rejoin':isSoon?'Join now':'Start'}
              </button>`:''}
              ${canCancel?`<button class="btn btn-sm" onclick="_docReschedule('${a._id}','${a.visitType}','${new Date(a.scheduledAt).toISOString().slice(0,16)}')">
                <i class="ti ti-calendar-event"></i>Reschedule
              </button>`:''}
              ${canCancel?`<button class="btn btn-sm" style="color:var(--red);border-color:var(--red-mid)" onclick="_docCancelAppt('${a._id}')">
                <i class="ti ti-x"></i>Cancel
              </button>`:''}
            </div>
          </div>
        </div>`;
      }).join('');
    } catch(e) { wrap.innerHTML=`<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`; }
  }, 0);

  return `
    <div class="page-title">Telemedicine sessions</div>
    <div class="alert-box alert-info" style="margin-bottom:14px">
      <i class="ti ti-video"></i>
      Click <strong>Start</strong> to open the video room. Your patient joins via their appointment link.
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div class="card-title" style="margin:0"><i class="ti ti-calendar-event"></i>All sessions</div>
        <button class="btn btn-xs" onclick="Router.setPage('telemedicine')"><i class="ti ti-refresh"></i>Refresh</button>
      </div>
      <div id="tele-list" style="color:var(--text-muted);padding:16px">Loading…</div>
    </div>`;
};

/* ══════════════════════════════
   PATIENTS
══════════════════════════════ */
Pages['patients'] = () => {
  setTimeout(() => _loadPatients(''), 0);
  return `
    <div class="page-title">Patient search</div>
    <div class="card">
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <input class="f-input" style="margin:0;flex:1" id="patient-search" placeholder="Search by name, national ID, MRN, or phone…"
          onkeydown="if(event.key==='Enter')_loadPatients(this.value)">
        <button class="btn btn-green" onclick="_loadPatients(document.getElementById('patient-search').value)"><i class="ti ti-search"></i>Search</button>
      </div>
      <div id="patient-table-wrap"><div style="color:var(--text-muted);padding:16px">Loading…</div></div>
    </div>`;
};

window._loadPatients = async (q) => {
  const wrap = document.getElementById('patient-table-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div style="color:var(--text-muted);padding:16px">Searching…</div>';
  try {
    const res = await API.patients.list({ q, limit:20 });
    const rows = (res.data||[]).map(p=>`<tr>
      <td><div style="display:flex;align-items:center;gap:8px">
        <div class="avatar" style="width:28px;height:28px;font-size:11px;background:var(--blue-light);color:var(--blue)">${p.initials||'??'}</div>
        ${p.fullName||p.firstName+' '+p.lastName}
      </div></td>
      <td><span style="font-family:var(--mono);font-size:12px;color:var(--text-muted)">${p.nationalId||'—'}</span></td>
      <td style="font-family:var(--mono);font-size:12px;color:var(--text-muted)">${p.mrn||'—'}</td>
      <td>${p.age||'?'}</td>
      <td><span class="badge ${p.isVerified?'badge-green':'badge-amber'}">${p.isVerified?'Verified':'Pending'}</span></td>
      <td><button class="btn btn-xs btn-green" onclick="_openPatientConsult('${p._id}')"><i class="ti ti-stethoscope"></i>Open</button></td>
    </tr>`).join('');
    wrap.innerHTML = rows
      ? `<table><tr><th>Patient</th><th>National ID</th><th>MRN</th><th>Age</th><th>Status</th><th></th></tr>${rows}</table>`
      : '<p style="color:var(--text-muted);padding:16px">No patients found.</p>';
  } catch(e) { wrap.innerHTML=`<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`; }
};

window._openPatientConsult = (patientId) => {
  Router.setPage('consult');
  setTimeout(() => {
    const sel = document.getElementById('consult-patient-sel');
    if (sel) { sel.value = patientId; _loadConsultPatient(patientId); }
  }, 300);
};

/* ══════════════════════════════
   LAB ORDERS
══════════════════════════════ */
Pages['lab'] = () => {
  setTimeout(async () => {
    const [patEl, pendEl] = [document.getElementById('lab-patient'), document.getElementById('lab-pending')];
    try {
      const [pRes, lRes] = await Promise.all([
        API.patients.list({ limit:20 }),
        API.labs.list({ limit:10 })
      ]);
      if (patEl) patEl.innerHTML = '<option value="">— Select patient —</option>' +
        (pRes.data||[]).map(p=>`<option value="${p._id}">${p.fullName||p.firstName+' '+p.lastName}</option>`).join('');
      if (pendEl) {
        const rows = (lRes.data||[]).map(l=>`<tr>
          <td>${l.patient?.firstName||''} ${l.patient?.lastName||''}</td>
          <td style="color:var(--text-muted);font-size:12px">${(l.tests||[]).map(t=>t.name).join(', ')}</td>
          <td style="font-size:12px">${l.priority}</td>
          <td><span class="badge ${_badge(l.status)}">${l.status}</span></td>
        </tr>`).join('');
        pendEl.innerHTML = rows || '<tr><td colspan="4" style="color:var(--text-muted);text-align:center;padding:20px">No pending orders.</td></tr>';
      }
    } catch(e) { if(patEl) patEl.innerHTML='<option>Failed to load</option>'; }
  }, 0);

  return `
    <div class="page-title">Lab orders</div>
    <div class="two-col">
      <div class="card">
        <div class="card-title"><i class="ti ti-flask"></i>New lab order</div>
        <div class="f-group"><label class="f-label">Patient</label>
          <select class="f-select" id="lab-patient" style="margin:0"><option>Loading…</option></select></div>
        <div class="f-group" style="margin-top:10px"><label class="f-label">Tests</label>
          ${['HbA1c','Fasting glucose','Lipid profile','Urea & electrolytes','Full blood count','CRP','HIV rapid','Sputum culture'].map(t=>`
            <label class="checkbox-label" style="margin-bottom:7px"><input type="checkbox" class="lab-test" value="${t}">${t}</label>`).join('')}</div>
        <div class="f-group"><label class="f-label">Priority</label>
          <select class="f-select" id="lab-priority" style="margin:0">
            <option value="routine">Routine (24–48hr)</option>
            <option value="urgent">Urgent (4hr)</option>
            <option value="stat">STAT (1hr)</option>
          </select></div>
        <div class="f-group" style="margin-top:10px"><label class="f-label">Notes for lab</label>
          <textarea class="f-textarea" style="height:70px" id="lab-notes" placeholder="Clinical context…"></textarea></div>
        <button class="btn btn-green" onclick="_submitLabOrder()"><i class="ti ti-send"></i>Submit order</button>
      </div>
      <div class="card">
        <div class="card-title"><i class="ti ti-clock"></i>Pending results</div>
        <table><tr><th>Patient</th><th>Tests</th><th>Priority</th><th>Status</th></tr>
        <tbody id="lab-pending"><tr><td colspan="4" style="color:var(--text-muted)">Loading…</td></tr></tbody></table>
      </div>
    </div>`;
};

window._submitLabOrder = async () => {
  const patientId = document.getElementById('lab-patient')?.value;
  const priority  = document.getElementById('lab-priority')?.value;
  const notes     = document.getElementById('lab-notes')?.value;
  const tests     = [...document.querySelectorAll('.lab-test:checked')].map(el=>({ name: el.value }));
  const user      = API.getStoredUser();
  if (!patientId || !tests.length) { UI.showToast('Select a patient and at least one test','err'); return; }
  try {
    await API.labs.create({ patient: patientId, facility: user?.facilityId, tests, priority, clinicalNotes: notes });
    UI.showToast('Lab order submitted','ok');
    Router.setPage('lab');
  } catch(e) { UI.showToast(e.message,'err'); }
};

/* ── Toggle vitals edit form ── */
window._toggleVitalsEdit = function(patientId) {
  var form = document.getElementById('vitals-edit-' + patientId);
  if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

/* ── Save updated vitals ── */
window._saveVitals = async function(patientId) {
  const sys    = parseFloat(document.getElementById('v-systolic')?.value) || null;
  const dia    = parseFloat(document.getElementById('v-diastolic')?.value) || null;
  const hr     = parseFloat(document.getElementById('v-hr')?.value) || null;
  const temp   = parseFloat(document.getElementById('v-temp')?.value) || null;
  const spo2   = parseFloat(document.getElementById('v-spo2')?.value) || null;
  const weight = parseFloat(document.getElementById('v-weight')?.value) || null;
  const height = parseFloat(document.getElementById('v-height')?.value) || null;
  const statusEl = document.getElementById('vitals-save-status');

  if (!sys && !hr && !temp) {
    if (statusEl) { statusEl.style.color = 'var(--red)'; statusEl.textContent = 'Please enter at least one vital sign.'; }
    return;
  }

  /* Calculate BMI if height + weight provided */
  let bmi = null;
  if (height && weight) {
    const hm = height / 100;
    bmi = Math.round(weight / (hm * hm) * 10) / 10;
  }

  const vitals = {
    ...(sys && dia ? { bp: { systolic: sys, diastolic: dia } } : {}),
    ...(hr     ? { heartRate: hr }     : {}),
    ...(temp   ? { temperature: temp } : {}),
    ...(spo2   ? { spO2: spo2 }       : {}),
    ...(weight ? { weight: weight }    : {}),
    ...(height ? { height: height }    : {}),
    ...(bmi    ? { bmi: bmi }          : {}),
    recordedAt: new Date().toISOString(),
    recordedBy: API.getStoredUser()?._id,
  };

  try {
    if (statusEl) { statusEl.style.color = 'var(--text-muted)'; statusEl.textContent = 'Saving…'; }

    /* Try patient vitals endpoint first, fall back to updating via appointment */
    let vitsSaved = false;
    try {
      await API._fetchDirect('/patients/' + patientId + '/profile', {
        method: 'PATCH',
        body: JSON.stringify({ latestVitals: vitals })
      });
      vitsSaved = true;
    } catch(profileErr) {
      /* Fall back to appointment status update with vitals in body */
      try {
        const apptRes = await API.appointments.list({ patient: patientId, limit: 5 });
        const todayAppts = (apptRes.data||[]).filter(a => {
          const d = new Date(a.scheduledAt);
          const t = new Date();
          return d.getFullYear()===t.getFullYear() && d.getMonth()===t.getMonth() && d.getDate()===t.getDate();
        });
        if (todayAppts.length) {
          await API._fetchDirect('/appointments/' + todayAppts[0]._id + '/status', {
            method: 'PATCH',
            body: JSON.stringify({ status: 'in_progress', vitals })
          });
          vitsSaved = true;
        }
      } catch(_) {}
    }
    if (!vitsSaved) throw new Error('Could not save vitals — please check your backend routes');

    if (statusEl) { statusEl.style.color = 'var(--green-dark)'; statusEl.textContent = '✅ Vitals saved successfully'; }
    UI.showToast('Vitals updated', 'ok');

    /* Update the vitals display inline */
    const displayEl = document.getElementById('vitals-display-' + patientId);
    if (displayEl && sys) {
      const bpEl = displayEl.querySelector('.vital-box:first-child .vital-val');
      if (bpEl) bpEl.textContent = sys + '/' + dia;
    }

    /* Hide the form after 1.5s */
    setTimeout(function() {
      const form = document.getElementById('vitals-edit-' + patientId);
      if (form) form.style.display = 'none';
      /* Reload to show fresh data */
      _loadConsultPatient(patientId);
    }, 1500);

  } catch(e) {
    if (statusEl) { statusEl.style.color = 'var(--red)'; statusEl.textContent = e.message || 'Failed to save vitals'; }
  }
};
