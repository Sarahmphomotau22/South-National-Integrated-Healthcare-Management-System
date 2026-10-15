/**
 * js/pages/doctor.js — NIHMS Doctor Portal
 *
 * Pages: doc_dashboard · appointments · patients · consult · prescriptions
 *        lab · lab_results · radiology · referrals · medical_notes
 *        telemedicine · messages · notifications · med_certs · doc_tasks
 *
 * Patient 360° View: demographics · allergies · history · medications ·
 *   consultations · labs · radiology · diagnoses · prescriptions ·
 *   vitals · referrals · documents · upcoming appointments
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ─── Shared state ─────────────────────────────────────────────────── */
var _D = {
  view:           'dashboard',
  selectedPat:    null,
  pat360Id:       null,
  consultId:      null,
  notifications:  [
    { id:1, type:'critical', icon:'🔴', text:'Critical lab result — Patient A: Troponin elevated',  time:'08:42', read:false },
    { id:2, type:'warn',     icon:'🟠', text:'Prescription approval pending — Patient B',            time:'08:30', read:false },
    { id:3, type:'info',     icon:'🟡', text:'Referral response received from Cardiology',              time:'07:55', read:true  },
    { id:4, type:'ok',       icon:'🟢', text:'Lab results ready — Patient D (CBC)',                 time:'07:20', read:true  },
  ],
  messages: [
    { id:1, from:'Nurse Station',    role:'Nurse',        text:'Patient Yaw Appiah vitals recorded. BP 142/88, stable. Ready for consultation.',     time:'08:50', unread:true  },
    { id:2, from:'Reception',        role:'Receptionist', text:'Patient has arrived and is checked in. Please expect them after vitals.', time:'08:45', unread:true  },
    { id:3, from:'Dr Sithole',       role:'Doctor',       text:'Referral accepted — Grace Mahlangu, Cardiology Friday 09:00.',                         time:'08:15', unread:true  },
    { id:4, from:'Pharmacy',         role:'Pharmacy',     text:'Amlodipine 10mg dispensed for Nomsa Dlamini. Script on file.',                         time:'07:30', unread:false },
    { id:5, from:'Nurse Station',    role:'Nurse',        text:'EMERGENCY: Johan van Wyk BP 190/110. Requesting immediate review.',                     time:'07:15', unread:false },
    { id:6, from:'Reception',        role:'Receptionist', text:'Appointment reminder: 11:00 follow-up Sipho Ndlovu is confirmed.',                       time:'07:00', unread:false },
  ],
  tasks: [
    { id:'T1', type:'critical', label:'Review critical lab result',   patient:'Nomsa Dlamini',  done:false },
    { id:'T2', type:'warn',     label:'Approve prescription renewal', patient:'Sipho Ndlovu',   done:false },
    { id:'T3', type:'warn',     label:'Review referral response',     patient:'Grace Mahlangu', done:false },
    { id:'T4', type:'ok',       label:'Complete consultation notes',  patient:'Johan van Wyk',  done:false },
  ],
  todaySchedule: [
    { time:'08:00', patient:'Nomsa Dlamini',   type:'Consultation', status:'done'   },
    { time:'09:00', patient:'Sipho Ndlovu',    type:'Follow-up',    status:'done'   },
    { time:'10:00', patient:'Johan van Wyk',   type:'Consultation', status:'active' },
    { time:'10:30', patient:'Patient C',type:'Telemedicine', status:'upcoming'},
    { time:'11:00', patient:'Grace Mahlangu',  type:'Consultation', status:'upcoming'},
    { time:'12:00', patient:'Yaw Appiah',      type:'Follow-up',    status:'upcoming'},
    { time:'14:00', patient:'Kwame Asante',    type:'Consultation', status:'upcoming'},
    { time:'15:30', patient:'Abena Mensah',    type:'Lab review',   status:'upcoming'},
  ],
  msgCompose: '', msgTo: '',
  certForm:   { type:'Sick', patient:'', from:'', to:'', diagnosis:'', notes:'' },
  radForm:    { type:'X-Ray', patient:'', region:'', indication:'', urgent:false },
  refForm:    { patient:'', specialty:'', reason:'', urgency:'Routine', notes:'' },
  /* Clinical workflow — patient flows through each step */
  workflow: {
    patientId: null, patientName: '', patientDob: '', patientNationalId: '',
    consultationId: null, diagnosisId: null,
    step: 'consult',   /* consult → diagnosis → orders → referral → followup → appointment */
    consultation: { type:'New Consultation', chiefComplaint:'', onset:'', duration:'', severity:'',
                    symptoms:'', medHistory:'', currentMeds:'', allergies:'', examination:'',
                    clinicianNotes:'', outcomes:[], date:'', time:'', clinician:'', regNo:'' },
    diagnosis:    { primary:'', icd10:'', status:'Confirmed', secondary:[], assessment:'',
                    findings:'', differentials:'', risk:'Stable', basis:[] },
    labOrder:     { tests:[], specimen:'Blood', urgency:'Routine', clinicalInfo:'', collectorName:'', priority:'Routine' },
    radiologyOrder:{ type:'X-Ray', region:'Chest', indication:'', priority:'Routine', urgent:false,
                    contrast:false, pregnancy:'No', side:'Not Applicable', instructions:'' },
    prescription: { medications:[{name:'',strength:'',dose:'',route:'Oral',frequency:'Once daily',duration:'',qty:''}],
                    instructions:'', refill:false, refillCount:0, reviewDate:'' },
    referral:     { facility:'', specialty:'', clinician:'', priority:'Routine', reason:'',
                    diagnosis:'', icd10:'', labResults:'', imagingResults:'', attachments:[] },
    followup:     { type:'Routine Review', progress:'Improved', symptoms:'', labReview:'',
                    radReview:'', medicationPlan:'Continue Current Medication', assessment:'', plan:'' },
    appointment:  { type:'Follow-Up', dept:'', clinician:'', date:'', time:'',
                    visitType:'In Person', reason:'', notifications:['SMS'], reminders:['24 Hours Before'] },
  },
};

/* ─── CSS helpers ──────────────────────────────────────────────────── */
/* Pixel-accurate NIHMS colors sampled from the live receptionist UI */
var C = {
  /* Primary — exact banner/button green from receptionist screenshot */
  blue:'#0f6e56',   blueLt:'#e1f5ee', blueBd:'#a7f3d0',  /* reused as "primary" alias */
  teal:'#0f6e56',   tealDark:'#0a4f3e',                   /* button & active states */
  /* Banner gradient: dark teal-green left → dark navy right */
  bannerL:'#106b5d', bannerR:'#194d96',
  /* Sidebar active chip */
  activeChip:'#e1f5ee', activeText:'#0a4f3e',
  /* Page body bg (sampled: #f4f5f0) */
  bg:'#f4f5f0',
  /* Card surface */
  card:'#ffffff',
  /* Status colors */
  green:'#16a34a',  greenLt:'#f0fdf4', greenBd:'#86efac',
  amber:'#d97706',  amberLt:'#fffbeb', amberBd:'#fcd34d',
  red:'#dc2626',    redLt:'#fef2f2',   redBd:'#fca5a5',
  purple:'#7c3aed', purpleLt:'#f5f3ff',
  /* Text & borders */
  text:'#0f172a', muted:'#475569', border:'#e2e8f0',
};

function _h(t,c){return '<'+t+' style="'+c+'">'; }
function _dv(c,s){return '<div style="'+c+'">'+s+'</div>'; }
function _card(s,extra){return '<div style="background:'+C.card+';border-radius:14px;border:1px solid '+C.border+';padding:18px 20px;'+(extra||'')+'">'+s+'</div>'; }
function _badge(t,bg,color,bd){return '<span style="display:inline-flex;align-items:center;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:'+bg+';color:'+color+';border:1px solid '+(bd||bg)+'">'+t+'</span>'; }
function _th(h){return '<th style="padding:8px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';background:'+C.bg+';border-bottom:1px solid '+C.border+'">'+h+'</th>';}
function _td(c,s){return '<td style="padding:9px 14px;font-size:13px;color:'+C.text+';'+(s||'')+'">'+c+'</td>';}
/* Primary filled button — matches receptionist dark-green button */
function _btn(l,o,bg,outline){
  if(outline) return '<button onclick="'+o+'" style="display:inline-flex;align-items:center;gap:5px;padding:9px 16px;border-radius:9px;border:1.5px solid '+(bg||C.border)+';background:#fff;color:#475569;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">'+l+'</button>';
  return '<button onclick="'+o+'" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 20px;border-radius:9px;border:none;background:'+(bg||C.teal)+';color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">'+l+'</button>';
}
/* Small utility button */
function _btnSm(l,o,bg,outline){
  if(outline) return '<button onclick="'+o+'" style="display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:7px;border:1.5px solid '+(bg||C.border)+';background:#fff;color:#475569;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">'+l+'</button>';
  return '<button onclick="'+o+'" style="display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:7px;border:none;background:'+(bg||C.teal)+';color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">'+l+'</button>';
}
function _inp(id,label,ph,type,val){
  return '<div><label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#475569;margin-bottom:5px">'+label+'</label><input id="'+id+'" type="'+(type||'text')+'" value="'+(val||'')+'" placeholder="'+(ph||'')+'" style="width:100%;padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box" onfocus="this.style.borderColor=\''+C.teal+'\'" onblur="this.style.borderColor=\''+C.border+'\'"></div>';
}
function _sel(id,label,opts,val){
  return '<div><label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#475569;margin-bottom:5px">'+label+'</label><select id="'+id+'" style="width:100%;padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;background:#fff">'+opts.map(function(o){return '<option'+(o===val?' selected':'')+'>'+o+'</option>';}).join('')+'</select></div>';
}
function _ta(id,label,ph,rows){
  return '<div><label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#475569;margin-bottom:5px">'+label+'</label><textarea id="'+id+'" rows="'+(rows||3)+'" placeholder="'+(ph||'')+'" style="width:100%;padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:14px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box"></textarea></div>';
}
function _setView(v){
  _D.view=v; _dRender();
}
function _nowT(){ return new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}); }
function _todayStr(){ return new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }

/* ─── Shell ────────────────────────────────────────────────────────── */
Pages['doc_dashboard'] = function(){
  _D.view = 'dashboard';
  setTimeout(_dRender, 80);

  /* Accept patients from nurse queue */
  window._DOCTOR_QUEUE = window._DOCTOR_QUEUE || [];
  window._dcAddPatient = function(pt){
    if(!window._DOCTOR_QUEUE) window._DOCTOR_QUEUE=[];
    /* Avoid duplicates */
    var exists = window._DOCTOR_QUEUE.find(function(x){return x.id===pt.id;});
    if (!exists) window._DOCTOR_QUEUE.push(pt);
    if(document.getElementById('doc-main')) _dRender();
  };

  /* ── Cross-tab bridge: drain patients sent by nurse from another tab ── */
  (function(){
    function _handleDoctorPt(pt) {
      if (!pt || !pt.id) return;
      window._DOCTOR_QUEUE = window._DOCTOR_QUEUE || [];
      var exists = window._DOCTOR_QUEUE.find(function(x){ return x.id === pt.id; });
      if (!exists) {
        window._DOCTOR_QUEUE.push(pt);
        if (document.getElementById('doc-main')) _dRender();
      }
    }
    /* Drain persistent queue (nurse sent vitals before doctor logged in) */
    function _drainDoctorQueue() {
      try {
        var stored = JSON.parse(localStorage.getItem('_NIHMS_DOCTOR_QUEUE') || '[]');
        if (!stored.length) return;
        stored.forEach(function(pt){ _handleDoctorPt(pt); });
        localStorage.removeItem('_NIHMS_DOCTOR_QUEUE');
      } catch(_) {}
    }
    _drainDoctorQueue();
    setTimeout(_drainDoctorQueue, 500);
    window.addEventListener('storage', function(e) {
      if (e.key === '_NIHMS_DOCTOR_REQ' && e.newValue) {
        try { _handleDoctorPt(JSON.parse(e.newValue)); } catch(_) {}
      }
      if (e.key === '_NIHMS_DOCTOR_QUEUE' && e.newValue) { _drainDoctorQueue(); }
    });
    try {
      var _docCh = new BroadcastChannel('nihms_doctor_queue');
      _docCh.onmessage = function(e) {
        if (e.data && e.data.type === 'DOCTOR_PT') _handleDoctorPt(e.data.doc);
      };
    } catch(_) {}
  })();

  /* If shell already mounted, just switch to dashboard */
  if(document.getElementById('doc-main')){
    _D.view='dashboard'; _dRender(); return '';
  }

  return '<div style="display:flex;height:calc(100vh - 120px);overflow:hidden">'+
    '<main id="doc-main" style="flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column;background:'+C.bg+'"></main>'+
  '</div>';
};

/* ── FIX: alias so NIHMS host's Pages['doctor'] lookup works ── */
Pages['doctor'] = Pages['doc_dashboard'];

/* ── All nav IDs route through the same shell, setting the view ── */
/* The router calls Pages[id]() when sidebar nav is clicked.       */
/* Each entry sets _D.view and re-renders inside the existing shell */
function _dPage(view) {
  return function() {
    var main = document.getElementById('doc-main');
    if (main) {
      /* Shell already in DOM — just switch the view and re-render in place */
      _D.view = view;
      _dRender();
      /* Return empty string so the router doesn't inject a duplicate shell */
      return '';
    }
    /* Shell not in DOM — set view then mount once DOM is ready */
    _D.view = view;
    (function waitForShell(tries){
      if (document.getElementById('doc-main')) { _dRender(); return; }
      if (tries > 0) setTimeout(function(){ waitForShell(tries-1); }, 50);
    })(20);
    var user = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{firstName:'',lastName:'',role:'doctor'};
    window._DOCTOR_QUEUE = window._DOCTOR_QUEUE || [];
    window._dcAddPatient = function(pt){
      window._DOCTOR_QUEUE.push(pt);
      if(document.getElementById('doc-main')) _dRender();
    };
    return '<div style="display:flex;height:calc(100vh - 120px);overflow:hidden">'+
      '<main id="doc-main" style="flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column;background:'+C.bg+'"></main>'+
    '</div>';
  };
}

Pages['doc_appointments'] = _dPage('doc_appointments');
Pages['doc_tasks']     = _dPage('doc_tasks');
Pages['consult']       = _dPage('consult');
Pages['patients']      = _dPage('patients');
Pages['medical_notes'] = _dPage('medical_notes');
Pages['prescriptions'] = _dPage('prescriptions');
Pages['lab']           = _dPage('lab');
Pages['lab_results']   = _dPage('lab_results');
Pages['radiology']     = _dPage('radiology');
Pages['referrals']     = _dPage('referrals');
Pages['follow_up']     = _dPage('follow_up');
Pages['telemedicine']  = _dPage('telemedicine');
Pages['messages']      = _dPage('messages');
Pages['notifications'] = _dPage('notifications');
Pages['med_certs']      = _dPage('med_certs');
Pages['doc_all_certs']  = _dPage('doc_all_certs');
Pages['patient_file']   = _dPage('patient_file');
Pages['queue']         = _dPage('dashboard');

/* ─── Render engine ────────────────────────────────────────────────── */
function _dRender(){
  if(!document.getElementById('nihms-style')){var s=document.createElement('style');s.id='nihms-style';s.textContent='*{box-sizing:border-box}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:99px}body{font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif}';document.head.appendChild(s);}
  var main = document.getElementById('doc-main');
  if(!main) return;
  var views = {
    dashboard:   _dDashboard,
    doc_appointments:_dAppointments,
    patients:    _dPatients,
    pat360:      _dPat360,
    consult:     _dConsult,
    prescriptions:_dPrescriptions,
    lab:         _dLab,
    lab_results: _dLabResults,
    radiology:   _dRadiology,
    referrals:   _dReferrals,
    follow_up:   _dFollowUp,
    medical_notes:_dMedicalNotes,
    telemedicine:_dTelemedicine,
    messages:    _dMessages,
    notifications:_dNotifications,
    med_certs:    _dMedCerts,
    doc_all_certs:_dAllCerts,
    doc_tasks:   _dTasks,
    patient_file:_dPatientFile,
  };
  main.innerHTML = (views[_D.view]||_dDashboard)();
  _dBindEvents();
}

