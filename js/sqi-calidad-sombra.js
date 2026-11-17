/* ==========================================================================
   CALIDAD DE SOMBRA (SQI) — Manolit∞ Aire (nov-2026)
   --------------------------------------------------------------------------
   Colorea las sombras proyectadas que YA dibuja shadows-route.js según su
   calidad térmica real y alimenta el bloque compacto del widget solar SVG.
   Con polvo o aire contaminado la radiación difusa también calienta dentro
   de la sombra, y el SQI lo hace visible.

   REGLAS DURAS DE RENDIMIENTO (móvil que no se calienta):
     - UN solo SQI por polígono, calculado en su centroide. Nada de
       cálculos por píxel, cuadrícula o punto del mapa.
     - Polígonos enormes: se muestrean 2-3 centroides lógicos y se usa el
       valor medio. Nada más masivo.
     - El SQI se guarda como PROPIEDAD del polígono de sombra (sqi, sqi_color,
       sqi_hora), nunca en la geometría del suelo.
     - Las llamadas a Open-Meteo son UNA por zona y hora (caché de 20 min),
       nunca por polígono. Lo que cambia entre polígonos es el SVF y el
       contexto de calle (vías, verde, cañón), que sale de las teselas
       vectoriales YA cargadas: cero descargas nuevas por polígono.
     - Cálculo en lotes de 20 polígonos entre tandas, nunca de golpe. La UI
       nunca espera.
     - Cero errores en consola: fallo silencioso y la sombra queda como
       estaba.
     - No se toca la lógica geométrica de sombras: esto solo escucha los
       datos que la fuente 'sombras' ya publica.

   Fórmula (ajuste local tipo land use regression):
     El valor base de DHI/PM2.5/AOD que da Open-Meteo/CAMS tiene resolución
     de kilómetros: pintarlo igual en toda la ciudad miente, porque una
     avenida con tráfico y una calle residencial a 100 m no respiran lo
     mismo. Por eso el valor base se BAJA A CALLE con variables locales de
     OpenStreetMap (método estándar en epidemiología ambiental):
       via    = aporte de la vía más pesada cercana (jerarquía OSM) con
                decaimiento exp(-d/75 m) y corte a 150 m.
       verde  = cercanía a parques/masa verde OSM, exp(-d/70 m): limpia.
       cañón  = 1 - SVF: calle estrecha entre edificios altos, atrapa más.
       factorLocal = exp(b0 + b1·via - b2·verde + b3·cañón), acotado
                entre 0.55 y 1.9. Los pesos b nacen como priors documentados
                y se CALIBRAN con las estaciones reales de OpenAQ cuando hay
                2 o más en la ciudad (regresión ridge contra el log del
                cociente medición/base; con pocas estaciones los priors
                apenas se mueven).
     SVF  = fracción de cielo visible en el centroide (0-1), con los
            edificios OSM ya cargados en el mapa, radio 100 m, 8 direcciones.
     DHIef = DHI x (1 + K(clima) x (factorLocal - 1)) x SVF
     SQI  = clamp(0, 100, 100 x (1 - DHIef / GHI))
     K(clima) = amortiguación del factor LUR según la zona climática
            Köppen-Geiger del punto (Beck et al. 2018). Se lee de una
            rejilla local de 0.1° (data/koppen-rejilla.json, preprocesada
            offline con preprocesar_koppen.py) que se carga UNA vez al
            arrancar: sin llamadas externas en tiempo de consulta. Cada
            polígono usa el K de SU centroide; al mover el mapa a otra
            ciudad el coeficiente cambia solo. Sin dato: fallback 0.45.
     Si GHI <= 10 W/m2 o el sol está bajo el horizonte: estado "noche", sin
     teñir y con la vista deshabilitada.
     AOD y PM2.5 siguen en el panel como dato de zona; lo que se baja a
     calle es el factor que modula la difusa (y por tanto el color).

   Colores (paleta del sistema):
     85-100 efectiva  verde  #00B98A (var(--breath-good))
     65-84  reducida  amarillo #FFC033
     40-64  débil     naranja var(--accent)
     0-39   ilusoria  rojo   var(--breath-bad)
   ========================================================================== */
