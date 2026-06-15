// PM Portfolio Sheet — Data Page Logic

const TABLE_CONFIG = {
  ongoing: {
    label: 'Ongoing Projects',
    table: 'ongoing_projects',
    columns: [
      { label: 'SAP ID',         field: 'sap_id',         type: 'textarea', total: false, format: '' },
      { label: 'Nickname',       field: 'nickname',        type: 'textarea', total: false, format: '' },
      { label: 'Delivery',       field: 'delivery',        type: 'number',   total: true,  format: 'currency' },
      { label: 'Forecast',       field: 'forecast',        type: 'number',   total: true,  format: 'currency' },
      { label: 'Imp. Rate',      field: 'imp_rate',        type: 'calc',     total: false, format: 'percent',
        calc: function(row){ var d=parseFloat(row.delivery)||0; var f=parseFloat(row.forecast)||0; return f>0?(d/f*100).toFixed(1):0; }
      },
      { label: 'PM Inputs',      field: 'pm_inputs',       type: 'textarea', total: false, format: '' },
      { label: 'FRO Assessment', field: 'fro_assessment',  type: 'textarea', total: false, format: '' },
    ]
  },
  pipeline: {
    label: 'Pipeline',
    table: 'pipeline',
    columns: [
      { label: 'SAP ID',         field: 'sap_id',         type: 'textarea', total: false, format: '' },
      { label: 'Nickname',       field: 'nickname',        type: 'textarea', total: false, format: '' },
      { label: 'Country',        field: 'country',         type: 'textarea', total: false, format: '' },
      { label: 'Region',         field: 'region',          type: 'textarea', total: false, format: '' },
      { label: 'Donor',          field: 'donor',           type: 'textarea', total: false, format: '' },
      { label: 'Budget',         field: 'budget',          type: 'number',   total: true,  format: 'currency' },
      { label: 'Stages',         field: 'stages',          type: 'select',   total: false, format: '',
        options: ['1- Department Concept review','2- SSS/PA Approval Workflow','3- SFS Internal Review','4- EB Approval','5- Donor Approval','6- Completed']
      },
      { label: 'Comments',       field: 'comments',        type: 'textarea', total: false, format: '' },
      { label: 'PM Inputs',      field: 'pm_inputs',       type: 'textarea', total: false, format: '' },
      { label: 'FRO Assessment', field: 'fro_assessment',  type: 'textarea', total: false, format: '' },
    ]
  },
  partnerships: {
    label: 'Partnerships',
    table: 'partnerships',
    columns: [
      { label: 'Partner',        field: 'partners',        type: 'textarea', total: false },
      { label: 'Status',         field: 'status',          type: 'textarea', total: false },
      { label: 'PM Inputs',      field: 'pm_inputs',       type: 'textarea', total: false },
      { label: 'FRO Assessment', field: 'fro_assessment',  type: 'textarea', total: false },
    ]
  },
  knowledge: {
    label: 'Knowledge Products',
    table: 'knowledge_products',
    columns: [
      { label: 'Agreed Action',  field: 'agreed_action',   type: 'textarea', total: false },
      { label: 'Status',         field: 'status',          type: 'textarea', total: false },
      { label: 'PM Inputs',      field: 'pm_inputs',       type: 'textarea', total: false },
      { label: 'FRO Assessment', field: 'fro_assessment',  type: 'textarea', total: false },
    ]
  },
  innovations: {
    label: 'Innovations',
    table: 'innovations',
    columns: [
      { label: 'Programme',      field: 'programme_description', type: 'textarea', total: false },
      { label: 'Partners',       field: 'partners',              type: 'textarea', total: false },
      { label: 'Q1',             field: 'action_plan_q1',        type: 'textarea', total: false },
      { label: 'Q2',             field: 'action_plan_q2',        type: 'textarea', total: false },
      { label: 'Q3',             field: 'action_plan_q3',        type: 'textarea', total: false },
      { label: 'Q4',             field: 'action_plan_q4',        type: 'textarea', total: false },
      { label: 'PM Inputs',      field: 'pm_inputs',             type: 'textarea', total: false },
      { label: 'FRO Assessment', field: 'fro_assessment',        type: 'textarea', total: false },
    ]
  },
  admin: {
    label: 'Admin',
    table: 'admin_actions',
    columns: [
      { label: 'Agreed Action',  field: 'agreed_action',   type: 'textarea', total: false },
      { label: 'Status',         field: 'status',          type: 'textarea', total: false },
      { label: 'PM Inputs',      field: 'pm_inputs',       type: 'textarea', total: false },
      { label: 'FRO Assessment', field: 'fro_assessment',  type: 'textarea', total: false },
    ]
  }
};

