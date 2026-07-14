/**
 * doctor_dashboard.js — Improved Doctor Dashboard (Image 3 wireframe)
 */
if (typeof Pages === 'undefined') window.Pages = {};

Pages['queue_dashboard'] = Pages['queue_dashboard'] || (() => '');

/* Override queue_dashboard for doctor role */
Pages['doc_dashboard'] = () => {
  if (window._docDashInterval) clearInterval(window._docDashInterval);
  setTimeout(_loadDocDash, 100);
  window._docDashInterval = setInterval(_loadDocDash, 20000);

  return `
<div style="display:flex;gap:14px;height:calc(100vh - 110px);min-height:500px">

  <!-- Left: main content -->
  <div style="flex:1;display:flex;flex-direction:column;gap:14px;overflow-y:auto;min-width:0">

    <!-- Stats row -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      <div style="padding:16px;border-radius:var(--radius-xl);background:#FFF9E6;border:1.5px solid #F0D060">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#A07820;margin-bottom:6px">WAITING</div>
        <div id="dd-waiting" style="font-size:40px;font-weight:900;color:#7A5C10;line-height:1">—</div>
      </div>
      <div style="padding:16px;border-radius:var(--radius-xl);background:#EEF2FF;border:1.5px solid #BEC8F0">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#3A4898;margin-bottom:6px">IN CONSULT</div>
        <div id="dd-consult" style="font-size:40px;font-weight:900;color:#1E2C80;line-height:1">—</div>
      </div>
      <div style="padding:16px;border-radius:var(--radius-xl);background:#EDFBF3;border:1.5px solid #7ADAA8">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#1A6E40;margin-bottom:6px">COMPLETED</div>
        <div id="dd-completed" style="font-size:40px;font-weight:900;color:#0E4A28;line-height:1">—</div>
      </div>
    </div>

    <!-- Next patient -->
    <div class="card" id="dd-next-card">
      <div class="card-title"><i class="ti ti-user-check"></i>Next patient</div>
      <div id="dd-next-body" style="color:var(--text-muted);font-size:13px">Loading…</div>
    </div>

    <!-- Queue list -->
    <div class="card" style="flex:1">
      <div class="card-title"><i class="ti ti-list-numbers"></i>Queue list</div>
      <div id="dd-queue-list" style="color:var(--text-muted);font-size:13px">Loading…</div>
    </div>
  </div>

  <!-- Right sidebar -->
  <div style="width:280px;flex-shrink:0;display:flex;flex-direction:column;gap:12px;overflow-y:auto">
    <!-- Metrics -->
    <div class="card">
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <span style="font-size:12px;color:var(--text-muted)">AVG WAIT</span>
          <strong id="dd-avgwait" style="font-size:18px;color:var(--text)">— min</strong>
        </div>
        <div style="height:1px;background:var(--border)"></div>
        <div style="display:flex;justify-content:space-between"><span style="font-size:12px;color:var(--text-muted)">Average consult</span><strong id="dd-avgconsult">— min</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="font-size:12px;color:var(--text-muted)">Patients today</span><strong id="dd-total">—</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="font-size:12px;color:var(--text-muted)">Avg satisfaction</span><strong id="dd-sat">—</strong></div>
      </div>
    </div>

    <!-- Upcoming patients -->
    <div class="card">
      <div class="card-title"><i class="ti ti-calendar-event"></i>Upcoming patients</div>
      <div id="dd-upcoming" style="font-size:13px;color:var(--text-muted)">Loading…</div>
    </div>

    <!-- Today's stats -->
    <div class="card">
      <div class="card-title"><i class="ti ti-chart-dots"></i>Today's stats</div>
      <div id="dd-stats-panel" style="font-size:13px;color:var(--text-muted)">Loading…</div>
    </div>
  </div>
</div>`;
};

