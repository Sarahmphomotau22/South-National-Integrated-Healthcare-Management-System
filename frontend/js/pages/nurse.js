/**
 * js/pages/nurse.js — Nurse portal pages
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ══════════════════════════════════════
   PATIENT REGISTRATION
══════════════════════════════════════ */
Pages['registration'] = () => {
  setTimeout(_loadRegistered, 200);
  return `
<div class="page-title">Patient registration</div>
<div class="two-col">
  <!-- LEFT: Registration form -->
  <div class="card">
    <div class="card-title"><i class="ti ti-user-plus"></i>Register new patient</div>

    <div class="two-col">
      <div class="f-group"><label class="f-label">First name *</label>
        <input class="f-input" id="nr-first" placeholder="Nomsa"></div>
      <div class="f-group"><label class="f-label">Last name *</label>
        <input class="f-input" id="nr-last" placeholder="Dlamini"></div>
    </div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">SA ID / Passport *</label>
        <input class="f-input" id="nr-id" placeholder="8203041234083" maxlength="13" oninput="_nrAutoFillDOB(this.value)"></div>
      <div class="f-group"><label class="f-label">Date of birth</label>
        <input class="f-input" type="date" id="nr-dob"></div>
    </div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">Gender</label>
        <select class="f-select" id="nr-gender" style="margin:0">
          <option value="">— Select —</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </div>
      <div class="f-group"><label class="f-label">Blood type</label>
        <select class="f-select" id="nr-blood" style="margin:0">
          <option value="">— Unknown —</option>
          ${['O+','O-','A+','A-','B+','B-','AB+','AB-'].map(b=>`<option value="${b}">${b}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">Phone number *</label>
        <input class="f-input" id="nr-phone" type="tel" placeholder="+27820000000" onblur="this.value=_normalisePhone(this.value)"></div>
      <div class="f-group"><label class="f-label">Email</label>
        <input class="f-input" id="nr-email" type="email" placeholder="patient@email.com"></div>
    </div>
    <div class="f-group"><label class="f-label">Address</label>
      <input class="f-input" id="nr-addr" placeholder="Street address, suburb, city"></div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">Next of kin name</label>
        <input class="f-input" id="nr-kin-name" placeholder="Full name"></div>
      <div class="f-group"><label class="f-label">Next of kin phone</label>
        <input class="f-input" id="nr-kin-phone" type="tel" placeholder="+27820000000"></div>
    </div>
    <div class="f-group"><label class="f-label">Allergies</label>
      <input class="f-input" id="nr-allergies" placeholder="Penicillin, Sulfa drugs — or leave blank"></div>

    <!-- Priority selection -->
    <div class="f-group">
      <label class="f-label">Patient category</label>
      <div style="display:flex;gap:6px;margin-top:4px" id="nr-cat-btns">
        ${[['normal','General'],['priority','Priority'],['emergency','Emergency']].map(([v,l],i)=>`
          <button onclick="_nrSetCat('${v}',this)" style="flex:1;padding:8px;border:1.5px solid ${i===0?'var(--green)':'var(--border)'};border-radius:8px;background:${i===0?'var(--green-light)':'transparent'};color:${i===0?'var(--green-dark)':'#888'};font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">${l}</button>`).join('')}
      </div>
    </div>
    <div id="nr-priority-row" style="display:none">
      <div class="f-group"><label class="f-label">Priority reason</label>
        <select class="f-select" id="nr-priority-reason" style="margin:0">
          <option value="elderly">Elderly (65+)</option>
          <option value="pregnant">Pregnant</option>
          <option value="disabled">Disability</option>
          <option value="child_under_5">Child under 5</option>
          <option value="emergency">Medical emergency</option>
        </select>
      </div>
    </div>

    <div id="nr-alert" class="alert hidden" style="margin-top:10px"></div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-green" id="nr-btn" onclick="_nrSubmit()" style="flex:2">
        <i class="ti ti-user-check"></i>Register patient & issue token
      </button>
      <button class="btn" onclick="_nrClear()"><i class="ti ti-x"></i>Clear</button>
    </div>
  </div>

  <!-- RIGHT: Vitals + biometric -->
  <div style="display:flex;flex-direction:column;gap:12px">
    <!-- Vitals capture -->
    <div class="card">
      <div class="card-title"><i class="ti ti-heart-rate-monitor" style="color:var(--red)"></i>Record vitals</div>
      <div class="two-col">
        <div class="f-group"><label class="f-label">BP (systolic)</label>
          <input class="f-input" type="number" id="nr-bp-sys" placeholder="120"></div>
        <div class="f-group"><label class="f-label">BP (diastolic)</label>
          <input class="f-input" type="number" id="nr-bp-dia" placeholder="80"></div>
      </div>
      <div class="two-col">
        <div class="f-group"><label class="f-label">Pulse (bpm)</label>
          <input class="f-input" type="number" id="nr-pulse" placeholder="72"></div>
        <div class="f-group"><label class="f-label">Temperature (°C)</label>
          <input class="f-input" type="number" id="nr-temp" placeholder="36.6" step="0.1"></div>
      </div>
      <div class="two-col">
        <div class="f-group"><label class="f-label">Weight (kg)</label>
          <input class="f-input" type="number" id="nr-weight" placeholder="70"></div>
        <div class="f-group"><label class="f-label">SpO₂ (%)</label>
          <input class="f-input" type="number" id="nr-spo2" placeholder="98"></div>
      </div>
      <div id="nr-vitals-alert" style="margin-top:8px;font-size:13px"></div>
      <button class="btn" style="width:100%;margin-top:8px" onclick="_nrCheckVitals()">
        <i class="ti ti-stethoscope"></i>Check vitals for triage flags
      </button>
    </div>

    <!-- Biometric -->
    <div class="card">
      <div class="card-title"><i class="ti ti-fingerprint"></i>Biometric & ID</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <button class="btn" style="flex:1" onclick="UI.showToast('Fingerprint scanner ready','ok')">
          <i class="ti ti-fingerprint"></i>Fingerprint
        </button>
        <button class="btn" style="flex:1" onclick="UI.showToast('ID scanner ready','ok')">
          <i class="ti ti-id-badge"></i>Scan ID
        </button>
      </div>
      <div class="alert-box alert-info" style="margin:0">
        <i class="ti ti-info-circle"></i>
        Patient receives SMS token on registration.
      </div>
    </div>

    <!-- Language selector -->
    <div class="card">
      <div class="card-title"><i class="ti ti-language"></i>Patient language</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${[['EN','English'],['ZU','isiZulu'],['AF','Afrikaans'],['ST','Sesotho'],['XH','isiXhosa'],['TN','Setswana']].map(([c,l])=>`
          <button onclick="_nrLang('${c.toLowerCase()}',this)" style="padding:6px 14px;border:1.5px solid var(--border);border-radius:20px;background:transparent;color:#777;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">
            ${c} · ${l}
          </button>`).join('')}
      </div>
    </div>
  </div>
</div>

<!-- Registered today -->
<div class="card" style="margin-top:14px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
    <div class="card-title" style="margin:0"><i class="ti ti-history"></i>Registered today</div>
    <button class="btn btn-xs" onclick="_loadRegistered()"><i class="ti ti-refresh"></i></button>
  </div>
  <div id="nr-registered-list" style="font-size:13px;color:var(--text-muted)">Loading…</div>
</div>`;
};

let _nrCat = 'normal', _nrLangCode = 'en';

window._nrSetCat = (cat, btn) => {
  _nrCat = cat;
  document.querySelectorAll('#nr-cat-btns button').forEach(b=>{b.style.borderColor='var(--border)';b.style.background='transparent';b.style.color='#888';});
  if (btn) { btn.style.borderColor='var(--green)';btn.style.background='var(--green-light)';btn.style.color='var(--green-dark)'; }
  document.getElementById('nr-priority-row').style.display = ['priority','emergency'].includes(cat)?'block':'none';
};

window._nrLang = (code, btn) => {
  _nrLangCode = code;
  document.querySelectorAll('.card button[onclick^="_nrLang"]').forEach(b=>{b.style.borderColor='var(--border)';b.style.background='transparent';b.style.color='#777';});
  if (btn) { btn.style.borderColor='var(--green)';btn.style.background='var(--green-light)';btn.style.color='var(--green-dark)'; }
};

window._nrAutoFillDOB = (val) => {
  if (val.length===13 && /^\d+$/.test(val)) {
    const y=parseInt(val.slice(0,2)); const m=val.slice(2,4); const d=val.slice(4,6);
    const year = y > 25 ? '19'+String(y).padStart(2,'0') : '20'+String(y).padStart(2,'0');
    const dob  = document.getElementById('nr-dob');
    if (dob) dob.value = `${year}-${m}-${d}`;
    const genderDigit = parseInt(val[6]);
    const gender = document.getElementById('nr-gender');
    if (gender) gender.value = genderDigit>=5?'male':'female';
  }
};

window._normalisePhone = (val) => {
  if (!val) return val;
  const d = val.replace(/\D/g,'');
  if (d.startsWith('27')&&d.length>=11) return '+'+d;
  if (d.startsWith('0')&&d.length===10) return '+27'+d.slice(1);
  if (d.length===9) return '+27'+d;
  return val;
};

window._nrCheckVitals = () => {
  const bp  = parseInt(document.getElementById('nr-bp-sys')?.value||0);
  const bpd = parseInt(document.getElementById('nr-bp-dia')?.value||0);
  const hr  = parseInt(document.getElementById('nr-pulse')?.value||0);
  const t   = parseFloat(document.getElementById('nr-temp')?.value||0);
  const o2  = parseInt(document.getElementById('nr-spo2')?.value||100);

  const flags = [];
  if (bp > 180 || bpd > 120) flags.push({ txt:'⚠️ Hypertensive crisis', col:'var(--red)' });
  else if (bp > 140 || bpd > 90) flags.push({ txt:'⚠️ High blood pressure', col:'#E24B4A' });
  if (t > 38.5) flags.push({ txt:'🌡️ Fever', col:'#E24B4A' });
  if (o2 < 90) flags.push({ txt:'🫁 Low SpO₂ — urgent', col:'var(--red)' });
  if (hr > 100) flags.push({ txt:'⚡ Tachycardia', col:'#EF9F27' });
  if (hr < 50) flags.push({ txt:'⚡ Bradycardia', col:'#EF9F27' });

  const el = document.getElementById('nr-vitals-alert');
  if (!el) return;
  if (flags.length) {
    el.innerHTML = flags.map(f=>`<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:#FEF2F2;border-radius:6px;margin-bottom:4px;font-weight:600;color:${f.col}">${f.txt}</div>`).join('');
    // Auto-set emergency if critical
    if (flags.some(f=>f.txt.includes('crisis')||f.txt.includes('SpO₂'))) {
      _nrSetCat('emergency', document.querySelector('#nr-cat-btns button:last-child'));
    } else {
      _nrSetCat('priority', document.querySelector('#nr-cat-btns button:nth-child(2)'));
    }
  } else {
    el.innerHTML = '<div style="color:var(--green-dark);font-weight:600;padding:6px 0">✅ Vitals within normal range</div>';
  }
};

