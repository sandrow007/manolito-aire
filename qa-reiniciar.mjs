revexport default async function run(page, ui) {
  const pre = await page.evaluate(() => {
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
    setVal('rsInputOrigen', 'Plaza Nueva');
    setVal('rsInputDestino', 'Triana');
    window.__manolitoModoRuta = 'coche';
    window.__manolitUltimaPos = { lat: 37.38, lon: -5.98 };
    window.__manolitOrigenPuntoMarcado = { lat: 37.38, lon: -5.98 };
    try { window.ManolitCO2 && window.ManolitCO2.mostrar(12.3); } catch (e) { }
    return {
      inputO: document.getElementById('rsInputOrigen')?.value ?? null,
      inputD: document.getElementById('rsInputDestino')?.value ?? null,
      modo: window.__manolitoModoRuta,
    };
  });
  // Diagnóstico: ¿qué hay bajo el botón y por qué no recibe el clic?
  const diag = await page.evaluate(() => {
    const b = document.getElementById('rsBtnReset');
    if (!b) return { error: 'no existe #rsBtnReset' };
    const r = b.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const stack = document.elementsFromPoint(cx, cy).slice(0, 6).map(el =>
      el.tagName + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : ''));
    const cs = getComputedStyle(b);
    const panel = b.closest('#rsMapControls');
    const ps = panel ? getComputedStyle(panel) : null;
    return {
      rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      stack, enViewport: r.top >= 0 && r.bottom <= innerHeight && r.width > 0,
      btnPE: cs.pointerEvents, btnDisplay: cs.display, btnOpacity: cs.opacity,
      panelPE: ps && ps.pointerEvents, panelDisplay: ps && ps.display, panelOverflow: ps && ps.overflow,
      panelClase: panel && panel.className,
      scrollable: panel ? (panel.scrollWidth > panel.clientWidth) : null,
      tapaForm: (() => { const f = document.querySelector('#main-content .rs-form'); if (!f) return false; const fr = f.getBoundingClientRect(); return !(fr.right < r.left || fr.left > r.right || fr.bottom < r.top || fr.top > r.bottom); })(),
    };
  });
  const snap = await ui.snapshot();
  const m = snap.match(/@e(\d+) button "Reiniciar"/);
  if (!m) return { error: 'no hay botón Reiniciar', snap, diag };
  // Intento 1: clic por ref
  let via = 'ref';
  try { await ui.click('@e' + m[1]); }
  catch (e) { via = 'js'; await page.evaluate(() => document.getElementById('rsBtnReset').click()); }
  await page.waitForTimeout(800);
  const post = await page.evaluate(() => ({
    inputO: document.getElementById('rsInputOrigen')?.value ?? null,
    inputD: document.getElementById('rsInputDestino')?.value ?? null,
    modo: window.__manolitoModoRuta,
    ultimaPos: window.__manolitUltimaPos,
    origenMarcado: window.__manolitOrigenPuntoMarcado,
    rutaVacia: (() => { try { const s = (window.__rsMap || window.map) && (window.__rsMap || window.map).getSource('ruta'); if (!s) return 'sin fuente'; const d = s._data || s.serialize().data; return d.features.length === 0; } catch (e) { return 'err'; } })(),
    botonesModo: Array.from(document.querySelectorAll('#rsBtnWalk, #rsBtnBici, #rsBtnCar')).map(b => ({ id: b.id, activo: b.classList.contains('rs-activo') || b.classList.contains('activa') })),
  }));
  return { pre, diag, via, post };
}
