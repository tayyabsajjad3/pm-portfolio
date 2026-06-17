// Admin Portal Logic

let entryRowCount = 0;

async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  const { data: profile } = await sb.from('profiles').select('role').eq('id', session.user.id).single();
  if (!profile || profile.role !== 'admin') {
    alert('Access denied. Admins only.');
    window.location.href = 'data.html';
    return;
  }

  // Add initial 10 rows
  initPasteHandler();
  for (let i = 0; i < 10; i++) addEntryRow();

  loadUsers();
}

// =============================================
// DATA ENTRY
// =============================================
function addEntryRow() {
  entryRowCount++;
  const tbody = document.getElementById('entryTableBody');
  const tr = document.createElement('tr');
  tr.id = 'entryRow_' + entryRowCount;
  tr.innerHTML = `
    <td class="row-num">${entryRowCount}</td>
    <td><input type="text" placeholder="PM Name"></td>
    <td><input type="number" placeholder="2026" min="2020" max="2030"></td>
    <td><input type="text" placeholder="SAP ID"></td>
    <td><input type="text" placeholder="Nickname"></td>
    <td><div style="display:flex;align-items:center;gap:4px;"><span style="color:#0055a5;font-weight:600;">$</span><input type="number" placeholder="0" style="flex:1;"></div></td>
    <td><div style="display:flex;align-items:center;gap:4px;"><span style="color:#0055a5;font-weight:600;">$</span><input type="number" placeholder="0" style="flex:1;"></div></td>
    <td><input type="text" placeholder="PM Inputs"></td>
    <td><input type="text" placeholder="FRO Assessment"></td>
  `;
  tbody.appendChild(tr);
}

async function submitAllRows() {
  const statusEl = document.getElementById('entryStatus');
  const rows = document.querySelectorAll('#entryTableBody tr');
  const toSubmit = [];

  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const pmName  = inputs[0].value.trim();
    const year    = parseInt(inputs[1].value.trim());
    const sapId   = inputs[2].value.trim();
    const nickname = inputs[3].value.trim();
    const delivery = inputs[4].value.trim();
    const forecast = inputs[5].value.trim();
    const pmInputs = inputs[6].value.trim();
    const froAssessment = inputs[7].value.trim();

    if (pmName && year) {
      toSubmit.push({ pmName, year, sap_id: sapId, nickname, delivery: delivery !== '' ? parseFloat(delivery) : null, forecast: forecast !== '' ? parseFloat(forecast) : null, pm_inputs: pmInputs, fro_assessment: froAssessment });
    }
  });

  if (toSubmit.length === 0) {
    showEntryStatus('No rows to submit — fill in at least Name and Year.', 'error');
    return;
  }

  const btn = document.querySelector('.submit-all-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  showEntryStatus('Checking for duplicates...', 'info');

  // Fetch all existing rows to check for full duplicates
  const { data: existing } = await sb.from('ongoing_projects').select('name, year, sap_id, nickname, delivery, forecast, pm_inputs, fro_assessment');

  function rowKey(name, year, sap_id, nickname, delivery, forecast, pm_inputs, fro_assessment) {
    return [
      (name||'').toLowerCase().trim(),
      year,
      (sap_id||'').toLowerCase().trim(),
      (nickname||'').toLowerCase().trim(),
      delivery ?? '',
      forecast ?? '',
      (pm_inputs||'').toLowerCase().trim(),
      (fro_assessment||'').toLowerCase().trim()
    ].join('__');
  }

  const existingSet = new Set((existing || []).map(r =>
    rowKey(r.name, r.year, r.sap_id, r.nickname, r.delivery, r.forecast, r.pm_inputs, r.fro_assessment)
  ));

  const newRows = [];
  const skipped = [];

  toSubmit.forEach(row => {
    const key = rowKey(row.pmName, row.year, row.sap_id, row.nickname, row.delivery, row.forecast, row.pm_inputs, row.fro_assessment);
    if (existingSet.has(key)) {
      skipped.push(`${row.pmName} (${row.year}) — ${row.nickname || row.sap_id || 'row'}`);
    } else {
      newRows.push({ name: row.pmName, year: row.year, sap_id: row.sap_id, nickname: row.nickname, delivery: row.delivery, forecast: row.forecast, pm_inputs: row.pm_inputs, fro_assessment: row.fro_assessment });
      existingSet.add(key); // prevent duplicates within same submission
    }
  });

  let submitted = 0;
  let failed = 0;

  if (newRows.length > 0) {
    const { error } = await sb.from('ongoing_projects').insert(newRows);
    if (error) {
      failed = newRows.length;
      console.error(error);
    } else {
      submitted = newRows.length;
    }
  }

  btn.disabled = false;
  btn.textContent = 'Submit All Rows';

  let msg = '';
  if (submitted > 0) msg += `✓ ${submitted} row(s) submitted successfully. `;
  if (skipped.length > 0) msg += `⚠ ${skipped.length} skipped (already exist): ${skipped.join(', ')}. `;
  if (failed > 0) msg += `✕ ${failed} row(s) failed.`;

  const type = failed > 0 ? 'error' : skipped.length > 0 ? 'info' : 'success';
  showEntryStatus(msg, type);

  // Clear only successfully submitted rows
  if (submitted > 0) {
    const submittedKeys = new Set(newRows.map(r => `${r.name.toLowerCase()}__${r.year}`));
    rows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      const key = `${inputs[0].value.trim().toLowerCase()}__${parseInt(inputs[1].value.trim())}`;
      if (submittedKeys.has(key)) {
        inputs.forEach(input => input.value = '');
      }
    });
  }
}

