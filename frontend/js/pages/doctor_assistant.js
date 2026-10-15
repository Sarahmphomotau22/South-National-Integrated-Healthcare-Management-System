/**
 * js/pages/doctor_assistant.js
 * NIHMS Clinical Decision Support — Doctor AI Assistant
 * 
 * Features:
 * - Symptom checker with NLP structured output
 * - ICD-10 code lookup and suggestion
 * - Treatment recommendations
 * - Drug interaction checking
 * - EHR context (patient vitals, labs, meds pulled from current session)
 * - All powered through /api/v1/auth/chat with clinical system prompt
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ════════════════════════════════════════════════════════════════════
   ICD-10 LOCAL LOOKUP TABLE (common South African primary care codes)
════════════════════════════════════════════════════════════════════ */
const ICD10 = [
  { code:'I10',   desc:'Essential (primary) hypertension',                 keywords:['hypertension','high blood pressure','hbp','bp elevated'] },
  { code:'E11',   desc:'Type 2 diabetes mellitus',                         keywords:['diabetes','type 2','t2dm','hyperglycaemia','high sugar'] },
  { code:'E10',   desc:'Type 1 diabetes mellitus',                         keywords:['type 1 diabetes','t1dm','insulin dependent'] },
  { code:'J06.9', desc:'Acute upper respiratory infection, unspecified',    keywords:['uri','cold','flu','upper respiratory','cough fever','runny nose'] },
  { code:'J18.9', desc:'Pneumonia, unspecified organism',                   keywords:['pneumonia','chest infection','lower respiratory'] },
  { code:'J45.9', desc:'Asthma, unspecified',                               keywords:['asthma','wheeze','wheezing','bronchospasm'] },
  { code:'K21.0', desc:'Gastro-oesophageal reflux with oesophagitis',       keywords:['gerd','gord','reflux','heartburn','acid'] },
  { code:'K29.7', desc:'Gastritis, unspecified',                            keywords:['gastritis','stomach pain','epigastric'] },
  { code:'N39.0', desc:'Urinary tract infection, site not specified',        keywords:['uti','urinary tract','dysuria','frequent urination'] },
  { code:'A09',   desc:'Other and unspecified gastroenteritis',             keywords:['gastro','diarrhoea','vomiting','nausea vomiting','stomach bug'] },
  { code:'M54.5', desc:'Low back pain',                                     keywords:['back pain','lower back','lumbar','lbp'] },
  { code:'G43.9', desc:'Migraine, unspecified',                             keywords:['migraine','headache','severe headache'] },
  { code:'F41.1', desc:'Generalised anxiety disorder',                      keywords:['anxiety','gad','worry','anxious'] },
  { code:'F32.1', desc:'Moderate depressive episode',                       keywords:['depression','depressed','low mood','sad'] },
  { code:'B20',   desc:'HIV disease resulting in infectious diseases',       keywords:['hiv','aids','immunocompromised'] },
  { code:'Z21',   desc:'Asymptomatic HIV infection status',                 keywords:['hiv positive','hiv+','art'] },
  { code:'A15',   desc:'Respiratory tuberculosis',                           keywords:['tb','tuberculosis','cough weeks','haemoptysis'] },
  { code:'E78.5', desc:'Hyperlipidaemia, unspecified',                      keywords:['hyperlipidaemia','high cholesterol','dyslipidaemia'] },
  { code:'I25.1', desc:'Atherosclerotic heart disease',                     keywords:['coronary','cad','ihd','angina','chest tightness exertion'] },
  { code:'I50.9', desc:'Heart failure, unspecified',                        keywords:['heart failure','ccf','cardiac failure','oedema dyspnoea'] },
  { code:'N18.3', desc:'Chronic kidney disease, stage 3',                   keywords:['ckd','chronic kidney','renal impairment','egfr'] },
  { code:'E04.1', desc:'Non-toxic single thyroid nodule',                   keywords:['thyroid','hypothyroid','hyperthyroid','tsh abnormal'] },
  { code:'L30.9', desc:'Dermatitis, unspecified',                           keywords:['rash','dermatitis','eczema','skin rash'] },
  { code:'B35.1', desc:'Tinea unguium',                                     keywords:['tinea','fungal','ringworm','candida'] },
  { code:'J30.1', desc:'Allergic rhinitis due to pollen',                   keywords:['allergic rhinitis','hay fever','allergy sneezing'] },
  { code:'H66.9', desc:'Otitis media, unspecified',                         keywords:['ear infection','otitis','ear pain','otalgia'] },
  { code:'R05',   desc:'Cough',                                             keywords:['cough','dry cough','productive cough'] },
  { code:'R50.9', desc:'Fever, unspecified',                                keywords:['fever','pyrexia','temperature elevated'] },
  { code:'R10.0', desc:'Acute abdomen',                                     keywords:['abdominal pain','belly pain','stomach ache'] },
  { code:'R00.0', desc:'Tachycardia, unspecified',                          keywords:['palpitations','fast heart rate','tachycardia'] },
  { code:'O20.0', desc:'Threatened abortion',                               keywords:['miscarriage','bleeding pregnancy','threatened abortion'] },
  { code:'O14.1', desc:'Severe pre-eclampsia',                              keywords:['pre-eclampsia','preeclampsia','hypertension pregnancy'] },
  { code:'Z34.0', desc:'Supervision of normal first pregnancy',             keywords:['antenatal','pregnancy','ante natal','booking visit'] },
];

