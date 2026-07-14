/**
 * receptionist.js — Receptionist Dashboard matching wireframe
 * Patient Arrival · Queue Assignment · Communication Hub · Bookings Overview · Status Overview
 */
if (typeof Pages === 'undefined') window.Pages = {};

Pages['reception'] = () => {
  if (window._recInt) clearInterval(window._recInt);
  setTimeout(_recLoad, 0);
  window._recInt = setInterval(_recLoad, 15000);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-ZA', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const timeStr = now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

  return `
<style>
  .rec-card { background:var(--bg-card);border:1.5px solid var(--border);border-radius:var(--radius-xl);padding:16px }
  .rec-label { font-weight:700;font-size:14px;margin-bottom:12px }
  .rec-btn { width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg-card);font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;text-align:left;display:flex;align-items:center;gap:8px;transition:all .15s;margin-bottom:6px }
  .rec-btn:hover { background:var(--bg-surface) }
  .rec-btn-dark { background:#2C2C2A;color:#fff;border-color:#2C2C2A }
  .rec-btn-dark:hover { background:#444 }
  .rec-counter { display:flex;align-items:center;gap:4px;padding:5px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-weight:500 }
  .rec-stat { background:var(--bg-card);border:1.5px solid var(--border);border-radius:10px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between }
  .rec-stat-label { font-size:13px;color:var(--text-muted) }
  .rec-stat-val { font-size:22px;font-weight:900;color:var(--text) }
</style>

<!-- Top bar -->
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
  <div style="display:flex;align-items:center;gap:12px">
    <i class="ti ti-building-hospital" style="font-size:20px;color:var(--green-dark)"></i>
    <span style="font-weight:700;font-size:15px">NIHMS</span>
    <span style="color:var(--border)">|</span>
    <span id="rec-facility" style="font-size:14px;color:var(--text-muted)">Loading…</span>
  </div>
  <div style="font-size:13px;color:var(--text-muted)">${dateStr}, ${timeStr}</div>
</div>
<div class="page-title" style="text-align:center;margin-bottom:16px">Receptionist Dashboard</div>

<!-- Main 3-column grid -->
<div style="display:grid;grid-template-columns:280px 1fr 300px;gap:14px;align-items:start">

  <!-- ═══ LEFT: Patient Arrival ═══ -->
  <div style="display:flex;flex-direction:column;gap:12px">
    <div class="rec-card">
      <div class="rec-label">Patient Arrival</div>
      <!-- Search -->
      <div style="position:relative;margin-bottom:10px">
        <input id="rec-search" type="text" placeholder="Search Patient by ID/Name…"
          style="width:100%;padding:9px 36px 9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;outline:none"
          oninput="_recSearch(this.value)"
          onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border)'">
        <i class="ti ti-search" style="position:absolute;right:11px;top:50%;transform:translateY(-50%);color:#aaa;font-size:15px"></i>
      </div>
      <div id="rec-search-results" style="margin-bottom:8px"></div>

      <!-- Today's appointments quick list -->
      <div id="rec-today-appts" style="margin-bottom:10px"></div>

      <!-- Action buttons -->
      <button class="rec-btn" onclick="_recShowWI()">
        <i class="ti ti-user-plus" style="font-size:15px;color:var(--green-dark)"></i>Register New Patient
      </button>
      <button class="rec-btn" onclick="_recWalkIn()">
        <i class="ti ti-walk" style="font-size:15px;color:var(--blue)"></i>Walk-In
      </button>
      <button class="rec-btn" style="color:var(--red);border-color:var(--red)" onclick="_recEmergency()">
        <i class="ti ti-urgent" style="font-size:15px"></i>Emergency
      </button>
    </div>

    <!-- Feedback & Surveys (bottom left) -->
    <div class="rec-card">
      <div class="rec-label">Feedback &amp; Surveys</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <i class="ti ti-speakerphone" style="font-size:24px;color:var(--text-muted)"></i>
        <span style="font-size:22px;font-weight:700" id="rec-fb-count">—</span>
        <span style="font-size:13px;color:var(--text-muted)">Responses Today</span>
      </div>
      <button class="rec-btn" onclick="_recViewFeedback()">
        <i class="ti ti-chart-bar" style="font-size:14px"></i>View Feedback
      </button>
    </div>
  </div>

  <!-- ═══ CENTRE: Queue Assignment + Bookings ═══ -->
  <div style="display:flex;flex-direction:column;gap:12px">
    <!-- Queue Assignment -->
    <div class="rec-card">
      <div class="rec-label">Queue Assignment</div>
      <!-- Counters row -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">
        <label class="rec-counter" style="cursor:pointer">
          <input type="checkbox" checked id="qc-walkin" style="accent-color:var(--green);margin:0"> Walk-In:&nbsp;<strong id="qc-w">0</strong>
        </label>
        <label class="rec-counter" style="cursor:pointer">
          <input type="checkbox" checked id="qc-prebooked" style="accent-color:var(--green);margin:0"> Pre-Booked:&nbsp;<strong id="qc-pb">0</strong>
        </label>
        <div class="rec-counter" style="color:var(--red)">
          Emergency:&nbsp;<strong id="qc-em">0</strong>
        </div>
      </div>
      <!-- Assign panel -->
      <div style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start;margin-bottom:12px">
        <div>
          <label style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px;display:block">Assign to Queue:</label>
          <input id="qa-patient" type="text" placeholder="Patient name or token…"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;outline:none;margin-bottom:8px"
            onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border)'">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:13px;color:var(--text-muted)">Token:</span>
            <span id="qa-token" style="font-size:20px;font-weight:900;font-family:var(--mono);color:var(--green-dark)">—</span>
          </div>
        </div>
        <!-- QR code placeholder -->
        <div id="qa-qr" style="width:80px;height:80px;border:1.5px solid var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--bg-surface)">
          <i class="ti ti-qrcode" style="font-size:36px;color:var(--text-muted)"></i>
        </div>
      </div>
      <!-- AI Suggestion -->
      <div id="qa-ai" style="padding:10px 14px;background:var(--bg-surface);border-radius:8px;border:1px solid var(--border);font-size:13px;color:var(--text-muted);margin-bottom:10px">
        <i class="ti ti-brain" style="color:#4A6CF7"></i> AI Suggestion: Enter a patient above to see routing suggestion
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-green" style="flex:1" onclick="_recAssign()"><i class="ti ti-check"></i>Assign to Queue</button>
        <button class="btn" onclick="_recVerifyToken()"><i class="ti ti-search"></i>Verify token</button>
      </div>
    </div>

    <!-- Bookings Overview -->
    <div class="rec-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="rec-label" style="margin:0">Bookings Overview</div>
        <div style="display:flex;gap:4px">
          ${['Today','Month','Year'].map((t,i)=>`
            <button id="bo-${t.toLowerCase()}" onclick="_recBoTab('${t.toLowerCase()}')"
              style="padding:5px 12px;border:1.5px solid ${i===0?'var(--green)':'var(--border)'};border-radius:6px;background:${i===0?'var(--green-light)':'transparent'};color:${i===0?'var(--green-dark)':'#888'};font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">
              ${t}
            </button>`).join('')}
        </div>
      </div>
      <!-- Timeline chart -->
      <div style="overflow-x:auto">
        <div id="bo-chart" style="min-width:460px">
          <!-- Time header -->
          <div style="display:grid;grid-template-columns:80px 1fr;margin-bottom:4px">
            <div></div>
            <div style="display:flex;justify-content:space-between;padding:0 2px;font-size:11px;color:var(--text-muted)">
              <span>8:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span>
            </div>
          </div>
          <!-- Walk-in row -->
          <div style="display:grid;grid-template-columns:80px 1fr;align-items:center;margin-bottom:6px">
            <div style="font-size:12px;font-weight:500;display:flex;align-items:center;gap:4px">
              <i class="ti ti-chevron-right" style="font-size:11px"></i> Walk-In
            </div>
            <div style="height:28px;background:var(--bg-surface);border-radius:6px;position:relative;overflow:hidden" id="bo-walkin-bar">
              <div style="position:absolute;height:100%;background:#888;border-radius:4px;left:5%;width:18%"></div>
            </div>
          </div>
          <!-- Pre-booked row -->
          <div style="display:grid;grid-template-columns:80px 1fr;align-items:center;margin-bottom:6px">
            <div style="font-size:12px;font-weight:500;display:flex;align-items:center;gap:4px">
              <i class="ti ti-chevron-right" style="font-size:11px"></i> Pre-Booked
            </div>
            <div style="height:28px;background:var(--bg-surface);border-radius:6px;position:relative;overflow:hidden" id="bo-prebooked-bar">
              <div style="position:absolute;height:100%;background:#888;border-radius:4px;left:20%;width:16%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;font-weight:600">Walk-In</div>
              <div style="position:absolute;height:100%;background:#555;border-radius:4px;left:40%;width:18%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;font-weight:600">Booked</div>
              <div style="position:absolute;height:100%;background:#333;border-radius:4px;left:63%;width:16%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;font-weight:600">Emergency</div>
            </div>
          </div>
          <!-- Emergency row -->
          <div style="display:grid;grid-template-columns:80px 1fr;align-items:center">
            <div style="font-size:12px;font-weight:500;display:flex;align-items:center;gap:4px">
              <i class="ti ti-chevron-right" style="font-size:11px"></i> Emergency
            </div>
            <div style="height:28px;background:var(--bg-surface);border-radius:6px;position:relative;overflow:hidden">
              <div style="position:absolute;height:100%;background:#999;border-radius:4px;left:30%;width:14%"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ RIGHT: Communication Hub + Feedback + Status ═══ -->
  <div style="display:flex;flex-direction:column;gap:12px">
    <!-- Communication Hub -->
    <div class="rec-card">
      <div class="rec-label">Communication Hub</div>
      <!-- Announcement input -->
      <div style="margin-bottom:10px">
        <label style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:5px;display:block">Announcement:</label>
        <input id="rec-announcement" type="text" placeholder="Type a message to broadcast…"
          style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;outline:none"
          onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border)'"
          onkeydown="if(event.key==='Enter')_recSendAlert()">
      </div>
      <!-- Alert type + send -->
      <div style="display:flex;gap:6px;margin-bottom:8px">
        <select id="rec-alert-type"
          style="flex:1;padding:8px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;outline:none;background:var(--bg-card)">
          <option value="general">📢 General</option>
          <option value="delay">🕐 Delay notice</option>
          <option value="emergency">🚨 Emergency</option>
          <option value="maintenance">🔧 Maintenance</option>
        </select>
        <button class="rec-btn-dark" style="padding:8px 16px;border-radius:8px;border:none;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px" onclick="_recSendAlert()">
          <i class="ti ti-send"></i>Send Alert
        </button>
      </div>
      <!-- Direction buttons -->
      <div style="display:flex;gap:6px">
        <button class="rec-btn" style="margin:0;flex:1;justify-content:center;font-size:12px;padding:8px 10px" onclick="_recDirect('waiting')">
          <i class="ti ti-sofa" style="font-size:13px"></i>Send to Waiting Area
        </button>
        <button class="rec-btn" style="margin:0;flex:1;justify-content:center;font-size:12px;padding:8px 10px" onclick="_recDirect('kiosk')">
          <i class="ti ti-device-desktop" style="font-size:13px"></i>Direct to Kiosk
        </button>
      </div>
      <!-- Recent alerts -->
      <div style="margin-top:12px">
        <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">Recent alerts</div>
        <div id="rec-alerts-log" style="font-size:12px;color:var(--text-muted)">No alerts sent today</div>
      </div>
    </div>

    <!-- Feedback & Surveys (right) -->
    <div class="rec-card">
      <div class="rec-label">Feedback &amp; Surveys</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <i class="ti ti-speakerphone" style="font-size:20px;color:var(--text-muted)"></i>
        <span style="font-size:18px;font-weight:700" id="rec-fb-count2">—</span>
        <span style="font-size:13px;color:var(--text-muted)">Responses Today</span>
      </div>
      <div id="rec-fb-stars" style="font-size:13px;color:var(--text-muted);margin-bottom:8px">Loading…</div>
      <button class="rec-btn" onclick="_recViewFeedback()">
        <i class="ti ti-eye" style="font-size:14px"></i>View Feedback
      </button>
    </div>

    <!-- Status Overview -->
    <div class="rec-card">
      <div class="rec-label">Status Overview</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="rec-stat">
          <div><div class="rec-stat-label">In Queue</div><div class="rec-stat-val" id="st-queue">—</div></div>
        </div>
        <div class="rec-stat">
          <div><div class="rec-stat-label">Avg. Wait Time</div><div class="rec-stat-val" id="st-wait">—</div></div>
        </div>
        <div class="rec-stat">
          <div><div class="rec-stat-label">Checked In</div><div class="rec-stat-val" id="st-in">—</div></div>
        </div>
        <div class="rec-stat" style="position:relative">
          <div><div class="rec-stat-label">Pending</div><div class="rec-stat-val" id="st-pend">—</div></div>
          <i class="ti ti-menu-2" style="position:absolute;right:12px;bottom:12px;color:var(--text-muted);font-size:16px"></i>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Walk-in registration modal -->
<div id="rec-wi-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:center;justify-content:center">
  <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:560px;max-width:95vw;box-shadow:var(--shadow-md);max-height:90vh;overflow-y:auto">
    <div style="font-size:16px;font-weight:700;margin-bottom:4px"><i class="ti ti-user-plus"></i> Walk-in Registration</div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Search by ID / passport to find or create a patient profile.</div>
    <div style="background:var(--bg-surface);border-radius:var(--radius);padding:14px;margin-bottom:14px;border:1.5px solid var(--border)">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:10px"><i class="ti ti-search"></i> Step 1 — Search by ID / Passport number</div>
      <div style="display:flex;gap:8px">
        <div style="flex:1">
          <label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:5px">SA ID / Passport number *</label>
          <input id="wi-idnum" class="f-input" placeholder="e.g. 8901015009087 or A12345678"
            style="margin:0;font-family:var(--mono);font-size:14px;font-weight:600;letter-spacing:.04em"
            oninput="this.value=this.value.replace(/[^a-zA-Z0-9]/g,'').toUpperCase()"
            onkeydown="if(event.key===String.fromCharCode(13))_wiSearchID()">
        </div>
        <div style="display:flex;align-items:flex-end">
          <button class="btn btn-green" id="wi-search-btn" onclick="_wiSearchID()" style="white-space:nowrap">
            <i class="ti ti-search"></i>Search
          </button>
        </div>
      </div>
      <div id="wi-search-result" style="margin-top:10px"></div>
    </div>
    <div id="wi-form" style="display:none">
      <div id="wi-exists-banner" style="display:none;margin-bottom:12px"></div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:10px"><i class="ti ti-user"></i> Patient information</div>
      <div class="two-col">
        <div class="f-group"><label class="f-label">First name *</label><input class="f-input" id="wi-fname" placeholder="First name"></div>
        <div class="f-group"><label class="f-label">Last name *</label><input class="f-input" id="wi-lname" placeholder="Last name"></div>
      </div>
      <div class="two-col">
        <div class="f-group"><label class="f-label">Phone number *</label><input class="f-input" id="wi-phone" placeholder="+27820000000" type="tel"></div>
        <div class="f-group"><label class="f-label">Date of birth (auto from SA ID)</label><input class="f-input" id="wi-dob" type="date" readonly style="background:var(--bg-surface);color:var(--text-muted)"></div>
      </div>
      <div class="two-col">
        <div class="f-group"><label class="f-label">Gender</label>
          <select class="f-select" id="wi-gender" style="margin:0">
            <option value="">-- Select --</option><option value="male">Male</option>
            <option value="female">Female</option><option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
        <div class="f-group"><label class="f-label">Email (optional)</label><input class="f-input" id="wi-email" placeholder="patient@email.com" type="email"></div>
      </div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin:14px 0 10px"><i class="ti ti-stethoscope"></i> Visit details</div>
      <div class="f-group"><label class="f-label">Chief complaint / reason for visit</label>
        <input class="f-input" id="wi-complaint" placeholder="e.g. Headache, chest pain, routine check-up...">
      </div>
      <div class="two-col">
        <div class="f-group"><label class="f-label">Visit type</label>
          <div style="display:flex;gap:5px" id="wi-type-btns">
            <button onclick="_wiSetType('walkin',this)" style="flex:1;padding:8px 4px;border:1.5px solid var(--green);border-radius:8px;background:var(--green-light);color:var(--green-dark);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Walk-in</button>
            <button onclick="_wiSetType('priority',this)" style="flex:1;padding:8px 4px;border:1.5px solid var(--border);border-radius:8px;background:transparent;color:#888;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Priority</button>
            <button onclick="_wiSetType('emergency',this)" style="flex:1;padding:8px 4px;border:1.5px solid var(--border);border-radius:8px;background:transparent;color:#888;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Emergency</button>
          </div>
        </div>
        <div class="f-group"><label class="f-label">Priority reason</label>
          <select class="f-select" id="wi-pri-reason" style="margin:0">
            <option value="">-- None --</option><option value="elderly">Elderly (65+)</option>
            <option value="pregnant">Pregnant</option><option value="disabled">Disability / mobility</option>
            <option value="child_under_5">Child under 5</option>
          </select>
        </div>
      </div>
      <div class="two-col">
        <div class="f-group"><label class="f-label">Language preference</label>
          <select class="f-select" id="wi-lang" style="margin:0">
            <option value="en">English</option><option value="zu">isiZulu</option>
            <option value="af">Afrikaans</option><option value="st">Sesotho</option>
            <option value="xh">isiXhosa</option><option value="ts">Xitsonga</option>
          </select>
        </div>
        <div class="f-group"><label class="f-label">Medical aid (optional)</label>
          <input class="f-input" id="wi-aid" placeholder="e.g. Discovery, Bonitas...">
        </div>
      </div>
      <input type="hidden" id="wi-patient-id">
      <input type="hidden" id="wi-is-new">
    </div>
    <div id="wi-alert" class="alert hidden" style="margin-bottom:8px"></div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="btn btn-green" id="wi-submit-btn" style="flex:1;display:none" onclick="_wiSubmit()">
        <i class="ti ti-login"></i><span id="wi-submit-label">Check in and issue token</span>
      </button>
      <button class="btn" onclick="_wiClose()">Cancel</button>
    </div>
  </div>
</div>`;
};