function showEntryStatus(msg, type) {
  const el = document.getElementById('entryStatus');
  el.textContent = msg;
  el.className = 'entry-status ' + type;
}

// =============================================
// USER MANAGEMENT
// =============================================
async function loadUsers() {
  const { data: users, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) { document.getElementById('pendingContainer').innerHTML = '<p class="empty-msg">Error loading users.</p>'; return; }

  const pending = users.filter(u => u.role === 'pending');
  const all = users.filter(u => u.role !== 'pending'); // includes disabled

  if (pending.length === 0) {
    document.getElementById('pendingContainer').innerHTML = '<p class="empty-msg">No pending approvals.</p>';
  } else {
    document.getElementById('pendingContainer').innerHTML = `
      <table class="user-table">
        <thead><tr><th>Name</th><th>Email</th><th>Registered</th><th>Actions</th></tr></thead>
        <tbody>${pending.map(u => `
          <tr>
            <td>${u.full_name || '—'}</td>
            <td>${u.email}</td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
            <td>
              <button class="action-btn approve-btn" onclick="approveUser('${u.id}','${u.email}','${u.full_name||''}')">✓ Approve</button>
              <button class="action-btn make-admin-btn" onclick="approveAsAdmin('${u.id}','${u.email}','${u.full_name||''}')">★ Admin</button>
              <button class="action-btn reject-btn" onclick="rejectUser('${u.id}','${u.email}','${u.full_name||''}')">✕ Reject</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  if (all.length === 0) {
    document.getElementById('allUsersContainer').innerHTML = '<p class="empty-msg">No approved users yet.</p>';
  } else {
    document.getElementById('allUsersContainer').innerHTML = `
      <table class="user-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
        <tbody>${all.map(u => `
          <tr>
            <td>${u.full_name || '—'}</td>
            <td>${u.email}</td>
            <td><span class="role-badge ${u.role}">${u.role}</span></td>
            <td>
              ${u.role !== 'admin' ? `<button class="action-btn make-admin-btn" onclick="updateRole('${u.id}','admin','${u.email}','${u.full_name||''}',true)">★ Make Admin</button>` : ''}
              ${u.role === 'admin' ? `<button class="action-btn make-user-btn" onclick="updateRole('${u.id}','user','${u.email}','${u.full_name||''}',false)">↓ Make User</button>` : ''}
              <button class="action-btn reject-btn" onclick="removeUser('${u.id}')">✕ Remove</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }
}

async function approveUser(userId, email, name) {
  const { error } = await sb.from('profiles').update({ role: 'user' }).eq('id', userId);
  if (error) { alert('Error: ' + error.message); return; }
  sendApprovalEmail(email, name, 'user');
  loadUsers();
}

async function approveAsAdmin(userId, email, name) {
  const { error } = await sb.from('profiles').update({ role: 'admin' }).eq('id', userId);
  if (error) { alert('Error: ' + error.message); return; }
  sendApprovalEmail(email, name, 'admin');
  loadUsers();
}

async function updateRole(userId, role, email, name, isPromotion) {
  const { error } = await sb.from('profiles').update({ role }).eq('id', userId);
  if (error) { alert('Error: ' + error.message); return; }
  if (isPromotion) sendRoleChangeEmail(email, name, role);
  loadUsers();
}

async function removeUser(userId) {
  if (!confirm('Permanently remove this user? They will be able to sign up again.')) return;
  
  // Delete profile
  const { error } = await sb.from('profiles').delete().eq('id', userId);
  if (error) { alert('Error: ' + error.message); return; }

  // Delete from Supabase Auth via Edge Function
  try {
    const { data: { session } } = await sb.auth.getSession();
    await fetch('https://dnmpjibzumrqggwlront.supabase.co/functions/v1/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
      body: JSON.stringify({ userId })
    });
  } catch(e) { console.error('Edge function error:', e); }

  loadUsers();
}

async function rejectUser(userId, email, name) {
  if (!confirm('Reject and remove this user?')) return;

  // Delete profile
  const { error } = await sb.from('profiles').delete().eq('id', userId);
  if (error) { alert('Error: ' + error.message); return; }

  // Delete from Supabase Auth via Edge Function
  try {
    const { data: { session } } = await sb.auth.getSession();
    await fetch('https://dnmpjibzumrqggwlront.supabase.co/functions/v1/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
      body: JSON.stringify({ userId })
    });
  } catch(e) { console.error('Edge function error:', e); }

  sendRejectionEmail(email, name);
  loadUsers();
}

