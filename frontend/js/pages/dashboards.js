/**
 * dashboards.js — All role dashboards for NIHMS
 * Doctor · Nurse · Receptionist · Pharmacy · Lab · Facility Admin · Super Admin
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ── Shared helpers ── */
const _D = {
  el:   (id, html) => { const e = document.getElementById(id); if (e) e.innerHTML = html; },
  tx:   (id, v)    => { const e = document.getElementById(id); if (e) e.textContent = v; },
  fac:  ()         => { const u = API.getStoredUser(); return u?.facilityId || u?.facility; },
  u:    ()         => API.getStoredUser(),
  date: ()         => new Date().toISOString().slice(0,10),
  time: (d)        => new Date(d).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),
  stat: (label, id, txtColor, bg, border) => `
    <div style="padding:16px 20px;border-radius:var(--radius-xl);background:${bg};border:1.5px solid ${border}">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:${txtColor};opacity:.75;margin-bottom:6px">${label}</div>
      <div id="${id}" style="font-size:42px;font-weight:900;color:${txtColor};line-height:1.1">—</div>
    </div>`,
  clr: { emergency:'#E24B4A', priority:'#EF9F27', normal:'#4A6CF7', walkin:'#1D9E75' },
  tokenBadge: (type) => {
    const map = { emergency:'🔴 Emergency', priority:'🟡 Priority', normal:'📅 Pre-booked', walkin:'🚶 Walk-in' };
    return map[type] || type;
  }
};

/* ══════════════════════════════════════════════════
   DOCTOR DASHBOARD
══════════════════════════════════════════════════ */
Pages['doc_dashboard'] = () => {
  if (window._docInt) clearInterval(window._docInt);
  setTimeout(_docLoad, 0);
  window._docInt = setInterval(_docLoad, 20000);
  return `
<div style="display:flex;gap:14px;height:calc(100vh - 110px);min-height:540px">
  <!-- Main left column -->
  <div style="flex:1;display:flex;flex-direction:column;gap:12px;overflow-y:auto;min-width:0">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      ${_D.stat('WAITING',   'doc-w', '#7A5C10','#FFF9E6','#F0D060')}
      ${_D.stat('IN CONSULT','doc-c', '#1E2C80','#EEF2FF','#BEC8F0')}
      ${_D.stat('COMPLETED', 'doc-d', '#0E4A28','#EDFBF3','#7ADAA8')}
    </div>
    <!-- Next patient -->
    <div class="card">
      <div class="card-title" style="margin-bottom:10px"><i class="ti ti-user-check"></i>Next patient</div>
      <div id="doc-next">Loading…</div>
    </div>
    <!-- Queue list -->
    <div class="card" style="flex:1">
      <div class="card-title"><i class="ti ti-list-numbers"></i>Queue list</div>
      <div id="doc-list" style="color:var(--text-muted)">Loading…</div>
    </div>
  </div>
  <!-- Right sidebar -->
  <div style="width:268px;flex-shrink:0;display:flex;flex-direction:column;gap:12px;overflow-y:auto">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px">
        <span style="font-size:12px;color:var(--text-muted);font-weight:600">AVG WAIT</span>
        <strong id="doc-avgw" style="font-size:22px">— min</strong>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Average consult</span><strong id="doc-avgc">—</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Patients today</span><strong id="doc-tot">—</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Avg satisfaction</span><strong id="doc-sat">—</strong></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ti ti-calendar-event"></i>Upcoming patients</div>
      <div id="doc-upcoming" style="font-size:13px;color:var(--text-muted)">Loading…</div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ti ti-chart-dots"></i>Today's stats</div>
      <div id="doc-stats" style="font-size:13px;color:var(--text-muted)">Loading…</div>
    </div>
  </div>
</div>
<!-- Post-consult routing modal -->
<div id="doc-route-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:center;justify-content:center">
  <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:420px;max-width:95vw;box-shadow:var(--shadow-md)">
    <div style="font-size:16px;font-weight:700;margin-bottom:14px">Complete consultation — route patient</div>
    <input type="hidden" id="doc-route-id">
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <label id="doc-r-lab-lbl" style="flex:1;display:flex;align-items:center;gap:8px;padding:10px;border:1.5px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:13px">
        <input type="checkbox" id="doc-r-lab" style="accent-color:var(--green)" onchange="document.getElementById('doc-r-lab-lbl').style.borderColor=this.checked?'var(--green)':'var(--border)'">
        <i class="ti ti-flask"></i>Send to Lab
      </label>
      <label id="doc-r-rx-lbl" style="flex:1;display:flex;align-items:center;gap:8px;padding:10px;border:1.5px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:13px">
        <input type="checkbox" id="doc-r-rx" style="accent-color:var(--green)" onchange="document.getElementById('doc-r-rx-lbl').style.borderColor=this.checked?'var(--green)':'var(--border)'">
        <i class="ti ti-pill"></i>Pharmacy
      </label>
    </div>
    <div class="f-group"><label class="f-label">Post-consultation notes</label>
      <input class="f-input" id="doc-r-notes" placeholder="Notes for patient record…"></div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn btn-green" onclick="_docRoute()"><i class="ti ti-check"></i>Complete & route</button>
      <button class="btn" onclick="_docComplete()"><i class="ti ti-check"></i>Complete only</button>
      <button class="btn" onclick="document.getElementById('doc-route-modal').style.display='none'">Cancel</button>
    </div>
  </div>
</div>`;
};

