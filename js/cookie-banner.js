/* ============================================================
   MANOLIT∞ AIRE — cookie-banner.js 
   ============================================================ */

function initCookieBanner(){
  const choice = localStorage.getItem('manolito_cookies_choice');
  if (choice === 'accepted' || choice === 'rejected') return;

  if (document.getElementById('cookieGate')) return;

  const gate = document.createElement('div');
  gate.id = 'cookieGate';
  // Es un modal real (bloquea la página): aviso de consentimiento.
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-modal', 'true');
  gate.setAttribute('aria-label', 'Aviso de cookies');
  
  gate.style.cssText = `
    position: fixed; inset: 0; z-index: 100000; background: rgba(1, 2, 3, 0.85);
    display: flex; align-items: center; justify-content: center; padding: 20px;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  
  gate.innerHTML = `
    <div style="background: #FBFAF7; color: #0E3B47; max-width: 420px; width: 100%;
      border-radius: 18px; padding: 26px 24px; box-shadow: 0 25px 60px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2);">
      <div style="font-weight: 700; font-size: 1.15rem; color: #0E3B47; margin-bottom: 8px;">
        Antes de entrar
      </div>
      <div style="font-size: 0.9rem; color: #17788A; margin-bottom: 18px; line-height: 1.4;">
        Usamos lo mínimo posible: recordar tu idioma y tema, y permitir que el chat de Manolito
        funcione. Nada de publicidad ni rastreo de terceros.
        <a href="cookies.html" style="color: #007A87; text-decoration: underline;">Ver política de cookies</a>.
      </div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button id="cookieRejectBtn" style="flex: 1; min-width: 120px; background: transparent; border: 1px solid #0E3B47;
          color: #0E3B47; border-radius: 999px; padding: 11px 14px; font-weight: 600; cursor: pointer;">Rechazar</button>
        <button id="cookieAcceptBtn" style="flex: 1; min-width: 120px; background: #0E3B47; border: none;
          color: #FBFAF7; border-radius: 999px; padding: 11px 14px; font-weight: 600; cursor: pointer;">Aceptar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(gate);

  /* Focus trap: mientras el aviso está abierto, Tab no puede salir de él.
     Al cerrarse, el foco vuelve al elemento que lo tenía antes. */
  const focoPrevio = document.activeElement;
  const focoables = () => Array.from(gate.querySelectorAll('button, a[href]'));
  const btnAceptar = document.getElementById('cookieAcceptBtn');
  if (btnAceptar) btnAceptar.focus();

  function cerrarGate() {
    gate.remove();
    if (focoPrevio && typeof focoPrevio.focus === 'function') focoPrevio.focus();
  }

  gate.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      const elems = focoables();
      if (!elems.length) return;
      const primero = elems[0];
      const ultimo = elems[elems.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    } else if (e.key === 'Escape') {
      // Escape = rechazar (cerrar sin aceptar, como el botón "Rechazar")
      e.preventDefault();
      document.getElementById('cookieRejectBtn')?.click();
    }
  });

  document.getElementById('cookieAcceptBtn').addEventListener('click', () => {
    localStorage.setItem('manolito_cookies_choice', 'accepted');
    cerrarGate();
    document.dispatchEvent(new CustomEvent('cookiesAceptadas'));
  });
  
  document.getElementById('cookieRejectBtn').addEventListener('click', () => {
    localStorage.setItem('manolito_cookies_choice', 'rejected');
    ['manolito_lang','manolito_theme','manolito_palette'].forEach(k => localStorage.removeItem(k));
    cerrarGate();
  });
}

function cookiesAccepted(){
  return localStorage.getItem('manolito_cookies_choice') === 'accepted';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCookieBanner);
} else {
  initCookieBanner();
}