/* ─── Sidebar ──────────────────────────────────────────────────────── */
function _dSidebar(){
  var unreadN = _D.notifications.filter(function(n){return !n.read;}).length;
  var unreadM = _D.messages.filter(function(m){return m.unread;}).length;
  var pendingT= _D.tasks.filter(function(t){return !t.done;}).length;

  function nav(label, icon, view, badge, badgeColor){
    var active = _D.view===view || (_D.view==='pat360' && view==='patients');
    return '<button onclick="_setView(\''+view+'\')" style="display:flex;align-items:center;gap:9px;width:100%;padding:8px 14px;border:none;background:'+(active?C.activeChip:'transparent')+';color:'+(active?C.activeText:C.text)+';font-size:13px;font-weight:'+(active?'700':'500')+';cursor:pointer;text-align:left;font-family:inherit;border-right:3px solid '+(active?C.teal:'transparent')+'">' +
      '<span style="font-size:15px;width:18px;text-align:center">'+icon+'</span>'+
      '<span style="flex:1">'+label+'</span>'+
      (badge?'<span style="min-width:18px;height:18px;border-radius:9px;background:'+(badgeColor||C.teal)+';color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 3px">'+badge+'</span>':'')+
    '</button>';
  }
  function sec(t){return '<div style="padding:10px 14px 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+'">'+t+'</div>';}

  /* User info */
  var user = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{firstName:'',lastName:'',role:'doctor'};
  var ini  = ((user.firstName||'D')[0]+((user.lastName||'')[0]||'')).toUpperCase()||'DR';
  var docName = (user.firstName||user.lastName) ? 'Dr '+(user.firstName||'')+(user.lastName?' '+user.lastName:'') : 'Dr Molefe';

  return '<div style="padding:14px;border-bottom:1px solid '+C.border+';display:flex;align-items:center;gap:9px">'+
    '<div style="width:32px;height:32px;border-radius:50%;background:'+C.bannerL+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0">'+ini+'</div>'+
    '<div><div style="font-size:13px;font-weight:700;color:'+C.text+'">'+docName+'</div><div style="font-size:10px;color:'+C.muted+'">Physician</div></div>'+
  '</div>'+
  sec('Today')+
  nav('Dashboard',      '🏠','dashboard',    '',              '')+
  nav('Appointments',   '📅','doc_appointments','',              '')+
  nav('Clinical Tasks', '✅','doc_tasks',     pendingT||'',    C.amber)+
  sec('Patients')+
  nav('Patient 360°',   '👥','patients',      '',              '')+
  nav('Medical Notes',  '📝','medical_notes', '',              '')+
  sec('Orders & Results')+
  nav('Prescriptions',  '💊','prescriptions', '',              '')+
  nav('Lab Orders',     '🧪','lab',           '',              '')+
  nav('Lab Results',    '📊','lab_results',   '',              '')+
  nav('Radiology',      '🩻','radiology',     '',              '')+
  nav('Referrals',      '🔄','referrals',     '',              '')+
  sec('Communication')+
  nav('Telemedicine',   '📹','telemedicine',  '',              '')+
  nav('Messages',       '💬','messages',      unreadM||'',     C.teal)+
  sec('Documents')+
  nav('Cert Registry',   '📄','doc_all_certs', '',              '');
}

/* ─── Page header ──────────────────────────────────────────────────── */
function _dHeader(title, sub, action){
  /* Banner gradient matches receptionist exactly: #106b5d → #194d96 */
  return '<div style="background:linear-gradient(135deg,'+C.bannerL+','+C.bannerR+');border-radius:14px;padding:14px 22px;margin:12px 16px 0;box-shadow:0 2px 8px rgba(15,110,86,.25);flex-shrink:0;display:flex;align-items:center;justify-content:space-between">'+
    '<div><div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-.01em;margin-bottom:2px">'+title+'</div>'+(sub?'<div style="font-size:13px;color:rgba(255,255,255,.75)">'+sub+'</div>':'')+'</div>'+
    (action||'')+
  '</div>';
}

/* ══════════════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════════════ */
function _dDashboard(){
  var waiting = (window._DOCTOR_QUEUE||[]).filter(function(p){return p.status!=='done';});
  var unreadN = _D.notifications.filter(function(n){return !n.read;}).length;
  var unreadM = _D.messages.filter(function(m){return m.unread;}).length;
  var pendingT= _D.tasks.filter(function(t){return !t.done;}).length;

  /* Use live API data when already cached, else fall back to static seed */
  var aptCount = (window._dAptData && window._dAptData.length !== undefined)
    ? window._dAptData.length
    : _D.todaySchedule.length;

  /* Pending lab results — count unread lab/result notifications until async resolves */
  var labCount = _D.notifications.filter(function(n){
    return !n.read && (n.text.toLowerCase().indexOf('lab')>-1 || n.text.toLowerCase().indexOf('result')>-1);
  }).length;

  var kpis = [
    {id:'kpi-apt', label:"Today's Appointments", value:aptCount,  color:C.teal,   icon:'📅'},
    {id:'kpi-wait',label:'Waiting Patients',      value:waiting.length, color:C.amber, icon:'⏳'},
    {id:'kpi-lab', label:'Pending Lab Results',   value:labCount, color:C.purple, icon:'🧪'},
    {id:'kpi-task',label:'Pending Tasks',         value:pendingT, color:C.red,    icon:'✅'},
  ];

  var kpiHtml = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">'+
    kpis.map(function(k){
      return _card('<div style="display:flex;align-items:center;gap:12px">'+
        '<div style="font-size:24px">'+k.icon+'</div>'+
        '<div><div id="'+k.id+'" style="font-size:26px;font-weight:800;color:'+k.color+';line-height:1">'+k.value+'</div>'+
        '<div style="font-size:12px;color:'+C.muted+';margin-top:2px">'+k.label+'</div></div>'+
      '</div>');
    }).join('')+
  '</div>';

  /* ── Async refresh: fetch real appointment + lab counts and update tiles in-place ── */
  setTimeout(async function(){
    try {
      var u   = window.API && window.API.getStoredUser ? window.API.getStoredUser() : null;
      var did = u && (u._id || u.id);
      var now   = new Date();
      var start = new Date(now.getFullYear(),now.getMonth(),now.getDate()).toISOString();
      var end   = new Date(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59).toISOString();

      /* Fetch today's appointments */
      var aptRes  = await window.API.appointments.list({ doctor:did, dateFrom:start, dateTo:end, limit:50 });
      var aptItems= (aptRes&&aptRes.data)||(Array.isArray(aptRes)?aptRes:[]);
      window._dAptData = aptItems.map(function(a){
        var pat=a.patient||{};
        var name=(pat.firstName?((pat.firstName+' '+(pat.lastName||'')).trim()):null)||pat.name||'Unknown';
        var st=a.status==='in_progress'?'active':a.status==='completed'?'done':'upcoming';
        return {_id:a._id,time:new Date(a.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),
                patient:name,patId:pat._id||pat.id||'',type:(a.visitType||'consultation'),status:st,scheduledAt:a.scheduledAt};
      });
      var aptEl = document.getElementById('kpi-apt');
      if(aptEl) aptEl.textContent = window._dAptData.length;

      /* Fetch pending lab orders for this doctor */
      var labRes   = await window.API._fetchDirect('/labs?doctor='+did+'&status=pending&limit=100');
      var labItems = (labRes&&labRes.data)||(Array.isArray(labRes)?labRes:[]);
      var labEl    = document.getElementById('kpi-lab');
      if(labEl) labEl.textContent = labItems.length;
    } catch(e){ /* silently ignore — tiles keep their initial values */ }
  }, 0);

  /* Waiting patients from nurse queue */
  var queueHtml = waiting.length
    ? waiting.map(function(p,i){
        var pr = {Emergency:C.red,High:C.amber,Normal:C.green}[p.priority]||C.green;
        var hasFlagged = p.flags && p.flags.length > 0;
        var vr = p.vitalsRecord || null;
        var vTime = vr ? (vr.recordedTime||'') : '';
        var vDate = vr ? (vr.recordedDate||'') : '';
        var vPlace = vr ? (vr.facility||'Nurse Station') : 'Nurse Station';
        var vitSummary = p.vitals
          ? [['BP',p.vitals.bp,'mmHg'],['HR',p.vitals.hr,'bpm'],['Temp',p.vitals.temp,'°C'],['SpO₂',p.vitals.spo2,'%']].filter(function(r){return r[1];}).map(function(r){return '<span style="margin-right:8px;white-space:nowrap"><span style="font-weight:600;color:'+C.text+'">'+r[0]+':</span> '+r[1]+'<span style="font-size:9px;color:'+C.muted+'"> '+r[2]+'</span></span>';}).join('')
          : '';
        var mlBadge = p.mlRiskLevel ? '<span style="margin-left:4px;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:700;background:'+(p.mlRiskLevel==='HIGH'?'#fee2e2':p.mlRiskLevel==='MEDIUM'?'#fef3c7':'#dcfce7')+';color:'+(p.mlRiskLevel==='HIGH'?C.red:p.mlRiskLevel==='MEDIUM'?C.amber:C.green)+'">'+(p.mlRiskLevel==='HIGH'?'⚠ HIGH RISK':p.mlRiskLevel==='MEDIUM'?'⚡ MEDIUM':'✓ LOW')+'</span>' : '';
        return '<div style="padding:10px 14px;border-bottom:1px solid #f0f4f8;background:'+(hasFlagged?'#fff9f9':(i%2===0?'#fff':'#f8fafc'))+(hasFlagged?';border-left:3px solid '+C.red:'')+'">'+
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:'+(p.vitals?'6':'0')+'px">'+
            '<div style="width:34px;height:34px;border-radius:50%;background:'+(hasFlagged?'#fee2e2':C.blueLt)+';border:2px solid '+(hasFlagged?'#fca5a5':C.blueBd)+';color:'+(hasFlagged?C.red:C.teal)+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">'+(p.name.split(' ').map(function(n){return n[0];}).join('').slice(0,2))+'</div>'+
            '<div style="flex:1;min-width:0">'+
              '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">'+
                '<span style="font-size:13px;font-weight:700;color:'+C.text+'">'+p.name+'</span>'+
                _badge(p.priority,pr+'20',pr,pr+'40')+
                (hasFlagged?'<span style="font-size:11px;color:'+C.red+';font-weight:700;background:#fee2e2;padding:1px 6px;border-radius:10px">⚑ '+p.flags.length+' flag'+(p.flags.length>1?'s':'')+' flagged</span>':'<span style="font-size:10px;color:'+C.green+';background:#dcfce7;padding:1px 6px;border-radius:10px;font-weight:600">✓ Vitals normal</span>')+
                mlBadge+
              '</div>'+
              '<div style="font-size:11px;color:'+C.muted+';margin-top:1px">'+p.complaint+(p.age?' · '+p.age:'')+(p.sex?' · '+p.sex:'')+'</div>'+
            '</div>'+
            _btn('Consult ▶','_dStartConsult(\''+p.id+'\')',C.teal)+
          '</div>'+
          (p.vitals ? '<div style="margin-left:44px;background:'+(hasFlagged?'#fff1f1':'#f0fdf4')+';border:1px solid '+(hasFlagged?'#fca5a5':'#bbf7d0')+';border-radius:7px;padding:7px 10px">'+
            '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+(hasFlagged?C.red:C.green)+';margin-bottom:4px">'+
              (hasFlagged?'⚑ ':'✓ ')+'Vitals Recorded · '+(vTime?vTime+' · ':'')+vPlace+
            '</div>'+
            '<div style="font-size:11px;line-height:1.8">'+vitSummary+'</div>'+
            (hasFlagged&&p.flags.length ? '<div style="margin-top:4px;font-size:10px;color:'+C.red+'">Flags: '+p.flags.map(function(f){return (f.field||f)+(f.reason?' ('+f.reason+')':'');}).join(', ')+'</div>' : '')+
            (vDate ? '<div style="font-size:10px;color:'+C.muted+';margin-top:2px">Recorded: '+vDate+(vTime?' at '+vTime:'')+'</div>' : '')+
          '</div>' : '')+
        '</div>';
      }).join('')
    : '<div style="padding:20px;text-align:center;color:'+C.muted+';font-size:13px">No patients waiting from nurse station.<br>Patients appear here after nurse completes vitals.</div>';

  /* Today's schedule */
  var schedHtml = _D.todaySchedule.map(function(s,i){
    var stColor = {done:C.green,active:C.teal,upcoming:C.muted}[s.status]||C.muted;
    var stBg    = {done:C.greenLt,active:C.blueLt,upcoming:'#f8fafc'}[s.status]||'#f8fafc';
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f8fafc">'+
      '<div style="font-size:12px;font-family:monospace;font-weight:700;color:'+stColor+';width:48px;flex-shrink:0">'+s.time+'</div>'+
      '<div style="flex:1"><div style="font-size:13px;font-weight:600;color:'+C.text+'">'+s.patient+'</div><div style="font-size:11px;color:'+C.muted+'">'+s.type+'</div></div>'+
      '<span style="padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:'+stBg+';color:'+stColor+'">'+(s.status==='done'?'✓ Done':s.status==='active'?'● Active':'Upcoming')+'</span>'+
    '</div>';
  }).join('');

  /* Pending tasks */
  var tasksHtml = _D.tasks.filter(function(t){return !t.done;}).slice(0,4).map(function(t){
    var icon  = {critical:'🔴',warn:'🟠',info:'🟡',ok:'🟢'}[t.type]||'⚪';
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f8fafc">'+
      '<span style="font-size:14px">'+icon+'</span>'+
      '<div style="flex:1"><div style="font-size:12px;font-weight:600;color:'+C.text+'">'+t.label+'</div><div style="font-size:11px;color:'+C.muted+'">'+t.patient+'</div></div>'+
      _btn('Done','_dTaskDone(\''+t.id+'\')',C.green,true)+
    '</div>';
  }).join('');

  /* Notifications strip */
  var notifHtml = _D.notifications.filter(function(n){return !n.read;}).slice(0,3).map(function(n){
    return '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid #f8fafc">'+
      '<span style="font-size:14px;flex-shrink:0">'+n.icon+'</span>'+
      '<div style="flex:1;font-size:12px;color:'+C.text+'">'+n.text+'</div>'+
      '<div style="font-size:10px;color:'+C.muted+';flex-shrink:0">'+n.time+'</div>'+
    '</div>';
  }).join('');

  /* Greeting banner */
  var _greetHour = new Date().getHours();
  var _greetWord = _greetHour < 12 ? 'Good morning' : _greetHour < 17 ? 'Good afternoon' : 'Good evening';
  /* Live clock — update every second */
  if(window._docClockTimer) clearInterval(window._docClockTimer);
  window._docClockTimer = setInterval(function(){
    var el = document.getElementById('doc-greet-clock');
    if(!el){ clearInterval(window._docClockTimer); return; }
    el.textContent = new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }, 1000);

  var greetHtml = '<div style="background:linear-gradient(135deg,'+C.bannerL+','+C.bannerR+');border-radius:14px;padding:18px 24px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(15,110,86,.25)">'+
    '<div>'+
      '<div style="font-size:20px;font-weight:800;color:#fff;line-height:1.2;letter-spacing:.01em">'+_greetWord+', Dr Molefe</div>'+
      '<div style="font-size:13px;color:rgba(255,255,255,0.78);margin-top:4px" id="doc-greet-date">'+new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' &nbsp;·&nbsp; Johannesburg CHC</div>'+
    '</div>'+
    '<div style="text-align:right">'+
      '<div id="doc-greet-clock" style="font-size:28px;font-weight:900;color:#fff;letter-spacing:.04em;font-variant-numeric:tabular-nums;line-height:1">'+new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit',second:'2-digit'})+'</div>'+
    '</div>'+
  '</div>';

  return '<div style="flex:1;overflow:auto;padding:16px 20px">'+
      greetHtml+
      kpiHtml+
      '<div style="display:grid;grid-template-columns:1.2fr 1fr;gap:14px;margin-bottom:14px">'+
        /* Waiting patients */
        _card('<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
          '<div style="font-size:14px;font-weight:700;color:'+C.text+'">Patients Waiting</div>'+
          '<span style="font-size:12px;color:'+C.muted+'">From nurse station</span>'+
        '</div>'+queueHtml)+
        /* Today schedule */
        _card('<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
          '<div style="font-size:14px;font-weight:700;color:'+C.text+'">Today\'s Schedule</div>'+
          '<button onclick="_setView(\'appointments\')" style="font-size:12px;color:'+C.blue+';border:none;background:transparent;cursor:pointer">View all →</button>'+
        '</div>'+schedHtml)+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">'+
        _card('<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'+
          '<div style="font-size:14px;font-weight:700;color:'+C.text+'">Pending Actions</div>'+
          '<button onclick="_setView(\'doc_tasks\')" style="font-size:12px;color:'+C.amber+';border:none;background:transparent;cursor:pointer">View all →</button>'+
        '</div>'+tasksHtml)+
        _card('<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'+
          '<div style="font-size:14px;font-weight:700;color:'+C.text+'">Notifications</div>'+
          '<button onclick="_setView(\'notifications\')" style="font-size:12px;color:'+C.red+';border:none;background:transparent;cursor:pointer">View all →</button>'+
        '</div>'+notifHtml)+
      '</div>'+
    '</div>';
}

/* ══════════════════════════════════════════════════════════════════
   APPOINTMENTS
══════════════════════════════════════════════════════════════════ */
/* ── Appointments view tab state ── */
if (!window._aptTab) window._aptTab = 'day';
/* live data cached after first API fetch; reset on each page visit via setTimeout */

/* ══════════════════════════════════════════════════════════════════
   APPOINTMENTS — helpers at module scope so async callback can use them
══════════════════════════════════════════════════════════════════ */
function _aptTypeColor(type){
  var t=(type||'').toLowerCase();
  if(t.indexOf('consult')>-1)  return C.teal;
  if(t.indexOf('follow')>-1)   return C.green;
  if(t.indexOf('tele')>-1)     return C.purple;
  if(t.indexOf('lab')>-1)      return C.amber;
  if(t.indexOf('radiol')>-1)   return C.amber;
  if(t.indexOf('refer')>-1)    return C.red;
  return C.muted;
}
function _aptTypeBg(type){
  var t=(type||'').toLowerCase();
  if(t.indexOf('consult')>-1)  return C.blueLt;
  if(t.indexOf('follow')>-1)   return C.greenLt;
  if(t.indexOf('tele')>-1)     return C.purpleLt;
  if(t.indexOf('lab')>-1)      return C.amberLt;
  if(t.indexOf('radiol')>-1)   return C.amberLt;
  if(t.indexOf('refer')>-1)    return C.redLt;
  return '#f8fafc';
}
function _aptStBadge(status){
  var m={
    done:    {l:'Completed', bg:'#DCFCE7',c:'#166534'},
    active:  {l:'In Progress',bg:'#ccfbf1',c:'#0f766e'},
    upcoming:{l:'Pending',   bg:'#FEF9C3',c:'#854D0E'}
  };
  var s=m[status]||m.upcoming;
  return '<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:'+s.bg+';color:'+s.c+'">'+s.l+'</span>';
}

/* ── Calendar: time-slot grid (used by Day and Week views) ────────── */
function _aptCalGrid(colLabels, colApts, isWeek){
  var hours=['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
  var colW = isWeek ? (100/colLabels.length)+'%' : '1fr';
  var gridCols = isWeek ? 'auto repeat('+colLabels.length+',1fr)' : 'auto 1fr';

  var header =
    '<div style="display:grid;grid-template-columns:'+gridCols+';border-bottom:1.5px solid '+C.border+'">'+
      '<div style="width:52px;border-right:1px solid '+C.border+'"></div>'+
      colLabels.map(function(col,ci){
        return '<div style="padding:8px 10px;text-align:center;border-right:1px solid '+C.border+';background:'+(col.isToday?C.teal:'#f8fafc')+'">' +
          '<div style="font-size:11px;font-weight:800;color:'+(col.isToday?'#fff':C.muted)+';text-transform:uppercase;letter-spacing:.05em">'+col.short+'</div>'+
          '<div style="font-size:16px;font-weight:800;color:'+(col.isToday?'#fff':C.text)+';line-height:1.2">'+col.num+'</div>'+
          (col.count?'<div style="font-size:10px;color:'+(col.isToday?'rgba(255,255,255,.8)':C.muted)+'">'+col.count+' appt'+(col.count>1?'s':'')+'</div>':'<div style="font-size:10px;color:'+(col.isToday?'rgba(255,255,255,.4)':C.border)+'">—</div>')+
        '</div>';
      }).join('')+
    '</div>';

  var body = hours.map(function(hr){
    return '<div style="display:grid;grid-template-columns:'+gridCols+';border-bottom:1px solid #f1f5f9;min-height:54px">'+
      '<div style="width:52px;padding:4px 6px 0;font-size:11px;font-weight:600;color:'+C.muted+';border-right:1px solid '+C.border+';flex-shrink:0">'+hr+'</div>'+
      colLabels.map(function(col,ci){
        var apts=(colApts[ci]||[]).filter(function(a){ return (a.time||'').substring(0,5)===hr; });
        return '<div style="padding:2px 4px;border-right:1px solid #f1f5f9;background:'+(col.isToday?'rgba(225,245,238,.18)':'#fff')+'">'+
          apts.map(function(a){
            var tc=_aptTypeColor(a.type), tbg=_aptTypeBg(a.type);
            var pid=a.patId?('\''+a.patId+'\''):('\''+a.patient+'\'');
            return '<div onclick="_dSetPat360('+pid+')" style="background:'+tbg+';border-left:3px solid '+tc+';border-radius:0 6px 6px 0;padding:5px 7px;margin-bottom:2px;cursor:pointer">'+
              '<div style="font-size:11px;font-weight:700;color:'+C.text+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+a.patient+'</div>'+
              '<div style="font-size:10px;color:'+tc+';font-weight:600">'+a.time+' · '+a.type+'</div>'+
            '</div>';
          }).join('')+
        '</div>';
      }).join('')+
    '</div>';
  }).join('');

  return '<div style="background:#fff;border-radius:12px;border:1px solid '+C.border+';overflow:hidden">'+
    header+
    '<div style="overflow-y:auto;max-height:420px">'+body+'</div>'+
  '</div>';
}

/* ── Day view ─────────────────────────────────────────────────────── */
function _aptBuildDay(rows){
  var now=new Date();
  var col={
    short:now.toLocaleDateString('en-ZA',{weekday:'short'}).toUpperCase(),
    num:now.getDate(),
    isToday:true,
    count:rows.length
  };
  return _aptCalGrid([col],[rows],false);
}

/* ── Week view ────────────────────────────────────────────────────── */
function _aptBuildWeek(rows){
  var now=new Date();
  var dow=now.getDay(); // 0=Sun
  var monday=new Date(now); monday.setDate(now.getDate()-((dow+6)%7));
  var days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var cols=[],colApts=[];
  for(var i=0;i<7;i++){
    var d=new Date(monday); d.setDate(monday.getDate()+i);
    var isT=(d.toDateString()===now.toDateString());
    var dayApts=isT?rows:[];
    cols.push({short:days[i],num:d.getDate(),isToday:isT,count:dayApts.length});
    colApts.push(dayApts);
  }
  return _aptCalGrid(cols,colApts,true);
}

/* ── Month view ───────────────────────────────────────────────────── */
function _aptBuildMonth(rows){
  var n=new Date(),yr=n.getFullYear(),mo=n.getMonth(),tod=n.getDate();
  var fd=new Date(yr,mo,1).getDay(), dim=new Date(yr,mo+1,0).getDate();
  var ma={}; ma[tod]=rows;
  var cells='',off=(fd+6)%7;
  var dayNames=['Mo','Tu','We','Th','Fr','Sa','Su'];
  var header='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;margin-bottom:4px">'+
    dayNames.map(function(x){return '<div style="text-align:center;font-size:11px;font-weight:700;color:'+C.muted+';padding:6px 0;text-transform:uppercase;letter-spacing:.04em">'+x+'</div>';}).join('')+
  '</div>';
  for(var i=0;i<off;i++) cells+='<div></div>';
  for(var d=1;d<=dim;d++){
    var isT=(d===tod), dayR=ma[d]||[];
    cells+='<div style="border-radius:8px;border:1.5px solid '+(isT?C.teal:C.border)+';background:'+(isT?C.blueLt:'#fff')+';min-height:60px;padding:5px 7px;cursor:'+(dayR.length?'pointer':'default')+'"'+
      (dayR.length?' onclick="window._dAptTab(\'day\')"':'')+'>'+
      '<div style="font-size:12px;font-weight:'+(isT?800:600)+';color:'+(isT?C.teal:C.text)+';margin-bottom:3px">'+d+'</div>'+
      (dayR.length?dayR.slice(0,2).map(function(a){
        var tc=_aptTypeColor(a.type);
        return '<div style="background:'+C.blueLt+';border-left:2px solid '+tc+';border-radius:0 3px 3px 0;padding:2px 4px;margin-bottom:2px;font-size:9px;font-weight:700;color:'+C.text+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+a.patient.split(' ')[0]+'</div>';
      }).join('')+(dayR.length>2?'<div style="font-size:9px;color:'+C.muted+'">+'+( dayR.length-2)+' more</div>':''):'')+
    '</div>';
  }
  return '<div style="background:#fff;border-radius:12px;border:1px solid '+C.border+';padding:16px 18px">'+
    '<div style="font-size:14px;font-weight:700;color:'+C.text+';margin-bottom:14px">'+n.toLocaleDateString('en-ZA',{month:'long',year:'numeric'})+'</div>'+
    header+
    '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">'+cells+'</div>'+
  '</div>';
}

/* ── Year view ────────────────────────────────────────────────────── */
function _aptBuildYear(rows){
  var n=new Date(),yr=n.getFullYear(),curMo=n.getMonth(),tod=n.getDate();
  var months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  var miniCals=months.map(function(mName,mi){
    var fd=new Date(yr,mi,1).getDay();
    var dim=new Date(yr,mi+1,0).getDate();
    var off=(fd+6)%7;
    var isCurMo=(mi===curMo);
    var cells='';
    for(var i=0;i<off;i++) cells+='<div></div>';
    for(var d=1;d<=dim;d++){
      var isT=isCurMo&&(d===tod);
      var hasApt=isT&&rows.length>0;
      cells+='<div style="text-align:center;font-size:9px;font-weight:'+(isT?800:400)+';color:'+(isT?'#fff':C.text)+';background:'+(isT?C.teal:'transparent')+';border-radius:50%;width:16px;height:16px;line-height:16px;margin:1px auto;cursor:'+(hasApt?'pointer':'default')+'"'+(hasApt?' onclick="window._dAptTab(\'day\')"':'')+'>'+d+'</div>';
    }
    return '<div style="background:#fff;border:1px solid '+C.border+';border-radius:10px;padding:10px 12px;'+(isCurMo?'border-color:'+C.teal+';box-shadow:0 0 0 2px '+C.blueLt+';':'')+'">'+
      '<div style="font-size:11px;font-weight:700;color:'+(isCurMo?C.teal:C.text)+';margin-bottom:6px">'+mName+'</div>'+
      '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:0">'+
        ['M','T','W','T','F','S','S'].map(function(x){ return '<div style="text-align:center;font-size:8px;font-weight:700;color:'+C.muted+';padding:1px 0">'+x+'</div>'; }).join('')+
        cells+
      '</div>'+
    '</div>';
  }).join('');
  return '<div>'+
    '<div style="font-size:14px;font-weight:700;color:'+C.text+';margin-bottom:14px">'+yr+'</div>'+
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">'+miniCals+'</div>'+
  '</div>';
}

/* ── Today's Appointments table (below calendar) ─────────────────── */
function _aptTodayTable(rows){
  if(!rows||!rows.length) return '';
  var thead='<tr>'+
    ['REF','PATIENT','DEPARTMENT','TIME','TYPE','STATUS','ACTIONS'].map(function(h){
      return '<th style="padding:10px 14px;font-size:11px;font-weight:700;color:'+C.muted+';text-align:left;text-transform:uppercase;letter-spacing:.06em;border-bottom:1.5px solid '+C.border+'">'+h+'</th>';
    }).join('')+
  '</tr>';
  var tbody=rows.map(function(a,i){
    var tc=_aptTypeColor(a.type),tbg=_aptTypeBg(a.type);
    var ref=a.ref||('APT-'+(10000+i+1));
    var pid=a.patId?('\''+a.patId+'\''):('\''+a.patient+'\'');
    var dept=a.dept||(a.type.indexOf('Tele')>-1?'Telemedicine':a.type.indexOf('Lab')>-1?'Lab':'General Consultation');
    return '<tr style="border-bottom:1px solid #f8fafc">'+
      '<td style="padding:10px 14px;font-size:11px;font-family:monospace;color:'+C.muted+'">'+ref+'</td>'+
      '<td style="padding:10px 14px"><span style="font-size:13px;font-weight:600;color:'+C.text+'">'+a.patient+'</span></td>'+
      '<td style="padding:10px 14px;font-size:13px;color:'+C.muted+'">'+dept+'</td>'+
      '<td style="padding:10px 14px;font-size:13px;font-weight:600;color:'+C.teal+'">'+a.time+'</td>'+
      '<td style="padding:10px 14px"><span style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:'+tbg+';color:'+tc+';border:1px solid '+tc+'20">'+a.type+'</span></td>'+
      '<td style="padding:10px 14px">'+_aptStBadge(a.status)+'</td>'+
      '<td style="padding:10px 14px;display:flex;gap:6px">'+
        '<button onclick="_dSetPat360('+pid+')" style="padding:5px 14px;background:'+C.teal+';color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Consult</button>'+
        '<button onclick="" style="padding:5px 14px;background:#fff;color:'+C.red+';border:1.5px solid '+C.red+';border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Cancel</button>'+
      '</td>'+
    '</tr>';
  }).join('');
  return '<div style="background:#fff;border-radius:12px;border:1px solid '+C.border+';overflow:hidden;margin-top:14px">'+
    '<div style="padding:12px 16px;border-bottom:1px solid '+C.border+'">'+
      '<span style="font-size:14px;font-weight:700;color:'+C.text+'">Today\'s Appointments ('+rows.length+')</span>'+
    '</div>'+
    '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead>'+thead+'</thead><tbody>'+tbody+'</tbody></table></div>'+
  '</div>';
}

/* ── Tab bar with Day / Week / Month / Year ───────────────────────── */
function _aptTabBar(active){
  var now=new Date();
  var rangeLabel='';
  if(active==='week'){
    var dow=now.getDay(),mon=new Date(now);
    mon.setDate(now.getDate()-((dow+6)%7));
    var sun=new Date(mon); sun.setDate(mon.getDate()+6);
    rangeLabel=mon.getDate()+' – '+sun.getDate()+' '+now.toLocaleDateString('en-ZA',{month:'long',year:'numeric'});
  } else if(active==='month'){
    rangeLabel=now.toLocaleDateString('en-ZA',{month:'long',year:'numeric'});
  } else if(active==='year'){
    rangeLabel=String(now.getFullYear());
  } else {
    rangeLabel=now.toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  }
  return '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">'+
    '<div style="display:flex;gap:2px;align-items:center">'+
      '<button onclick="" style="width:28px;height:28px;border:1px solid '+C.border+';background:#fff;border-radius:6px;cursor:pointer;font-size:14px;color:'+C.muted+'">‹</button>'+
      '<button onclick="" style="width:28px;height:28px;border:1px solid '+C.border+';background:#fff;border-radius:6px;cursor:pointer;font-size:14px;color:'+C.muted+'">›</button>'+
    '</div>'+
    '<span style="font-size:14px;font-weight:700;color:'+C.text+'">'+rangeLabel+'</span>'+
    '<div style="display:flex;gap:3px;background:#f1f5f9;border-radius:8px;padding:3px;margin-left:auto">'+
      ['day','week','month','year'].map(function(id){
        var on=active===id;
        return '<button onclick="window._dAptTab(\''+id+'\')" style="padding:6px 18px;border:none;border-radius:6px;font-size:13px;font-weight:'+(on?700:500)+';cursor:pointer;font-family:inherit;background:'+(on?C.teal:'transparent')+';color:'+(on?'#fff':C.muted)+';transition:all .15s">'+id.charAt(0).toUpperCase()+id.slice(1)+'</button>';
      }).join('')+
    '</div>'+
  '</div>';
}

function _dAppointments(){
  var tab = window._aptTab || 'day';
  window._dAptTab = function(t){ window._aptTab=t; if(typeof _dRender==='function') _dRender(); };

  /* ── Fetch live appointments on every page visit ── */
  setTimeout(async function(){
    var calArea   = document.getElementById('doc-apt-cal');
    var tableArea = document.getElementById('doc-apt-table');
    if (!calArea) return;
    try {
      calArea.innerHTML = '<div style="padding:32px;text-align:center;color:'+C.muted+'"><div class="spinner" style="width:24px;height:24px;margin:0 auto 10px"></div>Loading appointments…</div>';
      var u   = API.getStoredUser ? API.getStoredUser() : null;
      var did = u && (u._id || u.id);
      var today = new Date(); today.setHours(0,0,0,0);
      var todayStr = today.toISOString().slice(0,10);

      /* Try direct fetch first (more field variants), fall back to API wrapper */
      var res = null;
      try {
        res = await API._fetchDirect('/appointments?limit=200&sort=date', {method:'GET'});
      } catch(_) {}
      if (!res || !res.data) {
        try {
          var now = new Date();
          var start = new Date(now.getFullYear(),now.getMonth(),now.getDate()).toISOString();
          var end   = new Date(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59).toISOString();
          res = await API.appointments.list({ doctor:did, dateFrom:start, dateTo:end, limit:100 });
        } catch(_) {}
      }

      var raw = [];
      if (res && res.data) {
        raw = Array.isArray(res.data) ? res.data : (res.data.appointments||res.data.docs||[]);
      } else if (Array.isArray(res)) {
        raw = res;
      }

      /* Normalize each appointment — handle every field-name variant the backend may use */
      var allRows = raw.map(function(a){
        var rawDate = a.scheduledAt||a.date||a.appointmentDate||a.scheduledDate||a.dateTime||'';
        var dateStr = rawDate ? String(rawDate).slice(0,10) : '';
        var rawTime = a.time||a.appointmentTime||a.scheduledTime||'';
        if (!rawTime && rawDate && String(rawDate).length > 10) rawTime = String(rawDate).slice(11,16);
        if (!rawTime && rawDate) {
          try { rawTime = new Date(rawDate).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false}); } catch(_){}
        }
        var patObj = a.patient||(typeof a.patientId==='object'&&a.patientId?a.patientId:null);
        var docObj = a.doctor||(typeof a.doctorId==='object'&&a.doctorId?a.doctorId:null);
        var patName = patObj ? ((patObj.firstName||patObj.name||'')+' '+(patObj.lastName||'')).trim() : (a.patientName||a.name||'—');
        if (!patName || patName==='—') patName = 'Unknown Patient';
        var vt = (a.visitType||a.type||a.appointmentType||'Consultation').replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});
        var st = a.status==='in_progress'?'active':a.status==='completed'?'done':a.status==='cancelled'?'cancelled':'upcoming';
        var dept = a.department||a.dept||a.departmentName||'';
        return {
          _id: a._id||a.id,
          ref: a.appointmentNumber||a.referenceNumber||a.ref||('APT-'+String(a._id||a.id||'').slice(-5).toUpperCase()),
          time: rawTime||'—',
          date: dateStr,
          patient: patName,
          patId: (patObj?patObj._id||patObj.id:null)||a.patientId||'',
          type: vt,
          dept: dept,
          status: st,
          scheduledAt: rawDate,
          notes: a.notes||a.reason||''
        };
      });

      /* Filter to today only */
      var rows = allRows.filter(function(a){ return a.date === todayStr; })
        .sort(function(a,b){ return (a.time||'').localeCompare(b.time||''); });

      /* Also update _D.todaySchedule so other parts of the page stay consistent */
      _D.todaySchedule = rows.map(function(a){ return {time:a.time, patient:a.patient, type:a.type, status:a.status}; });

      window._dAptData = rows;
      var cur = window._aptTab || 'day';
      calArea.innerHTML   = cur==='day'?_aptBuildDay(rows):cur==='week'?_aptBuildWeek(rows):cur==='month'?_aptBuildMonth(rows):_aptBuildYear(rows);
      if(tableArea) tableArea.innerHTML = _aptTodayTable(rows);
      var cnt = document.getElementById('doc-apt-count');
      if(cnt) cnt.textContent = rows.length+' today';
    } catch(e){
      console.error('apt fetch',e);
      if(calArea) calArea.innerHTML='<div style="padding:24px;text-align:center;color:#dc2626">⚠ Could not load appointments</div>';
    }
  }, 0);

  var schd = (window._dAptData && window._dAptData.length) ? window._dAptData : [];
  var dateLabel = new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  var calHtml = tab==='week' ? _aptBuildWeek(schd)
              : tab==='month' ? _aptBuildMonth(schd)
              : tab==='year'  ? _aptBuildYear(schd)
              : _aptBuildDay(schd);  /* default: day */

  return _dHeader('Appointments',
      dateLabel+' · <span id="doc-apt-count">'+schd.length+' today</span>')+
    '<div style="flex:1;overflow:auto;padding:16px 20px">'+
      _aptTabBar(tab)+
      '<div id="doc-apt-cal">'+calHtml+'</div>'+
      '<div id="doc-apt-table">'+_aptTodayTable(schd)+'</div>'+
    '</div>';
}

/* ══════════════════════════════════════════════════════════════════
   PATIENTS — search + list
══════════════════════════════════════════════════════════════════ */
function _dPatients(){
  var pf = _D.patSearch||'';
  return _dHeader('Patients', 'Search and open Patient 360° View')+
    '<div style="flex:1;overflow:auto;padding:16px 20px">'+
      _card('<div style="font-size:14px;font-weight:700;color:'+C.text+';margin-bottom:14px">Patient Search</div>'+
        '<div style="display:flex;gap:10px;margin-bottom:16px">'+
          '<input id="doc-pat-search" type="text" value="'+(pf||'')+'" placeholder="" '+
          'style="flex:1;padding:11px 14px;border:1.5px solid '+C.border+';border-radius:9px;font-size:14px;font-family:inherit;outline:none" '+
          'onfocus="this.style.borderColor=\''+C.teal+'\'" onblur="this.style.borderColor=\''+C.border+'\'">'+
          _btn('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Search','_dSearchPatients()',C.teal)+
        '</div>'+
        '<div id="doc-pat-results">'+
          (_D.patients&&_D.patients.length?_dPatRows(_D.patients):'<div style="padding:20px;text-align:center;color:'+C.muted+';font-size:13px">Search for a patient or browse below</div>')+
        '</div>')+
      '<div style="margin-top:14px">'+
        '<div style="font-size:13px;font-weight:700;color:'+C.text+';margin-bottom:10px">Today\'s Patients</div>'+
        _card(_D.todaySchedule.map(function(s,i){
          return '<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f8fafc;cursor:pointer" onclick="_dSetPat360(\''+s.patient+'\')">'+
            '<div style="width:32px;height:32px;border-radius:50%;background:'+C.blueLt+';border:1.5px solid '+C.blueBd+';color:'+C.blue+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">'+s.patient.split(' ').map(function(n){return n[0];}).join('').slice(0,2)+'</div>'+
            '<div style="flex:1"><div style="font-size:13px;font-weight:600;color:'+C.text+'">'+s.patient+'</div><div style="font-size:11px;color:'+C.muted+'">'+s.time+' · '+s.type+'</div></div>'+
            '<span style="font-size:12px;color:'+C.blue+';font-weight:600">Open 360° →</span>'+
          '</div>';
        }).join(''),'padding:10px 14px')+
      '</div>'+
    '</div>';
}

function _dPatRows(patients){
  if(!patients||!patients.length) return '<div style="padding:16px;text-align:center;color:'+C.muted+';font-size:13px">No results found</div>';
  return '<table style="width:100%;border-collapse:collapse"><thead><tr>'+['Patient','ID','Phone','Status','Action'].map(_th).join('')+'</tr></thead><tbody>'+
    patients.map(function(p,i){
      var name = p.fullName||((p.firstName||'')+(p.lastName?' '+p.lastName:''));
      return '<tr style="background:'+(i%2===0?'#fff':'#f8fafc')+';border-bottom:1px solid '+C.border+'">'+
        _td('<span style="font-weight:600">'+name+'</span>')+
        _td(p.nationalId||p.mrn||'—','font-family:monospace;font-size:12px')+
        _td(p.phone||'—')+
        _td(_badge(p.status||'Active',C.greenLt,C.green,C.greenBd))+
        '<td style="padding:9px 14px">'+_btn('Patient 360°','_dSetPat360API(\''+p._id+'\')',C.blue)+'</td>'+
      '</tr>';
    }).join('')+
  '</tbody></table>';
}

/* ══════════════════════════════════════════════════════════════════
   PATIENT 360° VIEW
══════════════════════════════════════════════════════════════════ */
function _dPat360(){
  var pd = _D.pat360Data;
  if(!pd){
    return _dHeader('Patient 360°','Loading…')+
      '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:'+C.muted+'">Loading patient data…</div>';
  }
  var p    = pd;
  var v    = p.latestVitals||p.vitals||{};
  var ini  = ((p.firstName||'?')[0]+((p.lastName||'?')[0])).toUpperCase();

  /* Tab nav */
  var tab  = _D.p360Tab||'overview';
  var tabs = [
    {id:'overview',    label:'Overview'},
    {id:'history',     label:'Medical History'},
    {id:'medications', label:'Medications'},
    {id:'labs',        label:'Lab Results'},
    {id:'vitals',      label:'Vital Signs'},
    {id:'consultations',label:'Consultations'},
    {id:'prescriptions',label:'Prescriptions'},
    {id:'referrals',   label:'Referrals'},
    {id:'radiology',   label:'Radiology'},
    {id:'documents',   label:'Documents'},
  ];

  var tabBar = '<div style="display:flex;gap:0;border-bottom:1px solid '+C.border+';background:#fff;overflow-x:auto;flex-shrink:0">'+
    tabs.map(function(t){
      var active=tab===t.id;
      return '<button onclick="_D.p360Tab=\''+t.id+'\';_dRender()" style="padding:9px 14px;border:none;border-bottom:2px solid '+(active?C.blue:'transparent')+';background:transparent;color:'+(active?C.blue:C.muted)+';font-size:12px;font-weight:'+(active?'700':'500')+';cursor:pointer;font-family:inherit;white-space:nowrap">'+t.label+'</button>';
    }).join('')+
  '</div>';

  /* Patient identity bar */
  var idBar = '<div style="display:flex;align-items:center;gap:14px;padding:14px 20px;background:#fff;border-bottom:1px solid '+C.border+';flex-shrink:0">'+
    '<button onclick="_D.view=\'patients\';_D.pat360Data=null;_dRender()" style="font-size:12px;color:'+C.muted+';border:none;background:transparent;cursor:pointer;font-family:inherit">← Back</button>'+
    '<div style="width:44px;height:44px;border-radius:50%;background:'+C.teal+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0">'+ini+'</div>'+
    '<div style="flex:1">'+
      '<div style="font-size:17px;font-weight:800;color:'+C.text+'">'+(p.fullName||((p.firstName||'')+(p.lastName?' '+p.lastName:'')))+'</div>'+
      '<div style="font-size:12px;color:'+C.muted+'">'+
        (p.nationalId?'ID: '+p.nationalId+' · ':'')+
        (p.dateOfBirth?'DOB: '+new Date(p.dateOfBirth).toLocaleDateString('en-ZA')+' · ':'')+
        (p.gender||'')+(p.bloodGroup?' · Blood: '+p.bloodGroup:'')+
      '</div>'+
    '</div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
      _btn('🩺 Start Consult','_dStartConsult360()',C.teal)+
      _btn('💊 Prescribe','_D.selectedPat=_D.pat360Data;_D.view=\'prescriptions\';if(typeof _dRender===\'function\')_dRender()',C.green,true)+
      _btn('🧪 Lab Order','_D.labNewOrder=true;_D.selectedPat=_D.pat360Data;_D.view=\'lab\';if(typeof _dRender===\'function\')_dRender()',C.purple,true)+
      _btn('📝 Medical Notes','_D.selectedPat=_D.pat360Data;_D.consultPat=_D.pat360Data;_D.view=\'medical_notes\';if(typeof _dRender===\'function\')_dRender()','#0891b2',true)+
      _btn('📋 Med Certificate','_D.selectedPat=_D.pat360Data;_D.view=\'med_certs\';if(typeof _dRender===\'function\')_dRender()','#065f46',true)+
      _btn('🩻 Radiology','_D.selectedPat=_D.pat360Data;_D.view=\'radiology\';if(typeof _dRender===\'function\')_dRender()','#7c3aed',true)+
      _btn('🔄 Referral','_D.selectedPat=_D.pat360Data;_D.view=\'referrals\';if(typeof _dRender===\'function\')_dRender()','#b45309',true)+
    '</div>'+
  '</div>';

  /* Tab content */
  var content = '';

  if(tab==='overview'){
    /* Allergies */
    var allergies = p.allergies||[];
    var allergyBar = allergies.length
      ?'<div style="margin-bottom:14px;padding:10px 14px;background:'+C.redLt+';border:1px solid '+C.redBd+';border-left:4px solid '+C.red+';border-radius:8px">'+
          '<div style="font-size:12px;font-weight:700;color:'+C.red+';margin-bottom:6px">⚠ ALLERGIES & ALERTS</div>'+
          '<div style="display:flex;flex-wrap:wrap;gap:6px">'+allergies.map(function(a){return '<span style="padding:2px 10px;border-radius:4px;background:#fff;border:1px solid '+C.redBd+';font-size:12px;font-weight:600;color:'+C.red+'">'+a+'</span>';}).join('')+'</div>'+
        '</div>'
      :'<div style="margin-bottom:14px;padding:8px 14px;background:'+C.greenLt+';border:1px solid '+C.greenBd+';border-radius:8px;font-size:12px;color:'+C.green+'">✓ No known allergies</div>';

    /* Vitals card */
    var vitalsCard = _card(
      '<div style="font-size:12px;font-weight:700;color:'+C.text+';margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">Latest Vitals</div>'+
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'+
        [['BP',v.bp||v.bloodPressure,'mmHg'],['HR',v.hr||v.heartRate,'bpm'],['Temp',v.temp||v.temperature,'°C'],
         ['SpO₂',v.spo2||v.oxygenSaturation,'%'],['Weight',v.weight,'kg'],['RR',v.rr||v.respiratoryRate,'/min']].map(function(r){
          return '<div style="padding:8px;background:'+C.bg+';border-radius:6px;border:1px solid '+C.border+'">'+
            '<div style="font-size:10px;color:'+C.muted+';margin-bottom:2px">'+r[0]+'</div>'+
            '<div style="font-size:14px;font-weight:700;color:'+C.text+'">'+(r[1]||'—')+' <span style="font-size:11px;font-weight:400;color:'+C.muted+'">'+r[2]+'</span></div>'+
          '</div>';
        }).join('')+
      '</div>','margin-bottom:0'
    );

    /* Conditions */
    var conditions = p.conditions||p.medicalHistory||[];
    var condHtml = conditions.length
      ?conditions.map(function(c){return '<div style="padding:6px 0;border-bottom:1px solid #f8fafc;font-size:13px;color:'+C.text+'">• '+(c.name||c)+(c.status?' <span style="font-size:11px;color:'+C.muted+'">— '+c.status+'</span>':'')+'</div>';}).join('')
      :'<div style="font-size:13px;color:'+C.muted+'">No conditions recorded</div>';

    /* Medications */
    var meds = p.medications||p.currentMedications||[];
    var medHtml = meds.length
      ?meds.map(function(m){return '<div style="padding:6px 0;border-bottom:1px solid #f8fafc;font-size:13px;color:'+C.text+'">💊 '+(m.name||m.medication||m)+(m.dose?' · '+m.dose:'')+(m.frequency?' · '+m.frequency:'')+'</div>';}).join('')
      :'<div style="font-size:13px;color:'+C.muted+'">No current medications</div>';

    content = '<div style="padding:16px 20px">'+allergyBar+
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px">'+
        _card('<div style="font-size:12px;font-weight:700;color:'+C.text+';margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Demographics</div>'+
          '<div style="display:flex;flex-direction:column;gap:5px;font-size:13px;color:'+C.text+'">'+
          [['Phone', p.phone||'—'],['Email', p.email||'—'],['Address', p.address||'—'],['Blood Group', p.bloodGroup||'—']].map(function(r){return '<div><span style="color:'+C.muted+'">'+r[0]+':</span> <strong>'+r[1]+'</strong></div>';}).join('')+
          '</div>')+
        _card('<div style="font-size:12px;font-weight:700;color:'+C.text+';margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Active Conditions</div>'+condHtml)+
        _card('<div style="font-size:12px;font-weight:700;color:'+C.text+';margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Current Medications</div>'+medHtml)+
      '</div>'+
      vitalsCard+
    '</div>';
  }


  if(tab==='history'){
    var hist = p.medicalHistory||p.conditions||[];
    var histRows = hist.length ? hist.map(function(h){
      return '<div style="padding:10px 0;border-bottom:1px solid #f8fafc">'+
        '<div style="font-size:13px;font-weight:600;color:'+C.text+'">'+( h.name||h.condition||h)+'</div>'+
        (h.diagnosedDate ? '<div style="font-size:11px;color:'+C.muted+'">Diagnosed: '+h.diagnosedDate+'</div>' : '')+
        (h.notes ? '<div style="font-size:12px;color:'+C.muted+';margin-top:4px">'+h.notes+'</div>' : '')+
      '</div>';
    }).join('') : '<div style="padding:20px;text-align:center;color:'+C.muted+'">No medical history recorded</div>';
    content = '<div style="padding:16px 20px">'+_card(
      '<div style="font-size:14px;font-weight:700;color:'+C.text+';margin-bottom:14px">Medical History</div>'+
      histRows
    )+'</div>';
  }

  if(tab==='vitals'){
    var vh = p.vitalsHistory||p.vitalHistory||[];
    var vitBody = '';
    if(vh.length){
      vitBody = '<table style="width:100%;border-collapse:collapse"><thead><tr>'+
        ['Date','BP','HR','Temp','SpO2','Weight','Recorded by'].map(_th).join('')+
        '</tr></thead><tbody>'+
        vh.map(function(h,i){
          return '<tr style="background:'+(i%2===0?'#fff':'#f8fafc')+';border-bottom:1px solid '+C.border+'">'+
            _td(h.recordedDate||h.recordedAt||'—')+
            _td(h.vitals&&h.vitals.bp||'—')+
            _td(h.vitals&&h.vitals.hr||'—')+
            _td(h.vitals&&h.vitals.temp||'—')+
            _td(h.vitals&&h.vitals.spo2||'—')+
            _td(h.vitals&&h.vitals.weight||'—')+
            _td(h.recordedBy||'Nurse','font-size:12px;color:'+C.muted)+
          '</tr>';
        }).join('')+
        '</tbody></table>';
    } else {
      var vr = [['BP',v.bp||v.bloodPressure,'mmHg'],['HR',v.hr||v.heartRate,'bpm'],
                ['Temp',v.temp||v.temperature,'°C'],['SpO2',v.spo2,'%'],
                ['Weight',v.weight,'kg'],['RR',v.rr,'/min']];
      vitBody = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'+
        vr.map(function(r){
          return '<div style="padding:10px;background:'+C.bg+';border-radius:8px;border:1px solid '+C.border+'">'+
            '<div style="font-size:11px;color:'+C.muted+'">'+r[0]+'</div>'+
            '<div style="font-size:18px;font-weight:700;color:'+C.text+'">'+(r[1]||'—')+
            ' <span style="font-size:12px;color:'+C.muted+'">'+r[2]+'</span></div></div>';
        }).join('')+
      '</div>';
    }
    content = '<div style="padding:16px 20px">'+_card(
      '<div style="font-size:14px;font-weight:700;color:'+C.text+';margin-bottom:14px">Vital Signs History</div>'+
      vitBody
    )+'</div>';
  }

  var tabPlaceholders = {
    medications: '💊 Medications', labs: '🧪 Lab Results', consultations: '🩺 Consultations',
    prescriptions: '💊 Prescriptions', referrals: '🔄 Referrals', radiology: '🩻 Radiology', documents: '📄 Documents'
  };
  if(tabPlaceholders[tab]){
    var tabData = p[tab]||[];
    var tabInner = '<div style="font-size:14px;font-weight:700;color:'+C.text+';margin-bottom:14px">'+tabPlaceholders[tab]+'</div>'+
      (tabData.length ? tabData.map(function(item,i){
        return '<div style="padding:9px 0;border-bottom:1px solid #f8fafc;font-size:13px;color:'+C.text+'">'+(typeof item==='string'?item:JSON.stringify(item))+'</div>';
      }).join('') : '<div style="padding:24px;text-align:center;color:'+C.muted+'">No '+tab+' records on file</div>');
    content = '<div style="padding:16px 20px">'+_card(tabInner)+'</div>';
  }

  return idBar+tabBar+'<div style="flex:1;overflow:auto">'+content+'</div>';
}

