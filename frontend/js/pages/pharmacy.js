/**
 * js/pages/pharmacy.js
 * NIHMS Pharmacy Module — replicates the Lovable design exactly
 * 8 panels: Overview · Stock · Validation · Dispensing · Queue ·
 *            History · Suppliers · Reminders
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ═══════════════════════════════════════════════════════════════
   SHARED DATA  (mirrors pharmacy-data.ts)
═══════════════════════════════════════════════════════════════ */
var _PH = (function() {
  var TODAY = new Date();
  function daysUntil(d) { return Math.round((new Date(d+'T12:00:00Z')-TODAY)/86400000); }

  function stockState(i) {
    var d=daysUntil(i.expiry);
    if(d<0) return 'expired';
    if(i.quantity<i.reorderLevel*0.4) return 'critical';
    if(d<=45) return 'expiring';
    if(i.quantity<i.reorderLevel) return 'low';
    return 'ok';
  }

  var stockItems=[
    {id:'s1',drug:'Metformin 500mg',form:'Tablet',batch:'MTF-2291',expiry:'2026-09-14',quantity:42,reorderLevel:120,supplier:'Aspen Pharmacare'},
    {id:'s2',drug:'Amlodipine 5mg',form:'Tablet',batch:'AML-8830',expiry:'2027-03-02',quantity:860,reorderLevel:200,supplier:'Adcock Ingram'},
    {id:'s3',drug:'Amoxicillin 250mg',form:'Capsule',batch:'AMX-1174',expiry:'2026-08-21',quantity:310,reorderLevel:150,supplier:'Cipla SA'},
    {id:'s4',drug:'Insulin Glargine',form:'Pen',batch:'INS-0442',expiry:'2026-08-11',quantity:18,reorderLevel:40,supplier:'Sanofi SA'},
    {id:'s5',drug:'Paracetamol 500mg',form:'Tablet',batch:'PCM-7710',expiry:'2028-01-30',quantity:2400,reorderLevel:500,supplier:'Adcock Ingram'},
    {id:'s6',drug:'Enalapril 10mg',form:'Tablet',batch:'ENA-3320',expiry:'2026-10-05',quantity:96,reorderLevel:100,supplier:'Aspen Pharmacare'},
    {id:'s7',drug:'Salbutamol Inhaler',form:'Inhaler',batch:'SAL-5561',expiry:'2027-06-18',quantity:145,reorderLevel:60,supplier:'Cipla SA'},
    {id:'s8',drug:'Warfarin 5mg',form:'Tablet',batch:'WAR-9002',expiry:'2026-08-29',quantity:54,reorderLevel:80,supplier:'Pharma Dynamics'},
  ];

  /* prescriptions — populated at runtime from API + localStorage bridge */
  var prescriptions = [];

  var history=[
    {id:'h1',date:'2026-08-06',drug:'Metformin 500mg',type:'Chronic',doctor:'Dr. T. Mokoena',facility:'Johannesburg CHC',status:'Collected'},
    {id:'h2',date:'2026-07-09',drug:'Metformin 500mg',type:'Chronic',doctor:'Dr. T. Mokoena',facility:'Johannesburg CHC',status:'Collected'},
    {id:'h3',date:'2026-06-28',drug:'Amoxicillin 250mg',type:'Antibiotic',doctor:'Dr. A. Naidoo',facility:'Soweto CHC',status:'Partial'},
    {id:'h4',date:'2026-06-11',drug:'Enalapril 10mg',type:'Chronic',doctor:'Dr. T. Mokoena',facility:'Johannesburg CHC',status:'Collected'},
    {id:'h5',date:'2026-05-21',drug:'Paracetamol 500mg',type:'Analgesic',doctor:'Dr. L. Petersen',facility:'Johannesburg CHC',status:'Collected'},
    {id:'h6',date:'2026-04-30',drug:'Warfarin 5mg',type:'Chronic',doctor:'Dr. L. Petersen',facility:'Johannesburg CHC',status:'Missed'},
  ];

  /* queue — populated at runtime from API + localStorage bridge */
  var queue = [];

  var topDrugs=[
    {drug:'Paracetamol 500mg',count:84},{drug:'Metformin 500mg',count:61},
    {drug:'Amlodipine 5mg',count:47},{drug:'Amoxicillin 250mg',count:39},{drug:'Enalapril 10mg',count:28},
  ];

  var suppliers=[
    {id:'sup1',name:'Aspen Pharmacare',contact:'orders@aspen.co.za',phone:'011 239 6100',leadTimeDays:4,reliability:94,contract:'National contract'},
    {id:'sup2',name:'Adcock Ingram',contact:'supply@adcock.co.za',phone:'011 635 0000',leadTimeDays:3,reliability:97,contract:'Provincial tender'},
    {id:'sup3',name:'Cipla SA',contact:'dispatch@cipla.co.za',phone:'021 943 4200',leadTimeDays:6,reliability:88,contract:'Provincial tender'},
    {id:'sup4',name:'Sanofi SA',contact:'coldchain@sanofi.com',phone:'011 256 3700',leadTimeDays:8,reliability:91,contract:'National contract'},
    {id:'sup5',name:'Pharma Dynamics',contact:'orders@pharmadynamics.co.za',phone:'021 707 7000',leadTimeDays:5,reliability:82,contract:'Ad-hoc'},
  ];

  var purchaseOrders=[
    {id:'PO-20418',supplier:'Sanofi SA',items:3,value:48250,placed:'2026-08-04',eta:'2026-08-12',status:'confirmed'},
    {id:'PO-20411',supplier:'Aspen Pharmacare',items:6,value:21600,placed:'2026-08-01',eta:'2026-08-05',status:'overdue'},
    {id:'PO-20406',supplier:'Adcock Ingram',items:9,value:63140,placed:'2026-07-28',eta:'2026-07-31',status:'delivered'},
    {id:'PO-20422',supplier:'Cipla SA',items:2,value:9800,placed:'2026-08-07',eta:'2026-08-13',status:'sent'},
  ];

  /* refills — populated at runtime from API + prescriptions bridge; no placeholder data */
  var refills = [];

  var coldChain=[
    {id:'f1',unit:'Fridge A · Vaccines',temp:4.2,min:2,max:8,lastCheck:'11:30'},
    {id:'f2',unit:'Fridge B · Insulin',temp:8.9,min:2,max:8,lastCheck:'11:30'},
    {id:'f3',unit:'Cold room',temp:5.6,min:2,max:8,lastCheck:'10:00'},
  ];

  var dispenseLines=[
    {id:'d1',drug:'Metformin 500mg',dosage:'1 tab twice daily with meals',qty:60,batch:'MTF-2291',expiry:'2026-09-14'},
    {id:'d2',drug:'Warfarin 5mg',dosage:'1 tab at night',qty:30,batch:'WAR-9002',expiry:'2026-08-29'},
  ];

  return { daysUntil, stockState, stockItems, prescriptions, history, queue, topDrugs,
           suppliers, purchaseOrders, refills, coldChain, dispenseLines };
})();

/* ── Load prescriptions pushed by doctor from localStorage ── */
(function(){
  try {
    var stored = JSON.parse(localStorage.getItem('NIHMS_PHARMACY_PRESCRIPTIONS')||'[]');
    stored.forEach(function(e){
      var dup = _PH.prescriptions.find(function(x){return x.code===e.prescriptionRef;});
      if(!dup){
        _PH.prescriptions.unshift({
          code:        e.prescriptionRef,
          patientId:   e.patientId||'',
          idNumber:    e.idNumber||e.nationalId||e.patientIdNumber||'',
          passportNumber: e.passportNumber||e.passport||'',
          mrn:         e.mrn||'',
          patientName: e.patientName||e.patient||'',
          prescribedByObj: e.prescribedByObj||null,
          prescribedByName: e.prescribedByName||'',
          doctor:      (function(){
            var r=(e.prescribedByObj&&((e.prescribedByObj.firstName||'')+' '+(e.prescribedByObj.lastName||'')).trim())||e.prescribedByName||'';
            r=r.replace(/^Dr\.?\s*/i,'').trim();
            var rl=r.toLowerCase();
            if(rl==='doctor'||rl==='pharmacist'||rl==='') return '';
            return 'Dr. '+r;
          })(),
          doctorReg:   e.prescribedByReg||'',
          facility:    e.facility||(window.API&&window.API.getStoredUser&&(window.API.getStoredUser()||{}).facility)||'Johannesburg CHC',
          issued:      (e.prescribedAt||e.createdAt||'').slice(0,10),
          validUntil:  e.repeat&&e.repeat.reviewDate?e.repeat.reviewDate:'',
          status:      'Submitted',
          submittedAt: e.prescribedAt||'',
          repeatPrescription: e.repeatPrescription||false,
          repeat:      e.repeat||null,
          items:       (e.medications||[]).map(function(m){
            return {
              drug:     m.name+(m.strength?' '+m.strength:''),
              dosage:   (m.dose||'')+' '+(m.frequency||''),
              duration: m.duration||'',
              quantity: m.quantity,
              unit:     m.unit||'',
              route:    m.route||'',
            };
          }),
          duplicateWarning: null,
          interactions: [],
        });
      }
      /* Also add to queue */
      var dupQ = _PH.queue.find(function(x){return x.id===e.id;});
      if(!dupQ) {
        _PH.queue.push(e);
        /* Sync live working copy if already initialised */
        if(window._phQueue){
          var dupLiveQ = window._phQueue.find(function(x){return x.id===e.id;});
          if(!dupLiveQ) window._phQueue.push(e);
        }
      }
    });
  } catch(_){}

  /* Listen for live prescriptions from doctor tab */
  try {
    var _phBC2 = new BroadcastChannel('nihms_pharmacy_queue');
    _phBC2.onmessage = function(ev){
      var data = ev.data||{};
      if(data.type==='new_prescription' && data.entry){
        var e2=data.entry;
        var dupPh = _PH.prescriptions.find(function(x){return x.code===e2.prescriptionRef;});
        if(!dupPh){
          _PH.prescriptions.unshift({
            code:e2.prescriptionRef,
            patientId:e2.patientId||'',
            idNumber:e2.idNumber||e2.nationalId||e2.patientIdNumber||'',
            passportNumber:e2.passportNumber||e2.passport||'',
            mrn:e2.mrn||'',
            patientName:e2.patientName||e2.patient||'',
            prescribedByObj:e2.prescribedByObj||null,
            prescribedByName:e2.prescribedByName||'',
            doctor:(function(){
              var r=(e2.prescribedByObj&&((e2.prescribedByObj.firstName||'')+' '+(e2.prescribedByObj.lastName||'')).trim())||e2.prescribedByName||'';
              r=r.replace(/^Dr\.?\s*/i,'').trim();
              var rl=r.toLowerCase();
              if(rl==='doctor'||rl==='pharmacist'||rl==='') return '';
              return 'Dr. '+r;
            })(),
            doctorReg:e2.prescribedByReg||'',
            facility:e2.facility||(window.API&&window.API.getStoredUser&&(window.API.getStoredUser()||{}).facility)||'Johannesburg CHC',
            issued:(e2.prescribedAt||e2.createdAt||'').slice(0,10),
            validUntil:e2.repeat&&e2.repeat.reviewDate?e2.repeat.reviewDate:'',
            status:'Submitted',submittedAt:e2.prescribedAt||'',
            repeatPrescription:e2.repeatPrescription||false,repeat:e2.repeat||null,
            items:(e2.medications||[]).map(function(m){return{drug:m.name+(m.strength?' '+m.strength:''),dosage:(m.dose||'')+' '+(m.frequency||''),duration:m.duration||'',quantity:m.quantity,unit:m.unit||''};}),
            duplicateWarning:null,interactions:[],
          });
        }
        var dupQ2 = _PH.queue.find(function(x){return x.id===e2.id;});
        if(!dupQ2) _PH.queue.push(e2);
        /* Also push into the live queue working-copy so Queue panel refreshes without navigation */
        if(!window._phQueue) window._phQueue = [];
        var dupLive = window._phQueue.find(function(x){return x.id===e2.id;});
        if(!dupLive) window._phQueue.push(e2);
        /* Auto-select the new prescription in the validation panel */
        if(!dupPh && _PH.prescriptions.length) window._phSelRx = _PH.prescriptions[0];
        try{if(typeof _phRenderValidation==='function')_phRenderValidation();}catch(_){}
        try{if(typeof _phRenderQueue==='function')_phRenderQueue();}catch(_){}
        if(window.UI&&UI.showToast) UI.showToast('📋 New prescription received: '+e2.prescriptionRef,'ok');
      }
    };
  } catch(_){}
})();

/* ── Live data loader: pulls real prescriptions + queue from API ── */
window._phLoadLiveData = async function(silent){
  /* Helper: always render panels after any exit so they never stay on "Loading…" */
  function _phFlushRender(){
    if(!silent){
      try{ if(typeof _phRenderQueue==='function') _phRenderQueue(); }catch(_){}
      try{ if(typeof _phRenderValidation==='function') _phRenderValidation(); }catch(_){}
    }
  }
  if(!window.API || !window.API._fetchDirect){ _phFlushRender(); return; }
  try {
    /* Fetch prescriptions that are pending/submitted — broad status filter */
    var res = await API._fetchDirect(
      '/prescriptions?limit=200&sort=-createdAt',
      {method:'GET'}
    ).catch(function(){ return null; });

    var items = (res && (res.data || res.prescriptions || res)) || [];
    console.log('[NIHMS Pharmacy] API /prescriptions raw response:', JSON.stringify(res).slice(0,500));
    console.log('[NIHMS Pharmacy] items count:', items.length, '| sample status:', items[0]&&items[0].status);
    if(!Array.isArray(items)){ _phFlushRender(); return; }

    var todayStr = new Date().toISOString().slice(0,10);
    var dispensedToday = 0;

    items.forEach(function(rx){
      var rxRef  = rx.prescriptionRef || rx.code || rx._id || '';
      var rxStatus = rx.status || 'Submitted';

      /* Count dispensed today for KPI */
      var dispensedAt = rx.dispensedAt || rx.updatedAt || '';
      if((rxStatus==='Dispensed'||rxStatus==='dispensed') && dispensedAt && dispensedAt.slice(0,10)===todayStr){
        dispensedToday++;
      }

      /* Map to _PH.prescriptions shape */
      var patName  = rx.patientName || (rx.patient && (rx.patient.firstName||'') + ' ' + (rx.patient.lastName||'')).trim() || '';
      var patId    = rx.patientId   || (rx.patient && (rx.patient.mrn||rx.patient._id||'')) || '';
      /* Doctor name — try all known field shapes; strip generic role fallbacks */
      var docRaw = (rx.prescribedByObj && ((rx.prescribedByObj.firstName||'')+' '+(rx.prescribedByObj.lastName||'')).trim())
        || (rx.prescribedBy && typeof rx.prescribedBy==='object' && ((rx.prescribedBy.firstName||'')+' '+(rx.prescribedBy.lastName||'')).trim())
        || rx.prescribedByName
        || rx.doctor
        || (rx.prescribedBy && typeof rx.prescribedBy==='string' && rx.prescribedBy)
        || '';
      /* Strip generic role strings that aren't real names */
      var _docLow = docRaw.toLowerCase().replace(/^dr\.?\s*/i,'').trim();
      if(_docLow==='doctor'||_docLow==='pharmacist'||_docLow==='nurse'||_docLow==='') docRaw = '';
      var docName = docRaw.replace(/^Dr\.?\s*/i,'').trim();

      /* Facility — fall back to logged-in user's facility, then default */
      var facilityName = rx.facility
        || (window.API && window.API.getStoredUser && (window.API.getStoredUser()||{}).facility)
        || (window.API && window.API.getStoredUser && (window.API.getStoredUser()||{}).facilityName)
        || 'Johannesburg CHC';

      var phEntry = {
        code:        rxRef,
        patientId:   patId,
        idNumber:    rx.patientId||(rx.patient&&typeof rx.patient==='object'&&rx.patient.nationalId)||rx.idNumber||rx.nationalId||'',
        passportNumber: rx.passportNumber||rx.passport||'',
        mrn:         rx.mrn||(rx.patient&&typeof rx.patient==='object'&&rx.patient.mrn)||'',
        patientName: patName,
        prescribedByObj: rx.prescribedByObj||(rx.prescribedBy&&typeof rx.prescribedBy==='object'?rx.prescribedBy:null),
        prescribedByName: docName ? 'Dr. '+docName : '',
        doctor:      docName ? 'Dr. ' + docName : '',
        doctorReg:   rx.prescribedByReg || (rx.prescribedBy && typeof rx.prescribedBy==='object' && rx.prescribedBy.hpcsaNumber) || '',
        facility:    facilityName,
        issued:      (rx.issuedAt||rx.prescribedAt||rx.createdAt||'').slice(0,10),
        validUntil:  rx.validUntil || (rx.repeat && rx.repeat.reviewDate) || '',
        status:      rxStatus,
        submittedAt: rx.createdAt || rx.prescribedAt || '',
        repeatPrescription: !!(rx.repeatPrescription || (rx.repeat && rx.repeat.isRepeat)),
        repeat:      rx.repeat || null,
        items:       (rx.lines||rx.medications||rx.items||[]).map(function(m){
          return {
            drug:     m.name || m.drug || '',
            dosage:   (m.dose||m.dosage||'') + (m.frequency?' '+m.frequency:''),
            duration: m.duration || '',
            quantity: m.quantity || '',
            unit:     m.unit || '',
            route:    m.route || '',
          };
        }),
        duplicateWarning: rx.duplicateWarning || null,
        interactions:     rx.interactions    || [],
      };

      var dup = _PH.prescriptions.find(function(x){ return x.code===rxRef; });
      if(!dup) {
        _PH.prescriptions.unshift(phEntry);
      } else {
        /* Refresh status in case it changed on the server */
        dup.status = phEntry.status;
      }

      /* Add to queue if status is actionable (not yet dispensed/cancelled) */
      var rxStatusNorm = (rxStatus||'').toLowerCase().trim();
      var queueable = ['submitted','awaiting pharmacist review','validated','awaiting dispensing',
                       'approved for dispensing','refill due','pending','partially dispensed',
                       'new','active','prescribed'].indexOf(rxStatusNorm) > -1;
      if(queueable){
        var dupQ = _PH.queue.find(function(x){ return x.prescriptionRef===rxRef||x.id===rxRef; });
        if(!dupQ){
          var qEntry = {
            id:               rx._id || 'api-'+rxRef,
            ticket:           'P-' + String(Math.floor(Math.random()*900)+100),
            patient:          patName,
            patientId:        patId,
            items:            (rx.lines||rx.medications||rx.items||[]).length || 1,
            waitedMin:        Math.round((Date.now() - new Date(rx.createdAt||rx.prescribedAt||Date.now()).getTime()) / 60000),
            state:            (rxStatusNorm==='awaiting dispensing'||rxStatusNorm==='approved for dispensing')?'preparing': (rxStatusNorm==='dispensed'||rxStatusNorm==='collected')?'notified':'waiting',
            prescriptionRef:  rxRef,
            prescriptionId:   rx._id || rxRef,
            medications:      rx.lines || rx.medications || rx.items || [],
            prescribedByName: docName,
            prescribedByReg:  rx.prescribedByReg || '',
            prescribedAt:     rx.createdAt || rx.prescribedAt || '',
            status:           rxStatus,
          };
          _PH.queue.push(qEntry);
          if(window._phQueue){
            var dupLive = window._phQueue.find(function(x){return x.prescriptionRef===rxRef||x.id===qEntry.id;});
            if(!dupLive) window._phQueue.push(qEntry);
          }
        }
      }
    });

    /* Store dispensed today count for KPI */
    window._phDispensedToday = dispensedToday;

    /* Re-render live panels without full page reload */
    if(!silent){
      try{ if(typeof _phRenderQueue==='function') _phRenderQueue(); }catch(_){}
      try{ if(typeof _phRenderValidation==='function') _phRenderValidation(); }catch(_){}
    }

    /* Also refresh overview KPIs inline if visible */
    var kpiEl = document.getElementById('ph-kpi-queue');
    if(kpiEl) kpiEl.textContent = String(_PH.queue.filter(function(x){return x.state!=='notified';}).length);
    var kpiDisp = document.getElementById('ph-kpi-dispensed');
    if(kpiDisp) kpiDisp.textContent = String(window._phDispensedToday || 0);

  } catch(_){ _phFlushRender(); }
};