function icd10Suggest(text) {
  const lower = text.toLowerCase();
  return ICD10.filter(r => r.keywords.some(k => lower.includes(k)))
              .slice(0, 5);
}

/* ════════════════════════════════════════════════════════════════════
   DRUG INTERACTION CHECKER (quick local check)
════════════════════════════════════════════════════════════════════ */
const INTERACTIONS = [
  { drugs:['warfarin','aspirin'],        severity:'HIGH',   effect:'Increased bleeding risk — monitor INR closely.' },
  { drugs:['warfarin','ibuprofen'],      severity:'HIGH',   effect:'Increased bleeding risk and GI bleeding.' },
  { drugs:['warfarin','amoxicillin'],    severity:'MEDIUM', effect:'May potentiate anticoagulant effect — check INR.' },
  { drugs:['metformin','alcohol'],       severity:'MEDIUM', effect:'Risk of lactic acidosis with heavy alcohol use.' },
  { drugs:['simvastatin','erythromycin'],severity:'HIGH',   effect:'Risk of myopathy/rhabdomyolysis.' },
  { drugs:['ace inhibitor','potassium'], severity:'MEDIUM', effect:'Risk of hyperkalaemia.' },
  { drugs:['ssri','tramadol'],           severity:'HIGH',   effect:'Risk of serotonin syndrome.' },
  { drugs:['methotrexate','nsaid'],      severity:'HIGH',   effect:'Increased methotrexate toxicity.' },
  { drugs:['digoxin','amiodarone'],      severity:'HIGH',   effect:'Increased digoxin toxicity — monitor levels.' },
  { drugs:['ciprofloxacin','warfarin'],  severity:'HIGH',   effect:'Potentiates warfarin — monitor INR.' },
  { drugs:['lithium','ibuprofen'],       severity:'HIGH',   effect:'Increased lithium toxicity.' },
  { drugs:['tenofovir','nsaid'],         severity:'MEDIUM', effect:'Risk of nephrotoxicity — monitor renal function.' },
  { drugs:['efavirenz','rifampicin'],    severity:'HIGH',   effect:'Reduced efavirenz levels — dose adjustment needed.' },
];

function checkInteractions(medList) {
  const lower = medList.map(m => m.toLowerCase());
  return INTERACTIONS.filter(rule =>
    rule.drugs.every(d => lower.some(m => m.includes(d)))
  );
}

/* ════════════════════════════════════════════════════════════════════
   BUILD CLINICAL SYSTEM PROMPT WITH EHR CONTEXT
════════════════════════════════════════════════════════════════════ */
function buildClinicalPrompt(patient, vitals, medications, labResults) {
  const v = vitals || {};
  const meds = (medications || []).map(m => m.name || m.medicationName || m).join(', ') || 'None recorded';
  const labs = (labResults || []).map(l => `${l.name}: ${l.result} ${l.unit || ''} (${l.flag || 'normal'})`).join('; ') || 'None available';

  const bpStr = v.bp ? `${v.bp.systolic}/${v.bp.diastolic} mmHg` : v.sbp ? `${v.sbp}/${v.dbp} mmHg` : 'Not recorded';

  return `You are a clinical decision support AI assistant for NIHMS (National Integrated Healthcare Management System), South Africa. You assist qualified doctors with clinical reasoning. You do NOT replace the doctor's judgement.

PATIENT CONTEXT (loaded from EHR):
${patient ? `- Name: ${patient.firstName || ''} ${patient.lastName || ''}
- Age: ${patient.age || patient.dob ? Math.floor((Date.now() - new Date(patient.dob)) / 31557600000) + 'y' : 'Unknown'}
- Sex: ${patient.sex || patient.gender || 'Not recorded'}
- Blood type: ${patient.bloodType || 'Not recorded'}
- Allergies: ${(patient.allergies || []).join(', ') || 'None recorded'}` : '- No patient loaded in current session'}

CURRENT VITALS:
- BP: ${bpStr}
- HR: ${v.heartRate || v.hr || 'Not recorded'} bpm
- Temp: ${v.temperature || v.temp || 'Not recorded'}°C
- SpO2: ${v.spO2 || v.spo2 || 'Not recorded'}%
- Weight: ${v.weight || 'Not recorded'} kg
- BMI: ${v.bmi || 'Not recorded'}

CURRENT MEDICATIONS: ${meds}

RECENT LAB RESULTS: ${labs}

RESPONSE RULES — follow exactly:
1. Always structure your response with these sections where applicable:
   ASSESSMENT: One paragraph clinical summary
   DIFFERENTIAL DIAGNOSIS: Numbered list (most likely first), include ICD-10 codes
   RECOMMENDED INVESTIGATIONS: Bulleted list
   TREATMENT CONSIDERATIONS: Numbered steps (always say "consider" not "prescribe")
   RED FLAGS: Any urgent findings requiring immediate action
   NOTE: Always end with "Final clinical decision rests with the attending physician."

2. Use South African clinical guidelines (SAMF, DOH guidelines, NHI formulary)
3. Reference ICD-10 codes for diagnoses
4. Flag drug interactions with current medications if relevant
5. Keep responses concise and evidence-based
6. Never diagnose definitively — use "consistent with", "suggestive of", "consider"
7. Plain text only — no markdown asterisks or hashes`;
}

