/**
 * js/pages/doctor.js \— NIHMS Doctor Portal
 * Designed from Doctor_Consultation_Workflow.zip (Figma Make export)
 * Design system: dark-green navy sidebar \· forest-green accent \· DM Sans typography
 *
 * Views: dashboard \· patient-queue \· consultation \· patient-search \· telemedicine \· ai-assistant
 * Workflows (overlays): lab-order \· imaging-order \· prescription
 */

if (typeof Pages === 'undefined') window.Pages = {};

/* \\u2500\\u2500\\u2500 Design tokens (from index.css) \\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500 */
var DT = {
  ink:'#142923', muted:'#6d7c77', line:'#e3e9e6', soft:'#f4f7f5',
  softGreen:'#eaf6f0', green:'#18755d', greenDk:'#0f5f4a',
  navy:'#122b27', white:'#ffffff',
  amber:'#a6601a', amberSoft:'#fff5e8',
  red:'#b4433f', redSoft:'#fff0ef',
};

/* \\u2500\\u2500\\u2500 State \\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500 */
var _D = {
  view:'dashboard',
  workflow:null,          /* 'lab' | 'imaging' | 'prescription' | null */
  consultTab:'Consultation',
  selectedPatient:null,
  labSubmitted:false, imagingSubmitted:false, rxSubmitted:false,
  aiHistory:[], aiInput:'',
  messages:[],
  queue:[
    {ticket:'A-014',name:'Thandi Mokoena', reason:'Follow-up: hypertension + asthma',wait:12,status:'vitals'},
    {ticket:'A-015',name:'Sipho Dlamini',  reason:'Persistent cough, 5 days',        wait:24,status:'waiting'},
    {ticket:'A-016',name:'Lerato Mokoena', reason:'ART refill + viral load',          wait:31,status:'waiting'},
    {ticket:'A-017',name:'Precious Dube',  reason:'Fatigue, pallor',                  wait:40,status:'with doctor'},
    {ticket:'A-018',name:'Thabiso Molapo', reason:'Renal review \— CKD stage 2',       wait:48,status:'waiting'},
  ],
  patients:[
    {mrn:'HH-0048291',name:'Thandi Mokoena', nationalId:'800512 0456 08 7',dob:'12 May 1980',gender:'Female',age:45,conditions:['Hypertension','Asthma'],                     medication:'Amlodipine 5 mg',allergies:'Penicillin \— rash',lastConsult:'18 Jan 2026'},
    {mrn:'MRN-000015',name:'Sipho Dlamini',  nationalId:'9106185028081',  dob:'18 Jun 1991',gender:'Male',  age:34,conditions:['HIV (on ART)'],                             medication:'TDF/3TC/DTG',    allergies:'None known',       lastConsult:'02 Sep 2026'},
    {mrn:'MRN-000021',name:'Precious Dube',  nationalId:'9706220384081',  dob:'22 Jun 1997',gender:'Female',age:29,conditions:['Iron-deficiency anaemia'],                    medication:'Ferrous sulphate',allergies:'None known',       lastConsult:'01 Sep 2026'},
    {mrn:'MRN-000027',name:'Thabiso Molapo', nationalId:'8201095523086',  dob:'09 Jan 1982',gender:'Male',  age:44,conditions:['Chronic kidney disease stage 2','Hypertension'],medication:'Amlodipine, Enalapril',allergies:'Sulfonamides',lastConsult:'15 Aug 2026'},
    {mrn:'MRN-000033',name:'Thabo Sithole',  nationalId:'6505275119080',  dob:'27 May 1965',gender:'Male',  age:61,conditions:['Pulmonary TB (on treatment)'],               medication:'RHZE fixed-dose',allergies:'None known',       lastConsult:'02 Sep 2026'},
    {mrn:'MRN-000038',name:'Lerato Mokoena', nationalId:'9302140662089',  dob:'14 Feb 1993',gender:'Female',age:33,conditions:['HIV (on ART)'],                             medication:'TDF/3TC/DTG',    allergies:'None known',       lastConsult:'28 Aug 2026'},
  ],
  teleSessions:[
    {time:'14:30',patient:'Lerato Mokoena',reason:'ART review',  status:'ready'},
    {time:'16:45',patient:'Thabiso Molapo',reason:'Renal review',status:'scheduled'},
  ],
};

