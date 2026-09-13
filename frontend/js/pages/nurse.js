/**
 * js/pages/nurse.js — NIHMS Nurse / Triage Station
 *
 * 6 views: requests · queue · vitals · emergency · messaging · analytics
 *
 * Design: white content area · pale blue-gray #EEF2F7 sidebar
 *   enterprise blue #2563EB · charcoal #20242B · zebra-striped tables
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

  requests: [
    { id:'REQ-001', patientId:'P-0042', patientName:'Kwame Asante',    age:45, sex:'M', complaint:'Severe headache, nausea',       priority:'High',      requestedBy:'Reception', requestedAt:'08:28', notes:'Patient walked in. Reports headache started 3 hrs ago. BP looked elevated on initial check.', seen:false },
    { id:'REQ-002', patientId:'P-0043', patientName:'Abena Mensah',    age:31, sex:'F', complaint:'Abdominal pain, fever',          priority:'High',      requestedBy:'Reception', requestedAt:'08:35', notes:'Fever reported by patient — has not taken any medication. Pain is lower right quadrant.',     seen:false },
    { id:'REQ-003', patientId:'P-0044', patientName:'Emmanuel Boateng',age:55, sex:'M', complaint:'Lower back pain',                priority:'Normal',    requestedBy:'Reception', requestedAt:'08:42', notes:'Chronic back pain — follow-up visit. Patient seems comfortable.',                            seen:true  },
    { id:'REQ-004', patientId:'P-0047', patientName:'Efua Nkrumah',    age:19, sex:'F', complaint:'Allergic reaction, rash',        priority:'High',      requestedBy:'Reception', requestedAt:'08:50', notes:'Rash spreading on arms and neck. No known prior allergies. Watch for anaphylaxis signs.',   seen:false },
  ],

  patients: [
    { id:'P-0041', name:'Margaret Osei', age:67, sex:'F', complaint:'Chest pain, shortness of breath',   priority:'Emergency', status:'In Vitals',          vitalStatus:'Completed', arrivalTime:'08:12', triageTime:'08:14', waitMins:2,  room:'Resus 1',  emergencyClass:'Critical',
      vitals:{ bp:'168/104', temp:'37.1', hr:'112', spo2:'91', weight:'72', rr:'24' },
      flags:[{field:'Blood Pressure',value:'168/104',reason:'Hypertensive crisis threshold'},{field:'SpO₂',value:'91%',reason:'Below 94% — supplemental O₂ indicated'},{field:'Heart Rate',value:'112 bpm',reason:'Tachycardia'},{field:'RR',value:'24/min',reason:'Tachypnoea'}],
      aiRisk:'High risk of ACS — ECG and troponin recommended immediately', acceptedAt:'08:13' },
    { id:'P-0045', name:'Ama Darko',     age:28, sex:'F', complaint:'Sore throat, mild fever',           priority:'Normal',    status:'In Consultation',    vitalStatus:'Completed', arrivalTime:'07:55', triageTime:'08:05', waitMins:0,  room:'Consult 3',emergencyClass:null,
      vitals:{ bp:'118/76', temp:'38.1', hr:'88',  spo2:'98', weight:'61', rr:'16' },
      flags:[{field:'Temperature',value:'38.1°C',reason:'Low-grade fever'}], aiRisk:null, acceptedAt:'08:00' },
    { id:'P-0046', name:'Yaw Appiah',    age:72, sex:'M', complaint:'Dizziness, fall at home',           priority:'High',      status:'Ready for Consultation', vitalStatus:'Completed', arrivalTime:'08:00', triageTime:'08:10', waitMins:0, room:null, emergencyClass:null,
      vitals:{ bp:'142/88', temp:'36.8', hr:'76',  spo2:'96', weight:'80', rr:'18' },
      flags:[], aiRisk:'Orthostatic hypotension pattern — monitor BP in different positions', acceptedAt:'08:02' },
    { id:'P-0048', name:'Kofi Annan',    age:60, sex:'M', complaint:'Routine follow-up, hypertension',  priority:'Normal',    status:'Lab',                vitalStatus:'Completed', arrivalTime:'07:30', triageTime:'07:45', waitMins:0,  room:null,       emergencyClass:null,
      vitals:{ bp:'138/84', temp:'36.6', hr:'70',  spo2:'97', weight:'88', rr:'15' },
      flags:[], aiRisk:null, acceptedAt:'07:32' },
  ],

  messages: [
    { id:1, from:'Reception — Akua', role:'Receptionist', text:'Emergency incoming — RTA patient, ETA 3 mins. Male, ~40s, head trauma.', time:'08:57', unread:true  },
    { id:2, from:'Dr. Mensah',       role:'Doctor',       text:'P-0046 Yaw Appiah is ready. Please send him to Consult 2.',             time:'08:52', unread:true  },
    { id:3, from:'Reception — Akua', role:'Receptionist', text:'Sent you 2 new vitals requests — Kwame and Abena. Both flagged urgent.', time:'08:40', unread:false },
    { id:4, from:'Dr. Boamah',       role:'Doctor',       text:'P-0048 Kofi Annan — route to pharmacy after labs, not back to waiting.', time:'08:30', unread:false },
  ],

  /* per-view UI state */
  reqFilter:    'All',
  reqExpanded:  null,
  decliningId:  null,
  queueFilter:  'All',
  queueSel:     null,
  vitalsFilter: 'All',
  editId:       null,
  vitalForm:    { bp:'', temp:'', hr:'', spo2:'', weight:'', rr:'' },
  alertDismissed: false,
  classifying:  null,
  msgTo:        'Doctor',
  msgCompose:   '',
};

window._NURSE_REQUESTS = window._NURSE_REQUESTS || [];

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

function _priorityDot(p)  { return p==='Emergency'?'#DC2626':p==='High'?'#D97706':'#16A34A'; }
function _priorityBg(p)   { return p==='Emergency'?'background:#FEF2F2;color:#DC2626;border:1px solid #FCA5A5':p==='High'?'background:#FFFBEB;color:#D97706;border:1px solid #FCD34D':'background:#F0FDF4;color:#16A34A;border:1px solid #86EFAC'; }
function _statusBg(s) {
  var m = { 'Awaiting Vitals':'background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE',
    'In Vitals':'background:#F5F3FF;color:#6D28D9;border:1px solid #C4B5FD',
    'Ready for Consultation':'background:#F0FDFA;color:#0F766E;border:1px solid #99F6E4',
    'With Doctor':           'background:#F0FDFA;color:#0D7490;border:1px solid #67E8F9',
    'In Consultation':'background:#EEF2FF;color:#4338CA;border:1px solid #C7D2FE',
    'Lab':'background:#FFF7ED;color:#C2410C;border:1px solid #FED7AA',
    'Pharmacy':'background:#FDF4FF;color:#86198F;border:1px solid #F0ABFC',
    'Discharged':'background:#F9FAFB;color:#6B7280;border:1px solid #E5E7EB' };
  return m[s]||'background:#F9FAFB;color:#6B7280;border:1px solid #E5E7EB';
}

function _badge(text, style) {
  return '<span style="display:inline-flex;align-items:center;padding:1px 8px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap;'+style+'">'+text+'</span>';
}