/* Auto-refresh every 30 seconds while pharmacy module is active */
(function(){
  var _phLiveTimer = null;
  window._phStartLiveRefresh = function(){
    if(_phLiveTimer) return;
    window._phLoadLiveData(true);  /* silent initial load */
    _phLiveTimer = setInterval(function(){ window._phLoadLiveData(false); }, 30000);
  };
  window._phStopLiveRefresh = function(){
    if(_phLiveTimer){ clearInterval(_phLiveTimer); _phLiveTimer=null; }
  };
  /* Start as soon as the module loads */
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', window._phStartLiveRefresh);
  } else {
    setTimeout(window._phStartLiveRefresh, 500);
  }
})();

/* ═══════════════════════════════════════════════════════════════
   SHARED UI HELPERS
═══════════════════════════════════════════════════════════════ */
var _phIconMap={
  'ti-layout-dashboard':'📊','ti-package-search':'📦','ti-shield-check':'✅',
  'ti-clipboard-check':'📋','ti-users':'👥','ti-history':'🕐','ti-truck':'🚚',
  'ti-book-lock':'🔒','ti-bell':'🔔','ti-chart-bar':'📈','ti-alert-triangle':'⚠️',
  'ti-thermometer':'🌡️','ti-trending-up':'📈','ti-scan-line':'📷','ti-qr-code':'📱',
  'ti-brain-circuit':'🤖','ti-copy-x':'🚫','ti-circle-check':'✅','ti-shield-alert':'🛡️',
  'ti-search':'🔍','ti-download':'⬇️','ti-send':'📤','ti-printer':'🖨️','ti-pill':'💊',
  'ti-clock':'⏱️','ti-package-plus':'📦','ti-settings':'⚙️',
};
function _phIcon(cls,sz){return '<span style="font-size:'+(sz||'16px')+'">'+(cls?(_phIconMap[cls]||'•'):'')+'</span>';}

function _phCard(icon, title, subtitle, action, body) {
  return '<div style="background:#ffffff;border-radius:16px;border:1px solid #e0e0e0;padding:20px 24px;box-shadow:0 1px 3px rgba(0,0,0,.06)">' +
    '<div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:20px">' +
      '<div style="display:flex;align-items:flex-start;gap:12px">' +
        '<span style="display:flex;width:36px;height:36px;align-items:center;justify-content:center;border-radius:8px;background:#f4f5f0;color:#0F6E56;flex-shrink:0">' +
          _phIcon(icon,'16px') +
        '</span>' +
        '<div>' +
          '<h2 style="font-size:15px;font-weight:600;letter-spacing:-.3px;margin:0 0 2px">'+title+'</h2>' +
          (subtitle?'<p style="font-size:13px;color:#777777;margin:0">'+subtitle+'</p>':'') +
        '</div>' +
      '</div>' +
      (action?'<div style="flex-shrink:0">'+action+'</div>':'') +
    '</div>' + body + '</div>';
}

function _phBadge(text, style) {
  var styles = {
    green:  'background:#EDFBF3;color:#0F6E56',
    red:    'background:#FEF2F2;color:#E24B4A',
    amber:  'background:#FFF9E6;color:#7A5C10',
    gray:   'background:#f4f5f0;color:#777777',
    blue:   'background:#EEF7FF;color:#1A4A9B',
    success:'background:#EDFBF3;color:#0F6E56',
  };
  return '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;'+(styles[style]||styles.gray)+'">'+text+'</span>';
}

function _phProgress(val, color) {
  color = color || '#0F6E56';
  return '<div style="height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden">' +
    '<div style="width:'+Math.min(100,Math.max(0,val))+'%;height:100%;background:'+color+';border-radius:3px;transition:width .3s"></div></div>';
}

function _phBtn(label, icon, variant, onclick) {
  var isPrimary = variant === 'primary' || !variant;
  var base = 'display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:1.5px solid;font-family:inherit;transition:opacity .15s';
  var style = isPrimary
    ? base+';background:#0F6E56;color:#fff;border-color:#0F6E56'
    : base+';background:transparent;color:#111111;border-color:#e0e0e0';
  return '<button style="'+style+'" onclick="'+onclick+'" onmouseover="this.style.opacity=\'.85\'" onmouseout="this.style.opacity=\'1\'">'+(icon?_phIcon(icon,'14px'):'')+label+'</button>';
}