/* \\u2500\\u2500\\u2500 Helpers \\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500 */
function _dSetView(v){ _D.view=v; _D.workflow=null; _dRender(); }
function _dOpenWorkflow(w){ _D.workflow=w; _dRender(); }
function _dCloseWorkflow(){ _D.workflow=null; _dRender(); }
function _dGreeting(){ var h=new Date().getHours(); return h<12?'morning':h<18?'afternoon':'evening'; }
function _dToday(){ return new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }
function _e(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _dFmtWait(m){ return m<60?m+' min':Math.floor(m/60)+'h '+(m%60)+'m'; }
function _dInitials(name){ return (name||'').split(' ').map(function(w){return w[0]||'';}).join('').slice(0,2).toUpperCase(); }

/* \\u2500\\u2500\\u2500 SVG icons \\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500 */
function _icon(name,sz){
  sz=sz||18;
  var paths={
    home:     '<path d=\"m3 11 9-8 9 8\"/><path d=\"M5 10v11h14V10M9 21v-7h6v7\"/>',
    users:    '<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75\"/>',
    stethoscope:'<path d=\"M6 3v5a4 4 0 0 0 8 0V3M4 3h4M12 3h4M10 15a5 5 0 0 0 10 0v-2\"/><circle cx=\"20\" cy=\"11\" r=\"2\"/>',
    search:   '<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-4-4\"/>',
    bell:     '<path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9\"/><path d=\"M13.7 21a2 2 0 0 1-3.4 0\"/>',
    calendar: '<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M16 3v4M8 3v4M3 11h18\"/>',
    flask:    '<path d=\"M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M8 15h8\"/>',
    image:    '<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"3\"/><circle cx=\"9\" cy=\"9\" r=\"2\"/><path d=\"m21 15-5-5L5 21\"/>',
    medicine: '<path d=\"M10.5 5.5 18.5 13.5a4.2 4.2 0 0 1-6 6l-8-8a4.2 4.2 0 1 1 6-6Z\"/><path d=\"m8.5 15.5 7-7\"/>',
    document: '<path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z\"/><path d=\"M14 2v6h6M8 13h8M8 17h5\"/>',
    clipboard:'<rect x=\"5\" y=\"4\" width=\"14\" height=\"17\" rx=\"2\"/><path d=\"M9 4.5V3h6v1.5M9 9h6M9 13h6M9 17h3\"/>',
    check:    '<path d=\"m5 12 4 4L19 6\"/>',
    plus:     '<path d=\"M12 5v14M5 12h14\"/>',
    chevron:  '<path d=\"m9 18 6-6-6-6\"/>',
    close:    '<path d=\"m6 6 12 12M18 6 6 18\"/>',
    heart:    '<path d=\"M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z\"/>',
    activity: '<path d=\"M3 12h4l2.5-7 4 14 2.5-7H21\"/>',
    shield:   '<path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z\"/><path d=\"m9 12 2 2 4-4\"/>',
    video:    '<rect x=\"2\" y=\"6\" width=\"15\" height=\"12\" rx=\"2\"/><path d=\"m17 10 5-3v10l-5-3\"/>',
    robot:    '<rect x=\"3\" y=\"11\" width=\"18\" height=\"10\" rx=\"2\"/><path d=\"M9 21v-4h6v4M12 7v4M8 7h8M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4\"/><circle cx=\"9\" cy=\"16\" r=\"1\"/><circle cx=\"15\" cy=\"16\" r=\"1\"/>',
    arrow:    '<path d=\"m9 18 6-6-6-6\"/>',
  };
  return '<svg width=\"'+sz+'\" height=\"'+sz+'\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">'+
    (paths[name]||'')+'</svg>';
}

/* \\u2500\\u2500\\u2500 CSS (injected once) \\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500 */
function _dCss(){
  if (document.getElementById('nihms-doc-css')) return;
  var s=document.createElement('style'); s.id='nihms-doc-css';
  s.textContent=[
    '@import url(\"https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@600;700&display=swap\");',
    ':root{--ink:#142923;--muted:#6d7c77;--line:#e3e9e6;--soft:#f4f7f5;--sg:#eaf6f0;--green:#18755d;--gdk:#0f5f4a;--navy:#122b27;--amber:#a6601a;--asf:#fff5e8;--red:#b4433f;--rsf:#fff0ef;}',
    '*{box-sizing:border-box}',
    '.doc-shell{display:flex;height:calc(100vh - 56px);overflow:hidden;font-family:\"DM Sans\",system-ui,sans-serif;background:var(--soft);color:var(--ink)}',
    /* Sidebar */
    '.doc-aside{width:232px;flex-shrink:0;background:var(--navy);display:flex;flex-direction:column;overflow-y:auto;color:#dce8e4}',
    '.doc-brand{height:72px;padding:0 22px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #2a423d}',
    '.doc-brand-mark{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:#d8f3e8;color:var(--gdk);flex-shrink:0}',
    '.doc-brand strong{color:#fff;font-family:Manrope,sans-serif;font-size:17px}',
    '.doc-brand span{font-size:11px;color:#91a7a1;margin-top:2px}',
    '.doc-nav-lbl{display:block;padding:16px 14px 8px;color:#708983;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}',
    '.doc-nav-btn{width:100%;border:0;background:transparent;border-radius:9px;padding:10px 11px;margin:2px 14px 0;width:calc(100% - 28px);display:flex;align-items:center;gap:12px;font-size:13px;text-align:left;color:#9eb1ac;cursor:pointer;font-family:inherit}',
    '.doc-nav-btn:hover{color:#fff;background:#1b3731}',
    '.doc-nav-btn.is-active{color:#fff;background:#1d4a3e}',
    '.doc-nav-btn.is-active svg{color:#9fe0c7}',
    '.doc-aside-bottom{margin-top:auto;padding:14px}',
    '.doc-popia{margin-bottom:12px;padding:14px;border:1px solid #2b4941;border-radius:10px;background:#17352f;display:grid;grid-template-columns:24px 1fr;gap:2px 8px}',
    '.doc-popia svg{grid-row:span 2;color:#94d6bc}',
    '.doc-popia strong{font-size:11px;color:#d5e7e1}',
    '.doc-popia span{font-size:10px;color:#78928b}',
    '.doc-dr{border-top:1px solid #2a423d;padding:14px 4px 3px;display:flex;align-items:center;gap:9px}',
    '.doc-dr strong{color:#f0f6f4;font-size:12px}',
    '.doc-dr span{font-size:11px;color:#91a7a1;margin-top:2px}',
    /* Main area */
    '.doc-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}',
    /* Topbar */
    '.doc-topbar{height:72px;padding:0 28px;display:flex;align-items:center;gap:16px;background:#fff;border-bottom:1px solid var(--line);flex-shrink:0}',
    '.doc-search{position:relative;max-width:600px;flex:1;display:flex;align-items:center}',
    '.doc-search svg{position:absolute;left:12px;color:#85928e;pointer-events:none}',
    '.doc-search input{width:100%;height:40px;border:1px solid var(--line);border-radius:9px;background:#f8faf9;padding:0 48px 0 40px;outline:none;font-size:12px;color:var(--ink)}',
    '.doc-search input:focus{border-color:#78b9a4;box-shadow:0 0 0 3px #e4f3ee}',
    '.doc-search kbd{position:absolute;right:10px;color:#889490;background:#fff;border:1px solid var(--line);border-radius:5px;padding:3px 6px;font-size:10px}',
    '.doc-search-result{position:absolute;top:47px;left:0;width:100%;padding:12px;display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:0 12px 32px rgba(16,39,31,.12);z-index:30;cursor:pointer}',
    '.doc-topbar-date{padding-left:16px;border-left:1px solid var(--line);display:flex;flex-direction:column;white-space:nowrap}',
    '.doc-topbar-date span{font-size:10px;color:var(--muted)}',
    '.doc-topbar-date strong{font-size:11px;margin-top:2px}',
    /* Avatar */
    '.dav{border-radius:50%;display:grid;place-items:center;font-weight:700;background:#d7eee5;color:var(--gdk);flex-shrink:0}',
    '.dav-34{width:34px;height:34px;font-size:11px}',
    '.dav-40{width:40px;height:40px;font-size:13px}',
    '.dav-48{width:48px;height:48px;font-size:14px;background:#cde9df}',
    /* Patient strip */
    '.doc-pt-strip{min-height:76px;padding:12px 28px;background:#fbfcfb;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:22px;flex-shrink:0}',
    '.doc-pt-name{min-width:140px;display:flex;flex-direction:column}',
    '.doc-pt-name strong{font-family:Manrope,sans-serif;font-size:14px}',
    '.doc-pt-name span{margin-top:4px;font-size:9px;color:var(--green);font-weight:600}',
    '.doc-pt-detail{display:flex;flex-direction:column;padding-left:20px;border-left:1px solid var(--line)}',
    '.doc-pt-detail span{color:var(--muted);font-size:9px}',
    '.doc-pt-detail strong{margin-top:3px;font-size:11px;white-space:nowrap}',
    /* Content area */
    '.doc-content{flex:1;overflow-y:auto;padding:22px 28px 48px}',
    /* Cards */
    '.dcard{background:#fff;border:1px solid var(--line);border-radius:11px;box-shadow:0 1px 2px rgba(21,40,32,.03)}',
    '.dcard-p{padding:20px}',
    '.dcard-hd{min-height:30px;margin-bottom:16px;display:flex;align-items:flex-start;justify-content:space-between}',
    '.dcard-hd h2{font-family:Manrope,sans-serif;font-size:14px;margin:0;color:var(--ink)}',
    '.dcard-hd .eyebrow{display:block;margin-bottom:3px;color:#8a9692;font-size:8px;font-weight:700;letter-spacing:.11em}',
    /* Buttons */
    '.dbtn{min-height:36px;padding:0 14px;border-radius:8px;border:1px solid transparent;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s}',
    '.dbtn-p{color:#fff;background:var(--green);box-shadow:0 2px 4px rgba(18,93,73,.18)}',
    '.dbtn-p:hover{background:var(--gdk)}',
    '.dbtn-s{color:#30443e;background:#fff;border-color:#d9e1de}',
    '.dbtn-s:hover{border-color:#9bb9af;background:#fbfdfc}',
    '.dbtn-g{min-height:auto;padding:5px;color:var(--green);background:transparent;border:0;font-size:10px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:4px}',
    /* Section tabs */
    '.doc-tabs{height:44px;padding:0 4px;display:flex;gap:22px;border-bottom:1px solid #d9e0dd;flex-shrink:0}',
    '.doc-tab{position:relative;border:0;color:var(--muted);background:transparent;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap}',
    '.doc-tab.is-active{color:var(--green)}',
    '.doc-tab.is-active::after{content:\"\";position:absolute;height:2px;inset:auto 0 -1px;background:var(--green);border-radius:2px}',
    /* Consult layout */
    '.doc-consult-grid{display:grid;grid-template-columns:1fr 320px;gap:16px;margin-top:18px}',
    '.doc-consult-main{display:flex;flex-direction:column;gap:14px}',
    '.doc-consult-aside{display:flex;flex-direction:column;gap:14px}',
    /* Fields */
    '.dfield{display:flex;flex-direction:column;gap:5px;min-width:0}',
    '.dfield label{color:#4c5f59;font-size:10px;font-weight:600}',
    '.dfield input,.dfield select,.dfield textarea{width:100%;color:#263a34;background:#fbfcfb;border:1px solid #dde5e2;border-radius:7px;padding:9px 11px;outline:none;font-size:11px;font-family:inherit}',
    '.dfield input,.dfield select{height:38px}',
    '.dfield textarea{min-height:76px;resize:vertical;line-height:1.5}',
    '.dfield input:focus,.dfield select:focus,.dfield textarea:focus{border-color:#71ae9a;box-shadow:0 0 0 3px #e9f5f1;background:#fff}',
    /* Grid helpers */
    '.dgrid2{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}',
    '.dgrid3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}',
    '.dgrid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}',
    '.dspan2{grid-column:span 2}',
    /* Vitals */
    '.vitals-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}',
    '.dvital{padding:10px;display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:8px}',
    '.dvital-ic{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;color:var(--green);background:var(--sg);flex-shrink:0}',
    '.dvital span{color:var(--muted);font-size:8px;display:block}',
    '.dvital strong{margin-top:2px;font-size:11px;display:block}',
    '.dvital-warm .dvital-ic{color:var(--amber);background:var(--asf)}',
    /* Quick actions sidebar card */
    '.qaction-btn{width:100%;padding:11px 3px;border:0;border-top:1px solid #edf1ef;background:#fff;display:flex;align-items:center;gap:10px;color:var(--ink);text-align:left;cursor:pointer}',
    '.qaction-btn:hover{background:#fafcfb}',
    '.qaction-btn strong{font-size:10px;display:block}',
    '.qaction-btn small{color:var(--muted);font-size:9px;display:block;margin-top:1px}',
    '.qaction-btn>svg{color:#93a09c}',
    '.aico{width:34px;height:34px;display:grid;place-items:center;border-radius:8px;flex-shrink:0}',
    '.aico-lab{color:#317e6a;background:#eaf5f1}',
    '.aico-img{color:#4976a3;background:#eaf2fa}',
    '.aico-rx{color:#a0692f;background:#faf1e6}',
    '.aico-doc{color:#6d6aa1;background:#f0effa}',
    /* Patient summary sidebar card */
    '.alert-row{padding:10px;display:flex;gap:8px;align-items:center;background:var(--rsf);border:1px solid #f3d1cf;border-radius:8px;margin-bottom:10px}',
    '.alert-ico{width:24px;height:24px;flex-shrink:0;display:grid;place-items:center;border-radius:50%;color:#fff;background:var(--red);font-size:11px;font-weight:700}',
    '.summary-grp{display:flex;flex-direction:column;gap:2px;padding:11px 0;border-bottom:1px solid #eef2f0}',
    '.summary-grp:last-child{border-bottom:0;padding-bottom:0}',
    '.summary-grp>span{color:var(--muted);font-size:8px}',
    '.summary-grp strong{font-size:10px}',
    '.summary-grp small{color:var(--muted);font-size:9px}',
    '.dtag{padding:3px 7px;color:var(--green);background:var(--sg);border-radius:4px;font-size:8px}',
    /* Diagnosis row */
    '.diag-row{margin-top:13px;padding:11px 13px;display:flex;justify-content:space-between;align-items:center;background:#f5f8f6;border-radius:8px}',
    '.diag-row div{display:flex;flex-direction:column;gap:3px}',
    '.diag-row span{color:var(--muted);font-size:9px}',
    '.diag-row strong{font-size:10px}',
    /* Table */
    '.dtbl{width:100%;border-collapse:collapse;font-size:13px}',
    '.dtbl th{padding:9px 14px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);border-bottom:1px solid var(--line);background:var(--soft);white-space:nowrap}',
    '.dtbl td{padding:12px 14px;border-bottom:1px solid #f1f5f9;color:var(--ink);vertical-align:middle}',
    '.dtbl tr:last-child td{border-bottom:0}',
    '.dtbl tbody tr:hover td{background:#f8faf8;cursor:pointer}',
    /* Status badge */
    '.dbadge{padding:3px 10px;border-radius:99px;font-size:10px;font-weight:600;display:inline-block}',
    /* KPI */
    '.dkpi{background:#fff;border-radius:12px;border:1px solid var(--line);padding:16px 18px;cursor:pointer;text-align:left;font-family:inherit;width:100%;transition:box-shadow .15s}',
    '.dkpi:hover{box-shadow:0 2px 14px rgba(20,41,35,.08)}',
    /* Workflow overlay */
    '.doc-workflow{position:fixed;inset:0;z-index:100;background:var(--soft);overflow-y:auto;display:flex;flex-direction:column}',
    '.wf-top{height:56px;padding:0 40px;display:flex;justify-content:space-between;align-items:center;background:var(--navy);color:#fff;flex-shrink:0}',
    '.wf-top-brand{display:flex;align-items:center;gap:10px;font-family:Manrope,sans-serif;font-size:14px}',
    '.wf-top-close{display:flex;align-items:center;gap:7px;border:0;color:#bed0ca;background:transparent;font-size:10px;cursor:pointer;font-family:inherit}',
    '.wf-heading{min-height:120px;padding:24px 40px;display:flex;align-items:center;gap:16px;background:#193a33;flex-shrink:0}',
    '.wf-heading h1{color:#fff;font-family:Manrope,sans-serif;font-size:22px;margin:0}',
    '.wf-heading p{color:#a9bdb7;font-size:11px;margin:5px 0 0}',
    '.wf-title-ico{width:48px;height:48px;display:grid;place-items:center;border-radius:12px;color:#b8ead7;background:#265248;flex-shrink:0}',
    '.wf-pt{margin-left:auto;padding-left:22px;border-left:1px solid #31544c;display:flex;align-items:center;gap:10px}',
    '.wf-pt span,.wf-pt small{color:#8fa8a1;font-size:8px}',
    '.wf-pt strong{font-size:11px;display:block;margin:2px 0}',
    '.wf-body{max-width:1100px;margin:20px auto;padding:0 16px;display:flex;flex-direction:column;gap:12px;width:100%}',
    '.wf-section{background:#fff;border:1px solid var(--line);border-radius:11px}',
    '.wf-sec-hd{padding:15px 20px;display:flex;gap:12px;border-bottom:1px solid #edf1ef;align-items:center}',
    '.wf-sec-num{width:24px;height:24px;display:grid;place-items:center;border-radius:7px;color:var(--green);background:var(--sg);font-size:9px;font-weight:700;flex-shrink:0}',
    '.wf-sec-hd h2{font-family:Manrope,sans-serif;font-size:13px;margin:0}',
    '.wf-sec-hd p{margin:3px 0 0;color:var(--muted);font-size:9px}',
    '.wf-sec-body{padding:20px;display:flex;flex-direction:column;gap:16px}',
    '.wf-footer{position:sticky;bottom:0;padding:0 40px;min-height:64px;display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.93);backdrop-filter:blur(8px);border-top:1px solid var(--line);box-shadow:0 -8px 25px rgba(23,56,45,.06)}',
    '.wf-footer>span{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:9px}',
    /* Auto-details */
    '.auto-det{position:relative;padding:14px 15px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px;background:#f6f9f7;border:1px solid #e4ebe8;border-radius:9px}',
    '.auto-det>div{display:flex;flex-direction:column;gap:3px}',
    '.auto-det span{color:var(--muted);font-size:8px}',
    '.auto-det strong{font-size:10px}',
    '.auto-badge{position:absolute;top:9px;right:10px;display:flex;align-items:center;gap:4px;color:var(--green);font-size:9px;font-weight:700}',
    /* Choice group */
    '.choice-grp{display:flex;flex-direction:column;gap:6px}',
    '.choice-grp>div{display:flex;flex-wrap:wrap;gap:5px}',
    '.choice-btn{min-width:64px;min-height:32px;padding:0 10px;display:inline-flex;justify-content:center;align-items:center;gap:5px;color:#52635e;background:#fff;border:1px solid #dce4e1;border-radius:7px;font-size:10px;cursor:pointer;font-family:inherit}',
    '.choice-btn.sel{color:var(--gdk);background:var(--sg);border-color:#84baa8;font-weight:700}',
    /* Test cards */
    '.test-groups{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;align-items:start}',
    '.test-card{overflow:hidden;border:1px solid var(--line);border-radius:9px}',
    '.test-card-hd{padding:11px;display:flex;align-items:center;gap:8px;background:#f7f9f8;border-bottom:1px solid var(--line);font-size:10px;font-weight:600}',
    '.test-card-hd-ico{width:26px;height:26px;display:grid;place-items:center;border-radius:7px;color:var(--green);background:var(--sg);flex-shrink:0}',
    '.test-opts{padding:6px;display:grid;grid-template-columns:1fr 1fr;gap:2px}',
    '.test-opt{padding:7px 5px;display:flex;align-items:center;gap:6px;color:#53635e;background:transparent;border:0;border-radius:5px;font-size:9px;text-align:left;cursor:pointer;font-family:inherit;width:100%}',
    '.test-opt:hover{background:#f7faf8}',
    '.test-opt.sel{color:var(--gdk);background:var(--sg);font-weight:600}',
    '.tcheck{width:14px;height:14px;flex-shrink:0;display:grid;place-items:center;border:1px solid #cad5d1;border-radius:3px}',
    '.test-opt.sel .tcheck{color:#fff;background:var(--green);border-color:var(--green)}',
    /* Allergy banner */
    '.allergy-banner{padding:10px 12px;display:flex;align-items:center;gap:10px;color:var(--red);background:var(--rsf);border:1px solid #f2d1cf;border-radius:8px}',
    '.allergy-banner>span{width:24px;height:24px;display:grid;place-items:center;border-radius:50%;color:#fff;background:var(--red);font-size:11px;font-weight:700;flex-shrink:0}',
    '.allergy-banner strong{font-size:10px}',
    '.allergy-banner small{font-size:9px;color:#8d625f;margin-top:1px}',
    /* Medication card */
    '.med-card{padding:14px;border:1px solid #dfe6e3;border-radius:9px;background:#fbfcfb}',
    '.med-card-top{margin-bottom:9px;display:flex;justify-content:space-between;font-size:10px;font-weight:700}',
    '.med-search{height:40px;margin-bottom:12px;padding:0 11px;display:flex;align-items:center;gap:8px;color:#82908b;background:#fff;border:1px solid #d9e2de;border-radius:8px}',
    '.med-search input{width:100%;border:0;outline:none;color:var(--ink);font-size:11px;font-family:inherit}',
    /* Safety */
    '.safety-list{border:1px solid var(--line);border-radius:9px;overflow:hidden}',
    '.safety-item{padding:10px 12px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #edf1ef}',
    '.safety-item:last-child{border-bottom:0}',
    '.safety-item>span{width:22px;height:22px;display:grid;place-items:center;border-radius:50%;color:var(--green);background:var(--sg)}',
    '.safety-item div{display:flex;flex:1;flex-direction:column;gap:2px}',
    '.safety-item strong{font-size:10px}',
    '.safety-item small{color:var(--muted);font-size:8px}',
    '.safety-item b{color:var(--green);font-size:8px}',
    '.safety-warn{background:var(--asf)}',
    '.safety-warn>span{color:#fff;background:var(--amber);font-size:10px;font-weight:700}',
    '.safety-warn strong,.safety-warn b{color:#854a12}',
    /* Prescriber */
    '.prescriber{padding:11px;display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:8px}',
    '.prescriber strong{font-size:10px}',
    '.prescriber span,.prescriber small{color:var(--muted);font-size:8px;display:block}',
    '.verified{margin-left:auto;display:flex;align-items:center;gap:4px;color:var(--green);font-size:9px;font-weight:700}',
    /* Screening grid */
    '.screening-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px 24px}',
    /* Success */
    '.doc-success{min-height:100%;display:grid;place-items:center;padding:30px;background:#eef4f1}',
    '.success-card{width:490px;max-width:100%;padding:40px;text-align:center;background:#fff;border:1px solid var(--line);border-radius:15px;box-shadow:0 18px 50px rgba(23,56,45,.08)}',
    '.success-ico{width:68px;height:68px;margin:0 auto 18px;display:grid;place-items:center;color:#fff;background:var(--green);border-radius:50%;box-shadow:0 0 0 9px var(--sg)}',
    '.success-card h1{font-family:Manrope,sans-serif;font-size:22px;margin:0}',
    '.success-card>p{margin:8px auto 22px;color:var(--muted);font-size:11px;line-height:1.6}',
    '.order-num{padding:16px;background:#f5f8f6;border:1px dashed #bdd0c9;border-radius:9px}',
    '.order-num>div:first-child{display:flex;justify-content:center;align-items:center;gap:6px;color:var(--muted);font-size:9px}',
    '.order-num strong{display:block;margin:6px 0 8px;color:var(--gdk);font-family:Manrope,sans-serif;font-size:18px;letter-spacing:.04em}',
    '.barcode{color:#203b34;font-family:monospace;letter-spacing:3px;font-size:14px}',
    '.success-actions{margin-top:20px;display:flex;justify-content:center;gap:8px}',
    /* AI */
    '.ai-bubble-u{display:flex;justify-content:flex-end;margin-bottom:10px}',
    '.ai-bubble-a{display:flex;justify-content:flex-start;margin-bottom:10px}',
    '.ai-msg{max-width:72%;padding:10px 13px;border-radius:12px;font-size:13px;line-height:1.5;white-space:pre-wrap}',
    '.ai-msg-u{background:var(--green);color:#fff;border-radius:14px 14px 4px 14px}',
    '.ai-msg-a{background:#fff;color:var(--ink);border:1px solid var(--line);border-radius:14px 14px 14px 4px}',
    /* Empty state */
    '.empty-sec{min-height:380px;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:40px}',
    '.empty-sec-ico{width:60px;height:60px;display:grid;place-items:center;color:var(--green);background:var(--sg);border-radius:18px;margin:0 auto 16px}',
    '.empty-sec h2{font-family:Manrope,sans-serif;font-size:18px;margin:0 0 8px}',
    '.empty-sec p{max-width:400px;color:var(--muted);font-size:11px;line-height:1.6;margin:0 0 18px}',
  ].join('');
  document.head.appendChild(s);
}

/* \\u2500\\u2500\\u2500 Shell \\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500 */
Pages['doctor'] = function(){
  _dCss();
  if (document.getElementById('doc-main')){ _dRender(); return ''; }
  return '<div class=\"doc-shell\" id=\"doc-shell\">' +
    '<aside id=\"doc-sidebar\" class=\"doc-aside\"></aside>' +
    '<div class=\"doc-main\" id=\"doc-main\"></div>' +
  '</div>';
};

/* \\u2500\\u2500\\u2500 Render \\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500 */
function _dRender(){
  _dCss();
  /* Workflow overlay */
  if (_D.workflow) {
    var shell = document.getElementById('doc-shell') || document.body;
    var wfEl = document.getElementById('doc-workflow-overlay');
    if (!wfEl){ wfEl=document.createElement('div'); wfEl.id='doc-workflow-overlay'; shell.appendChild(wfEl); }
    wfEl.innerHTML = _dWorkflow(_D.workflow);
    return;
  }
  /* Remove overlay if present */
  var old = document.getElementById('doc-workflow-overlay');
  if (old) old.remove();

  var sidebar = document.getElementById('doc-sidebar');
  var main    = document.getElementById('doc-main');
  if (!sidebar || !main) return;
  sidebar.innerHTML = _dSidebar();
  var views = {
    'dashboard':      _dDashboard,
    'patient-queue':  _dPatientQueue,
    'consultation':   _dConsultation,
    'patient-search': _dPatientSearch,
    'telemedicine':   _dTelemedicine,
    'ai-assistant':   _dAiAssistant,
  };
  main.innerHTML = (views[_D.view]||_dDashboard)();
  _dBindEvents();
}

/* \\u2500\\u2500\\u2500 Sidebar \\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500 */
function _dSidebar(){
  var u = (window.API && window.API.getStoredUser && window.API.getStoredUser()) || {};
  var fn = u.firstName||'Nandi'; var ln = u.lastName||'Maseko';
  var ini = (fn[0]+(ln[0]||'')).toUpperCase();

  function btn(label,icon,view){
    var a=(_D.view===view);
    var cls='doc-nav-btn'+(a?' is-active':'');
    return '<button class="'+cls+'" onclick="_dSetView(\''+view+'\')">'+
      _icon(icon,16)+'<span>'+label+'</span></button>';
  }
  function lbl(t){ return '<span class="doc-nav-lbl">'+t+'</span>'; }


  return '<div class=\"doc-brand\">'+
      '<div class=\"doc-brand-mark\">'+_icon('heart',20)+'</div>'+
      '<div><strong>HealthHub</strong><span>Clinical workspace</span></div>'+
    '</div>'+
    lbl('Workspace')+
    btn('My dashboard',  'home',        'dashboard')+
    btn('Telemedicine',  'video',       'telemedicine')+
    '<div class=\"doc-aside-bottom\">'+
      '<div class=\"doc-popia\">'+
        _icon('shield',20)+
        '<strong>POPIA secure</strong>'+
        '<span>Clinical data protected</span>'+
      '</div>'+
      '<div class=\"doc-dr\">'+
        '<div class=\"dav dav-34\">'+ini+'</div>'+
        '<div><strong>Dr '+_e(fn[0]+'. '+ln)+'</strong><span>General Practitioner</span></div>'+
        _icon('chevron',14)+
      '</div>'+
    '</div>';
}

/* \\u2500\\u2500\\u2500 Topbar \\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500 */
function _dTopbar(searchVal){
  return '<div class=\"doc-topbar\">'+
    '<div class=\"doc-search\">'+
      _icon('search',17)+
      '<input id=\"doc-srch\" placeholder=\"Search patient by SA ID, passport or folder number...\" value=\"'+_e(searchVal||'')+'\" oninput=\"_dTopSearch(this.value)\">'+
      '<kbd>\\u2318 K</kbd>'+
      '<div id=\"doc-srch-result\" style=\"display:none\"></div>'+
    '</div>'+
    '<button style=\"width:38px;height:38px;display:grid;place-items:center;border:1px solid var(--line);border-radius:9px;color:#52635e;background:#fff;position:relative;cursor:pointer\">'+
      _icon('bell',17)+
      '<span style=\"position:absolute;top:8px;right:8px;width:6px;height:6px;border:1px solid #fff;border-radius:50%;background:#df625a\"></span>'+
    '</button>'+
    '<div class=\"doc-topbar-date\"><span>Today</span><strong>'+_dToday()+'</strong></div>'+
  '</div>';
}

window._dTopSearch = function(q){
  var el = document.getElementById('doc-srch-result');
  if (!el) return;
  if (!q || q.length < 2) { el.style.display='none'; return; }
  var matches = _D.patients.filter(function(p){ return p.name.toLowerCase().includes(q.toLowerCase()) || p.nationalId.includes(q) || p.mrn.toLowerCase().includes(q.toLowerCase()); });
  if (!matches.length) { el.style.display='none'; return; }
  var p = matches[0];
  el.style.display='flex';
  el.className='doc-search-result';
  el.innerHTML = '<div class=\"dav dav-34\" style=\"flex-shrink:0\">'+_dInitials(p.name)+'</div>'+
    '<div style=\"display:flex;flex-direction:column\"><strong style=\"font-size:12px\">'+_e(p.name)+'</strong>'+
    '<span style=\"font-size:10px;color:var(--muted)\">SA ID '+_e(p.nationalId)+' \· '+_e(p.mrn)+'</span></div>'+
    '<span style=\"margin-left:auto;display:flex;align-items:center;gap:5px;color:var(--green);font-weight:700;font-size:10px;cursor:pointer\" onclick=\"_D.selectedPatient=_D.patients['+_D.patients.indexOf(p)+'];_dSetView(\'consultation\')\">Open file '+_icon('arrow',13)+'</span>';
};

/* \\u2500\\u2500\\u2500 Patient strip (shown on consultation page) \\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500 */
function _dPatientStrip(pt){
  if (!pt) return '';
  return '<div class=\"doc-pt-strip\">'+
    '<div class=\"dav dav-48\">'+_dInitials(pt.name)+'</div>'+
    '<div class=\"doc-pt-name\">'+
      '<strong>'+_e(pt.name)+'</strong>'+
      '<span>&#9679; Active patient</span>'+
    '</div>'+
    '<div class=\"doc-pt-detail\"><span>SA ID</span><strong>'+_e(pt.nationalId)+'</strong></div>'+
    '<div class=\"doc-pt-detail\"><span>Date of birth</span><strong>'+_e(pt.dob)+' \· '+pt.age+' yrs</strong></div>'+
    '<div class=\"doc-pt-detail\"><span>Gender</span><strong>'+_e(pt.gender)+'</strong></div>'+
    '<div class=\"doc-pt-detail\"><span>Folder no.</span><strong>'+_e(pt.mrn)+'</strong></div>'+
    '<button class=\"dbtn-g\" onclick=\"_dSetView(\'patient-search\')\" style=\"margin-left:auto\">View profile '+_icon('chevron',14)+'</button>'+
  '</div>';
}

/* \\u2500\\u2500\\u2500 Status badge \\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500 */
function _dBadge(status){
  var m={
    'waiting':    ['#f1f5f9','#475569','Waiting'],
    'vitals':     ['#fff5e8','#a6601a','In Vitals'],
    'with doctor':['#eaf6f0','#18755d','With Doctor'],
    'ready':      ['#eaf6f0','#18755d','Ready'],
    'scheduled':  ['#f8fafc','#94a3b8','Scheduled'],
    'active':     ['#eaf6f0','#18755d','Active'],
    'urgent':     ['#fff0ef','#b4433f','Urgent'],
    'routine':    ['#eaf6f0','#18755d','Routine'],
    'completed':  ['#eaf6f0','#18755d','Completed'],
  };
  var v=m[(status||'').toLowerCase()]||['#f8fafc','#64748b',status||'\—'];
  return '<span class=\"dbadge\" style=\"background:'+v[0]+';color:'+v[1]+'\">'+v[2]+'</span>';
}

/* \\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550
   DASHBOARD
\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550 */
function _dDashboard(){
  var now=new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});
  setTimeout(function(){
    var el; 
    el=document.getElementById('dr-today'); if(el) el.textContent=new Date().toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'long',year:'numeric'});
    el=document.getElementById('dr-consult-time'); if(el) el.textContent='TODAY · '+now;
    el=document.getElementById('dr-vitals-time');  if(el) el.textContent='RECORDED '+now;
    el=document.getElementById('dr-rev-date');     if(el) el.value=new Date(Date.now()+7*864e5).toISOString().slice(0,10);
    // tabs
    document.querySelectorAll('.dr-tab').forEach(function(b){
      b.onclick=function(){
        document.querySelectorAll('.dr-tab').forEach(function(x){x.classList.remove('dr-tab-a');});
        this.classList.add('dr-tab-a');
        ['dr-tc','dr-tr','dr-tl','dr-tx','dr-tce','dr-tfu'].forEach(function(id){var e=document.getElementById(id);if(e)e.style.display='none';});
        var t=document.getElementById(this.dataset.tab); if(t) t.style.display='';
      };
    });
    // workflow buttons
    document.querySelectorAll('[data-wf]').forEach(function(b){
      b.onclick=function(){ var t=this.dataset.wf; _drWfOpen(t); };
    });
  },0);

  function fld(l,tp,v,p){v=v||'';p=p||'';return '<div class="dr-f"><label>'+l+'</label>'+(tp==='textarea'?'<textarea placeholder="'+p+'">'+v+'</textarea>':'<input type="'+(tp||'text')+'" value="'+v+'" placeholder="'+p+'">')+'</div>';}
  function sel(l,opts){return '<div class="dr-f"><label>'+l+'</label><select>'+opts.map(function(o){return '<option>'+o+'</option>';}).join('')+'</select></div>';}
  function vit(ic,l,v,u,w){return '<div class="dr-vt'+(w?' dr-vt-w':'')+'">'+'<div class="dr-vt-ic">'+_icon(ic,15)+'</div>'+'<div class="dr-vt-txt"><span>'+l+'</span><strong>'+v+' <small>'+u+'</small></strong></div></div>';}
  function qa(wf,ic,t,s,col,bg){return '<button class="dr-qab" data-wf="'+wf+'"><span class="dr-qai" style="color:'+col+';background:'+bg+'">'+_icon(ic,17)+'</span><span class="dr-qal"><strong>'+t+'</strong><small>'+s+'</small></span>'+_icon('arrow',13)+'</button>';}

  return '<div class="dr-ph">'+
    '<div class="dr-bc"><span>Consultations</span>'+_icon('arrow',13)+'<strong>New consultation</strong></div>'+
    '<div class="dr-pt-row">'+
      '<div><h1 class="doc-h1">New consultation</h1><p class="doc-sub">Capture clinical notes, review records, and create care orders.</p></div>'+
      '<div class="dr-ha">'+
        '<span class="dr-draft"><span class="dr-dd"></span>Draft saved</span>'+
        '<button class="dbtn dbtn-s">Save draft</button>'+
        '<button class="dbtn dbtn-p">'+_icon('check',14)+' Complete consultation</button>'+
      '</div>'+
    '</div>'+
    '</div>'+

    '<div class="dr-tabs">'+
      '<button class="dr-tab dr-tab-a" data-tab="dr-tc">Consultation</button>'+
      '<button class="dr-tab" data-tab="dr-tr">Medical records</button>'+
      '<button class="dr-tab" data-tab="dr-tl">Lab results</button>'+
      '<button class="dr-tab" data-tab="dr-tx">Prescriptions</button>'+
      '<button class="dr-tab" data-tab="dr-tce">Certificates</button>'+
      '<button class="dr-tab" data-tab="dr-tfu">Follow-up</button>'+
    '</div>'+

    '<div id="dr-tc">'+
      '<div class="dr-cg">'+
        '<div class="dr-cm">'+
          '<div class="doc-card doc-card-p">'+
            '<div class="dchd"><div><span class="deyebrow" id="dr-consult-time">TODAY</span><h2 class="doc-h2">Clinical notes</h2></div><span class="doc-badge">In-person visit</span></div>'+
            '<div class="dfg dfg2">'+
              fld('Presenting complaint','textarea','Persistent cough and mild shortness of breath for 5 days.')+
              fld('History of presenting illness','textarea','','Onset, duration, severity, associated symptoms...')+
              fld('Examination findings','textarea','','Document relevant clinical examination...')+
              fld('Assessment &amp; diagnosis','textarea','Suspected lower respiratory tract infection')+
            '</div>'+
            '<div class="dr-dg"><div><span>Primary diagnosis</span><strong>J22 · Acute lower respiratory infection, unspecified</strong></div><button class="doc-ghost">+ Add diagnosis</button></div>'+
          '</div>'+
          '<div class="doc-card doc-card-p">'+
            '<div class="dchd"><div><span class="deyebrow" id="dr-vitals-time">RECORDED</span><h2 class="doc-h2">Vitals</h2></div><button class="doc-ghost">Edit vitals</button></div>'+
            '<div class="dr-vs">'+vit('activity','Blood pressure','128/82','mmHg',false)+vit('heart','Heart rate','78','bpm',false)+vit('activity','Temperature','37.8','°C',true)+vit('activity','SpO₂','96','%',false)+vit('user','Weight','68.4','kg',false)+'</div>'+
          '</div>'+
          '<div class="doc-card doc-card-p">'+
            '<div class="dchd"><div><span class="deyebrow">CARE PLAN</span><h2 class="doc-h2">Plan &amp; follow-up</h2></div></div>'+
            fld('Consultation notes / care plan','textarea','','Add treatment plan, medication notes and advice given...')+
            '<div class="dfg dfg3" style="margin-top:16px">'+sel('Follow-up',['In 7 days','In 14 days','In 1 month','As needed'])+fld('Review date','date','','')+sel('Follow-up type',['In person','Telephone','Virtual'])+'</div>'+
          '</div>'+
        '</div>'+
        '<div class="dr-ca">'+
          '<div class="doc-card" style="padding:17px">'+
            '<div class="dchd" style="margin-bottom:4px"><h2 class="doc-h2">Clinical actions</h2></div>'+
            qa('lab','flask','Request laboratory test','Create a new pathology order','#317e6a','#eaf5f1')+
            qa('imaging','image','Request imaging','X-ray, CT, MRI or ultrasound','#4976a3','#eaf2fa')+
            qa('rx','pill','Create prescription','Prescribe and issue medication','#a0692f','#faf1e6')+
            qa('cert','document','Medical certificate','Issue a digital certificate','#6d6aa1','#f0effa')+
          '</div>'+
          '<div class="doc-card" style="padding:17px">'+
            '<div class="dchd"><h2 class="doc-h2">Patient summary</h2><button class="doc-ghost">View all</button></div>'+
            '<div class="dr-alb" style="margin-bottom:12px"><span class="dr-ali">!</span><div><span>Allergies</span><strong>Penicillin — rash</strong></div></div>'+
            '<div class="dr-sg"><span>Active medication</span><strong>Amlodipine 5 mg</strong><small>Once daily · Active</small></div>'+
            '<div class="dr-sg"><span>Chronic conditions</span><div class="dr-tgs"><i class="dr-tg">Hypertension</i><i class="dr-tg">Asthma</i></div></div>'+
            '<div class="dr-sg"><span>Last consultation</span><strong>18 January 2026</strong><small>Dr S. Molefe · Routine review</small></div>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
    '<div id="dr-tr" style="display:none"><div class="doc-card dr-emp"><div class="dr-ei">'+_icon('document',28)+'</div><h2 style="margin:0 0 8px">Patient medical record</h2><p>View diagnoses, encounters, procedures and uploaded clinical documents.</p><button class="dbtn dbtn-p">+ Add new</button></div></div>'+
    '<div id="dr-tl" style="display:none"><div class="doc-card dr-emp"><div class="dr-ei">'+_icon('flask',28)+'</div><h2 style="margin:0 0 8px">Laboratory results</h2><p>No unreviewed results. The most recent FBC was completed 18 January 2026.</p><button class="dbtn dbtn-p">+ Add new</button></div></div>'+
    '<div id="dr-tx" style="display:none"><div class="doc-card dr-emp"><div class="dr-ei">'+_icon('pill',28)+'</div><h2 style="margin:0 0 8px">Medication history</h2><p>Review active prescriptions and previously issued medication.</p><button class="dbtn dbtn-p">+ Add new</button></div></div>'+
    '<div id="dr-tce" style="display:none"><div class="doc-card dr-emp"><div class="dr-ei">'+_icon('document',28)+'</div><h2 style="margin:0 0 8px">Medical certificates</h2><p>Create and review medical certificates issued for this patient.</p><button class="dbtn dbtn-p">+ Add new</button></div></div>'+
    '<div id="dr-tfu" style="display:none"><div class="doc-card dr-emp"><div class="dr-ei">'+_icon('calendar',28)+'</div><h2 style="margin:0 0 8px">Follow-up plan</h2><p>Schedule a clinical review and view upcoming appointments.</p><button class="dbtn dbtn-p">+ Add new</button></div></div>';
}

