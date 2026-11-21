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
  notifications:  [], /* populated from API */
  messages: [], /* populated from API on first open */
  tasks: [], /* populated from API */
  todaySchedule: [], /* populated from API */
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
  requestAnimationFrame(_dRender);

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
      if (!pt) return;
      /* Accept both direct objects and req-wrapped objects from receptionist */
      var doc = (pt.req || pt);
      if (!doc.id && !doc.patientId) return;
      if (!doc.id) doc.id = doc.patientId;
      window._DOCTOR_QUEUE = window._DOCTOR_QUEUE || [];
      var exists = window._DOCTOR_QUEUE.find(function(x){ return x.id === doc.id; });
      if (!exists) {
        window._DOCTOR_QUEUE.push(doc);
        if (document.getElementById('doc-main')) _dRender();
      }
    }
    /* Expose so same-tab receptionist can call directly */
    window._doctorAddTeleRequest = _handleDoctorPt;
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
    /* Guard: only attach the storage listener once across all re-inits */
    if (!window._dStorageListenerAdded) {
      window._dStorageListenerAdded = true;
      window.addEventListener('storage', function(e) {
        if (e.key === '_NIHMS_DOCTOR_REQ' && e.newValue) {
          try { _handleDoctorPt(JSON.parse(e.newValue)); } catch(_) {}
        }
        if (e.key === '_NIHMS_DOCTOR_QUEUE' && e.newValue) { _drainDoctorQueue(); }
      });
    }
    try {
      var _docCh = new BroadcastChannel('nihms_doctor_queue');
      _docCh.onmessage = function(e) {
        if (!e.data) return;
        /* Accept DOCTOR_PT (from nurse/doctor flow) and TELE_REQ (from receptionist) */
        if (e.data.type === 'DOCTOR_PT') _handleDoctorPt(e.data.doc);
        else if (e.data.type === 'TELE_REQ') _handleDoctorPt(e.data.req);
      };
    } catch(_) {}
  })();

  /* If shell already mounted, just switch to dashboard */
  if(document.getElementById('doc-main')){
    _D.view='dashboard'; _dRender(); return '';
  }

  /* Paint skeleton immediately — _dRender fills it in on next tick */
  return '<div style="display:flex;height:calc(100vh - 120px);overflow:hidden">'+
    '<main id="doc-main" style="flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column;background:'+C.bg+'">'+
      '<div style="padding:24px;display:flex;flex-direction:column;gap:14px;animation:_dPulse 1.2s ease-in-out infinite">'+
        '<div style="height:80px;background:#e2e8f0;border-radius:14px"></div>'+
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">'+
          '<div style="height:80px;background:#e2e8f0;border-radius:12px"></div>'.repeat(3)+
        '</div>'+
        '<div style="display:grid;grid-template-columns:2fr 1fr;gap:12px">'+
          '<div style="height:220px;background:#e2e8f0;border-radius:12px"></div>'+
          '<div style="height:220px;background:#e2e8f0;border-radius:12px"></div>'+
        '</div>'+
      '</div>'+
    '</main>'+
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
    /* Shell not in DOM — mount it, then render on next tick */
    _D.view = view;
    window._DOCTOR_QUEUE = window._DOCTOR_QUEUE || [];
    window._dcAddPatient = function(pt){
      window._DOCTOR_QUEUE.push(pt);
      if(document.getElementById('doc-main')) _dRender();
    };
    requestAnimationFrame(_dRender);
    return '<div style="display:flex;height:calc(100vh - 120px);overflow:hidden">'+
      '<main id="doc-main" style="flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column;background:'+C.bg+'"></main>'+
    '</div>';
  };
}

Pages['doc_appointments'] = _dPage('doc_appointments');
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
Pages['med_certs']      = _dPage('med_certs');
Pages['doc_all_certs']  = _dPage('doc_all_certs');
Pages['queue']         = _dPage('dashboard');

/* ─── View HTML cache — invalidated only when _dRenderBust(view) called ── */
var _dCache = {};
function _dRenderBust(view){ if(view) delete _dCache[view]; else _dCache={}; }

/* Views that must always re-render (live data changes every visit) */
/* consult and medical_notes are patient-context-dependent — never serve stale cache */
var _dNoCache = { dashboard:1, patients:1, doc_appointments:1, messages:1, consult:1, medical_notes:1, pat360:1, prescriptions:1, lab:1, lab_results:1, radiology:1, telemedicine:1, med_certs:1, doc_all_certs:1 };

/* ─── Cached current user — resolved once per render cycle ────────── */
/* Prefer window.NIHMS_USER (set by the NIHMS shell for the logged-in  */
/* staff member) over API.getStoredUser() which may return stale data.  */
var _dCurrentUser = null;
function _dGetUser(){
  return _dCurrentUser || (_dCurrentUser =
    window.NIHMS_USER ||
    (window.API && window.API.getStoredUser && window.API.getStoredUser()) ||
    {});
}

/* ─── Debounce guard — prevents render storms from rapid state changes ─ */
var _dRenderPending = false;
function _dRenderScheduled(){
  if(_dRenderPending) return;
  _dRenderPending = true;
  requestAnimationFrame(function(){ _dRenderPending = false; _dRender(); });
}

/* ─── Render engine ────────────────────────────────────────────────── */
function _dRender(){
  /* Reset per-render user cache so each render cycle gets a fresh lookup */
  _dCurrentUser = null;
  if(!document.getElementById('nihms-style')){
    var s=document.createElement('style');s.id='nihms-style';
    s.textContent='*{box-sizing:border-box}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:99px}body{font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif}'+
      '@keyframes _dPulse{0%,100%{opacity:1}50%{opacity:.5}}';
    document.head.appendChild(s);
  }
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
    med_certs:    _dMedCerts,
    doc_all_certs:_dAllCerts,

  };
  var v = _D.view;
  /* Use cached HTML for static views; rebuild live views every time */
  if (!_dNoCache[v] && _dCache[v]) {
    main.innerHTML = _dCache[v];
  } else {
    var html = (views[v] || _dDashboard)();
    if (!_dNoCache[v]) _dCache[v] = html;
    main.innerHTML = html;
  }
  _dBindEvents();
}

/* ─── Sidebar (cached by badge fingerprint) ────────────────────────── */
var _dSidebarCache = { key:'', html:'' };
function _dSidebar(){
  var unreadM = _D.messages.filter(function(m){return m.unread;}).length;
  var cacheKey = _D.view+'|'+unreadM;
  if (_dSidebarCache.key === cacheKey) return _dSidebarCache.html;

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
  var user = _dGetUser()||{firstName:'',lastName:'',role:'doctor'};
  var ini  = ((user.firstName||'D')[0]+((user.lastName||'')[0]||'')).toUpperCase()||'DR';
  var docName = (user.firstName||user.lastName) ? 'Dr '+(user.firstName||'')+(user.lastName?' '+user.lastName:'') : 'Dr Molefe';

  _dSidebarCache.key = cacheKey;
  var _sb = '<div style="padding:14px;border-bottom:1px solid '+C.border+';display:flex;align-items:center;gap:9px">'+
    '<div style="width:32px;height:32px;border-radius:50%;background:'+C.bannerL+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0">'+ini+'</div>'+
    '<div><div style="font-size:13px;font-weight:700;color:'+C.text+'">'+docName+'</div><div style="font-size:10px;color:'+C.muted+'">Physician</div></div>'+
  '</div>'+
  sec('Today')+
  nav('Dashboard','🏠','dashboard','','')+
  nav('Appointments','📅','doc_appointments','','')+
  sec('Patients')+
  nav('Patient 360°','👥','patients','','')+
  nav('Medical Notes','📝','medical_notes','','')+
  sec('Orders & Results')+
  nav('Prescriptions','💊','prescriptions','','')+
  nav('Lab Orders','🧪','lab','','')+
  nav('Lab Results','📊','lab_results','','')+
  nav('Radiology','🩻','radiology','','')+
  nav('Referrals','🔄','referrals','','')+
  sec('Communication')+
  nav('Telemedicine','📹','telemedicine','','')+
  nav('Messages','💬','messages',unreadM||'',C.teal)+
  sec('Documents')+
  nav('Cert Registry','📄','doc_all_certs','','');
  _dSidebarCache.html = _sb;
  return _sb;
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
  var unreadM = _D.messages.filter(function(m){return m.unread;}).length;
  /* Use live API data when already cached, else fall back to static seed */
  var aptCount = (window._dAptData && window._dAptData.length !== undefined)
    ? window._dAptData.length
    : _D.todaySchedule.length;

  var kpis = [
    {id:'kpi-apt', label:"Today's Appointments", value:aptCount,  color:C.teal,   icon:'📅'},
    {id:'kpi-wait',label:'Waiting Patients',      value:waiting.length, color:C.amber, icon:'⏳'},
  ];

  var kpiHtml = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">'+
    kpis.map(function(k){
      return _card('<div style="display:flex;align-items:center;gap:12px">'+
        '<div style="font-size:24px">'+k.icon+'</div>'+
        '<div><div id="'+k.id+'" style="font-size:26px;font-weight:800;color:'+k.color+';line-height:1">'+k.value+'</div>'+
        '<div style="font-size:12px;color:'+C.muted+';margin-top:2px">'+k.label+'</div></div>'+
      '</div>');
    }).join('')+
  '</div>';

  /* ── Async refresh: deferred 200 ms so paint happens before network ── */
  /* Guard: skip if user has navigated away from dashboard before timer fires */
  setTimeout(async function(){
    if (_D.view !== 'dashboard') return;
    try {
      var u   = _dGetUser();
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
    } catch(e){ /* silently ignore — tile keeps its initial value */ }
  }, 200);

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

  /* Today's Telemedicine — placeholder; async loader fills #dash-tele-list */
  var schedHtml = '<div id="dash-tele-list" style="padding:20px;text-align:center;color:'+C.muted+'">'+
    '<span style="font-size:20px">📹</span><br><span style="font-size:12px">Loading…</span>'+
  '</div>';
  /* Trigger async load after host API is ready — guard: skip if user navigated away */
  setTimeout(function(){
    if(_D.view==='dashboard') {
      if(window._dDashTeleLoad) window._dDashTeleLoad();
    }
  }, 250);

  /* Greeting banner */
  var _greetHour = new Date().getHours();
  var _greetWord = _greetHour < 12 ? 'Good morning' : _greetHour < 17 ? 'Good afternoon' : 'Good evening';
  /* Live clock — update every second */
  if(window._docClockTimer) clearInterval(window._docClockTimer);
  window._docClockTimer = setInterval(function(){
    var el = document.getElementById('doc-greet-clock');
    if(!el){ clearInterval(window._docClockTimer); return; }
    el.textContent = new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }, 30000);

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
        /* Today's Telemedicine */
        _card('<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
          '<div style="display:flex;align-items:center;gap:8px">'+
            '<span style="font-size:16px">📹</span>'+
            '<div style="font-size:14px;font-weight:700;color:'+C.text+'">Today\'s Telemedicine</div>'+
            '<span id="dash-tele-count" style="font-size:11px;color:'+C.muted+';background:#f1f5f9;padding:1px 7px;border-radius:20px"></span>'+
          '</div>'+
          '<div style="display:flex;align-items:center;gap:8px">'+
            '<button onclick="window._dDashTeleLoad()" style="font-size:11px;color:'+C.blue+';border:none;background:transparent;cursor:pointer;font-family:inherit">↻ Refresh</button>'+
            '<button onclick="Pages[\'telemedicine\']()" style="font-size:12px;color:'+C.purple+';border:none;background:transparent;cursor:pointer;font-family:inherit">View all →</button>'+
          '</div>'+
        '</div>'+schedHtml)+
      '</div>'+

    '</div>';
}

/* ══════════════════════════════════════════════════════════════════
   DASHBOARD — TODAY'S SCHEDULE loader
   Fetches today's appointments for the logged-in doctor and renders
   them as a timeline list into #dash-sched-list.
══════════════════════════════════════════════════════════════════ */
window._dDashSchedLoad = async function(){
  var wrap  = document.getElementById('dash-sched-list');
  var badge = document.getElementById('dash-sched-count');
  if (!wrap) return;

  var C2 = C; /* closure */
  var statusColor = { done:'#6b7280', active:C2.teal, upcoming:C2.blue };
  var statusLabel = { done:'Done', active:'In Progress', upcoming:'Upcoming' };

  try {
    var u   = _dGetUser();
    var did = u && (u._id || u.id);
    var now   = new Date();
    var start = new Date(now.getFullYear(),now.getMonth(),now.getDate()).toISOString();
    var end   = new Date(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59).toISOString();

    var aptRes  = await window.API.appointments.list({ doctor:did, dateFrom:start, dateTo:end, limit:50 });
    var aptItems = (aptRes&&aptRes.data)||(Array.isArray(aptRes)?aptRes:[]);

    if (!aptItems.length) {
      wrap.innerHTML = '<div style="padding:20px;text-align:center;color:'+C2.muted+';font-size:13px">No appointments scheduled for today.</div>';
      if (badge) badge.textContent = '0';
      return;
    }

    /* Normalise */
    var rows = aptItems.map(function(a){
      var pat  = a.patient||{};
      var name = (pat.firstName ? ((pat.firstName+' '+(pat.lastName||'')).trim()) : null) || pat.name || a.patientName || 'Unknown';
      var rawTime = a.scheduledAt ? new Date(a.scheduledAt).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}) : (a.time||'—');
      var st = a.status==='in_progress'?'active':a.status==='completed'||a.status==='done'?'done':'upcoming';
      var vt = a.visitType||a.type||'Consultation';
      return { time:rawTime, patient:name, type:vt, status:st, patId:pat._id||pat.id||a.patientId||'' };
    }).sort(function(a,b){ return (a.time||'').localeCompare(b.time||''); });

    /* Update _D.todaySchedule */
    _D.todaySchedule = rows;
    var aptEl = document.getElementById('kpi-apt');
    if (aptEl) aptEl.textContent = rows.length;
    if (badge) badge.textContent = rows.length;

    wrap.innerHTML = rows.map(function(r){
      var sc = statusColor[r.status]||C2.blue;
      var sl = statusLabel[r.status]||r.status;
      var initials = r.patient.split(' ').map(function(n){return n[0]||'';}).join('').slice(0,2).toUpperCase();
      return '<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #f0f4f8">'+
        '<div style="width:44px;text-align:right;font-size:12px;font-weight:700;color:'+C2.muted+';flex-shrink:0">'+r.time+'</div>'+
        '<div style="width:2px;align-self:stretch;background:'+sc+';border-radius:2px;flex-shrink:0"></div>'+
        '<div style="width:32px;height:32px;border-radius:50%;background:'+sc+'20;border:1.5px solid '+sc+'50;color:'+sc+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">'+initials+'</div>'+
        '<div style="flex:1;min-width:0">'+
          '<div style="font-size:13px;font-weight:600;color:'+C2.text+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+r.patient+'</div>'+
          '<div style="font-size:11px;color:'+C2.muted+'">'+r.type+'</div>'+
        '</div>'+
        '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:'+sc+'18;color:'+sc+';white-space:nowrap">'+sl+'</span>'+
      '</div>';
    }).join('');
  } catch(e){
    if (wrap) wrap.innerHTML = '<div style="padding:16px;text-align:center;color:#dc2626;font-size:12px">⚠ Could not load schedule</div>';
  }
};

