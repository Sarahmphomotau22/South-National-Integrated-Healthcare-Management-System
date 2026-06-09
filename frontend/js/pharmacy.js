/**
 * js/pages/pharmacy.js — API version
 */
if (typeof Pages === 'undefined') window.Pages = {};

function _stockColor(s){ return s==='critical'?'#E24B4A':s==='low'?'#EF9F27':'#1D9E75'; }
function _stockBadge(s){ return s==='critical'?'badge-red':s==='low'?'badge-amber':'badge-green'; }
function _stockLabel(s){ return s==='critical'?'Critical':s==='low'?'Low':'In stock'; }
function _stockStatus(m){ return m.stockQty<=10?'critical':m.stockQty<=m.reorderLevel?'low':'ok'; }

Pages['rx-queue'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('rx-list');
    if (!wrap) return;
    try {
      const user = API.getStoredUser();
      const res  = await API.prescriptions.list({ facility: user?.facilityId, status:'pending', limit:20 });
      const items = res.data || [];
      wrap.innerHTML = items.length ? items.map(rx => {
        const lines = (rx.lines||[]).map(l=>`${l.medicationName} × ${l.quantity}`).join(', ');
        return `
          <div style="padding:12px 0;border-bottom:1px solid var(--border)">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
              <div>
                <div style="font-size:11px;color:var(--text-hint);font-family:var(--mono)">${rx._id.slice(-8).toUpperCase()}</div>
                <div style="font-weight:600">${rx.patient?.firstName||''} ${rx.patient?.lastName||''}</div>
                <div style="font-size:13px">${lines}</div>
                <div style="font-size:12px;color:var(--text-muted)">Prescribed by ${rx.prescribedBy?.firstName||''} ${rx.prescribedBy?.lastName||''}</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
                <button class="btn btn-sm btn-green" onclick="_dispense('${rx._id}',this)">
                  <i class="ti ti-check"></i>Dispense
                </button>
              </div>
            </div>
            ${rx.notes?`<div class="alert-box alert-info" style="margin:0;padding:8px 10px;font-size:12px"><i class="ti ti-info-circle"></i>${rx.notes}</div>`:''}
          </div>`;
      }).join('')
      : '<p style="color:var(--text-muted);padding:16px 0">No pending prescriptions.</p>';
    } catch(e) { wrap.innerHTML = `<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`; }
  }, 0);

  return `
    <div class="page-title">Prescription queue</div>
    <div class="metric-grid metric-grid-3" style="max-width:580px">
      <div class="metric-card"><div class="metric-label">Pending</div><div class="metric-value" id="ph-pending">—</div></div>
      <div class="metric-card"><div class="metric-label">Dispensed today</div><div class="metric-value" id="ph-dispensed">—</div></div>
      <div class="metric-card"><div class="metric-label">Stock alerts</div><div class="metric-value" id="ph-alerts" style="color:var(--coral)">—</div></div>
    </div>
    <div class="card">
      <div class="card-title"><i class="ti ti-list"></i>Incoming prescriptions</div>
      <div id="rx-list" style="color:var(--text-muted);padding:16px">Loading…</div>
    </div>`;
};

window._dispense = async (rxId, btn) => {
  btn.disabled = true; btn.innerHTML = '<div class="spinner" style="border-color:rgba(255,255,255,.3);border-top-color:#fff"></div>';
  try {
    await API.prescriptions.dispense(rxId);
    UI.showToast('Prescription dispensed — stock updated','ok');
    Router.setPage('rx-queue');
  } catch(e) { UI.showToast(e.message,'err'); btn.disabled=false; btn.innerHTML='<i class="ti ti-check"></i>Dispense'; }
};

Pages['stock'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('stock-body');
    if (!wrap) return;
    try {
      const user = API.getStoredUser();
      const res  = await API.medications.list({ facility: user?.facilityId });
      const items = res.data || [];
      wrap.innerHTML = items.length ? items.map(m => {
        const status = _stockStatus(m);
        const pct = Math.round(m.stockQty / m.maxStock * 100);
        return `<tr>
          <td>${m.name} ${m.strength||''}</td>
          <td style="text-align:right;font-family:var(--mono);font-size:12px">${m.stockQty.toLocaleString()}</td>
          <td><div class="stock-bar-wrap"><div class="stock-bar"><div class="stock-fill" style="width:${Math.min(pct,100)}%;background:${_stockColor(status)}"></div></div>
            <span style="font-size:11px;color:var(--text-muted);min-width:30px;text-align:right">${pct}%</span></div></td>
          <td><span class="badge ${_stockBadge(status)}">${_stockLabel(status)}</span></td>
          <td><button class="btn btn-xs" onclick="UI.showToast('Procurement order created','ok')"><i class="ti ti-shopping-cart"></i>Order</button></td>
        </tr>`;
      }).join('')
      : '<tr><td colspan="5" style="color:var(--text-muted);text-align:center;padding:20px">No medications found.</td></tr>';
    } catch(e) { wrap.innerHTML = `<tr><td colspan="5"><div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div></td></tr>`; }
  }, 0);

  return `
    <div class="page-title">Medication stock</div>
    <div class="card">
      <div class="card-title"><i class="ti ti-package"></i>Current stock</div>
      <table><tr><th>Medication</th><th style="text-align:right">Units</th><th style="min-width:130px">Level</th><th>Status</th><th></th></tr>
      <tbody id="stock-body"><tr><td colspan="5" style="color:var(--text-muted);padding:16px">Loading…</td></tr></tbody></table>
    </div>`;
};

Pages['dispensed'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('dispensed-body');
    if (!wrap) return;
    try {
      const user = API.getStoredUser();
      const res  = await API.prescriptions.list({ facility: user?.facilityId, status:'dispensed', limit:50 });
      const items = res.data || [];
      wrap.innerHTML = items.length ? items.map(rx => `
        <tr>
          <td style="font-family:var(--mono);font-size:12px">${new Date(rx.dispensedAt||rx.updatedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
          <td>${rx.patient?.firstName||''} ${rx.patient?.lastName||''}</td>
          <td>${(rx.lines||[]).map(l=>l.medicationName).join(', ')}</td>
          <td style="font-size:12px;color:var(--text-muted)">${rx.dispensedBy?.firstName||''} ${rx.dispensedBy?.lastName||''}</td>
        </tr>`).join('')
      : '<tr><td colspan="4" style="color:var(--text-muted);text-align:center;padding:20px">Nothing dispensed yet today.</td></tr>';
    } catch(e) { wrap.innerHTML = `<tr><td colspan="4">${e.message}</td></tr>`; }
  }, 0);

  return `
    <div class="page-title">Dispensed today</div>
    <div class="card">
      <div class="card-title"><i class="ti ti-check"></i>Dispensing log</div>
      <table><tr><th>Time</th><th>Patient</th><th>Medication</th><th>Pharmacist</th></tr>
      <tbody id="dispensed-body"><tr><td colspan="4" style="color:var(--text-muted);padding:16px">Loading…</td></tr></tbody></table>
    </div>`;
};
