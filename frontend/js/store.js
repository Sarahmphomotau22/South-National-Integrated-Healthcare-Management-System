/**
 * js/store.js
 * ──────────────────────────────────────────────
 * User store — wraps localStorage.
 * In production, replace with real API calls.
 *
 * Keys used:
 *   nihms_users   — registered users (object keyed by email)
 *   nihms_session — current session (sessionStorage)
 * ──────────────────────────────────────────────
 */

const Store = (() => {

  const USERS_KEY   = 'nihms_users';
  const SESSION_KEY = 'nihms_session';

  /** Seed demo accounts (always available, never persisted) */
  const DEMO_USERS = {
    'doctor@nihms.gov.za': {
      first: 'Dr. Sipho', last: 'Molefe',
      role: 'doctor', facility: 'Johannesburg CHC',
      password: 'Demo@1234'
    },
    'patient@nihms.gov.za': {
      first: 'Nomsa', last: 'Dlamini',
      role: 'patient', facility: 'Johannesburg CHC',
      password: 'Demo@1234'
    },
    'pharmacy@nihms.gov.za': {
      first: 'Sandile', last: 'Mahlangu',
      role: 'pharmacy', facility: 'Johannesburg CHC',
      password: 'Demo@1234'
    },
    'admin@nihms.gov.za': {
      first: 'Zanele', last: 'Mokoena',
      role: 'admin', facility: 'National',
      password: 'Demo@1234'
    },
    'nurse@nihms.gov.za': {
      first: 'Ayanda', last: 'Nkosi',
      role: 'nurse', facility: 'Johannesburg CHC',
      password: 'Demo@1234'
    }
  };

  /** Return all users (demo + registered) */
  function getAllUsers() {
    const raw = localStorage.getItem(USERS_KEY);
    const registered = raw ? JSON.parse(raw) : {};
    return { ...DEMO_USERS, ...registered };
  }

  /** Find a single user by email (case-insensitive) */
  function findUser(email) {
    return getAllUsers()[email.toLowerCase()] || null;
  }

  /**
   * Save a new user.
   * Does NOT overwrite demo accounts.
   */
  function saveUser(email, data) {
    const key = email.toLowerCase();
    const raw = localStorage.getItem(USERS_KEY);
    const registered = raw ? JSON.parse(raw) : {};
    registered[key] = data;
    localStorage.setItem(USERS_KEY, JSON.stringify(registered));
  }

  /** Update a field on an existing user */
  function updateUser(email, patch) {
    const key = email.toLowerCase();
    const raw = localStorage.getItem(USERS_KEY);
    const registered = raw ? JSON.parse(raw) : {};
    if (registered[key]) {
      registered[key] = { ...registered[key], ...patch };
      localStorage.setItem(USERS_KEY, JSON.stringify(registered));
    }
  }

  /** Check whether email is already taken */
  function emailExists(email) {
    return !!getAllUsers()[email.toLowerCase()];
  }

  /* ── Session ── */

  function getSession() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function setSession(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  return {
    findUser,
    saveUser,
    updateUser,
    emailExists,
    getSession,
    setSession,
    clearSession
  };

})();
