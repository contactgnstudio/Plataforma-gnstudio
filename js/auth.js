// ============================================================
// js/auth.js — Login provisional para GN Studio OS
// ============================================================

var GN_AUTH_CONFIG = {
  username: 'admin',
  password: 'GNStudio2026!',
  recoveryEmail: 'contact@gnstudio.space'
};

var GN_AUTH_SESSION_KEY = 'gn_auth_session';
var GN_AUTH_CALLBACK = null;

function gnTieneSesion() {
  return sessionStorage.getItem(GN_AUTH_SESSION_KEY) === 'active';
}

function gnGuardarSesion() {
  sessionStorage.setItem(GN_AUTH_SESSION_KEY, 'active');
}

function gnLimpiarSesion() {
  sessionStorage.removeItem(GN_AUTH_SESSION_KEY);
}

function gnMostrarLogin() {
  var overlay = document.getElementById('gn-login-overlay');
  var logoutBtn = document.getElementById('gn-logout-btn');

  if (overlay) overlay.style.display = 'flex';
  if (logoutBtn) logoutBtn.style.display = 'none';

  document.body.classList.add('login-locked');
}

function gnOcultarLogin() {
  var overlay = document.getElementById('gn-login-overlay');
  var logoutBtn = document.getElementById('gn-logout-btn');

  if (overlay) overlay.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = 'inline-flex';

  document.body.classList.remove('login-locked');
}

function gnMostrarFeedbackLogin(tipo, mensaje) {
  var feedback = document.getElementById('feedback-login');
  if (!feedback) return;

  feedback.className = 'form-feedback ' + tipo;
  feedback.textContent = mensaje;
}

function gnProcesarLogin(event) {
  if (event) event.preventDefault();

  var usuario = document.getElementById('login-usuario');
  var password = document.getElementById('login-password');

  var userValue = usuario ? usuario.value.trim() : '';
  var passValue = password ? password.value : '';

  if (!userValue || !passValue) {
    gnMostrarFeedbackLogin('error', '❌ Completa usuario y contraseña');
    return false;
  }

  if (
    userValue === GN_AUTH_CONFIG.username &&
    passValue === GN_AUTH_CONFIG.password
  ) {
    gnGuardarSesion();
    gnOcultarLogin();
    gnMostrarFeedbackLogin('success', '✅ Acceso concedido');

    if (typeof GN_AUTH_CALLBACK === 'function') {
      GN_AUTH_CALLBACK();
      GN_AUTH_CALLBACK = null;
    }

    return false;
  }

  gnMostrarFeedbackLogin('error', '❌ Usuario o contraseña incorrectos');
  return false;
}

function gnCerrarSesion() {
  gnLimpiarSesion();
  window.location.reload();
}

function gnRecuperarPassword() {
  var subject = encodeURIComponent('Cambio o recuperación de contraseña - GN Studio OS');
  var body = encodeURIComponent(
    'Hola,\n\nNecesitamos cambiar o recuperar la contraseña de acceso a la plataforma GN Studio OS.\n'
  );

  window.location.href =
    'mailto:' + GN_AUTH_CONFIG.recoveryEmail +
    '?subject=' + subject +
    '&body=' + body;

  return false;
}

function gnAuthInit(onSuccess) {
  GN_AUTH_CALLBACK = onSuccess || null;

  var form = document.getElementById('login-form');
  if (form && !form.dataset.bound) {
    form.addEventListener('submit', gnProcesarLogin);
    form.dataset.bound = '1';
  }

  if (gnTieneSesion()) {
    gnOcultarLogin();
    if (typeof GN_AUTH_CALLBACK === 'function') {
      GN_AUTH_CALLBACK();
      GN_AUTH_CALLBACK = null;
    }
  } else {
    gnMostrarLogin();
  }
}