/* ════════════════════════════════════════════════════════════════════
   STRUCTURED OUTPUT PARSER
   Parses AI response into sections for display
════════════════════════════════════════════════════════════════════ */
function parseStructuredResponse(text) {
  const sections = {
    assessment:      '',
    differential:    '',
    investigations:  '',
    treatment:       '',
    redFlags:        '',
    note:            '',
    raw:             text,
  };

  const patterns = [
    ['assessment',     /ASSESSMENT[:\s]*/i],
    ['differential',   /DIFFERENTIAL\s+DIAGNOSIS[:\s]*/i],
    ['investigations', /RECOMMENDED\s+INVESTIGATIONS[:\s]*/i],
    ['treatment',      /TREATMENT\s+CONSIDERATIONS[:\s]*/i],
    ['redFlags',       /RED\s+FLAGS[:\s]*/i],
    ['note',           /NOTE[:\s]*/i],
  ];

  // Split text by section headers
  let remaining = text;
  const order = patterns.map(([key, rx]) => ({ key, rx, idx: text.search(rx) }))
                        .filter(s => s.idx >= 0)
                        .sort((a, b) => a.idx - b.idx);

  for (let i = 0; i < order.length; i++) {
    const start = order[i].idx;
    const end   = order[i + 1] ? order[i + 1].idx : text.length;
    sections[order[i].key] = text.slice(start, end).replace(order[i].rx, '').trim();
  }

  return sections;
}

/* ════════════════════════════════════════════════════════════════════
   RENDER HELPERS
════════════════════════════════════════════════════════════════════ */
function _da_badge(text, color) {
  const bg = { red:'#FEF2F2', amber:'#FFF9E6', green:'#EDFBF3', blue:'#EEF7FF', gray:'#f5f5f5' };
  const fg = { red:'var(--red)', amber:'#7A5C10', green:'var(--green-dark)', blue:'#1A4A9B', gray:'#555' };
  return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${bg[color]||bg.gray};color:${fg[color]||fg.gray}">${text}</span>`;
}

function _da_section(icon, title, content, borderColor) {
  if (!content || !content.trim()) return '';
  return `<div style="margin-bottom:12px;border-left:3px solid ${borderColor};padding:10px 14px;background:var(--bg-surface);border-radius:0 10px 10px 0">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${borderColor};margin-bottom:6px">
      <i class="ti ${icon}" style="margin-right:4px"></i>${title}
    </div>
    <div style="font-size:13px;line-height:1.7;white-space:pre-line">${content}</div>
  </div>`;
}

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════ */
/* Register clinical decision support under its own page key.
   Pages['assistant'] is left untouched — it remains the patient NOMI chatbot.
   The doctor portal links to 'doc_assistant' via the doctor.js nav. */
Pages['doc_assistant'] = function() {
  return _doctorAssistantPage();
};