function _chip(label, active, onclick) {
  return '<button onclick="'+onclick+'" style="padding:4px 12px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .15s;border:1px solid '+(active?'#2563EB':'#D1D9E6')+';background:'+(active?'#2563EB':'#fff')+';color:'+(active?'#fff':'#6B7280')+'">'+label+'</button>';
}

function _btn(label, onclick, primary) {
  if (primary === false) return '<button onclick="'+onclick+'" style="padding:5px 12px;border-radius:6px;border:1px solid #D1D9E6;background:#fff;color:#6B7280;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">'+label+'</button>';
  var bg = primary||'#2563EB';
  return '<button onclick="'+onclick+'" style="padding:5px 12px;border-radius:6px;border:none;background:'+bg+';color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">'+label+'</button>';
}

function _th(h) { return '<th style="padding:9px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#6B7280;white-space:nowrap;background:#EEF2F7;border-bottom:1px solid #D1D9E6">'+h+'</th>'; }
function _td(c,s) { return '<td style="padding:8px 14px;font-size:13px;color:#20242B;'+(s||'')+'">'+c+'</td>'; }
function _trBg(i, priority) {
  if (priority==='Emergency') return 'background:#FFF5F5';
  return i%2===0?'background:#FFFFFF':'background:#F5F8FC';
}

/* ─── Main page shell ────────────────────────────────────────────────── */
Pages['nurse_dashboard'] = function() {
  _N.view         = 'overview';
  _N.alertDismissed = false;
  setTimeout(_nurseRender, 80);

  return '<div style="display:flex;height:calc(100vh - 120px);overflow:hidden">' +
    '<aside id="nurse-sidebar" style="width:208px;flex-shrink:0;background:#EEF2F7;border-right:1px solid #D1D9E6;display:flex;flex-direction:column;overflow-y:auto"></aside>' +
    '<main id="nurse-main" style="flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column;background:#fff"></main>' +
  '</div>';
};

/* ─── Render engine ──────────────────────────────────────────────────── */
function _nurseRender() {
  /* sync requests from receptionist */
  var existing = _N.requests.map(function(r){ return r.id; });
  (window._NURSE_REQUESTS||[]).forEach(function(r){
    if (!existing.includes(r.id)) _N.requests.push(r);
  });

  var sidebar = document.getElementById('nurse-sidebar');
  var main    = document.getElementById('nurse-main');
  if (!sidebar || !main) return;

  sidebar.innerHTML = _nSidebar();

  var views = { overview:_nOverview, requests:_nRequests, queue:_nQueue, vitals:_nVitals,
                emergency:_nEmergency, messaging:_nMessaging, analytics:_nAnalytics };
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
    return '<button onclick="_setView(\''+view+'\')" style="display:flex;align-items:center;gap:9px;width:100%;padding:8px 16px;border:none;background:'+(active?'#fff':'transparent')+';color:'+(active?'#2563EB':'#20242B')+';font-size:13px;font-weight:'+(active?'700':'500')+';cursor:pointer;text-align:left;font-family:inherit;border-right:'+(active?'2px solid #2563EB':'2px solid transparent')+';transition:all .1s">' +
      '<span style="font-size:15px;width:18px;text-align:center">'+icon+'</span>' +
      '<span style="flex:1">'+label+'</span>' +
      (badge ? '<span style="min-width:18px;height:18px;border-radius:9px;background:'+(badgeRed?'#DC2626':'#2563EB')+';color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px">'+badge+'</span>' : '') +
    '</button>';
  }

  function sectionLabel(text) {
    return '<div style="padding:10px 16px 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#6B7280">'+text+'</div>';
  }

  return navItem('Overview',  '⚡', 'overview',  '',          false) +
    navItem('Analytics', '📊', 'analytics', '',          false);
}