/* ── State ── */
let _wiType = 'walkin';
let _wiPatientData = null;
let _recSelectedPatient = null;
let _recAlertLog = [];

window._wiSetType = function(t, btn) {
  _wiType = t;
  document.querySelectorAll('#wi-type-btns button').forEach(function(b){
    b.style.borderColor='var(--border)';b.style.background='transparent';b.style.color='#888';
  });
  if(btn){btn.style.borderColor='var(--green)';btn.style.background='var(--green-light)';btn.style.color='var(--green-dark)';}
};

window._wiSearchID = async function() {
  var idnum = (document.getElementById('wi-idnum')||{value:''}).value.trim();
  if(!idnum||idnum.length<6){ _wiAlertMsg('Enter a valid ID or passport number (min 6 chars)'); return; }
  var btn=document.getElementById('wi-search-btn');
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div>';}
  var rEl=document.getElementById('wi-search-result');
  if(rEl) rEl.innerHTML='<div style="font-size:13px;color:var(--text-muted)">Searching NIHMS records...</div>';
  try {
    var res=await API._fetchDirect('/patients?nationalId='+encodeURIComponent(idnum)+'&limit=1',{method:'GET'});
    var patients=res.data||[];
    if(patients.length) {
      var p=patients[0]; _wiPatientData=p; _wiFillForm(p,false);
      if(rEl) rEl.innerHTML=
        '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#EDFBF3;border-radius:10px;border:1.5px solid var(--green)">'+
        '<div style="width:36px;height:36px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;flex-shrink:0">'+
          (p.firstName||'?')[0]+(p.lastName||'?')[0]+
        '</div>'+
        '<div style="flex:1">'+
          '<div style="font-weight:700;font-size:14px;color:var(--green-dark)">Patient found in NIHMS</div>'+
          '<div style="font-size:12px;color:var(--text-muted)">'+p.firstName+' '+p.lastName+' - ID: '+(p.nationalId||idnum)+' - '+(p.phone||'no phone on record')+'</div>'+
        '</div></div>';
      var b=document.getElementById('wi-exists-banner');
      if(b){
        b.style.display='block';
        b.innerHTML=
          '<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;background:#FFF9E6;border-radius:10px;border-left:4px solid var(--amber)">'+
          '<i class="ti ti-alert-triangle" style="font-size:18px;color:var(--amber);flex-shrink:0;margin-top:1px"></i>'+
          '<div><div style="font-weight:700;font-size:13px;color:#7A5C10">Existing patient - profile found</div>'+
          '<div style="font-size:12px;color:#7A5C10;margin-top:3px">This walk-in will be linked to <strong>'+p.firstName+' '+p.lastName+'</strong> existing record. Name and DOB are locked. Phone and email can be updated.</div></div></div>';
      }
      var sl=document.getElementById('wi-submit-label'); if(sl) sl.textContent='Link to existing profile and issue token';
    } else {
      _wiPatientData=null; _wiFillForm(null,true,idnum);
      if(rEl) rEl.innerHTML=
        '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#EEF2FF;border-radius:10px;border:1.5px solid #BEC8F0">'+
        '<i class="ti ti-user-plus" style="font-size:22px;color:#4A6CF7;flex-shrink:0"></i>'+
        '<div><div style="font-weight:700;font-size:14px;color:#1E2C80">New patient - not in NIHMS</div>'+
        '<div style="font-size:12px;color:#1E2C80;margin-top:2px">Fill in the details below to create a profile and issue a token.</div></div></div>';
      var b2=document.getElementById('wi-exists-banner'); if(b2) b2.style.display='none';
      var sl2=document.getElementById('wi-submit-label'); if(sl2) sl2.textContent='Create new profile and issue token';
    }
    document.getElementById('wi-form').style.display='block';
    document.getElementById('wi-submit-btn').style.display='flex';
    document.getElementById('wi-alert').classList.add('hidden');
  } catch(err){
    if(rEl) rEl.innerHTML='<div style="color:var(--red);font-size:13px"><i class="ti ti-alert-circle"></i> Search failed: '+err.message+'</div>';
  } finally { if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-search"></i>Search';} }
};

function _wiFillForm(p, isNew, prefillId) {
  prefillId=prefillId||'';
  var lock=!isNew;
  function _set(id,val,ro){
    var e=document.getElementById(id); if(!e) return;
    e.value=val||'';
    if(ro){e.setAttribute('readonly','');e.style.background='var(--bg-surface)';e.style.color='var(--text-muted)';}
    else{e.removeAttribute('readonly');e.style.background='';e.style.color='';}
  }
  _set('wi-fname',p?p.firstName:'',lock);
  _set('wi-lname',p?p.lastName:'',lock);
  _set('wi-phone',p?p.phone||'':'',false);
  _set('wi-email',p?p.email||'':'',false);
  _set('wi-aid',p&&p.medicalAid?p.medicalAid.schemeName||'':'',false);
  var idnum=(document.getElementById('wi-idnum')||{value:''}).value;
  _set('wi-dob',_wiParseDOB(idnum)||(p&&p.dateOfBirth?p.dateOfBirth.slice(0,10):''),true);
  var gEl=document.getElementById('wi-gender');
  if(gEl){
    if(p&&p.gender){gEl.value=p.gender;if(lock){gEl.disabled=true;gEl.style.opacity='.65';}}
    else{var g=parseInt(idnum[6]);if(!isNaN(g))gEl.value=g<5?'female':'male';}
  }
  document.getElementById('wi-patient-id').value=p?(p._id||p.user||''):'';
  document.getElementById('wi-is-new').value=isNew?'1':'0';
}

function _wiParseDOB(id) {
  if(!id||id.length<6||!/^[0-9]/.test(id)) return '';
  var yr=parseInt(id.slice(0,2)),mo=id.slice(2,4),day=id.slice(4,6);
  if(isNaN(parseInt(mo))||isNaN(parseInt(day))) return '';
  var fy=yr>(new Date().getFullYear()%100)?1900+yr:2000+yr;
  return fy+'-'+mo+'-'+day;
}

window._wiSubmit = async function() {
  var fid=API.getStoredUser()&&(API.getStoredUser().facilityId||API.getStoredUser().facility);
  var isNew=(document.getElementById('wi-is-new')||{}).value==='1';
  var pid=(document.getElementById('wi-patient-id')||{}).value||'';
  var fname=((document.getElementById('wi-fname')||{}).value||'').trim();
  var lname=((document.getElementById('wi-lname')||{}).value||'').trim();
  var phone=((document.getElementById('wi-phone')||{}).value||'').trim();
  var idnum=((document.getElementById('wi-idnum')||{}).value||'').trim();
  var email=((document.getElementById('wi-email')||{}).value||'').trim()||undefined;
  var complaint=((document.getElementById('wi-complaint')||{}).value||'').trim()||undefined;
  var aid=((document.getElementById('wi-aid')||{}).value||'').trim()||undefined;
  var gender=(document.getElementById('wi-gender')||{}).value||undefined;
  var dob=(document.getElementById('wi-dob')||{}).value||undefined;
  var lang=(document.getElementById('wi-lang')||{}).value||'en';
  var priReason=(document.getElementById('wi-pri-reason')||{}).value||undefined;
  if(!fname||!lname){_wiAlertMsg('First and last name are required');return;}
  if(!phone){_wiAlertMsg('Phone number is required');return;}
  if(!idnum){_wiAlertMsg('ID or Passport number is required');return;}
  var btn=document.getElementById('wi-submit-btn');
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div> Processing...';}
  try {
    var resolvedPid=pid;
    if(isNew){
      var body={firstName:fname,lastName:lname,phone:phone,nationalId:idnum,registeredByStaff:true,facilityId:fid};
      if(email) body.email=email; if(gender) body.gender=gender; if(dob) body.dateOfBirth=dob;
      if(aid) body.medicalAid={schemeName:aid};
      var np=await API._fetchDirect('/patients',{method:'POST',body:JSON.stringify(body)});
      resolvedPid=(np.data&&(np.data._id||np.data.user))||undefined;
      UI.showToast('New patient profile created','ok');
    } else if(pid){
      var patch={phone:phone};
      if(email) patch.email=email; if(aid) patch.medicalAid={schemeName:aid};
      await API._fetchDirect('/patients/'+pid,{method:'PATCH',body:JSON.stringify(patch)}).catch(function(){});
    }
    var qbody={facilityId:fid,patientName:fname+' '+lname,patientPhone:phone,tokenType:_wiType};
    if(resolvedPid) qbody.patientId=resolvedPid;
    if(email) qbody.patientEmail=email;
    if(priReason) qbody.priorityReason=priReason;
    if(complaint) qbody.notes=complaint;
    qbody.language=lang;
    var res=await API._fetchDirect('/queue2/walkin',{method:'POST',body:JSON.stringify(qbody)});
    var token=res.data&&res.data.token, pos=res.data&&res.data.position, wait=res.data&&res.data.estimatedWait;
    _wiClose();
    var qaT=document.getElementById('qa-token'); if(qaT) qaT.textContent=token;
    var qrEl=document.getElementById('qa-qr');
    if(qrEl) qrEl.innerHTML='<div style="text-align:center;padding:8px"><div style="font-size:26px;font-weight:900;font-family:var(--mono);color:var(--green-dark)">'+token+'</div><div style="font-size:10px;color:var(--text-muted)">'+fname+' '+lname+'</div></div>';
    UI.showToast('Token '+token+' issued - '+fname+' '+lname+' - Position '+pos+' - ~'+wait+' min','ok');
    if(confirm('Token '+token+' issued to '+fname+' '+lname+'.\nPrint token slip?')) _wiPrintSlip(token,fname+' '+lname,pos,wait,_wiType,lang);
    if(typeof _recLoad==='function') _recLoad();
  } catch(err){_wiAlertMsg(err.message||'Registration failed');}
  finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-login"></i><span id="wi-submit-label">Check in and issue token</span>';}}
};

function _wiPrintSlip(token,name,pos,wait,tokenType,lang) {
  tokenType=tokenType||'walkin'; lang=lang||'en';
  var labels={en:{w:'Est. wait',m:'min'},zu:{w:'Ulindelo',m:'iminithi'},af:{w:'Geskatte',m:'minute'},st:{w:'Nako',m:'metsotso'},xh:{w:'Ulindelo',m:'iimizuzu'},ts:{w:'Nkarhi',m:'minutu'}};
  var L=labels[lang]||labels.en;
  var bgMap={emergency:'#E24B4A',priority:'#EF9F27',normal:'#1A4A9B',walkin:'#0F6E56'};
  var lblMap={emergency:'EMERGENCY',priority:'PRIORITY',normal:'PRE-BOOKED',walkin:'WALK-IN'};
  var bg=bgMap[tokenType]||'#0F6E56', lbl=lblMap[tokenType]||'WALK-IN';
  var w=window.open('','_blank');
  var html='<!DOCTYPE html><html><head><title>Token '+token+'</title>'+
    '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial;text-align:center;padding:28px;max-width:280px;margin:0 auto}'+
    '.tok{font-size:72px;font-weight:900;color:#0F6E56;line-height:1;font-family:monospace;margin:8px 0}'+
    '.row{display:flex;justify-content:space-around;margin:14px 0}.row div{text-align:center}.row span{font-size:22px;font-weight:700;display:block}'+
    'hr{border:none;border-top:1px dashed #ccc;margin:14px 0}.note{font-size:11px;color:#aaa;line-height:1.6}</style></head><body>'+
    '<div style="font-size:18px;font-weight:900;color:#0F6E56;margin-bottom:2px">NIHMS</div>'+
    '<div style="font-size:10px;color:#aaa;margin-bottom:14px">National Integrated Healthcare Management System</div>'+
    '<div style="font-size:11px;padding:3px 12px;border-radius:20px;background:'+bg+';color:#fff;display:inline-block;margin-bottom:12px">'+lbl+'</div>'+
    '<div style="font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:#aaa">Your queue token</div>'+
    '<div class="tok">'+token+'</div>'+
    '<div style="font-size:13px;color:#555;margin-bottom:8px">'+name+'</div>'+
    '<div class="row"><div><span>'+(pos||'-')+'</span>Position</div>'+
    '<div><span>'+(wait!=null?wait:'-')+'</span>'+L.w+' ('+L.m+')</div></div>'+
    '<hr><div class="note">Please remain in the waiting area<br>'+new Date().toLocaleString('en-ZA')+'</div></body></html>';
  w.document.write(html); w.document.close(); setTimeout(function(){w.print();},400);
}

window._wiClose = function() {
  document.getElementById('rec-wi-modal').style.display='none';
  ['wi-idnum','wi-fname','wi-lname','wi-phone','wi-email','wi-complaint','wi-aid','wi-dob'].forEach(function(id){
    var e=document.getElementById(id); if(!e) return; e.value=''; e.removeAttribute('readonly'); e.style.background=''; e.style.color='';
  });
  var g=document.getElementById('wi-gender'); if(g){g.value='';g.disabled=false;g.style.opacity='';}
  ['wi-patient-id','wi-is-new'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
  var f=document.getElementById('wi-form'); if(f) f.style.display='none';
  var sb=document.getElementById('wi-submit-btn'); if(sb) sb.style.display='none';
  var eb=document.getElementById('wi-exists-banner'); if(eb) eb.style.display='none';
  var sr=document.getElementById('wi-search-result'); if(sr) sr.innerHTML='';
  var al=document.getElementById('wi-alert'); if(al) al.classList.add('hidden');
  _wiType='walkin';
  document.querySelectorAll('#wi-type-btns button').forEach(function(b,i){
    b.style.borderColor=i===0?'var(--green)':'var(--border)';
    b.style.background=i===0?'var(--green-light)':'transparent';
    b.style.color=i===0?'var(--green-dark)':'#888';
  });
};

function _wiAlertMsg(msg){
  var el=document.getElementById('wi-alert'); if(!el) return;
  el.className='alert alert-error'; el.innerHTML='<i class="ti ti-alert-circle"></i> '+msg; el.classList.remove('hidden');
}

window._recShowWI    = function() { document.getElementById('rec-wi-modal').style.display='flex'; };
window._recWalkIn    = function() { document.getElementById('rec-wi-modal').style.display='flex'; };
window._recEmergency = function() {
  _wiType='emergency';
  document.getElementById('rec-wi-modal').style.display='flex';
  setTimeout(function(){
    document.querySelectorAll('#wi-type-btns button').forEach(function(b,i){
      b.style.borderColor=i===2?'var(--green)':'var(--border)';
      b.style.background=i===2?'var(--green-light)':'transparent';
      b.style.color=i===2?'var(--green-dark)':'#888';
    });
  },60);
};

/* ── Load live data ── */
async function _recLoad() {
  const u   = API.getStoredUser();
  const fid = u?.facilityId || u?.facility;

  // Facility name
  const fnEl = document.getElementById('rec-facility');
  if (fnEl) fnEl.textContent = u?.facilityName || 'Your Facility';

  if (!fid) return;

  try {
    const res = await API._fetchDirect(`/queue2?facility=${fid}&date=${new Date().toISOString().slice(0,10)}`, {method:'GET'});
    const all = res.data||[], stats = res.stats||{};

    // Queue counters
    const _t = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    _t('qc-w',   all.filter(e=>['walkin','priority'].includes(e.tokenType)).length);
    _t('qc-pb',  all.filter(e=>e.tokenType==='normal').length);
    _t('qc-em',  all.filter(e=>e.tokenType==='emergency').length);

    // Status overview
    _t('st-queue', all.filter(e=>e.status==='waiting').length);
    _t('st-wait',  (stats.avgWaitMins||0)+' Min');
    _t('st-in',    all.length);
    _t('st-pend',  all.filter(e=>e.status==='waiting').length);

    // Feedback
    const sat = all.filter(e=>e.satisfaction);
    const avgS = sat.length ? (sat.reduce((s,e)=>s+e.satisfaction,0)/sat.length).toFixed(1) : null;
    _t('rec-fb-count',  sat.length);
    _t('rec-fb-count2', sat.length);
    const fbEl = document.getElementById('rec-fb-stars');
    if (fbEl) fbEl.innerHTML = avgS
      ? `<div style="display:flex;align-items:center;gap:6px"><span style="font-size:18px">⭐</span><strong>${avgS}</strong><span style="color:var(--text-muted)">/ 5.0 avg rating</span></div>`
      : '<div style="color:var(--text-muted)">No ratings yet today</div>';

    // Load today's appointments for quick access
    try {
      const apptRes = await API.appointments.list({ limit:5 });
      const todayStr = new Date().toDateString();
      const todayA   = (apptRes.data||[]).filter(a=>new Date(a.scheduledAt).toDateString()===todayStr&&a.status==='confirmed').slice(0,3);
      const apptEl   = document.getElementById('rec-today-appts');
      if (apptEl) {
        apptEl.innerHTML = todayA.map(a=>`
          <div onclick="_recSelectAppt('${a._id}','${a.patient?.firstName||''} ${a.patient?.lastName||''}')"
            style="display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--border);border-radius:8px;margin-bottom:5px;cursor:pointer;font-size:13px"
            onmouseover="this.style.background='var(--bg-surface)'" onmouseout="this.style.background=''">
            <i class="ti ti-chevron-right" style="font-size:11px;color:var(--text-muted)"></i>
            <span style="flex:1;font-weight:500">${a.patient?.firstName||'—'} ${a.patient?.lastName||''}</span>
            <span style="color:var(--text-muted);font-size:11px">${new Date(a.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
          </div>`).join('');
      }
    } catch(_){}

  } catch(e){ console.warn('Rec load error:', e.message); }
}

/* ── Search patients ── */
window._recSearch = async (val) => {
  if (!val||val.length<2) { document.getElementById('rec-search-results').innerHTML=''; return; }
  try {
    const res = await API._fetchDirect(`/patients?search=${encodeURIComponent(val)}&limit=4`,{method:'GET'});
    const el  = document.getElementById('rec-search-results');
    if (!el) return;
    el.innerHTML = (res.data||[]).map(p=>`
      <div onclick="_recSelectPatient('${p._id}','${p.firstName} ${p.lastName}')"
        style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg-surface);border-radius:8px;margin-bottom:4px;cursor:pointer;border:1px solid transparent"
        onmouseover="this.style.borderColor='var(--green)'" onmouseout="this.style.borderColor='transparent'">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--green-light);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--green-dark);flex-shrink:0">
          ${(p.firstName||'?')[0]}${(p.lastName||'?')[0]}
        </div>
        <div>
          <div style="font-weight:600;font-size:13px">${p.firstName} ${p.lastName}</div>
          <div style="font-size:11px;color:var(--text-muted)">ID: ${p.nationalId||'—'} · ${p.phone||'—'}</div>
        </div>
      </div>`).join('')||'<div style="font-size:12px;color:var(--text-muted);padding:6px">No results</div>';
  } catch(_){}
};

window._recSelectPatient = (id, name) => {
  _recSelectedPatient = { id, name };
  document.getElementById('rec-search-results').innerHTML='';
  document.getElementById('rec-search').value = name;
  document.getElementById('qa-patient').value  = name;
  // AI suggestion
  const ai = document.getElementById('qa-ai');
  if (ai) ai.innerHTML = `<i class="ti ti-brain" style="color:#4A6CF7"></i> AI Suggestion: Route <strong>${name}</strong> to General Queue`;
};

window._recSelectAppt = (apptId, name) => {
  document.getElementById('qa-patient').value = name;
  document.getElementById('qa-token').textContent = 'A-??';
  const ai = document.getElementById('qa-ai');
  if (ai) ai.innerHTML = `<i class="ti ti-brain" style="color:#4A6CF7"></i> AI Suggestion: Pre-booked — issue priority A-token for <strong>${name}</strong>`;
};

/* ── Walk-in modal ── */
window._recShowWI    = () => { document.getElementById('rec-wi-modal').style.display='flex'; };
window._recWalkIn    = () => { _recSetWI2Type('walkin',null); document.getElementById('rec-wi-modal').style.display='flex'; };
window._recEmergency = () => { _recSetWI2Type('emergency',null); document.getElementById('rec-wi-modal').style.display='flex'; };

window._recSetWI2Type = (t, btn) => {
  _recWI2Type = t;
  document.querySelectorAll('#wi2-type-btns button').forEach(b=>{b.style.borderColor='var(--border)';b.style.background='transparent';b.style.color='#888';});
  if (btn) { btn.style.borderColor='var(--green)';btn.style.background='var(--green-light)';btn.style.color='var(--green-dark)'; }
  else {
    const btns=document.querySelectorAll('#wi2-type-btns button');
    const idx={'walkin':0,'priority':1,'emergency':2}[t]??0;
    if(btns[idx]){btns[idx].style.borderColor='var(--green)';btns[idx].style.background='var(--green-light)';btns[idx].style.color='var(--green-dark)';}
  }
};

window._recSubmitWI = async () => {
  const btn  = document.getElementById('wi2-btn');
  const fid  = API.getStoredUser()?.facilityId||API.getStoredUser()?.facility;
  const name = document.getElementById('wi2-name')?.value?.trim();
  if (!name) { _recAlert2('wi2-alert','Patient name required'); return; }
  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div>'; }
  try {
    const res = await API._fetchDirect('/queue2/walkin',{method:'POST',body:JSON.stringify({
      facilityId:fid, patientName:name,
      patientPhone:document.getElementById('wi2-phone')?.value?.trim()||'',
      tokenType:_recWI2Type, language:'en'
    })});
    document.getElementById('rec-wi-modal').style.display='none';
    document.getElementById('qa-token').textContent = res.data?.token||'—';
    // Show QR
    const qrEl = document.getElementById('qa-qr');
    if (qrEl) qrEl.innerHTML=`<div style="text-align:center;padding:8px"><div style="font-size:28px;font-weight:900;font-family:var(--mono);color:var(--green-dark)">${res.data?.token}</div><div style="font-size:10px;color:var(--text-muted)">Token issued</div></div>`;
    UI.showToast(`Token ${res.data?.token} issued to ${name}`,'ok');
    document.getElementById('wi2-name').value=''; document.getElementById('wi2-phone').value='';
    _recLoad();
  } catch(e){ _recAlert2('wi2-alert',e.message); }
  finally { if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-login"></i>Check in & issue token';} }
};

/* ── Queue assign ── */
window._recAssign = async () => {
  const name = document.getElementById('qa-patient')?.value?.trim();
  const fid  = API.getStoredUser()?.facilityId||API.getStoredUser()?.facility;
  if (!name) { UI.showToast('Enter a patient name or token','err'); return; }
  try {
    const res = await API._fetchDirect('/queue2/walkin',{method:'POST',body:JSON.stringify({facilityId:fid,patientName:name,tokenType:'walkin'})});
    document.getElementById('qa-token').textContent = res.data?.token;
    const qrEl=document.getElementById('qa-qr');
    if(qrEl) qrEl.innerHTML=`<div style="text-align:center;padding:6px"><div style="font-size:24px;font-weight:900;font-family:var(--mono);color:var(--green-dark)">${res.data?.token}</div><div style="font-size:10px;color:var(--text-muted)">Issued</div></div>`;
    UI.showToast('Token issued: '+res.data?.token,'ok');
    _recLoad();
  } catch(e){ UI.showToast(e.message,'err'); }
};

window._recVerifyToken = async () => {
  const ref=document.getElementById('qa-patient')?.value?.trim(); if(!ref) return;
  const fid=API.getStoredUser()?.facilityId||API.getStoredUser()?.facility;
  try {
    const r=await API._fetchDirect(`/queue2?facility=${fid}&date=${new Date().toISOString().slice(0,10)}`,{method:'GET'});
    const e=(r.data||[]).find(e=>e.token.toUpperCase()===ref.toUpperCase()||e.patientName?.toLowerCase()===ref.toLowerCase());
    if (e) { document.getElementById('qa-token').textContent=e.token; UI.showToast(`${e.token} — ${e.patientName} · ${e.status}`,'ok'); }
    else     UI.showToast('Not found in today\'s queue','err');
  } catch(e){ UI.showToast(e.message,'err'); }
};

/* ── Communication Hub — Send Alert (also shows on patient overview) ── */
window._recSendAlert = async () => {
  const msg  = document.getElementById('rec-announcement')?.value?.trim();
  const type = document.getElementById('rec-alert-type')?.value||'general';
  const fid  = API.getStoredUser()?.facilityId||API.getStoredUser()?.facility;
  if (!msg) { UI.showToast('Type a message first','err'); return; }

  // Save to localStorage so patient overview can read it
  const alert = { id:Date.now(), type, msg, time:new Date().toISOString(), facilityId:fid };
  const existing = JSON.parse(localStorage.getItem('nihms_facility_alerts')||'[]');
  existing.unshift(alert);
  // Keep only last 10 per facility
  const filtered = existing.filter(a=>a.facilityId===fid).slice(0,10);
  const others   = existing.filter(a=>a.facilityId!==fid);
  localStorage.setItem('nihms_facility_alerts', JSON.stringify([...filtered,...others]));

  // Also send via delay-notify API if it's a delay message
  if (type==='delay') {
    try {
      const mins = parseInt(msg.match(/\d+/)?.[0])||15;
      await API._fetchDirect('/queue2/delay-notify',{method:'POST',body:JSON.stringify({facilityId:fid,delayMinutes:mins,reason:msg})});
      UI.showToast('Delay notification sent to all waiting patients','ok');
    } catch(e){ UI.showToast('Alert saved locally (queue notify failed: '+e.message+')','warn'); }
  } else {
    UI.showToast('Alert broadcast to facility','ok');
  }

  // Update log
  _recAlertLog.unshift({ type, msg, time:new Date() });
  _recUpdateAlertLog();
  document.getElementById('rec-announcement').value='';
};

function _recUpdateAlertLog() {
  const el = document.getElementById('rec-alerts-log');
  if (!el) return;
  const icons = { general:'ti-speakerphone', delay:'ti-clock', emergency:'ti-urgent', maintenance:'ti-tool' };
  const colors = { general:'var(--text-muted)', delay:'var(--amber)', emergency:'var(--red)', maintenance:'#888' };
  el.innerHTML = _recAlertLog.slice(0,4).map(a=>`
    <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
      <i class="ti ${icons[a.type]||'ti-speakerphone'}" style="font-size:13px;color:${colors[a.type]||'#888'};flex-shrink:0;margin-top:1px"></i>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.msg}</div>
        <div style="font-size:10px;color:var(--text-hint)">${a.time.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
      </div>
    </div>`).join('')||'<div style="color:var(--text-muted)">No alerts yet</div>';
}

/* ── Bookings tab ── */
let _recBoTab_active = 'today';
window._recBoTab = (t) => {
  _recBoTab_active = t;
  ['today','month','year'].forEach(tab=>{
    const btn=document.getElementById('bo-'+tab); if(!btn) return;
    btn.style.borderColor=tab===t?'var(--green)':'var(--border)';
    btn.style.background=tab===t?'var(--green-light)':'transparent';
    btn.style.color=tab===t?'var(--green-dark)':'#888';
  });
};

/* ── Direction & feedback ── */
window._recDirect = (dest) => {
  const labels={waiting:'Waiting area',kiosk:'Self-service kiosk'};
  UI.showToast(`Patient directed to ${labels[dest]||dest}`,'ok');
};
window._recViewFeedback = () => {
  Router.setPage('queue_dashboard');
  setTimeout(()=>window._qdShowAnalytics&&_qdShowAnalytics(),300);
};

/* ── Helpers ── */
function _recAlert2(id, msg) {
  const el=document.getElementById(id); if(!el) return;
  el.className='alert alert-error'; el.innerHTML=`<i class="ti ti-alert-circle"></i> ${msg}`; el.classList.remove('hidden');
}
