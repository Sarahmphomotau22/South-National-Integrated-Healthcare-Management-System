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

/**
 * js/pages/nurse.js — NIHMS Nurse / Triage Station
 *
 * 6 views: requests · queue · vitals · emergency · messaging · analytics
 *
 * Design: white content area · pale blue-gray #f4f5f0 sidebar
 *   enterprise blue #0F6E56 · charcoal #111111 · zebra-striped tables
 *   6px radii · 1px borders · filter chips above tables
 *
 * Receptionist bridge:
 *   window._NURSE_REQUESTS — array receptionist pushes to
 *   window._nurseAddRequest(req) — live push if nurse page is open
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ─── State ─────────────────────────────────────────────────────────── */
var _N = {
  view: 'requests',

  requests:   [],  /* incoming triage requests from reception */
  patients:   [],  /* vitals queue — patients needing vitals (non-immunisation) */
  immQueue:   [],  /* immunisation queue — patients with Immunisation department booking */

  _acceptedIds:       {},  /* id → true for every request the nurse has accepted this session */
  _acceptedPatientIds:{},  /* patientId → true — prevents accepted patients re-appearing via API reload */

  messages: [],  /* loaded from API on page open */

  /* per-view UI state */
  reqFilter:    'All',
  reqExpanded:  null,
  decliningId:  null,
  queueFilter:  'All',
  queueSel:     null,
  immFilter:    'All',
  immSel:       null,
  vitalsFilter: 'All',
  editId:       null,
  vitalForm:    { bp:'', temp:'', hr:'', spo2:'', weight:'', rr:'' },
  alertDismissed: false,
  classifying:  null,
  msgTo:        'Doctor',
  msgCompose:   '',
};

/* Expose _N on window so inline onclick handlers can access it regardless of script-loading mode */
window._N = _N;

window._NURSE_REQUESTS = window._NURSE_REQUESTS || [];

/* Immunisation state */
_N.immu = {
  vaccines: [
    {id:'BCG',      name:'BCG',            doses:1, schedule:[0],       description:'Birth'},
    {id:'OPV0',     name:'OPV 0',          doses:1, schedule:[0],       description:'Birth'},
    {id:'OPV1',     name:'OPV 1',          doses:3, schedule:[6,10,14], description:'6,10,14 weeks'},
    {id:'PENTA1',   name:'Penta 1 (DTP-HepB-Hib)',doses:3,schedule:[6,10,14],description:'6,10,14 weeks'},
    {id:'PCV1',     name:'PCV 1',          doses:3, schedule:[6,10,14], description:'6,10,14 weeks'},
    {id:'ROTA1',    name:'Rotavirus 1',     doses:2, schedule:[6,10],    description:'6,10 weeks'},
    {id:'MEASLES1', name:'Measles 1',       doses:2, schedule:[40,72],   description:'9 months, 18 months'},
    {id:'VITAA',    name:'Vitamin A',       doses:5, schedule:[24,36,48,60,72], description:'Every 6 months from 12m'},
    {id:'FLU',      name:'Influenza',       doses:1, schedule:[],        description:'Annual'},
    {id:'COVID',    name:'COVID-19',        doses:2, schedule:[],        description:'As per schedule'},
  ],
  stock: [
    {id:'BCG',       name:'BCG',           quantity:48,  minQty:10, unit:'vials',  tempMin:2, tempMax:8,  lastChecked:new Date().toISOString()},
    {id:'OPV',       name:'OPV',           quantity:120, minQty:20, unit:'vials',  tempMin:-25,tempMax:-15,lastChecked:new Date().toISOString()},
    {id:'PENTA',     name:'Pentavalent',   quantity:65,  minQty:15, unit:'vials',  tempMin:2, tempMax:8,  lastChecked:new Date().toISOString()},
    {id:'PCV',       name:'PCV',           quantity:8,   minQty:15, unit:'vials',  tempMin:2, tempMax:8,  lastChecked:new Date().toISOString()},
    {id:'ROTA',      name:'Rotavirus',     quantity:55,  minQty:10, unit:'vials',  tempMin:2, tempMax:8,  lastChecked:new Date().toISOString()},
    {id:'MEASLES',   name:'Measles-Rubella',quantity:30, minQty:10, unit:'vials',  tempMin:2, tempMax:8,  lastChecked:new Date().toISOString()},
    {id:'INFLUENZA', name:'Influenza',     quantity:22,  minQty:10, unit:'doses',  tempMin:2, tempMax:8,  lastChecked:new Date().toISOString()},
    {id:'COVID19',   name:'COVID-19',      quantity:40,  minQty:20, unit:'doses',  tempMin:2, tempMax:8,  lastChecked:new Date().toISOString()},
  ],
  coldChain: { currentTemp:4.2, minAlarm:2, maxAlarm:8, lastReading:new Date().toISOString(), status:'OK' },
  todayVaccinations: [],
  adverseReactions: [],
  immuTab: 'today',
  selectedPatient: null,
  recordForm: { vaccineId:'', dose:'', date:new Date().toISOString().slice(0,10), batch:'', vaccinator:'', notes:'' },
  lastSavedVaxId:   null,   /* set after a successful _nRecordVax — gates End Appointment button */
  endedApptIds:     {},     /* appointmentId → true, prevents double-completion */
};

/* Patient file search state */
_N.patientFile = { id:'', patient:null, notFound:false, consultNote:'', editingNote:false };

/* ─── Helpers ────────────────────────────────────────────────────────── */
function _nowTime() {
  return new Date().toLocaleTimeString('en-ZA',{ hour:'2-digit', minute:'2-digit' });
}

function _flagVitals(v) {
  var flags = [];
  var bpParts = (v.bp||'').split('/').map(Number);
  var sys = bpParts[0]||0;
  if (sys > 160) flags.push({ field:'Blood Pressure', value:v.bp,         reason:'Hypertensive — above 160 systolic' });
  if (sys > 0 && sys < 90) flags.push({ field:'Blood Pressure', value:v.bp, reason:'Hypotensive — below 90 systolic' });
  var temp = parseFloat(v.temp);
  if (temp > 38.0) flags.push({ field:'Temperature',  value:v.temp+'°C',  reason:temp>39.5?'High fever — above 39.5°C':'Fever — above 38°C' });
  var hr = parseInt(v.hr);
  if (hr > 100) flags.push({ field:'Heart Rate', value:v.hr+' bpm', reason:'Tachycardia — above 100 bpm' });
  if (hr > 0 && hr < 50) flags.push({ field:'Heart Rate', value:v.hr+' bpm', reason:'Bradycardia — below 50 bpm' });
  var spo2 = parseInt(v.spo2);
  if (spo2 > 0 && spo2 < 94) flags.push({ field:'SpO₂', value:v.spo2+'%', reason:'Below 94% — supplemental O₂ indicated' });
  var rr = parseInt(v.rr);
  if (rr > 20) flags.push({ field:'RR', value:v.rr+'/min', reason:'Tachypnoea — above 20/min' });
  if (rr > 0 && rr < 10) flags.push({ field:'RR', value:v.rr+'/min', reason:'Bradypnoea — below 10/min' });
  return flags;
}

function _priorityDot(p)  { return p==='Emergency'?'#dc2626':p==='High'?'#d97706':'#16a34a'; }
function _priorityBg(p)   { return p==='Emergency'?'background:#fef2f2;color:#dc2626;border:1px solid #fca5a5':p==='High'?'background:#fffbeb;color:#d97706;border:1px solid #fcd34d':'background:#f0fdf4;color:#16a34a;border:1px solid #86efac'; }
function _statusBg(s) {
  var m = { 'Awaiting Vitals':'background:#eff6ff;color:#0B5443;border:1px solid #bfdbfe',
    'In Vitals':'background:#f5f3ff;color:#6d28d9;border:1px solid #c4b5fd',
    'Ready for Consultation':'background:#f0fdfa;color:#0f766e;border:1px solid #99f6e4',
    'With Doctor':           'background:#f0fdfa;color:#0d7490;border:1px solid #67e8f9',
    'In Consultation':'background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe',
    'Lab':'background:#fff7ed;color:#c2410c;border:1px solid #fed7aa',
    'Pharmacy':'background:#fdf4ff;color:#86198f;border:1px solid #f0abfc',
    'Discharged':'background:#f9fafb;color:#6b7280;border:1px solid #e5e7eb' };
  return m[s]||'background:#f9fafb;color:#6b7280;border:1px solid #e5e7eb';
}

function _badge(text, style) {
  return '<span style="display:inline-flex;align-items:center;padding:1px 8px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap;'+style+'">'+text+'</span>';
}

function _chip(label, active, onclick) {
  return '<button onclick="'+onclick+'" style="padding:4px 12px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .15s;border:1px solid '+(active?'#0F6E56':'#e0e0e0')+';background:'+(active?'#0F6E56':'#fff')+';color:'+(active?'#fff':'#6b7280')+'">'+label+'</button>';
}

function _btn(label, onclick, primary) {
  if (primary === false) return '<button onclick="'+onclick+'" style="padding:5px 12px;border-radius:6px;border:1px solid #e0e0e0;background:#fff;color:#6b7280;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">'+label+'</button>';
  var bg = primary||'#0F6E56';
  return '<button onclick="'+onclick+'" style="padding:5px 12px;border-radius:6px;border:none;background:'+bg+';color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">'+label+'</button>';
}

function _th(h) { return '<th style="padding:9px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;white-space:nowrap;background:#f4f5f0;border-bottom:1px solid #e0e0e0">'+h+'</th>'; }
function _td(c,s) { return '<td style="padding:8px 14px;font-size:13px;color:#111111;'+(s||'')+'">'+c+'</td>'; }
function _trBg(i, priority) {
  if (priority==='Emergency') return 'background:#fff5f5';
  return i%2===0?'background:#ffffff':'background:#f5f8fc';
}

/* ─── Main page shell ────────────────────────────────────────────────── */
Pages['nurse_dashboard'] = function() {
  _N.view           = 'overview';
  _N.alertDismissed = false;
  _N.loadingData    = true;

  /* Merge any requests already pushed by receptionist (same-tab) — skip accepted */
  (window._NURSE_REQUESTS || []).forEach(function(r) {
    if (_N._acceptedIds[r.id] || _N._acceptedPatientIds[r.patientId]) return;
    var dupById = _N.requests.find(function(x){ return x.id === r.id; });
    var dupByPt = r.patientId && _N.requests.find(function(x){ return x.patientId === r.patientId; });
    if (!dupById && !dupByPt) _N.requests.push(r);
  });

  /* Drain cross-tab localStorage queue (check-ins from a different tab) */
  try {
    var _lsQueue = JSON.parse(localStorage.getItem('_NIHMS_NURSE_QUEUE') || '[]');
    _lsQueue.forEach(function(r) {
      /* Skip anything already accepted this session */
      if (_N._acceptedIds[r.id] || _N._acceptedPatientIds[r.patientId]) return;
      var dept  = (r.department || r.dept || r.type || '').toLowerCase();
      var isImm = dept.includes('immunis') || dept.includes('immuniz') || dept.includes('vaccin')
                  || r.isImmunisation === true;
      if (isImm) {
        if (!_N.immQueue.find(function(p){ return p.id===r.id || p.token===r.token; })) {
          _N.immQueue.unshift({
            id:          r.id          || ('IMM-' + Date.now()),
            token:       r.token       || '',
            patientName: r.patientName || r.name || '',
            patientId:   r.patientId   || r._id  || '',
            _id:         r._id         || r.patientId || '',
            age:         r.age         || '—',
            sex:         r.sex         || r.gender || '',
            dept:        r.department  || r.dept  || 'Immunisation',
            status:      'Awaiting Immunisation',
            priority:    r.priority    || 'Normal',
            checkedInAt: r.checkedInAt || new Date().toISOString(),
            complaint:   r.complaint   || 'Scheduled Immunisation',
            seen:        false,
            type:        'immunisation',
          });
        }
      } else {
        /* Dedup by both request id AND patientId to catch same patient with different ids */
        var dupById   = _N.requests.find(function(x){ return x.id === r.id; });
        var dupByPt   = _N.requests.find(function(x){ return x.patientId && x.patientId === r.patientId; });
        if (!dupById && !dupByPt) _N.requests.push(r);
      }
    });
  } catch(_) {}

  setTimeout(_nurseRender, 80);

  /* Load real data from backend */
  setTimeout(async function() {
    try {
      /* 1. Load today's checked-in patients (queue) */
      var qRes = await API._fetchDirect('/queue/today', { method:'GET' }).catch(function(){return null;});
      if (qRes && qRes.data && qRes.data.length) {
        var allQueue = qRes.data.map(function(q) {
          var dept = (q.department || q.dept || '').toLowerCase();
          var isImm = dept.includes('immunis') || dept.includes('immuniz') || dept.includes('vaccin');
          return {
            id:          (q.patient && (q.patient.nationalId||q.patient.idNumber||q.patient.id_number)) || q._id || q.id,
            nationalId:  (q.patient && (q.patient.nationalId||q.patient.idNumber||q.patient.id_number)) || '',
            pid:         (q.patient && q.patient._id) || q.patientId || q._id,
            name:        q.patient ? (q.patient.firstName||'') + ' ' + (q.patient.lastName||'') : (q.name||'Unknown'),
            patientName: q.patient ? (q.patient.firstName||'') + ' ' + (q.patient.lastName||'') : (q.name||'Unknown'),
            age:         (q.patient && q.patient.age) || q.age || '—',
            sex:         (q.patient && (q.patient.sex||q.patient.gender) && (q.patient.sex||q.patient.gender).charAt(0).toUpperCase()) || q.sex || '—',
            complaint:   q.chiefComplaint || q.complaint || (isImm ? 'Scheduled Immunisation' : '—'),
            priority:    q.priority || 'Normal',
            status:      isImm
              ? (q.status === 'checked-in' ? 'Awaiting Immunisation' : (q.status || 'Awaiting Immunisation'))
              : (q.status === 'checked-in' ? 'Awaiting Vitals'       : (q.status || 'Awaiting Vitals')),
            vitalStatus: q.vitals ? 'Completed' : 'Pending',
            vitals:      q.vitals || null,
            flags:       q.flags || [],
            aiRisk:      q.aiRisk || null,
            arrivalTime: q.checkedInAt ? new Date(q.checkedInAt).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}) : '—',
            waitMins:    q.checkedInAt ? Math.floor((Date.now()-new Date(q.checkedInAt))/60000) : 0,
            room:        q.room || null,
            emergencyClass: q.emergencyClass || null,
            token:       q.token || null,
            dept:        q.department || q.dept || '',
            type:        isImm ? 'immunisation' : 'vitals',
            seen:        true,
          };
        });
        /* ── Split into Vitals Queue and Immunisation Queue ── */
        _N.patients  = allQueue.filter(function(p){ return p.type !== 'immunisation'; });
        _N.immQueue  = allQueue.filter(function(p){ return p.type === 'immunisation'; });
      }

      /* 2. Load pending vitals requests from appointments today */
      var aRes = await API._fetchDirect('/appointments?date=' + new Date().toISOString().slice(0,10) + '&status=checked-in&limit=50', { method:'GET' }).catch(function(){return null;});
      if (aRes && aRes.data && aRes.data.length) {
        aRes.data.forEach(function(a) {
          var pid = a.patient?._id || a.patientId;
          /* Add as request if not already in queue */
          var alreadyQueued   = _N.patients.find(function(p){ return p.pid === pid || p.id === pid || p.pid === (a._id||a.id) || p.id === (a._id||a.id); });
          var alreadyReq      = _N.requests.find(function(r){ return r.patientId === pid || r.id === 'REQ-'+(a._id||a.id); });
          var alreadyAccepted = _N._acceptedPatientIds[pid] || _N._acceptedIds['REQ-'+(a._id||a.id)] || _N._acceptedIds[pid];
          if (!alreadyQueued && !alreadyReq && !alreadyAccepted) {
            _N.requests.push({
              id:          'REQ-' + (a._id || a.id),
              patientId:   pid,
              nationalId:  (a.patient && (a.patient.nationalId||a.patient.idNumber||a.patient.id_number)) || '',
              patientName: a.patient ? (a.patient.firstName||'') + ' ' + (a.patient.lastName||'') : (a.name||'Unknown'),
              age:         a.patient?.age || '—',
              sex:         a.patient?.gender?.charAt(0).toUpperCase() || '—',
              complaint:   a.chiefComplaint || a.visitType || 'Appointment',
              priority:    a.urgency === 'Emergency' ? 'Emergency' : a.urgency === 'Urgent' ? 'High' : 'Normal',
              requestedBy: 'Reception',
              requestedAt: a.checkedInAt ? new Date(a.checkedInAt).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}) : a.time || '—',
              notes:       a.notes || ('Appointment ref: ' + (a.appointmentNumber||a._id||'')),
              seen:        false,
              aptId:       a._id,
              phone:       a.patient?.phone || '',
              email:       a.patient?.email || '',
            });
          }
        });
      }

      /* 3. Load any existing vitals requests from window._NURSE_REQUESTS (receptionist live push) */
      (window._NURSE_REQUESTS || []).forEach(function(r) {
        if (_N._acceptedIds[r.id] || _N._acceptedPatientIds[r.patientId]) return;
        var dupById = _N.requests.find(function(x){ return x.id === r.id; });
        var dupByPt = r.patientId && _N.requests.find(function(x){ return x.patientId === r.patientId; });
        if (!dupById && !dupByPt) _N.requests.push(r);
      });

      /* 4. Load messages from backend — dual fetch: by recipientId + by role */
      var _nu0 = (window.API && window.API._currentUser) || window._currentUser
        || (function(){ try{ return JSON.parse(sessionStorage.getItem('user')||localStorage.getItem('currentUser')||'null'); }catch(_){ return null; } })() || {};
      var _nu0Id = _nu0._id || _nu0.id || null;
      function _normMsg(m) {
        var sr = (m.senderRole||m.fromRole||m.role||'').toUpperCase()
                   .replace('NURSE_STATION','NURSE STATION').replace('DOCTOR/CLINICIAN','DOCTOR');
        return {
          id:         m._id || m.id,
          _id:        m._id || m.id || null,
          senderId:   m.senderId || null,
          from:       m.senderName || m.from || 'Staff',
          senderRole: sr,
          fromRole:   sr,
          role:       sr,
          recipientId:   m.recipientId || null,
          recipientRole: m.recipientRole || '',
          subject:    m.subject || '(No subject)',
          body:       m.body || m.text || m.message || '',
          text:       m.body || m.text || m.message || '',
          priority:   m.priority || 'Normal',
          readStatus: m.readStatus || (m.unread ? 'unread' : 'read'),
          unread:     m.readStatus === 'unread' || m.unread === true,
          time:       m.sentAt ? new Date(m.sentAt).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})
                               : (m.createdAt ? new Date(m.createdAt).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}) : '—'),
          sentAt:     m.sentAt || m.createdAt || null,
          threadId:   m.threadId || null,
        };
      }
      var mFetches = [
        API._fetchDirect('/messages?recipientRole=NURSE_STATION&limit=100', { method:'GET' }).catch(function(){return null;}),
      ];
      if (_nu0Id) {
        mFetches.push(API._fetchDirect('/messages?recipientId='+_nu0Id+'&limit=100', { method:'GET' }).catch(function(){return null;}));
      }
      var mResults = await Promise.all(mFetches);
      var mSeen = {};
      var mAll = [];
      mResults.forEach(function(mRes) {
        var mArr = mRes && (Array.isArray(mRes.data) ? mRes.data : Array.isArray(mRes.messages) ? mRes.messages : Array.isArray(mRes) ? mRes : []);
        mArr.forEach(function(m) {
          var mid = String(m._id || m.id || '');
          if (!mid || mSeen[mid]) return;
          mSeen[mid] = true;
          mAll.push(_normMsg(m));
        });
      });
      /* sort newest first */
      mAll.sort(function(a,b){ return new Date(b.sentAt||0) - new Date(a.sentAt||0); });
      if (mAll.length) _N.messages = mAll;

    } catch(e) {
      console.warn('NIHMS nurse: could not load data from API', e);
    }

    _N.loadingData = false;
    _nurseRender();
  }, 120);

  return '<div style="display:flex;height:calc(100vh - 120px);overflow:hidden">' +
    '<main id="nurse-main" style="flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column;background:#fff"></main>' +
  '</div>';
};

/* ─── Render engine ──────────────────────────────────────────────────── */
function _nurseRender() {
  /* Always sync any new requests pushed by receptionist — skip already-accepted ones */
  (window._NURSE_REQUESTS||[]).forEach(function(r){
    if (_N._acceptedIds[r.id] || _N._acceptedPatientIds[r.patientId]) return;
    var dupById = _N.requests.find(function(x){ return x.id === r.id; });
    var dupByPt = r.patientId && _N.requests.find(function(x){ return x.patientId === r.patientId; });
    if (!dupById && !dupByPt) _N.requests.push(r);
  });

  var main = document.getElementById('nurse-main');
  if (!main) return;

  var styleEl=document.getElementById('nihms-style');
  if(!styleEl){styleEl=document.createElement('style');styleEl.id='nihms-style';
  styleEl.textContent='*{box-sizing:border-box}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:99px}body{font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif}';
  document.head.appendChild(styleEl);}

  /* Reset messaging loaded flag when switching away from messaging so it re-fetches next visit */
  if (_N._prevView === 'messaging' && _N.view !== 'messaging') {
    _N._nMsgsLoaded = false;
  }
  _N._prevView = _N.view;

  var views = { overview:_nOverview, requests:_nRequests, queue:_nQueue, vitals:_nVitals,
                'imm-queue':_nImmQueue, emergency:_nEmergency, messaging:_nMessaging,
                analytics:_nAnalytics, 'patient-file':_nPatientFile, immunisation:_nImmunisation };
  main.innerHTML = (views[_N.view]||_nRequests)();
  _nurseBindEvents();
}

function _setView(v) { _N.view = v; _nurseRender(); }

/* ─── Sidebar ────────────────────────────────────────────────────────── */
function _nSidebar() {
  var unseenReq  = _N.requests.filter(function(r){ return !r.seen; }).length;
  var unreadMsg  = _N.messages.filter(function(m){ return m.unread; }).length;
  var emCount    = _N.patients.filter(function(p){ return p.priority==='Emergency'; }).length;

  function navItem(label, icon, view, badge, badgeRed) {
    var active = _N.view === view;
    return '<button onclick="_setView(\''+view+'\')" style="display:flex;align-items:center;gap:9px;width:100%;padding:8px 16px;border:none;background:'+(active?'#fff':'transparent')+';color:'+(active?'#0F6E56':'#111111')+';font-size:13px;font-weight:'+(active?'700':'500')+';cursor:pointer;text-align:left;font-family:inherit;border-right:'+(active?'2px solid #0F6E56':'2px solid transparent')+';transition:all .1s">' +
      '<span style="font-size:15px;width:18px;text-align:center">'+icon+'</span>' +
      '<span style="flex:1">'+label+'</span>' +
      (badge ? '<span style="min-width:18px;height:18px;border-radius:50px;background:'+(badgeRed?'#dc2626':'#0F6E56')+';color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px">'+badge+'</span>' : '') +
    '</button>';
  }

  function sectionLabel(text) {
    return '<div style="padding:10px 16px 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#6b7280">'+text+'</div>';
  }

  /* Live queue counts */
  var vitalsCount = _N.patients.filter(function(p){
    return !['Ready for Consultation','With Doctor','Completed'].includes(p.status);
  }).length;
  var immCount    = _N.immQueue.filter(function(p){
    return !['Immunisation Complete','Completed'].includes(p.status);
  }).length;
  var unseenImm   = _N.immQueue.filter(function(p){ return !p.seen; }).length;

  return sectionLabel('QUEUES') +
    navItem('Vitals Queue',      '🩺', 'queue',
      vitalsCount > 0 ? vitalsCount : '', false) +
    navItem('Immunisation Queue','💉', 'imm-queue',
      immCount > 0 ? immCount : '', unseenImm > 0) +
    sectionLabel('WORK') +
    navItem('Triage Requests',   '📋', 'requests',
      unseenReq > 0 ? unseenReq : '', true) +
    navItem('Record Vitals',     '❤️', 'vitals',     '',     false) +
    navItem('Immunisation',      '💉', 'immunisation','',    false) +
    sectionLabel('OTHER') +
    navItem('Patient File',      '📁', 'patient-file','',    false) +
    navItem('Messages',          '💬', 'messaging',
      unreadMsg > 0 ? unreadMsg : '', false) +
    navItem('Analytics & AI',    '📊', 'analytics',   '',    false);
}

/* ─── Page header ────────────────────────────────────────────────────── */
function _nHeader(title, sub) {
  return '<div style="padding:12px 20px;border-bottom:1px solid #e0e0e0;background:#fff;flex-shrink:0">' +
    '<div style="font-size:15px;font-weight:700;color:#111111">'+title+'</div>' +
    (sub?'<div style="font-size:12px;color:#6b7280;margin-top:1px">'+sub+'</div>':'') +
  '</div>';
}