/* ══════════════════════════════════════════════════════════════════
   DASHBOARD — TODAY'S TELEMEDICINE loader
   Fetches today's telemedicine appointments for the logged-in doctor
   and renders them into the #dash-tele-list placeholder.
   Auto-wires a 60-second refresh timer while the dashboard is visible.
══════════════════════════════════════════════════════════════════ */
window._dDashTeleLoad = async function(){
  var wrap  = document.getElementById('dash-tele-list');
  var badge = document.getElementById('dash-tele-count');
  if (!wrap) return; /* dashboard not mounted */

  /* Spinner */
  wrap.innerHTML = '<div style="padding:16px;text-align:center;color:'+C.muted+';font-size:12px">'+
    '<span style="font-size:18px">📹</span><br>Loading sessions…</div>';

  try {
    /* Use same bare API global as all other loaders in this file */
    var u   = _dGetUser();
    var did = u && (u._id || u.id);

    /* Today's date window */
    var now   = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    var end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    /* Use same _fetchDirect pattern as other loaders in this file */
    var qs = 'visitType=telemedicine&limit=50' +
             (did ? '&doctor='+encodeURIComponent(did) : '') +
             '&dateFrom='+encodeURIComponent(start) +
             '&dateTo='+encodeURIComponent(end);
    var res = await API._fetchDirect('/appointments?' + qs, { method:'GET' });
    var appts = (res && res.data) || (Array.isArray(res) ? res : []);

    /* Filter defensively: only this doctor's, only today's */
    appts = appts.filter(function(a){
      if (!a.scheduledAt) return false;
      var d = new Date(a.scheduledAt);
      if (d < new Date(start) || d > new Date(end)) return false;
      if (did) {
        var docId = (a.doctor && (a.doctor._id || a.doctor.id)) || a.doctorId || a.assignedDoctor || '';
        if (docId && String(docId) !== String(did)) return false;
      }
      return true;
    });

    appts.sort(function(a, b){ return new Date(a.scheduledAt) - new Date(b.scheduledAt); });

    /* Badge */
    if (badge) {
      badge.textContent = appts.length ? appts.length + ' session' + (appts.length !== 1 ? 's' : '') : '';
      badge.style.display = appts.length ? '' : 'none';
    }

    if (!appts.length) {
      wrap.innerHTML =
        '<div style="padding:24px;text-align:center;color:'+C.muted+'">'+
          '<div style="font-size:32px;margin-bottom:8px;opacity:.5">📹</div>'+
          '<div style="font-size:13px;font-weight:600;margin-bottom:4px">No telemedicine sessions today</div>'+
          '<div style="font-size:11px">Appointments with visit type "Telemedicine" will appear here.</div>'+
        '</div>';
      return;
    }

    wrap.innerHTML = appts.map(function(a){
      var when    = new Date(a.scheduledAt);
      var isLive  = a.status === 'in_progress';
      var isPast  = when < now && !isLive;
      var isSoon  = !isPast && !isLive && (when - now) < 30 * 60 * 1000;
      var canJoin = !['cancelled','completed'].includes(a.status);

      var ptName = ((a.patient && a.patient.firstName) || '');
      if (a.patient && a.patient.lastName) ptName += (ptName ? ' ' : '') + a.patient.lastName;
      ptName = ptName.trim() || a.patient && (a.patient.name || '') || 'Patient';
      var ini = ptName.split(' ').map(function(n){ return n[0] || ''; }).join('').slice(0, 2).toUpperCase();

      var sc = {
        confirmed:   { bg:'#dcfce7', color:'#15803d', label:'Confirmed' },
        pending:     { bg:'#fef3c7', color:'#92400e', label:'Pending'   },
        in_progress: { bg:'#ccfbf1', color:'#0f766e', label:'In Progress'},
        completed:   { bg:'#f1f5f9', color:'#64748b', label:'Completed' },
        cancelled:   { bg:'#fee2e2', color:'#991b1b', label:'Cancelled' }
      }[a.status] || { bg:'#f1f5f9', color:'#64748b', label: a.status || 'Unknown' };

      var borderLeft = isLive ? '3px solid '+C.green : isSoon ? '3px solid '+C.amber : '3px solid transparent';
      var bg         = isLive ? '#f0fdf4' : isSoon ? '#fffbeb' : '#fff';
      var timeStr    = when.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
      var reason     = (a.reason || a.chiefComplaint || 'Telemedicine consultation');

      var joinLabel  = isLive ? '📹 Rejoin' : isSoon ? '📹 Join now' : '📹 Start';
      var joinStyle  = 'padding:6px 12px;border-radius:8px;border:none;background:'+(isLive||isSoon?C.green:C.purple)+';color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap';

      return '<div style="display:flex;align-items:center;gap:10px;padding:9px 10px;margin-bottom:6px;border-radius:9px;background:'+bg+';border-left:'+borderLeft+';border:1px solid '+(isLive?C.green:isSoon?C.amber:C.border)+';border-left:'+borderLeft+'">'+
        /* Time column */
        '<div style="font-size:12px;font-family:monospace;font-weight:700;color:'+(isLive?C.green:isSoon?C.amber:C.muted)+';width:42px;flex-shrink:0;text-align:center">'+timeStr+'</div>'+
        /* Avatar */
        '<div style="width:32px;height:32px;border-radius:50%;background:'+C.purple+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0">'+ini+'</div>'+
        /* Info */
        '<div style="flex:1;min-width:0">'+
          '<div style="font-size:13px;font-weight:700;color:'+C.text+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+ptName+'</div>'+
          '<div style="font-size:11px;color:'+C.muted+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+reason+'</div>'+
        '</div>'+
        /* Status badge */
        '<span style="padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;background:'+sc.bg+';color:'+sc.color+';white-space:nowrap;flex-shrink:0">'+
          (isLive ? '● Live' : sc.label)+
        '</span>'+
        /* Join button */
        (canJoin ?
          '<button onclick="_dJoinTeleSession(\''+a._id+'\')" style="'+joinStyle+'">'+joinLabel+'</button>'
        : '') +
      '</div>';
    }).join('');

  } catch(err) {
    if (wrap) wrap.innerHTML =
      '<div style="padding:12px;background:#fee2e2;border-radius:8px;font-size:12px;color:#991b1b">'+
        '⚠ Could not load sessions: '+(err.message||'Network error')+
        ' &nbsp;<button onclick="window._dDashTeleLoad()" style="font-size:11px;color:#991b1b;text-decoration:underline;border:none;background:transparent;cursor:pointer">Retry</button>'+
      '</div>';
  }

  /* Auto-refresh every 60 s while the dashboard is visible */
  if (window._dashTeleTimer) clearTimeout(window._dashTeleTimer);
  window._dashTeleTimer = setTimeout(function(){
    if (document.getElementById('dash-tele-list') && _D.view === 'dashboard') {
      window._dDashTeleLoad();
    }
  }, 60000);
};

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

  /* ── Fetch live appointments — skip if already loaded in last 60 s ── */
  var _aptNow = Date.now();
  if (window._dAptDataTs && (_aptNow - window._dAptDataTs < 60000) && window._dAptRows) {
    /* Data is fresh — re-render with cached data immediately */
    requestAnimationFrame(function(){
      var calArea = document.getElementById('doc-apt-cal');
      if (calArea && window._dAptRows) {
        /* trigger re-render with cached rows already in _dAptData */
        _dRenderBust('doc_appointments');
      }
    });
  }
  requestAnimationFrame(async function(){
    if (window._dAptDataTs && (Date.now() - window._dAptDataTs < 60000) && window._dAptRows) return;
    var calArea   = document.getElementById('doc-apt-cal');
    var tableArea = document.getElementById('doc-apt-table');
    if (!calArea) return;
    try {
      calArea.innerHTML = '<div style="padding:32px;text-align:center;color:'+C.muted+'"><div class="spinner" style="width:24px;height:24px;margin:0 auto 10px"></div>Loading appointments…</div>';
      var u   = _dGetUser();
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

      window._dAptData   = rows;
      window._dAptRows   = rows;
      window._dAptDataTs = Date.now();
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

  /* ── Consultations tab — rich cards ── */
  if (tab === 'consultations') {
    var consultList = p.consultations || [];
    /* Also check localStorage for any locally-saved records */
    try {
      var _cPatKey = 'nihms_consultations_' + (p._id||p.id||p.nationalId||'');
      if (_cPatKey !== 'nihms_consultations_') {
        var _localC = JSON.parse(localStorage.getItem(_cPatKey) || '[]');
        if (_localC.length) {
          /* Merge: avoid duplicates by _id */
          var _cIds = new Set(consultList.map(function(c){return c._id||c.id;}));
          _localC.forEach(function(lc){ if(!_cIds.has(lc._id)) consultList.push(lc); });
          consultList.sort(function(a,b){ return new Date(b.consultedAt||0)-new Date(a.consultedAt||0); });
        }
      }
    } catch(_) {}

    var _cRows = consultList.length ? consultList.map(function(c) {
      var dt  = c.consultedAt ? new Date(c.consultedAt).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}) : '—';
      var tm  = c.consultedAt ? new Date(c.consultedAt).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}) : '';
      var isLocal = !!(c.savedLocally || (c._id && String(c._id).startsWith('LOCAL-')));
      return '<div style="padding:14px;border:1.5px solid '+C.border+';border-radius:10px;margin-bottom:10px;background:#fff">'+
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">'+
          '<div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+(c.visitType||'Consultation')+'</div>'+
            '<div style="font-size:11px;color:'+C.muted+'">'+dt+(tm?' · '+tm:'')+' · '+(c.clinician||c.doctor||'—')+'</div>'+
          '</div>'+
          (isLocal?'<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;background:#fef3c7;color:#92400e">Saved offline</span>':'<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;background:'+C.greenLt+';color:'+C.green+'">Saved</span>')+
        '</div>'+
        (c.chiefComplaint?'<div style="font-size:12px;color:'+C.text+';margin-bottom:6px"><span style="color:'+C.muted+'">Chief complaint:</span> '+c.chiefComplaint+'</div>':'')+
        (c.clinicianNotes?'<div style="font-size:12px;color:'+C.text+';margin-bottom:6px"><span style="color:'+C.muted+'">Notes:</span> '+(c.clinicianNotes.length>180?c.clinicianNotes.slice(0,180)+'…':c.clinicianNotes)+'</div>':'')+
        (c.outcomes&&c.outcomes.length?'<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">'+c.outcomes.map(function(o){return'<span style="font-size:11px;padding:2px 8px;border-radius:6px;background:#f1f5f9;color:'+C.muted+'">'+o+'</span>';}).join('')+'</div>':'')+
      '</div>';
    }).join('') : '<div style="padding:28px;text-align:center;color:'+C.muted+'">No consultation records on file</div>';

    content = '<div style="padding:16px 20px">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'+
        '<div style="font-size:14px;font-weight:700;color:'+C.text+'">🩺 Consultations ('+(consultList.length)+')</div>'+
        '<button onclick="_D.selectedPat=_D.pat360Data;_D.consultPat=_D.pat360Data;_D.view=\'consult\';_dRender()" style="font-size:12px;padding:6px 14px;border-radius:8px;border:1.5px solid '+C.teal+';background:transparent;color:'+C.teal+';font-weight:600;cursor:pointer;font-family:inherit">+ New Consultation</button>'+
      '</div>'+
      _cRows+
    '</div>';
  }

  var tabPlaceholders = {
    medications: '💊 Medications', labs: '🧪 Lab Results',
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
  var p       = _D.consultPat || _D.selectedPat || null;
  var u       = _dGetUser();
  var today   = new Date();
  var todayFmt= today.toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});
  var todayIso= today.toISOString().slice(0,10);
  var timeNow = today.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});

  /* Resolve clinician info from logged-in user */
  var docName     = u.firstName ? 'Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim() : (u.name||'Dr Sipho Molefe');
  var docHpcsa    = u.hpcsaNumber||u.hpcsa||u.registrationNumber||u.regNo||u.licenseNumber||'';
  var docFacility = (typeof u.facility==='string'?u.facility:'')||(u.facility&&u.facility.name)||(u.primaryFacility&&u.primaryFacility.name)||u.facilityName||'Johannesburg CHC';

  /* ── Enrich patient from API if nationalId or dateOfBirth is missing ── */
  if (p && (!p.nationalId && !p.idNumber && !p.id_number) && (p._id||p.id) && !p._enriching) {
    var _enrichId = p._id || p.id;
    p._enriching = true;
    API.patients.get(_enrichId).then(function(res){
      var full = (res && res.data) ? res.data : res;
      if (!full) return;
      /* Merge the full record into the patient objects in state */
      Object.assign(p, full);
      if (_D.consultPat && (_D.consultPat._id||_D.consultPat.id) === _enrichId) Object.assign(_D.consultPat, full);
      if (_D.selectedPat && (_D.selectedPat._id||_D.selectedPat.id) === _enrichId) Object.assign(_D.selectedPat, full);
      delete p._enriching;
      _dRender();
    }).catch(function(){ delete p._enriching; });
  }

  /* Resolve patient */
  var patFirst  = p ? (p.firstName||p.first_name||p.name||'') : '';
  var patLast   = p ? (p.lastName||p.last_name||p.surname||'') : '';
  var patName   = p ? (p.fullName||((patFirst+(patLast?' '+patLast:'')).trim())||p.name||'—') : '—';
  var patId     = p ? (p.nationalId||p.idNumber||p.id_number||p.passport||p.mrn||p._id||p.id||'—') : '—';
  var patDob    = p && (p.dateOfBirth||p.date_of_birth||p.dob)
    ? new Date(p.dateOfBirth||p.date_of_birth||p.dob).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})
    : '—';

  /* Vital signs (from nurse record if present) */
  var vitals = p && p.vitals ? p.vitals : null;
  var vBp     = vitals ? (vitals.bp||vitals.bloodPressure||'') : '';
  var vHr     = vitals ? (vitals.hr||vitals.pulse||vitals.heartRate||'') : '';
  var vTemp   = vitals ? (vitals.temp||vitals.temperature||'') : '';
  var vSpo2   = vitals ? (vitals.spo2||vitals.oxygenSaturation||'') : '';
  var vRr     = vitals ? (vitals.rr||vitals.respiratoryRate||'') : '';
  var vWt     = vitals ? (vitals.weight||'') : '';
  var hasFlagged = p && p.flags && p.flags.length > 0;

  /* Field helpers */
  function _csF(id,label,ph,type,val){
    return '<div>'+
      '<label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:5px">'+label+'</label>'+
      '<input id="'+id+'" type="'+(type||'text')+'" placeholder="'+(ph||'')+'"'+(val?' value="'+val+'"':'')+' style="width:100%;padding:10px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;background:#fff;color:'+C.text+'">'+
    '</div>';
  }
  function _csS(id,label,opts,val){
    return '<div>'+
      '<label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:5px">'+label+'</label>'+
      '<select id="'+id+'" style="width:100%;padding:10px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;background:#fff;color:'+C.text+'">'+
        opts.map(function(o){return '<option value="'+o+'"'+(o===val?' selected':'')+'>'+o+'</option>';}).join('')+
      '</select>'+
    '</div>';
  }
  function _csTa(id,label,ph,rows,val){
    return '<div>'+
      '<label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:5px">'+label+'</label>'+
      '<textarea id="'+id+'" rows="'+(rows||3)+'" placeholder="'+(ph||'')+'" style="width:100%;padding:10px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;background:#fff;color:'+C.text+';resize:vertical">'+(val||'')+'</textarea>'+
    '</div>';
  }
  function _csRO(label,value){
    return '<div>'+
      '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C.muted+';margin-bottom:4px">'+label+'</div>'+
      '<div style="font-size:14px;font-weight:700;color:'+C.text+'">'+value+'</div>'+
    '</div>';
  }
  function _csCard(title,content){
    return '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px;margin-bottom:16px">'+
      (title?'<div style="font-size:15px;font-weight:800;color:'+C.text+';margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid '+C.border+'">'+title+'</div>':'')+
      content+
    '</div>';
  }

  var consultTypes = ['New Consultation','Follow-Up','Emergency','Chronic Care','Post-Discharge','Telemedicine','Other'];
  var outcomes     = ['Diagnosis Required','Investigation Required','Medication Required',
                      'Referral Required','Follow-Up Required','Emergency Escalation','No Further Action'];

  /* ── Sidebar ── */
  var wfSteps = [
    {key:'consult',    label:'Consultation', active:true},
    {key:'diagnosis',  label:'Diagnosis',    active:false},
    {key:'orders',     label:'Lab & Radiology',active:false},
    {key:'referral',   label:'Referral',     active:false},
    {key:'followup',   label:'Follow-Up',    active:false},
    {key:'appointment',label:'Appointment',  active:false},
  ];
  var sidebar =
    '<div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">'+
      /* Clinician card */
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Clinician Details</div>'+
        '<div style="display:flex;flex-direction:column;gap:10px">'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:3px">Consulting Clinician</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+(docName||'—')+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:3px">HPCSA / Reg. No.</div>'+
            '<div style="font-size:12px;font-weight:600;color:'+(docHpcsa?C.text:C.muted)+';font-family:monospace">'+(docHpcsa||'Not on record')+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:3px">Facility</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+(docFacility||'—')+'</div></div>'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:3px">Date</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+todayFmt+'</div></div>'+
        '</div>'+
      '</div>'+
      /* Clinical workflow tracker */
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Clinical Workflow</div>'+
        '<div style="display:flex;flex-direction:column;gap:6px">'+
          wfSteps.map(function(s){
            var icon = s.active ? '→' : '○';
            var col  = s.active ? C.teal : C.muted;
            var wt   = s.active ? '800' : '500';
            return '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;background:'+(s.active?C.blueLt:'transparent')+';border:1.5px solid '+(s.active?C.teal:'transparent')+'">'+
              '<span style="color:'+col+';font-size:12px;font-weight:700;width:14px;text-align:center">'+icon+'</span>'+
              '<span style="font-size:12px;font-weight:'+wt+';color:'+col+'">'+s.label+'</span>'+
            '</div>';
          }).join('')+
        '</div>'+
      '</div>'+
    '</div>';

  /* ── No patient state ── */
  if (!p) {
    return _dHeader('Clinical Consultation','Consultation management · Clinical record','') +
      '<div style="flex:1;overflow:auto;padding:16px 20px;display:flex;gap:16px">'+
        '<div style="flex:1;min-width:0;display:flex;align-items:center;justify-content:center">'+
          '<div style="text-align:center;color:'+C.muted+'">'+
            '<div style="font-size:48px;margin-bottom:12px">🩺</div>'+
            '<div style="font-size:15px;font-weight:700;color:'+C.text+';margin-bottom:4px">Select a patient to begin consultation</div>'+
            '<div style="font-size:13px">Patients appear here after a nurse records vitals</div>'+
          '</div>'+
        '</div>'+
        sidebar+
      '</div>';
  }

  /* ── Main form ── */
  var mainCol =
    '<div style="flex:1;min-width:0">'+

    /* Patient Banner */
    '<div style="background:'+C.blueLt+';border:1.5px solid '+C.blueBd+';border-radius:12px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px">'+
      '<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,'+C.teal+' 0%,#1A4A9B 100%);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;flex-shrink:0">'+
        (patName!=='—' ? patName.split(' ').map(function(n){return n[0]||'';}).join('').slice(0,2).toUpperCase() : '?')+
      '</div>'+
      '<div style="flex:1">'+
        '<div style="font-size:15px;font-weight:800;color:'+C.text+'">'+patName+'</div>'+
        '<div style="font-size:12px;color:'+C.muted+'">ID: '+patId+' · DOB: '+patDob+(p&&p.sex?' · '+(p.sex||p.gender||''):'')+'</div>'+
      '</div>'+
      (hasFlagged?'<span style="padding:3px 10px;border-radius:8px;background:#fee2e2;color:'+C.red+';font-size:11px;font-weight:700">⚑ FLAGGED VITALS</span>':
       (p&&p.mlRiskLevel?'<span style="padding:3px 10px;border-radius:8px;font-size:11px;font-weight:700;background:'+(p.mlRiskLevel==='HIGH'?'#fee2e2':p.mlRiskLevel==='MEDIUM'?'#fef3c7':'#dcfce7')+';color:'+(p.mlRiskLevel==='HIGH'?C.red:p.mlRiskLevel==='MEDIUM'?C.amber:C.green)+'">'+(p.mlRiskLevel==='HIGH'?'⚠ HIGH RISK':p.mlRiskLevel==='MEDIUM'?'⚡ MEDIUM RISK':'✓ LOW RISK')+'</span>':''))+
      '<button onclick="_D.consultPat=null;_D.selectedPat=null;_D.consultPatId=null;_dRender()" style="font-size:11px;color:'+C.muted+';border:1px solid '+C.border+';background:#fff;border-radius:6px;padding:5px 12px;cursor:pointer;font-family:inherit">Change patient</button>'+
    '</div>'+

    /* 1. Consultation Details */
    _csCard('Consultation Details',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">'+
        _csF('cs-date','Consultation Date','','date',todayIso)+
        _csF('cs-time','Consultation Time','','time',timeNow)+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">'+
        _csS('cs-type','Consultation Type',consultTypes,'New Consultation')+
        _csF('cs-clinician','Clinician','e.g. Dr. Thabo Mokoena','text',docName)+
        _csF('cs-reg','Professional Registration No.','e.g. MP 1234567','text',docHpcsa)+
      '</div>'+
      '<div style="margin-top:12px">'+
        _csF('cs-facility','Facility / Clinic','e.g. District Hospital','text',docFacility)+
      '</div>'
    )+

    /* 2. Chief Complaint */
    _csCard('Chief Complaint',
      _csTa('cs-complaint','Chief Complaint','Describe the main reason for today\'s visit…',3,'')
    )+

    /* 3. History of Presenting Complaint */
    _csCard('History of Presenting Complaint',
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">'+
        _csF('cs-onset','Onset','e.g. 3 days ago')+
        _csF('cs-duration','Duration','e.g. 3 days')+
        _csF('cs-severity','Severity','Mild / Moderate / Severe')+
      '</div>'+
      _csTa('cs-symptoms','Symptoms','Describe all symptoms reported by the patient…',3)+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">'+
        _csTa('cs-medhistory','Relevant Medical History','Past diagnoses, surgeries, hospitalisations…',3)+
        _csTa('cs-currentmeds','Current Medications','List all current medications and dosages…',3)+
      '</div>'+
      '<div style="margin-top:12px">'+
        '<label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:8px">Allergies</label>'+
        '<div style="display:flex;gap:20px;margin-bottom:8px">'+
          '<label style="font-size:13px;color:'+C.text+';display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="cs-allergy-opt" value="none" checked> No Known Allergies</label>'+
          '<label style="font-size:13px;color:'+C.text+';display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="cs-allergy-opt" value="known"> Known Allergies</label>'+
        '</div>'+
        _csF('cs-allergies','Allergy Details','Specify allergen and reaction type if known','text','')+
      '</div>'
    )+

    /* 4. Vital Signs */
    '<div style="background:#fff;border:1.5px solid '+(hasFlagged?C.red:C.border)+';border-radius:12px;padding:20px 24px;margin-bottom:16px">'+
      '<div style="font-size:15px;font-weight:800;color:'+C.text+';margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid '+C.border+'">'+
        (hasFlagged?'⚑ Vital Signs — Flagged Abnormals':'Vital Signs')+
        (vitals?'<span style="font-size:11px;font-weight:500;color:'+C.muted+';margin-left:10px">Recorded by Nurse Station</span>':
          '<span style="font-size:11px;font-weight:500;color:'+C.amber+';margin-left:10px">Enter manually if not recorded</span>')+
      '</div>'+
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">'+
        (function(){
          var vRows = [
            {id:'cs-v-bp',   label:'Blood Pressure',    unit:'mmHg', val:vBp,   ph:'e.g. 118/76'},
            {id:'cs-v-hr',   label:'Pulse / HR',        unit:'bpm',  val:vHr,   ph:'e.g. 88'},
            {id:'cs-v-temp', label:'Temperature',       unit:'°C',   val:vTemp, ph:'e.g. 38.0'},
            {id:'cs-v-spo2', label:'SpO₂',              unit:'%',    val:vSpo2, ph:'e.g. 97'},
            {id:'cs-v-rr',   label:'Respiratory Rate',  unit:'/min', val:vRr,   ph:'e.g. 18'},
            {id:'cs-v-wt',   label:'Weight',            unit:'kg',   val:vWt,   ph:'Not recorded'},
          ];
          return vRows.map(function(r){
            return '<div style="background:#f8fafc;border:1.5px solid '+C.border+';border-radius:10px;padding:14px">'+
              '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:'+C.muted+';margin-bottom:6px">'+r.label+'</div>'+
              '<div style="display:flex;align-items:center;gap:8px">'+
                '<input id="'+r.id+'" type="text" value="'+(r.val||'')+'" placeholder="'+r.ph+'" style="flex:1;min-width:0;padding:8px 10px;border:1.5px solid '+C.border+';border-radius:7px;font-size:15px;font-weight:700;font-family:inherit;outline:none;background:#fff;color:'+C.text+'">'+
                '<span style="font-size:11px;color:'+C.muted+';white-space:nowrap;font-weight:600">'+r.unit+'</span>'+
              '</div>'+
            '</div>';
          }).join('');
        })()+
      '</div>'+
    '</div>'+

    /* 5. Clinical Examination */
    _csCard('Clinical Examination',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
        _csTa('cs-general','General Examination','General appearance, nutrition, hydration, consciousness…',4)+
        _csTa('cs-systems','System Examination','Cardiovascular, respiratory, abdominal, neurological findings…',4)+
      '</div>'
    )+

    /* 6. Clinician Notes */
    _csCard('Clinician Notes',
      _csTa('cs-notes','Notes','Additional observations, clinical reasoning, and clinical impression…',4)
    )+

    /* 7. Consultation Outcome */
    _csCard('Consultation Outcome',
      '<div style="display:flex;flex-wrap:wrap;gap:10px">'+
        outcomes.map(function(o){
          return '<label style="display:flex;align-items:center;gap:6px;font-size:13px;color:'+C.text+';cursor:pointer;padding:8px 14px;border:1.5px solid '+C.border+';border-radius:8px;background:#f8fafc">'+
            '<input type="checkbox" value="'+o+'" class="cs-outcome" style="cursor:pointer"> '+o+'</label>';
        }).join('')+
      '</div>'
    )+

    /* Actions */
    '<div style="display:flex;gap:10px;padding-bottom:24px">'+
      '<button id="btn-save-consult" onclick="_dSaveConsult()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>'+
        'Save Consultation &amp; Continue to Diagnosis'+
      '</button>'+
      '<button onclick="_D.view=\'dashboard\';_dRender()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center">Cancel</button>'+
    '</div>'+

    '</div>'; /* end mainCol */

  /* ── Auto-fill doctor fields from DB after render ── */
  setTimeout(function() {
    /* 1. Try to fill from already-stored user first (instant, no network) */
    var _u = _dGetUser();
    function _fillIfEmpty(id, val) {
      if (!val) return;
      var el = document.getElementById(id);
      if (el && !el.value) el.value = val;
    }
    var _storedName     = _u.firstName ? 'Dr ' + ((_u.firstName || '') + ' ' + (_u.lastName || '')).trim() : (_u.name || '');
    var _storedHpcsa    = _u.hpcsaNumber || _u.hpcsa || _u.registrationNumber || _u.regNo || _u.licenseNumber || '';
    var _storedFacility = (typeof _u.facility === 'string' ? _u.facility : '') || (_u.facility && _u.facility.name) || _u.facilityName || '';
    _fillIfEmpty('cs-clinician', _storedName);
    _fillIfEmpty('cs-reg',       _storedHpcsa);
    _fillIfEmpty('cs-facility',  _storedFacility);

    /* 2. Then fetch full profile from DB and overwrite if richer data is available */
    if (window.API && window.API._fetchDirect) {
      API._fetchDirect('/users/me', { method: 'GET' }).then(function(res) {
        var prof = (res && res.data) ? res.data : (res && res.user) ? res.user : res;
        if (!prof) return;
        /* Merge fresh data back into stored user so other views benefit too */
        try {
          if (window.API.storeUser) { API.storeUser(Object.assign({}, _u, prof)); }
        } catch(_) {}
        var freshName     = prof.firstName ? 'Dr ' + ((prof.firstName || '') + ' ' + (prof.lastName || '')).trim() : (prof.name || _storedName);
        var freshHpcsa    = prof.hpcsaNumber || prof.hpcsa || prof.registrationNumber || prof.regNo || prof.licenseNumber || _storedHpcsa;
        var freshFacility = (typeof prof.facility === 'string' ? prof.facility : '') || (prof.facility && prof.facility.name) || prof.facilityName || _storedFacility;
        _fillIfEmpty('cs-clinician', freshName);
        _fillIfEmpty('cs-reg',       freshHpcsa);
        _fillIfEmpty('cs-facility',  freshFacility);
        /* Force-fill if the stored value was empty and DB has it */
        if (freshName && document.getElementById('cs-clinician') && !document.getElementById('cs-clinician').value)
          document.getElementById('cs-clinician').value = freshName;
        if (freshHpcsa && document.getElementById('cs-reg') && !document.getElementById('cs-reg').value)
          document.getElementById('cs-reg').value = freshHpcsa;
        if (freshFacility && document.getElementById('cs-facility') && !document.getElementById('cs-facility').value)
          document.getElementById('cs-facility').value = freshFacility;
      }).catch(function() { /* silently ignore — fields stay as-is */ });
    }
  }, 50);

  return _dHeader('Clinical Consultation','Consultation management · Clinical record','')+
    '<div style="flex:1;overflow:auto;padding:16px 20px;display:flex;gap:16px">'+
      mainCol+
      sidebar+
    '</div>';
}


