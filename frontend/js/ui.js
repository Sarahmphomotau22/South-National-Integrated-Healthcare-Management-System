/**
 * js/ui.js — UI utility functions
 */
const UI = (() => {

  let _toastTimer = null;

  function showToast(msg, type = 'ok') {
    const el    = document.getElementById('toast');
    const icon  = document.querySelector('#toast i');
    const label = document.getElementById('toast-msg');
    if (!el || !icon || !label) return;
    icon.className    = 'ti ti-' + (type === 'ok' ? 'check' : 'alert-circle');
    label.textContent = msg;
    el.className      = 'show t-' + type;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { el.className = ''; }, 3500);
  }

  function toggleDropdown() {
    const dd = document.getElementById('profile-dropdown');
    if (dd) dd.classList.toggle('open');
  }

  document.addEventListener('click', e => {
    if (!e.target.closest('.user-menu') && !e.target.closest('#profile-dropdown')) {
      const dd = document.getElementById('profile-dropdown');
      if (dd) dd.classList.remove('open');
    }
  });

  function updateTopbar(user) {
    const initials = ((user.firstName || 'U')[0] + (user.lastName || 'S')[0]).toUpperCase();
    const avatar   = document.getElementById('topbar-avatar');
    const name     = document.getElementById('topbar-name');
    const roleTag  = document.getElementById('topbar-role');
    const connText = document.getElementById('conn-text');

    if (avatar)   avatar.textContent   = initials;
    if (name)     name.textContent     = (user.firstName || '') + ' ' + (user.lastName || '');
    if (roleTag)  roleTag.textContent  = (Router.roleConfig[user.role]?.label || user.role) + ' · ' + (user.facilityName || user.facility || '');
    if (connText) connText.textContent = 'Online · ' + (user.facilityName || 'Johannesburg CHC');
  }

  function renderRoleTabs(activeRole) {
    const container = document.getElementById('topbar-roles');
    if (!container) return;
    container.innerHTML = Object.entries(Router.roleConfig).map(([key, cfg]) => `
      <button class="role-tab ${key === activeRole ? 'active' : ''}" onclick="Router.setRole('${key}')">
        <i class="ti ${cfg.icon}" aria-hidden="true"></i>${cfg.label}
      </button>`).join('');
  }

  function renderSidebar(role, activePage) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) { console.error('sidebar element not found'); return; }
    const nav = Router.roleConfig[role]?.nav || [];
    sidebar.innerHTML = nav.map(item => {
      if (item.section) return `<div class="nav-section">${item.section}</div>`;
      return `<div class="nav-item ${item.id === activePage ? 'active' : ''}"
                   onclick="Router.setPage('${item.id}')">
                <i class="ti ${item.icon}" aria-hidden="true"></i>${item.label}
              </div>`;
    }).join('');
  }

  function renderContent(pageId) {
    const content = document.getElementById('content');
    if (!content) { console.error('content element not found'); return; }
    const fn = Pages[pageId];
    if (fn) {
      content.innerHTML = fn();
    } else {
      content.innerHTML = `
        <div class="page-title">${pageId}</div>
        <p style="color:var(--text-muted)">This page is coming soon.</p>`;
    }
  }

  return { showToast, toggleDropdown, updateTopbar, renderRoleTabs, renderSidebar, renderContent };

})();

// Expose globally
function toggleDropdown() { UI.toggleDropdown(); }