async function _loadDocDash() {
  const user = API.getStoredUser();
  const fid  = user?.facilityId || user?.facility;
  if (!fid) return;
  const today = new Date().toISOString().slice(0,10);

  try {
    const [qRes, apptRes] = await Promise.all([
      API._fetchDirect(`/queue2?facility=${fid}&date=${today}`, { method:'GET' }),
      API.appointments.list({ doctor: user._id, limit:20 })
    ]);

    const entries = qRes.data || [];
    const stats   = qRes.stats || {};
    const appts   = apptRes.data || [];

    // Stats cards
    _dEl('dd-waiting',   entries.filter(e=>e.status==='waiting').length);
    _dEl('dd-consult',   entries.filter(e=>e.status==='in_consultation').length);
    _dEl('dd-completed', entries.filter(e=>e.status==='completed').length);
    _dEl('dd-avgwait',   (stats.avgWaitMins||0)+' min');
    _dEl('dd-total',     entries.length);

    const sat = entries.filter(e=>e.satisfaction);
    _dEl('dd-sat', sat.length ? '⭐ '+(sat.reduce((s,e)=>s+e.satisfaction,0)/sat.length).toFixed(1) : '—');

    // Avg consult from completed
    const done = entries.filter(e=>e.status==='completed'&&e.consultStartTime&&e.consultEndTime);
    const avgC = done.length ? Math.round(done.reduce((s,e)=>s+(new Date(e.consultEndTime)-new Date(e.consultStartTime))/60000,0)/done.length) : 0;
    _dEl('dd-avgconsult', avgC ? avgC+' min' : '—');

    // Next patient
    const waiting = entries.filter(e=>e.status==='waiting').sort((a,b)=>b.priority-a.priority||(a.position-b.position));
    const inC     = entries.find(e=>e.status==='in_consultation');
    const next    = waiting[0];

    const nextEl = document.getElementById('dd-next-body');
    if (nextEl) {
      if (inC) {
        nextEl.innerHTML = `
          <div style="padding:12px;background:var(--green-light);border-radius:var(--radius);border:1.5px solid var(--green)">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--green-dark);margin-bottom:6px">IN CONSULTATION NOW</div>
            <div style="display:flex;align-items:center;gap:12px">
              <div style="font-size:32px;font-weight:900;font-family:var(--mono);color:var(--green-dark)">${inC.token}</div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:15px">${inC.patientName||'—'}${inC.patientAge?' <span style="font-weight:400;color:var(--text-muted);font-size:13px">(${inC.patientAge})</span>':''}</div>
                <div style="font-size:12px;color:var(--text-muted)">${inC.tokenType==='normal'?'Pre-booked appointment':'Walk-in'}${inC.priorityReason?' · '+inC.priorityReason:''}</div>
              </div>
            </div>
            <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
              <button class="btn btn-sm btn-green" onclick="Router.setPage('consult')"><i class="ti ti-stethoscope"></i>Open consult</button>
              <button class="btn btn-sm" onclick="_openRoute('${inC._id}')"><i class="ti ti-map-pin"></i>Route & complete</button>
              <button class="btn btn-sm" onclick="_qStatus('${inC._id}','completed')"><i class="ti ti-check"></i>Complete</button>
            </div>
          </div>`;
      } else if (next) {
        nextEl.innerHTML = `
          <div style="padding:12px;background:var(--bg-surface);border-radius:var(--radius);border:1.5px solid var(--border)">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:4px;height:50px;border-radius:2px;background:${next.tokenType==='emergency'?'#E24B4A':next.tokenType==='priority'?'#EF9F27':'var(--green)'};flex-shrink:0"></div>
              <div style="font-size:36px;font-weight:900;font-family:var(--mono);color:var(--green-dark);min-width:72px">${next.token}</div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:15px">${next.patientName||'—'}${next.patientAge?' <span style="font-weight:400;color:var(--text-muted);font-size:13px">(${next.patientAge})</span>':''}</div>
                <div style="font-size:12px;color:var(--text-muted)">${next.tokenType==='normal'?'Pre-booked':'Walk-in'}${next.priorityReason?' · '+next.priorityReason:''}</div>
              </div>
              <div style="display:flex;gap:8px;flex-shrink:0">
                <button class="btn btn-sm" onclick="window.open('https://jitsi.riot.im/nihms${next._id?.slice(-12)||''}','_blank')" title="Video call" style="display:${next.tokenType==='normal'?'flex':'none'}"><i class="ti ti-video"></i></button>
              </div>
            </div>
            <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
              <button class="btn btn-sm btn-green" onclick="_callAndStart('${next._id}')"><i class="ti ti-user-check"></i>Start consult</button>
              <button class="btn btn-sm" onclick="_callPatient('${next._id}')"><i class="ti ti-bell"></i>Call patient</button>
              <button class="btn btn-sm" onclick="Router.setPage('lab')"><i class="ti ti-flask"></i>Refer to lab</button>
            </div>
          </div>`;
      } else {
        nextEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted)"><i class="ti ti-checks" style="font-size:32px;opacity:.3;display:block;margin-bottom:8px"></i>Queue is empty</div>';
      }
    }

    // Queue list
    const active = entries.filter(e=>!['completed','cancelled','skipped'].includes(e.status));
    const listEl = document.getElementById('dd-queue-list');
    if (listEl) {
      if (!active.length) { listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">No active patients</div>'; }
      else {
        listEl.innerHTML = active.map(e => {
          const c = e.tokenType==='emergency'?'#E24B4A':e.tokenType==='priority'?'#EF9F27':e.tokenType==='normal'?'#4A6CF7':'#1D9E75';
          const isTele = e.appointment?.visitType==='telemedicine';
          return `<div style="display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="width:3px;height:40px;border-radius:2px;background:${c};flex-shrink:0"></div>
            <div style="font-size:20px;font-weight:800;font-family:var(--mono);color:${c};min-width:54px">${e.token}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:13px">${e.patientName||'—'}${e.patientAge?` <span style="color:var(--text-muted);font-weight:400">(${e.patientAge})</span>`:''}</div>
              <div style="font-size:11px;color:var(--text-muted)">${e.tokenType==='normal'?'📅 Pre-booked':'🚶 Walk-in'}${e.priorityReason?' · '+e.priorityReason:''}${isTele?' · <i class="ti ti-video" style="font-size:10px"></i> Video':''}</div>
            </div>
            ${e.tokenType==='emergency'?`<span style="font-size:10px;padding:2px 6px;border-radius:10px;background:#E24B4A;color:#fff;font-weight:700">EMERGENCY</span>`:''}
            <div style="display:flex;gap:3px;flex-shrink:0">
              ${e.status==='waiting'?`<button class="btn btn-xs btn-green" onclick="_callAndStart('${e._id}')"><i class="ti ti-stethoscope"></i></button>`:''}
              ${isTele?`<button class="btn btn-xs" style="background:#1A4A9B;color:#fff" onclick="window.open('https://jitsi.riot.im/nihms${e._id?.slice(-12)||''}','_blank')"><i class="ti ti-video"></i></button>`:''}
            </div>
          </div>`;
        }).join('');
      }
    }

    // Upcoming appointments (today, not yet in queue)
    const todayStr  = new Date().toDateString();
    const upcoming  = appts.filter(a => new Date(a.scheduledAt).toDateString()===todayStr && a.status==='confirmed');
    const upEl = document.getElementById('dd-upcoming');
    if (upEl) {
      upEl.innerHTML = upcoming.length
        ? upcoming.slice(0,4).map(a=>`
          <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
            <i class="ti ${a.visitType==='telemedicine'?'ti-video':'ti-user'}" style="font-size:14px;color:var(--green-dark);flex-shrink:0"></i>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:12px">${a.patient?.firstName||''} ${a.patient?.lastName||''}</div>
              <div style="font-size:11px;color:var(--text-muted)">${new Date(a.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · ${(a.visitType||'consultation').replace('_',' ')}</div>
            </div>
            ${a.visitType==='telemedicine'?`<button class="btn btn-xs" onclick="Router.setPage('telemedicine')"><i class="ti ti-video" style="font-size:12px"></i></button>`:'<i class="ti ti-list" style="font-size:12px;color:var(--text-muted)"></i>'}
          </div>`).join('')
        : '<div style="color:var(--text-muted)">No more appointments today</div>';
    }

    // Stats panel
    const statsEl = document.getElementById('dd-stats-panel');
    if (statsEl) {
      statsEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Consults today</span><strong>${entries.filter(e=>e.status==='completed').length}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Emergencies</span><strong style="color:var(--red)">${entries.filter(e=>e.tokenType==='emergency').length}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Avg consult time</span><strong>${avgC||'—'} min</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Satisfaction</span><strong>${sat.length?'⭐ '+(sat.reduce((s,e)=>s+e.satisfaction,0)/sat.length).toFixed(1):'—'}</strong></div>
        </div>`;
    }

  } catch(err) {
    const el = document.getElementById('dd-next-body');
    if (el) el.innerHTML = `<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${err.message}</div>`;
  }
}

function _dEl(id,v){ const e=document.getElementById(id); if(e) e.textContent=v; }

window._callAndStart = async (id) => {
  try {
    await API._fetchDirect(`/queue2/${id}/call`,{method:'PATCH',body:JSON.stringify({room:'Consultation Room'})});
    await API._fetchDirect(`/queue2/${id}/status`,{method:'PATCH',body:JSON.stringify({status:'in_consultation'})});
    UI.showToast('Patient called and consultation started','ok');
    _loadDocDash();
  } catch(e){ UI.showToast(e.message,'err'); }
};
