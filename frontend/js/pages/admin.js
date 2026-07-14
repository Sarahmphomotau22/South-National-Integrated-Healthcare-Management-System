/**
 * js/pages/admin.js — Admin portal pages
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ══════════════════════════════════════
   OVERVIEW / ANALYTICS
══════════════════════════════════════ */
Pages['overview'] = () => {
  setTimeout(_loadAdminOverview, 100);
  return `
<div class="page-title">System overview</div>
<div class="metric-grid metric-grid-4" style="margin-bottom:16px">
  <div class="metric-card"><div class="metric-label">Total patients</div><div class="metric-value" id="ao-patients">—</div></div>
  <div class="metric-card"><div class="metric-label">Active facilities</div><div class="metric-value" id="ao-facilities">—</div></div>
  <div class="metric-card"><div class="metric-label">Appointments today</div><div class="metric-value" id="ao-appts">—</div></div>
  <div class="metric-card"><div class="metric-label">Queue waiting (now)</div><div class="metric-value" id="ao-queue">—</div></div>
</div>
<div class="two-col">
  <div class="card">
    <div class="card-title"><i class="ti ti-users"></i>System users</div>
    <div id="ao-users-summary" style="font-size:13px;color:var(--text-muted)">Loading…</div>
  </div>
  <div class="card">
    <div class="card-title"><i class="ti ti-chart-bar"></i>Queue analytics (30 days)</div>
    <div id="ao-queue-analytics" style="font-size:13px;color:var(--text-muted)">Loading…</div>
  </div>
</div>`;
};