function sendApprovalEmail(email, name, role) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const subject = encodeURIComponent('PM Portfolio Sheet — Account Approved');
  const body = encodeURIComponent(`${greeting}\n\nYour account has been approved! You now have ${role === 'admin' ? 'admin' : ''} access to the PM Portfolio Sheet.\n\nSign in at:\nhttps://tayyabsajjad3.github.io/pm-portfolio\n\nBest regards,\nPM Portfolio Admin`);
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

function sendRoleChangeEmail(email, name, role) {
  const subject = encodeURIComponent('PM Portfolio Sheet — Role Updated');
  const body = encodeURIComponent(`Hi ${name || ''},\n\nYour role has been updated to: ${role}.\n\nSign in at:\nhttps://tayyabsajjad3.github.io/pm-portfolio\n\nBest regards,\nPM Portfolio Admin`);
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

function sendRejectionEmail(email, name) {
  const subject = encodeURIComponent('PM Portfolio Sheet — Account Request');
  const body = encodeURIComponent(`Hi ${name || ''},\n\nWe were unable to approve your account request at this time.\n\nIf you believe this is a mistake, please contact your administrator.\n\nBest regards,\nPM Portfolio Admin`);
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

init();

// =============================================
// EXCEL PASTE HANDLER
// =============================================
function initPasteHandler() {
  const tbody = document.getElementById('entryTableBody');
  
  tbody.addEventListener('paste', function(e) {
    e.preventDefault();
    
    const clipText = (e.clipboardData || window.clipboardData).getData('text');
    if (!clipText) return;

    // Parse pasted data — split by newlines then tabs
    const pastedRows = clipText.trim().split(/\r?\n/).map(row => row.split('\t'));
    
    // Find which cell was clicked
    const activeCell = document.activeElement;
    const activeTd = activeCell ? activeCell.closest('td') : null;
    const activeTr = activeCell ? activeCell.closest('tr') : null;
    
    if (!activeTr) return;

    // Find start row and column indices
    const allRows = Array.from(tbody.querySelectorAll('tr'));
    let startRowIdx = allRows.indexOf(activeTr);
    
    const allCells = Array.from(activeTr.querySelectorAll('td'));
    let startColIdx = activeTd ? allCells.indexOf(activeTd) - 1 : 0; // -1 for row number col
    if (startColIdx < 0) startColIdx = 0;

    // Add enough rows if needed
    const rowsNeeded = startRowIdx + pastedRows.length;
    while (tbody.querySelectorAll('tr').length < rowsNeeded) {
      addEntryRow();
    }

    const updatedRows = Array.from(tbody.querySelectorAll('tr'));

    pastedRows.forEach((pastedRow, rIdx) => {
      const tr = updatedRows[startRowIdx + rIdx];
      if (!tr) return;
      const inputs = tr.querySelectorAll('input');
      
      pastedRow.forEach((cellVal, cIdx) => {
        const inputIdx = startColIdx + cIdx;
        if (inputs[inputIdx]) {
          inputs[inputIdx].value = cellVal.trim();
        }
      });
    });
  });
}

// =============================================
// EXPORT TO EXCEL
// =============================================
async function exportAllToExcel() {
  const btn = document.getElementById('exportBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Exporting...';

  try {
    // Fetch all 6 tables
    const tables = [
      { name: 'Ongoing Projects', table: 'ongoing_projects', fields: ['name','year','sap_id','nickname','delivery','forecast','pm_inputs','fro_assessment'] },
      { name: 'Pipeline',         table: 'pipeline',         fields: ['name','year','sap_id','nickname','country','region','donor','budget','stages','comments','pm_inputs','fro_assessment'] },
      { name: 'Partnerships',     table: 'partnerships',     fields: ['name','year','partners','status','pm_inputs','fro_assessment'] },
      { name: 'Knowledge Products', table: 'knowledge_products', fields: ['name','year','agreed_action','status','pm_inputs','fro_assessment'] },
      { name: 'Innovations',      table: 'innovations',      fields: ['name','year','programme_description','partners','action_plan_q1','action_plan_q2','action_plan_q3','action_plan_q4','pm_inputs','fro_assessment'] },
      { name: 'Admin',            table: 'admin_actions',    fields: ['name','year','agreed_action','status','pm_inputs','fro_assessment'] },
    ];

    const wb = XLSX.utils.book_new();

    for (const t of tables) {
      const { data, error } = await sb.from(t.table).select(t.fields.join(',')).order('name').order('year');
      if (error) { console.error(error); continue; }

      // Build header row (capitalize)
      const headers = t.fields.map(f => f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

      // Build data rows
      const rows = (data || []).map(row => t.fields.map(f => row[f] ?? ''));

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

      // Set column widths
      ws['!cols'] = headers.map(() => ({ wch: 20 }));

      XLSX.utils.book_append_sheet(wb, ws, t.name);
    }

    // Download
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `PM_Portfolio_Export_${date}.xlsx`);

    btn.disabled = false;
    btn.textContent = '⬇ Export All to Excel';
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    btn.textContent = '⬇ Export All to Excel';
    alert('Export failed: ' + err.message);
  }
}