let currentTable = 'ongoing';
let currentData  = [];
let currentPM    = '';
let currentYear  = '';
let userRole     = '';

// =============================================
// INIT
// =============================================
async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile || profile.role === 'pending') {
    await sb.auth.signOut();
    window.location.href = 'index.html';
    return;
  }

  userRole = profile.role;
  document.getElementById('userEmail').textContent = profile.full_name || session.user.email;

  if (userRole === 'admin') {
    document.getElementById('adminBadge').style.display = 'inline-block';
    document.getElementById('adminPortalBtn').style.display = 'inline-block';
  }

  await loadPMDropdown();

  document.querySelectorAll('.pm-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.pm-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTable = tab.getAttribute('data-table');
      closeAddForm();
      if (currentPM && currentYear) loadTable(currentTable);
    });
  });

  document.getElementById('pmSelect').addEventListener('change', function() {
    currentPM = this.value;
    loadYearDropdown();
  });

  document.getElementById('yearSelect').addEventListener('change', function() {
    currentYear = this.value;
    if (currentPM && currentYear) loadTable(currentTable);
  });

  document.getElementById('addRowBtn').addEventListener('click', openAddForm);
  document.getElementById('cancelRowBtn').addEventListener('click', closeAddForm);
  document.getElementById('saveRowBtn').addEventListener('click', saveNewRow);
  document.getElementById('copyPipelineBtn').addEventListener('click', copyFromPreviousYear);

  showLoading(false);
  document.getElementById('tableContainer').style.display = 'none';
  document.getElementById('tableBody').innerHTML = '<tr><td colspan="20" class="pm-no-data">Select a PM and year to view data.</td></tr>';
  document.getElementById('tableContainer').style.display = 'block';
}

async function handleLogout() {
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

// =============================================
// DROPDOWNS
// =============================================
async function loadPMDropdown() {
  const { data, error } = await sb.from('ongoing_projects').select('name').order('name');
  if (error) return;

  const names = [...new Set(data.map(r => r.name).filter(Boolean))].sort();
  const select = document.getElementById('pmSelect');
  select.innerHTML = '<option value="">-- Select PM --</option>';
  names.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

async function loadYearDropdown() {
  const { data, error } = await sb.from('ongoing_projects').select('year').eq('name', currentPM).order('year');
  if (error) return;

  const years = [...new Set(data.map(r => r.year).filter(Boolean))].sort();
  const select = document.getElementById('yearSelect');
  select.innerHTML = '<option value="">-- Select Year --</option>';
  years.forEach(year => {
    const opt = document.createElement('option');
    opt.value = year;
    opt.textContent = year;
    select.appendChild(opt);
  });
}

// =============================================
// LOAD TABLE
// =============================================
async function loadTable(tableKey) {
  const config = TABLE_CONFIG[tableKey];
  if (!config || !currentPM || !currentYear) return;

  showLoading(true);
  setStatus('');

  const fields = ['id', 'name', 'year', ...config.columns.filter(c => c.type !== 'calc').map(c => c.field)].join(',');

  const { data, error } = await sb
    .from(config.table)
    .select(fields)
    .eq('name', currentPM)
    .eq('year', parseInt(currentYear));

  if (error) {
    showLoading(false);
    setStatus('Error loading data: ' + error.message, true);
    return;
  }

  currentData = data || [];
  renderTable(tableKey, currentData);
  showLoading(false);
}

// =============================================
// RENDER TABLE
// =============================================
function renderTable(tableKey, rows) {
  const config  = TABLE_CONFIG[tableKey];
  const thead   = document.getElementById('tableHead');
  const tbody   = document.getElementById('tableBody');
  const noData  = document.getElementById('noDataMsg');
  const totals  = document.getElementById('totalsRow');
  const container = document.getElementById('tableContainer');

  // Show/hide copy button
  var copyBtn = document.getElementById('copyPipelineBtn');
  if (copyBtn) copyBtn.style.display = (tableKey === 'pipeline' && rows.length === 0) ? 'inline-block' : 'none';

  let headerHtml = '<tr>';
  config.columns.forEach(col => { headerHtml += '<th>' + col.label + '</th>'; });
  headerHtml += '<th class="action-col">Del</th></tr>';
  thead.innerHTML = headerHtml;

  if (rows.length === 0) {
    tbody.innerHTML = '';
    noData.style.display = 'block';
    totals.style.display = 'none';
  } else {
    noData.style.display = 'none';
    let bodyHtml = '';
    rows.forEach(row => {
      bodyHtml += '<tr data-id="' + row.id + '">';
      config.columns.forEach(col => {
        const val = row[col.field] !== null && row[col.field] !== undefined ? row[col.field] : '';
        const fmt = col.format || '';
        if (col.type === 'calc') {
          const calcVal = col.calc ? col.calc(row) : val;
          bodyHtml += '<td class="calc-cell" data-field="' + col.field + '">' + formatValue(calcVal, fmt) + '</td>';
        } else {
          const displayVal = fmt ? formatValue(val, fmt) : escapeHtml(String(val));
          bodyHtml += '<td class="editable" data-field="' + col.field + '" data-type="' + col.type + '" data-format="' + fmt + '" data-raw="' + escapeHtml(String(val)) + '">' + displayVal + '</td>';
        }
      });
      bodyHtml += '<td class="action-col"><button class="pm-delete-btn">🗑</button></td>';
      bodyHtml += '</tr>';
    });
    tbody.innerHTML = bodyHtml;

    tbody.querySelectorAll('td.editable').forEach(cell => {
      cell.addEventListener('click', () => startEdit(cell));
    });
    tbody.querySelectorAll('.pm-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tr = btn.closest('tr');
        deleteRow(tr.getAttribute('data-id'), tr, tableKey);
      });
    });
    renderTotals(tableKey, rows, config);
  }
  container.style.display = 'block';
}

