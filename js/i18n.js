/* ============================================================
   MANOLITO AIRE, i18n
   Castellano, català, euskera, galego, English, ქართული (georgiano), العربية.
   
   v3: Añadidas traducciones para el sistema de rutas alternativas
   con evaluación de porcentaje de sombra.
   ============================================================ */

const translations = {
	es: {
		// Modo salud de los sábados (sep-2026, orden de Sandro)
		saludBannerTexto: "En esta tierra, cuidar nuestro entorno es cuidar nuestro cuerpo.",
		saludBannerCta: "Descubre por qué defendemos la salud ambiental y cada rincón de sombra.",
		saludKicker: "Fin de semana de la salud",
		saludH2: "En defensa de las sombras: Salud Ambiental Urbana.",
		saludP1: "Cruzar de la acera del sol a la de la sombra en pleno verano andaluz puede suponer diez grados de diferencia en tu cuerpo. Eso no es una anécdota, es salud ambiental. El asfalto y el hormigón retienen el calor y transforman nuestras calles en trampas térmicas que agreden al organismo.",
		saludP2: "Ni siquiera Hércules, fundador mítico de Sevilla, era invencible. Era un semidiós y, como humano, tenía fragilidades físicas que debía proteger antes de caer. Nosotros no buscamos soluciones médicas tardías; buscamos prevención ambiental. Cada árbol y cada sombra es medicina urbana que modifica el clima de la calle para proteger a nuestra gente.",
		saludNota: "Aviso de Manolit∞: Recuerda que este simulador es una herramienta digital para ayudarte a planificar, pero no es 100% preciso y las sombras reales de la calle pueden variar. Por eso la salud ambiental depende también de tu sentido común: ante la duda, busca siempre el refugio fresco.",
		saludChat: "¡Por cierto! Recuerda que estamos en el fin de semana de la salud ambiental. El entorno influye en tu cuerpo: si sales a la calle, busca la acera de la sombra y refréscate, que la calle quema.",
		saludSolTit: "Cuándo el sol se convierte en un problema",
		saludSolTxt: "Entre las 12h y las 17h el sol no solo calienta, acumula radiación sobre el asfalto, las fachadas y tu cuerpo sin que lo notes. No se trata de evitarlo, sino de saber moverse por la ciudad en las horas en las que trabaja a tu favor y no en tu contra.",
		saludSombraTit: "La sombra como infraestructura",
		saludSombraTxt: "En una ciudad con 40°C, pasar de sol directo a sombra puede bajar la temperatura percibida hasta 10°C en segundos. No es comodidad, es protección real. Los árboles, los porches y las calles estrechas son recursos que existen y que se pueden usar. Manolit∞ Aire te ayuda a encontrarlos.",
		saludCuerpoTit: "Tu cuerpo frente al calor urbano",
		saludCuerpoTxt: "El calor extremo no avisa igual en todas las personas. Los niños, los mayores y quienes trabajan al aire libre lo notan antes y peor. Conocer cómo responde tu entorno, la temperatura de tu barrio, la brisa disponible, la sombra cercana, es la primera forma de cuidarte sin necesitar nada más que información.",
		saludAguaTit: "Agua: lo que el cuerpo no puede negociar",
		saludAguaTxt: "Con calor el cuerpo pierde agua más rápido de lo que percibimos. No esperes a tener sed. Beber antes, en pequeñas cantidades y de forma constante durante las horas de mayor calor, es lo que realmente marca la diferencia. El acceso a agua fresca en espacios públicos también es salud.",
		saludTempTit: "No todas las calles tienen la misma temperatura",
		saludTempTxt: "A dos manzanas de distancia puede haber una diferencia de 5°C según el tipo de suelo, la presencia de árboles o el ancho de la calle. Las islas de calor no son un concepto abstracto, son el barrio donde vives. Entender cómo se distribuye el calor en tu entorno cambia cómo te mueves y cuándo.",
		saludPrevTit: "Prepararse antes de que llegue la ola",
		saludPrevTxt: "Las olas de calor no son emergencias imprevisibles, tienen un patrón y se anuncian. Conocer los puntos de tu barrio donde el calor se concentra, identificar refugios frescos cercanos y saber qué vecinos necesitan más atención en esos días es, sencillamente, lo más efectivo que existe.",
		saludRecursos: "Recursos oficiales",
		saludLinkSanidad: "Consejería de Sanidad de la Junta",
		saludLinkResponde: "Consultas y Gestión de Citas (Salud Responde)",
		// Recursos por gama (26-sep, orden de Sandro, textos dictados).
		// Las dos keys andaluzas de arriba quedan en reserva, ya no se
		// muestran: de Andalucía solo queda OSMAN.
		saludGamaRegional: "Gama Regional (Andalucía)",
		saludGamaNacional: "Gama Nacional (España)",
		saludGamaEuropea: "Gama Europea (UE)",
		saludGamaGlobal: "Gama Global (ONU)",
		saludLinkOsman: "OSMAN - Observatorio de Salud y Medio Ambiente de Andalucía",
		saludUsoOsman: "Uso: Referencia autonómica para planes de acción local frente al cambio climático.",
		saludLinkOscc: "OSCC - Observatorio de Salud y Cambio Climático",
		saludUsoOscc: "Uso: Ente del Ministerio de Sanidad encargado de los umbrales de riesgo por provincias y alertas sanitarias por calor.",
		saludLinkEuropeo: "Observatorio Europeo del Clima y la Salud",
		saludUsoEuropeo: "Uso: Portal de la Comisión Europea y la AEMA para predecir impactos en la salud y monitorizar indicadores biometeorológicos en Europa.",
		saludLinkClimahealth: "ClimaHealth",
		saludUsoClimahealth: "Uso: La plataforma de conocimiento global compartida por la OMS y la OMM para la resiliencia en salud pública.",
		saludP3: "Por eso existe esta web. Para que sepas dónde está la sombra ahora mismo y para que cuides las que quedan. Las ciudades que abrazan sus zonas verdes y sus calles frescas cuidan a su gente.",
		saludCierre: "La sombra es medicina urbana, y es gratis.",
		// General
		tagline: "El aire y la sombra de tu calle, en vivo",
		modesLabel: "¿Cómo quieres que te lo cuente?",
		mode_ciudadano_title: "Ciudadano",
		mode_ciudadano_sub: "Claro y directo",
		mode_cientifico_title: "Científico",
		mode_cientifico_sub: "Con los datos",
		mode_yayo_title: "Abuela / Abuelo",
		mode_yayo_sub: "Letra grande, sin prisa",
		mode_peque_title: "Peque (5 años)",
		mode_peque_sub: "Con dibujitos",
		imLost: "No lo entiendo, explícamelo",
		mapTitle: "El aire de España, ahora mismo",
		legendGood: "Buena",
		legendMid: "Moderada",
		legendBad: "Mala",
		legendNote: "Los puntos son estaciones reales. El color entre ciudades es estimado, no medido.",
		aboutLink: "¿Por qué existe esto?",
		chatOpen: "Pregúntale a Manolit∞",
		chatTitle: "Manolit∞ te lo explica",
		chatWelcome: "Soy Manolit∞. Pregunta lo que necesites.",
		chatPlaceholder: "Escribe tu pregunta aquí...",
		chatSend: "Enviar",
		airLvlGood: "bueno",
		airLvlFair: "aceptable",
		airLvlModerate: "moderado",
		airLvlPoor: "malo",
		airLvlVeryPoor: "muy malo",
		airLvlHazard: "peligroso",
		chatAirUnavailable: "Calidad del aire no disponible para este país.",
		chatRouteStreets: "Vas a pasar por",
		chatRouteStreetsAir: "calles donde se estima un nivel de contaminación",
		chatRouteAirOnly: "En esta ruta se estima un nivel de contaminación",
		chatRouteMapLoading: "El mapa todavía se está cargando. Baja hasta él, deja que termine y vuelve a pulsarme.",
		chatRouteLocating: "Buscando tu ubicación…",
		chatRouteNoGeo: "Este navegador no me deja saber dónde estás. Escribe el origen a mano en el panel de rutas y te lo preparo.",
		chatRouteDenied: "Sin permiso de ubicación no puedo salir desde donde estás. Si cambias de idea, actívalo en el navegador y vuelve a pulsarme.",
		chatRouteBusy: "Ya estoy buscándote, dame unos segundos.",
		chatRouteNoGps: "El GPS no consigue fijarte con buena precisión. Acércate a una ventana o sal a cielo abierto y vuelve a pulsarme.",
		chatRouteDestFallback: "tu destino",
		chatRouteDone: "Ruta nueva hasta",
		chatRouteSeeMap: "La tienes pintada en el mapa.",
		chatRouteFail: "No he podido calcular esa ruta. Prueba con otro destino cercano.",
		chatRouteDestPlaceholder: "Ir desde mi ubicación actual hasta…",
		chatRouteNotFound: "No encuentro ese destino tal cual. Prueba con calle y número o con el nombre del sitio.",
		chatRouteChip: "¿Calculo tu ruta con sombra desde aquí?",
		chatRouteAskDest: "Dime el destino, vale cualquier lugar del mundo. Después uso tu ubicación para trazar la ruta. Si prefieres ver cómo funciona, pulsa «Ver un ejemplo».",
		chatExampleBtn: "Ver un ejemplo",
		chatExamplePrep: "Preparo un ejemplo con datos reales, un momento.",
		chatExampleMin: "minutos andando",
		chatExampleNoTime: "tiempo por estimar",
		chatExampleFrom: "Desde",
		chatExampleTo: "hasta",
		chatExampleFail: "No he podido dibujar el ejemplo. Inténtalo otra vez.",
		footerFamily: "Manolit∞ Forestal · Islas de Calor Sevilla · Manolit∞ Aire",
		orb_good: "bien",
		orb_mid: "regular",
		orb_bad: "malo",
		quick_pm25: "¿Qué es el PM2.5?",
		quick_color: "¿Por qué cambia el color?",
		quick_bebe: "¿Es seguro salir con mi bebé?",
		quick_q1: "¿En qué puedo ayudarte?",
		quick_a1: "Te informo de la calidad del aire en tiempo real, de si es buen momento para salir a hacer deporte, de la sombra de tu calle a cualquier hora y de rutas a pie con más fresco. También respondo a cualquier otra pregunta.",
		quick_q2: "¿Qué significan los colores del aire?",
		quick_a2: "Verde: aire bueno, sal sin problema. Naranja: moderado, ojo si eres sensible. Rojo o morado: aire malo, mejor esperar a que mejore.",
		quick_q3: "¿Puedo salir a hacer deporte hoy?",
		quick_a3: "Mira el color del mapa: si está verde o amarillo, adelante. Si está naranja y tienes asma o vas con peques, mejor suave; si está rojo, déjalo para otro momento.",
		quick_q4: "¿Cómo funcionan las sombras 3D?",
		quick_a4: "Calculamos la posición real del sol a cada minuto y proyectamos la sombra de cada edificio y árbol sobre el mapa. Lo que ves es la sombra que hay ahora mismo en la calle.",
		quick_q5: "¿Cómo busco una ruta con sombra?",
		quick_a5: "Escribe tu origen y tu destino en el buscador del mapa 3D y pulsa «Buscar ruta». Te trazamos el camino a pie aprovechando la sombra que haya a esa hora.",
		quick_q6: "¿Qué es la irradiación solar?",
		quick_a6: "Activa la capa «Irradiación Solar» y toca cualquier punto del mapa: verás cuánto sol recibe ese lugar según el histórico de la NASA, por año, mes, día y hora.",
		quick_q7: "¿Qué es el paseo virtual 3D?",
		quick_a7: "Es un paseo en primera persona por el mapa 3D: camina por las calles sin moverte del sofá y verás por dónde pega el sol y por dónde va la sombra.",
		region_peninsula: "Península",
		region_canarias: "Canarias",
		region_baleares: "Baleares",
		region_ceutamelilla: "Ceuta / Melilla",
		statusLoading: "Cargando datos en vivo…",
		legalNotice: "Aviso legal",
		backToMap: "← Volver al mapa",
		treesBtn: "Árboles",
		osmRefreshBtn: "↻ Act. mapa",
		osmRefreshTitle: "Baja los datos nuevos de OpenStreetMap (árboles y puntos) para esta zona",
		osmRefreshing: "Cargando…",
		osmRefreshed: "✓ Actualizado",
		osmRefreshError: "No se ha podido actualizar ahora mismo. Inténtalo en un minuto.",
		privacy: "Privacidad",
		cookies: "Cookies",
		// shadows-route.js
		searching: "Buscando…",
		searchBtn: "Buscar ruta",
		calculating: "Calculando ruta real por calles…",
		geocoding: "Geocodificando direcciones…",
		fillBoth: "Introduce origen y destino.",
		notFound: "No se ha encontrado",
		tryFormat: "Prueba a escribirla como calle, número, ciudad",
		clickOrigin: "Haz clic en el mapa para marcar el origen.",
		clickDestiny: "Origen marcado, haz clic en el destino.",
		chooseDestination: "elige el destino escribiéndolo arriba o con el botón Elegir en el mapa.",
		pointMap: "Punto marcado en el mapa",
		myLocation: "Mi ubicación",
		locationMarked: "Ubicación marcada como origen",
		locationPrecision: "precisión reportada por el navegador",
		locationNote: "sin GPS real puede ser orientativa",
		locationDenied: "No se ha podido obtener tu ubicación (¿has denegado el permiso?).",
		locationAsking: "Pidiendo permiso de ubicación…",
		errorGeolocation: "Este navegador no permite compartir tu ubicación.",
		errorSearch: "No he podido trazar la ruta. Prueba otra vez en un ratito.",
		routeReal: "Ruta",
		routeFallback: "No se pudo calcular la ruta por calles (servidor de rutas ocupado), mostrando línea directa.",
		routeEstimated: "tiempo estimado a paso normal",
		routeRecalcWeather: "Ha cambiado la nubosidad, recalculando la ruta más fresca…",
		skipToContent: "Saltar al contenido principal",
		accModeBtn: "♿ Modo accesible",
		layerGroup: "Capas del mapa",
		timePresets: "Preajustes de hora",
		timeSlider: "Hora del día",
		aqiTitle: "Calidad del aire en el punto de origen",
		chatDialogLabel: "Chat con Manolit",
		chatClose: "Cerrar chat",
		sunSummaryAbove: "Sol a",
		sunSummaryDeg: "grados de altura",
		sunSummaryAzimuth: "azimut",
		sunSummaryBelow: "De noche: el sol está bajo el horizonte.",
		stepsTitle: "Indicaciones paso a paso",
		stepsListen: "Escuchar indicaciones",
		stepsStop: "Detener lectura",
		stepDepart: "Sal por {calle} hacia el {dir}, {metros} metros",
		stepContinue: "Sigue por {calle} durante {metros} metros",
		stepTurnLeft: "Gira a la izquierda en {calle} y sigue {metros} metros",
		stepTurnRight: "Gira a la derecha en {calle} y sigue {metros} metros",
		stepSlightLeft: "Gira levemente a la izquierda en {calle} y sigue {metros} metros",
		stepSlightRight: "Gira levemente a la derecha en {calle} y sigue {metros} metros",
		stepUturn: "Da la vuelta y toma {calle}, {metros} metros",
		stepRoundabout: "En la rotonda, toma la salida hacia {calle} y sigue {metros} metros",
		stepArrive: "Has llegado a tu destino.",
		stepUnnamed: "calle sin nombre",
		shadeShade: "tramo en sombra",
		shadeSun: "tramo al sol",
		shadeMixed: "tramo con sol y sombra",
		shadeTip: "Consejo: es un tramo largo al sol, ve despacio, camina por el lado con edificios y lleva agua.",
		dirN: "norte",
		dirNE: "noreste",
		dirE: "este",
		dirSE: "sureste",
		dirS: "sur",
		dirSW: "suroeste",
		dirW: "oeste",
		dirNW: "noroeste",
		walkGuidanceStart: "¡Vamos allá! Te voy cantando cada paso, tú camina tranquilo.",
		minWalk: "min a pie",
		sunPosition: "Posición solar",
		sunBelow: "El sol está bajo el horizonte a esa hora, no hay sombras que proyectar.",
		goldenHour: "Hora dorada",
		blueHour: "Hora azul",
		now: "Ahora",
		simulating: "Simulando",
		summerSolstice: "Solsticio de verano",
		winterSolstice: "Solsticio de invierno",
		btnSummer: "Verano",
		btnWinter: "Invierno",
		pickMap: "Elegir en el mapa",
		captureView: "Capturar vista",
		captureError: "No se ha podido generar la imagen (limitación del servidor de mapas). Prueba a hacer una captura de pantalla normal.",
		origin: "Origen",
		destiny: "Destino",
		noResults: "Sin resultados",
		aqiGood: "Buena",
		aqiModerate: "Moderada",
		aqiBad: "Mala",
		aqiNoData: "Sin datos",
		layerBuildings: "Edificios 3D",
		layerShadows: "Sombras",
		layerClouds: "Nubes",
		layerRoute: "Ruta",
		walkModeStart: "Iniciar caminata",
		walkModeStop: "Detener caminata",
		walkModeTracking: "Siguiendo tu posición…",
		darkMapOn: "Mapa oscuro",
		darkMapOff: "Mapa claro",
		routeMapTitle: "Ruta y sombras 3D",
		aguaVivoLabel: "Anuncios gastando agua a nivel mundial:",
		aguaVivoCalc: "300.000M de impresiones al día × ~1 MB × 0,06 kWh/GB × 1,8 L/kWh ≈ 375 L/s",
		originPlaceholder: "Punto de origen",
		destinationPlaceholder: "Punto de destino",
		layerSun: "Posición del sol",
		resetBtn: "Reiniciar",
		// ============================================================
		// NUEVO v3: Sistema de rutas alternativas con evaluación de sombra
		// ============================================================
		evaluatingShadows: "Evaluando sombra en rutas alternativas…",
		inShadow: "en sombra",
		chosenMoreShadow: "elegida por más sombra",
		chosenShorter: "sombra similar, elegida la más corta",
		shadowStats: "Sombra en tu ruta",
		noShadowData: "Calculando…",
		shadowGreat: "¡Mira tú qué bien! Media ruta va por la sombrita",
		shadowGood: "Buena sombra en partes de la ruta",
		shadowSome: "Algo de sombra disponible",
		shadowNone: "Poca o ninguna sombra en esta ruta",
		of: "de",
		inShadowShort: "a la sombra",
		alternativesAvailable: "Hay rutas alternativas comparadas",
		// v4: claves que shadows-route.js pedía y no existían
		virtualWalkStart: "Paseo virtual 3D",
		virtualWalkStop: "Salir del paseo",
		virtualWalkHint: "Baja a la calle sin moverte del sofá: recorre la ruta como si la pisaras",
		virtualWalkUnsupported: "Tu navegador no soporta el paseo virtual 3D.",
		shadeCoverage: "Cobertura de sombra",
		airDataUnavailable: "Datos de aire no disponibles ahora mismo.",
		irrLayerBtn: "Irradiación solar",
		irrPanelTitle: "Histórico de irradiación",
		irrYear: "Año",
		irrMonth: "Mes",
		irrDay: "Día",
		irrHour: "Hora (UTC)",
		irrLoading: "Consultando NASA POWER…",
		irrAnnualLoading: "Cargando resumen del año…",
		irrNoData: "La NASA no tiene dato para esa fecha (¿futuro o demasiado reciente?).",
		irrError: "No se ha podido consultar la NASA ahora mismo. Reintenta en unos segundos.",
		irrDayOfMonth: "Día del mes: ",
		irrHourOfDay: "Hora del día: ",
		irrUmbra: "Umbra: sombra de edificio (protección total)",
		irrPenumbra: "Penumbra: sombra de árbol (luz filtrada ~50 %)",
		irrSol: "Sol directo: sin protección",
		irrExposureFactor: "Factor de exposición",
		irrEffectiveExposure: "Exposición efectiva aquí",
		irrAnnual: "Irradiación anual",
		irrBestDay: "Mejor día",
		irrWorstDay: "peor",
		irrPeakHours: "Horas de sol pico",
		irrRealDays: "días reales",
		irrQueryPoint: "Punto de consulta",
		syncLink: "Sincronizar / Exportar datos",
		syncHint: "Guarda tus ajustes en un archivo y recupéralos en otro dispositivo. Sin cuentas ni servidores.",
		syncExportBtn: "Exportar mis datos",
		syncImportBtn: "Importar datos",
		syncImportError: "Ese archivo no es una copia de Manolit∞ Aire. No se ha importado nada.",
		// FAQ (preguntas frecuentes)
		faqTitle: "Preguntas frecuentes",
		faqIntro: "Las que me hacéis de verdad, contestadas sin rodeos.",
		faqQ1: "¿Esto es gratis de verdad?",
		faqA1: "Sí. Y lo seguirá siendo. No hay registro, no hay truco y no hay una versión de pago escondida. Entras, miras el aire y te vas.",
		faqQ2: "¿Por qué no hay anuncios?",
		faqA2: "Porque los anuncios de hoy no son carteles. Son subastas que gastan agua y batería a tus espaldas cada vez que cargas una página. Aquí no entran. El proyecto se sostiene con el apoyo voluntario de la gente en Ko-fi.",
		faqQ3: "¿De dónde salen los datos del aire?",
		faqA3: "De las estaciones oficiales repartidas por España y de los modelos europeos de Copernicus, servidos por Open-Meteo. Datos públicos y científicos, nada inventado.",
		faqQ4: "¿Lo de las sombras es real?",
		faqA4: "Sí. Se calcula con los edificios de OpenStreetMap y la posición del sol en cada minuto. Si el mapa dice sombra, es que un edificio de verdad te la está dando.",
		faqQ5: "¿Me estáis espiando?",
		faqA5: "No. No hay rastreadores ni cookies de terceros. Tus ajustes se guardan en tu propio navegador y de ahí no salen.",
		faqQ6: "¿Hay app para el móvil?",
		faqA6: "No hace falta. La web funciona en el navegador de cualquier móvil sin instalar nada y sin ocupar memoria. Si la guardas en la pantalla de inicio, se abre como una app.",
		faqQ7: "¿Quién hace esto?",
		faqA7: "Una persona, Sandro, desde Sevilla. Sin empresa detrás y sin ánimo de lucro. Con datos abiertos y con la ayuda de quien apoya el proyecto.",
		faqQ8: "¿Puedo usarlo en mi ciudad?",
		faqA8: "Si está en España, sí. Las estaciones y los edificios cubren todo el país. Fuera de España el aire funciona en muchos sitios, pero las sombras dependen de lo bien mapeada que esté la zona en OpenStreetMap.",
		faqQ9: "¿Cómo puedo ayudar?",
		faqA9: "Usándolo y contándolo. Y si te apetece, apoyando en Ko-fi para pagar los servidores. También puedes mejorar el mapa de tu barrio en OpenStreetMap, que es gratis y ayuda a todo el mundo.",
		// El agua que no se ve (seccion + contadores). {n} es el numero de litros.
		aguaTitulo: "El agua que no se ve",
		aguaP1: "Esto ya no es una estimación: la telemetría real de los últimos 30 días dice ",
		aguaS1: "176.444 peticiones, 1,80 GB movidos y 4.819 visitas",
		aguaP2: ". O sea, ",
		aguaS2: "0,38 MB y unos 2 mililitros de agua por visita",
		aguaP3: ", medidos. Mientras tanto, la publicidad programática del mundo gasta ",
		aguaS3: "unos 375 litros cada segundo",
		aguaP4: " en subastas de anuncios que nadie pidió: al año, miles de piscinas olímpicas.",
		aguaLink: "Ver las cuentas completas, con los supuestos a la vista →",
		aguaVivoTpl: "Desde que entraste en Manolit∞, los anuncios del mundo llevan gastados {n} litros de agua. Tu visita aquí: ~2 ml, medidos.",
		// 28-sep-2026: marca SEO en el hero, enlace al generador del widget,
		// enlace al codigo abierto del pie y la encuesta de CO2 (js/co2.js).
		heroH1: "Manolito Aire. Rutas con sombra y calidad del aire en tiempo real",
		anadeLink: "Añade Manolit∞ a tu web",
		footerGithub: "Código abierto",
		co2Pregunta: "Si no hubieras usado esta ruta fresca a pie, ¿cómo habrías hecho el trayecto?",
		co2OpPie: "A pie (sin Manolito)",
		co2OpBici: "Bicicleta",
		co2OpCoche: "Coche",
		co2OpMoto: "Moto",
		co2OpAutobus: "Autobús",
		co2ResPie: "Andando habrías emitido lo mismo, 0 g de CO2. La diferencia es que con Manolito vas por la fresca.",
		co2ResBici: "En bici habrías emitido lo mismo, 0 g de CO2. La diferencia es la fresca del camino.",
		co2ResTpl: "Con esta ruta a pie has evitado emitir aproximadamente {c} de CO2 frente a ir {m}.",
		co2MedioCoche: "en coche",
		co2MedioMoto: "en moto",
		co2MedioAutobus: "en autobús",
		co2Nota: "Esta pregunta es solo para ti. Tu respuesta no se guarda ni sale de tu navegador.",
		// 01-oct-2026: ultimo tramo de la traduccion completa. Textos visibles
		// que aun estaban fijos en espanol (splash, capas, seccion OSM, footer,
		// cuantico, sello carbono...). Los bloques con HTML interno usan
		// data-i18n-html. ES reproduce el HTML estatico original tal cual.
		subBrand: "+ Sombras 3D",
		splashTagline: "Respira ∞ Camina ∞ Refúgiate ∞ Mapea ∞",
		accBtn: "♿ Modo accesible",
		capasBtn: "Capas",
		layerMicroclimate: "Microclima",
		microTag: "Estimado",
		groupContent: "Contenido del mapa",
		groupBase: "Mapa base",
		groupEntorno: "Entorno",
		groupSolSombra: "Sol y sombra",
		groupClimaAire: "Clima y aire",
		groupRecorrido: "Recorrido",
		groupBaseInfra: "Base e infraestructura",
		groupEntornoClima: "Entorno y clima",
		groupIluminacionSol: "Iluminación y sol",
		capasTriggerAria: "Capas del mapa",
		closeCapasAria: "Cerrar el panel de capas",
		gameIntroBtn: "Juega con Manolit∞",
		lidarBtn: "Renderizado LiDAR",
		colaboraTit: "¿No hay 3D en tu zona?",
		colaboraHint: "pulsa y te cuento cómo arreglarlo en 5 minutos ▾",
		osmIntro: "Manolit∞ dibuja los edificios y los árboles con los datos de <strong>OpenStreetMap (OSM)</strong>, el mapa libre que hacemos entre todos. Si tu calle sale vacía, <strong>puedes pintarla tú en 5 minutos</strong> y le haces sombra a todo el barrio:",
		osmPaso1: "Entra en <a href=\"https://www.openstreetmap.org\" rel=\"noopener\">openstreetmap.org</a>, crea una cuenta gratis y pulsa <strong>Editar</strong>.",
		osmPaso2: "<strong>Árboles:</strong><ul style=\"margin:4px 0 0;padding-left:1.2em;\"><li><em>Árbol suelto</em> → dibuja un <strong>punto</strong> y ponle la etiqueta <code>natural=tree</code>. Si sabes la especie, mejor: <code>species=Naranjo amargo</code> o <code>genus=Citrus</code> (también vale <code>wikipedia=es:Naranjo</code>). Así sale con su copa, su color y su fruta de verdad.</li><li><em>Calle con hilera de árboles</em> → dibuja <strong>una sola línea</strong> por la acera con <code>natural=tree_row</code>. No pongas árbol por árbol: Manolit∞ los coloca solos, uno cada ~9 m, siguiendo tu línea.</li></ul>",
		osmPaso3: "<strong>Edificios:</strong> dibuja el contorno y pon <code>building=yes</code>. Si sabes las plantas, añade <code>building:levels=4</code>. Con eso la sombra sale a la altura real y no “por defecto”.",
		osmPaso4: "Guarda los cambios… y listo.",
		osmCuando: "<strong>¿Cuándo sale en Manolit∞?</strong> No te preocupes: el mapa se actualiza solo <strong>cada semana</strong>, así que tu aporte aparece aunque no lo veas al momento. Y si pasa la semana y no sale, o te urge para algo, <a href=\"https://github.com/sandrow007/manolito-aire/issues\" rel=\"noopener\">escríbeme desde aquí</a> y te meto la actualización a mano. 🌳",
		uvLabel: "Índice UV",
		updatedPrefix: "Actualizado: ",
		updatedPlaceholder: "Actualizado: --",
		heroLoading: "Cargando el aire de tu ciudad…",
		heroMoment: "Un momento.",
		evolAire: "Evolución del aire",
		legendHist: "Últimas 48h (dato real)",
		legendFore: "Próximas 48h (pronóstico Copernicus/CAMS)",
		quantumBadge: "Manolit∞ Cuántico",
		quantumSub: "pronóstico simulado para los próximos 5 días, contado sin humo",
		quantumDisclaimer: "Esto NO es una predicción meteorológica oficial. Es una simulación matemática (formalismo cuántico simulado por software, sin hardware cuántico real) que calcula probabilidades a partir del pronóstico real de arriba. Para decisiones de salud, guíate por el dato del gráfico y por fuentes oficiales, no por este número.",
		footerFamiliaTxt: "Manolit∞ Aire forma parte de la familia de proyectos ciudadanos de Sandro: herramientas gratuitas, sin registro y sin publicidad.",
		footerEcoTxt: "Web frugal y sostenible, con números medidos: la telemetría real de 30 días da 0,38 MB y unos 2 mililitros de agua por visita, menos que una sola pregunta a una inteligencia artificial. Y sin publicidad ni subastas de anuncios: la publicidad programática del mundo gasta unos 375 litros de agua cada segundo; esta web entera, un sorbo por visita.",
		footerIgnTxt: "Capa base opcional «Mapa IGN»: cartografía © IGN / SCNE, CC BY 4.0 (scne.es)",
		donacionTxt: "Manolit∞ siempre sera gratis.<br>Los servidores, por desgracia, no lo son...",
		kofiBtn: "Apoyar en Ko‑fi",
		comparativaLink: "Comparativa",
		queEsLink: "Que es Manolit∞ ©",
		statusLoadedTpl: "Cargados {a}/{b} puntos en vivo.",
		svgCarbon1: "0,015 g CO₂ / visita · más limpio que el 99%",
		svgCarbon2: "102,7 KB · hosting 100% renovable",
		svgCarbon3: "Medido con Website Carbon Calculator (1ClickImpact) · 16/09/2026",
		pequeInit: "El aire está contento!",
		saludIcoSol: "sol",
		saludIcoSombra: "sombra",
		saludIcoSalud: "salud",
		saludIcoAgua: "agua",
		saludIcoTemp: "temp.",
		saludIcoPrev: "prevención",
		saludIcoGroup: "Iconos de salud ambiental: sol, sombra, salud, agua, temperatura y prevención",
		syncDoneTpl: "Sincronizado: {a} ajustes y {b} puntos. Recarga con Ctrl+Mayús+R para verlo todo aplicado.",
		syncImportError: "Ese archivo no es una copia válida de Manolit∞ Aire.",
		syncReadError: "No se pudo leer el archivo.",
		treesLoading: "Cargando árboles…",
		metaTitle: "Rutas con sombra y aire en tiempo real | Manolit∞ Aire",
		metaDesc: "Calcula rutas a pie por las calles con más sombra y consulta la calidad del aire en vivo y las horas de sol. Gratis, sin registro y sin publicidad.",
		// 01-oct-2026 (segunda pasada): claves que shadows-route.js pedia con
		// t() y no existian, por eso el panel de ruta salia mezclado en ingles.
		and: "y",
		camBrujula: "Brújula, volver al norte y nivelar la vista",
		camFull: "Pantalla completa",
		camPitchDown: "Mirar hacia abajo",
		camPitchUp: "Mirar hacia arriba",
		camZoomIn: "Acercar",
		camZoomOut: "Alejar",
		layerLoadError: "No se ha podido cargar la capa. Inténtalo de nuevo.",
		locationCalibrating: "Calibrando el GPS, unos segundos…",
		locationNotCalibrated: "El GPS no ha llegado a buena precisión (20 m o menos). Acércate a una ventana o sal a cielo abierto, o pulsa «Elegir en el mapa» para marcar el punto a mano.",
		locationUpdated: "Ubicación actualizada",
		syncData: "Sincronizar / Exportar datos",
		voiceGuide: "Guía por voz",
		winterModeOff: "Modo invierno desactivado: las rutas vuelven a buscar la sombra.",
		winterModeOn: "Modo invierno activado: la próxima ruta buscará el sol (los tramos en sombra pesan más).",
		winterSunRoute: "Modo invierno: ruta por el sol",
		camGroupLabel: "Zoom e inclinación del mapa",
		a11yOffRoute: "Atención, parece que te has alejado de la ruta guiada. Detente, orientate y, si lo necesitas, vuelve sobre tus pasos.",
		stepsHide: "Ocultar indicaciones",
		stepsShow: "Ver indicaciones",
		voiceGranted: "Voz activada. Manolit te acompaña.",
		voiceNo: "Ahora no",
		voicePermission: "¿Quieres que Manolit hable en voz alta? Puedes cambiarlo cuando quieras.",
		voiceYes: "Permitir voz",
		closeLbl: "Cerrar",
		osmBtnError: "✕ Error",
		mapButtonsToggle: "Mostrar u ocultar los botones del mapa",
		sunPanelToggle: "Mostrar u ocultar el panel de posición solar",
		ignMapTitle: "Cartografía del Instituto Geográfico Nacional (CC BY 4.0 scne.es)",
		catastroTitle: "Densidad de alturas oficial del Catastro de España (gratis, sin registro)",
		airChartLoadingData: "Cargando datos del aire…",
		airChartAriaLabel: "Gráfica del aire: línea continua pasado reciente, línea discontinua previsión",
		airChartNow: "ahora",
		airStatsTpl: "PM2.5 próximas 24 h: media {m} µg/m³ · pico {p} · mínimo {n}",
		airChartError: "No se pudo cargar el histórico ahora mismo (la API está saturada por las 500+ peticiones del mapa). Prueba a recargar en unos segundos.",
		airChartLoading: "Cargando histórico y pronóstico…",
		airGood: "aire bueno",
		airMid: "aire moderado",
		airBad: "aire malo",
		saludSaturdayTitle: "Manolit∞ Aire · Sábado de la Salud",
		saludSaturdaySub: "+ Sábado de la Salud",
		qProbGood: "probabilidad de aire bueno",
		qProbMid: "probabilidad de aire moderado",
		qProbBad: "probabilidad de aire malo",
		qDetailTpl: "{l}: {p} %. {d} en las próximas 24 h. PM2.5 medio previsto {m} µg/m³ (entre {a} y {b}).",
		sun: "Sol",
		moon: "Luna",
		moonNew: "luna nueva",
		moonWaxCres: "luna creciente",
		moonFirstQ: "cuarto creciente",
		moonWaxGib: "gibosa creciente",
		moonFull: "luna llena",
		moonWanGib: "gibosa menguante",
		moonLastQ: "cuarto menguante",
		moonWanCres: "luna menguante",
		askMe: "¡Pregúntame!",
		mapLayers: "Capas de mapa",
		familyZoneAria: "La familia Manolit y por qué existe esto",
		layerAirQuality: "Calidad del aire",
		airLayerLive: "Estimación en vivo · Open-Meteo",
		airLayerOffSpain: "Capa de aire apagada, fuera de España no tenemos fuente fiable.",
		saludBannerFinTpl: "El verde es temporal, el {f} la web vuelve a su piel de siempre.",
		escudosTitulo: "Escudos que nos cuidan",
		escudosPorque: "Cuatro observatorios públicos de salud ambiental, de tu tierra al planeta. Publican los datos y los umbrales de calor en los que se apoya esta web, y su trabajo nos protege a todos.",
	},
	ca: {
		saludBannerTexto: "En aquesta terra, cuidar el nostre entorn és cuidar el nostre cos.",
		saludBannerCta: "Descobreix per què defensem la salut ambiental i cada racó d'ombra.",
		saludKicker: "Cap de setmana de la salut",
		saludH2: "En defensa de les ombres: Salut Ambiental Urbana.",
		saludP1: "Cruzar de la vorera del sol a la de l'ombra en ple estiu andalús pot suposar deu graus de diferència al teu cos. Això no és una anècdota, és salut ambiental. L'asfalt i el formigó retenen la calor i transformen els nostres carrers en trampes tèrmiques que agredueixen l'organisme.",
		saludP2: "Ni tan sols Hèrcules, fundador mític de Sevilla, era invencible. Era un semidéu i, com a humà, tenia fragilitats físiques que havia de protegir abans de caure. Nosaltres no busquem solucions mèdiques tardanes; busquem prevenció ambiental. Cada arbre i cada ombra és medicina urbana que modifica el clima del carrer per protegir la nostra gent.",
		saludNota: "Avís del Manolit: Recorda que aquest simulador és una eina digital per ajudar-te a planificar, però no és 100% precís i les ombres reals del carrer poden variar. Per això la salut ambiental depèn també del teu sentit comú: en cas de dubte, cerca sempre el refugi fresc.",
		saludChat: "Per cert! Recorda que estem en el cap de setmana de la salut ambiental. L'entorn influeix en el teu cos: si surts al carrer, cerca la vorera de l'ombra i refresca't, que el carrer crema.",
		saludSolTit: "Quan el sol es converteix en un problema",
		saludSolTxt: "Entre les 12h i les 17h el sol no només escalfa, acumula radiació sobre l'asfalt, les façanes i el teu cos sense que te n'adonis. No es tracta d'evitar-lo, sinó de saber moure't per la ciutat en les hores en què treballa al teu favor i no en contra teva.",
		saludSombraTit: "L'ombra com a infraestructura",
		saludSombraTxt: "En una ciutat amb 40°C, passar de sol directe a ombra pot baixar la temperatura percebuda fins a 10°C en segons. No és comoditat, és protecció real. Els arbres, els porxos i els carrers estrets són recursos que existeixen i que es poden fer servir. Manolit∞ Aire t'ajuda a trobar-los.",
		saludCuerpoTit: "El teu cos davant de la calor urbana",
		saludCuerpoTxt: "La calor extrema no avisa igual a tothom. Els infants, la gent gran i qui treballa a l'aire lliure ho nota abans i pitjor. Conèixer com respon el teu entorn, la temperatura del teu barri, la brisa disponible, l'ombra propera, és la primera forma de cuidar-te sense necessitar res més que informació.",
		saludAguaTit: "Aigua: el que el cos no pot negociar",
		saludAguaTxt: "Amb calor el cos perd aigua més ràpid del que percebem. No esperis a tenir set. Beure abans, en petites quantitats i de forma constant durant les hores de més calor, és el que realment marca la diferència. L'accés a aigua fresca en espais públics també és salut.",
		saludTempTit: "No tots els carrers tenen la mateixa temperatura",
		saludTempTxt: "A dues illes de distància pot haver-hi una diferència de 5°C segons el tipus de sòl, la presència d'arbres o l'amplada del carrer. Les illes de calor no són un concepte abstracte, són el barri on vius. Entendre com es distribueix la calor al teu entorn canvia com et mous i quan.",
		saludPrevTit: "Preparar-se abans que arribi l'onada",
		saludPrevTxt: "Les onades de calor no són emergències imprevisibles, tenen un patró i s'anuncien. Conèixer els punts del teu barri on la calor es concentra, identificar refugis frescs propers i saber quins veïns necessiten més atenció en aquests dies és, senzillament, el més efectiu que existeix.",
		saludRecursos: "Recursos oficials",
		saludLinkSanidad: "Conselleria de Sanitat de la Junta",
		saludLinkResponde: "Consultes i gestió de cites (Salud Responde)",
		saludGamaRegional: "Gamma Regional (Andalusia)",
		saludGamaNacional: "Gamma Nacional (Espanya)",
		saludGamaEuropea: "Gamma Europea (UE)",
		saludGamaGlobal: "Gamma Global (ONU)",
		saludLinkOsman: "OSMAN - Observatori de Salut i Medi Ambient d'Andalusia",
		saludUsoOsman: "Ús: Referència autonòmica per a plans d'acció local davant del canvi climàtic.",
		saludLinkOscc: "OSCC - Observatori de Salut i Canvi Climàtic",
		saludUsoOscc: "Ús: Organisme del Ministeri de Sanitat encarregat dels llindars de risc per províncies i les alertes sanitàries per calor.",
		saludLinkEuropeo: "Observatori Europeu del Clima i la Salut",
		saludUsoEuropeo: "Ús: Portal de la Comissió Europea i l'AEMA per predir impactes en la salut i monitoritzar indicadors biometeorològics a Europa.",
		saludLinkClimahealth: "ClimaHealth",
		saludUsoClimahealth: "Ús: La plataforma de coneixement global compartida per l'OMS i l'OMM per a la resiliència en salut pública.",
		saludP3: "Per això existeix aquest web. Perquè sàpigues on és l'ombra ara mateix i perquè cuidis les que queden. Les ciutats que abracen les seves zones verdes i els seus carrers frescos cuiden la seva gent.",
		saludCierre: "L'ombra és medicina urbana, i és gratis.",
		tagline: "L'aire i l'ombra del teu carrer, en viu",
		modesLabel: "Com vols que t'ho expliqui?",
		mode_ciudadano_title: "Ciutadà",
		mode_ciudadano_sub: "Clar i directe",
		mode_cientifico_title: "Científic",
		mode_cientifico_sub: "Amb les dades",
		mode_yayo_title: "Àvia / Avi",
		mode_yayo_sub: "Lletra gran, sense pressa",
		mode_peque_title: "Petit (5 anys)",
		mode_peque_sub: "Amb dibuixos",
		imLost: "No ho entenc, explica-m'ho",
		mapTitle: "L'aire d'Espanya, ara mateix",
		legendGood: "Bona",
		legendMid: "Moderada",
		legendBad: "Dolenta",
		legendNote: "Els punts són estacions reals. El color entre ciutats és estimat, no mesurat.",
		aboutLink: "Per què existeix això?",
		chatOpen: "Pregunta-li a Manolit∞",
		chatTitle: "Manolit∞ t'ho explica",
		chatWelcome: "Sóc en Manolit∞. Pregunta el que necessitis.",
		chatPlaceholder: "Escriu la teva pregunta aquí...",
		chatSend: "Enviar",
		airLvlGood: "bo",
		airLvlFair: "acceptable",
		airLvlModerate: "moderat",
		airLvlPoor: "dolent",
		airLvlVeryPoor: "molt dolent",
		airLvlHazard: "perillós",
		chatAirUnavailable: "Qualitat de l'aire no disponible per a aquest país.",
		chatRouteStreets: "Passaràs per",
		chatRouteStreetsAir: "carrers on s'estima un nivell de contaminació",
		chatRouteAirOnly: "En aquesta ruta s'estima un nivell de contaminació",
		chatRouteMapLoading: "El mapa encara s'està carregant. Baixa fins a ell, deixa que acabi i torna a prémer-me.",
		chatRouteLocating: "Cercant la teva ubicació…",
		chatRouteNoGeo: "Aquest navegador no em deixa saber on ets. Escriu l'origen a mà al panell de rutes i t'ho preparo.",
		chatRouteDenied: "Sense permís d'ubicació no puc sortir des d'on ets. Si canvies d'idea, activa'l al navegador i torna a prémer-me.",
		chatRouteBusy: "Ja t'estic cercant, dona'm uns segons.",
		chatRouteNoGps: "El GPS no aconsegueix fixar-te amb bona precisió. Acosta't a una finestra o surt a cel obert i torna a prémer-me.",
		chatRouteDestFallback: "la teva destinació",
		chatRouteDone: "Ruta nova fins a",
		chatRouteSeeMap: "La tens pintada al mapa.",
		chatRouteFail: "No he pogut calcular aquesta ruta. Prova amb una altra destinació propera.",
		chatRouteDestPlaceholder: "Des de la meva ubicació actual fins a…",
		chatRouteNotFound: "No trobo aquesta destinació tal qual. Prova amb carrer i número o amb el nom del lloc.",
		chatRouteChip: "Et calculo la ruta amb ombra des d'aquí?",
		chatRouteAskDest: "Digues-me la destinació, val qualsevol lloc del món. Després faig servir la teva ubicació per traçar la ruta. Si prefereixes veure com funciona, prem «Veure un exemple».",
		chatExampleBtn: "Veure un exemple",
		chatExamplePrep: "Preparo un exemple amb dades reals, un moment.",
		chatExampleMin: "minuts caminant",
		chatExampleNoTime: "temps per estimar",
		chatExampleFrom: "Des de",
		chatExampleTo: "fins a",
		chatExampleFail: "No he pogut dibuixar l'exemple. Torna-ho a intentar.",
		footerFamily: "Manolit∞ Forestal · Illes de Calor Sevilla · Manolit∞ Aire",
		orb_good: "bé",
		orb_mid: "regular",
		orb_bad: "dolent",
		quick_pm25: "Què és el PM2.5?",
		quick_color: "Per què canvia el color?",
		quick_bebe: "És segur sortir amb el meu nadó?",
		quick_q1: "En què et puc ajudar?",
		quick_a1: "T'informo de la qualitat de l'aire en temps real, de si és bon moment per sortir a fer esport, de l'ombra del teu carrer a qualsevol hora i de rutes a peu més fresques. També responc a qualsevol altra pregunta.",
		quick_q2: "Què signifiquen els colors de l'aire?",
		quick_a2: "Verd: aire bo, surt sense problema. Taronja: moderat, ull si ets sensible. Vermell o morat: aire dolent, millor esperar que millori.",
		quick_q3: "Puc sortir a fer esport avui?",
		quick_a3: "Mira el color del mapa: si és verd o groc, endavant. Si és taronja i tens asma o vas amb petits, vés suaument; si és vermell, deixa-ho per a un altre moment.",
		quick_q4: "Com funcionen les ombres 3D?",
		quick_a4: "Calculem la posició real del sol a cada minut i projectem l'ombra de cada edifici i arbre sobre el mapa. El que veus és l'ombra que hi ha ara mateix al carrer.",
		quick_q5: "Com busco una ruta amb ombra?",
		quick_a5: "Escriu el teu origen i destí al cercador del mapa 3D i prem «Cerca ruta». Et tracem el camí a peu aprofitant l'ombra que hi hagi a aquella hora.",
		quick_q6: "Què és la irradiació solar?",
		quick_a6: "Activa la capa «Irradiació solar» i toca qualsevol punt del mapa: veuràs quant sol rep aquell lloc segons l'històric de la NASA, per any, mes, dia i hora.",
		quick_q7: "Què és el passeig virtual 3D?",
		quick_a7: "És un passeig en primera persona pel mapa 3D: camina pels carrers sense moure't del sofà i veuràs per on pega el sol i per on va l'ombra.",
		region_peninsula: "Península",
		region_canarias: "Canàries",
		region_baleares: "Balears",
		region_ceutamelilla: "Ceuta / Melilla",
		statusLoading: "Carregant dades en directe…",
		legalNotice: "Avís legal",
		backToMap: "← Torna al mapa",
		treesBtn: "Arbres",
		osmRefreshBtn: "↻ Act. mapa",
		osmRefreshTitle: "Baixa les dades noves d'OpenStreetMap (arbres i punts) per a aquesta zona",
		osmRefreshing: "Carregant…",
		osmRefreshed: "✓ Actualitzat",
		osmRefreshError: "No s'ha pogut actualitzar ara mateix. Torna-ho a provar en un minut.",
		privacy: "Privacitat",
		cookies: "Cookies",
		searching: "Buscant…",
		searchBtn: "Buscar ruta",
		calculating: "Calculant ruta real pels carrers…",
		geocoding: "Geocodificant adreces…",
		fillBoth: "Introdueix origen i destí.",
		notFound: "No s'ha trobat",
		tryFormat: "Prova d'escriure-la com carrer, número, ciutat",
		clickOrigin: "Fes clic al mapa per marcar l'origen.",
		clickDestiny: "Origen marcat, fes clic al destí.",
		chooseDestination: "tria el destí escrivint-lo a dalt o amb el botó Triar al mapa.",
		pointMap: "Punt marcat al mapa",
		myLocation: "La meva ubicació",
		locationMarked: "Ubicació marcada com a origen",
		locationPrecision: "precisió reportada pel navegador",
		locationNote: "sense GPS real pot ser orientativa",
		locationDenied: "No s'ha pogut obtenir la teva ubicació (has denegat el permís?).",
		locationAsking: "Demanant permís d'ubicació…",
		errorGeolocation: "Aquest navegador no permet compartir la teva ubicació.",
		errorSearch: "No he pogut traçar la ruta. Prova-ho de nou d'aquí una estoneta.",
		routeReal: "Ruta",
		routeFallback: "No s'ha pogut calcular la ruta pels carrers (servidor de rutes ocupat), mostrant línia directa.",
		routeEstimated: "temps estimat a pas normal",
		routeRecalcWeather: "Ha canviat la nuvolositat, recalculant la ruta més fresca…",
		skipToContent: "Salta al contingut principal",
		accModeBtn: "♿ Mode accessible",
		layerGroup: "Capes del mapa",
		timePresets: "Preajustos d'hora",
		timeSlider: "Hora del dia",
		aqiTitle: "Qualitat de l'aire al punt d'origen",
		chatDialogLabel: "Xat amb en Manolit",
		chatClose: "Tanca el xat",
		sunSummaryAbove: "Sol a",
		sunSummaryDeg: "graus d'altitud",
		sunSummaryAzimuth: "azimut",
		sunSummaryBelow: "De nit: el sol està sota l'horitzó.",
		stepsTitle: "Indicacions pas a pas",
		stepsListen: "Escolta les indicacions",
		stepsStop: "Atura la lectura",
		stepDepart: "Surt per {calle} cap al {dir}, {metros} metres",
		stepContinue: "Continua per {calle} durant {metros} metres",
		stepTurnLeft: "Gira a l'esquerra a {calle} i segueix {metros} metres",
		stepTurnRight: "Gira a la dreta a {calle} i segueix {metros} metres",
		stepSlightLeft: "Gira suaument a l'esquerra a {calle} i segueix {metros} metres",
		stepSlightRight: "Gira suaument a la dreta a {calle} i segueix {metros} metres",
		stepUturn: "Fes mitja volta i pren {calle}, {metros} metres",
		stepRoundabout: "A la rotonda, pren la sortida cap a {calle} i segueix {metros} metres",
		stepArrive: "Has arribat a la teva destinació.",
		stepUnnamed: "carrer sense nom",
		shadeShade: "tram a l'ombra",
		shadeSun: "tram al sol",
		shadeMixed: "tram amb sol i ombra",
		shadeTip: "Consell: és un tram llarg al sol, ves a poc a poc, camina pel costat amb edificis i porta aigua.",
		dirN: "nord",
		dirNE: "nord-est",
		dirE: "est",
		dirSE: "sud-est",
		dirS: "sud",
		dirSW: "sud-oest",
		dirW: "oest",
		dirNW: "nord-oest",
		walkGuidanceStart: "Som-hi! T'aniri cantant cada pas, tu camina tranquil.",
		minWalk: "min a peu",
		sunPosition: "Posició solar",
		sunBelow: "El sol està sota l'horitzó a aquesta hora, no hi ha ombres que projectar.",
		goldenHour: "Hora daurada",
		blueHour: "Hora blava",
		now: "Ara",
		simulating: "Simulant",
		summerSolstice: "Solstici d'estiu",
		winterSolstice: "Solstici d'hivern",
		btnSummer: "Estiu",
		btnWinter: "Hivern",
		pickMap: "Triar al mapa",
		captureView: "Capturar vista",
		captureError: "No s'ha pogut generar la imatge (limitació del servidor de mapes). Prova de fer una captura de pantalla normal.",
		origin: "Origen",
		destiny: "Destí",
		noResults: "Sense resultats",
		aqiGood: "Bona",
		aqiModerate: "Moderada",
		aqiBad: "Dolenta",
		aqiNoData: "Sense dades",
		layerBuildings: "Edificis 3D",
		layerShadows: "Ombres",
		layerClouds: "Núvols",
		layerRoute: "Ruta",
		walkModeStart: "Iniciar caminada",
		walkModeStop: "Aturar caminada",
		walkModeTracking: "Seguint la teva posició…",
		darkMapOn: "Mapa fosc",
		darkMapOff: "Mapa clar",
		routeMapTitle: "Ruta i ombres 3D",
		aguaVivoLabel: "Anuncis gastant aigua arreu del món:",
		aguaVivoCalc: "300.000M d'impressions al dia × ~1 MB × 0,06 kWh/GB × 1,8 L/kWh ≈ 375 L/s",
		originPlaceholder: "Punt d'origen",
		destinationPlaceholder: "Punt de destí",
		layerSun: "Posició del sol",
		resetBtn: "Reiniciar",
		// ============================================================
		// NUEVO v3: Sistema de rutas alternativas amb avaluació d'ombra
		// ============================================================
		evaluatingShadows: "Avaluant ombra en rutes alternatives…",
		inShadow: "en ombra",
		chosenMoreShadow: "triada per més ombra",
		chosenShorter: "ombra similar, triada la més curta",
		shadowStats: "Ombra a la teva ruta",
		noShadowData: "Calculant…",
		shadowGreat: "I tant que sí! Mitja ruta va per l'ombreta",
		shadowGood: "Bona ombra en parts de la ruta",
		shadowSome: "Una mica d'ombra disponible",
		shadowNone: "Poca o cap ombra en aquesta ruta",
		of: "de",
		inShadowShort: "a l'ombra",
		alternativesAvailable: "Hi ha rutes alternatives comparades",
		virtualWalkStart: "Passeig virtual 3D",
		virtualWalkStop: "Surt del passeig",
		virtualWalkHint: "Baixa al carrer sense moure't del sofà: recorre la ruta com si la trepitgessis",
		virtualWalkUnsupported: "El teu navegador no suporta el passeig virtual 3D.",
		shadeCoverage: "Cobertura d'ombra",
		airDataUnavailable: "Dades de l'aire no disponibles ara mateix.",
		irrLayerBtn: "Irradiació solar",
		irrPanelTitle: "Històric d'irradiació",
		irrYear: "Any",
		irrMonth: "Mes",
		irrDay: "Dia",
		irrHour: "Hora (UTC)",
		irrLoading: "Consultant NASA POWER…",
		irrAnnualLoading: "Carregant resum de l'any…",
		irrNoData: "La NASA no té dada per a eixa data (futur o massa recent?).",
		irrError: "No s'ha pogut consultar la NASA ara mateix. Torna-ho a provar en uns segons.",
		irrDayOfMonth: "Dia del mes: ",
		irrHourOfDay: "Hora del dia: ",
		irrUmbra: "Umbra: ombra d'edifici (protecció total)",
		irrPenumbra: "Penumbra: ombra d'arbre (llum filtrada ~50 %)",
		irrSol: "Sol directe: sense protecció",
		irrExposureFactor: "Factor d'exposició",
		irrEffectiveExposure: "Exposició efectiva ací",
		irrAnnual: "Irradiació anual",
		irrBestDay: "Millor dia",
		irrWorstDay: "pitjor",
		irrPeakHours: "Hores de sol pic",
		irrRealDays: "dies reals",
		irrQueryPoint: "Punt de consulta",
		syncLink: "Sincronitzar / Exportar dades",
		syncHint: "Desa els ajustos en un fitxer i recupera'ls en un altre dispositiu. Sense comptes ni servidors.",
		syncExportBtn: "Exportar les meves dades",
		syncImportBtn: "Importar dades",
		syncImportError: "Aquest fitxer no és una còpia de Manolit∞ Aire. No s'hi ha importat res.",
		// FAQ (preguntas frecuentes)
		faqTitle: "Preguntes freqüents",
		faqIntro: "Les que em feu de veritat, contestades sense voltes.",
		faqQ1: "Això és gratis de veritat?",
		faqA1: "Sí. I ho seguirà sent. No hi ha registre, no hi ha truc i no hi ha una versió de pagament amagada. Hi entres, mires l'aire i te'n vas.",
		faqQ2: "Per què no hi ha anuncis?",
		faqA2: "Perquè els anuncis d'avui no són cartells. Són subhastes que gasten aigua i bateria a les teves esquenes cada cop que carregues una pàgina. Aquí no hi entren. El projecte es sosté amb el suport voluntari de la gent a Ko-fi.",
		faqQ3: "D'on surten les dades de l'aire?",
		faqA3: "De les estacions oficials repartides per Espanya i dels models europeus de Copernicus, servits per Open-Meteo. Dades públiques i científiques, res d'inventat.",
		faqQ4: "Això de les ombres és real?",
		faqA4: "Sí. Es calcula amb els edificis d'OpenStreetMap i la posició del sol a cada minut. Si el mapa diu ombra, és que un edifici de veritat te l'està donant.",
		faqQ5: "M'esteu espiant?",
		faqA5: "No. No hi ha rastrejadors ni galetes de tercers. Els teus ajustos es guarden al teu propi navegador i d'aquí no en surten.",
		faqQ6: "Hi ha app per al mòbil?",
		faqA6: "No cal. El web funciona al navegador de qualsevol mòbil sense instal·lar res i sense ocupar memòria. Si el deses a la pantalla d'inici, s'obre com una app.",
		faqQ7: "Qui fa això?",
		faqA7: "Una persona, en Sandro, des de Sevilla. Sense empresa darrere i sense ànim de lucre. Amb dades obertes i amb l'ajuda de qui dóna suport al projecte.",
		faqQ8: "Ho puc fer servir a la meva ciutat?",
		faqA8: "Si és a Espanya, sí. Les estacions i els edificis cobreixen tot el país. Fora d'Espanya l'aire funciona en molts llocs, però les ombres depenen de com estigui de ben mapada la zona a OpenStreetMap.",
		faqQ9: "Com puc ajudar?",
		faqA9: "Fent-lo servir i explicant-ho. I si et ve de gust, donant suport a Ko-fi per pagar els servidors. També pots millorar el mapa del teu barri a OpenStreetMap, que és gratis i ajuda tothom.",
		// L'aigua que no es veu (seccio + comptadors). {n} es el nombre de litres.
		aguaTitulo: "L'aigua que no es veu",
		aguaP1: "Això ja no és una estimació. La telemetria real dels últims 30 dies diu ",
		aguaS1: "176.444 peticions, 1,80 GB moguts i 4.819 visites",
		aguaP2: ". O sigui, ",
		aguaS2: "0,38 MB i uns 2 mil·lilitres d'aigua per visita",
		aguaP3: ", mesurats. Mentrestant, la publicitat programàtica del món gasta ",
		aguaS3: "uns 375 litres cada segon",
		aguaP4: " en subhastes d'anuncis que ningú no va demanar. A l'any, milers de piscines olímpiques.",
		aguaLink: "Veure els comptes complets, amb els supòsits a la vista →",
		aguaVivoTpl: "Des que has entrat a Manolit∞, els anuncis del món porten gastats {n} litres d'aigua. La teva visita aquí fa ~2 ml, mesurats.",
		heroH1: "Manolito Aire. Rutes amb ombra i qualitat de l'aire en temps real",
		anadeLink: "Afegeix Manolit∞ al teu web",
		footerGithub: "Codi obert",
		co2Pregunta: "Si no haguessis fet servir aquesta ruta fresca a peu, com hauries fet el trajecte?",
		co2OpPie: "A peu (sense Manolito)",
		co2OpBici: "Bicicleta",
		co2OpCoche: "Cotxe",
		co2OpMoto: "Moto",
		co2OpAutobus: "Autobús",
		co2ResPie: "A peu hauries emès el mateix, 0 g de CO2. La diferència és que amb Manolito vas per la fresca.",
		co2ResBici: "En bici hauries emès el mateix, 0 g de CO2. La diferència és la frescor del camí.",
		co2ResTpl: "Amb aquesta ruta a peu has evitat emetre aproximadament {c} de CO2 en lloc d'anar {m}.",
		co2MedioCoche: "en cotxe",
		co2MedioMoto: "en moto",
		co2MedioAutobus: "en autobús",
		co2Nota: "Aquesta pregunta és només per a tu. La teva resposta no es desa ni surt del teu navegador.",
		// 01-oct-2026: ultim tram de la traduccio completa (vegeu el bloc es).
		subBrand: "+ Ombres 3D",
		splashTagline: "Respira ∞ Camina ∞ Refugia't ∞ Mapeja ∞",
		accBtn: "♿ Mode accessible",
		capasBtn: "Capes",
		layerMicroclimate: "Microclima",
		microTag: "Estimat",
		groupContent: "Contingut del mapa",
		groupBase: "Mapa base",
		groupEntorno: "Entorn",
		groupSolSombra: "Sol i ombra",
		groupClimaAire: "Clima i aire",
		groupRecorrido: "Recorregut",
		groupBaseInfra: "Base i infraestructura",
		groupEntornoClima: "Entorn i clima",
		groupIluminacionSol: "Il·luminació i sol",
		capasTriggerAria: "Capes del mapa",
		closeCapasAria: "Tancar el panell de capes",
		gameIntroBtn: "Juga amb en Manolit∞",
		lidarBtn: "Renderitzat LiDAR",
		colaboraTit: "No hi ha 3D a la teva zona?",
		colaboraHint: "prem i t'explico com arreglar-ho en 5 minuts ▾",
		osmIntro: "Manolit∞ dibuixa els edificis i els arbres amb les dades d'<strong>OpenStreetMap (OSM)</strong>, el mapa lliure que fem entre tots. Si el teu carrer surt buit, <strong>el pots pintar tu en 5 minuts</strong> i li fas ombra a tot el barri:",
		osmPaso1: "Entra a <a href=\"https://www.openstreetmap.org\" rel=\"noopener\">openstreetmap.org</a>, crea't un compte gratis i prem <strong>Edita</strong>.",
		osmPaso2: "<strong>Arbres:</strong><ul style=\"margin:4px 0 0;padding-left:1.2em;\"><li><em>Arbre solt</em> → dibuixa un <strong>punt</strong> i posa-li l'etiqueta <code>natural=tree</code>. Si en saps l'espècie, millor: <code>species=Naranjo amargo</code> o <code>genus=Citrus</code> (també val <code>wikipedia=es:Naranjo</code>). Així surt amb la seva copa, el seu color i el seu fruit de veritat.</li><li><em>Carrer amb fila d'arbres</em> → dibuixa <strong>una sola línia</strong> per la vorera amb <code>natural=tree_row</code>. No posis arbre per arbre: Manolit∞ els col·loca sols, un cada ~9 m, seguint la teva línia.</li></ul>",
		osmPaso3: "<strong>Edificis:</strong> dibuixa el contorn i posa <code>building=yes</code>. Si en saps les plantes, afegeix <code>building:levels=4</code>. Així l'ombra surt a l'alçada real i no \"per defecte\".",
		osmPaso4: "Desa els canvis… i llestos.",
		osmCuando: "<strong>Quan surt a Manolit∞?</strong> No et preocupis: el mapa s'actualitza sol <strong>cada setmana</strong>, així que la teva aportació apareix encara que no la vegis a l'instant. I si passa la setmana i no surt, o et corre pressa, <a href=\"https://github.com/sandrow007/manolito-aire/issues\" rel=\"noopener\">escriu-me des d'aquí</a> i t'hi fico l'actualització a mà. 🌳",
		uvLabel: "Índex UV",
		updatedPrefix: "Actualitzat: ",
		updatedPlaceholder: "Actualitzat: --",
		heroLoading: "Carregant l'aire de la teva ciutat…",
		heroMoment: "Un moment.",
		evolAire: "Evolució de l'aire",
		legendHist: "Últimes 48h (dada real)",
		legendFore: "Pròximes 48h (pronòstic Copernicus/CAMS)",
		quantumBadge: "Manolit∞ Quàntic",
		quantumSub: "pronòstic simulat per als propers 5 dies, explicat sense fum",
		quantumDisclaimer: "Això NO és una predicció meteorològica oficial. És una simulació matemàtica (formalisme quàntic simulat per programari, sense maquinari quàntic real) que calcula probabilitats a partir del pronòstic real de dalt. Per a decisions de salut, guia't per la dada del gràfic i per fonts oficials, no per aquest número.",
		footerFamiliaTxt: "Manolit∞ Aire forma part de la família de projectes ciutadans d'en Sandro: eines gratuïtes, sense registre i sense publicitat.",
		footerEcoTxt: "Web frugal i sostenible, amb xifres mesurades: la telemetria real de 30 dies dona 0,38 MB i uns 2 mil·lilitres d'aigua per visita, menys que una sola pregunta a una intel·ligència artificial. I sense publicitat ni subhastes d'anuncis: la publicitat programàtica del món gasta uns 375 litres d'aigua cada segon; aquesta web sencera, un glop per visita.",
		footerIgnTxt: "Capa base opcional «Mapa IGN»: cartografia © IGN / SCNE, CC BY 4.0 (scne.es)",
		donacionTxt: "Manolit∞ sempre serà gratis.<br>Els servidors, per desgràcia, no ho són...",
		kofiBtn: "Donar suport a Ko‑fi",
		comparativaLink: "Comparativa",
		queEsLink: "Què és Manolit∞ ©",
		statusLoadedTpl: "Carregats {a}/{b} punts en directe.",
		svgCarbon1: "0,015 g CO₂ / visita · més neta que el 99%",
		svgCarbon2: "102,7 KB · allotjament 100% renovable",
		svgCarbon3: "Mesurat amb Website Carbon Calculator (1ClickImpact) · 16/09/2026",
		pequeInit: "L'aire està content!",
		saludIcoSol: "sol",
		saludIcoSombra: "ombra",
		saludIcoSalud: "salut",
		saludIcoAgua: "aigua",
		saludIcoTemp: "temp.",
		saludIcoPrev: "prevenció",
		saludIcoGroup: "Icones de salut ambiental: sol, ombra, salut, aigua, temperatura i prevenció",
		syncDoneTpl: "Sincronitzat: {a} ajustos i {b} punts. Recarrega amb Ctrl+Maj+R per veure-ho tot aplicat.",
		syncImportError: "Aquest fitxer no és una còpia vàlida de Manolit∞ Aire.",
		syncReadError: "No s'ha pogut llegir el fitxer.",
		treesLoading: "Carregant arbres…",
		metaTitle: "Rutes amb ombra i aire en temps real | Manolit∞ Aire",
		metaDesc: "Calcula rutes a peu pels carrers amb més ombra i consulta la qualitat de l'aire en viu i les hores de sol. Gratis, sense registre i sense publicitat.",
		and: "i",
		camBrujula: "Brúixola, tornar al nord i nivellar la vista",
		camFull: "Pantalla completa",
		camPitchDown: "Mirar cap avall",
		camPitchUp: "Mirar cap amunt",
		camZoomIn: "Apropar",
		camZoomOut: "Allunyar",
		layerLoadError: "No s'ha pogut carregar la capa. Torna-ho a provar.",
		locationCalibrating: "Calibrant el GPS, uns segons…",
		locationNotCalibrated: "El GPS no ha arribat a bona precisió (20 m o menys). Acosta't a una finestra o surt a cel obert, o prem «Triar al mapa» per marcar el punt a mà.",
		locationUpdated: "Ubicació actualitzada",
		syncData: "Sincronitzar / Exportar dades",
		voiceGuide: "Guia per veu",
		winterModeOff: "Mode hivern desactivat: les rutes tornen a buscar l'ombra.",
		winterModeOn: "Mode hivern activat: la propera ruta buscarà el sol (els trams a l'ombra pesen més).",
		winterSunRoute: "Mode hivern: ruta pel sol",
		camGroupLabel: "Zoom i inclinació del mapa",
		a11yOffRoute: "Atenció, sembla que t'has allunyat de la ruta guiada. Atura't, orienta't i, si cal, torna sobre els teus passos.",
		stepsHide: "Amagar indicacions",
		stepsShow: "Veure indicacions",
		voiceGranted: "Veu activada. Manolit t'acompanya.",
		voiceNo: "Ara no",
		voicePermission: "Vols que Manolit parli en veu alta? Ho pots canviar quan vulguis.",
		voiceYes: "Permetre veu",
		closeLbl: "Tancar",
		osmBtnError: "✕ Error",
		mapButtonsToggle: "Mostrar o amagar els botons del mapa",
		sunPanelToggle: "Mostrar o amagar el panell de posició solar",
		ignMapTitle: "Cartografia de l'Institut Geogràfic Nacional (CC BY 4.0 scne.es)",
		catastroTitle: "Densitat d'alçades oficial del Cadastre d'Espanya (gratis, sense registre)",
		airChartLoadingData: "Carregant dades de l'aire…",
		airChartAriaLabel: "Gràfica de l'aire: línia contínua passat recent, línia discontinua previsió",
		airChartNow: "ara",
		airStatsTpl: "PM2.5 properes 24 h: mitjana {m} µg/m³ · pic {p} · mínim {n}",
		airChartError: "No s'ha pogut carregar l'històric ara mateix (l'API està saturada per les 500+ peticions del mapa). Prova de recarregar en uns segons.",
		airChartLoading: "Carregant històric i pronòstic…",
		airGood: "aire bo",
		airMid: "aire moderat",
		airBad: "aire dolent",
		saludSaturdayTitle: "Manolit∞ Aire · Dissabte de la Salut",
		saludSaturdaySub: "+ Dissabte de la Salut",
		qProbGood: "probabilitat d'aire bo",
		qProbMid: "probabilitat d'aire moderat",
		qProbBad: "probabilitat d'aire dolent",
		qDetailTpl: "{l}: {p} %. {d} en les properes 24 h. PM2.5 mitjà previst {m} µg/m³ (entre {a} i {b}).",
		sun: "Sol",
		moon: "Lluna",
		moonNew: "lluna nova",
		moonWaxCres: "lluna creixent",
		moonFirstQ: "quart creixent",
		moonWaxGib: "gibosa creixent",
		moonFull: "lluna plena",
		moonWanGib: "gibosa minvant",
		moonLastQ: "quart minvant",
		moonWanCres: "lluna minvant",
		askMe: "Pregunta'm!",
		mapLayers: "Capes de mapa",
		familyZoneAria: "La família Manolit i per què existeix això",
		layerAirQuality: "Qualitat de l'aire",
		airLayerLive: "Estimació en viu · Open-Meteo",
		airLayerOffSpain: "Capa d'aire apagada, fora d'Espanya no tenim font fiable.",
		saludBannerFinTpl: "El verd és temporal, el {f} el web torna a la seva pell de sempre.",
		escudosTitulo: "Escuts que ens cuiden",
		escudosPorque: "Quatre observatoris públics de salut ambiental, de la teva terra al planeta. Publiquen les dades i els llindars de calor en què es recolza aquest web, i la seva feina ens protegeix a tots.",
	},
	eu: {
		saludBannerTexto: "Lur honetan, gure ingurumena zaintzea gure gorputza zaintzea da.",
		saludBannerCta: "Ezagutu zergatik defendatzen dugun ingurumen-osasuna eta itzal txoko bakoitza.",
		saludKicker: "Osasun asteburua",
		saludH2: "Itzalen defentsa: Hiriko Ingurumen-Osasuna.",
		saludP1: "Uda erdialdeko andaluziar garaian eguzki-zabalditik itzal-zabaldira igarotzeak hamar graduko aldea suposa dezake zure gorputzean. Hori ez da anekdota bat, ingurumen-osasuna da. Asfaltoak eta hormigoiak beroa atxikitzen dute eta gure kaleak organismoari erasotzen dioten gai termiko bihurtzen dituzte.",
		saludP2: "Herkules bera ere, Sevillaren sortzaile mitikoa, ez zen garaitzezina. Erdijainkoa zen eta, gizaki gisa, babestu behar zituen ahultasun fisikoak zituen, erori aurretik. Gu ez gara beranduko irtenbide medikoen bila; ingurumen-prebentzioa bilatzen dugu. Zuhaitz eta itzal bakoitza hiri-medikuntza da, kaleko klima gure jendea babesteko aldatzen duena.",
		saludNota: "Manolit-en abisua: Gogoratu simuladore hau planifikatzen laguntzeko tresna digitala dela, baina ez dela %100 zehatza eta kaleko benetako itzalak alda daitezkeela. Horregatik, ingurumen-osasunak zure zentzu komunekoa ere behar du: zalantzan, bilatu beti aterpe freskoa.",
		saludChat: "Ahal bada! Gogoratu ingurumen-osasunaren asteburuan gaudela. Ingurumenak zure gorputzean eragiten du: kalera ateratzen bazara, bilatu itzal-zabaldea eta freskatu, kalea erretzen ari baita.",
		saludSolTit: "Noiz bihurtzen da eguzkia arazo",
		saludSolTxt: "12:00etatik 17:00etara eguzkiak ez du berotzen bakarrik, erradiazioa metatzen du asfaltoan, fatxadetan eta zure gorputzean, zuk konturatu gabe. Ez da saihestea, baizik eta hirian mugitzen jakitea zure alde lan egiten duen orduetan eta ez zure aurka.",
		saludSombraTit: "Itzala azpiegitura gisa",
		saludSombraTxt: "40°C-ko hiri batean, eguzki zuzenetik itzalera pasatzeak 10°C arte jaits dezake sentitzen den tenperatura segundoetan. Ez da erosotasuna, benetako babesa da. Zuhaitzak, ganbarak eta kale estuak existitzen dira eta erabil daitezke. Manolit∞ Airek aurkitzen laguntzen dizu.",
		saludCuerpoTit: "Zure gorputza hiri-beroaren aurrean",
		saludCuerpoTxt: "Bero muturrekoak ez du berdin abisatzen pertsona guztietan. Haurrek, adinekoek eta kanpoan lan egiten dutenek lehenago eta okerrago sentitzen dute. Zure inguruak nola erantzuten duen jakitea, zure auzoko tenperatura, haizea, itzal hurbila, zure burua zaintzeko lehen modua da, informazioa baino beste ezer gabe.",
		saludAguaTit: "Ura: gorputzak negoziatu ezin dezakeena",
		saludAguaTxt: "Beroarekin gorputzak ura galtzen du hartzen duguna baino azkarrago. Ez itxaron egarri izan arte. Aldiunetik edatea, kantitate txikitan eta etengabe eguneko ordu beroenetan, benetan aldea markatzen duena da. Ur freskoa espazio publikoetan ere osasuna da.",
		saludTempTit: "Kale guztiek ez dute tenperatura bera",
		saludTempTxt: "Bi etxamultzoko distantzian 5°C-ko aldea egon daiteke lurrazalaren motaren, zuhaitzen presentziaren edo kalearen zabaleraren arabera. Bero-uharteak ez dira kontzeptu abstraktua, zure auzoa dira. Beroa nola banatzen den ulertzeak aldatzen du nola mugitzen zaren eta noiz.",
		saludPrevTit: "Prestatu olatua heldu aurretik",
		saludPrevTxt: "Bero-olatuak ez dira aurreikus ezin daitezkeen larrialdiak, eredua dute eta iragartzen dira. Zure auzoko zein puntutan kontzentratzen den beroa jakitea, hurbil dauden aterpe freskoak identifikatzea eta zein auzokidek behar duten arreta handiena egun horietan da, sinpleki, existitzen den eraginkorrena.",
		saludRecursos: "Baliabide ofizialak",
		saludLinkSanidad: "Juntaren Osasun Kontseilaritza",
		saludLinkResponde: "Kontsultak eta hitzordu kudeaketa (Salud Responde)",
		saludGamaRegional: "Eskualde Maila (Andaluzia)",
		saludGamaNacional: "Maila Nazionala (Espainia)",
		saludGamaEuropea: "Europa Maila (EB)",
		saludGamaGlobal: "Mundu Maila (NBE)",
		saludLinkOsman: "OSMAN - Andaluziako Osasun eta Ingurumen Behatokia",
		saludUsoOsman: "Erabilera: erreferente autonomikoa klima aldaketaren aurkako tokiko ekintza planetarako.",
		saludLinkOscc: "OSCC - Osasun eta Klima Aldaketaren Behatokia",
		saludUsoOscc: "Erabilera: Osasun Ministerioaren organoa, probintzietako arrisku atalaseen eta beroaren osasun alerten arduraduna.",
		saludLinkEuropeo: "Klima eta Osasunaren Europako Behatokia",
		saludUsoEuropeo: "Erabilera: Europako Batzordearen eta AEMAren ataria, osasunean izango duten eraginak aurreikusteko eta Europan indize biometeorologikoak jarraitzeko.",
		saludLinkClimahealth: "ClimaHealth",
		saludUsoClimahealth: "Erabilera: OMSek eta OMMk partekatutako mundu mailako ezagutza plataforma, osasun publikoan erresilientzia lantzeko.",
		saludP3: "Horregatik existitzen da web hau. Oraintxe non dagoen itzala jakiteko eta geratzen direnak zaintzeko. Berdeguneak eta kale freskoak besarkatzen dituzten hiriek beren jendea zaintzen dute.",
		saludCierre: "Itzala hiri-medikuntza da, eta doakoa.",
		tagline: "Zure kaleko airea eta itzala, zuzenean",
		modesLabel: "Nola nahi duzu azaltzea?",
		mode_ciudadano_title: "Herritarra",
		mode_ciudadano_sub: "Argi eta zuzen",
		mode_cientifico_title: "Zientifikoa",
		mode_cientifico_sub: "Datuekin",
		mode_yayo_title: "Amona / Aitona",
		mode_yayo_sub: "Letra handia, lasai",
		mode_peque_title: "Txikia (5 urte)",
		mode_peque_sub: "Marrazkiekin",
		imLost: "Ez dut ulertzen, azaldu",
		mapTitle: "Espainiako airea, orain",
		legendGood: "Ona",
		legendMid: "Ertaina",
		legendBad: "Txarra",
		legendNote: "Puntuak benetako estazioak dira. Hirien arteko kolorea estimatua da, ez neurtua.",
		aboutLink: "Zergatik dago hau?",
		chatOpen: "Galdetu Manolitori",
		chatTitle: "Manolitok azalduko dizu",
		chatWelcome: "Manolit∞ naiz. Galdetu behar duzuna.",
		chatPlaceholder: "Idatzi zure galdera hemen...",
		chatSend: "Bidali",
		airLvlGood: "ona",
		airLvlFair: "onargarria",
		airLvlModerate: "moderatua",
		airLvlPoor: "txarra",
		airLvlVeryPoor: "oso txarra",
		airLvlHazard: "arriskutsua",
		chatAirUnavailable: "Airearen kalitatea ez dago eskuragarri herrialde honetarako.",
		chatRouteStreets: "Kale hauetatik pasatuko zara",
		chatRouteStreetsAir: "kutsadura maila estimatua den kaleetatik",
		chatRouteAirOnly: "Ibilbide honetan kutsadura maila estimatzen da",
		chatRouteMapLoading: "Mapa oraindik kargatzen ari da. Jaitsi berarengana, utzi amaitzen eta sakatu berriz.",
		chatRouteLocating: "Zure kokapena bilatzen…",
		chatRouteNoGeo: "Nabigatzaile honek ez du uzten zauden jakiten. Idatzi jatorria eskuz ibilbideen panelean eta prestatuko dizut.",
		chatRouteDenied: "Kokapen baimenik gabe ezin dut zauden lekutik abiatu. Ideia aldatzen baduzu, gaitu nabigatzailean eta sakatu berriz.",
		chatRouteBusy: "Dagoeneko bilatzen ari zaitut, eman segundo batzuk.",
		chatRouteNoGps: "GPSak ez du zuri finkatzen doitasun onarekin. Hurbildu leiho batera edo atera zabalera eta sakatu berriz.",
		chatRouteDestFallback: "zure helmuga",
		chatRouteDone: "Ibilbide berria hona",
		chatRouteSeeMap: "Mapan margotuta duzu.",
		chatRouteFail: "Ezin izan dut ibilbide hori kalkulatu. Saiatu beste helmuga hurbil batekin.",
		chatRouteDestPlaceholder: "Nire uneko kokapenetik hona…",
		chatRouteNotFound: "Ez dut helmuga hori horrela aurkitzen. Saiatu kalea eta zenbakiarekin edo lekuaren izenarekin.",
		chatRouteChip: "Ibilbidea itzalarekin kalkulatuko dizut hemendik?",
		chatRouteAskDest: "Esadazu helmuga, munduko edozein leku balio du. Ondoren zure kokapena erabiliko dut ibilbidea marrazteko. Nola funtzionatzen duen ikusi nahi baduzu, sakatu «Adibide bat ikusi».",
		chatExampleBtn: "Adibide bat ikusi",
		chatExamplePrep: "Benetako datuekin adibide bat prestatzen, itxaron pixka bat.",
		chatExampleMin: "minutu oinez",
		chatExampleNoTime: "denbora estimatu gabe",
		chatExampleFrom: "Hemendik",
		chatExampleTo: "hona",
		chatExampleFail: "Ezin izan dut adibidea marraztu. Saiatu berriz.",
		footerFamily: "Manolit∞ Forestal · Sevillako Bero Uharteak · Manolit∞ Aire",
		orb_good: "ondo",
		orb_mid: "erdi",
		orb_bad: "gaizki",
		quick_pm25: "Zer da PM2.5?",
		quick_color: "Zergatik aldatzen da kolorea?",
		quick_bebe: "Seguru al dago haurrarekin irtetea?",
		quick_q1: "Zertan lagun zaitzaket?",
		quick_a1: "Airearen kalitateaz denbora errealean informa zaitzaket, kirola egiteko unerik ona den, zure kaleko itzalaz edozein ordutan eta oinezko ibilbide freskoenaz. Edozein beste galdera ere erantzuten dut.",
		quick_q2: "Zer esan nahi dute airearen koloreek?",
		quick_a2: "Berdea: aire ona, atera arazorik gabe. Laranja: moderatua, kontuz sentikorra bazara. Gorria edo morea: aire txarra, hobe itxaron hobetu arte.",
		quick_q3: "Kirola egin dezaket kanpoan gaur?",
		quick_a3: "Begiratu maparen kolorea: berdea edo horia bada, aurrera. Laranja bada eta asma baduzu edo txikiekin zoaz, lasaiki; gorria bada, utzi beste une baterako.",
		quick_q4: "Nola funtzionatzen dute 3D itzalek?",
		quick_a4: "Eguzkiaren benetako posizioa minuturo kalkulatzen dugu eta eraikin eta zuhaitz bakoitzaren itzala mapan proiektatzen dugu. Ikusten duzuna kalean une honetan dagoen itzala da.",
		quick_q5: "Nola bilatzen dut itzalpeko ibilbide bat?",
		quick_a5: "Idatzi zure jatorria eta helmuga 3D mapako bilatzailean eta sakatu «Bilatu ibilbidea». Oinezko bidea marrazten dizugu, ordu horretako itzala aprobetxatuz.",
		quick_q6: "Zer da eguzki-irradiazioa?",
		quick_a6: "Aktibatu «Eguzki-irradiazioa» geruza eta ukitu mapako edozein puntu: NASAren historikoaren arabera zenbat eguzki jasotzen duen leku horrek ikusiko duzu, urtez, hilabetez, egunez eta orduz.",
		quick_q7: "Zer da 3D paseo birtuala?",
		quick_a7: "Lehen pertsonan egindako paseoa da 3D mapan zehar: ibili kaleetan sofa-tik mugitu gabe, eta ikusiko duzu non jotzen duen eguzkiak eta non doan itzala.",
		region_peninsula: "Penintsula",
		region_canarias: "Kanariar Uharteak",
		region_baleares: "Balear Uharteak",
		region_ceutamelilla: "Ceuta / Melilla",
		statusLoading: "Zuzeneko datuak kargatzen…",
		legalNotice: "Lege oharra",
		backToMap: "← Itzuli mapara",
		treesBtn: "Zuhaitzak",
		osmRefreshBtn: "↻ Egun. mapa",
		osmRefreshTitle: "Deskargatu OpenStreetMap-en datu berriak (zuhaitzak eta puntuak) eremu honetarako",
		osmRefreshing: "Kargatzen…",
		osmRefreshed: "✓ Eguneratuta",
		osmRefreshError: "Ezin izan da eguneratu orain. Saiatu minutu batean berriz.",
		privacy: "Pribatutasuna",
		cookies: "Cookieak",
		searching: "Bilatzen…",
		searchBtn: "Ibilbidea bilatu",
		calculating: "Kaleetako benetako ibilbidea kalkulatzen…",
		geocoding: "Helbideak geokodifikatzen…",
		fillBoth: "Sartu jatorria eta helmuga.",
		notFound: "Ez da aurkitu",
		tryFormat: "Saiatu kalea, zenbakia, hiria formatuan idazten",
		clickOrigin: "Egin klik mapan jatorria markatzeko.",
		clickDestiny: "Jatorria markatuta, egin klik helmugan.",
		chooseDestination: "aukeratu helmuga gorago idatziz edo Aukeratu mapan botoiarekin.",
		pointMap: "Mapan markatutako puntua",
		myLocation: "Nire kokapena",
		locationMarked: "Kokapena jatorri gisa markatuta",
		locationPrecision: "nabigatzaileak jakinarazitako zehaztasuna",
		locationNote: "benetako GPSik gabe orientagarria izan daiteke",
		locationDenied: "Ezin izan da zure kokapena lortu (baimena ukatu duzu?).",
		locationAsking: "Kokapen baimena eskatzen…",
		errorGeolocation: "Nabigatzaile honek ez du zure kokapena partekatzea onartzen.",
		errorSearch: "Ez dut ibilbidea marraztu ahal izan. Saiatu berriro tarte txiki bat barru.",
		routeReal: "Ibilbidea",
		routeFallback: "Ezin izan da kaleetako ibilbidea kalkulatu (zerbitzaria okupatuta), lerro zuzena erakusten.",
		routeEstimated: "denbora estimatua pausu normalean",
		routeRecalcWeather: "Hodeitza aldatu da, bide freskoena berriz kalkulatzen…",
		skipToContent: "Joan eduki nagusira",
		accModeBtn: "♿ Modu irisgarria",
		layerGroup: "Mapako geruzak",
		timePresets: "Ordu-aurrezarpenak",
		timeSlider: "Eguneko ordua",
		aqiTitle: "Airearen kalitatea jatorri puntuan",
		chatDialogLabel: "Txata Manolitekin",
		chatClose: "Itxi txata",
		sunSummaryAbove: "Eguzkia",
		sunSummaryDeg: "graduko altueran",
		sunSummaryAzimuth: "azimut",
		sunSummaryBelow: "Gauez: eguzkia horizontearen azpian dago.",
		stepsTitle: "Pausoz pausoko jarraibideak",
		stepsListen: "Entzun jarraibideak",
		stepsStop: "Gelditu irakurketa",
		stepDepart: "Atera {calle} kaletik {dir} aldera, {metros} metro",
		stepContinue: "Jarraitu {calle} kaletik {metros} metroz",
		stepTurnLeft: "Biratu ezkerrera {calle} kalean eta jarraitu {metros} metro",
		stepTurnRight: "Biratu eskuinera {calle} kalean eta jarraitu {metros} metro",
		stepSlightLeft: "Biratu pixka bat ezkerrera {calle} kalean eta jarraitu {metros} metro",
		stepSlightRight: "Biratu pixka bat eskuinera {calle} kalean eta jarraitu {metros} metro",
		stepUturn: "Eman buelta eta hartu {calle}, {metros} metro",
		stepRoundabout: "Biribilgunean, hartu {calle} alderako irteera eta jarraitu {metros} metro",
		stepArrive: "Helmugara iritsi zara.",
		stepUnnamed: "izengabeko kalea",
		shadeShade: "itzaleko zatia",
		shadeSun: "eguzkipeko zatia",
		shadeMixed: "eguzki eta itzal nahasiko zatia",
		shadeTip: "Aholkua: eguzkipeko zati luzea da, joan poliki, ibili eraikin dauden aldetik eta eraman ura.",
		dirN: "iparraldea",
		dirNE: "ipar-ekialdea",
		dirE: "ekialdea",
		dirSE: "hego-ekialdea",
		dirS: "hegoaldea",
		dirSW: "hego-mendebaldea",
		dirW: "mendebaldea",
		dirNW: "ipar-mendebaldea",
		walkGuidanceStart: "Goazen! Pauso bakoitza abesten joango dizut, zu lasai ibili.",
		minWalk: "min oinez",
		sunPosition: "Eguzkiaren posizioa",
		sunBelow: "Eguzkia horizontearen azpian dago ordu horretan, ez dago itzalik proiektatzeko.",
		goldenHour: "Urrezko ordua",
		blueHour: "Ordu urdina",
		now: "Orain",
		simulating: "Simulatzen",
		summerSolstice: "Udako solstizioa",
		winterSolstice: "Neguko solstizioa",
		btnSummer: "Uda",
		btnWinter: "Negua",
		pickMap: "Aukeratu mapan",
		captureView: "Ikuspegia atera",
		captureError: "Ezin izan da irudia sortu (mapa-zerbitzariaren muga). Probatu pantaila-argazki arrunt bat.",
		origin: "Jatorria",
		destiny: "Helmuga",
		noResults: "Emaitzarik gabe",
		aqiGood: "Ona",
		aqiModerate: "Ertaina",
		aqiBad: "Txarra",
		aqiNoData: "Daturik gabe",
		layerBuildings: "3D eraikinak",
		layerShadows: "Itzalak",
		layerClouds: "Hodeiak",
		layerRoute: "Ibilbidea",
		walkModeStart: "Oinez hasi",
		walkModeStop: "Oinez gelditu",
		walkModeTracking: "Zure kokapena jarraitzen…",
		darkMapOn: "Mapa iluna",
		darkMapOff: "Mapa argia",
		routeMapTitle: "Ibilbidea eta itzal 3D",
		aguaVivoLabel: "Iragarkiak ura gastatzen mundu osoan:",
		aguaVivoCalc: "Eguneko 300.000M inpresio × ~1 MB × 0,06 kWh/GB × 1,8 L/kWh ≈ 375 L/s",
		originPlaceholder: "Jatorri puntua",
		destinationPlaceholder: "Helmuga puntua",
		layerSun: "Eguzkiaren posizioa",
		resetBtn: "Berriz hasi",
		// ============================================================
		// NUEVO v3: Ibilbide alternatiboen sistema itzulpenarekin
		// ============================================================
		evaluatingShadows: "Ibilbide alternatiboetan itzala ebaluatzen…",
		inShadow: "itzalean",
		chosenMoreShadow: "itzal gehiago duelako aukeratua",
		chosenShorter: "itzal antzekoa, motzena aukeratua",
		shadowStats: "Itzala zure ibilbidean",
		noShadowData: "Kalkulatzen…",
		shadowGreat: "Aizu, ondo! Ibilbidearen erdia itzaltxotik doa",
		shadowGood: "Itzal ona ibilbidearen zatietan",
		shadowSome: "Itzal apur bat eskuragarri",
		shadowNone: "Itzal gutxi edo bat ere ez ibilbide honetan",
		of: "-",
		inShadowShort: "itzalean",
		alternativesAvailable: "Ibilbide alternatiboak daude konparatuta",
		virtualWalkStart: "Paseo birtuala 3D",
		virtualWalkStop: "Irten paseotik",
		virtualWalkHint: "Jaitsi kalera sofa mugitu gabe: ibilbidea zapaltzen ari zina bezala egin ezazu",
		virtualWalkUnsupported: "Zure nabigatzaileak ez du 3D paseo birtuala onartzen.",
		shadeCoverage: "Itzal-estaldura",
		airDataUnavailable: "Airearen datuak ez daude eskuragarri oraintxe.",
		irrLayerBtn: "Eguzki-irradiazioa",
		irrPanelTitle: "Irradiazio-historikoa",
		irrYear: "Urtea",
		irrMonth: "Hilabetea",
		irrDay: "Eguna",
		irrHour: "Ordua (UTC)",
		irrLoading: "NASA POWER kontsultatzen…",
		irrAnnualLoading: "Urteko laburpena kargatzen…",
		irrNoData: "NASAk ez du daturik data horretarako (etorkizuna edo berrieegia?).",
		irrError: "Ezin izan da NASA kontsultatu oraintxe. Saiatu berriz segundo batzuetan.",
		irrDayOfMonth: "Hilabetearen eguna: ",
		irrHourOfDay: "Eguneko ordua: ",
		irrUmbra: "Umbra: eraikinaren itzala (babes osoa)",
		irrPenumbra: "Penumbra: zuhaitzaren itzala (iragazitako argia ~%50)",
		irrSol: "Eguzki zuzena: babesik gabe",
		irrExposureFactor: "Esposizio-faktorea",
		irrEffectiveExposure: "Benetako esposizioa hemen",
		irrAnnual: "Urteko irradiazioa",
		irrBestDay: "Egun onena",
		irrWorstDay: "txarrena",
		irrPeakHours: "Eguzki-puntako orduak",
		irrRealDays: "egun erreala",
		irrQueryPoint: "Kontsulta-puntua",
		syncLink: "Sinkronizatu / Esportatu datuak",
		syncHint: "Gorde ezarpenak fitxategi batean eta berreskuratu itzazu beste gailu batean. Konturik eta zerbitzaririk gabe.",
		syncExportBtn: "Esportatu nire datuak",
		syncImportBtn: "Inportatu datuak",
		syncImportError: "Fitxategi hori ez da Manolit∞ Aire-ren kopia. Ez da ezer inportatu.",
		// FAQ (preguntas frecuentes)
		faqTitle: "Maiz egiten diren galderak",
		faqIntro: "Benetan egiten dizkidazuenak, ingurubariorik gabe erantzunda.",
		faqQ1: "Hau doakoa da benetan?",
		faqA1: "Bai. Eta horrela izango da. Ez dago erregistrorik, ez trikimailurik eta ez dago ordainpeko bertsio ezkuturik. Sartu, airea begiratu eta joan.",
		faqQ2: "Zergatik ez dago iragarkirik?",
		faqA2: "Gaur egungo iragarkiak ez dira kartelak. Ur eta bateria gastatzen duten enkanteak dira, orri bat kargatzen duzun bakoitzean, zuri ezkutuan. Hemen ez dira sartzen. Proiektua Ko-fin jendeak borondatez emandako babesarekin mantentzen da.",
		faqQ3: "Nondik ateratzen dira airearen datuak?",
		faqA3: "Espainian zehar banatutako estazio ofizialetatik eta Copernicusen europaar ereduetatik, Open-Meteok emanda. Datu publikoak eta zientifikoak, ezer asmatu gabe.",
		faqQ4: "Itzalak benetakoak dira?",
		faqA4: "Bai. OpenStreetMap-eko eraikinekin eta eguzkiaren posizioarekin kalkulatzen dira, minutuz minutu. Mapak itzala badio, benetako eraikin batek ematen dizu.",
		faqQ5: "Espiatzen ari zarete?",
		faqA5: "Ez. Ez dago jarraipen-elementurik, ez hirugarrenen cookie-rik. Zure ezarpenak zure nabigatzailean gordetzen dira, eta handik ez dira ateratzen.",
		faqQ6: "Ba al dago mugikorrerako aplikaziorik?",
		faqA6: "Ez da behar. Weba edozein mugikorretako nabigatzailean funtzionatzen du, ezer instalatu gabe eta memoria okupatu gabe. Hasiera-pantailan gordetzen baduzu, aplikazio bat bezala irekitzen da.",
		faqQ7: "Nork egiten du hau?",
		faqA7: "Pertsona batek, Sandrok, Sevillatik. Enpresarik atzean gabe eta irabazi-asmorik gabe. Datu irekiekin eta proiektua babesten duenaren laguntzarekin.",
		faqQ8: "Nire hirian erabil dezaket?",
		faqA8: "Espainian bada, bai. Estazioek eta eraikinek herrialde osoa estaltzen dute. Espainiatik kanpo airea toki askotan funtzionatzen du, baina itzalak OpenStreetMap-en zona zein ondo mapatuta dagoen araberakoak dira.",
		faqQ9: "Nola lagun dezaket?",
		faqA9: "Erabiliz eta kontatuz. Eta gogotik baduzu, Ko-fin babestuz, zerbitzariak ordaintzeko. Zure auzoko mapa ere hobetu dezakezu OpenStreetMap-en, doakoa da eta guztioi laguntzen digu.",
		// Ikusi ez den ura (atala + kontagailuak). {n} da litro-kopurua.
		aguaTitulo: "Ikusi ez den ura",
		aguaP1: "Hau ez da jada estimazio bat. Azken 30 egunetako benetako telemetriak dio ",
		aguaS1: "176.444 eskaera, 1,80 GB mugituta eta 4.819 bisita",
		aguaP2: ". Hau da, ",
		aguaS2: "0,38 MB eta 2 mililitro ur inguru bisitako",
		aguaP3: ", neurriak. Bitartean, munduko publizitate programatikoak gastatzen du ",
		aguaS3: "375 litro inguru segundoko",
		aguaP4: " inork eskatu gabeko iragarkien enkanteetan. Urtean, milaka igerilku olinpiko.",
		aguaLink: "Ikusi kontu osoak, suposizioak ikusgarri →",
		aguaVivoTpl: "Manolit∞-n sartu zinenetik, munduko iragarkiek {n} litro ur gastatu dituzte. Zure bisitak hemen ~2 ml, neurriak.",
		heroH1: "Manolito Aire. Itzalpeko ibilbideak eta airearen kalitatea denbora errealean",
		anadeLink: "Gehitu Manolit∞ zure webgunera",
		footerGithub: "Kode irekia",
		co2Pregunta: "Erabili ez izan bazenu ibilbide fresko hau oinez, nola egin zenukeen bidea?",
		co2OpPie: "Oinez (Manolitorik gabe)",
		co2OpBici: "Bizikleta",
		co2OpCoche: "Autoa",
		co2OpMoto: "Motoa",
		co2OpAutobus: "Autobusa",
		co2ResPie: "Oinez gauza bera isuri zenuke, 0 g CO2. Ezberdintasuna da Manolitorekin freskotik zoazela.",
		co2ResBici: "Bizikletan gauza bera isuri zenuke, 0 g CO2. Ezberdintasuna bidearen freskotasuna da.",
		co2ResTpl: "Oinezko ibilbide honekin {c} CO2 isurtzea ekidin duzu, {m} joan beharrean.",
		co2MedioCoche: "autoan",
		co2MedioMoto: "motoan",
		co2MedioAutobus: "autobusean",
		co2Nota: "Galdera hau zuretzat da soilik. Zure erantzuna ez da gordetzen, ez da zure nabigatzailetik ateratzen.",
		// 01-oct-2026: itzulpen osorako falta zen azken zatia (ikus es blokea).
		subBrand: "+ Itzalak 3D",
		splashTagline: "Arnasa ∞ Ibili ∞ Babestu ∞ Mapeatu ∞",
		accBtn: "♿ Modu irisgarria",
		capasBtn: "Geruzak",
		layerMicroclimate: "Mikroklima",
		microTag: "Zenbatetsia",
		groupContent: "Maparen edukia",
		groupBase: "Oinarrizko mapa",
		groupEntorno: "Ingurunea",
		groupSolSombra: "Eguzkia eta itzala",
		groupClimaAire: "Klima eta airea",
		groupRecorrido: "Ibilbidea",
		groupBaseInfra: "Oinarria eta azpiegitura",
		groupEntornoClima: "Ingurunea eta klima",
		groupIluminacionSol: "Argiztapena eta eguzkia",
		capasTriggerAria: "Maparen geruzak",
		closeCapasAria: "Itxi geruzen panela",
		gameIntroBtn: "Jolastu Manolit∞-rekin",
		lidarBtn: "LiDAR errendatzea",
		colaboraTit: "Ez dago 3Drik zure gunian?",
		colaboraHint: "sakatu eta 5 minututan nola konpondu esango dizut ▾",
		osmIntro: "Manolit∞-k eraikinak eta zuhaitzak marrazten ditu <strong>OpenStreetMap (OSM)</strong> datuekin, guztiok elkarrean egiten dugun mapa librea. Zure kalea hutsik ateratzen bada, <strong>zu zeuk margotu dezakezu 5 minututan</strong> eta auzo osoari itzala egingo diozu:",
		osmPaso1: "Sartu <a href=\"https://www.openstreetmap.org\" rel=\"noopener\">openstreetmap.org</a>-ean, sortu doako kontu bat eta sakatu <strong>Editatu</strong>.",
		osmPaso2: "<strong>Zuhaitzak:</strong><ul style=\"margin:4px 0 0;padding-left:1.2em;\"><li><em>Zuhaitz bakarra</em> → marraztu <strong>puntu</strong> bat eta jarri <code>natural=tree</code> etiketa. Espeziea badakizu, hobe: <code>species=Naranjo amargo</code> edo <code>genus=Citrus</code> (<code>wikipedia=es:Naranjo</code> ere balio du). Horrela bere kopa, kolore eta fruitu egiazkoarekin agertuko da.</li><li><em>Zuhaitz-lerroa duen kalea</em> → marraztu <strong>lerro bakar bat</strong> espaloitik <code>natural=tree_row</code>-rekin. Ez jarri zuhaitz banan-banaka: Manolit∞-k bere horretan jartzen ditu, 9 m-tik behin bat, zure lerroa jarraituz.</li></ul>",
		osmPaso3: "<strong>Eraikinak:</strong> marraztu ingurua eta jarri <code>building=yes</code>. Solairuak badakizkizu, gehitu <code>building:levels=4</code>. Horrela itzala benetako altueran ateratzen da, ez \"lehenetsita\".",
		osmPaso4: "Gorde aldaketak… eta prest.",
		osmCuando: "<strong>Noiz agertzen da Manolit∞-n?</strong> Ez kezkatu: mapa berez eguneratzen da <strong>astean behin</strong>, beraz zure ekarpena agertuko da berehala ikusi ez arren. Eta astea igaro eta ez bada agertzen, edo presa baduzu, <a href=\"https://github.com/sandrow007/manolito-aire/issues\" rel=\"noopener\">idatzi hemendik</a> eta eskuz sartuko dut eguneraketa. 🌳",
		uvLabel: "UV indizea",
		updatedPrefix: "Eguneratua: ",
		updatedPlaceholder: "Eguneratua: --",
		heroLoading: "Zure hiriko airea kargatzen…",
		heroMoment: "Itxaron pixka bat.",
		evolAire: "Airearen bilakaera",
		legendHist: "Azken 48 orduak (benetako datua)",
		legendFore: "Hurrengo 48 orduak (Copernicus/CAMS iragarpena)",
		quantumBadge: "Manolit∞ Kuantikoa",
		quantumSub: "hurrengo 5 egunetako iragarpen simulatua, ke gabe kontatuta",
		quantumDisclaimer: "Hau EZ da eguraldiaren iragarpen ofiziala. Simulazio matematikoa da (softwarez simulatutako formalismo kuantikoa, benetako hardware kuantikorik gabe), goiko benetako iragarpenetik probabilitateak kalkulatzen dituena. Osasun-erabakietarako, grafikoko datuari eta iturri ofizialei jarraitu, ez zenbaki honi.",
		footerFamiliaTxt: "Manolit∞ Aire Sandroren herritar-proiektuen familiakoa da: doako tresnak, erregistrorik eta publizitaterik gabe.",
		footerEcoTxt: "Web frugal eta jasangarria, neurketekin: 30 eguneko benetako telemetriak 0,38 MB eta 2 militiro ur inguru ematen ditu bisitako, adimen artifizial bati egindako galdera bakar bat baino gutxiago. Eta publizitaterik eta iragarki-enkanterik gabe: munduko publizitate programatikoak 375 litro ur inguru gastatzen ditu segundoko; web honek osoak, ur-thorta bat bisitako.",
		footerIgnTxt: "Aukerazko oinarri-geruza «IGN mapa»: kartografia © IGN / SCNE, CC BY 4.0 (scne.es)",
		donacionTxt: "Manolit∞ beti izango da dohainik.<br>Zerbitzariak, zoritxarrez, ez dira...",
		kofiBtn: "Ko-fi-n lagundu",
		comparativaLink: "Konparaketa",
		queEsLink: "Zer da Manolit∞ ©",
		statusLoadedTpl: "{a}/{b} puntu zuzenean kargatuta.",
		svgCarbon1: "0,015 g CO₂ / bisita · %99 baino garbiagoa",
		svgCarbon2: "102,7 KB · ostatapena %100 berriztagarria",
		svgCarbon3: "Website Carbon Calculatorrekin neurtua (1ClickImpact) · 16/09/2026",
		pequeInit: "Airea pozik dago!",
		saludIcoSol: "eguzkia",
		saludIcoSombra: "itzala",
		saludIcoSalud: "osasuna",
		saludIcoAgua: "ura",
		saludIcoTemp: "tenp.",
		saludIcoPrev: "prebentzioa",
		saludIcoGroup: "Ingurumen-osasuneko ikonoak: eguzkia, itzala, osasuna, ura, tenperatura eta prebentzioa",
		syncDoneTpl: "Sinkronizatuta: {a} ezarpen eta {b} puntu. Birkargatu Ctrl+Maius+R sakatuz dena aplikatuta ikusteko.",
		syncImportError: "Fitxategi hori ez da Manolit∞ Aire-ren kopia baliozkoa.",
		syncReadError: "Ezin izan da fitxategia irakurri.",
		treesLoading: "Zuhaitzak kargatzen…",
		metaTitle: "Itzaleko ibilbideak eta airea zuzenekoz | Manolit∞ Aire",
		metaDesc: "Kalkulatu oinezko ibilbideak itzal gehien duten kaletatik eta kontsultatu airearen kalitatea zuzenean eta eguzki-orduak. Doan, erregistrorik eta publizitaterik gabe.",
		and: "eta",
		camBrujula: "Konpasa, iparrera itzuli eta ikuspegia berdindu",
		camFull: "Pantaila osoa",
		camPitchDown: "Behera begiratu",
		camPitchUp: "Gora begiratu",
		camZoomIn: "Hurbildu",
		camZoomOut: "Urrundu",
		layerLoadError: "Ezin izan da geruza kargatu. Saiatu berriz.",
		locationCalibrating: "GPSa kalibratzen, segundo batzuk…",
		locationNotCalibrated: "GPSak ez du doitasun onik lortu (20 m edo gutxiago). Hurbildu leiho batera edo atera zabalera, edo sakatu «Aukeratu mapan» puntua eskuz markatzeko.",
		locationUpdated: "Kokapena eguneratuta",
		syncData: "Sinkronizatu / Esportatu datuak",
		voiceGuide: "Ahots-gida",
		winterModeOff: "Neguko modua desaktibatuta: ibilbideek berriro itzala bilatzen dute.",
		winterModeOn: "Neguko modua aktibatuta: hurrengo ibilbideak eguzkia bilatuko du (itzaleko zatiek gehiago pisatzen dute).",
		winterSunRoute: "Neguko modua: eguzkiko ibilbidea",
		camGroupLabel: "Maparen zooma eta inklinazioa",
		a11yOffRoute: "Adi, badirudi gidatutako ibilbidetik urrundu zarela. Gelditu, orientatu eta, behar baduzu, itzuli zure uratsetatik.",
		stepsHide: "Jarraibideak ezkutatu",
		stepsShow: "Jarraibideak ikusi",
		voiceGranted: "Ahotsa aktibatuta. Manolit zurekin doa.",
		voiceNo: "Orain ez",
		voicePermission: "Nahi duzu Manolit-ek ozenki hitz egitea? Nahi duzunean alda dezakezu.",
		voiceYes: "Ahotsa baimendu",
		closeLbl: "Itxi",
		osmBtnError: "✕ Errorea",
		mapButtonsToggle: "Maparen botoiak erakutsi edo ezkutatu",
		sunPanelToggle: "Eguzki-posizioaren panela erakutsi edo ezkutatu",
		ignMapTitle: "Instituto Geográfico Nacionalen kartografia (CC BY 4.0 scne.es)",
		catastroTitle: "Espainiako Katastroaren altuera-dentsitate ofiziala (doan, erregistrorik gabe)",
		airChartLoadingData: "Airearen datuak kargatzen…",
		airChartAriaLabel: "Airearen grafika: lerro jarraitua azken iraganekoa, eten-lerroa aurreikuspena",
		airChartNow: "orain",
		airStatsTpl: "PM2.5 hurrengo 24 orduak: batezbestekoa {m} µg/m³ · gailurra {p} · minimoa {n}",
		airChartError: "Ezin izan da historikoa kargatu orain (APIa saturatuta dago maparen 500+ eskaerengatik). Saiatu birkargatzen segundo batzuetan.",
		airChartLoading: "Historikoa eta aurreikuspena kargatzen…",
		airGood: "aire ona",
		airMid: "aire ertaina",
		airBad: "aire txarra",
		saludSaturdayTitle: "Manolit∞ Aire · Osasunaren Larunbata",
		saludSaturdaySub: "+ Osasunaren Larunbata",
		qProbGood: "aire onaren probabilitatea",
		qProbMid: "aire ertainaren probabilitatea",
		qProbBad: "aire txarraren probabilitatea",
		qDetailTpl: "{l}: {p} %. {d} hurrengo 24 orduetan. PM2.5 batezbesteko aurreikuspena {m} µg/m³ ({a} eta {b} artean).",
		sun: "Eguzkia",
		moon: "Ilargia",
		moonNew: "ilargi berria",
		moonWaxCres: "ilargi goranzkoa",
		moonFirstQ: "lehen laurdena",
		moonWaxGib: "gibosa goranzkoa",
		moonFull: "ilargi betea",
		moonWanGib: "gibosa beheranzkoa",
		moonLastQ: "azken laurdena",
		moonWanCres: "ilargi beheranzkoa",
		askMe: "Galdetu!",
		mapLayers: "Mapa-geruzak",
		familyZoneAria: "Manolit familia eta zergatik existitzen den",
		layerAirQuality: "Airearen kalitatea",
		airLayerLive: "Zuzeneko estimazioa · Open-Meteo",
		airLayerOffSpain: "Aire geruza itzalita, Espainiatik kanpo ez dugu iturri fidagarririk.",
		saludBannerFinTpl: "Berdea aldiberekoa da, {f} webguneak bere itxura ohikoa berreskuratzen du.",
		escudosTitulo: "Zaintzen gaituzten babeslekuak",
		escudosPorque: "Osasun ambientalaren lau behatoki publiko, zure herritik planetara. Webgune honek oinarri hartzen dituen datuak eta bero-atalaseak argitaratzen dituzte, eta haien lanak guztiok babesten gaitu.",
	},
	gl: {
		saludBannerTexto: "Nesta terra, coidar o noso contorno é coidar o noso corpo.",
		saludBannerCta: "Descobre por que defendemos a saúde ambiental e cada recuncho de sombra.",
		saludKicker: "Fin de semana da saúde",
		saludH2: "En defensa das sombras: Saúde Ambiental Urbana.",
		saludP1: "Cruzar da beirarrúa do sol á da sombra en pleno verán andaluz pode supoñer dez graos de diferenza no teu corpo. Iso non é unha anécdota, é saúde ambiental. O asfalto e o formigón retenden a calor e transforman as nosas rúas en trampas térmicas que agreden o organismo.",
		saludP2: "Nin sequera Hércules, fundador mítico de Sevilla, era invencible. Era un semideus e, como humano, tiña fragilidades físicas que debía protexer antes de caer. Nós non buscamos solucións médicas serodias; buscamos prevención ambiental. Cada árbore e cada sombra é medicina urbana que modifica o clima da rúa para protexer a nosa xente.",
		saludNota: "Aviso do Manolit∞: Lembra que este simulador é unha ferramenta dixital para axudarche a planificar, pero non é 100% preciso e as sombras reais da rúa poden variar. Por iso a saúde ambiental depende tamén do teu sentido común: ante a dúbida, busca sempre o refuxio fresco.",
		saludChat: "Por certo! Lembra que estamos na fin de semana da saúde ambiental. O contorno inflúe no teu corpo: se saes á rúa, busca a beirarrúa da sombra e refresca, que a rúa queima.",
		saludSolTit: "Cando o sol se converte nun problema",
		saludSolTxt: "Entre as 12h e as 17h o sol non só quenta, acumula radiación sobre o asfalto, as fachadas e o teu corpo sen que o notes. Non se trata de evitalo, senón de saber moverte pola cidade nas horas nas que traballa a teu favor e non na túa contra.",
		saludSombraTit: "A sombra como infraestrutura",
		saludSombraTxt: "Nunha cidade con 40°C, pasar de sol directo a sombra pode baixar a temperatura percibida ata 10°C en segundos. Non é comodidade, é protección real. As árbores, os soportais e as rúas estreitas son recursos que existen e que se poden usar. Manolit∞ Aire axúdache a atopalos.",
		saludCuerpoTit: "O teu corpo fronte á calor urbana",
		saludCuerpoTxt: "A calor extrema non avisa igual en todas as persoas. Os nenos, os maiores e quen traballa ao aire libre nótano antes e peor. Coñecer como responde o teu contorno, a temperatura do teu barrio, a brisa dispoñible, a sombra próxima, é a primeira forma de coidarte sen necesitar nada máis ca información.",
		saludAguaTit: "Auga: o que o corpo non pode negociar",
		saludAguaTxt: "Con calor o corpo perde auga máis rápido do que percibimos. Non agardes a ter sede. Beber antes, en pequenas cantidades e de forma constante durante as horas de maior calor, é o que realmente marca a diferenza. O acceso a auga fresca en espazos públicos tamén é saúde.",
		saludTempTit: "Non todas as rúas teñen a mesma temperatura",
		saludTempTxt: "A dúas mazás de distancia pode haber unha diferenza de 5°C segundo o tipo de chan, a presenza de árbores ou o ancho da rúa. As illas de calor non son un concepto abstracto, son o barrio onde vives. Entender como se distribúe a calor no teu contorno cambia como te moves e cando.",
		saludPrevTit: "Prepararse antes de que chegue a onda",
		saludPrevTxt: "As ondas de calor non son emerxencias imprevisibles, teñen un patrón e anúncianse. Coñecer os puntos do teu barrio onde a calor se concentra, identificar refuxios frescos próximos e saber que veciños necesitan máis atención neses días é, sinxelamente, o máis efectivo que existe.",
		saludRecursos: "Recursos oficiais",
		saludLinkSanidad: "Consellería de Sanidade da Xunta",
		saludLinkResponde: "Consultas e xestión de citas (Salud Responde)",
		saludGamaRegional: "Gama Rexional (Andalucía)",
		saludGamaNacional: "Gama Nacional (España)",
		saludGamaEuropea: "Gama Europea (UE)",
		saludGamaGlobal: "Gama Global (ONU)",
		saludLinkOsman: "OSMAN - Observatorio de Saúde e Medio Ambiente de Andalucía",
		saludUsoOsman: "Uso: Referencia autonómica para plans de acción local fronte ao cambio climático.",
		saludLinkOscc: "OSCC - Observatorio de Saúde e Cambio Climático",
		saludUsoOscc: "Uso: Ente do Ministerio de Sanidade encargado dos limiares de risco por provincias e das alertas sanitarias pola calor.",
		saludLinkEuropeo: "Observatorio Europeo do Clima e a Saúde",
		saludUsoEuropeo: "Uso: Portal da Comisión Europea e da AEMA para predicir impactos na saúde e monitorizar indicadores biometeorolóxicos en Europa.",
		saludLinkClimahealth: "ClimaHealth",
		saludUsoClimahealth: "Uso: A plataforma de coñecemento global compartida pola OMS e a OMM para a resiliencia en saúde pública.",
		saludP3: "Por iso existe esta web. Para que saibas onde está a sombra agora mesmo e para que cuides as que quedan. As cidades que abrazan as súas zonas verdes e as súas rúas frescas coidan á súa xente.",
		saludCierre: "A sombra é medicina urbana, e é de balde.",
		tagline: "O aire e a sombra da túa rúa, en vivo",
		modesLabel: "Como queres que cho conte?",
		mode_ciudadano_title: "Cidadán",
		mode_ciudadano_sub: "Claro e directo",
		mode_cientifico_title: "Científico",
		mode_cientifico_sub: "Cos datos",
		mode_yayo_title: "Avoa / Avó",
		mode_yayo_sub: "Letra grande, sen présa",
		mode_peque_title: "Peque (5 anos)",
		mode_peque_sub: "Con debuxos",
		imLost: "Non o entendo, explícamo",
		mapTitle: "O aire de España, agora mesmo",
		legendGood: "Boa",
		legendMid: "Moderada",
		legendBad: "Mala",
		legendNote: "Os puntos son estacións reais. A cor entre cidades é estimada, non medida.",
		aboutLink: "Por que existe isto?",
		chatOpen: "Pregúntalle a Manolit∞",
		chatTitle: "Manolit∞ cho explica",
		chatWelcome: "Son Manolit∞. Pregunta o que necesites.",
		chatPlaceholder: "Escribe a túa pregunta aquí...",
		chatSend: "Enviar",
		airLvlGood: "bo",
		airLvlFair: "aceptable",
		airLvlModerate: "moderado",
		airLvlPoor: "malo",
		airLvlVeryPoor: "moi malo",
		airLvlHazard: "perigoso",
		chatAirUnavailable: "Calidade do aire non dispoñible para este país.",
		chatRouteStreets: "Vas pasar por",
		chatRouteStreetsAir: "rúas onde se estima un nivel de contaminación",
		chatRouteAirOnly: "Nesta ruta estímase un nivel de contaminación",
		chatRouteMapLoading: "O mapa aínda se está cargando. Baixa ata el, deixa que remate e volve premerme.",
		chatRouteLocating: "Buscando a túa ubicación…",
		chatRouteNoGeo: "Este navegador non me deixa saber onde estás. Escribe a orixe á man no panel de rutas e prepárocho.",
		chatRouteDenied: "Sen permiso de ubicación non podo saír desde onde estás. Se cambias de idea, actívao no navegador e volve premerme.",
		chatRouteBusy: "Xa estou buscándote, dame uns segundos.",
		chatRouteNoGps: "O GPS non consegue fixarte con boa precisión. Achega a unha fiestra ou sae a ceo aberto e volve premerme.",
		chatRouteDestFallback: "o teu destino",
		chatRouteDone: "Ruta nova ata",
		chatRouteSeeMap: "Tíñas pintada no mapa.",
		chatRouteFail: "Non puiden calcular esa ruta. Proba con outro destino próximo.",
		chatRouteDestPlaceholder: "Desde a miña ubicación actual ata…",
		chatRouteNotFound: "Non atopo ese destino tal cal. Proba con rúa e número ou co nome do sitio.",
		chatRouteChip: "Cálculoche a ruta con sombra desde aquí?",
		chatRouteAskDest: "Dime o destino, vale calquera lugar do mundo. Despois uso a túa ubicación para trazar a ruta. Se prefires ver como funciona, preme «Ver un exemplo».",
		chatExampleBtn: "Ver un exemplo",
		chatExamplePrep: "Preparo un exemplo con datos reais, un momento.",
		chatExampleMin: "minutos andando",
		chatExampleNoTime: "tempo por estimar",
		chatExampleFrom: "Desde",
		chatExampleTo: "ata",
		chatExampleFail: "Non puiden debuxar o exemplo. Téntao outra vez.",
		footerFamily: "Manolit∞ Forestal · Illas de Calor Sevilla · Manolit∞ Aire",
		orb_good: "ben",
		orb_mid: "regular",
		orb_bad: "mal",
		quick_pm25: "Que é o PM2.5?",
		quick_color: "Por que cambia a cor?",
		quick_bebe: "É seguro saír co meu bebé?",
		quick_q1: "En que podo axudarte?",
		quick_a1: "Infórmote da calidade do aire en tempo real, de se é bo momento para saír a facer deporte, da sombra da túa rúa a calquera hora e de rutas a pé máis frescas. Tamén respondo a calquera outra pregunta.",
		quick_q2: "Que significan as cores do aire?",
		quick_a2: "Verde: aire bo, sae sen problema. Laranxa: moderado, ollo se es sensible. Vermello ou morado: aire malo, mellor agardar a que mellore.",
		quick_q3: "Podo saír a facer deporte hoxe?",
		quick_a3: "Mira a cor do mapa: se está verde ou amarela, adiante. Se está laranxa e tes asma ou vas con cativos, mellor suave; se está vermella, déixao para outro momento.",
		quick_q4: "Como funcionan as sombras 3D?",
		quick_a4: "Calculamos a posición real do sol cada minuto e proxectamos a sombra de cada edificio e árbore sobre o mapa. O que ves é a sombra que hai agora mesmo na rúa.",
		quick_q5: "Como busco unha ruta con sombra?",
		quick_a5: "Escribe a túa orixe e o teu destino no buscador do mapa 3D e preme «Buscar ruta». Trazámosche o camiño a pé aproveitando a sombra que haxa a esa hora.",
		quick_q6: "Que é a irradiación solar?",
		quick_a6: "Activa a capa «Irradiación solar» e toca calquera punto do mapa: verás canto sol recibe ese lugar segundo o histórico da NASA, por ano, mes, día e hora.",
		quick_q7: "Que é o paseo virtual 3D?",
		quick_a7: "É un paseo en primeira persoa polo mapa 3D: camiña polas rúas sen te moveres do sofá e verás por onde pega o sol e por onde vai a sombra.",
		region_peninsula: "Península",
		region_canarias: "Canarias",
		region_baleares: "Baleares",
		region_ceutamelilla: "Ceuta / Melilla",
		statusLoading: "Cargando datos en vivo…",
		legalNotice: "Aviso legal",
		backToMap: "← Volver ao mapa",
		treesBtn: "Árbores",
		osmRefreshBtn: "↻ Act. mapa",
		osmRefreshTitle: "Baixa os datos novos de OpenStreetMap (árbores e puntos) para esta zona",
		osmRefreshing: "Cargando…",
		osmRefreshed: "✓ Actualizado",
		osmRefreshError: "Non se puido actualizar agora. Téntao nun minuto.",
		backToMap: "← Volver al mapa",
		privacy: "Privacidade",
		cookies: "Cookies",
		searching: "Buscando…",
		searchBtn: "Buscar ruta",
		calculating: "Calculando ruta real polas rúas…",
		geocoding: "Xeocodificando enderezos…",
		fillBoth: "Introduce orixe e destino.",
		notFound: "Non se atopou",
		tryFormat: "Proba a escribila como rúa, número, cidade",
		clickOrigin: "Fai clic no mapa para marcar a orixe.",
		clickDestiny: "Orixe marcada, fai clic no destino.",
		chooseDestination: "elixe o destino escribíndoo arriba ou co botón Elixir no mapa.",
		pointMap: "Punto marcado no mapa",
		myLocation: "A miña ubicación",
		locationMarked: "Ubicación marcada como orixe",
		locationPrecision: "precisión reportada polo navegador",
		locationNote: "sen GPS real pode ser orientativa",
		locationDenied: "Non se puido obter a túa ubicación (denegaches o permiso?).",
		locationAsking: "Pedindo permiso de ubicación…",
		errorGeolocation: "Este navegador non permite compartir a túa ubicación.",
		errorSearch: "Non puiden trazar a ruta. Proba outra vez nun anaco.",
		routeReal: "Ruta",
		routeFallback: "Non se puido calcular a ruta polas rúas (servidor de rutas ocupado), mostrando liña directa.",
		routeEstimated: "tempo estimado a paso normal",
		routeRecalcWeather: "Cambiou a nubosidade, recalculando a ruta máis fresca…",
		skipToContent: "Saltar ao contido principal",
		accModeBtn: "♿ Modo accesible",
		layerGroup: "Capas do mapa",
		timePresets: "Presets de hora",
		timeSlider: "Hora do día",
		aqiTitle: "Calidade do aire no punto de orixe",
		chatDialogLabel: "Chat con Manolit",
		chatClose: "Pechar o chat",
		sunSummaryAbove: "Sol a",
		sunSummaryDeg: "graos de altura",
		sunSummaryAzimuth: "acimut",
		sunSummaryBelow: "De noite: o sol está baixo o horizonte.",
		stepsTitle: "Indicacións paso a paso",
		stepsListen: "Escoitar indicacións",
		stepsStop: "Deter a lectura",
		stepDepart: "Saí por {calle} cara ao {dir}, {metros} metros",
		stepContinue: "Segue por {calle} durante {metros} metros",
		stepTurnLeft: "Xira á esquerda en {calle} e segue {metros} metros",
		stepTurnRight: "Xira á dereita en {calle} e segue {metros} metros",
		stepSlightLeft: "Xira lixeiramente á esquerda en {calle} e segue {metros} metros",
		stepSlightRight: "Xira lixeiramente á dereita en {calle} e segue {metros} metros",
		stepUturn: "Dá a volta e colle {calle}, {metros} metros",
		stepRoundabout: "Na rotonda, colle a saída cara a {calle} e segue {metros} metros",
		stepArrive: "Chegaches ao teu destino.",
		stepUnnamed: "rúa sen nome",
		shadeShade: "tramo á sombra",
		shadeSun: "tramo ao sol",
		shadeMixed: "tramo con sol e sombra",
		shadeTip: "Consello: é un tramo longo ao sol, vai amodo, camiña polo lado con edificios e leva auga.",
		dirN: "norte",
		dirNE: "nordeste",
		dirE: "leste",
		dirSE: "sueste",
		dirS: "sur",
		dirSW: "suroeste",
		dirW: "oeste",
		dirNW: "noroeste",
		walkGuidanceStart: "Imos alá! Vouche cantando cada paso, ti camiña tranquilo.",
		minWalk: "min a pé",
		sunPosition: "Posición solar",
		sunBelow: "O sol está baixo o horizonte a esa hora, non hai sombras que proxectar.",
		goldenHour: "Hora dourada",
		blueHour: "Hora azul",
		now: "Agora",
		simulating: "Simulando",
		summerSolstice: "Solsticio de verán",
		winterSolstice: "Solsticio de inverno",
		btnSummer: "Verán",
		btnWinter: "Inverno",
		pickMap: "Elixir no mapa",
		captureView: "Capturar vista",
		captureError: "Non se puido xerar a imaxe (limitación do servidor de mapas). Proba a facer unha captura de pantalla normal.",
		origin: "Orixe",
		destiny: "Destino",
		noResults: "Sen resultados",
		aqiGood: "Boa",
		aqiModerate: "Moderada",
		aqiBad: "Mala",
		aqiNoData: "Sen datos",
		layerBuildings: "Edificios 3D",
		layerShadows: "Sombras",
		layerClouds: "Nubes",
		layerRoute: "Ruta",
		walkModeStart: "Iniciar camiñata",
		walkModeStop: "Deter camiñata",
		walkModeTracking: "Seguindo a túa posición…",
		darkMapOn: "Mapa escuro",
		darkMapOff: "Mapa claro",
		routeMapTitle: "Ruta e sombras 3D",
		aguaVivoLabel: "Anuncios gastando auga en todo o mundo:",
		aguaVivoCalc: "300.000M de impresións ao día × ~1 MB × 0,06 kWh/GB × 1,8 L/kWh ≈ 375 L/s",
		originPlaceholder: "Punto de orixe",
		destinationPlaceholder: "Punto de destino",
		layerSun: "Posición do sol",
		resetBtn: "Reiniciar",
		// ============================================================
		// NUEVO v3: Sistema de rutas alternativas con avaliación de sombra
		// ============================================================
		evaluatingShadows: "Avaliando sombra en rutas alternativas…",
		inShadow: "en sombra",
		chosenMoreShadow: "elixida por máis sombra",
		chosenShorter: "sombra similar, elixida a máis curta",
		shadowStats: "Sombra na túa ruta",
		noShadowData: "Calculando…",
		shadowGreat: "Mira ti que ben! Media ruta vai pola sombriña",
		shadowGood: "Boa sombra en partes da ruta",
		shadowSome: "Algo de sombra dispoñible",
		shadowNone: "Pouca ou ningunha sombra nesta ruta",
		of: "de",
		inShadowShort: "á sombra",
		alternativesAvailable: "Hai rutas alternativas comparadas",
		virtualWalkStart: "Paseo virtual 3D",
		virtualWalkStop: "Saír do paseo",
		virtualWalkHint: "Baixa á rúa sen te moveres do sofá: percorre a ruta coma se a pisaras",
		virtualWalkUnsupported: "O teu navegador non soporta o paseo virtual 3D.",
		shadeCoverage: "Cobertura de sombra",
		airDataUnavailable: "Datos do aire non dispoñibles agora mesmo.",
		irrLayerBtn: "Irradiación solar",
		irrPanelTitle: "Histórico de irradiación",
		irrYear: "Ano",
		irrMonth: "Mes",
		irrDay: "Día",
		irrHour: "Hora (UTC)",
		irrLoading: "Consultando NASA POWER…",
		irrAnnualLoading: "Cargando resumo do ano…",
		irrNoData: "A NASA non ten dato para esa data (futuro ou recente de máis?).",
		irrError: "Non se puido consultar a NASA agora mesmo. Téntao de novo nuns segundos.",
		irrDayOfMonth: "Día do mes: ",
		irrHourOfDay: "Hora do día: ",
		irrUmbra: "Umbra: sombra de edificio (protección total)",
		irrPenumbra: "Penumbra: sombra de árbore (luz filtrada ~50 %)",
		irrSol: "Sol directo: sen protección",
		irrExposureFactor: "Factor de exposición",
		irrEffectiveExposure: "Exposición efectiva aquí",
		irrAnnual: "Irradiación anual",
		irrBestDay: "Mellor día",
		irrWorstDay: "peor",
		irrPeakHours: "Horas de sol pico",
		irrRealDays: "días reais",
		irrQueryPoint: "Punto de consulta",
		syncLink: "Sincronizar / Exportar datos",
		syncHint: "Garda os axustes nun ficheiro e recupéraos noutro dispositivo. Sen contas nin servidores.",
		syncExportBtn: "Exportar os meus datos",
		syncImportBtn: "Importar datos",
		syncImportError: "Ese ficheiro non é unha copia de Manolit∞ Aire. Non se importou nada.",
		// FAQ (preguntas frecuentes)
		faqTitle: "Preguntas frecuentes",
		faqIntro: "As que me facedes de verdade, contestadas sen rodeos.",
		faqQ1: "Isto é de balde de verdade?",
		faqA1: "Si. E vai seguir selo. Non hai rexistro, non hai truco e non hai unha versión de pago agochada. Entras, miras o aire e véste.",
		faqQ2: "Por que non hai anuncios?",
		faqA2: "Porque os anuncios de hoxe non son carteis. Son poxas que gastan auga e batería ás túas costas cada vez que cargas unha páxina. Aquí non entran. O proxecto sostense co apoio voluntario da xente en Ko-fi.",
		faqQ3: "De onde saen os datos do aire?",
		faqA3: "Das estacións oficiais repartidas por España e dos modelos europeos de Copernicus, servidos por Open-Meteo. Datos públicos e científicos, nada inventado.",
		faqQ4: "O das sombras é real?",
		faqA4: "Si. Calcúlase cos edificios de OpenStreetMap e a posición do sol cada minuto. Se o mapa di sombra, é que un edificio de verdade che a está a dar.",
		faqQ5: "Estádeme espiando?",
		faqA5: "Non. Non hai rastrexadores nin cookies de terceiros. Os teus axustes gárdanse no teu propio navegador e de aí non saen.",
		faqQ6: "Hai app para o móbil?",
		faqA6: "Non fai falla. A web funciona no navegador de calquera móbil sen instalar nada e sen ocupar memoria. Se a gardas na pantalla de inicio, ábrese como unha app.",
		faqQ7: "Quen fai isto?",
		faqA7: "Unha persoa, Sandro, desde Sevilla. Sen empresa detrás e sen ánimo de lucro. Con datos abertos e coa axuda de quen apoia o proxecto.",
		faqQ8: "Podo usalo na miña cidade?",
		faqA8: "Se está en España, si. As estacións e os edificios cobren todo o país. Fóra de España o aire funciona en moitos sitios, pero as sombras dependen do ben mapeada que estea a zona en OpenStreetMap.",
		faqQ9: "Como podo axudar?",
		faqA9: "Usándoo e contándoo. E se che apetece, apoiando en Ko-fi para pagar os servidores. Tamén podes mellorar o mapa do teu barrio en OpenStreetMap, que é de balde e axuda a todo o mundo.",
		// A auga que non se ve (seccion + contadores). {n} e o numero de litros.
		aguaTitulo: "A auga que non se ve",
		aguaP1: "Isto xa non é unha estimación. A telemetría real dos últimos 30 días di ",
		aguaS1: "176.444 peticións, 1,80 GB movidos e 4.819 visitas",
		aguaP2: ". Sexa, ",
		aguaS2: "0,38 MB e uns 2 mililitros de auga por visita",
		aguaP3: ", medidos. Mentres tanto, a publicidade programática do mundo gasta ",
		aguaS3: "uns 375 litros cada segundo",
		aguaP4: " en poxas de anuncios que ninguén pediu. Ao ano, miles de piscinas olímpicas.",
		aguaLink: "Ver as contas completas, cos supostos á vista →",
		aguaVivoTpl: "Desde que entraches en Manolit∞, os anuncios do mundo levan gastados {n} litros de auga. A túa visita aquí ~2 ml, medidos.",
		heroH1: "Manolito Aire. Rutas con sombra e calidade do aire en tempo real",
		anadeLink: "Engade Manolit∞ á túa web",
		footerGithub: "Código aberto",
		co2Pregunta: "Se non usaras esta ruta fresca a pé, como terías feito o traxecto?",
		co2OpPie: "A pé (sen Manolito)",
		co2OpBici: "Bicicleta",
		co2OpCoche: "Coche",
		co2OpMoto: "Moto",
		co2OpAutobus: "Autobús",
		co2ResPie: "A pé emitirías o mesmo, 0 g de CO2. A diferenza é que con Manolito vas pola fresca.",
		co2ResBici: "En bici emitirías o mesmo, 0 g de CO2. A diferenza é a frescura do camiño.",
		co2ResTpl: "Con esta ruta a pé evitaches emitir aproximadamente {c} de CO2 fronte a ir {m}.",
		co2MedioCoche: "en coche",
		co2MedioMoto: "en moto",
		co2MedioAutobus: "en autobús",
		co2Nota: "Esta pregunta é só para ti. A túa resposta non se garda nin sae do teu navegador.",
		// 01-oct-2026: ultimo treito da traducion completa (vexase o bloque es).
		subBrand: "+ Sombras 3D",
		splashTagline: "Respira ∞ Camiña ∞ Refúxiate ∞ Mapea ∞",
		accBtn: "♿ Modo accesible",
		capasBtn: "Capas",
		layerMicroclimate: "Microclima",
		microTag: "Estimado",
		groupContent: "Contido do mapa",
		groupBase: "Mapa base",
		groupEntorno: "Contorno",
		groupSolSombra: "Sol e sombra",
		groupClimaAire: "Clima e aire",
		groupRecorrido: "Percorrido",
		groupBaseInfra: "Base e infraestrutura",
		groupEntornoClima: "Contorno e clima",
		groupIluminacionSol: "Iluminación e sol",
		capasTriggerAria: "Capas do mapa",
		closeCapasAria: "Pechar o panel de capas",
		gameIntroBtn: "Xoga con Manolit∞",
		lidarBtn: "Renderizado LiDAR",
		colaboraTit: "Non hai 3D na túa zona?",
		colaboraHint: "preme e contóxoche como arranxalo en 5 minutos ▾",
		osmIntro: "Manolit∞ debuxa os edificios e as árbores cos datos de <strong>OpenStreetMap (OSM)</strong>, o mapa libre que facemos entre todos. Se a túa rúa sae baleira, <strong>podes pintala ti en 5 minutos</strong> e fáische sombra a todo o barrio:",
		osmPaso1: "Entra en <a href=\"https://www.openstreetmap.org\" rel=\"noopener\">openstreetmap.org</a>, crea unha conta de balde e preme <strong>Editar</strong>.",
		osmPaso2: "<strong>Árbores:</strong><ul style=\"margin:4px 0 0;padding-left:1.2em;\"><li><em>Árbore solta</em> → debuxa un <strong>punto</strong> e ponlle a etiqueta <code>natural=tree</code>. Se sabes a especie, mellor: <code>species=Naranjo amargo</code> ou <code>genus=Citrus</code> (tamén vale <code>wikipedia=es:Naranjo</code>). Así sae coa súa copa, a súa cor e o seu froito de verdade.</li><li><em>Rúa con fila de árbores</em> → debuxa <strong>unha soa liña</strong> polo beirarrúa con <code>natural=tree_row</code>. Non poñas árbore por árbore: Manolit∞ colócaas soas, unha cada ~9 m, seguindo a túa liña.</li></ul>",
		osmPaso3: "<strong>Edificios:</strong> debuxa o contorno e pon <code>building=yes</code>. Se sabes as plantas, engade <code>building:levels=4</code>. Con iso a sombra sae á altura real e non \"por defecto\".",
		osmPaso4: "Garda os cambios… e listo.",
		osmCuando: "<strong>Cando sae en Manolit∞?</strong> Non te preocupes: o mapa actualízase só <strong>cada semana</strong>, así que o teu achego aparece aínda que non o vexas ao momento. E se pasa a semana e non sae, ou che urxe para algo, <a href=\"https://github.com/sandrow007/manolito-aire/issues\" rel=\"noopener\">escríbeme desde aquí</a> e métoche a actualización a man. 🌳",
		uvLabel: "Índice UV",
		updatedPrefix: "Actualizado: ",
		updatedPlaceholder: "Actualizado: --",
		heroLoading: "Cargando o aire da túa cidade…",
		heroMoment: "Un momento.",
		evolAire: "Evolución do aire",
		legendHist: "Últimas 48h (dato real)",
		legendFore: "Próximas 48h (prognóstico Copernicus/CAMS)",
		quantumBadge: "Manolit∞ Cuántico",
		quantumSub: "prognóstico simulado para os próximos 5 días, contado sen fume",
		quantumDisclaimer: "Isto NON é unha predición meteorolóxica oficial. É unha simulación matemática (formalismo cuántico simulado por software, sen hardware cuántico real) que calcula probabilidades a partir do prognóstico real de arriba. Para decisións de saúde, guíate polo dato da gráfica e por fontes oficiais, non por este número.",
		footerFamiliaTxt: "Manolit∞ Aire forma parte da familia de proxectos cidadáns de Sandro: ferramentas gratuitas, sen rexistro e sen publicidade.",
		footerEcoTxt: "Web frugal e sostible, con números medidos: a telemetría real de 30 días dá 0,38 MB e uns 2 mililitros de auga por visita, menos ca unha soa pregunta a unha intelixencia artificial. E sen publicidade nin poxas de anuncios: a publicidade programática do mundo gasta uns 375 litros de auga cada segundo; esta web enteira, un sorbo por visita.",
		footerIgnTxt: "Capa base opcional «Mapa IGN»: cartografía © IGN / SCNE, CC BY 4.0 (scne.es)",
		donacionTxt: "Manolit∞ sempre será de balde.<br>Os servidores, por desgraza, non o son...",
		kofiBtn: "Apoiar en Ko‑fi",
		comparativaLink: "Comparativa",
		queEsLink: "Que é Manolit∞ ©",
		statusLoadedTpl: "Cargados {a}/{b} puntos en vivo.",
		svgCarbon1: "0,015 g CO₂ / visita · máis limpa ca o 99%",
		svgCarbon2: "102,7 KB · aloxamento 100% renovable",
		svgCarbon3: "Medido con Website Carbon Calculator (1ClickImpact) · 16/09/2026",
		pequeInit: "O aire está contento!",
		saludIcoSol: "sol",
		saludIcoSombra: "sombra",
		saludIcoSalud: "saúde",
		saludIcoAgua: "auga",
		saludIcoTemp: "temp.",
		saludIcoPrev: "prevención",
		saludIcoGroup: "Iconas de saúde ambiental: sol, sombra, saúde, auga, temperatura e prevención",
		syncDoneTpl: "Sincronizado: {a} axustes e {b} puntos. Recarga con Ctrl+Maiús+R para velo todo aplicado.",
		syncImportError: "Ese ficheiro non é unha copia válida de Manolit∞ Aire.",
		syncReadError: "Non se puido ler o ficheiro.",
		treesLoading: "Cargando árbores…",
		metaTitle: "Rutas con sombra e aire en tempo real | Manolit∞ Aire",
		metaDesc: "Calcula rutas a pé polas rúas con máis sombra e consulta a calidade do aire en vivo e as horas de sol. De balde, sen rexistro e sen publicidade.",
		and: "e",
		camBrujula: "Compás, volver ao norte e nivelar a vista",
		camFull: "Pantalla completa",
		camPitchDown: "Ollar cara abaixo",
		camPitchUp: "Ollar cara arriba",
		camZoomIn: "Achegar",
		camZoomOut: "Afastar",
		layerLoadError: "Non se puido cargar a capa. Téntao de novo.",
		locationCalibrating: "Calibrando o GPS, uns segundos…",
		locationNotCalibrated: "O GPS non chegou a boa precisión (20 m ou menos). Achégate a unha fiestra ou sae a ceo aberto, ou preme «Elixir no mapa» para marcar o punto a man.",
		locationUpdated: "Ubicación actualizada",
		syncData: "Sincronizar / Exportar datos",
		voiceGuide: "Guía por voz",
		winterModeOff: "Modo inverno desactivado: as rutas volven buscar a sombra.",
		winterModeOn: "Modo inverno activado: a próxima ruta buscará o sol (os tramos en sombra pesan máis).",
		winterSunRoute: "Modo inverno: ruta polo sol",
		camGroupLabel: "Zoom e inclinación do mapa",
		a11yOffRoute: "Atención, parece que te afastaches da ruta guiada. Detente, oriéntate e, se o precisas, volta sobre os teus pasos.",
		stepsHide: "Agochar indicacións",
		stepsShow: "Ver indicacións",
		voiceGranted: "Voz activada. Manolit acompáñache.",
		voiceNo: "Agora non",
		voicePermission: "Queres que Manolit fale en voz alta? Podes cambialo cando queiras.",
		voiceYes: "Permitir voz",
		closeLbl: "Pechar",
		osmBtnError: "✕ Erro",
		mapButtonsToggle: "Mostrar ou agochar os botóns do mapa",
		sunPanelToggle: "Mostrar ou agochar o panel de posición solar",
		ignMapTitle: "Cartografía do Instituto Xeográfico Nacional (CC BY 4.0 scne.es)",
		catastroTitle: "Densidade de alturas oficial do Catastro de España (de balde, sen rexistro)",
		airChartLoadingData: "Cargando datos do aire…",
		airChartAriaLabel: "Gráfica do aire: liña continua pasado recente, liña descontinua previsión",
		airChartNow: "agora",
		airStatsTpl: "PM2.5 próximas 24 h: media {m} µg/m³ · pico {p} · mínimo {n}",
		airChartError: "Non se puido cargar o histórico agora mesmo (a API está saturada polas 500+ peticións do mapa). Proba a recargar nuns segundos.",
		airChartLoading: "Cargando histórico e prognóstico…",
		airGood: "aire bo",
		airMid: "aire moderado",
		airBad: "aire malo",
		saludSaturdayTitle: "Manolit∞ Aire · Sábado da Saúde",
		saludSaturdaySub: "+ Sábado da Saúde",
		qProbGood: "probabilidade de aire bo",
		qProbMid: "probabilidade de aire moderado",
		qProbBad: "probabilidade de aire malo",
		qDetailTpl: "{l}: {p} %. {d} nas próximas 24 h. PM2.5 medio previsto {m} µg/m³ (entre {a} e {b}).",
		sun: "Sol",
		moon: "Lúa",
		moonNew: "lúa nova",
		moonWaxCres: "lúa crecente",
		moonFirstQ: "cuarto crecente",
		moonWaxGib: "xibosa crecente",
		moonFull: "lúa chea",
		moonWanGib: "xibosa minguante",
		moonLastQ: "cuarto minguante",
		moonWanCres: "lúa minguante",
		askMe: "Pregúntame!",
		mapLayers: "Capas de mapa",
		familyZoneAria: "A familia Manolit e por que existe isto",
		layerAirQuality: "Calidade do aire",
		airLayerLive: "Estimación en vivo · Open-Meteo",
		airLayerOffSpain: "Capa de aire apagada, fóra de España non temos fonte fiable.",
		saludBannerFinTpl: "O verde é temporal, o {f} a web volve á súa pel de sempre.",
		escudosTitulo: "Escudos que nos coidan",
		escudosPorque: "Catro observatorios públicos de saúde ambiental, da túa terra ao planeta. Publican os datos e os limiares de calor nos que se apoia esta web, e o seu traballo protéxenos a todos.",
	},
	en: {
		saludBannerTexto: "In this land, caring for our surroundings is caring for our body.",
		saludBannerCta: "Find out why we defend environmental health and every patch of shade.",
		saludKicker: "Health weekend",
		saludH2: "In defence of shade: Urban Environmental Health.",
		saludP1: "Crossing from the sunny sidewalk to the shady one in the Andalusian summer can mean a ten-degree difference for your body. That is not an anecdote, it is environmental health. Asphalt and concrete trap the heat and turn our streets into thermal traps that assault the body.",
		saludP2: "Not even Hercules, the mythical founder of Seville, was invincible. He was a demigod and, being human, had physical frailties he had to protect before falling. We are not after late medical fixes; we want environmental prevention. Every tree and every shadow is urban medicine that changes the street climate to protect our people.",
		saludNota: "A note from Manolit∞: remember that this simulator is a digital tool to help you plan, but it is not 100% accurate and real street shade can vary. That is why environmental health also depends on your common sense: when in doubt, always find a cool shelter.",
		saludChat: "By the way! Remember we are in the environmental health weekend. Your surroundings affect your body: if you go out, stick to the shady sidewalk and cool down, because the street is burning.",
		saludSolTit: "When the sun becomes a problem",
		saludSolTxt: "Between 12pm and 5pm the sun does not just warm you up, it piles radiation onto the asphalt, the facades and your body without you noticing. It is not about avoiding it, but about knowing how to move through the city in the hours when it works for you and not against you.",
		saludSombraTit: "Shade as infrastructure",
		saludSombraTxt: "In a city at 40°C, stepping from direct sun into shade can drop the perceived temperature by up to 10°C in seconds. That is not comfort, it is real protection. Trees, porches and narrow streets are resources that already exist and can be used. Manolit∞ Aire helps you find them.",
		saludCuerpoTit: "Your body facing urban heat",
		saludCuerpoTxt: "Extreme heat does not warn everyone the same way. Children, older people and those who work outdoors feel it sooner and worse. Knowing how your surroundings respond, your neighbourhood temperature, the available breeze, the nearby shade, is the first way to look after yourself with nothing more than information.",
		saludAguaTit: "Water: what the body cannot negotiate",
		saludAguaTxt: "In the heat the body loses water faster than we notice. Do not wait until you are thirsty. Drinking early, in small amounts and steadily during the hottest hours, is what really makes the difference. Access to fresh water in public spaces is also health.",
		saludTempTit: "Not every street has the same temperature",
		saludTempTxt: "Two blocks apart there can be a 5°C difference depending on the ground surface, the presence of trees or the width of the street. Heat islands are not an abstract concept, they are the neighbourhood you live in. Understanding how heat spreads across your surroundings changes how you move and when.",
		saludPrevTit: "Getting ready before the heatwave arrives",
		saludPrevTxt: "Heatwaves are not unforeseeable emergencies, they follow a pattern and they announce themselves. Knowing the spots in your neighbourhood where heat concentrates, identifying nearby cool shelters and knowing which neighbours need more attention on those days is, quite simply, the most effective thing there is.",
		saludRecursos: "Official resources",
		saludLinkSanidad: "Andalusian Health Ministry",
		saludLinkResponde: "Advice and appointments (Salud Responde)",
		saludGamaRegional: "Regional Tier (Andalusia)",
		saludGamaNacional: "National Tier (Spain)",
		saludGamaEuropea: "European Tier (EU)",
		saludGamaGlobal: "Global Tier (UN)",
		saludLinkOsman: "OSMAN - Andalusian Health and Environment Observatory",
		saludUsoOsman: "Use: Regional reference for local action plans tackling climate change.",
		saludLinkOscc: "OSCC - Observatory of Health and Climate Change",
		saludUsoOscc: "Use: Spanish Ministry of Health body in charge of risk thresholds by province and heat health alerts.",
		saludLinkEuropeo: "European Climate and Health Observatory",
		saludUsoEuropeo: "Use: European Commission and EEA portal to predict health impacts and monitor biometeorological indicators across Europe.",
		saludLinkClimahealth: "ClimaHealth",
		saludUsoClimahealth: "Use: The global knowledge platform shared by WHO and WMO for public health resilience.",
		saludP3: "That is why this website exists. So you know where the shade is right now and so you take care of the ones that remain. Cities that embrace their green spaces and their cool streets take care of their people.",
		saludCierre: "Shade is urban medicine, and it is free.",
		tagline: "Your street's air and shade, live",
		modesLabel: "How do you want it explained?",
		mode_ciudadano_title: "Everyday",
		mode_ciudadano_sub: "Clear and direct",
		mode_cientifico_title: "Scientific",
		mode_cientifico_sub: "With the data",
		mode_yayo_title: "Grandparent",
		mode_yayo_sub: "Big text, no rush",
		mode_peque_title: "Kid (age 5)",
		mode_peque_sub: "With little drawings",
		imLost: "I don't get it, explain please",
		mapTitle: "Spain's air, right now",
		legendGood: "Good",
		legendMid: "Moderate",
		legendBad: "Bad",
		legendNote: "Dots are real stations. The colour between cities is estimated, not measured.",
		aboutLink: "Why does this exist?",
		chatOpen: "Ask Manolit∞",
		chatTitle: "Manolit∞ explains it",
		chatWelcome: "I'm Manolit∞. Ask what you need.",
		chatPlaceholder: "Type your question here...",
		chatSend: "Send",
		airLvlGood: "good",
		airLvlFair: "fair",
		airLvlModerate: "moderate",
		airLvlPoor: "poor",
		airLvlVeryPoor: "very poor",
		airLvlHazard: "hazardous",
		chatAirUnavailable: "Air quality not available for this country.",
		chatRouteStreets: "You will walk along",
		chatRouteStreetsAir: "streets where pollution is estimated at a level",
		chatRouteAirOnly: "On this route pollution is estimated at a level",
		chatRouteMapLoading: "The map is still loading. Scroll down to it, let it finish and tap me again.",
		chatRouteLocating: "Finding your location…",
		chatRouteNoGeo: "This browser will not let me know where you are. Type the origin by hand in the route panel and I will set it up.",
		chatRouteDenied: "Without location permission I cannot start from where you are. If you change your mind, enable it in the browser and tap me again.",
		chatRouteBusy: "I am already looking for you, give me a few seconds.",
		chatRouteNoGps: "The GPS cannot fix you with good accuracy. Move closer to a window or step outside and tap me again.",
		chatRouteDestFallback: "your destination",
		chatRouteDone: "New route to",
		chatRouteSeeMap: "It is drawn on your map.",
		chatRouteFail: "I could not calculate that route. Try another nearby destination.",
		chatRouteDestPlaceholder: "From my current location to…",
		chatRouteNotFound: "I cannot find that destination as written. Try street and number or the place name.",
		chatRouteChip: "Shall I work out your shaded route from here?",
		chatRouteAskDest: "Tell me the destination, anywhere in the world works. Then I use your location to draw the route. If you rather see how it works, tap «See an example».",
		chatExampleBtn: "See an example",
		chatExamplePrep: "Preparing an example with real data, one moment.",
		chatExampleMin: "minutes walking",
		chatExampleNoTime: "time to be estimated",
		chatExampleFrom: "From",
		chatExampleTo: "to",
		chatExampleFail: "I could not draw the example. Try again.",
		footerFamily: "Manolit∞ Forestal · Sevilla Heat Islands · Manolit∞ Aire",
		orb_good: "good",
		orb_mid: "moderate",
		orb_bad: "bad",
		quick_pm25: "What is PM2.5?",
		quick_color: "Why does the colour change?",
		quick_bebe: "Is it safe to go out with my baby?",
		quick_q1: "What can I help you with?",
		quick_a1: "I can tell you the real-time air quality, whether it is a good time to exercise outside, how much shade your street has at any hour, and the coolest walking routes. I also answer any other question.",
		quick_q2: "What do the air colors mean?",
		quick_a2: "Green: good air, go out freely. Orange: moderate, take care if you're sensitive. Red or purple: bad air, better wait until it improves.",
		quick_q3: "Can I exercise outside today?",
		quick_a3: "Check the map color: green or yellow, go ahead. Orange and you have asthma or kids with you, take it easy. Red, leave it for another time.",
		quick_q4: "How do the 3D shadows work?",
		quick_a4: "We compute the sun's real position every minute and project the shadow of each building and tree onto the map. What you see is the shade on the street right now.",
		quick_q5: "How do I find a shady route?",
		quick_a5: "Type your start and destination in the 3D map search box and tap 'Find route'. We trace a walking path that makes the most of the shade at that time.",
		quick_q6: "What is solar irradiation?",
		quick_a6: "Turn on the 'Solar Irradiation' layer and tap any point on the map: you'll see how much sun that spot gets from NASA's historical data, by year, month, day and hour.",
		quick_q7: "What is the 3D virtual walk?",
		quick_a7: "It's a first-person stroll through the 3D map: walk the streets without leaving your sofa and see where the sun hits and where the shade falls.",
		region_peninsula: "Mainland",
		region_canarias: "Canary Islands",
		region_baleares: "Balearic Islands",
		region_ceutamelilla: "Ceuta / Melilla",
		statusLoading: "Loading live data…",
		legalNotice: "Legal notice",
		backToMap: "← Back to the map",
		treesBtn: "Trees",
		osmRefreshBtn: "↻ Update map",
		osmRefreshTitle: "Download the latest OpenStreetMap data (trees and points) for this area",
		osmRefreshing: "Loading…",
		osmRefreshed: "✓ Updated",
		osmRefreshError: "Could not refresh right now. Try again in a minute.",
		privacy: "Privacy",
		cookies: "Cookies",
		searching: "Searching…",
		searchBtn: "Search route",
		calculating: "Calculating real walking route…",
		geocoding: "Geocoding addresses…",
		fillBoth: "Enter origin and destination.",
		notFound: "Not found",
		tryFormat: "Try writing it as street, number, city",
		clickOrigin: "Click on the map to mark the origin.",
		clickDestiny: "Origin marked, click on the destination.",
		chooseDestination: "choose the destination by typing it above or with the Pick on map button.",
		pointMap: "Point marked on map",
		myLocation: "My location",
		locationMarked: "Location marked as origin",
		locationPrecision: "precision reported by browser",
		locationNote: "without real GPS it may be approximate",
		locationDenied: "Could not get your location (did you deny permission?).",
		locationAsking: "Requesting location permission…",
		errorGeolocation: "This browser does not allow sharing your location.",
		errorSearch: "I couldn't draw the route. Try again in a little while.",
		routeReal: "Route",
		routeFallback: "Could not calculate walking route (routing server busy), showing straight line.",
		routeEstimated: "estimated time at normal pace",
		routeRecalcWeather: "Cloud cover changed, recalculating the coolest route…",
		skipToContent: "Skip to main content",
		accModeBtn: "♿ Accessible mode",
		layerGroup: "Map layers",
		timePresets: "Time presets",
		timeSlider: "Time of day",
		aqiTitle: "Air quality at the origin point",
		chatDialogLabel: "Chat with Manolit",
		chatClose: "Close chat",
		sunSummaryAbove: "Sun at",
		sunSummaryDeg: "degrees altitude",
		sunSummaryAzimuth: "azimuth",
		sunSummaryBelow: "Night time: the sun is below the horizon.",
		stepsTitle: "Turn-by-turn directions",
		stepsListen: "Listen to directions",
		stepsStop: "Stop reading",
		stepDepart: "Head out along {calle} towards the {dir}, {metros} metres",
		stepContinue: "Continue on {calle} for {metros} metres",
		stepTurnLeft: "Turn left onto {calle} and continue for {metros} metres",
		stepTurnRight: "Turn right onto {calle} and continue for {metros} metres",
		stepSlightLeft: "Bear slightly left onto {calle} and continue for {metros} metres",
		stepSlightRight: "Bear slightly right onto {calle} and continue for {metros} metres",
		stepUturn: "Make a U-turn onto {calle}, {metros} metres",
		stepRoundabout: "At the roundabout, take the exit towards {calle} and continue for {metros} metres",
		stepArrive: "You have arrived at your destination.",
		stepUnnamed: "unnamed street",
		shadeShade: "shaded stretch",
		shadeSun: "sunny stretch",
		shadeMixed: "mixed sun and shade",
		shadeTip: "Tip: this is a long stretch in the sun, take it easy, walk on the side with buildings and carry water.",
		dirN: "north",
		dirNE: "north-east",
		dirE: "east",
		dirSE: "south-east",
		dirS: "south",
		dirSW: "south-west",
		dirW: "west",
		dirNW: "north-west",
		walkGuidanceStart: "Off we go! I'll call out each step as you walk, just take it easy.",
		minWalk: "min walking",
		sunPosition: "Sun position",
		sunBelow: "The sun is below the horizon at that time, no shadows to project.",
		goldenHour: "Golden hour",
		blueHour: "Blue hour",
		now: "Now",
		simulating: "Simulating",
		summerSolstice: "Summer solstice",
		winterSolstice: "Winter solstice",
		btnSummer: "Summer",
		btnWinter: "Winter",
		pickMap: "Pick on map",
		captureView: "Capture view",
		captureError: "Could not generate image (map server limitation). Try a regular screenshot.",
		origin: "Origin",
		destiny: "Destination",
		noResults: "No results",
		aqiGood: "Good",
		aqiModerate: "Moderate",
		aqiBad: "Bad",
		aqiNoData: "No data",
		layerBuildings: "3D buildings",
		layerShadows: "Shadows",
		layerClouds: "Clouds",
		layerRoute: "Route",
		walkModeStart: "Start walking",
		walkModeStop: "Stop walking",
		walkModeTracking: "Tracking your position…",
		darkMapOn: "Dark map",
		darkMapOff: "Light map",
		routeMapTitle: "Route & 3D shadows",
		aguaVivoLabel: "Ads using up water worldwide:",
		aguaVivoCalc: "300B impressions a day × ~1 MB × 0.06 kWh/GB × 1.8 L/kWh ≈ 375 L/s",
		originPlaceholder: "Starting point",
		destinationPlaceholder: "Destination point",
		layerSun: "Sun position",
		resetBtn: "Reset",
		// ============================================================
		// NUEVO v3: Alternative route system with shadow evaluation
		// ============================================================
		evaluatingShadows: "Evaluating shadow on alternative routes…",
		inShadow: "in shadow",
		chosenMoreShadow: "chosen for more shadow",
		chosenShorter: "similar shadow, chosen the shorter one",
		shadowStats: "Shadow on your route",
		noShadowData: "Calculating…",
		shadowGreat: "Look at that! Half your walk stays in the shade",
		shadowGood: "Good shadow on parts of the route",
		shadowSome: "Some shadow available",
		shadowNone: "Little or no shadow on this route",
		of: "of",
		inShadowShort: "in shadow",
		alternativesAvailable: "Alternative routes compared",
		virtualWalkStart: "3D virtual walk",
		virtualWalkStop: "Exit walk",
		virtualWalkHint: "Get down to street level without leaving your sofa: walk the route as if you were really there",
		virtualWalkUnsupported: "Your browser does not support the 3D virtual walk.",
		shadeCoverage: "Shade coverage",
		airDataUnavailable: "Air data unavailable right now.",
		irrLayerBtn: "Solar irradiation",
		irrPanelTitle: "Irradiation history",
		irrYear: "Year",
		irrMonth: "Month",
		irrDay: "Day",
		irrHour: "Hour (UTC)",
		irrLoading: "Querying NASA POWER…",
		irrAnnualLoading: "Loading yearly summary…",
		irrNoData: "NASA has no data for that date (future or too recent?).",
		irrError: "Could not query NASA right now. Try again in a few seconds.",
		irrDayOfMonth: "Day of month: ",
		irrHourOfDay: "Hour of day: ",
		irrUmbra: "Umbra: building shadow (full protection)",
		irrPenumbra: "Penumbra: tree shadow (filtered light ~50 %)",
		irrSol: "Direct sun: unprotected",
		irrExposureFactor: "Exposure factor",
		irrEffectiveExposure: "Effective exposure here",
		irrAnnual: "Yearly irradiation",
		irrBestDay: "Best day",
		irrWorstDay: "worst",
		irrPeakHours: "Peak sun hours",
		irrRealDays: "real days",
		irrQueryPoint: "Query point",
		syncLink: "Sync / Export data",
		syncHint: "Save your settings to a file and restore them on another device. No accounts, no servers.",
		syncExportBtn: "Export my data",
		syncImportBtn: "Import data",
		syncImportError: "That file is not a Manolit∞ Aire backup. Nothing was imported.",
		// FAQ (preguntas frecuentes)
		faqTitle: "Frequently asked questions",
		faqIntro: "The ones people really ask me, answered straight.",
		faqQ1: "Is this actually free?",
		faqA1: "Yes. And it will stay free. No sign-up, no catch, no hidden paid version. You walk in, check the air and off you go.",
		faqQ2: "Why are there no ads?",
		faqA2: "Because today's ads are not posters. They are auctions that burn water and battery behind your back every time you load a page. They are not allowed in here. The project runs on voluntary support from people on Ko-fi.",
		faqQ3: "Where does the air data come from?",
		faqA3: "From official stations across Spain and from the European Copernicus models, served by Open-Meteo. Public, scientific data, nothing made up.",
		faqQ4: "Are the shadows real?",
		faqA4: "Yes. They are calculated from OpenStreetMap buildings and the sun's position every minute. If the map says shadow, a real building is giving it to you.",
		faqQ5: "Are you spying on me?",
		faqA5: "No. No trackers, no third-party cookies. Your settings stay in your own browser and never leave it.",
		faqQ6: "Is there a mobile app?",
		faqA6: "No need. The website works in any phone browser, no install, no storage taken. Save it to your home screen and it opens like an app.",
		faqQ7: "Who makes this?",
		faqA7: "One person, Sandro, from Seville. No company behind it and no profit motive. Built with open data and the help of the people who support the project.",
		faqQ8: "Can I use it in my city?",
		faqA8: "If it is in Spain, yes. Stations and buildings cover the whole country. Outside Spain the air works in many places, but shadows depend on how well the area is mapped in OpenStreetMap.",
		faqQ9: "How can I help?",
		faqA9: "By using it and spreading the word. And if you feel like it, supporting on Ko-fi to pay the servers. You can also improve the map of your neighbourhood on OpenStreetMap, which is free and helps everyone.",
		// The water you cannot see (section + counters). {n} is the litres figure.
		aguaTitulo: "The water you cannot see",
		aguaP1: "This is no longer an estimate. Real telemetry from the last 30 days says ",
		aguaS1: "176,444 requests, 1.80 GB moved and 4,819 visits",
		aguaP2: ". In plain words, ",
		aguaS2: "0.38 MB and about 2 millilitres of water per visit",
		aguaP3: ", measured. Meanwhile, the world's programmatic advertising burns ",
		aguaS3: "about 375 litres every second",
		aguaP4: " on ad auctions nobody asked for. Per year, thousands of Olympic swimming pools.",
		aguaLink: "See the full maths, with all assumptions in the open →",
		aguaVivoTpl: "Since you entered Manolit∞, the world's ads have burned {n} litres of water. Your visit here ~2 ml, measured.",
		heroH1: "Manolito Aire. Shaded routes and real-time air quality",
		anadeLink: "Add Manolit∞ to your website",
		footerGithub: "Open source",
		co2Pregunta: "If you had not walked this cool route, how would you have made the trip?",
		co2OpPie: "On foot (without Manolito)",
		co2OpBici: "Bicycle",
		co2OpCoche: "Car",
		co2OpMoto: "Motorbike",
		co2OpAutobus: "Bus",
		co2ResPie: "Walking you would have emitted the same, 0 g of CO2. The difference is that with Manolito you stay in the cool.",
		co2ResBici: "By bike you would have emitted the same, 0 g of CO2. The difference is the coolness of the way.",
		co2ResTpl: "By walking this route you have avoided emitting about {c} of CO2 compared to going {m}.",
		co2MedioCoche: "by car",
		co2MedioMoto: "by motorbike",
		co2MedioAutobus: "by bus",
		co2Nota: "This question is just for you. Your answer is not stored and never leaves your browser.",
		// 01-oct-2026: last stretch of the full translation (see the es block).
		subBrand: "+ 3D Shadows",
		splashTagline: "Breathe ∞ Walk ∞ Take shelter ∞ Map ∞",
		accBtn: "♿ Accessible mode",
		capasBtn: "Layers",
		layerMicroclimate: "Microclimate",
		microTag: "Estimated",
		groupContent: "Map content",
		groupBase: "Base map",
		groupEntorno: "Surroundings",
		groupSolSombra: "Sun and shade",
		groupClimaAire: "Climate and air",
		groupRecorrido: "Route",
		groupBaseInfra: "Base and infrastructure",
		groupEntornoClima: "Surroundings and climate",
		groupIluminacionSol: "Lighting and sun",
		capasTriggerAria: "Map layers",
		closeCapasAria: "Close the layers panel",
		gameIntroBtn: "Play with Manolit∞",
  
		lidarBtn: "LiDAR rendering",
		colaboraTit: "No 3D in your area?",
		colaboraHint: "tap and I'll tell you how to fix it in 5 minutes ▾",
		osmIntro: "Manolit∞ draws buildings and trees with data from <strong>OpenStreetMap (OSM)</strong>, the free map we all make together. If your street looks empty, <strong>you can paint it yourself in 5 minutes</strong> and you'll give shade to the whole neighbourhood:",
		osmPaso1: "Go to <a href=\"https://www.openstreetmap.org\" rel=\"noopener\">openstreetmap.org</a>, create a free account and hit <strong>Edit</strong>.",
		osmPaso2: "<strong>Trees:</strong><ul style=\"margin:4px 0 0;padding-left:1.2em;\"><li><em>Single tree</em> → draw a <strong>point</strong> and tag it <code>natural=tree</code>. If you know the species, even better: <code>species=Naranjo amargo</code> or <code>genus=Citrus</code> (<code>wikipedia=es:Naranjo</code> works too). That way it shows up with its real crown, colour and fruit.</li><li><em>Street with a row of trees</em> → draw <strong>one single line</strong> along the sidewalk with <code>natural=tree_row</code>. Don't add tree by tree: Manolit∞ places them itself, one every ~9 m, following your line.</li></ul>",
		osmPaso3: "<strong>Buildings:</strong> draw the outline and tag <code>building=yes</code>. If you know the floors, add <code>building:levels=4</code>. That way the shade comes out at real height, not \"by default\".",
		osmPaso4: "Save your changes… and done.",
		osmCuando: "<strong>When does it show up in Manolit∞?</strong> Don't worry: the map updates itself <strong>every week</strong>, so your contribution appears even if you don't see it right away. And if the week goes by and it's not there, or you're in a hurry, <a href=\"https://github.com/sandrow007/manolito-aire/issues\" rel=\"noopener\">write me from here</a> and I'll push the update by hand. 🌳",
		uvLabel: "UV index",
		updatedPrefix: "Updated: ",
		updatedPlaceholder: "Updated: --",
		heroLoading: "Loading your city's air…",
		heroMoment: "One moment.",
		evolAire: "Air evolution",
		legendHist: "Last 48h (real data)",
		legendFore: "Next 48h (Copernicus/CAMS forecast)",
		quantumBadge: "Manolit∞ Quantum",
		quantumSub: "simulated forecast for the next 5 days, told straight",
		quantumDisclaimer: "This is NOT an official weather forecast. It is a mathematical simulation (quantum formalism simulated by software, no real quantum hardware) that computes probabilities from the real forecast above. For health decisions, follow the chart data and official sources, not this number.",
		footerFamiliaTxt: "Manolit∞ Aire is part of Sandro's family of citizen projects: free tools, no sign-up and no ads.",
		footerEcoTxt: "A frugal, sustainable website with measured numbers: 30 days of real telemetry show 0.38 MB and about 2 millilitres of water per visit, less than a single question to an AI. And no ads or ad auctions: the world's programmatic advertising uses about 375 litres of water every second; this whole site, a sip per visit.",
		footerIgnTxt: "Optional base layer \"IGN Map\": cartography © IGN / SCNE, CC BY 4.0 (scne.es)",
		donacionTxt: "Manolit∞ will always be free.<br>The servers, sadly, are not...",
		kofiBtn: "Support on Ko‑fi",
		comparativaLink: "Comparison",
		queEsLink: "What is Manolit∞ ©",
		statusLoadedTpl: "Loaded {a}/{b} live points.",
		svgCarbon1: "0.015 g CO₂ / visit · cleaner than 99%",
		svgCarbon2: "102.7 KB · 100% renewable hosting",
		svgCarbon3: "Measured with Website Carbon Calculator (1ClickImpact) · 16/09/2026",
		pequeInit: "The air is happy!",
		saludIcoSol: "sun",
		saludIcoSombra: "shade",
		saludIcoSalud: "health",
		saludIcoAgua: "water",
		saludIcoTemp: "temp.",
		saludIcoPrev: "prevention",
		saludIcoGroup: "Environmental health icons: sun, shade, health, water, temperature and prevention",
		syncDoneTpl: "Synced: {a} settings and {b} points. Reload with Ctrl+Shift+R to see everything applied.",
		syncImportError: "That file is not a valid Manolit∞ Aire backup.",
		syncReadError: "The file could not be read.",
		treesLoading: "Loading trees…",
		metaTitle: "Shade routes and live air quality | Manolit∞ Aire",
		metaDesc: "Plan walking routes along the shadiest streets and check live air quality and sun hours. Free, no sign-up, no ads.",
		and: "and",
		camBrujula: "Compass, back to north and level the view",
		camFull: "Full screen",
		camPitchDown: "Tilt down",
		camPitchUp: "Tilt up",
		camZoomIn: "Zoom in",
		camZoomOut: "Zoom out",
		layerLoadError: "The layer could not be loaded. Try again.",
		locationCalibrating: "Calibrating GPS, a few seconds…",
		locationNotCalibrated: "GPS has not reached good accuracy (20 m or less). Move near a window or step outside, or tap \"Pick on map\" to set the point by hand.",
		locationUpdated: "Location updated",
		syncData: "Sync / Export data",
		voiceGuide: "Voice guide",
		winterModeOff: "Winter mode off: routes seek shade again.",
		winterModeOn: "Winter mode on: the next route will seek the sun (shaded stretches weigh more).",
		winterSunRoute: "Winter mode: route by the sun",
		camGroupLabel: "Map zoom and tilt",
		a11yOffRoute: "Careful, it looks like you have strayed from the guided route. Stop, get your bearings and, if needed, retrace your steps.",
		stepsHide: "Hide directions",
		stepsShow: "Show directions",
		voiceGranted: "Voice on. Manolit walks with you.",
		voiceNo: "Not now",
		voicePermission: "Do you want Manolit to speak out loud? You can change it anytime.",
		voiceYes: "Allow voice",
		closeLbl: "Close",
		osmBtnError: "✕ Error",
		mapButtonsToggle: "Show or hide the map buttons",
		sunPanelToggle: "Show or hide the sun position panel",
		ignMapTitle: "Cartography by the National Geographic Institute (CC BY 4.0 scne.es)",
		catastroTitle: "Official building-height density from Spain's Cadastre (free, no sign-up)",
		airChartLoadingData: "Loading air data…",
		airChartAriaLabel: "Air chart: solid line recent past, dashed line forecast",
		airChartNow: "now",
		airStatsTpl: "PM2.5 next 24 h: mean {m} µg/m³ · peak {p} · low {n}",
		airChartError: "The history could not be loaded right now (the API is saturated by the map's 500+ requests). Try reloading in a few seconds.",
		airChartLoading: "Loading history and forecast…",
		airGood: "good air",
		airMid: "moderate air",
		airBad: "bad air",
		saludSaturdayTitle: "Manolit∞ Aire · Health Saturday",
		saludSaturdaySub: "+ Health Saturday",
		qProbGood: "probability of good air",
		qProbMid: "probability of moderate air",
		qProbBad: "probability of bad air",
		qDetailTpl: "{l}: {p} %. {d} in the next 24 h. Forecast mean PM2.5 {m} µg/m³ (between {a} and {b}).",
		sun: "Sun",
		moon: "Moon",
		moonNew: "new moon",
		moonWaxCres: "waxing crescent",
		moonFirstQ: "first quarter",
		moonWaxGib: "waxing gibbous",
		moonFull: "full moon",
		moonWanGib: "waning gibbous",
		moonLastQ: "last quarter",
		moonWanCres: "waning crescent",
		askMe: "Ask me!",
		mapLayers: "Map layers",
		familyZoneAria: "The Manolit family and why this exists",
		layerAirQuality: "Air quality",
		airLayerLive: "Live estimate · Open-Meteo",
		airLayerOffSpain: "Air layer turned off, we have no reliable source outside Spain.",
		saludBannerFinTpl: "The green is temporary, on {f} the web returns to its usual look.",
		escudosTitulo: "Shields that look after us",
		escudosPorque: "Four public environmental health observatories, from your homeland to the planet. They publish the data and heat thresholds this website relies on, and their work protects us all.",
	},
	ka: {
		saludBannerTexto: "ამ მიწაზე ჩვენი გარემოს ზრუნვა ჩვენი სხეულის ზრუნვაა.",
		saludBannerCta: "გაიგე, რატომ ვიცავთ გარემოს ჯანმრთელობას და ჩრდილის ყოველ კუნჭულს.",
		saludKicker: "ჯანმრთელობის შაბათ-კვირა",
		saludH2: "ჩრდილების დაცვა: ქალაქის გარემოს ჯანმრთელობა.",
		saludP1: "ანდალუსიური ზაფხულის შუაგულში მზიანი ტროტუარიდან ჩრდილიანისკენ გადასვლა შენს სხეულში ათი გრადუსის სხვაობა შეიძლება იყოს. ეს არ არის ანეკდოტი, ეს გარემოს ჯანმრთელობაა. ასფალტი და ბეტონი სითბოს იჭერს და ჩვენს ქუჩებს თერმულ მახეებად აქცევს, რომლებიც ორგანიზმს უტევენ.",
		saludP2: "ჰერაკლესიც კი, სევილიის ლეგენდარული დამაარსებელი, უძლეველი არ იყო. ის ნახევარღმერთი იყო და, როგორც ადამიანს, ჰქონდა ფიზიკური სისუსტეები, რომლებიც დაცემამდე უნდა დაეცვა. ჩვენ გვიან სამედიცინო გამოსავალს არ ვეძებთ; ჩვენ გვინდა გარემოს პრევენცია. ყოველი ხე და ყოველი ჩრდილი ქალაქური მედიცინაა, რომელიც ქუჩის კლიმატს ცვლის ჩვენი ადამიანების დასაცავად.",
		saludNota: "მანოლიტოს გაფრთხილება: გახსოვდეს, რომ ეს სიმულატორი ციფრული ხელსაწყოა დასაგეგმად, მაგრამ 100%-ით ზუსტი არ არის და ქუჩის ნამდვილი ჩრდილები შეიძლება განსხვავდებოდეს. სწორედ ამიტომ გარემოს ჯანმრთელობა შენს ჯანსაღ გონებაზეცაა დამოკიდებული: ეჭვის შემთხვევაში ყოველთვის იპოვე გრილი თავშესაფარი.",
		saludChat: "სხვათა შორის! გახსოვდეს, რომ გარემოს ჯანმრთელობის შაბათ-კვირა გვაქვს. გარემო შენს სხეულზე მოქმედებს: ქუჩაში თუ გადიხარ, აირჩიე ჩრდილიანი ტროტუარი და გაგრილდი, ქუჩა იწვის ხომ.",
		saludSolTit: "როდესაც მზე პრობლემად იქცევა",
		saludSolTxt: "12:00-დან 17:00-მდე მზე არა მხოლოდ ათბობს, არამედ აგროვებს რადიაციას ასფალტზე, ფასადებზე და შენს სხეულზე, შენ ამას არც ამჩნევ. ამის თავიდან აცილება არ არის საჭირო, უბრალოდ იცოდე, როგორ იმოძრაო ქალაქში იმ საათებში, როდესაც ის შენს სასარგებლოდ მუშაობს და არა შენს საწინააღმდეგოდ.",
		saludSombraTit: "ჩრდილი როგორც ინფრასტრუქტურა",
		saludSombraTxt: "40°C-იან ქალაქში პირდაპირი მზიდან ჩრდილში გადასვლა შეიძლება ათი გრადუსით დაურთოს აღქმად ტემპერატურას წამებში. ეს კომფორტი არ არის, ნამდვილი დაცვაა. ხეები, გალერეები და ვიწრო ქუჩები არსებული რესურსებია, რომელთა გამოყენებაც შეიძლება. Manolit∞ Aire გეხმარება მათ პოვნაში.",
		saludCuerpoTit: "შენი სხეული ქალაქური სიცხის წინაშე",
		saludCuerpoTxt: "უკიდურესი სიცხე ყველას ერთნაირად არ აფრთხილებს. ბავშვები, ხანდაზმულები და ვინც ღია ცის ქვეშ მუშაობს, ამას უფრო ადრე და უფრო ძლიერ გრძნობენ. იცოდე, როგორ პასუხობს შენი გარემო, შენი უბნის ტემპერატურა, ხელმისაწვდომი ნიავი, ახლო ჩრდილი — ეს შენი თავის მოვლის პირველი გზაა, ინფორმაციის გარდა არაფერი გჭირდება.",
		saludAguaTit: "წყალი: რასაც სხეული ვერ უთანხმდება",
		saludAguaTxt: "სიცხეში სხეული წყალს უფრო სწრაფად კარგავს, ვიდრე ჩვენ ვაცნობიერებთ. ნუ დაელოდები წყურვილს. დალიე ადრე, პატარა ოდენობით და მუდმივად დღის ყველაზე ცხელ საათებში — სწორედ ეს ქმნის განსხვავებას. გრილ წყალთან წვდომა საჯარო სივრცეებშიც ჯანმრთელობაა.",
		saludTempTit: "ყველა ქუჩას ერთნაირი ტემპერატურა არ აქვს",
		saludTempTxt: "ორი კვარტლის მანძილზე შეიძლება 5°C-ის განსხვავება იყოს საფარის ტიპის, ხეების არსებობის ან ქუჩის სიგანის მიხედვით. სითბური კუნძულები აბსტრაქტული კონცეფცია არ არის, ეს შენი უბანია. გაიგე, როგორ ნაწილდება სითბო შენს გარემოში — ეს ცვლის, როგორ და როდის მოძრაობ.",
		saludPrevTit: "მოემზადე სიცხის ტალღამდე",
		saludPrevTxt: "სიცხის ტალღები არაპროგნოზირებადი გადაუდებელი მოვლენები არ არის, მათ აქვთ ნიმუში და იწინასწარმეტყველებიან. იცოდე, შენს უბანში სად კონცენტრირდება სიცხე, იპოვე ახლომდებარე გრილი თავშესაფრები და იცოდე, რომელი მეზობლები საჭიროებენ მეტ ყურადღებას იმ დღეებში — ეს, გულუბრყვილოდ, ყველაზე ეფექტურია, რაც არსებობს.",
		saludRecursos: "ოფიციალური რესურსები",
		saludLinkSanidad: "ანდალუსიის ჯანდაცვის სამინისტრო",
		saludLinkResponde: "კონსულტაციები და ვიზიტები (Salud Responde)",
		saludGamaRegional: "რეგიონული დონე (ანდალუსია)",
		saludGamaNacional: "ეროვნული დონე (ესპანეთი)",
		saludGamaEuropea: "ევროპული დონე (ევროკავშირი)",
		saludGamaGlobal: "გლობალური დონე (გაერო)",
		saludLinkOsman: "OSMAN - ანდალუსიის ჯანმრთელობისა და გარემოს ობსერვატორია",
		saludUsoOsman: "გამოყენება: რეგიონული სანდო წერტილი კლიმატის ცვლილების საპასუხო ადგილობრივი სამოქმედო გეგმებისთვის.",
		saludLinkOscc: "OSCC - ჯანმრთელობისა და კლიმატის ცვლილების ობსერვატორია",
		saludUsoOscc: "გამოყენება: ესპანეთის ჯანმრთელობის სამინისტროს ორგანო, პასუხისმგებელი პროვინციების რისკის ზღვარებზე და სიცხის სანიტარულ გაფრთხილებებზე.",
		saludLinkEuropeo: "კლიმატისა და ჯანმრთელობის ევროპული ობსერვატორია",
		saludUsoEuropeo: "გამოყენება: ევროკომისიისა და ევროპის გარემოს სააგენტოს პორტალი ჯანმრთელობაზე ზემოქმედების პროგნოზირებისა და ევროპაში ბიომეტეოროლოგიური ინდიკატორების მონიტორინგისთვის.",
		saludLinkClimahealth: "ClimaHealth",
		saludUsoClimahealth: "გამოყენება: WHO-სა და WMO-ს ერთობლივი გლობალური ცოდნის პლატფორმა საზოგადოებრივი ჯანმრთელობის მდგრადობისთვის.",
		saludP3: "სწორედ ამიტომ არსებობს ეს ვებ-გვერდი. რომ იცოდე, სად არის ჩრდილი ახლა და რომ დაიცვა ის, რაც დარჩა. ქალაქები, რომლებიც ეხვევიან თავიანთ მწვანე სივრცეებს და გრილ ქუჩებს, თავიანთ ხალხს იცავენ.",
		saludCierre: "ჩრდილი ქალაქური მედიცინაა და უფასოა.",
		tagline: "შენი ქუჩის ჰაერი და ჩრდილი, პირდაპირ",
		modesLabel: "როგორ გინდა, რომ გითხრა?",
		mode_ciudadano_title: "მოქალაქე",
		mode_ciudadano_sub: "მარტივად და ნათლად",
		mode_cientifico_title: "მეცნიერი",
		mode_cientifico_sub: "მონაცემებით",
		mode_yayo_title: "ბებია / ბაბუა",
		mode_yayo_sub: "დიდი ასოებით, ნელა",
		mode_peque_title: "პატარა (5 წლის)",
		mode_peque_sub: "სურათებით",
		imLost: "ვერ გავიგე, ამიხსენი",
		mapTitle: "ესპანეთის ჰაერი, ახლავე",
		legendGood: "კარგი",
		legendMid: "ზომიერი",
		legendBad: "ცუდი",
		legendNote: "წერტილები ნამდვილი სადგურებია. ქალაქებს შორის ფერი შეფასებულია, არა გაზომილი.",
		aboutLink: "რატომ არსებობს ეს?",
		chatOpen: "ჰკითხე Manolit∞-ს",
		chatTitle: "Manolit∞ გიხსნის",
		chatWelcome: "მე ვარ Manolit∞. ჰკითხე, რაც გჭირდება.",
		chatPlaceholder: "დაწერე შენი კითხვა აქ...",
		chatSend: "გაგზავნა",
		airLvlGood: "კარგი",
		airLvlFair: "მისაღები",
		airLvlModerate: "ზომიერი",
		airLvlPoor: "ცუდი",
		airLvlVeryPoor: "ძალიან ცუდი",
		airLvlHazard: "საშიში",
		chatAirUnavailable: "ჰაერის ხარისხი ამ ქვეყნისთვის მიუწვდომელია.",
		chatRouteStreets: "შენ გაივლი",
		chatRouteStreetsAir: "ქუჩებს, სადაც დაბინძურების დონე ვარაუდობენ",
		chatRouteAirOnly: "ამ მარშრუტზე დაბინძურების დონე ვარაუდობენ",
		chatRouteMapLoading: "რუკა ჯერ კიდევ იტვირთება. ჩადი მასთან, დაელოდე დასრულებას და ხელახლა დამაჭირე.",
		chatRouteLocating: "შენს მდებარეობას ვეძებ…",
		chatRouteNoGeo: "ეს ბრაუზერი არ მაძლევს შენი ადგილსამყოფელის ცოდნის საშუალებას. დაწერე საწყისი ხელით მარშრუტების პანელში და მე მოვამზადებ.",
		chatRouteDenied: "მდებარეობის ნებართვის გარეშე ვერ დავიწყებ იქიდან, სადაც ხარ. თუ გადაიფიქრებ, ჩართე ბრაუზერში და ხელახლა დამაჭირე.",
		chatRouteBusy: "უკვე გეძებ, მომეცი რამდენიმე წამი.",
		chatRouteNoGps: "GPS ვერ განსაზღვრავს შენს ადგილს ზუსტად. მიუახლოვდი ფანჯარას ან გადი გარეთ და ხელახლა დამაჭირე.",
		chatRouteDestFallback: "შენი დანიშნულება",
		chatRouteDone: "ახალი მარშრუტი",
		chatRouteSeeMap: "რუკაზე გაქვს დახატული.",
		chatRouteFail: "ვერ დავითვალე ეს მარშრუტი. სცადე სხვა ახლო დანიშნულება.",
		chatRouteDestPlaceholder: "ჩემი ამჟამინდელი მდებარეობიდან…",
		chatRouteNotFound: "ვერ ვპოულობ ამ დანიშნულებას ასე. სცადე ქუჩა და ნომრით ან ადგილის სახელით.",
		chatRouteChip: "გამოგითვლიო შენს მარშრუტს ჩრდილით აქედან?",
		chatRouteAskDest: "მითხარი დანიშნულება, მსოფლიოს ნებისმიერი ადგილი ჯანდაბა. შემდეგ შენს მდებარეობას გამოვიყენებ მარშრუტის დასახატად. თუ გინდა ნახო როგორ მუშაობს, დააჭირე «ნახე მაგალითი».",
		chatExampleBtn: "ნახე მაგალითი",
		chatExamplePrep: "ვამზადებ მაგალითს ნამდვილი მონაცემებით, ერთი წუთი.",
		chatExampleMin: "წუთი ფეხით",
		chatExampleNoTime: "დრო შესაფასებელია",
		chatExampleFrom: "აქედან",
		chatExampleTo: "იქით",
		chatExampleFail: "ვერ დავხატე მაგალითი. სცადე ხელახლა.",
		footerFamily: "Manolit∞ Forestal · სითბოს კუნძულები სევილია · Manolit∞ Aire",
		orb_good: "კარგი",
		orb_mid: "საშუალო",
		orb_bad: "ცუდი",
		quick_pm25: "რა არის PM2.5?",
		quick_color: "რატომ იცვლება ფერი?",
		quick_bebe: "უსაფრთხოა თუ არა ჩვილთან გასვლა?",
		quick_q1: "რით შემიძლია დაგეხმარო?",
		quick_a1: "გეტყვი ჰაერის ხარისხს რეალურ დროში, ღირს თუ არა გარეთ ვარჯიში, რამდენი ჩრდილია შენს ქუჩაში ნებისმიერ დროს და რომელი ბილიკია უფრო გრილი. პასუხობ ნებისმიერ სხვა კითხვასაც.",
		quick_q2: "რას ნიშნავს ჰაერის ფერები?",
		quick_a2: "მწვანე: ჰაერი კარგია, გადი თავისუფლად. ნარინჯისფერი: ზომიერი, ფრთხილად იყავი, თუ მგრძნობიარე ხარ. წითელი ან იისფერი: ცუდი ჰაერი, ჯობია დაელოდო გაუმჯობესებას.",
		quick_q3: "შემიძლია დღეს გარეთ ვივარჯიშო?",
		quick_a3: "შეხედე რუკის ფერს: მწვანე ან ყვითელია, წადი. ნარინჯისფერია და ასთმა გაქვს ან ბავშვებთან ხარ, ნელა; წითელია, გადადე სხვა დროს.",
		quick_q4: "როგორ მუშაობს 3D ჩრდილები?",
		quick_a4: "ყოველ წუთს ვიანგარიშებთ მზის რეალურ მდებარეობას და თითოეული შენობისა და ხის ჩრდილს რუკაზე ვასახებთ. რასაც ხედავ, ქუჩაში ამ წუთას არსებული ჩრდილია.",
		quick_q5: "როგორ ვიპოვო ჩრდილიანი მარშრუტი?",
		quick_a5: "შეიყვანე საწყისი და დანიშნულება 3D რუკის ძიებაში და დააჭირე «მარშრუტის ძიებას». დაგიხაზავთ საფეხმავლო გზას იმ საათის ჩრდილით.",
		quick_q6: "რა არის მზის ინსოლაცია?",
		quick_a6: "ჩართე «მზის ინსოლაციის» ფენა და შეეხე რუკის ნებისმიერ წერტილს: ნახავ, რამდენ მზეს იღებს ეს ადგილი NASA-ს ისტორიული მონაცემებით, წლით, თვით, დღით და საათით.",
		quick_q7: "რა არის 3D ვირტუალური გასეირნება?",
		quick_a7: "ეს პირველი პირის ხედით გასეირნებაა 3D რუკაზე: ისეირნე ქუჩებში დივნიდან ადგომის გარეშე და ნახავ, სად ცემს მზე და სად დებს ჩრდილი.",
		region_peninsula: "ნახევარკუნძული",
		region_canarias: "კანარი",
		region_baleares: "ბალეარი",
		region_ceutamelilla: "სეუტა / მელილია",
		statusLoading: "ცოცხალი მონაცემები იტვირთება…",
		legalNotice: "სამართლებრივი შეტყობინება",
		backToMap: "← რუკაზე დაბრუნება",
		treesBtn: "ხეები",
		osmRefreshBtn: "↻ განახლება",
		osmRefreshTitle: "ჩამოტვირთე OpenStreetMap-ის ახალი მონაცემები (ხეები და წერტილები) ამ ზონისთვის",
		osmRefreshing: "იტვირთება…",
		osmRefreshed: "✓ განახლდა",
		osmRefreshError: "ახლა ვერ განახლდა. სცადე ერთ წუთში.",
		privacy: "კონფიდენციალურობა",
		cookies: "ქუქიები",
		searching: "ძებნა…",
		searchBtn: "მარშრუტის ძებნა",
		calculating: "რეალური მარშრუტი ქუჩებით ითვლება…",
		geocoding: "მისამართები გეოკოდირდება…",
		fillBoth: "შეიყვანე საწყისი და დანიშნულება.",
		notFound: "ვერ მოიძებნა",
		tryFormat: "სცადე ფორმატი: ქუჩა, ნომერი, ქალაქი",
		clickOrigin: "დააწკაპუნე რუკაზე საწყისის მოსანიშნად.",
		clickDestiny: "საწყისი მონიშნულია, დააწკაპუნე დანიშნულებაზე.",
		chooseDestination: "აირჩიე დანიშნულება ზემოთ აკრეფით ან ღილაკით არჩევა რუკაზე.",
		pointMap: "წერტილი მონიშნულია რუკაზე",
		myLocation: "ჩემი მდებარეობა",
		locationMarked: "მდებარეობა მონიშნულია როგორც საწყისი",
		locationPrecision: "ბრაუზერის მიერ მოცემული სიზუსტე",
		locationNote: "ნამდვილი GPS-ის გარეშე შეიძლება სავარაუდო იყოს",
		locationDenied: "მდებარეობის მიღება ვერ მოხერხდა (ხომ არ უარს თქვი ნებართვაზე?).",
		locationAsking: "მდებარეობის ნებართვა ითხოვება…",
		errorGeolocation: "ეს ბრაუზერი არ იზიარებს შენს მდებარეობას.",
		errorSearch: "მარშრუტი ვერ დავხაზე. სცადე ცოტა ხანში ხელახლა.",
		routeReal: "მარშრუტი",
		routeFallback: "ქუჩების მარშრუტი ვერ გამოითვალა (სერვერი დაკავებულია), ჩანს პირდაპირი ხაზი.",
		routeEstimated: "სავარაუდო დრო ჩვეულებრივი სვლით",
		routeRecalcWeather: "ღრუბლიანობა შეიცვალა, ყველაზე გრილი მარშრუტი თავიდან ითვლება…",
		skipToContent: "მთავარ შინაარსზე გადასვლა",
		accModeBtn: "♿ ხელმისაწვდომი რეჟიმი",
		layerGroup: "რუკის ფენები",
		timePresets: "დროის პრესეტები",
		timeSlider: "დღის დრო",
		aqiTitle: "ჰაერის ხარისხი საწყის წერტილში",
		chatDialogLabel: "ჩატი მანოლიტთან",
		chatClose: "ჩატის დახურვა",
		sunSummaryAbove: "მზე",
		sunSummaryDeg: "გრადუსი სიმაღლეზე",
		sunSummaryAzimuth: "აზიმუთი",
		sunSummaryBelow: "ღამეა: მზე ჰორიზონტის ქვემოთაა.",
		stepsTitle: "ნაბიჯ-ნაბიჯ მიმართულებები",
		stepsListen: "მიმართულებების მოსმენა",
		stepsStop: "კითხვის შეჩერება",
		stepDepart: "გადი {calle}-ით, მიმართულება: {dir}, {metros} მეტრი",
		stepContinue: "გააგრძელე {calle}-ით {metros} მეტრი",
		stepTurnLeft: "შეუხვიე მარცხნივ {calle}-ზე და გააგრძელე {metros} მეტრი",
		stepTurnRight: "შეუხვიე მარჯვნივ {calle}-ზე და გააგრძელე {metros} მეტრი",
		stepSlightLeft: "ოდნავ შეუხვიე მარცხნივ {calle}-ზე და გააგრძელე {metros} მეტრი",
		stepSlightRight: "ოდნავ შეუხვიე მარჯვნივ {calle}-ზე და გააგრძელე {metros} მეტრი",
		stepUturn: "შემობრუნდი და აიღე {calle}, {metros} მეტრი",
		stepRoundabout: "მრგვალ გადაკვეთაზე აიღე გასასვლელი {calle}-ისკენ და გააგრძელე {metros} მეტრი",
		stepArrive: "მიხვედი დანიშნულების ადგილას.",
		stepUnnamed: "უსახელო ქუჩა",
		shadeShade: "ჩრდილიანი მონაკვეთი",
		shadeSun: "მზიანი მონაკვეთი",
		shadeMixed: "ნაზავი მზე და ჩრდილი",
		shadeTip: "რჩევა: ეს გრძელი მზიანი მონაკვეთია, ნუ იჩქარებ, იარე შენობების მხარეს და წაიღე წყალი.",
		dirN: "ჩრდილოეთი",
		dirNE: "ჩრდილო-აღმოსავლეთი",
		dirE: "აღმოსავლეთი",
		dirSE: "სამხრეთ-აღმოსავლეთი",
		dirS: "სამხრეთი",
		dirSW: "სამხრეთ-დასავლეთი",
		dirW: "დასავლეთი",
		dirNW: "ჩრდილო-დასავლეთი",
		walkGuidanceStart: "წავედით! თითოეულ ნაბიჯს გეტყვი გზად, შენ მშვიდად იარე.",
		minWalk: "წთ ფეხით",
		sunPosition: "მზის პოზიცია",
		sunBelow: "მზე ჰორიზონტქვეშაა იმ დროს, ჩრდილი არ არის.",
		goldenHour: "ოქროს საათი",
		blueHour: "ლურჯი საათი",
		now: "ახლა",
		simulating: "სიმულაცია",
		summerSolstice: "ზაფხულის მზედგომა",
		winterSolstice: "ზამთრის მზედგომა",
		btnSummer: "ზაფხული",
		btnWinter: "ზამთარი",
		pickMap: "არჩევა რუკაზე",
		captureView: "ხედის გადაღება",
		captureError: "სურათის გენერაცია ვერ მოხერხდა (რუკის სერვერის შეზღუდვა). სცადე ჩვეულებრივი ეკრანის ანაბეჭდი.",
		origin: "საწყისი",
		destiny: "დანიშნულება",
		noResults: "შედეგები არ არის",
		aqiGood: "კარგი",
		aqiModerate: "ზომიერი",
		aqiBad: "ცუდი",
		aqiNoData: "მონაცემები არ არის",
		layerBuildings: "3D შენობები",
		layerShadows: "ჩრდილები",
		layerClouds: "ღრუბლები",
		layerRoute: "მარშრუტი",
		walkModeStart: "სეირნობის დაწყება",
		walkModeStop: "სეირნობის შეჩერება",
		walkModeTracking: "შენი პოზიცია ითვალთვალება…",
		darkMapOn: "ბნელი რუკა",
		darkMapOff: "ნათელი რუკა",
		routeMapTitle: "მარშრუტი და 3D ჩრდილები",
		aguaVivoLabel: "რეკლამა ხარჯავს წყალს მთელ მსოფლიოში:",
		aguaVivoCalc: "დღეში 300 მლრდ ჩვენება × ~1 MB × 0,06 კვტსთ/გბ × 1,8 ლ/კვტსთ ≈ 375 ლ/წმ",
		originPlaceholder: "საწყისი წერტილი",
		destinationPlaceholder: "დანიშნულების წერტილი",
		layerSun: "მზის პოზიცია",
		resetBtn: "გადატვირთვა",
		evaluatingShadows: "ალტერნატიულ მარშრუტებზე ჩრდილი ფასდება…",
		s: "წმ",
		inShadow: "ჩრდილში",
		chosenMoreShadow: "არჩეულია მეტი ჩრდილის გამო",
		chosenShorter: "ჩრდილი მსგავსია, არჩეულია უფრო მოკლე",
		shadowStats: "ჩრდილი შენს მარშრუტზე",
		noShadowData: "ითვლება…",
		shadowGreat: "აბა, გენახლება! მარშრუტის ნახევარი ჩრდილში გადის",
		shadowGood: "მარშრუტის ნაწილებში კარგი ჩრდილია",
		shadowSome: "ცოტა ჩრდილია ხელმისაწვდომი",
		shadowNone: "ამ მარშრუტზე ჩრდილი თითქმის არ არის",
		of: "-დან",
		inShadowShort: "ჩრდილში",
		alternativesAvailable: "ალტერნატიული მარშრუტები შედარებულია",
		virtualWalkStart: "ვირტუალური სეირნობა 3D",
		virtualWalkStop: "სეირნობიდან გასვლა",
		virtualWalkHint: "ჩადი ქუჩაში დივნიდან ადგომის გარეშე: გაიარე მარშრუტი ისე, თითქოს ნამდვილად დადიხარ",
		virtualWalkUnsupported: "შენი ბრაუზერი არ უჭერ მხარს 3D ვირტუალურ სეირნობას.",
		shadeCoverage: "ჩრდილის დაფარვა",
		airDataUnavailable: "ჰაერის მონაცემები ახლა მიუწვდომელია.",
		irrLayerBtn: "მზის რადიაცია",
		irrPanelTitle: "რადიაციის ისტორია",
		irrYear: "წელი",
		irrMonth: "თვე",
		irrDay: "დღე",
		irrHour: "საათი (UTC)",
		irrLoading: "NASA POWER-ის მოთხოვნა…",
		irrAnnualLoading: "წლის შეჯამება იტვირთება…",
		irrNoData: "NASA-ს ამ თარიღისთვის მონაცემი არ აქვს.",
		irrError: "NASA-სთან კავშირი ახლა ვერ ხერხდება. სცადე რამდენიმე წამში.",
		irrDayOfMonth: "თვის დღე: ",
		irrHourOfDay: "დღის საათი: ",
		irrUmbra: "უმბრა: შენობის ჩრდილი (სრული დაცვა)",
		irrPenumbra: "პენუმბრა: ხის ჩრდილი (გაფილტრული სინათლე ~50 %)",
		irrSol: "პირდაპირი მზე: დაცვის გარეშე",
		irrExposureFactor: "ექსპოზიციის ფაქტორი",
		irrEffectiveExposure: "ეფექტური ექსპოზიცია აქ",
		irrAnnual: "წლიური რადიაცია",
		irrBestDay: "საუკეთესო დღე",
		irrWorstDay: "უარესი დღე",
		irrPeakHours: "მზის პიკური საათები",
		irrRealDays: "რეალური დღე",
		irrQueryPoint: "მოთხოვნის წერტილი",
		syncLink: "სინქრონიზაცია / მონაცემების ექსპორტი",
		syncHint: "შეინახე პარამეტრები ფაილში და აღადგინე სხვა მოწყობილობაზე. ანგარიშებისა და სერვერების გარეშე.",
		syncExportBtn: "ჩემი მონაცემების ექსპორტი",
		syncImportBtn: "მონაცემების იმპორტი",
		syncImportError: "ეს ფაილი არ არის Manolit∞ Aire-ის ასლი. არაფერი იმპორტირებულა.",
		// FAQ (preguntas frecuentes)
		faqTitle: "ხშირად დასმული კითხვები",
		faqIntro: "რასაც ნამდვილად მკითხავთ, პირდაპირ გიპასუხებთ.",
		faqQ1: "ეს ნამდვილად უფასოა?",
		faqA1: "დიახ. და ისევე იქნება. არც რეგისტრაცია, არც ხრიკი და არც დამალული ფასიანი ვერსია. შედიხარ, ჰაერს უყურებ და მიდიხარ.",
		faqQ2: "რატომ არ არის რეკლამა?",
		faqA2: "რადგან დღევანდელი რეკლამა ბანერი არაა. ეს აქციონებია, რომლებიც ყოველი ჩატვირთვისას შენი ზურგის უკან წყალსა და ბატარეას ხარჯავს. აქ მათ არ უშვებენ. პროექტი Ko-fi-ზე ადამიანების ნებაყოფლობითი მხარდაჭერით ძლება.",
		faqQ3: "საიდან მოდის ჰაერის მონაცემები?",
		faqA3: "ესპანეთის ოფიციალური სადგურებიდან და Copernicus-ის ევროპული მოდელებიდან, Open-Meteo-ს მეშვეობით. საჯარო, სამეცნიერო მონაცემები, არაფერია გამოგონილი.",
		faqQ4: "ჩრდილები ნამდვილია?",
		faqA4: "დიახ. ის ითვლება OpenStreetMap-ის შენობებით და მზის პოზიციით ყოველ წუთს. თუ რუკა ამბობს ჩრდილს, ნამდვილი შენობა გაძლევს მას.",
		faqQ5: "მადევნებთ თვალს?",
		faqA5: "არა. არც ტრეკერები და არც მესამე მხარის ქუქი-ფაილები. შენი პარამეტრები შენს ბრაუზერში ინახება და იქიდან არსაით მიდის.",
		faqQ6: "არსებობს მობილური აპლიკაცია?",
		faqA6: "საჭირო არაა. ვებსაიტი ნებისმიერი ტელეფონის ბრაუზერში მუშაობს, ინსტალაციისა და მეხსიერების დაკავების გარეშე. მთავარ ეკრანზე რომ შეინახო, აპლიკაციასავით იღება.",
		faqQ7: "ვინ აკეთებს ამას?",
		faqA7: "ერთი ადამიანი, სანდრო, სევილიიდან. კომპანიისა და მოგების მიზნის გარეშე. ღია მონაცემებით და პროექტის მხარდამჭერების დახმარებით.",
		faqQ8: "შემიძლია ჩემს ქალაქში გამოვიყენო?",
		faqA8: "ესპანეთში თუა, დიახ. სადგურები და შენობები მთელ ქვეყანას ფარავს. ესპანეთის გარეთ ჰაერი ბევრ ადგილას მუშაობს, მაგრამ ჩრდილები იმაზეა დამოკიდებული, რამდენად კარგად არის რაიონი OpenStreetMap-ში ნახატი.",
		faqQ9: "როგორ შემიძლია დახმარება?",
		faqA9: "გამოიყენე და მოუყევი სხვებს. თუ გინდა, მხარი დაუჭირე Ko-fi-ზე სერვერების გადასახადისთვის. შენი უბნის რუკაც შეგიძლია გააუმჯობესო OpenStreetMap-ში, უფასოა და ყველას ეხმარება.",
		// წყალი, რომელიც არ ჩანს (სექცია + მთვლელები). {n} არის ლიტრების რიცხვი.
		aguaTitulo: "წყალი, რომელიც არ ჩანს",
		aguaP1: "ეს უკვე შეფასება აღარ არის. ბოლო 30 დღის რეალური ტელემეტრია ამბობს ",
		aguaS1: "176.444 მოთხოვნა, 1,80 გბ და 4.819 ვიზიტი",
		aguaP2: ". ანუ ",
		aguaS2: "0,38 მბ და დაახლოებით 2 მილილიტრი წყალი ვიზიტზე",
		aguaP3: ", გაზომილი. იმავდროულად, მსოფლიო პროგრამული რეკლამა ხმარობს ",
		aguaS3: "დაახლოებით 375 ლიტრი ყოველ წამს",
		aguaP4: " არავის მოთხოვნილი რეკლამების აუქციონებზე. წელიწადში ათასობით ოლიმპიური აუზი.",
		aguaLink: "ნახე სრული ანგარიში, ყველა ვარაუდით →",
		aguaVivoTpl: "Manolit∞-ში შემოსვლის შემდეგ, მსოფლიო რეკლამებმა {n} ლიტრი წყალი დახარჯეს. შენი ვიზიტი აქ ~2 მლ, გაზომილი.",
		heroH1: "Manolito Aire. ჩრდილიანი მარშრუტები და ჰაერის ხარისხი რეალურ დროში",
		anadeLink: "დაამატე Manolit∞ შენს საიტზე",
		footerGithub: "ღია კოდი",
		co2Pregunta: "ეს გრილი მარშრუტი ფეხით რომ არ გაიარო, რითი იარებდი?",
		co2OpPie: "ფეხით (Manolitos გარეშე)",
		co2OpBici: "ველოსიპედი",
		co2OpCoche: "მანქანა",
		co2OpMoto: "მოტოციკლი",
		co2OpAutobus: "ავტობუსი",
		co2ResPie: "ფეხით იგივეს გამოყოფდი, 0 გ CO2. განსხვავება ისაა, რომ Manolitot გრილად დადიხარ.",
		co2ResBici: "ველოსიპედით იგივეს გამოყოფდი, 0 გ CO2. განსხვავება გზის სიგრილეა.",
		co2ResTpl: "ამ მარშრუტით ფეხით სიარულით თავიდან აიცილე დაახლოებით {c} CO2-ის ემისია, {m} სიარულის ნაცვლად.",
		co2MedioCoche: "მანქანით",
		co2MedioMoto: "მოტოციკლით",
		co2MedioAutobus: "ავტობუსით",
		co2Nota: "ეს კითხვა მხოლოდ შენთვისაა. შენი პასუხი არ ინახება და არ ტოვებს შენს ბრაუზერს.",
		// 01-oct-2026: სრული თარგმნის ბოლო ნაწილი (იხ. es ბლოკი).
		subBrand: "+ 3D ჩრდილები",
		splashTagline: "ისუნთქე ∞ იარე ∞ შეეფარე ∞ მონიშნე ∞",
		accBtn: "♿ ხელმისაწვდომი რეჟიმი",
		capasBtn: "ფენები",
		layerMicroclimate: "მიკროკლიმა",
		microTag: "სავარაუდო",
		groupContent: "რუკის შიგთავსი",
		groupBase: "საბაზისო რუკა",
		groupEntorno: "გარემო",
		groupSolSombra: "მზე და ჩრდილი",
		groupClimaAire: "კლიმატი და ჰაერი",
		groupRecorrido: "მარშრუტი",
		groupBaseInfra: "ბაზა და ინფრასტრუქტურა",
		groupEntornoClima: "გარემო და კლიმა",
		groupIluminacionSol: "განათება და მზე",
		capasTriggerAria: "რუკის ფენები",
		closeCapasAria: "ფენების პანელის დახურვა",
		gameIntroBtn: "ითამაშე მანოლიტ∞-თან",
		lidarBtn: "LiDAR რენდერი",
		colaboraTit: "შენს რაიონში 3D არ არის?",
		colaboraHint: "დააჭირე და გიტხრი როგორ გაასწორო 5 წუთში ▾",
		osmIntro: "Manolit∞ შენობებს და ხეებს ხაზავს <strong>OpenStreetMap (OSM)</strong>-ის მონაცემებით, თავისუფალი რუკით, რომელსაც ყველა ერთად ვქმნით. თუ შენი ქუჩა ცარიელია, <strong>შეგიძლია თავად დახატო 5 წუთში</strong> და მთელ უბანს ჩრდილი მიანიჭო:",
		osmPaso1: "შედი <a href=\"https://www.openstreetmap.org\" rel=\"noopener\">openstreetmap.org</a>-ზე, შექმენი უფასო ანგარიში და დააჭირე <strong>რედაქტირება</strong>.",
		osmPaso2: "<strong>ხეები:</strong><ul style=\"margin:4px 0 0;padding-left:1.2em;\"><li><em>ცალკე ხე</em> → დახატე <strong>წერტილი</strong> და დაამატე ტეგი <code>natural=tree</code>. თუ იცი სახეობა, უკეთესი: <code>species=Naranjo amargo</code> ან <code>genus=Citrus</code> (აგრეთვე <code>wikipedia=es:Naranjo</code>). ასე გამოჩნდება მისი ნამდვილი ვარჯით, ფერით და ნაყოფით.</li><li><em>ქუჩა ხეების რიგით</em> → დახატე <strong>ერთი ხაზი</strong> ტროტუარის გასწვრივ <code>natural=tree_row</code> ტეგით. ნუ დაამატებ თითო-თითო ხეს: Manolit∞ თავად დალაგებს მათ, ყოველ ~9 მ-ზე, შენი ხაზის მიხედვით.</li></ul>",
		osmPaso3: "<strong>შენობები:</strong> დახატე კონტური და დაამატე <code>building=yes</code>. თუ იცი სართულები, ჩაწერე <code>building:levels=4</code>. ასე ჩრდილი რეალურ სიმაღლეზე გამოვა და არა \"ნაგულისხმევად\".",
		osmPaso4: "შეინახე ცვლილებები… და მზადაა.",
		osmCuando: "<strong>როდის გამოჩნდება Manolit∞-ში?</strong> ნუ ინერვიულებ: რუკა თავისით ახლდება <strong>ყოველ კვირა</strong>, ასე რომ შენი წვლილი გამოჩნდება მაშინვე თუ არა, მალე. თუ კვირა გავიდა და არ ჩანს, ან გეჩქარება, <a href=\"https://github.com/sandrow007/manolito-aire/issues\" rel=\"noopener\">მომწერე აქედან</a> და ხელით ჩავსვამ განახლებას. 🌳",
		uvLabel: "UV ინდექსი",
		updatedPrefix: "განახლდა: ",
		updatedPlaceholder: "განახლდა: --",
		heroLoading: "შენი ქალაქის ჰაერი იტვირთება…",
		heroMoment: "ერთი წამი.",
		evolAire: "ჰაერის ცვლილება",
		legendHist: "ბოლო 48 საათი (რეალური მონაცემი)",
		legendFore: "მომდევნო 48 საათი (Copernicus/CAMS პროგნოზი)",
		quantumBadge: "Manolit∞ ქვანტური",
		quantumSub: "მომდევნო 5 დღის სიმულირებული პროგნოზი, პატიოსნად მოყოლილი",
		quantumDisclaimer: "ეს არ არის ოფიციალური ამინდის პროგნოზი. ეს არის მათემატიკური სიმულაცია (პროგრამულად სიმულირებული ქვანტური ფორმალიზმი, ნამდვილი ქვანტური აპარატურის გარეშე), რომელიც ალბათობებს ზემო რეალური პროგნოზიდან ითვლის. ჯანმრთელობის გადაწყვეტილებებისთვის მიჰყევი გრაფიკის მონაცემსა და ოფიციალურ წყაროებს, არა ამ რიცხვს.",
		footerFamiliaTxt: "Manolit∞ Aire სანდროს სამოქალაქო პროექტების ოჯახის ნაწილია: უფასო ინსტრუმენტები, რეგისტრაციისა და რეკლამის გარეშე.",
		footerEcoTxt: "ეკონომიური და მდგრადი ვებგვერდი, გაზომილი ციფრებით: 30 დღის რეალური ტელემეტრია გვაძლევს 0,38 MB-ს და დაახლოებით 2 მილილიტრ წყალს ვიზიტზე, ნაკლებს ვიდრე ხელოვნურ ინტელექტთან ერთი კითხვა. და რეკლამისა და აუქციონების გარეშე: მსოფლიო პროგრამული რეკლამა ყოველ წამს დაახლოებით 375 ლიტრ წყალს ხარჯავს; ეს მთელი საიტი, ერთი ყლუპი ვიზიტზე.",
		footerIgnTxt: "არასავალდებულო საბაზისო ფენა «IGN რუკა»: კარტოგრაფია © IGN / SCNE, CC BY 4.0 (scne.es)",
		donacionTxt: "Manolit∞ ყოველთვის უფასო იქნება.<br>სამწუხაროდ, სერვერები — არა...",
		kofiBtn: "მხარდაჭერა Ko‑fi-ზე",
		comparativaLink: "შედარება",
		queEsLink: "რა არის Manolit∞ ©",
		statusLoadedTpl: "ჩაიტვირთა {a}/{b} ცოცხალი წერტილი.",
		svgCarbon1: "0,015 g CO₂ / ვიზიტი · 99%-ზე სუფთა",
		svgCarbon2: "102,7 KB · 100% აღნახული ჰოსტინგი",
		svgCarbon3: "გაზომილი Website Carbon Calculator-ით (1ClickImpact) · 16/09/2026",
		pequeInit: "ჰაერი მხიარულია!",
		saludIcoSol: "მზე",
		saludIcoSombra: "ჩრდილი",
		saludIcoSalud: "ჯანმრთელობა",
		saludIcoAgua: "წყალი",
		saludIcoTemp: "ტემპ.",
		saludIcoPrev: "პრევენცია",
		saludIcoGroup: "გარემოს ჯანმრთელობის ხატულები: მზე, ჩრდილი, ჯანმრთელობა, წყალი, ტემპერატურა და პრევენცია",
		syncDoneTpl: "სინქრონიზდა: {a} პარამეტრი და {b} წერტილი. ყველაფრის სანახავად გადატვირთე Ctrl+Shift+R-ით.",
		syncImportError: "ეს ფაილი Manolit∞ Aire-ის სწორი ასლი არ არის.",
		syncReadError: "ფაილის წაკითხვა ვერ მოხერხდა.",
		treesLoading: "ხეები იტვირთება…",
		metaTitle: "ჩრდილიანი მარშრუტები და ჰაერი რეალურ დროში | Manolit∞ Aire",
		metaDesc: "დაგეგმე საფეხმავლო მარშრუტები ყველაზე ჩრდილიანი ქუჩებით და შეამოწმე ჰაერის ხარისხი ცოცხლად და მზის საათები. უფასო, რეგისტრაციისა და რეკლამის გარეშე.",
		and: "და",
		camBrujula: "კომპასი, ჩრდილოეთით დაბრუნება და ხედის გასწორება",
		camFull: "სრული ეკრანი",
		camPitchDown: "ქვემოთ გადახრა",
		camPitchUp: "ზემოთ გადახრა",
		camZoomIn: "გადიდება",
		camZoomOut: "შორება",
		layerLoadError: "ფენა ვერ ჩაიტვირთა. სცადე თავიდან.",
		locationCalibrating: "GPS კალიბრირდება, რამდენიმე წამი…",
		locationNotCalibrated: "GPS-მა ვერ მიაღწია კარგ სიზუსტეს (20 მ ან ნაკლები). მიდი ფანჯარასთან ან გადი გარეთ, ან დააჭირე «არჩევა რუკაზე» წერტილის ხელით მოსანიშნად.",
		locationUpdated: "მდებარეობა განახლდა",
		syncData: "სინქრონიზაცია / მონაცემების ექსპორტი",
		voiceGuide: "ხმოვანი გზამკვლევი",
		winterModeOff: "ზამთრის რეჟიმი გამორთულია: მარშრუტები ისევ ჩრდილს ეძებს.",
		winterModeOn: "ზამთრის რეჟიმი ჩართულია: შემდეგი მარშრუტი მზეს ეძებს (ჩრდილიანი მონაკვეთები მეტად იწონის).",
		winterSunRoute: "ზამთრის რეჟიმი: მარშრუტი მზით",
		camGroupLabel: "რუკის ზუმი და დახრა",
		a11yOffRoute: "ფრთხილად, როგორც ჩანს, გზადაგზანი მარშრუტიდან გადახვეჯი. გაჩერდი, გაიაზრე მიმართულება და, საჭიროების შემთხვევაში, უკან დაბრუნდი შენი კვალით.",
		stepsHide: "მიმართულებების დამალვა",
		stepsShow: "მიმართულებების ნახვა",
		voiceGranted: "ხმა ჩართულია. Manolit შენთან ერთად მიდის.",
		voiceNo: "ახლა არა",
		voicePermission: "გინდა Manolit ხმამაღლა ლაპარაკობდეს? ნებისმიერ დროს შეგიძლია შეცვალო.",
		voiceYes: "ხმის ნებართვა",
		closeLbl: "დახურვა",
		osmBtnError: "✕ შეცდომა",
		mapButtonsToggle: "რუკის ღილაკების ჩვენება ან დამალვა",
		sunPanelToggle: "მზის პოზიციის პანელის ჩვენება ან დამალვა",
		ignMapTitle: "ეროვნული გეოგრაფიული ინსტიტუტის კარტოგრაფია (CC BY 4.0 scne.es)",
		catastroTitle: "ესპანეთის კადასტრის სიმაღლეების ოფიციალური სიმკვრივე (უფასო, რეგისტრაციის გარეშე)",
		airChartLoadingData: "ჰაერის მონაცემები იტვირთება…",
		airChartAriaLabel: "ჰაერის გრაფიკი: უწყვეტი ხაზი უახლესი წარსული, წყვეტილი ხაზი პროგნოზი",
		airChartNow: "ახლა",
		airStatsTpl: "PM2.5 მომდევნო 24 საათი: საშუალო {m} µg/m³ · პიკი {p} · მინიმუმი {n}",
		airChartError: "ისტორია ვერ ჩაიტვირთა (API გადატვირთულია რუკის 500+ მოთხოვნით). სცადე გადატვირთვა რამდენიმე წამში.",
		airChartLoading: "ისტორია და პროგნოზი იტვირთება…",
		airGood: "კარგი ჰაერი",
		airMid: "ზომიერი ჰაერი",
		airBad: "ცუდი ჰაერი",
		saludSaturdayTitle: "Manolit∞ Aire · ჯანმრთელობის შაბათი",
		saludSaturdaySub: "+ ჯანმრთელობის შაბათი",
		qProbGood: "კარგი ჰაერის ალბათობა",
		qProbMid: "ზომიერი ჰაერის ალბათობა",
		qProbBad: "ცუდი ჰაერის ალბათობა",
		qDetailTpl: "{l}: {p} %. {d} მომდევნო 24 საათში. PM2.5 საშუალო პროგნოზი {m} µg/m³ ({a}-სა და {b}-ს შორის).",
		sun: "მზე",
		moon: "მთვარე",
		moonNew: "ახალი მთვარე",
		moonWaxCres: "მზარდი ნამგალა",
		moonFirstQ: "პირველი მეოთხედი",
		moonWaxGib: "მზარდი გიბოზური",
		moonFull: "სავსე მთვარე",
		moonWanGib: "მცხრალი გიბოზური",
		moonLastQ: "უკანასკნელი მეოთხედი",
		moonWanCres: "მცხრალი ნამგალა",
		askMe: "შეკითხე!",
		mapLayers: "რუკის ფენები",
		familyZoneAria: "Manolit-ის ოჯახი და რატომ არსებობს ეს",
		layerAirQuality: "ჰაერის ხარისხი",
		airLayerLive: "ცოცხალი შეფასება · Open-Meteo",
		airLayerOffSpain: "ჰაერის ფენა გამოირთო, ესპანეთის გარეთ სანდო წყარო არ გვაქვს.",
		saludBannerFinTpl: "მწვანე დროებითია, {f} ვებგვერდი თავის ჩვეულ იერს დაუბრუნდება.",
		escudosTitulo: "ფარები, რომლებიც გვიცავენ",
		escudosPorque: "გარემოს ჯანმრთელობის ოთხი საჯარო ობსერვატორია, შენი მხრიდან პლანეტამდე. ისინი აქვეყნებენ მონაცემებსა და სიცხის ზღურბლებს, რომლებზეც ეს ვებგვერდი ეყრდნობა, და მათი მუშაობა ყველას გვიცავს.",
	},
	// Las cadenas árabes se obtienen bajo demanda mediante el fallback MT
	// cacheado. El bloque explícito evita caer accidentalmente al español.
	ar: {}
};
=======
   MANOLITO AIRE, hoja de estilos compartida
   Tokens de color separados por tema para poder cambiar
   claro/oscuro y el acento sin tocar el resto del CSS.
   ============================================================ */

:root{
  /* --- tema claro (por defecto), paleta propia "Aire de Sevilla":
         petróleo de azulejo, mandarina eléctrica, jacarandá y menta viva.
         Nada de melocotones genéricos: esta paleta es solo de Manolit∞ --- */
  --sky-deep:#0E3B47;
  --sky-mid:#17788A;
  --mist:#E4F1EB;
  --paper:#F6FAF7;
  --ink:#0D1F26;
  --line: rgba(14,59,71,0.14);
  --surface: rgba(255,255,255,0.85);
  --border: rgba(14,59,71,0.14);
>>>>>>> cadc8ff0e84b07e20dbcc47be5725feed3262eec

  /* --- acento (tema de color, cambiable) --- */
  --accent: #FF6B1A;      /* mandarina de Sevilla, por defecto */
  --accent-soft: rgba(255,107,26,0.16);
  --accent-2: #7B2FFF;    /* jacarandá */
  --accent-text: #C24500; /* versión oscura del acento para texto (contraste AA) */

<<<<<<< HEAD
function getMessages() {
	const base = translations[currentLang] || translations.es;
	return currentLang === 'ar' ? Object.assign({}, translations.es, base) : base;
}

let dict = translations[currentLang] || translations.es;

function applyTranslations() {
	dict = translations[currentLang] || translations.es;
	document.querySelectorAll('[data-i18n]').forEach(el => {
		const key = el.getAttribute('data-i18n');
		if (dict[key]) el.textContent = dict[key];
		else if (currentLang === 'ar' && translations.es[key]) el.textContent = translations.es[key];
	});
	document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
		const key = el.getAttribute('data-i18n-placeholder');
		if (dict[key]) el.setAttribute('placeholder', dict[key]);
		else if (currentLang === 'ar' && translations.es[key]) el.setAttribute('placeholder', translations.es[key]);
	});
	document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
		const key = el.getAttribute('data-i18n-aria-label');
		if (dict[key]) el.setAttribute('aria-label', dict[key]);
		else if (currentLang === 'ar' && translations.es[key]) el.setAttribute('aria-label', translations.es[key]);
	});
	// 01-oct-2026: bloques con HTML interno (enlaces, strong, code) no caben en
	// textContent. Con data-i18n-html se traducen enteros por innerHTML.
	// Solo se usa en HTML escrito por nosotros, nunca con datos de terceros.
	document.querySelectorAll('[data-i18n-html]').forEach(el => {
		const key = el.getAttribute('data-i18n-html');
		if (dict[key]) el.innerHTML = dict[key];
		else if (currentLang === 'ar' && translations.es[key]) el.innerHTML = translations.es[key];
	});
	document.querySelectorAll('#langToggle button').forEach(b => {
		b.classList.toggle('active', b.dataset.lang === currentLang);
	});
	// 01-oct-2026: la pestaña del navegador y la description tambien cambian
	// de idioma, pero solo en la portada (index). Las demas paginas cargan
	// este mismo archivo y tienen sus propios title/description.
	const esInicio = /\/(index\.html)?$/.test(location.pathname);
	if (esInicio && dict.metaTitle) document.title = dict.metaTitle;
	if (esInicio && dict.metaDesc) {
		const md = document.querySelector('meta[name="description"]');
		if (md) md.setAttribute('content', dict.metaDesc);
	}
	document.documentElement.setAttribute('lang', currentLang);
	// La estructura de la interfaz permanece LTR en todos los idiomas. Poner
	// RTL en <html> reordena flex/grid y desplaza el planetario y sus controles;
	// el atributo lang ya informa del árabe sin alterar la maqueta existente.
	document.documentElement.setAttribute('dir', 'ltr');
=======
  /* --- estados del aire (no cambian con el tema) --- */
  --breath-good:#00B98A;  /* menta viva */
  --breath-mid:#FFB800;   /* sol de albero */
  --breath-bad:#E63E5F;   /* flamenco */

  /* --- tipografía hermanada con islasdecalorsevilla.com: sans de sistema
         para texto y display, mono para datos (aspecto profesional/tech) --- */
  --font-display:'SF Pro Display','Segoe UI',system-ui,-apple-system,sans-serif;
  --font-body:'SF Pro Display','Segoe UI',system-ui,-apple-system,sans-serif;
  --font-mono:'IBM Plex Mono','Courier New',monospace;
}

/* --- modo oscuro --- */
/* --- tema oscuro "Noche Cuántica": paleta hermanada con
       islasdecalorsevilla.com (azul noche profundo, cian neón, violeta
       jacarandá, dorado y turquesa para los estados del aire) --- */
[data-theme="dark"]{
  --sky-deep:#E8F0FF;
  --sky-mid:#00F0FF;
  --mist:#0A0C1F;
  --paper:#03050F;
  --ink:#E8F0FF;
  --line: rgba(0,240,255,0.14);
  --accent:#00F0FF;
  --accent-soft: rgba(0,240,255,0.13);
  --accent-2:#7B2FFF;
  --accent-text:#7DF9FF;
  --breath-good:#00FFC8;
  --breath-mid:#FFD745;
  --breath-bad:#FF00E5;
  --surface: rgba(10,12,31,0.88);
  --border: rgba(0,240,255,0.18);
>>>>>>> cadc8ff0e84b07e20dbcc47be5725feed3262eec
}

/* --- variantes de acento (paletas alternativas, todas con carácter) --- */
[data-palette="cosmos"]{   --accent:#00F0FF; --accent-soft: rgba(0,240,255,0.13); --accent-text:#00A3B0; }
[data-palette="amanecer"]{ --accent:#FF6B1A; --accent-soft: rgba(255,107,26,0.16); --accent-text:#C24500; }
[data-palette="salvia"]{   --accent:#00B98A; --accent-soft: rgba(0,185,138,0.16); --accent-text:#00785A; }
[data-palette="lavanda"]{  --accent:#7B2FFF; --accent-soft: rgba(123,47,255,0.14); --accent-text:#6A1FE0; }
[data-palette="coral"]{    --accent:#E63E5F; --accent-soft: rgba(230,62,95,0.14); --accent-text:#C11840; }
[data-theme="dark"][data-palette="cosmos"]{   --accent-text:#7DF9FF; }
[data-theme="dark"][data-palette="amanecer"]{ --accent-text:#FF9A5C; }
[data-theme="dark"][data-palette="salvia"]{   --accent-text:#2BD9A4; }
[data-theme="dark"][data-palette="lavanda"]{  --accent-text:#B28CFF; }
[data-theme="dark"][data-palette="coral"]{    --accent-text:#FF8FA8; }

*{ box-sizing:border-box; }
html,body{ margin:0; padding:0; }
body{
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-body);
  line-height:1.5;
  -webkit-font-smoothing:antialiased;
  transition: background 0.25s ease, color 0.25s ease;
}

a{ color: var(--sky-mid); }

/* ---------- barra superior, común a todas las páginas ---------- */
.topbar{
  display:flex; flex-wrap:wrap; gap:12px; align-items:center;
  justify-content: flex-start;
  padding: 16px 24px;
  border-bottom: 1px solid var(--line);
  background: var(--paper);
  /* z-index alto + transform propio: el canvas WebGL del mapa no puede
     pintarse NUNCA por encima de la barra al hacer scroll (en Chrome el
     canvas acelerado por GPU a veces se "subía" sobre el sticky) */
  position: sticky; top:0; z-index: 1000;
  transform: translateZ(0);
}
.topbar-right{
  display:flex; align-items:center; gap:14px; flex-wrap:wrap;
  margin-left: auto;
}
.wordmark{
  font-family: var(--font-display); font-weight:600; font-size: 1.2rem;
  color: var(--sky-deep); display:flex; align-items:baseline; gap:8px; text-decoration:none;
}
.wordmark span{
  font-family: var(--font-mono); font-size: 0.7rem; font-weight:600; color: var(--accent-text);
  background: var(--paper); padding: 2px 7px; border-radius: 999px; letter-spacing: 0.02em;
}
/* El nombre de la marca lleva un degradado animado que fluye por las letras
   (guiño al estilo de Islas de Calor Sevilla), con la paleta de esta web */
.wordmark .wordmark-name{
  font-family: var(--font-display); font-size: inherit; font-weight: inherit;
  padding: 0; border: none; border-radius: 0; letter-spacing: inherit;
  background: linear-gradient(110deg, var(--sky-deep) 0%, var(--sky-mid) 22%, var(--accent) 45%, var(--accent-2) 68%, var(--breath-good) 86%, var(--sky-deep) 100%);
  background-size: 300% 100%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
  filter: drop-shadow(0 0 9px rgba(255,107,26,0.32));
  animation: wordmarkFlow 6s ease-in-out infinite;
}
@keyframes wordmarkFlow{
  0%,100%{ background-position: 0% 50%; }
  50%{ background-position: 100% 50%; }
}
.topbar-right{ display:flex; align-items:center; gap:14px; flex-wrap:wrap; }

.chip-toggle{ display:flex; gap:2px; border:1px solid var(--line); border-radius:8px; overflow:hidden; }
.chip-toggle button{
  border:none; background:transparent; padding:6px 10px; font-family:var(--font-mono);
  font-size:0.7rem; cursor:pointer; color: var(--sky-mid);
}
.chip-toggle button.active{ background: var(--sky-deep); color:var(--paper); }

.icon-btn{
  border:1px solid var(--line); background:transparent; width:34px; height:34px;
  border-radius:50%; cursor:pointer; color:var(--sky-mid); font-size:1rem;
  display:flex; align-items:center; justify-content:center;
}
.icon-btn:hover{ border-color: var(--accent); color: var(--accent); }

.family-link{ font-size:0.78rem; color: var(--sky-mid); text-decoration:none; border-bottom:1px dotted var(--sky-mid); }
.family-link:hover{ color: var(--accent); border-color: var(--accent); }

/* ---------- hero / orbe ---------- */
.hero{ max-width: 720px; margin: 0 auto; padding: 48px 24px 20px; text-align:center; }
.city-picker{
  display:inline-flex; align-items:center; gap:8px; font-family:var(--font-mono);
  font-size:0.72rem; color: var(--sky-mid); background: var(--mist);
  padding: 6px 14px; border-radius: 999px; margin-bottom: 26px;
}
.city-picker select{ border:none; background:transparent; font-family:var(--font-mono); font-size:0.72rem; color: var(--sky-deep); font-weight:600; }
select{ color-scheme: light dark; }
select, select option{ background: var(--paper); color: var(--sky-deep); }

.orb-wrap{ position:relative; width: 200px; height:200px; margin: 0 auto 24px; display:flex; align-items:center; justify-content:center; }
.orb-ring{
  position:absolute; inset:0; border-radius:50%;
  border: 1px solid color-mix(in srgb, var(--state-color, var(--breath-good)) 35%, transparent);
  animation: ringPulse 4s ease-in-out infinite;
}
.orb{
  width: 138px; height:138px; border-radius:50%;
  background: radial-gradient(circle at 32% 28%, color-mix(in srgb, var(--state-color, var(--breath-good)) 60%, white 25%), var(--state-color, var(--breath-good)) 70%);
  animation: breathe 4s ease-in-out infinite;
  display:flex; align-items:center; justify-content:center;
  transition: background 0.6s ease;
}
.orb-face{ font-family: var(--font-mono); font-size:0.68rem; color: rgba(255,255,255,0.92); font-weight:500; text-transform:uppercase; letter-spacing:0.04em; }
@keyframes breathe{
  0%,100%{ transform: scale(0.92); }
  50%{ transform: scale(1.05); }
}
@keyframes ringPulse{
  0%,100%{ transform: scale(1); opacity:0.7; }
  50%{ transform: scale(1.18); opacity:0.15; }
}
@media (prefers-reduced-motion: reduce){ .orb, .orb-ring{ animation: none; } }

.human-line{ font-family: var(--font-display); font-weight: 600; font-size: clamp(1.4rem, 4vw, 2.1rem); color: var(--sky-deep); max-width: 520px; margin: 0 auto 10px; line-height:1.25; }
.sub-line{ color: var(--sky-mid); font-size:0.96rem; max-width:440px; margin:0 auto 20px; }
.tech-readout{ font-family: var(--font-mono); font-size: 0.75rem; color: var(--sky-deep); background: var(--mist); display:inline-block; padding: 8px 14px; border-radius: 10px; }

.im-lost-btn{
  margin-top: 22px; border:1px solid var(--sky-deep); background: transparent; color: var(--sky-deep);
  font-family: var(--font-body); font-weight:600; font-size:0.86rem; padding: 11px 20px; border-radius: 999px; cursor:pointer;
}
.im-lost-btn:hover{ background: var(--sky-deep); color: var(--paper); }

/* ---------- modos ---------- */
.modes{ max-width: 780px; margin: 40px auto 0; padding: 0 24px; }
.modes-label{ font-family: var(--font-mono); font-size:0.66rem; text-transform:uppercase; letter-spacing: 0.09em; color: var(--sky-mid); text-align:center; margin-bottom:14px; }
.mode-grid{ display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; }
@media (max-width: 640px){ .mode-grid{ grid-template-columns: repeat(2,1fr); } }
.mode-card{ border: 1px solid var(--line); background: var(--paper); border-radius: 14px; padding: 16px 12px; text-align:center; cursor:pointer; }
.mode-card:hover{ border-color: var(--accent); }
.mode-card.active{ background: var(--sky-deep); border-color: var(--sky-deep); }
.mode-card.active .mode-title, .mode-card.active .mode-sub{ color: var(--paper); }
.mode-mark{ font-family:var(--font-mono); font-size:0.75rem; display:inline-block; margin-bottom:6px; color:var(--accent-text); background:var(--paper); padding:0 5px; border-radius:4px; }
.mode-title{ font-family: var(--font-display); font-weight:600; font-size:0.9rem; color: var(--sky-deep); }
.mode-sub{ font-size:0.68rem; color: var(--sky-mid); margin-top:2px; }

/* ---------- mapa ---------- */
.map-section{ max-width: 1000px; margin: 46px auto 0; padding: 0 24px; }
.map-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px; }
/* Títulos de sección con el mismo degradado fluido que la marca:
   la página respira color, no un funeral blanco */
.map-title{
  font-family:var(--font-display); font-weight:600; font-size:1.15rem;
  background: linear-gradient(110deg, var(--sky-deep) 0%, var(--sky-mid) 30%, var(--accent) 55%, var(--breath-good) 80%, var(--sky-deep) 100%);
  background-size: 300% 100%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
  animation: wordmarkFlow 8s ease-in-out infinite;
}
/* isolation:isolate crea un contexto de apilamiento propio: nada de lo
   que el mapa pinte dentro (canvas WebGL, controles con z-index) puede
   salirse por encima de la barra superior fija al hacer scroll. */
.map-wrap{ position:relative; border-radius:16px; overflow:hidden; border:1px solid var(--line); isolation:isolate; }

/* El mapa de sombras 3D abre la página: marco de degradado cálido
   (naranja → azul → verde) para que tenga vida y no se mezcle con el fondo */
.map-section:has(#shadowRouteMap) .map-wrap{
  border: 2px solid transparent;
  background:
    linear-gradient(var(--paper), var(--paper)) padding-box,
    linear-gradient(120deg, var(--accent) 0%, var(--sky-mid) 50%, var(--breath-good) 100%) border-box;
  box-shadow: 0 18px 44px rgba(22,35,46,0.16), 0 0 0 5px rgba(255,107,26,0.07);
}
#map{ height: 460px; width:100%; background:var(--mist); }

/* El mapa de rutas y sombras 3D es la pieza protagonista: más alto y
   con altura fluida según el viewport (dvh corrige la barra del
   navegador en iPhone/Android, que con vh recortaba el mapa). */
#shadowRouteMap{
  width:100%;
  height: clamp(440px, 62vh, 760px);
  height: clamp(440px, 62dvh, 760px);
  background:var(--mist);
}

/* En móvil el mapa de sombras rompe el margen lateral y crece hasta
   casi toda la pantalla útil, respetando los bordes seguros del iPhone
   (notch / barra inferior) con safe-area-inset. */
@media (max-width: 640px){
  .map-section{ padding: 0 8px; }
  #shadowRouteMap{
    height: calc(72vh);
    height: calc(72dvh - env(safe-area-inset-top, 0px));
  }
  .map-wrap{ border-radius:12px; }
}

/* Rendimiento de scroll en móvil: las secciones largas que están
   fuera de pantalla no se renderizan hasta acercarse al viewport.
   contain-intrinsic-size evita saltos de barra de desplazamiento. */
.forecast-section, .map-section, .explain, .content{
  content-visibility: auto;
  contain-intrinsic-size: auto 900px;
}

/* Gestos táctiles fluidos sobre los mapas en iOS/Android */
.map-wrap, #shadowRouteMap, #map{
  -webkit-tap-highlight-color: transparent;
  touch-action: pan-x pan-y;
}
/* MapLibre gestiona sus propios gestos (pellizcar para zoom) */
#shadowRouteMap .maplibregl-canvas{ touch-action: none; }
.legend{ position:absolute; bottom:14px; left:14px; z-index:400; background:var(--paper); border:1px solid var(--line); border-radius:12px; padding:10px 14px; font-size:0.75rem; box-shadow:0 4px 14px rgba(0,0,0,0.1); }
.legend-row{ display:flex; align-items:center; gap:6px; margin:3px 0; }
.legend-dot{ width:10px; height:10px; border-radius:50%; }
.legend-note{ color: var(--sky-mid); margin-top:6px; font-style:italic; max-width:190px; }
.status-line{ text-align:center; font-family:var(--font-mono); font-size:0.68rem; color:var(--sky-mid); padding:8px; }
.popup-human{ font-family:var(--font-display); font-weight:600; font-size:0.96rem; color:var(--sky-deep); margin-bottom:4px; }
.popup-tech{ font-family:var(--font-mono); font-size:0.66rem; color:var(--sky-mid); }
.popup-tag{ font-size:0.63rem; color:var(--accent); font-family:var(--font-mono); margin-top:4px; display:block; }

[data-theme="dark"] .leaflet-control-zoom a{ background:var(--mist); color:var(--ink); border-color:var(--line); }
[data-theme="dark"] .leaflet-control-zoom a:hover{ background:var(--sky-deep); color:var(--paper); }
[data-theme="dark"] .leaflet-popup-content-wrapper,
[data-theme="dark"] .leaflet-popup-tip{ background:var(--paper); color:var(--ink); }
[data-theme="dark"] .leaflet-control-attribution{ background:rgba(0,0,0,0.55); color:var(--sky-mid); }
[data-theme="dark"] .leaflet-control-attribution a{ color:var(--sky-mid); }

/* ---------- sección "qué significa esto" ---------- */
.explain{ max-width: 720px; margin: 50px auto 0; padding: 0 24px; }
.explain h2{ font-family:var(--font-display); color:var(--sky-deep); font-size:1.4rem; }
.explain-card{ background: var(--mist); border-radius:16px; padding:18px 20px; margin-bottom:12px; }
.explain-card b{ color: var(--sky-deep); }

/* ---------- footer ---------- */
.footer{ margin-top: 60px; border-top: 1px solid var(--line); padding: 26px 24px 40px; text-align:center; color: var(--sky-mid); font-size:0.78rem; }
.footer-family{ margin-top:8px; font-family: var(--font-mono); font-size:0.75rem; }

/* ---------- chat flotante ---------- */
/* ---- Botón del chat: logo M∞ con anillo de degradado giratorio ----
   Los colores del anillo y de las letras vienen de --chat-ring / --chat-ink,
   que chat.js cambia en cada carga (7 variantes rotando). */
.chat-fab{
  position:fixed; bottom:22px; right:22px; z-index:1200;
  width:58px; height:58px; border-radius:50%; border:none; padding:0;
  background:transparent; cursor:pointer;
  filter: drop-shadow(0 6px 18px rgba(0,0,0,0.35));
  transition: transform .18s ease;
}
.chat-fab:hover{ transform: scale(1.07); }
.chat-fab:active{ transform: scale(0.97); }
.chat-fab-ring{
  display:flex; width:100%; height:100%; border-radius:50%; padding:3px;
  background: var(--chat-ring, conic-gradient(#00f0ff,#7b2fff,#ff00e5,#ff8800,#ffee00,#00ffc8,#00f0ff));
  animation: chatRingSpin 9s linear infinite;
}
.chat-fab-core{
  flex:1; border-radius:50%; background:#0B1220;
  display:flex; align-items:center; justify-content:center;
  font-family:var(--font-display); font-weight:700; font-size:1.02rem; letter-spacing:-0.02em;
  background-image: var(--chat-ink, linear-gradient(100deg,#00f0ff,#7b2fff,#ff00e5));
  -webkit-background-clip:text; background-clip:text;
  -webkit-text-fill-color:transparent; color:transparent;
  animation: chatRingSpinInv 9s linear infinite; /* contrarresta el giro: las letras quietas */
}
@keyframes chatRingSpin{ to{ transform: rotate(360deg); } }
@keyframes chatRingSpinInv{ from{ transform: rotate(0); } to{ transform: rotate(-360deg); } }
@media (prefers-reduced-motion: reduce){
  .chat-fab-ring, .chat-fab-core{ animation:none; }
}
/* Mini logo M∞ en la cabecera del panel */
.chat-logo{
  display:inline-flex; width:26px; height:26px; border-radius:50%; padding:2px;
  background: var(--chat-ring, conic-gradient(#00f0ff,#7b2fff,#ff00e5,#ff8800,#ffee00,#00ffc8,#00f0ff));
  margin-right:6px; flex-shrink:0;
}
.chat-logo i{
  flex:1; border-radius:50%; background:#0B1220; font-style:normal;
  font-family:var(--font-display); font-weight:700; font-size:8.5px;
  display:flex; align-items:center; justify-content:center;
  background-image: var(--chat-ink, linear-gradient(100deg,#00f0ff,#7b2fff,#ff00e5));
  -webkit-background-clip:text; background-clip:text;
  -webkit-text-fill-color:transparent; color:transparent;
}
/* El chat NO es modal: sin fondo oscuro ni bloqueo, se puede navegar
   por la web con el chat abierto. Se cierra con la X o con Escape. */
.chat-overlay{
  position:fixed; inset:0; background:transparent;
  display:none; align-items:flex-end; justify-content:flex-end; z-index:1200;
  padding: 0 22px 96px 0; pointer-events:none;
}
.chat-overlay.open{ display:flex; }
.chat-panel{
  background: var(--surface, var(--paper)); width:100%; max-width: 370px; border-radius: 18px;
  padding: 16px; max-height: 66vh; overflow-y:auto; pointer-events:auto;
  border: 1px solid var(--border, var(--line));
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 18px 50px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.08);
}
.chat-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.chat-title{ font-family:var(--font-display); font-weight:600; font-size:1rem; color: var(--sky-deep); }
.chat-msg{ background: var(--mist); border-radius: 12px; padding: 10px 12px; margin-bottom:8px; font-size:0.84rem; max-width: 88%; line-height:1.45; }
.chat-msg.mano{ background: var(--accent-soft); }
.chat-msg.user{ margin-left:auto; background: var(--sky-deep); color: var(--paper); }
.quick-qs{ display:flex; flex-wrap:wrap; gap:6px; margin: 10px 0; }
.quick-qs button{
  font-size:0.7rem; border:1px solid var(--line); background:transparent;
  border-radius:999px; padding:5px 11px; cursor:pointer; color: var(--sky-deep);
  transition: border-color .15s, background .15s;
}
.quick-qs button:hover{ border-color: var(--accent); background: var(--accent-soft); }
.chat-input-row{ display:flex; gap:7px; margin-top:6px; }
.chat-input-row input{
  flex:1; border:1px solid var(--line); border-radius:10px; padding:9px 12px;
  background:var(--paper); color:var(--ink); font-family: var(--font-body); font-size:0.84rem;
}
.chat-input-row button{ background: var(--sky-deep); color:var(--paper); border:none; border-radius:10px; padding: 0 15px; font-weight:600; font-size:0.82rem; cursor:pointer; }
.chat-status{ font-family:var(--font-mono); font-size:0.6rem; color:var(--sky-mid); margin-top:5px; }

/* En móvil el chat sigue siendo una hoja inferior a todo lo ancho */
@media (max-width: 640px){
  .chat-overlay{ justify-content:center; padding:0; }
  .chat-panel{ max-width:100%; border-radius:16px 16px 0 0; max-height:76vh; padding:16px 16px calc(14px + env(safe-area-inset-bottom, 0px)); }
}

/* (el antiguo .chat-fab-logo de texto ya no existe: el logo es el anillo M∞) */

/* ---------- páginas de contenido (about, legal) ---------- */
.content{ max-width: 680px; margin: 0 auto; padding: 40px 24px 60px; }
.content h1{ font-family:var(--font-display); color:var(--sky-deep); font-size:1.9rem; }
.content h2{ font-family:var(--font-display); color:var(--sky-deep); font-size:1.25rem; margin-top:34px; }
.content p{ color: var(--ink); }
.content .lead{ font-size:1.05rem; color: var(--sky-mid); }

/* ---------- gráfico de evolución ---------- */
.forecast-section{ max-width: 1000px; margin: 46px auto 0; padding: 0 24px; }
.chart-card{ background: var(--mist); border-radius:16px; padding:20px; margin-bottom:20px; }
#airChart{ width:100%; }
#airChart svg{ width:100%; height:auto; display:block; }
.chart-line-hist{ fill:none; stroke:var(--sky-mid); stroke-width:2; }
.chart-line-fore{ fill:none; stroke:var(--accent); stroke-width:2; stroke-dasharray:5 4; }
.chart-now-line{ stroke:var(--breath-bad); stroke-width:1; stroke-dasharray:2 3; }
.chart-axis-label{ font-family:var(--font-mono); font-size:9px; fill:var(--sky-mid); }
.chart-legend{ display:flex; gap:18px; margin-top:10px; font-size:0.75rem; color:var(--sky-mid); flex-wrap:wrap; background:var(--paper); border-radius:8px; padding:4px 8px; width:fit-content; }
.chart-legend i{ display:inline-block; width:14px; height:2px; margin-right:5px; vertical-align:middle; }
.dot-hist{ background:var(--sky-mid); }
.dot-fore{ background:var(--accent); border-top:2px dashed var(--accent); background:none; height:0; }

/* ---------- motor cuántico probabilístico ---------- */
.quantum-card{ background: var(--paper); border:1px solid var(--line); border-radius:16px; padding:22px; }
.quantum-head{ display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:16px; }
.quantum-badge{ font-family:var(--font-display); font-weight:700; color:var(--sky-deep); font-size:1.05rem; }
.quantum-sub{ font-family:var(--font-mono); font-size:0.75rem; color:var(--sky-mid); }
.quantum-bars{ display:flex; flex-direction:column; gap:10px; margin-bottom:16px; }
.qbar-row{ display:flex; align-items:center; gap:10px; }
.qbar-label{ width:90px; font-size:0.82rem; color:var(--ink); flex-shrink:0; }
.qbar-track{ flex:1; height:14px; background:var(--mist); border-radius:999px; overflow:hidden; }
.qbar-fill{ display:block; height:100%; border-radius:999px; transition:width 0.6s ease; }
.qbar-pct{ width:44px; text-align:right; font-family:var(--font-mono); font-size:0.78rem; color:var(--sky-mid); flex-shrink:0; }
.quantum-disclaimer{ font-size:0.78rem; color:var(--sky-mid); font-style:italic; line-height:1.5; margin:0; }

/* ---------- gráfica cuántica interactiva ---------- */
/* Cada barra es un botón: mismo layout que antes, pero clicable/tocable. */
.qbar-btn{
  appearance:none; -webkit-appearance:none;
  display:flex; align-items:center; gap:10px; width:100%; box-sizing:border-box;
  background:none; border:none; padding:5px 6px; margin:0;
  font:inherit; color:inherit; text-align:left; cursor:pointer;
  border-radius:10px;
}
.qbar-btn:hover, .qbar-btn.qbar-activo{ background:var(--mist); }
.qbar-btn.qbar-activo .qbar-pct{ color:var(--ink); font-weight:700; }
/* Los spans heredan las medidas de las clases originales (eran divs) */
.qbar-btn .qbar-label, .qbar-btn .qbar-track, .qbar-btn .qbar-pct{ display:block; }

/* Línea con los números reales del aire (media/pico/mínimo PM2.5) */
.quantum-stats{
  font-family:var(--font-mono); font-size:0.78rem; color:var(--sky-deep);
  margin:2px 0 10px; line-height:1.5;
}
/* Detalle al tocar una barra (también lo leen los lectores de pantalla) */
.quantum-detail{
  display:none; font-size:0.82rem; line-height:1.55; color:var(--ink);
  background:var(--mist); border-radius:10px; padding:10px 14px; margin-bottom:14px;
}
.quantum-detail.visible{ display:block; }

/* ---------- tooltip del gráfico (propio, no de librería) ---------- */
#airChart{ position:relative; }
.chart-hit{ cursor:crosshair; }
.chart-tooltip{
  position:absolute; z-index:10; pointer-events:none;
  background: var(--sky-deep); color: var(--paper);
  border-radius: 6px; padding: 6px 10px; font-family: var(--font-mono);
  font-size: 0.72rem; white-space:nowrap; transform: translateX(-50%);
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}
.chart-tooltip b{ display:block; font-size:0.78rem; }
.chart-tooltip span{ color: var(--accent); font-size:0.64rem; }

/* ---------- semana cuántica ---------- */
.week-label{ font-family:var(--font-mono); font-size:0.64rem; color:var(--sky-mid); text-transform:uppercase; letter-spacing:0.06em; margin:18px 0 8px; }
.quantum-week{ display:flex; gap:6px; align-items:flex-end; height:70px; }
.week-day{ flex:1; display:flex; flex-direction:column; align-items:center; height:100%; cursor:default; }
.week-bar-track{ flex:1; width:100%; display:flex; align-items:flex-end; }
.week-bar-fill{ width:100%; border-radius:3px 3px 0 0; min-height:4px; transition:height 0.4s ease; }
.week-day-label{ font-family:var(--font-mono); font-size:0.6rem; color:var(--sky-mid); text-transform:uppercase; margin-top:4px; }

/* ---------- gráfico interactivo ---------- */
.chart-wrap{ position:relative; }
.chart-hover-line{ stroke:var(--sky-deep); stroke-width:1; opacity:0.35; }
.chart-hover-dot{ fill:var(--accent); stroke:var(--paper); stroke-width:1.5; }
.chart-tooltip{
  position:absolute; top:-6px; transform: translate(-50%, -100%);
  background: var(--sky-deep); color: var(--paper); padding:8px 12px; border-radius:10px;
  pointer-events:none; white-space:nowrap; box-shadow:0 6px 16px rgba(0,0,0,0.2);
}
.chart-tooltip::after{
  content:''; position:absolute; bottom:-5px; left:50%; transform:translateX(-50%);
  border:5px solid transparent; border-top-color:var(--sky-deep);
}
.chart-tooltip .tt-date{ font-family:var(--font-mono); font-size:0.64rem; color:var(--accent); margin-bottom:2px; letter-spacing:0.02em; }
.chart-tooltip .tt-value{ font-family:var(--font-display); font-weight:600; font-size:0.92rem; }
.chart-tooltip .tt-tag{ color: rgba(251,250,247,0.6); font-style:italic; }

/* ---------- desglose de 5 días ---------- */
.qday-row{ display:flex; align-items:center; gap:12px; }
.qday-label{ width:70px; font-family:var(--font-mono); font-size:0.72rem; color:var(--sky-mid); flex-shrink:0; }
.qday-track{ flex:1; height:16px; border-radius:999px; overflow:hidden; display:flex; background:var(--mist); }
.qday-seg{ height:100%; transition:width 0.6s ease; }
.qday-dominant{ width:78px; text-align:right; font-family:var(--font-display); font-weight:600; font-size:0.78rem; color:var(--sky-deep); flex-shrink:0; }

.yayo-zoom-controls { display: none; gap: 16px; justify-content: center; align-items: center; margin-top: 18px; }
.yayo-zoom-btn {
  width: 64px; height: 64px; border-radius: 50%; border: 2px solid var(--sky-deep, #0E3B47);
  background: var(--paper, #FBFAF7); color: var(--sky-deep, #0E3B47);
  font-family: var(--font-display, 'Fraunces', serif); font-size: 1.6rem; font-weight: 700;
  cursor: pointer; box-shadow: 0 4px 14px rgba(14,59,71,0.18);
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.yayo-zoom-btn:hover { background: var(--accent-soft, rgba(255,107,26,0.16)); transform: translateY(-2px); box-shadow: 0 8px 20px rgba(14,59,71,0.22); }
.yayo-zoom-btn:active { transform: translateY(1px); }

/* ============================================================
   MEJORAS PARA LOS MODOS (CIENTÍFICO, YAYO, PEQUE)
   ============================================================ */

body.mode-cientifico .orb-face { font-family: 'IBM Plex Mono', monospace; font-size: 2.6rem; font-weight: 500; }
body.mode-cientifico .human-line { font-family: 'IBM Plex Mono', monospace; }
body.mode-cientifico .tech-readout { font-family: 'IBM Plex Mono', monospace; font-size: 1rem; color: var(--text-soft, #555); }

.sci-panel {
  display: none; margin: 1rem auto 0; background: var(--surface, rgba(255,255,255,0.85));
  backdrop-filter: blur(8px); border-radius: 1.2rem; padding: 0.8rem 1.2rem;
  font-family: 'IBM Plex Mono', monospace; font-size: 0.9rem; max-width: 340px;
  border: 1px solid var(--border, #ccc); text-align: left; color: var(--text, #333);
}
body.mode-cientifico .sci-panel { display: block; }
.sci-panel table { width: 100%; border-collapse: collapse; }
.sci-panel td { padding: 0.25rem 0; border-bottom: 1px dashed var(--border, #ccc); }
.sci-panel td:first-child { font-weight: 600; }
.sci-panel td:last-child { text-align: right; }
.sci-updated { font-size: 0.75rem; color: var(--text-soft, #777); margin-top: 0.5rem; text-align: right; }

body.mode-yayo .orb { width: 200px; height: 200px; }
body.mode-yayo .orb-face { font-size: 2.6rem; }
body.mode-yayo .orb-ring { width: 260px; height: 260px; }
body.mode-yayo .human-line { font-size: 1.8rem; line-height: 1.4; }
body.mode-yayo .sub-line { font-size: 1.4rem; }
body.mode-yayo .tech-readout { font-size: 1.3rem; }
body.mode-yayo .im-lost-btn { font-size: 1.2rem; padding: 0.8rem 1.6rem; }
body.mode-yayo .yayo-zoom-controls { display: flex; }

body.mode-peque .orb, body.mode-peque .orb-ring, body.mode-peque .tech-readout { display: none; }

.peque-character {
  display: none; flex-direction: column; align-items: center; justify-content: center;
  margin: 0 auto; width: 100%; animation: fadeIn 0.4s ease-out forwards;
}
body.mode-peque .peque-character { display: flex; }

.peque-cloud {
  width: 120px; height: 120px; position: relative; will-change: transform;
  animation: floatY 3s ease-in-out infinite, floatX 5s ease-in-out infinite;
}
.peque-cloud svg { width: 100%; height: 100%; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); }

@keyframes floatY { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes floatX { 0%, 100% { margin-left: 0; } 50% { margin-left: -4px; } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.peque-message {
  font-size: 1.5rem; font-weight: 700; color: var(--text, #333); text-align: center;
  margin-top: 0.8rem; background: var(--surface, rgba(255, 255, 255, 0.75));
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  padding: 0.4rem 1.4rem; border-radius: 2rem; border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
body.mode-peque .human-line { font-size: 1.4rem; font-weight: 600; color: var(--text, #444); margin-top: 0.5rem; }
body.mode-peque .sub-line { font-size: 1.1rem; color: var(--text-soft, #666); }

body.mode-peque .im-lost-btn {
  background: #FFD166; color: #333; font-weight: 600; font-size: 1.1rem; border-radius: 2rem;
  padding: 0.7rem 1.5rem; border: 2px solid #FFB347; box-shadow: 0 4px 8px rgba(255, 179, 71, 0.2);
  cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); will-change: transform, box-shadow;
}
body.mode-peque .im-lost-btn:hover { background: #FFC033; transform: translateY(-2px); box-shadow: 0 6px 14px rgba(255, 179, 71, 0.3); }
body.mode-peque .im-lost-btn:active { transform: translateY(1px); box-shadow: 0 2px 4px rgba(255, 179, 71, 0.2); }

/* ---- Efectos mágicos del modo peque ---- */
body.mode-peque .hero { position: relative; overflow: hidden; }
.peque-sparkle {
  position: absolute; bottom: -48px; pointer-events: none; z-index: 1;
  opacity: 0; will-change: transform, opacity;
  animation: pequeRise linear infinite;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.12));
}
@keyframes pequeRise {
  0%   { transform: translateY(0) rotate(-8deg) scale(0.7); opacity: 0; }
  12%  { opacity: 0.95; }
  50%  { transform: translateY(-44vh) rotate(10deg) scale(1.08); }
  100% { transform: translateY(-88vh) rotate(-6deg) scale(0.85); opacity: 0; }
}
/* La nube respira y baila con squash & stretch */
body.mode-peque .peque-cloud { animation: floatY 2.2s ease-in-out infinite, pequeSquash 1.6s ease-in-out infinite; }
@keyframes pequeSquash { 0%, 100% { scale: 1 1; } 30% { scale: 1.07 0.93; } 60% { scale: 0.95 1.07; } }
/* El mensaje aparece con un rebote alegre */
body.mode-peque .peque-message { animation: pequePop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
@keyframes pequePop { from { transform: scale(0.55); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .peque-sparkle { display: none; }
  body.mode-peque .peque-cloud { animation: floatY 3s ease-in-out infinite; }
}

.orb-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; }

/* ============================================================
<<<<<<< HEAD
   BOTÓN MÁGICO DE TRADUCCIÓN (01-oct-2026, orden directa de Sandro)
   "Dejad de traducir a mano elemento a elemento: que la página
   entera se traduzca sola, sin excepciones, sin romper lo que
   ya funciona."

   Cómo cubre TODO, en tres pisos, de más seguro a más automático:

   1) data-i18n (lo de siempre, INTACTO): applyTranslations sigue
      haciendo su trabajo arriba. Aquí no se toca.

   2) BARREDOR POR DICCIONARIO: se construye un índice inverso
      (texto español -> clave) a partir de translations.es y se
      recorre la página con un TreeWalker. Cualquier texto visible
      que exista en el diccionario se cambia por su traducción,
      aunque nadie le puso data-i18n. Solo coincidencias EXACTAS:
      nunca inventa, nunca adivina.

   3) TRADUCCIÓN AUTOMÁTICA (MT) de último recurso: lo que no está
      en el diccionario (frases nuevas que alguien meta mañana en
      el HTML sin avisar) se manda, una a una y sin prisa, a la
      ruta /traduce del worker (MyMemory, gratis, sin clave, UE).
      Cada frase se traduce UNA vez por idioma y se guarda en
      localStorage para siempre. Si el servicio falla o se acaba la
      cuota, la frase se queda en español y la consola no se entera.

   Reglas que no se saltan nada:
   - No toca scripts, estilos, código, ni lo que escribe la persona
     en el chat. La marca se protege con un marcador y se restaura
     intacta después de la MT. Las páginas legales (aviso, privacidad,
     cookies) solo se traducen por máquina al árabe.
   - En español no barre: solo devuelve a su texto original lo que
     hubiera traducido antes (cambiar de inglés a español restaura).
   - MutationObserver con espera de 300 ms: lo que aparezca después
     (globos del chat, paneles que se inyectan, el mapa) se traduce
     al llegar, sin bucles ni calentar el móvil. Nuestras propias
     escrituras no re-disparan traducciones porque el texto ya no
     coincide con el español del índice.
=======
   SELECTOR DE CIUDAD ELEGANTE
>>>>>>> cadc8ff0e84b07e20dbcc47be5725feed3262eec
   ============================================================ */
.city-picker { position: relative; display: flex; justify-content: center; margin: 1rem 0; }
.city-dropdown-btn {
  background: var(--surface, #fff); border: 1px solid var(--border, #ccc); border-radius: 2rem;
  padding: 0.7rem 1.8rem; font-family: 'Karla', sans-serif; font-weight: 600; font-size: 1rem;
  color: var(--text, #333); cursor: pointer; backdrop-filter: blur(6px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s;
}
.city-dropdown-btn:hover { background: var(--hover, #f0f0f0); }
.city-dropdown-btn::after { content: '▾'; font-size: 0.8rem; margin-left: 0.3rem; }
.city-dropdown-list {
  position: absolute; top: calc(100% + 0.5rem); left: 50%; transform: translateX(-50%);
  background: var(--surface, #fff); backdrop-filter: blur(12px); border: 1px solid var(--border, #ccc);
  border-radius: 1rem; box-shadow: 0 8px 24px rgba(0,0,0,0.12); list-style: none; padding: 0.4rem 0;
  margin: 0; width: max-content; min-width: 220px; max-height: 260px; overflow-y: auto; z-index: 100; display: none;
}
.city-dropdown-list.open { display: block; }
.city-dropdown-list li {
  padding: 0.6rem 1.2rem; font-family: 'Karla', sans-serif; font-size: 0.95rem;
  color: var(--text, #333); cursor: pointer; transition: background 0.15s;
}
city-dropdown-list li:hover { background: var(--hover, #f0f0f0); }
.city-dropdown-list li.selected { font-weight: 700; background: var(--hover, #e8e8e8); }

/* ============================================================
   APARTADO DE DONACIONES (DISCRETO)
   ============================================================ */
.footer-donacion { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dashed var(--line, #ccc); text-align: center; font-family: 'Karla', sans-serif; color: var(--text-soft, #666); }
.donacion-mensaje { font-size: 0.9rem; line-height: 1.4; margin: 0 0 0.6rem 0; }
.donacion-boton {
  display: inline-block; padding: 0.4rem 1.2rem; border: 1px solid var(--line, #ccc); border-radius: 2rem;
  font-size: 0.85rem; font-weight: 600; text-decoration: none; color: var(--ink, #333);
  background: var(--surface, rgba(255,255,255,0.7)); backdrop-filter: blur(4px); transition: background 0.2s, border-color 0.2s;
}
.donacion-boton:hover { background: var(--hover, #f0f0f0); border-color: #aaa; }

.rs-form{ display:flex; flex-wrap:wrap; gap:10px; }
.rs-form input[type="text"]{
  flex:1; min-width:200px; padding:10px 14px; border:1px solid var(--line);
  border-radius:10px; background:var(--paper); color:var(--ink);
  font-family:var(--font-body); font-size:0.9rem; outline:none;
}
.rs-form input[type="text"]:focus{ border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-soft); }
.rs-form .im-lost-btn{ margin:0; }
/* El botón protagonista del mapa: degradado acento → segundo acento,
   hermanado con el cian→violeta de islasdecalorsevilla.com */
#rsBuscarBtn{
  border:none;
  background: linear-gradient(120deg, var(--accent) 0%, var(--accent-2, #E04E00) 100%);
  color: var(--paper); font-weight:700;
  box-shadow: 0 6px 18px var(--accent-soft);
  transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
}
#rsBuscarBtn:hover{ background: linear-gradient(120deg, var(--accent) 0%, var(--accent-2, #E04E00) 100%); color:var(--paper); transform:translateY(-1px); filter:brightness(1.08); box-shadow:0 10px 24px var(--accent-soft); }
#rsBuscarBtn:active{ transform:translateY(1px); }
.rs-layer-toggles{ display:flex; gap:16px; flex-wrap:wrap; align-items:center; margin-bottom:10px; font-size:0.8rem; color:var(--sky-deep); font-weight:600; }
.rs-layer-toggles-lista{ display:flex; gap:16px; flex-wrap:wrap; align-items:center; }
.rs-layer-toggles.rs-plegado .rs-layer-toggles-lista{ display:none; }
#rsBtnPlegarCapas{
  font-family:inherit; font-size:0.72rem; letter-spacing:.05em; text-transform:uppercase;
  font-weight:700; padding:5px 12px; border-radius:999px; cursor:pointer;
  border:1px solid var(--line); background:var(--paper); color:var(--sky-deep);
  transition:background .15s, border-color .15s;
}
#rsBtnPlegarCapas:hover{ background:var(--accent-soft, rgba(255,107,26,0.16)); border-color:var(--accent); }
.rs-layer-toggles label{ display:flex; align-items:center; gap:6px; cursor:pointer; }
.rs-layer-toggles input[type="checkbox"]{ accent-color:var(--accent); width:15px; height:15px; cursor:pointer; }
.rs-sol-widget{
  position:absolute; bottom:14px; right:14px; z-index:400;
  background:var(--paper); border:1px solid var(--line); border-radius:14px;
  padding:10px; box-shadow:0 4px 14px rgba(0,0,0,0.15); text-align:center;
}
.rs-sol-cardinal{ font-family:var(--font-mono); font-size:8px; fill:var(--sky-mid); }
.rs-sol-info{ font-family:var(--font-mono); font-size:0.62rem; color:var(--sky-mid); display:flex; flex-direction:column; gap:1px; margin-top:4px; }

/* Planetario: canica azul (Tierra) + Sol + Luna, centrado y vivo */
.rs-planetario{ display:flex; flex-direction:column; align-items:center; width:100%; margin:16px auto 4px; text-align:center; }
.rs-planetario svg{ display:block; filter:drop-shadow(0 6px 18px rgba(14,59,71,0.18)); }
/* La cúpula respira con el tema y la paleta elegidos (color-mix con variables vivas) */
.rs-planetario-cielo{ fill:rgba(23,120,138,0.10); fill:color-mix(in srgb, var(--sky-mid) 11%, color-mix(in srgb, var(--accent) 11%, transparent)); transition:fill 1.2s ease; }
.rs-planetario[data-cielo="tarde"] .rs-planetario-cielo{ fill:rgba(255,107,26,0.18); fill:color-mix(in srgb, var(--accent) 22%, transparent); }
.rs-planetario[data-cielo="noche"] .rs-planetario-cielo{ fill:rgba(8,20,38,0.88); }
[data-theme="dark"] .rs-planetario-cielo{ fill:rgba(159,216,206,0.12); fill:color-mix(in srgb, var(--sky-mid) 15%, color-mix(in srgb, var(--accent) 12%, transparent)); }
[data-theme="dark"] .rs-planetario[data-cielo="tarde"] .rs-planetario-cielo{ fill:color-mix(in srgb, var(--accent) 24%, transparent); }
[data-theme="dark"] .rs-planetario[data-cielo="noche"] .rs-planetario-cielo{ fill:rgba(2,8,18,0.92); }
.rs-planetario[data-cielo="noche"] .rs-sol-cardinal{ fill:#9FD8CE; }
.rs-estrella{ fill:#ffffff; opacity:0; transition:opacity 1.2s ease; }
.rs-planetario[data-cielo="noche"] .rs-estrella{ opacity:0.85; }
#rsSolOrbe, #rsLunaOrbe{ transition:transform 1s linear, opacity 0.6s ease; }
#rsSolOrbe circle{ filter:drop-shadow(0 0 6px rgba(255,180,60,0.9)); }
#rsLunaOrbe circle{ filter:drop-shadow(0 0 3px rgba(200,215,235,0.7)); }
.rs-tierra-giro{ transform-box:fill-box; transform-origin:center; animation:rsGiroTierra 60s linear infinite; }
@keyframes rsGiroTierra{ to{ transform:rotate(360deg); } }
.rs-planetario-info{ font-family:var(--font-mono); font-size:0.62rem; color:var(--sky-mid); margin-top:4px; letter-spacing:0.02em; }
.rs-planetario-info > span{ display:block; }

/* ============================================================
   RUTA Y SOMBRAS 3D, sugerencias del autocompletado + mapa oscuro
   ============================================================ */

/* Lista de sugerencias del buscador de direcciones (usada por
   shadows-route.js; antes no tenía estilos propios en esta hoja,
   por eso salía sin formato / pegada al input). */
.rs-field{ position:relative; flex:1; min-width:200px; }
.rs-sugerencias{
  position:absolute; left:0; right:0; top:calc(100% + 4px); z-index:50;
  list-style:none; margin:0; padding:6px 0; display:none;
  background:var(--paper); border:1px solid var(--line); border-radius:12px;
  box-shadow:0 10px 28px rgba(0,0,0,0.14); max-height:260px; overflow-y:auto;
}
.rs-sugerencias li{
  padding:8px 14px; cursor:pointer; font-size:0.84rem; color:var(--ink);
  display:flex; flex-direction:column; gap:1px;
}
.rs-sugerencias li:hover{ background:var(--accent-soft); }
.rs-sugerencias li.rs-sug-empty{ color:var(--sky-mid); cursor:default; font-style:italic; }
.rs-sug-linea1{ font-weight:600; }
.rs-sug-linea2{ font-size:0.7rem; color:var(--sky-mid); }

<<<<<<< HEAD
	function traducirNodo(nodo) {
		let clave = nodoClave.get(nodo);
		if (!clave && currentLang === 'es') return; // en español no hay nada que buscar
		const d = translations[currentLang] || translations.es;
		if (!clave) {
			const n = normaliza(nodo.nodeValue);
			if (n.length < 3) return;
			clave = construirIndice().get(n);
			if (!clave) {
				ofrecerMTNodo(nodo, n);
				return;
			}
			nodoClave.set(nodo, clave);
			nodosVivos.add(nodo);
		}
		const dest = d[clave];
		if (currentLang === 'ar') {
			const fuente = translations.es[clave];
			if (typeof fuente === 'string' && fuente.indexOf('<') === -1) {
				ofrecerMTNodo(nodo, fuente);
			}
			return;
		}
		if (typeof dest !== 'string' || !dest) return;
		ponerTextoNodo(nodo, dest);
	}

	function traducirAtributo(el, attr) {
		const actual = el.getAttribute(attr);
		if (actual == null || actual === '') return;
		let mapa = attrClaves.get(el);
		let clave = mapa && mapa[attr];
		if (!clave && currentLang === 'es') return;
		const d = translations[currentLang] || translations.es;
		if (!clave) {
			const n = normaliza(actual);
			if (n.length < 3) return;
			clave = construirIndice().get(n);
			if (!clave) {
				ofrecerMTAtributo(el, attr, n);
				return;
			}
			if (!mapa) { mapa = {}; attrClaves.set(el, mapa); }
			mapa[attr] = clave;
			attrsVivos.add(el);
		}
		const dest = d[clave];
		if (currentLang === 'ar') {
			const fuente = translations.es[clave];
			if (typeof fuente === 'string' && fuente.indexOf('<') === -1) {
				ofrecerMTAtributo(el, attr, fuente);
			}
			return;
		}
		if (typeof dest !== 'string' || !dest) return;
		if (actual !== dest) {
			escribiendo = true;
			el.setAttribute(attr, dest);
			escribiendo = false;
		}
	}
=======
/* Fondo del contenedor del mapa cuando el modo oscuro está activo:
   el filtro CSS que oscurece de verdad el lienzo lo añade
   shadows-route.js sobre #shadowRouteMap .maplibregl-canvas; esto es
   solo el color de fondo mientras cargan los tiles. */
.rs-mapa-oscuro-activo{ background:#0b0f14; }

/* El mapa nacional (Leaflet) también se oscurece con la web:
   solo las teselas, los puntos de colores quedan intactos */
[data-theme="dark"] #map .leaflet-tile-pane{
  filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92) saturate(0.85);
}
/* ============================================================
   MODO NOCHE, widgets flotantes del mapa
   Cuando la web está en modo oscuro (o el usuario pulsa
   "Mapa oscuro" a mano), TODOS los paneles sobre el mapa pasan
   a cristal oscuro con acento mandarina: nada de focos blancos.
   ============================================================ */
[data-theme="dark"] #rsTimeControls,
.rs-mapa-oscuro-activo #rsTimeControls,
[data-theme="dark"] #irrPanel,
.rs-mapa-oscuro-activo #irrPanel,
[data-theme="dark"] #rsShadowBadge,
.rs-mapa-oscuro-activo #rsShadowBadge{
  background: linear-gradient(160deg, rgba(10,30,38,0.95) 0%, rgba(64,32,10,0.42) 100%);
  border-color: rgba(255,122,51,0.38);
  color: #E8F4F0;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}
[data-theme="dark"] #rsTimeLabel,
.rs-mapa-oscuro-activo #rsTimeLabel{ color:#FF9A5C; }
[data-theme="dark"] #rsTimeControls .rs-eyebrow,
.rs-mapa-oscuro-activo #rsTimeControls .rs-eyebrow{ color:#9FD8CE; }
[data-theme="dark"] #rsGoldenBadge,
.rs-mapa-oscuro-activo #rsGoldenBadge{
  background:rgba(255,122,51,0.16); border-color:rgba(255,122,51,0.45); color:#FF9A5C;
}
[data-theme="dark"] #rsTimeControls .rs-divisor,
.rs-mapa-oscuro-activo #rsTimeControls .rs-divisor{ background:rgba(232,244,240,0.16); }
[data-theme="dark"] #rsTimeControls button,
.rs-mapa-oscuro-activo #rsTimeControls button{
  background:rgba(232,244,240,0.09); color:#E8F4F0; border-color:rgba(232,244,240,0.2);
}
[data-theme="dark"] #rsTimeControls button:hover,
.rs-mapa-oscuro-activo #rsTimeControls button:hover{
  background:rgba(255,122,51,0.22); border-color:#FF7A33;
}
[data-theme="dark"] #rsTimeControls button.rs-btn-capturar,
.rs-mapa-oscuro-activo #rsTimeControls button.rs-btn-capturar{ color:#9FD8CE; }
[data-theme="dark"] #rsPlegarBtn,
.rs-mapa-oscuro-activo #rsPlegarBtn{ color:#9FD8CE; }
[data-theme="dark"] #rsTimeSlider::-webkit-slider-runnable-track,
.rs-mapa-oscuro-activo #rsTimeSlider::-webkit-slider-runnable-track{ background:rgba(232,244,240,0.25); }
[data-theme="dark"] #rsTimeSlider::-moz-range-track,
.rs-mapa-oscuro-activo #rsTimeSlider::-moz-range-track{ background:rgba(232,244,240,0.25); }
[data-theme="dark"] #rsTimeSlider::-webkit-slider-thumb,
.rs-mapa-oscuro-activo #rsTimeSlider::-webkit-slider-thumb{ border-color:#0A1E26; }
[data-theme="dark"] #rsTimeSlider::-moz-range-thumb,
.rs-mapa-oscuro-activo #rsTimeSlider::-moz-range-thumb{ border-color:#0A1E26; }
>>>>>>> cadc8ff0e84b07e20dbcc47be5725feed3262eec

[data-theme="dark"] #rsMapControls button,
.rs-mapa-oscuro-activo #rsMapControls button,
[data-theme="dark"] #rsMapStyleToggle button,
.rs-mapa-oscuro-activo #rsMapStyleToggle button{
  background:rgba(10,30,38,0.88); color:#E8F4F0;
  border-color:rgba(232,244,240,0.22); box-shadow:0 3px 10px rgba(0,0,0,0.4);
}
[data-theme="dark"] #rsMapControls button:hover,
.rs-mapa-oscuro-activo #rsMapControls button:hover,
[data-theme="dark"] #rsMapStyleToggle button:hover,
.rs-mapa-oscuro-activo #rsMapStyleToggle button:hover{
  background:var(--accent-soft); border-color:var(--accent);
}
[data-theme="dark"] #rsMapControls button.rs-activo,
.rs-mapa-oscuro-activo #rsMapControls button.rs-activo{
  background:linear-gradient(120deg, var(--accent) 0%, var(--accent-2, #FF7A33) 100%);
  color:#03050F; border-color:transparent; box-shadow:0 4px 14px var(--accent-soft);
}
[data-theme="dark"] #rsShadowBadgeCerrar,
.rs-mapa-oscuro-activo #rsShadowBadgeCerrar{ color:#9FD8CE; }
[data-theme="dark"] #rsJoystick,
.rs-mapa-oscuro-activo #rsJoystick{
  background:rgba(10,30,38,0.55); border-color:rgba(232,244,240,0.25);
}
[data-theme="dark"] #rsJoystickKnob,
.rs-mapa-oscuro-activo #rsJoystickKnob{ border-color:#0A1E26; }

[data-theme="dark"] #irrPanel .irr-cabecera,
.rs-mapa-oscuro-activo #irrPanel .irr-cabecera{ color:#E8F4F0; }
[data-theme="dark"] #irrPanel label,
.rs-mapa-oscuro-activo #irrPanel label,
[data-theme="dark"] #irrPanel .irr-leyenda,
.rs-mapa-oscuro-activo #irrPanel .irr-leyenda,
[data-theme="dark"] #irrLeyendaAtenuacion,
.rs-mapa-oscuro-activo #irrLeyendaAtenuacion{ color:#9FD8CE; }
[data-theme="dark"] #irrPanel input[type=number],
.rs-mapa-oscuro-activo #irrPanel input[type=number]{
  background:rgba(232,244,240,0.09); color:#E8F4F0; border-color:rgba(232,244,240,0.2);
}
[data-theme="dark"] #irrPanel input[type=range]::-webkit-slider-runnable-track,
.rs-mapa-oscuro-activo #irrPanel input[type=range]::-webkit-slider-runnable-track{ background:rgba(232,244,240,0.25); }
[data-theme="dark"] #irrPanel input[type=range]::-webkit-slider-thumb,
.rs-mapa-oscuro-activo #irrPanel input[type=range]::-webkit-slider-thumb{ border-color:#0A1E26; }
[data-theme="dark"] #irrResumen b,
.rs-mapa-oscuro-activo #irrResumen b{ color:#E8F4F0; }
[data-theme="dark"] #irrCerrar,
.rs-mapa-oscuro-activo #irrCerrar{ color:#9FD8CE; }

<<<<<<< HEAD
	/* ---------------- Tercer piso: traducción automática ----------------
	   Cola concurrente y cacheada: varias peticiones pequeñas en paralelo
	   para que una página completa no tarde minutos en quedar traducida.
	   La marca queda fuera; en las páginas legales solo se activa para árabe. */
	const MT_IDIOMAS = { ca: 'ca', eu: 'eu', gl: 'gl', en: 'en', ka: 'ka', ar: 'ar' };
	const mtItems = new Set();          // { original, aplicar, restaurar, conectado }
	const mtPendientes = new Map();     // texto español -> [items esperando]
	const mtNodosReg = new WeakSet();   // nodos ya apuntados a la MT
	const mtAttrsReg = new WeakMap();   // elemento -> Set de atributos apuntados
	const MT_MAX_CHARS = 360;           // deja margen bajo el límite de 400 del Worker
	const MT_CONCURRENCIA = 6;
	let mtActivas = 0;
	const esPaginaLegal = /(aviso-legal|privacidad|cookies|cookie)/i.test(location.pathname);
=======
/* Atribución del mapa y mini-controles nativos en noche */
[data-theme="dark"] .maplibregl-ctrl-attrib,
.rs-mapa-oscuro-activo .maplibregl-ctrl-attrib{ background:rgba(10,30,38,0.72); }
[data-theme="dark"] .maplibregl-ctrl-attrib a,
.rs-mapa-oscuro-activo .maplibregl-ctrl-attrib a{ color:#9FD8CE; }
[data-theme="dark"] .maplibregl-ctrl-group,
.rs-mapa-oscuro-activo .maplibregl-ctrl-group{ background:rgba(10,30,38,0.88); }
[data-theme="dark"] .maplibregl-ctrl-group button,
.rs-mapa-oscuro-activo .maplibregl-ctrl-group button{ background:transparent; }
>>>>>>> cadc8ff0e84b07e20dbcc47be5725feed3262eec

/* ---------- Accesibilidad: objetivos táctiles ---------- */
/* El botón "i" de atribución de MapLibre medía 20×20px (mínimo táctil 24×24) */
.maplibregl-ctrl-attrib-button{ min-width:26px !important; min-height:26px !important; }

<<<<<<< HEAD
	function esTraducibleMT(n) {
		if (!n || n.length < 3 || n.length > MT_MAX_CHARS) return false;
		if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(n)) return false;
		const sinMarca = n.replace(/manolit∞?(?:\s+aire)?/gi, '').trim();
		if (!sinMarca) return false;                       // solo la marca no se toca
		if (/^(https?:|www\.|#|\/)/i.test(n)) return false; // URLs y anclas
		if (/^[\d\s.,:;%€$+\-–—/()'"¿?¡!]+$/.test(n)) return false; // sin letras reales
		return true;
	}

	function protegerMarcasMT(texto) {
		const marcas = [];
		const consulta = texto.replace(/manolit∞?(?:\s+aire)?/gi, marca => {
			const indice = marcas.push(marca) - 1;
			return 'MANOLIT_BRAND_' + indice;
		});
		return { consulta, marcas };
	}

	function restaurarMarcasMT(texto, marcas) {
		return texto.replace(/MANOLIT_BRAND_(\d+)/gi, (completo, indice) => {
			const marca = marcas[Number(indice)];
			return marca || completo;
		});
	}

	function encolarMT(item) {
		if (currentLang === 'es' || !MT_IDIOMAS[currentLang]) return;
		if (item.soloAr && currentLang !== 'ar') return;
		if (esPaginaLegal && currentLang !== 'ar') return;
		if (!esTraducibleMT(item.original)) return;
		mtItems.add(item);
		const enCache = mtCacheLeer(currentLang, item.original);
		if (enCache) { item.aplicar(enCache, currentLang); return; }
		const lista = mtPendientes.get(item.original) || [];
		lista.push(item);
		mtPendientes.set(item.original, lista);
		procesarMT();
	}

	function procesarMT() {
		while (mtActivas < MT_CONCURRENCIA && mtPendientes.size) {
			const primero = mtPendientes.keys().next();
			if (primero.done) return;
			const texto = primero.value;
			const items = mtPendientes.get(texto) || [];
			mtPendientes.delete(texto);
			const lang = currentLang;
			if (!MT_IDIOMAS[lang]) continue;
			const protegido = protegerMarcasMT(texto);
			mtActivas++;
			fetch('/traduce?q=' + encodeURIComponent(protegido.consulta) + '&a=' + MT_IDIOMAS[lang])
				.then(r => (r && r.ok ? r.json() : null))
				.then(d => {
					if (!d || !d.ok || typeof d.texto !== 'string' || !d.texto.trim()) return;
					const traducido = restaurarMarcasMT(d.texto, protegido.marcas);
					mtCacheGuardar(lang, texto, traducido);
					items.forEach(i => { if (i.conectado()) i.aplicar(traducido, lang); });
				})
				.catch(() => {
					// La interfaz conserva el texto original si el proxy o el
					// proveedor de traducción no están disponibles.
				})
				.finally(() => {
					mtActivas--;
					procesarMT();
				});
		}
	}

	function dividirMT(texto) {
		if (texto.length <= MT_MAX_CHARS) return [texto];
		const partes = [];
		let resto = texto;
		while (resto.length > MT_MAX_CHARS) {
			let corte = resto.lastIndexOf(' ', MT_MAX_CHARS);
			if (corte < Math.floor(MT_MAX_CHARS * 0.55)) corte = MT_MAX_CHARS;
			partes.push(resto.slice(0, corte).trim());
			resto = resto.slice(corte).trim();
		}
		if (resto) partes.push(resto);
		return partes;
	}

	function ofrecerMTNodo(nodo, n, opciones) {
		if (currentLang === 'es' || mtNodosReg.has(nodo)) return;
		mtNodosReg.add(nodo);
		const v = nodo.nodeValue;
		const cabeza = /^\s*/.exec(v)[0], cola = /\s*$/.exec(v)[0];
		const fuente = opciones && typeof opciones.fuente === 'string' ? opciones.fuente : n;
		const soloAr = Boolean(opciones && opciones.soloAr);
		const partes = dividirMT(fuente);
		const traducidas = new Array(partes.length);
		const pintarCompleto = () => {
			if (!traducidas.every(Boolean)) return;
			escribiendo = true;
			nodo.nodeValue = cabeza + traducidas.join(' ') + cola;
			escribiendo = false;
		};
		partes.forEach((parte, indice) => {
			encolarMT({
				original: parte,
				soloAr,
				conectado: () => nodo.isConnected,
				aplicar: (txt, lang) => {
					if (lang !== currentLang) return;
					if (soloAr && lang !== 'ar') return;
					traducidas[indice] = txt.trim();
					pintarCompleto();
				},
				restaurar: () => {
					escribiendo = true;
					nodo.nodeValue = cabeza + fuente + cola;
					escribiendo = false;
				}
			});
		});
	}

	function ofrecerMTAtributo(el, attr, n, opciones) {
		if (currentLang === 'es') return;
		let reg = mtAttrsReg.get(el);
		if (reg && reg.has(attr)) return;
		if (!reg) { reg = new Set(); mtAttrsReg.set(el, reg); }
		reg.add(attr);
		const fuente = opciones && typeof opciones.fuente === 'string' ? opciones.fuente : n;
		encolarMT({
			original: fuente,
			soloAr: Boolean(opciones && opciones.soloAr),
			conectado: () => el.isConnected,
			aplicar: (txt, lang) => {
				if (lang !== currentLang) return;
				escribiendo = true;
				el.setAttribute(attr, txt);
				escribiendo = false;
			},
			restaurar: () => {
				escribiendo = true;
				el.setAttribute(attr, fuente);
				escribiendo = false;
			}
		});
	}

	const arMetadatosReg = new Set();
	function ofrecerMTMetadato(id, fuente, aplicar, restaurar) {
		if (currentLang !== 'ar' || arMetadatosReg.has(id)) return;
		arMetadatosReg.add(id);
		encolarMT({
			original: fuente,
			soloAr: true,
			conectado: () => true,
			aplicar,
			restaurar
		});
	}

	function traducirMetadatosArabe() {
		if (currentLang !== 'ar') return;
		const titulo = translations.es.metaTitle;
		if (typeof titulo === 'string') {
			ofrecerMTMetadato(
				'title',
				titulo,
				(txt, lang) => { if (lang === currentLang) document.title = txt; },
				() => { document.title = titulo; }
			);
		}
		const descripcion = translations.es.metaDesc;
		const metaDescripcion = document.querySelector('meta[name="description"]');
		if (metaDescripcion && typeof descripcion === 'string') {
			ofrecerMTMetadato(
				'meta-description',
				descripcion,
				(txt, lang) => { if (lang === currentLang) metaDescripcion.setAttribute('content', txt); },
				() => { metaDescripcion.setAttribute('content', descripcion); }
			);
		}
		[
			['meta[property="og:title"]', 'og-title'],
			['meta[property="og:description"]', 'og-description'],
			['meta[name="twitter:title"]', 'twitter-title'],
			['meta[name="twitter:description"]', 'twitter-description']
		].forEach(([selector, id]) => {
			const el = document.querySelector(selector);
			if (!el) return;
			const fuente = el.getAttribute('content') || '';
			if (!fuente) return;
			ofrecerMTMetadato(
				id,
				fuente,
				(txt, lang) => { if (lang === currentLang) el.setAttribute('content', txt); },
				() => { el.setAttribute('content', fuente); }
			);
		});
	}

	const arClavesReg = new WeakSet();
	const arAttrsReg = new WeakMap();
	function barrerHTMLArabe(raiz) {
		const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
		const nodos = [];
		while (walker.nextNode()) {
			const nodo = walker.currentNode;
			if (!nodo.nodeValue || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(nodo.nodeValue)) continue;
			let saltar = false;
			for (let p = nodo.parentElement; p && p !== raiz; p = p.parentElement) {
				if (SALTAR_TAGS[p.tagName] || p.isContentEditable || p.getAttribute('translate') === 'no') {
					saltar = true;
					break;
				}
			}
			if (!saltar) nodos.push(nodo);
		}
		nodos.forEach(nodo => ofrecerMTNodo(nodo, normaliza(nodo.nodeValue), { soloAr: true }));
	}

	function traducirClavesArabe() {
		if (currentLang !== 'ar') return;
		const fuenteEs = translations.es;
		document.querySelectorAll('[data-i18n]').forEach(el => {
			if (arClavesReg.has(el)) return;
			const clave = el.getAttribute('data-i18n');
			const fuente = fuenteEs[clave];
			if (typeof fuente !== 'string' || fuente.indexOf('<') !== -1) return;
			arClavesReg.add(el);
			// Si se llega aquí desde otro idioma, se vuelve primero a la
			// fuente española para que nunca se encole el texto georgiano,
			// inglés, etc. como si fuera una frase nueva.
			el.textContent = fuente;
			if (el.firstChild && el.firstChild.nodeType === 3) {
				ofrecerMTNodo(el.firstChild, fuente, { soloAr: true, fuente });
			}
			barrerHTMLArabe(el);
		});
		document.querySelectorAll('[data-i18n-html]').forEach(el => {
			if (arClavesReg.has(el)) return;
			const clave = el.getAttribute('data-i18n-html');
			const fuente = fuenteEs[clave];
			if (typeof fuente !== 'string') return;
			arClavesReg.add(el);
			el.innerHTML = fuente;
			barrerHTMLArabe(el);
		});
		[
			['data-i18n-placeholder', 'placeholder'],
			['data-i18n-aria-label', 'aria-label']
		].forEach(([selector, attr]) => {
			document.querySelectorAll('[' + selector + ']').forEach(el => {
				const clave = el.getAttribute(selector);
				const fuente = fuenteEs[clave];
				if (typeof fuente !== 'string' || fuente.indexOf('<') !== -1) return;
				let vistos = arAttrsReg.get(el);
				if (!vistos) {
					vistos = new Set();
					arAttrsReg.set(el, vistos);
				}
				if (vistos.has(attr)) return;
				vistos.add(attr);
				if (el.getAttribute(attr) !== fuente) el.setAttribute(attr, fuente);
				ofrecerMTAtributo(el, attr, fuente, { soloAr: true, fuente });
			});
		});
	}

	// Cambio de idioma con la MT en marcha: lo traducido por máquina se
	// restaura (español), se aplica desde caché o se vuelve a encolar.
	function repintarMT() {
		mtItems.forEach(item => {
			if (!item.conectado()) { mtItems.delete(item); return; }
			if (currentLang === 'es') { item.restaurar(); return; }
			if (item.soloAr && currentLang !== 'ar') { item.restaurar(); return; }
			if (esPaginaLegal && currentLang !== 'ar') { item.restaurar(); return; }
			const enCache = mtCacheLeer(currentLang, item.original);
			if (enCache) item.aplicar(enCache, currentLang);
			else encolarMT(item);
		});
	}

	function repintarCacheArabe() {
		if (currentLang !== 'ar') return;
		mtItems.forEach(item => {
			if (!item.soloAr || !item.conectado()) return;
			const enCache = mtCacheLeer('ar', item.original);
			if (enCache) item.aplicar(enCache, 'ar');
		});
	}

	// Lo que se inyecta después (chat, paneles, mapa) pasa por aquí.
	let barridoPendiente = null;
	function alMutar(muts) {
		if (escribiendo || currentLang === 'es') return;
		if (barridoPendiente) clearTimeout(barridoPendiente);
		const raices = new Set();
		muts.forEach(m => {
			if (m.type === 'characterData') {
				if (m.target && m.target.parentElement) raices.add(m.target);
			} else {
				m.addedNodes.forEach(n => raices.add(n));
			}
		});
		barridoPendiente = setTimeout(() => {
			barridoPendiente = null;
			if (currentLang === 'ar') traducirClavesArabe();
			raices.forEach(r => {
				try {
					if (!r.isConnected) return;
					if (r.nodeType === 3) {
						if (r.parentElement && !saltarContenedor(r.parentElement)) traducirNodo(r);
					} else if (r.nodeType === 1 && !saltarContenedor(r)) {
						barrer(r);
					}
				} catch (e) { /* mutación rara: se ignora */ }
			});
		}, 300);
	}

	document.addEventListener('langChanged', () => {
		repintarGuardados();
		repintarMT();
		if (currentLang === 'ar') {
			traducirMetadatosArabe();
			traducirClavesArabe();
		}
		if (currentLang !== 'es') {
			// Dos pasadas tardías por si algún módulo repinta después que
			// nosotros (el observador de mutaciones también las caza).
			setTimeout(() => {
				if (currentLang === 'ar') {
					repintarCacheArabe();
					traducirMetadatosArabe();
					traducirClavesArabe();
				}
				barrer(document.body);
			}, 80);
			setTimeout(() => {
				if (currentLang === 'ar') {
					repintarCacheArabe();
					traducirMetadatosArabe();
					traducirClavesArabe();
				}
				barrer(document.body);
			}, 700);
		}
	});

	document.addEventListener('DOMContentLoaded', () => {
		try {
			construirIndice();
			if (currentLang !== 'es') {
				if (currentLang === 'ar') {
					traducirMetadatosArabe();
					traducirClavesArabe();
				}
				barrer(document.body);
				setTimeout(() => barrer(document.body), 900);
				setTimeout(() => barrer(document.body), 2600);
			}
			new MutationObserver(alMutar).observe(document.body, {
				childList: true, subtree: true, characterData: true
			});
		} catch (e) { /* el botón mágico jamás tira la página */ }
	});
})();
=======
/* ============================================================
   ACCESIBILIDAD, lectores de pantalla y modo accesible
   ============================================================ */

/* Texto solo para lectores de pantalla (invisible, pero en el DOM) */
.visually-hidden{
  position:absolute !important; width:1px !important; height:1px !important;
  padding:0 !important; margin:-1px !important; overflow:hidden !important;
  clip:rect(0 0 0 0) !important; clip-path:inset(50%) !important;
  white-space:nowrap !important; border:0 !important;
}

/* Skip link: oculto hasta que recibe foco con Tab */
.skip-link{
  position:absolute; left:12px; top:-64px; z-index:100002;
  background:var(--paper, #FBFAF7); color:var(--ink, #0D1F26);
  font-family:var(--font-mono); font-size:0.8rem; font-weight:700;
  padding:10px 14px; border:2px solid var(--accent-text, #C24500);
  border-radius:8px; text-decoration:none;
}
.skip-link:focus{ top:12px; }

/* Foco visible SIEMPRE con teclado (mínimo 3px, contraste AA sobre fondo) */
:focus-visible{
  outline:3px solid var(--accent-text, #C24500) !important;
  outline-offset:2px;
}

/* Botón "Modo accesible" del header (lo inyecta i18n.js en todas las páginas) */
.acc-mode-btn{
  font-family:var(--font-mono); font-size:0.7rem; font-weight:700;
  letter-spacing:0.02em; padding:6px 12px; border-radius:999px; cursor:pointer;
  border:1px solid var(--line); background:transparent; color:var(--sky-mid);
  white-space:nowrap;
}
.acc-mode-btn:hover{ border-color:var(--accent); color:var(--accent); }
.acc-mode-btn[aria-pressed="true"]{
  background:var(--sky-deep); color:var(--paper); border-color:var(--sky-deep);
}

/* ---------- Modo accesible (baja visión) ---------- */
/* Letra base más grande y aireada */
body.modo-accesible{
  font-size:1.25rem !important;
  line-height:1.7 !important;
  background:#FFFFFF !important;
  color:#000000 !important;
}

/* Sin animaciones ni transiciones: nada se mueve */
body.modo-accesible *{
  animation:none !important;
  transition:none !important;
  scroll-behavior:auto !important;
}

/* Contraste máximo: fondo blanco y texto negro en todo el contenido
   (se respetan canvas y SVG: el mapa y el planetario siguen dibujándose) */
body.modo-accesible :not(canvas):not(svg):not(svg *){
  background-color:transparent !important;
  color:#000000 !important;
  border-color:#000000 !important;
  box-shadow:none !important;
  text-shadow:none !important;
}
body.modo-accesible input,
body.modo-accesible select,
body.modo-accesible textarea{
  background:#FFFFFF !important;
  border:2px solid #000000 !important;
  color:#000000 !important;
}

/* Enlaces y botones: subrayados y con contorno permanente de 3px */
body.modo-accesible a,
body.modo-accesible button{
  text-decoration:underline !important;
  outline:3px solid #000000 !important;
  outline-offset:1px;
}

/* Imágenes un poco más contrastadas */
body.modo-accesible img{ filter:contrast(1.1) !important; }

/* En modo accesible el mapa no se invierte: fondo claro predecible */
body.modo-accesible #shadowRouteMap .maplibregl-canvas,
body.modo-accesible #map .leaflet-tile-pane{ filter:none !important; }

/* ===== Indicaciones paso a paso (accesibilidad) ===== */
.rs-pasos{
  margin:10px 0 16px;
  padding:14px 16px;
  border:1px solid var(--border-color, rgba(127,127,127,.35));
  border-radius:12px;
  background:var(--card-bg, rgba(127,127,127,.07));
}
.rs-pasos-cabecera{
  display:flex; align-items:center; justify-content:space-between;
  gap:12px; flex-wrap:wrap; margin-bottom:8px;
}
.rs-pasos-cabecera h3{ margin:0; font-size:1.05rem; }
.rs-btn-escuchar{
  cursor:pointer;
  padding:8px 14px;
  border-radius:999px;
  border:2px solid var(--accent-text, #2563eb);
  background:transparent;
  color:var(--accent-text, #2563eb);
  font-weight:600;
}
.rs-btn-escuchar[aria-pressed="true"]{
  background:var(--accent-text, #2563eb);
  color:#fff;
}
.rs-lista-pasos{
  margin:0; padding-left:1.4em;
  display:flex; flex-direction:column; gap:6px;
}
.rs-lista-pasos li{ line-height:1.55; }
body.modo-accesible .rs-pasos{ background:#fff !important; color:#000 !important; border-color:#000 !important; }
body.modo-accesible .rs-btn-escuchar{ border-color:#000 !important; color:#000 !important; }
body.modo-accesible .rs-btn-escuchar[aria-pressed="true"]{ background:#000 !important; color:#fff !important; }

/* ===== prefers-reduced-motion: ahorro de batería + accesibilidad =====
   Muchos SO activan "reducir movimiento" junto al modo ahorro. Si está
   activo, paramos TODAS las animaciones y transiciones decorativas. */
@media (prefers-reduced-motion: reduce){
  *, *::before, *::after{
    animation-duration:0.001s !important;
    animation-iteration-count:1 !important;
    transition-duration:0.001s !important;
    scroll-behavior:auto !important;
  }
}


/* ---------- Driver.js (tour guiado) hermanado con el tema oscuro ---------- */
[data-theme="dark"] .driver-popover{
  background:#0A0C1F; color:#E8F0FF;
  border:1px solid rgba(0,240,255,0.25);
  box-shadow:0 12px 40px rgba(0,0,0,0.6), 0 0 24px rgba(0,240,255,0.08);
}
[data-theme="dark"] .driver-popover-title{ color:#E8F0FF; font-family:var(--font-display); }
[data-theme="dark"] .driver-popover-description{ color:rgba(232,240,255,0.82); }
[data-theme="dark"] .driver-popover-progress-text{ color:rgba(0,240,255,0.7); }
[data-theme="dark"] .driver-popover-close-btn{ color:rgba(232,240,255,0.6); }
[data-theme="dark"] .driver-popover-close-btn:hover{ color:#00F0FF; }
[data-theme="dark"] .driver-popover-next-btn{
  background:linear-gradient(120deg, var(--accent) 0%, var(--accent-2) 100%);
  color:#03050F; border:none; text-shadow:none; font-weight:700;
}
[data-theme="dark"] .driver-popover-prev-btn,
[data-theme="dark"] .driver-popover-close-btn-text{
  background:transparent; color:rgba(232,240,255,0.75);
  border:1px solid rgba(0,240,255,0.3); text-shadow:none;
}
[data-theme="dark"] .driver-popover-arrow-side-left{ border-left-color:#0A0C1F; }
[data-theme="dark"] .driver-popover-arrow-side-right{ border-right-color:#0A0C1F; }
[data-theme="dark"] .driver-popover-arrow-side-top{ border-top-color:#0A0C1F; }
[data-theme="dark"] .driver-popover-arrow-side-bottom{ border-bottom-color:#0A0C1F; }

/* ================= Pantalla completa del mapa 3D (propio) =================
   El botón nativo de MapLibre no funciona en iPhone (iOS solo permite
   fullscreen en vídeos). Este modo propio fija el mapa a toda la pantalla
   real del dispositivo (100dvh: descuenta la barra del navegador) y se
   pone por encima de TODO (topbar, chat, planetario...). */
body.manolito-fs{ overflow:hidden; }
body.manolito-fs .map-section:has(#shadowRouteMap){
  padding:0 !important;
  content-visibility:visible !important;
}
body.manolito-fs .map-section:has(#shadowRouteMap) .map-wrap{
  position:fixed;
  inset:0;
  width:100vw;
  height:100vh;
  height:100dvh;
  z-index:99999;
  border:none !important;
  border-radius:0 !important;
  box-shadow:none !important;
  background:#000;
  margin:0;
}
body.manolito-fs #shadowRouteMap{
  width:100%;
  height:100vh;
  height:100dvh;
}
/* Dentro de la pantalla completa solo vive el mapa: el planetario, los
   botones de capas y demás secciones quedan fuera (el planetario se
   colaba por encima en el móvil). */
body.manolito-fs .rs-planetario,
body.manolito-fs .rs-layer-toggles,
body.manolito-fs .rs-form,
body.manolito-fs #rsStatus,
body.manolito-fs .rs-pasos,
body.manolito-fs #rsAqiPanel,
body.manolito-fs .chat-fab{ display:none !important; }

/* Icono del botón de pantalla completa (el sprite de MapLibre solo se
   aplica a su control nativo; el nuestro dibuja el suyo). */
.maplibregl-ctrl-group button.manolito-fs-btn{
  width:29px; height:29px;
  background-color:transparent;
  background-repeat:no-repeat;
  background-position:center;
  background-size:18px 18px;
  background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23333333' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 3H5a2 2 0 0 0-2 2v3'/%3E%3Cpath d='M16 3h3a2 2 0 0 1 2 2v3'/%3E%3Cpath d='M8 21H5a2 2 0 0 1-2-2v-3'/%3E%3Cpath d='M16 21h3a2 2 0 0 0 2-2v-3'/%3E%3C/svg%3E");
  cursor:pointer;
}
[data-theme="dark"] .maplibregl-ctrl-group button.manolito-fs-btn{
  background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23dddddd' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 3H5a2 2 0 0 0-2 2v3'/%3E%3Cpath d='M16 3h3a2 2 0 0 1 2 2v3'/%3E%3Cpath d='M8 21H5a2 2 0 0 1-2-2v-3'/%3E%3Cpath d='M16 21h3a2 2 0 0 0 2-2v-3'/%3E%3C/svg%3E");
}
.maplibregl-ctrl-group button.manolito-fs-btn.manolito-fs-activo,
.maplibregl-ctrl-group button.manolito-fs-btn[aria-pressed="true"]{
  background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23333333' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 3v3a2 2 0 0 1-2 2H3'/%3E%3Cpath d='M21 8h-3a2 2 0 0 1-2-2V3'/%3E%3Cpath d='M3 16h3a2 2 0 0 1 2 2v3'/%3E%3Cpath d='M16 21v-3a2 2 0 0 1 2-2h3'/%3E%3C/svg%3E");
}
[data-theme="dark"] .maplibregl-ctrl-group button.manolito-fs-btn.manolito-fs-activo,
[data-theme="dark"] .maplibregl-ctrl-group button.manolito-fs-btn[aria-pressed="true"]{
  background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23dddddd' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 3v3a2 2 0 0 1-2 2H3'/%3E%3Cpath d='M21 8h-3a2 2 0 0 1-2-2V3'/%3E%3Cpath d='M3 16h3a2 2 0 0 1 2 2v3'/%3E%3Cpath d='M16 21v-3a2 2 0 0 1 2-2h3'/%3E%3C/svg%3E");
}

/* ================= Ajustes móvil del mapa 3D =================
   1) La sección del mapa de sombras NO usa content-visibility:auto:
      en iPhone ese atajo de rendimiento calculaba mal las alturas al
      hacer scroll y el planetario se pintaba encima del mapa. Como esta
      sección está arriba del todo (casi siempre visible), quitarlo no
      cuesta rendimiento.
   2) El lienzo de MapLibre queda recortado a su caja: si el canvas se
      redimensiona tarde, nunca puede desbordarse encima de otra cosa. */
.map-section:has(#shadowRouteMap){
  content-visibility:visible !important;
  contain-intrinsic-size:none !important;
}
#shadowRouteMap{ overflow:hidden; }


/* ============================================================
   MEJORAS VISUALES sep-2026, bloque ADITIVO
   (no se ha borrado ni tocado ninguna regla anterior;
    al ir las últimas, estas ganan cuando pisan alguna)
   ============================================================ */

/* --- Formulario de ruta: tarjeta elegante con iconos dibujados --- */
.rs-form{
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 12px;
  box-shadow: 0 8px 24px rgba(14,59,71,0.10);
}
.rs-form .rs-field input[type="text"]{
  min-height: 44px;
  padding-left: 38px;
  background-repeat: no-repeat;
  background-position: 10px center;
  background-size: 18px 18px;
}
#rsOrigen{ background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230E7C86' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z'/%3E%3Ccircle cx='12' cy='10' r='3'/%3E%3C/svg%3E"); }
#rsDestino{ background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23E04E00' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z'/%3E%3Cline x1='4' y1='22' x2='4' y2='15'/%3E%3C/svg%3E"); }

/* Botón Buscar ruta: protagonista, con lupa dibujada en CSS.
   El icono es un ::before (no texto): el cambio de idioma no lo borra. */
#rsBuscarBtn{
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 46px; padding: 10px 22px; border-radius: 12px;
  font-size: 0.95rem; letter-spacing: 0.02em;
}
#rsBuscarBtn::before{
  content: ""; width: 16px; height: 16px; flex: 0 0 auto;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23FFFFFF' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m21 21-4.3-4.3'/%3E%3C/svg%3E") no-repeat center / contain;
}

/* --- Modo invierno: pastilla con sol dibujado (adiós al emoji) --- */
.rs-toggle-invierno{
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 8px 14px;
  width: fit-content;
  box-shadow: 0 2px 8px rgba(14,59,71,0.08);
}
.rs-toggle-invierno.rs-invierno-activo{
  border-color: #d98a00;
  background: rgba(217,138,0,0.08);
}
.rs-icono-sol{ display: inline-flex; align-items: center; color: #d98a00; }
.rs-icono-sol svg{ width: 18px; height: 18px; }

/* --- Capas de mapa plegables (Mapa claro / IGN / Catastro 3D) --- */
#rsBtnCapasMapa{ display: inline-flex; align-items: center; gap: 6px; }
#rsBtnCapasMapa .rs-ico{ width: 15px; height: 15px; flex: 0 0 auto; }
#rsBtnCapasMapa .rs-chevr{ width: 14px; height: 14px; flex: 0 0 auto; transition: transform 0.25s ease; }
#rsMapStyleToggle:not(.rs-colapsado) #rsBtnCapasMapa .rs-chevr{ transform: rotate(180deg); }
#rsMapStyleToggle.rs-colapsado .rs-capa-hija{ display: none !important; }

/* --- Manolit: balanceo suave constante (respeta reduced-motion) --- */
@keyframes mwSway{ 0%,100%{ transform: rotate(-1.7deg); } 50%{ transform: rotate(1.7deg); } }
.mw-sway{ animation: mwSway 4.6s ease-in-out infinite; transform-origin: 50% 88%; will-change: transform; }
@media (prefers-reduced-motion: reduce){ .mw-sway{ animation: none !important; } }

/* --- Topbar en móvil (≤700px): orden lógico por filas ---
   1ª fila: marca + tema · 2ª: idiomas · 3ª: paleta · 4ª: accesible · 5ª: familia */
@media (max-width: 700px){
  .topbar{ gap: 8px 10px; padding: 10px 12px; }
  .topbar .wordmark{ order: 1; }
  .topbar .wordmark > span:not(.wordmark-name){ font-size: 0.58rem; padding: 2px 6px; }
  .topbar #themeToggle{ order: 2; margin-left: auto; }
  .topbar .topbar-right{ display: contents; }
  .topbar #langToggle{ order: 3; flex: 1 1 100%; }
  .topbar #langToggle button{ flex: 1; padding: 8px 4px; }
  .topbar #paletteToggle{ order: 4; margin: 0 auto; }
  .topbar .acc-mode-btn{ order: 5; flex: 1 1 100%; margin: 0; }
  .topbar .family-link{
    order: 6; font-size: 0.72rem; padding: 4px 10px; margin: 0;
    border: 1px solid var(--line); border-radius: 999px;
  }
  /* El formulario de ruta en columna, cómodo para el pulgar */
  .rs-form .rs-field{ flex: 1 1 100%; min-width: 0; }
  .rs-form #rsBuscarBtn{ width: 100%; }
}


/* --- RENDIMIENTO sep-2026: el balanceo de Manolit lo escribe el propio
   reloj del muñeco (66 ms) desde JS; una animación CSS infinita obligaba
   al compositor a repintar 60 veces por segundo todo el rato. --- */
.mw-sway{ animation: none !important; will-change: auto; }

/* --- BOTÓN RENDERIZADO LIDAR (sep-2026): acceso a la herramienta externa
   de nubes de puntos LiDAR, bajo el panel de posición solar. Estilo de
   botón-píldora coherente con la web: sin URL visible, centrado, con
   icono de cubo dibujado (nada de emojis) y hover suave. --- */
.rs-btn-lidar{
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  margin:12px auto 2px; padding:10px 20px; border-radius:999px;
  font-family:var(--font-mono); font-size:0.8rem; font-weight:600; letter-spacing:0.03em;
  color:#ffffff; text-decoration:none;
  background:linear-gradient(135deg, var(--sky-deep) 0%, var(--sky-mid) 100%);
  border:1px solid color-mix(in srgb, var(--sky-mid) 55%, #ffffff 20%);
  box-shadow:0 4px 14px rgba(14,59,71,0.28);
  transition:transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}
.rs-btn-lidar svg{ width:16px; height:16px; flex:0 0 auto; }
.rs-btn-lidar:hover, .rs-btn-lidar:focus-visible{
  transform:translateY(-2px);
  box-shadow:0 8px 20px rgba(14,59,71,0.36);
  filter:brightness(1.08);
}
.rs-btn-lidar:active{ transform:translateY(0); }
.rs-btn-lidar:focus-visible{ outline:2px solid var(--accent); outline-offset:3px; }
[data-theme="dark"] .rs-btn-lidar{
  color:#06222b;
  background:linear-gradient(135deg, var(--sky-mid) 0%, var(--sky-deep) 100%);
  border-color:color-mix(in srgb, var(--sky-mid) 60%, transparent);
  box-shadow:0 4px 16px rgba(0,240,255,0.18);
}
[data-theme="dark"] .rs-btn-lidar:hover, [data-theme="dark"] .rs-btn-lidar:focus-visible{
  box-shadow:0 8px 22px rgba(0,240,255,0.28);
}
@media (prefers-reduced-motion: reduce){
  .rs-btn-lidar{ transition:none; }
  .rs-btn-lidar:hover, .rs-btn-lidar:focus-visible{ transform:none; }
}

/* ============================================================
   HUMANIZACIÓN sep-2026, la web sale de la calle, no de una
   plantilla: CTA mandarina plana (el naranjo no tiene gradiente),
   jerarquía de radios, noche de verano de verdad (farola, no
   neón), paletas con nombre de momento sevillano y leyenda de
   irradiación con puntos dibujados en vez de emojis.
   Todo se añade al final y pisa lo anterior con cariño.
   ============================================================ */

/* --- 1. CTA principal con jerarquía: botón de verdad, no píldora --- */
#rsBuscarBtn{
  background:var(--accent) !important;
  border-radius:14px !important;
  font-size:1rem !important;
  letter-spacing:0.01em !important;
  text-transform:none !important;
}
#rsBuscarBtn:hover{
  background:var(--accent) !important;
  filter:brightness(1.07) !important;
  transform:translateY(-1px) !important;
}

/* --- 2. Botón LiDAR plano (mea culpa: llevaba gradiente) --- */
.rs-btn-lidar{ background:var(--sky-deep) !important; }
[data-theme="dark"] .rs-btn-lidar{ background:var(--sky-mid) !important; }

/* --- 3. «Posición del sol» legible: nada de eyebrow de 8.5px --- */
#rsTimeControls .rs-eyebrow{
  text-transform:none !important;
  font-size:11px !important;
  letter-spacing:0.02em !important;
  font-weight:600 !important;
}

/* --- 4. Controles del mapa: la versalita se queda (convención
   cartográfica real) pero a tamaño que lean los abuelos --- */
#rsMapControls button{
  font-size:11px !important;
  letter-spacing:0.03em !important;
  padding:7px 12px !important;
}
@media (max-width:480px){
  #rsMapControls button{ font-size:10.5px !important; padding:6px 10px !important; }
}

/* --- 5. Noche de verano de verdad: turquesa apagado en vez de
   cian neón (los datos se leen igual, sin efecto gamer) --- */
[data-theme="dark"]{ --sky-mid:#4FBFB5; }

/* --- 6. Paletas con nombre de momento sevillano. Los valores
   data-palette NO cambian (los usa theme.js); solo color/etiqueta.
   cosmos pasa a ser «Noche de verano»: ámbar de farola de sodio --- */
[data-palette="cosmos"]{ --accent:#FFB85C; --accent-soft:rgba(255,184,92,0.16); --accent-text:#9A5B00; }
[data-theme="dark"][data-palette="cosmos"]{ --accent-text:#FFCF8F; }

/* --- 7. Selector de paleta: puntos de color llanos en vez de
   glifos lunares ◌◐◑◒◓ (que no decían nada de sol ni de sombra) --- */
#paletteToggle button{
  font-size:0 !important;
  width:24px; height:24px;
  display:inline-flex; align-items:center; justify-content:center;
}
#paletteToggle button::before{
  content:''; width:13px; height:13px; border-radius:50%; display:block;
  box-shadow:inset 0 0 0 1.5px rgba(0,0,0,0.18);
}
#paletteToggle button[data-palette="cosmos"]::before{   background:#FFB85C; }
#paletteToggle button[data-palette="amanecer"]::before{ background:#FF6B1A; }
#paletteToggle button[data-palette="salvia"]::before{   background:#00B98A; }
#paletteToggle button[data-palette="lavanda"]::before{  background:#7B2FFF; }
#paletteToggle button[data-palette="coral"]::before{    background:#E63E5F; }

/* --- 8. Leyenda de irradiación: puntos del MISMO color que las
   zonas del mapa (los define irradiacion-solar.js en línea) --- */
.irr-linea{ display:inline-flex; align-items:center; gap:6px; }
.irr-punto{
  display:inline-block; width:10px; height:10px; border-radius:50%;
  flex:0 0 auto; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.15);
}

/* --- 9. Contraste del CTA según paleta (AA): texto oscuro sobre
   ámbar/mandarina/menta/coral, blanco solo sobre jacarandá --- */
#rsBuscarBtn{ color:#2A1A05 !important; }
#rsBuscarBtn:hover{ color:#2A1A05 !important; }
[data-palette="lavanda"] #rsBuscarBtn,
[data-palette="lavanda"] #rsBuscarBtn:hover{ color:#FFFFFF !important; }

/* ---------- GRÁFICA DEL AIRE INTERACTIVA (sep-2026) ----------
   Cursor que sigue al dedo/ratón/teclado y globo con el valor. */
.chart-cursor-line{ stroke:var(--sky-mid, #4FBFB5); stroke-width:1; stroke-dasharray:3 3; opacity:.8; }
.chart-cursor-dot{ stroke:#fff; stroke-width:1.5; }
#airChart svg:focus-visible{ outline:2px solid var(--accent, #FFB85C); outline-offset:2px; border-radius:6px; }
.chart-tip{
  position:absolute;
  top:-8px;
  left:50%;
  transform:translate(-50%, -100%);
  background:var(--panel, #ffffff);
  color:var(--ink, #2A1A05);
  border:1px solid var(--line, rgba(14,59,71,0.18));
  border-radius:10px;
  padding:5px 10px;
  font-size:12px;
  font-family:var(--font-body, inherit);
  white-space:nowrap;
  box-shadow:0 4px 14px rgba(0,0,0,0.12);
  opacity:0;
  pointer-events:none;
  transition:opacity .15s ease;
  z-index:5;
}
.chart-tip.visible{ opacity:1; }
/* Modo oscuro (sep-2026): --panel no existe como variable y el tooltip
   quedaba fondo blanco con texto casi blanco (--ink es claro en dark):
   ilegible. Ahora en oscuro tiene fondo oscuro y texto claro, siempre. */
[data-theme="dark"] .chart-tip{
  background:#12232E;
  color:#E8F0FF;
  border-color:rgba(125,249,255,0.35);
  box-shadow:0 4px 14px rgba(0,0,0,0.5);
}
#airChart{ padding-top:26px; }

/* ---------- SINCRONIZAR / EXPORTAR DATOS (pie) ---------- */
.footer-sync{ margin-top:10px; }
.footer-sync-toggle{
  background:none; border:none; padding:4px 2px;
  color:inherit; opacity:.8; font:inherit; font-size:.85rem;
  text-decoration:underline; text-underline-offset:3px;
  cursor:pointer; min-height:44px;
}
.footer-sync-toggle:hover, .footer-sync-toggle:focus-visible{ opacity:1; }
.sync-panel{
  max-width:520px; margin:10px auto 0; padding:14px 16px;
  border:1px solid var(--line, rgba(14,59,71,0.18)); border-radius:14px;
  background:var(--panel, #ffffff); text-align:center;
}
.sync-hint{ margin:0 0 10px; font-size:.85rem; opacity:.85; }
.sync-panel-btns{ display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
.sync-panel-btns button{
  border:1px solid var(--line, rgba(14,59,71,0.18)); border-radius:12px;
  background:var(--accent-soft, rgba(255,184,92,0.16));
  color:inherit; font:inherit; font-size:.85rem;
  padding:10px 16px; min-height:48px; cursor:pointer;
}
.sync-panel-btns button:hover{ border-color:var(--accent, #FFB85C); }

/* ================================================================
   Botonera fina + botón mini "Act. mapa" (2026-09-12, pedido de Sandro)
   "todo en una linea y dos, mas suave, mas fino, mas elegante, no tan
   bruto". Estas reglas van al FINAL del archivo y con !important para
   ganar a las reglas !important de tamaño grande de más arriba (que
   siguen existiendo; solo las supera la cascada). ADITIVO.
   ================================================================ */
#rsMapControls{ right:auto !important; gap:4px !important; max-width:calc(100vw - 20px); }
#rsMapControls button{
  font-size:9px !important; padding:3px 8px !important; letter-spacing:0.02em !important;
  font-weight:600 !important; line-height:1.5 !important; border-radius:999px !important;
  box-shadow:0 1px 4px rgba(22,35,46,0.10) !important;
  background:rgba(251,250,247,0.78) !important;
  backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px);
}
[data-theme="dark"] #rsMapControls button,
.rs-mapa-oscuro-activo #rsMapControls button{
  background:rgba(10,30,38,0.78) !important; color:#E8F4F0;
  box-shadow:0 1px 4px rgba(0,0,0,0.35) !important;
}
#rsBtnPlegarControles{ font-size:10px !important; padding:3px 8px !important; }
@media (max-width:480px){
  #rsMapControls{ gap:2px !important; top:8px !important; left:8px !important; max-width:calc(100vw - 16px); }
  #rsMapControls button{ font-size:7.5px !important; padding:2px 6px !important; letter-spacing:0.01em !important; }
}

/* Botón mini de actualizar: FUERA del mapa, en la barra superior,
   muy pequeño y discreto (pedido de Sandro 2026-09-12). */
#rsBtnActualizarOSM{
  margin:0 0 0 auto; /* a la derecha de su fila en la barra superior */
  flex:none; white-space:nowrap; /* ni crece ni se parte: la barra no se re-envuelve al traducir */
  font-family:inherit; font-size:8.5px; letter-spacing:0.03em; text-transform:uppercase;
  font-weight:600; padding:3px 8px; border-radius:999px; line-height:1.5;
  border:1px solid var(--line, rgba(14,59,71,0.16));
  background:rgba(251,250,247,0.78); color:var(--sky-deep, #0E3B47);
  backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px);
  cursor:pointer; box-shadow:0 1px 4px rgba(22,35,46,0.10);
  transition:background .15s,border-color .15s,opacity .15s;
}
/* Respaldo: si una página no tuviera topbar, flota fijo arriba a la derecha. */
body > #rsBtnActualizarOSM{ position:fixed; top:10px; right:48px; z-index:30; }
#rsBtnActualizarOSM:hover{ background:var(--accent-soft, rgba(255,107,26,0.16)); border-color:var(--accent, #FF6B1A); }
#rsBtnActualizarOSM:disabled{ cursor:wait; }
#rsBtnActualizarOSM.rs-cargando{ animation:rsActMapaPulso 1.1s ease-in-out infinite; }
@keyframes rsActMapaPulso{ 0%,100%{ opacity:1; } 50%{ opacity:0.55; } }
[data-theme="dark"] #rsBtnActualizarOSM,
.rs-mapa-oscuro-activo #rsBtnActualizarOSM{
  background:rgba(10,30,38,0.78); color:#E8F4F0;
  border-color:rgba(232,244,240,0.22); box-shadow:0 1px 4px rgba(0,0,0,0.35);
}
@media (max-width:480px){
  #rsBtnActualizarOSM{ font-size:8px; padding:2px 7px; }
  body > #rsBtnActualizarOSM{ top:8px; right:44px; }
}
@media (prefers-reduced-motion:reduce){
  #rsBtnActualizarOSM.rs-cargando{ animation:none; }
}


/* ============================================================
   MAPA EFICIENTE Y ELEGANTE (sep-2026, brief de Sandro)
   ------------------------------------------------------------
   BLOQUE 100% ADITIVO: no se ha borrado ni una línea del CSS
   original; estas reglas vienen al final y ganan por cascada
   (y por !important donde el original también lo usaba).

   Auditoría previa (medida sobre este mismo archivo):
   - 8 backdrop-filter: blur() recomponían la GPU en CADA frame
     al flotar sobre el mapa WebGL → paneles ahora OPACOS.
   - 14 gradientes, varios animados (wordmarkFlow, anillo
     arcoíris del chat) → colores SÓLIDOS de la paleta propia.
     El brief prohíbe explícitamente la estética "IA generativa".
   - Sombras con blur de 40-50px (buffers offscreen enormes en
     GPU móvil) → sombras cortas de 2-16px, estilo Figma.
   - floatX animaba margin-left = reflow del documento 60
     veces/seg en loop infinito → un solo keyframes con
     translate (solo compone, nunca recalcula layout).
   - transition: all + will-change: box-shadow → propiedades
     concretas; will-change solo transform (manda el brief).
   - Fraunces/Karla solo se usaban en 4 selectores → system
     stack (los <link> de Google Fonts se quitan en index.html:
     menos red, menos memoria, cero FOUT).

   Lo que NO se toca: body.modo-accesible (el alto contraste
   manda sobre este bloque), la paleta de acentos, ni ninguna
   animación que ya fuera solo transform/opacity.
   ============================================================ */

/* --- 1. Superficies SÓLIDAS: la variable madre se vuelve opaca
        y todos los paneles que la usan se solidifican de golpe --- */
:root{ --surface:#FFFFFF; }
[data-theme="dark"]{ --surface:#0B0D20; }

/* --- 2. Muerte a los 8 backdrop-filter (la GPU descansa) --- */
.chat-panel,
.sci-panel,
.peque-message,
.city-dropdown-btn,
.city-dropdown-list,
.donacion-boton,
#rsMapControls button,
#rsBtnActualizarOSM{
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
}

/* Fondos sólidos para los que llevaban rgba semitransparente
   propio (no usaban var(--surface)): */
#rsMapControls button{ background:#FBFAF7 !important; }
#rsBtnActualizarOSM{ background:#FBFAF7; }
[data-theme="dark"] #rsMapControls button,
.rs-mapa-oscuro-activo #rsMapControls button{ background:#0B1E26 !important; }
[data-theme="dark"] #rsBtnActualizarOSM,
.rs-mapa-oscuro-activo #rsBtnActualizarOSM{ background:#0B1E26; }

/* --- 3. Gradientes → sólidos (la identidad se mantiene) --- */

/* Titular del mapa y wordmark: texto sólido, sin flujo animado
   ni drop-shadow (repintaban el texto en cada frame). */
.map-title,
.wordmark .wordmark-name{
  background:none;
  -webkit-background-clip:initial; background-clip:initial;
  -webkit-text-fill-color:var(--sky-deep); color:var(--sky-deep);
  filter:none;
  animation:none;
}

/* El orbe de calidad del aire conserva su color de ESTADO
   (eso es información, no decoración): sólido con un borde
   interior sutil en vez del degradado radial. La animación
   breathe se queda: es solo transform, cuesta cero. */
.orb{
  background:var(--state-color, var(--breath-good));
  box-shadow:inset 0 0 0 1px rgba(255,255,255,0.22), 0 2px 8px rgba(13,31,38,0.18);
}

/* Marco del mapa: borde sólido de la línea de la casa en vez
   del truco de doble gradiente padding-box/border-box. */
.map-section:has(#shadowRouteMap) .map-wrap{
  background:var(--paper);
  border-color:var(--line);
  box-shadow:0 2px 8px rgba(13,31,38,0.10);
}

/* Botón buscar: mandarina AA (la paleta ya trae --accent-text,
   la versión oscura del acento pensada para contraste) y hover
   sin filter:brightness (el filter repinta; no hace falta). */
#rsBuscarBtn{
  background:var(--accent-text);
  color:#FFFFFF;
  box-shadow:0 2px 8px var(--accent-soft);
}
#rsBuscarBtn:hover{
  background:var(--accent);
  color:var(--paper);
  filter:none;
  box-shadow:0 2px 8px var(--accent-soft);
}

/* Badge de sombra en mapa oscuro: panel sólido. */
.rs-mapa-oscuro-activo #rsShadowBadge{ background:#0A1E26; }

/* Botón activo de los controles del mapa (modo oscuro). */
.rs-mapa-oscuro-activo #rsMapControls button.rs-activo{
  background:var(--accent) !important;
  color:#06222B !important;
}

/* Botón "siguiente" del tour guiado en tema oscuro. */
[data-theme="dark"] .driver-popover-next-btn{
  background:var(--accent);
  color:#03050F;
}

/* Botón LiDAR: sólido petróleo (claro) / cian (oscuro). */
.rs-btn-lidar{
  background:var(--sky-deep);
  color:#FFFFFF;
  box-shadow:0 2px 8px rgba(14,59,71,0.22);
}
.rs-btn-lidar:hover, .rs-btn-lidar:focus-visible{
  filter:none;
  box-shadow:0 4px 12px rgba(14,59,71,0.30);
}
[data-theme="dark"] .rs-btn-lidar{
  background:var(--sky-mid);
  color:#06222B;
  box-shadow:0 2px 8px rgba(0,240,255,0.16);
}
[data-theme="dark"] .rs-btn-lidar:hover, [data-theme="dark"] .rs-btn-lidar:focus-visible{
  box-shadow:0 4px 12px rgba(0,240,255,0.24);
}

/* --- 4. El anillo arcoíris del chat muere (el brief prohíbe
        la estética "IA generativa"): anillo sólido del acento
        de la casa, núcleo sólido, letras sólidas, cero giros --- */
.chat-fab-ring{
  background:var(--accent);
  animation:none;
}
.chat-fab-core{
  background:var(--paper);
  background-image:none;
  -webkit-text-fill-color:var(--accent-text); color:var(--accent-text);
  animation:none;
}
.chat-logo{ background:var(--accent); }
.chat-logo i{
  background:var(--paper);
  background-image:none;
  -webkit-text-fill-color:var(--accent-text); color:var(--accent-text);
}

/* --- 5. Sombras gigantes → sombras cortas (la jerarquía se
        mantiene con 2-16px; 44-50px eran puro gasto de GPU) --- */
.chat-panel{ box-shadow:0 4px 16px rgba(0,0,0,0.18); }
[data-theme="dark"] .driver-popover{ box-shadow:0 4px 12px rgba(0,0,0,0.50); }

/* --- 6. floatX animaba margin-left (reflow 60 veces/seg en
        loop infinito). Un solo keyframes con translate: el
        compositor lo mueve sin tocar el layout. Mismo vaivén --- */
.peque-cloud{ animation:flotarSuave 5s ease-in-out infinite; will-change:transform; }
@keyframes flotarSuave{
  0%,100%{ transform:translate(0,0); }
  50%{ transform:translate(-4px,-10px); }
}

/* --- 7. transition: all → propiedades concretas; will-change
        solo transform (el brief veta will-change en box-shadow) --- */
body.mode-peque .im-lost-btn{
  transition:transform 0.2s cubic-bezier(0.4,0,0.2,1), background-color 0.2s;
  will-change:transform;
}

/* --- 8. System fonts en los 4 selectores que aún pedían
        Fraunces/Karla (los <link> de Google Fonts salen de
        index.html: 2 conexiones TLS y ~100KB menos por visita) --- */
.yayo-zoom-btn{ font-family:var(--font-display); }
.city-dropdown-btn,
.city-dropdown-list li,
.footer-donacion{ font-family:var(--font-body); }

/* ---------- cierre del pie: sello y redes a los lados del Ko-fi ---------- */
.footer-final{ margin-top:22px; padding-top:16px; border-top:1px dashed var(--line, #ccc); display:flex; align-items:center; justify-content:space-between; gap:22px; flex-wrap:wrap; }
.footer-final .footer-donacion{ margin-top:0; padding-top:0; border-top:none; flex:1 1 auto; }
.footer-sello{ max-width:200px; margin:0; opacity:.85; flex:none; }
.footer-sello svg{ display:block; width:100%; height:auto; border-radius:10px; }
.footer-redes{ margin-top:0; display:flex; flex-direction:column; align-items:flex-end; gap:8px; flex:none; }
.footer-red{ display:inline-flex; align-items:center; gap:6px; color:var(--sky-mid); text-decoration:none; font-size:0.72rem; opacity:.7; }
.footer-red:hover, .footer-red:focus-visible{ opacity:1; }
.footer-red svg{ width:15px; height:15px; fill:currentColor; flex:none; }
.footer-red-sola{ padding-left:21px; }
@media (max-width: 700px){
  .footer-final{ flex-direction:column; justify-content:center; }
  .footer-redes{ align-items:center; }
  .footer-red-sola{ padding-left:0; }
}

/* ---------- la barra superior ya no persigue el scroll ---------- */
/* Antes era sticky y tapaba el mapa al bajar. Ahora se queda en su sitio,
   arriba del todo, y al hacer scroll desaparece con el resto del contenido. */
.topbar{ position: static; transform: none; }

/* ---------- preguntas frecuentes (FAQ) ---------- */
.faq{ max-width:760px; margin:56px auto 0; padding:0 24px; }
.faq h2{ font-family:var(--font-display); font-weight:600; font-size:1.5rem; text-align:center; }
.faq-intro{ text-align:center; color:var(--sky-mid); font-size:0.9rem; margin-top:6px; }
.faq-item{ border-bottom:1px solid var(--line); }
.faq-item summary{
  cursor:pointer; list-style:none; padding:15px 34px 15px 4px; position:relative;
  font-weight:600; font-size:0.98rem;
}
.faq-item summary::-webkit-details-marker{ display:none; }
.faq-item summary::after{
  content:"+"; position:absolute; right:8px; top:13px;
  font-family:var(--font-mono); font-size:1.05rem; color:var(--sky-mid);
}
.faq-item[open] summary::after{ content:"–"; }
.faq-item summary:hover{ color:var(--accent); }
.faq-item p{ padding:0 4px 16px; color:var(--sky-mid); font-size:0.92rem; max-width:62ch; }

/* ============================================================
   CAPAS INTEGRADAS EN EL WIDGET SOLAR (sep-2026, orden de Sandro)
   Las casillas de capas y los botones Mapa oscuro / Mapa IGN /
   Catastro 3D dejan de flotar sobre el mapa y viven dentro del
   planetario, en una fila elegante que se apila en móvil. La
   cúpula no cambia de tamaño.
   ============================================================ */
.rs-planetario{ flex-direction:row; flex-wrap:wrap; justify-content:center; gap:14px 22px; }
.rs-planetario-lado{ display:flex; flex-direction:column; align-items:center; gap:8px; }
.rs-planetario-capas{ display:flex; flex-direction:column; gap:8px; align-items:flex-start; max-width:360px; text-align:left; }
.rs-planetario-capas .rs-layer-toggles{ margin-bottom:0; font-size:0.72rem; gap:8px 12px; }
.rs-planetario-capas .rs-layer-toggles-lista{ gap:8px 12px; }
.rs-capas-mapas{ display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
#rsCapasMapas #rsMapStyleToggle{ position:static !important; display:flex !important; flex-direction:row !important; flex-wrap:wrap !important; align-items:center !important; gap:6px !important; }
@media (max-width:640px){
  .rs-planetario{ flex-direction:column; }
  .rs-planetario-capas{ align-items:center; max-width:100%; text-align:center; }
}


/* Controles nativos de MapLibre visibles otra vez (sep-2026): zoom,
   brújula y pantalla completa. La web no carga la hoja de estilos de
   MapLibre para que el primer pintado sea ligero, pero sin ella sus
   botones se renderizaban debajo del mapa, recortados e invisibles.
   Aquí se posicionan dentro del mapa y se dibujan sus iconos con SVG
   en línea, sin cargar ninguna hoja extra. */
.maplibregl-map{ position:relative; }
.maplibregl-ctrl-top-right{
  position:absolute; top:10px; right:10px; z-index:7;
  display:flex; flex-direction:column; align-items:flex-end; gap:8px;
}
.maplibregl-ctrl-top-left{ position:absolute; top:10px; left:10px; z-index:7; }
.maplibregl-ctrl-bottom-right{
  position:absolute; right:0; bottom:0; z-index:7;
  display:flex; align-items:flex-end; justify-content:flex-end;
}
.maplibregl-ctrl-bottom-left{ position:absolute; left:0; bottom:0; z-index:7; }
.maplibregl-ctrl-top-right .maplibregl-ctrl-group{
  display:flex; flex-direction:column; overflow:hidden;
  background:var(--paper, #FBFAF7); border-radius:10px;
  border:1px solid var(--line, rgba(14,59,71,0.14));
  box-shadow:0 3px 10px rgba(22,35,46,0.18);
}
.maplibregl-ctrl-top-right .maplibregl-ctrl-group button{
  width:30px; height:30px; display:block; cursor:pointer; padding:0;
  background-color:transparent; border:none;
}
.maplibregl-ctrl-top-right .maplibregl-ctrl-group button + button{
  border-top:1px solid var(--line, rgba(14,59,71,0.14));
}
.maplibregl-ctrl-top-right .maplibregl-ctrl-group button:hover{
  background-color:rgba(14,59,71,0.07);
}
.maplibregl-ctrl-top-right .maplibregl-ctrl-group button .maplibregl-ctrl-icon{
  display:block; width:100%; height:100%;
  background-repeat:no-repeat; background-position:center; background-size:18px 18px;
}
.maplibregl-ctrl-zoom-in .maplibregl-ctrl-icon{
  background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23333333' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M12 5v14M5 12h14'/%3E%3C/svg%3E");
}
.maplibregl-ctrl-zoom-out .maplibregl-ctrl-icon{
  background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23333333' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M5 12h14'/%3E%3C/svg%3E");
}
.maplibregl-ctrl-compass .maplibregl-ctrl-icon{
  background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2l4.5 10-4.5 10-4.5-10z' fill='%23333333'/%3E%3Cpath d='M12 2l4.5 10h-9z' fill='%23FF6B1A'/%3E%3C/svg%3E");
}
[data-theme="dark"] .maplibregl-ctrl-zoom-in .maplibregl-ctrl-icon,
.rs-mapa-oscuro-activo .maplibregl-ctrl-zoom-in .maplibregl-ctrl-icon{
  background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23dddddd' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M12 5v14M5 12h14'/%3E%3C/svg%3E");
}
[data-theme="dark"] .maplibregl-ctrl-zoom-out .maplibregl-ctrl-icon,
.rs-mapa-oscuro-activo .maplibregl-ctrl-zoom-out .maplibregl-ctrl-icon{
  background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23dddddd' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M5 12h14'/%3E%3C/svg%3E");
}
[data-theme="dark"] .maplibregl-ctrl-compass .maplibregl-ctrl-icon,
.rs-mapa-oscuro-activo .maplibregl-ctrl-compass .maplibregl-ctrl-icon{
  background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2l4.5 10-4.5 10-4.5-10z' fill='%23dddddd'/%3E%3Cpath d='M12 2l4.5 10h-9z' fill='%23FF6B1A'/%3E%3C/svg%3E");
}
/* Atribución compacta en la esquina inferior derecha (antes ocupaba
   una tira entera debajo del mapa). */
.maplibregl-ctrl-attrib{
  font-size:10px; line-height:1.4; padding:2px 8px;
  background:rgba(251,250,247,0.85); border-radius:8px 0 0 0;
}
.maplibregl-ctrl-attrib a{ color:inherit; }
/* En móvil los botones nativos crecen un poco para el dedo. */
@media (max-width:480px){
  .maplibregl-ctrl-top-right .maplibregl-ctrl-group button{ width:36px; height:36px; }
}


/* Widget solar ordenado (sep-2026, orden de Sandro): dos piezas claras
   en vez de elementos esparcidos. A la izquierda el sol con su hora y
   el acceso LiDAR formando una sola pieza; a la derecha las capas y
   los botones de mapa, separados por una línea fina. En pantallas
   estrechas se apilan y la línea pasa arriba. */
.rs-planetario{ justify-content:center; align-items:center; gap:0; }
.rs-planetario-sol{ display:flex; align-items:center; gap:16px; }
.rs-planetario-capas{
  border-left:1px solid var(--line, rgba(14,59,71,0.14));
  margin-left:26px; padding-left:26px;
}
@media (max-width:900px){
  .rs-planetario{ flex-direction:column; gap:14px; }
  .rs-planetario-capas{
    border-left:none; margin-left:0; padding-left:0;
    border-top:1px solid var(--line, rgba(14,59,71,0.14)); padding-top:14px;
    align-items:center; text-align:center; max-width:100%;
  }
}


/* Widget solar compacto y centrado (sep-2026, orden de Sandro): las
   dos piezas van juntas en el centro en vez de estirarse a lo ancho,
   y los botones de mapa base forman una rejilla de tres columnas con
   su título encima ocupando toda la fila. */
.rs-planetario{
  max-width:940px; margin-left:auto; margin-right:auto;
  justify-content:center; gap:28px;
}
.rs-planetario-capas{ margin-left:0; padding-left:28px; }
#rsCapasMapas #rsMapStyleToggle{
  display:grid !important; grid-template-columns:repeat(3, 1fr) !important;
  gap:6px !important;
}
#rsCapasMapas #rsBtnCapasMapa{ grid-column:1 / -1; }
@media (max-width:900px){
  .rs-planetario{ gap:14px; }
  .rs-planetario-capas{ padding-left:0; }
}


/* Widget en COLUMNA con orden lógico (sep-2026, orden de Sandro):
   1) el planetario con su hora y la luna, 2) el acceso a Renderizado
   LiDAR, 3) las capas del mapa. Una cosa debajo de la otra, todo
   centrado, en móvil y en ordenador. */
.rs-planetario{ flex-direction:column; align-items:center; gap:16px; }
.rs-planetario-sol{
  display:flex; align-items:center; justify-content:center;
  gap:18px; flex-wrap:wrap;
}
.rs-planetario-capas{
  border-left:none; margin-left:0; padding-left:0;
  border-top:1px solid var(--line, rgba(14,59,71,0.14)); padding-top:16px;
  align-items:center; text-align:center; max-width:100%;
}

/* Reorden definitivo del widget (sep-2026, v6): capas arriba (van con el
   mapa), despues el planetario y debajo del todo el Renderizado LiDAR.
   La linea divisoria ya no hace falta porque las capas abren el bloque. */
.rs-planetario-capas{ border-top: none; padding-top: 0; }

/* Catastro 3D siempre a la vista en su propia fila, justo debajo de
   Capas y Capas de mapa (orden de Sandro, sep-2026). No se pliega. */
#rsCapasMapas #rsBtnCatastro{ grid-column: 1 / -1; }

/* Planetario (sep-2026, orden de Sandro): la hora y los datos del sol
   van DEBAJO de la cúpula, centrados, nunca al lado. */
.rs-planetario-sol{ flex-direction: column; flex-wrap: nowrap; gap: 10px; }
.rs-planetario-lado{ align-items: center; text-align: center; }

/* Reorden del widget (sep-2026, orden de Sandro): «¿No hay 3D en tu
   zona?» vive DENTRO del widget, justo debajo de las capas del mapa,
   nunca por encima de ellas. Centrado y sin el margen grande de sección. */
.rs-planetario > #rsColaboraOSM{ margin:2px auto 0; width:min(680px, 94%); padding:0; }
.rs-planetario > #rsColaboraOSM summary{ text-align:center; }

/* Capas y Capas de mapa, una AL LADO de la otra (orden de Sandro,
   sep-2026): los dos botones maestros comparten fila y su contenido
   desplegado cae debajo de cada uno. En pantallas muy estrechas se
   apilan solos gracias al wrap. */
.rs-planetario-capas{ flex-direction:row; flex-wrap:wrap; justify-content:center; align-items:flex-start; gap:8px 18px; }
.rs-planetario-capas .rs-layer-toggles{ flex-direction:column; align-items:center; gap:8px; }
.rs-planetario-capas .rs-layer-toggles-lista{ justify-content:center; }

/* ============================================================
   MODOS EN LA BARRA, versión tecla (sep-2026, orden de Sandro)
   El selector de modos vive arriba, nada más entrar, para que lo
   veas antes que nada. Son las mismas tarjetas de siempre (mismo
   HTML, mismo script) encogidas a teclas discretas con el número
   de siempre encima. Elegante y sin inventar nada nuevo.
   ============================================================ */
.modes--compacta{ max-width:none; margin:0; padding:0; }
.modes--compacta .mode-grid{ display:flex; gap:6px; }
.modes--compacta .mode-card{
  padding:4px 9px 5px; border-radius:9px; min-width:0; line-height:1.15;
  box-shadow:0 2px 0 rgba(14,59,71,0.10);
  transition:transform .12s ease, border-color .15s ease, background .15s ease;
}
.modes--compacta .mode-card:hover{ border-color: var(--accent); transform:translateY(-1px); }
.modes--compacta .mode-card:active{ transform:translateY(1px); box-shadow:none; }
.modes--compacta .mode-card.active{ box-shadow:none; }
.modes--compacta .mode-mark{ font-size:0.5rem; margin-bottom:1px; padding:0 3px; }
.modes--compacta .mode-title{ font-size:0.68rem; }
.modes--compacta .mode-sub{ display:none; }

/* En móvil la barra se ordena por filas y las teclas de modo ocupan
   la suya propia, centradas, justo debajo del botón accesible. */
@media (max-width: 700px){
  .topbar .modes--compacta{ order:6; flex:1 1 100%; }
  .topbar .modes--compacta .mode-grid{ justify-content:center; flex-wrap:wrap; }
}

/* La familia Manolit, tras el hero (sep-2026): estos enlaces vivían en
   la barra de arriba y bajaron al hueco que dejaron los modos. Mismo
   estilo de enlace de siempre, ahora centrados y con aire. */
.family-zone{
  display:flex; flex-wrap:wrap; justify-content:center; align-items:center;
  gap:10px 22px; max-width:780px; margin:36px auto 0; padding:0 24px;
}

/* Capa de emojis del modo peque (sep-2026, orden de Sandro): cubre la
   ventana entera, no la hero sola. Es fija, no se puede tocar (no tapa
   clics) y solo lleva animaciones CSS de transform y opacity, que es lo
   más barato para la GPU. Al salir del modo peque la capa se quita. */
#pequeFxCapa{ position:fixed; inset:0; overflow:hidden; pointer-events:none; z-index:590; }
@media (prefers-reduced-motion: reduce){ #pequeFxCapa{ display:none; } }

/* Zoom de letra yayo en la barra (sep-2026, orden de Sandro): el control
   se mudó del hero a la última fila del topbar, fija y siempre a mano.
   Sigue saliendo SOLO con el modo yayo (la regla vieja lo muestra) y
   fuera de ese modo no ocupa nada. Fila propia a todo lo ancho, con una
   línea fina arriba para que se lea como una bandeja aparte, y botones
   un punto más pequeños que los del hero para que la fila quede fina. */
.topbar > .yayo-zoom-controls{
  flex:1 1 100%; margin:2px 0 0; padding-top:10px;
  border-top:1px solid var(--line);
}
.topbar .yayo-zoom-btn{ width:52px; height:52px; font-size:1.25rem; }

/* En móvil la fila del zoom va la última de la barra, debajo de las
   teclas de modo: es lo primero que tiene la abuela al entrar. */
@media (max-width: 700px){
  .topbar > .yayo-zoom-controls{ order:7; }
}

/* Cabecera del chat siempre visible (sep-2026, orden de Sandro): la X
   de cierre no se pierde hacia arriba cuando el historial crece. La
   cabecera se pega al techo del panel con márgenes negativos que cubren
   el relleno del panel, así el texto pasa por debajo sin asomar. */
/* X fija de verdad: el panel llevaba padding-top:16px y el sticky no
   puede subir por encima de la caja de contenido de su padre, así que
   siempre quedaba una tira de 16 px por donde se colaba el historial.
   Panel sin padding-top y cabecera pegada al borde. Las esquinas
   redondeadas las recorta el propio overflow del panel. */
.chat-panel{ padding-top:0; }
.chat-head{
  position:sticky; top:0; z-index:2;
  margin:0 -16px 10px; padding:16px 16px 10px;
  background: var(--surface, var(--paper));
  border-bottom:1px solid var(--border, var(--line));
}

/* Botones de inicio del chat en horizontal compacto (sep-2026, orden de
   Sandro): dos columnas iguales, uno al lado del otro. El chip de la
   ruta con sombra (lo crea shadows-route.js) ocupa la fila entera. */
.quick-qs{ display:grid; grid-template-columns:1fr 1fr; }
.quick-qs button{ text-align:center; }
.quick-qs #rsChipRutaChat{ grid-column:1 / -1; justify-content:center; }

/* ============================================================
   MODO OSCURO LEGIBLE (01-oct-2026, orden directa de Sandro)
   "Cualquier texto de la web, en cualquier idioma y en cualquier
   sección, tiene que leerse perfectamente en modo oscuro igual que
   en modo claro." Mínimo AA de contraste, sin excepciones.
   Todo lo de abajo es aditivo y pisa solo lo que fallaba.
   ============================================================ */

/* 1) Las variables --text y --text-soft nunca existieron de verdad:
   quien las usaba caía al gris oscuro del fallback (#333, #444, #666),
   tinta oscura sobre fondo noche (el globo del modo peque, el panel
   científico, sus fechas...). Nacen ahora definidas en los dos temas.
   En oscuro, #B9C6DE sobre el fondo #03050F da más de 11:1 (AAA). */
:root{
  --text:#333333;
  --text-soft:#666666;
}
[data-theme="dark"]{
  --text:#E8F0FF;
  --text-soft:#B9C6DE;
}

/* 2) Fuera TODA sombra de texto en modo oscuro. El desdoblado rojo/azul
   que se veía en la frase del modo peque (un text-shadow decorativo que
   llega de fuera de esta hoja) queda anulado por decreto para cualquier
   texto: limpio y nítido, como en claro. Canvas y SVG se respetan. */
[data-theme="dark"] :not(canvas):not(svg):not(svg *){
  text-shadow:none !important;
}

/* 3) La palabra del orbe (BUENA / GOOD...) iba en blanco sobre el color
   vivo del estado: 2,5:1 sobre el menta del tema claro y 1,3:1 sobre el
   turquesa del oscuro, ilegible. Y no hay un único color de tinta que
   pase AA a la vez sobre menta, ámbar y flamenco. Solución: chapa oscura
   translúcida detrás del texto blanco. Medido con los seis colores de
   estado (tres claros y tres oscuros): entre 5,6:1 y 11,4:1, todo AA. */
.orb-face{
  background:rgba(3,5,15,0.55);
  color:#FFFFFF;
  padding:3px 10px;
  border-radius:999px;
}

/* 4) El botón «escuchar» de las indicaciones paso a paso, cuando está
   activo (aria-pressed), ponía texto blanco sobre --accent-text: en
   oscuro esa variable es un color CLARO por diseño (cian, melocotón,
   menta...), así que quedaba blanco sobre casi blanco (1,4:1 en cosmos
   oscuro; ni en claro se libraba cosmos, con 3,1:1). Ahora: en claro,
   acento oscurecido al 75% con blanco (mínimo 5,1:1 en las cinco
   paletas); en oscuro, acento neón con tinta noche (mínimo 7,8:1).
   El modo accesible (negro sobre blanco) sigue ganando porque su regla
   tiene más especificidad. */
.rs-btn-escuchar[aria-pressed="true"]{
  background:color-mix(in srgb, var(--accent-text) 75%, #000000) !important;
  color:#FFFFFF !important;
}
[data-theme="dark"] .rs-btn-escuchar[aria-pressed="true"]{
  background:var(--accent-text) !important;
  color:#03050F !important;
}

/* 5) El botón LiDAR en oscuro: la regla vieja le cambiaba el fondo a
   --sky-mid (turquesa apagado #4FBFB5) pero dejaba el texto en blanco
   fijo: blanco sobre turquesa = 2,2:1, ilegible. El fondo turquesa se
   queda (es la firma de la noche de verano), la tinta pasa a noche:
   9,2:1. En claro no se toca: blanco sobre petróleo ya daba 12,1:1. */
[data-theme="dark"] .rs-btn-lidar{
  color:#03050F !important;
}

/* 6) El CTA «Buscar ruta» ya era correcto en casi todas las paletas
   (tinta oscura sobre mandarina/menta/ámbar, blanco sobre jacarandá),
   menos en coral: ni la tinta oscura (4,2:1) ni el blanco (4,5:1 justo
   por debajo) llegaban a AA sobre el acento coral. Solo para esa
   paleta, el fondo se oscurece al 78% y el texto pasa a blanco:
   6,1:1 en claro y en oscuro. Las demás paletas no se tocan. */
[data-palette="coral"] #rsBuscarBtn{
  background:color-mix(in srgb, var(--accent) 78%, #000000) !important;
  color:#FFFFFF !important;
}
[data-palette="coral"] #rsBuscarBtn:hover{
  background:color-mix(in srgb, var(--accent) 70%, #000000) !important;
  color:#FFFFFF !important;
  filter:none !important;
}

/* ============================================================
   SISTEMA DE DISEÑO DEL MAPA (01-oct-2026, orden directa de Sandro)
   "Cliente impecable, sobrio y coherente, que no parezca generado
   por IA. Una sola fuente de verdad." Alcance: SOLO la interfaz del
   mapa (barra de acciones, botonera de cámara, panel de capas, tarjeta
   solar, badge y atribución). Nada de lógica, ids ni handlers tocados.

   Tokens: superficie neutra oscura en los dos temas (la zona del mapa
   es una consola estable), un único acento (el naranja de siempre,
   #FF6B1A) reservado a estados activos y a la acción principal,
   cuadrícula de 4/8 px, radios 12 (paneles) y 8 (controles), borde
   fino, sombra mínima, tipografía de la app (sans para UI, mono solo
   para datos), sentence case, transiciones de 150-200 ms.
   Contrastes medidos sobre la superficie #161A20: texto 14,4:1,
   texto suave 6,9:1, iconos 11,3:1, acento 6,1:1. Todo AA o más.
   ============================================================ */
#main-content{
  --mui-bg:#161A20;
  --mui-bg-2:#1C2129;
  --mui-line:rgba(255,255,255,0.09);
  --mui-line-2:rgba(255,255,255,0.14);
  --mui-text:#E6E9EE;
  --mui-soft:#9BA3AD;
  --mui-soft-2:#8B949E;
  --mui-ico:#C9D1D9;
  --mui-accent:#FF6B1A;
  --mui-accent-text:#FFB37A;
  --mui-accent-tint:rgba(255,107,26,0.13);
  --mui-r-panel:12px;
  --mui-r-ctl:8px;
  --mui-h:36px;        /* altura de control (escritorio) */
  --mui-shadow:0 1px 2px rgba(0,0,0,0.24), 0 6px 20px rgba(0,0,0,0.22);
  --mui-t:0.16s ease;
}
@media (pointer:coarse){
  #main-content{ --mui-h:44px; }  /* objetivo táctil mínimo 44 px */
}

/* ---- foco visible, una sola vez para todo el mapa ---- */
#main-content button:focus-visible,
#main-content input:focus-visible,
#main-content a:focus-visible{
  outline:2px solid var(--mui-accent); outline-offset:2px;
}

/* ---- iconos del set propio: máscara + currentColor (un solo trazo
   1,5 px, viewBox 24, extremos redondos). El color lo da el estado. ---- */
#main-content .rs-mui-ico,
.rs-capa-fila::before,
.rs-capa-fila-btn::before,
#rsMapControls button::before,
#rsMapStyleToggle button::before,
#rsCamCtl button::after{
  content:''; flex:0 0 auto; background:currentColor;
  -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat;
  -webkit-mask-position:center; mask-position:center;
  -webkit-mask-size:contain; mask-size:contain;
}

/* ==================== PANEL DE CAPAS UNIFICADO ==================== */
/* La tarjeta: una sola superficie para capas y mapas base. */
#main-content .rs-layer-toggles{
  display:block; margin:0; font-size:13px; font-weight:400;
  background:var(--mui-bg); border:1px solid var(--mui-line);
  border-radius:var(--mui-r-panel); box-shadow:var(--mui-shadow);
  overflow:hidden; color:var(--mui-text);
}
/* Cabecera del panel: el propio botón de plegar hace de cabecera. */
#main-content #rsBtnPlegarCapas{
  display:flex; align-items:center; gap:10px; width:100%;
  min-height:44px; padding:10px 12px; margin:0;
  font-size:13px; font-weight:600; letter-spacing:0; text-transform:none;
  color:var(--mui-text); background:transparent;
  border:none; border-bottom:1px solid var(--mui-line); border-radius:0;
  cursor:pointer; transition:background var(--mui-t);
}
#main-content #rsBtnPlegarCapas:hover{ background:rgba(255,255,255,0.05); border-color:var(--mui-line); }
#main-content #rsBtnPlegarCapas::before{
  content:''; width:18px; height:18px; flex:0 0 auto; background:var(--mui-soft);
  -webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m12 3 9 4.5-9 4.5-9-4.5L12 3z'/%3E%3Cpath d='m3.5 12.2 8.5 4.3 8.5-4.3'/%3E%3Cpath d='m3.5 16.4 8.5 4.3 8.5-4.3'/%3E%3C/svg%3E") no-repeat center/contain;
          mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m12 3 9 4.5-9 4.5-9-4.5L12 3z'/%3E%3Cpath d='m3.5 12.2 8.5 4.3 8.5-4.3'/%3E%3Cpath d='m3.5 16.4 8.5 4.3 8.5-4.3'/%3E%3C/svg%3E") no-repeat center/contain;
}
/* El cheurón al final, gira al plegar. */
#main-content #rsBtnPlegarCapas::after{
  content:''; width:16px; height:16px; margin-left:auto; flex:0 0 auto;
  background:var(--mui-soft); transition:transform var(--mui-t);
  -webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6.5 9.5 5.5 5.5 5.5-5.5'/%3E%3C/svg%3E") no-repeat center/contain;
          mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6.5 9.5 5.5 5.5 5.5-5.5'/%3E%3C/svg%3E") no-repeat center/contain;
}
#main-content .rs-layer-toggles.rs-plegado #rsBtnPlegarCapas{ border-bottom-color:transparent; }
#main-content .rs-layer-toggles.rs-plegado #rsBtnPlegarCapas::after{ transform:rotate(-90deg); }
#main-content .rs-layer-toggles-lista{ display:block; padding:2px 6px 8px; }

/* Títulos de grupo: un solo tamaño, dos niveles de tono. */
#main-content .rs-capa-grupo-tit{
  margin:12px 6px 4px; padding-top:12px; border-top:1px solid var(--mui-line);
  font-size:12px; font-weight:600; letter-spacing:0.01em; color:var(--mui-soft);
}
#main-content .rs-capa-grupo-tit:first-child{ margin-top:6px; padding-top:0; border-top:none; }
#main-content .rs-capa-sub-tit{
  margin:8px 6px 2px; font-size:12px; font-weight:600; color:var(--mui-soft-2);
}

/* ---- filas de capa: icono izquierda, etiqueta izquierda, interruptor
   a la derecha. Todas a la misma altura y con el mismo ritmo. ---- */
#main-content .rs-layer-toggles label.rs-capa-fila{
  display:flex; align-items:center; gap:10px; min-height:var(--mui-h);
  padding:4px 10px; margin:0; border-radius:var(--mui-r-ctl);
  font-size:13px; font-weight:400; color:var(--mui-text);
  cursor:pointer; transition:background var(--mui-t), color var(--mui-t);
}
#main-content .rs-layer-toggles label.rs-capa-fila:hover{ background:rgba(255,255,255,0.05); }
#main-content .rs-layer-toggles label.rs-capa-fila > span{ order:1; flex:0 1 auto; }
#main-content .rs-capa-tag{
  order:1; font-style:normal; font-size:12px; font-weight:600;
  color:var(--mui-soft); border:1px solid var(--mui-line-2);
  border-radius:999px; padding:1px 8px;
}
/* El icono de cada fila (máscara, hereda el color del estado). */
#main-content .rs-capa-fila::before,
#main-content .rs-capa-fila-btn::before{ width:18px; height:18px; color:var(--mui-soft); }
#main-content .rs-capa-fila:has(input:checked)::before{ color:var(--mui-accent); }
/* La fila oculta de calidad del aire manda sobre el display:flex. */
#main-content .rs-layer-toggles label.rs-capa-fila[hidden]{ display:none; }

/* El interruptor: la misma casilla real de siempre, vestida. */
#main-content .rs-layer-toggles input[type="checkbox"]{
  appearance:none; -webkit-appearance:none;
  order:2; margin:0 0 0 auto; flex:0 0 auto;
  width:36px; height:22px; border-radius:999px;
  background-color:#2A3039; border:1px solid var(--mui-line-2);
  background-image:radial-gradient(circle 7px, #C9D1D9 97%, transparent);
  background-repeat:no-repeat; background-position:3px 50%;
  cursor:pointer;
  transition:background-color var(--mui-t), background-position var(--mui-t), border-color var(--mui-t);
}
#main-content .rs-layer-toggles input[type="checkbox"]:checked{
  background-color:var(--mui-accent); border-color:var(--mui-accent);
  background-image:radial-gradient(circle 7px, #1A0E04 97%, transparent);
  background-position:19px 50%;
}

/* Filas que montan un botón (Árboles, Irradiación solar): el botón
   llena la fila y lleva el mismo interruptor dibujado con ::after,
   leyendo aria-pressed o la clase rs-activo de siempre. */
#main-content .rs-capa-fila-btn{ position:relative; display:flex; }
#main-content .rs-capa-fila-btn::before{
  position:absolute; left:10px; top:50%; transform:translateY(-50%);
  pointer-events:none;
}
#main-content .rs-capa-fila-btn:has(button[aria-pressed="true"])::before,
#main-content .rs-capa-fila-btn:has(button.rs-activo)::before{ color:var(--mui-accent); }
#main-content .rs-capa-fila-btn button{
  width:100%; display:flex; align-items:center; gap:10px;
  min-height:var(--mui-h); padding:4px 10px 4px 38px;
  background:transparent; border:none; border-radius:var(--mui-r-ctl);
  font-family:inherit; font-size:13px; font-weight:400; letter-spacing:0;
  text-transform:none; text-align:left; color:var(--mui-text);
  cursor:pointer; box-shadow:none; transition:background var(--mui-t);
}
#main-content .rs-capa-fila-btn button:hover{ background:rgba(255,255,255,0.05); }
#main-content .rs-capa-fila-btn button::after{
  content:''; margin-left:auto; flex:0 0 auto;
  width:36px; height:22px; border-radius:999px;
  background-color:#2A3039; border:1px solid var(--mui-line-2);
  background-image:radial-gradient(circle 7px, #C9D1D9 97%, transparent);
  background-repeat:no-repeat; background-position:3px 50%;
  transition:background-color var(--mui-t), background-position var(--mui-t), border-color var(--mui-t);
}
#main-content .rs-capa-fila-btn button[aria-pressed="true"]::after,
#main-content .rs-capa-fila-btn button.rs-activo::after{
  background-color:var(--mui-accent); border-color:var(--mui-accent);
  background-image:radial-gradient(circle 7px, #1A0E04 97%, transparent);
  background-position:19px 50%;
}

/* ---- iconos del set, por fila ---- */
#main-content .rs-ico-edificios::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 21h18'/%3E%3Cpath d='M5 21V5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v16'/%3E%3Cpath d='M12 21v-9.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1V21'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 21h18'/%3E%3Cpath d='M5 21V5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v16'/%3E%3Cpath d='M12 21v-9.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1V21'/%3E%3C/svg%3E");
}
#main-content .rs-ico-arboles::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='8.5' r='5.5'/%3E%3Cpath d='M12 14v7'/%3E%3Cpath d='M12 10.5 10 8.5'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='8.5' r='5.5'/%3E%3Cpath d='M12 14v7'/%3E%3Cpath d='M12 10.5 10 8.5'/%3E%3C/svg%3E");
}
#main-content .rs-ico-sombras::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 4h11v11H4z'/%3E%3Cpath d='m15 15 5-2.5v-6L15 9'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 4h11v11H4z'/%3E%3Cpath d='m15 15 5-2.5v-6L15 9'/%3E%3C/svg%3E");
}
#main-content .rs-ico-sol::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3Cpath d='M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3Cpath d='M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'/%3E%3C/svg%3E");
}
#main-content .rs-ico-irradiacion::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 20.5 5.6 12h12.8L20 20.5z'/%3E%3Cpath d='M12 12v8.5M7.9 16.2h8.2'/%3E%3Cpath d='M12 3v2.5M6.5 5.5 7.7 7M17.5 5.5 16.3 7'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 20.5 5.6 12h12.8L20 20.5z'/%3E%3Cpath d='M12 12v8.5M7.9 16.2h8.2'/%3E%3Cpath d='M12 3v2.5M6.5 5.5 7.7 7M17.5 5.5 16.3 7'/%3E%3C/svg%3E");
}
#main-content .rs-ico-nubes::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7 18.5a4 4 0 1 1 .4-7.98A5.5 5.5 0 0 1 18.2 12 3.5 3.5 0 0 1 17.5 18.5z'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7 18.5a4 4 0 1 1 .4-7.98A5.5 5.5 0 0 1 18.2 12 3.5 3.5 0 0 1 17.5 18.5z'/%3E%3C/svg%3E");
}
#main-content .rs-ico-microclima::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 13.6V5a2 2 0 1 1 4 0v8.6a4.5 4.5 0 1 1-4 0z'/%3E%3Cpath d='M12 9.5v4'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 13.6V5a2 2 0 1 1 4 0v8.6a4.5 4.5 0 1 1-4 0z'/%3E%3Cpath d='M12 9.5v4'/%3E%3C/svg%3E");
}
#main-content .rs-ico-aire::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 8h8.5a2.75 2.75 0 1 0-2.6-3.6'/%3E%3Cpath d='M3 12.5h13.5a2.75 2.75 0 1 1-2.6 3.6'/%3E%3Cpath d='M3 17h6'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 8h8.5a2.75 2.75 0 1 0-2.6-3.6'/%3E%3Cpath d='M3 12.5h13.5a2.75 2.75 0 1 1-2.6 3.6'/%3E%3Cpath d='M3 17h6'/%3E%3C/svg%3E");
}
#main-content .rs-ico-ruta::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='6' cy='19' r='2.2'/%3E%3Ccircle cx='18' cy='5' r='2.2'/%3E%3Cpath d='M6.3 16.7c2.8-2.2-.6-4.2 2.3-6.4 2.8-2.2 6.2-1.2 7-3.6' stroke-dasharray='3 2.4'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='6' cy='19' r='2.2'/%3E%3Ccircle cx='18' cy='5' r='2.2'/%3E%3Cpath d='M6.3 16.7c2.8-2.2-.6-4.2 2.3-6.4 2.8-2.2 6.2-1.2 7-3.6' stroke-dasharray='3 2.4'/%3E%3C/svg%3E");
}

/* ---- Mapa base: tarjetas del mismo tamaño en cuadrícula regular.
   Los tres son modificadores de la MISMA base vectorial (filtro oscuro,
   WMS del IGN, WMS de Catastro): por eso pueden combinarse y aquí se
   presentan como lo que son, opciones de cartografía de fondo. ---- */
#main-content .rs-capas-mapas{ padding:2px 2px 4px; }
#main-content #rsMapStyleToggle{
  display:grid !important; grid-template-columns:repeat(3, minmax(0,1fr));
  gap:8px; align-items:stretch;
}
/* El antiguo botón maestro "Capas de mapa" ya no hace falta: el panel
   unificado lo absorbe. El JS que lo crea sigue intacto, solo no se ve. */
#main-content #rsBtnCapasMapa{ display:none !important; }
#main-content #rsMapStyleToggle.rs-colapsado .rs-capa-hija{ display:flex !important; }
#main-content #rsMapStyleToggle button{
  display:flex !important; flex-direction:column; align-items:center;
  justify-content:center; gap:6px; min-height:64px; padding:8px 6px;
  font-size:13px; font-weight:400; letter-spacing:0; text-transform:none;
  color:var(--mui-text); background:var(--mui-bg-2) !important;
  border:1px solid var(--mui-line) !important; border-radius:var(--mui-r-ctl);
  box-shadow:none; cursor:pointer; text-align:center;
  transition:border-color var(--mui-t), background-color var(--mui-t), color var(--mui-t);
}
#main-content #rsMapStyleToggle button:hover{
  border-color:var(--mui-line-2) !important; background:#222834 !important;
}
#main-content #rsMapStyleToggle button[aria-pressed="true"]{
  background:var(--mui-accent-tint) !important;
  border-color:var(--mui-accent) !important;
  color:var(--mui-accent-text);
}
#main-content #rsMapStyleToggle button::before{ width:20px; height:20px; color:var(--mui-ico); }
#main-content #rsMapStyleToggle button[aria-pressed="true"]::before{ color:var(--mui-accent); }
#main-content #rsBtnMapaOscuro::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z'/%3E%3C/svg%3E");
}
#main-content #rsBtnMapaIGN::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9 4.5 3.5 6.3v13.4L9 18l6 1.7 5.5-1.8V4.5L15 6.2 9 4.5z'/%3E%3Cpath d='M9 4.5V18M15 6.2v13.4'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9 4.5 3.5 6.3v13.4L9 18l6 1.7 5.5-1.8V4.5L15 6.2 9 4.5z'/%3E%3Cpath d='M9 4.5V18M15 6.2v13.4'/%3E%3C/svg%3E");
}
#main-content #rsBtnCatastro::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 21h18'/%3E%3Cpath d='M5 21V5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v16'/%3E%3Cpath d='M12 21v-9.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1V21'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 21h18'/%3E%3Cpath d='M5 21V5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v16'/%3E%3Cpath d='M12 21v-9.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1V21'/%3E%3C/svg%3E");
}

/* ==================== BARRA DE ACCIONES (flotante, arriba a la
   izquierda del mapa) ==================== */
/* Una sola cápsula oscura con las acciones. El naranja solo aparece
   cuando una acción está activa. */
#main-content #rsMapControls{
  gap:2px !important; padding:4px; max-width:calc(100% - 24px);
  background:rgba(22,26,32,0.94); border:1px solid var(--mui-line);
  border-radius:var(--mui-r-panel); box-shadow:var(--mui-shadow);
  backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
}
#main-content #rsMapControls button{
  display:inline-flex; align-items:center; gap:7px;
  min-height:var(--mui-h); padding:4px 10px !important;
  font-size:13px !important; font-weight:400; letter-spacing:0 !important;
  text-transform:none !important; line-height:1.2;
  color:var(--mui-ico) !important; background:transparent !important;
  border:1px solid transparent !important; border-radius:var(--mui-r-ctl) !important;
  box-shadow:none !important; backdrop-filter:none; -webkit-backdrop-filter:none;
  transition:background var(--mui-t), color var(--mui-t), border-color var(--mui-t);
}
#main-content #rsMapControls button:hover{
  background:rgba(255,255,255,0.06) !important; border-color:transparent !important;
  color:var(--mui-text) !important;
}
#main-content #rsMapControls button.rs-activo{
  background:var(--mui-accent-tint) !important;
  border-color:transparent !important;
  color:var(--mui-accent-text) !important; box-shadow:none !important;
}
#main-content #rsMapControls button::before{ width:16px; height:16px; color:var(--mui-soft); }
#main-content #rsMapControls button:hover::before{ color:var(--mui-text); }
#main-content #rsMapControls button.rs-activo::before{ color:var(--mui-accent); }
/* El botón de plegar la barra: sin glifos ≡/☰, cheurón propio. */
#main-content #rsBtnPlegarControles{ font-size:0 !important; padding:4px 8px !important; }
#main-content #rsBtnPlegarControles::before{
  width:16px; height:16px; transition:transform var(--mui-t);
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m14.5 6.5-5.5 5.5 5.5 5.5'/%3E%3C/svg%3E") !important;
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m14.5 6.5-5.5 5.5 5.5 5.5'/%3E%3C/svg%3E") !important;
}
#main-content #rsMapControls.rs-plegado #rsBtnPlegarControles::before{ transform:rotate(180deg); }
#main-content #rsBtnPickMap::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 21s-6.5-4.9-6.5-10.4a6.5 6.5 0 1 1 13 0C18.5 16.1 12 21 12 21z'/%3E%3Ccircle cx='12' cy='10.4' r='2.3'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 21s-6.5-4.9-6.5-10.4a6.5 6.5 0 1 1 13 0C18.5 16.1 12 21 12 21z'/%3E%3Ccircle cx='12' cy='10.4' r='2.3'/%3E%3C/svg%3E");
}
#main-content #rsBtnMyLocation::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='4.5'/%3E%3Cpath d='M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='4.5'/%3E%3Cpath d='M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3'/%3E%3C/svg%3E");
}
#main-content #rsBtnWalk::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='13.2' cy='4.6' r='1.6'/%3E%3Cpath d='M9.5 20l2-4.8-1.6-2.4.9-3.8 2.9 1.7 2.2.7'/%3E%3Cpath d='M10.8 9.2 8.6 12l-2 .7'/%3E%3Cpath d='m13 10.8.9 3.7 2.6 4.7'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='13.2' cy='4.6' r='1.6'/%3E%3Cpath d='M9.5 20l2-4.8-1.6-2.4.9-3.8 2.9 1.7 2.2.7'/%3E%3Cpath d='M10.8 9.2 8.6 12l-2 .7'/%3E%3Cpath d='m13 10.8.9 3.7 2.6 4.7'/%3E%3C/svg%3E");
}
#main-content #rsBtnGuiaVoz::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 9.5v5h3.2L11.5 18V6L7.2 9.5z'/%3E%3Cpath d='M14.5 9.2a4.2 4.2 0 0 1 0 5.6M17 6.8a7.6 7.6 0 0 1 0 10.4'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 9.5v5h3.2L11.5 18V6L7.2 9.5z'/%3E%3Cpath d='M14.5 9.2a4.2 4.2 0 0 1 0 5.6M17 6.8a7.6 7.6 0 0 1 0 10.4'/%3E%3C/svg%3E");
}
#main-content #rsBtnPaseo::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'/%3E%3Cpath d='M3.3 7l8.7 5 8.7-5M12 22V12'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'/%3E%3Cpath d='M3.3 7l8.7 5 8.7-5M12 22V12'/%3E%3C/svg%3E");
}
#main-content #rsBtnReset::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 8.9'/%3E%3Cpath d='M4.5 4.2v4.7h4.7'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 8.9'/%3E%3Cpath d='M4.5 4.2v4.7h4.7'/%3E%3C/svg%3E");
}

/* ==================== BOTONERA DE CÁMARA (derecha del mapa) ============
   Adiós a los cuadrados naranjas macizos: tres grupos discretos unidos
   (zoom / inclinación y norte / localizar y pantalla completa), mismos
   40 px, iconos del set. Los glifos de texto (+, -, flechas) se ocultan
   y los sustituye el icono; el HTML y el JS no se tocan. */
#main-content #rsCamCtl{ gap:0; }
#main-content #rsCamCtl button{
  width:40px; height:40px; border-radius:0;
  font-size:0 !important; font-weight:400;
  display:flex; align-items:center; justify-content:center; padding:0 !important;
  color:var(--mui-ico) !important; background:rgba(22,26,32,0.94) !important;
  border:1px solid var(--mui-line) !important; border-top-width:0 !important;
  box-shadow:none !important;
  transition:background var(--mui-t), color var(--mui-t);
}
#main-content #rsCamCtl button:first-child{ border-top-width:1px !important; border-radius:10px 10px 0 0; }
#main-content #rsCamCtl button:hover{ background:#232A34 !important; filter:none !important; color:var(--mui-text) !important; }
#main-content #rsCamCtl button:active{ transform:none !important; }
#main-content #rsCamCtl button::after{ width:18px; height:18px; margin:auto; }
/* Los tres iconos que ya eran SVG dentro del botón (brújula, logo
   Manolit, pantalla completa) no llevan ::after de máscara. */
#main-content #rsCamBrujula::after, #main-content #rsCamUbicacion::after,
#main-content #rsCamFull::after{ display:none; }
#main-content #rsCamBrujula svg{ width:18px !important; height:18px !important; }
#main-content #rsCamUbicacion svg{ width:22px !important; height:33px !important; }
/* Radios por grupo: zoom (1-2), inclinación y norte (3-5), localizar y
   pantalla completa (6-7). */
#main-content #rsCamZoomIn{ border-radius:10px 10px 0 0 !important; }
#main-content #rsCamZoomOut{ border-radius:0 0 10px 10px !important; }
#main-content #rsCamPitchUp{ margin-top:10px; border-top-width:1px !important; border-radius:10px 10px 0 0 !important; }
#main-content #rsCamBrujula{ border-radius:0 0 10px 10px !important; }
#main-content #rsCamUbicacion{ margin-top:10px; border-top-width:1px !important; border-radius:10px 10px 0 0 !important; }
#main-content #rsCamFull{ border-radius:0 0 10px 10px !important; }
/* Los iconos de zoom e inclinación se dibujan con máscara. */
#main-content #rsCamZoomIn::after{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='6.5'/%3E%3Cpath d='m21 21-4.8-4.8M11 8.5v5M8.5 11h5'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='6.5'/%3E%3Cpath d='m21 21-4.8-4.8M11 8.5v5M8.5 11h5'/%3E%3C/svg%3E");
}
#main-content #rsCamZoomOut::after{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='6.5'/%3E%3Cpath d='m21 21-4.8-4.8M8.5 11h5'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='6.5'/%3E%3Cpath d='m21 21-4.8-4.8M8.5 11h5'/%3E%3C/svg%3E");
}
#main-content #rsCamPitchUp::after{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 14.5 6-6 6 6'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 14.5 6-6 6 6'/%3E%3C/svg%3E");
}
#main-content #rsCamPitchDown::after{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9.5 6 6 6-6'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9.5 6 6 6-6'/%3E%3C/svg%3E");
}
/* Pantalla completa: el fondo SVG viejo (trazo 2,4 oscuro, ilegible en
   la consola oscura) se cambia por el icono del set en los dos estados. */
#main-content #rsCamCtl button.manolito-fs-btn,
#main-content [data-theme="dark"] #rsCamCtl button.manolito-fs-btn,
#main-content .rs-mapa-oscuro-activo #rsCamCtl button.manolito-fs-btn{
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23C9D1D9' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 3.5H5.5a2 2 0 0 0-2 2V8M16 3.5h2.5a2 2 0 0 1 2 2V8M8 20.5H5.5a2 2 0 0 1-2-2V16M16 20.5h2.5a2 2 0 0 0 2-2V16'/%3E%3C/svg%3E") !important;
  background-size:18px 18px !important;
}
#main-content #rsCamCtl button.manolito-fs-btn.manolito-fs-activo,
#main-content #rsCamCtl button.manolito-fs-btn[aria-pressed="true"],
#main-content [data-theme="dark"] #rsCamCtl button.manolito-fs-btn.manolito-fs-activo,
#main-content [data-theme="dark"] #rsCamCtl button.manolito-fs-btn[aria-pressed="true"],
#main-content .rs-mapa-oscuro-activo #rsCamCtl button.manolito-fs-btn.manolito-fs-activo,
#main-content .rs-mapa-oscuro-activo #rsCamCtl button.manolito-fs-btn[aria-pressed="true"]{
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23FF6B1A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 3.5v3a2 2 0 0 1-2 2H3.5M20.5 8h-3a2 2 0 0 1-2-2v-3M3.5 16h3a2 2 0 0 1 2 2v3M16 20.5v-3a2 2 0 0 1 2-2h3'/%3E%3C/svg%3E") !important;
}
/* El pulso de la brújula ya tiene su animación propia; se queda. */
@media (max-width:480px){
  #main-content #rsCamCtl button{ width:44px; height:44px; }
}

/* ==================== TARJETA DE POSICIÓN SOLAR (la del slider de
   hora, flotante dentro del mapa) ==================== */
/* Misma familia que el panel de capas: misma superficie, radio, borde
   y cabecera. Fuera el degradado naranja de fondo. */
#main-content #rsTimeControls{
  background:rgba(22,26,32,0.94) !important; border:1px solid var(--mui-line) !important;
  border-radius:var(--mui-r-panel) !important; box-shadow:var(--mui-shadow) !important;
  padding:10px 12px; color:var(--mui-text);
  backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
}
#main-content #rsTimeControls .rs-eyebrow{
  font-size:12px !important; font-weight:600; letter-spacing:0.01em !important;
  text-transform:none !important; color:var(--mui-soft) !important;
}
#main-content #rsPlegarBtn{ color:var(--mui-soft) !important; opacity:1 !important; }
#main-content #rsPlegarBtn:hover{ color:var(--mui-text) !important; }
#main-content #rsTimeLabel{ color:var(--mui-text); font-size:13px; font-weight:600; }
#main-content #rsGoldenBadge{
  font-size:12px; font-weight:600; letter-spacing:0;
  color:var(--mui-accent-text); background:var(--mui-accent-tint);
  border:1px solid rgba(255,107,26,0.4);
}
#main-content #rsTimeControls .rs-divisor{ background:var(--mui-line); }
#main-content #rsTimeControls button{
  font-size:13px !important; font-weight:400; letter-spacing:0 !important;
  text-transform:none !important; padding:8px 10px; border-radius:var(--mui-r-ctl);
  background:var(--mui-bg-2) !important; border:1px solid var(--mui-line) !important;
  color:var(--mui-ico) !important; transition:border-color var(--mui-t), color var(--mui-t), background var(--mui-t);
}
#main-content #rsTimeControls button:hover{
  background:#232A34 !important; border-color:var(--mui-line-2) !important;
  color:var(--mui-text) !important;
}
#main-content #rsTimeControls button.rs-btn-capturar{ color:var(--mui-soft) !important; }
#main-content #rsTimeSlider::-webkit-slider-runnable-track{ background:rgba(255,255,255,0.18) !important; }
#main-content #rsTimeSlider::-moz-range-track{ background:rgba(255,255,255,0.18) !important; }
#main-content #rsTimeSlider::-webkit-slider-thumb{
  background:var(--mui-accent); border-color:#161A20 !important;
}
#main-content #rsTimeSlider::-moz-range-thumb{
  background:var(--mui-accent); border-color:#161A20 !important;
}

/* ==================== COLUMNA SOL + LIDAR Y COMPOSICIÓN BAJO EL MAPA ====
   El panel de capas y la tarjeta solar comparten sistema. Todo alineado
   al ancho del mapa, nada centrado flotando. */
#main-content .rs-planetario{
  display:grid; grid-template-columns:minmax(0,1fr) 232px;
  gap:12px; align-items:stretch; justify-content:stretch;
  width:100%; margin:12px 0 4px; text-align:left;
}
#main-content .rs-planetario-capas{
  grid-row:1 / span 2; margin:0; padding:0; border:none; max-width:none;
  align-items:stretch; text-align:left;
}
#main-content .rs-planetario-sol{
  background:var(--mui-bg); border:1px solid var(--mui-line);
  border-radius:var(--mui-r-panel); box-shadow:var(--mui-shadow);
  padding:12px; display:flex; flex-direction:column; align-items:center; gap:4px;
}
#main-content .rs-sol-card-tit{
  align-self:flex-start; margin:0 0 4px; font-size:12px; font-weight:600;
  letter-spacing:0.01em; color:var(--mui-soft);
}
#main-content .rs-planetario svg{ filter:none; }
#main-content .rs-planetario-info{ font-size:12px; color:var(--mui-soft); letter-spacing:0; }
#main-content a.rs-btn-lidar{
  display:flex; align-items:center; justify-content:center; gap:8px;
  min-height:var(--mui-h); padding:8px 12px;
  background:var(--mui-bg-2) !important; border:1px solid var(--mui-line) !important;
  border-radius:var(--mui-r-ctl) !important; box-shadow:none !important;
  color:var(--mui-text) !important; font-size:13px; font-weight:600;
  text-decoration:none; transition:border-color var(--mui-t), background var(--mui-t);
}
#main-content a.rs-btn-lidar:hover{
  background:#232A34 !important; border-color:var(--mui-line-2) !important; filter:none !important;
}
#main-content a.rs-btn-lidar svg{ width:18px; height:18px; }

/* ==================== PIEZAS SUELTAS DEL MAPA ==================== */
/* Badge de sombra de la ruta y atribución: la misma consola. */
#main-content #rsShadowBadge{
  background:rgba(22,26,32,0.94) !important; border:1px solid var(--mui-line);
  border-radius:var(--mui-r-ctl); color:var(--mui-text);
}
#main-content #rsShadowBadgeCerrar{ color:var(--mui-soft) !important; }
#main-content .maplibregl-ctrl-attrib{
  background:rgba(22,26,32,0.85) !important; color:var(--mui-soft-2);
  border-radius:6px 0 0 0;
}
#main-content .maplibregl-ctrl-attrib a{ color:var(--mui-soft); }
/* El joystick del paseo sigue la misma superficie. */
#main-content #rsJoystick{
  background:rgba(22,26,32,0.72) !important; border-color:var(--mui-line-2) !important;
}

/* ==================== MÓVIL: el panel como hoja inferior del mapa ==== */
@media (max-width:900px){
  #main-content .rs-planetario{ grid-template-columns:1fr; gap:12px; }
  #main-content .rs-planetario-capas{ grid-row:auto; }
}
@media (max-width:640px){
  /* Hoja pegada al borde inferior del mapa, ancho completo, con scroll
     propio para no comerse la pantalla. */
  #main-content .rs-planetario{ margin-top:8px; }
  #main-content .rs-layer-toggles-lista{
    max-height:46vh; overflow-y:auto; overscroll-behavior:contain;
    -webkit-overflow-scrolling:touch;
  }
  /* En pantalla estrecha los mapas base van a una tarjeta por fila para
     que el dedo acierte siempre (44 px mínimo). */
  #main-content #rsMapStyleToggle{ grid-template-columns:1fr; }
  #main-content #rsMapStyleToggle button{
    flex-direction:row; min-height:var(--mui-h); justify-content:flex-start;
    padding:8px 12px; text-align:left;
  }
}

/* ==================== MOVIMIENTO EDUCADO ==================== */
@media (prefers-reduced-motion: reduce){
  #main-content .rs-layer-toggles input[type="checkbox"],
  #main-content .rs-capa-fila-btn button::after,
  #main-content #rsBtnPlegarCapas::after,
  #main-content #rsBtnPlegarControles::before{ transition:none !important; }
}

/* ============================================================
   BOTÓN FLOTANTE DE CAPAS + PANEL DESPLEGABLE + MAPA A VIEWPORT
   (06-oct-2026, orden directa de Sandro)

   Solo presentación: la lógica de capas, los ids y el estado global
   no se tocan. shadows-route.js traslada el panel dentro del mapa y
   crea el botón flotante; sin JavaScript el panel se queda visible
   en la cuadrícula de siempre y lo de este bloque queda inerte (la
   clase body.rs-capas-pop solo la pone el JS).
   ============================================================ */

/* ---------- El mapa ocupa el viewport completo ----------
   Fuera las alturas fijas en px/vh que lo recortaban: 100dvh con
   fallback a 100vh (la barra de direcciones de Chrome Android ya no
   descuadra nada) y un suelo de 440 px para pantallas muy bajas.
   El canvas se reajusta con ResizeObserver (shadows-route.js). */
#shadowRouteMap{ height:100vh; height:100dvh; min-height:440px; }

/* ---------- La cuadrícula bajo el mapa, con y sin JS ----------
   La sección de OpenStreetMap y el botón LiDAR siempre a lo ancho;
   dense rellena huecos mientras el panel aún vive en la cuadrícula. */
#main-content .rs-planetario{ grid-auto-flow:dense; }
#main-content .rs-planetario > #rsColaboraOSM{ grid-column:1 / -1; justify-self:center; }
#main-content .rs-planetario > a.rs-btn-lidar{ grid-column:1 / -1; justify-self:center; }

/* 08-oct-2026 (orden de Sandro): la cúpula del planetario ya NO vive en
   la columna lateral derecha. El widget bajo el mapa es una sola columna
   en flujo normal: capas, cúpula centrada, «¿No hay 3D en tu zona?» y
   LiDAR. Mismo orden en 360 px, tablet y escritorio, con el panel de
   capas en la página (cuadrícula) o en el mapa (popover). */
#main-content .rs-planetario{ grid-template-columns:minmax(0,1fr); }
#main-content .rs-planetario-capas{ grid-row:auto; }
#main-content .rs-planetario > .rs-planetario-sol{ grid-column:1 / -1; justify-self:center; }
body.rs-capas-pop #main-content #rsPlanetario.rs-planetario{ flex-direction:column; flex-wrap:nowrap; }
/* Con el panel ya en modo popover, la cuadrícula vuelve a la fila
   centrada de siempre (la de antes del rediseño). */
body.rs-capas-pop #main-content .rs-planetario{
  display:flex; flex-direction:row; flex-wrap:wrap;
  justify-content:center; align-items:center; gap:14px 22px;
}

/* ---------- El botón flotante ----------
   Escritorio: lateral derecho, apilado sobre la columna de zoom con
   el mismo margen. Móvil: esquina inferior derecha, por encima de la
   safe-area y de la atribución. 44 px, icono Layers propio (el mismo
   del panel), y al abrirse cambia a X con el estado de selección. */
#main-content #rsBtnCapasFlotante{
  position:absolute; z-index:1100;
  top:calc(50% - 216px);
  right:calc(12px + env(safe-area-inset-right, 0px));
  width:44px; height:44px; padding:0; margin:0;
  display:flex; align-items:center; justify-content:center;
  font-family:inherit;
  background:var(--mui-bg); color:var(--mui-ico);
  border:1px solid var(--mui-line-2); border-radius:var(--mui-r-panel);
  box-shadow:var(--mui-shadow); cursor:pointer;
  touch-action:manipulation; -webkit-tap-highlight-color:transparent;
  transition:background var(--mui-t), border-color var(--mui-t), color var(--mui-t);
}
#main-content #rsBtnCapasFlotante::before{
  content:""; width:22px; height:22px; background:currentColor;
  -webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m12 3 9 4.5-9 4.5-9-4.5L12 3z'/%3E%3Cpath d='m3.5 12.2 8.5 4.3 8.5-4.3'/%3E%3Cpath d='m3.5 16.4 8.5 4.3 8.5-4.3'/%3E%3C/svg%3E") no-repeat center/contain;
          mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m12 3 9 4.5-9 4.5-9-4.5L12 3z'/%3E%3Cpath d='m3.5 12.2 8.5 4.3 8.5-4.3'/%3E%3Cpath d='m3.5 16.4 8.5 4.3 8.5-4.3'/%3E%3C/svg%3E") no-repeat center/contain;
}
#main-content #rsBtnCapasFlotante[aria-expanded="true"]{
  background:var(--mui-accent-tint); border-color:var(--mui-accent);
  color:var(--mui-accent-text);
}
#main-content #rsBtnCapasFlotante[aria-expanded="true"]::before{
  -webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 6l12 12M18 6 6 18'/%3E%3C/svg%3E") no-repeat center/contain;
          mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 6l12 12M18 6 6 18'/%3E%3C/svg%3E") no-repeat center/contain;
}
#main-content #rsBtnCapasFlotante:focus-visible{
  outline:2px solid var(--mui-accent-text); outline-offset:2px;
}
@media (hover:hover) and (pointer:fine){
  #main-content #rsBtnCapasFlotante:hover{ background:#232A34; }
  #main-content #rsBtnCapasFlotante[aria-expanded="true"]:hover{ background:var(--mui-accent-tint); }
}

/* ---------- El panel como popover (escritorio y tablet) ----------
   Anclado al botón, 290 px, por encima de todos los controles de
   MapLibre (z-index 1110), con scroll propio y transición de 0,2 s
   con 6 px de desplazamiento. */
body.rs-capas-pop #main-content .rs-planetario-capas{
  position:absolute; z-index:1110;
  top:calc(50% - 164px);
  right:calc(12px + env(safe-area-inset-right, 0px));
  width:290px; max-width:calc(100% - 24px); max-height:calc(100% - 24px);
  margin:0; padding:0; border:none;
  transition:opacity .2s ease-in-out, transform .2s ease-in-out, visibility .2s ease-in-out;
}
body.rs-capas-pop #main-content .rs-planetario-capas.rs-capas-cerrada{
  opacity:0; visibility:hidden; pointer-events:none;
  transform:translateY(6px);
}
body.rs-capas-pop #main-content .rs-layer-toggles-lista{
  max-height:min(60dvh, 460px); overflow-y:auto;
  overscroll-behavior:contain; -webkit-overflow-scrolling:touch;
}

/* La cabecera del popover: título a la izquierda, X a la derecha.
   El cheurón del plegado viejo ya no aplica (ahora cierra). */
#main-content .rs-capas-cabecera{ display:flex; align-items:center; }
#main-content #rsBtnCerrarCapas{ display:none; }
body.rs-capas-pop #main-content .rs-capas-cabecera{ border-bottom:1px solid var(--mui-line); }
body.rs-capas-pop #main-content #rsBtnPlegarCapas{ flex:1 1 auto; border-bottom-color:transparent; }
body.rs-capas-pop #main-content #rsBtnPlegarCapas::after{ content:none; }
body.rs-capas-pop #main-content #rsBtnCerrarCapas{
  margin:0 6px 0 auto; width:32px; height:32px; flex:0 0 auto;
  display:flex; align-items:center; justify-content:center;
  background:transparent; border:none; border-radius:var(--mui-r-ctl);
  color:var(--mui-soft); cursor:pointer; padding:0; font-family:inherit;
  touch-action:manipulation; -webkit-tap-highlight-color:transparent;
}
#main-content #rsBtnCerrarCapas::before{
  content:""; width:16px; height:16px; background:currentColor;
  -webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 6l12 12M18 6 6 18'/%3E%3C/svg%3E") no-repeat center/contain;
          mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 6l12 12M18 6 6 18'/%3E%3C/svg%3E") no-repeat center/contain;
}
#main-content #rsBtnCerrarCapas:focus-visible{
  outline:2px solid var(--mui-accent-text); outline-offset:2px;
}
@media (hover:hover) and (pointer:fine){
  #main-content #rsBtnCerrarCapas:hover{ background:rgba(255,255,255,0.06); color:var(--mui-text); }
}

/* touch-action de los botones del panel, sin tocar el lienzo. */
#main-content .rs-layer-toggles button,
#main-content #rsMapStyleToggle button{ touch-action:manipulation; }

/* ---------- Safe-areas en los controles del mapa ---------- */
#main-content #rsCamCtl{
  right:calc(12px + env(safe-area-inset-right, 0px)) !important;
}
#main-content #rsMapControls{
  top:calc(10px + env(safe-area-inset-top, 0px)) !important;
  left:calc(10px + env(safe-area-inset-left, 0px)) !important;
}

/* ---------- Pantallas bajas de escritorio: el flotante sube ---------- */
@media (min-width:640px) and (max-height:600px){
  #main-content #rsBtnCapasFlotante{ top:calc(12px + env(safe-area-inset-top, 0px)); }
  body.rs-capas-pop #main-content .rs-planetario-capas{ top:calc(64px + env(safe-area-inset-top, 0px)); }
}

/* ---------- Móvil: bottom sheet ----------
   12-oct-2026 (orden de Sandro, rediseño del panel en móvil): la hoja
   era un flex en columna con flex-wrap:wrap heredado de la regla base;
   al superar el contenido la altura máxima, la lista se ENVOLVÍA a una
   segunda columna: cabecera sola a la izquierda (columna vacía debajo),
   lista montando una columna nueva y los interruptores cortados por el
   borde derecho de la tarjeta. Ahora: nowrap en TODOS los idiomas, una
   sola columna a ancho completo, la lista llena la tarjeta y hace scroll
   interno fluido, y la hoja flota separada de los bordes (ni la barra
   del sistema, ni el widget solar ni el borde de pantalla la tocan),
   con la safe-area respetada y la última fila («Mapa oscuro») entera
   gracias al scroll-padding. La animación de apertura y cierre es la
   misma transición suave de siempre, con un desplazamiento un poco más
   de hoja (14 px) al flotar sobre el mapa. */
@media (max-width:639.98px){
  #main-content #rsBtnCapasFlotante{
    top:auto;
    bottom:calc(30px + env(safe-area-inset-bottom, 0px));
    right:calc(12px + env(safe-area-inset-right, 0px));
  }
  body.rs-capas-pop #main-content .rs-planetario-capas{
    top:auto;
    left:calc(8px + env(safe-area-inset-left, 0px));
    right:calc(8px + env(safe-area-inset-right, 0px));
    bottom:calc(10px + env(safe-area-inset-bottom, 0px));
    width:auto; max-width:none; max-height:min(72dvh, 560px);
    display:flex; flex-direction:column;
  }
  body.rs-capas-pop #main-content .rs-planetario-capas.rs-capas-cerrada{ transform:translateY(14px); }
  body.rs-capas-pop #main-content .rs-layer-toggles{
    border-radius:16px; max-height:100%;
    display:flex; flex-direction:column; flex-wrap:nowrap; align-items:stretch;
    padding-bottom:0; overflow:hidden;
  }
  /* El asa visual de la hoja. */
  body.rs-capas-pop #main-content .rs-layer-toggles::before{
    content:""; flex:0 0 auto; width:36px; height:4px; border-radius:2px;
    background:var(--mui-line-2); margin:6px auto 0;
  }
  /* La lista: una columna a todo el ancho de la tarjeta, con el scroll
     interno de siempre y aire abajo para que la última fila (los mapas
     base) nunca quede a medias ni pegada al borde. */
  body.rs-capas-pop #main-content .rs-layer-toggles-lista{
    flex:1 1 auto; min-height:0; width:100%; align-self:stretch;
    max-height:none; overflow-y:auto;
    overscroll-behavior:contain; -webkit-overflow-scrolling:touch;
    padding:2px 8px calc(10px + env(safe-area-inset-bottom, 0px));
    scroll-padding-bottom:12px;
  }
  /* Filas e interruptores a todo el ancho: nada queda cortado por el
     borde, en LTR y en RTL (el nowrap de arriba es la pieza clave). */
  body.rs-capas-pop #main-content .rs-layer-toggles label.rs-capa-fila,
  body.rs-capas-pop #main-content .rs-capa-fila-btn button{ width:100%; box-sizing:border-box; }
}

/* ---------- Hover solo donde hay hover de verdad ---------- */
@media (hover:none){
  #main-content .rs-capa-fila:hover{ background:transparent; }
  #main-content #rsMapControls button:hover{ background:transparent !important; }
}

/* ---------- Movimiento educado ---------- */
@media (prefers-reduced-motion: reduce){
  body.rs-capas-pop #main-content .rs-planetario-capas,
  #main-content #rsBtnCapasFlotante{ transition:none !important; }
}

/* ============================================================
   REPARACIONES URGENTES (06-oct-2026, tarde, orden directa de Sandro)
   ============================================================ */

/* ---------- 3. PLANETARIO RESTAURADO ----------
   La cúpula de posición solar queda EXACTAMENTE como estaba antes del
   rediseño: sin tarjeta, sin borde, sin fondo ni sombra de caja, con su
   sombra flotante original y los datos en el tamaño y color de siempre. */
#main-content .rs-planetario-sol{
  background:transparent; border:none; border-radius:0; box-shadow:none;
  padding:0; display:flex; flex-direction:column; align-items:center; gap:10px;
}
#main-content .rs-planetario svg{ filter:drop-shadow(0 6px 18px rgba(14,59,71,0.18)); }
#main-content .rs-planetario-info{ font-size:0.62rem; color:var(--sky-mid); letter-spacing:0.02em; }

/* --- Entrada al juego «Atrapa a Manolit∞» (07-oct-2026, orden de Sandro).
   El botón vive dentro de .peque-character, que ya es display:none fuera
   del modo peque: la entrada solo existe en la sección de niños. --- */
.peque-juego-btn{ margin-top:12px; min-height:44px; padding:10px 18px; border-radius:14px;
  border:2px solid #7A0016; background:#E6A100; color:#2A1A05; font-weight:700;
  font-size:1rem; cursor:pointer; }
.peque-juego-btn:focus-visible{ outline:3px solid #007A87; outline-offset:2px; }
/* El contenedor del panel del juego va en flujo normal (no flota, no tapa).
   Solo ocupa sitio cuando hay juego montado, y solo en modo peque. */
.juego-manolit-cont:empty{ display:none; }
body:not(.mode-peque) .juego-manolit-cont{ display:none; }

/* ============================================================
   MODO PEQUE — REDISEÑO VISUAL (07-oct-2026, orden de Sandro)
   Jerarquía vertical clara de arriba abajo: ciudad, nube, titular,
   explicación, calidad del aire y botones de acción. Nada flota
   sobre nada. Sección aditiva: pisa solo lo que el rediseño cambia.
   ============================================================ */

/* La nube se queda sola dentro del orb-wrap: al sacar el titular y el
   botón, la caja ya no se desborda ni se sube encima del selector de
   ciudad. Altura más justa para que el conjunto respire. */
body.mode-peque .orb-wrap{ height:150px; margin-bottom:6px; }

/* El titular vive en flujo normal y a todo el ancho útil del hero (ya
   no encerrado en los 200px del orb-wrap): tarjeta que abraza el texto
   hasta 560px, borde dorado de marca y tinta legible. Idealmente una
   línea en móvil, dos como mucho. Fuera del modo peque no existe. */
.peque-message{ display:none; }
body.mode-peque .peque-message{
  display:block; box-sizing:border-box;
  width:fit-content; max-width:560px; margin:6px auto 0;
  font-size:clamp(1.25rem, 4.4vw, 1.65rem); line-height:1.28;
  padding:12px 22px; border-radius:22px;
  background:var(--surface, #fff); border:2px solid #E6A100;
  box-shadow:0 4px 12px rgba(0,0,0,0.08);
  color:var(--text, #26424B); font-weight:700;
}

/* La explicación respira bajo el titular, mismo ancho de lectura. */
body.mode-peque .human-line{ max-width:560px; margin-top:14px; }

/* La calidad del aire se lee de un vistazo: chip sólido con buen
   contraste, nada de letra pequeña perdida. El hero centra el chip
   con su text-align. */
body.mode-peque .sub-line{
  display:inline-block; font-size:1.02rem; font-weight:600;
  color:var(--sky-deep); background:var(--mist);
  padding:6px 16px; border-radius:999px; margin:6px auto 4px;
}

/* Botones de acción juntos y en flujo, grandes y fáciles de tocar
   (52px de alto, por encima del mínimo de 44). En móvil van apilados;
   con 560px o más, uno al lado del otro. Fuera del modo peque el
   bloque solo lleva el botón de ayuda, centrado como siempre. */
.peque-actions{ display:flex; flex-direction:column; align-items:center; gap:12px; margin-top:20px; }
.peque-actions .im-lost-btn{ margin-top:0; }
@media (min-width:560px){
  body.mode-peque .peque-actions{ flex-direction:row; justify-content:center; gap:16px; }
}

/* El botón del juego solo existe en modo peque y destaca como acción
   principal (dorado de marca) sin pisar nada. */
.peque-juego-btn{ display:none; }
body.mode-peque .peque-juego-btn{
  display:inline-block; margin-top:0; min-height:52px; padding:12px 26px;
  font-size:1.1rem; border-radius:16px;
  transition:transform 0.2s cubic-bezier(0.4,0,0.2,1), background-color 0.2s;
}
body.mode-peque .peque-juego-btn:hover{ background:#F2B01E; transform:translateY(-2px); }
body.mode-peque .peque-juego-btn:active{ transform:translateY(1px); }

/* El mismo juego en modo ciudadano (07-oct-2026, NUEVA ORDEN punto 4):
   botón propio con contenido adulto, visible solo cuando el modo activo
   es ciudadano (sin clase de modo, o con mode-ciudadano tras applyMode).
   En peque, científico y yayo no aparece: los modos no se mezclan.
   Mismo tamaño táctil que el de peques (52px, por encima de 44). */
.ciudadano-juego-btn{ display:none; }
body:not(.mode-peque):not(.mode-cientifico):not(.mode-yayo) .ciudadano-juego-btn{
  display:inline-block; margin-top:0; min-height:52px; padding:12px 26px;
  font-size:1.05rem; border-radius:16px; border:0; cursor:pointer;
  font-weight:700; color:#FBFAF7; background:#007A87;
  transition:transform 0.2s cubic-bezier(0.4,0,0.2,1), background-color 0.2s;
}
body:not(.mode-peque):not(.mode-cientifico):not(.mode-yayo) .ciudadano-juego-btn:hover{ background:#00919F; transform:translateY(-2px); }
body:not(.mode-peque):not(.mode-cientifico):not(.mode-yayo) .ciudadano-juego-btn:active{ transform:translateY(1px); }
.ciudadano-juego-btn:focus-visible{ outline:3px solid #7A0016; outline-offset:2px; }
/* El contenedor del juego también vive en modo ciudadano: la regla
   antigua lo escondía fuera de peque. Con panel montado (no vacío) y
   modo ciudadano activo, se enseña. En científico y yayo sigue oculto. */
body:not(.mode-peque):not(.mode-cientifico):not(.mode-yayo) .juego-manolit-cont:not(:empty){ display:block; }
@media (min-width:560px){
  body:not(.mode-peque):not(.mode-cientifico):not(.mode-yayo) .peque-actions{ flex-direction:row; justify-content:center; gap:16px; }
}

/* El chat de ayuda es la acción secundaria en modo peque: contorno
   teal para que no compita con el dorado del juego. */
body.mode-peque .im-lost-btn{
  background:var(--surface, #fff); color:#007A87; border:2px solid #007A87;
  font-weight:700; font-size:1.05rem; min-height:52px; padding:12px 24px;
  border-radius:16px; box-shadow:none;
}
body.mode-peque .im-lost-btn:hover{ background:#007A87; color:#fff; transform:translateY(-2px); box-shadow:0 6px 14px rgba(0,122,135,0.25); }
body.mode-peque .im-lost-btn:active{ transform:translateY(1px); box-shadow:none; }
[data-theme="dark"] body.mode-peque .im-lost-btn{ color:#7FD8E4; border-color:#7FD8E4; }
[data-theme="dark"] body.mode-peque .im-lost-btn:hover{ background:#007A87; color:#fff; border-color:#007A87; }

/* Decoración intencionada: dos piezas del lenguaje Manolit∞ (sol dorado
   y nube pequeña teal) quietas en las esquinas superiores, donde nunca
   hay contenido. Solo se pintan en pantallas anchas; con menos de
   1024px no hay margen lateral garantizado y no aparecen. Animación
   solo de transform, pausada con la pestaña oculta.
   08-oct-2026 (ARREGLO URGENTE, orden de Sandro): la capa vuelve a ser
   FIJA A TODA LA VENTANA, como hace cuatro días. La versión absoluta
   dentro del hero encerraba los 90 emojis en ese cajón y se agolpaban
   de modo horrible. Al ir fija y con z-index 590 los emojis suben por
   TODA la web (esta regla y la de sep-2026 dicen ahora lo mismo, así
   que ninguna pisa a la otra). pointer-events:none: nunca estorba. */
#pequeFxCapa{ position:fixed; inset:0; overflow:hidden; pointer-events:none; z-index:590; }
/* 07-oct-2026 (NUEVA ORDEN, urgente): tamaño decorativo con límites.
   El sol gigante de la captura venía de un SVG sin medida propia
   estirado por el navegador con una hoja vieja en caché. Ahora el
   SVG lleva width/height intrínsecos y la CSS usa clamp(): jamás
   puede volver a ocupar media pantalla. Además el contenido del
   hero va siempre por encima de esta capa. */
#pequeFxCapa .peque-deco{ position:absolute; width:clamp(36px, 4vw, 56px); height:auto; aspect-ratio:1; opacity:0.5; pointer-events:none; animation:pequeDecoFlota 7s ease-in-out infinite alternate; }
#pequeFxCapa .peque-deco svg{ display:block; width:100%; height:100%; }
#pequeFxCapa .peque-deco-sol{ left:16px; top:12px; }
#pequeFxCapa .peque-deco-nube{ right:16px; top:56px; width:clamp(44px, 5vw, 68px); aspect-ratio:4/3; animation-duration:9s; }
body.mode-peque .hero > *:not(#pequeFxCapa){ position:relative; z-index:1; }
@keyframes pequeDecoFlota{ from{ transform:translateY(-6px) rotate(-3deg); } to{ transform:translateY(8px) rotate(3deg); } }
.peque-fx-pausa .peque-deco{ animation-play-state:paused; }
/* Emojis flotantes del modo peque: pocos, pegados a los bordes,
   detrás del contenido, solo transform y opacity, pausados con la
   pestaña oculta y apagados con prefers-reduced-motion.
   07-oct (orden directa de Sandro, «recupéralos de verdad»):
   visibilidad subida para que se VEAN. Siguen siendo 6 spans sin
   JS, animación solo transform/opacity: el coste es el mismo. */
#pequeFxCapa .peque-emoji{ position:absolute; font-size:clamp(22px, 2.6vw, 32px); line-height:1; opacity:0.62; pointer-events:none; animation:pequeEmojiFlota 9s ease-in-out infinite alternate; }
@keyframes pequeEmojiFlota{ from{ transform:translateY(-7px); opacity:0.5; } to{ transform:translateY(9px); opacity:0.72; } }
.peque-fx-pausa .peque-emoji{ animation-play-state:paused; }

/* 08-oct-2026 (orden de Sandro, punto 2): campo de más de 80 emojis
   pequeños movidos por UN solo requestAnimationFrame (la función
   iniciarPequeFxMotor del index). Solo transform/opacity, capa con
   pointer-events:none detrás del contenido, pausa con la pestaña
   oculta y sin arrancar con prefers-reduced-motion. Los spans viejos
   con animación CSS ya no se generan; sus reglas quedan dormidas. */
#pequeFxCapa .peque-fx-campo{ position:absolute; inset:0; overflow:hidden; pointer-events:none; }
#pequeFxCapa .peque-fx-emoji{
  position:absolute; top:0; left:0; font-size:16px; line-height:1;
  pointer-events:none; user-select:none; will-change:transform,opacity;
}
@media (max-width:1023px){
  #pequeFxCapa .peque-fx-emoji{ font-size:14px; }
}
@media (max-width:1023px){
  /* En pantallas sin margen lateral no caben los dibujos SVG, pero
     los emojis SÍ se quedan todos (orden de Sandro 07-oct): van en
     los bordes del hero, detrás del contenido, tamaño prudente. */
  #pequeFxCapa{ display:block; }
  #pequeFxCapa .peque-deco{ display:none; }
  #pequeFxCapa .peque-emoji{ display:block; font-size:20px; }
  @keyframes pequeEmojiFlota{ from{ transform:translateY(-6px); opacity:0.42; } to{ transform:translateY(8px); opacity:0.6; } }
}

/* Movimiento reducido de verdad: la nube no flota y el titular no
   salta. Las reglas antiguas quedaban pisadas por otras posteriores;
   al ir esta sección la última de la hoja, aquí manda esto. */
@media (prefers-reduced-motion: reduce){
  body.mode-peque .peque-cloud{ animation:none; }
  body.mode-peque .peque-message{ animation:none; }
  #pequeFxCapa{ display:none; }
}

/* --- Arreglo encontrado probando el modo peque (07-oct-2026):
   el contain-intrinsic-size de las secciones diferidas recordaba un
   ANCHO de 900px. Mientras la sección estaba fuera de pantalla, ese
   ancho fantasma inflaba la rejilla del widget solar y la página
   entera desbordaba a la derecha en móviles y en horizontal (scroll
   lateral real en producción hasta que el usuario bajaba y la sección
   se pintaba de verdad). El ancho de recuerdo pasa a 320px (cabe en
   cualquier móvil) y la altura sigue en 900px, que era su misión:
   estabilizar la barra de scroll. Medido tras el cambio: scrollWidth
   igual al viewport en 360, 390, 768, 1024, 1440 y en horizontal. */
.forecast-section, .map-section, .explain, .content{
  contain-intrinsic-size: auto 320px auto 900px;
}

/* ============================================================
   PANEL DE CAPAS — CONTROL SEGMENTADO, SCROLLBAR Y Z-INDEX
   (07-oct-2026, tarde, orden directa de Sandro)

   1) «Capas de mapa» deja de ser una caja con tarjetas y acordeón:
      es un control segmentado plano de dos botones, [Mapa claro]
      [Mapa IGN]. Activo en naranja, inactivo en gris, cambio de
      capa inmediato. Sin cajas decorativas ni flecha (el JS ya no
      crea el botón maestro: sus reglas viejas quedan inertes).
   2) Catastro 3D sale del grupo de mapas base y pasa a fila-toggle
      individual (#rsMonteCatastro), con interruptor a la derecha
      como el resto de controles (icono propio de parcelas).
   3) Scrollbar del panel: fina (5px), discreta, sin flechas ni
      botones, semitransparente sobre el fondo oscuro y un poco
      más clara al pasar el ratón.
   4) Z-index: los marcadores del mapa (el Manolit que camina
      llevaba z-index:999 en línea) quedan SIEMPRE por debajo del
      panel y de los controles fijos. Nada flota encima de los
      botones del panel.
   Al ir esta sección la última de la hoja, gana a las reglas
   anteriores con la misma especificidad.
   ============================================================ */

/* ---- 1) Control segmentado de mapa base ---- */
#main-content #rsMapStyleToggle{
  display:flex !important; flex-direction:row !important; flex-wrap:nowrap !important;
  gap:4px !important; align-items:stretch !important;
  width:100%; /* el contenedor (.rs-capas-mapas) es flex: sin esto el
                 segmentado encogía a su contenido y no llenaba la fila */
  padding:2px 4px 6px; background:transparent; border:none; box-shadow:none;
}
#main-content #rsMapStyleToggle button{
  flex:1 1 0; min-width:0; min-height:44px;
  display:flex !important; flex-direction:row !important;
  align-items:center; justify-content:center; gap:8px;
  padding:8px 10px !important; margin:0;
  font-family:inherit; font-size:13px !important; font-weight:600 !important;
  letter-spacing:0 !important; text-transform:none !important; line-height:1.2;
  white-space:nowrap;
  color:var(--mui-soft) !important; background:transparent !important;
  border:none !important; border-radius:10px !important; box-shadow:none !important;
  cursor:pointer; text-align:center; backdrop-filter:none; -webkit-backdrop-filter:none;
  transition:background var(--mui-t), color var(--mui-t);
}
#main-content #rsMapStyleToggle button:hover{
  background:rgba(255,255,255,0.06) !important; color:var(--mui-text) !important;
}
#main-content #rsMapStyleToggle button[aria-pressed="true"],
#main-content #rsMapStyleToggle button[aria-pressed="true"]:hover{
  background:var(--mui-accent) !important; color:#1A0E04 !important;
}
#main-content #rsMapStyleToggle button:focus-visible{
  outline:2px solid var(--mui-accent-text); outline-offset:2px;
}
#main-content #rsMapStyleToggle button::before{ width:16px; height:16px; color:currentColor; }
/* El segmento claro lleva sol (antes heredaba la luna del viejo
   «Mapa oscuro», que ya no existe como botón). */
#main-content #rsBtnMapaOscuro::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3Cpath d='M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3Cpath d='M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'/%3E%3C/svg%3E");
}
@media (hover:none){
  #main-content #rsMapStyleToggle button:hover{ background:transparent !important; color:var(--mui-soft) !important; }
  #main-content #rsMapStyleToggle button[aria-pressed="true"]:hover{ background:var(--mui-accent) !important; color:#1A0E04 !important; }
}

/* El icono del segmento activo hereda el color del texto del botón.
   Sin esto, una regla antigua lo pintaba naranja (pensada para cuando
   el activo era un botón fantasma con fondo oscuro) y el sol se
   volvía invisible sobre el relleno naranja: naranja sobre naranja. */
#main-content #rsMapStyleToggle button[aria-pressed="true"]::before{ color:inherit; }

/* ---- 2) Catastro 3D como fila-toggle: icono de parcelas ---- */
#main-content .rs-ico-catastro::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 4h7v7H4z'/%3E%3Cpath d='M13 4h7v7h-7z'/%3E%3Cpath d='M4 13h7v7H4z'/%3E%3Cpath d='M13 13h7v7h-7z' stroke-dasharray='2.5 2'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 4h7v7H4z'/%3E%3Cpath d='M13 4h7v7h-7z'/%3E%3Cpath d='M4 13h7v7H4z'/%3E%3Cpath d='M13 13h7v7h-7z' stroke-dasharray='2.5 2'/%3E%3C/svg%3E");
}

/* ==========================================================================
   07-oct-2026 (orden de Sandro): tres retoques VISUALES y aditivos.

   A) Los dos «cuadraditos» de antes (el plegador de la botonera, que hace
      de desglose, y el flotante de capas) se visten como los botones del
      resto de la UI: mismo radio de control, misma altura táctil y el
      acento teal cuando están activos. Solo pinta, no toca lógica ni ids.
   B) Icono nuevo para la fila «Planificar viaje».
   C) Panelito del planificador de viaje (rsPanelViaje), en flujo normal
      bajo el bloque de capas y apilado en móvil.
   ========================================================================== */

/* ---- A) Desglose y capas, ya como botones coherentes ---- */
#main-content #rsBtnPlegarControles,
#main-content #rsBtnCapasFlotante{
  min-width:var(--mui-h); height:var(--mui-h);
  border-radius:var(--mui-r-ctl);
  border:1px solid var(--mui-line-2);
  background:var(--mui-bg); color:var(--mui-ico);
  box-shadow:var(--mui-shadow);
  transition:background var(--mui-t), border-color var(--mui-t), color var(--mui-t);
}
#main-content #rsBtnPlegarControles::before,
#main-content #rsBtnCapasFlotante::before{ color:var(--mui-soft); }
@media (hover:hover) and (pointer:fine){
  #main-content #rsBtnPlegarControles:hover,
  #main-content #rsBtnCapasFlotante:hover{ background:#232A34; border-color:var(--mui-line); }
  #main-content #rsBtnPlegarControles:hover::before,
  #main-content #rsBtnCapasFlotante:hover::before{ color:var(--mui-text); }
}
#main-content #rsBtnCapasFlotante[aria-expanded="true"],
#main-content #rsMapControls:not(.rs-plegado) #rsBtnPlegarControles{
  background:var(--mui-accent-tint); border-color:var(--mui-accent);
}
#main-content #rsBtnCapasFlotante[aria-expanded="true"]::before,
#main-content #rsMapControls:not(.rs-plegado) #rsBtnPlegarControles::before{
  color:var(--mui-accent-text);
}
#main-content #rsBtnPlegarControles:focus-visible,
#main-content #rsBtnCapasFlotante:focus-visible{
  outline:2px solid var(--mui-accent-text); outline-offset:2px;
}

/* ---- B) Icono de la fila «Planificar viaje»: coche con ruta ---- */
#main-content .rs-ico-viaje::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 16.5 6.4 11a2 2 0 0 1 2-1.5h7.2a2 2 0 0 1 2 1.5L19 16.5'/%3E%3Cpath d='M4 16.5h16v3h-2.2M4 19.5h2.2'/%3E%3Ccircle cx='8' cy='19' r='1.6'/%3E%3Ccircle cx='16' cy='19' r='1.6'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 16.5 6.4 11a2 2 0 0 1 2-1.5h7.2a2 2 0 0 1 2 1.5L19 16.5'/%3E%3Cpath d='M4 16.5h16v3h-2.2M4 19.5h2.2'/%3E%3Ccircle cx='8' cy='19' r='1.6'/%3E%3Ccircle cx='16' cy='19' r='1.6'/%3E%3C/svg%3E");
}

/* ---- C) Panelito del planificador de viaje ---- */
#main-content .rs-panel-viaje{
  margin:10px 0 0; padding:12px 14px;
  background:var(--mui-bg); border:1px solid var(--mui-line-2);
  border-radius:var(--mui-r-panel); box-shadow:var(--mui-shadow);
  display:flex; flex-direction:column; gap:8px;
  font-family:inherit; color:var(--mui-text);
  /* 08-oct-2026 (orden de Sandro): apertura fluida, nada de aparecer
     de golpe. Nace plegado y .rs-panel-viaje-abierto lo despliega. */
  opacity:0; transform:translateY(-6px);
  transition:opacity 0.26s ease, transform 0.26s ease;
}
#main-content .rs-panel-viaje.rs-panel-viaje-abierto{ opacity:1; transform:none; }
#main-content .rs-panel-viaje[hidden]{ display:none; }
/* El resultado del widget solar se oculta de verdad cuando toca
   (capa Sombras apagada o de noche), aunque otro estilo lo pise. */
#main-content .rs-planetario-info[hidden]{ display:none !important; }
#main-content .rs-panel-viaje-tit{
  margin:0; font-size:13px; font-weight:600; letter-spacing:0.01em;
}
#main-content .rs-panel-viaje input[type="text"]{
  width:100%; box-sizing:border-box;
  min-height:var(--mui-h); padding:6px 10px;
  font:inherit; font-size:13px; color:var(--mui-text);
  background:transparent; border:1px solid var(--mui-line-2);
  border-radius:var(--mui-r-ctl);
}
#main-content .rs-panel-viaje input[type="text"]:focus-visible{
  outline:2px solid var(--mui-accent-text); outline-offset:1px;
}
#main-content .rs-panel-viaje-botones{ display:flex; gap:8px; flex-wrap:wrap; }
#main-content .rs-panel-viaje-botones button{
  min-height:var(--mui-h); padding:4px 14px;
  font:inherit; font-size:13px; font-weight:600;
  border-radius:var(--mui-r-ctl); cursor:pointer;
  border:1px solid var(--mui-line-2);
  background:transparent; color:var(--mui-text);
  transition:background var(--mui-t), border-color var(--mui-t), color var(--mui-t);
}
#main-content .rs-panel-viaje-botones .rs-panel-viaje-calcular{
  background:var(--mui-accent); border-color:var(--mui-accent);
  color:var(--mui-accent-text, #1A0E04);
}
#main-content .rs-panel-viaje-botones button:hover{ filter:brightness(1.08); }
#main-content .rs-panel-viaje-botones button:focus-visible{
  outline:2px solid var(--mui-accent-text); outline-offset:2px;
}
#main-content .rs-panel-viaje-estado{
  margin:0; font-size:12.5px; line-height:1.45; color:var(--mui-soft);
}
#main-content .rs-panel-viaje-estado:empty{ display:none; }

/* ==========================================================================
   07-oct-2026 v2 (orden de Sandro): los tres mapas base (claro, IGN y
   oscuro) dejan de ser pastillas segmentadas y pasan a ser FILAS con
   interruptor a la derecha, exactamente como Árboles, Catastro 3D o
   Buscar aparcamiento. Mismo alto táctil, icono a la izquierda e
   interruptor teal leyendo aria-pressed. Solo pinta: los ids, los
   handlers y el comportamiento radio (un mapa activo siempre) no se
   tocan. Gana a las reglas antiguas por especificidad (tres ids).
   ========================================================================== */
#main-content #rsCapasMapas #rsMapStyleToggle{
  display:flex !important; flex-direction:column !important; flex-wrap:nowrap !important;
  gap:2px !important; align-items:stretch !important;
  width:100%; padding:0; background:transparent; border:none; box-shadow:none;
}
#main-content #rsCapasMapas #rsMapStyleToggle button{
  position:relative; flex:0 0 auto; width:100%;
  display:flex !important; flex-direction:row !important;
  align-items:center; justify-content:flex-start; gap:10px;
  min-height:var(--mui-h); padding:4px 10px 4px 38px !important; margin:0;
  font-family:inherit; font-size:13px !important; font-weight:400 !important;
  letter-spacing:0 !important; text-transform:none !important; line-height:1.2;
  white-space:nowrap; text-align:left;
  color:var(--mui-text) !important; background:transparent !important;
  border:none !important; border-radius:var(--mui-r-ctl) !important; box-shadow:none !important;
  cursor:pointer; backdrop-filter:none; -webkit-backdrop-filter:none;
  transition:background var(--mui-t);
}
#main-content #rsCapasMapas #rsMapStyleToggle button::before{
  position:absolute; left:10px; top:50%; transform:translateY(-50%);
  width:18px !important; height:18px !important;
  color:var(--mui-soft) !important; pointer-events:none;
}
/* El interruptor de la derecha, idéntico al de las demás filas. */
#main-content #rsCapasMapas #rsMapStyleToggle button::after{
  content:''; margin-left:auto; flex:0 0 auto;
  width:36px; height:22px; border-radius:999px;
  background-color:#2A3039; border:1px solid var(--mui-line-2);
  background-image:radial-gradient(circle 7px, #C9D1D9 97%, transparent);
  background-repeat:no-repeat; background-position:3px 50%;
  transition:background-color var(--mui-t), background-position var(--mui-t), border-color var(--mui-t);
}
#main-content #rsCapasMapas #rsMapStyleToggle button:hover{
  background:rgba(255,255,255,0.05) !important; color:var(--mui-text) !important;
}
/* Activo = interruptor teal e icono de acento, SIN pastilla naranja. */
#main-content #rsCapasMapas #rsMapStyleToggle button[aria-pressed="true"],
#main-content #rsCapasMapas #rsMapStyleToggle button[aria-pressed="true"]:hover{
  background:transparent !important; color:var(--mui-text) !important;
}
#main-content #rsCapasMapas #rsMapStyleToggle button[aria-pressed="true"]::before{
  color:var(--mui-accent) !important;
}
#main-content #rsCapasMapas #rsMapStyleToggle button[aria-pressed="true"]::after{
  background-color:var(--mui-accent); border-color:var(--mui-accent);
  background-image:radial-gradient(circle 7px, #1A0E04 97%, transparent);
  background-position:19px 50%;
}
#main-content #rsCapasMapas #rsMapStyleToggle button:focus-visible{
  outline:2px solid var(--mui-accent-text); outline-offset:2px;
}
/* El segmento «Mapa oscuro» no tenía icono propio: luna, como manda la
   fila (sol para claro, mapa para IGN). */
#main-content #rsCapasMapas #rsBtnMapaOsc::before{
  content:'';
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5z'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5z'/%3E%3C/svg%3E");
  background:currentColor;
  -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat;
  -webkit-mask-position:center; mask-position:center;
  -webkit-mask-size:contain; mask-size:contain;
}

/* ---- 2b) Aparcamientos como fila-toggle: icono de plaza de parking ----
   (07-oct-2026, orden de Sandro: misma mecánica visual que Catastro 3D,
   solo se añade, no se toca nada de lo demás). */
#main-content .rs-ico-parking::before{
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='4' y='4' width='16' height='16' rx='3'/%3E%3Cpath d='M9.5 17v-10h3.25a2.75 2.75 0 0 1 0 5.5H9.5'/%3E%3C/svg%3E");
          mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='4' y='4' width='16' height='16' rx='3'/%3E%3Cpath d='M9.5 17v-10h3.25a2.75 2.75 0 0 1 0 5.5H9.5'/%3E%3C/svg%3E");
}

/* ---- 3) Scrollbar fina y discreta del panel de capas ---- */
#main-content .rs-layer-toggles-lista{
  scrollbar-width:thin; /* Firefox: la más fina que permite */
  scrollbar-color:rgba(230,233,238,0.26) transparent;
}
#main-content .rs-layer-toggles-lista::-webkit-scrollbar{ width:5px; height:5px; }
#main-content .rs-layer-toggles-lista::-webkit-scrollbar-track{ background:transparent; }
#main-content .rs-layer-toggles-lista::-webkit-scrollbar-thumb{
  background:rgba(230,233,238,0.22); border-radius:999px;
}
#main-content .rs-layer-toggles-lista::-webkit-scrollbar-thumb:hover{
  background:rgba(230,233,238,0.42);
}
#main-content .rs-layer-toggles-lista::-webkit-scrollbar-button{ display:none; width:0; height:0; }

/* ---- 4) Nada flota por encima del panel ni de sus botones ----
   El Manolit que camina pone z-index:999 en línea a su marcador;
   esta regla (con !important, que gana al estilo en línea) deja
   TODOS los marcadores del mapa bajo los controles fijos (5-7) y
   muy por debajo del panel de capas (1110). No afecta a su clic:
   donde no hay control encima, el marcador sigue respondiendo. */
.map-wrap .maplibregl-marker{ z-index:4 !important; }

/* ---- 5) El botón del chat no tapa la hoja de capas en móvil ----
   .map-wrap crea su propio contexto de apilado (isolation:isolate), así
   que el FAB del chat (position:fixed, z-index:1200 en body) pinta
   SIEMPRE por encima de la hoja de capas, y su muñeco de Manolit con la
   burbuja «¡Pregúntame!» caía justo encima de los botones del
   segmentado. Mientras la hoja está abierta, el FAB se retira con una
   transición suave y deja de ser enfocable; al cerrar la hoja vuelve
   solo. Solo en móvil (la hoja es bottom sheet a todo lo ancho); en
   escritorio el popover de 290px nunca coincide con el FAB. */
@media (max-width:639.98px){
  .chat-fab{ transition:transform .18s ease, opacity .18s ease, visibility .18s ease; }
  body.rs-capas-pop:has(.rs-planetario-capas:not(.rs-capas-cerrada)) .chat-fab{
    opacity:0; visibility:hidden; pointer-events:none;
  }
}

/* ================================================================
   REORDENACIÓN Y ALINEACIÓN DE LA PORTADA (09-oct-2026, tarea de
   Sandro). Bloque ADITIVO: no se toca ninguna regla vieja, estas van
   al final del archivo y ganan por cascada.

   1) Una sola anchura de contenido (~960px) para tarjetas y bloques
      grandes, columna ~680px para párrafos largos y un único paso
      vertical entre secciones.
   2) El pie en seis bloques ordenados (a-f): quiénes somos, apoyo,
      sellos, escudos + IGN, familia y franja legal.
   3) Contraste WCAG AA (4,5:1) en los textos del pie: las opacidades
      viejas (0,65-0,8) dejaban los azul-verdoso claros por debajo del
      mínimo sobre fondo claro (medido: 2,12:1 en las etiquetas de
      gama tipo "REGIONAL", 2,86:1 en la atribución del IGN).
   ================================================================ */
:root{
  --seccion-ancho:960px;   /* tarjetas y bloques grandes */
  --seccion-texto:680px;   /* columna para párrafos largos */
  --seccion-gap:46px;      /* el mismo aire vertical entre secciones */
}

/* 1) Anchura y ritmo vertical únicos (antes 1000/1000/760px y 46/56px) */
.map-section, .forecast-section, .faq{
  max-width:var(--seccion-ancho);
  margin-top:var(--seccion-gap);
}
.quantum-section{
  max-width:var(--seccion-ancho);
  margin:var(--seccion-gap) auto 0;
  padding:0 24px;
}
#ecoAgua .agua-texto{ max-width:var(--seccion-texto); }

/* Los títulos de sección pasan de div a h2 (mismo nivel, mismo estilo):
   se anula el margen que el navegador da a los h2 por defecto. */
h2.map-title, h2.quantum-badge{ margin:0; }

/* Navegación secundaria: área táctil mínima de 44px en cada enlace */
.family-link{ display:inline-flex; align-items:center; min-height:44px; }

/* 2) El pie en seis bloques (a-f) */
.footer-cuentas-linea{ margin:6px 0 0; }
.footer-cuentas{ font-weight:700; color:var(--accent); }
.footer-apoyo{
  margin-top:22px; padding-top:16px; border-top:1px dashed var(--line);
  display:flex; align-items:center; justify-content:center;
  gap:14px 26px; flex-wrap:wrap;
}
.footer-apoyo .donacion-mensaje{ margin:0; flex:1 1 260px; max-width:340px; text-align:right; }
.footer-apoyo .donacion-boton{ flex:none; }
.footer-apoyo .footer-redes{ flex:none; margin-top:0; align-items:flex-start; gap:4px; }
.footer-apoyo .footer-red{ min-height:44px; } /* tamaño táctil decente (tarea 09-oct) */
@media (max-width:700px){
  .footer-apoyo{ flex-direction:column; gap:10px; }
  .footer-apoyo .donacion-mensaje{ text-align:center; flex:none; max-width:none; }
  .footer-apoyo .footer-redes{ align-items:center; }
}
.footer-sellos{
  margin-top:22px; display:flex; align-items:center; justify-content:center;
  gap:22px 30px; flex-wrap:wrap;
}
.footer-sellos .footer-sello{ margin:0; flex:none; }
.footer-sellos .footer-oficial{ margin-top:0; justify-content:center; flex:none; }
.footer-sellos .footer-alternativeto{ flex:none; }

/* d) Los escudos en 4 columnas (escritorio) y 2x2 (móvil), con la
      atribución del IGN justo debajo (en el HTML). */
.footer .escudos-fila{
  display:grid; grid-template-columns:repeat(4,minmax(0,1fr));
  gap:12px; max-width:var(--seccion-ancho); margin:0 auto;
}
.footer .escudo{ max-width:none; }
@media (max-width:760px){
  .footer .escudos-fila{ grid-template-columns:repeat(2,minmax(0,1fr)); }
}

/* e) La familia de proyectos: enlaces de verdad, ya no monoespaciado */
.footer-family{ font-family:var(--font-body); font-size:0.8rem; }
.footer-family a{
  color:var(--sky-deep); font-weight:600;
  text-decoration:underline; text-underline-offset:2px;
}
.footer-family a:hover{ color:var(--accent); }

/* f) Franja legal final, pequeña y centrada */
.footer-legal{
  margin-top:22px; padding-top:12px; border-top:1px solid var(--line);
  display:flex; align-items:center; justify-content:center;
  gap:4px 8px; flex-wrap:wrap; font-size:0.72rem;
}
.footer-legal .footer-sync-toggle{ font-size:inherit; }

/* 3) Contraste WCAG AA en el pie (textos azul-verdoso claros sobre
      fondo claro): se acabaron las opacidades que rebajaban el texto.
      El azul de las etiquetas de gama pasa a #0E5563 (7,98:1 sobre el
      papel claro; medido). En modo oscuro, su primo claro #7FD4DE
      (13:1 sobre el fondo oscuro). */
.footer .escudo{ opacity:1; }
.footer .escudos-porque{ opacity:1; }
.footer .escudo-gama{ opacity:1; color:#0E5563; }
.footer .footer-red{ opacity:1; }
.footer .footer-sync-toggle{ opacity:1; }
.footer-sellos .sello-footer{ opacity:1; }
.footer-sellos .footer-sello{ opacity:1; }
[data-theme="dark"] .footer .escudo-gama{ color:#7FD4DE; }

/* 12-oct-2026 (orden de Sandro): en árabe (RTL) la tarjeta flotante de
   capas es un flex en columna con flex-wrap:wrap heredado, y Chromium con
   direction:rtl calcula mal el origen de las líneas de flex: la lista se
   desplazaba fuera de la tarjeta por la izquierda y los títulos de grupo
   quedaban cortados por el borde. Con nowrap la lista queda centrada y a
   su ancho de contenido, igual que en LTR. Solo se toca RTL, LTR intacto. */
html.rtl body.rs-capas-pop #main-content .rs-layer-toggles{ flex-wrap:nowrap; }
html.rtl #main-content .rs-capa-grupo-tit{ text-align:right; }

/* ============================================================
   12-oct-2026 (orden de Sandro, punto 3): los campos de origen y
   destino se visten con la misma piel que la consola del mapa
   (los botones y buscadores de arriba). Panel oscuro translúcido
   con blur, borde fino claro, radio de control, iconos con el
   trazo aclarado para que el pin teal y la bandera naranja se
   lean sobre fondo oscuro, foco con el anillo naranja de la casa
   y lista de sugerencias a juego. No se tocan las formas: la
   tarjeta sigue redondeada a 16 px, los campos a su altura de
   44 px y el botón Buscar ruta conserva su color mandarina y su
   lupa, que ya mandan las paletas y el modo peque. En árabe el
   icono pasa al lado derecho, donde empieza el texto.
   ============================================================ */
#main-content .rs-form{
  background:rgba(22,26,32,0.94);
  -webkit-backdrop-filter:blur(10px);
  backdrop-filter:blur(10px);
  border:1px solid var(--mui-line);
  box-shadow:var(--mui-shadow);
}
#main-content .rs-form .rs-field input[type="text"]{
  background-color:rgba(255,255,255,0.06);
  border:1px solid var(--mui-line-2);
  border-radius:var(--mui-r-ctl);
  color:var(--mui-text);
  caret-color:var(--mui-accent);
  transition:border-color var(--mui-t), box-shadow var(--mui-t), background-color var(--mui-t);
}
#main-content .rs-form .rs-field input[type="text"]::placeholder{ color:var(--mui-soft); opacity:1; }
#main-content .rs-form .rs-field input[type="text"]:hover{ border-color:rgba(255,255,255,0.22); }
#main-content .rs-form .rs-field input[type="text"]:focus{
  border-color:var(--mui-accent);
  box-shadow:0 0 0 3px var(--mui-accent-tint);
  background-color:rgba(255,255,255,0.09);
}
/* Los mismos dibujos de siempre (pin y bandera), con el trazo
   aclarado: teal #0E7C86 y naranja #E04E00 apenas se distinguen
   sobre el oscuro; sus primos claros pasan de sobra el 3:1 que
   pide WCAG para componentes de interfaz (medido: 8,5:1 y 7:1). */
#main-content .rs-form #rsOrigen{
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2335C4D4' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z'/%3E%3Ccircle cx='12' cy='10' r='3'/%3E%3C/svg%3E");
}
#main-content .rs-form #rsDestino{
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23FF8A4D' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z'/%3E%3Cline x1='4' y1='22' x2='4' y2='15'/%3E%3C/svg%3E");
}
/* Lista de sugerencias: el mismo menú oscuro que la consola. */
#main-content .rs-sugerencias{
  background:var(--mui-bg-2);
  border:1px solid var(--mui-line-2);
  border-radius:var(--mui-r-panel);
  box-shadow:var(--mui-shadow);
}
#main-content .rs-sugerencias li{ color:var(--mui-text); }
#main-content .rs-sugerencias li:hover,
#main-content .rs-sugerencias li[aria-selected="true"]{ background:var(--mui-accent-tint); }
#main-content .rs-sugerencias li.rs-sug-empty{ color:var(--mui-soft); }
#main-content .rs-sug-linea2{ color:var(--mui-soft); }
/* En árabe el texto nace a la derecha: el icono cambia de lado. */
html.rtl #main-content .rs-form .rs-field input[type="text"]{
  background-position:calc(100% - 10px) center;
  padding-left:14px;
  padding-right:38px;
}
>>>>>>> cadc8ff0e84b07e20dbcc47be5725feed3262eec