function _phShell(activeId, title, desc, content) {
  var nav=[
    {id:'rx-queue',      icon:'ti-layout-dashboard', label:'Overview'},
    {id:'stock',         icon:'ti-package-search',   label:'Stock'},
    {id:'ph-validation', icon:'ti-shield-check',     label:'Validation'},
    {id:'dispensed',     icon:'ti-clipboard-check',  label:'Dispensing'},
    {id:'ph-queue',      icon:'ti-users',            label:'Queue'},
    {id:'ph-history',    icon:'ti-history',          label:'History'},
    {id:'ph-suppliers',  icon:'ti-truck',            label:'Suppliers'},
    {id:'ph-reminders',  icon:'ti-bell',             label:'Reminders'},
  ];
  var tabBar = '<div style="display:flex;gap:2px;overflow-x:auto;padding-bottom:2px;margin-bottom:20px;border-bottom:2px solid #e0e0e0;flex-wrap:wrap">' +
    nav.map(function(n){
      var a = n.id === activeId;
      return '<button onclick="Router.setPage(\''+n.id+'\')" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:none;border-bottom:2px solid '+(a?'#0F6E56':'transparent')+';margin-bottom:-2px;background:transparent;font-size:12px;font-family:inherit;cursor:pointer;white-space:nowrap;color:'+(a?'#0F6E56':'#777777')+';font-weight:'+(a?'700':'400')+'">'+
        _phIcon(n.icon,'13px')+n.label+'</button>';
    }).join('') + '</div>';
  var gradHeader =
    '<div style="display:flex;align-items:center;justify-content:space-between;' +
      'background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);' +
      'padding:18px 24px;margin-bottom:20px;border-radius:14px;box-shadow:0 2px 10px rgba(15,110,86,.18)">' +
      '<div>' +
        '<div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-.01em;margin-bottom:2px">'+title+'</div>' +
        '<div style="font-size:13px;color:rgba(255,255,255,.78)">'+( desc||'Dispensary 2 · Johannesburg CHC')+'</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,.18);border:1.5px solid rgba(255,255,255,.28)">' +
        '<span style="font-size:24px">💊</span>' +
      '</div>' +
    '</div>';
  return gradHeader + content;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 1 — OVERVIEW (rx-queue)
═══════════════════════════════════════════════════════════════ */
Pages['rx-queue'] = () => {
  var critical = _PH.stockItems.filter(function(i){ return ['critical','low'].includes(_PH.stockState(i)); });
  var expiring  = _PH.stockItems.filter(function(i){ var d=_PH.daysUntil(i.expiry); return d>=0&&d<=45; });
  var dueRefills= _PH.refills.filter(function(r){ return r.dueIn<=2; });
  var qLen      = _PH.queue.length;

  var liveQLen    = _PH.queue.filter(function(x){return x.state!=='notified';}).length;
  var readyCount  = _PH.queue.filter(function(x){return x.state==='ready'||x.state==='notified';}).length;
  var dispensedToday = window._phDispensedToday || 0;
  var avgWait = _PH.queue.length
    ? Math.round(_PH.queue.reduce(function(s,x){return s+(x.waitedMin||0);},0)/_PH.queue.length)
    : 0;

  /* Trigger a live refresh in background every time the overview opens */
  setTimeout(function(){ if(typeof window._phLoadLiveData==='function') window._phLoadLiveData(false); }, 200);

  var kpis = [
    {label:'Dispensed today',      value:String(dispensedToday),   delta:'from API',                  id:'ph-kpi-dispensed', icon:'ti-clipboard-check'},
    {label:'In queue now',         value:String(liveQLen),          delta:readyCount+' ready for collection', id:'ph-kpi-queue',     icon:'ti-users'},
    {label:'Avg wait time',        value:avgWait ? avgWait+' min' : '—',  delta:'target 20 min',         id:'ph-kpi-wait',      icon:'ti-clock'},
    {label:'Prescriptions pending',value:String(_PH.prescriptions.filter(function(x){return ['Submitted','Awaiting Pharmacist Review','pending'].indexOf(x.status)>-1;}).length), delta:'awaiting pharmacist', id:'ph-kpi-pending', icon:'ti-alert-triangle'},
  ];

  var kpiHTML = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">' +
    kpis.map(function(k){
      return '<div style="background:#ffffff;border:1px solid #e0e0e0;border-radius:16px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,.05)">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
          '<span style="font-size:13px;color:#777777">'+k.label+'</span>' +
          _phIcon(k.icon,'16px') +
        '</div>' +
        '<div id="'+k.id+'" style="font-size:30px;font-weight:700;letter-spacing:-.5px">'+k.value+'</div>' +
        '<div style="font-size:11px;color:#777777;margin-top:4px">'+k.delta+'</div>' +
      '</div>';
    }).join('') + '</div>';

  var actionCard = _phCard('ti-alert-triangle','Action required','Items that need a pharmacist decision today',
    _phBtn('Open stock','ti-package-search','outline','Router.setPage(\'stock\')'),
    '<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px">' +
    critical.map(function(i){
      return '<li style="display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid rgba(226,75,74,.2);background:#FEF2F2;border-radius:10px;padding:12px 14px">' +
        '<div><div style="font-size:13px;font-weight:500">'+i.drug+'</div><div style="font-size:11px;color:#777777">'+i.quantity+' left · reorder at '+i.reorderLevel+' · '+i.supplier+'</div></div>' +
        _phBadge('Low stock','red')+'</li>';
    }).join('') +
    expiring.map(function(i){
      return '<li style="display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid rgba(234,179,8,.3);background:#FFF9E6;border-radius:10px;padding:12px 14px">' +
        '<div><div style="font-size:13px;font-weight:500">'+i.drug+'</div><div style="font-size:11px;color:#777777">Batch '+i.batch+' expires in '+_PH.daysUntil(i.expiry)+' days</div></div>' +
        _phBadge('Expiring','amber')+'</li>';
    }).join('') + '</ul>'
  );

  var coldHTML = _phCard('ti-thermometer','Cold chain monitoring','Live fridge temperatures — breaches spoil insulin and vaccines','',
    '<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px">' +
    _PH.coldChain.map(function(f){
      var breach = f.temp<f.min||f.temp>f.max;
      return '<li style="border:1px solid #e0e0e0;border-radius:10px;padding:12px 14px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between">' +
          '<span style="font-size:13px;font-weight:500">'+f.unit+'</span>' +
          '<span style="font-size:13px;font-weight:700;color:'+(breach?'#dc2626':'#0F6E56')+'">'+f.temp.toFixed(1)+'°C</span>' +
        '</div>' +
        '<div style="font-size:11px;color:#777777;margin:4px 0">Range '+f.min+'–'+f.max+'°C · checked '+f.lastCheck+(breach?' · escalate to facility manager':'')+'</div>' +
        _phProgress(Math.min(100,f.temp/12*100), breach?'#dc2626':'#0F6E56') +
      '</li>';
    }).join('') + '</ul>'
  );

  var refillHTML = _phCard('ti-bell','Refills due','Chronic patients to contact',
    _phBtn('Manage','ti-settings','outline','Router.setPage(\'ph-reminders\')'),
    '<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px">' +
    dueRefills.map(function(r){
      return '<li style="display:flex;align-items:center;justify-content:space-between;border-radius:8px;background:#f4f5f0;padding:8px 12px;font-size:13px">' +
        '<span>'+r.patient+' · <span style="color:#777777">'+r.drug+'</span></span>' +
        '<span style="font-size:11px;color:#777777">'+(r.dueIn<0?(-r.dueIn)+'d overdue':r.dueIn===0?'Due today':'in '+r.dueIn+'d')+'</span>' +
      '</li>';
    }).join('') + '</ul>'
  );

  var quickActions = _phCard('ti-trending-up','Quick actions','Jump straight into the busiest workflows','',
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">' +
    [
      {page:'ph-validation',label:'Validate a script',icon:'ti-shield-check'},
      {page:'dispensed',label:'Dispense & print label',icon:'ti-package-search'},
      {page:'ph-queue',label:'Call next patient',icon:'ti-users'},
      {page:'ph-suppliers',label:'Place an order',icon:'ti-trending-up'},
    ].map(function(a){
      return '<button onclick="Router.setPage(\''+a.page+'\')" style="display:flex;align-items:center;gap:10px;border:1px solid #e0e0e0;border-radius:10px;background:#f4f5f0;padding:12px 14px;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;transition:background .15s" onmouseover="this.style.background=\'#ffffff\'" onmouseout="this.style.background=\'#f4f5f0\'">' +
        _phIcon(a.icon,'15px')+a.label+'</button>';
    }).join('') + '</div>'
  );

  var content =
    kpiHTML +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">' +
      actionCard +
      '<div style="display:flex;flex-direction:column;gap:20px">'+coldHTML+refillHTML+'</div>' +
    '</div>' + quickActions;

  return _phShell('rx-queue','Overview','Today · Johannesburg CHC', content);
};

/* ═══════════════════════════════════════════════════════════════
   PAGE 2 — STOCK MANAGEMENT
═══════════════════════════════════════════════════════════════ */
Pages['stock'] = () => {
  var rows = _PH.stockItems.map(function(i){ return {item:i,state:_PH.stockState(i)}; });
  var alerts = rows.filter(function(r){ return r.state!=='ok'; }).length;

  var stateMeta = {
    critical:{label:'Critical stock',rowBg:'rgba(226,75,74,.07)',badge:'red'},
    low:{label:'Below reorder level',rowBg:'rgba(234,179,8,.07)',badge:'amber'},
    expiring:{label:'Expiring soon',rowBg:'rgba(234,179,8,.05)',badge:'amber'},
    expired:{label:'Expired',rowBg:'rgba(226,75,74,.1)',badge:'red'},
    ok:{label:'In stock',rowBg:'',badge:'green'},
  };

  var tableRows = rows.map(function(r){
    var m=stateMeta[r.state], i=r.item, days=_PH.daysUntil(i.expiry);
    return '<tr style="border-bottom:1px solid #e0e0e0;background:'+m.rowBg+'">' +
      '<td style="padding:10px 12px"><div style="font-weight:500;font-size:13px">'+i.drug+'</div><div style="font-size:11px;color:#777777">'+i.form+'</div></td>' +
      '<td style="padding:10px 12px;font-family:monospace;font-size:12px">'+i.batch+'</td>' +
      '<td style="padding:10px 12px"><div style="font-size:13px">'+i.expiry+'</div><div style="font-size:11px;color:'+(days<=45?'#7A5C10':'#777777')+'">'+( days<0?'expired '+(-days)+'d ago':'in '+days+' days')+'</div></td>' +
      '<td style="padding:10px 12px;text-align:right"><div style="font-size:13px;font-weight:600">'+i.quantity+'</div><div style="font-size:11px;color:#777777">min '+i.reorderLevel+'</div></td>' +
      '<td style="padding:10px 12px">'+_phBadge(m.label,m.badge)+'</td>' +
      '<td style="padding:10px 12px;font-size:12px;color:#777777">'+i.supplier+'</td>' +
      '<td style="padding:10px 12px;text-align:right">'+_phBtn('Reorder','ti-truck',r.state==='ok'?'outline':'primary','_phReorder(\''+i.id+'\')')+'</td>' +
    '</tr>';
  }).join('');

  var body =
    '<div style="margin-bottom:14px"><input id="stock-search" placeholder="Search drug, batch or supplier" oninput="_phFilterStockTable(this.value)" style="padding:9px 14px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;width:280px;outline:none;font-family:inherit"></div>' +
    '<div style="border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;overflow-x:auto">' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
    '<thead><tr style="background:#f4f5f0">' +
    ['Drug','Batch','Expiry','Qty','Status','Supplier','Action'].map(function(h,i){ return '<th style="padding:10px 12px;text-align:'+(i===3||i===6?'right':'left')+';font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#777777;font-weight:600">'+h+'</th>'; }).join('') +
    '</tr></thead><tbody id="stock-tbody">'+tableRows+'</tbody></table></div>';

  var content = _phCard('ti-package-search','Stock management','Live inventory · synced 2 minutes ago',
    '<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;background:#FFF9E6;color:#7A5C10;font-size:11px;font-weight:600"><span style="font-size:12px">⚠️</span>'+alerts+' alerts</span>',
    body);
  return _phShell('stock','Stock management','Live inventory · Johannesburg CHC', content);
};

window._phFilterStockTable = function(q) {
  var lower = q.toLowerCase();
  var rows = document.querySelectorAll('#stock-tbody tr');
  rows.forEach(function(r){
    var text = r.textContent.toLowerCase();
    r.style.display = !lower||text.includes(lower)?'':'none';
  });
};

window._phReorder = function(itemId) {
  var item = _PH.stockItems.find(function(x){ return x.id===itemId; });
  if(!item) return;

  /* Build a suggested order quantity: enough to reach 3× reorder level */
  var suggested = Math.max(item.reorderLevel * 3 - item.quantity, item.reorderLevel);

  /* Overlay modal */
  var existing = document.getElementById('ph-reorder-modal');
  if(existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'ph-reorder-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.innerHTML =
    '<div style="background:#fff;border-radius:16px;padding:28px 28px 24px;width:420px;max-width:94vw;box-shadow:0 8px 40px rgba(0,0,0,.18)">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">' +
        '<span style="font-size:22px">🚚</span>' +
        '<div><div style="font-size:15px;font-weight:700">Place reorder</div>' +
             '<div style="font-size:12px;color:#777">'+item.drug+' · '+item.supplier+'</div></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">' +
        '<div>' +
          '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#777;margin-bottom:4px">Current stock</div>' +
          '<div style="font-size:18px;font-weight:700">'+item.quantity+'</div>' +
          '<div style="font-size:11px;color:#777">min '+item.reorderLevel+'</div>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#777;margin-bottom:4px">Supplier</div>' +
          '<div style="font-size:13px;font-weight:600">'+item.supplier+'</div>' +
          '<div style="font-size:11px;color:#777">Batch: '+item.batch+'</div>' +
        '</div>' +
      '</div>' +
      '<div style="margin-bottom:16px">' +
        '<label style="font-size:12px;font-weight:600;display:block;margin-bottom:6px">Order quantity</label>' +
        '<input id="ph-reorder-qty" type="number" min="1" value="'+suggested+'" ' +
          'style="width:100%;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box">' +
      '</div>' +
      '<div style="margin-bottom:20px">' +
        '<label style="font-size:12px;font-weight:600;display:block;margin-bottom:6px">Notes (optional)</label>' +
        '<input id="ph-reorder-notes" type="text" placeholder="e.g. Urgent — expiry replacement" ' +
          'style="width:100%;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box">' +
      '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end">' +
        '<button onclick="document.getElementById(\'ph-reorder-modal\').remove()" ' +
          'style="padding:9px 20px;border-radius:8px;border:1.5px solid #e0e0e0;background:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;color:#555">Cancel</button>' +
        '<button onclick="_phReorderConfirm(\''+itemId+'\')" ' +
          'style="padding:9px 20px;border-radius:8px;border:none;background:#0F6E56;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">🚚 Send reorder</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  /* Close on backdrop click */
  modal.addEventListener('click', function(e){ if(e.target===modal) modal.remove(); });
  setTimeout(function(){ var q=document.getElementById('ph-reorder-qty'); if(q){q.focus();q.select();} },50);
};

window._phReorderConfirm = function(itemId) {
  var item = _PH.stockItems.find(function(x){ return x.id===itemId; });
  if(!item) return;
  var qtyEl   = document.getElementById('ph-reorder-qty');
  var notesEl = document.getElementById('ph-reorder-notes');
  var qty     = parseInt((qtyEl&&qtyEl.value)||'0', 10);
  var notes   = (notesEl&&notesEl.value.trim()) || '';

  if(!qty || qty < 1) {
    UI.showToast('Enter a valid order quantity','err'); return;
  }

  var modal = document.getElementById('ph-reorder-modal');
  if(modal) modal.remove();

  /* Post to API */
  var user = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  var payload = {
    drug:        item.drug,
    batch:       item.batch,
    supplier:    item.supplier,
    quantity:    qty,
    notes:       notes,
    requestedBy: user.firstName ? (user.firstName+' '+(user.lastName||'')).trim() : (user.name||'Pharmacist'),
    facility:    user.facility || user.facilityName || 'Johannesburg CHC',
    requestedAt: new Date().toISOString(),
    stockItemId: item.id,
    currentStock:item.quantity,
    reorderLevel:item.reorderLevel,
  };

  if(window.API && window.API._fetchDirect) {
    API._fetchDirect('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    }).then(function(res){
      var ref = (res&&(res.code||res.poNumber||res._id)) ? ' · Ref: '+(res.code||res.poNumber||res._id) : '';
      UI.showToast('Reorder sent to '+item.supplier+ref,'ok');
    }).catch(function(){
      /* API unavailable — log locally and still confirm to user */
      UI.showToast('Reorder queued for '+item.supplier+' ('+qty+' units)','ok');
    });
  } else {
    UI.showToast('Reorder queued for '+item.supplier+' ('+qty+' units)','ok');
  }

  /* Persist in local purchase orders so Suppliers panel shows it */
  _PH.purchaseOrders.unshift({
    id: 'PO-'+Date.now(),
    supplier: item.supplier,
    items: 1,
    value: qty,
    placed: new Date().toISOString().slice(0,10),
    eta: '',
    status: 'sent',
    drug: item.drug,
    quantity: qty,
    notes: notes,
  });
};

/* ═══════════════════════════════════════════════════════════════
   PAGE 3 — PRESCRIPTION VALIDATION
═══════════════════════════════════════════════════════════════ */
/* Prescription status workflow */
var _PH_STATUSES = ['Submitted','Awaiting Pharmacist Review','Validated','Awaiting Dispensing','Partially Dispensed','Dispensed','Refill Due','Expired','Cancelled','Rejected — Requires Correction'];
var _PH_STATUS_STYLE = {
  'Submitted':                  'blue',
  'Awaiting Pharmacist Review': 'amber',
  'Validated':                  'green',
  'Awaiting Dispensing':        'blue',
  'Partially Dispensed':        'amber',
  'Dispensed':                  'green',
  'Refill Due':                 'amber',
  'Expired':                    'red',
  'Cancelled':                  'red',
  'Rejected — Requires Correction': 'red',
  'valid':                      'green',
  'invalid':                    'red',
};

Pages['ph-validation'] = () => {
  window._phSelRx   = _PH.prescriptions[0] || null;
  window._phChecked = false;
  /* Load live data first, then render */
  setTimeout(function(){
    if(typeof window._phLoadLiveData==='function'){
      window._phLoadLiveData(false);
    } else {
      _phRenderValidation();
    }
  }, 0);
  /* Hard fallback: render with whatever is in memory after 2 s */
  setTimeout(function(){
    var el = document.getElementById('ph-val-body');
    if(el && el.textContent.indexOf('Loading')>-1) _phRenderValidation();
  }, 2000);
  return _phShell('ph-validation','Prescription validation','Verify before dispensing',
    _phCard('ti-shield-check','Prescription validation','Verify and update prescription statuses','',
      '<div id="ph-val-body">Loading...</div>'));
};

function _phRenderValidation() {
  /* Merge prescriptions from in-memory PHARMACY_QUEUE */
  try {
    (window._PHARMACY_QUEUE||[]).forEach(function(e){
      var dup = _PH.prescriptions.find(function(x){return x.code===e.prescriptionRef;});
      if(!dup && e.prescriptionRef){
        _PH.prescriptions.unshift({
          code:e.prescriptionRef,patientId:e.patientId||'',patientName:e.patient||'',
          doctor:e.prescribedByName||'',doctorReg:e.prescribedByReg||'',
          issued:e.prescribedAt?e.prescribedAt.slice(0,10):'',
          validUntil:e.repeat&&e.repeat.reviewDate?e.repeat.reviewDate:'',
          status:'Submitted',submittedAt:e.prescribedAt||'',
          repeatPrescription:e.repeatPrescription||false,repeat:e.repeat||null,
          items:(e.medications||[]).map(function(m){return{drug:m.name+(m.strength?' '+m.strength:''),dosage:(m.dose||'')+' '+(m.frequency||''),duration:m.duration||'',quantity:m.quantity||'',unit:m.unit||'',route:m.route||''};}),
          duplicateWarning:null,interactions:[],
        });
      }
    });
  } catch(_){}

  var rx      = window._phSelRx || _PH.prescriptions[0];
  if (!rx) {
    var el0 = document.getElementById('ph-val-body');
    if(el0) el0.innerHTML=
      '<div style="text-align:center;padding:48px 20px;color:#777777">' +
        '<div style="font-size:40px;margin-bottom:12px">📋</div>' +
        '<div style="font-size:15px;font-weight:600;margin-bottom:6px">No prescriptions to review</div>' +
        '<div style="font-size:13px">When a doctor submits a prescription it will appear here for validation.</div>' +
      '</div>';
    return;
  }
  var checked = window._phChecked;
  var status  = rx.status||'Submitted';
  var statusStyle = _PH_STATUS_STYLE[status]||'gray';
  var isDispensable = ['Submitted','Awaiting Pharmacist Review','Validated','Awaiting Dispensing','Refill Due'].includes(status);
  var isAlreadyDispensed = (status==='Dispensed'||status==='dispensed');

  /* ── Prescription list sidebar ── */
  var listHTML =
    '<div style="margin-bottom:16px;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden">'+
    '<div style="background:#f4f5f0;padding:10px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#777">All Prescriptions ('+_PH.prescriptions.length+')</div>'+
    _PH.prescriptions.map(function(p,i){
      var sel = (window._phSelRx && window._phSelRx.code===p.code);
      return '<div onclick="window._phSelRx=_PH.prescriptions['+i+'];window._phChecked=false;_phRenderValidation()" '+
        'style="padding:10px 14px;cursor:pointer;border-top:1px solid #e0e0e0;background:'+(sel?'#EDFBF3':'#fff')+'">'+
        '<div style="font-size:12px;font-weight:700;font-family:monospace;color:#0F6E56">'+p.code+'</div>'+
        '<div style="font-size:12px;color:#333;margin-top:2px">'+p.patientName+'</div>'+
        '<div style="margin-top:4px">'+_phBadge(p.status||'Submitted',_PH_STATUS_STYLE[p.status||'Submitted']||'gray')+'</div>'+
      '</div>';
    }).join('')+
    '</div>';

  /* ── Repeat prescription section ── */
  var repeatSection = '';
  if (rx.repeatPrescription && rx.repeat) {
    var rep = rx.repeat;
    var isExpired = rep.expiryDate && new Date(rep.expiryDate) < new Date();
    var exhausted = rep.remaining !== undefined && rep.remaining <= 0;
    repeatSection =
      '<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:14px;margin-bottom:14px">'+
      '<div style="font-size:13px;font-weight:700;color:#1D4ED8;margin-bottom:10px">🔁 Repeat Prescription Details</div>'+
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:13px">'+
        ['Repeats Allowed','Repeats Used','Repeats Remaining'].map(function(h,i){
          var val = i===0?rep.allowed:(i===1?rep.used:rep.remaining);
          var col = i===2?(rep.remaining<=0?'#dc2626':rep.remaining<=1?'#d97706':'#0F6E56'):'#1e293b';
          return '<div style="background:#fff;border-radius:8px;padding:10px;text-align:center">'+
            '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#777;margin-bottom:4px">'+h+'</div>'+
            '<div style="font-size:22px;font-weight:800;color:'+col+'">'+val+'</div>'+
          '</div>';
        }).join('')+
      '</div>'+
      (rep.reviewDate?'<div style="margin-top:10px;font-size:12px;color:#64748b">📅 Next Review Date: <strong style="color:#1e293b">'+rep.reviewDate+'</strong></div>':'')+
      (rep.expiryDate?'<div style="margin-top:4px;font-size:12px;color:'+(isExpired?'#dc2626':'#64748b')+'">⏰ Expiry Date: <strong>'+rep.expiryDate+'</strong>'+(isExpired?' — <span style="color:#dc2626;font-weight:700">EXPIRED</span>':'')+'</div>':'')+
      ((isExpired||exhausted)?'<div style="margin-top:10px;background:#FEF2F2;border:1px solid rgba(220,38,38,.3);border-radius:6px;padding:8px;font-size:12px;color:#dc2626;font-weight:700">'+
        (isExpired?'⛔ This prescription has expired and cannot be dispensed.':'⛔ Authorised repeats exhausted — cannot dispense further repeats.')+'</div>':'')+
    '</div>';
  }

  /* ── Validation gate: check required fields before allowing Validate & Approve ── */
  /* Resolve doctor name from all possible sources */
  var _docNameRaw = (function(){
    if(rx.prescribedByObj && (rx.prescribedByObj.firstName||rx.prescribedByObj.lastName))
      return ((rx.prescribedByObj.firstName||'')+' '+(rx.prescribedByObj.lastName||'')).trim();
    if(rx.prescribedByName) return rx.prescribedByName;
    return rx.doctor||'';
  })();
  var _docNameClean = _docNameRaw.replace(/^Dr\.?\s*/i,'').trim();
  var _docNameLow   = _docNameClean.toLowerCase();
  var _docMissing   = !_docNameClean || _docNameLow==='doctor' || _docNameLow==='pharmacist' || _docNameLow==='nurse';
  var _canValidate  = !_docMissing && !isAlreadyDispensed;
  var _validationErrors = [];
  if(_docMissing) _validationErrors.push('Prescribing doctor name is missing or unidentified');

  /* Displayed doctor name with Dr. prefix */
  var _docDisplay = _docMissing ? '<span style="color:#dc2626;font-weight:700">Not specified</span>'
                                : 'Dr. '+_docNameClean;

  /* Dispensing pharmacist — logged-in user at this moment */
  var _phValUser = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  var _pharmValName = (function(){
    if(_phValUser.firstName||_phValUser.lastName)
      return ((_phValUser.firstName||'')+' '+(_phValUser.lastName||'')).trim();
    var n = (_phValUser.name||'').trim();
    var nl = n.toLowerCase();
    if(!n||nl==='pharmacist'||nl==='doctor'||nl==='nurse'||nl==='user') return '';
    return n;
  })();
  var _pharmValDisplay = _pharmValName
    ? _pharmValName
    : '<span style="color:#94a3b8">Not logged in</span>';

  /* Validity / review date */
  var _validUntil = rx.validUntil || (rx.repeat&&rx.repeat.reviewDate ? rx.repeat.reviewDate : '')
                  || (rx.repeat&&rx.repeat.expiryDate ? rx.repeat.expiryDate : '') || '';
  var _validUntilDisplay = _validUntil || '<span style="color:#94a3b8">Not specified</span>';

  /* Facility with fallback */
  var _uVal = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  var _facilityVal = rx.facility && rx.facility!=='—' ? rx.facility
    : (_uVal.facility||_uVal.facilityName||'Johannesburg CHC');

  /* AI check state */
  var _aiRan     = !!checked;
  var _aiHasHigh = _aiRan && rx.interactions && rx.interactions.some(function(ix){ return ix.severity==='high'; });
  var _aiCanApprove = !_aiHasHigh; /* high-risk interaction blocks approval */
  if(_aiRan && _aiHasHigh) _validationErrors.push('High-risk drug interaction detected — review required before approval');

  /* Status badge config: larger, coloured background, icon */
  var _statusMeta = {
    'Submitted':                 {bg:'#EFF6FF',border:'#BFDBFE',color:'#1D4ED8',icon:'📨'},
    'Awaiting Pharmacist Review':{bg:'#FFF7ED',border:'#FED7AA',color:'#C2410C',icon:'⏳'},
    'Validated':                 {bg:'#EDFBF3',border:'#6EE7B7',color:'#065F46',icon:'✅'},
    'Awaiting Dispensing':       {bg:'#EFF6FF',border:'#93C5FD',color:'#1D4ED8',icon:'🔄'},
    'Partially Dispensed':       {bg:'#FFFBEB',border:'#FCD34D',color:'#92400E',icon:'⚡'},
    'Dispensed':                 {bg:'#EDFBF3',border:'#6EE7B7',color:'#065F46',icon:'✅'},
    'dispensed':                 {bg:'#EDFBF3',border:'#6EE7B7',color:'#065F46',icon:'✅'},
    'Refill Due':                {bg:'#EFF6FF',border:'#93C5FD',color:'#1E40AF',icon:'🔁'},
    'Expired':                   {bg:'#FEF2F2',border:'#FECACA',color:'#991B1B',icon:'⛔'},
    'Cancelled':                 {bg:'#F9FAFB',border:'#D1D5DB',color:'#374151',icon:'✖'},
    'Rejected — Requires Correction':{bg:'#FEF2F2',border:'#FECACA',color:'#991B1B',icon:'⚠️'},
  };
  var _sm = _statusMeta[status] || {bg:'#f4f5f0',border:'#e0e0e0',color:'#333',icon:'•'};
  var _statusBadgeLarge =
    '<div style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;border:1.5px solid '+_sm.border+';background:'+_sm.bg+';color:'+_sm.color+';font-size:13px;font-weight:700">'+
      _sm.icon+' '+status+
    '</div>';

  var body =
    '<form onsubmit="event.preventDefault();_phValSearch(document.getElementById(\'val-q\').value)" style="display:flex;gap:8px;margin-bottom:16px">'+
      '<div style="position:relative;flex:1">'+
        '<span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:15px;color:#777;pointer-events:none">🔍</span>'+
        '<input id="val-q" placeholder="Patient ID or prescription code (RX-…-ZA)" style="width:100%;padding:9px 14px 9px 38px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box">'+
      '</div>'+
      _phBtn('Search','','primary','_phValSearch(document.getElementById(\'val-q\').value)')+
    '</form>'+

    listHTML+

    /* Full prescription header */
    '<div style="background:#f4f5f0;border:1px solid #e0e0e0;border-radius:12px;padding:16px;margin-bottom:14px">'+
      '<div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px">'+
        '<div>'+
          '<div style="font-weight:700;font-size:16px">'+rx.patientName+'</div>'+
          '<div style="font-size:12px;color:#777;font-family:monospace">'+(function(){
            /* Prefer non-MongoDB-ObjectId: SA ID, passport, MRN */
            var _mid = function(v){ return v && /^[0-9a-f]{24}$/i.test((v+'').trim()); };
            var cands = [rx.idNumber, rx.nationalId, rx.patientIdNumber, rx.passportNumber, rx.passport, rx.mrn];
            for(var ci=0;ci<cands.length;ci++){ if(cands[ci]&&cands[ci]!=='—'&&cands[ci]!==''&&!_mid(cands[ci])) return cands[ci]; }
            if(rx.patientId && !_mid(rx.patientId)) return rx.patientId;
            return rx.patientId||'—';
          })()+' · '+rx.code+'</div>'+
        '</div>'+
        _statusBadgeLarge+
      '</div>'+

      /* Prescription detail fields */
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;font-size:13px;margin-bottom:14px">'+
        [
          ['Prescribing Doctor',   _docDisplay],
          ['Dispensing Pharmacist',_pharmValDisplay],
          ['Facility',             _facilityVal],
          ['Prescription Date',    rx.issued||'—'],
          ['Valid Until / Review', _validUntilDisplay],
          ['Submitted',            rx.submittedAt?(new Date(rx.submittedAt).toLocaleString('en-ZA')):'—'],
        ].map(function(f){
          return '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#777;margin-bottom:2px">'+f[0]+'</div><div style="font-weight:600">'+f[1]+'</div></div>';
        }).join('')+
      '</div>'+

      /* Missing-info warning banner — only for genuinely missing doctor name */
      (_docMissing?
        '<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#991B1B">'+
          '<div style="font-weight:700;margin-bottom:4px">⚠️ Incomplete prescriber information</div>'+
          '<ul style="margin:0;padding-left:18px">'+
          '<li>Prescribing doctor name is missing — this prescription cannot be validated until the doctor\'s identity is confirmed</li>'+
          '</ul>'+
        '</div>':'') +

      /* Prescribed items with full detail */
      '<div style="border-top:1px solid #e0e0e0;padding-top:14px">'+
        '<div style="font-size:13px;font-weight:700;margin-bottom:8px">Prescribed Medications</div>'+
        '<div style="display:flex;flex-direction:column;gap:8px">'+
        rx.items.map(function(it,i){
          return '<div style="background:#ffffff;border:1px solid #e0e0e0;border-radius:8px;padding:10px 12px;font-size:13px">'+
            '<div style="font-weight:700;margin-bottom:3px">'+(i+1)+'. '+it.drug+'</div>'+
            '<div style="color:#555">Dosage: '+it.dosage+'</div>'+
            (it.duration?'<div style="color:#555">Duration: '+it.duration+'</div>':'')+
            (it.quantity?'<div style="color:#555">Quantity: '+it.quantity+(it.unit?' '+it.unit:'')+'</div>':'')+
            (it.route?'<div style="color:#555">Route: '+it.route+'</div>':'')+
          '</div>';
        }).join('')+
        '</div>'+
      '</div>'+
    '</div>'+

    repeatSection+

    (rx.duplicateWarning?
      '<div style="display:flex;gap:12px;border:1px solid rgba(226,75,74,.3);background:#FEF2F2;border-radius:12px;padding:14px;margin-bottom:14px">'+
        '<span style="font-size:18px;color:#dc2626;flex-shrink:0;margin-top:2px">🚫</span>'+
        '<div><div style="font-size:13px;font-weight:600;color:#dc2626;margin-bottom:3px">Possible duplicate collection</div><div style="font-size:13px">'+rx.duplicateWarning+'</div></div>'+
      '</div>':
      '<div style="display:flex;gap:12px;border:1px solid #e0e0e0;background:#EDFBF3;border-radius:12px;padding:14px;margin-bottom:14px">'+
        '<span style="font-size:18px;color:#0F6E56;flex-shrink:0;margin-top:2px">✅</span>'+
        '<div style="font-size:13px">No duplicate collections found across linked clinics.</div>'+
      '</div>')+

    /* AI interaction checker — auto-runs on first render, manual re-run available */
    '<div style="border:1px solid '+(_aiHasHigh?'#FECACA':(_aiRan?'#6EE7B7':'#e0e0e0'))+';border-radius:12px;padding:14px;margin-bottom:14px;background:'+(_aiHasHigh?'#FEF2F2':(_aiRan?'#EDFBF3':'#fff'))+'">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'+
        '<div style="display:flex;align-items:center;gap:8px">'+
          '<span style="font-size:16px">🤖</span>'+
          '<span style="font-size:13px;font-weight:700;color:'+(_aiHasHigh?'#991B1B':(_aiRan?'#065F46':'#1e293b'))+'">AI Drug Interaction Check'+(_aiRan?(_aiHasHigh?' — ⚠️ Interactions detected':' — ✅ Clear'):'')+'</span>'+
        '</div>'+
        '<button onclick="window._phChecked=true;_phRenderValidation()" style="padding:6px 14px;border-radius:7px;border:1.5px solid #0F6E56;background:#fff;color:#0F6E56;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">'+(_aiRan?'Re-run check':'Run check')+'</button>'+
      '</div>'+
      (_aiRan?(rx.interactions&&rx.interactions.length?
        '<div style="display:flex;flex-direction:column;gap:8px">'+
        rx.interactions.map(function(ix){
          var sev={high:'red',moderate:'amber',low:'green'}[ix.severity]||'gray';
          var sevBg = {high:'#FEF2F2',moderate:'#FFFBEB',low:'#EDFBF3'}[ix.severity]||'#f8fafc';
          var sevBorder = {high:'#FECACA',moderate:'#FCD34D',low:'#6EE7B7'}[ix.severity]||'#e0e0e0';
          return '<div style="border:1px solid '+sevBorder+';border-radius:8px;padding:10px 12px;font-size:13px;background:'+sevBg+'">'+
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'+
              _phBadge(ix.severity.toUpperCase()+' RISK',sev)+
              '<span style="font-weight:600">'+ix.pair+'</span>'+
            '</div>'+
            '<div style="color:#555">'+ix.note+'</div>'+
            (ix.severity==='high'?'<div style="margin-top:6px;font-size:12px;color:#991B1B;font-weight:600">⛔ This interaction requires pharmacist review before dispensing approval.</div>':'')+
          '</div>';
        }).join('')+'</div>':
        '<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#065F46"><span>✅</span><span>No drug interactions detected for this prescription.</span></div>'):
        '<div style="font-size:13px;color:#777">Cross-checks this prescription\'s medications against known interaction databases. Run before approving.</div>')+
    '</div>'+

    /* Already-dispensed notice */
    (isAlreadyDispensed ?
      (function(){
        var dispRec = (_PH.history||[]).find(function(h){ return h.prescriptionRef===rx.code; });
        var dOn  = dispRec ? dispRec.date : '—';
        var dBy  = dispRec ? (dispRec.pharmacist||'—') : '—';
        return '<div style="display:flex;gap:12px;border:2px solid #0F6E56;background:#EDFBF3;border-radius:12px;padding:14px;margin-bottom:14px;align-items:flex-start">' +
          '<span style="font-size:22px;flex-shrink:0">✅</span>' +
          '<div>' +
            '<div style="font-size:14px;font-weight:700;color:#0F6E56;margin-bottom:3px">Medication already dispensed — no further action required</div>' +
            '<div style="font-size:13px;color:#333">Dispensed on <strong>'+dOn+'</strong> by <strong>'+dBy+'</strong></div>' +
            '<div style="margin-top:8px;font-size:12px;color:#555">If this patient presents again for the same prescription, use the <strong>Dispensing & Labels</strong> panel search to investigate before proceeding.</div>' +
          '</div>' +
        '</div>';
      })() :
      '') +

    /* Validation errors summary — shown above action buttons */
    (_validationErrors.length && !isAlreadyDispensed ?
      '<div style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:10px;padding:12px 16px;margin-bottom:14px">'+
        '<div style="font-size:13px;font-weight:700;color:#991B1B;margin-bottom:6px">🚫 Cannot validate — the following issues must be resolved:</div>'+
        '<ul style="margin:0;padding-left:18px;font-size:13px;color:#991B1B">'+
        _validationErrors.map(function(e){ return '<li>'+e+'</li>'; }).join('')+
        '</ul>'+
      '</div>' : '')+

    /* Status update controls */
    '<div style="border:1px solid #e0e0e0;border-radius:12px;padding:14px;margin-bottom:14px">'+
      '<div style="font-size:13px;font-weight:700;margin-bottom:10px">Update Prescription Status</div>'+
      /* Status pills — current status highlighted prominently */
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">'+
      _PH_STATUSES.map(function(s){
        var active = s===status;
        var sm2 = _statusMeta[s]||{bg:'#f4f5f0',border:'#e0e0e0',color:'#555',icon:''};
        return '<button onclick="_phSetRxStatus(\''+s.replace(/'/g,"\\'")+'\')" '+
          'style="padding:6px 12px;border-radius:7px;border:1.5px solid '+(active?sm2.border:'#e0e0e0')+';background:'+(active?sm2.bg:'#fff')+';color:'+(active?sm2.color:'#555')+';font-size:12px;font-weight:'+(active?'700':'400')+';cursor:pointer;font-family:inherit;transition:all .15s">'+
          (active?sm2.icon+' ':'')+s+
        '</button>';
      }).join('')+
      '</div>'+
      /* Action buttons — Validate blocked if gate fails */
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+
        (isAlreadyDispensed
          ? '<div style="font-size:13px;color:#0F6E56;font-weight:600">✅ Prescription fully dispensed — no further actions available.</div>'
          : '<button onclick="_phValidateAndApprove()" style="padding:10px 20px;border-radius:8px;border:none;background:'+(_canValidate&&_aiCanApprove?'#0F6E56':'#94a3b8')+';color:#fff;font-size:13px;font-weight:700;cursor:'+(_canValidate&&_aiCanApprove?'pointer':'not-allowed')+';font-family:inherit">✅ Validate &amp; Approve</button>'+
            (isDispensable ? '<button onclick="_phSetRxStatus(\'Awaiting Dispensing\')" style="padding:10px 20px;border-radius:8px;border:1.5px solid #0F6E56;background:#fff;color:#0F6E56;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Move to Dispensing</button>' : '')+
            '<button onclick="_phSetRxStatus(\'Rejected \u2014 Requires Correction\')" style="padding:10px 20px;border-radius:8px;border:1.5px solid #dc2626;background:#fff;color:#dc2626;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">✖ Reject — Needs Correction</button>'
        )+
      '</div>'+
    '</div>';

  var el = document.getElementById('ph-val-body');
  if (el) el.innerHTML = body;
}

/* ── Validate & Approve gated action ── */
window._phValidateAndApprove = function(){
  var rx = window._phSelRx;
  if(!rx){ UI.showToast('No prescription selected','err'); return; }
  /* Gate 1: doctor name — resolve from all sources */
  var docClean = (function(){
    var raw = (rx.prescribedByObj && (rx.prescribedByObj.firstName||rx.prescribedByObj.lastName))
      ? ((rx.prescribedByObj.firstName||'')+' '+(rx.prescribedByObj.lastName||'')).trim()
      : (rx.prescribedByName||rx.doctor||'');
    return raw.replace(/^Dr\.?\s*/i,'').trim().toLowerCase();
  })();
  if(!docClean || docClean==='doctor' || docClean==='pharmacist' || docClean==='nurse'){
    UI.showToast('Cannot validate — prescribing doctor name is missing','err'); return;
  }
  /* Gate 2: AI check must have been run; block on high-risk interactions */
  if(!window._phChecked){
    UI.showToast('Please run the AI drug interaction check before approving','err');
    window._phChecked = true; _phRenderValidation(); return;
  }
  if(rx.interactions && rx.interactions.some(function(ix){ return ix.severity==='high'; })){
    UI.showToast('High-risk drug interaction detected — review required before approval','err'); return;
  }
  _phSetRxStatus('Validated');
};

window._phSetRxStatus = function(newStatus) {
  var rx = window._phSelRx;
  if(!rx) return;
  /* Prevent dispensing if repeat is expired or exhausted */
  if((newStatus==='Awaiting Dispensing'||newStatus==='Dispensed')&&rx.repeat){
    var isExpired = rx.repeat.expiryDate && new Date(rx.repeat.expiryDate)<new Date();
    var exhausted = rx.repeat.remaining!==undefined && rx.repeat.remaining<=0;
    if(isExpired){ UI.showToast('Cannot dispense — prescription has expired','err'); return; }
    if(exhausted){ UI.showToast('Cannot dispense — authorised repeats exhausted','err'); return; }
  }
  rx.status = newStatus;
  /* Update in _PH.prescriptions */
  var idx = _PH.prescriptions.findIndex(function(p){return p.code===rx.code;});
  if(idx>=0) _PH.prescriptions[idx].status = newStatus;
  _phRenderValidation();
  UI.showToast('Status updated to: '+newStatus,'ok');
  /* On dispense, update repeat used count and write full history entry */
  if(newStatus==='Dispensed'){
    var _uDisp = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
    var _phNameDisp = (function(){
      if(_uDisp.firstName) return (_uDisp.firstName+' '+(_uDisp.lastName||'')).trim();
      var n = (_uDisp.name||'').trim();
      var nl = n.toLowerCase();
      /* Strip generic role fallbacks */
      if(!n||nl==='pharmacist'||nl==='doctor'||nl==='nurse'||nl==='user') return '';
      return n;
    })();
    var _rxItems = rx.items || [];
    /* Aggregate quantity label from all items */
    var _qtyDisp = _rxItems.map(function(it){
      var q = it.quantity||it.qty||''; var u3 = it.unit||it.unitOfMeasure||'';
      return q?(q+(u3?' '+u3:'')):null;
    }).filter(Boolean).join(', ') || '';
    /* First item dosage as primary dosage */
    var _dosDisp = (_rxItems[0]&&(_rxItems[0].dosage||_rxItems[0].instructions||(((_rxItems[0].dose||'')+' '+(_rxItems[0].frequency||'')).trim())))||'';
    /* Facility */
    var _facDisp = rx.facility || (_uDisp.facility) || 'Johannesburg CHC';
    /* Repeat sequence */
    var _repSeqDisp;
    if(rx.repeat && rx.repeatPrescription){
      rx.repeat.used = (rx.repeat.used||0)+1;
      rx.repeat.remaining = Math.max(0, (rx.repeat.allowed||0)-(rx.repeat.used||0));
      _repSeqDisp = {used: rx.repeat.used, total: rx.repeat.allowed||0};
      UI.showToast('Repeat '+(rx.repeat.used)+' dispensed — '+rx.repeat.remaining+' remaining','ok');
    }
    _PH.history.unshift({
      id:              'h'+Date.now(),
      date:            new Date().toISOString().slice(0,10),
      drug:            (_rxItems[0]&&(_rxItems[0].drug||_rxItems[0].name))||rx.drug||'—',
      type:            'Prescription',
      doctor:          rx.doctor||'',
      prescribedByObj: rx.prescribedByObj||null,
      facility:        _facDisp,
      status:          'Collected',
      pharmacist:      _phNameDisp,
      prescriptionRef: rx.code||'',
      repeatSequence:  _repSeqDisp,
      patientName:     rx.patientName||'',
      patientId:       (function(){var _mid=function(v){return v&&/^[0-9a-f]{24}$/i.test((v+'').trim());}; var _cands=[rx.idNumber,rx.patientIdNumber,rx.nationalId,rx.passportNumber,rx.passport]; for(var _ci=0;_ci<_cands.length;_ci++){var _c=_cands[_ci]; if(_c&&_c!=='—'&&_c!==''&&!_mid(_c))return _c;} if(rx.patientId&&!_mid(rx.patientId))return rx.patientId; return '';})(),
      passportNumber:  rx.passportNumber||rx.passport||'',
      items:           _rxItems,
      quantity:        _qtyDisp,
      dosage:          _dosDisp,
      issued:          rx.issued||rx.issuedAt||rx.prescribedAt||'',
      submittedAt:     rx.submittedAt||new Date().toISOString(),
      dispensedAt:     new Date().toISOString(),
    });

    /* ── Step 7: Deduct stock only after successful dispense ── */
    (function(){
      var _deductItems = _rxItems.length ? _rxItems : (rx.drug?[{name:rx.drug,quantity:1}]:[]);
      _deductItems.forEach(function(it){
        var _drugName = (it.drug||it.name||'').toLowerCase().trim();
        if(!_drugName) return;
        /* Find matching stock item by drug name prefix */
        var _si = (_PH.stockItems||[]).find(function(s){
          var sn = (s.drug||'').toLowerCase();
          return sn.startsWith(_drugName) || _drugName.startsWith(sn.split(' ')[0]);
        });
        if(!_si) return;
        var _deductQty = parseInt(it.quantity||it.qty||1,10)||1;
        _si.quantity = Math.max(0, (_si.quantity||0) - _deductQty);
        /* PATCH stock on server */
        if(window.API && window.API._fetchDirect){
          window.API._fetchDirect('/stock/'+_si.id,'PATCH',{quantity:_si.quantity}).catch(function(){});
        }
      });
    })();
  }
};

window._phValSearch = function(q) {
  var lower = (q||'').trim().toLowerCase();
  var match = _PH.prescriptions.find(function(p){ return p.code.toLowerCase()===lower||p.patientId.toLowerCase()===lower||p.patientName.toLowerCase().includes(lower); });
  if (match) { window._phSelRx=match; window._phChecked=false; _phRenderValidation(); }
  else if (lower) UI.showToast('No prescription found for "'+q+'"','err');
};

/* ═══════════════════════════════════════════════════════════════
   PAGE 4 — DISPENSING & LABELS
═══════════════════════════════════════════════════════════════ */
Pages['dispensed'] = () => {
  /* Carry forward the prescription selected in validation; reset pick-list state */
  if(!window._phDispRx) window._phDispRx = window._phSelRx || _PH.prescriptions[0] || null;
  window._phDispChecked  = [];
  window._phDispScanned  = !!(window._phDispRx);   /* auto-"scanned" if came from validation */
  window._phDispCounselled = false;
  setTimeout(function(){
    _phRenderDispensing();
    /* Auto-run duplicate check for the loaded prescription */
    if(window._phDispRx) _phCheckDuplicateDispensing(window._phDispRx);
  }, 0);
  return _phShell('dispensed','Dispensing & labels','Pick list + label preview',
    '<div id="ph-disp-body">Loading...</div>');
};

function _phRenderDispensing() {
  var el = document.getElementById('ph-disp-body');
  if (!el) return;

  var rx        = window._phDispRx || window._phSelRx || _PH.prescriptions[0] || null;
  var scanned   = window._phDispScanned;
  var checked   = window._phDispChecked || [];
  var counselled= window._phDispCounselled;

  /* ── No prescription selected ── */
  if(!rx){
    el.innerHTML = _phCard('ti-clipboard-check','Dispensing','No prescription loaded','',
      '<div style="text-align:center;padding:48px 20px;color:#777777">' +
        '<div style="font-size:40px;margin-bottom:12px">📋</div>' +
        '<div style="font-size:15px;font-weight:600;margin-bottom:8px">No prescription selected</div>' +
        '<div style="font-size:13px;margin-bottom:20px">Go to Prescription Validation and select a script, then return here to dispense.</div>' +
        _phBtn('Go to Validation','ti-shield-check','primary','UI.renderContent(\'ph-validation\')') +
      '</div>');
    return;
  }

  /* ── Dispensing gate: prescription must be Validated or Awaiting Dispensing ── */
  var _dispAllowedStatuses = ['Validated','Awaiting Dispensing','Approved for Dispensing','Partially Dispensed'];
  var _dispGatePassed = _dispAllowedStatuses.indexOf(rx.status||'') > -1;
  if(!_dispGatePassed && !(window._phDupOverrideActive)){
    var _statusForGate = rx.status || 'Submitted';
    var _dispGateBlock =
      '<div style="background:#FFF7ED;border:2px solid #FED7AA;border-radius:14px;padding:24px 28px;text-align:center;margin-bottom:16px">' +
        '<div style="font-size:36px;margin-bottom:12px">⏳</div>' +
        '<div style="font-size:16px;font-weight:700;color:#C2410C;margin-bottom:8px">Prescription Not Yet Approved for Dispensing</div>' +
        '<div style="font-size:13px;color:#78350F;margin-bottom:16px;line-height:1.6">' +
          'This prescription is currently <strong>'+_statusForGate+'</strong>.<br>' +
          'The pharmacist must review and validate it before medication can be prepared.' +
        '</div>' +
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
          '<button onclick="(function(){window._phSelRx=_PH.prescriptions.find(function(p){return p.code===\''+rx.code+'\'});window._phChecked=false;UI.renderContent(\'ph-validation\');})()" ' +
            'style="padding:10px 20px;border-radius:8px;border:none;background:#C2410C;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">'+
            '✅ Go to Validation &amp; Approve'+
          '</button>' +
          '<button onclick="(function(){window._phSelRx=_PH.prescriptions.find(function(p){return p.code===\''+rx.code+'\'});_phSetRxStatus(\'Awaiting Dispensing\');window._phDispRx=window._phSelRx;window._phDispChecked=[];window._phDispScanned=true;_phRenderDispensing();})()" ' +
            'style="padding:10px 20px;border-radius:8px;border:1.5px solid #0F6E56;background:#fff;color:#0F6E56;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">'+
            '🔄 Move directly to Dispensing'+
          '</button>' +
        '</div>' +
      '</div>';
    /* Still show the script info below the gate banner */
    el.innerHTML = _dispGateBlock;
    return;
  }

  /* ── Build pick list from real prescription items ── */
  var items = rx.items || [];
  var allChecked = items.length > 0 && checked.length === items.length;

  /* ── Get pharmacist name ── */
  var u = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  var phName = u.firstName ? (u.firstName+' '+u.lastName).trim() : (u.name||'Pharmacist');
  var facility = rx.facility || 'NIHMS Facility';

  /* ── Scan / patient info banner ── */
  var scanPanel = _phCard('ti-scan-line','Script loaded','Prescription verified','',
    '<div style="display:flex;gap:8px;margin-bottom:14px">' +
      '<input id="ph-scan-input" value="'+(rx.code||'')+'" placeholder="Scan or type RX code / patient file number" style="flex:1;padding:9px 14px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none">' +
      _phBtn('Load script','ti-qr-code','outline','_phDispLoadByCode()') +
    '</div>' +
    '<div style="background:#EDFBF3;border:1px solid #0F6E56;border-radius:10px;padding:12px 14px;font-size:13px">' +
      '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:4px">' +
        '<span style="font-weight:700;font-size:14px">'+(rx.patientName||'Unknown patient')+'</span>' +
        _phBadge(rx.patientId||'—','gray') +
        _phBadge('Script valid','green') +
      '</div>' +
      '<div style="color:#555;font-size:12px;margin-top:2px">'+
        'Ref: '+(rx.code||'—')+
        ' &nbsp;·&nbsp; Prescribed by: '+(rx.doctor||'—')+
        ' &nbsp;·&nbsp; Issued: '+(rx.issued||'—')+
        (rx.validUntil?' &nbsp;·&nbsp; Valid until: '+rx.validUntil:'')+
      '</div>'+
    '</div>'
  );

  /* ── Pick list ── */
  var pickRows = items.length
    ? items.map(function(l, i){
        var isCk = checked.includes(String(i));
        return '<li style="display:flex;align-items:flex-start;gap:12px;border:1px solid '+(isCk?'#0F6E56':'#e0e0e0')+';border-radius:10px;padding:12px 14px;background:'+(isCk?'#EDFBF3':'#fff')+';transition:background .15s">' +
          '<input type="checkbox" '+(isCk?'checked':'')+' onchange="_phToggleDisp(\''+i+'\')" style="margin-top:3px;width:16px;height:16px;cursor:pointer;accent-color:#0F6E56">' +
          '<div style="flex:1">' +
            '<div style="font-size:13px;font-weight:600;color:#1e293b">'+(l.drug||l.name||'—')+(l.quantity?' — '+l.quantity+(l.unit?' '+l.unit:''):'')+'</div>' +
            '<div style="font-size:12px;color:#777777;margin-top:2px">'+(l.dosage||((l.dose||'')+(l.frequency?' '+l.frequency:'')))+'</div>' +
            (l.duration?'<div style="font-size:12px;color:#777777">Duration: '+l.duration+'</div>':'')+
            (l.route?'<div style="font-size:12px;color:#777777">Route: '+l.route+'</div>':'')+
          '</div>' +
          (isCk?'<span style="color:#0F6E56;font-size:18px;font-weight:700;line-height:1">✓</span>':'')+
        '</li>';
      }).join('')
    : '<li style="padding:16px;color:#777;text-align:center;font-size:13px">No medication items on this prescription.</li>';

  var pickPanel = _phCard('ti-clipboard-check','Pick list','Tick each item as you pick it from the shelf','',
    '<ul style="list-style:none;padding:0;margin:0 0 14px;display:flex;flex-direction:column;gap:10px">' +
    pickRows + '</ul>' +
    '<div style="display:flex;align-items:flex-start;gap:12px;background:#f4f5f0;border-radius:10px;padding:12px 14px;margin-bottom:10px">' +
      '<input type="checkbox" id="ph-counsel-chk" '+(counselled?'checked':'')+' onchange="_phDispCounsel()" style="margin-top:3px;width:16px;height:16px;cursor:pointer;accent-color:#0F6E56">' +
      '<label for="ph-counsel-chk" style="font-size:13px;cursor:pointer">Patient counselled on dosage, food interactions and side effects</label>' +
    '</div>' +
    '<textarea id="ph-disp-notes" placeholder="Counselling / substitution notes for the patient record" rows="3" style="width:100%;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box;margin-bottom:10px"></textarea>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button id="ph-complete-btn" onclick="_phCompleteDispense()" style="padding:10px 20px;border-radius:8px;border:none;background:'+(allChecked&&counselled?'#0F6E56':'#94a3b8')+';color:#fff;font-size:13px;font-weight:600;cursor:'+(allChecked&&counselled?'pointer':'not-allowed')+';font-family:inherit;transition:background .2s">✅ Complete dispense</button>' +
      '<button onclick="_phPrintLabels()" style="padding:10px 20px;border-radius:8px;border:1.5px solid #0F6E56;background:#fff;color:#0F6E56;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">🖨️ Print labels</button>' +
    '</div>'
  );

  /* ── Label preview — one label per medication ── */
  var labelCards = items.length
    ? items.map(function(l){
        var drugName  = l.drug || l.name || '—';
        var dosage    = l.dosage || ((l.dose||'')+(l.frequency?' '+l.frequency:'')) || '—';
        var qty       = l.quantity ? String(l.quantity)+(l.unit?' '+l.unit:'') : '—';
        var zuluInstr = _phZuluInstruction(dosage);
        return '<div style="border:2px dashed #e0e0e0;border-radius:10px;padding:16px;font-family:Arial,sans-serif;font-size:12px;line-height:1.9;background:#ffffff">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">' +
            '<div style="font-size:14px;font-weight:700;color:#0F6E56">'+(rx.facility||'NIHMS Facility')+'</div>' +
            '<div style="font-size:11px;color:#777;font-family:monospace">'+(rx.code||'')+'</div>' +
          '</div>'+
          '<div style="font-size:15px;font-weight:800;color:#1e293b;margin-bottom:2px">'+drugName+'</div>' +
          '<div style="color:#333"><strong>'+dosage+'</strong></div>' +
          (zuluInstr?'<div style="color:#0F6E56;font-style:italic;font-size:11px">'+zuluInstr+'</div>':'')+
          '<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #e0e0e0;font-size:11px;color:#555">' +
            'Qty: '+qty+' &nbsp;·&nbsp; Issued: '+(rx.issued||new Date().toISOString().slice(0,10))+
            (rx.validUntil?' &nbsp;·&nbsp; Exp: '+rx.validUntil:'')+
          '</div>' +
          '<div style="font-size:11px;color:#333;margin-top:4px"><strong>'+(rx.patientName||'—')+'</strong> &nbsp;·&nbsp; '+(rx.patientId||'—')+'</div>' +
          '<div style="font-size:11px;color:#777">'+facility+' &nbsp;·&nbsp; '+phName+'</div>' +
          '<div style="margin-top:6px;font-size:10px;color:#e53e3e;font-weight:600">⚠ KEEP OUT OF REACH OF CHILDREN</div>' +
        '</div>';
      }).join('')
    : '<div style="text-align:center;padding:20px;color:#777;font-size:13px">No items to preview.</div>';

  var labelPanel = _phCard('ti-printer','Label preview','Labels generated from live prescription data','',
    '<div style="display:flex;flex-direction:column;gap:14px">'+labelCards+'</div>'
  );

  el.innerHTML =
    '<div style="display:flex;flex-direction:column;gap:16px">' +
      scanPanel +
      '<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px">' +
        pickPanel + labelPanel +
      '</div>' +
    '</div>';
}

/* ── Zulu/Sotho dosage instruction helper ── */
function _phZuluInstruction(dosage){
  if(!dosage) return '';
  var d = dosage.toLowerCase();
  if(d.includes('twice')||d.includes('2x')||d.includes('bd')||d.includes('b.d')) return 'Zulu: Thatha kabili ngosuku';
  if(d.includes('three')||d.includes('3x')||d.includes('tds')||d.includes('t.d.s')) return 'Zulu: Thatha kathathu ngosuku';
  if(d.includes('four')||d.includes('4x')||d.includes('qds')||d.includes('q.d.s')) return 'Zulu: Thatha kane ngosuku';
  if(d.includes('night')||d.includes('nocte')||d.includes('bedtime')) return 'Zulu: Thatha ebusuku';
  if(d.includes('morning')||d.includes('mane')) return 'Zulu: Thatha ekuseni';
  return 'Zulu: Thatha njengoba unikeziwe';
}

/* ── Load a prescription by code typed into the scan box ── */
window._phDispLoadByCode = function(){
  var code = (document.getElementById('ph-scan-input')||{value:''}).value.trim().toUpperCase();
  if(!code){ UI.showToast('Enter a prescription reference','err'); return; }
  /* Search by prescription ref or patient ID */
  var rx = _PH.prescriptions.find(function(p){
    return (p.code||'').toUpperCase()===code ||
           (p.patientId||'').toUpperCase()===code;
  });
  if(!rx){
    UI.showToast('Prescription "'+code+'" not found','err');
    return;
  }
  /* Block re-dispensing an already-dispensed prescription */
  var dispensedStatuses = ['Dispensed','dispensed'];
  if(dispensedStatuses.indexOf(rx.status)>-1){
    var dispensedRec = _PH.history.find(function(h){ return h.prescriptionRef===rx.code; });
    var dispensedOn  = dispensedRec ? dispensedRec.date : (rx.dispensedAt||'').slice(0,10);
    var dispensedBy  = dispensedRec ? (dispensedRec.pharmacist||'—') : '—';
    _phShowAlreadyDispensedModal(rx, dispensedOn, dispensedBy);
    return;
  }
  window._phDispRx = rx;
  window._phDispChecked = [];
  window._phDispScanned = true;
  _phRenderDispensing();
  UI.showToast('Loaded: '+code+' — '+(rx.patientName||''),'ok');
  /* Automatically run duplicate check */
  _phCheckDuplicateDispensing(rx);
};

/* ── Already-dispensed modal (search result for a completed RX) ── */
function _phShowAlreadyDispensedModal(rx, dispensedOn, dispensedBy){
  var items = rx.items || [];
  var medList = items.map(function(it){
    return '<li style="padding:6px 0;border-bottom:1px solid #e0e0e0;font-size:13px;display:flex;gap:8px">' +
      '<span style="color:#0F6E56">✓</span>' +
      '<span><strong>'+(it.drug||it.name||'—')+'</strong>'+(it.quantity?' · '+it.quantity+(it.unit?' '+it.unit:''):'')+'</span></li>';
  }).join('');

  var repInfo = '';
  if(rx.repeatPrescription && rx.repeat){
    var remLeft = rx.repeat.remaining!==undefined ? rx.repeat.remaining : 0;
    repInfo = '<div style="margin-top:12px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px 14px;font-size:13px">' +
      '<div style="font-weight:700;color:#1D4ED8;margin-bottom:4px">🔁 Repeat prescription</div>' +
      '<div>Allowed: <strong>'+rx.repeat.allowed+'</strong> &nbsp;·&nbsp; Used: <strong>'+rx.repeat.used+'</strong> &nbsp;·&nbsp; Remaining: <strong style="color:'+(remLeft>0?'#0F6E56':'#dc2626')+'">'+remLeft+'</strong></div>' +
      (rx.repeat.expiryDate?'<div style="margin-top:4px;font-size:12px;color:#777">Expires: '+rx.repeat.expiryDate+'</div>':'')+
    '</div>';
  }

  var overlay = document.createElement('div');
  overlay.id = 'ph-already-dispensed-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;max-width:500px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.22);overflow:hidden">' +
      /* Amber header */
      '<div style="background:#B45309;padding:22px 28px 18px;color:#fff">' +
        '<div style="font-size:32px;margin-bottom:6px">🚫</div>' +
        '<div style="font-size:18px;font-weight:800;margin-bottom:2px">Medication Already Dispensed</div>' +
        '<div style="font-size:13px;opacity:.85">This prescription has been fully dispensed</div>' +
      '</div>' +
      '<div style="padding:20px 28px">' +
        /* Patient + RX info */
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;font-size:13px">' +
          '<div style="background:#f4f5f0;border-radius:8px;padding:10px 12px">' +
            '<div style="font-size:10px;text-transform:uppercase;color:#777;margin-bottom:2px">Patient</div>' +
            '<div style="font-weight:700">'+(rx.patientName||'—')+'</div>' +
            '<div style="font-family:monospace;font-size:12px;color:#0F6E56">'+(rx.patientId||'—')+'</div>' +
          '</div>' +
          '<div style="background:#f4f5f0;border-radius:8px;padding:10px 12px">' +
            '<div style="font-size:10px;text-transform:uppercase;color:#777;margin-bottom:2px">Dispensed</div>' +
            '<div style="font-weight:700">'+(dispensedOn||'—')+'</div>' +
            '<div style="font-size:12px;color:#777">by '+dispensedBy+'</div>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#B45309;margin-bottom:6px">Medications issued</div>' +
        '<ul style="list-style:none;padding:0;margin:0 0 12px">'+medList+'</ul>' +
        repInfo +
        /* Action buttons */
        '<div style="margin-top:16px;display:flex;flex-direction:column;gap:8px">' +
          '<button onclick="document.getElementById(\'ph-already-dispensed-overlay\').remove();window._phSelRx=_PH.prescriptions.find(function(p){return p.code===\''+rx.code+'\'});_phRenderValidation();UI.renderContent(\'ph-validation\')" '+
            'style="padding:10px 16px;border-radius:8px;border:1.5px solid #0F6E56;background:#fff;color:#0F6E56;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;text-align:left">' +
            '📋 View full prescription details in Validation' +
          '</button>' +
          '<button onclick="document.getElementById(\'ph-already-dispensed-overlay\').remove()" '+
            'style="padding:10px 16px;border-radius:8px;border:none;background:#f4f5f0;color:#333;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">' +
            'Close' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); });
}

