// Tarjeta visual de una parada de transporte público (DOM del popup del mapa).
(() => {
  'use strict';

  function hora(departure, realTime) {
    if (!departure) return '';
    const fecha = new Date(departure);
    const texto = Number.isFinite(fecha.getTime())
      ? fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : String(departure);
    return (realTime ? '● ' : '') + texto;
  }

  function filaSalida(item) {
    const fecha = new Date(item.departure);
    const pasada = Number.isFinite(fecha.getTime()) && fecha.getTime() < Date.now();
    const li = document.createElement('li');
    li.className = 'tp-departure' + (pasada ? ' is-past' : '');
    const name = document.createElement('span');
    name.className = 'tp-line-name';
    name.textContent = item.name + (item.headsign ? ' · ' + item.headsign : '');
    if (/\b24\b/.test(item.name)) {
      const badge = document.createElement('span');
      badge.className = 'tp-line-badge';
      badge.textContent = '24';
      li.appendChild(badge);
      name.textContent = item.headsign || 'Línea';
    }
    const time = document.createElement('span');
    time.className = 'tp-time' + (item.realTime ? ' is-realtime' : '');
    time.textContent = hora(item.departure, item.realTime);
    li.append(name, time);
    return li;
  }

  function pintarSalidas(body, items) {
    body.textContent = '';
    if (!items.length) { body.textContent = 'Sin salidas próximas.'; return; }
    const list = document.createElement('ul');
    list.className = 'tp-departure-list';
    items.forEach(item => list.appendChild(filaSalida(item)));
    body.appendChild(list);
  }

  function crearTarjetaParada(props, alPulsarComoLlegar) {
    const box = document.createElement('div');
    box.className = 'tp-stop-card';
    const handle = document.createElement('div'); handle.className = 'tp-sheet-handle';
    const header = document.createElement('div'); header.className = 'tp-stop-header';
    const headingWrap = document.createElement('div');
    const eyebrow = document.createElement('span'); eyebrow.className = 'tp-eyebrow'; eyebrow.textContent = 'PARADA';
    const title = document.createElement('strong'); title.className = 'tp-stop-title'; title.textContent = props.name || 'Parada';
    headingWrap.append(eyebrow, title);
    const directions = document.createElement('button'); directions.type = 'button'; directions.className = 'tp-directions';
    directions.setAttribute('aria-label', 'Cómo llegar');
    directions.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 21 12l-9 9.2-2-2 5.7-5.8H4v-2.8h11.7L10 4.8z" fill="currentColor"/></svg><span>Cómo llegar</span>';
    directions.addEventListener('click', alPulsarComoLlegar);
    header.append(headingWrap, directions);
    const body = document.createElement('div'); body.className = 'tp-departures'; body.textContent = 'Cargando salidas…';
    box.append(handle, header, body);
    return { box, body };
  }

  function instalarEstilos() {
    if (document.getElementById('tp-stop-card-styles')) return;
    const style = document.createElement('style');
    style.id = 'tp-stop-card-styles';
    style.textContent = `
      .tp-map-popup .maplibregl-popup-content { padding:0; overflow:hidden; border-radius:24px; background:transparent; box-shadow:0 18px 54px rgba(15,35,45,.2); }
      .tp-map-popup .maplibregl-popup-tip { display:none; }
      .tp-map-popup .maplibregl-popup-close-button { z-index:3; top:12px; right:12px; width:30px; height:30px; border-radius:50%; background:rgba(17,39,48,.07); color:#18313a; font-size:20px; }
      .tp-stop-card { box-sizing:border-box; width:min(320px, calc(100vw - 28px)); max-height:min(70vh, 520px); overflow:auto; padding:20px; border:1px solid rgba(255,255,255,.76); border-radius:24px; background:rgba(250,253,253,.82); color:#18313a; box-shadow:inset 0 1px rgba(255,255,255,.85); backdrop-filter:blur(28px) saturate(1.5); -webkit-backdrop-filter:blur(28px) saturate(1.5); font:14px/1.45 Inter,Montserrat,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
      .tp-sheet-handle { display:none; }
      .tp-stop-header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding-right:28px; }
      .tp-eyebrow { display:block; margin-bottom:4px; color:#71858b; font-size:10px; font-weight:750; letter-spacing:.15em; }
      .tp-stop-title { display:block; color:#18313a; font-size:19px; font-weight:700; letter-spacing:-.035em; line-height:1.2; }
      .tp-directions { display:inline-flex; flex:none; align-items:center; gap:7px; min-height:38px; padding:0 13px; border:0; border-radius:13px; background:#183f49; color:#fff; font:650 12px/1 Inter,Montserrat,ui-sans-serif,system-ui,sans-serif; cursor:pointer; box-shadow:0 5px 13px rgba(24,63,73,.2); }
      .tp-directions svg { width:14px; height:14px; transform:rotate(-45deg); }
      .tp-directions:hover { background:#245c67; }
      .tp-departures { margin-top:17px; }
      .tp-departure-list { display:grid; gap:2px; margin:0; padding:0; list-style:none; }
      .tp-departure { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:36px; border-top:1px solid rgba(23,56,65,.08); }
      .tp-line-name { overflow:hidden; color:#52666c; font-size:12px; text-overflow:ellipsis; white-space:nowrap; }
      .tp-line-badge { flex:none; min-width:20px; padding:4px 7px; border-radius:999px; background:#e8f5f4; color:#18525b; font-size:11px; font-weight:800; text-align:center; }
      .tp-time { flex:none; padding:5px 9px; border-radius:999px; background:rgba(53,196,212,.16); color:#174e59; font-size:12px; font-weight:750; font-variant-numeric:tabular-nums; }
      .tp-time.is-realtime { background:rgba(43,152,115,.13); color:#207957; }
      .tp-departure.is-past { opacity:.28; }
      @media (max-width:600px) {
        .tp-map-popup { position:fixed !important; left:0 !important; right:0 !important; top:auto !important; bottom:0 !important; width:100vw; max-width:none !important; transform:none !important; pointer-events:none; }
        .tp-map-popup .maplibregl-popup-content { width:100%; max-width:none; border-radius:26px 26px 0 0; box-shadow:0 -12px 40px rgba(16,38,46,.16); pointer-events:auto; }
        .tp-map-popup .maplibregl-popup-content > div { max-width:none; }
        .tp-map-popup-anchor-bottom, .tp-map-popup-anchor-top, .tp-map-popup-anchor-left, .tp-map-popup-anchor-right, .tp-map-popup-anchor-top-left, .tp-map-popup-anchor-top-right, .tp-map-popup-anchor-bottom-left, .tp-map-popup-anchor-bottom-right { transform:none !important; }
        .tp-map-popup .maplibregl-popup-close-button { top:14px; right:18px; }
        .tp-stop-card { width:100%; max-width:none; max-height:min(48vh, 420px); padding:10px 20px calc(18px + env(safe-area-inset-bottom)); border-width:1px 0 0; border-radius:26px 26px 0 0; pointer-events:auto; }
        .tp-sheet-handle { display:block; width:38px; height:4px; margin:0 auto 14px; border-radius:9px; background:rgba(30,59,67,.22); }
        .tp-stop-header { padding-right:34px; }
      }
      @media (prefers-reduced-motion:no-preference) { .tp-map-popup .maplibregl-popup-content { animation:tp-sheet-in .28s cubic-bezier(.2,.8,.2,1) both; } @keyframes tp-sheet-in { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } } }
    `;
    document.head.appendChild(style);
  }

  instalarEstilos();
  window.ManolitoTransporteTarjeta = { crearTarjetaParada, pintarSalidas, instalarEstilos };
})();
