/* ── NIHMS design-system CSS — injected once, mirrors login.html ── */
(function _nihmsInjectDS() {
  if (document.getElementById('nihms-ds-css')) return;
  var s = document.createElement('style');
  s.id = 'nihms-ds-css';
  s.textContent = [
    /* Reset */
    '*, *::before, *::after { box-sizing: border-box; }',
    '::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:99px}',
    /* Background — subtle green/navy mesh matching login header */
    'body, #app, .page-root { background-color:#f4f5f0 !important; background-image: repeating-linear-gradient(135deg, rgba(15,110,86,.03) 0px, rgba(15,110,86,.03) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(45deg, rgba(26,74,155,.02) 0px, rgba(26,74,155,.02) 1px, transparent 1px, transparent 40px) !important; background-attachment:fixed !important; }',
    /* Override any inline bg that was set to f8fafc/f1f5f9 */
    /* Alert colours — exact login.html values */
    '.nihms-alert-err { background:#FCEBEB !important; color:#A32D2D !important; border-left:3px solid #E24B4A !important; border-radius:10px; padding:10px 14px; font-size:13px; display:flex; align-items:flex-start; gap:8px; }',
    '.nihms-alert-ok  { background:#E1F5EE !important; color:#0F6E56 !important; border-left:3px solid #1D9E75 !important; border-radius:10px; padding:10px 14px; font-size:13px; display:flex; align-items:flex-start; gap:8px; }',
    '.nihms-alert-warn{ background:#FAEEDA !important; color:#854F0B !important; border-left:3px solid #EF9F27 !important; border-radius:10px; padding:10px 14px; font-size:13px; display:flex; align-items:flex-start; gap:8px; }',
    '.nihms-alert-info{ background:#E6F1FB !important; color:#185FA5 !important; border-left:3px solid #378ADD !important; border-radius:10px; padding:10px 14px; font-size:13px; display:flex; align-items:flex-start; gap:8px; }',
    /* Primary button — pill, login-page gradient */
    'button[style*="background:#0F6E56"], button[style*="background: #0F6E56"] { border-radius:50px !important; }',
    /* Input focus ring — login-page green */
    'input:focus, select:focus, textarea:focus { border-color:#0F6E56 !important; box-shadow:0 0 0 3px rgba(15,110,86,.12) !important; outline:none !important; }',
    /* Card borders */
    '.nihms-card { background:#fff; border-radius:14px; border:1px solid #e0e0e0; box-shadow:0 1px 3px rgba(0,0,0,.06); }',
    /* Table header bg */
    'th[style*="background:#eef2f7"], th[style*="background: #eef2f7"] { background:#f4f5f0 !important; color:#777 !important; }',
  ].join('\n');
  document.head.appendChild(s);
})();

/* ── NIHMS shared design tokens (used across receptionist, nurse, doctor, pharmacy) ── */
/* These CSS vars are injected into :root by router.js — receptionist reads them here for consistency */
/* Primary:   #0F6E56 (teal-600)  · Surface: #f4f5f0  · Border: #e0e0e0 */
/* Success:   #16a34a (green-600) · Warning: #d97706  · Danger: #dc2626  */
/* Text dark: #111111             · Text mid: #555555  · Text light: #777777 */
/* Radius-md: 10px                · Radius-lg: 14px    · Shadow: 0 1px 3px #0001 */

/**
 * js/pages/receptionist.js — NIHMS Receptionist
 * Rebuilt from Figma/Make.com Queue Management System design
 *
 * Tabs: overview · checkin · book · queue · appointments · emergency · messaging · analytics
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ─── Constants ────────────────────────────────────────────────────── */
var DEPARTMENTS = [
  { id:'gen',  name:'General Consultation',    color:'#0F6E56', avgWait:18 },
  { id:'tele', name:'Telemedicine',            color:'#3b82f6', avgWait:12 },
  { id:'lab',  name:'Lab / Blood Draw',        color:'#8b5cf6', avgWait:20 },
  { id:'imm',  name:'Immunisation',            color:'#f59e0b', avgWait:10 },
  { id:'mh',   name:'Mental Health',           color:'#ec4899', avgWait:35 },
  { id:'cc',   name:'Chronic Care Follow-up',  color:'#1D9E75', avgWait:25 },
  { id:'mc',   name:'Maternal & Child Health', color:'#f97316', avgWait:22 },
  { id:'pp',   name:'Pharmacy Pickup',         color:'#6366f1', avgWait:8  },
  { id:'sr',   name:'Specialist Referral',     color:'#0ea5e9', avgWait:40 },
  { id:'wp',   name:'Wellness & Preventive',   color:'#22c55e', avgWait:15 },
];

var NIHMS_PATIENTS = [];  /* Live cache — populated from API. No placeholder data. */

/* Helper: normalise a patient record from the API into the NIHMS_PATIENTS shape */
function _normPt(p) {
  if (!p) return null;
  return {
    _id:       p._id || p.id || '',
    id:        p.nationalId || p.idNumber || p.passport || p._id || '',
    nationalId:p.nationalId || p.idNumber || '',
    passport:  p.passport   || p.passportNumber || '',
    firstName: p.firstName  || (p.name||'').split(' ')[0] || '',
    lastName:  p.lastName   || (p.name||'').split(' ').slice(1).join(' ') || '',
    name:      p.firstName ? (p.firstName+' '+(p.lastName||'')).trim() : (p.name||''),
    phone:     p.phone  || p.phoneNumber || '',
    email:     p.email  || '',
    dob:       p.dateOfBirth || p.dob || '',
    gender:    p.gender || '',
    address:   p.address || '',
    allergies: p.allergies || [],
    bloodType: p.bloodType || p.bloodGroup || '',
  };
}

/* Cache a patient locally so repeat lookups don't need another API call */
function _cachePt(p) {
  var norm = _normPt(p);
  if (!norm) return norm;
  var existing = NIHMS_PATIENTS.findIndex(function(x){
    return x.id === norm.id || x._id === norm._id;
  });
  if (existing >= 0) NIHMS_PATIENTS[existing] = norm;
  else
  /* Patient cached via _cachePt after API save */
  return norm;
}

/* Live patient search — queries the API first, falls back to local cache */
async function _apiSearchPatient(id) {
  if (!id) return null;
  var clean = id.trim();
  /* Check local cache first */
  var cached = NIHMS_PATIENTS.find(function(p){
    return p.id === clean || p.nationalId === clean ||
           p.passport === clean || p._id === clean;
  });
  if (cached) return cached;

  /* Query API */
  try {
    var r1 = await API._fetchDirect(
      '/patients?nationalId=' + encodeURIComponent(clean) + '&limit=1',
      { method:'GET' }
    ).catch(function(){ return null; });
    var pt1 = r1 && r1.data && r1.data[0];
    if (pt1) {
      var norm1 = _normPt(pt1);
      if (norm1.nationalId === clean || norm1.passport === clean || norm1._id === clean)
        return _cachePt(pt1);
    }
    /* Try passport field */
    var r2 = await API._fetchDirect(
      '/patients?passport=' + encodeURIComponent(clean) + '&limit=1',
      { method:'GET' }
    ).catch(function(){ return null; });
    var pt2 = r2 && r2.data && r2.data[0];
    if (pt2) {
      var norm2 = _normPt(pt2);
      if (norm2.nationalId === clean || norm2.passport === clean || norm2._id === clean)
        return _cachePt(pt2);
    }
  } catch(_) {}
  return null;
}

var TOKEN_SEQ = { n:14 };
function _genToken(dept) {
  TOKEN_SEQ.n++;
  var abbr = { 'General Consultation':'GC','Telemedicine':'TL','Lab / Blood Draw':'LB',
    'Immunisation':'IM','Mental Health':'MH','Chronic Care Follow-up':'CC',
    'Maternal & Child Health':'MC','Pharmacy Pickup':'PP','Specialist Referral':'SR',
    'Wellness & Preventive':'WP' };
  return (abbr[dept]||'GN') + '-' + String(TOKEN_SEQ.n).padStart(3,'0');
}

function _fmtTime(d) {
  return (d||new Date()).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});
}

/* ─── Cross-tab nurse broadcast ─────────────────────────────────────────
   Pushes a nurse request to the nurse page even when it's in a different
   browser tab. Uses BroadcastChannel (primary) + localStorage event
   (fallback). Same-tab calls go directly via window._nurseAddRequest.
─────────────────────────────────────────────────────────────────────── */
var _nurseBroadcastCh = null;
try { _nurseBroadcastCh = new BroadcastChannel('nihms_nurse_queue'); } catch(_) {}

function _sendToNurseTab(req) {
  /* 1. Same-tab direct call */
  if (typeof window._nurseAddRequest === 'function') {
    window._nurseAddRequest(req);
  } else {
    if (!window._NURSE_REQUESTS) window._NURSE_REQUESTS = [];
    window._NURSE_REQUESTS.push(req);
  }
  /* 2. Persist to localStorage queue so nurse page picks it up even if it
        loads AFTER the check-in (sequential-tab workflow) */
  try {
    var stored = JSON.parse(localStorage.getItem('_NIHMS_NURSE_QUEUE') || '[]');
    /* Deduplicate by id */
    if (!stored.find(function(r){ return r.id === req.id; })) {
      stored.push(req);
      localStorage.setItem('_NIHMS_NURSE_QUEUE', JSON.stringify(stored));
    }
  } catch(_) {}
  /* 3. Cross-tab live event: BroadcastChannel (fires in open nurse tab) */
  if (_nurseBroadcastCh) {
    try { _nurseBroadcastCh.postMessage({ type: 'NURSE_REQ', req: req }); } catch(_) {}
  }
  /* 4. Cross-tab live event: localStorage storage event (fallback) */
  try {
    localStorage.setItem('_NIHMS_NURSE_REQ', JSON.stringify(req));
    setTimeout(function(){ try { localStorage.removeItem('_NIHMS_NURSE_REQ'); } catch(_){} }, 200);
  } catch(_) {}
}
/* ─── Cross-tab telemedicine broadcast ──────────────────────────────────
   Pushes a telemedicine check-in to the doctor page (nihms_doctor_queue).
   Mirrors the same three-path pattern used by _sendToNurseTab.
─────────────────────────────────────────────────────────────────────── */
var _teleBroadcastCh = null;
try { _teleBroadcastCh = new BroadcastChannel('nihms_doctor_queue'); } catch(_) {}

function _sendToTeleTab(req) {
  /* 1. Same-tab direct call */
  if (typeof window._doctorAddTeleRequest === 'function') {
    window._doctorAddTeleRequest(req);
  } else {
    if (!window._DOCTOR_TELE_REQUESTS) window._DOCTOR_TELE_REQUESTS = [];
    window._DOCTOR_TELE_REQUESTS.push(req);
  }
  /* 2. Persist to localStorage queue */
  try {
    var stored = JSON.parse(localStorage.getItem('_NIHMS_DOCTOR_QUEUE') || '[]');
    if (!stored.find(function(r){ return r.id === req.id; })) {
      stored.push(req);
      localStorage.setItem('_NIHMS_DOCTOR_QUEUE', JSON.stringify(stored));
    }
  } catch(_) {}
  /* 3. BroadcastChannel live event — use DOCTOR_PT shape that doctor.js expects */
  if (_teleBroadcastCh) {
    try { _teleBroadcastCh.postMessage({ type: 'DOCTOR_PT', doc: req }); } catch(_) {}
  }
  /* 4. localStorage storage event fallback */
  try {
    localStorage.setItem('_NIHMS_DOCTOR_REQ', JSON.stringify(req));
    setTimeout(function(){ try { localStorage.removeItem('_NIHMS_DOCTOR_REQ'); } catch(_){} }, 200);
  } catch(_) {}
}

/* ─── Cross-tab lab broadcast ───────────────────────────────────────────
   Pushes a lab check-in to the lab worker page (nihms_lab_queue).
─────────────────────────────────────────────────────────────────────── */
var _labBroadcastCh = null;
try { _labBroadcastCh = new BroadcastChannel('nihms_lab_queue'); } catch(_) {}

function _sendToLabTab(req) {
  if (typeof window._labAddRequest === 'function') {
    window._labAddRequest(req);
  } else {
    if (!window._LAB_REQUESTS) window._LAB_REQUESTS = [];
    window._LAB_REQUESTS.push(req);
  }
  try {
    var stored = JSON.parse(localStorage.getItem('_NIHMS_LAB_QUEUE') || '[]');
    if (!stored.find(function(r){ return r.id === req.id; })) {
      stored.push(req);
      localStorage.setItem('_NIHMS_LAB_QUEUE', JSON.stringify(stored));
    }
  } catch(_) {}
  if (_labBroadcastCh) {
    try { _labBroadcastCh.postMessage({ type: 'LAB_REQ', req: req }); } catch(_) {}
  }
  try {
    localStorage.setItem('_NIHMS_LAB_REQ', JSON.stringify(req));
    setTimeout(function(){ try { localStorage.removeItem('_NIHMS_LAB_REQ'); } catch(_){} }, 200);
  } catch(_) {}
}

/* ─── Cross-tab pharmacy broadcast ─────────────────────────────────────
   Pushes a pharmacy check-in to the pharmacy page (nihms_pharmacy_queue).
─────────────────────────────────────────────────────────────────────── */
var _pharmBroadcastCh = null;
try { _pharmBroadcastCh = new BroadcastChannel('nihms_pharmacy_queue'); } catch(_) {}

function _sendToPharmacyTab(req) {
  if (typeof window._pharmacyAddRequest === 'function') {
    window._pharmacyAddRequest(req);
  } else {
    if (!window._PHARMACY_REQUESTS) window._PHARMACY_REQUESTS = [];
    window._PHARMACY_REQUESTS.push(req);
  }
  try {
    var stored = JSON.parse(localStorage.getItem('_NIHMS_PHARMACY_QUEUE') || '[]');
    if (!stored.find(function(r){ return r.id === req.id; })) {
      stored.push(req);
      localStorage.setItem('_NIHMS_PHARMACY_QUEUE', JSON.stringify(stored));
    }
  } catch(_) {}
  if (_pharmBroadcastCh) {
    try { _pharmBroadcastCh.postMessage({ type: 'PHARM_REQ', req: req }); } catch(_) {}
  }
  try {
    localStorage.setItem('_NIHMS_PHARMACY_REQ', JSON.stringify(req));
    setTimeout(function(){ try { localStorage.removeItem('_NIHMS_PHARMACY_REQ'); } catch(_){} }, 200);
  } catch(_) {}
}

/* ─── visitType → display department name ───────────────────────────────
   Converts patient.js visitType slugs to the canonical department names
   used throughout the receptionist queue and displayed on tokens.
─────────────────────────────────────────────────────────────────────── */
function _visitTypeToDept(vt) {
  if (!vt) return '';
  var v = vt.toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ');
  if (v.includes('tele'))            return 'Telemedicine';
  if (v.includes('lab') || v.includes('blood'))
                                     return 'Lab / Blood Draw';
  if (v.includes('immuni') || v.includes('vaccin'))
                                     return 'Immunisation';
  if (v.includes('chronic') || v.includes('follow'))
                                     return 'Chronic Care Follow-Up';
  if (v.includes('matern') || v.includes('child') || v.includes('paed'))
                                     return 'Maternity and Child';
  if (v.includes('pharmacy') || v.includes('pickup'))
                                     return 'Pharmacy Pickup';
  if (v.includes('wellness') || v.includes('prevent'))
                                     return 'Wellness and Preventive';
  if (v.includes('general') || v.includes('consult'))
                                     return 'General Consultation';
  /* Return title-cased version of whatever the slug says */
  return vt.replace(/_/g,' ').replace(/-/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});
}

/* ─── Queue routing helper ──────────────────────────────────────────────
   Returns the destination label and dispatches the check-in request to
   the correct departmental queue based on the visit department string.

   Routing rules (per spec):
     Telemedicine               → Doctor telemedicine queue
     Lab / Blood Draw           → Lab worker queue
     Pharmacy Pickup            → Pharmacy queue
     Immunisation               → Nurse queue  (handled separately above)
     Everything else            → Nurse queue
─────────────────────────────────────────────────────────────────────── */
function _routeCheckinToDept(req, dept) {
  var d = (dept || '').toLowerCase();
  if (d.includes('tele')) {
    req.notes = req.notes.replace(/directed to nurses station for vitals\./i,
      'directed to Doctor Telemedicine Queue.');
    req.isTelemed = true;
    _sendToTeleTab(req);
    return 'Telemedicine Doctor Queue';
  }
  if (d.includes('lab') || d.includes('blood')) {
    req.notes = req.notes.replace(/directed to nurses station for vitals\./i,
      'directed to Laboratory Queue.');
    _sendToLabTab(req);
    return 'Laboratory Queue';
  }
  if (d.includes('pharmacy') || d.includes('pharmac')) {
    req.notes = req.notes.replace(/directed to nurses station for vitals\./i,
      'directed to Pharmacy Queue.');
    _sendToPharmacyTab(req);
    return 'Pharmacy Queue';
  }
  /* Default: nurse queue (General Consultation, Chronic Care, Maternity,
     Immunisation, Wellness, etc.) */
  _sendToNurseTab(req);
  return 'Nurses Station';
}

function _fmtDate(d) {
  return (d||new Date()).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'});
}

/* ─── Shared slot constants (mirrors patient.js) ────────────────────── */
var _REC_ALL_SLOTS_WEEKDAY = [
  '07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30'
];
var _REC_ALL_SLOTS_SAT = [
  '07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00'
];

/* Returns the full slot list for a date (all slots, not filtered for past).
   Returns [] for Sunday (closed). */
function _recGetAllSlots(dateStr) {
  if (!dateStr) return [];
  var d = new Date(dateStr + 'T00:00:00');
  var day = d.getDay();
  if (day === 0) return [];
  return (day === 6 ? _REC_ALL_SLOTS_SAT : _REC_ALL_SLOTS_WEEKDAY).slice();
}

/* Fetches booked HH:MM strings for a date from the API (SAST-aware).
   Returns a Set of booked time strings. */
async function _recFetchBookedSlots(facilityId, dateStr) {
  /* Resolve facility ID from multiple sources if not passed */
  var fid = facilityId || _R.facilityId || '';
  if (!fid) {
    fid = (window._NIHMS_FACILITY && window._NIHMS_FACILITY.id) || '';
  }
  if (!fid) {
    var _u = window.API && window.API.getStoredUser && window.API.getStoredUser();
    var _uFid = _u && (_u.facilityId || _u.facility);
    if (_uFid && typeof _uFid === 'object') _uFid = _uFid._id || _uFid.id || '';
    fid = (typeof _uFid === 'string' && _uFid.length > 5 ? _uFid : '') || '';
  }
  if (!fid || !dateStr) return new Set();
  try {
    var fromISO = dateStr + 'T00:00:00.000+02:00';
    var toISO   = dateStr + 'T23:59:59.999+02:00';
    var res = await API._fetchDirect(
      '/appointments?facility=' + fid +
      '&from=' + encodeURIComponent(fromISO) +
      '&to='   + encodeURIComponent(toISO)   +
      '&limit=200',
      { method: 'GET' }
    );
    var booked = new Set();
    var items = (res && (res.data || res)) || [];
    if (!Array.isArray(items)) items = [];
    items
      .filter(function(a) { return !['cancelled','no_show','canceled'].includes(a.status); })
      .forEach(function(a) {
        var raw = a.scheduledAt || a.appointmentDate || a.date || '';
        if (!raw) return;
        var dtObj = new Date(raw);
        if (isNaN(dtObj.getTime())) return;
        var hh = String(dtObj.getHours()).padStart(2, '0');
        var mm = String(dtObj.getMinutes()).padStart(2, '0');
        booked.add(hh + ':' + mm);
      });
    return booked;
  } catch (_) {
    return new Set();
  }
}

/* Renders a slot grid HTML string. Shows ALL slots for the date:
   - past slots: disabled + strikethrough + grey
   - booked slots: disabled + strikethrough + grey
   - selected slot: green border/bg/bold
   - available: white with hover affordance
   dataAttr: 'data-slot' or 'data-bkslot' (for event delegation) */
function _recRenderSlotGrid(dateStr, allSlots, bookedSet, selectedSlot, gridId, dataAttr) {
  if (!dateStr) {
    return '<div style="padding:14px;background:#f4f5f0;border-radius:8px;text-align:center;color:#777777;font-size:13px">Select a date to see available slots</div>';
  }
  if (new Date(dateStr + 'T00:00:00').getDay() === 0) {
    return '<div style="padding:14px;background:#fef2f2;border-radius:8px;text-align:center;color:#dc2626;font-size:13px;font-weight:600">⛔ Clinic is closed on Sundays</div>';
  }
  if (!allSlots || allSlots.length === 0) {
    return '<div style="padding:14px;background:#fef2f2;border-radius:8px;text-align:center;color:#dc2626;font-size:13px">No slots available for this day.</div>';
  }

  var todayStr = new Date().toISOString().slice(0, 10);
  var now = new Date();
  var nowMinutes = now.getHours() * 60 + now.getMinutes();

  var buttons = allSlots.map(function(t) {
    var parts = t.split(':');
    var slotMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    var isPast = dateStr === todayStr && slotMinutes < nowMinutes + 30;
    var isBooked = bookedSet && bookedSet.has(t);
    var isSel = selectedSlot === t;
    var disabled = isPast || isBooked;

    if (disabled) {
      return '<button ' + dataAttr + '="' + t + '" disabled ' +
        'style="padding:12px 8px;border-radius:8px;font-family:inherit;font-size:14px;' +
        'border:1.5px solid #e0e0e0;background:#f4f5f0;color:#bbbbbb;font-weight:400;' +
        'cursor:not-allowed;text-decoration:line-through" ' +
        'title="' + (isBooked ? 'Already booked' : 'Time has passed') + '">' + t + '</button>';
    }
    return '<button ' + dataAttr + '="' + t + '" ' +
      'style="padding:12px 8px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:14px;' +
      'border:1.5px solid ' + (isSel ? '#0F6E56' : '#e0e0e0') + ';' +
      'background:' + (isSel ? '#f0fdfa' : '#fff') + ';' +
      'color:' + (isSel ? '#0F6E56' : '#111111') + ';' +
      'font-weight:' + (isSel ? '700' : '500') + '">' + t + '</button>';
  }).join('');

  return '<div id="' + gridId + '" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">' + buttons + '</div>';
}

/* ─── State ─────────────────────────────────────────────────────────── */
var _R = {
  tab: 'overview',
  queue: [],
  appointments: [],   /* loaded from API on page open */
  messages: [],       /* loaded from API on page open */
  /* checkin state */
  ci: { step:'search', id:'', patient:null, appt:null, dept:'General Consultation', result:null, selectedDate:'', selectedSlot:null, bookedSlots:{} },
  /* book state */
  bk: { step:'search', id:'', patient:null, regForm:{}, slot:null, slotIdx:null, result:null, selectedDate:'', selectedSlot:null, bookedSlots:{} },
  /* queue filters */
  qDept:'all', qStatus:'all',
  /* calendar */
  calView:'week', calDate: new Date(), calDept:'all',
  /* emergency */
  emId:'', emName:'', emDesc:'', emDept:'General Consultation',
  /* messaging */
  msgTo:'', msgBody:'',
  /* analytics */
  // no extra state needed
};

/* ─── Helpers ────────────────────────────────────────────────────────── */
function _svgIcon(name) {
  var icons = {
    back:     '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>',
    check:    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    checkW:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    users:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    cal:      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    heart:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    done:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    plus:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    clock:    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    alert:    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    bolt:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    msg:      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    chart:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    queue:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    checkin:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
  };
  return icons[name]||'';
}

function _priCfg(p) {
  var m = { urgent:{label:'Urgent',color:'#dc2626',bg:'#fef2f2',border:'#fca5a5'}, elderly:{label:'Elderly',color:'#d97706',bg:'#fffbeb',border:'#fcd34d'}, normal:{label:'Normal',color:'#777777',bg:'#f4f5f0',border:'#e0e0e0'} };
  return m[p]||m.normal;
}
function _stCfg(s) {
  var m = { waiting:{label:'Waiting',color:'#b45309',bg:'#fffbeb',border:'#fcd34d'}, 'at-nurse':{label:'At Nurse',color:'#7c3aed',bg:'#f5f3ff',border:'#c4b5fd'}, 'with-doctor':{label:'With Doctor',color:'#0F6E56',bg:'#f0fdfa',border:'#99f6e4'}, done:{label:'Done',color:'#16a34a',bg:'#f0fdf4',border:'#86efac'}, 'no-show':{label:'No-show',color:'#9ca3af',bg:'#f9fafb',border:'#e5e7eb'} };
  return m[s]||m.waiting;
}

function _badge(text, cfg) {
  return '<span style="display:inline-flex;align-items:center;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:'+cfg.bg+';color:'+cfg.color+';border:1px solid '+cfg.border+'">'+text+'</span>';
}

function _inp(id, label, placeholder, value, type, required) {
  return '<div><label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#555555;margin-bottom:5px">'+label+(required?' *':'')+'</label>'+
    '<input id="'+id+'" type="'+(type||'text')+'" value="'+(value||'')+'" placeholder="'+(placeholder||'')+'" '+
    'style="width:100%;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box" '+
    'onfocus="this.style.borderColor=\'#0F6E56\'" onblur="this.style.borderColor=\'#e0e0e0\'">'+
  '</div>';
}

function _sel(id, label, opts, val) {
  return '<div><label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#555555;margin-bottom:5px">'+label+'</label>'+
    '<select id="'+id+'" style="width:100%;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;background:#fff">'+
    opts.map(function(o){ return '<option value="'+(o.v||o)+'"'+(((o.v||o)===(val||opts[0].v||opts[0]))||((o.label||o)===val)?' selected':'')+'>'+( o.label||o)+'</option>'; }).join('')+
    '</select></div>';
}

function _pBtn(label, onclick, color) {
  color=color||'#0F6E56';
  return '<button onclick="'+onclick+'" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 20px;border-radius:50px;border:none;background:'+color+';color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">'+label+'</button>';
}
function _sBtn(label, onclick) {
  return '<button onclick="'+onclick+'" style="display:inline-flex;align-items:center;gap:5px;padding:9px 16px;border-radius:50px;border:1.5px solid #e0e0e0;background:#fff;color:#555555;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">'+label+'</button>';
}
function _tBtn(label, onclick) {
  return '<button onclick="'+onclick+'" style="display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:7px;border:1.5px solid #e0e0e0;background:#fff;color:#555555;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">'+label+'</button>';
}

function _card(content, pad) {
  return '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;padding:'+(pad||'18px 20px')+'">'+content+'</div>';
}

function _stepBar(steps, current, color) {
  color=color||'#0F6E56';
  var idx=steps.indexOf(current);
  return '<div style="display:flex;align-items:center;gap:0;margin-bottom:24px">'+
    steps.map(function(s,i){
      var done=i<idx,active=i===idx;
      return '<div style="display:flex;align-items:center;flex:1">'+
        '<div style="display:flex;flex-direction:column;align-items:center;flex:1">'+
          '<div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;margin-bottom:4px;background:'+(done?color:active?color:'#f0f1ec')+';color:'+(done||active?'#fff':'#777777')+'">'+
            (done?_svgIcon('checkW'):(i+1))+
          '</div>'+
          '<div style="font-size:10px;font-weight:600;text-align:center;color:'+(active?color:done?color+'99':'#777777')+'">'+s+'</div>'+
        '</div>'+
        (i<steps.length-1?'<div style="height:2px;flex:1;margin-bottom:18px;border-radius:2px;background:'+(i<idx?color:'#e0e0e0')+'"></div>':'');
    }).join('')+
  '</div>';
}

/* ─── Tab render engine ──────────────────────────────────────────────── */
/* ── Persist/restore _R state via localStorage ── */
function _rSaveState() {
  try {
    localStorage.setItem('nihms_r_state', JSON.stringify({
      queue:          _R.queue          || [],
      recentPatients: _R.recentPatients || [],
      appointments:   _R.appointments  || [],
      tokenSeq:       TOKEN_SEQ.n,
    }));
  } catch(_) {}
}
function _rLoadState() {
  try {
    var snap = JSON.parse(localStorage.getItem('nihms_r_state') || 'null');
    if (!snap) return;
    if (snap.queue          && snap.queue.length)          _R.queue          = snap.queue;
    if (snap.recentPatients && snap.recentPatients.length) _R.recentPatients = snap.recentPatients;
    if (snap.appointments   && snap.appointments.length)   _R.appointments   = snap.appointments;
    if (snap.tokenSeq       && snap.tokenSeq > TOKEN_SEQ.n) TOKEN_SEQ.n      = snap.tokenSeq;
  } catch(_) {}
}
function _rRec() {
  _rSaveState();
  var styleEl=document.getElementById('nihms-style');
  if(!styleEl){styleEl=document.createElement('style');styleEl.id='nihms-style';
  styleEl.textContent='*{box-sizing:border-box}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#d0d0d0;border-radius:99px}body{font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif}';
  document.head.appendChild(styleEl);}
  var el=document.getElementById('rec-body');
  if(!el) return;
  /* Render persistent top bar on every page */
  var topBar = document.getElementById('rec-top-bar');
  if (topBar) topBar.innerHTML = _rTopBar();
  var fns={overview:_rOverview,checkin:_rCheckin,book:_rBook,register:_rRegisterNew,'patient-file':_rPatientFile,appointments:_rAppointments,'apt-edit':_rAptEditPage,emergency:_rEmergency,messaging:_rMessaging,analytics:_rAnalytics};
  el.innerHTML=(fns[_R.tab]||_rOverview)();
  _rBind();
}

function _rTopBar() {
  var now     = new Date();
  var timeStr = now.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  var dateStr = now.toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  /* Restart clock after render */
  clearInterval(window._recClockTimer);
  window._recClockTimer = setInterval(function(){
    var el = document.getElementById('rec-clock');
    if (!el){ clearInterval(window._recClockTimer); return; }
    el.textContent = new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }, 1000);
  return '<div style="display:flex;align-items:center;justify-content:space-between;' +
    'background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);' +
    'border-radius:14px;padding:14px 22px;margin-bottom:12px;box-shadow:0 2px 10px rgba(13,148,136,.2)">' +
    '<div>' +
      '<div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-.01em;margin-bottom:2px">'+dateStr+'</div>' +
      '<div style="font-size:13px;color:rgba(255,255,255,.75);display:flex;align-items:center;gap:5px">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' +
        'Reception Desk &nbsp;·&nbsp; Johannesburg CHC' +
      '</div>' +
    '</div>' +
    '<div id="rec-clock" style="font-size:36px;font-weight:900;font-family:monospace;color:#fff;letter-spacing:.04em">'+timeStr+'</div>' +
  '</div>';
}

function _rTab(t){ _R.tab=t; _rRec(); }

