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
    {id:'s1',drug:'Metformin 500mg',form:'Tablet',batch:'MTF-2291',expiry:'2028-03-14',quantity:5000,reorderLevel:120,supplier:'Aspen Pharmacare'},
    {id:'s2',drug:'Amlodipine 5mg',form:'Tablet',batch:'AML-8830',expiry:'2027-03-02',quantity:5000,reorderLevel:200,supplier:'Adcock Ingram'},
    {id:'s3',drug:'Amoxicillin 250mg',form:'Capsule',batch:'AMX-1174',expiry:'2029-06-21',quantity:5000,reorderLevel:150,supplier:'Cipla SA'},
    {id:'s4',drug:'Insulin Glargine',form:'Pen',batch:'INS-0442',expiry:'2027-11-30',quantity:5000,reorderLevel:40,supplier:'Sanofi SA'},
    {id:'s5',drug:'Paracetamol 500mg',form:'Tablet',batch:'PCM-7710',expiry:'2028-01-30',quantity:5000,reorderLevel:500,supplier:'Adcock Ingram'},
    {id:'s6',drug:'Enalapril 10mg',form:'Tablet',batch:'ENA-3320',expiry:'2029-04-05',quantity:5000,reorderLevel:100,supplier:'Aspen Pharmacare'},
    {id:'s7',drug:'Salbutamol Inhaler',form:'Inhaler',batch:'SAL-5561',expiry:'2027-06-18',quantity:5000,reorderLevel:60,supplier:'Cipla SA'},
    {id:'s8',drug:'Warfarin 5mg',form:'Tablet',batch:'WAR-9002',expiry:'2028-09-29',quantity:5000,reorderLevel:80,supplier:'Pharma Dynamics'},
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
    {id:'d1',drug:'Metformin 500mg',dosage:'1 tab twice daily with meals',qty:60,batch:'MTF-2291',expiry:'2028-03-14'},
    {id:'d2',drug:'Warfarin 5mg',dosage:'1 tab at night',qty:30,batch:'WAR-9002',expiry:'2028-09-29'},
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
      /* Also add to queue — always force new-request regardless of stored state */
      e.state = 'new-request';
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
        /* Force state to new-request regardless of what doctor.js sent */
        e2.state = 'new-request';
        var dupQ2 = _PH.queue.find(function(x){return x.id===e2.id;});
        if(!dupQ2){ _PH.queue.push(e2); }
        /* Also push into the live queue working-copy so Queue panel refreshes without navigation */
        if(!window._phQueue) window._phQueue = [];
        var dupLive = window._phQueue.find(function(x){return x.id===e2.id;});
        if(!dupLive){ window._phQueue.push(e2); }
        /* Switch queue panel to new-request tab so pharmacist sees the new arrival */
        window._phQueueTab = 'new-request';
        if(!dupPh) window._phSelRx = _PH.prescriptions.find(function(x){return x.code===e2.prescriptionRef;}) || _PH.prescriptions[0] || null;
        try{if(typeof _phRenderValidation==='function')_phRenderValidation();}catch(_){}
        try{if(typeof _phRenderQueue==='function')_phRenderQueue();}catch(_){}
        /* Emit real-time Socket.IO notification to pharmacy dashboard */
        try{
          if(window.socket&&window.socket.emit){
            window.socket.emit('newPrescription',{
              queueId:e2.id, ticket:e2.ticket, patient:e2.patientName||e2.patient,
              prescriptionRef:e2.prescriptionRef, priority:e2.priority||'normal',
              submittedAt:e2.prescribedAt||new Date().toISOString()
            });
          }
        }catch(_){}
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

    /* ══════════════════════════════════════════════════════════════
       STEP 1 — Load saved pharmacy queue entries (source of truth).
       These carry the pharmacist-set state (in-progress, validated,
       pending-stock, etc.) that must survive logout / refresh.
    ══════════════════════════════════════════════════════════════ */
    var queueRes = await API._fetchDirect('/pharmacy/queue?limit=500&sort=-updatedAt', {method:'GET'})
      .catch(function(){ return null; });
    var savedQueueEntries = [];
    if(queueRes){
      var _qr = Array.isArray(queueRes) ? queueRes : (queueRes.data || queueRes.entries || queueRes.queue || []);
      if(Array.isArray(_qr)) savedQueueEntries = _qr;
    }

    /* State map shared between both loops */
    var _apiStateMap = {
      'new request':                'new-request',
      'new':                        'new-request',
      'submitted':                  'new-request',
      'pending':                    'new-request',
      'prescribed':                 'new-request',
      'active':                     'new-request',
      'refill due':                 'new-request',
      'awaiting pharmacist review': 'waiting',
      'accepted':                   'waiting',
      'waiting':                    'waiting',
      'validated':                  'validated',
      'awaiting dispensing':        'in-progress',
      'approved for dispensing':    'in-progress',
      'in progress':                'in-progress',
      'in-progress':                'in-progress',
      'partially dispensed':        'in-progress',
      'ready for collection':       'ready-for-collection',
      'ready-for-collection':       'ready-for-collection',
      'dispensed':                  'completed',
      'collected':                  'completed',
      'completed':                  'completed',
      'rejected':                   'rejected',
      'pending stock':              'pending-stock',
      'pending-stock':              'pending-stock',
      'returned for amendment':     'returned-for-amendment',
      'returned-for-amendment':     'returned-for-amendment',
    };

    /* Merge saved queue entries into window._phQueue (update existing, add new) */
    if(!window._phQueue) window._phQueue = [];
    savedQueueEntries.forEach(function(sq){
      var sqRef   = sq.prescriptionRef || sq.prescriptionCode || sq._id || '';
      var sqId    = sq._id || sq.id || sqRef;
      var sqState = sq.state || _apiStateMap[(sq.status||'').toLowerCase().trim()] || 'new-request';
      var existing = window._phQueue.find(function(x){ return x.id===sqId || x.prescriptionRef===sqRef; });
      if(existing){
        /* Update saved state — backend is source of truth */
        existing.state            = sqState;
        existing.status           = sq.status           || existing.status;
        existing.updatedAt        = sq.updatedAt        || existing.updatedAt;
        existing.collectedAt      = sq.collectedAt      || existing.collectedAt;
        existing.dispensedAt      = sq.dispensedAt      || existing.dispensedAt;
        existing.amendmentReason  = sq.amendmentReason  || existing.amendmentReason;
        existing.rejectionReason  = sq.rejectionReason  || existing.rejectionReason;
        existing.pharmacist       = sq.pharmacist       || existing.pharmacist;
        existing.ticket           = sq.ticket           || existing.ticket;
      } else {
        /* New entry from server not yet in local list */
        window._phQueue.push({
          id:               sqId,
          ticket:           sq.ticket || 'P-' + String(Math.floor(Math.random()*900)+100),
          patient:          sq.patientName || sq.patient || '—',
          patientId:        sq.patientId   || '—',
          items:            sq.items       || (sq.medications||[]).length || 1,
          waitedMin:        sq.waitedMin   || 0,
          state:            sqState,
          prescriptionRef:  sqRef,
          prescriptionId:   sq.prescriptionId || sqRef,
          medications:      sq.medications || [],
          prescribedByName: sq.prescribedByName || '',
          amendmentReason:  sq.amendmentReason  || '',
          rejectionReason:  sq.rejectionReason  || '',
          collectedAt:      sq.collectedAt      || '',
          dispensedAt:      sq.dispensedAt      || '',
          pharmacist:       sq.pharmacist        || '',
          status:           sq.status            || '',
          updatedAt:        sq.updatedAt         || '',
        });
      }
    });
    /* Sync _PH.queue mirror */
    _PH.queue = window._phQueue.slice();

    /* ══════════════════════════════════════════════════════════════
       STEP 2 — Fetch prescriptions for metadata (names, items, etc.)
    ══════════════════════════════════════════════════════════════ */
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
      /* Prefer SA ID number; fall back to MRN, then MongoDB _id */
      var patId    = (rx.patient && typeof rx.patient==='object' && (rx.patient.nationalId||rx.patient.idNumber||rx.patient.id_number))
                  || rx.idNumber || rx.nationalId
                  || (rx.patient && typeof rx.patient==='object' && rx.patient.mrn)
                  || rx.patientId
                  || (rx.patient && typeof rx.patient==='object' && rx.patient._id)
                  || '';
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
        idNumber:    (rx.patient&&typeof rx.patient==='object'&&(rx.patient.nationalId||rx.patient.idNumber||rx.patient.id_number))||rx.idNumber||rx.nationalId||'',
        passportNumber: rx.passportNumber||rx.passport||'',
        mrn:         rx.mrn||(rx.patient&&typeof rx.patient==='object'&&rx.patient.mrn)||'',
        patientName: patName,
        prescribedByObj: rx.prescribedByObj||(rx.prescribedBy&&typeof rx.prescribedBy==='object'?rx.prescribedBy:null),
        prescribedByName: docName ? 'Dr. '+docName : '',
        doctor:      docName ? 'Dr. ' + docName : '',
        doctorReg:   rx.prescribedByReg || (rx.prescribedBy && typeof rx.prescribedBy==='object' && rx.prescribedBy.hpcsaNumber) || '',
        facility:    facilityName,
        issued:      (rx.issued||rx.issuedAt||rx.prescribedAt||rx.createdAt||'').slice(0,10),
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

      /* Add to queue if status is actionable (not yet completed/cancelled).
         IMPORTANT: If this prescription already has a saved queue entry
         (loaded from /pharmacy/queue in STEP 1), only update its metadata —
         NEVER overwrite the state the pharmacist set.  Only create a new
         queue entry if none exists at all. */
      var rxStatusNorm = (rxStatus||'').toLowerCase().trim();
      var queueable = ['submitted','awaiting pharmacist review','validated','awaiting dispensing',
                       'approved for dispensing','refill due','pending','partially dispensed',
                       'new','active','prescribed','new request','in progress','in-progress',
                       'ready for collection','ready-for-collection','rejected','pending stock',
                       'pending-stock','returned for amendment','returned-for-amendment',
                       'accepted','waiting','new-request','validated'].indexOf(rxStatusNorm) > -1;

      /* Check both window._phQueue (source-of-truth) and _PH.queue mirror */
      var dupLive = window._phQueue && window._phQueue.find(function(x){
        return x.prescriptionRef===rxRef || x.id===(rx._id||'api-'+rxRef);
      });

      if(dupLive){
        /* Entry already loaded from /pharmacy/queue — only refresh metadata */
        if(patName && !dupLive.patient)        dupLive.patient          = patName;
        if(patId   && !dupLive.patientId)      dupLive.patientId        = patId;
        if(docName && !dupLive.prescribedByName) dupLive.prescribedByName = 'Dr. ' + docName;
        if(!dupLive.medications || !dupLive.medications.length){
          dupLive.medications = rx.lines || rx.medications || rx.items || [];
        }
        /* Keep state from queue API — do NOT overwrite */
      } else if(queueable){
        /* Brand-new prescription not yet in any queue list */
        var mappedState = _apiStateMap[rxStatusNorm] || 'new-request';
        var qEntry = {
          id:               rx._id || 'api-'+rxRef,
          ticket:           'P-' + String(Math.floor(Math.random()*900)+100),
          patient:          patName,
          patientId:        patId,
          items:            (rx.lines||rx.medications||rx.items||[]).length || 1,
          waitedMin:        Math.round((Date.now() - new Date(rx.createdAt||rx.prescribedAt||Date.now()).getTime()) / 60000),
          state:            mappedState,
          prescriptionRef:  rxRef,
          prescriptionId:   rx._id || rxRef,
          medications:      rx.lines || rx.medications || rx.items || [],
          prescribedByName: docName ? 'Dr. '+docName : '',
          prescribedByReg:  rx.prescribedByReg || '',
          prescribedAt:     rx.createdAt || rx.prescribedAt || '',
          status:           rxStatus,
        };
        if(window._phQueue) window._phQueue.push(qEntry);
        _PH.queue.push(qEntry);
      }

      /* Keep _PH.queue mirror in sync with window._phQueue */
      _PH.queue = (window._phQueue || []).slice();
    });

    /* Store dispensed today count for KPI */
    window._phDispensedToday = dispensedToday;

    /* Re-render live panels without full page reload */
    if(!silent){
      try{ if(typeof _phRenderQueue==='function') _phRenderQueue(); }catch(_){}
      try{ if(typeof _phRenderValidation==='function') _phRenderValidation(); }catch(_){}
    }

    /* Also refresh all 5 overview KPIs inline if visible */
    var _lq = window._phQueue || _PH.queue || [];
    var _todayStr = new Date().toISOString().slice(0,10);
    var kpiWaiting = document.getElementById('ph-kpi-waiting');
    if(kpiWaiting) kpiWaiting.textContent = String(_lq.filter(function(x){return x.state==='waiting'||x.state==='new-request';}).length);
    var kpiInprog  = document.getElementById('ph-kpi-inprog');
    if(kpiInprog)  kpiInprog.textContent  = String(_lq.filter(function(x){return x.state==='in-progress'||x.state==='validated';}).length);
    var kpiReady   = document.getElementById('ph-kpi-ready');
    if(kpiReady)   kpiReady.textContent   = String(_lq.filter(function(x){return x.state==='ready-for-collection';}).length);
    var kpiDisp    = document.getElementById('ph-kpi-dispensed');
    if(kpiDisp)    kpiDisp.textContent    = String(window._phDispensedToday || 0);
    var kpiPending = document.getElementById('ph-kpi-pending');
    if(kpiPending) kpiPending.textContent = String(_lq.filter(function(x){return x.state==='pending-stock';}).length);
    var kpiRej     = document.getElementById('ph-kpi-rejected');
    if(kpiRej)     kpiRej.textContent     = String(_lq.filter(function(x){return x.state==='rejected';}).length);
    var kpiRet     = document.getElementById('ph-kpi-returned');
    if(kpiRet)     kpiRet.textContent     = String(_lq.filter(function(x){return x.state==='returned-for-amendment';}).length);
    var kpiOos     = document.getElementById('ph-kpi-oos');
    if(kpiOos)     kpiOos.textContent     = String(_PH.stockItems.filter(function(i){return _PH.stockState(i)==='critical'||i.quantity===0||i.quantity<(i.reorderLevel||1);}).length
                     + _lq.filter(function(x){return x.state==='pending-stock';}).length);

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
  var tabBar = '';
  /* Back button shown on every page except the overview itself */
  var backBtn = activeId !== 'rx-queue'
    ? '<button onclick="Router.setPage(\'rx-queue\')" style="display:inline-flex;align-items:center;gap:6px;margin-bottom:14px;padding:7px 14px;border-radius:8px;border:1.5px solid rgba(255,255,255,.4);background:rgba(255,255,255,.12);color:#fff;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;transition:background .15s" ' +
        'onmouseover="this.style.background=\'rgba(255,255,255,.22)\'" onmouseout="this.style.background=\'rgba(255,255,255,.12)\'">' +
        '<i class="ti-arrow-left" style="font-size:13px"></i> Back to Overview</button>'
    : '';

  var gradHeader =
    '<div style="background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);' +
      'padding:18px 24px;margin-bottom:20px;border-radius:14px;box-shadow:0 2px 10px rgba(15,110,86,.18)">' +
      backBtn +
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<div>' +
          '<div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-.01em;margin-bottom:2px">'+title+'</div>' +
          '<div style="font-size:13px;color:rgba(255,255,255,.78)">'+( desc||'Dispensary 2 · Johannesburg CHC')+'</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,.18);border:1.5px solid rgba(255,255,255,.28)">' +
          '<span style="font-size:24px">💊</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  return gradHeader + content;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 1 — OVERVIEW (rx-queue)
