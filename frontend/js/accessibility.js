/**
 * js/accessibility.js — NIHMS Accessibility & i18n System v3.0
 * Clean rewrite — reliable language switching, SA voice, full page translation
 */
(function () {
'use strict';

/* ══════════════════════════════════════════════════════════════
   1. LANGUAGES
══════════════════════════════════════════════════════════════ */
var LANGUAGES = [
  { code:'en',  label:'English',   speech:'en-ZA' },
  { code:'zu',  label:'isiZulu',   speech:'zu-ZA' },
  { code:'nso', label:'Sepedi',    speech:'en-ZA' },
  { code:'af',  label:'Afrikaans', speech:'af-ZA' },
  { code:'ts',  label:'Xitsonga',  speech:'en-ZA' },
  { code:'ve',  label:'Tshivenda', speech:'en-ZA' },
];

/* ══════════════════════════════════════════════════════════════
   2. FULL TRANSLATION DICTIONARY
══════════════════════════════════════════════════════════════ */
var DICT = {
en: {
  /* Panel */
  accessibility:'Accessibility', accessibilitySettings:'Accessibility settings',
  language:'Language', textSize:'Text size', highContrast:'High contrast',
  simpleMode:'Simple mode', readAloud:'Read aloud', visualAlerts:'Flash visual alerts',
  speakPage:'Read this page aloud', stopSpeaking:'Stop reading',
  voiceOn:'Start voice commands', voiceOff:'Stop voice commands',
  voiceHint:'Say: read, home, appointments, records, medications, back, help, bigger, smaller, contrast.',
  voiceUnsupported:'Voice commands are not supported in this browser. Please use Chrome or Edge.',
  close:'Close',
  /* Login */
  welcome:'Welcome back', signInSub:'Sign in to your NIHMS account',
  emailLabel:'Email address or ID number', passwordLabel:'Password',
  passwordPlaceholder:'Enter your password', signIn:'Sign in',
  /* Nav labels — must match router.js label values exactly */
  'Home':'Home','Appointments':'Appointments','My Records':'My Records',
  'My records':'My records','Medications':'Medications','Billing':'Billing',
  'My Profile':'My Profile','Check In':'Check In','Book Appointment':'Book Appointment',
  'Book appointment':'Book appointment','AI Assistant':'AI Assistant',
  'Sign out':'Sign out','Patient queue':'Patient queue','Consultation':'Consultation',
  'Patient search':'Patient search','Lab orders':'Lab orders',
  'Telemedicine':'Telemedicine','Overview':'Overview','Stock management':'Stock management',
  'Prescription validation':'Prescription validation','Dispensing & labels':'Dispensing & labels',
  'Pharmacy queue':'Pharmacy queue','Medication history':'Medication history',
  'Suppliers & orders':'Suppliers & orders','Controlled register':'Controlled register',
  'Refill reminders':'Refill reminders','Analytics':'Analytics',
  /* Common page content */
  'Good morning':'Good morning','Good afternoon':'Good afternoon','Good evening':'Good evening',
  'Book now':'Book now','No upcoming appointments':'No upcoming appointments',
  'Next appointment':'Next appointment','Active conditions':'Active conditions',
  'Current medications':'Current medications','Recent visits':'Recent visits',
  'Your queue ticket':'Your queue ticket','Loading...':'Loading...',
  'Save notes':'Save notes','Send to pharmacy':'Send to pharmacy',
  'Confirm booking':'Confirm booking','Cancel':'Cancel','Back':'Back',
  'Confirm':'Confirm','Save':'Save','Edit':'Edit','Search':'Search',
  /* Toasts */
  toastOk:'Done', toastErr:'Error', toastWarn:'Warning',
  goodMorning:'Good morning', goodAfternoon:'Good afternoon', goodEvening:'Good evening',
},

zu: {
  accessibility:'Ukufinyeleleka', accessibilitySettings:'Izilungiselelo zokufinyeleleka',
  language:'Ulimi', textSize:'Usayizi wombhalo', highContrast:'Umehluko omkhulu wemibala',
  simpleMode:'Imodi elula', readAloud:'Funda ngokuzwakalayo',
  visualAlerts:'Izaziso ezibonakalayo', speakPage:'Funda ikhasi ngokuzwakalayo',
  stopSpeaking:'Yeka ukufunda', voiceOn:'Qala imiyalo yezwi', voiceOff:'Misa imiyalo yezwi',
  voiceHint:'Sho: funda, ekhaya, amihlangano, amarekhodi, imithi, emuva, usizo, okukhulu, okuncane, mehluko.',
  voiceUnsupported:'Imiyalo yezwi ayisebenzi. Sebenzisa i-Chrome noma i-Edge.',
  close:'Vala',
  welcome:'Siyakwamukela futhi', signInSub:'Ngena ku-akhawunti yakho ye-NIHMS',
  emailLabel:'Ikheli le-imeyili noma inombolo yesazisi', passwordLabel:'Iphasiwedi',
  passwordPlaceholder:'Faka iphasiwedi yakho', signIn:'Ngena',
  'Home':'Ikhaya','Appointments':'Amihlangano','My Records':'Amarekhodi ami',
  'My records':'Amarekhodi ami','Medications':'Imithi','Billing':'Inkokhelo',
  'My Profile':'Iphrofayili yami','Check In':'Ngena lapha',
  'Book Appointment':'Bhuka umhlangano','Book appointment':'Bhuka umhlangano',
  'AI Assistant':'Umsizi we-AI','Sign out':'Phuma',
  'Patient queue':'Umugqa weziguli','Consultation':'Ukuxoxisana',
  'Patient search':'Sesha isiguli','Lab orders':'Izidingo zelabu',
  'Telemedicine':'Ithelemedisini','Overview':'Ukubuka konke',
  'Good morning':'Sawubona ekuseni','Good afternoon':'Sawubona emini',
  'Good evening':'Sawubona kusihlwa','Book now':'Bhuka manje',
  'No upcoming appointments':'Awekho amihlangano akhona',
  'Next appointment':'Umhlangano olandelayo','Save notes':'Londoloza amanothi',
  'Send to pharmacy':'Thumela ephamilani','Cancel':'Khansela','Back':'Emuva',
  'Confirm':'Qinisekisa','Save':'Londoloza','Search':'Sesha',
  toastOk:'Kuqedwe', toastErr:'Iphutha', toastWarn:'Isexwayiso',
  goodMorning:'Sawubona ekuseni', goodAfternoon:'Sawubona emini', goodEvening:'Sawubona kusihlwa',
},

nso: {
  accessibility:'Phihlelelego', accessibilitySettings:'Dipeakanyo tša phihlelelego',
  language:'Leleme', textSize:'Bogolo bja mongwalo', highContrast:'Phapang ye kgolo ya mmala',
  simpleMode:'Mokgwa wo bonolo', readAloud:'Bala ka lentšu le legolo',
  visualAlerts:'Dihlaagiši tša go bona', speakPage:'Bala letlakala le ka lentšu',
  stopSpeaking:'Emisa go bala', voiceOn:'Thoma ditaelo tša lentšu', voiceOff:'Emisa ditaelo tša lentšu',
  voiceHint:'Re: bala, gae, dikgobokano, direkoto, dihlare, morago, thušo, ye kgolo, ye nnyane, phapang.',
  voiceUnsupported:'Ditaelo tša lentšu ga di thušwe. Diriša Chrome goba Edge.',
  close:'Tswalela',
  welcome:'Re a go amogela gape', signInSub:'Tsena ka akhaontong ya gago ya NIHMS',
  emailLabel:'Aterese ya imeile goba nambara ya boitsebišo', passwordLabel:'Phasewete',
  passwordPlaceholder:'Tsenya phasewete ya gago', signIn:'Tsena',
  'Home':'Gae','Appointments':'Dikgobokano','My Records':'Direkoto tšaka',
  'My records':'Direkoto tšaka','Medications':'Dihlare','Billing':'Tefelo',
  'My Profile':'Profaele ya ka','Check In':'Ngwadiša',
  'Book Appointment':'Hloma kgobokano','Book appointment':'Hloma kgobokano',
  'AI Assistant':'Motšeakarata wa AI','Sign out':'Tswa',
  'Good morning':'Dumela ka masa','Good afternoon':'Dumela mosegare',
  'Good evening':'Dumela mantšiboa','Book now':'Hloma bjale',
  'No upcoming appointments':'Ga gona dikgobokano tše di tlago',
  'Next appointment':'Kgobokano ye e latelago','Cancel':'Khansela','Back':'Morago',
  'Confirm':'Tiišetša','Save':'Boloka','Search':'Nyaka',
  toastOk:'Ga o fedile', toastErr:'Phošo', toastWarn:'Temošo',
  goodMorning:'Dumela ka masa', goodAfternoon:'Dumela mosegare', goodEvening:'Dumela mantšiboa',
},

af: {
  accessibility:'Toeganklikheid', accessibilitySettings:'Toeganklikheidsinstellings',
  language:'Taal', textSize:'Teksgrootte', highContrast:'Hoë kontras',
  simpleMode:'Eenvoudige modus', readAloud:'Lees hardop',
  visualAlerts:'Flits visuele waarskuwings', speakPage:'Lees hierdie bladsy hardop',
  stopSpeaking:'Stop lees', voiceOn:'Begin spraakopdragte', voiceOff:'Stop spraakopdragte',
  voiceHint:'Sê: lees, tuis, afsprake, rekords, medikasie, terug, hulp, groter, kleiner, kontras.',
  voiceUnsupported:'Spraakopdragte word nie ondersteun nie. Gebruik Chrome of Edge.',
  close:'Sluit',
  welcome:'Welkom terug', signInSub:'Meld aan by jou NIHMS-rekening',
  emailLabel:'E-posadres of ID-nommer', passwordLabel:'Wagwoord',
  passwordPlaceholder:'Voer jou wagwoord in', signIn:'Meld aan',
  'Home':'Tuis','Appointments':'Afsprake','My Records':'My rekords',
  'My records':'My rekords','Medications':'Medikasie','Billing':'Rekening',
  'My Profile':'My profiel','Check In':'Aanmeld',
  'Book Appointment':'Besprekings','Book appointment':'Besprekings',
  'AI Assistant':'KI-assistent','Sign out':'Afmeld',
  'Patient queue':'Pasiëntwaarry','Consultation':'Konsultasie',
  'Good morning':'Goeie môre','Good afternoon':'Goeie middag',
  'Good evening':'Goeie naand','Book now':'Bespreek nou',
  'No upcoming appointments':'Geen komende afsprake nie',
  'Next appointment':'Volgende afspraak','Save notes':'Stoor notas',
  'Send to pharmacy':'Stuur na apteek','Cancel':'Kanselleer','Back':'Terug',
  'Confirm':'Bevestig','Save':'Stoor','Search':'Soek',
  toastOk:'Klaar', toastErr:'Fout', toastWarn:'Waarskuwing',
  goodMorning:'Goeie môre', goodAfternoon:'Goeie middag', goodEvening:'Goeie naand',
},

ts: {
  accessibility:'Ku fikelela', accessibilitySettings:'Swipimanyeto swa ku fikelela',
  language:'Ririmi', textSize:'Ntalo wa mavito', highContrast:'Ku hambana ka le hombe ka mintirho ya mabala',
  simpleMode:'Xiyenge xa le hombe', readAloud:'Hlaya hi rito',
  visualAlerts:'Swicheriwa swa ku vona', speakPage:'Hlaya pheji leyi hi rito',
  stopSpeaking:'Yima ku hlaya', voiceOn:'Sungula swileriso swa rito', voiceOff:'Yima swileriso swa rito',
  voiceHint:'Ku: hlaya, kaya, swikolo, swirekodo, mihloti, endzhaku, pfuneta, le hombe, le titsongo, hambana.',
  voiceUnsupported:'Swileriso swa rito swi nga sebenzi. Tirhisa Chrome kumbe Edge.',
  close:'Pfala',
  welcome:'Wa amukeriwa nakambe', signInSub:'Nghena eka akhauntu ya wena ya NIHMS',
  emailLabel:'Adiresi ya imeyili kumbe nomboro ya vukari', passwordLabel:'Phasiwedi',
  passwordPlaceholder:'Nghenisa phasiwedi ya wena', signIn:'Nghena',
  'Home':'Kaya','Appointments':'Swikolo','My Records':'Swirekodo swa mina',
  'My records':'Swirekodo swa mina','Medications':'Mihloti','Billing':'Ku hakela',
  'My Profile':'Xiprofile xa mina','Check In':'Tsarisa',
  'Book Appointment':'Hlanganisa nhlengeletano','Book appointment':'Hlanganisa nhlengeletano',
  'AI Assistant':'Mutirheli wa AI','Sign out':'Huma',
  'Good morning':'Avuxeni bya kahle','Good afternoon':'Ndhavuku ya kahle',
  'Good evening':'Xivondzo xa kahle','Book now':'Hlanganisa sweswi',
  'No upcoming appointments':'Ku hava swikolo leswi landzelaka',
  'Next appointment':'Nhlengeletano wo landza','Cancel':'Hetisa','Back':'Endzhaku',
  'Confirm':'Pfumela','Save':'Hlayisa','Search':'Lava',
  toastOk:'Ku hetile', toastErr:'Xiphuphu', toastWarn:'Xileriso',
  goodMorning:'Avuxeni bya kahle', goodAfternoon:'Ndhavuku ya kahle', goodEvening:'Xivondzo xa kahle',
},

ve: {
  accessibility:'U wanala', accessibilitySettings:'Zwishumiswa zwa u wanala',
  language:'Luambo', textSize:'Bogalo bwa manwalo', highContrast:'Phambano khulwane ya mavhala',
  simpleMode:'Nzila i nyamulaho', readAloud:'Vhala nga ndivho',
  visualAlerts:'Maipfi a u vhona', speakPage:'Vhala peji ino nga ndivho',
  stopSpeaking:'Misa u vhala', voiceOn:'Thoma maipfi a ndivho', voiceOff:'Misa maipfi a ndivho',
  voiceHint:'Ri: vhala, hayani, misangano, mirekhodo, mirado, tshidima, thuso, khulwane, tshituku, phambano.',
  voiceUnsupported:'Maipfi a ndivho a songo thomiwa. Shumisa Chrome kana Edge.',
  close:'Vhara',
  welcome:'Ro ni amukela hafhu', signInSub:'Dzhena kha akhauntu yau ya NIHMS',
  emailLabel:'Aadresi ya imeyili kana nomboro ya vhuhosi', passwordLabel:'Phasiwede',
  passwordPlaceholder:'Dzhena phasiwede yau', signIn:'Dzhena',
  'Home':'Hayani','Appointments':'Misangano','My Records':'Mirekhodo yanga',
  'My records':'Mirekhodo yanga','Medications':'Mirado','Billing':'Tshikovhe',
  'My Profile':'Phrofaele yanga','Check In':'Ngwalisa',
  'Book Appointment':'Lavhelesa musango','Book appointment':'Lavhelesa musango',
  'AI Assistant':'Mushumisi wa AI','Sign out':'Bva',
  'Good morning':'Mangwanani a fanaho','Good afternoon':'Masiari a fanaho',
  'Good evening':'Madekwana a fanaho','Book now':'Lavhelesa zwino',
  'No upcoming appointments':'Huna misangano i tevhelaho',
  'Next appointment':'Musango u tevhelaho','Cancel':'Khansela','Back':'Tshidima',
  'Confirm':'Khwaṱhisa','Save':'Vhulunga','Search':'Toda',
  toastOk:'Zwo fhedzwa', toastErr:'Phoso', toastWarn:'Yambiso',
  goodMorning:'Mangwanani a fanaho', goodAfternoon:'Masiari a fanaho', goodEvening:'Madekwana a fanaho',
},
};

/* ══════════════════════════════════════════════════════════════
   3. VOICE COMMANDS PER LANGUAGE
══════════════════════════════════════════════════════════════ */
var VOICE_CMDS = {
  en:  {read:['read'],home:['home'],appointments:['appointment'],records:['records'],
         medications:['medication'],back:['back'],help:['help'],contrast:['contrast'],
         bigger:['bigger'],smaller:['smaller'],checkin:['check in'],signout:['sign out']},
  zu:  {read:['funda'],home:['ekhaya'],appointments:['amihlangano'],records:['amarekhodi'],
         medications:['imithi'],back:['emuva'],help:['usizo'],contrast:['mehluko'],
         bigger:['okukhulu'],smaller:['okuncane'],checkin:['ngena'],signout:['phuma']},
  nso: {read:['bala'],home:['gae'],appointments:['dikgobokano'],records:['direkoto'],
         medications:['dihlare'],back:['morago'],help:['thušo'],contrast:['phapang'],
         bigger:['ye kgolo'],smaller:['ye nnyane'],checkin:['ngwadiša'],signout:['tswa']},
  af:  {read:['lees'],home:['tuis'],appointments:['afsprake'],records:['rekords'],
         medications:['medikasie'],back:['terug'],help:['hulp'],contrast:['kontras'],
         bigger:['groter'],smaller:['kleiner'],checkin:['aanmeld'],signout:['afmeld']},
  ts:  {read:['hlaya'],home:['kaya'],appointments:['swikolo'],records:['swirekodo'],
         medications:['mihloti'],back:['endzhaku'],help:['pfuneta'],contrast:['hambana'],
         bigger:['le hombe'],smaller:['le titsongo'],checkin:['tsarisa'],signout:['huma']},
  ve:  {read:['vhala'],home:['hayani'],appointments:['misangano'],records:['mirekhodo'],
         medications:['mirado'],back:['tshidima'],help:['thuso'],contrast:['phambano'],
         bigger:['khulwane'],smaller:['tshituku'],checkin:['ngwalisa'],signout:['bva']},
};

/* ══════════════════════════════════════════════════════════════
   4. STATE
══════════════════════════════════════════════════════════════ */
var STORAGE_KEY = 'nihms.accessibility';
var DEFAULTS = { language:'en', fontScale:1, highContrast:false, simpleMode:false, speech:false, visualAlerts:true };
var A11Y = Object.assign({}, DEFAULTS);

function t(key) {
  var d = DICT[A11Y.language] || DICT.en;
  return d[key] || DICT.en[key] || key;
}
window.NIHMS_T    = function(key) { return t(key); };
window.NIHMS_LANG = function()    { return A11Y.language; };

function loadSettings() {
  try { var r=localStorage.getItem(STORAGE_KEY); if(r) A11Y=Object.assign({},DEFAULTS,JSON.parse(r)); } catch(_){}
}
function saveSettings() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(A11Y)); } catch(_){}
}