/* ═══════════════════════════════════════════════════════════════════════
   SHELL
═══════════════════════════════════════════════════════════════════════ */
Pages['receptionist'] = function() {
  _R.tab='overview';
  /* Load real data from backend on page open */
  _rLoadState();  /* Restore queue/patients/appointments on refresh */
  setTimeout(async function(){
    try {
      /* 0. Resolve facility ID from stored user — required for slot availability checks */
      if (!_R.facilityId) {
        var _initUser = window.API && window.API.getStoredUser && window.API.getStoredUser();
        var _initFid  = _initUser && (_initUser.facilityId || _initUser.facility);
        /* If facility is an object, extract its _id */
        if (_initFid && typeof _initFid === 'object') _initFid = _initFid._id || _initFid.id || '';
        if (_initFid && typeof _initFid === 'string' && _initFid.length > 5) {
          _R.facilityId   = _initFid;
          _R.facilityName = (_initUser.facilityName || _initUser.facility_name || '');
        }
      }

      /* 1. Appointments — include all statuses so patient-booked (pending) appointments show */
      var aRes = await API._fetchDirect('/appointments?limit=500&sort=-scheduledAt',{method:'GET'}).catch(function(){return null;});
      if (aRes && aRes.data && aRes.data.length) {
        /* Extract facility ID from first appointment if not yet resolved */
        if (!_R.facilityId) {
          var _firstApt = aRes.data[0];
          var _fRaw = _firstApt && (_firstApt.facility || _firstApt.facilityId);
          if (_fRaw) {
            if (typeof _fRaw === 'object') { _R.facilityId = _fRaw._id || _fRaw.id || ''; _R.facilityName = _fRaw.name || ''; }
            else if (typeof _fRaw === 'string' && _fRaw.length > 5) { _R.facilityId = _fRaw; }
          }
        }
        var backendIds = aRes.data.map(function(a){ return a._id||a.id; });
        var localOnly  = _R.appointments.filter(function(a){ return !backendIds.includes(a._id||a.id); });
        _R.appointments = aRes.data.map(function(a){
          /* Extract date & time from scheduledAt when separate fields are absent */
          var rawDt   = a.scheduledAt || a.date || a.appointmentDate || '';
          var dateVal = rawDt.slice(0,10);
          var timeVal = a.time || a.appointmentTime || '';
          if (!timeVal && rawDt.length > 10) {
            /* scheduledAt is stored in UTC; convert to local (SAST = UTC+2) */
            var dtObj = new Date(rawDt);
            if (!isNaN(dtObj.getTime())) {
              timeVal = dtObj.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit',hour12:false});
            }
          }
          return {
            id:        a._id||a.id,
            _id:       a._id,
            ref:       a.appointmentNumber||a.ref||('APT-'+String(a._id).slice(-5)),
            patientId: a.patient?._id||a.patientId||'',
            name:      a.patient ? ((a.patient.firstName||'')+' '+(a.patient.lastName||'')).trim() : (a.name||'—'),
            dept:      a.department||a.dept||_visitTypeToDept(a.visitType)||'General Consultation',
            visitType: a.visitType||'',
            clinician: a.doctor ? 'Dr '+(a.doctor.firstName||'')+' '+(a.doctor.lastName||'').trim() : (a.clinician||''),
            date:      dateVal,
            time:      timeVal,
            type:      a.type||'booked',
            verified:  a.status==='confirmed'||a.verified||false,
            status:    a.status==='cancelled'?'cancelled':'active',
            rawStatus: a.status||'',
            phone:     a.patient?.phone||a.phone||'',
            email:     a.patient?.email||a.email||'',
          };
        }).concat(localOnly);
      }

      /* 2. Live queue (today's checked-in patients) */
      var qRes = await API._fetchDirect('/queue/today',{method:'GET'}).catch(function(){return null;});
      if (qRes && qRes.data && qRes.data.length) {
        _R.queue = qRes.data.map(function(q){
          return {
            id:          q._id||q.id,
            patientId:   q.patient?._id||q.patientId||q._id,
            name:        q.patient ? (q.patient.firstName||'')+' '+(q.patient.lastName||'').trim() : (q.name||'Unknown'),
            dept:        q.department||q.dept||'General',
            token:       q.token||'—',
            status:      q.status==='checked-in'?'waiting':q.status||'waiting',
            type:        q.type||'booked',
            checkedInAt: q.checkedInAt||new Date().toISOString(),
            phone:       q.patient?.phone||q.phone||'',
          };
        });
      }

      /* 3. Messages */
      var mRes = await API._fetchDirect('/messages?role=receptionist&limit=50',{method:'GET'}).catch(function(){return null;});
      if (mRes && mRes.data && mRes.data.length) {
        _R.messages = mRes.data.map(function(m){
          return {
            id:   m._id||m.id,
            from: m.senderName||m.from||'System',
            to:   m.recipientRole||'Reception',
            text: m.body||m.text||m.message||'',
            time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}) : '—',
            read: !!m.read,
          };
        });
      }

      /* 4. Recent patients (last 10 registered) */
      var ptRes = await API._fetchDirect('/patients?limit=10&sort=-createdAt',{method:'GET'}).catch(function(){return null;});
      if (ptRes && ptRes.data && ptRes.data.length) {
        _R.recentPatients = ptRes.data.map(function(p){ return _normPt(p); });
        /* Also seed the local cache */
        _R.recentPatients.forEach(function(p){ _cachePt(p); });
      }

    } catch(e) {
      console.warn('NIHMS receptionist: API load error', e);
    }
    _R.loadingData = false;
    _rRec();
  }, 200);
  setTimeout(_rRec, 80);

  var topNav = '';

  return '<div style="display:flex;flex-direction:column;height:calc(100vh - 120px);overflow:hidden">'+
    '<div id="rec-top-bar" style="flex-shrink:0;padding:12px 20px 0"></div>'+
    '<div id="rec-body" style="flex:1;overflow:auto;background:#f4f5f0">Loading…</div>'+
  '</div>';
};