/* ── Prescription helpers ── */
var _rxRoutes = [
  '','Oral (PO)','Sublingual (SL)','Topical','Inhalation',
  'Intravenous (IV)','Intramuscular (IM)','Subcutaneous (SC)','Rectal (PR)',
  'Ophthalmic','Otic','Nasal','Other'
];
var _rxFreqs = [
  '','Once only (single dose)','Once daily (OD)','Twice daily (BD)','Three times daily (TDS)','Four times daily (QID)',
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
  return '<div>'+_rxLabel(label,required)+'<select id="'+id+'" style="'+_rxFieldStyle()+'">'+opts.map(function(o){return o===''?'<option value="">Select...</option>':'<option value="'+o+'">'+o+'</option>';}).join('')+'</select></div>';
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
  /* Reset submit guard every time the prescription form renders */
  _rxSubmitting = false;
  var p    = _D.consultPat;
  var u    = _dGetUser();
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

  /* Prescriber — prefer the name saved from the consultation form, then login user */
  var docName     = (_D.workflow && _D.workflow.consultation && _D.workflow.consultation.clinician) ||
    (u.firstName
      ? ('Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim())
      : (u.name||u.displayName||u.fullName||u.username||'—'));
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
          '<button id="rx-submit-btn" type="button" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'+
            'Submit Prescription'+
          '</button>'+
          '<button onclick="_D.view=\'medical_notes\';_dRender()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'+
            'Back to Diagnosis &amp; Clinical Assessment'+
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
  var u3   = _dGetUser();
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
    var u2          = _dGetUser();
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
            '<button onclick="_D.labNewOrder=false;_D.view=\'medical_notes\';_dRender()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'+
              'Back to Diagnosis &amp; Clinical Assessment'+
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

    /* Read-only field helper for detail view */
    function _lov(label,value){
      return '<div>'+
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C.muted+';margin-bottom:4px">'+label+'</div>'+
        '<div style="font-size:14px;font-weight:700;color:'+C.text+'">'+value+'</div>'+
      '</div>';
    }
    function _lovCard(title,content){
      return '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px;margin-bottom:16px">'+
        '<div style="font-size:15px;font-weight:800;color:'+C.text+';margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid '+C.border+'">'+title+'</div>'+
        content+
      '</div>';
    }

    /* Format DOB */
    var dobFmt = o.dob
      ? (function(){ try { return new Date(o.dob).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}); } catch(_){ return o.dob; } })()
      : '—';

    /* Sidebar */
    var detailSidebar =
      '<div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">'+
        /* Order summary card */
        '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
          '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Order Summary</div>'+
          '<div style="display:flex;flex-direction:column;gap:10px">'+
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:3px">Order No.</div>'+
              '<div style="font-size:12px;font-weight:700;color:'+C.text+';font-family:monospace">'+o.id+'</div></div>'+
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:3px">Status</div>'+
              '<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:'+st.bg+';color:'+st.c+';border:1px solid '+st.bd+'">'+st.l+'</span></div>'+
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:3px">Priority</div>'+
              '<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:'+pr.bg+';color:'+pr.c+'">'+o.priority+'</span></div>'+
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:3px">Date Ordered</div>'+
              '<div style="font-size:12px;font-weight:700;color:'+C.text+'">'+o.date+'</div></div>'+
          '</div>'+
        '</div>'+
        /* Clinical workflow tracker */
        '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
          '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Clinical Workflow</div>'+
          '<div style="display:flex;flex-direction:column;gap:6px">'+
            ['Consultation','Diagnosis','Lab Orders','Radiology','Prescription','Referral','Follow-Up'].map(function(step){
              var active = step==='Lab Orders';
              var done   = ['Consultation','Diagnosis'].indexOf(step)>-1;
              var icon   = done?'✓':(active?'→':'○');
              var col    = active?C.teal:(done?C.green:C.muted);
              var wt     = active?'800':(done?'600':'500');
              return '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;background:'+(active?C.blueLt:'transparent')+';border:1.5px solid '+(active?C.teal:'transparent')+'">'+
                '<span style="color:'+col+';font-size:12px;font-weight:700;width:14px;text-align:center">'+icon+'</span>'+
                '<span style="font-size:12px;font-weight:'+wt+';color:'+col+'">'+step+'</span>'+
              '</div>';
            }).join('')+
          '</div>'+
        '</div>'+
      '</div>';

    /* Result panel content */
    var resultPanel = o.status==='completed'
      ? '<div style="background:'+C.greenLt+';border:1.5px solid '+C.greenBd+';border-radius:10px;padding:16px">'+
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'+
            '<span style="font-size:20px">✅</span>'+
            '<div style="font-size:14px;font-weight:800;color:'+C.green+'">Test completed</div>'+
          '</div>'+
          '<div style="font-size:13px;color:#065f46;line-height:1.6;margin-bottom:16px">'+
            'The laboratory order is marked as completed. View the report for the actual test values and interpretation.'+
          '</div>'+
          (o.resultId
            ? '<button onclick="window._lrDetailView=\''+o.resultId+'\';_setView(\'lab_results\')" '+
                'style="display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border:none;border-radius:10px;background:linear-gradient(135deg,'+C.teal+' 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">'+
                '📊 View Result'+
              '</button>'
            : '<div style="font-size:13px;color:'+C.muted+'">Result document not yet linked.</div>')+
        '</div>'
      : o.status==='in_progress'
        ? '<div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:16px;display:flex;align-items:center;gap:12px">'+
            '<span style="font-size:24px">🔬</span>'+
            '<div>'+
              '<div style="font-size:14px;font-weight:700;color:#1d4ed8;margin-bottom:4px">Processing in laboratory</div>'+
              '<div style="font-size:13px;color:#1d4ed8">The specimen is being analysed. Results will be available once processing is complete.</div>'+
            '</div>'+
          '</div>'
        : '<div style="background:#fff7ed;border:1.5px solid #fde68a;border-radius:10px;padding:16px;display:flex;align-items:center;gap:12px">'+
            '<span style="font-size:24px">🕐</span>'+
            '<div>'+
              '<div style="font-size:14px;font-weight:700;color:#92400e;margin-bottom:4px">Awaiting specimen collection</div>'+
              '<div style="font-size:13px;color:#92400e">The order has been submitted. Results will appear here once the laboratory processes the specimen.</div>'+
            '</div>'+
          '</div>';

    return _dHeader('Lab Order Detail','Laboratory requests and tracking',
        '<button onclick="window._labOrdersView=null;if(typeof _dRender===\'function\')_dRender()" style="padding:7px 16px;border:1.5px solid '+C.border+';border-radius:8px;background:#fff;font-size:13px;font-weight:600;color:'+C.muted+';cursor:pointer;font-family:inherit">← Back to Orders</button>')+
      '<div style="flex:1;overflow:auto;padding:16px 20px;display:flex;gap:16px;align-items:flex-start">'+

        /* Main column */
        '<div style="flex:1;min-width:0">'+

          /* Title + status row */
          '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px;margin-bottom:16px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px">'+
            '<div>'+
              '<div style="font-size:18px;font-weight:800;color:'+C.text+'">'+o.test+'</div>'+
              '<div style="font-size:12px;font-family:monospace;color:'+C.muted+';margin-top:4px">Order No: '+o.id+'</div>'+
            '</div>'+
            '<span style="padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;background:'+st.bg+';color:'+st.c+';border:1px solid '+st.bd+';flex-shrink:0">'+st.l+'</span>'+
          '</div>'+

          /* Patient Information */
          _lovCard('Patient Information',
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'+
              _lov('Patient Name',o.patient)+
              _lov('Patient ID',o.patId)+
              _lov('Date of Birth',dobFmt)+
              _lov('Date Ordered',o.date)+
            '</div>'
          )+

          /* Order Details */
          _lovCard('Order Details',
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px">'+
              _lov('Laboratory Test',o.test)+
              _lov('Specimen',o.specimen)+
              _lov('Priority','<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:'+pr.bg+';color:'+pr.c+'">'+o.priority+'</span>')+
            '</div>'+
            _lov('Clinical Indication',o.indication)
          )+

          /* Ordering Information */
          _lovCard('Ordering Information',
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'+
              _lov('Ordering Doctor',o.doctor)+
              _lov('Facility',o.facility)+
            '</div>'
          )+

          /* Laboratory Result */
          _lovCard('Laboratory Result', resultPanel)+

          /* Actions row */
          '<div style="display:flex;gap:10px;padding-bottom:24px">'+
            '<button onclick="window._labOrdersView=null;if(typeof _dRender===\'function\')_dRender()" style="padding:11px 22px;border:1.5px solid '+C.border+';border-radius:10px;background:#fff;font-size:13px;font-weight:600;color:'+C.muted+';cursor:pointer;font-family:inherit">← Back to Orders</button>'+
            (o.resultId&&o.status==='completed'
              ? '<button onclick="window._lrDetailView=\''+o.resultId+'\';_setView(\'lab_results\')" style="padding:11px 22px;border:none;border-radius:10px;background:linear-gradient(135deg,'+C.teal+' 0%,#1A4A9B 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">📊 View Result</button>'
              : '')+
          '</div>'+

        '</div>'+
        detailSidebar+
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
  /* ── Sample radiology orders (illustrative only) ── */
  var RAD_ORDERS = [
    {id:'RAD-2026-0071',test:'Chest X-Ray',          patient:'Thabo Mokoena', patId:'PT-00231',dob:'1985-03-12',date:'11 Oct 2026',modality:'X-Ray (Radiography)',region:'Chest',  priority:'Routine',status:'completed',  indication:'Persistent cough, rule out TB / pneumonia',          doctor:'Dr Molefe',facility:'Johannesburg CHC',reportId:'RPT-071'},
    {id:'RAD-2026-0072',test:'CT Head',               patient:'Nomsa Dlamini', patId:'PT-00187',dob:'1972-07-28',date:'11 Oct 2026',modality:'CT Scan',             region:'Head / Brain',priority:'Urgent', status:'in_progress',indication:'Acute onset severe headache, rule out bleed',        doctor:'Dr Molefe',facility:'Johannesburg CHC',reportId:''},
    {id:'RAD-2026-0073',test:'Abdominal Ultrasound',  patient:'Peter Nkosi',   patId:'PT-00304',dob:'1990-11-05',date:'11 Oct 2026',modality:'Ultrasound',           region:'Abdomen', priority:'Routine',status:'pending',     indication:'RUQ pain, cholecystitis query',                     doctor:'Dr Molefe',facility:'Johannesburg CHC',reportId:''},
    {id:'RAD-2026-0074',test:'Lumbar Spine MRI',      patient:'Lerato Molefe', patId:'PT-00412',dob:'1998-02-19',date:'10 Oct 2026',modality:'MRI',                  region:'Lumbar Spine',priority:'Routine',status:'completed',  indication:'Chronic low back pain with radiculopathy',          doctor:'Dr Molefe',facility:'Johannesburg CHC',reportId:'RPT-074'},
    {id:'RAD-2026-0075',test:'Pelvis X-Ray',          patient:'Kagiso Sithole',patId:'PT-00089',dob:'1994-09-30',date:'10 Oct 2026',modality:'X-Ray (Radiography)',  region:'Pelvis',  priority:'Routine',status:'pending',     indication:'Hip pain after fall',                               doctor:'Dr Molefe',facility:'Johannesburg CHC',reportId:''},
    {id:'RAD-2026-0076',test:'Liver Ultrasound',      patient:'Amina Hassan',  patId:'PT-00556',dob:'1968-05-14',date:'09 Oct 2026',modality:'Ultrasound',           region:'Upper Abdomen',priority:'Urgent',status:'completed',  indication:'Jaundice workup, hepatomegaly on examination',      doctor:'Dr Molefe',facility:'Johannesburg CHC',reportId:'RPT-076'},
    {id:'RAD-2026-0077',test:'Chest X-Ray',           patient:'Sipho Ndlovu',  patId:'PT-00073',dob:'1979-12-22',date:'09 Oct 2026',modality:'X-Ray (Radiography)',  region:'Chest',   priority:'Urgent', status:'in_progress',indication:'Post-TB treatment, surveillance imaging',            doctor:'Dr Molefe',facility:'Johannesburg CHC',reportId:''},
    {id:'RAD-2026-0078',test:'Echocardiogram',        patient:'Grace Mahlangu',patId:'PT-00341',dob:'1983-08-07',date:'08 Oct 2026',modality:'Echocardiogram (Echo)',region:'Heart — transthoracic',priority:'Routine',status:'in_progress',indication:'Dyspnoea, suspected cardiomyopathy',       doctor:'Dr Molefe',facility:'Johannesburg CHC',reportId:''},
  ];

  window._radOrdersTab  = window._radOrdersTab  || 'all';
  window._radOrdersView = window._radOrdersView !== undefined ? window._radOrdersView : null;

  /* ── Patient resolution ── */
  var radPat     = _D.consultPat || _D.pat360Data || _D.selectedPat || null;
  var radPatName = radPat ? ((radPat.firstName||radPat.name||'')+' '+(radPat.lastName||'')).trim()||'—' : '—';
  var radPatId   = radPat ? (radPat.mrn||radPat._id||radPat.id||'—') : '—';
  var radPatDob  = radPat && radPat.dateOfBirth
    ? new Date(radPat.dateOfBirth).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}) : '—';
  var today      = new Date().toISOString().slice(0,10);
  var todayFmt   = new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});
  var u          = _dGetUser();
  var docName    = u.firstName?('Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim()):(u.name||'—');
  var docFacility= (typeof u.facility==='string'?u.facility:'')|| (u.facility&&u.facility.name)||u.facilityName||'Current healthcare facility';
  var docHpcsa   = u.hpcsaNumber||u.hpcsa||u.registrationNumber||'';

  var stCfg={pending:{l:'Pending',bg:'#FFF7ED',c:'#92400E',bd:'#FDE68A'},in_progress:{l:'In Progress',bg:'#EFF6FF',c:'#1D4ED8',bd:'#BFDBFE'},completed:{l:'Completed',bg:'#ECFDF5',c:'#065f46',bd:'#A7F3D0'}};
  var prCfg={Routine:{bg:'#F0FDF4',c:'#166534'},Urgent:{bg:'#FEF3C7',c:'#92400E'},Emergency:{bg:'#FEE2E2',c:'#991B1B'}};

  /* ══════════════════════════════════════════════════════════
     NEW RADIOLOGY ORDER FORM  (entered via _D.radNewOrder=true)
  ══════════════════════════════════════════════════════════ */
  if(!_D.radNewOrder && window._radOrdersView === null && window._radOrdersTab !== undefined){
    /* fall through to list or detail below */
  }

  /* ── Detail view ── */
  if(!_D.radNewOrder && window._radOrdersView){
    var ro  = RAD_ORDERS.find(function(x){return x.id===window._radOrdersView;})||RAD_ORDERS[0];
    var rst = stCfg[ro.status]||stCfg.pending;
    var rpr = prCfg[ro.priority]||prCfg.Routine;

    var dobFmtR = ro.dob
      ? (function(){ try{ return new Date(ro.dob).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}); }catch(_){ return ro.dob; } })()
      : '—';

    function _rov(label,value){
      return '<div>'+
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C.muted+';margin-bottom:4px">'+label+'</div>'+
        '<div style="font-size:14px;font-weight:700;color:'+C.text+'">'+value+'</div>'+
      '</div>';
    }
    function _rovCard(title,content){
      return '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px;margin-bottom:16px">'+
        '<div style="font-size:15px;font-weight:800;color:'+C.text+';margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid '+C.border+'">'+title+'</div>'+
        content+
      '</div>';
    }

    var radDetailSidebar =
      '<div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">'+
        '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
          '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Order Summary</div>'+
          '<div style="display:flex;flex-direction:column;gap:10px">'+
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:3px">Order No.</div>'+
              '<div style="font-size:12px;font-weight:700;color:'+C.text+';font-family:monospace">'+ro.id+'</div></div>'+
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:3px">Status</div>'+
              '<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:'+rst.bg+';color:'+rst.c+';border:1px solid '+rst.bd+'">'+rst.l+'</span></div>'+
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:3px">Priority</div>'+
              '<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:'+rpr.bg+';color:'+rpr.c+'">'+ro.priority+'</span></div>'+
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:3px">Date Ordered</div>'+
              '<div style="font-size:12px;font-weight:700;color:'+C.text+'">'+ro.date+'</div></div>'+
          '</div>'+
        '</div>'+
        '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
          '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Clinical Workflow</div>'+
          '<div style="display:flex;flex-direction:column;gap:6px">'+
            ['Consultation','Diagnosis','Lab Orders','Radiology','Prescription','Referral','Follow-Up'].map(function(step){
              var active = step==='Radiology';
              var done   = ['Consultation','Diagnosis','Lab Orders'].indexOf(step)>-1;
              var icon   = done?'✓':(active?'→':'○');
              var col    = active?C.teal:(done?C.green:C.muted);
              var wt     = active?'800':(done?'600':'500');
              return '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;background:'+(active?C.blueLt:'transparent')+';border:1.5px solid '+(active?C.teal:'transparent')+'">'+
                '<span style="color:'+col+';font-size:12px;font-weight:700;width:14px;text-align:center">'+icon+'</span>'+
                '<span style="font-size:12px;font-weight:'+wt+';color:'+col+'">'+step+'</span>'+
              '</div>';
            }).join('')+
          '</div>'+
        '</div>'+
      '</div>';

    var radResultPanel = ro.status==='completed'
      ? '<div style="background:'+C.greenLt+';border:1.5px solid '+C.greenBd+';border-radius:10px;padding:16px">'+
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'+
            '<span style="font-size:20px">✅</span>'+
            '<div style="font-size:14px;font-weight:800;color:'+C.green+'">Imaging completed</div>'+
          '</div>'+
          '<div style="font-size:13px;color:#065f46;line-height:1.6;margin-bottom:16px">'+
            'The radiology order is marked as completed. View the report for the radiologist\'s findings and interpretation.'+
          '</div>'+
          (ro.reportId
            ? '<button onclick="if(window.UI&&UI.showToast)UI.showToast(\'Opening report '+ro.reportId+'…\',\'ok\')" '+
                'style="display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border:none;border-radius:10px;background:linear-gradient(135deg,'+C.teal+' 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">'+
                '🩻 View Report'+
              '</button>'
            : '<div style="font-size:13px;color:'+C.muted+'">Report not yet linked.</div>')+
        '</div>'
      : ro.status==='in_progress'
        ? '<div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:16px;display:flex;align-items:center;gap:12px">'+
            '<span style="font-size:24px">🩻</span>'+
            '<div>'+
              '<div style="font-size:14px;font-weight:700;color:#1d4ed8;margin-bottom:4px">Being processed by radiology</div>'+
              '<div style="font-size:13px;color:#1d4ed8">The request has been received by the radiology department. A report will be available once imaging is complete.</div>'+
            '</div>'+
          '</div>'
        : '<div style="background:#fff7ed;border:1.5px solid #fde68a;border-radius:10px;padding:16px;display:flex;align-items:center;gap:12px">'+
            '<span style="font-size:24px">🕐</span>'+
            '<div>'+
              '<div style="font-size:14px;font-weight:700;color:#92400e;margin-bottom:4px">Awaiting imaging</div>'+
              '<div style="font-size:13px;color:#92400e">The order has been submitted. The radiology report will appear here once imaging is performed and interpreted.</div>'+
            '</div>'+
          '</div>';

    return _dHeader('Radiology Order Detail','Imaging requests and tracking',
        '<button onclick="window._radOrdersView=null;if(typeof _dRender===\'function\')_dRender()" style="padding:7px 16px;border:1.5px solid '+C.border+';border-radius:8px;background:#fff;font-size:13px;font-weight:600;color:'+C.muted+';cursor:pointer;font-family:inherit">← Back to Orders</button>')+
      '<div style="flex:1;overflow:auto;padding:16px 20px;display:flex;gap:16px;align-items:flex-start">'+
        '<div style="flex:1;min-width:0">'+

          /* Title + status */
          '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px;margin-bottom:16px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px">'+
            '<div>'+
              '<div style="font-size:18px;font-weight:800;color:'+C.text+'">'+ro.test+'</div>'+
              '<div style="font-size:12px;font-family:monospace;color:'+C.muted+';margin-top:4px">Order No: '+ro.id+'</div>'+
            '</div>'+
            '<span style="padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;background:'+rst.bg+';color:'+rst.c+';border:1px solid '+rst.bd+';flex-shrink:0">'+rst.l+'</span>'+
          '</div>'+

          /* Patient Information */
          _rovCard('Patient Information',
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'+
              _rov('Patient Name',ro.patient)+
              _rov('Patient ID',ro.patId)+
              _rov('Date of Birth',dobFmtR)+
              _rov('Date Ordered',ro.date)+
            '</div>'
          )+

          /* Order Details */
          _rovCard('Order Details',
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px">'+
              _rov('Modality',ro.modality)+
              _rov('Region / Body Part',ro.region)+
              _rov('Priority','<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:'+rpr.bg+';color:'+rpr.c+'">'+ro.priority+'</span>')+
            '</div>'+
            _rov('Clinical Indication',ro.indication)
          )+

          /* Ordering Information */
          _rovCard('Ordering Information',
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'+
              _rov('Ordering Doctor',ro.doctor)+
              _rov('Facility',ro.facility)+
            '</div>'
          )+

          /* Radiology Report */
          _rovCard('Radiology Report', radResultPanel)+

          /* Actions */
          '<div style="display:flex;gap:10px;padding-bottom:24px">'+
            '<button onclick="window._radOrdersView=null;if(typeof _dRender===\'function\')_dRender()" style="padding:11px 22px;border:1.5px solid '+C.border+';border-radius:10px;background:#fff;font-size:13px;font-weight:600;color:'+C.muted+';cursor:pointer;font-family:inherit">← Back to Orders</button>'+
            (ro.reportId&&ro.status==='completed'
              ? '<button onclick="if(window.UI&&UI.showToast)UI.showToast(\'Opening report '+ro.reportId+'…\',\'ok\')" style="padding:11px 22px;border:none;border-radius:10px;background:linear-gradient(135deg,'+C.teal+' 0%,#1A4A9B 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">🩻 View Report</button>'
              : '')+
          '</div>'+
        '</div>'+
        radDetailSidebar+
      '</div>';
  }

  /* ── List view ── */
  if(!_D.radNewOrder){
    var rTotal  = RAD_ORDERS.length;
    var rPend   = RAD_ORDERS.filter(function(o){return o.status==='pending';}).length;
    var rInprog = RAD_ORDERS.filter(function(o){return o.status==='in_progress';}).length;
    var rCompl  = RAD_ORDERS.filter(function(o){return o.status==='completed';}).length;
    var rTab    = window._radOrdersTab || 'all';
    var rVis    = rTab==='all'?RAD_ORDERS:RAD_ORDERS.filter(function(o){return o.status===rTab;});

    function _radTabBtn(id,label){
      var active = rTab===id;
      return '<button onclick="window._radOrdersTab=\''+id+'\';if(typeof _dRender===\'function\')_dRender()" '+
        'style="padding:7px 16px;border:none;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;'+
        'background:'+(active?C.blue:'transparent')+';color:'+(active?'#fff':C.muted)+'">'+label+'</button>';
    }

    var radKpi =
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px">'+
        _card('<div style="display:flex;align-items:center;gap:10px"><div style="font-size:22px">🩻</div><div>'+
          '<div style="font-size:26px;font-weight:800;color:'+C.text+';line-height:1">'+rTotal+'</div>'+
          '<div style="font-size:12px;color:'+C.muted+'">Total Orders</div></div></div>')+
        _card('<div style="display:flex;align-items:center;gap:10px"><div style="font-size:22px">⏳</div><div>'+
          '<div style="font-size:26px;font-weight:800;color:#92400E;line-height:1">'+rPend+'</div>'+
          '<div style="font-size:12px;color:'+C.muted+'">Pending</div></div></div>')+
        _card('<div style="display:flex;align-items:center;gap:10px"><div style="font-size:22px">📡</div><div>'+
          '<div style="font-size:26px;font-weight:800;color:'+C.blue+';line-height:1">'+rInprog+'</div>'+
          '<div style="font-size:12px;color:'+C.muted+'">In Progress</div></div></div>')+
        _card('<div style="display:flex;align-items:center;gap:10px"><div style="font-size:22px">✅</div><div>'+
          '<div style="font-size:26px;font-weight:800;color:#065f46;line-height:1">'+rCompl+'</div>'+
          '<div style="font-size:12px;color:'+C.muted+'">Completed</div></div></div>')+
      '</div>';

    var radRows = rVis.map(function(o,i){
      var st = stCfg[o.status]||stCfg.pending;
      var pr = prCfg[o.priority]||prCfg.Routine;
      return (
        '<div style="padding:14px 16px;border-bottom:1px solid '+C.border+';background:'+(i%2===0?'#fff':'#f8fafc')+';display:flex;align-items:flex-start;gap:12px">'+
          '<div style="width:38px;height:38px;border-radius:10px;background:#EFF6FF;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;margin-top:1px">🩻</div>'+
          '<div style="flex:1;min-width:0">'+
            '<div style="font-size:14px;font-weight:700;color:'+C.text+'">'+o.test+'</div>'+
            '<div style="font-size:12px;color:'+C.muted+';margin-top:2px">'+o.patient+'&nbsp;·&nbsp;<span style="font-family:monospace">'+o.id+'</span>&nbsp;·&nbsp;'+o.date+'</div>'+
            '<div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">'+
              '<span style="padding:2px 9px;border-radius:12px;font-size:11px;font-weight:700;background:'+st.bg+';color:'+st.c+';border:1px solid '+st.bd+'">'+st.l+'</span>'+
              '<span style="padding:2px 9px;border-radius:12px;font-size:11px;font-weight:700;background:'+pr.bg+';color:'+pr.c+'">Priority: '+o.priority+'</span>'+
              '<span style="padding:2px 9px;border-radius:12px;font-size:11px;font-weight:500;background:#f1f5f9;color:'+C.muted+'">'+o.modality+'</span>'+
            '</div>'+
          '</div>'+
          '<button onclick="window._radOrdersView=\''+o.id+'\';if(typeof _dRender===\'function\')_dRender()" '+
            'style="flex-shrink:0;padding:7px 16px;border:1px solid '+C.border+';border-radius:8px;background:#fff;font-size:12px;font-weight:600;color:'+C.text+';cursor:pointer;font-family:inherit">'+
            'View order →</button>'+
        '</div>'
      );
    }).join('');

    return _dHeader('Radiology Orders','Imaging requests and tracking')+
      '<div style="flex:1;overflow:auto;padding:16px 20px">'+
        radKpi+
        '<div style="background:#fff;border-radius:12px;border:1px solid '+C.border+';overflow:hidden;margin-bottom:16px">'+
          '<div style="padding:12px 16px;border-bottom:1px solid '+C.border+';display:flex;align-items:center;justify-content:space-between">'+
            '<div style="font-size:14px;font-weight:700;color:'+C.text+'">Recent Radiology Orders</div>'+
            '<div style="display:flex;align-items:center;gap:8px">'+
              '<div style="display:flex;gap:4px;background:'+C.bg+';border-radius:8px;padding:4px">'+
                _radTabBtn('all','All')+_radTabBtn('pending','Pending')+_radTabBtn('in_progress','In progress')+_radTabBtn('completed','Completed')+
              '</div>'+
              '<button onclick="_D.radNewOrder=true;if(typeof _dRender===\'function\')_dRender()" '+
                'style="padding:8px 16px;border:none;border-radius:8px;background:linear-gradient(135deg,'+C.teal+' 0%,#1A4A9B 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">'+
                '＋ New Order'+
              '</button>'+
            '</div>'+
          '</div>'+
          (radRows||'<div style="padding:40px;text-align:center;color:'+C.muted+'">No orders in this category</div>')+
          '<div style="padding:8px 16px;font-size:11px;color:'+C.muted+';border-top:1px solid '+C.border+'">'+
            '<em>Illustrative data only. These are sample records, not actual patient orders.</em>'+
          '</div>'+
        '</div>'+
      '</div>';
  }

  /* ══════════════════════════════════════════════════════════
     NEW ORDER FORM  (entered via _D.radNewOrder = true)
  ══════════════════════════════════════════════════════════ */

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
    _D.radNewOrder=false; _D.view='radiology'; _dRender();
  };

  /* Reset inv counter each form open */
  _D._radInvCount = 1;

  /* ── HTML ── */
  return _dHeader('New Radiology / Imaging Request', 'Imaging requests and tracking',
      '<button onclick="_D.radNewOrder=false;_D.view=\'radiology\';_dRender()" style="padding:7px 16px;border:1.5px solid '+C.border+';border-radius:8px;background:#fff;font-size:13px;font-weight:600;color:'+C.muted+';cursor:pointer;font-family:inherit">← Back to Orders</button>')+
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
          '<button onclick="_D.radNewOrder=false;_D.view=\'radiology\';_dRender()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">Cancel</button>'+
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
  var u          = _dGetUser();
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

  /* ── Toggle destination fields (global) ── */
  window._rfToggleDest = function(val){
    var deptDiv = document.getElementById('ref-dest-dept');
    var extDiv  = document.getElementById('ref-dest-ext');
    if (!deptDiv || !extDiv) return;
    var isDept = val === 'Department within this facility';
    deptDiv.style.display = isDept ? 'block' : 'none';
    extDiv.style.display  = isDept ? 'none'  : 'block';
  };

  /* ── Save referral (global) ── */
  window._dSubmitReferral = async function(){
    /* ── Duplicate-submit guard ── */
    var _rfBtn = document.getElementById('btn-submit-referral');
    if (_rfBtn && _rfBtn.getAttribute('data-submitting')) return;
    if (_rfBtn) { _rfBtn.setAttribute('data-submitting','1'); _rfBtn.disabled=true; _rfBtn.style.opacity='0.7'; _rfBtn.textContent='Submitting…'; }
    function _rfBtnReset(){ if(_rfBtn){ _rfBtn.removeAttribute('data-submitting'); _rfBtn.disabled=false; _rfBtn.style.opacity=''; _rfBtn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Submit Referral'; } }
    function _rfToast(m,t){ try{if(window.UI&&window.UI.showToast)window.UI.showToast(m,t);}catch(_){} }

    var gv = function(id){ var e=document.getElementById(id); return e?(e.value||'').trim():''; };

    /* ── Patient guard ── */
    var pat5 = _D.consultPat||_D.pat360Data||_D.selectedPat||{};
    if (!pat5._id && !pat5.id) {
      _rfBtnReset();
      _rfToast('No patient selected — cannot submit referral','err');
      return;
    }

    /* ── Field validation ── */
    var _rfMissing = []; var _rfEls = [];
    function _rfChk(id, label) {
      var el = document.getElementById(id);
      var val = el ? (el.value||'').trim() : '';
      if (!val) {
        _rfMissing.push(label);
        if (el) {
          el.style.border = '2px solid #e53e3e'; el.style.background = '#fff5f5';
          function _clr(ev){ ev.target.style.border=''; ev.target.style.background=''; ev.target.removeEventListener('input',_clr); ev.target.removeEventListener('change',_clr); }
          el.addEventListener('input',_clr); el.addEventListener('change',_clr);
          _rfEls.push(el);
        }
      }
      return !!val;
    }
    _rfChk('ref-specialty', 'Specialty');
    _rfChk('ref-reason',    'Reason for Referral');

    /* ── Destination validation ── */
    var dest = (document.querySelector('input[name="ref-dest"]:checked')||{value:''}).value;
    if (!dest) { _rfMissing.push('Referral Destination'); }
    else if (dest === 'Department within this facility') {
      var deptEl = document.getElementById('ref-dept');
      if (deptEl && !deptEl.value.trim()) {
        _rfMissing.push('Department');
        deptEl.style.border='2px solid #e53e3e'; deptEl.style.background='#fff5f5';
        _rfEls.push(deptEl);
      }
    } else if (dest === 'Another hospital or healthcare facility') {
      var facNameEl = document.getElementById('ref-ext-facility');
      if (facNameEl && !facNameEl.value.trim()) {
        _rfMissing.push('Receiving Facility Name');
        facNameEl.style.border='2px solid #e53e3e'; facNameEl.style.background='#fff5f5';
        _rfEls.push(facNameEl);
      }
    }

    if (_rfMissing.length) {
      if (_rfEls.length) _rfEls[0].scrollIntoView({behavior:'smooth',block:'center'});
      _rfBtnReset();
      _rfToast('Please complete: '+_rfMissing.join(' | '),'err');
      return;
    }

    /* ── Collect all field values ── */
    var specialty  = gv('ref-specialty');
    var urgency    = (document.querySelector('input[name="ref-urgency"]:checked')||{value:'Routine'}).value;
    var reason     = gv('ref-reason');
    var findings   = gv('ref-findings');
    var question   = gv('ref-question');
    var addInstr   = gv('ref-add-instr');
    var preferred  = gv('ref-preferred');
    var deptVal    = gv('ref-dept');
    var extFacName = gv('ref-ext-facility');
    var extFacAddr = gv('ref-ext-address');

    /* ── Checklist items ── */
    var chkConsult = !!(document.getElementById('ref-chk-consult')&&document.getElementById('ref-chk-consult').checked);
    var chkLab     = !!(document.getElementById('ref-chk-lab')    &&document.getElementById('ref-chk-lab').checked);
    var chkMeds    = !!(document.getElementById('ref-chk-meds')   &&document.getElementById('ref-chk-meds').checked);
    var linkedDocs = [];
    if (chkConsult && _D.workflow && _D.workflow.consultationId) linkedDocs.push({type:'consultation', id:_D.workflow.consultationId});
    if (chkConsult && _D.workflow && _D.workflow.diagnosisId)    linkedDocs.push({type:'diagnosis',     id:_D.workflow.diagnosisId});
    if (chkLab     && _D.workflow && _D.workflow.labOrderId)     linkedDocs.push({type:'lab',           id:_D.workflow.labOrderId});
    if (chkMeds    && _D.workflow && _D.workflow.prescriptionId) linkedDocs.push({type:'prescription',  id:_D.workflow.prescriptionId});

    /* ── Generate unique reference number ── */
    var refNum = 'REF-'+(new Date().getFullYear())+'-'+
      (function(){var a=new Uint8Array(4);if(window.crypto&&window.crypto.getRandomValues)window.crypto.getRandomValues(a);else for(var k=0;k<4;k++)a[k]=Math.floor(Math.random()*256);return Array.from(a,function(b){return b.toString(16).toUpperCase().padStart(2,'0');}).join('');})();

    /* ── Build payload ── */
    var payload = {
      referenceNumber:       refNum,
      patient:               pat5._id||pat5.id||'',
      patientName:           ((pat5.firstName||pat5.name||'')+' '+(pat5.lastName||'')).trim()||'Unknown',
      consultationId:        (_D.workflow&&_D.workflow.consultationId)||undefined,
      referringDoctorId:     (u._id||u.id||''),
      referringDoctorName:   docName,
      referralDate:          new Date().toISOString(),
      specialty:             specialty,
      destination:           dest,
      department:            deptVal||undefined,
      receivingFacilityName: extFacName||undefined,
      receivingFacilityAddress: extFacAddr||undefined,
      preferredClinician:    preferred||undefined,
      urgency:               urgency,
      reasonForReferral:     reason,
      clinicalFindings:      findings||undefined,
      specialistQuestion:    question||undefined,
      additionalInstructions:addInstr||undefined,
      linkedDocuments:       linkedDocs.length ? linkedDocs : undefined,
      facility:              docFacility,
      status:                'Submitted',
      idempotencyKey:        'ref-'+(pat5._id||pat5.id||'x')+'-'+Date.now(),
    };

    /* ── Submit to API ── */
    try {
      var _rfRes = await API._fetchDirect('/referrals',{method:'POST',body:JSON.stringify(payload)});
      if (_rfRes && (_rfRes.error || _rfRes.status === false || (_rfRes.statusCode && _rfRes.statusCode >= 400))) {
        _rfBtnReset();
        _rfToast((_rfRes.message||_rfRes.error||'Could not submit referral — please try again.'),'err');
        return;
      }
      /* Store referral ID in workflow */
      var _rfSaved = (_rfRes&&_rfRes.data)?_rfRes.data:_rfRes;
      if (_rfSaved && (_rfSaved._id||_rfSaved.id) && _D.workflow) {
        _D.workflow.referralId = _rfSaved._id||_rfSaved.id;
        _D.workflow.referralRef = refNum;
      }
      _rfBtnReset();
      _rfToast('Referral '+refNum+' submitted successfully','ok');
      setTimeout(function(){ _D.view='referrals'; _dRender(); }, 1200);
    } catch(rfErr) {
      _rfBtnReset();
      _rfToast((rfErr&&rfErr.message)||'Could not submit referral — please try again.','err');
    }
  };

  /* ── Sidebar ── */
  var refSidebar =
    '<div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">'+
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Referring Clinician</div>'+
        '<div style="display:flex;flex-direction:column;gap:12px">'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Clinician</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+docName+'</div></div>'+
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
                    '<input type="radio" name="ref-dest" value="'+opt+'"'+(i===0?' checked':'')+' onchange="_rfToggleDest(this.value)" style="accent-color:'+C.teal+'">'+opt+
                  '</label>';
                }).join('')+
              '</div>'+
            '</div>'+
            /* Conditional destination fields */
            '<div id="ref-dest-dept" style="display:block;margin-top:8px">'+
              _rfInp('ref-dept','Department','e.g. Cardiology Ward, ICU, Surgical Unit',true)+
            '</div>'+
            '<div id="ref-dest-ext" style="display:none;margin-top:8px">'+
              _rfInp('ref-ext-facility','Receiving Facility Name','Name of the hospital or facility',true)+
              _rfInp('ref-ext-address','Facility Address / Location','Street address or area',false)+
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
              {id:'ref-chk-consult', label:'Relevant consultation and diagnosis records'},
              {id:'ref-chk-lab',     label:'Available laboratory and imaging results'},
              {id:'ref-chk-meds',    label:'Medication and allergy information'}
            ].map(function(item){
              return '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;font-weight:600;color:'+C.text+'">'+
                '<input type="checkbox" id="'+item.id+'" style="width:16px;height:16px;accent-color:'+C.teal+'">'+item.label+
              '</label>';
            }).join('')+
          '</div>'
        )+

        /* Actions */
        '<div style="display:flex;gap:10px;margin-top:4px;margin-bottom:8px">'+
          '<button id="btn-submit-referral" onclick="_dSubmitReferral()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'+
            'Submit Referral'+
          '</button>'+
          '<button onclick="_D.view=\'medical_notes\';_dRender()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'+
            'Back to Diagnosis &amp; Clinical Assessment'+
          '</button>'+
          '<button onclick="_rfCancelConfirm()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">Cancel</button>'+
        '</div>'+

      '</div>'+
      refSidebar+
    '</div>';
}