function _dPatientQueue(){
  var rows=_D.queue.map(function(p){
    return '<tr>'+
      '<td><span style=\"font-family:monospace;font-size:12px;font-weight:700;color:var(--green)\">'+_e(p.ticket)+'</span></td>'+
      '<td style=\"font-weight:600\">'+_e(p.name)+'</td>'+
      '<td style=\"color:var(--muted)\">'+_e(p.reason)+'</td>'+
      '<td style=\"color:var(--muted)\">'+_dFmtWait(p.wait)+'</td>'+
      '<td>'+_dBadge(p.status)+'</td>'+
      '<td>'+(p.status!=='with doctor'?'<button class=\"dbtn dbtn-p\" style=\"font-size:10px;padding:4px 12px;min-height:28px\" onclick=\"_dCallIn(\''+p.ticket+'\')\">Call in</button>':'')+'</td>'+
    '</tr>';
  }).join('');
  return _dTopbar('')+
    '<div class=\"doc-content\">'+
      '<h1 style=\"font-family:Manrope,sans-serif;font-size:22px;font-weight:700;margin:0 0 4px\">Patient queue</h1>'+
      '<div style=\"font-size:12px;color:var(--muted);margin-bottom:18px\">Today \· '+_D.queue.length+' patients</div>'+
      '<div class=\"dcard\" style=\"padding:0;overflow:hidden\">'+
        '<table class=\"dtbl\">'+
          '<thead><tr><th>Ticket</th><th>Patient</th><th>Reason for visit</th><th>Waiting</th><th>Status</th><th></th></tr></thead>'+
          '<tbody>'+rows+'</tbody>'+
        '</table>'+
      '</div>'+
    '</div>';
}

