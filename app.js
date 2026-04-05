// ============================================
// app.js - Conexión a Supabase (versión productor)
// ============================================

// ⬇️⬇️⬇️ REEMPLAZA ESTOS DOS VALORES ⬇️⬇️⬇️
const SUPABASE_URL = "https://tekjgrrshwqvmtfbcikc.supabase.co";     
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRla2pncnJzaHdxdm10ZmJjaWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzOTc3MjQsImV4cCI6MjA5MDk3MzcyNH0.Am7MRaitxlWAaMv2Fc0vlwSsQA9mrOysfrThLFF-R3Q";     
// ⬆️⬆️⬆️ REEMPLAZA ESTOS DOS VALORES ⬆️⬆️⬆️

// Crear el cliente de Supabase
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Obtener el usuario actual
async function getCurrentUser() {
  const { data } = await sb.auth.getSession();
  return data.session?.user || null;
}

// Iniciar sesión
async function login(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById('authMsg').innerText = error.message;
    return false;
  }
  return true;
}

// Registro
async function register(email, password) {
  if (password.length < 6) {
    document.getElementById('authMsg').innerText = 'La contraseña debe tener al menos 6 caracteres';
    return false;
  }
  const { error } = await sb.auth.signUp({ email, password });
  if (error) {
    document.getElementById('authMsg').innerText = error.message;
    return false;
  }
  document.getElementById('authMsg').innerText = 'Registro exitoso. Revisa tu correo para confirmar.';
  return true;
}

// Cerrar sesión
async function logout() {
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

// Mostrar mensaje tipo toast
function toast(msg, duration = 3000) {
  const t = document.createElement('div');
  t.className = 'toast-message';
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), duration);
}