/**
 * js/pages/patient.js
 * Patient portal — overview, edit profile, appointments, prescriptions, book visit.
 * Patients never see role tabs or other dashboards.
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ── Fetch own patient record ── */
async function _getMyPatientRecord() {
  try {
    const res = await API._fetchDirect('/patients/me', { method: 'GET' });
    return res.data || null;
  } catch { return null; }
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
        wrap.innerHTML = `
          <div class="alert-box alert-info" style="margin-bottom:16px">
            <i class="ti ti-info-circle"></i>
            Welcome! Please complete your profile to use all features.
          </div>
          <div style="text-align:center;padding:24px">
            <button class="btn btn-green" onclick="Router.setPage('myprofile')">
              <i class="ti ti-user-edit"></i>Complete my profile
            </button>
          </div>`;
        return;
      }
      const v    = p.latestVitals || {};
      const conds = (p.conditions||[]).filter(c=>c.status==='active'||c.status==='monitored');
      wrap.innerHTML = `
        <!-- Patient header -->
        <div class="card" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
            <div class="avatar" style="width:54px;height:54px;font-size:18px;background:var(--green-light);color:var(--green-dark);font-weight:600">${p.initials||'??'}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:17px">${p.fullName}</div>
              <div style="font-size:12px;color:var(--text-muted)">MRN: <strong>${p.mrn||'—'}</strong> · ${p.age||'?'}y · ${p.gender||'?'} · Blood: ${p.bloodType||'unknown'}</div>
              <div style="font-size:12px;color:var(--text-muted)">ID: ${p.nationalId||'—'} (${p.idType==='sa_id'?'SA ID':p.idType==='passport'?'Passport':'Other'})</div>
              <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
                <span class="badge ${p.isVerified?'badge-green':'badge-amber'}">
                  <i class="ti ti-shield-${p.isVerified?'check':'exclamation'}" style="font-size:11px"></i>
                  ${p.isVerified?'Verified':'Awaiting verification'}
                </span>
                ${(p.allergies||[]).length?`<span class="badge badge-red"><i class="ti ti-alert-triangle" style="font-size:11px"></i>Allergy: ${p.allergies.join(', ')}</span>`:''}
              </div>
            </div>
            <button class="btn btn-sm" onclick="Router.setPage('myprofile')">
              <i class="ti ti-edit"></i>Edit profile
            </button>
          </div>
        </div>

        <!-- Vitals -->
        <div class="metric-grid metric-grid-3" style="max-width:580px;margin-bottom:18px">
          <div class="metric-card"><div class="metric-label">Last BP</div><div class="metric-value ${v.bp&&v.bp.systolic>140?'':''}">
            ${v.bp?`${v.bp.systolic}/${v.bp.diastolic}`:'—'}</div></div>
          <div class="metric-card"><div class="metric-label">Weight</div><div class="metric-value">${v.weight?v.weight+' kg':'—'}</div></div>
          <div class="metric-card"><div class="metric-label">SpO2</div><div class="metric-value">${v.spO2?v.spO2+'%':'—'}</div></div>
        </div>

        <!-- Info cards -->
        <div class="two-col">
          <div class="card">
            <div class="card-title"><i class="ti ti-clipboard-list"></i>Active conditions</div>
            ${conds.length?conds.map(c=>`
              <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">
                <span style="font-size:13px">${c.name} <span style="color:var(--text-muted);font-size:11px">(${c.icd10Code})</span></span>
                <span class="badge ${c.status==='active'?'badge-amber':'badge-blue'}">${c.status}</span>
              </div>`).join('')
            :'<p style="color:var(--text-muted);font-size:13px">No active conditions on record.</p>'}
          </div>
          <div class="card">
            <div class="card-title"><i class="ti ti-address-book"></i>Contact &amp; address</div>
            <div style="font-size:13px;display:flex;flex-direction:column;gap:7px">
              <div><i class="ti ti-phone" style="font-size:13px;color:var(--text-muted);margin-right:6px"></i>${p.phone||'—'}</div>
              ${p.phoneAlt?`<div><i class="ti ti-phone-call" style="font-size:13px;color:var(--text-muted);margin-right:6px"></i>${p.phoneAlt}</div>`:''}
              ${p.email?`<div><i class="ti ti-mail" style="font-size:13px;color:var(--text-muted);margin-right:6px"></i>${p.email}</div>`:''}
              <div><i class="ti ti-map-pin" style="font-size:13px;color:var(--text-muted);margin-right:6px"></i>
                ${p.address?.street?`${p.address.street}${p.address.suburb?', '+p.address.suburb:''}${p.address.city?', '+p.address.city:''}${p.address.province?', '+p.address.province:''}`:'Address not provided'}
              </div>
              ${p.nextOfKin?.name?`<div style="padding-top:6px;border-top:1px solid var(--border);color:var(--text-muted);font-size:12px">
                Next of kin: <strong style="color:var(--text)">${p.nextOfKin.name}</strong>${p.nextOfKin.relationship?' ('+p.nextOfKin.relationship+')':''} · ${p.nextOfKin.phone||'—'}
              </div>`:''}
            </div>
          </div>
        </div>

        <!-- ID document status -->
        ${p.idDocument?.url?`
          <div class="card">
            <div class="card-title"><i class="ti ti-file-check"></i>ID document</div>
            <div class="alert-box alert-ok" style="margin:0">
              <i class="ti ti-check"></i>
              <div>
                <div style="font-weight:500">${p.idDocument.filename}</div>
                <div style="font-size:12px">Uploaded ${new Date(p.idDocument.uploadedAt).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})}</div>
              </div>
              <button class="btn btn-xs" style="margin-left:auto" onclick="Router.setPage('myprofile')">Replace</button>
            </div>
          </div>` : `
          <div class="card">
            <div class="card-title"><i class="ti ti-file-upload"></i>ID document</div>
            <div class="alert-box alert-warn" style="margin:0">
              <i class="ti ti-alert-triangle"></i>
              No ID document uploaded yet. Please upload your SA ID or passport.
              <button class="btn btn-xs btn-green" style="margin-left:auto;white-space:nowrap" onclick="Router.setPage('myprofile')">Upload now</button>
            </div>
          </div>`}`;
    } catch (e) {
      wrap.innerHTML = `<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`;
    }
  }, 0);
  return `<div class="page-title">My health overview</div>
    <div id="myhealth-body" style="color:var(--text-muted);padding:20px 0">Loading…</div>`;
};