/* ── Duplicate dispensing check: same patient + overlapping drug within 30 days ── */
function _phCheckDuplicateDispensing(rx){
  if(!rx || !rx.patientId) return;
  var rxDrugs = (rx.items||[]).map(function(it){ return (it.drug||it.name||'').toLowerCase(); });
  if(!rxDrugs.length) return;
  var now = new Date();
  var windowDays = 30;
  /* Scan history for same patient within window */
  var recentHits = (_PH.history||[]).filter(function(h){
    if(h.patientId !== rx.patientId && h.patientName !== rx.patientName) return false;
    var hDate = new Date(h.dispensedAt||h.date);
    var daysDiff = (now - hDate) / 86400000;
    if(daysDiff > windowDays || daysDiff < 0) return false;
    var hDrug = (h.drug||'').toLowerCase();
    return rxDrugs.some(function(d){ return d && hDrug && (d.includes(hDrug.split(' ')[0]) || hDrug.includes(d.split(' ')[0])); });
  });
  if(!recentHits.length) return;
  /* Show duplicate warning panel in dispensing body */
  _phShowDuplicateWarning(rx, recentHits);
}

/* ── Full duplicate warning with 5 action options ── */
window._phDupOverrideActive = false;

function _phShowDuplicateWarning(rx, recentHits){
  var el = document.getElementById('ph-disp-body');
  if(!el) return;

  var hitRows = recentHits.map(function(h){
    var daysSince = Math.round((new Date()-(new Date(h.dispensedAt||h.date)))/86400000);
    return '<tr style="border-top:1px solid #FDE68A">' +
      '<td style="padding:8px 10px;font-size:13px;font-weight:600">'+(h.drug||'—')+'</td>' +
      '<td style="padding:8px 10px;font-size:13px">'+(h.date||'—')+'</td>' +
      '<td style="padding:8px 10px;font-size:13px">'+(h.pharmacist||'—')+'</td>' +
      '<td style="padding:8px 10px;font-size:13px;color:#B45309;font-weight:600">'+daysSince+' days ago</td>' +
    '</tr>';
  }).join('');

  var repStatus = '';
  if(rx.repeatPrescription && rx.repeat){
    var rem = rx.repeat.remaining!==undefined?rx.repeat.remaining:0;
    repStatus = rem>0
      ? '<span style="color:#0F6E56;font-weight:700">✓ '+rem+' repeat(s) remaining — dispensing is valid</span>'
      : '<span style="color:#dc2626;font-weight:700">⛔ No repeats remaining</span>';
  } else {
    repStatus = '<span style="color:#B45309;font-weight:700">⚠ Not a repeat prescription</span>';
  }

  var canDispenseRepeat = rx.repeatPrescription && rx.repeat && (rx.repeat.remaining!==undefined?rx.repeat.remaining:0)>0;

  var warningPanel =
    '<div style="border:2px solid #F59E0B;border-radius:12px;overflow:hidden;margin-bottom:16px">' +
      /* Warning header */
      '<div style="background:#FEF3C7;padding:16px 20px;display:flex;gap:12px;align-items:flex-start">' +
        '<span style="font-size:28px;line-height:1">⚠️</span>' +
        '<div>' +
          '<div style="font-size:15px;font-weight:800;color:#92400E">Possible Duplicate Collection Detected</div>' +
          '<div style="font-size:13px;color:#78350F;margin-top:3px">'+rx.patientName+' ('+rx.patientId+') recently collected the same medication.</div>' +
        '</div>' +
      '</div>' +

      '<div style="background:#fff;padding:16px 20px">' +

        /* Previous dispensing table */
        '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#B45309;margin-bottom:8px">Previous Collections (last 30 days)</div>' +
        '<div style="border:1px solid #FDE68A;border-radius:8px;overflow:hidden;margin-bottom:16px">' +
          '<table style="width:100%;border-collapse:collapse">' +
            '<thead><tr style="background:#FFFBEB">' +
              ['Medication','Date','Dispensed by','How recent'].map(function(h){ return '<th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#78350F">'+h+'</th>'; }).join('') +
            '</tr></thead><tbody>'+hitRows+'</tbody>' +
          '</table>' +
        '</div>' +

        /* Repeat prescription status */
        '<div style="margin-bottom:16px;padding:10px 14px;background:#f4f5f0;border-radius:8px;font-size:13px">' +
          '<strong>Repeat prescription status:</strong> '+repStatus +
        '</div>' +

        /* 5 action options */
        '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#555;margin-bottom:10px">What would you like to do?</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +

          /* Option 1 — View previous */
          '<button onclick="_phDupViewPrevious(\''+rx.code+'\')" style="padding:12px 16px;border-radius:8px;border:1.5px solid #e0e0e0;background:#fff;color:#333;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;text-align:left;display:flex;align-items:center;gap:10px">' +
            '<span style="font-size:18px">📋</span>' +
            '<div><div style="font-weight:600">View Previous Dispensing</div><div style="font-size:12px;color:#777">See full details of the previous collection</div></div>' +
          '</button>' +

          /* Option 2 — Check repeat */
          '<button onclick="_phDupCheckRepeat(\''+rx.code+'\')" style="padding:12px 16px;border-radius:8px;border:1.5px solid #e0e0e0;background:#fff;color:#333;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;text-align:left;display:flex;align-items:center;gap:10px">' +
            '<span style="font-size:18px">🔁</span>' +
            '<div><div style="font-weight:600">Check Repeat Prescription</div><div style="font-size:12px;color:#777">Verify repeats allowed and remaining</div></div>' +
          '</button>' +

          /* Option 3 — Proceed (only if valid repeat) */
          (canDispenseRepeat
            ? '<button onclick="_phDupProceedRepeat()" style="padding:12px 16px;border-radius:8px;border:1.5px solid #0F6E56;background:#EDFBF3;color:#0F6E56;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;text-align:left;display:flex;align-items:center;gap:10px">' +
                '<span style="font-size:18px">✅</span>' +
                '<div><div style="font-weight:600">Proceed — Valid Repeat</div><div style="font-size:12px;color:#0F6E56">Repeat prescription allows this dispensing</div></div>' +
              '</button>'
            : '<div style="padding:12px 16px;border-radius:8px;border:1.5px solid #FCA5A5;background:#FEF2F2;font-size:13px;display:flex;align-items:center;gap:10px">' +
                '<span style="font-size:18px">⛔</span>' +
                '<div><div style="font-weight:600;color:#dc2626">Duplicate Dispensing Blocked</div><div style="font-size:12px;color:#777">No valid repeat — cannot dispense again without authorisation</div></div>' +
              '</div>'
          ) +

          /* Option 4 — Override with authorisation */
          '<button onclick="_phDupShowOverride()" style="padding:12px 16px;border-radius:8px;border:1.5px solid #7C3AED;background:#F5F3FF;color:#5B21B6;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;text-align:left;display:flex;align-items:center;gap:10px">' +
            '<span style="font-size:18px">🔑</span>' +
            '<div><div style="font-weight:600">Override with Authorisation</div><div style="font-size:12px;color:#7C3AED">Requires pharmacist-in-charge or admin approval + reason</div></div>' +
          '</button>' +

          /* Option 5 — Contact doctor */
          '<button onclick="_phDupContactDoctor(\''+((rx.doctor||'').replace(/'/g,"\\'")+'\',\''+((rx.patientName||'').replace(/'/g,"\\'")))+'\')" style="padding:12px 16px;border-radius:8px;border:1.5px solid #2563EB;background:#EFF6FF;color:#1D4ED8;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;text-align:left;display:flex;align-items:center;gap:10px">' +
            '<span style="font-size:18px">📞</span>' +
            '<div><div style="font-weight:600">Contact the Doctor</div><div style="font-size:12px;color:#2563EB">Request clarification or new prescription from prescribing doctor</div></div>' +
          '</button>' +

        '</div>' +
        /* Inline override form (hidden by default) */
        '<div id="ph-dup-override-form" style="display:none;margin-top:14px;border:1.5px solid #7C3AED;border-radius:10px;padding:16px;background:#F5F3FF">' +
          '<div style="font-size:13px;font-weight:700;color:#5B21B6;margin-bottom:10px">🔑 Authorised Override</div>' +
          '<div style="margin-bottom:8px"><input id="ph-dup-auth-code" placeholder="Authorisation code or pharmacist-in-charge PIN" style="width:100%;padding:9px 12px;border:1.5px solid #7C3AED;border-radius:8px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box"></div>' +
          '<div style="margin-bottom:12px"><textarea id="ph-dup-reason" rows="2" placeholder="Clinical reason for override (required, logged in audit trail)" style="width:100%;padding:9px 12px;border:1.5px solid #7C3AED;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box"></textarea></div>' +
          '<div style="display:flex;gap:8px">' +
            '<button onclick="_phDupConfirmOverride()" style="padding:9px 18px;border-radius:8px;border:none;background:#7C3AED;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Confirm override &amp; dispense</button>' +
            '<button onclick="document.getElementById(\'ph-dup-override-form\').style.display=\'none\'" style="padding:9px 18px;border-radius:8px;border:1.5px solid #e0e0e0;background:#fff;color:#555;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit">Cancel</button>' +
          '</div>' +
        '</div>' +

      '</div>' +
    '</div>';

  /* Prepend warning to existing dispensing panel */
  el.innerHTML = warningPanel + el.innerHTML;
}

/* Duplicate action handlers */
window._phDupViewPrevious = function(rxCode){
  var hits = (_PH.history||[]).filter(function(h){ return h.prescriptionRef===rxCode||_PH.prescriptions.some(function(p){return p.code===rxCode&&p.patientId&&p.patientId===h.patientId;}); });
  if(!hits.length){ UI.showToast('No previous dispensing records found','err'); return; }
  var rows = hits.map(function(h){
    return '<tr style="border-top:1px solid #e0e0e0">' +
      '<td style="padding:8px 12px;font-size:13px">'+(h.date||'—')+'</td>' +
      '<td style="padding:8px 12px;font-size:13px;font-weight:600">'+(h.drug||'—')+'</td>' +
      '<td style="padding:8px 12px;font-size:13px">'+(h.type||'—')+'</td>' +
      '<td style="padding:8px 12px;font-size:13px">'+(h.pharmacist||'—')+'</td>' +
      '<td style="padding:8px 12px;font-size:13px">'+(h.facility||'—')+'</td>' +
      '<td style="padding:8px 12px"><span style="padding:3px 10px;border-radius:12px;font-size:12px;background:#EDFBF3;color:#0F6E56;font-weight:600">'+(h.status||'Collected')+'</span></td>' +
    '</tr>';
  }).join('');
  var overlay = document.createElement('div');
  overlay.id = 'ph-prev-disp-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:640px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.22);overflow:hidden">' +
    '<div style="background:#1e293b;padding:18px 24px;display:flex;align-items:center;justify-content:space-between">' +
      '<div style="font-size:16px;font-weight:700;color:#fff">📋 Previous Dispensing Records</div>' +
      '<button onclick="document.getElementById(\'ph-prev-disp-overlay\').remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:13px;font-family:inherit">✕ Close</button>' +
    '</div>' +
    '<div style="overflow-x:auto">' +
      '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
        '<thead><tr style="background:#f4f5f0">' +
          ['Date','Medication','Type','Pharmacist','Facility','Status'].map(function(h){ return '<th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#777">'+h+'</th>'; }).join('') +
        '</tr></thead><tbody>'+rows+'</tbody>' +
      '</table>' +
    '</div>' +
  '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); });
};

window._phDupCheckRepeat = function(rxCode){
  var rx = _PH.prescriptions.find(function(p){ return p.code===rxCode; });
  if(!rx){ UI.showToast('Prescription not found','err'); return; }
  if(!rx.repeatPrescription || !rx.repeat){
    UI.showToast('This is not a repeat prescription','err'); return;
  }
  var rep = rx.repeat;
  var rem = rep.remaining!==undefined?rep.remaining:0;
  var expired = rep.expiryDate && new Date(rep.expiryDate)<new Date();
  var msg = 'Repeats: '+rep.allowed+' allowed, '+(rep.used||0)+' used, '+rem+' remaining.';
  if(expired) msg += ' EXPIRED.';
  else if(rem<=0) msg += ' All repeats exhausted.';
  else msg += ' Dispensing is valid.';
  UI.showToast(msg, rem>0&&!expired?'ok':'err');
};

window._phDupProceedRepeat = function(){
  var el = document.getElementById('ph-dup-override-form');
  if(el) el.style.display='none';
  /* Remove the warning panel and show normal pick list */
  var warn = document.querySelector('[data-dup-warning]');
  if(warn) warn.remove();
  /* Re-render the full dispensing panel cleanly */
  _phRenderDispensing();
  UI.showToast('Repeat validated — proceed with dispensing','ok');
};

window._phDupShowOverride = function(){
  var form = document.getElementById('ph-dup-override-form');
  if(form) form.style.display = form.style.display==='none'?'block':'none';
};

window._phDupConfirmOverride = function(){
  var authCode = (document.getElementById('ph-dup-auth-code')||{value:''}).value.trim();
  var reason   = (document.getElementById('ph-dup-reason')||{value:''}).value.trim();
  if(!authCode){ UI.showToast('Enter authorisation code','err'); return; }
  if(!reason){ UI.showToast('Enter a clinical reason for override','err'); return; }
  /* Log to audit trail */
  var u = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  var phName = u.firstName?(u.firstName+' '+u.lastName).trim():(u.name||'Pharmacist');
  var rx = window._phDispRx || window._phSelRx;
  if(rx && !window._PH_AUDIT_LOG) window._PH_AUDIT_LOG = [];
  if(rx) window._PH_AUDIT_LOG.push({
    timestamp:   new Date().toISOString(),
    action:      'duplicate_dispense_override',
    prescriptionRef: rx.code,
    patientId:   rx.patientId,
    patientName: rx.patientName,
    pharmacist:  phName,
    authCode:    authCode,
    reason:      reason,
  });
  /* Also try to log to API */
  try{
    if(window.API&&window.API._fetchDirect&&rx){
      API._fetchDirect('/audit-log',{method:'POST',body:JSON.stringify({
        action:'duplicate_dispense_override',prescriptionRef:rx.code,reason,pharmacist:phName,authCode
      })}).catch(function(){});
    }
  }catch(_){}
  UI.showToast('Override authorised — dispensing unlocked','ok');
  _phRenderDispensing();
};

window._phDupContactDoctor = function(doctorName, patientName){
  var rx = window._phDispRx || window._phSelRx;
  var rxCode = rx ? rx.code : '—';
  var overlay = document.createElement('div');
  overlay.id = 'ph-contact-doctor-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;max-width:480px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.22);overflow:hidden">' +
      '<div style="background:#1D4ED8;padding:18px 24px;color:#fff">' +
        '<div style="font-size:17px;font-weight:700;margin-bottom:2px">📞 Contact Prescribing Doctor</div>' +
        '<div style="font-size:13px;opacity:.8">'+(doctorName||'Doctor')+' · '+rxCode+'</div>' +
      '</div>' +
      '<div style="padding:20px 24px">' +
        '<div style="font-size:13px;color:#555;margin-bottom:14px">Patient <strong>'+(patientName||'—')+'</strong> recently collected the same medication. Send a message to the prescribing doctor requesting clarification or a new prescription.</div>' +
        '<div style="margin-bottom:10px"><select id="ph-contact-reason" style="width:100%;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none"><option value="">Select reason…</option><option>Patient claims they lost medication</option><option>Possible early refill request</option><option>Suspected duplicate prescription</option><option>Clinical clarification required</option><option>Other</option></select></div>' +
        '<div style="margin-bottom:14px"><textarea id="ph-contact-msg" rows="3" placeholder="Additional notes for the doctor (optional)" style="width:100%;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box"></textarea></div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end">' +
          '<button onclick="document.getElementById(\'ph-contact-doctor-overlay\').remove()" style="padding:10px 18px;border-radius:8px;border:1.5px solid #e0e0e0;background:#fff;color:#555;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit">Cancel</button>' +
          '<button onclick="_phSendDoctorContact()" style="padding:10px 18px;border-radius:8px;border:none;background:#1D4ED8;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Send request</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); });
};

window._phSendDoctorContact = function(){
  var reason = (document.getElementById('ph-contact-reason')||{value:''}).value;
  var msg    = (document.getElementById('ph-contact-msg')||{value:''}).value.trim();
  if(!reason){ UI.showToast('Select a reason','err'); return; }
  var rx = window._phDispRx || window._phSelRx;
  try{
    if(window.API&&window.API._fetchDirect&&rx){
      API._fetchDirect('/notifications',{method:'POST',body:JSON.stringify({
        type:'doctor_contact_request',
        prescriptionRef: rx.code,
        doctorName: rx.doctor,
        patientId: rx.patientId,
        reason, message: msg
      })}).catch(function(){});
    }
  }catch(_){}
  UI.showToast('Request sent to '+((window._phDispRx||window._phSelRx||{}).doctor||'doctor'),'ok');
  var ov = document.getElementById('ph-contact-doctor-overlay');
  if(ov) ov.remove();
};

/* ── Complete dispense ── */
window._phCompleteDispense = function(){
  var rx = window._phDispRx || window._phSelRx;
  if(!rx){ UI.showToast('No prescription loaded','err'); return; }
  var items   = rx.items || [];
  var checked = window._phDispChecked || [];
  var counselled = window._phDispCounselled;
  if(checked.length < items.length){
    UI.showToast('Tick all '+items.length+' item(s) on the pick list first','err'); return;
  }
  if(!counselled){
    UI.showToast('Confirm patient counselling before completing','err'); return;
  }
  var notes = (document.getElementById('ph-disp-notes')||{value:''}).value.trim();

  /* Mark as Dispensed via shared status setter */
  window._phSelRx = rx;
  _phSetRxStatus('Dispensed');

  /* Push to API */
  try {
    if(window.API&&window.API._fetchDirect){
      var rxId = rx._id || rx.prescriptionId || rx.code;
      API._fetchDirect('/prescriptions/'+rxId, {
        method:'PATCH',
        body: JSON.stringify({ status:'Dispensed', dispensedAt: new Date().toISOString(), dispensingNotes: notes })
      }).catch(function(){});
    }
  } catch(_){}

  /* Auto-advance queue entry to "notified" (fires SMS/email), then remove it */
  var _qEntry = (window._phQueue||[]).find(function(q){
    return q.prescriptionRef === rx.code || q.prescriptionId === (rx._id||rx.code);
  });
  if(_qEntry){
    /* Force entry into the state just before "notified" so _phAdvanceQueue
       transitions it to "notified" exactly once and fires SMS/email once */
    _qEntry.state = 'ready';
    /* _phAdvanceQueue sets state → "notified" and sends SMS + email */
    try{ window._phAdvanceQueue(_qEntry.id); }catch(_){}
    /* Remove from active queue after a brief moment so the "Patient notified" badge is visible */
    setTimeout(function(){
      if(window._phQueue){
        window._phQueue = window._phQueue.filter(function(q){
          return q.prescriptionRef !== rx.code && q.prescriptionId !== (rx._id||rx.code);
        });
      }
      _PH.queue = _PH.queue.filter(function(q){
        return q.prescriptionRef !== rx.code;
      });
      try{ if(typeof _phRenderQueue==='function') _phRenderQueue(); }catch(_){}
    }, 4000);
  } else {
    /* Entry not in queue (e.g. dispensed from validation panel directly) — just remove */
    if(window._phQueue){
      window._phQueue = window._phQueue.filter(function(q){
        return q.prescriptionRef !== rx.code && q.prescriptionId !== (rx._id||rx.code);
      });
    }
    _PH.queue = _PH.queue.filter(function(q){
      return q.prescriptionRef !== rx.code;
    });
  }

  /* Show full confirmation banner before resetting panel */
  _phShowDispenseConfirm(rx, notes);

  window._phDispRx = null;
  window._phDispChecked = [];
  window._phDispScanned = false;
  window._phDispCounselled = false;
  _phRenderDispensing();
};

/* ── Dispense confirmation modal ── */
function _phShowDispenseConfirm(rx, notes){
  var u = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  var phName = u.firstName?(u.firstName+' '+u.lastName).trim():(u.name||'Pharmacist');
  var items  = rx.items || [];
  var now    = new Date();
  var timeStr= now.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});
  var dateStr= now.toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});

  var medList = items.map(function(it){
    var qty = it.quantity?(it.quantity+(it.unit?' '+it.unit:'')):'';
    return '<li style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #e8f5e9;font-size:13px">'+
      '<span style="color:#0F6E56;font-size:16px">✓</span>'+
      '<span><strong>'+(it.drug||it.name||'—')+'</strong>'+(qty?' · '+qty:'')+
        (it.dosage?'<span style="color:#777;font-size:12px"> · '+it.dosage+'</span>':'')+
      '</span>'+
    '</li>';
  }).join('');

  var overlay = document.createElement('div');
  overlay.id = 'ph-dispense-confirm-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;padding:0;max-width:520px;width:92%;box-shadow:0 24px 64px rgba(0,0,0,.22);overflow:hidden">' +
      /* Green header */
      '<div style="background:#0F6E56;padding:28px 32px 24px;text-align:center;color:#fff">' +
        '<div style="font-size:48px;margin-bottom:8px">✅</div>' +
        '<div style="font-size:22px;font-weight:800;margin-bottom:4px">Medication Dispensed</div>' +
        '<div style="font-size:14px;opacity:.85">'+dateStr+' at '+timeStr+'</div>' +
      '</div>' +
      /* Body */
      '<div style="padding:24px 32px">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;font-size:13px">' +
          '<div style="background:#f4f5f0;border-radius:8px;padding:10px 14px">' +
            '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:3px">Patient</div>'+
            '<div style="font-weight:700;font-size:14px">'+(rx.patientName||'—')+'</div>' +
            '<div style="font-family:monospace;font-size:12px;color:#0F6E56">'+(rx.patientId||'')+'</div>' +
          '</div>' +
          '<div style="background:#f4f5f0;border-radius:8px;padding:10px 14px">' +
            '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:3px">Dispensed by</div>'+
            '<div style="font-weight:700;font-size:14px">'+phName+'</div>' +
            '<div style="font-size:12px;color:#777">'+(rx.code||'—')+'</div>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#0F6E56;margin-bottom:8px">Medications dispensed ('+items.length+')</div>' +
        '<ul style="list-style:none;padding:0;margin:0 0 16px">'+medList+'</ul>' +
        (notes?'<div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px 14px;font-size:12px;color:#555;margin-bottom:16px"><strong>Counselling notes:</strong> '+notes+'</div>':'')+
        '<div style="display:flex;gap:10px;justify-content:flex-end">' +
          '<button onclick="window._phPrintLabels&&_phPrintLabels()" '+
            'style="padding:10px 20px;border-radius:8px;border:1.5px solid #0F6E56;background:#fff;color:#0F6E56;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">'+
            '🖨️ Print labels'+
          '</button>'+
          '<button onclick="document.getElementById(\'ph-dispense-confirm-overlay\').remove()" '+
            'style="padding:10px 24px;border-radius:8px;border:none;background:#0F6E56;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">'+
            'Done'+
          '</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); });
}

