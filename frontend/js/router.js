/**
 * js/router.js
 * ──────────────────────────────────────────────
 * Client-side router.
 *
 * Router.roleConfig  — nav structure per role
 * Router.setRole()   — switch active role
 * Router.setPage()   — navigate to a page
 * Router.current     — { role, page }
 * ──────────────────────────────────────────────
 *
 * TO ADD A NEW ROLE:
 *   1. Add an entry to roleConfig below.
 *   2. Create js/pages/<role>.js and add page functions to Pages{}.
 *   3. Add the <script> tag to index.html.
 *
 * TO ADD A NEW PAGE:
 *   1. Add a nav entry (id, icon, label) under the role in roleConfig.
 *   2. Define Pages['<id>'] = () => `...html...` in the relevant pages file.
 */

const Router = (() => {

  const roleConfig = {
    doctor: {
      label: 'Doctor',
      icon:  'ti-stethoscope',
      default: 'queue',
      nav: [
        { section: 'Today' },
        { id: 'queue',        icon: 'ti-users',           label: 'Queue' },
        { id: 'consult',      icon: 'ti-stethoscope',     label: 'Consult' },
        { id: 'telemedicine', icon: 'ti-video',            label: 'Telemedicine' },
        { section: 'Records' },
        { id: 'patients',     icon: 'ti-user-search',      label: 'Patients' },
        { id: 'lab',          icon: 'ti-flask',            label: 'Lab orders' },
      ]
    },
    nurse: {
      label: 'Nurse',
      icon:  'ti-heart-rate-monitor',
      default: 'queue',
      nav: [
        { section: 'Triage' },
        { id: 'queue',        icon: 'ti-users',            label: 'Queue' },
        { id: 'registration', icon: 'ti-user-plus',        label: 'Registration' },
        { section: 'Records' },
        { id: 'patients',     icon: 'ti-user-search',      label: 'Patients' },
      ]
    },
    patient: {
      label: 'Patient',
      icon:  'ti-user',
      default: 'myhealth',
      nav: [
        { section: 'My health' },
        { id: 'myhealth',     icon: 'ti-heart-rate-monitor', label: 'Overview' },
        { id: 'myprofile',    icon: 'ti-user-edit',          label: 'Edit profile' },
        { id: 'appointments', icon: 'ti-calendar',            label: 'Appointments' },
        { id: 'telemedicine',  icon: 'ti-video',              label: 'Telemedicine' },
        { id: 'myrx',         icon: 'ti-pill',               label: 'Prescriptions' },
        { section: 'Services' },
        { id: 'book',         icon: 'ti-plus',               label: 'Book visit' },
      ]
    },
    pharmacy: {
      label: 'Pharmacist',
      icon:  'ti-pill',
      default: 'rx-queue',
      nav: [
        { section: 'Dispensing' },
        { id: 'rx-queue',  icon: 'ti-list',     label: 'Rx queue' },
        { id: 'stock',     icon: 'ti-package',  label: 'Stock' },
        { section: 'Reports' },
        { id: 'dispensed', icon: 'ti-check',    label: 'Dispensed today' },
      ]
    },
    admin: {
      label: 'Admin',
      icon:  'ti-chart-bar',
      default: 'overview',
      nav: [
        { section: 'Analytics' },
        { id: 'overview',   icon: 'ti-dashboard',          label: 'Overview' },
        { id: 'flow',       icon: 'ti-route',              label: 'Patient flow' },
        { section: 'System' },
        { id: 'facilities', icon: 'ti-building-hospital',  label: 'Facilities' },
        { id: 'users',      icon: 'ti-users',              label: 'Users & roles' },
      ]
    }
  };

  const current = { role: null, page: null };

  function setRole(role) {
    if (!roleConfig[role]) { console.warn('Unknown role:', role); return; }
    current.role = role;
    current.page = roleConfig[role].default;
    // Only admin sees role switcher tabs — all other roles see only their own dashboard
    const tabs = document.getElementById('topbar-roles');
    if (role === 'admin') {
      if (tabs) tabs.style.display = 'flex';
      UI.renderRoleTabs(role);
    } else {
      if (tabs) tabs.style.display = 'none';
    }
    UI.renderSidebar(role, current.page);
    UI.renderContent(current.page);
  }

  function setPage(id) {
    current.page = id;
    UI.renderSidebar(current.role, id);
    UI.renderContent(id);
  }

  return { roleConfig, current, setRole, setPage };

})();

/* Expose globally (called from HTML onclick) */
function setPage(id) { Router.setPage(id); }
