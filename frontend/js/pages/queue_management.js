/**
 * queue_management.js — Full Dual-Flow Queue System
 * Staff dashboard + Patient check-in page
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ── Language strings for token slip ── */
const _QL = {
  en:{ greeting:'Welcome',  token:'Your token',    wait:'Est. wait', minutes:'min',   checkedIn:'You are checked in' },
  zu:{ greeting:'Sawubona', token:'Uphawu lwakho', wait:'Ulindelo',  minutes:'iminithi',checkedIn:'Usbhalisiwe' },
  af:{ greeting:'Welkom',   token:'U teken',       wait:'Geskatte',  minutes:'minute', checkedIn:'U is ingeboek' },
  st:{ greeting:'Lumela',   token:'Token ya hao',  wait:'Nako',      minutes:'metsotso',checkedIn:'O ngodisitswe' },
};

const _QC = {
  emergency:'#E24B4A', priority:'#EF9F27', normal:'#4A6CF7', walkin:'#1D9E75'
};
function _qs(id,v){ const e=document.getElementById(id); if(e) e.innerHTML=v; }
function _qt(id,v){ const e=document.getElementById(id); if(e) e.textContent=v; }

/* ══════════════════════════════════════════════════
   STAFF QUEUE DASHBOARD
══════════════════════════════════════════════════ */
Pages['queue_dashboard'] = () => {
  if (window._qdInt) clearInterval(window._qdInt);
  setTimeout(() => _qdLoad(), 0);
  window._qdInt = setInterval(_qdLoad, 15000);

  return `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
  <div class="page-title" style="margin:0"><i class="ti ti-layout-dashboard"></i> Queue Dashboard</div>
  <div style="display:flex;gap:6px;flex-wrap:wrap">
    <button class="btn btn-green" onclick="_qdShowWI()"><i class="ti ti-user-plus"></i>Walk-in</button>
    <button class="btn" style="color:var(--red)" onclick="_qdShowEM()"><i class="ti ti-urgent"></i>Emergency</button>
    <button class="btn" onclick="_qdShowDelay()"><i class="ti ti-clock-exclamation"></i>Delay alert</button>
    <button class="btn" onclick="_qdShowAnalytics()"><i class="ti ti-chart-bar"></i>Analytics</button>
    <button class="btn btn-xs" onclick="_qdLoad()"><i class="ti ti-refresh"></i></button>
  </div>
</div>

<!-- Stat cards -->
<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:14px">
  <div style="padding:14px 18px;border-radius:var(--radius-xl);background:#FFF9E6;border:1.5px solid #F0D060">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#A07820;letter-spacing:.06em">WAITING</div>
    <div id="qd-w" style="font-size:38px;font-weight:900;color:#7A5C10;line-height:1.1">—</div>
  </div>
  <div style="padding:14px 18px;border-radius:var(--radius-xl);background:#EEF2FF;border:1.5px solid #BEC8F0">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#3A4898;letter-spacing:.06em">IN CONSULT</div>
    <div id="qd-c" style="font-size:38px;font-weight:900;color:#1E2C80;line-height:1.1">—</div>
  </div>
  <div style="padding:14px 18px;border-radius:var(--radius-xl);background:#EDFBF3;border:1.5px solid #7ADAA8">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#1A6E40;letter-spacing:.06em">COMPLETED</div>
    <div id="qd-d" style="font-size:38px;font-weight:900;color:#0E4A28;line-height:1.1">—</div>
  </div>
  <div style="padding:14px 18px;border-radius:var(--radius-xl);background:var(--bg-surface);border:1.5px solid var(--border)">
    <div style="font-size:10px;font-weight:600;color:var(--text-muted);letter-spacing:.04em">AVG WAIT</div>
    <div id="qd-avg" style="font-size:28px;font-weight:800;color:var(--text);line-height:1.2;margin-top:4px">—</div>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 340px;gap:14px">
  <!-- Left: queue list -->
  <div>
    <!-- Tabs -->
    <div style="display:flex;gap:3px;margin-bottom:10px;background:var(--bg-surface);border-radius:10px;padding:3px">
      ${['all','walkin','prebooked','emergency'].map((t,i)=>`
        <button id="qt-${t}" onclick="_qdTab('${t}')"
          style="flex:1;padding:7px;border:none;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .15s;background:${i===0?'#fff':'transparent'};color:${i===0?'var(--green-dark)':'#888'}">
          ${t==='all'?'All':t==='walkin'?'Walk-ins':t==='prebooked'?'Pre-booked':'🔴 Emergency'}
        </button>`).join('')}
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div id="qd-list" style="max-height:480px;overflow-y:auto">
        <div style="padding:24px;text-align:center;color:var(--text-muted)">Loading…</div>
      </div>
    </div>
  </div>

  <!-- Right panel -->
  <div style="display:flex;flex-direction:column;gap:12px">
    <!-- Now serving -->
    <div class="card">
      <div class="card-title"><i class="ti ti-stethoscope"></i>Now serving</div>
      <div id="qd-now" style="font-size:13px;color:var(--text-muted)">No active consultation</div>
    </div>
    <!-- Next in queue -->
    <div class="card">
      <div class="card-title"><i class="ti ti-arrow-right"></i>Next in queue</div>
      <div id="qd-next" style="font-size:13px;color:var(--text-muted)">Queue empty</div>
    </div>
    <!-- Today snapshot -->
    <div class="card">
      <div class="card-title"><i class="ti ti-chart-dots"></i>Today at a glance</div>
      <div id="qd-glance" style="font-size:13px;color:var(--text-muted)">Loading…</div>
    </div>
    <!-- Legend -->
    <div class="card">
      <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
        ${[['#E24B4A','🔴 Emergency — skip queue'],['#EF9F27','🟡 Priority (elderly/pregnant/disabled)'],['#4A6CF7','📅 Pre-booked appointment'],['#1D9E75','🚶 Walk-in patient']].map(([c,l])=>`
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:10px;height:10px;border-radius:50%;background:${c};flex-shrink:0"></div>
            <span style="color:var(--text-muted)">${l}</span>
          </div>`).join('')}
      </div>
    </div>
  </div>
</div>

<!-- Walk-in modal -->
<div id="qd-wi-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:center;justify-content:center">
  <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:500px;max-width:95vw;box-shadow:var(--shadow-md);max-height:90vh;overflow-y:auto">
    <div style="font-size:16px;font-weight:700;margin-bottom:14px"><i class="ti ti-user-plus"></i> Register walk-in patient</div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">Full name *</label><input class="f-input" id="wi-name" placeholder="Patient name"></div>
      <div class="f-group"><label class="f-label">Phone</label><input class="f-input" id="wi-phone" placeholder="+27820000000"></div>
    </div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">Age</label><input class="f-input" type="number" id="wi-age" placeholder="Age"></div>
      <div class="f-group"><label class="f-label">Token type</label>
        <select class="f-select" id="wi-type" style="margin:0" onchange="_qdWiType(this.value)">
          <option value="walkin">Walk-in</option>
          <option value="priority">Priority patient</option>
          <option value="emergency">Emergency</option>
        </select>
      </div>
    </div>
    <div id="wi-pri-row" style="display:none">
      <div class="f-group"><label class="f-label">Priority reason</label>
        <select class="f-select" id="wi-reason" style="margin:0">
          <option value="elderly">Elderly (65+)</option>
          <option value="pregnant">Pregnant</option>
          <option value="disabled">Disability / mobility impaired</option>
          <option value="child_under_5">Child under 5</option>
        </select>
      </div>
    </div>
    <div class="f-group"><label class="f-label">Chief complaint</label>
      <input class="f-input" id="wi-complaint" placeholder="Reason for visit…">
    </div>
    <div class="f-group"><label class="f-label">Language</label>
      <select class="f-select" id="wi-lang" style="margin:0">
        <option value="en">English</option><option value="zu">isiZulu</option>
        <option value="af">Afrikaans</option><option value="st">Sesotho</option>
      </select>
    </div>
    <div id="wi-alert" class="alert hidden"></div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="btn btn-green" id="wi-btn" onclick="_qdRegWI()"><i class="ti ti-user-check"></i>Register & issue token</button>
      <button class="btn" onclick="document.getElementById('qd-wi-modal').style.display='none'">Cancel</button>
    </div>
  </div>
</div>

<!-- Emergency override modal -->
<div id="qd-em-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:center;justify-content:center">
  <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:420px;max-width:95vw;box-shadow:var(--shadow-md)">
    <div style="font-size:16px;font-weight:700;color:var(--red);margin-bottom:12px"><i class="ti ti-urgent"></i> Emergency Override</div>
    <div style="font-size:13px;color:var(--text-muted);margin-bottom:14px">Instantly move a patient to the front of the queue.</div>
    <div class="f-group"><label class="f-label">Token number</label><input class="f-input" id="em-token" placeholder="e.g. W-05"></div>
    <div class="f-group"><label class="f-label">Emergency reason *</label><input class="f-input" id="em-reason" placeholder="Chest pain, seizure…"></div>
    <div id="em-alert" class="alert hidden"></div>
    <div style="display:flex;gap:8px">
      <button class="btn" style="background:var(--red);border-color:var(--red);color:#fff" onclick="_qdEmOverride()"><i class="ti ti-urgent"></i>Override now</button>
      <button class="btn" onclick="document.getElementById('qd-em-modal').style.display='none'">Cancel</button>
    </div>
  </div>
</div>

<!-- Delay notification modal -->
<div id="qd-delay-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:center;justify-content:center">
  <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:420px;max-width:95vw;box-shadow:var(--shadow-md)">
    <div style="font-size:16px;font-weight:600;margin-bottom:12px"><i class="ti ti-clock-exclamation"></i> Notify patients of delay</div>
    <div class="f-group"><label class="f-label">Delay duration</label>
      <select class="f-select" id="delay-mins" style="margin:0">
        <option value="15">15 minutes</option><option value="30">30 minutes</option>
        <option value="45">45 minutes</option><option value="60">1 hour</option>
      </select>
    </div>
    <div class="f-group"><label class="f-label">Reason (optional)</label>
      <input class="f-input" id="delay-reason" placeholder="Emergency case, equipment issue…">
    </div>
    <div id="delay-alert" class="alert hidden"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-green" onclick="_qdSendDelay()"><i class="ti ti-send"></i>Notify all waiting patients</button>
      <button class="btn" onclick="document.getElementById('qd-delay-modal').style.display='none'">Cancel</button>
    </div>
  </div>
</div>

<!-- Post-consult routing modal -->
<div id="qd-route-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:center;justify-content:center">
  <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:460px;max-width:95vw;box-shadow:var(--shadow-md)">
    <div style="font-size:16px;font-weight:700;margin-bottom:14px">Post-consultation routing</div>
    <input type="hidden" id="route-id">
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <label id="rl-lab" style="flex:1;display:flex;align-items:center;gap:8px;padding:12px;border:1.5px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:13px">
        <input type="checkbox" id="route-lab" style="accent-color:var(--green)" onchange="document.getElementById('rl-lab').style.borderColor=this.checked?'var(--green)':'var(--border)'">
        <i class="ti ti-flask" style="font-size:16px"></i>Lab tests
      </label>
      <label id="rl-rx" style="flex:1;display:flex;align-items:center;gap:8px;padding:12px;border:1.5px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:13px">
        <input type="checkbox" id="route-rx" style="accent-color:var(--green)" onchange="document.getElementById('rl-rx').style.borderColor=this.checked?'var(--green)':'var(--border)'">
        <i class="ti ti-pill" style="font-size:16px"></i>Pharmacy
      </label>
    </div>
    <div style="padding:12px;border:1.5px solid var(--border);border-radius:var(--radius);margin-bottom:12px">
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
        <input type="checkbox" id="route-fu" style="accent-color:var(--green)" onchange="document.getElementById('fu-opts').style.display=this.checked?'block':'none'">
        <i class="ti ti-calendar-plus" style="font-size:16px"></i>Book follow-up appointment
      </label>
      <div id="fu-opts" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
        <div class="two-col">
          <div class="f-group"><label class="f-label">Days from today</label>
            <select class="f-select" id="fu-days" style="margin:0">
              <option value="7">1 week</option><option value="14">2 weeks</option>
              <option value="30">1 month</option><option value="90">3 months</option>
            </select>
          </div>
          <div class="f-group"><label class="f-label">Reason</label>
            <input class="f-input" id="fu-reason" placeholder="Follow-up reason…">
          </div>
        </div>
      </div>
    </div>
    <div class="f-group"><label class="f-label">Notes</label><input class="f-input" id="route-notes" placeholder="Post-consultation notes…"></div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="btn btn-green" onclick="_qdSubmitRoute()"><i class="ti ti-check"></i>Complete & route</button>
      <button class="btn" onclick="_qdCompleteOnly()"><i class="ti ti-check"></i>Complete only</button>
      <button class="btn" onclick="document.getElementById('qd-route-modal').style.display='none'">Cancel</button>
    </div>
  </div>
</div>

<!-- Token issued modal -->
<div id="qd-token-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:600;align-items:center;justify-content:center">
  <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:32px;width:360px;max-width:95vw;text-align:center;box-shadow:var(--shadow-md)">
    <div style="font-size:13px;color:var(--text-muted)" id="tm-greeting">Welcome</div>
    <div style="font-size:13px;color:var(--text-muted);margin-bottom:10px" id="tm-name"></div>
    <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-hint);margin-bottom:4px">Your queue token</div>
    <div style="font-size:76px;font-weight:900;color:var(--green-dark);font-family:var(--mono);line-height:1.1" id="tm-token">W-01</div>
    <div style="display:flex;justify-content:center;gap:28px;margin:14px 0;font-size:13px">
      <div><div style="font-size:22px;font-weight:800" id="tm-pos">—</div><div style="color:var(--text-muted)">Position</div></div>
      <div><div style="font-size:22px;font-weight:800" id="tm-wait">—</div><div style="color:var(--text-muted)">Wait (min)</div></div>
    </div>
    <div style="font-size:12px;color:var(--text-hint);margin-bottom:20px" id="tm-note">Please remain in the waiting area</div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-green" style="flex:1" onclick="_qdPrintToken()"><i class="ti ti-printer"></i>Print token</button>
      <button class="btn" style="flex:1" onclick="document.getElementById('qd-token-modal').style.display='none'">Close</button>
    </div>
  </div>
</div>

<!-- Analytics panel -->
<div id="qd-analytics" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:flex-start;justify-content:center;padding:40px 16px;overflow-y:auto">
  <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:700px;max-width:95vw;box-shadow:var(--shadow-md)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div style="font-size:16px;font-weight:700"><i class="ti ti-chart-bar"></i> Queue Analytics</div>
      <button class="btn btn-xs" onclick="document.getElementById('qd-analytics').style.display='none'"><i class="ti ti-x"></i></button>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:14px">
      ${[7,14,30].map(d=>`<button class="btn btn-xs" id="ana-${d}" onclick="_qdLoadAnalytics(${d})">${d} days</button>`).join('')}
    </div>
    <div id="analytics-body">Loading…</div>
  </div>
</div>`;
};