/* ══════════════════════════════════════════════════════════════
   5. APPLY SETTINGS — language, contrast, font, re-render page
══════════════════════════════════════════════════════════════ */
function applySettings() {
  document.documentElement.lang = A11Y.language;
  document.documentElement.classList.toggle('hc', A11Y.highContrast);
  document.documentElement.classList.toggle('simple', A11Y.simpleMode);
  document.documentElement.style.setProperty('--font-scale', String(A11Y.fontScale));
  saveSettings();
  _voiceCache = {};

  /* Re-render current NIHMS page in the new language */
  if (window.Router && window.Router.current && window.Router.current.page) {
    var page = window.Router.current.page;
    var role = window.Router.current.role;
    if (window.UI) {
      if (window.UI.renderSidebar) window.UI.renderSidebar(role, page);
      if (window.UI.renderContent) window.UI.renderContent(page);
    }
  }

  translateDOM();
  renderFloatingButtons();
  if (_panelOpen) renderPanel();
}

function set(key, val) { A11Y[key] = val; applySettings(); }

/* ══════════════════════════════════════════════════════════════
   6. DOM TRANSLATION — translates every text node in the page
══════════════════════════════════════════════════════════════ */
function translateDOM() {
  /* data-i18n attributes */
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var v = t(el.getAttribute('data-i18n')); if(v) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(function(el) {
    var v = t(el.getAttribute('data-i18n-ph')); if(v) el.placeholder = v;
  });

  /* Login page */
  var heading = document.querySelector('.auth-heading');
  if (heading) heading.textContent = t('welcome');
  var sub = document.querySelector('.auth-sub');
  if (sub) sub.textContent = t('signInSub');
  var emailInp = document.getElementById('login-email');
  if (emailInp) emailInp.placeholder = t('emailLabel');
  var pwdInp = document.getElementById('login-password');
  if (pwdInp) pwdInp.placeholder = t('passwordPlaceholder');
  var signBtn = document.getElementById('login-btn');
  if (signBtn && signBtn.querySelector('span')) signBtn.querySelector('span').textContent = t('signIn');

  /* Sidebar nav items — text node right after the <i> icon */
  document.querySelectorAll('#sidebar .nav-item').forEach(function(item) {
    /* Get all child nodes, find the text node (not the icon) */
    item.childNodes.forEach(function(node) {
      if (node.nodeType === 3) { /* TEXT_NODE */
        var original = node.nodeValue.trim();
        if (original.length > 1) {
          var translated = t(original);
          if (translated !== original) node.nodeValue = translated;
        }
      }
    });
  });

  /* Nav section labels */
  document.querySelectorAll('#sidebar .nav-section').forEach(function(el) {
    var orig = el.textContent.trim();
    var tr   = t(orig);
    if (tr !== orig) el.textContent = tr;
  });

  /* Content area — translate text nodes matching known strings */
  var content = document.getElementById('content');
  if (content) translateTextNodes(content);

  /* Floating button labels */
  var readSpan = document.querySelector('#a11y-read-btn span');
  if (readSpan) readSpan.textContent = t('readAloud');
  var openSpan = document.querySelector('#a11y-open-btn span');
  if (openSpan) openSpan.textContent = t('accessibility');
}

