/**
 * js/auth.js — Authentication flows
 */

let _resetEmail = '';
let _facilitiesLoaded = false;
let _regTab = 1;

/* ── Panel switching ── */
function showPanel(name) {
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  _clearAllAlerts();
}

function _clearAllAlerts() {
  document.querySelectorAll('.alert').forEach(a => { a.classList.add('hidden'); a.innerHTML = ''; });
}

function _showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  // Support both old (alert-error/alert-success) and new (alert-err/alert-ok) class names
  const errClass = type === 'error' ? 'alert-err' : 'alert-ok';
  el.className   = 'alert ' + errClass;
  el.innerHTML   = `<i class="ti ti-${type === 'error' ? 'alert-circle' : 'check'}"></i> ${msg}`;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

function checkPwd() {
  const v = document.getElementById('reg-password')?.value || '';
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

/* ── Normalise phone number ── */
function normalisePhone(val) {
  if (!val) return val;
  const digits = val.replace(/[^0-9]/g, '');
  if (digits.startsWith('27') && digits.length >= 11) return '+' + digits;
  if (digits.startsWith('0')  && digits.length === 10) return '+27' + digits.slice(1);
  if (digits.length === 9) return '+27' + digits;
  return val;
}

function _autoFormatPhone(input) {
  const raw = input.value.trim();
  if (!raw) return;
  const normalised = normalisePhone(raw);
  if (normalised !== raw) {
    input.value = normalised;
    input.style.borderColor = 'var(--green)';
    setTimeout(() => { input.style.borderColor = ''; }, 1500);
  }
}

/* ── Registration tabs ── */
function _showRegTab(n) {
  _regTab = n;
  for (let i = 1; i <= 5; i++) {
    const tab = document.getElementById(`reg-tab-${i}`);
    const btn = document.getElementById(`reg-tab-btn-${i}`);
    if (tab) tab.style.display = i === n ? 'block' : 'none';
    if (btn) {
      btn.classList.toggle('active', i === n);
      btn.classList.toggle('done', i < n);
    }
  }
  // Show/hide nav buttons
  const prevBtn = document.getElementById('reg-prev');
  const nextBtn = document.getElementById('reg-next');
  const submitBtn = document.getElementById('reg-submit');
  if (prevBtn)  prevBtn.style.display  = n > 1 ? 'block' : 'none';
  if (nextBtn)  nextBtn.style.display  = n < 5 ? 'block' : 'none';
  if (submitBtn)submitBtn.style.display= n === 5 ? 'block' : 'none';
}

function _nextRegTab() {
  if (!_validateRegTab(_regTab)) return;
  if (_regTab < 5) _showRegTab(_regTab + 1);
}

function _prevRegTab() {
  if (_regTab > 1) _showRegTab(_regTab - 1);
}

function _validateRegTab(n) {
  const alertEl = document.getElementById('register-alert');
  const showErr = (msg) => { _showAlert('register-alert', msg); return false; };

  if (n === 1) {
    const first = document.getElementById('reg-first')?.value?.trim();
    const last  = document.getElementById('reg-last')?.value?.trim();
    const dob   = document.getElementById('reg-dob')?.value;
    const gender= document.getElementById('reg-gender')?.value;
    const idnum = document.getElementById('reg-idnum')?.value?.trim();
    const role  = document.getElementById('reg-role')?.value;
    if (!first || !last) return showErr('First and last name are required.');
    if (!dob)            return showErr('Date of birth is required.');
    if (!gender)         return showErr('Please select your gender.');
    if (!idnum)          return showErr('ID / Passport number is required.');
    if (!role)           return showErr('Please select your role.');
  }
  if (n === 2) {
    const email = document.getElementById('reg-email')?.value?.trim();
    const phone = document.getElementById('reg-phone')?.value?.trim();
    if (!email || !email.includes('@')) return showErr('Valid email address is required.');
    if (!phone) return showErr('Mobile phone number is required.');
  }
  return true;
}

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
  // Validate last tab
  if (!_validateRegTab(5)) return;

  const g = id => document.getElementById(id)?.value?.trim() || '';
  const password = g('reg-password');
  const confirm  = g('reg-confirm');
  const terms    = document.getElementById('reg-terms')?.checked;

  if (!_passwordValid(password)) { _showAlert('register-alert', 'Password does not meet requirements.'); return; }
  if (password !== confirm)      { _showAlert('register-alert', 'Passwords do not match.'); return; }
  if (!terms)                    { _showAlert('register-alert', 'You must accept the Terms and Privacy Policy.'); return; }

  const btn = document.getElementById('reg-submit');
  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner"></div>'; }

  // Normalise phones before sending
  const phone    = normalisePhone(g('reg-phone'));
  const phoneAlt = normalisePhone(g('reg-phone-alt'));

  try {
    const payload = {
      firstName:   g('reg-first'),
      middleName:  g('reg-mid'),
      lastName:    g('reg-last'),
      dateOfBirth: g('reg-dob'),
      gender:      g('reg-gender'),
      idType:      g('reg-idtype') || 'sa_id',
      nationalId:  g('reg-idnum'),
      role:        g('reg-role'),
      email:       g('reg-email').toLowerCase(),
      phone,
      phoneAlt,
      password
    };

    const data = await API.auth.register(payload);
    API.saveSession(data);
    _showAlert('register-alert', `
      <div style="text-align:center;padding:8px 0">
        <i class="ti ti-mail-check" style="font-size:32px;color:var(--green);display:block;margin-bottom:8px"></i>
        <strong>Account created!</strong><br>
        We've sent an activation link to <strong>${payload.email}</strong>.<br>
        <span style="font-size:12px;color:var(--text-muted)">Check your inbox and click the link to activate your account.</span>
        ${!navigator.onLine || true ? '<br><span style="font-size:11px;color:var(--text-hint)">(If email is not configured, check the backend terminal for the activation link)</span>' : ''}
      </div>`, 'success');
    // Auto-login after short delay so they can use the system immediately
    setTimeout(() => App.launch(data.user), 3000);
  } catch (err) {
    _showAlert('register-alert', err.message || 'Registration failed. Please try again.');
    if (btn) { btn.disabled=false; btn.innerHTML='<span>Create account</span>'; }
  }
}

