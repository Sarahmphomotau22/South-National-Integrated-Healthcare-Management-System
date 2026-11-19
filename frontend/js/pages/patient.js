/**
 * js/pages/patient.js — Complete Patient Portal
 * myhealth · myrecords · appointments · checkin · billing · myprofile · book
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ── NIHMS design-system CSS — same as receptionist, injected once ── */
(function _nihmsInjectDS() {
  if (document.getElementById('nihms-ds-css')) return;
  var s = document.createElement('style');
  s.id = 'nihms-ds-css';
  s.textContent = [
    /* Reset */
    '*, *::before, *::after { box-sizing: border-box; }',
    '::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:99px}',
    /* Background — subtle green/navy mesh matching login header */
    'body, #app, .page-root { background-color:#f4f5f0 !important; background-image: repeating-linear-gradient(135deg, rgba(15,110,86,.03) 0px, rgba(15,110,86,.03) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(45deg, rgba(26,74,155,.02) 0px, rgba(26,74,155,.02) 1px, transparent 1px, transparent 40px) !important; background-attachment:fixed !important; }',
    /* Alert colours — exact login.html values */
    '.nihms-alert-err { background:#FCEBEB !important; color:#A32D2D !important; border-left:3px solid #E24B4A !important; border-radius:10px; padding:10px 14px; font-size:13px; display:flex; align-items:flex-start; gap:8px; }',
    '.nihms-alert-ok  { background:#E1F5EE !important; color:#0F6E56 !important; border-left:3px solid #1D9E75 !important; border-radius:10px; padding:10px 14px; font-size:13px; display:flex; align-items:flex-start; gap:8px; }',
    '.nihms-alert-warn{ background:#FAEEDA !important; color:#854F0B !important; border-left:3px solid #EF9F27 !important; border-radius:10px; padding:10px 14px; font-size:13px; display:flex; align-items:flex-start; gap:8px; }',
    '.nihms-alert-info{ background:#E6F1FB !important; color:#185FA5 !important; border-left:3px solid #378ADD !important; border-radius:10px; padding:10px 14px; font-size:13px; display:flex; align-items:flex-start; gap:8px; }',
    /* Primary button — pill shape, login-page teal/navy gradient */
    '.btn-green { background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%) !important; border-color:#0F6E56 !important; border-radius:50px !important; color:#fff !important; }',
    '.btn-green:hover { opacity:.9 !important; }',
    /* Secondary/outline buttons — pill */
    '.btn { border-radius:50px !important; }',
    '.btn-sm { border-radius:50px !important; }',
    '.btn-xs { border-radius:50px !important; }',
    /* Any inline-styled teal button — ensure pill */
    'button[style*="background:#0F6E56"], button[style*="background: #0F6E56"] { border-radius:50px !important; }',
    /* Input focus ring — login-page green */
    'input:focus, select:focus, textarea:focus { border-color:#0F6E56 !important; box-shadow:0 0 0 3px rgba(15,110,86,.12) !important; outline:none !important; }',
    /* Card style — match receptionist white cards */
    '.card { background:#fff !important; border-radius:14px !important; border:1px solid #e0e0e0 !important; box-shadow:0 1px 3px rgba(0,0,0,.06) !important; }',
    '.nihms-card { background:#fff; border-radius:14px; border:1px solid #e0e0e0; box-shadow:0 1px 3px rgba(0,0,0,.06); }',
    /* Table header */
    'th { background:#f4f5f0 !important; color:#777777 !important; }',
    /* CSS variable overrides to match receptionist exact values */
    ':root { --green:#0F6E56 !important; --green-dark:#0a4f3e !important; --green-mid:#1D9E75 !important; --green-light:#E1F5EE !important; --bg:#f4f5f0 !important; --bg-surface:#f4f5f0 !important; --bg-card:#ffffff !important; --border:#e0e0e0 !important; --border-md:#e0e0e0 !important; --text:#111111 !important; --text-muted:#555555 !important; --text-hint:#777777 !important; --radius:8px !important; --radius-lg:14px !important; --radius-xl:16px !important; --shadow:0 1px 3px rgba(0,0,0,.06) !important; }',
  ].join('\n');
  document.head.appendChild(s);
})();

/* ── Shared: get patient record ── */
async function _getMyPatientRecord() {
  try {
    var res = await API._fetchDirect('/patients/me', { method: 'GET' });
    return res && res.data ? res.data : null;
  } catch (_) { return null; }
}

/* ══════════════════════════════════════════════════
   MY HEALTH
══════════════════════════════════════════════════ */
Pages['myhealth'] = () => {
  if (window._mhInt) clearInterval(window._mhInt);
  /* Close previous BroadcastChannel if the page was navigated away and back */
  try { if (window._mhCheckinBC) { window._mhCheckinBC.close(); window._mhCheckinBC = null; } } catch(_) {}
  /* Listen for token issuance from the receptionist tab – refresh immediately */
  try {
    window._mhCheckinBC = new BroadcastChannel('nihms_checkin');
    window._mhCheckinBC.onmessage = function(ev) {
      if (ev.data && ev.data.type === 'token_issued') _mhLoad();
    };
  } catch(_) {}
  setTimeout(_mhLoad, 0);
  window._mhInt = setInterval(_mhLoad, 30000);
  return '<div id="mh-alerts"></div>' +
    '<div style="background:linear-gradient(135deg,#0F6E56,#1A4A9B);border-radius:16px;padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:14px">' +
      '<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
        '<i class="ti ti-heart-rate-monitor" style="font-size:22px;color:#fff"></i>' +
      '</div>' +
      '<div>' +
        '<div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:2px">My health overview</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,.75)">Your health summary, queue status &amp; upcoming care</div>' +
      '</div>' +
    '</div>' +
    '<div id="mh-body" style="color:var(--text-muted)">Loading...</div>';
};

async function _mhLoad() {
  var wrap = document.getElementById('mh-body');
  if (!wrap) return;

  /* ── Inject pulse CSS for queue card (once) ── */
  if (!document.getElementById('nihms-queue-anim')) {
    var s = document.createElement('style');
    s.id  = 'nihms-queue-anim';
    s.textContent =
      '@keyframes _nihms-pulse{0%{box-shadow:0 0 0 0 rgba(13,148,136,.5)}70%{box-shadow:0 0 0 10px rgba(13,148,136,0)}100%{box-shadow:0 0 0 0 rgba(13,148,136,0)}}' +
      '.nihms-token-pulse{animation:_nihms-pulse 1.8s infinite;}';
    document.head.appendChild(s);
  }

  /* Facility alerts */
  try {
    var u = API.getStoredUser();
    var fid = u && (u.facilityId || u.facility);
    var all = JSON.parse(localStorage.getItem('nihms_facility_alerts') || '[]');
    var cutoff = Date.now() - 4 * 3600000;
    var alerts = all.filter(function(a){ return a.facilityId === fid && new Date(a.time).getTime() > cutoff; });
    var alertEl = document.getElementById('mh-alerts');
    if (alertEl && alerts.length) {
      var styleMap = {
        general:     { bg:'#f0fdfa', border:'#0F6E56', ic:'ti-speakerphone', c:'#0F6E56', label:'Facility Announcement' },
        delay:       { bg:'#FFFBEB', border:'#D97706', ic:'ti-clock-exclamation', c:'#92400E', label:'Delay Notice' },
        emergency:   { bg:'#FEF2F2', border:'#E24B4A', ic:'ti-urgent', c:'#991B1B', label:'Emergency Alert' },
        maintenance: { bg:'var(--bg-surface)', border:'#888', ic:'ti-tool', c:'#555', label:'Maintenance Notice' },
      };
      alertEl.innerHTML = alerts.map(function(a) {
        var s = styleMap[a.type] || styleMap.general;
        return '<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;margin-bottom:8px;border-radius:10px;background:'+s.bg+';border-left:4px solid '+s.border+'">' +
          '<i class="ti '+s.ic+'" style="font-size:18px;color:'+s.border+';flex-shrink:0;margin-top:1px"></i>' +
          '<div style="flex:1"><div style="font-weight:700;font-size:13px;color:'+s.c+'">'+s.label+'</div>' +
          '<div style="font-size:13px;color:'+s.c+';margin-top:2px">'+a.msg+'</div>' +
          '<div style="font-size:11px;color:'+s.border+';opacity:.7;margin-top:4px">'+new Date(a.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+' · '+new Date(a.time).toLocaleDateString('en-ZA')+'</div></div>' +
          '<button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:'+s.border+';font-size:16px;flex-shrink:0"><i class="ti ti-x"></i></button></div>';
      }).join('');
    }
  } catch(_) {}

  try {
    var p = await _getMyPatientRecord();
    if (!p) {
      wrap.innerHTML = '<div class="alert-box alert-warn"><i class="ti ti-alert-triangle"></i> Please complete your profile to use patient features.' +
        '<button class="btn btn-sm btn-green" style="margin-left:8px" onclick="Router.setPage(\'myprofile\')"><i class="ti ti-user"></i>Go to profile</button></div>';
      return;
    }

    /* Update topbar avatar */
    var profUrl = p.profilePicture && p.profilePicture.url ? 'https://nihms-backend.onrender.com' + p.profilePicture.url : null;
    var initials = ((p.firstName||'U')[0] + (p.lastName||'S')[0]).toUpperCase();
    var avatarEl = document.getElementById('topbar-avatar');
    if (avatarEl) {
      if (profUrl) {
        avatarEl.innerHTML = '<img src="'+profUrl+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%"><input type="file" id="avatar-file-input" accept=".jpg,.jpeg,.png" style="display:none" onchange="_uploadAvatarFromTopbar(this)">';
        avatarEl.style.padding = '0'; avatarEl.style.overflow = 'hidden';
      } else {
        avatarEl.innerHTML = initials + '<input type="file" id="avatar-file-input" accept=".jpg,.jpeg,.png" style="display:none" onchange="_uploadAvatarFromTopbar(this)">';
        avatarEl.style.padding = ''; avatarEl.style.overflow = '';
      }
      avatarEl.style.cursor = 'pointer';
      avatarEl.title = 'Click to change profile picture';
      avatarEl.onclick = function() { var fi = document.getElementById('avatar-file-input'); if(fi) fi.click(); };
    }

    /* ── Seed localStorage from URL params (SMS/email link with ?token=&dept=) ── */
    try {
      var _urlP = new URLSearchParams(window.location.search);
      var _urlToken = _urlP.get('token');
      var _urlDept  = _urlP.get('dept');
      if (_urlToken && p) {
        var _patId = p._id || p.id || '';
        var _seedRecord = {
          token:     _urlToken,
          dept:      _urlDept || '',
          patientId: _patId,
          date:      new Date().toISOString().slice(0,10),
          checkedAt: new Date().toISOString(),
          status:    'waiting',
        };
        if (_patId) localStorage.setItem('nihms_patient_token_' + _patId, JSON.stringify(_seedRecord));
        try {
          var _allToks2 = JSON.parse(localStorage.getItem('nihms_checkin_tokens') || '{}');
          if (_patId) _allToks2[_patId] = _seedRecord;
          localStorage.setItem('nihms_checkin_tokens', JSON.stringify(_allToks2));
        } catch(_) {}
        localStorage.setItem('nihms_patient_token', JSON.stringify(_seedRecord));
      }
    } catch(_) {}

    var results = await Promise.allSettled([
      API._fetchDirect('/queue2/my-token?patientId='+p._id+'&facilityId='+(p.primaryFacility && p.primaryFacility._id || (API.getStoredUser() && (API.getStoredUser().facilityId || API.getStoredUser().facility))), {method:'GET'}),
      API.appointments.list({ patient: p._id, limit: 10 }),
      API._fetchDirect('/messages?recipientRole=PATIENT&patientId='+p._id+'&limit=20', {method:'GET'}).catch(function(){ return null; }),
      /* Also try /queue/token endpoint from receptionist portal */
      API._fetchDirect('/queue?patientId='+p._id+'&status=waiting&limit=1', {method:'GET'}).catch(function(){ return null; }),
    ]);

    var qTok  = results[0].value && results[0].value.data;
    var appts = results[1].value && results[1].value.data || [];
    var msgs  = (results[2] && results[2].value && results[2].value.data) || [];

    /* ── Fallback: read token from localStorage if API returned nothing ── */
    if (!qTok || ['completed','cancelled','skipped'].includes(qTok.status)) {
      try {
        var _patId2 = p._id || p.id || '';
        var lsRaw = null;
        /* 1. Patient-specific key (primary – most reliable, no cross-patient bleed) */
        if (_patId2) lsRaw = localStorage.getItem('nihms_patient_token_' + _patId2);
        /* 2. Shared map keyed by patientId (secondary) */
        if (!lsRaw && _patId2) {
          try {
            var _allToks = JSON.parse(localStorage.getItem('nihms_checkin_tokens') || '{}');
            if (_allToks[_patId2]) lsRaw = JSON.stringify(_allToks[_patId2]);
          } catch(_) {}
        }
        /* 3. Legacy single key – only accept if patientId matches or is absent */
        if (!lsRaw) {
          var _legacyRaw = localStorage.getItem('nihms_patient_token');
          if (_legacyRaw) {
            try {
              var _legacyTok = JSON.parse(_legacyRaw);
              if (!_patId2 || _legacyTok.patientId === _patId2) lsRaw = _legacyRaw;
            } catch(_) {}
          }
        }
        if (lsRaw) {
          var lsTok = JSON.parse(lsRaw);
          var today = new Date().toISOString().slice(0,10);
          if (lsTok.token && (lsTok.date === today || !lsTok.date)) {
            /* Try to enrich from queue API result */
            var queueRes = results[3] && results[3].value && results[3].value.data;
            var queueEntry = queueRes && queueRes[0];
            qTok = {
              token:         lsTok.token,
              status:        (queueEntry && queueEntry.status) || lsTok.status || 'waiting',
              dept:          lsTok.dept,
              aheadCount:    queueEntry ? queueEntry.position - 1 : null,
              estimatedWait: queueEntry ? queueEntry.waitMinutes : null,
              tokenType:     (queueEntry && queueEntry.type) || lsTok.type || 'normal',
              checkedAt:     lsTok.checkedAt,
              date:          lsTok.date,
              time:          lsTok.time,
              fromLocalStorage: true,
            };
          }
        }
      } catch(_) {}
    }

    /* ── Also load messages from receptionist localStorage bridge ── */
    try {
      var lsMsgs = JSON.parse(localStorage.getItem('nihms_patient_messages') || '[]');
      if (lsMsgs.length) {
        /* Merge with API messages, deduplicate by id */
        var merged = lsMsgs.concat(msgs);
        var seen = {};
        msgs = merged.filter(function(m) {
          var key = m.id || m._id || m.text;
          if (seen[key]) return false;
          seen[key] = true;
          return true;
        });
      }
    } catch(_) {}
    var now   = new Date();
    var upcoming = appts.filter(function(a){ return new Date(a.scheduledAt) > now && ['confirmed','pending'].includes(a.status); })
                       .sort(function(a,b){ return new Date(a.scheduledAt) - new Date(b.scheduledAt); });
    var nextAppt = upcoming[0];
    var v = p.latestVitals || {};
    var tokenBg = '#0F6E56'; /* NIHMS teal for all token types */
    var tokenStatusMsg = {
      waiting:'Please wait in the waiting room — you will be called shortly',
      'at-nurse':'Please proceed to the 🏥 Nurse Station',
      'with-doctor':'You are currently with the doctor 🩺',
      called:"IT'S YOUR TURN — proceed to the consultation room",
      in_consultation:'You are currently in consultation',
      post_consultation:'Consultation complete',
      lab:'Please go to the Laboratory',
      pharmacy:'Please go to the Pharmacy',
      done:'Your visit is complete. Thank you!',
      completed:'Your visit is complete. Thank you!'
    }[(qTok && qTok.status)] || 'Please wait';
    /* Location banner data */
    var _locMap = {
      waiting:      {icon:'⏳',label:'Waiting Room',   col:'#d97706',bg:'#fef3c7'},
      'at-nurse':   {icon:'🏥',label:'Nurse Station',  col:'#1A4A9B',bg:'#eff6ff'},
      'with-doctor':{icon:'🩺',label:'Consultation',   col:'#0F6E56',bg:'#f0fdfa'},
      done:         {icon:'✓', label:'Discharged',     col:'#16a34a',bg:'#dcfce7'},
      completed:    {icon:'✓', label:'Visit Complete', col:'#16a34a',bg:'#dcfce7'}
    };
    var _loc = _locMap[qTok && qTok.status] || _locMap['waiting'];

    wrap.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">' +
        '<div class="card" style="display:flex;align-items:center;gap:14px">' +
          '<div style="width:60px;height:60px;border-radius:50%;background:' + (profUrl?'transparent':'var(--green-light)') + ';overflow:hidden;flex-shrink:0;border:3px solid var(--green-light)">' +
            (profUrl ? '<img src="'+profUrl+'" style="width:100%;height:100%;object-fit:cover">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;color:var(--green-dark)">'+initials+'</div>') +
          '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:700;font-size:16px">'+p.firstName+' '+p.lastName+'</div>' +
            '<div style="font-size:12px;color:var(--text-muted)">MRN: '+(p.mrn||'—')+' · '+(p.age||'?')+'y · '+(p.gender||'—')+'</div>' +
            '<div style="font-size:12px;color:var(--text-muted)">ID: '+(p.nationalId||'—')+'</div>' +
            ((p.allergies&&p.allergies.length) ? '<div style="margin-top:4px"><span class="badge badge-red" style="font-size:10px"><i class="ti ti-alert-triangle" style="font-size:10px"></i> Allergy: '+p.allergies.join(', ')+'</span></div>' : '') +
          '</div>' +
          '<button class="btn btn-xs" onclick="Router.setPage(\'myprofile\')"><i class="ti ti-edit"></i>Edit</button>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-title"><i class="ti ti-heart-rate-monitor"></i>Latest vitals</div>' +
          (v.bp || v.heartRate || v.temperature ?
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:13px">' +
              '<div style="text-align:center;padding:8px;background:var(--bg-surface);border-radius:8px"><div style="font-size:18px;font-weight:700;color:'+(v.bp&&v.bp.systolic>140?'var(--red)':'var(--text)')+'">'+( v.bp ? v.bp.systolic+'/'+v.bp.diastolic : '—')+'</div><div style="font-size:10px;color:var(--text-muted)">BP mmHg</div></div>' +
              '<div style="text-align:center;padding:8px;background:var(--bg-surface);border-radius:8px"><div style="font-size:18px;font-weight:700">'+(v.heartRate||'—')+'</div><div style="font-size:10px;color:var(--text-muted)">Pulse bpm</div></div>' +
              '<div style="text-align:center;padding:8px;background:var(--bg-surface);border-radius:8px"><div style="font-size:18px;font-weight:700">'+(v.temperature||'—')+(v.temperature?'°C':'')+'</div><div style="font-size:10px;color:var(--text-muted)">Temp</div></div>' +
            '</div>' : '<div style="color:var(--text-muted);font-size:13px">No vitals recorded yet</div>') +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
        '<div class="card" id="mh-queue-card" style="' + (qTok&&qTok.status==='called'?'border:2px solid #0F6E56;box-shadow:0 0 0 4px rgba(15,110,86,.15)':'') + '">' +
          '<div class="card-title" style="display:flex;align-items:center;justify-content:space-between">' +
            '<span><i class="ti ti-ticket"></i>My queue ticket</span>' +
            (qTok ? '<span style="font-size:10px;font-weight:500;color:var(--text-muted);background:var(--bg-surface);padding:2px 8px;border-radius:99px">Auto-refreshes</span>' : '') +
          '</div>' +

          (qTok && !['completed','cancelled','skipped'].includes(qTok.status) ?

            /* ── Active token ── */
            (qTok.status==='called' ?
              '<div style="padding:10px 14px;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;border-radius:10px;font-weight:700;font-size:14px;margin-bottom:12px;text-align:center;animation:_nihms-pulse 1.5s infinite">' +
                '🔔 IT\'S YOUR TURN — Please proceed now' +
              '</div>'
            : '') +

            /* Token display */
            '<div style="text-align:center;padding:14px 0 10px">' +
              '<div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-hint);margin-bottom:4px">Your token</div>' +
              '<div style="font-size:72px;font-weight:900;font-family:var(--mono);color:'+tokenBg+';line-height:1;letter-spacing:.04em">'+(qTok.token||'—')+'</div>' +
              /* Department badge */
              (qTok.dept ? '<div style="display:inline-block;margin-top:8px;padding:3px 12px;background:var(--green-light);color:var(--green-dark);border-radius:99px;font-size:11px;font-weight:700">'+qTok.dept+'</div>' : '') +
            '</div>' +

            /* ── Location banner + journey progress ── */
            '<div style="margin:0 0 12px;padding:12px 14px;border-radius:12px;background:'+_loc.bg+';border:1.5px solid '+_loc.col+'22;display:flex;align-items:center;gap:10px">' +
              '<span style="font-size:22px">'+_loc.icon+'</span>' +
              '<div style="flex:1">' +
                '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:'+_loc.col+';font-weight:700;margin-bottom:1px">Current location</div>' +
                '<div style="font-size:15px;font-weight:800;color:'+_loc.col+'">'+_loc.label+'</div>' +
              '</div>' +
            '</div>' +
            /* Journey progress steps */
            (function(){
              var _steps=[{k:'waiting',l:'Wait'},{k:'at-nurse',l:'Nurse'},{k:'with-doctor',l:'Doctor'},{k:'done',l:'Done'}];
              var _stColors={waiting:'#d97706','at-nurse':'#1A4A9B','with-doctor':'#0F6E56',done:'#16a34a'};
              var _cur=_steps.findIndex(function(s){return s.k===(qTok&&qTok.status);});
              if(_cur<0)_cur=0;
              return '<div style="display:flex;align-items:flex-start;gap:0;margin-bottom:14px">'+
                _steps.map(function(s,i){
                  var active=i<=_cur, isCur=i===_cur;
                  var col=_stColors[s.k]||'#0F6E56';
                  return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;position:relative">'+
                    (i>0?'<div style="position:absolute;top:11px;right:50%;width:100%;height:2px;background:'+(active?col:'var(--border)')+'"></div>':'')+
                    '<div style="width:22px;height:22px;border-radius:50%;background:'+(isCur?col:active?col+'99':'var(--bg-surface)')+';border:2px solid '+(active?col:'var(--border)')+';display:flex;align-items:center;justify-content:center;z-index:1;flex-shrink:0">'+
                      (active?'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>':'')+
                    '</div>'+
                    '<div style="font-size:9px;font-weight:'+(isCur?'700':'400')+';color:'+(active?col:'var(--text-muted)')+';margin-top:4px;text-align:center">'+s.l+'</div>'+
                  '</div>';
                }).join('')+
              '</div>';
            })()+

            /* Now serving / Est. wait tiles — matches screenshot */
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0">' +
              '<div style="background:var(--bg-surface);border-radius:10px;padding:10px;text-align:center">' +
                '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:4px">Now serving</div>' +
                '<div style="font-size:20px;font-weight:800;color:var(--text)">'+(qTok.aheadCount!=null && qTok.aheadCount>=0 ? (qTok.aheadCount===0?qTok.token:'—') : '—')+'</div>' +
              '</div>' +
              '<div style="background:var(--bg-surface);border-radius:10px;padding:10px;text-align:center">' +
                '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:4px">Est. wait</div>' +
                '<div style="font-size:20px;font-weight:800;color:var(--text)">'+(qTok.estimatedWait!=null?qTok.estimatedWait+'<span style="font-size:12px;font-weight:500"> min</span>':'—')+'</div>' +
              '</div>' +
            '</div>' +

            /* Status message */
            '<div style="padding:8px 12px;background:var(--bg-surface);border-radius:8px;font-size:12px;color:var(--text-muted);text-align:center;margin-bottom:8px">' +
              tokenStatusMsg +
            '</div>' +

            /* Ahead count */
            (qTok.aheadCount!=null && qTok.aheadCount > 0 ?
              '<div style="font-size:12px;color:var(--text-muted);text-align:center;margin-bottom:8px">' +
                '<strong style="color:var(--text)">' + qTok.aheadCount + '</strong> patient' + (qTok.aheadCount===1?'':'s') + ' ahead of you' +
              '</div>'
            : '') +

            /* Special routing */
            (['lab','pharmacy'].includes(qTok.status) ?
              '<div class="alert-box alert-info" style="margin-top:8px">' +
                '<i class="ti ti-' + (qTok.status==='lab'?'flask':'pill') + '"></i> Please go to the <strong>' + (qTok.status==='lab'?'Laboratory':'Pharmacy') + '</strong>' +
              '</div>'
            : '') +

            /* Checked-in time */
            (qTok.checkedAt ?
              '<div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:6px">' +
                'Checked in at ' + new Date(qTok.checkedAt).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}) +
              '</div>'
            : '') +

            /* Survey on completion */
            (qTok.status==='completed' ?
              '<div style="text-align:center;margin-top:12px">' +
                '<div style="font-size:13px;color:var(--text-muted);margin-bottom:10px">Your visit is complete!</div>' +
                '<button style="width:100%;padding:12px;border:none;border-radius:50px;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:7px" onclick="_launchSurvey(\''+qTok._id+'\',null)">' +
                  '<svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>Rate your experience' +
                '</button>' +
              '</div>'
            : '')

          :
            /* ── No active token ── */
            '<div style="text-align:center;padding:20px 10px">' +
              '<div style="font-size:40px;margin-bottom:8px;opacity:.3">🎫</div>' +
              '<div style="font-size:13px;font-weight:600;color:var(--text-muted);margin-bottom:4px">No queue ticket today</div>' +
              '<div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Your token will appear here after the receptionist checks you in</div>' +
              '<a href="https://nihms.netlify.app/patient" style="display:block;padding:12px;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;border-radius:50px;font-size:13px;font-weight:700;text-decoration:none;text-align:center" target="_blank">' +
                'View token dashboard' +
              '</a>' +
            '</div>'
          ) +
        '</div>' +
        '<div class="card" id="mh-next-appt-card">' +
          '<div class="card-title"><i class="ti ti-calendar-event"></i>Next appointment</div>' +
          '<div id="mh-next-appt-body">' +
          (nextAppt ?
            '<div style="padding:12px;background:'+(new Date(nextAppt.scheduledAt).toDateString()===now.toDateString()?'var(--green-light)':'var(--bg-surface)')+';border-radius:10px;border:1.5px solid '+(new Date(nextAppt.scheduledAt).toDateString()===now.toDateString()?'var(--green)':'var(--border)')+';margin-bottom:10px">' +
              (new Date(nextAppt.scheduledAt).toDateString()===now.toDateString() ? '<div style="font-size:11px;font-weight:700;color:var(--green-dark);margin-bottom:6px">📅 TODAY</div>' : '') +
              '<div style="font-weight:600;font-size:14px;text-transform:capitalize;margin-bottom:4px"><i class="ti ti-'+(nextAppt.visitType==='telemedicine'?'video':'stethoscope')+'" style="font-size:13px;margin-right:4px"></i>'+(nextAppt.visitType||'').replace(/_/g,' ')+'</div>' +
              '<div style="font-size:12px;color:var(--text-muted)">'+new Date(nextAppt.scheduledAt).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'})+' at '+new Date(nextAppt.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'</div>' +
              '<div style="font-size:12px;color:var(--text-muted)">'+(nextAppt.facility&&nextAppt.facility.name||'')+'</div>' +
              '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">' +
                (nextAppt.visitType==='telemedicine' && new Date(nextAppt.scheduledAt).toDateString()===now.toDateString()
                  ? (nextAppt.status==='in_progress'
                      ? '<button class="btn btn-sm btn-green" onclick="_pJoinTeleRoom(\''+nextAppt._id+'\')"><i class="ti ti-video"></i>🔴 Join live session</button>'
                      : '<button class="btn btn-sm btn-green" onclick="_pJoinTeleRoom(\''+nextAppt._id+'\')"><i class="ti ti-video"></i>Join video session</button>'
                    )
                  : nextAppt.visitType==='telemedicine'
                    ? '<button class="btn btn-sm btn-green" onclick="Router.setPage(\'appointments\')"><i class="ti ti-video"></i>Telemedicine appointment</button>'
                    : '<button class="btn btn-sm" onclick="Router.setPage(\'checkin\')"><i class="ti ti-building-hospital"></i>Visit reception</button>'
                ) +
                '<button class="btn btn-sm" onclick="Router.setPage(\'appointments\')"><i class="ti ti-calendar"></i>All</button>' +
              '</div>' +
            '</div>'
          :
            '<div style="text-align:center;padding:12px;color:var(--text-muted)"><i class="ti ti-calendar-off" style="font-size:28px;opacity:.25;display:block;margin-bottom:6px"></i>No upcoming appointments</div>' +
            '<button class="btn btn-green" style="width:100%" onclick="Router.setPage(\'book\')"><i class="ti ti-plus"></i>Book an appointment</button>'
          ) +
          '</div>' +
          '<div id="mh-followup-section"></div>' +
        '</div>' +
      '</div>' +

      /* ── Messages from Reception ── */
      (msgs && msgs.length ?
        '<div class="card" style="margin-top:14px">' +
          '<div class="card-title" style="display:flex;align-items:center;justify-content:space-between">' +
            '<span><i class="ti ti-message-2"></i>Messages from Reception</span>' +
            '<span style="background:var(--green);color:#fff;border-radius:99px;font-size:10px;font-weight:700;padding:2px 8px;min-width:18px;text-align:center">' +
              msgs.filter(function(m){ return !m.read; }).length +
            '</span>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:0">' +
            msgs.slice(0,5).map(function(m,i) {
              var isUnread = !m.read;
              var timeStr  = m.sentAt
                ? new Date(m.sentAt).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})
                : (m.time || '');
              var dateStr  = m.sentAt
                ? new Date(m.sentAt).toLocaleDateString('en-ZA',{day:'numeric',month:'short'})
                : '';
              return '<div style="padding:12px 14px;border-bottom:' + (i<msgs.length-1?'1px solid var(--border)':'none') + ';' + (isUnread?'background:#f0fdf4':'') + ';display:flex;align-items:flex-start;gap:10px">' +
                '<div style="width:34px;height:34px;border-radius:50%;background:' + (isUnread?'var(--green)':'var(--bg-surface)') + ';display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;border:1.5px solid ' + (isUnread?'var(--green)':'var(--border)') + '">' +
                  (isUnread ? '📩' : '📬') +
                '</div>' +
                '<div style="flex:1;min-width:0">' +
                  '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">' +
                    '<span style="font-size:12px;font-weight:' + (isUnread?'700':'600') + ';color:' + (isUnread?'var(--green-dark)':'var(--text)') + '">' +
                      (m.from || m.senderName || 'Reception') +
                    '</span>' +
                    (isUnread ? '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0"></span>' : '') +
                    '<span style="margin-left:auto;font-size:10px;color:var(--text-muted);white-space:nowrap">' + (dateStr ? dateStr + ' · ' : '') + timeStr + '</span>' +
                  '</div>' +
                  '<div style="font-size:13px;color:var(--text);line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' +
                    (m.text || m.body || m.message || '') +
                  '</div>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
          (msgs.length > 5 ?
            '<div style="padding:10px 14px;text-align:center">' +
              '<button class="btn btn-xs" onclick="Router.setPage(\'messaging\')"><i class="ti ti-messages"></i>View all ' + msgs.length + ' messages</button>' +
            '</div>'
          : '') +
        '</div>'
      :
        '<div class="card" style="margin-top:14px">' +
          '<div class="card-title"><i class="ti ti-message-2"></i>Messages from Reception</div>' +
          '<div style="text-align:center;padding:16px;color:var(--text-muted)">' +
            '<i class="ti ti-message-off" style="font-size:28px;opacity:.25;display:block;margin-bottom:6px"></i>' +
            '<div style="font-size:13px">No messages from reception yet</div>' +
          '</div>' +
        '</div>'
      );
    /* Load follow-up dates from consultation notes */
    try {
      if (p && p._id) {
        var fuRes = await API._fetchDirect('/consultation-notes?patient='+p._id+'&limit=20', {method:'GET'});
        var fuNotes = (fuRes.data||[]).filter(function(n){ return n.followUpDate && new Date(n.followUpDate) > now; });
        fuNotes.sort(function(a,b){ return new Date(a.followUpDate)-new Date(b.followUpDate); });
        var fuEl = document.getElementById('mh-followup-section');
        if (fuEl && fuNotes.length) {
          var fuNext = fuNotes[0];
          var fuDate = new Date(fuNext.followUpDate);
          var fuDays = Math.ceil((fuDate-now)/86400000);
          fuEl.innerHTML =
            '<div style="margin-top:10px;padding:10px 12px;background:#EEF7FF;border-radius:10px;border:1.5px solid #4A9BD4">' +
              '<div style="font-size:11px;font-weight:700;color:#1A4A9B;margin-bottom:4px"><i class="ti ti-calendar-repeat"></i> FOLLOW-UP RECOMMENDED</div>' +
              '<div style="font-size:13px;font-weight:600">' + fuDate.toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'long',year:'numeric'}) + '</div>' +
              (fuNext.followUpNotes ? '<div style="font-size:12px;color:var(--text-muted);margin-top:2px">' + fuNext.followUpNotes + '</div>' : '') +
              '<div style="font-size:11px;color:#4A9BD4;margin-top:4px">' + fuDays + ' day' + (fuDays===1?'':'s') + ' away</div>' +
              '<button class="btn btn-xs" style="margin-top:8px;border-color:#4A9BD4;color:#1A4A9B" onclick="_mhBookFollowUp(this.dataset.d,this.dataset.n)" data-d="' + fuNext.followUpDate + '" data-n="' + (fuNext.followUpNotes||'Follow-up appointment').replace(/"/g,'&quot;') + '">' +
                '<i class="ti ti-calendar-plus"></i>Book this follow-up</button>' +
            '</div>';
        }
      }
    } catch(_) {}

  } catch(e) {
    if (wrap) wrap.innerHTML = '<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>' + e.message + '</div>';
  }
}