/* ══════════════════════════════════════════════════════════════════
   CONSULTATION
══════════════════════════════════════════════════════════════════ */
function _dConsult(){
  var wf = _D.workflow;
  var waiting = window._DOCTOR_QUEUE||[];
  var p = _D.consultPat || null;
  var today = new Date().toISOString().slice(0,10);
  var timeNow = new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});
  var outcomes = ['Diagnosis Required','Investigation Required','Medication Required',
                  'Referral Required','Follow-Up Required','Emergency Escalation','No Further Action'];
  var consultTypes = ['New Consultation','Follow-Up','Emergency','Chronic Care','Post-Discharge','Other'];

  var patBar = p
    ? '<div style="background:'+C.blueLt+';border:1px solid '+C.blueBd+';border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">'+
        '<div style="width:40px;height:40px;border-radius:50%;background:'+C.blue+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0">'+
          p.name.split(' ').map(function(n){return n[0];}).join('').slice(0,2)+'</div>'+
        '<div style="flex:1"><div style="font-size:15px;font-weight:800;color:'+C.text+'">'+p.name+'</div>'+
          '<div style="font-size:12px;color:'+C.muted+'">ID: '+(p.id||'—')+' · Age: '+(p.age||'—')+(p.sex?' · '+p.sex:'')+(p.mlRiskLevel?' · ML Risk: <strong style="color:'+(p.mlRiskLevel==='HIGH'?C.red:p.mlRiskLevel==='MEDIUM'?C.amber:C.green)+'">'+p.mlRiskLevel+'</strong>':'')+'</div></div>'+
        '<button onclick="_D.consultPat=null;_D.consultPatId=null;_dRender()" style="font-size:11px;color:'+C.muted+';border:1px solid '+C.border+';background:#fff;border-radius:6px;padding:4px 10px;cursor:pointer;font-family:inherit">Change patient</button>'+
      '</div>'
    : '';

  var form = p
    ? '<div style="display:flex;flex-direction:column;gap:14px">'+
        /* Facility / Consultation Details */
        '<div style="background:'+C.bg+';border:1px solid '+C.border+';border-radius:10px;padding:14px">'+
          '<div style="font-size:12px;font-weight:700;color:'+C.blue+';text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">CONSULTATION DETAILS</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'+
            _inp('cs-date','Consultation Date','','date',today)+
            _inp('cs-time','Consultation Time','','time',timeNow)+
            _sel('cs-type','Consultation Type',consultTypes,'New Consultation')+
          '</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:10px">'+
            _inp('cs-clinician','Clinician','Full name')+
            _inp('cs-reg','Professional Registration No.','e.g. MP 1234567')+
            _inp('cs-facility','Facility / Clinic','e.g. Johannesburg CHC')+
          '</div>'+
        '</div>'+
        /* Chief Complaint */
        '<div style="background:'+C.bg+';border:1px solid '+C.border+';border-radius:10px;padding:14px">'+
          '<div style="font-size:12px;font-weight:700;color:'+C.blue+';text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">CHIEF COMPLAINT</div>'+
          _ta('cs-complaint','Chief Complaint','Describe the main reason for today\'s visit…',3)+
        '</div>'+
        /* History */
        '<div style="background:'+C.bg+';border:1px solid '+C.border+';border-radius:10px;padding:14px">'+
          '<div style="font-size:12px;font-weight:700;color:'+C.blue+';text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">HISTORY OF PRESENTING COMPLAINT</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">'+
            _inp('cs-onset','Onset','e.g. Sudden, gradual')+
            _inp('cs-duration','Duration','e.g. 3 days, 2 weeks')+
            _inp('cs-severity','Severity','Mild / Moderate / Severe')+
          '</div>'+
          _ta('cs-symptoms','Symptoms','Describe all symptoms reported by the patient…',3)+
        '</div>'+
        /* Medical History / Meds / Allergies */
        '<div style="background:'+C.bg+';border:1px solid '+C.border+';border-radius:10px;padding:14px">'+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
            _ta('cs-medhistory','Relevant Medical History','Past diagnoses, surgeries, hospitalisations…',3)+
            _ta('cs-currentmeds','Current Medications','List all current medications…',3)+
          '</div>'+
          '<div style="margin-top:10px">'+
            '<label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#475569;margin-bottom:6px">Allergies</label>'+
            '<div style="display:flex;gap:14px;margin-bottom:6px">'+
              '<label style="font-size:13px;color:'+C.text+';display:flex;align-items:center;gap:5px;cursor:pointer"><input type="radio" name="allergy" value="none" checked> No Known Allergies</label>'+
              '<label style="font-size:13px;color:'+C.text+';display:flex;align-items:center;gap:5px;cursor:pointer"><input type="radio" name="allergy" value="known"> Known Allergies</label>'+
            '</div>'+
            _inp('cs-allergies','Allergy Details','None known')+
          '</div>'+
        '</div>'+
        /* Vital Signs (pre-filled from nurse record) */
        (p.vitals ? (function(){
          var vr = p.vitalsRecord || null;
          var hasFlagged = p.flags && p.flags.length > 0;
          var vDate  = vr ? (vr.recordedDate || '') : '';
          var vTime  = vr ? (vr.recordedTime || '') : '';
          var vPlace = vr ? (vr.facility || 'Nurse Station') : 'Nurse Station';
          var vWard  = vr ? (vr.ward || '') : '';
          var vBy    = vr ? (vr.recordedBy || 'Nurse') : 'Nurse';
          var flaggedFields = (p.flags||[]).map(function(f){return (f.field||f).toLowerCase();});
          var vitalRows = [
            ['BP',           p.vitals.bp,     'mmHg',  'bp'],
            ['Pulse / HR',   p.vitals.hr,     'bpm',   'heartRate'],
            ['Temperature',  p.vitals.temp,   '°C',    'temperature'],
            ['SpO₂',         p.vitals.spo2,   '%',     'spo2'],
            ['Resp. Rate',   p.vitals.rr,     '/min',  'rr'],
            ['Weight',       p.vitals.weight, 'kg',    'weight'],
          ];
          var mlBadge = p.mlRiskLevel ? '<span style="padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;background:'+(p.mlRiskLevel==='HIGH'?'#fee2e2':p.mlRiskLevel==='MEDIUM'?'#fef3c7':'#dcfce7')+';color:'+(p.mlRiskLevel==='HIGH'?C.red:p.mlRiskLevel==='MEDIUM'?C.amber:C.green)+'">'+(p.mlRiskLevel==='HIGH'?'⚠ HIGH RISK':p.mlRiskLevel==='MEDIUM'?'⚡ MEDIUM RISK':'✓ LOW RISK')+'</span>' : '';
          var bg    = hasFlagged ? '#fff9f9' : C.greenLt;
          var bd    = hasFlagged ? '#fca5a5' : C.greenBd;
          var hdr   = hasFlagged ? C.red     : C.green;
          return '<div style="background:'+bg+';border:1px solid '+bd+';border-radius:10px;padding:14px">'+
            '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:10px">'+
              '<div>'+
                '<div style="font-size:12px;font-weight:700;color:'+hdr+';text-transform:uppercase;letter-spacing:.07em">'+(hasFlagged?'⚑ VITAL SIGNS — FLAGGED ABNORMALS':'✓ VITAL SIGNS — Recorded by Nurse')+'</div>'+
                '<div style="font-size:11px;color:'+C.muted+';margin-top:3px">'+
                  (vDate?'<strong>Date:</strong> '+vDate+'&nbsp;&nbsp;':'')+(vTime?'<strong>Time:</strong> '+vTime+'&nbsp;&nbsp;':'')+(vPlace?'<strong>Facility:</strong> '+vPlace:'')+(vWard?'&nbsp;&middot;&nbsp;'+vWard:'')+'<br>'+
                  '<strong>Recorded by:</strong> '+vBy+
                '</div>'+
              '</div>'+
              mlBadge+
            '</div>'+
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:'+(hasFlagged?'10':'0')+'px">'+
              vitalRows.map(function(r){
                var isFlagged = flaggedFields.some(function(f){return f.includes(r[3].toLowerCase())||r[3].toLowerCase().includes(f);});
                return '<div style="padding:10px;background:#fff;border-radius:8px;border:1.5px solid '+(isFlagged?C.red:bd)+'">'+
                  '<div style="font-size:10px;color:'+C.muted+';font-weight:600;text-transform:uppercase;letter-spacing:.05em">'+r[0]+'</div>'+
                  '<div style="font-size:16px;font-weight:800;color:'+(isFlagged?C.red:C.text)+';margin-top:2px">'+(r[1]||'—')+' <span style="font-size:11px;font-weight:400;color:'+C.muted+'">'+r[2]+'</span></div>'+
                  (isFlagged?'<div style="font-size:9px;color:'+C.red+';font-weight:700;margin-top:2px">⚑ FLAGGED</div>':'')+
                '</div>';
              }).join('')+
            '</div>'+
            (hasFlagged && p.flags.length ? '<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:7px;padding:9px 12px">'+
              '<div style="font-size:11px;font-weight:700;color:'+C.red+';margin-bottom:4px">Clinical Alerts — Requires Review:</div>'+
              p.flags.map(function(f){
                var label = typeof f==='string' ? f : ((f.field||'')+(f.value?' = '+f.value:'')+(f.reason?' — '+f.reason:'')+(f.status?' ('+f.status+')':''));
                return '<div style="font-size:11px;color:'+C.red+';padding:2px 0">⚑ '+label+'</div>';
              }).join('')+
              (p.aiRisk?'<div style="font-size:11px;color:#92400e;margin-top:5px;background:#fef3c7;border-radius:5px;padding:5px 8px">🤖 AI: '+p.aiRisk+'</div>':'')+
            '</div>' : '')+
          '</div>';
        })() : '')+
        /* Clinical Examination */
        '<div style="background:'+C.bg+';border:1px solid '+C.border+';border-radius:10px;padding:14px">'+
          '<div style="font-size:12px;font-weight:700;color:'+C.blue+';text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">CLINICAL EXAMINATION</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
            _ta('cs-general','General Examination','General appearance, nutrition, hydration…',3)+
            _ta('cs-systems','System Examination','Cardiovascular, respiratory, abdominal, neuro…',3)+
          '</div>'+
        '</div>'+
        /* Clinician Notes */
        '<div style="background:'+C.bg+';border:1px solid '+C.border+';border-radius:10px;padding:14px">'+
          '<div style="font-size:12px;font-weight:700;color:'+C.blue+';text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">CLINICIAN NOTES</div>'+
          _ta('cs-notes','Notes','Additional observations, clinical reasoning…',3)+
        '</div>'+
        /* Consultation Outcome */
        '<div style="background:'+C.bg+';border:1px solid '+C.border+';border-radius:10px;padding:14px">'+
          '<div style="font-size:12px;font-weight:700;color:'+C.blue+';text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">CONSULTATION OUTCOME</div>'+
          '<div style="display:flex;flex-wrap:wrap;gap:10px">'+
            outcomes.map(function(o){
              return '<label style="display:flex;align-items:center;gap:5px;font-size:13px;color:'+C.text+';cursor:pointer">'+
                '<input type="checkbox" value="'+o+'" class="cs-outcome"> '+o+'</label>';
            }).join('')+
          '</div>'+
        '</div>'+
        /* Actions */
        '<div style="display:flex;gap:10px;flex-wrap:wrap;padding-bottom:20px">'+
          _btn('✓ Save Consultation &amp; Continue to Diagnosis →','_dSaveConsult()',C.green)+
          _btn('💊 Prescription',"_D.view='prescriptions';_dRender()",C.blue,true)+
          _btn('🧪 Lab Order',"_D.labNewOrder=true;_D.view='lab';_dRender()",C.blue,true)+
          _btn('🩻 Radiology',"_D.view='radiology';_dRender()",C.blue,true)+
          _btn('🔄 Referral',"_D.selectedPat=_D.pat360Data;_D.view='referrals';_dRender()",C.blue,true)+
        '</div>'+
      '</div>'
    : '<div style="padding:40px;text-align:center;color:'+C.muted+'">'+
        '<div style="font-size:36px;margin-bottom:10px">🩺</div>'+
        '<div style="font-size:14px;font-weight:700;color:'+C.text+';margin-bottom:4px">Select a patient to begin consultation</div>'+
        '<div style="font-size:12px">Patients appear here after nurse records vitals</div>'+
      '</div>';

  return _dHeader('Clinical Consultation','',
    _btn('+ New','_dNewConsult()',C.blue))+
    '<div style="flex:1;overflow:auto;padding:16px 20px">'+
      '<div style="display:grid;grid-template-columns:1fr;gap:14px">'+
        /* Patient list hidden — form takes full width */
        (false && _card('<div style="font-size:11px;font-weight:700;color:'+C.muted+';text-transform:uppercase;margin-bottom:10px">Waiting Patients</div>'+
          (waiting.length
            ? waiting.map(function(pt,i){
                var active = _D.consultPatId===pt.id;
                _D._consultPats = _D._consultPats||{}; _D._consultPats[pt.id]=pt;
                return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;border:1.5px solid '+(active?C.blue:C.border)+';background:'+(active?C.blueLt:'#fff')+';margin-bottom:6px;cursor:pointer" onclick="_dSelectConsultPat(\''+pt.id+'\');">'+
                  '<div style="width:28px;height:28px;border-radius:50%;background:'+C.blue+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">'+pt.name.split(' ').map(function(n){return n[0];}).join('').slice(0,2)+'</div>'+
                  '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+pt.name+'</div>'+
                  '<div style="font-size:10px;color:'+(pt.mlRiskLevel==='HIGH'?C.red:pt.mlRiskLevel==='MEDIUM'?C.amber:C.muted)+'">'+( pt.mlRiskLevel||pt.priority||'Normal')+'</div></div>'+
                '</div>';
              }).join('')
            : '<div style="font-size:12px;color:'+C.muted+';padding:10px;text-align:center">No patients waiting</div>')+
          '<button onclick="_dNewConsult()" style="margin-top:6px;width:100%;padding:7px;border-radius:7px;border:1.5px dashed '+C.border+';background:transparent;font-size:11px;color:'+C.blue+';cursor:pointer;font-family:inherit">+ Add patient manually</button>'))+
        /* Form — full width */
        _card(patBar+form)+
      '</div>'+
    '</div>';
}


/* ── Prescription helpers ── */
var _rxRoutes = [
  'Oral (PO)','Sublingual (SL)','Topical','Inhalation',
  'Intravenous (IV)','Intramuscular (IM)','Subcutaneous (SC)','Rectal (PR)',
  'Ophthalmic','Otic','Nasal','Other'
];
var _rxFreqs = [
  'Once only (single dose)','Once daily (OD)','Twice daily (BD)','Three times daily (TDS)','Four times daily (QID)',
  'Every 4 hours','Every 6 hours','Every 8 hours',
  'At night (NOCTE)','As needed (PRN)'
];

function _rxFieldStyle(){
  return 'width:100%;padding:10px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;background:#fff;color:'+C.text+';transition:border-color .15s';
}
function _rxLabel(text, required){
  return '<label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#555;margin-bottom:6px">'+text+(required?' <span style="color:'+C.red+'">*</span>':'')+'</label>';
}
function _rxInp(id, label, ph, type, required){
  return '<div>'+_rxLabel(label,required)+'<input id="'+id+'" type="'+(type||'text')+'" placeholder="'+(ph||'')+'" style="'+_rxFieldStyle()+'"></div>';
}
function _rxSel(id, label, opts, required){
  return '<div>'+_rxLabel(label,required)+'<select id="'+id+'" style="'+_rxFieldStyle()+'">'+opts.map(function(o){return '<option value="'+o+'">'+o+'</option>';}).join('')+'</select></div>';
}
function _rxTa(id, label, ph, rows){
  return '<div>'+_rxLabel(label,false)+'<textarea id="'+id+'" rows="'+(rows||3)+'" placeholder="'+(ph||'')+'" style="'+_rxFieldStyle()+';resize:vertical"></textarea></div>';
}

function _rxMedBlock(n, removable){
  return '<div id="rx-med-block-'+n+'" style="background:#f8fafc;border:1.5px solid '+C.border+';border-radius:10px;padding:16px;margin-bottom:14px">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
      '<div style="font-size:12px;font-weight:800;color:'+C.text+';text-transform:uppercase;letter-spacing:.06em">Medication '+n+'</div>'+
      (removable?'<button onclick="_rxRemoveMed('+n+')" style="background:#fee2e2;border:none;cursor:pointer;font-size:12px;color:'+C.red+';font-weight:700;padding:4px 10px;border-radius:6px">✕ Remove</button>':'')+
    '</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">'+
      _rxInp('rx-med-name-'+n,'Medicine Name','','text',true)+
      _rxInp('rx-med-str-'+n,'Strength','','text',true)+
      _rxInp('rx-med-dose-'+n,'Dose','','text',true)+
    '</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">'+
      _rxSel('rx-med-route-'+n,'Route of Administration',_rxRoutes,true)+
      _rxSel('rx-med-freq-'+n,'Frequency',_rxFreqs,true)+
      _rxInp('rx-med-dur-'+n,'Duration','','text',true)+
    '</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">'+
      _rxInp('rx-med-qty-'+n,'Quantity to Dispense','','text',true)+
      '<div>'+_rxLabel('Unit',false)+
        '<select id="rx-med-unit-'+n+'" style="'+_rxFieldStyle()+'">'+
          ['Tablets','Capsules','ml','Sachets','Puffs','Drops','Ampoules','Tubes','Patches'].map(function(u){return '<option>'+u+'</option>';}).join('')+
        '</select>'+
      '</div>'+
    '</div>'+
    _rxTa('rx-med-notes-'+n,'Special Instructions for This Medicine','',2)+
  '</div>';
}

function _dPrescriptions(){
  var p    = _D.consultPat;
  var u    = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  var today= new Date();
  var todayFmt = today.toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});

  /* Card wrapper */
  function _rxCard(content){
    return '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px;margin-bottom:16px">'+content+'</div>';
  }
  /* Section title inside a card */
  function _rxCardTitle(title){
    return '<div style="font-size:15px;font-weight:800;color:'+C.text+';margin-bottom:16px">'+title+'</div>';
  }
  /* Read-only info cell */
  function _rxInfo(label,value,mono){
    return '<div>'+
      '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C.muted+';margin-bottom:4px">'+label+'</div>'+
      '<div style="font-size:14px;font-weight:700;color:'+C.text+';'+(mono?'font-family:monospace':'')+'">'+value+'</div>'+
    '</div>';
  }

  /* Resolve patient — consultPat (from consult queue), pat360Data (from Patient 360), or selectedPat */
  var pat = p || _D.pat360Data || _D.selectedPat || null;
  var patName = pat ? ((pat.firstName||pat.name||'')+' '+(pat.lastName||'')).trim()||'—' : '—';
  var patId   = pat ? (pat.mrn||pat._id||pat.id||'—') : '—';
  var patDob  = pat && pat.dateOfBirth
    ? new Date(pat.dateOfBirth).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})
    : '—';
  var patAllergies = pat ? (pat.allergies||[]) : [];

  /* Prescriber */
  var docName     = u.firstName ? ('Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim()) : (u.name||'—');
  var docFacility = (typeof u.facility==='string'?u.facility:'') || (u.facility&&u.facility.name) || (u.primaryFacility&&u.primaryFacility.name) || (u.facilityName) || 'Current healthcare facility';
  var docRegNo    = u.hpcsaNumber || u.hpcsa || u.registrationNumber || u.regNo || u.licenseNumber || '';

  /* Sidebar panel for prescriber info + workflow */
  var sidebar =
    '<div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">'+
      /* Prescriber card */
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Prescriber Details</div>'+
        '<div style="display:flex;flex-direction:column;gap:12px">'+
          '<div>'+
            '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Prescribing Clinician</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+docName+'</div>'+
          '</div>'+
          '<div>'+
            '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">HPCSA / Reg. No.</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+(docRegNo?C.text:C.muted)+';font-family:monospace">'+(docRegNo||'Not on record')+'</div>'+
          '</div>'+
          '<div>'+
            '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Facility</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+docFacility+'</div>'+
          '</div>'+
          '<div>'+
            '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Date</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+todayFmt+'</div>'+
          '</div>'+
        '</div>'+
        '<div style="margin-top:14px;padding:8px 10px;background:#f8fafc;border-radius:7px;font-size:10px;color:'+C.muted+';line-height:1.5">Electronic signature applied on save. Form No. generated automatically.</div>'+
      '</div>'+
      /* Workflow tracker */
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Clinical Workflow</div>'+
        ['Consultation','Diagnosis','Lab Orders','Radiology','Prescription','Referral','Follow-Up','Next Appointment'].map(function(step){
          var active = step==='Prescription';
          var done   = ['Consultation','Diagnosis'].indexOf(step)>-1;
          return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;font-weight:'+(active?700:500)+';color:'+(active?C.teal:done?C.green:C.muted)+'">'+
            '<span style="font-size:10px">'+(done?'✓':'○')+'</span>'+step+
          '</div>';
        }).join('')+
      '</div>'+
    '</div>';

  return _dHeader('Prescription', '')+
    '<div style="flex:1;overflow:auto;display:flex;gap:16px;padding:16px 20px 24px;box-sizing:border-box;align-items:flex-start">'+

      /* ── Main form column ── */
      '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:14px">'+

        /* Patient Information */
        _rxCard(
          _rxCardTitle('Patient Information')+
          '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">'+
            _rxInfo('Patient Name', patName)+
            _rxInfo('Patient ID',   patId, true)+
            _rxInfo('Date of Birth',patDob)+
            _rxInfo('Prescription Date', todayFmt)+
          '</div>'+
          (patAllergies.length
            ? '<div style="margin-top:14px;padding:8px 12px;background:#fee2e2;border-radius:7px;font-size:12px;color:'+C.red+';font-weight:700">⚠ Allergies: '+patAllergies.join(', ')+'</div>'
            : '')
        )+

        /* Medication Order */
        _rxCard(
          _rxCardTitle('Medication Order')+
          '<div id="rx-meds-container">'+_rxMedBlock(1,false)+'</div>'+
          '<button id="rx-add-med-btn" onclick="_rxAddMed()" '+
            'style="display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:11px;border:1.5px dashed '+C.border+';border-radius:9px;background:none;font-size:13px;font-weight:700;color:'+C.teal+';cursor:pointer;font-family:inherit;transition:background .12s" '+
            'onmouseenter="this.style.background=\'#f0fdf4\'" onmouseleave="this.style.background=\'none\'">'+
            '＋ Add Another Medication'+
          '</button>'
        )+

        /* Repeat Prescription */
        _rxCard(
          _rxCardTitle('Repeat Prescription')+
          /* Yes / No toggle */
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:10px">Is this a repeat prescription? <span style="color:'+C.red+'">*</span></div>'+
          '<div style="display:flex;gap:8px;margin-bottom:4px">'+
            '<label id="rx-rep-lbl-no" style="display:flex;align-items:center;gap:7px;padding:9px 20px;border:1.5px solid '+C.border+';border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;color:'+C.text+';background:#fff;transition:border .12s,background .12s">'+
              '<input type="radio" name="rx-repeat" value="no" checked onchange="_rxToggleRepeat()" style="accent-color:'+C.teal+'"> No'+
            '</label>'+
            '<label id="rx-rep-lbl-yes" style="display:flex;align-items:center;gap:7px;padding:9px 20px;border:1.5px solid '+C.border+';border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;color:'+C.text+';background:#fff;transition:border .12s,background .12s">'+
              '<input type="radio" name="rx-repeat" value="yes" onchange="_rxToggleRepeat()" style="accent-color:'+C.teal+'"> Yes'+
            '</label>'+
          '</div>'+

          /* Expanded fields — shown only when Yes */
          '<div id="rx-repeat-fields" style="display:none;margin-top:18px">'+

            /* Row 1: Repeats Allowed + Repeats Already Used */
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">'+
              /* Number of Repeats Allowed */
              '<div>'+
                _rxLabel('Number of Repeats Allowed',true)+
                '<input id="rx-rep-allowed" type="number" min="1" max="99" value="3" oninput="_rxCalcRepeats()" style="'+_rxFieldStyle()+'">'+
              '</div>'+
              /* Repeats Already Used — read-only, NIHMS-tracked */
              '<div>'+
                _rxLabel('Repeats Already Used',false)+
                '<div style="display:flex;align-items:center;gap:8px">'+
                  '<input id="rx-rep-used" type="number" min="0" value="0" readonly style="'+_rxFieldStyle()+';background:#f1f5f9;color:'+C.muted+';cursor:default">'+
                  '<span style="font-size:10px;color:'+C.muted+';white-space:nowrap">Auto-tracked by NIHMS</span>'+
                '</div>'+
              '</div>'+
            '</div>'+

            /* Row 2: Repeats Remaining (auto-calc) */
            '<div style="margin-bottom:14px">'+
              '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:6px">Repeats Remaining</div>'+
              '<div id="rx-rep-remaining-badge" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;font-size:15px;font-weight:800;background:#f0fdf4;color:'+C.green+';border:1.5px solid #bbf7d0">'+
                '<span>3</span> <span style="font-size:12px;font-weight:600">remaining</span>'+
              '</div>'+
              '<span style="margin-left:10px;font-size:11px;color:'+C.muted+'">Calculated automatically</span>'+
            '</div>'+

            /* Row 3: Next Review Date + Prescription Expiry Date */
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:4px">'+
              _rxInp('rx-review-date','Next Review Date','','date',true)+
              _rxInp('rx-expiry-date','Prescription Expiry Date','','date',false)+
            '</div>'+
            '<div style="font-size:10px;color:'+C.muted+';margin-top:4px">Expiry date is optional — leave blank if not applicable.</div>'+

          '</div>'/* end #rx-repeat-fields */
        )+

        /* Patient Instructions & Dispensing */
        _rxCard(
          _rxCardTitle('Patient Instructions & Dispensing')+
          '<div style="display:flex;flex-direction:column;gap:14px">'+
            _rxTa('rx-patient-instr','Instructions for the Patient','',3)+
            '<div>'+_rxLabel('Dispensing Pharmacy',false)+
              '<select id="rx-pharmacy" style="'+_rxFieldStyle()+'">'+
                '<option>Facility pharmacy</option>'+
                '<option>External / retail pharmacy</option>'+
                '<option>Chronic medication courier</option>'+
              '</select>'+
            '</div>'+
            _rxTa('rx-clinical-notes','Additional Clinical Notes','',3)+
          '</div>'
        )+

        /* Actions */
        '<div style="display:flex;gap:10px;margin-top:4px;margin-bottom:8px">'+
          '<button onclick="_dSaveRx()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'+
            'Submit Prescription'+
          '</button>'+
          '<button onclick="_D.view=\'dashboard\';_dRender()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">Cancel</button>'+
        '</div>'+

      '</div>'+

      /* ── Sidebar ── */
      sidebar+

    '</div>';
}

/* ── Prescription interactivity ── */
window._rxMedCount = window._rxMedCount || 1;
window._rxAddMed = function(){
  window._rxMedCount = (window._rxMedCount||1)+1;
  var n = window._rxMedCount;
  var cont = document.getElementById('rx-meds-container');
  if(!cont) return;
  var div = document.createElement('div');
  div.innerHTML = _rxMedBlock(n,true);
  cont.appendChild(div.firstChild);
};
window._rxRemoveMed = function(n){
  var el = document.getElementById('rx-med-block-'+n);
  if(el) el.parentNode.removeChild(el);
};
window._rxToggleRepeat = function(){
  var yes    = document.querySelector('input[name="rx-repeat"][value="yes"]');
  var rf     = document.getElementById('rx-repeat-fields');
  var lblNo  = document.getElementById('rx-rep-lbl-no');
  var lblYes = document.getElementById('rx-rep-lbl-yes');
  if(!rf) return;
  var isYes = yes && yes.checked;
  rf.style.display = isYes ? 'block' : 'none';
  /* Highlight active label */
  if(lblNo)  { lblNo.style.borderColor  = isYes ? '#e2e8f0' : '#0ea5e9'; lblNo.style.background  = isYes ? '#fff' : '#f0f9ff'; }
  if(lblYes) { lblYes.style.borderColor = isYes ? '#0ea5e9' : '#e2e8f0'; lblYes.style.background = isYes ? '#f0f9ff' : '#fff'; }
  if(isYes) window._rxCalcRepeats();
};
window._rxCalcRepeats = function(){
  var allowed  = parseInt((document.getElementById('rx-rep-allowed')||{}).value||'3',10)||0;
  var used     = parseInt((document.getElementById('rx-rep-used')||{}).value||'0',10)||0;
  var rem      = Math.max(0, allowed - used);
  var badge    = document.getElementById('rx-rep-remaining-badge');
  if(!badge) return;
  var color    = rem === 0 ? '#ef4444' : rem <= 1 ? '#f59e0b' : '#16a34a';
  var bg       = rem === 0 ? '#fee2e2' : rem <= 1 ? '#fef9c3' : '#f0fdf4';
  var border   = rem === 0 ? '#fca5a5' : rem <= 1 ? '#fde68a' : '#bbf7d0';
  badge.style.color       = color;
  badge.style.background  = bg;
  badge.style.borderColor = border;
  badge.innerHTML = '<span>'+rem+'</span> <span style="font-size:12px;font-weight:600">remaining</span>';
};
window._dPreviewRx = function(){
  UI.showToast('Prescription preview — coming soon','warn');
};
window._dSaveLabOrder = async function(){
  var test       = (document.getElementById('lab-test')||{value:''}).value;
  var specimen   = (document.getElementById('lab-specimen')||{value:''}).value;
  var priorityEl = document.querySelector('input[name="lab-priority"]:checked');
  var priority   = priorityEl ? priorityEl.value : 'Routine — standard processing';
  var indication = ((document.getElementById('lab-indication')||{value:''}).value||'').trim();
  if(!test)       { if(window.UI)UI.showToast('Select a laboratory test','err'); return; }
  if(!indication) { if(window.UI)UI.showToast('Clinical indication is required','err'); return; }
  var u3   = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  var pat3 = _D.consultPat||_D.pat360Data||_D.selectedPat||{};
  var payload = {
    patient:           pat3._id||pat3.id||'',
    patientName:       ((pat3.firstName||pat3.name||'')+' '+(pat3.lastName||'')).trim()||'Unknown',
    test:              test,
    specimenType:      specimen,
    priority:          priority,
    clinicalIndication:indication,
    collectionMethod:  (document.getElementById('lab-collection')||{value:''}).value,
    fastingInstructions:(document.getElementById('lab-fasting')||{value:''}).value,
    labNotes:          ((document.getElementById('lab-lab-notes')||{value:''}).value||'').trim(),
    orderedBy:         u3._id||u3.id||'',
    orderedByName:     u3.firstName?('Dr '+((u3.firstName||'')+' '+(u3.lastName||'')).trim()):(u3.name||''),
    facility:          (typeof u3.facility==='string'?u3.facility:'')|| (u3.facility&&u3.facility.name)||u3.facilityName||'',
    orderedAt:         new Date().toISOString(),
    status:            'pending',
  };
  try {
    await API._fetchDirect('/lab-orders',{method:'POST',body:JSON.stringify(payload)});
  } catch(_){}
  if(window.UI) UI.showToast('Lab order submitted','ok');
  _D.labNewOrder = false;
  _D.view = 'lab';
  _dRender();
};