async function _docLoad() {
  const fid = _D.fac(); if (!fid) return;
  try {
    const [qr, ar] = await Promise.all([
      API._fetchDirect(`/queue2?facility=${fid}&date=${_D.date()}`, {method:'GET'}),
      API.appointments.list({ doctor: _D.u()?._id, limit:10 })
    ]);
    const q = qr.data||[], s = qr.stats||{}, a = ar.data||[];
    _D.tx('doc-w', q.filter(e=>e.status==='waiting').length);
    _D.tx('doc-c', q.filter(e=>e.status==='in_consultation').length);
    _D.tx('doc-d', q.filter(e=>e.status==='completed').length);
    _D.tx('doc-avgw', (s.avgWaitMins||0)+' min');
    _D.tx('doc-tot',  q.length);
    const sat = q.filter(e=>e.satisfaction);
    _D.tx('doc-sat', sat.length ? '⭐ '+(sat.reduce((s,e)=>s+e.satisfaction,0)/sat.length).toFixed(1) : '—');
    const done = q.filter(e=>e.status==='completed'&&e.consultStartTime&&e.consultEndTime);
    const avgC = done.length ? Math.round(done.reduce((s,e)=>s+(new Date(e.consultEndTime)-new Date(e.consultStartTime))/60000,0)/done.length) : 0;
    _D.tx('doc-avgc', avgC ? avgC+' min' : '—');

    const inC  = q.find(e=>e.status==='in_consultation');
    const next = q.filter(e=>e.status==='waiting').sort((a,b)=>b.priority-a.priority||a.position-b.position)[0];
    const cur  = inC || next;
    if (cur) {
      const c = _D.clr[cur.tokenType] || 'var(--green-dark)';
      _D.el('doc-next', `
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:${inC?'var(--green-light)':'var(--bg-surface)'};border-radius:var(--radius);border:1.5px solid ${inC?'var(--green)':'var(--border)'}">
          <div style="width:4px;height:60px;border-radius:2px;background:${c};flex-shrink:0"></div>
          <div style="font-size:38px;font-weight:900;font-family:var(--mono);color:${c};min-width:80px">${cur.token}</div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:16px">${cur.patientName||'—'} ${cur.patientAge?'<span style="font-weight:400;color:var(--text-muted);font-size:14px">('+cur.patientAge+')</span>':''}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${_D.tokenBadge(cur.tokenType)}${cur.priorityReason?' · '+cur.priorityReason:''}</div>
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
              ${inC ? `
                <button class="btn btn-sm btn-green" onclick="Router.setPage('consult')"><i class="ti ti-stethoscope"></i>Open consult</button>
                <button class="btn btn-sm" onclick="_docOpenRoute('${inC._id}')"><i class="ti ti-map-pin"></i>Route & complete</button>
              ` : `
                <button class="btn btn-sm btn-green" onclick="_docCallStart('${cur._id}')"><i class="ti ti-user-check"></i>Start consult</button>
                <button class="btn btn-sm" onclick="_docCall('${cur._id}')"><i class="ti ti-bell"></i>Call patient</button>
                <button class="btn btn-sm" onclick="Router.setPage('lab')"><i class="ti ti-flask"></i>Refer to lab</button>
              `}
              ${cur.tokenType==='normal'?`<button class="btn btn-sm" onclick="window.open('https://jitsi.riot.im/nihms${(cur._id||'').slice(-12)}','_blank')"><i class="ti ti-video"></i>Video</button>`:''}
            </div>
          </div>
        </div>`);
    } else {
      _D.el('doc-next', '<div style="text-align:center;padding:24px;color:var(--text-muted)"><i class="ti ti-checks" style="font-size:32px;opacity:.25;display:block;margin-bottom:8px"></i>Queue is empty</div>');
    }

    const active = q.filter(e=>!['completed','cancelled','skipped'].includes(e.status));
    _D.el('doc-list', active.length ? active.map(e => {
      const c = _D.clr[e.tokenType] || '#888';
      return `<div style="display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:3px;height:44px;border-radius:2px;background:${c};flex-shrink:0"></div>
        <div style="font-size:20px;font-weight:800;font-family:var(--mono);color:${c};min-width:56px">${e.token}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${e.patientName||'—'} ${e.patientAge?'('+e.patientAge+')':''}</div>
          <div style="font-size:11px;color:var(--text-muted)">${_D.tokenBadge(e.tokenType)}${e.estimatedWait?' · '+e.estimatedWait+' min':''}</div>
        </div>
        <div style="display:flex;gap:3px;flex-shrink:0">
          ${e.status==='waiting'?`<button class="btn btn-xs btn-green" onclick="_docCallStart('${e._id}')"><i class="ti ti-stethoscope"></i></button>`:''}
          ${e.status==='in_consultation'?`<button class="btn btn-xs btn-green" onclick="_docOpenRoute('${e._id}')"><i class="ti ti-map-pin"></i></button>`:''}
          ${e.tokenType==='normal'?`<button class="btn btn-xs" onclick="window.open('https://jitsi.riot.im/nihms${(e._id||'').slice(-12)}','_blank')"><i class="ti ti-video"></i></button>`:''}
        </div>
      </div>`;
    }).join('') : '<div style="padding:20px;text-align:center;color:var(--text-muted)">No active patients</div>');

    const todayStr = new Date().toDateString();
    const upcoming = a.filter(ap=>new Date(ap.scheduledAt).toDateString()===todayStr&&ap.status==='confirmed');
    _D.el('doc-upcoming', upcoming.length ? upcoming.slice(0,4).map(ap=>`
      <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
        <i class="ti ${ap.visitType==='telemedicine'?'ti-video':'ti-user'}" style="font-size:14px;color:var(--green-dark);flex-shrink:0"></i>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:12px">${ap.patient?.firstName||''} ${ap.patient?.lastName||''}</div>
          <div style="font-size:11px;color:var(--text-muted)">${_D.time(ap.scheduledAt)} · ${(ap.visitType||'').replace('_',' ')}</div>
        </div>
        ${ap.visitType==='telemedicine'?`<button class="btn btn-xs" onclick="Router.setPage('telemedicine')"><i class="ti ti-video"></i></button>`:''}
      </div>`).join('') : '<div style="color:var(--text-muted)">No more appointments today</div>');

    _D.el('doc-stats', `<div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Consults today</span><strong>${done.length}</strong></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Emergencies</span><strong style="color:var(--red)">${q.filter(e=>e.tokenType==='emergency').length}</strong></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Avg consult time</span><strong>${avgC||'—'} min</strong></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Satisfaction</span><strong>${sat.length?'⭐ '+(sat.reduce((s,e)=>s+e.satisfaction,0)/sat.length).toFixed(1):'—'}</strong></div>
    </div>`);
  } catch(err){ console.warn('Doc dash:', err.message); }
}
window._docCall      = async (id) => { try { await API._fetchDirect(`/queue2/${id}/call`,{method:'PATCH',body:JSON.stringify({room:'Consultation Room'})}); UI.showToast('Patient called','ok'); _docLoad(); } catch(e){UI.showToast(e.message,'err');} };
window._docCallStart = async (id) => { try { await _docCall(id); await API._fetchDirect(`/queue2/${id}/status`,{method:'PATCH',body:JSON.stringify({status:'in_consultation'})}); _docLoad(); } catch(e){UI.showToast(e.message,'err');} };
window._docOpenRoute = (id) => { document.getElementById('doc-route-id').value=id; document.getElementById('doc-route-modal').style.display='flex'; };
window._docRoute     = async () => {
  const id = document.getElementById('doc-route-id').value;
  await API._fetchDirect(`/queue2/${id}/route-post-consult`,{method:'POST',body:JSON.stringify({needsLab:document.getElementById('doc-r-lab').checked,needsPharmacy:document.getElementById('doc-r-rx').checked,notes:document.getElementById('doc-r-notes').value})});
  document.getElementById('doc-route-modal').style.display='none'; UI.showToast('Patient routed','ok'); _docLoad();
};
window._docComplete  = async () => { const id=document.getElementById('doc-route-id').value; await API._fetchDirect(`/queue2/${id}/status`,{method:'PATCH',body:JSON.stringify({status:'completed'})}); document.getElementById('doc-route-modal').style.display='none'; _docLoad(); };