// =============================================
// INLINE EDITING
// =============================================
function startEdit(cell) {
  if (cell.querySelector('input, textarea, div')) return;

  const field   = cell.getAttribute('data-field');
  const type    = cell.getAttribute('data-type');
  const current = cell.getAttribute('data-raw') || cell.textContent.trim();
  const recordId = cell.closest('tr').getAttribute('data-id');
  const config  = TABLE_CONFIG[currentTable];
  const colDef  = config.columns.find(c => c.field === field);

  let input;

  if (type === 'select' && colDef && colDef.options) {
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;width:100%;';
    var display = document.createElement('div');
    display.style.cssText = 'padding:6px 10px;border:2px solid #0055a5;border-radius:5px;background:#fff;cursor:pointer;font-size:0.87rem;color:#1e2a3a;user-select:none;';
    display.textContent = current || '-- Select --';
    var dropdown = document.createElement('div');
    dropdown.style.cssText = 'position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #0055a5;border-radius:5px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:9999;';
    colDef.options.forEach(opt => {
      var item = document.createElement('div');
      item.style.cssText = 'padding:8px 12px;cursor:pointer;font-size:0.87rem;color:#1e2a3a;';
      item.textContent = opt;
      if (opt === current) item.style.background = '#eaf1fb';
      item.addEventListener('mouseover', () => item.style.background = '#eaf1fb');
      item.addEventListener('mouseout', () => item.style.background = opt === current ? '#eaf1fb' : '');
      item.addEventListener('mousedown', async (e) => {
        e.preventDefault();
        cell.textContent = '';
        cell.setAttribute('data-raw', opt);
        cell.textContent = opt;
        const rowIdx = currentData.findIndex(r => r.id === recordId);
        if (rowIdx > -1) currentData[rowIdx][field] = opt;
        renderTotals(currentTable, currentData, config);
        const { error } = await sb.from(config.table).update({ [field]: opt }).eq('id', recordId);
        if (error) setStatus('Save failed.', true);
        else { setStatus('Saved ✓'); setTimeout(() => setStatus(''), 2500); }
      });
      dropdown.appendChild(item);
    });
    wrapper.appendChild(display);
    wrapper.appendChild(dropdown);
    cell.textContent = '';
    cell.appendChild(wrapper);
    setTimeout(() => {
      document.addEventListener('click', function closeDD(e) {
        if (!wrapper.contains(e.target)) {
          if (cell.contains(wrapper)) { cell.textContent = ''; cell.setAttribute('data-raw', current); cell.textContent = current; }
          document.removeEventListener('click', closeDD);
        }
      });
    }, 0);
    return;
  } else if (type === 'number') {
    input = document.createElement('input');
    input.type = 'number';
    input.className = 'cell-input';
    input.value = current;
  } else {
    input = document.createElement('textarea');
    input.rows = 3;
    input.className = 'cell-input';
    input.value = current;
  }

  cell.textContent = '';
  cell.appendChild(input);
  input.focus();
  input.addEventListener('blur', () => commitEdit(cell, input, field, type, recordId));
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const fmt = cell.getAttribute('data-format') || '';
      cell.setAttribute('data-raw', current);
      cell.textContent = fmt ? formatValue(current, fmt) : current;
    }
  });
}