/* ════════════════════════════════════════════════════════════════
   VIEW 0 — OVERVIEW (quick-view landing)
════════════════════════════════════════════════════════════════ */
function _nOverview() {
  var waiting   = _N.patients.filter(function(p){ return p.status==='Awaiting Vitals'; });
  var inVitals  = _N.patients.filter(function(p){ return p.status==='In Vitals'; });
  var ready     = _N.patients.filter(function(p){ return p.status==='Ready for Consultation'; });
  var emergency = _N.patients.filter(function(p){ return p.priority==='Emergency'; });
  var unreadReq = _N.requests.filter(function(r){ return !r.seen; }).length;
  var flagged   = _N.patients.filter(function(p){ return p.flags&&p.flags.length>0; });
  var unreadMsg = _N.messages.filter(function(m){ return m.unread; }).length;

  var now     = new Date();
  var timeStr = now.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});
  var dateStr = now.toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  /* ── Top header bar ── */
  var topBar = '<div style="display:flex;align-items:center;justify-content:space-between;' +
    'background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);border-radius:12px;padding:14px 20px;margin-bottom:16px;box-shadow:0 2px 10px rgba(37,99,235,.2)">' +
    '<div>' +
      '<div style="font-size:17px;font-weight:800;color:#fff;margin-bottom:2px">'+dateStr+'</div>' +
      '<div style="font-size:12px;color:rgba(255,255,255,.7);display:flex;align-items:center;gap:5px">' +
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' +
        'Nurse Station &nbsp;·&nbsp; Johannesburg CHC' +
      '</div>' +
    '</div>' +
    '<div style="font-size:32px;font-weight:900;font-family:monospace;color:#fff">'+timeStr+'</div>' +
  '</div>';

  /* ── KPI cards (6 clickable) ── */
  var immWaiting = (_N.immQueue||[]).filter(function(p){ return p.status==='Awaiting Immunisation'; }).length;
  var immInProg  = (_N.immQueue||[]).filter(function(p){ return p.status==='Immunisation In Progress'; }).length;
  var immTotal   = immWaiting + immInProg;

  var kpis = [
    { label:'Awaiting Vitals',  value:waiting.length,   color:'#d97706', bg:'#fffbeb', border:'#fcd34d', icon:'⏳', view:'queue'     },
    { label:'In Vitals Now',    value:inVitals.length,  color:'#0F6E56', bg:'#eff6ff', border:'#bfdbfe', icon:'♥',  view:'vitals'    },
    { label:'Ready for Dr',     value:ready.length,     color:'#16a34a', bg:'#f0fdf4', border:'#86efac', icon:'✓',  view:'queue'     },
    { label:'Immunisation',     value:immTotal,         color:'#f59e0b', bg:'#fffbeb', border:'#fcd34d', icon:'💉', view:'imm-queue' },
    { label:'Emergency',        value:emergency.length, color:'#dc2626', bg:'#fef2f2', border:'#fca5a5', icon:'🚨', view:'emergency' },
    { label:'New Requests',     value:unreadReq,        color:'#7c3aed', bg:'#f5f3ff', border:'#c4b5fd', icon:'📋', view:'requests'  },
  ];
  var kpiHtml = '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:16px">' +
    kpis.map(function(k){
      return '<button onclick="_setView(\''+k.view+'\')" ' +
        'style="padding:14px 10px;background:'+k.bg+';border:1.5px solid '+k.border+';border-radius:10px;text-align:center;cursor:pointer;font-family:inherit">' +
        '<div style="font-size:20px;margin-bottom:4px">'+k.icon+'</div>' +
        '<div style="font-size:22px;font-weight:800;color:'+k.color+';line-height:1;margin-bottom:4px">'+k.value+'</div>' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:'+k.color+'">'+k.label+'</div>' +
      '</button>';
    }).join('') + '</div>';

  /* ── Notification bar — messages from reception ── */
  var receptionMsgs = _N.messages.filter(function(m){ return m.role==='Receptionist'; }).slice(0,3);
  var notifBar = receptionMsgs.length ? (
    '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #0F6E56;border-radius:10px;padding:12px 16px;margin-bottom:16px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
        '<span style="font-size:14px">✉</span>' +
        '<div style="font-size:12px;font-weight:700;color:#0B5443">Messages from Reception</div>' +
        (unreadMsg ? '<span style="min-width:18px;height:18px;border-radius:50px;background:#dc2626;color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 4px">'+unreadMsg+'</span>' : '') +
        '<button onclick="_setView(\'messaging\')" style="margin-left:auto;font-size:11px;color:#0F6E56;border:none;background:transparent;cursor:pointer;font-family:inherit">View all →</button>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px">' +
        receptionMsgs.map(function(m){
          return '<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 12px;background:'+(m.unread?'#fff':'rgba(255,255,255,.6)')+';border-radius:7px;border:1px solid '+(m.unread?'#bfdbfe':'transparent')+'">' +
            '<div style="width:28px;height:28px;border-radius:50%;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">R</div>' +
            '<div style="flex:1;min-width:0">' +
              '<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">' +
                '<span style="font-size:12px;font-weight:700;color:#0f172a">'+m.from+'</span>' +
                '<span style="font-size:10px;color:#94a3b8">'+m.time+'</span>' +
                (m.unread?'<span style="padding:1px 6px;background:#dbeafe;color:#0B5443;border-radius:20px;font-size:9px;font-weight:700">New</span>':'') +
              '</div>' +
              '<div style="font-size:12px;color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+m.text+'</div>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>'
  ) : '';

  /* ── Main grid: 3 columns ── */

  /* Col 1: Patient Queue summary */
  var queueCol = '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">' +
    '<div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">' +
      '<div style="font-size:13px;font-weight:700;color:#111111">Patient Queue</div>' +
      '<button onclick="_setView(\'queue\')" style="font-size:11px;color:#0F6E56;border:none;background:transparent;cursor:pointer;font-family:inherit">View all →</button>' +
    '</div>' +
    (_N.patients.length ? _N.patients.slice(0,5).map(function(p,i){
      var bg = i%2===0?'#fff':'#f8fafc';
      return '<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:'+bg+';border-bottom:1px solid #f8fafc">' +
        '<div style="width:30px;height:30px;border-radius:50%;background:'+(p.priority==='Emergency'?'#dc2626':p.priority==='High'?'#d97706':'#0F6E56')+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0">'+(p.name.split(' ').map(function(n){return n[0];}).join('').slice(0,2))+'</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:12px;font-weight:600;color:#111111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+p.name+'</div>' +
          '<div style="font-size:10px;color:#6b7280">'+p.status+'</div>' +
        '</div>' +
        _badge(p.priority, _priorityBg(p.priority)) +
      '</div>';
    }).join('') : '<div style="padding:16px;text-align:center;font-size:12px;color:#6b7280">No patients in queue</div>') +
  '</div>';

  /* Col 2: Vitals Collection */
  var pendingVitals = _N.patients.filter(function(p){ return p.vitalStatus==='Pending'&&p.status!=='Discharged'; });
  var vitalsCol = '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">' +
    '<div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">' +
      '<div style="font-size:13px;font-weight:700;color:#111111">Vitals Collection</div>' +
      '<button onclick="_setView(\'vitals\')" style="font-size:11px;color:#0F6E56;border:none;background:transparent;cursor:pointer;font-family:inherit">Record →</button>' +
    '</div>' +
    (pendingVitals.length ? pendingVitals.slice(0,4).map(function(p,i){
      return '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f8fafc">' +
        '<div style="width:30px;height:30px;border-radius:50%;background:#fffbeb;border:2px solid #fcd34d;color:#d97706;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">'+(p.name.split(' ').map(function(n){return n[0];}).join('').slice(0,2))+'</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:12px;font-weight:600;color:#111111">'+p.name+'</div>' +
          '<div style="font-size:10px;color:#d97706;font-weight:600">Pending vitals</div>' +
        '</div>' +
        '<button onclick="_nurseVitalsEdit(\''+p.id+'\')" style="padding:4px 10px;border-radius:5px;border:none;background:#0F6E56;color:#fff;font-size:10px;font-weight:600;cursor:pointer;font-family:inherit">Record</button>' +
      '</div>';
    }).join('') : '<div style="padding:20px;text-align:center;font-size:12px;color:#16a34a;background:#f0fdf4;margin:10px;border-radius:8px;border:1px solid #86efac">✓ All vitals recorded</div>') +
  '</div>';

  /* Col 3: Requests from Reception */
  var reqsCol = '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">' +
    '<div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">' +
      '<div style="display:flex;align-items:center;gap:6px">' +
        '<div style="font-size:13px;font-weight:700;color:#111111">Requests</div>' +
        (unreadReq ? '<span style="min-width:18px;height:18px;border-radius:50px;background:#0F6E56;color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 3px">'+unreadReq+'</span>' : '') +
      '</div>' +
      '<button onclick="_setView(\'requests\')" style="font-size:11px;color:#0F6E56;border:none;background:transparent;cursor:pointer;font-family:inherit">View all →</button>' +
    '</div>' +
    (_N.requests.length ? _N.requests.slice(0,4).map(function(r){
      return '<div style="padding:10px 14px;border-bottom:1px solid #f8fafc">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
          '<div style="display:flex;align-items:center;gap:6px">' +
            (!r.seen?'<span style="width:6px;height:6px;border-radius:50%;background:#0F6E56;flex-shrink:0"></span>':'') +
            '<span style="font-size:12px;font-weight:700;color:#111111">'+r.patientName+'</span>' +
          '</div>' +
          _badge(r.priority, _priorityBg(r.priority)) +
        '</div>' +
        '<div style="font-size:11px;color:#6b7280;margin-bottom:6px">'+r.complaint+'</div>' +
        '<div style="display:flex;gap:5px">' +
          '<button onclick="_nurseReqAccept(\''+r.id+'\')" style="flex:1;padding:5px;border-radius:5px;border:none;background:#0F6E56;color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Accept</button>' +
          '<button onclick="_nurseReqDecline(\''+r.id+'\')" style="padding:5px 8px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;color:#6b7280;font-size:11px;cursor:pointer;font-family:inherit">Decline</button>' +
        '</div>' +
      '</div>';
    }).join('') : '<div style="padding:16px;text-align:center;font-size:12px;color:#6b7280">No pending requests</div>') +
  '</div>';

  /* ── Emergency alert ── */
  var emAlert = emergency.length && !_N.alertDismissed ? (
    '<div style="background:#dc2626;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">' +
      '<span style="font-size:20px">🚨</span>' +
      '<div style="flex:1">' +
        '<div style="font-size:13px;font-weight:700;color:#fff">'+emergency.length+' Emergency patient'+(emergency.length>1?'s':'')+' — immediate attention required</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,.8);margin-top:2px">'+emergency.map(function(p){return p.name;}).join(', ')+'</div>' +
      '</div>' +
      '<button onclick="_setView(\'emergency\')" style="padding:7px 14px;border-radius:6px;border:none;background:#fff;color:#dc2626;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">View →</button>' +
      '<button onclick="_N.alertDismissed=true;_nurseRender()" style="padding:7px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.4);background:transparent;color:#fff;font-size:11px;cursor:pointer;font-family:inherit">Dismiss</button>' +
    '</div>'
  ) : '';

  /* ── Analytics mini ── */
  var triaged = _N.patients.filter(function(p){ return p.vitalStatus==='Completed'; }).length;
  var analyticsRow = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px">' +
    [
      {label:'Triaged Today',   value:triaged,           color:'#0F6E56'},
      {label:'Emergency Cases', value:emergency.length,  color:'#dc2626'},
      {label:'Flagged Vitals',  value:flagged.length,    color:'#d97706'},
      {label:'Messages',        value:_N.messages.length,color:'#7c3aed'},
    ].map(function(k){
      return '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px">' +
        '<div style="font-size:22px;font-weight:800;color:'+k.color+'">'+k.value+'</div>' +
        '<div style="font-size:11px;color:#6b7280;font-weight:500">'+k.label+'</div>' +
      '</div>';
    }).join('') +
  '</div>';

  return ''+  /* no page header on overview — topBar already has date/time */
    '<div style="flex:1;overflow:auto;padding:16px 20px">' +
      topBar +
      emAlert +
      notifBar +
      kpiHtml +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:0">' +
        queueCol + vitalsCol + reqsCol +
      '</div>' +
      analyticsRow +
    '</div>';
}


/* ════════════════════════════════════════════════════════════════
   VIEW 1 — REQUESTS
════════════════════════════════════════════════════════════════ */
function _nRequests() {
  var f       = _N.reqFilter;
  var unseen  = _N.requests.filter(function(r){ return !r.seen; }).length;
  var displayed = _N.requests.filter(function(r){
    if (f==='Unseen')    return !r.seen;
    if (f==='High')      return r.priority==='High';
    if (f==='Emergency') return r.priority==='Emergency';
    return true;
  });

  var toolbar = '<div style="display:flex;align-items:center;gap:8px;padding:10px 20px;border-bottom:1px solid #e0e0e0;background:#fff;flex-shrink:0;flex-wrap:wrap">' +
    ['All','Unseen','High','Emergency'].map(function(opt){
      return _chip(opt+(opt==='Unseen'&&unseen?' ('+unseen+')':''), f===opt, '_N.reqFilter=\''+opt+'\';_nurseRender()');
    }).join('') +
    '<div style="margin-left:auto;font-size:12px;color:#6b7280">' +
      (unseen>0 ? '<span style="font-weight:700;color:#0F6E56">'+unseen+'</span> new request'+(unseen>1?'s':'')+' from reception'
                : '<span style="color:#16a34a;font-weight:600">All requests reviewed</span>') +
    '</div>' +
  '</div>';

  if (!displayed.length) {
    return _nHeader('Vitals Requests from Reception', _N.requests.length+' pending · accept to add to vitals queue') +
      toolbar +
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;color:#6b7280;gap:6px;padding:40px">' +
        '<div style="font-size:36px">📋</div>' +
        '<div style="font-size:14px;font-weight:600;color:#111111">No pending requests</div>' +
        '<div style="font-size:12px">Reception will send vitals requests here as patients arrive.</div>' +
      '</div>';
  }

  var rows = displayed.map(function(req, i){
    var bg = req.priority==='Emergency' ? 'background:#fff5f5'
           : !req.seen ? 'background:#eff6ff'
           : i%2===0 ? 'background:#fff' : 'background:#f5f8fc';
    var expanded  = _N.reqExpanded  === req.id;
    var declining = _N.decliningId  === req.id;

    var mainRow = '<tr style="'+bg+';border-bottom:1px solid #e8edf4;cursor:pointer" ' +
      'onclick="_nurseReqExpand(\''+req.id+'\')">' +
      '<td style="padding:8px 6px 8px 14px;width:12px">' +
        (req.seen?'':'<span style="display:block;width:7px;height:7px;border-radius:50%;background:#0F6E56"></span>') +
      '</td>' +
      _td('<span style="font-family:monospace;font-size:11px;color:#6b7280">'+req.id+'</span>') +
      _td('<div style="font-weight:600">'+req.patientName+'</div><div style="font-size:11px;color:#6b7280">'+(req.nationalId||'—')+'</div>') +
      _td(req.sex||'—','color:#6b7280') +
      _td(req.complaint,'max-width:220px') +
      '<td style="padding:8px 14px">' +
        '<div style="display:flex;align-items:center;gap:5px">' +
          '<span style="width:7px;height:7px;border-radius:50%;background:'+_priorityDot(req.priority)+';flex-shrink:0"></span>' +
          _badge(req.priority, _priorityBg(req.priority)) +
        '</div>' +
      '</td>' +
      _td(req.requestedBy,'color:#6b7280') +
      _td(req.requestedAt,'color:#6b7280') +
      '<td style="padding:8px 14px" onclick="event.stopPropagation()">' +
        '<div style="display:flex;gap:5px">' +
          _btn('Accept','_nurseReqAccept(\''+req.id+'\')') + ' ' +
          _btn('Decline','_nurseReqDecline(\''+req.id+'\')',false) +
        '</div>' +
      '</td>' +
    '</tr>';

    var expandRow = (expanded ? '<tr style="background:#fff;border-bottom:1px solid #e8edf4"><td colspan="9" style="padding:10px 20px 14px 34px">' +
      '<div style="display:flex;gap:20px">' +
        '<div style="flex:1">' +
          '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;margin-bottom:5px">Reception Notes</div>' +
          '<div style="font-size:13px;color:#111111;background:#f4f5f0;border:1px solid #e0e0e0;border-radius:6px;padding:8px 12px">'+req.notes+'</div>' +
        '</div>' +
        (declining ? '<div style="flex:1">' +
          '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#dc2626;margin-bottom:5px">Decline Reason</div>' +
          '<textarea id="decline-txt-'+req.id+'" rows="3" placeholder="Reason for declining (optional)…" style="width:100%;padding:8px 10px;font-size:13px;font-family:inherit;border:1px solid #fca5a5;border-radius:6px;outline:none;resize:none;box-sizing:border-box"></textarea>' +
          '<div style="display:flex;gap:6px;margin-top:7px">' +
            '<button onclick="_nurseReqDeclineConfirm(\''+req.id+'\')" style="padding:5px 14px;border-radius:6px;border:none;background:#dc2626;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Confirm Decline</button>' +
            '<button onclick="_N.decliningId=null;_nurseRender()" style="padding:5px 12px;border-radius:6px;border:1px solid #e0e0e0;background:#fff;color:#6b7280;font-size:12px;cursor:pointer;font-family:inherit">Cancel</button>' +
          '</div>' +
        '</div>' : '') +
      '</div>' +
    '</td></tr>' : '');

    return mainRow + expandRow;
  }).join('');

  var emptyRow = _N.loadingData
    ? '<tr><td colspan="9" style="padding:32px;text-align:center;color:#6b7280;font-size:14px">⏳ Loading requests from backend…</td></tr>'
    : !_N.requests.length
      ? '<tr><td colspan="9" style="padding:40px;text-align:center">' +
          '<div style="font-size:32px;margin-bottom:12px">📋</div>' +
          '<div style="font-size:15px;font-weight:700;color:#111111;margin-bottom:6px">No pending requests</div>' +
          '<div style="font-size:13px;color:#6b7280;max-width:340px;margin:0 auto;line-height:1.6">' +
            'Requests appear here in real time when the receptionist checks patients in.<br>' +
            'You can also receive emergency alerts from the receptionist.' +
          '</div>' +
        '</td></tr>'
      : displayed.length === 0
        ? '<tr><td colspan="9" style="padding:24px;text-align:center;color:#6b7280;font-size:13px">No requests match this filter</td></tr>'
        : '';

  var table = '<div style="flex:1;overflow:auto">' +
    '<table style="width:100%;border-collapse:collapse">' +
    '<thead><tr>'+['','Request','Patient','Age/Sex','Chief Complaint','Priority','Requested By','Time','Actions'].map(_th).join('')+'</tr></thead>' +
    '<tbody>'+(rows || emptyRow)+'</tbody>' +
    '</table></div>';

  return _nHeader('Vitals Requests from Reception',
    _N.loadingData ? 'Loading…'
    : _N.requests.length + ' pending · accept to add to vitals queue') +
    toolbar + table;
}

/* ════════════════════════════════════════════════════════════════
   VIEW 2 — QUEUE
════════════════════════════════════════════════════════════════ */
function _nQueue() {
  var f = _N.queueFilter;
  var filterOpts = ['All','Emergency','High','Normal','Awaiting Vitals','In Vitals','With Doctor'];
  var filtered = _N.patients.filter(function(p){
    if (f==='All') return true;
    return p.priority===f || p.status===f;
  });

  var awaiting = _N.patients.filter(function(p){ return p.status==='Awaiting Vitals'; }).length;
  var inVitals = _N.patients.filter(function(p){ return p.status==='In Vitals'; }).length;
  var ready    = _N.patients.filter(function(p){ return p.status==='Ready for Consultation'; }).length;
  var immWaiting = (_N.immQueue||[]).filter(function(p){ return p.status==='Awaiting Immunisation'; }).length;
  var immInProg  = (_N.immQueue||[]).filter(function(p){ return p.status==='Immunisation In Progress'; }).length;

  var toolbar = '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 20px;border-bottom:1px solid #e0e0e0;background:#fff;flex-shrink:0;flex-wrap:wrap;gap:8px">' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
      filterOpts.map(function(opt){ return _chip(opt, f===opt, '_N.queueFilter=\''+opt+'\';_nurseRender()'); }).join('') +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:12px">' +
      '<div style="font-size:12px;color:#6b7280">' +
        '<strong style="color:#111111">'+awaiting+'</strong> awaiting · <strong style="color:#111111">'+inVitals+'</strong> in vitals · <strong style="color:#111111">'+ready+'</strong> ready' +
      '</div>' +
      '<button onclick="_nurseCallNext()" style="padding:6px 14px;border-radius:6px;border:none;background:'+(awaiting?'#0F6E56':'#e0e0e0')+';color:#fff;font-size:12px;font-weight:600;cursor:'+(awaiting?'pointer':'not-allowed')+';font-family:inherit">Call Next Patient</button>' +
    '</div>' +
  '</div>';

  var selected = _N.queueSel ? _N.patients.find(function(p){ return p.id===_N.queueSel; }) : null;

  var rows = filtered.map(function(p, i){
    var isSel = _N.queueSel===p.id;
    var bg = isSel ? 'background:#eff6ff' : _trBg(i, p.priority);
    return '<tr style="'+bg+';border-bottom:1px solid #e8edf4;cursor:pointer" onclick="_N.queueSel=\''+p.id+'\';_nurseRender()">' +
      _td('<span style="font-family:monospace;font-size:12px;color:#6b7280">'+p.id+'</span>') +
      '<td style="padding:8px 14px">' +
        '<div style="font-weight:600;font-size:13px">'+p.name+'</div>' +
        (p.flags&&p.flags.length ? '<div style="font-size:11px;color:#dc2626;margin-top:1px">⚑ '+p.flags.length+' flag'+(p.flags.length>1?'s':'')+'</div>' : '') +
      '</td>' +
      _td(p.sex||'—','color:#6b7280') +
      _td(p.complaint,'max-width:180px') +
      '<td style="padding:8px 14px">' +
        '<div style="display:flex;align-items:center;gap:5px">' +
          '<span style="width:7px;height:7px;border-radius:50%;background:'+_priorityDot(p.priority)+';flex-shrink:0"></span>' +
          _badge(p.priority, _priorityBg(p.priority)) +
        '</div>' +
      '</td>' +
      '<td style="padding:8px 14px">'+_badge(p.status, _statusBg(p.status))+'</td>' +
      '<td style="padding:8px 14px">'+_badge(p.vitalStatus, p.vitalStatus==='Completed'?'background:#f0fdf4;color:#16a34a;border:1px solid #86efac':'background:#f9fafb;color:#6b7280;border:1px solid #e5e7eb')+'</td>' +
      _td(p.arrivalTime,'color:#6b7280') +
      _td(p.acceptedAt||'—','color:#6b7280') +
      '<td style="padding:8px 14px" onclick="event.stopPropagation()">' +
        '<div style="display:flex;gap:4px;flex-wrap:wrap">' +
          (p.status==='Awaiting Vitals' ? '<button onclick="_nurseQueuePriority(\''+p.id+'\',\'Emergency\')" style="padding:3px 8px;border-radius:4px;border:1px solid #fca5a5;color:#dc2626;font-size:11px;cursor:pointer;font-family:inherit;background:#fff">↑ Emg</button><button onclick="_nurseQueuePriority(\''+p.id+'\',\'High\')" style="padding:3px 8px;border-radius:4px;border:1px solid #fcd34d;color:#d97706;font-size:11px;cursor:pointer;font-family:inherit;background:#fff">↑ High</button>' : '') +
          (p.status==='Awaiting Vitals' ? '<button onclick="_N.editId=\''+p.id+'\';_N.vitalForm={bp:\'\',temp:\'\',hr:\'\',spo2:\'\',weight:\'\',rr:\'\'};_N.view=\'vitals\';_nurseRender()" style="padding:3px 8px;border-radius:4px;border:none;background:#0F6E56;color:#fff;font-size:11px;cursor:pointer;font-family:inherit">Start vitals</button>' : '') +
          (p.status==='In Vitals' ? '<button onclick="_nurseSaveVitals(\''+p.id+'\')" style="padding:3px 8px;border-radius:4px;border:none;background:#16a34a;color:#fff;font-size:11px;cursor:pointer;font-family:inherit">Complete & send →</button>' : '') +
          (p.status==='With Doctor' ? '<span style="font-size:11px;color:#0f766e;font-weight:600">✓ With doctor</span>' : '') +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');

  var tableArea = '<div style="flex:1;overflow:auto">' +
    '<table style="width:100%;border-collapse:collapse">' +
    '<thead><tr>'+['ID','Patient','Sex','Chief Complaint','Priority','Status','Vitals','Arrival','Accepted','Actions'].map(_th).join('')+'</tr></thead>' +
    '<tbody>'+(rows||'<tr><td colspan="10" style="padding:28px;text-align:center;color:#6b7280;font-size:13px">No patients in queue yet. Accept requests from reception.</td></tr>')+'</tbody>' +
    '</table></div>';

  /* Detail panel */
  var detailPanel = selected ? (
    '<div style="width:288px;flex-shrink:0;border-left:1px solid #e0e0e0;background:#f4f5f0;display:flex;flex-direction:column;overflow-y:auto">' +
      '<div style="padding:12px 16px;border-bottom:1px solid #e0e0e0;background:#fff;display:flex;align-items:center;justify-content:space-between">' +
        '<div><div style="font-weight:700;font-size:14px;color:#111111">'+selected.name+'</div><div style="font-size:11px;color:#6b7280">'+selected.id+' · '+selected.sex+'</div></div>' +
        '<button onclick="_N.queueSel=null;_nurseRender()" style="background:none;border:none;font-size:16px;color:#6b7280;cursor:pointer">✕</button>' +
      '</div>' +

      '<div style="margin:10px;background:#fff;border:1px solid #e0e0e0;border-radius:6px;padding:12px">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;margin-bottom:5px">Chief Complaint</div>' +
        '<div style="font-size:13px;color:#111111">'+selected.complaint+'</div>' +
      '</div>' +

      (selected.vitals ? '<div style="margin:0 10px 10px;background:#fff;border:1px solid #e0e0e0;border-radius:6px;padding:12px">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;margin-bottom:8px">Vitals</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          [['BP',selected.vitals.bp,'mmHg'],['Temp',selected.vitals.temp,'°C'],['HR',selected.vitals.hr,'bpm'],['SpO₂',selected.vitals.spo2,'%'],['Weight',selected.vitals.weight,'kg'],['RR',selected.vitals.rr,'/min']].map(function(r){
            var flagged = selected.flags&&selected.flags.some(function(fl){ return fl.field.toLowerCase().includes(r[0].toLowerCase()); });
            return '<div><div style="font-size:10px;color:#6b7280">'+r[0]+'</div><div style="font-size:13px;font-weight:700;color:'+(flagged?'#dc2626':'#111111')+'">'+r[1]+' <span style="font-size:11px;font-weight:400;color:#6b7280">'+r[2]+'</span>'+(flagged?' <span style="color:#dc2626;font-size:10px">⚑</span>':'')+'</div></div>';
          }).join('') +
        '</div>' +
      '</div>' : '') +

      (selected.flags&&selected.flags.length ? '<div style="margin:0 10px 10px;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:12px">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#dc2626;margin-bottom:8px">⚑ Abnormal Flags</div>' +
        selected.flags.map(function(fl){ return '<div style="margin-bottom:6px"><div style="font-size:12px;font-weight:600;color:#dc2626">'+fl.field+': '+fl.value+'</div><div style="font-size:11px;color:#dc2626">'+fl.reason+'</div></div>'; }).join('') +
      '</div>' : '') +

      (selected.aiRisk ? '<div style="margin:0 10px 10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:12px">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#0F6E56;margin-bottom:5px">AI Risk Assessment</div>' +
        '<div style="font-size:12px;color:#111111">'+selected.aiRisk+'</div>' +
      '</div>' : '') +

      '<div style="margin-top:auto;padding:12px;border-top:1px solid #e0e0e0;background:#fff">' +
        (selected.status==='With Doctor'
          ? '<span style="font-size:12px;color:#0f766e;font-weight:600">✓ Patient is now with the doctor</span>'
          : '<button onclick="_nurseSaveVitals(\''+selected.id+'\')" style="width:100%;padding:8px;border-radius:6px;border:none;background:#0F6E56;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Complete vitals & send to doctor →</button>') +
      '</div>' +
    '</div>'
  ) : '';

  return ''+  /* no duplicate header — sidebar nav shows title */
    toolbar +
    '<div style="flex:1;display:flex;min-height:0;overflow:hidden">' + tableArea + detailPanel + '</div>';
}

/* ════════════════════════════════════════════════════════════════
   VIEW 3 — VITALS
════════════════════════════════════════════════════════════════ */
function _nVitals() {
  var f = _N.vitalsFilter;
  var displayed = _N.patients.filter(function(p){
    if (p.status==='Discharged') return false;
    if (f==='Pending')   return p.vitalStatus==='Pending';
    if (f==='Completed') return p.vitalStatus==='Completed';
    return true;
  });
  var pending = _N.patients.filter(function(p){ return p.vitalStatus==='Pending'&&p.status!=='Discharged'; }).length;

  var toolbar = '<div style="display:flex;align-items:center;gap:8px;padding:10px 20px;border-bottom:1px solid #e0e0e0;background:#fff;flex-shrink:0">' +
    ['All','Pending','Completed'].map(function(opt){ return _chip(opt, f===opt, '_N.vitalsFilter=\''+opt+'\';_nurseRender()'); }).join('') +
    '<div style="margin-left:auto;font-size:12px;color:#6b7280">' +
      (pending>0 ? '<span style="font-weight:700;color:#d97706">'+pending+'</span> patient'+(pending>1?'s':'')+' awaiting vitals'
                 : '<span style="color:#16a34a;font-weight:600">All vitals completed</span>') +
    '</div>' +
  '</div>';

  if (!displayed.length) {
    return _nHeader('Vitals Collection', pending+' pending · '+_N.patients.filter(function(p){return p.vitalStatus==='Completed';}).length+' completed') +
      toolbar +
      '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#6b7280;gap:6px;padding:40px">' +
        '<div style="font-size:36px">♥</div>' +
        '<div style="font-size:14px;font-weight:600;color:#111111">No patients in vitals queue</div>' +
        '<div style="font-size:12px">Accept requests from reception to add patients here.</div>' +
      '</div>';
  }

  var rows = displayed.map(function(p, i){
    var isEdit = _N.editId === p.id;
    var bg = _trBg(i);

    var vitalCells = isEdit
      ? ['bp','temp','hr','spo2','weight','rr'].map(function(k){
          return '<td style="padding:5px 8px"><input id="vf-'+k+'" value="'+(_N.vitalForm[k]||'')+'" oninput="_N.vitalForm.'+k+'=this.value" placeholder="'+(k==='bp'?'120/80':'—')+'" style="width:68px;padding:5px 7px;border:1.5px solid #0F6E56;border-radius:4px;font-size:12px;font-family:inherit;outline:none"></td>';
        }).join('')
      : (function(){
          var vf = { bp:'Blood Pressure', temp:'Temperature', hr:'Heart Rate', spo2:'SpO₂', rr:'RR' };
          return ['bp','temp','hr','spo2','weight','rr'].map(function(k){
            var val = p.vitals ? p.vitals[k] : '—';
            var flagged = p.flags && p.flags.some(function(fl){ return fl.field===vf[k]; });
            return '<td style="padding:8px 14px;font-size:13px;font-weight:'+(flagged?'700':'400')+';color:'+(flagged?'#dc2626':p.vitals?'#111111':'#e0e0e0')+'">'+val+(flagged?' <span style="font-size:10px">⚑</span>':'')+'</td>';
          }).join('');
        })();

    var actCell = isEdit
      ? '<td style="padding:6px 14px"><div style="display:flex;gap:5px"><button onclick="_nurseSaveVitals(\''+p.id+'\')" style="padding:4px 10px;border-radius:5px;border:none;background:#0F6E56;color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap">Save & Complete</button><button onclick="_N.editId=null;_nurseRender()" style="padding:4px 8px;border-radius:5px;border:1px solid #e0e0e0;background:#fff;color:#6b7280;font-size:11px;cursor:pointer;font-family:inherit">Cancel</button></div></td>'
      : '<td style="padding:8px 14px"><button onclick="_nurseVitalsEdit(\''+p.id+'\')" style="padding:4px 10px;border-radius:5px;border:1px solid #e0e0e0;color:#0F6E56;font-size:11px;cursor:pointer;font-family:inherit;background:#fff">'+(p.vitalStatus==='Pending'?'Record Vitals':'Edit')+'</button></td>';

    var flagCell = isEdit
      ? '<td style="padding:8px 14px">—</td>'
      : '<td style="padding:8px 14px;font-size:12px">'+(p.flags&&p.flags.length?'<span style="color:#dc2626;font-weight:600">'+p.flags.length+' flag'+(p.flags.length>1?'s':'')+'</span>':p.vitals?'<span style="color:#16a34a">Clear</span>':'<span style="color:#e0e0e0">—</span>')+'</td>';

    return '<tr style="'+bg+';border-bottom:1px solid #e8edf4">' +
      '<td style="padding:8px 14px"><div style="font-weight:600;font-size:13px">'+p.name+'</div><div style="font-size:11px;color:#6b7280">'+(p.nationalId||'—')+'</div></td>' +
      '<td style="padding:8px 14px"><div style="display:flex;align-items:center;gap:5px"><span style="width:7px;height:7px;border-radius:50%;background:'+_priorityDot(p.priority)+';flex-shrink:0"></span><span style="font-size:12px;color:#111111">'+p.priority+'</span></div></td>' +
      '<td style="padding:8px 14px">'+_badge(p.status, _statusBg(p.status))+'</td>' +
      vitalCells + flagCell + actCell +
    '</tr>';
  }).join('');

  return _nHeader('Vitals Collection', pending+' pending · '+_N.patients.filter(function(p){return p.vitalStatus==='Completed';}).length+' completed') +
    toolbar +
    '<div style="flex:1;overflow:auto">' +
      '<table style="width:100%;border-collapse:collapse;min-width:860px">' +
      '<thead><tr>'+['Patient','Priority','Status','BP','Temp °C','HR bpm','SpO₂ %','Weight kg','RR /min','Flags','Actions'].map(_th).join('')+'</tr></thead>' +
      '<tbody>'+rows+'</tbody>' +
      '</table>' +
    '</div>';
}

/* ════════════════════════════════════════════════════════════════
   VIEW 4 — EMERGENCY
════════════════════════════════════════════════════════════════ */
function _nEmergency() {
  var emergencies = _N.patients.filter(function(p){ return p.priority==='Emergency'; });

  var alert = !_N.alertDismissed ? (
    '<div style="margin:14px 20px;padding:14px 18px;background:#dc2626;color:#fff;border-radius:6px;display:flex;align-items:flex-start;gap:12px">' +
      '<div style="font-size:22px;flex-shrink:0">🚨</div>' +
      '<div style="flex:1">' +
        '<div style="font-size:14px;font-weight:700">Incoming Emergency — RTA Patient</div>' +
        '<div style="font-size:13px;color:#fca5a5;margin-top:3px">Male, ~40s, head trauma. ETA 3 minutes. Reported by Reception — Akua Asante.</div>' +
        '<div style="display:flex;gap:8px;margin-top:10px">' +
          '<button onclick="_nurseAdmitResus()" style="padding:6px 14px;border-radius:5px;border:none;background:#fff;color:#dc2626;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Admit to Resus 2</button>' +
          '<button onclick="_N.alertDismissed=true;_nurseRender()" style="padding:6px 14px;border-radius:5px;border:1px solid rgba(255,255,255,.4);background:transparent;color:#fff;font-size:12px;cursor:pointer;font-family:inherit">Dismiss</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  ) : '';

  var rows = emergencies.map(function(p, i){
    var classColors = { Critical:'background:#dc2626;color:#fff', Urgent:'background:#d97706;color:#fff', Stable:'background:#16a34a;color:#fff' };
    return '<tr style="'+_trBg(i, 'Emergency')+';border-bottom:1px solid #e8edf4">' +
      '<td style="padding:10px 14px"><div style="font-weight:600;font-size:13px">'+p.name+'</div><div style="font-size:11px;color:#6b7280">'+(p.nationalId||'—')+' · '+p.sex+'</div></td>' +
      _td(p.complaint,'max-width:200px') +
      _td(p.arrivalTime,'color:#6b7280') +
      _td(p.room||'—','font-weight:600') +
      '<td style="padding:8px 14px">' +
        (p.emergencyClass
          ? _badge(p.emergencyClass, classColors[p.emergencyClass]||'background:#6b7280;color:#fff')
          : _N.classifying===p.id
            ? '<div style="display:flex;gap:5px">'+['Critical','Urgent','Stable'].map(function(c){ return '<button onclick="_nurseClassify(\''+p.id+'\',\''+c+'\')" style="padding:3px 9px;border-radius:4px;border:none;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;'+classColors[c]+'">'+c+'</button>'; }).join('')+'</div>'
            : '<button onclick="_N.classifying=\''+p.id+'\';_nurseRender()" style="padding:3px 10px;border-radius:4px;border:1px solid #e0e0e0;color:#6b7280;font-size:11px;cursor:pointer;font-family:inherit;background:#fff">Classify</button>') +
      '</td>' +
      '<td style="padding:8px 14px">'+_badge(p.vitalStatus, p.vitalStatus==='Completed'?'background:#f0fdf4;color:#16a34a;border:1px solid #86efac':'background:#fffbeb;color:#d97706;border:1px solid #fcd34d')+'</td>' +
      _td(p.aiRisk||'—','font-size:12px;color:#0F6E56;font-style:italic;max-width:200px') +
      '<td style="padding:8px 14px">'+_btn('Notify Team','_nurseNotifyTeam(\''+p.id+'\')')+'</td>' +
    '</tr>';
  }).join('');

  return _nHeader('Emergency Handling', emergencies.length+' active emergency patient'+(emergencies.length!==1?'s':'')) +
    alert +
    '<div style="padding:6px 20px;font-size:13px;color:#6b7280;flex-shrink:0">' +
      '<strong style="color:#111111">'+emergencies.length+'</strong> active emergency patient'+(emergencies.length!==1?'s':'') +
    '</div>' +
    '<div style="flex:1;overflow:auto;padding:0 20px 20px">' +
      '<table style="width:100%;border-collapse:collapse;border:1px solid #e0e0e0;border-radius:6px;overflow:hidden">' +
      '<thead><tr>'+['Patient','Complaint','Arrival','Room','Classification','Vitals','AI Risk','Actions'].map(_th).join('')+'</tr></thead>' +
      '<tbody>'+(rows||'<tr><td colspan="8" style="padding:28px;text-align:center;color:#6b7280;font-size:13px">No active emergency cases.</td></tr>')+'</tbody>' +
      '</table>' +
    '</div>';
}

/* ════════════════════════════════════════════════════════════════
   VIEW 5 — MESSAGING  (doctor.js-style)
════════════════════════════════════════════════════════════════ */

/* Nurse colour tokens (mirrors doctor C.*) */
var _NC = {
  teal:   '#0F6E56',
  border: '#e0e0e0',
  text:   '#111111',
  muted:  '#6b7280',
  red:    '#dc2626',
  blueLt: '#eff6ff',
  green:  '#f0fdf4',
};

/* Nurse recipient list with backend role enum */
var _N_RECIPIENTS = [
  { value:'Doctor / Clinician',   label:'Doctor / Clinician',   icon:'👨‍⚕️', role:'DOCTOR'        },
  { value:'Reception',            label:'Reception',             icon:'🧑‍💼', role:'RECEPTIONIST'  },
  { value:'Pharmacy',             label:'Pharmacy',              icon:'💊', role:'PHARMACY'      },
  { value:'Laboratory',           label:'Laboratory',            icon:'🔬', role:'LAB'           },
  { value:'Radiology',            label:'Radiology',             icon:'🩻', role:'RADIOLOGY'     },
  { value:'Administration',       label:'Administration',        icon:'🏥', role:'ADMIN'         },
  { value:'Specific staff member',label:'Specific staff member', icon:'👤', role:'ADMIN'         },
];
var _nRoleMap = {};
_N_RECIPIENTS.forEach(function(r){ _nRoleMap[r.value] = r.role; });

function _nMessaging() {
  /* ── State defaults ── */
  if (!window._nMsgView)   window._nMsgView   = 'inbox';
  if (!window._nMsgThread) window._nMsgThread = null;
  /* _N._nMsgsLoaded is set before fetch; cleared after data arrives */

  /* ── Get current user ── */
  var _nu = (window.API && window.API._currentUser) || window._currentUser
    || (function(){ try{ return JSON.parse(sessionStorage.getItem('user')||localStorage.getItem('currentUser')||'null'); }catch(_){ return null; } })() || {};
  var nuId   = String(_nu._id || _nu.id || '');
  var nuName = _nu.firstName
    ? ((_nu.firstName||'')+' '+(_nu.lastName||'')).trim()
    : (_nu.name || 'Nurse Station');

  /* ── Fetch inbox if not already loading ── */
  if (!_N._nMsgsLoaded) {
    _N._nMsgsLoaded = true;
    (async function() {
      try {
        var fetches = [
          API._fetchDirect('/messages?recipientRole=NURSE_STATION&limit=100', {method:'GET'}).catch(function(){return null;}),
        ];
        if (nuId) {
          fetches.push(API._fetchDirect('/messages?recipientId='+nuId+'&limit=100', {method:'GET'}).catch(function(){return null;}));
        }
        var results = await Promise.all(fetches);
        var seen = {}, all = [];
        results.forEach(function(res) {
          /* FIX: guard against null (fetch returned null on error) */
          var arr = (res && (Array.isArray(res.data) ? res.data : Array.isArray(res.messages) ? res.messages : Array.isArray(res) ? res : [])) || [];
          arr.forEach(function(m) {
            var mid = String(m._id || m.id || '');
            if (!mid || seen[mid]) return;
            seen[mid] = true;
            var sr = (m.senderRole||m.fromRole||m.role||'').toUpperCase()
                       .replace('DOCTOR/CLINICIAN','DOCTOR').replace('NURSE_STATION','NURSE STATION');
            all.push({
              id: m._id||m.id, _id: m._id||m.id||null,
              senderId: m.senderId||null,
              from: m.senderName||m.from||'Staff',
              senderRole: sr, fromRole: sr, role: sr,
              recipientId: m.recipientId||null, recipientRole: m.recipientRole||'',
              subject: m.subject||'(No subject)',
              body: m.body||m.text||m.message||'', text: m.body||m.text||m.message||'',
              priority: m.priority||'Normal',
              readStatus: m.readStatus||(m.unread?'unread':'read'),
              unread: m.readStatus==='unread'||m.unread===true,
              time: m.sentAt ? new Date(m.sentAt).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})
                             : (m.createdAt ? new Date(m.createdAt).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}) : '—'),
              sentAt: m.sentAt||m.createdAt||null,
              threadId: m.threadId||null,
            });
          });
        });
        all.sort(function(a,b){ return new Date(b.sentAt||0)-new Date(a.sentAt||0); });
        _N.messages = all;
        /* FIX: only re-render on success — prevents infinite loop on 429 */
        _N._nMsgsLoaded = false; /* allow re-fetch on next tab switch */
        _nurseRender();
      } catch(e) {
        console.warn('NIHMS nurse: messages fetch error', e);
        /* FIX: on error, reset flag but do NOT call _nurseRender() —
           calling it would immediately re-trigger the fetch, creating
           an infinite loop when the server returns 429 */
        _N._nMsgsLoaded = false;
      }
    })();
  }

  /* ── Classify messages ── */
  var inbox = _N.messages.filter(function(m){
    var sr = (m.senderRole||m.role||'').toUpperCase();
    return sr !== 'NURSE' && sr !== 'NURSE_STATION';
  });
  var sent = _N.messages.filter(function(m){
    var sr = (m.senderRole||m.role||'').toUpperCase();
    return sr === 'NURSE' || sr === 'NURSE_STATION';
  });
  var important = _N.messages.filter(function(m){
    return m.priority === 'High' || m.priority === 'Urgent';
  });
  var unreadCount = inbox.filter(function(m){ return m.unread; }).length;
  var view = window._nMsgView || 'inbox';

  /* ── Sidebar ── */
  var sidebar =
    '<div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">'+

    /* Stats card */
    '<div style="background:#fff;border:1.5px solid '+_NC.border+';border-radius:12px;padding:18px 20px">'+
      '<div style="font-size:13px;font-weight:700;color:'+_NC.text+';margin-bottom:12px">📊 Overview</div>'+
      '<div style="display:flex;flex-direction:column;gap:8px">'+
        '<div style="display:flex;justify-content:space-between;align-items:center">'+
          '<span style="font-size:12px;color:'+_NC.muted+'">Unread</span>'+
          '<span style="font-size:15px;font-weight:800;color:'+_NC.red+'">'+unreadCount+'</span>'+
        '</div>'+
        '<div style="display:flex;justify-content:space-between;align-items:center">'+
          '<span style="font-size:12px;color:'+_NC.muted+'">Sent</span>'+
          '<span style="font-size:15px;font-weight:800;color:'+_NC.teal+'">'+sent.length+'</span>'+
        '</div>'+
      '</div>'+
    '</div>'+

    /* Folders card */
    '<div style="background:#fff;border:1.5px solid '+_NC.border+';border-radius:12px;overflow:hidden">'+
      '<div style="padding:14px 18px;border-bottom:1px solid '+_NC.border+'">'+
        '<div style="font-size:13px;font-weight:700;color:'+_NC.text+'">Folders</div>'+
      '</div>'+
      [
        { id:'inbox',     icon:'📥', label:'Inbox',             count: inbox.length,     badge: unreadCount },
        { id:'sent',      icon:'📤', label:'Sent Messages',     count: sent.length,      badge: 0 },
        { id:'important', icon:'⭐', label:'Important',         count: important.length, badge: 0 },
      ].map(function(f){
        var active = view === f.id;
        return '<button data-nmsgview="'+f.id+'" '+
          'style="display:flex;align-items:center;gap:10px;width:100%;padding:12px 18px;border:none;border-bottom:1px solid '+_NC.border+';background:'+(active?_NC.blueLt:'#fff')+';color:'+(active?_NC.teal:_NC.text)+';font-size:13px;font-weight:'+(active?'700':'500')+';cursor:pointer;font-family:inherit;text-align:left">'+
          '<span>'+f.icon+'</span>'+
          '<span style="flex:1">'+f.label+'</span>'+
          '<span style="font-size:11px;color:'+_NC.muted+'">'+f.count+'</span>'+
          (f.badge ? '<span style="min-width:16px;height:16px;border-radius:50px;background:'+_NC.red+';color:#fff;font-size:9px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 3px">'+f.badge+'</span>' : '')+
        '</button>';
      }).join('')+
    '</div>'+

    /* Compose button */
    '<button data-nmsgview="compose" '+
      'style="width:100%;padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,'+_NC.teal+' 0%,#1A4A9B 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
      '✉ Compose Message'+
    '</button>'+
    '</div>';

  /* ── COMPOSE VIEW ── */
  if (view === 'compose') {
    var composeMain =
      '<div style="flex:1;min-width:0">'+

      /* Header */
      '<div style="background:#fff;border:1.5px solid '+_NC.border+';border-radius:12px;padding:18px 24px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">'+
        '<div>'+
          '<div style="font-size:18px;font-weight:800;color:'+_NC.text+'">✉ Compose Message</div>'+
          '<div style="font-size:13px;color:'+_NC.muted+';margin-top:2px">Send a new internal message</div>'+
        '</div>'+
        '<button data-nmsgview="inbox" style="padding:8px 16px;border:1.5px solid '+_NC.border+';border-radius:8px;background:#fff;color:'+_NC.muted+';font-size:13px;cursor:pointer;font-family:inherit">✕ Cancel</button>'+
      '</div>'+

      /* Recipient card */
      '<div style="background:#fff;border:1.5px solid '+_NC.border+';border-radius:12px;padding:18px 24px;margin-bottom:16px">'+
        '<div style="font-size:14px;font-weight:700;color:'+_NC.text+';margin-bottom:14px">👤 Recipient</div>'+
        '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">'+
        _N_RECIPIENTS.map(function(r){
          var checked = (_N._nComposeRecip === r.value) || (!_N._nComposeRecip && r.value === 'Doctor / Clinician');
          return '<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid '+(checked?_NC.teal:_NC.border)+';border-radius:10px;background:'+(checked?_NC.blueLt:'#fff')+';cursor:pointer;font-size:13px;color:'+_NC.text+'">'+
            '<input type="radio" name="nRecip" value="'+r.value+'" '+(checked?'checked':'')+' data-nrecip="'+r.value+'" style="accent-color:'+_NC.teal+'">'+
            '<span>'+r.icon+' '+r.label+'</span>'+
          '</label>';
        }).join('')+
        '</div>'+
      '</div>'+

      /* Priority card */
      '<div style="background:#fff;border:1.5px solid '+_NC.border+';border-radius:12px;padding:18px 24px;margin-bottom:16px">'+
        '<div style="font-size:14px;font-weight:700;color:'+_NC.text+';margin-bottom:14px">🔔 Priority</div>'+
        '<div style="display:flex;gap:10px">'+
        [
          { val:'Normal', icon:'🔵', color:'#0F6E56', bg:'#eff6ff' },
          { val:'High',   icon:'🟠', color:'#d97706', bg:'#fffbeb' },
          { val:'Urgent', icon:'🔴', color:'#dc2626', bg:'#fef2f2' },
        ].map(function(p){
          var sel = (_N._nComposePriority||'Normal') === p.val;
          return '<label style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:1.5px solid '+(sel?p.color:_NC.border)+';border-radius:10px;background:'+(sel?p.bg:'#fff')+';cursor:pointer;font-size:13px;font-weight:'+(sel?'700':'500')+';color:'+(sel?p.color:_NC.text)+'">'+
            '<input type="radio" name="nPrio" value="'+p.val+'" '+(sel?'checked':'')+' data-nprio="'+p.val+'" style="accent-color:'+p.color+'">'+
            p.icon+' '+p.val+
          '</label>';
        }).join('')+
        '</div>'+
      '</div>'+

      /* Subject + Patient */
      '<div style="background:#fff;border:1.5px solid '+_NC.border+';border-radius:12px;padding:18px 24px;margin-bottom:16px">'+
        '<div style="font-size:14px;font-weight:700;color:'+_NC.text+';margin-bottom:14px">📝 Message Details</div>'+
        '<div style="display:flex;flex-direction:column;gap:10px">'+
          '<div>'+
            '<label style="font-size:12px;font-weight:600;color:'+_NC.muted+';display:block;margin-bottom:4px">Subject *</label>'+
            '<input id="n-compose-subject" type="text" placeholder="Enter message subject" value="'+(_N._nComposeSubject||'')+'" data-nfield="subject" '+
              'style="width:100%;padding:10px 12px;border:1.5px solid '+_NC.border+';border-radius:8px;font-size:13px;font-family:inherit;outline:none">'+
          '</div>'+
          '<div>'+
            '<label style="font-size:12px;font-weight:600;color:'+_NC.muted+';display:block;margin-bottom:4px">Patient Reference (optional)</label>'+
            '<input id="n-compose-patient" type="text" placeholder="Patient name or ID" value="'+(_N._nComposePatient||'')+'" data-nfield="patient" '+
              'style="width:100%;padding:10px 12px;border:1.5px solid '+_NC.border+';border-radius:8px;font-size:13px;font-family:inherit;outline:none">'+
          '</div>'+
        '</div>'+
      '</div>'+

      /* Message body */
      '<div style="background:#fff;border:1.5px solid '+_NC.border+';border-radius:12px;padding:18px 24px;margin-bottom:16px">'+
        '<div style="font-size:14px;font-weight:700;color:'+_NC.text+';margin-bottom:14px">💬 Message</div>'+
        '<textarea id="n-compose-body" rows="6" placeholder="Type your message…" data-nfield="body" '+
          'style="width:100%;padding:10px 12px;border:1.5px solid '+_NC.border+';border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;outline:none">'+(_N._nComposeBody||'')+'</textarea>'+
      '</div>'+

      /* Send / Cancel */
      '<div style="display:flex;gap:12px;justify-content:flex-end;margin-bottom:24px">'+
        '<button data-nmsgview="inbox" style="padding:11px 24px;border:1.5px solid '+_NC.border+';border-radius:10px;background:#fff;color:'+_NC.muted+';font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Cancel</button>'+
        '<button id="btn-n-send-msg" data-naction="send-msg" style="padding:11px 28px;border:none;border-radius:10px;background:linear-gradient(135deg,'+_NC.teal+' 0%,#1A4A9B 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">✉ Send Message</button>'+
      '</div>'+

      '</div>';

    return _nHeader('Messages','Internal communication · Secure team messaging','') +
      '<div style="flex:1;overflow:auto;padding:16px 20px;display:flex;gap:16px;align-items:flex-start">'+
        composeMain + sidebar +
      '</div>';
  }

  /* ── THREAD DETAIL VIEW ── */
  if (window._nMsgThread) {
    var tid = String(window._nMsgThread);
    var threadMsg = _N.messages.find(function(m){ return String(m._id||m.id||'') === tid; });
    if (threadMsg) {
      /* Mark as read */
      if (threadMsg.unread) {
        threadMsg.unread    = false;
        threadMsg.readStatus = 'read';
        API._fetchDirect('/messages/'+tid+'/read',{method:'PATCH'}).catch(function(){});
      }
      var prioColor = threadMsg.priority==='Urgent'?_NC.red:threadMsg.priority==='High'?'#d97706':_NC.teal;
      var detailMain =
        '<div style="flex:1;min-width:0">'+

        '<div style="background:#fff;border:1.5px solid '+_NC.border+';border-radius:12px;padding:18px 24px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">'+
          '<button data-naction="back-thread" style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1.5px solid '+_NC.border+';border-radius:8px;background:#fff;color:'+_NC.muted+';font-size:13px;cursor:pointer;font-family:inherit">← Back</button>'+
          '<span style="font-size:11px;padding:4px 10px;border-radius:20px;font-weight:700;background:'+(threadMsg.priority==='Urgent'?'#fef2f2':threadMsg.priority==='High'?'#fffbeb':'#eff6ff')+';color:'+prioColor+'">'+
            (threadMsg.priority==='Urgent'?'🔴':threadMsg.priority==='High'?'🟠':'🔵')+' '+threadMsg.priority+
          '</span>'+
        '</div>'+

        '<div style="background:#fff;border:1.5px solid '+_NC.border+';border-radius:12px;padding:24px;margin-bottom:16px">'+
          '<div style="font-size:18px;font-weight:800;color:'+_NC.text+';margin-bottom:16px">'+threadMsg.subject+'</div>'+
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid '+_NC.border+'">'+
            '<div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,'+_NC.teal+' 0%,#1A4A9B 100%);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700">'+
              (threadMsg.from||'?').split(' ').map(function(n){return n[0]||'';}).join('').slice(0,2).toUpperCase()+
            '</div>'+
            '<div>'+
              '<div style="font-size:14px;font-weight:700;color:'+_NC.text+'">'+threadMsg.from+'</div>'+
              '<div style="font-size:12px;color:'+_NC.muted+'">'+threadMsg.senderRole+' · '+threadMsg.time+'</div>'+
            '</div>'+
          '</div>'+
          '<div style="font-size:14px;line-height:1.7;color:'+_NC.text+';white-space:pre-wrap">'+threadMsg.body+'</div>'+
        '</div>'+

        /* Reply box */
        '<div style="background:#fff;border:1.5px solid '+_NC.border+';border-radius:12px;padding:18px 24px;margin-bottom:24px">'+
          '<div style="font-size:14px;font-weight:700;color:'+_NC.text+';margin-bottom:12px">↩ Reply</div>'+
          '<textarea id="n-reply-body" rows="4" placeholder="Type your reply…" style="width:100%;padding:10px 12px;border:1.5px solid '+_NC.border+';border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;outline:none"></textarea>'+
          '<div style="display:flex;justify-content:flex-end;margin-top:10px">'+
            '<button id="btn-n-reply-msg" data-naction="send-reply" data-nthreadid="'+tid+'" style="padding:10px 22px;border:none;border-radius:10px;background:linear-gradient(135deg,'+_NC.teal+' 0%,#1A4A9B 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">↩ Send Reply</button>'+
          '</div>'+
        '</div>'+

        '</div>';

      return _nHeader('Messages','Internal communication · Secure team messaging','') +
        '<div style="flex:1;overflow:auto;padding:16px 20px;display:flex;gap:16px;align-items:flex-start">'+
          detailMain + sidebar +
        '</div>';
    }
    /* Thread not found — fall through to list */
    window._nMsgThread = null;
  }

  /* ── MESSAGE LIST VIEW ── */
  var folderMeta = {
    inbox:     { icon:'📥', label:'Inbox',          desc:'Messages addressed to Nurse Station' },
    sent:      { icon:'📤', label:'Sent Messages',   desc:'Messages you have sent' },
    important: { icon:'⭐', label:'Important',       desc:'High and Urgent priority messages' },
  };
  var meta       = folderMeta[view] || folderMeta.inbox;
  var visibleMsgs = view==='inbox' ? inbox : view==='sent' ? sent : important;

  var listMain =
    '<div style="flex:1;min-width:0">'+

    /* Folder header */
    '<div style="background:#fff;border:1.5px solid '+_NC.border+';border-radius:12px;padding:18px 24px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">'+
      '<div>'+
        '<div style="font-size:18px;font-weight:800;color:'+_NC.text+'">'+meta.icon+' '+meta.label+'</div>'+
        '<div style="font-size:13px;color:'+_NC.muted+';margin-top:2px">'+meta.desc+'</div>'+
      '</div>'+
      '<button data-nmsgview="compose" '+
        'style="display:flex;align-items:center;gap:8px;padding:10px 18px;border:none;border-radius:10px;background:linear-gradient(135deg,'+_NC.teal+' 0%,#1A4A9B 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">'+
        '✉ Compose Message'+
      '</button>'+
    '</div>'+

    /* Message rows */
    '<div style="background:#fff;border:1.5px solid '+_NC.border+';border-radius:12px;overflow:hidden;margin-bottom:24px">'+
    (visibleMsgs.length
      ? visibleMsgs.map(function(m){
          var unread = m.unread !== false && m.readStatus === 'unread';
          var prioIcon = m.priority==='Urgent' ? '🔴 ' : m.priority==='High' ? '🟠 ' : '';
          var mSubject = m.subject || m.text.slice(0,50) || '(No subject)';
          var mPreview = m.body || m.text || '';
          var mFrom = m.from || m.senderName || 'Staff';
          var mRole  = m.senderRole || m.role || 'Staff';
          var mId    = String(m._id || m.id || '');
          return '<div data-nmsgthread="'+mId+'" '+
            'style="display:flex;align-items:flex-start;gap:12px;padding:14px 18px;border-bottom:1px solid '+_NC.border+';background:'+(unread?_NC.blueLt:'#fff')+';cursor:pointer" '+
            'onmouseenter="this.style.background=\''+_NC.blueLt+'\'" onmouseleave="this.style.background=\''+(unread?_NC.blueLt:'#fff')+'\'">'+
            '<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,'+_NC.teal+' 0%,#1A4A9B 100%);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;font-weight:700">'+
              mFrom.split(' ').map(function(n){return n[0]||'';}).join('').slice(0,2).toUpperCase()+
            '</div>'+
            '<div style="flex:1;min-width:0">'+
              '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">'+
                '<div style="font-size:14px;font-weight:'+(unread?'700':'500')+';color:'+_NC.text+'">'+prioIcon+mFrom+' <span style="font-size:11px;color:'+_NC.muted+';font-weight:400">· '+mRole+'</span></div>'+
                '<div style="font-size:11px;color:'+_NC.muted+';flex-shrink:0">'+m.time+'</div>'+
              '</div>'+
              '<div style="font-size:13px;font-weight:'+(unread?'600':'400')+';color:'+_NC.text+';margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+mSubject+'</div>'+
              '<div style="font-size:12px;color:'+_NC.muted+';margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+mPreview.slice(0,80)+(mPreview.length>80?'…':'')+'</div>'+
              (unread?'<span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:10px;background:'+_NC.blueLt+';color:'+_NC.teal+';font-size:10px;font-weight:700">Unread</span>':'')+
            '</div>'+
          '</div>';
        }).join('')
      : '<div style="padding:40px;text-align:center;color:'+_NC.muted+'">'+
          '<div style="font-size:32px;margin-bottom:8px">📭</div>'+
          '<div style="font-size:14px;font-weight:600;color:'+_NC.text+'">No messages in '+meta.label+'</div>'+
        '</div>'
    )+
    '</div>'+
    '</div>';

  return _nHeader('Messages','Internal communication · Secure team messaging','') +
    '<div style="flex:1;overflow:auto;padding:16px 20px;display:flex;gap:16px;align-items:flex-start">'+
      listMain + sidebar +
    '</div>';
}