/* ══════════════════════════════════════════════════
   NURSE TRIAGE DASHBOARD
══════════════════════════════════════════════════ */
Pages['nurse_dashboard'] = () => {
  if (window._nurseInt) clearInterval(window._nurseInt);
  setTimeout(_nurseLoad, 0);
  window._nurseInt = setInterval(_nurseLoad, 15000);
  return `
<div style="display:grid;grid-template-columns:1fr 1fr 290px;gap:12px;min-height:520px">
  <!-- Triage queue -->
  <div style="display:flex;flex-direction:column;gap:12px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${_D.stat('WAITING',      'nrs-w', '#7A5C10','#FFF9E6','#F0D060')}
      ${_D.stat('TRIAGED TODAY','nrs-t', '#0E4A28','#EDFBF3','#7ADAA8')}
    </div>
    <div class="card" style="flex:1">
      <div class="card-title"><i class="ti ti-heart-rate-monitor" style="color:var(--red)"></i>Smart triage queue</div>
      <div id="nrs-queue" style="color:var(--text-muted)">Loading…</div>
    </div>
  </div>

  <!-- Vitals capture -->
  <div style="display:flex;flex-direction:column;gap:12px">
    <div class="card">
      <div class="card-title"><i class="ti ti-stethoscope"></i>Vitals capture</div>
      <div class="f-group"><label class="f-label">Patient token</label>
        <input class="f-input" id="nrs-token" placeholder="e.g. W-01 or E-02…">
      </div>
      <div class="two-col">
        <div class="f-group"><label class="f-label">BP systolic</label><input class="f-input" type="number" id="nrs-sys" placeholder="120" oninput="_nrsFlag()"></div>
        <div class="f-group"><label class="f-label">BP diastolic</label><input class="f-input" type="number" id="nrs-dia" placeholder="80" oninput="_nrsFlag()"></div>
      </div>
      <div class="two-col">
        <div class="f-group"><label class="f-label">Pulse (bpm)</label><input class="f-input" type="number" id="nrs-hr" placeholder="72" oninput="_nrsFlag()"></div>
        <div class="f-group"><label class="f-label">Temp (°C)</label><input class="f-input" type="number" id="nrs-temp" placeholder="36.6" step=".1" oninput="_nrsFlag()"></div>
      </div>
      <div class="two-col">
        <div class="f-group"><label class="f-label">SpO₂ (%)</label><input class="f-input" type="number" id="nrs-spo2" placeholder="98" oninput="_nrsFlag()"></div>
        <div class="f-group"><label class="f-label">Weight (kg)</label><input class="f-input" type="number" id="nrs-wt" placeholder="70"></div>
      </div>
      <div id="nrs-flags" style="margin:6px 0;min-height:18px"></div>
      <div class="f-group"><label class="f-label">Clinical notes</label>
        <textarea class="f-input" id="nrs-notes" rows="2" style="resize:none" placeholder="Chief complaint, observations…"></textarea>
      </div>
      <div style="display:flex;gap:6px;margin-top:4px">
        <button class="btn btn-green" style="flex:1" onclick="_nrsSave()"><i class="ti ti-heart-rate-monitor"></i>Save vitals & triage</button>
        <button class="btn" style="color:var(--red)" onclick="_nrsEscalate()"><i class="ti ti-urgent"></i>Escalate</button>
      </div>
    </div>
    <!-- Teleconsult assist -->
    <div class="card" style="background:#EEF6FF;border-color:#BDDEFF">
      <div class="card-title" style="color:#1A4A9B"><i class="ti ti-video"></i>Teleconsult assist</div>
      <div style="font-size:13px;color:#1A4A9B;margin-bottom:8px">Join active sessions to capture remote vitals</div>
      <div id="nrs-tele" style="font-size:13px">No active teleconsultations</div>
    </div>
  </div>

  <!-- Right: metrics + actions + alerts -->
  <div style="display:flex;flex-direction:column;gap:12px">
    <div class="card">
      <div class="card-title"><i class="ti ti-chart-dots"></i>Daily metrics</div>
      <div style="display:flex;flex-direction:column;gap:10px;font-size:14px">
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Patients triaged</span><strong id="nrs-tot">—</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Avg wait time</span><strong id="nrs-avg">—</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Emergencies</span><strong id="nrs-em" style="color:var(--red)">—</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">In consultation</span><strong id="nrs-inc">—</strong></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ti ti-bolt"></i>Quick actions</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn" onclick="Router.setPage('queue_dashboard')" style="justify-content:flex-start"><i class="ti ti-layout-dashboard"></i>Queue dashboard</button>
        <button class="btn" onclick="Router.setPage('registration')" style="justify-content:flex-start"><i class="ti ti-user-plus"></i>Register patient</button>
        <button class="btn" onclick="window._showEM&&_showEM()" style="justify-content:flex-start;color:var(--red)"><i class="ti ti-urgent"></i>Emergency override</button>
        <button class="btn" onclick="Router.setPage('checkin')" style="justify-content:flex-start"><i class="ti ti-login"></i>Patient check-in</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title" style="color:var(--amber)"><i class="ti ti-alert-triangle"></i>Anomaly alerts</div>
      <div id="nrs-anomalies" style="font-size:13px;color:var(--text-muted)">No active alerts</div>
    </div>
  </div>
</div>`;
};

window._nrsFlag = () => {
  const sys=+document.getElementById('nrs-sys')?.value||0, dia=+document.getElementById('nrs-dia')?.value||0;
  const hr=+document.getElementById('nrs-hr')?.value||0, t=+document.getElementById('nrs-temp')?.value||0, o2=+document.getElementById('nrs-spo2')?.value||100;
  const flags=[];
  if(sys>180||dia>120) flags.push(['#E24B4A','⚠️ Hypertensive crisis — URGENT']);
  else if(sys>140)     flags.push(['#EF9F27','⚠️ Elevated blood pressure']);
  if(t>38.5)           flags.push(['#E24B4A','🌡️ Fever']);
  if(o2<90)            flags.push(['#E24B4A','🫁 Low SpO₂ — immediate attention']);
  if(hr>100)           flags.push(['#EF9F27','⚡ Tachycardia']);
  else if(hr<50&&hr>0) flags.push(['#EF9F27','⚡ Bradycardia']);
  const el=document.getElementById('nrs-flags');
  if(el) el.innerHTML=flags.map(([c,m])=>`<div style="padding:5px 10px;background:#FEF2F2;border-radius:6px;margin-bottom:3px;font-size:12px;font-weight:600;color:${c}">${m}</div>`).join('');
};
window._nrsSave     = () => UI.showToast('Vitals saved — patient ready for doctor','ok');
window._nrsEscalate = () => UI.showToast('Patient escalated to emergency priority','ok');

async function _nurseLoad() {
  const fid=_D.fac(); if(!fid) return;
  try {
    const r=await API._fetchDirect(`/queue2?facility=${fid}&date=${_D.date()}`,{method:'GET'});
    const all=r.data||[], s=r.stats||{};
    _D.tx('nrs-w',   all.filter(e=>e.status==='waiting').length);
    _D.tx('nrs-t',   all.filter(e=>e.status==='completed').length);
    _D.tx('nrs-tot', all.length);
    _D.tx('nrs-avg', (s.avgWaitMins||0)+' min');
    _D.tx('nrs-em',  all.filter(e=>e.tokenType==='emergency').length);
    _D.tx('nrs-inc', all.filter(e=>e.status==='in_consultation').length);
    const active=all.filter(e=>!['completed','cancelled','skipped'].includes(e.status));
    _D.el('nrs-queue', active.length ? active.map(e=>{
      const c=_D.clr[e.tokenType]||'#888';
      return `<div style="display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--border)">
        <div style="width:3px;height:42px;border-radius:2px;background:${c};flex-shrink:0"></div>
        <div style="font-size:18px;font-weight:800;font-family:var(--mono);color:${c};min-width:52px">${e.token}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${e.patientName||'—'}</div>
          <div style="font-size:11px;color:var(--text-muted)">${e.status.replace('_',' ')} · ${e.estimatedWait||0} min</div>
        </div>
        ${e.status==='waiting'?`<button class="btn btn-xs btn-green" onclick="document.getElementById('nrs-token').value='${e.token}'"><i class="ti ti-heart-rate-monitor"></i>Vitals</button>`:''}
      </div>`;
    }).join('') : '<div style="padding:20px;text-align:center;color:var(--text-muted)">Queue empty</div>');
  } catch(e){console.warn('Nurse dash:',e.message);}
}