/* ── Referral cancel guard (global) ── */
window._rfCancelConfirm = function(){
  var hasData = ['ref-reason','ref-findings','ref-question','ref-preferred','ref-dept','ref-ext-facility'].some(function(id){
    var el = document.getElementById(id); return el && (el.value||'').trim().length > 0;
  });
  if (hasData && !confirm('You have unsaved referral information. Leave without submitting?')) return;
  _D.view = 'dashboard'; _dRender();
};

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

  var u         = _dGetUser();
  var docName   = (_D.workflow && _D.workflow.consultation && _D.workflow.consultation.clinician) ||
    (u.firstName ? 'Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim() : (u.name||'—'));
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

  /* ── Saved state shorthand ── */
  var _ds = _D.workflow.diagnosis;

  /* ── ICD-10 auto-fill handler ── */
  window._mnDiagChange = function(diagId, icdId){
    var diagEl = document.getElementById(diagId);
    var icdEl  = document.getElementById(icdId);
    if(!diagEl||!icdEl) return;
    var code = ICD10_MAP[diagEl.value]||'';
    icdEl.value = code;
    /* persist immediately */
    _D.workflow.diagnosis.primary = diagEl.value;
    _D.workflow.diagnosis.icd10   = code;
  };

  /* ── Auto-save: collect all form values → _D.workflow.diagnosis ── */
  window._dSaveDiagForm = function(){
    var g = function(id){ var el=document.getElementById(id); return el?el.value:''; };
    _D.workflow.diagnosis.primary     = g('mn-primary-diag');
    _D.workflow.diagnosis.icd10       = g('mn-primary-icd');
    _D.workflow.diagnosis.status      = g('mn-primary-status');
    _D.workflow.diagnosis.assessment  = g('mn-assessment');
    _D.workflow.diagnosis.findings    = g('mn-findings');
    _D.workflow.diagnosis.differentials = g('mn-differential');
    _D.workflow.diagnosis.addNotes    = g('mn-add-notes');
    /* Risk radio */
    var rEl = document.querySelector('input[name="mn-risk"]:checked');
    if(rEl) _D.workflow.diagnosis.risk = rEl.value;
    /* Basis checkboxes */
    _D.workflow.diagnosis.basis = Array.prototype.slice.call(
      document.querySelectorAll('.mn-basis:checked')
    ).map(function(el){return el.value;});
    /* Extra diagnoses */
    var extras = [];
    var n = window._mnDiagCount||1;
    for(var i=2;i<=n;i++){
      extras.push({
        diag:  g('mn-extra-diag-'+i),
        icd:   g('mn-extra-icd-'+i),
        status:g('mn-extra-status-'+i)
      });
    }
    _D.workflow.diagnosis.secondary = extras;
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
  /* silent=true: called internally (e.g. from _dEndConsult) — skip button UI changes and success toast */
  window._dSaveNote = async function(silent){
    var gv  = function(id){ var e=document.getElementById(id); return e?e.value.trim():''; };
    var u    = _dGetUser();
    var pat6 = _D.consultPat||_D.pat360Data||_D.selectedPat||{};

    /* ── Shared field-highlight helper ── */
    function _cnChk(id, label) {
      var el = document.getElementById(id);
      var val = el ? (el.value||'').trim() : '';
      if (!val) {
        _cnMissing.push(label);
        if (el) {
          el.style.border = '2px solid #e53e3e';
          el.style.background = '#fff5f5';
          function _clr(ev){ ev.target.style.border=''; ev.target.style.background=''; ev.target.removeEventListener('input',_clr); ev.target.removeEventListener('change',_clr); }
          el.addEventListener('input', _clr);
          el.addEventListener('change', _clr);
          _cnEls.push(el);
        }
      }
      return !!val;
    }

    /* ── Validate all required fields ── */
    var _cnMissing = []; var _cnEls = [];
    _cnChk('mn-primary-diag',   'Primary Diagnosis');
    _cnChk('mn-primary-icd',    'ICD-10 Code');
    _cnChk('mn-primary-status', 'Diagnosis Status');
    _cnChk('mn-assessment',     'Clinical Assessment');
    _cnChk('mn-findings',       'Clinical Findings');

    if (_cnMissing.length) {
      if (_cnEls.length) _cnEls[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      try{ if(window.UI&&window.UI.showToast) window.UI.showToast('Please complete: '+_cnMissing.join(' | '),'err'); }catch(_e){}
      return false;
    }

    /* ── Patient guard ── */
    if (!pat6._id && !pat6.id) {
      try{ if(window.UI&&window.UI.showToast) window.UI.showToast('No patient selected — cannot save diagnosis','err'); }catch(_e){}
      return false;
    }

    /* Prevent duplicate submissions (skip UI mutation when called silently from End Consultation) */
    var _snBtn = silent ? null : document.getElementById('btn-save-diag');
    if (!silent) {
      var _snBtnRaw = document.getElementById('btn-save-diag');
      if (_snBtnRaw && _snBtnRaw.getAttribute('data-saving')) return false;
    }
    if (_snBtn) { _snBtn.setAttribute('data-saving','1'); _snBtn.disabled=true; _snBtn.style.opacity='0.7'; _snBtn.textContent='Saving…'; }

    var diagName = gv('mn-primary-diag');
    var icd10    = gv('mn-primary-icd');
    var riskEl   = document.querySelector('input[name="mn-risk"]:checked');
    var bases    = Array.from(document.querySelectorAll('.mn-basis:checked')).map(function(e){return e.value;});
    var docName  = u.firstName ? ('Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim()) : (u.name||'Doctor');

    var payload = {
      patient:               pat6._id||pat6.id||'',
      patientName:           mnPatName,
      primaryDiagnosis:      diagName,
      icd10:                 icd10,
      diagnosisStatus:       gv('mn-primary-status'),
      clinicalAssessment:    gv('mn-assessment'),
      clinicalFindings:      gv('mn-findings'),
      differentialDiagnosis: gv('mn-differential'),
      riskLevel:             riskEl ? riskEl.value : 'Stable',
      confirmationBasis:     bases,
      additionalNotes:       gv('mn-add-notes'),
      orderedBy:             (u._id||u.id||''),
      orderedByName:         docName,
      recordedAt:            new Date().toISOString(),
      /* Link diagnosis to the consultation saved earlier this visit */
      consultationNote:      (_D.workflow && _D.workflow.consultationId) || undefined,
      consultationId:        (_D.workflow && _D.workflow.consultationId) || undefined,
      /* Idempotency key: stable per patient + ICD-10 + date so retries don’t duplicate */
      idempotencyKey:        'diag-'+(pat6._id||pat6.id||'x')+'-'+icd10.replace(/\s+/g,'')+'-'+(new Date().toISOString().slice(0,10)),
    };
    function _snReset(){ if(_snBtn){ _snBtn.removeAttribute('data-saving'); _snBtn.disabled=false; _snBtn.style.opacity=''; _snBtn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Save Diagnosis'; } }
    try {
      var _mnRes = await API._fetchDirect('/medical-notes',{method:'POST',body:JSON.stringify(payload)});
      var _mnSaved = (_mnRes && _mnRes.data) ? _mnRes.data : _mnRes;
      /* Treat API-level errors as failures even when they don't throw */
      if (_mnRes && (_mnRes.error || _mnRes.status === false || (_mnRes.statusCode && _mnRes.statusCode >= 400))) {
        _snReset();
        try{ if(window.UI&&window.UI.showToast) window.UI.showToast((_mnRes.message||_mnRes.error||'Could not save diagnosis — please try again.'),'err'); }catch(_e){}
        return false;
      }
      if (_mnSaved && (_mnSaved._id || _mnSaved.id)) {
        if (_D.workflow) _D.workflow.diagnosisId = _mnSaved._id || _mnSaved.id;
      }
      _snReset();
      /* Only show the "saved" toast when triggered directly — not when called from End Consultation */
      if (!silent) {
        try{ if(window.UI&&window.UI.showToast) window.UI.showToast('Diagnosis saved successfully','ok'); }catch(_e){}
      }
      return true;
    } catch(err) {
      _snReset();
      var msg = (err&&err.message)||'Could not save diagnosis — please try again.';
      try{ if(window.UI&&window.UI.showToast) window.UI.showToast(msg,'err'); }catch(_e){}
      return false;
    }
  };

    /* ── End Consultation handler — Req 9 ── */
  window._dEndConsult = async function(){
    /* Prevent duplicate submissions */
    var btn = document.getElementById('btn-end-consult');
    if (btn && btn.getAttribute('data-submitted')) return;
    if (btn) {
      btn.setAttribute('data-submitted','1');
      btn.disabled = true;
      btn.style.opacity = '0.75';
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Ending consultation…';
    }
    function _ecReset(){
      var b = document.getElementById('btn-end-consult');
      if(!b) return;
      b.removeAttribute('data-submitted'); b.disabled=false; b.style.opacity='';
      b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/></svg> End Consultation';
    }

    var gv = function(id){ var e=document.getElementById(id); return e?e.value.trim():''; };
    function _ecToast(msg,type){ try{ if(window.UI&&window.UI.showToast)window.UI.showToast(msg,type); else console.warn('[EndConsult]',msg); }catch(_){} }

    /* Confirm patient identity first */
    var pat8 = _D.consultPat||_D.selectedPat||_D.pat360Data||{};
    if(!pat8._id && !pat8.id){
      _ecToast('No patient selected — cannot end consultation','err');
      _ecReset(); return;
    }

    /* Field-level validation with red highlights */
    var _ecMissing = []; var _ecEls = [];
    function _ecChk(id, label) {
      var el = document.getElementById(id);
      var val = el ? (el.value||'').trim() : '';
      if (!val) {
        _ecMissing.push(label);
        if (el) {
          el.style.border = '2px solid #e53e3e';
          el.style.background = '#fff5f5';
          function _clr(ev){ ev.target.style.border=''; ev.target.style.background=''; ev.target.removeEventListener('input',_clr); ev.target.removeEventListener('change',_clr); }
          el.addEventListener('input', _clr);
          el.addEventListener('change', _clr);
          _ecEls.push(el);
        }
      }
      return !!val;
    }
    _ecChk('mn-primary-diag',   'Primary Diagnosis');
    _ecChk('mn-primary-icd',    'ICD-10 Code');
    _ecChk('mn-primary-status', 'Diagnosis Status');
    _ecChk('mn-assessment',     'Clinical Assessment');
    _ecChk('mn-findings',       'Clinical Findings');

    /* Check risk radio separately */
    var riskEl = document.querySelector('input[name="mn-risk"]:checked');
    if (!riskEl) {
      _ecMissing.push('Risk / Severity');
      var riskGroup = document.querySelector('[data-field="mn-risk"]');
      if (riskGroup) { riskGroup.style.outline='2px solid #e53e3e'; riskGroup.style.borderRadius='6px'; _ecEls.push(riskGroup); }
    }

    if (_ecMissing.length) {
      if (_ecEls.length) _ecEls[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      _ecToast('Please complete: '+_ecMissing.join(' | '),'err');
      _ecReset(); return;
    }

    /* Save diagnosis silently — abort end-consult if save fails */
    var noteSaved = await window._dSaveNote(true);
    if (!noteSaved) { _ecReset(); return; }

    var nowIso = new Date().toISOString();
    var clinician8 = _dGetUser();
    var clinName   = clinician8.firstName ? 'Dr '+((clinician8.firstName||'')+' '+(clinician8.lastName||'')).trim() : (clinician8.name||'Unknown');
    var facility8  = (typeof clinician8.facility==='string'?clinician8.facility:'')
                     ||(clinician8.facility&&clinician8.facility.name)||clinician8.facilityName||'';
    var consultId  = _D.workflow&&_D.workflow.consultationId;
    if (!consultId) {
      _ecToast('No active consultation found — cannot end consultation. Please refresh and try again.','err');
      _ecReset(); return;
    }

    /* Generate unique survey token */
    var surveyToken = (function(){
      var arr = new Uint8Array(20);
      if(window.crypto&&window.crypto.getRandomValues) window.crypto.getRandomValues(arr);
      else for(var k=0;k<20;k++) arr[k]=Math.floor(Math.random()*256);
      return Array.from(arr,function(b){return b.toString(16).padStart(2,'0');}).join('');
    })();
    var surveyUrl = window.location.origin+'/survey?token='+surveyToken;

    /* Save consultation completion to API */
    var completionPayload = {
      consultationId:   consultId,
      patient:          pat8._id||pat8.id||'',
      patientName:      mnPatName,
      status:           'Completed',
      completedAt:      nowIso,
      completedByName:  clinName,
      completedById:    clinician8._id||clinician8.id||'',
      facility:         facility8,
      surveyToken:      surveyToken,
      surveyUrl:        surveyUrl,
      surveyStatus:     'Pending',
    };
    var _ecApiOk = false;
    try {
      var _ecRes = await API._fetchDirect('/consultations/'+consultId+'/complete',{method:'POST',body:JSON.stringify(completionPayload)});
      if (_ecRes && (_ecRes.error || _ecRes.status === false || _ecRes.statusCode >= 400)) {
        _ecToast((_ecRes.message||_ecRes.error||'Could not complete consultation — please try again.'),'err');
        _ecReset(); return;
      }
      _ecApiOk = true;
    } catch(ecErr) {
      _ecToast((ecErr&&ecErr.message)||'Could not complete consultation — please try again.','err');
      _ecReset(); return;
    }

    /* Store survey token locally */
    if (!_D.workflow) _D.workflow = {};
    _D.workflow.surveyToken   = surveyToken;
    _D.workflow.surveyUrl     = surveyUrl;
    _D.workflow.completedAt   = nowIso;
    if (_ecApiOk) _D.workflow.consultStatus = 'Completed';

    /* ── PATCH appointment status → completed (non-fatal) ── */
    /* Resolve appointment ID from: workflow state, consultPat queue entry,
       active telemedicine session, or patient's appointments list */
    (async function(){
      try {
        var _apptId =
          (_D.workflow && _D.workflow.appointmentId) ||
          (pat8.appointmentId || pat8.apptId || pat8._apptId) ||
          window._dActiveTeleApptId ||
          (function(){
            /* Look for a scheduled/in_progress appointment for this patient */
            var appts = pat8.appointments || ((_D.pat360Data||{}).appointments) || [];
            if (!Array.isArray(appts)) return null;
            var active = appts.find(function(a){
              var s = (a.status||'').toLowerCase();
              return s === 'scheduled' || s === 'in_progress' || s === 'confirmed';
            });
            return active ? (active._id||active.id) : null;
          })();
        if (_apptId && _apptId !== 'undefined') {
          await API._fetchDirect('/appointments/'+_apptId+'/status',{
            method: 'PATCH',
            body: JSON.stringify({ status: 'completed', completedAt: nowIso })
          });
        }
      } catch(_e){ /* non-fatal — consultation is already marked complete */ }
    })();

    /* ── Send survey via SMS + email (async, non-blocking) ── */
    var smsMsg = 'Thank you for visiting our healthcare facility. Please take a moment to share your experience by completing our patient feedback survey: '+surveyUrl+'. Your feedback helps us improve our services.';
    var emailHtml =
      '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">'+
      '<div style="background:linear-gradient(135deg,#0F6E56,#1A4A9B);padding:20px;border-radius:10px 10px 0 0;text-align:center">'+
      '<h2 style="color:#fff;margin:0">Patient Feedback Survey</h2></div>'+
      '<div style="padding:24px;background:#f9f9f9;border-radius:0 0 10px 10px">'+
      '<p>Dear <strong>'+mnPatName+'</strong>,</p>'+
      '<p>Thank you for visiting '+facility8+'. Please share your experience by completing our brief feedback survey.</p>'+
      '<div style="text-align:center;margin:24px 0">'+
      '<a href="'+surveyUrl+'" style="background:#0F6E56;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Complete Feedback Survey</a>'+
      '</div>'+
      '<p style="font-size:12px;color:#888">Your feedback is confidential and helps us improve patient care. This link is unique to your consultation and expires in 14 days.</p>'+
      '</div></div>';

    (async function(){
      try {
        var pRes = await API._fetchDirect('/patients?limit=1&id='+(pat8._id||pat8.id||''),{method:'GET'}).catch(function(){return {data:[]};});
        var ptData = (pRes&&pRes.data&&pRes.data[0])||pat8;
        if (ptData.phone) {
          API._fetchDirect('/notifications/sms',{method:'POST',body:JSON.stringify({to:ptData.phone,message:smsMsg})}).catch(function(){});
        }
        if (ptData.email) {
          API._fetchDirect('/notifications/email',{method:'POST',body:JSON.stringify({
            to:ptData.email,
            subject:'Your feedback matters — '+facility8+' Patient Survey',
            html:emailHtml,
          })}).catch(function(){});
        }
        /* Track survey delivery */
        API._fetchDirect('/surveys',{method:'POST',body:JSON.stringify({
          consultationId:  consultId,
          patient:         pat8._id||pat8.id||'',
          patientName:     mnPatName,
          token:           surveyToken,
          url:             surveyUrl,
          deliveryMethod:  (ptData.phone?'SMS':'')+(ptData.email?'/Email':''),
          deliveryStatus:  'Sent',
          sentAt:          new Date().toISOString(),
          facility:        facility8,
        })}).catch(function(){});
      } catch(_){}
    })();

    /* Update task list */
    if(window._dTaskDone) _dTaskDone('T5');

    /* Mark patient as done in doctor queue and remove from active list */
    if (_D.consultPatId) {
      var qp8 = (window._DOCTOR_QUEUE||[]).find(function(x){return x.id===_D.consultPatId;});
      if (qp8) qp8.status='completed';
      /* Remove from active consultations array so it no longer shows as ongoing */
      if (Array.isArray(window._DOCTOR_QUEUE)) {
        window._DOCTOR_QUEUE = window._DOCTOR_QUEUE.filter(function(x){
          return x.id !== _D.consultPatId || x.status !== 'completed';
        });
      }
    }

    /* ── Bell notification — only after API confirmed success ── */
    try {
      if (!window._NIHMS_NOTIFICATIONS) window._NIHMS_NOTIFICATIONS = [];
      window._NIHMS_NOTIFICATIONS.unshift({
        id: 'ec-'+Date.now(), type: 'consultation',
        title: 'Consultation Completed',
        message: mnPatName+' has been discharged. Consultation status updated to Completed.',
        time: new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}),
        read: false,
      });
    } catch(_){}

    /* Toast confirmation — user requirement: exact message */
    _ecToast('Consultation has been successfully ended.','ok');

    /* Show confirmation */
    var confirmHtml =
      '<div style="text-align:center;padding:32px 24px">'+
      '<div style="font-size:48px;margin-bottom:16px">✅</div>'+
      '<div style="font-size:20px;font-weight:800;color:#0F6E56;margin-bottom:8px">Consultation Completed</div>'+
      '<div style="font-size:14px;color:#64748b;margin-bottom:16px">'+mnPatName+' · '+new Date(nowIso).toLocaleString('en-ZA')+'</div>'+
      '<div style="font-size:13px;color:#64748b;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:16px">'+
      '📱 Patient feedback survey sent to patient\'s verified contact details.</div>'+
      '<div style="font-size:12px;color:#94a3b8">Survey token: <code style="font-family:monospace">'+surveyToken.slice(0,8)+'…</code></div>'+
      '</div>';
    var main9 = document.getElementById('doc-main');
    if (main9) main9.innerHTML = confirmHtml;

    /* Navigate to dashboard after 3 seconds */
    setTimeout(function(){
      _D.consultPat = null; _D.consultPatId = null; _D.view='dashboard'; _dRender();
    }, 3000);
  };

  /* ── Local helpers ── */
  function _mnC(c){ return '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px">'+c+'</div>'; }
  function _mnT(t){ return '<div style="font-size:15px;font-weight:800;color:'+C.text+';margin-bottom:16px">'+t+'</div>'; }
  function _mnI(label,val,mono){ return '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:'+C.muted+';margin-bottom:4px">'+label+'</div><div style="font-size:14px;font-weight:700;color:'+C.text+';'+(mono?'font-family:monospace':'')+'">'+val+'</div></div>'; }
  function _mnL(t,req){ return '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:6px">'+t+(req?' <span style="color:#ef4444">*</span>':'')+'</div>'; }
  function _mnF(){ return 'width:100%;padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;color:'+C.text+';background:#fff;box-sizing:border-box;outline:none'; }
  /* Map field id → saved value key in _D.workflow.diagnosis */
  var _mnSaved = {
    'mn-assessment':  _ds.assessment    || '',
    'mn-findings':    _ds.findings      || '',
    'mn-differential':_ds.differentials || '',
    'mn-add-notes':   _ds.addNotes      || ''
  };
  function _mnTx(id,label,rows,req,ph){
    var saved = _mnSaved[id] !== undefined ? _mnSaved[id] : '';
    return '<div>'+_mnL(label,req)+'<textarea id="'+id+'" rows="'+(rows||3)+'" placeholder="'+(ph||'')+'" style="'+_mnF()+';resize:vertical">'+saved.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</textarea></div>';
  }

  /* ── Sidebar ── */
  var mnSidebar =
    '<div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">'+
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Recording Clinician</div>'+
        '<div style="display:flex;flex-direction:column;gap:12px">'+
          '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:4px">Clinician</div>'+
            '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+docName+'</div></div>'+
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
  var _dsSavedPrimary = _ds.primary  || '';
  var _dsSavedIcd     = _ds.icd10    || '';
  var _dsSavedStatus  = _ds.status   || '';
  var diagSelect =
    '<div style="display:grid;grid-template-columns:1.6fr 0.8fr 0.9fr;gap:10px">'+
      '<div>'+_mnL('Diagnosis',true)+
        '<select id="mn-primary-diag" onchange="_mnDiagChange(\'mn-primary-diag\',\'mn-primary-icd\')" style="'+_mnF()+'">'+
          '<option value="">Select or type diagnosis…</option>'+
          ICD10_LIST.map(function(x){return'<option'+(x.d===_dsSavedPrimary?' selected':'')+'>'+x.d+'</option>';}).join('')+
        '</select>'+
      '</div>'+
      '<div>'+_mnL('ICD-10 Code',true)+
        '<input id="mn-primary-icd" placeholder="Auto-filled" value="'+_dsSavedIcd+'" style="'+_mnF()+'">'+
      '</div>'+
      '<div>'+_mnL('Diagnosis Status',true)+
        '<select id="mn-primary-status" style="'+_mnF()+'">'+
          '<option value="">-- Select Status --</option>'+
          ['Provisional','Confirmed','Differential','Resolved','Chronic'].map(function(o){
            return '<option value="'+o+'"'+( o===_dsSavedStatus?' selected':'')+'>'+o+'</option>';
          }).join('')+
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
              var _riskSaved = _ds.risk || 'Stable';
              var _riskChecked = (opt.val === _riskSaved) ? ' checked' : ((_riskSaved===''&&i===0)?' checked':'');
              return '<label style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1.5px solid '+C.border+';border-radius:8px;cursor:pointer;background:#fff">'+
                '<input type="radio" name="mn-risk" value="'+opt.val+'"'+_riskChecked+' style="accent-color:'+opt.col+';width:16px;height:16px">'+
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
              var _basisSaved = _ds.basis || [];
              var _basisChk = (_basisSaved.indexOf(b) > -1) ? ' checked' : '';
              return '<label style="display:flex;align-items:center;gap:8px;padding:9px 14px;border:1.5px solid '+C.border+';border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;color:'+C.text+';background:#fff">'+
                '<input type="checkbox" class="mn-basis" value="'+b+'"'+_basisChk+' style="width:15px;height:15px;accent-color:'+C.teal+'">'+b+
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
              {label:'🧪 Order Lab',           onclick:"_dSaveDiagForm&&_dSaveDiagForm();_D.labNewOrder=true;_D.view='lab';_dRender()"},
              {label:'🩻 Radiology',           onclick:"_dSaveDiagForm&&_dSaveDiagForm();_D.view='radiology';_dRender()"},
              {label:'💊 Prescription',        onclick:"_dSaveDiagForm&&_dSaveDiagForm();_D.view='prescriptions';_dRender()"},
              {label:'🔄 Referral',            onclick:"_dSaveDiagForm&&_dSaveDiagForm();_D.view='referrals';_dRender()"},
              {label:'📅 Follow-up',           onclick:"_dSaveDiagForm&&_dSaveDiagForm();_D.view='follow_up';_dRender()"},
              {label:'📋 Issue Med Certificate',onclick:"_dSaveDiagForm&&_dSaveDiagForm();_D.view='med_certs';_dRender()"}
            ].map(function(a){
              return '<button onclick="'+a.onclick+'" '+
                'style="padding:9px 16px;border-radius:8px;border:1.5px solid '+C.border+';background:#fff;font-size:13px;font-weight:700;color:'+C.text+';cursor:pointer;font-family:inherit">'+
                a.label+'</button>';
            }).join('')+
          '</div>'
        )+

        /* Actions — three equal buttons in one row */
        '<div style="display:flex;gap:10px;margin-top:4px;margin-bottom:8px">'+
          '<button id="btn-save-diag" onclick="_dSaveNote()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'+
            'Save Diagnosis'+
          '</button>'+
          '<button id="btn-end-consult" onclick="_dEndConsult()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/></svg>'+
            'End Consultation'+
          '</button>'+
          '<button onclick="(function(){var pat=_D.consultPat||_D.selectedPat||{};_D.consultPat=null;_D.consultPatId=null;_D.view=\'dashboard\';_dRender();})()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">Cancel</button>'+
        '</div>'+

      '</div>'+
      mnSidebar+
    '</div>';

  /* ── Wire auto-save listeners after render ── */
  requestAnimationFrame(function(){
    var ids = ['mn-primary-diag','mn-primary-icd','mn-primary-status',
               'mn-assessment','mn-findings','mn-differential','mn-add-notes'];
    ids.forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.addEventListener('input', window._dSaveDiagForm);
      if(el) el.addEventListener('change', window._dSaveDiagForm);
    });
    /* Risk radios */
    document.querySelectorAll('input[name="mn-risk"]').forEach(function(el){
      el.addEventListener('change', window._dSaveDiagForm);
    });
    /* Basis checkboxes */
    document.querySelectorAll('.mn-basis').forEach(function(el){
      el.addEventListener('change', window._dSaveDiagForm);
    });
    /* Extra diagnosis fields (dynamically added) — delegate from container */
    var container = document.getElementById('mn-extra-diag-container');
    if(container){
      container.addEventListener('input', window._dSaveDiagForm);
      container.addEventListener('change', window._dSaveDiagForm);
    }
  });
}