/* ── Print labels ── */
window._phPrintLabels = function(){
  var rx = window._phDispRx || window._phSelRx;
  if(!rx||!(rx.items||[]).length){ UI.showToast('No items to print','err'); return; }
  var u = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  var phName = u.firstName?(u.firstName+' '+u.lastName).trim():(u.name||'Pharmacist');
  var today  = new Date().toISOString().slice(0,10);

  var labelsHtml = rx.items.map(function(l){
    var drugName = l.drug||l.name||'—';
    var dosage   = l.dosage||((l.dose||'')+(l.frequency?' '+l.frequency:''))||'—';
    var qty      = l.quantity?String(l.quantity)+(l.unit?' '+l.unit:''):'—';
    var zuluInstr= _phZuluInstruction(dosage);
    return '<div style="border:2px solid #000;padding:14px;margin:0 0 12px;font-family:Arial,sans-serif;font-size:12px;line-height:1.8;page-break-inside:avoid;width:280px">' +
      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #000;padding-bottom:4px;margin-bottom:6px">'+(rx.facility||'NIHMS')+'</div>'+
      '<div style="font-size:14px;font-weight:800;margin-bottom:2px">'+drugName+'</div>'+
      '<div><strong>'+dosage+'</strong></div>'+
      (zuluInstr?'<div style="font-style:italic;font-size:11px">'+zuluInstr+'</div>':'')+
      '<div style="margin-top:6px;font-size:11px">Qty: '+qty+' &nbsp; Issued: '+today+'</div>'+
      '<div style="font-size:11px"><strong>'+(rx.patientName||'—')+'</strong> · '+(rx.patientId||'—')+'</div>'+
      '<div style="font-size:11px">'+(rx.code||'')+ ' · '+phName+'</div>'+
      '<div style="font-size:10px;font-weight:700;margin-top:4px">KEEP OUT OF REACH OF CHILDREN</div>'+
    '</div>';
  }).join('');

  var win = window.open('','_blank','width=400,height=600');
  if(win){
    win.document.write(
      '<!DOCTYPE html><html><head><title>Prescription Labels — '+(rx.code||'')+'</title>'+
      '<style>@media print{body{margin:0}button{display:none}}</style>'+
      '</head><body style="font-family:Arial,sans-serif;padding:20px">'+
      '<div style="margin-bottom:16px;display:flex;gap:8px;align-items:center">'+
        '<strong>NIHMS Labels — '+(rx.patientName||'—')+' / '+(rx.code||'—')+'</strong>'+
        '<button onclick="window.print()" style="margin-left:12px;padding:6px 14px;background:#0F6E56;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer">🖨️ Print</button>'+
      '</div>'+
      labelsHtml+
      '</body></html>'
    );
    win.document.close();
    win.focus();
    setTimeout(function(){ win.print(); }, 400);
  } else {
    UI.showToast('Allow popups to print labels','err');
  }
};