window._dCallIn = function(ticket){
  var p=_D.queue.find(function(q){return q.ticket===ticket;});
  if(!p)return;
  p.status='with doctor';
  _D.selectedPatient=_D.patients.find(function(pt){return pt.name===p.name;})||{name:p.name,mrn:ticket,nationalId:'\—',dob:'\—',gender:'\—',age:'\—',conditions:[],medication:'\—',allergies:'None known',lastConsult:'\—'};
  _D.consultTab='Consultation';
  _dSetView('consultation');
};

/* \\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550
   CONSULTATION
\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550 */
function _dConsultation(){
  var sel=_D.selectedPatient;
  var tabs=['Consultation','Medical records','Lab results','Prescriptions','Certificates','Follow-up'];
  var tab=_D.consultTab||'Consultation';

  /* Patient selector if no patient */
  if(!sel){
    return _dTopbar('')+
      '<div class=\"doc-content\">'+
        '<h1 style=\"font-family:Manrope,sans-serif;font-size:22px;font-weight:700;margin:0 0 18px\">Consultations</h1>'+
        '<div class=\"dcard dcard-p\">'+
          '<div class=\"dcard-hd\"><h2>Select patient</h2></div>'+
          '<select class=\"dfield\" style=\"max-width:400px\" onchange=\"_dPickConsultPt(this.value)\">'+
            '<option value=\"\">\— Select a patient to begin \—</option>'+
            _D.patients.map(function(p){return '<option value=\"'+p.mrn+'\">'+_e(p.name)+' ('+_e(p.nationalId)+')</option>';}).join('')+
          '</select>'+
          '<div class=\"empty-sec\" style=\"min-height:260px\">'+
            '<div class=\"empty-sec-ico\">'+_icon('stethoscope',28)+'</div>'+
            '<h2>No patient selected</h2>'+
            '<p>Select a patient above or call them in from the patient queue to begin a consultation.</p>'+
          '</div>'+
        '</div>'+
      '</div>';
  }

  /* Tab content */
  var tabContent='';
  if(tab==='Consultation'){
    tabContent=_dConsultMain(sel);
  } else {
    var data={
      'Medical records':['clipboard','Patient medical record','View diagnoses, encounters, procedures and uploaded clinical documents.'],
      'Lab results':    ['flask','Laboratory results','No unreviewed results. The most recent FBC was completed 18 Jan 2026.'],
      'Prescriptions':  ['medicine','Medication history','Review active prescriptions and previously issued medication.'],
      'Certificates':   ['document','Medical certificates','Create and review medical certificates issued for this patient.'],
      'Follow-up':      ['calendar','Follow-up plan','Schedule a clinical review and view upcoming appointments.'],
    };
    var d=data[tab]||['document',tab,'No content available.'];
    tabContent='<div class=\"dcard empty-sec\">'+
      '<div class=\"empty-sec-ico\">'+_icon(d[0],28)+'</div>'+
      '<h2>'+d[1]+'</h2><p>'+d[2]+'</p>'+
      '<button class=\"dbtn dbtn-p\" onclick=\"\">'+_icon('plus',14)+' Add new</button>'+
    '</div>';
  }

  return _dTopbar('')+
    _dPatientStrip(sel)+
    '<div style=\"padding:0 28px;border-bottom:1px solid var(--line);background:#fbfcfb\">'+
      '<div style=\"display:flex;align-items:center;justify-content:space-between;padding:14px 0 0\">'+
        '<div>'+
          '<div style=\"font-size:9px;color:var(--muted);margin-bottom:4px;display:flex;align-items:center;gap:6px\">Consultations '+_icon('chevron',12)+' <strong style=\"color:var(--muted)\">New consultation</strong></div>'+
          '<h1 style=\"font-family:Manrope,sans-serif;font-size:22px;font-weight:700;margin:0\">New consultation</h1>'+
          '<p style=\"color:var(--muted);font-size:11px;margin:4px 0 12px\">Capture clinical notes, review records, and create care orders.</p>'+
        '</div>'+
        '<div style=\"display:flex;align-items:center;gap:9px\">'+
          '<span style=\"display:flex;align-items:center;gap:5px;color:var(--muted);font-size:10px\"><span style=\"width:6px;height:6px;border-radius:50%;background:#6fb69b;display:inline-block\"></span>Draft saved</span>'+
          '<button class=\"dbtn dbtn-s\">Save draft</button>'+
          '<button class=\"dbtn dbtn-p\">'+_icon('check',14)+' Complete consultation</button>'+
        '</div>'+
      '</div>'+
      '<div class=\"doc-tabs\">'+
        tabs.map(function(t){ return '<button class=\"doc-tab'+(t===tab?' is-active':'')+'\" onclick=\"_D.consultTab=\''+t+'\';_dRender()\">'+t+'</button>'; }).join('')+
      '</div>'+
    '</div>'+
    '<div class=\"doc-content\">'+tabContent+'</div>';
}

