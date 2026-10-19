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
      ]
    },

    facility_admin: {
      label: 'Facility Admin', icon: 'ti-building-hospital',
      default: 'receptionist',
      nav: [
        { section: 'Reception' },
        { id: 'receptionist',    icon: 'ti-layout-dashboard', label: 'Reception desk' },
        { section: 'Facility' },
        { id: 'facility_admin',  icon: 'ti-building-hospital',label: 'Facility dashboard' },
        { section: 'Management' },
        { id: 'users',           icon: 'ti-users-group',      label: 'Staff management' },
        { id: 'facilities',      icon: 'ti-building',         label: 'Facility settings' },
        { id: 'overview',        icon: 'ti-chart-bar',        label: 'Analytics' },
        { id: 'flow',            icon: 'ti-route',            label: 'Patient flow' },
      ]
    },

    doctor: {
      label: 'Doctor', icon: 'ti-stethoscope',
      default: 'doctor',
      nav: [
        { section: 'Today' },
        { id: 'doctor',           icon: 'ti-layout-dashboard',  label: 'Dashboard'         },
        { id: 'doc_appointments', icon: 'ti-calendar-event',    label: 'Appointments'      },
        { id: 'doc_tasks',        icon: 'ti-checkbox',          label: 'Clinical Tasks'    },
        { section: 'Patients' },
        { id: 'patient_file',     icon: 'ti-folder-open',       label: 'Patient File'      },
        { id: 'patients',         icon: 'ti-users',             label: 'Patient 360°'      },
        { id: 'medical_notes',    icon: 'ti-notes',             label: 'Medical Notes'     },
        { section: 'Orders & Results' },
        { id: 'prescriptions',    icon: 'ti-pill',              label: 'Prescriptions'     },
        { id: 'lab',              icon: 'ti-flask',             label: 'Lab Orders'        },
        { id: 'lab_results',      icon: 'ti-chart-bar',         label: 'Lab Results'       },
        { id: 'radiology',        icon: 'ti-camera',            label: 'Radiology'         },
        { id: 'referrals',        icon: 'ti-arrows-exchange',   label: 'Referrals'         },
        { section: 'Communication' },
        { id: 'telemedicine',     icon: 'ti-video',             label: 'Telemedicine'      },
        { id: 'messages',         icon: 'ti-message',           label: 'Messages'          },
        { id: 'notifications',    icon: 'ti-bell',              label: 'Notifications'     },
        { section: 'Documents' },
        { id: 'med_certs',        icon: 'ti-file-certificate',  label: 'Issue Certificate' },
        { id: 'doc_all_certs',    icon: 'ti-certificate',       label: 'Cert Registry'     },
      ]
    },



   nurse: {
      label: 'Nurse', icon: 'ti-heart-rate-monitor',
      default: 'nurse_dashboard',
      nav: [
        { id: 'nurse_dashboard',    icon: 'ti-layout-dashboard', label: 'Dashboard'               },
        { section: 'Queues' },
        { id: 'nurse_queue',        icon: 'ti-heartbeat',        label: 'Vitals Collection Queue' },
        { id: 'nurse_imm_queue',    icon: 'ti-vaccine',          label: 'Immunisation Queue'      },
        { section: 'Work' },
        { id: 'nurse_vitals',       icon: 'ti-heart-rate',       label: 'Record Vitals'           },
        { id: 'nurse_immunisation', icon: 'ti-vaccine',          label: 'Immunisation'            },
        { id: 'nurse_patient_file', icon: 'ti-folder-open',      label: 'Patient File'            },
        { id: 'nurse_messaging',    icon: 'ti-message',          label: 'Messages'                },
        { id: 'nurse_analytics',    icon: 'ti-chart-bar',        label: 'Analytics & AI'          },
      ]
    },

    receptionist: {
      label: 'Receptionist', icon: 'ti-layout-dashboard',
      default: 'receptionist',
      nav: [
        { id: 'receptionist', icon: 'ti-layout-dashboard', label: 'Dashboard' },
      ]
    },

    lab_worker: {
      label: 'Lab', icon: 'ti-flask',
      default: 'lab_worker',
      nav: [
        { section: 'Laboratory' },
        { id: 'lab_worker',   icon: 'ti-layout-dashboard', label: 'Lab dashboard' },
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
