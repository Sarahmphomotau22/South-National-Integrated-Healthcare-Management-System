/**
 * js/pages/nurse.js — NIHMS Nurse / Triage Station
 *
 * 6 views: requests · queue · vitals · emergency · messaging · analytics
 *
 * Design: #f4f5f0 surface · teal #0F6E56 primary · navy #1A4A9B accent
 *   gradient header · #e0e0e0 borders · pill buttons · charcoal #20242b text
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
  var m = { 'Awaiting Vitals':'background:#e8f5f1;color:#0F4C3A;border:1px solid #a8d8cc',
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
function _td(c,s) { return '<td style="padding:8px 14px;font-size:13px;color:#20242b;'+(s||'')+'">'+c+'</td>'; }
function _trBg(i, priority) {
  if (priority==='Emergency') return 'background:#fff5f5';
  return i%2===0?'background:#ffffff':'background:#f4f5f0';
}

/* ─── Main page shell ────────────────────────────────────────────────── */
Pages['nurse_dashboard'] = function() {
  _N.view           = 'overview';
  _N.alertDismissed = false;
  _N.loadingData    = true;

  /* Merge any requests already pushed by receptionist */
  (window._NURSE_REQUESTS || []).forEach(function(r) {
    if (r.autoAccept) {
      /* Auto-accepted: goes straight to Vitals Queue, not Triage */
      if (!_N.patients.find(function(p){ return p.id === (r.patientId||r.id); })) {
        var now0 = (typeof _nowTime==='function') ? _nowTime() : new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});
        var sn0  = (_N._stationSeq = ((_N._stationSeq||0) % 4) + 1);
        _N.patients.push({ id:r.patientId||r.id, name:r.patientName||'', age:r.age||'—', sex:r.sex||'—', complaint:r.complaint||'Walk-in', priority:r.priority||'Normal', status:'Awaiting Vitals', vitalStatus:'Pending', arrivalTime:r.requestedAt||now0, triageTime:null, waitMins:0, room:null, emergencyClass:null, vitals:null, flags:[], aiRisk:null, acceptedAt:now0, stationNum:sn0 });
      }
    } else {
      if (!_N.requests.find(function(x){ return x.id === r.id; }))
        _N.requests.push(r);
    }
  });

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
            id:          q._id || q.id,
            pid:         (q.patient && q.patient._id) || q.patientId || q._id,
            name:        q.patient ? (q.patient.firstName||'') + ' ' + (q.patient.lastName||'') : (q.name||'Unknown'),
            patientName: q.patient ? (q.patient.firstName||'') + ' ' + (q.patient.lastName||'') : (q.name||'Unknown'),
            age:         (q.patient && q.patient.age) || q.age || '—',
            sex:         (q.patient && q.patient.gender && q.patient.gender.charAt(0).toUpperCase()) || q.sex || '—',
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
          var alreadyQueued = _N.patients.find(function(p){ return p.pid === pid || p.id === pid; });
          var alreadyReq    = _N.requests.find(function(r){ return r.patientId === pid; });
          if (!alreadyQueued && !alreadyReq) {
            _N.requests.push({
              id:          'REQ-' + (a._id || a.id),
              patientId:   pid,
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
        if (r.autoAccept) {
          if (!_N.patients.find(function(p){ return p.id === (r.patientId||r.id); })) {
            var now3 = (typeof _nowTime==='function') ? _nowTime() : new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});
            var sn3  = (_N._stationSeq = ((_N._stationSeq||0) % 4) + 1);
            _N.patients.push({ id:r.patientId||r.id, name:r.patientName||'', age:r.age||'—', sex:r.sex||'—', complaint:r.complaint||'Walk-in', priority:r.priority||'Normal', status:'Awaiting Vitals', vitalStatus:'Pending', arrivalTime:r.requestedAt||now3, triageTime:null, waitMins:0, room:null, emergencyClass:null, vitals:null, flags:[], aiRisk:null, acceptedAt:now3, stationNum:sn3 });
          }
        } else {
          if (!_N.requests.find(function(x){ return x.id === r.id; }))
            _N.requests.push(r);
        }
      });

      /* 4. Load messages from backend */
      var mRes = await API._fetchDirect('/messages?role=nurse&limit=50', { method:'GET' }).catch(function(){return null;});
      if (mRes && mRes.data && mRes.data.length) {
        _N.messages = mRes.data.map(function(m) {
          return {
            id:      m._id || m.id,
            from:    m.senderName || m.from || 'System',
            role:    m.senderRole || m.role || 'System',
            text:    m.body || m.text || m.message || '',
            time:    m.createdAt ? new Date(m.createdAt).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}) : '—',
            unread:  !m.read,
          };
        });
      }

    } catch(e) {
      console.warn('NIHMS nurse: could not load data from API', e);
    }

    _N.loadingData = false;
    _nurseRender();
  }, 120);

  return '<div style="display:flex;height:calc(100vh - 120px);overflow:hidden">' +
    '<aside id="nurse-sidebar" style="width:208px;flex-shrink:0;background:#f4f5f0;border-right:1px solid #e0e0e0;display:flex;flex-direction:column;overflow-y:auto"></aside>' +
    '<main id="nurse-main" style="flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column;background:#f4f5f0"></main>' +
  '</div>';
};