function _dConsultMain(pt){
  return '<div class=\"doc-consult-grid\">'+
    /* LEFT \— main form */
    '<div class=\"doc-consult-main\">'+
      /* Clinical notes card */
      '<div class=\"dcard dcard-p\">'+
        '<div class=\"dcard-hd\">'+
          '<div><span class=\"eyebrow\" style=\"display:block;margin-bottom:3px;color:#8a9692;font-size:8px;font-weight:700;letter-spacing:.11em\">TODAY \· '+new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})+'</span><h2>Clinical notes</h2></div>'+
          '<span style=\"padding:5px 9px;border-radius:20px;background:var(--sg);color:var(--green);font-size:9px;font-weight:700\">In-person visit</span>'+
        '</div>'+
        '<div class=\"dgrid2\">'+
          _dField('textarea','Presenting complaint','Persistent cough and mild shortness of breath for 5 days.')+
          _dField('textarea','History of presenting illness','Onset, duration, severity, associated symptoms...')+
          _dField('textarea','Examination findings','Document relevant clinical examination...')+
          _dField('textarea','Assessment & diagnosis','Suspected lower respiratory tract infection')+
        '</div>'+
        '<div class=\"diag-row\">'+
          '<div><span>Primary diagnosis</span><strong>J22 \· Acute lower respiratory infection, unspecified</strong></div>'+
          '<button class=\"dbtn-g\">'+_icon('plus',13)+' Add diagnosis</button>'+
        '</div>'+
      '</div>'+
      /* Vitals card */
      '<div class=\"dcard dcard-p\">'+
        '<div class=\"dcard-hd\">'+
          '<div><span style=\"display:block;margin-bottom:3px;color:#8a9692;font-size:8px;font-weight:700;letter-spacing:.11em\">RECORDED '+new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})+'</span><h2>Vitals</h2></div>'+
          '<button class=\"dbtn-g\">Edit vitals</button>'+
        '</div>'+
        '<div class=\"vitals-grid\">'+
          _dVital('Blood pressure','128/82','mmHg','activity')+
          _dVital('Heart rate','78','bpm','heart')+
          _dVital('Temperature','37.8','\\u00b0C','activity','warm')+
          _dVital('SpO\\u2082','96','%','activity')+
          _dVital('Weight','68.4','kg','user')+
        '</div>'+
      '</div>'+
      /* Plan card */
      '<div class=\"dcard dcard-p\">'+
        '<div class=\"dcard-hd\"><h2>Plan & follow-up</h2></div>'+
        _dField('textarea','Consultation notes / care plan','Add treatment plan, medication notes and advice given...')+
        '<div class=\"dgrid3\" style=\"margin-top:14px\">'+
          _dFieldSel('Follow-up',['In 7 days','In 14 days','In 1 month','As needed'])+
          _dField('date','Review date',new Date(Date.now()+7*864e5).toISOString().slice(0,10))+
          _dFieldSel('Follow-up type',['In person','Telephone','Virtual'])+
        '</div>'+
      '</div>'+
    '</div>'+
    /* RIGHT \— aside */
    '<div class=\"doc-consult-aside\">'+
      /* Clinical actions */
      '<div class=\"dcard\" style=\"padding:16px\">'+
        '<div class=\"dcard-hd\" style=\"margin-bottom:4px\"><h2>Clinical actions</h2></div>'+
        _dQAction('lab',     'aico-lab', 'flask',   'Request laboratory test',   'Create a new pathology order')+
        _dQAction('imaging', 'aico-img', 'image',   'Request imaging',            'X-ray, CT, MRI or ultrasound')+
        _dQAction('prescription','aico-rx','medicine','Create prescription',       'Prescribe and issue medication')+
        _dQAction(null,      'aico-doc', 'document','Medical certificate',         'Issue a digital certificate')+
      '</div>'+
      /* Patient summary */
      '<div class=\"dcard\" style=\"padding:16px\">'+
        '<div class=\"dcard-hd\"><h2>Patient summary</h2><button class=\"dbtn-g\">View all</button></div>'+
        '<div class=\"alert-row\"><span class=\"alert-ico\">!</span>'+
          '<div style=\"display:flex;flex-direction:column;gap:2px\"><span style=\"color:var(--muted);font-size:8px\">Allergies</span><strong style=\"color:var(--red);font-size:10px\">'+_e(pt.allergies||'None known')+'</strong></div>'+
        '</div>'+
        '<div class=\"summary-grp\"><span>Active medication</span><strong>'+_e(pt.medication||'\—')+'</strong><small>Once daily \· Active</small></div>'+
        '<div class=\"summary-grp\"><span>Chronic conditions</span><div style=\"display:flex;flex-wrap:wrap;gap:4px;margin-top:3px\">'+
          (pt.conditions&&pt.conditions.length ? pt.conditions.map(function(c){return '<span class=\"dtag\">'+_e(c)+'</span>';}).join('') : '<span style=\"font-size:10px;color:var(--muted)\">None recorded</span>')+
        '</div></div>'+
        '<div class=\"summary-grp\"><span>Last consultation</span><strong>'+_e(pt.lastConsult||'\—')+'</strong><small>Dr N. Maseko \· Routine review</small></div>'+
      '</div>'+
    '</div>'+
  '</div>';
}

