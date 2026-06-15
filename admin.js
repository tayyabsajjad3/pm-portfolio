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
                <button class="action-btn approve-btn" onclick="updateRole('${u.id}', 'user')">✓ Approve</button>
                <button class="action-btn make-admin-btn" onclick="updateRole('${u.id}', 'admin')">★ Make Admin</button>
                <button class="action-btn reject-btn" onclick="deleteUser('${u.id}')">✕ Reject</button>
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
                ${u.role !== 'admin' ? `<button class="action-btn make-admin-btn" onclick="updateRole('${u.id}', 'admin')">★ Make Admin</button>` : ''}
                ${u.role === 'admin' ? `<button class="action-btn make-user-btn" onclick="updateRole('${u.id}', 'user')">↓ Make User</button>` : ''}
                <button class="action-btn reject-btn" onclick="deleteUser('${u.id}')">✕ Remove</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }
}

async function updateRole(userId, role) {
  const { error } = await sb.from('profiles').update({ role }).eq('id', userId);
  if (error) { alert('Error updating role: ' + error.message); return; }
  loadUsers();
}

async function deleteUser(userId) {
  if (!confirm('Remove this user? They will need to sign up again.')) return;
  const { error } = await sb.from('profiles').delete().eq('id', userId);
  if (error) { alert('Error removing user: ' + error.message); return; }
  loadUsers();
}

init();
