/**
 * js/router.js — NIHMS role-based page router
 * Router.setRole(role) — switch active role + sidebar
 * Router.setPage(id)   — navigate to a page
 * Router.current       — { role, page }
 */
window.Router = (() => {

  /* ── Role → nav config ── */
  const roleConfig = {

    super_admin: {
      label: 'Super Admin', icon: 'ti-globe',
      default: 'super_admin_dashboard',
      nav: [
        { section: 'National' },
        { id: 'super_admin_dashboard', icon: 'ti-layout-dashboard', label: 'National dashboard' },
        { section: 'System' },
        { id: 'facilities',  icon: 'ti-building-hospital', label: 'Facilities' },
        { id: 'users',       icon: 'ti-users',             label: 'All users & roles' },
        { id: 'overview',    icon: 'ti-chart-bar',         label: 'Analytics' },
        { id: 'assistant',   icon: 'ti-robot',             label: 'AI Assistant' },
      ]
    },

    admin: {
      label: 'Admin', icon: 'ti-chart-bar',
      default: 'super_admin_dashboard',
      nav: [
        { section: 'National' },
        { id: 'super_admin_dashboard', icon: 'ti-layout-dashboard', label: 'National dashboard' },
        { section: 'System' },
        { id: 'facilities',  icon: 'ti-building-hospital', label: 'Facilities' },
        { id: 'users',       icon: 'ti-users',             label: 'Users & roles' },
        { id: 'overview',    icon: 'ti-chart-bar',         label: 'Analytics' },
        { id: 'flow',        icon: 'ti-route',             label: 'Patient flow' },
        { id: 'assistant',   icon: 'ti-robot',             label: 'AI Assistant' },
      ]
    },

    facility_admin: {
      label: 'Facility Admin', icon: 'ti-building-hospital',
      default: 'facility_admin',
      nav: [
        { section: 'Facility' },
        { id: 'facility_admin',  icon: 'ti-layout-dashboard', label: 'Facility dashboard' },
        { id: 'queue_dashboard', icon: 'ti-list-numbers',     label: 'Queue management' },
        { section: 'Management' },
        { id: 'users',           icon: 'ti-users-group',      label: 'Staff management' },
        { id: 'facilities',      icon: 'ti-building',         label: 'Facility settings' },
        { id: 'overview',        icon: 'ti-chart-bar',        label: 'Analytics' },
        { id: 'flow',            icon: 'ti-route',            label: 'Patient flow' },
        { id: 'assistant',       icon: 'ti-robot',            label: 'AI Assistant' },
      ]
    },

    doctor: {
      label: 'Doctor', icon: 'ti-stethoscope',
      default: 'doc_dashboard',
      nav: [
        { section: 'Today' },
        { id: 'doc_dashboard',  icon: 'ti-layout-dashboard', label: 'My dashboard' },
        { id: 'queue_dashboard',icon: 'ti-list-numbers',     label: 'Queue management' },
        { id: 'queue',          icon: 'ti-users',            label: 'Patient queue' },
        { section: 'Clinical' },
        { id: 'consult',        icon: 'ti-stethoscope',      label: 'Consultation' },
        { id: 'patients',       icon: 'ti-user-search',      label: 'Patient search' },
        { id: 'lab',            icon: 'ti-flask',            label: 'Lab orders' },
        { id: 'telemedicine',   icon: 'ti-video',            label: 'Telemedicine' },
        { id: 'assistant',      icon: 'ti-robot',            label: 'AI Assistant' },
      ]
    },

    nurse: {
      label: 'Nurse', icon: 'ti-heart-rate-monitor',
      default: 'nurse_dashboard',
      nav: [
        { section: 'Triage' },
        { id: 'nurse_dashboard', icon: 'ti-layout-dashboard', label: 'Triage dashboard' },
        { id: 'queue_dashboard', icon: 'ti-list-numbers',     label: 'Queue management' },
        { id: 'registration',    icon: 'ti-user-plus',        label: 'Patient registration' },
        { id: 'queue',           icon: 'ti-users',            label: 'Queue' },
        { section: 'Tools' },
        { id: 'checkin',         icon: 'ti-login',            label: 'Patient check-in' },
        { id: 'assistant',       icon: 'ti-robot',            label: 'AI Assistant' },
      ]
    },

    receptionist: {
      label: 'Receptionist', icon: 'ti-device-desktop',
      default: 'reception',
      nav: [
        { section: 'Reception' },
        { id: 'reception',       icon: 'ti-layout-dashboard', label: 'Reception desk' },
        { id: 'queue_dashboard', icon: 'ti-list-numbers',     label: 'Queue management' },
        { id: 'registration',    icon: 'ti-user-plus',        label: 'Register patient' },
        { section: 'Tools' },
        { id: 'checkin',         icon: 'ti-login',            label: 'Patient check-in' },
        { id: 'assistant',       icon: 'ti-robot',            label: 'AI Assistant' },
      ]
    },

    lab_worker: {
      label: 'Lab', icon: 'ti-flask',
      default: 'lab_dashboard',
      nav: [
        { section: 'Laboratory' },
        { id: 'lab_dashboard',   icon: 'ti-layout-dashboard', label: 'Lab dashboard' },
        { id: 'queue_dashboard', icon: 'ti-list-numbers',     label: 'Queue' },
        { id: 'assistant',       icon: 'ti-robot',            label: 'AI Assistant' },
      ]
    },

    pharmacy: {
      label: 'Pharmacist', icon: 'ti-pill',
      default: 'rx-queue',
      nav: [
        { id: 'rx-queue',      icon: 'ti-layout-dashboard', label: 'Overview'                },
        { id: 'stock',         icon: 'ti-package-search',   label: 'Stock management'        },
        { id: 'ph-validation', icon: 'ti-shield-check',     label: 'Prescription validation' },
        { id: 'dispensed',     icon: 'ti-clipboard-check',  label: 'Dispensing & labels'     },
        { id: 'ph-queue',      icon: 'ti-users',            label: 'Pharmacy queue'          },
        { id: 'ph-history',    icon: 'ti-history',          label: 'Medication history'      },
        { id: 'ph-suppliers',  icon: 'ti-truck',            label: 'Suppliers & orders'      },
        { id: 'ph-controlled', icon: 'ti-book-lock',        label: 'Controlled register'     },
        { id: 'ph-reminders',  icon: 'ti-bell',             label: 'Refill reminders'        },
        { id: 'ph-analytics',  icon: 'ti-chart-bar',        label: 'Analytics'               },
      ]
    },

    finance: {
      label: 'Finance', icon: 'ti-currency-rand',
      default: 'overview',
      nav: [
        { section: 'Finance' },
        { id: 'overview',    icon: 'ti-chart-bar',        label: 'Overview' },
        { id: 'flow',        icon: 'ti-route',            label: 'Patient flow' },
        { id: 'assistant',   icon: 'ti-robot',            label: 'AI Assistant' },
      ]
    },

    patient: {
      label: 'Patient', icon: 'ti-user',
      default: 'myhealth',
      nav: [
        { section: 'MY HEALTH' },
        { id: 'myhealth',    icon: 'ti-heart-rate',        label: 'Overview' },
        { id: 'myrecords',   icon: 'ti-clipboard-list',    label: 'Medical records' },
        { id: 'appointments',icon: 'ti-calendar-event',    label: 'My appointments' },
        { id: 'billing',     icon: 'ti-credit-card',       label: 'Billing & medical aid' },
        { id: 'assistant',   icon: 'ti-robot',             label: 'AI Assistant' },
      ]
    }
  };

  const current = { role: null, page: null };

  function setRole(role) {
    const cfg = roleConfig[role] || roleConfig['patient'];
    current.role = role;
    current.page = cfg.default;

    // Never show role-switcher tabs — every role sees only their own dashboard
    const tabs = document.getElementById('topbar-roles');
    if (tabs) tabs.style.display = 'none';

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
