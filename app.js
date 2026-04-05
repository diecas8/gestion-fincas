// app.js
const SUPABASE_URL = "https://TU_PROYECTO.supabase.co";      // ← reemplaza
const SUPABASE_ANON_KEY = "sb_publishable_...";               // ← reemplaza con tu publishable key

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getCurrentUser() {
  const { data } = await sb.auth.getSession();
  return data.session?.user || null;
}

async function login(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById('authMsg').innerText = error.message;
  } else {
    window.location.href = 'app.html';
  }
}

async function register(email, password) {
  if (password.length < 6) {
    document.getElementById('authMsg').innerText = 'Mínimo 6 caracteres';
    return;
  }
  const { error } = await sb.auth.signUp({ email, password });
  if (error) {
    document.getElementById('authMsg').innerText = error.message;
  } else {
    document.getElementById('authMsg').innerText = 'Revisa tu correo para confirmar.';
  }
}

async function logout() {
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

function toast(msg, duration = 3000) {
  const t = document.createElement('div');
  t.className = 'toast-message';
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), duration);
}