/* ══════════════════════════════════════════════════════════════════
   PATIENT FEEDBACK SURVEY PAGE  (Req 9.4 — no login required)
══════════════════════════════════════════════════════════════════ */
Pages['survey'] = function() {
  /* Read token from URL query string */
  var params = new URLSearchParams(window.location.search);
  var token  = params.get('token')||'';

  if (!token) {
    return '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f5f0;font-family:Arial,sans-serif">'+
      '<div style="background:#fff;border-radius:16px;padding:32px;max-width:400px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)">'+
      '<div style="font-size:40px;margin-bottom:12px">⚠️</div>'+
      '<div style="font-size:18px;font-weight:700;color:#dc2626;margin-bottom:8px">Invalid Survey Link</div>'+
      '<div style="font-size:13px;color:#64748b">This survey link is invalid or has expired. Please contact the facility if you need a new link.</div>'+
      '</div></div>';
  }

  window._surveyToken    = token;
  window._surveySubmitted = false;

  var starRow = function(id, label){
    return '<div style="margin-bottom:20px">'+
      '<div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:8px">'+label+' <span style="color:#ef4444">*</span></div>'+
      '<div style="display:flex;gap:6px" id="stars-'+id+'">'+
      [1,2,3,4,5].map(function(n){
        return '<button type="button" data-star="'+n+'" data-group="'+id+'" onclick="_surveySetStar(\''+id+'\','+n+')" '+
          'style="width:40px;height:40px;border-radius:8px;border:2px solid #e2e8f0;background:#fff;font-size:20px;cursor:pointer;transition:all .15s">☆</button>';
      }).join('')+
      '</div>'+
      '<input type="hidden" id="survey-'+id+'" name="'+id+'">'+
    '</div>';
  };

  var radioRow = function(id, label, options){
    return '<div style="margin-bottom:20px">'+
      '<div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:8px">'+label+' <span style="color:#ef4444">*</span></div>'+
      '<div style="display:flex;flex-direction:column;gap:8px">'+
      options.map(function(opt){
        return '<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;color:#1e293b;background:#fff">'+
          '<input type="radio" name="'+id+'" value="'+opt+'" style="width:16px;height:16px;accent-color:#0F6E56" onchange="document.getElementById(\'survey-'+id+'\').value=this.value">'+
          opt+'</label>';
      }).join('')+
      '</div>'+
      '<input type="hidden" id="survey-'+id+'" name="'+id+'">'+
    '</div>';
  };

  window._surveySetStar = function(group, n){
    var container = document.getElementById('stars-'+group);
    if(!container) return;
    container.querySelectorAll('button').forEach(function(btn){
      var s = parseInt(btn.getAttribute('data-star'),10);
      btn.textContent = s<=n?'★':'☆';
      btn.style.borderColor = s<=n?'#f59e0b':'#e2e8f0';
      btn.style.color       = s<=n?'#f59e0b':'#64748b';
    });
    var inp = document.getElementById('survey-'+group);
    if(inp) inp.value = n;
  };

  window._surveySubmit = async function(){
    if (window._surveySubmitted){ UI.showToast && UI.showToast('Survey already submitted','warn'); return; }
    var gv = function(id){ var e=document.getElementById(id); return e?e.value.trim():''; };

    /* Validate mandatory questions */
    var errors = [];
    ['satisfaction','waiting_time','professionalism','communication','overall_experience'].forEach(function(f){
      if(!gv('survey-'+f)) errors.push(f.replace(/_/g,' '));
    });
    if(errors.length){
      if(window.UI&&UI.showToast) UI.showToast('Please answer all required questions: '+errors.join(', '),'err');
      return;
    }

    var payload = {
      token:              window._surveyToken,
      satisfaction:       gv('survey-satisfaction'),
      waitingTime:        gv('survey-waiting_time'),
      professionalism:    gv('survey-professionalism'),
      communication:      gv('survey-communication'),
      overallExperience:  gv('survey-overall_experience'),
      additionalComments: gv('survey-comments'),
      submittedAt:        new Date().toISOString(),
    };

    window._surveySubmitted = true;
    try {
      await API._fetchDirect('/surveys/submit',{method:'POST',body:JSON.stringify(payload)}).catch(function(){});
    } catch(_){}

    /* Show confirmation */
    var container = document.getElementById('survey-form-container');
    if(container) container.innerHTML =
      '<div style="text-align:center;padding:40px 24px">'+
      '<div style="font-size:56px;margin-bottom:16px">🙏</div>'+
      '<div style="font-size:22px;font-weight:800;color:#0F6E56;margin-bottom:12px">Thank You for Your Feedback!</div>'+
      '<div style="font-size:14px;color:#64748b;max-width:320px;margin:0 auto">Your feedback has been recorded. It helps us improve the care and services we provide to all our patients.</div>'+
      '</div>';
  };

  return '<div style="min-height:100vh;background:#f4f5f0;font-family:Arial,sans-serif;padding:24px 16px;box-sizing:border-box">'+
    '<div style="max-width:540px;margin:0 auto">'+
      '<div style="background:linear-gradient(135deg,#0F6E56,#1A4A9B);border-radius:16px 16px 0 0;padding:24px;text-align:center;margin-bottom:0">'+
        '<div style="font-size:32px;margin-bottom:8px">💬</div>'+
        '<div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:4px">Patient Feedback Survey</div>'+
        '<div style="font-size:13px;color:rgba(255,255,255,.8)">Your experience matters to us</div>'+
      '</div>'+
      '<div id="survey-form-container" style="background:#fff;border-radius:0 0 16px 16px;padding:28px 24px;box-shadow:0 4px 24px rgba(0,0,0,.08)">'+
        '<div style="font-size:13px;color:#64748b;margin-bottom:24px;padding:12px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0">'+
          '📋 This survey should take less than 2 minutes. All questions marked with <span style="color:#ef4444">*</span> are required.'+
        '</div>'+
        radioRow('satisfaction','Overall Satisfaction',['Very satisfied','Satisfied','Neutral','Dissatisfied','Very dissatisfied'])+
        radioRow('waiting_time','Waiting Time',['Very short','Acceptable','Long','Very long'])+
        radioRow('professionalism','Staff Professionalism',['Excellent','Good','Average','Poor'])+
        radioRow('communication','Communication & Explanation',['Yes, very clearly','Mostly clear','Somewhat unclear','Not explained at all'])+
        starRow('overall_experience','Overall Experience (1–5 stars)')+
        '<div style="margin-bottom:24px">'+
          '<div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:8px">Additional Comments <span style="font-size:12px;font-weight:400;color:#64748b">(Optional)</span></div>'+
          '<textarea id="survey-comments" rows="4" placeholder="Any other feedback or suggestions…" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;box-sizing:border-box;outline:none"></textarea>'+
        '</div>'+
        '<button onclick="_surveySubmit()" style="width:100%;padding:14px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit">Submit Feedback</button>'+
        '<div style="font-size:11px;color:#94a3b8;text-align:center;margin-top:12px">Your response is confidential and protected in accordance with POPIA (Protection of Personal Information Act).</div>'+
      '</div>'+
    '</div>'+
  '</div>';
};
Pages['survey'].noAuth = true;  /* No login required flag */

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

  var u          = _dGetUser();
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
          '<button onclick="_D.view=\'medical_notes\';_dRender()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'+
            'Back to Diagnosis &amp; Clinical Assessment'+
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
  requestAnimationFrame(_dLoadTeleSessions);
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
    '</div>';
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
              '📹 '+(isLive?'Rejoin (new tab)':isSoon?'Start Consultation':'Start Consultation')+
            '</button>':'')+
            (isLive?'<button onclick="_dEndTeleCall(\''+a._id+'\')" style="padding:9px 18px;border-radius:8px;border:none;background:#dc2626;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px">'+
              '📵 End Session'+
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

/* ── Broadcast helper: notify patient tab that session started / ended ── */
function _dTeleNotify(type, payload){
  try {
    var ch = new BroadcastChannel('nihms_tele_notify');
    ch.postMessage(Object.assign({ type: type }, payload || {}));
    ch.close();
  } catch(_) {}
  /* Also persist to localStorage so a patient tab that opens later catches up */
  try {
    localStorage.setItem('nihms_tele_session', JSON.stringify(Object.assign({
      type: type, ts: Date.now()
    }, payload || {})));
  } catch(_) {}
}

/* ── Build deterministic Jitsi URL from appointmentId ── */
function _dBuildJitsiUrl(appointmentId, displayName){
  var roomName = 'nihms-' + String(appointmentId).replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
  var dn = encodeURIComponent(displayName || 'Doctor');
  return 'https://meet.jit.si/' + roomName +
    '#userInfo.displayName="' + dn + '"' +
    '&config.prejoinPageEnabled=false' +
    '&config.startWithAudioMuted=false' +
    '&config.startWithVideoMuted=false' +
    '&config.disableDeepLinking=true';
}

/* ── Shared presence key ── */
function _dTelePresenceKey(appointmentId){ return 'nihms_tele_presence_' + appointmentId; }

/* ── Read / write presence state ── */
function _dTelePresenceGet(appointmentId){
  try { return JSON.parse(localStorage.getItem(_dTelePresenceKey(appointmentId)) || 'null') || {}; } catch(_){ return {}; }
}
function _dTelePresenceSet(appointmentId, patch){
  var cur = _dTelePresenceGet(appointmentId);
  var next = Object.assign({}, cur, patch);
  try { localStorage.setItem(_dTelePresenceKey(appointmentId), JSON.stringify(next)); } catch(_){}
  return next;
}

/* ── Both-left → mark appointment completed ── */
window._dTeleCheckComplete = async function(appointmentId){
  var p = _dTelePresenceGet(appointmentId);
  if(!p.doctorLeft || !p.patientLeft) return; /* still waiting for one side */

  /* Record end time */
  _dTelePresenceSet(appointmentId, { endTime: new Date().toISOString() });

  /* Notify patient tab: session is fully over */
  _dTeleNotify('TELE_END', { appointmentId: appointmentId });
  try { localStorage.removeItem('nihms_tele_session'); } catch(_){}

  /* PATCH appointment → completed with timing */
  if(appointmentId){
    var pr = _dTelePresenceGet(appointmentId);
    try {
      await API._fetchDirect('/appointments/'+appointmentId+'/status',{
        method:'PATCH',
        body: JSON.stringify({
          status: 'completed',
          startTime: pr.startTime || null,
          endTime:   pr.endTime   || null
        })
      });
    } catch(e){ /* non-fatal */ }
  }

  if(window.UI && window.UI.showToast) UI.showToast('Consultation completed — both participants have left','ok');
  if(window._dDashTeleLoad) window._dDashTeleLoad();
  if(typeof _dLoadTeleSessions === 'function') _dLoadTeleSessions();
};

/* ── Presence broadcast channel listener (doctor side) ── */
function _dStartPresenceListener(appointmentId){
  /* Close any existing listener */
  try { if(window._dPresenceBC){ window._dPresenceBC.close(); window._dPresenceBC = null; } } catch(_){}
  try {
    window._dPresenceBC = new BroadcastChannel('nihms_tele_presence');
    window._dPresenceBC.onmessage = function(ev){
      var d = ev && ev.data;
      if(!d || d.appointmentId !== appointmentId) return;
      if(d.type === 'PATIENT_LEFT'){
        _dTelePresenceSet(appointmentId, { patientLeft: true });
        window._dTeleCheckComplete(appointmentId);
      }
    };
  } catch(_){}

  /* Also poll localStorage as fallback for cross-origin / blocked BC */
  window._dPresencePoll = setInterval(function(){
    var p = _dTelePresenceGet(appointmentId);
    if(p.patientLeft && p.doctorLeft){
      clearInterval(window._dPresencePoll);
      window._dTeleCheckComplete(appointmentId);
    }
  }, 5000);
}

/* ── Join a telemedicine session — opens Jitsi in new tab, notifies patient ── */
window._dJoinTeleSession = async function(appointmentId){
  /* Show loading state on the clicked button */
  var allBtns = document.querySelectorAll('#tele-session-list button, #dash-tele-list button');
  allBtns.forEach(function(b){
    var oc = b.getAttribute('onclick') || '';
    if(oc.includes(appointmentId)){ b.disabled=true; b.innerHTML='<span style="opacity:.7">Opening…</span>'; }
  });

  try {
    /* 1. Call /join — backend returns room URL and session details */
    var res  = await API._fetchDirect('/appointments/'+appointmentId+'/join', { method:'GET' });
    var data = (res && res.data) || {};

    /* 2. Build deterministic room URL */
    var u = _dGetUser();
    var displayName = u.firstName ? 'Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim() : (u.name||'Doctor');
    var jitsiUrl = data.roomUrl || _dBuildJitsiUrl(appointmentId, displayName);

    /* 3. Record start time + reset presence state */
    var startTime = new Date().toISOString();
    _dTelePresenceSet(appointmentId, {
      startTime: startTime,
      doctorLeft: false,
      patientLeft: false,
      endTime: null,
      appointmentId: appointmentId
    });

    /* 4. Mark appointment as in_progress */
    try {
      await API._fetchDirect('/appointments/'+appointmentId+'/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'in_progress', startTime: startTime })
      });
    } catch(_) { /* non-fatal */ }

    /* 5. Notify patient tab: "Your doctor is ready — please join" */
    var roomName = data.roomName || ('nihms-' + String(appointmentId).replace(/[^a-zA-Z0-9]/g,'').toLowerCase());
    _dTeleNotify('TELE_START', {
      appointmentId: appointmentId,
      roomName:   roomName,
      roomUrl:    data.roomUrl || ('https://meet.jit.si/'+roomName),
      patientId:  (data.patient && (data.patient._id || data.patient.id)) || '',
      doctorName: displayName,
      scheduledAt: data.scheduledAt || ''
    });

    /* 6. Open Jitsi in a new browser tab for the doctor */
    var tab = window.open(jitsiUrl, '_blank');
    if(!tab){
      UI.showToast('Pop-up blocked — please allow pop-ups for NIHMS and try again','warn');
    } else {
      UI.showToast('Video room opened in a new tab. Return here to manage the session.','ok');
    }

    /* 7. Start listening for patient departure */
    _dStartPresenceListener(appointmentId);

    /* 8. Register beforeunload to broadcast DOCTOR_LEFT if the NIHMS tab itself is closed */
    window._dActiveTeleApptId = appointmentId;
    /* Also persist on workflow so _dEndConsult can resolve it */
    if (_D.workflow) _D.workflow.appointmentId = appointmentId;
    window.addEventListener('beforeunload', _dHandleDoctorTabClose, { once: true });

    /* 9. Refresh dashboard tele list */
    setTimeout(function(){ if(window._dDashTeleLoad) window._dDashTeleLoad(); }, 1500);

  } catch(err){
    if(window.UI && window.UI.showToast) UI.showToast('Could not start session: '+(err.message||'Unknown error'),'err');
    if(typeof _dLoadTeleSessions === 'function') _dLoadTeleSessions();
  }
};

/* ── Called by beforeunload when NIHMS tab closes mid-session ── */
function _dHandleDoctorTabClose(){
  var apptId = window._dActiveTeleApptId;
  if(!apptId) return;
  _dTelePresenceSet(apptId, { doctorLeft: true });
  try {
    var ch = new BroadcastChannel('nihms_tele_presence');
    ch.postMessage({ type:'DOCTOR_LEFT', appointmentId: apptId });
    ch.close();
  } catch(_){}
}