async function commitEdit(cell, input, field, type, recordId) {
  const newVal = input.value;
  const fmt = cell.getAttribute('data-format') || '';
  cell.setAttribute('data-raw', newVal);
  cell.textContent = fmt ? formatValue(newVal, fmt) : newVal;

  const config = TABLE_CONFIG[currentTable];
  const val = type === 'number' ? (newVal === '' ? null : parseFloat(newVal)) : newVal;

  const rowIdx = currentData.findIndex(r => r.id === recordId);
  if (rowIdx > -1) {
    currentData[rowIdx][field] = val;
    if (field === 'delivery' || field === 'forecast') {
      const tr = document.querySelector('tr[data-id="' + recordId + '"]');
      if (tr) {
        const impCell = tr.querySelector('td[data-field="imp_rate"]');
        if (impCell) {
          const impCol = config.columns.find(c => c.field === 'imp_rate');
          if (impCol && impCol.calc) impCell.textContent = formatValue(impCol.calc(currentData[rowIdx]), 'percent');
        }
      }
    }
  }
  renderTotals(currentTable, currentData, config);

  const { error } = await sb.from(config.table).update({ [field]: val }).eq('id', recordId);
  if (error) setStatus('Save failed: ' + error.message, true);
  else { setStatus('Saved ✓'); setTimeout(() => setStatus(''), 2500); }
}

// =============================================
// ADD ROW
// =============================================
function openAddForm() {
  const config = TABLE_CONFIG[currentTable];
  let html = '';
  config.columns.forEach(col => {
    if (col.type === 'calc') return;
    html += '<div class="pm-form-field"><label>' + col.label + '</label>';
    if (col.type === 'select' && col.options) {
      html += '<select name="' + col.field + '"><option value="">-- Select --</option>';
      col.options.forEach(opt => html += '<option value="' + opt + '">' + opt + '</option>');
      html += '</select>';
    } else if (col.type === 'number') {
      html += '<input type="number" name="' + col.field + '" placeholder="' + col.label + '">';
    } else {
      html += '<textarea name="' + col.field + '" rows="2" placeholder="' + col.label + '"></textarea>';
    }
    html += '</div>';
  });
  document.getElementById('formFields').innerHTML = html;
  document.getElementById('addRowForm').style.display = 'block';
  document.getElementById('addRowBtn').style.display = 'none';
}

function closeAddForm() {
  document.getElementById('addRowForm').style.display = 'none';
  document.getElementById('addRowBtn').style.display = 'inline-block';
}

async function saveNewRow() {
  const config = TABLE_CONFIG[currentTable];
  const form = document.getElementById('addRowForm');
  const body = { name: currentPM, year: parseInt(currentYear) };

  form.querySelectorAll('input, textarea, select').forEach(el => {
    const col = config.columns.find(c => c.field === el.name);
    if (col) body[el.name] = col.type === 'number' ? (parseFloat(el.value) || null) : el.value.trim();
  });

  const { error } = await sb.from(config.table).insert(body);
  if (error) { setStatus('Failed to add row: ' + error.message, true); return; }

  setStatus('Row added ✓');
  setTimeout(() => setStatus(''), 2500);
  closeAddForm();
  loadTable(currentTable);
}

// =============================================
// DELETE ROW
// =============================================
async function deleteRow(recordId, trElement, tableKey) {
  if (!recordId) return;
  if (!confirm('Delete this row?')) return;

  const config = TABLE_CONFIG[tableKey];
  const { error } = await sb.from(config.table).delete().eq('id', recordId);
  if (error) { setStatus('Delete failed: ' + error.message, true); return; }

  trElement.remove();
  currentData = currentData.filter(r => r.id !== recordId);
  setStatus('Row deleted ✓');
  setTimeout(() => setStatus(''), 2500);
  if (currentData.length === 0) {
    document.getElementById('noDataMsg').style.display = 'block';
    document.getElementById('totalsRow').style.display = 'none';
    var copyBtn = document.getElementById('copyPipelineBtn');
    if (copyBtn && tableKey === 'pipeline') copyBtn.style.display = 'inline-block';
  } else {
    renderTotals(tableKey, currentData, config);
  }
}

