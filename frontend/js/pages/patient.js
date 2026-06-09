/**
 * js/pages/patient.js — Complete patient portal
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ── Get own patient record ── */
async function _getMyPatientRecord() {
  try {
    const res = await API._fetchDirect('/patients/me', { method: 'GET' });
    return res?.data || null;
  } catch { return null; }
}

/* ── Show section alert ── */
function _pfAlert(id, msg, type='error') {
  const el = document.getElementById(id);
  if (!el) { UI.showToast(msg, type==='error'?'err':'ok'); return; }
  el.style.cssText = `display:flex;gap:8px;padding:9px 12px;border-radius:8px;font-size:13px;margin-top:8px;align-items:flex-start;${type==='error'?'background:#FCEBEB;color:#A32D2D;border-left:3px solid #E24B4A':'background:#E1F5EE;color:#0F6E56;border-left:3px solid #1D9E75'}`;
  el.innerHTML = `<i class="ti ti-${type==='error'?'alert-circle':'check'}"></i><span>${msg}</span>`;
}

/* ── Save helpers ── */
function _setBtnLoading(btn, loading, label) {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<div style="width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite"></div>'
    : label;
}

/* ══════════════════════════════
   MY HEALTH OVERVIEW
══════════════════════════════ */
Pages['myhealth'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('myhealth-body');
    if (!wrap) return;
    try {
      const p = await _getMyPatientRecord();
      if (!p) {
        wrap.innerHTML = `<div class="alert-box alert-info"><i class="ti ti-info-circle"></i>
          Welcome! Please <button class="btn btn-sm btn-green" onclick="Router.setPage('myprofile')" style="margin-left:8px"><i class="ti ti-user-edit"></i>Complete your profile</button></div>`;
        return;
      }

      const v = p.latestVitals || {};
      const conds = (p.conditions||[]).filter(c=>['active','monitored','chronic'].includes(c.status));

      // Fetch notifications/messages
      let msgs = [];
      try {
        const labRes = await API.labs.list({ patient: p._id, limit:5 });
        (labRes.data||[]).forEach(l => {
          const testNames = (l.tests||[]).map(t=>t.name).join(', ');
          if (['collected','ready','processing'].includes(l.status)) msgs.push({ type:'ok',   icon:'ti-flask', text:'Lab result ready: ' + testNames, date: l.updatedAt||l.createdAt });
          if (['ordered','in_lab'].includes(l.status))               msgs.push({ type:'info', icon:'ti-clock', text:'Lab test ordered: '  + testNames, date: l.createdAt });
        });
        const apptRes = await API.appointments.list({ patient: p._id, limit:5 });
        (apptRes.data||[]).forEach(a => {
          if (a.status === 'confirmed' && new Date(a.scheduledAt) > new Date())
            msgs.push({ type:'blue', icon:'ti-calendar-check', text:`Appointment confirmed: ${new Date(a.scheduledAt).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short'})} at ${new Date(a.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} — Token: ${a.queueToken||'—'}`, date: a.updatedAt });
          if (a.status === 'cancelled')
            msgs.push({ type:'warn', icon:'ti-calendar-x', text:`Appointment cancelled for ${new Date(a.scheduledAt).toLocaleDateString('en-ZA')}`, date: a.updatedAt });
        });
        msgs.sort((a,b) => new Date(b.date) - new Date(a.date));
        msgs = msgs.slice(0,5);
      } catch {}

      const profUrl = p.profilePicture?.url ? `http://localhost:5000${p.profilePicture.url}` : null;

      wrap.innerHTML = `
        <!-- Notifications banner -->
        ${msgs.length ? `<div style="margin-bottom:16px">
          ${msgs.map(m=>`<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;margin-bottom:6px;border-radius:10px;font-size:13px;
            background:${m.type==='ok'?'#E1F5EE':m.type==='warn'?'#FAEEDA':m.type==='blue'?'#EEF2FF':'#EEF2FF'};
            border-left:3px solid ${m.type==='ok'?'#1D9E75':m.type==='warn'?'#EF9F27':m.type==='blue'?'#4A6CF7':'#4A6CF7'}">
            <i class="ti ${m.icon}" style="font-size:16px;flex-shrink:0;margin-top:1px;color:${m.type==='ok'?'#0F6E56':m.type==='warn'?'#854F0B':'#4A6CF7'}"></i>
            <span style="color:${m.type==='ok'?'#0F6E56':m.type==='warn'?'#854F0B':'#1A4A9B'}">${m.text}</span>
          </div>`).join('')}
        </div>` : ''}

        <!-- Patient header card -->
        <div class="card" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
            <div style="position:relative;flex-shrink:0">
              <div style="width:64px;height:64px;border-radius:50%;overflow:hidden;background:var(--green-light);border:3px solid var(--border)">
                ${profUrl
                  ? `<img src="${profUrl}" style="width:100%;height:100%;object-fit:cover">`
                  : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:var(--green-dark)">${p.initials||'??'}</div>`}
              </div>
              <button onclick="Router.setPage('myprofile')" title="Edit profile"
                style="position:absolute;bottom:-2px;right:-2px;width:22px;height:22px;border-radius:50%;background:var(--green);border:2px solid #fff;cursor:pointer;display:flex;align-items:center;justify-content:center">
                <i class="ti ti-camera" style="font-size:11px;color:#fff"></i>
              </button>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:16px">${p.fullName||p.firstName+' '+p.lastName}</div>
              <div style="font-size:12px;color:var(--text-muted)">MRN: <strong>${p.mrn||'—'}</strong> · ${p.age||'?'}y · ${p.gender||'?'} · Blood: ${p.bloodType||'unknown'}</div>
              <div style="margin-top:5px;display:flex;gap:6px;flex-wrap:wrap">
                <span class="badge ${p.isVerified?'badge-green':'badge-amber'}">
                  <i class="ti ti-shield-${p.isVerified?'check':'exclamation'}" style="font-size:11px"></i>${p.isVerified?'Verified':'Pending verification'}
                </span>
                ${(p.allergies||[]).length?`<span class="badge badge-red"><i class="ti ti-alert-triangle" style="font-size:11px"></i>Allergy: ${p.allergies.join(', ')}</span>`:''}
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-sm" onclick="Router.setPage('myprofile')"><i class="ti ti-edit"></i>Edit profile</button>
              <button class="btn btn-sm btn-green" onclick="Router.setPage('myrecords')"><i class="ti ti-folder-open"></i>My records</button>
            </div>
          </div>
        </div>

        <!-- Vitals + info -->
        <div class="metric-grid metric-grid-3" style="max-width:580px;margin-bottom:18px">
          <div class="metric-card"><div class="metric-label">Last BP</div><div class="metric-value">${v.bp?v.bp.systolic+'/'+v.bp.diastolic:'—'}</div></div>
          <div class="metric-card"><div class="metric-label">Weight</div><div class="metric-value">${v.weight?v.weight+' kg':'—'}</div></div>
          <div class="metric-card"><div class="metric-label">SpO2</div><div class="metric-value">${v.spO2?v.spO2+'%':'—'}</div></div>
        </div>

        <div class="two-col">
          <div class="card">
            <div class="card-title"><i class="ti ti-clipboard-list"></i>Active conditions</div>
            ${conds.length?conds.map(c=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:13px">${c.name} <span style="color:var(--text-muted);font-size:11px">(${c.icd10Code})</span></span>
              <span class="badge ${c.status==='active'?'badge-amber':'badge-blue'}">${c.status}</span>
            </div>`).join('')
            :'<p style="color:var(--text-muted);font-size:13px">No active conditions.</p>'}
          </div>
          <div class="card">
            <div class="card-title"><i class="ti ti-address-book"></i>Contact</div>
            <div style="font-size:13px;display:flex;flex-direction:column;gap:6px">
              <div><i class="ti ti-phone" style="font-size:13px;color:var(--text-muted);margin-right:6px"></i>${p.phone||'—'}</div>
              ${p.email?`<div><i class="ti ti-mail" style="font-size:13px;color:var(--text-muted);margin-right:6px"></i>${p.email}</div>`:''}
              <div><i class="ti ti-map-pin" style="font-size:13px;color:var(--text-muted);margin-right:6px"></i>
                ${p.address?.street?`${p.address.street}, ${p.address.city||''}${p.address.province?', '+p.address.province:''}`:'Not provided'}
              </div>
              ${p.nextOfKin?.name?`<div style="padding-top:6px;border-top:1px solid var(--border);font-size:12px;color:var(--text-muted)">
                Next of kin: <strong style="color:var(--text)">${p.nextOfKin.name}</strong> · ${p.nextOfKin.phone||'—'}
              </div>`:''}
            </div>
          </div>
        </div>`;
    } catch (e) {
      wrap.innerHTML = `<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`;
    }
  }, 0);
  return [
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">',
    '<div class="page-title" style="margin:0">My health overview</div>',
    '<button onclick="Router.setPage(&quot;assistant&quot;)" style="display:flex;align-items:center;gap:8px;padding:9px 16px;border-radius:50px;border:1.5px solid var(--green);background:var(--green-light);color:var(--green-dark);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">',
    '<i class="ti ti-robot" style="font-size:16px"></i>Ask AI Assistant</button></div>',
    '<div id="myhealth-body" style="color:var(--text-muted);padding:4px 0">Loading…</div>'
  ].join('');
};