window._labAddTest = function(){
  if(!window._D) return;
  _D._labTestCount = (_D._labTestCount||1) + 1;
  var n = _D._labTestCount;
  var C2 = (typeof C!=='undefined') ? C : {border:'#e2e8f0',text:'#1e293b',muted:'#64748b',teal:'#0d9488'};
  var labTests = [
    'Full Blood Count (FBC)','Differential White Cell Count','Haemoglobin (Hb)','Platelet Count',
    'Prothrombin Time (PT/INR)','Activated Partial Thromboplastin Time (aPTT)','Erythrocyte Sedimentation Rate (ESR)',
    'Blood Glucose (Fasting)','HbA1c (Glycated Haemoglobin)','Urea and Electrolytes (U&E)','Creatinine and eGFR',
    'Liver Function Tests (LFTs)','Bilirubin (Total and Direct)','Albumin','Lipid Profile',
    'Thyroid Stimulating Hormone (TSH)','Free T3 / Free T4','HIV 1&2 Antibody Screen','HIV Viral Load',
    'CD4 Count','VDRL / RPR (Syphilis Screen)','Hepatitis B Surface Antigen (HBsAg)','Hepatitis C Antibody',
    'TB GeneXpert (Sputum)','TB IGRA (QuantiFERON)','Malaria Rapid Antigen Test','Blood Culture and Sensitivity',
    'Mid-Stream Urine (MSU) Culture','Urine Analysis (Dipstick + Microscopy)','Stool Microscopy and Culture',
    'Cervical Swab (GC/Chlamydia)','Vaginal Swab (BV/Candida)','Wound Swab Culture','CRP (C-Reactive Protein)',
    'Ferritin / Iron Studies','Vitamin B12 and Folate','Vitamin D (25-OH)','PSA (Prostate Specific Antigen)',
    'Beta-hCG (Pregnancy Test)'
  ];
  var container = document.getElementById('lab-add-test-btn');
  if(!container) return;
  var block = document.createElement('div');
  block.id = 'lab-test-block-'+n;
  block.style.cssText = 'background:#fff;border:1.5px solid '+C2.border+';border-radius:12px;padding:20px 24px;margin-bottom:0';
  block.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'+
      '<div style="font-size:14px;font-weight:800;color:'+C2.text+'">TEST '+n+'</div>'+
      '<button onclick="document.getElementById(\'lab-test-block-'+n+'\').remove()" style="background:none;border:none;cursor:pointer;font-size:12px;color:'+C2.muted+';font-family:inherit;text-decoration:underline">Remove</button>'+
    '</div>'+
    '<div style="display:flex;flex-direction:column;gap:14px">'+
      '<div>'+
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C2.muted+';margin-bottom:6px">Laboratory Test <span style="color:#ef4444">*</span></div>'+
        '<select id="lab-test-'+n+'" style="width:100%;padding:9px 12px;border:1.5px solid '+C2.border+';border-radius:8px;font-size:13px;font-family:inherit;color:'+C2.text+';background:#fff;box-sizing:border-box">'+
          '<option value="">— Select test —</option>'+
          labTests.map(function(t){return'<option value="'+t+'">'+t+'</option>';}).join('')+
        '</select>'+
      '</div>'+
      '<div>'+
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C2.muted+';margin-bottom:6px">Clinical Indication</div>'+
        '<textarea id="lab-indication-'+n+'" rows="2" style="width:100%;padding:9px 12px;border:1.5px solid '+C2.border+';border-radius:8px;font-size:13px;font-family:inherit;color:'+C2.text+';background:#fff;box-sizing:border-box;resize:vertical"></textarea>'+
      '</div>'+
    '</div>';
  container.parentNode.insertBefore(block, container);
};

function _dLab(){
  /* ── Sample orders (illustrative only) ── */
  var ORDERS=[
    {id:'LAB-2026-0142',test:'Full Blood Count (FBC)',   patient:'Thabo Mokoena', patId:'PT-00231',dob:'1985-03-12',date:'11 Oct 2026',specimen:'Blood', priority:'Routine',status:'completed',  indication:'Routine annual check-up',          doctor:'Dr Molefe',facility:'Johannesburg CHC',resultId:'RES-001'},
    {id:'LAB-2026-0143',test:'Blood Glucose (Fasting)',  patient:'Nomsa Dlamini', patId:'PT-00187',dob:'1972-07-28',date:'11 Oct 2026',specimen:'Blood', priority:'Urgent', status:'in_progress',indication:'Known diabetic — glycaemic review', doctor:'Dr Molefe',facility:'Johannesburg CHC',resultId:''},
    {id:'LAB-2026-0144',test:'Urea and Electrolytes',    patient:'Peter Nkosi',   patId:'PT-00304',dob:'1990-11-05',date:'11 Oct 2026',specimen:'Blood', priority:'Routine',status:'pending',     indication:'Hypertension monitoring',          doctor:'Dr Molefe',facility:'Johannesburg CHC',resultId:''},
    {id:'LAB-2026-0145',test:'Urine Analysis',           patient:'Lerato Molefe', patId:'PT-00412',dob:'1998-02-19',date:'10 Oct 2026',specimen:'Urine',priority:'Routine',status:'completed',  indication:'Urinary tract symptoms',           doctor:'Dr Molefe',facility:'Johannesburg CHC',resultId:'RES-004'},
    {id:'LAB-2026-0146',test:'HIV Screening',            patient:'Kagiso Sithole',patId:'PT-00089',dob:'1994-09-30',date:'10 Oct 2026',specimen:'Blood', priority:'Routine',status:'pending',     indication:'New patient screening',            doctor:'Dr Molefe',facility:'Johannesburg CHC',resultId:''},
    {id:'LAB-2026-0147',test:'Liver Function Tests',     patient:'Amina Hassan',  patId:'PT-00556',dob:'1968-05-14',date:'09 Oct 2026',specimen:'Blood', priority:'Urgent', status:'completed',  indication:'Jaundice workup',                  doctor:'Dr Molefe',facility:'Johannesburg CHC',resultId:''},
    {id:'LAB-2026-0148',test:'TB GeneXpert',             patient:'Sipho Ndlovu',  patId:'PT-00073',dob:'1979-12-22',date:'09 Oct 2026',specimen:'Sputum',priority:'Urgent', status:'in_progress',indication:'Persistent cough > 3 weeks',        doctor:'Dr Molefe',facility:'Johannesburg CHC',resultId:''},
    {id:'LAB-2026-0149',test:'Lipid Profile',            patient:'Grace Mahlangu',patId:'PT-00341',dob:'1983-08-07',date:'08 Oct 2026',specimen:'Blood', priority:'Routine',status:'in_progress',indication:'Cardiovascular risk assessment',     doctor:'Dr Molefe',facility:'Johannesburg CHC',resultId:''},
  ];

  window._labOrdersTab  = window._labOrdersTab  || 'all';
  window._labOrdersView = window._labOrdersView !== undefined ? window._labOrdersView : null;

  /* ── NEW LAB ORDER FORM ── */
  if(_D.labNewOrder){
    _D._labTestCount = 1; /* reset extra-test counter each time form opens */
    /* Resolve patient */
    var labPat      = _D.consultPat || _D.pat360Data || _D.selectedPat || null;
    var labPatName  = labPat ? ((labPat.firstName||labPat.name||'')+' '+(labPat.lastName||'')).trim()||'—' : '—';
    var labPatId    = labPat ? (labPat.mrn||labPat._id||labPat.id||'—') : '—';
    var labPatDob   = labPat && labPat.dateOfBirth
      ? new Date(labPat.dateOfBirth).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})
      : '—';
    var u2          = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
    var labDoc      = u2.firstName ? ('Dr '+((u2.firstName||'')+' '+(u2.lastName||'')).trim()) : (u2.name||'—');
    var labFacility = (typeof u2.facility==='string'?u2.facility:'') || (u2.facility&&u2.facility.name) || (u2.primaryFacility&&u2.primaryFacility.name) || u2.facilityName || 'Current healthcare facility';
    var labRegNo    = u2.hpcsaNumber||u2.hpcsa||u2.registrationNumber||u2.regNo||u2.licenseNumber||'';
    var todayLabFmt = new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});

    /* Reuse prescription helpers */
    function _lxCard(c){ return '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px;margin-bottom:0">'+c+'</div>'; }
    function _lxTitle(t){ return '<div style="font-size:15px;font-weight:800;color:'+C.text+';margin-bottom:16px">'+t+'</div>'; }
    function _lxInfo(label,value,mono){
      return '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C.muted+';margin-bottom:4px">'+label+'</div>'+
        '<div style="font-size:14px;font-weight:700;color:'+C.text+';'+(mono?'font-family:monospace':'')+'">'+value+'</div></div>';
    }
    function _lxLabel(t,req){ return '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:6px">'+t+(req?' <span style="color:'+C.red+'">*</span>':'')+'</div>'; }
    function _lxFld(){ return 'width:100%;padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;color:'+C.text+';background:#fff;box-sizing:border-box;outline:none'; }
    function _lxInp(id,label,type,req){
      return '<div>'+_lxLabel(label,req)+'<input id="'+id+'" type="'+(type||'text')+'" style="'+_lxFld()+'"></div>';
    }
    function _lxSel(id,label,opts,req){
      return '<div>'+_lxLabel(label,req)+
        '<select id="'+id+'" style="'+_lxFld()+'">'+
          opts.map(function(o){ return '<option>'+o+'</option>'; }).join('')+
        '</select></div>';
    }
    function _lxTa(id,label,rows,req){
      return '<div>'+_lxLabel(label,req)+'<textarea id="'+id+'" rows="'+(rows||3)+'" style="'+_lxFld()+';resize:vertical"></textarea></div>';
    }

    var specimenTypes = [
      'Whole blood','Serum','Plasma','Urine','Stool / Faeces','Sputum',
      'Nasal swab','Nasopharyngeal swab','Throat swab','Wound swab',
      'Vaginal swab','Endocervical swab','Urethral swab',
      'Cerebrospinal fluid (CSF)','Synovial fluid','Pleural fluid','Ascitic fluid',
      'Tissue biopsy','Bone marrow','Semen','Saliva','Skin scraping',
      'Hair or nail sample','Other — specify'
    ];
    var fastingOpts = [
      'No special preparation required','Fasting not required',
      'Fasting required — 8 hours','Fasting required — 10 hours','Fasting required — 12 hours',
      'Water permitted during fasting','Avoid food and drinks except water',
      'Collect first-morning urine','Collect midstream urine','Collect a 24-hour urine sample',
      'Collect sputum as instructed','Collect stool as instructed',
      'Avoid strenuous exercise before collection','Medication instructions required',
      'Collect at a specified time','Timed specimen collection',
      'Follow laboratory-specific instructions','Other — specify'
    ];
    var labTests = [
      'Full Blood Count (FBC)','Differential White Cell Count',
      'Blood Glucose (Fasting)','Blood Glucose (Random)','HbA1c',
      'Urea and Electrolytes (U&E)','Creatinine / eGFR','Liver Function Tests (LFTs)',
      'Thyroid Function Tests (TFTs)','Lipid Profile',
      'C-Reactive Protein (CRP)','Erythrocyte Sedimentation Rate (ESR)',
      'HIV Screening','CD4 Count','Viral Load (HIV)',
      'TB GeneXpert / Xpert MTB/RIF','TB Culture','TB Smear (AFB)',
      'Malaria Rapid Test','COVID-19 PCR',
      'Urine Analysis (Dipstick)','Urine MCS (Culture & Sensitivity)',
      'Stool MCS','Blood Culture',
      'Syphilis (RPR / TPPA)','Hepatitis B Surface Antigen','Hepatitis C Antibody',
      'Pap Smear','Pregnancy Test (urine β-hCG)',
      'INR / PT','Partial Thromboplastin Time (PTT)',
      'Amylase / Lipase','Serum Ferritin','Iron Studies',
      'Vitamin B12','Vitamin D (25-OH)','Folate',
      'PSA (Prostate-Specific Antigen)','Other — specify'
    ];

    /* Sidebar — Clinician + Workflow */
    var labSidebar =
      '<div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">'+
        '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
          '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Ordering Clinician</div>'+
          '<div style="display:flex;flex-direction:column;gap:12px">'+
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Clinician</div>'+
              '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+labDoc+'</div></div>'+
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">HPCSA / Reg. No.</div>'+
              '<div style="font-size:13px;font-weight:700;color:'+(labRegNo?C.text:C.muted)+';font-family:monospace">'+(labRegNo||'Not on record')+'</div></div>'+
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Facility</div>'+
              '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+labFacility+'</div></div>'+
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Date</div>'+
              '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+todayLabFmt+'</div></div>'+
          '</div>'+
          '<div style="margin-top:14px;padding:8px 10px;background:#f8fafc;border-radius:7px;font-size:10px;color:'+C.muted+';line-height:1.5">Lab order number generated automatically on submit.</div>'+
        '</div>'+
        '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
          '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Clinical Workflow</div>'+
          ['Consultation','Diagnosis','Lab Orders','Radiology','Prescription','Referral','Follow-Up','Next Appointment'].map(function(step){
            var active = step==='Lab Orders';
            var done   = ['Consultation','Diagnosis'].indexOf(step)>-1;
            return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;font-weight:'+(active?700:500)+';color:'+(active?C.teal:done?C.green:C.muted)+'">'+
              '<span style="font-size:10px">'+(done?'✓':'○')+'</span>'+step+'</div>';
          }).join('')+
        '</div>'+
      '</div>';

    return _dHeader('Laboratory Test Order', '')+
      '<div style="flex:1;overflow:auto;display:flex;gap:16px;padding:16px 20px 24px;box-sizing:border-box;align-items:flex-start">'+

        /* ── Main form ── */
        '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:14px">'+

          /* Patient & Test Details */
          _lxCard(
            _lxTitle('Patient Information')+
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px">'+
              _lxInfo('Patient Name',  labPatName)+
              _lxInfo('Patient ID',    labPatId, true)+
              _lxInfo('Date of Birth', labPatDob)+
              _lxInfo('Order Date',    todayLabFmt)+
            '</div>'+
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">'+
              _lxSel('lab-test','Laboratory Test',labTests,true)+
              _lxSel('lab-specimen','Specimen Type',specimenTypes,true)+
            '</div>'+
            /* Priority */
            _lxLabel('Priority',true)+
            '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">'+
              ['Routine — standard processing','Urgent — prompt processing required','STAT — immediate priority, where supported'].map(function(opt,i){
                var id='lab-priority-'+i;
                return '<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid '+C.border+';border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;color:'+C.text+';background:#fff">'+
                  '<input type="radio" name="lab-priority" value="'+opt+'"'+(i===0?' checked':'')+' style="accent-color:'+C.teal+'">'+opt+
                '</label>';
              }).join('')+
            '</div>'+
            _lxTa('lab-indication','Clinical Indication',3,true)
          )+

          /* Add Another Test */
          '<button id="lab-add-test-btn" onclick="_labAddTest()" '+
            'style="display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:11px;border:1.5px dashed '+C.border+';border-radius:9px;background:none;font-size:13px;font-weight:700;color:'+C.teal+';cursor:pointer;font-family:inherit" '+
            'onmouseenter="this.style.background=\'#f0fdf4\'" onmouseleave="this.style.background=\'none\'">'+
            '＋ Add Another Test'+
          '</button>'+

          /* Specimen Collection */
          _lxCard(
            _lxTitle('Specimen Collection')+
            '<div style="display:flex;flex-direction:column;gap:14px">'+
              _lxSel('lab-collection','Collection Method',[
                'External laboratory collection',
                'In-facility phlebotomy',
                'Patient self-collection (supervised)',
                'Home collection (courier)',
                'Other'
              ],false)+
              _lxSel('lab-fasting','Fasting / Preparation Instructions',fastingOpts,false)+
              _lxTa('lab-lab-notes','Additional Notes to Laboratory',3,false)+
            '</div>'
          )+

          /* Actions */
          '<div style="display:flex;gap:10px;margin-top:4px;margin-bottom:8px">'+
            '<button onclick="_dSaveLabOrder()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'+
              'Submit'+
            '</button>'+
            '<button onclick="_D.labNewOrder=false;_D.view=\'dashboard\';_dRender()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">Cancel</button>'+
          '</div>'+

        '</div>'+
        labSidebar+
      '</div>';
  }/* end labNewOrder */

  var stCfg={pending:{l:'Pending',bg:'#FFF7ED',c:'#92400E',bd:'#FDE68A'},in_progress:{l:'In Progress',bg:'#EFF6FF',c:'#1D4ED8',bd:'#BFDBFE'},completed:{l:'Completed',bg:'#ECFDF5',c:'#065f46',bd:'#A7F3D0'}};
  var prCfg={Routine:{bg:'#F0FDF4',c:'#166534'},Urgent:{bg:'#FEF3C7',c:'#92400E'},STAT:{bg:'#FEE2E2',c:'#991B1B'}};

  /* ── Detail view ── */
  if(window._labOrdersView){
    var o=ORDERS.find(function(x){return x.id===window._labOrdersView;})||ORDERS[0];
    var st=stCfg[o.status]||stCfg.pending;
    var pr=prCfg[o.priority]||prCfg.Routine;
    return _dHeader('Lab Orders','Laboratory requests and tracking',
        _btn('← Back',"window._labOrdersView=null;if(typeof _dRender==='function')_dRender()",C.muted,true))+
      '<div style="flex:1;overflow:auto;padding:16px 20px">'+
        '<div style="max-width:680px">'+
        _card(
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px">'+
            '<div><div style="font-size:16px;font-weight:800;color:'+C.text+'">'+o.test+'</div>'+
            '<div style="font-size:12px;font-family:monospace;color:'+C.muted+';margin-top:3px">'+o.id+'</div></div>'+
            '<span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:'+st.bg+';color:'+st.c+';border:1px solid '+st.bd+'">'+st.l+'</span>'+
          '</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">'+
            _rof('Patient',o.patient)+_rof('Patient ID',o.patId)+
            _rof('Date of Birth',o.dob)+_rof('Date Ordered',o.date)+
            _rof('Specimen',o.specimen)+
            _rof('Priority','<span style="padding:2px 9px;border-radius:12px;font-size:11px;font-weight:700;background:'+pr.bg+';color:'+pr.c+'">'+o.priority+'</span>')+
            _rof('Ordering Doctor',o.doctor)+_rof('Facility',o.facility)+
            _rof('Clinical Indication',o.indication,'full')+
          '</div>'+
          '<div style="border-top:1px solid '+C.border+';padding-top:14px;display:flex;gap:8px">'+
            (o.resultId
              ? _btn('📊 View Result',"window._lrDetailView='"+o.resultId+"';_setView('lab_results')",C.green)
              : '<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:'+C.muted+'"><span>🕐</span> Result not yet available — check back after the lab processes the specimen</div>')+
          '</div>'
        )+
        '</div>'+
      '</div>';
  }

  /* ── List view ── */
  var total  = ORDERS.length;
  var pending= ORDERS.filter(function(o){return o.status==='pending';}).length;
  var inprog = ORDERS.filter(function(o){return o.status==='in_progress';}).length;
  var compl  = ORDERS.filter(function(o){return o.status==='completed';}).length;
  var tab    = window._labOrdersTab;
  var visible= tab==='all'?ORDERS:ORDERS.filter(function(o){return o.status===tab;});

  function _tabBtn(id,label){
    var active=tab===id;
    return '<button onclick="window._labOrdersTab=\''+id+'\';if(typeof _dRender===\'function\')_dRender()" '+
      'style="padding:7px 16px;border:none;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;'+
      'background:'+(active?C.blue:'transparent')+';color:'+(active?'#fff':C.muted)+'">'+label+'</button>';
  }

  var kpiHtml=
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px">'+
      _card('<div style="display:flex;align-items:center;gap:10px"><div style="font-size:22px">🧪</div><div>'+
        '<div style="font-size:26px;font-weight:800;color:'+C.text+';line-height:1">'+total+'</div>'+
        '<div style="font-size:12px;color:'+C.muted+'">Total Orders</div></div></div>')+
      _card('<div style="display:flex;align-items:center;gap:10px"><div style="font-size:22px">⏳</div><div>'+
        '<div style="font-size:26px;font-weight:800;color:#92400E;line-height:1">'+pending+'</div>'+
        '<div style="font-size:12px;color:'+C.muted+'">Pending</div></div></div>')+
      _card('<div style="display:flex;align-items:center;gap:10px"><div style="font-size:22px">🔬</div><div>'+
        '<div style="font-size:26px;font-weight:800;color:'+C.blue+';line-height:1">'+inprog+'</div>'+
        '<div style="font-size:12px;color:'+C.muted+'">In Progress</div></div></div>')+
      _card('<div style="display:flex;align-items:center;gap:10px"><div style="font-size:22px">✅</div><div>'+
        '<div style="font-size:26px;font-weight:800;color:#065f46;line-height:1">'+compl+'</div>'+
        '<div style="font-size:12px;color:'+C.muted+'">Completed</div></div></div>')+
    '</div>';

  var rowsHtml=visible.map(function(o,i){
    var st=stCfg[o.status]||stCfg.pending;
    var pr=prCfg[o.priority]||prCfg.Routine;
    return (
      '<div style="padding:14px 16px;border-bottom:1px solid '+C.border+';background:'+(i%2===0?'#fff':'#f8fafc')+';display:flex;align-items:flex-start;gap:12px">'+
        '<div style="width:38px;height:38px;border-radius:10px;background:#EFF6FF;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;margin-top:1px">🧪</div>'+
        '<div style="flex:1;min-width:0">'+
          '<div style="font-size:14px;font-weight:700;color:'+C.text+'">'+o.test+'</div>'+
          '<div style="font-size:12px;color:'+C.muted+';margin-top:2px">'+o.patient+'&nbsp;·&nbsp;<span style="font-family:monospace">'+o.id+'</span>&nbsp;·&nbsp;'+o.date+'</div>'+
          '<div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">'+
            '<span style="padding:2px 9px;border-radius:12px;font-size:11px;font-weight:700;background:'+st.bg+';color:'+st.c+';border:1px solid '+st.bd+'">'+st.l+'</span>'+
            '<span style="padding:2px 9px;border-radius:12px;font-size:11px;font-weight:700;background:'+pr.bg+';color:'+pr.c+'">Priority: '+o.priority+'</span>'+
          '</div>'+
        '</div>'+
        '<button onclick="window._labOrdersView=\''+o.id+'\';if(typeof _dRender===\'function\')_dRender()" '+
          'style="flex-shrink:0;padding:7px 16px;border:1px solid '+C.border+';border-radius:8px;background:#fff;font-size:12px;font-weight:600;color:'+C.text+';cursor:pointer;font-family:inherit">'+
          'View order →</button>'+
      '</div>'
    );
  }).join('');

  return _dHeader('Lab Orders','Laboratory requests and tracking')+
    '<div style="flex:1;overflow:auto;padding:16px 20px">'+
      kpiHtml+
      '<div style="background:#fff;border-radius:12px;border:1px solid '+C.border+';overflow:hidden;margin-bottom:16px">'+
        '<div style="padding:12px 16px;border-bottom:1px solid '+C.border+';display:flex;align-items:center;justify-content:space-between">'+
          '<div style="font-size:14px;font-weight:700;color:'+C.text+'">Recent Lab Orders</div>'+
          '<div style="display:flex;gap:4px;background:'+C.bg+';border-radius:8px;padding:4px">'+
            _tabBtn('all','All')+_tabBtn('pending','Pending')+_tabBtn('in_progress','In progress')+_tabBtn('completed','Completed')+
          '</div>'+
        '</div>'+
        (rowsHtml||'<div style="padding:40px;text-align:center;color:'+C.muted+'">No orders in this category</div>')+
        '<div style="padding:8px 16px;font-size:11px;color:'+C.muted+';border-top:1px solid '+C.border+'">'+
          '<em>Illustrative data only. These are sample records, not actual patient orders.</em>'+
        '</div>'+
      '</div>'+
    '</div>';
}

/* helper: read-only info field (used in lab/results detail views) */
function _rof(label,val,span){
  return '<div style="'+(span==='full'?'grid-column:1/-1;':'')+
    'background:'+C.bg+';border-radius:8px;padding:10px 12px">'+
    '<div style="font-size:11px;color:'+C.muted+';margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px">'+label+'</div>'+
    '<div style="font-size:13px;font-weight:600;color:'+C.text+'">'+val+'</div>'+
  '</div>';
}

/* ══════════════════════════════════════════════════════════════════
   LAB RESULTS
══════════════════════════════════════════════════════════════════ */
function _dLabResults(){
  /* ── Sample results (illustrative only) ── */
  var RESULTS=[
    {id:'RES-001',test:'Haemoglobin',         patient:'Thabo Mokoena', patId:'PT-00231',date:'11 Oct 2026',value:'13.8 g/dL',  ref:'13.0–17.0 g/dL', flag:'normal',   status:'awaiting_review', orderId:'LAB-2026-0142',specimen:'Blood',  doctor:'Dr Molefe',facility:'Johannesburg CHC',note:'Within normal limits.'},
    {id:'RES-002',test:'Blood Glucose (Fasting)',patient:'Nomsa Dlamini',patId:'PT-00187',date:'11 Oct 2026',value:'7.2 mmol/L',ref:'3.9–5.5 mmol/L',  flag:'high',     status:'awaiting_review', orderId:'LAB-2026-0143',specimen:'Blood',  doctor:'Dr Molefe',facility:'Johannesburg CHC',note:'Elevated. Consistent with poorly controlled diabetes. Consider medication review.'},
    {id:'RES-003',test:'White Blood Cell Count',patient:'Peter Nkosi',  patId:'PT-00304',date:'11 Oct 2026',value:'7.1 × 10⁹/L',ref:'4.0–11.0 × 10⁹/L',flag:'normal', status:'reviewed',        orderId:'LAB-2026-0144',specimen:'Blood',  doctor:'Dr Molefe',facility:'Johannesburg CHC',note:'No signs of infection or haematological abnormality.'},
    {id:'RES-004',test:'Urine Protein',        patient:'Lerato Molefe', patId:'PT-00412',date:'10 Oct 2026',value:'Trace',       ref:'Negative',         flag:'abnormal', status:'awaiting_review', orderId:'LAB-2026-0145',specimen:'Urine', doctor:'Dr Molefe',facility:'Johannesburg CHC',note:'Trace proteinuria detected. Recommend repeat MSU and nephrology referral if persistent.'},
    {id:'RES-005',test:'Serum Creatinine',     patient:'Kagiso Sithole',patId:'PT-00089',date:'10 Oct 2026',value:'78 µmol/L',  ref:'62–115 µmol/L',   flag:'normal',   status:'reviewed',        orderId:'LAB-2026-0146',specimen:'Blood',  doctor:'Dr Molefe',facility:'Johannesburg CHC',note:'Renal function within normal range.'},
    {id:'RES-006',test:'ALT (Alanine Aminotransferase)',patient:'Amina Hassan',patId:'PT-00556',date:'09 Oct 2026',value:'112 U/L',ref:'7–56 U/L',flag:'critical',status:'awaiting_review',orderId:'LAB-2026-0147',specimen:'Blood',doctor:'Dr Molefe',facility:'Johannesburg CHC',note:'Significantly elevated. Urgent hepatology review recommended.'},
    {id:'RES-007',test:'TSH (Thyroid Stimulating Hormone)',patient:'Grace Mahlangu',patId:'PT-00341',date:'08 Oct 2026',value:'2.3 mIU/L',ref:'0.4–4.0 mIU/L',flag:'normal',status:'reviewed',orderId:'LAB-2026-0149',specimen:'Blood',doctor:'Dr Molefe',facility:'Johannesburg CHC',note:'Thyroid function normal.'},
  ];

  window._lrTab        = window._lrTab        || 'all';
  window._lrDetailView = window._lrDetailView !== undefined ? window._lrDetailView : null;

  var flagCfg={
    normal:  {l:'Normal',  bg:'#ECFDF5',c:'#065f46',bd:'#A7F3D0'},
    high:    {l:'High',    bg:'#FEF3C7',c:'#92400E',bd:'#FDE68A'},
    low:     {l:'Low',     bg:'#EFF6FF',c:'#1D4ED8',bd:'#BFDBFE'},
    abnormal:{l:'Abnormal',bg:'#FFF7ED',c:'#92400E',bd:'#FED7AA'},
    critical:{l:'⚠ Critical',bg:'#FEE2E2',c:'#991B1B',bd:'#FECACA'},
  };
  var stCfg={
    awaiting_review:{l:'Awaiting Review',bg:'#FFF7ED',c:'#92400E',bd:'#FDE68A'},
    reviewed:       {l:'Reviewed',        bg:'#ECFDF5',c:'#065f46',bd:'#A7F3D0'},
  };

  /* ── Detail view ── */
  if(window._lrDetailView){
    var r=RESULTS.find(function(x){return x.id===window._lrDetailView;})||RESULTS[0];
    var fg=flagCfg[r.flag]||flagCfg.normal;
    var rs=stCfg[r.status]||stCfg.awaiting_review;
    return _dHeader('Lab Results','Review and interpret laboratory results',
        _btn('← Back',"window._lrDetailView=null;if(typeof _dRender==='function')_dRender()",C.muted,true))+
      '<div style="flex:1;overflow:auto;padding:16px 20px">'+
        '<div style="max-width:680px">'+
        _card(
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px">'+
            '<div><div style="font-size:16px;font-weight:800;color:'+C.text+'">'+r.test+'</div>'+
            '<div style="font-size:12px;font-family:monospace;color:'+C.muted+';margin-top:3px">'+r.id+'</div></div>'+
            '<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">'+
              '<span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:'+fg.bg+';color:'+fg.c+';border:1px solid '+fg.bd+'">'+fg.l+'</span>'+
              '<span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:'+rs.bg+';color:'+rs.c+';border:1px solid '+rs.bd+'">'+rs.l+'</span>'+
            '</div>'+
          '</div>'+
          /* value highlight */
          '<div style="background:'+fg.bg+';border:1.5px solid '+fg.bd+';border-radius:12px;padding:18px;margin-bottom:16px;display:flex;align-items:center;gap:18px">'+
            '<div style="font-size:34px;font-weight:900;color:'+fg.c+';line-height:1">'+r.value+'</div>'+
            '<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:'+C.muted+';margin-bottom:3px">Reference Range</div>'+
            '<div style="font-size:15px;font-weight:700;color:'+C.text+'">'+r.ref+'</div></div>'+
          '</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">'+
            _rof('Patient',r.patient)+_rof('Patient ID',r.patId)+
            _rof('Specimen',r.specimen)+_rof('Date Reported',r.date)+
            _rof('Ordering Doctor',r.doctor)+_rof('Facility',r.facility)+
            (r.note?_rof('Interpretation / Notes',r.note,'full'):'')+
          '</div>'+
          '<div style="border-top:1px solid '+C.border+';padding-top:14px;display:flex;gap:8px;align-items:center">'+
            _btn('📋 View Lab Order',"window._labOrdersView='"+r.orderId+"';_setView('lab')",C.blue)+
            (r.status==='awaiting_review'
              ? _btn('✓ Mark as Reviewed',"window._lrDetailView=null;if(typeof _dRender==='function')_dRender()",C.green)
              : '')+
          '</div>'
        )+
        '</div>'+
      '</div>';
  }

  /* ── List view ── */
  var total   = RESULTS.length;
  var awaiting= RESULTS.filter(function(r){return r.status==='awaiting_review';}).length;
  var abnCount= RESULTS.filter(function(r){return r.flag!=='normal';}).length;
  var critCount=RESULTS.filter(function(r){return r.flag==='critical';}).length;
  var tab     = window._lrTab;
  var visible = tab==='all' ? RESULTS
               : tab==='abnormal'       ? RESULTS.filter(function(r){return r.flag!=='normal';})
               : tab==='awaiting_review'? RESULTS.filter(function(r){return r.status==='awaiting_review';})
               : RESULTS.filter(function(r){return r.status==='reviewed';});

  function _lrTabBtn(id,label){
    var active=tab===id;
    return '<button onclick="window._lrTab=\''+id+'\';if(typeof _dRender===\'function\')_dRender()" '+
      'style="padding:7px 16px;border:none;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;'+
      'background:'+(active?C.blue:'transparent')+';color:'+(active?'#fff':C.muted)+'">'+label+'</button>';
  }

  var kpiHtml=
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px">'+
      _card('<div style="display:flex;align-items:center;gap:10px"><div style="font-size:22px">📊</div><div>'+
        '<div style="font-size:26px;font-weight:800;color:'+C.text+';line-height:1">'+total+'</div>'+
        '<div style="font-size:12px;color:'+C.muted+'">Total Results</div></div></div>')+
      _card('<div style="display:flex;align-items:center;gap:10px"><div style="font-size:22px">⏳</div><div>'+
        '<div style="font-size:26px;font-weight:800;color:#92400E;line-height:1">'+awaiting+'</div>'+
        '<div style="font-size:12px;color:'+C.muted+'">Awaiting Review</div></div></div>')+
      _card('<div style="display:flex;align-items:center;gap:10px"><div style="font-size:22px">⚠️</div><div>'+
        '<div style="font-size:26px;font-weight:800;color:#D97706;line-height:1">'+abnCount+'</div>'+
        '<div style="font-size:12px;color:'+C.muted+'">Abnormal</div></div></div>')+
      _card('<div style="display:flex;align-items:center;gap:10px"><div style="font-size:22px">🚨</div><div>'+
        '<div style="font-size:26px;font-weight:800;color:#991B1B;line-height:1">'+critCount+'</div>'+
        '<div style="font-size:12px;color:'+C.muted+'">Critical</div></div></div>')+
    '</div>';

  var rowsHtml=visible.map(function(r,i){
    var fg=flagCfg[r.flag]||flagCfg.normal;
    var rs=stCfg[r.status]||stCfg.awaiting_review;
    return (
      '<div style="padding:14px 16px;border-bottom:1px solid '+C.border+';background:'+(i%2===0?'#fff':'#f8fafc')+';display:flex;align-items:flex-start;gap:12px">'+
        '<div style="flex:1;min-width:0">'+
          '<div style="font-size:14px;font-weight:700;color:'+C.text+'">'+r.test+'</div>'+
          '<div style="font-size:12px;color:'+C.muted+';margin-top:2px">'+r.patient+'&nbsp;·&nbsp;<span style="font-family:monospace">'+r.id+'</span>&nbsp;·&nbsp;'+r.date+'</div>'+
          '<div style="display:flex;gap:6px;margin-top:7px;align-items:center;flex-wrap:wrap">'+
            '<span style="padding:2px 9px;border-radius:12px;font-size:11px;font-weight:700;background:'+fg.bg+';color:'+fg.c+';border:1px solid '+fg.bd+'">'+fg.l+'</span>'+
            '<span style="font-size:13px;font-weight:700;color:'+fg.c+'">'+r.value+'</span>'+
            '<span style="font-size:12px;color:'+C.muted+'">ref '+r.ref+'</span>'+
            '<span style="padding:2px 9px;border-radius:12px;font-size:11px;font-weight:700;background:'+rs.bg+';color:'+rs.c+';border:1px solid '+rs.bd+'">'+rs.l+'</span>'+
          '</div>'+
        '</div>'+
        '<button onclick="window._lrDetailView=\''+r.id+'\';if(typeof _dRender===\'function\')_dRender()" '+
          'style="flex-shrink:0;padding:7px 16px;border:1px solid '+C.border+';border-radius:8px;background:#fff;font-size:12px;font-weight:600;color:'+C.text+';cursor:pointer;font-family:inherit">'+
          'View result →</button>'+
      '</div>'
    );
  }).join('');

  return _dHeader('Lab Results','Review and interpret laboratory results')+
    '<div style="flex:1;overflow:auto;padding:16px 20px">'+
      kpiHtml+
      '<div style="background:#fff;border-radius:12px;border:1px solid '+C.border+';overflow:hidden;margin-bottom:16px">'+
        '<div style="padding:12px 16px;border-bottom:1px solid '+C.border+';display:flex;align-items:center;justify-content:space-between">'+
          '<div style="font-size:14px;font-weight:700;color:'+C.text+'">Results</div>'+
          '<div style="display:flex;gap:4px;background:'+C.bg+';border-radius:8px;padding:4px">'+
            _lrTabBtn('all','All')+_lrTabBtn('abnormal','Abnormal')+_lrTabBtn('awaiting_review','Awaiting Review')+_lrTabBtn('reviewed','Reviewed')+
          '</div>'+
        '</div>'+
        (rowsHtml||'<div style="padding:40px;text-align:center;color:'+C.muted+'">No results in this category</div>')+
        '<div style="padding:8px 16px;font-size:11px;color:'+C.muted+';border-top:1px solid '+C.border+'">'+
          '<em>Illustrative data only. These are sample records, not actual patient results.</em>'+
        '</div>'+
      '</div>'+
    '</div>';
}