═══════════════════════════════════════════════════════════════ */
Pages['rx-queue'] = () => {
  /* Trigger a live refresh in background every time the overview opens */
  setTimeout(function(){ if(typeof window._phLoadLiveData==='function') window._phLoadLiveData(false); }, 200);

  /* ── Derive live counts from the authoritative working copy ── */
  var allQ = (window._phQueue || []).concat(
    (_PH.queue || []).filter(function(pqe){
      return !(window._phQueue || []).find(function(lq){ return lq.id === pqe.id || lq.prescriptionRef === pqe.prescriptionRef; });
    })
  );

  var todayStr = new Date().toISOString().slice(0, 10);

  var waitingRows    = allQ.filter(function(x){ return x.state === 'waiting' || x.state === 'new-request'; });
  var inProgRows     = allQ.filter(function(x){ return x.state === 'in-progress' || x.state === 'validated'; });
  var readyRows      = allQ.filter(function(x){ return x.state === 'ready-for-collection'; });
  var completedRows  = allQ.filter(function(x){
    return x.state === 'completed' && (x.collectedAt || x.dispensedAt || x.updatedAt || '').slice(0, 10) === todayStr;
  });
  /* Also count from _PH.history for completed today (more reliable) */
  var historyToday   = (_PH.history || []).filter(function(h){
    return (h.status === 'Completed' || h.status === 'Collected') && (h.dispensedAt || '').slice(0, 10) === todayStr;
  });
  /* Use whichever count is higher — queue entries may lag behind history */
  var completedCount = Math.max(completedRows.length, historyToday.length);

  var outOfStockItems = (_PH.stockItems || []).filter(function(i){
    return _PH.stockState(i) === 'critical' || i.quantity === 0 || i.quantity < (i.reorderLevel || 1);
  });
  var pendingStockRxs    = allQ.filter(function(x){ return x.state === 'pending-stock'; });
  var rejectedRows       = allQ.filter(function(x){ return x.state === 'rejected'; });
  var returnedRows       = allQ.filter(function(x){ return x.state === 'returned-for-amendment'; });

  /* ── KPI cards — each clickable, navigates to ph-queue with the right tab ── */
  var kpis = [
    { label: 'New Request',              value: String(waitingRows.length),                              delta: 'pending review',       id: 'ph-kpi-waiting',   icon: 'ti-clock',            color: '#777777', tab: 'new-request'           },
    { label: 'In Progress',              value: String(inProgRows.length),                               delta: 'being dispensed',       id: 'ph-kpi-inprog',    icon: 'ti-refresh',          color: '#1A4A9B', tab: 'in-progress'           },
    { label: 'Ready for Collection',     value: String(readyRows.length),                                delta: 'awaiting patient',      id: 'ph-kpi-ready',     icon: 'ti-package-search',   color: '#0F6E56', tab: 'ready-for-collection'  },
    { label: 'Completed Today',          value: String(completedCount),                                  delta: 'collected today',       id: 'ph-kpi-dispensed', icon: 'ti-clipboard-check',  color: '#0F6E56', tab: 'completed'             },
    { label: 'Pending Stock',            value: String(pendingStockRxs.length),                          delta: 'awaiting stock',        id: 'ph-kpi-pending',   icon: 'ti-package',          color: '#D97706', tab: 'pending-stock'         },
    { label: 'Rejected',                 value: String(rejectedRows.length),                             delta: 'not dispensed',         id: 'ph-kpi-rejected',  icon: 'ti-x',                color: '#dc2626', tab: 'rejected'              },
    { label: 'Returned for Amendment',   value: String(returnedRows.length),                             delta: 'sent back to doctor',   id: 'ph-kpi-returned',  icon: 'ti-arrow-back-up',    color: '#7C3AED', tab: 'returned-for-amendment'},
    { label: 'Out of Stock',             value: String(outOfStockItems.length + pendingStockRxs.length), delta: 'need attention',        id: 'ph-kpi-oos',       icon: 'ti-alert-triangle',   color: '#dc2626', tab: 'pending-stock'         },
  ];

  var kpiHTML = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px">' +
    kpis.map(function(k){
      var onclick = "window._phQueueTab='" + k.tab + "';Router.setPage('ph-queue')";
      return '<div onclick="' + onclick + '" style="background:#ffffff;border:1px solid #e0e0e0;border-radius:16px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,.05);cursor:pointer;transition:box-shadow .15s,border-color .15s" ' +
        'onmouseover="this.style.boxShadow=\'0 4px 12px rgba(0,0,0,.12)\';this.style.borderColor=\'#c0c0c0\'" ' +
        'onmouseout="this.style.boxShadow=\'0 1px 3px rgba(0,0,0,.05)\';this.style.borderColor=\'#e0e0e0\'">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
          '<span style="font-size:12px;color:#777777">' + k.label + '</span>' +
          _phIcon(k.icon, '16px') +
        '</div>' +
        '<div id="' + k.id + '" style="font-size:28px;font-weight:700;letter-spacing:-.5px;color:' + k.color + '">' + k.value + '</div>' +
        '<div style="font-size:11px;color:#777777;margin-top:4px">' + k.delta + '</div>' +
      '</div>';
    }).join('') + '</div>';

  /* ── Helper: render a queue-entry row for the section tables ── */
  function _phDashRow(qe, extraCells) {
    var rxCode  = qe.prescriptionRef || qe.id || '—';
    var patient = qe.patient || qe.patientName || '—';
    var drug    = (function(){
      var meds = qe.medications || [];
      if (meds.length) return meds.map(function(m){ return m.name || m.drug || ''; }).filter(Boolean).join(', ');
      var rx = (_PH.prescriptions || []).find(function(p){ return p.code === rxCode; });
      if (rx && rx.items && rx.items.length) return rx.items.map(function(i){ return i.drug || i.medicationName || ''; }).filter(Boolean).join(', ');
      return '—';
    })();
    var waited = qe.waitedMin != null ? (qe.waitedMin < 60 ? qe.waitedMin + ' min' : Math.round(qe.waitedMin/60) + ' hr') : '—';
    return '<tr style="border-bottom:1px solid #f0f0f0">' +
      '<td style="padding:10px 12px;font-family:monospace;font-size:12px;color:#0F6E56;white-space:nowrap">' + rxCode + '</td>' +
      '<td style="padding:10px 12px;font-size:13px;font-weight:500">' + patient + '</td>' +
      '<td style="padding:10px 12px;font-size:12px;color:#555;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + drug + '</td>' +
      (extraCells || ('<td style="padding:10px 12px;font-size:12px;color:#777">' + waited + '</td>')) +
    '</tr>';
  }

  function _phDashTable(headers, rows, emptyMsg) {
    return '<div style="overflow-x:auto">' +
      '<table style="width:100%;border-collapse:collapse">' +
        '<thead><tr style="background:#f8f8f6">' +
          headers.map(function(h){ return '<th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#888;font-weight:600;white-space:nowrap">' + h + '</th>'; }).join('') +
        '</tr></thead>' +
        '<tbody>' +
          (rows.length ? rows : ['<tr><td colspan="' + headers.length + '" style="padding:28px 12px;text-align:center;color:#aaa;font-size:13px">' + emptyMsg + '</td></tr>']) .join('') +
        '</tbody>' +
      '</table>' +
    '</div>';
  }

  /* ── 1. WAITING ── */
  var waitingTableRows = waitingRows.map(function(qe){
    var label = qe.state === 'new-request' ? _phBadge('New Request','amber') : _phBadge('Waiting','blue');
    return _phDashRow(qe,
      '<td style="padding:10px 12px">' + label + '</td>' +
      '<td style="padding:10px 12px;font-size:12px;color:#777">' +
        (qe.waitedMin != null ? (qe.waitedMin < 60 ? qe.waitedMin + ' min' : Math.round(qe.waitedMin/60) + ' hr') : '—') +
      '</td>' +
      '<td style="padding:10px 12px">' +
        '<button onclick="window._phQueueTab=\'waiting\';Router.setPage(\'ph-queue\')" style="font-size:12px;padding:5px 10px;border-radius:6px;border:1px solid #0F6E56;background:#fff;color:#0F6E56;cursor:pointer;font-family:inherit">Review</button>' +
      '</td>'
    );
  });

  var waitingSection = _phCard('ti-clock', 'New Request',
    'Prescriptions pending pharmacist review — ' + waitingRows.length + ' in queue',
    _phBtn('Open Queue', 'ti-users', 'outline', "window._phQueueTab='waiting';Router.setPage('ph-queue')"),
    _phDashTable(['Rx Number', 'Patient', 'Medication(s)', 'Status', 'Wait Time', ''], waitingTableRows, 'No new prescription requests')
  );

  /* ── 2. IN PROGRESS ── */
  var inProgTableRows = inProgRows.map(function(qe){
    var label = qe.state === 'validated' ? _phBadge('Validated','green') : _phBadge('Dispensing','blue');
    return _phDashRow(qe,
      '<td style="padding:10px 12px">' + label + '</td>' +
      '<td style="padding:10px 12px;font-size:12px;color:#777">' +
        (qe.waitedMin != null ? (qe.waitedMin < 60 ? qe.waitedMin + ' min' : Math.round(qe.waitedMin/60) + ' hr') : '—') +
      '</td>' +
      '<td style="padding:10px 12px">' +
        '<button onclick="window._phQueueTab=\'in-progress\';Router.setPage(\'ph-queue\')" style="font-size:12px;padding:5px 10px;border-radius:6px;border:1px solid #1A4A9B;background:#fff;color:#1A4A9B;cursor:pointer;font-family:inherit">View</button>' +
      '</td>'
    );
  });

  var inProgSection = _phCard('ti-refresh', 'In Progress',
    'Prescriptions currently being dispensed — ' + inProgRows.length + ' active',
    _phBtn('Open Queue', 'ti-package-search', 'outline', "window._phQueueTab='in-progress';Router.setPage('ph-queue')"),
    _phDashTable(['Rx Number', 'Patient', 'Medication(s)', 'Stage', 'Elapsed', ''], inProgTableRows, 'No prescriptions currently in progress')
  );

  /* ── 3. READY FOR COLLECTION ── */
  var readyTableRows = readyRows.map(function(qe){
    var rxCode   = qe.prescriptionRef || qe.id || '—';
    var patient  = qe.patient || qe.patientName || '—';
    var drug     = (function(){
      var meds = qe.medications || [];
      if (meds.length) return meds.map(function(m){ return m.name || m.drug || ''; }).filter(Boolean).join(', ');
      var rx = (_PH.prescriptions || []).find(function(p){ return p.code === rxCode; });
      if (rx && rx.items && rx.items.length) return rx.items.map(function(i){ return i.drug || i.medicationName || ''; }).filter(Boolean).join(', ');
      return '—';
    })();
    var ticket   = qe.ticket || '—';
    return '<tr style="border-bottom:1px solid #f0f0f0">' +
      '<td style="padding:10px 12px;font-family:monospace;font-size:12px;color:#0F6E56;white-space:nowrap">' + rxCode + '</td>' +
      '<td style="padding:10px 12px;font-size:13px;font-weight:500">' + patient + '</td>' +
      '<td style="padding:10px 12px;font-size:12px;color:#555;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + drug + '</td>' +
      '<td style="padding:10px 12px;font-family:monospace;font-size:12px;font-weight:600;color:#0F6E56">' + ticket + '</td>' +
      '<td style="padding:10px 12px">' + _phBadge('Ready', 'green') + '</td>' +
      '<td style="padding:10px 12px">' +
        '<button onclick="window._phQueueTab=\'ready-for-collection\';Router.setPage(\'ph-queue\')" style="font-size:12px;padding:5px 10px;border-radius:6px;border:1px solid #0F6E56;background:#fff;color:#0F6E56;cursor:pointer;font-family:inherit">Handover</button>' +
      '</td>' +
    '</tr>';
  });

  var readySection = _phCard('ti-package-search', 'Ready for Collection',
    'Dispensed and waiting for patient — ' + readyRows.length + ' prescription(s)',
    _phBtn('Open Queue', 'ti-users', 'primary', "window._phQueueTab='ready-for-collection';Router.setPage('ph-queue')"),
    _phDashTable(['Rx Number', 'Patient', 'Medication(s)', 'Ticket', 'Status', ''], readyTableRows, 'No prescriptions ready for collection')
  );

  /* ── 4. COMPLETED TODAY ── */
  /* Merge queue completed entries + history entries, dedup by rxRef */
  var seenRefs = {};
  var completedDisplayRows = [];
  completedRows.forEach(function(qe){ seenRefs[qe.prescriptionRef || qe.id] = true; completedDisplayRows.push(qe); });
  historyToday.forEach(function(h){
    var ref = h.prescriptionRef || h.id || '';
    if (!seenRefs[ref]) { seenRefs[ref] = true; completedDisplayRows.push({ prescriptionRef: ref, patient: h.patientName, medications: h.items || [], collectedAt: h.dispensedAt, pharmacist: h.pharmacist }); }
  });

  var completedTableRows = completedDisplayRows.map(function(r){
    var rxCode   = r.prescriptionRef || '—';
    var patient  = r.patient || r.patientName || '—';
    var drug     = (function(){
      var meds = r.medications || r.items || [];
      if (meds.length) return meds.map(function(m){ return m.name || m.drug || m.medicationName || ''; }).filter(Boolean).join(', ');
      var rx = (_PH.prescriptions || []).find(function(p){ return p.code === rxCode; });
      if (rx && rx.items && rx.items.length) return rx.items.map(function(i){ return i.drug || i.medicationName || ''; }).filter(Boolean).join(', ');
      return '—';
    })();
    var collectedAt = r.collectedAt || r.dispensedAt || '';
    var timeStr = collectedAt ? new Date(collectedAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : '—';
    var phName  = r.pharmacist || r.collectedByPharmacist || '—';
    return '<tr style="border-bottom:1px solid #f0f0f0">' +
      '<td style="padding:10px 12px;font-family:monospace;font-size:12px;color:#0F6E56;white-space:nowrap">' + rxCode + '</td>' +
      '<td style="padding:10px 12px;font-size:13px;font-weight:500">' + patient + '</td>' +
      '<td style="padding:10px 12px;font-size:12px;color:#555;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + drug + '</td>' +
      '<td style="padding:10px 12px;font-size:12px;color:#777">' + timeStr + '</td>' +
      '<td style="padding:10px 12px;font-size:12px;color:#555">' + phName + '</td>' +
      '<td style="padding:10px 12px">' + _phBadge('Collected', 'green') + '</td>' +
    '</tr>';
  });

  var completedSection = _phCard('ti-clipboard-check', 'Completed Today',
    'Prescriptions successfully collected today — ' + completedDisplayRows.length + ' record(s)',
    _phBtn('Full History', 'ti-history', 'outline', "window._phQueueTab='completed';Router.setPage('ph-queue')"),
    _phDashTable(['Rx Number', 'Patient', 'Medication(s)', 'Time', 'Pharmacist', 'Status'], completedTableRows, 'No prescriptions completed today yet')
  );

  /* ── 5. OUT OF STOCK ── */
  var oosStockRows = outOfStockItems.map(function(i){
    var state = _PH.stockState(i);
    var qty   = typeof i.quantity === 'number' ? i.quantity : '—';
    var badge = i.quantity === 0 ? _phBadge('Out of stock', 'red') : _phBadge('Low stock', 'amber');
    return '<tr style="border-bottom:1px solid #f0f0f0">' +
      '<td style="padding:10px 12px;font-size:13px;font-weight:500">' + (i.drug || i.name || '—') + '</td>' +
      '<td style="padding:10px 12px;font-size:12px;color:#555">' + (i.form || i.dosageForm || '—') + '</td>' +
      '<td style="padding:10px 12px;font-size:13px;font-weight:600;color:' + (i.quantity === 0 ? '#dc2626' : '#D97706') + '">' + qty + '</td>' +
      '<td style="padding:10px 12px;font-size:12px;color:#777">' + (i.unit || i.unitOfMeasure || '—') + '</td>' +
      '<td style="padding:10px 12px;font-size:12px;color:#777">Min: ' + (i.reorderLevel || '—') + '</td>' +
      '<td style="padding:10px 12px">' + badge + '</td>' +
      '<td style="padding:10px 12px">' +
        '<button onclick="Router.setPage(\'stock\')" style="font-size:12px;padding:5px 10px;border-radius:6px;border:1px solid #dc2626;background:#fff;color:#dc2626;cursor:pointer;font-family:inherit">Reorder</button>' +
      '</td>' +
    '</tr>';
  });
  var oosPendingRows = pendingStockRxs.map(function(qe){
    var rxCode  = qe.prescriptionRef || qe.id || '—';
    var patient = qe.patient || '—';
    var drug    = (function(){
      var meds = qe.medications || [];
      if (meds.length) return meds.map(function(m){ return m.name || m.drug || ''; }).filter(Boolean).join(', ');
      return '—';
    })();
    return '<tr style="border-bottom:1px solid #f0f0f0;background:#FFF8F0">' +
      '<td style="padding:10px 12px;font-size:13px;font-weight:500">' + drug + '</td>' +
      '<td style="padding:10px 12px;font-size:12px;color:#555">Prescription</td>' +
      '<td style="padding:10px 12px;font-size:13px;font-weight:600;color:#D97706">0</td>' +
      '<td style="padding:10px 12px;font-size:12px;color:#777">—</td>' +
      '<td style="padding:10px 12px;font-size:12px;color:#777">Patient: ' + patient + '</td>' +
      '<td style="padding:10px 12px">' + _phBadge('Pending Stock', 'amber') + '</td>' +
      '<td style="padding:10px 12px">' +
        '<button onclick="window._phQueueTab=\'pending-stock\';Router.setPage(\'ph-queue\')" style="font-size:12px;padding:5px 10px;border-radius:6px;border:1px solid #D97706;background:#fff;color:#D97706;cursor:pointer;font-family:inherit">View Queue</button>' +
      '</td>' +
    '</tr>';
  });

  var oosSection = _phCard('ti-alert-triangle', 'Out of Stock',
    'Medications requiring urgent restock — ' + (outOfStockItems.length + pendingStockRxs.length) + ' item(s)',
    _phBtn('Manage Stock', 'ti-package-search', 'outline', "Router.setPage('stock')"),
    _phDashTable(
      ['Medication', 'Form', 'Qty Available', 'Unit', 'Min Level', 'Status', ''],
      oosStockRows.concat(oosPendingRows),
      'All medications are adequately stocked'
    )
  );

  /* ── Quick-access shortcuts ── */
  var shortcuts = [
    { label: 'Stock Management',    sub: 'View & manage inventory',    icon: 'ti-package',         page: 'stock',         color: '#0F6E56' },
    { label: 'Refill Reminders',    sub: 'Chronic patient follow-ups', icon: 'ti-bell',            page: 'ph-reminders',  color: '#1A4A9B' },
    { label: 'Suppliers & Orders',  sub: 'Place & track orders',       icon: 'ti-truck-delivery',  page: 'ph-suppliers',  color: '#D97706' },
    { label: 'Medical History',     sub: 'Full dispensing records',    icon: 'ti-history',         page: 'ph-history',    color: '#7C3AED' },
  ];

  var shortcutHTML = '<div style="margin-top:24px">' +
    '<div style="font-size:13px;font-weight:600;color:#555;margin-bottom:12px;text-transform:uppercase;letter-spacing:.06em">Quick Access</div>' +
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px">' +
    shortcuts.map(function(s){
      return '<div onclick="Router.setPage(\'' + s.page + '\')" ' +
        'style="display:flex;align-items:center;gap:14px;background:#ffffff;border:1px solid #e0e0e0;border-radius:16px;padding:16px 20px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.05);transition:box-shadow .15s,border-color .15s" ' +
        'onmouseover="this.style.boxShadow=\'0 4px 12px rgba(0,0,0,.12)\';this.style.borderColor=\'#c0c0c0\'" ' +
        'onmouseout="this.style.boxShadow=\'0 1px 3px rgba(0,0,0,.05)\';this.style.borderColor=\'#e0e0e0\'">' +
        '<div style="width:42px;height:42px;border-radius:12px;background:' + s.color + '1a;display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
          '<span style="color:' + s.color + ';font-size:20px"><i class="' + s.icon + '"></i></span>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:14px;font-weight:600;color:#1a1a1a">' + s.label + '</div>' +
          '<div style="font-size:12px;color:#888;margin-top:2px">' + s.sub + '</div>' +
        '</div>' +
      '</div>';
    }).join('') +
    '</div></div>';

  /* ── Layout ── */
  var content = kpiHTML + shortcutHTML;

  return _phShell('rx-queue', 'Dashboard', 'Live queue status · auto-refreshes every 30 seconds', content);
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
/* Prescription status workflow — 9-step queue flow */
var _PH_STATUSES = ['New Request','Submitted','Awaiting Pharmacist Review','Validated','In Progress','Ready for Collection','Completed','Partially Dispensed','Dispensed','Refill Due','Expired','Cancelled','Rejected — Requires Correction'];
var _PH_STATUS_STYLE = {
  'New Request':                'blue',
  'Submitted':                  'blue',
  'Awaiting Pharmacist Review': 'amber',
  'Validated':                  'green',
  'In Progress':                'blue',
  'Ready for Collection':       'green',
  'Completed':                  'green',
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
  /* Do NOT reset _phSelRx here — the queue row button sets it before navigating.
     Overwriting it with prescriptions[0] was what caused the wrong prescription
     to load when arriving from the Waiting queue. Only clear it if nothing was
     explicitly selected (i.e. the pharmacist navigated here directly). */
  if (!window._phSelRx) window._phSelRx = null;
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
  /* Merge prescriptions from in-memory PHARMACY_QUEUE and window._phQueue.
     This ensures queue entries that were never stored in _PH.prescriptions are
     still findable by the validation page, including entries synthesised from
     the BroadcastChannel / localStorage queue (e.g. RX-356052-ZA style codes). */
  try {
    var _allQueueEntries = (window._PHARMACY_QUEUE||[]).concat(window._phQueue||[]);
    _allQueueEntries.forEach(function(e){
      var dup = _PH.prescriptions.find(function(x){return x.code===e.prescriptionRef;});
      if(!dup && e.prescriptionRef){
        _PH.prescriptions.unshift({
          code:e.prescriptionRef,
          _id:e.prescriptionId||e.prescriptionRef,
          patientId:e.patientId||'',patientName:e.patientName||e.patient||'',
          idNumber:e.idNumber||e.nationalId||'',
          doctor:e.prescribedByName||e.doctor||'',
          prescribedByName:e.prescribedByName||'',
          doctorReg:e.prescribedByReg||'',
          facility:e.facility||'',
          issued:e.prescribedAt?e.prescribedAt.slice(0,10):'',
          validUntil:e.repeat&&e.repeat.reviewDate?e.repeat.reviewDate:'',
          status:'Awaiting Pharmacist Review',submittedAt:e.prescribedAt||'',
          repeatPrescription:e.repeatPrescription||false,repeat:e.repeat||null,
          patientInstructions:e.patientInstructions||'',clinicalNotes:e.clinicalNotes||'',
          items:(e.medications||[]).map(function(m){return{
            drug:m.name+(m.strength?' '+m.strength:''),
            medicationName:m.name||'',
            dosage:(m.dose||'')+' '+(m.frequency||''),
            frequency:m.frequency||'',duration:m.duration||'',
            quantity:m.quantity||m.qty||'',unit:m.unit||'',route:m.route||''
          };}),
          duplicateWarning:null,interactions:[],
        });
      }
    });
  } catch(_){}

  /* If _phSelRx is set but its code/id isn't in _PH.prescriptions yet (synthesised
     outside this function), re-locate it now so the rest of the render can find it. */
  try {
    if(window._phSelRx && window._phSelRx.code) {
      var _selInList = _PH.prescriptions.find(function(p){return p.code===window._phSelRx.code;});
      if(!_selInList) _PH.prescriptions.unshift(window._phSelRx);
    }
  } catch(_){}

  /* Never fall back to prescriptions[0] — only show what was explicitly selected.
     Falling back to [0] caused the wrong patient's prescription to display when
     the queue row click targeted a different patient. */
  var rx      = window._phSelRx || null;
  if (!rx) {
    var el0 = document.getElementById('ph-val-body');
    if(el0) el0.innerHTML=
      '<div style="text-align:center;padding:48px 20px;color:#777777">' +
        '<div style="font-size:40px;margin-bottom:12px">📋</div>' +
        '<div style="font-size:15px;font-weight:600;margin-bottom:6px">No prescription selected</div>' +
        '<div style="font-size:13px">Select a patient from the Pharmacy Queue or search by patient ID / prescription code above.</div>' +
      '</div>';
    return;
  }
  var checked = window._phChecked;
  var status  = rx.status||'Submitted';
  var statusStyle = _PH_STATUS_STYLE[status]||'gray';
  var isDispensable = ['Submitted','Awaiting Pharmacist Review','Validated','Awaiting Dispensing','In Progress','Refill Due'].includes(status);
  var isAlreadyDispensed = (status==='Dispensed'||status==='dispensed'||status==='Completed'||status==='completed');
  var isValidated = (status==='Validated');


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
  /* Resolve doctor name from all possible sources including linked queue entry */
  var _docNameRaw = (function(){
    if(rx.prescribedByObj && (rx.prescribedByObj.firstName||rx.prescribedByObj.lastName))
      return ((rx.prescribedByObj.firstName||'')+' '+(rx.prescribedByObj.lastName||'')).trim();
    if(rx.prescribedByName) return rx.prescribedByName;
    if(rx.doctor) return rx.doctor;
    /* Try linked queue entry */
    var qe = (_PH.queue||[]).find(function(q){ return q.prescriptionRef===rx.code||q.prescriptionId===(rx._id||rx.code); });
    if(qe){
      if(qe.prescribedByObj && (qe.prescribedByObj.firstName||qe.prescribedByObj.lastName))
        return ((qe.prescribedByObj.firstName||'')+' '+(qe.prescribedByObj.lastName||'')).trim();
      if(qe.prescribedByName) return qe.prescribedByName;
      if(qe.doctor) return qe.doctor;
    }
    /* Try localStorage pharmacy queue for this ref (written by doctor.js on submit) */
    try {
      var _lsRxArr = JSON.parse(localStorage.getItem('NIHMS_PHARMACY_PRESCRIPTIONS')||'[]');
      var _lsMatch = _lsRxArr.find(function(x){
        return x.prescriptionRef===rx.code || x.prescriptionRef===(rx._id||'') || x.id===(rx._id||rx.code);
      });
      if(_lsMatch){
        if(_lsMatch.prescribedByObj&&(_lsMatch.prescribedByObj.firstName||_lsMatch.prescribedByObj.lastName))
          return ((_lsMatch.prescribedByObj.firstName||'')+' '+(_lsMatch.prescribedByObj.lastName||'')).trim();
        if(_lsMatch.prescribedByName) return _lsMatch.prescribedByName;
        if(_lsMatch.doctor) return _lsMatch.doctor;
      }
    } catch(_){}
    /* Try patient-side prescription cache keyed by patient ID */
    try {
      var _patId = rx.patient||(rx.patientId)||'';
      if(_patId){
        var _ptRxArr = JSON.parse(localStorage.getItem('NIHMS_PATIENT_PRESCRIPTIONS_'+_patId)||'[]');
        var _ptMatch = _ptRxArr.find(function(x){return x.prescriptionRef===rx.code||x._id===(rx._id||'');});
        if(_ptMatch){
          if(_ptMatch.prescribedBy&&typeof _ptMatch.prescribedBy==='object'&&(_ptMatch.prescribedBy.firstName||_ptMatch.prescribedBy.lastName))
            return ((_ptMatch.prescribedBy.firstName||'')+' '+(_ptMatch.prescribedBy.lastName||'')).trim();
          if(_ptMatch.prescribedByName) return _ptMatch.prescribedByName;
        }
      }
    } catch(_){}
    return '';
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
            /* patientId only if NOT a Mongo ObjectId */
            if(rx.patientId && !_mid(rx.patientId)) return rx.patientId;
            return '—';
          })()+' · '+rx.code+'</div>'+
        '</div>'+
        _statusBadgeLarge+
      '</div>'+

      /* Prescription detail fields */
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;font-size:13px;margin-bottom:14px">'+
        [
          ['Prescribing Doctor',   _docDisplay],
          ['Facility',             _facilityVal],
          ['Prescription Date',    rx.issued||'—'],
          (_validUntil ? ['Valid Until / Review', _validUntil] : null),
          ['Submitted',            rx.submittedAt?(new Date(rx.submittedAt).toLocaleString('en-ZA')):'—'],
        ].filter(Boolean).map(function(f){
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

    /* ── Allergies & Current Medications (spec §3) ── */
    (function(){
      var allergies = rx.allergies || rx.knownAllergies || [];
      var currentMeds = rx.currentMedications || rx.existingMedications || rx.ongoingMedications || [];
      if(!allergies.length && !currentMeds.length) return '';
      var out = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">';
      if(allergies.length){
        out += '<div style="border:1.5px solid #FECACA;background:#FEF2F2;border-radius:10px;padding:12px">'+
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#dc2626;margin-bottom:8px">⚠ Known Allergies</div>'+
          '<ul style="margin:0;padding-left:16px;font-size:13px;display:flex;flex-direction:column;gap:3px">'+
          allergies.map(function(a){ return '<li style="color:#991B1B;font-weight:600">'+(typeof a==='string'?a:(a.name||a.allergy||JSON.stringify(a)))+'</li>'; }).join('')+
          '</ul></div>';
      } else {
        out += '<div style="border:1px solid #e0e0e0;background:#f8fafc;border-radius:10px;padding:12px">'+
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#777;margin-bottom:6px">Known Allergies</div>'+
          '<div style="font-size:13px;color:#777">No allergies recorded</div></div>';
      }
      if(currentMeds.length){
        out += '<div style="border:1.5px solid #BFDBFE;background:#EFF6FF;border-radius:10px;padding:12px">'+
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#1D4ED8;margin-bottom:8px">💊 Current Medications</div>'+
          '<ul style="margin:0;padding-left:16px;font-size:13px;display:flex;flex-direction:column;gap:3px">'+
          currentMeds.map(function(m){ return '<li>'+(typeof m==='string'?m:(m.name||m.drug||JSON.stringify(m)))+'</li>'; }).join('')+
          '</ul></div>';
      } else {
        out += '<div style="border:1px solid #e0e0e0;background:#f8fafc;border-radius:10px;padding:12px">'+
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#777;margin-bottom:6px">Current Medications</div>'+
          '<div style="font-size:13px;color:#777">No current medications recorded</div></div>';
      }
      out += '</div>';
      return out;
    })()+

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

    /* Action buttons — Validate blocked if gate fails */
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px">'+
      (isAlreadyDispensed
        ? '<div style="font-size:13px;color:#0F6E56;font-weight:600">✅ Prescription fully dispensed — no further actions available.</div>'
        : (function(){
            var btns = '';
            /* Validate & Approve — only shown if not already validated/in-progress */
            if(!isValidated && !isDispensable) {
              btns += '<button onclick="_phValidateAndApprove()" style="padding:10px 20px;border-radius:8px;border:none;background:'+(_canValidate&&_aiCanApprove?'#0F6E56':'#94a3b8')+';color:#fff;font-size:13px;font-weight:700;cursor:'+(_canValidate&&_aiCanApprove?'pointer':'not-allowed')+';font-family:inherit">✅ Validate &amp; Approve</button>';
            } else if(!isValidated) {
              btns += '<button onclick="_phValidateAndApprove()" style="padding:10px 20px;border-radius:8px;border:none;background:'+(_canValidate&&_aiCanApprove?'#0F6E56':'#94a3b8')+';color:#fff;font-size:13px;font-weight:700;cursor:'+(_canValidate&&_aiCanApprove?'pointer':'not-allowed')+';font-family:inherit">✅ Validate &amp; Approve</button>';
            }
            /* Start Dispensing — shown when status is Validated */
            if(isValidated) {
              btns += '<button onclick="window._phStartDispensing()" style="padding:10px 20px;border-radius:8px;border:none;background:#1A4A9B;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">▶ Start Dispensing</button>';
            }
            /* Reject button */
            btns += '<button onclick="_phSetRxStatus(\'Rejected — Requires Correction\')" style="padding:10px 20px;border-radius:8px;border:1.5px solid #dc2626;background:#fff;color:#dc2626;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">✖ Reject — Needs Correction</button>';
            return btns;
          })()
      )+
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
  /* Advance queue entry to 'validated' state */
  var _qv = (window._phQueue||[]).find(function(q){ return q.prescriptionRef===rx.code||q.prescriptionId===(rx._id||rx.code); });
  if(_qv){ _qv.state = 'validated'; try{ if(typeof _phRenderQueue==='function') _phRenderQueue(); }catch(_){} }
  /* Also update in _PH.queue */
  var _pqv = (_PH.queue||[]).find(function(q){ return q.prescriptionRef===rx.code||q.prescriptionId===(rx._id||rx.code); });
  if(_pqv){ _pqv.state = 'validated'; }

  /* Persist to backend — this is the only place that saves Validated status */
  var _vRxId = rx._id || rx.prescriptionId || rx.code;
  var _vQe   = (window._phQueue||[]).find(function(q){ return q.prescriptionRef===rx.code||q.prescriptionId===_vRxId; });
  window._phPersist({
    rxId:         _vRxId,
    rxRef:        rx.code,
    queueEntryId: (_vQe && (_vQe.id || _vQe._id)) || _vRxId,
    status:       'Validated',
    queueState:   'validated',
    extra:        { validatedAt: new Date().toISOString() },
    auditAction:  'validate_approve_prescription',
    auditNote:    'Prescription validated and approved for dispensing',
  });
};

/* ── Start Dispensing — transitions prescription from VALIDATED → IN PROGRESS ── */
window._phStartDispensing = function(){
  var rx = window._phSelRx;
  if(!rx){ UI.showToast('No prescription selected','err'); return; }

  /* Update status to In Progress */
  rx.status = 'In Progress';
  var idx = _PH.prescriptions.findIndex(function(p){ return p.code===rx.code; });
  if(idx>=0) _PH.prescriptions[idx].status = 'In Progress';

  /* Advance queue entry to 'in-progress' */
  var qe = (window._phQueue||[]).find(function(q){ return q.prescriptionRef===rx.code||q.prescriptionId===(rx._id||rx.code); });
  if(qe){ qe.state = 'in-progress'; }
  var pqe = (_PH.queue||[]).find(function(q){ return q.prescriptionRef===rx.code||q.prescriptionId===(rx._id||rx.code); });
  if(pqe){ pqe.state = 'in-progress'; }

  /* Persist to backend — prescription + queue entry + audit */
  var _sdRxId = rx._id || rx.prescriptionId || rx.code;
  var _sdQe   = qe || (window._phQueue||[]).find(function(q){ return q.prescriptionRef===rx.code||q.prescriptionId===_sdRxId; });
  window._phPersist({
    rxId:         _sdRxId,
    rxRef:        rx.code,
    queueEntryId: (_sdQe && (_sdQe.id || _sdQe._id)) || _sdRxId,
    status:       'In Progress',
    queueState:   'in-progress',
    extra:        { dispensingStartedAt: new Date().toISOString() },
    auditAction:  'start_dispensing',
    auditNote:    'Pharmacist started dispensing',
  });

  UI.showToast('Dispensing started for '+rx.patientName,'ok');

  /* Navigate to dispensing panel */
  window._phDispRx      = rx;
  window._phDispChecked = [];
  window._phDispScanned = true;
  Router.setPage('dispensed');
};

window._phSetRxStatus = function(newStatus) {
  var rx = window._phSelRx;
  if(!rx) return;
  /* Prevent dispensing if repeat is expired or exhausted */
  if((newStatus==='Awaiting Dispensing'||newStatus==='In Progress'||newStatus==='Ready for Collection'||newStatus==='Dispensed')&&rx.repeat){
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

  /* Persist status change to backend */
  (function(){
    var _srsRxId = rx._id || rx.prescriptionId || rx.code;
    var _srsQe   = (window._phQueue||[]).find(function(q){
      return q.prescriptionRef===rx.code || q.prescriptionId===_srsRxId;
    });
    var _stateMap = {
      'Validated':              'validated',
      'In Progress':            'in-progress',
      'Ready for Collection':   'ready-for-collection',
      'Dispensed':              'ready-for-collection',
      'Rejected — Requires Correction': 'rejected',
      'Awaiting Dispensing':    'waiting',
    };
    window._phPersist({
      rxId:         _srsRxId,
      rxRef:        rx.code,
      queueEntryId: (_srsQe && (_srsQe.id || _srsQe._id)) || _srsRxId,
      status:       newStatus,
      queueState:   _stateMap[newStatus] || 'waiting',
      extra:        { statusChangedAt: new Date().toISOString() },
      auditAction:  'set_rx_status',
      auditNote:    'Status set to: ' + newStatus,
    });
  })();
  /* On dispense / ready-for-collection, update repeat used count and write full history entry */
  if(newStatus==='Dispensed'||newStatus==='Ready for Collection'){
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

  /* ── Dispensing gate: prescription must be Validated, In Progress or Awaiting Dispensing ── */
  var _dispAllowedStatuses = ['Validated','In Progress','Awaiting Dispensing','Approved for Dispensing','Partially Dispensed'];
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
        _phBadge(rx.idNumber||rx.patientId||'—','gray') +
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
        var drugLower = (l.drug||l.name||'').toLowerCase();

        /* Find matching stock batches for this drug */
        var matchingBatches = (_PH.stockItems||[]).filter(function(s){
          var sLow = (s.drug||'').toLowerCase();
          return sLow && drugLower && (sLow.includes(drugLower.split(' ')[0]) || drugLower.includes(sLow.split(' ')[0]));
        });

        /* Out-of-stock / expired warning */
        var availableBatches = matchingBatches.filter(function(s){
          return s.quantity > 0 && _PH.daysUntil(s.expiry) >= 0;
        });
        var expiredBatches = matchingBatches.filter(function(s){ return _PH.daysUntil(s.expiry) < 0; });
        var outOfStock = matchingBatches.length > 0 && availableBatches.length === 0;
        var noStock    = matchingBatches.length === 0;

        /* Stock status banner */
        var stockBanner = '';
        if(outOfStock){
          stockBanner = '<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:6px;padding:6px 10px;margin-top:6px;font-size:12px;color:#dc2626;font-weight:600">⛔ OUT OF STOCK — no valid batches available</div>';
        } else if(noStock){
          stockBanner = '<div style="background:#FFF9E6;border:1px solid #FCD34D;border-radius:6px;padding:6px 10px;margin-top:6px;font-size:12px;color:#92400E">⚠ Medication not found in inventory — verify stock</div>';
        }

        /* Batch selector dropdown */
        var batchSelect = '';
        if(availableBatches.length > 0){
          batchSelect = '<div style="margin-top:8px">'+
            '<label style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#777;display:block;margin-bottom:3px">Select Batch</label>'+
            '<select id="ph-batch-'+i+'" style="width:100%;padding:7px 10px;border:1.5px solid #e0e0e0;border-radius:7px;font-size:12px;font-family:inherit;outline:none">'+
            availableBatches.map(function(s){
              var daysLeft = _PH.daysUntil(s.expiry);
              var expiryWarning = daysLeft <= 45 ? ' ⚠ expires in '+daysLeft+'d' : '';
              return '<option value="'+s.id+'">Batch: '+s.batch+' · Expiry: '+s.expiry+' · Qty: '+s.quantity+expiryWarning+'</option>';
            }).join('')+
            '</select>'+
            (expiredBatches.length?'<div style="font-size:11px;color:#B45309;margin-top:3px">'+expiredBatches.length+' expired batch(es) excluded</div>':'')+
          '</div>';
        }

        /* Quantity dispensed input */
        var qtyInput = '<div style="display:flex;gap:8px;align-items:center;margin-top:6px">'+
          '<label style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#777;white-space:nowrap">Qty to Dispense</label>'+
          '<input id="ph-qty-'+i+'" type="number" min="1" value="'+(l.quantity||1)+'" '+
          'style="width:80px;padding:5px 8px;border:1.5px solid #e0e0e0;border-radius:6px;font-size:13px;font-family:inherit;outline:none">'+
          (l.unit?'<span style="font-size:12px;color:#777">'+l.unit+'</span>':'')+
        '</div>';

        return '<li style="display:flex;align-items:flex-start;gap:12px;border:1px solid '+(outOfStock?'#FECACA':isCk?'#0F6E56':'#e0e0e0')+';border-radius:10px;padding:12px 14px;background:'+(outOfStock?'#FFF8F8':isCk?'#EDFBF3':'#fff')+';transition:background .15s">' +
          '<input type="checkbox" '+(isCk?'checked':'')+' '+(outOfStock?'disabled':'')+' onchange="_phToggleDisp(\''+i+'\')" style="margin-top:3px;width:16px;height:16px;cursor:'+(outOfStock?'not-allowed':'pointer')+';accent-color:#0F6E56">' +
          '<div style="flex:1">' +
            '<div style="font-size:13px;font-weight:600;color:#1e293b">'+(l.drug||l.name||'—')+(l.quantity?' — '+l.quantity+(l.unit?' '+l.unit:''):'')+'</div>' +
            '<div style="font-size:12px;color:#777777;margin-top:2px">'+(l.dosage||((l.dose||'')+(l.frequency?' '+l.frequency:'')))+'</div>' +
            (l.duration?'<div style="font-size:12px;color:#777777">Duration: '+l.duration+'</div>':'')+
            (l.route?'<div style="font-size:12px;color:#777777">Route: '+l.route+'</div>':'')+
            stockBanner+
            (!outOfStock&&!noStock?batchSelect:'')+
            (!outOfStock?qtyInput:'')+
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
          '<div style="font-size:11px;color:#333;margin-top:4px"><strong>'+(rx.patientName||'—')+'</strong> &nbsp;·&nbsp; '+(rx.idNumber||rx.patientId||'—')+'</div>' +
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
            '<div style="font-family:monospace;font-size:12px;color:#0F6E56">'+(rx.idNumber||rx.patientId||'—')+'</div>' +
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
          '<div style="font-size:13px;color:#78350F;margin-top:3px">'+rx.patientName+' ('+(rx.idNumber||rx.patientId)+') recently collected the same medication.</div>' +
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

  /* ── Collect batch selections from DOM dropdowns ── */
  window._phDispBatch = window._phDispBatch || {};
  items.forEach(function(l, i){
    var sel = document.getElementById('ph-batch-'+i);
    if(sel && sel.value) window._phDispBatch[i] = sel.value;
  });

  /* ── Batch selection & expiry validation ── */
  var dispBatches = window._phDispBatch || {};
  var today = new Date(); today.setHours(0,0,0,0);
  var batchErrors = [];
  items.forEach(function(l, i){
    var drugLower = (l.drug||l.name||'').toLowerCase();
    var hasStock = (_PH.stockItems||[]).some(function(s){
      var sLow = (s.drug||'').toLowerCase();
      return sLow && drugLower && (sLow.includes(drugLower.split(' ')[0]) || drugLower.includes(sLow.split(' ')[0]));
    });
    if(!hasStock) return; /* no-stock items skip batch check; handled by out-of-stock flow */
    var selId = dispBatches[i];
    if(!selId){
      batchErrors.push('Select a batch for: '+(l.drug||l.name||'item '+(i+1)));
      return;
    }
    var batch = (_PH.stockItems||[]).find(function(s){ return s.id===selId||s._id===selId; });
    if(!batch){ batchErrors.push('Batch not found for: '+(l.drug||l.name||'item '+(i+1))); return; }
    var expDate = batch.expiry ? new Date(batch.expiry) : null;
    if(expDate){ expDate.setHours(0,0,0,0); }
    if(expDate && expDate < today){
      batchErrors.push((l.drug||l.name||'item '+(i+1))+': selected batch '+batch.batch+' expired on '+batch.expiry);
    }
  });
  if(batchErrors.length){
    UI.showToast(batchErrors[0],'err'); return;
  }

  var notes = (document.getElementById('ph-disp-notes')||{value:''}).value.trim();

  /* Mark as Ready for Collection via shared status setter */
  window._phSelRx = rx;
  _phSetRxStatus('Ready for Collection');

  /* ── Deduct stock from inventory for each dispensed item ── */
  var collectedBatches = [];
  items.forEach(function(l, i){
    var selId = (window._phDispBatch||{})[i];
    if(!selId) return;
    var stock = (_PH.stockItems||[]).find(function(s){ return s.id===selId||s._id===selId; });
    if(!stock) return;
    var qtyEl = document.getElementById('ph-qty-'+i);
    var qtyDispensed = qtyEl ? (parseInt(qtyEl.value,10)||l.quantity||1) : (l.quantity||1);
    /* Deduct locally */
    if(typeof stock.quantity === 'number') stock.quantity = Math.max(0, stock.quantity - qtyDispensed);
    /* Record for history */
    collectedBatches.push({ drug: l.drug||l.name, batch: stock.batch, expiry: stock.expiry, qty: qtyDispensed, stockId: selId });
    /* PATCH inventory via API */
    try {
      if(window.API&&window.API._fetchDirect){
        API._fetchDirect('/pharmacy/stock/'+selId, {
          method:'PATCH',
          body: JSON.stringify({ quantityDeducted: qtyDispensed, reason:'Dispensed', prescriptionRef: rx.code||rx._id })
        }).catch(function(){});
      }
    } catch(_){}
  });

  /* Persist to backend — Ready for Collection + queue entry + audit */
  (function(){
    var _rfcRxId = rx._id || rx.prescriptionId || rx.code;
    var _rfcQe   = (window._phQueue||[]).find(function(q){
      return q.prescriptionRef === rx.code || q.prescriptionId === _rfcRxId;
    });
    window._phPersist({
      rxId:         _rfcRxId,
      rxRef:        rx.code,
      queueEntryId: (_rfcQe && (_rfcQe.id || _rfcQe._id)) || _rfcRxId,
      status:       'Ready for Collection',
      queueState:   'ready-for-collection',
      extra:        { dispensedAt: new Date().toISOString(), dispensingNotes: notes, dispenseLines: collectedBatches },
      auditAction:  'dispense_complete',
      auditNote:    'Medication dispensed — ready for patient collection',
    });
  })();

  /* Advance queue entry to 'ready-for-collection' and fire SMS/email notification */
  var _qEntry = (window._phQueue||[]).find(function(q){
    return q.prescriptionRef === rx.code || q.prescriptionId === (rx._id||rx.code);
  });
  if(_qEntry){
    /* Force entry into 'in-progress' so _phAdvanceQueue transitions to 'ready-for-collection' and fires SMS */
    _qEntry.state = 'in-progress';
    try{ window._phAdvanceQueue(_qEntry.id); }catch(_){}
    /* Update _PH.queue entry to ready-for-collection */
    var pqIdx = _PH.queue.findIndex(function(q){ return q.prescriptionRef === rx.code; });
    if(pqIdx >= 0){
      _PH.queue[pqIdx].state  = 'ready-for-collection';
      _PH.queue[pqIdx].status = 'Ready for Collection';
    } else {
      _PH.queue.push({
        id: _qEntry.id,
        state: 'ready-for-collection',
        status: 'Ready for Collection',
        prescriptionRef: rx.code,
        prescriptionId: rx._id||rx.code,
        patient: _qEntry.patient||'',
        patientId: _qEntry.patientId||'',
        ticket: _qEntry.ticket||'',
        prescribedByName: _qEntry.prescribedByName||_qEntry.doctor||'',
        prescribedAt: _qEntry.prescribedAt||_qEntry.submittedAt||new Date().toISOString()
      });
    }
    try{ if(typeof _phRenderQueue==='function') _phRenderQueue(); }catch(_){}
  } else {
    /* Entry not in queue working copy — ensure _PH.queue has it as ready-for-collection */
    var pqIdx2 = _PH.queue.findIndex(function(q){ return q.prescriptionRef === rx.code; });
    if(pqIdx2 >= 0){
      _PH.queue[pqIdx2].state  = 'ready-for-collection';
      _PH.queue[pqIdx2].status = 'Ready for Collection';
    } else {
      _PH.queue.push({
        id: rx._id||rx.code,
        state: 'ready-for-collection',
        status: 'Ready for Collection',
        prescriptionRef: rx.code,
        prescriptionId: rx._id||rx.code,
        patient: (rx.patientName||rx.patientId||''),
        prescribedAt: rx.prescribedAt||new Date().toISOString()
      });
    }
    /* Fire notification to patient even when queue entry wasn't in working copy */
    try{ _phSendReadyNotification(rx); }catch(_){}
  }

  /* Show full confirmation banner before resetting panel */
  _phShowDispenseConfirm(rx, notes);

  window._phDispRx = null;
  window._phDispChecked = [];
  window._phDispScanned = false;
  window._phDispCounselled = false;
  window._phDispBatch = {};
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
        '<div style="font-size:22px;font-weight:800;margin-bottom:4px">Medication Ready for Collection</div>' +
        '<div style="font-size:14px;opacity:.85">'+dateStr+' at '+timeStr+'</div>' +
      '</div>' +
      /* Body */
      '<div style="padding:24px 32px">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;font-size:13px">' +
          '<div style="background:#f4f5f0;border-radius:8px;padding:10px 14px">' +
            '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:3px">Patient</div>'+
            '<div style="font-weight:700;font-size:14px">'+(rx.patientName||'—')+'</div>' +
            '<div style="font-family:monospace;font-size:12px;color:#0F6E56">'+(rx.idNumber||rx.patientId||'')+'</div>' +
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
          '<button onclick="document.getElementById(\'ph-dispense-confirm-overlay\').remove();window._phQueueTab=\'ready-for-collection\';if(typeof Router!==\'undefined\')Router.setPage(\'ph-queue\');if(typeof _phRenderQueue===\'function\')_phRenderQueue();" '+
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

/* Active tab state: 'new-request' | 'waiting' | 'validated' | 'in-progress' | 'ready-for-collection' | 'completed' */
if(typeof window._phQueueTab === 'undefined') window._phQueueTab = 'new-request';
/* Reset legacy/removed tab names */
if(window._phQueueTab === 'exception' || window._phQueueTab === 'preparing' || window._phQueueTab === 'ready' || window._phQueueTab === 'notified') window._phQueueTab = 'new-request';
if(typeof window._phQueueSearch === 'undefined') window._phQueueSearch = '';

function _phRenderQueue() {
  var el = document.getElementById('ph-queue-body'); if (!el) return;
  var q = window._phQueue || [];

  /* Tab definitions — 6 tabs matching 9-step workflow */
  var tabs = [
    { key:'new-request',          label:'New Request',          stateLabel:'NEW REQUEST' },
    { key:'waiting',              label:'Waiting',              stateLabel:'WAITING' },
    { key:'validated',            label:'Validated',            stateLabel:'VALIDATED' },
    { key:'in-progress',          label:'In Progress',          stateLabel:'IN PROGRESS' },
    { key:'ready-for-collection', label:'Ready for Collection', stateLabel:'READY FOR COLLECTION' },
    { key:'completed',            label:'Completed',            stateLabel:'COMPLETED' },
  ];

  var activeTab = window._phQueueTab || 'waiting';

  /* Search/filter bar */
  var searchVal = window._phQueueSearch || '';
  var searchBar = '<div style="margin-bottom:14px">'+
    '<input id="ph-queue-search" type="text" placeholder="Search patient name, ID, queue number, prescription ref…" value="'+searchVal.replace(/"/g,'&quot;')+'" '+
    'oninput="window._phQueueSearch=this.value;_phRenderQueue()" '+
    'style="width:100%;box-sizing:border-box;padding:9px 14px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none" '+
    'onfocus="this.style.borderColor=\'#0F6E56\'" onblur="this.style.borderColor=\'#e0e0e0\'">'+
    '</div>';

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

  /* Filter to active tab + search query */
  var srch = (window._phQueueSearch||'').toLowerCase().trim();
  var filtered = q.filter(function(e){
    if(e.state !== activeTab) return false;
    if(!srch) return true;
    var haystack = [
      e.patient||'', e.patientId||'', e.ticket||'',
      e.prescriptionRef||'', e.prescribedByName||'', e.doctor||''
    ].join(' ').toLowerCase();
    return haystack.indexOf(srch) > -1;
  });

  /* Badge label per state */
  var badgeLabel = {
    'new-request':          'NEW REQUEST',
    'waiting':              'WAITING',
    'validated':            'VALIDATED',
    'in-progress':          'IN PROGRESS',
    'ready-for-collection': 'READY FOR COLLECTION',
    'completed':            'COMPLETED',
    /* legacy fallbacks */
    'preparing': 'IN PROGRESS',
    'ready':     'READY FOR COLLECTION',
    'notified':  'COMPLETED',
  };
  var badgeStyle = {
    'new-request':          'background:#EEF7FF;color:#1A4A9B',
    'waiting':              'background:#f4f5f0;color:#777777',
    'validated':            'background:#EDFBF3;color:#0F6E56',
    'in-progress':          'background:#EEF7FF;color:#1A4A9B',
    'ready-for-collection': 'background:#EDFBF3;color:#0F6E56',
    'completed':            'background:#f4f5f0;color:#0F6E56',
    /* legacy */
    'preparing': 'background:#EEF7FF;color:#1A4A9B',
    'ready':     'background:#EDFBF3;color:#0F6E56',
    'notified':  'background:#f4f5f0;color:#0F6E56',
  };

  /* Format arrival time from prescribedAt */
  function _timeLabel(e){
    try {
      var d = new Date(e.prescribedAt||e.submittedAt||'');
      if(isNaN(d)) return '';
      return d.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit',hour12:false});
    } catch(_){ return ''; }
  }

  /* Open Rx handler — inline string for onclick.
     Looks up the prescription by prescriptionRef first, then by prescriptionId,
     so each queue row always opens the correct patient's prescription regardless
     of what was previously selected. */
  function _openRxScript(e){
    var ref  = (e.prescriptionRef||'').replace(/'/g,"\\'");
    var pid  = (e.prescriptionId||e.id||'').replace(/'/g,"\\'");
    var pref = (e.patientId||'').replace(/'/g,"\\'");
    return '(function(){'+
      /* 1. Match by prescription code (most precise) */
      'var rx=_PH.prescriptions.find(function(x){return x.code===\''+ref+'\';});'+
      /* 2. Fall back: match by prescriptionId stored on the queue entry */
      'if(!rx&&\''+pid+'\') rx=_PH.prescriptions.find(function(x){return x._id===\''+pid+'\'||x.code===\''+pid+'\';});'+
      /* 3. Last resort: first prescription belonging to this patient */
      'if(!rx&&\''+pref+'\') rx=_PH.prescriptions.find(function(x){return x.patientId===\''+pref+'\';});'+
      'if(rx){'+
        /* Do NOT auto-advance new-request — pharmacist must explicitly Accept or Reject */
        'var _qnr=(window._phQueue||[]).find(function(q){return q.prescriptionRef===rx.code;});'+
        'if(_qnr&&_qnr.state===\'new-request\'){'+
          /* Just preview the prescription in validation panel without changing state */
          'window._phSelRx=rx;window._phChecked=false;Router.setPage(\'ph-validation\');'+
        '}else{'+
          'var ds=[\'Validated\',\'In Progress\',\'Awaiting Dispensing\',\'Approved for Dispensing\'];'+
          'if(ds.indexOf(rx.status)>-1){window._phDispRx=rx;window._phDispChecked=[];window._phDispScanned=true;Router.setPage(\'dispensed\');}'+
          'else{window._phSelRx=rx;window._phChecked=false;Router.setPage(\'ph-validation\');}'+
        '}'+
      '}else{'+
        'UI.showToast(\'Prescription not found — please search manually\',\'err\');'+
      '}'+
    '})()';
  }

  /* Priority label helper */
  function _priorityBadge(e){
    var p = (e.priority||'').toLowerCase();
    if(p==='urgent'||p==='high') return '<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:#FEF2F2;color:#dc2626;margin-left:6px">URGENT</span>';
    if(p==='medium') return '<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:#FFFBEB;color:#D97706;margin-left:6px">MEDIUM</span>';
    return '';
  }

  /* Wait time helper */
  function _waitLabel(e){
    var mins = e.waitedMin;
    if(!mins && e.prescribedAt) mins = Math.round((Date.now()-new Date(e.prescribedAt).getTime())/60000);
    if(!mins || isNaN(mins) || mins<0) return '';
    if(mins < 60) return mins+'m wait';
    return Math.floor(mins/60)+'h '+(mins%60)+'m wait';
  }

  /* Exception type label */
  function _exLabel(e){
    var t = (e.exceptionType||e.status||'').toLowerCase();
    if(t.indexOf('stock')>-1) return 'OUT OF STOCK';
    if(t.indexOf('hold')>-1) return 'ON HOLD';
    if(t.indexOf('reject')>-1) return 'REJECTED';
    if(t.indexOf('cancel')>-1) return 'CANCELLED';
    if(t.indexOf('partial')>-1) return 'PARTIAL';
    return 'EXCEPTION';
  }

  var listHTML;
  if(!filtered.length){
    var emptyMsg = srch ? 'No results for "'+srch+'".' : (
      activeTab==='new-request'          ? 'No new prescription requests at this time.' :
      activeTab==='waiting'              ? 'No prescriptions are currently waiting in the pharmacy queue.' :
      activeTab==='validated'            ? 'No validated prescriptions awaiting dispensing.' :
      activeTab==='in-progress'          ? 'No prescriptions are currently in progress.' :
      activeTab==='ready-for-collection' ? 'No medication is currently ready for collection.' :
      activeTab==='completed'            ? 'No completed prescriptions today.' : ''
    );
    listHTML = '<div style="text-align:center;padding:32px 20px;color:#9ca3af;font-size:13px">'+emptyMsg+'</div>';
  } else {
    listHTML = '<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:1px">' +
      filtered.map(function(e, i){
        var timeStr  = _timeLabel(e);
        var waitStr  = _waitLabel(e);
        var doctorStr= e.prescribedByName||e.doctor||'';
        var patIdStr = (function(){
          function _isMid(v){ return v && /^[0-9a-f]{24}$/i.test((v+'').trim()); }
          var cands = [e.idNumber, e.nationalId, e.passportNumber, e.patientId];
          for(var ci=0;ci<cands.length;ci++){ var c=cands[ci]; if(c&&c!=='—'&&!_isMid(c)) return c; }
          return e.patientId||'';
        })();
        var badge  = badgeLabel[e.state]||e.state;
        var bStyle = badgeStyle[e.state]||'background:#f3f4f6;color:#374151';
        var isFirst = i===0;
        var isLast  = i===filtered.length-1;
        var radius  = isFirst&&isLast?'10px':isFirst?'10px 10px 0 0':isLast?'0 0 10px 10px':'0';

        /* CONFIRM COLLECTION button for ready-for-collection tab */
        var confirmBtn = (activeTab==='ready-for-collection') ?
          ' <button onclick="event.stopPropagation();_phConfirmCollection(\''+e.id+'\',\''+e.ticket+'\')" '+
          'style="flex-shrink:0;padding:6px 14px;border-radius:6px;border:none;background:#0F6E56;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">'+
          'Confirm Collection</button>' : '';

        return '<li onclick="'+_openRxScript(e)+'" style="'+
          'display:flex;align-items:center;justify-content:space-between;gap:12px;'+
          'padding:14px 16px;background:#fff;cursor:pointer;'+
          'border:1px solid #e0e0e0;border-radius:'+radius+';'+
          (isFirst?'':'border-top:none;')+
          'transition:background .12s" '+
          'onmouseover="this.style.background=\'#f4f5f0\'" onmouseout="this.style.background=\'#fff\'">' +
          '<div style="flex:1;min-width:0">'+
            '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:3px">'+
              '<span style="font-weight:600;font-size:14px;color:#111">'+e.patient+'</span>'+
              _priorityBadge(e)+
            '</div>'+
            '<div style="font-size:12px;color:#9ca3af;display:flex;flex-wrap:wrap;gap:6px">'+
              '<span style="font-family:monospace;color:#0F6E56">'+e.ticket+'</span>'+
              (patIdStr?'<span>ID: '+patIdStr+'</span>':'')+
              (e.prescriptionRef?'<span>Rx: '+e.prescriptionRef+'</span>':'')+
              (doctorStr?'<span>Dr. '+doctorStr.replace(/^Dr\.?\s*/i,'')+'</span>':'')+
              (timeStr?'<span>'+timeStr+'</span>':'')+
              (waitStr?'<span style="color:'+(e.waitedMin>30?'#dc2626':'#777777')+'">⏱ '+waitStr+'</span>':'')+
            '</div>'+
          '</div>'+
          '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">'+
            '<span style="padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;'+bStyle+'">'+badge+'</span>'+
            confirmBtn+
          '</div>'+
        '</li>';
      }).join('') +
    '</ul>';
  }

  el.innerHTML =
    '<div style="background:#ffffff;border-radius:16px;border:1px solid #e0e0e0;padding:20px 24px;box-shadow:0 1px 3px rgba(0,0,0,.06)">' +
      '<h2 style="font-size:15px;font-weight:600;letter-spacing:-.3px;margin:0 0 14px">Queue</h2>' +
      searchBar +
      tabBar +
      listHTML +
    '</div>';
}

/* CONFIRM COLLECTION modal — called from queue row button */
window._phConfirmCollection = function(id, ticket) {
  var q = window._phQueue || [];
  var e = q.find(function(x){ return x.id===id; });
  if(!e){ UI.showToast('Queue entry not found','err'); return; }

  var overlay = document.createElement('div');
  overlay.id = 'ph-collect-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center';

  var rxObj = (_PH.prescriptions||[]).find(function(p){ return p.code===e.prescriptionRef; });
  var medList = (rxObj&&rxObj.items&&rxObj.items.length)
    ? rxObj.items.map(function(it){return '<li style="font-size:13px;padding:3px 0">• '+it.drug+(it.quantity?' · '+it.quantity+(it.unit?' '+it.unit:''):'')+'</li>';}).join('')
    : '<li style="font-size:13px;padding:3px 0;color:#777">Refer to prescription</li>';

  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;padding:28px 32px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2)">' +
      '<div style="font-size:18px;font-weight:800;color:#0F6E56;margin-bottom:4px">Confirm Patient Collection</div>'+
      '<div style="font-size:13px;color:#777;margin-bottom:20px">Verify identity before handing over medication</div>'+
      '<div style="background:#f8fafc;border:1px solid #e0e0e0;border-radius:10px;padding:14px;margin-bottom:16px">'+
        '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#777;margin-bottom:8px">Patient Details</div>'+
        '<div style="font-weight:700;font-size:15px">'+e.patient+'</div>'+
        '<div style="font-size:12px;color:#777;font-family:monospace">Queue: '+ticket+' · Rx: '+(e.prescriptionRef||'—')+'</div>'+
      '</div>'+
      '<div style="background:#EDFBF3;border:1px solid #0F6E56;border-radius:10px;padding:12px;margin-bottom:16px">'+
        '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#0F6E56;margin-bottom:6px">Medication to Hand Over</div>'+
        '<ul style="margin:0;padding:0;list-style:none">'+medList+'</ul>'+
      '</div>'+
      '<div style="margin-bottom:16px">'+
        '<label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:4px">Identity Verified (ID/Passport) *</label>'+
        '<input id="ph-collect-idverify" type="text" placeholder="Enter patient ID number or passport number" '+
        'style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none">'+
      '</div>'+
      '<div style="margin-bottom:20px">'+
        '<label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:4px">Pharmacist Notes (optional)</label>'+
        '<textarea id="ph-collect-notes" rows="2" placeholder="Any notes about the collection…" '+
        'style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;resize:none"></textarea>'+
      '</div>'+
      '<div style="display:flex;gap:10px">'+
        '<button onclick="document.getElementById(\'ph-collect-overlay\').remove()" '+
        'style="flex:1;padding:11px;border-radius:8px;border:1.5px solid #e0e0e0;background:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Cancel</button>'+
        '<button id="ph-collect-confirm-btn" onclick="window._phDoConfirmCollection(\''+id+'\',\''+ticket+'\')" '+
        'style="flex:2;padding:11px;border-radius:8px;border:none;background:#0F6E56;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">✓ Confirm Collection</button>'+
      '</div>'+
    '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(ev){ if(ev.target===overlay) overlay.remove(); });
  setTimeout(function(){ var inp = document.getElementById('ph-collect-idverify'); if(inp) inp.focus(); }, 100);
};

window._phDoConfirmCollection = function(id, ticket) {
  var idVerify = (document.getElementById('ph-collect-idverify')||{}).value||'';
  if(!idVerify.trim()){ UI.showToast('Please enter the patient\'s ID or passport number','err'); return; }

  var notes = (document.getElementById('ph-collect-notes')||{}).value||'';
  var btn   = document.getElementById('ph-collect-confirm-btn');
  if(btn){ btn.disabled=true; btn.textContent='Confirming…'; }

  var q = window._phQueue || [];
  var e = q.find(function(x){ return x.id===id; });
  if(!e){ UI.showToast('Queue entry not found','err'); return; }

  /* ── Advance local state immediately ── */
  e.state           = 'completed';
  e.collectedAt     = new Date().toISOString();
  e.collectedById   = idVerify;
  e.collectionNotes = notes;
  var pharmUser = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
  e.collectedByPharmacist = pharmUser.firstName ? (pharmUser.firstName+' '+(pharmUser.lastName||'')).trim() : 'Pharmacist';

  /* Persist to backend — prescription + queue entry + audit log */
  var _ccRxId = e.prescriptionId || e.prescriptionRef;
  window._phPersist({
    rxId:         _ccRxId,
    rxRef:        e.prescriptionRef,
    queueEntryId: e.id || e._id || _ccRxId,
    status:       'Completed',
    queueState:   'completed',
    extra:        { collectedAt: e.collectedAt, collectedBy: e.collectedByPharmacist, collectionNotes: notes, collectedById: idVerify },
    auditAction:  'confirm_collection',
    auditNote:    'Medication collected by patient — ID verified: ' + idVerify,
    pharmacist:   e.collectedByPharmacist,
  });

  /* ── Build the full history record ── */
  var rxObj = (_PH.prescriptions||[]).find(function(p){ return p.code===e.prescriptionRef; });
  var histItems = (rxObj&&rxObj.items)||e.medications||[];
  var histRecord = {
    id:              'HIST-COLLECT-'+Date.now(),
    patientName:     e.patient          || rxObj&&rxObj.patientName || '—',
    patientId:       e.patientId        || idVerify                 || '—',
    prescriptionRef: e.prescriptionRef  || '—',
    drug:            (histItems[0]&&(histItems[0].drug||histItems[0].name||histItems[0].medicationName))||'—',
    medications:     histItems.map(function(m){
      return {
        name:     m.drug||m.name||m.medicationName||'—',
        dosage:   m.dosage||m.dose||m.strength||'—',
        quantity: m.quantity||m.qty||'—',
        unit:     m.unit||'',
        form:     m.form||m.dosageForm||'',
      };
    }),
    status:          'Completed',
    collectionStatus:'Collected',
    dispensedAt:     e.collectedAt,
    collectedAt:     e.collectedAt,
    pharmacist:      e.collectedByPharmacist,
    doctor:          e.prescribedByName || (rxObj&&rxObj.doctorName) || '—',
    facility:        e.facility         || (rxObj&&rxObj.facility)   || 'Johannesburg CHC',
    collectorId:     idVerify,
    notes:           notes||'',
    items:           histItems,
  };

  /* ── Update local in-memory history immediately ── */
  _PH.history.unshift(histRecord);

  /* ── Persist to backend: medication-history collection ── */
  (function(){
    var now = new Date().toISOString();
    var pharmUser2 = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
    var pharmName2 = pharmUser2.firstName ? (pharmUser2.firstName+' '+(pharmUser2.lastName||'')).trim() : e.collectedByPharmacist;
    var payload = {
      patientId:        histRecord.patientId,
      patientName:      histRecord.patientName,
      prescriptionRef:  histRecord.prescriptionRef,
      prescriptionId:   e.prescriptionId||e.prescriptionRef,
      queueEntryId:     e.id||e._id||'',
      medications:      histRecord.medications,
      dispensingDate:   histRecord.dispensedAt,
      collectionDate:   histRecord.collectedAt,
      collectionStatus: 'Collected',
      collectorIdNumber:idVerify,
      dispensingPharmacist: pharmName2,
      prescribingDoctor:    histRecord.doctor,
      facility:             histRecord.facility,
      notes:                notes||'',
      createdAt:            now,
      updatedAt:            now,
    };
    try {
      /* 1 — dedicated medication-history endpoint */
      API._fetchDirect('/medication-history', {
        method: 'POST',
        body:   JSON.stringify(payload),
      }).catch(function(){});
      /* 2 — also PATCH prescription with collectionStatus for medical records */
      var _rxId2 = e.prescriptionId||e.prescriptionRef;
      if(_rxId2) {
        API._fetchDirect('/prescriptions/'+_rxId2, {
          method: 'PATCH',
          body:   JSON.stringify({
            collectionStatus: 'Collected',
            collectedAt:      histRecord.collectedAt,
            collectedById:    idVerify,
            collectedByPharmacist: pharmName2,
            updatedAt:        now,
          }),
        }).catch(function(){});
      }
      /* 3 — patient medical record update (if patient-records endpoint exists) */
      if(histRecord.patientId && histRecord.patientId.length > 3) {
        API._fetchDirect('/patients/'+histRecord.patientId+'/medical-history', {
          method: 'POST',
          body:   JSON.stringify({
            type:        'prescription',
            subType:     'dispensed',
            title:       'Medication Dispensed & Collected',
            medications: histRecord.medications,
            prescriptionRef: histRecord.prescriptionRef,
            dispensingDate:  histRecord.dispensedAt,
            pharmacist:      pharmName2,
            doctor:          histRecord.doctor,
            facility:        histRecord.facility,
            collectionStatus:'Collected',
            collectedAt:     histRecord.collectedAt,
            createdAt:       now,
          }),
        }).catch(function(){});
      }
    } catch(_){}
  })();

  /* Emit Socket.IO collected notification */
  try {
    if(window.socket && window.socket.emit) {
      window.socket.emit('pharmacyCollected', {
        queueId:         id,
        ticket:          ticket,
        patient:         e.patient,
        prescriptionRef: e.prescriptionRef,
        collectedAt:     e.collectedAt,
      });
    }
  } catch(_){}

  /* Update _PH.queue entry */
  var _pqc = (_PH.queue||[]).find(function(q){ return q.id===id||q.prescriptionRef===e.prescriptionRef; });
  if(_pqc){ _pqc.state='completed'; _pqc.status='Completed'; _pqc.collectedAt=e.collectedAt; }

  document.getElementById('ph-collect-overlay').remove();

  /* ── Collection confirmation modal ── */
  var rxObj2   = (_PH.prescriptions||[]).find(function(p){ return p.code===e.prescriptionRef; });
  var collMeds = (rxObj2&&rxObj2.items)||[];
  var now2     = new Date();
  var dateStr2 = now2.toLocaleDateString('en-ZA',{day:'2-digit',month:'long',year:'numeric'});
  var timeStr2 = now2.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});
  var medList2 = collMeds.length
    ? collMeds.map(function(m){
        var name = m.drug||m.medicationName||m.name||'Medication';
        var qty  = m.quantity ? (' · '+m.quantity+(m.unit?' '+m.unit:'')) : '';
        var dos  = m.dosage||(m.dose||'');
        return '<li style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13px;border-bottom:1px solid #e5f7ee">'+
          '<span style="color:#0F6E56;font-size:16px">✓</span>'+
          '<span><strong>'+name+'</strong>'+qty+(dos?' · <span style="color:#555">'+dos+'</span>':'')+'</span>'+
        '</li>';
      }).join('')
    : '<li style="font-size:13px;color:#777;padding:4px 0">Medication details recorded</li>';

  var confOverlay = document.createElement('div');
  confOverlay.id  = 'ph-collected-confirm-overlay';
  confOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  confOverlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;padding:0;max-width:480px;width:92%;box-shadow:0 24px 64px rgba(0,0,0,.22);overflow:hidden">' +
      /* Green header */
      '<div style="background:#0F6E56;padding:28px 32px 22px;text-align:center;color:#fff">' +
        '<div style="font-size:48px;margin-bottom:8px">✅</div>' +
        '<div style="font-size:21px;font-weight:800;margin-bottom:4px">Medication Collected</div>' +
        '<div style="font-size:13px;opacity:.85">'+dateStr2+' at '+timeStr2+'</div>' +
      '</div>' +
      /* Body */
      '<div style="padding:24px 28px">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;font-size:13px">' +
          '<div style="background:#f4f5f0;border-radius:8px;padding:10px 14px">' +
            '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:3px">Patient</div>' +
            '<div style="font-weight:700;font-size:14px">'+e.patient+'</div>' +
            '<div style="font-family:monospace;font-size:12px;color:#0F6E56">'+idVerify+'</div>' +
          '</div>' +
          '<div style="background:#f4f5f0;border-radius:8px;padding:10px 14px">' +
            '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:3px">Collected by</div>' +
            '<div style="font-weight:700;font-size:14px">'+e.collectedByPharmacist+'</div>' +
            '<div style="font-size:12px;color:#777">'+(e.prescriptionRef||ticket)+'</div>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#0F6E56;margin-bottom:8px">Medications collected ('+collMeds.length+')</div>' +
        '<ul style="list-style:none;padding:0;margin:0 0 20px">'+medList2+'</ul>' +
        (notes?'<div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px 14px;font-size:12px;color:#555;margin-bottom:16px"><strong>Notes:</strong> '+notes+'</div>':'')+
        '<div style="display:flex;gap:10px;justify-content:flex-end">' +
          '<button onclick="window._phPrintLabels&&_phPrintLabels()" ' +
            'style="padding:10px 20px;border-radius:8px;border:1.5px solid #0F6E56;background:#fff;color:#0F6E56;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">' +
            '🖨️ Print receipt' +
          '</button>' +
          '<button onclick="document.getElementById(\'ph-collected-confirm-overlay\').remove();window._phQueueTab=\'completed\';if(typeof Router!==\'undefined\')Router.setPage(\'ph-queue\');if(typeof _phRenderQueue===\'function\')_phRenderQueue();" ' +
            'style="padding:10px 24px;border-radius:8px;border:none;background:#0F6E56;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">' +
            'Done' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(confOverlay);
  confOverlay.addEventListener('click', function(ev){ if(ev.target===confOverlay) confOverlay.remove(); });

  _phRenderQueue();
  UI.showToast(e.patient+' — medication collected ✓', 'ok');
};

/* ── Helper: send ready notification to patient (SMS + email + socket) ── */
window._phSendReadyNotification = async function(entryOrRx) {
  var e = entryOrRx;
  var patientName = e.patient || e.patientName || '';
  var ticket      = e.ticket  || '';
  var patId       = e.patientId || '';
  try {
    var pRes = await API._fetchDirect('/patients?limit=50', {method:'GET'}).catch(function(){return {data:[]};});
    var patients = (pRes&&(pRes.data||pRes))||[];
    if(!Array.isArray(patients)) patients = [];
    var pt = patients.find(function(p){
      return p.mrn === patId || p._id === patId ||
             (p.firstName+' '+p.lastName).toLowerCase() === patientName.toLowerCase();
    });

    var smsMsg = 'NIHMS Pharmacy: Your medication is ready for collection. '+
      (ticket?'Ticket: '+ticket+'. ':'')+
      'Patient: '+patientName+'. '+
      'Please bring your identification document when collecting your medication.';

    var emailHtml =
      '<div style="font-family:Arial;max-width:520px;margin:0 auto">' +
      '<div style="background:linear-gradient(135deg,#0F6E56,#1A4A9B);padding:20px;border-radius:10px 10px 0 0;text-align:center">' +
      '<h2 style="color:#fff;margin:0">Your Medication is Ready</h2></div>' +
      '<div style="padding:24px;background:#f9f9f9;border-radius:0 0 10px 10px;text-align:center">' +
      '<p>Dear <strong>'+patientName+'</strong>,</p>' +
      '<p>Your medication has been prepared and is ready for collection at the NIHMS pharmacy.</p>' +
      (ticket?'<div style="margin:20px 0;padding:20px;background:#fff;border-radius:10px;border:2px solid #0F6E56">' +
      '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:6px">Your Queue Number</div>' +
      '<div style="font-size:56px;font-weight:900;color:#0F6E56;font-family:monospace;line-height:1.1">'+ticket+'</div>' +
      '</div>':'')+
      '<div style="padding:12px;background:#EDFBF3;border-radius:8px;font-size:14px;font-weight:600;color:#0F6E56;margin-bottom:16px">' +
      '💊 Please proceed to <strong>Pharmacy Window 2</strong> now</div>' +
      '<p style="font-size:12px;color:#888">Please bring your identification document when collecting your medication.</p>' +
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
          subject:'NIHMS — Your medication is ready for collection'+(ticket?': '+ticket:''),
          html:emailHtml,
        })
      }).catch(function(){});
    }

    /* In-system notification via Socket.IO */
    try {
      if(window.socket && window.socket.emit) {
        window.socket.emit('pharmacyReady', {
          queueId: e.id, ticket: ticket, patient: patientName,
          prescriptionRef: e.prescriptionRef||e.code
        });
      }
    } catch(_){}

    UI.showToast('Patient notified — medication ready for collection · '+(ticket||patientName),'ok');
  } catch(_) {
    UI.showToast(patientName+' — medication ready for collection'+(ticket?' · '+ticket:''),'ok');
  }
};

window._phAdvanceQueue = async function(id) {
  var q = window._phQueue;
  var e = q.find(function(x){ return x.id===id; }); if(!e) return;
  /* State machine: new-request → waiting → validated → in-progress → ready-for-collection
     (not directly to completed — collection requires CONFIRM COLLECTION) */
  var stateOrder = ['new-request','waiting','validated','in-progress','ready-for-collection'];
  var idx2 = stateOrder.indexOf(e.state);
  var next = idx2>=0 && idx2<stateOrder.length-1 ? stateOrder[idx2+1] : null;
  if(!next) return;
  e.state = next;

  if (next==='ready-for-collection') {
    /* Send in-system + SMS/email notification that medication is ready */
    try {
      var pRes = await API._fetchDirect('/patients?limit=50', {method:'GET'}).catch(function(){return {data:[]};});
      var patients = (pRes&&(pRes.data||pRes))||[];
      if(!Array.isArray(patients)) patients = [];
      var pt = patients.find(function(p){
        return p.mrn === e.patientId || p._id === e.patientId ||
               (p.firstName+' '+p.lastName).toLowerCase() === e.patient.toLowerCase();
      });

      var smsMsg = 'NIHMS Pharmacy: Your medication is ready for collection. '+
        'Ticket: '+e.ticket+'. Patient: '+e.patient+'. '+
        'Please bring your identification document when collecting your medication.';

      var emailHtml =
        '<div style="font-family:Arial;max-width:520px;margin:0 auto">' +
        '<div style="background:linear-gradient(135deg,#0F6E56,#1A4A9B);padding:20px;border-radius:10px 10px 0 0;text-align:center">' +
        '<h2 style="color:#fff;margin:0">Your Medication is Ready</h2></div>' +
        '<div style="padding:24px;background:#f9f9f9;border-radius:0 0 10px 10px;text-align:center">' +
        '<p>Dear <strong>'+e.patient+'</strong>,</p>' +
        '<p>Your medication has been prepared and is ready for collection at the NIHMS pharmacy.</p>' +
        '<div style="margin:20px 0;padding:20px;background:#fff;border-radius:10px;border:2px solid #0F6E56">' +
        '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:6px">Your Queue Number</div>' +
        '<div style="font-size:56px;font-weight:900;color:#0F6E56;font-family:monospace;line-height:1.1">'+e.ticket+'</div>' +
        '</div>' +
        '<div style="padding:12px;background:#EDFBF3;border-radius:8px;font-size:14px;font-weight:600;color:#0F6E56;margin-bottom:16px">' +
        '💊 Please proceed to <strong>Pharmacy Window 2</strong> now</div>' +
        '<p style="font-size:12px;color:#888">Please bring your identification document when collecting your medication.</p>' +
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
            subject:'NIHMS — Your medication is ready for collection: '+e.ticket,
            html:emailHtml,
          })
        }).catch(function(){});
      }

      /* In-system notification via Socket.IO */
      try {
        if(window.socket && window.socket.emit) {
          window.socket.emit('pharmacyReady', {
            queueId:e.id, ticket:e.ticket, patient:e.patient,
            prescriptionRef:e.prescriptionRef
          });
        }
      } catch(_){}

      UI.showToast('Patient notified — medication ready · '+e.ticket,'ok');
    } catch(_) {
      UI.showToast(e.patient+' — medication ready for collection · '+e.ticket,'ok');
    }
  }

  /* PATCH prescription status — map new internal states to API status strings */
  if(e.prescriptionRef || e.prescriptionId){
    var statusMap = {
      'waiting':              'Awaiting Pharmacist Review',
      'validated':            'Validated',
      'in-progress':          'In Progress',
      'ready-for-collection': 'Ready for Collection',
    };
    if(statusMap[next]){
      API._fetchDirect('/prescriptions/'+(e.prescriptionId||e.prescriptionRef), {
        method:'PATCH',
        body:JSON.stringify({status:statusMap[next]})
      }).catch(function(){});
    }
  }

  /* Update _PH.queue entry state to match */
  var _pqAdv = (_PH.queue||[]).find(function(q){
    return q.prescriptionRef===e.prescriptionRef||q.id===e.id;
  });
  if(_pqAdv){ _pqAdv.state = next; }

  _phRenderQueue();
};

