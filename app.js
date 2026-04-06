// ==============================================
// app.js - CONEXIÓN A SUPABASE (CLAVE CORRECTA)
// ==============================================
const SUPABASE_URL = "https://tekjgrrshwqvmtfbcikc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRla2pncnJzaHdxdm10ZmJjaWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzOTc3MjQsImV4cCI6MjA5MDk3MzcyNH0.Am7MRaitxlWAaMv2Fc0vlwSsQA9mrOysfrThLFF-R3Q";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getCurrentUser() {
  const { data } = await sb.auth.getSession();
  return data.session?.user || null;
}

async function login(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    const msgDiv = document.getElementById('authMsg');
    if (msgDiv) msgDiv.innerText = error.message;
    return false;
  }
  return true;
}

async function register(email, password) {
  if (password.length < 6) {
    const msgDiv = document.getElementById('authMsg');
    if (msgDiv) msgDiv.innerText = 'Mínimo 6 caracteres';
    return false;
  }
  const { error } = await sb.auth.signUp({ email, password });
  if (error) {
    const msgDiv = document.getElementById('authMsg');
    if (msgDiv) msgDiv.innerText = error.message;
    return false;
  }
  const msgDiv = document.getElementById('authMsg');
  if (msgDiv) msgDiv.innerText = 'Revisa tu correo para confirmar.';
  return true;
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