async function _loadAdminOverview() {
  try {
    const [patRes, facRes, qRes] = await Promise.all([
      API._fetchDirect('/patients?limit=1',{method:'GET'}),
      API._fetchDirect('/facilities',{method:'GET'}),
      API._fetchDirect(`/queue2?facility=all&date=${new Date().toISOString().slice(0,10)}`,{method:'GET'}).catch(()=>({data:[],stats:{}}))
    ]);
    const s = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    s('ao-patients',   patRes.pagination?.total||patRes.data?.length||'—');
    s('ao-facilities', (facRes.data||[]).length);
    s('ao-appts',      '—');
    s('ao-queue',      qRes.stats?.waiting||0);

    // Users summary
    const usersEl = document.getElementById('ao-users-summary');
    if (usersEl) {
      const usersRes = await API._fetchDirect('/users?limit=100',{method:'GET'});
      const users = usersRes.data||[];
      const byRole = {};
      users.forEach(u=>{ byRole[u.role]=(byRole[u.role]||0)+1; });
      usersEl.innerHTML = Object.entries(byRole).map(([r,c])=>`
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px">
          <span style="text-transform:capitalize;color:var(--text-muted)">${r}</span><strong>${c}</strong>
        </div>`).join('')||'<div style="color:var(--text-muted)">No users found</div>';
    }

    // Queue analytics
    const anaEl = document.getElementById('ao-queue-analytics');
    if (anaEl) {
      const facs = facRes.data||[];
      if (facs.length) {
        const anaRes = await API._fetchDirect(`/queue2/analytics?facility=${facs[0]._id}&days=30`,{method:'GET'}).catch(()=>({data:{}}));
        const d = anaRes.data||{};
        anaEl.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:8px">
            ${[['Total patients',d.total||0],['Completed',d.completed||0],['Avg wait',(d.avgWait||0)+' min'],['Satisfaction',d.avgSatisfaction?'⭐ '+d.avgSatisfaction:'—']]
              .map(([l,v])=>`<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">${l}</span><strong>${v}</strong></div>`).join('')}
          </div>`;
      }
    }
  } catch(e){ console.warn('Admin overview error:', e.message); }
}

/* ══════════════════════════════════════
   PATIENT FLOW
══════════════════════════════════════ */
Pages['flow'] = () => {
  setTimeout(_loadFlow, 100);
  return `
<div class="page-title">Patient flow</div>
<div class="metric-grid metric-grid-4" style="margin-bottom:16px">
  <div class="metric-card"><div class="metric-label">Today's total</div><div class="metric-value" id="fl-total">—</div></div>
  <div class="metric-card"><div class="metric-label">Avg wait time</div><div class="metric-value" id="fl-wait">—</div></div>
  <div class="metric-card"><div class="metric-label">Satisfaction</div><div class="metric-value" id="fl-sat">—</div></div>
  <div class="metric-card"><div class="metric-label">Emergencies</div><div class="metric-value" id="fl-em" style="color:var(--red)">—</div></div>
</div>
<div class="two-col">
  <div class="card">
    <div class="card-title"><i class="ti ti-chart-bar"></i>Patient volume by type</div>
    <div id="fl-types" style="font-size:13px">Loading…</div>
  </div>
  <div class="card">
    <div class="card-title"><i class="ti ti-clock"></i>Wait time breakdown</div>
    <div id="fl-wait-breakdown" style="font-size:13px">Loading…</div>
  </div>
</div>`;
};

async function _loadFlow() {
  try {
    const facRes = await API._fetchDirect('/facilities',{method:'GET'});
    const facs   = facRes.data||[];
    if (!facs.length) return;
    const anaRes = await API._fetchDirect(`/queue2/analytics?facility=${facs[0]._id}&days=7`,{method:'GET'});
    const d = anaRes.data||{};
    const s = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    s('fl-total', d.total||0);
    s('fl-wait',  (d.avgWait||0)+' min');
    s('fl-sat',   d.avgSatisfaction?'⭐ '+d.avgSatisfaction:'—');
    s('fl-em',    d.emergency||0);

    const typesEl = document.getElementById('fl-types');
    if (typesEl) {
      const bars = [['Pre-booked','#4A6CF7',d.prebooked||0],['Walk-ins','#1D9E75',d.walkins||0],['Priority','#EF9F27',0],['Emergency','#E24B4A',d.emergency||0]];
      const max  = Math.max(...bars.map(b=>b[2]),1);
      typesEl.innerHTML = bars.map(([l,c,v])=>`
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
            <span style="color:var(--text-muted)">${l}</span><strong>${v}</strong>
          </div>
          <div style="height:10px;background:var(--bg-surface);border-radius:5px;overflow:hidden">
            <div style="height:100%;background:${c};width:${Math.round(v/max*100)}%;border-radius:5px;transition:width .4s"></div>
          </div>
        </div>`).join('');
    }

    const wbEl = document.getElementById('fl-wait-breakdown');
    if (wbEl) {
      const wb = d.waitDistribution||{};
      wbEl.innerHTML = [['≤ 15 min','var(--green)',wb.under15||0],['≤ 30 min','var(--amber)',wb.under30||0],[' > 30 min','var(--red)',wb.over30||0]]
        .map(([l,c,v])=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
          <span style="color:var(--text-muted)">${l}</span><strong style="color:${c}">${v} patients</strong></div>`).join('');
    }
  } catch(e){ console.warn('Flow error:', e.message); }
}