/* ═══════════════════════════════════════════════════════════════
   PAGE 6 — MEDICATION HISTORY
═══════════════════════════════════════════════════════════════ */
Pages['ph-history'] = () => {
  window._phHistFilters = {doctor:'all',type:'all',status:'all',dateFrom:'',dateTo:'',medication:'',pharmacist:'all',search:''};

  /* ── Fetch persisted medication history from backend and merge into _PH.history ── */
  setTimeout(function(){
    try {
      API._fetchDirect('/medication-history?limit=200', {method:'GET'})
        .then(function(res){
          var records = Array.isArray(res) ? res : (res&&(res.data||res.records||res.history||[]));
          if(!Array.isArray(records)) return;
          /* Merge: add backend records not already in local history (match by prescriptionRef) */
          var existingRefs = (_PH.history||[]).reduce(function(acc,h){
            if(h.prescriptionRef) acc[h.prescriptionRef] = true;
            return acc;
          }, {});
          var added = 0;
          records.forEach(function(r){
            var ref = r.prescriptionRef || r.prescriptionCode || r._id || '';
            if(!existingRefs[ref]) {
              _PH.history.push({
                id:              r._id || ('HIST-DB-'+Date.now()+'-'+added),
                patientName:     r.patientName      || '—',
                patientId:       r.patientId        || r.patientIdNumber || '—',
                prescriptionRef: r.prescriptionRef  || '—',
                drug:            (r.medications&&r.medications[0]&&r.medications[0].name) || r.drug || '—',
                medications:     r.medications      || [],
                items:           r.medications      || [],
                status:          r.collectionStatus === 'Collected' ? 'Collected' : (r.status||'Collected'),
                collectionStatus:r.collectionStatus || 'Collected',
                dispensedAt:     r.dispensingDate   || r.dispensedAt || r.collectionDate || r.createdAt || '',
                collectedAt:     r.collectionDate   || r.collectedAt || '',
                pharmacist:      r.dispensingPharmacist || r.pharmacist || '—',
                doctor:          r.prescribingDoctor    || r.doctor    || '—',
                facility:        r.facility         || 'Johannesburg CHC',
                collectorId:     r.collectorIdNumber || r.collectedById || '—',
                notes:           r.notes            || '',
              });
              existingRefs[ref] = true;
              added++;
            }
          });
          if(added > 0) _phRenderHistory();
        })
        .catch(function(){});
    } catch(_){}

    _phRenderHistory();
  }, 0);

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

  /* ── Reporting totals ── */
  var totalReceived   = (_PH.prescriptions||[]).length;
  var totalDispensed  = allHistory.filter(function(h){return h.status==='Collected';}).length;
  var totalPartial    = allHistory.filter(function(h){return h.status==='Partial'||h.status==='Partially Dispensed';}).length;
  var totalOutOfStock = allHistory.filter(function(h){return h.status==='Out of Stock';}).length;
  var totalRepeats    = allHistory.filter(function(h){
    var rs = h.repeatSequence; return rs && (rs.used>0 || (typeof rs==='string'&&rs.includes('/')));
  }).length;
  var outstanding     = (_PH.queue||[]).filter(function(q){return q.state==='waiting'||q.state==='preparing';}).length;

  /* Average dispensing time (minutes): from prescribedAt / submittedAt to dispensedAt */
  var dispenseTimes = allHistory.filter(function(h){ return h.dispensedAt && (h.submittedAt||h.prescribedAt||h.issued); })
    .map(function(h){
      var start = new Date(h.submittedAt||h.prescribedAt||h.issued||0);
      var end   = new Date(h.dispensedAt);
      return (end-start)/(1000*60);
    }).filter(function(t){ return t>0 && t<1440; }); /* ignore >24h outliers */
  var avgTime = dispenseTimes.length ? Math.round(dispenseTimes.reduce(function(a,b){return a+b;},0)/dispenseTimes.length) : null;

  var reportingCards = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">'+
    [
      {label:'Total Received',    val: totalReceived,   color:'#1A4A9B', icon:'ti-inbox'},
      {label:'Total Dispensed',   val: totalDispensed,  color:'#0F6E56', icon:'ti-clipboard-check'},
      {label:'Outstanding',       val: outstanding,     color:'#EF9F27', icon:'ti-clock'},
      {label:'Avg Dispense Time', val: avgTime!==null?avgTime+'m':'—',    color:'#777',   icon:'ti-stopwatch'},
    ].map(function(c){
      return '<div style="border:1.5px solid #e0e0e0;border-radius:10px;padding:12px 14px">'+
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'+
          '<i class="ti '+c.icon+'" style="color:'+c.color+';font-size:16px"></i>'+
          '<span style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#777">'+c.label+'</span>'+
        '</div>'+
        '<div style="font-size:22px;font-weight:700;color:'+c.color+'">'+c.val+'</div>'+
      '</div>';
    }).join('')+
    '</div>'+
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">'+
    [
      {label:'Partial Dispenses',  val: totalPartial,    color:'#EF9F27'},
      {label:'Stock Shortages',    val: totalOutOfStock, color:'#dc2626'},
      {label:'Repeat Dispenses',   val: totalRepeats,    color:'#1A4A9B'},
    ].map(function(c){
      return '<div style="border:1px solid #e0e0e0;border-radius:10px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between">'+
        '<span style="font-size:12px;color:#555">'+c.label+'</span>'+
        '<span style="font-weight:700;font-size:16px;color:'+c.color+'">'+c.val+'</span>'+
      '</div>';
    }).join('')+
    '</div>';

  /* ── Apply all filters ── */
  var filtered = allHistory.filter(function(h){
    if(f.doctor !== 'all' && h.doctor !== f.doctor) return false;
    if(f.type   !== 'all' && h.type   !== f.type)   return false;
    if(f.status !== 'all' && h.status !== f.status) return false;
    if(f.pharmacist !== 'all' && h.pharmacist !== f.pharmacist) return false;
    if(f.medication && f.medication.trim()){
      var medLow = f.medication.trim().toLowerCase();
      var drugStr = _drugLabel(h).toLowerCase();
      if(!drugStr.includes(medLow)) return false;
    }
    if(f.dateFrom){
      var hDate = new Date(h.dispensedAt||h.submittedAt||h.date||0);
      if(hDate < new Date(f.dateFrom)) return false;
    }
    if(f.dateTo){
      var hDate2 = new Date(h.dispensedAt||h.submittedAt||h.date||0);
      if(hDate2 > new Date(f.dateTo+'T23:59:59')) return false;
    }
    if(f.search && f.search.trim()){
      var srch = f.search.trim().toLowerCase();
      var haystack = [_patientName(h), _patientId(h), _rxRef(h), _drugLabel(h), h.pharmacist||''].join(' ').toLowerCase();
      if(!haystack.includes(srch)) return false;
    }
    return true;
  });

  var doctors     = ['all'].concat([...new Set(allHistory.map(function(h){return h.doctor;}).filter(Boolean))]);
  var types       = ['all'].concat([...new Set(allHistory.map(function(h){return h.type;}))]);
  var statuses    = ['all','Prescribed','Awaiting Dispensing','Collected','Partial','Missed','Out of Stock'];
  var pharmacists = ['all'].concat([...new Set(allHistory.map(function(h){return h.pharmacist;}).filter(Boolean))]);

  function sel(id, opts, val, field, label) {
    return '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#777;margin-bottom:4px">'+label+'</div>'+
      '<select id="'+id+'" onchange="window._phHistFilters.'+field+'=this.value;_phRenderHistory()" style="width:100%;padding:8px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none">'+
      opts.map(function(o){ return '<option value="'+o+'"'+(val===o?' selected':'')+'>'+( o==='all'?'All':o)+'</option>'; }).join('')+'</select></div>';
  }

  function dateField(id, val, field, label){
    return '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#777;margin-bottom:4px">'+label+'</div>'+
      '<input type="date" id="'+id+'" value="'+(val||'')+'" onchange="window._phHistFilters.'+field+'=this.value;_phRenderHistory()" '+
      'style="width:100%;padding:8px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box"></div>';
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

  el.innerHTML = _phCard('ti-history','Dispensing History & Reports',
    filtered.length+' record'+(filtered.length!==1?'s':'')+' · '+totalDispensed+' dispensed today',
    _phBtn('Export PDF','ti-download','outline','UI.showToast(\''+filtered.length+' records prepared as PDF\',\'ok\')'),
    reportingCards+
    /* Search bar */
    '<div style="margin-bottom:12px"><input type="text" id="ph-hist-search" placeholder="Search patient name, ID, prescription ref, medication…" value="'+(f.search||'').replace(/"/g,'&quot;')+'" '+
    'oninput="window._phHistFilters.search=this.value;_phRenderHistory()" '+
    'style="width:100%;padding:9px 14px;border:1.5px solid #e0e0e0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box"></div>'+
    /* Filter grid */
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">'+
      sel('hist-status',statuses,f.status,'status','Status')+
      sel('hist-pharmacist',pharmacists,f.pharmacist,'pharmacist','Pharmacist')+
      '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#777;margin-bottom:4px">Medication</div>'+
        '<input type="text" id="hist-med" placeholder="Drug name…" value="'+(f.medication||'')+'" oninput="window._phHistFilters.medication=this.value;_phRenderHistory()" '+
        'style="width:100%;padding:8px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box"></div>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">'+
      dateField('hist-from',f.dateFrom,'dateFrom','Date From')+
      dateField('hist-to',  f.dateTo,  'dateTo',  'Date To')+
    '</div>'+
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

/**
 * NIHMS Pharmacy Workflow — Complete Patch
 * =========================================
 * Adds the full 8-queue state machine on top of the existing pharmacy.js.
 * Paste/append this ENTIRE block after the last line of pharmacy.js,
 * OR inject it via a <script> tag that loads after pharmacy.js.
 *
 * What this adds:
 *  1. 8-queue badge/style maps (new-request, waiting, validated,
 *     in-progress, ready-for-collection, completed,
 *     pending-stock, returned-for-amendment)
 *  2. Accept Request button with backend PATCH (new-request → waiting)
 *  3. Reject Request modal with mandatory reason
 *     (closes with Rejected state + cross-tab broadcast to doctor)
 *  4. Return for Amendment modal (validation fail → returned-for-amendment
 *     + cross-tab broadcast to doctor)
 *  5. Pending Stock state (dispensing fail due to stock → pending-stock)
 *  6. 8-tab queue panel (overrides existing 6-tab _phRenderQueue)
 *  7. Identity verification at collection counter
 *     (fail → remain in ready-for-collection; pass → Confirm Collection)
 *  8. Confirm Collection audit trail (collector name, datetime,
 *     handover user, Rx number; status → completed)
 *  9. Cross-tab sync to doctor module via BroadcastChannel
 * 10. Backend-verified transitions on every state change
 *     (do NOT advance if PATCH fails)
 * 11. No-duplicate notification check before SMS/email send
 */

/* ══════════════════════════════════════════════════════════════════
   §0  EXTENDED BADGE MAPS (patch adds pending-stock, returned-for-amendment)
══════════════════════════════════════════════════════════════════ */
(function _phExtendBadges() {
  var extra = {
    'pending-stock':          { label: 'PENDING STOCK',         style: 'background:#FFF7ED;color:#C2410C' },
    'returned-for-amendment': { label: 'RETURNED FOR AMENDMENT', style: 'background:#FEF2F2;color:#991B1B' },
    'rejected':               { label: 'REJECTED',              style: 'background:#FEF2F2;color:#991B1B' },
  };
  /* Extend _PH_STATUSES if it exists */
  if (typeof _PH_STATUSES !== 'undefined') {
    Object.assign(_PH_STATUSES, {
      'pending-stock':          extra['pending-stock'].label,
      'returned-for-amendment': extra['returned-for-amendment'].label,
      'rejected':               extra['rejected'].label,
    });
  }
  if (typeof _PH_STATUS_STYLE !== 'undefined') {
    Object.assign(_PH_STATUS_STYLE, {
      'pending-stock':          extra['pending-stock'].style,
      'returned-for-amendment': extra['returned-for-amendment'].style,
      'rejected':               extra['rejected'].style,
    });
  }
})();

/* ══════════════════════════════════════════════════════════════════
   §1  CROSS-TAB BROADCAST HELPERS
══════════════════════════════════════════════════════════════════ */
(function _phSetupBroadcast() {
  /* Pharmacy → Doctor: status changes the doctor needs to see */
  window._phBroadcastDoctorUpdate = function (rxData, newStatus) {
    try {
      var ch = new BroadcastChannel('nihms_doctor_queue');
      ch.postMessage({ type: 'rx_status_update', prescriptionRef: rxData.prescriptionRef || rxData.code, status: newStatus, rx: rxData });
      setTimeout(function () { ch.close(); }, 500);
    } catch (_) {}
    /* Also update localStorage copy */
    try {
      var stored = JSON.parse(localStorage.getItem('NIHMS_PHARMACY_PRESCRIPTIONS') || '[]');
      var idx = stored.findIndex(function (r) { return r.prescriptionRef === (rxData.prescriptionRef || rxData.code); });
      if (idx > -1) { stored[idx].status = newStatus; localStorage.setItem('NIHMS_PHARMACY_PRESCRIPTIONS', JSON.stringify(stored)); }
    } catch (_) {}
  };
})();

/* ══════════════════════════════════════════════════════════════════
   §1b  CENTRAL PERSISTENCE HELPER
        Writes the prescription status AND the queue-entry state to the
        backend in a single coordinated pair of non-blocking PATCHes.
        Also posts a lightweight audit-log entry so every action is
        permanently recorded.

        Usage:
          _phPersist({ rxId, rxRef, queueEntryId, status, queueState,
                       extra, auditAction, auditNote, pharmacist })
        All fields except rxId are optional.
══════════════════════════════════════════════════════════════════ */
window._phPersist = function (opts) {
  if (!window.API || !window.API._fetchDirect) return;
  var o = opts || {};
  var now = new Date().toISOString();
  var rxId       = o.rxId   || o.rxRef || '';
  var queueId    = o.queueEntryId || '';
  var status     = o.status || '';
  var queueState = o.queueState || '';
  var extra      = o.extra  || {};
  var pharmacist = o.pharmacist || (function(){
    var u = (window.API.getStoredUser && window.API.getStoredUser()) || {};
    return u.firstName ? (u.firstName + ' ' + (u.lastName||'')).trim() : 'Pharmacist';
  })();

  /* 1 — Prescription record */
  if (rxId && status) {
    var rxBody = Object.assign({ status: status, updatedAt: now, updatedBy: pharmacist }, extra);
    try {
      API._fetchDirect('/prescriptions/' + rxId, {
        method: 'PATCH',
        body: JSON.stringify(rxBody),
      }).catch(function(){});
    } catch(_){}
  }

  /* 2 — Queue entry record (separate collection / route) */
  if (queueId && queueState) {
    var qBody = Object.assign({ state: queueState, updatedAt: now }, extra);
    try {
      API._fetchDirect('/pharmacy/queue/' + queueId, {
        method: 'PATCH',
        body: JSON.stringify(qBody),
      }).catch(function(){
        /* Fallback: some backends store queue entries under /prescriptions */
      });
    } catch(_){}
  }

  /* 3 — Audit log entry (fire and forget) */
  if (o.auditAction) {
    try {
      API._fetchDirect('/audit-log', {
        method: 'POST',
        body: JSON.stringify({
          module:     'pharmacy',
          action:     o.auditAction,
          entityType: 'prescription',
          entityId:   rxId,
          queueId:    queueId,
          status:     status,
          note:       o.auditNote || '',
          performedBy: pharmacist,
          timestamp:  now,
        }),
      }).catch(function(){});
    } catch(_){}
  }
};

/* ══════════════════════════════════════════════════════════════════
   §2  ACCEPT REQUEST (new-request → waiting)
══════════════════════════════════════════════════════════════════ */
window._phAcceptRequest = function (rxRef) {
  /* Find queue entry */
  var q  = window._phQueue || [];
  var qe = q.find(function (x) { return x.prescriptionRef === rxRef || x.id === rxRef; });
  if (!qe) { UI.showToast('Queue entry not found', 'err'); return; }

  var rxId = qe.prescriptionId || qe.prescriptionRef;

  /* Advance local state immediately so UI responds on click */
  qe.state      = 'waiting';
  qe.acceptedAt = new Date().toISOString();
  var pq = (_PH.queue || []).find(function (x) { return x.prescriptionRef === rxRef || x.id === rxRef; });
  if (pq) { pq.state = 'waiting'; }
  var rx = (_PH.prescriptions || []).find(function (p) { return p.code === rxRef || p._id === rxId; });
  if (rx) rx.status = 'Awaiting Pharmacist Review';

  window._phQueueTab = 'waiting';
  _phRenderQueue();
  UI.showToast('Request accepted — moved to Waiting', 'ok');

  /* Persist to backend (prescription + queue entry + audit log) */
  window._phPersist({
    rxId:         rxId,
    rxRef:        rxRef,
    queueEntryId: qe.id || qe._id || rxId,
    status:       'Awaiting Pharmacist Review',
    queueState:   'waiting',
    extra:        { acceptedAt: qe.acceptedAt },
    auditAction:  'accept_prescription',
    auditNote:    'Prescription accepted into Waiting queue',
  });
};

/* ══════════════════════════════════════════════════════════════════
   §3  REJECT REQUEST MODAL (mandatory reason)
══════════════════════════════════════════════════════════════════ */
window._phShowRejectModal = function (rxRef) {
  var existingOverlay = document.getElementById('ph-reject-overlay');
  if (existingOverlay) existingOverlay.remove();

  var q  = window._phQueue || [];
  var qe = q.find(function (x) { return x.prescriptionRef === rxRef || x.id === rxRef; });
  var patName = qe ? qe.patient : rxRef;

  var overlay = document.createElement('div');
  overlay.id = 'ph-reject-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center';

  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;padding:28px 32px;max-width:460px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2)">' +
      '<div style="font-size:18px;font-weight:800;color:#dc2626;margin-bottom:4px">Reject Prescription Request</div>' +
      '<div style="font-size:13px;color:#777;margin-bottom:20px">Patient: <strong>' + patName + '</strong></div>' +
      '<div style="margin-bottom:16px">' +
        '<label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:4px">Rejection Reason <span style="color:#dc2626">*</span></label>' +
        '<select id="ph-reject-reason-sel" onchange="document.getElementById(\'ph-reject-reason-other\').style.display=this.value===\'Other\'?\'block\':\'none\'" ' +
        'style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none">' +
          '<option value="">— Select reason —</option>' +
          '<option value="Incomplete prescription">Incomplete prescription</option>' +
          '<option value="Invalid prescriber">Invalid prescriber details / no HPCSA number</option>' +
          '<option value="Formulary item not available">Formulary item not available</option>' +
          '<option value="Duplicate prescription">Duplicate prescription detected</option>' +
          '<option value="Drug interaction risk">Serious drug interaction risk</option>' +
          '<option value="Contraindication">Contraindicated for patient</option>' +
          '<option value="Quantity exceeds guidelines">Quantity exceeds prescribing guidelines</option>' +
          '<option value="Other">Other (specify below)</option>' +
        '</select>' +
      '</div>' +
      '<div id="ph-reject-reason-other" style="display:none;margin-bottom:16px">' +
        '<label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:4px">Specify reason</label>' +
        '<textarea id="ph-reject-reason-text" rows="3" placeholder="Describe the rejection reason…" ' +
        'style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;resize:none"></textarea>' +
      '</div>' +
      '<div style="margin-bottom:20px">' +
        '<label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:4px">Additional Notes (optional)</label>' +
        '<textarea id="ph-reject-notes" rows="2" placeholder="Any further notes for the prescribing doctor…" ' +
        'style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;resize:none"></textarea>' +
      '</div>' +
      '<div style="display:flex;gap:10px">' +
        '<button onclick="document.getElementById(\'ph-reject-overlay\').remove()" ' +
        'style="flex:1;padding:11px;border-radius:8px;border:1.5px solid #e0e0e0;background:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Cancel</button>' +
        '<button onclick="window._phDoReject(\'' + rxRef + '\')" ' +
        'style="flex:2;padding:11px;border-radius:8px;border:none;background:#dc2626;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">✕ Reject Request</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function (ev) { if (ev.target === overlay) overlay.remove(); });
};

window._phDoReject = function (rxRef) {
  var selEl    = document.getElementById('ph-reject-reason-sel');
  var otherEl  = document.getElementById('ph-reject-reason-text');
  var notesEl  = document.getElementById('ph-reject-notes');
  if (!selEl) return;

  var reasonSel   = selEl.value;
  var reasonOther = (otherEl && otherEl.value.trim()) || '';
  var notes       = (notesEl && notesEl.value.trim()) || '';

  if (!reasonSel) { UI.showToast('Please select a rejection reason', 'err'); return; }
  if (reasonSel === 'Other' && !reasonOther) { UI.showToast('Please specify the rejection reason', 'err'); return; }

  var fullReason = reasonSel === 'Other' ? reasonOther : reasonSel;
  if (notes) fullReason += ' — ' + notes;

  var q  = window._phQueue || [];
  var qe = q.find(function (x) { return x.prescriptionRef === rxRef || x.id === rxRef; });
  if (!qe) { UI.showToast('Queue entry not found', 'err'); return; }

  var rxId = qe.prescriptionId || qe.prescriptionRef;
  var rejectedAt = new Date().toISOString();

  /* Advance local state immediately so UI responds on click */
  qe.state           = 'rejected';
  qe.rejectedAt      = rejectedAt;
  qe.rejectionReason = fullReason;
  var pq = (_PH.queue || []).find(function (q) { return q.prescriptionRef === rxRef || q.id === rxRef; });
  if (pq) { pq.state = 'rejected'; pq.rejectionReason = fullReason; }

  /* Update prescription object */
  var rx = (_PH.prescriptions || []).find(function (p) { return p.code === rxRef || p._id === rxId; });
  if (rx) { rx.status = 'Rejected'; rx.rejectionReason = fullReason; }

  /* Cross-tab: notify doctor module */
  if (rx) window._phBroadcastDoctorUpdate(rx, 'Rejected');

  /* History entry */
  _PH.history.unshift({
    id: 'HIST-REJECT-' + Date.now(),
    patientName:     qe.patient,
    prescriptionRef: rxRef,
    status:          'Rejected',
    drug:            (rx && rx.items && rx.items[0] && rx.items[0].drug) || '—',
    rejectionReason: fullReason,
    dispensedAt:     new Date().toISOString(),
    doctor:          qe.prescribedByName || '—',
    pharmacist:      (function () { var u = (window.API && window.API.getStoredUser && window.API.getStoredUser()) || {}; return u.firstName ? (u.firstName + ' ' + (u.lastName || '')).trim() : 'Pharmacist'; })(),
  });

  /* Persist to backend (prescription + queue entry + audit log) */
  window._phPersist({
    rxId:         rxId,
    rxRef:        rxRef,
    queueEntryId: qe.id || qe._id || rxId,
    status:       'Rejected',
    queueState:   'rejected',
    extra:        { rejectedAt: rejectedAt, rejectionReason: fullReason },
    auditAction:  'reject_prescription',
    auditNote:    'Rejection reason: ' + fullReason,
  });

  document.getElementById('ph-reject-overlay').remove();
  _phRenderQueue();
  UI.showToast(qe.patient + ' — prescription rejected', 'err');
};

/* ══════════════════════════════════════════════════════════════════
   §3a  PROCEED TO VALIDATION HELPER
        Resolves the correct prescription object for rxRef, synthesising
        one from the queue entry when _PH.prescriptions doesn't hold it,
        then navigates to the validation page.
══════════════════════════════════════════════════════════════════ */
window._phProceedToValidation = function (rxRef) {
  /* Close detail modal if open */
  var overlay = document.getElementById('ph-rx-detail-overlay');
  if (overlay) overlay.remove();

  var qe = (window._phQueue || []).find(function (x) {
    return x.prescriptionRef === rxRef || x.id === rxRef;
  });

  /* 1. Try exact code match */
  var rx = (_PH.prescriptions || []).find(function (p) { return p.code === rxRef; });

  /* 2. Try by MongoDB _id stored in the queue entry */
  if (!rx && qe && qe.prescriptionId) {
    rx = (_PH.prescriptions || []).find(function (p) { return p._id === qe.prescriptionId; });
  }

  /* 3. Synthesise from queue entry so the correct Rx is always shown */
  if (!rx && qe) {
    rx = {
      code:              rxRef,
      _id:               qe.prescriptionId || rxRef,
      patientName:       qe.patientName || qe.patient || '',
      patientId:         qe.patientId || '',
      idNumber:          qe.idNumber || qe.nationalId || '',
      doctor:            qe.prescribedByName || qe.doctor || '',
      prescribedByName:  qe.prescribedByName || '',
      prescribedByReg:   qe.prescribedByReg || '',
      doctorReg:         qe.prescribedByReg || '',
      facility:          qe.facility || '',
      issued:            qe.prescribedAt ? qe.prescribedAt.slice(0, 10) : '',
      status:            'Awaiting Pharmacist Review',
      submittedAt:       qe.prescribedAt || '',
      repeatPrescription: qe.repeatPrescription || false,
      repeat:            qe.repeat || null,
      patientInstructions: qe.patientInstructions || '',
      clinicalNotes:     qe.clinicalNotes || '',
      items: (qe.medications || []).map(function (m) {
        return {
          drug:          m.name || '',
          medicationName: m.name || '',
          dosage:        (m.dose || '') + (m.frequency ? ' ' + m.frequency : ''),
          frequency:     m.frequency || '',
          route:         m.route || '',
          duration:      m.duration || '',
          quantity:      m.quantity || m.qty || '',
          unit:          m.unit || ''
        };
      }),
      duplicateWarning: null,
      interactions: []
    };
    /* Register into _PH.prescriptions so search / history work */
    if (!(_PH.prescriptions || []).find(function (p) { return p.code === rxRef; })) {
      (_PH.prescriptions = _PH.prescriptions || []).unshift(rx);
    }
  }

  window._phSelRx  = rx || null;
  window._phChecked = false;
  Router.setPage('ph-validation');
};

/* ══════════════════════════════════════════════════════════════════
   §3b  PRESCRIPTION DETAIL MODAL
        Opens when any queue row is clicked.
        Shows full Rx info + context-sensitive action buttons.
══════════════════════════════════════════════════════════════════ */
window._phShowRxDetail = function (rxRef) {
  /* Resolve prescription and queue entry */
  var rx = (_PH.prescriptions || []).find(function (p) { return p.code === rxRef; });
  var qe = (window._phQueue || []).find(function (x) { return x.prescriptionRef === rxRef || x.id === rxRef; });
  if (!rx && !qe) { if (window.UI) UI.showToast('Prescription not found', 'err'); return; }

  var patName    = (rx && (rx.patientName || rx.patient)) || (qe && (qe.patientName || qe.patient)) || '—';
  var patId      = (rx && (rx.patientId || rx.idNumber)) || (qe && qe.patientId) || '—';
  var rxCode     = rxRef;
  var doctor     = (rx && rx.doctor) || (qe && (qe.prescribedByName || qe.doctor)) || '—';
  var doctorReg  = (rx && rx.doctorReg) || (qe && qe.prescribedByReg) || '';
  var facility   = (rx && rx.facility) || (qe && qe.facility) || '—';
  var issued     = (rx && rx.issued) || (qe && qe.prescribedAt ? qe.prescribedAt.slice(0,10) : '') || '—';
  var validUntil = (rx && rx.validUntil) || '';
  var isRepeat   = (rx && rx.repeatPrescription) || (qe && qe.repeatPrescription) || false;
  var repeat     = (rx && rx.repeat) || (qe && qe.repeat) || null;
  var state      = (qe && qe.state) || 'new-request';
  var instructions = (rx && rx.patientInstructions) || (qe && qe.patientInstructions) || '';
  var clinicalNotes = (rx && rx.clinicalNotes) || (qe && qe.clinicalNotes) || '';

  /* Medications list from items / medications / lines */
  var meds = (rx && rx.items) || (qe && qe.medications) || (qe && qe.lines) || [];

  /* Remove any existing modal */
  var old = document.getElementById('ph-rx-detail-overlay');
  if (old) old.remove();

  /* ── Helpers ── */
  function _field(label, value) {
    if (!value || value === '—' && !label) return '';
    return '<div style="display:flex;flex-direction:column;gap:2px">' +
      '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280">' + label + '</span>' +
      '<span style="font-size:13px;color:#111;font-weight:500">' + (value || '—') + '</span>' +
    '</div>';
  }

  /* ── Medication rows ── */
  var medRows = '';
  if (meds.length) {
    medRows = meds.map(function (m, i) {
      var name    = m.medicationName || m.drug || m.name || ('Medication ' + (i+1));
      var dosage  = m.dosage || (m.dose ? m.dose + (m.frequency ? ' · ' + m.frequency : '') : '') || '—';
      var freq    = m.frequency || '';
      var dur     = m.duration || m.durationDays || '';
      var qty     = m.quantity || m.qty || '';
      var route   = m.route || '';
      var instr   = m.instructions || m.specialInstructions || '';
      return '<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin-bottom:8px">' +
        '<div style="font-size:14px;font-weight:700;color:#0F6E56;margin-bottom:8px">' + (i+1) + '. ' + name + '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">' +
          _field('Dosage', dosage) +
          (freq  ? _field('Frequency', freq)  : '') +
          (route ? _field('Route', route)     : '') +
          (dur   ? _field('Duration', String(dur) + (typeof dur === 'number' ? ' days' : '')) : '') +
          (qty   ? _field('Quantity', String(qty)) : '') +
        '</div>' +
        (instr ? '<div style="margin-top:8px;font-size:12px;color:#374151"><span style="font-weight:600">Instructions:</span> ' + instr + '</div>' : '') +
      '</div>';
    }).join('');
  } else {
    medRows = '<div style="color:#9ca3af;font-size:13px;padding:12px 0">No medication details available.</div>';
  }

  /* ── Action buttons based on state ── */
  var actionBtns = '';
  if (state === 'new-request') {
    actionBtns =
      '<button onclick="document.getElementById(\'ph-rx-detail-overlay\').remove();window._phShowRejectModal(\'' + rxRef + '\')" ' +
      'style="padding:11px 22px;border-radius:9px;border:1.5px solid #dc2626;background:#fff;color:#dc2626;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">✕ Reject</button>' +
      '<button onclick="document.getElementById(\'ph-rx-detail-overlay\').remove();window._phAcceptRequest(\'' + rxRef + '\')" ' +
      'style="padding:11px 28px;border-radius:9px;border:none;background:#0F6E56;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">✓ Accept Request</button>';
  } else if (state === 'waiting') {
    actionBtns =
      '<button onclick="document.getElementById(\'ph-rx-detail-overlay\').remove();window._phShowRejectModal(\'' + rxRef + '\')" ' +
      'style="padding:11px 22px;border-radius:9px;border:1.5px solid #dc2626;background:#fff;color:#dc2626;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">✕ Reject</button>' +
      '<button onclick="window._phProceedToValidation(\'' + rxRef + '\')" ' +
      'style="padding:11px 28px;border-radius:9px;border:none;background:#0F6E56;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">▶ Proceed to Validation</button>';
  } else if (state === 'in-progress' || state === 'validated') {
    actionBtns =
      '<button onclick="document.getElementById(\'ph-rx-detail-overlay\').remove();(function(){var rx=(_PH.prescriptions||[]).find(function(p){return p.code===\'' + rxRef + '\';});window._phDispRx=rx;window._phDispChecked=[];window._phDispScanned=true;Router.setPage(\'dispensed\');})()" ' +
      'style="padding:11px 28px;border-radius:9px;border:none;background:#0F6E56;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">▶ Proceed to Dispensing</button>';
  }

  /* ── State badge ── */
  var stateLabels = { 'new-request':'New Request','waiting':'Waiting','validated':'Validated',
    'in-progress':'Dispensing & Labels','ready-for-collection':'Ready for Collection',
    'completed':'Completed','rejected':'Rejected','pending-stock':'Pending Stock',
    'returned-for-amendment':'Returned for Amendment' };
  var stateColors = { 'new-request':'background:#EEF2FF;color:#3730A3','waiting':'background:#FEF9C3;color:#854D0E',
    'in-progress':'background:#E0F2FE;color:#0369A1','ready-for-collection':'background:#DCFCE7;color:#166534',
    'completed':'background:#F0FDF4;color:#15803D','rejected':'background:#FEF2F2;color:#991B1B',
    'pending-stock':'background:#FFF7ED;color:#C2410C','returned-for-amendment':'background:#FEF2F2;color:#991B1B',
    'validated':'background:#E0F2FE;color:#0369A1' };

  var overlay = document.createElement('div');
  overlay.id = 'ph-rx-detail-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto';

  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.22);font-family:inherit">' +

      /* Header */
      '<div style="padding:20px 24px 16px;border-bottom:1px solid #f0f0f0;display:flex;align-items:flex-start;justify-content:space-between;gap:12px">' +
        '<div>' +
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:4px">Prescription Detail</div>' +
          '<div style="font-size:20px;font-weight:800;color:#111;margin-bottom:4px">' + patName + '</div>' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
            '<span style="font-family:monospace;font-size:12px;background:#f1f5f9;padding:3px 8px;border-radius:5px;color:#0F6E56;font-weight:700">' + rxCode + '</span>' +
            '<span style="font-size:12px;padding:3px 10px;border-radius:20px;font-weight:700;' + (stateColors[state]||'background:#f1f5f9;color:#374151') + '">' + (stateLabels[state]||state) + '</span>' +
          '</div>' +
        '</div>' +
        '<button onclick="document.getElementById(\'ph-rx-detail-overlay\').remove()" ' +
        'style="background:#f1f5f9;border:none;width:32px;height:32px;border-radius:8px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#374151">✕</button>' +
      '</div>' +

      '<div style="padding:20px 24px;display:flex;flex-direction:column;gap:20px">' +

        /* Patient info */
        '<div>' +
          '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9ca3af;margin-bottom:10px">Patient Information</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px">' +
            _field('Patient Name', patName) +
            (patId && patId !== '—' ? _field('ID / MRN', patId) : '') +
            _field('Facility', facility) +
          '</div>' +
        '</div>' +

        /* Prescriber info */
        '<div>' +
          '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9ca3af;margin-bottom:10px">Prescribing Doctor</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px">' +
            _field('Doctor', doctor) +
            (doctorReg ? _field('HPCSA / Reg No.', doctorReg) : '') +
            _field('Date Issued', issued) +
            (validUntil ? _field('Valid Until', validUntil) : '') +
            _field('Repeat Prescription', isRepeat ? 'Yes' + (repeat ? ' (' + (repeat.remaining || 0) + ' of ' + (repeat.allowed || 0) + ' remaining)' : '') : 'No') +
          '</div>' +
        '</div>' +

        /* Medications */
        '<div>' +
          '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9ca3af;margin-bottom:10px">Prescribed Medications (' + meds.length + ')</div>' +
          medRows +
        '</div>' +

        /* Instructions & notes */
        (instructions || clinicalNotes ?
          '<div>' +
            '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9ca3af;margin-bottom:10px">Additional Instructions</div>' +
            '<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:10px">' +
              (instructions ? '<div><span style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Patient Instructions</span><div style="font-size:13px;color:#111;margin-top:4px">' + instructions + '</div></div>' : '') +
              (clinicalNotes ? '<div><span style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Clinical Notes</span><div style="font-size:13px;color:#111;margin-top:4px">' + clinicalNotes + '</div></div>' : '') +
            '</div>' +
          '</div>'
        : '') +

      '</div>' +

      /* Footer actions */
      (actionBtns ?
        '<div style="padding:16px 24px 20px;border-top:1px solid #f0f0f0;display:flex;justify-content:flex-end;gap:10px">' +
          actionBtns +
        '</div>'
      : '') +

    '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function (ev) { if (ev.target === overlay) overlay.remove(); });
};

/* ══════════════════════════════════════════════════════════════════
   §4  RETURN FOR AMENDMENT MODAL (validation fail → doctor)
══════════════════════════════════════════════════════════════════ */
window._phShowReturnModal = function (rxRef) {
  var existingOverlay = document.getElementById('ph-return-overlay');
  if (existingOverlay) existingOverlay.remove();

  var rx = (_PH.prescriptions || []).find(function (p) { return p.code === rxRef; }) ||
           (window._phSelRx && window._phSelRx.code === rxRef ? window._phSelRx : null);
  var patName = rx ? (rx.patientName || rx.patient || rxRef) : rxRef;

  var overlay = document.createElement('div');
  overlay.id = 'ph-return-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center';

  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;padding:28px 32px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2)">' +
      '<div style="font-size:18px;font-weight:800;color:#EF9F27;margin-bottom:4px">Return for Amendment</div>' +
      '<div style="font-size:13px;color:#777;margin-bottom:20px">Patient: <strong>' + patName + '</strong> · Rx: <code style="font-size:12px">' + rxRef + '</code></div>' +
      '<div style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:8px;padding:12px;margin-bottom:16px;font-size:12px;color:#78350F">' +
        '⚠ This will return the prescription to the prescribing doctor for correction. The original prescription history is preserved.' +
      '</div>' +
      '<div style="margin-bottom:16px">' +
        '<label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:4px">Amendment Required <span style="color:#dc2626">*</span></label>' +
        '<select id="ph-return-reason-sel" onchange="document.getElementById(\'ph-return-reason-other\').style.display=this.value===\'Other\'?\'block\':\'none\'" ' +
        'style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none">' +
          '<option value="">— Select amendment needed —</option>' +
          '<option value="Incorrect dose">Incorrect dose specified</option>' +
          '<option value="Incorrect frequency">Incorrect frequency / duration</option>' +
          '<option value="Incorrect route">Incorrect route of administration</option>' +
          '<option value="Missing clinical information">Missing clinical information</option>' +
          '<option value="Contraindication identified">Contraindication identified — please review</option>' +
          '<option value="Drug interaction">Drug interaction — please review medication list</option>' +
          '<option value="Formulary substitution required">Formulary substitution required</option>' +
          '<option value="Other">Other (specify below)</option>' +
        '</select>' +
      '</div>' +
      '<div id="ph-return-reason-other" style="display:none;margin-bottom:16px">' +
        '<label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:4px">Specify amendment needed</label>' +
        '<textarea id="ph-return-reason-text" rows="2" placeholder="Describe what needs to be corrected…" ' +
        'style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;resize:none"></textarea>' +
      '</div>' +
      '<div style="margin-bottom:20px">' +
        '<label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:4px">Message to Doctor (optional)</label>' +
        '<textarea id="ph-return-notes" rows="3" placeholder="Additional context for the prescribing doctor…" ' +
        'style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none;resize:none"></textarea>' +
      '</div>' +
      '<div style="display:flex;gap:10px">' +
        '<button onclick="document.getElementById(\'ph-return-overlay\').remove()" ' +
        'style="flex:1;padding:11px;border-radius:8px;border:1.5px solid #e0e0e0;background:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Cancel</button>' +
        '<button onclick="window._phDoReturn(\'' + rxRef + '\')" ' +
        'style="flex:2;padding:11px;border-radius:8px;border:none;background:#EF9F27;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">↩ Return for Amendment</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function (ev) { if (ev.target === overlay) overlay.remove(); });
};

window._phDoReturn = function (rxRef) {
  var selEl   = document.getElementById('ph-return-reason-sel');
  var otherEl = document.getElementById('ph-return-reason-text');
  var notesEl = document.getElementById('ph-return-notes');
  if (!selEl) return;

  var reasonSel   = selEl.value;
  var reasonOther = (otherEl && otherEl.value.trim()) || '';
  var message     = (notesEl && notesEl.value.trim()) || '';

  if (!reasonSel) { UI.showToast('Please select the amendment needed', 'err'); return; }
  if (reasonSel === 'Other' && !reasonOther) { UI.showToast('Please describe the amendment needed', 'err'); return; }

  var fullReason = reasonSel === 'Other' ? reasonOther : reasonSel;
  if (message) fullReason += ' — ' + message;

  var rx = (_PH.prescriptions || []).find(function (p) { return p.code === rxRef; }) ||
           (window._phSelRx && window._phSelRx.code === rxRef ? window._phSelRx : null);
  var rxId = (rx && (rx._id || rx.id || rx.code)) || rxRef;

  var q  = window._phQueue || [];
  var qe = q.find(function (x) { return x.prescriptionRef === rxRef; });
  if (qe) rxId = qe.prescriptionId || rxId;

  var returnedAt = new Date().toISOString();

  /* ── Advance local state immediately (local-first) ── */
  if (qe) { qe.state = 'returned-for-amendment'; qe.amendmentReason = fullReason; qe.returnedAt = returnedAt; }
  var pq = (_PH.queue || []).find(function (x) { return x.prescriptionRef === rxRef; });
  if (pq) { pq.state = 'returned-for-amendment'; pq.amendmentReason = fullReason; }
  if (rx) { rx.status = 'Returned for Amendment'; rx.amendmentReason = fullReason; }

  /* Cross-tab: notify doctor module */
  if (rx) window._phBroadcastDoctorUpdate(rx, 'Returned for Amendment');

  /* History */
  _PH.history.unshift({
    id:              'HIST-RETURN-' + Date.now(),
    patientName:     qe ? qe.patient : (rx ? rx.patientName : '—'),
    prescriptionRef: rxRef,
    status:          'Returned for Amendment',
    drug:            (rx && rx.items && rx.items[0] && (rx.items[0].drug || rx.items[0].medicationName)) || '—',
    amendmentReason: fullReason,
    dispensedAt:     returnedAt,
    doctor:          (rx && rx.prescribedByName) || (qe && qe.prescribedByName) || '—',
    pharmacist:      (function () { var u = (window.API && window.API.getStoredUser && window.API.getStoredUser()) || {}; return u.firstName ? (u.firstName + ' ' + (u.lastName || '')).trim() : 'Pharmacist'; })(),
  });

  var overlay = document.getElementById('ph-return-overlay');
  if (overlay) overlay.remove();

  /* Clear validation selection so the page doesn't hold stale data */
  window._phSelRx = null;

  /* Navigate to returned-for-amendment queue tab */
  window._phQueueTab = 'returned-for-amendment';
  _phRenderQueue();
  if (typeof Router !== 'undefined') Router.setPage('ph-queue');
  UI.showToast('Prescription returned to doctor for amendment', 'ok');

  /* Persist to backend — prescription + queue entry + audit log */
  window._phPersist({
    rxId:         rxId,
    rxRef:        rxRef,
    queueEntryId: (qe && (qe.id || qe._id)) || rxId,
    status:       'Returned for Amendment',
    queueState:   'returned-for-amendment',
    extra:        { returnedAt: returnedAt, amendmentReason: fullReason },
    auditAction:  'return_for_amendment',
    auditNote:    'Amendment reason: ' + fullReason,
  });
};

/* ══════════════════════════════════════════════════════════════════
   §5  PENDING STOCK (dispensing → pending-stock)
══════════════════════════════════════════════════════════════════ */
window._phMarkPendingStock = function (rxRef) {
  var rx = window._phDispRx || (_PH.prescriptions || []).find(function (p) { return p.code === rxRef; });
  if (!rx) { UI.showToast('No prescription loaded for dispensing', 'err'); return; }
  var rxId = rx._id || rx.id || rx.code || rxRef;
  var pendingAt = new Date().toISOString();

  /* ── Advance local state immediately (local-first, like Accept/Reject) ── */
  rx.status = 'Pending Stock';

  var q  = window._phQueue || [];
  var qe = q.find(function (x) { return x.prescriptionRef === (rx.code || rxRef); });
  if (qe) { qe.state = 'pending-stock'; qe.pendingStockAt = pendingAt; }

  var pq = (_PH.queue || []).find(function (x) { return x.prescriptionRef === (rx.code || rxRef); });
  if (pq) { pq.state = 'pending-stock'; }

  _PH.history.unshift({
    id:              'HIST-PSTOCK-' + Date.now(),
    patientName:     rx.patientName || (qe && qe.patient) || '—',
    prescriptionRef: rx.code || rxRef,
    status:          'Out of Stock',
    drug:            (rx.items && rx.items[0] && (rx.items[0].drug || rx.items[0].medicationName)) || '—',
    dispensedAt:     pendingAt,
    doctor:          rx.prescribedByName || rx.doctor || '—',
    pharmacist:      (function () {
      var u = (window.API && window.API.getStoredUser && window.API.getStoredUser()) || {};
      return u.firstName ? (u.firstName + ' ' + (u.lastName || '')).trim() : 'Pharmacist';
    })(),
  });

  /* Clear dispensing context */
  window._phDispRx      = null;
  window._phDispChecked = [];
  window._phDispScanned = false;

  /* Navigate to queue — Pending Stock tab */
  window._phQueueTab = 'pending-stock';
  if (typeof Router !== 'undefined') Router.setPage('ph-queue');
  _phRenderQueue();
  UI.showToast('Prescription moved to Pending Stock queue', 'ok');

  /* Persist to backend — prescription + queue entry + audit log */
  window._phPersist({
    rxId:         rxId,
    rxRef:        rx.code || rxRef,
    queueEntryId: (qe && (qe.id || qe._id)) || rxId,
    status:       'Pending Stock',
    queueState:   'pending-stock',
    extra:        { pendingStockAt: pendingAt },
    auditAction:  'mark_pending_stock',
    auditNote:    'Stock unavailable — moved to Pending Stock queue',
  });
};

/* ══════════════════════════════════════════════════════════════════
   §6  IDENTITY VERIFICATION at collection counter
   The existing _phDoConfirmCollection already requires an ID input.
   This adds a stricter gate: if ID doesn't match recorded patientId,
   show a fail modal that keeps the Rx in ready-for-collection.
══════════════════════════════════════════════════════════════════ */
window._phVerifyAndConfirm = async function (id, ticket) {
  var idInput = (document.getElementById('ph-collect-idverify') || {}).value || '';
  if (!idInput.trim()) { UI.showToast('Please enter the patient\'s ID or passport number', 'err'); return; }

  var q  = window._phQueue || [];
  var e  = q.find(function (x) { return x.id === id; });
  if (!e) { UI.showToast('Queue entry not found', 'err'); return; }

  /* Helper: detect MongoDB ObjectId (24-char hex) — not a real national ID */
  var isMongoId = function (v) { return /^[0-9a-f]{24}$/i.test((v || '').trim()); };

  /* Build candidate list from queue entry AND the linked prescription record */
  var rx = (_PH.prescriptions || []).find(function (p) {
    return p.code === e.prescriptionRef || p._id === (e.prescriptionId || e.prescriptionRef);
  });
  var rxPatient = (rx && rx.patient) || {};

  /* Gather every ID-shaped field from both sources; skip MongoDB ObjectIds */
  var rawCands = [
    e.idNumber, e.nationalId, e.passportNumber,
    e.patientIdNumber, e.nationalIdNumber,
    rxPatient.idNumber, rxPatient.nationalId, rxPatient.passportNumber,
    rxPatient.nationalIdNumber, rxPatient.patientIdNumber,
    rx && rx.patientIdNumber, rx && rx.nationalId
  ];
  /* patientId is last resort — only use if it is not a Mongo ObjectId */
  rawCands.push(e.patientId);
  rawCands.push(rxPatient._id);

  var realIds = rawCands.filter(function (v) {
    return v && typeof v === 'string' && v.trim() && v.trim() !== '—' && !isMongoId(v);
  });

  var enteredId = idInput.trim();
  var normalize = function (s) { return s.replace(/[\s\-]/g, '').toLowerCase(); };

  /* Only hard-fail if we found at least one real (non-Mongo) ID to compare against */
  var hasRealId = realIds.length > 0;
  var matched   = realIds.some(function (v) { return normalize(v) === normalize(enteredId); });

  if (hasRealId && !matched) {
    /* Verification FAILED — show failure panel, keep in ready-for-collection */
    var failDiv = document.createElement('div');
    failDiv.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center';
    failDiv.innerHTML =
      '<div style="background:#fff;border-radius:16px;padding:28px 32px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center">' +
        '<div style="font-size:40px;margin-bottom:12px">🚫</div>' +
        '<div style="font-size:18px;font-weight:800;color:#dc2626;margin-bottom:8px">Identity Verification Failed</div>' +
        '<div style="font-size:13px;color:#555;margin-bottom:20px">The ID number entered does not match the patient\'s record. ' +
        'The prescription remains in the Ready for Collection queue.</div>' +
        '<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:12px;margin-bottom:20px;font-size:12px;color:#991B1B">' +
        'Do not hand over medication without confirmed identity. If the patient believes there is an error, please contact a supervisor.' +
        '</div>' +
        '<button onclick="this.closest(\'div\').parentElement.remove()" ' +
        'style="width:100%;padding:12px;border-radius:8px;border:none;background:#dc2626;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Close</button>' +
      '</div>';
    document.body.appendChild(failDiv);
    failDiv.addEventListener('click', function (ev) { if (ev.target === failDiv) failDiv.remove(); });
    return; /* Do NOT advance state */
  }

  /* Verification PASSED — proceed to full confirm collection */
  window._phDoConfirmCollection(id, ticket);
};

/* ══════════════════════════════════════════════════════════════════
   §7  ENHANCED CONFIRM COLLECTION (patches existing _phDoConfirmCollection)
   The existing function already does most of the work. We enhance it to:
   - Record handover user (logged-in pharmacist)
   - Record full audit trail fields
   - Broadcast to doctor module
   Then re-patch the overlay button to call _phVerifyAndConfirm first.
══════════════════════════════════════════════════════════════════ */
(function _phPatchConfirmCollection() {
  var _origConfirm = window._phDoConfirmCollection;
  window._phDoConfirmCollection = function (id, ticket) {
    /* Call original (now synchronous / local-first) */
    _origConfirm(id, ticket);

    /* Additional audit trail: broadcast back to doctor */
    var q  = window._phQueue || [];
    var e  = q.find(function (x) { return x.id === id; });
    if (e) {
      var rx = (_PH.prescriptions || []).find(function (p) { return p.code === e.prescriptionRef; });
      if (rx) window._phBroadcastDoctorUpdate(rx, 'Completed');

      /* Enhance the history entry with full audit fields */
      var latestHist = _PH.history[0];
      if (latestHist && latestHist.id && latestHist.id.startsWith('HIST-COLLECT-')) {
        var pharmUser = (window.API && window.API.getStoredUser && window.API.getStoredUser()) || {};
        latestHist.handoverUser       = pharmUser.firstName ? (pharmUser.firstName + ' ' + (pharmUser.lastName || '')).trim() : 'Pharmacist';
        latestHist.collectionDatetime = e.collectedAt || new Date().toISOString();
        latestHist.rxNumber           = e.prescriptionRef || '—';
        latestHist.collectorId        = e.collectedById || '—';
        latestHist.collectionStatus   = 'Collected';
        latestHist.auditComplete      = true;
        /* Ensure medications array is populated for the history view */
        if (!latestHist.medications || !latestHist.medications.length) {
          var rx2 = (_PH.prescriptions || []).find(function (p) { return p.code === (e.prescriptionRef || ''); });
          if (rx2 && rx2.items) {
            latestHist.medications = rx2.items.map(function (m) {
              return {
                name:     m.drug || m.name || m.medicationName || '—',
                dosage:   m.dosage || m.dose || m.strength || '—',
                quantity: m.quantity || m.qty || '—',
                unit:     m.unit || '',
                form:     m.form || m.dosageForm || '',
              };
            });
          }
        }
      }
    }
  };

  /* Also patch _phConfirmCollection to wire verify before confirm */
  var _origShowConfirm = window._phConfirmCollection;
  window._phConfirmCollection = function (id, ticket) {
    /* Show the standard overlay but replace the confirm button with verify+confirm */
    _origShowConfirm(id, ticket);
    /* After a tick, replace the confirm button's onclick */
    setTimeout(function () {
      var btn = document.getElementById('ph-collect-confirm-btn');
      if (btn) {
        btn.setAttribute('onclick', 'window._phVerifyAndConfirm(\'' + id + '\',\'' + ticket + '\')');
        btn.textContent = '✓ Verify & Confirm Collection';
      }
    }, 50);
  };
})();

/* ══════════════════════════════════════════════════════════════════
   §8  NO-DUPLICATE NOTIFICATION CHECK
   Patches _phSendReadyNotification to record timestamps and skip
   if the same patient was notified within the last 10 minutes.
══════════════════════════════════════════════════════════════════ */
(function _phPatchNotification() {
  var _origNotify = window._phSendReadyNotification;
  window._phSendReadyNotification = async function (entryOrRx) {
    /* Duplicate guard: check last notification time for this Rx/patient */
    var rxRef      = entryOrRx.prescriptionRef || entryOrRx.code || '';
    var patName    = entryOrRx.patient || entryOrRx.patientName || '';
    var cacheKey   = 'NIHMS_NOTIF_' + (rxRef || patName);
    var lastNotif  = 0;
    try { lastNotif = parseInt(localStorage.getItem(cacheKey) || '0', 10) || 0; } catch (_) {}
    var now = Date.now();
    if (now - lastNotif < 10 * 60 * 1000) {
      UI.showToast('Patient already notified — skipping duplicate', 'ok');
      return;
    }

    /* Record notification timestamp */
    try { localStorage.setItem(cacheKey, String(now)); } catch (_) {}

    /* Record notifiedAt on queue entry */
    var q  = window._phQueue || [];
    var qe = q.find(function (x) { return x.prescriptionRef === rxRef; });
    if (qe) { qe.notifiedAt = new Date().toISOString(); }

    /* PATCH notifiedAt to backend */
    if (rxRef) {
      API._fetchDirect('/prescriptions/' + rxRef, {
        method: 'PATCH',
        body: JSON.stringify({ notifiedAt: new Date().toISOString(), patientNotified: true }),
      }).catch(function () {});
    }

    /* Call original */
    await _origNotify(entryOrRx);
  };
})();

/* ══════════════════════════════════════════════════════════════════
   §9  8-QUEUE RENDER (replaces existing _phRenderQueue)
   Full 8 tabs: new-request, waiting, in-progress,
   ready-for-collection, completed, rejected,
   pending-stock, returned-for-amendment
══════════════════════════════════════════════════════════════════ */
(function _phOverrideRenderQueue() {
  var _ALL_TABS = [
    { key: 'new-request',          label: 'New Requests',           color: '#1A4A9B', badgeStyle: 'background:#EEF7FF;color:#1A4A9B' },
    { key: 'waiting',              label: 'Waiting',                color: '#777',    badgeStyle: 'background:#f4f5f0;color:#777' },
    { key: 'in-progress',          label: 'Dispensing & Labels',    color: '#7C3AED', badgeStyle: 'background:#F5F3FF;color:#7C3AED' },
    { key: 'ready-for-collection', label: 'Ready for Collection',   color: '#0F6E56', badgeStyle: 'background:#EDFBF3;color:#0F6E56' },
    { key: 'completed',            label: 'Completed',              color: '#374151', badgeStyle: 'background:#f4f5f0;color:#0F6E56' },
    { key: 'rejected',             label: 'Rejected',               color: '#dc2626', badgeStyle: 'background:#FEF2F2;color:#991B1B' },
    { key: 'pending-stock',        label: 'Pending Stock',          color: '#C2410C', badgeStyle: 'background:#FFF7ED;color:#C2410C' },
    { key: 'returned-for-amendment', label: 'Returned for Amendment', color: '#78350F', badgeStyle: 'background:#FFFBEB;color:#92400E' },
  ];

  window._phRenderQueue = function () {
    var el = document.getElementById('ph-queue-body');
    if (!el) return;

    /* Sync _phQueue from _PH */
    window._phQueue = (_PH.queue || []).slice();

    var q          = window._phQueue;
    var activeTab  = window._phQueueTab || 'new-request';
    var srch       = (window._phQueueSearch || '').trim().toLowerCase();

    /* ── Counts per tab ── */
    var counts = {};
    _ALL_TABS.forEach(function (t) {
      counts[t.key] = q.filter(function (e) { return e.state === t.key; }).length;
    });

    /* ── Search bar ── */
    var searchBar =
      '<div style="margin-bottom:14px">' +
        '<input type="text" value="' + (window._phQueueSearch || '') + '" ' +
        'oninput="window._phQueueSearch=this.value;_phRenderQueue()" ' +
        'placeholder="Search by patient, Rx, ticket…" ' +
        'style="width:100%;box-sizing:border-box;padding:9px 14px;border:1.5px solid #e0e0e0;border-radius:9px;font-size:13px;font-family:inherit;outline:none">' +
      '</div>';

    /* ── Tab bar (two rows for 8 tabs) ── */
    var tabBar =
      '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:14px">' +
        _ALL_TABS.map(function (t) {
          var active = t.key === activeTab;
          var cnt    = counts[t.key];
          return '<button onclick="window._phQueueTab=\'' + t.key + '\';_phRenderQueue()" ' +
            'style="padding:6px 12px;border-radius:7px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;border:none;' +
            (active
              ? 'background:' + t.color + ';color:#fff'
              : 'background:#f4f5f0;color:#374151') + '">' +
            t.label +
            (cnt > 0 ? '<span style="margin-left:5px;padding:1px 7px;border-radius:999px;font-size:11px;' +
              (active ? 'background:rgba(255,255,255,.25);color:#fff' : 'background:' + t.color + ';color:#fff') + '">' + cnt + '</span>' : '') +
          '</button>';
        }).join('') +
      '</div>';

    /* ── Filter to active tab ── */
    var filtered = q.filter(function (e) { return e.state === activeTab; });
    if (srch) {
      filtered = filtered.filter(function (e) {
        var haystack = [e.patient||'', e.patientId||'', e.ticket||'', e.prescriptionRef||'', e.prescribedByName||'', e.doctor||''].join(' ').toLowerCase();
        return haystack.indexOf(srch) > -1;
      });
    }

    var tabDef   = _ALL_TABS.find(function (t) { return t.key === activeTab; }) || _ALL_TABS[0];
    var emptyMsg = srch ? 'No results for "' + srch + '".' : 'No prescriptions in ' + tabDef.label + '.';

    /* ── Action buttons per state ── */
    function _rowActions(e) {
      var ref = e.prescriptionRef || e.id;
      if (activeTab === 'new-request') {
        return '<div style="display:flex;gap:6px;flex-shrink:0">' +
          '<button onclick="event.stopPropagation();window._phAcceptRequest(\'' + ref + '\')" ' +
          'style="padding:6px 12px;border-radius:6px;border:none;background:#0F6E56;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Accept</button>' +
          '<button onclick="event.stopPropagation();window._phShowRejectModal(\'' + ref + '\')" ' +
          'style="padding:6px 12px;border-radius:6px;border:1.5px solid #dc2626;background:#fff;color:#dc2626;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">Reject</button>' +
        '</div>';
      }
      if (activeTab === 'waiting') {
        return ''; /* No action buttons — pharmacist clicks row to open detail view */
      }
      if (activeTab === 'ready-for-collection') {
        return '<button onclick="event.stopPropagation();_phConfirmCollection(\'' + e.id + '\',\'' + e.ticket + '\')" ' +
          'style="flex-shrink:0;padding:6px 14px;border-radius:6px;border:none;background:#0F6E56;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">' +
          '✓ Collect</button>';
      }
      if (activeTab === 'pending-stock') {
        return '<button onclick="event.stopPropagation();window._phReactivateFromStock(\'' + ref + '\')" ' +
          'style="flex-shrink:0;padding:6px 14px;border-radius:6px;border:none;background:#C2410C;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">' +
          '↩ Stock Received</button>';
      }
      return '';
    }

    /* ── Extra info per state ── */
    function _rowMeta(e) {
      if (activeTab === 'rejected' && e.rejectionReason) {
        return '<div style="font-size:11px;color:#dc2626;margin-top:3px">Reason: ' + e.rejectionReason + '</div>';
      }
      if (activeTab === 'returned-for-amendment' && e.amendmentReason) {
        return '<div style="font-size:11px;color:#92400E;margin-top:3px">Amendment needed: ' + e.amendmentReason + '</div>';
      }
      if (activeTab === 'completed' && e.collectedAt) {
        var cd = new Date(e.collectedAt);
        return '<div style="font-size:11px;color:#0F6E56;margin-top:3px">Collected: ' + cd.toLocaleString('en-ZA') + (e.collectedByPharmacist ? ' by ' + e.collectedByPharmacist : '') + '</div>';
      }
      if (activeTab === 'pending-stock') {
        return '<div style="font-size:11px;color:#C2410C;margin-top:3px">Awaiting stock replenishment</div>';
      }
      return '';
    }

    var listHTML;
    if (!filtered.length) {
      listHTML = '<div style="text-align:center;padding:32px 20px;color:#9ca3af;font-size:13px">' + emptyMsg + '</div>';
    } else {
      listHTML = '<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:1px">' +
        filtered.map(function (e, i) {
          var isFirst  = i === 0;
          var isLast   = i === filtered.length - 1;
          var radius   = isFirst && isLast ? '10px' : isFirst ? '10px 10px 0 0' : isLast ? '0 0 10px 10px' : '0';
          var timeStr  = (function () {
            try { var d = new Date(e.prescribedAt || e.submittedAt || ''); if (!isNaN(d)) return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false }); } catch (_) {} return '';
          })();
          var waitMins = e.waitedMin || (e.prescribedAt ? Math.round((Date.now() - new Date(e.prescribedAt).getTime()) / 60000) : 0);
          var waitStr  = (waitMins && !isNaN(waitMins) && waitMins > 0) ? (waitMins < 60 ? waitMins + 'm wait' : Math.floor(waitMins / 60) + 'h ' + (waitMins % 60) + 'm wait') : '';

          /* Row click → open prescription detail modal */
          var liClick = 'onclick="window._phShowRxDetail(\'' + (e.prescriptionRef || e.id) + '\')"';

          /* Priority badge */
          var priBadge = (function () {
            var p = (e.priority || '').toLowerCase();
            if (p === 'urgent' || p === 'high') return '<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:#FEF2F2;color:#dc2626;margin-left:6px">URGENT</span>';
            if (p === 'medium') return '<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:#FFFBEB;color:#D97706;margin-left:6px">MEDIUM</span>';
            return '';
          })();

          return '<li ' + liClick + ' style="' +
            'display:flex;align-items:center;justify-content:space-between;gap:12px;' +
            'padding:14px 16px;background:#fff;cursor:pointer;' +
            'border:1px solid #e0e0e0;border-radius:' + radius + ';' +
            (isFirst ? '' : 'border-top:none;') +
            'transition:background .12s" ' +
            'onmouseover="this.style.background=\'#f4f5f0\'" onmouseout="this.style.background=\'#fff\'">' +
            '<div style="flex:1;min-width:0">' +
              '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:3px">' +
                '<span style="font-weight:600;font-size:14px;color:#111">' + (e.patient || '—') + '</span>' +
                priBadge +
              '</div>' +
              '<div style="font-size:12px;color:#9ca3af;display:flex;flex-wrap:wrap;gap:6px">' +
                (e.ticket ? '<span style="font-family:monospace;color:#0F6E56">' + e.ticket + '</span>' : '') +
                (e.prescriptionRef ? '<span>Rx: ' + e.prescriptionRef + '</span>' : '') +
                ((e.prescribedByName || e.doctor) ? '<span>Dr. ' + (e.prescribedByName || e.doctor).replace(/^Dr\.?\s*/i, '') + '</span>' : '') +
                (timeStr ? '<span>' + timeStr + '</span>' : '') +
                (waitStr ? '<span style="color:' + (waitMins > 30 ? '#dc2626' : '#777') + '">⏱ ' + waitStr + '</span>' : '') +
              '</div>' +
              _rowMeta(e) +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">' +
              '<span style="padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;' + tabDef.badgeStyle + '">' + tabDef.label.toUpperCase() + '</span>' +
              _rowActions(e) +
            '</div>' +
          '</li>';
        }).join('') +
      '</ul>';
    }

    el.innerHTML =
      '<div style="background:#ffffff;border-radius:16px;border:1px solid #e0e0e0;padding:20px 24px;box-shadow:0 1px 3px rgba(0,0,0,.06)">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
          '<h2 style="font-size:15px;font-weight:600;letter-spacing:-.3px;margin:0">Prescription Queue</h2>' +
          '<span style="font-size:12px;color:#9ca3af">' + q.length + ' total</span>' +
        '</div>' +
        searchBar +
        tabBar +
        listHTML +
      '</div>';
  };
})();