/* ══════════════════════════════════════════════════════════════════
   RADIOLOGY
══════════════════════════════════════════════════════════════════ */
function _dRadiology(){
  /* ── Patient resolution ── */
  var radPat     = _D.consultPat || _D.pat360Data || _D.selectedPat || null;
  var radPatName = radPat ? ((radPat.firstName||radPat.name||'')+' '+(radPat.lastName||'')).trim()||'—' : '—';
  var radPatId   = radPat ? (radPat.mrn||radPat._id||radPat.id||'—') : '—';
  var radPatDob  = radPat && radPat.dateOfBirth
    ? new Date(radPat.dateOfBirth).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}) : '—';
  var today      = new Date().toISOString().slice(0,10);
  var todayFmt   = new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});
  var u          = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  var docName    = u.firstName?('Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim()):(u.name||'—');
  var docFacility= (typeof u.facility==='string'?u.facility:'')|| (u.facility&&u.facility.name)||u.facilityName||'Current healthcare facility';
  var docHpcsa   = u.hpcsaNumber||u.hpcsa||u.registrationNumber||'';

  /* ── Modality → regions map ── */
  var MODALITY_REGIONS = {
    'X-Ray (Radiography)': ['Chest','Ribs','Abdomen','Skull','Facial Bones','Paranasal Sinuses','Nasal Bones','Mandible','Cervical Spine','Thoracic Spine','Lumbar Spine','Sacrum / Coccyx','Pelvis','Right Hip','Left Hip','Shoulder','Clavicle','Scapula','Humerus','Elbow','Forearm','Wrist','Hand','Fingers / Thumb','Femur','Knee','Patella','Tibia / Fibula','Ankle','Foot','Toes','Calcaneus','Whole Spine','Other'],
    'CT Scan': ['Head / Brain','Facial Bones','Sinuses','Neck','Cervical Spine','Thoracic Spine','Lumbar Spine','Chest','Abdomen','Pelvis','Chest, Abdomen and Pelvis','Liver','Pancreas','Kidneys / Urinary Tract','CT Angiography — Head / Neck','CT Angiography — Chest','CT Angiography — Abdomen / Pelvis','Upper Limb','Lower Limb','Whole Body','Other'],
    'MRI': ['Brain','Head','Orbits','Internal Auditory Canals','Cervical Spine','Thoracic Spine','Lumbar Spine','Sacrum / Sacroiliac Joints','Shoulder','Elbow','Wrist / Hand','Hip','Knee','Ankle / Foot','Chest','Abdomen','Pelvis','Prostate','Breast','Cardiac','MR Angiography','Other'],
    'Ultrasound': ['Abdomen','Upper Abdomen','Pelvis','Obstetric / Pregnancy','Transvaginal','Thyroid','Breast','Scrotum / Testes','Kidneys','Bladder','Urinary Tract','Soft Tissue','Neck','Musculoskeletal','Other'],
    'Doppler Ultrasound': ['Carotid Arteries','Transcranial Vessels','Upper Limb Arteries','Upper Limb Veins','Lower Limb Arteries','Lower Limb Veins','Aorta','Renal Arteries','Portal Vein','Obstetric Doppler','Other'],
    'Mammography': ['Right Breast','Left Breast','Both Breasts','Other'],
    'DEXA Scan': ['Lumbar Spine','Left Hip','Right Hip','Both Hips','Forearm','Vertebral Fracture Assessment','Other'],
    'PET Scan': ['Whole Body','Brain','Heart','Thyroid','Bone / Skeleton','Kidneys','Lungs','Other'],
    'Fluoroscopy': ['Oesophagus','Stomach / Duodenum','Small Bowel','Colon','Urinary Bladder','Urethra','Joints','Other'],
    'Nuclear Medicine Scan': ['Whole Body','Brain','Heart','Thyroid','Bone / Skeleton','Kidneys','Lungs','Other'],
    'Angiography': ['Cerebral','Carotid','Coronary','Pulmonary','Renal','Peripheral','Other'],
    'Echocardiogram (Echo)': ['Heart — transthoracic','Heart — transoesophageal','Heart — stress study'],
    'ECG / EKG': ['Heart — 12-lead ECG','Heart — ambulatory ECG monitoring']
  };

  /* X-ray projections keyed by region */
  var XRAY_VIEWS = {
    'Chest':       ['AP','PA','Lateral','AP and lateral','Portable AP'],
    'Ribs':        ['AP','Oblique','Left oblique','Right oblique'],
    'Abdomen':     ['AP','Decubitus','Cross-table lateral'],
    'Skull':       ['AP','PA','Lateral','Axial'],
    'Cervical Spine':['AP','Lateral','Oblique','Flexion and extension'],
    'Thoracic Spine':['AP','Lateral'],
    'Lumbar Spine':  ['AP','Lateral','Oblique','Flexion and extension'],
    'Pelvis':      ['AP','Weight-bearing'],
    'Right Hip':   ['AP','Lateral'],
    'Left Hip':    ['AP','Lateral'],
    'Shoulder':    ['AP','Axial','Oblique'],
    'Knee':        ['AP','Lateral','Skyline / sunrise','Weight-bearing'],
    'Foot':        ['AP','Lateral','Oblique','Weight-bearing'],
    'Ankle':       ['AP','Lateral','Oblique'],
    '_default':    ['AP','PA','Lateral','Left lateral','Right lateral','AP and lateral','Oblique','Left oblique','Right oblique','Axial','Flexion and extension','Weight-bearing','Decubitus','Portable AP','Cross-table lateral','Skyline / sunrise','Other / specify']
  };
  var ALL_VIEWS = ['AP','PA','Lateral','Left lateral','Right lateral','AP and lateral','Oblique','Left oblique','Right oblique','Axial','Flexion and extension','Weight-bearing','Decubitus','Portable AP','Cross-table lateral','Skyline / sunrise','Other / specify'];

  var MODALITIES = Object.keys(MODALITY_REGIONS);

  /* ── Local helpers (prescription card style) ── */
  function _rxC(c){ return '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px">'+c+'</div>'; }
  function _rxT(t){ return '<div style="font-size:15px;font-weight:800;color:'+C.text+';margin-bottom:16px">'+t+'</div>'; }
  function _rxI(label,val,mono){ return '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C.muted+';margin-bottom:4px">'+label+'</div><div style="font-size:14px;font-weight:700;color:'+C.text+';'+(mono?'font-family:monospace':'')+'">'+val+'</div></div>'; }
  function _rxL(t,req){ return '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:6px">'+t+(req?' <span style="color:#ef4444">*</span>':'')+'</div>'; }
  function _rxF(){ return 'width:100%;padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;color:'+C.text+';background:#fff;box-sizing:border-box;outline:none'; }
  function _rxSl(id,label,opts,req,onch){
    return '<div>'+_rxL(label,req)+'<select id="'+id+'" '+(onch?'onchange="'+onch+'"':'')+' style="'+_rxF()+'">'+
      opts.map(function(o){return'<option value="'+o+'">'+o+'</option>';}).join('')+
    '</select></div>';
  }
  function _rxTx(id,label,rows,req){
    return '<div>'+_rxL(label,req)+'<textarea id="'+id+'" rows="'+(rows||3)+'" style="'+_rxF()+';resize:vertical"></textarea></div>';
  }

  /* ── Investigation block builder ── */
  function _invBlock(n){
    var idPfx = 'rad-inv-'+n+'-';
    var firstMod = MODALITIES[0];
    var firstRegs = MODALITY_REGIONS[firstMod];
    var regOpts = firstRegs.map(function(r){return'<option>'+r+'</option>';}).join('');
    var viewChecks = ALL_VIEWS.map(function(v){
      return '<label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500;color:'+C.text+';cursor:pointer;padding:4px 0">'+
        '<input type="checkbox" name="'+idPfx+'view" value="'+v+'" style="accent-color:'+C.teal+'">'+v+'</label>';
    }).join('');
    var pregOpts = ['Not applicable','Unknown','Possibly pregnant — awaiting test','Confirmed pregnant','Post-menopausal','Male patient'];
    return '<div id="rad-inv-block-'+n+'" style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'+
        '<div style="font-size:14px;font-weight:800;color:'+C.text+'">Investigation '+n+'</div>'+
        (n>1?'<button onclick="document.getElementById(\'rad-inv-block-'+n+'\').remove()" style="background:none;border:none;cursor:pointer;font-size:12px;color:'+C.muted+';text-decoration:underline;font-family:inherit">Remove</button>':'')+
      '</div>'+
      '<div style="display:flex;flex-direction:column;gap:14px">'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+
          '<div>'+_rxL('Modality / Type',true)+
            '<select id="'+idPfx+'modality" onchange="_radUpdateRegions('+n+')" style="'+_rxF()+'">'+
              MODALITIES.map(function(m){return'<option>'+m+'</option>';}).join('')+
            '</select>'+
          '</div>'+
          '<div>'+_rxL('Region / Body Part',true)+
            '<select id="'+idPfx+'region" onchange="_radUpdateViews('+n+')" style="'+_rxF()+'">'+regOpts+'</select>'+
          '</div>'+
        '</div>'+
        '<div>'+
          _rxL('Views / Projections — select all that apply',false)+
          '<div id="'+idPfx+'views-wrap" style="display:grid;grid-template-columns:repeat(4,1fr);gap:2px 14px;padding:10px 14px;border:1.5px solid '+C.border+';border-radius:8px;background:#fafafa">'+
            viewChecks+
          '</div>'+
        '</div>'+
        _rxTx(idPfx+'indication','Clinical indication for this investigation',2,false)+
        '<div>'+
          _rxL('Pregnancy status, where clinically applicable',false)+
          '<select id="'+idPfx+'preg" style="'+_rxF()+'">'+
            pregOpts.map(function(o){return'<option>'+o+'</option>';}).join('')+
          '</select>'+
          '<div style="font-size:11px;color:'+C.muted+';margin-top:5px;font-style:italic">Follow the facility\'s pregnancy screening and imaging safety protocol before relevant examinations.</div>'+
        '</div>'+
      '</div>'+
    '</div>';
  }

  /* ── Sidebar ── */
  var radSidebar =
    '<div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">'+
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Ordering Clinician</div>'+
        '<div style="display:flex;flex-direction:column;gap:12px">'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Clinician</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+docName+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">HPCSA Reg. No.</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+(docHpcsa?C.text:C.muted)+';font-family:monospace">'+(docHpcsa||'Not on record')+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Facility</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+docFacility+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Date</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+todayFmt+'</div></div>'+
        '</div>'+
      '</div>'+
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Clinical Workflow</div>'+
        ['Consultation','Diagnosis','Lab Orders','Radiology','Prescription','Referral','Follow-Up','Next Appointment'].map(function(step){
          var active = step==='Radiology';
          var done   = ['Consultation','Diagnosis','Lab Orders'].indexOf(step)>-1;
          return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;font-weight:'+(active?700:500)+';color:'+(active?C.teal:done?C.green:C.muted)+'">'+
            '<span style="font-size:10px">'+(active?'→':done?'✓':'○')+'</span>'+step+'</div>';
        }).join('')+
      '</div>'+
    '</div>';

  /* ── Wire-up helpers (registered globally) ── */
  window._radUpdateRegions = function(n){
    var mod  = (document.getElementById('rad-inv-'+n+'-modality')||{}).value||'';
    var sel  = document.getElementById('rad-inv-'+n+'-region');
    if(!sel) return;
    var opts = MODALITY_REGIONS[mod]||['Other'];
    sel.innerHTML = opts.map(function(r){return'<option>'+r+'</option>';}).join('');
    window._radUpdateViews(n);
  };
  window._radUpdateViews = function(n){
    var mod   = (document.getElementById('rad-inv-'+n+'-modality')||{}).value||'';
    var reg   = (document.getElementById('rad-inv-'+n+'-region')||{}).value||'';
    var wrap  = document.getElementById('rad-inv-'+n+'-views-wrap');
    if(!wrap) return;
    /* views only apply for X-Ray; hide panel for other modalities */
    if(mod !== 'X-Ray (Radiography)'){
      wrap.style.display='none';
      wrap.previousElementSibling&&(wrap.previousElementSibling.style.display='none');
      return;
    }
    wrap.style.display='grid';
    wrap.previousElementSibling&&(wrap.previousElementSibling.style.display='block');
    var views = XRAY_VIEWS[reg] || XRAY_VIEWS['_default'];
    wrap.innerHTML = ALL_VIEWS.map(function(v){
      var active = views.indexOf(v)>-1;
      return '<label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500;color:'+(active?C.text:C.muted)+';cursor:pointer;padding:4px 0">'+
        '<input type="checkbox" name="rad-inv-'+n+'-view" value="'+v+'"'+(active?' checked':'')+' style="accent-color:'+C.teal+'">'+v+'</label>';
    }).join('');
  };

  window._radAddInvestigation = function(){
    if(!window._D) return;
    _D._radInvCount = (_D._radInvCount||1)+1;
    var n = _D._radInvCount;
    var btn = document.getElementById('rad-add-inv-btn');
    if(!btn) return;
    var block = document.createElement('div');
    block.innerHTML = _invBlock(n);
    btn.parentNode.insertBefore(block.firstElementChild, btn);
    /* init views for new block */
    setTimeout(function(){ window._radUpdateViews(n); },0);
  };

  window._dSubmitRadiology = async function(){
    /* collect all investigation blocks */
    var investigations=[];
    var blocks=document.querySelectorAll('[id^="rad-inv-block-"]');
    blocks.forEach(function(bl){
      var n=bl.id.replace('rad-inv-block-','');
      var pfx='rad-inv-'+n+'-';
      var mod=(document.getElementById(pfx+'modality')||{}).value||'';
      var reg=(document.getElementById(pfx+'region')||{}).value||'';
      var views=[].slice.call(document.querySelectorAll('input[name="'+pfx+'view"]:checked')).map(function(c){return c.value;});
      var ind=((document.getElementById(pfx+'indication')||{}).value||'').trim();
      var preg=(document.getElementById(pfx+'preg')||{}).value||'';
      if(mod) investigations.push({modality:mod,region:reg,views:views,indication:ind,pregnancyStatus:preg});
    });
    if(!investigations.length){if(window.UI)UI.showToast('Add at least one investigation','err');return;}
    var overallInd=((document.getElementById('rad-overall-ind')||{}).value||'').trim();
    var addInstr=((document.getElementById('rad-add-instr')||{}).value||'').trim();
    var priorityEl=document.querySelector('input[name="rad-priority"]:checked');
    var priority=priorityEl?priorityEl.value:'Routine';
    var pat4=_D.consultPat||_D.pat360Data||_D.selectedPat||{};
    var payload={
      patient:pat4._id||pat4.id||'',
      patientName:((pat4.firstName||pat4.name||'')+' '+(pat4.lastName||'')).trim()||'Unknown',
      investigations:investigations,
      priority:priority,
      overallIndication:overallInd,
      additionalInstructions:addInstr,
      orderedBy:(u._id||u.id||''),
      orderedByName:docName,
      facility:docFacility,
      orderedAt:new Date().toISOString(),
      status:'pending'
    };
    try{ await API._fetchDirect('/radiology-orders',{method:'POST',body:JSON.stringify(payload)}); }catch(_){}
    if(window.UI)UI.showToast('Radiology request submitted','ok');
    _D.view='radiology'; _dRender();
  };

  /* Reset inv counter each form open */
  _D._radInvCount = 1;

  /* ── HTML ── */
  return _dHeader('Radiology / Imaging Request', '')+
    '<div style="flex:1;overflow:auto;display:flex;gap:16px;padding:16px 20px 24px;box-sizing:border-box;align-items:flex-start">'+

      '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:14px">'+

        /* Patient Information */
        _rxC(
          _rxT('Patient Information')+
          '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">'+
            _rxI('Patient Name', radPatName)+
            _rxI('Patient ID',   radPatId, true)+
            _rxI('Date of Birth',radPatDob)+
            _rxI('Order Date',   todayFmt)+
          '</div>'
        )+

        /* Investigation 1 */
        _invBlock(1)+

        /* Add Another Investigation */
        '<button id="rad-add-inv-btn" onclick="_radAddInvestigation()" '+
          'style="display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:11px;border:1.5px dashed '+C.border+';border-radius:9px;background:none;font-size:13px;font-weight:700;color:'+C.teal+';cursor:pointer;font-family:inherit" '+
          'onmouseenter="this.style.background=\'#f0fdf4\'" onmouseleave="this.style.background=\'none\'">'+
          '＋ Add Another Investigation'+
        '</button>'+

        /* Request Details */
        _rxC(
          _rxT('Request Details')+
          '<div style="display:flex;flex-direction:column;gap:16px">'+
            '<div>'+
              _rxL('Overall Priority',true)+
              '<div style="display:flex;gap:10px">'+
                ['Routine','Urgent','Emergency'].map(function(opt,i){
                  var col = opt==='Emergency'?C.red:opt==='Urgent'?C.amber:C.teal;
                  return '<label style="display:flex;align-items:center;gap:10px;padding:10px 18px;border:1.5px solid '+C.border+';border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;color:'+C.text+';background:#fff">'+
                    '<input type="radio" name="rad-priority" value="'+opt+'"'+(i===0?' checked':'')+' style="accent-color:'+col+'">'+opt+
                  '</label>';
                }).join('')+
              '</div>'+
            '</div>'+
            _rxTx('rad-overall-ind','Overall Clinical Indication (optional)',2,false)+
            _rxTx('rad-add-instr','Additional Instructions',2,false)+
          '</div>'
        )+

        /* Actions */
        '<div style="display:flex;gap:10px;margin-top:4px;margin-bottom:8px">'+
          '<button onclick="_dSubmitRadiology()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'+
            'Submit Request'+
          '</button>'+
          '<button onclick="_D.view=\'dashboard\';_dRender()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">Cancel</button>'+
        '</div>'+

      '</div>'+
      radSidebar+
    '</div>';
}
window._dSubmitRadiology = window._dSubmitRadiology || function(){};


/* ══════════════════════════════════════════════════════════════════
   REFERRALS
══════════════════════════════════════════════════════════════════ */
function _dReferrals(){
  /* ── Patient resolution ── */
  var refPat     = _D.consultPat || _D.pat360Data || _D.selectedPat || null;
  var refPatName = refPat ? ((refPat.firstName||refPat.name||'')+' '+(refPat.lastName||'')).trim()||'—' : '—';
  var refPatId   = refPat ? (refPat.mrn||refPat._id||refPat.id||'—') : '—';
  var refPatDob  = refPat && refPat.dateOfBirth
    ? new Date(refPat.dateOfBirth).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}) : '—';
  var todayFmt   = new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});
  var u          = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  var docName    = u.firstName?('Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim()):(u.name||'—');
  var docFacility= (typeof u.facility==='string'?u.facility:'')|| (u.facility&&u.facility.name)||u.facilityName||'Current healthcare facility';
  var docHpcsa   = u.hpcsaNumber||u.hpcsa||u.registrationNumber||'';

  /* ── Full specialty list ── */
  var SPECIALTIES = [
    'Cardiology','Neurology','Neurosurgery','Orthopaedics','General Surgery',
    'Cardiothoracic Surgery','Vascular Surgery','Urology','Gynaecology','Obstetrics',
    'Paediatrics','Neonatology','Oncology','Haematology','Gastroenterology',
    'Pulmonology','Nephrology','Endocrinology','Rheumatology','Dermatology',
    'Ophthalmology','ENT (Otorhinolaryngology)','Psychiatry','Clinical Psychology',
    'Infectious Diseases','Geriatrics','Palliative Medicine',
    'Physical Medicine and Rehabilitation','Anaesthesiology','Emergency Medicine',
    'Nuclear Medicine','Radiology','Radiation Oncology','Clinical Genetics',
    'Public Health Medicine'
  ];

  var SPECIALTY_DESC = {
    'Cardiology':'Heart and blood vessel conditions',
    'Neurology':'Brain, spinal cord and nervous system conditions',
    'Neurosurgery':'Surgery involving the brain, spine and nerves',
    'Orthopaedics':'Bones, joints, fractures and musculoskeletal conditions',
    'General Surgery':'Conditions requiring general surgical treatment',
    'Cardiothoracic Surgery':'Surgery involving the heart, lungs and chest',
    'Vascular Surgery':'Blood vessel conditions requiring surgical care',
    'Urology':'Urinary tract and male reproductive system conditions',
    'Gynaecology':'Female reproductive health conditions',
    'Obstetrics':'Pregnancy, labour and childbirth',
    'Paediatrics':'Medical care for children',
    'Neonatology':'Care of newborn and premature babies',
    'Oncology':'Cancer diagnosis and treatment',
    'Haematology':'Blood disorders',
    'Gastroenterology':'Digestive system, stomach, liver-related and intestinal conditions',
    'Pulmonology':'Lung and respiratory conditions',
    'Nephrology':'Kidney diseases',
    'Endocrinology':'Hormonal conditions, including diabetes and thyroid disorders',
    'Rheumatology':'Arthritis and autoimmune diseases',
    'Dermatology':'Skin, hair and nail conditions',
    'Ophthalmology':'Eye diseases and eye surgery',
    'ENT (Otorhinolaryngology)':'Ear, nose and throat conditions',
    'Psychiatry':'Mental health conditions',
    'Clinical Psychology':'Psychological assessment and therapy',
    'Infectious Diseases':'Complex infections, including selected HIV and TB-related cases',
    'Geriatrics':'Healthcare for older adults',
    'Palliative Medicine':'Symptom relief and quality of life in serious illness',
    'Physical Medicine and Rehabilitation':'Recovery and rehabilitation after illness or injury',
    'Anaesthesiology':'Anaesthesia, perioperative care and pain management',
    'Emergency Medicine':'Emergency assessment and treatment',
    'Nuclear Medicine':'Diagnosis and treatment using radiopharmaceuticals',
    'Radiology':'Medical imaging interpretation and image-guided procedures',
    'Radiation Oncology':'Cancer treatment using radiation',
    'Clinical Genetics':'Genetic conditions and genetic counselling',
    'Public Health Medicine':'Population health and disease prevention'
  };

  /* ── Local helpers (prescription card style) ── */
  function _rfC(c){ return '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px">'+c+'</div>'; }
  function _rfT(t){ return '<div style="font-size:15px;font-weight:800;color:'+C.text+';margin-bottom:16px">'+t+'</div>'; }
  function _rfI(label,val,mono){ return '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C.muted+';margin-bottom:4px">'+label+'</div><div style="font-size:14px;font-weight:700;color:'+C.text+';'+(mono?'font-family:monospace':'')+'">'+val+'</div></div>'; }
  function _rfL(t,req){ return '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:6px">'+t+(req?' <span style="color:#ef4444">*</span>':'')+'</div>'; }
  function _rfF(){ return 'width:100%;padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;color:'+C.text+';background:#fff;box-sizing:border-box;outline:none'; }
  function _rfTx(id,label,rows,req,ph){
    return '<div>'+_rfL(label,req)+'<textarea id="'+id+'" rows="'+(rows||3)+'" placeholder="'+(ph||'')+'" style="'+_rfF()+';resize:vertical"></textarea></div>';
  }
  function _rfInp(id,label,ph,req){
    return '<div>'+_rfL(label,req)+'<input id="'+id+'" type="text" placeholder="'+(ph||'')+'" style="'+_rfF()+'"></div>';
  }

  /* ── Specialty description update (global) ── */
  window._refUpdateSpecDesc = function(){
    var sel = document.getElementById('ref-specialty');
    var desc = document.getElementById('ref-spec-desc');
    if(!sel||!desc) return;
    var d = SPECIALTY_DESC[sel.value]||'';
    desc.textContent = d;
    desc.style.display = d ? 'block' : 'none';
  };

  /* ── Save referral (global) ── */
  window._dSubmitReferral = async function(){
    var specialty  = (document.getElementById('ref-specialty')||{value:''}).value;
    var dest       = (document.querySelector('input[name="ref-dest"]:checked')||{value:''}).value;
    var urgency    = (document.querySelector('input[name="ref-urgency"]:checked')||{value:'Routine'}).value;
    var reason     = ((document.getElementById('ref-reason')||{value:''}).value||'').trim();
    var findings   = ((document.getElementById('ref-findings')||{value:''}).value||'').trim();
    var question   = ((document.getElementById('ref-question')||{value:''}).value||'').trim();
    var addInstr   = ((document.getElementById('ref-add-instr')||{value:''}).value||'').trim();
    var preferred  = ((document.getElementById('ref-preferred')||{value:''}).value||'').trim();
    if(!reason){ if(window.UI)UI.showToast('Reason for referral is required','err'); return; }
    var pat5 = _D.consultPat||_D.pat360Data||_D.selectedPat||{};
    var payload = {
      patient:         pat5._id||pat5.id||'',
      patientName:     ((pat5.firstName||pat5.name||'')+' '+(pat5.lastName||'')).trim()||'Unknown',
      specialty:       specialty,
      destination:     dest,
      urgency:         urgency,
      reason:          reason,
      clinicalFindings:findings,
      specialistQuestion:question,
      additionalInstructions:addInstr,
      preferredClinician:preferred,
      orderedBy:       (u._id||u.id||''),
      orderedByName:   docName,
      facility:        docFacility,
      orderedAt:       new Date().toISOString(),
      status:          'pending'
    };
    try{ await API._fetchDirect('/referrals',{method:'POST',body:JSON.stringify(payload)}); }catch(_){}
    if(window.UI)UI.showToast('Referral submitted','ok');
    _D.view='referrals'; _dRender();
  };

  /* ── Sidebar ── */
  var refSidebar =
    '<div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">'+
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Referring Clinician</div>'+
        '<div style="display:flex;flex-direction:column;gap:12px">'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Clinician</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+docName+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">HPCSA Reg. No.</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+(docHpcsa?C.text:C.muted)+';font-family:monospace">'+(docHpcsa||'Not on record')+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Facility</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+docFacility+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Referral Date</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+todayFmt+'</div></div>'+
        '</div>'+
      '</div>'+
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Clinical Workflow</div>'+
        ['Consultation','Diagnosis','Lab Orders','Radiology','Prescription','Referral','Follow-Up','Next Appointment'].map(function(step){
          var active = step==='Referral';
          var done   = ['Consultation','Diagnosis'].indexOf(step)>-1;
          return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;font-weight:'+(active?700:500)+';color:'+(active?C.teal:done?C.green:C.muted)+'">'+
            '<span style="font-size:10px">'+(active?'→':done?'✓':'○')+'</span>'+step+'</div>';
        }).join('')+
      '</div>'+
    '</div>';

  /* ── HTML ── */
  return _dHeader('Referral', '')+
    '<div style="flex:1;overflow:auto;display:flex;gap:16px;padding:16px 20px 24px;box-sizing:border-box;align-items:flex-start">'+

      '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:14px">'+

        /* 1. Patient Information */
        _rfC(
          _rfT('Patient Information')+
          '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">'+
            _rfI('Patient Name',  refPatName)+
            _rfI('Patient ID',    refPatId, true)+
            _rfI('Date of Birth', refPatDob)+
            _rfI('Referral Date', todayFmt)+
          '</div>'
        )+

        /* 2. Referral */
        _rfC(
          _rfT('Referral')+
          '<div style="display:flex;flex-direction:column;gap:16px">'+
            /* Specialty */
            '<div>'+
              _rfL('Specialty',true)+
              '<select id="ref-specialty" onchange="_refUpdateSpecDesc()" style="'+_rfF()+'">'+
                SPECIALTIES.map(function(s){return'<option>'+s+'</option>';}).join('')+
              '</select>'+
              '<div id="ref-spec-desc" style="margin-top:6px;font-size:12px;color:'+C.muted+';font-style:italic;display:none"></div>'+
            '</div>'+
            /* Destination */
            '<div>'+
              _rfL('Referral Destination',true)+
              '<div style="display:flex;flex-direction:column;gap:8px">'+
                ['Department within this facility','Another hospital or healthcare facility'].map(function(opt,i){
                  return '<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid '+C.border+';border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;color:'+C.text+';background:#fff">'+
                    '<input type="radio" name="ref-dest" value="'+opt+'"'+(i===0?' checked':'')+' style="accent-color:'+C.teal+'">'+opt+
                  '</label>';
                }).join('')+
              '</div>'+
            '</div>'+
            /* Preferred clinician */
            _rfInp('ref-preferred','Preferred Clinician (optional)','Specialist name if known',false)+
          '</div>'
        )+

        /* 3. Referral Urgency */
        _rfC(
          _rfT('Referral Urgency')+
          '<div style="display:flex;flex-direction:column;gap:8px">'+
            [
              {val:'Routine',   label:'Routine',   sub:'Standard referral pathway',             col:C.teal},
              {val:'Urgent',    label:'Urgent',     sub:'Prompt clinical assessment required',   col:C.amber},
              {val:'Emergency', label:'Emergency',  sub:'Immediate assessment required',          col:C.red}
            ].map(function(opt,i){
              return '<label style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1.5px solid '+C.border+';border-radius:8px;cursor:pointer;background:#fff">'+
                '<input type="radio" name="ref-urgency" value="'+opt.val+'"'+(i===0?' checked':'')+' style="accent-color:'+opt.col+';width:16px;height:16px">'+
                '<div>'+
                  '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+opt.label+'</div>'+
                  '<div style="font-size:11px;color:'+C.muted+'">'+opt.sub+'</div>'+
                '</div>'+
              '</label>';
            }).join('')+
          '</div>'
        )+

        /* 4. Clinical Information */
        _rfC(
          _rfT('Clinical Information')+
          '<div style="display:flex;flex-direction:column;gap:14px">'+
            _rfTx('ref-reason',  'Reason for Referral', 3, true,  'Why is this patient being referred?')+
            _rfTx('ref-findings','Relevant Clinical Findings and History', 3, false, 'Examination findings, investigations, history relevant to this referral…')+
            _rfTx('ref-question','Specific Question for the Specialist', 2, false, 'What would you like the specialist to address?')+
            _rfTx('ref-add-instr','Additional Instructions', 2, false, '')+
          '</div>'
        )+

        /* 5. Referral Checklist */
        _rfC(
          _rfT('Referral Checklist')+
          '<div style="font-size:12px;color:'+C.muted+';margin-bottom:12px">Before submitting, ensure relevant clinical documents are linked to the referral.</div>'+
          '<div style="display:flex;flex-direction:column;gap:10px">'+
            [
              'Relevant consultation and diagnosis records',
              'Available laboratory and imaging results',
              'Medication and allergy information'
            ].map(function(item){
              return '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;font-weight:600;color:'+C.text+'">'+
                '<input type="checkbox" style="width:16px;height:16px;accent-color:'+C.teal+'">'+item+
              '</label>';
            }).join('')+
          '</div>'
        )+

        /* Actions */
        '<div style="display:flex;gap:10px;margin-top:4px;margin-bottom:8px">'+
          '<button onclick="_dSubmitReferral()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'+
            'Submit Referral'+
          '</button>'+
          '<button onclick="_D.view=\'dashboard\';_dRender()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">Cancel</button>'+
        '</div>'+

      '</div>'+
      refSidebar+
    '</div>';
}

/* ══════════════════════════════════════════════════════════════════
   MEDICAL NOTES
══════════════════════════════════════════════════════════════════ */
function _dMedicalNotes(){
  /* ── Patient resolution ── */
  var mnPat     = _D.selectedPat || _D.consultPat || _D.pat360Data || null;
  var _mnFirst  = mnPat ? (mnPat.firstName||mnPat.first_name||mnPat.name||'') : '';
  var _mnLast   = mnPat ? (mnPat.lastName||mnPat.last_name||mnPat.surname||'') : '';
  var mnPatName = mnPat ? (mnPat.fullName||(_mnFirst+(_mnLast?' '+_mnLast:'')).trim()||mnPat.name||'—') : '—';
  var mnPatId   = mnPat ? (mnPat.nationalId||mnPat.idNumber||mnPat.id_number||mnPat.passport||mnPat.mrn||mnPat._id||mnPat.id||'—') : '—';
  var mnPatDob  = mnPat && (mnPat.dateOfBirth||mnPat.date_of_birth||mnPat.dob)
    ? new Date(mnPat.dateOfBirth||mnPat.date_of_birth||mnPat.dob).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}) : '—';
  var todayFmt  = new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});
  var todayIso  = new Date().toISOString().slice(0,10);

  var u         = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  var docName   = u.firstName ? 'Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim() : (u.name||'—');
  var docHpcsa  = u.hpcsaNumber||u.hpcsa||u.registrationNumber||'';
  var docFacility = (typeof u.facility==='string'?u.facility:'')
    ||(u.facility&&u.facility.name)||u.facilityName||'Current healthcare facility';

  /* ── ICD-10 lookup table ── */
  var ICD10_LIST = [
    {d:'Acute upper respiratory infection',  c:'J06.9'},
    {d:'Influenza, virus not identified',     c:'J11.1'},
    {d:'Common cold',                          c:'J00'},
    {d:'COVID-19',                             c:'U07.1'},
    {d:'Pneumonia, unspecified organism',      c:'J18.9'},
    {d:'Asthma',                               c:'J45.9'},
    {d:'Essential hypertension',               c:'I10'},
    {d:'Type 2 diabetes mellitus',             c:'E11.9'},
    {d:'Gastroenteritis, unspecified',         c:'K52.9'},
    {d:'Urinary tract infection, site not specified', c:'N39.0'},
    {d:'Fever, unspecified',                   c:'R50.9'},
    {d:'Cough, unspecified',                   c:'R05.9'},
    {d:'Headache',                             c:'R51.9'},
    {d:'Acute pharyngitis, unspecified',       c:'J02.9'},
    {d:'Acute bronchitis, unspecified',        c:'J20.9'},
    {d:'Anaemia, unspecified',                 c:'D64.9'},
    {d:'Migraine, unspecified',               c:'G43.9'},
    {d:'Low back pain',                        c:'M54.5'},
    {d:'Allergic rhinitis, unspecified',       c:'J30.9'},
    {d:'Gastro-oesophageal reflux disease',    c:'K21.9'}
  ];
  var ICD10_MAP = {};
  ICD10_LIST.forEach(function(x){ ICD10_MAP[x.d]=x.c; });

  /* ── ICD-10 auto-fill handler ── */
  window._mnDiagChange = function(diagId, icdId){
    var diagEl = document.getElementById(diagId);
    var icdEl  = document.getElementById(icdId);
    if(!diagEl||!icdEl) return;
    var code = ICD10_MAP[diagEl.value]||'';
    icdEl.value = code;
  };

  /* ── "Add Another Diagnosis" handler ── */
  window._mnDiagCount = window._mnDiagCount||1;
  window._mnAddDiag = function(){
    _mnDiagCount++;
    var n = _mnDiagCount;
    var container = document.getElementById('mn-extra-diags');
    if(!container) return;
    var fld = 'width:100%;padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;color:'+C.text+';background:#fff;box-sizing:border-box;outline:none';
    var row = document.createElement('div');
    row.id = 'mn-diag-row-'+n;
    row.style.cssText = 'display:grid;grid-template-columns:1.6fr 0.8fr 0.9fr auto;gap:10px;align-items:end;margin-top:12px';
    row.innerHTML =
      '<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:6px">Diagnosis</div>'+
        '<select id="mn-sec-diag'+n+'" onchange="_mnDiagChange(\'mn-sec-diag'+n+'\',\'mn-sec-icd'+n+'\')" style="'+fld+'">'+
          '<option value="">Select diagnosis…</option>'+
          ICD10_LIST.map(function(x){return'<option>'+x.d+'</option>';}).join('')+
        '</select></div>'+
      '<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:6px">ICD-10 Code</div>'+
        '<input id="mn-sec-icd'+n+'" placeholder="Auto-filled" style="'+fld+'"></div>'+
      '<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:6px">Status</div>'+
        '<select id="mn-sec-status'+n+'" style="'+fld+'"><option>Provisional</option><option>Confirmed</option><option>Differential</option></select></div>'+
      '<div style="padding-bottom:2px"><button onclick="document.getElementById(\'mn-diag-row-'+n+'\').remove()" style="font-size:12px;color:'+C.red+';background:none;border:none;cursor:pointer;padding:9px 4px;font-family:inherit;font-weight:600">Remove</button></div>';
    container.appendChild(row);
    var addBtn = document.getElementById('mn-add-diag-btn');
    if(addBtn) container.insertBefore(row, addBtn);
  };

  /* ── Save handler ── */
  window._dSaveNote = async function(){
    var gv = function(id){ var e=document.getElementById(id); return e?e.value.trim():''; };
    var diagName = gv('mn-primary-diag');
    var icd10    = gv('mn-primary-icd');
    if(!diagName){ if(window.UI)UI.showToast('Primary diagnosis is required','err'); return; }
    var riskEl   = document.querySelector('input[name="mn-risk"]:checked');
    var bases    = Array.from(document.querySelectorAll('.mn-basis:checked')).map(function(e){return e.value;});
    var pat6     = _D.consultPat||_D.pat360Data||_D.selectedPat||{};
    var payload  = {
      patient:            pat6._id||pat6.id||'',
      patientName:        mnPatName,
      primaryDiagnosis:   diagName,
      icd10:              icd10,
      diagnosisStatus:    gv('mn-primary-status'),
      clinicalAssessment: gv('mn-assessment'),
      clinicalFindings:   gv('mn-findings'),
      differentialDiagnosis: gv('mn-differential'),
      riskLevel:          riskEl?riskEl.value:'Stable',
      confirmationBasis:  bases,
      additionalNotes:    gv('mn-add-notes'),
      orderedBy:          (u._id||u.id||''),
      orderedByName:      docName,
      recordedAt:         new Date().toISOString()
    };
    try{ await API._fetchDirect('/medical-notes',{method:'POST',body:JSON.stringify(payload)}); }catch(_){}
    if(window.UI)UI.showToast('Diagnosis saved','ok');
  };

  /* ── Local helpers ── */
  function _mnC(c){ return '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px">'+c+'</div>'; }
  function _mnT(t){ return '<div style="font-size:15px;font-weight:800;color:'+C.text+';margin-bottom:16px">'+t+'</div>'; }
  function _mnI(label,val,mono){ return '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C.muted+';margin-bottom:4px">'+label+'</div><div style="font-size:14px;font-weight:700;color:'+C.text+';'+(mono?'font-family:monospace':'')+'">'+val+'</div></div>'; }
  function _mnL(t,req){ return '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:6px">'+t+(req?' <span style="color:#ef4444">*</span>':'')+'</div>'; }
  function _mnF(){ return 'width:100%;padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;color:'+C.text+';background:#fff;box-sizing:border-box;outline:none'; }
  function _mnTx(id,label,rows,req,ph){
    return '<div>'+_mnL(label,req)+'<textarea id="'+id+'" rows="'+(rows||3)+'" placeholder="'+(ph||'')+'" style="'+_mnF()+';resize:vertical"></textarea></div>';
  }

  /* ── Sidebar ── */
  var mnSidebar =
    '<div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">'+
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Recording Clinician</div>'+
        '<div style="display:flex;flex-direction:column;gap:12px">'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Clinician</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+docName+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">HPCSA Reg. No.</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+(docHpcsa?C.text:C.muted)+';font-family:monospace">'+(docHpcsa||'Not on record')+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Facility</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+docFacility+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Date</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+todayFmt+'</div></div>'+
        '</div>'+
      '</div>'+
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Clinical Workflow</div>'+
        ['Consultation','Diagnosis','Lab Orders','Radiology','Prescription','Referral','Follow-Up','Next Appointment'].map(function(step){
          var active = step==='Diagnosis';
          var done   = step==='Consultation';
          return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;font-weight:'+(active?700:500)+';color:'+(active?C.teal:done?C.green:C.muted)+'">'+
            '<span style="font-size:10px">'+(active?'→':done?'✓':'○')+'</span>'+step+'</div>';
        }).join('')+
      '</div>'+
    '</div>';

  /* ── Diagnosis dropdown (searchable) ── */
  var diagSelect =
    '<div style="display:grid;grid-template-columns:1.6fr 0.8fr 0.9fr;gap:10px">'+
      '<div>'+_mnL('Diagnosis',true)+
        '<select id="mn-primary-diag" onchange="_mnDiagChange(\'mn-primary-diag\',\'mn-primary-icd\')" style="'+_mnF()+'">'+
          '<option value="">Select or type diagnosis…</option>'+
          ICD10_LIST.map(function(x){return'<option>'+x.d+'</option>';}).join('')+
        '</select>'+
      '</div>'+
      '<div>'+_mnL('ICD-10 Code',true)+
        '<input id="mn-primary-icd" placeholder="Auto-filled" style="'+_mnF()+'">'+
      '</div>'+
      '<div>'+_mnL('Diagnosis Status',true)+
        '<select id="mn-primary-status" style="'+_mnF()+'">'+
          '<option>Provisional</option><option>Confirmed</option><option>Differential</option>'+
        '</select>'+
      '</div>'+
    '</div>';

  /* ── HTML ── */
  return _dHeader('Diagnosis & Clinical Assessment', '')+
    '<div style="flex:1;overflow:auto;display:flex;gap:16px;padding:16px 20px 24px;box-sizing:border-box;align-items:flex-start">'+

      '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:14px">'+

        /* 1. Patient Information */
        _mnC(
          _mnT('Patient Information')+
          '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">'+
            _mnI('Patient Name',  mnPatName)+
            _mnI('Patient ID',    mnPatId, true)+
            _mnI('Date of Birth', mnPatDob)+
            _mnI('Date',          todayFmt)+
          '</div>'
        )+

        /* 2. Primary Diagnosis */
        _mnC(
          _mnT('Primary Diagnosis')+
          '<div style="font-size:12px;color:'+C.muted+';margin-bottom:14px">The main condition identified during the consultation.</div>'+
          diagSelect+
          '<div id="mn-extra-diags" style="margin-top:4px"></div>'+
          '<button id="mn-add-diag-btn" onclick="_mnAddDiag()" '+
            'style="display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:11px;margin-top:12px;border:1.5px dashed '+C.border+';border-radius:9px;background:none;font-size:13px;font-weight:700;color:'+C.teal+';cursor:pointer;font-family:inherit" '+
            'onmouseenter="this.style.background=\'#f0fdf4\'" onmouseleave="this.style.background=\'none\'">'+
            '＋ Add Another Diagnosis'+
          '</button>'
        )+

        /* 3. Clinical Assessment */
        _mnC(
          _mnT('Clinical Assessment')+
          '<div style="display:flex;flex-direction:column;gap:14px">'+
            _mnTx('mn-assessment','Clinical Assessment',3,true,'Overall clinical assessment of the patient…')+
            _mnTx('mn-findings','Clinical Findings Supporting Diagnosis',3,true,'Examination findings, vital signs, test results…')+
            _mnTx('mn-differential','Differential Diagnosis',2,false,'Other possible diagnoses considered and why they were excluded…')+
          '</div>'
        )+

        /* 4. Risk / Severity */
        _mnC(
          _mnT('Risk / Severity')+
          '<div style="display:flex;flex-direction:column;gap:8px">'+
            [
              {val:'Stable',               sub:'No immediate concerns identified',        col:C.green},
              {val:'Requires Monitoring',  sub:'Observe and reassess',                    col:C.teal},
              {val:'High Risk',            sub:'Urgent clinical review required',          col:C.amber},
              {val:'Emergency',            sub:'Immediate emergency assessment',           col:C.red}
            ].map(function(opt,i){
              return '<label style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1.5px solid '+C.border+';border-radius:8px;cursor:pointer;background:#fff">'+
                '<input type="radio" name="mn-risk" value="'+opt.val+'"'+(i===0?' checked':'')+' style="accent-color:'+opt.col+';width:16px;height:16px">'+
                '<div>'+
                  '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+opt.val+'</div>'+
                  '<div style="font-size:11px;color:'+C.muted+'">'+opt.sub+'</div>'+
                '</div>'+
              '</label>';
            }).join('')+
          '</div>'
        )+

        /* 5. Diagnosis Confirmation Basis */
        _mnC(
          _mnT('Diagnosis Confirmation Basis')+
          '<div style="font-size:12px;color:'+C.muted+';margin-bottom:12px">Select all evidence sources used to support the diagnosis.</div>'+
          '<div style="display:flex;flex-wrap:wrap;gap:10px">'+
            ['Clinical Assessment','Laboratory Results','Imaging Results','Previous Medical Records','Specialist Assessment','Other'].map(function(b){
              return '<label style="display:flex;align-items:center;gap:8px;padding:9px 14px;border:1.5px solid '+C.border+';border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;color:'+C.text+';background:#fff">'+
                '<input type="checkbox" class="mn-basis" value="'+b+'" style="width:15px;height:15px;accent-color:'+C.teal+'">'+b+
              '</label>';
            }).join('')+
          '</div>'
        )+

        /* Additional Notes */
        _mnC(
          _mnT('Additional Notes')+
          _mnTx('mn-add-notes','Additional Notes (Optional)',3,false,'')
        )+

        /* 6. Next Steps */
        _mnC(
          _mnT('Next Steps')+
          '<div style="font-size:12px;color:'+C.muted+';margin-bottom:14px">Save the diagnosis, then continue with the required clinical orders.</div>'+
          '<div style="display:flex;flex-wrap:wrap;gap:10px">'+
            [
              {label:'🧪 Order Lab',     onclick:"_D.labNewOrder=true;_D.view='lab';_dRender()"},
              {label:'🩻 Radiology',     onclick:"_D.view='radiology';_dRender()"},
              {label:'💊 Prescription',  onclick:"_D.view='prescriptions';_dRender()"},
              {label:'🔄 Referral',      onclick:"_D.view='referrals';_dRender()"},
              {label:'📅 Follow-up',     onclick:"_D.view='follow_up';_dRender()"}
            ].map(function(a){
              return '<button onclick="'+a.onclick+'" '+
                'style="padding:9px 16px;border-radius:8px;border:1.5px solid '+C.border+';background:#fff;font-size:13px;font-weight:700;color:'+C.text+';cursor:pointer;font-family:inherit">'+
                a.label+'</button>';
            }).join('')+
          '</div>'
        )+

        /* Actions */
        '<div style="display:flex;gap:10px;margin-top:4px;margin-bottom:8px">'+
          '<button onclick="_dSaveNote()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'+
            'Save Diagnosis'+
          '</button>'+
          '<button onclick="_D.view=\'consult\';_dRender()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">Cancel</button>'+
        '</div>'+

      '</div>'+
      mnSidebar+
    '</div>';
}