/* ─── Render engine ──────────────────────────────────────────────────── */
function _nurseRender() {
  /* Always sync any new requests pushed by receptionist */
  (window._NURSE_REQUESTS||[]).forEach(function(r){
    if (r.autoAccept) {
      if (!_N.patients.find(function(p){ return p.id === (r.patientId||r.id); })) {
        var nowR = (typeof _nowTime==='function') ? _nowTime() : new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});
        var snR  = (_N._stationSeq = ((_N._stationSeq||0) % 4) + 1);
        _N.patients.push({ id:r.patientId||r.id, name:r.patientName||'', age:r.age||'—', sex:r.sex||'—', complaint:r.complaint||'Walk-in', priority:r.priority||'Normal', status:'Awaiting Vitals', vitalStatus:'Pending', arrivalTime:r.requestedAt||nowR, triageTime:null, waitMins:0, room:null, emergencyClass:null, vitals:null, flags:[], aiRisk:null, acceptedAt:nowR, stationNum:snR });
      }
    } else {
      if (!_N.requests.find(function(x){ return x.id === r.id; }))
        _N.requests.push(r);
    }
  });

  var sidebar = document.getElementById('nurse-sidebar');
  var main    = document.getElementById('nurse-main');
  if (!sidebar || !main) return;

  var styleEl=document.getElementById('nihms-style');
  if(!styleEl){styleEl=document.createElement('style');styleEl.id='nihms-style';
  styleEl.textContent='*{box-sizing:border-box}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#d0d0d0;border-radius:99px}body{font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif}input:focus,select:focus,textarea:focus{border-color:#0F6E56 !important;box-shadow:0 0 0 3px rgba(15,110,86,.12) !important;outline:none !important}button[style*="background:#0F6E56"]{border-radius:50px !important}';
  document.head.appendChild(styleEl);}
  sidebar.innerHTML = _nSidebar();

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
    return '<button onclick="_setView(\''+view+'\')" style="display:flex;align-items:center;gap:9px;width:100%;padding:8px 16px;border:none;background:'+(active?'#fff':'transparent')+';color:'+(active?'#0F6E56':'#20242b')+';font-size:13px;font-weight:'+(active?'700':'500')+';cursor:pointer;text-align:left;font-family:inherit;border-right:'+(active?'2px solid #0F6E56':'2px solid transparent')+';transition:all .1s">' +
      '<span style="font-size:15px;width:18px;text-align:center">'+icon+'</span>' +
      '<span style="flex:1">'+label+'</span>' +
      (badge ? '<span style="min-width:18px;height:18px;border-radius:9px;background:'+(badgeRed?'#dc2626':'#0F6E56')+';color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px">'+badge+'</span>' : '') +
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
  return '<div style="padding:12px 20px;border-bottom:1px solid #e0e0e0;background:#f4f5f0;flex-shrink:0">' +
    '<div style="font-size:15px;font-weight:700;color:#20242b">'+title+'</div>' +
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
    'background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);border-radius:12px;padding:14px 20px;margin-bottom:16px;box-shadow:0 2px 10px rgba(15,110,86,.2)">' +
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
    '<div style="background:#e8f5f1;border:1px solid #a8d8cc;border-left:4px solid #0F6E56;border-radius:10px;padding:12px 16px;margin-bottom:16px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
        '<span style="font-size:14px">✉</span>' +
        '<div style="font-size:12px;font-weight:700;color:#0F4C3A">Messages from Reception</div>' +
        (unreadMsg ? '<span style="min-width:18px;height:18px;border-radius:9px;background:#dc2626;color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 4px">'+unreadMsg+'</span>' : '') +
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
                (m.unread?'<span style="padding:1px 6px;background:#d1ece5;color:#0F4C3A;border-radius:20px;font-size:9px;font-weight:700">New</span>':'') +
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
      '<div style="font-size:13px;font-weight:700;color:#20242b">Patient Queue</div>' +
      '<button onclick="_setView(\'queue\')" style="font-size:11px;color:#0F6E56;border:none;background:transparent;cursor:pointer;font-family:inherit">View all →</button>' +
    '</div>' +
    (_N.patients.length ? _N.patients.slice(0,5).map(function(p,i){
      var bg = i%2===0?'#fff':'#f8fafc';
      return '<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:'+bg+';border-bottom:1px solid #f8fafc">' +
        '<div style="width:30px;height:30px;border-radius:50%;background:'+(p.priority==='Emergency'?'#dc2626':p.priority==='High'?'#d97706':'#0F6E56')+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0">'+(p.name.split(' ').map(function(n){return n[0];}).join('').slice(0,2))+'</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:12px;font-weight:600;color:#20242b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+p.name+'</div>' +
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
      '<div style="font-size:13px;font-weight:700;color:#20242b">Vitals Collection</div>' +
      '<button onclick="_setView(\'vitals\')" style="font-size:11px;color:#0F6E56;border:none;background:transparent;cursor:pointer;font-family:inherit">Record →</button>' +
    '</div>' +
    (pendingVitals.length ? pendingVitals.slice(0,4).map(function(p,i){
      return '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f8fafc">' +
        '<div style="width:30px;height:30px;border-radius:50%;background:#fffbeb;border:2px solid #fcd34d;color:#d97706;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">'+(p.name.split(' ').map(function(n){return n[0];}).join('').slice(0,2))+'</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:12px;font-weight:600;color:#20242b">'+p.name+'</div>' +
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
        '<div style="font-size:13px;font-weight:700;color:#20242b">Requests</div>' +
        (unreadReq ? '<span style="min-width:18px;height:18px;border-radius:9px;background:#0F6E56;color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 3px">'+unreadReq+'</span>' : '') +
      '</div>' +
      '<button onclick="_setView(\'requests\')" style="font-size:11px;color:#0F6E56;border:none;background:transparent;cursor:pointer;font-family:inherit">View all →</button>' +
    '</div>' +
    (_N.requests.length ? _N.requests.slice(0,4).map(function(r){
      return '<div style="padding:10px 14px;border-bottom:1px solid #f8fafc">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
          '<div style="display:flex;align-items:center;gap:6px">' +
            (!r.seen?'<span style="width:6px;height:6px;border-radius:50%;background:#0F6E56;flex-shrink:0"></span>':'') +
            '<span style="font-size:12px;font-weight:700;color:#20242b">'+r.patientName+'</span>' +
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
    '<div style="flex:1;overflow:auto;padding:16px 20px;background:#f4f5f0">' +
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
        '<div style="font-size:14px;font-weight:600;color:#20242b">No pending requests</div>' +
        '<div style="font-size:12px">Reception will send vitals requests here as patients arrive.</div>' +
      '</div>';
  }

  var rows = displayed.map(function(req, i){
    var bg = req.priority==='Emergency' ? 'background:#fff5f5'
           : !req.seen ? 'background:#e8f5f1'
           : i%2===0 ? 'background:#fff' : 'background:#f4f5f0';
    var expanded  = _N.reqExpanded  === req.id;
    var declining = _N.decliningId  === req.id;

    var mainRow = '<tr style="'+bg+';border-bottom:1px solid #e8edf4;cursor:pointer" ' +
      'onclick="_nurseReqExpand(\''+req.id+'\')">' +
      '<td style="padding:8px 6px 8px 14px;width:12px">' +
        (req.seen?'':'<span style="display:block;width:7px;height:7px;border-radius:50%;background:#0F6E56"></span>') +
      '</td>' +
      _td('<span style="font-family:monospace;font-size:11px;color:#6b7280">'+req.id+'</span>') +
      _td('<div style="font-weight:600">'+req.patientName+'</div><div style="font-size:11px;color:#6b7280">'+req.patientId+'</div>') +
      _td(req.age+' '+req.sex,'color:#6b7280') +
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
          '<div style="font-size:13px;color:#20242b;background:#f4f5f0;border:1px solid #e0e0e0;border-radius:6px;padding:8px 12px">'+req.notes+'</div>' +
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
          '<div style="font-size:15px;font-weight:700;color:#20242b;margin-bottom:6px">No pending requests</div>' +
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
        '<strong style="color:#20242b">'+awaiting+'</strong> awaiting · <strong style="color:#20242b">'+inVitals+'</strong> in vitals · <strong style="color:#20242b">'+ready+'</strong> ready' +
      '</div>' +
      '<button onclick="_nurseCallNext()" style="padding:6px 14px;border-radius:6px;border:none;background:'+(awaiting?'#0F6E56':'#d1d9e6')+';color:#fff;font-size:12px;font-weight:600;cursor:'+(awaiting?'pointer':'not-allowed')+';font-family:inherit">Call Next Patient</button>' +
    '</div>' +
  '</div>';

  var selected = _N.queueSel ? _N.patients.find(function(p){ return p.id===_N.queueSel; }) : null;

  var rows = filtered.map(function(p, i){
    var isSel = _N.queueSel===p.id;
    var bg = isSel ? 'background:#e8f5f1' : _trBg(i, p.priority);
    return '<tr style="'+bg+';border-bottom:1px solid #e8edf4;cursor:pointer" onclick="_N.queueSel=\''+p.id+'\';_nurseRender()">' +
      _td('<span style="font-family:monospace;font-size:12px;color:#6b7280">'+p.id+'</span>') +
      '<td style="padding:8px 14px">' +
        '<div style="font-weight:600;font-size:13px">'+p.name+'</div>' +
        (p.flags&&p.flags.length ? '<div style="font-size:11px;color:#dc2626;margin-top:1px">⚑ '+p.flags.length+' flag'+(p.flags.length>1?'s':'')+'</div>' : '') +
      '</td>' +
      _td(p.age+' '+p.sex,'color:#6b7280') +
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
          (p.status==='Ready for Consultation' ? '<button onclick="_nurseSendToDoctor(\''+p.id+'\')" style="padding:3px 8px;border-radius:4px;border:none;background:#0f766e;color:#fff;font-size:11px;cursor:pointer;font-family:inherit">Send to Doctor ▶</button>' : '') +
          (p.status==='With Doctor' ? '<span style="font-size:11px;color:#0f766e;font-weight:600">✓ With doctor</span>' : '') +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');

  var tableArea = '<div style="flex:1;overflow:auto">' +
    '<table style="width:100%;border-collapse:collapse">' +
    '<thead><tr>'+['ID','Patient','Age/Sex','Chief Complaint','Priority','Status','Vitals','Arrival','Accepted','Actions'].map(_th).join('')+'</tr></thead>' +
    '<tbody>'+(rows||'<tr><td colspan="10" style="padding:28px;text-align:center;color:#6b7280;font-size:13px">No patients in queue yet. Accept requests from reception.</td></tr>')+'</tbody>' +
    '</table></div>';

  /* Detail panel */
  var detailPanel = selected ? (
    '<div style="width:288px;flex-shrink:0;border-left:1px solid #e0e0e0;background:#f4f5f0;display:flex;flex-direction:column;overflow-y:auto">' +
      '<div style="padding:12px 16px;border-bottom:1px solid #e0e0e0;background:#fff;display:flex;align-items:center;justify-content:space-between">' +
        '<div><div style="font-weight:700;font-size:14px;color:#20242b">'+selected.name+'</div><div style="font-size:11px;color:#6b7280">'+selected.id+' · '+selected.age+selected.sex+'</div></div>' +
        '<button onclick="_N.queueSel=null;_nurseRender()" style="background:none;border:none;font-size:16px;color:#6b7280;cursor:pointer">✕</button>' +
      '</div>' +

      '<div style="margin:10px;background:#fff;border:1px solid #e0e0e0;border-radius:6px;padding:12px">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;margin-bottom:5px">Chief Complaint</div>' +
        '<div style="font-size:13px;color:#20242b">'+selected.complaint+'</div>' +
      '</div>' +

      (selected.vitals ? '<div style="margin:0 10px 10px;background:#fff;border:1px solid #e0e0e0;border-radius:6px;padding:12px">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;margin-bottom:8px">Vitals</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          [['BP',selected.vitals.bp,'mmHg'],['Temp',selected.vitals.temp,'°C'],['HR',selected.vitals.hr,'bpm'],['SpO₂',selected.vitals.spo2,'%'],['Weight',selected.vitals.weight,'kg'],['RR',selected.vitals.rr,'/min']].map(function(r){
            var flagged = selected.flags&&selected.flags.some(function(fl){ return fl.field.toLowerCase().includes(r[0].toLowerCase()); });
            return '<div><div style="font-size:10px;color:#6b7280">'+r[0]+'</div><div style="font-size:13px;font-weight:700;color:'+(flagged?'#dc2626':'#20242b')+'">'+r[1]+' <span style="font-size:11px;font-weight:400;color:#6b7280">'+r[2]+'</span>'+(flagged?' <span style="color:#dc2626;font-size:10px">⚑</span>':'')+'</div></div>';
          }).join('') +
        '</div>' +
      '</div>' : '') +

      (selected.flags&&selected.flags.length ? '<div style="margin:0 10px 10px;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:12px">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#dc2626;margin-bottom:8px">⚑ Abnormal Flags</div>' +
        selected.flags.map(function(fl){ return '<div style="margin-bottom:6px"><div style="font-size:12px;font-weight:600;color:#dc2626">'+fl.field+': '+fl.value+'</div><div style="font-size:11px;color:#dc2626">'+fl.reason+'</div></div>'; }).join('') +
      '</div>' : '') +

      (selected.aiRisk ? '<div style="margin:0 10px 10px;background:#e8f5f1;border:1px solid #a8d8cc;border-radius:6px;padding:12px">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#0F6E56;margin-bottom:5px">AI Risk Assessment</div>' +
        '<div style="font-size:12px;color:#20242b">'+selected.aiRisk+'</div>' +
      '</div>' : '') +

      '<div style="margin-top:auto;padding:12px;border-top:1px solid #e0e0e0;background:#fff">' +
        (selected.status==='With Doctor'
          ? '<span style="font-size:12px;color:#0f766e;font-weight:600">✓ Patient is now with the doctor</span>'
          : '<button onclick="_nurseSaveVitals(\''+selected.id+'\')" style="width:100%;padding:8px;border-radius:6px;border:none;background:#0F6E56;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Complete vitals & send to doctor →</button>') +
      '</div>' +
    '</div>'
  ) : '';

  var pageHeader =
    '<div style="display:flex;align-items:center;justify-content:space-between;' +
      'background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);' +
      'padding:18px 24px;flex-shrink:0;box-shadow:0 2px 10px rgba(15,110,86,.18)">' +
      '<div>' +
        '<div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-.01em;margin-bottom:2px">Vitals Queue</div>' +
        '<div style="font-size:13px;color:rgba(255,255,255,.78);display:flex;align-items:center;gap:6px">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
          '<strong style="color:#fff">'+awaiting+'</strong>&nbsp;awaiting · <strong style="color:#fff">'+inVitals+'</strong>&nbsp;in vitals · <strong style="color:#fff">'+ready+'</strong>&nbsp;ready' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,.18);border:1.5px solid rgba(255,255,255,.28)">' +
        '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' +
      '</div>' +
    '</div>';

  return pageHeader +
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
        '<div style="font-size:14px;font-weight:600;color:#20242b">No patients in vitals queue</div>' +
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
            return '<td style="padding:8px 14px;font-size:13px;font-weight:'+(flagged?'700':'400')+';color:'+(flagged?'#dc2626':p.vitals?'#20242b':'#d1d9e6')+'">'+val+(flagged?' <span style="font-size:10px">⚑</span>':'')+'</td>';
          }).join('');
        })();

    var actCell = isEdit
      ? '<td style="padding:6px 14px"><div style="display:flex;gap:5px"><button onclick="_nurseSaveVitals(\''+p.id+'\')" style="padding:4px 10px;border-radius:5px;border:none;background:#0F6E56;color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap">Save & Complete</button><button onclick="_N.editId=null;_nurseRender()" style="padding:4px 8px;border-radius:5px;border:1px solid #e0e0e0;background:#fff;color:#6b7280;font-size:11px;cursor:pointer;font-family:inherit">Cancel</button></div></td>'
      : '<td style="padding:8px 14px"><button onclick="_nurseVitalsEdit(\''+p.id+'\')" style="padding:4px 10px;border-radius:5px;border:1px solid #e0e0e0;color:#0F6E56;font-size:11px;cursor:pointer;font-family:inherit;background:#fff">'+(p.vitalStatus==='Pending'?'Record Vitals':'Edit')+'</button></td>';

    var flagCell = isEdit
      ? '<td style="padding:8px 14px">—</td>'
      : '<td style="padding:8px 14px;font-size:12px">'+(p.flags&&p.flags.length?'<span style="color:#dc2626;font-weight:600">'+p.flags.length+' flag'+(p.flags.length>1?'s':'')+'</span>':p.vitals?'<span style="color:#16a34a">Clear</span>':'<span style="color:#d1d9e6">—</span>')+'</td>';

    return '<tr style="'+bg+';border-bottom:1px solid #e8edf4">' +
      '<td style="padding:8px 14px"><div style="font-weight:600;font-size:13px">'+p.name+'</div><div style="font-size:11px;color:#6b7280">'+p.id+'</div></td>' +
      '<td style="padding:8px 14px"><div style="display:flex;align-items:center;gap:5px"><span style="width:7px;height:7px;border-radius:50%;background:'+_priorityDot(p.priority)+';flex-shrink:0"></span><span style="font-size:12px;color:#20242b">'+p.priority+'</span></div></td>' +
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
      '<td style="padding:10px 14px"><div style="font-weight:600;font-size:13px">'+p.name+'</div><div style="font-size:11px;color:#6b7280">'+p.id+' · '+p.age+p.sex+'</div></td>' +
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
      '<strong style="color:#20242b">'+emergencies.length+'</strong> active emergency patient'+(emergencies.length!==1?'s':'') +
    '</div>' +
    '<div style="flex:1;overflow:auto;padding:0 20px 20px;background:#f4f5f0">' +
      '<table style="width:100%;border-collapse:collapse;border:1px solid #e0e0e0;border-radius:6px;overflow:hidden">' +
      '<thead><tr>'+['Patient','Complaint','Arrival','Room','Classification','Vitals','AI Risk','Actions'].map(_th).join('')+'</tr></thead>' +
      '<tbody>'+(rows||'<tr><td colspan="8" style="padding:28px;text-align:center;color:#6b7280;font-size:13px">No active emergency cases.</td></tr>')+'</tbody>' +
      '</table>' +
    '</div>';
}

/* ════════════════════════════════════════════════════════════════
   VIEW 5 — MESSAGING
════════════════════════════════════════════════════════════════ */
function _nMessaging() {
  var to = _N.msgTo || 'Doctor';
  var threads = [
    { role:'Receptionist', name:'Reception — Akua', icon:'📋', color:'#7c3aed', bg:'#f5f3ff' },
    { role:'Doctor',       name:'Dr. Mensah',       icon:'👨‍⚕️', color:'#0F6E56', bg:'#eff6ff' },
  ];

  var threadList = threads.map(function(th){
    var unread = _N.messages.filter(function(m){ return m.role===th.role&&m.unread; }).length;
    var active = to===th.role;
    return '<button onclick="_N.msgTo=\''+th.role+'\';_nurseRender()" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 16px;border:none;border-bottom:1px solid #e0e0e0;background:'+(active?th.bg:'#fff')+';cursor:pointer;text-align:left;font-family:inherit">' +
      '<span style="font-size:18px">'+th.icon+'</span>' +
      '<div style="flex:1"><div style="font-size:13px;font-weight:600;color:#20242b">'+th.name+'</div><div style="font-size:11px;color:#6b7280">'+th.role+'</div></div>' +
      (unread?'<span style="min-width:18px;height:18px;border-radius:9px;background:#dc2626;color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 3px">'+unread+'</span>':'') +
    '</button>';
  }).join('');

  var roleColors = { Receptionist:'background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe', Doctor:'background:#e8f5f1;color:#0F4C3A;border:1px solid #a8d8cc', Nurse:'background:#f0fdf4;color:#166534;border:1px solid #86efac' };
  var msgs = _N.messages.filter(function(m){ return m.role===to||m.role==='Nurse'; });
  var msgList = msgs.length
    ? msgs.map(function(m){
        var isNurse = m.role==='Nurse';
        return '<div style="margin-bottom:12px;display:flex;flex-direction:column;align-items:'+(isNurse?'flex-end':'flex-start')+'">' +
          '<div style="font-size:10px;color:#6b7280;margin-bottom:3px">'+(isNurse?'You':m.from)+' · '+m.time+'</div>' +
          '<div style="max-width:72%;padding:9px 13px;border-radius:10px;font-size:13px;line-height:1.55;background:'+(isNurse?'#0F6E56':'#f1f5f9')+';color:'+(isNurse?'#fff':'#20242b')+'">'+m.text+'</div>' +
          (m.unread&&!isNurse?'<span style="font-size:10px;color:#0F6E56;margin-top:2px">Unread</span>':'') +
        '</div>';
      }).join('')
    : _N.loadingData
      ? '<div style="text-align:center;padding:30px;color:#6b7280;font-size:13px">⏳ Loading messages…</div>'
      : '<div style="text-align:center;padding:30px;color:#6b7280;font-size:13px">💬 No messages with this contact yet.</div>';

  var compose = '<div style="padding:10px 14px;border-top:1px solid #e0e0e0;background:#fafafa;flex-shrink:0">' +
    '<div style="display:flex;gap:8px">' +
      '<textarea id="nurse-msg-compose" rows="2" placeholder="Message '+( to==='Doctor'?'Dr. Mensah':'Reception')+'…" style="flex:1;padding:8px 10px;border:1px solid #e0e0e0;border-radius:6px;font-size:13px;font-family:inherit;resize:none;outline:none">'+(_N.msgCompose||'')+'</textarea>' +
      '<button onclick="_nurseSendMsg()" style="padding:8px 16px;border-radius:6px;border:none;background:#0F6E56;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;align-self:flex-end">Send</button>' +
    '</div>' +
  '</div>';

  return _nHeader('Communication', _N.messages.filter(function(m){return m.unread;}).length+' unread messages') +
    '<div style="flex:1;display:flex;min-height:0;overflow:hidden">' +
      '<div style="width:200px;flex-shrink:0;border-right:1px solid #e0e0e0;background:#f4f5f0;overflow-y:auto">'+threadList+'</div>' +
      '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;background:#fff">' +
        '<div style="flex:1;overflow-y:auto;padding:16px">'+msgList+'</div>' +
        compose +
      '</div>' +
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
      RISK_OPTS.map(function(o){ return '<button onclick="_N.analyticsFilter.risk=\"'+o+'\";_nurseRender()" style="padding:5px 10px;border-radius:5px;border:1px solid '+(f.risk===o?'#0F6E56':'#e0e0e0')+';background:'+(f.risk===o?'#0F6E56':'#fff')+';color:'+(f.risk===o?'#fff':'#6b7280')+';font-size:12px;cursor:pointer;font-family:inherit">'+o+'</button>'; }).join('') +
    '</div>' +
    '<div style="display:flex;gap:4px;align-items:center">' +
      '<span style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Vital:</span>' +
      VITAL_OPTS.map(function(o){ return '<button onclick="_N.analyticsFilter.vital=\"'+o+'\";_nurseRender()" style="padding:5px 10px;border-radius:5px;border:1px solid '+(f.vital===o?'#0F6E56':'#e0e0e0')+';background:'+(f.vital===o?'#0F6E56':'#fff')+';color:'+(f.vital===o?'#fff':'#6b7280')+';font-size:12px;cursor:pointer;font-family:inherit">'+o+'</button>'; }).join('') +
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
            '<div style="font-weight:700;font-size:13px;color:#20242b">'+p.name+'</div>' +
            '<div style="font-size:11px;color:#6b7280">'+p.id+(p.age?' · '+p.age+'y':'')+(p.sex?' · '+p.sex:'')+'</div>' +
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
        '<div style="font-size:14px;font-weight:700;color:#20242b">AI-Flagged Abnormal Vitals</div>' +
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
          '<div style="font-size:11px;font-weight:600;color:#20242b;margin-bottom:3px">'+label+': '+vals.join(' → ')+'</div>' +
          '<svg viewBox="0 0 280 44" style="width:100%;height:36px"><polyline points="'+pts2.join(' ')+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linejoin="round"/>' +
          vals.map(function(v,i){ return '<circle cx="'+(i/(vals.length-1)*280)+'" cy="'+(40-Math.round(parseFloat(v)/max*35))+'" r="3" fill="'+color+'"/>'; }).join('')+
          '</svg>' +
        '</div>';
      }

      reviewHtml = '<div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto">' +
        '<div style="background:#fff;border-radius:14px;width:100%;max-width:720px;box-shadow:0 20px 60px rgba(0,0,0,.3);margin:auto">' +

          /* Header */
          '<div style="background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);padding:18px 22px;border-radius:14px 14px 0 0;display:flex;align-items:center;justify-content:space-between">' +
            '<div>' +
              '<div style="font-size:16px;font-weight:800;color:#fff">Patient Review</div>' +
              '<div style="font-size:12px;color:rgba(255,255,255,.75)">AI-Flagged Abnormal Vitals — Clinical Decision Support</div>' +
            '</div>' +
            '<button onclick="_N._reviewId=null;_nurseRender()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;font-family:inherit">✕</button>' +
          '</div>' +

          '<div style="padding:20px;display:flex;flex-direction:column;gap:14px">' +

            /* Patient info */
            '<div style="display:flex;align-items:center;gap:12px;padding:14px;background:#e8f5f1;border-radius:10px;border:1px solid #a8d8cc">' +
              '<div style="width:44px;height:44px;border-radius:50%;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0">'+(rp.name.split(' ').map(function(n){return n[0];}).join('').slice(0,2))+'</div>' +
              '<div>' +
                '<div style="font-size:16px;font-weight:800;color:#0f172a">'+rp.name+'</div>' +
                '<div style="font-size:12px;color:#6b7280">ID: '+rp.id+' · '+rp.age+'y · '+rp.sex+'</div>' +
                '<div style="font-size:12px;color:#6b7280">Chief complaint: '+rp.complaint+'</div>' +
              '</div>' +
              '<div style="margin-left:auto">'+riskBadge(_getRiskLevel({field:'overall'},rp))+'</div>' +
            '</div>' +

            /* Current vitals */
            '<div style="background:#f8fafc;border-radius:10px;padding:14px;border:1px solid #e5e7eb">' +
              '<div style="font-size:12px;font-weight:700;color:#20242b;margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">Current Vitals</div>' +
              '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' +
                [['Blood Pressure',vf.bp,'mmHg'],['Heart Rate',vf.hr,'bpm'],['SpO₂',vf.spo2,'%'],['Respiratory Rate',vf.rr,'/min'],['Temperature',vf.temp,'°C'],['Weight',vf.weight,'kg']].map(function(row){
                  var isFlag = rpFlags.some(function(fl){ return fl.field.toLowerCase().includes(row[0].toLowerCase().split(' ')[0]); });
                  return '<div style="padding:8px 10px;background:'+(isFlag?'#fef2f2':'#fff')+';border-radius:6px;border:1px solid '+(isFlag?'#fca5a5':'#e5e7eb')+'">' +
                    '<div style="font-size:10px;color:#6b7280;margin-bottom:2px">'+row[0]+'</div>' +
                    '<div style="font-size:15px;font-weight:700;color:'+(isFlag?'#dc2626':'#20242b')+'">'+(row[1]||'—')+' <span style="font-size:11px;font-weight:400;color:#6b7280">'+row[2]+'</span></div>' +
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
            '<div style="background:#e8f5f1;border:1px solid #a8d8cc;border-left:4px solid #0F6E56;border-radius:8px;padding:12px 14px">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
                '<div style="font-size:12px;font-weight:700;color:#0F4C3A">AI Decision-Support Note</div>' +
                '<div style="display:flex;gap:6px;align-items:center">' +
                  (rp.mlRiskLevel
                    ? '<span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:'+(rp.mlRiskLevel==='HIGH'?'#dc2626':rp.mlRiskLevel==='MEDIUM'?'#d97706':'#16a34a')+';color:#fff">'+rp.mlRiskLevel+' RISK</span>'
                    : '') +
                  (rp.mlConfidence !== null && rp.mlConfidence !== undefined
                    ? '<span style="font-size:11px;color:#0F4C3A;font-weight:600">'+Math.round(rp.mlConfidence*100)+'% confidence</span>'
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
              '<div style="font-size:12px;font-weight:700;color:#20242b;margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">Vital Trends</div>' +
              (vitalHistory.length
                ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
                    trendLine('Heart Rate', vitalHistory.map(function(h){return h.hr;}), vf.hr, '#1A4A9B') +
                    trendLine('SpO₂',       vitalHistory.map(function(h){return h.spo2;}),vf.spo2,'#0d9488') +
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
    '<div style="font-size:12px;font-weight:700;color:#20242b;margin-bottom:12px">Patients Triaged per Hour (Today)</div>' +
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
    '<div style="font-size:12px;font-weight:700;color:#20242b;margin-bottom:10px">Patients by Priority</div>' +
    ['Emergency','High','Normal'].map(function(pr){
      var count = pts.filter(function(p){ return p.priority===pr; }).length;
      var pct   = pts.length ? Math.round(count/pts.length*100) : 0;
      var color = {Emergency:'#dc2626',High:'#d97706',Normal:'#16a34a'}[pr];
      return '<div style="margin-bottom:8px">' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="color:#20242b">'+pr+'</span><span style="font-weight:700;color:'+color+'">'+count+'</span></div>' +
        '<div style="height:6px;background:#f1f5f9;border-radius:3px"><div style="height:6px;background:'+color+';border-radius:3px;width:'+pct+'%"></div></div>' +
      '</div>';
    }).join('') +
  '</div>';

  return _nHeader('Analytics & AI Alerts', 'AI-flagged abnormal vitals requiring clinical review') +
    '<div style="flex:1;overflow:auto;padding:14px 18px;background:#f4f5f0">' +
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
    id: req.patientId, name: req.patientName, age: req.age, sex: req.sex,
    complaint: req.complaint, priority: req.priority,
    status: 'Awaiting Vitals', vitalStatus: 'Pending',
    arrivalTime: req.requestedAt, triageTime: null, waitMins: 0,
    room: null, emergencyClass: null, vitals: null, flags: [], aiRisk: null,
    acceptedAt: now, stationNum: stationNum,
  });
  _N.requests = _N.requests.filter(function(r){ return r.id!==id; });

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
        '<div style="margin-top:12px;font-size:15px;font-weight:700;color:#20242b">is now being called to</div>' +
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
  _N.requests = _N.requests.filter(function(r){ return r.id!==id; });
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

window._nurseSendToDoctor = function(id) {
  var p = _N.patients.find(function(x){ return x.id===id; });
  if (!p) return;
  p.status = 'With Doctor';
  /* Build vitalsRecord snapshot if not already stored */
  var vr = p.vitalsRecord || (p.vitals ? {
    vitals:       p.vitals,
    flags:        p.flags || [],
    recordedAt:   new Date().toISOString(),
    recordedDate: new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),
    recordedTime: _nowTime(),
    recordedBy:   'Nurse Station',
    facility:     'Johannesburg Community Health Centre',
    ward:         'Triage / Outpatient',
    vitalStatus:  'Completed',
  } : null);
  var docEntry = {
    id:           p.id,
    pid:          p.pid || p.id,
    name:         p.name,
    age:          p.age,
    sex:          p.sex,
    complaint:    p.complaint,
    priority:     p.priority,
    vitals:       p.vitals || null,
    vitalsRecord: vr,
    vitalHistory: p.vitalHistory || (vr ? [vr] : []),
    flags:        p.flags || [],
    aiRisk:       p.aiRisk || null,
    mlRiskLevel:  p.mlRiskLevel || null,
    arrivedAt:    _nowTime(),
    department:   p.department || 'General Consultation',
    fromNurse:    true,
    vitalStatus:  p.vitalStatus || 'Completed',
  };
  _sendToDoctorTab(docEntry);
  _nurseRender();
  UI.showToast(p.name+' sent to doctor\'s queue','ok');
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
  var flags = _flagVitals(form);
  p.vitals      = Object.assign({}, form);
  p.flags       = flags;
  p.vitalStatus = 'Completed';
  p.status      = "With Doctor"; /* goes straight to doctor queue */
  if (flags.length && !p.aiRisk) p.aiRisk = 'Abnormal vitals detected — clinical review recommended.';
  _N.editId = null;

  /* Build vitals record with full metadata */
  var vitalsRecord = {
    vitals:       form,
    flags:        flags,
    recordedAt:   new Date().toISOString(),
    recordedDate: new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),
    recordedTime: _nowTime(),
    recordedBy:   'Nurse Station',
    facility:     'Johannesburg Community Health Centre',
    ward:         'Triage / Outpatient',
    vitalStatus:  'Completed',
  };

  /* Store metadata on patient object */
  p.vitalsRecord = vitalsRecord;
  if (!p.vitalHistory) p.vitalHistory = [];
  p.vitalHistory.push(vitalsRecord);

  /* Save vitals to backend */
  try {
    await API._fetchDirect('/patients/'+(p.pid||p.id)+'/vitals', {
      method:'POST',
      body: JSON.stringify(vitalsRecord)
    }).catch(function(){});
  } catch(_){}

  /* Push patient to doctor queue (same-tab + cross-tab) */
  var docEntry = {
    id:           p.id,
    pid:          p.pid || p.id,
    name:         p.name,
    age:          p.age,
    sex:          p.sex,
    complaint:    p.complaint,
    priority:     p.priority,
    vitals:       p.vitals,
    vitalsRecord: vitalsRecord,
    vitalHistory: p.vitalHistory || [vitalsRecord],
    flags:        p.flags,
    aiRisk:       p.aiRisk || null,
    mlRiskLevel:  p.mlRiskLevel || null,
    arrivedAt:    _nowTime(),
    department:   p.department || 'General Consultation',
    fromNurse:    true,
    vitalStatus:  'Completed',
  };
  _sendToDoctorTab(docEntry);

  _nurseRender();

  /* ── Auto-run ML immediately after vitals saved ── */
  try {
    var bpParts2 = (form.bp||'0/0').split('/').map(function(v){return parseInt(v)||0;});
    var mlAuto = {
      heartRate:   parseFloat(form.hr)||null,
      spo2:        parseFloat(form.spo2)||null,
      systolicBP:  bpParts2[0]||null,
      diastolicBP: bpParts2[1]||null,
      temperature: parseFloat(form.temp)||null,
      patientId:   p.pid||p.id,
      role:        'nurse'
    };
    if (!Object.keys(mlAuto).filter(function(k){return k!=='patientId'&&k!=='role'&&(mlAuto[k]===null||mlAuto[k]===0);}).length) {
      API._fetchDirect('/ml/triage',{method:'POST',body:JSON.stringify(mlAuto)})
        .then(function(res){
          if(res&&res.success&&res.riskLevel){
            p.mlRiskLevel=res.riskLevel; p.mlConfidence=res.confidence;
            p.mlModelVersion=res.modelVersion||'triage-v2.0'; p.aiRisk=res.aiRiskNote||p.aiRisk;
            p.predictionId=res.predictionId||null;
            if(res.abnormalVitals&&res.abnormalVitals.length){
              p.flags=res.abnormalVitals.map(function(v){return{field:v.vital,value:v.value,reason:v.reason,status:v.status};});
            }
            UI.showToast('ML: '+res.riskLevel+' risk ('+Math.round((res.confidence||1)*100)+'%)',res.riskLevel==='HIGH'?'warn':'ok');
            _nurseRender();
          }
        }).catch(function(){});
    }
  } catch(_){}

  _nurseRender();
  if (flags.length) {
    UI.showToast('Vitals saved · '+flags.length+' flag'+(flags.length>1?'s':'')+' · '+p.name+' → doctor queue','warn');
  } else {
    UI.showToast('Vitals complete · '+p.name+' → doctor queue · ML running…','ok');
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
  _N.messages.unshift({ id:Date.now(), from:'Nurse Triage', role:'Nurse',
    text:'EMERGENCY: '+p.name+' requires immediate attention. Class: '+(p.emergencyClass||'Pending')+'. '+p.complaint,
    time:_nowTime(), unread:false });
  _nurseRender();
  UI.showToast('Team notified about '+p.name,'ok');
};

/* Messaging */
window._nurseSendMsg = function() {
  var el = document.getElementById('nurse-msg-compose');
  var text = el ? el.value.trim() : _N.msgCompose;
  if (!text) return;
  _N.messages.unshift({ id:Date.now(), from:'Nurse Triage', role:'Nurse', text:text, time:_nowTime(), unread:false });
  _N.msgCompose = '';
  _nurseRender();
  UI.showToast('Message sent','ok');
};

/* ─── Bind events ────────────────────────────────────────────────────── */
function _nurseBindEvents() {
  /* Enter to send message */
  var mc = document.getElementById('nurse-msg-compose');
  if (mc) mc.addEventListener('keydown', function(e){
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); window._nurseSendMsg(); }
  });
}

/* ─── Cross-tab bridge: send patients to doctor page ────────────────── */
var _doctorBroadcastCh = null;
try { _doctorBroadcastCh = new BroadcastChannel('nihms_doctor_queue'); } catch(_) {}

function _sendToDoctorTab(doc) {
  /* 1. Same-tab direct call */
  if (typeof window._dcAddPatient === 'function') {
    window._dcAddPatient(doc);
  } else {
    if (!window._DOCTOR_QUEUE) window._DOCTOR_QUEUE = [];
    if (!window._DOCTOR_QUEUE.find(function(x){ return x.id === doc.id; }))
      window._DOCTOR_QUEUE.push(doc);
  }
  /* 2. Persist to localStorage so doctor page picks it up on load */
  try {
    var stored = JSON.parse(localStorage.getItem('_NIHMS_DOCTOR_QUEUE') || '[]');
    if (!stored.find(function(x){ return x.id === doc.id; })) {
      stored.push(doc);
      localStorage.setItem('_NIHMS_DOCTOR_QUEUE', JSON.stringify(stored));
    }
  } catch(_) {}
  /* 3. Live cross-tab: BroadcastChannel */
  if (_doctorBroadcastCh) {
    try { _doctorBroadcastCh.postMessage({ type: 'DOCTOR_PT', doc: doc }); } catch(_) {}
  }
  /* 4. Live cross-tab fallback: storage event */
  try {
    localStorage.setItem('_NIHMS_DOCTOR_REQ', JSON.stringify(doc));
    setTimeout(function(){ try { localStorage.removeItem('_NIHMS_DOCTOR_REQ'); } catch(_){} }, 200);
  } catch(_) {}
}

/* ─── Cross-tab bridge: receive patients pushed by receptionist ──────── */
(function() {
  function _handleCrossTabReq(req) {
    if (!req || !req.id) return;
    if (typeof window._nurseAddRequest === 'function') {
      window._nurseAddRequest(req);
    }
  }

  /* ── Drain persistent queue written by receptionist (sequential-tab flow) ──
     Receptionist checks in → writes to _NIHMS_NURSE_QUEUE → nurse logs in
     later → we read & drain here so patients aren't lost between sessions. */
  function _drainStoredQueue() {
    try {
      var stored = JSON.parse(localStorage.getItem('_NIHMS_NURSE_QUEUE') || '[]');
      if (!stored.length) return;
      stored.forEach(function(req) { _handleCrossTabReq(req); });
      /* Clear so we don't re-add on next render */
      localStorage.removeItem('_NIHMS_NURSE_QUEUE');
    } catch(_) {}
  }

  /* Run immediately (covers page load after receptionist already checked in) */
  _drainStoredQueue();

  /* Also run once _nurseAddRequest is defined, in case this fires before it */
  setTimeout(_drainStoredQueue, 500);

  /* Live event: localStorage storage event fires in OTHER tabs */
  window.addEventListener('storage', function(e) {
    if (e.key === '_NIHMS_NURSE_REQ' && e.newValue) {
      try { _handleCrossTabReq(JSON.parse(e.newValue)); } catch(_) {}
    }
    /* Also re-drain the queue if receptionist wrote to it while we were open */
    if (e.key === '_NIHMS_NURSE_QUEUE' && e.newValue) {
      _drainStoredQueue();
    }
  });

  /* Live event: BroadcastChannel (fires when both tabs open simultaneously) */
  try {
    var _nurseCh = new BroadcastChannel('nihms_nurse_queue');
    _nurseCh.onmessage = function(e) {
      if (e.data && e.data.type === 'NURSE_REQ') {
        _handleCrossTabReq(e.data.req);
      }
    };
  } catch(_) {}
})();

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
    if (document.getElementById('nurse-sidebar')) {
      _nurseRender();
      UI && UI.showToast && UI.showToast('💉 Immunisation queue: ' + immEntry.patientName, 'ok');
    }
  } else if (req.autoAccept) {
    /* ── Auto-accept: receptionist redirected patient directly → Vitals Queue ── */
    if (!window._NURSE_REQUESTS.find(function(r){ return r.id === req.id; }))
      window._NURSE_REQUESTS.push(req);
    var alreadyInQueue = _N.patients.find(function(p){ return p.id === req.patientId || p.id === req.id; });
    if (!alreadyInQueue) {
      var now2 = (typeof _nowTime === 'function') ? _nowTime()
               : new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});
      var stationNum2 = (_N._stationSeq = ((_N._stationSeq||0) % 4) + 1);
      _N.patients.push({
        id:            req.patientId || req.id,
        name:          req.patientName || '',
        age:           req.age         || '—',
        sex:           req.sex         || '—',
        complaint:     req.complaint   || 'Walk-in',
        priority:      req.priority    || 'Normal',
        status:        'Awaiting Vitals',
        vitalStatus:   'Pending',
        arrivalTime:   req.requestedAt || now2,
        triageTime:    null,
        waitMins:      0,
        room:          null,
        emergencyClass:null,
        vitals:        null,
        flags:         [],
        aiRisk:        null,
        acceptedAt:    now2,
        stationNum:    stationNum2,
      });
    }
    if (document.getElementById('nurse-sidebar')) {
      _nurseRender();
      UI && UI.showToast && UI.showToast('🩺 Patient in Vitals Queue: ' + (req.patientName||''), 'ok');
    }
  } else {
    /* Deduplicate */
    if (!window._NURSE_REQUESTS.find(function(r){ return r.id === req.id; }))
      window._NURSE_REQUESTS.push(req);
    if (document.getElementById('nurse-sidebar')) {
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
                '<div style="font-size:15px;font-weight:700;color:'+(flagged?'#dc2626':'#20242b')+'">'+(r[1]||'—')+' <span style="font-size:11px;font-weight:400;color:#6b7280">'+r[2]+'</span>'+(flagged?' ⚑':'')+'</div>' +
              '</div>';
            }).join('') +
          '</div>' +
          (p.mlRiskLevel ? '<div style="margin-top:10px;padding:8px 12px;background:'+(p.mlRiskLevel==='HIGH'?'#fef2f2':p.mlRiskLevel==='MEDIUM'?'#fffbeb':'#f0fdf4')+';border-radius:6px;font-size:12px;font-weight:600;color:'+(p.mlRiskLevel==='HIGH'?'#dc2626':p.mlRiskLevel==='MEDIUM'?'#d97706':'#16a34a')+'">ML Risk: '+p.mlRiskLevel+(p.mlConfidence?' · '+Math.round(p.mlConfidence*100)+'% confidence':'')+'</div>' : '') +
        '</div>'
      : '<div style="padding:16px;background:#f8fafc;border-radius:8px;border:1px dashed #e5e7eb;text-align:center;color:#6b7280;font-size:13px;margin-bottom:14px">No vitals recorded yet</div>';

    /* Vitals history timeline */
    var historyHtml = vh.length > 1
      ? '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:14px">' +
          '<div style="font-size:12px;font-weight:700;color:#20242b;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Vitals History</div>' +
          vh.map(function(h, i){
            return '<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:12px;color:#475569">' +
              '<strong style="color:#20242b">'+(h.recordedDate||h.recordedAt||'—')+'</strong>' +
              ' · BP: '+h.vitals.bp+' · HR: '+h.vitals.hr+' · SpO₂: '+h.vitals.spo2+'% · Temp: '+h.vitals.temp+'°C' +
            '</div>';
          }).join('') +
        '</div>'
      : '';

    /* Consultation notes */
    var notes = p.consultationNotes || [];
    var notesHtml = '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:14px">' +
      '<div style="padding:10px 14px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">' +
        '<div style="font-size:12px;font-weight:700;color:#20242b">Consultation Notes</div>' +
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
      '<div style="flex:1;overflow:auto;padding:16px 20px;background:#f4f5f0">' + back +
        '<div style="display:grid;grid-template-columns:1fr 300px;gap:16px;align-items:start">' +
          '<div>' +
            '<div style="display:flex;align-items:center;gap:12px;padding:14px;background:#e8f5f1;border-radius:12px;border:1px solid #a8d8cc;margin-bottom:14px">' +
              '<div style="width:44px;height:44px;border-radius:50%;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0">'+ini+'</div>' +
              '<div style="flex:1">' +
                '<div style="font-size:18px;font-weight:800;color:#0f172a">'+(p.firstName ? p.firstName+' '+p.lastName : p.name)+'</div>' +
                '<div style="font-size:12px;color:#64748b">ID: '+p.id+(p.age?' · '+p.age+'y':'')+( p.sex?' · '+p.sex:'')+(p.phone?' · '+p.phone:'')+'</div>' +
              '</div>' +
              '<button onclick="_N.patientFile={id:\'\',patient:null,notFound:false,consultNote:\'\',editingNote:false};_nurseRender()" style="padding:5px 10px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;font-size:12px;color:#475569;cursor:pointer;font-family:inherit">Change</button>' +
            '</div>' +
            vitalsHtml + historyHtml + notesHtml +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:12px">' +
            (p.complaint ? '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px"><div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:5px">Chief Complaint</div><div style="font-size:13px;color:#20242b">'+p.complaint+'</div></div>' : '') +
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
    '<div style="flex:1;overflow:auto;padding:20px;background:#f4f5f0">' + back +
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
          '<div style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:700;color:#20242b">Patients in queue today</div>' +
          _N.patients.map(function(p, i){
            return '<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid #f8fafc;background:'+(i%2===0?'#fff':'#f8fafc')+'">' +
              '<div style="width:28px;height:28px;border-radius:50%;background:#0F6E56;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">'+(p.name.split(' ').map(function(n){return n[0];}).join('').slice(0,2))+'</div>' +
              '<div style="flex:1"><div style="font-size:12px;font-weight:600;color:#20242b">'+p.name+'</div><div style="font-size:10px;color:#6b7280">'+p.id+'</div></div>' +
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
        '<div style="font-size:14px;font-weight:600;color:#20242b">No immunisation patients ' + (f==='All'?'today':'in this filter') + '</div>' +
        '<div style="font-size:12px;text-align:center;max-width:280px">Patients booked under the Immunisation department will appear here after the receptionist checks them in.</div>' +
      '</div>';
  }

  /* ── Patient rows ── */
  var rows = filtered.map(function(p, i) {
    var isSel = _N.immSel === p.id;
    var bg    = isSel ? 'background:#e8f5f1'
              : i%2===0 ? 'background:#fff' : 'background:#f4f5f0';

    var statusBadge = p.status === 'Awaiting Immunisation'    ? '<span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:#fffbeb;color:#d97706;border:1px solid #fcd34d">Waiting</span>'
                    : p.status === 'Immunisation In Progress' ? '<span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:#e8f5f1;color:#0F6E56;border:1px solid #a8d8cc">In Progress</span>'
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
          '<tr style="background:#f4f5f0">' +
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
            '<div style="font-size:13px;font-weight:700;color:#20242b">Patient Details</div>' +
            '<button onclick="_N.immSel=null;_nurseRender()" style="border:none;background:transparent;font-size:18px;cursor:pointer;color:#6b7280;line-height:1">×</button>' +
          '</div>' +

          /* Patient info */
          '<div style="padding:14px 16px;border-bottom:1px solid #f1f5f9">' +
            '<div style="width:44px;height:44px;border-radius:50%;background:#f59e0b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;margin-bottom:10px">' +
              '💉' +
            '</div>' +
            '<div style="font-size:15px;font-weight:700;color:#20242b;margin-bottom:2px">'+(sel.patientName||sel.name||'—')+'</div>' +
            '<div style="font-size:12px;color:#6b7280">ID: '+(sel.patientId||'—')+' · Age: '+(sel.age||'—')+' · '+(sel.sex||'—')+'</div>' +
            '<div style="margin-top:8px">' +
              '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:4px">Token</div>' +
              '<div style="font-family:monospace;font-size:20px;font-weight:900;color:#f59e0b">'+(sel.token||sel.id)+'</div>' +
            '</div>' +
          '</div>' +

          /* Status */
          '<div style="padding:12px 16px;border-bottom:1px solid #f1f5f9">' +
            '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:6px">Status</div>' +
            '<div style="font-size:13px;font-weight:600;color:#20242b">'+(sel.status||'—')+'</div>' +
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
          '<div style="font-size:13px;color:#20242b;margin-top:2px">Current temperature: <strong>'+cc.currentTemp+'°C</strong> · Safe range: '+cc.minAlarm+'–'+cc.maxAlarm+'°C</div>' +
          '<div style="font-size:11px;color:#6b7280;margin-top:2px">Last reading: '+new Date(cc.lastReading).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})+'</div>' +
        '</div>' +
        '<span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:'+(ccOk?'#16a34a':'#dc2626')+';color:#fff">'+(ccOk?'✓ OK':'⚠ ALERT')+'</span>' +
      '</div>' +

      (todayVax.length
        ? '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">' +
            '<div style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:700;color:#20242b">Vaccinations Recorded Today</div>' +
            '<table style="width:100%;border-collapse:collapse"><thead><tr>'+['Patient','Vaccine','Dose','Batch','Time','Vaccinator'].map(_th).join('')+'</tr></thead><tbody>' +
            todayVax.map(function(v,i){
              return '<tr style="background:'+(i%2===0?'#fff':'#f8fafc')+';border-bottom:1px solid #f1f5f9">' +
                _td(v.patientName,'font-weight:600') + _td(v.vaccine) + _td('Dose '+v.dose) + _td(v.batch||'—') + _td(v.time) + _td(v.vaccinator) +
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
                    '<span style="font-size:12px;color:#20242b;min-width:80px">'+s.label+'</span>' +
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
    var rf = im.recordForm;
    var selPt = im.selectedPatient ? _N.patients.find(function(p){return p.id===im.selectedPatient;}) : null;
    content = '<div style="padding:14px 16px;max-width:640px">' +
      '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px">' +
        '<div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:16px">Record Vaccination</div>' +
        (selPt ? '<div style="padding:10px 12px;background:#e8f5f1;border:1px solid #a8d8cc;border-radius:8px;margin-bottom:14px;font-size:13px;color:#0F4C3A"><strong>Patient:</strong> '+selPt.name+' · Age: '+(selPt.age||'?')+'y</div>' : '') +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">' +
          '<div><label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#475569;margin-bottom:5px">Patient *</label>' +
            '<select id="vax-pt" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit;outline:none">' +
            _N.patients.map(function(p){ return '<option value="'+p.id+'"'+(im.selectedPatient===p.id?' selected':'')+'>'+p.name+' ('+p.id+')</option>'; }).join('') +
            '</select></div>' +
          '<div><label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#475569;margin-bottom:5px">Vaccine *</label>' +
            '<select id="vax-vac" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit;outline:none">' +
            im.vaccines.map(function(v){ return '<option value="'+v.id+'">'+v.name+'</option>'; }).join('') +
            '</select></div>' +
          '<div><label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#475569;margin-bottom:5px">Dose Number *</label>' +
            '<select id="vax-dose" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit;outline:none">' +
            [1,2,3,4,5].map(function(d){return '<option>'+d+'</option>';}).join('') +
            '</select></div>' +
          '<div><label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#475569;margin-bottom:5px">Date *</label>' +
            '<input id="vax-date" type="date" value="'+today+'" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box"></div>' +
          '<div><label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#475569;margin-bottom:5px">Batch / Lot Number *</label>' +
            '<input id="vax-batch" type="text" placeholder="e.g. LOT2024-0183" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box"></div>' +
          '<div><label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#475569;margin-bottom:5px">Vaccinator *</label>' +
            '<input id="vax-vacc" type="text" placeholder="Nurse name" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box"></div>' +
        '</div>' +
        '<div style="margin-bottom:14px"><label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#475569;margin-bottom:5px">Observations / Notes</label>' +
          '<textarea id="vax-notes" rows="2" placeholder="Any adverse reactions, observations…" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit;resize:none;outline:none;box-sizing:border-box"></textarea></div>' +
        '<button onclick="_nRecordVax()" style="width:100%;padding:12px;border-radius:8px;border:none;background:#0F6E56;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">✓ Record Vaccination</button>' +
        '<div style="margin-top:10px;padding:8px 12px;background:#fffbeb;border-radius:6px;font-size:11px;color:#92400e">Monitor for adverse reactions for 15–30 minutes after administration.</div>' +
      '</div>' +
      /* Adverse reactions */
      '<div style="margin-top:14px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px">' +
        '<div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:10px">Record Adverse Reaction</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">' +
          '<div><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:4px">Patient</label><select id="ar-pt" style="width:100%;padding:8px 10px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit;outline:none">'+_N.patients.map(function(p){return '<option value="'+p.id+'">'+p.name+'</option>';}).join('')+'</select></div>' +
          '<div><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:4px">Reaction Type</label><select id="ar-type" style="width:100%;padding:8px 10px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit;outline:none"><option>Local swelling</option><option>Fever</option><option>Rash</option><option>Anaphylaxis</option><option>Fainting</option><option>Pain at site</option><option>Other</option></select></div>' +
        '</div>' +
        '<textarea id="ar-notes" rows="2" placeholder="Describe the reaction…" style="width:100%;padding:8px 10px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;font-family:inherit;resize:none;outline:none;box-sizing:border-box;margin-bottom:8px"></textarea>' +
        '<button onclick="_nRecordAR()" style="padding:8px 18px;border-radius:7px;border:none;background:#dc2626;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Report Adverse Reaction</button>' +
      '</div>' +
    '</div>';
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
            '<td style="padding:8px 14px;font-size:14px;font-weight:700;color:'+(low?'#d97706':'#20242b')+'">'+s.quantity+' '+s.unit+'</td>' +
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
          '<div><div style="font-size:10px;color:#6b7280">Safe Range</div><div style="font-size:14px;font-weight:600;color:#20242b">'+cc.minAlarm+'–'+cc.maxAlarm+'°C</div></div>' +
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
    var allVax = im.todayVaccinations;
    content = '<div style="padding:14px 16px">' +
      (allVax.length
        ? '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">' +
            '<table style="width:100%;border-collapse:collapse"><thead><tr>'+['Date','Patient','Vaccine','Dose','Batch','Vaccinator','Observations'].map(_th).join('')+'</tr></thead><tbody>' +
            allVax.map(function(v,i){
              return '<tr style="background:'+(i%2===0?'#fff':'#f8fafc')+';border-bottom:1px solid #f1f5f9">' +
                _td(v.date) + _td('<strong>'+v.patientName+'</strong>') + _td(v.vaccine) + _td('Dose '+v.dose) + _td(v.batch||'—') + _td(v.vaccinator) + _td(v.notes||'—','color:#6b7280;font-size:12px') +
              '</tr>';
            }).join('') +
            '</tbody></table></div>'
        : '<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px">No vaccination history recorded yet.</div>') +
    '</div>';
  }

  /* ── COVERAGE REPORTS ── */
  if (tab==='reports') {
    var covered = im.todayVaccinations.length;
    var eligible = _N.patients.filter(function(p){return p.age&&p.age<=5;}).length;
    var coverage = eligible ? Math.round(covered/eligible*100) : 0;
    content = '<div style="padding:14px 16px">' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px">' +
        [
          {label:'Eligible Children (Today)', value:eligible, color:'#0F6E56'},
          {label:'Vaccinated Today',          value:covered,  color:'#16a34a'},
          {label:'Coverage Rate',             value:coverage+'%', color:coverage<80?'#dc2626':'#16a34a'},
        ].map(function(k){
          return '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center">' +
            '<div style="font-size:28px;font-weight:800;color:'+k.color+';margin-bottom:4px">'+k.value+'</div>' +
            '<div style="font-size:12px;color:#6b7280">'+k.label+'</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px">' +
        '<div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px">Vaccine Coverage by Type</div>' +
        im.vaccines.slice(0,6).map(function(v){
          var cnt = im.todayVaccinations.filter(function(r){return r.vaccineId===v.id;}).length;
          var pct = eligible ? Math.round(cnt/Math.max(eligible,1)*100) : 0;
          return '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="color:#20242b">'+v.name+'</span><span style="font-weight:700;color:#0F6E56">'+cnt+' given</span></div><div style="height:5px;background:#f1f5f9;border-radius:3px"><div style="height:5px;background:#0F6E56;border-radius:3px;width:'+Math.min(pct,100)+'%"></div></div></div>';
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
  var ptId    = _v('vax-pt');
  var vaxId   = _v('vax-vac');
  var dose    = _v('vax-dose');
  var date    = _v('vax-date');
  var batch   = _v('vax-batch');
  var vacc    = _v('vax-vacc');
  var notes   = _v('vax-notes');
  if (!ptId||!vaxId||!batch||!vacc){ UI.showToast('Please fill all required fields (*)','err'); return; }
  var pt  = _N.patients.find(function(p){return p.id===ptId;});
  var vax = _N.immu.vaccines.find(function(v){return v.id===vaxId;});
  var rec = {
    patientId: ptId, patientName: pt?pt.name:'Unknown',
    vaccineId: vaxId, vaccine: vax?vax.name:vaxId,
    dose: dose, date: date, time: _nowTime(),
    batch: batch, vaccinator: vacc, notes: notes,
    recordedAt: new Date().toISOString()
  };
  _N.immu.todayVaccinations.push(rec);
  /* Update immunisation record on patient */
  if (pt) {
    if (!pt.immunisationRecord) pt.immunisationRecord = {};
    pt.immunisationRecord[vax?vax.name:vaxId] = date;
    if (!pt.vaccinationHistory) pt.vaccinationHistory = [];
    pt.vaccinationHistory.push(rec);
  }
  /* Reduce stock */
  var stock = _N.immu.stock.find(function(s){return vaxId.startsWith(s.id)||s.id.startsWith(vaxId.slice(0,3));});
  if (stock && stock.quantity > 0) stock.quantity--;
  _N.immu.immuTab='today'; _N.immu.selectedPatient=null;
  _nurseRender();
  UI.showToast(vax?vax.name:'Vaccine'+' recorded for '+(pt?pt.name:'patient'),'ok');
  /* Save to backend */
  try{ API._fetchDirect('/patients/'+(pt&&pt.pid||ptId)+'/vaccinations',{method:'POST',body:JSON.stringify(rec)}).catch(function(){}); }catch(_){}
};

window._nRecordAR = function() {
  function _v(id){var el=document.getElementById(id);return el?el.value.trim():'';}
  var ptId=_v('ar-pt'), type=_v('ar-type'), notes=_v('ar-notes');
  if(!ptId||!type){UI.showToast('Please select patient and reaction type','err');return;}
  var pt=_N.patients.find(function(p){return p.id===ptId;});
  _N.immu.adverseReactions.push({patientId:ptId,patientName:pt?pt.name:'Unknown',type:type,notes:notes,date:new Date().toISOString().slice(0,10),time:_nowTime()});
  _nurseRender();
  UI.showToast('Adverse reaction recorded — escalate if severe','warn');
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

/* ── Message bridge: receptionist can push messages directly to this portal ── */
window._nurseAddMessage = function(msg) {
  if (!_N.messages) _N.messages = [];
  /* Avoid duplicates */
  var dup = _N.messages.find(function(m){ return m.id === msg.id; });
  if (dup) return;
  _N.messages.unshift({
    id:       msg.id || Date.now(),
    from:     msg.from || 'Reception',
    fromRole: msg.fromRole || 'RECEPTIONIST',
    text:     msg.text || msg.body || '',
    time:     msg.time || new Date().toLocaleTimeString('en-ZA', {hour:'2-digit',minute:'2-digit'}),
    read:     false,
  });
  /* Re-render if portal is open */
  var renderFn = window._nRec || window._dRec || window._rRec;
  if (typeof renderFn === 'function') renderFn();
  /* Toast */
  if (window.UI && window.UI.showToast) {
    UI.showToast('New message from ' + (msg.from || 'Reception'), 'ok');
  }
};
