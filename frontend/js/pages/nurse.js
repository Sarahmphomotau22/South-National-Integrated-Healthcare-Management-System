/**
 * js/pages/nurse.js
 * ──────────────────────────────────────────────
 * Page renderers for the Nurse role.
 *
 * Pages registered:
 *   queue        — shared with doctor (reuses doctor.js queue page)
 *   registration — new patient registration form
 * ──────────────────────────────────────────────
 * NOTE: 'queue' and 'patients' pages are shared
 * with the doctor role — they render identically.
 * If you want a nurse-specific queue, rename this page.
 */

if (typeof Pages === 'undefined') window.Pages = {};

/* ═══════════════════════════════
   PAGE: Patient Registration
═══════════════════════════════ */
Pages['registration'] = () => `
  <div class="page-title">Patient registration</div>
  <div class="card">
    <div class="card-title"><i class="ti ti-user-plus"></i>Register new patient</div>
    <div class="two-col">

      <!-- LEFT: Demographics -->
      <div>
        <div class="f-group">
          <label class="f-label">First name</label>
          <input class="f-input" placeholder="Nomsa" />
        </div>
        <div class="f-group">
          <label class="f-label">Last name</label>
          <input class="f-input" placeholder="Dlamini" />
        </div>
        <div class="f-group">
          <label class="f-label">National ID number</label>
          <input class="f-input" placeholder="8203041234083" maxlength="13" />
        </div>
        <div class="f-group">
          <label class="f-label">Date of birth</label>
          <input class="f-input" type="date" />
        </div>
        <div class="f-group">
          <label class="f-label">Gender</label>
          <select class="f-select" style="margin:0">
            <option>Female</option>
            <option>Male</option>
            <option>Non-binary</option>
            <option>Prefer not to say</option>
          </select>
        </div>
        <div class="f-group" style="margin-top:10px">
          <label class="f-label">Blood type</label>
          <select class="f-select" style="margin:0">
            <option>Unknown</option>
            <option>O+</option><option>O-</option>
            <option>A+</option><option>A-</option>
            <option>B+</option><option>B-</option>
            <option>AB+</option><option>AB-</option>
          </select>
        </div>
      </div>

      <!-- RIGHT: Contact + biometric -->
      <div>
        <div class="f-group">
          <label class="f-label">Phone number</label>
          <input class="f-input" placeholder="+27 82 000 0000" />
        </div>
        <div class="f-group">
          <label class="f-label">Address</label>
          <textarea class="f-textarea" style="height:64px" placeholder="Street, suburb, city, province"></textarea>
        </div>
        <div class="f-group">
          <label class="f-label">Allergies</label>
          <input class="f-input" placeholder="e.g. Penicillin, Sulfonamides (or None)" />
        </div>
        <div class="f-group">
          <label class="f-label">Emergency contact name</label>
          <input class="f-input" placeholder="Full name" />
        </div>
        <div class="f-group">
          <label class="f-label">Emergency contact phone</label>
          <input class="f-input" placeholder="+27 82 000 0000" />
        </div>
        <div class="f-group">
          <label class="f-label">Biometric capture</label>
          <button class="btn" style="width:100%"
            onclick="UI.showToast('Fingerprint scanner ready — place finger on sensor','ok')">
            <i class="ti ti-fingerprint"></i>Capture fingerprint
          </button>
        </div>

        <div class="alert-box alert-info" style="margin-top:8px">
          <i class="ti ti-info-circle"></i>
          Patient will receive an SMS with their queue token once registered.
        </div>

        <button class="btn btn-green" style="width:100%;margin-top:6px"
          onclick="UI.showToast('Patient registered successfully — token SMS sent','ok')">
          <i class="ti ti-user-check"></i>Register patient
        </button>
      </div>
    </div>
  </div>

  <!-- Recently registered (today) -->
  <div class="card">
    <div class="card-title"><i class="ti ti-history"></i>Registered today</div>
    <table>
      <tr><th>Time</th><th>Patient</th><th>National ID</th><th>Token</th><th>Status</th></tr>
      ${[
        { time:'07:52', name:'Bongani Zulu',   id:'ZA-6501120456', token:'A-01', status:'Seen',    badge:'badge-green' },
        { time:'08:10', name:'Thandi Khumalo', id:'ZA-9002145678', token:'A-02', status:'Seen',    badge:'badge-green' },
        { time:'08:34', name:'James Naidoo',   id:'ZA-7811230123', token:'A-03', status:'Waiting', badge:'badge-amber' },
        { time:'09:01', name:'Zanele Mokoena', id:'ZA-0109225678', token:'A-04', status:'Waiting', badge:'badge-amber' },
      ].map(r => `
        <tr>
          <td style="font-family:var(--mono);font-size:12px">${r.time}</td>
          <td>${r.name}</td>
          <td style="font-family:var(--mono);font-size:12px;color:var(--text-muted)">${r.id}</td>
          <td><span class="badge badge-blue">${r.token}</span></td>
          <td><span class="badge ${r.badge}">${r.status}</span></td>
        </tr>`).join('')}
    </table>
  </div>`;