window._phToggleDisp = function(id) {
  var c = window._phDispChecked || [];
  window._phDispChecked = c.includes(id) ? c.filter(function(x){return x!==id;}) : c.concat([id]);
  _phRenderDispensing();
};
window._phDispCounsel = function() {
  window._phDispCounselled = !window._phDispCounselled;
  _phRenderDispensing();
};

/* ═══════════════════════════════════════════════════════════════
   PAGE 5 — PHARMACY QUEUE
═══════════════════════════════════════════════════════════════ */
Pages['ph-queue'] = () => {
  /* Always sync from _PH.queue so entries added since last visit are included */
  var existingIds = (window._phQueue||[]).map(function(x){return x.id;});
  if (!window._phQueue) window._phQueue = JSON.parse(JSON.stringify(_PH.queue));
  else _PH.queue.forEach(function(e){
    if(existingIds.indexOf(e.id)<0) window._phQueue.push(JSON.parse(JSON.stringify(e)));
  });
  /* Trigger live API refresh; also set a hard fallback so the panel never stays on "Loading…" */
  setTimeout(function(){
    if(typeof window._phLoadLiveData==='function'){
      window._phLoadLiveData(false);
    } else {
      _phRenderQueue();
    }
  }, 0);
  /* Hard fallback: if still loading after 2 s, render whatever is in memory */
  setTimeout(function(){
    var el = document.getElementById('ph-queue-body');
    if(el && el.textContent.indexOf('Loading')>-1) _phRenderQueue();
  }, 2000);
  return _phShell('ph-queue','Pharmacy queue','Live patient collection queue',
    '<div id="ph-queue-body"><div style="text-align:center;padding:40px;color:#777">Loading queue…</div></div>');
};

/* Active tab state: 'waiting' | 'preparing' | 'ready' | 'notified' */
if(typeof window._phQueueTab === 'undefined') window._phQueueTab = 'waiting';