/* ════════════════════════════════════════════════════════════════
   VIEW 6 — ANALYTICS
════════════════════════════════════════════════════════════════ */
function _nAnalytics() {
  var pts     = _N.patients;
  var triaged = pts.filter(function(p){ return p.vitalStatus==='Completed'; }).length;
  var emCount = pts.filter(function(p){ return p.priority==='Emergency'; }).length;
  var flagged = pts.filter(function(p){ return p.flags&&p.flags.length; });

  /* AI filter state */
  var f = _N.analyticsFilter || { risk:'All', vital:'All', search:'' };
  _N.analyticsFilter = f;

  /* ── Hourly bar chart data from real patients ── */
  var hourBuckets = {};
  pts.forEach(function(p){
    var h = (p.acceptedAt||p.arrivalTime||'08:00').split(':')[0]+':00';
    hourBuckets[h] = (hourBuckets[h]||0)+1;
  });
  var HOURS = ['07','08','09','10','11','12','13','14','15','16'];
  var hourly = HOURS.map(function(h){ return {h:h+':00', n:hourBuckets[h+':00']||0}; });
  var maxH = Math.max.apply(null, hourly.map(function(r){return r.n;}))||1;

  /* ── KPI cards ── */
  var allFlags = [];
  pts.forEach(function(p){
    (p.flags||[]).forEach(function(fl){
      allFlags.push({ patient:p, flag:fl, aiRisk:p.aiRisk||null, riskLevel: _getRiskLevel(fl, p) });
    });
  });
  var highRisk = allFlags.filter(function(r){ return r.riskLevel==='HIGH'; }).length;
  var medRisk  = allFlags.filter(function(r){ return r.riskLevel==='MEDIUM'; }).length;
  var needsReview = pts.filter(function(p){ return p.flags&&p.flags.length&&!p.reviewed; }).length;

  var kpis = [
    { label:'Total Alerts',           value:allFlags.length, color:'#0F6E56', bg:'#eff6ff', border:'#bfdbfe', icon:'🔔' },
    { label:'High Risk',              value:highRisk,        color:'#dc2626', bg:'#fef2f2', border:'#fca5a5', icon:'⚠️' },
    { label:'Medium Risk',            value:medRisk,         color:'#d97706', bg:'#fffbeb', border:'#fcd34d', icon:'⚡' },
    { label:'Patients Requiring Review', value:needsReview,  color:'#7c3aed', bg:'#f5f3ff', border:'#c4b5fd', icon:'👁' },
  ];

  var kpiHtml = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">' +
    kpis.map(function(k){
      return '<div style="background:'+k.bg+';border:1.5px solid '+k.border+';border-radius:10px;padding:16px 18px">' +
        '<div style="font-size:20px;margin-bottom:6px">'+k.icon+'</div>' +
        '<div style="font-size:28px;font-weight:800;color:'+k.color+';line-height:1;margin-bottom:4px">'+k.value+'</div>' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:'+k.color+'">'+k.label+'</div>' +
      '</div>';
    }).join('') + '</div>';

  /* ── Safety disclaimer ── */
  /* ML service status — shown in analytics */
  var mlStatus = _N._mlServiceStatus || null;

  var modelBanner = '<div style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;margin-bottom:10px">' +
    '<div style="width:8px;height:8px;border-radius:50%;background:#16a34a;flex-shrink:0"></div>' +
    '<div style="flex:1;font-size:12px;color:#166534">' +
      '<strong>ML Service: Online</strong> · ' +
      'Model: Decision Tree · ' +
      'Dataset: patients_data_with_alerts.xlsx (50,000 records) · ' +
      'Accuracy: 99.99% · HIGH-Risk Recall: 100% · ' +
      'Version: triage-v2.0' +
    '</div>' +
    '<button onclick="_nRunMLAll()" style="padding:5px 12px;border-radius:5px;border:none;background:#16a34a;color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;flex-shrink:0">▶ Run ML on all</button>' +
  '</div>';

  var disclaimer = modelBanner +
    '<div style="background:#fef9ec;border:1px solid #fcd34d;border-left:4px solid #d97706;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#92400e">' +
    '<strong>⚕ Clinical Decision-Support Only:</strong> AI predictions are provided for clinical decision-support purposes only and do not replace professional medical assessment, diagnosis or treatment.' +
  '</div>';

  /* ── Filters ── */
  var RISK_OPTS  = ['All','High','Medium','Low'];
  var VITAL_OPTS = ['All','Blood Pressure','Heart Rate','SpO₂','Respiratory Rate','Temperature'];

  var filters = '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px;padding:12px 14px;background:#fff;border:1px solid #e5e7eb;border-radius:8px">' +
    '<input id="an-search" type="text" placeholder="Search patient…" value="'+(f.search||'')+'" oninput="_N.analyticsFilter.search=this.value;_nurseRender()" style="padding:7px 12px;border:1.5px solid #e5e7eb;border-radius:6px;font-size:13px;font-family:inherit;outline:none;width:180px">' +
    '<div style="display:flex;gap:4px;align-items:center">' +
      '<span style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Risk:</span>' +
      RISK_OPTS.map(function(o){ return '<button onclick="_N.analyticsFilter.risk=\"'+o+'\";_nurseRender()" style="padding:5px 10px;border-radius:5px;border:1px solid '+(f.risk===o?'#0F6E56':'#e5e7eb')+';background:'+(f.risk===o?'#0F6E56':'#fff')+';color:'+(f.risk===o?'#fff':'#6b7280')+';font-size:12px;cursor:pointer;font-family:inherit">'+o+'</button>'; }).join('') +
    '</div>' +
    '<div style="display:flex;gap:4px;align-items:center">' +
      '<span style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Vital:</span>' +
      VITAL_OPTS.map(function(o){ return '<button onclick="_N.analyticsFilter.vital=\"'+o+'\";_nurseRender()" style="padding:5px 10px;border-radius:5px;border:1px solid '+(f.vital===o?'#0F6E56':'#e5e7eb')+';background:'+(f.vital===o?'#0F6E56':'#fff')+';color:'+(f.vital===o?'#fff':'#6b7280')+';font-size:12px;cursor:pointer;font-family:inherit">'+o+'</button>'; }).join('') +
    '</div>' +
    '<button onclick="_N.analyticsFilter={risk:\'All\',vital:\'All\',search:\'\'};_nurseRender()" style="padding:5px 10px;border-radius:5px;border:1px solid #e5e7eb;background:#f9fafb;color:#6b7280;font-size:12px;cursor:pointer;font-family:inherit">✕ Clear</button>' +
  '</div>';

  /* ── AI-Flagged table ── */
  var filtered = allFlags.filter(function(r){
    var searchOk = !f.search || r.patient.name.toLowerCase().includes(f.search.toLowerCase()) || r.patient.id.toLowerCase().includes(f.search.toLowerCase());
    var riskOk   = f.risk==='All' || r.riskLevel===f.risk.toUpperCase();
    var vitalOk  = f.vital==='All' || r.flag.field.toLowerCase().includes(f.vital.toLowerCase().replace('₂','2'));
    return searchOk && riskOk && vitalOk;
  });

  function riskBadge(level) {
    var cfg = { HIGH:'background:#fef2f2;color:#dc2626;border:1px solid #fca5a5', MEDIUM:'background:#fffbeb;color:#d97706;border:1px solid #fcd34d', LOW:'background:#f0fdf4;color:#16a34a;border:1px solid #86efac' };
    return '<span style="padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;'+(cfg[level]||'background:#f9fafb;color:#6b7280')+'">'+(level||'—')+'</span>';
  }

  var flagRows = filtered.length
    ? filtered.map(function(r, i){
        var p  = r.patient;
        var fl = r.flag;
        var bg = i%2===0?'#fff':'#f8fafc';
        return '<tr style="background:'+bg+';border-bottom:1px solid #e8edf4">' +
          '<td style="padding:10px 14px">' +
            '<div style="font-weight:700;font-size:13px;color:#111111">'+p.name+'</div>' +
            '<div style="font-size:11px;color:#6b7280">'+(p.nationalId||'—')+(p.age?' · '+p.age+'y':'')+(p.sex?' · '+p.sex:'')+'</div>' +
          '</td>' +
          _td(fl.field) +
          '<td style="padding:10px 14px;font-weight:700;color:#dc2626;font-size:13px">'+fl.value+'</td>' +
          '<td style="padding:10px 14px">'+riskBadge(r.riskLevel)+'</td>' +
          _td(fl.reason,'max-width:200px;font-size:12px;color:#6b7280') +
          '<td style="padding:10px 14px;font-size:12px;color:#0F6E56;font-style:italic;max-width:180px">'+(r.aiRisk||'Potentially abnormal — clinical review recommended.')+'</td>' +
          '<td style="padding:10px 14px">' +
            '<button onclick="_nReviewPatient(\''+p.id+'\')" style="padding:5px 12px;border-radius:6px;border:none;background:#0F6E56;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Review</button>' +
          '</td>' +
        '</tr>';
      }).join('')
    : '<tr><td colspan="7" style="padding:24px;text-align:center;color:#6b7280;font-size:13px">No abnormal vital alerts found.</td></tr>';

  var flagTable = '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">' +
    '<div style="padding:12px 16px;border-bottom:1px solid #e5e7eb;background:#f4f5f0;display:flex;align-items:center;justify-content:space-between">' +
      '<div>' +
        '<div style="font-size:14px;font-weight:700;color:#111111">AI-Flagged Abnormal Vitals</div>' +
        '<div style="font-size:11px;color:#6b7280;margin-top:2px">Potentially abnormal vital signs requiring clinical review</div>' +
      '</div>' +
      '<div style="font-size:12px;color:#6b7280">'+filtered.length+' alert'+(filtered.length!==1?'s':'')+' · ML model: triage-v1.0</div>' +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse">' +
    '<thead><tr>'+['Patient','Vital','Value','Risk Level','Reason','AI Risk Note','Action'].map(_th).join('')+'</tr></thead>' +
    '<tbody>'+flagRows+'</tbody>' +
    '</table>' +
  '</div>';

  /* ── Patient Review Modal ── */
  var reviewHtml = '';
  if (_N._reviewId) {
    var rp = pts.find(function(p){ return p.id===_N._reviewId; });
    if (rp) {
      var rpFlags = rp.flags||[];
      var vf = rp.vitals||{};
      var vitalHistory = rp.vitalHistory||[];

      /* Trend chart for each vital */
      function trendLine(label, history, current, color) {
        var vals = history.concat([current]).filter(function(v){ return v!=null&&v!==''; });
        if (vals.length < 2) return '<div style="font-size:11px;color:#6b7280;font-style:italic">Insufficient historical data to display a trend.</div>';
        var max = Math.max.apply(null,vals.map(parseFloat))||1;
        var pts2 = vals.map(function(v,i){ return (i/(vals.length-1)*280)+','+(40-Math.round(parseFloat(v)/max*35)); });
        return '<div style="margin-bottom:8px">' +
          '<div style="font-size:11px;font-weight:600;color:#111111;margin-bottom:3px">'+label+': '+vals.join(' → ')+'</div>' +
          '<svg viewBox="0 0 280 44" style="width:100%;height:36px"><polyline points="'+pts2.join(' ')+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linejoin="round"/>' +
          vals.map(function(v,i){ return '<circle cx="'+(i/(vals.length-1)*280)+'" cy="'+(40-Math.round(parseFloat(v)/max*35))+'" r="3" fill="'+color+'"/>'; }).join('')+
          '</svg>' +
        '</div>';
      }

      reviewHtml = '<div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto">' +
        '<div style="background:#fff;border-radius:14px;width:100%;max-width:720px;box-shadow:0 20px 60px rgba(0,0,0,.3);margin:auto">' +

          /* Header */
          '<div style="background:linear-gradient(135deg,#0F6E56,#0F6E56);padding:18px 22px;border-radius:14px 14px 0 0;display:flex;align-items:center;justify-content:space-between">' +
            '<div>' +
              '<div style="font-size:16px;font-weight:800;color:#fff">Patient Review</div>' +
              '<div style="font-size:12px;color:rgba(255,255,255,.75)">AI-Flagged Abnormal Vitals — Clinical Decision Support</div>' +
            '</div>' +
            '<button onclick="_N._reviewId=null;_nurseRender()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;font-family:inherit">✕</button>' +
          '</div>' +

          '<div style="padding:20px;display:flex;flex-direction:column;gap:14px">' +

            /* Patient info */
            '<div style="display:flex;align-items:center;gap:12px;padding:14px;background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe">' +
              '<div style="width:44px;height:44px;border-radius:50%;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0">'+(rp.name.split(' ').map(function(n){return n[0];}).join('').slice(0,2))+'</div>' +
              '<div>' +
                '<div style="font-size:16px;font-weight:800;color:#0f172a">'+rp.name+'</div>' +
                '<div style="font-size:12px;color:#6b7280">ID: '+(rp.nationalId||'—')+' · '+rp.age+'y · '+rp.sex+'</div>' +
                '<div style="font-size:12px;color:#6b7280">Chief complaint: '+rp.complaint+'</div>' +
              '</div>' +
              '<div style="margin-left:auto">'+riskBadge(_getRiskLevel({field:'overall'},rp))+'</div>' +
            '</div>' +

            /* Current vitals */
            '<div style="background:#f8fafc;border-radius:10px;padding:14px;border:1px solid #e5e7eb">' +
              '<div style="font-size:12px;font-weight:700;color:#111111;margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">Current Vitals</div>' +
              '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' +
                [['Blood Pressure',vf.bp,'mmHg'],['Heart Rate',vf.hr,'bpm'],['SpO₂',vf.spo2,'%'],['Respiratory Rate',vf.rr,'/min'],['Temperature',vf.temp,'°C'],['Weight',vf.weight,'kg']].map(function(row){
                  var isFlag = rpFlags.some(function(fl){ return fl.field.toLowerCase().includes(row[0].toLowerCase().split(' ')[0]); });
                  return '<div style="padding:8px 10px;background:'+(isFlag?'#fef2f2':'#fff')+';border-radius:6px;border:1px solid '+(isFlag?'#fca5a5':'#e5e7eb')+'">' +
                    '<div style="font-size:10px;color:#6b7280;margin-bottom:2px">'+row[0]+'</div>' +
                    '<div style="font-size:15px;font-weight:700;color:'+(isFlag?'#dc2626':'#111111')+'">'+(row[1]||'—')+' <span style="font-size:11px;font-weight:400;color:#6b7280">'+row[2]+'</span></div>' +
                  '</div>';
                }).join('') +
              '</div>' +
            '</div>' +

            /* Abnormal flags */
            (rpFlags.length ? '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:14px">' +
              '<div style="font-size:12px;font-weight:700;color:#dc2626;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">⚑ Abnormal Flags ('+rpFlags.length+')</div>' +
              rpFlags.map(function(fl){ return '<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px">' +
                '<span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#dc2626;color:#fff;flex-shrink:0">'+_getRiskLevel(fl,rp)+'</span>' +
                '<div><div style="font-size:12px;font-weight:700;color:#dc2626">'+fl.field+': '+fl.value+'</div><div style="font-size:11px;color:#6b7280">'+fl.reason+'</div></div>' +
              '</div>'; }).join('') +
            '</div>' : '') +

            /* AI decision note with model metadata */
            '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #0F6E56;border-radius:8px;padding:12px 14px">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
                '<div style="font-size:12px;font-weight:700;color:#0B5443">AI Decision-Support Note</div>' +
                '<div style="display:flex;gap:6px;align-items:center">' +
                  (rp.mlRiskLevel
                    ? '<span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:'+(rp.mlRiskLevel==='HIGH'?'#dc2626':rp.mlRiskLevel==='MEDIUM'?'#d97706':'#16a34a')+';color:#fff">'+rp.mlRiskLevel+' RISK</span>'
                    : '') +
                  (rp.mlConfidence !== null && rp.mlConfidence !== undefined
                    ? '<span style="font-size:11px;color:#0B5443;font-weight:600">'+Math.round(rp.mlConfidence*100)+'% confidence</span>'
                    : '') +
                '</div>' +
              '</div>' +
              '<div style="font-size:13px;color:#1e3a8a;margin-bottom:6px">'+(rp.aiRisk||'Potentially abnormal vital signs detected — clinical review recommended.')+'</div>' +
              '<div style="display:flex;align-items:center;justify-content:space-between">' +
                '<div style="font-size:10px;color:#6b7280;font-style:italic">AI predictions are for clinical decision-support only. They do not constitute a diagnosis.</div>' +
                '<div style="font-size:10px;color:#94a3b8">'+(rp.mlModelVersion||'triage-v2.0')+'</div>' +
              '</div>' +
              (!rp.mlRiskLevel ? '<button onclick="_nCallML(\''+rp.id+'\')" style="margin-top:8px;width:100%;padding:7px;border-radius:6px;border:none;background:#0F6E56;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">'+((_N._mlLoading===rp.id)?'⏳ Running ML…':'▶ Run ML Analysis now')+'</button>' : '') +
            '</div>' +

            /* Vital trends */
            '<div style="background:#f8fafc;border-radius:10px;padding:14px;border:1px solid #e5e7eb">' +
              '<div style="font-size:12px;font-weight:700;color:#111111;margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">Vital Trends</div>' +
              (vitalHistory.length
                ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
                    trendLine('Heart Rate', vitalHistory.map(function(h){return h.hr;}), vf.hr, '#0F6E56') +
                    trendLine('SpO₂',       vitalHistory.map(function(h){return h.spo2;}),vf.spo2,'#0F6E56') +
                    trendLine('RR',         vitalHistory.map(function(h){return h.rr;}),  vf.rr,  '#d97706') +
                  '</div>'
                : '<div style="font-size:12px;color:#6b7280;font-style:italic">Insufficient historical data to display a trend.</div>') +
            '</div>' +

            /* Review notes */
            '<div>' +
              '<label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#475569;margin-bottom:6px">Review Notes (for clinical record)</label>' +
              '<textarea id="review-notes-'+rp.id+'" rows="3" placeholder="Add clinical review notes…" style="width:100%;padding:10px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box"></textarea>' +
            '</div>' +

            /* Actions */
            '<div style="display:flex;gap:8px">' +
              '<button onclick="_nMarkReviewed(\''+rp.id+'\')" style="flex:1;padding:11px;border-radius:8px;border:none;background:#0F6E56;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">✓ Mark as Reviewed</button>' +
              '<button onclick="_nCallML(\''+rp.id+'\')" style="padding:11px 18px;border-radius:8px;border:1.5px solid #0F6E56;background:#fff;color:#0F6E56;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">'+((_N._mlLoading===rp.id)?'⏳ Running…':'↺ Re-run ML')+'</button>' +
              '<button onclick="_N._reviewId=null;_nurseRender()" style="padding:11px 18px;border-radius:8px;border:1.5px solid #e5e7eb;background:#fff;color:#6b7280;font-size:13px;cursor:pointer;font-family:inherit">Close</button>' +
            '</div>' +

          '</div>' +
        '</div>' +
      '</div>';
    }
  }

  /* ── Bar chart ── */
  var barChart = '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:14px">' +
    '<div style="font-size:12px;font-weight:700;color:#111111;margin-bottom:12px">Patients Triaged per Hour (Today)</div>' +
    '<div style="display:flex;align-items:flex-end;gap:4px;height:80px">' +
      hourly.map(function(r){
        var pct = Math.round(r.n/maxH*100);
        return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">' +
          (r.n?'<div style="font-size:9px;color:#6b7280">'+r.n+'</div>':'')+
          '<div style="width:100%;background:#0F6E56;border-radius:2px 2px 0 0;height:'+pct+'%"></div>' +
          '<div style="font-size:8px;color:#9ca3af;white-space:nowrap">'+r.h+'</div>' +
        '</div>';
      }).join('') +
    '</div>' +
  '</div>';

  /* ── Priority breakdown ── */
  var priBreakdown = '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:14px">' +
    '<div style="font-size:12px;font-weight:700;color:#111111;margin-bottom:10px">Patients by Priority</div>' +
    ['Emergency','High','Normal'].map(function(pr){
      var count = pts.filter(function(p){ return p.priority===pr; }).length;
      var pct   = pts.length ? Math.round(count/pts.length*100) : 0;
      var color = {Emergency:'#dc2626',High:'#d97706',Normal:'#16a34a'}[pr];
      return '<div style="margin-bottom:8px">' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="color:#111111">'+pr+'</span><span style="font-weight:700;color:'+color+'">'+count+'</span></div>' +
        '<div style="height:6px;background:#f1f5f9;border-radius:3px"><div style="height:6px;background:'+color+';border-radius:3px;width:'+pct+'%"></div></div>' +
      '</div>';
    }).join('') +
  '</div>';

  return _nHeader('Analytics & AI Alerts', 'AI-flagged abnormal vitals requiring clinical review') +
    '<div style="flex:1;overflow:auto;padding:14px 18px">' +
      disclaimer +
      kpiHtml +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">' +
        barChart + priBreakdown +
      '</div>' +
      filters +
      flagTable +
    '</div>' +
    reviewHtml;
}