function translateTextNodes(root) {
  /* Walk all text nodes and translate known strings */
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: function(node) {
      /* Skip script/style content */
      var p = node.parentElement && node.parentElement.tagName;
      if (p === 'SCRIPT' || p === 'STYLE' || p === 'INPUT' || p === 'TEXTAREA') {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  }, false);

  var nodes = [];
  var n;
  while ((n = walker.nextNode())) nodes.push(n);

  nodes.forEach(function(node) {
    var text = node.nodeValue && node.nodeValue.trim();
    if (!text || text.length < 2) return;
    /* Only translate strings that exist as exact keys in DICT */
    var translated = t(text);
    if (translated && translated !== text) {
      node.nodeValue = node.nodeValue.replace(text, translated);
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   7. VOICE SYNTHESIS — SA accent
══════════════════════════════════════════════════════════════ */
var _voiceCache = {};

function getSpeechLang() {
  var l = LANGUAGES.find(function(l){ return l.code === A11Y.language; });
  return l ? l.speech : 'en-ZA';
}

function getBestVoice(targetLang) {
  if (_voiceCache[targetLang]) return _voiceCache[targetLang];
  var voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  /* SA voice name fragments — prefer these for natural SA accent */
  var saNames = ['zira','hazel','susan','south afric','en-za','af-za','zu-za',
                 'afrikaans','google south'];

  /* 1. Exact locale match */
  var best = voices.find(function(v){ return v.lang.toLowerCase() === targetLang.toLowerCase(); });
  /* 2. Any SA-accented voice */
  if (!best) best = voices.find(function(v){
    var n = (v.name + ' ' + v.lang).toLowerCase();
    return saNames.some(function(s){ return n.includes(s); });
  });
  /* 3. Same language, any region */
  if (!best) best = voices.find(function(v){
    return v.lang.toLowerCase().startsWith(targetLang.split('-')[0].toLowerCase());
  });
  /* 4. Any English */
  if (!best) best = voices.find(function(v){ return v.lang.startsWith('en'); });
  /* 5. Whatever is available */
  if (!best) best = voices[0];

  _voiceCache[targetLang] = best;
  return best;
}

function speak(text) {
  if (!('speechSynthesis' in window) || !text) return;
  var clean = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[•·▸►\-–—]/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 2500);
  if (!clean) return;

  window.speechSynthesis.cancel();

  var voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    window.speechSynthesis.onvoiceschanged = function() { _voiceCache={}; speak(text); };
    return;
  }

  var lang  = getSpeechLang();
  var voice = getBestVoice(lang);

  /* Split into sentence chunks for natural pacing */
  var chunks = clean.match(/[^.!?:]+[.!?:]*/g) || [clean];
  var queue = chunks.filter(function(c){ return c.trim().length > 0; });

  queue.forEach(function(chunk, i) {
    var utt   = new SpeechSynthesisUtterance(chunk.trim());
    utt.lang  = lang;
    utt.rate  = A11Y.simpleMode ? 0.80 : 0.90;
    utt.pitch = 1.05;
    utt.volume = 1;
    if (voice) utt.voice = voice;
    window.speechSynthesis.speak(utt);
  });
}

function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function readCurrentPage() {
  /* Read the page title then the main content */
  var h = document.querySelector('#content .page-title, #content h1');
  var body = document.getElementById('content');
  var title = h ? h.innerText : '';
  var content = body ? body.innerText : document.body.innerText;
  var fullText = title
    ? title + '. ' + content.replace(title, '').trim()
    : content;
  speak(fullText.slice(0, 2500));
}

/* ══════════════════════════════════════════════════════════════
   8. FLASH ALERT
══════════════════════════════════════════════════════════════ */
var _flashTimer = null;
function flashAlert() {
  if (!A11Y.visualAlerts) return;
  var el = document.getElementById('a11y-flash');
  if (!el) return;
  el.style.display = 'block';
  clearTimeout(_flashTimer);
  _flashTimer = setTimeout(function(){ el.style.display='none'; }, 1600);
}

/* ══════════════════════════════════════════════════════════════
   9. TOAST HOOK — speak notifications
══════════════════════════════════════════════════════════════ */
function hookUI() {
  var UI = window.UI;
  if (!UI) return;

  /* Speak toasts */
  if (UI.showToast && !UI._a11yToastHooked) {
    var orig = UI.showToast.bind(UI);
    UI.showToast = function(msg, type) {
      orig(msg, type);
      if (A11Y.speech) {
        var prefix = type==='err' ? t('toastErr')+'. ' : type==='warn' ? t('toastWarn')+'. ' : '';
        speak(prefix + msg);
        flashAlert();
      }
    };
    UI._a11yToastHooked = true;
  }

  /* Translate after every renderContent call */
  if (UI.renderContent && !UI._a11yContentHooked) {
    var origContent = UI.renderContent.bind(UI);
    UI.renderContent = function(pageId) {
      origContent(pageId);
      setTimeout(function() {
        translateDOM();
        if (A11Y.speech) {
          var h = document.querySelector('#content .page-title, #content h1');
          if (h) speak(h.innerText);
        }
      }, 200);
    };
    UI._a11yContentHooked = true;
  }

  /* Translate after every renderSidebar call */
  if (UI.renderSidebar && !UI._a11ySidebarHooked) {
    var origSidebar = UI.renderSidebar.bind(UI);
    UI.renderSidebar = function(role, page) {
      origSidebar(role, page);
      setTimeout(translateDOM, 100);
    };
    UI._a11ySidebarHooked = true;
  }
}

/* ══════════════════════════════════════════════════════════════
   10. VOICE COMMANDS
══════════════════════════════════════════════════════════════ */
var _recognition = null;
var _listening   = false;
var _voiceError  = '';

function matchCmd(said, keywords) {
  return keywords.some(function(k){ return said.includes(k.toLowerCase()); });
}

function handleVoice(transcript) {
  var said = transcript.toLowerCase().trim();
  var cmds = VOICE_CMDS[A11Y.language] || VOICE_CMDS.en;

  if (matchCmd(said, cmds.read))         { readCurrentPage(); return; }
  if (matchCmd(said, cmds.home))         { speak(t('Home')); if(window.Router) Router.setPage('myhealth'); return; }
  if (matchCmd(said, cmds.appointments)) { speak(t('Appointments')); if(window.Router) Router.setPage('appointments'); return; }
  if (matchCmd(said, cmds.records))      { speak(t('My Records')); if(window.Router) Router.setPage('myrecords'); return; }
  if (matchCmd(said, cmds.medications))  { speak(t('Medications')); if(window.Router){ Router.setPage('myrecords'); setTimeout(function(){ if(window._mrTab) _mrTab(3); },400); } return; }
  if (matchCmd(said, cmds.checkin))      { speak(t('Check In')); if(window.Router) Router.setPage('checkin'); return; }
  if (matchCmd(said, cmds.signout))      { speak(t('Sign out')); if(window.doLogout) doLogout(); return; }
  if (matchCmd(said, cmds.back))         { window.history.back(); speak(t('Back')); return; }
  if (matchCmd(said, cmds.contrast))     { set('highContrast', !A11Y.highContrast); speak(t('highContrast')+': '+(A11Y.highContrast?'on':'off')); return; }
  if (matchCmd(said, cmds.bigger))       { set('fontScale', Math.min(1.6, Math.round((A11Y.fontScale+0.1)*10)/10)); speak(t('textSize')+' '+Math.round(A11Y.fontScale*100)+'%'); return; }
  if (matchCmd(said, cmds.smaller))      { set('fontScale', Math.max(0.9, Math.round((A11Y.fontScale-0.1)*10)/10)); speak(t('textSize')+' '+Math.round(A11Y.fontScale*100)+'%'); return; }
  if (matchCmd(said, cmds.help))         { speak(DICT[A11Y.language].voiceHint||DICT.en.voiceHint); return; }
}

function toggleVoice() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { _voiceError=t('voiceUnsupported'); renderPanel(); return; }
  if (_listening) {
    _recognition && _recognition.stop();
    _listening = false; speak(t('voiceOff')); renderPanel(); return;
  }
  _recognition = new SR();
  _recognition.continuous     = true;
  _recognition.interimResults = false;
  _recognition.lang           = getSpeechLang();
  _recognition.onresult = function(e) {
    var last = e.results[e.results.length-1];
    if (last.isFinal) handleVoice(last[0].transcript);
  };
  _recognition.onerror = function(){ _listening=false; renderPanel(); };
  _recognition.onend   = function(){ if(_listening){ try{ _recognition.start(); }catch(_){} } };
  try { _recognition.start(); _listening=true; speak(t('voiceOn')); renderPanel(); }
  catch(e){ _voiceError=t('voiceUnsupported'); renderPanel(); }
}

/* ══════════════════════════════════════════════════════════════
   11. PANEL
══════════════════════════════════════════════════════════════ */
var _panelOpen = false;
var _panelLoginMode = false; /* true on login page — shows language only */

function renderFloatingButtons() {
  var r = document.getElementById('a11y-read-btn');
  if (r) { r.setAttribute('aria-label',t('speakPage')); var s=r.querySelector('span'); if(s) s.textContent=t('readAloud'); }
  var o = document.getElementById('a11y-open-btn');
  if (o) { o.setAttribute('aria-label',t('accessibilitySettings')); var s2=o.querySelector('span'); if(s2) s2.textContent=t('accessibility'); }
}

function renderPanel() {
  var panel = document.getElementById('a11y-panel');
  if (!panel) return;
  if (!_panelOpen) { panel.style.display='none'; return; }
  panel.style.display='flex';
  /* Login page: show language-only compact panel */
  if (_panelLoginMode) {
    panel.innerHTML =
      '<div role="dialog" aria-modal="true" style="background:#fff;border-radius:18px;width:100%;max-width:360px;padding:24px;box-shadow:0 24px 72px rgba(0,0,0,.28)">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
          '<h2 style="font-size:16px;font-weight:700;margin:0">'+t('language')+'</h2>' +
          '<button onclick="window._a11yClose()" style="width:32px;height:32px;border-radius:50%;border:1.5px solid #ddd;background:transparent;cursor:pointer;font-size:16px">✕</button>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">' +
        LANGUAGES.map(function(lang) {
          var a = A11Y.language === lang.code;
          return '<button onclick="window._a11ySet(&quot;language&quot;,&quot;'+lang.code+'&quot;)" style="padding:10px 8px;border-radius:10px;border:2px solid '+(a?'#0F6E56':'#e5e5e5')+';background:'+(a?'#0F6E56':'#fff')+';color:'+(a?'#fff':'#333')+';font-size:12px;font-weight:'+(a?'700':'500')+';cursor:pointer;font-family:inherit">'+lang.label+'</button>';
        }).join('') +
        '</div>' +
        '<p style="font-size:11px;color:#888;margin-top:14px;text-align:center">Select your preferred language · Khetha ulimi lwakho</p>' +
      '</div>';
    return;
  }

  panel.innerHTML =
    '<div role="dialog" aria-modal="true" style="background:#fff;border-radius:18px;width:100%;max-width:420px;max-height:92vh;overflow-y:auto;padding:24px;box-shadow:0 24px 72px rgba(0,0,0,.28)">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">' +
        '<h2 style="font-size:17px;font-weight:700;margin:0">'+t('accessibilitySettings')+'</h2>' +
        '<button onclick="window._a11yClose()" style="width:36px;height:36px;border-radius:50%;border:1.5px solid #ddd;background:transparent;cursor:pointer;font-size:18px">✕</button>' +
      '</div>' +
      /* Language */
      '<fieldset style="border:none;padding:0;margin:0 0 20px">' +
        '<legend style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:10px;display:block">'+t('language')+'</legend>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">' +
        LANGUAGES.map(function(lang) {
          var a = A11Y.language === lang.code;
          return '<button onclick="window._a11ySet(\'language\',\''+lang.code+'\')" style="padding:9px 8px;border-radius:10px;border:2px solid '+(a?'#0F6E56':'#e5e5e5')+';background:'+(a?'#0F6E56':'#fff')+';color:'+(a?'#fff':'#333')+';font-size:12px;font-weight:'+(a?'700':'500')+';cursor:pointer;font-family:inherit">'+lang.label+'</button>';
        }).join('') +
        '</div>' +
      '</fieldset>' +
      /* Font scale */
      '<div style="margin-bottom:20px">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
          '<label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888">'+t('textSize')+'</label>' +
          '<span style="font-size:14px;font-weight:700;color:#0F6E56">'+Math.round(A11Y.fontScale*100)+'%</span>' +
        '</div>' +
        '<input type="range" min="0.9" max="1.6" step="0.1" value="'+A11Y.fontScale+'" oninput="window._a11ySet(\'fontScale\',+this.value)" style="width:100%;accent-color:#0F6E56">' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;color:#bbb;margin-top:3px"><span>A</span><span style="font-size:16px;font-weight:700">A</span></div>' +
      '</div>' +
      /* Toggles */
      '<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">' +
      [['highContrast',t('highContrast'),'🎨'],['simpleMode',t('simpleMode'),'📖'],
       ['speech',t('readAloud'),'🔊'],['visualAlerts',t('visualAlerts'),'⚡']].map(function(row) {
        var on = A11Y[row[0]];
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:'+(on?'#F0FBF7':'#fafafa')+';border-radius:12px;border:1.5px solid '+(on?'#A8E6D0':'#eee')+'">' +
          '<div style="display:flex;align-items:center;gap:10px"><span style="font-size:18px">'+row[2]+'</span><label style="font-size:14px;font-weight:500;cursor:pointer">'+row[1]+'</label></div>' +
          '<button onclick="window._a11ySet(\''+row[0]+'\','+((!on))+') " style="width:52px;height:28px;border-radius:14px;border:none;background:'+(on?'#0F6E56':'#ddd')+';cursor:pointer;position:relative;transition:background .2s">' +
            '<span style="position:absolute;top:3px;left:'+(on?'26px':'3px')+';width:22px;height:22px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 4px rgba(0,0,0,.2)"></span>' +
          '</button>' +
        '</div>';
      }).join('') +
      '</div>' +
      /* Voice commands */
      '<div style="border:2px solid '+(_listening?'#0F6E56':'#eee')+';border-radius:14px;padding:14px;margin-bottom:12px;background:'+(_listening?'#F0FBF7':'#fff')+'">' +
        '<button onclick="window._a11yVoice()" style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:12px;border-radius:10px;border:none;background:'+(_listening?'#0F6E56':'#f0f0f0')+';color:'+(_listening?'#fff':'#333')+';font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">'+(_listening?'🎤 '+t('voiceOff'):'🎙️ '+t('voiceOn'))+'</button>' +
        '<p style="margin:10px 0 0;font-size:12px;color:#888;line-height:1.5">'+t('voiceHint')+'</p>' +
        (_voiceError?'<p style="margin:8px 0 0;font-size:12px;font-weight:600;color:#c00">'+_voiceError+'</p>':'') +
      '</div>' +
      '<button onclick="window._a11yStop()" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;border-radius:10px;border:2px solid #eee;background:#fff;color:#555;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">🔇 '+t('stopSpeaking')+'</button>' +
    '</div>';
}

/* ══════════════════════════════════════════════════════════════
   12. CSS
══════════════════════════════════════════════════════════════ */
function injectCSS() {
  var s = document.createElement('style');
  s.textContent = [
    ':root{--font-scale:1}',
    'body{font-size:calc(14px * var(--font-scale,1))}',
    '.auth-heading{font-size:calc(21px * var(--font-scale,1)) !important}',
    'input,select,button,textarea{font-size:calc(14px * var(--font-scale,1)) !important}',
    'html.hc{filter:contrast(1.5) saturate(0.8)}',
    'html.simple .auth-bg{display:none !important}',
    'html.simple .simple-hide{display:none !important}',
    '@keyframes a11yPulse{0%,100%{opacity:.6}50%{opacity:1}}',
    '#a11y-flash{display:none;position:fixed;inset:0;border:10px solid #FFB612;z-index:999999;pointer-events:none;animation:a11yPulse 1.6s ease-in-out}',
    '.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}',
    '#a11y-panel{display:none;position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.55);align-items:center;justify-content:center;padding:16px}',
    '#a11y-wrap{position:fixed;right:16px;bottom:16px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:8px}',
    '#a11y-read-btn{display:flex;align-items:center;gap:8px;padding:11px 18px;border-radius:50px;background:rgba(255,255,255,.96);border:2px solid #ddd;font-family:inherit;font-size:13px;font-weight:600;color:#111;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.18)}',
    '#a11y-open-btn{display:flex;align-items:center;gap:8px;padding:11px 20px;border-radius:50px;background:linear-gradient(135deg,#0F6E56,#1A4A9B);border:none;font-family:inherit;font-size:13px;font-weight:600;color:#fff;cursor:pointer;box-shadow:0 4px 18px rgba(15,110,86,.35)}',
  ].join('\n');
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════════════════════════
   13. DOM INJECTION
══════════════════════════════════════════════════════════════ */
function injectDOM() {
  var flash = document.createElement('div'); flash.id='a11y-flash'; document.body.appendChild(flash);
  var live  = document.createElement('div'); live.setAttribute('aria-live','assertive'); live.setAttribute('role','status'); live.className='sr-only'; live.id='a11y-live'; document.body.appendChild(live);
  var wrap  = document.createElement('div'); wrap.id='a11y-wrap';
  var readBtn = document.createElement('button'); readBtn.id='a11y-read-btn'; readBtn.type='button';
  readBtn.setAttribute('aria-label',t('speakPage'));
  readBtn.innerHTML='🔊 <span>'+t('readAloud')+'</span>';
  readBtn.onclick=function(){ readCurrentPage(); flashAlert(); };
  readBtn.onmouseover=function(){ this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,.22)'; };
  readBtn.onmouseout=function(){ this.style.transform=''; this.style.boxShadow='0 4px 16px rgba(0,0,0,.18)'; };
  wrap.appendChild(readBtn);
  var openBtn = document.createElement('button'); openBtn.id='a11y-open-btn'; openBtn.type='button';
  openBtn.setAttribute('aria-label',t('accessibilitySettings'));
  openBtn.innerHTML='♿ <span>'+t('accessibility')+'</span>';
  openBtn.onclick=function(){
    var user = window.API && window.API.getStoredUser && window.API.getStoredUser();
    var role = user ? (user.role||'') : '';
    var onLoginPage = !!document.getElementById('login-email');
    /* Only patients and the login page can open the panel */
    if (!onLoginPage && role && role !== 'patient') return;
    _panelOpen = true;
    _panelLoginMode = onLoginPage && !user; /* compact language-only mode on login */
    renderPanel();
  };
  openBtn.style.display = 'none';
  wrap.appendChild(openBtn);
  document.body.appendChild(wrap);
  var panel = document.createElement('div'); panel.id='a11y-panel'; panel.setAttribute('aria-modal','true'); document.body.appendChild(panel);
}

/* ══════════════════════════════════════════════════════════════
   14. PUBLIC API
══════════════════════════════════════════════════════════════ */
window._a11ySet    = function(k,v){ set(k,v); };
window._a11yStop   = function(){ stopSpeaking(); };
window._a11yVoice  = function(){ toggleVoice(); };
window._a11yClose  = function(){ _panelOpen=false; renderPanel(); };
window._a11ySpeak  = function(text){ speak(text); };
window._a11yFlash  = function(){ flashAlert(); };
window._a11yRefresh= function(){
  loadSettings(); applySettings(); hookUI();

  /* Show accessibility panel only for patients */
  var role = (window.API && window.API.getStoredUser && window.API.getStoredUser()
              ? window.API.getStoredUser().role : '') || '';
  var patientRoles = ['patient',''];
  var isPatient = patientRoles.includes(role);
  var openBtn = document.getElementById('a11y-open-btn');
  if (openBtn) openBtn.style.display = isPatient ? 'flex' : 'none';

  /* Read aloud button is always visible for everyone */
  var readBtn = document.getElementById('a11y-read-btn');
  if (readBtn) readBtn.style.display = 'flex';

  if (A11Y.speech) {
    var h=new Date().getHours();
    setTimeout(function(){ speak(h<12?t('goodMorning'):h<18?t('goodAfternoon'):t('goodEvening')); }, 800);
  }
};

/* ══════════════════════════════════════════════════════════════
   15. BOOT
══════════════════════════════════════════════════════════════ */
function boot() {
  loadSettings();
  injectCSS();
  injectDOM();
  applySettings();

  /* Hook UI after scripts load */
  function tryHook() {
    hookUI();
    /* Also hook Router.setPage directly */
    if (window.Router && window.Router.setPage && !window.Router._a11yHooked) {
      var orig = window.Router.setPage.bind(window.Router);
      window.Router.setPage = function(page) {
        orig(page);
        setTimeout(translateDOM, 200);
        if (A11Y.speech) {
          setTimeout(function() {
            var h = document.querySelector('#content .page-title, #content h1');
            if (h) speak(h.innerText);
          }, 400);
        }
      };
      window.Router._a11yHooked = true;
    }
  }

  /* On the login page, show the accessibility panel (everyone can change lang/settings before login) */
  setTimeout(function() {
    var openBtn = document.getElementById('a11y-open-btn');
    if (openBtn) {
      /* Show on login page — hide after login based on role */
      var isLoginPage = !!document.getElementById('login-email');
      if (isLoginPage) {
        openBtn.style.display = 'flex';
        openBtn.innerHTML = '🌐 <span>' + t('language') + '</span>';
      }
    }
  }, 300);

  /* Try immediately and keep retrying until all hooks are set */
  [200, 500, 1000, 2000, 3000].forEach(function(ms){ setTimeout(tryHook, ms); });

  /* Check role visibility periodically until user is logged in */
  var roleCheckInterval = setInterval(function() {
    var user = window.API && window.API.getStoredUser && window.API.getStoredUser();
    if (!user) return;
    clearInterval(roleCheckInterval);
    var openBtn = document.getElementById('a11y-open-btn');
    if (!openBtn) return;
    var isPatient = ['patient',''].includes(user.role || '');
    openBtn.style.display = isPatient ? 'flex' : 'none';
  }, 500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

})();