// =============================================
// COPY FROM PREVIOUS YEAR
// =============================================
async function copyFromPreviousYear() {
  const config = TABLE_CONFIG['pipeline'];
  const currentYearInt = parseInt(currentYear);

  setStatus('Looking for previous year data...');

  const { data, error } = await sb.from('pipeline').select('*').eq('name', currentPM).lt('year', currentYearInt);
  if (error || !data || data.length === 0) {
    setStatus('No previous year data found.', true);
    return;
  }

  const years = data.map(r => r.year);
  const prevYear = Math.max(...years);
  const prevRows = data.filter(r => r.year === prevYear);

  setStatus('Copying ' + prevRows.length + ' rows from ' + prevYear + '...');

  const newRows = prevRows.map(row => {
    const newRow = { name: currentPM, year: currentYearInt };
    config.columns.forEach(col => {
      if (col.type !== 'calc' && row[col.field] !== undefined) newRow[col.field] = row[col.field];
    });
    return newRow;
  });

  const { error: insertError } = await sb.from('pipeline').insert(newRows);
  if (insertError) { setStatus('Copy failed: ' + insertError.message, true); return; }

  setStatus(prevRows.length + ' rows copied from ' + prevYear + ' ✓');
  setTimeout(() => setStatus(''), 3000);
  loadTable('pipeline');
}

// =============================================
// TOTALS
// =============================================
function renderTotals(tableKey, rows, config) {
  const totalsDiv = document.getElementById('totalsRow');
  if (!['ongoing', 'pipeline'].includes(tableKey)) { totalsDiv.style.display = 'none'; return; }

  const deliveryCol = config.columns.find(c => c.total && c.label.toLowerCase().includes('delivery'));
  const forecastCol = config.columns.find(c => c.total && c.label.toLowerCase().includes('forecast'));
  const budgetCol   = config.columns.find(c => c.total && c.label.toLowerCase().includes('budget'));
  const stagesCol   = config.columns.find(c => c.field === 'stages');

  let html = '<span class="pm-total-item">Total Projects: ' + rows.length + '</span>';

  if (deliveryCol) {
    const totalDelivery = rows.reduce((acc, row) => acc + (parseFloat(row[deliveryCol.field]) || 0), 0);
    html += '<span class="pm-total-item">Total Delivery: $' + totalDelivery.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0}) + '</span>';
    if (forecastCol) {
      const totalForecast = rows.reduce((acc, row) => acc + (parseFloat(row[forecastCol.field]) || 0), 0);
      html += '<span class="pm-total-item">Total Forecast: $' + totalForecast.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0}) + '</span>';
      const impRate = totalForecast > 0 ? (totalDelivery / totalForecast * 100).toFixed(1) : 0;
      html += '<span class="pm-total-item">Implementation Rate: ' + impRate + '%</span>';
    }
  }

  if (budgetCol) {
    const totalBudget = rows.reduce((acc, row) => acc + (parseFloat(row[budgetCol.field]) || 0), 0);
    html += '<span class="pm-total-item">Total Budget: $' + totalBudget.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0}) + '</span>';
    if (stagesCol) {
      const netApproval = rows.reduce((acc, row) => {
        const n = parseInt((row[stagesCol.field] || '').charAt(0));
        return (n >= 4 && n <= 6) ? acc + (parseFloat(row[budgetCol.field]) || 0) : acc;
      }, 0);
      html += '<span class="pm-total-item">Net Approval: $' + netApproval.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0}) + '</span>';
      const netAgreement = rows.reduce((acc, row) => {
        const n = parseInt((row[stagesCol.field] || '').charAt(0));
        return n === 6 ? acc + (parseFloat(row[budgetCol.field]) || 0) : acc;
      }, 0);
      html += '<span class="pm-total-item">Net Agreement: $' + netAgreement.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0}) + '</span>';
    }
  }

  document.getElementById('totalsContent').innerHTML = html;
  totalsDiv.style.display = 'block';
}

// =============================================
// HELPERS
// =============================================
function showLoading(show) {
  document.getElementById('loadingSpinner').style.display = show ? 'block' : 'none';
  document.getElementById('tableContainer').style.display = show ? 'none' : 'block';
}

function setStatus(msg, isError) {
  const el = document.getElementById('statusMsg');
  el.textContent = msg;
  el.className = 'pm-status-msg' + (isError ? ' error' : '');
}

function formatValue(val, format) {
  if (val === '' || val === null || val === undefined) return '';
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  if (format === 'currency') return '$' + num.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0});
  if (format === 'percent') return num + '%';
  return val;
}

function escapeHtml(text) {
  return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

init();
