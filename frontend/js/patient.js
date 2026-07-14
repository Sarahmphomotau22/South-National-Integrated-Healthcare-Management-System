/**
 * js/pages/patient.js
 * Patient portal — myhealth, myrecords, appointments, checkin, billing, myprofile
 */
if (typeof Pages === 'undefined') window.Pages = {};

/* ── Shared patient helper ── */
async function _getMyPatientRecord() {
  try {
    const res = await API._fetchDirect('/patients/me', { method: 'GET' });
    return res?.data || null;
  } catch (_) { return null; }
}

/* ══════════════════════════════════════════════════
   MY HEALTH (overview)
══════════════════════════════════════════════════ */
Pages['myhealth'] = () => {
  if (window._mhInt) clearInterval(window._mhInt);
  setTimeout(_mhLoad, 0);
  window._mhInt = setInterval(_mhLoad, 30000);
  return `
<div id="mh-alerts"></div>
<div class="page-title">My health overview</div>
<div id="mh-body" style="color:var(--text-muted)">Loading…</div>`;
};

async function _mhLoad() {
  const wrap = document.getElementById('mh-body');
  if (!wrap) return;

  // ── Facility alerts from receptionist ──
  try {
    const u   = API.getStoredUser();
    const fid = u?.facilityId || u?.facility;
    const all = JSON.parse(localStorage.getItem('nihms_facility_alerts') || '[]');
    const cutoff = Date.now() - 4 * 3600000;
    const alerts = all.filter(a => a.facilityId === fid && new Date(a.time).getTime() > cutoff);
    const alertEl = document.getElementById('mh-alerts');
    if (alertEl && alerts.length) {
      const styleMap = {
        general:     { bg:'#EEF2FF', border:'#4A6CF7', ic:'ti-speakerphone', c:'#1A4A9B', label:'Facility Announcement' },
        delay:       { bg:'#FFFBEB', border:'#D97706', ic:'ti-clock-exclamation', c:'#92400E', label:'Delay Notice' },
        emergency:   { bg:'#FEF2F2', border:'#E24B4A', ic:'ti-urgent', c:'#991B1B', label:'Emergency Alert' },
        maintenance: { bg:'var(--bg-surface)', border:'#888', ic:'ti-tool', c:'#555', label:'Maintenance Notice' },
      };
      alertEl.innerHTML = alerts.map(a => {
        const s = styleMap[a.type] || styleMap.general;
        return `<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;margin-bottom:8px;border-radius:10px;background:${s.bg};border-left:4px solid ${s.border}">
          <i class="ti ${s.ic}" style="font-size:18px;color:${s.border};flex-shrink:0;margin-top:1px"></i>
          <div style="flex:1">
            <div style="font-weight:700;font-size:13px;color:${s.c}">${s.label}</div>
            <div style="font-size:13px;color:${s.c};margin-top:2px">${a.msg}</div>
            <div style="font-size:11px;color:${s.border};opacity:.7;margin-top:4px">
              ${new Date(a.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · ${new Date(a.time).toLocaleDateString('en-ZA')}
            </div>
          </div>
          <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:${s.border};font-size:16px;flex-shrink:0;line-height:1"><i class="ti ti-x"></i></button>
        </div>`;
      }).join('');
    }
  } catch (_) {}

  try {
    const p = await _getMyPatientRecord();
    if (!p) {
      wrap.innerHTML = `<div class="alert-box alert-warn"><i class="ti ti-alert-triangle"></i>
        Please complete your profile to use patient features.
        <button class="btn btn-sm btn-green" style="margin-left:8px" onclick="Router.setPage('myprofile')">
          <i class="ti ti-user"></i>Go to profile
        </button></div>`;
      return;
    }

    const [qRes, apptRes] = await Promise.allSettled([
      API._fetchDirect(`/queue2/my-token?patientId=${p._id}&facilityId=${p.primaryFacility?._id || API.getStoredUser()?.facilityId}`, {method:'GET'}),
      API.appointments.list({ patient: p._id, limit: 10 })
    ]);

    const qTok  = qRes.value?.data;
    const appts = apptRes.value?.data || [];
    const now   = new Date();
    const todayStr = now.toDateString();
    const upcoming = appts
      .filter(a => new Date(a.scheduledAt) > now && ['confirmed','pending'].includes(a.status))
      .sort((a,b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    const nextAppt = upcoming[0];

    const v = p.latestVitals || {};
    const initials = ((p.firstName||'U')[0]+(p.lastName||'S')[0]).toUpperCase();
    const profUrl  = p.profilePicture?.url ? 'http://localhost:5000'+p.profilePicture.url : null;

    // ── Update topbar avatar with profile picture + make it clickable ──
    const avatarEl = document.getElementById('topbar-avatar');
    if (avatarEl) {
      if (profUrl) {
        avatarEl.innerHTML = '<img src="'+profUrl+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%"><input type="file" id="avatar-file-input" accept=".jpg,.jpeg,.png" style="display:none" onchange="_uploadAvatarFromTopbar(this)">';
        avatarEl.style.padding = '0';
        avatarEl.style.overflow = 'hidden';
      } else {
        avatarEl.innerHTML = initials + '<input type="file" id="avatar-file-input" accept=".jpg,.jpeg,.png" style="display:none" onchange="_uploadAvatarFromTopbar(this)">';
        avatarEl.style.padding = '';
        avatarEl.style.overflow = '';
      }
      // Make avatar clickable to change photo
      avatarEl.style.cursor = 'pointer';
      avatarEl.title = 'Click to change profile picture';
      avatarEl.onclick = function() { document.getElementById('avatar-file-input')?.click(); };
    }

    const tokenBg = {emergency:'#E24B4A',priority:'#EF9F27',normal:'#4A6CF7',walkin:'#1D9E75'}[qTok?.tokenType] || 'var(--green-dark)';
    const tokenStatusMsg = {
      waiting:          'Please wait — you will be called shortly',
      called:           'IT\'S YOUR TURN — proceed to the consultation room',
      in_consultation:  'You are currently in consultation',
      post_consultation:'Consultation complete — check routing below',
      lab:              'Please go to the Laboratory',
      pharmacy:         'Please collect your medication from the Pharmacy',
      completed:        'Your visit is complete. Thank you!'
    }[qTok?.status] || 'Please wait';

    wrap.innerHTML = `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
  <!-- Patient card -->
  <div class="card" style="display:flex;align-items:center;gap:14px">
    <div style="width:60px;height:60px;border-radius:50%;background:${profUrl?'transparent':'var(--green-light)'};overflow:hidden;flex-shrink:0;border:3px solid var(--green-light)">
      ${profUrl
        ? `<img src="${profUrl}" style="width:100%;height:100%;object-fit:cover">`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;color:var(--green-dark)">${initials}</div>`}
    </div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;font-size:16px">${p.firstName} ${p.lastName}</div>
      <div style="font-size:12px;color:var(--text-muted)">MRN: ${p.mrn||'—'} · ${p.age||'?'}y · ${p.gender||'—'}</div>
      <div style="font-size:12px;color:var(--text-muted)">ID: ${p.nationalId||'—'}</div>
      ${(p.allergies||[]).length ? `<div style="margin-top:4px"><span class="badge badge-red" style="font-size:10px"><i class="ti ti-alert-triangle" style="font-size:10px"></i> Allergy: ${p.allergies.join(', ')}</span></div>` : ''}
    </div>
    <button class="btn btn-xs" onclick="Router.setPage('myprofile')"><i class="ti ti-edit"></i>Edit</button>
  </div>

  <!-- Vitals card -->
  <div class="card">
    <div class="card-title"><i class="ti ti-heart-rate-monitor"></i>Latest vitals</div>
    ${v.bp || v.heartRate || v.temperature ? `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:13px">
      <div style="text-align:center;padding:8px;background:var(--bg-surface);border-radius:8px">
        <div style="font-size:18px;font-weight:700;color:${v.bp?.systolic>140?'var(--red)':'var(--text)'}">${v.bp?`${v.bp.systolic}/${v.bp.diastolic}`:'—'}</div>
        <div style="font-size:10px;color:var(--text-muted)">BP mmHg</div>
      </div>
      <div style="text-align:center;padding:8px;background:var(--bg-surface);border-radius:8px">
        <div style="font-size:18px;font-weight:700">${v.heartRate||'—'}</div>
        <div style="font-size:10px;color:var(--text-muted)">Pulse bpm</div>
      </div>
      <div style="text-align:center;padding:8px;background:var(--bg-surface);border-radius:8px">
        <div style="font-size:18px;font-weight:700">${v.temperature||'—'}${v.temperature?'°C':''}</div>
        <div style="font-size:10px;color:var(--text-muted)">Temp</div>
      </div>
    </div>` : `<div style="color:var(--text-muted);font-size:13px">No vitals recorded yet</div>`}
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
  <!-- Queue token -->
  <div class="card" ${qTok?.status==='called'?'style="border:2px solid var(--green)"':''}>
    <div class="card-title"><i class="ti ti-list-numbers"></i>Queue status</div>
    ${qTok && !['completed','cancelled','skipped'].includes(qTok.status) ? `
      ${qTok.status==='called' ? `<div style="padding:8px 12px;background:var(--green);color:#fff;border-radius:8px;font-weight:700;font-size:13px;margin-bottom:10px;text-align:center">🔔 IT'S YOUR TURN</div>` : ''}
      <div style="text-align:center;padding:12px 0">
        <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-hint)">Your token</div>
        <div style="font-size:64px;font-weight:900;font-family:var(--mono);color:${tokenBg};line-height:1.1">${qTok.token}</div>
        <div style="display:flex;justify-content:center;gap:24px;margin:10px 0;font-size:13px">
          <div><strong style="font-size:20px">${qTok.aheadCount??'—'}</strong><br><span style="color:var(--text-muted)">ahead</span></div>
          <div><strong style="font-size:20px">${qTok.estimatedWait??'—'}</strong><br><span style="color:var(--text-muted)">min wait</span></div>
        </div>
        <div style="font-size:12px;color:var(--text-muted)">${tokenStatusMsg}</div>
      </div>
      ${['lab','pharmacy'].includes(qTok.status) ? `
      <div class="alert-box ${qTok.status==='lab'?'alert-info':'alert-ok'}" style="margin-top:8px">
        <i class="ti ti-${qTok.status==='lab'?'flask':'pill'}"></i>
        Please go to the <strong>${qTok.status==='lab'?'Laboratory':'Pharmacy'}</strong>
      </div>` : ''}
      ${qTok.status==='completed' ? `
      <div style="text-align:center;margin-top:8px">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">How was your experience?</div>
        <div style="display:flex;justify-content:center;gap:4px" id="mh-stars">
          ${[1,2,3,4,5].map(n=>`<button onclick="_mhRate('${qTok._id}',${n})" style="font-size:24px;background:none;border:none;cursor:pointer" title="${n} stars">${n<=2?'⭐':'⭐'.repeat(1)}</button>`).join('')}
        </div>
      </div>` : ''}` : `
      <div style="text-align:center;padding:16px;color:var(--text-muted)">
        <i class="ti ti-checks" style="font-size:32px;opacity:.25;display:block;margin-bottom:8px"></i>
        Not in queue today
      </div>
      <button class="btn btn-green" style="width:100%" onclick="Router.setPage('checkin')">
        <i class="ti ti-login"></i>Check in to queue
      </button>`}
  </div>

  <!-- Next appointment -->
  <div class="card">
    <div class="card-title"><i class="ti ti-calendar-event"></i>Next appointment</div>
    ${nextAppt ? `
    <div style="padding:12px;background:${new Date(nextAppt.scheduledAt).toDateString()===todayStr?'var(--green-light)':'var(--bg-surface)'};border-radius:10px;border:1.5px solid ${new Date(nextAppt.scheduledAt).toDateString()===todayStr?'var(--green)':'var(--border)'}">
      ${new Date(nextAppt.scheduledAt).toDateString()===todayStr?`<div style="font-size:11px;font-weight:700;color:var(--green-dark);margin-bottom:6px">📅 TODAY</div>`:''}
      <div style="font-weight:600;font-size:14px;text-transform:capitalize;margin-bottom:4px">
        <i class="ti ti-${nextAppt.visitType==='telemedicine'?'video':'stethoscope'}" style="font-size:13px;margin-right:4px"></i>
        ${(nextAppt.visitType||'').replace('_',' ')}
      </div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:2px">${nextAppt.reason||'No reason specified'}</div>
      <div style="font-size:12px;color:var(--text-muted)">
        ${new Date(nextAppt.scheduledAt).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
        at ${new Date(nextAppt.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
      </div>
      <div style="font-size:12px;color:var(--text-muted)">${nextAppt.facility?.name||''}</div>
      ${nextAppt.queueToken?`<div style="font-family:var(--mono);font-weight:700;color:var(--green-dark);font-size:14px;margin-top:6px">Token: ${nextAppt.queueToken}</div>`:''}
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
        ${nextAppt.visitType==='telemedicine'?`<button class="btn btn-sm btn-green" onclick="Router.setPage('telemedicine')"><i class="ti ti-video"></i>Join session</button>`:''}
        <button class="btn btn-sm" onclick="Router.setPage('checkin')"><i class="ti ti-login"></i>Check in</button>
        <button class="btn btn-sm" onclick="Router.setPage('appointments')"><i class="ti ti-calendar"></i>All appointments</button>
      </div>
    </div>` : `
    <div style="text-align:center;padding:16px;color:var(--text-muted)">
      <i class="ti ti-calendar-off" style="font-size:32px;opacity:.25;display:block;margin-bottom:8px"></i>No upcoming appointments
    </div>
    <button class="btn btn-green" style="width:100%" onclick="Router.setPage('appointments')">
      <i class="ti ti-plus"></i>Book an appointment
    </button>`}
  </div>
</div>`;
  } catch (e) {
    if (wrap) wrap.innerHTML = `<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`;
  }
}

window._mhRate = async (id, rating) => {
  try {
    await API._fetchDirect(`/queue2/${id}/feedback`, {method:'POST', body:JSON.stringify({satisfaction:rating})});
    const el = document.getElementById('mh-stars');
    if (el) el.innerHTML = '<div style="color:var(--green-dark);font-weight:600">⭐ Thank you for your feedback!</div>';
  } catch (_) { UI.showToast('Feedback failed','err'); }
};

/* ══════════════════════════════════════════════════
   MY RECORDS
══════════════════════════════════════════════════ */
Pages['myrecords'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('rec-body');
    if (!wrap) return;
    try {
      const p = await _getMyPatientRecord();
      if (!p) { wrap.innerHTML='<div class="alert-box alert-warn">Please complete your profile first.</div>'; return; }

      const [labRes, rxRes] = await Promise.allSettled([
        API.labs.list({ patient: p._id, limit: 20 }),
        API.prescriptions.list({ patient: p._id, limit: 20 })
      ]);

      const labs = labRes.value?.data || [];
      const rxs  = rxRes.value?.data  || [];

      wrap.innerHTML = `
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
  <!-- Lab results -->
  <div class="card">
    <div class="card-title"><i class="ti ti-flask"></i>Lab results</div>
    ${labs.length ? labs.map(l => {
      const hasCrit = (l.tests||[]).some(t=>t.flag==='critical');
      return `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
          <div>
            <div style="font-weight:600;font-size:13px">${(l.tests||[]).map(t=>t.name).join(', ')}</div>
            <div style="font-size:11px;color:var(--text-muted)">${new Date(l.createdAt).toLocaleDateString('en-ZA')} · ${l.priority||'routine'}</div>
          </div>
          <span class="badge ${l.status==='ready'||l.status==='collected'?'badge-green':l.status==='in_lab'||l.status==='processing'?'badge-blue':'badge-amber'}">${l.status}</span>
        </div>
        ${hasCrit?`<div style="padding:4px 8px;background:#FEF2F2;border-radius:6px;font-size:11px;color:var(--red);font-weight:600">⚠️ Critical result — contact your doctor</div>`:''}
        ${(l.tests||[]).filter(t=>t.result).map(t=>`<div style="font-size:12px;color:var(--text-muted)">${t.name}: <strong>${t.result}</strong>${t.referenceRange?` (ref: ${t.referenceRange})`:''}${t.flag&&t.flag!=='normal'?` <span style="color:var(--red)">[${t.flag}]</span>`:''}</div>`).join('')}
      </div>`;
    }).join('') : '<div style="color:var(--text-muted);font-size:13px">No lab results on record</div>'}
  </div>

  <!-- Prescriptions -->
  <div class="card">
    <div class="card-title"><i class="ti ti-pill"></i>Prescriptions</div>
    ${rxs.length ? rxs.map(r => `
      <div style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
          <div style="font-weight:600;font-size:13px">${(r.lines||[]).map(l=>l.medicationName).join(', ')}</div>
          <span class="badge ${r.status==='dispensed'?'badge-green':r.status==='pending'?'badge-amber':'badge-gray'}">${r.status}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted)">
          Dr. ${r.prescribedBy?.firstName||'—'} ${r.prescribedBy?.lastName||''}
          · ${new Date(r.createdAt).toLocaleDateString('en-ZA')}
        </div>
        ${(r.lines||[]).map(l=>`<div style="font-size:12px;color:var(--text-muted)">• ${l.medicationName} — ${l.dosage} · ${l.durationDays||'?'} days</div>`).join('')}
      </div>`).join('') : '<div style="color:var(--text-muted);font-size:13px">No prescriptions on record</div>'}
  </div>
</div>`;
    } catch (e) {
      if (wrap) wrap.innerHTML = `<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`;
    }
  }, 0);

  return `
<div class="page-title">My medical records</div>
<div id="rec-body" style="color:var(--text-muted)">Loading…</div>`;
};

/* ══════════════════════════════════════════════════
   APPOINTMENTS
══════════════════════════════════════════════════ */
Pages['appointments'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('appt-list');
    if (!wrap) return;
    try {
      const p = await _getMyPatientRecord();
      if (!p) { wrap.innerHTML='<p style="color:var(--text-muted)">Please complete your profile first.</p>'; return; }

      const res   = await API.appointments.list({ patient: p._id, limit: 30 });
      const items = (res.data||[]).sort((a,b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
      const now   = new Date();

      wrap.innerHTML = items.length ? items.map(a => {
        const badge    = {confirmed:'badge-green',pending:'badge-amber',completed:'badge-green',cancelled:'badge-gray',no_show:'badge-red'}[a.status]||'badge-gray';
        const isFuture = new Date(a.scheduledAt) > now;
        const canAct   = ['pending','confirmed'].includes(a.status) && isFuture;
        const isTele   = a.visitType === 'telemedicine';
        const isToday  = new Date(a.scheduledAt).toDateString() === now.toDateString();

        return `<div style="padding:14px 0;border-bottom:1px solid var(--border)${isToday?';background:var(--green-light);margin:0 -4px;padding-left:4px;padding-right:4px;border-radius:8px':''}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
            <div style="flex:1;min-width:0">
              ${isToday?`<div style="font-size:11px;font-weight:700;color:var(--green-dark);margin-bottom:4px">📅 TODAY</div>`:''}
              <div style="font-weight:600;font-size:13px;text-transform:capitalize;margin-bottom:2px">
                <i class="ti ti-${isTele?'video':'stethoscope'}" style="font-size:13px;margin-right:5px"></i>
                ${(a.visitType||'').replace('_',' ')} — ${a.reason||'No reason specified'}
              </div>
              <div style="font-size:12px;color:var(--text-muted)">${a.facility?.name||'Facility'}</div>
              <div style="font-size:12px;color:var(--text-muted)">
                ${new Date(a.scheduledAt).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
                at ${new Date(a.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                · Token: <strong style="font-family:var(--mono)">${a.queueToken||'—'}</strong>
              </div>
              ${a.doctor?`<div style="font-size:12px;color:var(--text-muted)">Dr. ${a.doctor.firstName||''} ${a.doctor.lastName||''}</div>`:''}
              ${a.rescheduleReason?`<div style="font-size:11px;color:var(--text-hint);margin-top:2px"><i class="ti ti-arrow-right" style="font-size:11px"></i> Rescheduled: ${a.rescheduleReason}</div>`:''}
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;flex-wrap:wrap">
              <span class="badge ${badge}">${a.status}</span>
              ${isTele && canAct ? `<button class="btn btn-xs btn-green" onclick="Router.setPage('telemedicine')"><i class="ti ti-video"></i>Join</button>` : ''}
              ${canAct ? `
                <button class="btn btn-xs" onclick="_showReschedule('${a._id}','${a.visitType}','${new Date(a.scheduledAt).toISOString().slice(0,16)}')">
                  <i class="ti ti-calendar-event"></i>Reschedule
                </button>
                <button class="btn btn-xs" style="color:var(--red);border-color:var(--red-mid)" onclick="_showCancelAppt('${a._id}')">
                  <i class="ti ti-x"></i>Cancel
                </button>` : ''}
              ${isToday && a.status==='confirmed' ? `<button class="btn btn-xs btn-green" onclick="Router.setPage('checkin')"><i class="ti ti-login"></i>Check in</button>` : ''}
            </div>
          </div>
        </div>`;
      }).join('') : `<div style="text-align:center;padding:32px;color:var(--text-muted)">
        <i class="ti ti-calendar-off" style="font-size:36px;opacity:.3;display:block;margin-bottom:10px"></i>
        No appointments found.
        <br><button class="btn btn-sm btn-green" onclick="Router.setPage('appointments')" style="margin-top:12px"><i class="ti ti-plus"></i>Book now</button>
      </div>`;

    } catch (e) {
      if (wrap) wrap.innerHTML = `<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`;
    }
  }, 0);

  return `
<div class="page-title">My appointments</div>
<div style="display:flex;justify-content:flex-end;margin-bottom:14px">
  <button class="btn btn-green" onclick="Router.setPage('book')"><i class="ti ti-plus"></i>Book new visit</button>
</div>
<div class="card">
  <div class="card-title"><i class="ti ti-calendar"></i>All appointments</div>
  <div id="appt-list" style="color:var(--text-muted);padding:16px">Loading…</div>
</div>

<!-- Reschedule modal -->
<div id="reschedule-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:center;justify-content:center">
  <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:460px;max-width:95vw;box-shadow:var(--shadow-md)">
    <div style="font-size:16px;font-weight:600;margin-bottom:4px">Reschedule appointment</div>
    <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Change the date, time, or appointment type</div>
    <div class="f-group"><label class="f-label">New date & time *</label>
      <input type="datetime-local" class="f-input" id="rs-datetime" style="margin:0">
    </div>
    <div class="f-group" style="margin-top:12px"><label class="f-label">Change appointment type</label>
      <select class="f-select" id="rs-type" style="margin:0">
        <option value="consultation">General consultation (in-person)</option>
        <option value="telemedicine">Telemedicine (video call)</option>
        <option value="lab">Lab / blood draw</option>
        <option value="immunisation">Immunisation</option>
        <option value="mental_health">Mental health</option>
      </select>
    </div>
    <div class="f-group" style="margin-top:12px"><label class="f-label">Reason for rescheduling *</label>
      <select class="f-select" id="rs-reason-sel" style="margin:0" onchange="_toggleRsOther(this.value)">
        <option value="">— Select reason —</option>
        <option value="Personal emergency">Personal emergency</option>
        <option value="Transport issue">Transport issue</option>
        <option value="Work commitment">Work commitment</option>
        <option value="Feeling better">Feeling better</option>
        <option value="Doctor unavailable">Doctor unavailable</option>
        <option value="Prefer telemedicine">Prefer telemedicine instead</option>
        <option value="Prefer in-person">Prefer in-person instead</option>
        <option value="other">Other (specify)</option>
      </select>
      <input class="f-input" id="rs-reason-other" placeholder="Please specify reason…" style="margin-top:8px;display:none">
    </div>
    <div id="rs-alert" class="alert hidden" style="margin-bottom:10px"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-green" id="rs-submit-btn" onclick="_submitReschedule()">
        <i class="ti ti-calendar-check"></i>Confirm reschedule
      </button>
      <button class="btn" onclick="document.getElementById('reschedule-modal').style.display='none'">Cancel</button>
    </div>
  </div>
</div>

<!-- Cancel modal -->
<div id="cancel-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:500;align-items:center;justify-content:center">
  <div style="background:var(--bg-card);border-radius:var(--radius-xl);padding:24px;width:420px;max-width:95vw;box-shadow:var(--shadow-md)">
    <div style="font-size:16px;font-weight:600;margin-bottom:4px">Cancel appointment</div>
    <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Please provide a reason — the doctor will be notified.</div>
    <div class="f-group"><label class="f-label">Reason for cancellation</label>
      <select class="f-select" id="cancel-reason-sel" style="margin:0" onchange="_toggleCancelOther(this.value)">
        <option value="">— Select reason —</option>
        <option value="Personal emergency">Personal emergency</option>
        <option value="Feeling better">Feeling better, no longer needed</option>
        <option value="Transport issue">Cannot travel today</option>
        <option value="Work commitment">Work commitment</option>
        <option value="Want to reschedule">Want to reschedule instead</option>
        <option value="other">Other (specify)</option>
      </select>
      <input class="f-input" id="cancel-reason-other" placeholder="Please specify…" style="margin-top:8px;display:none">
    </div>
    <div class="alert-box alert-warn" style="margin-bottom:12px">
      <i class="ti ti-alert-triangle"></i>This cannot be undone. The doctor will be notified.
    </div>
    <div id="cancel-alert" class="alert hidden" style="margin-bottom:10px"></div>
    <div style="display:flex;gap:8px">
      <button class="btn" style="background:var(--red);border-color:var(--red);color:#fff" id="cancel-submit-btn" onclick="_submitCancelAppt()">
        <i class="ti ti-x"></i>Yes, cancel appointment
      </button>
      <button class="btn" onclick="document.getElementById('cancel-modal').style.display='none'">Keep appointment</button>
    </div>
  </div>
</div>`;
};

let _rsApptId = null, _cancelApptId = null;

window._showReschedule = (id, currentType, currentDatetime) => {
  _rsApptId = id;
  const dtEl = document.getElementById('rs-datetime');
  const typeEl = document.getElementById('rs-type');
  if (dtEl) { dtEl.value = currentDatetime; dtEl.min = new Date(Date.now()+60000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16); }
  if (typeEl) typeEl.value = currentType || 'consultation';
  const al = document.getElementById('rs-alert'); if (al) al.classList.add('hidden');
  document.getElementById('reschedule-modal').style.display = 'flex';
};
window._toggleRsOther = (v) => { const el=document.getElementById('rs-reason-other'); if(el) el.style.display=v==='other'?'block':'none'; };
window._submitReschedule = async () => {
  const dt=document.getElementById('rs-datetime')?.value, type=document.getElementById('rs-type')?.value;
  const rSel=document.getElementById('rs-reason-sel')?.value, rOth=document.getElementById('rs-reason-other')?.value?.trim();
  const reason=rSel==='other'?rOth:rSel;
  const al=document.getElementById('rs-alert'), btn=document.getElementById('rs-submit-btn');
  const showAl=(msg)=>{ if(!al)return; al.className='alert alert-error'; al.innerHTML='<i class="ti ti-alert-circle"></i> '+msg; al.classList.remove('hidden'); };
  if(!dt){showAl('Please select a new date and time.');return;}
  if(new Date(dt)<=new Date()){showAl('New date must be in the future.');return;}
  if(!reason){showAl('Please select a reason.');return;}
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div> Saving…';}
  try {
    await API._fetchDirect('/appointments/'+_rsApptId+'/reschedule',{method:'PATCH',body:JSON.stringify({scheduledAt:new Date(dt).toISOString(),visitType:type,rescheduleReason:reason})});
    document.getElementById('reschedule-modal').style.display='none';
    UI.showToast('Appointment rescheduled — notifications sent','ok');
    Router.setPage('appointments');
  } catch(e){ showAl(e.message||'Failed to reschedule.'); }
  finally{ if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-calendar-check"></i>Confirm reschedule';} }
};
window._showCancelAppt = (id) => {
  _cancelApptId=id;
  const al=document.getElementById('cancel-alert'); if(al) al.classList.add('hidden');
  document.getElementById('cancel-modal').style.display='flex';
};
window._toggleCancelOther = (v) => { const el=document.getElementById('cancel-reason-other'); if(el) el.style.display=v==='other'?'block':'none'; };
window._submitCancelAppt = async () => {
  const rSel=document.getElementById('cancel-reason-sel')?.value, rOth=document.getElementById('cancel-reason-other')?.value?.trim();
  const reason=rSel==='other'?rOth:rSel;
  const al=document.getElementById('cancel-alert'), btn=document.getElementById('cancel-submit-btn');
  if(!reason){ if(al){al.className='alert alert-error';al.innerHTML='<i class="ti ti-alert-circle"></i> Please select a reason.';al.classList.remove('hidden');} return; }
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div> Cancelling…';}
  try {
    await API.appointments.cancel(_cancelApptId, reason);
    document.getElementById('cancel-modal').style.display='none';
    UI.showToast('Appointment cancelled — doctor notified','ok');
    Router.setPage('appointments');
  } catch(e){ if(al){al.className='alert alert-error';al.innerHTML='<i class="ti ti-alert-circle"></i> '+e.message;al.classList.remove('hidden');} }
  finally{ if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-x"></i>Yes, cancel appointment';} }
};
window._cancelAppt = (id) => _showCancelAppt(id);

/* ══════════════════════════════════════════════════
   QUEUE CHECK-IN
══════════════════════════════════════════════════ */
Pages['checkin'] = () => {
  if (window._ciPollInt) clearInterval(window._ciPollInt);
  setTimeout(_ciLoad, 0);
  return `
<div class="page-title">Queue check-in</div>
<div id="ci-body" style="max-width:540px;margin:0 auto;color:var(--text-muted)">Loading…</div>`;
};

async function _ciLoad() {
  const wrap = document.getElementById('ci-body');
  if (!wrap) return;
  try {
    const p = await _getMyPatientRecord();
    if (!p) { wrap.innerHTML='<div class="alert-box alert-warn">Please complete your profile first.</div>'; return; }

    const u   = API.getStoredUser();
    const fid = u?.facilityId || u?.facility || p.primaryFacility?._id;

    const qr  = await API._fetchDirect(`/queue2/my-token?patientId=${p._id}&facilityId=${fid}`, {method:'GET'});
    const tok = qr?.data;

    if (tok && !['completed','cancelled','skipped'].includes(tok.status)) {
      wrap.innerHTML = _ciRenderToken(tok);
      if (window._ciPollInt) clearInterval(window._ciPollInt);
      window._ciPollInt = setInterval(async () => {
        if (!document.getElementById('ci-body')) { clearInterval(window._ciPollInt); return; }
        try {
          const r2 = await API._fetchDirect(`/queue2/my-token?patientId=${p._id}&facilityId=${fid}`, {method:'GET'});
          if (r2?.data && document.getElementById('ci-body')) document.getElementById('ci-body').innerHTML = _ciRenderToken(r2.data);
        } catch (_) {}
      }, 20000);
      return;
    }

    const apptRes  = await API.appointments.list({ patient: p._id, limit: 20 });
    const todayStr = new Date().toDateString();
    const todayA   = (apptRes.data||[]).filter(a => new Date(a.scheduledAt).toDateString()===todayStr && ['confirmed','pending'].includes(a.status));

    wrap.innerHTML = `
      ${todayA.length ? `
      <div class="card" style="margin-bottom:14px;border:1.5px solid var(--green)">
        <div class="card-title" style="color:var(--green-dark)"><i class="ti ti-calendar-check"></i>Your appointment today — Priority check-in</div>
        <div class="alert-box alert-ok" style="margin-bottom:12px"><i class="ti ti-info-circle"></i>Pre-booked patients receive priority placement in queue.</div>
        ${todayA.map(a=>`
          <div style="padding:12px;background:var(--green-light);border-radius:var(--radius);margin-bottom:8px">
            <div style="font-weight:600;text-transform:capitalize">${(a.visitType||'').replace('_',' ')}</div>
            <div style="font-size:12px;color:var(--text-muted);margin:4px 0">
              ${new Date(a.scheduledAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
              ${a.facility?.name?' · '+a.facility.name:''}
              ${a.doctor?' · Dr. '+a.doctor.firstName+' '+a.doctor.lastName:''}
            </div>
            ${a.reason?`<div style="font-size:12px;color:var(--text-muted)">${a.reason}</div>`:''}
            <button class="btn btn-sm btn-green" style="margin-top:10px;width:100%"
              onclick="_ciPrebookedCI('${p._id}','${fid}','${a._id}')">
              <i class="ti ti-login"></i>Check in for this appointment
            </button>
          </div>`).join('')}
      </div>` : ''}

      <div class="card">
        <div class="card-title"><i class="ti ti-walk"></i>${todayA.length?'Walk-in check-in':'Check in to queue'}</div>
        ${!todayA.length?`<div class="alert-box alert-info" style="margin-bottom:12px"><i class="ti ti-info-circle"></i>No appointments today — you can walk in below.</div>`:''}
        <div class="f-group"><label class="f-label">Visit type</label>
          <select class="f-select" id="ci-type" style="margin:0" onchange="_ciTypeChange(this.value)">
            <option value="walkin">General walk-in</option>
            <option value="priority">Priority — I need assistance</option>
          </select>
        </div>
        <div id="ci-pri-row" style="display:none;margin-top:8px">
          <div class="f-group"><label class="f-label">Priority reason</label>
            <select class="f-select" id="ci-reason" style="margin:0">
              <option value="elderly">I am elderly (65+)</option>
              <option value="pregnant">I am pregnant</option>
              <option value="disabled">I have a disability</option>
              <option value="child_under_5">I have a child under 5</option>
            </select>
          </div>
        </div>
        <div class="f-group" style="margin-top:8px"><label class="f-label">Language preference</label>
          <select class="f-select" id="ci-lang" style="margin:0">
            <option value="en">English</option><option value="zu">isiZulu</option>
            <option value="af">Afrikaans</option><option value="st">Sesotho</option>
            <option value="xh">isiXhosa</option><option value="ts">Xitsonga</option>
          </select>
        </div>
        <div id="ci-alert" class="alert hidden" style="margin-top:8px"></div>
        <button class="btn btn-green" id="ci-btn" style="width:100%;margin-top:12px"
          onclick="_ciWalkIn('${p._id}','${fid}')">
          <i class="ti ti-login"></i>Check in now
        </button>
      </div>`;
  } catch (e) {
    if (wrap) wrap.innerHTML = `<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`;
  }
}

window._ciTypeChange = (v) => { const el=document.getElementById('ci-pri-row'); if(el) el.style.display=v==='priority'?'block':'none'; };

window._ciPrebookedCI = async (pid, fid, apptId) => {
  const btn = event?.target?.closest('button');
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div> Checking in…';}
  try {
    const res = await API._fetchDirect('/queue2/prebooked-checkin',{method:'POST',body:JSON.stringify({patientId:pid,facilityId:fid,appointmentId:apptId})});
    if(res.doctorLate) UI.showToast('Note: Doctor is running ~'+res.minutesLate+' min late','warn');
    /* ── Send SMS + email with queue token after check-in ── */
    const tkData = res.data;
    if (tkData && tkData.token) {
      await _ciSendTokenNotification(tkData);
    }
    Router.setPage('checkin');
  } catch(e){ UI.showToast(e.message||'Check-in failed','err'); if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-login"></i>Check in';} }
};

window._ciWalkIn = async (pid, fid) => {
  const btn=document.getElementById('ci-btn');
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div> Checking in…';}
  try {
    const ciRes = await API._fetchDirect('/queue2/checkin',{method:'POST',body:JSON.stringify({
      patientId:pid, facilityId:fid,
      tokenType:document.getElementById('ci-type')?.value==='priority'?'priority':'walkin',
      priorityReason:document.getElementById('ci-reason')?.value||'',
      language:document.getElementById('ci-lang')?.value||'en'
    })});
    /* ── Send SMS + email with queue token after check-in ── */
    if (ciRes && ciRes.data && ciRes.data.token) {
      await _ciSendTokenNotification(ciRes.data);
    }
    Router.setPage('checkin');
  } catch(e){
    const al=document.getElementById('ci-alert'); if(al){al.className='alert alert-error';al.innerHTML='<i class="ti ti-alert-circle"></i> '+e.message;al.classList.remove('hidden');}
    if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-login"></i>Check in now';}
  }
};

function _ciRenderToken(tok) {
  const called = tok.status==='called';
  const statusInfo = {
    waiting:          {bg:'var(--bg-surface)',c:'var(--amber)',    ic:'ti-clock',         msg:'Please wait — you will be called shortly'},
    called:           {bg:'var(--green-light)',c:'var(--green-dark)',ic:'ti-bell-ringing', msg:'Please proceed to the consultation room NOW'},
    in_consultation:  {bg:'var(--green-light)',c:'var(--green-dark)',ic:'ti-stethoscope', msg:'You are in consultation'},
    post_consultation:{bg:'var(--bg-surface)',c:'#4A6CF7',        ic:'ti-checks',        msg:'Consultation complete'},
    lab:              {bg:'#EEF2FF',c:'#4A6CF7',                  ic:'ti-flask',         msg:'Please go to the Laboratory'},
    pharmacy:         {bg:'var(--green-light)',c:'var(--green-dark)',ic:'ti-pill',        msg:'Please go to the Pharmacy'},
    completed:        {bg:'var(--green-light)',c:'var(--green-dark)',ic:'ti-circle-check',msg:'Your visit is complete. Thank you!'},
  }[tok.status]||{bg:'var(--bg-surface)',c:'var(--amber)',ic:'ti-clock',msg:'Please wait'};
  const tokenBg = {emergency:'#E24B4A',priority:'#EF9F27',normal:'#4A6CF7',walkin:'#1D9E75'}[tok.tokenType]||'var(--green-dark)';

  return `
  <div class="card" style="${called?'border:2px solid var(--green)':''}margin-bottom:14px;text-align:center">
    ${called?`<div style="background:var(--green);color:#fff;padding:12px;margin:-1px -1px 16px;border-radius:var(--radius-xl) var(--radius-xl) 0 0;font-weight:700;font-size:15px">
      🔔 IT'S YOUR TURN — Please proceed to the consultation room
    </div>`:''}
    <div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-hint);margin-bottom:4px">Your queue token</div>
    <div style="font-size:76px;font-weight:900;color:${tokenBg};font-family:var(--mono);line-height:1;margin:4px 0">${tok.token}</div>
    <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 14px;border-radius:20px;background:${tok.tokenType==='normal'?'#EEF2FF':'var(--green-light)'};color:${tok.tokenType==='normal'?'#4A6CF7':'var(--green-dark)'};font-size:12px;font-weight:600;margin:8px 0">
      ${tok.tokenType==='normal'?'📅 Pre-booked':'🚶 Walk-in'}${tok.priorityReason?' · '+tok.priorityReason:''}
    </div>
    <div style="display:flex;justify-content:center;gap:32px;margin:14px 0">
      <div><div style="font-size:28px;font-weight:800">${tok.aheadCount??'—'}</div><div style="font-size:12px;color:var(--text-muted)">Ahead of you</div></div>
      <div style="width:1px;background:var(--border)"></div>
      <div><div style="font-size:28px;font-weight:800">${tok.estimatedWait??'—'}</div><div style="font-size:12px;color:var(--text-muted)">Est. wait (min)</div></div>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:var(--radius);background:${statusInfo.bg};color:${statusInfo.c};font-weight:500;font-size:13px">
      <i class="ti ${statusInfo.ic}"></i>${statusInfo.msg}
    </div>
  </div>
  ${['lab','pharmacy'].includes(tok.status)?`
  <div class="alert-box ${tok.status==='lab'?'alert-info':'alert-ok'}" style="margin-bottom:14px">
    <i class="ti ti-${tok.status==='lab'?'flask':'pill'}"></i>
    Please go to the <strong>${tok.status==='lab'?'Laboratory':'Pharmacy'}</strong>
  </div>`:''}
  ${tok.status==='completed'?`
  <div class="card" style="margin-bottom:14px">
    <div class="card-title"><i class="ti ti-star"></i>How was your experience?</div>
    <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Your feedback helps us improve.</div>
    <div id="ci-star-row" style="display:flex;justify-content:center;gap:6px;margin-bottom:10px">
      ${[1,2,3,4,5].map(n=>`
        <button onclick="_ciRate('${tok._id}',${n})"
          style="font-size:30px;background:none;border:none;cursor:pointer;line-height:1">⭐</button>`).join('')}
    </div>
    <div id="ci-rate-thanks" style="display:none;text-align:center;color:var(--green-dark);font-weight:500">Thank you! ⭐</div>
  </div>`:''}
  <div style="text-align:center">
    <button class="btn btn-xs" onclick="_ciLoad()"><i class="ti ti-refresh"></i>Refresh status</button>
  </div>`;
}

/* ── Send token notification after check-in ── */
async function _ciSendTokenNotification(tok) {
  try {
    const p = await _getMyPatientRecord();
    if (!p) return;
    const msg = 'NIHMS Queue: Your token is ' + tok.token +
      '. Position: ' + (tok.position||'—') +
      '. Est. wait: ' + (tok.estimatedWait||0) + ' min. Please remain in the waiting area.';

    if (p.phone) {
      await API._fetchDirect('/notifications/sms', {
        method: 'POST',
        body: JSON.stringify({ to: p.phone, message: msg })
      }).catch(() => {});
    }

    if (p.email) {
      const html =
        '<div style="font-family:Arial;max-width:480px;margin:0 auto">' +
        '<div style="background:linear-gradient(135deg,#0F6E56,#1A4A9B);padding:20px;text-align:center;border-radius:10px 10px 0 0">' +
        '<h2 style="color:#fff;margin:0">Your Queue Token</h2></div>' +
        '<div style="padding:24px;background:#f9f9f9;border-radius:0 0 10px 10px;text-align:center">' +
        '<p>Dear <strong>' + p.firstName + ' ' + p.lastName + '</strong>, you have checked in.</p>' +
        '<div style="margin:20px 0;padding:20px;background:#fff;border-radius:10px;border:2px solid #0F6E56">' +
        '<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#888;margin-bottom:6px">Your Queue Token</div>' +
        '<div style="font-size:72px;font-weight:900;color:#0F6E56;font-family:monospace;line-height:1.1">' + tok.token + '</div>' +
        '<div style="font-size:13px;color:#666;margin-top:8px">Position: ' + (tok.position||'—') + ' &middot; Est. wait: ' + (tok.estimatedWait||0) + ' min</div>' +
        '</div>' +
        '<p style="font-size:13px;color:#888">Please remain in the waiting area. You will be notified when it is your turn.</p>' +
        '</div></div>';

      await API._fetchDirect('/notifications/email', {
        method: 'POST',
        body: JSON.stringify({
          to:      p.email,
          subject: 'NIHMS Queue Token: ' + tok.token,
          html:    html,
        })
      }).catch(() => {});
    }
  } catch(_) {}
}

window._ciRate = async (id, rating) => {
  try {
    await API._fetchDirect(`/queue2/${id}/feedback`,{method:'POST',body:JSON.stringify({satisfaction:rating})});
    const sr=document.getElementById('ci-star-row'); if(sr) sr.style.display='none';
    const rt=document.getElementById('ci-rate-thanks'); if(rt) rt.style.display='block';
  } catch(_){ UI.showToast('Feedback failed','err'); }
};

/* ══════════════════════════════════════════════════
   BILLING
══════════════════════════════════════════════════ */
Pages['billing'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('billing-body');
    if (!wrap) return;
    try {
      const p = await _getMyPatientRecord();
      if (!p) { wrap.innerHTML='<div class="alert-box alert-warn">Please complete your profile first.</div>'; return; }
      const aid = p.medicalAid || {};

      wrap.innerHTML = `
<div class="card" style="max-width:600px">
  <div class="card-title"><i class="ti ti-credit-card"></i>Medical aid / billing information</div>
  <div class="f-group"><label class="f-label">Medical aid provider</label>
    <select class="f-select" id="b-provider" style="margin:0">
      <option value="">— No medical aid (self-pay) —</option>
      ${['Discovery Health','Momentum Health','Bonitas','Medshield','Fedhealth','Bestmed','Gems (Government)','Hosmed','Other'].map(pr=>`<option value="${pr}" ${aid.schemeName===pr?'selected':''}>${pr}</option>`).join('')}
    </select>
  </div>
  <div class="two-col">
    <div class="f-group"><label class="f-label">Member number</label>
      <input class="f-input" id="b-memnum" value="${aid.memberNumber||''}" placeholder="12345678">
    </div>
    <div class="f-group"><label class="f-label">Plan / option</label>
      <input class="f-input" id="b-plan" value="${aid.planName||''}" placeholder="e.g. Coastal Core">
    </div>
  </div>
  <div class="two-col">
    <div class="f-group"><label class="f-label">Dependant code</label>
      <input class="f-input" id="b-dep" value="${aid.dependantCode||''}" placeholder="00">
    </div>
    <div class="f-group"><label class="f-label">Main member name</label>
      <input class="f-input" id="b-main" value="${aid.mainMemberName||''}" placeholder="If different from yourself">
    </div>
  </div>
  <div id="b-alert" class="alert hidden" style="margin-bottom:8px"></div>
  <button class="btn btn-green" onclick="_saveBilling()"><i class="ti ti-device-floppy"></i>Save billing info</button>
</div>`;
    } catch(e) { if(wrap) wrap.innerHTML=`<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`; }
  }, 0);

  return `
<div class="page-title">Billing & medical aid</div>
<div id="billing-body" style="color:var(--text-muted)">Loading…</div>`;
};

window._saveBilling = async () => {
  try {
    await API._fetchDirect('/patients/me/profile',{method:'PATCH',body:JSON.stringify({
      medicalAid:{
        schemeName:    document.getElementById('b-provider')?.value||'',
        memberNumber:  document.getElementById('b-memnum')?.value?.trim()||'',
        planName:      document.getElementById('b-plan')?.value?.trim()||'',
        dependantCode: document.getElementById('b-dep')?.value?.trim()||'',
        mainMemberName:document.getElementById('b-main')?.value?.trim()||'',
      }
    })});
    UI.showToast('Billing information saved','ok');
  } catch(e){ UI.showToast(e.message,'err'); }
};

/* ══════════════════════════════════════════════════
   MY PROFILE
══════════════════════════════════════════════════ */
Pages['myprofile'] = () => {
  setTimeout(async () => {
    const wrap = document.getElementById('profile-body');
    if (!wrap) return;
    try {
      const p = await _getMyPatientRecord();
      wrap.innerHTML = _buildProfileForm(p);
    } catch(e) { if(wrap) wrap.innerHTML=`<div class="alert-box alert-danger"><i class="ti ti-alert-circle"></i>${e.message}</div>`; }
  }, 0);
  return `
<div class="page-title">My profile</div>
<div id="profile-body" style="color:var(--text-muted)">Loading…</div>`;
};

function _buildProfileForm(p) {
  const v = (path, fb='') => {
    if (!p) return fb;
    return path.split('.').reduce((o,k) => o?.[k], p) ?? fb;
  };
  const profUrl  = p?.profilePicture?.url ? 'http://localhost:5000'+p.profilePicture.url : null;
  const initials = p ? ((p.firstName||'U')[0]+(p.lastName||'S')[0]).toUpperCase() : '??';

  return `
  <!-- Profile tabs -->
  <div class="reg-tabs" style="max-width:620px;margin-bottom:0">
    <button class="reg-tab-btn active" id="ep-tab-btn-1" onclick="_showEpTab(1)"><i class="ti ti-user"></i><span>Info</span></button>
    <button class="reg-tab-btn" id="ep-tab-btn-2" onclick="_showEpTab(2)"><i class="ti ti-phone"></i><span>Contact</span></button>
    <button class="reg-tab-btn" id="ep-tab-btn-3" onclick="_showEpTab(3)"><i class="ti ti-map-pin"></i><span>Address</span></button>
    <button class="reg-tab-btn" id="ep-tab-btn-4" onclick="_showEpTab(4)"><i class="ti ti-heart-handshake"></i><span>Next of kin</span></button>
    <button class="reg-tab-btn" id="ep-tab-btn-5" onclick="_showEpTab(5)"><i class="ti ti-lock"></i><span>Password</span></button>
    <button class="reg-tab-btn" id="ep-tab-btn-6" onclick="_showEpTab(6)"><i class="ti ti-photo"></i><span>Documents</span></button>
  </div>

  <!-- TAB 1: Personal info (read-only locked fields) -->
  <div id="ep-tab-1" class="card" style="max-width:620px">
    <div class="card-title"><i class="ti ti-user"></i>Personal information</div>
    <div style="display:flex;align-items:center;gap:14px;padding:12px;background:var(--bg-surface);border-radius:var(--radius);margin-bottom:16px">
      <div style="width:56px;height:56px;border-radius:50%;background:${profUrl?'transparent':'var(--green-light)'};overflow:hidden;flex-shrink:0;border:3px solid var(--green-light)">
        ${profUrl
          ? `<img src="${profUrl}" style="width:100%;height:100%;object-fit:cover">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;color:var(--green-dark)">${initials}</div>`}
      </div>
      <div>
        <div style="font-weight:700;font-size:16px">${v('firstName')} ${v('lastName')}</div>
        <div style="font-size:12px;color:var(--text-muted)">MRN: ${v('mrn','—')} · ${v('age','?')}y · ${v('gender','—')}</div>
        <div style="font-size:11px;color:var(--text-hint)">ID: ${v('nationalId','—')}</div>
      </div>
    </div>
    <div class="alert-box alert-info" style="margin-bottom:14px"><i class="ti ti-lock"></i>Name, ID number, date of birth and gender are locked — contact reception to update these.</div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">First name</label>
        <input class="f-input" value="${v('firstName')}" readonly style="background:var(--bg-surface);color:var(--text-muted)">
      </div>
      <div class="f-group"><label class="f-label">Last name</label>
        <input class="f-input" value="${v('lastName')}" readonly style="background:var(--bg-surface);color:var(--text-muted)">
      </div>
    </div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">Date of birth</label>
        <input class="f-input" value="${v('dateOfBirth','').slice?.(0,10)||''}" readonly style="background:var(--bg-surface);color:var(--text-muted)">
      </div>
      <div class="f-group"><label class="f-label">Gender</label>
        <input class="f-input" value="${v('gender','')}" readonly style="background:var(--bg-surface);color:var(--text-muted);text-transform:capitalize">
      </div>
    </div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">National ID / Passport</label>
        <input class="f-input" value="${v('nationalId','')}" readonly style="background:var(--bg-surface);color:var(--text-muted);font-family:var(--mono)">
      </div>
      <div class="f-group"><label class="f-label">Blood type</label>
        <select class="f-select" id="pf-blood" style="margin:0">
          ${['unknown','A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt=>`<option value="${bt}" ${v('bloodType')===bt?'selected':''}>${bt}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="f-group"><label class="f-label">Known allergies (comma separated)</label>
      <input class="f-input" id="pf-allergies" value="${(v('allergies',[])||[]).join(', ')}" placeholder="e.g. Penicillin, Aspirin">
    </div>
    <div id="pf-info-alert" class="alert hidden" style="margin-bottom:6px"></div>
    <button class="btn btn-green" onclick="_saveInfo()"><i class="ti ti-device-floppy"></i>Save</button>
  </div>

  <!-- TAB 2: Contact -->
  <div id="ep-tab-2" class="card" style="display:none;max-width:620px">
    <div class="card-title"><i class="ti ti-phone"></i>Contact information</div>
    <div class="f-group"><label class="f-label">Mobile phone * <span style="font-size:11px;color:var(--text-hint)">(+27 added automatically)</span></label>
      <input class="f-input" type="tel" id="pf-phone" value="${v('phone')}" placeholder="0821234567" onblur="_autoFmtPhone(this)">
    </div>
    <div class="f-group"><label class="f-label">Alternative phone</label>
      <input class="f-input" type="tel" id="pf-phonealt" value="${v('phoneAlt')}" placeholder="0821234567" onblur="_autoFmtPhone(this)">
    </div>
    <div class="f-group"><label class="f-label">Email address</label>
      <input class="f-input" type="email" id="pf-email" value="${v('email')}" placeholder="name@example.com">
    </div>
    <div id="pf-contact-alert" class="alert hidden" style="margin-bottom:6px"></div>
    <button class="btn btn-green" onclick="_saveContact()"><i class="ti ti-device-floppy"></i>Save contact info</button>
  </div>

  <!-- TAB 3: Address -->
  <div id="ep-tab-3" class="card" style="display:none;max-width:620px">
    <div class="card-title"><i class="ti ti-map-pin"></i>Physical address</div>
    <div class="f-group"><label class="f-label">Street address</label><input class="f-input" id="pf-street" value="${v('address.street')}" placeholder="123 Main Road"></div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">Suburb</label><input class="f-input" id="pf-suburb" value="${v('address.suburb')}" placeholder="Soweto"></div>
      <div class="f-group"><label class="f-label">City</label><input class="f-input" id="pf-city" value="${v('address.city')}" placeholder="Johannesburg"></div>
    </div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">Postal code</label><input class="f-input" id="pf-postal" value="${v('address.postalCode')}" placeholder="2001"></div>
      <div class="f-group"><label class="f-label">Province</label>
        <select class="f-select" id="pf-province" style="margin:0">
          <option value="">— Select province —</option>
          ${['Gauteng','KwaZulu-Natal','Western Cape','Eastern Cape','Limpopo','Mpumalanga','North West','Free State','Northern Cape']
            .map(pr=>`<option value="${pr}" ${v('address.province')===pr?'selected':''}>${pr}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="pf-addr-alert" class="alert hidden" style="margin-bottom:6px"></div>
    <button class="btn btn-green" onclick="_saveAddress()"><i class="ti ti-device-floppy"></i>Save address</button>
  </div>

  <!-- TAB 4: Next of kin -->
  <div id="ep-tab-4" class="card" style="display:none;max-width:620px">
    <div class="card-title"><i class="ti ti-heart-handshake"></i>Next of kin</div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">Full name</label><input class="f-input" id="pf-kin-name" value="${v('nextOfKin.name')}" placeholder="Jane Dlamini"></div>
      <div class="f-group"><label class="f-label">Relationship</label>
        <select class="f-select" id="pf-kin-rel" style="margin:0">
          <option value="">— Select —</option>
          ${['Spouse','Parent','Child','Sibling','Friend','Guardian','Other']
            .map(r=>`<option value="${r}" ${v('nextOfKin.relationship')===r?'selected':''}>${r}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">Phone</label><input class="f-input" type="tel" id="pf-kin-phone" value="${v('nextOfKin.phone')}" placeholder="0821234567" onblur="_autoFmtPhone(this)"></div>
      <div class="f-group"><label class="f-label">Alt phone</label><input class="f-input" type="tel" id="pf-kin-phonealt" value="${v('nextOfKin.phoneAlt')}" placeholder="0821234567" onblur="_autoFmtPhone(this)"></div>
    </div>
    <div id="pf-kin-alert" class="alert hidden" style="margin-bottom:6px"></div>
    <button class="btn btn-green" onclick="_saveNextOfKin()"><i class="ti ti-device-floppy"></i>Save next of kin</button>
  </div>

  <!-- TAB 5: Change password -->
  <div id="ep-tab-5" class="card" style="display:none;max-width:620px">
    <div class="card-title"><i class="ti ti-lock"></i>Change password</div>
    <div class="alert-box alert-info" style="margin-bottom:14px"><i class="ti ti-info-circle"></i>Leave blank to keep your current password.</div>
    <div class="f-group"><label class="f-label">Current password</label>
      <div style="position:relative">
        <input class="f-input" type="password" id="pf-pwd-current" placeholder="Enter current password" style="padding-right:38px">
        <span style="position:absolute;right:11px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--text-hint)" onclick="this.previousElementSibling.type=this.previousElementSibling.type==='password'?'text':'password'"><i class="ti ti-eye"></i></span>
      </div>
    </div>
    <div class="two-col">
      <div class="f-group"><label class="f-label">New password</label>
        <div style="position:relative">
          <input class="f-input" type="password" id="pf-pwd-new" placeholder="Min 8 chars" style="padding-right:38px" oninput="_checkNewPwd()">
          <span style="position:absolute;right:11px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--text-hint)" onclick="this.previousElementSibling.type=this.previousElementSibling.type==='password'?'text':'password'"><i class="ti ti-eye"></i></span>
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;margin-top:6px;font-size:12px">
          <div id="pwr-len" style="color:var(--text-hint)"><i class="ti ti-circle" style="font-size:11px"></i> 8+ characters</div>
          <div id="pwr-upper" style="color:var(--text-hint)"><i class="ti ti-circle" style="font-size:11px"></i> One uppercase</div>
          <div id="pwr-num" style="color:var(--text-hint)"><i class="ti ti-circle" style="font-size:11px"></i> One number</div>
        </div>
      </div>
      <div class="f-group"><label class="f-label">Confirm new password</label>
        <div style="position:relative">
          <input class="f-input" type="password" id="pf-pwd-confirm" placeholder="Repeat password" style="padding-right:38px" oninput="_checkPwdMatch()">
          <span style="position:absolute;right:11px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--text-hint)" onclick="this.previousElementSibling.type=this.previousElementSibling.type==='password'?'text':'password'"><i class="ti ti-eye"></i></span>
        </div>
        <div id="pwd-match-msg" style="font-size:12px;margin-top:6px;display:none"></div>
      </div>
    </div>
    <div id="pwd-alert" class="alert hidden" style="margin-bottom:6px"></div>
    <button class="btn btn-green" id="pwd-change-btn" onclick="_changePassword()"><i class="ti ti-lock-check"></i>Update password</button>
  </div>

  <!-- TAB 6: Documents + Profile picture -->
  <div id="ep-tab-6" class="card" style="display:none;max-width:620px">
    <div class="card-title"><i class="ti ti-file-upload"></i>ID document</div>
    ${p?.idDocument?.url
      ? `<div class="alert-box alert-ok" style="margin-bottom:10px"><i class="ti ti-file-check"></i><div><div style="font-weight:500;font-size:13px">${p.idDocument.filename}</div><div style="font-size:11px">Uploaded ${new Date(p.idDocument.uploadedAt).toLocaleDateString('en-ZA')}</div></div></div>`
      : `<div class="alert-box alert-warn" style="margin-bottom:10px"><i class="ti ti-alert-triangle"></i>No ID document uploaded yet.</div>`}
    <div style="border:2px dashed var(--border);border-radius:var(--radius);padding:14px;text-align:center;cursor:pointer" onclick="document.getElementById('pf-iddoc').click()">
      <i class="ti ti-cloud-upload" style="font-size:22px;color:var(--text-hint);display:block;margin-bottom:6px"></i>
      <div style="font-size:13px;color:var(--text-muted)">${p?.idDocument?.url ? 'Replace ID document' : 'Upload ID / Passport'}</div>
      <div style="font-size:11px;color:var(--text-hint)">JPG, PNG or PDF · Max 5 MB</div>
    </div>
    <input type="file" id="pf-iddoc" accept=".jpg,.jpeg,.png,.pdf" style="display:none" onchange="_uploadIdDoc(this)">
    <div id="id-doc-status" style="margin-top:8px"></div>
  </div>`;
}

/* ── Profile helpers ── */
window._showEpTab = (n) => {
  for (let i=1;i<=6;i++) {
    const tab=document.getElementById('ep-tab-'+i), btn=document.getElementById('ep-tab-btn-'+i);
    if(tab) tab.style.display=i===n?'block':'none';
    if(btn) btn.classList.toggle('active',i===n);
  }
};

window._autoFmtPhone = (input) => {
  const raw=input.value.trim(); if(!raw) return;
  const d=raw.replace(/[^0-9]/g,'');
  let n=raw;
  if(d.startsWith('27')&&d.length>=11) n='+'+d;
  else if(d.startsWith('0')&&d.length===10) n='+27'+d.slice(1);
  else if(d.length===9) n='+27'+d;
  if(n!==raw){input.value=n;input.style.borderColor='var(--green)';setTimeout(()=>{input.style.borderColor='';},1500);}
};

window._saveInfo = async () => {
  const allergies = document.getElementById('pf-allergies')?.value?.split(',').map(a=>a.trim()).filter(Boolean)||[];
  const blood     = document.getElementById('pf-blood')?.value;
  try {
    await API._fetchDirect('/patients/me/profile',{method:'PATCH',body:JSON.stringify({allergies,bloodType:blood})});
    UI.showToast('Profile saved','ok');
  } catch(e){ _pfAlert('pf-info-alert',e.message); }
};

window._saveContact = async () => {
  const g=id=>document.getElementById(id)?.value?.trim()||'';
  const phone=g('pf-phone');
  if(!phone){_pfAlert('pf-contact-alert','Phone number is required.');return;}
  try {
    await API._fetchDirect('/patients/me/profile',{method:'PATCH',body:JSON.stringify({phone,phoneAlt:g('pf-phonealt'),email:g('pf-email')})});
    UI.showToast('Contact information saved','ok');
  } catch(e){_pfAlert('pf-contact-alert',e.message);}
};

window._saveAddress = async () => {
  const g=id=>document.getElementById(id)?.value?.trim()||'';
  try {
    await API._fetchDirect('/patients/me/profile',{method:'PATCH',body:JSON.stringify({
      address:{street:g('pf-street'),suburb:g('pf-suburb'),city:g('pf-city'),postalCode:g('pf-postal'),province:document.getElementById('pf-province')?.value||''}
    })});
    UI.showToast('Address saved','ok');
  } catch(e){_pfAlert('pf-addr-alert',e.message);}
};

window._saveNextOfKin = async () => {
  const g=id=>document.getElementById(id)?.value?.trim()||'';
  try {
    await API._fetchDirect('/patients/me/profile',{method:'PATCH',body:JSON.stringify({
      nextOfKin:{name:g('pf-kin-name'),relationship:document.getElementById('pf-kin-rel')?.value||'',phone:g('pf-kin-phone'),phoneAlt:g('pf-kin-phonealt')}
    })});
    UI.showToast('Next of kin saved','ok');
  } catch(e){_pfAlert('pf-kin-alert',e.message);}
};

function _pfAlert(id, msg) {
  const el=document.getElementById(id); if(!el) return;
  el.className='alert alert-error'; el.innerHTML='<i class="ti ti-alert-circle"></i> '+msg; el.classList.remove('hidden');
}

window._checkNewPwd = () => {
  const v=document.getElementById('pf-pwd-new')?.value||'';
  const _mark=(id,ok)=>{const e=document.getElementById(id);if(e){e.style.color=ok?'var(--green-dark)':'var(--text-hint)';e.querySelector('i').className='ti '+(ok?'ti-circle-check':'ti-circle');}};
  _mark('pwr-len',v.length>=8); _mark('pwr-upper',/[A-Z]/.test(v)); _mark('pwr-num',/\d/.test(v));
};

window._checkPwdMatch = () => {
  const n=document.getElementById('pf-pwd-new')?.value, c=document.getElementById('pf-pwd-confirm')?.value;
  const el=document.getElementById('pwd-match-msg'); if(!el) return;
  if(!c){el.style.display='none';return;}
  el.style.display='block';
  if(n===c){el.innerHTML='<span style="color:var(--green-dark)"><i class="ti ti-check"></i> Passwords match</span>';}
  else{el.innerHTML='<span style="color:var(--red)"><i class="ti ti-x"></i> Passwords do not match</span>';}
};

window._changePassword = async () => {
  const cur=document.getElementById('pf-pwd-current')?.value;
  const nw=document.getElementById('pf-pwd-new')?.value;
  const cf=document.getElementById('pf-pwd-confirm')?.value;
  const al=document.getElementById('pwd-alert'), btn=document.getElementById('pwd-change-btn');
  const showAl=(msg)=>{if(!al)return;al.className='alert alert-error';al.innerHTML='<i class="ti ti-alert-circle"></i> '+msg;al.classList.remove('hidden');};
  if(!cur){showAl('Enter your current password.');return;}
  if(!nw||nw.length<8){showAl('New password must be at least 8 characters.');return;}
  if(nw!==cf){showAl('Passwords do not match.');return;}
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:14px;height:14px"></div> Saving…';}
  try {
    await API._fetchDirect('/auth/change-password',{method:'PATCH',body:JSON.stringify({currentPassword:cur,newPassword:nw})});
    UI.showToast('Password updated successfully','ok');
    ['pf-pwd-current','pf-pwd-new','pf-pwd-confirm'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
    if(al) al.classList.add('hidden');
  } catch(e){showAl(e.message||'Failed to update password');}
  finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-lock-check"></i>Update password';}}
};

window._uploadProfilePic = async (input) => {
  const file=input.files[0]; if(!file) return;
  if(file.size>2*1024*1024){UI.showToast('Profile picture must be under 2 MB','err');return;}
  const status=document.getElementById('pic-status');
  if(status) status.innerHTML='<div style="font-size:12px;color:var(--text-muted)">Uploading…</div>';
  try {
    const token=API.Tokens.getAccess(), form=new FormData();
    form.append('profilePicture',file);
    const res=await fetch('http://localhost:5000/api/v1/patients/me/upload-profile',{method:'POST',headers:{'Authorization':'Bearer '+token},body:form});
    const data=await res.json();
    if(!data.success) throw new Error(data.message);
    UI.showToast('Profile picture updated','ok');
    if(status) status.innerHTML='<div class="alert-box alert-ok" style="margin:0;font-size:12px"><i class="ti ti-check"></i>Updated</div>';
    setTimeout(()=>Router.setPage('myprofile'),1000);
  } catch(e){UI.showToast(e.message||'Upload failed','err');if(status) status.innerHTML='<div class="alert-box alert-danger" style="margin:0;font-size:12px"><i class="ti ti-alert-circle"></i>'+e.message+'</div>';}
};

window._uploadIdDoc = async (input) => {
  const file=input.files[0]; if(!file) return;
  if(file.size>5*1024*1024){UI.showToast('File must be under 5 MB','err');return;}
  const status=document.getElementById('id-doc-status');
  if(status) status.innerHTML='<div style="font-size:12px;color:var(--text-muted)">Uploading…</div>';
  try {
    const token=API.Tokens.getAccess(), form=new FormData();
    form.append('idDocument',file);
    const res=await fetch('http://localhost:5000/api/v1/patients/me/upload-id',{method:'POST',headers:{'Authorization':'Bearer '+token},body:form});
    const data=await res.json();
    if(!data.success) throw new Error(data.message);
    UI.showToast('ID document uploaded','ok');
    if(status) status.innerHTML='<div class="alert-box alert-ok" style="margin:0;font-size:12px"><i class="ti ti-check"></i>'+file.name+' uploaded</div>';
    setTimeout(()=>Router.setPage('myprofile'),1000);
  } catch(e){UI.showToast(e.message||'Upload failed','err');if(status) status.innerHTML='<div class="alert-box alert-danger" style="margin:0;font-size:12px"><i class="ti ti-alert-circle"></i>'+e.message+'</div>';}
};

/* ══════════════════════════════════════════════════
   BOOK APPOINTMENT
══════════════════════════════════════════════════ */
/* ── Facilities known to be clinics (no specialist referrals) ── */
const _CLINIC_NAMES = ['soweto clinic','bophelong clinic'];
const _HOSPITAL_NAMES = ['chris hani baragwanath chc','chris hani baragwanath'];

function _bkIsClinic(facilityName) {
  const n = (facilityName||'').toLowerCase();
  return _CLINIC_NAMES.some(c => n.includes(c));
}
function _bkIsHospital(facilityName) {
  const n = (facilityName||'').toLowerCase();
  return _HOSPITAL_NAMES.some(h => n.includes(h));
}

/* Validate date against clinic hours:
   Mon-Fri 07:00-17:00, Sat 07:00-13:00, Sun closed
   Same-day bookings need at least 1 hour notice */
function _bkValidateDateTime(dt) {
  const d   = new Date(dt);
  const now = new Date();
  const day = d.getDay(); // 0=Sun,1=Mon...6=Sat
  const h   = d.getHours(), m = d.getMinutes();
  const mins = h * 60 + m;

  if (day === 0) return 'The clinic is closed on Sundays.';
  if (day >= 1 && day <= 5) {
    if (mins < 7 * 60)  return 'Clinic opens at 07:00 on weekdays.';
    if (mins >= 17 * 60) return 'Clinic closes at 17:00 on weekdays.';
  }
  if (day === 6) {
    if (mins < 7 * 60)  return 'Clinic opens at 07:00 on Saturdays.';
    if (mins >= 13 * 60) return 'Clinic closes at 13:00 on Saturdays.';
  }
  const todayStr = now.toDateString(), dtStr = d.toDateString();
  if (todayStr === dtStr && (d - now) < 60 * 60 * 1000)
    return 'Same-day bookings require at least 1 hour notice.';
  if (d <= now) return 'Please select a future date and time.';
  return null; // valid
}

Pages['book'] = () => {
  window._BKC = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    selected: null,
    bookings: {}
  };

  setTimeout(function() {
    /* Load facilities */
    var FACS = [
      { id:'fac-chb',       name:'Chris Hani Baragwanath CHC', type:'hospital' },
      { id:'fac-soweto',    name:'Soweto Clinic',               type:'clinic'   },
      { id:'fac-bophelong', name:'Bophelong Clinic',            type:'clinic'   },
    ];
    (async function() {
      try {
        var r = await API._fetchDirect('/facilities', { method:'GET' });
        var api = r.data || [];
        FACS = FACS.map(function(hf) {
          var found = api.find(function(af) {
            return af.name.toLowerCase().includes(hf.name.split(' ')[0].toLowerCase());
          });
          return found ? { id:found._id, name:hf.name, type:hf.type } : hf;
        });
      } catch(_) {}
      var sel = document.getElementById('bk-facility');
      if (sel) {
        sel.innerHTML = '<option value="">— Select facility —</option>' +
          FACS.map(function(f) {
            return '<option value="'+f.id+'" data-name="'+f.name+'" data-type="'+f.type+'">'+f.name+'</option>';
          }).join('');
      }
    })();

    /* Draw calendar immediately */
    window._bkCalDraw();
  }, 0);

  return `
<div class="page-title">Book a visit</div>

<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:#EEF7FF;border-left:4px solid #4A9BD4;border-radius:10px;margin-bottom:16px;max-width:960px;font-size:13px;color:#1A4A9B">
  <i class="ti ti-clock" style="font-size:16px;flex-shrink:0"></i>
  <span>Clinic hours: <strong>Mon–Fri 07:00–17:00</strong> &middot; <strong>Sat 07:00–13:00</strong> &middot; Same-day bookings need <strong>1 hour notice</strong>.</span>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:960px;align-items:start">

  <!-- LEFT: Form fields -->
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
      <i class="ti ti-alert-triangle"></i> <strong>Specialist Referral</strong> is only available at hospitals. Please select <strong>Chris Hani Baragwanath CHC</strong>.
    </div>

    <div class="f-group">
      <label class="f-label">FACILITY</label>
      <select class="f-select" id="bk-facility" style="margin:0" onchange="window._bkWarnSpecialist();window._bkFetchBookings()">
        <option value="">Loading...</option>
      </select>
    </div>

    <div class="f-group">
      <label class="f-label">DATE &amp; TIME</label>
      <input type="hidden" id="bk-datetime">
      <div id="bk-selected-display"
        style="padding:11px 14px;border:1.5px solid var(--border);border-radius:var(--radius);font-size:13px;color:var(--text-muted);background:var(--bg-surface);min-height:44px;display:flex;align-items:center;gap:8px">
        <i class="ti ti-calendar-check" style="font-size:16px;color:var(--green-dark);flex-shrink:0"></i>
        <span id="bk-selected-lbl">Select a date from the calendar →</span>
      </div>
    </div>

    <button class="btn btn-green" id="bk-submit-btn"
      style="width:100%;padding:14px;font-size:14px;font-weight:700;margin-top:4px"
      onclick="window._bkSubmit()">
      <i class="ti ti-calendar-check"></i>Confirm booking
    </button>

    <div id="bk-alert" style="display:none;margin-top:10px;padding:10px 14px;background:#FEF2F2;border-left:4px solid var(--red);border-radius:8px;font-size:13px;color:#991B1B"></div>

    <div id="bk-success" style="display:none;margin-top:12px;padding:14px;background:#EDFBF3;border-radius:10px;border:1.5px solid var(--green)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <i class="ti ti-circle-check" style="font-size:20px;color:var(--green-dark)"></i>
        <strong style="color:var(--green-dark)">Booking confirmed!</strong>
      </div>
      <div id="bk-success-detail" style="font-size:13px;color:var(--text-muted);margin-bottom:8px"></div>
      <div style="font-size:12px;padding:8px;background:#fff;border-radius:8px;margin-bottom:6px;color:var(--text-muted)">
        <i class="ti ti-device-mobile" style="color:var(--green-dark)"></i> SMS &amp; email confirmation sent.
      </div>
      <div style="font-size:12px;padding:8px;background:#FFF9E6;border-radius:8px;color:#7A5C10">
        <i class="ti ti-info-circle"></i> Your queue token will be sent after you <strong>check in at the facility</strong>.
      </div>
    </div>
  </div>

  <!-- RIGHT: Inline calendar (no overlay, no fixed positioning) -->
  <div class="card" style="padding:20px">
    <!-- Month nav -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <button onclick="window._bkCalNav(-1)"
        style="width:36px;height:36px;border:1.5px solid var(--border);border-radius:8px;background:none;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;color:var(--text-muted)">&#8249;</button>
      <strong id="bk-month-lbl" style="font-size:15px"></strong>
      <button onclick="window._bkCalNav(1)"
        style="width:36px;height:36px;border:1.5px solid var(--border);border-radius:8px;background:none;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;color:var(--text-muted)">&#8250;</button>
    </div>

    <!-- Day headers -->
    <div style="display:grid;grid-template-columns:repeat(7,1fr);text-align:center;margin-bottom:4px">
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Su</div>
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Mo</div>
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Tu</div>
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">We</div>
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Th</div>
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Fr</div>
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px 0">Sa</div>
    </div>

    <!-- Calendar grid filled by JS -->
    <div id="bk-day-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:16px"></div>

    <!-- Slot tooltip (absolute within card) -->
    <div id="bk-slot-tip"
      style="display:none;position:absolute;background:var(--bg-card);border:1.5px solid var(--green);border-radius:10px;padding:10px 14px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:100;min-width:150px;pointer-events:none;font-size:12px">
      <div style="font-weight:700;color:var(--green-dark);margin-bottom:5px">Available slots:</div>
      <div id="bk-slot-list"></div>
    </div>

    <!-- Time picker -->
    <div style="border-top:1px solid var(--border);padding-top:14px;margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.05em;margin-bottom:8px;text-transform:uppercase">Select time</div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <input type="number" id="bk-t-h" value="8" min="1" max="12"
          style="width:56px;padding:9px;border:1.5px solid var(--border);border-radius:8px;text-align:center;font-size:16px;font-weight:700;font-family:inherit;outline:none"
          oninput="window._bkUpdLabel()" onfocus="this.select()">
        <span style="font-weight:700;font-size:20px">:</span>
        <select id="bk-t-m"
          style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;outline:none"
          onchange="window._bkUpdLabel()">
          <option value="00">00</option>
          <option value="30">30</option>
        </select>
        <select id="bk-t-ampm"
          style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;outline:none"
          onchange="window._bkUpdLabel()">
          <option>AM</option><option>PM</option>
        </select>
      </div>
    </div>

    <!-- Legend -->
    <div style="display:flex;gap:12px;font-size:12px;color:var(--text-muted);flex-wrap:wrap">
      <span style="display:flex;align-items:center;gap:5px">
        <span style="width:12px;height:12px;border-radius:3px;background:#EDFBF3;border:1.5px solid #7ADAA8;display:inline-block"></span>Available
      </span>
      <span style="display:flex;align-items:center;gap:5px">
        <span style="width:12px;height:12px;border-radius:3px;background:#FFF9E6;border:1.5px solid #F0D060;display:inline-block"></span>Limited
      </span>
      <span style="display:flex;align-items:center;gap:5px">
        <span style="width:12px;height:12px;border-radius:3px;background:#FEF2F2;border:1.5px solid #E24B4A;display:inline-block"></span>Fully booked
      </span>
    </div>
  </div>
</div>`;
};

/* ── Specialist warning ── */
window._bkWarnSpecialist = function() {
  var type   = (document.getElementById('bk-type')     || {value:''}).value;
  var facSel =  document.getElementById('bk-facility');
  var opt    = facSel && facSel.selectedIndex >= 0 ? facSel.options[facSel.selectedIndex] : null;
  var fname  = opt ? (opt.getAttribute('data-name') || opt.text || '') : '';
  var warn   = document.getElementById('bk-specialist-warn');
  if (!warn) return;
  var clinics = ['soweto clinic','bophelong clinic'];
  warn.style.display = (type==='specialist_referral' && clinics.some(function(c){ return fname.toLowerCase().includes(c); }) && fname) ? 'block' : 'none';
};

/* ── Slot status ── */
window._bkStatus = function(dateStr) {
  var d = new Date(dateStr + 'T00:00:00'), day = d.getDay();
  if (day === 0) return 'closed';
  var cnt = (window._BKC.bookings[dateStr] || 0);
  if (cnt > 0) {
    var mx = day === 6 ? 10 : 20;
    return cnt >= mx ? 'full' : cnt >= mx * 0.7 ? 'limited' : 'available';
  }
  var r = ((d.getDate() + d.getMonth() * 31) * 7 + 3) % 10;
  return r < 4 ? 'available' : r < 7 ? 'limited' : 'full';
};

/* ── Available slots list ── */
window._bkSlots = function(dateStr) {
  var s = window._bkStatus(dateStr);
  if (s === 'closed' || s === 'full') return [];
  var d   = new Date(dateStr + 'T00:00:00');
  var all = d.getDay() === 6
    ? ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30']
    : ['07:00','07:30','08:00','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','14:00','15:00','16:00','16:30'];
  return s === 'limited' ? all.filter(function(_, i){ return i % 3 === 0; }) : all;
};

/* ── Draw calendar grid ── */
window._bkCalDraw = function() {
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var lbl  = document.getElementById('bk-month-lbl');
  var grid = document.getElementById('bk-day-grid');
  if (!lbl || !grid) return;

  lbl.textContent = MONTHS[window._BKC.month] + ' ' + window._BKC.year;

  var firstDay    = new Date(window._BKC.year, window._BKC.month, 1).getDay();
  var daysInMonth = new Date(window._BKC.year, window._BKC.month + 1, 0).getDate();
  var today       = new Date(); today.setHours(0,0,0,0);
  var html        = '';

  for (var i = 0; i < firstDay; i++) html += '<div></div>';

  for (var d = 1; d <= daysInMonth; d++) {
    var dt   = new Date(window._BKC.year, window._BKC.month, d); dt.setHours(0,0,0,0);
    var ds   = window._BKC.year + '-' + String(window._BKC.month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    var past = dt < today;
    var isTd = dt.getTime() === today.getTime();
    var sel  = window._BKC.selected === ds;
    var st   = past ? 'past' : window._bkStatus(ds);
    var ok   = !past && st !== 'closed' && st !== 'full';

    var bg='transparent', col='var(--text)', bdr='1px solid transparent', fw='400', cur='default';
    if (sel)                         { bg='var(--green-dark)'; col='#fff'; bdr='2px solid var(--green-dark)'; fw='700'; }
    else if (isTd && ok)             { bg='#EDFBF3'; bdr='2px solid var(--green)'; }
    else if (st==='available' && ok) { bg='#EDFBF3'; bdr='1.5px solid #7ADAA8'; }
    else if (st==='limited'   && ok) { bg='#FFF9E6'; bdr='1.5px solid #F0D060'; col='#7A5C10'; }
    else if (st==='full')            { bg='#FEF2F2'; bdr='1.5px solid rgba(226,75,74,.3)'; col='#E24B4A'; }
    else if (past || st==='closed')  { col='#ccc'; }
    if (ok) cur = 'pointer';

    var ev = ok
      ? ' onclick="window._bkSelDate(\''+ds+'\')" onmouseenter="window._bkHover(event,\''+ds+'\')" onmouseleave="window._bkHideHover()"'
      : '';

    html += '<div style="text-align:center;padding:8px 2px;border-radius:8px;background:'+bg+';color:'+col+
            ';border:'+bdr+';font-weight:'+fw+';cursor:'+cur+';font-size:13px;transition:opacity .1s"'+ev+'>'+d+'</div>';
  }
  grid.innerHTML = html;
};

/* ── Navigate months ── */
window._bkCalNav = function(dir) {
  window._BKC.month += dir;
  if (window._BKC.month > 11) { window._BKC.month = 0; window._BKC.year++; }
  if (window._BKC.month < 0)  { window._BKC.month = 11; window._BKC.year--; }
  window._bkCalDraw();
  window._bkFetchBookings();
};

/* ── Select date ── */
window._bkSelDate = function(ds) {
  window._BKC.selected = ds;
  window._bkCalDraw();
  window._bkUpdLabel();
};

/* ── Hover tooltip ── */
window._bkHover = function(e, ds) {
  var slots = window._bkSlots(ds);
  var tip   = document.getElementById('bk-slot-tip');
  var list  = document.getElementById('bk-slot-list');
  if (!tip || !list || !slots.length) return;
  list.innerHTML = slots.slice(0,3).map(function(s){
    return '<div style="color:var(--green-dark);font-weight:600;padding:2px 0">✅ '+s+'</div>';
  }).join('') + (slots.length > 3 ? '<div style="color:var(--text-muted);margin-top:3px">+'+( slots.length-3)+' more</div>' : '');
  /* Position relative to the calendar card */
  var el   = e.currentTarget || e.target;
  var rect = el.getBoundingClientRect();
  tip.style.top     = (el.offsetTop + el.offsetHeight + 4) + 'px';
  tip.style.left    = el.offsetLeft + 'px';
  tip.style.display = 'block';
};
window._bkHideHover = function() {
  var t = document.getElementById('bk-slot-tip');
  if (t) t.style.display = 'none';
};

/* ── Update date label on left panel ── */
window._bkUpdLabel = function() {
  if (!window._BKC.selected) return;
  var h    = parseInt((document.getElementById('bk-t-h')    || {value:'8'}).value) || 8;
  var m    = (document.getElementById('bk-t-m')    || {value:'00'}).value;
  var ampm = (document.getElementById('bk-t-ampm') || {value:'AM'}).value;
  var h24  = ampm==='PM' && h<12 ? h+12 : (ampm==='AM' && h===12 ? 0 : h);
  var dtVal= window._BKC.selected + 'T' + String(h24).padStart(2,'0') + ':' + m;

  /* Update hidden field */
  var inp = document.getElementById('bk-datetime');
  if (inp) inp.value = dtVal;

  /* Update display on left panel */
  var d    = new Date(dtVal);
  var disp = d.toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'}) +
             ' at ' + d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  var lbl  = document.getElementById('bk-selected-lbl');
  var box  = document.getElementById('bk-selected-display');
  if (lbl)  { lbl.textContent = disp; lbl.style.color = 'var(--text)'; }
  if (box)  box.style.borderColor = 'var(--green)';
};

/* ── Fetch real bookings from API ── */
window._bkFetchBookings = async function() {
  try {
    var fid  = (document.getElementById('bk-facility') || {value:''}).value;
    var type = (document.getElementById('bk-type')     || {value:''}).value;
    if (!fid) return;
    var start = new Date(window._BKC.year, window._BKC.month, 1).toISOString();
    var end   = new Date(window._BKC.year, window._BKC.month+1, 0, 23, 59).toISOString();
    var res   = await API._fetchDirect(
      '/appointments?facility='+fid+(type?'&visitType='+type:'')+'&from='+encodeURIComponent(start)+'&to='+encodeURIComponent(end)+'&limit=300',
      {method:'GET'}
    );
    window._BKC.bookings = {};
    (res.data||[]).filter(function(a){ return !['cancelled','no_show'].includes(a.status); })
      .forEach(function(a) {
        var d = new Date(a.scheduledAt);
        var k = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
        window._BKC.bookings[k] = (window._BKC.bookings[k]||0)+1;
      });
    window._bkCalDraw();
  } catch(_) {}
};

/* ── Submit booking ── */
window._bkSubmit = async function() {
  var facSel  = document.getElementById('bk-facility');
  var facility= facSel ? facSel.value : '';
  var opt     = facSel && facSel.selectedIndex>=0 ? facSel.options[facSel.selectedIndex] : null;
  var facName = opt ? (opt.getAttribute('data-name')||opt.text||'') : '';
  var type    = (document.getElementById('bk-type')    ||{value:''}).value;
  var dt      = (document.getElementById('bk-datetime')||{value:''}).value;
  var alEl    = document.getElementById('bk-alert');
  var btn     = document.getElementById('bk-submit-btn');

  function showErr(msg) {
    if (!alEl) return;
    alEl.innerHTML = '<i class="ti ti-alert-circle"></i> ' + msg;
    alEl.style.display = 'block';
  }
  if (alEl) alEl.style.display = 'none';

  if (!facility) { showErr('Please select a facility.'); return; }
  if (!type)     { showErr('Please select a visit type.'); return; }
  if (!dt)       { showErr('Please select a date and time from the calendar.'); return; }

  var clinics = ['soweto clinic','bophelong clinic'];
  if (type==='specialist_referral' && clinics.some(function(c){ return facName.toLowerCase().includes(c); })) {
    showErr('Specialist Referral is only available at hospitals. Please select Chris Hani Baragwanath CHC.');
    return;
  }

  /* Validate clinic hours */
  var dtObj = new Date(dt);
  var day   = dtObj.getDay();
  var mins  = dtObj.getHours()*60 + dtObj.getMinutes();
  if (day===0)                       { showErr('The clinic is closed on Sundays.'); return; }
  if (day>=1&&day<=5&&mins<420)      { showErr('Clinic opens at 07:00 on weekdays.'); return; }
  if (day>=1&&day<=5&&mins>=1020)    { showErr('Clinic closes at 17:00 on weekdays.'); return; }
  if (day===6&&mins<420)             { showErr('Clinic opens at 07:00 on Saturdays.'); return; }
  if (day===6&&mins>=780)            { showErr('Clinic closes at 13:00 on Saturdays.'); return; }
  if (dtObj <= new Date())           { showErr('Please select a future date and time.'); return; }

  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner" style="width:16px;height:16px"></div> Booking...'; }

  try {
    var p = await _getMyPatientRecord();
    if (!p) { showErr('Patient record not found. Please complete your profile first.'); return; }

    var labels = {
      consultation:'General Consultation', telemedicine:'Telemedicine', lab:'Lab / Blood Draw',
      immunisation:'Immunisation', mental_health:'Mental Health', follow_up:'Chronic Care Follow-Up',
      maternal_child_health:'Maternal & Child Health', pharmacy_pickup:'Pharmacy Pickup',
      specialist_referral:'Specialist Referral', wellness:'Wellness & Preventive Care'
    };
    var typeLabel = labels[type] || type;
    var dateStr   = dtObj.toLocaleDateString('en-ZA',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    var timeStr   = dtObj.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});

    await API.appointments.create({
      patient:p._id, facility:facility, visitType:type,
      scheduledAt:dtObj.toISOString(), facilityName:facName
    });

    /* Send SMS + email (no token — issued only after check-in) */
    if (p.phone) {
      API._fetchDirect('/notifications/sms',{method:'POST',body:JSON.stringify({
        to:p.phone,
        message:'NIHMS: Your '+typeLabel+' at '+facName+' is confirmed for '+dateStr+' at '+timeStr+'. Check in at the facility to receive your queue number.'
      })}).catch(function(){});
    }
    if (p.email) {
      API._fetchDirect('/notifications/email',{method:'POST',body:JSON.stringify({
        to:p.email, subject:'NIHMS Appointment Confirmed — '+typeLabel,
        html:'<div style="font-family:Arial;max-width:520px;margin:0 auto"><div style="background:linear-gradient(135deg,#0F6E56,#1A4A9B);padding:20px;border-radius:10px 10px 0 0;text-align:center"><h2 style="color:#fff;margin:0">Appointment Confirmed</h2></div><div style="padding:24px;background:#f9f9f9;border-radius:0 0 10px 10px"><p style="margin-bottom:12px">Dear <strong>'+p.firstName+' '+p.lastName+'</strong>,</p><table style="width:100%;border-collapse:collapse;margin:12px 0"><tr><td style="padding:8px;border:1px solid #ddd;background:#f0f0f0;font-weight:600">Visit type</td><td style="padding:8px;border:1px solid #ddd">'+typeLabel+'</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f0f0f0;font-weight:600">Facility</td><td style="padding:8px;border:1px solid #ddd">'+facName+'</td></tr><tr><td style="padding:8px;border:1px solid #ddd;background:#f0f0f0;font-weight:600">Date &amp; time</td><td style="padding:8px;border:1px solid #ddd">'+dateStr+' at '+timeStr+'</td></tr></table><div style="padding:12px;background:#FFF9E6;border-radius:8px;font-size:13px;color:#7A5C10">Your queue number will be sent after you check in at the facility.</div></div></div>'
      })}).catch(function(){});
    }

    /* Show success panel */
    var sd = document.getElementById('bk-success-detail');
    var sc = document.getElementById('bk-success');
    if (sd) sd.innerHTML = '<strong>'+typeLabel+'</strong> at '+facName+'<br>'+dateStr+' at '+timeStr;
    if (sc) { sc.style.display='block'; sc.scrollIntoView({behavior:'smooth',block:'nearest'}); }
    if (btn){ btn.disabled=true; btn.style.opacity='0.5'; }
    setTimeout(function(){ Router.setPage('appointments'); }, 3500);

  } catch(e) {
    showErr(e.message || 'Booking failed. Please try again.');
    if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-calendar-check"></i>Confirm booking'; }
  }
};

/* ══════════════════════════════════════════════════
   PROFILE PICTURE — topbar avatar upload
══════════════════════════════════════════════════ */
window._uploadAvatarFromTopbar = async function(input) {
  var file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { UI.showToast('Photo must be under 2 MB', 'err'); return; }

  var avatarEl = document.getElementById('topbar-avatar');
  if (avatarEl) { avatarEl.style.opacity = '0.5'; }

  try {
    var token = API.Tokens ? API.Tokens.getAccess() : (localStorage.getItem('nihms_access') || '');
    var form  = new FormData();
    form.append('profilePicture', file);

    var res  = await fetch('http://localhost:5000/api/v1/patients/me/upload-profile', {
      method:  'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body:    form
    });
    var data = await res.json();
    if (!data.success) throw new Error(data.message || 'Upload failed');

    var url = 'http://localhost:5000' + data.data.url;
    if (avatarEl) {
      avatarEl.style.opacity   = '1';
      avatarEl.style.padding   = '0';
      avatarEl.style.overflow  = 'hidden';
      avatarEl.innerHTML =
        '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' +
        '<input type="file" id="avatar-file-input" accept=".jpg,.jpeg,.png" style="display:none" onchange="_uploadAvatarFromTopbar(this)">';
    }
    UI.showToast('Profile picture updated!', 'ok');
  } catch(e) {
    if (avatarEl) avatarEl.style.opacity = '1';
    UI.showToast(e.message || 'Upload failed', 'err');
  }
};