/* ══════════════════════════════
   MY RECORDS (medical records, test results, billing)
══════════════════════════════ */
Pages['myrecords'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('records-body');
    if (!wrap) return;
    try {
      const p = await _getMyPatientRecord();
      if (!p) { wrap.innerHTML='<p style="color:var(--text-muted)">No patient record found.</p>'; return; }

      const [labRes, rxRes] = await Promise.all([
        API.labs.list({ patient: p._id, limit:20 }),
        API.prescriptions.list({ patient: p._id, limit:20 })
      ]);

      const labs = labRes.data || [];
      const rxs  = rxRes.data  || [];

      wrap.innerHTML = `
        <!-- Lab results only -->
        <div class="card" style="margin-bottom:16px">
          <div class="card-title"><i class="ti ti-flask"></i>Lab & test results</div>
          ${labs.length ? labs.map(l=>`
            <div style="padding:12px 0;border-bottom:1px solid var(--border)">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
                <div style="flex:1">
                  <div style="font-weight:600;font-size:13px;margin-bottom:3px">${(l.tests||[]).map(t=>t.name).join(', ')||'Lab test'}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${new Date(l.createdAt).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'long',year:'numeric'})}</div>
                  ${l.notes?`<div style="font-size:13px;color:var(--text);margin-top:6px;padding:8px 10px;background:var(--bg-surface);border-radius:8px;line-height:1.5">${l.notes}</div>`:''}
                  ${(l.tests||[]).some(t=>t.result)?`
                    <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px">
                      ${(l.tests||[]).filter(t=>t.result).map(t=>`
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:var(--bg-surface);border-radius:6px;font-size:12px">
                          <span style="color:var(--text-muted)">${t.name}</span>
                          <span style="font-weight:600;color:${t.flag==='high'||t.flag==='H'?'var(--red)':t.flag==='low'||t.flag==='L'?'var(--blue)':'var(--text)'}">${t.result}</span>
                          ${t.referenceRange?`<span style="color:var(--text-hint);font-size:11px">Ref: ${t.referenceRange}</span>`:''}
                        </div>`).join('')}
                    </div>`:'' }
                </div>
                <span class="badge ${l.status==='collected'||l.status==='ready'?'badge-green':l.status==='ordered'||l.status==='in_lab'?'badge-amber':'badge-gray'}">${l.status}</span>
              </div>
            </div>`).join('')
          :'<div style="text-align:center;padding:28px;color:var(--text-muted)"><i class="ti ti-flask" style="font-size:36px;opacity:.3;display:block;margin-bottom:8px"></i>No lab results on record.</div>'}
        </div>

        <!-- Prescriptions -->
        <div class="card">
          <div class="card-title"><i class="ti ti-pill"></i>Prescription history</div>
          ${rxs.length ? rxs.map(rx=>`
            <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <div style="font-weight:600;font-size:13px">${(rx.lines||[]).map(l=>l.medicationName).join(', ')||'Prescription'}</div>
                <div style="font-size:12px;color:var(--text-muted)">${(rx.lines||[]).map(l=>l.dosage).join(' · ')}</div>
                <div style="font-size:12px;color:var(--text-muted)">Dr. ${rx.prescribedBy?.firstName||''} ${rx.prescribedBy?.lastName||''} · ${new Date(rx.createdAt).toLocaleDateString('en-ZA')}</div>
              </div>
              <span class="badge ${rx.status==='pending'?'badge-green':'badge-gray'}">${rx.status}</span>
            </div>`).join('')
          :'<p style="color:var(--text-muted);font-size:13px">No prescriptions on record.</p>'}
        </div>`;
    } catch(e) { wrap.innerHTML=`<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`; }
  }, 0);

  return `<div class="page-title">My medical records</div>
    <div id="records-body" style="color:var(--text-muted);padding:16px">Loading…</div>`;
};

