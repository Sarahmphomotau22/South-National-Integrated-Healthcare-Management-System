/**
 * facility_admin.js — Facility Admin Dashboard (Image 1 wireframe)
 */
if (typeof Pages === 'undefined') window.Pages = {};

Pages['facility_admin'] = () => {
  if (window._fadInterval) clearInterval(window._fadInterval);
  setTimeout(_loadFAD, 100);
  window._fadInterval = setInterval(_loadFAD, 30000);

  return `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
  <div class="page-title" style="margin:0">Facility Admin Dashboard</div>
  <div style="font-size:13px;color:var(--text-muted);display:flex;align-items:center;gap:6px">
    <i class="ti ti-map-pin" style="font-size:14px"></i>
    <span id="fad-facility-name">Loading…</span>
  </div>
</div>

<!-- Top stats row -->
<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:16px">
  <div style="padding:16px 20px;border-radius:var(--radius-xl);background:#FFF9E6;border:1.5px solid #F0D060">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#A07820">WAITING</div>
    <div id="fad-waiting" style="font-size:44px;font-weight:900;color:#7A5C10;line-height:1.1">—</div>
  </div>
  <div style="padding:16px 20px;border-radius:var(--radius-xl);background:#EEF2FF;border:1.5px solid #BEC8F0">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#3A4898">IN CONSULT</div>
    <div id="fad-consult" style="font-size:44px;font-weight:900;color:#1E2C80;line-height:1.1">—</div>
  </div>
  <div style="padding:16px 20px;border-radius:var(--radius-xl);background:#EDFBF3;border:1.5px solid #7ADAA8">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#1A6E40">COMPLETED</div>
    <div id="fad-completed" style="font-size:44px;font-weight:900;color:#0E4A28;line-height:1.1">—</div>
  </div>
  <div style="padding:16px 20px;border-radius:var(--radius-xl);background:var(--bg-surface);border:1.5px solid var(--border);position:relative">
    <div style="font-size:10px;font-weight:600;color:var(--text-muted);margin-bottom:4px;display:flex;align-items:center;gap:4px">
      <i class="ti ti-brain" style="font-size:12px;color:#4A6CF7"></i>AI Insight
    </div>
    <div id="fad-ai-insight" style="font-size:13px;font-weight:600;color:#4A6CF7;line-height:1.4">Analysing…</div>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 340px;gap:14px">
  <!-- Left -->
  <div style="display:flex;flex-direction:column;gap:14px">

    <!-- Staff status + resource overview -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div class="card-title" style="margin:0"><i class="ti ti-users-group"></i>Staff status & resource overview</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px" id="fad-resources">
        <div style="padding:12px;border:1px solid var(--border);border-radius:var(--radius)"><div style="font-size:12px;font-weight:600;margin-bottom:8px">Pharmacy stock</div><div id="fad-pharmacy" style="font-size:13px;color:var(--text-muted)">Loading…</div></div>
        <div style="padding:12px;border:1px solid var(--border);border-radius:var(--radius)"><div style="font-size:12px;font-weight:600;margin-bottom:8px">Lab tests pending</div><div id="fad-labs" style="font-size:13px;color:var(--text-muted)">Loading…</div></div>
        <div style="padding:12px;border:1px solid var(--border);border-radius:var(--radius)"><div style="font-size:12px;font-weight:600;margin-bottom:8px">Equipment</div><div id="fad-equip" style="font-size:13px;color:var(--text-muted)">—</div></div>
        <div style="padding:12px;border:1px solid var(--border);border-radius:var(--radius);background:#EDFBF3">
          <div style="font-size:12px;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:4px"><i class="ti ti-brain" style="color:#4A6CF7;font-size:13px"></i>AI Forecast</div>
          <div id="fad-forecast" style="font-size:12px;color:var(--text-muted)">Analysing…</div>
          <div style="margin-top:6px;width:24px;height:24px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center"><i class="ti ti-check" style="color:#fff;font-size:13px"></i></div>
        </div>
      </div>
    </div>

    <!-- Facility queue -->
    <div class="card" style="flex:1">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="card-title" style="margin:0"><i class="ti ti-list-numbers"></i>Facility queue</div>
        <button class="btn btn-xs btn-green" onclick="Router.setPage('queue_dashboard')">Full dashboard →</button>
      </div>
      <div id="fad-queue-list" style="font-size:13px;color:var(--text-muted)">Loading…</div>
      <div style="margin-top:12px;text-align:center">
        <button class="btn" onclick="_optimiseQueue()"><i class="ti ti-adjustments"></i>Optimise queue</button>
      </div>
    </div>

    <!-- Bottom action buttons -->
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" onclick="_manageShifts()"><i class="ti ti-calendar-stats"></i>Manage shifts</button>
      <button class="btn" onclick="_generateReport()"><i class="ti ti-file-analytics"></i>Generate report</button>
      <button class="btn" onclick="_restockRequest()"><i class="ti ti-package"></i>Restock request</button>
    </div>
  </div>

  <!-- Right -->
  <div style="display:flex;flex-direction:column;gap:12px">
    <!-- Today's metrics -->
    <div class="card">
      <div class="card-title"><i class="ti ti-chart-dots"></i>Today's metrics</div>
      <div style="display:flex;flex-direction:column;gap:10px;font-size:14px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="color:var(--text-muted)">Patients seen</span>
          <strong id="fad-seen" style="font-size:18px">—</strong>
        </div>
        <div style="height:1px;background:var(--border)"></div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">Avg wait time</span>
          <strong id="fad-avgwait">—</strong>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">Satisfaction score</span>
          <strong id="fad-sat">—</strong>
        </div>
      </div>
    </div>

    <!-- AI alerts -->
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <i class="ti ti-bulb" style="color:#4A6CF7;font-size:18px"></i>
        <div style="font-weight:700;font-size:14px">AI alerts & suggestions</div>
      </div>
      <div id="fad-ai-alerts" style="display:flex;flex-direction:column;gap:8px;font-size:13px">Loading…</div>
    </div>

    <!-- Performance trends mini chart -->
    <div class="card" style="flex:1">
      <div class="card-title"><i class="ti ti-chart-line"></i>Performance trends</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Weekly patient volume</div>
      <div id="fad-chart" style="height:100px;position:relative;overflow:hidden">
        <canvas id="fad-canvas" style="width:100%;height:100%"></canvas>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-hint);margin-top:4px">
        ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<span>${d}</span>`).join('')}
      </div>
    </div>
  </div>