/* ── Doctor explicitly ends the session from the NIHMS dashboard ── */
window._dEndTeleCall = function(appointmentId){
  var apptId = appointmentId || window._dActiveTeleApptId;
  if(!apptId) return;

  /* Mark doctor as left and broadcast */
  _dTelePresenceSet(apptId, { doctorLeft: true });
  try {
    var ch = new BroadcastChannel('nihms_tele_presence');
    ch.postMessage({ type:'DOCTOR_LEFT', appointmentId: apptId });
    ch.close();
  } catch(_){}

  /* Clear beforeunload listener since we're handling it explicitly */
  window.removeEventListener('beforeunload', _dHandleDoctorTabClose);
  window._dActiveTeleApptId = null;

  /* Stop polling */
  if(window._dPresencePoll){ clearInterval(window._dPresencePoll); window._dPresencePoll = null; }
  try { if(window._dPresenceBC){ window._dPresenceBC.close(); window._dPresenceBC = null; } } catch(_){}

  UI.showToast('You have left the session. Waiting for patient to leave before marking complete…','ok');

  /* Check immediately in case patient already left */
  window._dTeleCheckComplete(apptId);

  /* Refresh views */
  if(window._dDashTeleLoad) window._dDashTeleLoad();
  if(typeof _dLoadTeleSessions === 'function') _dLoadTeleSessions();
};

/* ══════════════════════════════════════════════════════════════════
   MESSAGES
══════════════════════════════════════════════════════════════════ */
function _dMessages(){
  var msgs   = _D.messages;
  var u      = _dGetUser();
  var docName= u.firstName ? 'Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim() : (u.name||'Doctor');

  /* Load messages from API on every view open or view change.
     _msgsLoaded is set to false AFTER data arrives so a tab switch always refetches. */
  var _msgUser = _dGetUser();
  var _msgDoctorId = String(_msgUser._id || _msgUser.id || '');
  var _currentView = window._msgView || 'inbox';
  if (_msgDoctorId && (!_D._msgsLoaded || _D._msgsView !== _currentView)) {
    /* Mark fetching — will be set false again once data arrives so re-entry is possible */
    _D._msgsView = _currentView;
    _D._msgsLoaded = true; /* prevent duplicate parallel fetches only */
    (async function(){
      try {
        var view = _currentView;
        var fetched = [];
        if (view === 'sent') {
          /* Sent folder: messages this doctor sent */
          var _sRes = await API._fetchDirect(
            '/messages?senderId=' + encodeURIComponent(_msgDoctorId) + '&limit=100'
          ).catch(function(){ return null; });
          fetched = (_sRes && (_sRes.data || _sRes.messages || [])) || [];
        } else {
          /* Inbox: single request passing BOTH recipientId and recipientRole so the
             backend $or query returns messages addressed directly to this doctor AND
             broadcast messages sent to role=DOCTOR (e.g. from receptionist).
             Backend fix (messages_route.js) now handles recipientId+recipientRole as $or. */
          var _byId = await API._fetchDirect(
            '/messages?recipientId=' + encodeURIComponent(_msgDoctorId) + '&limit=100'
          ).catch(function(){ return null; });
          var _byRole = await API._fetchDirect(
            '/messages?recipientRole=DOCTOR&limit=100'
          ).catch(function(){ return null; });

          var listById   = (_byId   && (_byId.data   || _byId.messages   || [])) || [];
          var listByRole = (_byRole && (_byRole.data || _byRole.messages || [])) || [];

          /* Merge and deduplicate by _id string */
          var seen = {};
          fetched = listById.concat(listByRole).filter(function(m){
            var key = String(m._id || m.id || '');
            if (!key || seen[key]) return false;
            seen[key] = true;
            return true;
          });

          /* Sort newest-first */
          fetched.sort(function(a,b){
            return new Date(b.sentAt || b.createdAt || 0) - new Date(a.sentAt || a.createdAt || 0);
          });
        }

        /* Normalise API shape → internal doctor.js shape */
        _D.messages = fetched.map(function(m){
          var rawId = m._id || m.id;
          return {
            id:         String(rawId || ''),
            _id:        String(rawId || ''),
            senderId:   m.senderId,
            from:       m.from || m.senderName || 'Staff',
            senderName: m.from || m.senderName || 'Staff',
            role:       m.fromRole || m.role || m.senderRole || 'Staff',
            fromRole:   m.fromRole || m.senderRole || m.role || '',
            senderRole: m.fromRole || m.senderRole || m.role || '',
            subject:    m.subject || '(No subject)',
            text:       m.body   || m.text || '',
            body:       m.body   || m.text || '',
            priority:   m.priority || 'Normal',
            time:       m.time || (m.sentAt
              ? new Date(m.sentAt).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})
              : ''),
            sentAt:     m.sentAt || m.createdAt || '',
            unread:     m.unread !== undefined ? !!m.unread : (m.readStatus === 'unread'),
            readStatus: m.readStatus || (m.unread ? 'unread' : 'read'),
          };
        });

        /* Allow next tab-switch to refetch fresh data */
        _D._msgsLoaded = false;
        _dRender();
      } catch(_me){
        console.error('[Doctor Messages] fetch error:', _me);
        _D._msgsLoaded = false; /* allow retry */
      }
    })();
  }
  var unreadCount = msgs.filter(function(m){return m.unread||m.status==='unread';}).length;
  var sentCount   = msgs.filter(function(m){
    return m.senderId===_msgDoctorId || m.from==='Dr (You)';
  }).length;

  /* State flags */
  window._msgView    = window._msgView    || 'inbox';   /* inbox | sent | important | compose */
  window._msgThread  = window._msgThread  || null;

  /* Recipients list */
  var RECIPIENTS = [
    {value:'Nurse Station',        label:'Nurse Station',         icon:'🏥', role:'NURSE_STATION'},
    {value:'Reception',            label:'Reception',             icon:'🧑‍💼', role:'RECEPTIONIST'},
    {value:'Pharmacy',             label:'Pharmacy',              icon:'💊', role:'PHARMACY'},
    {value:'Laboratory',           label:'Laboratory',            icon:'🔬', role:'LAB'},
    {value:'Radiology',            label:'Radiology',             icon:'🩻', role:'RADIOLOGY'},
    {value:'Another Doctor',       label:'Another Doctor',        icon:'👨‍⚕️', role:'DOCTOR'},
    {value:'Specific staff member',label:'Specific staff member', icon:'👤', role:'ADMIN'},
  ];
  /* Map display value → canonical recipientRole for the backend enum */
  var _dRoleMap = {};
  RECIPIENTS.forEach(function(r){ _dRoleMap[r.value] = r.role; });

  /* Field helpers */
  function _msgFld(){
    return 'width:100%;padding:10px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:14px;font-family:inherit;color:'+C.text+';background:#fff;box-sizing:border-box;outline:none';
  }
  function _msgLabel(t,req){
    return '<label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:6px">'+t+(req?' <span style="color:'+C.red+'">*</span>':'')+'</label>';
  }
  function _msgCard(title,content){
    return '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px;margin-bottom:16px">'+
      (title?'<div style="font-size:15px;font-weight:800;color:'+C.text+';margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid '+C.border+'">'+title+'</div>':'')+
      content+
    '</div>';
  }

  /* ── Sidebar ── */
  var folders = [
    {key:'inbox',     label:'Inbox',     icon:'📥', desc:'Messages received by the doctor', badge:unreadCount},
    {key:'sent',      label:'Sent',      icon:'📤', desc:'Messages sent to staff',           badge:sentCount},
    {key:'important', label:'Important', icon:'⭐', desc:'Flagged messages',                 badge:0},
  ];
  var sidebar =
    '<div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">'+

      /* Stats card */
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Messages</div>'+
        '<div style="font-size:11px;color:'+C.muted+';margin-bottom:10px">Internal communication</div>'+
        '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">'+
          '<div style="display:flex;justify-content:space-between;align-items:center">'+
            '<span style="font-size:12px;color:'+C.muted+'">Unread messages</span>'+
            '<span style="font-size:14px;font-weight:800;color:'+C.red+'">'+unreadCount+'</span>'+
          '</div>'+
          '<div style="display:flex;justify-content:space-between;align-items:center">'+
            '<span style="font-size:12px;color:'+C.muted+'">Sent messages</span>'+
            '<span style="font-size:14px;font-weight:800;color:'+C.text+'">'+sentCount+'</span>'+
          '</div>'+
        '</div>'+
        '<button onclick="window._msgView=\'compose\';if(typeof _dRender===\'function\')_dRender()" '+
          'style="width:100%;padding:10px 14px;border:none;border-radius:9px;background:linear-gradient(135deg,'+C.teal+' 0%,#1A4A9B 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;text-align:center">'+
          '✉ Compose Message'+
        '</button>'+
      '</div>'+

      /* Folders card */
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px">'+
        '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:'+C.muted+';margin-bottom:12px">Folders</div>'+
        '<div style="display:flex;flex-direction:column;gap:2px">'+
          folders.map(function(f){
            var active = window._msgView===f.key;
            return '<button onclick="window._msgView=\''+f.key+'\';window._msgThread=null;if(_D)_D._msgsLoaded=false;if(typeof _dRender===\'function\')_dRender()" '+
              'style="display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border:none;border-radius:8px;background:'+(active?C.blueLt:'transparent')+';cursor:pointer;text-align:left;font-family:inherit;border:1.5px solid '+(active?C.teal:'transparent')+'">'+
              '<span style="font-size:15px">'+f.icon+'</span>'+
              '<div style="flex:1;min-width:0">'+
                '<div style="font-size:13px;font-weight:'+(active?'700':'500')+';color:'+(active?C.teal:C.text)+'">'+f.label+'</div>'+
                '<div style="font-size:10px;color:'+C.muted+';line-height:1.3">'+f.desc+'</div>'+
              '</div>'+
              (f.badge?'<span style="min-width:18px;height:18px;border-radius:9px;background:'+C.red+';color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 3px">'+f.badge+'</span>':'')+
            '</button>';
          }).join('')+
        '</div>'+
      '</div>'+

    '</div>';

  /* ── COMPOSE VIEW ── */
  if(window._msgView==='compose'){
    var mainCompose =
      '<div style="flex:1;min-width:0">'+

      /* Title banner */
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:18px 24px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">'+
        '<div>'+
          '<div style="font-size:18px;font-weight:800;color:'+C.text+'">New Message</div>'+
          '<div style="font-size:13px;color:'+C.muted+';margin-top:2px">From: '+docName+'</div>'+
        '</div>'+
        '<button onclick="window._msgView=\'inbox\';if(typeof _dRender===\'function\')_dRender()" '+
          'style="padding:7px 16px;border:1.5px solid '+C.border+';border-radius:8px;background:#fff;font-size:13px;font-weight:600;color:'+C.muted+';cursor:pointer;font-family:inherit">'+
          '← Back'+
        '</button>'+
      '</div>'+

      /* Recipient */
      _msgCard('Recipient',
        _msgLabel('Send To',true)+
        '<div style="display:flex;flex-direction:column;gap:8px">'+
          RECIPIENTS.map(function(r,i){
            return '<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid '+C.border+';border-radius:9px;cursor:pointer;font-size:13px;font-weight:600;color:'+C.text+';background:#fff" '+
              'onmouseenter="this.style.borderColor=\''+C.teal+'\';this.style.background=\''+C.blueLt+'\'" '+
              'onmouseleave="this.style.borderColor=\''+C.border+'\';this.style.background=\'#fff\'">'+
              '<input type="radio" name="msg-recipient" value="'+r.value+'"'+(i===0?' checked':'')+' style="accent-color:'+C.teal+'"> '+
              '<span style="font-size:15px">'+r.icon+'</span>'+
              '<span>'+r.label+'</span>'+
            '</label>';
          }).join('')+
        '</div>'+
        '<div style="margin-top:12px">'+
          _msgLabel('Specific Staff Member (optional)',false)+
          '<input id="msg-specific-staff" type="text" placeholder="e.g. Sr. Dlamini, Dr. Khumalo" style="'+_msgFld()+'">'+
        '</div>'
      )+

      /* Priority */
      _msgCard('Priority',
        _msgLabel('Message Priority',true)+
        '<div style="display:flex;flex-direction:column;gap:8px">'+
          [
            {val:'Normal',   label:'Normal',                        icon:'🔵', desc:'Standard internal communication'},
            {val:'High',     label:'High Priority',                 icon:'🟠', desc:'Requires prompt attention'},
            {val:'Urgent',   label:'Urgent Clinical Communication', icon:'🔴', desc:'Immediate clinical action required'},
          ].map(function(p,i){
            return '<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid '+C.border+';border-radius:9px;cursor:pointer;font-size:13px;background:#fff" '+
              'onmouseenter="this.style.borderColor=\''+C.teal+'\'" onmouseleave="this.style.borderColor=\''+C.border+'\'">'+
              '<input type="radio" name="msg-priority" value="'+p.val+'"'+(i===0?' checked':'')+' style="accent-color:'+C.teal+'">'+
              '<span style="font-size:15px">'+p.icon+'</span>'+
              '<div><div style="font-weight:700;color:'+C.text+'">'+p.label+'</div>'+
                '<div style="font-size:11px;color:'+C.muted+'">'+p.desc+'</div>'+
              '</div>'+
            '</label>';
          }).join('')+
        '</div>'
      )+

      /* Subject + Patient ID */
      _msgCard('Subject &amp; Patient',
        '<div style="display:flex;flex-direction:column;gap:12px">'+
          '<div>'+_msgLabel('Subject',true)+'<input id="msg-subject" type="text" placeholder="Enter message subject…" style="'+_msgFld()+'"></div>'+
          '<div>'+
            _msgLabel('Patient ID (optional)',false)+
            '<input id="msg-patient-id" type="text" placeholder="e.g. PT-00231" style="'+_msgFld()+'">'+
            '<div style="font-size:11px;color:'+C.muted+';margin-top:5px">Link the message to a patient when clinically relevant.</div>'+
          '</div>'+
        '</div>'
      )+

      /* Message body */
      _msgCard('Message',
        _msgLabel('Message',true)+
        '<textarea id="msg-body" rows="6" placeholder="Type your message here…" style="'+_msgFld()+';resize:vertical"></textarea>'

      )+

      /* Actions */
      '<div style="display:flex;gap:12px;padding-bottom:24px">'+
        '<button id="btn-send-msg" onclick="_dSendMessage()" style="flex:1;padding:13px 24px;border:none;border-radius:10px;background:linear-gradient(135deg,'+C.teal+' 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">✉ Send Message</button>'+
        '<button onclick="window._msgView=\'inbox\';if(typeof _dRender===\'function\')_dRender()" style="padding:13px 24px;border:1.5px solid '+C.border+';border-radius:10px;background:#fff;color:'+C.muted+';font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Cancel</button>'+
      '</div>'+

      '</div>'; /* end mainCompose */

    window._dSendMessage = async function(){
      /* Submit guard */
      var _smBtn = document.getElementById('btn-send-msg');
      if (_smBtn && _smBtn.getAttribute('data-sending')) return;
      if (_smBtn){ _smBtn.setAttribute('data-sending','1'); _smBtn.disabled=true; _smBtn.style.opacity='0.7'; _smBtn.textContent='Sending…'; }
      function _smReset(){ if(_smBtn){ _smBtn.removeAttribute('data-sending'); _smBtn.disabled=false; _smBtn.style.opacity=''; _smBtn.textContent='Send Message'; } }
      function _smToast(m,t){ try{ if(window.UI&&window.UI.showToast)window.UI.showToast(m,t); }catch(_){} }

      var g = function(id){ return (document.getElementById(id)||{value:''}).value.trim(); };
      var recpEl = document.querySelector('input[name="msg-recipient"]:checked');
      var prioEl = document.querySelector('input[name="msg-priority"]:checked');
      var recip    = recpEl ? recpEl.value : '';
      var specific = g('msg-specific-staff');
      var subject  = g('msg-subject');
      var patId    = g('msg-patient-id');
      var body     = g('msg-body');
      var priority = prioEl ? prioEl.value : 'Normal';

      /* Validation */
      if (!recip){ _smReset(); _smToast('Please select a recipient (Send To)','err'); return; }
      if (!subject){ _smReset(); _smToast('Please enter a subject','err'); return; }
      if (!body){ _smReset(); _smToast('Please enter a message','err'); return; }

      /* Resolve sender */
      var _smUser = _dGetUser();
      var senderId   = _smUser._id || _smUser.id || null;
      var senderName = _smUser.firstName
        ? 'Dr '+((_smUser.firstName||'')+' '+(_smUser.lastName||'')).trim()
        : (_smUser.name||'Doctor');
      var senderRole = _smUser.role || 'Doctor';

      if (!senderId){ _smReset(); _smToast('Could not identify your account — please refresh and try again.','err'); return; }

      /* Patient context */
      var pat = _D.consultPat||_D.pat360Data||_D.selectedPat||{};

      var payload = {
        senderId:      senderId,
        senderName:    senderName,
        senderRole:    (senderRole||'').toUpperCase().replace('DOCTOR/CLINICIAN','DOCTOR').replace('DOCTOR / CLINICIAN','DOCTOR') || 'DOCTOR',
        recipientRole: _dRoleMap[recip] || recip.replace(/ /g,'_').toUpperCase(),
        recipientName: specific || recip,
        recipientStaffMember: specific||undefined,
        subject:       subject,
        body:          body,
        priority:      priority,
        patientId:     patId||(pat._id||pat.id||undefined),
        patientName:   patId ? undefined : (pat.name||pat.fullName||pat.firstName||undefined),
        sentAt:        new Date().toISOString(),
        status:        'sent',
        deliveryStatus:'delivered',
        readStatus:    'unread',
      };

      try {
        var _smRes = await API._fetchDirect('/messages',{method:'POST',body:JSON.stringify(payload)});
        if (_smRes && (_smRes.error || _smRes.status === false || (_smRes.statusCode && _smRes.statusCode >= 400))){
          _smReset();
          _smToast((_smRes.message||_smRes.error||'Could not send message — please try again.'),'err');
          return;
        }
        /* Notify via Socket.IO if available */
        try{
          if(window.socket&&window.socket.emit){
            window.socket.emit('new-message',{recipientRole:recip,specificStaff:specific||null,messageId:(_smRes&&(_smRes._id||_smRes.id))||null,senderId:senderId});
          }
        }catch(_se){}
        /* Force reload of messages on next render */
        _D._msgsLoaded = false;
        _D.messages = [];
        _smReset();
        _smToast('Message sent to '+(specific||recip),'ok');
        window._msgView='sent';
        window._msgThread=null;
        _dRender();
      } catch(smErr){
        _smReset();
        _smToast((smErr&&smErr.message)||'Could not send message — please try again.','err');
      }
    };

    return _dHeader('Messages','Internal communication · Secure team messaging','')+
      '<div style="flex:1;overflow:auto;padding:16px 20px;display:flex;gap:16px;align-items:flex-start">'+
        mainCompose+
        sidebar+
      '</div>';
  }

  /* ── INBOX / SENT / IMPORTANT VIEW ── */
  var folder     = window._msgView||'inbox';
  var folderMeta = folders.find(function(f){return f.key===folder;})||folders[0];

  var _vmUser = _dGetUser();
  var _vmDocId = _vmUser._id||_vmUser.id||null;
  var visibleMsgs = folder==='sent'
    ? msgs.filter(function(m){return m.senderId===_vmDocId || m.from==='Dr (You)';})
    : folder==='important'
      ? msgs.filter(function(m){return m.important;})
      : msgs.filter(function(m){return m.senderId!==_vmDocId && m.from!=='Dr (You)';});

  /* Thread detail */
  if(window._msgThread!==null){
    /* IDs may be MongoDB ObjectId strings — compare as strings */
    var _tId = String(window._msgThread);
    var threadMsg = msgs.find(function(m){ return String(m._id||m.id)===_tId; }) || msgs[0];
    /* Mark as read via API */
    var mi = msgs.findIndex(function(m){ return String(m._id||m.id)===_tId; });
    if(mi>-1 && (msgs[mi].unread||msgs[mi].readStatus==='unread')){
      msgs[mi].unread=false; msgs[mi].readStatus='read';
      var _mrId = msgs[mi]._id||msgs[mi].id;
      if(_mrId && window.API && API._fetchDirect){
        API._fetchDirect('/messages/'+_mrId+'/read',{method:'PATCH'}).catch(function(){});
      }
    }

    var detailMain =
      '<div style="flex:1;min-width:0">'+
        '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px;margin-bottom:16px">'+
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px">'+
            '<div>'+
              '<div style="font-size:17px;font-weight:800;color:'+C.text+'">'+threadMsg.text.slice(0,60)+(threadMsg.text.length>60?'…':'')+'</div>'+
              '<div style="font-size:12px;color:'+C.muted+';margin-top:4px">From: <strong>'+threadMsg.from+'</strong> · <strong>'+threadMsg.role+'</strong> · '+threadMsg.time+'</div>'+
            '</div>'+
            '<button onclick="window._msgThread=null;if(typeof _dRender===\'function\')_dRender()" style="padding:7px 14px;border:1.5px solid '+C.border+';border-radius:8px;background:#fff;font-size:12px;font-weight:600;color:'+C.muted+';cursor:pointer;font-family:inherit">← Back</button>'+
          '</div>'+
          '<div style="background:#f8fafc;border-radius:10px;padding:16px;font-size:14px;color:'+C.text+';line-height:1.7">'+threadMsg.text+'</div>'+
        '</div>'+
        /* Reply box */
        '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px;margin-bottom:24px">'+
          '<div style="font-size:14px;font-weight:700;color:'+C.text+';margin-bottom:12px">Reply</div>'+
          '<textarea id="msg-reply-body" rows="4" placeholder="Type your reply…" style="width:100%;padding:10px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:14px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box"></textarea>'+
          '<div style="display:flex;gap:10px;margin-top:12px">'+
            '<button onclick="var b=(document.getElementById(\'msg-reply-body\')||{value:\'\'}).value.trim();if(b){_D.messages.unshift({id:Date.now(),from:\'Dr (You)\',role:\''+threadMsg.role+'\',text:b,time:new Date().toLocaleTimeString(\'en-ZA\',{hour:\'2-digit\',minute:\'2-digit\'}),unread:false});window._msgThread=null;_dRender();}else{if(window.UI&&UI.showToast)UI.showToast(\'Enter a reply\',\'err\');}" '+
              'style="flex:1;padding:11px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,'+C.teal+' 0%,#1A4A9B 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Send Reply</button>'+
            '<button onclick="window._msgThread=null;if(typeof _dRender===\'function\')_dRender()" style="padding:11px 20px;border:1.5px solid '+C.border+';border-radius:10px;background:#fff;color:'+C.muted+';font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Cancel</button>'+
          '</div>'+
        '</div>'+
      '</div>';

    return _dHeader('Messages','Internal communication · Secure team messaging','')+
      '<div style="flex:1;overflow:auto;padding:16px 20px;display:flex;gap:16px;align-items:flex-start">'+
        detailMain+sidebar+
      '</div>';
  }

  /* Message list */
  var listMain =
    '<div style="flex:1;min-width:0">'+

    /* Folder header + Compose button */
    '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:18px 24px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">'+
      '<div>'+
        '<div style="font-size:18px;font-weight:800;color:'+C.text+'">'+folderMeta.icon+' '+folderMeta.label+'</div>'+
        '<div style="font-size:13px;color:'+C.muted+';margin-top:2px">'+folderMeta.desc+'</div>'+
      '</div>'+
      '<button onclick="window._msgView=\'compose\';if(typeof _dRender===\'function\')_dRender()" '+
        'style="display:flex;align-items:center;gap:8px;padding:10px 18px;border:none;border-radius:10px;background:linear-gradient(135deg,'+C.teal+' 0%,#1A4A9B 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">'+
        '✉ Compose Message'+
      '</button>'+
    '</div>'+

    /* Message rows */
    '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;overflow:hidden;margin-bottom:24px">'+
      (visibleMsgs.length
        ? visibleMsgs.map(function(m,i){
            var unread = m.unread !== false && (m.readStatus === 'unread' || m.unread) && m.from !== 'Dr (You)';
            var prioIcon = m.priority === 'Urgent' ? '🔴 ' : m.priority === 'High' ? '🟠 ' : '';
            var mSubject = m.subject || m.text.slice(0,50) || '(No subject)';
            var mPreview = m.body || m.text || '';
            var mFrom = m.from || m.senderName || 'Staff';
            var mRole  = m.role || m.fromRole || m.senderRole || 'Staff';
            /* Use string ID quoted in onclick so MongoDB ObjectIDs work */
            var mId = String(m._id || m.id || '');
            return '<div onclick="window._msgThread=\''+mId+'\';if(typeof _dRender===\'function\')_dRender()" '+
              'style="display:flex;align-items:flex-start;gap:12px;padding:14px 18px;border-bottom:1px solid '+C.border+';background:'+(unread?C.blueLt:'#fff')+';cursor:pointer" '+
              'onmouseenter="this.style.background=\''+C.blueLt+'\'" onmouseleave="this.style.background=\''+(unread?C.blueLt:'#fff')+'\'">'+
              '<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,'+C.teal+' 0%,#1A4A9B 100%);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;font-weight:700">'+
                mFrom.split(' ').map(function(n){return n[0]||'';}).join('').slice(0,2).toUpperCase()+
              '</div>'+
              '<div style="flex:1;min-width:0">'+
                '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">'+
                  '<div style="font-size:14px;font-weight:'+(unread?'700':'500')+';color:'+C.text+'">'+prioIcon+mFrom+' <span style="font-size:11px;color:'+C.muted+';font-weight:400">· '+mRole+'</span></div>'+
                  '<div style="font-size:11px;color:'+C.muted+';flex-shrink:0">'+m.time+'</div>'+
                '</div>'+
                '<div style="font-size:13px;font-weight:'+(unread?'600':'400')+';color:'+C.text+';margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+mSubject+'</div>'+
                '<div style="font-size:12px;color:'+C.muted+';margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+mPreview.slice(0,80)+(mPreview.length>80?'…':'')+'</div>'+
                (unread?'<span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:10px;background:'+C.blueLt+';color:'+C.teal+';font-size:10px;font-weight:700">Unread</span>':'')+
              '</div>'+
            '</div>';
          }).join('')
        : '<div style="padding:40px;text-align:center;color:'+C.muted+'">'+
            '<div style="font-size:32px;margin-bottom:8px">📭</div>'+
            '<div style="font-size:14px;font-weight:600;color:'+C.text+'">No messages in '+folderMeta.label+'</div>'+
          '</div>'
      )+
    '</div>'+

    '</div>'; /* end listMain */

  return _dHeader('Messages','Internal communication · Secure team messaging','')+
    '<div style="flex:1;overflow:auto;padding:16px 20px;display:flex;gap:16px;align-items:flex-start">'+
      listMain+sidebar+
    '</div>';
}