/* ── Active tab ── */
let _qdActiveTab = 'all';
window._qdTab = (t) => {
  _qdActiveTab = t;
  ['all','walkin','prebooked','emergency'].forEach(tab => {
    const btn = document.getElementById('qt-'+tab);
    if (!btn) return;
    btn.style.background = tab===t?'#fff':'transparent';
    btn.style.color       = tab===t?'var(--green-dark)':'#888';
  });
  _qdLoad();
};

/* ── Load dashboard data ── */
window._qdLoad = async () => {
  const u   = API.getStoredUser();
  const fid = u?.facilityId||u?.facility;
  if (!fid) { _qs('qd-list','<div style="padding:20px;color:var(--text-muted)">No facility assigned.</div>'); return; }

  try {
    const res  = await API._fetchDirect(`/queue2?facility=${fid}&date=${new Date().toISOString().slice(0,10)}`,{method:'GET'});
    const all  = res.data||[], stats=res.stats||{};

    _qt('qd-w', stats.waiting||0);
    _qt('qd-c', stats.inConsult||0);
    _qt('qd-d', stats.completed||0);
    _qt('qd-avg', (stats.avgWaitMins||0)+' min');

    // Filter by tab
    const filtered = _qdActiveTab==='all'      ? all.filter(e=>!['completed','cancelled'].includes(e.status))
                   : _qdActiveTab==='walkin'   ? all.filter(e=>['walkin','priority'].includes(e.tokenType)&&!['completed','cancelled'].includes(e.status))
                   : _qdActiveTab==='prebooked'? all.filter(e=>e.tokenType==='normal'&&!['completed','cancelled'].includes(e.status))
                   :                             all.filter(e=>e.tokenType==='emergency'&&!['completed','cancelled'].includes(e.status));

    // Now serving
    const inC  = all.find(e=>e.status==='in_consultation');
    _qs('qd-now', inC
      ? `<div style="display:flex;align-items:center;gap:10px">
          <div style="font-size:34px;font-weight:900;font-family:var(--mono);color:var(--green-dark)">${inC.token}</div>
          <div style="flex:1">
            <div style="font-weight:700">${inC.patientName||'—'}</div>
            <div style="font-size:12px;color:var(--text-muted)">${inC.tokenType==='normal'?'📅 Pre-booked':'🚶 Walk-in'}${inC.priorityReason?' · '+inC.priorityReason:''}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            <button class="btn btn-xs btn-green" onclick="_qdOpenRoute('${inC._id}')"><i class="ti ti-map-pin"></i>Route</button>
            <button class="btn btn-xs" onclick="_qdStatus('${inC._id}','completed')"><i class="ti ti-check"></i>Done</button>
          </div>
        </div>`
      : '<div style="color:var(--text-muted)">No active consultation</div>');

    // Next
    const nxt = all.filter(e=>e.status==='waiting').sort((a,b)=>b.priority-a.priority||(a.position-b.position))[0];
    _qs('qd-next', nxt
      ? `<div style="display:flex;align-items:center;gap:10px">
          <div style="font-size:26px;font-weight:900;font-family:var(--mono);color:${_QC[nxt.tokenType]||'#888'}">${nxt.token}</div>
          <div style="flex:1">
            <div style="font-weight:600">${nxt.patientName||'—'}</div>
            <div style="font-size:11px;color:var(--text-muted)">${nxt.estimatedWait||0} min est.</div>
          </div>
          <button class="btn btn-xs btn-green" onclick="_qdCall('${nxt._id}')"><i class="ti ti-bell"></i>Call</button>
        </div>`
      : '<div style="color:var(--text-muted)">Queue empty</div>');

    // Glance
    const sat = all.filter(e=>e.satisfaction);
    _qs('qd-glance', `<div style="display:flex;flex-direction:column;gap:7px">
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Walk-ins</span><strong>${all.filter(e=>['walkin','priority'].includes(e.tokenType)).length}</strong></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Pre-booked</span><strong>${all.filter(e=>e.tokenType==='normal').length}</strong></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Emergencies</span><strong style="color:var(--red)">${all.filter(e=>e.tokenType==='emergency').length}</strong></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Satisfaction</span><strong>${sat.length?'⭐ '+(sat.reduce((s,e)=>s+e.satisfaction,0)/sat.length).toFixed(1):'—'}</strong></div>
    </div>`);

    // Queue list
    const statusBadge = { waiting:'badge-amber',called:'badge-blue',in_consultation:'badge-green',post_consultation:'badge-green',lab:'badge-blue',pharmacy:'badge-blue',completed:'badge-gray',skipped:'badge-gray' };
    _qs('qd-list', filtered.length
      ? filtered.map(e=>{
          const c = _QC[e.tokenType]||'#888';
          return `<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border)">
            <div style="width:4px;height:44px;border-radius:2px;background:${c};flex-shrink:0"></div>
            <div style="font-size:20px;font-weight:800;font-family:var(--mono);color:${c};min-width:52px">${e.token}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:13px">${e.patientName||'—'}${e.patientAge?' <span style="color:var(--text-muted);font-weight:400">('+e.patientAge+')</span>':''}</div>
              <div style="font-size:11px;color:var(--text-muted)">${e.tokenType==='normal'?'📅 Pre-booked':'🚶 Walk-in'}${e.priorityReason?' · '+e.priorityReason:''}${e.estimatedWait?' · '+e.estimatedWait+' min':''}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
              <span class="badge ${statusBadge[e.status]||'badge-gray'}" style="font-size:10px">${e.status.replace('_',' ')}</span>
              <div style="display:flex;gap:3px">
                ${e.status==='waiting'?`<button class="btn btn-xs btn-green" onclick="_qdCall('${e._id}')"><i class="ti ti-bell"></i></button>`:''}
                ${e.status==='called'?`<button class="btn btn-xs btn-green" onclick="_qdStatus('${e._id}','in_consultation')"><i class="ti ti-stethoscope"></i></button>`:''}
                ${e.status==='in_consultation'?`<button class="btn btn-xs btn-green" onclick="_qdOpenRoute('${e._id}')"><i class="ti ti-map-pin"></i></button>`:''}
                ${e.status==='waiting'?`<button class="btn btn-xs" onclick="_qdPrioritise('${e._id}')"><i class="ti ti-arrow-up" style="color:var(--amber)"></i></button>`:''}
                ${['waiting','called'].includes(e.status)?`<button class="btn btn-xs" onclick="_qdSkip('${e._id}')"><i class="ti ti-x" style="color:var(--red)"></i></button>`:''}
              </div>
            </div>
          </div>`;
        }).join('')
      : '<div style="padding:28px;text-align:center;color:var(--text-muted)"><i class="ti ti-checks" style="font-size:32px;opacity:.2;display:block;margin-bottom:8px"></i>No patients in this view</div>');

  } catch(e){ _qs('qd-list',`<div style="padding:20px" class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`); }
};