/* ── Book follow-up from home page ── */
window._mhBookFollowUp = function(followUpDate, notes) { if (!followUpDate && arguments[0] && arguments[0].dataset) { notes = arguments[0].dataset.n; followUpDate = arguments[0].dataset.d; }
  /* Pre-fill the booking page with the follow-up date and navigate there */
  window._mhPreFillFollowUp = { date: followUpDate, notes: notes };
  Router.setPage('book');
  /* After page loads, open calendar and show the follow-up date */
  setTimeout(function() {
    var typeEl = document.getElementById('bk-type');
    if (typeEl) typeEl.value = 'follow_up';

    var d = new Date(followUpDate);
    window._BKC = window._BKC || {};
    window._BKC.year  = d.getFullYear();
    window._BKC.month = d.getMonth();
    window._BKC.selected = d.getFullYear() + '-' +
      String(d.getMonth()+1).padStart(2,'0') + '-' +
      String(d.getDate()).padStart(2,'0');

    /* Show the calendar and update the label */
    var calCard = document.getElementById('bk-cal-card');
    if (calCard) calCard.style.display = 'block';
    if (typeof window._bkCalDraw === 'function') window._bkCalDraw();
    if (typeof window._bkUpdLabel === 'function') window._bkUpdLabel();

    UI.showToast('Follow-up date pre-selected — choose a time and confirm', 'ok');
  }, 400);
};

/* ── Launch the patient experience survey ── */
window._launchSurvey = function(tokenId, apptId) {
  window._srvTokenId = tokenId || null;
  window._srvApptId  = apptId  || null;
  Router.setPage('survey');
};

window._mhRate = async function(id, rating) {
  try {
    await API._fetchDirect('/queue2/'+id+'/feedback', {method:'POST', body:JSON.stringify({satisfaction:rating})});
    var el = document.getElementById('mh-stars');
    if (el) el.innerHTML = '<div style="color:var(--green-dark);font-weight:600">⭐ Thank you for your feedback!</div>';
  } catch(_) { UI.showToast('Feedback failed','err'); }
};

window._uploadAvatarFromTopbar = async function(input) {
  var file = input.files[0];
  if (!file) return;
  if (file.size > 2*1024*1024) { UI.showToast('Photo must be under 2 MB','err'); return; }
  var avatarEl = document.getElementById('topbar-avatar');
  if (avatarEl) avatarEl.style.opacity = '0.5';
  try {
    var token = API.Tokens ? API.Tokens.getAccess() : (localStorage.getItem('nihms_access')||'');
    var form  = new FormData(); form.append('profilePicture', file);
    var res   = await fetch('https://nihms-backend.onrender.com/api/v1/patients/me/upload-profile', {method:'POST',headers:{'Authorization':'Bearer '+token},body:form});
    var data  = await res.json();
    if (!data.success) throw new Error(data.message||'Upload failed');
    var url = 'https://nihms-backend.onrender.com' + data.data.url;
    if (avatarEl) {
      avatarEl.style.opacity='1'; avatarEl.style.padding='0'; avatarEl.style.overflow='hidden';
      avatarEl.innerHTML = '<img src="'+url+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%"><input type="file" id="avatar-file-input" accept=".jpg,.jpeg,.png" style="display:none" onchange="_uploadAvatarFromTopbar(this)">';
    }
    UI.showToast('Profile picture updated!','ok');
  } catch(e) {
    if (avatarEl) avatarEl.style.opacity='1';
    UI.showToast(e.message||'Upload failed','err');
  }
};

/* ══════════════════════════════════════════════════
   MY RECORDS
══════════════════════════════════════════════════ */
Pages['myrecords'] = () => {
  setTimeout(_mrLoad, 0);
  return `
<div style="background:linear-gradient(135deg,#0F6E56,#1A4A9B);border-radius:16px;padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
  <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;flex-shrink:0">
    <i class="ti ti-notes-medical" style="font-size:22px;color:#fff"></i>
  </div>
  <div>
    <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:2px">My medical records</div>
    <div style="font-size:12px;color:rgba(255,255,255,.75)">Consultations, lab results, prescriptions &amp; vitals</div>
  </div>
</div>

<div style="display:flex;gap:2px;margin-bottom:16px;background:var(--bg-surface);border-radius:10px;padding:4px;max-width:680px">
  <button id="mr-tab-btn-1" onclick="_mrTab(1)" style="flex:1;padding:8px 12px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:var(--bg-card);color:var(--green-dark);box-shadow:0 1px 3px rgba(0,0,0,.08)"><i class="ti ti-stethoscope"></i> Consultations</button>
  <button id="mr-tab-btn-2" onclick="_mrTab(2)" style="flex:1;padding:8px 12px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:transparent;color:var(--text-muted)"><i class="ti ti-flask"></i> Lab Results</button>
  <button id="mr-tab-btn-3" onclick="_mrTab(3)" style="flex:1;padding:8px 12px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:transparent;color:var(--text-muted)"><i class="ti ti-pill"></i> Prescriptions</button>
  <button id="mr-tab-btn-4" onclick="_mrTab(4)" style="flex:1;padding:8px 12px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;background:transparent;color:var(--text-muted)"><i class="ti ti-heart-rate-monitor"></i> Vitals</button>
</div>

<div id="mr-tab-1" style="max-width:820px"><div id="mr-consult-body" style="color:var(--text-muted)">Loading...</div></div>
<div id="mr-tab-2" style="display:none;max-width:820px"><div id="mr-lab-body" style="color:var(--text-muted)">Loading...</div></div>
<div id="mr-tab-3" style="display:none;max-width:820px"><div id="mr-rx-body" style="color:var(--text-muted)">Loading...</div></div>
<div id="mr-tab-4" style="display:none;max-width:820px"><div id="mr-vitals-body" style="color:var(--text-muted)">Loading...</div></div>`;
};

window._mrTab = function(n) {
  for (var i=1;i<=4;i++){
    var t=document.getElementById('mr-tab-'+i), b=document.getElementById('mr-tab-btn-'+i);
    if(t) t.style.display=i===n?'block':'none';
    if(b){b.style.background=i===n?'var(--bg-card)':'transparent';b.style.color=i===n?'var(--green-dark)':'var(--text-muted)';b.style.boxShadow=i===n?'0 1px 3px rgba(0,0,0,.08)':'none';}
  }
  if(n===2&&(document.getElementById('mr-lab-body')||{}).textContent==='Loading...')    _mrLoadLabs();
  if(n===3&&(document.getElementById('mr-rx-body')||{}).textContent==='Loading...')     _mrLoadRx();
  if(n===4&&(document.getElementById('mr-vitals-body')||{}).textContent==='Loading...') _mrLoadVitals();
};

async function _mrLoad() { await _mrLoadConsultNotes(); }

async function _mrLoadConsultNotes() {
  var wrap = document.getElementById('mr-consult-body'); if(!wrap) return;
  try {
    var p = await _getMyPatientRecord();
    if (!p){ wrap.innerHTML='<div class="alert-box alert-warn">Please complete your profile first.</div>'; return; }
    var res   = await API._fetchDirect('/consultation-notes?patient='+p._id+'&limit=50',{method:'GET'});
    var notes = res.data || [];
    if (!notes.length) {
      wrap.innerHTML='<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="ti ti-notes" style="font-size:40px;opacity:.25;display:block;margin-bottom:12px"></i><div style="font-weight:600;margin-bottom:4px">No consultation records yet</div><div style="font-size:13px">Your consultation notes will appear here after a visit</div></div>';
      return;
    }
    wrap.innerHTML = notes.map(function(n){
      var date=new Date(n.createdAt);
      var dateStr=date.toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
      var timeStr=date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      var hfu=n.followUpDate&&new Date(n.followUpDate)>new Date();
      return '<div class="card" style="margin-bottom:12px">'+
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border)">'+
          '<div>'+
            '<div style="font-weight:700;font-size:15px;margin-bottom:4px">'+dateStr+' at '+timeStr+'</div>'+
            '<div style="font-size:13px;color:var(--text-muted);margin-bottom:2px"><i class="ti ti-user-circle" style="font-size:13px;margin-right:4px"></i>'+
              (n.doctorName||('Dr. '+(n.doctor&&n.doctor.firstName||'')+(n.doctor&&n.doctor.lastName?' '+n.doctor.lastName:'')))+
              (n.practiceNumber&&n.practiceNumber!=='Not registered'?' &middot; Practice No: <strong>'+n.practiceNumber+'</strong>':'')+'</div>'+
            '<div style="font-size:13px;color:var(--text-muted)"><i class="ti ti-building-hospital" style="font-size:13px;margin-right:4px"></i>'+
              (n.facilityName||(n.facility&&n.facility.name)||'—')+'</div>'+
          '</div>'+
          (n.icd10Code?'<span class="badge badge-blue" style="font-size:11px;flex-shrink:0">'+n.icd10Code+(n.icd10Description?' — '+n.icd10Description:'')+'</span>':'')+
        '</div>'+
        (n.chiefComplaint?'<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:4px">Chief complaint</div><div style="font-size:13px;padding:8px 12px;background:var(--bg-surface);border-radius:8px">'+n.chiefComplaint+'</div></div>':'')+
        (n.clinicalNotes?'<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:4px">Clinical notes</div><div style="font-size:13px;padding:8px 12px;background:var(--bg-surface);border-radius:8px;white-space:pre-line">'+n.clinicalNotes+'</div></div>':'')+
        (n.treatmentPlan?'<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin-bottom:4px">Treatment plan</div><div style="font-size:13px;padding:8px 12px;background:#EEF7FF;border-radius:8px">'+n.treatmentPlan+'</div></div>':'')+
        (n.followUpDate?'<div style="margin-top:10px;padding:8px 12px;background:'+(hfu?'var(--green-light)':'var(--bg-surface)')+';border-radius:8px;font-size:13px;display:flex;align-items:center;gap:8px"><i class="ti ti-calendar-event" style="color:var(--green-dark)"></i><span>'+(hfu?'<strong>Follow-up:</strong> ':'<strong>Follow-up (past):</strong> ')+new Date(n.followUpDate).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'long',year:'numeric'})+'</span>'+(n.followUpNotes?'<span style="color:var(--text-muted)"> \u2014 '+n.followUpNotes+'</span>':'')+'</div>':'')+
      '</div>';
    }).join('');
  } catch(e){ if(wrap) wrap.innerHTML='<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>'+e.message+'</div>'; }
}

async function _mrLoadLabs() {
  var wrap=document.getElementById('mr-lab-body'); if(!wrap) return;
  try {
    var p=await _getMyPatientRecord(); if(!p) return;
    var res=await API.labs.list({patient:p._id,limit:30});
    var labs=res.data||[];
    if(!labs.length){wrap.innerHTML='<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="ti ti-flask" style="font-size:40px;opacity:.25;display:block;margin-bottom:12px"></i>No lab results on record</div>';return;}
    wrap.innerHTML=labs.map(function(l){
      var hasCrit=(l.tests||[]).some(function(t){return t.flag==='critical';});
      return '<div class="card" style="margin-bottom:12px">'+
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">'+
          '<div><div style="font-weight:700;font-size:14px">'+(l.tests||[]).map(function(t){return t.name;}).join(', ')+'</div>'+
          '<div style="font-size:12px;color:var(--text-muted)">'+new Date(l.createdAt).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})+' \u00b7 '+(l.priority||'routine')+'</div></div>'+
          '<span class="badge '+(l.status==='collected'||l.status==='ready'?'badge-green':l.status==='processing'?'badge-blue':'badge-amber')+'">'+l.status+'</span>'+
        '</div>'+
        (hasCrit?'<div style="padding:6px 10px;background:#FEF2F2;border-radius:6px;font-size:12px;color:var(--red);font-weight:600;margin-bottom:8px">\u26a0\ufe0f Critical result \u2014 contact your doctor</div>':'')+
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">'+
        (l.tests||[]).filter(function(t){return t.result;}).map(function(t){
          return '<div style="padding:8px 10px;background:var(--bg-surface);border-radius:8px;font-size:12px">'+
            '<div style="color:var(--text-muted);margin-bottom:2px">'+t.name+'</div>'+
            '<div style="font-weight:700;font-size:14px'+(t.flag&&t.flag!=='normal'?';color:var(--red)':'')+'">'+t.result+'</div>'+
            (t.referenceRange?'<div style="color:var(--text-hint);font-size:11px">Ref: '+t.referenceRange+'</div>':'')+
            (t.flag&&t.flag!=='normal'?'<div style="color:var(--red);font-size:11px;font-weight:600">['+t.flag+']</div>':'')+
          '</div>';
        }).join('')+'</div></div>';
    }).join('');
  } catch(e){if(wrap) wrap.innerHTML='<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>'+e.message+'</div>';}
}