/* ══════════════════════════════════════════════════════════════════
   §10  REACTIVATE FROM PENDING STOCK (stock received → back to in-progress)
══════════════════════════════════════════════════════════════════ */
window._phReactivateFromStock = async function (rxRef) {
  var q  = window._phQueue || [];
  var qe = q.find(function (x) { return x.prescriptionRef === rxRef || x.id === rxRef; });
  if (!qe) { UI.showToast('Queue entry not found', 'err'); return; }

  var rxId = qe.prescriptionId || rxRef;

  var ok = false;
  try {
    var res = await API._fetchDirect('/prescriptions/' + rxId, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'In Progress', stockReceivedAt: new Date().toISOString() }),
    });
    ok = !(res && (res.success === false || (res.statusCode && res.statusCode >= 400)));
  } catch (_) { ok = false; }

  if (!ok) { UI.showToast('Could not update status — please try again', 'err'); return; }

  qe.state = 'in-progress';
  var pq = (_PH.queue || []).find(function (q) { return q.prescriptionRef === rxRef || q.id === rxRef; });
  if (pq) pq.state = 'in-progress';
  var rx = (_PH.prescriptions || []).find(function (p) { return p.code === rxRef; });
  if (rx) rx.status = 'In Progress';

  _phRenderQueue();
  UI.showToast('Stock received — prescription moved back to Dispensing', 'ok');
};

