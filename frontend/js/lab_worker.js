/**
 * js/lab_worker.js — NIHMS Lab Worker Workspace
 */

(function () {
  'use strict';

  var C = {
    teal:    '#0f6e56',
    blue:    '#1d4ed8',
    text:    '#0f172a',
    muted:   '#475569',
    border:  '#e2e8f0',
    bg:      '#f8fafc',
    red:     '#dc2626',
    green:   '#16a34a',
    amber:   '#d97706',
    bannerL: '#106b5d',
    bannerR: '#194d96',
  };

  /* ── Active left-nav view: 'dashboard' | 'orders' | 'workflow' ── */
  window._lwView = window._lwView || 'dashboard';

  window._lwRender = function () {
    if (typeof UI !== 'undefined') {
      UI.renderContent('lab_worker');
    }
  };

  function _registerPage() {
    if (typeof window.Pages === 'undefined') window.Pages = {};
    window.Pages['lab_worker'] = function () { return _dLabWorker(); };
  }
  _registerPage();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _registerPage);
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS
  ═══════════════════════════════════════════════════════ */
  function lwCard(title, content, mb) {
    mb = mb || '16px';
    return '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:20px 24px;margin-bottom:'+mb+'">' +
      (title ? '<div style="font-size:13px;font-weight:700;color:'+C.text+';margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid '+C.border+'">'+title+'</div>' : '') +
      content +
    '</div>';
  }

  function lwRO(label, val) {
    return '<div style="margin-bottom:10px">' +
      '<div style="font-size:11px;font-weight:600;color:'+C.muted+';margin-bottom:3px;text-transform:uppercase;letter-spacing:.5px">'+label+'</div>' +
      '<div style="font-size:13px;color:'+C.text+';font-weight:500;padding:8px 12px;background:#f8fafc;border:1px solid '+C.border+';border-radius:8px">'+val+'</div>' +
    '</div>';
  }

  function lwInput(label, id, type, ph, val, req) {
    type = type || 'text'; val = val || ''; ph = ph || '';
    return '<div style="margin-bottom:12px">' +
      '<label style="display:block;font-size:12px;font-weight:600;color:'+C.text+';margin-bottom:5px">'+label+(req ? '<span style="color:'+C.red+'"> *</span>' : '')+'</label>' +
      '<input id="'+id+'" type="'+type+'" value="'+val+'" placeholder="'+ph+'"' +
        ' style="width:100%;padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;outline:none;background:#fff"' +
        ' onfocus="this.style.borderColor=\'#1d4ed8\'" onblur="this.style.borderColor=\''+C.border+'\'">' +
    '</div>';
  }

  function lwGrid(items) {
    return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px">'+items.join('')+'</div>';
  }

  function lwInfo(icon, msg, bg, bd, color) {
    bg = bg || '#f0fdf4'; bd = bd || '#86efac'; color = color || '#065f46';
    return '<div style="background:'+bg+';border:1px solid '+bd+';border-radius:10px;padding:12px 16px;display:flex;align-items:flex-start;gap:10px;margin-top:4px">' +
      '<span style="font-size:18px;line-height:1.2">'+icon+'</span>' +
      '<div style="font-size:12px;color:'+color+';line-height:1.6">'+msg+'</div>' +
    '</div>';
  }

  function lwRadio(name, val, label, checked, desc) {
    var uid = name + '-' + val.replace(/\s+/g, '');
    return '<label for="'+uid+'" style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border:1.5px solid '+(checked ? C.teal : C.border)+';border-radius:9px;margin-bottom:8px;cursor:pointer;background:'+(checked ? '#f0fdf4' : '#fff')+'">' +
      '<input type="radio" id="'+uid+'" name="'+name+'" value="'+val+'"'+(checked ? ' checked' : '')+' style="margin-top:2px;accent-color:'+C.teal+'">' +
      '<div>' +
        '<div style="font-size:13px;font-weight:600;color:'+C.text+'">'+label+'</div>' +
        (desc ? '<div style="font-size:11px;color:'+C.muted+';margin-top:2px">'+desc+'</div>' : '') +
      '</div>' +
    '</label>';
  }

  function lwCheck(id, label) {
    return '<label for="'+id+'" style="display:flex;align-items:center;gap:10px;padding:9px 14px;border:1px solid '+C.border+';border-radius:8px;margin-bottom:8px;cursor:pointer;background:#fff">' +
      '<input type="checkbox" id="'+id+'" style="width:16px;height:16px;accent-color:'+C.teal+'">' +
      '<span style="font-size:13px;color:'+C.text+'">'+label+'</span>' +
    '</label>';
  }

  function lwTracker(activeIdx) {
    var steps = ['Order Received','Specimen Accepted','Test Processing','Pending Validation','Validated','Released to Doctor'];
    return '<div style="margin-bottom:20px">' +
      '<div style="font-size:12px;font-weight:700;color:'+C.muted+';margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">Workflow Progress</div>' +
      '<div style="position:relative">' +
        '<div style="position:absolute;top:14px;left:14px;right:14px;height:2px;background:'+C.border+';z-index:0"></div>' +
        '<div style="display:flex;justify-content:space-between;position:relative;z-index:1">' +
        steps.map(function (s, i) {
          var done   = i < activeIdx;
          var active = i === activeIdx;
          var dotBg  = done ? C.teal : (active ? C.blue : '#e2e8f0');
          var dotTxt = (done || active) ? '#fff' : C.muted;
          var lTxt   = done ? C.teal : (active ? C.blue : C.muted);
          var lW     = active ? '700' : (done ? '600' : '400');
          return '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1">' +
            '<div style="width:28px;height:28px;border-radius:50%;background:'+dotBg+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:'+dotTxt+'">'+(done ? '✓' : (i+1))+'</div>' +
            '<div style="font-size:10px;font-weight:'+lW+';color:'+lTxt+';text-align:center;max-width:70px">'+s+'</div>' +
          '</div>';
        }).join('') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ═══════════════════════════════════════════════════════
     LEFT SIDEBAR
  ═══════════════════════════════════════════════════════ */
  function labNav(label, icon, viewName) {
    var active = (window._lwView === viewName);
    return '<button onclick="window._lwView=\''+viewName+'\';window._labWsForm=1;window._lwRender()" style="display:flex;align-items:center;gap:9px;width:100%;padding:9px 14px;border:none;' +
      'background:'+(active ? '#e8f5f1' : 'transparent')+';' +
      'color:'+(active ? C.teal : C.text)+';' +
      'font-size:13px;font-weight:'+(active ? '700' : '500')+';' +
      'cursor:pointer;text-align:left;font-family:inherit;' +
      'border-right:3px solid '+(active ? C.teal : 'transparent')+';border-radius:0">' +
      '<span style="font-size:15px;width:18px;text-align:center">'+icon+'</span>' +
      '<span style="flex:1">'+label+'</span>' +
    '</button>';
  }

  /* ═══════════════════════════════════════════════════════
     VIEW: DASHBOARD
  ═══════════════════════════════════════════════════════ */
  function viewDashboard() {
    function statCard(num, label, icon, iconColor, badge) {
      return '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:22px 24px;position:relative;min-width:0">' +
        (badge ? '<div style="position:absolute;top:14px;right:14px;font-size:11px;font-weight:700;color:'+C.blue+';background:#eff6ff;padding:3px 10px;border-radius:20px;border:1px solid #bfdbfe">'+badge+'</div>' : '') +
        '<div style="font-size:26px;margin-bottom:8px">'+icon+'</div>' +
        '<div style="font-size:32px;font-weight:800;color:'+C.text+';line-height:1;margin-bottom:6px">'+num+'</div>' +
        '<div style="font-size:13px;color:'+C.muted+';font-weight:500">'+label+'</div>' +
      '</div>';
    }

    var recentRows = [
      { id:'LAB-2026-0142', patient:'Thabo Mokoena',  test:'Full Blood Count',  priority:'Routine',   status:'Completed',        sc:'#d1fae5', tc:'#065f46' },
      { id:'LAB-2026-0143', patient:'Lerato Mokwena', test:'Malaria Test',       priority:'Urgent',    status:'Processing',       sc:'#dbeafe', tc:'#1e40af' },
      { id:'LAB-2026-0144', patient:'Nomsa Dlamini',  test:'Blood Glucose',      priority:'Routine',   status:'Awaiting specimen',sc:'#fef9c3', tc:'#854d0e' },
      { id:'LAB-2026-0145', patient:'Sipho Nkosi',    test:'Electrolytes',       priority:'Emergency', status:'Priority review',  sc:'#fee2e2', tc:'#991b1b' },
    ];

    var tableRows = recentRows.map(function(r) {
      var priColor = r.priority === 'Emergency' ? '#dc2626' : r.priority === 'Urgent' ? '#d97706' : C.muted;
      return '<tr style="border-bottom:1px solid '+C.border+'">' +
        '<td style="padding:11px 14px;font-size:13px;font-weight:600;color:'+C.teal+'">'+r.id+'</td>' +
        '<td style="padding:11px 14px;font-size:13px;color:'+C.text+';font-weight:500">'+r.patient+'</td>' +
        '<td style="padding:11px 14px;font-size:13px;color:'+C.text+'">'+r.test+'</td>' +
        '<td style="padding:11px 14px;font-size:12px;font-weight:700;color:'+priColor+'">'+r.priority+'</td>' +
        '<td style="padding:11px 14px"><span style="font-size:12px;font-weight:600;background:'+r.sc+';color:'+r.tc+';padding:3px 10px;border-radius:20px">'+r.status+'</span></td>' +
        '<td style="padding:11px 14px"><button onclick="window._lwView=\'orders\';window._lwRender()" style="font-size:12px;color:'+C.teal+';background:none;border:1px solid '+C.teal+';border-radius:6px;padding:4px 10px;cursor:pointer;font-family:inherit;font-weight:600">View</button></td>' +
      '</tr>';
    }).join('');

    return '<div style="padding:24px;overflow-y:auto;height:100%">' +

      '<div style="margin-bottom:20px">' +
        '<div style="font-size:20px;font-weight:800;color:'+C.text+'">Laboratory Dashboard</div>' +
        '<div style="font-size:13px;color:'+C.muted+';margin-top:3px">Johannesburg CHC · Laboratory Services — Today</div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px">' +
        statCard('24', 'New Lab Orders',      '📋', C.blue,    'Today') +
        statCard('12', 'Awaiting Specimens',  '🧪', '#d97706', null)    +
        statCard('8',  'Processing',          '⚗️',  '#7c3aed', null)    +
        statCard('18', 'Results Completed',   '✅', C.teal,   null)    +
      '</div>' +

      lwCard('Recent Orders',
        '<table style="width:100%;border-collapse:collapse">' +
          '<thead><tr style="background:#f8fafc">' +
            ['Order ID','Patient','Test','Priority','Status',''].map(function(h){
              return '<th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:'+C.muted+';border-bottom:1.5px solid '+C.border+';text-transform:uppercase;letter-spacing:.5px">'+h+'</th>';
            }).join('') +
          '</tr></thead>' +
          '<tbody>'+tableRows+'</tbody>' +
        '</table>' +
        '<div style="text-align:right;margin-top:12px">' +
          '<button onclick="window._lwView=\'orders\';window._lwRender()" style="font-size:13px;font-weight:600;color:'+C.teal+';background:none;border:none;cursor:pointer;font-family:inherit">View all orders →</button>' +
        '</div>'
      ) +

    '</div>';
  }

  /* ═══════════════════════════════════════════════════════
     VIEW: LAB ORDERS TABLE
  ═══════════════════════════════════════════════════════ */
  function viewOrders() {
    var orders = [
      { id:'LAB-2026-0142', patient:'Thabo Mokoena',  patId:'PT-00231', test:'Full Blood Count',      category:'Haematology',  priority:'Routine',   status:'Completed',         doctor:'Dr A. Molefe',   date:'11 Oct 2026' },
      { id:'LAB-2026-0143', patient:'Lerato Mokwena', patId:'PT-00198', test:'Malaria Test',           category:'Microbiology', priority:'Urgent',    status:'Processing',        doctor:'Dr B. Khumalo',  date:'11 Oct 2026' },
      { id:'LAB-2026-0144', patient:'Nomsa Dlamini',  patId:'PT-00312', test:'Blood Glucose',          category:'Chemistry',    priority:'Routine',   status:'Awaiting specimen', doctor:'Dr A. Molefe',   date:'11 Oct 2026' },
      { id:'LAB-2026-0145', patient:'Sipho Nkosi',    patId:'PT-00089', test:'Electrolytes',           category:'Chemistry',    priority:'Emergency', status:'Priority review',   doctor:'Dr C. Naidoo',   date:'11 Oct 2026' },
      { id:'LAB-2026-0139', patient:'Zanele Moyo',    patId:'PT-00445', test:'Liver Function Tests',   category:'Chemistry',    priority:'Routine',   status:'Completed',         doctor:'Dr B. Khumalo',  date:'10 Oct 2026' },
      { id:'LAB-2026-0138', patient:'Kagiso Sithole', patId:'PT-00367', test:'HIV Rapid Test',         category:'Immunology',   priority:'Urgent',    status:'Completed',         doctor:'Dr C. Naidoo',   date:'10 Oct 2026' },
      { id:'LAB-2026-0137', patient:'Busi Ntuli',     patId:'PT-00501', test:'Urine MCS',              category:'Microbiology', priority:'Routine',   status:'Completed',         doctor:'Dr A. Molefe',   date:'10 Oct 2026' },
      { id:'LAB-2026-0136', patient:'Andile Dube',    patId:'PT-00278', test:'Thyroid Function (TSH)', category:'Chemistry',    priority:'Routine',   status:'Awaiting specimen', doctor:'Dr B. Khumalo',  date:'10 Oct 2026' },
    ];

    var statusColors = {
      'Completed':         { bg:'#d1fae5', tc:'#065f46' },
      'Processing':        { bg:'#dbeafe', tc:'#1e40af' },
      'Awaiting specimen': { bg:'#fef9c3', tc:'#854d0e' },
      'Priority review':   { bg:'#fee2e2', tc:'#991b1b' },
    };

    var priorityColors = {
      'Emergency': '#dc2626',
      'Urgent':    '#d97706',
      'Routine':   C.muted,
    };

    var tableRows = orders.map(function(o) {
      var sc = statusColors[o.status] || { bg:'#f1f5f9', tc:C.muted };
      var pc = priorityColors[o.priority] || C.muted;
      return '<tr class="lw-order-row" style="border-bottom:1px solid '+C.border+';cursor:pointer" ' +
        'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'#fff\'">' +
        '<td style="padding:12px 14px;font-size:13px;font-weight:600;color:'+C.teal+'">'+o.id+'</td>' +
        '<td style="padding:12px 14px">' +
          '<div style="font-size:13px;font-weight:600;color:'+C.text+'">'+o.patient+'</div>' +
          '<div style="font-size:11px;color:'+C.muted+'">'+o.patId+'</div>' +
        '</td>' +
        '<td style="padding:12px 14px">' +
          '<div style="font-size:13px;color:'+C.text+'">'+o.test+'</div>' +
          '<div style="font-size:11px;color:'+C.muted+'">'+o.category+'</div>' +
        '</td>' +
        '<td style="padding:12px 14px;font-size:12px;font-weight:700;color:'+pc+'">'+o.priority+'</td>' +
        '<td style="padding:12px 14px"><span style="font-size:12px;font-weight:600;background:'+sc.bg+';color:'+sc.tc+';padding:3px 10px;border-radius:20px;white-space:nowrap">'+o.status+'</span></td>' +
        '<td style="padding:12px 14px;font-size:13px;color:'+C.text+'">'+o.doctor+'</td>' +
        '<td style="padding:12px 14px;font-size:12px;color:'+C.muted+'">'+o.date+'</td>' +
        '<td style="padding:12px 14px">' +
          '<button onclick="window._lwView=\'workflow\';window._labWsForm=1;window._lwRender()" ' +
            'style="font-size:12px;font-weight:600;color:#fff;background:'+C.teal+';border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-family:inherit">Process</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    return '<div style="padding:24px;overflow-y:auto;height:100%;display:flex;flex-direction:column">' +

      /* Header */
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-shrink:0">' +
        '<div>' +
          '<div style="font-size:20px;font-weight:800;color:'+C.text+'">Laboratory Orders</div>' +
          '<div style="font-size:13px;color:'+C.muted+';margin-top:2px">All incoming and active lab requests</div>' +
        '</div>' +
        '<button onclick="window._lwView=\'workflow\';window._labWsForm=1;window._lwRender()" ' +
          'style="padding:10px 18px;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56,#1A4A9B);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">' +
          '+ New Order' +
        '</button>' +
      '</div>' +

      /* Search & Filters */
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;padding:16px 20px;margin-bottom:16px;flex-shrink:0">' +
        '<div style="font-size:12px;font-weight:700;color:'+C.muted+';margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px">Search &amp; Filter</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">' +
          '<div style="position:relative">' +
            '<span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:'+C.muted+';font-size:14px">🔍</span>' +
            '<input id="lw-search-name" placeholder="Patient name or ID" style="width:100%;padding:9px 12px 9px 32px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;outline:none" onfocus="this.style.borderColor=\'#1d4ed8\'" onblur="this.style.borderColor=\''+C.border+'\'">' +
          '</div>' +
          '<div style="position:relative">' +
            '<span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:'+C.muted+';font-size:14px">🔍</span>' +
            '<input id="lw-search-orderid" placeholder="Order number (LAB-2026-...)" style="width:100%;padding:9px 12px 9px 32px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;outline:none" onfocus="this.style.borderColor=\'#1d4ed8\'" onblur="this.style.borderColor=\''+C.border+'\'">' +
          '</div>' +
          '<input id="lw-filter-date" type="date" style="padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;outline:none;color:'+C.text+'">' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px">' +
          _filterSelect('lw-filter-doctor', 'Ordering doctor', ['All doctors','Dr A. Molefe','Dr B. Khumalo','Dr C. Naidoo']) +
          _filterSelect('lw-filter-category', 'Test category', ['All categories','Haematology','Chemistry','Microbiology','Immunology','Histology']) +
          _filterSelect('lw-filter-priority', 'Priority', ['All priorities','Emergency','Urgent','Routine']) +
          _filterSelect('lw-filter-status', 'Status', ['All statuses','Awaiting specimen','Processing','Priority review','Completed']) +
        '</div>' +
      '</div>' +

      /* Table */
      '<div style="background:#fff;border:1.5px solid '+C.border+';border-radius:12px;overflow:hidden;flex:1">' +
        '<table style="width:100%;border-collapse:collapse">' +
          '<thead><tr style="background:#f8fafc;border-bottom:2px solid '+C.border+'">' +
            ['Order ID','Patient','Test / Category','Priority','Status','Ordering Doctor','Date','Action'].map(function(h){
              return '<th style="padding:11px 14px;text-align:left;font-size:11px;font-weight:700;color:'+C.muted+';text-transform:uppercase;letter-spacing:.5px;white-space:nowrap">'+h+'</th>';
            }).join('') +
          '</tr></thead>' +
          '<tbody>'+tableRows+'</tbody>' +
        '</table>' +
      '</div>' +

      /* Footer */
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;flex-shrink:0">' +
        '<div style="font-size:13px;color:'+C.muted+'">Showing 8 of 24 orders today</div>' +
        '<div style="display:flex;gap:6px">' +
          '<button style="padding:6px 12px;border:1.5px solid '+C.border+';border-radius:6px;background:#fff;font-size:13px;color:'+C.muted+';cursor:pointer;font-family:inherit">← Prev</button>' +
          '<button style="padding:6px 14px;border:none;border-radius:6px;background:'+C.teal+';font-size:13px;color:#fff;font-weight:700;cursor:pointer;font-family:inherit">1</button>' +
          '<button style="padding:6px 12px;border:1.5px solid '+C.border+';border-radius:6px;background:#fff;font-size:13px;color:'+C.muted+';cursor:pointer;font-family:inherit">2</button>' +
          '<button style="padding:6px 12px;border:1.5px solid '+C.border+';border-radius:6px;background:#fff;font-size:13px;color:'+C.muted+';cursor:pointer;font-family:inherit">Next →</button>' +
        '</div>' +
      '</div>' +

    '</div>';
  }

  function _filterSelect(id, ph, opts) {
    return '<select id="'+id+'" style="width:100%;padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;outline:none;color:'+C.text+';background:#fff">' +
      opts.map(function(o){ return '<option>'+o+'</option>'; }).join('') +
    '</select>';
  }

  /* ═══════════════════════════════════════════════════════
     VIEW: WORKFLOW (3-step specimen processing)
  ═══════════════════════════════════════════════════════ */
  var ORDER = {
    id:        'LAB-2026-0142',
    specimen:  'SP-2026-0142',
    patient:   'Thabo Mokoena',
    patId:     'PT-00231',
    dob:       '12 Mar 1985',
    gender:    'Male',
    doctor:    'Dr A. Molefe',
    facility:  'Johannesburg CHC · Laboratory Services',
    test:      'Full Blood Count (FBC)',
    priority:  'Routine',
    ordered:   '11 Oct 2026 08:42',
    received:  '11 Oct 2026 09:15',
    collTime:  '09:05',
    barcode:   'BC-2026-0142-EDTA',
    report:    'RPT-2026-0142',
  };

  function tabBtn(n, label, icon) {
    var f = window._labWsForm || 1;
    var active = (f === n);
    return '<button onclick="window._labWsForm='+n+';window._lwRender()" ' +
      'style="flex:1;padding:9px 6px;border:none;' +
      'border-bottom:2px solid '+(active ? C.teal : 'transparent')+';' +
      'background:'+(active ? '#f0fdf4' : 'transparent')+';' +
      'color:'+(active ? C.teal : C.muted)+';' +
      'font-size:12px;font-weight:'+(active ? '700' : '500')+';' +
      'cursor:pointer;font-family:inherit;text-align:center">' +
      icon+' '+label +
    '</button>';
  }

  function rightSidebarWorkflow() {
    var f = window._labWsForm || 1;
    var stepDesc = f === 1
      ? '<strong style="color:'+C.text+'">Step 1 – Receive Specimen</strong><br>Verify and accept the specimen before testing.'
      : f === 2
        ? '<strong style="color:'+C.text+'">Step 2 – Process &amp; Enter Results</strong><br>Run the test and record analytical results.'
        : '<strong style="color:'+C.text+'">Step 3 – Validate &amp; Release</strong><br>Review, approve, and release results to the requesting clinician.';

    return '<div style="width:230px;flex-shrink:0;background:#fff;border-left:1px solid '+C.border+';display:flex;flex-direction:column;overflow-y:auto">' +
      lwCard('',
        '<div style="font-size:12px;font-weight:700;color:'+C.teal+';margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Current Order</div>' +
        '<div style="display:flex;flex-direction:column;gap:5px">' +
          '<div style="font-size:12px;color:'+C.muted+'">Order ID</div>' +
          '<div style="font-size:13px;font-weight:700;color:'+C.text+'">'+ORDER.id+'</div>' +
          '<div style="font-size:12px;color:'+C.muted+';margin-top:3px">Patient</div>' +
          '<div style="font-size:13px;font-weight:600;color:'+C.text+'">'+ORDER.patient+'</div>' +
          '<div style="font-size:11px;color:'+C.muted+'">'+ORDER.patId+'</div>' +
          '<div style="font-size:12px;color:'+C.muted+';margin-top:3px">Requested Test</div>' +
          '<div style="font-size:13px;font-weight:600;color:'+C.text+'">'+ORDER.test+'</div>' +
          '<div style="margin-top:6px"><span style="font-size:11px;font-weight:700;background:#f0fdf4;color:#166534;padding:3px 10px;border-radius:10px;border:1px solid #86efac">'+ORDER.priority+'</span></div>' +
          '<div style="font-size:11px;color:'+C.muted+';margin-top:4px">Ordered: '+ORDER.ordered+'</div>' +
        '</div>'
      , '0') +
      '<div style="border-top:1px solid '+C.border+';border-bottom:1px solid '+C.border+'">' +
        '<div style="font-size:11px;font-weight:700;color:'+C.muted+';padding:8px 14px 4px;text-transform:uppercase;letter-spacing:.5px">Workflow Steps</div>' +
        '<div style="display:flex">' +
          tabBtn(1, 'Receive',  '1️⃣') +
          tabBtn(2, 'Results',  '2️⃣') +
          tabBtn(3, 'Validate', '3️⃣') +
        '</div>' +
      '</div>' +
      '<div style="padding:14px;font-size:12px;color:'+C.muted+';line-height:1.6">'+stepDesc+'</div>' +
    '</div>';
  }

  function form1() {
    return '<div style="padding:20px 24px;overflow-y:auto;height:100%">' +
      '<div style="margin-bottom:20px">' +
        '<div style="font-size:18px;font-weight:800;color:'+C.text+'">Receive Specimen</div>' +
        '<div style="font-size:13px;color:'+C.muted+';margin-top:3px">Verify and accept the specimen before testing</div>' +
      '</div>' +
      lwTracker(1) +
      lwCard('Section A · Order Verification',
        lwGrid([
          lwInput('Order ID',     'lw-order-id', 'text','e.g. LAB-2026-0001', ORDER.id,      true),
          lwInput('Patient ID',   'lw-pat-id',   'text','e.g. PT-00000',       ORDER.patId,   true),
          lwInput('Patient Name', 'lw-pat-name', 'text','Full name',           ORDER.patient, true),
          lwRO('Ordering Doctor', ORDER.doctor),
        ]) +
        lwRO('Requested Test / Panel', ORDER.test) +
        '<div style="font-size:12px;color:'+C.muted+';background:#f8fafc;border:1px solid '+C.border+';border-radius:8px;padding:10px 14px;margin-top:4px">' +
          '⚠️ Confirm the order ID and patient details match the physical request form and specimen label before proceeding.' +
        '</div>'
      ) +
      lwCard('Section B · Specimen Receipt',
        lwGrid([
          lwInput('Specimen Barcode / ID','lw-spec-id',   'text','Scan or enter barcode',ORDER.barcode,true),
          lwInput('Collection Date',      'lw-coll-date', 'date','',                     '',           false),
          lwInput('Collection Time',      'lw-coll-time', 'time','HH:MM',                ORDER.collTime,true),
          lwInput('Received Date',        'lw-recv-date', 'date','',                     '',           false),
          lwInput('Received Time',        'lw-recv-time', 'time','HH:MM',                '',           true),
        ]) +
        '<div style="margin-bottom:14px">' +
          '<div style="font-size:12px;font-weight:600;color:'+C.text+';margin-bottom:8px">Specimen Type <span style="color:'+C.red+'">*</span></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
            lwRadio('spec-type','edta', 'EDTA Whole Blood',true, 'Purple-top tube · haematology') +
            lwRadio('spec-type','serum','Serum',           false,'Red/gold-top tube · biochemistry') +
            lwRadio('spec-type','urine','Urine',           false,'Mid-stream, universal container') +
            lwRadio('spec-type','stool','Stool',           false,'Faecal specimen container') +
            lwRadio('spec-type','swab', 'Swab',            false,'Wound, throat, or nasal swab') +
            lwRadio('spec-type','other','Other',           false,'See additional notes') +
          '</div>' +
        '</div>' +
        '<div style="margin-bottom:14px">' +
          '<div style="font-size:12px;font-weight:600;color:'+C.text+';margin-bottom:8px">Specimen Condition <span style="color:'+C.red+'">*</span></div>' +
          lwRadio('spec-cond','acceptable','Acceptable',     true, 'Specimen meets quality requirements for testing') +
          lwRadio('spec-cond','review',    'Requires Review',false,'Specimen has minor quality issues — document and escalate') +
          lwRadio('spec-cond','rejected',  'Rejected',       false,'Specimen fails quality requirements — request recollection') +
        '</div>' +
        '<div>' +
          '<label style="display:block;font-size:12px;font-weight:600;color:'+C.text+';margin-bottom:5px">Additional Notes</label>' +
          '<textarea id="lw-spec-notes" rows="3" placeholder="Any observations, anomalies or special handling instructions…" style="width:100%;padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;outline:none;resize:vertical"></textarea>' +
        '</div>'
      ) +
      lwInfo('✅','<strong>Next Workflow Status</strong><br>Specimen accepted — order status changes to <strong>Specimen Accepted</strong>.','#f0fdf4','#86efac','#065f46') +
      '<div style="display:flex;gap:10px;margin-top:20px;padding-bottom:20px">' +
        '<button onclick="window._labWsForm=2;window._lwRender()" style="flex:1;padding:12px 0;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56,#1A4A9B);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Accept Specimen &amp; Continue →</button>' +
        '<button onclick="window._lwView=\'orders\';window._lwRender()" style="padding:12px 20px;border-radius:10px;border:1.5px solid '+C.border+';background:#fff;color:'+C.muted+';font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Cancel</button>' +
      '</div>' +
    '</div>';
  }

  function form2() {
    var rows = [
      ['Haemoglobin (Hb)',       'g/dL',    '13.5 – 17.5'],
      ['White Blood Cells (WBC)','×10⁹/L','4.0 – 11.0'],
      ['Platelets',              '×10⁹/L','150 – 400'],
      ['Red Blood Cells (RBC)',  '×10¹²/L','4.5 – 5.9'],
      ['Haematocrit (Hct)',      '%',       '41 – 53'],
      ['MCV',                    'fL',      '80 – 100'],
      ['MCH',                    'pg',      '27 – 33'],
      ['MCHC',                   'g/dL',    '32 – 36'],
      ['Neutrophils',            '%',       '50 – 70'],
      ['Lymphocytes',            '%',       '20 – 40'],
    ];
    return '<div style="padding:20px 24px;overflow-y:auto;height:100%">' +
      '<div style="margin-bottom:20px">' +
        '<div style="font-size:18px;font-weight:800;color:'+C.text+'">Process Test &amp; Enter Results</div>' +
        '<div style="font-size:13px;color:'+C.muted+';margin-top:3px">Run the test and record analytical results</div>' +
      '</div>' +
      lwTracker(2) +
      '<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:12px;margin-bottom:16px">' +
        '<span style="font-size:20px">🧫</span>' +
        '<div><div style="font-size:13px;font-weight:700;color:#065f46">Specimen Accepted</div><div style="font-size:12px;color:#166534">'+ORDER.specimen+' · EDTA Whole Blood · Received '+ORDER.received+'</div></div>' +
      '</div>' +
      lwCard('Section A · Test Processing',
        lwGrid([
          lwRO('Test Panel', ORDER.test),
          lwInput('Processing Status',    'lw-proc-status','text','','In Progress',true),
          lwInput('Test Date',            'lw-test-date',  'date','','',           false),
          lwInput('Analyser / Equipment', 'lw-analyser',   'text','e.g. BC-5000 #2','',false),
          lwInput('Technician / Staff ID','lw-tech-id',    'text','e.g. LT-0042','',false),
          lwInput('Run / Batch ID',       'lw-batch-id',   'text','Optional','',  false),
        ])
      ) +
      lwCard('Section B · Haematology Results — Full Blood Count',
        '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
          '<thead><tr style="background:#f8fafc">' +
            ['Analyte','Result','Unit','Reference Range'].map(function(h){
              return '<th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:'+C.muted+';border-bottom:1px solid '+C.border+';text-transform:uppercase;letter-spacing:.5px">'+h+'</th>';
            }).join('') +
          '</tr></thead>' +
          '<tbody>' +
          rows.map(function(r,i){
            return '<tr style="background:'+(i%2===0?'#fff':'#f8fafc')+'">' +
              '<td style="padding:8px 10px;font-weight:500;color:'+C.text+';border-bottom:1px solid '+C.border+'">'+r[0]+'</td>' +
              '<td style="padding:6px 10px;border-bottom:1px solid '+C.border+'"><input id="lw-res-'+i+'" type="text" placeholder="—" style="width:80px;padding:5px 8px;border:1.5px solid '+C.border+';border-radius:6px;font-size:13px;font-family:inherit;outline:none"></td>' +
              '<td style="padding:8px 10px;color:'+C.muted+';border-bottom:1px solid '+C.border+'">'+r[1]+'</td>' +
              '<td style="padding:8px 10px;color:'+C.muted+';border-bottom:1px solid '+C.border+'">'+r[2]+'</td>' +
            '</tr>';
          }).join('') +
          '</tbody></table>' +
          '<div style="font-size:11px;color:'+C.muted+';margin-top:10px;padding:8px 12px;background:#f8fafc;border-radius:6px">ℹ️ Reference intervals shown are for adult males (18–65 years). Adjust for patient demographics as required.</div>' +
          '<div style="margin-top:14px"><label style="display:block;font-size:12px;font-weight:600;color:'+C.text+';margin-bottom:5px">Laboratory Comments</label>' +
          '<textarea id="lw-lab-comments" rows="3" placeholder="Analytical comments, interfering substances, repeat findings…" style="width:100%;padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;outline:none;resize:vertical"></textarea></div>'
      ) +
      lwInfo('ℹ️','<strong>Result Handling</strong><br>Results must pass validation (Step 3) before they are visible to the clinician.','#eff6ff','#bfdbfe','#1d4ed8') +
      '<div style="display:flex;gap:10px;margin-top:20px;padding-bottom:20px">' +
        '<button onclick="window._labWsForm=3;window._lwRender()" style="flex:1;padding:12px 0;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56,#1A4A9B);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Save Results &amp; Proceed to Validation →</button>' +
        '<button onclick="window._labWsForm=1;window._lwRender()" style="padding:12px 20px;border-radius:10px;border:1.5px solid '+C.border+';background:#fff;color:'+C.muted+';font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">← Back</button>' +
      '</div>' +
    '</div>';
  }

  function form3() {
    var u = (window.API && window.API.getStoredUser && window.API.getStoredUser()) || {};
    var reviewer = u.firstName ? ((u.firstName||'')+' '+(u.lastName||'')).trim() : 'Lab Supervisor';
    return '<div style="padding:20px 24px;overflow-y:auto;height:100%">' +
      '<div style="margin-bottom:20px">' +
        '<div style="font-size:18px;font-weight:800;color:'+C.text+'">Validate &amp; Release Results</div>' +
        '<div style="font-size:13px;color:'+C.muted+';margin-top:3px">Review, approve and release to the requesting clinician</div>' +
      '</div>' +
      lwTracker(3) +
      '<div style="background:linear-gradient(135deg,#0F6E56,#1A4A9B);border-radius:12px;padding:18px 22px;margin-bottom:16px;color:#fff">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
          '<div>' +
            '<div style="font-size:14px;font-weight:800;margin-bottom:4px">'+ORDER.report+'</div>' +
            '<div style="font-size:12px;opacity:.85;margin-bottom:2px">'+ORDER.patient+' · '+ORDER.patId+'</div>' +
            '<div style="font-size:12px;opacity:.85">'+ORDER.test+' · '+ORDER.id+'</div>' +
          '</div>' +
          '<span style="font-size:12px;font-weight:700;background:rgba(255,255,255,.2);padding:4px 12px;border-radius:20px">Pending Review</span>' +
        '</div>' +
      '</div>' +
      lwCard('Section A · Review Checklist',
        '<div style="font-size:12px;color:'+C.muted+';margin-bottom:12px">Confirm each item before approving the result for release.</div>' +
        lwCheck('chk1','Patient demographics on the report match the request form') +
        lwCheck('chk2','All requested analytes have results entered') +
        lwCheck('chk3','Results are within plausible biological limits or flagged accordingly') +
        lwCheck('chk4','Quality control (QC) for this run has passed') +
        lwCheck('chk5','Critical values have been telephoned to the clinician if applicable')
      ) +
      lwCard('Section B · Review Decision',
        '<div style="font-size:12px;font-weight:600;color:'+C.text+';margin-bottom:10px">Review Decision <span style="color:'+C.red+'">*</span></div>' +
        lwRadio('val-decision','approve','Approve &amp; Release',       true, 'Results are accurate and complete — release to clinician') +
        lwRadio('val-decision','return', 'Return for Correction',       false,'Send back to analyst for amendment before release') +
        lwRadio('val-decision','repeat', 'Request Repeat Test',         false,'Recollect specimen or repeat the analysis') +
        lwRadio('val-decision','hold',   'Hold — Pending Clinical Review',false,'Do not release pending additional clinical input') +
        '<div style="margin-top:12px"><label style="display:block;font-size:12px;font-weight:600;color:'+C.text+';margin-bottom:5px">Reviewer Comments / Reason <span style="color:'+C.red+'">*</span></label>' +
        '<textarea id="lw-val-comments" rows="3" placeholder="Comments required if returning, repeating or holding…" style="width:100%;padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;outline:none;resize:vertical"></textarea></div>'
      ) +
      lwCard('Section C · Electronic Authorisation',
        lwGrid([
          lwRO('Authenticated Reviewer', reviewer),
          lwRO('Professional Role','Medical Laboratory Scientist / Supervisor'),
        ]) +
        '<div style="margin-top:6px"><label style="display:block;font-size:12px;font-weight:600;color:'+C.text+';margin-bottom:5px">Electronic Signature (PIN / Password)</label>' +
        '<input id="lw-esig" type="password" placeholder="Enter PIN or system password" style="width:100%;padding:9px 12px;border:1.5px solid '+C.border+';border-radius:8px;font-size:13px;font-family:inherit;outline:none"></div>' +
        '<div style="margin-top:10px;font-size:12px;color:'+C.muted+';background:#f8fafc;border-radius:8px;padding:10px 14px">By submitting this authorisation you confirm that the results are accurate, complete, and ready for clinical use. This action is logged and cannot be reversed.</div>'
      ) +
      lwInfo('🔬','<strong>Resulting Workflow State</strong><br>✅ <strong>Approve &amp; Release</strong> → Released to Doctor. Clinician is notified.<br>↩️ <strong>Return / Repeat / Hold</strong> → Order reverts to the appropriate earlier step.','#f0fdf4','#86efac','#065f46') +
      '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-top:14px;font-size:12px;color:#92400e;line-height:1.7">' +
        '<div style="font-weight:700;margin-bottom:6px">⚠️ Important — Validation Rules</div>' +
        '<ul style="margin:0;padding-left:18px">' +
          '<li>All five checklist items must be confirmed before approving.</li>' +
          '<li>Critical values must be communicated verbally to the clinician before electronic release.</li>' +
          '<li>Amended reports must be clearly marked as <em>Amended</em> and include a reason.</li>' +
          '<li>This validation step is legally binding under HPCSA laboratory standards.</li>' +
        '</ul>' +
      '</div>' +
      '<div style="display:flex;gap:10px;margin-top:20px;padding-bottom:20px">' +
        '<button onclick="alert(\'Results validated and released to '+ORDER.doctor+'. Report: '+ORDER.report+'\')" style="flex:1;padding:12px 0;border-radius:10px;border:none;background:linear-gradient(135deg,#0F6E56,#1A4A9B);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">✅ Submit Validation &amp; Release</button>' +
        '<button onclick="window._labWsForm=2;window._lwRender()" style="padding:12px 20px;border-radius:10px;border:1.5px solid '+C.border+';background:#fff;color:'+C.muted+';font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">← Back</button>' +
      '</div>' +
    '</div>';
  }

  /* ═══════════════════════════════════════════════════════
     ASSEMBLE PAGE
  ═══════════════════════════════════════════════════════ */
  function _dLabWorker() {
    window._labWsForm = window._labWsForm || 1;
    window._lwView    = window._lwView    || 'dashboard';

    var v = window._lwView;
    var f = window._labWsForm;

    var header =
      '<div style="background:linear-gradient(135deg,'+C.bannerL+','+C.bannerR+');padding:14px 24px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between">' +
        '<div>' +
          '<div style="font-size:16px;font-weight:800;color:#fff">Lab Worker Workspace</div>' +
          '<div style="font-size:12px;color:rgba(255,255,255,.75);margin-top:2px">Johannesburg CHC · Laboratory Services</div>' +
        '</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,.8);background:rgba(255,255,255,.15);padding:6px 14px;border-radius:20px">' +
          (v === 'workflow' ? 'Order: <strong>'+ORDER.id+'</strong>' : '🔬 Lab Module') +
        '</div>' +
      '</div>';

    var sidebar =
      '<div style="width:210px;flex-shrink:0;background:#fff;border-right:1px solid '+C.border+';display:flex;flex-direction:column;overflow-y:auto">' +
        '<div style="padding:16px 14px 10px;border-bottom:1px solid '+C.border+'">' +
          '<div style="font-size:13px;font-weight:800;color:'+C.teal+'">🧪 Lab Workspace</div>' +
          '<div style="font-size:11px;color:'+C.muted+';margin-top:2px">Johannesburg CHC</div>' +
        '</div>' +
        '<div style="padding:8px 0;flex:1">' +
          labNav('Dashboard',           '📊', 'dashboard') +
          labNav('Lab Orders',          '📋', 'orders')    +
          labNav('Process Specimen',    '⚗️',  'workflow')  +
          labNav('Specimen Collection', '🧫', 'dashboard') +
          labNav('Enter Results',       '📝', 'dashboard') +
          labNav('Validate Results',    '✅', 'dashboard') +
          labNav('Lab History',         '📂', 'dashboard') +
          labNav('Reagents & Supplies', '🧴', 'dashboard') +
        '</div>' +
        '<div style="padding:10px 14px;border-top:1px solid '+C.border+'">' +
          '<div style="font-size:11px;color:'+C.muted+'">NIHMS Lab Module</div>' +
        '</div>' +
      '</div>';

    var mainContent;
    var rightPanel = '';

    if (v === 'dashboard') {
      mainContent = viewDashboard();
    } else if (v === 'orders') {
      mainContent = viewOrders();
    } else {
      /* workflow */
      mainContent = '<div style="flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column">' +
        (f === 1 ? form1() : f === 2 ? form2() : form3()) +
      '</div>';
      rightPanel = rightSidebarWorkflow();
    }

    /* For dashboard & orders: mainContent is self-contained with its own scroll */
    var centerWrap = (v === 'workflow')
      ? mainContent
      : '<div style="flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column">'+mainContent+'</div>';

    return '<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">' +
      header +
      '<div style="display:flex;flex:1;overflow:hidden">' +
        sidebar +
        centerWrap +
        rightPanel +
      '</div>' +
    '</div>';
  }

  window._dLabWorker = _dLabWorker;

})();