function _dField(type,label,ph){
  if(type==='textarea') return '<div class=\"dfield\"><label>'+_e(label)+'</label><textarea placeholder=\"'+_e(ph||'')+'\">'+_e(ph||'')+'</textarea></div>';
  if(type==='date') return '<div class=\"dfield\"><label>'+_e(label)+'</label><input type=\"date\" value=\"'+_e(ph||'')+'\"></div>';
  return '<div class=\"dfield\"><label>'+_e(label)+'</label><input type=\"text\" placeholder=\"'+_e(ph||'')+'\" value=\"'+_e(ph||'')+'\"></div>';
}
function _dFieldSel(label,opts){
  return '<div class=\"dfield\"><label>'+_e(label)+'</label><select>'+opts.map(function(o){return '<option>'+_e(o)+'</option>';}).join('')+'</select></div>';
}
function _dVital(lbl,val,unit,icon,tone){
  return '<div class=\"dvital'+(tone?' dvital-'+tone:'')+'\">'+
    '<div class=\"dvital-ic\">'+_icon(icon,15)+'</div>'+
    '<div><span>'+_e(lbl)+'</span><strong>'+_e(val)+' <small style=\"color:var(--muted);font-size:8px\">'+_e(unit)+'</small></strong></div>'+
  '</div>';
}
function _dQAction(wf,icoClass,icon,title,sub){
  var click=wf?'onclick=\"_dOpenWorkflow(\''+wf+'\')\"':'';
  return '<button class=\"qaction-btn\" '+click+'>'+
    '<span class=\"aico '+icoClass+'\">'+_icon(icon,17)+'</span>'+
    '<span style=\"display:flex;flex:1;flex-direction:column;gap:2px\"><strong>'+_e(title)+'</strong><small>'+_e(sub)+'</small></span>'+
    _icon('chevron',15)+
  '</button>';
}