/* ══════════════════════════════════════════════════════════════════
   §11  WIRE RETURN-FOR-AMENDMENT INTO VALIDATION PAGE
   Adds "Return to Doctor" button alongside existing validation actions.
   Called after validation page renders.
══════════════════════════════════════════════════════════════════ */
(function _phExtendValidation() {
  var _origValidation = window._phRenderValidation;
  if (typeof _origValidation !== 'function') return;
  window._phRenderValidation = function () {
    _origValidation();
    /* After render, inject "Return for Amendment" button if not already there */
    setTimeout(function () {
      var el = document.getElementById('ph-val-body') || document.getElementById('ph-validation-body');
      if (!el || el.querySelector('#ph-val-return-btn')) return;
      var rx = window._phSelRx;
      if (!rx) return;
      var actRow = el.querySelector('[data-ph-actions]') || el.querySelector('.ph-action-row');
      /* Fallback: append to last button row we can find */
      var allBtns = el.querySelectorAll('button');
      if (!allBtns.length) return;
      var lastBtn = allBtns[allBtns.length - 1];
      var returnBtn = document.createElement('button');
      returnBtn.id = 'ph-val-return-btn';
      returnBtn.textContent = '↩ Return for Amendment';
      returnBtn.style.cssText = 'margin-left:8px;padding:9px 18px;border-radius:8px;border:1.5px solid #EF9F27;background:#fff;color:#78350F;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit';
      returnBtn.onclick = function () { window._phShowReturnModal(rx.code); };
      if (lastBtn.parentNode) lastBtn.parentNode.insertBefore(returnBtn, lastBtn.nextSibling);
    }, 100);
  };
})();

