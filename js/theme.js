/* ============================================================
   MANOLITO AIRE — tema (claro/oscuro) y paleta de acento
   ============================================================ */

function leerTemaGuardado(){
  try { return localStorage.getItem('manolito_theme'); }
  catch (e) { return null; }
}

function temaDelSistema(){
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

function aplicarTema(theme){
  document.documentElement.setAttribute('data-theme', theme);
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.textContent = theme === 'dark' ? '☀' : '☾';
}

function initTheme(){
  const guardado = leerTemaGuardado();
  const savedTheme = guardado === 'light' || guardado === 'dark' ? guardado : temaDelSistema();
  const savedPalette = localStorage.getItem('manolito_palette') || 'cosmos';

  aplicarTema(savedTheme);
  document.documentElement.setAttribute('data-palette', savedPalette);

  // Si no hay preferencia manual, acompaña los cambios del tema del sistema.
  if (!guardado && window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const sincronizarTemaSistema = (evento) => {
      if (!leerTemaGuardado()) aplicarTema(evento.matches ? 'light' : 'dark');
    };
    if (media.addEventListener) media.addEventListener('change', sincronizarTemaSistema);
    else if (media.addListener) media.addListener(sincronizarTemaSistema);
  }

  document.querySelectorAll('#paletteToggle button').forEach(b=>{
    b.classList.toggle('active', b.dataset.palette === savedPalette);
  });
}

function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('manolito_theme', next); } catch (e) {}
  aplicarTema(next);
}

function setPalette(p){
  document.documentElement.setAttribute('data-palette', p);
  localStorage.setItem('manolito_palette', p);
  document.querySelectorAll('#paletteToggle button').forEach(b=>{
    b.classList.toggle('active', b.dataset.palette === p);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  const paletteToggle = document.getElementById('paletteToggle');
  if (paletteToggle){
    paletteToggle.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') setPalette(e.target.dataset.palette);
    });
  }
});
