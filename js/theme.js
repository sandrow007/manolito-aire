/* ============================================================
   MANOLITO AIRE — tema (claro/oscuro) y paleta de acento
   ============================================================ */

function initTheme(){
  // Por defecto arranca en modo oscuro con acento cian "cosmos": la misma
  // familia visual que su web hermana islasdecalorsevilla.com.
  const savedTheme = localStorage.getItem('manolito_theme') || 'dark';
  const savedPalette = localStorage.getItem('manolito_palette') || 'cosmos';

  document.documentElement.setAttribute('data-theme', savedTheme);
  document.documentElement.setAttribute('data-palette', savedPalette);

  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.textContent = savedTheme === 'dark' ? '☀' : '☾';

  document.querySelectorAll('#paletteToggle button').forEach(b=>{
    b.classList.toggle('active', b.dataset.palette === savedPalette);
  });
}

function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('manolito_theme', next);
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.textContent = next === 'dark' ? '☀' : '☾';
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