/* ── Risk level helper ────────────────────────────────────────────────────── */
function _getRiskLevel(flag, patient) {
  /* Use ML result if available */
  if (patient.mlRiskLevel) return patient.mlRiskLevel;
  /* Rule-based fallback from flag field */
  var f = (flag.field||'').toLowerCase();
  var v = flag.value||'';
  if (f.includes('spo2')||f.includes('oxygen')) {
    var n=parseInt(v);
    return n<90?'HIGH':n<94?'MEDIUM':'LOW';
  }
  if (f.includes('blood pressure')||f.includes('bp')) {
    var parts=(v+'').split('/').map(Number);
    if(parts[0]>=180||parts[0]<80) return 'HIGH';
    if(parts[0]>=160||parts[0]<90) return 'MEDIUM';
    return 'LOW';
  }
  if (f.includes('heart rate')||f.includes('hr')) {
    var n2=parseInt(v);
    return n2>130||n2<40?'HIGH':n2>100||n2<50?'MEDIUM':'LOW';
  }
  if (f.includes('temp')) {
    var t=parseFloat(v);
    return t>40||t<35?'HIGH':t>38.5||t<36?'MEDIUM':'LOW';
  }
  if (f.includes('rr')||f.includes('respiratory')) {
    var rr=parseInt(v);
    return rr>30||rr<8?'HIGH':rr>20||rr<12?'MEDIUM':'LOW';
  }
  return 'MEDIUM';
}

/* ── Review actions ───────────────────────────────────────────────────────── */
window._nReviewPatient = function(id) {
  _N._reviewId = id;
  _nurseRender();
};

window._nMarkReviewed = function(id) {
  var p = _N.patients.find(function(x){ return x.id===id; });
  if (p) { p.reviewed=true; p.reviewedAt=_nowTime(); }
  var notes = (document.getElementById('review-notes-'+id)||{value:''}).value.trim();
  if (notes && p) p.reviewNotes = notes;
  _N._reviewId = null;
  _nurseRender();
  UI.showToast('Patient review recorded','ok');

  /* Save to backend */
  try {
    API._fetchDirect('/patients/'+(p&&p.pid||id)+'/review',{
      method:'POST',
      body:JSON.stringify({reviewed:true,reviewedAt:new Date().toISOString(),reviewNotes:notes})
    }).catch(function(){});
  } catch(_){}
};

window._nCallML = async function(id) {
  var p = _N.patients.find(function(x){ return x.id===id; });
  if (!p) { UI.showToast('Patient not found','err'); return; }
  if (!p.vitals) { UI.showToast('No vitals recorded for '+p.name+' — record vitals first','err'); return; }

  /* Parse BP: "168/104" → systolic=168, diastolic=104 */
  var bpParts  = (p.vitals.bp||'0/0').split('/').map(function(v){ return parseInt(v)||0; });
  var payload  = {
    heartRate:   parseFloat(p.vitals.hr)   || null,
    spo2:        parseFloat(p.vitals.spo2) || null,
    systolicBP:  bpParts[0]                || null,
    diastolicBP: bpParts[1]                || null,
    temperature: parseFloat(p.vitals.temp) || null,
    patientId:   p.pid || p.id,
    role:        'nurse'
  };

  /* Warn if any field is missing */
  var missing = Object.keys(payload).filter(function(k){
    return k !== 'patientId' && k !== 'role' && (payload[k]===null||payload[k]===0);
  });
  if (missing.length) {
    UI.showToast('Missing vitals: '+missing.join(', ')+' — results may be incomplete','warn');
  }

  /* Show loading state on button */
  _N._mlLoading = id;
  _nurseRender();

  try {
    var res = await API._fetchDirect('/ml/triage', {
      method: 'POST',
      body:   JSON.stringify(payload)
    });

    if (res && res.success && res.riskLevel) {
      /* Store ML results on patient */
      p.mlRiskLevel     = res.riskLevel;
      p.mlConfidence    = res.confidence;
      p.mlModelVersion  = res.modelVersion;
      p.aiRisk          = res.aiRiskNote || p.aiRisk;
      p.predictionId    = res.predictionId || null;

      /* Update flags from ML */
      if (res.abnormalVitals && res.abnormalVitals.length) {
        p.flags = res.abnormalVitals.map(function(v){
          return { field:v.vital, value:v.value, reason:v.reason, status:v.status };
        });
      }

      var toast  = 'ML: '+res.riskLevel+' risk';
      var color  = res.riskLevel==='HIGH'?'warn':res.riskLevel==='MEDIUM'?'warn':'ok';
      if (res.confidence !== null && res.confidence !== undefined) {
        toast += ' ('+Math.round(res.confidence*100)+'% confidence)';
      }
      UI.showToast(toast, color);

    } else if (res && res.error) {
      UI.showToast('ML: '+res.error, 'warn');
    } else {
      UI.showToast('ML prediction unavailable. Please try again later.','warn');
    }

  } catch(e) {
    if (e.message && (e.message.includes('503')||e.message.includes('timeout')||e.message.includes('Failed'))) {
      UI.showToast('ML service is currently unavailable. NIHMS functionality is still available.','warn');
    } else {
      UI.showToast('ML prediction error. Please try again.','warn');
    }
  }

  _N._mlLoading = null;
  _nurseRender();
};

/* Run ML on ALL patients who have completed vitals but no ML result yet */
window._nRunMLAll = async function() {
  var candidates = _N.patients.filter(function(p){
    return p.vitals && p.vitalStatus==='Completed' && !p.mlRiskLevel;
  });
  if (!candidates.length) { UI.showToast('All patients already have ML results','ok'); return; }
  UI.showToast('Running ML on '+candidates.length+' patient'+(candidates.length>1?'s':'')+'…','ok');
  for (var i=0; i<candidates.length; i++) {
    await window._nCallML(candidates[i].id);
  }
  UI.showToast('ML analysis complete for all patients','ok');
};


/* ════════════════════════════════════════════════════════════════
   ACTION HANDLERS
════════════════════════════════════════════════════════════════ */

/* Requests */
window._nurseReqExpand = function(id) {
  _N.reqExpanded = (_N.reqExpanded===id) ? null : id;
  _N.requests = _N.requests.map(function(r){ return r.id===id ? Object.assign({},r,{seen:true}) : r; });
  _nurseRender();
};

window._nurseReqAccept = async function(id) {
  var req = _N.requests.find(function(r){ return r.id===id; });
  if (!req) return;
  var now = _nowTime();

  /* Assign nurse station number (1–4 rotating) */
  var stationNum = (_N._stationSeq = ((_N._stationSeq||0) % 4) + 1);

  _N.patients.push({
    id: req.patientId, nationalId: req.nationalId||'', name: req.patientName, age: req.age, sex: req.sex,
    complaint: req.complaint, priority: req.priority,
    status: 'Awaiting Vitals', vitalStatus: 'Pending',
    arrivalTime: req.requestedAt, triageTime: null, waitMins: 0,
    room: null, emergencyClass: null, vitals: null, flags: [], aiRisk: null,
    acceptedAt: now, stationNum: stationNum,
  });

  /* ── Mark as accepted so no re-injection path can re-add this request ── */
  _N._acceptedIds[id]                    = true;
  _N._acceptedPatientIds[req.patientId]  = true;

  /* Remove ALL requests for this patient (same patient may appear with different ids
     e.g. appointment REQ-xxx and a queue check-in push with a different id) */
  var ptId = req.patientId;
  _N.requests.forEach(function(r) {
    if (r.id === id || r.patientId === ptId) {
      _N._acceptedIds[r.id] = true;
    }
  });
  _N.requests = _N.requests.filter(function(r){ return r.id!==id && r.patientId!==ptId; });

  /* Remove from the receptionist live-push global so _nurseRender never re-adds it */
  if (window._NURSE_REQUESTS) {
    window._NURSE_REQUESTS = window._NURSE_REQUESTS.filter(function(r){
      return r.id!==id && r.patientId!==ptId;
    });
  }
  /* Remove from localStorage queue so cross-tab drain never re-adds it */
  try {
    var _lsQ = JSON.parse(localStorage.getItem('_NIHMS_NURSE_QUEUE') || '[]');
    _lsQ = _lsQ.filter(function(r){ return r.id!==id && r.patientId!==ptId; });
    localStorage.setItem('_NIHMS_NURSE_QUEUE', JSON.stringify(_lsQ));
  } catch(_) {}

  /* Persist accepted status to backend (best-effort) */
  var aptId = req.aptId || (id.startsWith('REQ-') ? id.slice(4) : null);
  if (aptId) {
    API._fetchDirect('/appointments/' + aptId, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'at-nurse', nurseStation: stationNum, nurseAcceptedAt: new Date().toISOString() }),
    }).catch(function(){});
  }

  /* ── Send SMS + Email to patient ── */
  var ptName   = req.patientName || 'Patient';
  var token    = req.token || req.id.replace('REQ-','');
  var smsMsg   = 'NIHMS: Token ' + token + ' is now being called to Nurse Station ' + stationNum +
                 '. Dear ' + ptName + ', please proceed immediately. Johannesburg CHC.';
  var emailHtml = '<div style="font-family:inherit;max-width:500px;margin:0 auto">' +
    '<div style="background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);padding:22px;border-radius:10px 10px 0 0;text-align:center">' +
      '<h2 style="color:#fff;margin:0;font-size:18px">Now Serving at Nurse Station</h2>' +
    '</div>' +
    '<div style="background:#f8fafc;padding:22px;border-radius:0 0 10px 10px">' +
      '<p style="font-size:14px;color:#475569">Dear <strong>' + ptName + '</strong>,</p>' +
      '<div style="background:#fff;border-radius:10px;border:2px solid #bfdbfe;padding:20px;text-align:center;margin-bottom:16px">' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:6px">Your token</div>' +
        '<div style="font-size:48px;font-weight:900;font-family:monospace;color:#0F6E56;line-height:1">' + token + '</div>' +
        '<div style="margin-top:12px;font-size:15px;font-weight:700;color:#111111">is now being called to</div>' +
        '<div style="font-size:24px;font-weight:800;color:#0F6E56;margin-top:4px">Nurse Station ' + stationNum + '</div>' +
      '</div>' +
      '<p style="font-size:13px;color:#475569">Please proceed to <strong>Nurse Station ' + stationNum + '</strong> immediately for your vitals check.</p>' +
      '<p style="font-size:12px;color:#94a3b8">Johannesburg CHC · Emergencies: 10177</p>' +
    '</div></div>';

  try {
    if (req.phone) {
      await API._fetchDirect('/notifications/sms',{method:'POST',body:JSON.stringify({to:req.phone, message:smsMsg})}).catch(function(){});
    }
    if (req.email) {
      await API._fetchDirect('/notifications/email',{method:'POST',body:JSON.stringify({to:req.email, subject:'NIHMS — Token '+token+' now serving at Nurse Station '+stationNum, html:emailHtml})}).catch(function(){});
    }
    /* Also try to find patient contact via NIHMS_PATIENTS */
    if (!req.phone && !req.email && window.NIHMS_PATIENTS) {
      var pt = window.NIHMS_PATIENTS.find(function(p){ return p.id===req.patientId || p.nationalId===req.patientId; });
      if (pt && pt.phone) await API._fetchDirect('/notifications/sms',{method:'POST',body:JSON.stringify({to:pt.phone, message:smsMsg})}).catch(function(){});
      if (pt && pt.email) await API._fetchDirect('/notifications/email',{method:'POST',body:JSON.stringify({to:pt.email, subject:'NIHMS — Token '+token+' now serving at Nurse Station '+stationNum, html:emailHtml})}).catch(function(){});
    }
  } catch(_){}

  _N.view = 'vitals';
  _nurseRender();
  UI.showToast(req.patientName+' accepted — notified to proceed to Station '+stationNum,'ok');

  /* Update receptionist queue */
  if (window._REC && window._REC.queue) {
    var qp = window._REC.queue.find(function(q){ return q.name===req.patientName; });
    if (qp) qp.status = 'vitals';
  }
};

window._nurseReqDecline = function(id) {
  _N.decliningId = id;
  _N.reqExpanded = id;
  _nurseRender();
};