/* ══════════════════════════════════════════════════════════════════
   PATIENT FOLLOW-UP
══════════════════════════════════════════════════════════════════ */
function _dFollowUp(){
  /* ── Patient resolution ── */
  var fuPat      = _D.selectedPat || _D.consultPat || _D.pat360Data || null;
  var _fuFirst   = fuPat ? (fuPat.firstName||fuPat.first_name||fuPat.name||'') : '';
  var _fuLast    = fuPat ? (fuPat.lastName||fuPat.last_name||fuPat.surname||'') : '';
  var fuPatName  = fuPat ? (fuPat.fullName||(_fuFirst+(_fuLast?' '+_fuLast:'')).trim()||fuPat.name||'—') : '—';
  var fuPatId    = fuPat ? (fuPat.nationalId||fuPat.idNumber||fuPat.id_number||fuPat.mrn||fuPat._id||fuPat.id||'—') : '—';
  var fuConsultId= _D.workflow&&_D.workflow.consultationId ? _D.workflow.consultationId : '—';
  var todayFmt   = new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});
  var todayIso   = new Date().toISOString().slice(0,10);

  var u          = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  var docName    = u.firstName ? 'Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim() : (u.name||'—');
  var docHpcsa   = u.hpcsaNumber||u.hpcsa||u.registrationNumber||'';
  var docFacility= (typeof u.facility==='string'?u.facility:'')
    ||(u.facility&&u.facility.name)||u.facilityName||'Current healthcare facility';

  /* ── Local helpers ── */
  function _fuC(c){ return '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px">'+c+'</div>'; }
  function _fuT(t,sub){ return '<div style="font-size:15px;font-weight:800;color:'+C.text+';margin-bottom:'+(sub?'6px':'16px')+'">'+t+'</div>'+(sub?'<div style="font-size:12px;color:'+C.muted+';margin-bottom:14px">'+sub+'</div>':''); }
  function _fuI(label,val,mono){ return '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C.muted+';margin-bottom:4px">'+label+'</div><div style="font-size:14px;font-weight:700;color:'+C.text+';'+(mono?'font-family:monospace':'')+'">'+val+'</div></div>'; }
  function _fuL(t,req){ return '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:6px">'+t+(req?' <span style="color:#ef4444">*</span>':'')+'</div>'; }
  function _fuF(){ return 'width:100%;padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;color:'+C.text+';background:#fff;box-sizing:border-box;outline:none'; }
  function _fuTx(id,label,rows,req,ph){
    return '<div>'+_fuL(label,req)+'<textarea id="'+id+'" rows="'+(rows||3)+'" placeholder="'+(ph||'')+'" style="'+_fuF()+';resize:vertical"></textarea></div>';
  }
  function _fuInp(id,label,ph,type,val){
    return '<div>'+_fuL(label,false)+'<input id="'+id+'" type="'+(type||'text')+'" '+(val?'value="'+val+'"':'')+' placeholder="'+(ph||'')+'" style="'+_fuF()+'"></div>';
  }

  /* ── Save follow-up ── */
  window._dSaveFollowUp = async function(bookAppt){
    var gv = function(id){ var e=document.getElementById(id); return e?e.value.trim():''; };
    var typeEl   = document.querySelector('input[name="fu-type"]:checked');
    var locEl    = document.querySelector('input[name="fu-loc"]:checked');
    var prioEl   = document.querySelector('input[name="fu-priority"]:checked');
    var statusEl = document.querySelector('input[name="fu-status"]:checked');
    var reason   = gv('fu-reason');
    if(!reason){ if(window.UI)UI.showToast('Reason for follow-up is required','err'); return; }
    var pat7 = _D.selectedPat||_D.consultPat||_D.pat360Data||{};
    var payload = {
      patient:           pat7._id||pat7.id||'',
      patientName:       fuPatName,
      consultationId:    fuConsultId,
      followUpType:      typeEl?typeEl.value:'Routine review',
      followUpDate:      gv('fu-date'),
      followUpTime:      gv('fu-time'),
      location:          locEl?locEl.value:'Same facility',
      reason:            reason,
      symptomsToMonitor: gv('fu-symptoms'),
      testsToReview:     gv('fu-tests'),
      treatmentPlan:     gv('fu-treatment'),
      responsibleHcp:    gv('fu-hcp'),
      priority:          prioEl?prioEl.value:'Routine',
      reminder:          gv('fu-reminder'),
      status:            statusEl?statusEl.value:'Pending',
      additionalNotes:   gv('fu-add-notes'),
      orderedBy:         (u._id||u.id||''),
      orderedByName:     docName,
      createdAt:         new Date().toISOString()
    };
    try{ await API._fetchDirect('/follow-ups',{method:'POST',body:JSON.stringify(payload)}); }catch(_){}
    if(window.UI)UI.showToast('Follow-up saved','ok');
    if(bookAppt){ _D.view='doc_appointments'; _dRender(); }
  };

  /* ── Sidebar ── */
  var fuSidebar =
    '<div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">'+
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Responsible Clinician</div>'+
        '<div style="display:flex;flex-direction:column;gap:12px">'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Clinician</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+docName+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">HPCSA Reg. No.</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+(docHpcsa?C.text:C.muted)+';font-family:monospace">'+(docHpcsa||'Not on record')+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Facility</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+docFacility+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Date</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+todayFmt+'</div></div>'+
        '</div>'+
      '</div>'+
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Clinical Workflow</div>'+
        ['Consultation','Diagnosis','Lab Orders','Radiology','Prescription','Referral','Follow-Up','Next Appointment'].map(function(step){
          var active = step==='Follow-Up';
          var done   = ['Consultation','Diagnosis'].indexOf(step)>-1;
          return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;font-weight:'+(active?700:500)+';color:'+(active?C.teal:done?C.green:C.muted)+'">'+
            '<span style="font-size:10px">'+(active?'→':done?'✓':'○')+'</span>'+step+'</div>';
        }).join('')+
      '</div>'+
    '</div>';

  /* ── Radio row helper ── */
  function _fuRadio(name,opts,defaultVal){
    return '<div style="display:flex;flex-direction:column;gap:8px">'+
      opts.map(function(opt){
        var val  = typeof opt==='string' ? opt : opt.val;
        var sub  = typeof opt==='string' ? '' : (opt.sub||'');
        var col  = typeof opt==='string' ? C.teal : (opt.col||C.teal);
        var chk  = val===defaultVal ? ' checked' : '';
        return '<label style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1.5px solid '+C.border+';border-radius:8px;cursor:pointer;background:#fff">'+
          '<input type="radio" name="'+name+'" value="'+val+'"'+chk+' style="accent-color:'+col+';width:16px;height:16px">'+
          '<div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+val+'</div>'+
            (sub?'<div style="font-size:11px;color:'+C.muted+'">'+sub+'</div>':'')+
          '</div>'+
        '</label>';
      }).join('')+
    '</div>';
  }

  /* ── HTML ── */
  return _dHeader('Patient Follow-Up', 'Consultation management · Follow-up plan')+
    '<div style="flex:1;overflow:auto;display:flex;gap:16px;padding:16px 20px 24px;box-sizing:border-box;align-items:flex-start">'+

      '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:14px">'+

        /* 1. Patient Information */
        _fuC(
          _fuT('Patient Information')+
          '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">'+
            _fuI('Patient ID',           fuPatId, true)+
            _fuI('Patient Name',         fuPatName)+
            _fuI('Consultation ID',      fuConsultId, true)+
            _fuI('Responsible Clinician',docName)+
          '</div>'
        )+

        /* 2. Follow-Up Details */
        _fuC(
          _fuT('Follow-Up Details')+
          '<div style="display:flex;flex-direction:column;gap:16px">'+
            '<div>'+
              _fuL('Follow-Up Type',true)+
              _fuRadio('fu-type',['Routine review','Review test results','Monitor symptoms','Chronic disease review','Post-treatment review','Urgent review'],'Routine review')+
            '</div>'+
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+
              _fuInp('fu-date','Follow-Up Date *','Select date','date','')+
              _fuInp('fu-time','Follow-Up Time','Select time','time','')+
            '</div>'+
            '<div>'+
              _fuL('Follow-Up Location',true)+
              _fuRadio('fu-loc',['Same facility','Specialist department','Telemedicine','Community clinic'],'Same facility')+
            '</div>'+
          '</div>'
        )+

        /* 3. Clinical Follow-Up Plan */
        _fuC(
          _fuT('Clinical Follow-Up Plan')+
          '<div style="display:flex;flex-direction:column;gap:14px">'+
            _fuTx('fu-reason',    'Reason for Follow-Up',              3, true,  'Why does this patient need a follow-up?')+
            _fuTx('fu-symptoms',  'Symptoms or Conditions to Monitor', 3, false, 'List symptoms or conditions to watch…')+
            _fuTx('fu-tests',     'Tests or Results to Review',        2, false, 'Lab results, imaging or other tests to discuss…')+
            _fuTx('fu-treatment', 'Treatment Plan / Instructions',     3, false, 'Ongoing treatment plan, medications, lifestyle instructions…')+
            _fuInp('fu-hcp',      'Responsible Healthcare Professional','Clinician name')+
          '</div>'
        )+

        /* 4. Follow-Up Priority */
        _fuC(
          _fuT('Follow-Up Priority')+
          _fuRadio('fu-priority',[
            {val:'Routine',  sub:'Scheduled review',                   col:C.green},
            {val:'Priority', sub:'Earlier review required',             col:C.teal},
            {val:'Urgent',   sub:'Prompt clinical review required',     col:C.amber}
          ],'Routine')+
          '<div style="margin-top:16px">'+
            _fuL('Reminder Schedule',false)+
            '<select id="fu-reminder" style="'+_fuF()+'">'+
              '<option value="">Select reminder…</option>'+
              ['1 day before','2 days before','3 days before','1 week before','No reminder'].map(function(r){
                return '<option>'+r+'</option>';
              }).join('')+
            '</select>'+
          '</div>'
        )+

        /* 5. Follow-Up Status */
        _fuC(
          _fuT('Follow-Up Status','The system will update this status as the patient progresses through follow-up care.')+
          _fuRadio('fu-status',[
            {val:'Pending',      sub:'Follow-up not yet scheduled',       col:C.muted},
            {val:'Scheduled',    sub:'Appointment booked',                col:C.teal},
            {val:'Completed',    sub:'Patient reviewed',                  col:C.green},
            {val:'Missed',       sub:'Patient did not attend',            col:C.amber},
            {val:'Rescheduled',  sub:'New date required or recorded',     col:C.blue},
            {val:'Cancelled',    sub:'Follow-up no longer planned',       col:C.red}
          ],'Pending')
        )+

        /* Additional Notes */
        _fuC(
          _fuT('Additional Notes')+
          _fuTx('fu-add-notes','Additional Notes (Optional)',3,false,'')
        )+

        /* Actions */
        '<div style="display:flex;gap:10px;margin-top:4px;margin-bottom:8px">'+
          '<button onclick="_dSaveFollowUp(false)" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'+
            'Save Follow-Up'+
          '</button>'+
          '<button onclick="_dSaveFollowUp(true)" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
            '📅 Book Next Appointment'+
          '</button>'+
        '</div>'+

      '</div>'+
      fuSidebar+
    '</div>';
}


function _dTelemedicine(){
  /* Render shell; sessions load async */
  setTimeout(_dLoadTeleSessions, 0);
  return _dHeader('Telemedicine','Virtual consultations and remote patient care',
    _btn('↻ Refresh','_dLoadTeleSessions()',C.blue))+
    '<div style="flex:1;overflow:auto;padding:16px 20px">'+
      '<div style="background:'+C.blueLt+';border:1px solid '+C.blueBd+';border-radius:10px;padding:12px 14px;display:flex;align-items:flex-start;gap:10px;margin-bottom:14px">'+
        '<span style="font-size:18px;flex-shrink:0">ℹ️</span>'+
        '<div style="font-size:13px;color:#1e3a5f;line-height:1.5">'+
          'Click <strong>Start session</strong> to open the video call inside NIHMS. '+
          'Your patient joins via their NIHMS patient portal. No external links or downloads needed.'+
        '</div>'+
      '</div>'+
      _card(
        '<div style="font-size:14px;font-weight:700;color:'+C.text+';margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">'+
          '<span>📅 Telemedicine Sessions</span>'+
          '<span id="tele-count" style="font-size:11px;color:'+C.muted+'">Loading…</span>'+
        '</div>'+
        '<div id="tele-session-list"><div style="padding:20px;text-align:center;color:'+C.muted+'">Loading sessions…</div></div>'
      )+
    '</div>'+
    /* Full-screen video overlay — hidden until a session starts */
    '<div id="tele-overlay" style="display:none;position:fixed;inset:0;background:#111;z-index:9999;flex-direction:column"></div>';
}

/* ── Load telemedicine appointments from API ── */
window._dLoadTeleSessions = async function(){
  var wrap = document.getElementById('tele-session-list');
  var cnt  = document.getElementById('tele-count');
  if(!wrap) return;
  wrap.innerHTML = '<div style="padding:20px;text-align:center;color:'+C.muted+'">Loading sessions…</div>';

  try {
    var res   = await API.appointments.list({ visitType:'telemedicine', limit:50 });
    var appts = (res && res.data) || [];

    if(cnt) cnt.textContent = appts.length + ' session' + (appts.length!==1?'s':'');

    if(!appts.length){
      wrap.innerHTML =
        '<div style="padding:36px;text-align:center;color:'+C.muted+'">'+
          '<div style="font-size:36px;margin-bottom:10px">📹</div>'+
          '<div style="font-size:14px;font-weight:600;margin-bottom:6px">No telemedicine sessions</div>'+
          '<div style="font-size:12px">Appointments with visit type "Telemedicine" appear here.</div>'+
        '</div>';
      return;
    }

    appts.sort(function(a,b){ return new Date(a.scheduledAt)-new Date(b.scheduledAt); });

    wrap.innerHTML = appts.map(function(a){
      var when    = new Date(a.scheduledAt);
      var now     = new Date();
      var isLive  = a.status==='in_progress';
      var isPast  = when<now && !isLive;
      var isSoon  = !isPast && (when-now)<30*60*1000;
      var canJoin = !['cancelled','completed'].includes(a.status);
      var canAct  = ['confirmed','pending'].includes(a.status) && !isPast;

      var statusColors = {
        confirmed:   {bg:'#dcfce7',color:'#15803d'},
        pending:     {bg:'#fef3c7',color:'#92400e'},
        in_progress: {bg:'#ccfbf1',color:'#0f766e'},
        completed:   {bg:'#f1f5f9',color:'#64748b'},
        cancelled:   {bg:'#fee2e2',color:'#991b1b'}
      };
      var sc = statusColors[a.status]||{bg:'#f1f5f9',color:'#64748b'};

      var ptName = ((a.patient&&a.patient.firstName)||'') + ' ' + ((a.patient&&a.patient.lastName)||'');
      ptName = ptName.trim() || 'Patient';
      var ini = ptName.split(' ').map(function(n){return n[0]||'';}).join('').slice(0,2).toUpperCase();

      var borderColor = isLive ? C.green : isSoon ? C.amber : C.border;
      var bgColor     = isLive ? '#f0fdf4' : isSoon ? '#fffbeb' : '#fff';

      return '<div style="padding:14px;margin-bottom:10px;border-radius:10px;border:2px solid '+borderColor+';background:'+bgColor+'">'+
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">'+
          '<div style="width:40px;height:40px;border-radius:50%;background:'+C.blue+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">'+ini+'</div>'+
          '<div style="flex:1;min-width:0">'+
            '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px">'+
              '<span style="font-size:14px;font-weight:700;color:'+C.text+'">'+ptName+'</span>'+
              (isLive?'<span style="font-size:11px;font-weight:600;padding:2px 10px;border-radius:20px;background:'+C.green+';color:#fff">● Live now</span>':'')+
              (isSoon&&!isLive?'<span style="font-size:11px;font-weight:600;padding:2px 10px;border-radius:20px;background:'+C.amber+';color:#fff">Starting soon</span>':'')+
              '<span style="font-size:11px;font-weight:600;padding:2px 10px;border-radius:20px;background:'+sc.bg+';color:'+sc.color+'">'+a.status+'</span>'+
            '</div>'+
            '<div style="font-size:12px;color:'+C.muted+'">'+
              (a.reason||'Telemedicine consultation')+
            '</div>'+
            '<div style="font-size:11px;color:'+C.muted+';margin-top:2px">'+
              '📅 '+when.toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'})+
              ' &nbsp;🕐 '+when.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+
              (a.queueToken?' &nbsp;🎫 Token: <strong style="font-family:monospace">'+a.queueToken+'</strong>':'')+
            '</div>'+
          '</div>'+
          '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0">'+
            (canJoin?'<button onclick="_dJoinTeleSession(\''+a._id+'\')" style="padding:9px 18px;border-radius:8px;border:none;background:'+C.green+';color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px">'+
              '📹 '+(isLive?'Rejoin session':isSoon?'Join now':'Start session')+
            '</button>':'')+
            '<div style="display:flex;gap:6px">'+
              (canAct?'<button onclick="_docReschedule(\''+a._id+'\',\'telemedicine\',\''+new Date(a.scheduledAt).toISOString().slice(0,16)+'\')" style="padding:5px 10px;border-radius:6px;border:1px solid '+C.border+';background:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">↩ Reschedule</button>':'')+
              (canAct?'<button onclick="_docCancelAppt(\''+a._id+'\')" style="padding:5px 10px;border-radius:6px;border:1px solid #fca5a5;background:#fff;color:#dc2626;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">✕ Cancel</button>':'')+
            '</div>'+
          '</div>'+
        '</div>'+
      '</div>';
    }).join('');

  } catch(err){
    wrap.innerHTML = '<div style="padding:16px;background:#fee2e2;border-radius:8px;color:#991b1b;font-size:13px">'+
      '⚠ Could not load sessions: '+(err.message||'Network error')+'. Check your connection and try again.'+
    '</div>';
    if(cnt) cnt.textContent = 'Error';
  }
};

/* ── Join a telemedicine session — calls backend, embeds Jitsi iframe ── */
window._dJoinTeleSession = async function(appointmentId){
  /* Find the clicked button and show loading state */
  var btns = document.querySelectorAll('#tele-session-list button');
  btns.forEach(function(b){ if(b.onclick && b.getAttribute('onclick') && b.getAttribute('onclick').includes(appointmentId)){ b.disabled=true; b.textContent='Joining…'; } });

  try {
    var res  = await API._fetchDirect('/appointments/'+appointmentId+'/join', { method:'GET' });
    var data = res && res.data;
    if(!data) throw new Error('No session data returned.');
    _dOpenJitsiRoom(data);
  } catch(err){
    if(window.UI && window.UI.showToast) UI.showToast('Could not join: '+(err.message||'Unknown error'),'err');
    _dLoadTeleSessions(); /* re-render to restore buttons */
  }
};

