/* ============================================================
   MANOLIT∞ AIRE — cookie-banner.js 
   ============================================================ */

function initCookieBanner(){
  const choice = localStorage.getItem('manolito_cookies_choice');
  if (choice === 'accepted' || choice === 'rejected') return;

  if (document.getElementById('cookieGate')) return;

  const gate = document.createElement('div');
  gate.id = 'cookieGate';
  
  gate.style.cssText = `
    position: fixed; inset: 0; z-index: 100000; background: rgba(1, 2, 3, 0.85);
    display: flex; align-items: center; justify-content: center; padding: 20px;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  
  gate.innerHTML = `
    <div style="background: #FBFAF7; color: #1C3144; max-width: 420px; width: 100%;
      border-radius: 18px; padding: 26px 24px; box-shadow: 0 25px 60px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2);">
      <div style="font-weight: 700; font-size: 1.15rem; color: #1C3144; margin-bottom: 8px;">
        Antes de entrar
      </div>
      <div style="font-size: 0.9rem; color: #2B4A63; margin-bottom: 18px; line-height: 1.4;">
        Usamos lo mínimo posible: recordar tu idioma y tema, y permitir que el chat de Manolito
        funcione. Nada de publicidad ni rastreo de terceros.
        <a href="cookies.html" style="color: #007A87; text-decoration: underline;">Ver política de cookies</a>.
      </div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button id="cookieRejectBtn" style="flex: 1; min-width: 120px; background: transparent; border: 1px solid #1C3144;
          color: #1C3144; border-radius: 999px; padding: 11px 14px; font-weight: 600; cursor: pointer;">Rechazar</button>
        <button id="cookieAcceptBtn" style="flex: 1; min-width: 120px; background: #1C3144; border: none;
          color: #FBFAF7; border-radius: 999px; padding: 11px 14px; font-weight: 600; cursor: pointer;">Aceptar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(gate);

  document.getElementById('cookieAcceptBtn').addEventListener('click', () => {
    localStorage.setItem('manolito_cookies_choice', 'accepted');
    gate.remove();
    document.dispatchEvent(new CustomEvent('cookiesAceptadas'));
  });
  
  document.getElementById('cookieRejectBtn').addEventListener('click', () => {
    localStorage.setItem('manolito_cookies_choice', 'rejected');
    ['manolito_lang','manolito_theme','manolito_palette'].forEach(k => localStorage.removeItem(k));
    gate.remove();
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