window._nrSubmit = async () => {
  const btn    = document.getElementById('nr-btn');
  const user   = API.getStoredUser();
  const fid    = user?.facilityId||user?.facility;
  const g      = id => document.getElementById(id)?.value?.trim()||'';

  const first = g('nr-first'), last = g('nr-last');
  const phone = g('nr-phone'), idNum = g('nr-id');
  if (!first||!last) { _nrAlert('First and last name are required.'); return; }
  if (!phone&&!idNum) { _nrAlert('Phone number or ID number is required.'); return; }

  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div> Registering…'; }

  try {
    // 1. Register user + patient record
    const regData = await API.auth.register({
      firstName:   first,
      lastName:    last,
      nationalId:  idNum,
      dateOfBirth: g('nr-dob')||undefined,
      gender:      g('nr-gender')||undefined,
      bloodType:   g('nr-blood')||undefined,
      phone:       _normalisePhone(phone),
      email:       g('nr-email').toLowerCase()||undefined,
      role:        'patient',
      password:    'TempPass@' + Math.random().toString(36).slice(2,6).toUpperCase(),
      registeredByStaff: true
    });

    // 2. Issue queue token
    const tokenType = _nrCat==='emergency'?'emergency':_nrCat==='priority'?'priority':'walkin';
    const reason    = g('nr-priority-reason');
    const qRes = await API._fetchDirect('/queue2/walkin',{method:'POST',body:JSON.stringify({
      facilityId: fid, patientId: regData?.user?._id,
      patientName: `${first} ${last}`, patientPhone: _normalisePhone(phone),
      tokenType, priorityReason: reason, language: _nrLangCode
    })});

    _nrAlert(`✅ Patient registered — Token: ${qRes.data?.token} (Position ${qRes.data?.position})`, 'ok');
    _nrClear();
    _loadRegistered();
  } catch(e){ _nrAlert(e.message||'Registration failed'); }
  finally { if(btn){ btn.disabled=false; btn.innerHTML='<i class="ti ti-user-check"></i>Register patient & issue token'; } }
};

