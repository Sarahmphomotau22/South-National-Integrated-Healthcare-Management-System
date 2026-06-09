/**
 * js/api.js — Centralised API client
 * Set BASE_URL to your backend address.
 */

const API = (() => {

  // Auto-detect backend URL:
// - On Railway/cloud: uses BACKEND_URL meta tag injected at build
// - Locally: uses localhost:5000
const _metaBackend = document.querySelector('meta[name="backend-url"]')?.content;
const BASE_URL = _metaBackend || 'http://localhost:5000/api/v1';

  /* ── Token management ── */
  const Tokens = {
    getAccess()  { return sessionStorage.getItem('nihms_access'); },
    getRefresh() { return localStorage.getItem('nihms_refresh'); },
    set(access, refresh) {
      if (access)  sessionStorage.setItem('nihms_access',  access);
      if (refresh) localStorage.setItem('nihms_refresh', refresh);
    },
    clear() {
      sessionStorage.removeItem('nihms_access');
      localStorage.removeItem('nihms_refresh');
      localStorage.removeItem('nihms_user');
    }
  };

  /* ── Core HTTP ── */
  let _refreshPromise = null;

  async function _fetch(path, options = {}, retry = true) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const token   = Tokens.getAccess();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

    if (res.status === 401 && retry) {
      try {
        if (!_refreshPromise) _refreshPromise = _silentRefresh();
        await _refreshPromise;
        _refreshPromise = null;
        return _fetch(path, options, false);
      } catch {
        _refreshPromise = null;
        Tokens.clear();
        window.location.reload();
        return;
      }
    }

    const data = await res.json();
    if (!data.success && res.status >= 400) {
      throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status });
    }
    return data;
  }

  async function _silentRefresh() {
    const refresh = Tokens.getRefresh();
    if (!refresh) throw new Error('No refresh token');
    const res  = await fetch(`${BASE_URL}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: refresh })
    });
    const data = await res.json();
    if (!data.success) throw new Error('Refresh failed');
    Tokens.set(data.accessToken, data.refreshToken);
  }

  const get   = (path, params) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined && v !== null && v !== 'undefined'))
    ).toString() : '';
    return _fetch(path + qs);
  };
  const post  = (path, body) => _fetch(path, { method: 'POST',   body: JSON.stringify(body) });
  const put   = (path, body) => _fetch(path, { method: 'PUT',    body: JSON.stringify(body) });
  const patch = (path, body) => _fetch(path, { method: 'PATCH',  body: JSON.stringify(body) });

  /* ── Auth ── */
  const auth = {
    register:       (body)          => post('/auth/register', body),
    login:          (body)          => post('/auth/login',    body),
    logout:         ()              => post('/auth/logout',   {}),
    me:             ()              => get('/auth/me'),
    forgotPassword: (email)         => post('/auth/forgot-password', { email }),
    resetPassword:  (email,otp,pwd) => post('/auth/reset-password',  { email, otp, newPassword: pwd })
  };

  /* ── Patients ── */
  const patients = {
    list:   (params) => get('/patients', params),
    get:    (id)     => get(`/patients/${id}`),
    create: (body)   => post('/patients', body),
    update: (id, b)  => put(`/patients/${id}`, b)
  };

  /* ── Appointments ── */
  const appointments = {
    list:       (params)        => get('/appointments', params),
    queue:      (facility,date) => get('/appointments/queue', { facility, date }),
    get:        (id)            => get(`/appointments/${id}`),
    create:     (body)          => post('/appointments', body),
    setStatus:  (id, body)      => patch(`/appointments/${id}/status`, body),
    reschedule: (id, body)      => patch(`/appointments/${id}/reschedule`, body),
    cancel:     (id, reason)    => _fetchDirect(`/appointments/${id}/cancel`, { method:'PATCH', body: JSON.stringify({ reason }) })
  };

  /* ── Prescriptions ── */
  const prescriptions = {
    list:     (params) => get('/prescriptions', params),
    get:      (id)     => get(`/prescriptions/${id}`),
    create:   (body)   => post('/prescriptions', body),
    dispense: (id)     => post(`/prescriptions/${id}/dispense`, {})
  };

  /* ── Medications ── */
  const medications = {
    list:        (params)      => get('/medications', params),
    create:      (body)        => post('/medications', body),
    updateStock: (id, qty, op) => patch(`/medications/${id}/stock`, { qty, operation: op })
  };

  /* ── Labs ── */
  const labs = {
    list:      (params) => get('/labs', params),
    create:    (body)   => post('/labs', body),
    setStatus: (id, b)  => patch(`/labs/${id}/status`, b)
  };

  /* ── Facilities ── */
  const facilities = {
    list:   (params) => get('/facilities', params),
    create: (body)   => post('/facilities', body),
    update: (id, b)  => patch(`/facilities/${id}`, b)
  };

  /* ── Users ── */
  const users = {
    list:      (params)       => get('/users', params),
    get:       (id)           => get(`/users/${id}`),
    setStatus: (id, isActive) => patch(`/users/${id}/status`, { isActive }),
    updateMe:  (body)         => put('/users/me', body)
  };

  /* ── Analytics ── */
  const analytics = {
    overview:    ()       => get('/analytics/overview'),
    patientFlow: (params) => get('/analytics/patient-flow', params)
  };

  /* ── Session helpers ── */
  function saveSession(data) {
    Tokens.set(data.accessToken, data.refreshToken);
    // Normalise: backend returns 'facility' as ObjectId, pages expect 'facilityId'
    const user = { ...data.user };
    if (user.facility && !user.facilityId) {
      user.facilityId = (typeof user.facility === 'object')
        ? (user.facility._id || String(user.facility))
        : String(user.facility);
    }
    localStorage.setItem('nihms_user', JSON.stringify(user));
  }

  function getStoredUser() {
    const raw = localStorage.getItem('nihms_user');
    return raw ? JSON.parse(raw) : null;
  }

  function clearSession() {
    Tokens.clear();
  }

  /* ── Loading helpers ── */
  function showLoading(containerId, msg = 'Loading…') {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;padding:48px;gap:12px;color:var(--text-muted)">
        <div style="width:20px;height:20px;border:2px solid var(--border-md);border-top-color:var(--green);border-radius:50%;animation:spin .6s linear infinite"></div>
        <span>${msg}</span>
      </div>`;
  }

  function showError(containerId, msg = 'Failed to load data.') {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `
      <div class="alert-box alert-danger" style="margin:0">
        <i class="ti ti-alert-circle"></i>${msg}
      </div>`;
  }

  // Direct fetch — same as _fetch but for custom paths, includes auto-refresh
  async function _fetchDirect(path, options = {}, retry = true) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const token   = Tokens.getAccess();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res  = await fetch(BASE_URL + path, { ...options, headers });

    // Auto-refresh on 401 Token expired
    if (res.status === 401 && retry) {
      try {
        if (!_refreshPromise) _refreshPromise = _silentRefresh();
        await _refreshPromise;
        _refreshPromise = null;
        return _fetchDirect(path, options, false); // retry once
      } catch {
        _refreshPromise = null;
        Tokens.clear();
        window.location.replace('/');
        return;
      }
    }

    const data = await res.json();
    if (!data.success && res.status >= 400) throw new Error(data.message || 'Request failed');
    return data;
  }

  // Patients - extended
  const patientsExt = {
    me: () => _fetchDirect('/patients/me', { method: 'GET' })
  };

  return {
    auth, patients, appointments, prescriptions,
    medications, labs, facilities, users, analytics,
    saveSession, getStoredUser, clearSession,
    showLoading, showError, Tokens, _fetchDirect
  };

})();
