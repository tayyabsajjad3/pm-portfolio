// Auth functions

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  if (tab === 'login') {
    document.querySelectorAll('.tab')[0].classList.add('active');
    document.getElementById('loginPanel').classList.add('active');
  } else if (tab === 'signup') {
    document.querySelectorAll('.tab')[1].classList.add('active');
    document.getElementById('signupPanel').classList.add('active');
  } else if (tab === 'forgot') {
    document.getElementById('forgotPanel').classList.add('active');
  }
}

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'msg ' + type;
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showMsg('loginMsg', 'Please fill in all fields.', 'error');
    return;
  }

  const btn = document.querySelector('#loginPanel .btn');
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    showMsg('loginMsg', error.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Sign In';
    return;
  }

  const { data: profile } = await sb.from('profiles').select('role').eq('id', data.user.id).single();

  if (!profile || profile.role === 'pending') {
    window.location.href = 'pending.html';
    return;
  }

  if (profile.role === 'disabled') {
    await sb.auth.signOut();
    showMsg('loginMsg', 'Your account has been disabled. Please contact your administrator.', 'error');
    btn.disabled = false;
    btn.textContent = 'Sign In';
    return;
  }

  window.location.href = 'data.html';
}

async function handleSignup() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  if (!name || !email || !password) {
    showMsg('signupMsg', 'Please fill in all fields.', 'error');
    return;
  }

  if (password.length < 6) {
    showMsg('signupMsg', 'Password must be at least 6 characters.', 'error');
    return;
  }

  const btn = document.querySelector('#signupPanel .btn');
  btn.disabled = true;
  btn.textContent = 'Creating account...';

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  });

  if (error) {
    showMsg('signupMsg', error.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Create Account';
    return;
  }

  showMsg('signupMsg', '✓ Account created! Your request has been sent for approval. An admin will review and approve your account shortly.', 'success');
  btn.disabled = false;
  btn.textContent = 'Create Account';

  setTimeout(() => { window.location.href = 'pending.html'; }, 2000);
}

async function handleForgotPassword() {
  const email = document.getElementById('forgotEmail').value.trim();
  if (!email) {
    showMsg('forgotMsg', 'Please enter your email.', 'error');
    return;
  }

  const btn = document.querySelector('#forgotPanel .btn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://tayyabsajjad3.github.io/pm-portfolio/reset.html'
  });

  if (error) {
    showMsg('forgotMsg', error.message, 'error');
  } else {
    showMsg('forgotMsg', '✓ Reset link sent! Check your email and click the link to reset your password.', 'success');
  }

  btn.disabled = false;
  btn.textContent = 'Send Reset Link';
}

// Check if already logged in
async function checkSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    const { data: profile } = await sb.from('profiles').select('role').eq('id', session.user.id).single();
    if (!profile || profile.role === 'pending') {
      window.location.href = 'pending.html';
    } else if (profile.role === 'disabled') {
      await sb.auth.signOut();
    } else {
      window.location.href = 'data.html';
    }
  }
}

checkSession();