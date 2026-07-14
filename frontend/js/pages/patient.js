/**
 * js/pages/patient.js — Complete Patient Portal
 * myhealth · myrecords · appointments · checkin · billing · myprofile · book
 */
if (typeof Pages === 'undefined') window.Pages = {};

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
  setTimeout(_mhLoad, 0);
  window._mhInt = setInterval(_mhLoad, 30000);
  return '<div id="mh-alerts"></div><div class="page-title">My health overview</div><div id="mh-body" style="color:var(--text-muted)">Loading...</div>';
};

async function _mhLoad() {
  var wrap = document.getElementById('mh-body');
  if (!wrap) return;

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
        general:     { bg:'#EEF2FF', border:'#4A6CF7', ic:'ti-speakerphone', c:'#1A4A9B', label:'Facility Announcement' },
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
    var profUrl = p.profilePicture && p.profilePicture.url ? 'http://localhost:5000' + p.profilePicture.url : null;
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

    var results = await Promise.allSettled([
      API._fetchDirect('/queue2/my-token?patientId='+p._id+'&facilityId='+(p.primaryFacility && p.primaryFacility._id || (API.getStoredUser() && (API.getStoredUser().facilityId || API.getStoredUser().facility))), {method:'GET'}),
      API.appointments.list({ patient: p._id, limit: 10 })
    ]);

    var qTok  = results[0].value && results[0].value.data;
    var appts = results[1].value && results[1].value.data || [];
    var now   = new Date();
    var upcoming = appts.filter(function(a){ return new Date(a.scheduledAt) > now && ['confirmed','pending'].includes(a.status); })
                       .sort(function(a,b){ return new Date(a.scheduledAt) - new Date(b.scheduledAt); });
    var nextAppt = upcoming[0];
    var v = p.latestVitals || {};
    var tokenBg = {emergency:'#E24B4A',priority:'#EF9F27',normal:'#4A6CF7',walkin:'#1D9E75'}[qTok && qTok.tokenType] || 'var(--green-dark)';
    var tokenStatusMsg = {
      waiting:'Please wait — you will be called shortly',
      called:"IT'S YOUR TURN — proceed to the consultation room",
      in_consultation:'You are currently in consultation',
      post_consultation:'Consultation complete',
      lab:'Please go to the Laboratory',
      pharmacy:'Please go to the Pharmacy',
      completed:'Your visit is complete. Thank you!'
    }[(qTok && qTok.status)] || 'Please wait';

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
        '<div class="card"' + (qTok&&qTok.status==='called'?' style="border:2px solid var(--green)"':'') + '>' +
          '<div class="card-title"><i class="ti ti-list-numbers"></i>Queue status</div>' +
          (qTok && !['completed','cancelled','skipped'].includes(qTok.status) ?
            (qTok.status==='called' ? '<div style="padding:8px 12px;background:var(--green);color:#fff;border-radius:8px;font-weight:700;font-size:13px;margin-bottom:10px;text-align:center">🔔 IT\'S YOUR TURN</div>' : '') +
            '<div style="text-align:center;padding:12px 0">' +
              '<div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-hint)">Your token</div>' +
              '<div style="font-size:64px;font-weight:900;font-family:var(--mono);color:'+tokenBg+';line-height:1.1">'+(qTok&&qTok.token)+'</div>' +
              '<div style="display:flex;justify-content:center;gap:24px;margin:10px 0;font-size:13px">' +
                '<div><strong style="font-size:20px">'+(qTok&&qTok.aheadCount!=null?qTok.aheadCount:'—')+'</strong><br><span style="color:var(--text-muted)">ahead</span></div>' +
                '<div><strong style="font-size:20px">'+(qTok&&qTok.estimatedWait!=null?qTok.estimatedWait:'—')+'</strong><br><span style="color:var(--text-muted)">min wait</span></div>' +
              '</div>' +
              '<div style="font-size:12px;color:var(--text-muted)">'+tokenStatusMsg+'</div>' +
            '</div>' +
            (['lab','pharmacy'].includes(qTok&&qTok.status) ? '<div class="alert-box alert-info" style="margin-top:8px"><i class="ti ti-'+(qTok.status==='lab'?'flask':'pill')+'"></i> Please go to the <strong>'+(qTok.status==='lab'?'Laboratory':'Pharmacy')+'</strong></div>' : '') +
            (qTok&&qTok.status==='completed' ? '<div style="text-align:center;margin-top:8px"><div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">How was your experience?</div><div style="display:flex;justify-content:center;gap:4px" id="mh-stars">' + [1,2,3,4,5].map(function(n){ return '<button onclick="_mhRate(\''+qTok._id+'\','+n+')" style="font-size:24px;background:none;border:none;cursor:pointer">⭐</button>'; }).join('') + '</div></div>' : '')
          :
            '<div style="text-align:center;padding:16px;color:var(--text-muted)"><i class="ti ti-checks" style="font-size:32px;opacity:.25;display:block;margin-bottom:8px"></i>Not in queue today</div>' +
            '<button class="btn btn-green" style="width:100%" onclick="Router.setPage(\'checkin\')"><i class="ti ti-login"></i>Check in to queue</button>'
          ) +
        '</div>' +
        '<div class="card">' +
          '<div class="card-title"><i class="ti ti-calendar-event"></i>Next appointment</div>' +
          (nextAppt ?
            '<div style="padding:12px;background:'+(new Date(nextAppt.scheduledAt).toDateString()===now.toDateString()?'var(--green-light)':'var(--bg-surface)')+';border-radius:10px;border:1.5px solid '+(new Date(nextAppt.scheduledAt).toDateString()===now.toDateString()?'var(--green)':'var(--border)')+';">' +
              (new Date(nextAppt.scheduledAt).toDateString()===now.toDateString() ? '<div style="font-size:11px;font-weight:700;color:var(--green-dark);margin-bottom:6px">📅 TODAY</div>' : '') +
              '<div style="font-weight:600;font-size:14px;text-transform:capitalize;margin-bottom:4px"><i class="ti ti-'+(nextAppt.visitType==='telemedicine'?'video':'stethoscope')+'" style="font-size:13px;margin-right:4px"></i>'+(nextAppt.visitType||'').replace('_',' ')+'</div>' +
              '<div style="font-size:12px;color:var(--text-muted)">'+new Date(nextAppt.scheduledAt).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'})+' at '+new Date(nextAppt.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'</div>' +
              '<div style="font-size:12px;color:var(--text-muted)">'+(nextAppt.facility&&nextAppt.facility.name||'')+'</div>' +
              '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">' +
                (nextAppt.visitType==='telemedicine'?'<button class="btn btn-sm btn-green" onclick="Router.setPage(\'telemedicine\')"><i class="ti ti-video"></i>Join</button>':'') +
                '<button class="btn btn-sm" onclick="Router.setPage(\'checkin\')"><i class="ti ti-login"></i>Check in</button>' +
                '<button class="btn btn-sm" onclick="Router.setPage(\'appointments\')"><i class="ti ti-calendar"></i>All</button>' +
              '</div>' +
            '</div>'
          :
            '<div style="text-align:center;padding:16px;color:var(--text-muted)"><i class="ti ti-calendar-off" style="font-size:32px;opacity:.25;display:block;margin-bottom:8px"></i>No upcoming appointments</div>' +
            '<button class="btn btn-green" style="width:100%" onclick="Router.setPage(\'book\')"><i class="ti ti-plus"></i>Book an appointment</button>'
          ) +
        '</div>' +
      '</div>';
  } catch(e) {
    if (wrap) wrap.innerHTML = '<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>' + e.message + '</div>';
  }
}

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
    var res   = await fetch('http://localhost:5000/api/v1/patients/me/upload-profile', {method:'POST',headers:{'Authorization':'Bearer '+token},body:form});
    var data  = await res.json();
    if (!data.success) throw new Error(data.message||'Upload failed');
    var url = 'http://localhost:5000' + data.data.url;
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
  setTimeout(async function() {
    var wrap = document.getElementById('rec-body'); if (!wrap) return;
    try {
      var p = await _getMyPatientRecord();
      if (!p) { wrap.innerHTML='<div class="alert-box alert-warn">Please complete your profile first.</div>'; return; }
      var results = await Promise.allSettled([API.labs.list({patient:p._id,limit:20}), API.prescriptions.list({patient:p._id,limit:20})]);
      var labs = results[0].value&&results[0].value.data||[];
      var rxs  = results[1].value&&results[1].value.data||[];
      wrap.innerHTML =
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
          '<div class="card">' +
            '<div class="card-title"><i class="ti ti-flask"></i>Lab results</div>' +
            (labs.length ? labs.map(function(l) {
              var hasCrit = (l.tests||[]).some(function(t){return t.flag==='critical';});
              return '<div style="padding:10px 0;border-bottom:1px solid var(--border)">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">' +
                  '<div><div style="font-weight:600;font-size:13px">'+(l.tests||[]).map(function(t){return t.name;}).join(', ')+'</div>' +
                  '<div style="font-size:11px;color:var(--text-muted)">'+new Date(l.createdAt).toLocaleDateString('en-ZA')+' · '+(l.priority||'routine')+'</div></div>' +
                  '<span class="badge '+(l.status==='ready'||l.status==='collected'?'badge-green':l.status==='in_lab'||l.status==='processing'?'badge-blue':'badge-amber')+'">'+l.status+'</span>' +
                '</div>' +
                (hasCrit?'<div style="padding:4px 8px;background:#FEF2F2;border-radius:6px;font-size:11px;color:var(--red);font-weight:600">⚠️ Critical result — contact your doctor</div>':'') +
                (l.tests||[]).filter(function(t){return t.result;}).map(function(t){ return '<div style="font-size:12px;color:var(--text-muted)">'+t.name+': <strong>'+t.result+'</strong>'+(t.referenceRange?(' (ref: '+t.referenceRange+')'):'')+(t.flag&&t.flag!=='normal'?' <span style="color:var(--red)">['+t.flag+']</span>':'')+'</div>'; }).join('') +
              '</div>';
            }).join('') : '<div style="color:var(--text-muted);font-size:13px">No lab results on record</div>') +
          '</div>' +
          '<div class="card">' +
            '<div class="card-title"><i class="ti ti-pill"></i>Prescriptions</div>' +
            (rxs.length ? rxs.map(function(r) {
              return '<div style="padding:10px 0;border-bottom:1px solid var(--border)">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">' +
                  '<div style="font-weight:600;font-size:13px">'+(r.lines||[]).map(function(l){return l.medicationName;}).join(', ')+'</div>' +
                  '<span class="badge '+(r.status==='dispensed'?'badge-green':r.status==='pending'?'badge-amber':'badge-gray')+'">'+r.status+'</span>' +
                '</div>' +
                '<div style="font-size:12px;color:var(--text-muted)">Dr. '+(r.prescribedBy&&r.prescribedBy.firstName||'—')+' '+(r.prescribedBy&&r.prescribedBy.lastName||'')+' · '+new Date(r.createdAt).toLocaleDateString('en-ZA')+'</div>' +
                (r.lines||[]).map(function(l){ return '<div style="font-size:12px;color:var(--text-muted)">• '+l.medicationName+' — '+l.dosage+' · '+(l.durationDays||'?')+' days</div>'; }).join('') +
              '</div>';
            }).join('') : '<div style="color:var(--text-muted);font-size:13px">No prescriptions on record</div>') +
          '</div>' +
        '</div>';
    } catch(e) { if(wrap) wrap.innerHTML='<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>'+e.message+'</div>'; }
  }, 0);
  return '<div class="page-title">My medical records</div><div id="rec-body" style="color:var(--text-muted)">Loading...</div>';
};

