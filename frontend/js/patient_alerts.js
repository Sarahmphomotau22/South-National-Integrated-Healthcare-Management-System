/**
 * js/patient_alerts.js
 * Displays facility alerts (from receptionist) on the patient overview page.
 * Add <script src="js/patient_alerts.js"></script> to index.html
 * This patches Pages['myhealth'] after it loads to inject the alert banner.
 */
(function patchPatientAlerts() {
  // Watch for the myhealth page to render and inject alerts
  const _origSetPage = window.Router?.setPage?.bind(window.Router);
  
  function _injectAlerts() {
    try {
      const u   = API.getStoredUser();
      if (!u || u.role !== 'patient') return;
      const fid = u?.facilityId || u?.facility;
      const all = JSON.parse(localStorage.getItem('nihms_facility_alerts') || '[]');
      const cutoff = Date.now() - 4 * 3600000; // last 4 hours
      const alerts = all.filter(a => a.facilityId === fid && new Date(a.time).getTime() > cutoff);
      if (!alerts.length) return;

      // Find the main content area
      const content = document.getElementById('main-content') || document.querySelector('.main-content') || document.getElementById('app-content');
      if (!content) return;

      // Check if already injected
      if (document.getElementById('nihms-facility-alert-banner')) return;

      const styleMap = {
        general:     { bg:'#EEF2FF', border:'#4A6CF7', ic:'ti-speakerphone', c:'#1A4A9B', label:'Facility Announcement' },
        delay:       { bg:'#FFFBEB', border:'#D97706', ic:'ti-clock-exclamation', c:'#92400E', label:'Delay Notice' },
        emergency:   { bg:'#FEF2F2', border:'#E24B4A', ic:'ti-urgent', c:'#991B1B', label:'Emergency Alert' },
        maintenance: { bg:'var(--bg-surface)', border:'#888', ic:'ti-tool', c:'#555', label:'Maintenance Notice' },
      };

      const banner = document.createElement('div');
      banner.id = 'nihms-facility-alert-banner';
      banner.style.cssText = 'margin-bottom:14px';
      banner.innerHTML = alerts.map(a => {
        const s = styleMap[a.type] || styleMap.general;
        return `<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;margin-bottom:6px;border-radius:10px;background:${s.bg};border-left:4px solid ${s.border}">
          <i class="ti ${s.ic}" style="font-size:18px;color:${s.border};flex-shrink:0;margin-top:1px"></i>
          <div style="flex:1">
            <div style="font-weight:600;font-size:13px;color:${s.c}">${s.label}</div>
            <div style="font-size:13px;color:${s.c};margin-top:2px">${a.msg}</div>
            <div style="font-size:11px;color:${s.border};opacity:.7;margin-top:4px">
              ${new Date(a.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · ${new Date(a.time).toLocaleDateString('en-ZA')}
            </div>
          </div>
          <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:${s.border};font-size:16px;flex-shrink:0;line-height:1"><i class="ti ti-x"></i></button>
        </div>`;
      }).join('');

      // Insert before first child of content
      content.insertBefore(banner, content.firstChild);
    } catch(_) {}
  }

  // Run on every page navigation
  let _lastPage = null;
  setInterval(() => {
    const cur = window.Router?.current?.page;
    if (cur === 'myhealth' && cur !== _lastPage) {
      _lastPage = cur;
      setTimeout(_injectAlerts, 400); // after page renders
    } else if (cur !== 'myhealth') {
      _lastPage = cur;
      const b = document.getElementById('nihms-facility-alert-banner');
      if (b) b.remove();
    }
  }, 500);
})();