</div>`;
};

async function _loadFAD() {
  const user = API.getStoredUser();
  const fid  = user?.facilityId||user?.facility;
  if (!fid) return;
  const today = new Date().toISOString().slice(0,10);

  const s = (id,v) => { const e=document.getElementById(id); if(e) e.innerHTML=v; };

  try {
    const [qRes, labRes, medRes] = await Promise.all([
      API._fetchDirect(`/queue2?facility=${fid}&date=${today}`,{method:'GET'}),
      API._fetchDirect(`/labs?facility=${fid}&status=ordered&limit=50`,{method:'GET'}).catch(()=>({data:[]})),
      API._fetchDirect(`/medications?facility=${fid}&limit=100`,{method:'GET'}).catch(()=>({data:[]})),
    ]);

    const entries = qRes.data||[];
    const stats   = qRes.stats||{};
    const labs    = labRes.data||[];
    const meds    = medRes.data||[];

    // Facility name
    s('fad-facility-name', user?.facilityName||'Your Facility');

    // Top stats
    s('fad-waiting',   entries.filter(e=>e.status==='waiting').length);
    s('fad-consult',   entries.filter(e=>e.status==='in_consultation').length);
    s('fad-completed', entries.filter(e=>e.status==='completed').length);

    // Today metrics
    s('fad-seen',    entries.filter(e=>e.status==='completed').length);
    s('fad-avgwait', (stats.avgWaitMins||0)+' min');
    const sat = entries.filter(e=>e.satisfaction);
    s('fad-sat', sat.length ? '⭐ '+(sat.reduce((a,e)=>a+e.satisfaction,0)/sat.length).toFixed(1)+'/5' : '—');

    // Pharmacy
    const lowStock = meds.filter(m=>(m.stockQty||0)<=(m.reorderLevel||50));
    s('fad-pharmacy', lowStock.length
      ? `<div style="color:var(--amber);font-weight:600"><i class="ti ti-alert-triangle"></i> ${lowStock.length} low stock item${lowStock.length!==1?'s':''}</div>
         <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${lowStock.slice(0,2).map(m=>m.name).join(', ')}</div>`
      : `<div style="color:var(--green-dark)"><i class="ti ti-check"></i> Stock levels OK</div>`);

    // Labs
    s('fad-labs', labs.length
      ? `<div style="display:flex;flex-direction:column;gap:3px">${['ordered','in_lab','processing'].map(st=>{const c=labs.filter(l=>l.status===st).length;return c?`<div style="display:flex;align-items:center;gap:6px"><i class="ti ti-check" style="color:var(--green-dark);font-size:12px"></i><span style="font-size:12px">${c} ${st.replace('_',' ')}</span></div>`:''}).filter(Boolean).join('')}</div>`
      : '<div style="color:var(--text-muted)">No pending tests</div>');

    // Equipment (mocked)
    s('fad-equip', '<div style="font-size:18px;font-weight:700;color:var(--text)">78%</div><div style="font-size:11px;color:var(--text-muted)">In use</div>');

    // AI Forecast
    const hour = new Date().getHours();
    const peakHour = 11;
    const isApproachingPeak = Math.abs(hour - peakHour) <= 2;
    s('fad-forecast', isApproachingPeak
      ? `<span style="color:#EF9F27;font-weight:600">High queue predicted at ${peakHour}:00</span><br><span style="font-size:11px">Consider adding staff</span>`
      : `<span style="color:var(--green-dark)">Queue levels normal</span><br><span style="font-size:11px">Next restock suggested</span>`);

    // AI insight card
    s('fad-ai-insight', isApproachingPeak
      ? `Predicted: <span style="text-decoration:underline">High Queue</span> at ${peakHour}:00 AM`
      : `Queue flow is normal. ${entries.filter(e=>e.status==='waiting').length} waiting.`);

    // AI alerts
    const alerts = [];
    if (isApproachingPeak) alerts.push({ icon:'ti-alert-triangle', bg:'#FFF5F5', ic:'#E24B4A', msg:`High queue predicted at ${peakHour}:00 — consider adding staff` });
    if (lowStock.length)   alerts.push({ icon:'ti-package', bg:'#FFFBEB', ic:'#D97706', msg:`Low stock: ${lowStock.slice(0,2).map(m=>m.name).join(', ')}` });
    alerts.push({ icon:'ti-users-group', bg:'#EEF2FF', ic:'#4A6CF7', msg:'Shift optimisation: consider overlapping nurse shifts 10:00–13:00' });
    s('fad-ai-alerts', alerts.map(a=>`
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;background:${a.bg};border-radius:8px">
        <i class="ti ${a.icon}" style="color:${a.ic};font-size:16px;flex-shrink:0;margin-top:1px"></i>
        <span style="font-size:13px">${a.msg}</span>
      </div>`).join(''));

    // Queue list (top 3)
    const active = entries.filter(e=>!['completed','cancelled'].includes(e.status)).slice(0,3);
    s('fad-queue-list', active.length
      ? active.map(e=>`
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="width:4px;height:40px;border-radius:2px;background:${e.tokenType==='emergency'?'#E24B4A':e.tokenType==='priority'?'#EF9F27':'var(--green)'};flex-shrink:0"></div>
          <div style="font-size:20px;font-weight:800;font-family:var(--mono);color:var(--green-dark);min-width:54px">${e.token}</div>
          <div style="flex:1"><div style="font-weight:600;font-size:13px">${e.patientName||'—'}</div>
            <div style="font-size:11px;color:var(--text-muted)">${e.priorityReason||'General consultation'}</div></div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-xs" onclick="_callPatient&&_callPatient('${e._id}')"><i class="ti ti-bell" style="font-size:12px"></i></button>
          </div>
        </div>`).join('')
      : '<div style="text-align:center;padding:20px;color:var(--text-muted)">Queue is empty</div>');

    // Mini chart (SVG sparkline)
    _drawFADChart([20,35,28,42,38,15,22]);

  } catch(err){ console.warn('FAD error:', err.message); }
}

function _drawFADChart(data) {
  const canvas = document.getElementById('fad-canvas');
  if (!canvas) return;
  const W = canvas.parentElement.offsetWidth || 280;
  const H = 100;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const max = Math.max(...data);
  const pts = data.map((v,i)=>({ x: (i/(data.length-1))*W, y: H - (v/max)*(H-10)-5 }));

  // Line
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));
  ctx.strokeStyle='#0F6E56'; ctx.lineWidth=2; ctx.stroke();

  // Fill
  ctx.beginPath();
  ctx.moveTo(pts[0].x,H);
  pts.forEach(p=>ctx.lineTo(p.x,p.y));
  ctx.lineTo(pts[pts.length-1].x,H);
  ctx.fillStyle='rgba(15,110,86,0.08)'; ctx.fill();

  // Dots
  pts.forEach(p=>{ ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fillStyle='#0F6E56'; ctx.fill(); });
}

window._optimiseQueue  = () => { Router.setPage('queue_dashboard'); UI.showToast('Opening queue optimisation…','ok'); };
window._manageShifts   = () => UI.showToast('Shift management — coming soon','info');
window._generateReport = () => UI.showToast('Generating report…','ok');
window._restockRequest = () => UI.showToast('Restock request submitted','ok');