function _doctorAssistantPage() {
  window._DA = {
    patient:     window._dcCurrentPatient || null,
    vitals:      window._dcCurrentVitals  || null,
    medications: window._dcCurrentMeds    || [],
    labs:        window._dcCurrentLabs    || [],
    history:     [],
    loading:     false,
  };

  setTimeout(_daInit, 100);

  return `
<div class="page-title" style="display:flex;align-items:center;gap:10px">
  <i class="ti ti-brain-circuit" style="font-size:22px;color:var(--green-dark)"></i>
  Clinical Decision Support
</div>
<p style="font-size:13px;color:var(--text-muted);margin:-14px 0 16px">AI-assisted symptom analysis · ICD-10 mapping · Treatment guidance · EHR context</p>

<div style="display:grid;grid-template-columns:1fr 340px;gap:16px;align-items:start;max-width:1200px">

  <!-- LEFT: Main clinical workspace -->
  <div>

    <!-- Patient context banner -->
    <div id="da-patient-banner" style="margin-bottom:12px"></div>

    <!-- Drug interaction alert -->
    <div id="da-interaction-banner" style="margin-bottom:12px"></div>

    <!-- Input card -->
    <div style="background:var(--bg-card);border-radius:14px;border:1px solid var(--border);padding:18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:8px">
        <i class="ti ti-stethoscope" style="color:var(--green-dark)"></i>
        Symptom input & clinical query
      </div>

      <!-- Mode tabs -->
      <div style="display:flex;gap:4px;margin-bottom:12px;background:var(--bg-surface);border-radius:8px;padding:3px">
        <button id="da-mode-symptom" onclick="_daSetMode('symptom')"
          style="flex:1;padding:7px;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;background:var(--green-dark);color:#fff">
          <i class="ti ti-search"></i> Symptom checker
        </button>
        <button id="da-mode-icd" onclick="_daSetMode('icd')"
          style="flex:1;padding:7px;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;background:transparent;color:var(--text-muted)">
          <i class="ti ti-code"></i> ICD-10 lookup
        </button>
        <button id="da-mode-drug" onclick="_daSetMode('drug')"
          style="flex:1;padding:7px;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;background:transparent;color:var(--text-muted)">
          <i class="ti ti-pill"></i> Drug check
        </button>
        <button id="da-mode-free" onclick="_daSetMode('free')"
          style="flex:1;padding:7px;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;background:transparent;color:var(--text-muted)">
          <i class="ti ti-message"></i> Free query
        </button>
      </div>

      <!-- Symptom mode -->
      <div id="da-panel-symptom">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Enter presenting symptoms, duration, and relevant history:</div>
        <textarea id="da-symptom-input" rows="4" placeholder="e.g. 44-year-old female, 3-day history of productive cough, fever 38.4°C, right-sided chest pain on inspiration. History of hypertension and type 2 diabetes. No TB contact. SpO2 94% on room air."
          style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box;line-height:1.6"
          onkeydown="if(event.ctrlKey&&event.key==='Enter')_daSymptomCheck()"></textarea>

        <!-- ICD-10 suggestions (live) -->
        <div id="da-icd-suggestions" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px"></div>

        <div style="display:flex;gap:8px;margin-top:10px">
          <button onclick="_daSymptomCheck()"
            style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--green-dark);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px">
            <i class="ti ti-brain-circuit"></i>Analyse symptoms
          </button>
          <button onclick="_daClear()"
            style="padding:11px 16px;border-radius:10px;border:1.5px solid var(--border);background:transparent;color:var(--text-muted);font-size:13px;cursor:pointer;font-family:inherit">
            Clear
          </button>
        </div>
        <div style="font-size:11px;color:var(--text-hint);margin-top:6px">Ctrl+Enter to analyse · Uses patient EHR context automatically</div>
      </div>

      <!-- ICD-10 mode -->
      <div id="da-panel-icd" style="display:none">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Search ICD-10 codes by diagnosis name or keyword:</div>
        <div style="display:flex;gap:8px">
          <input id="da-icd-search" placeholder="e.g. hypertension, diabetes, pneumonia…"
            style="flex:1;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-family:inherit;outline:none"
            oninput="_daIcdSearch(this.value)">
        </div>
        <div id="da-icd-results" style="margin-top:10px"></div>
      </div>

      <!-- Drug check mode -->
      <div id="da-panel-drug" style="display:none">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Enter medications to check for interactions (comma-separated):</div>
        <input id="da-drug-input" placeholder="e.g. warfarin, amoxicillin, ibuprofen"
          style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box"
          oninput="_daDrugCheck(this.value)">
        <div id="da-drug-results" style="margin-top:10px"></div>
      </div>

      <!-- Free query mode -->
      <div id="da-panel-free" style="display:none">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Ask any clinical question:</div>
        <textarea id="da-free-input" rows="3" placeholder="e.g. What is the first-line treatment for uncomplicated UTI in pregnancy? What are the SA DOH guidelines for hypertension management?"
          style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box;line-height:1.6"
          onkeydown="if(event.ctrlKey&&event.key==='Enter')_daFreeQuery()"></textarea>
        <button onclick="_daFreeQuery()"
          style="margin-top:8px;width:100%;padding:11px;border-radius:10px;border:none;background:var(--green-dark);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">
          <i class="ti ti-send"></i> Ask AI
        </button>
      </div>
    </div>

    <!-- AI Response area -->
    <div id="da-response-area"></div>

    <!-- History -->
    <div id="da-history" style="display:none;margin-top:4px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:8px">Previous queries this session</div>
      <div id="da-history-list" style="display:flex;flex-direction:column;gap:6px"></div>
    </div>
  </div>

  <!-- RIGHT: Reference panels -->
  <div style="display:flex;flex-direction:column;gap:12px">

    <!-- EHR context -->
    <div class="card" style="padding:16px">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
        <span><i class="ti ti-user-circle" style="color:var(--green-dark);margin-right:6px"></i>EHR context</span>
        <button onclick="_daLoadEHR()" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:transparent;cursor:pointer;font-family:inherit;color:var(--text-muted)">
          <i class="ti ti-refresh"></i> Reload
        </button>
      </div>
      <div id="da-ehr-panel" style="font-size:12px;color:var(--text-muted)">Loading patient context…</div>
    </div>

    <!-- Quick ICD-10 reference -->
    <div class="card" style="padding:16px">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px">
        <i class="ti ti-book" style="color:#1A4A9B;margin-right:6px"></i>Common ICD-10 (SA primary care)
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;max-height:220px;overflow-y:auto">
        ${ICD10.slice(0, 12).map(r =>
          `<div onclick="_daInsertIcd('${r.code}','${r.desc.replace(/'/g,"\\'")}') "
            style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;cursor:pointer;font-size:12px"
            onmouseover="this.style.background='var(--bg-surface)'" onmouseout="this.style.background=''">
            <span style="font-family:monospace;font-size:11px;font-weight:700;color:#1A4A9B;min-width:48px">${r.code}</span>
            <span style="color:var(--text)">${r.desc}</span>
          </div>`
        ).join('')}
      </div>
    </div>

    <!-- Disclaimer -->
    <div style="padding:12px 14px;background:#FFF9E6;border-radius:10px;border:1px solid #E0C070;font-size:11px;color:#7A5C10;line-height:1.6">
      ⚕️ <strong>Clinical decision support only.</strong> All recommendations are for qualified healthcare professionals. Final diagnosis and treatment decisions rest with the attending physician. Verify against current SA DOH guidelines and SAMF before prescribing.
    </div>
  </div>
</div>`;
}

