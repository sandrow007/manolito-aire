/* ============================================================
   MANOLIT∞ AIRE — cookie-banner.js 
   ============================================================ */

function initCookieBanner(){
  let choice = null;
  try { choice = localStorage.getItem('manolito_cookies_choice'); } catch (e) { choice = null; }
  if (choice === 'accepted' || choice === 'rejected') return;

  if (document.getElementById('cookieGate')) return;

  const gate = document.createElement('div');
  gate.id = 'cookieGate';
  // Es un modal real (bloquea la página): aviso de consentimiento.
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-modal', 'true');
  /* 23-oct-2026: los textos de este aviso no viven en i18n.js, asi que en
     todos los idiomas menos el arabe salian en castellano aunque hubieras
     elegido otro en la puerta de entrada. Ahora estan aqui, en los 6 idiomas
     de la web, y se elige por el idioma activo de verdad: primero el que
     eliges en la puerta inicial, luego el de getCurrentLang() y, si no hay
     nada, el atributo lang del documento. */
  const TEXTOS = {
    es: {
      cookieGateAria: 'Aviso de cookies',
      cookieGateTitle: 'Antes de entrar',
      cookieGateBody: 'Usamos lo minimo posible: recordar tu idioma y tema, y permitir que el chat de Manolito funcione. Nada de publicidad ni rastreo de terceros.',
      cookieGatePolicy: 'Ver politica de cookies',
      cookieGateReject: 'Rechazar',
      cookieGateAccept: 'Aceptar'
    },
    ca: {
      cookieGateAria: "Avís de galetes",
      cookieGateTitle: "Abans d'entrar",
      cookieGateBody: "Fem servir el mínim possible: recordar el teu idioma i tema, i permetre que el xat de Manolito funcioni. Sense publicitat ni rastreig de tercers.",
      cookieGatePolicy: 'Veure la política de galetes',
      cookieGateReject: 'Rebutjar',
      cookieGateAccept: 'Acceptar'
    },
    gl: {
      cookieGateAria: 'Aviso de cookies',
      cookieGateTitle: 'Antes de entrar',
      cookieGateBody: 'Usamos o mínimo posible: recordar o teu idioma e tema, e permitir que o chat de Manolito funcione. Sen publicidade nin rastrexo de terceiros.',
      cookieGatePolicy: 'Ver política de cookies',
      cookieGateReject: 'Rexeitar',
      cookieGateAccept: 'Aceptar'
    },
    eu: {
      cookieGateAria: 'Cookieen oharra',
      cookieGateTitle: 'Sartu aurretik',
      cookieGateBody: 'Ahalik eta gutxien erabiltzen dugu: zure hizkuntza eta gaia gogoratzea, eta Manolito txata funtziona dezan baimena ematea. Ez publizitaterik ez eta hirugarrenek jarraipenik ez.',
      cookieGatePolicy: 'Ikusi cookieen politika',
      cookieGateReject: 'Baztertu',
      cookieGateAccept: 'Onartu'
    },
    en: {
      cookieGateAria: 'Cookie notice',
      cookieGateTitle: 'Before you go in',
      cookieGateBody: 'We use as little as possible: remembering your language and theme, and letting the Manolito chat work. No advertising and no third-party tracking.',
      cookieGatePolicy: 'See the cookie policy',
      cookieGateReject: 'Decline',
      cookieGateAccept: 'Accept'
    },
    ka: {
      cookieGateAria: 'ქუქიების შეტყობინება',
      cookieGateTitle: 'შესვლამდე',
      cookieGateBody: 'ჩვენ მაქსიმალურად ცოტას ვიყენებთ: ვიმახსოვრებთ თქვენს ენასა და თემას და ვაძლევთ მანოლიტოს ჩატს მუშაობის საშუალებას. არავითარი რეკლამა და არავითარი მესამე მხარის თვალთვალი.',
      cookieGatePolicy: 'ქუქიების პოლიტიკის ნახვა',
      cookieGateReject: 'უარყოფა',
      cookieGateAccept: 'მიღება'
    },
    ar: {
      cookieGateAria: 'إشعار ملفات تعريف الارتباط',
      cookieGateTitle: 'قبل الدخول',
      cookieGateBody: 'نستخدم الحد الأدنى فقط: تذكّر اللغة والمظهر، والسماح لدردشة مانوليتو بالعمل. بدون إعلانات وبدون تتبّع من أطراف ثالثة.',
      cookieGatePolicy: 'عرض سياسة ملفات تعريف الارتباط',
      cookieGateReject: 'رفض',
      cookieGateAccept: 'قبول'
    }
  };
  function idiomaActivo() {
    // 1) lo que eliges en la puerta de entrada de index
    let l = window.__manolitoLangInicial;
    // 2) lo que i18n.js tiene aplicado ahora mismo
    if (!l && typeof window.getCurrentLang === 'function') {
      try { l = window.getCurrentLang(); } catch (e) { }
    }
    // 3) lo guardado, por si acaso
    if (!l) { try { l = localStorage.getItem('manolito_lang'); } catch (e) { } }
    // 4) el atributo lang del documento
    if (!l) l = document.documentElement.getAttribute('lang');
    l = (l || 'es').toLowerCase().split('-')[0];
    return TEXTOS[l] ? l : 'es';
  }
  function t(clave, fallback) {
    try {
      const fn = window.getMessages;
      if (typeof fn === 'function') {
        const m = fn();
        if (m && m[clave] != null) return m[clave];
      }
    } catch (e) { }
    const dict = TEXTOS[idiomaActivo()] || TEXTOS.es;
    if (dict[clave] != null) return dict[clave];
    return fallback;
  }
  function actualizarIdiomaBannerCookies() {
    const txtAria = t('cookieGateAria', 'Aviso de cookies');
    const txtTitle = t('cookieGateTitle', 'Antes de entrar');
    const txtBody = t('cookieGateBody', 'Usamos lo mínimo posible: recordar tu idioma y tema, y permitir que el chat de Manolito funcione. Nada de publicidad ni rastreo de terceros.');
    const txtPolicy = t('cookieGatePolicy', 'Ver política de cookies');
    const txtReject = t('cookieGateReject', 'Rechazar');
    const txtAccept = t('cookieGateAccept', 'Aceptar');
    gate.setAttribute('aria-label', txtAria);
    const titulo = gate.querySelector('[data-cookie-title]');
    const cuerpo = gate.querySelector('[data-cookie-body]');
    const politica = gate.querySelector('[data-cookie-policy]');
    const rechazar = gate.querySelector('#cookieRejectBtn');
    const aceptar = gate.querySelector('#cookieAcceptBtn');
    if (titulo) titulo.textContent = txtTitle;
    if (cuerpo) cuerpo.textContent = txtBody;
    if (politica) politica.textContent = txtPolicy;
    if (rechazar) rechazar.textContent = txtReject;
    if (aceptar) aceptar.textContent = txtAccept;
  }
  window.actualizarIdiomaBannerCookies = actualizarIdiomaBannerCookies;
  
  gate.style.cssText = `
    position: fixed; inset: 0; z-index: 100000; background: rgba(1, 2, 3, 0.85);
    display: flex; align-items: center; justify-content: center; padding: 20px;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  
  gate.innerHTML = `
    <div style="background: #FBFAF7; color: #0E3B47; max-width: 420px; width: 100%;
      border-radius: 18px; padding: 26px 24px; box-shadow: 0 25px 60px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2);">
      <div data-cookie-title style="font-weight: 700; font-size: 1.15rem; color: #0E3B47; margin-bottom: 8px;">
        ${txtTitle}
      </div>
      <div style="font-size: 0.9rem; color: #17788A; margin-bottom: 18px; line-height: 1.4;">
        <span data-cookie-body>${txtBody}</span>
        <a data-cookie-policy href="cookies.html" style="color: #007A87; text-decoration: underline;">${txtPolicy}</a>.
      </div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button id="cookieRejectBtn" style="flex: 1; min-width: 120px; background: transparent; border: 1px solid #0E3B47;
          color: #0E3B47; border-radius: 999px; padding: 11px 14px; font-weight: 600; cursor: pointer;">${txtReject}</button>
        <button id="cookieAcceptBtn" style="flex: 1; min-width: 120px; background: #0E3B47; border: none;
          color: #FBFAF7; border-radius: 999px; padding: 11px 14px; font-weight: 600; cursor: pointer;">${txtAccept}</button>
      </div>
    </div>
  `;
  actualizarIdiomaBannerCookies();
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
    try { localStorage.setItem('manolito_cookies_choice', 'accepted'); } catch (e) { }
    cerrarGate();
    document.dispatchEvent(new CustomEvent('cookiesAceptadas'));
  });
  
  document.getElementById('cookieRejectBtn').addEventListener('click', () => {
    try {
      localStorage.setItem('manolito_cookies_choice', 'rejected');
      ['manolito_lang','manolito_theme','manolito_palette'].forEach(k => localStorage.removeItem(k));
    } catch (e) { }
    cerrarGate();
  });
}

function cookiesAccepted(){
  try { return localStorage.getItem('manolito_cookies_choice') === 'accepted'; } catch (e) { return false; }
}

function initCookieBannerCuandoIdiomaListo() {
  if (window.__manolitoEsperaIdioma && !window.__manolitoIdiomaResuelto) {
    // 12-oct-2026 (): el banner se creaba en español al elegir
    // idioma en la pantalla de entrada. Este script se ejecuta antes de que
    // i18n.js registre su propio listener de langChanged, así que al dispararse
    // el evento el banner se pintaba ANTES de que i18n aplicara el idioma
    // elegido. Con el setTimeout(0) la creación se difiere al final del evento,
    // cuando i18n.js ya ha cambiado los textos, y el banner sale en el idioma
    // correcto (árabe incluido) sin tocar diseño ni flujo.
    document.addEventListener('langChanged', () => setTimeout(initCookieBanner, 0), { once: true });
    // 23-oct-2026: red de seguridad. Si por lo que sea el evento no llega
    // (script externo caido, idioma sin guardar), el aviso sale igual con el
    // idioma que haya activo, en vez de no salir nunca.
    setTimeout(function () {
      if (!document.getElementById('cookieGate') && !window.__manolitoEsperaIdioma) initCookieBanner();
    }, 2500);
    return;
  }
  initCookieBanner();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCookieBannerCuandoIdiomaListo);
} else {
  initCookieBannerCuandoIdiomaListo();
}