/* ══════════════════════════════
   BILLING & PAYMENTS
══════════════════════════════ */
Pages['billing'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('billing-body');
    if (!wrap) return;
    try {
      const p = await _getMyPatientRecord();
      if (!p) { wrap.innerHTML='<p style="color:var(--text-muted)">No patient record found.</p>'; return; }

      wrap.innerHTML = `
        <!-- Summary -->
        <div class="metric-grid metric-grid-3" style="margin-bottom:18px;max-width:600px">
          <div class="metric-card"><div class="metric-label">Outstanding</div><div class="metric-value" style="color:var(--coral)">R 0.00</div></div>
          <div class="metric-card"><div class="metric-label">Paid (year)</div><div class="metric-value" style="color:var(--green-dark)">R 0.00</div></div>
          <div class="metric-card"><div class="metric-label">Medical aid</div><div class="metric-value">${p.medicalAid?.hasAid?'Active':'None'}</div></div>
        </div>

        <!-- Medical aid details -->
        ${p.medicalAid?.hasAid ? `
        <div class="card" style="margin-bottom:16px">
          <div class="card-title"><i class="ti ti-shield-check"></i>Medical aid details</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
            <div><span style="color:var(--text-muted)">Provider:</span> <strong>${p.medicalAid.provider||'—'}</strong></div>
            <div><span style="color:var(--text-muted)">Member no:</span> <strong>${p.medicalAid.memberNumber||'—'}</strong></div>
            <div><span style="color:var(--text-muted)">Plan:</span> <strong>${p.medicalAid.plan||'—'}</strong></div>
            <div><span style="color:var(--text-muted)">Dependant code:</span> <strong>${p.medicalAid.dependantCode||'00'}</strong></div>
            <div><span style="color:var(--text-muted)">Main member:</span> <strong>${p.medicalAid.mainMember||'Self'}</strong></div>
          </div>
          <button class="btn btn-sm" style="margin-top:12px" onclick="Router.setPage('myprofile')"><i class="ti ti-edit"></i>Update medical aid</button>
        </div>` : `
        <div class="alert-box alert-info" style="margin-bottom:14px">
          <i class="ti ti-info-circle"></i>No medical aid on file. Visit your clinic or
          <button class="btn-link" onclick="Router.setPage('myprofile')" style="margin-left:4px;color:var(--green-dark);font-weight:500">update your profile</button> to add medical aid.
        </div>`}

        <!-- Billing statements placeholder -->
        <div class="card" style="margin-bottom:16px">
          <div class="card-title"><i class="ti ti-receipt"></i>Billing statements</div>
          <div style="text-align:center;padding:32px;color:var(--text-muted)">
            <i class="ti ti-receipt" style="font-size:40px;opacity:.25;display:block;margin-bottom:10px"></i>
            <div style="font-weight:500;margin-bottom:6px">No billing statements</div>
            <div style="font-size:13px">Your invoices and receipts will appear here after each visit.</div>
          </div>
        </div>

        <!-- NHI info -->
        <div class="card" style="background:linear-gradient(135deg,var(--green-light),var(--blue-light))">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <i class="ti ti-building-hospital" style="font-size:32px;color:var(--green-dark);flex-shrink:0"></i>
            <div style="flex:1">
              <div style="font-weight:600;font-size:14px;color:var(--green-dark)">National Health Insurance (NHI)</div>
              <div style="font-size:13px;color:var(--text-muted)">As a registered NIHMS patient, you are eligible for NHI-funded services at all public healthcare facilities.</div>
            </div>
            <span class="badge badge-green">NHI Ready</span>
          </div>
        </div>`;
    } catch(e) { wrap.innerHTML=`<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`; }
  }, 0);

  return `<div class="page-title">Billing & payments</div>
    <div id="billing-body" style="color:var(--text-muted);padding:16px">Loading…</div>`;
};

/* ══════════════════════════════
   EDIT PROFILE (tabbed)
══════════════════════════════ */
Pages['myprofile'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('profile-wrap');
    if (!wrap) return;
    try {
      const p = await _getMyPatientRecord();
      wrap.innerHTML = _buildProfileForm(p);
    } catch (e) {
      wrap.innerHTML = `<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`;
    }
  }, 0);
  return `<div class="page-title">Edit my profile</div>
    <div id="profile-wrap" style="color:var(--text-muted);padding:20px 0">Loading…</div>`;
};

function _val(p, path, fb='') {
  if (!p) return fb;
  return path.split('.').reduce((o,k)=>o?.[k],p) ?? fb;
}