/* ── Queue actions ── */
window._qdCall = async (id) => {
  const room = prompt('Room number (optional):')||'Consultation Room';
  try { await API._fetchDirect(`/queue2/${id}/call`,{method:'PATCH',body:JSON.stringify({room})}); UI.showToast('Patient called','ok'); _qdLoad(); } catch(e){UI.showToast(e.message,'err');}
};
window._qdStatus = async (id, status) => {
  try { await API._fetchDirect(`/queue2/${id}/status`,{method:'PATCH',body:JSON.stringify({status})}); UI.showToast('Updated','ok'); _qdLoad(); } catch(e){UI.showToast(e.message,'err');}
};
window._qdPrioritise = async (id) => {
  const reason = prompt('Priority reason:','elderly'); if(!reason) return;
  try { await API._fetchDirect(`/queue2/${id}/priority`,{method:'PATCH',body:JSON.stringify({priority:1,priorityReason:reason,tokenType:'priority'})}); UI.showToast('Prioritised','ok'); _qdLoad(); } catch(e){UI.showToast(e.message,'err');}
};
window._qdSkip = async (id) => {
  if(!confirm('Mark patient as skipped?')) return;
  try { await API._fetchDirect(`/queue2/${id}/status`,{method:'PATCH',body:JSON.stringify({status:'skipped'})}); UI.showToast('Skipped','ok'); _qdLoad(); } catch(e){UI.showToast(e.message,'err');}
};