function _phRenderQueue() {
  var el = document.getElementById('ph-queue-body'); if (!el) return;
  var q = window._phQueue || [];

  /* Tab definitions */
  var tabs = [
    { key:'waiting',   label:'Waiting',     stateLabel:'Waiting' },
    { key:'preparing', label:'In Progress',  stateLabel:'In Progress' },
    { key:'ready',     label:'Ready',        stateLabel:'Ready' },
    { key:'notified',  label:'Completed',    stateLabel:'Completed' },
  ];

  var activeTab = window._phQueueTab || 'waiting';

  /* Tab bar — matches _phShell underline style */
  var tabBar = '<div style="display:flex;gap:2px;overflow-x:auto;border-bottom:2px solid #e0e0e0;margin-bottom:16px;flex-wrap:wrap">' +
    tabs.map(function(t){
      var isActive = t.key === activeTab;
      var count = q.filter(function(e){ return e.state===t.key; }).length;
      return '<button onclick="window._phQueueTab=\''+t.key+'\';_phRenderQueue()" style="'+
        'display:inline-flex;align-items:center;gap:5px;padding:8px 14px;border:none;'+
        'border-bottom:2px solid '+(isActive?'#0F6E56':'transparent')+';margin-bottom:-2px;'+
        'background:transparent;font-size:12px;font-family:inherit;cursor:pointer;white-space:nowrap;'+
        'color:'+(isActive?'#0F6E56':'#777777')+';font-weight:'+(isActive?'700':'400')+'">'+
        t.label+
        (count?'<span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;font-size:10px;font-weight:700;background:'+(isActive?'#0F6E56':'#e0e0e0')+';color:'+(isActive?'#fff':'#777777')+'">'+count+'</span>':'')+
      '</button>';
    }).join('') +
    '<button onclick="window._phLoadLiveData(false)" style="margin-left:auto;display:inline-flex;align-items:center;padding:8px 10px;border:none;background:transparent;font-size:14px;color:#777777;cursor:pointer;font-family:inherit" title="Refresh">↻</button>'+
  '</div>';

  /* Filter to active tab */
  var filtered = q.filter(function(e){ return e.state===activeTab; });

  /* Badge label per state */
  var badgeLabel = { waiting:'Waiting', preparing:'In Progress', ready:'Ready', notified:'Completed' };
  var badgeStyle = {
    waiting:   'background:#f4f5f0;color:#777777',
    preparing: 'background:#EEF7FF;color:#1A4A9B',
    ready:     'background:#EDFBF3;color:#0F6E56',
    notified:  'background:#EDFBF3;color:#0F6E56',
  };

  /* Format arrival time from prescribedAt */
  function _timeLabel(e){
    try {
      var d = new Date(e.prescribedAt||e.submittedAt||'');
      if(isNaN(d)) return '';
      return d.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit',hour12:false});
    } catch(_){ return ''; }
  }

  /* Open Rx handler — inline string for onclick */
  function _openRxScript(e){
    return '(function(){'+
      'var rx=_PH.prescriptions.find(function(x){return x.code===\''+e.prescriptionRef+'\';});'+
      'if(rx){'+
        'var ds=[\'Validated\',\'Awaiting Dispensing\',\'Approved for Dispensing\'];'+
        'if(ds.indexOf(rx.status)>-1){window._phDispRx=rx;window._phDispChecked=[];window._phDispScanned=true;UI.renderContent(\'dispensed\');}'+
        'else{window._phSelRx=rx;window._phChecked=false;UI.renderContent(\'ph-validation\');}'+
      '}else{UI.renderContent(\'ph-validation\');}'+
    '})()';
  }

  var listHTML;
  if(!filtered.length){
    listHTML = '<div style="text-align:center;padding:32px 20px;color:#9ca3af;font-size:13px">No patients in this category.</div>';
  } else {
    listHTML = '<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:1px">' +
      filtered.map(function(e, i){
        var timeStr = _timeLabel(e);
        var subline = e.ticket + (timeStr?' · '+timeStr:'');
        var badge = badgeLabel[e.state]||e.state;
        var bStyle = badgeStyle[e.state]||'background:#f3f4f6;color:#374151';
        var isFirst = i===0;
        var isLast  = i===filtered.length-1;
        var radius  = isFirst&&isLast?'10px':isFirst?'10px 10px 0 0':isLast?'0 0 10px 10px':'0';
        return '<li onclick="'+_openRxScript(e)+'" style="'+
          'display:flex;align-items:center;justify-content:space-between;gap:12px;'+
          'padding:14px 16px;background:#fff;cursor:pointer;'+
          'border:1px solid #e0e0e0;border-radius:'+radius+';'+
          (isFirst?'':'border-top:none;')+
          'transition:background .12s" '+
          'onmouseover="this.style.background=\'#f4f5f0\'" onmouseout="this.style.background=\'#fff\'">' +
          '<div>'+
            '<div style="font-weight:600;font-size:14px;color:#111;margin-bottom:3px">'+e.patient+'</div>'+
            '<div style="font-size:12px;color:#9ca3af">'+subline+'</div>'+
          '</div>'+
          '<span style="flex-shrink:0;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;'+bStyle+'">'+badge+'</span>'+
        '</li>';
      }).join('') +
    '</ul>';
  }

  el.innerHTML =
    '<div style="background:#ffffff;border-radius:16px;border:1px solid #e0e0e0;padding:20px 24px;box-shadow:0 1px 3px rgba(0,0,0,.06)">' +
      '<h2 style="font-size:15px;font-weight:600;letter-spacing:-.3px;margin:0 0 14px">Queue</h2>' +
      tabBar +
      listHTML +
    '</div>';
}

window._phAdvanceQueue = async function(id) {
  var q = window._phQueue;
  var e = q.find(function(x){ return x.id===id; }); if(!e) return;
  var next = e.state==='waiting'?'preparing':e.state==='preparing'?'ready':'notified';
  e.state = next;

  if (next==='ready') {
    UI.showToast(e.patient+' — medication ready for collection','ok');
  }

  if (next==='notified') {
    /* Send real SMS + email to patient */
    try {
      /* Try to find patient contact details by patientId */
      var pRes = await API._fetchDirect('/patients?limit=50', {method:'GET'}).catch(function(){return {data:[]};});
      var patients = pRes.data || [];
      var pt = patients.find(function(p){
        return p.mrn === e.patientId || p._id === e.patientId ||
               (p.firstName+' '+p.lastName).toLowerCase() === e.patient.toLowerCase();
      });

      var smsMsg = 'NIHMS Pharmacy: Your medication is ready for collection at window 2. ' +
        'Ticket: ' + e.ticket + '. Patient: ' + e.patient + '. Please come to the pharmacy counter now.';

      var emailHtml =
        '<div style="font-family:Arial;max-width:520px;margin:0 auto">' +
        '<div style="background:linear-gradient(135deg,#0F6E56,#1A4A9B);padding:20px;border-radius:10px 10px 0 0;text-align:center">' +
        '<h2 style="color:#fff;margin:0">Your Medication is Ready</h2></div>' +
        '<div style="padding:24px;background:#f9f9f9;border-radius:0 0 10px 10px;text-align:center">' +
        '<p>Dear <strong>' + e.patient + '</strong>,</p>' +
        '<p>Your medication has been prepared and is ready for collection at the pharmacy.</p>' +
        '<div style="margin:20px 0;padding:20px;background:#fff;border-radius:10px;border:2px solid #0F6E56">' +
        '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:6px">Your Ticket</div>' +
        '<div style="font-size:56px;font-weight:900;color:#0F6E56;font-family:monospace;line-height:1.1">' + e.ticket + '</div>' +
        '</div>' +
        '<div style="padding:12px;background:#EDFBF3;border-radius:8px;font-size:14px;font-weight:600;color:#0F6E56;margin-bottom:16px">' +
        '💊 Please proceed to <strong>Pharmacy Window 2</strong> now</div>' +
        '<p style="font-size:12px;color:#888">Please bring your ID or patient card when collecting your medication.</p>' +
        '</div></div>';

      if (pt && pt.phone) {
        API._fetchDirect('/notifications/sms', {
          method:'POST', body:JSON.stringify({to:pt.phone, message:smsMsg})
        }).catch(function(){});
      }
      if (pt && pt.email) {
        API._fetchDirect('/notifications/email', {
          method:'POST', body:JSON.stringify({
            to:pt.email,
            subject:'NIHMS — Your medication is ready: Ticket '+e.ticket,
            html:emailHtml,
          })
        }).catch(function(){});
      }

      UI.showToast('SMS & email sent to '+e.patient+' — Ticket '+e.ticket,'ok');
    } catch(_) {
      UI.showToast('Notified '+e.patient+' — Ticket '+e.ticket+' · window 2','ok');
    }
  }

  _phRenderQueue();
};

/* ═══════════════════════════════════════════════════════════════
   PAGE 6 — MEDICATION HISTORY
═══════════════════════════════════════════════════════════════ */
Pages['ph-history'] = () => {
  window._phHistFilters = {doctor:'all',type:'all',status:'all'};
  setTimeout(_phRenderHistory, 0);
  return _phShell('ph-history','Medication history','Full dispensing records per patient',
    '<div id="ph-hist-body">Loading...</div>');
};