/* ══════════════════════════════
   RESET PASSWORD — Step 1
══════════════════════════════ */
async function doReset() {
  const email = document.getElementById('reset-email').value.trim().toLowerCase();
  if (!email) { _showAlert('reset-alert', 'Please enter your email address.'); return; }
  const btn = document.querySelector('#reset-step-1 .btn-primary');
  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner"></div>'; }
  try {
    await API.auth.forgotPassword(email);
    _resetEmail = email;
    document.getElementById('reset-step-1').style.display = 'none';
    document.getElementById('reset-step-2').style.display = 'block';
    _clearAllAlerts();
    UI.showToast('OTP sent to your email and phone', 'ok');
  } catch (err) {
    _showAlert('reset-alert', err.message || 'Failed to send OTP.');
  } finally {
    if (btn) { btn.disabled=false; btn.innerHTML='<span>Send OTP</span>'; }
  }
}

/* ══════════════════════════════
   RESET PASSWORD — Step 2
══════════════════════════════ */
async function doResetConfirm() {
  const otp     = document.getElementById('reset-otp').value.trim();
  const newpwd  = document.getElementById('reset-newpwd').value;
  const confirm = document.getElementById('reset-confirmpwd').value;
  if (!otp || otp.length !== 6)  { _showAlert('reset-alert', 'Enter the 6-digit OTP.'); return; }
  if (!_passwordValid(newpwd))   { _showAlert('reset-alert', 'Password must be 8+ chars with uppercase and a number.'); return; }
  if (newpwd !== confirm)        { _showAlert('reset-alert', 'Passwords do not match.'); return; }
  const btn = document.querySelector('#reset-step-2 .btn-primary');
  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner"></div>'; }
  try {
    await API.auth.resetPassword(_resetEmail, otp, newpwd);
    _showAlert('reset-alert', 'Password updated! Redirecting to sign in…', 'success');
    setTimeout(() => {
      _resetEmail = '';
      document.getElementById('reset-step-1').style.display = 'block';
      document.getElementById('reset-step-2').style.display = 'none';
      ['reset-email','reset-otp','reset-newpwd','reset-confirmpwd'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      showPanel('login');
    }, 1500);
  } catch (err) {
    _showAlert('reset-alert', err.message || 'Failed to reset password.');
    if (btn) { btn.disabled=false; btn.innerHTML='<span>Set new password</span>'; }
  }
}

/* ── Logout ── */
async function doLogout() {
  try { await API.auth.logout(); } catch (_) {}
  API.clearSession();
  window.location.replace('login.html');
}

/* ── Enter key shortcut on login ── */
document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('login-email');
  const pwdInput   = document.getElementById('login-password');
  if (emailInput) emailInput.addEventListener('keydown', e => { if (e.key === 'Enter') pwdInput?.focus(); });
  if (pwdInput)   pwdInput.addEventListener('keydown',   e => { if (e.key === 'Enter') doLogin(); });
});