window._dPickConsultPt = function(mrn){
  _D.selectedPatient=_D.patients.find(function(p){return p.mrn===mrn;})||null;
  _D.consultTab='Consultation';
  _dRender();
};

/* \\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550
   PATIENT SEARCH
\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550 */
function _dPatientSearch(){
  function ptRows(list){
    return list.map(function(p){
      return '<tr onclick=\"_D.selectedPatient=_D.patients.find(function(q){return q.mrn===\''+p.mrn+'\';});_dSetView(\'consultation\')\">'+
        '<td><div style=\"font-weight:600\">'+_e(p.name)+'</div><div style=\"font-size:11px;color:var(--muted)\">'+_e(p.nationalId)+'</div></td>'+
        '<td style=\"font-family:monospace;font-size:11px;color:var(--muted)\">'+_e(p.mrn)+'</td>'+
        '<td style=\"color:var(--muted)\">'+p.age+'</td>'+
        '<td style=\"color:var(--muted)\">'+_e(p.gender)+'</td>'+
        '<td>'+
          (p.conditions.length
            ? p.conditions.map(function(c){return '<span class=\"dtag\">'+_e(c)+'</span> ';}).join('')
            : '<span style=\"color:var(--muted);font-size:11px\">\—</span>')+
        '</td>'+
        '<td style=\"color:var(--muted)\">'+_e(p.lastConsult)+'</td>'+
        '<td><button class=\"dbtn dbtn-s\" style=\"font-size:10px;padding:4px 10px;min-height:28px\" onclick=\"event.stopPropagation();_D.selectedPatient=_D.patients.find(function(q){return q.mrn===\''+p.mrn+'\';});_dSetView(\'consultation\')\">Open</button></td>'+
      '</tr>';
    }).join('');
  }
  return _dTopbar('')+
    '<div class=\"doc-content\">'+
      '<h1 style=\"font-family:Manrope,sans-serif;font-size:22px;font-weight:700;margin:0 0 16px\">Patients</h1>'+
      '<div style=\"position:relative;max-width:440px;margin-bottom:16px\">'+
        _icon('search',17)+
        '<input oninput=\"_dPtSearch(this.value)\" style=\"width:100%;height:40px;border:1px solid var(--line);border-radius:9px;background:#f8faf9;padding:0 12px 0 40px;outline:none;font-size:12px;font-family:inherit;color:var(--ink)\" placeholder=\"Search by name, SA ID or folder number...\">'+
      '</div>'+
      '<div class=\"dcard\" style=\"padding:0;overflow:hidden\">'+
        '<table class=\"dtbl\"><thead><tr>'+
          '<th>Patient</th><th>Folder no.</th><th>Age</th><th>Gender</th><th>Conditions</th><th>Last consultation</th><th></th>'+
        '</tr></thead>'+
        '<tbody id=\"doc-pt-body\">'+ptRows(_D.patients)+'</tbody></table>'+
      '</div>'+
    '</div>';
}

window._dPtSearch = function(q){
  var body=document.getElementById('doc-pt-body'); if(!body) return;
  var ql=q.toLowerCase();
  var list=_D.patients.filter(function(p){
    return !ql||p.name.toLowerCase().includes(ql)||(p.nationalId||'').includes(ql)||(p.mrn||'').toLowerCase().includes(ql);
  });
  body.innerHTML = list.length
    ? list.map(function(p){
        return '<tr onclick=\"_D.selectedPatient=_D.patients.find(function(q){return q.mrn===\''+p.mrn+'\';});_dSetView(\'consultation\')\">'+
          '<td><div style=\"font-weight:600\">'+_e(p.name)+'</div><div style=\"font-size:11px;color:var(--muted)\">'+_e(p.nationalId)+'</div></td>'+
          '<td style=\"font-family:monospace;font-size:11px;color:var(--muted)\">'+_e(p.mrn)+'</td>'+
          '<td style=\"color:var(--muted)\">'+p.age+'</td>'+
          '<td style=\"color:var(--muted)\">'+_e(p.gender)+'</td>'+
          '<td>'+
            (p.conditions.length?p.conditions.map(function(c){return '<span class=\"dtag\">'+_e(c)+'</span> ';}).join(''):'<span style=\"color:var(--muted);font-size:11px\">\—</span>')+
          '</td>'+
          '<td style=\"color:var(--muted)\">'+_e(p.lastConsult)+'</td>'+
          '<td><button class=\"dbtn dbtn-s\" style=\"font-size:10px;padding:4px 10px;min-height:28px\">Open</button></td>'+
        '</tr>';
      }).join('')
    : '<tr><td colspan=\"7\" style=\"text-align:center;padding:24px;color:var(--muted)\">No results for \"'+_e(q)+'\"</td></tr>';
};