(function () {
  'use strict';
  if (window.__manolitSqiIntegrado) return;
  window.__manolitSqiIntegrado = true;

  var S = {
    map: null,
    capaEdificios: null,     // { id, source, sourceLayer } de la capa fill-extrusion
    pintando: false,         // true mientras un setData propio está en vuelo
    calculando: false,
    horaKey: '',             // yyyy-MM-ddTHH de la última tanda aplicada
    sigGeometria: '',        // firma de la colección (nº de features)
    cacheSvf: new Map(),     // key polígono -> svf
    cacheFactor: new Map(),  // key polígono -> factor local (LUR)
    cacheApi: new Map(),     // zona+hora -> { ts, datos }
    cacheEstaciones: new Map(), // zona -> { ts, lista } estaciones OpenAQ
    contextoCalle: null,     // vías + verde de las teselas ya cargadas
    ctxEstaciones: null,     // { clave, ctx } contexto OSM de las estaciones
    pesos: { b0: 0, b1: 0.45, b2: 0.35, b3: 0.30 }, // priors; OpenAQ los calibra
    pesosCalibrados: 0,      // nº de estaciones que calibraron (0 = priors)
    calibrando: false,
    calibracionZona: '',
    calibracionTs: 0,
    ultimosMeteo: null,      // última respuesta buena (para la UI)
    koppen: null,            // rejilla Köppen decodificada (null = aún no cargada)
    koppenPromesa: null,     // carga única en vuelo de data/koppen-rejilla.json
    rafProgramado: false,
    timerReevaluacion: null,
    ultimaEval: 0
  };

  // DOCUMENTACIÓN DE PARÁMETROS ELEGIDOS A MANO (metodologia.html):
  // UMBRAL_AREA_GRANDE = 20000 m²: por encima se considera polígono enorme
  //   (un parque, una plaza) y se muestrea por varios puntos interiores
  //   promediando. 20000 m² ~ una manzana grande o un patio de colegio:
  //   su SVF varía tanto de esquina a esquina que un solo centroide mintiría.
  // RADIO_SVF = 100 m: radio de búsqueda del factor de cielo visible. En
  //   calle urbana, el cañón lo definen los edificios de las dos filas
  //   frente: con anchuras típicas de 15-40 m, 100 m recoge 2-3 alturas
  //   por lado sin contar edificios que quedan ocultos tras otros (que ya
  //   no aportan obstrucción real). Más radio añade coste y poco cambio.
  // LOTE = 20 polígonos/tanda y RETRASO_REEVALUACION = 40 s: rendimiento,
  //   no física. 20 mantiene cada tanda bajo unos pocos ms incluso en móvil;
  //   40 s repasa la hora (el dato horario no cambia en menos de una hora)
  //   sin martillar la API.
  // TTL_CACHE = 20 min: compromiso entre frescura del pronóstico CAMS (se
  //   actualiza cada hora) y número de peticiones. Una caché más corta solo
  //   repetiría el mismo dato horario.
  // OPENAQ_TTL = 30 min: las estaciones publican con latencia de minutos a
  //   horas; repedir antes no aporta dato nuevo.
  var UMBRAL_AREA_GRANDE = 20000;   // m2: polígono enorme (un parque)
  var RADIO_SVF = 100;              // metros
  var LOTE = 20;                    // polígonos por tanda
  var TTL_CACHE = 20 * 60 * 1000;   // 20 minutos
  var RETRASO_REEVALUACION = 40000; // se repasa la hora cada 40 s

  // Ajuste local calle a calle (land use regression). Las magnitudes están
  // tomadas de la literatura LUR urbana: la pluma de una vía con tráfico cae
  // dentro de los primeros 50-150 m y el verde próximo reduce la acumulación
  // local. Son PRIORS acotados, no mediciones: cuando OpenAQ tiene 2 o más
  // estaciones en la ciudad, los pesos se recalibran con sus lecturas.
  //
  // DOCUMENTACIÓN DE PARÁMETROS (metodologia.html · nov-2026):
  // Cada valor elegido a mano, de dónde sale y por qué ese y no otro.
  //
  // RADIO_VIA = 150 m
  //   De dónde: rango típico 50-150 m de los estudios LUR (p. ej.
  //   Hoek et al. 2008, revisión de regresión por uso del suelo). La
  //   concentración de NO2/PM junto a una vía cae ~60 % en los primeros
  //   100 m y se asimila al fondo urbano hacia los 150-300 m.
  //   Por qué 150: es el límite superior del rango; en una ciudad tan
  //   compacta como Sevilla (manzanas de 60-100 m) la influencia directa
  //   de una vía raramente llega más lejos, y cortar antes penalizaría
  //   calles tranquilas pegadas a una avenida.
  //
  // DECAIMIENTO_VIA = 75 m (exp(-d/75))
  //   De dónde: el e-fold de la pluma de tráfico. Con 75 m, a 25 m de la
  //   vía queda el 72 % del aporte y a 150 m el 13 %: descenso exponencial
  //   coherente con las curvas de dispersión de viales urbanos (p. ej.
  //   modelo de calle CPR/OSPM). Elegido algo mayor que la mitad del radio
  //   para que el aporte no muera demasiado pronto dentro del corte.
  //
  // RADIO_VERDE / DECAIMIENTO_VERDE = 150 m / 70 m
  //   De dónde: los parques urbanos generan un efecto de limpieza local
  //   (deposición y mezcla más limpia) medido en 100-300 m en estudios de
  //   islands frescas y LUR con variable de verde NDVI. 150 m alinea el
  //   alcance con el de la vía (mismo área de influencia) y 70 m hace que
  //   un parque a <50 m cuente de verdad pero a 150 m apenas sume.
  //
  // CELDA_GRILLA = 0.0018° (~200 m)
  //   De dónde: es el tamaño de celda del índice espacial que agrupa el
  //   contexto de calle (vías, verde). 200 m coincide con la escala de
  //   manzana/bloque urbana y con la resolución típica de las mallas LUR;
  //   una celda mayor mezclaría zonas incompatibles, una menor multiplicaría
  //   el coste de indexación sin cambiar el resultado.
  //
  // MAX_VIAS = 6000
  //   De dónde: es un tope de rendimiento (mobile): el número máximo de
  //   segmentos de vía indexados por vista. En una ciudad entera a zoom
  //   medio no se llega a esa cifra; solo limita los peores casos de zoom
  //   muy bajo para que el hilo no se sature.
  //
  // PRIOR b0=0, b1=0.45 (vía), b2=0.35 (verde), b3=0.30 (cañón)
  //   De dónde: priors cualitativos, no coeficientes de una regresión
  //   específica. b0=0 significa «a priori, el factor local es neutro».
  //   b1=0.45 deja el aporte de la vía como el mayor peso (la evidencia
  //   LUR indica que el tráfico es el predictor dominante en NO2/PM
  //   urbana). b2=0.35 y b3=0.30 quedan algo por debajo porque verde y
  //   cañón Street canyon moderan pero no dominan. La magnitud ~0.3-0.45
  //   mantiene el factor local en un rango plausible (±40 %) antes de
  //   calibrar: nunca se aleja tanto como para contradecir al dato base.
  //   Se recalibran con regresión ridge contra OpenAQ cuando hay ≥2
  //   estaciones: con pocas, los priors apenas se mueven (intencional:
  //   mejor un prior razonable que una calibración con 2 puntos).
  //
  // FACTOR_MIN = 0.55 / FACTOR_MAX = 1.9
  //   De dónde: acotado deliberado. 0.55 permite que un barrio con verde
  //   y sin vía tenga ~45 % menos contaminación local que el fondo, algo
  //   coherente con las diferencias intraurbanas medidas en Sevilla.
  //   1.9 capta que una calle-canyon junto a una avenida puede doblar el
  //   fondo, pero impide que el modelo invente valores extremos (x3 o
  //   x4) sin evidencia local. Son límites de seguridad del prior, no
  //   conclusiones físicas.
  var LUR = {
    RADIO_VIA: 150,          // corte: más lejos, la vía ya no suma
    DECAIMIENTO_VIA: 75,     // exp(-d/75)
    RADIO_VERDE: 150,
    DECAIMIENTO_VERDE: 70,   // exp(-d/70)
    CELDA_GRILLA: 0.0018,    // ~200 m: índice espacial del contexto
    MAX_VIAS: 6000,          // tope de segmentos indexados por vista
    PRIOR: { b0: 0, b1: 0.45, b2: 0.35, b3: 0.30 },
    FACTOR_MIN: 0.55,
    FACTOR_MAX: 1.9
  };
  var OPENAQ_TTL = 30 * 60 * 1000; // las estaciones no se repiden en media hora

  /* ---------------------------------------------------------------------
     COEFICIENTE K DE AMORTIGUACIÓN DEL FACTOR LUR, POR ZONA CLIMÁTICA
     (Köppen-Geiger, Beck et al. 2018)

     En dhiEf = DHI x (1 + K x (factorLocal - 1)) x SVF, el factorLocal se
     calibra con PM2.5 EN SUPERFICIE (OpenAQ), pero la radiación difusa
     depende del aerosol en COLUMNA. K responde a: ¿cuánto dice la
     contaminación de superficie local sobre el aerosol de la columna que
     tiene encima? Eso cambia con el clima, y por eso K no es una constante
     universal: la física del lugar es distinta en Bilbao que en Sevilla.

     La zona climática se lee de data/koppen-rejilla.json: rejilla global
     de 0.1° preprocesada offline (preprocesar_koppen.py) desde el ráster
     de 1 km de Beck et al. (2018), Scientific Data 5:180214, CC BY 4.0
     (https://doi.org/10.6084/m9.figshare.6396959, periodo 1980-2016).
     Se carga UNA vez al arrancar y cada consulta es un acceso por índice
     en memoria: cero llamadas externas por punto. Los códigos 1-30 son
     los del legend.txt oficial de Beck; 0 = océano o sin dato.

     DOCUMENTACIÓN DE LOS VALORES (metodologia.html · nov-2026):
     Son PRIORS ORDINALES elegidos a mano con dirección física defendible,
     NO magnitudes medidas ni coeficientes de una regresión. Lo que está
     justificado es el orden (BWh > Csa > Dfb > Cfb) y el porqué de cada
     escalón, no el tercer decimal. Si algún día hay mediciones de difusa
     bajo sombra por clima, esta tabla es lo primero que hay que recalibrar.

     BWh / BWk = 0.60 (desierto)
       Acoplamiento superficie-columna máximo: capa de mezcla muy alta y
       convección extrema mezclan el polvo mineral (el aerosol dominante)
       en toda la columna, y al no haber apenas nubes la difusa la domina
       el aerosol. Lo que contamina en superficie está también arriba.
     BSh / BSk = 0.55 (semiárido: Sevilla e interior sur peninsular)
       Convección fuerte y intrusiones de polvo sahariano (calima): buen
       acoplamiento. Un escalón bajo el desierto por la mayor nubosidad
       invernal, que le quita peso al aerosol en la difusa anual.
     Csa = 0.55 (mediterráneo de verano seco y caluroso)
       Verano seco y muy convectivo: el polvo sahariano y el aerosol
       urbano se mezclan bien verticalmente. El invierno húmedo y con
       nubes baja la media anual respecto al semiárido puro, pero no lo
       suficiente para bajar de escalón.
     Csb / Csc = 0.50 (mediterráneo de verano templado o frío)
       Misma estructura estacional que Csa pero menos extremo térmico:
       convección y altura de la capa de mezcla algo menores.
     Af / Am = 0.50 (tropical lluvioso y monzónico)
       Convección extrema: el acoplamiento superficie-columna es alto
       pese al lavado frecuente. El aerosol (biomasa quemada, urbano,
       higroscópico por la humedad) llega eficazmente a la columna.
     Cfa = 0.45 (subtropical húmedo)
       La humedad alta hace crecer las partículas (crecimiento
       higroscópico: cada una dispersa más luz), pero la nubosidad
       frecuente diluye el peso del aerosol en la difusa. Término medio.
     Aw = 0.45 (tropical de sabana)
       Por analogía con Cfa: convección alta en la estación húmeda, pero
       nubosidad y lavado intensos; en la seca domina el polvo y el humo
       de quemas, sin llegar al acoplamiento del desierto.
     Dfa / Dfb = 0.40 (continental húmedo: Europa central y del este)
       Las inversiones invernales atrapan el aerosol (sulfatos, nitratos,
       humo de biomasa y calefacción) en una capa delgada pegada al suelo,
       desacoplada de la columna. La convección veraniega sube la media.
     Dfc / Dfd = 0.35 (subártico)
       Columna muy limpia, poco aerosol y inversiones largas: la
       superficie dice poco de lo que hay arriba.
     Cfb / Cfc = 0.35 (oceánico: norte atlántico, Bilbao, Galicia)
       La difusa la domina la NUBOSIDAD, no el aerosol. Ventilación
       horizontal fuerte, lavado frecuente por precipitación y capa
       límite baja y desacoplada: el gradiente local de PM (aerosol
       marino de fondo, poco acumulativo) apenas se traduce en difusa
       extra. El escalón más bajo de los climas habitados densamente.
     ET = 0.30 (tundra / alta montaña: Pirineos de altura, Svaneti)
       Aire limpio y poco aerosol en columna. Efecto práctico pequeño:
       sin vías pesadas el factorLocal ya cae a ~1 por sí solo.
     Fallback = 0.45 (océano, sin dato, EF y clases no tabuladas)
       Centro del rango, sin sesgar ni a limpio ni a sucio. EF (hielo
       permanente) se deja aquí a propósito: allí el factorLocal es ~1
       y el valor de K es irrelevante en la práctica.
     --------------------------------------------------------------------- */
  var K_DIFUSA_POR_CLASE = [
    null, // 0: océano / sin dato -> fallback
    0.50, //  1 Af
    0.50, //  2 Am
    0.45, //  3 Aw
    0.60, //  4 BWh
    0.60, //  5 BWk
    0.55, //  6 BSh
    0.55, //  7 BSk
    0.55, //  8 Csa
    0.50, //  9 Csb
    0.50, // 10 Csc
    null, // 11 Cwa (no tabulada -> fallback)
    null, // 12 Cwb (no tabulada -> fallback)
    null, // 13 Cwc (no tabulada -> fallback)
    0.45, // 14 Cfa
    0.35, // 15 Cfb
    0.35, // 16 Cfc
    null, // 17 Dsa (no tabulada -> fallback)
    null, // 18 Dsb (no tabulada -> fallback)
    null, // 19 Dsc (no tabulada -> fallback)
    null, // 20 Dsd (no tabulada -> fallback)
    null, // 21 Dwa (no tabulada -> fallback)
    null, // 22 Dwb (no tabulada -> fallback)
    null, // 23 Dwc (no tabulada -> fallback)
    null, // 24 Dwd (no tabulada -> fallback)
    0.40, // 25 Dfa
    0.40, // 26 Dfb
    0.35, // 27 Dfc
    0.35, // 28 Dfd
    0.30, // 29 ET
    null  // 30 EF: sin efecto práctico (factorLocal ~1) -> fallback
  ];
  var K_DIFUSA_FALLBACK = 0.45;

  // Carga única de la rejilla Köppen. Si falla la red o el asset, el modelo
  // sigue con el fallback y no se reintenta en bucle: silencio total.
  function cargarRejillaKoppen() {
    if (S.koppenPromesa) return S.koppenPromesa;
    S.koppenPromesa = fetchConReintentos('data/koppen-rejilla.json', 0).then(function (d) {
      if (!d || !d.datos_b64 || !d.ancho || !d.alto) return null;
      var bin = atob(d.datos_b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      S.koppen = { res: d.res, oeste: d.oeste, norte: d.norte,
        ancho: d.ancho, alto: d.alto, datos: bytes };
      // La rejilla llegó después del primer pintado (que usó fallback):
      // se fuerza una reevaluación para aplicar el K real de cada punto.
      S.sigGeometria = '';
      programarEvaluacion();
      return S.koppen;
    }).catch(function () { return null; });
    return S.koppenPromesa;
  }

  // K del punto consultado, por índice directo sobre la rejilla en memoria.
  function coeficienteDifusaEn(lat, lon) {
    var K = S.koppen;
    if (!K) return K_DIFUSA_FALLBACK;
    var col = Math.floor((lon - K.oeste) / K.res);
    var fila = Math.floor((K.norte - lat) / K.res);
    if (col < 0 || col >= K.ancho || fila < 0 || fila >= K.alto) return K_DIFUSA_FALLBACK;
    var clase = K.datos[fila * K.ancho + col];
    if (clase === 0) {
      // Costa: una ciudad junto al mar puede caer en una celda 0.1° de
      // océano (medido: San Sebastián). Se busca la celda de tierra más
      // cercana en un radio de 2 celdas (~20 km) antes de rendirse al
      // fallback: el clima de la orilla es el de la tierra adyacente.
      var mejorDist = Infinity;
      for (var df = -2; df <= 2; df++) {
        for (var dc = -2; dc <= 2; dc++) {
          var f2 = fila + df, c2 = col + dc;
          if (f2 < 0 || f2 >= K.alto || c2 < 0 || c2 >= K.ancho) continue;
          var v = K.datos[f2 * K.ancho + c2];
          if (v === 0) continue;
          var dist = df * df + dc * dc;
          if (dist < mejorDist) { mejorDist = dist; clase = v; }
        }
      }
    }
    var k = K_DIFUSA_POR_CLASE[clase];
    return k != null ? k : K_DIFUSA_FALLBACK;
  }

  /* ---------------------------------------------------------------------
     Utilidades
     --------------------------------------------------------------------- */
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  function horaKeyDe(fecha) {
    var f = fecha;
    return f.getFullYear() + '-' +
      ('0' + (f.getMonth() + 1)).slice(-2) + '-' +
      ('0' + f.getDate()).slice(-2) + 'T' +
      ('0' + f.getHours()).slice(-2);
  }

  function fechaEfectiva() {
    try {
      if (typeof window.manolitAireHoraEfectiva === 'function') {
        var f = window.manolitAireHoraEfectiva();
        if (f instanceof Date && !isNaN(f)) return f;
      }
    } catch (e) { }
    return new Date();
  }

  function colorDeSqi(sqi) {
    // DOCUMENTACIÓN (metodologia.html): cortes 85/65/40 elegidos para que
    // las 4 clases reflejen pérdida real de protección, no cortes
    // decorativos: SQI 100 = sombra sin difusa extra; ~85 aprox. el punto
    // donde la difusa bajo techo ya es pequeña frente al calor del sol;
    // 65 ~ «sigue protegiendo pero se nota el cielo cargado»; 40 = la
    // sombra aporta poco (< 40 % de diferencia con el sol directo).
    // Son umbrales de comunicación orientativa, no una escala física.
    if (sqi >= 85) return '#00B98A';
    if (sqi >= 65) return '#FFC033';
    if (sqi >= 40) return '#FF6B1A';
    return '#E63E5F';
  }

  function estadoDeSqi(sqi) {
    if (sqi >= 85) return 'Sombra efectiva';
    if (sqi >= 65) return 'Sombra reducida';
    if (sqi >= 40) return 'Sombra débil';
    return 'Sombra ilusoria';
  }

  /* ---------------------------------------------------------------------
     Pestañas de la tarjeta y reubicación de los bloques existentes.
     --------------------------------------------------------------------- */
  function montarTabs() {
    var tabs = document.querySelectorAll('[data-rs-sqi-tab]');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        activarTab(this.getAttribute('data-rs-sqi-tab'));
      });
    }
  }

  function activarTab(nombre) {
    var tabs = document.querySelectorAll('[data-rs-sqi-tab]');
    for (var i = 0; i < tabs.length; i++) {
      var activa = tabs[i].getAttribute('data-rs-sqi-tab') === nombre;
      tabs[i].classList.toggle('rs-sqi-tab-activa', activa);
      tabs[i].setAttribute('aria-selected', activa ? 'true' : 'false');
    }
    var vistas = document.querySelectorAll('.rs-sqi-vista');
    for (var j = 0; j < vistas.length; j++) {
      vistas[j].hidden = vistas[j].getAttribute('data-rs-sqi-vista') !== nombre &&
        vistas[j].id !== 'rsSqiVistaSombra' &&
        vistas[j].id !== 'rsSqiVistaAire' &&
        vistas[j].id !== 'rsSqiVistaPrevision';
    }
    document.getElementById('rsSqiVistaSombra').hidden = nombre !== 'sombra';
    document.getElementById('rsSqiVistaAire').hidden = nombre !== 'aire';
    document.getElementById('rsSqiVistaPrevision').hidden = nombre !== 'prevision';
    try { document.querySelector('.rs-sqi-card').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { }
  }

  function reubicarBloques() {
    try {
      var vistaAire = document.getElementById('rsSqiVistaAire');
      var aqi = document.getElementById('rsAqiPanel');
      if (vistaAire && aqi && aqi.parentElement !== vistaAire) vistaAire.appendChild(aqi);
      var vistaPrevision = document.getElementById('rsSqiVistaPrevision');
      var evolucion = document.querySelector('.forecast-section');
      if (vistaPrevision && evolucion && evolucion.parentElement !== vistaPrevision) vistaPrevision.appendChild(evolucion);
    } catch (e) { }
  }

  /* ---------------------------------------------------------------------
     Cliente Open-Meteo con caché por zona+hora y 3 reintentos con backoff.
     Dos endpoints por zona (forecast y air-quality), cada uno una vez por
     hora efectiva. Sin red o con fallo: se devuelve null y la sombra queda
     como estaba. Cero ruido en consola.
     --------------------------------------------------------------------- */
  function fetchConReintentos(url, intentos) {
    intentos = intentos || 0;
    var ctl;
    try { ctl = new AbortController(); } catch (e) { ctl = null; }
    var timer = null;
    if (ctl) timer = setTimeout(function () { try { ctl.abort(); } catch (e) { } }, 8000);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      if (intentos < 2) {
        return new Promise(function (res) { setTimeout(res, 800 * Math.pow(2, intentos)); })
          .then(function () { return fetchConReintentos(url, intentos + 1); });
      }
      return null; // fallo silencioso
    });
  }

  function meteoDeZona(lat, lon, horaKey) {
    var clave = lat.toFixed(3) + ',' + lon.toFixed(3) + '|' + horaKey;

    var enCache = S.cacheApi.get(clave);
    if (enCache && Date.now() - enCache.ts < TTL_CACHE) {
      return Promise.resolve(enCache);
    }
    var urlSol = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(4) +
      '&longitude=' + lon.toFixed(4) +
      '&hourly=shortwave_radiation,diffuse_radiation&forecast_days=2&timezone=auto';
    var urlAire = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + lat.toFixed(4) +
      '&longitude=' + lon.toFixed(4) +
      '&hourly=aerosol_optical_depth,pm2_5&forecast_days=2&timezone=auto';
    return Promise.all([fetchConReintentos(urlSol), fetchConReintentos(urlAire)])
      .then(function (res) {
        var sol = res[0], aire = res[1];
        if (!sol || !aire) return null;
        var datos = { sol: sol, aire: aire, ts: Date.now(), clave: clave };
        // La caché nunca crece sin límite: se purga al pasar de 40 entradas.
        if (S.cacheApi.size > 40) {
          try {
            var keys = Array.from(S.cacheApi.keys());
            for (var i = 0; i < keys.length - 20; i++) S.cacheApi.delete(keys[i]);
          } catch (e) { }
        }
        S.cacheApi.set(clave, datos);
        return datos;
      });
  }

  function serieHoraria(datos) {
    try {
      var sol = datos.sol.hourly, aire = datos.aire.hourly;
      return {
        tiempos: sol.time || [],
        ghi: sol.shortwave_radiation || [],
        dhi: sol.diffuse_radiation || [],
        aod: aire.aerosol_optical_depth || [],
        pm: aire.pm2_5 || []
      };
    } catch (e) { return null; }
  }

  function indiceDeHora(serie, fecha) {
    if (!serie) return -1;
    var pref = horaKeyDe(fecha);
    for (var i = 0; i < serie.tiempos.length; i++) {
      if (String(serie.tiempos[i]).indexOf(pref) === 0) return i;
    }
    // Respaldo si la zona horaria del navegador no coincide con la del lugar
    // (Open-Meteo devuelve la hora en la zona del lugar): se busca por la
    // hora del día dentro de la serie.
    var hh = ('0' + fecha.getHours()).slice(-2) + ':00';
    for (var j = 0; j < serie.tiempos.length; j++) {
      var t = String(serie.tiempos[j]);
      if (t.slice(11) === hh && t.slice(0, 10) >= pref.slice(0, 10)) return j;
    }
    return -1;
  }

  /* ---------------------------------------------------------------------
     SVF aproximado del centroide con los edificios OSM ya cargados.
     8 direcciones, radio 100 m. Los datos vienen de la capa vectorial de
     edificios del propio mapa: sin descargas extra.
     --------------------------------------------------------------------- */
  function alturaDe(props) {
    var h = parseFloat(props.render_height != null ? props.render_height : props.height);
    if (!isFinite(h) || h <= 0) {
      var niveles = parseFloat(props['building:levels'] || props.building_levels);
      h = isFinite(niveles) && niveles > 0 ? niveles * 3 : 10;
    }
    return clamp(h, 3, 120);
  }

  function detectarCapaEdificios() {
    try {
      var capas = S.map.getStyle().layers || [];
      var empaquetar = function (c) {
        return { id: c.id, source: c.source, sourceLayer: c['source-layer'] || null };
      };
      for (var i = 0; i < capas.length; i++) {
        if (capas[i].type === 'fill-extrusion' && /building/i.test(capas[i].id)) return empaquetar(capas[i]);
      }
      // Respaldo: cualquier fill-extrusion del estilo base (la capa de
      // edificios). Las extrusiones propias (edificios-en-sombra, copas de
      // árboles) usan fuentes geojson sin source-layer: se descartan.
      for (var j = 0; j < capas.length; j++) {
        if (capas[j].type === 'fill-extrusion' && capas[j]['source-layer']) return empaquetar(capas[j]);
      }
    } catch (e) { }
    return null;
  }

  // Instantánea de los edificios que proyectan sombra AHORA MISMO en
  // pantalla. Se usa queryRenderedFeatures sobre la capa 3D — la misma vía
  // que el motor de sombras — porque querySourceFeatures devuelve teselas
  // viejas de la caché de la fuente y NO los edificios de la vista
  // (medido: 141 devueltos, 0 dentro del encuadre → SVF siempre 1 = lavado
  // uniforme). Una consulta por vista; cada polígono solo distancia al
  // centroide precalculado.
  function instantaneaEdificios() {
    var sig = firmaVista();
    if (S.edifSvf && S.edifSvf.sig === sig) return S.edifSvf.lista;
    var lista = [];
    try {
      if (S.capaEdificios && S.capaEdificios.id && S.map.getLayer(S.capaEdificios.id)) {
        var feats = S.map.queryRenderedFeatures({ layers: [S.capaEdificios.id] }) || [];
        var vistos = {};
        for (var i = 0; i < feats.length; i++) {
          var f = feats[i];
          var id = f.id != null ? f.id : null;
          if (id != null && vistos[id]) continue;
          if (id != null) vistos[id] = true;
          var geom = f.geometry;
          if (!geom) continue;
          var partes;
          try { partes = turf.flatten(turf.feature(geom)).features; } catch (e) { continue; }
          for (var pi = 0; pi < partes.length; pi++) {
            var c;
            try { c = turf.centroid(partes[pi]).geometry.coordinates; } catch (e) { continue; }
            lista.push({ c: c, h: alturaDe(f.properties || {}) });
          }
        }
      }
    } catch (e) { }
    // La caché de SVF solo vale mientras la instantánea sea la misma.
    if (!S.edifSvf || S.edifSvf.sig !== sig) S.cacheSvf.clear();
    S.edifSvf = { sig: sig, lista: lista };
    return lista;
  }

  function svfDeCentroide(centro, claveGeo) {
    var cacheado = S.cacheSvf.get(claveGeo);
    if (cacheado != null) return cacheado;

    var candidatos = [];
    try {
      var lista = instantaneaEdificios();
      for (var i = 0; i < lista.length; i++) {
        var e = lista[i];
        var dx = (e.c[0] - centro[0]) * 111320 * Math.cos(centro[1] * Math.PI / 180);
        var dy = (e.c[1] - centro[1]) * 110540;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > RADIO_SVF || dist < 1) continue;
        candidatos.push({ ang: Math.atan2(dy, dx), fracc: clamp(Math.atan2(e.h, dist) / (Math.PI / 2), 0, 1) });
      }
    } catch (e) { }

    var svf;
    if (!candidatos.length) {
      svf = 1; // sin edificios alrededor, cielo abierto
    } else {
      // Direcciones con su peor oclusión (mayor fracción); el resto, cielo.
      var acum = 0;
      for (var d = 0; d < 8; d++) {
        var dir = d * Math.PI / 4;
        var mejor = 0;
        for (var k = 0; k < candidatos.length; k++) {
          var diff = Math.abs(Math.atan2(Math.sin(candidatos[k].ang - dir), Math.cos(candidatos[k].ang - dir)));
          if (diff < Math.PI / 8 && candidatos[k].fracc > mejor) mejor = candidatos[k].fracc;
        }
        acum += mejor;
      }
      svf = clamp(1 - acum / 8, 0.05, 1);
    }
    if (S.cacheSvf.size > 600) S.cacheSvf.clear();
    S.cacheSvf.set(claveGeo, svf);
    return svf;
  }

  function claveGeometria(f, idx) {
    var p = f.properties || {};
    if (p.id || p.osm_id) return String(p.id || p.osm_id);
    try {
      var coords = f.geometry.coordinates;
      var primero = (f.geometry.type === 'Polygon' ? coords[0][0] : coords[0][0][0]);
      var n = 0;
      if (f.geometry.type === 'Polygon') n = coords[0].length;
      return primero[0].toFixed(6) + ',' + primero[1].toFixed(6) + ':' + n;
    } catch (e) { return 'f' + idx; }
  }

  /* ---------------------------------------------------------------------
     CONTEXTO DE CALLE (land use regression)
     Las variables locales salen de las teselas vectoriales que el mapa YA
     tiene cargadas (misma fuente que los edificios): capa 'transportation'
     para la jerarquía de vías y 'landcover'/'park' para la masa verde.
     Se construye UNA vez por vista (firma = bounds + zoom) con un índice
     espacial de rejilla; cada polígono solo consulta sus 9 celdas. Nada se
     descarga por polígono.
     --------------------------------------------------------------------- */
  function pesoViaDeClase(clase) {
    // DOCUMENTACIÓN (metodologia.html): pesos por jerarquía OSM, elegidos a
    // mano como proxy de intensidad de tráfico relativa. De dónde: la
    // distribución de tráfico por clase de vía en redes urbanas españolas
    // (IMEC/hectómetros de intensidad) muestra una caída aprox. geométrica
    // autovía → residencial. Los valores son ordinales, no mediciones: lo
    // importante es el orden (autovía ≫ residencial ≫ peatonal), que es
    // robusto; los números concretos son priors que la calibración con
    // OpenAQ compensa de forma agregada.
    switch (clase) {
      case 'motorway': case 'trunk': return 1.0;
      case 'primary': return 0.85;   // avenidas urbanas: casi el máximo
      case 'secondary': return 0.6;  // vía de distribución intermedia
      case 'tertiary': return 0.45;  // calle importante sin arterial
      case 'unclassified': case 'residential': return 0.2;
      case 'living_street': case 'pedestrian': return 0.1;
      case 'service': case 'track': case 'path':
      case 'footway': case 'cycleway': case 'steps': return 0.05;
      default: return 0; // ferrocarriles y resto: sin emisión de tráfico
    }
  }

  function distPuntoSegmentoM(p, a, b, cosLat) {
    // Equirectangular en metros: válida para distancias < 1 km.
    var kx = 111320 * cosLat, ky = 110540;
    var ax = a[0] * kx, ay = a[1] * ky;
    var bx = b[0] * kx, by = b[1] * ky;
    var px = p[0] * kx, py = p[1] * ky;
    var dx = bx - ax, dy = by - ay;
    var largo2 = dx * dx + dy * dy;
    var t = largo2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / largo2, 0, 1) : 0;
    var cx = ax + t * dx, cy = ay + t * dy;
    return Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
  }

  function puntoEnAnillo(p, anillo) {
    var dentro = false;
    for (var i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
      var xi = anillo[i][0], yi = anillo[i][1], xj = anillo[j][0], yj = anillo[j][1];
      if (((yi > p[1]) !== (yj > p[1])) && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi)) dentro = !dentro;
    }
    return dentro;
  }

  function construirGrilla(ctx) {
    var celda = LUR.CELDA_GRILLA;
    var i, j;
    for (i = 0; i < ctx.vias.length; i++) {
      var pts = ctx.vias[i].puntos;
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (j = 0; j < pts.length; j++) {
        if (pts[j][0] < minX) minX = pts[j][0];
        if (pts[j][0] > maxX) maxX = pts[j][0];
        if (pts[j][1] < minY) minY = pts[j][1];
        if (pts[j][1] > maxY) maxY = pts[j][1];
      }
      // +1 celda de margen: la vía debe encontrarse aunque el punto caiga en
      // la celda vecina (el radio de influencia es menor que la celda).
      var c0x = Math.floor(minX / celda) - 1, c1x = Math.floor(maxX / celda) + 1;
      var c0y = Math.floor(minY / celda) - 1, c1y = Math.floor(maxY / celda) + 1;
      for (var cx = c0x; cx <= c1x; cx++) {
        for (var cy = c0y; cy <= c1y; cy++) {
          var clave = cx + ',' + cy;
          var entrada = ctx.grilla.get(clave);
          if (!entrada) { entrada = { vias: [], verdes: [] }; ctx.grilla.set(clave, entrada); }
          entrada.vias.push(i);
        }
      }
    }
    for (i = 0; i < ctx.verdes.length; i++) {
      var anillo = ctx.verdes[i];
      var mX = Infinity, mY = Infinity, MX = -Infinity, MY = -Infinity;
      for (j = 0; j < anillo.length; j++) {
        if (anillo[j][0] < mX) mX = anillo[j][0];
        if (anillo[j][0] > MX) MX = anillo[j][0];
        if (anillo[j][1] < mY) mY = anillo[j][1];
        if (anillo[j][1] > MY) MY = anillo[j][1];
      }
      var d0x = Math.floor(mX / celda) - 1, d1x = Math.floor(MX / celda) + 1;
      var d0y = Math.floor(mY / celda) - 1, d1y = Math.floor(MY / celda) + 1;
      for (var gx = d0x; gx <= d1x; gx++) {
        for (var gy = d0y; gy <= d1y; gy++) {
          var clave2 = gx + ',' + gy;
          var entrada2 = ctx.grilla.get(clave2);
          if (!entrada2) { entrada2 = { vias: [], verdes: [] }; ctx.grilla.set(clave2, entrada2); }
          entrada2.verdes.push(i);
        }
      }
    }
  }

  function firmaVista() {
    try {
      var b = S.map.getBounds();
      var z = Math.round(S.map.getZoom() * 2) / 2;
      return [b.getWest().toFixed(2), b.getSouth().toFixed(2),
        b.getEast().toFixed(2), b.getNorth().toFixed(2), z].join('|');
    } catch (e) { return ''; }
  }

  function obtenerContextoCalle() {
    var sig = firmaVista();
    if (S.contextoCalle && S.contextoCalle.sig === sig) return S.contextoCalle;
    var ctx = { sig: sig, vias: [], verdes: [], grilla: new Map(), cosLat: 0.8 };
    try {
      var centro = S.map.getCenter();
      ctx.cosLat = Math.max(0.087, Math.cos(centro.lat * Math.PI / 180));
      // Localiza en el estilo qué fuente vectorial sirve cada source-layer
      // (el id de fuente no se adivina: se lee del propio estilo cargado).
      var capas = S.map.getStyle().layers || [];
      var fuentes = {};
      for (var i = 0; i < capas.length; i++) {
        var sl = capas[i]['source-layer'];
        var src = capas[i].source;
        if (!sl || !src) continue;
        if (sl === 'transportation' || sl === 'landcover' || sl === 'park') {
          fuentes[src + '|' + sl] = { source: src, sourceLayer: sl };
        }
      }
      var vistosVia = {}, vistosVerde = {};
      for (var k in fuentes) {
        var f = fuentes[k];
        var feats;
        try { feats = S.map.querySourceFeatures(f.source, { sourceLayer: f.sourceLayer }) || []; }
        catch (e) { continue; }
        for (var n = 0; n < feats.length; n++) {
          var ft = feats[n];
          var p = ft.properties || {};
          var geom = ft.geometry;
          if (!geom) continue;
          if (f.sourceLayer === 'transportation') {
            var peso = pesoViaDeClase(p['class']);
            if (peso <= 0) continue;
            var lineas = geom.type === 'LineString' ? [geom.coordinates]
              : (geom.type === 'MultiLineString' ? geom.coordinates : null);
            if (!lineas) continue;
            var idv = ft.id != null ? 'v' + ft.id : null;
            if (idv && vistosVia[idv]) continue;
            if (idv) vistosVia[idv] = true;
            for (var li = 0; li < lineas.length; li++) {
              if (lineas[li] && lineas[li].length >= 2) ctx.vias.push({ peso: peso, puntos: lineas[li] });
            }
            if (ctx.vias.length > LUR.MAX_VIAS) break;
          } else {
            // landcover / park: solo masa verde
            var clase = p['class'] || '';
            var esVerde = f.sourceLayer === 'park' ? true
              : (clase === 'wood' || clase === 'grass' || clase === 'scrub' ||
                 clase === 'wetland' || clase === 'meadow');
            if (!esVerde) continue;
            if (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon') continue;
            var idg = ft.id != null ? 'g' + ft.id : null;
            if (idg && vistosVerde[idg]) continue;
            if (idg) vistosVerde[idg] = true;
            var anillos = geom.type === 'Polygon' ? [geom.coordinates[0]]
              : geom.coordinates.map(function (pg) { return pg[0]; });
            for (var ai = 0; ai < anillos.length; ai++) {
              if (anillos[ai] && anillos[ai].length >= 4) ctx.verdes.push(anillos[ai]);
            }
          }
        }
      }
      construirGrilla(ctx);
    } catch (e) { }
    S.contextoCalle = ctx;
    S.cacheFactor.clear(); // el contexto cambió: los factores viejos no valen
    return ctx;
  }

  function puntuacionVia(p, ctx) {
    if (!ctx || !ctx.vias.length) return 0;
    var celda = LUR.CELDA_GRILLA;
    var cx = Math.floor(p[0] / celda), cy = Math.floor(p[1] / celda);
    var mejor = 0;
    for (var dx = -1; dx <= 1; dx++) {
      for (var dy = -1; dy <= 1; dy++) {
        var entrada = ctx.grilla.get((cx + dx) + ',' + (cy + dy));
        if (!entrada) continue;
        for (var k = 0; k < entrada.vias.length; k++) {
          var v = ctx.vias[entrada.vias[k]];
          var dMin = Infinity;
          for (var j = 0; j < v.puntos.length - 1; j++) {
            var d = distPuntoSegmentoM(p, v.puntos[j], v.puntos[j + 1], ctx.cosLat);
            if (d < dMin) dMin = d;
            if (dMin < 2) break;
          }
          if (dMin > LUR.RADIO_VIA) continue;
          // Manda la vía DOMINANTE (la de mayor aporte), no la suma: una
          // esquina entre dos avenidas no contamina el doble.
          var contrib = v.peso * Math.exp(-dMin / LUR.DECAIMIENTO_VIA);
          if (contrib > mejor) mejor = contrib;
        }
      }
    }
    return mejor;
  }

  function puntuacionVerde(p, ctx) {
    if (!ctx || !ctx.verdes.length) return 0;
    var celda = LUR.CELDA_GRILLA;
    var cx = Math.floor(p[0] / celda), cy = Math.floor(p[1] / celda);
    var dMin = Infinity;
    for (var dx = -1; dx <= 1; dx++) {
      for (var dy = -1; dy <= 1; dy++) {
        var entrada = ctx.grilla.get((cx + dx) + ',' + (cy + dy));
        if (!entrada) continue;
        for (var k = 0; k < entrada.verdes.length; k++) {
          var anillo = ctx.verdes[entrada.verdes[k]];
          if (puntoEnAnillo(p, anillo)) return 1; // dentro del parque
          for (var j = 0; j < anillo.length - 1; j++) {
            var d = distPuntoSegmentoM(p, anillo[j], anillo[j + 1], ctx.cosLat);
            if (d < dMin) dMin = d;
          }
        }
      }
    }
    if (!isFinite(dMin) || dMin > LUR.RADIO_VERDE) return 0;
    return Math.exp(-dMin / LUR.DECAIMIENTO_VERDE);
  }

  // factorLocal: multiplicador del fondo regional para ESTE punto.
  // exp(b0 + b1·via - b2·verde + b3·cañón), acotado. Los pesos son los
  // priors salvo que OpenAQ los haya calibrado para esta ciudad.
  function factorLocalDe(p, svf, claveGeo) {
    var cacheado = S.cacheFactor.get(claveGeo);
    if (cacheado != null) return cacheado;
    var factor = 1;
    try {
      var ctx = obtenerContextoCalle();
      var via = puntuacionVia(p, ctx);
      var verde = puntuacionVerde(p, ctx);
      var canon = clamp(1 - (svf != null && isFinite(svf) ? svf : 1), 0, 1);
      var w = S.pesos;
      factor = clamp(Math.exp(w.b0 + w.b1 * via - w.b2 * verde + w.b3 * canon),
        LUR.FACTOR_MIN, LUR.FACTOR_MAX);
    } catch (e) { factor = 1; }
    if (S.cacheFactor.size > 900) S.cacheFactor.clear();
    S.cacheFactor.set(claveGeo, factor);
    return factor;
  }

  /* ---------------------------------------------------------------------
     CALIBRACIÓN CON ESTACIONES REALES (OpenAQ vía worker /openaq-estaciones)
     Cuando una ciudad tiene 2 o más estaciones con PM2.5 reciente, se
     compara la lectura real de cada una con el valor base de Open-Meteo y
     se ajustan los pesos del factor local (regresión ridge sobre
     log(medición/base) contra los predictores via/verde, con priors como
     ancla: con 2-10 estaciones el ajuste corrige sin sobreajustar).
     El contexto OSM de las estaciones (que suelen caer fuera de la vista)
     se pide con UNA consulta Overpass agregada por ciudad, no una por
     estación. Sin clave OpenAQ, sin estaciones o con la consulta caída:
     los priors siguen y el mapa funciona igual. Silencio total en consola.
     --------------------------------------------------------------------- */
  function postOverpass(query) {
    var ctl;
    try { ctl = new AbortController(); } catch (e) { ctl = null; }
    var timer = ctl ? setTimeout(function () { try { ctl.abort(); } catch (e) { } }, 30000) : null;
    var opciones = {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: 'data=' + encodeURIComponent(query)
    };
    if (ctl) opciones.signal = ctl.signal;
    return fetch('/arboles', opciones).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).catch(function () {
      if (timer) clearTimeout(timer);
      return null; // fallo silencioso: se quedan los priors
    });
  }

  function estacionesDeZona(lat, lon) {
    var clave = lat.toFixed(1) + ',' + lon.toFixed(1);
    var enCache = S.cacheEstaciones.get(clave);
    if (enCache && Date.now() - enCache.ts < OPENAQ_TTL) return Promise.resolve(enCache.lista);
    var url = '/openaq-estaciones?lat=' + lat.toFixed(3) + '&lon=' + lon.toFixed(3) + '&radio=25000';
    return fetchConReintentos(url, 0).then(function (d) {
      var lista = d && d.estaciones ? d.estaciones : [];
      S.cacheEstaciones.set(clave, { ts: Date.now(), lista: lista });
      return lista;
    });
  }

  // Contexto OSM de las estaciones: una sola consulta Overpass con todas.
  function contextoDeEstaciones(estaciones, latRef) {
    var clave = estaciones.map(function (e) { return e.id; }).join('-');
    if (S.ctxEstaciones && S.ctxEstaciones.clave === clave) {
      return Promise.resolve(S.ctxEstaciones.ctx);
    }
    var partes = [];
    for (var i = 0; i < estaciones.length; i++) {
      var e = estaciones[i];
      partes.push('way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|service"](around:400,' + e.lat + ',' + e.lon + ');');
      partes.push('way["landuse"~"grass|park|forest|meadow|recreation_ground|village_green"](around:250,' + e.lat + ',' + e.lon + ');');
      partes.push('way["leisure"~"park|garden|green"](around:250,' + e.lat + ',' + e.lon + ');');
    }
    var query = '[out:json][timeout:25];(' + partes.join('') + ');out geom;';
    return postOverpass(query).then(function (datos) {
      if (!datos || !datos.elements) return null;
      var ctx = { sig: 'ovp', vias: [], verdes: [], grilla: new Map(), cosLat: Math.max(0.087, Math.cos(latRef * Math.PI / 180)) };
      for (var i = 0; i < datos.elements.length; i++) {
        var el = datos.elements[i];
        if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) continue;
        var puntos = [];
        for (var j = 0; j < el.geometry.length; j++) {
          puntos.push([el.geometry[j].lon, el.geometry[j].lat]);
        }
        var tags = el.tags || {};
        if (tags.highway) {
          var peso = pesoViaDeClase(tags.highway);
          if (peso > 0) ctx.vias.push({ peso: peso, puntos: puntos });
        } else if ((tags.landuse || tags.leisure) && puntos.length >= 3) {
          ctx.verdes.push(puntos);
        }
      }
      construirGrilla(ctx);
      S.ctxEstaciones = { clave: clave, ctx: ctx };
      return ctx;
    });
  }

  // Ridge 3x3: minimiza Σ(y - Xw)² + Σ λk·(wk - prior_k)².
  function resolverRidge3(X, y, prior, lam) {
    var n = 3;
    var A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    var b = [0, 0, 0];
    for (var i = 0; i < X.length; i++) {
      for (var r = 0; r < n; r++) {
        b[r] += X[i][r] * y[i];
        for (var c = 0; c < n; c++) A[r][c] += X[i][r] * X[i][c];
      }
    }
    for (var k = 0; k < n; k++) { A[k][k] += lam[k]; b[k] += lam[k] * prior[k]; }
    for (var col = 0; col < n; col++) {
      var piv = col;
      for (var f = col + 1; f < n; f++) if (Math.abs(A[f][col]) > Math.abs(A[piv][col])) piv = f;
      if (Math.abs(A[piv][col]) < 1e-9) return null;
      if (piv !== col) {
        var tmpA = A[piv]; A[piv] = A[col]; A[col] = tmpA;
        var tmpB = b[piv]; b[piv] = b[col]; b[col] = tmpB;
      }
      for (var f2 = col + 1; f2 < n; f2++) {
        var fac = A[f2][col] / A[col][col];
        for (var c2 = col; c2 < n; c2++) A[f2][c2] -= fac * A[col][c2];
        b[f2] -= fac * b[col];
      }
    }
    var w = [0, 0, 0];
    for (var r2 = n - 1; r2 >= 0; r2--) {
      var s = b[r2];
      for (var c3 = r2 + 1; c3 < n; c3++) s -= A[r2][c3] * w[c3];
      w[r2] = s / A[r2][r2];
    }
    return w;
  }

  function calibrarPesosConEstaciones(pmBase, lat, lon) {
    if (!isFinite(pmBase) || pmBase <= 0 || S.calibrando) return;
    var claveZona = lat.toFixed(1) + ',' + lon.toFixed(1);
    if (S.calibracionZona === claveZona && Date.now() - S.calibracionTs < OPENAQ_TTL) return;
    // Se marca el intento ya: si no hay estaciones no se reintenta en media hora.
    S.calibracionZona = claveZona;
    S.calibracionTs = Date.now();
    S.calibrando = true;
    estacionesDeZona(lat, lon).then(function (lista) {
      var validas = [];
      for (var i = 0; i < lista.length; i++) {
        var e = lista[i];
        if (e && isFinite(e.lat) && isFinite(e.lon) && isFinite(e.pm25) && e.pm25 > 0 && e.pm25 < 500) {
          validas.push(e);
        }
      }
      if (validas.length < 2) return null; // sin estaciones suficientes: priors
      return contextoDeEstaciones(validas, lat).then(function (ctx) {
        if (!ctx) return;
        var X = [], y = [];
        for (var i = 0; i < validas.length; i++) {
          var est = validas[i];
          var p = [est.lon, est.lat];
          X.push([1, puntuacionVia(p, ctx), puntuacionVerde(p, ctx)]);
          y.push(Math.log(est.pm25 / pmBase));
        }
        var w = resolverRidge3(X, y, [LUR.PRIOR.b0, LUR.PRIOR.b1, LUR.PRIOR.b2], [0.5, 2, 2]);
        if (!w) return;
        S.pesos = {
          b0: clamp(w[0], -0.4, 0.4),
          b1: clamp(w[1], 0.05, 0.9),
          b2: clamp(w[2], 0.0, 0.8),
          b3: LUR.PRIOR.b3 // el cañón de una estación fuera de vista no se mide: prior
        };
        S.pesosCalibrados = validas.length;
        S.cacheFactor.clear();
        S.sigGeometria = ''; // fuerza el repintado con los pesos calibrados
        programarEvaluacion();
      });
    }).then(function () { S.calibrando = false; })
      .catch(function () { S.calibrando = false; });
  }

  /* ---------------------------------------------------------------------
     Tinte de los polígonos. UN SQI por polígono en su centroide, por
     tandas de 20, con la fuente 'sombras' que ya existe. El color viaja
     como propiedad del polígono (sqi_color) y el fill-color de la capa se
     vuelve data-driven una sola vez, con transición de 300 ms.
     --------------------------------------------------------------------- */
  function asegurarPaintColor() {
    try {
      if (!S.map.getLayer('capa-sombras')) return;
      S.map.setPaintProperty('capa-sombras', 'fill-color',
        ['coalesce', ['get', 'sqi_color'], '#0b1220']);
      S.map.setPaintProperty('capa-sombras', 'fill-color-transition',
        { duration: 300, delay: 0 });
    } catch (e) { }
  }

  function solVisible(fecha, lat, lon) {
    try {
      if (window.SunCalc && SunCalc.getPosition) {
        return SunCalc.getPosition(fecha, lat, lon).altitude > 0;
      }
    } catch (e) { }
    var h = fecha.getHours();
    return h >= 7 && h <= 21;
  }

  function evaluarSombras() {
    if (S.calculando || S.pintando) {
      // Si llega una sombra nueva mientras hay un cálculo o un setData en
      // vuelo, no se pierde: se reintenta enseguida. Contador de seguridad
      // para que nunca pueda convertirse en un bucle infinito.
      S.reintentos = (S.reintentos || 0) + 1;
      if (S.reintentos <= 25 && !S.timerRetry) {
        S.timerRetry = setTimeout(function () {
          S.timerRetry = null;
          evaluarSombras();
        }, 900);
      }
      return;
    }
    S.reintentos = 0;
    var src;
    try { src = S.map.getSource('sombras'); } catch (e) { return; }
    if (!src) return;
    var datos;
    try { datos = src._data || (src.serialize && src.serialize().data); } catch (e) { return; }
    var feats = datos && datos.features ? datos.features : [];
    var fecha = fechaEfectiva();
    var hKey = horaKeyDe(fecha);
    var centro = S.map.getCenter();
    var lat = centro.lat, lon = centro.lng;

    // Firma de la colección: número de polígonos + hora. Si nada cambió y
    // todos los polígonos llevan la hora actual, no se hace nada.
    var sig = feats.length + '|' + hKey;
    if (sig === S.sigGeometria && S.ultimosMeteo) {
      var completos = true;
      for (var c = 0; c < feats.length; c++) {
        if (!feats[c].properties || feats[c].properties.sqi_hora !== hKey) { completos = false; break; }
      }
      if (completos) {
        var previo = S.horaKey === hKey ? S.ultimoPintado : null;
        pintarUi(fecha, lat, lon, hKey, previo ? previo.sqi : null, previo ? previo.svf : null);
        return;
      }
    }

    S.calculando = true;

    meteoDeZona(lat, lon, hKey).then(function (meteo) {
      if (!meteo) { S.calculando = false; return; } // fallo silencioso
      S.ultimosMeteo = meteo;
      var serie = serieHoraria(meteo);
      var idx = indiceDeHora(serie, fecha);
      var ghi = idx >= 0 ? serie.ghi[idx] : null;
      var dhi = idx >= 0 ? serie.dhi[idx] : null;

      var noche = !solVisible(fecha, lat, lon) || !isFinite(ghi) || ghi === null || ghi <= 10;

      // Calibración con estaciones reales de la ciudad (OpenAQ): una vez por
      // zona cada media hora, en paralelo al pintado. Si trae pesos nuevos,
      // se programa solo el repintado. Sin estaciones, los priors mandan.
      var pmZona = idx >= 0 ? serie.pm[idx] : null;
      if (!noche && isFinite(pmZona) && pmZona > 0) {
        try { calibrarPesosConEstaciones(pmZona, lat, lon); } catch (e) { }
      }

      if (!feats.length) {
        S.calculando = false;
        S.sigGeometria = sig;
        S.horaKey = hKey;
        pintarUi(fecha, lat, lon, hKey, null, null);
        return;
      }

      // Lotes: se recorren todos los polígonos, se recolorean y al final
      // hay UN solo setData por tanda completa (la transición suaviza).
      var copias = [];
      for (var i = 0; i < feats.length; i++) {
        var f = feats[i];
        var copia = { type: 'Feature', geometry: f.geometry, properties: {} };
        var props = f.properties || {};
        for (var k in props) copia.properties[k] = props[k];
        copias.push(copia);
      }

      var pendientes = copias.slice();
      var svfMedio = 0, nSvf = 0, sumaSqi = 0, nSqi = 0;

      function tanda() {
        var procesados = 0;
        while (pendientes.length && procesados < LOTE) {
          var f2 = pendientes.shift();
          procesados++;
          try {
            if (noche) {
              delete f2.properties.sqi_color;
              delete f2.properties.sqi;
              delete f2.properties.sqi_hora;
              continue;
            }
            var centroide = turf.centroid(f2).geometry.coordinates;
            var clave = claveGeometria(f2, copias.indexOf(f2));
            var svf;
            try {
              var area = turf.area(f2);
              if (area > UMBRAL_AREA_GRANDE) {
                // Polígono enorme (un parque): 2-3 centroides lógicos con
                // turf y valor medio. Nada más masivo que esto.
                var caja = turf.bbox(f2);
                var mitadX = (caja[0] + caja[2]) / 2;
                var tercioY = (caja[1] + caja[3]) / 2;
                var muestras = [
                  turf.centroid(f2).geometry.coordinates,
                  [mitadX, caja[1] + (caja[3] - caja[1]) * 0.3],
                  [mitadX, caja[1] + (caja[3] - caja[1]) * 0.7]
                ];
                var svfT = 0, nT = 0;
                for (var m = 0; m < muestras.length; m++) {
                  var cl = clave + ':m' + m + ':' + muestras[m][0].toFixed(5) + ',' + muestras[m][1].toFixed(5);
                  svfT += svfDeCentroide(muestras[m], cl); nT++;
                }
                svf = nT ? svfT / nT : 1;
              } else {
                svf = svfDeCentroide(centroide, clave);
              }
            } catch (e) { svf = 1; }

            if (!isFinite(dhi) || dhi === null || !isFinite(ghi) || ghi <= 0) {
              delete f2.properties.sqi_color;
              delete f2.properties.sqi;
              delete f2.properties.sqi_hora;
              continue;
            }
            // Ajuste local (LUR): la difusa sube donde el contexto de calle
            // acumula más carga (vía pesada, cañón cerrado) y baja con verde.
            // Amortiguada por K(clima): la difusa responde a los aerosoles,
            // pero menos que la concentración en superficie.
            var factor = 1;
            try { factor = factorLocalDe(centroide, svf, clave); } catch (e) { factor = 1; }
            // DOCUMENTACIÓN (metodologia.html): K limita la influencia del
            // factor local LUR sobre la radiación difusa y depende de la
            // zona Köppen-Geiger del centroide (tabla K_DIFUSA_POR_CLASE,
            // priors ordinales documentados arriba). De dónde: en cielos
            // reales la difusa aumenta menos que proporcionalmente con el
            // aerosol cercano (parte de la difusa viene del aerosol de la
            // columna completa, que ya trae CAMS), y cuánto dice la
            // superficie sobre esa columna depende del clima: convección
            // y polvo en el sur seco (K alto), nubosidad y desacoplamiento
            // en el norte atlántico (K bajo). Aplicar el factor completo
            // haría que una calle sucia «saltase» de categoría sin apoyo
            // experimental; K deja visible el efecto sin exagerar.
            var kDif = coeficienteDifusaEn(centroide[1], centroide[0]);
            var dhiEf = dhi * (1 + kDif * (factor - 1)) * svf;
            var sqi = clamp(0, 100, Math.round(100 * (1 - dhiEf / ghi)));
            f2.properties.sqi = sqi;
            f2.properties.sqi_color = colorDeSqi(sqi);
            f2.properties.sqi_hora = hKey;
            f2.properties.sqi_f = Math.round(factor * 100) / 100;
            f2.properties.sqi_k = kDif;
            f2.properties.sqi_svf = Math.round(svf * 100) / 100;
            svfMedio += svf; nSvf++;
            sumaSqi += sqi; nSqi++;
          } catch (e) { /* un polígono que falle no rompe la tanda */ }
        }

        if (pendientes.length) {
          setTimeout(tanda, 0);
        } else {
          S.pintando = true;
          try {
            src.setData({ type: 'FeatureCollection', features: copias });
            asegurarPaintColor();
          } catch (e) { }
          // El evento sourcedata que genera nuestro propio setData vuelve a
          // llamar a evaluarSombras, pero la firma ya estará al día.
          setTimeout(function () { S.pintando = false; }, 100);
          S.calculando = false;
          S.sigGeometria = sig;
          S.horaKey = hKey;
          pintarUi(fecha, lat, lon, hKey, nSqi ? sumaSqi / nSqi : null,
            nSvf ? svfMedio / nSvf : null);
        }
      }
      tanda();
    }).catch(function () { S.calculando = false; });
  }

  /* ---------------------------------------------------------------------
     Bloque compacto unido al panel solar SVG visible. El antiguo panel
     #rsTimeControls sigue oculto y solo actúa como puente lógico.
     --------------------------------------------------------------------- */
  function posicionarWidgetMini() {
    var mini = document.getElementById('rsSqiMini');
    var root = S.widgetRoot, panel = S.widgetPanel;
    if (!mini || !root || !panel || !root.parentElement) return;
    if (mini.parentElement !== root.parentElement) {
      root.parentElement.insertBefore(mini, root.nextSibling);
    }
    // AÑADIDO: la calidad de sombra SOLO se enseña con «Sombras» encendida.
    // Con el interruptor apagado (o sin interruptor en la página) el widget
    // solar queda exactamente como estaba, sin la tarjeta debajo.
    var sombrasOn = true;
    try {
      var tg = document.getElementById('rsToggleSombras');
      if (tg) sombrasOn = !!tg.checked;
    } catch (e) { }
    var abierto = panel.classList.contains('o') && sombrasOn;
    mini.hidden = !abierto;
    mini.setAttribute('aria-hidden', abierto ? 'false' : 'true');
    if (!abierto) return;

    var rect = root.getBoundingClientRect();
    var escala = rect.width / 390;
    if (!isFinite(escala) || escala <= 0) return;
    var left = parseFloat(root.style.left);
    var top = parseFloat(root.style.top);
    if (!isFinite(left) || !isFinite(top)) {
      var padreRect = root.parentElement.getBoundingClientRect();
      left = rect.left - padreRect.left + root.parentElement.scrollLeft;
      top = rect.top - padreRect.top + root.parentElement.scrollTop;
    }
    mini.style.width = (341 * escala) + 'px';
    mini.style.left = (left + 12 * escala) + 'px';
    mini.style.top = (top + 258 * escala - mini.offsetHeight) + 'px';
  }

  function montarWidgetMini() {
    var root = document.querySelector('svg#map');
    var panel = root && root.querySelector('#w');
    if (!root || !panel || !root.parentElement) return false;

    var slider = document.getElementById('rsTimeSlider');
    if (slider && S.sliderTiempo !== slider) {
      if (S.sliderTiempo) S.sliderTiempo.removeEventListener('input', programarEvaluacion);
      S.sliderTiempo = slider;
      slider.addEventListener('input', programarEvaluacion, { passive: true });
    }

    var mini = document.getElementById('rsSqiMini');
    if (mini && S.widgetRoot === root && S.widgetPanel === panel &&
      mini.parentElement === root.parentElement) return true;

    if (S.widgetRoot !== root) {
      if (S.obsWidgetRoot) S.obsWidgetRoot.disconnect();
      S.widgetRoot = root;
      try {
        S.obsWidgetRoot = new MutationObserver(posicionarWidgetMini);
        S.obsWidgetRoot.observe(root, { attributes: true, attributeFilter: ['style'] });
      } catch (e) { }
    }
    if (S.widgetPanel !== panel) {
      if (S.obsWidgetPanel) S.obsWidgetPanel.disconnect();
      S.widgetPanel = panel;
      try {
        S.obsWidgetPanel = new MutationObserver(posicionarWidgetMini);
        S.obsWidgetPanel.observe(panel, { attributes: true, attributeFilter: ['class'] });
      } catch (e) { }
    }
    if (!S.widgetEventos) {
      S.widgetEventos = true;
      window.addEventListener('resize', posicionarWidgetMini, { passive: true });
      document.addEventListener('fullscreenchange', posicionarWidgetMini);
      document.addEventListener('webkitfullscreenchange', posicionarWidgetMini);
      if (window.visualViewport) window.visualViewport.addEventListener('resize', posicionarWidgetMini, { passive: true });
    }

    if (!mini) {
      mini = document.createElement('div');
      mini.className = 'rs-sqi-mini';
      mini.id = 'rsSqiMini';
      mini.hidden = true;
      mini.setAttribute('role', 'group');
      mini.setAttribute('aria-label', 'Calidad de la sombra');
      mini.innerHTML =
        '<div class="rs-sqi-mini-fila">' +
        '<span class="rs-sqi-mini-estado" id="rsSqiMiniEstado">Midiendo la sombra</span>' +
        '<span class="rs-sqi-mini-pct" id="rsSqiMiniPct"></span>' +
        '</div>' +
        '<div class="rs-sqi-mini-barra" aria-hidden="true">' +
        '<div class="rs-sqi-mini-indicador" id="rsSqiMiniIndicador"></div>' +
        '</div>' +
        '<div class="rs-sqi-mini-datos" id="rsSqiMiniDatos"></div>' +
        '<div class="rs-sqi-mini-aviso">Estimación calculada con datos públicos. No es una medición directa de un sensor en este punto. ' +
        '<a href="metodologia.html" target="_blank" rel="noopener">Cómo se calcula</a></div>';
      root.parentElement.insertBefore(mini, root.nextSibling);
      if (S.ultimoPintado) {
        pintarMini(S.ultimoPintado.noche, S.ultimoPintado.sqi,
          S.ultimoPintado.aod, S.ultimoPintado.pm, S.ultimoPintado.dhi);
      }
    }
    posicionarWidgetMini();
    return true;
  }

  function pintarMini(noche, sqi, aod, pm, dhi) {
    var mini = document.getElementById('rsSqiMini');
    if (!mini) return;
    var estadoEl = document.getElementById('rsSqiMiniEstado');
    var pctEl = document.getElementById('rsSqiMiniPct');
    var ind = document.getElementById('rsSqiMiniIndicador');
    var datosEl = document.getElementById('rsSqiMiniDatos');
    mini.classList.toggle('rs-sqi-mini-noche', noche);

    if (noche) {
      if (estadoEl) estadoEl.textContent = 'Sin radiación solar directa';
      if (pctEl) pctEl.textContent = '';
      if (ind) ind.style.left = '0%';
    } else if (sqi != null && isFinite(sqi)) {
      var color = colorDeSqi(sqi);
      mini.style.setProperty('--rs-sqi-mini-color', color);
      if (estadoEl) estadoEl.textContent = estadoDeSqi(sqi);
      if (pctEl) pctEl.textContent = sqi + ' %';
      if (ind) ind.style.left = clamp(0, 100, sqi) + '%';
    } else {
      var sombrasActivas = document.getElementById('rsToggleSombras');
      mini.style.setProperty('--rs-sqi-mini-color', '#EEF1F6');
      if (estadoEl) estadoEl.textContent = sombrasActivas && sombrasActivas.checked
        ? 'Buscando sombras en esta zona' : 'Activa las sombras para medirlas';
      if (pctEl) pctEl.textContent = '';
      if (ind) ind.style.left = '0%';
    }

    var puntoAod = aod == null ? '' : (aod < 0.2 ? ' rs-sqi-punto-bajo' : (aod <= 0.4 ? ' rs-sqi-punto-moderado' : ' rs-sqi-punto-alto'));
    var puntoPm = pm == null ? '' : (pm <= 15 ? ' rs-sqi-punto-bajo' : (pm <= 25 ? ' rs-sqi-punto-moderado' : ' rs-sqi-punto-alto'));
    var html =
      '<span class="rs-sqi-mini-dato"><i class="rs-sqi-punto' + puntoAod + '"></i>AOD <b>' + (aod != null ? aod.toFixed(2) : '–') + '</b></span>' +
      '<span class="rs-sqi-mini-dato"><i class="rs-sqi-punto' + puntoPm + '"></i>PM2.5 <b>' + (pm != null ? Math.round(pm) : '–') + '</b></span>' +
      '<span class="rs-sqi-mini-dato"><i class="rs-sqi-punto rs-sqi-punto-azul"></i>DHI <b>' + (dhi != null ? Math.round(dhi) : '–') + '</b></span>';
    if (datosEl && datosEl.__htmlCache !== html) { datosEl.innerHTML = html; datosEl.__htmlCache = html; }
  }

  function nivelPuntoAod(aod) {
    if (aod == null) return '';
    if (aod < 0.2) return ' rs-sqi-punto-bajo';
    if (aod <= 0.4) return ' rs-sqi-punto-moderado';
    return ' rs-sqi-punto-alto';
  }
  function nivelPuntoPm(pm) {
    if (pm == null) return '';
    if (pm <= 15) return ' rs-sqi-punto-bajo';
    if (pm <= 25) return ' rs-sqi-punto-moderado';
    return ' rs-sqi-punto-alto';
  }

  function pintarUi(fecha, lat, lon, hKey, sqiMedio, svfMedio) {
    var card = document.querySelector('.rs-sqi-card');
    var meteo = S.ultimosMeteo;
    var serie = meteo ? serieHoraria(meteo) : null;
    var idx = serie ? indiceDeHora(serie, fecha) : -1;
    var ghi = idx >= 0 ? serie.ghi[idx] : null;
    var dhi = idx >= 0 ? serie.dhi[idx] : null;
    var aod = idx >= 0 ? serie.aod[idx] : null;
    var pm = idx >= 0 ? serie.pm[idx] : null;
    var noche = !solVisible(fecha, lat, lon) || !isFinite(ghi) || ghi === null || ghi <= 10;

    // Primero el bloque mini del widget de hora: no depende de la tarjeta
    // de la página y tiene que pintar aunque la tarjeta aún no exista.
    var sqiMini = (!noche && sqiMedio != null && isFinite(sqiMedio))
      ? Math.round(clamp(0, 100, sqiMedio)) : null;
    pintarMini(noche, sqiMini, aod, pm, dhi);
    S.ultimoPintado = { noche: noche, sqi: sqiMini, aod: aod, pm: pm, dhi: dhi,
      svf: svfMedio != null && isFinite(svfMedio) ? svfMedio : null };

    var estado = document.getElementById('rsSqiEstado');
    var pct = document.getElementById('rsSqiPct');
    var indicador = document.getElementById('rsSqiIndicador');
    var caja = document.getElementById('rsSqiContexto');
    var titulo = document.getElementById('rsSqiContextoTitulo');
    var cuerpo = document.getElementById('rsSqiContextoCuerpo');

    // Aviso de transparencia junto al dato: la tarjeta SQI se construye
    // dinámicamente, así que se asegura el aviso en cada repintado.
    if (card && !document.getElementById('rsSqiAvisoMetodo')) {
      var aviso = document.createElement('div');
      aviso.className = 'rs-sqi-aviso';
      aviso.id = 'rsSqiAvisoMetodo';
      aviso.innerHTML = 'Estimación calculada con datos públicos. No es una medición directa de un sensor en este punto. ' +
        '<a href="metodologia.html" target="_blank" rel="noopener">Cómo se calcula</a>';
      card.appendChild(aviso);
    }

    if (card) card.classList.toggle('rs-sqi-noche', noche);

    if (noche) {
      if (estado) estado.textContent = 'Sin radiación solar directa';
      if (pct) pct.textContent = '–';
      if (indicador) indicador.style.left = '0%';
      if (card) card.style.setProperty('--rs-sqi-color', 'rgba(237,244,242,0.45)');
      if (card) card.style.setProperty('--rs-sqi-borde', 'rgba(237,244,242,0.1)');
      if (titulo) titulo.textContent = 'La sombra descansa';
      if (cuerpo) cuerpo.textContent = 'De noche no hay radiación solar directa que medir. La calidad de sombra vuelve al amanecer.';
    } else if (sqiMedio != null && isFinite(sqiMedio)) {
      var sqi = clamp(0, 100, Math.round(sqiMedio));
      var color = colorDeSqi(sqi);
      if (card) card.style.setProperty('--rs-sqi-color', color);
      if (card) card.style.setProperty('--rs-sqi-borde', color + '55');
      if (estado) estado.textContent = estadoDeSqi(sqi);
      if (pct) pct.textContent = String(sqi);
      if (indicador) indicador.style.left = sqi + '%';

      // Texto contextual por prioridad.
      if (aod != null && aod > 0.4) {
        if (titulo) titulo.textContent = 'Polvo sahariano activo';
        if (cuerpo) cuerpo.textContent = 'La calima dispersa calor dentro de la sombra. Aunque el sol no te dé directo, la carga radiativa se acerca a la de estar al sol.';
      } else if (pm != null && pm > 25) {
        if (titulo) titulo.textContent = 'Contaminación elevada';
        if (cuerpo) cuerpo.textContent = 'Con partículas en suspensión la radiación difusa calienta también a la sombra. Mejor sombra cerrada y poco tiempo al aire libre.';
      } else if ((aod != null && aod < 0.2) && (pm != null && pm <= 15) && (dhi != null && dhi <= 80)) {
        if (titulo) titulo.textContent = 'Aire limpio y cielo despejado';
        if (cuerpo) cuerpo.textContent = 'Esta es una sombra de calidad. El cielo abierto enfría de verdad dentro de la sombra.';
      } else if (sqi >= 85) {
        if (titulo) titulo.textContent = 'Sombra efectiva';
        if (cuerpo) cuerpo.textContent = 'La radiación difusa que llega bajo techo es baja. Esta sombra protege de verdad del calor.';
      } else if (sqi >= 65) {
        if (titulo) titulo.textContent = 'Sombra reducida';
        if (cuerpo) cuerpo.textContent = 'Protege bastante, aunque el cielo cargado deja pasar algo de calor difuso. Sumar sombra de árbol ayuda.';
      } else if (sqi >= 40) {
        if (titulo) titulo.textContent = 'Sombra débil';
        if (cuerpo) cuerpo.textContent = 'La radiación difusa se cuela con fuerza. Busca sombra más cerrada o espacios interiores.';
      } else {
        if (titulo) titulo.textContent = 'Sombra ilusoria';
        if (cuerpo) cuerpo.textContent = 'Apenas protege del calor. Bajo este cielo la diferencia con el sol directo es pequeña.';
      }
    }

    // Badges AOD / PM2.5 / DHI.
    var elAod = document.getElementById('rsSqiAod');
    var elPm = document.getElementById('rsSqiPm');
    var elDhi = document.getElementById('rsSqiDhi');
    var punAod = document.getElementById('rsSqiPuntoAod');
    var punPm = document.getElementById('rsSqiPuntoPm');
    if (elAod) elAod.textContent = aod != null ? aod.toFixed(2) : '–';
    if (elPm) elPm.textContent = pm != null ? Math.round(pm) : '–';
    if (elDhi) elDhi.textContent = dhi != null ? Math.round(dhi) : '–';
    if (punAod) punAod.className = 'rs-sqi-punto' + nivelPuntoAod(aod);
    if (punPm) punPm.className = 'rs-sqi-punto' + nivelPuntoPm(pm);

    // Próximas 6 horas (se usan los datos horarios ya descargados).
    var contHoras = document.getElementById('rsSqiHoras');
    if (contHoras) {
      var html = '';
      var svfZona = svfMedio != null && isFinite(svfMedio) ? svfMedio : 0.8;
      for (var h = 1; h <= 6; h++) {
        var fH = new Date(fecha.getTime() + h * 3600 * 1000);
        var iH = serie ? indiceDeHora(serie, fH) : -1;
        var gH = iH >= 0 ? serie.ghi[iH] : null;
        var dH = iH >= 0 ? serie.dhi[iH] : null;
        var txtHora = fH.getHours() + 'h';
        if (gH == null || !isFinite(gH) || gH <= 10 || !solVisible(fH, lat, lon)) {
          html += '<div class="rs-sqi-hora rs-sqi-hora-noche"><span class="rs-sqi-hora-hora">' + txtHora +
            '</span><span class="rs-sqi-hora-punto"></span><span class="rs-sqi-hora-valor">noche</span></div>';
        } else {
          var sqiH = clamp(0, 100, Math.round(100 * (1 - (dH * svfZona) / gH)));
          var colH = colorDeSqi(sqiH);
          html += '<div class="rs-sqi-hora"><span class="rs-sqi-hora-hora">' + txtHora +
            '</span><span class="rs-sqi-hora-punto" style="--rs-sqi-color-h:' + colH + ';background:' + colH +
            '"></span><span class="rs-sqi-hora-valor" style="--rs-sqi-color-h:' + colH + ';color:' + colH + '">' + sqiH + ' %</span></div>';
        }
      }
      if (contHoras.__htmlCache !== html) { contHoras.innerHTML = html; contHoras.__htmlCache = html; }
    }
  }

  /* ---------------------------------------------------------------------
     Arranque: patrón del proyecto (reintentos suaves), escucha de la fuente
     'sombras' y reevaluación de la hora cada 40 s (el selector de hora
     dispara el recálculo sin llamadas nuevas a la API).
     --------------------------------------------------------------------- */
  function programarEvaluacion() {
    if (S.rafProgramado) return;
    S.rafProgramado = true;
    setTimeout(function () {
      S.rafProgramado = false;
      evaluarSombras();
    }, 700);
  }

  function arrancar(intentos) {
    try {
      if (window.manolitAireMap && window.turf) {
        S.map = window.manolitAireMap;
        // Rejilla Köppen para el K de amortiguación: una sola descarga al
        // arrancar; las consultas por punto son accesos en memoria.
        try { cargarRejillaKoppen(); } catch (e) { }
        // La calidad de sombra vive SOLO dentro del widget de hora del mapa.
        // No hay tarjeta fuera del mapa y los bloques Aire/Previsión de la
        // página se quedan exactamente donde estaban.

        // Widget mini: el panel de hora se construye dinámicamente, así que
        // se espera con un observador y se reinserta si se reconstruye.
        try {
          var obsWidget = new MutationObserver(function () { montarWidgetMini(); });
          obsWidget.observe(document.body, { childList: true, subtree: true });
        } catch (e) { }
        var intentosWidget = 0;
        var timerWidget = setInterval(function () {
          if (montarWidgetMini() || ++intentosWidget > 90) clearInterval(timerWidget);
        }, 1000);

        try { S.map.on('sourcedata', function (e) { if (e && e.sourceId === 'sombras' && !S.pintando) programarEvaluacion(); }); } catch (e) { }
        try { S.map.on('styledata', function () { if (!S.capaEdificios) S.capaEdificios = detectarCapaEdificios(); }); } catch (e) { }
        S.capaEdificios = detectarCapaEdificios();
        // AÑADIDO: al conmutar «Sombras» se enseña/oculta la tarjeta de
        // calidad de sombra al instante, sin esperar al repintado.
        try {
          var tgSombras = document.getElementById('rsToggleSombras');
          if (tgSombras) tgSombras.addEventListener('change', function () { posicionarWidgetMini(); });
        } catch (e) { }

        S.timerReevaluacion = setInterval(function () {
          if (document.hidden) return;
          var ahora = Date.now();
          if (ahora - S.ultimaEval < RETRASO_REEVALUACION) return;
          S.ultimaEval = ahora;
          var sigHora = horaKeyDe(fechaEfectiva());
          if (sigHora !== S.horaKey || !S.ultimosMeteo) programarEvaluacion();
        }, 10000);

        programarEvaluacion();
      } else if (intentos < 120) {
        setTimeout(function () { arrancar(intentos + 1); }, 500);
      }
    } catch (e) { /* el SQI jamás rompe el mapa */ }
  }

  arrancar(0);
})();