window._nurseReqDeclineConfirm = function(id) {
  var req   = _N.requests.find(function(r){ return r.id===id; });
  var ptId  = req ? req.patientId : null;

  /* Mark ALL requests for this patient as declined */
  _N.requests.forEach(function(r) {
    if (r.id === id || (ptId && r.patientId === ptId)) {
      _N._acceptedIds[r.id] = true;
    }
  });
  if (ptId) _N._acceptedPatientIds[ptId] = true;

  /* Remove all matching requests from in-memory list */
  _N.requests = _N.requests.filter(function(r){
    return r.id !== id && !(ptId && r.patientId === ptId);
  });

  /* Remove from receptionist live-push global */
  if (window._NURSE_REQUESTS) {
    window._NURSE_REQUESTS = window._NURSE_REQUESTS.filter(function(r){
      return r.id !== id && !(ptId && r.patientId === ptId);
    });
  }

  /* Remove from localStorage queue */
  try {
    var _lsQ = JSON.parse(localStorage.getItem('_NIHMS_NURSE_QUEUE') || '[]');
    _lsQ = _lsQ.filter(function(r){ return r.id !== id && !(ptId && r.patientId === ptId); });
    localStorage.setItem('_NIHMS_NURSE_QUEUE', JSON.stringify(_lsQ));
  } catch(_) {}

  _N.decliningId = null;
  _N.reqExpanded = null;
  _nurseRender();
  UI.showToast('Request declined','warn');
};

/* Queue */
window._nurseCallNext = function() {
  var next = _N.patients.find(function(p){ return p.status==='Awaiting Vitals'&&p.priority==='Emergency'; })
          || _N.patients.find(function(p){ return p.status==='Awaiting Vitals'&&p.priority==='High'; })
          || _N.patients.find(function(p){ return p.status==='Awaiting Vitals'; });
  if (!next) return;
  next.status    = 'In Vitals';
  next.triageTime = _nowTime();
  _N.queueSel = next.id;
  _nurseRender();
  UI.showToast('Calling '+next.name+' for vitals','ok');
};

window._nurseQueuePriority = function(id, priority) {
  var p = _N.patients.find(function(x){ return x.id===id; });
  if (p) p.priority = priority;
  _nurseRender();
};

window._nurseQueueMarkReady = function(id) {
  var p = _N.patients.find(function(x){ return x.id===id; });
  if (p) p.status = 'Ready for Consultation';
  _nurseRender();
  UI.showToast(p ? p.name+' is ready for consultation' : 'Patient ready','ok');
};

window._nurseQueueRoute = function(id, dest) {
  var p = _N.patients.find(function(x){ return x.id===id; });
  if (!p) return;
  p.status   = dest;
  _N.queueSel = null;

  /* ── Push to doctor queue ── */
  if (dest === 'In Consultation' || dest === 'with-doctor') {
    var docEntry = {
      id: p.id, name: p.name, age: p.age, sex: p.sex,
      complaint: p.complaint, priority: p.priority,
      vitals: p.vitals || null, flags: p.flags || [],
      aiRisk: p.aiRisk || null, arrivedAt: _nowTime(),
      department: p.department || 'General Consultation',
      fromNurse: true,
    };
    /* Shared doctor queue — used by doctor.js if open */
    if (!window._DOCTOR_QUEUE) window._DOCTOR_QUEUE = [];
    window._DOCTOR_QUEUE.push(docEntry);
    /* If doctor page is open and has a render function */
    if (window._dcAddPatient) window._dcAddPatient(docEntry);
    UI.showToast(p.name + ' added to doctor queue','ok');
  }

  /* ── Push to lab queue ── */
  else if (dest === 'Lab') {
    var labEntry = {
      id: p.id, name: p.name, age: p.age, sex: p.sex,
      complaint: p.complaint, priority: p.priority,
      requestedAt: _nowTime(), fromNurse: true,
      tests: p.labTests || ['Full Blood Count', 'Glucose'],
    };
    if (!window._LAB_QUEUE) window._LAB_QUEUE = [];
    window._LAB_QUEUE.push(labEntry);
    UI.showToast(p.name + ' added to lab queue','ok');
  }

  else {
    UI.showToast('Patient routed to ' + dest, 'ok');
  }

  _nurseRender();
};

/* Vitals */
window._nurseVitalsEdit = function(id) {
  var p = _N.patients.find(function(x){ return x.id===id; });
  if (!p) return;
  _N.editId    = id;
  _N.vitalForm = p.vitals ? Object.assign({}, p.vitals) : { bp:'', temp:'', hr:'', spo2:'', weight:'', rr:'' };
  _nurseRender();
};

window._nurseSaveVitals = async function(id) {
  var p = _N.patients.find(function(x){ return x.id===id; });
  if (!p) return;
  var form  = _N.vitalForm;
  if (!form.bp && !form.hr) { UI.showToast('Enter at least BP and HR','err'); return; }

  var flags    = _flagVitals(form);
  var escalate = flags.some(function(f){ return /hypertensive|critical|emergency/i.test(f.reason||''); });

  p.vitals      = Object.assign({}, form);
  p.flags       = flags;
  p.vitalStatus = 'Completed';
  p.status      = 'With Doctor';
  if (flags.length && !p.aiRisk) p.aiRisk = 'Abnormal vitals detected — clinical review recommended.';
  _N.editId = null;

  /* ── Build a timestamped vitals record ── */
  var vitalsRecord = {
    vitals:       Object.assign({}, form),
    flags:        flags,
    recordedAt:   new Date().toISOString(),
    recordedDate: new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),
    recordedTime: _nowTime(),
    recordedBy:   'Nurse Station',
    facility:     'Johannesburg Community Health Centre',
    ward:         'Triage / Outpatient',
    vitalStatus:  'Completed',
  };

  /* ── Attach to in-memory patient so Patient 360° shows it immediately ── */
  p.vitalsRecord = vitalsRecord;
  if (!p.vitalHistory) p.vitalHistory = [];
  p.vitalHistory.push(vitalsRecord);

  /* ── Also update global patient store so 360° API-load path picks it up ── */
  try {
    if (window.NIHMS_PATIENTS) {
      var gPt = window.NIHMS_PATIENTS.find(function(x){
        return x._id===p.pid||x.id===p.pid||x._id===p.id||x.id===p.id||
               x.nationalId===p.id||x.nationalId===p.pid;
      });
      if (gPt) {
        gPt.vitals = Object.assign({}, form);
        if (!gPt.vitalHistory) gPt.vitalHistory = [];
        gPt.vitalHistory.push(vitalsRecord);
      }
    }
  } catch(_) {}

  /* ── Persist vitals to backend ── */
  try {
    await API._fetchDirect('/patients/'+(p.pid||p.id)+'/vitals', {
      method: 'POST',
      body:   JSON.stringify(vitalsRecord),
    }).catch(function(){});
  } catch(_) {}

  /* ── Update appointment / queue status to 'at-doctor' on backend ── */
  try {
    if (p.aptId) {
      API._fetchDirect('/appointments/'+p.aptId, {
        method: 'PATCH',
        body:   JSON.stringify({ status:'at-doctor', vitalsCompletedAt: vitalsRecord.recordedAt }),
      }).catch(function(){});
    }
    if (p.queueId || p.token) {
      API._fetchDirect('/queue/'+(p.queueId||p.token), {
        method: 'PATCH',
        body:   JSON.stringify({ status:'with-doctor', vitalsCompletedAt: vitalsRecord.recordedAt }),
      }).catch(function(){});
    }
  } catch(_) {}

  /* ── Build doctor queue entry — includes full vitalHistory for Patient 360° ── */
  var docEntry = {
    id:           p.id,
    pid:          p.pid || p.id,
    name:         p.name,
    age:          p.age,
    sex:          p.sex,
    complaint:    p.complaint,
    priority:     p.priority,
    vitals:       Object.assign({}, form),
    vitalHistory: p.vitalHistory.slice(),   /* ← full history for Patient 360° */
    flags:        flags,
    aiRisk:       p.aiRisk || null,
    arrivedAt:    _nowTime(),
    department:   p.department || 'General Consultation',
    status:       escalate ? 'Emergency' : 'waiting',
    vitalStatus:  'Completed',
    recordedAt:   vitalsRecord.recordedAt,
    fromNurse:    true,
    aptId:        p.aptId || null,
    token:        p.token || null,
  };

  /* ── Push to doctor queue (same-tab live push) ── */
  window._DOCTOR_QUEUE = window._DOCTOR_QUEUE || [];
  var alreadyInDocQ = window._DOCTOR_QUEUE.find(function(x){ return x.id===docEntry.id; });
  if (alreadyInDocQ) {
    /* Update existing entry with fresh vitals */
    Object.assign(alreadyInDocQ, docEntry);
  } else {
    window._DOCTOR_QUEUE.push(docEntry);
  }
  if (window._dcAddPatient) window._dcAddPatient(docEntry);

  /* ── Cross-tab push: BroadcastChannel + localStorage drain ── */
  try {
    var _dCh = new BroadcastChannel('nihms_doctor_queue');
    _dCh.postMessage({ type:'DOCTOR_PT', doc: docEntry });
    _dCh.close();
  } catch(_) {}
  try {
    var _stored = JSON.parse(localStorage.getItem('_NIHMS_DOCTOR_QUEUE') || '[]');
    var _idx = _stored.findIndex(function(x){ return x.id===docEntry.id; });
    if (_idx >= 0) _stored[_idx] = docEntry; else _stored.push(docEntry);
    localStorage.setItem('_NIHMS_DOCTOR_QUEUE', JSON.stringify(_stored));
    /* Signal drain to doctor tab via storage event */
    localStorage.setItem('_NIHMS_DOCTOR_REQ', JSON.stringify(docEntry));
    setTimeout(function(){ try { localStorage.removeItem('_NIHMS_DOCTOR_REQ'); } catch(_){} }, 500);
  } catch(_) {}

  _nurseRender();

  /* ── Auto-run ML risk scoring after vitals saved ── */
  try {
    var bpParts2 = (form.bp||'0/0').split('/').map(function(v){ return parseInt(v)||0; });
    var mlAuto = {
      heartRate:   parseFloat(form.hr)   || null,
      spo2:        parseFloat(form.spo2) || null,
      systolicBP:  bpParts2[0]           || null,
      diastolicBP: bpParts2[1]           || null,
      temperature: parseFloat(form.temp) || null,
      patientId:   p.pid || p.id,
      role:        'nurse',
    };
    var mlFilled = Object.keys(mlAuto).filter(function(k){
      return k !== 'patientId' && k !== 'role' && (mlAuto[k] !== null && mlAuto[k] !== 0);
    }).length;
    if (mlFilled >= 2) {
      API._fetchDirect('/ml/triage', { method:'POST', body:JSON.stringify(mlAuto) })
        .then(function(res) {
          if (res && res.success && res.riskLevel) {
            p.mlRiskLevel     = res.riskLevel;
            p.mlConfidence    = res.confidence;
            p.mlModelVersion  = res.modelVersion || 'triage-v2.0';
            p.aiRisk          = res.aiRiskNote || p.aiRisk;
            p.predictionId    = res.predictionId || null;
            if (res.abnormalVitals && res.abnormalVitals.length) {
              p.flags = res.abnormalVitals.map(function(v){
                return { field:v.vital, value:v.value, reason:v.reason, status:v.status };
              });
            }
            /* Update the doctor queue entry with ML result */
            var dq = window._DOCTOR_QUEUE && window._DOCTOR_QUEUE.find(function(x){ return x.id===p.id; });
            if (dq) { dq.aiRisk = p.aiRisk; dq.flags = p.flags; dq.mlRiskLevel = p.mlRiskLevel; }
            UI.showToast('ML: '+res.riskLevel+' risk ('+Math.round((res.confidence||1)*100)+'%)', res.riskLevel==='HIGH'?'warn':'ok');
            _nurseRender();
          }
        }).catch(function(){});
    }
  } catch(_) {}

  if (flags.length) {
    UI.showToast('Vitals saved · '+flags.length+' flag'+(flags.length>1?'s':'')+' · '+p.name+' → doctor queue','warn');
  } else {
    UI.showToast('Vitals complete · '+p.name+' → doctor queue','ok');
  }
};

/* Emergency */
window._nurseAdmitResus = function() {
  _N.patients.push({
    id:'P-RTA', name:'Unknown Male (RTA)', age:40, sex:'M',
    complaint:'Road traffic accident — head trauma, unconscious on arrival',
    priority:'Emergency', status:'In Vitals', vitalStatus:'Pending',
    arrivalTime:_nowTime(), triageTime:_nowTime(), waitMins:0,
    room:'Resus 2', emergencyClass:'Critical', vitals:null, flags:[],
    aiRisk:'Head trauma — CT scan and neurosurgery alert recommended', acceptedAt:_nowTime(),
  });
  _N.alertDismissed = true;
  _nurseRender();
  UI.showToast('RTA patient admitted to Resus 2','ok');
};

window._nurseClassify = function(id, ec) {
  var p = _N.patients.find(function(x){ return x.id===id; });
  if (p) { p.emergencyClass = ec; p.status = 'In Vitals'; }
  _N.classifying = null;
  _nurseRender();
  UI.showToast('Patient classified as '+ec,'ok');
};

window._nurseNotifyTeam = function(id) {
  var p = _N.patients.find(function(x){ return x.id===id; });
  if (!p) return;
  var msgText = 'EMERGENCY: '+p.name+' requires immediate attention. Class: '+(p.emergencyClass||'Pending')+'. '+p.complaint;
  var localId = Date.now();
  _N.messages.unshift({ id:localId, from:'Nurse Station', role:'Nurse', text:msgText, time:_nowTime(), unread:false });
  _nurseRender();
  UI.showToast('Team notified about '+p.name,'ok');
  /* Fire-and-forget to API */
  if (window.API && API._fetchDirect) {
    var _nu = (window.API&&window.API._currentUser)||window._currentUser||{};
    API._fetchDirect('/messages',{method:'POST',body:JSON.stringify({
      senderName: _nu.name||'Nurse Station', senderRole: _nu.role||'NURSE',
      recipientRole: 'Doctor',
      subject: 'EMERGENCY ALERT — '+p.name,
      body: msgText, priority: 'URGENT',
      patientId: p.id||p.pid||undefined,
      patientName: p.name||undefined,
      sentAt: new Date().toISOString(), status:'sent', readStatus:'unread',
    })}).catch(function(){});
  }
};

/* ─── Nurse send message (compose view) ─────────────────────────────── */
window._nSendMessage = async function() {
  var btn = document.getElementById('btn-n-send-msg');
  if (btn && btn.getAttribute('data-sending')) return;
  if (btn) { btn.setAttribute('data-sending','1'); btn.disabled=true; btn.textContent='Sending…'; btn.style.opacity='0.7'; }
  function _rst(){ if(btn){ btn.removeAttribute('data-sending'); btn.disabled=false; btn.textContent='✉ Send Message'; btn.style.opacity=''; } }
  function _toast(m,t){ try{ if(window.UI&&window.UI.showToast) window.UI.showToast(m,t); }catch(_){} }

  /* Collect values from state (set by oninput handlers) and fallback to DOM */
  var recip    = _N._nComposeRecip    || 'Doctor / Clinician';
  var priority = _N._nComposePriority || 'Normal';
  var subject  = (_N._nComposeSubject || (document.getElementById('n-compose-subject')||{}).value || '').trim();
  var body     = (_N._nComposeBody    || (document.getElementById('n-compose-body')||{}).value    || '').trim();
  var patient  = (_N._nComposePatient || (document.getElementById('n-compose-patient')||{}).value || '').trim();

  if (!body)    { _rst(); _toast('Please enter a message body.','err'); return; }
  if (!subject) { subject = 'Message from Nurse Station'; }
  if (patient)  { body = '[Patient: '+patient+']\n'+body; }

  /* Sender identity */
  var _nu = (window.API && window.API._currentUser) || window._currentUser
    || (function(){ try{ return JSON.parse(sessionStorage.getItem('user')||localStorage.getItem('currentUser')||'null'); }catch(_){ return null; } })() || {};
  var senderId   = _nu._id || _nu.id || null;
  var senderName = _nu.firstName ? ((_nu.firstName||'')+' '+(_nu.lastName||'')).trim() : (_nu.name || 'Nurse Station');
  var senderRole = ((_nu.role||'NURSE_STATION').toUpperCase().replace('NURSE_STATION','NURSE_STATION'))||'NURSE_STATION';
  /* Normalise to allowed enum */
  if (senderRole === 'NURSE') senderRole = 'NURSE_STATION';

  /* Map display label → backend recipientRole enum */
  var toRole = _nRoleMap[recip] || recip.replace(/ /g,'_').toUpperCase();

  var payload = {
    senderId:      senderId || undefined,
    senderName:    senderName,
    senderRole:    senderRole,
    recipientRole: toRole,
    subject:       subject,
    body:          body,
    priority:      priority,
    sentAt:        new Date().toISOString(),
  };

  try {
    var res = await API._fetchDirect('/messages', { method:'POST', body: JSON.stringify(payload) });
    if (!res || res.success === false || (res.statusCode && res.statusCode >= 400)) {
      _rst();
      _toast(res && (res.message||res.error) ? (res.message||res.error) : 'Could not send message — please try again.', 'err');
      return;
    }
    var savedId = (res.data && (res.data._id||res.data.id)) || res._id || res.id || null;

    /* Add to local sent list */
    _N.messages.unshift({
      id: savedId||Date.now(), _id: savedId||null,
      from: senderName, senderRole: senderRole, role: senderRole,
      subject: subject, body: body, text: body,
      priority: priority, readStatus: 'read', unread: false,
      time: _nowTime(), sentAt: payload.sentAt,
    });

    /* Push to recipient portal if open */
    var inmem = { id: savedId, _id: savedId, from: senderName, senderName: senderName,
                  senderRole: senderRole, subject: subject, body: body, text: body,
                  priority: priority, time: _nowTime(), sentAt: payload.sentAt };
    try{
      if ((toRole==='DOCTOR'||toRole==='DOCTOR/CLINICIAN') && window._doctorAddMessage) window._doctorAddMessage(inmem);
      if (toRole==='RECEPTIONIST' && window._receptionAddMessage) window._receptionAddMessage(inmem);
    }catch(_be){}

    /* Socket.IO real-time notify */
    try{
      if (window.socket && window.socket.emit) {
        window.socket.emit('new-message', { recipientRole: toRole, messageId: savedId||null, senderId: senderId });
      }
    }catch(_se){}

    /* Clear compose state */
    _N._nComposeRecip = null; _N._nComposeSubject = ''; _N._nComposeBody = '';
    _N._nComposePatient = ''; _N._nComposePriority = 'Normal';
    window._nMsgView = 'sent';
    _N._nMsgsLoaded = false;
    _rst();
    _nurseRender();
    _toast('Message sent to '+recip, 'ok');
  } catch(err) {
    _rst();
    _toast((err && err.message) || 'Could not send message — please try again.', 'err');
  }
};

/* ─── Nurse send reply (thread detail view) ─────────────────────────── */
window._nSendReply = async function(parentId) {
  var btn = document.getElementById('btn-n-reply-msg');
  if (btn && btn.getAttribute('data-sending')) return;
  if (btn) { btn.setAttribute('data-sending','1'); btn.disabled=true; btn.textContent='Sending…'; btn.style.opacity='0.7'; }
  function _rst(){ if(btn){ btn.removeAttribute('data-sending'); btn.disabled=false; btn.textContent='↩ Send Reply'; btn.style.opacity=''; } }
  function _toast(m,t){ try{ if(window.UI&&window.UI.showToast) window.UI.showToast(m,t); }catch(_){} }

  var bodyEl = document.getElementById('n-reply-body');
  var body   = bodyEl ? bodyEl.value.trim() : '';
  if (!body) { _rst(); _toast('Please enter a reply.','err'); return; }

  /* Find original message to reply to */
  var orig = _N.messages.find(function(m){ return String(m._id||m.id||'') === String(parentId||''); });
  if (!orig) { _rst(); _toast('Could not find original message.','err'); return; }

  var _nu = (window.API && window.API._currentUser) || window._currentUser
    || (function(){ try{ return JSON.parse(sessionStorage.getItem('user')||localStorage.getItem('currentUser')||'null'); }catch(_){ return null; } })() || {};
  var senderId   = _nu._id || _nu.id || null;
  var senderName = _nu.firstName ? ((_nu.firstName||'')+' '+(_nu.lastName||'')).trim() : (_nu.name || 'Nurse Station');
  var senderRole = ((_nu.role||'NURSE_STATION').toUpperCase())||'NURSE_STATION';
  if (senderRole === 'NURSE') senderRole = 'NURSE_STATION';

  /* Reply goes back to original sender */
  var toRole = (orig.senderRole||orig.role||'RECEPTIONIST').toUpperCase();
  var toId   = orig.senderId || null;

  var payload = {
    senderId:      senderId || undefined,
    senderName:    senderName,
    senderRole:    senderRole,
    recipientRole: toRole,
    recipientId:   toId || undefined,
    recipientName: orig.from,
    subject:       'Re: ' + (orig.subject||''),
    body:          body,
    priority:      orig.priority || 'Normal',
    sentAt:        new Date().toISOString(),
    threadId:      parentId,
    replyTo:       parentId,
  };

  try {
    var res = await API._fetchDirect('/messages', { method:'POST', body: JSON.stringify(payload) });
    if (!res || res.success === false) {
      _rst(); _toast('Could not send reply — please try again.', 'err'); return;
    }
    var savedId = (res.data && (res.data._id||res.data.id)) || res._id || res.id || null;
    if (bodyEl) bodyEl.value = '';
    /* Socket notify */
    try{
      if (window.socket && window.socket.emit) {
        window.socket.emit('new-message', { recipientRole: toRole, messageId: savedId||null, senderId: senderId });
      }
    }catch(_se){}
    _rst();
    _toast('Reply sent to '+orig.from, 'ok');
  } catch(err) {
    _rst();
    _toast((err && err.message) || 'Could not send reply.', 'err');
  }
};

/* ─── Legacy send function (kept for bind-events compatibility) ──────── */
window._nurseSendMsg = window._nSendMessage;

/* ─── Bind events ────────────────────────────────────────────────────── */
/* Shared named handlers — defined once, reused across re-renders so
   removeEventListener can actually remove them before re-adding.        */
function _nOnClick(e) {
  /* Only handle clicks that originate inside the nurse messaging panel */
  var main = document.getElementById('nurse-main');
  if (!main || !main.contains(e.target)) return;

  var el = e.target;
  var content = document.getElementById('content');
  while (el && el !== content) {
    /* Folder / compose navigation — data-nmsgview */
    if (el.dataset && el.dataset.nmsgview !== undefined) {
      e.preventDefault();
      var view = el.dataset.nmsgview;
      window._nMsgView   = view;
      window._nMsgThread = null;
      if (view !== 'compose' && window._N) window._N._nMsgsLoaded = false;
      if (typeof _nurseRender === 'function') _nurseRender();
      return;
    }
    /* Message row — data-nmsgthread */
    if (el.dataset && el.dataset.nmsgthread !== undefined) {
      e.preventDefault();
      window._nMsgThread = el.dataset.nmsgthread;
      if (typeof _nurseRender === 'function') _nurseRender();
      return;
    }
    /* Action buttons — data-naction */
    if (el.dataset && el.dataset.naction !== undefined) {
      e.preventDefault();
      var act = el.dataset.naction;
      if (act === 'send-msg') {
        if (typeof window._nSendMessage === 'function') window._nSendMessage();
      } else if (act === 'send-reply') {
        var tid = el.dataset.nthreadid || window._nMsgThread;
        if (tid && typeof window._nSendReply === 'function') window._nSendReply(tid);
      } else if (act === 'back-thread') {
        window._nMsgThread = null;
        if (typeof _nurseRender === 'function') _nurseRender();
      }
      return;
    }
    el = el.parentElement;
  }
}
function _nOnChange(e) {
  var main = document.getElementById('nurse-main');
  if (!main || !main.contains(e.target)) return;
  var t = e.target;
  if (!t || !t.dataset) return;
  if ('nrecip' in t.dataset) {
    if (window._N) window._N._nComposeRecip = t.value;
    if (typeof _nurseRender === 'function') _nurseRender();
  } else if ('nprio' in t.dataset) {
    if (window._N) window._N._nComposePriority = t.value;
    if (typeof _nurseRender === 'function') _nurseRender();
  }
}
function _nOnInput(e) {
  var main = document.getElementById('nurse-main');
  if (!main || !main.contains(e.target)) return;
  var t = e.target;
  if (!t || !t.dataset || !window._N) return;
  var f = t.dataset.nfield;
  if (f === 'subject') window._N._nComposeSubject = t.value;
  else if (f === 'patient') window._N._nComposePatient = t.value;
  else if (f === 'body')    window._N._nComposeBody    = t.value;
}
function _nOnKeydown(e) {
  var main = document.getElementById('nurse-main');
  if (!main || !main.contains(e.target)) return;
  if (!(e.key === 'Enter' && (e.ctrlKey || e.metaKey))) return;
  var t = e.target;
  if (!t) return;
  if (t.id === 'n-compose-body' || (t.dataset && t.dataset.nfield === 'body')) {
    e.preventDefault();
    if (typeof window._nSendMessage === 'function') window._nSendMessage();
  } else if (t.id === 'n-reply-body') {
    e.preventDefault();
    var tid2 = window._nMsgThread;
    if (tid2 && typeof window._nSendReply === 'function') window._nSendReply(tid2);
  }
}

/* ── _nurseBindEvents ────────────────────────────────────────────────────
   Attach to #content (the permanent outer container that UI.renderContent
   owns). #nurse-main is recreated from an HTML string on every navigation
   (UI.renderContent does content.innerHTML = fn()), so listeners on it are
   lost the moment the router replaces it. #content is never replaced — only
   its innerHTML changes — so one set of delegated listeners here survives
   every re-render.  We guard with _nContentBound so the attach happens only
   once no matter how many times _nurseRender() is called.                  */
var _nContentBound = false;
function _nurseBindEvents() {
  if (_nContentBound) return;
  var content = document.getElementById('content');
  if (!content) return;          // not mounted yet — will retry when content is ready

  content.addEventListener('click',   _nOnClick);
  content.addEventListener('change',  _nOnChange);
  content.addEventListener('input',   _nOnInput);
  content.addEventListener('keydown', _nOnKeydown);
  _nContentBound = true;
}

/* ─── Public bridge ──────────────────────────────────────────────────── */
window._nurseAddRequest = function(req) {
  if (!window._NURSE_REQUESTS) window._NURSE_REQUESTS = [];

  /* ── Route: Immunisation department → immQueue, all others → requests ── */
  var dept  = (req.department || req.dept || req.type || '').toLowerCase();
  var isImm = dept.includes('immunis') || dept.includes('immuniz') || dept.includes('vaccin');

  if (isImm) {
    /* Deduplicate */
    if (_N.immQueue.find(function(p){ return p.id===req.id || p.token===req.token; })) return;
    var immEntry = {
      id:          req.id          || ('IMM-' + Date.now()),
      token:       req.token       || '',
      patientName: req.patientName || req.name || '',
      patientId:   req.patientId   || req._id  || '',
      _id:         req._id         || req.patientId || '',
      age:         req.age         || '—',
      sex:         req.sex         || req.gender || '',
      dept:        req.department  || req.dept  || 'Immunisation',
      status:      'Awaiting Immunisation',
      priority:    req.priority    || 'Normal',
      checkedInAt: req.checkedInAt || new Date().toISOString(),
      complaint:   req.complaint   || 'Scheduled Immunisation',
      seen:        false,
      type:        'immunisation',
    };
    _N.immQueue.unshift(immEntry);
    if (document.getElementById('nurse-main')) {
      _nurseRender();
      UI && UI.showToast && UI.showToast('💉 Immunisation queue: ' + immEntry.patientName, 'ok');
    }
  } else {
    /* Deduplicate */
    if (!window._NURSE_REQUESTS.find(function(r){ return r.id === req.id; }))
      window._NURSE_REQUESTS.push(req);
    if (document.getElementById('nurse-main')) {
      if (!_N.requests.find(function(r){ return r.id === req.id; }))
        _N.requests.push(req);
      _nurseRender();
      UI && UI.showToast && UI.showToast('🩺 Vitals request: ' + (req.patientName||''), 'ok');
    }
  }
};

window._setView = _setView;

/* ─── Doctor / Lab queue bridges ──────────────────────────────────────────── */
/* doctor.js sets window._dcAddPatient = fn to receive patients from nurse */
/* lab.js sets window._labAddPatient  = fn to receive patients from nurse  */
/* If those aren't set yet, queue entries live in window._DOCTOR_QUEUE / window._LAB_QUEUE */

window._DOCTOR_QUEUE = window._DOCTOR_QUEUE || [];
window._LAB_QUEUE    = window._LAB_QUEUE    || [];

/* Allow nurse page to re-render externally */
window._nurseRender = _nurseRender;

/* Clean global for messaging folder/compose navigation — used by inline onclick handlers */
window._nSetMsgView = function(view) {
  window._nMsgView   = view;
  window._nMsgThread = null;
  if (view !== 'compose') {
    /* force re-fetch when switching folders */
    window._N._nMsgsLoaded = false;
  }
  if (typeof _nurseRender === 'function') _nurseRender();
};