window._nrClear = () => {
  ['nr-first','nr-last','nr-id','nr-dob','nr-phone','nr-email','nr-addr','nr-kin-name','nr-kin-phone','nr-allergies','nr-bp-sys','nr-bp-dia','nr-pulse','nr-temp','nr-weight','nr-spo2'].forEach(id=>{
    const e=document.getElementById(id); if(e) e.value='';
  });
  const alertEl = document.getElementById('nr-alert');
  if (alertEl) alertEl.classList.add('hidden');
};

function _nrAlert(msg, type='error') {
  const el = document.getElementById('nr-alert');
  if (!el) return;
  el.className = `alert alert-${type==='ok'?'ok':'error'}`;
  el.innerHTML = `<i class="ti ti-${type==='ok'?'check':'alert-circle'}"></i> ${msg}`;
  el.classList.remove('hidden');
}

async function _loadRegistered() {
  const el  = document.getElementById('nr-registered-list');
  if (!el) return;
  const user = API.getStoredUser();
  const fid  = user?.facilityId||user?.facility;
  const today = new Date().toISOString().slice(0,10);
  try {
    const res = await API._fetchDirect(`/queue2?facility=${fid}&date=${today}`,{method:'GET'});
    const entries = res.data||[];
    if (!entries.length) { el.innerHTML='<div style="color:var(--text-muted)">No patients registered today</div>'; return; }
    el.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:var(--bg-surface)">
          <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted)">TIME</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted)">PATIENT</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted)">TOKEN</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted)">TYPE</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted)">STATUS</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:var(--text-muted)">WAIT</th>
        </tr></thead>
        <tbody>${entries.map(e=>`
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:8px 12px;font-family:var(--mono);font-size:12px;color:var(--text-muted)">${new Date(e.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
            <td style="padding:8px 12px;font-weight:500">${e.patientName||'—'}</td>
            <td style="padding:8px 12px"><span class="badge badge-blue" style="font-family:var(--mono)">${e.token}</span></td>
            <td style="padding:8px 12px;font-size:12px;color:var(--text-muted)">${e.tokenType==='emergency'?'🔴 Emergency':e.tokenType==='priority'?'🟡 Priority':e.tokenType==='normal'?'📅 Pre-booked':'🚶 Walk-in'}</td>
            <td style="padding:8px 12px">
              <span style="font-size:12px;font-weight:500;color:${e.status==='completed'?'var(--green-dark)':e.status==='in_consultation'?'var(--blue)':'var(--amber)'}">${e.status.replace('_',' ')}</span>
            </td>
            <td style="padding:8px 12px;color:var(--text-muted)">${e.estimatedWait||0} min</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch(err){ el.innerHTML=`<div class="alert-box alert-danger">${err.message}</div>`; }
}