/* ── Render the Jitsi video room as a full-screen overlay ── */
function _dOpenJitsiRoom(session){
  var overlay = document.getElementById('tele-overlay');
  if(!overlay) return;

  var when  = session.scheduledAt ? new Date(session.scheduledAt) : null;
  var other = ((session.patient&&session.patient.firstName)||'') + ' ' + ((session.patient&&session.patient.lastName)||'');
  other = other.trim() || 'Patient';

  overlay.style.display = 'flex';
  overlay.innerHTML =
    '<style>'+
      '@keyframes nilive{0%,100%{opacity:1}50%{opacity:.4}}'+
      '#tele-jitsi-frame{width:100%;border:none;flex:1;min-height:0}'+
    '</style>'+
    /* Top control bar */
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#1a1a1a;flex-shrink:0;gap:12px;flex-wrap:wrap">'+
      '<div style="display:flex;align-items:center;gap:12px">'+
        '<div style="font-size:16px;font-weight:800;color:#fff;letter-spacing:-.3px">NI<span style="color:#1D9E75">HMS</span></div>'+
        '<div style="width:8px;height:8px;border-radius:50%;background:#1D9E75;animation:nilive 2s infinite"></div>'+
        '<span style="color:#aaa;font-size:13px">Video session with <strong style="color:#fff">'+other+'</strong></span>'+
      '</div>'+
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+
        (when?'<span style="color:#888;font-size:11px">🕐 '+when.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+(session.queueToken?' &nbsp;🎫 '+session.queueToken:'')+'</span>':'')+
        '<button onclick="_dEndTeleCall(\''+session.appointmentId+'\')" style="padding:8px 16px;border-radius:8px;border:none;background:#dc2626;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px">'+
          '📵 End session'+
        '</button>'+
        '<button onclick="window.open(\''+session.roomUrl+'\',\'_blank\')" style="padding:8px 16px;border-radius:8px;border:1px solid #444;background:#2a2a2a;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">'+
          '↗ New tab'+
        '</button>'+
      '</div>'+
    '</div>'+
    /* Patient info strip */
    '<div style="display:flex;align-items:center;gap:12px;padding:8px 16px;background:#141414;flex-shrink:0;border-bottom:1px solid #333">'+
      '<span style="font-size:11px;color:#888">Patient:</span>'+
      '<span style="font-size:13px;font-weight:600;color:#fff">'+other+'</span>'+
      (session.scheduledAt?'<span style="font-size:11px;color:#888;margin-left:8px">Scheduled: '+new Date(session.scheduledAt).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'})+'</span>':'')+
      '<span style="font-size:11px;color:#888;margin-left:auto">Video powered by Jitsi Meet · NIHMS does not record this session by default</span>'+
    '</div>'+
    /* Jitsi iframe */
    '<iframe id="tele-jitsi-frame" src="'+session.iframeUrl+'" '+
      'allow="camera; microphone; fullscreen; speaker; display-capture; autoplay; clipboard-read; clipboard-write" '+
      'allowfullscreen></iframe>';
}

/* ── End call: close overlay, mark appointment completed ── */
window._dEndTeleCall = async function(appointmentId){
  var overlay = document.getElementById('tele-overlay');
  if(overlay){ overlay.style.display='none'; overlay.innerHTML=''; }
  if(window.UI && window.UI.showToast) UI.showToast('Session ended','ok');
  /* Optionally update status to completed */
  if(appointmentId){
    try{
      await API._fetchDirect('/appointments/'+appointmentId+'/status',{
        method:'PATCH',
        body:JSON.stringify({status:'completed'})
      });
    }catch(e){/* non-fatal */}
  }
  _dLoadTeleSessions();
};

/* ══════════════════════════════════════════════════════════════════
   MESSAGES
══════════════════════════════════════════════════════════════════ */
function _dMessages(){
  var msgs = _D.messages;
  var threads = [
    {role:'Nurse',       label:'Nurse Station',   icon:'🏥', color:'#0f766e', bg:'#f0fdfa'},
    {role:'Receptionist',label:'Reception',        icon:'🧑‍💼', color:C.blue,   bg:C.blueLt},
    {role:'Doctor',      label:'Colleagues',       icon:'👨‍⚕️', color:'#7c3aed', bg:'#f5f3ff'},
    {role:'Pharmacy',    label:'Pharmacy',          icon:'💊', color:'#c2410c', bg:'#fff7ed'},
  ];
  var activeThread = _D.msgThread||'Nurse';
  var threadMsgs = msgs.filter(function(m){return m.role===activeThread;});

  var threadList = threads.map(function(th){
    var unread = msgs.filter(function(m){return m.role===th.role&&m.unread;}).length;
    var active = activeThread===th.role;
    var tdOnclick = '_D.msgThread=\''+th.role+'\';_dRender()';
    return '<button onclick="'+tdOnclick+'" style="display:flex;align-items:center;gap:10px;width:100%;padding:11px 14px;border:none;border-bottom:1px solid '+C.border+';background:'+(active?th.bg:'#fff')+';cursor:pointer;text-align:left;font-family:inherit">'+
      '<span style="font-size:17px">'+th.icon+'</span>'+
      '<div style="flex:1"><div style="font-size:13px;font-weight:'+(active?'700':'500')+';color:'+C.text+'">'+th.label+'</div></div>'+
      (unread?'<span style="min-width:18px;height:18px;border-radius:9px;background:'+C.red+';color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 3px">'+unread+'</span>':'')+
    '</button>';
  }).join('');

  var msgBubbles = threadMsgs.length
    ? threadMsgs.map(function(m){
        var isDoctor = m.from==='Dr (You)';
        return '<div style="margin-bottom:12px;display:flex;flex-direction:column;align-items:'+(isDoctor?'flex-end':'flex-start')+'">'+
          '<div style="font-size:10px;color:'+C.muted+';margin-bottom:3px">'+(isDoctor?'You':m.from)+' · '+m.time+'</div>'+
          '<div style="max-width:70%;padding:10px 14px;border-radius:10px;font-size:13px;line-height:1.5;background:'+(isDoctor?C.blue:'#f1f5f9')+';color:'+(isDoctor?'#fff':C.text)+'">'+m.text+'</div>'+
          (m.unread&&!isDoctor?'<span style="font-size:10px;color:'+C.blue+';margin-top:2px">Unread</span>':'')+
        '</div>';
      }).join('')
    : '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:'+C.muted+';font-size:13px">No messages in this thread</div>';

  var activeT = threads.find(function(t){return t.role===activeThread;})||threads[0];
  return _dHeader('Messages',msgs.filter(function(m){return m.unread;}).length+' unread')+
    '<div style="flex:1;display:flex;min-height:0;overflow:hidden">'+
      '<div style="width:200px;flex-shrink:0;border-right:1px solid '+C.border+';overflow-y:auto;background:#fff">'+
        threadList+
      '</div>'+
      '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;background:#fff">'+
        '<div style="padding:10px 14px;border-bottom:1px solid '+C.border+';background:'+activeT.bg+';font-size:13px;font-weight:700;color:'+activeT.color+'">'+activeT.icon+' '+activeT.label+'</div>'+
        '<div style="flex:1;overflow-y:auto;padding:14px">'+msgBubbles+'</div>'+
        '<div style="padding:10px 14px;border-top:1px solid '+C.border+';display:flex;gap:8px">'+
          '<textarea id="doc-msg-compose" rows="2" placeholder="" style="flex:1;padding:8px 10px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;resize:none;outline:none"></textarea>'+
          _btn('Send','_dSendMsg()',C.blue)+
        '</div>'+
      '</div>'+
    '</div>';
}

/* ══════════════════════════════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════════════════════════════ */
function _dNotifications(){
  var notifs = _D.notifications;
  return _dHeader('Notifications','Alerts for lab results, appointments, referrals')+
    '<div style="flex:1;overflow:auto;padding:16px 20px">'+
      _card(notifs.map(function(n,i){
        return '<div style="display:flex;align-items:flex-start;gap:10px;padding:12px 0;border-bottom:1px solid #f8fafc;background:'+(n.read?'#fff':C.blueLt);+'" onclick="_D.notifications['+i+'].read=true;_dRender()">'+
          '<span style="font-size:18px;flex-shrink:0">'+n.icon+'</span>'+
          '<div style="flex:1"><div style="font-size:13px;font-weight:'+(n.read?'400':'700')+';color:'+C.text+'">'+n.text+'</div></div>'+
          '<div style="font-size:11px;color:'+C.muted+';flex-shrink:0">'+n.time+'</div>'+
          (!n.read?'<span style="width:8px;height:8px;border-radius:50%;background:'+C.blue+';flex-shrink:0;margin-top:4px"></span>':'')+
        '</div>';
      }).join(''),'padding:0')+
    '</div>';
}

/* ══════════════════════════════════════════════════════════════════
   MEDICAL CERTIFICATES
══════════════════════════════════════════════════════════════════ */
function _dMedCerts(){
  var today    = new Date().toISOString().slice(0,10);
  var todayFmt = new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});

  /* ── Patient data (from Patient 360 / consult / selectedPat) ── */
  var p     = _D.consultPat || _D.pat360Data || _D.selectedPat || {};
  var pName = p.fullName || ((p.firstName||'')+(p.lastName?' '+p.lastName:'')).trim() || p.name || '';
  var pId   = p.nationalId || p.id_number || p.idNumber || p.passport || p.mrn || p._id || '';
  var pDob  = p.dateOfBirth || p.date_of_birth || p.dob || '';
  /* normalise dob to YYYY-MM-DD for date input */
  if(pDob && pDob.length > 10) pDob = pDob.slice(0,10);
  var pAddr = (p.address && typeof p.address==='object')
    ? [p.address.street,p.address.suburb,p.address.city,p.address.province].filter(Boolean).join(', ')
    : (p.address||p.residential||p.residentialAddress||'');
  var pPhone = p.phone || p.contact || p.phoneNumber || p.contactNumber || p.mobile || p.cellphone || '';

  /* ── Doctor (logged-in user) ── */
  var u       = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  var docName = u.firstName||u.lastName
    ? 'Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim()
    : '';
  var docHpcsa    = u.hpcsa || u.hpcsaNumber || u.registrationNumber || u.regNo || '';
  var docPhone    = u.phone || u.workPhone || u.contact || '';
  var docFacility = u.facility || u.facilityName || u.practice || 'National Integrated Healthcare Management System';

  var certNo = 'NIHMS-CERT-'+(today.replace(/-/g,''))+'-'+(Math.floor(1000+Math.random()*9000));

  /* Register globals before DOM is injected */
  window._dIssueMedCert = function(){
    var gv=function(id){var e=document.getElementById(id);return e?e.value.trim():'';};
    var cert={certNo:certNo,issued:new Date().toISOString(),
      patient:{name:pName,id:pId,dob:pDob,address:pAddr,phone:pPhone},
      assessment:{examDate:gv('mc-exam-date'),onsetDate:gv('mc-illness-date'),practitioner:docName,facility:docFacility,diagnosis:gv('mc-diagnosis')},
      certification:{from:gv('mc-leave-from'),to:gv('mc-leave-to'),fitReturn:gv('mc-fit-return'),note:gv('mc-cert-note')},
      authorisation:{name:docName,hpcsa:docHpcsa,dateIssued:gv('mc-auth-date'),phone:docPhone}};
    if(!cert.patient.name||!cert.certification.from||!cert.certification.to){
      alert('Please select Absence From and Absence To dates before issuing.');return;
    }
    /* Validate: to date must not be before from date */
    if(cert.certification.from&&cert.certification.to&&cert.certification.to<cert.certification.from){
      alert('Absence To date cannot be before Absence From date.');return;
    }
    window._lastMedCert=cert;
    /* Persist to localStorage so patient portal can read it */
    var patStorageKey='nihms_med_certs_'+(p._id||p.id||pId||'unknown');
    try{
      var _existing=JSON.parse(localStorage.getItem(patStorageKey)||'[]');
      _existing.unshift(cert);
      localStorage.setItem(patStorageKey,JSON.stringify(_existing));
    }catch(_e){}
    var old=document.getElementById('mc-issue-banner');
    if(old)old.remove();
    var b=document.createElement('div');
    b.id='mc-issue-banner';
    b.style.cssText='position:fixed;bottom:16px;right:20px;background:#065f46;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;display:flex;align-items:center;gap:10px;box-shadow:0 4px 14px rgba(0,0,0,.25)';
    b.innerHTML='✓ Certificate '+certNo+' issued &nbsp;<button onclick="this.parentElement.remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:12px">×</button>';
    document.body.appendChild(b);
  };

  window._dPrintMedCert = function(){
    var doc=document.getElementById('mc-preview-doc');
    if(!doc){alert('Please complete the form first.');return;}
    var w=window.open('','_blank','width=720,height=960');
    w.document.write('<!DOCTYPE html><html><head><title>Medical Certificate - '+certNo+'</title>'+
      '<style>body{margin:30px;font-family:Georgia,serif;font-size:12.5px;color:#1e293b}@media print{body{margin:15mm}}</style>'+
      '</head><body>'+doc.outerHTML+'<script>window.onload=function(){window.print();}<\/script></body></html>');
    w.document.close();
  };

  window._mcSigClear=function(){
    var c=document.getElementById('mc-sig-canvas');
    if(c)c.getContext('2d').clearRect(0,0,c.width,c.height);
  };

  /* ── Shared field helpers (match prescription style) ── */
  function _mcCard(c){ return '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px">'+c+'</div>'; }
  function _mcTitle(t){ return '<div style="font-size:15px;font-weight:800;color:'+C.text+';margin-bottom:16px">'+t+'</div>'; }
  function _mcInfo(label,value,mono){
    return '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C.muted+';margin-bottom:4px">'+label+'</div>'+
      '<div style="font-size:14px;font-weight:700;color:'+C.text+';'+(mono?'font-family:monospace':'')+'">'+value+'</div></div>';
  }
  function _mcLabel(t,req){ return '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:6px">'+t+(req?' <span style="color:'+C.red+'">*</span>':'')+'</div>'; }
  function _mcFld(){ return 'width:100%;padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;color:'+C.text+';background:#fff;box-sizing:border-box;outline:none'; }
  function _mcDateFld(id,label,val,allowPast,req){
    var minAttr = allowPast ? '' : ' min="'+today+'"';
    return '<div>'+_mcLabel(label,req)+'<input id="'+id+'" type="date" value="'+(val||'')+'"'+minAttr+' style="'+_mcFld()+'"></div>';
  }
  function _mcTa(id,label,rows,req){
    return '<div>'+_mcLabel(label,req)+'<textarea id="'+id+'" rows="'+(rows||3)+'" style="'+_mcFld()+';resize:vertical"></textarea></div>';
  }

  /* ── Sidebar ── */
  var mcSidebar =
    '<div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">'+
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Issuing Practitioner</div>'+
        '<div style="display:flex;flex-direction:column;gap:12px">'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Practitioner</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+docName+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">HPCSA Reg. No.</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+(docHpcsa?C.text:C.muted)+';font-family:monospace">'+(docHpcsa||'Not on record')+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Facility</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+docFacility+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Date</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+todayFmt+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Certificate No.</div>'+
            '<div style="font-size:12px;font-weight:700;color:'+C.text+';font-family:monospace">'+certNo+'</div></div>'+
        '</div>'+
        '<div style="margin-top:14px;padding:8px 10px;background:#f8fafc;border-radius:7px;font-size:10px;color:'+C.muted+';line-height:1.5">Affix practice stamp on the printed certificate.</div>'+
      '</div>'+
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Clinical Workflow</div>'+
        ['Consultation','Diagnosis','Lab Orders','Radiology','Prescription','Referral','Follow-Up','Next Appointment'].map(function(step){
          var active = false;
          var done   = ['Consultation','Diagnosis'].indexOf(step)>-1;
          return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;font-weight:'+(active?700:500)+';color:'+(active?C.teal:done?C.green:C.muted)+'">'+
            '<span style="font-size:10px">'+(done?'✓':'○')+'</span>'+step+'</div>';
        }).join('')+
      '</div>'+
    '</div>';

  /* ── Main form cards HTML ── */
  var mcDobFmt = pDob ? new Date(pDob+'T00:00:00').toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}) : '—';

  var mcHtml =
    _dHeader('Medical Certificate', '')+
    '<div style="flex:1;overflow:auto;display:flex;gap:16px;padding:16px 20px 24px;box-sizing:border-box;align-items:flex-start">'+

      /* ── Main column ── */
      '<div id="mc-form-col" style="flex:1;min-width:0;display:flex;flex-direction:column;gap:14px">'+

        /* Patient Information */
        _mcCard(
          _mcTitle('Patient Information')+
          '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">'+
            _mcInfo('Patient Name',    pName||'—')+
            _mcInfo('ID / Passport',   pId||'—', true)+
            _mcInfo('Date of Birth',   mcDobFmt)+
            _mcInfo('Certificate Date',todayFmt)+
          '</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">'+
            _mcInfo('Residential Address', pAddr||'—')+
            _mcInfo('Contact Number', pPhone||'—')+
          '</div>'
        )+

        /* Medical Assessment */
        _mcCard(
          _mcTitle('Medical Assessment')+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">'+
            _mcDateFld('mc-exam-date','Date Examined',today,true,true)+
            _mcDateFld('mc-illness-date','Date of Onset of Illness','',true,false)+
          '</div>'+
          _mcTa('mc-diagnosis','Diagnosis (confidential — internal use only, does not appear on certificate)',2,false)
        )+

        /* Certification */
        _mcCard(
          _mcTitle('Certification')+
          '<div style="font-size:12px;color:'+C.muted+';margin-bottom:12px">Select the dates the patient is certified unfit for work / school.</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px">'+
            _mcDateFld('mc-leave-from','Absence From',today,false,true)+
            _mcDateFld('mc-leave-to','Absence To (inclusive)',today,false,true)+
            _mcDateFld('mc-fit-return','Date Fit to Return',today,false,false)+
          '</div>'+
          _mcTa('mc-cert-note','Additional Remarks (optional — appears on patient copy)',2,false)
        )+

        /* Practitioner Authorisation */
        _mcCard(
          _mcTitle('Practitioner Authorisation')+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">'+
            _mcDateFld('mc-auth-date','Date Issued',today,true,true)+
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:6px">Practice Contact No.</div>'+
              '<div style="font-size:14px;font-weight:700;color:'+(docPhone?C.text:C.muted)+'">'+(docPhone||'Not on record')+'</div></div>'+
          '</div>'+
          '<div style="border:1.5px dashed '+C.border+';border-radius:8px;padding:14px;text-align:center;background:#fafafa">'+
            '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:8px">Practitioner Signature</div>'+
            '<canvas id="mc-sig-canvas" width="340" height="72" style="border:1.5px solid #cbd5e1;border-radius:6px;background:#fff;cursor:crosshair;display:block;margin:0 auto;touch-action:none"></canvas>'+
            '<button onclick="_mcSigClear()" style="margin-top:6px;font-size:11px;color:'+C.muted+';background:none;border:none;cursor:pointer;text-decoration:underline;font-family:inherit">Clear signature</button>'+
          '</div>'
        )+

        /* Actions */
        '<div style="display:flex;gap:10px;margin-top:4px;margin-bottom:8px">'+
          '<button onclick="_dIssueMedCert()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'+
            'Issue Certificate'+
          '</button>'+
          '<button onclick="_dPrintMedCert()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">Print / Download</button>'+
          '<button onclick="_D.view=\'dashboard\';_dRender()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">Cancel</button>'+
        '</div>'+

      '</div>'+

      /* ── Sidebar ── */
      mcSidebar+

    '</div>';

  /* Wire up interactivity after DOM renders */
  setTimeout(function(){
    /* Enforce: leave-to min must follow leave-from */
    var fromEl=document.getElementById('mc-leave-from');
    var toEl=document.getElementById('mc-leave-to');
    var retEl=document.getElementById('mc-fit-return');
    if(fromEl&&toEl){
      fromEl.addEventListener('change',function(){
        if(fromEl.value){
          toEl.min=fromEl.value;
          if(toEl.value&&toEl.value<fromEl.value)toEl.value=fromEl.value;
          if(retEl){retEl.min=fromEl.value;if(retEl.value&&retEl.value<fromEl.value)retEl.value=fromEl.value;}
        }
      });
    }
    if(toEl&&retEl){
      toEl.addEventListener('change',function(){
        if(toEl.value){
          retEl.min=toEl.value;
          if(retEl.value&&retEl.value<toEl.value)retEl.value=toEl.value;
        }
      });
    }
    /* Signature canvas */
    var canvas=document.getElementById('mc-sig-canvas');
    if(canvas){
      var ctx=canvas.getContext('2d'),drawing=false,lx=0,ly=0;
      function pos(e){var r=canvas.getBoundingClientRect();
        return{x:(e.touches?e.touches[0].clientX:e.clientX)-r.left,y:(e.touches?e.touches[0].clientY:e.clientY)-r.top};}
      canvas.addEventListener('mousedown',function(e){drawing=true;var p=pos(e);lx=p.x;ly=p.y;});
      canvas.addEventListener('touchstart',function(e){e.preventDefault();drawing=true;var p=pos(e);lx=p.x;ly=p.y;},{passive:false});
      canvas.addEventListener('mouseup',function(){drawing=false;});
      canvas.addEventListener('touchend',function(){drawing=false;});
      canvas.addEventListener('mouseleave',function(){drawing=false;});
      function draw(e){
        if(!drawing)return;
        var pt=pos(e);
        ctx.beginPath();ctx.strokeStyle='#1e293b';ctx.lineWidth=1.5;ctx.lineCap='round';
        ctx.moveTo(lx,ly);ctx.lineTo(pt.x,pt.y);ctx.stroke();lx=pt.x;ly=pt.y;
      }
      canvas.addEventListener('mousemove',draw);
      canvas.addEventListener('touchmove',function(e){e.preventDefault();draw(e);},{passive:false});
    }
  },0);

  return mcHtml;
}

/* ══════════════════════════════════════════════════════════════════
   CERT REGISTRY — all issued medical certificates (doctor view)
══════════════════════════════════════════════════════════════════ */
function _dAllCerts(){
  /* Collect all nihms_med_certs_* keys from localStorage */
  var allCerts = [];
  try {
    for(var i=0;i<localStorage.length;i++){
      var k=localStorage.key(i);
      if(k&&k.indexOf('nihms_med_certs_')===0){
        var arr=JSON.parse(localStorage.getItem(k)||'[]');
        allCerts = allCerts.concat(arr);
      }
    }
    /* Sort newest first */
    allCerts.sort(function(a,b){
      var da=a.issued?new Date(a.issued).getTime():0;
      var db=b.issued?new Date(b.issued).getTime():0;
      return db-da;
    });
  }catch(_e){}

  /* ── Filter state (held on window so re-render doesn't reset) ── */
  window._dCertFilter = window._dCertFilter || '';
  var flt = (window._dCertFilter||'').toLowerCase();
  var visible = flt
    ? allCerts.filter(function(c){
        var name = ((c.patient&&c.patient.name)||'').toLowerCase();
        var no   = (c.certNo||'').toLowerCase();
        return name.indexOf(flt)>=0 || no.indexOf(flt)>=0;
      })
    : allCerts;

  /* ── KPI strip ── */
  var today = new Date().toISOString().slice(0,10);
  var todayCount  = allCerts.filter(function(c){return c.issued&&c.issued.slice(0,10)===today;}).length;
  var monthStart  = today.slice(0,7)+'-01';
  var monthCount  = allCerts.filter(function(c){return c.issued&&c.issued.slice(0,10)>=monthStart;}).length;

  var kpiHtml =
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px">'+
      _card('<div style="display:flex;align-items:center;gap:12px">'+
        '<div style="font-size:26px">📋</div>'+
        '<div><div style="font-size:28px;font-weight:800;color:'+C.text+';line-height:1">'+allCerts.length+'</div>'+
        '<div style="font-size:12px;color:'+C.muted+'">Total issued</div></div></div>')+
      _card('<div style="display:flex;align-items:center;gap:12px">'+
        '<div style="font-size:26px">📅</div>'+
        '<div><div style="font-size:28px;font-weight:800;color:#065f46;line-height:1">'+todayCount+'</div>'+
        '<div style="font-size:12px;color:'+C.muted+'">Issued today</div></div></div>')+
      _card('<div style="display:flex;align-items:center;gap:12px">'+
        '<div style="font-size:26px">🗓️</div>'+
        '<div><div style="font-size:28px;font-weight:800;color:'+C.blue+';line-height:1">'+monthCount+'</div>'+
        '<div style="font-size:12px;color:'+C.muted+'">This month</div></div></div>')+
    '</div>';

  /* ── Search bar ── */
  var searchHtml =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">'+
      '<div style="flex:1;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid '+C.border+';border-radius:8px;padding:8px 12px">'+
        '<span style="color:'+C.muted+'">🔍</span>'+
        '<input id="cert-reg-search" type="text" placeholder="" value="'+(window._dCertFilter||'')+'" '+
          'oninput="window._dCertFilter=this.value;if(typeof _dRender===\'function\')_dRender()" '+
          'style="border:none;outline:none;flex:1;font-size:13px;background:transparent;font-family:inherit;color:'+C.text+'">'+
      '</div>'+
      '<button onclick="window._dCertFilter=\'\';if(typeof _dRender===\'function\')_dRender()" '+
        'style="padding:8px 14px;border:1px solid '+C.border+';border-radius:8px;background:#fff;font-size:12px;color:'+C.muted+';cursor:pointer;font-family:inherit">Clear</button>'+
      '<button onclick="_setView(\'med_certs\')" '+
        'style="padding:8px 14px;border:none;border-radius:8px;background:#065f46;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">+ Issue New</button>'+
    '</div>';

  /* ── Table ── */
  var tableHtml;
  if(!visible.length){
    tableHtml =
      '<div style="text-align:center;padding:56px 24px;background:#fff;border-radius:12px;border:1px solid '+C.border+'">'+
        '<div style="font-size:40px;margin-bottom:12px;opacity:.3">📋</div>'+
        '<div style="font-weight:700;font-size:15px;color:'+C.text+';margin-bottom:6px">'+
          (allCerts.length ? 'No results for "'+window._dCertFilter+'"' : 'No certificates issued yet')+
        '</div>'+
        '<div style="font-size:13px;color:'+C.muted+'">'+
          (allCerts.length ? 'Try a different name or certificate number.' : 'Certificates issued from Patient 360 will appear here.')+
        '</div>'+
      '</div>';
  } else {
    var rowsHtml = visible.map(function(c,i){
      var issued   = c.issued ? new Date(c.issued).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}) : '—';
      var issuedTime = c.issued ? new Date(c.issued).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}) : '';
      var pName    = (c.patient&&c.patient.name)  || '—';
      var pId      = (c.patient&&c.patient.id)    || '—';
      var fromDate = (c.certification&&c.certification.from) || '—';
      var toDate   = (c.certification&&c.certification.to)   || '—';
      var diagnosis= (c.assessment&&c.assessment.diagnosis)  || '—';
      var certNo   = c.certNo || '—';
      var isToday  = c.issued && c.issued.slice(0,10)===today;
      var bg       = i%2===0 ? '#fff' : '#f8fafc';
      return (
        '<tr style="background:'+bg+'">' +
          '<td style="padding:11px 14px;font-size:11px;font-family:monospace;color:'+C.blue+';font-weight:700;white-space:nowrap">'+certNo+'</td>'+
          '<td style="padding:11px 14px">'+
            '<div style="font-size:13px;font-weight:600;color:'+C.text+'">'+pName+'</div>'+
            '<div style="font-size:11px;color:'+C.muted+'">ID: '+pId+'</div>'+
          '</td>'+
          '<td style="padding:11px 14px">'+
            '<div style="font-size:13px;font-weight:600;color:'+C.text+'">'+issued+'</div>'+
            (issuedTime?'<div style="font-size:11px;color:'+C.muted+'">'+issuedTime+'</div>':'')+
            (isToday?'<span style="display:inline-block;margin-top:3px;padding:1px 7px;border-radius:10px;background:#ECFDF5;color:#065f46;font-size:10px;font-weight:700">Today</span>':'')+
          '</td>'+
          '<td style="padding:11px 14px;font-size:13px;color:'+C.text+'">'+fromDate+'</td>'+
          '<td style="padding:11px 14px;font-size:13px;color:'+C.text+'">'+toDate+'</td>'+
          '<td style="padding:11px 14px;font-size:12px;color:'+C.muted+';max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+diagnosis+'</td>'+
          '<td style="padding:11px 14px">'+
            '<button onclick="_dDocPrintCert('+i+')" style="padding:5px 12px;border:none;border-radius:6px;background:#065f46;color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">🖨 Print</button>'+
          '</td>'+
        '</tr>'
      );
    }).join('');

    tableHtml =
      '<div style="background:#fff;border-radius:12px;border:1px solid '+C.border+';overflow:hidden">'+
        '<table style="width:100%;border-collapse:collapse">'+
          '<thead>'+
            '<tr style="background:#f8fafc">'+
              '<th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:'+C.muted+';text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid '+C.border+'">Cert No.</th>'+
              '<th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:'+C.muted+';text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid '+C.border+'">Patient</th>'+
              '<th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:'+C.muted+';text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid '+C.border+'">Date Issued</th>'+
              '<th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:'+C.muted+';text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid '+C.border+'">Absent From</th>'+
              '<th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:'+C.muted+';text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid '+C.border+'">Absent To</th>'+
              '<th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:'+C.muted+';text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid '+C.border+'">Diagnosis</th>'+
              '<th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:'+C.muted+';text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid '+C.border+'"></th>'+
            '</tr>'+
          '</thead>'+
          '<tbody>'+rowsHtml+'</tbody>'+
        '</table>'+
        '<div style="padding:10px 14px;font-size:11px;color:'+C.muted+';border-top:1px solid '+C.border+'">'+
          visible.length+' certificate'+(visible.length!==1?'s':'')+' shown'+
          (flt?' (filtered from '+allCerts.length+' total)':'')+
        '</div>'+
      '</div>';
  }

  /* Store visible list for print handler */
  window._dAllCertsVisible = visible;

  return _dHeader('Certificate Registry',
    'All medical certificates issued by '+(function(){var u=(window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};return u.firstName||u.lastName?'Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim():'this practice';})())+
    '<div style="flex:1;overflow:auto;padding:16px 20px">'+
      kpiHtml+
      searchHtml+
      tableHtml+
    '</div>';
}

window._dDocPrintCert = function(idx){
  var certs = window._dAllCertsVisible || [];
  var c = certs[idx];
  if(!c) return;
  var certNo   = c.certNo||('NIHMS-CERT-'+(idx+1));
  var issued   = c.issued?new Date(c.issued).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}):(c.authorisation&&c.authorisation.dateIssued)||'';
  var pName    = (c.patient&&c.patient.name)||'';
  var pId      = (c.patient&&c.patient.id)||'';
  var pDob     = (c.patient&&c.patient.dob)||'';
  var pAddr    = (c.patient&&c.patient.address)||'';
  var pPhone   = (c.patient&&c.patient.phone)||'';
  var examDate = (c.assessment&&c.assessment.examDate)||'';
  var onset    = (c.assessment&&c.assessment.onsetDate)||'';
  var diag     = (c.assessment&&c.assessment.diagnosis)||'';
  var facility = (c.assessment&&c.assessment.facility)||'';
  var fromDate = (c.certification&&c.certification.from)||'';
  var toDate   = (c.certification&&c.certification.to)||'';
  var fitRet   = (c.certification&&c.certification.fitReturn)||'';
  var certNote = (c.certification&&c.certification.note)||'';
  var docName  = (c.authorisation&&c.authorisation.name)||'';
  var hpcsa    = (c.authorisation&&c.authorisation.hpcsa)||'';
  var docPhone = (c.authorisation&&c.authorisation.phone)||'';

  var html='<!DOCTYPE html><html><head><title>Medical Certificate '+certNo+'</title>'+
    '<style>body{margin:30px;font-family:Georgia,serif;font-size:12.5px;color:#1e293b;line-height:1.5}'+
    'h1{font-size:18px;text-align:center;margin:0 0 4px}.sub{text-align:center;color:#64748b;font-size:11px;margin-bottom:20px}'+
    '.cert-no{text-align:center;font-size:11px;color:#64748b;margin-bottom:24px;font-family:monospace}'+
    'table{width:100%;border-collapse:collapse;margin-bottom:16px}td{padding:7px 10px;border:1px solid #cbd5e1;vertical-align:top}'+
    'td:first-child{font-weight:600;width:38%;background:#f8fafc}h3{font-size:12.5px;font-weight:700;border-bottom:1px solid #cbd5e1;padding-bottom:4px;margin:18px 0 6px}'+
    '.sig-line{border-top:1px solid #333;width:220px;margin:40px 0 4px}@media print{body{margin:15mm}}</style></head><body>'+
    '<h1>NIHMS Medical Certificate</h1>'+
    '<div class="sub">National Integrated Healthcare Management System</div>'+
    '<div class="sub">Medical Certificate for Absence from Work</div>'+
    '<div class="cert-no">Certificate No: '+certNo+' &nbsp;|&nbsp; Issued: '+issued+'</div>'+
    '<h3>Section 1 — Patient Information</h3>'+
    '<table><tr><td>Full Name</td><td>'+pName+'</td></tr>'+
    '<tr><td>ID / Passport</td><td>'+pId+'</td></tr>'+
    '<tr><td>Date of Birth</td><td>'+pDob+'</td></tr>'+
    '<tr><td>Residential Address</td><td>'+pAddr+'</td></tr>'+
    '<tr><td>Contact Number</td><td>'+pPhone+'</td></tr></table>'+
    '<h3>Section 2 — Clinical Assessment</h3>'+
    '<table><tr><td>Date Examined</td><td>'+examDate+'</td></tr>'+
    '<tr><td>Date of Onset</td><td>'+onset+'</td></tr>'+
    '<tr><td>Attending Practitioner</td><td>'+docName+'</td></tr>'+
    '<tr><td>Health Facility</td><td>'+facility+'</td></tr>'+
    '<tr><td>Diagnosis / Condition</td><td>'+diag+'</td></tr></table>'+
    '<h3>Section 3 — Certification of Absence</h3>'+
    '<table><tr><td>Absent From</td><td>'+fromDate+'</td></tr>'+
    '<tr><td>Absent To (inclusive)</td><td>'+toDate+'</td></tr>'+
    '<tr><td>Fit to Return</td><td>'+fitRet+'</td></tr>'+
    '<tr><td>Additional Notes</td><td>'+certNote+'</td></tr></table>'+
    '<h3>Section 4 — Authorisation</h3>'+
    '<table><tr><td>Practitioner Name</td><td>'+docName+'</td></tr>'+
    '<tr><td>HPCSA Registration No.</td><td>'+hpcsa+'</td></tr>'+
    '<tr><td>Practice Contact No.</td><td>'+docPhone+'</td></tr>'+
    '<tr><td>Date Issued</td><td>'+issued+'</td></tr></table>'+
    '<div style="margin-top:32px"><div class="sig-line"></div><div style="font-size:11px;color:#64748b">Authorised Signature</div></div>'+
    '<script>window.onload=function(){window.print();}<\/script>'+
  '</body></html>';

  var w=window.open('','_blank','width=720,height=960');
  w.document.write(html);
  w.document.close();
};