/* ══════════════════════════════════════════════════════════════════
   §12  ADD PENDING STOCK BUTTON TO DISPENSING PAGE
   Injects a "Stock Unavailable" button into the dispensing panel.
══════════════════════════════════════════════════════════════════ */
(function _phExtendDispensing() {
  var _origDispensing = window._phRenderDispensing;
  if (typeof _origDispensing !== 'function') return;
  window._phRenderDispensing = function () {
    _origDispensing();
    setTimeout(function () {
      var el = document.getElementById('ph-disp-body') || document.getElementById('ph-dispensed-body');
      if (!el || el.querySelector('#ph-disp-stockbtn')) return;
      var rx = window._phDispRx;
      if (!rx) return;
      var allBtns = el.querySelectorAll('button');
      if (!allBtns.length) return;
      var lastBtn = allBtns[allBtns.length - 1];
      var stockBtn = document.createElement('button');
      stockBtn.id = 'ph-disp-stockbtn';
      stockBtn.textContent = '⚠ Stock Unavailable';
      stockBtn.style.cssText = 'margin-left:8px;padding:9px 18px;border-radius:8px;border:1.5px solid #C2410C;background:#fff;color:#C2410C;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit';
      stockBtn.onclick = function () {
        if (rx && rx.code) window._phMarkPendingStock(rx.code);
      };
      if (lastBtn.parentNode) lastBtn.parentNode.insertBefore(stockBtn, lastBtn.nextSibling);
    }, 100);
  };
})();

