/**
 * js/auth.js — Authentication flows
 */

let _resetEmail = '';
let _facilitiesLoaded = false;

/* ── Panel switching ── */
function showPanel(name) {
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  _clearAllAlerts();
  // Load facilities when register panel opens
  if (name === 'register') loadRegFacilities();
}

function _clearAllAlerts() {
  document.querySelectorAll('.alert').forEach(a => { a.classList.add('hidden'); a.innerHTML = ''; });
}

function _showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'alert alert-' + type;
  el.innerHTML = `<i class="ti ti-${type === 'error' ? 'alert-circle' : 'check'}"></i> ${msg}`;
  el.classList.remove('hidden');
}

function _setLoading(btnId, loading, label = 'Sign in') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading ? '<div class="spinner"></div>' : `<span>${label}</span>`;
}

function togglePwd(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  btn.innerHTML = `<i class="ti ti-eye${isText ? '' : '-off'}"></i>`;
}

function fillDemo(role) {
  document.getElementById('login-email').value    = role + '@nihms.gov.za';
  document.getElementById('login-password').value = 'Demo@1234';
}

function checkPwd() {
  const v = document.getElementById('reg-password').value;
  _setRule('rule-len',   v.length >= 8);
  _setRule('rule-upper', /[A-Z]/.test(v));
  _setRule('rule-num',   /[0-9]/.test(v));
}

function _setRule(id, ok) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('ok', ok);
  el.querySelector('i').className = 'ti ti-' + (ok ? 'circle-check' : 'circle');
}

function _passwordValid(pwd) {
  return pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);
}

/* ── Load facilities for registration dropdown ── */
async function loadRegFacilities() {
  if (_facilitiesLoaded) return;
  const sel = document.getElementById('reg-facility');
  if (!sel) return;
  try {
    // Facilities endpoint is public — no auth needed
    const res  = await fetch('http://localhost:5000/api/v1/facilities');
    const data = await res.json();
    if (data.success && data.data.length) {
      const online  = data.data.filter(f => f.isOnline !== false);
      const offline = data.data.filter(f => f.isOnline === false);
      sel.innerHTML =
        '<option value="">— Select facility —</option>' +
        online.map(f  => `<option value="${f._id}">${f.name}</option>`).join('') +
        (offline.length
          ? `<optgroup label="Currently offline">${offline.map(f => `<option value="${f._id}">${f.name} (offline)</option>`).join('')}</optgroup>`
          : '');
      _facilitiesLoaded = true;
    }
  } catch (e) {
    console.warn('Could not load facilities:', e.message);
    // Fall back to hardcoded options
    sel.innerHTML = `
      <option value="">— Select facility —</option>
      <option>Johannesburg CHC</option>
      <option>Helen Joseph Hospital</option>
      <option>Soweto Clinic</option>
      <option>Bela-Bela Clinic</option>
      <option>Thohoyandou CHC</option>`;
  }
}

/* ── Show patient-specific fields when role = patient ── */
document.addEventListener('DOMContentLoaded', () => {
  const roleEl = document.getElementById('reg-role');
  if (roleEl) roleEl.addEventListener('change', () => {
    const extra = document.getElementById('patient-extra-fields');
    if (extra) extra.style.display = roleEl.value === 'patient' ? 'block' : 'none';
  });
});

/* ══════════════════════════════
   LOGIN
══════════════════════════════ */
async function doLogin() {
  const email    = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { _showAlert('login-alert', 'Please enter your email and password.'); return; }
  _setLoading('login-btn', true);
  try {
    const data = await API.auth.login({ email, password });
    API.saveSession(data);
    App.launch(data.user);
  } catch (err) {
    _showAlert('login-alert', err.message || 'Login failed. Please check your credentials.');
    _setLoading('login-btn', false);
  }
}

