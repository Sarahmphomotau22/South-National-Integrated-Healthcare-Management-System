/**
 * js/pages/admin.js — API version
 */
if (typeof Pages === 'undefined') window.Pages = {};

Pages['overview'] = () => {
  setTimeout(async () => {
    try {
      const res = await API.analytics.overview();
      const d   = res.data || {};
      const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
      set('ov-consults', (d.consultationsToday||0).toLocaleString());
      set('ov-facilities',`${d.facilitiesOnline||0}/${d.facilitiesTotal||0}`);
      set('ov-offline',   d.facilitiesOffline||0);
      set('ov-stock',     d.criticalStock||0);
    } catch(e) { UI.showToast('Analytics unavailable: '+e.message,'err'); }
  }, 0);

  return `
    <div class="page-title">National overview</div>
    <div class="metric-grid metric-grid-4">
      <div class="metric-card"><div class="metric-label">Consultations today</div><div class="metric-value" id="ov-consults">—</div></div>
      <div class="metric-card"><div class="metric-label">Active facilities</div><div class="metric-value" id="ov-facilities">—</div><div class="metric-delta delta-dn" id="ov-offline">— offline</div></div>
      <div class="metric-card"><div class="metric-label">Pending prescriptions</div><div class="metric-value" id="ov-rx">—</div></div>
      <div class="metric-card"><div class="metric-label">Critical stock items</div><div class="metric-value" id="ov-stock" style="color:var(--coral)">—</div></div>
    </div>
    <div class="two-col">
      <div class="card"><div class="card-title"><i class="ti ti-alert-triangle"></i>System alerts</div>
        <div id="ov-alerts"><div style="color:var(--text-muted);font-size:13px">Loading…</div></div>
      </div>
      <div class="card"><div class="card-title"><i class="ti ti-building-hospital"></i>Quick stats</div>
        <div style="font-size:13px;color:var(--text-muted)">Connect your analytics dashboard for live condition breakdowns and trend data.</div>
      </div>
    </div>`;
};

Pages['flow'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('flow-body');
    if (!wrap) return;
    try {
      const res = await API.analytics.patientFlow();
      const data = res.data || [];
      wrap.innerHTML = data.length ? data.map(d => `
        <div class="flow-stage">
          <div class="flow-stage-header"><span style="font-weight:500;font-size:13px">${d._id}</span><span style="font-size:12px;color:var(--text-muted)">${d.count} appointments</span></div>
          <div class="progress-wrap"><div class="progress-fill" style="width:${Math.min(d.count*5,100)}%;background:var(--green)"></div></div>
        </div>`).join('')
      : '<p style="color:var(--text-muted)">No flow data for today yet.</p>';
    } catch(e) { wrap.innerHTML = `<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`; }
  }, 0);

  return `
    <div class="page-title">Patient flow analytics</div>
    <div class="card"><div class="card-title"><i class="ti ti-route"></i>Appointments by status — today</div>
      <div id="flow-body" style="color:var(--text-muted);padding:16px">Loading…</div>
    </div>`;
};

Pages['facilities'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('facilities-body');
    if (!wrap) return;
    try {
      const res = await API.facilities.list();
      const items = res.data || [];
      wrap.innerHTML = items.length ? items.map(f => `
        <tr>
          <td style="font-weight:500">${f.name}</td>
          <td style="color:var(--text-muted);font-size:12px">${f.province}</td>
          <td><span class="badge badge-gray">${f.type}</span></td>
          <td><div class="facility-conn"><div class="dot ${f.isOnline?'dot-green':'dot-amber'}"></div><span style="font-size:12px">${f.isOnline?'Online':'Offline'}</span></div></td>
          <td><span class="badge ${f.isOnline?'badge-green':'badge-amber'}">${f.isOnline?'Active':'Offline mode'}</span></td>
          <td><button class="btn btn-xs" onclick="UI.showToast('Facility settings coming soon','ok')"><i class="ti ti-settings"></i>Manage</button></td>
        </tr>`).join('')
      : '<tr><td colspan="6" style="color:var(--text-muted);text-align:center;padding:20px">No facilities found.</td></tr>';
    } catch(e) { wrap.innerHTML = `<tr><td colspan="6"><div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div></td></tr>`; }
  }, 0);

  return `
    <div class="page-title">Facilities</div>
    <div class="card">
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <input class="f-input" style="margin:0;flex:1" id="fac-search" placeholder="Search facilities…">
        <button class="btn btn-green" onclick="_loadFacilities()"><i class="ti ti-search"></i>Search</button>
        <button class="btn btn-green" onclick="UI.showToast('Add facility form coming soon','ok')"><i class="ti ti-plus"></i>Add</button>
      </div>
      <table><tr><th>Facility</th><th>Province</th><th>Type</th><th>Connectivity</th><th>Status</th><th></th></tr>
      <tbody id="facilities-body"><tr><td colspan="6" style="color:var(--text-muted);padding:16px">Loading…</td></tr></tbody></table>
    </div>`;
};