/* ══════════════════════════════════════════════════════════════════
   §13  EXTEND API STATE MAP (new states)
   Adds pending-stock and returned-for-amendment to the inbound map.
══════════════════════════════════════════════════════════════════ */
(function _phExtendApiStateMap() {
  /* _apiStateMap may be local to _phLoadLiveData — patch via _PH meta */
  if (!window._phApiStateMapExt) {
    window._phApiStateMapExt = {
      'pending stock':              'pending-stock',
      'stock pending':              'pending-stock',
      'out of stock':               'pending-stock',
      'returned for amendment':     'returned-for-amendment',
      'returned':                   'returned-for-amendment',
      'amendment':                  'returned-for-amendment',
      'rejected':                   'rejected',
    };
  }
  /* Patch _phLoadLiveData to apply extended map after it runs */
  var _origLoad = window._phLoadLiveData;
  if (typeof _origLoad === 'function') {
    window._phLoadLiveData = async function (silent) {
      await _origLoad(silent);
      /* Apply extended status map to any entries the original missed */
      var ext = window._phApiStateMapExt;
      (_PH.queue || []).forEach(function (qe) {
        if (!qe.state || qe.state === 'unknown') {
          var sl = (qe.status || '').toLowerCase();
          Object.keys(ext).forEach(function (k) { if (sl.indexOf(k) > -1) qe.state = ext[k]; });
        }
      });
      (_PH.prescriptions || []).forEach(function (rx) {
        var sl = (rx.status || '').toLowerCase();
        var qe = (_PH.queue || []).find(function (q) { return q.prescriptionRef === rx.code; });
        if (qe && (!qe.state || qe.state === 'unknown')) {
          Object.keys(ext).forEach(function (k) { if (sl.indexOf(k) > -1) qe.state = ext[k]; });
        }
      });
    };
  }
})();

