// Admin Portal Logic

async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  const { data: profile } = await sb.from('profiles').select('role').eq('id', session.user.id).single();
  if (!profile || profile.role !== 'admin') {
    alert('Access denied. Admins only.');
    window.location.href = 'data.html';
    return;
  }

  loadUsers();
}

async function loadUsers() {
  const { data: users, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false });

  if (error) {
    document.getElementById('pendingContainer').innerHTML = '<p class="empty-msg">Error loading users.</p>';
    return;
  }

  const pending = users.filter(u => u.role === 'pending');
  const all = users.filter(u => u.role !== 'pending');

  // Pending users
  if (pending.length === 0) {
    document.getElementById('pendingContainer').innerHTML = '<p class="empty-msg">No pending approvals.</p>';
  } else {
    document.getElementById('pendingContainer').innerHTML = `
      <table class="user-table">
        <thead><tr><th>Name</th><th>Email</th><th>Registered</th><th>Actions</th></tr></thead>
        <tbody>
          ${pending.map(u => `
            <tr>
              <td>${u.full_name || '—'}</td>
              <td>${u.email}</td>
              <td>${new Date(u.created_at).toLocaleDateString()}</td>
              <td>
                <button class="action-btn approve-btn" onclick="approveUser('${u.id}', '${u.email}', '${u.full_name || ''}')">✓ Approve</button>
                <button class="action-btn make-admin-btn" onclick="approveAsAdmin('${u.id}', '${u.email}', '${u.full_name || ''}')">★ Approve as Admin</button>
                <button class="action-btn reject-btn" onclick="rejectUser('${u.id}', '${u.email}', '${u.full_name || ''}')">✕ Reject</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }

  // All users
  if (all.length === 0) {
    document.getElementById('allUsersContainer').innerHTML = '<p class="empty-msg">No approved users yet.</p>';
  } else {
    document.getElementById('allUsersContainer').innerHTML = `
      <table class="user-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
        <tbody>
          ${all.map(u => `
            <tr>
              <td>${u.full_name || '—'}</td>
              <td>${u.email}</td>
              <td><span class="role-badge ${u.role}">${u.role}</span></td>
              <td>
                ${u.role !== 'admin' ? `<button class="action-btn make-admin-btn" onclick="updateRole('${u.id}', 'admin', '${u.email}', '${u.full_name || ''}', true)">★ Make Admin</button>` : ''}
                ${u.role === 'admin' ? `<button class="action-btn make-user-btn" onclick="updateRole('${u.id}', 'user', '${u.email}', '${u.full_name || ''}', false)">↓ Make User</button>` : ''}
                <button class="action-btn reject-btn" onclick="removeUser('${u.id}')">✕ Remove</button>
              </td>
            </tr>
          `).join('')}
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
  if (!confirm('Remove this user?')) return;
  const { error } = await sb.from('profiles').delete().eq('id', userId);
  if (error) { alert('Error: ' + error.message); return; }
  loadUsers();
}

async function rejectUser(userId, email, name) {
  if (!confirm('Reject and remove this user?')) return;
  const { error } = await sb.from('profiles').delete().eq('id', userId);
  if (error) { alert('Error: ' + error.message); return; }
  sendRejectionEmail(email, name);
  loadUsers();
}

function sendApprovalEmail(email, name, role) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const roleText = role === 'admin' ? 'admin access' : 'access';
  const subject = encodeURIComponent('PM Portfolio Sheet — Account Approved');
  const body = encodeURIComponent(
    `${greeting}\n\nYour account has been approved! You now have ${roleText} to the PM Portfolio Sheet.\n\nYou can sign in at:\nhttps://tayyabsajjad3.github.io/pm-portfolio\n\nBest regards,\nPM Portfolio Admin`
  );
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

function sendRoleChangeEmail(email, name, role) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const subject = encodeURIComponent('PM Portfolio Sheet — Role Updated');
  const body = encodeURIComponent(
    `${greeting}\n\nYour role in the PM Portfolio Sheet has been updated to: ${role}.\n\nYou can sign in at:\nhttps://tayyabsajjad3.github.io/pm-portfolio\n\nBest regards,\nPM Portfolio Admin`
  );
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

function sendRejectionEmail(email, name) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const subject = encodeURIComponent('PM Portfolio Sheet — Account Request');
  const body = encodeURIComponent(
    `${greeting}\n\nWe were unable to approve your account request for the PM Portfolio Sheet at this time.\n\nIf you believe this is a mistake, please contact your administrator.\n\nBest regards,\nPM Portfolio Admin`
  );
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

init();