function _dTasks(){
  var tasks = _D.tasks;
  return _dHeader('Clinical Tasks','Pending lab reviews, referrals, prescriptions and actions')+
    '<div style="flex:1;overflow:auto;padding:16px 20px">'+
      _card(tasks.map(function(t,i){
        var icon  = {critical:'🔴',warn:'🟠',info:'🟡',ok:'🟢'}[t.type]||'⚪';
        var bgRow = t.done?'#f8fafc':(i%2===0?'#fff':'#fafafa');
        return '<div style="display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid #f8fafc;background:'+bgRow+';opacity:'+(t.done?.5:1)+'">'+
          '<span style="font-size:16px">'+icon+'</span>'+
          '<div style="flex:1">'+
            '<div style="font-size:13px;font-weight:'+(t.done?'400':'700')+';color:'+C.text+';text-decoration:'+(t.done?'line-through':'none')+'">'+t.label+'</div>'+
            '<div style="font-size:11px;color:'+C.muted+'">Patient: '+t.patient+'</div>'+
          '</div>'+
          (!t.done?_btn('Mark done','_dTaskDone(\''+t.id+'\')',C.green):'<span style="font-size:11px;color:'+C.green+'">✓ Done</span>')+
        '</div>';
      }).join(''),'padding:0')+
    '</div>';
}

/* ══════════════════════════════════════════════════════════════════
   ACTION HANDLERS
══════════════════════════════════════════════════════════════════ */
window._dSetPat360 = function(name) {
  /* Open Patient 360 with a name-based match from today's queue */
  var p = (window._DOCTOR_QUEUE||[]).find(function(x){return x.name===name;});
  if (p) { _D.pat360Data=p; _D.p360Tab='overview'; _D.view='pat360'; }
  else {
    _D.pat360Data = { firstName:name.split(' ')[0], lastName:name.split(' ').slice(1).join(' '), name:name, vitals:{}, conditions:[], allergies:[], medications:[] };
    _D.p360Tab='overview'; _D.view='pat360';
  }
  if (typeof _dRender==='function') _dRender();
};

window._dSetPat360API = async function(id) {
  _D.view='pat360'; _D.p360Tab='overview'; _D.pat360Data=null;
  if (typeof _dRender==='function') _dRender();
  try {
    var res = await API.patients.get(id);
    _D.pat360Data = res.data || res;
    if (typeof _dRender==='function') _dRender();
  } catch(e) {
    _D.pat360Data = { firstName:'Patient', lastName:'', id:id, vitals:{}, conditions:[], allergies:[], medications:[] };
    if (typeof _dRender==='function') _dRender();
  }
};

window._dStartConsult = function(patId) {
  var p = (window._DOCTOR_QUEUE||[]).find(function(x){return x.id===patId;});
  _D.consultPatId = patId;
  _D.consultPat   = p || null;
  _D.view = 'consult';
  _dRender();
};

window._dSelectConsultPat = function(id) {
  var p = (window._DOCTOR_QUEUE||[]).find(function(x){return x.id===id;})
       || (_D._consultPats && _D._consultPats[id]);
  if (p) { _D.consultPatId=id; _D.consultPat=p; _dRender(); }
};

window._dStartConsult360 = function() {
  var src = _D.pat360Data;
  if (!src) return;
  /* Normalise to the shape _dConsult() expects (queue-style fields) */
  var fullName = src.fullName
    || ((src.firstName||'')+(src.lastName?' '+src.lastName:'')).trim()
    || src.name || 'Unknown';
  var dob = src.dateOfBirth||src.date_of_birth||src.dob||'';
  var age = src.age;
  if (!age && dob) {
    var diff = Date.now() - new Date(dob).getTime();
    age = Math.floor(diff / (365.25*24*3600*1000));
  }
  var norm = Object.assign({}, src, {
    name:  fullName,
    id:    src.nationalId||src.idNumber||src.id_number||src.mrn||src._id||src.id||'',
    age:   age||'',
    sex:   src.sex||src.gender||'',
    phone: src.phone||src.contact||src.phoneNumber||src.contactNumber||src.mobile||'',
    address: src.address||src.residentialAddress||src.residential||''
  });
  _D.consultPat    = norm;
  _D.consultPatId  = norm._id||norm.id||null;
  _D.selectedPat   = norm;
  _D.view          = 'consult';
  _dRender();
};

window._dNewConsult = function() {
  _D.consultPat=null; _D.consultPatId=null; _D.view='consult'; _dRender();
};

window._dSaveConsult = async function() {
  var data = {
    patient:     _D.consultPatId || (_D.consultPat&&(_D.consultPat.pid||_D.consultPat.id)) || '',
    visitType:   (document.getElementById('cs-type')||{value:'Consultation'}).value,
    complaints:  (document.getElementById('cs-complaints')||{value:''}).value,
    examination: (document.getElementById('cs-examination')||{value:''}).value,
    diagnosis:   (document.getElementById('cs-diagnosis')||{value:''}).value,
    treatment:   (document.getElementById('cs-treatment')||{value:''}).value,
    notes:       (document.getElementById('cs-notes')||{value:''}).value,
    consultedAt: new Date().toISOString(),
  };
  if (!data.complaints) { UI.showToast('Please enter at least the chief complaints','err'); return; }
  try {
    await API._fetchDirect('/consultations',{method:'POST',body:JSON.stringify(data)}).catch(function(){});
  } catch(_){}
  /* Mark patient as done in doctor queue */
  if (_D.consultPatId) {
    var p = (window._DOCTOR_QUEUE||[]).find(function(x){return x.id===_D.consultPatId;});
    if (p) p.status='done';
  }
  _dTaskDone('T4');
  UI.showToast('Consultation saved','ok');
  _D.consultPat=null; _D.consultPatId=null;
  _D.view='dashboard'; _dRender();
};

window._dSaveRx = async function() {
  /* Collect all medication blocks */
  var medications = [];
  var medBlocks = document.querySelectorAll('[id^="rx-med-block-"]');
  medBlocks.forEach(function(block){
    var n = block.id.replace('rx-med-block-','');
    var name  = (document.getElementById('rx-med-name-'+n)||{value:''}).value.trim();
    var str   = (document.getElementById('rx-med-str-'+n)||{value:''}).value.trim();
    var dose  = (document.getElementById('rx-med-dose-'+n)||{value:''}).value.trim();
    var route = (document.getElementById('rx-med-route-'+n)||{value:''}).value;
    var freq  = (document.getElementById('rx-med-freq-'+n)||{value:''}).value;
    var dur   = (document.getElementById('rx-med-dur-'+n)||{value:''}).value.trim();
    var qty   = (document.getElementById('rx-med-qty-'+n)||{value:''}).value.trim();
    var unit  = (document.getElementById('rx-med-unit-'+n)||{value:''}).value;
    var notes = (document.getElementById('rx-med-notes-'+n)||{value:''}).value.trim();
    if(name) medications.push({name:name,strength:str,dose:dose,route:route,frequency:freq,duration:dur,quantity:qty,unit:unit,specialInstructions:notes});
  });
  if(!medications.length){ UI.showToast('Add at least one medication','err'); return; }
  if(!medications[0].name){ UI.showToast('Medicine name is required','err'); return; }

  var u        = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  var pat      = _D.consultPat || _D.selectedPat || {};
  var patName  = ((pat.firstName||pat.name||'')+' '+(pat.lastName||'')).trim() || 'Unknown patient';
  var docName  = u.firstName ? ('Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim()) : 'Doctor';
  var repeatEl   = document.querySelector('input[name="rx-repeat"]:checked');
  var isRepeat   = repeatEl ? repeatEl.value==='yes' : false;
  var repAllowed = isRepeat ? (parseInt((document.getElementById('rx-rep-allowed')||{value:'0'}).value,10)||0) : 0;
  var repUsed    = isRepeat ? (parseInt((document.getElementById('rx-rep-used')||{value:'0'}).value,10)||0)    : 0;
  var repRem     = isRepeat ? Math.max(0, repAllowed - repUsed) : 0;
  var reviewDate = isRepeat ? ((document.getElementById('rx-review-date')||{value:''}).value||undefined)       : undefined;
  var expiryDate = isRepeat ? ((document.getElementById('rx-expiry-date')||{value:''}).value||undefined)       : undefined;

  var rxData = {
    patient:             pat._id||pat.id||'',
    patientName:         patName,
    medications:         medications,
    patientInstructions: (document.getElementById('rx-patient-instr')||{value:''}).value.trim(),
    dispensingPharmacy:  (document.getElementById('rx-pharmacy')||{value:''}).value,
    clinicalNotes:       (document.getElementById('rx-clinical-notes')||{value:''}).value.trim(),
    repeatPrescription:  isRepeat,
    repeat: isRepeat ? {
      allowed:    repAllowed,
      used:       repUsed,
      remaining:  repRem,
      reviewDate: reviewDate,
      expiryDate: expiryDate,
    } : undefined,
    prescribedBy:        u._id||u.id||'',
    prescribedByName:    docName,
    facility:            u.facility||(u.primaryFacility&&u.primaryFacility.name)||'',
    prescribedAt:        new Date().toISOString(),
  };

  var rxId = null;
  try {
    var rxRes = await API._fetchDirect('/prescriptions',{method:'POST',body:JSON.stringify(rxData)});
    rxId = rxRes && rxRes.data && (rxRes.data._id||rxRes.data.id);
  } catch(_){}

  /* ── Notify pharmacy ── */
  var medSummary = medications.map(function(m){ return m.name+(m.strength?' '+m.strength:''); }).join(', ');
  var notifPayload = {
    targetRole:  'pharmacist',
    type:        'prescription',
    priority:    'high',
    title:       'New prescription requires dispensing',
    message:     docName+' has submitted a prescription for '+patName+'. Medications: '+medSummary+'.',
    patient:     pat._id||pat.id||'',
    patientName: patName,
    prescriptionId: rxId||'',
    issuedBy:    u._id||u.id||'',
    issuedByName:docName,
    issuedAt:    new Date().toISOString(),
  };
  try {
    await API._fetchDirect('/notifications',{method:'POST',body:JSON.stringify(notifPayload)}).catch(function(){});
  } catch(_){}

  UI.showToast('Prescription submitted — pharmacy notified','ok');
  window._rxMedCount = 1;
};

window._dSubmitLab = async function() {
  var selected = Array.from(document.querySelectorAll('[data-lab-selected]')).map(function(b){return b.getAttribute('data-lab-selected');});
  var patient  = (document.getElementById('lab-patient')||{value:''}).value;
  var urgency  = (document.getElementById('lab-urgency')||{value:'Routine'}).value;
  var clinical = (document.getElementById('lab-clinical')||{value:''}).value;
  if (!selected.length) { UI.showToast('Select at least one test','err'); return; }
  if (!patient) { UI.showToast('Patient name/ID required','err'); return; }
  try {
    await API._fetchDirect('/labs',{method:'POST',body:JSON.stringify({patient,tests:selected,urgency,clinicalIndication:clinical,orderedAt:new Date().toISOString()})}).catch(function(){});
  } catch(_){}
  UI.showToast('Lab order submitted for: '+selected.join(', '),'ok');
};

window._dToggleTest = function(btn, name) {
  var isOn = btn.getAttribute('data-lab-selected');
  if (isOn) {
    btn.removeAttribute('data-lab-selected');
    btn.style.background='#fff'; btn.style.borderColor=C.border; btn.style.color=C.text;
  } else {
    btn.setAttribute('data-lab-selected', name);
    btn.style.background=C.blueLt; btn.style.borderColor=C.blue; btn.style.color=C.blue; btn.style.fontWeight='700';
  }
  var selected = Array.from(document.querySelectorAll('[data-lab-selected]')).map(function(b){return b.getAttribute('data-lab-selected');});
  var el = document.getElementById('lab-selected');
  if (el) el.innerHTML = selected.length
    ? selected.map(function(s){return '<span style="padding:2px 8px;border-radius:20px;background:'+C.blueLt+';border:1px solid '+C.blueBd+';color:'+C.blue+';font-size:11px;font-weight:600;display:inline-block;margin:2px">'+s+'</span>';}).join('')
    : 'No tests selected yet.';
};

window._dSubmitRadiology = async function() {
  var data = {
    patient:  (document.getElementById('rad-patient')||{value:''}).value,
    type:     (document.getElementById('rad-type')||{value:'X-Ray'}).value,
    region:   (document.getElementById('rad-region')||{value:'Chest'}).value,
    indication:(document.getElementById('rad-indication')||{value:''}).value,
    urgent:   (document.getElementById('rad-urgent')||{checked:false}).checked,
    orderedAt:new Date().toISOString(),
  };
  if (!data.patient) { UI.showToast('Patient required','err'); return; }
  try { await API._fetchDirect('/radiology',{method:'POST',body:JSON.stringify(data)}).catch(function(){}); } catch(_){}
  UI.showToast((data.urgent?'URGENT ':'')+data.type+' request submitted','ok');
};

window._dSubmitReferral = async function() {
  var data = {
    patient:   (document.getElementById('ref-patient')||{value:''}).value,
    specialty: (document.getElementById('ref-specialty')||{value:''}).value,
    urgency:   (document.getElementById('ref-urgency')||{value:'Routine'}).value,
    reason:    (document.getElementById('ref-reason')||{value:''}).value,
    preferred: (document.getElementById('ref-preferred')||{value:''}).value,
    referredAt:new Date().toISOString(),
  };
  if (!data.patient||!data.reason) { UI.showToast('Patient and reason are required','err'); return; }
  try { await API._fetchDirect('/referrals',{method:'POST',body:JSON.stringify(data)}).catch(function(){}); } catch(_){}
  UI.showToast('Referral to '+data.specialty+' submitted','ok');
};

window._dSaveNote = async function() {
  var data = {
    patient:    (document.getElementById('mn-patient')||{value:''}).value,
    type:       (document.getElementById('mn-type')||{value:'Progress Note'}).value,
    date:       (document.getElementById('mn-date')||{value:new Date().toISOString().slice(0,10)}).value,
    subjective: (document.getElementById('mn-subjective')||{value:''}).value,
    objective:  (document.getElementById('mn-objective')||{value:''}).value,
    assessment: (document.getElementById('mn-assessment')||{value:''}).value,
    plan:       (document.getElementById('mn-plan')||{value:''}).value,
    createdAt:  new Date().toISOString(),
  };
  if (!data.patient) { UI.showToast('Patient required','err'); return; }
  try { await API._fetchDirect('/notes',{method:'POST',body:JSON.stringify(data)}).catch(function(){}); } catch(_){}
  UI.showToast('Clinical note saved','ok');
};

window._dGenCert = function() {
  var type    = (document.getElementById('cert-type')||{value:'Sick Note'}).value;
  var patient = (document.getElementById('cert-patient')||{value:''}).value;
  var from    = (document.getElementById('cert-from')||{value:''}).value;
  var to      = (document.getElementById('cert-to')||{value:''}).value;
  var notes   = (document.getElementById('cert-notes')||{value:''}).value;
  if (!patient) { UI.showToast('Patient name required','err'); return; }
  UI.showToast(type+' generated for '+patient,'ok');
};

window._dSendMsg = function() {
  var text = (document.getElementById('doc-msg-compose')||{value:''}).value.trim();
  if (!text) return;
  _D.messages.unshift({id:Date.now(), from:'Dr (You)', role:_D.msgThread||'Nurse', text:text, time:_nowT(), unread:false});
  _dRender();
  UI.showToast('Message sent to '+(_D.msgThread||'Nurse Station'),'ok');
};

window._dTaskDone = function(id) {
  var t = _D.tasks.find(function(x){return x.id===id;});
  if (t) t.done=true;
  _dRender();
};

window._dSearchPatients = async function() {
  var q = (document.getElementById('doc-pat-search')||{value:''}).value.trim();
  _D.patSearch = q;
  var el = document.getElementById('doc-pat-results');
  if (el) el.innerHTML='<div style="padding:14px;text-align:center;color:'+C.muted+'">Searching…</div>';
  try {
    var res = await API.patients.list({ search:q, limit:20 });
    _D.patients = res.data||[];
    if(el) el.innerHTML = _dPatRows(_D.patients);
  } catch(e) {
    if(el) el.innerHTML='<div style="padding:14px;text-align:center;color:'+C.muted+'">Search error — check connection</div>';
  }
};

/* Legacy stubs — replaced by _dJoinTeleSession and _dLoadTeleSessions above */
window._dJoinCall = function(id) { _dJoinTeleSession(id); };
window._dNewTeleSession = function() { _dLoadTeleSessions(); };

/* ── Bind events ──────────────────────────────────────────────────── */
function _dBindEvents(){
  var si = document.getElementById('doc-pat-search');
  if (si) si.addEventListener('keydown',function(e){if(e.key==='Enter')window._dSearchPatients();});

  /* Live clock — ticks every second while the dashboard is mounted */
  if (window._docClockInterval) clearInterval(window._docClockInterval);
  window._docClockInterval = setInterval(function(){
    var tEl = document.getElementById('doc-greet-time');
    var dEl = document.getElementById('doc-greet-date');
    if (!tEl) { clearInterval(window._docClockInterval); return; }
    var now = new Date();
    tEl.textContent = now.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    if (dEl) dEl.innerHTML = now.toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'  ·  Johannesburg CHC';
  }, 1000);
}

/* ── Backwards compat for old Pages['queue'] etc ─────────────────── */
window._docCancelAppt    = function(id){ UI.showToast('Appointment cancelled','ok'); };
window._docReschedule    = function(id){ UI.showToast('Reschedule — use Appointments tab','ok'); };
window._showDocCancel    = function(id){ window._docCancelAppt(id); };
window._showDocReschedule= function(id){ window._docReschedule(id); };

/* ── Message bridge: receptionist can push messages directly to this portal ── */
window._doctorAddMessage = function(msg) {
  if (!_D.messages) _D.messages = [];
  /* Avoid duplicates */
  var dup = _D.messages.find(function(m){ return m.id === msg.id; });
  if (dup) return;
  _D.messages.unshift({
    id:       msg.id || Date.now(),
    from:     msg.from || 'Reception',
    role:     msg.fromRole || 'Receptionist',
    text:     msg.text || msg.body || '',
    time:     msg.time || new Date().toLocaleTimeString('en-ZA', {hour:'2-digit',minute:'2-digit'}),
    unread:   true,
  });
  /* Re-render if portal is open */
  if (typeof _dRec === 'function') _dRec();
  /* Toast */
  if (window.UI && window.UI.showToast) {
    UI.showToast('📩 New message from ' + (msg.from || 'Reception'), 'ok');
  }
};

/* ══════════════════════════════════════════════════════════════════
   PATIENT FILE — search by ID / passport / name, view full record
══════════════════════════════════════════════════════════════════ */
function _dPatientFile(){
  var state = window._PF || { results:null, selected:null, loading:false, q:'' };
  window._PF = state;

  /* ── Search handler ── */
  window._pfSearch = async function(){
    var q = (document.getElementById('pf-search-input')||{value:''}).value.trim();
    if(!q){ UI&&UI.showToast('Enter an ID, passport, or name to search','err'); return; }
    window._PF.q = q;
    window._PF.loading = true;
    window._PF.selected = null;
    var box = document.getElementById('pf-results-area');
    if(box) box.innerHTML = '<div style="text-align:center;padding:32px;color:'+C.muted+'"><div style="font-size:24px;margin-bottom:8px">⏳</div>Searching…</div>';

    try {
      /* Try all three fields the backend may support */
      var res = await API.patients.list({ search: q, limit: 20 });
      var list = (res&&res.data) || (Array.isArray(res)?res:[]);
      window._PF.results = list;
      window._PF.loading = false;
      _pfRenderResults(list, q);
    } catch(e) {
      window._PF.loading = false;
      var box2 = document.getElementById('pf-results-area');
      if(box2) box2.innerHTML = '<div style="padding:20px;color:var(--red);font-size:13px">⚠️ Search failed: '+(e.message||'network error')+'. Please try again.</div>';
    }
  };

  /* ── Render search result list ── */
  window._pfRenderResults = function(list, q){
    var box = document.getElementById('pf-results-area');
    if(!box) return;
    if(!list||!list.length){
      box.innerHTML =
        '<div style="text-align:center;padding:48px 32px">'+
          '<div style="font-size:40px;margin-bottom:12px">🔍</div>'+
          '<div style="font-size:15px;font-weight:700;color:#dc2626;margin-bottom:6px">No patient found</div>'+
          '<div style="font-size:13px;color:'+C.muted+';margin-bottom:4px">No record matches <strong>"'+q+'"</strong>.</div>'+
          '<div style="font-size:12px;color:'+C.muted+'">Please check the ID number or passport and try again.<br>Make sure there are no spaces or extra characters.</div>'+
        '</div>';
      return;
    }
    box.innerHTML = '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:10px">'+list.length+' result'+(list.length===1?'':'s')+' for "'+q+'"</div>'+
      list.map(function(p){
        var name = (p.firstName||'')+(p.lastName?' '+p.lastName:'') || p.name || 'Unknown';
        var dob  = p.dob ? new Date(p.dob).toLocaleDateString('en-ZA') : '—';
        var age  = p.dob ? Math.floor((Date.now()-new Date(p.dob))/31557600000)+'y' : '';
        var idNo = p.idNumber||p.nationalId||p.passportNumber||'—';
        var gender = p.sex||p.gender||'';
        return '<div onclick="_pfOpenFile(\''+p._id+'\')" style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:#fff;border:1px solid '+C.border+';border-radius:10px;margin-bottom:8px;cursor:pointer;transition:box-shadow .15s" onmouseover="this.style.boxShadow=\'0 2px 10px rgba(0,0,0,.08)\'" onmouseout="this.style.boxShadow=\'none\'">'+
          '<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#0F6E56,#1A4A9B);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0">'+
            ((name[0]||'?').toUpperCase())+
          '</div>'+
          '<div style="flex:1;min-width:0">'+
            '<div style="font-size:14px;font-weight:700;color:'+C.text+'">'+name+'</div>'+
            '<div style="font-size:12px;color:'+C.muted+';margin-top:2px">'+
              (idNo!=='—'?'ID/Passport: <strong>'+idNo+'</strong> &nbsp;·&nbsp; ':'')+
              'DOB: '+dob+(age?' ('+age+')':'')+
              (gender?' &nbsp;·&nbsp; '+gender:'')+
              (p.mrn?' &nbsp;·&nbsp; MRN: '+p.mrn:'')+
            '</div>'+
          '</div>'+
          '<div style="font-size:12px;color:'+C.blue+';font-weight:600">View file →</div>'+
        '</div>';
      }).join('');
  };

  /* ── Open individual patient file → navigate to Patient 360 ── */
  window._pfOpenFile = async function(pid){
    var box = document.getElementById('pf-results-area');
    if(box) box.innerHTML = '<div style="text-align:center;padding:32px;color:'+C.muted+'"><div style="font-size:24px;margin-bottom:8px">⏳</div>Loading patient file…</div>';
    try {
      var res = await API.patients.get(pid);
      var pat = res.data||res;
      /* Switch to Patient 360 view with the loaded data */
      _D.pat360Data = pat;
      _D.p360Tab    = 'overview';
      _D.view       = 'pat360';
      if(typeof _dRender==='function') _dRender();
    } catch(e){
      if(box) box.innerHTML =
        '<div style="text-align:center;padding:48px 32px">'+
          '<div style="font-size:40px;margin-bottom:12px">❌</div>'+
          '<div style="font-size:15px;font-weight:700;color:#dc2626;margin-bottom:6px">Patient file not found</div>'+
          '<div style="font-size:13px;color:'+C.muted+';margin-bottom:20px">We could not load this patient\'s file. Please check the ID or passport number and try again.</div>'+
          '<button onclick="window._PF.selected=null;_pfRenderResults(window._PF.results,window._PF.q)" style="padding:8px 20px;background:'+C.blue+';color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">← Back to results</button>'+
        '</div>';
    }
  };

  /* ── Render full patient file ── */
  window._pfRenderFile = function(p){
    var box = document.getElementById('pf-results-area');
    if(!box) return;

    var name   = (p.firstName||'')+(p.lastName?' '+p.lastName:'') || p.name || 'Unknown';
    var dob    = p.dob ? new Date(p.dob).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}) : '—';
    var age    = p.dob ? Math.floor((Date.now()-new Date(p.dob))/31557600000) : '—';
    var idNo   = p.idNumber||p.nationalId||'—';
    var ppNo   = p.passportNumber||'—';
    var mrn    = p.mrn||'—';
    var gender = p.sex||p.gender||'—';
    var blood  = p.bloodType||'—';
    var phone  = p.phone||p.mobile||'—';
    var email  = p.email||'—';
    var addr   = p.address ? (p.address.street||'')+(p.address.city?', '+p.address.city:'')+(p.address.province?', '+p.address.province:'') : '—';
    var allergies = (p.allergies||[]).join(', ')||'None recorded';
    var meds   = (p.medications||p.currentMedications||[]);
    var consults= (p.consultations||[]);
    var labs   = (p.labResults||p.labs||[]);

    function row(label, val){
      return '<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #f0f4f8">'+
        '<span style="min-width:130px;font-size:12px;font-weight:600;color:'+C.muted+'">'+label+'</span>'+
        '<span style="font-size:13px;color:'+C.text+'">'+val+'</span>'+
      '</div>';
    }

    box.innerHTML =
      /* Back button */
      '<button onclick="window._PF.selected=null;_pfRenderResults(window._PF.results,window._PF.q)" style="display:flex;align-items:center;gap:6px;margin-bottom:16px;border:none;background:transparent;cursor:pointer;font-size:13px;color:'+C.blue+';font-family:inherit;font-weight:600;padding:0">'+
        '← Back to results'+
      '</button>'+

      /* Header banner */
      '<div style="background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);border-radius:14px;padding:20px 24px;margin-bottom:16px;display:flex;align-items:center;gap:18px;box-shadow:0 4px 14px rgba(15,110,86,.2)">'+
        '<div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.22);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;flex-shrink:0">'+
          (name[0]||'?').toUpperCase()+
        '</div>'+
        '<div style="flex:1">'+
          '<div style="font-size:20px;font-weight:800;color:#fff">'+name+'</div>'+
          '<div style="font-size:13px;color:rgba(255,255,255,.78);margin-top:3px">'+
            'MRN: '+mrn+' &nbsp;·&nbsp; '+age+'y '+gender+' &nbsp;·&nbsp; Blood: '+blood+
          '</div>'+
        '</div>'+
        '<button onclick="_setView(\'patients\');_D.pat360Id=\''+p._id+'\'" style="padding:9px 18px;border-radius:8px;border:none;background:rgba(255,255,255,.2);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">'+
          '👥 Full 360° View'+
        '</button>'+
      '</div>'+

      /* Two-column layout */
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'+

        /* LEFT col */
        '<div style="display:flex;flex-direction:column;gap:14px">'+

          /* Identity */
          _card(
            '<div style="font-size:13px;font-weight:700;color:'+C.text+';margin-bottom:10px;display:flex;align-items:center;gap:7px"><span>🪪</span>Identity & Demographics</div>'+
            row('Full name', name)+
            row('Date of birth', dob+' (age '+age+')')+
            row('Gender', gender)+
            row('SA ID number', idNo)+
            row('Passport number', ppNo)+
            row('MRN', mrn)+
            row('Blood type', blood)
          )+

          /* Contact */
          _card(
            '<div style="font-size:13px;font-weight:700;color:'+C.text+';margin-bottom:10px;display:flex;align-items:center;gap:7px"><span>📞</span>Contact Details</div>'+
            row('Phone', phone)+
            row('Email', email)+
            row('Address', addr)
          )+

          /* Allergies */
          _card(
            '<div style="font-size:13px;font-weight:700;color:'+C.text+';margin-bottom:10px;display:flex;align-items:center;gap:7px"><span>⚠️</span>Allergies & Alerts</div>'+
            '<div style="padding:10px 14px;background:'+(p.allergies&&p.allergies.length?'#FEF2F2':'#F0FDF4')+';border-radius:8px;font-size:13px;color:'+(p.allergies&&p.allergies.length?'#991B1B':'#166534')+'">'+
              (p.allergies&&p.allergies.length?'⚠️ '+allergies:'✅ No known allergies')+
            '</div>'
          )+
        '</div>'+

        /* RIGHT col */
        '<div style="display:flex;flex-direction:column;gap:14px">'+

          /* Current medications */
          _card(
            '<div style="font-size:13px;font-weight:700;color:'+C.text+';margin-bottom:10px;display:flex;align-items:center;gap:7px"><span>💊</span>Current Medications</div>'+
            (meds.length
              ? meds.map(function(m){
                  var n = m.name||m.medicationName||String(m);
                  var d = m.dose||m.dosage||''; var f = m.frequency||'';
                  return '<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #f0f4f8">'+
                    '<span style="margin-top:2px">💊</span>'+
                    '<div><div style="font-size:13px;font-weight:600;color:'+C.text+'">'+n+'</div>'+
                    (d||f?'<div style="font-size:11px;color:'+C.muted+'">'+[d,f].filter(Boolean).join(' · ')+'</div>':'')+
                    '</div></div>';
                }).join('')
              : '<div style="font-size:13px;color:'+C.muted+';padding:8px 0">No current medications on record</div>')
          )+

          /* Recent consultations */
          _card(
            '<div style="font-size:13px;font-weight:700;color:'+C.text+';margin-bottom:10px;display:flex;align-items:center;gap:7px"><span>🩺</span>Recent Consultations</div>'+
            (consults.length
              ? consults.slice(0,5).map(function(c){
                  var dt = c.date ? new Date(c.date).toLocaleDateString('en-ZA') : '—';
                  return '<div style="padding:8px 0;border-bottom:1px solid #f0f4f8">'+
                    '<div style="font-size:12px;color:'+C.muted+'">'+dt+'</div>'+
                    '<div style="font-size:13px;color:'+C.text+'">'+( c.chiefComplaint||c.reason||c.notes||'Consultation' )+'</div>'+
                  '</div>';
                }).join('')
              : '<div style="font-size:13px;color:'+C.muted+';padding:8px 0">No consultations on record</div>')
          )+

          /* Recent labs */
          _card(
            '<div style="font-size:13px;font-weight:700;color:'+C.text+';margin-bottom:10px;display:flex;align-items:center;gap:7px"><span>🧪</span>Recent Lab Results</div>'+
            (labs.length
              ? labs.slice(0,5).map(function(l){
                  var flag = l.flag||l.status||'';
                  var flagColor = flag==='HIGH'||flag==='CRITICAL'?'#DC2626':flag==='LOW'?'#D97706':'#0F6E56';
                  return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f0f4f8">'+
                    '<div style="flex:1;font-size:13px;color:'+C.text+'">'+l.name+'</div>'+
                    '<div style="font-size:13px;font-weight:600">'+l.result+(l.unit?' '+l.unit:'')+'</div>'+
                    (flag?'<span style="font-size:10px;font-weight:700;color:'+flagColor+';background:'+flagColor+'18;padding:2px 8px;border-radius:10px">'+flag+'</span>':'')+
                  '</div>';
                }).join('')
              : '<div style="font-size:13px;color:'+C.muted+';padding:8px 0">No lab results on record</div>')
          )+
        '</div>'+
      '</div>';
  };

  /* ── Keyboard: Enter triggers search ── */
  setTimeout(function(){
    if(typeof document==='undefined') return;
    var inp = document.getElementById('pf-search-input');
    if(inp) inp.addEventListener('keydown', function(e){ if(e.key==='Enter') window._pfSearch(); });
  }, 100);

  /* ── Initial render: show the file if already selected, else show search ── */
  var initialContent = state.selected
    ? '' /* will re-render below */
    : state.results
      ? '' /* will re-render below */
      : '<div style="text-align:center;padding:48px 20px;color:'+C.muted+'">'+
          '<div style="font-size:48px;margin-bottom:14px">🗂️</div>'+
          '<div style="font-size:15px;font-weight:700;color:'+C.text+';margin-bottom:6px">Patient File Search</div>'+
          '<div style="font-size:13px">Enter a patient\'s ID number, passport number, or full name above</div>'+
        '</div>';

  return '<div style="flex:1;overflow:auto;padding:20px">'+

    /* Search bar */
    '<div style="background:#fff;border:1px solid '+C.border+';border-radius:12px;padding:16px 20px;margin-bottom:16px;display:flex;gap:10px;align-items:center;box-shadow:0 1px 4px rgba(0,0,0,.06)">'+
      '<div style="font-size:22px">🗂️</div>'+
      '<div style="flex:1">'+
        '<div style="font-size:14px;font-weight:700;color:'+C.text+';margin-bottom:2px">Find Patient File</div>'+
        '<div style="font-size:12px;color:'+C.muted+'">Search by SA ID number, passport number, or patient name</div>'+
      '</div>'+
    '</div>'+

    '<div style="display:flex;gap:10px;margin-bottom:16px">'+
      '<div style="flex:1;position:relative">'+
        '<span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;pointer-events:none">🔍</span>'+
        '<input id="pf-search-input" type="text" placeholder=""'+
          ' value="'+(state.q||'')+'"'+
          ' style="width:100%;padding:12px 14px 12px 42px;border:1.5px solid '+C.border+';border-radius:10px;font-size:14px;font-family:inherit;outline:none;background:#fff"'+
          ' onfocus="this.style.borderColor=\''+C.blue+'\'" onblur="this.style.borderColor=\''+C.border+'\'">'+
      '</div>'+
      '<button onclick="_pfSearch()" style="padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56,#1A4A9B);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap">'+
        'Search'+
      '</button>'+
    '</div>'+

    '<div id="pf-results-area">'+initialContent+'</div>'+
  '</div>';
}
