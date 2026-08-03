/* ============================================================
   MANOLITO AIRE — puerta de consentimiento de cookies
   Bloquea la web hasta que el usuario elige Aceptar o Rechazar.
   Si rechaza: no se guardan preferencias (idioma/tema) y el chat
   solo usa las respuestas locales, sin llamar a servicios externos.
   ============================================================ */

function initCookieBanner(){
  const choice = localStorage.getItem('manolito_cookies_choice');
  if (choice === 'accepted' || choice === 'rejected') return;

  const gate = document.createElement('div');
  gate.id = 'cookieGate';
  gate.style.cssText = `
    position:fixed; inset:0; z-index:110; background: rgba(10,16,20,0.72);
    display:flex; align-items:center; justify-content:center; padding:20px;
  `;
  gate.innerHTML = `
    <div style="background:var(--paper); color:var(--ink); max-width:420px; width:100%;
      border-radius:18px; padding:26px 24px; font-family:var(--font-body); box-shadow:0 20px 50px rgba(0,0,0,0.3);">
      <div style="font-family:var(--font-display); font-weight:700; font-size:1.15rem; color:var(--sky-deep); margin-bottom:8px;">
        Antes de entrar
      </div>
      <div style="font-size:0.9rem; color:var(--sky-mid); margin-bottom:18px;">
        Usamos lo mínimo posible: recordar tu idioma y tema, y permitir que el chat de Manolito
        funcione. Nada de publicidad ni rastreo de terceros.
        <a href="cookies.html" style="color:var(--accent);">Ver política de cookies</a>.
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button id="cookieRejectBtn" style="flex:1; min-width:120px; background:transparent; border:1px solid var(--line);
          color:var(--sky-deep); border-radius:999px; padding:11px 14px; font-weight:600; cursor:pointer;">Rechazar</button>
        <button id="cookieAcceptBtn" style="flex:1; min-width:120px; background:var(--sky-deep); border:none;
          color:var(--paper); border-radius:999px; padding:11px 14px; font-weight:600; cursor:pointer;">Aceptar</button>
      </div>
    </div>
  `;
  document.body.appendChild(gate);

  document.getElementById('cookieAcceptBtn').addEventListener('click', () => {
    localStorage.setItem('manolito_cookies_choice', 'accepted');
    gate.remove();
  });
  document.getElementById('cookieRejectBtn').addEventListener('click', () => {
    localStorage.setItem('manolito_cookies_choice', 'rejected');
    // limpiamos cualquier preferencia guardada antes del rechazo
    ['manolito_lang','manolito_theme','manolito_palette'].forEach(k => localStorage.removeItem(k));
    gate.remove();
  });
}

function cookiesAccepted(){
  return localStorage.getItem('manolito_cookies_choice') === 'accepted';
}

document.addEventListener('DOMContentLoaded', initCookieBanner);