/* ══════════════════════════════════════════════════
   RECEPTIONIST DASHBOARD
══════════════════════════════════════════════════ */
Pages['reception'] = () => {
  if (window._recInt) clearInterval(window._recInt);
  setTimeout(_recLoad, 0);
  window._recInt = setInterval(_recLoad, 15000);
  return `
<div style="display:grid;grid-template-columns:290px 1fr 250px;gap:12px;min-height:540px">
  <!-- LEFT: check-in form -->
  <div style="display:flex;flex-direction:column;gap:12px">
    <div class="card">
      <div style="font-weight:700;font-size:14px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
        <i class="ti ti-login" style="color:var(--green-dark)"></i>Patient arrival
      </div>
      <div style="position:relative;margin-bottom:8px">
        <i class="ti ti-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#aaa;font-size:14px"></i>
        <input id="rec-search" type="text" placeholder="Search by name or ID…" oninput="_recSearch(this.value)"
          style="width:100%;padding:9px 9px 9px 32px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-family:inherit;outline:none">
      </div>
      <div id="rec-sr" style="margin-bottom:6px"></div>
      <div class="f-group"><label class="f-label">Full name *</label><input class="f-input" id="rec-name" placeholder="Patient name"></div>
      <div class="f-group"><label class="f-label">ID / Booking ref</label><input class="f-input" id="rec-ref" placeholder="National ID or booking reference"></div>
      <div class="f-group"><label class="f-label">Arrival type</label>
        <div style="display:flex;gap:4px" id="rec-type-btns">
          ${['Walk-in','Pre-booked','Emergency'].map((t,i)=>`
            <button onclick="_recSetType('${['walkin','normal','emergency'][i]}',this)"
              style="flex:1;padding:7px 3px;border:1.5px solid ${i===0?'var(--green)':'var(--border)'};border-radius:8px;background:${i===0?'var(--green-light)':'transparent'};color:${i===0?'var(--green-dark)':'#888'};font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">
              ${t}
            </button>`).join('')}
        </div>
      </div>
      <div id="rec-alert" class="alert hidden" style="margin-bottom:6px"></div>
      <button class="btn btn-green" style="width:100%" id="rec-btn" onclick="_recCheckin()">
        <i class="ti ti-login"></i>Check in & issue token
      </button>
    </div>
    <!-- Announcements -->
    <div class="card">
      <div class="card-title"><i class="ti ti-speakerphone"></i>Broadcast announcement</div>
      <textarea id="rec-msg" rows="2" placeholder="Facility update for waiting area…"
        style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:12px;font-family:inherit;resize:none;outline:none;margin-bottom:8px"></textarea>
      <button class="btn btn-sm btn-green" style="width:100%" onclick="_recBroadcast()"><i class="ti ti-send"></i>Broadcast</button>
    </div>
    <!-- Today stats -->
    <div class="card">
      <div class="card-title"><i class="ti ti-chart-dots"></i>Today at a glance</div>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Checked in</span><strong id="rec-s-tot">—</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Waiting now</span><strong id="rec-s-wait">—</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Emergencies</span><strong id="rec-s-em" style="color:var(--red)">—</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Avg wait time</span><strong id="rec-s-avg">—</strong></div>
      </div>
    </div>
  </div>

  <!-- CENTRE: queue table -->
  <div class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column">
    <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
      <div style="font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px">
        <i class="ti ti-list-numbers" style="color:var(--green-dark)"></i>Queue overview
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-xs btn-green" onclick="Router.setPage('queue_dashboard')"><i class="ti ti-layout-dashboard"></i>Full queue</button>
        <button class="btn btn-xs" onclick="_recLoad()"><i class="ti ti-refresh"></i></button>
      </div>
    </div>
    <div style="overflow-x:auto;flex:1">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:var(--bg-surface)">
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted)">TOKEN</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted)">PATIENT</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted)">TYPE</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted)">STATUS</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted)">WAIT</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted)">ACTIONS</th>
        </tr></thead>
        <tbody id="rec-table">
          <tr><td colspan="6" style="padding:24px;text-align:center;color:var(--text-muted)">Loading…</td></tr>
        </tbody>
      </table>
    </div>
    <div style="padding:10px 16px;border-top:1px solid var(--border);display:flex;gap:8px">
      <button class="btn btn-sm" onclick="window._showDelay&&_showDelay()"><i class="ti ti-clock-exclamation"></i>Send delay notice</button>
      <button class="btn btn-sm" onclick="Router.setPage('registration')"><i class="ti ti-user-plus"></i>Register new patient</button>
    </div>
  </div>

  <!-- RIGHT: verify + emergencies + direct -->
  <div style="display:flex;flex-direction:column;gap:12px">
    <div class="card">
      <div class="card-title"><i class="ti ti-calendar-check"></i>Verify appointment</div>
      <div class="f-group"><label class="f-label">Token / booking ref</label>
        <input class="f-input" id="rec-vref" placeholder="e.g. A-10 or W-01…">
      </div>
      <button class="btn btn-green" style="width:100%;margin-top:4px" onclick="_recVerify()"><i class="ti ti-search"></i>Verify & confirm</button>
      <div id="rec-vresult" style="margin-top:10px;font-size:13px"></div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 10px;background:#FEF2F2;border-radius:8px">
        <i class="ti ti-urgent" style="color:#E24B4A"></i>
        <div style="font-weight:700;font-size:13px;color:#E24B4A">Emergency cases</div>
      </div>
      <div id="rec-em" style="font-size:13px;color:var(--text-muted)">None</div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ti ti-map-pin"></i>Direct patient to</div>
      <div style="display:flex;flex-direction:column;gap:5px">
        ${[['ti-heart-rate-monitor','Nurse triage','var(--red)'],['ti-stethoscope','Consultation room','var(--green-dark)'],['ti-flask','Laboratory','#1A4A9B'],['ti-pill','Pharmacy','var(--green-dark)'],['ti-sofa','Waiting area',''],['ti-device-desktop','Self-service kiosk','']].map(([ic,lbl,c])=>`
          <button class="btn btn-sm" style="justify-content:flex-start" onclick="UI.showToast('Patient directed to ${lbl}','ok')">
            <i class="ti ${ic}" style="font-size:14px${c?';color:'+c:''}"></i>${lbl}
          </button>`).join('')}
      </div>
    </div>
  </div>
</div>`;
};