/* ══════════════════════════════
   EDIT PROFILE
══════════════════════════════ */
Pages['myprofile'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('profile-wrap');
    if (!wrap) return;
    try {
      const p = await _getMyPatientRecord();
      wrap.innerHTML = _buildProfileForm(p);
      _initUploadZone();
    } catch (e) {
      wrap.innerHTML = `<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`;
    }
  }, 0);
  return `<div class="page-title">Edit my profile</div>
    <div id="profile-wrap" style="color:var(--text-muted);padding:20px 0">Loading…</div>`;
};

function _val(p, path, fallback = '') {
  if (!p) return fallback;
  return path.split('.').reduce((o, k) => o?.[k], p) ?? fallback;
}

function _opt(val, options) {
  return options.map(o =>
    `<option value="${o.v||o}" ${_val(null,'') === (o.v||o) ? '' : ''}>${o.l||o}</option>`
  ).join('');
}

function _buildProfileForm(p) {
  const v = (path, fb='') => _val(p, path, fb);
  const sel = (id, val, options) => options.map(([ov, ol]) =>
    `<option value="${ov}" ${v(val)===ov?'selected':''}>${ol}</option>`).join('');

  return `
  <!-- ── Section 1: Personal info ── -->
  <div class="card">
    <div class="card-title"><i class="ti ti-user"></i>Personal information</div>
    <div class="three-col">
      <div class="f-group">
        <label class="f-label">First name <span style="color:var(--red)">*</span></label>
        <input class="f-input" id="pf-first" value="${v('firstName')}" placeholder="Nomsa">
      </div>
      <div class="f-group">
        <label class="f-label">Middle name</label>
        <input class="f-input" id="pf-mid" value="${v('middleName')}" placeholder="(optional)">
      </div>
      <div class="f-group">
        <label class="f-label">Last name <span style="color:var(--red)">*</span></label>
        <input class="f-input" id="pf-last" value="${v('lastName')}" placeholder="Dlamini">
      </div>
    </div>
    <div class="two-col">
      <div class="f-group">
        <label class="f-label">Date of birth <span style="color:var(--red)">*</span></label>
        <input class="f-input" type="date" id="pf-dob"
          value="${p?.dateOfBirth?new Date(p.dateOfBirth).toISOString().slice(0,10):''}"
          max="${new Date().toISOString().slice(0,10)}">
      </div>
      <div class="f-group">
        <label class="f-label">Gender <span style="color:var(--red)">*</span></label>
        <select class="f-select" id="pf-gender" style="margin:0">
          <option value="">— Select —</option>
          ${sel('gender','gender',[['male','Male'],['female','Female'],['non-binary','Non-binary'],['prefer_not_to_say','Prefer not to say']])}
        </select>
      </div>
    </div>
    <div class="two-col">
      <div class="f-group">
        <label class="f-label">ID type <span style="color:var(--red)">*</span></label>
        <select class="f-select" id="pf-idtype" style="margin:0">
          ${sel('idType','idType',[['sa_id','South African ID'],['passport','Passport'],['other','Other']])}
        </select>
      </div>
      <div class="f-group">
        <label class="f-label">ID / Passport number <span style="color:var(--red)">*</span></label>
        <input class="f-input" id="pf-idnum" value="${v('nationalId')}" placeholder="8203041234083">
      </div>
    </div>
    <div class="two-col">
      <div class="f-group">
        <label class="f-label">Blood type</label>
        <select class="f-select" id="pf-blood" style="margin:0">
          ${['unknown','A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b=>`<option value="${b}" ${v('bloodType')===b?'selected':''}>${b==='unknown'?'Unknown':b}</option>`).join('')}
        </select>
      </div>
      <div class="f-group">
        <label class="f-label">Known allergies</label>
        <input class="f-input" id="pf-allergies" value="${(p?.allergies||[]).join(', ')}" placeholder="Penicillin, Sulfa drugs (comma-separated)">
      </div>
    </div>
  </div>

  <!-- ── Section 2: Contact ── -->
  <div class="card">
    <div class="card-title"><i class="ti ti-phone"></i>Contact information</div>
    <div class="two-col">
      <div class="f-group">
        <label class="f-label">Mobile phone <span style="color:var(--red)">*</span></label>
        <input class="f-input" type="tel" id="pf-phone" value="${v('phone')}" placeholder="+27 82 000 0000">
      </div>
      <div class="f-group">
        <label class="f-label">Alternative phone</label>
        <input class="f-input" type="tel" id="pf-phonealt" value="${v('phoneAlt')}" placeholder="+27 11 000 0000">
      </div>
    </div>
    <div class="f-group">
      <label class="f-label">Email address</label>
      <input class="f-input" type="email" id="pf-email" value="${v('email')}" placeholder="name@example.com">
    </div>
  </div>

  <!-- ── Section 3: Address ── -->
  <div class="card">
    <div class="card-title"><i class="ti ti-map-pin"></i>Physical address</div>
    <div class="f-group">
      <label class="f-label">Street address</label>
      <input class="f-input" id="pf-street" value="${v('address.street')}" placeholder="123 Main Road">
    </div>
    <div class="two-col">
      <div class="f-group">
        <label class="f-label">Suburb</label>
        <input class="f-input" id="pf-suburb" value="${v('address.suburb')}" placeholder="Soweto">
      </div>
      <div class="f-group">
        <label class="f-label">City</label>
        <input class="f-input" id="pf-city" value="${v('address.city')}" placeholder="Johannesburg">
      </div>
    </div>
    <div class="two-col">
      <div class="f-group">
        <label class="f-label">Postal code</label>
        <input class="f-input" id="pf-postal" value="${v('address.postalCode')}" placeholder="2001">
      </div>
      <div class="f-group">
        <label class="f-label">Province</label>
        <select class="f-select" id="pf-province" style="margin:0">
          <option value="">— Select province —</option>
          ${['Gauteng','KwaZulu-Natal','Western Cape','Eastern Cape','Limpopo','Mpumalanga','North West','Free State','Northern Cape']
            .map(pr=>`<option value="${pr}" ${v('address.province')===pr?'selected':''}>${pr}</option>`).join('')}
        </select>
      </div>
    </div>
  </div>

  <!-- ── Section 4: Next of kin ── -->
  <div class="card">
    <div class="card-title"><i class="ti ti-heart-handshake"></i>Next of kin</div>
    <div class="two-col">
      <div class="f-group">
        <label class="f-label">Full name</label>
        <input class="f-input" id="pf-kin-name" value="${v('nextOfKin.name')}" placeholder="Jane Dlamini">
      </div>
      <div class="f-group">
        <label class="f-label">Relationship</label>
        <select class="f-select" id="pf-kin-rel" style="margin:0">
          <option value="">— Select —</option>
          ${['Spouse','Parent','Child','Sibling','Friend','Guardian','Other']
            .map(r=>`<option value="${r}" ${v('nextOfKin.relationship')===r?'selected':''}>${r}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="two-col">
      <div class="f-group">
        <label class="f-label">Phone number</label>
        <input class="f-input" type="tel" id="pf-kin-phone" value="${v('nextOfKin.phone')}" placeholder="+27 82 000 0000">
      </div>
      <div class="f-group">
        <label class="f-label">Alternative phone</label>
        <input class="f-input" type="tel" id="pf-kin-phonealt" value="${v('nextOfKin.phoneAlt')}" placeholder="+27 82 000 0000">
      </div>
    </div>
  </div>

  <!-- ── Section 5: ID document upload ── -->
  <div class="card">
    <div class="card-title"><i class="ti ti-file-upload"></i>ID document</div>

    ${p?.idDocument?.url ? `
      <div class="alert-box alert-ok" style="margin-bottom:14px">
        <i class="ti ti-file-check"></i>
        <div>
          <div style="font-weight:500">${p.idDocument.filename}</div>
          <div style="font-size:12px">Uploaded ${new Date(p.idDocument.uploadedAt).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})}</div>
        </div>
      </div>` : `
      <div class="alert-box alert-warn" style="margin-bottom:14px">
        <i class="ti ti-alert-triangle"></i>Please upload your South African ID book / smart card or passport. Required for clinic verification.
      </div>`}

    <div id="upload-zone"
      style="border:2px dashed var(--border-md);border-radius:var(--radius-lg);padding:32px;text-align:center;cursor:pointer;transition:all .2s;background:var(--bg-surface)"
      onclick="document.getElementById('pf-iddoc').click()"
      ondragover="event.preventDefault();this.style.borderColor='var(--green)'"
      ondragleave="this.style.borderColor='var(--border-md)'"
      ondrop="_handleFileDrop(event)">
      <i class="ti ti-cloud-upload" style="font-size:36px;color:var(--text-hint);display:block;margin-bottom:10px"></i>
      <div style="font-size:14px;font-weight:500;color:var(--text-muted);margin-bottom:4px">Click to browse or drag &amp; drop</div>
      <div style="font-size:12px;color:var(--text-hint)">JPG, PNG or PDF · Max 5 MB</div>
    </div>

    <input type="file" id="pf-iddoc" accept=".jpg,.jpeg,.png,.pdf" style="display:none" onchange="_handleFileSelect(this)">

    <div id="upload-preview" style="display:none;margin-top:14px">
      <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-surface);border-radius:var(--radius);border:1px solid var(--border)">
        <i class="ti ti-file" id="upload-icon" style="font-size:28px;color:var(--green)"></i>
        <div style="flex:1;min-width:0">
          <div id="upload-filename" style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>
          <div id="upload-filesize" style="font-size:12px;color:var(--text-muted)"></div>
        </div>
        <button class="btn btn-xs" onclick="_clearFile()" style="flex-shrink:0"><i class="ti ti-x"></i>Remove</button>
      </div>
      <div id="upload-img-preview" style="margin-top:10px"></div>
    </div>

    <div id="upload-progress" style="display:none;margin-top:12px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:4px">
        <span>Uploading…</span><span id="upload-pct">0%</span>
      </div>
      <div style="height:6px;background:var(--bg-surface);border-radius:3px;overflow:hidden">
        <div id="upload-bar" style="height:100%;background:var(--green);border-radius:3px;width:0%;transition:width .3s"></div>
      </div>
    </div>
  </div>

  <!-- ── Section 6: Change password ── -->
  <div class="card">
    <div class="card-title"><i class="ti ti-lock"></i>Change password</div>
    <div class="alert-box alert-info" style="margin-bottom:14px">
      <i class="ti ti-info-circle"></i>
      Leave these fields empty if you do not want to change your password.
    </div>
    <div class="f-group">
      <label class="f-label">Current password</label>
      <div style="position:relative">
        <input class="f-input" type="password" id="pf-pwd-current" placeholder="Enter your current password" style="padding-right:40px">
        <span style="position:absolute;right:11px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--text-hint);font-size:16px"
          onclick="this.previousElementSibling.type=this.previousElementSibling.type==='password'?'text':'password';this.className='ti ti-eye'+(this.previousElementSibling.type==='text'?'-off':'')">
          <i class="ti ti-eye"></i>
        </span>
      </div>
    </div>
    <div class="two-col">
      <div class="f-group">
        <label class="f-label">New password</label>
        <div style="position:relative">
          <input class="f-input" type="password" id="pf-pwd-new" placeholder="Min 8 chars, 1 uppercase, 1 number"
            style="padding-right:40px" oninput="_checkNewPwd()">
          <span style="position:absolute;right:11px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--text-hint);font-size:16px"
            onclick="this.previousElementSibling.type=this.previousElementSibling.type==='password'?'text':'password';this.className='ti ti-eye'+(this.previousElementSibling.type==='text'?'-off':'')">
            <i class="ti ti-eye"></i>
          </span>
        </div>
        <div id="pwd-strength" style="display:flex;flex-direction:column;gap:3px;margin-top:6px;font-size:12px">
          <div id="pwr-len"   style="color:var(--text-hint);display:flex;align-items:center;gap:5px"><i class="ti ti-circle" style="font-size:12px"></i> At least 8 characters</div>
          <div id="pwr-upper" style="color:var(--text-hint);display:flex;align-items:center;gap:5px"><i class="ti ti-circle" style="font-size:12px"></i> One uppercase letter</div>
          <div id="pwr-num"   style="color:var(--text-hint);display:flex;align-items:center;gap:5px"><i class="ti ti-circle" style="font-size:12px"></i> One number</div>
        </div>
      </div>
      <div class="f-group">
        <label class="f-label">Confirm new password</label>
        <div style="position:relative">
          <input class="f-input" type="password" id="pf-pwd-confirm" placeholder="Repeat new password"
            style="padding-right:40px" oninput="_checkPwdMatch()">
          <span style="position:absolute;right:11px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--text-hint);font-size:16px"
            onclick="this.previousElementSibling.type=this.previousElementSibling.type==='password'?'text':'password';this.className='ti ti-eye'+(this.previousElementSibling.type==='text'?'-off':'')">
            <i class="ti ti-eye"></i>
          </span>
        </div>
        <div id="pwd-match-msg" style="font-size:12px;margin-top:6px;display:none"></div>
      </div>
    </div>
    <button class="btn" id="pwd-change-btn" onclick="_changePassword()" style="margin-top:4px">
      <i class="ti ti-lock-check"></i>Update password
    </button>
    <div id="pwd-alert" class="alert hidden" style="margin-top:10px"></div>
  </div>

  <!-- ── Alert + Save buttons ── -->
  <div id="pf-alert" class="alert hidden" style="margin-bottom:12px"></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;padding-bottom:32px">
    <button class="btn btn-green" id="pf-save-btn" onclick="_saveProfile()">
      <i class="ti ti-device-floppy"></i>Save changes
    </button>
    <button class="btn" onclick="Router.setPage('myhealth')">
      <i class="ti ti-arrow-left"></i>Back to overview
    </button>
  </div>`;
}

/* ── File upload helpers ── */
let _selectedFile = null;

function _initUploadZone() { _selectedFile = null; }

function _handleFileSelect(input) {
  if (input.files[0]) _showFilePreview(input.files[0]);
}

function _handleFileDrop(event) {
  event.preventDefault();
  document.getElementById('upload-zone').style.borderColor = 'var(--border-md)';
  const file = event.dataTransfer.files[0];
  if (file) { document.getElementById('pf-iddoc').files; _showFilePreview(file); }
}

function _showFilePreview(file) {
  const allowed = ['image/jpeg','image/png','application/pdf'];
  if (!allowed.includes(file.type)) { UI.showToast('Only JPG, PNG or PDF files are allowed','err'); return; }
  if (file.size > 5 * 1024 * 1024) { UI.showToast('File must be under 5 MB','err'); return; }

  _selectedFile = file;
  const preview = document.getElementById('upload-preview');
  const zone    = document.getElementById('upload-zone');
  const fname   = document.getElementById('upload-filename');
  const fsize   = document.getElementById('upload-filesize');
  const icon    = document.getElementById('upload-icon');
  const imgPrev = document.getElementById('upload-img-preview');

  fname.textContent = file.name;
  fsize.textContent = (file.size / 1024).toFixed(0) + ' KB · ' + (file.type === 'application/pdf' ? 'PDF' : 'Image');
  icon.className    = file.type === 'application/pdf' ? 'ti ti-file-type-pdf' : 'ti ti-photo';
  icon.style.color  = file.type === 'application/pdf' ? 'var(--red)' : 'var(--green)';
  preview.style.display = 'block';
  zone.style.display    = 'none';

  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = e => {
      imgPrev.innerHTML = `<img src="${e.target.result}"
        style="max-width:100%;max-height:180px;border-radius:8px;border:1px solid var(--border);object-fit:contain">`;
    };
    reader.readAsDataURL(file);
  } else {
    imgPrev.innerHTML = '';
  }
}

function _clearFile() {
  _selectedFile = null;
  document.getElementById('pf-iddoc').value = '';
  document.getElementById('upload-preview').style.display = 'none';
  document.getElementById('upload-zone').style.display    = 'block';
  document.getElementById('upload-img-preview').innerHTML = '';
}

async function _uploadIdDoc() {
  if (!_selectedFile) return null;
  const token = API.Tokens.getAccess();
  const form  = new FormData();
  form.append('idDocument', _selectedFile);

  // Fake progress animation
  const bar  = document.getElementById('upload-bar');
  const pct  = document.getElementById('upload-pct');
  const prog = document.getElementById('upload-progress');
  prog.style.display = 'block';
  let p = 0;
  const timer = setInterval(() => {
    p = Math.min(p + 10, 85);
    if (bar) bar.style.width = p + '%';
    if (pct) pct.textContent = p + '%';
  }, 150);

  try {
    const res  = await fetch('http://localhost:5000/api/v1/patients/me/upload-id', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form
    });
    const data = await res.json();
    clearInterval(timer);
    if (bar) bar.style.width = '100%';
    if (pct) pct.textContent = '100%';
    await new Promise(r => setTimeout(r, 400));
    prog.style.display = 'none';
    if (!data.success) throw new Error(data.message);
    return data.data;
  } catch (err) {
    clearInterval(timer);
    prog.style.display = 'none';
    throw err;
  }
}

/* ── Save profile ── */
window._saveProfile = async () => {
  const btn = document.getElementById('pf-save-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner" style="width:16px;height:16px;border-color:rgba(255,255,255,.3);border-top-color:#fff"></div> Saving…'; }

  const g = id => document.getElementById(id)?.value?.trim() || '';

  // Validation
  const errors = [];
  if (!g('pf-first') || !g('pf-last')) errors.push('First and last name are required.');
  if (!g('pf-dob'))    errors.push('Date of birth is required.');
  if (!g('pf-gender')) errors.push('Gender is required.');
  if (!g('pf-idnum'))  errors.push('ID / Passport number is required.');
  if (!g('pf-phone'))  errors.push('Mobile phone number is required.');

  if (errors.length) {
    _pfAlert(errors.join(' '), 'error');
    _resetSaveBtn(btn); return;
  }

  const payload = {
    firstName:   g('pf-first'),
    middleName:  g('pf-mid'),
    lastName:    g('pf-last'),
    dateOfBirth: g('pf-dob'),
    gender:      g('pf-gender'),
    idType:      g('pf-idtype'),
    nationalId:  g('pf-idnum'),
    bloodType:   g('pf-blood'),
    allergies:   g('pf-allergies').split(',').map(s=>s.trim()).filter(Boolean),
    phone:       g('pf-phone'),
    phoneAlt:    g('pf-phonealt'),
    email:       g('pf-email'),
    address: {
      street:     g('pf-street'),
      suburb:     g('pf-suburb'),
      city:       g('pf-city'),
      postalCode: g('pf-postal'),
      province:   g('pf-province')
    },
    nextOfKin: {
      name:         g('pf-kin-name'),
      relationship: g('pf-kin-rel'),
      phone:        g('pf-kin-phone'),
      phoneAlt:     g('pf-kin-phonealt')
    }
  };

  try {
    // Save profile data
    await API._fetchDirect('/patients/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });

    // Upload document if one is selected
    if (_selectedFile) {
      await _uploadIdDoc();
      UI.showToast('Profile and ID document saved!', 'ok');
    } else {
      UI.showToast('Profile saved successfully!', 'ok');
    }

    Router.setPage('myhealth');
  } catch (e) {
    _pfAlert(e.message || 'Failed to save. Please try again.', 'error');
    _resetSaveBtn(btn);
  }
};

function _pfAlert(msg, type) {
  const el = document.getElementById('pf-alert');
  if (!el) return;
  el.className = 'alert alert-' + (type==='error'?'error':'success');
  el.innerHTML = `<i class="ti ti-${type==='error'?'alert-circle':'check'}"></i> ${msg}`;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

/* ── Password change helpers ── */
window._checkNewPwd = () => {
  const v = document.getElementById('pf-pwd-new')?.value || '';
  const setRule = (id, ok) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.color = ok ? 'var(--green)' : 'var(--text-hint)';
    el.querySelector('i').className = 'ti ti-' + (ok ? 'circle-check' : 'circle');
  };
  setRule('pwr-len',   v.length >= 8);
  setRule('pwr-upper', /[A-Z]/.test(v));
  setRule('pwr-num',   /[0-9]/.test(v));
  _checkPwdMatch();
};

window._checkPwdMatch = () => {
  const newPwd  = document.getElementById('pf-pwd-new')?.value || '';
  const confirm = document.getElementById('pf-pwd-confirm')?.value || '';
  const msg = document.getElementById('pwd-match-msg');
  if (!msg || !confirm) return;
  msg.style.display = 'block';
  if (newPwd === confirm) {
    msg.style.color = 'var(--green)';
    msg.innerHTML = '<i class="ti ti-check" style="font-size:12px"></i> Passwords match';
  } else {
    msg.style.color = 'var(--red)';
    msg.innerHTML = '<i class="ti ti-x" style="font-size:12px"></i> Passwords do not match';
  }
};

window._changePassword = async () => {
  const current = document.getElementById('pf-pwd-current')?.value || '';
  const newPwd  = document.getElementById('pf-pwd-new')?.value     || '';
  const confirm = document.getElementById('pf-pwd-confirm')?.value  || '';
  const alertEl = document.getElementById('pwd-alert');
  const btn     = document.getElementById('pwd-change-btn');

  const showPwdAlert = (msg, type) => {
    if (!alertEl) return;
    alertEl.className = 'alert alert-' + (type === 'error' ? 'error' : 'success');
    alertEl.innerHTML = '<i class="ti ti-' + (type === 'error' ? 'alert-circle' : 'check') + '"></i> ' + msg;
    alertEl.classList.remove('hidden');
    alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Validation
  if (!current) { showPwdAlert('Please enter your current password.', 'error'); return; }
  if (!newPwd)  { showPwdAlert('Please enter a new password.', 'error'); return; }
  if (newPwd.length < 8 || !/[A-Z]/.test(newPwd) || !/[0-9]/.test(newPwd)) {
    showPwdAlert('New password must be at least 8 characters with one uppercase letter and one number.', 'error'); return;
  }
  if (newPwd !== confirm) { showPwdAlert('Passwords do not match.', 'error'); return; }
  if (current === newPwd) { showPwdAlert('New password must be different from your current password.', 'error'); return; }

  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:14px;height:14px"></div> Updating…'; }

  try {
    await API._fetchDirect('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: current, newPassword: newPwd })
    });
    showPwdAlert('Password updated successfully!', 'success');
    // Clear the fields
    ['pf-pwd-current','pf-pwd-new','pf-pwd-confirm'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const matchMsg = document.getElementById('pwd-match-msg');
    if (matchMsg) matchMsg.style.display = 'none';
    ['pwr-len','pwr-upper','pwr-num'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.color = 'var(--text-hint)';
        el.querySelector('i').className = 'ti ti-circle';
      }
    });
  } catch (e) {
    showPwdAlert(e.message || 'Failed to update password. Check your current password and try again.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-lock-check"></i>Update password'; }
  }
};

function _resetSaveBtn(btn) {
  if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-device-floppy"></i>Save changes'; }
}

/* ══════════════════════════════
   APPOINTMENTS
══════════════════════════════ */
Pages['appointments'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('appt-list');
    if (!wrap) return;
    try {
      const p = await _getMyPatientRecord();
      if (!p) { wrap.innerHTML='<p style="color:var(--text-muted)">Please complete your profile first.</p>'; return; }
      const res   = await API.appointments.list({ patient: p._id, limit: 30 });
      const items = (res.data||[]).sort((a,b)=>new Date(b.scheduledAt)-new Date(a.scheduledAt));
      wrap.innerHTML = items.length ? items.map(a => {
        const badge = {confirmed:'badge-green',pending:'badge-amber',completed:'badge-green',cancelled:'badge-gray',no_show:'badge-red'}[a.status]||'badge-gray';
        const canCancel = ['pending','confirmed'].includes(a.status) && new Date(a.scheduledAt) > new Date();
        return `<div style="padding:12px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
            <div style="flex:1;min-width:0">
              <div style="font-weight:500;font-size:13px;text-transform:capitalize">${a.visitType.replace('_',' ')} — ${a.reason||'No reason specified'}</div>
              <div style="font-size:12px;color:var(--text-muted)">${a.facility?.name||'Facility'}</div>
              <div style="font-size:12px;color:var(--text-muted)">${new Date(a.scheduledAt).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'})} at ${new Date(a.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
              <span class="badge ${badge}">${a.status}</span>
              ${canCancel?`<button class="btn btn-xs" onclick="_cancelAppt('${a._id}')"><i class="ti ti-x"></i>Cancel</button>`:''}
            </div>
          </div>
        </div>`;
      }).join('') : '<p style="color:var(--text-muted);padding:16px 0">No appointments found. <button class="btn btn-sm btn-green" onclick="Router.setPage(\'book\')" style="margin-left:8px"><i class="ti ti-plus"></i>Book now</button></p>';
    } catch (e) { wrap.innerHTML=`<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`; }
  }, 0);
  return `<div class="page-title">My appointments</div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
      <button class="btn btn-green" onclick="Router.setPage('book')"><i class="ti ti-plus"></i>Book new visit</button>
    </div>
    <div class="card"><div class="card-title"><i class="ti ti-calendar"></i>All appointments</div>
      <div id="appt-list" style="color:var(--text-muted);padding:16px">Loading…</div>
    </div>`;
};

window._cancelAppt = async (id) => {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;
  try {
    await API._fetchDirect(`/appointments/${id}/cancel`, { method:'PATCH' });
    UI.showToast('Appointment cancelled','ok');
    Router.setPage('appointments');
  } catch (e) { UI.showToast(e.message||'Could not cancel','err'); }
};

/* ══════════════════════════════
   PRESCRIPTIONS
══════════════════════════════ */
Pages['myrx'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('rx-list');
    if (!wrap) return;
    try {
      const p = await _getMyPatientRecord();
      if (!p) { wrap.innerHTML='<p style="color:var(--text-muted)">Please complete your profile first.</p>'; return; }
      const res = await API.prescriptions.list({ patient: p._id, limit: 30 });
      wrap.innerHTML = (res.data||[]).length ? (res.data||[]).map(rx=>`
        <div style="padding:12px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-weight:600;font-size:13px">${(rx.lines||[]).map(l=>l.medicationName).join(', ')||'Prescription'}</div>
              <div style="font-size:12px;color:var(--text-muted)">${(rx.lines||[]).map(l=>l.dosage).join(' · ')}</div>
              <div style="font-size:12px;color:var(--text-muted)">Dr. ${rx.prescribedBy?.firstName||''} ${rx.prescribedBy?.lastName||''} · ${new Date(rx.createdAt).toLocaleDateString('en-ZA')}</div>
            </div>
            <span class="badge ${rx.status==='pending'?'badge-green':'badge-gray'}">${rx.status}</span>
          </div>
        </div>`).join('')
      : '<p style="color:var(--text-muted);padding:16px 0">No prescriptions on record.</p>';
    } catch (e) { wrap.innerHTML=`<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`; }
  }, 0);
  return `<div class="page-title">My prescriptions</div>
    <div class="card"><div class="card-title"><i class="ti ti-pill"></i>All prescriptions</div>
      <div id="rx-list" style="color:var(--text-muted);padding:16px">Loading…</div>
    </div>`;
};

/* ══════════════════════════════
   BOOK A VISIT
══════════════════════════════ */
Pages['book'] = () => {
  const now     = new Date();
  const minDate = new Date(now.getTime() + 1*60*1000); // 1 min buffer
  const tmr     = new Date(now); tmr.setDate(tmr.getDate()+1); tmr.setHours(8,0,0,0);
  const toLocal = d => new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  const minStr  = toLocal(minDate);
  const defStr  = toLocal(tmr);

  setTimeout(async () => {
    const facEl  = document.getElementById('book-facility');
    const dateEl = document.getElementById('book-date');
    if (!facEl) return;
    if (dateEl) { dateEl.min=minStr; dateEl.value=defStr; }
    try {
      const res    = await API.facilities.list();
      const online = (res.data||[]).filter(f=>f.isOnline!==false);
      const offln  = (res.data||[]).filter(f=>f.isOnline===false);
      facEl.innerHTML =
        online.map(f=>`<option value="${f._id}">${f.name}</option>`).join('') +
        (offln.length?`<optgroup label="Currently offline">${offln.map(f=>`<option value="${f._id}" disabled>${f.name} (offline)</option>`).join('')}</optgroup>`:'');
    } catch(e) { facEl.innerHTML='<option>Failed to load facilities</option>'; }
  }, 0);

  return `
    <div class="page-title">Book a visit</div>
    <div class="alert-box alert-info" style="margin-bottom:14px">
      <i class="ti ti-clock"></i>
      Clinic hours: <strong>Mon–Fri 07:00–17:00</strong> · <strong>Sat 07:00–13:00</strong> · Closed Sundays · Same-day bookings need 1 hour notice.
    </div>
    <div class="card">
      <div class="card-title"><i class="ti ti-calendar-plus"></i>New appointment</div>
      <div class="two-col">
        <div>
          <div class="f-group"><label class="f-label">Visit type</label>
            <select class="f-select" id="book-type" style="margin:0">
              <option value="consultation">General consultation</option>
              <option value="telemedicine">Telemedicine (video call)</option>
              <option value="lab">Lab / blood draw</option>
              <option value="immunisation">Immunisation</option>
              <option value="mental_health">Mental health</option>
            </select>
          </div>
          <div class="f-group" style="margin-top:10px"><label class="f-label">Facility</label>
            <select class="f-select" id="book-facility" style="margin:0"><option>Loading…</option></select>
          </div>
          <div class="f-group" style="margin-top:10px">
            <label class="f-label">Date &amp; time</label>
            <input type="datetime-local" class="f-input" id="book-date" min="${minStr}" value="${defStr}" style="margin:0">
            <div id="date-err" style="display:none;font-size:12px;color:var(--red);margin-top:4px">
              <i class="ti ti-alert-circle"></i> Please select a future date within clinic hours.
            </div>
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
            <textarea class="f-textarea" style="height:140px" id="book-reason"
              placeholder="Briefly describe your symptoms or reason for the visit…"></textarea>
          </div>
          <div class="alert-box alert-ok" style="margin-bottom:10px">
            <i class="ti ti-device-mobile"></i>You'll receive an SMS with your queue token once booked.
          </div>
          <button class="btn btn-green" style="width:100%" id="book-btn" onclick="window._bookAppointment()">
            <i class="ti ti-calendar-check"></i>Confirm booking
          </button>
        </div>
      </div>
    </div>`;
};

window._bookAppointment = async () => {
  const visitType  = document.getElementById('book-type')?.value;
  const facilityId = document.getElementById('book-facility')?.value;
  const dateVal    = document.getElementById('book-date')?.value;
  const reason     = document.getElementById('book-reason')?.value?.trim();
  const lang       = document.getElementById('book-lang')?.value;
  const btn        = document.getElementById('book-btn');

  if (!facilityId||facilityId.startsWith('Loading')) { UI.showToast('Please select a facility','err'); return; }
  if (!dateVal) { UI.showToast('Please select a date and time','err'); return; }

  const selected = new Date(dateVal);
  const now = new Date();
  if (selected <= now) { UI.showToast('Cannot book in the past','err'); return; }
  if (selected <= now) {
    UI.showToast('Cannot book appointments in the past','err');
    return;
  }
  // Clinic hours validation disabled for testing
  // Re-enable in production by uncommenting below:
  // const day = selected.getDay(), hour = selected.getHours()+selected.getMinutes()/60;
  // if (day===0) { UI.showToast('Clinics are closed on Sundays','err'); return; }
  // if (day===6&&hour>=13) { UI.showToast('Saturday clinics close at 13:00','err'); return; }
  // if (hour<7||hour>=17) { UI.showToast('Clinic hours: 07:00–17:00 Mon–Fri','err'); return; }

  if (btn) { btn.disabled=true; btn.innerHTML='<i class="ti ti-loader-2"></i> Booking…'; }
  try {
    const p = await _getMyPatientRecord();
    if (!p) { UI.showToast('Please complete your profile first','err'); Router.setPage('myprofile'); return; }
    await API.appointments.create({ patient:p._id, facility:facilityId, visitType, scheduledAt:selected.toISOString(), reason, interpreterLanguage:lang||undefined });
    UI.showToast('Appointment booked! SMS confirmation sent.','ok');
    Router.setPage('appointments');
  } catch(e) {
    UI.showToast(e.message||'Booking failed','err');
    if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-calendar-check"></i>Confirm booking'; }
  }
};