/* ══════════════════════════════════════════════════════════════════
   MEDICAL CERTIFICATES
══════════════════════════════════════════════════════════════════ */
function _dMedCerts(){
  window._mcIssuing = false; /* reset on each render so button is never permanently locked */
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
  var u       = _dGetUser();
  var docName = u.firstName||u.lastName
    ? 'Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim()
    : '';
  var docHpcsa    = u.hpcsa || u.hpcsaNumber || u.registrationNumber || u.regNo || '';
  var docPhone    = u.phone || u.workPhone || u.contact || '';
  var docFacility = u.facility || u.facilityName || u.practice || 'National Integrated Healthcare Management System';

  var certNo = 'NIHMS-CERT-'+(today.replace(/-/g,''))+'-'+(Math.floor(1000+Math.random()*9000));

  /* Register globals before DOM is injected */
  window._dIssueMedCert = async function(){
    /* Duplicate-submit guard */
    if (window._mcIssuing) return;
    window._mcIssuing = true;

    var gv = function(id){ var e=document.getElementById(id); return e?e.value.trim():''; };
    function _mcToast(msg,type){
      try{ if(window.UI&&window.UI.showToast){ window.UI.showToast(msg,type); return; } }catch(_){}
      /* Fallback: visible banner */
      var _tb=document.getElementById('mc-toast-banner');
      if(!_tb){_tb=document.createElement('div');_tb.id='mc-toast-banner';
        _tb.style.cssText='position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:99999;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;box-shadow:0 4px 14px rgba(0,0,0,.25);display:flex;align-items:center;gap:10px;max-width:480px;text-align:center';
        document.body.appendChild(_tb);}
      _tb.style.background=(type==='err')?'#c53030':'#065f46';
      _tb.style.color='#fff';
      _tb.textContent=msg;
      _tb.style.display='flex';
      clearTimeout(_tb._t);
      _tb._t=setTimeout(function(){_tb.style.display='none';},5000);
    }

    /* Patient guard */
    if (!pName) {
      _mcToast('No patient selected — cannot issue certificate','err');
      window._mcIssuing = false; return;
    }

    /* Field validation with red highlights */
    var _mcMissing = []; var _mcEls = [];
    function _mcChk(id, label) {
      var el = document.getElementById(id);
      var val = el ? (el.value||'').trim() : '';
      if (!val) {
        _mcMissing.push(label);
        if (el) {
          el.style.border = '2px solid #e53e3e';
          el.style.background = '#fff5f5';
          function _clr(ev){ ev.target.style.border=''; ev.target.style.background=''; ev.target.removeEventListener('input',_clr); ev.target.removeEventListener('change',_clr); }
          el.addEventListener('input', _clr);
          el.addEventListener('change', _clr);
          _mcEls.push(el);
        }
      }
      return !!val;
    }

    _mcChk('mc-diagnosis',  'Diagnosis');
    _mcChk('mc-exam-date',   'Date Examined');
    _mcChk('mc-leave-from',  'Absence From');
    _mcChk('mc-leave-to',    'Absence To');
    _mcChk('mc-auth-date',   'Date Issued');

    /* Date logic: Absence To must not precede Absence From */
    var fromVal = gv('mc-leave-from');
    var toVal   = gv('mc-leave-to');
    if (fromVal && toVal && toVal < fromVal) {
      _mcMissing.push('Absence To cannot be before Absence From');
      var toEl2 = document.getElementById('mc-leave-to');
      if (toEl2) { toEl2.style.border='2px solid #e53e3e'; toEl2.style.background='#fff5f5'; if(_mcEls.indexOf(toEl2)===-1) _mcEls.push(toEl2); }
    }

    if (_mcMissing.length) {
      if (_mcEls.length) _mcEls[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      _mcToast('Please complete: '+_mcMissing.join(' | '),'err');
      window._mcIssuing = false; return;
    }

    /* Build certificate object */
    var nowIso = new Date().toISOString();
    var cert = {
      certNo:        certNo,
      issued:        nowIso,
      patient:       { name:pName, id:pId, dob:pDob, address:pAddr, phone:pPhone },
      assessment:    { examDate:gv('mc-exam-date'), onsetDate:gv('mc-illness-date'), practitioner:docName, facility:docFacility, diagnosis:gv('mc-diagnosis') },
      certification: { from:fromVal, to:toVal, fitReturn:gv('mc-fit-return')},
      authorisation: { name:docName, hpcsa:docHpcsa, dateIssued:gv('mc-auth-date'), phone:docPhone },
    };

    /* Persist to API (linked to patient medical records) */
    var u8 = _dGetUser();
    var apiPayload = {
      certNo:              cert.certNo,
      patient:             p._id||p.id||'',
      patientName:         pName,
      patientIdNumber:     pId,
      dateExamined:        cert.assessment.examDate,
      dateOfOnset:         cert.assessment.onsetDate,
      diagnosis:           cert.assessment.diagnosis,
      absenceFrom:         cert.certification.from,
      absenceTo:           cert.certification.to,
      dateFitToReturn:     cert.certification.fitReturn,
      additionalRemarks:   cert.certification.note,
      dateIssued:          cert.authorisation.dateIssued,
      issuedBy:            u8._id||u8.id||'',
      issuedByName:        docName,
      issuedByHpcsa:       docHpcsa,
      facility:            docFacility,
      consultationId:      (_D.workflow&&_D.workflow.consultationId)||'',
      status:              'Issued',
    };
    /* Lock the Issue Certificate button while saving */
    var _issueBtn = document.querySelector('button[onclick="_dIssueMedCert()"]');
    if (_issueBtn) { _issueBtn.disabled = true; _issueBtn.textContent = 'Saving...'; }
    function _resetIssueBtn(){ if(_issueBtn){ _issueBtn.disabled=false; _issueBtn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Issue Certificate'; } }
    /* Try to persist to backend — non-blocking: certificate is issued regardless */
    if (window.API && typeof window.API._fetchDirect === 'function') {
      try {
        var _certRes = await API._fetchDirect('/medical-certificates',{method:'POST',body:JSON.stringify(apiPayload)});
        if (_certRes && (_certRes.error || (_certRes.status && _certRes.status >= 400))) {
          console.warn('[MedCert] Backend save returned error:', _certRes.message || _certRes.error);
        }
      } catch(err) {
        console.warn('[MedCert] Backend save failed (non-blocking):', err && err.message);
      }
    }
    /* Restore button to issued state */
    if (_issueBtn) { _issueBtn.disabled = false; _issueBtn.textContent = '✓ Issued'; _issueBtn.style.background = '#065f46'; }

    /* Persist to localStorage for patient portal */
    var patStorageKey = 'nihms_med_certs_'+(p._id||p.id||pId||'unknown');
    try {
      var _existing = JSON.parse(localStorage.getItem(patStorageKey)||'[]');
      _existing.unshift(cert);
      localStorage.setItem(patStorageKey,JSON.stringify(_existing));
    } catch(_e) {}

    window._lastMedCert = cert;

    /* Remove any stale banner, show fresh one */
    var old = document.getElementById('mc-issue-banner');
    if (old) old.remove();
    var b = document.createElement('div');
    b.id = 'mc-issue-banner';
    b.style.cssText = 'position:fixed;bottom:16px;right:20px;background:#065f46;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;display:flex;align-items:center;gap:10px;box-shadow:0 4px 14px rgba(0,0,0,.25)';
    b.innerHTML = '✓ Certificate '+certNo+' issued &nbsp;<button onclick="this.parentElement.remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:12px">×</button>';
    document.body.appendChild(b);

    window._mcIssuing = false;
  }
  window._dPrintMedCert = function(){
    /* Read live form values */
    function fv(id){ var e=document.getElementById(id); return e?(e.value||'').trim():''; }
    function fd(id){ /* format date */
      var v=fv(id); if(!v) return '';
      var d=new Date(v+'T00:00:00');
      return isNaN(d)?v:d.toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});
    }
    var examDate = fd('mc-exam-date');
    var onset    = fd('mc-illness-date');
    var diag     = fv('mc-diagnosis');
    var fromDate = fd('mc-leave-from');
    var toDate   = fd('mc-leave-to');
    var fitRet   = fd('mc-fit-return');
    var authDate = fd('mc-auth-date');
    /* Read practitioner info from DOM or closure */
    var _pEl = document.getElementById('mc-print-docname') || document.getElementById('mc-print-docname2');
    var _fEl = document.getElementById('mc-print-facility');
    var printDocName = (_pEl && _pEl.textContent.trim()) || (typeof docName!=='undefined'?docName:'');
    var printFacility = (_fEl && _fEl.textContent.trim()) || (typeof docFacility!=='undefined'?docFacility:'Johannesburg CHC');

    if (!diag) {
      alert('Please complete the Diagnosis field before printing.');
      return;
    }

    /* Capture signature if drawn */
    var sigDataUrl = '';
    var sigCanvas = document.getElementById('mc-sig-canvas');
    if (sigCanvas) { try { sigDataUrl = sigCanvas.toDataURL('image/png'); } catch(_){} }

    var html='<!DOCTYPE html><html><head><meta charset="utf-8">'+
      '<title>Medical Certificate — '+certNo+'<\/title>'+
      '<style>'+
        'body{margin:30px;font-family:Georgia,serif;font-size:12.5px;color:#1e293b;line-height:1.6}'+
        'h1{font-size:20px;text-align:center;margin:0 0 4px;letter-spacing:.01em}'+
        '.sub{text-align:center;color:#64748b;font-size:11px;margin-bottom:4px}'+
        '.cert-no{text-align:center;font-size:11px;color:#64748b;margin-bottom:28px;font-family:monospace}'+
        'table{width:100%;border-collapse:collapse;margin-bottom:18px}'+
        'td{padding:7px 10px;border:1px solid #cbd5e1;vertical-align:top}'+
        'td:first-child{font-weight:600;width:38%;background:#f8fafc;color:#374151}'+
        'h3{font-size:12.5px;font-weight:700;border-bottom:2px solid #1e293b;padding-bottom:4px;margin:22px 0 8px;text-transform:uppercase;letter-spacing:.05em}'+
        '.sig-line{border-top:1px solid #333;width:240px;margin:44px 0 4px}'+
        '.no-print{margin-top:24px;text-align:center}'+
        '@media print{.no-print{display:none}body{margin:15mm}}'+
      '<\/style><\/head><body>'+
      '<h1>NIHMS Medical Certificate<\/h1>'+
      '<div class="sub">National Integrated Healthcare Management System<\/div>'+
      '<div class="sub">Medical Certificate for Absence from Work<\/div>'+
      '<div class="cert-no">Certificate No: '+certNo+' &nbsp;|&nbsp; Issued: '+authDate+'<\/div>'+
      '<h3>Section 1 — Patient Information<\/h3>'+
      '<table>'+
        '<tr><td>Full Name<\/td><td>'+pName+'<\/td><\/tr>'+
        '<tr><td>ID \/ Passport<\/td><td>'+pId+'<\/td><\/tr>'+
        '<tr><td>Date of Birth<\/td><td>'+(pDob?new Date(pDob+'T00:00:00').toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}):'—')+'<\/td><\/tr>'+
        '<tr><td>Residential Address<\/td><td>'+(pAddr||'—')+'<\/td><\/tr>'+
        '<tr><td>Contact Number<\/td><td>'+(pPhone||'—')+'<\/td><\/tr>'+
      '<\/table>'+
      '<h3>Section 2 — Clinical Assessment<\/h3>'+
      '<table>'+
        '<tr><td>Date Examined<\/td><td>'+examDate+'<\/td><\/tr>'+
        '<tr><td>Date of Onset<\/td><td>'+(onset||'—')+'<\/td><\/tr>'+
        '<tr><td>Attending Practitioner<\/td><td>'+(printDocName||'—')+'<\/td><\/tr>'+
        '<tr><td>Health Facility<\/td><td>'+(printFacility||'Johannesburg CHC')+'<\/td><\/tr>'+
        '<tr><td>Diagnosis \/ Condition<\/td><td>'+diag+'<\/td><\/tr>'+
      '<\/table>'+
      '<h3>Section 3 — Certification of Absence<\/h3>'+
      '<table>'+
        '<tr><td>Absent From<\/td><td>'+fromDate+'<\/td><\/tr>'+
        '<tr><td>Absent To (inclusive)<\/td><td>'+toDate+'<\/td><\/tr>'+
        '<tr><td>Fit to Return<\/td><td>'+(fitRet||'—')+'<\/td><\/tr>'+
      '<\/table>'+
      '<h3>Section 4 — Authorisation<\/h3>'+
      '<table>'+
        '<tr><td>Practitioner Name<\/td><td>'+(printDocName||'—')+'<\/td><\/tr>'+
        '<tr><td>Doctor Name<\/td><td>'+(printDocName||'—')+'<\/td><\/tr>'+
        '<tr><td>Date Issued<\/td><td>'+authDate+'<\/td><\/tr>'+
      '<\/table>'+
      '<div style="margin-top:36px">'+
        (sigDataUrl ? '<img src="'+sigDataUrl+'" style="height:64px;display:block;margin-bottom:4px" alt="Signature"\/>' : '<div class="sig-line"><\/div>')+
        '<div style="font-size:11px;color:#64748b">'+(printDocName||'')+(printDocName?' — ':'')+' Authorised Signature<\/div>'+
      '<\/div>'+
      '<div class="no-print">'+
        '<button onclick="window.print()" style="padding:10px 28px;background:#065f46;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;margin-right:12px">🖨️ Print Certificate<\/button>'+
        '<a id="mc-dl-link" download="Medical-Certificate-'+certNo+'.html" style="padding:10px 28px;background:#1e40af;color:#fff;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block">⬇️ Download<\/a>'+
      '<\/div>'+
      '<script>window.onload=function(){'+
        'var dl=document.getElementById(\"mc-dl-link\");'+
        'if(dl){var blob=new Blob([document.documentElement.outerHTML],{type:\"text\/html\"});dl.href=URL.createObjectURL(blob);}'+
      '};<\/script>'+
    '<\/body><\/html>';

    var w = window.open('','_blank','width=760,height=980');
    if (!w) { alert('Popup blocked — please allow popups for this site to print \/ download certificates.'); return; }
    w.document.write(html);
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
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">'+
            '<div>'+_mcLabel('Attending Practitioner',false)+'<div id="mc-print-docname" style="font-size:14px;font-weight:700;color:'+C.text+'">'+docName+'</div></div>'+
            '<div>'+_mcLabel('Health Facility',false)+'<div id="mc-print-facility" style="font-size:14px;font-weight:700;color:'+C.text+'">'+docFacility+'</div></div>'+
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
          '</div>'
        )+

        /* Practitioner Authorisation */
        _mcCard(
          _mcTitle('Practitioner Authorisation')+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">'+
            _mcDateFld('mc-auth-date','Date Issued',today,true,true)+
            '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:'+C.muted+';margin-bottom:6px">Doctor Name</div>'+
              '<div id="mc-print-docname2" style="font-size:14px;font-weight:700;color:'+C.text+'">'+ docName+'</div></div>'+
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
          '<button onclick="_D.view=\'medical_notes\';_dRender()" style="flex:1;padding:12px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">'+
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>'+
            'Back to Diagnosis &amp; Clinical Assessment'+
          '</button>'+
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
    'All medical certificates issued by '+(function(){var u=_dGetUser();return u.firstName||u.lastName?'Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim():'this practice';})())+
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
    '</table>'+
    '<h3>Section 4 — Authorisation</h3>'+
    '<table><tr><td>Practitioner Name</td><td>'+docName+'</td></tr>'+
    '<tr><td>Practice Contact No.</td><td>'+docPhone+'</td></tr>'+
    '<tr><td>Date Issued</td><td>'+issued+'</td></tr></table>'+
    '<div style="margin-top:32px"><div class="sig-line"></div><div style="font-size:11px;color:#64748b">Authorised Signature</div></div>'+
    '<script>window.onload=function(){window.print();}<\/script>'+
  '</body></html>';

  var w=window.open('','_blank','width=720,height=960');
  w.document.write(html);
  w.document.close();
};

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
  /* ── Duplicate-click guard ── */
  var btn = document.getElementById('btn-save-consult');
  if (btn && btn.getAttribute('data-submitted')) return;
  if (btn) { btn.setAttribute('data-submitted','1'); btn.disabled = true; btn.textContent = 'Saving…'; }

  function _btnReset() {
    var b = document.getElementById('btn-save-consult') || btn;
    if (!b) return;
    b.removeAttribute('data-submitted'); b.disabled = false;
    b.innerHTML = '✓ Save Consultation &amp; Continue to Diagnosis';
  }
  function _toast(msg, type) {
    try { if(window.UI&&UI.showToast){ UI.showToast(msg, type||'info'); return; } } catch(_) {}
    try {
      var old = document.getElementById('_d-toast-banner'); if(old) old.remove();
      var bg = type==='ok'?'#0F6E56':type==='err'?'#c0392b':'#1A4A9B';
      var t = document.createElement('div'); t.id='_d-toast-banner';
      t.setAttribute('style','position:fixed;top:24px;right:24px;z-index:99999;background:'+bg+';color:#fff;padding:14px 22px;border-radius:10px;font-size:14px;font-weight:600;font-family:inherit;max-width:360px;box-shadow:0 4px 20px rgba(0,0,0,0.25);display:flex;align-items:center;gap:10px;');
      t.innerHTML = (type==='ok'?'<span style="font-size:18px">✓</span> ':'<span style="font-size:18px">ℹ</span> ')+msg;
      document.body.appendChild(t); setTimeout(function(){ if(t.parentNode)t.remove(); }, 4000);
    } catch(_) { console.info('[consult]', msg); }
  }

  /* ── Patient guard ── */
  var _cPat   = _D.consultPat || _D.selectedPat || null;
  var _cPatId = _D.consultPatId || (_cPat && (_cPat._id || _cPat.id)) || '';
  if (!_cPatId) {
    _toast('No patient selected — cannot save consultation', 'err');
    _btnReset(); return;
  }

  /* ── Field-level validation with red highlights ── */
  var _csMissing = []; var _csEls = [];
  function _csChk(id, label) {
    var el = document.getElementById(id);
    var val = el ? (el.value||'').trim() : '';
    if (!val) {
      _csMissing.push(label);
      if (el) {
        el.style.border = '2px solid #e53e3e'; el.style.background = '#fff5f5';
        function _clr(ev){ ev.target.style.border=''; ev.target.style.background=''; ev.target.removeEventListener('input',_clr); ev.target.removeEventListener('change',_clr); }
        el.addEventListener('input', _clr); el.addEventListener('change', _clr);
        _csEls.push(el);
      }
    }
    return !!val;
  }
  _csChk('cs-date',      'Consultation Date');
  _csChk('cs-type',      'Consultation Type');
  _csChk('cs-clinician', 'Clinician');
  _csChk('cs-complaint', 'Chief Complaint');

  if (_csMissing.length) {
    if (_csEls.length) _csEls[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    _toast('Please complete: ' + _csMissing.join(' | '), 'err');
    _btnReset(); return;
  }

  /* ── Collect form values ── */
  var g = function(id){ return (document.getElementById(id)||{value:''}).value; };
  var outcomes = [];
  document.querySelectorAll('.cs-outcome:checked').forEach(function(cb){ outcomes.push(cb.value); });

  var _su = {}; try { _su = _dGetUser(); } catch(_) {}
  var _suName = _su.firstName ? ('Dr '+((_su.firstName||'')+' '+(_su.lastName||'')).trim()) : (_su.name||_su.fullName||'');
  var _suReg  = _su.hpcsaNumber||_su.hpcsa||_su.registrationNumber||_su.regNo||'';
  var _suFac  = (typeof _su.facility==='string'?_su.facility:'')||(_su.facility&&_su.facility.name)||_su.facilityName||'';

  var _inj = function(id, val){ if(!val) return; var el=document.getElementById(id); if(el&&!el.value) el.value=val; };
  _inj('cs-clinician', _suName); _inj('cs-reg', _suReg); _inj('cs-facility', _suFac);

  var clinician = g('cs-clinician') || _suName || 'Doctor';
  var regNo     = (g('cs-reg') || _suReg || '').trim();
  var _facRaw   = g('cs-facility') || _suFac || '';
  var _isObjId  = /^[a-f\d]{24}$/i.test(_facRaw.trim());

  if (!_D.workflow) _D.workflow = { consultationId: null, diagnosisId: null };

  /* ── Idempotency key: same patient + date + clinician = same submission ── */
  var _idem = 'consult-' + _cPatId + '-' + g('cs-date') + '-' + clinician.replace(/\s+/g,'');

  var payload = {
    patient:          _cPatId,
    consultationDate: g('cs-date'),
    consultationTime: g('cs-time'),
    visitType:        g('cs-type') || 'outpatient',
    clinician:        clinician,
    registrationNo:   regNo,
    facility:         _isObjId ? _facRaw.trim() : undefined,
    facilityName:     _isObjId ? undefined : (_facRaw || undefined),
    chiefComplaint:   g('cs-complaint'),
    onset:            g('cs-onset'),
    duration:         g('cs-duration'),
    severity:         g('cs-severity'),
    symptoms:         g('cs-symptoms'),
    relevantHistory:  g('cs-medhistory'),
    currentMeds:      g('cs-currentmeds'),
    allergies:        (function(){ var r=document.querySelector('input[name="cs-allergy-opt"]:checked'); return r?r.value:'none'; })(),
    allergyDetails:   g('cs-allergies'),
    vitals: {
      bloodPressure:   g('cs-v-bp'),
      pulse:           g('cs-v-hr'),
      temperature:     g('cs-v-temp'),
      spo2:            g('cs-v-spo2'),
      respiratoryRate: g('cs-v-rr'),
      weight:          g('cs-v-wt'),
    },
    generalExamination: g('cs-general'),
    systemExamination:  g('cs-systems'),
    clinicianNotes:     g('cs-notes'),
    outcomes:           outcomes,
    idempotencyKey:     _idem,
  };

  /* ── POST to backend — do NOT fall back silently ── */
  var savedId = null;
  try {
    var res = await API._fetchDirect('/consultation-notes', {
      method: 'POST', body: JSON.stringify(payload),
    });
    var saved = (res && res.data) ? res.data : res;
    if (saved && (saved._id || saved.id)) {
      savedId = saved._id || saved.id;
    } else if (res && res.success === false) {
      throw new Error(res.message || 'Server rejected the consultation record');
    }
  } catch (apiErr) {
    var errMsg = (apiErr && apiErr.message) || 'Could not save consultation — please check your connection and try again.';
    console.error('[_dSaveConsult] API error:', errMsg, apiErr);
    _toast(errMsg, 'err');
    _btnReset(); return;          /* STOP — do not navigate away on failure */
  }

  /* ── Store consultation ID and clinician name in workflow ── */
  if (savedId && _D.workflow) _D.workflow.consultationId = savedId;
  if (_D.workflow) _D.workflow.consultation.clinician = clinician;
  /* Store appointment ID so _dEndConsult can PATCH it to completed */
  if (_D.workflow && !_D.workflow.appointmentId) {
    var _cApptId =
      (_cPat && (_cPat.appointmentId || _cPat.apptId || _cPat._apptId)) ||
      window._dActiveTeleApptId || null;
    if (_cApptId) _D.workflow.appointmentId = _cApptId;
  }
  /* Persist clinician name so pharmacy.js can resolve it cross-tab */
  try { if(clinician) localStorage.setItem('NIHMS_PRESCRIBING_DOCTOR', clinician); } catch(_){}

  /* ── Update Patient 360 in-memory cache ── */
  var _consultSummary = {
    _id: savedId, visitType: payload.visitType,
    chiefComplaint: payload.chiefComplaint, clinician: payload.clinician,
    consultedAt: new Date().toISOString(), outcomes: payload.outcomes,
  };
  if (_cPat) {
    [_cPat, _D.pat360Data].forEach(function(obj){
      if (!obj) return;
      if (!Array.isArray(obj.consultations)) obj.consultations = [];
      /* Only add if not already present (idempotency) */
      if (!obj.consultations.some(function(c){ return c._id === savedId; })) {
        obj.consultations.unshift(_consultSummary);
      }
    });
  }

  if (!_D.selectedPat && _cPat) _D.selectedPat = _cPat;
  if (!_D.consultPat  && _cPat) _D.consultPat  = _cPat;
  try { _dTaskDone('T4'); } catch(_) {}

  /* ── Success overlay then navigate ── */
  try {
    var _overlay = document.createElement('div');
    _overlay.id = '_consult-success-overlay';
    _overlay.setAttribute('style','position:fixed;inset:0;z-index:99998;background:linear-gradient(135deg,#0a5c47 0%,#0F6E56 60%,#1A4A9B 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;animation:_dSlideIn .3s ease;');
    _overlay.innerHTML =
      '<div style="width:90px;height:90px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:44px;box-shadow:0 4px 24px rgba(0,0,0,0.2);">✓</div>'+
      '<div style="color:#fff;font-size:26px;font-weight:800;font-family:inherit;">✔ Consultation Saved!</div>'+
      '<div style="color:rgba(255,255,255,0.9);font-size:15px;font-family:inherit;">Redirecting to Diagnosis in 3 seconds…</div>'+
      '<button onclick="window._doConsultNav&&window._doConsultNav()" style="margin-top:8px;padding:12px 32px;border-radius:8px;border:2px solid #fff;background:transparent;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">Continue Now →</button>';
    if (!document.getElementById('_d-toast-anim')) {
      var _s=document.createElement('style'); _s.id='_d-toast-anim';
      _s.textContent='@keyframes _dSlideIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:none}}';
      document.head.appendChild(_s);
    }
    document.body.appendChild(_overlay);
  } catch(_) {}

  window._doConsultNav = function() {
    if (window._doConsultNav._fired) return;
    window._doConsultNav._fired = true;
    try { var ov=document.getElementById('_consult-success-overlay'); if(ov&&ov.parentNode)ov.parentNode.removeChild(ov); } catch(_) {}
    try { _dRenderBust('consult'); }       catch(_) {}
    try { _dRenderBust('medical_notes'); } catch(_) {}
    try { _D.view='medical_notes'; _dRender(); } catch(e) {
      try { _setView('medical_notes'); } catch(_) {}
    }
  };
  setTimeout(window._doConsultNav, 3000);
};

/* ── Duplicate-submit guard ── */
var _rxSubmitting = false;

window._dSaveRx = async function() {
  /* Safe toast wrapper — UI may not be loaded yet */
  function _toast(msg,type){try{if(window.UI&&window.UI.showToast)window.UI.showToast(msg,type);else console.warn('[Rx toast]',msg);}catch(_){}}

  /* ── Prevent duplicate submissions ── */
  if (_rxSubmitting) { _toast('Prescription is already being submitted — please wait','warn'); return; }

  /* ── Collect all medication blocks ── */
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

  /* ── Collect repeat fields ── */
  var repeatEl   = document.querySelector('input[name="rx-repeat"]:checked');
  var isRepeat   = repeatEl ? repeatEl.value==='yes' : false;
  var repAllowed = isRepeat ? (parseInt((document.getElementById('rx-rep-allowed')||{value:'0'}).value,10)||0) : 0;
  var repUsed    = isRepeat ? (parseInt((document.getElementById('rx-rep-used')||{value:'0'}).value,10)||0)    : 0;
  var repRem     = isRepeat ? Math.max(0, repAllowed - repUsed) : 0;
  var reviewDate = isRepeat ? ((document.getElementById('rx-review-date')||{value:''}).value||undefined)       : undefined;
  var expiryDate = isRepeat ? ((document.getElementById('rx-expiry-date')||{value:''}).value||undefined)       : undefined;

  /* ── Validate ALL required fields — highlight missing ones in red ── */
  var missing = [];
  var missingEls = [];
  function _rxChkField(id, label) {
    var el = document.getElementById(id);
    var val = el ? (el.value || '').trim() : '';
    if (!val) {
      missing.push(label);
      if (el) {
        el.style.border = '2px solid #e53e3e';
        el.style.background = '#fff5f5';
        el.style.outline = 'none';
        missingEls.push(el);
        function _rxClearErr(e){ e.target.style.border=''; e.target.style.background=''; e.target.removeEventListener('input',_rxClearErr); e.target.removeEventListener('change',_rxClearErr); }
        el.addEventListener('input', _rxClearErr);
        el.addEventListener('change', _rxClearErr);
      }
    }
    return !!val;
  }
  /* Check each medication block */
  var _mCount = window._rxMedCount || 1;
  for (var _mi = 1; _mi <= _mCount; _mi++) {
    var _ms = _mCount > 1 ? ' (Med '+_mi+')' : '';
    _rxChkField('rx-med-name-'+_mi, 'Medicine Name'+_ms);
    _rxChkField('rx-med-str-'+_mi,  'Strength'+_ms);
    _rxChkField('rx-med-dose-'+_mi, 'Dose'+_ms);
    _rxChkField('rx-med-route-'+_mi,'Route of Administration'+_ms);
    _rxChkField('rx-med-freq-'+_mi, 'Frequency'+_ms);
    _rxChkField('rx-med-dur-'+_mi,  'Duration'+_ms);
    _rxChkField('rx-med-qty-'+_mi,  'Quantity'+_ms);
  }
  if (isRepeat && repAllowed < 1) { missing.push('Repeats Allowed (≥ 1)'); var _raEl=document.getElementById('rx-rep-allowed'); if(_raEl){_raEl.style.border='2px solid #e53e3e';_raEl.style.background='#fff5f5';missingEls.push(_raEl);} }
  if (isRepeat && !reviewDate)    { missing.push('Next Review Date'); var _rdEl=document.getElementById('rx-review-date'); if(_rdEl){_rdEl.style.border='2px solid #e53e3e';_rdEl.style.background='#fff5f5';missingEls.push(_rdEl);} }

  if (missing.length) {
    if (missingEls.length) missingEls[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    _toast('Please complete: ' + missing.join(' | '), 'err');
    return;
  }

  /* ── Lock against duplicate submissions ── */
  _rxSubmitting = true;
  var submitBtn = document.getElementById('rx-submit-btn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.6'; }

  try {
    var u        = _dGetUser();
    var pat      = _D.consultPat || _D.selectedPat || {};
    var patName  = ((pat.firstName||pat.name||'')+' '+(pat.lastName||'')).trim() || 'Unknown patient';
    /* Prefer clinician name saved from consultation form, then logged-in user */
    var docName  = (_D.workflow && _D.workflow.consultation && _D.workflow.consultation.clinician) ||
      (u.firstName
        ? ('Dr '+((u.firstName||'')+' '+(u.lastName||'')).trim())
        : (u.name||u.displayName||u.fullName||u.username||''));
    var docHpcsa = u.hpcsaNumber||u.hpcsa||u.registrationNumber||u.regNo||u.licenseNumber||'';
    /* Write resolved clinician name to localStorage so pharmacy.js can always find it */
    try { if(docName) localStorage.setItem('NIHMS_PRESCRIBING_DOCTOR', docName); } catch(_){}
    var rxRef    = 'RX-'+(Date.now()%900000+100000)+'-ZA';
    var nowIso   = new Date().toISOString();
    var patMongoId = pat._id||pat.id||'';
    if (!patMongoId) {
      _toast('No patient selected. Please open a patient consult before prescribing.','err');
      return;
    }

    /* ── lines array: shape expected by patient.js _mrLoadRx() ── */
    var lines = medications.map(function(m){
      return {
        medicationName: m.name+(m.strength?' '+m.strength:''),
        dosage:         m.dose||'',
        durationDays:   parseInt(m.duration,10)||1,
        frequency:      m.frequency||'',
        quantity:       parseInt(m.quantity,10)||1,
        unit:           m.unit||'',
        route:          m.route||'',
        instructions:   m.specialInstructions||'',
      };
    });

    var rxData = {
      prescriptionRef:     rxRef,
      /* MongoDB patient link — used by patient.js API.prescriptions.list({patient:p._id}) */
      patient:             patMongoId,
      patientName:         patName,
      patientId:           pat.nationalId||pat.idNumber||pat.mrn||patMongoId||'',
      patientDob:          pat.dateOfBirth||pat.dob||'',
      /* medications: doctor.js internal format */
      medications:         medications,
      /* lines: patient.js display format (medicationName, dosage, durationDays, instructions) */
      lines:               lines,
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
      /* prescribedBy: patient.js renders r.prescribedBy.firstName / .lastName */
      prescribedBy:        u._id||u.id||'',
      prescribedByObj:     { _id: u._id||u.id||'', firstName: u.firstName||'', lastName: u.lastName||'' },
      prescribedByName:    docName,
      prescribedByReg:     docHpcsa,
      facility:            (typeof u.facility==='string'?u.facility:'')
                            ||(u.facility&&u.facility.name)||u.facilityName||u.primaryFacility||'',
      issued:              nowIso.slice(0,10),
      doctor:              docName,
      prescribedAt:        nowIso,
      submittedAt:         nowIso,
      createdAt:           nowIso,
      status:              'pending',
      consultationId:      _D.workflow&&_D.workflow.consultationId||'',
    };

    /* ── Save to database (throw on failure — no false success) ── */
    var rxId = null;
    try {
      var rxRes = await API._fetchDirect('/prescriptions',{method:'POST',body:JSON.stringify(rxData)});

      /* Detect API-level errors — covers 422/400/500 response shapes */
      var rxFailed = !rxRes
        || rxRes.success === false
        || rxRes.status  === false
        || rxRes.error
        || (rxRes.statusCode && rxRes.statusCode >= 400)
        || (rxRes.status   && typeof rxRes.status === 'number' && rxRes.status >= 400);

      if (rxFailed) {
        /* Build the most informative error message possible */
        var errMsg;
        /* 422 Validation errors — backend often returns {errors:[{field,message}]} or {errors:{field:msg}} */
        if (rxRes && rxRes.errors) {
          var errParts = [];
          if (Array.isArray(rxRes.errors)) {
            rxRes.errors.forEach(function(e){
              if (e && e.message) errParts.push((e.field ? e.field+': ' : '') + e.message);
              else if (typeof e === 'string') errParts.push(e);
            });
          } else if (typeof rxRes.errors === 'object') {
            Object.keys(rxRes.errors).forEach(function(k){
              errParts.push(k+': '+(rxRes.errors[k]||'invalid'));
            });
          }
          errMsg = errParts.length ? errParts.join(' | ') : (rxRes.message||'Prescription rejected by server.');
        } else {
          errMsg = rxRes && (rxRes.message || rxRes.error || rxRes.msg)
            ? String(rxRes.message || rxRes.error || rxRes.msg)
            : 'Prescription was not submitted — the server returned an error. Check all fields and try again.';
        }
        console.error('[_dSaveRx] Server rejected:', rxRes);
        _toast(errMsg, 'err');
        return;
      }

      rxId = (rxRes && rxRes.data && (rxRes.data._id||rxRes.data.id)) || (rxRes && rxRes._id) || null;
    } catch(apiErr){
      /* Network / JSON parse error */
      var apiErrMsg;
      if (apiErr && apiErr.message && apiErr.message.toLowerCase().includes('network')) {
        apiErrMsg = 'Prescription not submitted — no connection to the server. Check your network and try again.';
      } else if (apiErr && apiErr.message && apiErr.message.includes('422')) {
        apiErrMsg = 'Prescription rejected (422) — required fields are missing or invalid. Check medicine name, dose, route and quantity.';
      } else {
        apiErrMsg = (apiErr && apiErr.message) || 'Could not save prescription — check your connection and try again.';
      }
      console.error('[_dSaveRx] API save failed:', apiErr);
      _toast(apiErrMsg, 'err');
      return;
    }

    /* ── Push to pharmacy queue (cross-tab bridge) ── */
    var queueEntry = {
      id:               'ph-q-'+Date.now(),
      ticket:           'P-'+String(Math.floor(Math.random()*900)+100),
      patient:          patName,
      patientName:      patName,
      patientId:        pat.nationalId||pat.idNumber||pat.id_number||pat.mrn||patMongoId||'',
      idNumber:         pat.nationalId||pat.idNumber||pat.id_number||'',
      passportNumber:   pat.passport||pat.passportNumber||'',
      mrn:              pat.mrn||'',
      items:            medications.length,
      waitedMin:        0,
      state:            'new-request',
      prescriptionRef:  rxRef,
      prescriptionId:   rxId||rxRef,
      medications:      medications,
      lines:            lines,
      repeat:           rxData.repeat,
      repeatPrescription: isRepeat,
      prescribedByObj:  { _id: u._id||u.id||'', firstName: u.firstName||'', lastName: u.lastName||'' },
      prescribedByName: docName,
      prescribedByReg:  docHpcsa,
      doctor:           docName,
      issued:           nowIso.slice(0,10),
      prescribedAt:     nowIso,
      status:           'Submitted',
    };

    /* In-memory queue (same-session pharmacy tab) */
    if (!window._PHARMACY_QUEUE) window._PHARMACY_QUEUE = [];
    var dupQ = window._PHARMACY_QUEUE.find(function(x){return x.prescriptionRef===rxRef;});
    if (!dupQ) window._PHARMACY_QUEUE.push(queueEntry);

    /* Cross-tab: BroadcastChannel */
    try {
      var _phBC = new BroadcastChannel('nihms_pharmacy_queue');
      _phBC.postMessage({type:'new_prescription', entry: queueEntry});
      setTimeout(function(){ _phBC.close(); }, 200);
    } catch(_){}

    /* Cross-tab: localStorage pharmacy queue */
    try {
      var lsKey = 'NIHMS_PHARMACY_PRESCRIPTIONS';
      var existing = JSON.parse(localStorage.getItem(lsKey)||'[]');
      var dupLs = existing.find(function(x){return x.prescriptionRef===rxRef;});
      if (!dupLs) { existing.push(queueEntry); localStorage.setItem(lsKey, JSON.stringify(existing)); }
    } catch(_){}

    /* ── Bridge to patient.js Medical Records (localStorage cache) ──
       patient.js _mrLoadRx() calls API.prescriptions.list({patient:p._id}).
       We also cache the record locally so it appears immediately even
       before the server-side index refreshes.                            */
    try {
      var ptRxKey = 'NIHMS_PATIENT_PRESCRIPTIONS_'+patMongoId;
      var ptRxCached = JSON.parse(localStorage.getItem(ptRxKey)||'[]');
      var ptDup = ptRxCached.find(function(x){return x.prescriptionRef===rxRef||x._id===rxId;});
      if (!ptDup) {
        /* Shape matches what patient.js renders: lines, prescribedBy object, status, createdAt */
        var ptRxEntry = {
          _id:            rxId||rxRef,
          prescriptionRef: rxRef,
          patient:        patMongoId,
          patientName:    patName,
          lines:          lines,
          prescribedBy:   { _id: u._id||u.id||'', firstName: u.firstName||'', lastName: u.lastName||'' },
          prescribedByName: docName,
          status:         'pending',
          createdAt:      nowIso,
          repeatPrescription: isRepeat,
          repeat:         rxData.repeat,
          facility:       rxData.facility,
        };
        ptRxCached.unshift(ptRxEntry);
        /* Keep at most 100 records in local cache */
        if (ptRxCached.length > 100) ptRxCached = ptRxCached.slice(0, 100);
        localStorage.setItem(ptRxKey, JSON.stringify(ptRxCached));
      }
    } catch(_){}

    /* ── Also push to _PH in-memory prescriptions if pharmacy module loaded ── */
    try {
      if (window._PH && window._PH.prescriptions) {
        var dupPh = window._PH.prescriptions.find(function(x){return x.code===rxRef;});
        if (!dupPh) {
          window._PH.prescriptions.unshift({
            code:        rxRef,
            patientId:   pat.nationalId||pat.mrn||patMongoId||'',
            patientName: patName,
            doctor:      docName,
            doctorReg:   docHpcsa,
            facility:    rxData.facility,
            issued:      nowIso.slice(0,10),
            validUntil:  reviewDate||expiryDate||(new Date(Date.now()+30*86400000).toISOString().slice(0,10)),
            status:      'pending',
            submittedAt: nowIso,
            repeatPrescription: isRepeat,
            repeat:      rxData.repeat,
            items:       lines,
            duplicateWarning: null,
            interactions: [],
          });
        }
        if (window._PH.queue) {
          var dupPhQ = window._PH.queue.find(function(x){return x.prescriptionRef===rxRef;});
          if (!dupPhQ) window._PH.queue.push(queueEntry);
        }
      }
    } catch(_){}

    /* ── Notify pharmacy via API ── */
    var medSummary = medications.map(function(m){ return m.name+(m.strength?' '+m.strength:''); }).join(', ');
    var notifPayload = {
      targetRole:      'pharmacist',
      type:            'prescription',
      priority:        'high',
      title:           'New prescription requires dispensing',
      message:         docName+' has submitted a prescription for '+patName+'. Ref: '+rxRef+'. Medications: '+medSummary+'.',
      patient:         patMongoId,
      patientName:     patName,
      prescriptionId:  rxId||rxRef,
      prescriptionRef: rxRef,
      issuedBy:        u._id||u.id||'',
      issuedByName:    docName,
      issuedAt:        nowIso,
    };
    try {
      await API._fetchDirect('/notifications',{method:'POST',body:JSON.stringify(notifPayload)}).catch(function(){});
    } catch(_){}

    /* ── Store prescription ref on workflow ── */
    if (!_D.workflow) _D.workflow = {};
    _D.workflow.prescriptionId  = rxId||rxRef;
    _D.workflow.prescriptionRef = rxRef;

    /* ── Success — bell notification ── */
    var _successMedSummary = medications.slice(0,2).map(function(m){return m.name+(m.strength?' '+m.strength:'');}).join(', ')+(medications.length>2?' +'+( medications.length-2)+' more':'');
    try {
      if (!window._NIHMS_NOTIFICATIONS) window._NIHMS_NOTIFICATIONS = [];
      window._NIHMS_NOTIFICATIONS.unshift({
        id: 'rx-'+Date.now(), type: 'prescription',
        title: 'Prescription Submitted',
        message: 'Rx '+rxRef+' for '+patName+' sent to pharmacy for validation and dispensing.',
        time: new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}),
        read: false,
      });
    } catch(_){}

    /* ── Success confirmation box (centered) ── */
    try {
      var _rxBox = document.createElement('div');
      _rxBox.id = '_rx-success-box';
      _rxBox.setAttribute('style',
        'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;width:320px;'+
        'background:#fff;border:1.5px solid #bbf7d0;border-radius:12px;'+
        'box-shadow:0 4px 24px rgba(0,0,0,0.18);font-family:inherit;overflow:hidden;'+
        'animation:_rxSlideUp .25s ease');
      _rxBox.innerHTML =
        '<div style="background:linear-gradient(135deg,#0F6E56,#1A4A9B);padding:10px 14px;display:flex;align-items:center;gap:8px">'+
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'+
          '<span style="color:#fff;font-size:13px;font-weight:700;flex:1">Prescription Submitted</span>'+
          '<button onclick="(function(){var o=document.getElementById(\'_rx-success-box\');if(o)o.remove();})()" '+
            'style="background:transparent;border:none;color:rgba(255,255,255,0.8);font-size:16px;cursor:pointer;line-height:1;padding:0">×</button>'+
        '</div>'+
        '<div style="padding:12px 14px;font-size:12px;color:#374151;line-height:1.6">'+
          '<div style="margin-bottom:4px">Sent to pharmacy for validation and dispensing.</div>'+
          '<div><strong>Ref:</strong> '+rxRef+'</div>'+
          '<div><strong>Patient:</strong> '+patName+'</div>'+
          '<div style="color:#64748b;margin-top:2px">'+_successMedSummary+'</div>'+
        '</div>';
      if (!document.getElementById('_d-rx-box-anim')) {
        var _rxS=document.createElement('style'); _rxS.id='_d-rx-box-anim';
        _rxS.textContent='@keyframes _rxSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}';
        document.head.appendChild(_rxS);
      }
      document.body.appendChild(_rxBox);
      /* Auto-dismiss after 6 seconds */
      setTimeout(function(){ var o=document.getElementById('_rx-success-box'); if(o)o.remove(); }, 6000);
    } catch(_){}

    window._rxMedCount = 1;

  } finally {
    /* Always unlock — whether success or unexpected error */
    _rxSubmitting = false;
    if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; }
  }
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

/* _dSubmitReferral defined in _dReferrals() above */

window._dSaveGenericNote = async function() {
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

  /* Live clock — handled by _docClockTimer set in _dDashboard(); duplicate removed */

  /* Prescription submit — use event delegation so it works even after
     the form is re-rendered (e.g. after navigating away and back). */
  document.removeEventListener('click', _dRxSubmitDelegate);
  document.addEventListener('click', _dRxSubmitDelegate);
}
function _dRxSubmitDelegate(e){
  var t = e.target;
  if (!t) return;
  /* Walk up to handle clicks on child elements (icon, span) inside the button */
  while (t && t !== document.body) {
    if (t.id === 'rx-submit-btn') {
      e.preventDefault();
      if (typeof window._dSaveRx === 'function') window._dSaveRx();
      return;
    }
    t = t.parentElement;
  }
}

/* ── Backwards compat for old Pages['queue'] etc ─────────────────── */
window._docCancelAppt    = function(id){ UI.showToast('Appointment cancelled','ok'); };
window._docReschedule    = function(id){ UI.showToast('Reschedule — use Appointments tab','ok'); };
window._showDocCancel    = function(id){ window._docCancelAppt(id); };
window._showDocReschedule= function(id){ window._docReschedule(id); };

/* ── Pharmacy queue: listen for prescriptions sent by doctor (same-session cross-tab) ── */
(function(){
  try {
    var _phQueueBC = new BroadcastChannel('nihms_pharmacy_queue');
    _phQueueBC.onmessage = function(ev){
      var data = ev.data||{};
      if(data.type==='new_prescription' && data.entry){
        if(!window._PHARMACY_QUEUE) window._PHARMACY_QUEUE=[];
        var dup = window._PHARMACY_QUEUE.find(function(x){return x.prescriptionRef===data.entry.prescriptionRef;});
        if(!dup) window._PHARMACY_QUEUE.push(data.entry);
        /* Push into live _PH if pharmacy module is open */
        try {
          if(window._PH){
            if(window._PH.prescriptions){
              var dupPh2 = window._PH.prescriptions.find(function(x){return x.code===data.entry.prescriptionRef;});
              if(!dupPh2){
                var e2=data.entry;
                window._PH.prescriptions.unshift({
                  code:e2.prescriptionRef,patientId:e2.patientId,patientName:e2.patient,
                  doctor:e2.prescribedByName,doctorReg:e2.prescribedByReg,
                  issued:e2.prescribedAt?e2.prescribedAt.slice(0,10):'',
                  status:'Submitted',submittedAt:e2.prescribedAt,
                  repeatPrescription:e2.repeatPrescription,repeat:e2.repeat,
                  items:(e2.medications||[]).map(function(m){return{drug:m.name+(m.strength?' '+m.strength:''),dosage:(m.dose||'')+' '+(m.frequency||''),duration:m.duration||''};})
                });
              }
            }
            if(window._PH.queue){
              var dupQ2=window._PH.queue.find(function(x){return x.id===data.entry.id;});
              if(!dupQ2) window._PH.queue.push(data.entry);
            }
          }
        }catch(_){}
        /* Re-render pharmacy page if open */
        try{if(typeof _phRenderQueue==='function')_phRenderQueue();}catch(_){}
        try{if(typeof _phRenderValidation==='function')_phRenderValidation();}catch(_){}
        if(window.UI&&UI.showToast) UI.showToast('📋 New prescription received from doctor','ok');
      }
    };
  }catch(_){}
})();

/* ── Message bridge: receptionist can push messages directly to this portal ── */
window._doctorAddMessage = function(msg) {
  if (!_D.messages) _D.messages = [];
  /* Avoid duplicates */
  var dup = _D.messages.find(function(m){ return m.id === msg.id; });
  if (dup) return;
  _D.messages.unshift({
    id:          msg.id || msg._id || Date.now(),
    _id:         msg._id || msg.id || null,
    from:        msg.from || msg.senderName || 'Reception',
    senderName:  msg.senderName || msg.from || 'Reception',
    senderRole:  msg.senderRole || msg.fromRole || 'RECEPTIONIST',
    role:        msg.fromRole || msg.senderRole || 'Receptionist',
    subject:     msg.subject || '(No subject)',
    text:        msg.text || msg.body || '',
    body:        msg.body || msg.text || '',
    time:        msg.time || new Date().toLocaleTimeString('en-ZA', {hour:'2-digit',minute:'2-digit'}),
    sentAt:      msg.sentAt || new Date().toISOString(),
    unread:      true,
    readStatus:  'unread',
  });
  /* Re-render if portal is open */
  if (document.getElementById('doc-main')) {
    _D._msgsLoaded = false; /* force fresh render so new message appears */
    if (typeof _dRender === 'function') _dRender();
  }
  /* Toast */
  if (window.UI && window.UI.showToast) {
    UI.showToast('📩 New message from ' + (msg.from || 'Reception'), 'ok');
  }
};

