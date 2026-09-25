/* ============================================================
   MANOLIT AIRE, css/ambientes.css (sep-2026, NUEVO)
   Ambientes climatológicos automáticos: los días señalados la
   web cambia de piel ENTERA (fondos, tintas y acentos) según la
   fecha. js/ambientes.js pone el atributo data-ambiente en
   <html> y este archivo hace el resto. Fuera de esas fechas no
   se aplica NADA: la paleta del usuario y el modo oscuro siguen
   mandando como siempre.

   Cómo funciona la prioridad: estas reglas tienen la misma
   especificidad que [data-palette] y [data-theme] de style.css,
   pero este archivo se carga DESPUÉS, así que en empate gana el
   ambiente. Los colores de estado del aire (--breath-*) NO se
   tocan: son datos, no decoración.
   ============================================================ */

/* ---------- SEMANA SANTA (Domingo de Ramos → Resurrección) ----------
   Morado penitente de túnicas y dorado de cera de vela. */
[data-ambiente="semana-santa"]{
  --paper:#FBF6FF; --mist:#F1E6FB;
  --ink:#2A0A45;   --sky-deep:#3B0764; --sky-mid:#6B21A8;
  --accent:#7E22CE; --accent-soft:rgba(126,34,206,0.14);
  --accent-2:#B8860B; --accent-text:#6B21A8;
  --line:rgba(59,7,100,0.14); --surface:rgba(255,253,255,0.90);
  --border:rgba(59,7,100,0.16);
}
[data-theme="dark"][data-ambiente="semana-santa"]{
  --paper:#0D0318; --mist:#1A0930;
  --ink:#F3E8FF;   --sky-deep:#F3E8FF; --sky-mid:#C084FC;
  --accent:#C9A227; --accent-soft:rgba(201,162,39,0.16);
  --accent-2:#C084FC; --accent-text:#E9C46A;
  --line:rgba(192,132,252,0.16); --surface:rgba(26,9,48,0.90);
  --border:rgba(192,132,252,0.20);
}

/* ---------- AÑO NUEVO (1 de enero) ----------
   Champaña y medianoche: dorado sobre noche azulada. */
[data-ambiente="anonuevo"]{
  --paper:#FFFBEF; --mist:#F5EBD3;
  --ink:#1C1A12;   --sky-deep:#574208; --sky-mid:#8C6D1F;
  --accent:#D4A017; --accent-soft:rgba(212,160,23,0.16);
  --accent-2:#1E3A5F; --accent-text:#7A5A00;
  --line:rgba(87,66,8,0.16); --surface:rgba(255,252,240,0.90);
  --border:rgba(87,66,8,0.16);
}
[data-theme="dark"][data-ambiente="anonuevo"]{
  --paper:#07060F; --mist:#101022;
  --ink:#F5EEDC;   --sky-deep:#F5EEDC; --sky-mid:#E9C46A;
  --accent:#FFD166; --accent-soft:rgba(255,209,102,0.16);
  --accent-2:#7DF9FF; --accent-text:#FFD166;
  --line:rgba(255,209,102,0.16); --surface:rgba(16,16,34,0.90);
  --border:rgba(255,209,102,0.20);
}

/* ---------- DÍA DEL CLIMA (26 mar) y DÍA DE LA TIERRA (22 abr) ----------
   Verde ecológico de hoja nueva. */
[data-ambiente="ambiental"]{
  --paper:#F2FBF3; --mist:#DFF2E2;
  --ink:#0F2A17;   --sky-deep:#14532D; --sky-mid:#15803D;
  --accent:#16A34A; --accent-soft:rgba(22,163,74,0.15);
  --accent-2:#0E7490; --accent-text:#0D6B32;
  --line:rgba(20,83,45,0.14); --surface:rgba(255,255,255,0.88);
  --border:rgba(20,83,45,0.15);
}
[data-theme="dark"][data-ambiente="ambiental"]{
  --paper:#03130A; --mist:#072015;
  --ink:#DDF7E4;   --sky-deep:#DDF7E4; --sky-mid:#4ADE80;
  --accent:#4ADE80; --accent-soft:rgba(74,222,128,0.15);
  --accent-2:#2DD4BF; --accent-text:#7CE7A2;
  --line:rgba(74,222,128,0.15); --surface:rgba(7,32,21,0.90);
  --border:rgba(74,222,128,0.20);
}