/* ════════════════════════════════════════════════════════════════════
   INIT & EHR LOADING
════════════════════════════════════════════════════════════════════ */
function _daInit() {
  _daLoadEHR();
  _daRenderInteractionBanner();

  /* Live ICD-10 suggestions while typing symptoms */
  var inp = document.getElementById('da-symptom-input');
  if (inp) {
    inp.addEventListener('input', function() {
      var sugg = icd10Suggest(this.value);
      var el   = document.getElementById('da-icd-suggestions');
      if (!el) return;
      el.innerHTML = sugg.map(r =>
        `<button onclick="_daInsertIcd('${r.code}','${r.desc.replace(/'/g,"\\'")}');"
          style="padding:3px 10px;border-radius:20px;border:1px solid #1A4A9B20;background:#EEF7FF;color:#1A4A9B;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">
          ${r.code} · ${r.desc.slice(0,30)}${r.desc.length>30?'…':''}
        </button>`
      ).join('');
    });
  }
}

async function _daLoadEHR() {
  var el = document.getElementById('da-ehr-panel');
  var banner = document.getElementById('da-patient-banner');
  if (!el) return;

  /* Try to get patient from current consultation session */
  var patient = window._dcCurrentPatient || window._DA?.patient;
  var vitals  = window._dcCurrentVitals  || window._DA?.vitals;
  var meds    = window._dcCurrentMeds    || window._DA?.medications || [];
  var labs    = window._dcCurrentLabs    || window._DA?.labs || [];

  if (!patient) {
    /* Try to fetch last consulted patient */
    try {
      var u = API.getStoredUser();
      if (u && u._id) {
        var apptRes = await API.appointments.list({ doctor: u._id, status: 'in_progress', limit: 1 });
        var appt = apptRes.data && apptRes.data[0];
        if (appt && appt.patient) {
          patient = typeof appt.patient === 'object' ? appt.patient : { _id: appt.patient };
          vitals  = appt.vitals || {};
        }
      }
    } catch(_) {}
  }

  window._DA.patient     = patient;
  window._DA.vitals      = vitals;
  window._DA.medications = meds;
  window._DA.labs        = labs;

  if (!patient) {
    el.innerHTML = `<div style="text-align:center;padding:12px;color:var(--text-muted)">
      <i class="ti ti-user-x" style="font-size:24px;opacity:.3;display:block;margin-bottom:6px"></i>
      No active patient.<br>Open a consultation to load EHR context.
    </div>`;
    if (banner) banner.innerHTML = '';
    return;
  }

  var v = vitals || {};
  var age = patient.dob ? Math.floor((Date.now() - new Date(patient.dob)) / 31557600000) : '—';
  var bpStr = v.bp ? `${v.bp.systolic}/${v.bp.diastolic}` : '—';

  /* EHR panel */
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px">
      ${[
        ['Name',     `${patient.firstName||''} ${patient.lastName||''}`],
        ['Age/Sex',  `${age}y ${patient.sex||patient.gender||'—'}`],
        ['MRN',      patient.mrn || '—'],
        ['Blood',    patient.bloodType || '—'],
      ].map(([l,v]) => `<div><span style="color:var(--text-hint)">${l}:</span> <strong>${v}</strong></div>`).join('')}
    </div>
    ${patient.allergies && patient.allergies.length ?
      `<div style="padding:4px 8px;background:#FEF2F2;border-radius:6px;font-size:11px;color:var(--red);margin-bottom:6px">
        ⚠️ Allergies: ${patient.allergies.join(', ')}
      </div>` : ''}
    <div style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px">
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:4px">VITALS</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;font-size:12px">
        ${[['BP',bpStr+' mmHg'],['HR',(v.heartRate||v.hr||'—')+' bpm'],['Temp',(v.temperature||v.temp||'—')+'°C'],['SpO2',(v.spO2||v.spo2||'—')+'%']].map(([l,val])=>`<div>${l}: <strong>${val}</strong></div>`).join('')}
      </div>
    </div>
    ${meds.length ? `<div style="border-top:1px solid var(--border);padding-top:8px;margin-top:6px">
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:4px">MEDICATIONS</div>
      <div style="font-size:12px">${meds.map(m => m.name||m.medicationName||m).join(' · ')}</div>
    </div>` : ''}
    ${labs.length ? `<div style="border-top:1px solid var(--border);padding-top:8px;margin-top:6px">
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:4px">RECENT LABS</div>
      <div style="font-size:12px">${labs.map(l => `${l.name}: ${l.result}${l.unit?' '+l.unit:''}`).join(' · ')}</div>
    </div>` : ''}`;

  /* Patient context banner */
  if (banner) {
    banner.innerHTML = `<div style="padding:10px 14px;background:var(--green-light);border-radius:10px;border:1px solid var(--green);display:flex;align-items:center;gap:10px;font-size:13px">
      <div style="width:36px;height:36px;border-radius:50%;background:var(--green-dark);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">
        ${((patient.firstName||'?')[0]+(patient.lastName||'?')[0]).toUpperCase()}
      </div>
      <div>
        <strong>${patient.firstName||''} ${patient.lastName||''}</strong> · ${age}y · ${patient.sex||'—'} · MRN: ${patient.mrn||'—'}
        <div style="font-size:11px;color:var(--green-dark)">EHR context loaded — AI responses will consider this patient's data</div>
      </div>
    </div>`;
  }

  /* Check drug interactions with current meds */
  _daRenderInteractionBanner();
}

function _daRenderInteractionBanner() {
  var banner = document.getElementById('da-interaction-banner');
  if (!banner) return;
  var meds = window._DA && window._DA.medications || [];
  if (!meds.length) { banner.innerHTML = ''; return; }
  var medNames = meds.map(m => m.name||m.medicationName||String(m));
  var interactions = checkInteractions(medNames);
  if (!interactions.length) { banner.innerHTML = ''; return; }
  banner.innerHTML = interactions.map(ix =>
    `<div style="padding:8px 14px;background:#FEF2F2;border-left:4px solid var(--red);border-radius:0 8px 8px 0;font-size:12px;margin-bottom:6px">
      <strong>⚠️ Drug interaction (${ix.severity}):</strong> ${ix.drugs.join(' + ')} — ${ix.effect}
    </div>`
  ).join('');
}

/* ════════════════════════════════════════════════════════════════════
   MODE SWITCHING
════════════════════════════════════════════════════════════════════ */
window._daSetMode = function(mode) {
  ['symptom','icd','drug','free'].forEach(m => {
    var panel = document.getElementById('da-panel-'+m);
    var btn   = document.getElementById('da-mode-'+m);
    if (panel) panel.style.display = m === mode ? 'block' : 'none';
    if (btn) {
      btn.style.background = m === mode ? 'var(--green-dark)' : 'transparent';
      btn.style.color      = m === mode ? '#fff' : 'var(--text-muted)';
      btn.style.fontWeight = m === mode ? '700' : '600';
    }
  });
  window._DA.mode = mode;
};

/* ════════════════════════════════════════════════════════════════════
   SYMPTOM CHECKER
════════════════════════════════════════════════════════════════════ */
window._daSymptomCheck = async function() {
  var input = (document.getElementById('da-symptom-input')||{value:''}).value.trim();
  if (!input) { UI.showToast('Please enter symptoms before analysing','err'); return; }
  await _daQuery('symptom', input);
};

/* ════════════════════════════════════════════════════════════════════
   ICD-10 SEARCH
════════════════════════════════════════════════════════════════════ */
window._daIcdSearch = function(q) {
  var el = document.getElementById('da-icd-results');
  if (!el) return;
  if (q.length < 2) { el.innerHTML = ''; return; }
  var results = ICD10.filter(r =>
    r.code.toLowerCase().includes(q.toLowerCase()) ||
    r.desc.toLowerCase().includes(q.toLowerCase()) ||
    r.keywords.some(k => k.includes(q.toLowerCase()))
  );
  el.innerHTML = results.length
    ? results.map(r =>
        `<div onclick="_daInsertIcd('${r.code}','${r.desc.replace(/'/g,"\\'")}')"
          style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;border:1px solid var(--border);margin-bottom:6px"
          onmouseover="this.style.background='var(--bg-surface)'" onmouseout="this.style.background=''">
          <span style="font-family:monospace;font-size:12px;font-weight:700;color:#1A4A9B;min-width:52px">${r.code}</span>
          <span style="font-size:13px">${r.desc}</span>
          <button style="margin-left:auto;padding:3px 10px;border-radius:6px;border:1px solid var(--green);background:transparent;color:var(--green-dark);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Use</button>
        </div>`
      ).join('')
    : `<div style="font-size:13px;color:var(--text-muted);padding:8px">No ICD-10 codes found for "${q}"</div>`;
};

window._daInsertIcd = function(code, desc) {
  /* Switch to symptom mode and append the ICD-10 code */
  _daSetMode('symptom');
  var inp = document.getElementById('da-symptom-input');
  if (inp) {
    inp.value = inp.value + (inp.value ? '\nSuspected diagnosis: ' : '') + code + ' — ' + desc;
    inp.focus();
  }
};

/* ════════════════════════════════════════════════════════════════════
   DRUG INTERACTION CHECKER
════════════════════════════════════════════════════════════════════ */
window._daDrugCheck = function(val) {
  var el = document.getElementById('da-drug-results');
  if (!el || !val.trim()) { if(el) el.innerHTML=''; return; }
  var medList = val.split(',').map(s => s.trim()).filter(Boolean);
  if (medList.length < 2) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">Enter at least 2 medications to check interactions.</div>';
    return;
  }
  var found = checkInteractions(medList);
  /* Also include current patient meds */
  var allMeds = [...medList, ...(window._DA.medications||[]).map(m => m.name||m.medicationName||m)];
  var withEHR = checkInteractions(allMeds);

  el.innerHTML = withEHR.length
    ? withEHR.map(ix =>
        `<div style="padding:10px 12px;border-radius:8px;border-left:4px solid ${ix.severity==='HIGH'?'var(--red)':'var(--amber)'};background:${ix.severity==='HIGH'?'#FEF2F2':'#FFF9E6'};margin-bottom:8px">
          <div style="font-size:12px;font-weight:700;color:${ix.severity==='HIGH'?'var(--red)':'#7A5C10'};margin-bottom:3px">
            ${ix.severity} severity — ${ix.drugs.join(' + ')}
          </div>
          <div style="font-size:13px">${ix.effect}</div>
        </div>`
      ).join('')
    : `<div style="padding:10px 12px;border-radius:8px;background:#EDFBF3;border-left:4px solid var(--green);font-size:13px;color:var(--green-dark)">
        ✅ No significant interactions detected among the listed medications.
      </div>`;
};

/* ════════════════════════════════════════════════════════════════════
   FREE QUERY
════════════════════════════════════════════════════════════════════ */
window._daFreeQuery = async function() {
  var input = (document.getElementById('da-free-input')||{value:''}).value.trim();
  if (!input) { UI.showToast('Please enter your question','err'); return; }
  await _daQuery('free', input);
};

/* ════════════════════════════════════════════════════════════════════
   CORE AI QUERY FUNCTION
════════════════════════════════════════════════════════════════════ */
async function _daQuery(type, userInput) {
  if (window._DA.loading) return;
  window._DA.loading = true;

  var area = document.getElementById('da-response-area');
  if (!area) return;

  /* Loading state */
  area.innerHTML = `<div style="background:var(--bg-card);border-radius:14px;border:1px solid var(--border);padding:24px;text-align:center">
    <div style="display:inline-flex;align-items:center;gap:10px;color:var(--text-muted)">
      <div class="spinner" style="width:18px;height:18px;border-width:2px"></div>
      <span style="font-size:14px">Analysing${type==='symptom'?' symptoms':''} with clinical AI…</span>
    </div>
    <div style="font-size:11px;color:var(--text-hint);margin-top:8px">Using patient EHR context · Checking SA clinical guidelines</div>
  </div>`;

  try {
    /* Build system prompt with EHR context */
    var systemPrompt = buildClinicalPrompt(
      window._DA.patient,
      window._DA.vitals,
      window._DA.medications,
      window._DA.labs
    );

    /* Prefix the query with type context */
    var query = type === 'symptom'
      ? `SYMPTOM PRESENTATION:\n${userInput}\n\nPlease provide structured clinical assessment.`
      : userInput;

    /* Call backend AI */
    var res = await API._fetchDirect('/auth/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages:     [{ role: 'user', content: query }],
        systemPrompt: systemPrompt,
      })
    });

    var reply = res?.reply || 'No response received. Please try again.';

    /* Parse structured response */
    var parsed = parseStructuredResponse(reply);

    /* Suggest ICD-10 codes from the response text */
    var icdSuggestions = icd10Suggest(reply);

    /* Render structured response */
    area.innerHTML = `
      <div style="background:var(--bg-card);border-radius:14px;border:1px solid var(--border);padding:18px;margin-bottom:8px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px">
            <i class="ti ti-brain-circuit" style="font-size:16px;color:var(--green-dark)"></i>
            <span style="font-size:14px;font-weight:700">Clinical analysis</span>
          </div>
          <div style="display:flex;gap:6px">
            <button onclick="_daCopyResponse()" style="padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:transparent;font-size:12px;cursor:pointer;font-family:inherit">
              <i class="ti ti-copy"></i> Copy
            </button>
            <button onclick="_daAddToNotes()" style="padding:5px 12px;border-radius:6px;border:none;background:var(--green-dark);color:#fff;font-size:12px;cursor:pointer;font-family:inherit">
              <i class="ti ti-notes"></i> Add to notes
            </button>
          </div>
        </div>

        ${parsed.assessment     ? _da_section('ti-clipboard-check','Assessment',        parsed.assessment,    '#1D9E75') : ''}
        ${parsed.differential   ? _da_section('ti-list-numbers',   'Differential diagnosis', parsed.differential, '#1A4A9B') : ''}
        ${parsed.investigations ? _da_section('ti-flask',          'Recommended investigations', parsed.investigations, '#7C3AED') : ''}
        ${parsed.treatment      ? _da_section('ti-pill',           'Treatment considerations', parsed.treatment, '#EF9F27') : ''}
        ${parsed.redFlags       ? _da_section('ti-alert-triangle', 'Red flags',         parsed.redFlags,      'var(--red)') : ''}
        ${!parsed.assessment && !parsed.differential ? `<div style="font-size:13px;line-height:1.7;white-space:pre-line">${reply}</div>` : ''}

        ${icdSuggestions.length ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:6px">
              Suggested ICD-10 codes
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${icdSuggestions.map(r =>
                `<button onclick="document.getElementById('icd10-input')&&(document.getElementById('icd10-input').value='${r.code}');UI.showToast('ICD-10 ${r.code} copied to consultation','ok')"
                  style="padding:4px 12px;border-radius:20px;border:1.5px solid #1A4A9B30;background:#EEF7FF;color:#1A4A9B;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">
                  ${r.code} · ${r.desc.slice(0,28)}${r.desc.length>28?'…':''}
                </button>`
              ).join('')}
            </div>
          </div>` : ''}

        ${parsed.note ? `<div style="margin-top:12px;padding:8px 12px;background:#FFF9E6;border-radius:8px;font-size:11px;color:#7A5C10">${parsed.note}</div>` : ''}
        <div style="margin-top:10px;padding:8px 12px;background:var(--bg-surface);border-radius:8px;font-size:11px;color:var(--text-muted)">
          ⚕️ Clinical decision support only · Verify against current SA DOH guidelines · Final decision rests with attending physician
        </div>
      </div>`;

    /* Save to session history */
    window._DA.history.unshift({ query: userInput.slice(0, 60), reply, timestamp: new Date() });
    window._DA.loading = false;
    window._currentDAReply = reply;
    _daRenderHistory();

  } catch(e) {
    window._DA.loading = false;
    area.innerHTML = `<div style="padding:14px;background:#FEF2F2;border-radius:10px;border-left:4px solid var(--red);font-size:13px">
      <strong>AI service error:</strong> ${e.message || 'Could not reach AI service. Please try again.'}
    </div>`;
  }
}

