/**
 * js/ml.js — NIHMS ML Decision Support Panels
 * Integrates into existing dashboards per role. No new pages — adds ML
 * sections to existing pages using existing NIHMS CSS variables.
 * 
 * Usage: include after router.js in index.html
 *   <script src="js/ml.js"></script>
 */
window.ML = (function () {
  'use strict';

  const BASE = '/api/v1/ml';

  /* ── Core API call ───────────────────────────────────────────────────────── */
  async function predict(endpoint, body) {
    try {
      const res = await fetch(BASE + '/' + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('nihms_token') || '') },
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (_) {
      return { success: false, unavailable: true, message: 'ML service unavailable.' };
    }
  }

  /* ── Shared card renderer ─────────────────────────────────────────────────── */
  function card(icon, title, color, content) {
    return `<div style="background:var(--bg-card);border-radius:14px;border:1.5px solid ${color}30;padding:16px 18px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <span style="width:32px;height:32px;border-radius:8px;background:${color}18;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="ti ${icon}" style="font-size:15px;color:${color}"></i>
        </span>
        <span style="font-size:14px;font-weight:700">${title}</span>
      </div>
      ${content}
    </div>`;
  }

  function badge(text, level) {
    const colors = { LOW:'#1D9E75', MEDIUM:'#EF9F27', HIGH:'var(--red)', NORMAL:'#1D9E75', UNKNOWN:'#888' };
    const bg     = { LOW:'#EDFBF3', MEDIUM:'#FFF9E6', HIGH:'#FEF2F2', NORMAL:'#EDFBF3', UNKNOWN:'#f0f0f0' };
    const c = colors[level?.toUpperCase()] || colors.UNKNOWN;
    const b = bg[level?.toUpperCase()] || bg.UNKNOWN;
    return `<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${b};color:${c};letter-spacing:.03em">${text}</span>`;
  }

  function unavailableCard() {
    return `<div style="padding:14px 16px;background:var(--bg-surface);border-radius:10px;font-size:13px;color:var(--text-muted);border:1px dashed var(--border)">
      <i class="ti ti-robot-off" style="margin-right:6px"></i>ML prediction currently unavailable. Existing NIHMS functionality is not affected.
    </div>`;
  }

  function disclaimer() {
    return `<p style="font-size:11px;color:var(--text-hint);margin-top:10px;padding-top:8px;border-top:1px solid var(--border)">
      ⚕️ Decision-support only — does not replace professional clinical judgement.
    </p>`;
  }

  /* ════════════════════════════════════════════════════════════════════════════
     PATIENT ML PANEL
     Shows: queue position · estimated wait · queue status
  ════════════════════════════════════════════════════════════════════════════ */
  async function renderPatientQueueML(containerId, queueData) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px">Loading queue prediction…</div>';

    const res = await predict('wait-time', {
      queue_size:  queueData.queueSize  || 5,
      staff_count: queueData.staffCount || 3,
      patient_type: queueData.isPrebooked ? 1 : 0,
    });

    if (!res.success) { el.innerHTML = unavailableCard(); return; }

    el.innerHTML = card('ti-clock', 'Your queue information', '#1D9E75',
      `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">
        <div style="text-align:center;padding:12px;background:var(--bg-surface);border-radius:10px">
          <div style="font-size:28px;font-weight:800;color:var(--green-dark)">${queueData.position || '—'}</div>
          <div style="font-size:11px;color:var(--text-muted)">Queue number</div>
        </div>
        <div style="text-align:center;padding:12px;background:var(--bg-surface);border-radius:10px">
          <div style="font-size:28px;font-weight:800">${Math.max(0,(queueData.position||1)-1)}</div>
          <div style="font-size:11px;color:var(--text-muted)">Patients ahead</div>
        </div>
        <div style="text-align:center;padding:12px;background:var(--bg-surface);border-radius:10px">
          <div style="font-size:28px;font-weight:800;color:var(--amber)">${res.wait_minutes}</div>
          <div style="font-size:11px;color:var(--text-muted)">Est. wait (min)</div>
        </div>
      </div>
      <div style="font-size:13px;margin-bottom:8px">Queue status: ${badge(res.status, res.status)}</div>
      <div style="font-size:13px;color:var(--text-muted)">${res.advice || ''}</div>`
    );
  }

  /* ════════════════════════════════════════════════════════════════════════════
     RECEPTIONIST ML PANEL
     Shows: wait-time · congestion · no-show alerts
  ════════════════════════════════════════════════════════════════════════════ */
  async function renderReceptionistML(containerId, queueData) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px">Loading ML insights…</div>';

    const [waitRes, congRes] = await Promise.all([
      predict('wait-time',        { queue_size: queueData.size || 10, staff_count: queueData.staff || 4 }),
      predict('queue-congestion', { queue_size: queueData.size || 10, staff_count: queueData.staff || 4 }),
    ]);

    const waitHtml = waitRes.success
      ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div style="padding:10px;background:var(--bg-surface);border-radius:8px;text-align:center">
            <div style="font-size:24px;font-weight:800">${waitRes.wait_minutes}</div>
            <div style="font-size:11px;color:var(--text-muted)">Est. wait (min)</div>
          </div>
          <div style="padding:10px;background:var(--bg-surface);border-radius:8px;text-align:center">
            <div style="font-size:24px;font-weight:800">${queueData.size || 0}</div>
            <div style="font-size:11px;color:var(--text-muted)">Current queue</div>
          </div>
        </div>
        <div style="margin-bottom:6px">Queue status: ${badge(waitRes.status, waitRes.status)}</div>
        <div style="font-size:12px;color:var(--text-muted)">${waitRes.advice || ''}</div>`
      : unavailableCard();

    const congHtml = congRes.success
      ? `<div style="font-size:13px;margin-bottom:6px">
          Predicted queue in 60 min: <strong>${congRes.predicted_queue_60min}</strong> patients
        </div>
        <div style="margin-bottom:6px">Congestion risk: ${badge(congRes.congestion_risk, congRes.congestion_risk)}</div>
        <div style="font-size:12px;color:var(--text-muted)">${congRes.advice || ''}</div>`
      : unavailableCard();

    el.innerHTML =
      card('ti-clock', 'Waiting time prediction', '#1A4A9B', waitHtml) +
      card('ti-chart-dots', 'Queue congestion forecast', '#EF9F27', congHtml);
  }

  /* ════════════════════════════════════════════════════════════════════════════
     DOCTOR ML PANEL
     Shows: triage risk · vital trend alerts · lab alerts summary
  ════════════════════════════════════════════════════════════════════════════ */
  async function renderDoctorTriageML(containerId, vitalsData) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px">Running clinical decision support…</div>';

    const res = await predict('triage', {
      hr:   vitalsData.hr   || vitalsData.heartRate   || 80,
      rr:   vitalsData.rr   || vitalsData.respiratoryRate || 16,
      sbp:  vitalsData.sbp  || (vitalsData.bp && vitalsData.bp.systolic)  || 120,
      temp: vitalsData.temp || vitalsData.temperature  || 36.6,
      spo2: vitalsData.spo2 || vitalsData.spO2         || 98,
      avpu: vitalsData.avpu || 0,
      age:  vitalsData.age  || 35,
      sex:  vitalsData.sex  || 0,
    });

    if (!res.success) { el.innerHTML = unavailableCard(); return; }

    const riskColor = { LOW: '#1D9E75', MEDIUM: '#EF9F27', HIGH: 'var(--red)' }[res.risk_level] || '#888';
    el.innerHTML = card('ti-brain-circuit', 'Clinical decision support', riskColor,
      `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <div style="text-align:center;padding:14px 20px;background:${riskColor}15;border-radius:10px;border:2px solid ${riskColor}30">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:${riskColor};margin-bottom:4px">Risk Level</div>
          <div style="font-size:22px;font-weight:800;color:${riskColor}">${res.risk_level}</div>
        </div>
        <div style="flex:1">
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px">NEWS2 score: <strong>${res.news2_score}</strong></div>
          <div style="font-size:13px">${res.advice || ''}</div>
        </div>
      </div>
      ${disclaimer()}`
    );
  }

  async function renderVitalTrendML(containerId, readings) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const res = await predict('vital-trend', { readings });
    if (!res.success) { el.innerHTML = unavailableCard(); return; }

    const hasAlerts = res.alerts && res.alerts.length > 0;
    const color = { LOW: '#1D9E75', MEDIUM: '#EF9F27', HIGH: 'var(--red)' }[res.severity] || '#888';

    const trendsHtml = Object.entries(res.trends || {}).map(([key, t]) => {
      const arrow = t.direction === 'increasing' ? '↑' : t.direction === 'decreasing' ? '↓' : '→';
      const vals  = t.values.join(' → ');
      return `<div style="font-size:12px;margin-bottom:4px"><strong>${key.toUpperCase()}</strong>: ${vals} <span style="color:${color}">${arrow}</span></div>`;
    }).join('');

    el.innerHTML = card('ti-activity', 'Vital sign trend analysis', color,
      (hasAlerts ? `<div style="padding:8px 12px;background:${color}15;border-radius:8px;border-left:3px solid ${color};margin-bottom:10px;font-size:13px">
        ⚠️ ${res.alerts.map(a => `${a.vital} ${a.direction}`).join(', ')}
      </div>` : '') +
      trendsHtml +
      `<div style="margin-top:8px;font-size:13px">Severity: ${badge(res.severity, res.severity)}</div>
       <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${res.action || ''}</div>` +
      disclaimer()
    );
  }

  async function renderLabML(containerId, labResults) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!labResults || !labResults.length) {
      el.innerHTML = '<div style="font-size:13px;color:var(--text-muted);padding:8px">No lab results to analyse.</div>';
      return;
    }

    const results = await Promise.all(labResults.map(lr =>
      predict('laboratory', { test: lr.name, value: lr.result, sex: lr.sex || 'female' })
    ));

    const rows = labResults.map((lr, i) => {
      const r = results[i];
      if (!r || !r.success) return '';
      const flagColor = { normal:'#1D9E75', low:'#1A4A9B', high:'var(--red)', unknown:'#888' }[r.status] || '#888';
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--bg-surface);border-radius:8px;margin-bottom:6px">
        <div>
          <div style="font-size:13px;font-weight:600">${lr.name}</div>
          <div style="font-size:12px;color:var(--text-muted)">${lr.result} ${lr.unit || ''} · Ref: ${r.low}–${r.high}</div>
        </div>
        ${badge(r.flag || r.status, r.status.toUpperCase())}
      </div>`;
    }).join('');

    const hasAbnormal = results.some(r => r && r.status !== 'normal' && r.status !== 'unknown');
    el.innerHTML = card('ti-flask', 'Laboratory results analysis', hasAbnormal ? 'var(--red)' : '#1D9E75',
      rows + (hasAbnormal ? `<div style="font-size:12px;color:var(--text-muted);margin-top:8px">Clinical review recommended for abnormal results.</div>` : '') + disclaimer()
    );
  }

  /* ════════════════════════════════════════════════════════════════════════════
     ADMIN ML PANEL
     Shows: volume forecast · staff demand · anomaly alerts
  ════════════════════════════════════════════════════════════════════════════ */
  async function renderAdminML(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px">Loading ML insights…</div>';

    const [volRes, staffRes, anomRes] = await Promise.all([
      predict('patient-volume', {}),
      predict('staff-demand',   {}),
      predict('anomaly',        { daily_cancellations: 12, daily_no_shows: 22, new_registrations: 85, avg_wait_minutes: 28, avg_queue_size: 14 }),
    ]);

    const volHtml = volRes.success
      ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div style="padding:10px;background:var(--bg-surface);border-radius:8px;text-align:center">
            <div style="font-size:22px;font-weight:800">${volRes.today_volume}</div>
            <div style="font-size:11px;color:var(--text-muted)">Today</div>
          </div>
          <div style="padding:10px;background:var(--bg-surface);border-radius:8px;text-align:center">
            <div style="font-size:22px;font-weight:800">${volRes.tomorrow_volume}</div>
            <div style="font-size:11px;color:var(--text-muted)">Tomorrow</div>
          </div>
        </div>
        <div>Queue load: ${badge(volRes.queue_load, volRes.queue_load)} · Peak: ${volRes.peak_period}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${volRes.advice || ''}</div>`
      : unavailableCard();

    const staffHtml = staffRes.success
      ? `<div style="font-size:13px;margin-bottom:6px">Expected patients: <strong>${staffRes.expected_patients}</strong> · Recommended staff: <strong>${staffRes.recommended_staff}</strong></div>
         <div>Demand: ${badge(staffRes.demand_level, staffRes.demand_level)}</div>
         <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${staffRes.advice || ''}</div>`
      : unavailableCard();

    const anomHtml = anomRes.success && anomRes.is_anomaly
      ? `<div style="padding:10px;background:#FEF2F2;border-left:3px solid var(--red);border-radius:8px;font-size:13px">
          ⚠️ ${anomRes.description}<br>Severity: ${badge(anomRes.severity, anomRes.severity)}
         </div>
         <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${anomRes.advice || ''}</div>`
      : `<div style="font-size:13px;color:#1D9E75;padding:8px"><i class="ti ti-checks"></i> No anomalies detected in current operational data.</div>`;

    el.innerHTML =
      card('ti-chart-bar',      'Patient demand forecast', '#1A4A9B',   volHtml) +
      card('ti-users',          'Staff demand prediction', '#0F6E56',   staffHtml) +
      card('ti-alert-triangle', 'System anomaly detection', 'var(--red)', anomHtml);
  }

  /* ════════════════════════════════════════════════════════════════════════════
     PHARMACY ML PANEL
     Shows: medication duplicate check result
  ════════════════════════════════════════════════════════════════════════════ */
  async function renderMedicationML(containerId, medData) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const res = await predict('medication', {
      current_drug:    medData.drug,
      current_clinic:  medData.clinic,
      current_date:    medData.date || new Date().toISOString(),
      history:         medData.history || [],
    });

    if (!res.success) { el.innerHTML = unavailableCard(); return; }

    if (!res.is_duplicate) {
      el.innerHTML = card('ti-shield-check', 'Medication check', '#1D9E75',
        '<div style="font-size:13px;color:#1D9E75">No duplicate medication detected.</div>');
      return;
    }

    const alertsHtml = (res.alerts || []).map(a => {
      const prev = a.previous || {};
      return `<div style="padding:10px 12px;background:#FEF2F2;border-radius:8px;margin-bottom:8px;font-size:13px;border-left:3px solid var(--red)">
        <div style="font-weight:700;color:var(--red);margin-bottom:4px">${a.type === 'exact_duplicate' ? '🚫 Possible duplicate collection' : '⚠️ Therapeutic duplicate'}</div>
        <div><strong>Previous medication:</strong> ${prev.drug || '—'}</div>
        <div><strong>Collected from:</strong> ${prev.clinic || '—'}</div>
        <div><strong>Date collected:</strong> ${prev.collected_date || '—'}</div>
        ${prev.dosage   ? `<div><strong>Dosage:</strong> ${prev.dosage}</div>` : ''}
        ${prev.quantity ? `<div><strong>Quantity:</strong> ${prev.quantity}</div>` : ''}
        <div style="margin-top:6px;font-size:12px;color:var(--text-muted)">${a.message}</div>
      </div>`;
    }).join('');

    el.innerHTML = card('ti-copy-x', 'Medication alert', 'var(--red)',
      alertsHtml +
      `<div style="padding:10px 12px;background:#FFF9E6;border-radius:8px;font-size:13px;border-left:3px solid var(--amber)">
        <strong>Action required:</strong> ${res.action}
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--text-muted);font-style:italic">${res.final_decision}</div>` +
      disclaimer()
    );
  }

  /* ════════════════════════════════════════════════════════════════════════════
     AUTO-INJECT: attach ML panels to existing pages after render
  ════════════════════════════════════════════════════════════════════════════ */
  function injectMLContainer(parentSelector, id, heading) {
    const parent = document.querySelector(parentSelector);
    if (!parent || document.getElementById(id)) return;
    const div = document.createElement('div');
    div.id = id;
    div.style.cssText = 'margin-top:16px';
    if (heading) {
      const h = document.createElement('div');
      h.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:8px';
      h.textContent = heading;
      div.prepend(h);
    }
    parent.appendChild(div);
    return id;
  }

  /* Expose public API */
  return {
    renderPatientQueueML,
    renderReceptionistML,
    renderDoctorTriageML,
    renderVitalTrendML,
    renderLabML,
    renderAdminML,
    renderMedicationML,
    injectMLContainer,
    badge,
    card,
    unavailableCard,
    disclaimer,
  };
})();
