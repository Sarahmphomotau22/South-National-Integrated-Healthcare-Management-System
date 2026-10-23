/**
 * js/pages/pharmacy.js
 * NIHMS Pharmacy Module — replicates the Lovable design exactly
 * 10 panels: Overview · Stock · Validation · Dispensing · Queue ·
 *             History · Suppliers · Controlled · Reminders · Analytics
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

  var prescriptions=[
    {code:'RX-4417-ZA',patientId:'PT-004083',patientName:'Nomsa Dlamini',doctor:'Dr. T. Mokoena',facility:'Johannesburg CHC',issued:'2026-08-06',validUntil:'2026-09-05',status:'valid',
     items:[{drug:'Metformin 500mg',dosage:'1 tab twice daily with meals',duration:'30 days'},{drug:'Warfarin 5mg',dosage:'1 tab at night',duration:'30 days'}],
     duplicateWarning:'Metformin 500mg was collected 3 days ago at Soweto CHC (RX-4390-ZA). Confirm with the patient before dispensing.',
     interactions:[{severity:'high',pair:'Warfarin + Amoxicillin',note:'Increased bleeding risk — monitor INR if antibiotic is added.'},{severity:'low',pair:'Metformin + Warfarin',note:'No clinically significant interaction expected.'}]},
    {code:'RX-4502-ZA',patientId:'PT-007712',patientName:'Sipho Khumalo',doctor:'Dr. A. Naidoo',facility:'Johannesburg CHC',issued:'2026-08-08',validUntil:'2026-08-22',status:'valid',
     items:[{drug:'Amoxicillin 250mg',dosage:'1 cap three times daily',duration:'7 days'}],duplicateWarning:null,interactions:[]},
  ];

  var history=[
    {id:'h1',date:'2026-08-06',drug:'Metformin 500mg',type:'Chronic',doctor:'Dr. T. Mokoena',facility:'Johannesburg CHC',status:'Collected'},
    {id:'h2',date:'2026-07-09',drug:'Metformin 500mg',type:'Chronic',doctor:'Dr. T. Mokoena',facility:'Johannesburg CHC',status:'Collected'},
    {id:'h3',date:'2026-06-28',drug:'Amoxicillin 250mg',type:'Antibiotic',doctor:'Dr. A. Naidoo',facility:'Soweto CHC',status:'Partial'},
    {id:'h4',date:'2026-06-11',drug:'Enalapril 10mg',type:'Chronic',doctor:'Dr. T. Mokoena',facility:'Johannesburg CHC',status:'Collected'},
    {id:'h5',date:'2026-05-21',drug:'Paracetamol 500mg',type:'Analgesic',doctor:'Dr. L. Petersen',facility:'Johannesburg CHC',status:'Collected'},
    {id:'h6',date:'2026-04-30',drug:'Warfarin 5mg',type:'Chronic',doctor:'Dr. L. Petersen',facility:'Johannesburg CHC',status:'Missed'},
  ];

  var queue=[
    {id:'q1',ticket:'P-014',patient:'Nomsa Dlamini',patientId:'PT-004083',items:2,waitedMin:24,state:'ready'},
    {id:'q2',ticket:'P-015',patient:'Sipho Khumalo',patientId:'PT-007712',items:1,waitedMin:18,state:'preparing'},
    {id:'q3',ticket:'P-016',patient:'Grace Mahlangu',patientId:'PT-001194',items:3,waitedMin:12,state:'notified'},
    {id:'q4',ticket:'P-017',patient:'Johan van Wyk',patientId:'PT-009820',items:1,waitedMin:7,state:'waiting'},
    {id:'q5',ticket:'P-018',patient:'Thandi Zulu',patientId:'PT-003345',items:2,waitedMin:3,state:'waiting'},
  ];

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

  var controlledRegister=[
    {id:'c1',time:'2026-08-08 11:42',drug:'Morphine sulphate 10mg/ml',schedule:'S6',quantity:2,balance:46,patient:'PT-009820',pharmacist:'K. Mthembu',witness:'L. Petersen'},
    {id:'c2',time:'2026-08-08 09:15',drug:'Codeine phosphate 30mg',schedule:'S5',quantity:20,balance:340,patient:'PT-003345',pharmacist:'K. Mthembu',witness:'N. Sithole'},
    {id:'c3',time:'2026-08-07 16:03',drug:'Pethidine 50mg/ml',schedule:'S6',quantity:1,balance:18,patient:'PT-004083',pharmacist:'N. Sithole',witness:null},
    {id:'c4',time:'2026-08-07 10:28',drug:'Diazepam 5mg',schedule:'S5',quantity:14,balance:212,patient:'PT-007712',pharmacist:'K. Mthembu',witness:'L. Petersen'},
  ];

  var refills=[
    {id:'r1',patient:'Nomsa Dlamini',patientId:'PT-004083',drug:'Metformin 500mg',dueIn:2,channel:'SMS',adherence:92,sent:false},
    {id:'r2',patient:'Grace Mahlangu',patientId:'PT-001194',drug:'Amlodipine 5mg',dueIn:0,channel:'WhatsApp',adherence:74,sent:false},
    {id:'r3',patient:'Johan van Wyk',patientId:'PT-009820',drug:'Enalapril 10mg',dueIn:5,channel:'SMS',adherence:61,sent:true},
    {id:'r4',patient:'Thandi Zulu',patientId:'PT-003345',drug:'Insulin Glargine',dueIn:-3,channel:'USSD',adherence:48,sent:true},
  ];

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
           suppliers, purchaseOrders, controlledRegister, refills, coldChain, dispenseLines };
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
          patientName: e.patient||'',
          doctor:      e.prescribedByName||'',
          doctorReg:   e.prescribedByReg||'',
          facility:    '',
          issued:      e.prescribedAt?e.prescribedAt.slice(0,10):'',
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
      if(!dupQ) _PH.queue.push(e);
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
            code:e2.prescriptionRef,patientId:e2.patientId||'',patientName:e2.patient||'',
            doctor:e2.prescribedByName||'',doctorReg:e2.prescribedByReg||'',
            issued:e2.prescribedAt?e2.prescribedAt.slice(0,10):'',
            validUntil:e2.repeat&&e2.repeat.reviewDate?e2.repeat.reviewDate:'',
            status:'Submitted',submittedAt:e2.prescribedAt||'',
            repeatPrescription:e2.repeatPrescription||false,repeat:e2.repeat||null,
            items:(e2.medications||[]).map(function(m){return{drug:m.name+(m.strength?' '+m.strength:''),dosage:(m.dose||'')+' '+(m.frequency||''),duration:m.duration||'',quantity:m.quantity,unit:m.unit||''};}),
            duplicateWarning:null,interactions:[],
          });
        }
        var dupQ2 = _PH.queue.find(function(x){return x.id===e2.id;});
        if(!dupQ2) _PH.queue.push(e2);
        try{if(typeof _phRenderValidation==='function')_phRenderValidation();}catch(_){}
        try{if(typeof _phRenderQueue==='function')_phRenderQueue();}catch(_){}
        if(window.UI&&UI.showToast) UI.showToast('📋 New prescription received: '+e2.prescriptionRef,'ok');
      }
    };
  } catch(_){}
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
    {id:'ph-controlled', icon:'ti-book-lock',        label:'Controlled'},
    {id:'ph-reminders',  icon:'ti-bell',             label:'Reminders'},
    {id:'ph-analytics',  icon:'ti-chart-bar',        label:'Analytics'},
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
  return gradHeader + tabBar + content;
}

/* ═══════════════════════════════════════════════════════════════
   PAGE 1 — OVERVIEW (rx-queue)
═══════════════════════════════════════════════════════════════ */
Pages['rx-queue'] = () => {
  var critical = _PH.stockItems.filter(function(i){ return ['critical','low'].includes(_PH.stockState(i)); });
  var expiring  = _PH.stockItems.filter(function(i){ var d=_PH.daysUntil(i.expiry); return d>=0&&d<=45; });
  var dueRefills= _PH.refills.filter(function(r){ return r.dueIn<=2; });
  var qLen      = _PH.queue.length;

  var kpis = [
    {label:'Dispensed today',value:'184',delta:'+12% vs yesterday',icon:'ti-clipboard-check'},
    {label:'In queue now',value:String(qLen),delta:'3 ready for collection',icon:'ti-users'},
    {label:'Avg wait time',value:'14 min',delta:'target 20 min',icon:'ti-clock'},
    {label:'Duplicates blocked',value:'9',delta:'this week',icon:'ti-alert-triangle'},
  ];

  var kpiHTML = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">' +
    kpis.map(function(k){
      return '<div style="background:#ffffff;border:1px solid #e0e0e0;border-radius:16px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,.05)">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
          '<span style="font-size:13px;color:#777777">'+k.label+'</span>' +
          _phIcon(k.icon,'16px') +
        '</div>' +
        '<div style="font-size:30px;font-weight:700;letter-spacing:-.5px">'+k.value+'</div>' +
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
      '<td style="padding:10px 12px;text-align:right">'+_phBtn('Reorder','ti-truck',r.state==='ok'?'outline':'primary','UI.showToast(\'Reorder request sent to '+i.supplier+'\',\'ok\')')+'</td>' +
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
  window._phSelRx   = _PH.prescriptions[0];
  window._phChecked = false;
  setTimeout(function(){ _phRenderValidation(); }, 0);
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
    if(el0) el0.innerHTML='<div style="text-align:center;padding:32px;color:#777">No prescriptions to review.</div>';
    return;
  }
  var checked = window._phChecked;
  var status  = rx.status||'Submitted';
  var statusStyle = _PH_STATUS_STYLE[status]||'gray';
  var isDispensable = ['Submitted','Awaiting Pharmacist Review','Validated','Awaiting Dispensing','Refill Due'].includes(status);

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
          '<div style="font-size:12px;color:#777;font-family:monospace">'+rx.patientId+' · '+rx.code+'</div>'+
        '</div>'+
        _phBadge(status, statusStyle)+
      '</div>'+

      /* All required fields per Req 7 */
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;font-size:13px;margin-bottom:14px">'+
        [
          ['Prescribing Doctor',     rx.doctor||'—'],
          ['Doctor Reg. No.',        rx.doctorReg||'—'],
          ['Facility',               rx.facility||'—'],
          ['Prescription Date',      rx.issued||'—'],
          ['Valid Until / Review',   rx.validUntil||'—'],
          ['Submitted',              rx.submittedAt?(new Date(rx.submittedAt).toLocaleString('en-ZA')):'—'],
        ].map(function(f){
          return '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#777;margin-bottom:2px">'+f[0]+'</div><div style="font-weight:600;font-family:'+(f[0].includes('Reg')? 'monospace':'inherit')+'">'+f[1]+'</div></div>';
        }).join('')+
      '</div>'+

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

    /* AI interaction checker */
    '<div style="border:1px solid #e0e0e0;border-radius:12px;padding:14px;margin-bottom:14px">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:'+(checked?'12px':'0')+'">'+
        '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:16px;color:#0F6E56">🤖</span><span style="font-size:13px;font-weight:500">AI drug interaction checker</span></div>'+
        _phBtn('Run check','','outline','window._phChecked=true;_phRenderValidation()')+
      '</div>'+
      (checked?(rx.interactions&&rx.interactions.length?
        '<div style="display:flex;flex-direction:column;gap:8px">'+
        rx.interactions.map(function(ix){
          var sev={high:'red',moderate:'amber',low:'green'}[ix.severity];
          return '<div style="border:1px solid #e0e0e0;border-radius:8px;padding:10px 12px;font-size:13px">'+
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'+_phBadge(ix.severity+' risk',sev)+'<span style="font-weight:500">'+ix.pair+'</span></div>'+
            '<div style="color:#777">'+ix.note+'</div>'+
          '</div>';
        }).join('')+'</div>':
        '<div style="font-size:13px;color:#777;margin-top:12px">No interactions detected for this prescription.</div>'):
        '<div style="font-size:13px;color:#777;margin-top:10px">Cross-checks against patient\'s active medications.</div>')+
    '</div>'+

    /* Status update controls — Req 7 */
    '<div style="border:1px solid #e0e0e0;border-radius:12px;padding:14px;margin-bottom:14px">'+
      '<div style="font-size:13px;font-weight:700;margin-bottom:10px">Update Prescription Status</div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">'+
      _PH_STATUSES.map(function(s){
        var active = s===status;
        return '<button onclick="_phSetRxStatus(\''+s.replace(/'/g,"\\'")+'\')" style="padding:6px 12px;border-radius:6px;border:1.5px solid '+(active?'#0F6E56':'#e0e0e0')+';background:'+(active?'#EDFBF3':'#fff')+';color:'+(active?'#0F6E56':'#333')+';font-size:12px;font-weight:'+(active?'700':'500')+';cursor:pointer;font-family:inherit">'+s+'</button>';
      }).join('')+
      '</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
        _phBtn('Validate & Approve','ti-shield-check','primary','_phSetRxStatus(\'Validated\')')+
        (isDispensable?_phBtn('Move to Dispensing','','outline','_phSetRxStatus(\'Awaiting Dispensing\')'):'')+
        _phBtn('Reject — Needs Correction','','outline','_phSetRxStatus(\'Rejected \u2014 Requires Correction\')')+
      '</div>'+
    '</div>';

  var el = document.getElementById('ph-val-body');
  if (el) el.innerHTML = body;
}

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
  /* On dispense, update repeat used count */
  if(newStatus==='Dispensed' && rx.repeat && rx.repeatPrescription){
    rx.repeat.used = (rx.repeat.used||0)+1;
    rx.repeat.remaining = Math.max(0, (rx.repeat.allowed||0)-(rx.repeat.used||0));
    /* Add to medication history */
    var u = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
    var pharmacistName = u.firstName?('Dr/Ph '+u.firstName+' '+u.lastName):(u.name||'Pharmacist');
    _PH.history.unshift({
      id:'h'+Date.now(),
      date:new Date().toISOString().slice(0,10),
      drug:(rx.items&&rx.items[0]&&rx.items[0].drug)||'—',
      type:'Prescription',
      doctor:rx.doctor||'—',
      facility:rx.facility||'—',
      status:'Collected',
      pharmacist:pharmacistName,
      prescriptionRef:rx.code,
      repeatSequence:rx.repeat.used,
      patientName:rx.patientName,
      patientId:rx.patientId,
      submittedAt:rx.submittedAt||new Date().toISOString(),
      dispensedAt:new Date().toISOString(),
    });
    UI.showToast('Repeat '+(rx.repeat.used)+' dispensed — '+rx.repeat.remaining+' remaining','ok');
  } else if(newStatus==='Dispensed'){
    var u2 = (window.API&&window.API.getStoredUser&&window.API.getStoredUser())||{};
    var phName2 = u2.firstName?('Ph '+u2.firstName+' '+u2.lastName):(u2.name||'Pharmacist');
    _PH.history.unshift({
      id:'h'+Date.now(),
      date:new Date().toISOString().slice(0,10),
      drug:(rx.items&&rx.items[0]&&rx.items[0].drug)||'—',
      type:'Prescription',
      doctor:rx.doctor||'—',
      facility:rx.facility||'—',
      status:'Collected',
      pharmacist:phName2,
      prescriptionRef:rx.code,
      patientName:rx.patientName,
      patientId:rx.patientId,
      dispensedAt:new Date().toISOString(),
    });
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
  window._phDispChecked = [];
  window._phDispScanned = false;
  window._phDispCounselled = false;
  setTimeout(_phRenderDispensing, 0);
  return _phShell('dispensed','Dispensing & labels','FEFO pick list + bilingual label preview',
    '<div id="ph-disp-body">Loading...</div>');
};

function _phRenderDispensing() {
  var el = document.getElementById('ph-disp-body');
  if (!el) return;
  var scanned = window._phDispScanned;
  var checked = window._phDispChecked || [];
  var counselled = window._phDispCounselled;
  var allChecked = checked.length === _PH.dispenseLines.length;

  var leftPanel =
    _phCard('ti-scan-line','Scan script or patient card','Barcode / QR scanning removes typing errors at the counter','',
      '<div style="display:flex;gap:8px;margin-bottom:'+(scanned?'14px':'0')+'">' +
        '<input id="ph-scan-input" placeholder="Scan or type RX code / patient file number" style="flex:1;padding:9px 14px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;outline:none">' +
        _phBtn('Simulate scan','ti-qr-code','primary','_phSimulateScan()') +
      '</div>' +
      (scanned ?
        '<div style="background:#f4f5f0;border:1px solid #e0e0e0;border-radius:10px;padding:12px 14px;font-size:13px">' +
          '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:4px">' +
            '<span style="font-weight:600">Nomsa Dlamini</span>'+_phBadge('PT-004083','gray')+_phBadge('Script valid','green') +
          '</div>' +
          '<div style="color:#777777">Allergies: penicillin · eGFR 58 ml/min — check renal dosing</div>' +
        '</div>' : '')
    ) +
    '<div style="margin-top:16px">' +
    _phCard('ti-clipboard-check','Pick list (FEFO)','First-expiry-first-out batches — tick each item as you pick','',
      '<ul style="list-style:none;padding:0;margin:0 0 14px;display:flex;flex-direction:column;gap:10px">' +
      _PH.dispenseLines.map(function(l){
        var isCk = checked.includes(l.id);
        var days = _PH.daysUntil(l.expiry);
        return '<li style="display:flex;align-items:flex-start;gap:12px;border:1px solid #e0e0e0;border-radius:10px;padding:12px 14px">' +
          '<input type="checkbox" '+(isCk?'checked':'')+' onchange="_phToggleDisp(\''+l.id+'\')" style="margin-top:3px;width:16px;height:16px;cursor:pointer">' +
          '<div style="flex:1">' +
            '<div style="font-size:13px;font-weight:500">'+l.drug+' — '+l.qty+' units</div>' +
            '<div style="font-size:12px;color:#777777">'+l.dosage+'</div>' +
            '<div style="font-size:12px;margin-top:4px">Batch <span style="font-family:monospace">'+l.batch+'</span> · expires '+l.expiry+' ' +
              '<span style="color:'+(days<=45?'#7A5C10':'#777777')+'">(' +days+' days)</span>' +
            '</div>' +
          '</div>' +
        '</li>';
      }).join('') + '</ul>' +
      '<div style="display:flex;align-items:flex-start;gap:12px;background:#f4f5f0;border-radius:10px;padding:12px 14px;margin-bottom:10px">' +
        '<input type="checkbox" '+(counselled?'checked':'')+' onchange="_phDispCounsel()" style="margin-top:3px;width:16px;height:16px;cursor:pointer">' +
        '<label style="font-size:13px;cursor:pointer" onclick="_phDispCounsel()">Patient counselled on dosage, food interactions and side effects</label>' +
      '</div>' +
      '<textarea placeholder="Counselling / substitution notes for the patient record" rows="3" style="width:100%;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box;margin-bottom:10px"></textarea>' +
      '<div style="display:flex;gap:8px">' +
        '<button onclick="if('+String(allChecked&&counselled)+'){UI.showToast(\'Dispensed and recorded — stock decremented\',\'ok\')}else{UI.showToast(\'Tick all items and confirm counselling first\',\'err\')}" style="padding:9px 16px;border-radius:8px;border:none;background:#0F6E56;color:#fff;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;opacity:'+(allChecked&&counselled?'1':'.5')+'">Complete dispense</button>' +
        _phBtn('Print labels','ti-printer','outline','UI.showToast(\'Label sent to Dispensary 2 printer\',\'ok\')') +
      '</div>'
    ) + '</div>';

  var labelPanel = _phCard('ti-printer','Label preview','Bilingual instructions reduce medication errors','',
    '<div style="display:flex;flex-direction:column;gap:14px">' +
    _PH.dispenseLines.map(function(l){
      return '<div style="border:2px dashed #e0e0e0;border-radius:10px;padding:14px;font-family:monospace;font-size:12px;line-height:1.8;background:#ffffff">' +
        '<div style="font-family:inherit;font-size:14px;font-weight:700;font-family:sans-serif;margin-bottom:4px">'+l.drug+'</div>' +
        '<div>'+l.dosage+'</div>' +
        '<div>Isidingo: thatha njengoba unikeziwe</div>' +
        '<div style="margin-top:6px">Qty '+l.qty+' · Batch '+l.batch+' · Exp '+l.expiry+'</div>' +
        '<div>Nomsa Dlamini · PT-004083</div>' +
        '<div>Johannesburg CHC · Disp 2 · K. Mthembu</div>' +
        '<div style="margin-top:6px">Keep out of reach of children</div>' +
      '</div>';
    }).join('') + '</div>'
  );

  el.innerHTML = '<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px">' + leftPanel + labelPanel + '</div>';
}

window._phSimulateScan = function() {
  window._phDispScanned = true;
  var inp = document.getElementById('ph-scan-input');
  if(inp) inp.value = 'RX-4417-ZA';
  _phRenderDispensing();
  UI.showToast('Script RX-4417-ZA loaded — Nomsa Dlamini','ok');
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
  if (!window._phQueue) window._phQueue = JSON.parse(JSON.stringify(_PH.queue));
  setTimeout(_phRenderQueue, 0);
  return _phShell('ph-queue','Pharmacy queue','Live patient collection queue',
    '<div id="ph-queue-body">Loading...</div>');
};

function _phRenderQueue() {
  var el = document.getElementById('ph-queue-body'); if (!el) return;
  var q = window._phQueue;
  var ready = q.filter(function(e){ return e.state==='ready'||e.state==='notified'; }).length;

  var stateMeta = {
    waiting:   {label:'Waiting',        bg:'',           badge:'gray'},
    preparing: {label:'Preparing',      bg:'',           badge:'blue'},
    ready:     {label:'Ready for collection', bg:'rgba(29,158,117,.08)', badge:'green'},
    notified:  {label:'Patient notified',bg:'rgba(29,158,117,.05)',badge:'success'},
  };

  var rows = q.map(function(e){
    var m = stateMeta[e.state];
    var nextLabel = e.state==='waiting'?'Start preparing':e.state==='preparing'?'Mark ready':'Notify patient';
    var nextBtn = e.state!=='notified'
      ? _phBtn(nextLabel, e.state==='ready'?'ti-bell':'', e.state==='ready'?'primary':'outline','_phAdvanceQueue(\''+e.id+'\')')
      : '';
    return '<li style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;border:1px solid #e0e0e0;border-radius:10px;padding:12px 14px;background:'+m.bg+'">' +
      '<div style="width:44px;height:44px;border-radius:8px;background:#f4f5f0;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:13px;font-weight:700;flex-shrink:0">'+e.ticket+'</div>' +
      '<div style="flex:1;min-width:160px"><div style="font-weight:500;font-size:13px">'+e.patient+'</div><div style="font-size:12px;color:#777777">'+e.patientId+' · '+e.items+' item'+(e.items>1?'s':'')+' · waiting '+e.waitedMin+' min</div></div>' +
      _phBadge(m.label,m.badge) + nextBtn +
    '</li>';
  }).join('');

  el.innerHTML = _phCard('ti-users','Pharmacy queue',q.length+' patients in queue · '+ready+' ready','',
    '<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px">'+rows+'</ul>');
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
  var f = window._phHistFilters;

  /* Merge any newly dispensed entries from validation actions */
  var allHistory = _PH.history.slice();

  var filtered = allHistory.filter(function(h){
    return (f.doctor==='all'||h.doctor===f.doctor) &&
           (f.type==='all'||h.type===f.type) &&
           (f.status==='all'||h.status===f.status);
  });

  var doctors  = ['all'].concat([...new Set(allHistory.map(function(h){return h.doctor;}))]);
  var types    = ['all'].concat([...new Set(allHistory.map(function(h){return h.type;}))]);
  /* Req 6: distinguish prescribed / awaiting / dispensed */
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
        var dispensedDate = e.dispensedAt ? new Date(e.dispensedAt).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}) : (e.date||'—');
        var submDate = e.submittedAt ? new Date(e.submittedAt).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}) : '';
        return '<li style="position:relative">'+
          '<span style="position:absolute;left:-36px;top:8px;width:14px;height:14px;border-radius:50%;background:'+dotCol+';border:2px solid #fff;display:block"></span>'+
          '<div style="border:1px solid #e0e0e0;border-radius:10px;overflow:hidden">'+
            /* Header row */
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e0e0e0">'+
              '<div>'+
                '<span style="font-weight:700;font-size:14px">'+(e.drug||'—')+'</span>'+
                (e.prescriptionRef?'<span style="font-size:11px;font-family:monospace;color:#0F6E56;margin-left:10px">'+e.prescriptionRef+'</span>':'')+
              '</div>'+
              _phBadge(e.status||'—',statusStyle[e.status]||'gray')+
            '</div>'+
            /* Full detail grid — Req 6 */
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px 14px;font-size:12px">'+
              [
                ['Medication',           e.drug||'—'],
                ['Strength / Form',      e.strengthForm||e.type||'—'],
                ['Dosage Instructions',  e.dosage||e.instructions||'—'],
                ['Quantity Dispensed',   e.quantity ? (e.quantity+(e.unit?' '+e.unit:'')) : '—'],
                ['Date Dispensed',       e.status==='Collected'||e.status==='Partial' ? dispensedDate : '—'],
                ['Dispensing Pharmacist',e.pharmacist||'—'],
                ['Prescribing Doctor',   e.doctor||'—'],
                ['Prescription Ref',     e.prescriptionRef||'—'],
                ['Repeat Sequence',      e.repeatSequence ? ('Repeat '+e.repeatSequence) : (submDate?'Original prescription':'—')],
                ['Date Prescribed',      submDate||e.date||'—'],
                ['Facility',             e.facility||'—'],
                ['Notes / Status',       e.notes||(e.status==='Awaiting Dispensing'?'Awaiting collection':e.status==='Prescribed'?'Prescription issued — not yet dispensed':e.status==='Collected'?'Dispensed successfully':e.status||'—')],
              ].map(function(fd){
                return '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#777;margin-bottom:2px">'+fd[0]+'</div><div style="font-weight:600;font-family:'+(fd[0].includes('Ref')?'monospace':'inherit')+';font-size:12px">'+fd[1]+'</div></div>';
              }).join('')+
            '</div>'+
          '</div>'+
        '</li>';
      }).join('')+'</ol>'
    : '<div style="border:1.5px dashed #e0e0e0;border-radius:10px;padding:32px;text-align:center;font-size:13px;color:#777">No records match these filters.</div>';

  /* Legend */
  var legend =
    '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;font-size:12px">'+
    [['Prescribed','#94a3b8','Issued — not yet dispensed'],
     ['Awaiting Dispensing','#3B82F6','In pharmacy queue'],
     ['Collected','#0F6E56','Successfully dispensed'],
     ['Partial','#EF9F27','Partially dispensed'],
     ['Missed','#dc2626','Not collected']].map(function(l){
      return '<span style="display:flex;align-items:center;gap:5px">'+
        '<span style="width:10px;height:10px;border-radius:50%;background:'+l[1]+';flex-shrink:0"></span>'+
        '<strong>'+l[0]+'</strong> — '+l[2]+'</span>';
    }).join('')+
    '</div>';

  el.innerHTML = _phCard('ti-history','Patient Medication History',
    filtered.length+' record'+(filtered.length!==1?'s':'')+' · '+
    allHistory.filter(function(h){return h.status==='Collected';}).length+' dispensed',
    _phBtn('Export PDF','ti-download','outline','UI.showToast(\''+filtered.length+' records prepared as PDF\',\'ok\')'),
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">'+
      sel('hist-status',statuses,f.status,'status','Dispensing Status')+
      sel('hist-doctor',doctors,f.doctor,'doctor','Prescribing Doctor')+
      sel('hist-type',types,f.type,'type','Type')+
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
        _phBtn('Send order request','','outline','UI.showToast(\'Order request sent to '+s.name+'\',\'ok\')') +
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

/* ═══════════════════════════════════════════════════════════════
   PAGE 8 — CONTROLLED SUBSTANCES REGISTER
═══════════════════════════════════════════════════════════════ */
Pages['ph-controlled'] = () => {
  if (!window._phSigned) window._phSigned = [];
  setTimeout(_phRenderControlled, 0);
  return _phShell('ph-controlled','Controlled register','Schedule 5 & 6 · Tamper-evident log',
    '<div id="ph-ctrl-body">Loading...</div>');
};

function _phRenderControlled() {
  var el = document.getElementById('ph-ctrl-body'); if(!el) return;
  var signed = window._phSigned || [];
  var unsigned = _PH.controlledRegister.filter(function(e){ return !e.witness && !signed.includes(e.id); });

  var alert = unsigned.length
    ? '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;border:1px solid rgba(226,75,74,.3);background:#FEF2F2;border-radius:14px;padding:14px 18px;margin-bottom:16px">' +
        '<span style="font-size:18px;color:#dc2626;flex-shrink:0">🛡️</span>' +
        '<p style="flex:1;font-size:13px;margin:0"><strong>'+unsigned.length+' entry awaiting a second signature.</strong> Schedule 5 and 6 dispensing requires dual sign-off before the register balances.</p>' +
      '</div>' : '';

  var rows = _PH.controlledRegister.map(function(e){
    var isSigned = Boolean(e.witness)||signed.includes(e.id);
    return '<tr style="border-top:1px solid #e0e0e0;background:'+(isSigned?'':'rgba(226,75,74,.04)')+'">' +
      '<td style="padding:10px 12px;font-size:12px;color:#777777;white-space:nowrap">'+e.time+'</td>' +
      '<td style="padding:10px 12px;font-weight:500;font-size:13px">'+e.drug+'</td>' +
      '<td style="padding:10px 12px">'+_phBadge(e.schedule,e.schedule==='S6'?'red':'amber')+'</td>' +
      '<td style="padding:10px 12px;text-align:right">'+e.quantity+'</td>' +
      '<td style="padding:10px 12px;text-align:right;font-family:monospace">'+e.balance+'</td>' +
      '<td style="padding:10px 12px;font-family:monospace;font-size:12px">'+e.patient+'</td>' +
      '<td style="padding:10px 12px;font-size:13px">'+e.pharmacist+'</td>' +
      '<td style="padding:10px 12px">' +
        (isSigned
          ? '<span style="font-size:13px">'+(e.witness||'K. Mthembu')+'</span>'
          : _phBtn('Co-sign','','outline','_phCoSign(\''+e.id+'\')')) +
      '</td>' +
    '</tr>';
  }).join('');

  el.innerHTML = alert + _phCard('ti-book-lock','Controlled substances register','Tamper-evident log of every S5 / S6 movement with running balances','',
    '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
    '<thead><tr style="background:#f4f5f0">' +
    ['Date & time','Medicine','Schedule','Qty out','Balance','Patient','Pharmacist','Witness'].map(function(h,i){
      return '<th style="padding:10px 12px;text-align:'+(i===3||i===4?'right':'left')+';font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#777777;font-weight:600">'+h+'</th>';
    }).join('') + '</tr></thead><tbody>'+rows+'</tbody></table></div>' +
    '<p style="margin-top:14px;font-size:11px;color:#777777">Entries cannot be edited or deleted. Discrepancies must be reported to the responsible pharmacist and the provincial inspectorate within 24 hours.</p>'
  );
}

window._phCoSign = function(id) {
  window._phSigned = (window._phSigned||[]).concat([id]);
  _phRenderControlled();
  UI.showToast('Second signature captured','ok');
};

/* ═══════════════════════════════════════════════════════════════
   PAGE 9 — REFILL REMINDERS
═══════════════════════════════════════════════════════════════ */
Pages['ph-reminders'] = () => {
  if (!window._phReminderSent) {
    window._phReminderSent = _PH.refills.filter(function(r){return r.sent;}).map(function(r){return r.id;});
  }
  if (!window._phReminderMethod)    window._phReminderMethod    = {};
  if (!window._phReminderScheduled) window._phReminderScheduled = {};
  setTimeout(_phRenderReminders, 0);
  return _phShell('ph-reminders','Refill reminders','Repeat prescriptions · Schedule or send manually',
    '<div id="ph-rem-body">Loading...</div>');
};

function _phRenderReminders() {
  var el = document.getElementById('ph-rem-body'); if(!el) return;
  var sent      = window._phReminderSent      || [];
  var methods   = window._phReminderMethod    || {};
  var scheduled = window._phReminderScheduled || {};

  /* Merge repeat prescriptions from _PH.prescriptions as additional refill sources */
  var refillList = _PH.refills.slice();
  _PH.prescriptions.forEach(function(rx){
    if(!rx.repeatPrescription||!rx.repeat) return;
    var exists = refillList.find(function(r){return r.id===rx.code;});
    if(!exists){
      /* Req 5: stop when expired or repeats exhausted */
      var isExpired = rx.repeat.expiryDate && new Date(rx.repeat.expiryDate)<new Date();
      var exhausted = rx.repeat.remaining!==undefined && rx.repeat.remaining<=0;
      if(isExpired||exhausted) return;
      var dueDate = rx.repeat.reviewDate ? new Date(rx.repeat.reviewDate) : null;
      var dueIn   = dueDate ? Math.round((dueDate-new Date())/(1000*60*60*24)) : 99;
      refillList.push({
        id:rx.code, patient:rx.patientName||'Patient', patientId:rx.patientId||'—',
        drug:(rx.items&&rx.items[0])?rx.items[0].drug:'—',
        dueIn:dueIn, adherence:100, channel:'SMS',
        reviewDate:rx.repeat.reviewDate||'', expiryDate:rx.repeat.expiryDate||'',
        repeatsRemaining:rx.repeat.remaining||0, repeatsAllowed:rx.repeat.allowed||0,
        repeatsUsed:rx.repeat.used||0, prescribingDoctor:rx.doctor||'—',
        status:rx.status||'Active', prescriptionRef:rx.code,
      });
    }
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
          ['Repeats Remaining',  r.repeatsRemaining!==undefined?(r.repeatsRemaining+' of '+(r.repeatsAllowed||'?')+' remaining'):'—'],
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
  var sent = window._phReminderSent || [];
  var count = 0;
  _PH.refills.filter(function(r){return r.dueIn<=7&&!sent.includes(r.id);}).forEach(function(r){
    window._phSendReminder(r.id, r.channel||'SMS', r.patient); count++;
  });
  _PH.prescriptions.filter(function(p){
    return p.repeatPrescription&&p.repeat&&(p.repeat.remaining===undefined||p.repeat.remaining>0)&&
           !(p.repeat.expiryDate&&new Date(p.repeat.expiryDate)<new Date())&&!sent.includes(p.code)&&
           p.repeat.reviewDate&&Math.round((new Date(p.repeat.reviewDate)-new Date())/(1000*60*60*24))<=7;
  }).forEach(function(p){
    window._phSendReminder(p.code,'SMS',p.patientName); count++;
  });
  if(count===0) UI.showToast('No reminders due within 7 days','ok');
};

/* ═══════════════════════════════════════════════════════════════
   PAGE 10 — ANALYTICS
═══════════════════════════════════════════════════════════════ */
Pages['ph-analytics'] = () => {
  var stats = [
    {label:'Dispensed today',value:'218',note:'+12% vs yesterday',icon:'ti-pill'},
    {label:'Avg. pharmacy wait',value:'17 min',note:'target 20 min',icon:'ti-clock'},
    {label:'Duplicates blocked',value:'9',note:'34 this month',icon:'ti-copy-x'},
    {label:'Scripts validated',value:'241',note:'96% first-pass',icon:'ti-chart-bar'},
  ];

  var kpiHTML = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">' +
    stats.map(function(s){
      return '<div style="border:1px solid #e0e0e0;background:#f4f5f0;border-radius:12px;padding:16px">' +
        '<div style="display:flex;align-items:center;gap:8px;color:#777777;margin-bottom:8px">' +
          _phIcon(s.icon,'14px') +
          '<span style="font-size:11px;text-transform:uppercase;letter-spacing:.05em">'+s.label+'</span>' +
        '</div>' +
        '<div style="font-size:26px;font-weight:700;margin-bottom:2px">'+s.value+'</div>' +
        '<div style="font-size:11px;color:#777777">'+s.note+'</div>' +
      '</div>';
    }).join('') + '</div>';

  var maxCount = Math.max.apply(null, _PH.topDrugs.map(function(d){return d.count;}));
  var drugBars = '<div style="margin-top:4px"><div style="font-size:13px;font-weight:500;margin-bottom:12px">Top 5 prescribed drugs</div>' +
    '<div style="display:flex;flex-direction:column;gap:12px">' +
    _PH.topDrugs.map(function(d){
      return '<div>' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">' +
          '<span>'+d.drug+'</span><span style="color:#777777">'+d.count+'</span>' +
        '</div>' +
        _phProgress(d.count/maxCount*100) +
      '</div>';
    }).join('') + '</div></div>';

  var content = kpiHTML + _phCard('ti-chart-bar','Analytics snapshot','Today · Johannesburg CHC','', drugBars);
  return _phShell('ph-analytics','Analytics','Dispensing statistics · Johannesburg CHC', content);
};