async function _mrLoadRx() {
  var wrap=document.getElementById('mr-rx-body'); if(!wrap) return;
  try {
    var p=await _getMyPatientRecord(); if(!p) return;

    /* ── Fetch from API ── */
    var rxs=[];
    try {
      var res=await API.prescriptions.list({patient:p._id,limit:50});
      rxs=res.data||[];
    } catch(_apiErr){}

    /* ── Merge localStorage cache written by doctor.js _dSaveRx() ──
       Cache entries appear immediately (even before the server index refreshes).
       API records take precedence: any cached entry whose _id or prescriptionRef
       already exists in the API results is discarded.                          */
    try {
      var cacheKey='NIHMS_PATIENT_PRESCRIPTIONS_'+(p._id||p.id||'');
      var cached=JSON.parse(localStorage.getItem(cacheKey)||'[]');
      if(cached.length){
        /* Build a set of identifiers already present in API results */
        var seen={};
        rxs.forEach(function(r){ if(r._id) seen[r._id]=true; if(r.prescriptionRef) seen[r.prescriptionRef]=true; });
        /* Prepend cache entries not yet in the API results */
        cached.forEach(function(c){
          if(!seen[c._id] && !seen[c.prescriptionRef]) rxs.unshift(c);
        });
      }
    } catch(_cErr){}

    if(!rxs.length){wrap.innerHTML='<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="ti ti-pill" style="font-size:40px;opacity:.25;display:block;margin-bottom:12px"></i>No prescriptions on record</div>';return;}
    wrap.innerHTML=rxs.map(function(r){
      var statusLabel=r.status||'pending';
      var statusBadge=statusLabel==='dispensed'?'badge-green':statusLabel==='pending'?'badge-amber':'badge-gray';
      var prescriberFirst=r.prescribedBy&&r.prescribedBy.firstName||r.prescribedByName||'\u2014';
      var prescriberLast=r.prescribedBy&&r.prescribedBy.lastName||'';
      var dateStr=r.createdAt?new Date(r.createdAt).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}):'';
      return '<div class="card" style="margin-bottom:10px">'+
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">'+
          '<div><div style="font-weight:700;font-size:14px">'+(r.lines||[]).map(function(l){return l.medicationName||'Unknown';}).join(', ')+'</div>'+
          '<div style="font-size:12px;color:var(--text-muted)">Dr. '+prescriberFirst+' '+prescriberLast+(dateStr?' \u00b7 '+dateStr:'')+'</div></div>'+
          '<span class="badge '+statusBadge+'">'+statusLabel+'</span>'+
        '</div>'+
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px">'+
        (r.lines||[]).map(function(l){
          return '<div style="padding:8px 10px;background:var(--bg-surface);border-radius:8px;font-size:12px">'+
            '<div style="font-weight:600;margin-bottom:2px">'+(l.medicationName||'\u2014')+'</div>'+
            '<div style="color:var(--text-muted)">'+(l.dosage||'\u2014')+(l.durationDays?' \u00b7 '+l.durationDays+(typeof l.durationDays==='number'?'d':''): '')+
            '</div>'+(l.instructions?'<div style="color:var(--text-hint);margin-top:2px">'+l.instructions+'</div>':'')+
          '</div>';
        }).join('')+'</div>'+
        (r.dispensingPharmacy?'<div style="font-size:11px;color:var(--text-muted);margin-top:6px"><i class="ti ti-building-hospital" style="margin-right:4px"></i>Dispensing: '+r.dispensingPharmacy+'</div>':'')+
        (r.patientInstructions?'<div style="font-size:11px;color:var(--text-muted);margin-top:4px"><i class="ti ti-info-circle" style="margin-right:4px"></i>'+r.patientInstructions+'</div>':'')+
        (r.repeatPrescription?'<div style="font-size:11px;color:var(--green-dark);margin-top:4px;font-weight:600"><i class="ti ti-refresh" style="margin-right:4px"></i>Repeat prescription'+
          (r.repeat&&r.repeat.remaining!==undefined?' \u00b7 '+r.repeat.remaining+' repeat(s) remaining':'')+'</div>':'')+
        '</div>';
    }).join('');
  } catch(e){if(wrap) wrap.innerHTML='<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>'+e.message+'</div>';}
}

async function _mrLoadVitals() {
  var wrap=document.getElementById('mr-vitals-body'); if(!wrap) return;
  try {
    var p=await _getMyPatientRecord(); if(!p) return;
    var v=p.latestVitals||{};
    var fields=[
      {label:'Blood Pressure',value:v.bp?v.bp.systolic+'/'+v.bp.diastolic+' mmHg':'\u2014',icon:'ti-heart-rate',alert:v.bp&&v.bp.systolic>140},
      {label:'Heart Rate',value:v.heartRate?v.heartRate+' bpm':'\u2014',icon:'ti-pulse'},
      {label:'Temperature',value:v.temperature?v.temperature+'\u00b0C':'\u2014',icon:'ti-temperature'},
      {label:'SpO2',value:v.spO2?v.spO2+'%':'\u2014',icon:'ti-lungs',alert:v.spO2&&v.spO2<95},
      {label:'Weight',value:v.weight?v.weight+' kg':'\u2014',icon:'ti-scale'},
      {label:'BMI',value:v.bmi?v.bmi:'\u2014',icon:'ti-ruler'},
    ];
    wrap.innerHTML='<div class="card" style="margin-bottom:12px"><div class="card-title"><i class="ti ti-heart-rate-monitor"></i>Latest vitals</div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">'+
      fields.map(function(f){return '<div style="padding:12px;background:var(--bg-surface);border-radius:10px;border:1.5px solid '+(f.alert?'var(--red)':'var(--border)')+'">'+
        '<i class="ti '+f.icon+'" style="font-size:18px;color:'+(f.alert?'var(--red)':'var(--green-dark)')+';display:block;margin-bottom:6px"></i>'+
        '<div style="font-size:20px;font-weight:800;color:'+(f.alert?'var(--red)':'var(--text)')+'">'+f.value+'</div>'+
        '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">'+f.label+'</div>'+
        (f.alert?'<div style="font-size:10px;color:var(--red);font-weight:700;margin-top:4px">\u26a0\ufe0f Abnormal</div>':'')+
      '</div>';}).join('')+'</div>'+
      (v.recordedAt?'<div style="font-size:11px;color:var(--text-muted);margin-top:10px">Last recorded: '+new Date(v.recordedAt).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})+'</div>':'')+
    '</div>'+
    '<div class="card"><div class="card-title"><i class="ti ti-info-circle"></i>Normal reference ranges</div>'+
    '<div style="font-size:12px;display:grid;grid-template-columns:1fr 1fr;gap:6px">'+
    '<div>BP: &lt;120/80 mmHg</div><div>HR: 60\u2013100 bpm</div>'+
    '<div>Temp: 36.1\u201337.2\u00b0C</div><div>SpO2: &gt;95%</div>'+
    '<div>BMI: 18.5\u201324.9</div><div></div></div></div>';
  } catch(e){if(wrap) wrap.innerHTML='<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>'+e.message+'</div>';}
}