/* \\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550
   TELEMEDICINE
\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550 */
function _dTelemedicine(){
  var active=_D.teleSessions.find(function(s){return s.status==='active';});
  return _dTopbar('')+
    '<div class=\"doc-content\">'+
      '<h1 style=\"font-family:Manrope,sans-serif;font-size:22px;font-weight:700;margin:0 0 18px\">Telemedicine</h1>'+
      '<div style=\"display:grid;grid-template-columns:1fr 330px;gap:16px\">'+
        '<div>'+
          '<div class=\"dcard dcard-p\">'+
            '<div class=\"dcard-hd\"><h2>Consultation room</h2></div>'+
            (active
              ? '<div style=\"width:100%;height:220px;background:#0f172a;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px\">'+_icon('video',24)+' Active \— '+_e(active.patient)+'</div>'
              : '<div style=\"padding:30px;background:var(--soft);border-radius:10px;border:1px dashed var(--line);text-align:center;color:var(--muted)\"><div style=\"font-size:36px;margin-bottom:8px;opacity:.4\">'+_icon('video',36)+'</div><div style=\"font-size:13px\">No active session. Join a scheduled call below.</div></div>'
            )+
          '</div>'+
        '</div>'+
        '<div>'+
          '<div class=\"dcard\" style=\"padding:16px;margin-bottom:14px\">'+
            '<div class=\"dcard-hd\"><h2>Upcoming sessions</h2></div>'+
            _D.teleSessions.map(function(s){
              return '<div style=\"display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--line);border-radius:10px;margin-bottom:8px\">'+
                '<div style=\"text-align:center;min-width:48px\"><div style=\"font-size:13px;font-weight:800;color:var(--green)\">'+_e(s.time)+'</div></div>'+
                '<div style=\"flex:1\">'+_dBadge(s.status)+'<div style=\"font-size:13px;font-weight:700;margin-top:4px\">'+_e(s.patient)+'</div>'+
                '<div style=\"font-size:11px;color:var(--muted)\">'+_e(s.reason)+'</div></div>'+
                (s.status==='ready'
                  ? '<button class=\"dbtn dbtn-p\" style=\"font-size:11px\" onclick=\"_dJoin(\''+s.patient+'\')\">Join call</button>'
                  : '<button class=\"dbtn dbtn-s\" style=\"font-size:11px\" disabled>Scheduled</button>')+
              '</div>';
            }).join('')+
          '</div>'+
          '<div class=\"dcard\" style=\"padding:16px\">'+
            '<div class=\"dcard-hd\"><h2>Connection check</h2></div>'+
            [['Network','Good \· 18 Mbps'],['Camera','Ready'],['Microphone','Ready']].map(function(r){
              return '<div style=\"display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #f1f5f9\">'+
                '<span style=\"width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block;flex-shrink:0\"></span>'+
                '<div style=\"font-size:13px;font-weight:600;width:110px\">'+r[0]+'</div>'+
                '<div style=\"font-size:12px;color:var(--muted)\">'+r[1]+'</div></div>';
            }).join('')+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>';
}

window._dJoin=function(pt){
  var room='nihms-'+(pt||'').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
  window.open('https://meet.jit.si/'+room,'_blank');
  var s=_D.teleSessions.find(function(x){return x.patient===pt;});
  if(s)s.status='active';

/* ─── Inject Figma dashboard CSS once ─────────────────── */
(function(){
  if (document.getElementById('nihms-dr-extras')) return;
  var s=document.createElement('style'); s.id='nihms-dr-extras';
  s.textContent='.dr-ph{padding-bottom:0}.dr-bc{display:flex;align-items:center;gap:7px;color:#8a9793;font-size:10px;margin-bottom:12px}.dr-bc strong{color:#53635e}.dr-pt-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.dr-ha{display:flex;align-items:center;gap:9px}.dr-draft{color:var(--muted);font-size:10px;display:flex;align-items:center;gap:6px;margin-right:5px}.dr-dd{width:6px;height:6px;border-radius:50%;background:#6fb69b;display:inline-block}.dr-tabs{height:45px;display:flex;gap:24px;border-bottom:1px solid #d9e0dd;margin-bottom:0}.dr-tab{position:relative;border:0;color:var(--muted);background:transparent;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;padding:0}.dr-tab-a{color:var(--green)}.dr-tab-a::after{content:"";position:absolute;height:2px;inset:auto 0 -1px;background:var(--green);border-radius:2px}.dr-cg{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:18px;margin-top:20px}.dr-cm{display:flex;flex-direction:column;gap:16px;min-width:0}.dr-ca{display:flex;flex-direction:column;gap:16px}.dfg{display:grid;gap:16px}.dfg2{grid-template-columns:repeat(2,minmax(0,1fr))}.dfg3{grid-template-columns:repeat(3,minmax(0,1fr))}.dr-f{display:flex;flex-direction:column;gap:6px}.dr-f label{color:#4c5f59;font-size:10px;font-weight:600}.dr-f input,.dr-f select,.dr-f textarea{width:100%;color:#263a34;background:#fbfcfb;border:1px solid #dde5e2;border-radius:7px;padding:10px 11px;outline:none;font-size:11px;font-family:inherit}.dr-f input,.dr-f select{height:39px}.dr-f textarea{min-height:78px;line-height:1.5}.dr-f input:focus,.dr-f select:focus,.dr-f textarea:focus{border-color:#71ae9a;box-shadow:0 0 0 3px #e9f5f1;background:#fff}.dchd{min-height:30px;margin-bottom:17px;display:flex;align-items:flex-start;justify-content:space-between}.deyebrow{display:block;margin-bottom:4px;color:#8a9692;font-size:8px;font-weight:700;letter-spacing:.11em;text-transform:uppercase}.doc-badge{padding:5px 9px;border-radius:20px;background:#eaf6f0;color:var(--green);font-size:9px;font-weight:700}.dr-dg{margin-top:15px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;background:#f5f8f6;border-radius:8px}.dr-dg div{display:flex;flex-direction:column;gap:4px}.dr-dg span{color:var(--muted);font-size:9px}.dr-dg strong{font-size:10px}.dr-vs{display:grid;grid-template-columns:repeat(5,1fr);gap:9px}.dr-vt{padding:11px;display:flex;align-items:center;gap:9px;border:1px solid var(--line);border-radius:8px}.dr-vt-ic{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;color:var(--green);background:#eaf6f0;flex-shrink:0}.dr-vt-ic svg{width:15px;height:15px}.dr-vt-txt span{color:var(--muted);font-size:8px;display:block}.dr-vt-txt strong{margin-top:3px;font-size:11px;display:block}.dr-vt-txt small{color:var(--muted);font-size:7px}.dr-vt-w .dr-vt-ic{color:#a6601a;background:#fff5e8}.dr-qab{width:100%;padding:11px 3px;border:0;border-top:1px solid #edf1ef;background:#fff;display:flex;align-items:center;gap:10px;color:var(--ink);text-align:left;cursor:pointer}.dr-qab:hover{background:#fafcfb}.dr-qai{width:34px;height:34px;display:grid;place-items:center;border-radius:8px;flex-shrink:0}.dr-qal{display:flex;flex:1;flex-direction:column;gap:2px}.dr-qal strong{font-size:10px}.dr-qal small{color:var(--muted);font-size:9px}.dr-alb{padding:11px;display:flex;gap:9px;align-items:center;background:#fff0ef;border:1px solid #f3d1cf;border-radius:8px}.dr-ali{width:25px;height:25px;flex-shrink:0;display:grid;place-items:center;border-radius:50%;color:#fff;background:#b4433f;font-size:11px;font-weight:700}.dr-alb div{display:flex;flex-direction:column;gap:2px}.dr-alb div span{color:var(--muted);font-size:8px}.dr-alb strong{color:#b4433f;font-size:10px;margin-top:2px}.dr-sg{display:flex;flex-direction:column;gap:3px;padding:13px 1px;border-bottom:1px solid #eef2f0}.dr-sg:last-child{border-bottom:0;padding-bottom:0}.dr-sg>span{color:var(--muted);font-size:8px}.dr-sg strong{font-size:10px}.dr-sg small{color:var(--muted);font-size:9px}.dr-tgs{display:flex;gap:5px;margin-top:3px;flex-wrap:wrap}.dr-tg{padding:4px 7px;color:var(--green);background:#eaf6f0;border-radius:4px;font-size:8px;font-style:normal}.dr-emp{min-height:420px;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:40px}.dr-ei{width:60px;height:60px;display:grid;place-items:center;color:var(--green);background:#eaf6f0;border-radius:18px;margin:0 auto 18px}.dr-emp p{color:var(--muted);font-size:11px;line-height:1.6;max-width:420px;margin:0 0 18px}@media(max-width:1100px){.dr-cg{grid-template-columns:1fr}.dr-vs{grid-template-columns:repeat(3,1fr)}}@media(max-width:820px){.dr-cg{grid-template-columns:1fr}.dfg2,.dfg3{grid-template-columns:1fr}.dr-vs{grid-template-columns:repeat(2,1fr)}}';
  document.head.appendChild(s);
})();

function _drWfOpen(type){ alert('Opening '+type+' workflow (TODO: connect to backend)'); }

}

/* ── Bridges ── */
window._doctorAddMessage = function(msg){
  if(window.UI && UI.showToast) UI.showToast('Message from ' + (msg.from||'Reception'), 'ok');
};
window._dcAddPatient = function(pt){
  var name=(pt.firstName||'')+' '+(pt.lastName||'');
  if(window._D) _D.queue.push(pt);
  if(window.UI && UI.showToast) UI.showToast('Patient added: '+name.trim(), 'ok');
};