/* ══════════════════════════════════════════════════
   APPOINTMENTS
══════════════════════════════════════════════════ */
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
        var badge = {confirmed:'badge-green',pending:'badge-amber',completed:'badge-green',cancelled:'badge-gray',no_show:'badge-red'}[a.status]||'badge-gray';
        var isFuture = new Date(a.scheduledAt) > now;
        var canAct   = ['pending','confirmed'].includes(a.status) && isFuture;
        var isToday  = new Date(a.scheduledAt).toDateString() === now.toDateString();
        return '<div style="padding:14px 0;border-bottom:1px solid var(--border)'+(isToday?';background:var(--green-light);margin:0 -4px;padding-left:4px;padding-right:4px;border-radius:8px':'')+'";>' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">' +
            '<div style="flex:1;min-width:0">' +
              (isToday?'<div style="font-size:11px;font-weight:700;color:var(--green-dark);margin-bottom:4px">📅 TODAY</div>':'') +
              '<div style="font-weight:600;font-size:13px;text-transform:capitalize;margin-bottom:2px"><i class="ti ti-'+(a.visitType==='telemedicine'?'video':'stethoscope')+'" style="font-size:13px;margin-right:5px"></i>'+(a.visitType||'').replace('_',' ')+'</div>' +
              '<div style="font-size:12px;color:var(--text-muted)">'+new Date(a.scheduledAt).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'})+' at '+new Date(a.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'</div>' +
              '<div style="font-size:12px;color:var(--text-muted)">'+(a.facility&&a.facility.name||'')+'</div>' +
              (a.doctor?'<div style="font-size:12px;color:var(--text-muted)">Dr. '+(a.doctor.firstName||'')+' '+(a.doctor.lastName||'')+'</div>':'') +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;flex-wrap:wrap">' +
              '<span class="badge '+badge+'">'+a.status+'</span>' +
              (canAct?'<button class="btn btn-xs" onclick="_showReschedule(\''+a._id+'\',\''+a.visitType+'\',\''+new Date(a.scheduledAt).toISOString().slice(0,16)+'\')"><i class="ti ti-calendar-event"></i>Reschedule</button>':'') +
              (a.status==='confirmed'&&isToday?'<button class="btn btn-xs btn-green" onclick="_ciDirectCheckin(\''+a._id+'\')"><i class="ti ti-login"></i>Check in</button>':'') +
              (canAct?'<button class="btn btn-xs" style="color:var(--red);border-color:var(--red)" onclick="_showCancelAppt(\''+a._id+'\')"><i class="ti ti-x"></i>Cancel</button>':'') +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('') :
      '<div style="text-align:center;padding:32px;color:var(--text-muted)"><i class="ti ti-calendar-off" style="font-size:36px;opacity:.3;display:block;margin-bottom:10px"></i>No appointments found.<br><button class="btn btn-sm btn-green" onclick="Router.setPage(\'book\')" style="margin-top:12px"><i class="ti ti-plus"></i>Book now</button></div>';
    } catch(e) { if(wrap) wrap.innerHTML='<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>'+e.message+'</div>'; }
  }, 0);

  return '<div class="page-title">My appointments</div>' +
    '<div style="display:flex;justify-content:flex-end;margin-bottom:14px"><button class="btn btn-green" onclick="Router.setPage(\'book\')"><i class="ti ti-plus"></i>Book new visit</button></div>' +
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
/* ── Direct check-in from appointments list ── */
window._ciDirectCheckin = async function(apptId) {
  var btn = event && event.target && event.target.closest('button');
  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner" style="width:12px;height:12px"></div>'; }
  try {
    var p   = await _getMyPatientRecord();
    var u   = API.getStoredUser();
    var fid = (u&&(u.facilityId||u.facility)) || (p&&p.primaryFacility&&p.primaryFacility._id);
    if (!p || !fid) { UI.showToast('Could not find patient or facility record','err'); return; }

    /* ── Validate appointment is TODAY ── */
    var apptRes = await API._fetchDirect('/appointments/'+apptId, {method:'GET'});
    var appt    = apptRes && apptRes.data;
    if (!appt) { UI.showToast('Appointment not found','err'); return; }

    var apptDate = new Date(appt.scheduledAt);
    var today    = new Date();
    var isToday  = apptDate.getFullYear() === today.getFullYear() &&
                   apptDate.getMonth()    === today.getMonth()    &&
                   apptDate.getDate()     === today.getDate();

    if (!isToday) {
      var dateStr = apptDate.toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
      UI.showToast('Check-in is only available on the day of your appointment (' + dateStr + ')','err');
      if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-login"></i>Check in'; }
      return;
    }

    var res = await API._fetchDirect('/queue2/prebooked-checkin',{method:'POST',body:JSON.stringify({patientId:p._id,facilityId:fid,appointmentId:apptId})});
    if (res.doctorLate) UI.showToast('Note: Doctor running ~'+res.minutesLate+' min late','warn');
    if (res.data && res.data.token) await _ciSendTokenNotification(res.data);
    UI.showToast('Checked in! Your queue token is '+res.data.token,'ok');
    Router.setPage('checkin');
  } catch(e) {
    UI.showToast(e.message||'Check-in failed','err');
    if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-login"></i>Check in'; }
  }
};

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
            return '<div style="padding:12px;background:var(--green-light);border-radius:var(--radius);margin-bottom:8px">' +
              '<div style="font-weight:600;text-transform:capitalize">'+(a.visitType||'').replace('_',' ')+'</div>' +
              '<div style="font-size:12px;color:var(--text-muted);margin:4px 0">'+new Date(a.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+(a.facility?' · '+a.facility.name:'')+'</div>' +
              '<button class="btn btn-sm btn-green" style="margin-top:10px;width:100%" onclick="_ciPrebookedCI(\''+p._id+'\',\''+fid+'\',\''+a._id+'\')"><i class="ti ti-login"></i>Check in for this appointment</button>' +
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

window._ciPrebookedCI = async function(pid, fid, apptId) {
  var btn = event&&event.target&&event.target.closest('button');
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div> Checking in...';}
  try {
    var res = await API._fetchDirect('/queue2/prebooked-checkin',{method:'POST',body:JSON.stringify({patientId:pid,facilityId:fid,appointmentId:apptId})});
    if(res.doctorLate) UI.showToast('Note: Doctor running ~'+res.minutesLate+' min late','warn');
    if(res.data&&res.data.token) await _ciSendTokenNotification(res.data);
    Router.setPage('checkin');
  } catch(e){ UI.showToast(e.message||'Check-in failed','err'); if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-login"></i>Check in';} }
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
  var tokenBg = {emergency:'#E24B4A',priority:'#EF9F27',normal:'#4A6CF7',walkin:'#1D9E75'}[tok.tokenType]||'var(--green-dark)';
  var statusInfo = {
    waiting:          {bg:'var(--bg-surface)',c:'var(--amber)',ic:'ti-clock',msg:'Please wait — you will be called shortly'},
    called:           {bg:'var(--green-light)',c:'var(--green-dark)',ic:'ti-bell-ringing',msg:'Please proceed to the consultation room NOW'},
    in_consultation:  {bg:'var(--green-light)',c:'var(--green-dark)',ic:'ti-stethoscope',msg:'You are in consultation'},
    post_consultation:{bg:'var(--bg-surface)',c:'#4A6CF7',ic:'ti-checks',msg:'Consultation complete'},
    lab:              {bg:'#EEF2FF',c:'#4A6CF7',ic:'ti-flask',msg:'Please go to the Laboratory'},
    pharmacy:         {bg:'var(--green-light)',c:'var(--green-dark)',ic:'ti-pill',msg:'Please go to the Pharmacy'},
    completed:        {bg:'var(--green-light)',c:'var(--green-dark)',ic:'ti-circle-check',msg:'Your visit is complete. Thank you!'},
  }[tok.status]||{bg:'var(--bg-surface)',c:'var(--amber)',ic:'ti-clock',msg:'Please wait'};
  return '<div class="card"'+(tok.status==='called'?' style="border:2px solid var(--green)"':'')+' style="margin-bottom:14px;text-align:center">' +
    (tok.status==='called'?'<div style="background:var(--green);color:#fff;padding:12px;margin:-1px -1px 16px;border-radius:var(--radius-xl) var(--radius-xl) 0 0;font-weight:700;font-size:15px">🔔 IT\'S YOUR TURN</div>':'') +
    '<div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-hint);margin-bottom:4px">Your queue token</div>' +
    '<div style="font-size:76px;font-weight:900;color:'+tokenBg+';font-family:var(--mono);line-height:1;margin:4px 0">'+tok.token+'</div>' +
    '<div style="display:flex;justify-content:center;gap:32px;margin:14px 0">' +
      '<div><div style="font-size:28px;font-weight:800">'+(tok.aheadCount!=null?tok.aheadCount:'—')+'</div><div style="font-size:12px;color:var(--text-muted)">Ahead of you</div></div>' +
      '<div style="width:1px;background:var(--border)"></div>' +
      '<div><div style="font-size:28px;font-weight:800">'+(tok.estimatedWait!=null?tok.estimatedWait:'—')+'</div><div style="font-size:12px;color:var(--text-muted)">Est. wait (min)</div></div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:var(--radius);background:'+statusInfo.bg+';color:'+statusInfo.c+';font-weight:500;font-size:13px"><i class="ti '+statusInfo.ic+'"></i>'+statusInfo.msg+'</div>' +
    (tok.status==='completed'?
      '<div style="margin-top:12px"><div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">How was your experience?</div>' +
      '<div id="ci-star-row" style="display:flex;justify-content:center;gap:6px">' +
        [1,2,3,4,5].map(function(n){ return '<button onclick="_ciRate(\''+tok._id+'\','+n+')" style="font-size:30px;background:none;border:none;cursor:pointer;line-height:1">⭐</button>'; }).join('') +
      '</div><div id="ci-rate-thanks" style="display:none;color:var(--green-dark);font-weight:600">Thank you! ⭐</div></div>' : '') +
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
  var profUrl  = p&&p.profilePicture&&p.profilePicture.url ? 'http://localhost:5000'+p.profilePicture.url : null;
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
    var res=await fetch('http://localhost:5000/api/v1/patients/me/upload-id',{method:'POST',headers:{'Authorization':'Bearer '+token},body:form});
    var data=await res.json(); if(!data.success) throw new Error(data.message||'Upload failed');
    UI.showToast('ID document uploaded','ok');
    if(status) status.innerHTML='<div class="alert-box alert-ok" style="margin:0;font-size:12px"><i class="ti ti-check"></i>'+file.name+' uploaded</div>';
    setTimeout(function(){ Router.setPage('myprofile'); }, 1000);
  } catch(e){ UI.showToast(e.message||'Upload failed','err'); if(status) status.innerHTML='<div class="alert-box alert-danger" style="margin:0;font-size:12px">'+e.message+'</div>'; }
};

/* ══════════════════════════════════════════════════
   BOOK A VISIT — inline calendar (no overlay)
══════════════════════════════════════════════════ */
Pages['book'] = () => {
  window._BKC = { year: new Date().getFullYear(), month: new Date().getMonth(), selected: null, bookings: {} };

  setTimeout(function() {
    var FACS = [
      { id:'fac-chb',       name:'Chris Hani Baragwanath CHC', type:'hospital' },
      { id:'fac-soweto',    name:'Soweto Clinic',               type:'clinic'   },
      { id:'fac-bophelong', name:'Bophelong Clinic',            type:'clinic'   },
    ];
    (async function() {
      try {
        var r = await API._fetchDirect('/facilities', { method:'GET' });
        (r.data||[]).forEach(function(af) {
          FACS.forEach(function(hf,i) {
            if (af.name.toLowerCase().includes(hf.name.split(' ')[0].toLowerCase())) FACS[i].id = af._id;
          });
        });
      } catch(_) {}
      var sel = document.getElementById('bk-facility');
      if (sel) {
        sel.innerHTML = '<option value="">— Select facility —</option>' +
          FACS.map(function(f){ return '<option value="'+f.id+'" data-name="'+f.name+'" data-type="'+f.type+'">'+f.name+'</option>'; }).join('');
      }
    })();
    // Calendar drawn only when user clicks date field
  }, 0);

  return `
<div class="page-title">Book a visit</div>
<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:#EEF7FF;border-left:4px solid #4A9BD4;border-radius:10px;margin-bottom:16px;max-width:1000px;font-size:13px;color:#1A4A9B">
  <i class="ti ti-clock" style="font-size:16px;flex-shrink:0"></i>
  <span>Clinic hours: <strong>Mon–Fri 07:00–17:00</strong> &middot; <strong>Sat 07:00–13:00</strong> &middot; Same-day bookings need <strong>1 hour notice</strong>.</span>
</div>
<div style="display:grid;grid-template-columns:420px 1fr;gap:20px;max-width:1000px;align-items:start">

  <div class="card">
    <div class="card-title"><i class="ti ti-calendar-plus"></i>New appointment</div>
    <div class="f-group">
      <label class="f-label">VISIT TYPE</label>
      <select class="f-select" id="bk-type" style="margin:0" onchange="window._bkWarnSpecialist()">
        <option value="consultation">General Consultation</option>
        <option value="telemedicine">Telemedicine</option>
        <option value="lab">Lab / Blood Draw</option>
        <option value="immunisation">Immunisation</option>
        <option value="mental_health">Mental Health</option>
        <option value="follow_up">Chronic Care Follow-Up</option>
        <option value="maternal_child_health">Maternal &amp; Child Health</option>
        <option value="pharmacy_pickup">Pharmacy Pickup</option>
        <option value="specialist_referral">Specialist Referral</option>
        <option value="wellness">Wellness &amp; Preventive Care</option>
      </select>
    </div>
    <div id="bk-specialist-warn" style="display:none;margin-bottom:12px;padding:10px 14px;background:#FEF2F2;border-left:4px solid var(--red);border-radius:8px;font-size:13px;color:#991B1B">
      <i class="ti ti-alert-triangle"></i> Specialist Referral is only available at hospitals (Chris Hani Baragwanath CHC).
    </div>
    <div class="f-group">
      <label class="f-label">FACILITY</label>
      <select class="f-select" id="bk-facility" style="margin:0" onchange="window._bkWarnSpecialist();window._bkShowCal()">
        <option value="">Loading...</option>
      </select>
    </div>
    <div class="f-group">
      <label class="f-label">DATE &amp; TIME</label>
      <input type="hidden" id="bk-datetime">
      <div id="bk-selected-display"
        onclick="window._bkShowCal()"
        style="padding:11px 14px;border:1.5px solid var(--border);border-radius:var(--radius);font-size:13px;color:var(--text-muted);background:#fff;display:flex;align-items:center;gap:8px;cursor:pointer"
        onmouseover="this.style.borderColor='var(--green)'" onmouseout="if(!document.getElementById('bk-datetime').value)this.style.borderColor='var(--border)'">
        <i class="ti ti-calendar" style="font-size:16px;color:var(--green-dark);flex-shrink:0"></i>
        <span id="bk-selected-lbl">Click to open calendar</span>
        <i class="ti ti-chevron-down" style="font-size:12px;margin-left:auto;color:var(--text-hint)"></i>
      </div>
    </div>
    <button class="btn btn-green" id="bk-submit-btn" style="width:100%;padding:14px;font-size:14px;font-weight:700;margin-top:4px" onclick="window._bkSubmit()">
      <i class="ti ti-calendar-check"></i>Confirm booking
    </button>
    <div id="bk-alert" style="display:none;margin-top:10px;padding:10px 14px;background:#FEF2F2;border-left:4px solid var(--red);border-radius:8px;font-size:13px;color:#991B1B"></div>
    <div id="bk-success" style="display:none;margin-top:12px;padding:14px;background:#EDFBF3;border-radius:10px;border:1.5px solid var(--green)">
      <div style="font-weight:700;color:var(--green-dark);margin-bottom:8px"><i class="ti ti-circle-check"></i> Booking confirmed!</div>
      <div id="bk-success-detail" style="font-size:13px;color:var(--text-muted);margin-bottom:8px"></div>
      <div style="font-size:12px;padding:8px;background:#fff;border-radius:8px;margin-bottom:6px;color:var(--text-muted)"><i class="ti ti-device-mobile" style="color:var(--green-dark)"></i> SMS &amp; email confirmation sent.</div>
      <div style="font-size:12px;padding:8px;background:#FFF9E6;border-radius:8px;color:#7A5C10"><i class="ti ti-info-circle"></i> Queue token sent after you <strong>check in at the facility</strong>.</div>
    </div>
  </div>

  <div class="card" id="bk-cal-card" style="padding:20px;display:none">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <button onclick="window._bkCalNav(-1)" style="width:34px;height:34px;border:1.5px solid var(--border);border-radius:8px;background:none;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;color:var(--text-muted)">&#8249;</button>
      <strong id="bk-month-lbl" style="font-size:15px"></strong>
      <button onclick="window._bkCalNav(1)"  style="width:34px;height:34px;border:1.5px solid var(--border);border-radius:8px;background:none;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;color:var(--text-muted)">&#8250;</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);text-align:center;margin-bottom:4px">
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Su</div>
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Mo</div>
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Tu</div>
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">We</div>
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Th</div>
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Fr</div>
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Sa</div>
    </div>
    <div id="bk-day-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:14px;position:relative"></div>
    <div id="bk-slot-tip" style="display:none;position:absolute;background:var(--bg-card);border:1.5px solid var(--green);border-radius:10px;padding:10px 14px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:100;min-width:150px;font-size:12px;pointer-events:none">
      <div style="font-weight:700;color:var(--green-dark);margin-bottom:5px">Available slots:</div>
      <div id="bk-slot-list"></div>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:12px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.05em;margin-bottom:8px;text-transform:uppercase">Select time</div>
      <div style="display:flex;align-items:center;gap:8px">
        <input type="number" id="bk-t-h" value="8" min="1" max="12" style="width:56px;padding:9px;border:1.5px solid var(--border);border-radius:8px;text-align:center;font-size:16px;font-weight:700;font-family:inherit;outline:none" oninput="window._bkUpdLabel()" onfocus="this.select()">
        <span style="font-weight:700;font-size:20px">:</span>
        <select id="bk-t-m" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;outline:none" onchange="window._bkUpdLabel()">
          <option value="00">00</option><option value="30">30</option>
        </select>
        <select id="bk-t-ampm" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;outline:none" onchange="window._bkUpdLabel()">
          <option>AM</option><option>PM</option>
        </select>
      </div>
    </div>
    <div style="display:flex;gap:12px;font-size:12px;color:var(--text-muted)">
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#EDFBF3;border:1.5px solid #7ADAA8;margin-right:4px"></span>Available</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#FFF9E6;border:1.5px solid #F0D060;margin-right:4px"></span>Limited</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#FEF2F2;border:1.5px solid #E24B4A;margin-right:4px"></span>Fully booked</span>
    </div>
  </div>
</div>`;
};

/* ── Calendar & booking functions ── */
/* ── Toggle calendar when date field clicked ── */
window._bkShowCal = function() {
  var card = document.getElementById('bk-cal-card');
  if (!card) return;
  if (card.style.display === 'block') {
    /* Second click — hide calendar */
    card.style.display = 'none';
    return;
  }
  /* First click — show and load */
  card.style.display = 'block';
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  window._bkCalDraw();
  window._bkFetchBookings();
};

window._bkWarnSpecialist = function() {
  var type = (document.getElementById('bk-type')||{value:''}).value;
  var sel  = document.getElementById('bk-facility');
  var opt  = sel&&sel.selectedIndex>=0 ? sel.options[sel.selectedIndex] : null;
  var name = opt ? (opt.getAttribute('data-name')||opt.text||'') : '';
  var warn = document.getElementById('bk-specialist-warn'); if(!warn) return;
  var isClinic = ['soweto clinic','bophelong clinic'].some(function(c){ return name.toLowerCase().includes(c); });
  warn.style.display = (type==='specialist_referral'&&isClinic&&name) ? 'block' : 'none';
};

window._bkStatus = function(ds) {
  var d = new Date(ds+'T00:00:00'), day = d.getDay();
  if (day===0) return 'closed';
  // Only use real booking data — no fake/placeholder colours
  // _BKC.loaded is true once API has responded (even with 0 results)
  if (!window._BKC.loaded) return 'available'; // show all green until data loads
  var cnt = (window._BKC.bookings[ds]||0);
  var mx  = day===6 ? 10 : 20;
  if (cnt >= mx)        return 'full';
  if (cnt >= mx * 0.7)  return 'limited';
  return 'available';
};

window._bkSlots = function(ds) {
  var s = window._bkStatus(ds); if(s==='closed'||s==='full') return [];
  var all = new Date(ds+'T00:00:00').getDay()===6
    ? ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30']
    : ['07:00','07:30','08:00','09:00','10:00','10:30','11:00','11:30','12:00','13:00','14:00','15:00','16:00','16:30'];
  return s==='limited' ? all.filter(function(_,i){return i%3===0;}) : all;
};

window._bkCalDraw = function() {
  var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  var lbl=document.getElementById('bk-month-lbl'), grid=document.getElementById('bk-day-grid');
  if(!grid) return;
  if(lbl) lbl.textContent=MONTHS[window._BKC.month]+' '+window._BKC.year;
  var first=new Date(window._BKC.year,window._BKC.month,1).getDay();
  var days=new Date(window._BKC.year,window._BKC.month+1,0).getDate();
  var today=new Date(); today.setHours(0,0,0,0);
  var html='';
  for(var i=0;i<first;i++) html+='<div></div>';
  for(var d=1;d<=days;d++) {
    var dt=new Date(window._BKC.year,window._BKC.month,d); dt.setHours(0,0,0,0);
    var ds=window._BKC.year+'-'+String(window._BKC.month+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    var past=dt<today, isTd=dt.getTime()===today.getTime(), sel=window._BKC.selected===ds;
    var st=past?'past':window._bkStatus(ds), ok=!past&&st!=='closed'&&st!=='full';
    var bg='transparent',col='var(--text)',bdr='1px solid transparent',fw='400',cur='default';
    if(sel)                        {bg='var(--green-dark)';col='#fff';bdr='2px solid var(--green-dark)';fw='700';}
    else if(isTd&&ok)              {bg='#EDFBF3';bdr='2px solid var(--green)';}
    else if(st==='available'&&ok)  {bg='#EDFBF3';bdr='1.5px solid #7ADAA8';}
    else if(st==='limited'&&ok)    {bg='#FFF9E6';bdr='1.5px solid #F0D060';col='#7A5C10';}
    else if(st==='full')           {bg='#FEF2F2';bdr='1.5px solid rgba(226,75,74,.3)';col='#E24B4A';}
    else if(past||st==='closed')   {col='#ccc';}
    if(ok) cur='pointer';
    var ev=ok?' onclick="window._bkSelDate(\''+ds+'\')" onmouseenter="window._bkHover(event,\''+ds+'\')" onmouseleave="window._bkHideHover()"':'';
    html+='<div style="text-align:center;padding:8px 2px;border-radius:8px;background:'+bg+';color:'+col+';border:'+bdr+';font-weight:'+fw+';cursor:'+cur+';font-size:13px"'+ev+'>'+d+'</div>';
  }
  grid.innerHTML=html;
};

window._bkCalNav = function(dir) {
  window._BKC.month+=dir;
  if(window._BKC.month>11){window._BKC.month=0;window._BKC.year++;}
  if(window._BKC.month<0) {window._BKC.month=11;window._BKC.year--;}
  window._bkCalDraw(); window._bkFetchBookings();
};

window._bkSelDate = function(ds) {
  window._BKC.selected=ds; window._bkCalDraw(); window._bkUpdLabel();
};

window._bkHover = function(e, ds) {
  var slots=window._bkSlots(ds), tip=document.getElementById('bk-slot-tip'), list=document.getElementById('bk-slot-list');
  if(!tip||!list||!slots.length) return;
  list.innerHTML=slots.slice(0,3).map(function(s){return '<div style="color:var(--green-dark);font-weight:600;padding:2px 0">'+s+'</div>';}).join('')+(slots.length>3?'<div style="color:var(--text-muted);margin-top:3px">+'+(slots.length-3)+' more</div>':'');
  var el=e.currentTarget||e.target, r=el.getBoundingClientRect(), gr=document.getElementById('bk-day-grid');
  if(gr){var g=gr.getBoundingClientRect();tip.style.left=(r.left-g.left)+'px';tip.style.top=(r.bottom-g.top+4)+'px';}
  tip.style.display='block';
};
window._bkHideHover = function(){ var t=document.getElementById('bk-slot-tip'); if(t) t.style.display='none'; };

window._bkUpdLabel = function() {
  if(!window._BKC.selected) return;
  var h=parseInt((document.getElementById('bk-t-h')||{value:'8'}).value)||8;
  var m=(document.getElementById('bk-t-m')||{value:'00'}).value;
  var ap=(document.getElementById('bk-t-ampm')||{value:'AM'}).value;
  var h24=ap==='PM'&&h<12?h+12:(ap==='AM'&&h===12?0:h);
  var dtVal=window._BKC.selected+'T'+String(h24).padStart(2,'0')+':'+m;
  var inp=document.getElementById('bk-datetime'); if(inp) inp.value=dtVal;
  var d=new Date(dtVal);
  var disp=d.toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'})+' at '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  var lbl=document.getElementById('bk-selected-lbl'), box=document.getElementById('bk-selected-display');
  if(lbl){lbl.textContent=disp;lbl.style.color='var(--text)';}
  if(box) box.style.borderColor='var(--green)';
};

window._bkFetchBookings = async function() {
  try {
    var fid=(document.getElementById('bk-facility')||{value:''}).value; if(!fid) return;
    var type=(document.getElementById('bk-type')||{value:''}).value;
    var start=new Date(window._BKC.year,window._BKC.month,1).toISOString();
    var end=new Date(window._BKC.year,window._BKC.month+1,0,23,59).toISOString();
    var res=await API._fetchDirect('/appointments?facility='+fid+(type?'&visitType='+type:'')+'&from='+encodeURIComponent(start)+'&to='+encodeURIComponent(end)+'&limit=300',{method:'GET'});
    window._BKC.bookings={};
    (res.data||[]).filter(function(a){return !['cancelled','no_show'].includes(a.status);}).forEach(function(a){
      var d=new Date(a.scheduledAt);
      var k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      window._BKC.bookings[k]=(window._BKC.bookings[k]||0)+1;
    });
    window._BKC.loaded = true;
    window._bkCalDraw();
  } catch(_) {
    // Even on error, mark loaded so we don't keep showing spinner state
    window._BKC.loaded = true;
    window._bkCalDraw();
  }
};

window._bkSubmit = async function() {
  var facSel=document.getElementById('bk-facility'), facility=facSel?facSel.value:'';
  var opt=facSel&&facSel.selectedIndex>=0?facSel.options[facSel.selectedIndex]:null;
  var facName=opt?(opt.getAttribute('data-name')||opt.text||''):'';
  var type=(document.getElementById('bk-type')||{value:''}).value;
  var dt=(document.getElementById('bk-datetime')||{value:''}).value;
  var al=document.getElementById('bk-alert'), btn=document.getElementById('bk-submit-btn');
  function showErr(msg){if(!al)return;al.innerHTML='<i class="ti ti-alert-circle"></i> '+msg;al.style.display='block';}
  if(al) al.style.display='none';
  if(!facility){showErr('Please select a facility.');return;}
  if(!dt){showErr('Please click a date on the calendar first.');return;}
  var dtObj=new Date(dt),day=dtObj.getDay(),mins=dtObj.getHours()*60+dtObj.getMinutes();
  if(day===0){showErr('Clinic closed on Sundays.');return;}
  if(day>=1&&day<=5&&mins<420){showErr('Clinic opens at 07:00 on weekdays.');return;}
  if(day>=1&&day<=5&&mins>=1020){showErr('Clinic closes at 17:00 on weekdays.');return;}
  if(day===6&&mins<420){showErr('Clinic opens at 07:00 on Saturdays.');return;}
  if(day===6&&mins>=780){showErr('Clinic closes at 13:00 on Saturdays.');return;}
  if(dtObj<=new Date()){showErr('Please select a future date and time.');return;}
  if(type==='specialist_referral'&&['soweto clinic','bophelong clinic'].some(function(c){return facName.toLowerCase().includes(c);})){showErr('Specialist Referral only available at hospitals.');return;}
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:16px;height:16px"></div> Booking...';}
  try {
    var p=await _getMyPatientRecord(); if(!p){showErr('Patient record not found.');return;}
    var labels={consultation:'General Consultation',telemedicine:'Telemedicine',lab:'Lab / Blood Draw',immunisation:'Immunisation',mental_health:'Mental Health',follow_up:'Chronic Care Follow-Up',maternal_child_health:'Maternal & Child Health',pharmacy_pickup:'Pharmacy Pickup',specialist_referral:'Specialist Referral',wellness:'Wellness & Preventive Care'};
    var typeLabel=labels[type]||type;
    var dateStr=dtObj.toLocaleDateString('en-ZA',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    var timeStr=dtObj.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    await API.appointments.create({patient:p._id,facility:facility,visitType:type,scheduledAt:dtObj.toISOString(),facilityName:facName});
    if(p.phone) API._fetchDirect('/notifications/sms',{method:'POST',body:JSON.stringify({to:p.phone,message:'NIHMS: '+typeLabel+' at '+facName+' confirmed for '+dateStr+' at '+timeStr+'. Check in at the facility to receive your queue number.'})}).catch(function(){});
    if(p.email) API._fetchDirect('/notifications/email',{method:'POST',body:JSON.stringify({to:p.email,subject:'NIHMS Appointment Confirmed — '+typeLabel,html:'<div style="font-family:Arial;max-width:520px;margin:0 auto"><div style="background:linear-gradient(135deg,#0F6E56,#1A4A9B);padding:20px;border-radius:10px 10px 0 0;text-align:center"><h2 style="color:#fff;margin:0">Appointment Confirmed</h2></div><div style="padding:24px;background:#f9f9f9;border-radius:0 0 10px 10px"><p>Dear '+p.firstName+' '+p.lastName+',</p><table style="width:100%;border-collapse:collapse;margin:12px 0"><tr><td style="padding:8px;border:1px solid #ddd;background:#f0f0f0;font-weight:600">Visit type</td><td style="padding:8px;border:1px solid #ddd">'+typeLabel+'</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f0f0f0;font-weight:600">Facility</td><td style="padding:8px;border:1px solid #ddd">'+facName+'</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f0f0f0;font-weight:600">Date &amp; time</td><td style="padding:8px;border:1px solid #ddd">'+dateStr+' at '+timeStr+'</td></tr></table><div style="padding:12px;background:#FFF9E6;border-radius:8px;font-size:13px;color:#7A5C10">Your queue number will be sent after you check in at the facility.</div></div></div>'})}).catch(function(){});
    var sd=document.getElementById('bk-success-detail'),sc=document.getElementById('bk-success');
    if(sd) sd.innerHTML='<strong>'+typeLabel+'</strong> at '+facName+'<br>'+dateStr+' at '+timeStr;
    if(sc){sc.style.display='block';sc.scrollIntoView({behavior:'smooth',block:'nearest'});}
    if(btn){btn.disabled=true;btn.style.opacity='0.5';}
    setTimeout(function(){Router.setPage('appointments');},3500);
  } catch(e){
    showErr(e.message||'Booking failed. Please try again.');
    if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-calendar-check"></i>Confirm booking';}
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