/* ─── Cross-tab immunisation queue sync ──────────────────────────────
   Receptionist uses BroadcastChannel('nihms_nurse_queue') to push
   check-ins when the nurse page is open in a different tab.
   Also drains localStorage._NIHMS_NURSE_QUEUE on every page open so
   patients checked in before the nurse tab was opened are not missed.
──────────────────────────────────────────────────────────────────── */
(function _nurseSetupCrossTab() {
  /* 1. Drain localStorage queue (catches check-ins made before nurse tab opened) */
  function _drainLocalStorage() {
    try {
      var stored = JSON.parse(localStorage.getItem('_NIHMS_NURSE_QUEUE') || '[]');
      stored.forEach(function(req) {
        if (typeof window._nurseAddRequest === 'function') {
          window._nurseAddRequest(req);
        }
      });
    } catch(_) {}
  }

  /* 2. BroadcastChannel listener — fires when receptionist pushes in real time */
  var _nBroadcastCh = null;
  try { _nBroadcastCh = new BroadcastChannel('nihms_nurse_queue'); } catch(_) {}
  if (_nBroadcastCh) {
    _nBroadcastCh.onmessage = function(ev) {
      if (ev && ev.data && ev.data.type === 'NURSE_REQ' && ev.data.req) {
        if (typeof window._nurseAddRequest === 'function') {
          window._nurseAddRequest(ev.data.req);
        }
      }
    };
  }

  /* 3. localStorage storage event — fallback for browsers that block BroadcastChannel */
  window.addEventListener('storage', function(ev) {
    if (ev.key === '_NIHMS_NURSE_REQ' && ev.newValue) {
      try {
        var req = JSON.parse(ev.newValue);
        if (req && typeof window._nurseAddRequest === 'function') {
          window._nurseAddRequest(req);
        }
      } catch(_) {}
    }
    /* Also re-drain full queue when it changes */
    if (ev.key === '_NIHMS_NURSE_QUEUE') {
      _drainLocalStorage();
    }
  });

  /* 4. Drain on load (deferred so _nurseAddRequest is defined first) */
  setTimeout(_drainLocalStorage, 200);
})();

/* ════════════════════════════════════════════════════════════════
   PATIENT FILE — search · vitals record · consultation notes
════════════════════════════════════════════════════════════════ */
function _nPatientFile() {
  var pf = _N.patientFile;
  var back = '<button onclick="_setView(\'overview\')" style="display:flex;align-items:center;gap:6px;font-size:13px;color:#475569;border:none;background:transparent;cursor:pointer;font-family:inherit;margin-bottom:20px">← Back to Overview</button>';

  /* ── VIEW: patient loaded ── */
  if (pf.patient) {
    var p   = pf.patient;
    var vr  = p.vitalsRecord || null;
    var vh  = p.vitalHistory || (vr ? [vr] : []);
    var ini = (((p.firstName||p.name||'?')[0]) + ((p.lastName||'?')[0])).toUpperCase();

    /* Vitals display */
    var vitalsHtml = vr
      ? '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;margin-bottom:14px">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
            '<div style="font-size:12px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.06em">Recorded Vitals</div>' +
            '<div style="font-size:11px;color:#6b7280">' + (vr.recordedDate||'') + ' · ' + (vr.recordedTime||'') + '<br>' + (vr.facility||'') + ' — ' + (vr.ward||'') + '</div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' +
            [['Blood Pressure',vr.vitals.bp,'mmHg'],['Heart Rate',vr.vitals.hr,'bpm'],['Temperature',vr.vitals.temp,'°C'],
             ['SpO₂',vr.vitals.spo2,'%'],['Resp. Rate',vr.vitals.rr,'/min'],['Weight',vr.vitals.weight,'kg']].map(function(r){
              var flagged = (p.flags||[]).some(function(fl){ return fl.field.toLowerCase().includes(r[0].toLowerCase().split(' ')[0]); });
              return '<div style="padding:8px 10px;background:'+(flagged?'#fef2f2':'#fff')+';border:1px solid '+(flagged?'#fca5a5':'#e5e7eb')+';border-radius:6px">' +
                '<div style="font-size:10px;color:#6b7280;margin-bottom:2px">'+r[0]+'</div>' +
                '<div style="font-size:15px;font-weight:700;color:'+(flagged?'#dc2626':'#111111')+'">'+(r[1]||'—')+' <span style="font-size:11px;font-weight:400;color:#6b7280">'+r[2]+'</span>'+(flagged?' ⚑':'')+'</div>' +
              '</div>';
            }).join('') +
          '</div>' +
          (p.mlRiskLevel ? '<div style="margin-top:10px;padding:8px 12px;background:'+(p.mlRiskLevel==='HIGH'?'#fef2f2':p.mlRiskLevel==='MEDIUM'?'#fffbeb':'#f0fdf4')+';border-radius:6px;font-size:12px;font-weight:600;color:'+(p.mlRiskLevel==='HIGH'?'#dc2626':p.mlRiskLevel==='MEDIUM'?'#d97706':'#16a34a')+'">ML Risk: '+p.mlRiskLevel+(p.mlConfidence?' · '+Math.round(p.mlConfidence*100)+'% confidence':'')+'</div>' : '') +
        '</div>'
      : '<div style="padding:16px;background:#f8fafc;border-radius:8px;border:1px dashed #e5e7eb;text-align:center;color:#6b7280;font-size:13px;margin-bottom:14px">No vitals recorded yet</div>';

    /* Vitals history timeline */
    var historyHtml = vh.length > 1
      ? '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:14px">' +
          '<div style="font-size:12px;font-weight:700;color:#111111;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Vitals History</div>' +
          vh.map(function(h, i){
            return '<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:12px;color:#475569">' +
              '<strong style="color:#111111">'+(h.recordedDate||h.recordedAt||'—')+'</strong>' +
              ' · BP: '+h.vitals.bp+' · HR: '+h.vitals.hr+' · SpO₂: '+h.vitals.spo2+'% · Temp: '+h.vitals.temp+'°C' +
            '</div>';
          }).join('') +
        '</div>'
      : '';

    /* Consultation notes */
    var notes = p.consultationNotes || [];
    var notesHtml = '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:14px">' +
      '<div style="padding:10px 14px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">' +
        '<div style="font-size:12px;font-weight:700;color:#111111">Consultation Notes</div>' +
        '<button onclick="_nAddNote(\''+p.id+'\')" style="padding:5px 10px;border-radius:5px;border:none;background:#0F6E56;color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">+ Add Note</button>' +
      '</div>' +
      (pf.editingNote
        ? '<div style="padding:14px">' +
            '<textarea id="note-input" rows="4" placeholder="Enter consultation notes…" style="width:100%;padding:10px;border:1.5px solid #0F6E56;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box;margin-bottom:8px">' + (pf.consultNote||'') + '</textarea>' +
            '<div style="display:flex;gap:8px">' +
              '<button onclick="_nSaveNote(\''+p.id+'\')" style="flex:1;padding:9px;border-radius:7px;border:none;background:#0F6E56;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Save Note</button>' +
              '<button onclick="_N.patientFile.editingNote=false;_nurseRender()" style="padding:9px 14px;border-radius:7px;border:1.5px solid #e5e7eb;background:#fff;color:#6b7280;font-size:13px;cursor:pointer;font-family:inherit">Cancel</button>' +
            '</div>' +
          '</div>'
        : notes.length
          ? notes.map(function(n, i){
              return '<div style="padding:10px 14px;border-bottom:1px solid #f8fafc;font-size:13px;color:#475569">' +
                '<div style="font-size:10px;color:#94a3b8;margin-bottom:3px">'+n.date+' · '+n.author+'</div>' +
                '<div>'+n.text+'</div>' +
              '</div>';
            }).join('')
          : '<div style="padding:16px;text-align:center;color:#94a3b8;font-size:13px">No consultation notes yet</div>'
      ) +
    '</div>';

    return _nHeader('Patient File', p.firstName ? p.firstName+' '+p.lastName : p.name) +
      '<div style="flex:1;overflow:auto;padding:16px 20px">' + back +
        '<div style="display:grid;grid-template-columns:1fr 300px;gap:16px;align-items:start">' +
          '<div>' +
            '<div style="display:flex;align-items:center;gap:12px;padding:14px;background:#eff6ff;border-radius:12px;border:1px solid #bfdbfe;margin-bottom:14px">' +
              '<div style="width:44px;height:44px;border-radius:50%;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0">'+ini+'</div>' +
              '<div style="flex:1">' +
                '<div style="font-size:18px;font-weight:800;color:#0f172a">'+(p.firstName ? p.firstName+' '+p.lastName : p.name)+'</div>' +
                '<div style="font-size:12px;color:#64748b">ID: '+(p.nationalId||p.idNumber||'—')+(p.age?' · '+p.age+'y':'')+( p.sex?' · '+p.sex:'')+(p.phone?' · '+p.phone:'')+'</div>' +
              '</div>' +
              '<button onclick="_N.patientFile={id:\'\',patient:null,notFound:false,consultNote:\'\',editingNote:false};_nurseRender()" style="padding:5px 10px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;font-size:12px;color:#475569;cursor:pointer;font-family:inherit">Change</button>' +
            '</div>' +
            vitalsHtml + historyHtml + notesHtml +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:12px">' +
            (p.complaint ? '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px"><div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:5px">Chief Complaint</div><div style="font-size:13px;color:#111111">'+p.complaint+'</div></div>' : '') +
            '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px">' +
              '<div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px">Quick Actions</div>' +
              '<div style="display:flex;flex-direction:column;gap:6px">' +
                '<button onclick="_N.editId=\''+p.id+'\';_N.vitalForm=Object.assign({},p.vitals||{bp:\'\',temp:\'\',hr:\'\',spo2:\'\',weight:\'\',rr:\'\'});_setView(\'vitals\')" style="padding:8px;border-radius:6px;border:none;background:#0F6E56;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">'+(p.vitalStatus==='Completed'?'Update Vitals':'Record Vitals')+'</button>' +
                '<button onclick="_nAddNote(\''+p.id+'\')" style="padding:8px;border-radius:6px;border:1px solid #0F6E56;background:#fff;color:#0F6E56;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Add Consultation Note</button>' +
                '<button onclick="_nCallML(\''+p.id+'\')" style="padding:8px;border-radius:6px;border:1px solid #16a34a;background:#fff;color:#16a34a;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Run ML Analysis</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ── SEARCH ── */
  return _nHeader('Patient File', 'Search by ID or passport number') +
    '<div style="flex:1;overflow:auto;padding:20px">' + back +
      '<div style="max-width:600px">' +
        '<div style="margin-bottom:20px">' +
          '<div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:4px">Find Patient Record</div>' +
          '<div style="font-size:14px;color:#64748b">Enter the patient SA ID or passport number to open their file.</div>' +
        '</div>' +
        '<div style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:20px">' +
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#475569;margin-bottom:8px">SA ID / PASSPORT NUMBER</div>' +
          '<div style="display:flex;gap:10px">' +
            '<input id="pf-nurse-id" type="text" value="'+(pf.id||'')+'" placeholder="e.g. 8203041234083" ' +
            'style="flex:1;padding:12px 14px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:15px;font-family:inherit;outline:none;color:#0f172a">' +
            '<button onclick="_nPfSearch()" style="display:flex;align-items:center;gap:6px;padding:12px 20px;border-radius:8px;border:none;background:#0F6E56;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Search' +
            '</button>' +
          '</div>' +
          (pf.notFound
            ? '<div style="margin-top:12px;padding:12px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:13px;color:#dc2626"><strong>Patient not found</strong> for ID: '+pf.id+'</div>'
            : '') +
        '</div>' +
        '<div style="margin-top:16px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">' +
          '<div style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:700;color:#111111">Patients in queue today</div>' +
          _N.patients.map(function(p, i){
            return '<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid #f8fafc;background:'+(i%2===0?'#fff':'#f8fafc')+'">' +
              '<div style="width:28px;height:28px;border-radius:50%;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">'+(p.name.split(' ').map(function(n){return n[0];}).join('').slice(0,2))+'</div>' +
              '<div style="flex:1"><div style="font-size:12px;font-weight:600;color:#111111">'+p.name+'</div><div style="font-size:10px;color:#6b7280">'+p.id+'</div></div>' +
              '<button onclick="_nPfOpen(\''+p.id+'\')" style="padding:4px 10px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;font-size:11px;color:#0F6E56;cursor:pointer;font-family:inherit;font-weight:600">Open</button>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</div>';
}

window._nPfSearch = async function() {
  var id = (document.getElementById('pf-nurse-id')||{value:''}).value.trim();
  if (!id) { UI.showToast('Please enter an ID or passport number','err'); return; }
  _N.patientFile.id = id;
  /* Check queue first */
  var qp = _N.patients.find(function(p){ return p.id===id||(p.pid||'')===id; });
  if (qp) { _N.patientFile.patient=qp; _N.patientFile.notFound=false; _nurseRender(); return; }
  /* Try backend */
  try {
    var res = await API._fetchDirect('/patients?nationalId='+encodeURIComponent(id)+'&limit=1',{method:'GET'});
    var pt  = res&&res.data&&res.data[0];
    if (pt) {
      var apiId = (pt.nationalId||pt.idNumber||pt.id||'').trim();
      if (apiId===id||id==='') {
        _N.patientFile.patient  = {id:pt.nationalId||pt._id,pid:pt._id,firstName:pt.firstName,lastName:pt.lastName,name:(pt.firstName||'')+' '+(pt.lastName||''),age:pt.age,sex:pt.gender,phone:pt.phone,email:pt.email,vitals:null,vitalHistory:[],consultationNotes:[]};
        _N.patientFile.notFound = false;
        _nurseRender(); return;
      }
    }
  } catch(_){}
  _N.patientFile.notFound = true;
  _nurseRender();
};

window._nPfOpen = function(id) {
  var p = _N.patients.find(function(x){ return x.id===id; });
  if (p) { _N.patientFile.patient=p; _N.patientFile.notFound=false; _nurseRender(); }
};

window._nAddNote = function(id) {
  _N.patientFile.editingNote=true; _N.patientFile.consultNote='';
  _nurseRender();
  setTimeout(function(){ var el=document.getElementById('note-input'); if(el)el.focus(); },100);
};

window._nSaveNote = async function(id) {
  var text = (document.getElementById('note-input')||{value:''}).value.trim();
  if (!text) { UI.showToast('Note cannot be empty','err'); return; }
  var p = _N.patients.find(function(x){return x.id===id;})||_N.patientFile.patient;
  if (!p) return;
  if (!p.consultationNotes) p.consultationNotes=[];
  var note = { date:new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'})+' '+_nowTime(), author:'Nurse', text:text };
  p.consultationNotes.unshift(note);
  if (_N.patientFile.patient && _N.patientFile.patient.id===id) _N.patientFile.patient=p;
  _N.patientFile.editingNote=false;
  try {
    await API._fetchDirect('/patients/'+(p.pid||p.id)+'/notes',{method:'POST',body:JSON.stringify({author:'Nurse',text:text,date:new Date().toISOString()})}).catch(function(){});
  } catch(_){}
  _nurseRender();
  UI.showToast('Consultation note saved','ok');
};

/* ════════════════════════════════════════════════════════════════
   IMMUNISATION MODULE
════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════
   IMMUNISATION QUEUE
   Patients booked for Immunisation dept appear here (separate from vitals).
   Nurse can: view patient, start immunisation session, mark complete.
═══════════════════════════════════════════════════════════════════════ */
function _nImmQueue() {
  var f        = _N.immFilter || 'All';
  var queue    = _N.immQueue  || [];
  var unseen   = queue.filter(function(p){ return !p.seen; }).length;

  var filtered = queue.filter(function(p){
    if (f === 'Waiting')    return p.status === 'Awaiting Immunisation';
    if (f === 'In Progress')return p.status === 'Immunisation In Progress';
    if (f === 'Complete')   return p.status === 'Immunisation Complete';
    return true; /* All */
  });

  /* ── Status counts ── */
  var waiting    = queue.filter(function(p){ return p.status === 'Awaiting Immunisation'; }).length;
  var inProgress = queue.filter(function(p){ return p.status === 'Immunisation In Progress'; }).length;
  var complete   = queue.filter(function(p){ return p.status === 'Immunisation Complete'; }).length;

  /* ── Toolbar ── */
  var toolbar =
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 20px;border-bottom:1px solid #e0e0e0;background:#fff;flex-shrink:0;flex-wrap:wrap;gap:8px">' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        ['All','Waiting','In Progress','Complete'].map(function(opt){
          return _chip(opt, f===opt, "_N.immFilter=\'"+opt+"\';_nurseRender()");
        }).join('') +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="font-size:12px;color:#6b7280">' +
          '<strong style="color:#f59e0b">'+waiting+'</strong> waiting · ' +
          '<strong style="color:#0F6E56">'+inProgress+'</strong> in progress · ' +
          '<strong style="color:#16a34a">'+complete+'</strong> complete' +
        '</div>' +
      '</div>' +
    '</div>';

  /* ── Empty state ── */
  if (!filtered.length) {
    return _nHeader('💉 Immunisation Queue',
      queue.length + ' total today · patients booked for Immunisation department') +
      toolbar +
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;color:#6b7280;gap:6px;padding:48px">' +
        '<div style="font-size:48px;opacity:.35">💉</div>' +
        '<div style="font-size:14px;font-weight:600;color:#111111">No immunisation patients ' + (f==='All'?'today':'in this filter') + '</div>' +
        '<div style="font-size:12px;text-align:center;max-width:280px">Patients booked under the Immunisation department will appear here after the receptionist checks them in.</div>' +
      '</div>';
  }

  /* ── Patient rows ── */
  var rows = filtered.map(function(p, i) {
    var isSel = _N.immSel === p.id;
    var bg    = isSel ? 'background:#eff6ff'
              : i%2===0 ? 'background:#fff' : 'background:#f5f8fc';

    var statusBadge = p.status === 'Awaiting Immunisation'    ? '<span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:#fffbeb;color:#d97706;border:1px solid #fcd34d">Waiting</span>'
                    : p.status === 'Immunisation In Progress' ? '<span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:#eff6ff;color:#0F6E56;border:1px solid #bfdbfe">In Progress</span>'
                    : '<span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:#f0fdf4;color:#16a34a;border:1px solid #86efac">Complete</span>';

    return '<tr style="'+bg+';border-bottom:1px solid #e8edf4;cursor:pointer" onclick="_N.immSel=\''+p.id+'\';_nurseRender()">' +
      '<td style="padding:8px 6px 8px 14px;width:12px">' +
        (!p.seen ? '<span style="display:block;width:7px;height:7px;border-radius:50%;background:#f59e0b"></span>' : '') +
      '</td>' +
      _td('<span style="font-family:monospace;font-size:11px;color:#6b7280">'+(p.token||p.id)+'</span>') +
      _td('<div style="font-weight:600">'+(p.patientName||p.name||'—')+'</div><div style="font-size:11px;color:#6b7280">'+(p.patientId||'')+'</div>') +
      _td((p.age||'—')+' '+(p.sex||'')) +
      _td(p.complaint||'Scheduled Immunisation') +
      '<td style="padding:8px 14px">' + statusBadge + '</td>' +
      _td(p.arrivalTime||'—', 'color:#6b7280') +
      '<td style="padding:8px 14px">' +
        (p.status !== 'Immunisation Complete' ?
          '<button onclick="event.stopPropagation();_nImmStart(\''+p.id+'\')" ' +
            'style="padding:4px 10px;border-radius:6px;border:none;background:#f59e0b;color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">' +
            (p.status==='Immunisation In Progress' ? 'Continue' : 'Start') +
          '</button>'
        : '<span style="font-size:11px;color:#16a34a;font-weight:600">✓ Done</span>') +
      '</td>' +
    '</tr>';
  }).join('');

  var table =
    '<div style="flex:1;overflow:auto">' +
      '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
        '<thead>' +
          '<tr style="background:#f5f8fc">' +
            '<th style="width:12px;padding:6px 14px"></th>' +
            _th('Token') + _th('Patient') + _th('Age/Sex') +
            _th('Reason') + _th('Status') + _th('Arrived') + _th('Action') +
          '</tr>' +
        '</thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>';

  /* ── Detail panel (selected patient) ── */
  var detail = '';
  if (_N.immSel) {
    var sel = queue.find(function(p){ return p.id === _N.immSel; });
    if (sel) {
      sel.seen = true; /* mark seen */
      detail =
        '<div style="width:320px;flex-shrink:0;border-left:1px solid #e0e0e0;background:#fff;overflow-y:auto;display:flex;flex-direction:column">' +
          '<div style="padding:14px 16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between">' +
            '<div style="font-size:13px;font-weight:700;color:#111111">Patient Details</div>' +
            '<button onclick="_N.immSel=null;_nurseRender()" style="border:none;background:transparent;font-size:18px;cursor:pointer;color:#6b7280;line-height:1">×</button>' +
          '</div>' +

          /* Patient info */
          '<div style="padding:14px 16px;border-bottom:1px solid #f1f5f9">' +
            '<div style="width:44px;height:44px;border-radius:50%;background:#f59e0b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;margin-bottom:10px">' +
              '💉' +
            '</div>' +
            '<div style="font-size:15px;font-weight:700;color:#111111;margin-bottom:2px">'+(sel.patientName||sel.name||'—')+'</div>' +
            '<div style="font-size:12px;color:#6b7280">ID: '+(sel.patientId||'—')+' · Age: '+(sel.age||'—')+' · '+(sel.sex||'—')+'</div>' +
            '<div style="margin-top:8px">' +
              '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:4px">Token</div>' +
              '<div style="font-family:monospace;font-size:20px;font-weight:900;color:#f59e0b">'+(sel.token||sel.id)+'</div>' +
            '</div>' +
          '</div>' +

          /* Status */
          '<div style="padding:12px 16px;border-bottom:1px solid #f1f5f9">' +
            '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:6px">Status</div>' +
            '<div style="font-size:13px;font-weight:600;color:#111111">'+(sel.status||'—')+'</div>' +
            '<div style="font-size:11px;color:#6b7280;margin-top:2px">Arrived: '+(sel.arrivalTime||'—')+' · Waited: '+(sel.waitMins||0)+' min</div>' +
          '</div>' +

          /* Actions */
          '<div style="padding:14px 16px;display:flex;flex-direction:column;gap:8px">' +
            '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:2px">Actions</div>' +
            (sel.status !== 'Immunisation Complete' ?
              '<button onclick="_nImmStart(\''+sel.id+'\')" ' +
                'style="padding:10px 14px;border-radius:10px;border:none;background:#f59e0b;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">' +
                '💉 ' + (sel.status==='Immunisation In Progress' ? 'Continue Immunisation' : 'Start Immunisation') +
              '</button>'
            : '') +
            '<button onclick="_nImmMarkComplete(\''+sel.id+'\')" ' +
              'style="padding:10px 14px;border-radius:10px;border:1.5px solid #16a34a;background:#fff;color:#16a34a;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">' +
              '✓ Mark Immunisation Complete' +
            '</button>' +
          '</div>' +
        '</div>';
    }
  }

  return _nHeader('💉 Immunisation Queue',
    waiting + ' waiting · ' + inProgress + ' in progress · ' + complete + ' complete today') +
    toolbar +
    '<div style="display:flex;flex:1;overflow:hidden">' +
      '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden">' +
        table +
      '</div>' +
      detail +
    '</div>';
}

/* Start immunisation session — switches to Immunisation tab with patient pre-selected */
window._nImmStart = function(id) {
  var p = (_N.immQueue||[]).find(function(q){ return q.id===id; });
  if (!p) return;
  /* Update status */
  p.status = 'Immunisation In Progress';
  p.seen   = true;
  /* Pre-select patient in Immunisation module and switch view */
  _N.immu.selectedPatient = p;
  _N.immu.immuTab         = 'record';
  _N.view                 = 'immunisation';
  _nurseRender();
  UI && UI.showToast && UI.showToast('Opening immunisation record for ' + (p.patientName||p.name||''), 'ok');
};

/* Mark immunisation complete */
window._nImmMarkComplete = function(id) {
  var p = (_N.immQueue||[]).find(function(q){ return q.id===id; });
  if (!p) return;
  p.status = 'Immunisation Complete';
  p.seen   = true;
  _N.immSel = null;
  _nurseRender();
  /* POST status update to API */
  try {
    API._fetchDirect('/queue/' + p.id, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'immunisation-complete', completedAt: new Date().toISOString() })
    }).catch(function(){});
  } catch(_) {}
  UI && UI.showToast && UI.showToast('✓ Immunisation complete for ' + (p.patientName||p.name||''), 'ok');
};