/* ── Walk-in registration ── */
window._qdShowWI  = () => { document.getElementById('qd-wi-modal').style.display='flex'; };
window._qdShowEM  = () => { document.getElementById('qd-em-modal').style.display='flex'; };
window._qdShowDelay = () => { document.getElementById('qd-delay-modal').style.display='flex'; };
window._qdShowAnalytics = () => { document.getElementById('qd-analytics').style.display='flex'; _qdLoadAnalytics(7); };
window._qdWiType  = (v) => { document.getElementById('wi-pri-row').style.display=['priority','emergency'].includes(v)?'block':'none'; };

window._qdRegWI = async () => {
  const btn=document.getElementById('wi-btn'), fid=API.getStoredUser()?.facilityId||API.getStoredUser()?.facility;
  const name=document.getElementById('wi-name')?.value?.trim();
  if(!name){ _qdAlert('wi-alert','Name is required'); return; }
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div>';}
  try {
    const res=await API._fetchDirect('/queue2/walkin',{method:'POST',body:JSON.stringify({
      facilityId:fid, patientName:name,
      patientPhone:document.getElementById('wi-phone')?.value?.trim()||'',
      patientAge:parseInt(document.getElementById('wi-age')?.value)||undefined,
      tokenType:document.getElementById('wi-type')?.value||'walkin',
      priorityReason:document.getElementById('wi-reason')?.value||'',
      reason:document.getElementById('wi-complaint')?.value?.trim()||'',
      language:document.getElementById('wi-lang')?.value||'en'
    })});
    document.getElementById('qd-wi-modal').style.display='none';
    _qdShowTokenModal(res.data, document.getElementById('wi-lang')?.value||'en');
    _qdLoad();
    // Clear form
    ['wi-name','wi-phone','wi-age','wi-complaint'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  } catch(e){ _qdAlert('wi-alert',e.message); }
  finally{ if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-user-check"></i>Register & issue token';} }
};

/* ── Emergency override ── */
window._qdEmOverride = async () => {
  const token=document.getElementById('em-token')?.value?.trim();
  const reason=document.getElementById('em-reason')?.value?.trim();
  const fid=API.getStoredUser()?.facilityId||API.getStoredUser()?.facility;
  if(!token||!reason){ _qdAlert('em-alert','Token and reason required'); return; }
  try {
    const r=await API._fetchDirect(`/queue2?facility=${fid}&date=${new Date().toISOString().slice(0,10)}`,{method:'GET'});
    const entry=(r.data||[]).find(e=>e.token.toUpperCase()===token.toUpperCase());
    if(!entry){ _qdAlert('em-alert',`Token ${token} not found`); return; }
    await API._fetchDirect(`/queue2/${entry._id}/priority`,{method:'PATCH',body:JSON.stringify({priority:2,priorityReason:reason,tokenType:'emergency'})});
    document.getElementById('qd-em-modal').style.display='none';
    UI.showToast(`${token} — emergency priority set`,'ok'); _qdLoad();
  } catch(e){ _qdAlert('em-alert',e.message); }
};

/* ── Delay notification ── */
window._qdSendDelay = async () => {
  const fid=API.getStoredUser()?.facilityId||API.getStoredUser()?.facility;
  const mins=parseInt(document.getElementById('delay-mins')?.value)||15;
  const reason=document.getElementById('delay-reason')?.value?.trim()||'';
  try {
    const r=await API._fetchDirect('/queue2/delay-notify',{method:'POST',body:JSON.stringify({facilityId:fid,delayMinutes:mins,reason})});
    document.getElementById('qd-delay-modal').style.display='none';
    UI.showToast(`Delay notification sent to ${r.notified} patients`,'ok');
  } catch(e){ _qdAlert('delay-alert',e.message); }
};

/* ── Post-consult routing ── */
window._qdOpenRoute = (id) => {
  document.getElementById('route-id').value=id;
  ['route-lab','route-rx','route-fu'].forEach(i=>{const e=document.getElementById(i);if(e)e.checked=false;});
  ['rl-lab','rl-rx'].forEach(i=>{const e=document.getElementById(i);if(e)e.style.borderColor='var(--border)';});
  document.getElementById('fu-opts').style.display='none';
  document.getElementById('route-notes').value='';
  document.getElementById('qd-route-modal').style.display='flex';
};
window._qdSubmitRoute = async () => {
  const id=document.getElementById('route-id').value;
  try {
    await API._fetchDirect(`/queue2/${id}/route-post-consult`,{method:'POST',body:JSON.stringify({
      needsLab:document.getElementById('route-lab')?.checked,
      needsPharmacy:document.getElementById('route-rx')?.checked,
      needsFollowUp:document.getElementById('route-fu')?.checked,
      followUpDays:parseInt(document.getElementById('fu-days')?.value)||7,
      followUpReason:document.getElementById('fu-reason')?.value||'',
      notes:document.getElementById('route-notes')?.value||''
    })});
    document.getElementById('qd-route-modal').style.display='none';
    UI.showToast('Patient routed successfully','ok'); _qdLoad();
  } catch(e){ UI.showToast(e.message,'err'); }
};
window._qdCompleteOnly = async () => {
  const id=document.getElementById('route-id').value;
  await _qdStatus(id,'completed');
  document.getElementById('qd-route-modal').style.display='none';
};

/* ── Token modal ── */
function _qdShowTokenModal(entry, lang='en') {
  const L=_QL[lang]||_QL.en;
  _qt('tm-greeting',L.greeting); _qt('tm-name',entry.patientName||'');
  _qt('tm-token',entry.token); _qt('tm-pos',entry.position||'—');
  _qt('tm-wait',entry.estimatedWait??'—');
  _qt('tm-note','Please remain in the waiting area · '+L.checkedIn);
  window._lastEntry=entry; window._lastLang=lang;
  document.getElementById('qd-token-modal').style.display='flex';
}
window._qdPrintToken = () => {
  const e=window._lastEntry; if(!e) return;
  const L=_QL[window._lastLang||'en']||_QL.en;
  const typeLabel={emergency:'EMERGENCY',priority:'PRIORITY',normal:'PRE-BOOKED',walkin:'WALK-IN'}[e.tokenType]||'WALK-IN';
  const bgColor={emergency:'#E24B4A',priority:'#EF9F27',normal:'#1A4A9B',walkin:'#0F6E56'}[e.tokenType]||'#0F6E56';
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>Token ${e.token}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;text-align:center;padding:30px;max-width:280px;margin:0 auto}
    .type{font-size:11px;padding:3px 10px;border-radius:20px;background:${bgColor};color:#fff;display:inline-block;margin-bottom:14px}
    .token{font-size:68px;font-weight:900;color:#0F6E56;line-height:1;margin:8px 0;font-family:monospace}
    .info{display:flex;justify-content:space-around;margin:14px 0}.info div{text-align:center}
    .info span{font-size:20px;font-weight:700;display:block}
    .note{font-size:11px;color:#aaa;margin-top:14px;line-height:1.6}</style>
    </head><body>
    <div style="font-size:20px;font-weight:900;color:#0F6E56;margin-bottom:4px">NIHMS</div>
    <div style="font-size:11px;color:#888;margin-bottom:16px">National Integrated Healthcare Management System</div>
    <div class="type">${typeLabel}</div>
    <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#aaa">${L.token}</div>
    <div class="token">${e.token}</div>
    <div class="info">
      <div><span>${e.position||'—'}</span>Position</div>
      <div><span>${e.estimatedWait??'—'}</span>${L.wait} (${L.minutes})</div>
    </div>
    <div class="note">Please remain in the waiting area<br>${new Date().toLocaleString('en-ZA')}</div>
    </body></html>`);
  w.document.close(); setTimeout(()=>w.print(),400);
};

/* ── Analytics ── */
window._qdLoadAnalytics = async (days) => {
  [7,14,30].forEach(d=>{const b=document.getElementById('ana-'+d);if(b){b.style.background=d===days?'var(--green)':'';b.style.color=d===days?'#fff':'';b.style.borderColor=d===days?'var(--green)':'';}});
  const fid=API.getStoredUser()?.facilityId||API.getStoredUser()?.facility;
  _qs('analytics-body','<div style="text-align:center;padding:24px;color:var(--text-muted)">Loading…</div>');
  try {
    const r=await API._fetchDirect(`/queue2/analytics?facility=${fid}&days=${days}`,{method:'GET'});
    const d=r.data;
    const peakHour=(d.byHour||[]).sort((a,b)=>b.count-a.count)[0];
    _qs('analytics-body',`
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:14px">
        ${[['Total',d.total],['Completed',d.completed],['Avg wait',d.avgWait+' min'],['Satisfaction',d.avgSatisfaction?'⭐ '+d.avgSatisfaction:'—']].map(([l,v])=>`
          <div style="padding:12px;background:var(--bg-surface);border-radius:var(--radius)">
            <div style="font-size:11px;color:var(--text-muted)">${l}</div>
            <div style="font-size:22px;font-weight:700">${v}</div>
          </div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="card">
          <div class="card-title"><i class="ti ti-users"></i>Patient types</div>
          ${[['Pre-booked','#4A6CF7',d.prebooked||0],['Walk-ins','#1D9E75',d.walkins||0],['Emergency','#E24B4A',d.emergency||0],['Skipped','#aaa',d.skipped||0]].map(([l,c,v])=>`
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <div style="width:8px;height:8px;border-radius:50%;background:${c}"></div>
              <span style="flex:1;font-size:13px;color:var(--text-muted)">${l}</span><strong>${v}</strong>
              <div style="width:80px;height:6px;background:var(--bg-surface);border-radius:4px;overflow:hidden">
                <div style="height:100%;background:${c};width:${d.total?Math.round(v/d.total*100):0}%"></div>
              </div>
            </div>`).join('')}
        </div>
        <div class="card">
          <div class="card-title"><i class="ti ti-clock"></i>Wait time distribution</div>
          ${[['≤ 15 min','var(--green)',d.waitDistribution?.under15||0],['≤ 30 min','var(--amber)',d.waitDistribution?.under30||0],[' > 30 min','var(--red)',d.waitDistribution?.over30||0]].map(([l,c,v])=>`
            <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px">
              <span style="color:var(--text-muted)">${l}</span><strong style="color:${c}">${v}</strong>
            </div>`).join('')}
          <div style="font-size:12px;color:var(--text-hint);margin-top:8px">
            Peak hour: ${peakHour?peakHour.hour+':00 ('+peakHour.count+' patients)':'—'}
          </div>
        </div>
      </div>`);
  } catch(e){ _qs('analytics-body',`<div class="alert-box alert-danger">${e.message}</div>`); }
};

/* ── Alert helper ── */
function _qdAlert(id, msg) {
  const el=document.getElementById(id); if(!el) return;
  el.className='alert alert-error'; el.innerHTML=`<i class="ti ti-alert-circle"></i> ${msg}`;
  el.classList.remove('hidden');
}

/* ══════════════════════════════════════════════════
   PATIENT CHECK-IN PAGE
══════════════════════════════════════════════════ */
Pages['checkin'] = () => {
  if (window._ciPollInt) clearInterval(window._ciPollInt);
  setTimeout(_ciLoad, 0);
  return `
<div class="page-title">Queue check-in</div>
<div id="ci-body" style="max-width:540px;margin:0 auto;color:var(--text-muted)">Loading…</div>`;
};

async function _ciLoad() {
  const wrap = document.getElementById('ci-body');
  if (!wrap) return;
  try {
    const patRes = await API._fetchDirect('/patients/me',{method:'GET'});
    const p = patRes?.data;
    if (!p) { wrap.innerHTML='<div class="alert-box alert-warn"><i class="ti ti-alert-triangle"></i>Please complete your patient profile first.</div>'; return; }

    const u   = API.getStoredUser();
    const fid = u?.facilityId||u?.facility;

    // Check if already in queue
    const qr = await API._fetchDirect(`/queue2/my-token?patientId=${p._id||p.user}&facilityId=${fid}`,{method:'GET'});
    const tok = qr?.data;

    if (tok && !['completed','cancelled','skipped'].includes(tok.status)) {
      wrap.innerHTML = _ciRenderToken(tok);
      // Poll every 20s
      if (window._ciPollInt) clearInterval(window._ciPollInt);
      window._ciPollInt = setInterval(async () => {
        if (!document.getElementById('ci-body')) { clearInterval(window._ciPollInt); return; }
        try {
          const r2=await API._fetchDirect(`/queue2/my-token?patientId=${p._id||p.user}&facilityId=${fid}`,{method:'GET'});
          if(r2?.data && document.getElementById('ci-body'))
            document.getElementById('ci-body').innerHTML=_ciRenderToken(r2.data);
        } catch(_){}
      }, 20000);
      return;
    }

    // Show check-in options
    const apptRes  = await API.appointments.list({ patient:p._id||p.user, limit:20 });
    const todayStr = new Date().toDateString();
    const todayAppts = (apptRes.data||[]).filter(a=>
      new Date(a.scheduledAt).toDateString()===todayStr && ['confirmed','pending'].includes(a.status)
    );

    wrap.innerHTML = `
      ${todayAppts.length ? `
      <!-- Pre-booked flow -->
      <div class="card" style="margin-bottom:14px;border:1.5px solid var(--green)">
        <div class="card-title" style="color:var(--green-dark)"><i class="ti ti-calendar-check"></i>Your appointment today — Priority check-in</div>
        <div class="alert-box alert-ok" style="margin-bottom:12px"><i class="ti ti-info-circle"></i>Pre-booked patients receive priority placement.</div>
        ${todayAppts.map(a=>`
          <div style="padding:12px;background:var(--green-light);border-radius:var(--radius);margin-bottom:8px">
            <div style="font-weight:600;text-transform:capitalize">${(a.visitType||'Consultation').replace('_',' ')}</div>
            <div style="font-size:12px;color:var(--text-muted);margin:4px 0">
              ${new Date(a.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
              ${a.facility?.name?' · '+a.facility.name:''}
              ${a.doctor?' · Dr. '+a.doctor.firstName+' '+a.doctor.lastName:''}
            </div>
            ${a.reason?`<div style="font-size:12px;color:var(--text-muted)">${a.reason}</div>`:''}
            <button class="btn btn-sm btn-green" style="margin-top:10px;width:100%"
              onclick="_ciPrebookedCI('${p._id||p.user}','${fid}','${a._id}')">
              <i class="ti ti-login"></i>Check in for this appointment
            </button>
          </div>`).join('')}
      </div>` : ''}

      <!-- Walk-in flow -->
      <div class="card">
        <div class="card-title"><i class="ti ti-walk"></i>${todayAppts.length?'Walk-in check-in':'Check in to queue'}</div>
        ${!todayAppts.length?`<div class="alert-box alert-info" style="margin-bottom:12px"><i class="ti ti-info-circle"></i>No appointments today — you can walk in below.</div>`:''}
        <div class="f-group"><label class="f-label">Visit type</label>
          <select class="f-select" id="ci-type" style="margin:0" onchange="_ciType(this.value)">
            <option value="walkin">General walk-in</option>
            <option value="priority">Priority — I need assistance</option>
          </select>
        </div>
        <div id="ci-pri-row" style="display:none;margin-top:8px">
          <div class="f-group"><label class="f-label">Priority reason</label>
            <select class="f-select" id="ci-reason" style="margin:0">
              <option value="elderly">I am elderly (65+)</option>
              <option value="pregnant">I am pregnant</option>
              <option value="disabled">I have a disability</option>
              <option value="child_under_5">I have a child under 5</option>
            </select>
          </div>
        </div>
        <div class="f-group" style="margin-top:8px"><label class="f-label">Language preference</label>
          <select class="f-select" id="ci-lang" style="margin:0">
            <option value="en">English</option><option value="zu">isiZulu</option>
            <option value="af">Afrikaans</option><option value="st">Sesotho</option>
          </select>
        </div>
        <div id="ci-alert" class="alert hidden" style="margin-top:8px"></div>
        <button class="btn btn-green" id="ci-btn" style="width:100%;margin-top:12px"
          onclick="_ciWalkIn('${p._id||p.user}','${fid}')">
          <i class="ti ti-login"></i>Check in now
        </button>
      </div>`;
  } catch(e){ if(wrap) wrap.innerHTML=`<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`; }
}

window._ciType = (v) => {
  document.getElementById('ci-pri-row').style.display=v==='priority'?'block':'none';
};

window._ciPrebookedCI = async (pid, fid, apptId) => {
  const btn=event?.target?.closest('button');
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div> Checking in…';}
  try {
    const res=await API._fetchDirect('/queue2/prebooked-checkin',{method:'POST',body:JSON.stringify({patientId:pid,facilityId:fid,appointmentId:apptId})});
    if(res.doctorLate) UI.showToast(`Doctor running ~${res.minutesLate} min late`,'warn');
    Router.setPage('checkin');
  } catch(e){ UI.showToast(e.message||'Check-in failed','err'); if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-login"></i>Check in';} }
};

window._ciWalkIn = async (pid, fid) => {
  const btn=document.getElementById('ci-btn');
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div> Checking in…';}
  try {
    await API._fetchDirect('/queue2/checkin',{method:'POST',body:JSON.stringify({
      patientId:pid, facilityId:fid,
      tokenType:document.getElementById('ci-type')?.value==='priority'?'priority':'walkin',
      priorityReason:document.getElementById('ci-reason')?.value||'',
      language:document.getElementById('ci-lang')?.value||'en'
    })});
    Router.setPage('checkin');
  } catch(e){
    _qdAlert('ci-alert', e.message||'Check-in failed');
    if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-login"></i>Check in now';}
  }
};

/* ── Render patient token view ── */
function _ciRenderToken(tok) {
  const called = tok.status==='called';
  const done   = ['completed','post_consultation','lab','pharmacy'].includes(tok.status);
  const statusInfo = {
    waiting:         {bg:'var(--bg-surface)',c:'var(--amber)',    ic:'ti-clock',         msg:'Please wait — you will be called shortly'},
    called:          {bg:'var(--green-light)',c:'var(--green-dark)',ic:'ti-bell-ringing', msg:'Please proceed to the consultation room NOW'},
    in_consultation: {bg:'var(--green-light)',c:'var(--green-dark)',ic:'ti-stethoscope', msg:'You are in consultation'},
    post_consultation:{bg:'var(--bg-surface)',c:'var(--blue)',    ic:'ti-checks',        msg:'Consultation complete'},
    lab:             {bg:'#EEF2FF',c:'#4A6CF7',                  ic:'ti-flask',         msg:'Please go to the Laboratory'},
    pharmacy:        {bg:'var(--green-light)',c:'var(--green-dark)',ic:'ti-pill',        msg:'Please go to the Pharmacy'},
    completed:       {bg:'var(--green-light)',c:'var(--green-dark)',ic:'ti-circle-check',msg:'Your visit is complete. Thank you!'},
  }[tok.status]||{bg:'var(--bg-surface)',c:'var(--amber)',ic:'ti-clock',msg:'Please wait'};

  return `
    <!-- Token display -->
    <div class="card" style="${called?'border:2px solid var(--green)':''};margin-bottom:14px;text-align:center">
      ${called?`<div style="background:var(--green);color:#fff;padding:12px;margin:-1px -1px 16px;border-radius:var(--radius-xl) var(--radius-xl) 0 0;font-weight:700;font-size:15px">
        🔔 IT'S YOUR TURN — Please proceed to the consultation room
      </div>`:''}
      <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-hint);margin-bottom:4px">Your queue token</div>
      <div style="font-size:76px;font-weight:900;color:var(--green-dark);font-family:var(--mono);line-height:1;margin:4px 0">${tok.token}</div>
      <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 14px;border-radius:20px;background:${tok.tokenType==='normal'?'#EEF2FF':'var(--green-light)'};color:${tok.tokenType==='normal'?'#4A6CF7':'var(--green-dark)'};font-size:12px;font-weight:600;margin:8px 0">
        ${tok.tokenType==='normal'?'📅 Pre-booked':'🚶 Walk-in'}${tok.priorityReason?' · '+tok.priorityReason:''}
      </div>
      <div style="display:flex;justify-content:center;gap:32px;margin:14px 0">
        <div><div style="font-size:28px;font-weight:800">${tok.aheadCount??'—'}</div><div style="font-size:12px;color:var(--text-muted)">Ahead of you</div></div>
        <div style="width:1px;background:var(--border)"></div>
        <div><div style="font-size:28px;font-weight:800">${tok.estimatedWait??'—'}</div><div style="font-size:12px;color:var(--text-muted)">Est. wait (min)</div></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:var(--radius);background:${statusInfo.bg};color:${statusInfo.c};font-weight:500;font-size:13px">
        <i class="ti ${statusInfo.ic}"></i>${statusInfo.msg}
      </div>
    </div>

    ${done&&['lab','pharmacy'].includes(tok.status)?`
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><i class="ti ti-map-pin"></i>Your next step</div>
      ${tok.status==='lab'?'<div class="alert-box alert-info"><i class="ti ti-flask"></i>Please go to the <strong>Laboratory</strong> for your tests</div>':''}
      ${tok.status==='pharmacy'?'<div class="alert-box alert-ok"><i class="ti ti-pill"></i>Please collect your medication from the <strong>Pharmacy</strong></div>':''}
    </div>`:''}

    ${tok.status==='completed'?`
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><i class="ti ti-star"></i>How was your experience?</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Your feedback helps us improve our service.</div>
      <div id="star-row" style="display:flex;justify-content:center;gap:6px;margin-bottom:10px">
        ${[1,2,3,4,5].map(n=>`
          <button onclick="_ciRate('${tok._id}',${n})"
            style="font-size:30px;background:none;border:none;cursor:pointer;transition:transform .15s;line-height:1"
            onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform=''">
            ${'⭐'.repeat(n)}${'☆'.repeat(5-n)}
          </button>`).join('')}
      </div>
      <div id="rate-thanks" style="display:none;text-align:center;color:var(--green-dark);font-weight:500">Thank you for your feedback! ⭐</div>
    </div>`:''}

    <div style="text-align:center">
      <button class="btn btn-xs" onclick="_ciLoad()"><i class="ti ti-refresh"></i>Refresh status</button>
    </div>`;
}

window._ciRate = async (id, rating) => {
  try {
    await API._fetchDirect(`/queue2/${id}/feedback`,{method:'POST',body:JSON.stringify({satisfaction:rating})});
    document.getElementById('star-row').style.display='none';
    document.getElementById('rate-thanks').style.display='block';
  } catch(_){ UI.showToast('Feedback failed','err'); }
};