/* ═══════════════════════════════════════════════════════════════════════
   TAB 1 — OVERVIEW
═══════════════════════════════════════════════════════════════════════ */
function _rOverview() {
  var todayStr=(new Date()).toISOString().slice(0,10);
  var q=_R.queue.filter(function(p){
    /* today-only: checkedInAt on today, or no checkedInAt (just arrived) */
    return !p.checkedInAt || p.checkedInAt.slice(0,10)===todayStr;
  });
  var waiting=q.filter(function(p){return p.status==='waiting';});
  var atNurse=q.filter(function(p){return p.status==='at-nurse';});
  var done=q.filter(function(p){return p.status==='done';});
  var aptsToday=_R.appointments.filter(function(a){
    return (a.date||a.appointmentDate||'').slice(0,10)===todayStr && a.status!=='cancelled';
  });
  var unreadMsg=_R.messages.filter(function(m){return !m.read;}).length;

  /* Live date/time header */
  var now=new Date();
  var timeStr=now.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  var dateStr=now.toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  var timeHeader=
    '<div style="display:flex;align-items:center;justify-content:space-between;' +
    'background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);' +
    'border-radius:14px;padding:18px 26px;margin-bottom:20px;box-shadow:0 2px 12px rgba(13,148,136,.2)">' +
      '<div>' +
        '<div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-.01em;margin-bottom:3px">'+dateStr+'</div>' +
        '<div style="font-size:14px;color:rgba(255,255,255,.75);font-weight:500;display:flex;align-items:center;gap:6px">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' +
          'Reception Desk &nbsp;·&nbsp; Johannesburg CHC' +
        '</div>' +
      '</div>' +
      '<div style="text-align:right">' +
        '<div id="rec-clock" style="font-size:42px;font-weight:900;font-family:monospace;color:#fff;letter-spacing:.04em;line-height:1">'+timeStr+'</div>' +
        '<div style="font-size:11px;color:rgba(255,255,255,.6);margin-top:3px;text-transform:uppercase;letter-spacing:.08em">Local time</div>' +
      '</div>' +
    '</div>';

  /* Start live clock ticker */
  clearInterval(window._recClockTimer);
  window._recClockTimer=setInterval(function(){
    var el=document.getElementById('rec-clock');
    if(!el){clearInterval(window._recClockTimer);return;}
    el.textContent=new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  },1000);

  var kpis=[
    {label:'Total Patients Today', value:q.length,               sub:waiting.length+' waiting',   color:'#0F6E56', icon:_svgIcon('users')},
    {label:'Appointments Today',   value:aptsToday.length, sub:aptsToday.filter(function(a){return a.verified;}).length+' verified', color:'#3b82f6', icon:_svgIcon('cal')},
    {label:'At Nurses Station',    value:atNurse.length,          sub:'taking vitals',              color:'#7c3aed', icon:_svgIcon('heart')},
    {label:'Completed Today',      value:done.length,             sub:'discharged',                 color:'#10b981', icon:_svgIcon('done')},
  ];

  var kpiHtml='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">'+
    kpis.map(function(k){
      return _card(
        '<div style="display:flex;align-items:center;gap:14px">'+
          '<div style="width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:'+k.color+'">'+k.icon+'</div>'+
          '<div><div style="font-size:26px;font-weight:800;color:#111111;line-height:1">'+k.value+'</div>'+
          '<div style="font-size:11px;color:#777777;margin-top:1px">'+k.label+'</div>'+
          '<div style="font-size:11px;font-weight:600;margin-top:2px;color:'+k.color+'">'+k.sub+'</div></div>'+
        '</div>');
    }).join('')+
  '</div>';

  var actions=[
    {label:'Patient Check-in',   sub:'ID scan → issue queue token',        tab:'checkin',     color:'#0F6E56', icon:_svgIcon('checkin')},
    {label:'Book Appointment',   sub:'Search patient → pick slot',          tab:'book',        color:'#3b82f6', icon:_svgIcon('cal')},
    {label:'Register New Patient',sub:'Add patient profile to NIHMS',       tab:'register',    color:'#8b5cf6', icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>'},

    {label:'Appointments',       sub:'Day · Week · Month · Year calendar',  tab:'appointments',color:'#f59e0b', icon:_svgIcon('cal')},
    {label:'Emergency Intake',   sub:'Fast-track critical patients',        tab:'emergency',   color:'#ef4444', icon:_svgIcon('bolt')},
    {label:'Messaging',          sub:(unreadMsg?unreadMsg+' unread · ':'')+'Send alerts', tab:'messaging',   color:'#8b5cf6', icon:_svgIcon('msg')},
    {label:'Analytics',          sub:'Wait times · dept performance',       tab:'analytics',   color:'#0ea5e9', icon:_svgIcon('chart')},
    {label:'Patient Files',      sub:'Search · view · edit patient records', tab:'patient-file',color:'#10b981', icon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>'},
  ];

  var actHtml='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">'+
    actions.map(function(a){
      return '<button onclick="_rTab(\''+a.tab+'\')" '+
        'style="display:flex;align-items:center;gap:14px;background:#fff;border:1.5px solid #e0e0e0;border-radius:14px;padding:16px;cursor:pointer;text-align:left;font-family:inherit;transition:border-color .15s" '+
        'onmouseover="this.style.borderColor=\''+a.color+'\'" onmouseout="this.style.borderColor=\'#e0e0e0\'">'+
        '<div style="width:40px;height:40px;border-radius:10px;background:'+a.color+';display:flex;align-items:center;justify-content:center;flex-shrink:0">'+a.icon+'</div>'+
        '<div><div style="font-size:13px;font-weight:700;color:#111111;margin-bottom:2px">'+a.label+'</div>'+
        '<div style="font-size:11px;color:#777777">'+a.sub+'</div></div>'+
      '</button>';
    }).join('')+
  '</div>';

  /* Live queue snapshot — today's active patients with location */
  var todayStr=(new Date()).toISOString().slice(0,10);
  var activeQ=q.filter(function(p){
    if(p.status==='done') return false;
    if(!p.checkedInAt) return true;
    return p.checkedInAt.slice(0,10)===todayStr;
  });
  var locLabels={waiting:'⏳ Waiting Room','at-nurse':'🏥 At Nurse Station','with-doctor':'🩺 In Consultation',done:'✓ Discharged'};
  var locColors={waiting:'#d97706','at-nurse':'#1A4A9B','with-doctor':'#0F6E56',done:'#16a34a'};
  var liveRows=activeQ.slice(0,8).map(function(p,i){
    var checkin=new Date(p.checkedInAt);
    var wait=isNaN(checkin)?0:Math.floor((new Date()-checkin)/60000);
    var loc=locLabels[p.status]||p.status;
    var locCol=locColors[p.status]||'#777777';
    return '<tr style="background:'+(i%2===0?'#fff':'#f4f5f0')+';border-bottom:1px solid #f0f1ec">'+
      '<td style="padding:9px 14px;font-family:monospace;font-weight:700;font-size:13px;color:#0F6E56">'+p.token+'</td>'+
      '<td style="padding:9px 14px;font-weight:600;font-size:13px">'+p.name+'</td>'+
      '<td style="padding:9px 14px;font-size:12px;color:#777777">'+p.department+'</td>'+
      '<td style="padding:9px 14px"><span style="font-size:11px;font-weight:700;color:'+locCol+'">'+loc+'</span></td>'+
      '<td style="padding:9px 14px;font-size:12px;color:'+(wait>20?'#ef4444':'#777777')+';font-weight:'+(wait>20?'700':'400')+'">'+wait+' min</td>'+
    '</tr>';
  }).join('');

  var liveHtml=activeQ.length
    ?'<table style="width:100%;border-collapse:collapse"><thead><tr>'+
      ['Token','Patient','Department','Stage / Location','Wait Today'].map(function(h){return '<th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#777777">'+h+'</th>';}).join('')+
      '</tr></thead><tbody>'+liveRows+'</tbody></table>'
    :'<div style="padding:20px;text-align:center;color:#777777;font-size:13px">No active patients in queue</div>';

  /* Notices */
  var noticesHtml=_R.messages.slice(0,3).map(function(m){
    return '<div style="padding:10px 14px;border-radius:8px;border:1px solid #f0f1ec;background:'+(m.read?'#fff':'#f0fdfa')+'">'+
      '<div style="display:flex;justify-content:space-between;margin-bottom:3px">'+
        '<span style="font-size:12px;font-weight:700;color:#111111">'+m.from+'</span>'+
        '<span style="font-size:11px;color:#777777">'+m.time+'</span>'+
      '</div>'+
      '<div style="font-size:12px;color:#555555">'+m.text+'</div>'+
    '</div>';
  }).join('<div style="height:6px"></div>');

  return '<div style="padding:20px">'+
    kpiHtml+actHtml+
    '<div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">'+
      _card('<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'+
        '<div style="font-size:14px;font-weight:700;color:#111111">Live Queue</div>'+
        '<button onclick="_rTab(\'appointments\')" style="font-size:12px;color:#0F6E56;border:none;background:transparent;cursor:pointer">View all →</button>'+
      '</div>'+liveHtml) +
      _card('<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
        '<div style="font-size:14px;font-weight:700;color:#111111">Notices</div>'+
        '<button onclick="_rTab(\'messaging\')" style="font-size:12px;color:#8b5cf6;border:none;background:transparent;cursor:pointer">Open →</button>'+
      '</div>'+noticesHtml) +
    '</div>'+
  '</div>';
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 2 — PATIENT CHECK-IN
═══════════════════════════════════════════════════════════════════════ */
function _rCheckin() {
  var ci = _R.ci;
  if (!ci) { _R.ci = { step:'search', id:'', patient:null, appt:null, dept:'General Consultation', result:null, notFound:false }; ci = _R.ci; }

  var back = '<button onclick="_rTab(\'overview\')" style="display:flex;align-items:center;gap:6px;font-size:13px;color:#555555;border:none;background:transparent;cursor:pointer;font-family:inherit;margin-bottom:28px">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>' +
    'Back to Overview</button>';



  /* ══════════════════ SUCCESS SCREEN ══════════════════ */
  if (ci.step === 'done' && ci.result) {
    var r = ci.result;
    /* Build live queue rows for this patient's token */
    var qEntry = _R.queue.find(function(q){ return q.token === r.token; });
    var qStatus = qEntry ? (qEntry.status || 'waiting') : 'waiting';
    var statusColors = { waiting:'#d97706', 'at-nurse':'#1A4A9B', 'with-doctor':'#0F6E56', done:'#16a34a' };
    var statusLabels = { waiting:'Waiting', 'at-nurse':'At Nurse', 'with-doctor':'With Doctor', done:'Done' };
    var statusCol   = statusColors[qStatus] || '#777777';
    var statusLabel = statusLabels[qStatus] || qStatus;

    return '<div style="padding:32px 40px;max-width:700px;margin:0 auto;width:100%;display:flex;flex-direction:column;gap:20px">' +

        /* ── Confirmation card ── */
        '<div style="background:#fff;border-radius:16px;border:1px solid #e0e0e0;overflow:hidden">' +
          '<div style="background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);padding:28px;text-align:center">' +
            '<div style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;margin:0 auto 12px">' +
              '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' +
            '</div>' +
            '<div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:4px">Check-In Complete</div>' +
            '<div style="font-size:14px;color:rgba(255,255,255,.8)">' + r.name + ' has been added to the queue.</div>' +
          '</div>' +
          '<div style="padding:24px">' +
            '<div style="text-align:center;margin-bottom:20px">' +
              '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#777777;margin-bottom:8px">Queue Token</div>' +
              '<div style="font-size:64px;font-weight:900;font-family:monospace;color:#0F6E56;line-height:1">' + r.token + '</div>' +
              '<div style="font-size:14px;color:#777777;margin-top:6px">' + r.dept + '</div>' +
            '</div>' +
            '<div style="background:#f4f5f0;border-radius:10px;padding:14px 16px;margin-bottom:20px">' +
              '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">' +
                '<span style="color:#777777">Patient</span><strong>' + r.name + '</strong>' +
              '</div>' +
              '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">' +
                '<span style="color:#777777">Department</span><strong>' + r.dept + '</strong>' +
              '</div>' +
              '<div style="display:flex;justify-content:space-between;font-size:13px">' +
                '<span style="color:#777777">Checked in at</span><strong>' + _fmtTime() + '</strong>' +
              '</div>' +
            '</div>' +
            '<button onclick="(function(){var b=document.getElementById(\'ci-dup-banner\');if(b)b.remove();_R.tab=\'checkin\';_R.ci={step:\'search\',id:\'\',patient:null,appt:null,dept:\'General Consultation\',result:null,notFound:false};_rRec();setTimeout(function(){var el=document.getElementById(\'ci-id\');if(el){el.value=\'\';el.focus();}},120);})()" ' +
              'style="width:100%;padding:13px;border-radius:10px;border:1.5px solid #0F6E56;background:#fff;color:#0F6E56;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">' +
              'Check In Another Patient' +
            '</button>' +
          '</div>' +
        '</div>' +

        /* ── Patient Journey card ── */
        '<div style="background:#fff;border-radius:16px;border:1px solid #e0e0e0;overflow:hidden">' +
          '<div style="padding:14px 18px;border-bottom:1px solid #f0f1ec;display:flex;align-items:center;justify-content:space-between">' +
            '<span style="font-size:13px;font-weight:700;color:#111111">Patient Journey</span>' +
            '<span style="font-size:11px;padding:3px 10px;border-radius:20px;font-weight:700;background:' + statusCol + '22;color:' + statusCol + '">' + statusLabel + '</span>' +
          '</div>' +
          /* Journey progress bar */
          '<div style="padding:16px 18px 10px">' +
            '<div style="display:flex;align-items:center;gap:0;margin-bottom:18px">' +
              (function(){
                var steps=[{k:'waiting',l:'Waiting Room'},{k:'at-nurse',l:'Nurse Station'},{k:'with-doctor',l:'Consultation'},{k:'done',l:'Discharged'}];
                var curIdx=steps.findIndex(function(s){return s.k===qStatus;});
                return steps.map(function(s,i){
                  var active=i<=curIdx;
                  var isCur=i===curIdx;
                  return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;position:relative">' +
                    (i>0?'<div style="position:absolute;top:12px;right:50%;width:100%;height:2px;background:'+(active?'#0F6E56':'#e0e0e0')+'"></div>':'')+
                    '<div style="width:24px;height:24px;border-radius:50%;background:'+(isCur?'#0F6E56':active?'#1A4A9B':'#e0e0e0')+';display:flex;align-items:center;justify-content:center;z-index:1;flex-shrink:0">' +
                      (active?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>':'') +
                    '</div>' +
                    '<div style="font-size:10px;font-weight:'+(isCur?'700':'400')+';color:'+(isCur?'#0F6E56':active?'#1A4A9B':'#aaaaaa')+';margin-top:5px;text-align:center">' + s.l + '</div>' +
                  '</div>';
                }).join('');
              })()+
            '</div>' +
            /* Patient row + redirect control */
            '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#f4f5f0;border-radius:10px">' +
              '<div style="width:40px;height:40px;border-radius:50%;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0">' +
                r.name.split(' ').map(function(w){return w[0]||'';}).join('').slice(0,2).toUpperCase() +
              '</div>' +
              '<div style="flex:1">' +
                '<div style="font-weight:700;font-size:14px;color:#111111">' + r.name + '</div>' +
                '<div style="font-size:12px;color:#777777;margin-top:1px">' + r.token + ' · ' + r.dept + '</div>' +
              '</div>' +
              (qStatus === 'done'
                ? '<span style="font-size:12px;color:#16a34a;font-weight:700">✓ Discharged</span>'
                : '<div style="display:flex;align-items:center;gap:8px">' +
                    '<select id="ci-redirect-sel" style="padding:8px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;background:#fff">' +
                      '<option value="">— Redirect to —</option>' +
                      (qStatus==='waiting'?'<option value="at-nurse">🏥 Nurse Station</option>':'')+
                      (qStatus!=='with-doctor'&&qStatus!=='done'?'<option value="with-doctor">🩺 Consultation Room</option>':'')+
                      (qStatus!=='done'?'<option value="done">✓ Discharge</option>':'')+
                    '</select>' +
                    '<button onclick="var s=document.getElementById(\'ci-redirect-sel\').value;if(s)_rQueueAdvance(\''+r.token+'\',s)" ' +
                      'style="padding:8px 16px;border-radius:8px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Go</button>' +
                  '</div>'
              ) +
            '</div>' +
          '</div>' +
        '</div>' +

      '</div>';
  }

  /* ══════════════════ STEP 1: SEARCH ══════════════════ */
  if (ci.step === 'search') {
    return '<div style="padding:28px 32px">' + back +
      '<div style="display:grid;grid-template-columns:1fr 300px;gap:24px;align-items:start">' +
        '<div>' +
          '<div style="margin-bottom:24px">' +
            '<div style="font-size:24px;font-weight:800;color:#111111;margin-bottom:6px">Patient Check-in</div>' +
            '<div style="font-size:15px;color:#777777">Search by SA ID or passport to find the patient profile.</div>' +
          '</div>' +
          '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;padding:22px">' +
            '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#555555;margin-bottom:10px">SA ID / PASSPORT NUMBER *</div>' +
            '<div style="display:flex;gap:10px;margin-bottom:' + (ci.notFound ? '14px' : '0') + '">' +
              '<input id="ci-id" type="text" value="' + (ci.id || '') + '" placeholder="" ' +
              'style="flex:1;padding:12px 16px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:15px;font-family:inherit;outline:none;color:#111111" ' +
              'onfocus="this.style.borderColor=\'#0F6E56\'" onblur="this.style.borderColor=\'#e0e0e0\'">' +
              '<button onclick="window._rCheckinSearch&&window._rCheckinSearch()" style="display:flex;align-items:center;gap:8px;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;flex-shrink:0">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                'Search' +
              '</button>' +
            '</div>' +
            (ci.notFound
              ? '<div style="padding:16px 18px;background:linear-gradient(135deg,rgba(15,110,86,.06) 0%,rgba(26,74,155,.06) 100%);border:1.5px solid rgba(15,110,86,.2);border-radius:12px;margin-top:14px">' +
                  '<div style="font-size:13px;font-weight:700;color:#0f2942;margin-bottom:5px">Patient Profile Not Found</div>' +
                  '<div style="font-size:13px;color:#444444;margin-bottom:14px;line-height:1.6">No profile exists for ID <strong style="color:#0f2942">' + ci.id + '</strong> in NIHMS. A patient profile must be created before an appointment can be booked or a check-in issued.</div>' +
                  '<button onclick="_R.tab=\'register\';_rRec()" ' +
                    'style="display:inline-flex;align-items:center;gap:7px;padding:10px 22px;border-radius:50px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(15,110,86,.25)">+ Create Patient Profile</button>' +
                '</div>'
              : '') +
          '</div>' +
        '</div>' +
        _ciSidePanel() +
      '</div>' +
    '</div>';
  }

  /* ══════════════════ STEP 2: REGISTER ══════════════════ */
  if (ci.step === 'register') {
    return '<div style="padding:28px 32px">' + back +
      '<div style="display:grid;grid-template-columns:1fr 300px;gap:24px;align-items:start">' +
        '<div>' +
          '<div style="margin-bottom:24px">' +
            '<div style="font-size:28px;font-weight:800;color:#0f2942;margin-bottom:6px">Patient Registration</div>' +
            '<div style="font-size:15px;color:#777777">Complete the patient profile then proceed to book the appointment.</div>' +
          '</div>' +
          '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;padding:22px">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;color:#0F6E56">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>' +
              '<span style="font-size:13px;font-weight:700">Register new patient</span>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
              _frmInp('ci-reg-fn','FIRST NAME *','e.g. Nomvula') +
              _frmInp('ci-reg-ln','LAST NAME *','Dlamini') +
              _frmInp('ci-reg-id','SA ID / PASSPORT *', '', 'text', ci.id || '') +
              _frmInp('ci-reg-dob','DATE OF BIRTH','','date') +
              _frmSel('ci-reg-gen','GENDER',[{v:'',label:'— Select —'},{v:'Female',label:'Female'},{v:'Male',label:'Male'},{v:'Other',label:'Other'}]) +
              _frmSel('ci-reg-blood','BLOOD TYPE',[{v:'',label:'— Unknown —'},{v:'A+',label:'A+'},{v:'A-',label:'A-'},{v:'B+',label:'B+'},{v:'B-',label:'B-'},{v:'AB+',label:'AB+'},{v:'AB-',label:'AB-'},{v:'O+',label:'O+'},{v:'O-',label:'O-'}]) +
              _frmInp('ci-reg-ph','PHONE NUMBER *','+27820000000','tel') +
              _frmInp('ci-reg-em','EMAIL','patient@email.com','email') +
            '</div>' +
            '<div style="margin-top:14px">' + _frmInp('ci-reg-addr','ADDRESS','Street address, suburb, city') + '</div>' +
          '<div style="margin-top:16px;background:#fff;border-radius:12px;border:1px solid #e0e0e0;padding:16px">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
              '<span style="font-size:12px;font-weight:700;color:#111111">📄 ID Document</span>' +
              '<span style="font-size:11px;color:#777777">(optional — JPG/PNG/PDF, max 5MB)</span>' +
            '</div>' +
            '<div id="nr-id-drop" onclick="document.getElementById(\'nr-id-file\').click()" ' +
                 'ondragover="event.preventDefault();this.style.borderColor=\'#0F6E56\'" ' +
                 'ondragleave="this.style.borderColor=\'#e0e0e0\'" ' +
                 'ondrop="_rIdFileDrop(event)" ' +
                 'style="border:2px dashed #e0e0e0;border-radius:10px;padding:16px;text-align:center;cursor:pointer;background:#f9fafb">' +
              '<div>📄 Click to upload or drag & drop</div>' +
              '<div style="font-size:11px;color:#777777">JPG · PNG · PDF · Max 5 MB</div>' +
              '<input id="nr-id-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" ' +
                     'style="display:none" onchange="_rIdFileSelect(this)">' +
            '</div>' +
            '<div id="nr-id-preview" style="display:none;margin-top:8px"></div>' +
          '</div>' +
          '</div>' +
          '<div style="display:flex;gap:10px;margin-top:14px">' +
            '<button onclick="_rCiRegister()" style="flex:1;padding:14px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>' +
              'Register' +
            '</button>' +
            '<button onclick="_R.ci.step=\'search\';_rRec()" style="padding:14px 24px;border-radius:10px;border:1.5px solid #e0e0e0;background:#fff;color:#555555;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Back</button>' +
          '</div>' +
        '</div>' +
        _ciSidePanel() +
      '</div>' +
    '</div>';
  }

  /* ══════════════════ STEP 3: BOOK SLOT ══════════════════ */
  if (ci.step === 'verify' || ci.step === 'slot') {
    var pt      = ci.patient || {};
    var initials = (((pt.firstName||'?')[0])+((pt.lastName||'?')[0])).toUpperCase();
    var selSlot  = ci.selectedSlot || null;
    var selDate  = ci.selectedDate || '';

    /* ── Build slot grid using shared availability logic ─────────────── */
    var _ciAllSlots   = _recGetAllSlots(selDate);
    var _ciBookedSet  = ((ci.bookedSlots || {})[selDate]) || new Set();
    var slotGrid      = _recRenderSlotGrid(selDate, _ciAllSlots, _ciBookedSet, selSlot, 'ci-slot-grid', 'data-slot');
    var availSlots    = _ciAllSlots; /* kept for hint text below */

    /* Min date = today */
    var todayIso = new Date().toISOString().slice(0,10);
    var dateChosen = !!selDate;
    var isSunday   = selDate && new Date(selDate+'T00:00:00').getDay()===0;
    var isSaturday = selDate && new Date(selDate+'T00:00:00').getDay()===6;

    var hintText = selDate
      ? (isSaturday ? 'Saturday · Clinic 07:00–13:00' : isSunday ? 'Closed — please choose another day' : 'Weekday · Clinic 07:00–17:00')
      : 'Mon–Fri 07:00–17:00 · Sat 07:00–13:00 · Sun closed';

    var slotHtml =
      '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;padding:22px">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">' +
          _frmSel('ci-slot-dept','DEPARTMENT *', DEPARTMENTS.map(function(d){return {v:d.name,label:d.name};}), ci.dept||'General Consultation') +
          '<div>' +
            '<label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#555555;margin-bottom:6px">DATE *</label>' +
            '<input id="ci-slot-date" type="date" min="' + todayIso + '" value="' + selDate + '" ' +
            'onchange="_ciDateChange(this.value)" ' +
            'style="width:100%;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;color:#111111">' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#555555">AVAILABLE TIME SLOTS *</div>' +
          '<div style="font-size:11px;color:#777777">' + hintText + '</div>' +
        '</div>' +
        slotGrid +
        (!selSlot && dateChosen && !isSunday && availSlots.length > 0
          ? '<div id="ci-slot-error" style="font-size:12px;color:#ef4444;margin-top:8px">Please select a time slot</div>'
          : '') +
      '</div>';

    /* ── Case A: appointment found ── */
    var apptBanner = '';
    if (ci.appt) {
      /* Pre-fill date and slot from existing appointment */
      if (!ci.selectedDate && ci.appt.date) {
        ci.selectedDate = ci.appt.date.slice(0,10);
        selDate = ci.selectedDate;
        availSlots = _recGetAllSlots(selDate);
      }
      if (!ci.selectedSlot && ci.appt.time) {
        ci.selectedSlot = ci.appt.time;
        selSlot = ci.selectedSlot;
      }
      if (ci.appt.dept) ci.dept = ci.appt.dept; /* always use appointment's actual dept */

      apptBanner =
        '<div style="display:flex;align-items:start;gap:12px;padding:14px 16px;' +
        'background:#E1F5EE;border:1px solid #86efac;border-left:4px solid #1D9E75;border-radius:12px;margin-bottom:16px">' +
          '<div style="font-size:20px;margin-top:2px">📋</div>' +
          '<div style="flex:1">' +
            '<div style="font-size:13px;font-weight:700;color:#14532d;margin-bottom:4px">✓ Appointment Found — Case A</div>' +
            '<div style="font-size:12px;color:#166534;line-height:1.7">' +
              '<strong>Ref:</strong> ' + (ci.appt.ref || ci.appt.id || '—') + '&nbsp;&nbsp;' +
              '<strong>Dept:</strong> ' + (ci.appt.dept || '—') + '&nbsp;&nbsp;' +
              '<strong>Date:</strong> ' + (ci.appt.date || '—') + '&nbsp;&nbsp;' +
              '<strong>Time:</strong> ' + (ci.appt.time || '—') + '&nbsp;&nbsp;' +
              '<strong>Type:</strong> ' + (ci.appt.type || 'booked') +
            '</div>' +
            '<div style="font-size:11px;color:#16a34a;margin-top:4px">Slot and date pre-filled from appointment — confirm below to issue token.</div>' +
          '</div>' +
        '</div>';

    /* ── Case B: profile found but no appointment ── */
    } else {
      apptBanner =
        '<div style="background:linear-gradient(135deg,rgba(15,110,86,.06) 0%,rgba(26,74,155,.06) 100%);border:1.5px solid rgba(15,110,86,.2);border-radius:12px;padding:16px 18px;margin-bottom:16px">' +
          '<div style="font-size:13px;font-weight:700;color:#0f2942;margin-bottom:5px">' +
            'No appointment found for <span style="color:#0F6E56">' + (pt.firstName||'') + ' ' + (pt.lastName||'') + '</span>' +
          '</div>' +
          '<div style="font-size:13px;color:#444444;margin-bottom:14px;line-height:1.6">You can book a new appointment now.</div>' +
          '<button onclick="_rCiBkNow()" style="display:inline-flex;align-items:center;gap:7px;padding:10px 22px;border-radius:50px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(15,110,86,.25)">+ Book Appointment Now</button>' +
        '</div>';
    }

    /* Rebuild slotGrid with latest selDate/selSlot (may have been pre-filled from appt) */
    if (selDate) {
      availSlots = _recGetAllSlots(selDate);
      if (availSlots.length) {
        slotGrid = '<div id="ci-slot-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">' +
          availSlots.map(function(t) {
            var isSel = selSlot === t;
            return '<button data-slot="' + t + '" ' +
              'style="padding:12px 8px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:14px;' +
              'border:1.5px solid ' + (isSel?'#0F6E56':'#e0e0e0') + ';' +
              'background:' + (isSel?'#f0fdfa':'#fff') + ';' +
              'color:' + (isSel?'#0F6E56':'#111111') + ';' +
              'font-weight:' + (isSel?'700':'500') + '" ' +
              'onclick="_ciSlotPick(\'' + t + '\')">' + t + '</button>';
          }).join('') + '</div>';
      }
    }

    /* ── Case A: Figma-style Prepare for Check-In screen ── */
    if (ci.appt && !ci.caseB) {
      var apptDate = ci.appt.date ? new Date(ci.appt.date).toLocaleDateString('en-ZA',{year:'numeric',month:'long',day:'numeric'}) : (ci.appt.date || '—');
      var apptTime = ci.appt.time || '—';
      var apptDept = (ci.appt.dept || ci.dept || '—').replace(/\s*-?\s*Case\s*[AB]\s*/gi,'').trim();
      return '<div style="padding:28px 32px">' + back + '<div style="display:flex;align-items:center;justify-content:center;padding:0">' +
        '<div style="width:100%;max-width:520px">' +
          /* Heading */
          '<div style="text-align:center;margin-bottom:32px">' +
            '<h1 style="font-size:28px;font-weight:800;color:#0f2942;margin:0 0 10px;font-family:inherit">Prepare for Check-In</h1>' +
            '<p style="font-size:15px;color:#4a6580;margin:0">Confirm the appointment for <strong>' + (pt.firstName||'') + ' ' + (pt.lastName||'') + '</strong> before check-in.</p>' +
          '</div>' +
          /* Patient + appointment card */
          '<div style="background:#fff;border-radius:20px;border:1px solid #dde8ef;box-shadow:0 4px 24px rgba(0,60,100,.07);padding:24px 28px;margin-bottom:24px">' +
            /* Patient row */
            '<div style="display:flex;align-items:center;gap:16px;padding-bottom:20px;border-bottom:1px solid #edf2f6;margin-bottom:20px">' +
              '<div style="width:56px;height:56px;border-radius:50%;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex-shrink:0">' + initials + '</div>' +
              '<div>' +
                '<div style="font-size:20px;font-weight:800;color:#0f2942">' + (pt.firstName||'') + ' ' + (pt.lastName||'') + '</div>' +
                '<div style="font-size:14px;color:#777777;margin-top:3px">' + (pt.phone||pt.id||'') + '</div>' +
              '</div>' +
            '</div>' +
            /* Appointment details */
            '<div style="display:flex;flex-direction:column;gap:16px">' +
              '<div style="display:flex;align-items:center;gap:14px">' +
                '<div style="width:32px;height:32px;border-radius:8px;background:#f0f9f8;display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
                  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
                '</div>' +
                '<span style="font-size:15px;color:#1e3a4f">Appointment Date: <strong>' + apptDate + '</strong></span>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:14px">' +
                '<div style="width:32px;height:32px;border-radius:8px;background:#f0f9f8;display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
                  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/></svg>' +
                '</div>' +
                '<span style="font-size:15px;color:#1e3a4f">Time: <strong>' + apptTime + '</strong></span>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:14px">' +
                '<div style="width:32px;height:32px;border-radius:8px;background:#f0f9f8;display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
                  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.3.3 0 1 0 .2.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>' +
                '</div>' +
                '<span style="font-size:15px;color:#1e3a4f">Department: <strong>' + apptDept + '</strong></span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          /* Check In button card */
          '<div style="background:#fff;border-radius:20px;border:1px solid #dde8ef;box-shadow:0 4px 24px rgba(0,60,100,.07);overflow:hidden">' +
            '<div style="padding:24px">' +
              '<button onclick="_rCheckinIssue()" style="width:100%;padding:18px;border-radius:50px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:17px;font-weight:800;cursor:pointer;font-family:inherit;letter-spacing:.01em;box-shadow:0 4px 14px rgba(15,110,86,.25)">' +
                'Check In Patient' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div></div></div>';
    }

    /* ── Case B / slot picker fallback ── */
    return '<div style="padding:28px 32px">' + back +
      '<div style="display:grid;grid-template-columns:1fr 300px;gap:24px;align-items:start">' +
        '<div>' +
          '<div style="margin-bottom:24px">' +
            '<div style="font-size:24px;font-weight:800;color:#111111;margin-bottom:6px">Patient Check-In</div>' +
            '<div style="font-size:15px;color:#777777">Search by SA ID or passport to find the patient profile.</div>' +
          '</div>' +
          apptBanner +
          '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:#f0fdfa;border-radius:12px;border:1px solid #99f6e4;margin-bottom:16px">' +
            '<div style="width:38px;height:38px;border-radius:50%;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0">' + initials + '</div>' +
            '<div style="flex:1"><div style="font-weight:700;font-size:14px;color:#111111">' + (pt.firstName||'') + ' ' + (pt.lastName||'') + '</div><div style="font-size:12px;color:#777777">' + (pt.phone||pt.id||'') + '</div></div>' +
            '<button onclick="_R.ci.step=\'search\';_R.ci.patient=null;_rRec()" style="font-size:13px;color:#0F6E56;border:none;background:transparent;cursor:pointer;font-family:inherit;text-decoration:underline">Change</button>' +
          '</div>' +
          (ci.appt ? slotHtml : '') +
        '</div>' +
        _ciSidePanel() +
      '</div>' +
    '</div>';
  }

  /* fallback */
  _R.ci = { step:'search', id:'', patient:null, appt:null, dept:'General Consultation', result:null, notFound:false };
  return _rCheckin();
}

/* Slot selection — updates state + re-highlights without full re-render */
/* Bind slot grid clicks via event delegation after render */
function _bindSlotGrid() {
  var grid = document.getElementById('ci-slot-grid');
  if (!grid || grid._bound) return;
  grid._bound = true;
  grid.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-slot]');
    if (!btn) return;
    var t = btn.getAttribute('data-slot');
    _R.ci.selectedSlot = t;
    /* Update styles on all slot buttons */
    grid.querySelectorAll('[data-slot]').forEach(function(b) {
      var sel = b.getAttribute('data-slot') === t;
      b.style.border     = '1.5px solid ' + (sel ? '#0F6E56' : '#e0e0e0');
      b.style.background = sel ? '#f0fdfa' : '#fff';
      b.style.color      = sel ? '#0F6E56' : '#111111';
      b.style.fontWeight = sel ? '700' : '500';
    });
    /* Hide validation error */
    var errEl = document.querySelector('#ci-slot-error');
    if (errEl) errEl.style.display = 'none';
  });
}
/* Slot picker — called by inline onclick in slot grid */
window._ciSlotPick = function(t) {
  _R.ci.selectedSlot = t;
  /* Update slot button styles without full re-render */
  var grid = document.getElementById('ci-slot-grid');
  if (grid) {
    grid.querySelectorAll('[data-slot]').forEach(function(b) {
      var sel = b.getAttribute('data-slot') === t;
      b.style.border     = '1.5px solid ' + (sel ? '#0F6E56' : '#e0e0e0');
      b.style.background = sel ? '#f0fdfa' : '#fff';
      b.style.color      = sel ? '#0F6E56' : '#111111';
      b.style.fontWeight = sel ? '700' : '500';
    });
    var errEl = document.querySelector('#ci-slot-error');
    if (errEl) errEl.style.display = 'none';
  } else {
    _rRec();
  }
};

/* Keep _ciSelectSlot for compatibility */
window._ciSelectSlot = function(t) {
  _R.ci.selectedSlot = t;
  _rRec();
};

/* Date change — save date + re-render slot grid only */
window._ciDateChange = async function(dateStr) {
  _R.ci.selectedDate = dateStr;
  _R.ci.selectedSlot = null; /* Reset slot when date changes */
  _rRec();
  /* Fetch real booked slots from API so grid reflects live availability */
  var _u0 = window.API && window.API.getStoredUser && window.API.getStoredUser();
  var fid = _R.facilityId || (window._NIHMS_FACILITY && window._NIHMS_FACILITY.id) || (_u0 && (_u0.facilityId || _u0.facility)) || '';
  var booked = await _recFetchBookedSlots(fid, dateStr);
  _R.ci.bookedSlots = _R.ci.bookedSlots || {};
  _R.ci.bookedSlots[dateStr] = booked;
  _rRec();
};

/* Side panel helper for checkin */
function _ciSidePanel() {
  var recentQ = _R.queue.slice(-4).reverse();
  return '<div style="display:flex;flex-direction:column;gap:14px">' +
    '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;overflow:hidden">' +
      '<div style="padding:12px 16px;border-bottom:1px solid #f0f1ec;font-size:13px;font-weight:700;color:#111111">Dept. Queue Status</div>' +
      DEPARTMENTS.slice(0,8).map(function(d) {
        var qd = _R.queue.filter(function(q){return q.department===d.name&&q.status!=='done';}).length;
        return '<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid #f4f5f0">' +
          '<span style="width:7px;height:7px;border-radius:50%;background:' + d.color + ';flex-shrink:0"></span>' +
          '<span style="flex:1;font-size:12px;color:#555555;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + d.name + '</span>' +
          '<span style="font-size:12px;font-weight:700;color:' + (qd > 4 ? '#ef4444' : '#0F6E56') + ';margin-right:4px">' + qd + '</span>' +
          '<span style="font-size:11px;color:#d0d0d0">~' + d.avgWait + 'm</span>' +
        '</div>';
      }).join('') +
    '</div>' +
    (recentQ.length ? '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;overflow:hidden">' +
      '<div style="padding:12px 16px;border-bottom:1px solid #f0f1ec;font-size:13px;font-weight:700;color:#111111">Recent Check-ins</div>' +
      recentQ.map(function(p) {
        return '<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid #f4f5f0">' +
          '<span style="font-family:monospace;font-size:12px;font-weight:700;color:#0F6E56;min-width:52px">' + p.token + '</span>' +
          '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + p.name + '</div>' +
          '<div style="font-size:10px;color:#777777">' + p.department + '</div></div>' +
        '</div>';
      }).join('') +
    '</div>' : '') +
  '</div>';
}

/* Form input/select helpers for checkin */
function _frmInp(id, label, placeholder, type, value) {
  return '<div id="' + id + '-wrap">' +
    '<label id="' + id + '-lbl" style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#555555;margin-bottom:6px">' + label + '</label>' +
    '<input id="' + id + '" type="' + (type || 'text') + '" placeholder="' + (placeholder || '') + '" value="' + (value || '') + '" ' +
    'style="width:100%;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;color:#111111;transition:border-color .15s" ' +
    'oninput="_frmClearErr(\'' + id + '\')" onfocus="_frmClearErr(\'' + id + '\')">' +
    '<div id="' + id + '-err" style="display:none;font-size:11px;color:#dc2626;margin-top:4px;font-weight:600"></div>' +
    '</div>';
}

/* SA ID / Passport field — extends _frmInp to also call _rIdAutofill on input */
function _frmInpId() {
  return '<div id="nr-id-wrap">' +
    '<label id="nr-id-lbl" style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#555555;margin-bottom:6px">SA ID / PASSPORT *</label>' +
    '<input id="nr-id" type="text" placeholder="" value="" ' +
    'style="width:100%;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;color:#111111;transition:border-color .15s" ' +
    'oninput="_frmClearErr(\'nr-id\');_rIdAutofill()">' +
    '<div id="nr-id-err" style="display:none;font-size:11px;color:#dc2626;margin-top:4px;font-weight:600"></div>' +
    '</div>';
}

function _frmSel(id, label, opts, val) {
  return '<div id="' + id + '-wrap">' +
    '<label id="' + id + '-lbl" style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#555555;margin-bottom:6px">' + label + '</label>' +
    '<select id="' + id + '" onchange="_frmClearErr(\'' + id + '\')" style="width:100%;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;background:#fff;color:#111111;transition:border-color .15s">' +
    opts.map(function(o){ return '<option value="' + o.v + '"' + (o.v===(val||'')?'  selected':'') + '>' + o.label + '</option>'; }).join('') +
    '</select>' +
    '<div id="' + id + '-err" style="display:none;font-size:11px;color:#dc2626;margin-top:4px;font-weight:600"></div>' +
    '</div>';
}

/* Auto-fill Date of Birth from SA ID number (first 6 digits = YYMMDD) */
function _rIdAutofill() {
  var idEl  = document.getElementById('nr-id');
  var dobEl = document.getElementById('nr-dob');
  if (!idEl || !dobEl) return;
  var val = idEl.value.replace(/\s/g, '');
  /* Only act when we have exactly 13 digits (SA ID) */
  if (!/^\d{13}$/.test(val)) return;
  var yy = parseInt(val.slice(0, 2), 10);
  var mm = parseInt(val.slice(2, 4), 10);
  var dd = parseInt(val.slice(4, 6), 10);
  /* Sanity check month/day */
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return;
  /* Resolve century: if YY > current 2-digit year, born in 1900s, else 2000s */
  var curYY = new Date().getFullYear() % 100;
  var yyyy  = yy > curYY ? 1900 + yy : 2000 + yy;
  /* Format as YYYY-MM-DD for the date input */
  var dobStr = yyyy + '-' + String(mm).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
  /* Only set if the field is currently empty or was previously auto-filled */
  if (!dobEl.dataset.manuallySet || dobEl.dataset.autoFilled === 'true') {
    dobEl.value = dobStr;
    dobEl.dataset.autoFilled = 'true';
    _frmClearErr('nr-dob');
  }
}

/* Mark a field as invalid — red border + inline error message */
function _frmErr(id, msg) {
  var el  = document.getElementById(id);
  var err = document.getElementById(id + '-err');
  var lbl = document.getElementById(id + '-lbl');
  if (el)  { el.style.borderColor = '#dc2626'; el.focus(); }
  if (err) { err.textContent = msg || 'This field is required'; err.style.display = 'block'; }
  if (lbl) { lbl.style.color = '#dc2626'; }
}

/* Clear error state when user starts typing / selects */
function _frmClearErr(id) {
  var el  = document.getElementById(id);
  var err = document.getElementById(id + '-err');
  var lbl = document.getElementById(id + '-lbl');
  if (el)  { el.style.borderColor = '#0F6E56'; }
  if (err) { err.style.display = 'none'; }
  if (lbl) { lbl.style.color = '#555555'; }
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 3 — BOOK APPOINTMENT
═══════════════════════════════════════════════════════════════════════ */
function _rBook() {
  var bk = _R.bk;
  if (!bk) { _R.bk = { step:'search', id:'', patient:null, slot:null, slotIdx:null, result:null, notFound:false, selectedSlot:null, selectedDate:'', dept:'General Consultation' }; bk = _R.bk; }

  var back = '<button onclick="_rTab(\'overview\')" style="display:flex;align-items:center;gap:6px;font-size:13px;color:#555555;border:none;background:transparent;cursor:pointer;font-family:inherit;margin-bottom:28px">'+_svgIcon('back')+' Back to Overview</button>';

  /* ══ SUCCESS ══ */
  if (bk.step === 'done' && bk.result) {
    var r = bk.result;
    return '<div style="padding:28px 32px">' + back +
      '<div style="display:grid;grid-template-columns:1fr 300px;gap:24px;align-items:start">' +
        '<div style="background:#fff;border-radius:16px;border:1px solid #e0e0e0;overflow:hidden">' +
          '<div style="background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);padding:28px;text-align:center">' +
            '<div style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;margin:0 auto 12px">' +
              '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' +
            '</div>' +
            '<div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:4px">Appointment Confirmed</div>' +
            '<div style="font-size:14px;color:rgba(255,255,255,.8)">' + r.name + '</div>' +
          '</div>' +
          '<div style="padding:24px">' +
            '<div style="background:#f4f5f0;border-radius:12px;padding:16px;margin-bottom:16px">' +
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px">' +
                '<div><div style="font-size:10px;color:#777777;margin-bottom:2px">REFERENCE</div><div style="font-weight:700;color:#0F6E56">' + r.ref + '</div></div>' +
                '<div><div style="font-size:10px;color:#777777;margin-bottom:2px">DEPARTMENT</div><div style="font-weight:700">' + r.dept + '</div></div>' +
                '<div><div style="font-size:10px;color:#777777;margin-bottom:2px">DATE</div><div style="font-weight:700">' + r.date + '</div></div>' +
                '<div><div style="font-size:10px;color:#777777;margin-bottom:2px">TIME</div><div style="font-weight:700">' + r.time + '</div></div>' +
              '</div>' +
            '</div>' +
            '<div style="padding:12px 14px;background:#E6F1FB;border-radius:10px;font-size:13px;color:#185FA5;margin-bottom:20px">' +
              '📅 Confirmation sent to patient via SMS' + (r.email ? ' & email' : '') + '.' +
            '</div>' +
            '<div style="display:flex;gap:10px">' +
              '<button onclick="_R.bk={step:\'search\',id:\'\',patient:null,slot:null,slotIdx:null,result:null,notFound:false,selectedSlot:null,selectedDate:\'\',dept:\'General Consultation\'};_rRec()" style="flex:1;padding:13px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Book another appointment</button>' +
              '<button onclick="_rTab(\'appointments\')" style="flex:1;padding:13px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center">View calendar</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        _bkSidePanel() +
      '</div>' +
    '</div>';
  }

  /* ══ STEP 1: SEARCH ══ */
  if (bk.step === 'search') {
    return '<div style="padding:28px 32px">' + back +
      '<div style="display:grid;grid-template-columns:1fr 300px;gap:24px;align-items:start">' +
        '<div>' +
          '<div style="margin-bottom:24px">' +
            '<div style="font-size:24px;font-weight:800;color:#111111;margin-bottom:6px">Book Appointment</div>' +
            '<div style="font-size:15px;color:#777777">Search by SA ID or passport to find the patient profile.</div>' +
          '</div>' +
          '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;padding:22px">' +
            '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#555555;margin-bottom:10px">SA ID / PASSPORT NUMBER *</div>' +
            '<div style="display:flex;gap:10px">' +
              '<input id="bk-id" type="text" value="' + (bk.id||'') + '" placeholder="" ' +
              'style="flex:1;padding:12px 16px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:15px;font-family:inherit;outline:none;color:#111111" ' +
              'onfocus="this.style.borderColor=\'#0F6E56\'" onblur="this.style.borderColor=\'#e0e0e0\'">' +
              '<button onclick="_rBookSearch()" style="display:flex;align-items:center;gap:8px;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;flex-shrink:0">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Search' +
              '</button>' +
            '</div>' +
            (bk.notFound
              ? '<div style="padding:16px 18px;background:linear-gradient(135deg,rgba(15,110,86,.06) 0%,rgba(26,74,155,.06) 100%);border:1.5px solid rgba(15,110,86,.2);border-radius:12px;margin-top:14px">' +
                  '<div style="font-size:13px;font-weight:700;color:#0f2942;margin-bottom:5px">Patient Profile Not Found</div>' +
                  '<div style="font-size:13px;color:#444444;margin-bottom:14px;line-height:1.6">No profile exists for ID <strong style="color:#0f2942">' + bk.id + '</strong> in NIHMS. A patient profile must be created before an appointment can be booked or a check-in issued.</div>' +
                  '<button onclick="_R.bk._fromBook=true;_R.bk._fromBookId=_R.bk.id;_rTab(\'register\')" style="display:inline-flex;align-items:center;gap:7px;padding:10px 22px;border-radius:50px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(15,110,86,.25)">+ Create Patient Profile</button>' +
                '</div>'
              : '') +
          '</div>' +
        '</div>' +
        _bkSidePanel() +
      '</div>' +
    '</div>';
  }

  /* ══ STEP 2: REGISTER ══ */
  if (bk.step === 'register') {
    return '<div style="padding:28px 32px">' + back +
      '<div style="display:grid;grid-template-columns:1fr 300px;gap:24px;align-items:start">' +
        '<div>' +
          '<div style="margin-bottom:24px">' +
            '<div style="font-size:24px;font-weight:800;color:#111111;margin-bottom:6px">Patient Registration</div>' +
            '<div style="font-size:15px;color:#777777">Complete the patient profile then proceed to book the appointment.</div>' +
          '</div>' +
          '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;padding:22px">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;color:#0F6E56">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>' +
              '<span style="font-size:13px;font-weight:700">Register new patient</span>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
              _frmInp('bk-reg-fn','FIRST NAME *','e.g. Nomvula') +
              _frmInp('bk-reg-ln','LAST NAME *','Dlamini') +
              _frmInp('bk-reg-id','SA ID / PASSPORT *','', 'text', bk.id||'') +
              _frmInp('bk-reg-dob','DATE OF BIRTH','','date') +
              _frmSel('bk-reg-gen','GENDER',[{v:'',label:'— Select —'},{v:'Female',label:'Female'},{v:'Male',label:'Male'},{v:'Other',label:'Other'}]) +
              _frmSel('bk-reg-blood','BLOOD TYPE',[{v:'',label:'— Unknown —'},{v:'A+',label:'A+'},{v:'A-',label:'A-'},{v:'B+',label:'B+'},{v:'B-',label:'B-'},{v:'AB+',label:'AB+'},{v:'AB-',label:'AB-'},{v:'O+',label:'O+'},{v:'O-',label:'O-'}]) +
              _frmInp('bk-reg-ph','PHONE NUMBER *','+27820000000','tel') +
              _frmInp('bk-reg-em','EMAIL','patient@email.com','email') +
            '</div>' +
            '<div style="margin-top:14px">' + _frmInp('bk-reg-addr','ADDRESS','Street address, suburb, city') + '</div>' +
          '<div style="margin-top:16px;background:#fff;border-radius:12px;border:1px solid #e0e0e0;padding:16px">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
              '<span style="font-size:12px;font-weight:700;color:#111111">📄 ID Document</span>' +
              '<span style="font-size:11px;color:#777777">(optional — JPG/PNG/PDF, max 5MB)</span>' +
            '</div>' +
            '<div id="nr-id-drop" onclick="document.getElementById(\'nr-id-file\').click()" ' +
                 'ondragover="event.preventDefault();this.style.borderColor=\'#0F6E56\'" ' +
                 'ondragleave="this.style.borderColor=\'#e0e0e0\'" ' +
                 'ondrop="_rIdFileDrop(event)" ' +
                 'style="border:2px dashed #e0e0e0;border-radius:10px;padding:16px;text-align:center;cursor:pointer;background:#f9fafb">' +
              '<div>📄 Click to upload or drag & drop</div>' +
              '<div style="font-size:11px;color:#777777">JPG · PNG · PDF · Max 5 MB</div>' +
              '<input id="nr-id-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" ' +
                     'style="display:none" onchange="_rIdFileSelect(this)">' +
            '</div>' +
            '<div id="nr-id-preview" style="display:none;margin-top:8px"></div>' +
          '</div>' +
          '</div>' +
          '<div style="display:flex;gap:10px;margin-top:14px">' +
            '<button onclick="_rBookRegisterNew()" style="flex:1;padding:14px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>Register' +
            '</button>' +
            '<button onclick="_R.bk.step=\'search\';_rRec()" style="padding:14px 24px;border-radius:10px;border:1.5px solid #e0e0e0;background:#fff;color:#555555;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Back</button>' +
          '</div>' +
        '</div>' +
        _bkSidePanel() +
      '</div>' +
    '</div>';
  }

  /* ══ STEP 2b: PATIENT FOUND ══ */
  if (bk.step === 'found' && bk.patient) {
    var pt0 = bk.patient;
    var initials0 = (((pt0.firstName||pt0.name||'?')[0])+((pt0.lastName||'?')[0])).toUpperCase();
    var fullName0 = (pt0.firstName ? (pt0.firstName+' '+(pt0.lastName||'')).trim() : (pt0.name||''));
    return '<div style="padding:28px 32px">' + back +
      '<div style="max-width:600px">' +
        '<div style="background:#f0f0ec;border-radius:14px;border:1px solid #e0e0e0;padding:22px 24px;margin-bottom:16px">' +
          '<div style="font-size:15px;font-weight:700;color:#111111;margin-bottom:4px">No appointment found for <span style="color:#0F6E56">'+fullName0+'</span></div>' +
          '<div style="font-size:13px;color:#555555;margin-bottom:18px">You can book a new appointment now.</div>' +
          '<button onclick="_R.bk.step=\'slot\';_rRec()" style="display:inline-flex;align-items:center;gap:8px;padding:12px 22px;border-radius:50px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
            '+ Book Appointment Now' +
          '</button>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:#fff;border-radius:14px;border:1.5px solid #99f6e4">' +
          '<div style="width:40px;height:40px;border-radius:50%;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0">'+initials0+'</div>' +
          '<div style="flex:1"><div style="font-size:15px;font-weight:700;color:#111111">'+fullName0+'</div><div style="font-size:13px;color:#555555">'+(pt0.phone||pt0.id||'')+'</div></div>' +
          '<button onclick="_R.bk.step=\'search\';_R.bk.patient=null;_rRec()" style="font-size:13px;color:#0F6E56;border:none;background:transparent;cursor:pointer;font-family:inherit;text-decoration:underline">Change</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ══ STEP 3: BOOK SLOT ══ */
  if (bk.step === 'slot' && bk.patient) {
    var pt = bk.patient;
    var initials = (((pt.firstName||'?')[0])+((pt.lastName||'?')[0])).toUpperCase();
    var selSlot = bk.selectedSlot || null;
    var selDate = bk.selectedDate || '';

    /* ── Build slot grid using shared availability logic ─────────────── */
    var _bkAllSlots  = _recGetAllSlots(selDate);
    var _bkBookedSet = ((bk.bookedSlots || {})[selDate]) || new Set();
    var slotGrid     = _recRenderSlotGrid(selDate, _bkAllSlots, _bkBookedSet, selSlot, 'bk-slot-grid', 'data-bkslot');
    var availSlots   = _bkAllSlots;

    var todayIso = new Date().toISOString().slice(0,10);
    var isSun = selDate && new Date(selDate+'T00:00:00').getDay()===0;
    var isSat = selDate && new Date(selDate+'T00:00:00').getDay()===6;
    var hintText = selDate ? (isSat?'Saturday · 07:00–13:00':isSun?'Closed':'Weekday · 07:00–17:00') : 'Mon–Fri 07:00–17:00 · Sat 07:00–13:00 · Sun closed';

    return '<div style="padding:28px 32px">' + back +
      '<div style="display:grid;grid-template-columns:1fr 300px;gap:24px;align-items:start">' +
        '<div>' +
          '<div style="margin-bottom:24px">' +
            '<div style="font-size:24px;font-weight:800;color:#111111;margin-bottom:6px">Book & Schedule</div>' +
            '<div style="font-size:15px;color:#777777">Select a department, date and slot for <strong>'+(pt.firstName||'')+' '+(pt.lastName||'')+'</strong>.</div>' +
          '</div>' +

          /* Patient pill */
          '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:#f0fdfa;border-radius:12px;border:1px solid #99f6e4;margin-bottom:16px">' +
            '<div style="width:38px;height:38px;border-radius:50%;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0">'+initials+'</div>' +
            '<div style="flex:1"><div style="font-weight:700;font-size:14px;color:#111111">'+(pt.firstName||'')+' '+(pt.lastName||'')+'</div><div style="font-size:12px;color:#777777">'+(pt.phone||pt.id||'')+'</div></div>' +
            '<button onclick="_R.bk.step=\'search\';_R.bk.patient=null;_rRec()" style="font-size:13px;color:#0F6E56;border:none;background:transparent;cursor:pointer;font-family:inherit;text-decoration:underline">Change</button>' +
          '</div>' +

          '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;padding:22px">' +
            /* Date + visit type (dept merged in) */
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">' +
              '<div><label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#555555;margin-bottom:6px">DATE *</label>' +
                '<input id="bk-slot-date" type="date" min="'+todayIso+'" value="'+selDate+'" onchange="_bkDateChange(this.value)" style="width:100%;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;color:#111111"></div>' +
              _frmSel('bk-visit-type','VISIT TYPE / DEPARTMENT', DEPARTMENTS.map(function(d){return {v:d.name,label:d.name};}), bk.dept||'General Consultation') +
            '</div>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
              '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#555555">AVAILABLE TIME SLOTS *</div>' +
              '<div style="font-size:11px;color:#777777">'+hintText+'</div>' +
            '</div>' +
            slotGrid +
            (!selSlot && selDate && !isSun && availSlots.length>0
              ? '<div id="bk-slot-error" style="font-size:12px;color:#ef4444;margin-top:8px">Please select a time slot</div>'
              : '') +
          '</div>' +
        '</div>' +
        _bkSidePanel() +
      '</div>' +
      '<div style="padding:16px 0 0;margin-top:20px">' +
        '<button onclick="_rBookConfirm()" style="width:100%;padding:16px;border-radius:50px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 4px 14px rgba(15,110,86,.25)">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' +
          'Confirm Appointment' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  /* fallback */
  _R.bk = { step:'search', id:'', patient:null, slot:null, slotIdx:null, result:null, notFound:false, selectedSlot:null, selectedDate:'', dept:'General Consultation' };
  return _rBook();
}

/* Book side panel — upcoming appointments */
function _bkSidePanel() {
  var today = new Date().toISOString().slice(0,10);
  var upcoming = _R.appointments
    .filter(function(a){ return a.status!=='cancelled' && (a.date||'').slice(0,10) >= today; })
    .sort(function(a,b){ return ((a.date||'').slice(0,10)+a.time) > ((b.date||'').slice(0,10)+b.time) ? 1 : -1; })
    .slice(0,6);
  return '<div style="display:flex;flex-direction:column;gap:14px">' +
    '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;overflow:hidden">' +
      '<div style="padding:12px 16px;border-bottom:1px solid #f0f1ec;font-size:13px;font-weight:700;color:#111111">Upcoming Appointments</div>' +
      (upcoming.length
        ? upcoming.map(function(a){
            return '<div style="padding:9px 14px;border-bottom:1px solid #f4f5f0">' +
              '<div style="display:flex;align-items:center;justify-content:space-between">' +
                '<div style="font-size:12px;font-weight:600;color:#111111">'+(a.name||'Patient')+'</div>' +
                '<div style="font-family:monospace;font-size:11px;color:#0F6E56">'+a.ref+'</div>' +
              '</div>' +
              '<div style="font-size:11px;color:#777777;margin-top:2px">'+a.dept+' · '+(a.date||'')+(a.time?' @ '+a.time:'')+'</div>' +
            '</div>';
          }).join('')
        : '<div style="padding:16px;text-align:center;font-size:13px;color:#777777">No upcoming appointments</div>') +
    '</div>' +
    '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;padding:16px">' +
      '<div style="font-size:13px;font-weight:700;color:#111111;margin-bottom:10px">Dept. availability</div>' +
      DEPARTMENTS.slice(0,6).map(function(d){
        var booked = _R.appointments.filter(function(a){return a.dept===d.name&&(a.date||'').slice(0,10)===today&&a.status!=='cancelled';}).length;
        var pct    = Math.min(Math.round(booked/10*100),100);
        return '<div style="margin-bottom:8px">' +
          '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">' +
            '<span style="color:#555555">'+d.name+'</span><span style="color:#777777">'+booked+' booked</span>' +
          '</div>' +
          '<div style="height:4px;background:#f0f1ec;border-radius:2px"><div style="height:4px;background:'+d.color+';border-radius:2px;width:'+pct+'%"></div></div>' +
        '</div>';
      }).join('') +
    '</div>' +
  '</div>';
}

/* Book page event helpers */
window._bkDateChange = async function(dateStr) {
  _R.bk.selectedDate = dateStr;
  _R.bk.selectedSlot = null;
  _rRec();
  /* Fetch real booked slots from API so grid reflects live availability */
  var _u1 = window.API && window.API.getStoredUser && window.API.getStoredUser();
  var fid = _R.facilityId || (window._NIHMS_FACILITY && window._NIHMS_FACILITY.id) || (_u1 && (_u1.facilityId || _u1.facility)) || '';
  var booked = await _recFetchBookedSlots(fid, dateStr);
  _R.bk.bookedSlots = _R.bk.bookedSlots || {};
  _R.bk.bookedSlots[dateStr] = booked;
  _rRec();
};

function _bindBkGrids() {
  /* Slot grid */
  var slotGrid = document.getElementById('bk-slot-grid');
  if (slotGrid && !slotGrid._bound) {
    slotGrid._bound = true;
    slotGrid.addEventListener('click', function(e){
      var btn = e.target.closest('[data-bkslot]');
      if (!btn) return;
      var t = btn.getAttribute('data-bkslot');
      _R.bk.selectedSlot = t;
      slotGrid.querySelectorAll('[data-bkslot]').forEach(function(b){
        var s = b.getAttribute('data-bkslot')===t;
        b.style.border='1.5px solid '+(s?'#0F6E56':'#e0e0e0');
        b.style.background=s?'#f0fdfa':'#fff';
        b.style.color=s?'#0F6E56':'#111111';
        b.style.fontWeight=s?'700':'500';
      });
      var errEl=document.getElementById('bk-slot-error');
      if(errEl) errEl.style.display='none';
    });
  }
  /* Dept is now in the visit type dropdown — no grid binding needed */
}


/* ═══════════════════════════════════════════════════════════════════════
   TAB 4 — QUEUE MANAGEMENT
═══════════════════════════════════════════════════════════════════════ */
function _rQueue() {
  var q=_R.queue;
  var deptF=_R.qDept, statusF=_R.qStatus;
  var filtered=q.filter(function(p){
    var dOk=deptF==='all'||p.department===deptF;
    var sOk=statusF==='all'||p.status===statusF;
    return dOk&&sOk;
  });

  var counts={ waiting:q.filter(function(p){return p.status==='waiting';}).length, 'at-nurse':q.filter(function(p){return p.status==='at-nurse';}).length, 'with-doctor':q.filter(function(p){return p.status==='with-doctor';}).length, done:q.filter(function(p){return p.status==='done';}).length };

  var statPills='<div style="display:flex;gap:10px;margin-bottom:14px">'+
    [['waiting','Waiting','#d97706'],['at-nurse','At Nurse','#7c3aed'],['with-doctor','With Doctor','#0F6E56'],['done','Done','#16a34a']].map(function(s){
      return '<div style="padding:10px 16px;background:#fff;border-radius:10px;border:1px solid #e0e0e0;text-align:center;flex:1">'+
        '<div style="font-size:22px;font-weight:800;color:'+s[2]+'">'+counts[s[0]]+'</div>'+
        '<div style="font-size:11px;color:#777777">'+s[1]+'</div>'+
      '</div>';
    }).join('')+
  '</div>';

  var toolbar='<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:14px">'+
    '<select onchange="_R.qDept=this.value;_rRec()" style="padding:7px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none">'+
      '<option value="all">All Departments</option>'+
      DEPARTMENTS.map(function(d){return '<option value="'+d.name+'"'+(deptF===d.name?' selected':'')+'>'+d.name+'</option>';}).join('')+
    '</select>'+
    '<select onchange="_R.qStatus=this.value;_rRec()" style="padding:7px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none">'+
      [['all','All Status'],['waiting','Waiting'],['at-nurse','At Nurse'],['with-doctor','With Doctor'],['done','Done']].map(function(o){
        return '<option value="'+o[0]+'"'+(statusF===o[0]?' selected':'')+'>'+o[1]+'</option>';
      }).join('')+
    '</select>'+
    '<button onclick="_rQueueDelayModal()" style="display:flex;align-items:center;gap:5px;padding:7px 14px;border-radius:8px;border:1.5px solid #fcd34d;background:#fffbeb;color:#b45309;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">'+_svgIcon('clock')+' Notify Delay</button>'+
    '<button onclick="_rTab(\'emergency\')" style="display:flex;align-items:center;gap:5px;padding:7px 14px;border-radius:8px;border:1.5px solid #fca5a5;background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">'+_svgIcon('alert')+' Emergency Override</button>'+
  '</div>';

  var deptCards='';

  var _todayStr=(new Date()).toISOString().slice(0,10);
  var rows=filtered.length
    ?filtered.map(function(p,i){
        var pc=_priCfg(p.priority), sc=_stCfg(p.status);
        var _cin=new Date(p.checkedInAt);
        var _isToday=p.checkedInAt&&p.checkedInAt.slice(0,10)===_todayStr;
        var wait=_isToday&&!isNaN(_cin)?Math.floor((new Date()-_cin)/60000):0;
        return '<tr style="background:'+(i%2===0?'#fff':'#f4f5f0')+';border-bottom:1px solid #f0f1ec">'+
          '<td style="padding:9px 14px;font-family:monospace;font-weight:700;font-size:13px;color:#0F6E56">'+p.token+'</td>'+
          '<td style="padding:9px 14px"><div style="font-weight:600;font-size:13px">'+p.name+'</div><div style="font-size:11px;color:#777777">'+p.id+'</div></td>'+
          '<td style="padding:9px 14px;font-size:12px;color:#777777">'+p.department+'</td>'+
          '<td style="padding:9px 14px">'+_badge(pc.label,{color:pc.color,bg:pc.bg,border:pc.border})+'</td>'+
          '<td style="padding:9px 14px">'+_badge(sc.label,{color:sc.color,bg:sc.bg,border:sc.border})+'</td>'+
          '<td style="padding:9px 14px;font-size:12px;color:'+(wait>20?'#dc2626':'#777777')+';font-weight:'+(wait>20?'700':'400')+'">'+(_isToday?wait+' min':'—')+'</td>'+
          '<td style="padding:9px 14px;font-size:12px;color:#777777">'+(
            p.status==='at-nurse'?'🏥 At Nurse Station':
            p.status==='with-doctor'?'🩺 In Consultation':
            p.status==='done'?'✓ Discharged':
            p.status==='waiting'?'⏳ Waiting Room':
            p.department==='Pharmacy Pickup'?'💊 Pharmacy':
            '—'
          )+'</td>'+
          '<td style="padding:9px 14px">'+
            (function(){
              var isTele = p.department==='Telemedicine';
              if(p.status==='waiting') return isTele
                ? _tBtn('→ Doctor','_rQueueAdvance(\''+p.token+'\',\'with-doctor\')')
                : _tBtn('→ Nurse','_rQueueAdvance(\''+p.token+'\',\'at-nurse\')');
              if(p.status==='at-nurse') return _tBtn('→ Doctor','_rQueueAdvance(\''+p.token+'\',\'with-doctor\')');
              if(p.status==='with-doctor') return _tBtn('Done','_rQueueAdvance(\''+p.token+'\',\'done\')');
              return '';
            }())+'</td>'+
        '</tr>';
      }).join('')
    :'<tr><td colspan="7" style="padding:24px;text-align:center;color:#777777;font-size:13px">No patients match the current filter</td></tr>';

  return '<div style="padding:20px">'+
    statPills+toolbar+deptCards+
    _card(
      '<table style="width:100%;border-collapse:collapse">'+
        '<thead><tr>'+['Token','Patient','Department','Priority','Status','Location','Wait','Action'].map(function(h){
          return '<th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#777777">'+h+'</th>';
        }).join('')+'</tr></thead><tbody>'+rows+'</tbody></table>','0')+
  '</div>';
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 5 — APPOINTMENTS CALENDAR
═══════════════════════════════════════════════════════════════════════ */
function _rAppointments() {
  var calDate=_R.calDate||new Date();
  var calView=_R.calView||'week';
  var calDept=_R.calDept||'all';

  var HOURS=['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
  var DAYS_ABBR=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  /* Header label */
  function headerLabel(){
    if(calView==='day') return calDate.toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    if(calView==='week'){
      var mon=new Date(calDate); mon.setDate(calDate.getDate()-((calDate.getDay()+6)%7));
      var sun=new Date(mon); sun.setDate(mon.getDate()+6);
      return mon.getDate()+' – '+sun.getDate()+' '+sun.toLocaleDateString('en-ZA',{month:'long',year:'numeric'});
    }
    if(calView==='month') return calDate.toLocaleDateString('en-ZA',{month:'long',year:'numeric'});
    return calDate.getFullYear().toString();
  }

  /* Navigate */
  function navDate(dir){
    var d=new Date(_R.calDate);
    if(calView==='day')   d.setDate(d.getDate()+dir);
    if(calView==='week')  d.setDate(d.getDate()+dir*7);
    if(calView==='month') d.setMonth(d.getMonth()+dir);
    if(calView==='year')  d.setFullYear(d.getFullYear()+dir);
    _R.calDate=d; _rRec();
  }
  window._calNav=navDate;

  /* Toolbar */
  var toolbar='<div style="display:flex;align-items:center;gap:8px;padding:12px 20px;border-bottom:1px solid #e0e0e0;background:#fff;flex-shrink:0;flex-wrap:wrap">'+
    '<button onclick="_calNav(-1)" style="padding:6px 10px;border:1.5px solid #e0e0e0;border-radius:7px;background:#fff;cursor:pointer;font-size:14px">‹</button>'+
    '<button onclick="_calNav(1)"  style="padding:6px 10px;border:1.5px solid #e0e0e0;border-radius:7px;background:#fff;cursor:pointer;font-size:14px">›</button>'+
    '<span style="font-size:14px;font-weight:700;color:#111111;min-width:220px">'+headerLabel()+'</span>'+
    '<div style="display:flex;border:1.5px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-left:8px">'+
      ['day','week','month','year'].map(function(v){
        return '<button onclick="_R.calView=\''+v+'\';_rRec()" style="padding:6px 14px;border:none;background:'+(calView===v?'#0F6E56':'#fff')+';color:'+(calView===v?'#fff':'#555555')+';font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">'+v.charAt(0).toUpperCase()+v.slice(1)+'</button>';
      }).join('')+
    '</div>'+
    '<select onchange="_R.calDept=this.value;_rRec()" style="padding:6px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:12px;font-family:inherit;outline:none">'+
      '<option value="all">All Departments</option>'+
      DEPARTMENTS.map(function(d){return '<option value="'+d.name+'"'+(calDept===d.name?' selected':'')+'>'+d.name+'</option>';}).join('')+
    '</select>'+
    '<button onclick="_rTab(\'book\')" style="margin-left:auto;display:flex;align-items:center;gap:5px;padding:7px 14px;border-radius:8px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"white\" stroke-width=\"2\"><line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"/><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/></svg> New appointment</button>'+
  '</div>';

  /* Filter appointments */
  var apts=_R.appointments.filter(function(a){ return calDept==='all'||a.dept===calDept; });

  /* VIEWS */
  var cal='';

  /* DAY VIEW */
  if(calView==='day'){
    var dayStr=calDate.toISOString().slice(0,10);
    var isSunDay=calDate.getDay()===0;
    if(isSunDay){
      cal='<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#d0d0d0;font-size:16px">⛔ Clinic closed on Sundays</div>';
    } else {
      var dayApts=apts.filter(function(a){return a.date&&a.date.slice(0,10)===dayStr&&a.status!=='cancelled';});
      cal='<div style="flex:1;overflow:auto"><table style="width:100%;border-collapse:collapse">'+
        '<thead><tr><th style="width:60px;padding:8px;border-right:1px solid #f0f1ec;border-bottom:1px solid #e0e0e0"></th>'+
        '<th style="padding:10px;border-bottom:1px solid #e0e0e0;font-size:13px;font-weight:700;color:#0F6E56">'+calDate.toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long'})+'</th></tr></thead><tbody>'+
        HOURS.map(function(h){
          var hNum=parseInt(h);
          var slotApts=dayApts.filter(function(a){return parseInt((a.time||'0').split(':')[0])===hNum;});
          return '<tr><td style="padding:4px 8px;border-right:1px solid #f0f1ec;border-top:1px solid #f4f5f0;font-size:10px;color:#d0d0d0;white-space:nowrap;vertical-align:top">'+h+'</td>'+
            '<td style="padding:3px;border-top:1px solid #f4f5f0;vertical-align:top;min-height:40px">'+
            slotApts.map(function(a){
              var col={booked:'#1A4A9B',walkin:'#0F6E56',emergency:'#dc2626'}[a.type]||'#1A4A9B';
              var isPending = a.rawStatus==='pending';
              return '<div style="background:'+col+'18;border-left:3px solid '+(isPending?'#F0A500':col)+';border-radius:5px;padding:6px 10px;margin-bottom:3px;cursor:pointer" onclick="_rAptEdit(\''+a.id+'\')">' +
                '<div style="font-size:12px;font-weight:700;color:'+(isPending?'#7A5C10':col)+'">'+(a.name||'Patient')+(isPending?' <span style="font-size:9px;background:#FFF3CD;color:#7A5C10;padding:1px 5px;border-radius:3px;font-weight:600;margin-left:4px">PENDING</span>':'')+'</div>' +
                '<div style="font-size:11px;color:#777777">'+a.time+' · '+(a.dept||'')+'</div>' +
              '</div>';
            }).join('')+
            '</td></tr>';
        }).join('')+
        '</tbody></table></div>';
    }
  }

  /* MONTH VIEW */
  if(calView==='month'){
    var firstDay=new Date(calDate.getFullYear(),calDate.getMonth(),1);
    var lastDay =new Date(calDate.getFullYear(),calDate.getMonth()+1,0);
    var startPad=(firstDay.getDay()+6)%7; /* Mon=0 */
    var todayMs=new Date().toDateString();
    var weeks=[]; var week=[];
    for(var pi=0;pi<startPad;pi++) week.push(null);
    for(var di=1;di<=lastDay.getDate();di++){
      week.push(new Date(calDate.getFullYear(),calDate.getMonth(),di));
      if(week.length===7){weeks.push(week);week=[];}
    }
    while(week.length<7) week.push(null);
    if(week.length) weeks.push(week);
    cal='<div style="flex:1;overflow:auto;padding:8px">'+
      '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;margin-bottom:4px">'+
        ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(function(d,i){
          return '<div style="padding:6px;text-align:center;font-size:11px;font-weight:700;color:'+(i===6?'#d0d0d0':'#555555')+'">'+d+'</div>';
        }).join('')+
      '</div>'+
      weeks.map(function(wk){
        return '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;margin-bottom:1px">'+
          wk.map(function(d,wi){
            if(!d) return '<div style="min-height:64px;background:#f9fafb;border-radius:4px"></div>';
            var ds=d.toISOString().slice(0,10);
            var isSunM=d.getDay()===0;
            var isToday=d.toDateString()===todayMs;
            var dayApts=apts.filter(function(a){return a.date&&a.date.slice(0,10)===ds&&a.status!=='cancelled';});
            return '<div style="min-height:64px;border-radius:4px;padding:4px;background:'+(isSunM?'#f9fafb':isToday?'#f0fdfa':'#fff')+';border:1px solid '+(isToday?'#0F6E56':'#f0f1ec')+'">'+
              '<div style="font-size:11px;font-weight:700;margin-bottom:2px;color:'+(isSunM?'#d0d0d0':isToday?'#0F6E56':'#555555')+'">'+d.getDate()+'</div>'+
              dayApts.slice(0,3).map(function(a){
                var col={booked:'#1A4A9B',walkin:'#0F6E56',emergency:'#dc2626'}[a.type]||'#1A4A9B';
                var isPending = a.rawStatus==='pending';
                return '<div style="font-size:9px;font-weight:600;color:'+(isPending?'#7A5C10':col)+';background:'+(isPending?'#FFF3CD':col+'15')+';border-radius:3px;padding:1px 4px;margin-bottom:1px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:pointer" onclick="_rAptEdit(\''+a.id+'\')">'+(a.name||'Patient')+'</div>';
              }).join('')+
              (dayApts.length>3?'<div style="font-size:9px;color:#777777">+' +(dayApts.length-3)+' more</div>':'')+
            '</div>';
          }).join('')+
        '</div>';
      }).join('')+
    '</div>';
  }

  /* YEAR VIEW */
  if(calView==='year'){
    var MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    cal='<div style="flex:1;overflow:auto;padding:12px">'+
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">'+
      MONTHS.map(function(mn,mi){
        var mApts=apts.filter(function(a){return a.date&&parseInt(a.date.slice(5,7))-1===mi&&parseInt(a.date.slice(0,4))===calDate.getFullYear()&&a.status!=='cancelled';}).length;
        var isNow=mi===new Date().getMonth()&&calDate.getFullYear()===new Date().getFullYear();
        return '<button onclick="_R.calDate=new Date('+calDate.getFullYear()+','+(mi)+',1);_R.calView=\'month\';_rRec()" style="background:'+(isNow?'#f0fdfa':'#fff')+';border:1.5px solid '+(isNow?'#0F6E56':'#e0e0e0')+';border-radius:10px;padding:16px;cursor:pointer;font-family:inherit;text-align:left">'+
          '<div style="font-size:13px;font-weight:700;color:'+(isNow?'#0F6E56':'#111111')+'">'+mn+'</div>'+
          '<div style="font-size:22px;font-weight:800;color:'+(mApts>0?'#0F6E56':'#e0e0e0');+';margin-top:6px">'+mApts+'</div>'+
          '<div style="font-size:11px;color:#777777">appointment'+(mApts===1?'':'s')+'</div>'+
        '</button>';
      }).join('')+
      '</div></div>';
  }

  /* WEEK VIEW */
  if(calView==='week'){
    var mon=new Date(calDate); mon.setDate(calDate.getDate()-((calDate.getDay()+6)%7));
    var days=[];
    for(var dd=0;dd<7;dd++){var dt=new Date(mon);dt.setDate(mon.getDate()+dd);days.push(dt);}
    var today=new Date().toDateString();

    cal='<div style="overflow:auto;flex:1"><table style="width:100%;border-collapse:collapse;min-width:700px">'+
      '<thead><tr>'+
        '<th style="width:60px;padding:8px;border-right:1px solid #f0f1ec;border-bottom:1px solid #e0e0e0;font-size:10px;color:#777777"></th>'+
        days.map(function(d){
          var isT=d.toDateString()===today;
          var isSunH=d.getDay()===0;
          return '<th style="padding:10px 6px;border-left:1px solid #f0f1ec;border-bottom:1px solid #e0e0e0;font-size:12px;font-weight:700;color:'+(isT?'#0F6E56':isSunH?'#d0d0d0':'#555555')+';background:'+(isT?'#f0fdfa':isSunH?'#f9fafb':'#fff')+'">'+
            DAYS_ABBR[d.getDay()]+' '+d.getDate()+(isSunH?' <span style="font-size:9px;font-weight:400;color:#e0e0e0">Closed</span>':'')+
          '</th>';
        }).join('')+
      '</tr></thead><tbody>'+
      HOURS.map(function(h){
        return '<tr>'+
          '<td style="padding:4px 8px;border-right:1px solid #f0f1ec;border-top:1px solid #f4f5f0;font-size:10px;color:#d0d0d0;vertical-align:top;white-space:nowrap">'+h+'</td>'+
          days.map(function(d){
            var dateStr=d.toISOString().slice(0,10);
            /* Match bookings whose time falls within this hour row */
            var hNum = parseInt(h);
            var dayApts = apts.filter(function(a){
              if (!a.date || a.status==='cancelled') return false;
              var aDate = a.date.slice(0,10);
              if (aDate !== dateStr) return false;
              var aH = parseInt((a.time||'00').split(':')[0]);
              return aH === hNum;
            });
            var isSun = d.getDay()===0;
            var cellBg = isSun ? 'background:#f9fafb' : '';
            return '<td style="padding:3px;border-left:1px solid #f0f1ec;border-top:1px solid #f4f5f0;vertical-align:top;min-height:36px;'+cellBg+'">'+
              dayApts.map(function(apt){
                var typeColors={booked:'#1A4A9B',walkin:'#0F6E56',emergency:'#dc2626'};
                var col=typeColors[apt.type]||'#1A4A9B';
                return '<div style="background:'+col+'18;border-left:3px solid '+col+';border-radius:4px;padding:4px 6px;margin-bottom:2px;cursor:pointer" onclick="_rAptEdit(\''+apt.id+'\')">' +
                  '<div style="font-size:10px;font-weight:700;color:'+col+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(apt.name||'Patient')+'</div>' +
                  '<div style="font-size:9px;color:#777777;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+apt.time+' · '+(apt.dept||'')+'</div>' +
                '</div>';
              }).join('') +
              (isSun && dayApts.length===0 ? '<div style="font-size:9px;color:#e0e0e0;text-align:center;padding-top:8px">—</div>' : '') +
            '</td>';
          }).join('')+
        '</tr>';
      }).join('')+
      '</tbody></table></div>';
  }

  /* Appointments list */
  var listRows=apts.map(function(a,i){
    var typeColor={booked:{bg:'#f0fdf4',c:'#16a34a',b:'#86efac'},walkin:{bg:'#f0fdfa',c:'#1A4A9B',b:'#99f6e4'},emergency:{bg:'#fef2f2',c:'#dc2626',b:'#fca5a5'}};
    var tc=typeColor[a.type]||typeColor.booked;
    var cancelled=a.status==='cancelled';
    return '<tr style="background:'+(cancelled?'#f9fafb':i%2===0?'#fff':'#f4f5f0')+';border-bottom:1px solid #f0f1ec;opacity:'+(cancelled?'.55':'1')+'">'+
      '<td style="padding:9px 14px;font-family:monospace;font-size:11px;font-weight:600;color:#777777">'+a.ref+'</td>'+
      '<td style="padding:9px 14px;font-weight:600;font-size:13px">'+(a.name||'—')+'</td>'+
      '<td style="padding:9px 14px;font-size:12px;color:#777777">'+(a.dept||'—')+'</td>'+
      '<td style="padding:9px 14px;font-size:12px;color:#777777">'+(a.date||'')+' '+a.time+'</td>'+
      '<td style="padding:9px 14px"><span style="padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:'+tc.bg+';color:'+tc.c+';border:1px solid '+tc.b+'">'+a.type+'</span></td>'+
      '<td style="padding:9px 14px"><span style="padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:'+(cancelled?'#f9fafb':a.verified?'#f0fdf4':'#fffbeb')+';color:'+(cancelled?'#9ca3af':a.verified?'#16a34a':'#b45309')+';border:1px solid '+(cancelled?'#e5e7eb':a.verified?'#86efac':'#fcd34d')+'">'+(cancelled?'Cancelled':a.verified?'Verified':'Pending')+'</span></td>'+
      '<td style="padding:9px 14px">'+
        (!cancelled?
          '<div style="display:flex;gap:5px">'+
            '<button onclick="_rAptEdit(\''+a.id+'\')" style="padding:4px 10px;border-radius:6px;border:1px solid rgba(26,74,155,.35);color:#1A4A9B;font-size:11px;cursor:pointer;font-family:inherit;background:#fff">Edit</button>'+
            '<button onclick="_rAptCancel(\''+a.id+'\')" style="padding:4px 10px;border-radius:6px;border:1px solid #fca5a5;color:#dc2626;font-size:11px;cursor:pointer;font-family:inherit;background:#fff">Cancel</button>'+
          '</div>':
          '<span style="font-size:11px;color:#9ca3af">Cancelled</span>')+
      '</td>'+
    '</tr>';
  }).join('');

  return '<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">'+toolbar+
    (calView==='week'?cal:'')+
    '<div style="flex-shrink:0;padding:14px 20px 20px">'+
  (function(){
      var todayStr = new Date().toISOString().slice(0,10);
      var todayApts = apts.filter(function(a){return a.date===todayStr&&a.status!=='cancelled';});
      var todayRows = todayApts.map(function(a,i){
        var typeColor={booked:{bg:'#f0fdf4',c:'#16a34a',b:'#86efac'},walkin:{bg:'#f0fdfa',c:'#1A4A9B',b:'#99f6e4'},emergency:{bg:'#fef2f2',c:'#dc2626',b:'#fca5a5'}};
        var tc=typeColor[a.type]||typeColor.booked;
        return '<tr style="background:'+(i%2===0?'#fff':'#f4f5f0')+';border-bottom:1px solid #f0f1ec">'+
          '<td style="padding:9px 14px;font-family:monospace;font-size:11px;font-weight:600;color:#777777">'+a.ref+'</td>'+
          '<td style="padding:9px 14px;font-weight:600;font-size:13px">'+(a.name||'—')+'</td>'+
          '<td style="padding:9px 14px;font-size:12px;color:#777777">'+(a.dept||'—')+'</td>'+
          '<td style="padding:9px 14px;font-size:12px;color:#777777">'+a.time+'</td>'+
          '<td style="padding:9px 14px"><span style="padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:'+tc.bg+';color:'+tc.c+';border:1px solid '+tc.b+'">'+a.type+'</span></td>'+
          '<td style="padding:9px 14px"><span style="padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:'+(a.verified?'#f0fdf4':'#fffbeb')+';color:'+(a.verified?'#16a34a':'#b45309')+';border:1px solid '+(a.verified?'#86efac':'#fcd34d')+'">'+(a.verified?'Verified':'Pending')+'</span></td>'+
          '<td style="padding:9px 14px"><div style="display:flex;gap:5px"><button onclick="_rAptEdit(\''+a.id+'\')" style="padding:4px 10px;border-radius:6px;border:1px solid rgba(26,74,155,.35);color:#1A4A9B;font-size:11px;cursor:pointer;font-family:inherit;background:#fff">Edit</button><button onclick="_rAptCancel(\''+a.id+'\')" style="padding:4px 10px;border-radius:6px;border:1px solid #fca5a5;color:#dc2626;font-size:11px;cursor:pointer;font-family:inherit;background:#fff">Cancel</button></div></td>'+
        '</tr>';
      }).join('');
      return _card('<div style="font-size:13px;font-weight:700;color:#111111;margin-bottom:10px">Today\'s Appointments ('+todayApts.length+')</div>'+
        (todayApts.length?
          '<table style="width:100%;border-collapse:collapse"><thead><tr>'+['Ref','Patient','Department','Time','Type','Status','Actions'].map(function(h){return '<th style="padding:7px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#777777">'+h+'</th>';}).join('')+'</tr></thead><tbody>'+todayRows+'</tbody></table>':
          '<div style="padding:16px;text-align:center;color:#777777;font-size:13px">No appointments scheduled for today</div>'),
        '0');
    })()+
    '</div>'+
  '</div>';
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 6 — EMERGENCY INTAKE
═══════════════════════════════════════════════════════════════════════ */
function _rEmergency() {
  var recent=_R.queue.filter(function(p){return p.priority==='urgent';}).slice(0,5);
  var em=_R;

  var form=_card(
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">'+
      '<div style="width:42px;height:42px;border-radius:12px;background:#dc2626;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+_svgIcon('bolt')+'</div>'+
      '<div><div style="font-size:16px;font-weight:800;color:#111111">Emergency Intake</div>'+
      '<div style="font-size:13px;color:#777777">Fast-track a patient to the emergency queue</div></div>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">'+
      _inp('em-id','SA ID / Passport','e.g. 8203041234083',em.emId)+
      _inp('em-name','Patient Name or Description *','e.g. Jane Doe — chest pain',em.emName)+
    '</div>'+
    _sel('em-dept','Department',DEPARTMENTS.map(function(d){return {v:d.name,label:d.name};}),em.emDept)+
    '<div style="margin-top:12px">'+
      '<label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#555555;margin-bottom:5px">Chief Complaint</label>'+
      '<textarea id="em-desc" rows="2" placeholder="Brief emergency description…" style="width:100%;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box">'+( em.emDesc||'')+'</textarea>'+
    '</div>'+
    '<div style="margin-top:14px">'+
      _pBtn('Issue Emergency Token','_rEmergencyIssue()','#dc2626')+
    '</div>'
  );

  var recentHtml=recent.length
    ?recent.map(function(p){
      return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fef2f2;border-left:4px solid #dc2626;border-radius:8px;margin-bottom:6px">'+
        '<span style="font-family:monospace;font-weight:800;color:#dc2626;font-size:15px">'+p.token+'</span>'+
        '<div style="flex:1"><div style="font-size:12px;font-weight:600">'+p.name+'</div><div style="font-size:11px;color:#777777">'+p.department+'</div></div>'+
        _badge('Emergency',{color:'#dc2626',bg:'#fef2f2',border:'#fca5a5'})+
      '</div>';
    }).join('')
    :'<div style="padding:16px;text-align:center;color:#777777;font-size:13px;background:#f4f5f0;border-radius:8px;border:1px dashed #e0e0e0">No emergency tokens today</div>';

  return '<div style="padding:20px;max-width:900px">'+
    '<div style="display:grid;grid-template-columns:1.2fr 1fr;gap:20px">'+
      form+
      _card('<div style="font-size:13px;font-weight:700;color:#dc2626;margin-bottom:12px">Today\'s Emergency Tokens</div>'+recentHtml)+
    '</div>'+
  '</div>';
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 7 — MESSAGING
═══════════════════════════════════════════════════════════════════════ */
function _rMessaging() {
  /* ── Colour tokens (local, matches receptionist brand) ── */
  var RC = {
    teal:'#0F6E56', tealDark:'#0a4f3e', tealLt:'#e1f5ee',
    navy:'#1A4A9B',
    text:'#111111', muted:'#555555', border:'#e0e0e0',
    red:'#dc2626',  bg:'#f4f5f0',
  };

  /* ── State: inbox | sent | important | compose | thread ── */
  window._rMsgView   = window._rMsgView   || 'inbox';
  window._rMsgThread = window._rMsgThread || null;

  function _rMsgRender(){ _R.tab='messaging'; _rRec(); }

  /* ── Recipients (receptionist-appropriate roles) ── */
  var RECIPIENTS = [
    {value:'Nurse Station',    label:'Nurse Station',       icon:'🩺'},
    {value:'Doctor',           label:'Doctor / Clinician',  icon:'👨‍⚕️'},
    {value:'Pharmacy',         label:'Pharmacy',            icon:'💊'},
    {value:'Laboratory',       label:'Laboratory',          icon:'🔬'},
    {value:'Radiology',        label:'Radiology',           icon:'🩻'},
    {value:'Administration',   label:'Administration',      icon:'🏥'},
    {value:'Patient',          label:'Patient (SMS/Email)', icon:'👤'},
  ];

  var msgs = _R.messages || [];
  var u    = (window.API && window.API.getStoredUser && window.API.getStoredUser()) || {};
  var recName = u.firstName ? ((u.firstName||'')+' '+(u.lastName||'')).trim() : (u.name||'Reception');

  var unreadCount = msgs.filter(function(m){ return m.unread && m.from !== 'Reception (You)'; }).length;
  var sentCount   = msgs.filter(function(m){ return m.from === 'Reception (You)'; }).length;

  /* ── Field style helpers ── */
  function _mFld(){
    return 'width:100%;padding:10px 12px;border:1.5px solid '+RC.border+';border-radius:8px;font-size:14px;font-family:inherit;color:'+RC.text+';background:#fff;box-sizing:border-box;outline:none';
  }
  function _mLabel(t,req){
    return '<label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+RC.muted+';margin-bottom:6px">'+t+(req?' <span style="color:'+RC.red+'">*</span>':'')+'</label>';
  }
  function _mCard(title,content){
    return '<div style="background:#fff;border:1.5px solid '+RC.border+';border-radius:12px;padding:20px 24px;margin-bottom:16px">'+
      (title?'<div style="font-size:15px;font-weight:800;color:'+RC.text+';margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid '+RC.border+'">'+title+'</div>':'')+
      content+
    '</div>';
  }

  var folders = [
    {key:'inbox',     label:'Inbox',     icon:'📥', desc:'Received messages',  badge:unreadCount},
    {key:'sent',      label:'Sent',      icon:'📤', desc:'Messages you sent',   badge:sentCount},
    {key:'important', label:'Important', icon:'⭐', desc:'Flagged messages',    badge:0},
  ];

  /* ── Sidebar ── */
  var sidebar =
    '<div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">'+

      '<div style="background:#fff;border:1.5px solid '+RC.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+RC.muted+';margin-bottom:12px">Messages</div>'+
        '<div style="font-size:11px;color:'+RC.muted+';margin-bottom:10px">Internal · Secure team messaging</div>'+
        '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">'+
          '<div style="display:flex;justify-content:space-between;align-items:center">'+
            '<span style="font-size:12px;color:'+RC.muted+'">Unread</span>'+
            '<span style="font-size:14px;font-weight:800;color:'+RC.red+'">'+unreadCount+'</span>'+
          '</div>'+
          '<div style="display:flex;justify-content:space-between;align-items:center">'+
            '<span style="font-size:12px;color:'+RC.muted+'">Sent</span>'+
            '<span style="font-size:14px;font-weight:800;color:'+RC.text+'">'+sentCount+'</span>'+
          '</div>'+
        '</div>'+
        '<button onclick="window._rMsgView=\'compose\';window._rMsgThread=null;_rMsgRender()" '+
          'style="width:100%;padding:10px 14px;border:none;border-radius:9px;background:linear-gradient(135deg,'+RC.teal+' 0%,'+RC.navy+' 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;text-align:center">'+
          '✉ Compose Message'+
        '</button>'+
      '</div>'+

      '<div style="background:#fff;border:1.5px solid '+RC.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+RC.muted+';margin-bottom:12px">Folders</div>'+
        '<div style="display:flex;flex-direction:column;gap:2px">'+
          folders.map(function(f){
            var active = window._rMsgView === f.key;
            return '<button onclick="window._rMsgView=\''+f.key+'\';window._rMsgThread=null;_rMsgRender()" '+
              'style="display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border-radius:8px;background:'+(active?RC.tealLt:'transparent')+';cursor:pointer;text-align:left;font-family:inherit;border:1.5px solid '+(active?RC.teal:'transparent')+'">'+
              '<span style="font-size:15px">'+f.icon+'</span>'+
              '<div style="flex:1;min-width:0">'+
                '<div style="font-size:13px;font-weight:'+(active?'700':'500')+';color:'+(active?RC.teal:RC.text)+'">'+f.label+'</div>'+
                '<div style="font-size:10px;color:'+RC.muted+';line-height:1.3">'+f.desc+'</div>'+
              '</div>'+
              (f.badge?'<span style="min-width:18px;height:18px;border-radius:9px;background:'+RC.red+';color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 3px">'+f.badge+'</span>':'')+
            '</button>';
          }).join('')+
        '</div>'+
      '</div>'+

      /* Quick actions */
      '<div style="background:#fff;border:1.5px solid '+RC.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:'+RC.muted+';margin-bottom:10px">Quick Actions</div>'+
        '<button onclick="_rSendVaxReminders()" style="width:100%;padding:9px 12px;border-radius:8px;border:1.5px solid '+RC.border+';background:#fff;color:'+RC.teal+';font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;text-align:left;margin-bottom:6px">💉 Vaccination Reminders</button>'+
        '<button onclick="window._rShowDelayForm=true;_rMsgRender()" style="width:100%;padding:9px 12px;border-radius:8px;border:1.5px solid '+RC.border+';background:#fff;color:#b45309;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;text-align:left">🕐 Notify Patients of Delay</button>'+
      '</div>'+

    '</div>'; /* end sidebar */

  /* ── COMPOSE VIEW ── */
  if (window._rMsgView === 'compose') {
    var mainCompose =
      '<div style="flex:1;min-width:0">'+

      '<div style="background:#fff;border:1.5px solid '+RC.border+';border-radius:12px;padding:18px 24px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">'+
        '<div>'+
          '<div style="font-size:18px;font-weight:800;color:'+RC.text+'">New Message</div>'+
          '<div style="font-size:13px;color:'+RC.muted+';margin-top:2px">From: '+recName+'</div>'+
        '</div>'+
        '<button onclick="window._rMsgView=\'inbox\';_rMsgRender()" '+
          'style="padding:7px 16px;border:1.5px solid '+RC.border+';border-radius:8px;background:#fff;font-size:13px;font-weight:600;color:'+RC.muted+';cursor:pointer;font-family:inherit">'+
          '← Back'+
        '</button>'+
      '</div>'+

      _mCard('Recipient',
        _mLabel('Send To',true)+
        '<div style="display:flex;flex-direction:column;gap:8px">'+
          RECIPIENTS.map(function(r,i){
            return '<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid '+RC.border+';border-radius:9px;cursor:pointer;font-size:13px;font-weight:600;color:'+RC.text+';background:#fff" '+
              'onmouseenter="this.style.borderColor=\''+RC.teal+'\';this.style.background=\''+RC.tealLt+'\'" '+
              'onmouseleave="this.style.borderColor=\''+RC.border+'\';this.style.background=\'#fff\'">'+
              '<input type="radio" name="rmsg-recipient" value="'+r.value+'"'+(i===0?' checked':'')+' style="accent-color:'+RC.teal+'"> '+
              '<span style="font-size:15px">'+r.icon+'</span>'+
              '<span>'+r.label+'</span>'+
            '</label>';
          }).join('')+
        '</div>'+
        '<div style="margin-top:12px">'+
          _mLabel('Specific Staff Member (optional)',false)+
          '<input id="rmsg-specific" type="text" placeholder="e.g. Sr. Dlamini, Dr. Khumalo" style="'+_mFld()+'">'+
        '</div>'
      )+

      _mCard('Priority',
        _mLabel('Message Priority',true)+
        '<div style="display:flex;flex-direction:column;gap:8px">'+
          [
            {val:'Normal', label:'Normal',                        icon:'🔵', desc:'Standard internal communication'},
            {val:'High',   label:'High Priority',                 icon:'🟠', desc:'Requires prompt attention'},
            {val:'Urgent', label:'Urgent Clinical Communication', icon:'🔴', desc:'Immediate clinical action required'},
          ].map(function(p,i){
            return '<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid '+RC.border+';border-radius:9px;cursor:pointer;font-size:13px;background:#fff" '+
              'onmouseenter="this.style.borderColor=\''+RC.teal+'\'" onmouseleave="this.style.borderColor=\''+RC.border+'\'">'+
              '<input type="radio" name="rmsg-priority" value="'+p.val+'"'+(i===0?' checked':'')+' style="accent-color:'+RC.teal+'">'+
              '<span style="font-size:15px">'+p.icon+'</span>'+
              '<div><div style="font-weight:700;color:'+RC.text+'">'+p.label+'</div>'+
                '<div style="font-size:11px;color:'+RC.muted+'">'+p.desc+'</div>'+
              '</div>'+
            '</label>';
          }).join('')+
        '</div>'
      )+

      _mCard('Subject &amp; Patient',
        '<div style="display:flex;flex-direction:column;gap:12px">'+
          '<div>'+_mLabel('Subject',true)+'<input id="rmsg-subject" type="text" placeholder="Enter message subject…" style="'+_mFld()+'"></div>'+
          '<div>'+
            _mLabel('Patient ID (optional)',false)+
            '<input id="rmsg-patient-id" type="text" placeholder="e.g. PT-00231" style="'+_mFld()+'">'+
            '<div style="font-size:11px;color:'+RC.muted+';margin-top:5px">Link this message to a patient record when clinically relevant.</div>'+
          '</div>'+
        '</div>'
      )+

      _mCard('Message',
        _mLabel('Message',true)+
        '<textarea id="rmsg-body" rows="6" placeholder="Type your message here…" style="'+_mFld()+';resize:vertical"></textarea>'
      )+

      '<div style="display:flex;gap:12px;padding-bottom:24px">'+
        '<button onclick="_rSendMsg()" style="flex:1;padding:13px 24px;border:none;border-radius:10px;background:linear-gradient(135deg,'+RC.teal+' 0%,'+RC.navy+' 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">✉ Send Message</button>'+
        '<button onclick="window._rMsgView=\'inbox\';_rMsgRender()" style="padding:13px 24px;border:1.5px solid '+RC.border+';border-radius:10px;background:#fff;color:'+RC.muted+';font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Cancel</button>'+
      '</div>'+

      '</div>'; /* end mainCompose */

    return '<div style="display:flex;flex-direction:column;height:100%">'+
      '<div style="padding:20px 24px 0;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%)">'+
        '<div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:2px">Messages</div>'+
        '<div style="font-size:13px;color:rgba(255,255,255,.75);padding-bottom:16px">Internal communication · Secure team messaging</div>'+
      '</div>'+
      '<div style="flex:1;overflow:auto;padding:16px 20px;display:flex;gap:16px;align-items:flex-start">'+
        mainCompose + sidebar +
      '</div>'+
    '</div>';
  }

  /* ── THREAD DETAIL VIEW ── */
  if (window._rMsgThread !== null) {
    var threadMsg = msgs.find(function(m){ return m.id === window._rMsgThread; }) || msgs[0];
    var mi = msgs.findIndex(function(m){ return m.id === window._rMsgThread; });
    if (mi > -1) msgs[mi].unread = false;

    var detailMain =
      '<div style="flex:1;min-width:0">'+
        '<div style="background:#fff;border:1.5px solid '+RC.border+';border-radius:12px;padding:20px 24px;margin-bottom:16px">'+
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px">'+
            '<div>'+
              '<div style="font-size:17px;font-weight:800;color:'+RC.text+'">'+threadMsg.text.slice(0,60)+(threadMsg.text.length>60?'…':'')+'</div>'+
              '<div style="font-size:12px;color:'+RC.muted+';margin-top:4px">From: <strong>'+threadMsg.from+'</strong>'+(threadMsg.role?' · <strong>'+threadMsg.role+'</strong>':'')+' · '+threadMsg.time+'</div>'+
            '</div>'+
            '<button onclick="window._rMsgThread=null;_rMsgRender()" style="padding:7px 14px;border:1.5px solid '+RC.border+';border-radius:8px;background:#fff;font-size:12px;font-weight:600;color:'+RC.muted+';cursor:pointer;font-family:inherit">← Back</button>'+
          '</div>'+
          '<div style="background:#f8fafc;border-radius:10px;padding:16px;font-size:14px;color:'+RC.text+';line-height:1.7">'+threadMsg.text+'</div>'+
        '</div>'+
        '<div style="background:#fff;border:1.5px solid '+RC.border+';border-radius:12px;padding:20px 24px;margin-bottom:24px">'+
          '<div style="font-size:14px;font-weight:700;color:'+RC.text+';margin-bottom:12px">Reply</div>'+
          '<textarea id="rmsg-reply-body" rows="4" placeholder="Type your reply…" style="width:100%;padding:10px 12px;border:1.5px solid '+RC.border+';border-radius:8px;font-size:14px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box"></textarea>'+
          '<div style="display:flex;gap:10px;margin-top:12px">'+
            '<button onclick="var b=(document.getElementById(\'rmsg-reply-body\')||{value:\'\'}).value.trim();if(b){_R.messages.unshift({id:Date.now(),from:\'Reception (You)\',role:\''+(threadMsg.role||'')+'\',text:b,time:new Date().toLocaleTimeString(\'en-ZA\',{hour:\'2-digit\',minute:\'2-digit\'}),unread:false});window._rMsgThread=null;_rMsgRender();}else{if(window.UI&&UI.showToast)UI.showToast(\'Enter a reply\',\'err\');}" '+
              'style="flex:1;padding:11px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,'+RC.teal+' 0%,'+RC.navy+' 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Send Reply</button>'+
            '<button onclick="window._rMsgThread=null;_rMsgRender()" style="padding:11px 20px;border:1.5px solid '+RC.border+';border-radius:10px;background:#fff;color:'+RC.muted+';font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Cancel</button>'+
          '</div>'+
        '</div>'+
      '</div>';

    return '<div style="display:flex;flex-direction:column;height:100%">'+
      '<div style="padding:20px 24px 0;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%)">'+
        '<div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:2px">Messages</div>'+
        '<div style="font-size:13px;color:rgba(255,255,255,.75);padding-bottom:16px">Internal communication · Secure team messaging</div>'+
      '</div>'+
      '<div style="flex:1;overflow:auto;padding:16px 20px;display:flex;gap:16px;align-items:flex-start">'+
        detailMain + sidebar +
      '</div>'+
    '</div>';
  }

  /* ── INBOX / SENT / IMPORTANT LIST VIEW ── */
  var folder     = window._rMsgView || 'inbox';
  var folderMeta = folders.find(function(f){ return f.key===folder; }) || folders[0];

  var visibleMsgs = folder==='sent'
    ? msgs.filter(function(m){ return m.from==='Reception (You)'; })
    : folder==='important'
      ? msgs.filter(function(m){ return m.important; })
      : msgs.filter(function(m){ return m.from!=='Reception (You)'; });

  /* Delay notification inline form (triggered from sidebar quick action) */
  var delayFormHtml = '';
  if (window._rShowDelayForm) {
    window._rShowDelayForm = false;
    delayFormHtml =
      '<div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:12px;padding:18px 22px;margin-bottom:16px">'+
        '<div style="font-size:14px;font-weight:700;color:#b45309;margin-bottom:12px">🕐 Notify Patients of Delay</div>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'+
          _sel('delay-dept','Department',[{v:'all',label:'All departments'}].concat(DEPARTMENTS.map(function(d){return {v:d.name,label:d.name};})),'all')+
          _sel('delay-dur','Duration',[{v:'15',label:'15 minutes'},{v:'30',label:'30 minutes'},{v:'45',label:'45 minutes'},{v:'60',label:'1 hour'}],'30')+
        '</div>'+
        _inp('delay-reason','Reason (optional)','e.g. Doctor running late','','text')+
        '<div style="display:flex;gap:8px;margin-top:10px">'+
          '<button onclick="_rSendDelay()" style="padding:9px 18px;border-radius:8px;border:none;background:#d97706;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">'+_svgIcon('clock')+' Send Notification</button>'+
          '<button onclick="window._rShowDelayForm=false;_rMsgRender()" style="padding:9px 18px;border-radius:8px;border:1.5px solid #e0e0e0;background:#fff;color:#555555;font-size:13px;cursor:pointer;font-family:inherit">Cancel</button>'+
        '</div>'+
      '</div>';
  }

  var listMain =
    '<div style="flex:1;min-width:0">'+
    delayFormHtml+

    '<div style="background:#fff;border:1.5px solid '+RC.border+';border-radius:12px;padding:18px 24px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">'+
      '<div>'+
        '<div style="font-size:18px;font-weight:800;color:'+RC.text+'">'+folderMeta.icon+' '+folderMeta.label+'</div>'+
        '<div style="font-size:13px;color:'+RC.muted+';margin-top:2px">'+folderMeta.desc+'</div>'+
      '</div>'+
      '<button onclick="window._rMsgView=\'compose\';window._rMsgThread=null;_rMsgRender()" '+
        'style="display:flex;align-items:center;gap:8px;padding:10px 18px;border:none;border-radius:10px;background:linear-gradient(135deg,'+RC.teal+' 0%,'+RC.navy+' 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">'+
        '✉ Compose Message'+
      '</button>'+
    '</div>'+

    '<div style="background:#fff;border:1.5px solid '+RC.border+';border-radius:12px;overflow:hidden;margin-bottom:24px">'+
      (visibleMsgs.length
        ? visibleMsgs.map(function(m){
            var unread = m.unread && m.from !== 'Reception (You)';
            return '<div onclick="window._rMsgThread='+m.id+';_rMsgRender()" '+
              'style="display:flex;align-items:flex-start;gap:12px;padding:14px 18px;border-bottom:1px solid '+RC.border+';background:'+(unread?RC.tealLt:'#fff')+';cursor:pointer" '+
              'onmouseenter="this.style.background=\''+RC.tealLt+'\'" onmouseleave="this.style.background=\''+(unread?RC.tealLt:'#fff')+'\'">'+
              '<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,'+RC.teal+' 0%,'+RC.navy+' 100%);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;font-weight:700">'+
                m.from.split(' ').map(function(n){return n[0]||'';}).join('').slice(0,2).toUpperCase()+
              '</div>'+
              '<div style="flex:1;min-width:0">'+
                '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">'+
                  '<div style="font-size:14px;font-weight:'+(unread?'700':'500')+';color:'+RC.text+'">'+m.from+(m.role?' <span style="font-size:11px;color:'+RC.muted+';font-weight:400">· '+m.role+'</span>':'')+'</div>'+
                  '<div style="font-size:11px;color:'+RC.muted+';flex-shrink:0">'+m.time+'</div>'+
                '</div>'+
                '<div style="font-size:13px;color:'+RC.muted+';margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+m.text.slice(0,80)+(m.text.length>80?'…':'')+'</div>'+
                (unread?'<span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:10px;background:'+RC.tealLt+';color:'+RC.teal+';font-size:10px;font-weight:700">Unread</span>':'')+
              '</div>'+
            '</div>';
          }).join('')
        : '<div style="padding:40px;text-align:center;color:'+RC.muted+'">'+
            '<div style="font-size:32px;margin-bottom:8px">📭</div>'+
            '<div style="font-size:14px;font-weight:600;color:'+RC.text+'">No messages in '+folderMeta.label+'</div>'+
          '</div>'
      )+
    '</div>'+
    '</div>'; /* end listMain */

  return '<div style="display:flex;flex-direction:column;height:100%">'+
    '<div style="padding:20px 24px 0;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%)">'+
      '<div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:2px">Messages</div>'+
      '<div style="font-size:13px;color:rgba(255,255,255,.75);padding-bottom:16px">Internal communication · Secure team messaging</div>'+
    '</div>'+
    '<div style="flex:1;overflow:auto;padding:16px 20px;display:flex;gap:16px;align-items:flex-start">'+
      listMain + sidebar +
    '</div>'+
  '</div>';
}

/* ═══════════════════════════════════════════════════════════════════════
   TAB 8 — ANALYTICS
═══════════════════════════════════════════════════════════════════════ */
function _rAnalytics() {
  var q=_R.queue;
  var done=q.filter(function(p){return p.status==='done';});
  var avgWait=q.length?Math.round(q.reduce(function(s,p){return s+(Math.floor((new Date()-new Date(p.checkedInAt))/60000));},0)/q.length):0;
  var noShow=q.filter(function(p){return p.status==='no-show';});

  var kpis=[
    {label:'Total Patients',value:q.length,      color:'#0F6E56'},
    {label:'Avg Wait (min)', value:avgWait,        color:'#f59e0b'},
    {label:'Completed',      value:done.length,    color:'#10b981'},
    {label:'No-shows',       value:noShow.length,  color:'#ef4444'},
  ];

  var kpiHtml='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">'+
    kpis.map(function(k){
      return _card('<div style="text-align:center"><div style="font-size:32px;font-weight:800;margin-bottom:4px;color:'+k.color+'">'+k.value+'</div><div style="font-size:12px;color:#777777">'+k.label+'</div></div>');
    }).join('')+'</div>';

  /* Hourly bar chart */
  var hourly=[{h:'07',n:4},{h:'08',n:9},{h:'09',n:14},{h:'10',n:11},{h:'11',n:8},{h:'12',n:6},{h:'13',n:7},{h:'14',n:5},{h:'15',n:3}];
  var maxN=Math.max.apply(null,hourly.map(function(r){return r.n;}));
  var barChart=_card(
    '<div style="font-size:13px;font-weight:700;color:#111111;margin-bottom:14px">Patients per Hour</div>'+
    '<div style="display:flex;align-items:flex-end;gap:6px;height:120px">'+
      hourly.map(function(r){
        var pct=maxN?Math.round(r.n/maxN*100):0;
        return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">'+
          '<div style="font-size:10px;color:#777777">'+r.n+'</div>'+
          '<div style="width:100%;background:#0F6E56;border-radius:4px 4px 0 0;height:'+pct+'%"></div>'+
          '<div style="font-size:9px;color:#777777">'+r.h+':00</div>'+
        '</div>';
      }).join('')+
    '</div>'
  );

  /* Dept breakdown */
  var deptBreak=DEPARTMENTS.map(function(d){
    var n=q.filter(function(p){return p.department===d.name;}).length;
    var pct=q.length?Math.round(n/q.length*100):0;
    return {name:d.name,n:n,pct:pct,color:d.color};
  }).filter(function(d){return d.n>0;}).sort(function(a,b){return b.n-a.n;});

  var deptChart=_card(
    '<div style="font-size:13px;font-weight:700;color:#111111;margin-bottom:14px">Patients by Department</div>'+
    (deptBreak.length
      ?deptBreak.map(function(d){
        return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'+
          '<span style="width:8px;height:8px;border-radius:50%;background:'+d.color+';flex-shrink:0"></span>'+
          '<span style="flex:1;font-size:12px;color:#555555">'+d.name+'</span>'+
          '<span style="font-size:12px;font-weight:700;color:#111111;width:24px;text-align:right">'+d.n+'</span>'+
          '<div style="width:80px;height:5px;border-radius:3px;background:#f0f1ec;overflow:hidden">'+
            '<div style="height:100%;background:'+d.color+';border-radius:3px;width:'+d.pct+'%"></div>'+
          '</div>'+
        '</div>';
      }).join('')
      :'<div style="font-size:13px;color:#777777;text-align:center;padding:16px">No data yet</div>')
  );

  /* Wait time distribution */
  var waitBuckets=[['<5 min',0,'#10b981'],['5–10 min',0,'#3b82f6'],['10–20 min',0,'#f59e0b'],['20+ min',0,'#ef4444']];
  q.forEach(function(p){
    var w=Math.floor((new Date()-new Date(p.checkedInAt))/60000);
    if(w<5) waitBuckets[0][1]++;
    else if(w<10) waitBuckets[1][1]++;
    else if(w<20) waitBuckets[2][1]++;
    else waitBuckets[3][1]++;
  });
  var waitChart=_card(
    '<div style="font-size:13px;font-weight:700;color:#111111;margin-bottom:14px">Wait Time Distribution</div>'+
    (q.length
      ?waitBuckets.map(function(b){
        var pct=q.length?Math.round(b[1]/q.length*100):0;
        return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'+
          '<span style="font-size:12px;color:#555555;width:70px;flex-shrink:0">'+b[0]+'</span>'+
          '<div style="flex:1;height:8px;border-radius:4px;background:#f0f1ec;overflow:hidden">'+
            '<div style="height:100%;background:'+b[2]+';border-radius:4px;width:'+pct+'%"></div>'+
          '</div>'+
          '<span style="font-size:12px;font-weight:700;color:#111111;width:20px;text-align:right">'+b[1]+'</span>'+
        '</div>';
      }).join('')
      :'<div style="font-size:13px;color:#777777;text-align:center;padding:16px">No queue data yet</div>')
  );

  return '<div style="padding:20px;max-width:1100px">'+
    kpiHtml+
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">'+barChart+deptChart+waitChart+'</div>'+
  '</div>';
}

function _rAptEditPage() {
  var apt = _R._editApt;
  if(!apt) { _R.tab='appointments'; _rRec(); return ''; }
  var back = '<button onclick="_rTab(\'appointments\')" style="display:flex;align-items:center;gap:6px;font-size:13px;color:#555555;border:none;background:transparent;cursor:pointer;font-family:inherit;margin-bottom:28px">'+_svgIcon('back')+' Back to Appointments</button>';
  var todayIso = new Date().toISOString().slice(0,10);
  var SLOTS = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'];
  return '<div style="padding:28px 32px">'+back+
    '<div style="font-size:24px;font-weight:800;color:#111111;margin-bottom:4px">Edit Appointment</div>'+
    '<div style="font-size:15px;color:#777777;margin-bottom:24px">Ref: <strong>'+apt.ref+'</strong> · Patient: <strong>'+(apt.name||'—')+'</strong></div>'+
    '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;padding:22px;max-width:640px">'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">'+
        _frmSel('ae-dept','DEPARTMENT *',DEPARTMENTS.map(function(d){return {v:d.name,label:d.name};}),apt.dept)+
        '<div><label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#555555;margin-bottom:6px">DATE *</label>'+
          '<input id="ae-date" type="date" min="'+todayIso+'" value="'+(apt.date||todayIso)+'" style="width:100%;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box"></div>'+
      '</div>'+
      '<div><label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#555555;margin-bottom:8px">NEW TIME SLOT</label>'+
        '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">'+
          SLOTS.map(function(t){
            var sel=apt.time===t;
            return '<button data-edit-slot="'+t+'" style="padding:8px 4px;border-radius:7px;border:1.5px solid '+(sel?'#0F6E56':'#e0e0e0')+';background:'+(sel?'#f0fdfa':'#fff')+';color:'+(sel?'#1A4A9B':'#111111')+';font-size:13px;font-weight:'+(sel?'700':'400')+';cursor:pointer;font-family:inherit">'+t+'</button>';
          }).join('')+
        '</div>'+
      '</div>'+
      '<div id="ae-selected-slot" style="margin-top:10px;font-size:13px;color:#0F6E56;font-weight:600">'+(apt.time?'Selected: '+apt.time:'')+'</div>'+
    '</div>'+
    '<div style="display:flex;gap:10px;margin-top:14px">'+
      '<button onclick="_rAptSaveEdit()" style="padding:14px 28px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Save changes</button>'+
      '<button onclick="_rAptCancel(\''+apt.id+'\')" style="padding:14px 20px;border-radius:10px;border:1.5px solid #fca5a5;background:#fff;color:#dc2626;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Cancel appointment</button>'+
      '<button onclick="_rTab(\'appointments\')" style="padding:14px 20px;border-radius:10px;border:1.5px solid #e0e0e0;background:#fff;color:#555555;font-size:14px;cursor:pointer;font-family:inherit">Discard</button>'+
    '</div>'+
  '</div>';
}


/* ═══════════════════════════════════════════════════════════════════════
   REGISTER NEW PATIENT (standalone page)
═══════════════════════════════════════════════════════════════════════ */
function _rRegisterNew() {
  var back='<button onclick="_rTab(\'overview\')" style="display:flex;align-items:center;gap:6px;font-size:13px;color:#555555;border:none;background:transparent;cursor:pointer;font-family:inherit;margin-bottom:28px">'+_svgIcon('back')+' Back to Overview</button>';
  return '<div style="padding:28px 32px">'+back+
    '<div style="display:grid;grid-template-columns:1fr 300px;gap:24px;align-items:start">'+
      '<div>'+
        '<div style="margin-bottom:24px">'+
          '<div style="font-size:24px;font-weight:800;color:#111111;margin-bottom:6px">Register New Patient</div>'+
          '<div style="font-size:15px;color:#777777">Add a new patient profile to the NIHMS database.</div>'+
        '</div>'+
        '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;padding:22px">'+
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;color:#0F6E56">'+
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>'+
            '<span style="font-size:13px;font-weight:700">Patient details</span>'+
          '</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+
            _frmInp('nr-fn','FIRST NAME *','')+ _frmInp('nr-ln','LAST NAME *','')+
            _frmInpId()+ _frmInp('nr-dob','DATE OF BIRTH','','date')+
            _frmSel('nr-gen','GENDER',[{v:'',label:'— Select —'},{v:'female',label:'Female'},{v:'male',label:'Male'},{v:'non-binary',label:'Non-binary'},{v:'prefer_not_to_say',label:'Prefer not to say'}])+
            _frmSel('nr-blood','BLOOD TYPE',[{v:'',label:'— Unknown —'},{v:'A+',label:'A+'},{v:'A-',label:'A-'},{v:'B+',label:'B+'},{v:'B-',label:'B-'},{v:'AB+',label:'AB+'},{v:'AB-',label:'AB-'},{v:'O+',label:'O+'},{v:'O-',label:'O-'}])+
            _frmInp('nr-ph','PHONE NUMBER *','','tel')+ _frmInp('nr-em','EMAIL','','email')+
          '</div>'+
          '<div style="margin-top:14px">'+_frmInp('nr-addr','ADDRESS','')+'</div>'+

        /* ── ID Document Upload ── */
        '<div style="margin-top:18px;background:#fff;border-radius:14px;border:1px solid #e0e0e0;padding:20px">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' +
            '<span style="font-size:13px;font-weight:700;color:#111111">ID Document Upload</span>' +
            '<span style="font-size:11px;color:#777777;margin-left:4px">(optional — SA ID Book, Smart ID Card, or Passport scan)</span>' +
          '</div>' +
          '<div id="nr-id-drop" onclick="document.getElementById(\'nr-id-file\').click()" ' +
               'ondragover="event.preventDefault();this.style.borderColor=\'#0F6E56\';this.style.background=\'#f0fdfa\'" ' +
               'ondragleave="this.style.borderColor=\'#e0e0e0\';this.style.background=\'#f9fafb\'" ' +
               'ondrop="_rIdFileDrop(event)" ' +
               'style="border:2px dashed #e0e0e0;border-radius:12px;padding:28px 20px;text-align:center;cursor:pointer;background:#f9fafb;transition:all .2s">' +
            '<div style="font-size:32px;margin-bottom:8px">📄</div>' +
            '<div style="font-size:14px;font-weight:600;color:#111111;margin-bottom:4px">Click to upload or drag &amp; drop</div>' +
            '<div style="font-size:12px;color:#777777">JPG · PNG · PDF · Max 5 MB</div>' +
            '<input id="nr-id-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" ' +
                   'style="display:none" onchange="_rIdFileSelect(this)">' +
          '</div>' +
          '<div id="nr-id-preview" style="display:none;margin-top:14px">' +
            '<!-- preview injected by _rIdFileSelect -->' +
          '</div>' +
        '</div>' +

        '</div>'+
        '<div style="display:flex;gap:10px;margin-top:14px">'+
          '<button onclick="_rSaveNewPatient()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>'+
            'Register patient'+
          '</button>'+
          '<button onclick="_rTab(\'overview\')" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">Cancel</button>'+
        '</div>'+
      '</div>'+
      '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;padding:18px">'+
        '<div style="font-size:13px;font-weight:700;color:#111111;margin-bottom:12px">Recently registered</div>'+
        ((_R.recentPatients && _R.recentPatients.length)
          ? _R.recentPatients.map(function(p){
              return '<div style="padding:8px 12px;border-bottom:1px solid #f0f1ec;display:flex;align-items:center;gap:8px">' +
                '<div style="width:30px;height:30px;border-radius:50%;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">' +
                  ((p.firstName||'?')[0]+(p.lastName||'?')[0]).toUpperCase() +
                '</div>' +
                '<div style="flex:1;min-width:0">' +
                  '<div style="font-size:12px;font-weight:600;color:#111111">'+(p.firstName||'')+' '+(p.lastName||'')+'</div>' +
                  '<div style="font-size:11px;color:#777777;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(p.nationalId||p.id||'')+(p.phone?' · '+p.phone:'')+'</div>' +
                '</div>' +
                '<button onclick="_rOpenPatientFile(\''+encodeURIComponent(p.nationalId||p.id||'')+'\')" style="padding:3px 8px;border-radius:5px;border:1px solid #e0e0e0;background:#fff;font-size:10px;color:#0F6E56;cursor:pointer;font-family:inherit;flex-shrink:0">View</button>' +
              '</div>';
            }).join('')
          : (_R.loadingData
              ? '<div style="padding:14px;text-align:center;font-size:12px;color:#777777">⏳ Loading patients…</div>'
              : '<div style="padding:14px;text-align:center;font-size:12px;color:#777777">No patients registered yet.<br>Registered patients will appear here.</div>'))+
      '</div>'+
    '</div>'+
  '</div>';
}

window._rSaveNewPatient = async function() {
  function _v(id){ var el=document.getElementById(id); return el?el.value.trim():''; }
  var fn=_v('nr-fn'),ln=_v('nr-ln'),id=_v('nr-id'),ph=_v('nr-ph');
  var dob=_v('nr-dob'),gen=_v('nr-gen'),blood=_v('nr-blood'),em=_v('nr-em'),addr=_v('nr-addr');
  /* ── Normalize gender/bloodType to match backend enum ── */
  var genMap = { 'female':'female','male':'male','other':'non-binary','non-binary':'non-binary','prefer_not_to_say':'prefer_not_to_say' };
  var genNorm = genMap[(gen||'').toLowerCase()] || 'prefer_not_to_say';
  var bloodNorm = blood || 'unknown';
  /* ── Validate all required fields at once — highlight every error ── */
  var hasErr = false;

  if (!fn) { _frmErr('nr-fn', 'First name is required'); hasErr = true; }
  if (!ln) { _frmErr('nr-ln', 'Last name is required');  hasErr = true; }
  if (!id) { _frmErr('nr-id', 'SA ID or Passport number is required'); hasErr = true; }
  else if (!/^[A-Za-z0-9]{6,20}$/.test(id.replace(/\s/g,''))) {
    _frmErr('nr-id', 'Enter a valid SA ID (13 digits) or passport number'); hasErr = true;
  }
  if (!ph) { _frmErr('nr-ph', 'Phone number is required'); hasErr = true; }
  else if (!/^\+?[0-9\s\-]{7,15}$/.test(ph)) {
    _frmErr('nr-ph', 'Enter a valid phone number (e.g. +27821234567)'); hasErr = true;
  }
  if (em && !/^[^@]+@[^@]+\.[^@]+$/.test(em)) {
    _frmErr('nr-em', 'Enter a valid email address'); hasErr = true;
  }

  if (hasErr) {
    UI.showToast('Please fix the highlighted fields before saving', 'err');
    /* Scroll first error into view */
    var firstErr = document.querySelector('[id$="-err"]:not([style*="none"])');
    if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  /* ── Disable the save button to prevent double-submit ── */
  var saveBtn = document.querySelector('[onclick="_rSaveNewPatient()"]');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

  /* ── POST to MongoDB via API — timed ── */
  var t0 = Date.now();
  var apiPt = null;
  var apiErr = null;

  try {
    var res = await API._fetchDirect('/patients', {
      method: 'POST',
      body: JSON.stringify({
        firstName:   fn,
        lastName:    ln,
        nationalId:  id,
        dateOfBirth: dob || undefined,
        gender:      genNorm,
        phone:       ph,
        email:       em || undefined,
        bloodType:   bloodNorm,
        address:     addr || undefined,
      })
    });
    /* API returns the created document */
    apiPt = res && (res.data || res);
  } catch(e) {
    apiErr = e;
  }

  var elapsed = Date.now() - t0;

  /* Re-enable button */
  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Register patient'; }

  /* ── Handle API errors ── */
  if (apiErr || !apiPt) {
    /* 409 = duplicate nationalId */
    var msg = (apiErr && apiErr.message) || '';
    if (msg.includes('409') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('exists')) {
      _frmErr('nr-id', 'A patient with this ID already exists in NIHMS');
      UI.showToast('Duplicate ID — this patient is already registered', 'err');
    } else {
      UI.showToast('Could not save to database — check connection and try again', 'err');
    }
    return;
  }

  /* ── Success: cache, update recent list, show timed confirmation ── */
  var created = apiPt._id ? apiPt : null;
  var newPt = {
    _id:        (created && created._id)        || id,
    id:         (created && created.nationalId) || id,
    nationalId: (created && created.nationalId) || id,
    firstName:  fn,  lastName: ln,
    name:       fn + ' ' + ln,
    dob:        dob, gender: gen, bloodType: blood,
    phone:      ph,  email:  em,  address:   addr,
  };
  if (!_R.recentPatients) _R.recentPatients = [];
  var savedNorm = _cachePt(newPt);
  _R.recentPatients.unshift(savedNorm);
  if (_R.recentPatients.length > 10) _R.recentPatients.pop();

  /* ── Upload ID document if one was selected ── */
  var docUploaded = false;
  var docError    = null;
  var docElapsed  = 0;

  if (_R_idDoc.base64 && apiPt && apiPt._id) {
    var t0doc = Date.now();
    try {
      /* Build FormData with the base64 file */
      var formData = new FormData();
      /* Convert base64 back to Blob for multipart upload */
      var byteStr  = atob(_R_idDoc.base64);
      var ab       = new ArrayBuffer(byteStr.length);
      var ia       = new Uint8Array(ab);
      for (var i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
      var blob     = new Blob([ab], { type: _R_idDoc.mimeType });
      formData.append('document', blob, _R_idDoc.fileName || 'id_document');
      formData.append('documentType', 'ID_DOCUMENT');
      formData.append('patientId', apiPt._id);

      var docRes = await API._fetchDirect(
        '/patients/' + apiPt._id + '/documents',
        { method: 'POST', body: formData }   /* No Content-Type — browser sets multipart boundary */
      ).catch(function(e){ return { _err: e && e.message }; });

      if (docRes && !docRes._err) {
        docUploaded = true;
        docElapsed  = Date.now() - t0doc;
      } else {
        /* Fallback: try base64 JSON upload if multipart not supported */
        var b64Res = await API._fetchDirect(
          '/patients/' + apiPt._id + '/documents',
          {
            method: 'POST',
            body: JSON.stringify({
              documentType: 'ID_DOCUMENT',
              fileName:     _R_idDoc.fileName,
              mimeType:     _R_idDoc.mimeType,
              sizeKb:       _R_idDoc.sizeKb,
              base64:       _R_idDoc.base64,
            })
          }
        ).catch(function(){ return null; });
        docUploaded = !!(b64Res && !b64Res._err);
        docElapsed  = Date.now() - t0doc;
      }
    } catch(e) {
      docError   = e.message;
      docElapsed = Date.now() - t0doc;
    }

    /* Clear the file state after attempt */
    _rIdClearFile();
  }

  /* ── Confirmation banner ── */
  /* Show confirmation on the current page before navigating */
  var banner = document.createElement('div');
  banner.style.cssText = [
    'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999',
    'background:#f0fdf4;border:1.5px solid #86efac;border-radius:14px',
    'padding:16px 24px;box-shadow:0 4px 24px rgba(0,0,0,.12)',
    'display:flex;align-items:start;gap:14px;max-width:480px;width:90%',
    'animation:_nihmsSlideIn .25s ease',
  ].join(';');
  var docLine = '';
  if (_R_idDoc.file || docUploaded || docError) {
    /* Document was attempted */
  }
  if (docUploaded) {
    docLine = '<div style="margin-top:6px;font-size:12px;color:#166534">' +
              '📎 ID document uploaded successfully (' + docElapsed + ' ms)</div>';
  } else if (docError) {
    docLine = '<div style="margin-top:6px;font-size:12px;color:#d97706">' +
              '⚠ ID document upload failed — you can upload it later from the patient file. Error: ' + docError + '</div>';
  }

  banner.innerHTML = [
    '<div style="font-size:24px;flex-shrink:0">✅</div>',
    '<div style="flex:1">',
      '<div style="font-size:14px;font-weight:700;color:#14532d;margin-bottom:4px">',
        'Patient registered successfully',
      '</div>',
      '<div style="font-size:12px;color:#166534;line-height:1.6">',
        '<strong>' + fn + ' ' + ln + '</strong> · ID: ' + id + '<br>',
        'A new patient profile has been created and saved to NIHMS.',
        docLine,
      '</div>',
    '</div>',
  ].join('');

  /* Add keyframe if not already there */
  if (!document.getElementById('nihms-anim')) {
    var anim = document.createElement('style');
    anim.id = 'nihms-anim';
    anim.textContent = '@keyframes _nihmsSlideIn{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translateX(-50%)}}';
    document.head.appendChild(anim);
  }
  document.body.appendChild(banner);

  /* Fire a toast immediately — visible even after page re-render */
  UI.showToast('✅ ' + fn + ' ' + ln + ' registered successfully', 'ok');

  /* ── Navigate: if arrived from book flow, return there with patient pre-filled ── */
  var fromBook = _R.bk && _R.bk._fromBook;
  if (fromBook) {
    /* Clear the flag so future registrations go to overview */
    _R.bk._fromBook = false;
    /* Pre-fill booking flow with the newly registered patient */
    _R.bk.step    = 'details';
    _R.bk.id      = newPt.nationalId || newPt.id;
    _R.bk.patient = newPt;
    _R.bk.result  = 'found';
    setTimeout(function() {
      _rTab('book');
      setTimeout(function() {
        document.body.appendChild(banner);
        banner.style.opacity = '1';
        setTimeout(function() {
          banner.style.transition = 'opacity .5s';
          banner.style.opacity = '0';
          setTimeout(function() { banner.remove(); }, 500);
        }, 3000);
      }, 120);
    }, 500);
  } else {
    /* Navigate to overview, then re-attach the detail banner on top */
    setTimeout(function() {
      _rTab('overview');
      setTimeout(function() {
        document.body.appendChild(banner);
        banner.style.opacity = '1';
        setTimeout(function() {
          banner.style.transition = 'opacity .5s';
          banner.style.opacity = '0';
          setTimeout(function() { banner.remove(); }, 500);
        }, 3000);
      }, 120);
    }, 500);
  }
};


/* ── Appointment edit/cancel ──────────────────────────────────────────── */
window._rAptEdit = function(id) {
  var apt = _R.appointments.find(function(a){return a.id===id;});
  if(!apt){ UI.showToast('Appointment not found','err'); return; }
  /* Show a simple inline edit modal via prompt-style UI */
  _R._editApt = apt;
  _R.tab = 'apt-edit';
  _rRec();
};

window._rAptCancel = async function(id) {
  var apt = _R.appointments.find(function(a){ return a.id===id || a._id===id; });
  if (!apt) return;
  if (!confirm('Cancel appointment '+apt.ref+' for '+(apt.name||'this patient')+'?\n\nThis cannot be undone. The patient will be notified.')) return;

  /* Update in-memory */
  apt.status   = 'cancelled';
  apt.verified = false;
  apt.cancelledAt = new Date().toISOString();
  apt.cancelledBy = 'Receptionist';

  /* ── Save cancellation to database ── */
  var saved = false;
  try {
    var aptId = apt._id || apt.id;
    var res = await API._fetchDirect('/appointments/'+aptId, {
      method: 'PATCH',
      body: JSON.stringify({
        status:       'cancelled',
        verified:     false,
        cancelledAt:  new Date().toISOString(),
        cancelledBy:  'Receptionist',
      })
    }).catch(function(){ return null; });
    if (res && (res._id || res.id || res.success)) saved = true;
  } catch(_){}

  /* ── Notify patient ── */
  var msg = 'NIHMS: Your appointment '+apt.ref+' on '+apt.date+' at '+apt.time+' ('+apt.dept+') has been CANCELLED. Please contact reception to reschedule. Johannesburg CHC.';
  var emailHtml = '<div style="font-family:inherit;max-width:500px;margin:0 auto"><div style="background:#dc2626;padding:20px;border-radius:10px 10px 0 0;text-align:center"><h2 style="color:#fff;margin:0">Appointment Cancelled</h2></div><div style="background:#FCEBEB;padding:20px;border-radius:0 0 10px 10px"><p>Dear patient,</p><p>Your appointment has been cancelled:</p><table style="width:100%;border-collapse:collapse"><tr><td style="padding:8px;color:#777777;font-size:13px">Reference</td><td style="padding:8px;font-weight:700;color:#dc2626">'+apt.ref+'</td></tr><tr><td style="padding:8px;color:#777777;font-size:13px">Department</td><td style="padding:8px;font-weight:600">'+apt.dept+'</td></tr><tr><td style="padding:8px;color:#777777;font-size:13px">Original Date</td><td style="padding:8px;font-weight:600">'+apt.date+'</td></tr><tr><td style="padding:8px;color:#777777;font-size:13px">Original Time</td><td style="padding:8px;font-weight:600">'+apt.time+'</td></tr></table><p style="font-size:13px;margin-top:14px">Please contact reception to reschedule your appointment.</p><p style="font-size:12px;color:#777777">Johannesburg CHC · Reception</p></div></div>';
  try {
    if (apt.phone||apt.patientPhone) await API._fetchDirect('/notifications/sms',{method:'POST',body:JSON.stringify({to:apt.phone||apt.patientPhone,message:msg})}).catch(function(){});
    if (apt.email||apt.patientEmail) await API._fetchDirect('/notifications/email',{method:'POST',body:JSON.stringify({to:apt.email||apt.patientEmail,subject:'NIHMS — Appointment cancelled: '+apt.ref,html:emailHtml})}).catch(function(){});
  } catch(_){}

  /* Bust booked-slot cache for this date so the freed slot shows as available */
  var _aptDate = (apt.date || '').slice(0, 10);
  if (_aptDate) {
    if (_R.ci && _R.ci.bookedSlots) delete _R.ci.bookedSlots[_aptDate];
    if (_R.bk && _R.bk.bookedSlots) delete _R.bk.bookedSlots[_aptDate];
  }

  /* If we were on the edit page, go back to appointments */
  if (_R.tab === 'apt-edit') _R._editApt = null;
  _rTab('appointments');
  UI.showToast('Appointment '+apt.ref+' cancelled'+(saved?' and saved to database':' (local only — check API connection)'),'ok');
};

/* ── Add apt-edit tab ─────────────────────────────────────────────────── */


/* ═══════════════════════════════════════════════════════════════════════
   PATIENT FILE — Search · View · Edit
═══════════════════════════════════════════════════════════════════════ */
function _rPatientFile() {
  var pf = _R.patientFile || { step:'search', id:'', patient:null, notFound:false, editing:false };
  if (!_R.patientFile) _R.patientFile = pf;

  var back = '<button onclick="_rTab(\'overview\')" style="display:flex;align-items:center;gap:6px;font-size:13px;color:#555555;border:none;background:transparent;cursor:pointer;font-family:inherit;margin-bottom:28px">'+_svgIcon('back')+' Back to Overview</button>';

  /* ── EDIT MODE ── */
  if (pf.editing && pf.patient) {
    var pt = pf.patient;
    return '<div style="padding:28px 32px">' + back +
      '<div style="display:grid;grid-template-columns:1fr 300px;gap:24px;align-items:start">' +
        '<div>' +
          '<div style="margin-bottom:24px">' +
            '<div style="font-size:24px;font-weight:800;color:#111111;margin-bottom:4px">Edit Patient Profile</div>' +
            '<div style="font-size:14px;color:#777777">Update the details for <strong>'+(pt.firstName||'')+' '+(pt.lastName||'')+'</strong> · '+pt.id+'</div>' +
          '</div>' +
          '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;padding:22px">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
              _frmInp('pf-fn',  'FIRST NAME *',    '', 'text', pt.firstName||'') +
              _frmInp('pf-ln',  'LAST NAME *',     '', 'text', pt.lastName||'')  +
              _frmInp('pf-id',  'SA ID / PASSPORT','', 'text', pt.id||'')        +
              _frmInp('pf-dob', 'DATE OF BIRTH',   '', 'date', pt.dob||'')       +
              _frmSel('pf-gen', 'GENDER', [{v:'',label:'— Select —'},{v:'Female',label:'Female'},{v:'Male',label:'Male'},{v:'Other',label:'Other'}], pt.gender||'') +
              _frmSel('pf-blood','BLOOD TYPE',[{v:'',label:'— Unknown —'},{v:'A+',label:'A+'},{v:'A-',label:'A-'},{v:'B+',label:'B+'},{v:'B-',label:'B-'},{v:'AB+',label:'AB+'},{v:'AB-',label:'AB-'},{v:'O+',label:'O+'},{v:'O-',label:'O-'}],pt.bloodType||'') +
              _frmInp('pf-ph',  'PHONE NUMBER',    '', 'tel',  pt.phone||'')     +
              _frmInp('pf-em',  'EMAIL',           '', 'email',pt.email||'')     +
            '</div>' +
            '<div style="margin-top:14px">' + _frmInp('pf-addr','ADDRESS','', 'text', pt.address||'') + '</div>' +
          '</div>' +
          '<div style="display:flex;gap:10px;margin-top:14px">' +
            '<button onclick="_rPfSave()" style="flex:1;padding:14px;border-radius:10px;border:none;background:#0F6E56;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit">Save changes</button>' +
            '<button onclick="_R.patientFile.editing=false;_rRec()" style="padding:14px 20px;border-radius:10px;border:1.5px solid #e0e0e0;background:#fff;color:#555555;font-size:14px;cursor:pointer;font-family:inherit">Cancel</button>' +
          '</div>' +
        '</div>' +
        _pfSidePanel(pt) +
      '</div>' +
    '</div>';
  }

  /* ── VIEW MODE ── */
  if (pf.patient && !pf.editing) {
    var pt = pf.patient;
    var initials = (((pt.firstName||'?')[0])+((pt.lastName||'?')[0])).toUpperCase();
    var ptApts = _R.appointments.filter(function(a){ return a.patientId===pt.id||a.patientId===pt.nationalId; }).sort(function(a,b){ return (b.date||'') > (a.date||'') ? 1 : -1; });

    return '<div style="padding:28px 32px">' + back +
      '<div style="display:grid;grid-template-columns:1fr 300px;gap:24px;align-items:start">' +
        '<div>' +
          /* Profile card */
          '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;padding:22px;margin-bottom:16px">' +
            '<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">' +
              '<div style="width:52px;height:52px;border-radius:50%;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex-shrink:0">'+initials+'</div>' +
              '<div style="flex:1">' +
                '<div style="font-size:20px;font-weight:800;color:#111111">'+(pt.firstName||'')+' '+(pt.lastName||'')+'</div>' +
                '<div style="font-size:13px;color:#777777;margin-top:2px">🪪 '+pt.id+(pt.gender?' · '+pt.gender:'')+(pt.dob?' · DOB: '+pt.dob:'')+'</div>' +
              '</div>' +
              '<button onclick="_R.patientFile.editing=true;_rRec()" style="display:flex;align-items:center;gap:6px;padding:9px 16px;border-radius:8px;border:none;background:#0F6E56;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">' +
                '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
                'Edit profile' +
              '</button>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
              [['Phone', pt.phone||'—'],['Email', pt.email||'—'],['Blood type', pt.bloodType||'—'],['Address', pt.address||'—']].map(function(r){
                return '<div style="padding:10px 12px;background:#f4f5f0;border-radius:8px">' +
                  '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#777777;margin-bottom:3px">'+r[0]+'</div>' +
                  '<div style="font-size:13px;font-weight:600;color:#111111">'+r[1]+'</div>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>' +
          /* Appointment history */
          '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;overflow:hidden">' +
            '<div style="padding:12px 16px;border-bottom:1px solid #f0f1ec;display:flex;align-items:center;justify-content:space-between">' +
              '<div style="font-size:13px;font-weight:700;color:#111111">Appointment History ('+ptApts.length+')</div>' +
              '<button onclick="_rTab(\'book\');_R.bk.step=\'search\';_R.bk.id=\''+pt.id+'\';_rRec()" style="font-size:12px;color:#0F6E56;border:none;background:transparent;cursor:pointer;font-family:inherit">+ Book new appointment</button>' +
            '</div>' +

        '</div>' +
        /* All patients list */
        '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;overflow:hidden">' +
          '<div style="padding:12px 16px;border-bottom:1px solid #f0f1ec;font-size:13px;font-weight:700;color:#111111">All Registered Patients ('+NIHMS_PATIENTS.length+')</div>' +
          NIHMS_PATIENTS.map(function(p,i){
            return '<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid #f4f5f0;background:'+(i%2===0?'#fff':'#f4f5f0')+'">' +
              '<div style="width:32px;height:32px;border-radius:50%;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">'+(((p.firstName||'?')[0])+((p.lastName||'?')[0])).toUpperCase()+'</div>' +
              '<div style="flex:1;min-width:0">' +
                '<div style="font-size:13px;font-weight:600;color:#111111">'+(p.firstName||'')+' '+(p.lastName||'')+'</div>' +
                '<div style="font-size:11px;color:#777777">'+p.id+(p.phone?' · '+p.phone:'')+'</div>' +
              '</div>' +
              '<button onclick="_rOpenPatientFile(\''+p.id+'\')" style="padding:5px 12px;border-radius:6px;border:1px solid #e0e0e0;background:#fff;font-size:12px;color:#0F6E56;cursor:pointer;font-family:inherit;font-weight:600">Open file</button>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;padding:16px">' +
        '<div style="font-size:13px;font-weight:700;color:#111111;margin-bottom:12px">Quick tips</div>' +
        '<div style="font-size:12px;color:#777777;line-height:1.7">' +
          '• Search by SA ID or passport number<br>' +
          '• Click <strong>Open file</strong> to view a patient record<br>' +
          '• Click <strong>Edit profile</strong> to update contact details<br>' +
          '• View full appointment history from the patient file<br>' +
          '• Book a new appointment directly from the patient file' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

  /* ── SEARCH MODE (default) ── */
  return '<div style="padding:28px 32px">' +
    '<div style="margin-bottom:24px">' +
      '<div style="font-size:24px;font-weight:800;color:#111111;margin-bottom:4px">Patient Files</div>' +
      '<div style="font-size:14px;color:#777777">Search by SA ID or passport number</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 320px;gap:24px;align-items:start">' +
      '<div>' +
        '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;padding:22px;margin-bottom:16px">' +
          '<div style="font-size:14px;font-weight:700;color:#111111;margin-bottom:14px">Search Patient Record</div>' +
          '<div style="display:flex;gap:10px">' +
            '<input id="pf-search-id" type="text" placeholder="Enter SA ID or Passport Number" value="'+(pf.id||'')+'" style="flex:1;padding:11px 14px;border-radius:8px;border:1.5px solid #e0e0e0;font-size:14px;font-family:inherit;outline:none" onkeydown="if(event.key===\'Enter\')window._rPfSearch&&window._rPfSearch()">' +
            '<button onclick="window._rPfSearch&&window._rPfSearch()" style="padding:11px 22px;border-radius:8px;border:none;background:#0F6E56;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Search</button>' +
          '</div>' +
          (pf.notFound ? '<div style="margin-top:10px;padding:10px 14px;background:#fef2f2;border-radius:8px;color:#dc2626;font-size:13px">No patient found for <strong>'+(pf.id||'')+'</strong>. Try registering them.</div>' : '') +
        '</div>' +
        '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;overflow:hidden">' +
          '<div style="padding:12px 16px;border-bottom:1px solid #f0f1ec;font-size:13px;font-weight:700;color:#111111">All Registered Patients ('+NIHMS_PATIENTS.length+')</div>' +
          (NIHMS_PATIENTS.length === 0
            ? '<div style="padding:24px;text-align:center;font-size:13px;color:#777777">No patients registered yet.</div>'
            : NIHMS_PATIENTS.map(function(p,i){
                return '<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid #f4f5f0;background:'+(i%2===0?'#fff':'#f4f5f0')+'">' +
                  '<div style="width:32px;height:32px;border-radius:50%;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">'+(((p.firstName||'?')[0])+((p.lastName||'?')[0])).toUpperCase()+'</div>' +
                  '<div style="flex:1;min-width:0">' +
                    '<div style="font-size:13px;font-weight:600;color:#111111">'+(p.firstName||'')+' '+(p.lastName||'')+'</div>' +
                    '<div style="font-size:11px;color:#777777">'+p.id+(p.phone?' · '+p.phone:'')+'</div>' +
                  '</div>' +
                  '<button onclick="_rOpenPatientFile(\''+p.id+'\')" style="padding:5px 12px;border-radius:6px;border:1px solid #e0e0e0;background:#fff;font-size:12px;color:#0F6E56;cursor:pointer;font-family:inherit;font-weight:600">Open file</button>' +
                '</div>';
              }).join('')) +
        '</div>' +
      '</div>' +
      '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;padding:16px">' +
        '<div style="font-size:13px;font-weight:700;color:#111111;margin-bottom:12px">Quick tips</div>' +
        '<div style="font-size:12px;color:#777777;line-height:1.7">' +
          '• Search by SA ID or passport number<br>' +
          '• Click <strong>Open file</strong> to view a patient record<br>' +
          '• Click <strong>Edit profile</strong> to update contact details<br>' +
          '• View full appointment history from the patient file<br>' +
          '• Book a new appointment directly from the patient file' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

/* Side panel for patient file — shows their upcoming appointments */
function _pfSidePanel(pt) {
  var ptApts = _R.appointments.filter(function(a){
    return (a.patientId===pt.id||a.patientId===pt.nationalId) && a.status!=='cancelled';
  }).sort(function(a,b){ return (a.date||'') < (b.date||'') ? -1 : 1; }).slice(0,5);
  var today = new Date().toISOString().slice(0,10);
  return '<div style="display:flex;flex-direction:column;gap:14px">' +
    '<div style="background:#fff;border-radius:14px;border:1px solid #e0e0e0;overflow:hidden">' +
      '<div style="padding:12px 16px;border-bottom:1px solid #f0f1ec;font-size:13px;font-weight:700;color:#111111">Upcoming for this patient</div>' +
      (ptApts.filter(function(a){return (a.date||'').slice(0,10)>=today;}).length
        ? ptApts.filter(function(a){return (a.date||'').slice(0,10)>=today;}).map(function(a){
            return '<div style="padding:9px 14px;border-bottom:1px solid #f4f5f0">' +
              '<div style="font-size:12px;font-weight:700;color:#111111">'+a.ref+'</div>' +
              '<div style="font-size:11px;color:#777777">'+(a.dept||'')+'</div>' +
              '<div style="font-size:11px;color:#777777">'+(a.date||'')+' @ '+(a.time||'')+'</div>' +
            '</div>';
          }).join('')
        : '<div style="padding:14px;text-align:center;font-size:12px;color:#777777">No upcoming appointments</div>') +
    '</div>' +
    '<div style="background:#f0fdfa;border-radius:14px;border:1px solid #99f6e4;padding:14px">' +
      '<div style="font-size:12px;font-weight:700;color:#0F6E56;margin-bottom:6px">Patient summary</div>' +
      '<div style="font-size:12px;color:#555555">'+_R.appointments.filter(function(a){return a.patientId===pt.id||a.patientId===pt.nationalId;}).length+' total appointments</div>' +
      '<div style="font-size:12px;color:#555555">'+_R.appointments.filter(function(a){return (a.patientId===pt.id||a.patientId===pt.nationalId)&&a.verified;}).length+' verified</div>' +
    '</div>' +
  '</div>';
}

/* Search handler */
window._rPfSearch = function() {
  var id = (document.getElementById('pf-search-id')||{value:''}).value.trim();
  if (!id) { UI.showToast('Please enter an ID or passport number','err'); return; }
  _R.patientFile = { step:'search', id:id, patient:null, notFound:false, editing:false };
  var pt = null;
  if (!pt) {
    /* Try API */
    API._fetchDirect('/patients?nationalId='+encodeURIComponent(id)+'&limit=1',{method:'GET'}).then(function(res){
      var apiPt = res&&res.data&&res.data[0];
      if (apiPt) {
        var apiId=(apiPt.nationalId||apiPt.idNumber||apiPt.id||'').trim();
        if(apiId===id){
  /* Patient cached via _cachePt after API save */
  _R.patientFile.patient=apiPt; }
        else _R.patientFile.notFound=true;
      } else _R.patientFile.notFound=true;
      _rRec();
    }).catch(function(){ _R.patientFile.notFound=true; _rRec(); });
    return;
  }
  _R.patientFile.patient = pt;
  _rRec();
};

/* Open patient file directly from any button */
window._rOpenPatientFile = async function(rawId) {
  var id = decodeURIComponent(rawId || '');
  /* Check local cache first */
  var pt = NIHMS_PATIENTS.find(function(p){
    return p.id === id || p.nationalId === id || p._id === id;
  }) || null;

  /* If not in cache, fetch from API */
  if (!pt) {
    try {
      var r = await API._fetchDirect(
        '/patients?nationalId=' + encodeURIComponent(id) + '&limit=1',
        { method:'GET' }
      ).catch(function(){ return null; });
      var raw = r && r.data && r.data[0];
      if (!raw) {
        /* try by _id */
        var r2 = await API._fetchDirect('/patients/' + encodeURIComponent(id), { method:'GET' }).catch(function(){ return null; });
        raw = r2 && (r2.data || r2);
      }
      if (raw) pt = _cachePt(raw);
    } catch(_) {}
  }

  _R.patientFile = { step:'view', id:id, patient:pt, notFound:!pt, editing:false };
  _R.tab = 'patient-file';
  _rRec();
};

/* Save edits */
window._rPfSave = async function() {
  var pt = _R.patientFile && _R.patientFile.patient;
  if (!pt) return;
  function _v(id){ var el=document.getElementById(id); return el?el.value.trim():''; }
  var fn=_v('pf-fn'), ln=_v('pf-ln'), id=_v('pf-id'), dob=_v('pf-dob');
  var gen=_v('pf-gen'), blood=_v('pf-blood'), ph=_v('pf-ph'), em=_v('pf-em'), addr=_v('pf-addr');
  if(!fn){UI.showToast('First name required','err');return;}
  if(!ln){UI.showToast('Last name required','err');return;}
  /* Update in-memory */
  pt.firstName=fn; pt.lastName=ln; pt.name=fn+' '+ln;
  if(id) pt.id=id;
  if(dob) pt.dob=dob;
  if(gen) pt.gender=gen;
  if(blood) pt.bloodType=blood;
  if(ph) pt.phone=ph;
  if(em) pt.email=em;
  if(addr) pt.address=addr;
  /* Update matching appointments */
  _R.appointments.forEach(function(a){ if(a.patientId===pt.id) a.name=fn+' '+ln; });
  /* Save to backend */
  try {
    await API._fetchDirect('/patients/'+(pt._id||pt.id),{
      method:'PATCH',
      body:JSON.stringify({firstName:fn,lastName:ln,nationalId:id||pt.id,dateOfBirth:dob,gender:gen,bloodType:blood,phone:ph,email:em,address:addr})
    }).catch(function(){});
  } catch(_){}
  _R.patientFile.editing=false;
  _rRec();
  UI.showToast(fn+' '+ln+' profile updated','ok');
};


/* ═══════════════════════════════════════════════════════════════════════
   ACTION HANDLERS
═══════════════════════════════════════════════════════════════════════ */

/* Check-in */
window._rCheckinSearch = async function() {
  try {
  var id=(document.getElementById('ci-id')||{value:''}).value.trim();
  if(!id){ UI.showToast('Please enter a National ID or Passport number.','err'); return; }
  _R.ci.id=id;
  _R.ci.notFound=false;

  var patient=null;
  try {
    var res=await API._fetchDirect('/patients?nationalId='+encodeURIComponent(id)+'&limit=1',{method:'GET'}).catch(function(){return null;});
    var apiPt=res&&res.data&&res.data[0];
    /* ── CRITICAL: only accept the API result if the ID actually matches ── */
    if(apiPt) {
      var apiId=(apiPt.nationalId||apiPt.idNumber||apiPt.id||'').trim();
      var apiPP=(apiPt.passport||apiPt.passportNumber||'').trim();
      if(apiId===id||apiPP===id) patient=apiPt;
    }
    if(!patient){
      var res2=await API._fetchDirect('/patients?passport='+encodeURIComponent(id)+'&limit=1',{method:'GET'}).catch(function(){return null;});
      var apiPt2=res2&&res2.data&&res2.data[0];
      if(apiPt2){
        var apiId2=(apiPt2.nationalId||apiPt2.idNumber||apiPt2.id||'').trim();
        var apiPP2=(apiPt2.passport||apiPt2.passportNumber||'').trim();
        if(apiId2===id||apiPP2===id) patient=apiPt2;
      }
    }
  } catch(_){}

  /* API search covers all patients — no local mock DB fallback */

  if(!patient){
    /* ── CASE C: No profile found ── */
    _R.ci.notFound  = true;
    _R.ci.caseC     = true;
    _rRec();
    return;
  }

  /* ── Find appointment: match by patientId (ObjectId), nationalId, or raw id ── */
  var pid    = (patient._id || patient.id || '').toString().trim();
  var today  = new Date().toISOString().slice(0,10);

  var appt = _R.appointments.find(function(a) {
    /* Skip cancelled appointments — cannot check in a cancelled booking */
    if (a.status === 'cancelled') return false;
    /* Match by patient ObjectId OR by the SA ID / passport entered */
    var aPatId = (a.patientId || a.patient || '').toString().trim();
    var match  = aPatId === pid || aPatId === id ||
                 (a.patientNationalId || '').trim() === id;
    if (!match) return false;
    /* Only today's or future appointments */
    var aDate  = (a.date || a.appointmentDate || a.scheduledAt || '').slice(0, 10);
    return aDate >= today;
  }) || null;

  /* ── Normalise dept from visitType on locally-cached appointments ── */
  if (appt && !appt.dept && (appt.visitType || appt.department)) {
    appt.dept = appt.department || _visitTypeToDept(appt.visitType) || 'General Consultation';
  }

  /* ── Also try live API if local list has no match ── */
  if (!appt && pid) {
    try {
      var aRes = await API._fetchDirect(
        '/appointments?patientId=' + encodeURIComponent(pid) +
        '&status=scheduled&status=confirmed&status=checked-in&limit=10',
        { method:'GET' }
      ).catch(function(){ return null; });
      if (aRes && aRes.data && aRes.data.length) {
        /* Take the closest upcoming/today appointment */
        var todayApts = aRes.data.filter(function(a) {
          if (a.status === 'cancelled') return false;
          return (a.date || a.appointmentDate || '').slice(0,10) >= today;
        });
        if (todayApts.length) {
          var raw = todayApts[0];
          appt = {
            id:        raw._id || raw.id,
            _id:       raw._id,
            patientId: pid,
            name:      (patient.firstName||'') + ' ' + (patient.lastName||''),
            dept:      raw.department || raw.dept || _visitTypeToDept(raw.visitType) || 'General Consultation',
            visitType: raw.visitType || '',
            clinician: raw.clinician  || (raw.doctor ? 'Dr ' + (raw.doctor.lastName||raw.doctor.firstName||'') : ''),
            date:      (raw.date || raw.appointmentDate || '').slice(0,10),
            time:      raw.time || raw.appointmentTime || '',
            type:      raw.type || 'booked',
            status:    raw.status || 'scheduled',
            ref:       raw.appointmentNumber || raw.ref || '',
          };
          /* Cache it locally so the slot step can use it */
          _R.appointments.push(appt);
        }
      }
    } catch(_) {}
  }

  /* ── CASE A: Profile found + Appointment found → proceed ── */
  /* ── CASE B: Profile found + No appointment  → show message ── */
  _R.ci = {
    step:         'slot',
    id:           id,
    patient:      patient,
    appt:         appt,
    dept:         appt ? (appt.dept || _visitTypeToDept(appt.visitType) || 'General Consultation') : 'General Consultation',
    result:       null,
    notFound:     false,
    selectedSlot: null,
    caseB:        !appt,   /* true = no appointment found */
  };
  _rRec();
  } catch(err) {
    console.error('_rCheckinSearch error:', err);
    UI.showToast('Search failed: ' + (err && err.message ? err.message : String(err)), 'err');
  }
};

/* Case B: No appointment found — redirect to Book tab with patient pre-filled */
window._rCiBkNow = function() {
  var ci = _R.ci;
  _R.bk = {
    step:         'slot',
    id:           ci.id || '',
    patient:      ci.patient || null,
    notFound:     false,
    slot:         null,
    slotIdx:      null,
    result:       null,
    selectedSlot: null,
    selectedDate: '',
    dept:         ci.dept || 'General Consultation',
    bookedSlots:  {},
  };
  _rTab('book');
};

window._rCiRegister = async function() {
  function _val(id, fallback) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : (fallback || '');
  }
  var fn    = _val('ci-reg-fn');
  var ln    = _val('ci-reg-ln');
  var id    = _val('ci-reg-id') || _R.ci.id || '';
  var dob   = _val('ci-reg-dob');
  var gen   = _val('ci-reg-gen');
  var blood = _val('ci-reg-blood');
  var ph    = _val('ci-reg-ph');
  var em    = _val('ci-reg-em');
  var addr  = _val('ci-reg-addr');

  /* ── Validate all required fields — highlight every error at once ── */
  var hasErr = false;
  if (!fn) { _frmErr('ci-reg-fn', 'First name is required');              hasErr = true; }
  if (!ln) { _frmErr('ci-reg-ln', 'Last name is required');               hasErr = true; }
  if (!id) { _frmErr('ci-reg-id', 'SA ID or Passport number is required'); hasErr = true; }
  else if (!/^[A-Za-z0-9]{6,20}$/.test(id.replace(/\s/g,''))) {
    _frmErr('ci-reg-id', 'Enter a valid SA ID (13 digits) or passport number'); hasErr = true;
  }
  if (!ph) { _frmErr('ci-reg-ph', 'Phone number is required');             hasErr = true; }
  else if (!/^\+?[0-9\s\-]{7,15}$/.test(ph)) {
    _frmErr('ci-reg-ph', 'Enter a valid phone number (e.g. +27821234567)'); hasErr = true;
  }
  if (em && !/^[^@]+@[^@]+\.[^@]+$/.test(em)) {
    _frmErr('ci-reg-em', 'Enter a valid email address'); hasErr = true;
  }
  if (hasErr) {
    UI.showToast('Please fix the highlighted fields before saving', 'err');
    var firstErr = document.querySelector('[id$="-err"]:not([style*="none"])');
    if (firstErr) firstErr.scrollIntoView({ behavior:'smooth', block:'center' });
    return;
  }

  var newPt = {
    id:        id,
    nationalId:id,
    firstName: fn,
    lastName:  ln,
    name:      fn + ' ' + ln,
    dob:       dob,
    gender:    gen || 'Unknown',
    bloodType: blood,
    phone:     ph,
    email:     em,
    address:   addr,
  };

  /* ── POST to MongoDB — timed ── */
  var t0ci = Date.now();
  var apiCiPt = null, apiCiErr = null;
  try {
    var ciRes = await API._fetchDirect('/patients', {
      method: 'POST',
      body: JSON.stringify({ firstName:fn, lastName:ln, nationalId:id,
        dateOfBirth:dob, gender:gen, phone:ph, email:em, bloodType:blood, address:addr })
    });
    apiCiPt = ciRes && (ciRes.data || ciRes);
  } catch(e) { apiCiErr = e; }
  var ciElapsed = Date.now() - t0ci;

  if (apiCiErr || !apiCiPt) {
    var ciMsg = (apiCiErr && apiCiErr.message) || '';
    if (ciMsg.includes('409') || ciMsg.toLowerCase().includes('duplicate')) {
      _frmErr('ci-reg-id', 'A patient with this ID already exists in NIHMS');
      UI.showToast('Duplicate ID — patient already registered', 'err');
    } else {
      UI.showToast('Could not save to database — check connection and try again', 'err');
    }
    return;
  }

  newPt._id       = (apiCiPt && apiCiPt._id)        || id;
  newPt.nationalId = (apiCiPt && apiCiPt.nationalId) || id;

  /* ── Upload ID document if selected ── */
  if (_R_idDoc.base64 && apiCiPt && apiCiPt._id) {
    try {
      await API._fetchDirect('/patients/' + apiCiPt._id + '/documents', {
        method: 'POST',
        body: JSON.stringify({
          documentType: 'ID_DOCUMENT',
          fileName:     _R_idDoc.fileName,
          mimeType:     _R_idDoc.mimeType,
          sizeKb:       _R_idDoc.sizeKb,
          base64:       _R_idDoc.base64,
        })
      }).catch(function(){});
    } catch(_) {}
    _rIdClearFile();
  }

  _R.ci.patient      = newPt;
  _R.ci.step         = 'slot';
  _R.ci.selectedSlot = null;
  _R.ci.id           = id;

  if (!_R.recentPatients) _R.recentPatients = [];
  var normNew = _cachePt(newPt);
  _R.recentPatients.unshift(normNew);
  if (_R.recentPatients.length > 10) _R.recentPatients.pop();

  _rRec();
  UI.showToast('✓ ' + fn + ' ' + ln + ' created in MongoDB (' + ciElapsed + ' ms) — now select a slot', 'ok');
};

window._rCheckinIssue = async function() {
  var ci=_R.ci;
  if(!ci.patient) return;
  /* Validate slot selected and date chosen */
  if (!ci.selectedSlot) { UI.showToast('Please select a time slot','err'); return; }
  if (!ci.selectedDate) { UI.showToast('Please select a date','err'); return; }

  /* Check-in only allowed on appointment day */
  var todayStr = new Date().toISOString().slice(0,10);

  /* If Case A: use the appointment's own date if no slot was manually picked */
  if (!ci.selectedDate && ci.appt && ci.appt.date) {
    ci.selectedDate = ci.appt.date.slice(0,10);
  }
  if (!ci.selectedSlot && ci.appt && ci.appt.time) {
    ci.selectedSlot = ci.appt.time;
  }

  if (ci.selectedDate && ci.selectedDate !== todayStr) {
    /* Case B / walk-in: allow issuing token anyway — walk-ins don't need today check */
    if (!ci.appt) {
      /* Walk-in: force today */
      ci.selectedDate = todayStr;
    } else {
      /* Show persistent rejection banner on the slot step */
      var futureDate = new Date(ci.selectedDate + 'T00:00:00');
      var futureFmt  = futureDate.toLocaleDateString('en-ZA', {
        weekday:'long', day:'numeric', month:'long', year:'numeric'
      });
      var todayFmt = new Date().toLocaleDateString('en-ZA', {
        weekday:'long', day:'numeric', month:'long', year:'numeric'
      });
      /* Inject rejection banner above the slot form */
      var existingBanner = document.getElementById('ci-future-reject-banner');
      if (!existingBanner) {
        var slotWrap = document.getElementById('ci-checkin-slot') ||
                       document.querySelector('[id^="ci-slot"]') ||
                       document.querySelector('#rec-body');
        var banner = document.createElement('div');
        banner.id = 'ci-future-reject-banner';
        banner.style.cssText = [
          'position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:8888',
          'background:#fef2f2;border:2px solid #fca5a5;border-radius:14px',
          'padding:16px 22px;box-shadow:0 4px 24px rgba(220,38,38,.15)',
          'display:flex;align-items:start;gap:14px;max-width:520px;width:92%',
        ].join(';');
        banner.innerHTML = [
          '<div style="font-size:28px;flex-shrink:0">🚫</div>',
          '<div style="flex:1">',
            '<div style="font-size:14px;font-weight:700;color:#dc2626;margin-bottom:6px">',
              'Check-in not allowed — future appointment',
            '</div>',
            '<div style="font-size:13px;color:#ef4444;line-height:1.6;margin-bottom:10px">',
              'This appointment is scheduled for <strong>' + futureFmt + '</strong>.<br>',
              'Check-in is only available on the day of the appointment.<br>',
              'Today is <strong>' + todayFmt + '</strong>.',
            '</div>',
            '<div style="display:flex;gap:8px;flex-wrap:wrap">',
              '<button onclick="_rClearFutureBanner()" ',
                'style="padding:7px 16px;border-radius:8px;border:1.5px solid #fca5a5;',
                'background:#fff;color:#dc2626;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">',
                '✕ Dismiss',
              '</button>',
              '<button onclick="_R.tab=\'overview\';_rRec()" ',
                'style="padding:7px 16px;border-radius:8px;border:none;',
                'background:#dc2626;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">',
                '← Back to Overview',
              '</button>',
            '</div>',
          '</div>',
        ].join('');
        document.body.appendChild(banner);
        /* Auto-remove after 8 seconds */
        setTimeout(function() {
          var b = document.getElementById('ci-future-reject-banner');
          if (b) { b.style.transition='opacity .4s'; b.style.opacity='0'; setTimeout(function(){ b.remove(); }, 400); }
        }, 8000);
      }
      UI.showToast('Check-in rejected — appointment is on ' + futureFmt, 'err');
      return;
    }
  }

  /* If still no date, default to today (walk-in) */
  if (!ci.selectedDate) ci.selectedDate = todayStr;

  /* ── Fix: use appointment's actual department (Case A: booked appt, no dept dropdown) ── */
  if (ci.appt && ci.appt.dept && (!ci.dept || ci.dept === 'General Consultation')) {
    ci.dept = ci.appt.dept;
  }

  var dept=(document.getElementById('ci-slot-dept')||document.getElementById('ci-dept')||{value:ci.dept}).value||(ci.appt&&ci.appt.dept)||ci.dept||'General Consultation';
  _R.ci.dept = dept;

  /* ── Duplicate check-in prevention ── */
  var ptId = (ci.patient._id || ci.patient.id || ci.patient.nationalId || '');
  var todayDate = new Date().toISOString().slice(0,10);
  var alreadyIn = _R.queue.find(function(q) {
    var qDate = (q.checkedInAt || '').slice(0,10);
    var qName = (q.name || '').trim();
    var ptFullName = ((ci.patient.firstName||'')+(ci.patient.lastName?' '+ci.patient.lastName:'')).trim();
    return ((ptId && (q.id === ptId || q.patientId === ptId)) || (qName && ptFullName && qName === ptFullName))
      && qDate === todayDate && q.status !== 'done';
  });
  if (alreadyIn) {
    var _dupName = ((ci.patient.firstName||'')+' '+(ci.patient.lastName||'')).trim();
    UI.showToast('⚠ ' + _dupName + ' is already checked in today (Token: ' + alreadyIn.token + ')', 'err');
    var _old = document.getElementById('ci-dup-banner'); if (_old) _old.remove();
    var _db = document.createElement('div');
    _db.id = 'ci-dup-banner';
    _db.style.cssText = 'position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:8888;background:#f0f4f8;border:1.5px solid #cbd5e1;border-radius:14px;padding:20px 24px;box-shadow:0 4px 24px rgba(0,0,0,.10);max-width:520px;width:92%';
    _db.innerHTML = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><div style="font-size:20px">🚫</div><div style="font-size:15px;font-weight:700;color:#0F4C3A">Patient Already Checked In</div></div><div style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:14px"><strong>' + _dupName + '</strong> has already been checked in today.<br>Token: <strong style="font-family:monospace;font-size:14px;color:#0F6E56">' + alreadyIn.token + '</strong> &nbsp;·&nbsp; Department: <strong>' + (alreadyIn.department||'') + '</strong></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button onclick="(function(){var b=document.getElementById(\'ci-dup-banner\');if(b)b.remove();_R.tab=\'checkin\';_R.ci={step:\'search\',id:\'\',patient:null,appt:null,dept:\'General Consultation\',result:null,notFound:false};_rRec();setTimeout(function(){var el=document.getElementById(\'ci-id\');if(el){el.value=\'\';el.focus();}},120);})()" style="padding:9px 18px;border-radius:22px;border:none;background:#0F6E56;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">+ Check In Another Patient</button><button onclick="document.getElementById(\'ci-dup-banner\').remove()" style="padding:9px 18px;border-radius:22px;border:1.5px solid #9ca3af;background:#fff;color:#374151;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">✕ Dismiss</button></div>';
    document.body.appendChild(_db);
    setTimeout(function(){ var b=document.getElementById('ci-dup-banner'); if(b){b.style.transition='opacity .4s';b.style.opacity='0';setTimeout(function(){b.remove();},400);} }, 8000);
    return;
  }

  var token = _genToken(dept);
  var isImm = (dept === 'Immunisation') || (dept||'').toLowerCase().includes('immuni');

  /* ── Route check-in to the correct departmental queue ─────────────────
     Telemedicine        → Doctor Telemedicine Queue (_sendToTeleTab)
     Lab / Blood Draw    → Laboratory Queue          (_sendToLabTab)
     Pharmacy Pickup     → Pharmacy Queue            (_sendToPharmacyTab)
     Immunisation        → Nurse Immunisation Station(_sendToNurseTab)
     Everything else     → Nurse Queue for vitals    (_sendToNurseTab)
  ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── */
  var _ciReqBase = {
    id:          'REQ-' + (isImm ? 'IMM-' : '') + token,
    patientId:   ci.patient._id || ci.patient.id,
    patientName: (ci.patient.firstName||'') + ' ' + (ci.patient.lastName||''),
    age:         ci.patient.age || '—',
    sex:         ci.patient.sex || ci.patient.gender || '—',
    complaint:   isImm ? 'Scheduled Immunisation'
                       : (ci.appt ? (ci.appt.type || 'Appointment') : 'Walk-in'),
    priority:    'Normal',
    requestedBy: 'Reception',
    requestedAt: _fmtTime(),
    notes:       isImm
      ? 'Immunisation appointment. Token: ' + token + '. Directed to Nurse Immunisation Station.'
      : 'Patient ' + token + ' checked in at ' + dept + '. Directed to nurses station for vitals.',
    seen:        false,
    autoAccept:  true,
    department:  dept,
    isImmunisation: isImm,
    appointmentId:  ci.appt ? (ci.appt._id || ci.appt.id || '') : '',
    visitType:      ci.appt ? (ci.appt.visitType || '') : '',
  };

  var _ciDest;
  if (isImm) {
    _sendToNurseTab(_ciReqBase);
    _ciDest = 'Nurse Immunisation Station';
  } else {
    _ciDest = _routeCheckinToDept(_ciReqBase, dept);
  }

  _R.queue.push({ token:token, id:ptId, patientId:ptId, name:(ci.patient.firstName||ci.patient.name||'')+(ci.patient.lastName?' '+ci.patient.lastName:''), department:dept, priority:'normal', status:'waiting', checkedInAt:new Date().toISOString() });

  /* ── For walk-ins (no pre-existing appointment), persist to /appointments so
        patient calendar reflects the visit and slot is marked booked ── */
  if (!ci.appt && ci.selectedDate && ci.selectedSlot) {
    var ciScheduledAt = ci.selectedDate + 'T' + ci.selectedSlot + ':00.000+02:00';
    try {
      await API._fetchDirect('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patient:      ci.patient._id || ci.patient.id,
          facility:     _R.facilityId || (window._NIHMS_FACILITY && window._NIHMS_FACILITY.id) || '',
          facilityName: _R.facilityName || (window._NIHMS_FACILITY && window._NIHMS_FACILITY.name) || '',
          visitType:    dept,
          department:   dept,
          scheduledAt:  ciScheduledAt,
          status:       'active'
        })
      }).catch(function(e) { console.warn('Walk-in appointment save failed:', e); });
    } catch(_) {}
    if (_R.ci.bookedSlots) delete _R.ci.bookedSlots[ci.selectedDate];
  }

  /* ── Send SMS + Email notifications ── */
  var sms=false, email=false;
  var smsElapsed=0, emailElapsed=0;
  var ptName  = ((ci.patient.firstName||'') + ' ' + (ci.patient.lastName||'')).trim();
  var apptDate = ci.selectedDate
    ? new Date(ci.selectedDate + 'T00:00:00').toLocaleDateString('en-ZA',
        {weekday:'long', day:'numeric', month:'long', year:'numeric'})
    : new Date().toLocaleDateString('en-ZA',
        {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  var apptTime  = ci.selectedSlot || _fmtTime();
  var checkedAt = _fmtTime();

  /* ── Persist token to localStorage so patient portal can show it ── */
  try {
    var tokenRecord = {
      token:      token,
      dept:       dept,
      patientId:  ci.patient._id || ci.patient.id || ci.patient.nationalId,
      patientName:ptName,
      date:       ci.selectedDate || new Date().toISOString().slice(0,10),
      time:       apptTime,
      checkedAt:  new Date().toISOString(),
      status:     'waiting',
    };
    /* Legacy single key (kept for backward compat) */
    localStorage.setItem('nihms_patient_token', JSON.stringify(tokenRecord));
    /* Patient-specific key – primary lookup in patient portal */
    if (tokenRecord.patientId) {
      localStorage.setItem('nihms_patient_token_' + tokenRecord.patientId, JSON.stringify(tokenRecord));
    }
    /* Shared map keyed by patientId – secondary lookup */
    try {
      var _allTokens = JSON.parse(localStorage.getItem('nihms_checkin_tokens') || '{}');
      if (tokenRecord.patientId) _allTokens[tokenRecord.patientId] = tokenRecord;
      localStorage.setItem('nihms_checkin_tokens', JSON.stringify(_allTokens));
    } catch(_) {}
    /* BroadcastChannel – patient tab auto-refreshes immediately */
    try {
      var _ciBC = new BroadcastChannel('nihms_checkin');
      _ciBC.postMessage({ type: 'token_issued', tokenRecord: tokenRecord });
      setTimeout(function(){ _ciBC.close(); }, 200);
    } catch(_) {}
  } catch(_) {}

  /* ── SMS: concise, token prominent ── */
  var smsMsg =
    'NIHMS CHECK-IN CONFIRMED. Dear ' + ptName + '. ' +
    'Queue token: ' + token + '. Dept: ' + dept + '. ' +
    'Date: ' + apptDate + ' at ' + apptTime + '. ' +
    (isImm ? 'Go to the Nurse Immunisation Station. ' : 'Proceed to: ' + _ciDest + '. ') +
    'Patient dashboard: https://nihms.netlify.app/patient . ' +
    'Emergency: 10177 | NIHMS Jhb CHC';

  var dashboardUrl = 'https://nihms.netlify.app/patient?token=' + encodeURIComponent(token)
    + '&dept=' + encodeURIComponent(dept);

  var emailHtml =
    '<div style="font-family:system-ui,-apple-system,Arial,sans-serif;max-width:540px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)">' +
      '<div style="background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);padding:28px 24px;text-align:center">' +
        '<div style="font-size:36px;margin-bottom:8px">✅</div>' +
        '<h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">Check-In Confirmed</h1>' +
        '<p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:13px">National Integrated Healthcare Management System · Johannesburg CHC</p>' +
      '</div>' +
      '<div style="background:#f4f5f0;padding:28px;border-radius:0 0 12px 12px">' +
        '<p style="font-size:15px;color:#555555;margin:0 0 20px">Dear <strong>' + ptName.trim() + '</strong>,</p>' +
        '<div style="background:#fff;border-radius:14px;padding:24px;text-align:center;border:2.5px solid #0F6E56;margin-bottom:20px">' +
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#777777;margin-bottom:10px">Your Queue Token</div>' +
          '<div style="font-size:72px;font-weight:900;font-family:monospace;color:#0F6E56;line-height:1;letter-spacing:.05em">' + token + '</div>' +
          '<div style="margin-top:10px;font-size:13px;color:#0F6E56;font-weight:600">' + dept + '</div>' +
          '<div style="margin-top:4px;font-size:12px;color:#777777">' + apptDate + ' · ' + apptTime + '</div>' +
        '</div>' +
        '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px;text-align:center;margin-bottom:20px">' +
          '<div style="font-size:13px;color:#14532d;font-weight:600;margin-bottom:6px">📱 View your token on your Patient Dashboard</div>' +
          '<a href="' + dashboardUrl + '" style="display:inline-block;padding:10px 22px;background:#0F6E56;color:#fff;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none">Open Patient Dashboard →</a>' +
          '<div style="font-size:11px;color:#777777;margin-top:8px">Or visit: https://nihms.netlify.app/patient</div>' +
        '</div>' +
        '<table style="width:100%;border-collapse:collapse;margin-bottom:20px">' +
          '<tr><td style="padding:10px 14px;border-bottom:1px solid #f0f1ec;font-size:13px;color:#777777;width:40%">Department</td><td style="padding:10px 14px;border-bottom:1px solid #f0f1ec;font-size:13px;font-weight:600;color:#111111">' + dept + '</td></tr>' +
          '<tr><td style="padding:10px 14px;border-bottom:1px solid #f0f1ec;font-size:13px;color:#777777">Date</td><td style="padding:10px 14px;border-bottom:1px solid #f0f1ec;font-size:13px;font-weight:600;color:#111111">' + apptDate + '</td></tr>' +
          '<tr><td style="padding:10px 14px;border-bottom:1px solid #f0f1ec;font-size:13px;color:#777777">Time</td><td style="padding:10px 14px;border-bottom:1px solid #f0f1ec;font-size:13px;font-weight:600;color:#111111">' + apptTime + '</td></tr>' +
          '<tr><td style="padding:10px 14px;font-size:13px;color:#777777">Checked in at</td><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111111">' + _fmtTime() + '</td></tr>' +
        '</table>' +
        '<div style="background:#E6F1FB;border-radius:10px;padding:14px 16px;margin-bottom:12px;font-size:13px;color:#185FA5">' +
          '<strong>📋 What to do next:</strong><br>' +
          '1. Proceed to <strong>' + _ciDest + '</strong><br>' +
          '2. Wait to be called by your token number<br>' +
          '3. Check your Patient Dashboard for live queue position' +
        '</div>' +
        '<div style="background:#f0fdf4;border-radius:10px;padding:12px 16px;margin-bottom:12px;font-size:12px;color:#166534">' +
          '✓ Checked in at ' + checkedAt + ' · Token valid for today only' +
        '</div>' +
        '<div style="background:#fffbeb;border-radius:10px;padding:12px 16px;font-size:12px;color:#92400e">' +
          '🏥 Johannesburg CHC · Mon–Fri 07:00–17:00 · Sat 07:00–13:00 · Emergency: <strong>10177</strong>' +
        '</div>' +
      '</div>' +
    '</div>';

  try {
    /* ── SMS notification — timed ── */
    if (ci.patient.phone) {
      var t0sms = Date.now();
      var smsRes = await API._fetchDirect('/notifications/sms', {
        method: 'POST',
        body: JSON.stringify({ to: ci.patient.phone, message: smsMsg })
      }).catch(function(){ return null; });
      smsElapsed = Date.now() - t0sms;
      sms = !!(smsRes && !smsRes.error);
    }
    /* ── Email notification — timed ── */
    if (ci.patient.email) {
      var t0email = Date.now();
      var emailRes = await API._fetchDirect('/notifications/email', {
        method: 'POST',
        body: JSON.stringify({
          to:      ci.patient.email,
          subject: 'NIHMS — Check-in confirmed | Token ' + token + ' | ' + dept,
          html:    emailHtml,
          text:    smsMsg,
        })
      }).catch(function(){ return null; });
      emailElapsed = Date.now() - t0email;
      email = !!(emailRes && !emailRes.error);
    }
  } catch(_){}

  _R.ci={ step:'done', id:ci.id, patient:ci.patient, appt:ci.appt, dept:dept, notFound:false, result:{
    token:token, dept:dept,
    name:(ci.patient.firstName||'')+(ci.patient.lastName?' '+ci.patient.lastName:''),
    phone:ci.patient.phone||'', email:ci.patient.email||'',
    smsSent:sms, emailSent:email,
    smsElapsed:smsElapsed, emailElapsed:emailElapsed,
    checkedAt:checkedAt, date:ci.selectedDate||'', time:apptTime,
  } };
  _rRec();
  UI.showToast('Token '+token+' issued — patient directed to '+_ciDest,'ok');
  /* ── POST check-in to /queue API so all portals pick it up ── */
  try {
    await API._fetchDirect('/queue', {
      method: 'POST',
      body: JSON.stringify({
        patientId:   ci.patient._id || ci.patient.id,
        patientName: (ci.patient.firstName||'')+(ci.patient.lastName?' '+ci.patient.lastName:''),
        token:       token,
        department:  dept,
        destination: _ciDest,
        priority:    'Normal',
        status:      'waiting',
        checkedInAt: new Date().toISOString(),
        appointmentId: ci.appt ? (ci.appt._id||ci.appt.id||'') : '',
        visitType:   ci.appt ? (ci.appt.visitType || '') : '',
        type: (function(){
          var d = (dept||'').toLowerCase();
          if (d.includes('tele'))   return 'telemedicine';
          if (d.includes('lab') || d.includes('blood')) return 'lab';
          if (d.includes('pharmac')) return 'pharmacy';
          if (d.includes('immunis') || d.includes('immuniz') || d.includes('vaccin'))
            return 'immunisation';
          return ci.appt ? (ci.appt.type||'booked') : 'walkin';
        })(),
      })
    }).catch(function(){});
  } catch(_) {}
};

/* Book */
window._rBookSearch = async function() {
  var id=(document.getElementById('bk-id')||{value:''}).value.trim();
  var err=document.getElementById('bk-err');
  if(!id){if(err){err.style.display='block';err.textContent='Please enter a National ID or Passport number.';}return;}
  if(err) err.style.display='none';
  _R.bk.id=id;

  var patient=null;
  try {
    var res=await API._fetchDirect('/patients?nationalId='+encodeURIComponent(id)+'&limit=1',{method:'GET'}).catch(function(){return null;});
    var bkPt=res&&res.data&&res.data[0];
    if(bkPt){
      var bkId=(bkPt.nationalId||bkPt.idNumber||bkPt.id||'').trim();
      var bkPP=(bkPt.passport||bkPt.passportNumber||'').trim();
      if(bkId===id||bkPP===id) patient=bkPt;
    }
  } catch(_){}
  if(!patient) patient = await _apiSearchPatient(id).catch(function(){ return null; });

  if(!patient){ _R.bk.notFound=true; _rRec(); return; }
  _R.bk.patient=_normPt(patient)||patient; _R.bk.step='found'; _rRec();
};

/* _rBookRegisterNew — used by the new booking form (bk-reg-* field IDs) */
window._rBookRegisterNew = async function() {
  function _v(id){ var el=document.getElementById(id); return el?el.value.trim():''; }
  var fn=_v('bk-reg-fn'), ln=_v('bk-reg-ln'), id=_v('bk-reg-id')||_R.bk.id||'';
  var dob=_v('bk-reg-dob'), gen=_v('bk-reg-gen'), blood=_v('bk-reg-blood');
  var ph=_v('bk-reg-ph'), em=_v('bk-reg-em'), addr=_v('bk-reg-addr');
  /* ── Validate all required fields — highlight every error at once ── */
  var hasErr = false;
  if (!fn) { _frmErr('bk-reg-fn', 'First name is required');              hasErr = true; }
  if (!ln) { _frmErr('bk-reg-ln', 'Last name is required');               hasErr = true; }
  if (!id) { _frmErr('bk-reg-id', 'SA ID or Passport number is required'); hasErr = true; }
  else if (!/^[A-Za-z0-9]{6,20}$/.test(id.replace(/\s/g,''))) {
    _frmErr('bk-reg-id', 'Enter a valid SA ID (13 digits) or passport number'); hasErr = true;
  }
  if (!ph) { _frmErr('bk-reg-ph', 'Phone number is required');             hasErr = true; }
  else if (!/^\+?[0-9\s\-]{7,15}$/.test(ph)) {
    _frmErr('bk-reg-ph', 'Enter a valid phone number (e.g. +27821234567)'); hasErr = true;
  }
  if (em && !/^[^@]+@[^@]+\.[^@]+$/.test(em)) {
    _frmErr('bk-reg-em', 'Enter a valid email address'); hasErr = true;
  }
  if (hasErr) {
    UI.showToast('Please fix the highlighted fields before saving', 'err');
    var firstErr = document.querySelector('[id$="-err"]:not([style*="none"])');
    if (firstErr) firstErr.scrollIntoView({ behavior:'smooth', block:'center' });
    return;
  }
  /* ── POST to MongoDB — timed ── */
  var t0bk = Date.now();
  var apiBkPt = null, apiBkErr = null;
  try {
    var bkRes = await API._fetchDirect('/patients', {
      method: 'POST',
      body: JSON.stringify({ firstName:fn, lastName:ln, nationalId:id, dateOfBirth:dob,
        gender:gen, phone:ph, email:em, bloodType:blood, address:addr })
    });
    apiBkPt = bkRes && (bkRes.data || bkRes);
  } catch(e) { apiBkErr = e; }
  var bkElapsed = Date.now() - t0bk;

  if (apiBkErr || !apiBkPt) {
    var bkMsg = (apiBkErr && apiBkErr.message) || '';
    if (bkMsg.includes('409') || bkMsg.toLowerCase().includes('duplicate')) {
      _frmErr('bk-reg-id', 'A patient with this ID already exists in NIHMS');
      UI.showToast('Duplicate ID — patient already registered', 'err');
    } else {
      UI.showToast('Could not save to database — check connection and try again', 'err');
    }
    return;
  }
  var newPt={id:(apiBkPt.nationalId||id),nationalId:(apiBkPt.nationalId||id),_id:apiBkPt._id,
    firstName:fn,lastName:ln,name:fn+' '+ln,dob:dob,gender:gen,bloodType:blood,phone:ph,email:em,address:addr};

  /* ── Upload ID document if selected ── */
  if (_R_idDoc.base64 && apiBkPt._id) {
    try {
      await API._fetchDirect('/patients/' + apiBkPt._id + '/documents', {
        method: 'POST',
        body: JSON.stringify({
          documentType: 'ID_DOCUMENT',
          fileName:     _R_idDoc.fileName,
          mimeType:     _R_idDoc.mimeType,
          sizeKb:       _R_idDoc.sizeKb,
          base64:       _R_idDoc.base64,
        })
      }).catch(function(){});
    } catch(_) {}
    _rIdClearFile();
  }

  _cachePt(newPt);
  if (!_R.recentPatients) _R.recentPatients = [];
  _R.recentPatients.unshift(_normPt(newPt));
  if (_R.recentPatients.length > 10) _R.recentPatients.pop();
  _R.bk.patient = newPt; _R.bk.step = 'slot'; _R.bk.selectedSlot = null; _R.bk.id = id;
  _rRec();
  UI.showToast('\u2713 ' + fn + ' ' + ln + ' created in MongoDB (' + bkElapsed + ' ms) \u2014 now select a slot', 'ok');
};
window._rBookRegister = window._rBookRegisterNew; /* alias for backward compat */
window._rBookConfirm = async function() {
  var bk = _R.bk;
  if (!bk.patient) { UI.showToast('No patient selected','err'); return; }
  if (!bk.selectedSlot) { UI.showToast('Please select a time slot','err'); return; }
  if (!bk.selectedDate) { UI.showToast('Please select a date','err'); return; }
  var dept = (document.getElementById('bk-visit-type')||{value:bk.dept||'General Consultation'}).value || bk.dept || 'General Consultation';
  var type = (document.getElementById('bk-visit-type')||{value:'Consultation'}).value;
  var ref  = 'APT-'+Date.now().toString().slice(-5);
  var pt   = bk.patient;
  var name = (pt.firstName||'')+(pt.lastName?' '+pt.lastName:'');
  /* ── Slot conflict check: block same date+time+dept for different patient ── */
  var conflict = _R.appointments.find(function(a) {
    return a.date  === bk.selectedDate &&
           a.time  === bk.selectedSlot &&
           a.dept  === dept            &&
           (a.patientId !== (pt.id||bk.id) && a.patientId !== (pt._id||bk.id));
  });
  if (conflict) {
    UI.showToast(
      '⚠ Slot conflict — ' + dept + ' at ' + bk.selectedSlot + ' on ' + bk.selectedDate +
      ' is already booked for another patient. Please select a different slot.', 'err'
    );
    return;
  }

  var apt  = { id:ref, ref:ref, patientId:pt._id||pt.id||bk.id, name:name, dept:dept, clinician:dept,
    date:bk.selectedDate, time:bk.selectedSlot, type:type, verified:false, status:'active',
    phone:pt.phone||'', email:pt.email||'' };

  /* ── Persist to backend so patient calendar + other sessions see this booking ── */
  var scheduledAt = bk.selectedDate + 'T' + bk.selectedSlot + ':00.000+02:00';
  try {
    var aptRes = await API._fetchDirect('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patient:      pt._id || pt.id || bk.id,
        facility:     _R.facilityId || (window._NIHMS_FACILITY && window._NIHMS_FACILITY.id) || '',
        facilityName: _R.facilityName || (window._NIHMS_FACILITY && window._NIHMS_FACILITY.name) || '',
        visitType:    dept,
        department:   dept,
        scheduledAt:  scheduledAt,
        status:       'active'
      })
    }).catch(function(e) { console.warn('Appointment API save failed:', e); return null; });
    if (aptRes) {
      var saved = aptRes.data || aptRes;
      if (saved._id || saved.id) apt._id = saved._id || saved.id;
    }
  } catch(_) {}

  _R.appointments.push(apt);
  /* Invalidate cached booked slots for this date so the grid refreshes */
  if (_R.bk.bookedSlots) delete _R.bk.bookedSlots[bk.selectedDate];
  /* Queue token only activates on appointment day */
  var aptIsToday = bk.selectedDate === new Date().toISOString().slice(0,10);
  if (!aptIsToday) {
    /* Send booking reminder for future date — no queue token yet */
    UI.showToast('Appointment booked for '+bk.selectedDate+' — queue token activates on the day','ok');
  }

  /* Notify patient */
  var smsMsg = 'NIHMS APPOINTMENT CONFIRMED. Dear '+name.trim()+', your appointment ('+ref+') is booked at '+dept+' on '+bk.selectedDate+' at '+bk.selectedSlot+'. Please arrive 10 min early. Clinic: 07:00-17:00. Emergencies: 10177.';
  var emailHtml = '<div style="font-family:inherit;max-width:520px;margin:0 auto"><div style="background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);padding:24px;border-radius:10px 10px 0 0;text-align:center"><h2 style="color:#fff;margin:0">Appointment Confirmed</h2></div><div style="background:#f4f5f0;padding:24px;border-radius:0 0 10px 10px"><p>Dear <strong>'+name.trim()+'</strong>,</p><table style="width:100%;border-collapse:collapse;margin:16px 0"><tr><td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;color:#777777;font-size:13px">Reference</td><td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-weight:700;color:#0F6E56">'+ref+'</td></tr><tr><td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;color:#777777;font-size:13px">Department</td><td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-weight:600">'+dept+'</td></tr><tr><td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;color:#777777;font-size:13px">Date</td><td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-weight:600">'+bk.selectedDate+'</td></tr><tr><td style="padding:8px 12px;color:#777777;font-size:13px">Time</td><td style="padding:8px 12px;font-weight:600">'+bk.selectedSlot+'</td></tr></table><p style="font-size:13px;color:#555555">Please arrive 10 minutes before your appointment time.</p><p style="font-size:12px;color:#777777">Johannesburg CHC · Mon–Fri 07:00–17:00 · Sat 07:00–13:00 · Emergencies: 10177</p></div></div>';
  try {
    if(pt.phone) await API._fetchDirect('/notifications/sms',{method:'POST',body:JSON.stringify({to:pt.phone,message:smsMsg})}).catch(function(){});
    if(pt.email) await API._fetchDirect('/notifications/email',{method:'POST',body:JSON.stringify({to:pt.email,subject:'NIHMS — Appointment confirmed: '+ref,html:emailHtml})}).catch(function(){});
  } catch(_) {}

  _R.bk = { step:'done', id:bk.id, patient:pt, slot:null, slotIdx:null, notFound:false,
    selectedSlot:null, selectedDate:'', dept:'General Consultation',
    result:{ name:name, ref:ref, dept:dept, date:bk.selectedDate, time:bk.selectedSlot, phone:pt.phone, email:pt.email }};
  _rRec();
  UI.showToast('Appointment '+ref+' confirmed','ok');
};

/* ── Send patient to nurse queue from done screen ── */
window._rSendToNurse = function(token) {
  var p = _R.queue.find(function(q){ return q.token === token; });
  if (!p) { UI.showToast('Queue entry not found for ' + token, 'error'); return; }

  p.status = 'at-nurse';

  fetch(API_BASE + '/queue/' + (p._id || p.id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('nihms_token') || '') },
    body: JSON.stringify({ status: 'at-nurse' })
  }).catch(function(){});

  var nurseReq = {
    id:          'REQ-' + token,
    patientId:   p.patientId || p._id || '',
    patientName: p.patientName || p.name || '',
    age:         p.age || '—',
    sex:         p.sex || p.gender || '—',
    complaint:   p.complaint || 'Walk-in queue check-in',
    priority:    p.priority || 'Normal',
    requestedBy: 'Reception',
    requestedAt: new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}),
    notes:       'Patient ' + token + ' redirected to Nurse Station for vitals.',
    seen:        false,
    autoAccept:  true   /* skip Triage Requests — go straight to Vitals Queue */
  };
  _sendToNurseTab(nurseReq);

  UI.showToast('\u2705 ' + (p.patientName || p.name || token) + ' sent to Nurse Queue', 'ok');
  _R.tab = 'queue';
  _rRec();
};

/* Queue */
window._rQueueAdvance = function(token, newStatus) {
  var p=_R.queue.find(function(q){return q.token===token;});
  if(!p) return;
  /* Telemedicine: skip nurse station */
  if(p.department==='Telemedicine' && newStatus==='at-nurse') newStatus='with-doctor';
  p.status=newStatus;
  /* Push to nurse if going to nurse station */
  if(newStatus==='at-nurse') {
    var req={id:'REQ-'+token+'-adv',patientId:p.id,patientName:p.name,age:p.age||'—',sex:p.sex||'—',
      complaint:p.complaint||'Queue check-in',priority:p.priority==='urgent'?'Emergency':'Normal',
      requestedBy:'Reception',requestedAt:_fmtTime(),notes:'Patient '+token+' redirected to Nurse Station for vitals.',seen:false,autoAccept:true};
    _sendToNurseTab(req);
  }
  _rRec();
  var labels={'at-nurse':'sent to nurses station','with-doctor':p.department==='Telemedicine'?'sent to telemedicine queue':'sent to doctor','done':'marked complete'};
  UI.showToast(p.name+' '+(labels[newStatus]||newStatus),'ok');
};

window._rQueueDelayModal = function() {
  UI.showToast('Notify delay feature — use the Messaging tab to send a delay notice','warn');
  _R.tab='messaging'; _rRec();
};

/* Emergency */
window._rEmergencyIssue = function() {
  var id=(document.getElementById('em-id')||{value:''}).value.trim();
  var name=(document.getElementById('em-name')||{value:''}).value.trim();
  var dept=(document.getElementById('em-dept')||{value:'General Consultation'}).value;
  var desc=(document.getElementById('em-desc')||{value:''}).value.trim();
  if(!name){UI.showToast('Patient name or description is required','err');return;}
  var token='E-'+String(_R.queue.filter(function(p){return p.priority==='urgent';}).length+1).padStart(3,'0');
  if(!id) id='WALK-'+Date.now().toString().slice(-4);
  var emQEntry = { token:token, id:id, name:name, department:dept, priority:'urgent', status:'waiting', checkedInAt:new Date().toISOString(), complaint:desc };
  _R.queue.push(emQEntry);

  /* Push URGENT request to nurse — triggers incoming emergency alert */
  var emReq={id:'REQ-'+token, patientId:id, patientName:name, age:'—', sex:'—',
    complaint:desc||'Emergency intake', priority:'Emergency',
    requestedBy:'Reception — EMERGENCY', requestedAt:_fmtTime(),
    notes:'⚡ EMERGENCY fast-track. Token: '+token+'. Dept: '+dept+(desc?'. Chief complaint: '+desc:'')+'. Patient directed to nurse station immediately.',
    seen:false, isEmergency:true };
  if(window._nurseAddRequest) window._nurseAddRequest(emReq);
  else { if(!window._NURSE_REQUESTS) window._NURSE_REQUESTS=[]; window._NURSE_REQUESTS.push(emReq); }

  /* Also add to nurse _N.patients directly if nurse page is open */
  if(window._N && window._N.patients) {
    window._N.patients.unshift({
      id:token, name:name, age:0, sex:'U', complaint:desc||'Emergency intake',
      priority:'Emergency', status:'Awaiting Vitals', vitalStatus:'Pending',
      arrivalTime:_fmtTime(), triageTime:null, waitMins:0, room:null,
      emergencyClass:'Critical', vitals:null, flags:[], aiRisk:'Emergency intake — immediate vitals required',
      acceptedAt:_fmtTime(),
    });
    /* Trigger alert dismissed = false so banner shows */
    window._N.alertDismissed = false;
    if(window._nurseRender) window._nurseRender();
  }

  _R.emId=''; _R.emName=''; _R.emDesc='';
  _rRec();
  UI.showToast('⚡ Emergency token '+token+' issued — nurse station notified','ok');
};

/* Messaging */
window._rSendMsg = async function() {
  var g = function(id){ return (document.getElementById(id)||{value:''}).value.trim(); };
  var recpEl = document.querySelector('input[name="rmsg-recipient"]:checked');
  var prioEl = document.querySelector('input[name="rmsg-priority"]:checked');
  var recip    = recpEl ? recpEl.value : '';
  var specific = g('rmsg-specific');
  var subject  = g('rmsg-subject');
  var patId    = g('rmsg-patient-id');
  var body     = g('rmsg-body');
  var priority = prioEl ? prioEl.value : 'Normal';
  var to       = specific || recip;

  if (!subject) { if(window.UI&&UI.showToast) UI.showToast('Please enter a subject','err'); return; }
  if (!body)    { if(window.UI&&UI.showToast) UI.showToast('Please enter a message','err'); return; }
  if (!recip)   { if(window.UI&&UI.showToast) UI.showToast('Please select a recipient','err'); return; }

  /* ── Disable button to prevent double-send ── */
  var sendBtn = document.querySelector('[onclick="_rSendMsg()"]');
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Sending…'; }

  /* ── Record time sent ── */
  var t0 = Date.now();

  var u = (window.API && window.API.getStoredUser && window.API.getStoredUser()) || {};
  var senderName = u.firstName ? ((u.firstName||'')+' '+(u.lastName||'')).trim() : (u.name||'Reception');

  /* ── Build message record ── */
  var msgRecord = {
    id:           Date.now(),
    from:         'Reception (You)',
    fromRole:     'RECEPTIONIST',
    role:         recip,
    to:           to,
    toRole:       recip === 'All Clinical Staff' ? 'ALL' : recip.replace(/ /g,'_').toUpperCase(),
    text:         (subject ? '['+subject+'] ' : '') + body,
    subject:      subject,
    time:         _fmtTime(),
    sentAt:       new Date().toISOString(),
    priority:     priority,
    patientId:    patId || null,
    unread:       false,
  };

  /* ── 1. Save to local state immediately ── */
  if (!_R.messages) _R.messages = [];
  _R.messages.unshift(msgRecord);

  /* ── 2. Post to /messages API (persists across portals) ── */
  var saved = false;
  try {
    var res = await API._fetchDirect('/messages', {
      method: 'POST',
      body: JSON.stringify({
        senderRole:    'RECEPTIONIST',
        senderName:    senderName,
        recipientRole: msgRecord.toRole,
        recipientName: to,
        subject:       subject,
        body:          body,
        priority:      priority,
        patientId:     patId || null,
      })
    }).catch(function(){ return null; });
    saved = !!(res && (res._id || res.data));
  } catch(_) {}

  /* ── 3. Push to in-memory nurse/doctor/pharmacy portals if open ── */
  var inmemPush = {
    id:       msgRecord.id,
    from:     senderName + ' (Reception)',
    fromRole: 'RECEPTIONIST',
    to:       to,
    subject:  subject,
    text:     body,
    time:     msgRecord.time,
    read:     false,
  };
  /* Nurse portal bridge */
  if ((recip === 'Nurse Station' || recip === 'All Clinical Staff') && window._nurseAddMessage) {
    window._nurseAddMessage(inmemPush);
  }
  /* Doctor portal bridge */
  if ((recip === 'Doctor' || recip === 'All Clinical Staff') && window._doctorAddMessage) {
    window._doctorAddMessage(inmemPush);
  }
  /* Pharmacy portal bridge */
  if ((recip === 'Pharmacy' || recip === 'All Clinical Staff') && window._pharmacyAddMessage) {
    window._pharmacyAddMessage(inmemPush);
  }

  /* ── 4. Patient messaging: send via SMS + email + localStorage ── */
  if (recip === 'Patient') {
    var lastPt = _R.ci && _R.ci.patient;

    /* Save to localStorage so patient portal picks it up immediately (same device) */
    try {
      var existMsgs = JSON.parse(localStorage.getItem('nihms_patient_messages') || '[]');
      existMsgs.unshift({ id:Date.now(), from:'Reception', fromRole:'RECEPTIONIST',
        text:body, subject:subject, sentAt:new Date().toISOString(), time:_fmtTime(), read:false });
      if (existMsgs.length > 20) existMsgs = existMsgs.slice(0,20);
      localStorage.setItem('nihms_patient_messages', JSON.stringify(existMsgs));
    } catch(_) {}

    /* SMS + Email delivery */
    if (lastPt && (lastPt.phone || lastPt.email)) {
      try {
        if (lastPt.phone) {
          await API._fetchDirect('/notifications/sms', {
            method: 'POST',
            body: JSON.stringify({ to: lastPt.phone, message: 'NIHMS Message from Reception: ' + body })
          }).catch(function(){});
        }
        if (lastPt.email) {
          await API._fetchDirect('/notifications/email', {
            method: 'POST',
            body: JSON.stringify({
              to: lastPt.email,
              subject: 'NIHMS — ' + subject,
              html: '<div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:0 auto">'
                  + '<div style="background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);padding:20px;border-radius:12px 12px 0 0;text-align:center">'
                  + '<div style="font-size:24px;margin-bottom:6px">📩</div>'
                  + '<h2 style="color:#fff;margin:0;font-size:18px">Message from Reception</h2>'
                  + '<p style="color:rgba(255,255,255,.8);margin:4px 0 0;font-size:12px">Johannesburg CHC · NIHMS</p></div>'
                  + '<div style="background:#f4f5f0;padding:24px;border-radius:0 0 12px 12px">'
                  + '<p style="font-size:15px;color:#111111;line-height:1.6;margin:0 0 16px">' + body + '</p>'
                  + '<a href="https://nihms.netlify.app/patient" style="display:block;padding:12px;background:#0F6E56;color:#fff;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;text-align:center">View your Patient Dashboard →</a>'
                  + '<p style="font-size:11px;color:#777777;margin:12px 0 0;text-align:center">NIHMS · Johannesburg CHC · Emergency: 10177</p>'
                  + '</div></div>',
              text: 'Message from NIHMS Reception: ' + body,
            })
          }).catch(function(){});
        }
      } catch(_){}
    }
  }

  /* ── Re-enable button ── */
  if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '✉ Send Message'; }

  /* ── 5. Navigate to sent folder ── */
  if(window.UI&&UI.showToast) UI.showToast('✓ Message sent to '+(specific||recip)+(saved?' · saved to DB':' · local only'),'ok');
  window._rMsgView = 'sent';
  _R.tab = 'messaging';
  _rRec();
};

window._rSendDelay = function() {
  var dept=(document.getElementById('delay-dept')||{value:'all'}).value;
  var dur=(document.getElementById('delay-dur')||{value:'30'}).value;
  var reason=(document.getElementById('delay-reason')||{value:''}).value.trim();
  var text=dur+'-minute delay expected'+(dept!=='all'?' in '+dept:'')+'.'+( reason?' Reason: '+reason:'')+ ' We apologise for the inconvenience.';
  _R.messages.unshift({id:Date.now(),from:'Reception — Delay Notice',to:dept==='all'?'All patients':'Patients in '+dept,text:text,time:_fmtTime(),read:true});
  _rRec(); UI.showToast('Delay notification sent','ok');
};

/* Bind events */

function _bindAptEditGrid() {
  var grid = document.querySelector('[data-edit-slot]');
  if (!grid) return;
  var container = grid.parentElement;
  if (!container || container._bound) return;
  container._bound = true;
  container.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-edit-slot]');
    if (!btn) return;
    var t = btn.getAttribute('data-edit-slot');
    if (_R._editApt) _R._editApt._newTime = t;
    container.querySelectorAll('[data-edit-slot]').forEach(function(b) {
      var sel = b.getAttribute('data-edit-slot') === t;
      b.style.border     = '1.5px solid ' + (sel ? '#0F6E56' : '#e0e0e0');
      b.style.background = sel ? '#eff6ff' : '#fff';
      b.style.color      = sel ? '#185FA5' : '#111111';
      b.style.fontWeight = sel ? '700' : '400';
    });
    var lbl = document.getElementById('ae-selected-slot');
    if (lbl) lbl.textContent = 'Selected: ' + t;
  });
}

function _rBind() {
  /* Bind slot grids */
  _bindSlotGrid();
  _bindBkGrids();
  /* Bind apt-edit slot grid */
  _bindAptEditGrid();
  /* Update tab nav highlights */
  document.querySelectorAll('[id^="rn-"]').forEach(function(btn){
    var t=btn.id.replace('rn-','');
    btn.style.borderBottomColor=t===_R.tab?'#0F6E56':'transparent';
    btn.style.color=t===_R.tab?'#0F6E56':'#777777';
    btn.style.fontWeight=t===_R.tab?'700':'500';
  });
  /* Enter on ID inputs */
  ['ci-id','bk-id','pf-search-id'].forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.addEventListener('keydown',function(e){ if(e.key==='Enter'){if(id==='ci-id')window._rCheckinSearch();else if(id==='bk-id')window._rBookSearch();else window._rPfSearch();} });
  });
}

/* Expose */
window._rTab=_rTab;
window._rRec=_rRec;

/* Reset check-in to fresh search — called by "Check In Another Patient" button */
window._rResetCheckin = function() {
  /* 1. Dismiss any lingering dup banner */
  var dupBanner = document.getElementById('ci-dup-banner');
  if (dupBanner) dupBanner.remove();

  /* 2. Wipe all temporary check-in state — do NOT touch _R.queue or saved records */
  _R.tab = 'checkin';
  _R.ci  = {
    step: 'search', id: '', patient: null,
    appt: null, dept: 'General Consultation',
    result: null, notFound: false,
  };

  /* 3. Re-render the receptionist shell */
  if (document.getElementById('rec-body')) {
    _rRec();
  } else if (typeof UI !== 'undefined' && UI.renderContent) {
    UI.renderContent('receptionist');
  } else {
    _rRec();
  }

  /* 4. After re-render: clear DOM inputs, strip error states, focus ID field */
  setTimeout(function() {
    /* Clear text inputs and textareas inside the check-in panel */
    var ciIds = ['ci-id', 'ci-notes', 'ci-search-input'];
    ciIds.forEach(function(elId) {
      var el = document.getElementById(elId);
      if (el) { el.value = ''; el.style.borderColor = ''; }
    });

    /* Remove any inline validation error messages */
    var errEls = document.querySelectorAll('[id$="-err"][style*="color:red"], .ci-err');
    errEls.forEach(function(e) { e.textContent = ''; e.style.display = 'none'; });

    /* Focus the ID search input */
    var idInput = document.getElementById('ci-id');
    if (idInput) { idInput.value = ''; idInput.focus(); }
  }, 120);
};

window._rAptSaveEdit = async function() {
  var apt = _R._editApt;
  if (!apt) return;
  var dept = (document.getElementById('ae-dept')||{value:apt.dept}).value;
  var date = (document.getElementById('ae-date')||{value:apt.date}).value;
  if (!date) { UI.showToast('Please select a date','err'); return; }
  var slot = apt._newTime || apt.time;
  if (!slot) { UI.showToast('Please select a time slot','err'); return; }

  /* Update in-memory */
  apt.dept     = dept;
  apt.date     = date;
  apt.time     = slot;
  apt.verified = false;
  apt.status   = 'active';
  delete apt._newTime;

  /* ── Save to database ── */
  var saved = false;
  try {
    var aptId = apt._id || apt.id;
    /* Try appointments endpoint first */
    var res = await API._fetchDirect('/appointments/'+aptId, {
      method: 'PATCH',
      body: JSON.stringify({
        department: dept,
        date:       date,
        time:       slot,
        verified:   false,
        status:     'active',
        updatedAt:  new Date().toISOString(),
        updatedBy:  'Receptionist',
      })
    }).catch(function(){ return null; });
    if (res && (res._id || res.id || res.success)) saved = true;
  } catch(_){}

  /* ── Notify patient ── */
  var msg = 'NIHMS: Your appointment '+apt.ref+' has been updated. New details: '+dept+' on '+date+' at '+slot+'. Please arrive 10 minutes early. Johannesburg CHC.';
  var emailHtml = '<div style="font-family:inherit;max-width:500px;margin:0 auto"><div style="background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);padding:20px;border-radius:10px 10px 0 0;text-align:center"><h2 style="color:#fff;margin:0">Appointment Updated</h2></div><div style="background:#f4f5f0;padding:20px;border-radius:0 0 10px 10px"><p>Dear patient,</p><table style="width:100%;border-collapse:collapse"><tr><td style="padding:8px;color:#777777;font-size:13px">Reference</td><td style="padding:8px;font-weight:700;color:#0F6E56">'+apt.ref+'</td></tr><tr><td style="padding:8px;color:#777777;font-size:13px">Department</td><td style="padding:8px;font-weight:600">'+dept+'</td></tr><tr><td style="padding:8px;color:#777777;font-size:13px">New Date</td><td style="padding:8px;font-weight:600">'+date+'</td></tr><tr><td style="padding:8px;color:#777777;font-size:13px">New Time</td><td style="padding:8px;font-weight:600">'+slot+'</td></tr></table><p style="font-size:12px;color:#777777;margin-top:16px">Please contact reception if you need to reschedule. Johannesburg CHC.</p></div></div>';
  try {
    if (apt.phone||apt.patientPhone) await API._fetchDirect('/notifications/sms',{method:'POST',body:JSON.stringify({to:apt.phone||apt.patientPhone,message:msg})}).catch(function(){});
    if (apt.email||apt.patientEmail) await API._fetchDirect('/notifications/email',{method:'POST',body:JSON.stringify({to:apt.email||apt.patientEmail,subject:'NIHMS — Appointment updated: '+apt.ref,html:emailHtml})}).catch(function(){});
  } catch(_){}

  _R._editApt = null;
  _rTab('appointments');
  UI.showToast('Appointment '+apt.ref+' updated'+(saved?' and saved to database':' (local only — check API connection)'),'ok');
};

/* ── Upgrade delay notification to send SMS + email + portal ─────────── */
window._rSendDelay = async function() {
  var dept=(document.getElementById('delay-dept')||{value:'all'}).value;
  var dur=(document.getElementById('delay-dur')||{value:'30'}).value;
  var reason=(document.getElementById('delay-reason')||{value:''}).value.trim();
  var text=dur+'-minute delay expected'+(dept!=='all'?' in '+dept:'')+'.'+( reason?' Reason: '+reason:'')+ ' We apologise for the inconvenience.';

  /* Post to notice board */
  _R.messages.unshift({id:Date.now(),from:'Reception — Delay Notice',to:dept==='all'?'All patients':'Patients in '+dept,text:text,time:_fmtTime(),read:true});

  /* Send to affected patients via SMS + email */
  var affected = _R.appointments.filter(function(a){
    return (dept==='all'||a.dept===dept) && a.status!=='cancelled' &&
           (a.date===new Date().toISOString().slice(0,10));
  });

  var sent=0;
  for(var i=0;i<affected.length;i++){
    var a=affected[i];
    var smsMsg='NIHMS DELAY NOTICE: '+dur+' min delay'+(dept!=='all'?' for '+dept:'')+'. '+( reason?'Reason: '+reason+'. ':'')+'We apologise for the inconvenience.';
    var emailHtml='<div style="font-family:inherit;max-width:500px;margin:0 auto"><div style="background:#d97706;padding:20px;border-radius:10px 10px 0 0;text-align:center"><h2 style="color:#fff;margin:0">Appointment Delay Notice</h2></div><div style="background:#fffbeb;padding:20px;border-radius:0 0 10px 10px"><p><strong>Dear patient,</strong></p><p>There is a <strong>'+dur+' minute delay</strong>'+(dept!=='all'?' for <strong>'+dept+'</strong>':'')+' today.</p>'+(reason?'<p>Reason: '+reason+'</p>':'')+'<p style="color:#92400e">Ref: '+a.ref+' · '+a.dept+' · '+a.time+'</p><p>We apologise for the inconvenience.</p></div></div>';
    try{
      if(a.phone||a.patientPhone){ await API._fetchDirect('/notifications/sms',{method:'POST',body:JSON.stringify({to:a.phone||a.patientPhone,message:smsMsg})}).catch(function(){}); sent++; }
      if(a.email||a.patientEmail){ await API._fetchDirect('/notifications/email',{method:'POST',body:JSON.stringify({to:a.email||a.patientEmail,subject:'NIHMS — Delay notice for your appointment',html:emailHtml})}).catch(function(){}); }
    }catch(_){}
  }

  _rRec();
  UI.showToast('Delay notice sent to '+sent+' patient'+(sent!==1?'s':'')+' via SMS & email','ok');
};

window._rSendVaxReminders = async function() {
  var days  = parseInt((document.getElementById('vax-remind-days')||{value:'7'}).value)||7;
  var dept  = (document.getElementById('vax-remind-type')||{value:'Immunisation'}).value;
  var cutoff= new Date(); cutoff.setDate(cutoff.getDate()+days);
  var cutStr= cutoff.toISOString().slice(0,10);
  var today = new Date().toISOString().slice(0,10);

  var targets = _R.appointments.filter(function(a){
    return a.status!=='cancelled' &&
           (dept==='all'||a.dept===dept) &&
           (a.date||'') > today &&
           (a.date||'') <= cutStr;
  });

  if (!targets.length) { UI.showToast('No upcoming appointments found in that range','warn'); return; }

  var sent = 0;
  for (var i=0; i<targets.length; i++) {
    var a   = targets[i];
    var msg = 'NIHMS REMINDER: You have an upcoming '+(a.dept||'')+ ' appointment on '+a.date+' at '+a.time+'. Ref: '+a.ref+'. Please arrive 10 minutes early. Johannesburg CHC. Queries: contact reception.';
    try {
      if (a.phone||a.patientPhone) {
        await API._fetchDirect('/notifications/sms',{method:'POST',body:JSON.stringify({to:a.phone||a.patientPhone,message:msg})}).catch(function(){});
        sent++;
      }
      if (a.email||a.patientEmail) {
        await API._fetchDirect('/notifications/email',{method:'POST',body:JSON.stringify({to:a.email||a.patientEmail,subject:'NIHMS — Appointment reminder: '+a.dept+' on '+a.date,html:'<p>'+msg+'</p>'})}).catch(function(){});
      }
    } catch(_){}
  }
  _R.messages.unshift({id:Date.now(),from:'Reception — Vaccination Reminder',to:dept,text:'Sent reminders for '+targets.length+' upcoming '+(dept==='all'?'':''+dept+' ')+'appointments.',time:_fmtTime(),read:true});
  _rRec();
  UI.showToast('Vaccination reminders sent to '+sent+' patient'+(sent!==1?'s':'')+' via SMS & email','ok');
};