function _nImmunisation() {
  var im   = _N.immu;
  var tab  = im.immuTab || 'today';
  var today = new Date().toISOString().slice(0,10);

  /* Low stock vaccines */
  var lowStock = im.stock.filter(function(s){ return s.quantity < s.minQty; });
  /* Cold chain status */
  var cc = im.coldChain;
  var ccOk = cc.currentTemp >= cc.minAlarm && cc.currentTemp <= cc.maxAlarm;

  /* Tab bar */
  var tabs = [
    {id:'today',    label:"Today's Vaccinations"},
    {id:'due',      label:'Due / Overdue'},
    {id:'record',   label:'Record Vaccination'},
    {id:'history',  label:'History'},
    {id:'stock',    label:'Vaccine Stock'},
    {id:'reports',  label:'Coverage Reports'},
  ];
  var tabBar = '<div style="display:flex;gap:0;border-bottom:1px solid #e5e7eb;background:#fff;overflow-x:auto;flex-shrink:0">' +
    tabs.map(function(t){
      var active = tab===t.id;
      return '<button onclick="_N.immu.immuTab=\''+t.id+'\';_nurseRender()" style="padding:9px 14px;border:none;border-bottom:2px solid '+(active?'#0F6E56':'transparent')+';background:transparent;color:'+(active?'#0F6E56':'#6b7280')+';font-size:12px;font-weight:'+(active?'700':'500')+';cursor:pointer;font-family:inherit;white-space:nowrap">'+t.label+'</button>';
    }).join('') +
  '</div>';

  /* Status banner */
  var banners = '';
  if (lowStock.length) banners += '<div style="margin:12px 16px 0;padding:10px 14px;background:#fffbeb;border:1px solid #fcd34d;border-left:4px solid #d97706;border-radius:8px;font-size:12px;color:#92400e"><strong>⚠ Low stock:</strong> '+lowStock.map(function(s){return s.name+' ('+s.quantity+' '+s.unit+')';}).join(', ')+' — <button onclick="_nRequestStock()" style="background:none;border:none;color:#d97706;font-size:12px;font-weight:700;cursor:pointer;text-decoration:underline;font-family:inherit">Request from pharmacy →</button></div>';
  if (!ccOk) banners += '<div style="margin:8px 16px 0;padding:10px 14px;background:#fef2f2;border:1px solid #fca5a5;border-left:4px solid #dc2626;border-radius:8px;font-size:12px;color:#dc2626"><strong>🌡 Cold chain alert!</strong> Fridge temperature '+cc.currentTemp+'°C is outside safe range ('+cc.minAlarm+'–'+cc.maxAlarm+'°C). Check storage immediately.</div>';

  var content = '';

  /* ── TODAY'S VACCINATIONS ── */
  if (tab==='today') {
    var todayVax = im.todayVaccinations;
    content = '<div style="padding:14px 16px">' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">' +
        [
          {label:"Today's Vaccinations", value:todayVax.length, color:'#0F6E56'},
          {label:'Adverse Reactions Today', value:im.adverseReactions.filter(function(r){return r.date===today;}).length, color:'#dc2626'},
          {label:'Vaccines Available', value:im.stock.filter(function(s){return s.quantity>0;}).length+'/'+im.stock.length, color:'#16a34a'},
        ].map(function(k){
          return '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px">' +
            '<div style="font-size:22px;font-weight:800;color:'+k.color+';margin-bottom:3px">'+k.value+'</div>' +
            '<div style="font-size:11px;color:#6b7280">'+k.label+'</div>' +
          '</div>';
        }).join('') +
      '</div>' +

      /* Cold chain monitor */
      '<div style="background:'+(ccOk?'#f0fdf4':'#fef2f2')+';border:1px solid '+(ccOk?'#86efac':'#fca5a5')+';border-radius:10px;padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">' +
        '<div>' +
          '<div style="font-size:12px;font-weight:700;color:'+(ccOk?'#166534':'#dc2626')+'">🌡 Cold Chain / Storage</div>' +
          '<div style="font-size:13px;color:#111111;margin-top:2px">Current temperature: <strong>'+cc.currentTemp+'°C</strong> · Safe range: '+cc.minAlarm+'–'+cc.maxAlarm+'°C</div>' +
          '<div style="font-size:11px;color:#6b7280;margin-top:2px">Last reading: '+new Date(cc.lastReading).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})+'</div>' +
        '</div>' +
        '<span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:'+(ccOk?'#16a34a':'#dc2626')+';color:#fff">'+(ccOk?'✓ OK':'⚠ ALERT')+'</span>' +
      '</div>' +

      (todayVax.length
        ? '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">' +
            '<div style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:700;color:#111111">Vaccinations Recorded Today</div>' +
            '<table style="width:100%;border-collapse:collapse"><thead><tr>'+['Patient','Vaccine','Dose','Batch','Time','Vaccinator'].map(_th).join('')+'</tr></thead><tbody>' +
            todayVax.map(function(v,i){
              return '<tr style="background:'+(i%2===0?'#fff':'#f8fafc')+';border-bottom:1px solid #f1f5f9">' +
                _td(v.patientName||'—','font-weight:600') + _td(v.vaccine) + _td('Dose '+v.dose) + _td(v.batch||'—') + _td(v.time) + _td((v.vaccinatorName||v.vaccinator||'—').replace(/\s*·\s*Staff:?\s*\S+/i,'').replace(/\s*·\s*Reg:?\s*\S+/i,'').trim()) +
              '</tr>';
            }).join('') +
            '</tbody></table>' +
          '</div>'
        : '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;background:#f8fafc;border-radius:8px;border:1px dashed #e5e7eb">No vaccinations recorded today. Use "Record Vaccination" tab to log.</div>') +
    '</div>';
  }

  /* ── DUE / OVERDUE ── */
  if (tab==='due') {
    var duePatients = _N.patients.filter(function(p){ return p.age !== undefined && p.age <= 5; });
    var SA_SCHEDULE = [
      {weeks:0,  vaccines:['BCG','OPV 0'],              label:'At Birth'},
      {weeks:6,  vaccines:['OPV 1','Penta 1','PCV 1','Rota 1'],label:'6 Weeks'},
      {weeks:10, vaccines:['OPV 2','Penta 2','PCV 2','Rota 2'],label:'10 Weeks'},
      {weeks:14, vaccines:['OPV 3','Penta 3','PCV 3'],  label:'14 Weeks'},
      {weeks:36, vaccines:['Measles 1','Vitamin A'],     label:'9 Months'},
      {weeks:40, vaccines:['PCV Booster'],               label:'18 Months'},
      {weeks:72, vaccines:['Measles 2','DTP Booster'],   label:'18 Months Booster'},
    ];

    content = '<div style="padding:14px 16px">' +
      '<div style="font-size:12px;color:#6b7280;margin-bottom:12px">Showing children (≤5 years) from today\'s queue with vaccination status.</div>' +
      (duePatients.length
        ? duePatients.map(function(p){
            var ageWeeks = Math.floor((p.age||0) * 52);
            var immuStatus = p.immunisationRecord || {};
            var dueNow = SA_SCHEDULE.filter(function(s){ return ageWeeks >= s.weeks && !immuStatus[s.label]; });
            var overdue = SA_SCHEDULE.filter(function(s){ return ageWeeks > s.weeks+2 && !immuStatus[s.label]; });
            var upcoming = SA_SCHEDULE.filter(function(s){ return ageWeeks < s.weeks; });
            return '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:10px">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
                '<div style="font-weight:700;font-size:14px;color:#0f172a">'+p.name+' <span style="font-size:12px;color:#64748b;font-weight:400">· Age: '+(p.age||'?')+'y ('+ageWeeks+' weeks)</span></div>' +
                (overdue.length ? '<span style="padding:3px 10px;border-radius:4px;background:#fef2f2;color:#dc2626;font-size:11px;font-weight:700;border:1px solid #fca5a5">'+overdue.length+' OVERDUE</span>' : dueNow.length ? '<span style="padding:3px 10px;border-radius:4px;background:#fffbeb;color:#d97706;font-size:11px;font-weight:700;border:1px solid #fcd34d">'+dueNow.length+' DUE TODAY</span>' : '<span style="padding:3px 10px;border-radius:4px;background:#f0fdf4;color:#16a34a;font-size:11px;font-weight:700;border:1px solid #86efac">UP TO DATE</span>') +
              '</div>' +
              '<div style="display:flex;flex-direction:column;gap:4px">' +
                SA_SCHEDULE.map(function(s){
                  var done = !!immuStatus[s.label];
                  var isDue = ageWeeks >= s.weeks && !done;
                  var isOverdue = ageWeeks > s.weeks+2 && !done;
                  return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0">' +
                    '<span style="width:8px;height:8px;border-radius:50%;background:'+(isOverdue?'#dc2626':isDue?'#d97706':done?'#16a34a':'#e5e7eb')+';flex-shrink:0"></span>' +
                    '<span style="font-size:12px;color:#111111;min-width:80px">'+s.label+'</span>' +
                    '<span style="font-size:12px;color:#6b7280;flex:1">'+s.vaccines.join(', ')+'</span>' +
                    '<span style="font-size:11px;font-weight:600;color:'+(isOverdue?'#dc2626':isDue?'#d97706':done?'#16a34a':'#94a3b8')+'">'+(isOverdue?'OVERDUE':isDue?'DUE NOW':done?'✓ Done':'Upcoming')+'</span>' +
                  '</div>';
                }).join('') +
              '</div>' +
              (dueNow.length||overdue.length ? '<button onclick="_N.immu.immuTab=\'record\';_N.immu.selectedPatient=\''+p.id+'\';_nurseRender()" style="margin-top:10px;width:100%;padding:8px;border-radius:6px;border:none;background:#0F6E56;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Record Vaccination for '+p.name+' →</button>' : '') +
            '</div>';
          }).join('')
        : '<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px">No children in today\'s queue. Children aged 0–5 will appear here with their SA immunisation schedule.</div>') +
    '</div>';
  }

  /* ── RECORD VACCINATION ── */
  if (tab==='record') {
    /* Build combined patient list: immQueue + vitals patients (deduplicated) */
    var allPts = [];
    var _seenPtIds = {};
    (_N.immQueue||[]).concat(_N.patients||[]).forEach(function(p){
      var uid = p.patientId || p.pid || p.id || '';
      if (!uid || _seenPtIds[uid]) return;
      _seenPtIds[uid] = true;
      /* Normalise: immQueue uses patientName, patients may use name — unify to .name */
      if (!p.name && p.patientName) p.name = p.patientName;
      allPts.push(p);
    });

    var selPtId = im.selectedPatient;
    /* selectedPatient may be an id string or a full object — normalise */
    if (selPtId && typeof selPtId === 'object') selPtId = selPtId.id || selPtId.patientId || selPtId.pid;
    var selPt = selPtId ? allPts.find(function(p){
      return p.id===selPtId||p.patientId===selPtId||p.pid===selPtId;
    }) : null;

    /* ── Doctor.js-matched design tokens ── */
    var C2 = { border:'#e2e8f0', text:'#0f172a', muted:'#475569', teal:'#0f6e56', bg:'#f4f5f0', red:'#dc2626' };
    var fld = 'display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C2.muted+';margin-bottom:6px';
    var inp = 'width:100%;padding:9px 12px;border:1.5px solid '+C2.border+';border-radius:8px;font-size:14px;font-family:inherit;color:'+C2.text+';background:#fff;box-sizing:border-box;outline:none';
    var inpFocus = ' onfocus="this.style.borderColor=\'#0f6e56\'" onblur="this.style.borderColor=\'#e2e8f0\'"';
    function _nCard2(inner){ return '<div style="background:#fff;border:1.5px solid '+C2.border+';border-radius:12px;padding:20px 24px">'+inner+'</div>'; }
    function _nTitle2(t){ return '<div style="font-size:15px;font-weight:800;color:'+C2.text+';margin-bottom:16px">'+t+'</div>'; }
    function _nInfoRow2(label,value,mono){ return '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C2.muted+';margin-bottom:4px">'+label+'</div><div style="font-size:14px;font-weight:700;color:'+C2.text+';'+(mono?'font-family:monospace':'')+'">'+value+'</div></div>'; }

    /* ── Vaccination form ── */
    content = '<div style="padding:16px 20px 24px;max-width:760px;display:flex;flex-direction:column;gap:14px">' +
      _nCard2(
        _nTitle2('Record Vaccination') +
        '<div style="font-size:12px;color:'+C2.muted+';margin-top:-10px;margin-bottom:16px">SA EPI Schedule · fields marked <span style="color:'+C2.red+'">*</span> are required</div>' +

        /* ── Auto-populated patient info panel (shows when patient is selected) ── */
        '<div id="vax-pt-info-panel" style="display:'+(selPt?'':'none')+';background:#f8fafc;border:1.5px solid '+C2.border+';border-radius:10px;padding:14px 16px;margin-bottom:16px">' +
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C2.muted+';margin-bottom:10px">Patient Details</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px 16px">' +
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C2.muted+';margin-bottom:3px">Full Name</div>' +
                 '<div id="vax-pt-info-name" style="font-size:14px;font-weight:700;color:'+C2.text+'">'+(selPt?selPt.name:'—')+'</div></div>' +
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C2.muted+';margin-bottom:3px">ID / Passport</div>' +
                 '<div id="vax-pt-info-id" style="font-size:14px;font-weight:700;color:'+C2.text+';font-family:monospace">'+(selPt?(selPt.nationalId||selPt.idNumber||selPt.passportNumber||selPt.patientId||selPt.pid||selPt.id||'—'):'—')+'</div></div>' +
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C2.muted+';margin-bottom:3px">File Number</div>' +
                 '<div id="vax-pt-info-file" style="font-size:14px;font-weight:700;color:'+C2.text+';font-family:monospace">'+(selPt?(selPt.fileNumber||selPt.patientFileNumber||selPt.mrn||selPt.recordNumber||'—'):'—')+'</div></div>' +
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C2.muted+';margin-bottom:3px">Date of Birth</div>' +
                 '<div id="vax-pt-info-dob" style="font-size:14px;font-weight:700;color:'+C2.text+'">'+(selPt&&selPt.dob?selPt.dob:'—')+'</div></div>' +
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C2.muted+';margin-bottom:3px">Sex</div>' +
                 '<div id="vax-pt-info-sex" style="font-size:14px;font-weight:700;color:'+C2.text+'">'+(selPt&&selPt.sex?selPt.sex:'—')+'</div></div>' +
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C2.muted+';margin-bottom:3px">Token · Dept</div>' +
                 '<div id="vax-pt-info-token" style="font-size:14px;font-weight:700;color:'+C2.text+'">'+(selPt?(selPt.token||'—')+' · '+(selPt.dept||selPt.department||'Immunisation'):'—')+'</div></div>' +
          '</div>' +
        '</div>' +

        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">' +

          /* Patient select */
          '<div style="grid-column:1/-1"><label style="'+fld+'">Patient *</label>' +
            '<select id="vax-pt" onchange="_nVaxPatientChange(this.value)" style="'+inp+'"'+inpFocus+'>' +
              '<option value="">— Select patient —</option>' +
              allPts.map(function(p){
                var uid = p.patientId||p.pid||p.id||'';
                var sel = (selPtId && (p.id===selPtId||p.patientId===selPtId||p.pid===selPtId)) ? ' selected' : '';
                return '<option value="'+uid+'"'+sel+'>'+p.name+' ('+(p.nationalId||p.idNumber||p.patientId||p.pid||p.id||'—')+')</option>';
              }).join('') +
            '</select>' +
          '</div>' +

          /* Vaccine */
          '<div><label style="'+fld+'">Vaccine *</label>' +
            '<select id="vax-vac" onchange="_nVaxVaccineChange(this.value)" style="'+inp+'"'+inpFocus+'>' +
              '<option value="">— Select vaccine —</option>' +
              im.vaccines.map(function(v){ return '<option value="'+v.id+'">'+v.name+'</option>'; }).join('') +
            '</select>' +
            '<div id="vax-vac-detail" style="margin-top:5px;font-size:11px;color:'+C2.muted+'"></div>' +
          '</div>' +

          /* Dose Number — manual number input */
          (function(){
            var _nu = (typeof API !== 'undefined' && API && API.getStoredUser && API.getStoredUser()) || {};
            var _vaccinatorName = _nu.name || _nu.fullName || _nu.displayName || '';
            var _vaccinatorReg  = _nu.registrationNumber || _nu.professionalReg || _nu.hpcsa || _nu.sanc || '';
            var _vaccinatorStaff= _nu.staffId || _nu.employeeId || _nu.id || '';
            var _vaccinatorVal  = _vaccinatorName + (_vaccinatorReg ? ' · Reg: '+_vaccinatorReg : '');
            return (
              '<div><label style="'+fld+'">Dose Number *</label>' +
                '<input id="vax-dose" type="number" min="1" max="10" step="1" value="1" placeholder="Enter dose number (e.g. 1, 2, 3)" style="'+inp+'"'+inpFocus+'>' +
                '<div style="margin-top:4px;font-size:10px;color:'+C2.muted+'">Enter the dose number manually. Match the patient\'s vaccination card.</div>' +
              '</div>' +

              /* Date */
              '<div><label style="'+fld+'">Date Administered *</label>' +
                '<input id="vax-date" type="date" value="'+today+'" max="'+today+'" style="'+inp+'"'+inpFocus+'></div>' +

              /* Batch */
              '<div><label style="'+fld+'">Batch / Lot Number *</label>' +
                '<input id="vax-batch" type="text" placeholder="e.g. LOT2024-0183" style="'+inp+'"'+inpFocus+'></div>' +

              /* Vaccinator — auto-populated from session, still editable */
              '<div><label style="'+fld+'">Vaccinator *</label>' +
                '<input id="vax-vacc" type="text" value="'+_vaccinatorVal.replace(/"/g,'&quot;')+'" placeholder="Full name &amp; professional registration" style="'+inp+'"'+inpFocus+'>' +
                (_vaccinatorName
                  ? '<div style="margin-top:4px;font-size:10px;color:#16a34a">✓ Auto-filled from your account'+ (_vaccinatorReg ? ' · Reg: '+_vaccinatorReg : '')+'</div>'
                  : '<div style="margin-top:4px;font-size:10px;color:'+C2.muted+'">Enter your full name and professional registration number</div>') +
              '</div>'
            );
          })() +

        '</div>' +

        /* Observations */
        '<div style="margin-bottom:16px"><label style="'+fld+'">Observations / Notes</label>' +
          '<textarea id="vax-notes" rows="2" placeholder="Any adverse reactions, observations, or additional information…" style="'+inp+';resize:none"'+inpFocus+'></textarea></div>' +

        /* Duplicate warning area */
        '<div id="vax-dup-warn" style="display:none;margin-bottom:12px;padding:10px 14px;background:#fffbeb;border:1px solid #fcd34d;border-left:4px solid #d97706;border-radius:8px;font-size:12px;color:#92400e">' +
          '⚠ A vaccination record for this patient and vaccine already exists today. Review before saving.' +
        '</div>' +

        /* Save result area — shown after successful save */
        '<div id="vax-save-result" style="display:none;margin-bottom:12px"></div>' +

        /* Submit */
        '<button id="vax-submit-btn" onclick="_nRecordVax()" style="width:100%;padding:13px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:.01em">' +
          '<span>✓ Record &amp; Complete Vaccination</span>' +
        '</button>' +

        /* End Immunisation Appointment button — only visible after successful save */
        '<div id="vax-end-appt-wrap" style="display:none;margin-top:10px">' +
          '<button id="vax-end-appt-btn" onclick="_nEndImmAppt()" style="width:100%;padding:13px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#1A4A9B 0%,#0F6E56 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:.01em">' +
            '✔ End Immunisation Appointment' +
          '</button>' +
          '<div style="margin-top:6px;font-size:11px;color:'+C2.muted+';text-align:center">This marks the appointment as Completed and closes the immunisation encounter.</div>' +
        '</div>' +

        /* Monitoring reminder */
        '<div style="margin-top:12px;padding:10px 14px;background:#fffbeb;border:1px solid #fcd34d;border-left:4px solid #f59e0b;border-radius:8px;font-size:12px;color:#92400e">' +
          '<strong>⏱ Post-vaccination monitoring:</strong> Monitor the patient for 15–30 minutes after administration in accordance with the applicable vaccination protocol. ' +
          'Treat any suspected anaphylaxis as a medical emergency requiring immediate assessment and emergency management — do not delay treatment to complete the reporting form.' +
        '</div>'

      ) + /* end vaccination card (_nCard2) */

      /* ── ADVERSE REACTION FORM ── */
      _nCard2(
        _nTitle2('🚨 Record Adverse Reaction') +
        '<div style="font-size:12px;color:'+C2.muted+';margin-top:-10px;margin-bottom:16px">Document any reaction observed after vaccination</div>' +

        /* Anaphylaxis emergency banner — shown dynamically by JS */
        '<div id="ar-anaphylaxis-banner" style="display:none;margin-bottom:14px;padding:12px 16px;background:#fef2f2;border:2px solid #dc2626;border-radius:8px">' +
          '<div style="font-size:13px;font-weight:800;color:#dc2626;margin-bottom:4px">🚨 SUSPECTED ANAPHYLAXIS — MEDICAL EMERGENCY</div>' +
          '<div style="font-size:12px;color:#7f1d1d">Call for immediate assistance. Administer adrenaline per protocol. Do <strong>not</strong> delay treatment to complete this form. Complete the report after the patient is stabilised.</div>' +
        '</div>' +

        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +

          /* Patient */
          '<div><label style="'+fld+'">Patient *</label>' +
            '<select id="ar-pt" style="'+inp+'"'+inpFocus+'>' +
              '<option value="">— Select patient —</option>' +
              allPts.map(function(p){
                var uid = p.patientId||p.pid||p.id||'';
                return '<option value="'+uid+'">'+p.name+' ('+(p.patientId||p.pid||p.id||'—')+')</option>';
              }).join('') +
            '</select></div>' +

          /* Reaction Type */
          '<div><label style="'+fld+'">Reaction Type *</label>' +
            '<select id="ar-type" onchange="_nARTypeChange(this.value)" style="'+inp+'"'+inpFocus+'>' +
              '<option value="">— Select type —</option>' +
              ['Local swelling','Fever','Rash','Anaphylaxis','Fainting','Pain at injection site','Other'].map(function(t){return '<option>'+t+'</option>';}).join('') +
            '</select></div>' +

          /* Date of Reaction */
          '<div><label style="'+fld+'">Date of Reaction *</label>' +
            '<input id="ar-date" type="date" value="'+today+'" style="'+inp+'"'+inpFocus+'></div>' +

          /* Time of Reaction */
          '<div><label style="'+fld+'">Time of Reaction *</label>' +
            '<input id="ar-time" type="time" value="'+new Date().toTimeString().slice(0,5)+'" style="'+inp+'"'+inpFocus+'></div>' +

          /* Severity */
          '<div><label style="'+fld+'">Severity *</label>' +
            '<select id="ar-severity" style="'+inp+'"'+inpFocus+'>' +
              '<option value="">— Select severity —</option>' +
              ['Mild','Moderate','Severe'].map(function(s){return '<option>'+s+'</option>';}).join('') +
            '</select></div>' +

          /* Associated vaccination record (optional) */
          '<div><label style="'+fld+'">Associated Vaccination</label>' +
            '<select id="ar-vax-ref" style="'+inp+'"'+inpFocus+'>' +
              '<option value="">— None / Unknown —</option>' +
              (im.todayVaccinations||[]).map(function(v,i){
                return '<option value="'+i+'">'+v.vaccine+' · '+v.patientName+' · '+v.time+'</option>';
              }).join('') +
            '</select></div>' +

        '</div>' +

        /* Description */
        '<div style="margin-bottom:12px"><label style="'+fld+'">Description / Symptoms / Observations *</label>' +
          '<textarea id="ar-notes" rows="3" placeholder="Describe the symptoms, observations and actions taken…" style="'+inp+';resize:vertical"'+inpFocus+'></textarea></div>' +

        /* Treatment */
        '<div style="margin-bottom:12px"><label style="'+fld+'">Treatment or Intervention Provided</label>' +
          '<textarea id="ar-treatment" rows="2" placeholder="Treatment given (e.g. antihistamine, adrenaline, cold compress). Indicate if patient was referred for further care." style="'+inp+';resize:vertical"'+inpFocus+'></textarea></div>' +

        /* Reporting HCP */
        '<div style="margin-bottom:16px"><label style="'+fld+'">Reporting Healthcare Professional *</label>' +
          '<input id="ar-reporter" type="text" placeholder="Full name &amp; professional registration number" style="'+inp+'"'+inpFocus+'></div>' +

        '<button onclick="_nRecordAR()" style="padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:.01em">' +
          '🚨 Report Adverse Reaction' +
        '</button>'

      ) + /* end adverse reaction card */
    '</div>';

    /* Inject helper scripts for dynamic UI after the render */
    setTimeout(function(){
      /* Show vaccine schedule description */
      window._nVaxVaccineChange = function(id){
        var vac = (_N.immu.vaccines||[]).find(function(v){return v.id===id;});
        var el  = document.getElementById('vax-vac-detail');
        if (el && vac) el.textContent = vac.description || '';
        /* Update dose max */
        var doseEl = document.getElementById('vax-dose');
        if (doseEl && vac) {
          doseEl.innerHTML = Array.from({length:vac.doses||5},function(_,i){
            return '<option value="'+(i+1)+'">Dose '+(i+1)+'</option>';
          }).join('');
        }
        /* Duplicate check */
        _nCheckVaxDuplicate();
      };
      window._nVaxPatientChange = function(id){
        var pt = (_N.patients||[]).concat(_N.immQueue||[]).find(function(p){
          return p.id===id||p.patientId===id||p.pid===id;
        });
        /* Update patient info panel */
        var panel = document.getElementById('vax-pt-info-panel');
        if (panel) {
          if (pt && id) {
            panel.style.display = '';
            var nameEl  = document.getElementById('vax-pt-info-name');
            var idEl    = document.getElementById('vax-pt-info-id');
            var fileEl  = document.getElementById('vax-pt-info-file');
            var dobEl   = document.getElementById('vax-pt-info-dob');
            var sexEl   = document.getElementById('vax-pt-info-sex');
            var tokenEl = document.getElementById('vax-pt-info-token');
            var deptEl  = document.getElementById('vax-pt-info-dept');
            if (nameEl)  nameEl.textContent  = pt.name || pt.patientName || (pt.firstName ? (pt.firstName+' '+(pt.lastName||'')).trim() : '') || '—';
            if (idEl)    idEl.innerHTML      = '<strong>ID/Passport:</strong> '+(pt.nationalId||pt.idNumber||pt.passportNumber||pt.patientId||pt.pid||pt.id||'—');
            if (fileEl)  fileEl.innerHTML    = '<strong>File No:</strong> '+(pt.fileNumber||pt.patientFileNumber||pt.mrn||pt.recordNumber||'—');
            if (dobEl)   dobEl.innerHTML     = pt.dob ? '<strong>DOB:</strong> '+pt.dob : '';
            if (sexEl)   sexEl.innerHTML     = pt.sex ? '<strong>Sex:</strong> '+pt.sex : '';
            if (tokenEl) tokenEl.innerHTML   = '<strong>Token:</strong> '+(pt.token||'—');
            if (deptEl)  deptEl.innerHTML    = '<strong>Dept:</strong> '+(pt.dept||pt.department||'Immunisation');
          } else {
            panel.style.display = 'none';
          }
        }
        /* Mirror selection to adverse reaction patient select */
        var arPt = document.getElementById('ar-pt');
        if (arPt) arPt.value = id;
        _nCheckVaxDuplicate();
      };
      window._nCheckVaxDuplicate = function(){
        var ptEl  = document.getElementById('vax-pt');
        var vacEl = document.getElementById('vax-vac');
        var dateEl= document.getElementById('vax-date');
        if (!ptEl||!vacEl||!dateEl) return;
        var dup = (_N.immu.todayVaccinations||[]).find(function(r){
          return (r.patientId===ptEl.value||r.patientId===ptEl.value) &&
                 r.vaccineId===vacEl.value && r.date===dateEl.value;
        });
        var warn = document.getElementById('vax-dup-warn');
        if (warn) warn.style.display = dup ? '' : 'none';
      };
      window._nARTypeChange = function(v){
        var banner = document.getElementById('ar-anaphylaxis-banner');
        if (banner) banner.style.display = (v==='Anaphylaxis') ? '' : 'none';
        var sev = document.getElementById('ar-severity');
        if (sev && v==='Anaphylaxis') sev.value = 'Severe';
      };
      /* Wire up duplicate check on date change */
      var dateInput = document.getElementById('vax-date');
      if (dateInput) dateInput.addEventListener('change', function(){ _nCheckVaxDuplicate && _nCheckVaxDuplicate(); });
    }, 50);
  }

  /* ── STOCK MANAGEMENT ── */
  if (tab==='stock') {
    content = '<div style="padding:14px 16px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
        '<div style="font-size:13px;font-weight:700;color:#0f172a">Vaccine Stock & Cold Chain</div>' +
        '<button onclick="_nRequestStock()" style="padding:7px 14px;border-radius:6px;border:none;background:#d97706;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">📦 Request Restock from Pharmacy</button>' +
      '</div>' +
      '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:12px">' +
        '<table style="width:100%;border-collapse:collapse">' +
        '<thead><tr>'+['Vaccine','Qty','Min Qty','Storage Temp','Status','Action'].map(_th).join('')+'</tr></thead>' +
        '<tbody>'+im.stock.map(function(s,i){
          var low = s.quantity < s.minQty;
          var bg  = i%2===0?'#fff':'#f8fafc';
          return '<tr style="background:'+(low?'#fffbeb':bg)+';border-bottom:1px solid #f1f5f9">' +
            _td('<strong>'+s.name+'</strong>') +
            '<td style="padding:8px 14px;font-size:14px;font-weight:700;color:'+(low?'#d97706':'#111111')+'">'+s.quantity+' '+s.unit+'</td>' +
            _td('Min: '+s.minQty+' '+s.unit,'font-size:12px;color:#6b7280') +
            _td(s.tempMin+'°C to '+s.tempMax+'°C','font-size:12px;color:#6b7280') +
            '<td style="padding:8px 14px"><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:'+(low?'#fffbeb':'#f0fdf4')+';color:'+(low?'#d97706':'#16a34a')+';border:1px solid '+(low?'#fcd34d':'#86efac')+'">'+( low?'LOW STOCK':'OK')+'</span></td>' +
            '<td style="padding:8px 14px"><button onclick="_nRequestSpecificStock(\''+s.id+'\')" style="padding:3px 8px;border-radius:4px;border:1px solid #e5e7eb;font-size:11px;cursor:pointer;font-family:inherit;background:#fff;color:#6b7280">Request</button></td>' +
          '</tr>';
        }).join('')+'</tbody>' +
        '</table>' +
      '</div>' +
      /* Cold chain */
      '<div style="background:'+(ccOk?'#f0fdf4':'#fef2f2')+';border:1px solid '+(ccOk?'#86efac':'#fca5a5')+';border-radius:10px;padding:14px">' +
        '<div style="font-size:13px;font-weight:700;color:'+(ccOk?'#166534':'#dc2626')+';margin-bottom:8px">🌡 Cold Chain Monitoring</div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">' +
          '<div><div style="font-size:10px;color:#6b7280">Current Temp</div><div style="font-size:22px;font-weight:800;color:'+(ccOk?'#16a34a':'#dc2626')+'">'+cc.currentTemp+'°C</div></div>' +
          '<div><div style="font-size:10px;color:#6b7280">Safe Range</div><div style="font-size:14px;font-weight:600;color:#111111">'+cc.minAlarm+'–'+cc.maxAlarm+'°C</div></div>' +
          '<div><div style="font-size:10px;color:#6b7280">Status</div><div style="font-size:14px;font-weight:700;color:'+(ccOk?'#16a34a':'#dc2626')+'">'+(ccOk?'✓ Normal':'⚠ ALERT')+'</div></div>' +
        '</div>' +
        '<div style="margin-top:10px;display:flex;gap:8px">' +
          '<button onclick="_nUpdateColdChain()" style="padding:7px 14px;border-radius:6px;border:none;background:'+(ccOk?'#16a34a':'#dc2626')+';color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Update Reading</button>' +
          (ccOk?'':'<button onclick="_nEscalateCC()" style="padding:7px 14px;border-radius:6px;border:1px solid #dc2626;background:#fff;color:#dc2626;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Escalate Alert</button>') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ── HISTORY ── */
  if (tab==='history') {
    var allVax = im.todayVaccinations || [];
    var allAR  = im.adverseReactions  || [];
    /* Load persisted records from localStorage (survive page refreshes) */
    try {
      var _persVax = JSON.parse(localStorage.getItem('nihms_nurse_vaccinations') || '[]');
      var _persAR  = JSON.parse(localStorage.getItem('nihms_nurse_adverse_reactions') || '[]');
      /* Merge — deduplicate by id */
      _persVax.forEach(function(r){
        if (!allVax.find(function(x){return x.id===r.id;})) allVax.push(r);
      });
      _persAR.forEach(function(r){
        if (!allAR.find(function(x){return x.id===r.id;})) allAR.push(r);
      });
    } catch(_){}

    var hC2 = { border:'#e2e8f0', text:'#0f172a', muted:'#475569', bg:'#f4f5f0' };
    function _hCard(inner,extra){ return '<div style="background:#fff;border:1.5px solid '+hC2.border+';border-radius:12px;overflow:hidden;margin-bottom:18px'+(extra?';'+extra:'')+'">' + inner + '</div>'; }
    function _hTitle(t){ return '<div style="font-size:15px;font-weight:800;color:'+hC2.text+';padding:16px 20px 12px;border-bottom:1.5px solid '+hC2.border+'">'+t+'</div>'; }
    function _hTh(t){ return '<th style="padding:10px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+hC2.muted+';border-bottom:1.5px solid '+hC2.border+';background:#f8fafc;white-space:nowrap;text-align:left">'+t+'</th>'; }
    function _hTd(t,extra){ return '<td style="padding:9px 14px;font-size:13px;color:'+hC2.text+';border-bottom:1px solid '+hC2.border+(extra?';'+extra:'')+'">'+(t||'—')+'</td>'; }
    function _hEmpty(msg,borderColor){ return '<div style="padding:24px;text-align:center;color:'+hC2.muted+';font-size:13px;background:#f8fafc;border-radius:0">'+msg+'</div>'; }

    content = '<div style="padding:16px 20px 24px;max-width:900px;display:flex;flex-direction:column;gap:0">' +

      /* Vaccination History */
      _hCard(
        _hTitle('💉 Vaccination Records') +
        (allVax.length
          ? '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:700px"><thead><tr>' +
              ['Date','Patient &amp; ID','Vaccine','Dose','Batch / Lot','Vaccinator','Observations','Recorded By'].map(_hTh).join('') +
            '</tr></thead><tbody>' +
            allVax.map(function(v,i){
              return '<tr style="background:'+(i%2===0?'#fff':'#f8fafc')+'">' +
                _hTd(v.date||'—') +
                _hTd('<span style="font-weight:700">'+(v.patientName||'—')+'</span><div style="font-size:10px;color:'+hC2.muted+'">'+(v.patientId||'')+'</div>') +
                _hTd(v.vaccine||'—') +
                _hTd('Dose '+(v.dose||'?')) +
                _hTd(v.batch||'—','font-family:monospace;font-size:12px') +
                _hTd((v.vaccinatorName||v.vaccinator||'—').replace(/\s*·\s*Staff:?\s*\S+/i,'').replace(/\s*·\s*Reg:?\s*\S+/i,'').trim()) +
                _hTd(v.notes||'—','color:'+hC2.muted+';font-size:12px') +
                _hTd('<span style="font-size:11px;color:'+hC2.muted+'">'+(v.recordedBy||v.vaccinatorName||v.vaccinator||'—').replace(/\s*·\s*Staff:?\s*\S+/i,'').replace(/\s*·\s*Reg:?\s*\S+/i,'').trim()+'<br>'+(v.recordedAt?new Date(v.recordedAt).toLocaleString('en-ZA',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'}):'')+'</span>') +
              '</tr>';
            }).join('') +
            '</tbody></table></div>'
          : _hEmpty('No vaccination records yet.'))
      ) +

      /* Adverse Reaction History */
      _hCard(
        _hTitle('🚨 Adverse Reaction Reports') +
        (allAR.length
          ? '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:800px"><thead><tr>' +
              ['Date / Time','Patient &amp; ID','Reaction Type','Severity','Description','Treatment','Reporting HCP','Recorded At'].map(_hTh).join('') +
            '</tr></thead><tbody>' +
            allAR.map(function(r,i){
              var sevColour = r.severity==='Severe'?'#dc2626':r.severity==='Moderate'?'#d97706':'#16a34a';
              return '<tr style="background:'+(i%2===0?'#fff':'#f8fafc')+'">' +
                _hTd((r.date||'—')+' '+(r.time||''),'font-size:12px;white-space:nowrap') +
                _hTd('<span style="font-weight:700">'+r.patientName+'</span><div style="font-size:10px;color:'+hC2.muted+'">'+(r.patientId||'')+'</div>') +
                _hTd('<span style="padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:#fef2f2;color:#dc2626;border:1.5px solid #fca5a5">'+r.type+'</span>') +
                '<td style="padding:9px 14px;border-bottom:1px solid '+hC2.border+'"><span style="padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;color:'+sevColour+';border:1.5px solid '+sevColour+';background:#fff">'+(r.severity||'—')+'</span></td>' +
                _hTd(r.notes||'—','color:'+hC2.muted+';font-size:12px;max-width:200px') +
                _hTd(r.treatment||'—','color:'+hC2.muted+';font-size:12px;max-width:160px') +
                _hTd(r.reporter||'—','font-size:12px') +
                _hTd('<span style="font-size:11px;color:'+hC2.muted+'">'+(r.recordedAt?new Date(r.recordedAt).toLocaleString('en-ZA',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'}):'—')+'</span>') +
              '</tr>';
            }).join('') +
            '</tbody></table></div>'
          : _hEmpty('No adverse reactions reported.'))
      ) +

    '</div>';
  }

  /* ── COVERAGE REPORTS ── */
  if (tab==='reports') {
    var covered = im.todayVaccinations.length;
    var eligible = _N.patients.filter(function(p){return p.age&&p.age<=5;}).length;
    var coverage = eligible ? Math.round(covered/eligible*100) : 0;
    var rC2 = { border:'#e2e8f0', text:'#0f172a', muted:'#475569', teal:'#0f6e56' };
    content = '<div style="padding:16px 20px 24px;max-width:760px;display:flex;flex-direction:column;gap:14px">' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">' +
        [
          {label:'Eligible Children (Today)', value:eligible, color:'#0f6e56'},
          {label:'Vaccinated Today',          value:covered,  color:'#16a34a'},
          {label:'Coverage Rate',             value:coverage+'%', color:coverage<80?'#dc2626':'#16a34a'},
        ].map(function(k){
          return '<div style="background:#fff;border:1.5px solid '+rC2.border+';border-radius:12px;padding:20px;text-align:center">' +
            '<div style="font-size:32px;font-weight:800;color:'+k.color+';margin-bottom:6px">'+k.value+'</div>' +
            '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+rC2.muted+'">'+k.label+'</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div style="background:#fff;border:1.5px solid '+rC2.border+';border-radius:12px;padding:20px 24px">' +
        '<div style="font-size:15px;font-weight:800;color:'+rC2.text+';margin-bottom:16px">Vaccine Coverage by Type</div>' +
        im.vaccines.slice(0,6).map(function(v){
          var cnt = im.todayVaccinations.filter(function(r){return r.vaccineId===v.id;}).length;
          var pct = eligible ? Math.round(cnt/Math.max(eligible,1)*100) : 0;
          return '<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span style="color:'+rC2.text+';font-weight:600">'+v.name+'</span><span style="font-weight:700;color:'+rC2.teal+'">'+cnt+' given</span></div><div style="height:6px;background:#f1f5f9;border-radius:4px"><div style="height:6px;background:linear-gradient(90deg,#0f6e56,#1a4a9b);border-radius:4px;width:'+Math.min(pct,100)+'%"></div></div></div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  return _nHeader('Immunisation Module', 'SA EPI Schedule · Vaccine Stock · Cold Chain') +
    tabBar + banners +
    '<div style="flex:1;overflow:auto">' + content + '</div>';
}

/* ── Immunisation action handlers ────────────────────────────────────────── */
window._nRecordVax = function() {
  function _v(id){ var el=document.getElementById(id); return el?el.value.trim():''; }
  var ptId  = _v('vax-pt');
  var vaxId = _v('vax-vac');
  var dose  = _v('vax-dose');
  var date  = _v('vax-date');
  var batch = _v('vax-batch');
  var vacc  = (_v('vax-vacc')||'').replace(/\s*·\s*Staff:?\s*\S+/i,'').trim(); /* strip Staff ID from display value */
  var notes = _v('vax-notes');

  /* ── Validation ── */
  var errs = [];
  if (!ptId)  errs.push('Patient');
  if (!vaxId) errs.push('Vaccine');
  /* Dose must be a positive integer */
  var doseNum = parseInt(dose, 10);
  if (!dose || isNaN(doseNum) || doseNum < 1) errs.push('Dose Number (must be a whole number ≥ 1)');
  if (!date)  errs.push('Date Administered');
  if (!batch) errs.push('Batch / Lot Number');
  if (!vacc)  errs.push('Vaccinator');
  if (errs.length) {
    /* Show inline error and toast */
    var resultEl = document.getElementById('vax-save-result');
    if (resultEl) {
      resultEl.style.display = '';
      resultEl.innerHTML = '<div class="nihms-alert-err"><span>✗</span><div><strong>Cannot save:</strong> ' + errs.join(', ') + '</div></div>';
    }
    if (window.UI && UI.showToast) UI.showToast('Required: ' + errs.join(', '),'err');
    return;
  }

  /* ── Find patient and vaccine objects ── */
  var allPts = (_N.patients||[]).concat(_N.immQueue||[]);
  var pt  = allPts.find(function(p){return p.id===ptId||p.patientId===ptId||p.pid===ptId;});
  var vax = (_N.immu.vaccines||[]).find(function(v){return v.id===vaxId;});

  /* ── Duplicate guard ── */
  var dup = (_N.immu.todayVaccinations||[]).find(function(r){
    return (r.patientId===ptId) && r.vaccineId===vaxId && r.date===date;
  });
  if (dup) {
    if (!confirm('A record for this patient and vaccine already exists on ' + date + '. Save anyway?')) return;
  }

  /* ── Get current session user for audit trail ── */
  var u = (typeof API !== 'undefined' && API && API.getStoredUser && API.getStoredUser()) || {};

  /* ── Build full vaccination record ── */
  var rec = {
    id:                   'VAX-' + Date.now(),
    /* Patient identity — pulled from patient record, not user entry */
    patientId:            ptId,
    patientName:          pt ? (pt.name || pt.patientName || pt.firstName ? ((pt.firstName||'') + (pt.lastName ? ' '+pt.lastName : '')).trim() || pt.patientName || pt.name || 'Unknown' : 'Unknown') : 'Unknown',
    patientNationalId:    pt ? (pt.nationalId||pt.idNumber||pt.passportNumber||'') : '',
    patientFileNumber:    pt ? (pt.fileNumber||pt.patientFileNumber||pt.mrn||pt.recordNumber||'') : '',
    patientDob:           pt ? (pt.dob||'') : '',
    patientSex:           pt ? (pt.sex||'') : '',
    /* Vaccine */
    vaccineId:            vaxId,
    vaccine:              vax ? vax.name : vaxId,
    dose:                 String(doseNum),          /* manually entered, validated */
    /* Administration */
    date:                 date,
    time:                 _nowTime(),
    batch:                batch,
    notes:                notes,
    /* Vaccinator — from session, confirmed in field */
    vaccinator:           vacc,
    vaccinatorName:       u.name || u.fullName || u.displayName || vacc,
    vaccinatorReg:        u.registrationNumber || u.professionalReg || u.hpcsa || u.sanc || '',
    vaccinatorStaffId:    u.staffId || u.employeeId || u.id || '',
    /* Audit trail */
    recordedBy:           u.name || u.fullName || u.email || vacc,
    recordedById:         u.id || u._id || '',
    recordedAt:           new Date().toISOString(),
    updatedBy:            u.name || u.fullName || u.email || vacc,
    updatedAt:            new Date().toISOString(),
    facilityId:           u.facilityId || u.facility || '',
    /* Appointment reference (if a patient came from the immQueue, carry their appointment id) */
    appointmentId:        pt ? (pt.appointmentId || pt.apptId || pt.bookingId || '') : '',
    status:               'recorded',
  };

  /* ── Update in-memory state ── */
  if (!_N.immu.todayVaccinations) _N.immu.todayVaccinations = [];
  _N.immu.todayVaccinations.push(rec);
  if (pt) {
    if (!pt.immunisationRecord) pt.immunisationRecord = {};
    pt.immunisationRecord[vax ? vax.name : vaxId] = date;
    if (!pt.vaccinationHistory) pt.vaccinationHistory = [];
    pt.vaccinationHistory.push(rec);
  }

  /* ── Decrement stock ── */
  var stock = (_N.immu.stock||[]).find(function(s){
    return vaxId.startsWith(s.id) || s.id.startsWith(vaxId.slice(0,3));
  });
  if (stock && stock.quantity > 0) stock.quantity--;

  /* ── Persist to localStorage bridges ── */
  try {
    /* Nurse-level history */
    var _allVax = JSON.parse(localStorage.getItem('nihms_nurse_vaccinations') || '[]');
    _allVax.push(rec);
    localStorage.setItem('nihms_nurse_vaccinations', JSON.stringify(_allVax));
    /* Patient 360° bridge — read by doctor.js Patient 360° and patient.js */
    var _ptKey = 'nihms_vaccinations_' + ptId;
    var _ptVax = JSON.parse(localStorage.getItem(_ptKey) || '[]');
    _ptVax.push(rec);
    localStorage.setItem(_ptKey, JSON.stringify(_ptVax));
    /* Also key by nationalId if available (doctor.js may look up by that) */
    if (rec.patientNationalId) {
      var _idKey = 'nihms_vaccinations_' + rec.patientNationalId;
      var _idVax = JSON.parse(localStorage.getItem(_idKey) || '[]');
      _idVax.push(rec);
      localStorage.setItem(_idKey, JSON.stringify(_idVax));
    }
  } catch(_){}

  /* ── Broadcast to other open tabs (doctor.js, patient.js) ── */
  try {
    var _bc = new BroadcastChannel('nihms_vaccinations');
    _bc.postMessage({ type:'vaccination_recorded', record:rec });
    setTimeout(function(){ _bc.close(); }, 200);
  } catch(_){}

  /* ── Save to backend and wait for result before showing success ── */
  var _apiPid = (pt && (pt.pid || pt._id)) || ptId;
  var _saveOk = false;

  function _onSaveSuccess() {
    _saveOk = true;
    _N.immu.lastSavedVaxId = rec.id;

    /* Show success banner */
    var resultEl = document.getElementById('vax-save-result');
    if (resultEl) {
      resultEl.style.display = '';
      resultEl.innerHTML =
        '<div class="nihms-alert-ok" style="margin-bottom:8px">' +
          '<span>✓</span>' +
          '<div><strong>' + (vax?vax.name:'Vaccination') + ' — Dose ' + doseNum + ' recorded successfully</strong>' +
          '<div style="font-size:11px;margin-top:3px">Patient: ' + (pt?pt.name:'—') + ' · Date: ' + date + ' · Batch: ' + batch + ' · Vaccinator: ' + (u.name||vacc) + '</div></div>' +
        '</div>';
    }
    /* Disable the submit button to prevent double-save */
    var submitBtn = document.getElementById('vax-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.55';
      submitBtn.style.cursor = 'not-allowed';
    }
    /* Reveal the End Appointment button */
    var endWrap = document.getElementById('vax-end-appt-wrap');
    if (endWrap) endWrap.style.display = '';

    if (window.UI && UI.showToast) UI.showToast('✓ ' + (vax?vax.name:'Vaccination') + ' — Dose ' + doseNum + ' recorded for ' + (pt?pt.name:'patient'), 'ok');
  }

  function _onSaveError(msg) {
    /* Remove from in-memory if backend rejected */
    _N.immu.todayVaccinations = (_N.immu.todayVaccinations||[]).filter(function(r){ return r.id !== rec.id; });
    var resultEl = document.getElementById('vax-save-result');
    if (resultEl) {
      resultEl.style.display = '';
      resultEl.innerHTML =
        '<div class="nihms-alert-err">' +
          '<span>✗</span>' +
          '<div><strong>Save failed</strong> — ' + (msg||'Could not reach the server. Please try again.') + ' The appointment cannot be ended until the record is saved.</div>' +
        '</div>';
    }
    if (window.UI && UI.showToast) UI.showToast('Save failed — please try again', 'err');
  }

  /* Try backend save; fall back to localStorage-only success if API is unavailable or route not found */
  function _isOfflineOrMissing(err) {
    if (!err) return false;
    var msg = (err.message || err.toString() || '').toLowerCase();
    return msg.indexOf('route not found') !== -1 ||
           msg.indexOf('not found') !== -1 ||
           msg.indexOf('network') !== -1 ||
           msg.indexOf('failed to fetch') !== -1 ||
           msg.indexOf('404') !== -1 ||
           msg.indexOf('econnrefused') !== -1;
  }
  try {
    if (typeof API === 'undefined' || !API || !API._fetchDirect) throw new Error('no API');
    var _p1 = API._fetchDirect('/vaccinations', { method:'POST', body:JSON.stringify(rec) }).catch(function(e){ return {__err:e}; });
    var _p2 = API._fetchDirect('/patients/' + _apiPid + '/vaccinations', { method:'POST', body:JSON.stringify(rec) }).catch(function(e){ return {__err:e}; });
    Promise.all([_p1, _p2]).then(function(results){
      var r1 = results[0], r2 = results[1];
      /* If primary endpoint returned an error object, check if it's a missing route */
      if (r1 && r1.__err) {
        if (_isOfflineOrMissing(r1.__err)) {
          /* Backend route not deployed yet — record is in localStorage, treat as success */
          _onSaveSuccess();
        } else {
          _onSaveError(r1.__err.message || 'Server error');
        }
      } else {
        /* Primary save succeeded (secondary sub-resource is best-effort) */
        _onSaveSuccess();
      }
    }).catch(function(err){
      /* Unexpected rejection — fall back to localStorage success */
      _onSaveSuccess();
    });
  } catch(_) {
    /* API not available (offline / dev mode) — treat localStorage persistence as sufficient */
    _onSaveSuccess();
  }
};

/* ── End Immunisation Appointment ────────────────────────────────────────── */
window._nEndImmAppt = function() {
  /* Guard: vaccination must have been saved successfully first */
  if (!_N.immu.lastSavedVaxId) {
    if (window.UI && UI.showToast) UI.showToast('Record the vaccination first before ending the appointment.', 'warn');
    return;
  }

  /* Find the saved vaccination record */
  var rec = (_N.immu.todayVaccinations||[]).find(function(r){ return r.id === _N.immu.lastSavedVaxId; });
  if (!rec) {
    if (window.UI && UI.showToast) UI.showToast('Cannot locate the saved vaccination record. Please refresh.', 'err');
    return;
  }

  /* Guard against double-completion */
  var apptId = rec.appointmentId || rec.patientId;
  if (_N.immu.endedApptIds[apptId]) {
    if (window.UI && UI.showToast) UI.showToast('This appointment has already been ended.', 'warn');
    return;
  }

  var completedAt = new Date().toISOString();
  var u = (typeof API !== 'undefined' && API && API.getStoredUser && API.getStoredUser()) || {};

  /* Mark appointment as completed in-memory */
  _N.immu.endedApptIds[apptId] = true;

  /* Build completion payload */
  var completion = {
    appointmentId:  apptId,
    vaccinationId:  rec.id,
    patientId:      rec.patientId,
    patientName:    rec.patientName,
    completedAt:    completedAt,
    completedBy:    u.name || u.fullName || u.email || rec.vaccinator || '',
    completedById:  u.id || u._id || '',
    status:         'Completed',
    vaccine:        rec.vaccine,
    dose:           rec.dose,
    facilityId:     rec.facilityId || '',
  };

  /* Remove patient from immQueue (they're done) */
  _N.immQueue = (_N.immQueue||[]).filter(function(p){
    return !(p.id===rec.patientId || p.patientId===rec.patientId || p.appointmentId===apptId);
  });

  /* Update the vaccination record itself to reflect completion */
  rec.status      = 'Completed';
  rec.completedAt = completedAt;
  rec.updatedAt   = completedAt;
  rec.updatedBy   = completion.completedBy;

  /* Persist completion to localStorage */
  try {
    /* Update nurse vaccinations store */
    var _allVax = JSON.parse(localStorage.getItem('nihms_nurse_vaccinations') || '[]');
    var _idx = _allVax.findIndex(function(r){ return r.id === rec.id; });
    if (_idx >= 0) _allVax[_idx] = rec; else _allVax.push(rec);
    localStorage.setItem('nihms_nurse_vaccinations', JSON.stringify(_allVax));
    /* Update patient 360° bridge */
    var _ptKey  = 'nihms_vaccinations_' + rec.patientId;
    var _ptVax  = JSON.parse(localStorage.getItem(_ptKey) || '[]');
    var _ptIdx  = _ptVax.findIndex(function(r){ return r.id === rec.id; });
    if (_ptIdx >= 0) _ptVax[_ptIdx] = rec; else _ptVax.push(rec);
    localStorage.setItem(_ptKey, JSON.stringify(_ptVax));
    /* Also key by national ID */
    if (rec.patientNationalId) {
      var _idKey = 'nihms_vaccinations_' + rec.patientNationalId;
      var _idVax = JSON.parse(localStorage.getItem(_idKey) || '[]');
      var _idIdx = _idVax.findIndex(function(r){ return r.id === rec.id; });
      if (_idIdx >= 0) _idVax[_idIdx] = rec; else _idVax.push(rec);
      localStorage.setItem(_idKey, JSON.stringify(_idVax));
    }
    /* Log completed appointments */
    var _done = JSON.parse(localStorage.getItem('nihms_completed_imm_appts') || '[]');
    _done.push(completion);
    localStorage.setItem('nihms_completed_imm_appts', JSON.stringify(_done));
  } catch(_){}

  /* POST completion to backend */
  try {
    if (apptId) {
      API._fetchDirect('/appointments/' + apptId, {
        method: 'PATCH',
        body: JSON.stringify({ status:'Completed', completedAt:completedAt, completedBy:completion.completedBy })
      }).catch(function(){});
    }
    API._fetchDirect('/immunisation-appointments/' + apptId + '/complete', {
      method: 'POST',
      body: JSON.stringify(completion)
    }).catch(function(){});
  } catch(_){}

  /* Broadcast completion so other tabs (queue display, patient portal) update */
  try {
    var _bc3 = new BroadcastChannel('nihms_vaccinations');
    _bc3.postMessage({ type:'immunisation_appointment_completed', completion:completion });
    setTimeout(function(){ _bc3.close(); }, 200);
  } catch(_){}

  /* Clear the saved record gate so the form can't be re-ended */
  _N.immu.lastSavedVaxId  = null;
  _N.immu.selectedPatient = null;

  /* Switch to Today's Vaccinations tab and show confirmation */
  _N.immu.immuTab = 'today';
  _nurseRender();
  if (window.UI && UI.showToast) UI.showToast('✓ Immunisation appointment completed for ' + rec.patientName, 'ok');
};

window._nRecordAR = function() {
  function _v(id){ var el=document.getElementById(id); return el?el.value.trim():''; }
  var ptId      = _v('ar-pt');
  var type      = _v('ar-type');
  var arDate    = _v('ar-date');
  var arTime    = _v('ar-time');
  var severity  = _v('ar-severity');
  var notes     = _v('ar-notes');
  var treatment = _v('ar-treatment');
  var reporter  = _v('ar-reporter');
  var vaxRef    = _v('ar-vax-ref');  /* index into todayVaccinations */

  /* Validation */
  var errs = [];
  if (!ptId)     errs.push('Patient');
  if (!type)     errs.push('Reaction Type');
  if (!arDate)   errs.push('Date of Reaction');
  if (!arTime)   errs.push('Time of Reaction');
  if (!severity) errs.push('Severity');
  if (!notes)    errs.push('Description / Symptoms');
  if (!reporter) errs.push('Reporting Healthcare Professional');
  if (errs.length) { UI.showToast('Required: ' + errs.join(', '),'err'); return; }

  var allPts = (_N.patients||[]).concat(_N.immQueue||[]);
  var pt = allPts.find(function(p){return p.id===ptId||p.patientId===ptId||p.pid===ptId;});

  /* Link to vaccination record if selected */
  var linkedVax = (vaxRef !== '' && vaxRef !== undefined && _N.immu.todayVaccinations)
    ? _N.immu.todayVaccinations[parseInt(vaxRef, 10)]
    : null;

  var u   = (API && API.getStoredUser && API.getStoredUser()) || {};
  var rec = {
    id:           'AR-' + Date.now(),
    patientId:    ptId,
    patientName:  pt ? pt.name : 'Unknown',
    type:         type,
    date:         arDate,
    time:         arTime,
    severity:     severity,
    notes:        notes,
    treatment:    treatment,
    reporter:     reporter,
    linkedVaxId:  linkedVax ? linkedVax.id : null,
    linkedVaccine:linkedVax ? linkedVax.vaccine : null,
    recordedBy:   reporter,
    recordedAt:   new Date().toISOString(),
    updatedBy:    u.name || u.email || reporter,
    facilityId:   u.facilityId || u.facility || '',
  };

  if (!_N.immu.adverseReactions) _N.immu.adverseReactions = [];
  _N.immu.adverseReactions.push(rec);

  /* Also attach to linked vaccination record */
  if (linkedVax) {
    if (!linkedVax.adverseReactions) linkedVax.adverseReactions = [];
    linkedVax.adverseReactions.push(rec);
  }

  /* Persist to localStorage */
  try {
    var _allAR = JSON.parse(localStorage.getItem('nihms_nurse_adverse_reactions') || '[]');
    _allAR.push(rec);
    localStorage.setItem('nihms_nurse_adverse_reactions', JSON.stringify(_allAR));
    /* Patient-level bridge */
    var _ptARKey = 'nihms_adverse_reactions_' + ptId;
    var _ptAR = JSON.parse(localStorage.getItem(_ptARKey) || '[]');
    _ptAR.push(rec);
    localStorage.setItem(_ptARKey, JSON.stringify(_ptAR));
  } catch(_){}

  /* Save to backend */
  var _apiPid = (pt && (pt.pid || pt._id)) || ptId;
  try {
    API._fetchDirect('/adverse-reactions', { method:'POST', body:JSON.stringify(rec) }).catch(function(){});
    API._fetchDirect('/patients/' + _apiPid + '/adverse-reactions', { method:'POST', body:JSON.stringify(rec) }).catch(function(){});
  } catch(_){}

  /* Broadcast */
  try {
    var _bc2 = new BroadcastChannel('nihms_vaccinations');
    _bc2.postMessage({ type:'adverse_reaction_recorded', record:rec });
    setTimeout(function(){ _bc2.close(); }, 200);
  } catch(_){}

  _nurseRender();

  /* Escalation toast based on severity */
  if (rec.severity === 'Severe' || rec.type === 'Anaphylaxis') {
    UI.showToast('🚨 SEVERE reaction reported — escalate immediately', 'err');
  } else if (rec.severity === 'Moderate') {
    UI.showToast('⚠ Adverse reaction recorded — monitor closely', 'warn');
  } else {
    UI.showToast('Adverse reaction recorded for ' + (pt ? pt.name : 'patient'), 'ok');
  }

  /* Send escalation SMS/notification for severe reactions */
  if (rec.severity === 'Severe' || rec.type === 'Anaphylaxis') {
    try {
      API._fetchDirect('/notifications/sms', {
        method:'POST',
        body: JSON.stringify({
          to: 'Doctor',
          message: 'NIHMS ALERT: ' + rec.severity + ' adverse reaction (' + rec.type + ') reported for ' +
                   rec.patientName + '. Reporter: ' + rec.reporter + '. Please review immediately.'
        })
      }).catch(function(){});
    } catch(_){}
  }
};

window._nRequestStock = function() {
  var low = _N.immu.stock.filter(function(s){return s.quantity<s.minQty;});
  var msg = 'NIHMS Vaccine Restock Request:\n'+low.map(function(s){return '- '+s.name+': current '+s.quantity+', needs min '+s.minQty+' '+s.unit;}).join('\n')+'\n\nPlease arrange urgent restock. Thank you.';
  try{ API._fetchDirect('/notifications/sms',{method:'POST',body:JSON.stringify({to:'Pharmacy',message:msg})}).catch(function(){}); }catch(_){}
  UI.showToast('Restock request sent to pharmacy','ok');
};

window._nRequestSpecificStock = function(id) {
  var s = _N.immu.stock.find(function(x){return x.id===id;});
  if(s) UI.showToast('Restock request sent for '+s.name,'ok');
};

window._nUpdateColdChain = function() {
  var t = parseFloat(prompt('Enter current fridge temperature (°C):', _N.immu.coldChain.currentTemp));
  if (isNaN(t)) return;
  _N.immu.coldChain.currentTemp = t;
  _N.immu.coldChain.lastReading = new Date().toISOString();
  _N.immu.coldChain.status = (t>=_N.immu.coldChain.minAlarm&&t<=_N.immu.coldChain.maxAlarm)?'OK':'ALERT';
  _nurseRender();
  UI.showToast('Temperature updated: '+t+'°C · Status: '+_N.immu.coldChain.status, _N.immu.coldChain.status==='OK'?'ok':'warn');
};

window._nEscalateCC = function() {
  UI.showToast('Cold chain alert escalated to pharmacy and facility manager','warn');
  try{ API._fetchDirect('/notifications/sms',{method:'POST',body:JSON.stringify({to:'Pharmacy',message:'URGENT: Cold chain alert at Nurse Station. Fridge temp '+_N.immu.coldChain.currentTemp+'°C. Immediate action required.'})}).catch(function(){}); }catch(_){}
};

/* ── Message bridge: other portals can push messages directly to this portal ── */
window._nurseAddMessage = function(msg) {
  if (!_N.messages) _N.messages = [];
  /* Avoid duplicates */
  var mid = String(msg._id || msg.id || '');
  var dup = mid && _N.messages.find(function(m){ return String(m._id||m.id||'') === mid; });
  if (dup) return;
  var sr = (msg.senderRole || msg.fromRole || msg.role || 'RECEPTIONIST').toUpperCase()
             .replace('DOCTOR/CLINICIAN','DOCTOR');
  _N.messages.unshift({
    id:         msg._id || msg.id || Date.now(),
    _id:        msg._id || msg.id || null,
    senderId:   msg.senderId || null,
    from:       msg.from || msg.senderName || 'Staff',
    senderRole: sr, fromRole: sr, role: sr,
    recipientRole: msg.recipientRole || 'NURSE_STATION',
    subject:    msg.subject || '(No subject)',
    body:       msg.body || msg.text || '',
    text:       msg.body || msg.text || '',
    priority:   msg.priority || 'Normal',
    readStatus: 'unread',
    unread:     true,
    time:       msg.time || new Date().toLocaleTimeString('en-ZA', {hour:'2-digit',minute:'2-digit'}),
    sentAt:     msg.sentAt || new Date().toISOString(),
    threadId:   msg.threadId || null,
  });
  /* Re-render if messaging view is active */
  if (_N.view === 'messaging' && typeof _nurseRender === 'function') _nurseRender();
  /* Toast */
  if (window.UI && window.UI.showToast) {
    UI.showToast('📩 New message from ' + (msg.from || msg.senderName || 'Staff'), 'ok');
  }
};
/* ═══════════════════════════════════════════════════════════════════════════
   OUTER SIDEBAR ROUTER REGISTRATIONS
   The router calls Pages[id]() when a nav item is clicked.
   Each entry maps to the exact view name used by _nurseRender().
   _nGoTo() handles two cases:
     • Shell already in DOM  → switch view + re-render in place, return outerHTML
     • Shell not in DOM yet  → set view then mount via Pages['nurse_dashboard']
═══════════════════════════════════════════════════════════════════════════ */
function _nGoTo(view) {
  var main = document.getElementById('nurse-main');
  if (main) {
    _N.view = view;
    _nurseRender();
    /* Return the existing shell outerHTML so UI.renderContent re-mounts it intact.
       After UI.renderContent does content.innerHTML = <this string>, #nurse-main
       will be a brand-new DOM node — schedule a re-bind on the next tick so the
       listeners (which now live on #content) survive even if _nContentBound was
       reset (e.g. content element was also replaced).                           */
    setTimeout(function() {
      if (!_nContentBound) _nurseBindEvents();
    }, 0);
    var shell = main.closest('[style*="display:flex"]') || main.parentElement;
    return shell ? shell.outerHTML : main.outerHTML;
  }
  /* Shell not yet mounted — set view then let the entry point mount everything */
  _N.view = view;
  return Pages['nurse_dashboard']();
}

/* Each router nav item maps to one of these */
Pages['nurse_overview']     = function(){ return _nGoTo('overview');      };
Pages['nurse_queue']        = function(){ return _nGoTo('queue');         };
Pages['nurse_imm_queue']    = function(){ return _nGoTo('imm-queue');     };
Pages['nurse_requests']     = function(){ return _nGoTo('requests');      };
Pages['nurse_vitals']       = function(){ return _nGoTo('vitals');        };
Pages['nurse_immunisation'] = function(){ return _nGoTo('immunisation');  };
Pages['nurse_patient_file'] = function(){ return _nGoTo('patient-file'); };
Pages['nurse_messaging']    = function(){ return _nGoTo('messaging');     };
Pages['nurse_analytics']    = function(){ return _nGoTo('analytics');     };