/* ---------- ORGULLO (todo junio, salvo 23-24 que es San Juan) ----------
   Base limpia y el arcoíris donde se ve: la marca y la barra
   superior. Un degradado no puede ser un "color" en CSS, así que
   el arcoíris va en fondos y bordes, nunca como --accent. */
[data-ambiente="orgullo"]{
  --paper:#FFFFFF; --mist:#F4F6FB;
  --ink:#1E293B;   --sky-deep:#0F172A; --sky-mid:#475569;
  --accent:#7B2FFF; --accent-soft:rgba(123,47,255,0.14);
  --accent-2:#E63E5F; --accent-text:#6A1FE0;
  --line:rgba(30,41,59,0.12); --surface:rgba(255,255,255,0.90);
  --border:rgba(30,41,59,0.14);
}
[data-theme="dark"][data-ambiente="orgullo"]{
  --paper:#0B0D1A; --mist:#141830;
  --ink:#F1F5F9;   --sky-deep:#F1F5F9; --sky-mid:#94A3B8;
  --accent:#B28CFF; --accent-soft:rgba(178,140,255,0.15);
  --accent-2:#FF8FA8; --accent-text:#C9AEFF;
  --line:rgba(148,163,184,0.16); --surface:rgba(20,24,48,0.90);
  --border:rgba(148,163,184,0.20);
}
[data-ambiente="orgullo"] .topbar{
  border-bottom:3px solid transparent;
  border-image:linear-gradient(90deg,#E40303,#FF8C00,#FFED00,#008026,#24408E,#732982) 1;
}
[data-ambiente="orgullo"] .wordmark .wordmark-name{
  background:linear-gradient(110deg,#E40303 0%,#FF8C00 20%,#D4B800 40%,#008026 60%,#24408E 80%,#732982 100%);
  background-size:300% 100%;
  -webkit-background-clip:text; background-clip:text;
  -webkit-text-fill-color:transparent; color:transparent;
}

/* ---------- SAN JUAN (23-24 de junio) ----------
   Noche de hogueras: brasa naranja y mar nocturno. */
[data-ambiente="sanjuan"]{
  --paper:#FFF7EC; --mist:#FBE8CE;
  --ink:#2A1305;   --sky-deep:#3B1A04; --sky-mid:#9A3412;
  --accent:#EA580C; --accent-soft:rgba(234,88,12,0.16);
  --accent-2:#0369A1; --accent-text:#B34408;
  --line:rgba(59,26,4,0.14); --surface:rgba(255,251,244,0.90);
  --border:rgba(59,26,4,0.16);
}
[data-theme="dark"][data-ambiente="sanjuan"]{
  --paper:#0A0503; --mist:#170B05;
  --ink:#FFEEDD;   --sky-deep:#FFEEDD; --sky-mid:#FB923C;
  --accent:#FB923C; --accent-soft:rgba(251,146,60,0.16);
  --accent-2:#38BDF8; --accent-text:#FFB86B;
  --line:rgba(251,146,60,0.16); --surface:rgba(23,11,5,0.90);
  --border:rgba(251,146,60,0.20);
}

/* ---------- HALLOWEEN (31 de octubre) ----------
   Negro calabaza con un toque de morado brujería. */
[data-ambiente="halloween"]{
  --paper:#FFF8F0; --mist:#F7E8D8;
  --ink:#1C0E04;   --sky-deep:#26130A; --sky-mid:#7C2D12;
  --accent:#EA580C; --accent-soft:rgba(234,88,12,0.15);
  --accent-2:#6B21A8; --accent-text:#B34408;
  --line:rgba(38,19,10,0.14); --surface:rgba(255,252,247,0.90);
  --border:rgba(38,19,10,0.16);
}
[data-theme="dark"][data-ambiente="halloween"]{
  --paper:#0C0A08; --mist:#171310;
  --ink:#F8FAFC;   --sky-deep:#F8FAFC; --sky-mid:#FB923C;
  --accent:#FB923C; --accent-soft:rgba(251,146,60,0.16);
  --accent-2:#A855F7; --accent-text:#FFB86B;
  --line:rgba(251,146,60,0.14); --surface:rgba(23,19,16,0.92);
  --border:rgba(251,146,60,0.20);
}

/* ---------- NAVIDAD (24-31 de diciembre) ----------
   Rojo de lazo, verde pino y dorado de belén. */
[data-ambiente="navidad"]{
  --paper:#FDF9F4; --mist:#F3EAE0;
  --ink:#1F2937;   --sky-deep:#7F1D1D; --sky-mid:#166534;
  --accent:#C41E3A; --accent-soft:rgba(196,30,58,0.14);
  --accent-2:#166534; --accent-text:#A3122C;
  --line:rgba(127,29,29,0.14); --surface:rgba(255,255,255,0.90);
  --border:rgba(127,29,29,0.16);
}
[data-theme="dark"][data-ambiente="navidad"]{
  --paper:#080D0A; --mist:#0F1A14;
  --ink:#F1F5F0;   --sky-deep:#F1F5F0; --sky-mid:#4ADE80;
  --accent:#EF4444; --accent-soft:rgba(239,68,68,0.16);
  --accent-2:#E9C46A; --accent-text:#FF8A8A;
  --line:rgba(74,222,128,0.14); --surface:rgba(15,26,20,0.90);
  --border:rgba(74,222,128,0.18);
}

/* ---------- SALUD (cada sábado, sep-2026, orden de Sandro) ----------
   Día de la Salud en Andalucía llevado a costumbre semanal. La web se
   pone en verde fresco de menta y esmeralda, colores de parque con
   agua y de sombra de árbol, que es de lo que va el día. Es distinto
   del verde hoja del ambiente "ambiental" para que se note que esto
   es otra cosa.
   Además de la piel, el sábado enseña dos piezas que el resto de la
   semana están ocultas: el banner superior (.salud-banner) y la
   sección reivindicativa (.salud-section). Todo gobernado por la
   clase html.modo-salud que pone js/ambientes.js. El domingo la clase
   desaparece sola y aquí no ha pasado nada. */
html.modo-salud{
  --paper:#F1FBF6; --mist:#DDF4E8;
  --ink:#07301C;   --sky-deep:#0B4F2E; --sky-mid:#15803D;
  --accent:#10B981; --accent-soft:rgba(16,185,129,0.14);
  --accent-2:#0D9488; --accent-text:#0B6B44;
  --line:rgba(11,79,46,0.14); --surface:rgba(255,255,255,0.90);
  --border:rgba(11,79,46,0.15);
}
html[data-theme="dark"].modo-salud{
  --paper:#03120B; --mist:#082015;
  --ink:#DEF7E9;   --sky-deep:#DEF7E9; --sky-mid:#34D399;
  --accent:#34D399; --accent-soft:rgba(52,211,153,0.15);
  --accent-2:#2DD4BF; --accent-text:#7CE7B2;
  --line:rgba(52,211,153,0.15); --surface:rgba(8,32,21,0.90);
  --border:rgba(52,211,153,0.20);
}
/* La pantalla de entrada también se entera: el subtítulo del eslogan
   se tiñe de menta (el fondo del splash es oscuro siempre). */
html.modo-salud #manolitoSplash .sub-brand{ color:#7CE7B2; }

/* Banner superior de salud: solo existe en modo salud. Va en el flujo
   normal, encima de la barra pegajosa, así no pisa ni desplaza nada
   y al desplazarte se va con la página (nada fixed molestando). */
.salud-banner{ display:none; }
html.modo-salud .salud-banner{
  display:block;
  background:linear-gradient(90deg,#0B4F2E,#0D9488);
  color:#ECFDF5;
  text-align:center;
  padding:10px 16px;
  font-size:0.95rem;
  line-height:1.45;
}
html.modo-salud .salud-banner a{
  color:#FFFFFF; font-weight:600;
  text-decoration:underline; text-underline-offset:3px;
}
html.modo-salud .salud-banner a:focus-visible{
  outline:3px solid #FFFFFF; outline-offset:2px;
}

/* Sección reivindicativa de los sábados: DESPLEGABLE ESTRICTO
   (25-sep, orden de Sandro). Nace cerrada y solo el usuario la abre.
   La animación es el truco de grid-template-rows 0fr → 1fr, lo más
   barato que hay para la GPU, y respeta prefers-reduced-motion. */
.salud-section{ display:none; }
html.modo-salud .salud-section{
  display:block;
  max-width:880px;
  margin:26px auto 8px;
  padding:0 20px;
}
html.modo-salud .salud-resumen-card{
  list-style:none;
  cursor:pointer;
  background:var(--mist);
  border:1px solid var(--border);
  border-radius:18px;
  padding:18px 22px;
  display:flex;
  align-items:center;
  gap:14px;
  flex-wrap:wrap;
}
html.modo-salud .salud-resumen-card::-webkit-details-marker{ display:none; }
/* Triángulo nativo (texto, no emoji) que gira al abrir. */
html.modo-salud .salud-resumen-card::after{
  content:"";
  margin-left:auto;
  width:0; height:0;
  border-left:7px solid transparent;
  border-right:7px solid transparent;
  border-top:9px solid var(--accent-text);
  transition:transform 0.3s ease;
}
html.modo-salud .salud-section[open] .salud-resumen-card{
  border-radius:18px 18px 0 0;
  border-bottom-color:transparent;
}
html.modo-salud .salud-section[open] .salud-resumen-card::after{
  transform:rotate(180deg);
}
html.modo-salud .salud-resumen-card:focus-visible{
  outline:3px solid var(--accent); outline-offset:2px;
}
html.modo-salud .salud-kicker{
  display:inline-block;
  font-size:0.72rem; letter-spacing:0.14em; text-transform:uppercase;
  color:#FFFFFF; background:var(--accent);
  padding:4px 12px; border-radius:999px;
}
html.modo-salud .salud-resumen-titulo{
  font-size:1.35rem; line-height:1.2; font-weight:700;
  color:var(--sky-deep);
}
/* Cuerpo animado: 0fr cerrado, 1fr abierto. Al cerrar también anima
   porque el contenido sigue montado (details solo lo ocultaría si no
   forzáramos display). */
html.modo-salud .salud-contenido{
  display:grid;
  grid-template-rows:0fr;
  transition:grid-template-rows 0.35s ease;
}
html.modo-salud .salud-section[open] .salud-contenido{
  grid-template-rows:1fr;
}
html.modo-salud .salud-contenido-interno{
  overflow:hidden;
  background:var(--mist);
  border:1px solid var(--border);
  border-top:none;
  border-radius:0 0 18px 18px;
  padding:0 26px;
}
html.modo-salud .salud-section[open] .salud-contenido-interno{
  padding:22px 26px 28px;
  transition:padding 0.35s ease;
}
html.modo-salud .salud-section p{
  margin:0 0 0.9em;
  font-size:1rem; line-height:1.65;
  color:var(--ink);
}
html.modo-salud .salud-section p:last-child{ margin-bottom:0; }

/* Stickers de salud (26-sep, archivo de Sandro): fila de iconos,
   centrados y sin pasarse de ancho. */
html.modo-salud .salud-stickers{
  display:flex; justify-content:center;
  margin:2px 0 16px;
}
html.modo-salud .salud-stickers svg{
  width:min(560px, 100%); height:auto; display:block;
}

/* Aviso de precision (25-sep, orden de Sandro): nota humana dentro del
   desplegable, marcada con filete lateral para que se lea como aviso
   y no como parte del discurso. */
html.modo-salud .salud-nota{
  margin-top:6px;
  padding:12px 16px;
  font-size:0.92rem; line-height:1.6;
  background:var(--accent-soft);
  border-left:3px solid var(--accent);
  border-radius:0 12px 12px 0;
}
/* Pie de recursos oficiales: fila discreta de pastillas-enlace. */
html.modo-salud .salud-recursos{
  display:flex; flex-wrap:wrap; align-items:center; gap:10px;
  margin-top:20px; padding-top:16px;
  border-top:1px solid var(--border);
}
html.modo-salud .salud-recursos-etiqueta{
  font-family:'IBM Plex Mono', monospace;
  font-size:0.68rem; letter-spacing:0.12em; text-transform:uppercase;
  color:var(--accent-text);
  margin-right:auto;
}
html.modo-salud .salud-recurso{
  display:inline-block;
  font-size:0.85rem; font-weight:600;
  color:var(--accent-text);
  border:1px solid var(--border);
  border-radius:999px;
  padding:8px 16px;
  text-decoration:none;
  background:var(--surface);
  transition:background 0.25s ease, color 0.25s ease, border-color 0.25s ease;
}
html.modo-salud .salud-recurso:hover{
  background:var(--accent); color:#FFFFFF; border-color:var(--accent);
}
html.modo-salud .salud-recurso:focus-visible{
  outline:3px solid var(--accent); outline-offset:2px;
}
@media (max-width:640px){
  html.modo-salud .salud-recursos-etiqueta{ width:100%; margin-right:0; }
}
@media (prefers-reduced-motion: reduce){
  html.modo-salud .salud-contenido,
  html.modo-salud .salud-contenido-interno,
  html.modo-salud .salud-resumen-card::after{ transition:none; }
}

/* Sello oficial Manolit∞ (25-sep, orden de Sandro): colores por
   variables. Los corporativos son los de siempre; mientras dura el
   modo salud el sello se tiñe de verde, y al apagarse el modo (el
   domingo a las 18:00) vuelve solo a los corporativos. La geometría
   del SVG es la del archivo original, sin tocar. */
.salud-section, .sello-footer{
  --sello-granate:#7A0016;
  --sello-tinta:#26424B;
  --sello-sol:#E6A100;
  --sello-agua:#007A87;
}
html.modo-salud .salud-section, html.modo-salud .sello-footer{
  --sello-granate:#0B6B44;
  --sello-tinta:#064E3B;
  --sello-sol:#E9A100;
  --sello-agua:#0D9488;
}
html.modo-salud .salud-sello{
  display:flex; justify-content:center;
  margin:4px 0 18px;
}
html.modo-salud .salud-sello svg{
  width:min(240px, 62vw);
  height:auto;
}
.salud-section .s-granate, .sello-footer .s-granate{ stroke:var(--sello-granate); }
.salud-section .s-sol, .sello-footer .s-sol{ stroke:var(--sello-sol); }
.salud-section .s-agua, .sello-footer .s-agua{ stroke:var(--sello-agua); }
.salud-section .s-tinta-fill, .sello-footer .s-tinta-fill{ fill:var(--sello-tinta); }

/* Sello permanente del pie (25-sep, orden de Sandro): pequeño, en la
   esquina inferior derecha, sin estridencias. No se quita el domingo.
   Opacidad suave para integrarse, y al pasar el ratón o enfocar gana
   presencia. Mismo sistema de variables que el sello del bloque. */
.footer-oficial{
  display:flex; justify-content:flex-start;
  margin-top:26px;
  /* Esquina inferior IZQUIERDA: la derecha es del boton del chat
     (va fijo sobre la esquina) y el sello no debe pelearse con el. */
}
.sello-footer{
  width:88px;
  opacity:0.75;
  transition:opacity 0.3s ease, transform 0.3s ease;
}
.sello-footer:hover{ opacity:1; transform:scale(1.04); }
.sello-footer svg{ display:block; width:100%; height:auto; }
@media (max-width:640px){
  .footer-oficial{ justify-content:center; }
  .sello-footer{ width:76px; }
}
@media (prefers-reduced-motion: reduce){
  .sello-footer{ transition:none; }
}