Pages['appointments'] = () => {
  setTimeout(async function() {
    var wrap = document.getElementById('appt-list'); if (!wrap) return;
    try {
      var p = await _getMyPatientRecord();
      if (!p) { wrap.innerHTML='<p style="color:var(--text-muted)">Please complete your profile first.</p>'; return; }
      var res   = await API.appointments.list({ patient: p._id, limit: 30 });
      var items = (res.data||[]).sort(function(a,b){ return new Date(a.scheduledAt)-new Date(b.scheduledAt); });
      var now   = new Date();
      wrap.innerHTML = items.length ? items.map(function(a) {
        var badge = {confirmed:'badge-green',pending:'badge-amber',in_progress:'badge-green',completed:'badge-green',cancelled:'badge-gray',no_show:'badge-red'}[a.status]||'badge-gray';
        var isFuture = new Date(a.scheduledAt) > now;
        var canAct   = ['pending','confirmed'].includes(a.status) && isFuture;
        var isToday  = new Date(a.scheduledAt).toDateString() === now.toDateString();
        var isTele   = a.visitType === 'telemedicine';
        /* Show Join Video button when: confirmed today (check-in) OR in_progress today (session already started by doctor) */
        var showTeleJoin = isTele && isToday && (a.status === 'confirmed' || a.status === 'in_progress');
        var isLive       = isTele && isToday && a.status === 'in_progress';
        return '<div style="padding:14px 0;border-bottom:1px solid var(--border)'+(isToday?';background:var(--green-light);margin:0 -4px;padding-left:4px;padding-right:4px;border-radius:8px':'')+'";>' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">' +
            '<div style="flex:1;min-width:0">' +
              (isToday?'<div style="font-size:11px;font-weight:700;color:var(--green-dark);margin-bottom:4px">📅 TODAY'+(isLive?' &nbsp;🔴 LIVE':'')+' </div>':'') +
              '<div style="font-weight:600;font-size:13px;text-transform:capitalize;margin-bottom:2px"><i class="ti ti-'+(isTele?'video':'stethoscope')+'" style="font-size:13px;margin-right:5px"></i>'+(a.visitType||'').replace('_',' ')+'</div>' +
              '<div style="font-size:12px;color:var(--text-muted)">'+new Date(a.scheduledAt).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'})+' at '+new Date(a.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'</div>' +
              '<div style="font-size:12px;color:var(--text-muted)">'+(a.facility&&a.facility.name||'')+'</div>' +
              (a.doctor?'<div style="font-size:12px;color:var(--text-muted)">Dr. '+(a.doctor.firstName||'')+' '+(a.doctor.lastName||'')+'</div>':'') +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;flex-wrap:wrap">' +
              '<span class="badge '+badge+'">'+(a.status==='in_progress'?'In Progress':a.status)+'</span>' +
              (canAct?'<button class="btn btn-xs" onclick="_showReschedule(\''+a._id+'\',\''+a.visitType+'\',\''+new Date(a.scheduledAt).toISOString().slice(0,16)+'\')"><i class="ti ti-calendar-event"></i>Reschedule</button>':'') +
              (showTeleJoin
                ? '<button class="btn btn-xs btn-green" onclick="_pJoinTeleRoom(\''+a._id+'\')" style="'+(isLive?'animation:pulse 2s infinite;box-shadow:0 0 0 0 #1D9E75':'')+'">' +
                    '<i class="ti ti-video"></i>'+(isLive?'Join live session':'Check in &amp; join video')+
                  '</button>'
                : (!isTele&&isToday&&a.status==='confirmed'
                    ? '<button class="btn btn-xs" style="color:var(--text-muted);cursor:default;pointer-events:none"><i class="ti ti-building-hospital"></i>Visit reception</button>'
                    : '')
              ) +
              (canAct?'<button class="btn btn-xs" style="color:var(--red);border-color:var(--red)" onclick="_showCancelAppt(\''+a._id+'\')"><i class="ti ti-x"></i>Cancel</button>':'') +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('') :
      '<div style="text-align:center;padding:32px;color:var(--text-muted)"><i class="ti ti-calendar-off" style="font-size:36px;opacity:.3;display:block;margin-bottom:10px"></i>No appointments found.<br><button class="btn btn-sm btn-green" onclick="Router.setPage(\'book\')" style="margin-top:12px"><i class="ti ti-plus"></i>Book now</button></div>';
    } catch(e) { if(wrap) wrap.innerHTML='<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>'+e.message+'</div>'; }
  }, 0);

  return '<div style="background:linear-gradient(135deg,#0F6E56,#1A4A9B);border-radius:16px;padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:14px">' +
      '<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
        '<i class="ti ti-calendar-event" style="font-size:22px;color:#fff"></i>' +
      '</div>' +
      '<div style="flex:1">' +
        '<div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:2px">My appointments</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,.75)">Upcoming visits, reschedule &amp; check-in</div>' +
      '</div>' +
      '<button class="btn btn-green" onclick="Router.setPage(\'book\')" style="background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.35);border-radius:50px;color:#fff;flex-shrink:0">' +
        '<i class="ti ti-plus"></i>Book new visit' +
      '</button>' +
    '</div>' +
    '<div class="card"><div class="card-title"><i class="ti ti-calendar"></i>All appointments</div><div id="appt-list" style="color:var(--text-muted);padding:16px">Loading...</div></div>' +
    '<div id="reschedule-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9000;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto">' +
      '<div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:860px;max-width:96vw;box-shadow:0 24px 64px rgba(0,0,0,.3);margin-bottom:40px">' +
        '<div style="font-size:16px;font-weight:700;margin-bottom:18px">Reschedule appointment</div>' +
        '<div style="display:grid;grid-template-columns:360px 1fr;gap:20px;align-items:start">' +
          '<div>' +
            '<div class="f-group"><label class="f-label">New date &amp; time *</label>' +
              '<input type="hidden" id="rs-datetime">' +
              '<div id="rs-date-display" onclick="window._rsToggleCal()" style="padding:11px 14px;border:1.5px solid var(--border);border-radius:var(--radius);font-size:13px;color:var(--text-muted);background:#fff;display:flex;align-items:center;gap:8px;cursor:pointer">' +
                '<i class="ti ti-calendar" style="font-size:16px;color:var(--green-dark);flex-shrink:0"></i>' +
                '<span id="rs-date-lbl">Click to select new date &amp; time</span>' +
                '<i class="ti ti-chevron-down" style="font-size:12px;margin-left:auto;color:var(--text-hint)"></i>' +
              '</div>' +
            '</div>' +
            '<div class="f-group"><label class="f-label">Reason *</label>' +
              '<select class="f-select" id="rs-reason-sel" style="margin:0"><option value="">— Select reason —</option><option value="Personal emergency">Personal emergency</option><option value="Transport issue">Transport issue</option><option value="Work commitment">Work commitment</option><option value="Feeling better">Feeling better</option><option value="other">Other (specify)</option></select>' +
              '<input class="f-input" id="rs-reason-other" placeholder="Please specify..." style="margin-top:8px;display:none">' +
            '</div>' +
            '<div id="rs-alert" style="display:none;margin-bottom:10px;padding:10px 14px;background:#FEF2F2;border-left:4px solid var(--red);border-radius:8px;font-size:13px;color:#991B1B"></div>' +
            '<div style="display:flex;gap:8px">' +
              '<button class="btn btn-green" id="rs-submit-btn" onclick="_submitReschedule()"><i class="ti ti-calendar-check"></i>Confirm reschedule</button>' +
              '<button class="btn" onclick="window._rsClose()">Cancel</button>' +
            '</div>' +
          '</div>' +
          '<div id="rs-cal-wrap" style="display:none">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
              '<button onclick="window._rsCalNav(-1)" style="width:34px;height:34px;border:1.5px solid var(--border);border-radius:8px;background:none;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;color:var(--text-muted)">&#8249;</button>' +
              '<strong id="rs-month-lbl" style="font-size:15px"></strong>' +
              '<button onclick="window._rsCalNav(1)"  style="width:34px;height:34px;border:1.5px solid var(--border);border-radius:8px;background:none;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;color:var(--text-muted)">&#8250;</button>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(7,1fr);text-align:center;margin-bottom:4px">' +
              '<div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Su</div>' +
              '<div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Mo</div>' +
              '<div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Tu</div>' +
              '<div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">We</div>' +
              '<div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Th</div>' +
              '<div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Fr</div>' +
              '<div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Sa</div>' +
            '</div>' +
            '<div id="rs-day-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:14px"></div>' +
            '<div style="border-top:1px solid var(--border);padding-top:12px;margin-bottom:12px">' +
              '<div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.05em;margin-bottom:8px;text-transform:uppercase">Select time</div>' +
              '<div style="display:flex;align-items:center;gap:8px">' +
                '<input type="number" id="rs-t-h" value="8" min="1" max="12" style="width:56px;padding:9px;border:1.5px solid var(--border);border-radius:8px;text-align:center;font-size:16px;font-weight:700;font-family:inherit;outline:none" oninput="window._rsUpdLabel()" onfocus="this.select()">' +
                '<span style="font-weight:700;font-size:20px">:</span>' +
                '<select id="rs-t-m" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;outline:none" onchange="window._rsUpdLabel()"><option value="00">00</option><option value="30">30</option></select>' +
                '<select id="rs-t-ampm" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;outline:none" onchange="window._rsUpdLabel()"><option>AM</option><option>PM</option></select>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;gap:12px;font-size:12px;color:var(--text-muted)">' +
              '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#EDFBF3;border:1.5px solid #7ADAA8;margin-right:4px"></span>Available</span>' +
              '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#FFF9E6;border:1.5px solid #F0D060;margin-right:4px"></span>Limited</span>' +
              '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#FEF2F2;border:1.5px solid #E24B4A;margin-right:4px"></span>Fully booked</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div id="cancel-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:center;justify-content:center">' +
      '<div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:420px;max-width:95vw;box-shadow:var(--shadow-md)">' +
        '<div style="font-size:16px;font-weight:600;margin-bottom:14px">Cancel appointment</div>' +
        '<div class="f-group"><label class="f-label">Reason</label>' +
          '<select class="f-select" id="cancel-reason-sel" style="margin:0"><option value="">— Select reason —</option><option value="Personal emergency">Personal emergency</option><option value="Feeling better">Feeling better</option><option value="Transport issue">Cannot travel</option><option value="Want to reschedule">Want to reschedule</option><option value="other">Other</option></select>' +
          '<input class="f-input" id="cancel-reason-other" placeholder="Specify..." style="margin-top:8px;display:none">' +
        '</div>' +
        '<div class="alert-box alert-warn" style="margin-bottom:12px"><i class="ti ti-alert-triangle"></i>This cannot be undone.</div>' +
        '<div id="cancel-alert" class="alert hidden" style="margin-bottom:10px"></div>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn" style="background:var(--red);border-color:var(--red);color:#fff" id="cancel-submit-btn" onclick="_submitCancelAppt()"><i class="ti ti-x"></i>Yes, cancel</button>' +
          '<button class="btn" onclick="document.getElementById(\'cancel-modal\').style.display=\'none\'">Keep appointment</button>' +
        '</div>' +
      '</div>' +
    '</div>';
};

var _rsApptId = null, _cancelApptId = null;
/* ── Direct check-in from appointments list (telemedicine only) ── */
window._ciDirectCheckin = async function(apptId) {
  var btn = event && event.target && event.target.closest('button');
  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner" style="width:12px;height:12px"></div>'; }
  try {
    var p   = await _getMyPatientRecord();
    var u   = API.getStoredUser();
    var fid = (u&&(u.facilityId||u.facility)) || (p&&p.primaryFacility&&p.primaryFacility._id);
    if (!p || !fid) { UI.showToast('Could not find patient or facility record','err'); if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-video"></i>Check in';} return; }

    /* ── Fetch appointment and validate ── */
    var apptRes = await API._fetchDirect('/appointments/'+apptId, {method:'GET'});
    var appt    = apptRes && apptRes.data;
    if (!appt) { UI.showToast('Appointment not found','err'); if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-video"></i>Check in';} return; }

    /* ── TASK 4: Telemedicine-only enforcement ── */
    var vt = (appt.visitType||'').toLowerCase();
    if (vt !== 'telemedicine') {
      UI.showToast('Self check-in is only available for Telemedicine appointments. Please visit reception.','err');
      if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-login"></i>Check in'; }
      return;
    }

    /* ── Validate appointment is TODAY ── */
    var apptDate = new Date(appt.scheduledAt);
    var today    = new Date();
    var isToday  = apptDate.getFullYear() === today.getFullYear() &&
                   apptDate.getMonth()    === today.getMonth()    &&
                   apptDate.getDate()     === today.getDate();
    if (!isToday) {
      var dateStr = apptDate.toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
      UI.showToast('Check-in is only available on the day of your appointment (' + dateStr + ')','err');
      if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-video"></i>Check in'; }
      return;
    }

    var res = await API._fetchDirect('/queue2/prebooked-checkin',{method:'POST',body:JSON.stringify({patientId:p._id,facilityId:fid,appointmentId:apptId,visitType:'telemedicine'})});
    if (res.doctorLate) UI.showToast('Note: Doctor running ~'+res.minutesLate+' min late','warn');
    if (res.data && res.data.token) await _ciSendTokenNotification(res.data);
    UI.showToast('✅ Checked in! Your queue token is '+(res.data&&res.data.token||''),'ok');
    /* ── TASK 5: Route to Doctor's Telemedicine Queue ── */
    var tokenData = res.data || {};
    var teleReq = {
      id:          'TELE-'+p._id+'-'+(tokenData.token||Date.now()),
      patientId:   p._id,
      patientName: ((p.firstName||'')+' '+(p.lastName||'')).trim(),
      age:         p.age || p.dateOfBirth || '',
      sex:         p.gender || p.sex || '',
      complaint:   'Telemedicine Consultation',
      priority:    'Normal',
      requestedBy: 'Patient (self check-in)',
      requestedAt: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),
      notes:       'Patient self-checked in via telemedicine portal. Token: '+(tokenData.token||''),
      seen:        false,
      autoAccept:  true,
      department:  'Telemedicine',
      isTelemed:   true,
      appointmentId: apptId,
      visitType:   'telemedicine',
      token:       tokenData.token || '',
    };
    if (typeof window._doctorAddTeleRequest === 'function') { window._doctorAddTeleRequest(teleReq); }
    if (_patTeleCh) { try { _patTeleCh.postMessage({ type: 'DOCTOR_PT', doc: teleReq }); } catch(_) {} }
    try {
      var stored = JSON.parse(localStorage.getItem('_NIHMS_DOCTOR_QUEUE') || '[]');
      if (!stored.find(function(r){ return r.id === teleReq.id; })) { stored.push(teleReq); localStorage.setItem('_NIHMS_DOCTOR_QUEUE', JSON.stringify(stored)); }
    } catch(_) {}
    /* ── Open video session for patient immediately after check-in ── */
    _pJoinTeleRoom(apptId);
    Router.setPage('checkin');
  } catch(e) {
    UI.showToast(e.message||'Check-in failed','err');
    if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-video"></i>Check in'; }
  }
};

/* ══════════════════════════════════════════════════════════════════
   PATIENT TELEMEDICINE — join a video session via JitsiMeetExternalAPI
   (replaces iframe approach that blocks WebRTC)
══════════════════════════════════════════════════════════════════ */

/* Load Jitsi External API script once, resolve when ready */
function _pLoadJitsiScript(){
  return new Promise(function(resolve, reject){
    if(window.JitsiMeetExternalAPI){ resolve(); return; }
    var s = document.createElement('script');
    s.src = 'https://meet.jit.si/external_api.js';
    s.onload  = resolve;
    s.onerror = function(){ reject(new Error('Could not load Jitsi video library')); };
    document.head.appendChild(s);
  });
}

/* Join a telemedicine room as patient — called after check-in */
window._pJoinTeleRoom = async function(appointmentId){
  try {
    /* Fetch join data from backend (same endpoint as doctor) */
    var res  = await API._fetchDirect('/appointments/'+appointmentId+'/join', { method:'GET' });
    var data = res && res.data;
    if(!data) throw new Error('Could not get session details.');
    _pOpenTeleRoom(data);
  } catch(err){
    UI.showToast(err.message||'Could not join video session','err');
  }
};

function _pOpenTeleRoom(session){
  /* Remove any existing overlay */
  var old = document.getElementById('pat-tele-overlay');
  if(old) old.remove();

  var when  = session.scheduledAt ? new Date(session.scheduledAt) : null;
  var docName = session.doctor
    ? ('Dr '+((session.doctor.firstName||'')+' '+(session.doctor.lastName||'')).trim()).trim()
    : 'Your Doctor';

  /* Derive roomName */
  var roomName = session.roomName ||
    (session.roomUrl ? session.roomUrl.replace(/^https?:\/\/meet\.jit\.si\//, '').split('?')[0] : null) ||
    ('nihms-'+session.appointmentId);

  /* Get patient display name */
  var u = API.getStoredUser ? API.getStoredUser() : {};
  var patName = ((u.firstName||'')+' '+(u.lastName||'')).trim() || (u.name||'Patient');

  /* Build overlay */
  var ov = document.createElement('div');
  ov.id = 'pat-tele-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:#111;z-index:9999;display:flex;flex-direction:column';
  ov.innerHTML =
    '<style>'+
      '@keyframes patLive{0%,100%{opacity:1}50%{opacity:.4}}'+
      '#pat-jitsi-wrap{flex:1;min-height:0;width:100%;position:relative}'+
      '#pat-jitsi-wrap iframe{width:100%!important;height:100%!important;border:none}'+
      '#pat-notify-bar{position:absolute;top:12px;left:50%;transform:translateX(-50%);'+
        'background:#1D9E75;color:#fff;font-size:12px;font-weight:600;padding:6px 16px;'+
        'border-radius:20px;z-index:10;opacity:0;transition:opacity .4s;pointer-events:none}'+
    '</style>'+
    /* Header bar */
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#1a1a1a;flex-shrink:0;gap:12px;flex-wrap:wrap">'+
      '<div style="display:flex;align-items:center;gap:12px">'+
        '<div style="font-size:16px;font-weight:800;color:#fff;letter-spacing:-.3px">NI<span style="color:#1D9E75">HMS</span></div>'+
        '<div style="width:8px;height:8px;border-radius:50%;background:#1D9E75;animation:patLive 2s infinite"></div>'+
        '<span style="color:#aaa;font-size:13px">Video session with <strong style="color:#fff">'+docName+'</strong></span>'+
      '</div>'+
      '<div style="display:flex;align-items:center;gap:10px">'+
        (when?'<span style="color:#888;font-size:11px">🕐 '+when.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'</span>':'')+
        '<button onclick="_pEndTeleRoom()" style="padding:8px 16px;border-radius:8px;border:none;background:#dc2626;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px">'+
          '📵 Leave session'+
        '</button>'+
      '</div>'+
    '</div>'+
    /* Info strip */
    '<div style="display:flex;align-items:center;gap:12px;padding:8px 16px;background:#141414;flex-shrink:0;border-bottom:1px solid #333">'+
      '<span style="font-size:11px;color:#888">Doctor:</span>'+
      '<span style="font-size:13px;font-weight:600;color:#fff">'+docName+'</span>'+
      '<span style="font-size:11px;color:#888;margin-left:auto">Video powered by Jitsi Meet · NIHMS does not record this session by default</span>'+
    '</div>'+
    /* Jitsi mount point */
    '<div id="pat-jitsi-wrap" style="position:relative">'+
      '<div id="pat-notify-bar"></div>'+
      '<div id="pat-loading" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;gap:12px">'+
        '<div style="width:20px;height:20px;border:3px solid #1D9E75;border-top-color:transparent;border-radius:50%;animation:patLive .8s linear infinite"></div>'+
        'Connecting to your consultation…'+
      '</div>'+
    '</div>';

  document.body.appendChild(ov);

  function _patNotify(msg, color){
    var bar = document.getElementById('pat-notify-bar');
    if(!bar) return;
    bar.textContent = msg;
    bar.style.background = color || '#1D9E75';
    bar.style.opacity = '1';
    setTimeout(function(){ bar.style.opacity='0'; }, 3500);
  }

  _pLoadJitsiScript().then(function(){
    var wrap    = document.getElementById('pat-jitsi-wrap');
    var loading = document.getElementById('pat-loading');
    if(!wrap) return;

    if(window._patJitsiAPI){
      try { window._patJitsiAPI.dispose(); } catch(_){}
      window._patJitsiAPI = null;
    }

    window._patJitsiAPI = new JitsiMeetExternalAPI('meet.jit.si', {
      roomName:  roomName,
      parentNode: wrap,
      width:     '100%',
      height:    '100%',
      userInfo:  { displayName: patName },
      configOverwrite: {
        startWithAudioMuted:  false,
        startWithVideoMuted:  false,
        disableDeepLinking:   true,
        prejoinPageEnabled:   false,
        enableWelcomePage:    false,
        disableInviteFunctions: true,
        toolbarButtons: [
          'microphone','camera','closedcaptions','desktop',
          'fullscreen','fodeviceselection','hangup',
          'chat','raisehand','videoquality','tileview'
        ]
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK:    false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        TOOLBAR_ALWAYS_VISIBLE:  true
      }
    });

    window._patJitsiAPI.addEventListener('videoConferenceJoined', function(){
      if(loading) loading.style.display='none';
      _patNotify('✅ You are now connected to your consultation');
    });

    window._patJitsiAPI.addEventListener('participantJoined', function(e){
      _patNotify('👨‍⚕️ '+(e.displayName||'Doctor')+' has joined');
    });

    window._patJitsiAPI.addEventListener('participantLeft', function(e){
      _patNotify('👋 '+(e.displayName||'Doctor')+' has left the session', '#f59e0b');
    });

    window._patJitsiAPI.addEventListener('videoConferenceLeft', function(){
      _pEndTeleRoom();
    });
    window._patJitsiAPI.addEventListener('readyToClose', function(){
      _pEndTeleRoom();
    });

  }).catch(function(err){
    var wrap = document.getElementById('pat-jitsi-wrap');
    if(wrap) wrap.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#f87171;font-size:14px;flex-direction:column;gap:12px">'+
        '<div>⚠️ '+err.message+'</div>'+
        '<button onclick="_pJoinTeleRoom(\''+session.appointmentId+'\')" style="padding:8px 20px;border-radius:8px;border:none;background:#1D9E75;color:#fff;font-size:13px;cursor:pointer">Retry</button>'+
      '</div>';
  });
}

window._pEndTeleRoom = function(){
  if(window._patJitsiAPI){
    try { window._patJitsiAPI.executeCommand('hangup'); } catch(_){}
    setTimeout(function(){
      try { window._patJitsiAPI.dispose(); } catch(_){}
      window._patJitsiAPI = null;
    }, 800);
  }
  var ov = document.getElementById('pat-tele-overlay');
  if(ov) ov.remove();
  UI.showToast('You have left the consultation','ok');
};

/* ══════════════════════════════════════════════════════════════════ */

var _rsVisitType = 'consultation';
var _RSCAL = { year: new Date().getFullYear(), month: new Date().getMonth(), selected: null };
window._showReschedule = function(id, currentType, currentDt) {
  _rsApptId = id;
  _rsVisitType = currentType || 'consultation';
  _RSCAL.selected = null;
  // Move to body to escape overflow:hidden
  var modal = document.getElementById('reschedule-modal');
  if (modal && modal.parentNode !== document.body) document.body.appendChild(modal);
  if (modal) modal.style.display = 'flex';
  // Reset fields
  var al = document.getElementById('rs-alert'); if(al) al.style.display='none';
  var lbl = document.getElementById('rs-date-lbl'); if(lbl){lbl.textContent='Click to select new date & time';lbl.style.color='';}
  var inp = document.getElementById('rs-datetime'); if(inp) inp.value='';
  var disp = document.getElementById('rs-date-display'); if(disp) disp.style.borderColor='var(--border)';
  var wrap = document.getElementById('rs-cal-wrap'); if(wrap) wrap.style.display='none';
};
window._submitReschedule = async function() {
  var dt = (document.getElementById('rs-datetime')||{}).value;
  var rSel = (document.getElementById('rs-reason-sel')||{}).value;
  var rOth = ((document.getElementById('rs-reason-other')||{}).value||'').trim();
  var reason = rSel==='other' ? rOth : rSel;
  var al = document.getElementById('rs-alert'), btn = document.getElementById('rs-submit-btn');
  function showAl(msg){ if(!al)return; al.innerHTML='<i class="ti ti-alert-circle"></i> '+msg; al.style.display='block'; }
  if (!dt) { showAl('Please select a new date from the calendar.'); return; }
  if (new Date(dt) <= new Date()) { showAl('Please select a future date and time.'); return; }
  if (!reason) { showAl('Please select a reason.'); return; }
  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div>'; }
  try {
    // Try PATCH /reschedule first, fall back to PUT /appointments/:id
    try {
      await API._fetchDirect('/appointments/'+_rsApptId+'/reschedule',{method:'PATCH',body:JSON.stringify({scheduledAt:new Date(dt).toISOString(),rescheduleReason:reason,visitType:_rsVisitType})});
    } catch(routeErr) {
      if (routeErr.message && routeErr.message.includes('Route not found')) {
        await API._fetchDirect('/appointments/'+_rsApptId,{method:'PUT',body:JSON.stringify({scheduledAt:new Date(dt).toISOString(),rescheduleReason:reason,status:'confirmed'})});
      } else { throw routeErr; }
    }
    /* Show success in alert box, then close and navigate */
    var alEl = document.getElementById('rs-alert');
    if (alEl) {
      alEl.innerHTML = '<i class="ti ti-circle-check"></i> Appointment rescheduled successfully!';
      alEl.style.cssText = 'display:block;padding:10px 14px;background:#EDFBF3;border-left:4px solid var(--green);border-radius:8px;font-size:13px;color:var(--green-dark);margin-bottom:10px';
    }
    UI.showToast('Appointment rescheduled successfully','ok');
    setTimeout(function() { window._rsClose(); Router.setPage('appointments'); }, 1500);
  } catch(e){ showAl(e.message||'Failed to reschedule.'); }
  finally { if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-calendar-check"></i>Confirm reschedule';} }
};
window._showCancelAppt = function(id) {
  _cancelApptId = id;
  var al = document.getElementById('cancel-alert'); if(al) al.classList.add('hidden');
  document.getElementById('cancel-modal').style.display = 'flex';
};
window._submitCancelAppt = async function() {
  var rSel = (document.getElementById('cancel-reason-sel')||{}).value;
  var rOth = ((document.getElementById('cancel-reason-other')||{}).value||'').trim();
  var reason = rSel==='other' ? rOth : rSel;
  var al = document.getElementById('cancel-alert'), btn = document.getElementById('cancel-submit-btn');
  if (!reason) { if(al){al.className='alert alert-error';al.innerHTML='Please select a reason.';al.classList.remove('hidden');} return; }
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div>';}
  try {
    await API.appointments.cancel(_cancelApptId, reason);
    document.getElementById('cancel-modal').style.display='none';
    /* Bust cached booked-slots so the freed slot shows as available immediately */
    if (window._BKC && window._BKC.bookedSlots) {
      /* Find the cancelled appointment's date and remove it from the cache */
      try {
        var _cRes = await API._fetchDirect('/appointments/'+_cancelApptId,{method:'GET'}).catch(function(){return null;});
        var _cApt = _cRes && (_cRes.data || _cRes);
        var _cRaw = _cApt && (_cApt.scheduledAt || _cApt.appointmentDate || _cApt.date || '');
        if (_cRaw) {
          var _cDate = _cRaw.slice(0,10);
          delete window._BKC.bookedSlots[_cDate];
        }
      } catch(_) {
        /* Fallback: clear entire cache so all dates re-fetch */
        window._BKC.bookedSlots = {};
      }
    }
    UI.showToast('Appointment cancelled','ok'); Router.setPage('appointments');
  } catch(e){ if(al){al.className='alert alert-error';al.innerHTML=e.message;al.classList.remove('hidden');} }
  finally { if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-x"></i>Yes, cancel';} }
};

/* ══════════════════════════════════════════════════
   QUEUE CHECK-IN
══════════════════════════════════════════════════ */
Pages['checkin'] = () => {
  if (window._ciPollInt) clearInterval(window._ciPollInt);
  setTimeout(_ciLoad, 0);
  return '<div class="page-title">Queue check-in</div><div id="ci-body" style="max-width:540px;margin:0 auto;color:var(--text-muted)">Loading...</div>';
};

async function _ciLoad() {
  var wrap = document.getElementById('ci-body'); if (!wrap) return;
  try {
    var p = await _getMyPatientRecord();
    if (!p) { wrap.innerHTML='<div class="alert-box alert-warn">Please complete your profile first.</div>'; return; }
    var u   = API.getStoredUser();
    var fid = (u&&(u.facilityId||u.facility)) || (p.primaryFacility&&p.primaryFacility._id);
    var qr  = await API._fetchDirect('/queue2/my-token?patientId='+p._id+'&facilityId='+fid, {method:'GET'});
    var tok = qr && qr.data;
    if (tok && !['completed','cancelled','skipped'].includes(tok.status)) {
      wrap.innerHTML = _ciRenderToken(tok);
      if (window._ciPollInt) clearInterval(window._ciPollInt);
      window._ciPollInt = setInterval(async function() {
        if (!document.getElementById('ci-body')) { clearInterval(window._ciPollInt); return; }
        try {
          var r2 = await API._fetchDirect('/queue2/my-token?patientId='+p._id+'&facilityId='+fid, {method:'GET'});
          if (r2&&r2.data&&document.getElementById('ci-body')) document.getElementById('ci-body').innerHTML = _ciRenderToken(r2.data);
        } catch(_) {}
      }, 20000);
      return;
    }
    var apptRes  = await API.appointments.list({ patient: p._id, limit: 20 });
    var todayStr = new Date().toDateString();
    var todayA   = (apptRes.data||[]).filter(function(a){ return new Date(a.scheduledAt).toDateString()===todayStr && ['confirmed','pending'].includes(a.status); });
    wrap.innerHTML =
      (todayA.length ?
        '<div class="card" style="margin-bottom:14px;border:1.5px solid var(--green)">' +
          '<div class="card-title" style="color:var(--green-dark)"><i class="ti ti-calendar-check"></i>Your appointment today — Priority check-in</div>' +
          '<div class="alert-box alert-ok" style="margin-bottom:12px"><i class="ti ti-info-circle"></i>Pre-booked patients receive priority placement.</div>' +
          todayA.map(function(a){
            var isTele = (a.visitType||'').toLowerCase() === 'telemedicine';
            return '<div style="padding:12px;background:var(--green-light);border-radius:var(--radius);margin-bottom:8px">' +
              '<div style="font-weight:600;text-transform:capitalize">'+(a.visitType||'').replace(/_/g,' ')+'</div>' +
              '<div style="font-size:12px;color:var(--text-muted);margin:4px 0">'+new Date(a.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+(a.facility?' · '+(a.facility.name||a.facility):'')+'</div>' +
              (isTele
                ? '<button class="btn btn-sm btn-green" style="margin-top:10px;width:100%" onclick="_ciPrebookedCI(\''+p._id+'\',\''+fid+'\',\''+a._id+'\')"><i class="ti ti-video"></i>Check in — Telemedicine</button>'
                : '<div style="margin-top:10px;padding:9px 12px;background:#FFF9E6;border-left:3px solid #F0A500;border-radius:8px;font-size:12px;color:#7A5C10"><i class="ti ti-building-hospital"></i> Please <strong>visit reception</strong> to check in for this appointment. The receptionist will issue your queue token.</div>'
              ) +
            '</div>';
          }).join('') +
        '</div>' : '') +
      '<div class="card">' +
        '<div class="card-title"><i class="ti ti-walk"></i>'+(todayA.length?'Walk-in check-in':'Check in to queue')+'</div>' +
        (!todayA.length?'<div class="alert-box alert-info" style="margin-bottom:12px"><i class="ti ti-info-circle"></i>No appointments today — you can walk in below.</div>':'') +
        '<div class="f-group"><label class="f-label">Visit type</label>' +
          '<select class="f-select" id="ci-type" style="margin:0" onchange="_ciTypeChange(this.value)">' +
            '<option value="walkin">General walk-in</option><option value="priority">Priority — I need assistance</option>' +
          '</select>' +
        '</div>' +
        '<div id="ci-pri-row" style="display:none;margin-top:8px">' +
          '<div class="f-group"><label class="f-label">Priority reason</label>' +
            '<select class="f-select" id="ci-reason" style="margin:0">' +
              '<option value="elderly">I am elderly (65+)</option><option value="pregnant">I am pregnant</option>' +
              '<option value="disabled">I have a disability</option><option value="child_under_5">Child under 5</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div class="f-group" style="margin-top:8px"><label class="f-label">Language</label>' +
          '<select class="f-select" id="ci-lang" style="margin:0">' +
            '<option value="en">English</option><option value="zu">isiZulu</option>' +
            '<option value="af">Afrikaans</option><option value="st">Sesotho</option>' +
            '<option value="xh">isiXhosa</option>' +
          '</select>' +
        '</div>' +
        '<div id="ci-alert" class="alert hidden" style="margin-top:8px"></div>' +
        '<button class="btn btn-green" id="ci-btn" style="width:100%;margin-top:12px" onclick="_ciWalkIn(\''+p._id+'\',\''+fid+'\')">' +
          '<i class="ti ti-login"></i>Check in now' +
        '</button>' +
      '</div>';
  } catch(e) { if(wrap) wrap.innerHTML='<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>'+e.message+'</div>'; }
}

window._ciTypeChange = function(v) { var el=document.getElementById('ci-pri-row'); if(el) el.style.display=v==='priority'?'block':'none'; };

/* BroadcastChannel to send telemedicine patients to doctor.js queue */
var _patTeleCh = null;
try { _patTeleCh = new BroadcastChannel('nihms_doctor_queue'); } catch(_) {}

window._ciPrebookedCI = async function(pid, fid, apptId) {
  var btn = event&&event.target&&event.target.closest('button');
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div> Checking in...';}
  try {
    /* ── TASK 4: Front-end enforcement — verify telemedicine before calling API ── */
    var apptCheck = await API._fetchDirect('/appointments/'+apptId, {method:'GET'});
    var apptData  = apptCheck && apptCheck.data;
    if (!apptData) { UI.showToast('Appointment not found.','err'); if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-video"></i>Check in — Telemedicine';} return; }
    var vt = (apptData.visitType||'').toLowerCase();
    if (vt !== 'telemedicine') {
      UI.showToast('Self check-in is only available for Telemedicine appointments. Please visit reception.','err');
      if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-login"></i>Check in';} return;
    }
    /* ── Duplicate check-in guard ── */
    try {
      var existingTok = await API._fetchDirect('/queue2/my-token?patientId='+pid+'&facilityId='+fid, {method:'GET'});
      var et = existingTok && existingTok.data;
      if (et && et.appointmentId === apptId && !['completed','cancelled','skipped'].includes(et.status)) {
        UI.showToast('You are already checked in. Your token is '+et.token,'warn');
        Router.setPage('checkin'); return;
      }
    } catch(_) {}
    /* ── Call prebooked check-in endpoint ── */
    var res = await API._fetchDirect('/queue2/prebooked-checkin',{method:'POST',body:JSON.stringify({patientId:pid,facilityId:fid,appointmentId:apptId,visitType:'telemedicine'})});
    if(res.doctorLate) UI.showToast('Note: Doctor running ~'+res.minutesLate+' min late','warn');
    if(res.data&&res.data.token) await _ciSendTokenNotification(res.data);
    /* ── TASK 5: Route to Doctor's Telemedicine Queue ── */
    var tokenData = res.data || {};
    var p = null;
    try { p = await _getMyPatientRecord(); } catch(_) {}
    var teleReq = {
      id:          'TELE-'+pid+'-'+(tokenData.token||Date.now()),
      patientId:   pid,
      patientName: p ? ((p.firstName||'')+' '+(p.lastName||'')).trim() : pid,
      age:         p ? (p.age || p.dateOfBirth || '') : '',
      sex:         p ? (p.gender || p.sex || '') : '',
      complaint:   'Telemedicine Consultation',
      priority:    'Normal',
      requestedBy: 'Patient (self check-in)',
      requestedAt: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),
      notes:       'Patient self-checked in via telemedicine portal. Token: '+(tokenData.token||''),
      seen:        false,
      autoAccept:  true,
      department:  'Telemedicine',
      isTelemed:   true,
      appointmentId: apptId,
      visitType:   'telemedicine',
      token:       tokenData.token || '',
    };
    /* Direct call if doctor.js is in same tab */
    if (typeof window._doctorAddTeleRequest === 'function') { window._doctorAddTeleRequest(teleReq); }
    /* Cross-tab broadcast */
    if (_patTeleCh) { try { _patTeleCh.postMessage({ type: 'DOCTOR_PT', doc: teleReq }); } catch(_) {} }
    /* localStorage relay for doctor tab polling */
    try {
      var stored = JSON.parse(localStorage.getItem('_NIHMS_DOCTOR_QUEUE') || '[]');
      if (!stored.find(function(r){ return r.id === teleReq.id; })) { stored.push(teleReq); localStorage.setItem('_NIHMS_DOCTOR_QUEUE', JSON.stringify(stored)); }
    } catch(_) {}
    Router.setPage('checkin');
  } catch(e){ UI.showToast(e.message||'Check-in failed','err'); if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-video"></i>Check in — Telemedicine';} }
};

window._ciWalkIn = async function(pid, fid) {
  var btn = document.getElementById('ci-btn');
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div> Checking in...';}
  try {
    var res = await API._fetchDirect('/queue2/checkin',{method:'POST',body:JSON.stringify({
      patientId:pid, facilityId:fid,
      tokenType:(document.getElementById('ci-type')||{value:'walkin'}).value==='priority'?'priority':'walkin',
      priorityReason:(document.getElementById('ci-reason')||{value:''}).value||'',
      language:(document.getElementById('ci-lang')||{value:'en'}).value||'en'
    })});
    if(res&&res.data&&res.data.token) await _ciSendTokenNotification(res.data);
    Router.setPage('checkin');
  } catch(e) {
    var al=document.getElementById('ci-alert'); if(al){al.className='alert alert-error';al.innerHTML='<i class="ti ti-alert-circle"></i> '+e.message;al.classList.remove('hidden');}
    if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-login"></i>Check in now';}
  }
};

async function _ciSendTokenNotification(tok) {
  try {
    var p = await _getMyPatientRecord(); if(!p) return;
    var msg = 'NIHMS Queue: Your token is '+tok.token+'. Position: '+(tok.position||'—')+'. Est. wait: '+(tok.estimatedWait||0)+' min. Please remain in the waiting area.';
    if(p.phone) await API._fetchDirect('/notifications/sms',{method:'POST',body:JSON.stringify({to:p.phone,message:msg})}).catch(function(){});
    if(p.email) await API._fetchDirect('/notifications/email',{method:'POST',body:JSON.stringify({
      to:p.email, subject:'NIHMS Queue Token: '+tok.token,
      html:'<div style="font-family:Arial;max-width:480px;margin:0 auto;text-align:center;padding:24px"><h2 style="color:#0F6E56">Your Queue Token</h2><div style="font-size:72px;font-weight:900;color:#0F6E56;font-family:monospace;margin:16px 0">'+tok.token+'</div><p>Position: <strong>'+(tok.position||'—')+'</strong> &middot; Est. wait: <strong>'+(tok.estimatedWait||0)+' min</strong></p><p style="color:#888;font-size:13px">Please remain in the waiting area.</p></div>'
    })}).catch(function(){});
  } catch(_) {}
}

function _ciRenderToken(tok) {
  var tokenBg = '#0F6E56'; /* NIHMS teal */
  var statusInfo = {
    waiting:          {bg:'var(--bg-surface)',c:'var(--amber)',ic:'ti-clock',msg:'Please wait — you will be called shortly'},
    called:           {bg:'var(--green-light)',c:'var(--green-dark)',ic:'ti-bell-ringing',msg:'Please proceed to the consultation room NOW'},
    in_consultation:  {bg:'var(--green-light)',c:'var(--green-dark)',ic:'ti-stethoscope',msg:'You are in consultation'},
    post_consultation:{bg:'#f0fdfa',c:'#0F6E56',ic:'ti-checks',msg:'Consultation complete'},
    lab:              {bg:'#f0fdfa',c:'#0F6E56',ic:'ti-flask',msg:'Please go to the Laboratory'},
    pharmacy:         {bg:'var(--green-light)',c:'var(--green-dark)',ic:'ti-pill',msg:'Please go to the Pharmacy'},
    completed:        {bg:'var(--green-light)',c:'var(--green-dark)',ic:'ti-circle-check',msg:'Your visit is complete. Thank you!'},
  }[tok.status]||{bg:'var(--bg-surface)',c:'var(--amber)',ic:'ti-clock',msg:'Please wait'};
  return '<div class="card"'+(tok.status==='called'?' style="border:2px solid #0F6E56;box-shadow:0 0 0 4px rgba(15,110,86,.12)"':'')+' style="margin-bottom:14px;text-align:center">' +
    (tok.status==='called'?'<div style="background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;padding:12px;margin:-1px -1px 16px;border-radius:var(--radius-xl) var(--radius-xl) 0 0;font-weight:700;font-size:15px">🔔 IT\'S YOUR TURN</div>':'') +
    '<div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-hint);margin-bottom:4px">Your queue token</div>' +
    '<div style="font-size:76px;font-weight:900;color:'+tokenBg+';font-family:var(--mono);line-height:1;margin:4px 0">'+tok.token+'</div>' +
    '<div style="display:flex;justify-content:center;gap:32px;margin:14px 0">' +
      '<div><div style="font-size:28px;font-weight:800">'+(tok.aheadCount!=null?tok.aheadCount:'—')+'</div><div style="font-size:12px;color:var(--text-muted)">Ahead of you</div></div>' +
      '<div style="width:1px;background:var(--border)"></div>' +
      '<div><div style="font-size:28px;font-weight:800">'+(tok.estimatedWait!=null?tok.estimatedWait:'—')+'</div><div style="font-size:12px;color:var(--text-muted)">Est. wait (min)</div></div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:var(--radius);background:'+statusInfo.bg+';color:'+statusInfo.c+';font-weight:500;font-size:13px"><i class="ti '+statusInfo.ic+'"></i>'+statusInfo.msg+'</div>' +
    (tok.status==='completed'?
      '<div style="text-align:center;margin-top:12px">' +
      '<div style="font-size:14px;font-weight:600;color:var(--green-dark);margin-bottom:4px">Your visit is complete!</div>' +
      '<div style="font-size:13px;color:var(--text-muted);margin-bottom:14px">Help us improve by completing a short survey about your experience today.</div>' +
      '<button style="width:100%;padding:12px;border:none;border-radius:50px;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit" onclick="_launchSurvey(\''+tok._id+'\',null)"><i class="ti ti-star"></i>Complete Patient Experience Survey</button>' +
      '<div style="font-size:11px;color:var(--text-hint);margin-top:8px">Takes about 2–3 minutes</div>' +
      '</div>' : '') +
    '</div>' +
    '<div style="text-align:center"><button class="btn btn-xs" onclick="_ciLoad()"><i class="ti ti-refresh"></i>Refresh</button></div>';
}

window._ciRate = async function(id, rating) {
  try {
    await API._fetchDirect('/queue2/'+id+'/feedback',{method:'POST',body:JSON.stringify({satisfaction:rating})});
    var sr=document.getElementById('ci-star-row'); if(sr) sr.style.display='none';
    var rt=document.getElementById('ci-rate-thanks'); if(rt) rt.style.display='block';
  } catch(_) { UI.showToast('Feedback failed','err'); }
};

/* ══════════════════════════════════════════════════
   BILLING
══════════════════════════════════════════════════ */
Pages['billing'] = () => {
  setTimeout(async function() {
    var wrap = document.getElementById('billing-body'); if (!wrap) return;
    try {
      var p = await _getMyPatientRecord(); if (!p) { wrap.innerHTML='<div class="alert-box alert-warn">Please complete your profile first.</div>'; return; }
      var aid = p.medicalAid || {};
      wrap.innerHTML =
        '<div class="card" style="max-width:600px">' +
          '<div class="card-title"><i class="ti ti-credit-card"></i>Medical aid / billing information</div>' +
          '<div class="f-group"><label class="f-label">Medical aid provider</label>' +
            '<select class="f-select" id="b-provider" style="margin:0">' +
              '<option value="">— No medical aid (self-pay) —</option>' +
              ['Discovery Health','Momentum Health','Bonitas','Medshield','Fedhealth','Bestmed','Gems (Government)','Hosmed','Other'].map(function(pr){ return '<option value="'+pr+'"'+(aid.schemeName===pr?' selected':'')+'>'+pr+'</option>'; }).join('') +
            '</select>' +
          '</div>' +
          '<div class="two-col">' +
            '<div class="f-group"><label class="f-label">Member number</label><input class="f-input" id="b-memnum" value="'+(aid.memberNumber||'')+'" placeholder="12345678"></div>' +
            '<div class="f-group"><label class="f-label">Plan / option</label><input class="f-input" id="b-plan" value="'+(aid.planName||'')+'" placeholder="e.g. Coastal Core"></div>' +
          '</div>' +
          '<div class="two-col">' +
            '<div class="f-group"><label class="f-label">Dependant code</label><input class="f-input" id="b-dep" value="'+(aid.dependantCode||'')+'" placeholder="00"></div>' +
            '<div class="f-group"><label class="f-label">Main member name</label><input class="f-input" id="b-main" value="'+(aid.mainMemberName||'')+'" placeholder="If different from you"></div>' +
          '</div>' +
          '<div id="b-alert" class="alert hidden" style="margin-bottom:8px"></div>' +
          '<button class="btn btn-green" onclick="_saveBilling()"><i class="ti ti-device-floppy"></i>Save billing info</button>' +
        '</div>';
    } catch(e) { if(wrap) wrap.innerHTML='<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>'+e.message+'</div>'; }
  }, 0);
  return '<div class="page-title">Billing &amp; medical aid</div><div id="billing-body" style="color:var(--text-muted)">Loading...</div>';
};

window._saveBilling = async function() {
  try {
    await API._fetchDirect('/patients/me/profile',{method:'PATCH',body:JSON.stringify({medicalAid:{
      schemeName:(document.getElementById('b-provider')||{value:''}).value||'',
      memberNumber:((document.getElementById('b-memnum')||{value:''}).value||'').trim(),
      planName:((document.getElementById('b-plan')||{value:''}).value||'').trim(),
      dependantCode:((document.getElementById('b-dep')||{value:''}).value||'').trim(),
      mainMemberName:((document.getElementById('b-main')||{value:''}).value||'').trim(),
    }})});
    UI.showToast('Billing information saved','ok');
  } catch(e){ UI.showToast(e.message,'err'); }
};

/* ══════════════════════════════════════════════════
   MY PROFILE
══════════════════════════════════════════════════ */
Pages['myprofile'] = () => {
  setTimeout(async function() {
    var wrap = document.getElementById('profile-body'); if (!wrap) return;
    try { var p = await _getMyPatientRecord(); wrap.innerHTML = _buildProfileForm(p); }
    catch(e) { if(wrap) wrap.innerHTML='<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>'+e.message+'</div>'; }
  }, 0);
  return '<div class="page-title">My profile</div><div id="profile-body" style="color:var(--text-muted)">Loading...</div>';
};

function _buildProfileForm(p) {
  function v(path, fb) {
    if (fb === undefined) fb = '';
    if (!p) return fb;
    return path.split('.').reduce(function(o,k){ return o&&o[k]!=null?o[k]:null; }, p) != null
      ? path.split('.').reduce(function(o,k){ return o&&o[k]!=null?o[k]:null; }, p)
      : fb;
  }
  var profUrl  = p&&p.profilePicture&&p.profilePicture.url ? 'https://nihms-backend.onrender.com'+p.profilePicture.url : null;
  var initials = p ? ((p.firstName||'U')[0]+(p.lastName||'S')[0]).toUpperCase() : '??';
  return '<div class="reg-tabs" style="max-width:620px;margin-bottom:0">' +
    ['Info','Contact','Address','Next of kin','Password','Documents'].map(function(t,i) {
      return '<button class="reg-tab-btn'+(i===0?' active':'')+'" id="ep-tab-btn-'+(i+1)+'" onclick="_showEpTab('+(i+1)+')"><span>'+t+'</span></button>';
    }).join('') +
  '</div>' +
  /* TAB 1: Personal info */
  '<div id="ep-tab-1" class="card" style="max-width:620px">' +
    '<div class="card-title"><i class="ti ti-user"></i>Personal information</div>' +
    '<div class="alert-box alert-info" style="margin-bottom:14px"><i class="ti ti-lock"></i>Name, ID, DOB and gender are locked — contact reception to update.</div>' +
    '<div class="two-col">' +
      '<div class="f-group"><label class="f-label">First name</label><input class="f-input" value="'+v('firstName')+'" readonly style="background:var(--bg-surface);color:var(--text-muted)"></div>' +
      '<div class="f-group"><label class="f-label">Last name</label><input class="f-input" value="'+v('lastName')+'" readonly style="background:var(--bg-surface);color:var(--text-muted)"></div>' +
    '</div>' +
    '<div class="two-col">' +
      '<div class="f-group"><label class="f-label">Date of birth</label><input class="f-input" value="'+(v('dateOfBirth','')?String(v('dateOfBirth','')).slice(0,10):'')+'" readonly style="background:var(--bg-surface);color:var(--text-muted)"></div>' +
      '<div class="f-group"><label class="f-label">Gender</label><input class="f-input" value="'+v('gender','')+'" readonly style="background:var(--bg-surface);color:var(--text-muted);text-transform:capitalize"></div>' +
    '</div>' +
    '<div class="two-col">' +
      '<div class="f-group"><label class="f-label">National ID / Passport</label><input class="f-input" value="'+v('nationalId','')+'" readonly style="background:var(--bg-surface);color:var(--text-muted);font-family:var(--mono)"></div>' +
      '<div class="f-group"><label class="f-label">Blood type</label>' +
        '<select class="f-select" id="pf-blood" style="margin:0">' +
          ['unknown','A+','A-','B+','B-','AB+','AB-','O+','O-'].map(function(bt){ return '<option value="'+bt+'"'+(v('bloodType')===bt?' selected':'')+'>'+bt+'</option>'; }).join('') +
        '</select>' +
      '</div>' +
    '</div>' +
    '<div class="f-group"><label class="f-label">Known allergies (comma separated)</label>' +
      '<input class="f-input" id="pf-allergies" value="'+((v('allergies',[])||[]).join(', '))+'" placeholder="e.g. Penicillin, Aspirin">' +
    '</div>' +
    '<div id="pf-info-alert" class="alert hidden" style="margin-bottom:6px"></div>' +
    '<button class="btn btn-green" onclick="_saveInfo()"><i class="ti ti-device-floppy"></i>Save</button>' +
  '</div>' +
  /* TAB 2: Contact */
  '<div id="ep-tab-2" class="card" style="display:none;max-width:620px">' +
    '<div class="card-title"><i class="ti ti-phone"></i>Contact information</div>' +
    '<div class="f-group"><label class="f-label">Mobile phone *</label><input class="f-input" type="tel" id="pf-phone" value="'+v('phone')+'" placeholder="0821234567" onblur="_autoFmtPhone(this)"></div>' +
    '<div class="f-group"><label class="f-label">Alternative phone</label><input class="f-input" type="tel" id="pf-phonealt" value="'+v('phoneAlt')+'" placeholder="0821234567" onblur="_autoFmtPhone(this)"></div>' +
    '<div class="f-group"><label class="f-label">Email address</label><input class="f-input" type="email" id="pf-email" value="'+v('email')+'" placeholder="name@example.com"></div>' +
    '<div id="pf-contact-alert" class="alert hidden" style="margin-bottom:6px"></div>' +
    '<button class="btn btn-green" onclick="_saveContact()"><i class="ti ti-device-floppy"></i>Save contact info</button>' +
  '</div>' +
  /* TAB 3: Address */
  '<div id="ep-tab-3" class="card" style="display:none;max-width:620px">' +
    '<div class="card-title"><i class="ti ti-map-pin"></i>Physical address</div>' +
    '<div class="f-group"><label class="f-label">Street address</label><input class="f-input" id="pf-street" value="'+v('address.street')+'" placeholder="123 Main Road"></div>' +
    '<div class="two-col">' +
      '<div class="f-group"><label class="f-label">Suburb</label><input class="f-input" id="pf-suburb" value="'+v('address.suburb')+'" placeholder="Soweto"></div>' +
      '<div class="f-group"><label class="f-label">City</label><input class="f-input" id="pf-city" value="'+v('address.city')+'" placeholder="Johannesburg"></div>' +
    '</div>' +
    '<div class="two-col">' +
      '<div class="f-group"><label class="f-label">Postal code</label><input class="f-input" id="pf-postal" value="'+v('address.postalCode')+'" placeholder="2001"></div>' +
      '<div class="f-group"><label class="f-label">Province</label>' +
        '<select class="f-select" id="pf-province" style="margin:0"><option value="">— Select province —</option>' +
          ['Gauteng','KwaZulu-Natal','Western Cape','Eastern Cape','Limpopo','Mpumalanga','North West','Free State','Northern Cape'].map(function(pr){ return '<option value="'+pr+'"'+(v('address.province')===pr?' selected':'')+'>'+pr+'</option>'; }).join('') +
        '</select>' +
      '</div>' +
    '</div>' +
    '<div id="pf-addr-alert" class="alert hidden" style="margin-bottom:6px"></div>' +
    '<button class="btn btn-green" onclick="_saveAddress()"><i class="ti ti-device-floppy"></i>Save address</button>' +
  '</div>' +
  /* TAB 4: Next of kin */
  '<div id="ep-tab-4" class="card" style="display:none;max-width:620px">' +
    '<div class="card-title"><i class="ti ti-heart-handshake"></i>Next of kin</div>' +
    '<div class="two-col">' +
      '<div class="f-group"><label class="f-label">Full name</label><input class="f-input" id="pf-kin-name" value="'+v('nextOfKin.name')+'" placeholder="Jane Dlamini"></div>' +
      '<div class="f-group"><label class="f-label">Relationship</label>' +
        '<select class="f-select" id="pf-kin-rel" style="margin:0"><option value="">— Select —</option>' +
          ['Spouse','Parent','Child','Sibling','Friend','Guardian','Other'].map(function(r){ return '<option value="'+r+'"'+(v('nextOfKin.relationship')===r?' selected':'')+'>'+r+'</option>'; }).join('') +
        '</select>' +
      '</div>' +
    '</div>' +
    '<div class="two-col">' +
      '<div class="f-group"><label class="f-label">Phone</label><input class="f-input" type="tel" id="pf-kin-phone" value="'+v('nextOfKin.phone')+'" placeholder="0821234567" onblur="_autoFmtPhone(this)"></div>' +
      '<div class="f-group"><label class="f-label">Alt phone</label><input class="f-input" type="tel" id="pf-kin-phonealt" value="'+v('nextOfKin.phoneAlt')+'" placeholder="0821234567" onblur="_autoFmtPhone(this)"></div>' +
    '</div>' +
    '<div id="pf-kin-alert" class="alert hidden" style="margin-bottom:6px"></div>' +
    '<button class="btn btn-green" onclick="_saveNextOfKin()"><i class="ti ti-device-floppy"></i>Save next of kin</button>' +
  '</div>' +
  /* TAB 5: Password */
  '<div id="ep-tab-5" class="card" style="display:none;max-width:620px">' +
    '<div class="card-title"><i class="ti ti-lock"></i>Change password</div>' +
    '<div class="f-group"><label class="f-label">Current password</label><input class="f-input" type="password" id="pf-pwd-current" placeholder="Enter current password"></div>' +
    '<div class="two-col">' +
      '<div class="f-group"><label class="f-label">New password</label><input class="f-input" type="password" id="pf-pwd-new" placeholder="Min 8 chars"></div>' +
      '<div class="f-group"><label class="f-label">Confirm new password</label><input class="f-input" type="password" id="pf-pwd-confirm" placeholder="Repeat password"></div>' +
    '</div>' +
    '<div id="pwd-alert" class="alert hidden" style="margin-bottom:6px"></div>' +
    '<button class="btn btn-green" id="pwd-change-btn" onclick="_changePassword()"><i class="ti ti-lock-check"></i>Update password</button>' +
  '</div>' +
  /* TAB 6: Documents */
  '<div id="ep-tab-6" class="card" style="display:none;max-width:620px">' +
    '<div class="card-title"><i class="ti ti-file-upload"></i>ID document</div>' +
    (p&&p.idDocument&&p.idDocument.url ?
      '<div class="alert-box alert-ok" style="margin-bottom:10px"><i class="ti ti-file-check"></i><div><div style="font-weight:500;font-size:13px">'+p.idDocument.filename+'</div><div style="font-size:11px">Uploaded '+new Date(p.idDocument.uploadedAt).toLocaleDateString('en-ZA')+'</div></div></div>' :
      '<div class="alert-box alert-warn" style="margin-bottom:10px"><i class="ti ti-alert-triangle"></i>No ID document uploaded yet.</div>'
    ) +
    '<div style="border:2px dashed var(--border);border-radius:var(--radius);padding:14px;text-align:center;cursor:pointer" onclick="document.getElementById(\'pf-iddoc\').click()">' +
      '<i class="ti ti-cloud-upload" style="font-size:22px;color:var(--text-hint);display:block;margin-bottom:6px"></i>' +
      '<div style="font-size:13px;color:var(--text-muted)">'+(p&&p.idDocument&&p.idDocument.url?'Replace':'Upload')+' ID / Passport</div>' +
      '<div style="font-size:11px;color:var(--text-hint)">JPG, PNG or PDF &middot; Max 5 MB</div>' +
    '</div>' +
    '<input type="file" id="pf-iddoc" accept=".jpg,.jpeg,.png,.pdf" style="display:none" onchange="_uploadIdDoc(this)">' +
    '<div id="id-doc-status" style="margin-top:8px"></div>' +
  '</div>';
}

window._showEpTab = function(n) {
  for (var i=1; i<=6; i++) {
    var tab=document.getElementById('ep-tab-'+i), btn=document.getElementById('ep-tab-btn-'+i);
    if(tab) tab.style.display=i===n?'block':'none';
    if(btn) btn.classList.toggle('active',i===n);
  }
};
window._autoFmtPhone = function(el) {
  var d=(el.value||'').replace(/[^0-9]/g,'');
  if(d.startsWith('27')&&d.length>=11) el.value='+'+d;
  else if(d.startsWith('0')&&d.length===10) el.value='+27'+d.slice(1);
  else if(d.length===9) el.value='+27'+d;
};
window._saveInfo = async function() {
  var allergies=((document.getElementById('pf-allergies')||{value:''}).value||'').split(',').map(function(a){return a.trim();}).filter(Boolean);
  var blood=(document.getElementById('pf-blood')||{value:''}).value;
  try { await API._fetchDirect('/patients/me/profile',{method:'PATCH',body:JSON.stringify({allergies:allergies,bloodType:blood})}); UI.showToast('Profile saved','ok'); }
  catch(e){ _pfAlert('pf-info-alert',e.message); }
};
window._saveContact = async function() {
  function g(id){ return ((document.getElementById(id)||{value:''}).value||'').trim(); }
  if(!g('pf-phone')){ _pfAlert('pf-contact-alert','Phone number is required.'); return; }
  try { await API._fetchDirect('/patients/me/profile',{method:'PATCH',body:JSON.stringify({phone:g('pf-phone'),phoneAlt:g('pf-phonealt'),email:g('pf-email')})}); UI.showToast('Contact saved','ok'); }
  catch(e){ _pfAlert('pf-contact-alert',e.message); }
};
window._saveAddress = async function() {
  function g(id){ return ((document.getElementById(id)||{value:''}).value||'').trim(); }
  try { await API._fetchDirect('/patients/me/profile',{method:'PATCH',body:JSON.stringify({address:{street:g('pf-street'),suburb:g('pf-suburb'),city:g('pf-city'),postalCode:g('pf-postal'),province:(document.getElementById('pf-province')||{value:''}).value||''}})}); UI.showToast('Address saved','ok'); }
  catch(e){ _pfAlert('pf-addr-alert',e.message); }
};
window._saveNextOfKin = async function() {
  function g(id){ return ((document.getElementById(id)||{value:''}).value||'').trim(); }
  try { await API._fetchDirect('/patients/me/profile',{method:'PATCH',body:JSON.stringify({nextOfKin:{name:g('pf-kin-name'),relationship:(document.getElementById('pf-kin-rel')||{value:''}).value||'',phone:g('pf-kin-phone'),phoneAlt:g('pf-kin-phonealt')}})}); UI.showToast('Next of kin saved','ok'); }
  catch(e){ _pfAlert('pf-kin-alert',e.message); }
};
function _pfAlert(id, msg){ var el=document.getElementById(id); if(!el) return; el.className='alert alert-error'; el.innerHTML='<i class="ti ti-alert-circle"></i> '+msg; el.classList.remove('hidden'); }
window._changePassword = async function() {
  var cur=(document.getElementById('pf-pwd-current')||{value:''}).value;
  var nw=(document.getElementById('pf-pwd-new')||{value:''}).value;
  var cf=(document.getElementById('pf-pwd-confirm')||{value:''}).value;
  var al=document.getElementById('pwd-alert'), btn=document.getElementById('pwd-change-btn');
  function showAl(msg){ if(!al)return; al.className='alert alert-error'; al.innerHTML='<i class="ti ti-alert-circle"></i> '+msg; al.classList.remove('hidden'); }
  if(!cur){ showAl('Enter your current password.'); return; }
  if(!nw||nw.length<8){ showAl('New password must be at least 8 characters.'); return; }
  if(nw!==cf){ showAl('Passwords do not match.'); return; }
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div> Saving...';}
  try {
    await API._fetchDirect('/auth/change-password',{method:'PATCH',body:JSON.stringify({currentPassword:cur,newPassword:nw})});
    UI.showToast('Password updated','ok');
    ['pf-pwd-current','pf-pwd-new','pf-pwd-confirm'].forEach(function(id){ var e=document.getElementById(id); if(e) e.value=''; });
    if(al) al.classList.add('hidden');
  } catch(e){ showAl(e.message||'Failed to update password.'); }
  finally{ if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-lock-check"></i>Update password';} }
};
window._uploadIdDoc = async function(input) {
  var file=input.files[0]; if(!file) return;
  if(file.size>5*1024*1024){ UI.showToast('File must be under 5 MB','err'); return; }
  var status=document.getElementById('id-doc-status'); if(status) status.innerHTML='<div style="font-size:12px;color:var(--text-muted)">Uploading...</div>';
  try {
    var token=API.Tokens?API.Tokens.getAccess():(localStorage.getItem('nihms_access')||'');
    var form=new FormData(); form.append('idDocument',file);
    var res=await fetch('https://nihms-backend.onrender.com/api/v1/patients/me/upload-id',{method:'POST',headers:{'Authorization':'Bearer '+token},body:form});
    var data=await res.json(); if(!data.success) throw new Error(data.message||'Upload failed');
    UI.showToast('ID document uploaded','ok');
    if(status) status.innerHTML='<div class="alert-box alert-ok" style="margin:0;font-size:12px"><i class="ti ti-check"></i>'+file.name+' uploaded</div>';
    setTimeout(function(){ Router.setPage('myprofile'); }, 1000);
  } catch(e){ UI.showToast(e.message||'Upload failed','err'); if(status) status.innerHTML='<div class="alert-box alert-danger" style="margin:0;font-size:12px">'+e.message+'</div>'; }
};

/* ══════════════════════════════════════════════════
   BOOK A VISIT — slot grid (no calendar overlay)
══════════════════════════════════════════════════ */
/* ── Slot availability — mirrors receptionist.js exactly ── */
var _BK_ALL_SLOTS_WEEKDAY = [
  '07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30'
];
var _BK_ALL_SLOTS_SAT = [
  '07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00'
];
function _bkGetSlots(dateStr) {
  /* Normalise dateStr to YYYY-MM-DD regardless of separator (handles 2026/11/04 or 2026-11-04) */
  var normDate = dateStr.replace(/\//g, '-');
  var d = new Date(normDate + 'T00:00:00');
  var day = d.getDay();
  if (day === 0) return [];
  var all = day === 6 ? _BK_ALL_SLOTS_SAT : _BK_ALL_SLOTS_WEEKDAY;
  /* Build today string in local time (not UTC) to avoid midnight-offset mismatch */
  var now = new Date();
  var todayStr = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
  if (normDate !== todayStr) return all.slice();
  /* Today: filter out slots within 30 minutes of current local time */
  var cutoff = now.getHours() * 60 + now.getMinutes() + 30;
  return all.filter(function(s) {
    var parts = s.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]) >= cutoff;
  });
}

Pages['book'] = () => {
  window._BKC = {
    facilityId: '', facilityName: '',
    selectedDate: '', selectedSlot: null,
    bookedSlots: {}   /* dateStr → [time, time, …] */
  };

  /* Auto-load facility + patient info */
  setTimeout(async function() {
    try {
      var u = API.getStoredUser();
      var fid   = u && (u.facilityId || u.facility);
      var fname = u && (u.facilityName || u.facility_name || '');
      if (fid && !fname) {
        try {
          var fr = await API._fetchDirect('/facilities/'+fid, {method:'GET'});
          if (fr && fr.data) fname = fr.data.name || '';
        } catch(_) {}
      }
      if (!fid) {
        try {
          var p = await _getMyPatientRecord();
          var pf = p && (p.primaryFacility || p.facility);
          if (pf) { fid = pf._id || pf; fname = pf.name || fname; }
        } catch(_) {}
      }
      window._BKC.facilityId   = fid   || '';
      window._BKC.facilityName = fname || 'Your facility';
      var lbl = document.getElementById('bk-facility-lbl');
      if (lbl) lbl.textContent = fname || 'Your registered facility';
    } catch(_) {}

    /* Load patient pill */
    try {
      var pt = await _getMyPatientRecord();
      if (pt) {
        window._BKC._patient = pt;
        var pname = ((pt.firstName||'') + ' ' + (pt.lastName||'')).trim() || 'You';
        var initials = ((pt.firstName||'')[0]||'') + ((pt.lastName||'')[0]||'');
        var pill = document.getElementById('bk-patient-pill');
        if (pill) pill.innerHTML =
          '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f0fdfa;border:1.5px solid #7ADAA8;border-radius:10px">' +
          '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#0F6E56,#1A4A9B);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0">' + initials.toUpperCase() + '</div>' +
          '<div><div style="font-weight:700;font-size:13px;color:#111">' + pname + '</div>' +
          '<div style="font-size:12px;color:#555">' + (pt.phone||pt.email||'Patient') + '</div></div>' +
          '<i class="ti ti-circle-check" style="margin-left:auto;color:#0F6E56;font-size:18px"></i></div>';
      }
    } catch(_) {}

    /* Load upcoming appointments into side panel */
    window._bkLoadSidePanel();

    /* Auto-trigger slot grid on page load */
    var dateEl = document.getElementById('bk-slot-date');
    if (dateEl) {
      if (!dateEl.value) {
        /* Set default date: tomorrow (skip Sunday) */
        var def = new Date();
        def.setDate(def.getDate() + 1);
        if (def.getDay() === 0) def.setDate(def.getDate() + 1);
        dateEl.value = def.toISOString().slice(0, 10);
      }
      /* Ensure _BKC.selectedDate is set immediately (before async completes) */
      window._BKC.selectedDate = dateEl.value;
      window._bkDateChange(dateEl.value);
    }
  }, 0);

  return `
<div class="page-title">Book a visit</div>
<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:#EEF7FF;border-left:4px solid #4A9BD4;border-radius:10px;margin-bottom:16px;font-size:13px;color:#1A4A9B">
  <i class="ti ti-clock" style="font-size:16px;flex-shrink:0"></i>
  <span>Clinic hours: <strong>Mon–Fri 07:00–17:00</strong> &middot; <strong>Sat 07:00–17:00</strong> &middot; Same-day bookings need <strong>30 min notice</strong>.</span>
</div>
<div style="display:grid;grid-template-columns:1fr 300px;gap:24px;align-items:start">

  <!-- Main booking column -->
  <div>

    <!-- Patient pill removed -->

    <!-- Booking form card -->
    <div class="card" style="padding:22px">
      <div style="font-size:15px;font-weight:700;color:#111;margin-bottom:18px;display:flex;align-items:center;gap:8px">
        <i class="ti ti-calendar-plus" style="color:var(--green-dark)"></i> New appointment
      </div>

      <!-- Visit type -->
      <div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">VISIT TYPE / DEPARTMENT</div>
        <select id="bk-visit-type" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:var(--radius);font-size:13px;font-family:inherit;background:#fff;outline:none;color:var(--text)"
          onchange="window._bkWarnSpecialist();window._bkRefreshSlots()">
          <option value="General Consultation">General Consultation</option>
          <option value="Telemedicine">Telemedicine</option>
          <option value="Lab / Blood Draw">Lab / Blood Draw</option>
          <option value="Immunisation">Immunisation</option>
          <option value="Mental Health">Mental Health</option>
          <option value="Chronic Care Follow-Up">Chronic Care Follow-Up</option>
          <option value="Maternal &amp; Child Health">Maternal &amp; Child Health</option>
          <option value="Pharmacy Pickup">Pharmacy Pickup</option>
          <option value="Specialist Referral">Specialist Referral</option>
          <option value="Wellness &amp; Preventive Care">Wellness &amp; Preventive Care</option>
        </select>
      </div>

      <!-- Specialist warning -->
      <div id="bk-specialist-warn" style="display:none;margin-bottom:14px;padding:10px 14px;background:#FEF2F2;border-left:4px solid #E24B4A;border-radius:8px;font-size:13px;color:#991B1B">
        <i class="ti ti-alert-triangle"></i> Specialist Referral requires a referral letter from your GP.
      </div>

      <!-- Facility (read-only) -->
      <div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">FACILITY</div>
        <div style="padding:10px 14px;background:var(--bg-surface);border:1.5px solid var(--border);border-radius:var(--radius);font-size:13px;color:var(--text-muted);display:flex;align-items:center;gap:8px">
          <i class="ti ti-building-hospital" style="font-size:15px;color:var(--green-dark);flex-shrink:0"></i>
          <span id="bk-facility-lbl">Loading your facility…</span>
          <i class="ti ti-lock" style="font-size:12px;margin-left:auto;color:var(--text-hint)" title="Assigned automatically"></i>
        </div>
      </div>

      <!-- Date picker -->
      <div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">DATE</div>
        <input type="date" id="bk-slot-date" min="${new Date().toISOString().slice(0,10)}"
          style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:var(--radius);font-size:13px;font-family:inherit;background:#fff;outline:none;color:var(--text)"
          onchange="window._bkDateChange(this.value)">
      </div>

      <!-- Slot grid -->
      <div id="bk-slot-wrap" style="display:none;margin-bottom:18px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase">SELECT A TIME SLOT</div>
          <div id="bk-slot-summary" style="font-size:11px;font-weight:600;color:#0F6E56"></div>
        </div>
        <div id="bk-slot-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px"></div>
        <div id="bk-slot-none" style="display:none;margin-top:8px;padding:12px 14px;background:#FEF2F2;border-left:3px solid #E24B4A;border-radius:8px;font-size:13px;color:#991B1B;text-align:center">
          <i class="ti ti-calendar-x"></i> No available slots for this date. Please choose another day.
        </div>
      </div>

      <!-- Confirm button -->
      <button id="bk-submit-btn" onclick="window._bkSubmit()"
        style="width:100%;padding:14px 20px;border:none;border-radius:50px;background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);color:#fff;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(15,110,86,.25);font-family:inherit">
        <i class="ti ti-calendar-check"></i> Confirm booking
      </button>

      <div id="bk-alert" style="display:none;margin-top:12px;padding:10px 14px;background:#FEF2F2;border-left:4px solid #E24B4A;border-radius:8px;font-size:13px;color:#991B1B"></div>
    </div>

    <!-- Success screen -->
    <div id="bk-done" style="display:none;margin-top:20px">
      <div class="card" style="padding:28px;text-align:center">
        <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#0F6E56,#1A4A9B);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
          <i class="ti ti-circle-check" style="font-size:28px;color:#fff"></i>
        </div>
        <div style="font-size:18px;font-weight:700;color:#111;margin-bottom:6px">Appointment Booked!</div>
        <div id="bk-done-detail" style="font-size:13px;color:#555;margin-bottom:18px"></div>
        <div style="display:flex;flex-direction:column;gap:8px;text-align:left;background:#f4f5f0;border-radius:10px;padding:14px;margin-bottom:18px">
          <div style="font-size:12px;color:#555"><i class="ti ti-device-mobile" style="color:var(--green-dark)"></i> SMS &amp; email confirmation sent.</div>
          <div style="font-size:12px;color:#7A5C10"><i class="ti ti-info-circle" style="color:#F0A500"></i> Queue token issued on check-in at the facility.</div>
        </div>
        <button onclick="Router.setPage('appointments')" style="padding:10px 24px;border:none;border-radius:50px;background:linear-gradient(135deg,#0F6E56,#1A4A9B);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">
          <i class="ti ti-list"></i> View my appointments
        </button>
      </div>
    </div>

  </div><!-- /main column -->

  <!-- Side panel: upcoming appointments -->
  <div id="bk-side-panel" style="position:sticky;top:16px">
    <div class="card" style="padding:18px">
      <div style="font-size:13px;font-weight:700;color:#111;margin-bottom:12px;display:flex;align-items:center;gap:6px">
        <i class="ti ti-calendar-event" style="color:var(--green-dark)"></i> Upcoming
      </div>
      <div id="bk-side-list" style="font-size:12px;color:#555">
        <div style="text-align:center;padding:16px 0;color:#aaa"><i class="ti ti-loader" style="font-size:20px"></i><br>Loading…</div>
      </div>
    </div>
  </div>

</div>`;
};

/* ── Booking helper functions ── */

window._bkWarnSpecialist = function() {
  var val = (document.getElementById('bk-visit-type')||{value:''}).value;
  var warn = document.getElementById('bk-specialist-warn'); if (!warn) return;
  warn.style.display = (val === 'Specialist Referral') ? 'block' : 'none';
};

window._bkDateChange = function(dateStr) {
  window._BKC.selectedDate = dateStr;
  window._BKC.selectedSlot = null;
  window._bkRefreshSlots();
};

window._bkRefreshSlots = async function() {
  var dateStr = window._BKC.selectedDate;
  var wrap = document.getElementById('bk-slot-wrap');
  var grid = document.getElementById('bk-slot-grid');
  var none = document.getElementById('bk-slot-none');
  if (!wrap || !grid) return;
  if (!dateStr) { wrap.style.display = 'none'; return; }

  /* Check for Sunday — normalise separator first */
  var normDateStr = dateStr.replace(/\//g, '-');
  var dayOfWeek = new Date(normDateStr + 'T00:00:00').getDay();
  if (dayOfWeek === 0) {
    wrap.style.display = 'block';
    grid.innerHTML = '';
    if (none) { none.style.display = 'block'; none.innerHTML = '<i class="ti ti-calendar-x"></i> Clinic is closed on Sundays. Please choose another day.'; }
    return;
  }

  /* Show wrap with loading state */
  wrap.style.display = 'block';
  if (none) none.style.display = 'none';
  grid.innerHTML = [
    '<div style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:8px;padding:18px;color:#777;font-size:13px">',
    '<div style="width:16px;height:16px;border:2px solid #e0e0e0;border-top-color:#0F6E56;border-radius:50%;animation:spin .7s linear infinite"></div>',
    'Loading available slots…</div>'
  ].join('');

  /* Inject spin keyframe once */
  if (!document.getElementById('_bk-spin-style')) {
    var st = document.createElement('style');
    st.id = '_bk-spin-style';
    st.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(st);
  }

  /* Fetch already-booked slots for this date+facility */
  var fid   = (window._BKC && window._BKC.facilityId) || '';
  var booked = [];
  if (fid && dateStr) {
    try {
      /* Use local date boundaries to avoid UTC-shift issues (SAST = UTC+2) */
      var fromISO = dateStr + 'T00:00:00.000+02:00';
      var toISO   = dateStr + 'T23:59:59.999+02:00';
      var res = await API._fetchDirect(
        '/appointments?facility='+fid+'&from='+encodeURIComponent(fromISO)+'&to='+encodeURIComponent(toISO)+'&limit=200',
        {method:'GET'}
      );
      (res && res.data || [])
        .filter(function(a){ return !['cancelled','canceled','no_show'].includes(a.status); })
        .forEach(function(a){
          var rawDt = a.scheduledAt || a.date || '';
          if (rawDt) {
            var dtObj = new Date(rawDt);
            if (!isNaN(dtObj.getTime())) {
              /* Normalise to HH:MM in SAST */
              var hh = String(dtObj.getHours()).padStart(2,'0');
              var mm = String(dtObj.getMinutes()).padStart(2,'0');
              booked.push(hh + ':' + mm);
            }
          } else if (a.time) {
            booked.push(a.time.slice(0,5));
          }
        });
    } catch(_) {}
  }
  window._BKC.bookedSlots[dateStr] = booked;

  /* All possible slots for this weekday → subtract booked → subtract past */
  var allSlots  = _bkGetSlots(dateStr);   /* already filters past slots for today */
  var available = allSlots.filter(function(s){ return booked.indexOf(s) === -1; });
  var takenSet  = {};
  booked.forEach(function(b){ takenSet[b] = true; });

  if (!allSlots.length) {
    grid.innerHTML = '';
    if (none) { none.style.display = 'block'; none.innerHTML = '<i class="ti ti-calendar-x"></i> No slots available for this date. Please choose another day.'; }
    return;
  }

  if (none) none.style.display = 'none';

  /* For today, _bkGetSlots already filtered out past slots.
     allSlots contains only future (or all-day) slots.
     We render ONLY those slots — past ones are completely hidden.
     Booked slots within allSlots are shown greyed (still in the future, just taken). */
  var availSet = {};
  available.forEach(function(s){ availSet[s] = true; });

  /* allDisplay = only non-past slots (past ones hidden entirely for today) */
  var allDisplay = allSlots;

  grid.innerHTML = allDisplay.map(function(t) {
    var isAvail = !!availSet[t];
    var isTaken = !!takenSet[t];
    var isSel   = window._BKC.selectedSlot === t;
    var label   = t;

    if (isSel && isAvail) {
      return '<button data-bkslot="'+t+'" onclick="window._bkPickSlot(\''+t+'\')" style="'+
        'padding:10px 4px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;'+
        'border:1.5px solid #0F6E56;background:#f0fdfa;color:#0F6E56;'+
        'font-family:inherit;box-shadow:0 0 0 2px rgba(15,110,86,.15)">'+label+'</button>';
    } else if (isAvail) {
      return '<button data-bkslot="'+t+'" onclick="window._bkPickSlot(\''+t+'\')" style="'+
        'padding:10px 4px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;'+
        'border:1.5px solid #e0e0e0;background:#fff;color:#111;'+
        'font-family:inherit;transition:border-color .12s,background .12s" '+
        'onmouseover="this.style.borderColor=\'#0F6E56\';this.style.background=\'#f0fdfa\'" '+
        'onmouseout="this.style.borderColor=\'#e0e0e0\';this.style.background=\'#fff\'">'+label+'</button>';
    } else {
      /* Taken (booked by someone else) — show with a subtle "Booked" label */
      return '<button disabled title="Already booked" style="'+
        'padding:6px 4px 4px;border-radius:8px;font-size:11px;font-weight:400;cursor:not-allowed;'+
        'border:1.5px solid #f0f0f0;background:#fafafa;color:#bbb;font-family:inherit;'+
        'display:flex;flex-direction:column;align-items:center;gap:1px;line-height:1.2">'+
        '<span>'+label+'</span>'+
        '<span style="font-size:9px;color:#ccc;letter-spacing:.4px;text-transform:uppercase">Booked</span>'+
        '</button>';
    }
  }).join('');

  /* Summary line */
  var avCount  = available.length;
  var totCount = allDisplay.length;
  var summary  = document.getElementById('bk-slot-summary');
  if (summary) {
    var bookedCount = booked.filter(function(b){ return allSlots.indexOf(b) !== -1; }).length;
    var bookedNote  = bookedCount > 0 ? ' · ' + bookedCount + ' booked' : '';
    summary.textContent = avCount + ' of ' + totCount + ' slots available' + bookedNote;
    summary.style.color = avCount === 0 ? '#E24B4A' : avCount <= 4 ? '#7A5C10' : '#0F6E56';
  }
};

window._bkPickSlot = function(t) {
  window._BKC.selectedSlot = t;
  /* Update all available slot buttons to reflect new selection */
  var btns = document.querySelectorAll('[data-bkslot]');
  btns.forEach(function(btn) {
    var sel = btn.getAttribute('data-bkslot') === t;
    btn.style.border     = '1.5px solid ' + (sel ? '#0F6E56' : '#e0e0e0');
    btn.style.background = sel ? '#f0fdfa' : '#fff';
    btn.style.color      = sel ? '#0F6E56' : '#111111';
    btn.style.fontWeight = sel ? '700' : '500';
    btn.style.boxShadow  = sel ? '0 0 0 2px rgba(15,110,86,.15)' : 'none';
  });
  /* Hide alert if they had an error and then picked a slot */
  var al = document.getElementById('bk-alert');
  if (al) al.style.display = 'none';
};

window._bkLoadSidePanel = async function() {
  var list = document.getElementById('bk-side-list'); if (!list) return;
  try {
    var p = window._BKC._patient || await _getMyPatientRecord();
    if (!p) { list.innerHTML = '<div style="color:#aaa;text-align:center;padding:12px 0">No data</div>'; return; }
    /* Fetch appointments using same method as My Appointments page, filter client-side */
    var res = await API.appointments.list({ patient: p._id, limit: 30 });
    var _now = new Date();
    var _excluded = ['cancelled','canceled','no_show','completed'];
    var apts = (res && res.data || [])
      .filter(function(a){
        if (_excluded.includes(a.status)) return false;
        var rawDt = a.scheduledAt || a.date || '';
        return rawDt ? new Date(rawDt) > _now : false;
      })
      .sort(function(a,b){
        return new Date(a.scheduledAt||a.date||0) - new Date(b.scheduledAt||b.date||0);
      });
    if (!apts.length) { list.innerHTML = '<div style="color:#aaa;text-align:center;padding:12px 0;font-size:12px">No upcoming appointments</div>'; return; }
    /* Reverse map: backend enum slug → human-readable display label */
    var _visitTypeDisplayMap = {
      'general_consultation': 'General Consultation',
      'telemedicine':         'Telemedicine',
      'lab':                  'Lab / Blood Draw',
      'immunisation':         'Immunisation',
      'mental_health':        'Mental Health',
      'chronic_care':         'Chronic Care Follow-Up',
      'maternal_child':       'Maternal & Child Health',
      'pharmacy_pickup':      'Pharmacy Pickup',
      'specialist_referral':  'Specialist Referral',
      'wellness':             'Wellness & Preventive Care'
    };
    var DEPT_COLS = {
      'General Consultation':'#0F6E56',
      'Telemedicine':'#1A4A9B',
      'Lab / Blood Draw':'#7B5EA7',
      'Immunisation':'#E07A10',
      'Mental Health':'#185FA5',
      'Chronic Care Follow-Up':'#1D9E75',
      'Maternal & Child Health':'#B45309',
      'Pharmacy Pickup':'#6D28D9',
      'Specialist Referral':'#0369A1',
      'Wellness & Preventive Care':'#0F766E'
    };
    list.innerHTML = apts.slice(0,5).map(function(a) {
      var rawDt = a.scheduledAt || a.date || '';
      var d = rawDt ? new Date(rawDt) : null;
      var dstr = d && !isNaN(d) ? d.toLocaleDateString('en-ZA',{day:'numeric',month:'short'}) : '—';
      var tstr = d && !isNaN(d) ? d.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit',hour12:false}) : (a.time||'');
      /* Resolve display label: try reverse-mapping slug, then use department field, then raw value */
      var rawType = a.visitType || a.department || 'Appointment';
      var dept = _visitTypeDisplayMap[rawType] || a.department || rawType;
      var col  = DEPT_COLS[dept] || '#0F6E56';
      return '<div style="padding:8px 10px;border-radius:8px;background:#f4f5f0;margin-bottom:8px;border-left:3px solid '+col+'">'+
        '<div style="font-weight:600;font-size:12px;color:#111">'+dept+'</div>'+
        '<div style="font-size:11px;color:#555;margin-top:2px">'+dstr+(tstr?' &middot; '+tstr:'')+'</div>'+
        '</div>';
    }).join('');
  } catch(_) {
    list.innerHTML = '<div style="color:#aaa;text-align:center;padding:12px 0;font-size:12px">Could not load appointments</div>';
  }
};

window._bkSubmit = async function() {
  var facility  = (window._BKC && window._BKC.facilityId)   || '';
  var facName   = (window._BKC && window._BKC.facilityName)  || '';
  var dept      = (document.getElementById('bk-visit-type')||{value:'General Consultation'}).value;
  /* Map display label → backend visitType enum value (backend uses lowercase slugs) */
  var _visitTypeMap = {
    'General Consultation':  'general_consultation',
    'Telemedicine':          'telemedicine',
    'Lab / Blood Draw':      'lab',
    'Immunisation':          'immunisation',
    'Mental Health':         'mental_health',
    'Chronic Care Follow-Up':'chronic_care',
    'Maternal & Child Health':'maternal_child',
    'Pharmacy Pickup':       'pharmacy_pickup',
    'Specialist Referral':   'specialist_referral',
    'Wellness & Preventive Care':'wellness'
  };
  var visitTypeEnum = _visitTypeMap[dept] || dept.toLowerCase().replace(/[^a-z0-9]+/g,'_');
  /* Sync date from DOM input in case _bkDateChange was never triggered */
  var _dateInputEl = document.getElementById('bk-slot-date');
  if (_dateInputEl && _dateInputEl.value && !window._BKC.selectedDate) {
    window._BKC.selectedDate = _dateInputEl.value;
    window._bkDateChange(_dateInputEl.value);
  }
  var dateStr   = window._BKC.selectedDate;
  var slotTime  = window._BKC.selectedSlot;
  var al        = document.getElementById('bk-alert');
  var btn       = document.getElementById('bk-submit-btn');

  function showErr(msg) {
    if (!al) return;
    al.innerHTML = '<i class="ti ti-alert-circle"></i> ' + msg;
    al.style.display = 'block';
    al.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  if (al) al.style.display = 'none';

  if (!facility)  { showErr('Could not determine your facility. Please refresh and try again.'); return; }
  if (!dateStr)   { showErr('Please select a date first.'); return; }
  if (!slotTime)  { showErr('Please select a time slot.'); return; }

  /* Build scheduledAt ISO string */
  var scheduledAt = new Date(dateStr + 'T' + slotTime + ':00').toISOString();
  var dtObj = new Date(scheduledAt);
  if (dtObj <= new Date()) { showErr('Please select a future date and time.'); return; }

  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;display:inline-block"></div> Booking…'; }

  try {
    var p = window._BKC._patient || await _getMyPatientRecord();
    if (!p) { showErr('Patient record not found. Please log in again.'); if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-calendar-check"></i> Confirm booking';} return; }

    var dateLabel = dtObj.toLocaleDateString('en-ZA',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    var timeLabel = slotTime;
    var ref       = 'APT-' + Date.now().toString().slice(-5);

    await API.appointments.create({
      patient:     p._id,
      facility:    facility,
      visitType:   visitTypeEnum,
      department:  dept,
      scheduledAt: scheduledAt,
      facilityName: facName
    });

    /* Notify */
    var smsMsg = 'NIHMS APPOINTMENT CONFIRMED. Dear '+(p.firstName||'Patient')+', your appointment ('+ref+') is booked at '+dept+' on '+dateLabel+' at '+timeLabel+'. Please arrive 10 min early.';
    var emailHtml = '<div style="font-family:inherit;max-width:520px;margin:0 auto"><div style="background:linear-gradient(135deg,#0F6E56 0%,#1A4A9B 100%);padding:24px;border-radius:10px 10px 0 0;text-align:center"><h2 style="color:#fff;margin:0">Appointment Confirmed</h2></div><div style="background:#f4f5f0;padding:24px;border-radius:0 0 10px 10px"><p>Dear <strong>'+((p.firstName||'')+' '+(p.lastName||'')).trim()+'</strong>,</p><table style="width:100%;border-collapse:collapse;margin:16px 0"><tr><td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;color:#777;font-size:13px">Reference</td><td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-weight:700;color:#0F6E56">'+ref+'</td></tr><tr><td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;color:#777;font-size:13px">Department</td><td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-weight:600">'+dept+'</td></tr><tr><td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;color:#777;font-size:13px">Date</td><td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-weight:600">'+dateLabel+'</td></tr><tr><td style="padding:8px 12px;color:#777;font-size:13px">Time</td><td style="padding:8px 12px;font-weight:600">'+timeLabel+'</td></tr></table><p style="font-size:13px;color:#555">Please arrive 10 minutes before your appointment time.</p></div></div>';
    try {
      if (p.phone) await API._fetchDirect('/notifications/sms',{method:'POST',body:JSON.stringify({to:p.phone,message:smsMsg})}).catch(function(){});
      if (p.email) await API._fetchDirect('/notifications/email',{method:'POST',body:JSON.stringify({to:p.email,subject:'NIHMS — Appointment confirmed: '+ref,html:emailHtml})}).catch(function(){});
    } catch(_) {}

    /* Show done screen */
    var formCard = btn && btn.closest('.card');
    if (formCard) formCard.style.display = 'none';
    var done = document.getElementById('bk-done');
    var detail = document.getElementById('bk-done-detail');
    if (detail) detail.innerHTML = '<strong>'+dept+'</strong> &middot; '+facName+'<br>'+dateLabel+' at '+timeLabel;
    if (done) { done.style.display = 'block'; done.scrollIntoView({behavior:'smooth',block:'nearest'}); }

    setTimeout(function(){ Router.setPage('appointments'); }, 4000);
  } catch(e) {
    showErr(e.message || 'Booking failed. Please try again.');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-calendar-check"></i> Confirm booking'; }
  }
};

/* ══════════════════════════════════════════════════
   RESCHEDULE CALENDAR FUNCTIONS
══════════════════════════════════════════════════ */
window._rsClose = function() {
  var m = document.getElementById('reschedule-modal');
  if (m) m.style.display = 'none';
};

window._rsToggleCal = function() {
  var wrap = document.getElementById('rs-cal-wrap');
  if (!wrap) return;
  if (wrap.style.display === 'block') {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  window._rsCalDraw();
};

window._rsCalNav = function(dir) {
  _RSCAL.month += dir;
  if (_RSCAL.month > 11) { _RSCAL.month = 0; _RSCAL.year++; }
  if (_RSCAL.month < 0)  { _RSCAL.month = 11; _RSCAL.year--; }
  window._rsCalDraw();
};

window._rsCalDraw = function() {
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var lbl  = document.getElementById('rs-month-lbl');
  var grid = document.getElementById('rs-day-grid');
  if (!grid) return;
  if (lbl) lbl.textContent = MONTHS[_RSCAL.month] + ' ' + _RSCAL.year;

  var first = new Date(_RSCAL.year, _RSCAL.month, 1).getDay();
  var days  = new Date(_RSCAL.year, _RSCAL.month + 1, 0).getDate();
  var today = new Date(); today.setHours(0,0,0,0);
  var html  = '';

  for (var i = 0; i < first; i++) html += '<div></div>';
  for (var d = 1; d <= days; d++) {
    var dt   = new Date(_RSCAL.year, _RSCAL.month, d); dt.setHours(0,0,0,0);
    var ds   = _RSCAL.year + '-' + String(_RSCAL.month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    var past = dt <= today;
    var sel  = _RSCAL.selected === ds;
    var day  = dt.getDay();
    var closed = day === 0;

    var bg='transparent', col='var(--text)', bdr='1px solid transparent', fw='400', cur='default';
    if (sel)             { bg='var(--green-dark)'; col='#fff'; bdr='2px solid var(--green-dark)'; fw='700'; }
    else if (!past && !closed) { bg='#EDFBF3'; bdr='1.5px solid #7ADAA8'; }
    else if (closed)     { col='#ccc'; }
    else if (past)       { col='#ccc'; }
    var ok = !past && !closed;
    if (ok) cur = 'pointer';

    var ev = ok ? ' onclick="window._rsSelDate(\''+ds+'\')"' : '';
    html += '<div style="text-align:center;padding:8px 2px;border-radius:8px;background:'+bg+';color:'+col+';border:'+bdr+';font-weight:'+fw+';cursor:'+cur+';font-size:13px"'+ev+'>'+d+'</div>';
  }
  grid.innerHTML = html;
};

window._rsSelDate = function(ds) {
  _RSCAL.selected = ds;
  window._rsCalDraw();
  window._rsUpdLabel();
};

window._rsUpdLabel = function() {
  if (!_RSCAL.selected) return;
  var h    = parseInt((document.getElementById('rs-t-h')    || {value:'8'}).value) || 8;
  var m    = (document.getElementById('rs-t-m')    || {value:'00'}).value;
  var ampm = (document.getElementById('rs-t-ampm') || {value:'AM'}).value;
  var h24  = ampm === 'PM' && h < 12 ? h+12 : (ampm === 'AM' && h === 12 ? 0 : h);
  var dtVal= _RSCAL.selected + 'T' + String(h24).padStart(2,'0') + ':' + m;

  var inp = document.getElementById('rs-datetime'); if (inp) inp.value = dtVal;
  var d   = new Date(dtVal);
  var disp= d.toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'}) + ' at ' + d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  var lbl = document.getElementById('rs-date-lbl'), box = document.getElementById('rs-date-display');
  if (lbl) { lbl.textContent = disp; lbl.style.color = 'var(--text)'; }
  if (box) box.style.borderColor = 'var(--green)';
};

/* Show/hide reason-other field */
document.addEventListener('change', function(e) {
  if (e.target && e.target.id === 'rs-reason-sel') {
    var other = document.getElementById('rs-reason-other');
    if (other) other.style.display = e.target.value === 'other' ? 'block' : 'none';
  }
  if (e.target && e.target.id === 'cancel-reason-sel') {
    var other = document.getElementById('cancel-reason-other');
    if (other) other.style.display = e.target.value === 'other' ? 'block' : 'none';
  }
});



/* ══════════════════════════════════════════════════════════════════════════
   PATIENT EXPERIENCE SURVEY — 5 steps
   Booking → Check-in → Queue → Consultation → Pharmacy & Overall
══════════════════════════════════════════════════════════════════════════ */
Pages['survey'] = () => {
  window._SRV = {
    step: 1,
    totalSteps: 5,
    answers: {},
    queueTokenId: window._srvTokenId || null,
    appointmentId: window._srvApptId || null,
  };
  setTimeout(function() { _srvRender(); }, 0);
  return `
<div class="page-title">Patient Experience Survey</div>
<div id="srv-wrap" style="max-width:680px"></div>`;
};

var _SRV_STEPS = [
  { num:1, icon:'ti-calendar-check', label:'Booking',           color:'#4A9BD4' },
  { num:2, icon:'ti-login',          label:'Check-in',          color:'#1D9E75' },
  { num:3, icon:'ti-list-numbers',   label:'Queue',             color:'#EF9F27' },
  { num:4, icon:'ti-stethoscope',    label:'Consultation',      color:'#0F6E56' },
  { num:5, icon:'ti-pill',           label:'Pharmacy & Overall',color:'#7C3AED' },
];

var _SRV_QUESTIONS = {
  1: [
    { id:'q1',  type:'stars',   label:'How easy was it to book your appointment?', na:true, naLabel:'I did not book' },
    { id:'q2',  type:'stars',   label:'How easy was it to find information about the facility and available services?', na:true },
    { id:'q3',  type:'stars',   label:'How satisfied were you with your appointment confirmation/reminder?', na:true },
    { id:'q4',  type:'choice',  label:'Did you receive enough information about your appointment?', options:['Yes','No','Partially'], na:false },
  ],
  2: [
    { id:'q5',  type:'stars',  label:'How easy was the check-in process?' },
    { id:'q6',  type:'stars',  label:'How helpful and respectful was the staff during check-in?' },
    { id:'q7',  type:'stars',  label:'How satisfied were you with the time it took to complete check-in?' },
  ],
  3: [
    { id:'q8',  type:'stars',  label:'How satisfied were you with the queue management process?' },
    { id:'q9',  type:'choice', label:'Was the estimated waiting time clear to you?', options:['Yes','No','I did not receive an estimated waiting time'] },
    { id:'q10', type:'stars',  label:'How satisfied were you with the amount of time you waited before seeing the healthcare professional?' },
    { id:'q11', type:'choice', label:'Were you kept informed about delays or changes in the queue?', options:['Always','Sometimes','Never','Not applicable'] },
  ],
  4: [
    { id:'q12', type:'stars',  label:"How would you rate the healthcare professional's friendliness and respect?" },
    { id:'q13', type:'stars',  label:'How well did the healthcare professional listen to your concerns?' },
    { id:'q14', type:'stars',  label:'How clearly did the healthcare professional explain your condition, treatment, or next steps?' },
    { id:'q15', type:'choice', label:'Did you feel comfortable asking questions during your consultation?', options:['Yes','No','Partially'] },
    { id:'q16', type:'stars',  label:'Did you feel that your privacy and dignity were respected?' },
    { id:'q17', type:'stars',  label:'Overall, how satisfied were you with your consultation?' },
  ],
  5: [
    { id:'q18', type:'stars',  label:'How easy was it to collect your medication?', na:true, naLabel:'I did not collect medication' },
    { id:'q19', type:'stars',  label:'How helpful and respectful was the pharmacy staff?', na:true },
    { id:'q20', type:'choice', label:'Were the instructions about your medication explained clearly?', options:['Yes','No','Partially'], na:true, naLabel:'N/A' },
    { id:'q21', type:'stars',  label:'How satisfied were you with the waiting time at the pharmacy?', na:true },
    { id:'q22', type:'stars',  label:'Overall, how satisfied are you with your healthcare experience today?' },
    { id:'q23', type:'choice', label:'Did the healthcare service meet your expectations?', options:['Yes','No','Partially'] },
    { id:'q24', type:'choice', label:'How likely are you to use this healthcare facility again?', options:['Very unlikely','Unlikely','Not sure','Likely','Very likely'] },
    { id:'q25', type:'choice', label:'Would you recommend this healthcare facility to someone else?', options:['Definitely not','Probably not','Not sure','Probably yes','Definitely yes'] },
    { id:'q26', type:'text',   label:'What did we do well today?' },
    { id:'q27', type:'text',   label:'What could we improve?' },
    { id:'q28', type:'choice', label:'Did you experience any problems during your visit?', options:['No','Yes'] },
    { id:'q28b',type:'text',   label:'If yes, please describe what happened:', optional:true },
    { id:'q29', type:'text',   label:'Is there anything else you would like us to know?', optional:true },
  ],
};

function _srvRender() {
  var wrap = document.getElementById('srv-wrap');
  if (!wrap) return;
  var s    = window._SRV;
  var step = s.step;
  var info = _SRV_STEPS[step-1];
  var qs   = _SRV_QUESTIONS[step] || [];

  /* Progress bar */
  var pct = Math.round((step-1)/s.totalSteps*100);
  var progressHTML =
    '<div style="display:flex;gap:0;margin-bottom:20px">' +
    _SRV_STEPS.map(function(st) {
      var done    = step > st.num;
      var current = step === st.num;
      return '<div style="flex:1;text-align:center">' +
        '<div style="height:4px;background:' + (done||current?st.color:'var(--border)') + ';margin-bottom:6px;border-radius:2px;transition:background .3s"></div>' +
        '<div style="font-size:10px;font-weight:' + (current?'700':'500') + ';color:' + (current?st.color:done?'var(--text-muted)':'var(--text-hint)') + '">' +
          '<i class="ti ' + st.icon + '" style="display:block;font-size:14px;margin-bottom:2px"></i>' + st.label +
        '</div>' +
      '</div>';
    }).join('') + '</div>';

  /* Step header */
  var headerHTML =
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:14px 16px;background:' + info.color + '15;border-radius:12px;border-left:4px solid ' + info.color + '">' +
      '<i class="ti ' + info.icon + '" style="font-size:24px;color:' + info.color + ';flex-shrink:0"></i>' +
      '<div>' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:' + info.color + '">Step ' + step + ' of ' + s.totalSteps + '</div>' +
        '<div style="font-weight:700;font-size:17px">' + info.label + '</div>' +
      '</div>' +
    '</div>';

  /* Questions */
  var questionsHTML = qs.map(function(q) {
    var saved = s.answers[q.id];
    var html  = '<div style="margin-bottom:22px" id="qwrap-'+q.id+'">';
    html += '<div style="font-size:14px;font-weight:500;margin-bottom:10px;color:var(--text)">' + q.label + (q.optional?' <span style="color:var(--text-hint);font-size:12px">(optional)</span>':'') + '</div>';

    if (q.type === 'stars') {
      html += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">';
      for (var r = 1; r <= 5; r++) {
        var labels = ['','Very Poor','Poor','Average','Good','Excellent'];
        var sel = saved === r;
        html += '<button onclick="_srvStar(\'' + q.id + '\',' + r + ')" ' +
          'style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 10px;border-radius:10px;border:1.5px solid ' + (sel?info.color:'var(--border)') + ';background:' + (sel?info.color+'15':'transparent') + ';cursor:pointer;min-width:52px;transition:all .15s">' +
          '<span style="font-size:22px">' + '⭐'.repeat(r) + '</span>' +
          '<span style="font-size:10px;font-weight:600;color:' + (sel?info.color:'var(--text-muted)') + '">' + r + '</span>' +
          '<span style="font-size:9px;color:' + (sel?info.color:'var(--text-hint)') + '">' + labels[r] + '</span>' +
        '</button>';
      }
      if (q.na) {
        var selNA = saved === 'na';
        html += '<button onclick="_srvStar(\'' + q.id + '\',\'na\')" ' +
          'style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 10px;border-radius:10px;border:1.5px solid ' + (selNA?'#888':'var(--border)') + ';background:' + (selNA?'#f0f0f0':'transparent') + ';cursor:pointer;min-width:52px;transition:all .15s">' +
          '<span style="font-size:22px">—</span>' +
          '<span style="font-size:10px;font-weight:600;color:#888">N/A</span>' +
          '<span style="font-size:9px;color:var(--text-hint)">' + (q.naLabel||'N/A') + '</span>' +
        '</button>';
      }
      html += '</div>';

    } else if (q.type === 'choice') {
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
      q.options.forEach(function(opt) {
        var sel = saved === opt;
        html += '<button onclick="_srvChoice(\'' + q.id + '\',this)" data-val="' + opt + '" ' +
          'style="padding:8px 14px;border-radius:20px;border:1.5px solid ' + (sel?info.color:'var(--border)') + ';background:' + (sel?info.color+'15':'transparent') + ';cursor:pointer;font-size:13px;font-weight:' + (sel?'700':'400') + ';color:' + (sel?info.color:'var(--text)') + ';transition:all .15s">' +
          opt + '</button>';
      });
      if (q.na) {
        var selNA2 = saved === 'N/A';
        html += '<button onclick="_srvChoice(\'' + q.id + '\',this)" data-val="N/A" ' +
          'style="padding:8px 14px;border-radius:20px;border:1.5px solid ' + (selNA2?'#888':'var(--border)') + ';background:' + (selNA2?'#f0f0f0':'transparent') + ';cursor:pointer;font-size:13px;color:#888;font-weight:' + (selNA2?'700':'400') + '">' +
          (q.naLabel||'N/A') + '</button>';
      }
      html += '</div>';

    } else if (q.type === 'text') {
      html += '<textarea id="ta-' + q.id + '" rows="3" ' +
        'style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-family:inherit;resize:vertical;outline:none" ' +
        'placeholder="Type your answer here…" oninput="_srvText(\'' + q.id + '\',this.value)">' +
        (saved||'') + '</textarea>';
    }

    html += '</div>';
    return html;
  }).join('');

  /* Navigation */
  var isLast = step === s.totalSteps;
  var navHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:24px;padding-top:16px;border-top:1px solid var(--border)">' +
      (step > 1 ? '<button class="btn" onclick="_srvBack()"><i class="ti ti-arrow-left"></i>Back</button>' : '<div></div>') +
      '<div style="font-size:12px;color:var(--text-muted)">' + step + ' / ' + s.totalSteps + '</div>' +
      (isLast
        ? '<button class="btn btn-green" id="srv-submit-btn" onclick="_srvSubmit()" style="padding:10px 24px"><i class="ti ti-send"></i>Submit Survey</button>'
        : '<button class="btn btn-green" onclick="_srvNext()" style="padding:10px 24px">Next <i class="ti ti-arrow-right"></i></button>'
      ) +
    '</div>';

  wrap.innerHTML =
    '<div style="background:var(--bg-card);border-radius:16px;padding:24px;box-shadow:var(--shadow-sm)">' +
      progressHTML + headerHTML +
      '<div id="srv-questions">' + questionsHTML + '</div>' +
      '<div id="srv-error" style="display:none;padding:8px 12px;background:#FEF2F2;border-left:4px solid var(--red);border-radius:8px;font-size:13px;color:#991B1B;margin-top:10px"></div>' +
      navHTML +
    '</div>';
}

window._srvStar = function(qid, val) {
  window._SRV.answers[qid] = val;
  _srvRender();
};

window._srvChoice = function(qid, btn) {
  window._SRV.answers[qid] = btn.dataset.val;
  _srvRender();
};

window._srvText = function(qid, val) {
  window._SRV.answers[qid] = val;
};

window._srvNext = function() {
  /* Save text area values before navigating */
  var qs = _SRV_QUESTIONS[window._SRV.step] || [];
  qs.forEach(function(q) {
    if (q.type === 'text') {
      var ta = document.getElementById('ta-' + q.id);
      if (ta) window._SRV.answers[q.id] = ta.value;
    }
  });

  /* Validate required questions (non-optional, non-N/A-able star/choice) */
  var errEl = document.getElementById('srv-error');
  var missing = qs.filter(function(q) {
    return !q.optional && window._SRV.answers[q.id] === undefined;
  });
  if (missing.length) {
    if (errEl) { errEl.textContent = 'Please answer all required questions before continuing.'; errEl.style.display='block'; }
    /* Highlight missing */
    missing.forEach(function(q) {
      var el = document.getElementById('qwrap-'+q.id);
      if (el) el.style.outline = '2px solid var(--red)';
    });
    return;
  }

  window._SRV.step++;
  _srvRender();
  window.scrollTo(0,0);
};

window._srvBack = function() {
  window._SRV.step--;
  _srvRender();
  window.scrollTo(0,0);
};

window._srvSubmit = async function() {
  /* Save final text areas */
  var qs = _SRV_QUESTIONS[5] || [];
  qs.forEach(function(q) {
    if (q.type === 'text') {
      var ta = document.getElementById('ta-' + q.id);
      if (ta) window._SRV.answers[q.id] = ta.value;
    }
  });

  var btn = document.getElementById('srv-submit-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div> Submitting…'; }

  try {
    var p = await _getMyPatientRecord();
    var u = API.getStoredUser();
    var a = window._SRV.answers;

    /* Build structured survey result */
    var payload = {
      patient:       p?._id,
      queueToken:    window._SRV.queueTokenId,
      appointment:   window._SRV.appointmentId,
      facility:      u?.facilityId || u?.facility,
      submittedAt:   new Date().toISOString(),

      /* Section scores */
      booking: {
        easeOfBooking:     a.q1, facilityInfo: a.q2,
        confirmationSat:   a.q3, enoughInfo: a.q4,
        sectionAvg: _srvAvg([a.q1, a.q2, a.q3]),
      },
      checkin: {
        easeOfCheckin:  a.q5, staffHelpfulness: a.q6,
        checkinTime:    a.q7,
        sectionAvg: _srvAvg([a.q5, a.q6, a.q7]),
      },
      queue: {
        queueManagement: a.q8, waitTimeClarity: a.q9,
        waitTimeSat:     a.q10, keptInformed: a.q11,
        sectionAvg: _srvAvg([a.q8, a.q10]),
      },
      consultation: {
        professionalFriendliness: a.q12, listening: a.q13,
        explanation: a.q14, comfortAsking: a.q15,
        privacyDignity: a.q16, overallConsult: a.q17,
        sectionAvg: _srvAvg([a.q12, a.q13, a.q14, a.q16, a.q17]),
      },
      pharmacy: {
        easeOfCollection: a.q18, staffHelpfulness: a.q19,
        instructionsClarity: a.q20, waitTimeSat: a.q21,
        sectionAvg: _srvAvg([a.q18, a.q19, a.q21]),
      },
      overall: {
        overallSatisfaction: a.q22, metExpectations: a.q23,
        likelyToReturn: a.q24, wouldRecommend: a.q25,
        sectionAvg: _srvAvg([a.q22]),
      },
      openText: {
        didWell:       a.q26 || '',
        improve:       a.q27 || '',
        problemsOccurred: a.q28,
        problemDesc:   a.q28b || '',
        other:         a.q29 || '',
      },
      /* Overall NPS-style score */
      overallScore: _srvAvg([a.q1, a.q2, a.q3, a.q5, a.q6, a.q7,
                              a.q8, a.q10, a.q12, a.q13, a.q14,
                              a.q16, a.q17, a.q18, a.q19, a.q21, a.q22]),
    };

    /* Save to backend */
    await API._fetchDirect('/surveys', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).catch(function() {
      /* Fall back to queue feedback if survey endpoint not yet set up */
      if (window._SRV.queueTokenId && a.q22) {
        return API._fetchDirect('/queue2/'+window._SRV.queueTokenId+'/feedback', {
          method: 'POST',
          body: JSON.stringify({ satisfaction: a.q22, surveyData: payload }),
        });
      }
    });

    /* Show thank you screen */
    var wrap = document.getElementById('srv-wrap');
    if (wrap) {
      wrap.innerHTML =
        '<div class="card" style="text-align:center;padding:40px 24px">' +
          '<div style="font-size:60px;margin-bottom:16px">🙏</div>' +
          '<div style="font-size:22px;font-weight:700;margin-bottom:8px">Thank you, ' + (p?.firstName||'') + '!</div>' +
          '<div style="font-size:14px;color:var(--text-muted);max-width:400px;margin:0 auto 24px">Your feedback helps us improve the quality of care for all patients. We value your time and honest responses.</div>' +
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:480px;margin:0 auto 24px">' +
            _srvScoreCard('📅 Booking',      payload.booking.sectionAvg) +
            _srvScoreCard('🏥 Check-in',     payload.checkin.sectionAvg) +
            _srvScoreCard('🎫 Queue',         payload.queue.sectionAvg) +
            _srvScoreCard('👨‍⚕️ Consultation', payload.consultation.sectionAvg) +
            _srvScoreCard('💊 Pharmacy',      payload.pharmacy.sectionAvg) +
            _srvScoreCard('⭐ Overall',        payload.overall.sectionAvg) +
          '</div>' +
          '<button class="btn btn-green" onclick="Router.setPage(\'myhealth\')" style="padding:12px 28px"><i class="ti ti-home"></i>Back to home</button>' +
        '</div>';
    }

  } catch(e) {
    if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-send"></i>Submit Survey'; }
    var errEl = document.getElementById('srv-error');
    if (errEl) { errEl.textContent = e.message || 'Submission failed — please try again.'; errEl.style.display='block'; }
  }
};

function _srvAvg(vals) {
  var nums = vals.filter(function(v){ return typeof v === 'number'; });
  if (!nums.length) return null;
  return Math.round(nums.reduce(function(a,b){return a+b;},0) / nums.length * 10) / 10;
}

function _srvScoreCard(label, avg) {
  if (avg === null || avg === undefined) return '';
  var color = avg >= 4 ? '#1D9E75' : avg >= 3 ? '#EF9F27' : '#E24B4A';
  return '<div style="padding:10px;background:var(--bg-surface);border-radius:10px">' +
    '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">' + label + '</div>' +
    '<div style="font-size:20px;font-weight:800;color:' + color + '">' + avg + '<span style="font-size:12px;color:var(--text-muted)">/5</span></div>' +
  '</div>';
}



/* ══════════════════════════════════════════════════════════════════════
   AI VIRTUAL ASSISTANT — appended from js/pages/chatbot.js
   (Pages['assistant'] + all supporting functions)
══════════════════════════════════════════════════════════════════════ */

/* ── Knowledge base topics ── */
function _getKbTopics() {
  return [
    { icon:'ti-virus',          label:'HIV & AIDS',                   q:'Explain HIV, AIDS, symptoms, CD4 count, and ARV treatment in South Africa' },
    { icon:'ti-lungs',          label:'Tuberculosis (TB)',             q:'What is TB, how is it spread, what are symptoms, and how is it treated with DOTS?' },
    { icon:'ti-droplet-half-2', label:'Diabetes explained',           q:'Explain type 1 and type 2 diabetes, blood sugar levels, symptoms, and management' },
    { icon:'ti-heart-rate',     label:'High blood pressure',          q:'What causes hypertension, what are the symptoms and complications, and how is it treated?' },
    { icon:'ti-pill',           label:'Understanding medications',     q:'How do I know if my medication is working and what are common side effects to watch for?' },
    { icon:'ti-flask',          label:'Reading lab results',          q:'How do I read and understand blood test results like FBC, LFT, urea and cholesterol?' },
    { icon:'ti-brain',          label:'Mental health in SA',          q:'What mental health conditions are common in South Africa and how can I get help?' },
    { icon:'ti-gender-bigender',label:'Sexual & reproductive health', q:'What should I know about sexual health, STIs, contraception, and reproductive care?' },
    { icon:'ti-baby-carriage',  label:'Pregnancy & maternal health',  q:'What do I need to know about pregnancy, antenatal care, and safe delivery in South Africa?' },
    { icon:'ti-leaf',           label:'Traditional & modern medicine',q:'Can I use traditional medicine alongside modern medicine and what are the risks?' },
    { icon:'ti-shield-check',   label:'Vaccinations & immunisation',  q:'What vaccines do adults and children need in South Africa and why are they important?' },
    { icon:'ti-heart',          label:'Heart disease & stroke',       q:'What are the warning signs of a heart attack and stroke, and what should I do?' },
  ];
}

/* ── Health tips bank ── */
const _healthTips = [
  { icon:'💧', color:'#1A4A9B', bg:'#EEF2FF', title:'Stay Hydrated',       body:'Drink 6–8 glasses of water daily. Proper hydration supports kidney function, energy levels, and skin health.',          category:'Wellness' },
  { icon:'🚶', color:'#0F6E56', bg:'#E1F5EE', title:'Move Every Day',       body:'Even 30 minutes of brisk walking daily reduces the risk of heart disease, diabetes, and depression.',                    category:'Exercise' },
  { icon:'🍎', color:'#E05D2A', bg:'#FEF3EC', title:'Eat the Rainbow',      body:'Include fruits and vegetables of different colours in your meals for essential vitamins and antioxidants.',               category:'Nutrition' },
  { icon:'😴', color:'#7C3AED', bg:'#F5F3FF', title:'Prioritise Sleep',     body:'Adults need 7–9 hours of quality sleep. Poor sleep is linked to weight gain, weakened immunity, and mental health issues.',category:'Sleep' },
  { icon:'🧘', color:'#D97706', bg:'#FFFBEB', title:'Manage Stress',        body:'Chronic stress raises blood pressure. Try deep breathing: inhale 4 counts, hold 4, exhale 6. Practice 5 minutes daily.', category:'Mental Health' },
  { icon:'🩺', color:'#DC2626', bg:'#FEF2F2', title:'Regular Check-ups',    body:'Annual screenings catch problems early. Blood pressure, cholesterol, blood sugar, and cancer screenings save lives.',     category:'Prevention' },
  { icon:'🚭', color:'#65A30D', bg:'#F7FEE7', title:'Avoid Smoking',        body:'Smoking causes 7 out of 10 lung cancer cases. Your clinic can provide free stop-smoking support.',                        category:'Lifestyle' },
  { icon:'🤲', color:'#0F6E56', bg:'#E1F5EE', title:'Hand Hygiene',         body:'Washing hands with soap for 20 seconds prevents 80% of common infections.',                                               category:'Hygiene' },
  { icon:'☀️', color:'#D97706', bg:'#FFFBEB', title:'Sunscreen Matters',    body:'Apply SPF 30+ sunscreen when outdoors. Skin cancer is one of the most preventable cancers.',                              category:'Prevention' },
  { icon:'🦷', color:'#1A4A9B', bg:'#EEF2FF', title:'Oral Health Matters',  body:'Gum disease is linked to heart disease. Brush twice daily, floss, and visit a dentist every 6 months.',                  category:'Dental' },
];

let _tipIndex    = 0;
let _chatHistory = [];
let _isListening = false;

function _initChatbot() {
  _tipIndex = Math.floor(Math.random() * _healthTips.length);
  _renderTip();
}

function _renderTip() {
  const tip = _healthTips[_tipIndex % _healthTips.length];
  const el  = document.getElementById('current-tip');
  if (!el) return;
  el.innerHTML = `
    <div style="text-align:center;padding:8px 0 14px">
      <div style="font-size:40px;margin-bottom:10px">${tip.icon}</div>
      <span style="font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:3px 10px;border-radius:20px;background:${tip.bg};color:${tip.color}">${tip.category}</span>
    </div>
    <div style="font-weight:700;font-size:16px;color:#111;margin-bottom:10px">${tip.title}</div>
    <div style="font-size:13px;color:#555;line-height:1.7">${tip.body}</div>
    <button onclick="_askAboutTip('${tip.title}')"
      style="margin-top:14px;width:100%;padding:9px;border-radius:10px;border:1.5px solid var(--green);background:transparent;color:var(--green-dark);font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .15s"
      onmouseover="this.style.background='var(--green-light)'" onmouseout="this.style.background='transparent'">
      <i class="ti ti-message-question"></i> Ask about this
    </button>`;
}

window._refreshTip = () => {
  _tipIndex++;
  const el = document.getElementById('current-tip');
  if (el) { el.style.animation='none'; el.offsetHeight; el.style.animation='fadeIn .4s ease'; }
  _renderTip();
};

window._askAboutTip = (title) => {
  const input = document.getElementById('chat-input');
  if (input) { input.value = 'Tell me more about: ' + title; _sendMessage(); }
};

window._searchKnowledge = (query) => {
  const input = document.getElementById('kb-search');
  if (input) input.value = query;
  const chatInput = document.getElementById('chat-input');
  if (chatInput) { chatInput.value = query; _sendMessage(); }
};

window._sendQuickQ = (q) => {
  const input = document.getElementById('chat-input');
  if (input) { input.value = q; _sendMessage(); }
};

/* ── Send message — routes through backend proxy ── */
window._sendMessage = async () => {
  const input = document.getElementById('chat-input');
  const text  = input?.value?.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';

  const qq = document.getElementById('quick-questions');
  if (qq) qq.style.display = 'none';

  _addMessage('user', text);
  _chatHistory.push({ role:'user', content: text });

  const typingId = _addTypingIndicator();
  const btn = document.getElementById('send-btn');
  if (btn) btn.disabled = true;

  try {
    const user = API.getStoredUser();

    const systemPrompt = `You are a knowledgeable and compassionate medical health assistant for NIHMS (National Integrated Healthcare Management System) in South Africa. You help patients understand any medical question they have — no topic is off limits.

Patient: ${user?.firstName || 'Patient'} ${user?.lastName || ''}

You can help with ALL medical questions including symptoms, medications, lab results, mental health, sexual health, HIV, TB, diabetes, hypertension, pregnancy, surgery, cancer, traditional medicine, and anything else the patient asks.

Response style:
- Be thorough, clear, and compassionate
- Use plain language
- For emergency symptoms always say: "Call 10177 or go to your nearest emergency room immediately"
- Reference South African context: public clinics, ARV programmes, DOTS therapy, NHI
- Short paragraphs, plain text, avoid markdown symbols`;

    const res   = await API._fetchDirect('/auth/chat', {
      method: 'POST',
      body:   JSON.stringify({ messages: _chatHistory.slice(-10), systemPrompt })
    });
    const reply = res?.reply || 'I\'m sorry, I couldn\'t process your question. Please try again.';

    _removeTypingIndicator(typingId);
    _addMessage('assistant', reply);
    _chatHistory.push({ role:'assistant', content: reply });

  } catch(e) {
    _removeTypingIndicator(typingId);
    _addMessage('assistant', 'I\'m having trouble connecting right now. Please try again in a moment, or speak to a nurse at your clinic for assistance.');
  } finally {
    if (btn) btn.disabled = false;
    input?.focus();
  }
};

function _addMessage(role, text) {
  const wrap = document.getElementById('chat-messages');
  if (!wrap) return;
  const isUser = role === 'user';
  const time   = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  const formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p style="margin-top:8px">')
    .replace(/\n/g, '<br>');

  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:10px;align-items:flex-start;' + (isUser ? 'flex-direction:row-reverse' : '');
  div.innerHTML = `
    <div style="width:32px;height:32px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,${isUser?'#0F6E56,#1A4A9B':'#1A4A9B,#0F6E56'})">
      <i class="ti ti-${isUser?'user':'robot'}" style="font-size:14px;color:#fff"></i>
    </div>
    <div style="max-width:75%">
      <div style="${isUser
        ? 'background:linear-gradient(135deg,#0F6E56,#1A4A9B);color:#fff;border-radius:12px 0 12px 12px'
        : 'background:#fff;border:1px solid var(--border);border-radius:0 12px 12px 12px;color:#333;box-shadow:0 1px 3px rgba(0,0,0,.06)'};padding:12px 14px;font-size:14px;line-height:1.6">
        <p style="margin:0">${formatted}</p>
      </div>
      <div style="font-size:11px;color:#aaa;margin-top:4px;${isUser?'text-align:right':''}padding:0 4px">${time}</div>
    </div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function _addTypingIndicator() {
  const wrap = document.getElementById('chat-messages');
  if (!wrap) return null;
  const id  = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.id    = id;
  div.style.cssText = 'display:flex;gap:10px;align-items:flex-start';
  div.innerHTML = `
    <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#1A4A9B,#0F6E56);display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <i class="ti ti-robot" style="font-size:14px;color:#fff"></i>
    </div>
    <div style="background:#fff;border:1px solid var(--border);border-radius:0 12px 12px 12px;padding:14px 18px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
      <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
    </div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return id;
}

function _removeTypingIndicator(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.remove();
}

window._clearChat = () => {
  _chatHistory = [];
  const wrap = document.getElementById('chat-messages');
  if (wrap) wrap.innerHTML = '';
  const qq = document.getElementById('quick-questions');
  if (qq) qq.style.display = 'block';
  _addMessage('assistant', 'Chat cleared. How can I help you today?');
};

window._toggleVoice = () => {
  const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  if (!SRClass) {
    UI.showToast('Voice input not supported. Please use Chrome or Edge.', 'err');
    return;
  }
  const btn = document.getElementById('voice-btn');

  if (_isListening) {
    if (window._recognition) window._recognition.stop();
    return;
  }

  try {
    window._recognition = new SRClass();
    window._recognition.lang            = 'en-ZA';
    window._recognition.continuous      = false;
    window._recognition.interimResults  = false;
    window._recognition.maxAlternatives = 1;

    window._recognition.onstart = () => {
      _isListening = true;
      if (btn) {
        btn.innerHTML = '<i class="ti ti-microphone" style="animation:pulse 1s infinite"></i> Listening…';
        btn.style.background = 'rgba(231,76,60,.7)';
      }
    };

    window._recognition.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join(' ').trim();
      if (text) {
        const input = document.getElementById('chat-input');
        if (input) { input.value = text; _sendMessage(); }
      }
    };

    window._recognition.onerror = (e) => {
      const msg = e.error === 'not-allowed'
        ? 'Microphone access denied — please allow microphone in browser settings.'
        : 'Voice input failed (' + (e.error || 'unknown') + '). Please type instead.';
      UI.showToast(msg, 'err');
    };

    window._recognition.onend = () => {
      _isListening = false;
      if (btn) {
        btn.innerHTML = '<i class="ti ti-microphone"></i> Speak';
        btn.style.background = 'rgba(255,255,255,.15)';
      }
    };

    window._recognition.start();

  } catch(e) {
    UI.showToast('Could not start microphone: ' + e.message, 'err');
  }
};

/* ══════════════════════════════
   VIRTUAL ASSISTANT PAGE
══════════════════════════════ */
Pages['assistant'] = () => {
  setTimeout(() => _initChatbot(), 100);
  return `
    <div style="display:grid;grid-template-columns:1fr 360px;gap:16px;height:calc(100vh - 120px);min-height:500px">

      <!-- LEFT: Chat panel -->
      <div style="display:flex;flex-direction:column;background:var(--bg-card);border-radius:var(--radius-xl);border:1px solid var(--border);overflow:hidden">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0F6E56,#1A4A9B);padding:16px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0">
          <div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center">
            <i class="ti ti-robot" style="font-size:20px;color:#fff"></i>
          </div>
          <div style="flex:1">
            <div style="font-weight:700;color:#fff;font-size:15px">NIHMS Virtual Assistant</div>
            <div style="font-size:11px;color:rgba(255,255,255,.75);display:flex;align-items:center;gap:5px">
              <div style="width:7px;height:7px;border-radius:50%;background:#4ade80;animation:pulse 2s infinite"></div>
              Online &middot; Powered by Groq AI
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button onclick="_clearChat()" style="background:rgba(255,255,255,.15);border:none;border-radius:8px;padding:6px 10px;cursor:pointer;color:#fff;font-size:12px">
              <i class="ti ti-trash"></i> Clear
            </button>
            <button onclick="_toggleVoice()" id="voice-btn" style="background:rgba(255,255,255,.15);border:none;border-radius:8px;padding:6px 10px;cursor:pointer;color:#fff;font-size:12px">
              <i class="ti ti-microphone"></i> Speak
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div id="chat-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#fafafa">
          <div style="display:flex;gap:10px;align-items:flex-start">
            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#0F6E56,#1A4A9B);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <i class="ti ti-robot" style="font-size:14px;color:#fff"></i>
            </div>
            <div style="max-width:75%">
              <div style="background:#fff;border:1px solid var(--border);border-radius:0 12px 12px 12px;padding:12px 14px;font-size:14px;line-height:1.6;color:#333;box-shadow:0 1px 3px rgba(0,0,0,.06)">
                Hello! I'm your NIHMS Medical Assistant. Ask me <strong>anything</strong> about your health.
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0;font-size:12px">
                  <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--bg-surface);border-radius:7px;color:#555"><i class="ti ti-pill" style="font-size:13px;color:var(--green-dark)"></i>Medications</div>
                  <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--bg-surface);border-radius:7px;color:#555"><i class="ti ti-flask" style="font-size:13px;color:var(--green-dark)"></i>Lab results</div>
                  <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--bg-surface);border-radius:7px;color:#555"><i class="ti ti-heart-rate" style="font-size:13px;color:var(--green-dark)"></i>Symptoms</div>
                  <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--bg-surface);border-radius:7px;color:#555"><i class="ti ti-brain" style="font-size:13px;color:var(--green-dark)"></i>Mental health</div>
                  <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--bg-surface);border-radius:7px;color:#555"><i class="ti ti-virus" style="font-size:13px;color:var(--green-dark)"></i>HIV &amp; TB</div>
                  <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--bg-surface);border-radius:7px;color:#555"><i class="ti ti-baby-carriage" style="font-size:13px;color:var(--green-dark)"></i>Pregnancy</div>
                </div>
                <div style="font-size:12px;color:#888;border-top:1px solid var(--border);padding-top:8px;margin-top:4px">
                  For emergencies call <strong>10177</strong> immediately.
                </div>
              </div>
              <div style="font-size:11px;color:#aaa;margin-top:4px;padding-left:4px">Just now</div>
            </div>
          </div>
        </div>

        <!-- Quick questions -->
        <div id="quick-questions" style="padding:10px 16px;border-top:1px solid var(--border);background:#fff;flex-shrink:0">
          <div style="font-size:11px;color:#aaa;margin-bottom:8px;font-weight:500">SUGGESTED QUESTIONS</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap" id="quick-q-list"></div>
        </div>

        <!-- Input area -->
        <div style="padding:12px 16px;border-top:1px solid var(--border);background:#fff;flex-shrink:0">
          <div style="display:flex;gap:8px;align-items:flex-end">
            <div style="flex:1;position:relative">
              <textarea id="chat-input" rows="1" placeholder="Type your health question or press the mic to speak…"
                style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:12px;font-family:inherit;font-size:14px;resize:none;outline:none;line-height:1.5;max-height:100px;overflow-y:auto;transition:border-color .15s"
                onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();_sendMessage();}"
                oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px'"
                onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border)'">
              </textarea>
            </div>
            <button id="send-btn" onclick="_sendMessage()"
              style="width:42px;height:42px;border-radius:12px;border:none;background:linear-gradient(135deg,#0F6E56,#1A4A9B);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;transition:all .15s"
              onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform=''">
              <i class="ti ti-send"></i>
            </button>
          </div>
          <div style="font-size:11px;color:#bbb;margin-top:6px;text-align:center">
            Press Enter to send &middot; Shift+Enter for new line
          </div>
        </div>
      </div>

      <!-- RIGHT: Knowledge + Health tips -->
      <div style="display:flex;flex-direction:column;gap:12px;overflow-y:auto">

        <!-- Knowledge Search -->
        <div style="background:var(--bg-card);border-radius:var(--radius-xl);border:1px solid var(--border);overflow:hidden">
          <div style="background:linear-gradient(135deg,#1A4A9B,#0F6E56);padding:14px 16px;display:flex;align-items:center;gap:10px">
            <i class="ti ti-search" style="color:#fff;font-size:18px"></i>
            <div style="font-weight:600;color:#fff;font-size:14px">Knowledge Search</div>
          </div>
          <div style="padding:14px">
            <div style="position:relative;margin-bottom:10px">
              <i class="ti ti-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#aaa;font-size:14px"></i>
              <input id="kb-search" type="text" placeholder="Search health topics…"
                style="width:100%;padding:9px 9px 9px 32px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;outline:none;font-family:inherit;transition:border-color .15s"
                onkeydown="if(event.key==='Enter')_searchKnowledge(this.value)"
                onfocus="this.style.borderColor='var(--green)'" onblur="this.style.borderColor='var(--border)'">
            </div>
            <div id="kb-results" style="font-size:13px"></div>
          </div>
        </div>

        <!-- Daily Health Tips -->
        <div style="background:var(--bg-card);border-radius:var(--radius-xl);border:1px solid var(--border);overflow:hidden;flex:1">
          <div style="background:linear-gradient(135deg,#EF9F27,#E05D2A);padding:14px 16px;display:flex;align-items:center;gap:10px">
            <i class="ti ti-bulb" style="color:#fff;font-size:18px"></i>
            <div style="font-weight:600;color:#fff;font-size:14px">Daily Health Tips</div>
            <button onclick="_refreshTip()" style="margin-left:auto;background:rgba(255,255,255,.2);border:none;border-radius:6px;padding:4px 8px;cursor:pointer;color:#fff;font-size:11px">
              <i class="ti ti-refresh"></i> New tip
            </button>
          </div>
          <div id="health-tips-body" style="padding:14px">
            <div id="current-tip" style="animation:fadeIn .4s ease"></div>
          </div>
        </div>
      </div>
    </div>

    <style>
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes typing{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
      .typing-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#aaa;animation:typing 1.2s infinite;margin:0 2px}
      .typing-dot:nth-child(2){animation-delay:.2s}
      .typing-dot:nth-child(3){animation-delay:.4s}
    </style>`;
};

/* ── Populate quick questions after DOM is available ── */
(function _fillQuickQ() {
  function _doFill() {
    var el = document.getElementById('quick-q-list');
    if (!el) return;
    var qs = [
      'What do my blood test results mean?',
      'I have chest pain — is it serious?',
      'What are HIV symptoms and treatment?',
      'How do ARVs work?',
      'What causes high blood pressure?',
      'I feel depressed — what can help?',
      'How does diabetes affect my body?',
      'What should I know about TB?',
      'What is a normal blood sugar level?',
      'Can I mix alcohol with my medication?'
    ];
    el.innerHTML = qs.map(function(q) {
      return '<button onclick="_sendQuickQ(\'' + q.replace(/'/g,"\\'") + '\')" style="font-size:12px;padding:5px 10px;border-radius:20px;border:1px solid var(--border);background:var(--bg-surface);color:#555;cursor:pointer;white-space:nowrap" onmouseover="this.style.background=\'var(--green-light)\';this.style.borderColor=\'var(--green)\';this.style.color=\'var(--green-dark)\'" onmouseout="this.style.background=\'var(--bg-surface)\';this.style.borderColor=\'var(--border)\';this.style.color=\'#555\'">' + q + '</button>';
    }).join('');
    // Also populate kb-results
    var kb = document.getElementById('kb-results');
    if (kb && !kb.innerHTML.trim()) {
      kb.innerHTML = _getKbTopics().map(function(t) {
        return '<div onclick="_searchKnowledge(\'' + t.q.replace(/'/g,"\\'") + '\')" style="padding:8px 10px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:background .15s;border:1px solid transparent;margin-bottom:4px" onmouseover="this.style.background=\'var(--green-light)\';this.style.borderColor=\'var(--green)\'" onmouseout="this.style.background=\'\';this.style.borderColor=\'transparent\'"><i class="ti ' + t.icon + '" style="color:var(--green-dark);font-size:14px;flex-shrink:0"></i><span style="color:#333">' + t.label + '</span></div>';
      }).join('');
    }
  }
  // Patch _initChatbot to also fill quick questions
  var _origInit = _initChatbot;
  window._initChatbot = _initChatbot = function() {
    _origInit();
    setTimeout(_doFill, 50);
  };
})();

/* ══════════════════════════════════════════════════════════════════════
   PATIENT SIDEBAR NAV INJECTION
   Adds "AI Assistant" nav item whenever the patient sidebar renders.
   Works regardless of whether router.js or app.js builds the sidebar.
══════════════════════════════════════════════════════════════════════ */
(function _injectAssistantNav() {
  function _addNavItem() {
    var sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    // Only inject once, and only for patient role
    if (sidebar.querySelector('[data-nav="assistant"]')) return;
    // Check role — if receptionist/nurse sidebar is present, skip
    if (document.getElementById('nurse-sidebar')) return;

    // Find a good insertion point: after the last nav-item or at end of sidebar
    // Add a divider section label + the nav item
    var divider = document.createElement('div');
    divider.className = 'nav-section';
    divider.textContent = 'AI Tools';

    var item = document.createElement('div');
    item.className = 'nav-item';
    item.setAttribute('data-nav', 'assistant');
    item.setAttribute('data-page', 'assistant');
    item.innerHTML = '<i class="ti ti-robot"></i> AI Assistant';
    item.onclick = function() {
      // Remove active from all nav items
      document.querySelectorAll('#sidebar .nav-item').forEach(function(n) { n.classList.remove('active'); });
      item.classList.add('active');
      if (typeof Router !== 'undefined') Router.setPage('assistant');
    };

    sidebar.appendChild(divider);
    sidebar.appendChild(item);
  }

  // Try now (in case sidebar already exists)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(_addNavItem, 500); });
  } else {
    setTimeout(_addNavItem, 500);
  }

  // Also observe sidebar for when Router populates it
  var _obs = null;
  function _startObserver() {
    var sidebar = document.getElementById('sidebar');
    if (!sidebar) { setTimeout(_startObserver, 300); return; }
    _addNavItem();
    _obs = new MutationObserver(function() { setTimeout(_addNavItem, 100); });
    _obs.observe(sidebar, { childList: true, subtree: false });
  }
  setTimeout(_startObserver, 200);

  // Also hook Router.setPage to keep nav active state in sync
  var _routerHook = setInterval(function() {
    if (typeof Router === 'undefined' || !Router.setPage) return;
    clearInterval(_routerHook);
    var _origSetPage = Router.setPage.bind(Router);
    Router.setPage = function(page) {
      _origSetPage(page);
      // Re-inject if sidebar was rebuilt
      setTimeout(function() {
        _addNavItem();
        // Highlight active
        document.querySelectorAll('#sidebar .nav-item').forEach(function(n) {
          if (n.getAttribute('data-page') === page) n.classList.add('active');
          else if (n.getAttribute('data-nav') === 'assistant' && page !== 'assistant') n.classList.remove('active');
        });
      }, 150);
    };
  }, 200);
})();