/* ══════════════════════════════════════
   FACILITIES
══════════════════════════════════════ */
Pages['facilities'] = () => {
  setTimeout(_loadFacilities, 100);
  return `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
  <div class="page-title" style="margin:0">Facilities</div>
  <button class="btn btn-green" onclick="_showAddFacility()"><i class="ti ti-plus"></i>Add facility</button>
</div>
<div id="fac-list" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;color:var(--text-muted)">Loading…</div>

<!-- Add facility modal -->
<div id="fac-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:center;justify-content:center">
  <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:480px;max-width:95vw;box-shadow:var(--shadow-md)">
    <div style="font-size:16px;font-weight:600;margin-bottom:16px">Add facility</div>
    <div class="f-group"><label class="f-label">Facility name *</label><input class="f-input" id="fm-name" placeholder="e.g. Soweto Clinic"></div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">Type</label>
        <select class="f-select" id="fm-type" style="margin:0">
          <option value="clinic">Clinic</option>
          <option value="CHC">CHC</option>
          <option value="district">District hospital</option>
          <option value="regional">Regional hospital</option>
          <option value="tertiary">Tertiary hospital</option>
        </select>
      </div>
      <div class="f-group"><label class="f-label">Province</label>
        <select class="f-select" id="fm-province" style="margin:0">
          ${['Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape','Limpopo','Mpumalanga','North West','Free State','Northern Cape'].map(p=>`<option value="${p}">${p}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="f-group"><label class="f-label">Address</label><input class="f-input" id="fm-address" placeholder="Street, suburb, city"></div>
    <div class="f-group"><label class="f-label">Phone</label><input class="f-input" id="fm-phone" placeholder="011 000 0000"></div>
    <div id="fm-alert" class="alert hidden"></div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="btn btn-green" id="fm-btn" onclick="_submitFacility()"><i class="ti ti-plus"></i>Create facility</button>
      <button class="btn" onclick="document.getElementById('fac-modal').style.display='none'">Cancel</button>
    </div>
  </div>
</div>`;
};

async function _loadFacilities() {
  const el = document.getElementById('fac-list');
  if (!el) return;
  try {
    const res  = await API._fetchDirect('/facilities',{method:'GET'});
    const facs = res.data||[];
    if (!facs.length) { el.innerHTML='<div style="color:var(--text-muted)">No facilities found</div>'; return; }
    el.innerHTML = facs.map(f=>`
      <div class="card">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px">
          <div style="width:36px;height:36px;border-radius:10px;background:var(--green-light);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="ti ti-building-hospital" style="font-size:18px;color:var(--green-dark)"></i>
          </div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:15px">${f.name}</div>
            <div style="font-size:12px;color:var(--text-muted)">${f.province} · ${f.type||'Clinic'}</div>
          </div>
          <span style="width:10px;height:10px;border-radius:50%;background:${f.isOnline!==false?'var(--green)':'#ccc'};flex-shrink:0;margin-top:4px" title="${f.isOnline!==false?'Online':'Offline'}"></span>
        </div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:10px">${f.address||''}</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-xs btn-green" onclick="_viewFacQueue('${f._id}')"><i class="ti ti-list-numbers"></i>Queue</button>
          <button class="btn btn-xs" onclick="_editFacility('${f._id}','${f.name}')"><i class="ti ti-edit"></i>Edit</button>
        </div>
      </div>`).join('');
  } catch(e){ el.innerHTML=`<div class="alert-box alert-danger">${e.message}</div>`; }
}

window._showAddFacility = () => { document.getElementById('fac-modal').style.display='flex'; };
window._viewFacQueue    = (id) => { UI.showToast('Viewing queue for facility…','ok'); };
window._editFacility    = (id, name) => { UI.showToast(`Edit ${name} — coming soon`,'info'); };

window._submitFacility = async () => {
  const btn = document.getElementById('fm-btn');
  const g   = id => document.getElementById(id)?.value?.trim()||'';
  if (!g('fm-name')) { const al=document.getElementById('fm-alert'); if(al){al.className='alert alert-error';al.innerHTML='<i class="ti ti-alert-circle"></i> Name required';al.classList.remove('hidden');} return; }
  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div>'; }
  try {
    await API._fetchDirect('/facilities',{method:'POST',body:JSON.stringify({
      name:g('fm-name'), type:g('fm-type'), province:g('fm-province'), address:g('fm-address'), phone:g('fm-phone')
    })});
    document.getElementById('fac-modal').style.display='none';
    UI.showToast('Facility created','ok');
    _loadFacilities();
  } catch(e){ const al=document.getElementById('fm-alert'); if(al){al.className='alert alert-error';al.innerHTML=`<i class="ti ti-alert-circle"></i> ${e.message}`;al.classList.remove('hidden');} }
  finally { if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-plus"></i>Create facility';} }
};

/* ══════════════════════════════════════
   USERS & ROLES
══════════════════════════════════════ */
Pages['users'] = () => {
  setTimeout(_loadUsers, 100);
  return `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
  <div class="page-title" style="margin:0">Users & roles</div>
  <div style="display:flex;gap:8px">
    <div style="position:relative">
      <i class="ti ti-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#aaa;font-size:14px"></i>
      <input id="user-search" type="text" placeholder="Search users…" oninput="_filterUsers(this.value)"
        style="padding:8px 8px 8px 32px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-family:inherit;outline:none;width:200px">
    </div>
    <select id="user-role-filter" onchange="_filterUsers(document.getElementById('user-search').value)"
      style="padding:8px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-family:inherit;outline:none;background:var(--bg-card)">
      <option value="">All roles</option>
      ${['admin','doctor','nurse','pharmacy','patient'].map(r=>`<option value="${r}">${r.charAt(0).toUpperCase()+r.slice(1)}</option>`).join('')}
    </select>
  </div>
</div>
<div class="card" style="padding:0;overflow:hidden">
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="background:var(--bg-surface)">
      <th style="padding:11px 14px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted)">USER</th>
      <th style="padding:11px 14px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted)">ROLE</th>
      <th style="padding:11px 14px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted)">FACILITY</th>
      <th style="padding:11px 14px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted)">STATUS</th>
      <th style="padding:11px 14px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted)">ACTIONS</th>
    </tr></thead>
    <tbody id="users-table-body">
      <tr><td colspan="5" style="padding:24px;text-align:center;color:var(--text-muted)">Loading…</td></tr>
    </tbody>
  </table>
</div>`;
};

let _allUsers = [];

async function _loadUsers() {
  try {
    const res = await API._fetchDirect('/users?limit=100',{method:'GET'});
    _allUsers = res.data||[];
    _filterUsers('');
  } catch(e){ const tb=document.getElementById('users-table-body'); if(tb) tb.innerHTML=`<tr><td colspan="5" style="padding:16px;text-align:center;color:var(--red)">${e.message}</td></tr>`; }
}

window._filterUsers = (search) => {
  const role  = document.getElementById('user-role-filter')?.value||'';
  const s     = (search||'').toLowerCase();
  const users = _allUsers.filter(u=> (!role||u.role===role) && (!s||(u.firstName+' '+u.lastName+' '+u.email).toLowerCase().includes(s)));
  const roleColour = { admin:'#E24B4A', doctor:'#0F6E56', nurse:'#1A4A9B', pharmacy:'#EF9F27', patient:'#888' };
  const tb = document.getElementById('users-table-body');
  if (!tb) return;
  tb.innerHTML = users.length
    ? users.map(u=>`
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:11px 14px">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--green-light);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--green-dark);flex-shrink:0">
              ${(u.firstName||'?')[0]}${(u.lastName||'?')[0]}
            </div>
            <div>
              <div style="font-weight:600">${u.firstName} ${u.lastName}</div>
              <div style="font-size:11px;color:var(--text-muted)">${u.email}</div>
            </div>
          </div>
        </td>
        <td style="padding:11px 14px">
          <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${roleColour[u.role]||'#888'}20;color:${roleColour[u.role]||'#888'}">
            ${(u.role||'').toUpperCase()}
          </span>
        </td>
        <td style="padding:11px 14px;font-size:12px;color:var(--text-muted)">${u.facilityName||'—'}</td>
        <td style="padding:11px 14px">
          <div style="display:flex;align-items:center;gap:5px;font-size:12px">
            <div style="width:7px;height:7px;border-radius:50%;background:${u.emailVerified?'var(--green)':'var(--amber)'}"></div>
            ${u.emailVerified?'Active':'Pending'}
          </div>
        </td>
        <td style="padding:11px 14px">
          <div style="display:flex;gap:4px">
            <button class="btn btn-xs" onclick="_resetUserPwd('${u._id}','${u.email}')"><i class="ti ti-lock-open"></i>Reset pwd</button>
            <button class="btn btn-xs" onclick="_deactivateUser('${u._id}','${u.firstName}')"><i class="ti ti-user-off"></i></button>
          </div>
        </td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="padding:24px;text-align:center;color:var(--text-muted)">No users found</td></tr>';
};

window._resetUserPwd = async (id, email) => {
  if (!confirm(`Send password reset OTP to ${email}?`)) return;
  try { await API.auth.forgotPassword(email); UI.showToast('Password reset OTP sent to '+email,'ok'); }
  catch(e){ UI.showToast(e.message,'err'); }
};
window._deactivateUser = (id, name) => {
  if (confirm(`Deactivate ${name}? They will not be able to log in.`)) UI.showToast('Deactivation — contact DB admin to set isActive:false','info');
};