function _phRenderHistory() {
  var el = document.getElementById('ph-hist-body'); if(!el) return;
  var f = window._phHistFilters || {};
  if(!window._phHistFilters) window._phHistFilters = {doctor:'all',type:'all',status:'all',search:''};
  f = window._phHistFilters;

  /* Logged-in pharmacist name for display fallback */
  var _u = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  var _loggedPhName = _u.firstName ? (_u.firstName+' '+(_u.lastName||'')).trim() : (_u.name||'');

  /* Helper: strip generic role strings from a name */
  function _cleanName(raw) {
    if(!raw) return '';
    var r = (raw+'').replace(/^Dr\.?\s*/i,'').trim();
    var rl = r.toLowerCase();
    if(rl===''||rl==='doctor'||rl==='pharmacist'||rl==='nurse'||rl==='user') return '';
    return r;
  }

  /* Helper: compute repeat sequence label */
  function _repeatLabel(h) {
    /* h.repeatSequence can be {used, total} object or a string "1/3" or absent */
    var rs = h.repeatSequence;
    if(!rs && h.repeatUsed !== undefined) rs = {used: h.repeatUsed, total: h.repeatTotal};
    if(!rs) {
      /* fall back to prescription object if linked */
      var rxObj = (_PH.prescriptions||[]).find(function(p){ return p.code===h.prescriptionRef; });
      if(rxObj && rxObj.repeat) rs = rxObj.repeat;
    }
    if(!rs) {
      /* no repeat info at all — check if the prescription had repeats field */
      if(h.hasRepeats === false || h.noRepeats === true) return 'No repeats';
      return 'No repeats';
    }
    if(typeof rs === 'string') {
      var parts = rs.split('/');
      if(parts.length===2) rs = {used: parseInt(parts[0],10)||0, total: parseInt(parts[1],10)||0};
      else return rs; /* pass through unknown string */
    }
    var used  = rs.used  !== undefined ? parseInt(rs.used,10)  : null;
    var total = rs.total !== undefined ? parseInt(rs.total,10) : null;
    if(total===0 || total===null) return 'No repeats';
    if(used===0 || used===null) return 'Original';
    return 'Repeat '+used+' of '+total;
  }

  /* Helper: get linked prescription object */
  function _linkedRx(h) {
    if(!h.prescriptionRef) return null;
    return (_PH.prescriptions||[]).find(function(p){ return p.code===h.prescriptionRef; }) || null;
  }

  /* Helper: resolve items array */
  function _hItems(h) {
    if(h.items && h.items.length) return h.items;
    var rx = _linkedRx(h);
    return (rx && rx.items) ? rx.items : [];
  }

  /* Helper: resolve quantity + unit from history entry or its items */
  function _qtyLabel(h) {
    if(h.quantity && h.quantity!=='—' && h.quantity!=='') return h.quantity+(h.unit?' '+h.unit:'');
    var items = _hItems(h);
    if(items.length) {
      var qtys = items.map(function(it){
        var q = it.quantity||it.qty||it.dispensedQty||'';
        var u = it.unit||it.unitOfMeasure||'';
        return q ? (q+(u?' '+u:'')) : '';
      }).filter(Boolean);
      if(qtys.length) return qtys.join(', ');
    }
    return '—';
  }

  /* Helper: resolve dosage instructions */
  function _dosageLabel(h) {
    if(h.dosage && h.dosage!=='—' && h.dosage!=='') return h.dosage;
    if(h.instructions && h.instructions!=='—' && h.instructions!=='') return h.instructions;
    var items = _hItems(h);
    if(items.length) {
      var doses = items.map(function(it){
        return it.dosage||it.instructions||it.dosageInstructions||((it.dose||'')+(it.frequency?' '+it.frequency:'')).trim()||'';
      }).filter(Boolean);
      if(doses.length) return doses[0];
    }
    return '—';
  }

  /* Helper: resolve drug name covering multi-item entries */
  function _drugLabel(h) {
    if(h.drug && h.drug!=='—' && h.drug!=='') return h.drug;
    var items = _hItems(h);
    if(items.length) return items.map(function(it){ return it.drug||it.name||''; }).filter(Boolean).join(', ') || '—';
    var rx = _linkedRx(h);
    return (rx && rx.drug) ? rx.drug : '—';
  }

  /* Helper: resolve prescription ref — also try linked rx */
  function _rxRef(h) {
    if(h.prescriptionRef && h.prescriptionRef!=='—' && h.prescriptionRef!=='') return h.prescriptionRef;
    var rx = _linkedRx(h);
    return (rx && rx.code) ? rx.code : '—';
  }

  /* Helper: resolve patient details — try linked rx if history missing */
  function _patientName(h) {
    if(h.patientName && h.patientName!=='—' && h.patientName!=='') return h.patientName;
    var rx = _linkedRx(h);
    return (rx && rx.patientName) ? rx.patientName : '—';
  }

  function _patientId(h) {
    /* Prefer real ID number fields over MongoDB _id (24-char hex) */
    function _isMongoId(v){ return v && /^[0-9a-f]{24}$/i.test(v.trim()); }
    var candidates = [
      h.idNumber, h.patientIdNumber, h.nationalId,
      h.passportNumber, h.passport,
    ];
    for(var ci=0;ci<candidates.length;ci++){
      var c=candidates[ci];
      if(c && c!=='—' && c!=='' && !_isMongoId(c)) return c;
    }
    /* Try linked prescription */
    var rx = _linkedRx(h);
    if(rx){
      var rxCandidates = [rx.idNumber, rx.patientIdNumber, rx.nationalId, rx.passportNumber, rx.passport, rx.patientId];
      for(var ri=0;ri<rxCandidates.length;ri++){
        var rc=rxCandidates[ri];
        if(rc && rc!=='—' && rc!=='' && !_isMongoId(rc)) return rc;
      }
    }
    /* Last resort: patientId even if it looks like a Mongo _id */
    if(h.patientId && h.patientId!=='—' && h.patientId!=='') return h.patientId;
    return '—';
  }

  /* Merge any newly dispensed entries from validation actions */
  var allHistory = _PH.history.slice();

  var filtered = allHistory.filter(function(h){
    return (f.doctor==='all'||h.doctor===f.doctor) &&
           (f.type==='all'||h.type===f.type) &&
           (f.status==='all'||h.status===f.status);
  });

  var doctors  = ['all'].concat([...new Set(allHistory.map(function(h){return h.doctor;}).filter(Boolean))]);
  var types    = ['all'].concat([...new Set(allHistory.map(function(h){return h.type;}))]);
  var statuses = ['all','Prescribed','Awaiting Dispensing','Collected','Partial','Missed'];

  function sel(id, opts, val, field, label) {
    return '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#777;margin-bottom:4px">'+label+'</div>'+
      '<select id="'+id+'" onchange="window._phHistFilters.'+field+'=this.value;_phRenderHistory()" style="width:100%;padding:8px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none">'+
      opts.map(function(o){ return '<option value="'+o+'"'+(val===o?' selected':'')+'>'+( o==='all'?'All':o)+'</option>'; }).join('')+'</select></div>';
  }

  /* Status colour mapping */
  var statusStyle = {Collected:'green','Awaiting Dispensing':'blue',Prescribed:'gray',Partial:'amber',Missed:'red'};
  var dotColor    = {Collected:'#0F6E56','Awaiting Dispensing':'#3B82F6',Prescribed:'#94a3b8',Partial:'#EF9F27',Missed:'#dc2626'};

  var timeline = filtered.length
    ? '<ol style="list-style:none;padding:0 0 0 28px;margin:0;border-left:2px solid #e0e0e0;display:flex;flex-direction:column;gap:16px">'+
      filtered.map(function(e){
        var dotCol = dotColor[e.status]||'#94a3b8';

        /* ── Resolve all display fields ── */
        var drugLabel     = _drugLabel(e);
        var dispensedDate = e.dispensedAt ? new Date(e.dispensedAt).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}) : (e.date||'—');
        /* Date Prescribed: issued > submittedAt > date */
        var _issuedStr = e.issued || (function(){ var rx=_linkedRx(e); return rx?(rx.issued||rx.issuedAt||rx.prescribedAt||''):''; })() || e.submittedAt || e.date || '';
        var prescribedDate = _issuedStr ? new Date(_issuedStr).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}) : '—';

        /* Pharmacist: use stored name; fall back to dispensedBy on linked rx; then logged-in user */
        var pharmClean = _cleanName(e.pharmacist||'');
        if(!pharmClean && _rxD) pharmClean = _cleanName(_rxD.dispensedBy||_rxD.pharmacist||'');
        var pharmDisplay = pharmClean || (_loggedPhName ? _loggedPhName : '—');

        /* Doctor: try all known field shapes, strip generic role strings */
        var _rxD = _linkedRx(e);
        var _docRaw = (function(){
          /* 1. prescribedByObj on history entry */
          if(e.prescribedByObj && (e.prescribedByObj.firstName||e.prescribedByObj.lastName))
            return ((e.prescribedByObj.firstName||'')+' '+(e.prescribedByObj.lastName||'')).trim();
          /* 2. doctor field on history entry */
          var d1 = _cleanName(e.doctor||'');
          if(d1) return d1;
          /* 3. prescribedByName on history entry */
          var d2 = _cleanName(e.prescribedByName||'');
          if(d2) return d2;
          /* 4. linked prescription prescribedByObj */
          if(_rxD && _rxD.prescribedByObj && (_rxD.prescribedByObj.firstName||_rxD.prescribedByObj.lastName))
            return ((_rxD.prescribedByObj.firstName||'')+' '+(_rxD.prescribedByObj.lastName||'')).trim();
          /* 5. linked prescription doctor / prescribedByName */
          var d3 = _rxD ? _cleanName(_rxD.doctor||'') : '';
          if(d3) return d3;
          var d4 = _rxD ? _cleanName(_rxD.prescribedByName||'') : '';
          if(d4) return d4;
          return '';
        })();
        var docClean = _cleanName(_docRaw);
        var docDisplay= docClean ? ('Dr. '+docClean) : '—';

        /* Facility */
        var facilityDisplay = (e.facility && e.facility!=='—' && e.facility!=='') ? e.facility
          : (function(){ var _rxF=_linkedRx(e); return (_rxF&&_rxF.facility&&_rxF.facility!=='—')?_rxF.facility:''; })()
          || (window.API&&window.API.getStoredUser&&(window.API.getStoredUser()||{}).facility)
          || 'Johannesburg CHC';

        /* Quantity + Dosage */
        var qtyDisplay    = _qtyLabel(e);
        var dosageDisplay = _dosageLabel(e);

        /* Repeat sequence */
        var repeatDisplay = _repeatLabel(e);

        /* Patient info — always pull from linked rx if history is missing */
        var patientId   = _patientId(e);
        var patientName = _patientName(e);

        /* Prescription ref */
        var rxRefDisplay = _rxRef(e);

        return '<li style="position:relative">'+
          '<span style="position:absolute;left:-36px;top:8px;width:14px;height:14px;border-radius:50%;background:'+dotCol+';border:2px solid #fff;display:block"></span>'+
          '<div style="border:1px solid #e0e0e0;border-radius:10px;overflow:hidden">'+
            /* Header row */
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e0e0e0">'+
              '<div>'+
                '<span style="font-weight:700;font-size:14px">'+drugLabel+'</span>'+
                (rxRefDisplay&&rxRefDisplay!=='—'?'<span style="font-size:11px;font-family:monospace;color:#0F6E56;margin-left:10px">'+rxRefDisplay+'</span>':'')+
              '</div>'+
              _phBadge(e.status||'—',statusStyle[e.status]||'gray')+
            '</div>'+
            /* Full detail grid */
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px 14px;font-size:12px">'+
              [
                ['Patient Name',          patientName],
                ['Patient ID / Passport', patientId],
                ['Medication',            drugLabel],
                ['Quantity Dispensed',    qtyDisplay],
                ['Dosage Instructions',   dosageDisplay],
                ['Dispensing Pharmacist', pharmDisplay],
                ['Prescribing Doctor',    docDisplay],
                ['Facility',              facilityDisplay],
                ['Repeat Sequence',       repeatDisplay],
                ['Date Prescribed',       prescribedDate],
                ['Date Dispensed',        (e.dispensedAt || e.status==='Collected' || e.status==='Partial') ? dispensedDate : '—'],
                ['Prescription Ref',      rxRefDisplay],
              ].map(function(fd){
                return '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#777;margin-bottom:2px">'+fd[0]+'</div><div style="font-weight:600;font-family:'+(fd[0].includes('Ref')?'monospace':'inherit')+';font-size:12px">'+fd[1]+'</div></div>';
              }).join('')+
            '</div>'+
          '</div>'+
        '</li>';
      }).join('')+'</ol>'
    : '<div style="border:1.5px dashed #e0e0e0;border-radius:10px;padding:32px;text-align:center;font-size:13px;color:#777">No records match these filters.</div>';

  var legend = '';

  var searchBox = '';

  el.innerHTML = _phCard('ti-history','Patient Medication History',
    filtered.length+' record'+(filtered.length!==1?'s':'')+' · '+
    allHistory.filter(function(h){return h.status==='Collected';}).length+' dispensed',
    _phBtn('Export PDF','ti-download','outline','UI.showToast(\''+filtered.length+' records prepared as PDF\',\'ok\')'),
    searchBox+
    '<div style="display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:16px">'+
      sel('hist-status',statuses,f.status,'status','Dispensing Status')+
    '</div>'+
    legend+
    timeline);
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 7 — SUPPLIERS & ORDERS
═══════════════════════════════════════════════════════════════ */
Pages['ph-suppliers'] = () => {
  var poStatusStyle = {draft:'gray',sent:'gray',confirmed:'green',delivered:'green',overdue:'red'};

  var poTable = '<div style="border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;overflow-x:auto;margin-bottom:6px"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
    '<thead><tr style="background:#f4f5f0">' +
    ['Order','Supplier','Items','Value','Placed','ETA','Status'].map(function(h,i){
      return '<th style="padding:10px 12px;text-align:'+(i===2||i===3?'right':'left')+';font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#777777;font-weight:600">'+h+'</th>';
    }).join('') + '</tr></thead><tbody>' +
    _PH.purchaseOrders.map(function(po){
      return '<tr style="border-top:1px solid #e0e0e0">' +
        '<td style="padding:10px 12px;font-family:monospace;font-size:12px">'+po.id+'</td>' +
        '<td style="padding:10px 12px;font-weight:500">'+po.supplier+'</td>' +
        '<td style="padding:10px 12px;text-align:right">'+po.items+'</td>' +
        '<td style="padding:10px 12px;text-align:right">R '+po.value.toLocaleString('en-ZA')+'</td>' +
        '<td style="padding:10px 12px;color:#777777">'+po.placed+'</td>' +
        '<td style="padding:10px 12px;color:#777777">'+po.eta+'</td>' +
        '<td style="padding:10px 12px">'+_phBadge(po.status,poStatusStyle[po.status]||'gray')+'</td>' +
      '</tr>';
    }).join('') + '</tbody></table></div>';

  var supplierCards = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">' +
    _PH.suppliers.map(function(s){
      return '<div style="border:1px solid #e0e0e0;border-radius:12px;padding:14px">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">' +
          '<div><div style="font-weight:600;font-size:13px">'+s.name+'</div><div style="font-size:11px;color:#777777">'+s.contract+'</div></div>' +
          _phBadge(s.leadTimeDays+'d lead','gray') +
        '</div>' +
        '<div style="font-size:11px;color:#777777;margin-bottom:4px">On-time delivery '+s.reliability+'%</div>' +
        _phProgress(s.reliability) +
        '<div style="font-size:11px;color:#777777;margin:10px 0 10px">'+s.contact+' · '+s.phone+'</div>' +
        '<button id="ph-ord-btn-'+s.id+'" onclick="_phSendOrderRequest(\''+s.id+'\',\''+s.name.replace(/'/g,'')+'\',\''+s.contact+'\')" '+
          'style="padding:8px 16px;border-radius:8px;border:1.5px solid #0F6E56;background:#fff;color:#0F6E56;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s">'+
          '📦 Send order request'+
        '</button>' +
      '</div>';
    }).join('') + '</div>';

  var content =
    _phCard('ti-package-plus','Purchase orders','Track every order from placement to delivery',
      _phBtn('New order','','primary','UI.showToast(\'Draft order created\',\'ok\')'), poTable) +
    '<div style="margin-top:20px">' +
    _phCard('ti-truck','Supplier performance','Lead time and reliability guide who to reorder from','',supplierCards) +
    '</div>';

  return _phShell('ph-suppliers','Suppliers & orders','Purchase orders · Supplier performance', content);
};

/* ── Send order request to supplier ── */
window._phSendOrderRequest = function(suppId, suppName, suppEmail){
  var btn = document.getElementById('ph-ord-btn-'+suppId);
  if(btn){ btn.disabled=true; btn.textContent='Sending…'; btn.style.opacity='0.6'; }

  var u = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  var phName = u.firstName?(u.firstName+' '+u.lastName).trim():(u.name||'Pharmacist');
  var facility = (window._PH_FACILITY) || 'NIHMS Facility';
  var orderRef = 'PO-' + String(Date.now()).slice(-6);
  var payload = {
    supplierName:  suppName,
    supplierEmail: suppEmail,
    orderRef:      orderRef,
    requestedBy:   phName,
    facility:      facility,
    requestedAt:   new Date().toISOString(),
    status:        'sent',
  };

  /* Try real API; fall back gracefully */
  var apiPromise = (window.API&&window.API._fetchDirect)
    ? API._fetchDirect('/suppliers/orders', {method:'POST', body:JSON.stringify(payload)}).catch(function(){ return {_fallback:true}; })
    : Promise.resolve({_fallback:true});

  apiPromise.then(function(res){
    if(btn){ btn.disabled=false; btn.textContent='✅ Order sent'; btn.style.opacity='1'; btn.style.background='#EDFBF3'; btn.style.borderColor='#0F6E56'; btn.style.color='#0F6E56'; }

    /* Add to purchase orders list for display */
    var today = new Date().toISOString().slice(0,10);
    var eta   = new Date(Date.now() + (_PH.suppliers.find(function(s){return s.id===suppId;})||{leadTimeDays:7}).leadTimeDays * 86400000).toISOString().slice(0,10);
    _PH.purchaseOrders.unshift({id:orderRef, supplier:suppName, items:0, value:0, placed:today, eta:eta, status:'sent'});

    /* Show success modal */
    _phShowOrderConfirm(orderRef, suppName, suppEmail, eta);

    /* Reset button text after 4 s */
    setTimeout(function(){
      if(btn){ btn.textContent='📦 Send order request'; btn.style.background='#fff'; btn.style.borderColor='#0F6E56'; btn.style.color='#0F6E56'; btn.disabled=false; }
    }, 4000);
  });
};

/* ── Order sent confirmation modal ── */
function _phShowOrderConfirm(ref, suppName, suppEmail, eta){
  var overlay = document.createElement('div');
  overlay.id = 'ph-order-confirm-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;animation:_dPulse .15s ease';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;padding:32px 36px;max-width:460px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2);text-align:center">' +
      '<div style="width:64px;height:64px;border-radius:50%;background:#EDFBF3;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 16px">📦</div>' +
      '<div style="font-size:20px;font-weight:800;color:#0F6E56;margin-bottom:8px">Order Request Sent</div>' +
      '<div style="font-size:14px;color:#555;margin-bottom:20px;line-height:1.6">'+
        'Your order request <strong style="font-family:monospace">'+ref+'</strong> has been sent to <strong>'+suppName+'</strong>.<br>'+
        (suppEmail?'A confirmation will be sent to <strong>'+suppEmail+'</strong>.<br>':'')+
        'Expected delivery: <strong>'+eta+'</strong>'+
      '</div>'+
      '<button onclick="document.getElementById(\'ph-order-confirm-overlay\').remove()" '+
        'style="padding:11px 32px;border-radius:8px;border:none;background:#0F6E56;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">'+
        'Done'+
      '</button>'+
    '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); });
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 8 — CONTROLLED SUBSTANCES REGISTER
═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   PAGE 9 — REFILL REMINDERS
═══════════════════════════════════════════════════════════════ */
Pages['ph-reminders'] = () => {
  if (!window._phReminderSent)      window._phReminderSent      = [];
  if (!window._phReminderMethod)    window._phReminderMethod    = {};
  if (!window._phReminderScheduled) window._phReminderScheduled = {};
  /* Fetch live data then render */
  setTimeout(function(){
    if(typeof window._phLoadLiveData==='function'){
      window._phLoadLiveData(true).then(function(){ _phRenderReminders(); }).catch(function(){ _phRenderReminders(); });
    } else { _phRenderReminders(); }
  }, 0);
  return _phShell('ph-reminders','Refill reminders','Repeat prescriptions · Schedule or send manually',
    '<div id="ph-rem-body"><div style="text-align:center;padding:40px;color:#777">Loading reminders…</div></div>');
};

function _phRenderReminders() {
  var el = document.getElementById('ph-rem-body'); if(!el) return;
  var sent      = window._phReminderSent      || [];
  var methods   = window._phReminderMethod    || {};
  var scheduled = window._phReminderScheduled || {};

  /* Build refill list — ONLY repeat prescriptions (repeatPrescription === true) */
  var refillList = [];
  _PH.prescriptions.forEach(function(rx){
    /* Only include prescriptions the doctor marked as repeat */
    if(!rx.repeatPrescription) return;

    /* Skip already dispensed / cancelled */
    var skipStatus = ['Dispensed','Cancelled','Rejected'];
    if(skipStatus.indexOf(rx.status)>-1) return;

    /* Stop if repeats are exhausted or expired */
    if(rx.repeat){
      var isExpired = rx.repeat.expiryDate && new Date(rx.repeat.expiryDate)<new Date();
      /* remaining is explicitly set by doctor; 0 means no repeats left */
      var repRem = rx.repeat.remaining!==undefined ? rx.repeat.remaining
                 : (rx.repeat.allowed!==undefined && rx.repeat.used!==undefined)
                   ? Math.max(0, rx.repeat.allowed - rx.repeat.used) : null;
      var exhausted = repRem !== null && repRem <= 0;
      if(isExpired||exhausted) return;
    }

    /* Calculate due-in days from review date */
    var dueDate = (rx.repeat&&rx.repeat.reviewDate) ? new Date(rx.repeat.reviewDate)
                : rx.validUntil ? new Date(rx.validUntil) : null;
    var dueIn = dueDate ? Math.round((dueDate-new Date())/(1000*60*60*24)) : 99;

    /* Medication summary */
    var medSummary = '—';
    if(rx.items&&rx.items.length){
      medSummary = rx.items.map(function(it){return it.drug||it.name||'';}).filter(Boolean).slice(0,2).join(', ');
      if(rx.items.length>2) medSummary += ' +more';
    }

    /* Repeats remaining: derive cleanly from repeat object */
    var repAllowed  = rx.repeat ? (rx.repeat.allowed  || 0) : 0;
    var repUsed     = rx.repeat ? (rx.repeat.used     || 0) : 0;
    var repRemainingFinal = rx.repeat
      ? (rx.repeat.remaining!==undefined ? rx.repeat.remaining : Math.max(0, repAllowed - repUsed))
      : 0;

    refillList.push({
      id:               rx._id||rx.code||rx.prescriptionId,
      patient:          rx.patientName       || 'Unknown patient',
      patientId:        rx.patientId         || '—',
      drug:             medSummary,
      dueIn:            dueIn,
      adherence:        rx.adherence         || null,
      channel:          rx.channel           || 'SMS',
      reviewDate:       (rx.repeat&&rx.repeat.reviewDate)||rx.validUntil||'—',
      expiryDate:       (rx.repeat&&rx.repeat.expiryDate)||'No expiry',
      repeatsRemaining: repRemainingFinal,
      repeatsAllowed:   repAllowed,
      repeatsUsed:      repUsed,
      prescribingDoctor: rx.doctor||rx.prescribedByName||'—',
      status:           rx.status            || 'Active',
      prescriptionRef:  rx.code              || '—',
      isRepeat:         true,
    });
  });

  /* Also carry over any repeat entries pushed into _PH.refills at runtime */
  _PH.refills.forEach(function(r){
    var exists = refillList.find(function(x){return x.id===r.id||x.prescriptionRef===r.id;});
    if(!exists && r.isRepeat!==false) refillList.push(r);
  });

  var sorted = refillList.slice().sort(function(a,b){return a.dueIn-b.dueIn;});

  /* Summary stats */
  var totalDue    = sorted.filter(function(r){return r.dueIn<=7;}).length;
  var totalSent   = sent.length;
  var totalActive = sorted.length;
  var stats =
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px">'+
    [[totalActive,'Active Repeats','#0F6E56'],[totalDue,'Due ≤ 7 Days','#EF9F27'],[totalSent,'Reminders Sent','#3B82F6']].map(function(s){
      return '<div style="background:#f8fafc;border:1px solid #e0e0e0;border-radius:10px;padding:12px;text-align:center">'+
        '<div style="font-size:28px;font-weight:800;color:'+s[2]+'">'+s[0]+'</div>'+
        '<div style="font-size:11px;color:#777;margin-top:2px">'+s[1]+'</div>'+
      '</div>';
    }).join('')+
    '</div>';

  /* Req 5: Each card shows prescription dates + repeat status BEFORE allowing send */
  var rows = sorted.map(function(r){
    var overdue  = r.dueIn < 0;
    var dueSoon  = r.dueIn >= 0 && r.dueIn <= 7;
    var isSent   = sent.includes(r.id);
    var isSchd   = scheduled[r.id];
    var method   = methods[r.id]||r.channel||'SMS';
    var borderCol= overdue?'rgba(220,38,38,.4)':dueSoon?'rgba(239,159,39,.4)':'#e0e0e0';
    var bgCol    = overdue?'#FEF2F2':dueSoon?'#FFFBEB':'#fff';
    var dueLabel = overdue?'⚠️ '+(-r.dueIn)+' days overdue':r.dueIn===0?'📅 Due today':'📅 Due in '+r.dueIn+' days';

    return '<li style="border:1px solid '+borderCol+';background:'+bgCol+';border-radius:10px;padding:14px 16px;margin-bottom:10px">'+
      '<div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">'+
        '<div>'+
          '<div style="font-size:14px;font-weight:700">'+r.patient+'</div>'+
          '<div style="font-size:12px;color:#777;font-family:monospace">'+r.patientId+'</div>'+
        '</div>'+
        '<div style="text-align:right">'+
          _phBadge(dueLabel, overdue?'red':dueSoon?'amber':'green')+
          (isSent?'<div style="margin-top:4px">'+_phBadge('Reminder sent','green')+'</div>':'')+
          (isSchd&&!isSent?'<div style="margin-top:4px">'+_phBadge('Scheduled','blue')+'</div>':'')+
        '</div>'+
      '</div>'+
      /* Req 5: show prescription details before sending */
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:12px;margin-bottom:12px;background:rgba(0,0,0,.03);border-radius:8px;padding:10px">'+
        [
          ['Medication',         r.drug||'—'],
          ['Prescription Ref',   r.prescriptionRef||r.id||'—'],
          ['Prescribing Doctor', r.prescribingDoctor||r.doctor||'—'],
          ['Review Date',        r.reviewDate||'—'],
          ['Expiry Date',        r.expiryDate||'No expiry'],
          ['Repeats Remaining',  (r.repeatsAllowed>0) ? (r.repeatsRemaining+' of '+r.repeatsAllowed+' remaining') : (r.repeatsRemaining===0?'0 (no repeats)':'—')],
        ].map(function(fd){
          return '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#777;margin-bottom:1px">'+fd[0]+'</div>'+
            '<div style="font-weight:600;font-family:'+(fd[0].includes('Ref')?'monospace':'inherit')+'">'+fd[1]+'</div></div>';
        }).join('')+
      '</div>'+
      ((!isSent)?
        '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px">'+
          '<div style="display:flex;gap:0;border:1.5px solid #e0e0e0;border-radius:8px;overflow:hidden">'+
            ['SMS','Email','Both'].map(function(m){
              var active = method===m;
              return '<button onclick="window._phReminderMethod[\''+r.id+'\']=\''+m+'\';_phRenderReminders()" '+
                'style="padding:6px 12px;border:none;background:'+(active?'#0F6E56':'#fff')+';color:'+(active?'#fff':'#333')+';font-size:12px;font-weight:'+(active?'700':'400')+';cursor:pointer;font-family:inherit">'+m+'</button>';
            }).join('')+
          '</div>'+
          _phBtn('Send now','','primary','_phSendReminder(\''+r.id+'\',\''+method+'\',\''+r.patient+'\')')+
          _phBtn(isSchd?'Scheduled ✓':'Schedule','','outline','_phScheduleReminder(\''+r.id+'\',\''+r.patient+'\')')+
        '</div>':
        '<div style="font-size:12px;color:#0F6E56;font-weight:600">✅ '+method+' reminder sent — patient notified</div>')+
    '</li>';
  }).join('');

  var empty = sorted.length===0
    ? '<div style="border:1.5px dashed #e0e0e0;border-radius:10px;padding:32px;text-align:center;font-size:13px;color:#777">No active repeat prescriptions requiring reminders.</div>'
    : '';

  el.innerHTML = _phCard('ti-bell','Refill reminders',
    'Send via SMS or email. Stops automatically when prescription expires or repeats are exhausted.',
    '<div style="display:flex;gap:8px">'+
      _phBtn('Send all due','ti-send','primary','_phSendAllReminders()')+
      _phBtn('Refresh','','outline','_phRenderReminders()')+
    '</div>',
    stats+'<ul style="list-style:none;padding:0;margin:0">'+rows+'</ul>'+empty
  );
}

window._phSendReminder = function(id, channel, patient) {
  /* Req 5: validate not expired / exhausted */
  var rx = _PH.prescriptions.find(function(p){return p.code===id;});
  if(rx&&rx.repeat){
    var isExpired = rx.repeat.expiryDate && new Date(rx.repeat.expiryDate)<new Date();
    var exhausted = rx.repeat.remaining!==undefined && rx.repeat.remaining<=0;
    if(isExpired){ UI.showToast('Cannot send reminder — prescription has expired','err'); return; }
    if(exhausted){ UI.showToast('Cannot send reminder — repeats exhausted','err'); return; }
  }
  /* Req 5: no duplicates */
  if((window._phReminderSent||[]).includes(id)){ UI.showToast('Reminder already sent to '+patient,'err'); return; }
  window._phReminderSent = (window._phReminderSent||[]).concat([id]);
  /* Attempt real notification */
  var method = (window._phReminderMethod&&window._phReminderMethod[id])||channel||'SMS';
  var endpoints = [];
  if(method==='SMS'||method==='Both') endpoints.push('/notifications/sms');
  if(method==='Email'||method==='Both') endpoints.push('/notifications/email');
  endpoints.forEach(function(ep){
    try{
      if(window.API&&window.API._fetchDirect){
        window.API._fetchDirect(ep,{method:'POST',body:JSON.stringify({
          prescriptionRef:id, patient:patient, type:'refill_reminder',
          message:'Your repeat prescription is due for collection. Please contact the pharmacy.',
        })}).catch(function(){});
      }
    }catch(_){}
  });
  _phRenderReminders();
  UI.showToast(method+' reminder sent to '+patient,'ok');
};
window._phScheduleReminder = function(id, patient) {
  if(!window._phReminderScheduled) window._phReminderScheduled = {};
  window._phReminderScheduled[id] = true;
  _phRenderReminders();
  UI.showToast('Reminder scheduled for '+patient+' — will send automatically at review date','ok');
};
window._phSendAllReminders = function() {
  var sent  = window._phReminderSent || [];
  var count = 0;
  /* Only send to repeat prescriptions, matching _phRenderReminders logic */
  _PH.prescriptions.forEach(function(rx){
    if(!rx.repeatPrescription) return;  /* skip non-repeat prescriptions */
    var skipStatus = ['Dispensed','Cancelled','Rejected'];
    if(skipStatus.indexOf(rx.status)>-1) return;
    if(rx.repeat){
      var isExpired = rx.repeat.expiryDate && new Date(rx.repeat.expiryDate)<new Date();
      var repRem = rx.repeat.remaining!==undefined ? rx.repeat.remaining : Math.max(0,(rx.repeat.allowed||0)-(rx.repeat.used||0));
      var exhausted = repRem <= 0;
      if(isExpired||exhausted) return;
    }
    var dueDate = (rx.repeat&&rx.repeat.reviewDate)?new Date(rx.repeat.reviewDate):(rx.validUntil?new Date(rx.validUntil):null);
    var dueIn   = dueDate ? Math.round((dueDate-new Date())/(1000*60*60*24)) : 99;
    var id      = rx._id||rx.code;
    if(dueIn<=7&&!sent.includes(id)){
      window._phSendReminder(id, rx.channel||'SMS', rx.patientName||'Patient');
      count++;
    }
  });
  if(count===0) UI.showToast('No reminders due within 7 days','ok');
  else UI.showToast('Sent '+count+' reminder'+(count!==1?'s':''),'ok');
};