function _buildProfileForm(p) {
  const v = (path,fb='') => _val(p,path,fb);
  const profUrl = p?.profilePicture?.url ? `http://localhost:5000${p.profilePicture.url}` : null;
  const initials = p ? ((p.firstName||'U')[0]+(p.lastName||'S')[0]).toUpperCase() : '??';

  return `
  <!-- Tab navigation -->
  <div style="display:flex;gap:3px;background:var(--bg-surface);border-radius:12px;padding:4px;margin-bottom:20px">
    ${[['0','ti-user','Personal'],['1','ti-phone','Contact'],['2','ti-map-pin','Address'],['3','ti-heart-handshake','Kin'],['4','ti-lock','Password'],['5','ti-file','Docs']]
      .map(([n,ic,lbl])=>`<button id="ep-tab-btn-${n}" onclick="_showEpTab(${n})"
        style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 2px;border:none;border-radius:9px;background:${n==='0'?'#fff':'transparent'};color:${n==='0'?'#0F6E56':'#aaa'};font-size:9px;font-weight:${n==='0'?'600':'500'};cursor:pointer;font-family:inherit;box-shadow:${n==='0'?'0 1px 4px rgba(0,0,0,.1)':'none'}">
        <i class="ti ${ic}" style="font-size:14px"></i><span>${lbl}</span>
      </button>`).join('')}
  </div>

  <!-- TAB 0: Personal information (view + limited edit) -->
  <div id="ep-tab-0" class="card">
    <div class="card-title"><i class="ti ti-user"></i>Personal information</div>
    <div style="display:flex;align-items:center;gap:14px;padding:12px;background:var(--bg-surface);border-radius:var(--radius);margin-bottom:16px">
      <div style="position:relative;flex-shrink:0">
        <div style="width:64px;height:64px;border-radius:50%;overflow:hidden;background:var(--green-light);border:3px solid var(--border)">
          ${profUrl?`<img src="${profUrl}" style="width:100%;height:100%;object-fit:cover">`:`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:var(--green-dark)">${initials}</div>`}
        </div>
        <button onclick="document.getElementById('pf-profile-pic2').click()" title="Change photo"
          style="position:absolute;bottom:-2px;right:-2px;width:22px;height:22px;border-radius:50%;background:#0F6E56;border:2px solid #fff;cursor:pointer;display:flex;align-items:center;justify-content:center">
          <i class="ti ti-camera" style="font-size:11px;color:#fff"></i>
        </button>
        <input type="file" id="pf-profile-pic2" accept=".jpg,.jpeg,.png" style="display:none" onchange="_uploadProfilePic(this)">
      </div>
      <div>
        <div style="font-weight:700;font-size:16px">${v('firstName')} ${v('middleName','')} ${v('lastName')}</div>
        <div style="font-size:12px;color:var(--text-muted)">MRN: ${v('mrn','—')}</div>
        <div style="font-size:12px;color:var(--text-muted)">ID: ${v('nationalId','—')}</div>
      </div>
    </div>

    <!-- Editable: Full name -->
    <div class="two-col" style="margin-bottom:14px">
      <div class="f-group">
        <label class="f-label">First name</label>
        <input class="f-input" id="pf-firstname" value="${v('firstName')}" placeholder="First name">
      </div>
      <div class="f-group">
        <label class="f-label">Last name</label>
        <input class="f-input" id="pf-lastname" value="${v('lastName')}" placeholder="Last name">
      </div>
    </div>

    <!-- Read-only details -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      ${[
        ['Date of birth', v('dateOfBirth')?new Date(v('dateOfBirth')).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}):'—'],
        ['Gender',        v('gender')?v('gender')==='prefer_not_to_say'?'Prefer not to say':v('gender').charAt(0).toUpperCase()+v('gender').slice(1):'—'],
        ['Blood type',    v('bloodType')||'—'],
        ['ID / Passport', v('nationalId')||'—'],
        ['MRN',           v('mrn')||'—'],
      ].map(([lbl,val])=>`
        <div style="padding:10px 12px;background:var(--bg-surface);border-radius:var(--radius);border:1px solid var(--border)">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--text-hint);margin-bottom:3px">${lbl}</div>
          <div style="font-size:14px;font-weight:500;color:var(--text)">${val}</div>
        </div>`).join('')}
    </div>

    <div class="alert-box alert-info" style="margin-bottom:14px">
      <i class="ti ti-info-circle"></i>
      Date of birth, gender and ID number can only be updated at your clinic — these are verified by staff.
    </div>

    <!-- Allergies — editable -->
    <div class="f-group">
      <label class="f-label">Allergies <span style="font-size:11px;color:var(--text-hint)">(comma separated)</span></label>
      <input class="f-input" id="pf-allergies" value="${(v('allergies',[])||[]).join(', ')}" placeholder="e.g. Penicillin, Sulfa drugs">
    </div>

    <div id="pf-personal-alert"></div>
    <button class="btn btn-green" id="btn-save-personal" onclick="_savePersonal()">
      <i class="ti ti-device-floppy"></i>Save changes
    </button>
  </div>

  <!-- TAB 1: Contact -->
  <div id="ep-tab-1" class="card" style="display:none">
    <div class="card-title"><i class="ti ti-phone"></i>Contact information</div>
    <div style="display:flex;align-items:center;gap:14px;padding:12px;background:var(--bg-surface);border-radius:var(--radius);margin-bottom:16px">
      <div style="position:relative;flex-shrink:0">
        <div style="width:64px;height:64px;border-radius:50%;overflow:hidden;background:var(--green-light);border:3px solid var(--border)">
          ${profUrl?`<img src="${profUrl}" style="width:100%;height:100%;object-fit:cover">`:`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:var(--green-dark)">${initials}</div>`}
        </div>
        <button onclick="document.getElementById('pf-profile-pic').click()" title="Change photo"
          style="position:absolute;bottom:-2px;right:-2px;width:22px;height:22px;border-radius:50%;background:#0F6E56;border:2px solid #fff;cursor:pointer;display:flex;align-items:center;justify-content:center">
          <i class="ti ti-camera" style="font-size:11px;color:#fff"></i>
        </button>
        <input type="file" id="pf-profile-pic" accept=".jpg,.jpeg,.png" style="display:none" onchange="_uploadProfilePic(this)">
      </div>
      <div style="flex:1"><div style="font-weight:600;font-size:15px">${v('firstName')} ${v('lastName')}</div>
        <div style="font-size:12px;color:var(--text-muted)">MRN: ${v('mrn','—')} · ${v('age','?')}y</div>
        <div id="pic-status" style="font-size:11px;margin-top:3px"></div>
      </div>
    </div>
    <div class="f-group"><label class="f-label">Mobile phone * <span style="font-size:11px;color:var(--text-hint)">(+27 added automatically)</span></label>
      <input class="f-input" type="tel" id="pf-phone" value="${v('phone')}" placeholder="0821234567" onblur="_autoFmtPhone(this)"></div>
    <div class="f-group"><label class="f-label">Alternative phone</label>
      <input class="f-input" type="tel" id="pf-phonealt" value="${v('phoneAlt')}" placeholder="0821234567" onblur="_autoFmtPhone(this)"></div>
    <div class="f-group"><label class="f-label">Email address</label>
      <input class="f-input" type="email" id="pf-email" value="${v('email')}" placeholder="name@example.com"></div>
    <div id="pf-contact-alert"></div>
    <button class="btn btn-green" id="btn-save-contact" onclick="_saveContact()"><i class="ti ti-device-floppy"></i>Save contact info</button>
  </div>

  <!-- TAB 2: Address -->
  <div id="ep-tab-2" class="card" style="display:none">
    <div class="card-title"><i class="ti ti-map-pin"></i>Physical address</div>
    <div class="f-group"><label class="f-label">Street address</label><input class="f-input" id="pf-street" value="${v('address.street')}" placeholder="123 Main Road"></div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">Suburb</label><input class="f-input" id="pf-suburb" value="${v('address.suburb')}" placeholder="Soweto"></div>
      <div class="f-group"><label class="f-label">City</label><input class="f-input" id="pf-city" value="${v('address.city')}" placeholder="Johannesburg"></div>
    </div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">Postal code</label><input class="f-input" id="pf-postal" value="${v('address.postalCode')}" placeholder="2001"></div>
      <div class="f-group"><label class="f-label">Province</label>
        <select class="f-select" id="pf-province" style="margin:0">
          <option value="">— Select —</option>
          ${['Gauteng','KwaZulu-Natal','Western Cape','Eastern Cape','Limpopo','Mpumalanga','North West','Free State','Northern Cape']
            .map(pr=>`<option value="${pr}" ${v('address.province')===pr?'selected':''}>${pr}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="pf-addr-alert"></div>
    <button class="btn btn-green" id="btn-save-addr" onclick="_saveAddress()"><i class="ti ti-device-floppy"></i>Save address</button>
  </div>

  <!-- TAB 3: Next of kin -->
  <div id="ep-tab-3" class="card" style="display:none">
    <div class="card-title"><i class="ti ti-heart-handshake"></i>Next of kin</div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">Full name</label><input class="f-input" id="pf-kin-name" value="${v('nextOfKin.name')}" placeholder="Jane Dlamini"></div>
      <div class="f-group"><label class="f-label">Relationship</label>
        <select class="f-select" id="pf-kin-rel" style="margin:0">
          <option value="">— Select —</option>
          ${['Spouse','Parent','Child','Sibling','Friend','Guardian','Other'].map(r=>`<option value="${r}" ${v('nextOfKin.relationship')===r?'selected':''}>${r}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">Phone</label><input class="f-input" type="tel" id="pf-kin-phone" value="${v('nextOfKin.phone')}" placeholder="0821234567" onblur="_autoFmtPhone(this)"></div>
      <div class="f-group"><label class="f-label">Alt phone</label><input class="f-input" type="tel" id="pf-kin-phonealt" value="${v('nextOfKin.phoneAlt')}" placeholder="0821234567" onblur="_autoFmtPhone(this)"></div>
    </div>
    <div id="pf-kin-alert"></div>
    <button class="btn btn-green" id="btn-save-kin" onclick="_saveNextOfKin()"><i class="ti ti-device-floppy"></i>Save next of kin</button>
  </div>

  <!-- TAB 4: Password -->
  <div id="ep-tab-4" class="card" style="display:none">
    <div class="card-title"><i class="ti ti-lock"></i>Change password</div>
    <div class="f-group"><label class="f-label">Current password</label>
      <div style="position:relative"><input class="f-input" type="password" id="pf-pwd-current" placeholder="Current password" style="padding-right:38px">
        <span style="position:absolute;right:11px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--text-hint)" onclick="this.previousElementSibling.type=this.previousElementSibling.type==='password'?'text':'password'"><i class="ti ti-eye"></i></span>
      </div>
    </div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">New password</label>
        <div style="position:relative"><input class="f-input" type="password" id="pf-pwd-new" placeholder="New password" style="padding-right:38px" oninput="_checkNewPwd()">
          <span style="position:absolute;right:11px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--text-hint)" onclick="this.previousElementSibling.type=this.previousElementSibling.type==='password'?'text':'password'"><i class="ti ti-eye"></i></span>
        </div>
        <div style="font-size:12px;margin-top:6px;display:flex;flex-direction:column;gap:3px">
          <div id="pwr-len" style="color:var(--text-hint);display:flex;align-items:center;gap:4px"><i class="ti ti-circle" style="font-size:11px"></i> 8+ characters</div>
          <div id="pwr-upper" style="color:var(--text-hint);display:flex;align-items:center;gap:4px"><i class="ti ti-circle" style="font-size:11px"></i> One uppercase</div>
          <div id="pwr-num" style="color:var(--text-hint);display:flex;align-items:center;gap:4px"><i class="ti ti-circle" style="font-size:11px"></i> One number</div>
        </div>
      </div>
      <div class="f-group"><label class="f-label">Confirm new password</label>
        <div style="position:relative"><input class="f-input" type="password" id="pf-pwd-confirm" placeholder="Repeat new password" style="padding-right:38px" oninput="_checkPwdMatch()">
          <span style="position:absolute;right:11px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--text-hint)" onclick="this.previousElementSibling.type=this.previousElementSibling.type==='password'?'text':'password'"><i class="ti ti-eye"></i></span>
        </div>
        <div id="pwd-match-msg" style="font-size:12px;margin-top:6px;display:none"></div>
      </div>
    </div>
    <div id="pwd-alert"></div>
    <button class="btn btn-green" id="pwd-change-btn" onclick="_changePassword()"><i class="ti ti-lock-check"></i>Update password</button>
  </div>

  <!-- TAB 5: Documents -->
  <div id="ep-tab-5" class="card" style="display:none">
    <div class="card-title"><i class="ti ti-file-upload"></i>ID document</div>
    ${p?.idDocument?.url
      ? `<div class="alert-box alert-ok" style="margin-bottom:10px"><i class="ti ti-file-check"></i><div><strong style="font-size:13px">${p.idDocument.filename}</strong><div style="font-size:11px">Uploaded ${new Date(p.idDocument.uploadedAt).toLocaleDateString('en-ZA')}</div></div>
         <a href="http://localhost:5000${p.idDocument.url}" target="_blank" class="btn btn-xs" style="margin-left:auto"><i class="ti ti-download"></i>Download</a></div>`
      : `<div class="alert-box alert-warn" style="margin-bottom:10px"><i class="ti ti-alert-triangle"></i>No ID document uploaded yet.</div>`}
    <div style="border:2px dashed var(--border-md);border-radius:var(--radius);padding:20px;text-align:center;cursor:pointer" onclick="document.getElementById('pf-iddoc').click()">
      <i class="ti ti-cloud-upload" style="font-size:28px;color:var(--text-hint);display:block;margin-bottom:6px"></i>
      <div style="font-size:14px;font-weight:500;color:var(--text-muted)">${p?.idDocument?.url?'Replace ID document':'Upload SA ID / Passport'}</div>
      <div style="font-size:12px;color:var(--text-hint)">JPG, PNG or PDF · Max 5 MB</div>
    </div>
    <input type="file" id="pf-iddoc" accept=".jpg,.jpeg,.png,.pdf" style="display:none" onchange="_uploadIdDoc(this)">
    <div id="id-doc-status" style="margin-top:8px"></div>
  </div>`;
}

/* ── Profile tab switch ── */
window._showEpTab = (n) => {
  for (let i=0;i<=5;i++) {
    const tab = document.getElementById(`ep-tab-${i}`);
    const btn = document.getElementById(`ep-tab-btn-${i}`);
    if (tab) tab.style.display = i===n?'block':'none';
    if (btn) {
      btn.style.background = i===n?'#fff':'transparent';
      btn.style.color = i===n?'#0F6E56':'#aaa';
      btn.style.fontWeight = i===n?'600':'500';
      btn.style.boxShadow = i===n?'0 1px 4px rgba(0,0,0,.1)':'none';
    }
  }
};

/* ── Phone auto-format ── */
window._autoFmtPhone = (input) => {
  const digits = (input.value||'').replace(/[^0-9]/g,'');
  let n = input.value;
  if (digits.startsWith('27')&&digits.length>=11) n='+'+digits;
  else if (digits.startsWith('0')&&digits.length===10) n='+27'+digits.slice(1);
  else if (digits.length===9) n='+27'+digits;
  if (n!==input.value){ input.value=n; input.style.borderColor='var(--green)'; setTimeout(()=>{input.style.borderColor='';},1500); }
};

/* ── Save functions ── */
window._savePersonal = async () => {
  const btn = document.getElementById('btn-save-personal');
  _setBtnLoading(btn, true, '<i class="ti ti-device-floppy"></i>Saving…');
  const g   = id => document.getElementById(id)?.value?.trim() || '';
  const raw = g('pf-allergies');
  const allergies = raw ? raw.split(',').map(s=>s.trim()).filter(Boolean) : [];
  if (!g('pf-firstname') || !g('pf-lastname')) {
    _pfAlert('pf-personal-alert', 'First and last name are required.');
    _setBtnLoading(btn, false, '<i class="ti ti-device-floppy"></i>Save changes');
    return;
  }
  try {
    await API._fetchDirect('/patients/me/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        firstName: g('pf-firstname'),
        lastName:  g('pf-lastname'),
        allergies
      })
    });
    _pfAlert('pf-personal-alert', 'Changes saved successfully.', 'ok');
    UI.showToast('Profile updated', 'ok');
  } catch(e) {
    _pfAlert('pf-personal-alert', e.message || 'Save failed. Please try again.');
  } finally {
    _setBtnLoading(btn, false, '<i class="ti ti-device-floppy"></i>Save changes');
  }
};

window._saveContact = async () => {
  const btn = document.getElementById('btn-save-contact');
  _setBtnLoading(btn, true, '<i class="ti ti-device-floppy"></i>Save contact info');
  const g = id => document.getElementById(id)?.value?.trim()||'';
  if (!g('pf-phone')) { _pfAlert('pf-contact-alert','Mobile phone is required.'); _setBtnLoading(btn,false,'<i class="ti ti-device-floppy"></i>Save contact info'); return; }
  try {
    await API._fetchDirect('/patients/me/profile',{ method:'PATCH', body:JSON.stringify({ phone:g('pf-phone'), phoneAlt:g('pf-phonealt'), email:g('pf-email') })});
    _pfAlert('pf-contact-alert','Contact information saved successfully.','ok');
    UI.showToast('Contact saved','ok');
  } catch(e) { _pfAlert('pf-contact-alert',e.message||'Save failed. Please try again.'); }
  finally { _setBtnLoading(btn,false,'<i class="ti ti-device-floppy"></i>Save contact info'); }
};

window._saveAddress = async () => {
  const btn = document.getElementById('btn-save-addr');
  _setBtnLoading(btn,true,'<i class="ti ti-device-floppy"></i>Save address');
  const g = id => document.getElementById(id)?.value?.trim()||'';
  try {
    await API._fetchDirect('/patients/me/profile',{ method:'PATCH', body:JSON.stringify({ address:{ street:g('pf-street'), suburb:g('pf-suburb'), city:g('pf-city'), postalCode:g('pf-postal'), province:g('pf-province') }})});
    _pfAlert('pf-addr-alert','Address saved successfully.','ok');
    UI.showToast('Address saved','ok');
  } catch(e) { _pfAlert('pf-addr-alert',e.message||'Save failed. Please try again.'); }
  finally { _setBtnLoading(btn,false,'<i class="ti ti-device-floppy"></i>Save address'); }
};

window._saveNextOfKin = async () => {
  const btn = document.getElementById('btn-save-kin');
  _setBtnLoading(btn,true,'<i class="ti ti-device-floppy"></i>Save next of kin');
  const g = id => document.getElementById(id)?.value?.trim()||'';
  try {
    await API._fetchDirect('/patients/me/profile',{ method:'PATCH', body:JSON.stringify({ nextOfKin:{ name:g('pf-kin-name'), relationship:g('pf-kin-rel'), phone:g('pf-kin-phone'), phoneAlt:g('pf-kin-phonealt') }})});
    _pfAlert('pf-kin-alert','Next of kin saved successfully.','ok');
    UI.showToast('Next of kin saved','ok');
  } catch(e) { _pfAlert('pf-kin-alert',e.message||'Save failed. Please try again.'); }
  finally { _setBtnLoading(btn,false,'<i class="ti ti-device-floppy"></i>Save next of kin'); }
};

window._setBtnLoading = _setBtnLoading;

/* ── Password checker ── */
window._checkNewPwd = () => {
  const v = document.getElementById('pf-pwd-new')?.value||'';
  const set = (id,ok) => {
    const el=document.getElementById(id); if(!el) return;
    el.style.color=ok?'var(--green)':'var(--text-hint)';
    el.querySelector('i').className=ok?'ti ti-circle-check':'ti ti-circle';
    el.querySelector('i').style.fontSize='11px';
  };
  set('pwr-len',v.length>=8); set('pwr-upper',/[A-Z]/.test(v)); set('pwr-num',/[0-9]/.test(v));
  _checkPwdMatch();
};
window._checkPwdMatch = () => {
  const np=document.getElementById('pf-pwd-new')?.value||'';
  const cp=document.getElementById('pf-pwd-confirm')?.value||'';
  const msg=document.getElementById('pwd-match-msg'); if(!msg||!cp) return;
  msg.style.display='block';
  msg.style.color=np===cp?'var(--green)':'var(--red,#E24B4A)';
  msg.innerHTML=np===cp?'<i class="ti ti-check" style="font-size:11px"></i> Passwords match':'<i class="ti ti-x" style="font-size:11px"></i> Passwords do not match';
};

window._changePassword = async () => {
  const cur=document.getElementById('pf-pwd-current')?.value||'';
  const np=document.getElementById('pf-pwd-new')?.value||'';
  const cp=document.getElementById('pf-pwd-confirm')?.value||'';
  const btn=document.getElementById('pwd-change-btn');
  if (!cur) { _pfAlert('pwd-alert','Current password is required.'); return; }
  if (np.length<8||!/[A-Z]/.test(np)||!/[0-9]/.test(np)) { _pfAlert('pwd-alert','New password must be 8+ chars with uppercase and a number.'); return; }
  if (np!==cp) { _pfAlert('pwd-alert','Passwords do not match.'); return; }
  if (cur===np) { _pfAlert('pwd-alert','New password must differ from current password.'); return; }
  _setBtnLoading(btn,true,'<i class="ti ti-lock-check"></i>Update password');
  try {
    await API._fetchDirect('/auth/change-password',{ method:'POST', body:JSON.stringify({ currentPassword:cur, newPassword:np })});
    _pfAlert('pwd-alert','Password updated successfully!','ok');
    ['pf-pwd-current','pf-pwd-new','pf-pwd-confirm'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    const mm=document.getElementById('pwd-match-msg'); if(mm) mm.style.display='none';
  } catch(e) { _pfAlert('pwd-alert',e.message||'Failed. Check your current password.'); }
  finally { _setBtnLoading(btn,false,'<i class="ti ti-lock-check"></i>Update password'); }
};

/* ── Document uploads ── */
window._uploadProfilePic = async (input) => {
  const file=input.files[0]; if(!file) return;
  if(file.size>2*1024*1024){UI.showToast('Max 2 MB','err');return;}
  const status=document.getElementById('pic-status');
  if(status) status.innerHTML='<span style="color:var(--text-muted)">Uploading…</span>';
  try {
    const form=new FormData(); form.append('profilePicture',file);
    const res=await fetch('http://localhost:5000/api/v1/patients/me/upload-profile',{method:'POST',headers:{'Authorization':`Bearer ${API.Tokens.getAccess()}`},body:form});
    const data=await res.json();
    if(!data.success) throw new Error(data.message);
    UI.showToast('Profile picture updated','ok');
    setTimeout(()=>Router.setPage('myprofile'),800);
  } catch(e){UI.showToast(e.message||'Upload failed','err');if(status)status.innerHTML='';}
};

window._uploadIdDoc = async (input) => {
  const file=input.files[0]; if(!file) return;
  if(file.size>5*1024*1024){UI.showToast('Max 5 MB','err');return;}
  const status=document.getElementById('id-doc-status');
  if(status) status.innerHTML='<div style="font-size:12px;color:var(--text-muted)">Uploading…</div>';
  try {
    const form=new FormData(); form.append('idDocument',file);
    const res=await fetch('http://localhost:5000/api/v1/patients/me/upload-id',{method:'POST',headers:{'Authorization':`Bearer ${API.Tokens.getAccess()}`},body:form});
    const data=await res.json();
    if(!data.success) throw new Error(data.message);
    UI.showToast('Document uploaded','ok');
    if(status) status.innerHTML=`<div class="alert-box alert-ok" style="margin:0;font-size:12px"><i class="ti ti-check"></i>${file.name} uploaded</div>`;
    setTimeout(()=>Router.setPage('myprofile'),800);
  } catch(e){UI.showToast(e.message||'Upload failed','err');}
};

/* ══════════════════════════════
   APPOINTMENTS
══════════════════════════════ */
Pages['appointments'] = () => {
  setTimeout(async()=>{
    const wrap=document.getElementById('appt-list'); if(!wrap) return;
    try {
      const p=await _getMyPatientRecord();
      if(!p){wrap.innerHTML='<p style="color:var(--text-muted)">Complete your profile first.</p>';return;}
      const res=await API.appointments.list({patient:p._id,limit:30});
      const items=(res.data||[]).sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt));
      const now=new Date();
      wrap.innerHTML=items.length?items.map(a=>{
        const badge={confirmed:'badge-green',pending:'badge-amber',completed:'badge-green',cancelled:'badge-gray',no_show:'badge-red'}[a.status]||'badge-gray';
        const canAct=['pending','confirmed'].includes(a.status)&&new Date(a.scheduledAt)>now;
        return `<div style="padding:13px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:13px;margin-bottom:2px;text-transform:capitalize">
                <i class="ti ti-${a.visitType==='telemedicine'?'video':'stethoscope'}" style="font-size:13px;margin-right:5px"></i>
                ${(a.visitType||'').replace('_',' ')} — ${a.reason||'No reason specified'}
              </div>
              <div style="font-size:12px;color:var(--text-muted)">${a.facility?.name||''}</div>
              <div style="font-size:12px;color:var(--text-muted)">
                ${new Date(a.scheduledAt).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
                at ${new Date(a.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                · Token: <strong style="font-family:var(--mono)">${a.queueToken||'—'}</strong>
              </div>
              ${a.rescheduleReason?`<div style="font-size:11px;color:var(--text-hint)">↩ Rescheduled: ${a.rescheduleReason}</div>`:''}
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;flex-wrap:wrap">
              <span class="badge ${badge}">${a.status}</span>
              ${canAct?`
                <button class="btn btn-xs" onclick="_showReschedule('${a._id}','${a.visitType}','${new Date(a.scheduledAt).toISOString().slice(0,16)}')"><i class="ti ti-calendar-event"></i>Reschedule</button>
                <button class="btn btn-xs" style="color:var(--red);border-color:var(--red-mid)" onclick="_showCancelAppt('${a._id}')"><i class="ti ti-x"></i>Cancel</button>`:''}
            </div>
          </div>
        </div>`;
      }).join(''):`<div style="text-align:center;padding:28px;color:var(--text-muted)">
        <i class="ti ti-calendar-off" style="font-size:36px;opacity:.3;display:block;margin-bottom:10px"></i>
        No appointments found.
        <br><button class="btn btn-sm btn-green" onclick="Router.setPage('book')" style="margin-top:10px"><i class="ti ti-plus"></i>Book now</button>
      </div>`;
    } catch(e){wrap.innerHTML=`<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`;}
  },0);
  return `<div class="page-title">My appointments</div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
      <button class="btn btn-green" onclick="Router.setPage('book')"><i class="ti ti-plus"></i>Book new visit</button>
    </div>
    <div class="card"><div class="card-title"><i class="ti ti-calendar"></i>All appointments</div>
      <div id="appt-list" style="color:var(--text-muted);padding:16px">Loading…</div>
    </div>
    <!-- Reschedule modal -->
    <div id="reschedule-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:center;justify-content:center">
      <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:460px;max-width:95vw;box-shadow:var(--shadow-md)">
        <div style="font-size:16px;font-weight:600;margin-bottom:16px">Reschedule appointment</div>
        <div class="f-group"><label class="f-label">New date & time *</label>
          <input type="datetime-local" class="f-input" id="rs-datetime" style="margin:0"></div>
        <div class="f-group" style="margin-top:10px"><label class="f-label">Change type</label>
          <select class="f-select" id="rs-type" style="margin:0">
            <option value="consultation">In-person consultation</option>
            <option value="telemedicine">Telemedicine (video)</option>
            <option value="lab">Lab / blood draw</option>
          </select>
        </div>
        <div class="f-group" style="margin-top:10px"><label class="f-label">Reason *</label>
          <select class="f-select" id="rs-reason-sel" style="margin:0" onchange="document.getElementById('rs-reason-other').style.display=this.value==='other'?'block':'none'">
            <option value="">— Select reason —</option>
            <option>Personal emergency</option><option>Transport issue</option><option>Work commitment</option>
            <option>Feeling better</option><option>Prefer telemedicine</option><option>Prefer in-person</option>
            <option value="other">Other</option>
          </select>
          <input class="f-input" id="rs-reason-other" placeholder="Specify reason…" style="margin-top:8px;display:none">
        </div>
        <div id="rs-alert"></div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn btn-green" id="rs-submit-btn" onclick="_submitReschedule()"><i class="ti ti-calendar-check"></i>Confirm</button>
          <button class="btn" onclick="document.getElementById('reschedule-modal').style.display='none'">Cancel</button>
        </div>
      </div>
    </div>
    <!-- Cancel modal -->
    <div id="cancel-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:center;justify-content:center">
      <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:420px;max-width:95vw;box-shadow:var(--shadow-md)">
        <div style="font-size:16px;font-weight:600;margin-bottom:4px">Cancel appointment</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:14px">The doctor will be notified by SMS and email.</div>
        <div class="f-group"><label class="f-label">Reason *</label>
          <select class="f-select" id="cancel-reason-sel" style="margin:0" onchange="document.getElementById('cancel-reason-other').style.display=this.value==='other'?'block':'none'">
            <option value="">— Select —</option>
            <option>Personal emergency</option><option>Feeling better</option><option>Transport issue</option>
            <option>Work commitment</option><option>Want to reschedule</option><option value="other">Other</option>
          </select>
          <input class="f-input" id="cancel-reason-other" placeholder="Specify…" style="margin-top:8px;display:none">
        </div>
        <div class="alert-box alert-warn" style="margin-bottom:10px"><i class="ti ti-alert-triangle"></i>This cannot be undone.</div>
        <div id="cancel-alert"></div>
        <div style="display:flex;gap:8px">
          <button class="btn" style="background:var(--red);border-color:var(--red);color:#fff" id="cancel-submit-btn" onclick="_submitCancelAppt()"><i class="ti ti-x"></i>Yes, cancel</button>
          <button class="btn" onclick="document.getElementById('cancel-modal').style.display='none'">Keep it</button>
        </div>
      </div>
    </div>`;
};

let _rsApptId=null, _cancelApptId=null;
window._showReschedule=(id,type,dt)=>{
  _rsApptId=id;
  const dtEl=document.getElementById('rs-datetime'); if(dtEl){dtEl.value=dt;dtEl.min=new Date(new Date().getTime()+60000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);}
  const typeEl=document.getElementById('rs-type'); if(typeEl&&type)typeEl.value=type;
  document.getElementById('rs-alert').innerHTML='';
  document.getElementById('reschedule-modal').style.display='flex';
};
window._submitReschedule=async()=>{
  const dt=document.getElementById('rs-datetime')?.value;
  const type=document.getElementById('rs-type')?.value;
  const rSel=document.getElementById('rs-reason-sel')?.value;
  const rOth=document.getElementById('rs-reason-other')?.value?.trim();
  const reason=rSel==='other'?rOth:rSel;
  const btn=document.getElementById('rs-submit-btn');
  if(!dt){_pfAlert('rs-alert','Select a new date and time.');return;}
  if(new Date(dt)<=new Date()){_pfAlert('rs-alert','Date must be in the future.');return;}
  if(!reason){_pfAlert('rs-alert','Please select a reason.');return;}
  _setBtnLoading(btn,true,'<i class="ti ti-calendar-check"></i>Confirm');
  try {
    await API.appointments.reschedule(_rsApptId,{scheduledAt:new Date(dt).toISOString(),visitType:type,rescheduleReason:reason});
    document.getElementById('reschedule-modal').style.display='none';
    UI.showToast('Appointment rescheduled — notifications sent','ok');
    Router.setPage('appointments');
  } catch(e){_pfAlert('rs-alert',e.message);}
  finally{_setBtnLoading(btn,false,'<i class="ti ti-calendar-check"></i>Confirm');}
};
window._showCancelAppt=(id)=>{_cancelApptId=id;document.getElementById('cancel-alert').innerHTML='';document.getElementById('cancel-modal').style.display='flex';};
window._submitCancelAppt=async()=>{
  const sel=document.getElementById('cancel-reason-sel')?.value;
  const oth=document.getElementById('cancel-reason-other')?.value?.trim();
  const reason=sel==='other'?oth:sel;
  const btn=document.getElementById('cancel-submit-btn');
  if(!reason){_pfAlert('cancel-alert','Please select a reason.');return;}
  _setBtnLoading(btn,true,'Cancelling…');
  try {
    await API.appointments.cancel(_cancelApptId,reason);
    document.getElementById('cancel-modal').style.display='none';
    UI.showToast('Appointment cancelled','ok');
    Router.setPage('appointments');
  } catch(e){_pfAlert('cancel-alert',e.message);}
  finally{_setBtnLoading(btn,false,'<i class="ti ti-x"></i>Yes, cancel');}
};
window._cancelAppt=window._showCancelAppt;

/* ══════════════════════════════
   PRESCRIPTIONS
══════════════════════════════ */
Pages['myrx']=()=>{
  setTimeout(async()=>{
    const wrap=document.getElementById('rx-list'); if(!wrap) return;
    try {
      const p=await _getMyPatientRecord();
      if(!p){wrap.innerHTML='<p style="color:var(--text-muted)">Complete your profile first.</p>';return;}
      const res=await API.prescriptions.list({patient:p._id,limit:30});
      wrap.innerHTML=(res.data||[]).length?(res.data||[]).map(rx=>`
        <div style="padding:12px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div><div style="font-weight:600;font-size:13px">${(rx.lines||[]).map(l=>l.medicationName).join(', ')||'Prescription'}</div>
              <div style="font-size:12px;color:var(--text-muted)">${(rx.lines||[]).map(l=>l.dosage).join(' · ')}</div>
              <div style="font-size:12px;color:var(--text-muted)">Dr. ${rx.prescribedBy?.firstName||''} ${rx.prescribedBy?.lastName||''} · ${new Date(rx.createdAt).toLocaleDateString('en-ZA')}</div>
            </div>
            <span class="badge ${rx.status==='pending'?'badge-green':'badge-gray'}">${rx.status}</span>
          </div>
        </div>`).join('')
      :'<p style="color:var(--text-muted);padding:16px 0">No prescriptions found.</p>';
    } catch(e){wrap.innerHTML=`<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`;}
  },0);
  return `<div class="page-title">My prescriptions</div>
    <div class="card"><div class="card-title"><i class="ti ti-pill"></i>All prescriptions</div>
      <div id="rx-list" style="color:var(--text-muted);padding:16px">Loading…</div>
    </div>`;
};

/* ══════════════════════════════
   BOOK A VISIT
══════════════════════════════ */
Pages['book']=()=>{
  const now=new Date(), minDate=new Date(now.getTime()+60*1000), tmr=new Date(now);
  tmr.setDate(tmr.getDate()+1); tmr.setHours(8,0,0,0);
  const toLocal=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  const minStr=toLocal(minDate), defStr=toLocal(tmr);
  setTimeout(async()=>{
    const facEl=document.getElementById('book-facility'), dateEl=document.getElementById('book-date');
    if(!facEl) return;
    if(dateEl){dateEl.min=minStr;dateEl.value=defStr;}
    try {
      const res=await API.facilities.list();
      const on=(res.data||[]).filter(f=>f.isOnline!==false), off=(res.data||[]).filter(f=>f.isOnline===false);
      facEl.innerHTML=on.map(f=>`<option value="${f._id}">${f.name}</option>`).join('')+
        (off.length?`<optgroup label="Offline">${off.map(f=>`<option value="${f._id}" disabled>${f.name} (offline)</option>`).join('')}</optgroup>`:'');
    } catch(e){facEl.innerHTML='<option>Failed to load facilities</option>';}
  },0);
  return `<div class="page-title">Book a visit</div>
    <div class="alert-box alert-info" style="margin-bottom:14px"><i class="ti ti-clock"></i>
      Clinic hours: Mon–Fri 07:00–17:00 · Sat 07:00–13:00 · Same-day needs 1 hour notice.
    </div>
    <div class="card"><div class="card-title"><i class="ti ti-calendar-plus"></i>New appointment</div>
      <div class="two-col">
        <div>
          <div class="f-group"><label class="f-label">Visit type</label>
            <select class="f-select" id="book-type" style="margin:0">
              <option value="consultation">General consultation</option>
              <option value="telemedicine">Telemedicine (video)</option>
              <option value="lab">Lab / blood draw</option>
              <option value="immunisation">Immunisation</option>
              <option value="mental_health">Mental health</option>
            </select>
          </div>
          <div class="f-group" style="margin-top:10px"><label class="f-label">Facility</label>
            <select class="f-select" id="book-facility" style="margin:0"><option>Loading…</option></select>
          </div>
          <div class="f-group" style="margin-top:10px"><label class="f-label">Date & time</label>
            <input type="datetime-local" class="f-input" id="book-date" min="${minStr}" value="${defStr}" style="margin:0">
          </div>
          <div class="f-group" style="margin-top:10px"><label class="f-label">Interpreter needed?</label>
            <select class="f-select" id="book-lang" style="margin:0">
              <option value="">No interpreter needed</option>
              <option>Zulu</option><option>Xhosa</option><option>Sotho</option>
              <option>Afrikaans</option><option>Venda</option><option>Tsonga</option>
            </select>
          </div>
        </div>
        <div>
          <div class="f-group"><label class="f-label">Reason for visit</label>
            <textarea class="f-textarea" style="height:140px" id="book-reason" placeholder="Describe your symptoms…"></textarea>
          </div>
          <div class="alert-box alert-ok" style="margin-bottom:10px"><i class="ti ti-device-mobile"></i>SMS confirmation sent on booking.</div>
          <button class="btn btn-green" style="width:100%" id="book-btn" onclick="window._bookAppointment()">
            <i class="ti ti-calendar-check"></i>Confirm booking
          </button>
        </div>
      </div>
    </div>`;
};

window._bookAppointment=async()=>{
  const facilityId=document.getElementById('book-facility')?.value;
  const dateVal=document.getElementById('book-date')?.value;
  const visitType=document.getElementById('book-type')?.value;
  const reason=document.getElementById('book-reason')?.value?.trim();
  const lang=document.getElementById('book-lang')?.value;
  const btn=document.getElementById('book-btn');
  if(!facilityId||facilityId.startsWith('Loading')){UI.showToast('Please select a facility','err');return;}
  if(!dateVal){UI.showToast('Please select a date and time','err');return;}
  const selected=new Date(dateVal);
  if(selected<=new Date()){UI.showToast('Cannot book in the past','err');return;}
  _setBtnLoading(btn,true,'<i class="ti ti-loader-2"></i> Booking…');
  try {
    const p=await _getMyPatientRecord();
    if(!p){UI.showToast('Please complete your profile first','err');Router.setPage('myprofile');return;}
    await API.appointments.create({patient:p._id,facility:facilityId,visitType,scheduledAt:selected.toISOString(),reason,interpreterLanguage:lang||undefined});
    UI.showToast('Appointment booked! SMS confirmation sent.','ok');
    Router.setPage('appointments');
  } catch(e){UI.showToast(e.message||'Booking failed','err');}
  finally{_setBtnLoading(btn,false,'<i class="ti ti-calendar-check"></i>Confirm booking');}
};