/* ════════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
════════════════════════════════════════════════════════════════════ */
window._daClear = function() {
  var inp = document.getElementById('da-symptom-input');
  if (inp) inp.value = '';
  var sugg = document.getElementById('da-icd-suggestions');
  if (sugg) sugg.innerHTML = '';
  var area = document.getElementById('da-response-area');
  if (area) area.innerHTML = '';
};

window._daCopyResponse = function() {
  var text = window._currentDAReply || '';
  if (!text) return;
  navigator.clipboard.writeText(text)
    .then(function() { UI.showToast('Clinical assessment copied to clipboard','ok'); })
    .catch(function() { UI.showToast('Could not copy — please select and copy manually','err'); });
};

window._daAddToNotes = function() {
  var text = window._currentDAReply || '';
  if (!text) return;
  /* Append to the consultation notes textarea if open */
  var notesEl = document.getElementById('notes-input');
  if (notesEl) {
    notesEl.value = notesEl.value + (notesEl.value ? '\n\n' : '') +
      '--- AI Clinical Assessment ---\n' + text + '\n--- End AI Assessment ---';
    UI.showToast('Assessment added to consultation notes','ok');
    Router.setPage('consult');
  } else {
    UI.showToast('Open a consultation first to add notes','err');
  }
};

function _daRenderHistory() {
  var histEl = document.getElementById('da-history');
  var listEl = document.getElementById('da-history-list');
  if (!histEl || !listEl) return;
  var h = window._DA.history || [];
  if (!h.length) { histEl.style.display = 'none'; return; }
  histEl.style.display = 'block';
  listEl.innerHTML = h.slice(0, 5).map((item, i) =>
    `<div onclick="_daShowHistory(${i})" style="padding:8px 12px;background:var(--bg-surface);border-radius:8px;cursor:pointer;font-size:12px"
      onmouseover="this.style.background='var(--bg-card)'" onmouseout="this.style.background='var(--bg-surface)'">
      <span style="color:var(--text-muted)">${item.timestamp.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · </span>
      ${item.query}${item.query.length>=60?'…':''}
    </div>`
  ).join('');
}