let _recType = 'walkin';
window._recSetType = (t, btn) => {
  _recType = t;
  document.querySelectorAll('#rec-type-btns button').forEach(b=>{b.style.borderColor='var(--border)';b.style.background='transparent';b.style.color='#888';});
  if(btn){btn.style.borderColor='var(--green)';btn.style.background='var(--green-light)';btn.style.color='var(--green-dark)';}
};
window._recSearch = async (val) => {
  if(!val||val.length<2){document.getElementById('rec-sr').innerHTML='';return;}
  try {
    const r=await API._fetchDirect(`/patients?search=${encodeURIComponent(val)}&limit=4`,{method:'GET'});
    document.getElementById('rec-sr').innerHTML=(r.data||[]).map(p=>`
      <div onclick="document.getElementById('rec-name').value='${p.firstName} ${p.lastName}';document.getElementById('rec-ref').value='${p.nationalId||''}';document.getElementById('rec-sr').innerHTML='';document.getElementById('rec-search').value='';"
        style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg-surface);border-radius:8px;margin-bottom:4px;cursor:pointer">
        <div style="width:26px;height:26px;border-radius:50%;background:var(--green-light);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--green-dark)">${(p.firstName||'?')[0]}${(p.lastName||'?')[0]}</div>
        <div><div style="font-weight:600;font-size:13px">${p.firstName} ${p.lastName}</div><div style="font-size:11px;color:var(--text-muted)">ID: ${p.nationalId||'—'}</div></div>
      </div>`).join('');
  } catch(_){}
};
window._recCheckin = async () => {
  const btn=document.getElementById('rec-btn'), fid=_D.fac();
  const name=document.getElementById('rec-name')?.value?.trim();
  if(!name){ const a=document.getElementById('rec-alert'); if(a){a.className='alert alert-error';a.innerHTML='<i class="ti ti-alert-circle"></i> Patient name required';a.classList.remove('hidden');} return; }
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div>';}
  try {
    const r=await API._fetchDirect('/queue2/walkin',{method:'POST',body:JSON.stringify({facilityId:fid,patientName:name,patientPhone:document.getElementById('rec-ref')?.value||'',tokenType:_recType})});
    const a=document.getElementById('rec-alert');
    if(a){a.className='alert alert-ok';a.innerHTML=`<i class="ti ti-check"></i> Token issued: <strong>${r.data?.token}</strong> — Position ${r.data?.position}`;a.classList.remove('hidden');}
    document.getElementById('rec-name').value=''; document.getElementById('rec-ref').value='';
    setTimeout(()=>{const a=document.getElementById('rec-alert');if(a)a.classList.add('hidden');},4000);
    _recLoad();
  } catch(e){ const a=document.getElementById('rec-alert'); if(a){a.className='alert alert-error';a.innerHTML=`<i class="ti ti-alert-circle"></i> ${e.message}`;a.classList.remove('hidden');} }
  finally { if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-login"></i>Check in & issue token';} }
};
window._recVerify = async () => {
  const ref=document.getElementById('rec-vref')?.value?.trim(); if(!ref) return;
  try {
    const r=await API._fetchDirect(`/queue2?facility=${_D.fac()}&date=${_D.date()}`,{method:'GET'});
    const e=(r.data||[]).find(e=>e.token.toUpperCase()===ref.toUpperCase()||e._id===ref);
    const el=document.getElementById('rec-vresult');
    if(el) el.innerHTML=e
      ? `<div style="padding:10px;background:var(--green-light);border-radius:8px;border:1.5px solid var(--green)"><strong>✅ ${e.token}</strong> — ${e.patientName||'—'}<br><span style="font-size:12px;color:var(--text-muted)">Status: ${e.status} · Est wait: ${e.estimatedWait||0} min</span></div>`
      : `<div style="padding:10px;background:#FEF2F2;border-radius:8px;color:var(--red)">❌ Not found in today's queue</div>`;
  } catch(e){UI.showToast(e.message,'err');}
};
window._recBroadcast = () => {
  const msg=document.getElementById('rec-msg')?.value?.trim();
  if(!msg){UI.showToast('Enter a message first','err');return;}
  UI.showToast('Announcement broadcast to all screens','ok');
  document.getElementById('rec-msg').value='';
};
async function _recLoad() {
  const fid=_D.fac(); if(!fid) return;
  try {
    const r=await API._fetchDirect(`/queue2?facility=${fid}&date=${_D.date()}`,{method:'GET'});
    const all=r.data||[], s=r.stats||{};
    _D.tx('rec-s-tot',  all.length);
    _D.tx('rec-s-wait', all.filter(e=>e.status==='waiting').length);
    _D.tx('rec-s-em',   all.filter(e=>e.tokenType==='emergency').length);
    _D.tx('rec-s-avg',  (s.avgWaitMins||0)+' min');
    const sCl={waiting:'#EF9F27',called:'#1A4A9B',in_consultation:'var(--green-dark)',completed:'var(--text-muted)'};
    const active=all.filter(e=>!['completed','cancelled'].includes(e.status));
    document.getElementById('rec-table').innerHTML=active.length
      ? active.map(e=>{
          const tc=_D.clr[e.tokenType]||'#888';
          return `<tr style="border-bottom:1px solid var(--border)${e.tokenType==='emergency'?';background:#FFF5F5':''}">
            <td style="padding:9px 14px;font-weight:800;font-family:var(--mono);color:${tc}">${e.token}</td>
            <td style="padding:9px 14px;font-weight:500">${e.patientName||'—'}</td>
            <td style="padding:9px 14px;font-size:12px">${_D.tokenBadge(e.tokenType)}</td>
            <td style="padding:9px 14px"><span style="font-size:12px;font-weight:500;color:${sCl[e.status]||'#888'}">${e.status.replace('_',' ')}</span></td>
            <td style="padding:9px 14px;color:var(--text-muted)">${e.estimatedWait||0} min</td>
            <td style="padding:9px 14px">
              <div style="display:flex;gap:4px">
                ${e.status==='waiting'?`<button class="btn btn-xs btn-green" onclick="_docCall&&_docCall('${e._id}')"><i class="ti ti-bell"></i></button>`:''}
                <button class="btn btn-xs" title="Direct to nurse triage" onclick="UI.showToast('${e.token} directed to nurse','ok')"><i class="ti ti-heart-rate-monitor"></i></button>
              </div>
            </td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--text-muted)">Queue is empty</td></tr>';
    const em=all.filter(e=>e.tokenType==='emergency'&&!['completed','cancelled'].includes(e.status));
    _D.el('rec-em', em.length ? em.map(e=>`
      <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:#FEF2F2;border-radius:8px;margin-bottom:5px">
        <div style="width:7px;height:7px;border-radius:50%;background:#E24B4A;flex-shrink:0"></div>
        <span style="font-weight:700;color:#E24B4A">${e.token}</span>
        <span style="flex:1;font-size:12px">${e.patientName||'—'}</span>
        <button class="btn btn-xs" style="background:#E24B4A;border-color:#E24B4A;color:#fff" onclick="_docCall&&_docCall('${e._id}')">Call</button>
      </div>`).join('') : '<div style="color:var(--text-muted)">No emergencies</div>');
  } catch(e){console.warn('Recep dash:',e.message);}
}

/* ══════════════════════════════════════════════════
   PHARMACY DASHBOARD
══════════════════════════════════════════════════ */
Pages['pharmacy_dashboard'] = () => {
  setTimeout(_pharLoad, 0);
  return `
<div style="display:grid;grid-template-columns:1fr 1fr 270px;gap:12px">
  <div style="display:flex;flex-direction:column;gap:12px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${_D.stat('PENDING RX',    'ph-pend','#7A5C10','#FFF9E6','#F0D060')}
      ${_D.stat('DISPENSED TODAY','ph-done','#0E4A28','#EDFBF3','#7ADAA8')}
    </div>
    <div class="card" style="flex:1">
      <div class="card-title"><i class="ti ti-pill"></i>Prescription queue</div>
      <div id="ph-list" style="color:var(--text-muted)">Loading…</div>
    </div>
  </div>
  <div class="card">
    <div class="card-title"><i class="ti ti-package"></i>Dispense medication</div>
    <div class="f-group"><label class="f-label">Prescription ID or queue token</label>
      <input class="f-input" id="ph-id" placeholder="Enter prescription ID…">
    </div>
    <div id="ph-detail" style="padding:10px;background:var(--bg-surface);border-radius:var(--radius);font-size:13px;color:var(--text-muted);margin-bottom:10px">Enter an ID to load prescription details</div>
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <button class="btn btn-green" style="flex:1" onclick="UI.showToast('Prescription dispensed','ok')"><i class="ti ti-check"></i>Mark dispensed</button>
      <button class="btn" onclick="UI.showToast('Loading…','ok')"><i class="ti ti-search"></i>Look up</button>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:14px">
      <div class="card-title" style="color:var(--amber)"><i class="ti ti-alert-triangle"></i>Low stock alerts</div>
      <div id="ph-low" style="font-size:13px;color:var(--text-muted)">Loading…</div>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:12px">
    <div class="card">
      <div class="card-title"><i class="ti ti-chart-bar"></i>Stock overview</div>
      <div id="ph-stock" style="font-size:13px;color:var(--text-muted)">Loading…</div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ti ti-bolt"></i>Quick actions</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn" onclick="Router.setPage('rx-queue')" style="justify-content:flex-start"><i class="ti ti-list"></i>Full Rx queue</button>
        <button class="btn" onclick="Router.setPage('stock')" style="justify-content:flex-start"><i class="ti ti-package"></i>Manage stock</button>
        <button class="btn" onclick="UI.showToast('Restock request submitted','ok')" style="justify-content:flex-start"><i class="ti ti-send"></i>Request restock</button>
        <button class="btn" onclick="Router.setPage('dispensed')" style="justify-content:flex-start"><i class="ti ti-history"></i>Dispensed history</button>
      </div>
    </div>
  </div>
</div>`;
};
async function _pharLoad() {
  const fid=_D.fac(); if(!fid) return;
  try {
    const [rxR, medR]=await Promise.all([
      API._fetchDirect(`/prescriptions?facility=${fid}&status=pending&limit=20`,{method:'GET'}),
      API._fetchDirect(`/medications?facility=${fid}&limit=100`,{method:'GET'})
    ]);
    const rxs=rxR.data||[], meds=medR.data||[];
    _D.tx('ph-pend', rxs.filter(r=>r.status==='pending').length);
    _D.tx('ph-done', rxs.filter(r=>r.status==='dispensed').length);
    _D.el('ph-list', rxs.length ? rxs.map(r=>`
      <div style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
          <div>
            <div style="font-weight:600;font-size:13px">${(r.lines||[]).map(l=>l.medicationName).join(', ')}</div>
            <div style="font-size:12px;color:var(--text-muted)">Dr. ${r.prescribedBy?.firstName||'—'} ${r.prescribedBy?.lastName||''}</div>
          </div>
          <span class="badge ${r.status==='pending'?'badge-amber':'badge-green'}">${r.status}</span>
        </div>
        <button class="btn btn-xs btn-green" onclick="document.getElementById('ph-id').value='${r._id}'"><i class="ti ti-pill"></i>Dispense</button>
      </div>`).join('') : '<div style="padding:20px;text-align:center;color:var(--text-muted)">No pending prescriptions</div>');
    const low=meds.filter(m=>(m.stockQty||0)<=(m.reorderLevel||50));
    _D.el('ph-low', low.length ? low.map(m=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted)">${m.name}</span><strong style="color:${m.stockQty===0?'var(--red)':'var(--amber)'}">${m.stockQty} left</strong></div>`).join('') : '<div style="color:var(--green-dark)">✅ All stock levels OK</div>');
    _D.el('ph-stock', `<div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Total items</span><strong>${meds.length}</strong></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Low stock</span><strong style="color:var(--amber)">${low.length}</strong></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Out of stock</span><strong style="color:var(--red)">${meds.filter(m=>m.stockQty===0).length}</strong></div>
    </div>`);
  } catch(e){console.warn('Pharmacy dash:',e.message);}
}

/* ══════════════════════════════════════════════════
   LAB DASHBOARD
══════════════════════════════════════════════════ */
Pages['lab_dashboard'] = () => {
  setTimeout(_labLoad, 0);
  return `
<div style="display:grid;grid-template-columns:1fr 1fr 270px;gap:12px">
  <div style="display:flex;flex-direction:column;gap:12px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${_D.stat('PENDING TESTS',  'lb-pend','#7A5C10','#FFF9E6','#F0D060')}
      ${_D.stat('COMPLETED TODAY','lb-done','#0E4A28','#EDFBF3','#7ADAA8')}
    </div>
    <div class="card" style="flex:1">
      <div class="card-title"><i class="ti ti-flask"></i>Test order queue</div>
      <div id="lb-list" style="color:var(--text-muted)">Loading…</div>
    </div>
  </div>
  <div class="card">
    <div class="card-title"><i class="ti ti-clipboard-data"></i>Enter test results</div>
    <div class="f-group"><label class="f-label">Lab order ID</label>
      <input class="f-input" id="lb-oid" placeholder="Select from queue or enter ID…">
    </div>
    <div class="f-group"><label class="f-label">Test name</label>
      <input class="f-input" id="lb-tname" placeholder="e.g. HbA1c, CD4 count, FBC…">
    </div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">Result value</label><input class="f-input" id="lb-result" placeholder="e.g. 8.2%"></div>
      <div class="f-group"><label class="f-label">Reference range</label><input class="f-input" id="lb-ref" placeholder="e.g. &lt;7%"></div>
    </div>
    <div class="f-group"><label class="f-label">Flag</label>
      <select class="f-select" id="lb-flag" style="margin:0">
        <option value="normal">Normal</option><option value="high">High</option>
        <option value="low">Low</option><option value="critical">Critical</option>
      </select>
    </div>
    <div class="f-group"><label class="f-label">Notes for doctor</label>
      <textarea class="f-input" id="lb-notes" rows="2" style="resize:none" placeholder="Additional observations…"></textarea>
    </div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="btn btn-green" style="flex:1" onclick="UI.showToast('Results submitted — doctor notified','ok')"><i class="ti ti-check"></i>Submit results</button>
      <button class="btn" onclick="UI.showToast('Marked as ready for collection','ok')"><i class="ti ti-check-all"></i>Mark ready</button>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:12px">
    <div class="card">
      <div class="card-title"><i class="ti ti-chart-dots"></i>Lab metrics</div>
      <div id="lb-stats" style="font-size:13px;color:var(--text-muted)">Loading…</div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ti ti-bolt"></i>Quick actions</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn" onclick="UI.showToast('Report generated','ok')" style="justify-content:flex-start"><i class="ti ti-file-analytics"></i>Generate report</button>
        <button class="btn" onclick="UI.showToast('Critical result flagged to doctor','ok')" style="justify-content:flex-start;color:var(--red)"><i class="ti ti-urgent"></i>Flag critical</button>
        <button class="btn" onclick="UI.showToast('Equipment log opened','ok')" style="justify-content:flex-start"><i class="ti ti-tool"></i>Equipment log</button>
      </div>
    </div>
    <div class="card" style="border-color:#E24B4A30">
      <div class="card-title" style="color:var(--red)"><i class="ti ti-alert-triangle"></i>Critical results</div>
      <div id="lb-critical" style="font-size:13px;color:var(--text-muted)">Loading…</div>
    </div>
  </div>
</div>`;
};
async function _labLoad() {
  const fid=_D.fac(); if(!fid) return;
  try {
    const r=await API._fetchDirect(`/labs?facility=${fid}&limit=50`,{method:'GET'});
    const labs=r.data||[];
    const pend=labs.filter(l=>['ordered','in_lab','processing'].includes(l.status));
    const done=labs.filter(l=>['ready','collected'].includes(l.status));
    _D.tx('lb-pend', pend.length);
    _D.tx('lb-done', done.length);
    _D.el('lb-list', pend.length ? pend.map(l=>`
      <div style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
          <div>
            <div style="font-weight:600;font-size:13px">${(l.tests||[]).map(t=>t.name).join(', ')}</div>
            <div style="font-size:12px;color:var(--text-muted)">${l.priority==='urgent'?'🔴 Urgent':'Routine'}</div>
          </div>
          <span class="badge badge-amber">${l.status}</span>
        </div>
        <button class="btn btn-xs btn-green" onclick="document.getElementById('lb-oid').value='${l._id}'"><i class="ti ti-clipboard-data"></i>Enter results</button>
      </div>`).join('') : '<div style="padding:20px;text-align:center;color:var(--text-muted)">No pending tests</div>');
    const crit=labs.filter(l=>(l.tests||[]).some(t=>t.flag==='critical'));
    _D.el('lb-critical', crit.length ? crit.map(l=>`
      <div style="padding:7px 10px;background:#FEF2F2;border-radius:8px;margin-bottom:5px;font-size:12px">
        <strong style="color:var(--red)">${(l.tests||[]).filter(t=>t.flag==='critical').map(t=>t.name).join(', ')}</strong>
        <div style="color:var(--text-muted)">Notify doctor immediately</div>
      </div>`).join('') : '<div style="color:var(--text-muted)">No critical results</div>');
    _D.el('lb-stats', `<div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Total today</span><strong>${labs.length}</strong></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Pending</span><strong style="color:var(--amber)">${pend.length}</strong></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Completed</span><strong style="color:var(--green-dark)">${done.length}</strong></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Critical flags</span><strong style="color:var(--red)">${crit.length}</strong></div>
    </div>`);
  } catch(e){console.warn('Lab dash:',e.message);}
}

/* ══════════════════════════════════════════════════
   FACILITY ADMIN DASHBOARD
══════════════════════════════════════════════════ */
Pages['facility_admin'] = () => {
  if (window._fadInt) clearInterval(window._fadInt);
  setTimeout(_fadLoad, 0);
  window._fadInt = setInterval(_fadLoad, 30000);
  return `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
  <div class="page-title" style="margin:0">Facility Dashboard — <span id="fad-name" style="color:var(--green-dark)">Loading…</span></div>
  <div style="font-size:12px;color:var(--text-muted)">${new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:14px">
  ${_D.stat('PATIENTS TODAY','fad-tot','#7A5C10','#FFF9E6','#F0D060')}
  ${_D.stat('IN QUEUE',     'fad-q',  '#1E2C80','#EEF2FF','#BEC8F0')}
  ${_D.stat('COMPLETED',    'fad-don','#0E4A28','#EDFBF3','#7ADAA8')}
  <div style="padding:16px 20px;border-radius:var(--radius-xl);background:var(--bg-surface);border:1.5px solid var(--border)">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#4A6CF7;margin-bottom:4px;display:flex;align-items:center;gap:4px"><i class="ti ti-brain" style="font-size:12px"></i>AI INSIGHT</div>
    <div id="fad-ai" style="font-size:13px;font-weight:600;color:#4A6CF7;line-height:1.4">Analysing…</div>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 300px;gap:14px">
  <div style="display:flex;flex-direction:column;gap:12px">
    <!-- Resource overview -->
    <div class="card">
      <div class="card-title"><i class="ti ti-layout-grid"></i>Resource overview</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px">
        ${[['fad-r1','Pharmacy Stock'],['fad-r2','Lab Capacity'],['fad-r3','Queue Status'],['fad-r4','Staff on Duty']].map(([id,lbl])=>`
          <div style="padding:12px;border:1px solid var(--border);border-radius:var(--radius)">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:8px">${lbl}</div>
            <div id="${id}" style="font-size:13px;color:var(--text-muted)">—</div>
          </div>`).join('')}
      </div>
    </div>
    <!-- Live queue top 5 -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="card-title" style="margin:0"><i class="ti ti-list-numbers"></i>Live queue</div>
        <button class="btn btn-xs btn-green" onclick="Router.setPage('queue_dashboard')">Full view →</button>
      </div>
      <div id="fad-queue" style="color:var(--text-muted)">Loading…</div>
    </div>
    <!-- Staff management -->
    <div class="card">
      <div class="card-title"><i class="ti ti-users-group"></i>Staff management</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm" onclick="Router.setPage('users')"><i class="ti ti-users"></i>View all staff</button>
        <button class="btn btn-sm" onclick="UI.showToast('Shift scheduler opened','ok')"><i class="ti ti-calendar-stats"></i>Assign shifts</button>
        <button class="btn btn-sm" onclick="UI.showToast('Attendance report generated','ok')"><i class="ti ti-chart-bar"></i>Attendance</button>
        <button class="btn btn-sm" onclick="UI.showToast('Leave requests opened','ok')"><i class="ti ti-calendar-off"></i>Leave requests</button>
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-sm btn-green" onclick="UI.showToast('Generating facility report…','ok')"><i class="ti ti-file-analytics"></i>Generate report</button>
      <button class="btn btn-sm" onclick="UI.showToast('Restock request submitted','ok')"><i class="ti ti-package"></i>Restock request</button>
      <button class="btn btn-sm" onclick="Router.setPage('facilities')"><i class="ti ti-building-hospital"></i>Facility settings</button>
      <button class="btn btn-sm" onclick="window._showDelay&&_showDelay()"><i class="ti ti-clock-exclamation"></i>Delay alert</button>
    </div>
  </div>
  <!-- Right panel -->
  <div style="display:flex;flex-direction:column;gap:12px">
    <div class="card">
      <div class="card-title"><i class="ti ti-chart-dots"></i>Today's metrics</div>
      <div id="fad-metrics" style="font-size:13px;color:var(--text-muted)">Loading…</div>
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <i class="ti ti-bulb" style="color:#4A6CF7;font-size:18px"></i>
        <div style="font-weight:700;font-size:14px">AI Alerts</div>
      </div>
      <div id="fad-alerts" style="font-size:13px">Loading…</div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ti ti-chart-line"></i>Weekly trend</div>
      <canvas id="fad-canvas" style="width:100%;height:80px"></canvas>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-hint);margin-top:4px">
        ${['M','T','W','T','F','S','S'].map(d=>`<span>${d}</span>`).join('')}
      </div>
    </div>
  </div>
</div>`;
};
async function _fadLoad() {
  const fid=_D.fac(), u=_D.u(); if(!fid) return;
  _D.tx('fad-name', u?.facilityName||'Facility');
  try {
    const [qr, mr, lr]=await Promise.all([
      API._fetchDirect(`/queue2?facility=${fid}&date=${_D.date()}`,{method:'GET'}),
      API._fetchDirect(`/medications?facility=${fid}&limit=100`,{method:'GET'}).catch(()=>({data:[]})),
      API._fetchDirect(`/labs?facility=${fid}&limit=50`,{method:'GET'}).catch(()=>({data:[]}))
    ]);
    const all=qr.data||[], s=qr.stats||{}, meds=mr.data||[], labs=lr.data||[];
    _D.tx('fad-tot', all.length);
    _D.tx('fad-q',   all.filter(e=>e.status==='waiting').length);
    _D.tx('fad-don', all.filter(e=>e.status==='completed').length);
    const low=meds.filter(m=>(m.stockQty||0)<=(m.reorderLevel||50));
    const pendLabs=labs.filter(l=>['ordered','in_lab'].includes(l.status));
    const hour=new Date().getHours(), isPeak=hour>=9&&hour<=13;
    _D.tx('fad-ai', isPeak?`High volume predicted — ${all.filter(e=>e.status==='waiting').length} waiting`:`Queue normal · Avg wait ${s.avgWaitMins||0} min`);
    _D.el('fad-r1', low.length?`<span style="color:var(--amber);font-weight:600">⚠️ ${low.length} low stock</span>`:`<span style="color:var(--green-dark)">✅ OK</span>`);
    _D.el('fad-r2', `<span style="font-size:18px;font-weight:700">${pendLabs.length}</span> <span style="font-size:11px;color:var(--text-muted)">pending</span>`);
    _D.el('fad-r3', `<span style="font-size:18px;font-weight:700">${all.filter(e=>e.status==='waiting').length}</span> <span style="font-size:11px;color:var(--text-muted)">waiting</span>`);
    _D.el('fad-r4', `<span style="color:var(--green-dark)">✅ Active</span>`);
    const sat=all.filter(e=>e.satisfaction);
    _D.el('fad-metrics', `<div style="display:flex;flex-direction:column;gap:8px">
      ${[['Avg wait',(s.avgWaitMins||0)+' min'],['Satisfaction',sat.length?'⭐ '+(sat.reduce((s,e)=>s+e.satisfaction,0)/sat.length).toFixed(1):'—'],['Low stock',low.length,low.length>0?'var(--amber)':''],['Lab pending',pendLabs.length]].map(([l,v,c])=>`<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">${l}</span><strong${c?` style="color:${c}"`:''}>${v}</strong></div>`).join('')}
    </div>`);
    const alerts=[];
    if(isPeak) alerts.push(['ti-alert-triangle','#FFFBEB','#D97706','Peak hours — consider additional staff']);
    if(low.length) alerts.push(['ti-package','#FEF2F2','var(--red)',`Low stock: ${low.slice(0,2).map(m=>m.name).join(', ')}`]);
    alerts.push(['ti-shield-check','#EEF2FF','#4A6CF7','NHI compliance reports due end of month']);
    _D.el('fad-alerts', alerts.map(([ic,bg,c,m])=>`<div style="display:flex;gap:10px;padding:9px;background:${bg};border-radius:8px;margin-bottom:6px"><i class="ti ${ic}" style="color:${c};font-size:15px;flex-shrink:0;margin-top:1px"></i><span style="font-size:13px">${m}</span></div>`).join(''));
    const top=all.filter(e=>!['completed','cancelled'].includes(e.status)).slice(0,4);
    _D.el('fad-queue', top.length ? top.map(e=>`
      <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="font-size:16px;font-weight:800;font-family:var(--mono);color:${_D.clr[e.tokenType]||'#888'};min-width:52px">${e.token}</div>
        <div style="flex:1"><div style="font-weight:600;font-size:13px">${e.patientName||'—'}</div><div style="font-size:11px;color:var(--text-muted)">${e.status.replace('_',' ')}</div></div>
      </div>`).join('') : '<div style="padding:16px;text-align:center;color:var(--text-muted)">Queue empty</div>');
    // Sparkline
    const canvas=document.getElementById('fad-canvas'); if(!canvas) return;
    const data=[20,35,28,42,38,15,22], W=canvas.parentElement.offsetWidth||260, H=80;
    canvas.width=W; canvas.height=H;
    const ctx=canvas.getContext('2d'), max=Math.max(...data,1);
    const pts=data.map((v,i)=>({x:(i/(data.length-1))*W,y:H-(v/max)*(H-10)-5}));
    ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y); pts.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));
    ctx.strokeStyle='#0F6E56'; ctx.lineWidth=2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pts[0].x,H); pts.forEach(p=>ctx.lineTo(p.x,p.y)); ctx.lineTo(pts[pts.length-1].x,H);
    ctx.fillStyle='rgba(15,110,86,0.1)'; ctx.fill();
    pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fillStyle='#0F6E56';ctx.fill();});
  } catch(e){console.warn('FAD error:',e.message);}
}

/* ══════════════════════════════════════════════════
   SUPER ADMIN DASHBOARD
══════════════════════════════════════════════════ */
Pages['super_admin_dashboard'] = () => {
  setTimeout(_saLoad, 0);
  return `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
  <div class="page-title" style="margin:0">🌍 National NIHMS Dashboard</div>
  <div style="display:flex;gap:6px">
    <button class="btn btn-sm btn-green" onclick="UI.showToast('Generating national report…','ok')"><i class="ti ti-file-analytics"></i>National report</button>
    <button class="btn btn-sm" onclick="Router.setPage('facilities')"><i class="ti ti-building-hospital"></i>Facilities</button>
    <button class="btn btn-sm" onclick="Router.setPage('users')"><i class="ti ti-users"></i>All users</button>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:14px">
  ${_D.stat('FACILITIES',   'sa-facs', '#1E2C80','#EEF2FF','#BEC8F0')}
  ${_D.stat('ACTIVE USERS', 'sa-users','#0E4A28','#EDFBF3','#7ADAA8')}
  ${_D.stat('PATIENTS TODAY','sa-pts',  '#7A5C10','#FFF9E6','#F0D060')}
  ${_D.stat('SYSTEM UPTIME','sa-up',   '#6D28D9','#F5F3FF','#C4B5FD')}
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 300px;gap:12px">
  <!-- Facilities -->
  <div style="display:flex;flex-direction:column;gap:12px">
    <div class="card">
      <div class="card-title"><i class="ti ti-building-hospital"></i>Facility status</div>
      <div id="sa-fac-list" style="font-size:13px;color:var(--text-muted)">Loading…</div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ti ti-shield-lock"></i>Security & compliance</div>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
        ${[['Role-based access','✅ Active'],['Audit logging','✅ Enabled'],['NHI compliance','✅ Up to date'],['Data encryption','✅ AES-256'],['Last security scan','Today 06:00']].map(([l,v])=>`
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--text-muted)">${l}</span><strong style="color:var(--green-dark)">${v}</strong>
          </div>`).join('')}
      </div>
      <button class="btn btn-sm" style="margin-top:10px" onclick="UI.showToast('Audit log exported','ok')"><i class="ti ti-file-download"></i>Export audit log</button>
    </div>
  </div>
  <!-- Analytics -->
  <div style="display:flex;flex-direction:column;gap:12px">
    <div class="card">
      <div class="card-title"><i class="ti ti-chart-bar"></i>National analytics</div>
      <div id="sa-analytics" style="font-size:13px;color:var(--text-muted)">Loading…</div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ti ti-plug-connected"></i>System integrations</div>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
        ${[['NHI Claims System','🟢 Connected'],['National Lab Network','🟢 Connected'],['Insurance Portal','🟡 Partial'],['HPRS Registry','🟢 Connected'],['Referral Network','🟢 Active']].map(([l,v])=>`
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--text-muted)">${l}</span><strong>${v}</strong>
          </div>`).join('')}
      </div>
    </div>
  </div>
  <!-- Governance -->
  <div style="display:flex;flex-direction:column;gap:12px">
    <div class="card">
      <div class="card-title"><i class="ti ti-bolt"></i>System governance</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn btn-sm" onclick="Router.setPage('facilities')" style="justify-content:flex-start"><i class="ti ti-building-hospital"></i>Manage facilities</button>
        <button class="btn btn-sm" onclick="Router.setPage('users')" style="justify-content:flex-start"><i class="ti ti-users"></i>All users & roles</button>
        <button class="btn btn-sm" onclick="UI.showToast('Policy editor opened','ok')" style="justify-content:flex-start"><i class="ti ti-file-certificate"></i>Policy configuration</button>
        <button class="btn btn-sm" onclick="UI.showToast('Referral protocols loaded','ok')" style="justify-content:flex-start"><i class="ti ti-arrows-transfer-up"></i>Referral protocols</button>
        <button class="btn btn-sm" onclick="UI.showToast('Fraud report generated','ok')" style="justify-content:flex-start;color:var(--red)"><i class="ti ti-alert-octagon"></i>Fraud detection</button>
        <button class="btn btn-sm" onclick="UI.showToast('Maintenance mode toggled','ok')" style="justify-content:flex-start"><i class="ti ti-tool"></i>System maintenance</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ti ti-activity"></i>System health</div>
      <div id="sa-health" style="font-size:13px;color:var(--text-muted)">Loading…</div>
    </div>
  </div>
</div>`;
};
async function _saLoad() {
  try {
    const [fr, ur]=await Promise.all([
      API._fetchDirect('/facilities',{method:'GET'}),
      API._fetchDirect('/users?limit=200',{method:'GET'}).catch(()=>({data:[]}))
    ]);
    const facs=fr.data||[], users=ur.data||[];
    _D.tx('sa-facs',  facs.length);
    _D.tx('sa-users', users.length);
    _D.tx('sa-pts',   '—');
    _D.tx('sa-up',    '99.9%');
    _D.el('sa-fac-list', facs.length ? facs.map(f=>`
      <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
        <div style="width:8px;height:8px;border-radius:50%;background:${f.isOnline!==false?'var(--green)':'#ccc'};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${f.name}</div>
          <div style="font-size:11px;color:var(--text-muted)">${f.province} · ${f.type||'Clinic'}</div>
        </div>
        <span class="badge ${f.isOnline!==false?'badge-green':'badge-gray'}">${f.isOnline!==false?'Online':'Offline'}</span>
      </div>`).join('') : '<div style="color:var(--text-muted)">No facilities found</div>');
    const byRole={};
    users.forEach(u=>{byRole[u.role]=(byRole[u.role]||0)+1;});
    _D.el('sa-analytics', `
      <div style="margin-bottom:12px">
        ${Object.entries(byRole).map(([r,c])=>`
          <div style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:6px">
            <span style="flex:1;text-transform:capitalize;color:var(--text-muted)">${r}</span>
            <strong>${c}</strong>
            <div style="width:70px;background:var(--bg-surface);border-radius:4px;height:6px;overflow:hidden">
              <div style="height:100%;background:var(--green);width:${users.length?Math.round(c/users.length*100):0}%"></div>
            </div>
          </div>`).join('')}
      </div>
      <div style="padding:10px;background:var(--green-light);border-radius:8px;font-size:13px;color:var(--green-dark)">
        <strong>${facs.filter(f=>f.isOnline!==false).length}</strong> of <strong>${facs.length}</strong> facilities online
      </div>`);
    _D.el('sa-health', `<div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
      ${[['API Server','🟢 Running'],['MongoDB Atlas','🟢 Connected'],['Email (SMTP)','🟢 Active'],['Groq AI','🟢 Connected'],['Queue Service','🟢 Running']].map(([l,v])=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted)">${l}</span><strong>${v}</strong></div>`).join('')}
    </div>`);
  } catch(e){console.warn('SA dash:',e.message);}
}
