/**
 * js/accessibility.js — NIHMS Full Accessibility & i18n System
 * Languages: English · isiZulu · Sepedi (Northern Sotho) · Afrikaans · Xitsonga · Tshivenda
 * Features:  Read Aloud · Voice commands · Font scale · High contrast · Simple mode
 *            Flash alerts · Persistent settings · System-wide translation
 * Storage:   localStorage key "nihms.accessibility"
 * Version:   2.0
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════════
     1. LANGUAGES
  ══════════════════════════════════════════════════════════════════════ */
  var LANGUAGES = [
    { code: 'en',  label: 'English',               speech: 'en-ZA' },
    { code: 'zu',  label: 'isiZulu',               speech: 'zu-ZA' },
    { code: 'nso', label: 'Sepedi',                speech: 'en-ZA' }, // no nso-ZA TTS; fall back en-ZA
    { code: 'af',  label: 'Afrikaans',             speech: 'af-ZA' },
    { code: 'ts',  label: 'Xitsonga',              speech: 'en-ZA' }, // no ts-ZA TTS; fall back en-ZA
    { code: 've',  label: 'Tshivenda',             speech: 'en-ZA' }, // no ve-ZA TTS; fall back en-ZA
  ];

  /* ══════════════════════════════════════════════════════════════════════
     2. FULL TRANSLATION DICTIONARY
     Every string the system needs to show, navigate, or speak
  ══════════════════════════════════════════════════════════════════════ */
  var BASE = {
    /* Accessibility panel */
    accessibility:'Accessibility', accessibilitySettings:'Accessibility settings',
    language:'Language', textSize:'Text size', highContrast:'High contrast',
    simpleMode:'Simple mode', readAloud:'Read aloud', visualAlerts:'Flash visual alerts',
    speakPage:'Read this page aloud', stopSpeaking:'Stop reading',
    voiceOn:'Start voice commands', voiceOff:'Stop voice commands',
    voiceHint:'Say: read, menu, home, back, help, contrast, bigger, smaller.',
    voiceUnsupported:'Voice commands are not supported in this browser.',
    helpText:'Ask a staff member at the front desk, or press the read aloud button.',
    close:'Close',

    /* Login page */
    welcome:'Welcome back', signInSub:'Sign in to your NIHMS account',
    emailLabel:'Email address or ID number', passwordLabel:'Password',
    passwordPlaceholder:'Enter your password', forgot:'Forgot password?',
    signIn:'Sign in', register:'Register', noAccount:"Don't have an account?",
    errEmail:'Please enter your email address or ID number.',
    errPassword:'Please enter your password.',

    /* Navigation labels */
    navHome:'Home', navAppointments:'Appointments', navRecords:'My Records',
    navMedications:'Medications', navBilling:'Billing', navProfile:'My Profile',
    navCheckin:'Check In', navBook:'Book Appointment', navSignOut:'Sign out',

    /* Queue */
    queueTitle:'Your place in the queue', queueSub:'Stay nearby. We will call you by number.',
    yourNumber:'Your number', nowServing:'Now serving',
    peopleAhead:'People ahead of you', waitTime:'Estimated wait', minutes:'minutes',

    /* Notifications (spoken aloud) */
    toastOk:'Done', toastErr:'Error', toastWarn:'Warning',
    appointmentConfirmed:'Your appointment has been confirmed.',
    checkedIn:'You are checked in. Your queue token is',
    medicationReady:'Your medication is ready for collection at the pharmacy.',
    prescriptionSent:'Your prescription has been sent to the pharmacy.',

    /* Greetings */
    goodMorning:'Good morning', goodAfternoon:'Good afternoon', goodEvening:'Good evening',

    /* Patient pages */
    myHealth:'My Health', myRecords:'My Records', nextAppointment:'Next appointment',
    noAppointments:'No upcoming appointments', bookNow:'Book now',
    activeConditions:'Active conditions', currentMedications:'Current medications',
    recentVisits:'Recent visits',

    /* Consultation */
    chiefComplaint:'Chief complaint', clinicalNotes:'Clinical notes',
    treatmentPlan:'Treatment plan', followUp:'Follow-up date',
    saveNotes:'Save notes', sendToPharmacy:'Send to pharmacy',

    /* Buttons */
    confirm:'Confirm', cancel:'Cancel', back:'Back', next:'Next',
    save:'Save', edit:'Edit', delete:'Delete', search:'Search',
    refresh:'Refresh', submit:'Submit', print:'Print', download:'Download',
  };

  var DICT = {
    en: BASE,

    zu: Object.assign({}, BASE, {
      /* Panel */
      accessibility:'Ukufinyeleleka',
      accessibilitySettings:'Izilungiselelo zokufinyeleleka',
      language:'Ulimi', textSize:'Usayizi wombhalo',
      highContrast:'Umehluko omkhulu wemibala',
      simpleMode:'Imodi elula', readAloud:'Funda ngokuzwakalayo',
      visualAlerts:'Izaziso ezibonakalayo',
      speakPage:'Funda ikhasi ngokuzwakalayo',
      stopSpeaking:'Yeka ukufunda',
      voiceOn:'Qala imiyalo yezwi',
      voiceOff:'Misa imiyalo yezwi',
      voiceHint:'Sho: funda, imenyu, ekhaya, emuva, usizo, mehluko, okukhulu, okuncane.',
      helpText:'Buza umuntu ekamelweni lombhekisi, noma chofoza inkinobho yokufunda.',
      close:'Vala',
      /* Login */
      welcome:'Siyakwamukela futhi',
      signInSub:'Ngena ku-akhawunti yakho ye-NIHMS',
      emailLabel:'Ikheli le-imeyili noma inombolo yesazisi',
      passwordLabel:'Iphasiwedi', passwordPlaceholder:'Faka iphasiwedi yakho',
      forgot:'Ukhohlwe iphasiwedi?', signIn:'Ngena', register:'Bhalisa',
      noAccount:'Awunayo i-akhawunti?',
      errEmail:'Sicela ufake i-imeyili noma inombolo yesazisi.',
      errPassword:'Sicela ufake iphasiwedi yakho.',
      /* Nav */
      navHome:'Ikhaya', navAppointments:'Amihlangano',
      navRecords:'Amarekhodi ami', navMedications:'Imithi',
      navBilling:'Inkokhelo', navProfile:'Iphrofayili yami',
      navCheckin:'Ngena lapha', navBook:'Bhuka umhlangano', navSignOut:'Phuma',
      /* Queue */
      queueTitle:'Indawo yakho emgqeni',
      queueSub:'Hlala eduze. Sizokhipha inombolo yakho.',
      yourNumber:'Inombolo yakho', nowServing:'Manje sisiza',
      peopleAhead:'Abantu abangaphambi kwakho',
      waitTime:'Isikhathi sokulinda', minutes:'imizuzu',
      /* Notifications */
      appointmentConfirmed:'Umhlangano wakho uqinisekisiwe.',
      checkedIn:'Usengenile. Inombolo yakho yomugqa ilani',
      medicationReady:'Imithi yakho ilungele ukuqoqwa ephamilani.',
      prescriptionSent:'Isibambiso sakho sithunywe ephamilani.',
      /* Greetings */
      goodMorning:'Sawubona ekuseni',
      goodAfternoon:'Sawubona emini',
      goodEvening:'Sawubona kusihlwa',
      /* Patient */
      myHealth:'Impilo yami', myRecords:'Amarekhodi ami',
      nextAppointment:'Umhlangano olandelayo',
      noAppointments:'Awekho amihlangano akhona',
      bookNow:'Bhuka manje',
      /* Buttons */
      confirm:'Qinisekisa', cancel:'Khansela', back:'Emuva', next:'Okulandelayo',
      save:'Londoloza', edit:'Hlela', search:'Sesha', submit:'Thumela',
    }),

    nso: Object.assign({}, BASE, {
      /* Panel */
      accessibility:'Phihlelelego',
      accessibilitySettings:'Dipeakanyo tša phihlelelego',
      language:'Leleme', textSize:'Bogolo bja mongwalo',
      highContrast:'Phapang ye kgolo ya mmala',
      simpleMode:'Mokgwa wo bonolo', readAloud:'Bala ka lentšu le legolo',
      visualAlerts:'Dihlaagiši tša go bona',
      speakPage:'Bala letlakala le ka lentšu',
      stopSpeaking:'Emisa go bala',
      voiceOn:'Thoma ditaelo tša lentšu',
      voiceOff:'Emisa ditaelo tša lentšu',
      voiceHint:'Re: bala, menyu, gae, morago, thušo, phapang, ye kgolo, ye nnyane.',
      helpText:'Kwa modiredi ka thalong, goba hatša konopo ya go bala ka lentšu.',
      close:'Tswalela',
      /* Login */
      welcome:'Re a go amogela gape',
      signInSub:'Tsena ka akhaontong ya gago ya NIHMS',
      emailLabel:'Aterese ya imeile goba nambara ya boitsebišo',
      passwordLabel:'Phasewete', passwordPlaceholder:'Tsenya phasewete ya gago',
      forgot:'O lebetše phasewete?', signIn:'Tsena', register:'Ingwadiše',
      noAccount:'Ga o na akhaonto?',
      errEmail:'Tsenya imeile goba nambara ya boitsebišo.',
      errPassword:'Tsenya phasewete ya gago.',
      /* Nav */
      navHome:'Gae', navAppointments:'Dikgobokano',
      navRecords:'Direkoto tšaka', navMedications:'Dihlare',
      navBilling:'Tefelo', navProfile:'Profaele ya ka',
      navCheckin:'Ngwadiša', navBook:'Hloma kgobokano', navSignOut:'Tswa',
      /* Queue */
      queueTitle:'Sebaka sa gago mo lelong',
      queueSub:'Dula gaufi. Re tla go bitša ka nambara.',
      yourNumber:'Nambara ya gago', nowServing:'Bjale re šomela',
      peopleAhead:'Batho ba pele ga gago',
      waitTime:'Nako ya go letela', minutes:'metsotso',
      /* Notifications */
      appointmentConfirmed:'Kgobokano ya gago e tiišeditšwe.',
      checkedIn:'O ngwadišitšwe. Nambara ya lelo ya gago ke',
      medicationReady:'Dihlare tša gago di lokile go kgobokwa ka famasi.',
      prescriptionSent:'Tebelelo ya gago e romeletšwe ka famasi.',
      /* Greetings */
      goodMorning:'Dumela ka masa',
      goodAfternoon:'Dumela mosegare',
      goodEvening:'Dumela mantšiboa',
      /* Buttons */
      confirm:'Tiišetša', cancel:'Khansela', back:'Morago', next:'Ye e latelago',
      save:'Boloka', edit:'Hlela', search:'Nyaka', submit:'Romela',
    }),

    af: Object.assign({}, BASE, {
      /* Panel */
      accessibility:'Toeganklikheid',
      accessibilitySettings:'Toeganklikheidsinstellings',
      language:'Taal', textSize:'Teksgrootte',
      highContrast:'Hoë kontras',
      simpleMode:'Eenvoudige modus', readAloud:'Lees hardop',
      visualAlerts:'Flits visuele waarskuwings',
      speakPage:'Lees hierdie bladsy hardop',
      stopSpeaking:'Stop lees',
      voiceOn:'Begin spraakopdragte',
      voiceOff:'Stop spraakopdragte',
      voiceHint:'Sê: lees, kieslys, tuis, terug, hulp, kontras, groter, kleiner.',
      helpText:"Vra 'n personeellid by die toonbank, of druk die hardop-lees-knoppie.",
      close:'Sluit',
      /* Login */
      welcome:'Welkom terug',
      signInSub:'Meld aan by jou NIHMS-rekening',
      emailLabel:'E-posadres of ID-nommer',
      passwordLabel:'Wagwoord', passwordPlaceholder:'Voer jou wagwoord in',
      forgot:'Wagwoord vergeet?', signIn:'Meld aan', register:'Registreer',
      noAccount:"Het jy nie 'n rekening nie?",
      errEmail:'Voer asseblief jou e-posadres of ID-nommer in.',
      errPassword:'Voer asseblief jou wagwoord in.',
      /* Nav */
      navHome:'Tuis', navAppointments:'Afsprake',
      navRecords:'My rekords', navMedications:'Medikasie',
      navBilling:'Rekening', navProfile:'My profiel',
      navCheckin:'Aanmeld', navBook:'Besprekings', navSignOut:'Afmeld',
      /* Queue */
      queueTitle:'Jou plek in die ry',
      queueSub:'Bly naby. Ons sal jou by nommer roep.',
      yourNumber:'Jou nommer', nowServing:'Word nou bedien',
      peopleAhead:'Mense voor jou',
      waitTime:'Geskatte wagtyd', minutes:'minute',
      /* Notifications */
      appointmentConfirmed:'Jou afspraak is bevestig.',
      checkedIn:'Jy is ingeskryf. Jou toknommer is',
      medicationReady:'Jou medisyne is gereed vir afhaling by die apteek.',
      prescriptionSent:'Jou voorskrif is na die apteek gestuur.',
      /* Greetings */
      goodMorning:'Goeie môre', goodAfternoon:'Goeie middag', goodEvening:'Goeie naand',
      /* Buttons */
      confirm:'Bevestig', cancel:'Kanselleer', back:'Terug', next:'Volgende',
      save:'Stoor', edit:'Wysig', search:'Soek', submit:'Indien',
    }),

    ts: Object.assign({}, BASE, {
      /* Panel */
      accessibility:'Ku fikelela',
      accessibilitySettings:'Swipimanyeto swa ku fikelela',
      language:'Ririmi', textSize:'Ntalo wa mavito',
      highContrast:'Ku hambana ka le hombe ka mintirho ya mabala',
      simpleMode:'Xiyenge xa le hombe', readAloud:'Hlaya hi rito',
      visualAlerts:'Swicheriwa swa ku vona',
      speakPage:'Hlaya pheji leyi hi rito',
      stopSpeaking:'Yima ku hlaya',
      voiceOn:'Sungula swileriso swa rito',
      voiceOff:'Yima swileriso swa rito',
      voiceHint:'Ku: hlaya, menyu, kaya, endzhaku, pfuneta, hambana, le hombe, le titsongo.',
      helpText:'Vutisa mutirhisi eka ndzhawu ya ku nghenela, kumbe hambulela xikhopo xa ku hlaya.',
      close:'Pfala',
      /* Login */
      welcome:'Wa amukeriwa nakambe',
      signInSub:'Nghena eka akhauntu ya wena ya NIHMS',
      emailLabel:'Adiresi ya imeyili kumbe nomboro ya vukari',
      passwordLabel:'Phasiwedi', passwordPlaceholder:'Nghenisa phasiwedi ya wena',
      forgot:'U rivalele phasiwedi?', signIn:'Nghena', register:'Tsarisa',
      noAccount:'A u na akhauntu?',
      errEmail:'Nghenisa imeyili kumbe nomboro ya vukari.',
      errPassword:'Nghenisa phasiwedi ya wena.',
      /* Nav */
      navHome:'Kaya', navAppointments:'Swikolo',
      navRecords:'Swirekodo swa mina', navMedications:'Mihloti',
      navBilling:'Ku hakela', navProfile:'Xiprofile xa mina',
      navCheckin:'Tsarisa', navBook:'Hlanganisa nhlengeletano', navSignOut:'Huma',
      /* Queue */
      queueTitle:'Ndhawu ya wena eka murhi wa ku rindza',
      queueSub:'Tshama kusuhi. Hi ta ku biha hi nomboro.',
      yourNumber:'Nomboro ya wena', nowServing:'Swa sweswi hi tirha',
      peopleAhead:'Vanhu va mahlweni ka wena',
      waitTime:'Nkarhi wo laveka wo rindza', minutes:'mihashu',
      /* Notifications */
      appointmentConfirmed:'Nhlengeletano wa wena wu khumbuliwa.',
      checkedIn:'U tsarisiwile. Nomboro ya queue ya wena i',
      medicationReady:'Mihloti ya wena yi lungile ku kuma eka famasi.',
      prescriptionSent:'Xitsalwa xa wena xi rhumeriwa eka famasi.',
      /* Greetings */
      goodMorning:'Avuxeni bya kahle',
      goodAfternoon:'Ndhavuku ya kahle',
      goodEvening:'Xivondzo xa kahle',
      /* Buttons */
      confirm:'Pfumela', cancel:'Hetisa', back:'Endzhaku', next:'Leri landzelaka',
      save:'Hlayisa', edit:'Lungisa', search:'Lava', submit:'Rhumela',
    }),

    ve: Object.assign({}, BASE, {
      /* Panel */
      accessibility:'U wanala',
      accessibilitySettings:'Zwishumiswa zwa u wanala',
      language:'Luambo', textSize:'Bogalo bwa manwalo',
      highContrast:'Phambano khulwane ya mavhala',
      simpleMode:'Nzila i nyamulaho', readAloud:'Vhala nga ndivho',
      visualAlerts:'Maipfi a u vhona',
      speakPage:'Vhala peji ino nga ndivho',
      stopSpeaking:'Misa u vhala',
      voiceOn:'Thoma maipfi a ndivho',
      voiceOff:'Misa maipfi a ndivho',
      voiceHint:'Ri: vhala, menu, hayani, tshidima, thuso, phambano, khulwane, tshituku.',
      helpText:'Vhudzisa mushumisi phanḓa, kana pfura khonono ya u vhala.',
      close:'Vhara',
      /* Login */
      welcome:'Ro ni amukela hafhu',
      signInSub:'Dzhena kha akhauntu yau ya NIHMS',
      emailLabel:'Aadresi ya imeyili kana nomboro ya vhuhosi',
      passwordLabel:'Phasiwede', passwordPlaceholder:'Dzhena phasiwede yau',
      forgot:'No hangwa phasiwede?', signIn:'Dzhena', register:'Ngwalisa',
      noAccount:'A ni na akhauntu?',
      errEmail:'Dzhena imeyili kana nomboro ya vhuhosi.',
      errPassword:'Dzhena phasiwede yau.',
      /* Nav */
      navHome:'Hayani', navAppointments:'Misangano',
      navRecords:'Mirekhodo yanga', navMedications:'Mirado',
      navBilling:'Tshikovhe', navProfile:'Phrofaele yanga',
      navCheckin:'Ngwalisa', navBook:'Lavhelesa musango', navSignOut:'Bva',
      /* Queue */
      queueTitle:'Nḓila yau kha mbilaelo',
      queueSub:'Ima tshifhingani. Ri do ni vhidza nga nomboro.',
      yourNumber:'Nomboro yau', nowServing:'Zwino ri khou shumela',
      peopleAhead:'Vhathu vha u imela',
      waitTime:'Tshifhinga tsha u humbula', minutes:'miminiti',
      /* Notifications */
      appointmentConfirmed:'Musango wau wo tiwa.',
      checkedIn:'No ngwaliwa. Nomboro yau ya murahu i',
      medicationReady:'Mirado yau yo lugela u toliwa kha famasi.',
      prescriptionSent:'Tshibvumiwa tshau tshi rumiwile kha famasi.',
      /* Greetings */
      goodMorning:'Mangwanani a fanaho',
      goodAfternoon:'Masiari a fanaho',
      goodEvening:'Madekwana a fanaho',
      /* Buttons */
      confirm:'Khwaṱhisa', cancel:'Khansela', back:'Tshidima', next:'Ya u tevhela',
      save:'Vhulunga', edit:'Lungisa', search:'Toda', submit:'Rumela',
    }),
  };

  /* ══════════════════════════════════════════════════════════════════════
     3. VOICE COMMAND KEYWORDS PER LANGUAGE
  ══════════════════════════════════════════════════════════════════════ */
  var VOICE_COMMANDS = {
    en:  { read:['read'],            menu:['menu'],           home:['home'],
           back:['back'],            help:['help'],           contrast:['contrast'],
           bigger:['bigger','larger'],smaller:['smaller'],    appointments:['appointment','appointments'],
           records:['records','record'], medications:['medication','medications'],
           checkin:['check in','check-in'], signout:['sign out','logout','log out'] },
    zu:  { read:['funda'],           menu:['imenyu'],         home:['ekhaya'],
           back:['emuva'],           help:['usizo'],          contrast:['mehluko'],
           bigger:['okukhulu'],      smaller:['okuncane'],    appointments:['amihlangano'],
           records:['amarekhodi'],   medications:['imithi'],
           checkin:['ngena'],        signout:['phuma'] },
    nso: { read:['bala'],            menu:['menyu'],          home:['gae'],
           back:['morago'],          help:['thušo'],          contrast:['phapang'],
           bigger:['ye kgolo'],      smaller:['ye nnyane'],   appointments:['dikgobokano'],
           records:['direkoto'],     medications:['dihlare'],
           checkin:['ngwadiša'],     signout:['tswa'] },
    af:  { read:['lees'],            menu:['kieslys'],        home:['tuis'],
           back:['terug'],           help:['hulp'],           contrast:['kontras'],
           bigger:['groter'],        smaller:['kleiner'],     appointments:['afsprake'],
           records:['rekords'],      medications:['medikasie'],
           checkin:['aanmeld'],      signout:['afmeld'] },
    ts:  { read:['hlaya'],           menu:['menyu'],          home:['kaya'],
           back:['endzhaku'],        help:['pfuneta'],        contrast:['hambana'],
           bigger:['le hombe'],      smaller:['le titsongo'], appointments:['swikolo'],
           records:['swirekodo'],    medications:['mihloti'],
           checkin:['tsarisa'],      signout:['huma'] },
    ve:  { read:['vhala'],           menu:['menu'],           home:['hayani'],
           back:['tshidima'],        help:['thuso'],          contrast:['phambano'],
           bigger:['khulwane'],      smaller:['tshituku'],    appointments:['misangano'],
           records:['mirekhodo'],    medications:['mirado'],
           checkin:['ngwalisa'],     signout:['bva'] },
  };

  /* ══════════════════════════════════════════════════════════════════════
     4. STATE
  ══════════════════════════════════════════════════════════════════════ */
  var STORAGE_KEY = 'nihms.accessibility';
  var DEFAULTS = {
    language: 'en', fontScale: 1, highContrast: false,
    simpleMode: false, speech: false, visualAlerts: true,
  };
  var A11Y = Object.assign({}, DEFAULTS);

  function loadSettings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) A11Y = Object.assign({}, DEFAULTS, JSON.parse(raw));
    } catch (_) {}
  }

  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(A11Y)); } catch (_) {}
  }

  function t(key) {
    var d = DICT[A11Y.language] || DICT.en;
    return d[key] || DICT.en[key] || key;
  }

  /* Public getter so other scripts can use translations */
  window.NIHMS_T = function (key) { return t(key); };
  window.NIHMS_LANG = function () { return A11Y.language; };

  /* ══════════════════════════════════════════════════════════════════════
     5. APPLY SETTINGS TO DOM
  ══════════════════════════════════════════════════════════════════════ */
  function applySettings() {
    var root = document.documentElement;
    root.lang = A11Y.language;
    root.classList.toggle('hc', A11Y.highContrast);
    root.classList.toggle('simple', A11Y.simpleMode);
    root.style.setProperty('--font-scale', String(A11Y.fontScale));
    saveSettings();
    translatePage();
    renderFloatingButtons();
    if (_panelOpen) renderPanel();
  }

  function set(key, value) {
    A11Y[key] = value;
    applySettings();
  }

  /* ══════════════════════════════════════════════════════════════════════
     6. PAGE TRANSLATION
     Any element with data-i18n="key" gets its text replaced
  ══════════════════════════════════════════════════════════════════════ */
  function translatePage() {
    /* Translate data-i18n elements */
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = t(key);
      if (val) el.textContent = val;
    });

    /* Translate data-i18n-placeholder elements */
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-ph');
      var val = t(key);
      if (val) el.placeholder = val;
    });

    /* Translate data-i18n-aria elements */
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      var val = t(key);
      if (val) el.setAttribute('aria-label', val);
    });

    /* Login page specific translations */
    _translateLogin();

    /* Update page title lang */
    document.title = 'NIHMS — National Integrated Healthcare Management System';
  }

  function _translateLogin() {
    var fields = [
      ['login-email',    'emailLabel',    'label'],
      ['login-password', 'passwordLabel', 'label'],
    ];
    fields.forEach(function (f) {
      var el = document.getElementById(f[0]);
      if (!el) return;
      var label = el.previousElementSibling || (el.closest('.form-group') || {}).querySelector('label');
      /* Find label differently */
      var group = el.closest ? el.closest('.form-group') : null;
      if (group) {
        var lbl = group.querySelector('.form-label');
        if (lbl) lbl.textContent = t(f[1]);
      }
    });

    /* Translate heading and sub */
    var heading = document.querySelector('#panel-login .auth-heading');
    if (heading) heading.textContent = t('welcome');
    var sub = document.querySelector('#panel-login .auth-sub');
    if (sub) sub.textContent = t('signInSub');

    /* Translate sign-in button */
    var signBtn = document.querySelector('#login-btn span');
    if (signBtn) signBtn.textContent = t('signIn');

    /* Translate forgot link */
    document.querySelectorAll('.btn-ghost').forEach(function (btn) {
      if (btn.onclick && String(btn.onclick).includes('reset')) btn.textContent = t('forgot');
      if (btn.onclick && String(btn.onclick).includes('register')) btn.textContent = t('register');
    });

    /* Translate placeholders */
    var emailInp = document.getElementById('login-email');
    if (emailInp) emailInp.placeholder = t('emailLabel');
    var pwdInp = document.getElementById('login-password');
    if (pwdInp) pwdInp.placeholder = t('passwordPlaceholder');
  }

  /* ══════════════════════════════════════════════════════════════════════
     7. SPEECH SYNTHESIS
  ══════════════════════════════════════════════════════════════════════ */
  function getSpeechLang() {
    var lang = LANGUAGES.find(function (l) { return l.code === A11Y.language; });
    return lang ? lang.speech : 'en-ZA';
  }

  /* Cache chosen voice per lang */
  var _voiceCache = {};

  function getBestVoice(lang) {
    if (_voiceCache[lang]) return _voiceCache[lang];
    var voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    /* Priority: exact lang match → partial match → any English */
    var exact   = voices.find(function(v){ return v.lang === lang; });
    var partial  = voices.find(function(v){ return v.lang.startsWith(lang.split('-')[0]); });
    var enFall   = voices.find(function(v){ return v.lang.startsWith('en'); });
    var best = exact || partial || enFall || voices[0];
    _voiceCache[lang] = best;
    return best;
  }

  function speak(text) {
    if (!('speechSynthesis' in window) || !text) return;
    /* Clean text — remove markdown, special chars, excessive whitespace */
    var clean = text
      .replace(/#{1,6}\s/g, '')          /* markdown headings */
      .replace(/\*\*(.+?)\*\*/g, '$1')   /* bold */
      .replace(/\*(.+?)\*/g, '$1')       /* italic */
      .replace(/`(.+?)`/g, '$1')         /* code */
      .replace(/https?:\/\/\S+/g, '')    /* URLs */
      .replace(/[•·▸►]/g, ',')           /* bullets → pause */
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 2000);

    if (!clean) return;
    window.speechSynthesis.cancel();

    /* Wait for voices if not loaded yet */
    var voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
      window.speechSynthesis.onvoiceschanged = function() { _voiceCache = {}; speak(text); };
      return;
    }

    var lang  = getSpeechLang();
    var voice = getBestVoice(lang);

    /* Split long text into natural sentence chunks for smoother delivery */
    var chunks = clean.match(/[^.!?]+[.!?]*/g) || [clean];
    chunks.forEach(function(chunk, i) {
      var utt = new SpeechSynthesisUtterance(chunk.trim());
      utt.lang  = lang;
      utt.rate  = A11Y.simpleMode ? 0.78 : 0.92;   /* slightly slower = more natural */
      utt.pitch = 1.05;                              /* slight lift = warmer tone */
      utt.volume = 1;
      if (voice) utt.voice = voice;
      /* Small gap between sentences */
      if (i > 0) utt.text = ' ' + utt.text;
      window.speechSynthesis.speak(utt);
    });
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  function readablePageText() {
    /* Try the active NIHMS page content first */
    var selectors = [
      '.app-body',          /* NIHMS main content area */
      '#page-content',
      '.page-content',
      'main',
      '.auth-card',
      '.card-body',
      '#content',
      'article',
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el && el.innerText && el.innerText.trim().length > 30) {
        /* Strip navigation and button-only lines for cleaner reading */
        var text = el.innerText
          .split('\n')
          .filter(function(line) { return line.trim().length > 2; })
          .join('. ')
          .replace(/\s{2,}/g, ' ')
          .trim();
        return text.slice(0, 2000);
      }
    }
    return document.body.innerText.replace(/\s+/g, ' ').slice(0, 2000);
  }

  /* Read current page with a delay so DOM has rendered */
  function speakCurrentPage() {
    setTimeout(function() {
      var text = readablePageText();
      if (text) speak(text);
    }, 600);
  }

  /* Speak any toast/notification that appears — system-wide hook */
  function speakToast(msg, type) {
    if (!A11Y.speech) return;
    var prefix = type === 'ok' ? t('toastOk') + '. ' : type === 'err' ? t('toastErr') + '. ' : '';
    speak(prefix + msg);
    flashAlert();
  }

  /* Hook into the existing NIHMS UI.showToast so notifications are spoken */
  function hookToast() {
    var UI = window.UI;
    if (!UI || !UI.showToast || UI._a11yHooked) return;
    var orig = UI.showToast.bind(UI);
    UI.showToast = function (msg, type) {
      orig(msg, type);
      speakToast(msg, type);
    };
    UI._a11yHooked = true;
  }

  /* ══════════════════════════════════════════════════════════════════════
     8. FLASH VISUAL ALERT
  ══════════════════════════════════════════════════════════════════════ */
  var _flashTimer = null;
  function flashAlert() {
    if (!A11Y.visualAlerts) return;
    var el = document.getElementById('a11y-flash');
    if (!el) return;
    el.style.display = 'block';
    if (_flashTimer) clearTimeout(_flashTimer);
    _flashTimer = setTimeout(function () { el.style.display = 'none'; }, 1600);
  }

  /* ══════════════════════════════════════════════════════════════════════
     9. VOICE COMMANDS
  ══════════════════════════════════════════════════════════════════════ */
  var _recognition = null;
  var _listening = false;

  function matchCmd(said, keywords) {
    return keywords.some(function (kw) { return said.includes(kw.toLowerCase()); });
  }

  function handleVoice(transcript) {
    var said = transcript.toLowerCase().trim();
    var cmds = VOICE_COMMANDS[A11Y.language] || VOICE_COMMANDS.en;

    if (matchCmd(said, cmds.read)) {
      speakCurrentPage(); return;
    }
    if (matchCmd(said, cmds.home)) {
      speak(t('navHome'));
      if (window.Router) Router.setPage('myhealth'); return;
    }
    if (matchCmd(said, cmds.back)) {
      window.history.back(); speak(t('back')); return;
    }
    if (matchCmd(said, cmds.appointments)) {
      speak(t('navAppointments'));
      if (window.Router) Router.setPage('appointments'); return;
    }
    if (matchCmd(said, cmds.records)) {
      speak(t('navRecords'));
      if (window.Router) Router.setPage('myrecords'); return;
    }
    if (matchCmd(said, cmds.medications)) {
      speak(t('navMedications'));
      if (window.Router) Router.setPage('myrecords');
      setTimeout(function () { if (window._mrTab) _mrTab(3); }, 400);
      return;
    }
    if (matchCmd(said, cmds.checkin)) {
      speak(t('navCheckin'));
      if (window.Router) Router.setPage('checkin'); return;
    }
    if (matchCmd(said, cmds.signout)) {
      speak(t('navSignOut'));
      if (window.doLogout) doLogout(); return;
    }
    if (matchCmd(said, cmds.contrast)) {
      set('highContrast', !A11Y.highContrast);
      speak(t('highContrast') + ': ' + (A11Y.highContrast ? 'on' : 'off')); return;
    }
    if (matchCmd(said, cmds.bigger)) {
      set('fontScale', Math.min(1.6, Math.round((A11Y.fontScale + 0.1) * 10) / 10));
      speak(t('textSize') + ' ' + Math.round(A11Y.fontScale * 100) + '%'); return;
    }
    if (matchCmd(said, cmds.smaller)) {
      set('fontScale', Math.max(0.9, Math.round((A11Y.fontScale - 0.1) * 10) / 10));
      speak(t('textSize') + ' ' + Math.round(A11Y.fontScale * 100) + '%'); return;
    }
    if (matchCmd(said, cmds.help)) {
      speak(t('helpText')); return;
    }
    if (matchCmd(said, cmds.menu)) {
      var menuItems = [t('navHome'), t('navAppointments'), t('navRecords'),
                       t('navMedications'), t('navBilling'), t('navProfile')];
      speak(menuItems.join('. ')); return;
    }
  }

  function toggleVoice() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { _voiceError = t('voiceUnsupported'); renderPanel(); return; }
    if (_listening) {
      _recognition && _recognition.stop();
      _listening = false;
      speak(t('voiceOff'));
      renderPanel(); return;
    }
    _recognition = new SR();
    _recognition.continuous = true;
    _recognition.interimResults = false;
    _recognition.lang = getSpeechLang();
    _recognition.onresult = function (e) {
      var last = e.results[e.results.length - 1];
      if (last.isFinal) handleVoice(last[0].transcript);
    };
    _recognition.onerror = function () { _listening = false; renderPanel(); };
    _recognition.onend = function () {
      /* Restart if we didn't intentionally stop */
      if (_listening) { try { _recognition.start(); } catch (_) {} }
    };
    try {
      _recognition.start();
      _listening = true;
      speak(t('voiceOn'));
      renderPanel();
    } catch (_) { _voiceError = t('voiceUnsupported'); renderPanel(); }
  }

  var _voiceError = '';

  /* ══════════════════════════════════════════════════════════════════════
     10. PANEL RENDERING
  ══════════════════════════════════════════════════════════════════════ */
  var _panelOpen = false;

  function renderFloatingButtons() {
    var wrap = document.getElementById('a11y-wrap');
    if (!wrap) return;
    var readBtn = document.getElementById('a11y-read-btn');
    var openBtn = document.getElementById('a11y-open-btn');
    if (readBtn) {
      readBtn.setAttribute('aria-label', t('speakPage'));
      readBtn.querySelector('span').textContent = t('readAloud');
    }
    if (openBtn) {
      openBtn.setAttribute('aria-label', t('accessibilitySettings'));
      openBtn.querySelector('span').textContent = t('accessibility');
    }
  }

  function renderPanel() {
    var panel = document.getElementById('a11y-panel');
    if (!panel) return;
    if (!_panelOpen) { panel.style.display = 'none'; return; }
    panel.style.display = 'flex';

    panel.innerHTML =
      '<div role="dialog" aria-modal="true" aria-label="' + t('accessibilitySettings') + '" ' +
        'style="background:#fff;border-radius:18px;width:100%;max-width:420px;max-height:92vh;overflow-y:auto;padding:24px;box-shadow:0 24px 72px rgba(0,0,0,.28);position:relative">' +

        /* ── Header ── */
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">' +
          '<h2 style="font-size:17px;font-weight:700;margin:0;color:#111">' + t('accessibilitySettings') + '</h2>' +
          '<button onclick="window._a11yClose()" aria-label="' + t('close') + '" ' +
            'style="width:36px;height:36px;border-radius:50%;border:1.5px solid #ddd;background:transparent;cursor:pointer;font-size:18px;color:#555;display:flex;align-items:center;justify-content:center">✕</button>' +
        '</div>' +

        /* ── Language selector ── */
        '<fieldset style="border:none;padding:0;margin:0 0 20px">' +
          '<legend style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#888;margin-bottom:10px;display:block">' + t('language') + '</legend>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">' +
          LANGUAGES.map(function (lang) {
            var active = A11Y.language === lang.code;
            return '<button onclick="window._a11ySet(\'language\',\'' + lang.code + '\')" ' +
              'style="padding:9px 8px;border-radius:10px;border:2px solid ' + (active ? '#0F6E56' : '#e5e5e5') + ';' +
              'background:' + (active ? '#0F6E56' : '#fff') + ';color:' + (active ? '#fff' : '#333') + ';' +
              'font-size:12px;font-weight:' + (active ? '700' : '500') + ';cursor:pointer;font-family:inherit;' +
              'transition:all .15s">' + lang.label + '</button>';
          }).join('') +
          '</div>' +
        '</fieldset>' +

        /* ── Font scale ── */
        '<div style="margin-bottom:20px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
            '<label for="a11y-font-range" style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#888">' + t('textSize') + '</label>' +
            '<span style="font-size:14px;font-weight:700;color:#0F6E56">' + Math.round(A11Y.fontScale * 100) + '%</span>' +
          '</div>' +
          '<input id="a11y-font-range" type="range" min="0.9" max="1.6" step="0.1" value="' + A11Y.fontScale + '" ' +
            'oninput="window._a11ySet(\'fontScale\',+this.value)" ' +
            'style="width:100%;accent-color:#0F6E56;height:6px;cursor:pointer">' +
          '<div style="display:flex;justify-content:space-between;font-size:11px;color:#bbb;margin-top:3px"><span>A</span><span style="font-size:16px;font-weight:700">A</span></div>' +
        '</div>' +

        /* ── Toggle switches ── */
        '<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px">' +
        [
          ['highContrast', t('highContrast'), '🎨'],
          ['simpleMode',   t('simpleMode'),   '📖'],
          ['speech',       t('readAloud'),    '🔊'],
          ['visualAlerts', t('visualAlerts'), '⚡'],
        ].map(function (row) {
          var key = row[0], label = row[1], icon = row[2], on = A11Y[key];
          return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:' + (on ? '#F0FBF7' : '#fafafa') + ';border-radius:12px;border:1.5px solid ' + (on ? '#A8E6D0' : '#eee') + '">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<span style="font-size:18px">' + icon + '</span>' +
              '<label for="a11y-toggle-' + key + '" style="font-size:14px;font-weight:500;color:#111;cursor:pointer">' + label + '</label>' +
            '</div>' +
            '<button id="a11y-toggle-' + key + '" role="switch" aria-checked="' + on + '" ' +
              'onclick="window._a11ySet(\'' + key + '\',' + (!on) + ')" ' +
              'style="width:52px;height:28px;border-radius:14px;border:none;' +
              'background:' + (on ? '#0F6E56' : '#ddd') + ';cursor:pointer;position:relative;transition:background .2s">' +
              '<span style="position:absolute;top:3px;left:' + (on ? '26px' : '3px') + ';width:22px;height:22px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 4px rgba(0,0,0,.2)"></span>' +
            '</button>' +
          '</div>';
        }).join('') +
        '</div>' +

        /* ── Voice commands ── */
        '<div style="border:2px solid ' + (_listening ? '#0F6E56' : '#eee') + ';border-radius:14px;padding:14px;margin-bottom:12px;background:' + (_listening ? '#F0FBF7' : '#fff') + '">' +
          '<button onclick="window._a11yVoice()" ' +
            'style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:12px;border-radius:10px;border:none;' +
            'background:' + (_listening ? '#0F6E56' : '#f0f0f0') + ';color:' + (_listening ? '#fff' : '#333') + ';' +
            'font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">' +
            (_listening ? '🎤 ' + t('voiceOff') : '🎙️ ' + t('voiceOn')) +
          '</button>' +
          '<p style="margin:10px 0 0;font-size:12px;color:#888;line-height:1.5">' + t('voiceHint') + '</p>' +
          (_voiceError ? '<p role="alert" style="margin:8px 0 0;font-size:12px;font-weight:600;color:#c00">' + _voiceError + '</p>' : '') +
        '</div>' +

        /* ── Stop speaking ── */
        '<button onclick="window._a11yStop()" ' +
          'style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;' +
          'border-radius:10px;border:2px solid #eee;background:#fff;color:#555;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">' +
          '🔇 ' + t('stopSpeaking') +
        '</button>' +

      '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════════
     11. CSS INJECTION
  ══════════════════════════════════════════════════════════════════════ */
  function injectCSS() {
    var style = document.createElement('style');
    style.textContent = [
      ':root { --font-scale: 1; }',
      /* Scale applies system-wide */
      'body { font-size: calc(14px * var(--font-scale, 1)); }',
      '.auth-heading { font-size: calc(21px * var(--font-scale, 1)) !important; }',
      '.f-inp, .f-sel, .btn-main, .btn-sec, select, input, button { font-size: calc(14px * var(--font-scale, 1)) !important; }',
      /* High contrast */
      'html.hc { filter: contrast(1.5) saturate(0.8); }',
      /* Simple mode */
      'html.simple .auth-bg { display: none !important; }',
      'html.simple .auth-card { box-shadow: 0 4px 20px rgba(0,0,0,.15); }',
      'html.simple .simple-hide { display: none !important; }',
      /* Flash alert */
      '@keyframes a11y-pulse { 0%,100%{opacity:.6} 50%{opacity:1} }',
      '#a11y-flash { display:none;position:fixed;inset:0;border:10px solid #FFB612;z-index:999999;pointer-events:none;animation:a11y-pulse 1.6s ease-in-out; }',
      /* Screen reader */
      '.sr-only { position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0; }',
      /* Panel overlay bg */
      '#a11y-panel { display:none;position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.55);align-items:center;justify-content:center;padding:16px; }',
      /* Floating buttons */
      '#a11y-wrap { position:fixed;right:16px;bottom:16px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:8px; }',
      '#a11y-read-btn { display:flex;align-items:center;gap:8px;padding:11px 18px;border-radius:50px;background:rgba(255,255,255,.96);border:2px solid #ddd;font-family:inherit;font-size:13px;font-weight:600;color:#111;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.18);backdrop-filter:blur(8px);transition:transform .15s; }',
      '#a11y-read-btn:hover { transform:translateY(-2px); }',
      '#a11y-open-btn { display:flex;align-items:center;gap:8px;padding:11px 20px;border-radius:50px;background:linear-gradient(135deg,#0F6E56,#1A4A9B);border:none;font-family:inherit;font-size:13px;font-weight:600;color:#fff;cursor:pointer;box-shadow:0 4px 18px rgba(15,110,86,.35);transition:transform .15s; }',
      '#a11y-open-btn:hover { transform:translateY(-2px); }',
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ══════════════════════════════════════════════════════════════════════
     12. DOM INJECTION
  ══════════════════════════════════════════════════════════════════════ */
  function injectDOM() {
    /* Flash overlay */
    var flashEl = document.createElement('div');
    flashEl.id = 'a11y-flash';
    document.body.appendChild(flashEl);

    /* Live region */
    var live = document.createElement('div');
    live.setAttribute('aria-live', 'assertive');
    live.setAttribute('aria-atomic', 'true');
    live.setAttribute('role', 'status');
    live.className = 'sr-only';
    live.id = 'a11y-live';
    document.body.appendChild(live);

    /* Floating wrap */
    var wrap = document.createElement('div');
    wrap.id = 'a11y-wrap';

    /* Read aloud button */
    var readBtn = document.createElement('button');
    readBtn.id = 'a11y-read-btn';
    readBtn.type = 'button';
    readBtn.setAttribute('aria-label', t('speakPage'));
    readBtn.innerHTML = '🔊 <span>' + t('readAloud') + '</span>';
    readBtn.onclick = function () { speakCurrentPage(); flashAlert(); };
    wrap.appendChild(readBtn);

    /* Accessibility button */
    var openBtn = document.createElement('button');
    openBtn.id = 'a11y-open-btn';
    openBtn.type = 'button';
    openBtn.setAttribute('aria-label', t('accessibilitySettings'));
    openBtn.innerHTML = '♿ <span>' + t('accessibility') + '</span>';
    openBtn.onclick = function () { _panelOpen = true; renderPanel(); };
    wrap.appendChild(openBtn);

    document.body.appendChild(wrap);

    /* Panel container */
    var panel = document.createElement('div');
    panel.id = 'a11y-panel';
    panel.setAttribute('aria-modal', 'true');
    document.body.appendChild(panel);
  }

  /* ══════════════════════════════════════════════════════════════════════
     13. PUBLIC API (window globals)
  ══════════════════════════════════════════════════════════════════════ */
  window._a11ySet   = function (k, v) { set(k, v); };
  window._a11yStop  = function () { stopSpeaking(); };
  window._a11yVoice = function () { toggleVoice(); };
  window._a11yClose = function () { _panelOpen = false; renderPanel(); };
  window._a11ySpeak = function (text) { speak(text); };
  window._a11yFlash = function () { flashAlert(); };

  /* Called by app.js after login to retranslate and re-hook */
  window._a11yRefresh = function () {
    /* Re-load from localStorage (settings may have been saved on login page) */
    loadSettings();
    applySettings();   /* applies lang, contrast, fontScale to DOM */
    hookToast();
    /* Greet if speech is on */
    if (A11Y.speech) {
      var hour = new Date().getHours();
      var greeting = hour < 12 ? t('goodMorning') : hour < 18 ? t('goodAfternoon') : t('goodEvening');
      setTimeout(function () { speak(greeting); }, 900);
    }
  };

  /* ══════════════════════════════════════════════════════════════════════
     14. BOOT
  ══════════════════════════════════════════════════════════════════════ */
  function boot() {
    loadSettings();
    injectCSS();
    injectDOM();
    applySettings();
    /* Hook toast after a short delay to let app scripts load */
    setTimeout(hookToast, 1500);
    /* Re-hook whenever Router navigates */
    var origSetPage = null;
    /* MutationObserver watches for page content changes (more reliable than timer) */
    var _lastPage = '';
    var _renderTimer = null;

    function onPageRendered() {
      /* Debounce — only fire 600ms after DOM settles */
      clearTimeout(_renderTimer);
      _renderTimer = setTimeout(function() {
        translatePage();
        hookToast();
        if (A11Y.speech) {
          /* Read page title first, then full content */
          var h = document.querySelector('.page-title, h1, .auth-heading');
          var title = h ? h.innerText : '';
          var body  = readablePageText();
          var toRead = title
            ? title + '. ' + body.replace(title, '').trim()
            : body;
          speak(toRead);
        }
      }, 600);
    }

    /* Watch the NIHMS shell container for new page content */
    var observer = new MutationObserver(function(mutations) {
      var significant = mutations.some(function(m) {
        return m.addedNodes.length > 0 || m.type === 'characterData';
      });
      if (significant) onPageRendered();
    });

    /* Also hook Router.setPage as backup */
    var hookRouter = function () {
      if (window.Router && window.Router.setPage && !window.Router._a11yHooked) {
        origSetPage = window.Router.setPage.bind(window.Router);
        window.Router.setPage = function (page) {
          origSetPage(page);
          onPageRendered();
        };
        window.Router._a11yHooked = true;
      }
      /* Start observing the app shell once it exists */
      var shell = document.querySelector('.app-body, #app, #root, main, .app-shell');
      if (shell && !shell._a11yObserved) {
        observer.observe(shell, { childList: true, subtree: true, characterData: false });
        shell._a11yObserved = true;
      }
    };
    setTimeout(hookRouter, 500);
    setTimeout(hookRouter, 1500);
    setTimeout(hookRouter, 3000);
    /* Keep trying until app shell exists */
    var retryInterval = setInterval(function() {
      var shell = document.querySelector('.app-body, #app, #root, main, .app-shell');
      if (shell && !shell._a11yObserved) {
        hookRouter();
        clearInterval(retryInterval);
      }
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