window._loadFacilities = async () => {
  const q    = document.getElementById('fac-search')?.value;
  const wrap = document.getElementById('facilities-body');
  if (!wrap) return;
  wrap.innerHTML = '<tr><td colspan="6" style="color:var(--text-muted)">Loading…</td></tr>';
  try {
    const res = await API.facilities.list({ q });
    wrap.innerHTML = (res.data||[]).map(f => `
      <tr>
        <td style="font-weight:500">${f.name}</td>
        <td style="color:var(--text-muted);font-size:12px">${f.province}</td>
        <td><span class="badge badge-gray">${f.type}</span></td>
        <td><div class="facility-conn"><div class="dot ${f.isOnline?'dot-green':'dot-amber'}"></div><span style="font-size:12px">${f.isOnline?'Online':'Offline'}</span></div></td>
        <td><span class="badge ${f.isOnline?'badge-green':'badge-amber'}">${f.isOnline?'Active':'Offline mode'}</span></td>
        <td><button class="btn btn-xs" onclick="UI.showToast('Manage','ok')"><i class="ti ti-settings"></i>Manage</button></td>
      </tr>`).join('') || '<tr><td colspan="6" style="color:var(--text-muted);text-align:center;padding:20px">No facilities found.</td></tr>';
  } catch(e) { wrap.innerHTML = `<tr><td colspan="6">${e.message}</td></tr>`; }
};

Pages['users'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('users-body');
    const wrap2= document.getElementById('users-roles');
    if (!wrap) return;
    try {
      const res = await API.users.list({ limit:50 });
      const items = res.data || [];
      // Role counts
      const counts = {};
      items.forEach(u => { counts[u.role] = (counts[u.role]||0)+1; });
      const total = items.length;
      if (wrap2) wrap2.innerHTML = Object.entries(counts).map(([role,n])=>`
        <div class="role-row">
          <span class="badge badge-gray" style="min-width:100px;justify-content:center">${role}</span>
          <div class="progress-wrap" style="flex:1"><div class="progress-fill" style="width:${Math.round(n/total*100)}%;background:var(--green)"></div></div>
          <span style="font-size:12px;color:var(--text-muted);min-width:40px;text-align:right">${n}</span>
        </div>`).join('');
      wrap.innerHTML = items.slice(0,10).map(u => `
        <tr>
          <td>${u.firstName} ${u.lastName}</td>
          <td style="font-size:12px;color:var(--text-muted)">${u.email}</td>
          <td><span class="badge badge-gray">${u.role}</span></td>
          <td><span class="badge ${u.isActive?'badge-green':'badge-amber'}">${u.isActive?'Active':'Inactive'}</span></td>
          <td><button class="btn btn-xs" onclick="_toggleUser('${u._id}',${!u.isActive},this)">
            <i class="ti ti-${u.isActive?'lock':'lock-open'}"></i>${u.isActive?'Deactivate':'Activate'}
          </button></td>
        </tr>`).join('') || '<tr><td colspan="5" style="color:var(--text-muted);text-align:center;padding:20px">No users found.</td></tr>';
    } catch(e) { wrap.innerHTML = `<tr><td colspan="5"><div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div></td></tr>`; }
  }, 0);

  return `
    <div class="page-title">Users & roles</div>
    <div class="two-col">
      <div class="card">
        <div class="card-title"><i class="ti ti-chart-bar"></i>Role breakdown</div>
        <div id="users-roles"><div style="color:var(--text-muted)">Loading…</div></div>
      </div>
      <div class="card">
        <div class="card-title"><i class="ti ti-users"></i>All users</div>
        <table><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
        <tbody id="users-body"><tr><td colspan="5" style="color:var(--text-muted)">Loading…</td></tr></tbody></table>
      </div>
    </div>`;
};

window._toggleUser = async (id, newStatus, btn) => {
  btn.disabled = true;
  try {
    await API.users.setStatus(id, newStatus);
    UI.showToast(`User ${newStatus?'activated':'deactivated'}`,'ok');
    Router.setPage('users');
  } catch(e) { UI.showToast(e.message,'err'); btn.disabled=false; }
};