/* ─── Page header ────────────────────────────────────────────────────── */
function _nHeader(title, sub) {
  return '<div style="padding:12px 20px;border-bottom:1px solid #D1D9E6;background:#fff;flex-shrink:0">' +
    '<div style="font-size:15px;font-weight:700;color:#20242B">'+title+'</div>' +
    (sub?'<div style="font-size:12px;color:#6B7280;margin-top:1px">'+sub+'</div>':'') +
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
    'background:linear-gradient(135deg,#2563EB,#1D4ED8);border-radius:12px;padding:14px 20px;margin-bottom:16px;box-shadow:0 2px 10px rgba(37,99,235,.2)">' +
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
  var kpis = [
    { label:'Awaiting Vitals', value:waiting.length,   color:'#D97706', bg:'#FFFBEB', border:'#FCD34D', icon:'⏳', view:'queue'     },
    { label:'In Vitals Now',   value:inVitals.length,  color:'#2563EB', bg:'#EFF6FF', border:'#BFDBFE', icon:'♥',  view:'vitals'    },
    { label:'Ready for Dr',    value:ready.length,     color:'#16A34A', bg:'#F0FDF4', border:'#86EFAC', icon:'✓',  view:'queue'     },
    { label:'Emergency',       value:emergency.length, color:'#DC2626', bg:'#FEF2F2', border:'#FCA5A5', icon:'🚨', view:'emergency' },
    { label:'New Requests',    value:unreadReq,        color:'#7C3AED', bg:'#F5F3FF', border:'#C4B5FD', icon:'📋', view:'requests'  },
    { label:'Flagged Vitals',  value:flagged.length,   color:'#DC2626', bg:'#FEF2F2', border:'#FCA5A5', icon:'⚑',  view:'analytics' },
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
    '<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-left:4px solid #2563EB;border-radius:10px;padding:12px 16px;margin-bottom:16px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
        '<span style="font-size:14px">✉</span>' +
        '<div style="font-size:12px;font-weight:700;color:#1D4ED8">Messages from Reception</div>' +
        (unreadMsg ? '<span style="min-width:18px;height:18px;border-radius:9px;background:#DC2626;color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 4px">'+unreadMsg+'</span>' : '') +
        '<button onclick="_setView(\'messaging\')" style="margin-left:auto;font-size:11px;color:#2563EB;border:none;background:transparent;cursor:pointer;font-family:inherit">View all →</button>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px">' +
        receptionMsgs.map(function(m){
          return '<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 12px;background:'+(m.unread?'#fff':'rgba(255,255,255,.6)')+';border-radius:7px;border:1px solid '+(m.unread?'#BFDBFE':'transparent')+'">' +
            '<div style="width:28px;height:28px;border-radius:50%;background:#2563EB;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">R</div>' +
            '<div style="flex:1;min-width:0">' +
              '<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">' +
                '<span style="font-size:12px;font-weight:700;color:#0F172A">'+m.from+'</span>' +
                '<span style="font-size:10px;color:#94A3B8">'+m.time+'</span>' +
                (m.unread?'<span style="padding:1px 6px;background:#DBEAFE;color:#1D4ED8;border-radius:20px;font-size:9px;font-weight:700">New</span>':'') +
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
  var queueCol = '<div style="background:#fff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">' +
    '<div style="padding:12px 16px;border-bottom:1px solid #F1F5F9;display:flex;align-items:center;justify-content:space-between">' +
      '<div style="font-size:13px;font-weight:700;color:#20242B">Patient Queue</div>' +
      '<button onclick="_setView(\'queue\')" style="font-size:11px;color:#2563EB;border:none;background:transparent;cursor:pointer;font-family:inherit">View all →</button>' +
    '</div>' +
    (_N.patients.length ? _N.patients.slice(0,5).map(function(p,i){
      var bg = i%2===0?'#fff':'#F8FAFC';
      return '<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:'+bg+';border-bottom:1px solid #F8FAFC">' +
        '<div style="width:30px;height:30px;border-radius:50%;background:'+(p.priority==='Emergency'?'#DC2626':p.priority==='High'?'#D97706':'#2563EB')+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0">'+(p.name.split(' ').map(function(n){return n[0];}).join('').slice(0,2))+'</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:12px;font-weight:600;color:#20242B;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+p.name+'</div>' +
          '<div style="font-size:10px;color:#6B7280">'+p.status+'</div>' +
        '</div>' +
        _badge(p.priority, _priorityBg(p.priority)) +
      '</div>';
    }).join('') : '<div style="padding:16px;text-align:center;font-size:12px;color:#6B7280">No patients in queue</div>') +
  '</div>';

  /* Col 2: Vitals Collection */
  var pendingVitals = _N.patients.filter(function(p){ return p.vitalStatus==='Pending'&&p.status!=='Discharged'; });
  var vitalsCol = '<div style="background:#fff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">' +
    '<div style="padding:12px 16px;border-bottom:1px solid #F1F5F9;display:flex;align-items:center;justify-content:space-between">' +
      '<div style="font-size:13px;font-weight:700;color:#20242B">Vitals Collection</div>' +
      '<button onclick="_setView(\'vitals\')" style="font-size:11px;color:#2563EB;border:none;background:transparent;cursor:pointer;font-family:inherit">Record →</button>' +
    '</div>' +
    (pendingVitals.length ? pendingVitals.slice(0,4).map(function(p,i){
      return '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #F8FAFC">' +
        '<div style="width:30px;height:30px;border-radius:50%;background:#FFFBEB;border:2px solid #FCD34D;color:#D97706;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">'+(p.name.split(' ').map(function(n){return n[0];}).join('').slice(0,2))+'</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:12px;font-weight:600;color:#20242B">'+p.name+'</div>' +
          '<div style="font-size:10px;color:#D97706;font-weight:600">Pending vitals</div>' +
        '</div>' +
        '<button onclick="_nurseVitalsEdit(\''+p.id+'\')" style="padding:4px 10px;border-radius:5px;border:none;background:#2563EB;color:#fff;font-size:10px;font-weight:600;cursor:pointer;font-family:inherit">Record</button>' +
      '</div>';
    }).join('') : '<div style="padding:20px;text-align:center;font-size:12px;color:#16A34A;background:#F0FDF4;margin:10px;border-radius:8px;border:1px solid #86EFAC">✓ All vitals recorded</div>') +
  '</div>';

  /* Col 3: Requests from Reception */
  var reqsCol = '<div style="background:#fff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">' +
    '<div style="padding:12px 16px;border-bottom:1px solid #F1F5F9;display:flex;align-items:center;justify-content:space-between">' +
      '<div style="display:flex;align-items:center;gap:6px">' +
        '<div style="font-size:13px;font-weight:700;color:#20242B">Requests</div>' +
        (unreadReq ? '<span style="min-width:18px;height:18px;border-radius:9px;background:#2563EB;color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 3px">'+unreadReq+'</span>' : '') +
      '</div>' +
      '<button onclick="_setView(\'requests\')" style="font-size:11px;color:#2563EB;border:none;background:transparent;cursor:pointer;font-family:inherit">View all →</button>' +
    '</div>' +
    (_N.requests.length ? _N.requests.slice(0,4).map(function(r){
      return '<div style="padding:10px 14px;border-bottom:1px solid #F8FAFC">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
          '<div style="display:flex;align-items:center;gap:6px">' +
            (!r.seen?'<span style="width:6px;height:6px;border-radius:50%;background:#2563EB;flex-shrink:0"></span>':'') +
            '<span style="font-size:12px;font-weight:700;color:#20242B">'+r.patientName+'</span>' +
          '</div>' +
          _badge(r.priority, _priorityBg(r.priority)) +
        '</div>' +
        '<div style="font-size:11px;color:#6B7280;margin-bottom:6px">'+r.complaint+'</div>' +
        '<div style="display:flex;gap:5px">' +
          '<button onclick="_nurseReqAccept(\''+r.id+'\')" style="flex:1;padding:5px;border-radius:5px;border:none;background:#2563EB;color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Accept</button>' +
          '<button onclick="_nurseReqDecline(\''+r.id+'\')" style="padding:5px 8px;border-radius:5px;border:1px solid #E5E7EB;background:#fff;color:#6B7280;font-size:11px;cursor:pointer;font-family:inherit">Decline</button>' +
        '</div>' +
      '</div>';
    }).join('') : '<div style="padding:16px;text-align:center;font-size:12px;color:#6B7280">No pending requests</div>') +
  '</div>';

  /* ── Emergency alert ── */
  var emAlert = emergency.length && !_N.alertDismissed ? (
    '<div style="background:#DC2626;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">' +
      '<span style="font-size:20px">🚨</span>' +
      '<div style="flex:1">' +
        '<div style="font-size:13px;font-weight:700;color:#fff">'+emergency.length+' Emergency patient'+(emergency.length>1?'s':'')+' — immediate attention required</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,.8);margin-top:2px">'+emergency.map(function(p){return p.name;}).join(', ')+'</div>' +
      '</div>' +
      '<button onclick="_setView(\'emergency\')" style="padding:7px 14px;border-radius:6px;border:none;background:#fff;color:#DC2626;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">View →</button>' +
      '<button onclick="_N.alertDismissed=true;_nurseRender()" style="padding:7px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.4);background:transparent;color:#fff;font-size:11px;cursor:pointer;font-family:inherit">Dismiss</button>' +
    '</div>'
  ) : '';

  /* ── Analytics mini ── */
  var triaged = _N.patients.filter(function(p){ return p.vitalStatus==='Completed'; }).length;
  var analyticsRow = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px">' +
    [
      {label:'Triaged Today',   value:triaged,           color:'#2563EB'},
      {label:'Emergency Cases', value:emergency.length,  color:'#DC2626'},
      {label:'Flagged Vitals',  value:flagged.length,    color:'#D97706'},
      {label:'Messages',        value:_N.messages.length,color:'#7C3AED'},
    ].map(function(k){
      return '<div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px">' +
        '<div style="font-size:22px;font-weight:800;color:'+k.color+'">'+k.value+'</div>' +
        '<div style="font-size:11px;color:#6B7280;font-weight:500">'+k.label+'</div>' +
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

  var toolbar = '<div style="display:flex;align-items:center;gap:8px;padding:10px 20px;border-bottom:1px solid #D1D9E6;background:#fff;flex-shrink:0;flex-wrap:wrap">' +
    ['All','Unseen','High','Emergency'].map(function(opt){
      return _chip(opt+(opt==='Unseen'&&unseen?' ('+unseen+')':''), f===opt, '_N.reqFilter=\''+opt+'\';_nurseRender()');
    }).join('') +
    '<div style="margin-left:auto;font-size:12px;color:#6B7280">' +
      (unseen>0 ? '<span style="font-weight:700;color:#2563EB">'+unseen+'</span> new request'+(unseen>1?'s':'')+' from reception'
                : '<span style="color:#16A34A;font-weight:600">All requests reviewed</span>') +
    '</div>' +
  '</div>';

  if (!displayed.length) {
    return _nHeader('Vitals Requests from Reception', _N.requests.length+' pending · accept to add to vitals queue') +
      toolbar +
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;color:#6B7280;gap:6px;padding:40px">' +
        '<div style="font-size:36px">📋</div>' +
        '<div style="font-size:14px;font-weight:600;color:#20242B">No pending requests</div>' +
        '<div style="font-size:12px">Reception will send vitals requests here as patients arrive.</div>' +
      '</div>';
  }

  var rows = displayed.map(function(req, i){
    var bg = req.priority==='Emergency' ? 'background:#FFF5F5'
           : !req.seen ? 'background:#EFF6FF'
           : i%2===0 ? 'background:#fff' : 'background:#F5F8FC';
    var expanded  = _N.reqExpanded  === req.id;
    var declining = _N.decliningId  === req.id;

    var mainRow = '<tr style="'+bg+';border-bottom:1px solid #E8EDF4;cursor:pointer" ' +
      'onclick="_nurseReqExpand(\''+req.id+'\')">' +
      '<td style="padding:8px 6px 8px 14px;width:12px">' +
        (req.seen?'':'<span style="display:block;width:7px;height:7px;border-radius:50%;background:#2563EB"></span>') +
      '</td>' +
      _td('<span style="font-family:monospace;font-size:11px;color:#6B7280">'+req.id+'</span>') +
      _td('<div style="font-weight:600">'+req.patientName+'</div><div style="font-size:11px;color:#6B7280">'+req.patientId+'</div>') +
      _td(req.age+' '+req.sex,'color:#6B7280') +
      _td(req.complaint,'max-width:220px') +
      '<td style="padding:8px 14px">' +
        '<div style="display:flex;align-items:center;gap:5px">' +
          '<span style="width:7px;height:7px;border-radius:50%;background:'+_priorityDot(req.priority)+';flex-shrink:0"></span>' +
          _badge(req.priority, _priorityBg(req.priority)) +
        '</div>' +
      '</td>' +
      _td(req.requestedBy,'color:#6B7280') +
      _td(req.requestedAt,'color:#6B7280') +
      '<td style="padding:8px 14px" onclick="event.stopPropagation()">' +
        '<div style="display:flex;gap:5px">' +
          _btn('Accept','_nurseReqAccept(\''+req.id+'\')') + ' ' +
          _btn('Decline','_nurseReqDecline(\''+req.id+'\')',false) +
        '</div>' +
      '</td>' +
    '</tr>';

    var expandRow = (expanded ? '<tr style="background:#fff;border-bottom:1px solid #E8EDF4"><td colspan="9" style="padding:10px 20px 14px 34px">' +
      '<div style="display:flex;gap:20px">' +
        '<div style="flex:1">' +
          '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#6B7280;margin-bottom:5px">Reception Notes</div>' +
          '<div style="font-size:13px;color:#20242B;background:#EEF2F7;border:1px solid #D1D9E6;border-radius:6px;padding:8px 12px">'+req.notes+'</div>' +
        '</div>' +
        (declining ? '<div style="flex:1">' +
          '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#DC2626;margin-bottom:5px">Decline Reason</div>' +
          '<textarea id="decline-txt-'+req.id+'" rows="3" placeholder="Reason for declining (optional)…" style="width:100%;padding:8px 10px;font-size:13px;font-family:inherit;border:1px solid #FCA5A5;border-radius:6px;outline:none;resize:none;box-sizing:border-box"></textarea>' +
          '<div style="display:flex;gap:6px;margin-top:7px">' +
            '<button onclick="_nurseReqDeclineConfirm(\''+req.id+'\')" style="padding:5px 14px;border-radius:6px;border:none;background:#DC2626;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Confirm Decline</button>' +
            '<button onclick="_N.decliningId=null;_nurseRender()" style="padding:5px 12px;border-radius:6px;border:1px solid #D1D9E6;background:#fff;color:#6B7280;font-size:12px;cursor:pointer;font-family:inherit">Cancel</button>' +
          '</div>' +
        '</div>' : '') +
      '</div>' +
    '</td></tr>' : '');

    return mainRow + expandRow;
  }).join('');

  var table = '<div style="flex:1;overflow:auto">' +
    '<table style="width:100%;border-collapse:collapse">' +
    '<thead><tr>'+['','Request','Patient','Age/Sex','Chief Complaint','Priority','Requested By','Time','Actions'].map(_th).join('')+'</tr></thead>' +
    '<tbody>'+rows+'</tbody>' +
    '</table></div>';

  return _nHeader('Vitals Requests from Reception', _N.requests.length+' pending · accept to add to vitals queue') +
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

  var toolbar = '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 20px;border-bottom:1px solid #D1D9E6;background:#fff;flex-shrink:0;flex-wrap:wrap;gap:8px">' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
      filterOpts.map(function(opt){ return _chip(opt, f===opt, '_N.queueFilter=\''+opt+'\';_nurseRender()'); }).join('') +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:12px">' +
      '<div style="font-size:12px;color:#6B7280">' +
        '<strong style="color:#20242B">'+awaiting+'</strong> awaiting · <strong style="color:#20242B">'+inVitals+'</strong> in vitals · <strong style="color:#20242B">'+ready+'</strong> ready' +
      '</div>' +
      '<button onclick="_nurseCallNext()" style="padding:6px 14px;border-radius:6px;border:none;background:'+(awaiting?'#2563EB':'#D1D9E6')+';color:#fff;font-size:12px;font-weight:600;cursor:'+(awaiting?'pointer':'not-allowed')+';font-family:inherit">Call Next Patient</button>' +
    '</div>' +
  '</div>';

  var selected = _N.queueSel ? _N.patients.find(function(p){ return p.id===_N.queueSel; }) : null;

  var rows = filtered.map(function(p, i){
    var isSel = _N.queueSel===p.id;
    var bg = isSel ? 'background:#EFF6FF' : _trBg(i, p.priority);
    return '<tr style="'+bg+';border-bottom:1px solid #E8EDF4;cursor:pointer" onclick="_N.queueSel=\''+p.id+'\';_nurseRender()">' +
      _td('<span style="font-family:monospace;font-size:12px;color:#6B7280">'+p.id+'</span>') +
      '<td style="padding:8px 14px">' +
        '<div style="font-weight:600;font-size:13px">'+p.name+'</div>' +
        (p.flags&&p.flags.length ? '<div style="font-size:11px;color:#DC2626;margin-top:1px">⚑ '+p.flags.length+' flag'+(p.flags.length>1?'s':'')+'</div>' : '') +
      '</td>' +
      _td(p.age+' '+p.sex,'color:#6B7280') +
      _td(p.complaint,'max-width:180px') +
      '<td style="padding:8px 14px">' +
        '<div style="display:flex;align-items:center;gap:5px">' +
          '<span style="width:7px;height:7px;border-radius:50%;background:'+_priorityDot(p.priority)+';flex-shrink:0"></span>' +
          _badge(p.priority, _priorityBg(p.priority)) +
        '</div>' +
      '</td>' +
      '<td style="padding:8px 14px">'+_badge(p.status, _statusBg(p.status))+'</td>' +
      '<td style="padding:8px 14px">'+_badge(p.vitalStatus, p.vitalStatus==='Completed'?'background:#F0FDF4;color:#16A34A;border:1px solid #86EFAC':'background:#F9FAFB;color:#6B7280;border:1px solid #E5E7EB')+'</td>' +
      _td(p.arrivalTime,'color:#6B7280') +
      _td(p.acceptedAt||'—','color:#6B7280') +
      '<td style="padding:8px 14px" onclick="event.stopPropagation()">' +
        '<div style="display:flex;gap:4px;flex-wrap:wrap">' +
          (p.status==='Awaiting Vitals' ? '<button onclick="_nurseQueuePriority(\''+p.id+'\',\'Emergency\')" style="padding:3px 8px;border-radius:4px;border:1px solid #FCA5A5;color:#DC2626;font-size:11px;cursor:pointer;font-family:inherit;background:#fff">↑ Emg</button><button onclick="_nurseQueuePriority(\''+p.id+'\',\'High\')" style="padding:3px 8px;border-radius:4px;border:1px solid #FCD34D;color:#D97706;font-size:11px;cursor:pointer;font-family:inherit;background:#fff">↑ High</button>' : '') +
          (p.status==='Awaiting Vitals' ? '<button onclick="_N.editId=\''+p.id+'\';_N.vitalForm={bp:\'\',temp:\'\',hr:\'\',spo2:\'\',weight:\'\',rr:\'\'};_N.view=\'vitals\';_nurseRender()" style="padding:3px 8px;border-radius:4px;border:none;background:#2563EB;color:#fff;font-size:11px;cursor:pointer;font-family:inherit">Start vitals</button>' : '') +
          (p.status==='In Vitals' ? '<button onclick="_nurseSaveVitals(\''+p.id+'\')" style="padding:3px 8px;border-radius:4px;border:none;background:#16A34A;color:#fff;font-size:11px;cursor:pointer;font-family:inherit">Complete & send →</button>' : '') +
          (p.status==='With Doctor' ? '<span style="font-size:11px;color:#0F766E;font-weight:600">✓ With doctor</span>' : '') +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');

  var tableArea = '<div style="flex:1;overflow:auto">' +
    '<table style="width:100%;border-collapse:collapse">' +
    '<thead><tr>'+['ID','Patient','Age/Sex','Chief Complaint','Priority','Status','Vitals','Arrival','Accepted','Actions'].map(_th).join('')+'</tr></thead>' +
    '<tbody>'+(rows||'<tr><td colspan="10" style="padding:28px;text-align:center;color:#6B7280;font-size:13px">No patients in queue yet. Accept requests from reception.</td></tr>')+'</tbody>' +
    '</table></div>';

  /* Detail panel */
  var detailPanel = selected ? (
    '<div style="width:288px;flex-shrink:0;border-left:1px solid #D1D9E6;background:#EEF2F7;display:flex;flex-direction:column;overflow-y:auto">' +
      '<div style="padding:12px 16px;border-bottom:1px solid #D1D9E6;background:#fff;display:flex;align-items:center;justify-content:space-between">' +
        '<div><div style="font-weight:700;font-size:14px;color:#20242B">'+selected.name+'</div><div style="font-size:11px;color:#6B7280">'+selected.id+' · '+selected.age+selected.sex+'</div></div>' +
        '<button onclick="_N.queueSel=null;_nurseRender()" style="background:none;border:none;font-size:16px;color:#6B7280;cursor:pointer">✕</button>' +
      '</div>' +

      '<div style="margin:10px;background:#fff;border:1px solid #D1D9E6;border-radius:6px;padding:12px">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#6B7280;margin-bottom:5px">Chief Complaint</div>' +
        '<div style="font-size:13px;color:#20242B">'+selected.complaint+'</div>' +
      '</div>' +

      (selected.vitals ? '<div style="margin:0 10px 10px;background:#fff;border:1px solid #D1D9E6;border-radius:6px;padding:12px">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#6B7280;margin-bottom:8px">Vitals</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          [['BP',selected.vitals.bp,'mmHg'],['Temp',selected.vitals.temp,'°C'],['HR',selected.vitals.hr,'bpm'],['SpO₂',selected.vitals.spo2,'%'],['Weight',selected.vitals.weight,'kg'],['RR',selected.vitals.rr,'/min']].map(function(r){
            var flagged = selected.flags&&selected.flags.some(function(fl){ return fl.field.toLowerCase().includes(r[0].toLowerCase()); });
            return '<div><div style="font-size:10px;color:#6B7280">'+r[0]+'</div><div style="font-size:13px;font-weight:700;color:'+(flagged?'#DC2626':'#20242B')+'">'+r[1]+' <span style="font-size:11px;font-weight:400;color:#6B7280">'+r[2]+'</span>'+(flagged?' <span style="color:#DC2626;font-size:10px">⚑</span>':'')+'</div></div>';
          }).join('') +
        '</div>' +
      '</div>' : '') +

      (selected.flags&&selected.flags.length ? '<div style="margin:0 10px 10px;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:6px;padding:12px">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#DC2626;margin-bottom:8px">⚑ Abnormal Flags</div>' +
        selected.flags.map(function(fl){ return '<div style="margin-bottom:6px"><div style="font-size:12px;font-weight:600;color:#DC2626">'+fl.field+': '+fl.value+'</div><div style="font-size:11px;color:#DC2626">'+fl.reason+'</div></div>'; }).join('') +
      '</div>' : '') +

      (selected.aiRisk ? '<div style="margin:0 10px 10px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:12px">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#2563EB;margin-bottom:5px">AI Risk Assessment</div>' +
        '<div style="font-size:12px;color:#20242B">'+selected.aiRisk+'</div>' +
      '</div>' : '') +

      '<div style="margin-top:auto;padding:12px;border-top:1px solid #D1D9E6;background:#fff">' +
        (selected.status==='With Doctor'
          ? '<span style="font-size:12px;color:#0F766E;font-weight:600">✓ Patient is now with the doctor</span>'
          : '<button onclick="_nurseSaveVitals(\''+selected.id+'\')" style="width:100%;padding:8px;border-radius:6px;border:none;background:#2563EB;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Complete vitals & send to doctor →</button>') +
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

  var toolbar = '<div style="display:flex;align-items:center;gap:8px;padding:10px 20px;border-bottom:1px solid #D1D9E6;background:#fff;flex-shrink:0">' +
    ['All','Pending','Completed'].map(function(opt){ return _chip(opt, f===opt, '_N.vitalsFilter=\''+opt+'\';_nurseRender()'); }).join('') +
    '<div style="margin-left:auto;font-size:12px;color:#6B7280">' +
      (pending>0 ? '<span style="font-weight:700;color:#D97706">'+pending+'</span> patient'+(pending>1?'s':'')+' awaiting vitals'
                 : '<span style="color:#16A34A;font-weight:600">All vitals completed</span>') +
    '</div>' +
  '</div>';

  if (!displayed.length) {
    return _nHeader('Vitals Collection', pending+' pending · '+_N.patients.filter(function(p){return p.vitalStatus==='Completed';}).length+' completed') +
      toolbar +
      '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#6B7280;gap:6px;padding:40px">' +
        '<div style="font-size:36px">♥</div>' +
        '<div style="font-size:14px;font-weight:600;color:#20242B">No patients in vitals queue</div>' +
        '<div style="font-size:12px">Accept requests from reception to add patients here.</div>' +
      '</div>';
  }

  var rows = displayed.map(function(p, i){
    var isEdit = _N.editId === p.id;
    var bg = _trBg(i);

    var vitalCells = isEdit
      ? ['bp','temp','hr','spo2','weight','rr'].map(function(k){
          return '<td style="padding:5px 8px"><input id="vf-'+k+'" value="'+(_N.vitalForm[k]||'')+'" oninput="_N.vitalForm.'+k+'=this.value" placeholder="'+(k==='bp'?'120/80':'—')+'" style="width:68px;padding:5px 7px;border:1.5px solid #2563EB;border-radius:4px;font-size:12px;font-family:inherit;outline:none"></td>';
        }).join('')
      : (function(){
          var vf = { bp:'Blood Pressure', temp:'Temperature', hr:'Heart Rate', spo2:'SpO₂', rr:'RR' };
          return ['bp','temp','hr','spo2','weight','rr'].map(function(k){
            var val = p.vitals ? p.vitals[k] : '—';
            var flagged = p.flags && p.flags.some(function(fl){ return fl.field===vf[k]; });
            return '<td style="padding:8px 14px;font-size:13px;font-weight:'+(flagged?'700':'400')+';color:'+(flagged?'#DC2626':p.vitals?'#20242B':'#D1D9E6')+'">'+val+(flagged?' <span style="font-size:10px">⚑</span>':'')+'</td>';
          }).join('');
        })();

    var actCell = isEdit
      ? '<td style="padding:6px 14px"><div style="display:flex;gap:5px"><button onclick="_nurseSaveVitals(\''+p.id+'\')" style="padding:4px 10px;border-radius:5px;border:none;background:#2563EB;color:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap">Save & Complete</button><button onclick="_N.editId=null;_nurseRender()" style="padding:4px 8px;border-radius:5px;border:1px solid #D1D9E6;background:#fff;color:#6B7280;font-size:11px;cursor:pointer;font-family:inherit">Cancel</button></div></td>'
      : '<td style="padding:8px 14px"><button onclick="_nurseVitalsEdit(\''+p.id+'\')" style="padding:4px 10px;border-radius:5px;border:1px solid #D1D9E6;color:#2563EB;font-size:11px;cursor:pointer;font-family:inherit;background:#fff">'+(p.vitalStatus==='Pending'?'Record Vitals':'Edit')+'</button></td>';

    var flagCell = isEdit
      ? '<td style="padding:8px 14px">—</td>'
      : '<td style="padding:8px 14px;font-size:12px">'+(p.flags&&p.flags.length?'<span style="color:#DC2626;font-weight:600">'+p.flags.length+' flag'+(p.flags.length>1?'s':'')+'</span>':p.vitals?'<span style="color:#16A34A">Clear</span>':'<span style="color:#D1D9E6">—</span>')+'</td>';

    return '<tr style="'+bg+';border-bottom:1px solid #E8EDF4">' +
      '<td style="padding:8px 14px"><div style="font-weight:600;font-size:13px">'+p.name+'</div><div style="font-size:11px;color:#6B7280">'+p.id+'</div></td>' +
      '<td style="padding:8px 14px"><div style="display:flex;align-items:center;gap:5px"><span style="width:7px;height:7px;border-radius:50%;background:'+_priorityDot(p.priority)+';flex-shrink:0"></span><span style="font-size:12px;color:#20242B">'+p.priority+'</span></div></td>' +
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
    '<div style="margin:14px 20px;padding:14px 18px;background:#DC2626;color:#fff;border-radius:6px;display:flex;align-items:flex-start;gap:12px">' +
      '<div style="font-size:22px;flex-shrink:0">🚨</div>' +
      '<div style="flex:1">' +
        '<div style="font-size:14px;font-weight:700">Incoming Emergency — RTA Patient</div>' +
        '<div style="font-size:13px;color:#FCA5A5;margin-top:3px">Male, ~40s, head trauma. ETA 3 minutes. Reported by Reception — Akua Asante.</div>' +
        '<div style="display:flex;gap:8px;margin-top:10px">' +
          '<button onclick="_nurseAdmitResus()" style="padding:6px 14px;border-radius:5px;border:none;background:#fff;color:#DC2626;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Admit to Resus 2</button>' +
          '<button onclick="_N.alertDismissed=true;_nurseRender()" style="padding:6px 14px;border-radius:5px;border:1px solid rgba(255,255,255,.4);background:transparent;color:#fff;font-size:12px;cursor:pointer;font-family:inherit">Dismiss</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  ) : '';

  var rows = emergencies.map(function(p, i){
    var classColors = { Critical:'background:#DC2626;color:#fff', Urgent:'background:#D97706;color:#fff', Stable:'background:#16A34A;color:#fff' };
    return '<tr style="'+_trBg(i, 'Emergency')+';border-bottom:1px solid #E8EDF4">' +
      '<td style="padding:10px 14px"><div style="font-weight:600;font-size:13px">'+p.name+'</div><div style="font-size:11px;color:#6B7280">'+p.id+' · '+p.age+p.sex+'</div></td>' +
      _td(p.complaint,'max-width:200px') +
      _td(p.arrivalTime,'color:#6B7280') +
      _td(p.room||'—','font-weight:600') +
      '<td style="padding:8px 14px">' +
        (p.emergencyClass
          ? _badge(p.emergencyClass, classColors[p.emergencyClass]||'background:#6B7280;color:#fff')
          : _N.classifying===p.id
            ? '<div style="display:flex;gap:5px">'+['Critical','Urgent','Stable'].map(function(c){ return '<button onclick="_nurseClassify(\''+p.id+'\',\''+c+'\')" style="padding:3px 9px;border-radius:4px;border:none;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;'+classColors[c]+'">'+c+'</button>'; }).join('')+'</div>'
            : '<button onclick="_N.classifying=\''+p.id+'\';_nurseRender()" style="padding:3px 10px;border-radius:4px;border:1px solid #D1D9E6;color:#6B7280;font-size:11px;cursor:pointer;font-family:inherit;background:#fff">Classify</button>') +
      '</td>' +
      '<td style="padding:8px 14px">'+_badge(p.vitalStatus, p.vitalStatus==='Completed'?'background:#F0FDF4;color:#16A34A;border:1px solid #86EFAC':'background:#FFFBEB;color:#D97706;border:1px solid #FCD34D')+'</td>' +
      _td(p.aiRisk||'—','font-size:12px;color:#2563EB;font-style:italic;max-width:200px') +
      '<td style="padding:8px 14px">'+_btn('Notify Team','_nurseNotifyTeam(\''+p.id+'\')')+'</td>' +
    '</tr>';
  }).join('');

  return _nHeader('Emergency Handling', emergencies.length+' active emergency patient'+(emergencies.length!==1?'s':'')) +
    alert +
    '<div style="padding:6px 20px;font-size:13px;color:#6B7280;flex-shrink:0">' +
      '<strong style="color:#20242B">'+emergencies.length+'</strong> active emergency patient'+(emergencies.length!==1?'s':'') +
    '</div>' +
    '<div style="flex:1;overflow:auto;padding:0 20px 20px">' +
      '<table style="width:100%;border-collapse:collapse;border:1px solid #D1D9E6;border-radius:6px;overflow:hidden">' +
      '<thead><tr>'+['Patient','Complaint','Arrival','Room','Classification','Vitals','AI Risk','Actions'].map(_th).join('')+'</tr></thead>' +
      '<tbody>'+(rows||'<tr><td colspan="8" style="padding:28px;text-align:center;color:#6B7280;font-size:13px">No active emergency cases.</td></tr>')+'</tbody>' +
      '</table>' +
    '</div>';
}

/* ════════════════════════════════════════════════════════════════
   VIEW 5 — MESSAGING
════════════════════════════════════════════════════════════════ */
function _nMessaging() {
  var to = _N.msgTo || 'Doctor';
  var threads = [
    { role:'Receptionist', name:'Reception — Akua', icon:'📋', color:'#7C3AED', bg:'#F5F3FF' },
    { role:'Doctor',       name:'Dr. Mensah',       icon:'👨‍⚕️', color:'#2563EB', bg:'#EFF6FF' },
  ];

  var threadList = threads.map(function(th){
    var unread = _N.messages.filter(function(m){ return m.role===th.role&&m.unread; }).length;
    var active = to===th.role;
    return '<button onclick="_N.msgTo=\''+th.role+'\';_nurseRender()" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 16px;border:none;border-bottom:1px solid #D1D9E6;background:'+(active?th.bg:'#fff')+';cursor:pointer;text-align:left;font-family:inherit">' +
      '<span style="font-size:18px">'+th.icon+'</span>' +
      '<div style="flex:1"><div style="font-size:13px;font-weight:600;color:#20242B">'+th.name+'</div><div style="font-size:11px;color:#6B7280">'+th.role+'</div></div>' +
      (unread?'<span style="min-width:18px;height:18px;border-radius:9px;background:#DC2626;color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 3px">'+unread+'</span>':'') +
    '</button>';
  }).join('');

  var roleColors = { Receptionist:'background:#F5F3FF;color:#6D28D9;border:1px solid #DDD6FE', Doctor:'background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE', Nurse:'background:#F0FDF4;color:#166534;border:1px solid #86EFAC' };
  var msgs = _N.messages.filter(function(m){ return m.role===to||m.role==='Nurse'; });
  var msgList = msgs.length
    ? msgs.map(function(m){
        var isNurse = m.role==='Nurse';
        return '<div style="margin-bottom:12px;display:flex;flex-direction:column;align-items:'+(isNurse?'flex-end':'flex-start')+'">' +
          '<div style="font-size:10px;color:#6B7280;margin-bottom:3px">'+(isNurse?'You':m.from)+' · '+m.time+'</div>' +
          '<div style="max-width:72%;padding:9px 13px;border-radius:10px;font-size:13px;line-height:1.55;background:'+(isNurse?'#2563EB':'#F1F5F9')+';color:'+(isNurse?'#fff':'#20242B')+'">'+m.text+'</div>' +
          (m.unread&&!isNurse?'<span style="font-size:10px;color:#2563EB;margin-top:2px">Unread</span>':'') +
        '</div>';
      }).join('')
    : '<div style="text-align:center;padding:30px;color:#6B7280;font-size:13px">No messages with this contact yet.</div>';

  var compose = '<div style="padding:10px 14px;border-top:1px solid #D1D9E6;background:#FAFAFA;flex-shrink:0">' +
    '<div style="display:flex;gap:8px">' +
      '<textarea id="nurse-msg-compose" rows="2" placeholder="Message '+( to==='Doctor'?'Dr. Mensah':'Reception')+'…" style="flex:1;padding:8px 10px;border:1px solid #D1D9E6;border-radius:6px;font-size:13px;font-family:inherit;resize:none;outline:none">'+(_N.msgCompose||'')+'</textarea>' +
      '<button onclick="_nurseSendMsg()" style="padding:8px 16px;border-radius:6px;border:none;background:#2563EB;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;align-self:flex-end">Send</button>' +
    '</div>' +
  '</div>';

  return _nHeader('Communication', _N.messages.filter(function(m){return m.unread;}).length+' unread messages') +
    '<div style="flex:1;display:flex;min-height:0;overflow:hidden">' +
      '<div style="width:200px;flex-shrink:0;border-right:1px solid #D1D9E6;background:#EEF2F7;overflow-y:auto">'+threadList+'</div>' +
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
  var flagged = pts.filter(function(p){ return p.flags&&p.flags.length; }).length;

  var hourly = [
    {h:'06:00',n:3},{h:'07:00',n:7},{h:'08:00',n:12},{h:'09:00',n:9},
    {h:'10:00',n:6},{h:'11:00',n:8},{h:'12:00',n:11},{h:'13:00',n:5},{h:'14:00',n:4},
  ];
  var weekly = [
    {d:'Mon',t:48,e:4},{d:'Tue',t:52,e:6},{d:'Wed',t:61,e:3},
    {d:'Thu',t:44,e:5},{d:'Fri',t:57,e:8},{d:'Sat',t:38,e:2},{d:'Sun',t:29,e:1},
  ];
  var maxH = Math.max.apply(null, hourly.map(function(r){return r.n;}));
  var maxT = Math.max.apply(null, weekly.map(function(r){return r.t;}));

  var kpis = [
    { label:'Patients Triaged Today', value:triaged, sub:'Vitals completed',    color:'#2563EB' },
    { label:'Emergency Cases',        value:emCount, sub:'Priority: Emergency', color:'#DC2626' },
    { label:'Avg. Triage Duration',   value:'8.4m',  sub:'Per patient today',   color:'#20242B' },
    { label:'Abnormal Vital Flags',   value:flagged, sub:'AI-detected today',   color:'#D97706' },
  ];

  var kpiHtml = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">' +
    kpis.map(function(k){
      return '<div style="background:#fff;border:1px solid #D1D9E6;border-radius:6px;padding:16px 18px">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#6B7280;margin-bottom:5px">'+k.label+'</div>' +
        '<div style="font-size:28px;font-weight:800;color:'+k.color+';line-height:1">'+k.value+'</div>' +
        '<div style="font-size:11px;color:#6B7280;margin-top:3px">'+k.sub+'</div>' +
      '</div>';
    }).join('') + '</div>';

  /* Bar chart — patients per hour */
  var barChart = '<div style="background:#fff;border:1px solid #D1D9E6;border-radius:6px;padding:14px;margin-bottom:12px">' +
    '<div style="font-size:12px;font-weight:700;color:#20242B;margin-bottom:12px">Patients per Hour (Today)</div>' +
    '<div style="display:flex;align-items:flex-end;gap:4px;height:100px">' +
      hourly.map(function(r){
        var pct = maxH ? Math.round(r.n/maxH*100) : 0;
        return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">' +
          '<div style="font-size:10px;color:#6B7280">'+r.n+'</div>' +
          '<div style="width:100%;background:#2563EB;border-radius:3px 3px 0 0;height:'+pct+'%"></div>' +
          '<div style="font-size:9px;color:#6B7280;white-space:nowrap">'+r.h+'</div>' +
        '</div>';
      }).join('') +
    '</div>' +
  '</div>';

  /* Line chart — weekly */
  var lineChartW = 100/weekly.length;
  var pathT = weekly.map(function(r,i){ return (i===0?'M ':'L ')+(i*lineChartW+lineChartW/2)+'% '+(100-Math.round(r.t/maxT*80))+'%'; }).join(' ');
  var pathE = weekly.map(function(r,i){ return (i===0?'M ':'L ')+(i*lineChartW+lineChartW/2)+'% '+(100-Math.round(r.e/maxT*80))+'%'; }).join(' ');

  var lineChart = '<div style="background:#fff;border:1px solid #D1D9E6;border-radius:6px;padding:14px;margin-bottom:12px">' +
    '<div style="font-size:12px;font-weight:700;color:#20242B;margin-bottom:12px">Weekly Triage vs. Emergency Volume</div>' +
    '<div style="position:relative;height:100px">' +
      '<svg style="width:100%;height:100%" viewBox="0 0 700 100" preserveAspectRatio="none">' +
        '<path d="'+pathT+'" fill="none" stroke="#2563EB" stroke-width="2.5"/>' +
        '<path d="'+pathE+'" fill="none" stroke="#DC2626" stroke-width="2.5"/>' +
        weekly.map(function(r,i){ return '<text x="'+(i*lineChartW+lineChartW/2)+'%" y="98" text-anchor="middle" font-size="9" fill="#6B7280">'+r.d+'</text>'; }).join('') +
      '</svg>' +
    '</div>' +
    '<div style="display:flex;gap:12px;margin-top:6px">' +
      '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:#6B7280"><span style="width:14px;height:2.5px;background:#2563EB;display:inline-block;border-radius:2px"></span>Triaged</div>' +
      '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:#6B7280"><span style="width:14px;height:2.5px;background:#DC2626;display:inline-block;border-radius:2px"></span>Emergency</div>' +
    '</div>' +
  '</div>';

  /* Flagged vitals table */
  var flagRows = [];
  pts.forEach(function(p){
    (p.flags||[]).forEach(function(fl, fi){
      flagRows.push('<tr style="'+(flagRows.length%2===0?'background:#fff':'background:#F5F8FC')+';border-bottom:1px solid #E8EDF4">' +
        _td('<span style="font-weight:600">'+p.name+'</span> <span style="font-size:11px;color:#6B7280">('+p.id+')</span>') +
        _td(fl.field) +
        '<td style="padding:8px 14px;font-weight:700;color:#DC2626;font-size:13px">'+fl.value+'</td>' +
        _td(fl.reason) +
        _td(p.aiRisk||'—','font-size:12px;color:#2563EB;font-style:italic') +
      '</tr>');
    });
  });

  var flagTable = '<div style="background:#fff;border:1px solid #D1D9E6;border-radius:6px;overflow:hidden">' +
    '<div style="padding:10px 14px;border-bottom:1px solid #D1D9E6;background:#EEF2F7"><div style="font-size:12px;font-weight:700;color:#20242B">AI-Flagged Abnormal Vitals</div></div>' +
    '<table style="width:100%;border-collapse:collapse">' +
    '<thead><tr>'+['Patient','Vital','Value','Reason','AI Risk Note'].map(_th).join('')+'</tr></thead>' +
    '<tbody>'+(flagRows.join('')||'<tr><td colspan="5" style="padding:20px;text-align:center;color:#6B7280;font-size:13px">No flagged vitals today.</td></tr>')+'</tbody>' +
    '</table>' +
  '</div>';

  return _nHeader("Analytics & Reporting", "Today's triage summary") +
    '<div style="flex:1;overflow:auto;padding:16px 20px">' +
      kpiHtml +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' + barChart + lineChart + '</div>' +
      flagTable +
    '</div>';
}

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
  var emailHtml = '<div style="font-family:Arial;max-width:500px;margin:0 auto">' +
    '<div style="background:linear-gradient(135deg,#2563EB,#1D4ED8);padding:22px;border-radius:10px 10px 0 0;text-align:center">' +
      '<h2 style="color:#fff;margin:0;font-size:18px">Now Serving at Nurse Station</h2>' +
    '</div>' +
    '<div style="background:#f8fafc;padding:22px;border-radius:0 0 10px 10px">' +
      '<p style="font-size:14px;color:#475569">Dear <strong>' + ptName + '</strong>,</p>' +
      '<div style="background:#fff;border-radius:10px;border:2px solid #BFDBFE;padding:20px;text-align:center;margin-bottom:16px">' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94A3B8;margin-bottom:6px">Your token</div>' +
        '<div style="font-size:48px;font-weight:900;font-family:monospace;color:#2563EB;line-height:1">' + token + '</div>' +
        '<div style="margin-top:12px;font-size:15px;font-weight:700;color:#20242B">is now being called to</div>' +
        '<div style="font-size:24px;font-weight:800;color:#2563EB;margin-top:4px">Nurse Station ' + stationNum + '</div>' +
      '</div>' +
      '<p style="font-size:13px;color:#475569">Please proceed to <strong>Nurse Station ' + stationNum + '</strong> immediately for your vitals check.</p>' +
      '<p style="font-size:12px;color:#94A3B8">Johannesburg CHC · Emergencies: 10177</p>' +
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

  /* Save vitals to backend */
  try {
    await API._fetchDirect('/patients/'+(p.pid||p.id)+'/vitals', {
      method:'POST',
      body: JSON.stringify({ vitals:form, flags:flags, recordedAt:new Date().toISOString() })
    }).catch(function(){});
  } catch(_){}

  /* Push patient to doctor queue immediately */
  var docEntry = {
    id:         p.id,
    pid:        p.pid || p.id,
    name:       p.name,
    age:        p.age,
    sex:        p.sex,
    complaint:  p.complaint,
    priority:   p.priority,
    vitals:     p.vitals,
    flags:      p.flags,
    aiRisk:     p.aiRisk || null,
    arrivedAt:  _nowTime(),
    department: p.department || 'General Consultation',
    fromNurse:  true,
  };
  if (!window._DOCTOR_QUEUE) window._DOCTOR_QUEUE = [];
  window._DOCTOR_QUEUE.push(docEntry);
  if (window._dcAddPatient) window._dcAddPatient(docEntry);

  _nurseRender();

  if (flags.length) {
    UI.showToast('Vitals saved · '+flags.length+' flag'+(flags.length>1?'s':'')+' · '+p.name+' sent to doctor queue','warn');
  } else {
    UI.showToast('Vitals complete · '+p.name+' sent to doctor queue','ok');
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

/* ─── Public bridge ──────────────────────────────────────────────────── */
window._nurseAddRequest = function(req) {
  if (!window._NURSE_REQUESTS) window._NURSE_REQUESTS = [];
  window._NURSE_REQUESTS.push(req);
  if (document.getElementById('nurse-sidebar')) _nurseRender();
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