window._daShowHistory = function(i) {
  var item = (window._DA.history||[])[i];
  if (!item) return;
  window._currentDAReply = item.reply;
  var parsed = parseStructuredResponse(item.reply);
  var area = document.getElementById('da-response-area');
  if (area) {
    area.innerHTML = `<div style="background:var(--bg-card);border-radius:14px;border:1px solid var(--border);padding:18px">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Query: ${item.query}</div>
      ${parsed.assessment     ? _da_section('ti-clipboard-check','Assessment',             parsed.assessment,    '#1D9E75') : ''}
      ${parsed.differential   ? _da_section('ti-list-numbers',   'Differential diagnosis',  parsed.differential,  '#1A4A9B') : ''}
      ${parsed.investigations ? _da_section('ti-flask',          'Investigations',           parsed.investigations,'#7C3AED') : ''}
      ${parsed.treatment      ? _da_section('ti-pill',           'Treatment considerations', parsed.treatment,     '#EF9F27') : ''}
      ${parsed.redFlags       ? _da_section('ti-alert-triangle', 'Red flags',                parsed.redFlags,      'var(--red)') : ''}
      ${!parsed.assessment    ? `<div style="font-size:13px;line-height:1.7;white-space:pre-line">${item.reply}</div>` : ''}
    </div>`;
  }
};