/* ══════════════════════════════
   REGISTER
══════════════════════════════ */
async function doRegister() {
  const firstName  = document.getElementById('reg-first').value.trim();
  const lastName   = document.getElementById('reg-last').value.trim();
  const email      = document.getElementById('reg-email').value.trim().toLowerCase();
  const role       = document.getElementById('reg-role').value;
  const facilityEl = document.getElementById('reg-facility');
  const facilityId = facilityEl?.value || '';
  const facilityName = facilityEl?.options[facilityEl.selectedIndex]?.text || '';
  const password   = document.getElementById('reg-password').value;
  const confirm    = document.getElementById('reg-confirm').value;
  const terms      = document.getElementById('reg-terms').checked;

  // Validation
  if (!firstName || !lastName)       { _showAlert('register-alert', 'Please enter your full name.'); return; }
  if (!email || !email.includes('@')) { _showAlert('register-alert', 'Please enter a valid email address.'); return; }
  if (!role)                          { _showAlert('register-alert', 'Please select your role.'); return; }
  if (!facilityId || facilityId === '')      { _showAlert('register-alert', 'Please select your facility.'); return; }
  if (!_passwordValid(password))      { _showAlert('register-alert', 'Password does not meet the requirements.'); return; }
  if (password !== confirm)           { _showAlert('register-alert', 'Passwords do not match.'); return; }
  if (!terms)                         { _showAlert('register-alert', 'You must accept the Terms and Privacy Policy.'); return; }

  const btn = document.querySelector('#panel-register .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>'; }

  try {
    const regPayload = {
      firstName, lastName, email, password, role,
      facilityId:   facilityId   || null,
      facilityName: facilityName || ''
    };
    // Include patient-specific fields if registering as patient
    if (role === 'patient') {
      regPayload.dateOfBirth = document.getElementById('reg-dob')?.value || null;
      regPayload.gender      = document.getElementById('reg-gender')?.value || 'prefer_not_to_say';
      regPayload.idType      = document.getElementById('reg-idtype')?.value || 'sa_id';
      regPayload.nationalId  = document.getElementById('reg-idnum')?.value?.trim() || null;
      regPayload.phone       = document.getElementById('reg-phone')?.value?.trim() || '';
    }
    const data = await API.auth.register(regPayload);
    API.saveSession(data);
    _showAlert('register-alert', 'Account created! Signing you in…', 'success');
    setTimeout(() => App.launch(data.user), 1000);
  } catch (err) {
    _showAlert('register-alert', err.message || 'Registration failed. Please try again.');
    if (btn) { btn.disabled = false; btn.innerHTML = '<span>Create account</span>'; }
  }
}

/* ══════════════════════════════
   RESET PASSWORD — Step 1
══════════════════════════════ */
async function doReset() {
  const email = document.getElementById('reset-email').value.trim().toLowerCase();
  if (!email) { _showAlert('reset-alert', 'Please enter your email address.'); return; }
  const btn = document.querySelector('#reset-step-1 .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>'; }
  try {
    await API.auth.forgotPassword(email);
    _resetEmail = email;
    document.getElementById('reset-step-1').style.display = 'none';
    document.getElementById('reset-step-2').style.display = 'block';
    _clearAllAlerts();
    UI.showToast('OTP generated — check the backend terminal for your code', 'ok');
  } catch (err) {
    _showAlert('reset-alert', err.message || 'Failed to send OTP. Please try again.');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<span>Send OTP</span>'; }
  }
}

/* ══════════════════════════════
   RESET PASSWORD — Step 2
══════════════════════════════ */
async function doResetConfirm() {
  const otp     = document.getElementById('reset-otp').value.trim();
  const newpwd  = document.getElementById('reset-newpwd').value;
  const confirm = document.getElementById('reset-confirmpwd').value;
  if (!otp || otp.length !== 6)    { _showAlert('reset-alert', 'Enter the 6-digit OTP from your email.'); return; }
  if (!_passwordValid(newpwd))     { _showAlert('reset-alert', 'Password must be 8+ chars with uppercase and a number.'); return; }
  if (newpwd !== confirm)          { _showAlert('reset-alert', 'Passwords do not match.'); return; }
  const btn = document.querySelector('#reset-step-2 .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>'; }
  try {
    await API.auth.resetPassword(_resetEmail, otp, newpwd);
    _showAlert('reset-alert', 'Password updated! Redirecting to login…', 'success');
    setTimeout(() => {
      _resetEmail = '';
      document.getElementById('reset-step-1').style.display = 'block';
      document.getElementById('reset-step-2').style.display = 'none';
      ['reset-email','reset-otp','reset-newpwd','reset-confirmpwd'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      showPanel('login');
    }, 1500);
  } catch (err) {
    _showAlert('reset-alert', err.message || 'Failed to reset password.');
    if (btn) { btn.disabled = false; btn.innerHTML = '<span>Set new password</span>'; }
  }
}

/* ── Logout ── */
async function doLogout() {
  try { await API.auth.logout(); } catch (_) {}
  API.clearSession();
  _facilitiesLoaded = false;
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  showPanel('login');
  UI.showToast('Signed out successfully', 'ok');
}

/* ── Enter key shortcuts ── */
document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('login-email');
  const pwdInput   = document.getElementById('login-password');
  if (emailInput) emailInput.addEventListener('keydown', e => { if (e.key === 'Enter') pwdInput?.focus(); });
  if (pwdInput)   pwdInput.addEventListener('keydown',   e => { if (e.key === 'Enter') doLogin(); });
});