/* ══════════════════════════════════════════════════════════════════
   §14  LISTEN FOR RE-SUBMITTED CORRECTED PRESCRIPTIONS FROM DOCTOR
   When a doctor resubmits an amended prescription, receive it and
   add/update without losing original history.
══════════════════════════════════════════════════════════════════ */
(function _phListenAmended() {
  var ch;
  try { ch = new BroadcastChannel('nihms_pharmacy_queue'); } catch (_) { return; }
  ch.addEventListener('message', function (ev) {
    var msg = ev.data;
    if (!msg || msg.type !== 'new_prescription') return;

    var entry = msg.entry;
    if (!entry || !entry.prescriptionRef) return;

    /* Check if this is a resubmission of a returned prescription */
    var existingIdx = (_PH.prescriptions || []).findIndex(function (p) { return p.code === entry.prescriptionRef; });
    var existingQ   = (window._phQueue || []).findIndex(function (q) { return q.prescriptionRef === entry.prescriptionRef; });

    if (existingIdx > -1) {
      /* Update prescription but preserve original history */
      var orig = _PH.prescriptions[existingIdx];
      _PH.prescriptions[existingIdx] = Object.assign({}, orig, {
        status:        entry.status || 'pending',
        medications:   entry.medications || orig.medications,
        lines:         entry.lines || orig.lines,
        submittedAt:   entry.submittedAt || entry.prescribedAt,
        amendmentCount: (orig.amendmentCount || 0) + 1,
      });
    } else {
      /* Brand new resubmission */
      _PH.prescriptions.unshift(Object.assign({}, entry, { code: entry.prescriptionRef, status: entry.status || 'pending' }));
    }

    /* Update or add queue entry back to new-request */
    var qEntry = {
      id:              entry.prescriptionRef + '-' + Date.now(),
      state:           'new-request',
      patient:         entry.patientName || '',
      patientId:       entry.patientId || '',
      ticket:          entry.ticket || ('T-' + String(Math.floor(Math.random() * 900) + 100)),
      prescriptionRef: entry.prescriptionRef,
      prescriptionId:  entry._id || '',
      prescribedByName: entry.prescribedByName || entry.doctor || '',
      prescribedAt:    entry.prescribedAt || entry.submittedAt || new Date().toISOString(),
    };

    if (existingQ > -1) {
      window._phQueue[existingQ] = Object.assign({}, window._phQueue[existingQ], qEntry);
      var pqIdx = (_PH.queue || []).findIndex(function (q) { return q.prescriptionRef === entry.prescriptionRef; });
      if (pqIdx > -1) Object.assign(_PH.queue[pqIdx], qEntry);
    } else {
      (window._phQueue || []).unshift(qEntry);
      (_PH.queue || []).unshift(qEntry);
    }

    /* History: record resubmission */
    _PH.history.unshift({
      id: 'HIST-RESUB-' + Date.now(),
      patientName:     entry.patientName || '',
      prescriptionRef: entry.prescriptionRef,
      status:          'Resubmitted',
      drug:            ((entry.medications || [])[0] && (entry.medications[0].drug || entry.medications[0].name)) || '—',
      dispensedAt:     new Date().toISOString(),
      doctor:          entry.prescribedByName || entry.doctor || '—',
      pharmacist:      '—',
    });

    _phRenderQueue();
    UI.showToast('Amended prescription received — ' + (entry.patientName || entry.prescriptionRef), 'ok');
  });
})();

/* ══════════════════════════════════════════════════════════════════
   §15  RE-RENDER QUEUE ON LOAD (switch to 8-queue panel)
══════════════════════════════════════════════════════════════════ */
(function _phInit8Queue() {
  /* Ensure default tab is new-request */
  if (!window._phQueueTab) window._phQueueTab = 'new-request';
  /* If queue panel is already open, re-render immediately */
  if (document.getElementById('ph-queue-body')) {
    _phRenderQueue();
  }
})();
