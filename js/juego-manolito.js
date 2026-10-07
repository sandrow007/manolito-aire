/* ============================================================
   «ATRAPA A MANOLIT∞» (07-oct-2026, orden directa de Sandro)
   Juego educativo de la sección de niños (modo peque). Sustituye
   al antiguo «Atrapa el Sol»: ahora se atrapa a Manolit∞, no al
   sol, y cada nivel enseña de verdad uno de los 6 sellos de
   protección del calor que ya existen en la web (sol, sombra,
   salud, agua, temp y prevención). Con los 6 se desbloquea el
   sello final de Simulador de Sombras y el diploma descargable.

   Revisión 07-oct-2026 (segunda orden de Sandro):
     - Todo el juego traducido a los 6 idiomas de la plataforma
       (es, ca, eu, gl, en, ka), interfaz y contenido educativo,
       con respaldo limpio al español si falta alguna clave.
     - Cambio de idioma en caliente: al llegar langChanged se
       repinta la pantalla actual sin perder puntos ni sellos.
     - Desde el nivel 4 la partida dura 45 segundos (antes 26/26/25)
       con objetivos recalibrados a 16/18/20 (antes 11/12/13).
     - Barra de progreso del objetivo bajo el marcador.
     - El diploma lleva número de credencial aleatorio único por
       sesión, la firma de Manolit∞ y la banda holográfica.

   Decisiones de calidad (batería, memoria, accesibilidad):
     - Sin requestAnimationFrame: un solo setInterval de 250 ms
       gobierna spawns, caducidades, marcador y fin de nivel.
     - La caída de las piezas es animación CSS con transform
       (GPU), pausable entera con una clase y animation-play-state.
     - Pausa total con la pestaña oculta: intervalo parado, CSS
       pausado y relojes por hora real desplazados al volver.
     - Sin localStorage: puntos y sellos viven solo en memoria y
       mueren al cerrar. El diploma se genera en el dispositivo.
     - Piezas y botones de 56/44 px mínimo, foco visible, Escape
       cierra, aria-live para consejos y resultados, y con
       prefers-reduced-motion las piezas no caen y el brillo de la
       banda del diploma no se mueve.
     - destruir() lo deja todo limpio: intervalo, listeners y DOM.
   ============================================================ */

/* ---------------- configuración de niveles (sin textos) ----------------
   duracion en segundos, objetivo = Manolit∞ a atrapar.
   Niveles 1-3: 28 s. Niveles 4-6: 45 s (orden de Sandro 07-oct-2026). */
export const NIVELES = [
  { id: 'sol',        duracion: 28, objetivo: 8,  spawnMs: 750, caidaMs: 2600, probTema: 0.30, temaPuntos: 0,  correcta: 1 },
  { id: 'sombra',     duracion: 28, objetivo: 9,  spawnMs: 720, caidaMs: 2400, probTema: 0.30, temaPuntos: 15, correcta: 1 },
  { id: 'salud',      duracion: 28, objetivo: 10, spawnMs: 690, caidaMs: 2250, probTema: 0.28, temaPuntos: 15, correcta: 2 },
  { id: 'agua',       duracion: 45, objetivo: 16, spawnMs: 660, caidaMs: 2100, probTema: 0.28, temaPuntos: 15, correcta: 1 },
  { id: 'temp',       duracion: 45, objetivo: 18, spawnMs: 620, caidaMs: 1950, probTema: 0.26, temaPuntos: 15, correcta: 2 },
  { id: 'prevencion', duracion: 45, objetivo: 20, spawnMs: 580, caidaMs: 1800, probTema: 0.26, temaPuntos: 15, correcta: 2 }
];

/* ---------------- textos del juego, los 6 idiomas ----------------
   Cada bloque lleva la interfaz, la intro, las lecciones, las
   preguntas con su feedback y la pantalla final. Si falta una clave
   en un idioma se usa la del español sin romper nada. */
export const TEXTOS = {
  es: {
    titulo: 'Atrapa a Manolit∞',
    cerrarAria: 'Cerrar el juego de Manolit∞',
    queEs: '¿Qué es Manolit∞ Aire?',
    siguiente: 'Siguiente',
    saltar: 'Saltar la intro',
    jugar: '¡A jugar!',
    repetir: 'Repetir nivel',
    terminar: 'Terminar y ver mi resumen',
    seguir: 'Seguir jugando',
    verDiploma: 'Ver mi certificado',
    preguntaRapida: 'Pregunta rápida',
    casiTitulo: '¡Casi lo tienes!',
    finCompleto: '¡Los 6 sellos son tuyos!',
    finParcial: 'Tu resumen de hoy',
    nombreLabel: 'Tu nombre, solo si quieres ponerlo',
    notaPriv: 'El certificado se fabrica aquí mismo, en tu dispositivo. Tu nombre no se guarda ni viaja a ningún sitio.',
    btnSvg: 'Descargar certificado SVG',
    btnPdf: 'Descargar certificado PDF',
    introHola: '¡Hola, miarma! Soy Manolit∞. Antes de jugar te cuento qué es esto, en cuatro trocitos.',
    solUy: '¡Uy, ese sol achicharra! Mejor esquivarlo, miarma.',
    casiBurbuja: 'Casi, casi. Repite el nivel cuando quieras, que aquí nadie castiga.',
    burbujaCompleto: '¡Enhorabuena, miarma! Has completado el juego de Manolit∞ con los 6 sellos.',
    decirCompleto: 'Enhorabuena. Has conseguido los seis sellos de protección del calor y el sello de simulador de sombras.',
    diplomaOkSvg: '¡Certificado SVG descargado! Guárdalo bien, campeón.',
    diplomaOkPdf: '¡Certificado PDF descargado! Ya puedes enseñarlo en casa.',
    diplomaErrSvg: 'Uy, no he podido fabricar el certificado. Prueba otra vez en un ratito.',
    diplomaErrPdf: 'Uy, el PDF no ha salido. Prueba con el SVG, que vale igual de bien.',
    muroAria: 'Sellos de protección',
    finalCorto: 'final',
    resSelloFinal: 'Sello final · Simulador de Sombras. ¡Desbloqueado!',
    credencialTxt: (c) => `Serie · ${c}`,
    casiTxt: (l, o) => `Has atrapado ${l} de ${o} Manolit∞. No pasa nada, miarma, que nadie nace sabiendo. ¿Le damos otra vez?`,
    nivelDe: (n, total, sello) => `Nivel ${n} de ${total} · Sello «${sello}»`,
    campoAria: (n) => `Campo de juego del nivel ${n}`,
    preguntaBurbuja: (q) => `¡Nivel superado! A ver esta pregunta. ${q}`,
    resPuntos: (p) => `Puntos conseguidos · ${p}`,
    resAtrapados: (n) => `Manolit∞ atrapados · ${n}`,
    resNivel: (n, total) => `Nivel alcanzado · ${n} de ${total}`,
    resSellos: (n, total, lista) => `Sellos de protección · ${n} de ${total}${lista ? ' (' + lista + ')' : ''}`,
    aprendido: (lec) => `Y una cosa que te llevas para siempre. ${lec}`,
    burbujaParcial: (n) => `Llevas ${n} de 6 sellos. Cuando quieras seguimos, que el certificado te espera.`,
    marcador: (s, l, o, p) => `${s}s · ${l}/${o} Manolit∞ · ${p} pts`,
    uvLinea: (u) => `Mira, ahora mismo el índice UV es ${u}. Crema, sombrero y sombrita, que hoy el sol no perdona.`,
    piezas: {
      mascota: 'Manolit∞', sol: 'sol, de los que achicharran', sombra: 'nube de sombra',
      salud: 'corazón', agua: 'gota de agua', temp: 'termómetro', prevencion: 'escudo'
    },
    intro: [
      'Manolit∞ Aire es una web que te enseña cómo está el aire de tu ciudad ahora mismo. Si está limpio o suceao, si hace calor y por dónde hay sombra.',
      'Dibuja en el mapa las sombras de los edificios y los árboles, como un simulador. Así ves qué calles van a la sombra y cuáles van al sol.',
      'Sirve para ir al cole o al parque sin achicharrarte. Pones de dónde sales y a dónde vas, y te busca el camino con más sombrita.',
      'La sombra importa un montón. Cuando aprieta el calor, andar por la sombra es la diferencia entre un paseo bueno y un paseo malo.',
      'Puedes usarlo con un mayor. Eliges tu ciudad, miras el mapa y le das al botón de la ruta. Es gratis, sin anuncios, y tu nombre no sale de aquí.'
    ],
    niveles: [
      {
        nombre: 'El sol', sello: 'sol',
        consejoCampo: 'Atrapa a los Manolit∞ y esquiva los soles, que a estas horas achicharran.',
        lecciones: [
          'El sol nos da luz y calorcito, pero entre las 12 y las 5 de la tarde pega tan fuerte que puede quemar la piel aunque no te des cuenta.',
          'La radiación UV no se ve ni se nota al momento. Por eso existe el índice UV, un número que avisa de cuándo aprieta de verdad.',
          'Cuando el UV pasa de 6 toca crema, sombrero y sombrita cada rato. El sol no perdona, miarma.'
        ],
        pregunta: '¿A qué horas aprieta más el sol en verano?',
        opciones: ['Por la mañana tempranito', 'Entre las 12 y las 5 de la tarde', 'Cuando se hace de noche'],
        fbOk: '¡Eso es! A esas horas el sol cae casi de plano y es cuando más quema.',
        fbNo: 'Casi, miarma. A esas horas el sol está bajito y calienta poquito. La hora mala es del mediodía a la tarde.'
      },
      {
        nombre: 'La sombra', sello: 'sombra',
        consejoCampo: 'Las nubes dan sombrita. Atrápalas también, que valen más puntos.',
        lecciones: [
          'Pasar del sol a la sombra refresca un montón y se nota enseguida. No es un capricho, es protección de verdad.',
          'Los árboles, los toldos, los porches y las calles estrechas son sombras que ya existen. Usarlas es cuidarte.',
          'Manolit∞ Aire dibuja las sombras en el mapa para que sepas por dónde ir fresquito.'
        ],
        pregunta: '¿Dónde se está más fresquito en verano?',
        opciones: ['En medio de la plaza al sol', 'Debajo de un árbol o un toldo', 'Encima del asfalto'],
        fbOk: '¡Olé! La sombra es como un techo que te regala la calle.',
        fbNo: 'Mira, miarma. Al sol o en el asfalto el calor se acumula. La fresquita está debajo de un árbol o un toldo.'
      },
      {
        nombre: 'Tu cuerpo', sello: 'salud',
        consejoCampo: 'Los corazones son tu cuerpo diciéndote gracias. Cógelos.',
        lecciones: [
          'El calor fuerte no afecta igual a todo el mundo. A los peques, a los yayos y a quien trabaja en la calle les pega antes y más fuerte.',
          'Si te duele la cabeza o te mareas con calor, tu cuerpo te está pidiendo sombra y agua a gritos.',
          'Cuidarse empieza por saber escucharse. Y por cuidar también a quien tienes al lado.'
        ],
        pregunta: 'Si un amigo se marea con calor, ¿qué hacemos?',
        opciones: ['Seguir jugando al sol', 'Darle un abrigo bien gordo', 'Llevarlo a la sombra y avisar a un mayor'],
        fbOk: '¡Perfecto! Sombra, agüita y un mayor. Así se cuida a la gente.',
        fbNo: 'No, miarma. Con mareo hay que ir a la sombra, darle agua y avisar a un mayor.'
      },
      {
        nombre: 'El agua', sello: 'agua',
        consejoCampo: 'Las gotas son agüita fresca. Atrápate unas cuantas.',
        lecciones: [
          'Con calor el cuerpo pierde agua más rápido de lo que crees, aunque no tengas sed.',
          'El truco es beber a traguitos muchas veces durante el día. Esperar a tener sed es llegar tarde.',
          'Las fuentes y el agua fresquita en la calle también son salud para todo el barrio.'
        ],
        pregunta: '¿Cuándo hay que beber agua con calor?',
        opciones: ['Solo cuando tenga mucha sed', 'A traguitos y muchas veces, aunque no tenga sed', 'Solo antes de dormir'],
        fbOk: '¡Eso es! A traguitos y a menudo, que el cuerpo lo agradece.',
        fbNo: 'Casi. Cuando tienes mucha sed el cuerpo ya va con retraso. Mejor a traguitos todo el día.'
      },
      {
        nombre: 'Cada calle es un mundo', sello: 'temp',
        consejoCampo: 'Los termómetros cuentan el calor de cada calle. Cógelos.',
        lecciones: [
          'Dos calles del mismo barrio pueden tener temperaturas muy distintas. El asfalto guarda el calor y los parques lo sueltan.',
          'A eso se le llama isla de calor. No es un cuento, es tu propio barrio.',
          'Por eso unas calles achicharran y otras no. Elegir calle es elegir temperatura.'
        ],
        pregunta: '¿Qué calle estará más fresquita?',
        opciones: ['La ancha de asfalto sin árboles', 'El aparcamiento al sol', 'La estrecha y con árboles'],
        fbOk: '¡Claro que sí! Estrecha y con árboles, sombra casi segura.',
        fbNo: 'Esa no, miarma. El asfalto ancho y sin árboles guarda el calor como una sartén.'
      },
      {
        nombre: 'Prepararse antes', sello: 'prevencion',
        consejoCampo: 'Los escudos son de quien se prepara. A por ellos.',
        lecciones: [
          'Las olas de calor se anuncian días antes. Prepararse es ganar.',
          'Busca tu refugio fresquito. Una biblioteca, un centro cívico o tu casa con las persianas bajadas en las horas malas.',
          'Y esos días mira cómo están los yayos y los peques de tu barrio. Es lo más efectivo que existe.'
        ],
        pregunta: 'Si anuncian ola de calor para mañana, ¿qué es lo listo?',
        opciones: ['No hacer nada, que ya pasará', 'Salir a correr al mediodía', 'Preparar agua, bajar persianas y localizar un sitio fresco'],
        fbOk: '¡Esa es la actitud! Quien se prepara se ríe del calor.',
        fbNo: 'Qué va. Lo listo es prepararse antes. Agua, persianas y un sitio fresco localizado.'
      }
    ]
  },

  en: {
    titulo: 'Catch Manolit∞',
    cerrarAria: 'Close the Manolit∞ game',
    queEs: 'What is Manolit∞ Aire?',
    siguiente: 'Next',
    saltar: 'Skip the intro',
    jugar: "Let's play!",
    repetir: 'Retry level',
    terminar: 'Finish and see my summary',
    seguir: 'Keep playing',
    verDiploma: 'See my certificate',
    preguntaRapida: 'Quick question',
    casiTitulo: 'Almost there!',
    finCompleto: 'The 6 seals are yours!',
    finParcial: 'Your summary for today',
    nombreLabel: 'Your name, only if you want it on',
    notaPriv: 'The certificate is made right here, on your device. Your name is not stored or sent anywhere.',
    btnSvg: 'Download SVG certificate',
    btnPdf: 'Download PDF certificate',
    introHola: 'Hello! I am Manolit∞. Before playing I will tell you what this is, in four little pieces.',
    solUy: 'Oops, that sun scorches! Better dodge it.',
    casiBurbuja: 'Almost, almost. Retry the level whenever you want, nobody punishes here.',
    burbujaCompleto: 'Congratulations! You completed the Manolit∞ game with all 6 seals.',
    decirCompleto: 'Congratulations. You earned the six heat protection seals and the shadow simulator seal.',
    diplomaOkSvg: 'SVG certificate downloaded! Keep it safe, champion.',
    diplomaOkPdf: 'PDF certificate downloaded! You can show it at home now.',
    diplomaErrSvg: 'Oops, I could not make the certificate. Try again in a bit.',
    diplomaErrPdf: 'Oops, the PDF failed. Try the SVG, it works just as well.',
    muroAria: 'Protection seals',
    finalCorto: 'final',
    resSelloFinal: 'Final seal · Shadow Simulator. Unlocked!',
    credencialTxt: (c) => `Serial · ${c}`,
    casiTxt: (l, o) => `You caught ${l} of ${o} Manolit∞. No worries, nobody is born knowing. Shall we go again?`,
    nivelDe: (n, total, sello) => `Level ${n} of ${total} · Seal «${sello}»`,
    campoAria: (n) => `Play field of level ${n}`,
    preguntaBurbuja: (q) => `Level cleared! Here comes the question. ${q}`,
    resPuntos: (p) => `Points earned · ${p}`,
    resAtrapados: (n) => `Manolit∞ caught · ${n}`,
    resNivel: (n, total) => `Level reached · ${n} of ${total}`,
    resSellos: (n, total, lista) => `Protection seals · ${n} of ${total}${lista ? ' (' + lista + ')' : ''}`,
    aprendido: (lec) => `And one thing you keep forever. ${lec}`,
    burbujaParcial: (n) => `You have ${n} of 6 seals. Whenever you want we continue, the certificate waits for you.`,
    marcador: (s, l, o, p) => `${s}s · ${l}/${o} Manolit∞ · ${p} pts`,
    uvLinea: (u) => `Look, right now the UV index is ${u}. Cream, hat and shade, the sun does not forgive today.`,
    piezas: {
      mascota: 'Manolit∞', sol: 'sun, the scorching kind', sombra: 'shade cloud',
      salud: 'heart', agua: 'water drop', temp: 'thermometer', prevencion: 'shield'
    },
    intro: [
      'Manolit∞ Aire is a website that shows you the air of your city right now. Whether it is clean or dirty, whether it is hot and where there is shade.',
      'It draws the shadows of buildings and trees on the map, like a simulator. So you can see which streets are in the shade and which are in the sun.',
      'It helps you walk to school or the park without roasting. You set where you start and where you are going, and it finds the shadiest way.',
      'Shade matters a lot. When the heat hits hard, walking in the shade is the difference between a good walk and a bad one.',
      'You can use it with a grown-up. Pick your city, look at the map and press the route button. It is free, with no ads, and your name never leaves here.'
    ],
    niveles: [
      {
        nombre: 'The sun', sello: 'sun',
        consejoCampo: 'Catch the Manolit∞ and dodge the suns, they scorch at these hours.',
        lecciones: [
          'The sun gives us light and warmth, but between 12 and 5 in the afternoon it hits so hard it can burn your skin without you noticing.',
          'UV radiation cannot be seen or felt right away. That is why the UV index exists, a number that warns you when it really hits.',
          'When UV goes past 6 it is cream, hat and shade every while. The sun does not forgive.'
        ],
        pregunta: 'At what hours does the summer sun hit hardest?',
        opciones: ['Early in the morning', 'Between 12 and 5 in the afternoon', 'At night'],
        fbOk: 'That is it! At those hours the sun falls almost straight down and burns the most.',
        fbNo: 'Almost. At those hours the sun is low and warms little. The bad hours are from noon to afternoon.'
      },
      {
        nombre: 'Shade', sello: 'shade',
        consejoCampo: 'Clouds make shade. Catch them too, they are worth more points.',
        lecciones: [
          'Moving from sun into shade cools you a lot and you feel it right away. It is not a whim, it is real protection.',
          'Trees, awnings, porches and narrow streets are shade that already exists. Using them is taking care of yourself.',
          'Manolit∞ Aire draws the shadows on the map so you know where to walk cool.'
        ],
        pregunta: 'Where is it coolest in summer?',
        opciones: ['In the middle of the sunny square', 'Under a tree or an awning', 'On top of the asphalt'],
        fbOk: 'Well done! Shade is like a roof the street lends you.',
        fbNo: 'Look. In the sun or on asphalt the heat builds up. The cool spot is under a tree or an awning.'
      },
      {
        nombre: 'Your body', sello: 'health',
        consejoCampo: 'The hearts are your body saying thank you. Grab them.',
        lecciones: [
          'Strong heat does not affect everyone the same. Children, grandparents and people working outside feel it sooner and harder.',
          'If your head hurts or you feel dizzy in the heat, your body is begging for shade and water.',
          'Taking care starts with listening to yourself. And with caring for the people next to you too.'
        ],
        pregunta: 'If a friend feels dizzy in the heat, what do we do?',
        opciones: ['Keep playing in the sun', 'Give them a big coat', 'Take them to the shade and tell a grown-up'],
        fbOk: 'Perfect! Shade, some water and a grown-up. That is how you look after people.',
        fbNo: 'No. With dizziness you go to the shade, give water and tell a grown-up.'
      },
      {
        nombre: 'Water', sello: 'water',
        consejoCampo: 'The drops are cool water. Catch a few.',
        lecciones: [
          'In the heat your body loses water faster than you think, even when you are not thirsty.',
          'The trick is to sip many times through the day. Waiting until you are thirsty is being late.',
          'Fountains and cool water in the street are health for the whole neighbourhood.'
        ],
        pregunta: 'When should you drink water in the heat?',
        opciones: ['Only when I am very thirsty', 'In sips, many times, even if I am not thirsty', 'Only before sleeping'],
        fbOk: 'That is it! In sips and often, your body thanks you.',
        fbNo: 'Almost. When you are very thirsty your body is already late. Better to sip all day.'
      },
      {
        nombre: 'Every street is a world', sello: 'temp',
        consejoCampo: 'The thermometers count the heat of each street. Grab them.',
        lecciones: [
          'Two streets in the same neighbourhood can have very different temperatures. Asphalt stores heat and parks release it.',
          'That is called a heat island. It is not a tale, it is your own neighbourhood.',
          'That is why some streets scorch and others do not. Choosing a street is choosing a temperature.'
        ],
        pregunta: 'Which street will be coolest?',
        opciones: ['The wide asphalt one with no trees', 'The sunny car park', 'The narrow one with trees'],
        fbOk: 'Of course! Narrow and with trees, shade almost guaranteed.',
        fbNo: 'Not that one. Wide asphalt without trees stores heat like a frying pan.'
      },
      {
        nombre: 'Getting ready first', sello: 'prevention',
        consejoCampo: 'Shields belong to those who prepare. Go get them.',
        lecciones: [
          'Heat waves are announced days ahead. Getting ready is winning.',
          'Find your cool shelter. A library, a civic centre or your home with the blinds down in the bad hours.',
          'And on those days, check on the grandparents and the kids in your neighbourhood. It is the most effective thing there is.'
        ],
        pregunta: 'If a heat wave is announced for tomorrow, what is the clever move?',
        opciones: ['Do nothing, it will pass', 'Go running at noon', 'Prepare water, lower the blinds and find a cool place'],
        fbOk: 'That is the attitude! Those who prepare laugh at the heat.',
        fbNo: 'No way. The clever thing is to prepare first. Water, blinds and a cool place found.'
      }
    ]
  },

  ca: {
    titulo: 'Atrapa en Manolit∞',
    cerrarAria: 'Tancar el joc d\'en Manolit∞',
    queEs: 'Què és Manolit∞ Aire?',
    siguiente: 'Següent',
    saltar: 'Saltar la intro',
    jugar: 'A jugar!',
    repetir: 'Repetir nivell',
    terminar: 'Acabar i veure el meu resum',
    seguir: 'Seguir jugant',
    verDiploma: 'Veure el meu certificat',
    preguntaRapida: 'Pregunta ràpida',
    casiTitulo: 'Quasi ho tens!',
    finCompleto: 'Els 6 segells són teus!',
    finParcial: 'El teu resum d\'avui',
    nombreLabel: 'El teu nom, només si el vols posar',
    notaPriv: 'El certificat es fabrica aquí mateix, al teu dispositiu. El teu nom no es guarda ni viatja enlloc.',
    btnSvg: 'Descarregar certificat SVG',
    btnPdf: 'Descarregar certificat PDF',
    introHola: 'Hola! Sóc en Manolit∞. Abans de jugar t\'explico què és això, en quatre trossets.',
    solUy: 'Ui, aquest sol crema! Millor esquivar-lo.',
    casiBurbuja: 'Quasi, quasi. Repeteix el nivell quan vulguis, que aquí ningú castiga.',
    burbujaCompleto: 'Enhorabona! Has completat el joc de Manolit∞ amb els 6 segells.',
    decirCompleto: 'Enhorabona. Has aconseguit els sis segells de protecció de la calor i el segell de simulador d\'ombres.',
    diplomaOkSvg: 'Certificat SVG descarregat! Guarda\'l bé, campió.',
    diplomaOkPdf: 'Certificat PDF descarregat! Ja el pots ensenyar a casa.',
    diplomaErrSvg: 'Ui, no he pogut fabricar el certificat. Prova-ho d\'aquí una estona.',
    diplomaErrPdf: 'Ui, el PDF no ha sortit. Prova amb l\'SVG, que val igual de bé.',
    muroAria: 'Segells de protecció',
    finalCorto: 'final',
    resSelloFinal: 'Segell final · Simulador d\'Ombres. Desbloquejat!',
    credencialTxt: (c) => `Serie · ${c}`,
    casiTxt: (l, o) => `Has atrapat ${l} de ${o} Manolit∞. No passa res, que ningú no neix ensenyat. Li donem una altra vegada?`,
    nivelDe: (n, total, sello) => `Nivell ${n} de ${total} · Segell «${sello}»`,
    campoAria: (n) => `Camp de joc del nivell ${n}`,
    preguntaBurbuja: (q) => `Nivell superat! A veure aquesta pregunta. ${q}`,
    resPuntos: (p) => `Punts aconseguits · ${p}`,
    resAtrapados: (n) => `Manolit∞ atrapats · ${n}`,
    resNivel: (n, total) => `Nivell assolit · ${n} de ${total}`,
    resSellos: (n, total, lista) => `Segells de protecció · ${n} de ${total}${lista ? ' (' + lista + ')' : ''}`,
    aprendido: (lec) => `I una cosa que t\'emportes per sempre. ${lec}`,
    burbujaParcial: (n) => `Portes ${n} de 6 segells. Quan vulguis seguim, que el certificat t\'espera.`,
    marcador: (s, l, o, p) => `${s}s · ${l}/${o} Manolit∞ · ${p} punts`,
    uvLinea: (u) => `Mira, ara mateix l\'índex UV és ${u}. Crema, barret i ombra, que avui el sol no perdona.`,
    piezas: {
      mascota: 'Manolit∞', sol: 'sol, dels que cremen', sombra: 'núvol d\'ombra',
      salud: 'cor', agua: 'gota d\'aigua', temp: 'termòmetre', prevencion: 'escut'
    },
    intro: [
      'Manolit∞ Aire és una web que t\'ensenya com està l\'aire de la teva ciutat ara mateix. Si està net o brut, si fa calor i per on hi ha ombra.',
      'Dibuixa al mapa les ombres dels edificis i dels arbres, com un simulador. Així veus quins carrers van a l\'ombra i quins van al sol.',
      'Serveix per anar a l\'escola o al parc sense torrar-te. Poses d\'on surts i on vas, i et busca el camí amb més ombra.',
      'L\'ombra importa molt. Quan apreta la calor, caminar per l\'ombra és la diferència entre un bon passeig i un passeig dolent.',
      'Pots fer-lo servir amb una persona gran. Tria la teva ciutat, mira el mapa i prem el botó de la ruta. És gratis, sense anuncis, i el teu nom no surt d\'aquí.'
    ],
    niveles: [
      {
        nombre: 'El sol', sello: 'sol',
        consejoCampo: 'Atrapa els Manolit∞ i esquiva els sols, que a aquestes hores cremen.',
        lecciones: [
          'El sol ens dona llum i calor, però entre les 12 i les 5 de la tarda pega tan fort que pot cremar la pell sense que te\'n adonis.',
          'La radiació UV no es veu ni es nota a l\'instant. Per això existeix l\'índex UV, un número que avisa de quan apreta de veritat.',
          'Quan l\'UV passa de 6 cal crema, barret i ombra de tant en tant. El sol no perdona.'
        ],
        pregunta: 'A quines hores apreta més el sol a l\'estiu?',
        opciones: ['Al matí ben d\'hora', 'Entre les 12 i les 5 de la tarda', 'Quan es fa de nit'],
        fbOk: 'Això és! A aquestes hores el sol cau gairebé de ple i és quan més crema.',
        fbNo: 'Gairebé. A aquestes hores el sol està baixet i escalfa poc. L\'hora dolenta és del migdia a la tarda.'
      },
      {
        nombre: 'L\'ombra', sello: 'ombra',
        consejoCampo: 'Els núvols fan ombra. Atrapa\'ls també, que valen més punts.',
        lecciones: [
          'Passar del sol a l\'ombra refresca molt i es nota de seguida. No és un capritx, és protecció de veritat.',
          'Els arbres, les tendes, els porxos i els carrers estrets són ombres que ja existeixen. Fer-les servir és cuidar-te.',
          'Manolit∞ Aire dibuixa les ombres al mapa perquè sàpigues per on anar fresc.'
        ],
        pregunta: 'On s\'està més fresc a l\'estiu?',
        opciones: ['Al mig de la plaça al sol', 'Sota un arbre o una tenda', 'A sobre de l\'asfalt'],
        fbOk: 'Ostres, sí! L\'ombra és com un sostre que et regala el carrer.',
        fbNo: 'Mira. Al sol o a l\'asfalt la calor s\'hi acumula. La frescor està sota un arbre o una tenda.'
      },
      {
        nombre: 'El teu cos', sello: 'salut',
        consejoCampo: 'Els cors són el teu cos dient-te gràcies. Agafa\'ls.',
        lecciones: [
          'La calor forta no afecta tothom igual. Als infants, als avis i a qui treballa al carrer els hi pega abans i més fort.',
          'Si et fa mal el cap o et marees amb calor, el teu cos et demana ombra i aigua a crits.',
          'Cuidar-se comença per saber escoltar-se. I per cuidar també qui tens al costat.'
        ],
        pregunta: 'Si un amic es mareja amb calor, què fem?',
        opciones: ['Seguir jugant al sol', 'Donar-li un abric ben gruixut', 'Portar-lo a l\'ombra i avisar una persona gran'],
        fbOk: 'Perfecte! Ombra, aigueta i una persona gran. Així es cuida la gent.',
        fbNo: 'No. Amb mareig cal anar a l\'ombra, donar-li aigua i avisar una persona gran.'
      },
      {
        nombre: 'L\'aigua', sello: 'aigua',
        consejoCampo: 'Les gotes són aigueta fresca. Atrapa\'n unes quantes.',
        lecciones: [
          'Amb calor el cos perd aigua més ràpid del que creus, encara que no tinguis set.',
          'El truc és beure a glops moltes vegades al llarg del dia. Esperar a tenir set és arribar tard.',
          'Les fonts i l\'aigua fresca al carrer també són salut per a tot el barri.'
        ],
        pregunta: 'Quan cal beure aigua amb calor?',
        opciones: ['Només quan tingui molta set', 'A glops i moltes vegades, encara que no tingui set', 'Només abans de dormir'],
        fbOk: 'Això és! A glops i sovint, que el cos ho agraeix.',
        fbNo: 'Gairebé. Quan tens molta set el cos ja va amb retard. Millor a glops tot el dia.'
      },
      {
        nombre: 'Cada carrer és un món', sello: 'temp',
        consejoCampo: 'Els termòmetres compten la calor de cada carrer. Agafa\'ls.',
        lecciones: [
          'Dos carrers del mateix barri poden tenir temperatures molt diferents. L\'asfalt guarda la calor i els parcs la deixen anar.',
          'Això s\'anomena illa de calor. No és un conte, és el teu propi barri.',
          'Per això uns carrers cremen i altres no. Triar carrer és triar temperatura.'
        ],
        pregunta: 'Quin carrer estarà més fresc?',
        opciones: ['L\'ample d\'asfalt sense arbres', 'L\'aparcament al sol', 'L\'estret i amb arbres'],
        fbOk: 'És clar que sí! Estret i amb arbres, ombra gairebé segura.',
        fbNo: 'Aquest no. L\'asfalt ample i sense arbres guarda la calor com una paella.'
      },
      {
        nombre: 'Preparar-se abans', sello: 'prevenció',
        consejoCampo: 'Els escuts són de qui es prepara. A per ells.',
        lecciones: [
          'Les onades de calor s\'anuncien dies abans. Preparar-se és guanyar.',
          'Busca el teu refugi fresc. Una biblioteca, un centre cívic o casa teva amb les persianes baixades a les hores dolentes.',
          'I aquests dies mira com estan els avis i els infants del barri. És el més efectiu que existeix.'
        ],
        pregunta: 'Si anuncien onada de calor per demà, què és el llest?',
        opciones: ['No fer res, que ja passarà', 'Sortir a córrer al migdia', 'Preparar aigua, baixar persianes i localitzar un lloc fresc'],
        fbOk: 'Aquesta és l\'actitud! Qui es prepara es riu de la calor.',
        fbNo: 'Què va. El llest és preparar-se abans. Aigua, persianes i un lloc fresc localitzat.'
      }
    ]
  },

  gl: {
    titulo: 'Atrapa a Manolit∞',
    cerrarAria: 'Pechar o xogo de Manolit∞',
    queEs: 'Que é Manolit∞ Aire?',
    siguiente: 'Seguinte',
    saltar: 'Saltar a intro',
    jugar: 'A xogar!',
    repetir: 'Repetir nivel',
    terminar: 'Rematar e ver o meu resumo',
    seguir: 'Seguir xogando',
    verDiploma: 'Ver o meu certificado',
    preguntaRapida: 'Pregunta rápida',
    casiTitulo: 'Case o tes!',
    finCompleto: 'Os 6 selos son teus!',
    finParcial: 'O teu resumo de hoxe',
    nombreLabel: 'O teu nome, só se o queres poñer',
    notaPriv: 'O certificado fabrícase aquí mesmo, no teu dispositivo. O teu nome non se garda nin viaxa a ningún sitio.',
    btnSvg: 'Descargar certificado SVG',
    btnPdf: 'Descargar certificado PDF',
    introHola: 'Ola! Son Manolit∞. Antes de xugar cóntoche que é isto, en catro cachitos.',
    solUy: 'Ui, ese sol chamusca! Mellor esquivalo.',
    casiBurbuja: 'Case, case. Repite o nivel cando queiras, que aquí ninguén castiga.',
    burbujaCompleto: 'Parabéns! Completaches o xogo de Manolit∞ cos 6 selos.',
    decirCompleto: 'Parabéns. Conseguiches os seis selos de protección da calor e o selo de simulador de sombras.',
    diplomaOkSvg: 'Certificado SVG descargado! Gárdao ben, campión.',
    diplomaOkPdf: 'Certificado PDF descargado! Xa o podes ensinar na casa.',
    diplomaErrSvg: 'Ui, non puiden fabricar o certificado. Proba outra vez nun intre.',
    diplomaErrPdf: 'Ui, o PDF non saíu. Proba co SVG, que vale igual de ben.',
    muroAria: 'Selos de protección',
    finalCorto: 'final',
    resSelloFinal: 'Selo final · Simulador de Sombras. Desbloqueado!',
    credencialTxt: (c) => `Serie · ${c}`,
    casiTxt: (l, o) => `Atrapaches ${l} de ${o} Manolit∞. Non pasa nada, que ninguén nace sabendo. Dámoslle outra vez?`,
    nivelDe: (n, total, sello) => `Nivel ${n} de ${total} · Selo «${sello}»`,
    campoAria: (n) => `Campo de xogo do nivel ${n}`,
    preguntaBurbuja: (q) => `Nivel superado! A ver esta pregunta. ${q}`,
    resPuntos: (p) => `Puntos conseguidos · ${p}`,
    resAtrapados: (n) => `Manolit∞ atrapados · ${n}`,
    resNivel: (n, total) => `Nivel alcanzado · ${n} de ${total}`,
    resSellos: (n, total, lista) => `Selos de protección · ${n} de ${total}${lista ? ' (' + lista + ')' : ''}`,
    aprendido: (lec) => `E unha cousa que levas para sempre. ${lec}`,
    burbujaParcial: (n) => `Levas ${n} de 6 selos. Cando queiras seguimos, que o certificado te espera.`,
    marcador: (s, l, o, p) => `${s}s · ${l}/${o} Manolit∞ · ${p} pts`,
    uvLinea: (u) => `Mira, agora mesmo o índice UV é ${u}. Crema, sombreiro e sombra, que hoxe o sol non perdona.`,
    piezas: {
      mascota: 'Manolit∞', sol: 'sol, dos que chamuscan', sombra: 'nube de sombra',
      salud: 'corazón', agua: 'gota de auga', temp: 'termómetro', prevencion: 'escudo'
    },
    intro: [
      'Manolit∞ Aire é unha web que che ensina como está o aire da túa cidade agora mesmo. Se está limpo ou sucio, se fai calor e por onde hai sombra.',
      'Debuxa no mapa as sombras dos edificios e das árbores, como un simulador. Así ves que rúas van á sombra e cales van ao sol.',
      'Serve para ir ao cole ou ao parque sen chamuscarche. Pós de onde saes e a onde vas, e búscache o camiño con máis sombra.',
      'A sombra importa un móntón. Cando aperta a calor, andar pola sombra é a diferenza entre un paseo bo e un paseo malo.',
      'Podes usalo cunha persoa maior. Elixes a túa cidade, miras o mapa e prémeslle ao botón da ruta. É de balde, sen anuncios, e o teu nome non sae de aquí.'
    ],
    niveles: [
      {
        nombre: 'O sol', sello: 'sol',
        consejoCampo: 'Atrapa os Manolit∞ e esquiva os soles, que a estas horas chamuscan.',
        lecciones: [
          'O sol dános luz e caloriña, pero entre as 12 e as 5 da tarde pega tan forte que pode queimar a pel aínda que non te decatas.',
          'A radiación UV non se ve nin se nota ao momento. Por iso existe o índice UV, un número que avisa de cando aperta de verdade.',
          'Cando o UV pasa de 6 toca crema, sombreiro e sombra cada intre. O sol non perdona.'
        ],
        pregunta: 'A que horas aperta máis o sol no verán?',
        opciones: ['Pola mañá ben cedo', 'Entre as 12 e as 5 da tarde', 'Cando se fai de noite'],
        fbOk: 'Iso é! A esas horas o sol cae case de chanzo e é cando máis queima.',
        fbNo: 'Case. A esas horas o sol está baixiño e quenta pouquiño. A hora mala é do mediodía á tarde.'
      },
      {
        nombre: 'A sombra', sello: 'sombra',
        consejoCampo: 'As nubes dan sombra. Atrápaas tamén, que valen máis puntos.',
        lecciones: [
          'Pasar do sol á sombra refresca un móntón e nótase enseguida. Non é un capricho, é protección de verdade.',
          'As árbores, os toldos, os soportais e as rúas estreitas son sombras que xa existen. Usalas é cuidarte.',
          'Manolit∞ Aire debuxa as sombras no mapa para que saibas por onde ir fresquiño.'
        ],
        pregunta: 'Onde se está máis fresquiño no verán?',
        opciones: ['No medio da praza ao sol', 'Debaixo dunha árbore ou un toldo', 'Enriba do asfalto'],
        fbOk: 'Moi ben! A sombra é coma un teito que che regala a rúa.',
        fbNo: 'Mira. Ao sol ou no asfalto a calor acumúlase. O fresquiño está debaixo dunha árbore ou un toldo.'
      },
      {
        nombre: 'O teu corpo', sello: 'saúde',
        consejoCampo: 'Os corazóns son o teu corpo dicíndoche grazas. Colleos.',
        lecciones: [
          'A calor forte non afecta igual a todo o mundo. Aos pequenos, aos avós e a quen traballa na rúa pégalles antes e máis forte.',
          'Se che doe a cabeza ou te mareas con calor, o teu corpo estáche a pedir sombra e auga a berros.',
          'Coidarse empeza por saber escoitarse. E por coidar tamén a quen tes ao lado.'
        ],
        pregunta: 'Se un amigo se mareas con calor, que facemos?',
        opciones: ['Seguir xogando ao sol', 'Darlle un abrigo ben groso', 'Levalo á sombra e avisar unha persoa maior'],
        fbOk: 'Perfecto! Sombra, auguiña e unha persoa maior. Así se coida á xente.',
        fbNo: 'Non. Con mareo hai que ir á sombra, darlle auga e avisar unha persoa maior.'
      },
      {
        nombre: 'A auga', sello: 'auga',
        consejoCampo: 'As gotas son auguiña fresca. Atrapa algunhas.',
        lecciones: [
          'Con calor o corpo perde auga máis rápido do que crees, aínda que non teñas sede.',
          'O truco é beber a gollitos moitas veces durante o día. Esperar a ter sede é chegar tarde.',
          'As fontes e a auga fresquiña na rúa tamén son saúde para todo o barrio.'
        ],
        pregunta: 'Cando hai que beber auga con calor?',
        opciones: ['Só cando teña moita sede', 'A gollitos e moitas veces, aínda que non teña sede', 'Só antes de durmir'],
        fbOk: 'Iso é! A gollitos e a miúdo, que o corpo agradéceo.',
        fbNo: 'Case. Cando tes moita sede o corpo xa vai con atraso. Mellor a gollitos todo o día.'
      },
      {
        nombre: 'Cada rúa é un mundo', sello: 'temp',
        consejoCampo: 'Os termómetros contan a calor de cada rúa. Colleos.',
        lecciones: [
          'Dúas rúas do mesmo barrio poden ter temperaturas moi distintas. O asfalto garda a calor e os parques soltana.',
          'A iso chámaslle illa de calor. Non é un conto, é o teu propio barrio.',
          'Por iso unhas rúas chamuscan e outras non. Elixir rúa é elixir temperatura.'
        ],
        pregunta: 'Que rúa estará máis fresquiña?',
        opciones: ['A ancha de asfalto sen árbores', 'O aparcadoiro ao sol', 'A estreita e con árbores'],
        fbOk: 'Claro que si! Estreita e con árbores, sombra case segura.',
        fbNo: 'Esa non. O asfalto ancho e sen árbores garda a calor coma unha tixola.'
      },
      {
        nombre: 'Prepararse antes', sello: 'prevención',
        consejoCampo: 'Os escudos son de quen se prepara. A por eles.',
        lecciones: [
          'As ondas de calor anúncianse días antes. Prepararse é gañar.',
          'Busca o teu refuxio fresquiño. Unha biblioteca, un centro cívico ou a túa casa coas persianas baixadas nas horas malas.',
          'E eses días mira como están os avós e os pequenos do teu barrio. É o máis efectivo que existe.'
        ],
        pregunta: 'Se anuncian onda de calor para mañá, que é o listo?',
        opciones: ['Non facer nada, que xa pasará', 'Saír a correr ao mediodía', 'Preparar auga, baixar persianas e localizar un sitio fresco'],
        fbOk: 'Esa é a actitude! Quen se prepara ríe da calor.',
        fbNo: 'Que vai. O listo é prepararse antes. Auga, persianas e un sitio fresco localizado.'
      }
    ]
  },

  eu: {
    titulo: 'Harrapatu Manolit∞',
    cerrarAria: 'Itxi Manolit∞ jokoa',
    queEs: 'Zer da Manolit∞ Aire?',
    siguiente: 'Hurrengoa',
    saltar: 'Sarrera saltatu',
    jugar: 'Jolastera!',
    repetir: 'Maila errepikatu',
    terminar: 'Amaitu eta nire laburpena ikusi',
    seguir: 'Jolasten jarraitu',
    verDiploma: 'Nire ziurtagiria ikusi',
    preguntaRapida: 'Galdera azkarra',
    casiTitulo: 'Ia-ia duzu!',
    finCompleto: '6 zigiluak zureak dira!',
    finParcial: 'Gaurko zure laburpena',
    nombreLabel: 'Zure izena, nahi baduzu soilik',
    notaPriv: 'Ziurtagiria hementxe egiten da, zure gailuan. Zure izena ez da gordetzen ez inora bidaltzen.',
    btnSvg: 'SVG ziurtagiria deskargatu',
    btnPdf: 'PDF ziurtagiria deskargatu',
    introHola: 'Kaixo! Manolit∞ naiz. Jolastu aurretik lau zatitan azalduko dizuet zer den hau.',
    solUy: 'Ui, eguzki hori erretzen du! Hobeto saihestu.',
    casiBurbuja: 'Ia, ia. Errepikatu maila nahi duzunean, hemen inork ez du zigortzen.',
    burbujaCompleto: 'Zorionak! Manolit∞ jokoa osatu duzu 6 zigiluekin.',
    decirCompleto: 'Zorionak. Beroaren sei babes zigiluak eta itzal simulatzailearen zigilua lortu dituzu.',
    diplomaOkSvg: 'SVG ziurtagiria deskargatuta! Gorde ondo, txapeldun.',
    diplomaOkPdf: 'PDF ziurtagiria deskargatuta! Dagoeneko etxean erakuts dezakezu.',
    diplomaErrSvg: 'Ui, ezin izan dut ziurtagiria egin. Saiatu berriro pixka bat barru.',
    diplomaErrPdf: 'Ui, PDFak ez du funtzionatu. Saiatu SVGarekin, berdin du balio.',
    muroAria: 'Babes zigiluak',
    finalCorto: 'finala',
    resSelloFinal: 'Azken zigilua · Itzal Simulatzailea. Desblokeatuta!',
    credencialTxt: (c) => `Seriea · ${c}`,
    casiTxt: (l, o) => `${o} Manolit∞-tik ${l} harrapatu dituzu. Ez da ezer gertatzen, inork ez du jaio eta ikasi. Berriro saiatuko dugu?`,
    nivelDe: (n, total, sello) => `${n}. maila, guztira ${total} · «${sello}» zigilua`,
    campoAria: (n) => `${n}. mailako jolas eremua`,
    preguntaBurbuja: (q) => `Maila gaindituta! Hona hemen galdera. ${q}`,
    resPuntos: (p) => `Lortutako puntuak · ${p}`,
    resAtrapados: (n) => `Harrapatutako Manolit∞ · ${n}`,
    resNivel: (n, total) => `Lortutako maila · ${n}/${total}`,
    resSellos: (n, total, lista) => `Babes zigiluak · ${n}/${total}${lista ? ' (' + lista + ')' : ''}`,
    aprendido: (lec) => `Eta betirako eramango duzun zerbait. ${lec}`,
    burbujaParcial: (n) => `6 zigilutik ${n} dituzu. Nahi duzunean jarraitzen dugu, ziurtagiria zain zaitu.`,
    marcador: (s, l, o, p) => `${s}s · ${l}/${o} Manolit∞ · ${p} puntu`,
    uvLinea: (u) => `Begira, oraintxe UV indizea ${u} da. Krema, kapela eta itzala, gaur eguzkiak ez du barkatzen.`,
    piezas: {
      mascota: 'Manolit∞', sol: 'eguzkia, erretzen dutenetakoa', sombra: 'itzal hodeia',
      salud: 'bihotza', agua: 'ur tanta', temp: 'termometroa', prevencion: 'ezkutua'
    },
    intro: [
      'Manolit∞ Aire zure hiriko airea orain erakusten dizun webgunea da. Garbi ala zikin dagoen, beroa egiten duen eta non dagoen itzala.',
      'Eraikinen eta zuhaitzen itzalak mapan marrazten ditu, simulatzaile bat bezala. Horrela ikusten duzu zein kale doazen itzalean eta zein eguzkian.',
      'Eskolara edo parkera erretxo joan gabe joateko balio du. Hemendik nora zoazen jarri, eta itzal gehien duen bidea bilatzen dizu.',
      'Itzalak asko du merezi. Beroa gogor denean, itzaletan ibiltzea da paseo onaren eta txarraren arteko aldea.',
      'Nagusi batekin erabil dezakezu. Zure hiria aukeratu, mapa begiratu eta ibilbidearen botoia sakatu. Doakoa da, iragarkirik gabe, eta zure izena ez da hemendik ateratzen.'
    ],
    niveles: [
      {
        nombre: 'Eguzkia', sello: 'eguzkia',
        consejoCampo: 'Harrapatu Manolit∞ak eta saihestu eguzkiak, ordu hauetan erretzen dute.',
        lecciones: [
          'Eguzkiak argia eta beroa ematen dizkigu, baina 12 eta 17 ordu artean hain gogor jotzen du, larruazala erre dezakeela konturatu gabe.',
          'UV erradiazioa ez da ikusten ez berehala sentitzen. Horregatik dago UV indizea, benetan noiz jotzen duen jakinarazten duen zenbakia.',
          'UVa 6tik gora dagoenean, krema, kapela eta itzala noizean behin. Eguzkiak ez du barkatzen.'
        ],
        pregunta: 'Noiz jotzen du gogorren eguzkiak udan?',
        opciones: ['Goizean goiz', '12 eta 17 ordu artean', 'Gauez'],
        fbOk: 'Hori da! Ordu horietan eguzkia ia zut erortzen da eta orduan da gehien erretzen duen.',
        fbNo: 'Ia-ia. Ordu horietan eguzkia baxu dago eta gutxi berotzen du. Ordu txarra eguerditik arratsaldera da.'
      },
      {
        nombre: 'Itzala', sello: 'itzala',
        consejoCampo: 'Hodeiek itzala ematen dute. Harrapatu ere bai, puntu gehiago balio dute.',
        lecciones: [
          'Eguzkitik itzalera pasatzeak asko freskatzen du eta berehala nabaritzen da. Ez da zeker, benetako babesa da.',
          'Zuhaitzak, toldoak, porkuak eta kale estuak lehendik dauden itzalak dira. Haiek erabiltzea zure burua zaintzea da.',
          'Manolit∞ Airek itzalak mapan marrazten ditu, non fresko joan jakiteko.'
        ],
        pregunta: 'Non dago freskoen udan?',
        opciones: ['Eguzkiko plazaren erdian', 'Zuhaitz edo toldo baten azpian', 'Asfaltoaren gainean'],
        fbOk: 'Oso ondo! Itzala kaleak zuri utzitako teilatu bat bezala da.',
        fbNo: 'Begira. Eguzkian edo asfaltoan beroa pilatzen da. Leku freskoa zuhaitz edo toldo baten azpian dago.'
      },
      {
        nombre: 'Zure gorputza', sello: 'osasuna',
        consejoCampo: 'Bihotzak zure gorputzak eskerrik asko esaten du. Harrapa itzazu.',
        lecciones: [
          'Bero gogorrak ez du guztiari berdin eragiten. Haurrei, agureei eta kalean lan egiten dutenei lehenago eta gogorrago jotzen die.',
          'Buruak min egiten badizu edo zorabiatuta sentitzen bazara beroarekin, zure gorputzak itzala eta ura oihuka eskatzen dizu.',
          'Zaintzeko lehenengo urratsa zure burua entzutea da. Eta ondoan duzuna zaintzea ere bai.'
        ],
        pregunta: 'Lagun batek zorabioa badu beroarekin, zer egiten dugu?',
        opciones: ['Eguzkian jolasten jarraitu', 'Beroki lodia eman', 'Itzalera eraman eta nagusi bati abisatu'],
        fbOk: 'Primeran! Itzala, ur apur bat eta nagusi bat. Horrela zaintzen da jendea.',
        fbNo: 'Ez. Zorabioarekin itzalera joan, ura eman eta nagusi bati abisatu behar da.'
      },
      {
        nombre: 'Ura', sello: 'ura',
        consejoCampo: 'Tantak ur freskoa dira. Harrapatu batzuk.',
        lecciones: [
          'Beroarekin gorputzak uste duzuna baino azkarrago galtzen du ura, egarririk ez duzun arren.',
          'Trikimailua egunean zehar askotan edatea da, moxal-moxal. Egarri izatea itxarotea berandu iristea da.',
          'Iturriak eta kaleko ur freskoa auzo osoarentzako osasuna dira ere.'
        ],
        pregunta: 'Noiz edan behar da ura beroarekin?',
        opciones: ['Egarri handia dudanean soilik', 'Moxal-moxal eta askotan, egarririk ez dudan arren', 'Lo egin aurretik soilik'],
        fbOk: 'Hori da! Moxal-moxal eta sarri, gorputzak eskertzen du.',
        fbNo: 'Ia-ia. Egarri handia duzunean gorputza jada atzeratuta doa. Hobeto egun osoan moxal-moxal.'
      },
      {
        nombre: 'Kale bakoitza mundu bat da', sello: 'temp',
        consejoCampo: 'Termometroek kale bakoitzaren beroa neurtzen dute. Harrapa itzazu.',
        lecciones: [
          'Auzo bereko bi kalek tenperatura oso desberdinak izan ditzakete. Asfaltoak beroa gordetzen du eta parkeek askatzen dute.',
          'Hori bero uhartea da. Ez da ipuina, zure auzo bera da.',
          'Horregatik kale batzuk erretzen dira eta besteak ez. Kalea aukeratzea tenperatura aukeratzea da.'
        ],
        pregunta: 'Zein kale egongo da freskoen?',
        opciones: ['Zabalik, asfaltozkoa, zuhaitzik gabe', 'Eguzkiko aparkalekua', 'Estua eta zuhaitzekin'],
        fbOk: 'Noski! Estua eta zuhaitzekin, itzala ia ziur.',
        fbNo: 'Hori ez. Asfalto zabalak zuhaitzik gabe beroa gordetzen du, zartagin bat bezala.'
      },
      {
        nombre: 'Aurretik prestatu', sello: 'prebentzioa',
        consejoCampo: 'Ezkutuak prestatzen denarena dira. Beren bila.',
        lecciones: [
          'Bero olatuak egun batzuk lehenago iragartzen dira. Prestatzea irabaztea da.',
          'Bilatu zure aterpe freskoa. Liburutegi bat, gazteleku bat edo zure etxea, ordu txarretan estoreak jaitsita.',
          'Eta egun horietan begiratu nola dauden auzoko agureak eta haurrak. Da eraginkorrena.'
        ],
        pregunta: 'Bero olatua iragarri badute biharko, zer da azkarra?',
        opciones: ['Ezer ez egin, igaroko da', 'Eguerdian korrika joan', 'Ura prestatu, estoreak jaitsi eta leku fresko bat aurkitu'],
        fbOk: 'Hori da jarrera! Prestatzen duenak barre egiten dio beroari.',
        fbNo: 'Ez da hori. Azkarra aurretik prestatzea da. Ura, estoreak eta leku fresko bat.'
      }
    ]
  },

  ka: {
    titulo: 'დაიჭირე მანოლიტ∞',
    cerrarAria: 'მანოლიტ∞-ის თამაშის დახურვა',
    queEs: 'რა არის Manolit∞ Aire?',
    siguiente: 'შემდეგი',
    saltar: 'შესავლის გამოტოვება',
    jugar: 'ვითამაშოთ!',
    repetir: 'დონის გამეორება',
    terminar: 'დასრულება და შეჯამების ნახვა',
    seguir: 'თამაშის გაგრძელება',
    verDiploma: 'ჩემი სერტიფიკატის ნახვა',
    preguntaRapida: 'სწრაფი კითხვა',
    casiTitulo: 'თითქმის გამოვიდა!',
    finCompleto: '6 ბეჭედი შენია!',
    finParcial: 'შენი დღევანდელი შეჯამება',
    nombreLabel: 'შენი სახელი, მხოლოდ თუ გინდა',
    notaPriv: 'სერტიფიკატი იქმნება აქვე, შენს მოწყობილობაში. შენი სახელი არ ინახება და არსად იგზავნება.',
    btnSvg: 'SVG სერტიფიკატის ჩამოტვირთვა',
    btnPdf: 'PDF სერტიფიკატის ჩამოტვირთვა',
    introHola: 'გამარჯობა! მე ვარ მანოლიტ∞. თამაშამდე გეტყვი რა არის ეს, ოთხი პატარა ნაწილით.',
    solUy: 'ო, ეს მზე წვავს! უმჯობესია გაექცე.',
    casiBurbuja: 'თითქმის, თითქმის. გაიმეორე დონე როცა გინდა, აქ არავინ სჯის.',
    burbujaCompleto: 'გილოცავ! დაასრულე მანოლიტ∞-ის თამაში 6 ბეჭდით.',
    decirCompleto: 'გილოცავ. მოიპოვე სითბოსგან დაცვის ექვსი ბეჭედი და ჩრდილების სიმულატორის ბეჭედი.',
    diplomaOkSvg: 'SVG სერტიფიკატი ჩამოიტვირთა! დაინახე, ჩემპიონ.',
    diplomaOkPdf: 'PDF სერტიფიკატი ჩამოიტვირთა! შეგიძლია სახლში აჩვენო.',
    diplomaErrSvg: 'ო, სერტიფიკატი ვერ გამოვიდა. სცადე ცოტა მოგვიანებით.',
    diplomaErrPdf: 'ო, PDF ვერ გამოვიდა. სცადე SVG, ისიც კარგია.',
    muroAria: 'დაცვის ბეჭდები',
    finalCorto: 'ფინალი',
    resSelloFinal: 'ფინალური ბეჭედი · ჩრდილების სიმულატორი. გახსნილია!',
    credencialTxt: (c) => `სერია · ${c}`,
    casiTxt: (l, o) => `დაიჭირე ${l} მანოლიტ∞ ${o}-დან. არაფერია, არავინ დაიბადა ყველაფრის მცოდნე. კიდევ ვცადოთ?`,
    nivelDe: (n, total, sello) => `დონე ${n} / ${total} · ბეჭედი «${sello}»`,
    campoAria: (n) => `დონე ${n}-ის სათამაშო ველი`,
    preguntaBurbuja: (q) => `დონე გავლილია! აი კითხვა. ${q}`,
    resPuntos: (p) => `მოპოვებული ქულები · ${p}`,
    resAtrapados: (n) => `დაჭერილი მანოლიტ∞ · ${n}`,
    resNivel: (n, total) => `მიღწეული დონე · ${n} / ${total}`,
    resSellos: (n, total, lista) => `დაცვის ბეჭდები · ${n} / ${total}${lista ? ' (' + lista + ')' : ''}`,
    aprendido: (lec) => `და ერთი რამ, რაც სამუდამოდ გრჩება. ${lec}`,
    burbujaParcial: (n) => `გაქვს ${n} ბეჭედი 6-დან. როცა გინდა გავაგრძელოთ, სერტიფიკატი გელოდება.`,
    marcador: (s, l, o, p) => `${s}წმ · ${l}/${o} მანოლიტ∞ · ${p} ქულა`,
    uvLinea: (u) => `უყურე, ახლა UV ინდექსია ${u}. კრემი, ქუდი და ჩრდილი, დღეს მზე არ პატიობს.`,
    piezas: {
      mascota: 'მანოლიტ∞', sol: 'მზე, ის რომელიც წვავს', sombra: 'ჩრდილის ღრუბელი',
      salud: 'გული', agua: 'წყლის წვეთი', temp: 'თერმომეტრი', prevencion: 'ფარი'
    },
    intro: [
      'Manolit∞ Aire არის ვებგვერდი, რომელიც გაჩვენებს შენი ქალაქის ჰაერს ახლავე. სუფთაა თუ ბინძური, ცხელაა თუ არა და სად არის ჩრდილი.',
      'ის რუკაზე ხაზავს შენობებისა და ხეების ჩრდილებს, სიმულატორივით. ასე ხედავ რომელი ქუჩები ჩრდილშია და რომელი მზეზე.',
      'გეხმარება სკოლაში ან პარკში წვოლის გარეშე წახვიდე. წერს საიდან და საით მიდიხარ და პოულობს ყველაზე ჩრდილიან გზას.',
      'ჩრდილი ძალიან მნიშვნელოვანია. როცა სიცხე ღობს, ჩრდილში სიარული განასხვავებს კარგ და ცუდ გასეირნებას.',
      'შეგიძლია გამოიყენო დიდ ადამიანთან ერთად. აირჩიე შენი ქალაქი, დაათვალიერე რუკა და დააჭირე მარშრუტის ღილაკს. უფასოა, რეკლამების გარეშე და შენი სახელი აქედან არ გადის.'
    ],
    niveles: [
      {
        nombre: 'მზე', sello: 'მზე',
        consejoCampo: 'დაიჭირე მანოლიტ∞ები და გაექცი მზეებს, ამ საათებში ისინი წვავენ.',
        lecciones: [
          'მზე გვაძლევს შუქს და სითბოს, მაგრამ 12-დან 17 საათამდე ისე ძლიერად დებს, რომ კანის დაწვა შეიძლება შეუმჩნევლად.',
          'UV რადიაცია არ ჩანს და მაშინვე არ იგრძნობა. ამიტომ არსებობს UV ინდექსი, რიცხვი რომელიც გაფრთხილებს როდის არის ნამდვილად საშიში.',
          'როცა UV 6-ს აღემატება, კრემი, ქუდი და ჩრდილი გჭირდება. მზე არ პატიობს.'
        ],
        pregunta: 'როდის დებს ყველაზე ძლიერად მზე ზაფხულში?',
        opciones: ['დილით ადრე', '12-დან 17 საათამდე', 'ღამით'],
        fbOk: 'სწორედ! ამ საათებში მზე თითქმის პირდაპირ ცვივა და მაშინ ყველაზე ძლიერ წვავს.',
        fbNo: 'თითქმის. ამ საათებში მზე დაბლაა და ცოტას ათბობს. ცუდი საათები შუადღიდან საღამომდეა.'
      },
      {
        nombre: 'ჩრდილი', sello: 'ჩრდილი',
        consejoCampo: 'ღრუბლები ჩრდილს აკეთებენ. დაიჭირე ისინიც, მეტ ქულას იძლევიან.',
        lecciones: [
          'მზიდან ჩრდილში გადასვლა ბევრს გაგრილებს და მაშინვე იგრძნობა. ეს სიამოვნება არაა, ნამდვილი დაცვაა.',
          'ხეები, ტენტები, კარიბჭეები და ვიწრო ქუჩები უკვე არსებული ჩრდილია. მათი გამოყენება თვითდაცვაა.',
          'Manolit∞ Aire რუკაზე ჩრდილებს ხაზავს, რომ იცოდე სად წახვიდე გრილად.'
        ],
        pregunta: 'სად არის ყველაზე გრილა ზაფხულში?',
        opciones: ['მზიანი მოედნის შუაში', 'ხის ან ტენტის ქვეშ', 'ასფალტზე'],
        fbOk: 'კარგი! ჩრდილი ქუჩის საჩუქარი სახურავია.',
        fbNo: 'უყურე. მზეზე ან ასფალტზე სითბო გროვდება. გრილი ადგილი ხის ან ტენტის ქვეშაა.'
      },
      {
        nombre: 'შენი სხეული', sello: 'ჯანმრთელობა',
        consejoCampo: 'გულები შენი სხეულის მადლობაა. დაიჭირე ისინი.',
        lecciones: [
          'ძლიერი სითბო ყველას ერთნაირად არ ეხება. ბავშვებს, პაპებსა და ქუჩაში მუშებს უფრო ადრე და ძლიერად ურტყამს.',
          'თუ სიცხეში თავი გიტკივა ან თავბრუ გეხვევა, შენი სხეული ჩრდილსა და წყალს ითხოვს.',
          'ზრუნვა იწყება საკუთარი თავის მოსმენით. და გვერდიგანის ზრუნვითაც.'
        ],
        pregunta: 'თუ მეგობარს სიცხეში თავბრუ ეხვევა, რა ვქნათ?',
        opciones: ['მზეზე თამაში განვაგრძოთ', 'თბილი ქურთუკი მივცეთ', 'ჩრდილში გადავიყვანოთ და დიდს ვუთხრათ'],
        fbOk: 'შესანიშნავი! ჩრდილი, წყალი და დიდი ადამიანი. ასე ზრუნავ ადამიანებზე.',
        fbNo: 'არა. თავბრუსხვევისას ჩრდილში წადი, წყალი მისცე და დიდს უთხარი.'
      },
      {
        nombre: 'წყალი', sello: 'წყალი',
        consejoCampo: 'წვეთები გრილი წყალია. დაიჭირე რამდენიმე.',
        lecciones: [
          'სიცხეში სხეული წყალს უფრო სწრაფად კარგავს ვიდრე ფიქრობ, მშიერიც კი არ ხარ.',
          'ხრიკი მცირე ყლუპებით ბევრჯერ დალევაა დღეში. მშიერობის მოლოდინი დაგვიანებაა.',
          'შადრევნები და გრილი წყალი ქუჩაში მთელი უბნის ჯანმრთელობაა.'
        ],
        pregunta: 'როდის უნდა დალიო წყალი სიცხეში?',
        opciones: ['მხოლოდ როცა ძალიან მშშიერა', 'ცოტ-ცოტა და ხშირად, მშიერიც კი არ ვარ', 'მხოლოდ ძილის წინ'],
        fbOk: 'სწორედ! ცოტ-ცოტა და ხშირად, სხეული გიხარია.',
        fbNo: 'თითქმის. როცა ძალიან მშშიერა, სხეული უკვე გვიანებს. უმჯობესია მთელი დღე ცოტ-ცოტა.'
      },
      {
        nombre: 'ყველა ქუჩა ცალკე სამყაროა', sello: 'ტემპ',
        consejoCampo: 'თერმომეტრები თითო ქუჩის სითბოს ზომავენ. დაიჭირე ისინი.',
        lecciones: [
          'ერთი უბნის ორ ქუჩას შეიძლება ძალიან განსხვავებული ტემპერატურა ჰქონდეს. ასფალტი სითბოს ინახავს, პარკები კი ათავისუფლებენ.',
          'ამას სითბოს კუნძული ეწოდება. ეს ზღაპარი არაა, შენი უბანია.',
          'ამიტომ ზოგი ქუჩა წვავს და ზოგი არა. ქუჩის არჩევა ტემპერატურის არჩევაა.'
        ],
        pregunta: 'რომელი ქუჩა იქნება ყველაზე გრილი?',
        opciones: ['ფართო ასფალტიანი ხეების გარეშე', 'მზიანი პარკინგი', 'ვიწრო ხეებიანი'],
        fbOk: 'რა თქმა უნდა! ვიწრო და ხეებიანი, ჩრდილი თითქმის დარწმუნებული.',
        fbNo: 'ეს არა. ფართო ასფალტი ხეების გარეშე სითბოს ინახავს ტაფასავით.'
      },
      {
        nombre: 'წინასწარ მომზადება', sello: 'პრევენცია',
        consejoCampo: 'ფარები მათია, ვინც ემზადება. წადი მათზე.',
        lecciones: [
          'სითბის ტალღები რამდენიმე დღით ადრე იცნობება. მომზადება გამარჯვებაა.',
          'იპოვე შენი გრილი თავშესაფარი. ბიბლიოთეკა, საზოგადოებრივი ცენტრი ან შენი სახლი ჩამოწეული ჟალუზებით ცუდ საათებში.',
          'და ამ დღეებში ნახე როგორ არიან უბნის პაპები და ბავშვები. ეს ყველაზე ეფექტურია.'
        ],
        pregunta: 'თუ ხვალისთვის სითბის ტალღა გამოაცხადეს, რა არის ჭკვიანური?',
        opciones: ['არაფერი, ისე გაივლის', 'შუადღის სირბილი', 'წყლის მომზადება, ჟალუზების ჩამოწევა და გრილი ადგილის პოვნა'],
        fbOk: 'ეს არის დამოკიდებულება! ვინც ემზადება, სითბოზე იცინის.',
        fbNo: 'არა და არა. ჭკვიანური წინასწარ მომზადებაა. წყალი, ჟალუზები და გრილი ადგილი.'
      }
    ]
  }
};

/* ============================================================
   CORPUS CIUDADANO (07-oct-2026, NUEVA ORDEN punto 4)
   El mismo juego para adultos: mismas mecánicas (atrapar Manolit∞,
   6 niveles, 6 sellos de protección y diploma), contenido práctico
   y directo sobre calor urbano, salud, hidratación, sombra, rutas,
   refugios climáticos, radiación, microclima, aire y personas
   vulnerables. Tono cercano sin lenguaje infantil. Paridad total
   de claves con TEXTOS: el motor no distingue modos, solo corpus.
   Los textos vascos y georgianos son traducción propia, pendientes
   de revisión humana antes de publicar.
   ============================================================ */
export const TEXTOS_CIUDADANO = {
  es: {
    titulo: 'Ponte a prueba con Manolit∞',
    cerrarAria: 'Cerrar el juego de Manolit∞',
    queEs: 'Qué es Manolit∞ Aire',
    siguiente: 'Siguiente',
    saltar: 'Saltar la intro',
    jugar: 'Empezar',
    repetir: 'Repetir nivel',
    terminar: 'Terminar y ver mi resumen',
    seguir: 'Seguir jugando',
    verDiploma: 'Ver mi certificado',
    preguntaRapida: 'Pregunta rápida',
    casiTitulo: 'Casi lo tienes',
    finCompleto: 'Los 6 sellos son tuyos',
    finParcial: 'Tu resumen de hoy',
    nombreLabel: 'Tu nombre, solo si quieres que salga',
    notaPriv: 'El certificado se fabrica aquí mismo, en tu dispositivo. Tu nombre no se guarda ni viaja a ningún sitio.',
    btnSvg: 'Descargar certificado SVG',
    btnPdf: 'Descargar certificado PDF',
    introHola: 'Hola, soy Manolit∞. Antes de empezar te cuento qué es esto, en cuatro trocitos.',
    solUy: 'Ese sol es el que hay que esquivar. Sigue.',
    nocivoUy: 'Sol directo cazado. Menos 10 puntos, y a otra cosa.',
    casiBurbuja: 'Casi. Repite el nivel cuando quieras, aquí nadie castiga.',
    burbujaCompleto: 'Enhorabuena. Has completado el juego con los 6 sellos de protección.',
    decirCompleto: 'Enhorabuena. Has conseguido los seis sellos de protección del calor y el sello de simulador de sombras.',
    diplomaOkSvg: 'Certificado SVG descargado. Guárdalo bien.',
    diplomaOkPdf: 'Certificado PDF descargado.',
    diplomaErrSvg: 'No he podido fabricar el certificado. Prueba otra vez en un rato.',
    diplomaErrPdf: 'El PDF no ha salido. Prueba con el SVG, que vale igual.',
    muroAria: 'Sellos de protección',
    finalCorto: 'final',
    resSelloFinal: 'Sello final · Simulador de Sombras. Desbloqueado.',
    credencialTxt: (c) => `Serie · ${c}`,
    casiTxt: (l, o) => `Has atrapado ${l} de ${o} Manolit∞. No pasa nada, nadie nace sabiendo. ¿Otra vez?`,
    nivelDe: (n, total, sello) => `Nivel ${n} de ${total} · Sello «${sello}»`,
    campoAria: (n) => `Campo de juego del nivel ${n}`,
    preguntaBurbuja: (q) => `Nivel superado. A ver esta pregunta. ${q}`,
    resPuntos: (p) => `Puntos conseguidos · ${p}`,
    resAtrapados: (n) => `Manolit∞ atrapados · ${n}`,
    resNivel: (n, total) => `Nivel alcanzado · ${n} de ${total}`,
    resSellos: (n, total, lista) => `Sellos de protección · ${n} de ${total}${lista ? ' (' + lista + ')' : ''}`,
    aprendido: (lec) => `Y una cosa que te llevas para siempre. ${lec}`,
    burbujaParcial: (n) => `Llevas ${n} de 6 sellos. Cuando quieras seguimos, el certificado te espera.`,
    marcador: (s, l, o, p) => `${s}s · ${l}/${o} Manolit∞ · ${p} pts`,
    uvLinea: (u) => `Ahora mismo el índice UV es ${u}. Crema, gorra y sombra en las horas centrales.`,
    piezas: {
      mascota: 'Manolit∞', sol: 'sol directo, nocivo', sombra: 'nube de sombra',
      salud: 'corazón', agua: 'gota de agua', temp: 'termómetro', prevencion: 'escudo'
    },
    intro: [
      'Manolit∞ Aire te enseña cómo está el aire de tu ciudad ahora mismo, si hace calor y por dónde hay sombra.',
      'Dibuja en el mapa las sombras reales de edificios y árboles, como un simulador. Así ves qué calles van a la sombra y cuáles van al sol.',
      'Sirve para moverte por la ciudad sin achicharrarte. Pones origen y destino, y te busca la ruta con más sombra.',
      'La sombra es infraestructura de salud. Con ola de calor, caminar a la sombra es la diferencia entre un trayecto llevadero y un riesgo.',
      'Es gratis, sin anuncios y sin cuentas. Tu nombre no sale de tu dispositivo.'
    ],
    niveles: [
      {
        nombre: 'Radiación', sello: 'sol',
        consejoCampo: 'Atrapa a los Manolit∞ y esquiva los soles, que restan puntos.',
        lecciones: [
          'La radiación UV no se ve ni calienta la piel al momento. Por eso quema sin avisar, sobre todo entre las 12 y las 17 h.',
          'Con índice UV de 6 o más toca protección seria: crema, gorra, gafas y sombra cada rato.',
          'Consultar el UV del día cuesta diez segundos y evita quemaduras. Aquí lo tienes en el panel científico.'
        ],
        pregunta: '¿Cuándo es más agresiva la radiación UV?',
        opciones: ['A primera hora de la mañana', 'Entre las 12 y las 17 h', 'Al atardecer'],
        fbOk: 'Correcto. En las horas centrales el sol cae casi vertical y el UV se dispara.',
        fbNo: 'No. A primera hora y al atardecer el sol va muy inclinado. El tramo malo es de 12 a 17 h.'
      },
      {
        nombre: 'Sombra y rutas', sello: 'sombra',
        consejoCampo: 'Las nubes son sombra útil. Atrápalas, valen más puntos.',
        lecciones: [
          'Pasar del sol a la sombra baja la sensación térmica varios grados al momento. Es protección real, no un capricho.',
          'Árboles, toldos, soportales y calles estrechas son sombra que ya existe. Planear la ruta usándola es cuidarte.',
          'Manolit∞ Aire dibuja esas sombras en el mapa para que elijas la ruta fresca, no la corta.'
        ],
        pregunta: 'En una caminata larga con calor, ¿qué ruta eliges?',
        opciones: ['La más corta aunque vaya a pleno sol', 'La que encadena sombras aunque tarde algo más', 'La de la avenida ancha'],
        fbOk: 'Eso es. Encadenar sombra vale más que ahorrar dos minutos al sol.',
        fbNo: 'No. La ruta corta al sol acumula radiación y calor. Mejor un poco más larga y a la sombra.'
      },
      {
        nombre: 'Golpe de calor', sello: 'salud',
        consejoCampo: 'Los corazones son salud. Cógelos.',
        lecciones: [
          'El calor no afecta igual a todos. Mayores, peques, embarazadas y quien trabaja en la calle lo sufren antes y más fuerte.',
          'Dolor de cabeza, mareo, calambres o confusión con calor son señales de alarma. Sombra, agua y ayuda, sin esperar.',
          'El golpe de calor es una emergencia médica. Si alguien está confuso o muy caliente, llama al 112.'
        ],
        pregunta: 'Una persona mayor se marea y está muy caliente. ¿Qué haces?',
        opciones: ['Dejarla descansar al sol un rato', 'Llevarla a la sombra, darle agua y llamar al 112 si empeora', 'Darle un abrigo'],
        fbOk: 'Correcto. Sombra, hidratación y, si hay confusión o empeora, 112 sin dudar.',
        fbNo: 'No. Mareo y calor corporal alto son señal seria. Sombra, agua y ayuda médica si empeora.'
      },
      {
        nombre: 'Hidratación', sello: 'agua',
        consejoCampo: 'Las gotas son agua. Atrápate unas cuantas.',
        lecciones: [
          'Con calor pierdes agua antes de notar sed. Esperar a tener sed es llegar tarde.',
          'Bebe a sorbos y a menudo durante todo el día. Con olas de calor, también sales y comida ligera.',
          'Las fuentes públicas son infraestructura de salud. Saber dónde están en tu barrio te salva un mal rato.'
        ],
        pregunta: '¿Cuál es la pauta correcta de hidratación con calor?',
        opciones: ['Beber solo cuando aprieta la sed', 'Sorbos frecuentes durante todo el día', 'Solo agua muy fría de golpe'],
        fbOk: 'Eso es. Sorbos frecuentes, sin esperar a la sed.',
        fbNo: 'No. La sed intensa llega cuando ya vas deshidratado. Mejor prevenir con sorbos a lo largo del día.'
      },
      {
        nombre: 'Microclima urbano', sello: 'temp',
        consejoCampo: 'Los termómetros miden la isla de calor. Cógelos.',
        lecciones: [
          'Dos calles del mismo barrio pueden diferir varios grados. Asfalto y fachadas oscuras guardan calor y lo sueltan de noche.',
          'Es la isla de calor urbana. No es teoría, es tu barrio a las diez de la noche.',
          'Elegir calle es elegir temperatura. Parques, agua y arbolado enfrían el entorno de verdad.'
        ],
        pregunta: '¿Qué zona estará más fresca una tarde de calor?',
        opciones: ['Una avenida ancha de asfalto', 'Un aparcamiento al sol', 'Una calle estrecha con árboles'],
        fbOk: 'Correcto. Estrecha y arbolada, sombra y evapotranspiración trabajando para ti.',
        fbNo: 'No. El asfalto ancho y desnudo acumula calor como una placa. La fresca es la estrecha con árboles.'
      },
      {
        nombre: 'Olas de calor', sello: 'prevencion',
        consejoCampo: 'Los escudos son de quien se prepara. A por ellos.',
        lecciones: [
          'Las olas de calor se avisan con días. Prepararse antes es ganar: agua, persianas bajadas y ventilar de noche.',
          'Localiza tu refugio climático más cercano: biblioteca, centro cívico o cualquier espacio público climatizado.',
          'Esos días, mira cómo están los mayores y los peques de tu entorno. Es la medida más efectiva que existe.'
        ],
        pregunta: 'Anuncian ola de calor para mañana. ¿Qué es lo sensato?',
        opciones: ['No cambiar nada, ya pasará', 'Hacer deporte al mediodía para aclimatarse', 'Preparar agua, bajar persianas y localizar un refugio fresco'],
        fbOk: 'Esa es la actitud. Quien se prepara sufre la ola a medias.',
        fbNo: 'No. Lo sensato es prepararse antes: agua, persianas, ventilar de noche y refugio localizado.'
      }
    ]
  },

  en: {
    titulo: 'Test yourself with Manolit∞',
    cerrarAria: 'Close the Manolit∞ game',
    queEs: 'What is Manolit∞ Aire',
    siguiente: 'Next',
    saltar: 'Skip the intro',
    jugar: 'Start',
    repetir: 'Retry level',
    terminar: 'Finish and see my summary',
    seguir: 'Keep playing',
    verDiploma: 'See my certificate',
    preguntaRapida: 'Quick question',
    casiTitulo: 'Almost there',
    finCompleto: 'The 6 seals are yours',
    finParcial: 'Your summary for today',
    nombreLabel: 'Your name, only if you want it on',
    notaPriv: 'The certificate is made right here, on your device. Your name is not stored or sent anywhere.',
    btnSvg: 'Download SVG certificate',
    btnPdf: 'Download PDF certificate',
    introHola: 'Hi, I am Manolit∞. Before starting, let me tell you what this is, in four short pieces.',
    solUy: 'That sun is the one to dodge. Keep going.',
    nocivoUy: 'Direct sun caught. Minus 10 points, move on.',
    casiBurbuja: 'Almost. Retry the level whenever you want, nobody punishes here.',
    burbujaCompleto: 'Congratulations. You completed the game with all 6 protection seals.',
    decirCompleto: 'Congratulations. You earned the six heat protection seals and the shade simulator seal.',
    diplomaOkSvg: 'SVG certificate downloaded. Keep it safe.',
    diplomaOkPdf: 'PDF certificate downloaded.',
    diplomaErrSvg: 'I could not build the certificate. Try again in a bit.',
    diplomaErrPdf: 'The PDF failed. Try the SVG, it works just as well.',
    muroAria: 'Protection seals',
    finalCorto: 'final',
    resSelloFinal: 'Final seal · Shade Simulator. Unlocked.',
    credencialTxt: (c) => `Serial · ${c}`,
    casiTxt: (l, o) => `You caught ${l} of ${o} Manolit∞. No worries, nobody is born knowing. Again?`,
    nivelDe: (n, total, sello) => `Level ${n} of ${total} · Seal «${sello}»`,
    campoAria: (n) => `Playfield of level ${n}`,
    preguntaBurbuja: (q) => `Level cleared. Try this question. ${q}`,
    resPuntos: (p) => `Points earned · ${p}`,
    resAtrapados: (n) => `Manolit∞ caught · ${n}`,
    resNivel: (n, total) => `Level reached · ${n} of ${total}`,
    resSellos: (n, total, lista) => `Protection seals · ${n} of ${total}${lista ? ' (' + lista + ')' : ''}`,
    aprendido: (lec) => `And one thing you keep forever. ${lec}`,
    burbujaParcial: (n) => `You have ${n} of 6 seals. We can continue whenever you want, the certificate waits.`,
    marcador: (s, l, o, p) => `${s}s · ${l}/${o} Manolit∞ · ${p} pts`,
    uvLinea: (u) => `Right now the UV index is ${u}. Sunscreen, hat and shade in the central hours.`,
    piezas: {
      mascota: 'Manolit∞', sol: 'direct sun, harmful', sombra: 'shade cloud',
      salud: 'heart', agua: 'water drop', temp: 'thermometer', prevencion: 'shield'
    },
    intro: [
      'Manolit∞ Aire shows you the air in your city right now, how hot it is and where the shade is.',
      'It draws the real shadows of buildings and trees on the map, like a simulator. You see which streets stay in shade and which ones bake.',
      'Use it to move around the city without overheating. Set origin and destination, and it finds the route with most shade.',
      'Shade is health infrastructure. In a heat wave, walking in shade is the difference between a bearable trip and a risk.',
      'It is free, with no ads and no accounts. Your name never leaves your device.'
    ],
    niveles: [
      {
        nombre: 'Radiation', sello: 'sol',
        consejoCampo: 'Catch the Manolit∞ and dodge the suns, they cost points.',
        lecciones: [
          'UV radiation is invisible and does not feel warm at first. That is why it burns without warning, mainly between 12 and 5 pm.',
          'With a UV index of 6 or more, take real protection: sunscreen, hat, sunglasses and regular shade.',
          'Checking the daily UV takes ten seconds and prevents burns. You have it here in the scientific panel.'
        ],
        pregunta: 'When is UV radiation most aggressive?',
        opciones: ['Early in the morning', 'Between 12 and 5 pm', 'At sunset'],
        fbOk: 'Correct. In the central hours the sun falls almost vertical and UV spikes.',
        fbNo: 'No. Early morning and sunset sun is very slanted. The bad stretch is 12 to 5 pm.'
      },
      {
        nombre: 'Shade and routes', sello: 'sombra',
        consejoCampo: 'Clouds are useful shade. Catch them, they are worth more points.',
        lecciones: [
          'Stepping from sun into shade drops the felt temperature by several degrees at once. It is real protection, not a whim.',
          'Trees, awnings, arcades and narrow streets are shade that already exists. Planning your route around it is self care.',
          'Manolit∞ Aire draws those shadows on the map so you pick the cool route, not the short one.'
        ],
        pregunta: 'On a long walk in the heat, which route do you pick?',
        opciones: ['The shortest one even in full sun', 'The one chaining shade even if a bit longer', 'The wide avenue'],
        fbOk: 'That is it. Chaining shade beats saving two minutes in the sun.',
        fbNo: 'No. The short route in the sun accumulates radiation and heat. Better a bit longer and in shade.'
      },
      {
        nombre: 'Heat stroke', sello: 'salud',
        consejoCampo: 'Hearts are health. Catch them.',
        lecciones: [
          'Heat does not hit everyone equally. Elderly people, small children, pregnant women and outdoor workers suffer it sooner and harder.',
          'Headache, dizziness, cramps or confusion in the heat are alarm signals. Shade, water and help, no waiting.',
          'Heat stroke is a medical emergency. If someone is confused or very hot, call 112.'
        ],
        pregunta: 'An elderly person is dizzy and very hot. What do you do?',
        opciones: ['Let them rest in the sun a while', 'Move them to shade, give water and call 112 if they worsen', 'Give them a coat'],
        fbOk: 'Correct. Shade, hydration and, if confused or worsening, 112 without hesitation.',
        fbNo: 'No. Dizziness and high body heat are a serious signal. Shade, water and medical help if it worsens.'
      },
      {
        nombre: 'Hydration', sello: 'agua',
        consejoCampo: 'Drops are water. Catch a few.',
        lecciones: [
          'In the heat you lose water before feeling thirsty. Waiting for thirst means being late.',
          'Drink in sips and often throughout the day. In heat waves, also salts and light meals.',
          'Public fountains are health infrastructure. Knowing where they are in your neighbourhood saves you a bad time.'
        ],
        pregunta: 'What is the right hydration pattern in the heat?',
        opciones: ['Drink only when very thirsty', 'Frequent sips throughout the day', 'Only very cold water at once'],
        fbOk: 'That is it. Frequent sips, without waiting for thirst.',
        fbNo: 'No. Strong thirst arrives when you are already dehydrated. Better to prevent with sips all day.'
      },
      {
        nombre: 'Urban microclimate', sello: 'temp',
        consejoCampo: 'Thermometers measure the heat island. Catch them.',
        lecciones: [
          'Two streets in the same neighbourhood can differ by several degrees. Asphalt and dark facades store heat and release it at night.',
          'That is the urban heat island. It is not theory, it is your neighbourhood at ten at night.',
          'Choosing a street is choosing a temperature. Parks, water and trees really cool the surroundings.'
        ],
        pregunta: 'Which area will be coolest on a hot afternoon?',
        opciones: ['A wide asphalt avenue', 'A sunny parking lot', 'A narrow street with trees'],
        fbOk: 'Correct. Narrow and tree lined, shade and evapotranspiration working for you.',
        fbNo: 'No. Wide bare asphalt stores heat like a griddle. The cool one is narrow with trees.'
      },
      {
        nombre: 'Heat waves', sello: 'prevencion',
        consejoCampo: 'Shields belong to those who prepare. Go get them.',
        lecciones: [
          'Heat waves are announced days ahead. Preparing early is winning: water, blinds down and night ventilation.',
          'Locate your nearest climate shelter: library, civic centre or any air conditioned public space.',
          'On those days, check on the elderly and children around you. It is the most effective measure there is.'
        ],
        pregunta: 'A heat wave is announced for tomorrow. What is the sensible move?',
        opciones: ['Change nothing, it will pass', 'Exercise at noon to acclimatize', 'Prepare water, lower blinds and locate a cool shelter'],
        fbOk: 'That is the attitude. Those who prepare suffer the wave by half.',
        fbNo: 'No. The sensible thing is preparing ahead: water, blinds, night ventilation and a shelter located.'
      }
    ]
  },

  ca: {
    titulo: 'Posa´t a prova amb en Manolit∞',
    cerrarAria: 'Tancar el joc del Manolit∞',
    queEs: 'Què és Manolit∞ Aire',
    siguiente: 'Següent',
    saltar: 'Saltar la intro',
    jugar: 'Començar',
    repetir: 'Repetir nivell',
    terminar: 'Acabar i veure el meu resum',
    seguir: 'Seguir jugant',
    verDiploma: 'Veure el meu certificat',
    preguntaRapida: 'Pregunta ràpida',
    casiTitulo: 'Gairebé ho tens',
    finCompleto: 'Els 6 segells són teus',
    finParcial: 'El teu resum d\'avui',
    nombreLabel: 'El teu nom, només si vols que surti',
    notaPriv: 'El certificat es fabrica aquí mateix, al teu dispositiu. El teu nom no es desa ni viatja enlloc.',
    btnSvg: 'Descarregar certificat SVG',
    btnPdf: 'Descarregar certificat PDF',
    introHola: 'Hola, sóc en Manolit∞. Abans de començar t\'explico què és això, en quatre trossets.',
    solUy: 'Aquest sol és el que cal esquivar. Segueix.',
    nocivoUy: 'Sol directe caçat. Menys 10 punts, i a una altra cosa.',
    casiBurbuja: 'Gairebé. Repeteix el nivell quan vulguis, aquí ningú no castiga.',
    burbujaCompleto: 'Enhorabona. Has completat el joc amb els 6 segells de protecció.',
    decirCompleto: 'Enhorabona. Has aconseguit els sis segells de protecció de la calor i el segell de simulador d\'ombres.',
    diplomaOkSvg: 'Certificat SVG descarregat. Desa\'l bé.',
    diplomaOkPdf: 'Certificat PDF descarregat.',
    diplomaErrSvg: 'No he pogut fabricar el certificat. Prova una altra vegada d\'aquí una estona.',
    diplomaErrPdf: 'El PDF no ha sortit. Prova amb l\'SVG, que val igual.',
    muroAria: 'Segells de protecció',
    finalCorto: 'final',
    resSelloFinal: 'Segell final · Simulador d\'Ombres. Desbloquejat.',
    credencialTxt: (c) => `Serie · ${c}`,
    casiTxt: (l, o) => `Has atrapat ${l} de ${o} Manolit∞. No passa res, ningú no neix sabent. Una altra?`,
    nivelDe: (n, total, sello) => `Nivell ${n} de ${total} · Segell «${sello}»`,
    campoAria: (n) => `Camp de joc del nivell ${n}`,
    preguntaBurbuja: (q) => `Nivell superat. A veure aquesta pregunta. ${q}`,
    resPuntos: (p) => `Punts aconseguits · ${p}`,
    resAtrapados: (n) => `Manolit∞ atrapat · ${n}`,
    resNivel: (n, total) => `Nivell assolit · ${n} de ${total}`,
    resSellos: (n, total, lista) => `Segells de protecció · ${n} de ${total}${lista ? ' (' + lista + ')' : ''}`,
    aprendido: (lec) => `I una cosa que t\'emportes per sempre. ${lec}`,
    burbujaParcial: (n) => `En portes ${n} de 6 segells. Quan vulguis seguim, el certificat t\'espera.`,
    marcador: (s, l, o, p) => `${s}s · ${l}/${o} Manolit∞ · ${p} pts`,
    uvLinea: (u) => `Ara mateix l\'índex UV és ${u}. Crema, gorra i ombra a les hores centrals.`,
    piezas: {
      mascota: 'Manolit∞', sol: 'sol directe, nociu', sombra: 'núvol d\'ombra',
      salud: 'cor', agua: 'gota d\'aigua', temp: 'termòmetre', prevencion: 'escut'
    },
    intro: [
      'Manolit∞ Aire t\'ensenya com està l\'aire de la teva ciutat ara mateix, si fa calor i per on hi ha ombra.',
      'Dibuixa al mapa les ombres reals d\'edificis i arbres, com un simulador. Així veus quins carrers van a l\'ombra i quins van al sol.',
      'Serveix per moure\'t per la ciutat sense cremar-te. Poses origen i destí, i et busca la ruta amb més ombra.',
      'L\'ombra és infraestructura de salut. Amb onada de calor, caminar a l\'ombra és la diferència entre un trajecte suportable i un risc.',
      'És gratis, sense anuncis i sense comptes. El teu nom no surt del teu dispositiu.'
    ],
    niveles: [
      {
        nombre: 'Radiació', sello: 'sol',
        consejoCampo: 'Atrapa els Manolit∞ i esquiva els sols, que resten punts.',
        lecciones: [
          'La radiació UV no es veu ni escalfa la pell al moment. Per això crema sense avisar, sobretot entre les 12 i les 17 h.',
          'Amb índex UV de 6 o més toca protecció seriosa: crema, gorra, ulleres i ombra sovint.',
          'Consultar l\'UV del dia costa deu segons i evita cremades. Aquí el tens al panell científic.'
        ],
        pregunta: 'Quan és més agressiva la radiació UV?',
        opciones: ['A primera hora del matí', 'Entre les 12 i les 17 h', 'Al capvespre'],
        fbOk: 'Correcte. A les hores centrals el sol cau gairebé vertical i l\'UV es dispara.',
        fbNo: 'No. A primera hora i al capvespre el sol va molt inclinat. El tram dolent és de 12 a 17 h.'
      },
      {
        nombre: 'Ombra i rutes', sello: 'sombra',
        consejoCampo: 'Els núvols són ombra útil. Atrapa\'ls, valen més punts.',
        lecciones: [
          'Passar del sol a l\'ombra baixa la sensació tèrmica diversos graus a l\'instant. És protecció real, no un capritx.',
          'Arbres, tendals, porxos i carrers estrets són ombra que ja existeix. Planejar la ruta fent-la servir és cuidar-te.',
          'Manolit∞ Aire dibuixa aquestes ombres al mapa perquè triïs la ruta fresca, no la curta.'
        ],
        pregunta: 'En una caminada llarga amb calor, quina ruta tries?',
        opciones: ['La més curta encara que vagi a ple sol', 'La que encadena ombres encara que trigui una mica més', 'La de l\'avinguda ampla'],
        fbOk: 'Això és. Encadenar ombra val més que estalviar dos minuts al sol.',
        fbNo: 'No. La ruta curta al sol acumula radiació i calor. Millor una mica més llarga i a l\'ombra.'
      },
      {
        nombre: 'Cop de calor', sello: 'salut',
        consejoCampo: 'Els cors són salut. Agafa\'ls.',
        lecciones: [
          'La calor no afecta tothom igual. Persones grans, infants, embarassades i qui treballa al carrer la pateixen abans i més fort.',
          'Mal de cap, mareig, rampes o confusió amb calor són senyals d\'alarma. Ombra, aigua i ajuda, sense esperar.',
          'El cop de calor és una emergència mèdica. Si algú està confús o molt calent, truca al 112.'
        ],
        pregunta: 'Una persona gran es mareja i està molt calenta. Què fas?',
        opciones: ['Deixar-la descansar al sol una estona', 'Portar-la a l\'ombra, donar-li aigua i trucar al 112 si empitjora', 'Donar-li un abric'],
        fbOk: 'Correcte. Ombra, hidratació i, si està confosa o empitjora, 112 sense dubtar.',
        fbNo: 'No. Mareig i calor corporal alta són senyal seriosa. Ombra, aigua i ajuda mèdica si empitjora.'
      },
      {
        nombre: 'Hidratació', sello: 'agua',
        consejoCampo: 'Les gotes són aigua. Atrapa\'n unes quantes.',
        lecciones: [
          'Amb calor perds aigua abans de notar set. Esperar a tenir set és arribar tard.',
          'Beu a glops i sovint durant tot el dia. Amb onades de calor, també sals i menjar lleuger.',
          'Les fonts públiques són infraestructura de salut. Saber on són al teu barri t\'estalvia un mal moment.'
        ],
        pregunta: 'Quina és la pauta correcta d\'hidratació amb calor?',
        opciones: ['Beure només quan apreta la set', 'Glops freqüents durant tot el dia', 'Només aigua molt freda de cop'],
        fbOk: 'Això és. Glops freqüents, sense esperar la set.',
        fbNo: 'No. La set intensa arriba quan ja vas deshidratat. Millor prevenir amb glops al llarg del dia.'
      },
      {
        nombre: 'Microclima urbà', sello: 'temp',
        consejoCampo: 'Els termòmetres mesuren l\'illa de calor. Agafa\'ls.',
        lecciones: [
          'Dos carrers del mateix barri poden diferir diversos graus. L\'asfalt i les façanes fosques guarden calor i la deixen anar de nit.',
          'És l\'illa de calor urbana. No és teoria, és el teu barri a les deu de la nit.',
          'Triar carrer és triar temperatura. Parcs, aigua i arbrat refreden l\'entorn de veritat.'
        ],
        pregunta: 'Quina zona estarà més fresca una tarda de calor?',
        opciones: ['Una avinguda ampla d\'asfalt', 'Un aparcament al sol', 'Un carrer estret amb arbres'],
        fbOk: 'Correcte. Estret i arbrat, ombra i evapotranspiració treballant per tu.',
        fbNo: 'No. L\'asfalt ample i nu guarda calor com una placa. El fresc és l\'estret amb arbres.'
      },
      {
        nombre: 'Onades de calor', sello: 'prevencion',
        consejoCampo: 'Els escuts són de qui es prepara. A per ells.',
        lecciones: [
          'Les onades de calor s\'avisen amb dies. Preparar-se abans és guanyar: aigua, persianes baixades i ventilar de nit.',
          'Localitza el teu refugi climàtic més proper: biblioteca, centre cívic o qualsevol espai públic climatitzat.',
          'Aquests dies, mira com estan les persones grans i els infants del teu entorn. És la mesura més efectiva que existeix.'
        ],
        pregunta: 'Anuncien onada de calor per demà. Què és el sensat?',
        opciones: ['No canviar res, ja passarà', 'Fer esport al migdia per aclimatar-se', 'Preparar aigua, baixar persianes i localitzar un refugi fresc'],
        fbOk: 'Aquesta és l\'actitud. Qui es prepara pateix l\'onada a mitges.',
        fbNo: 'No. El sensat és preparar-se abans: aigua, persianes, ventilar de nit i refugi localitzat.'
      }
    ]
  },

  gl: {
    titulo: 'Ponte á proba con Manolit∞',
    cerrarAria: 'Pechar o xogo de Manolit∞',
    queEs: 'Que é Manolit∞ Aire',
    siguiente: 'Seguinte',
    saltar: 'Saltar a intro',
    jugar: 'Comezar',
    repetir: 'Repetir nivel',
    terminar: 'Rematar e ver o meu resumo',
    seguir: 'Seguir xogando',
    verDiploma: 'Ver o meu certificado',
    preguntaRapida: 'Pregunta rápida',
    casiTitulo: 'Case o tes',
    finCompleto: 'Os 6 selos son teus',
    finParcial: 'O teu resumo de hoxe',
    nombreLabel: 'O teu nome, só se queres que saia',
    notaPriv: 'O certificado fabrícase aquí mesmo, no teu dispositivo. O teu nome non se garda nin viaxa a ningures.',
    btnSvg: 'Descargar certificado SVG',
    btnPdf: 'Descargar certificado PDF',
    introHola: 'Ola, son Manolit∞. Antes de comezar cóntoche que é isto, en catro cachitos.',
    solUy: 'Ese sol é o que hai que esquivar. Segue.',
    nocivoUy: 'Sol directo apanhado. Menos 10 puntos, e a outra cousa.',
    casiBurbuja: 'Case. Repite o nivel cando queiras, aquí ninguén castiga.',
    burbujaCompleto: 'Parabéns. Completaches o xogo cos 6 selos de protección.',
    decirCompleto: 'Parabéns. Conseguiches os seis selos de protección da calor e o selo de simulador de sombras.',
    diplomaOkSvg: 'Certificado SVG descargado. Gárdao ben.',
    diplomaOkPdf: 'Certificado PDF descargado.',
    diplomaErrSvg: 'Non puiden fabricar o certificado. Proba outra vez nun intre.',
    diplomaErrPdf: 'O PDF non saíu. Proba co SVG, que vale igual.',
    muroAria: 'Selos de protección',
    finalCorto: 'final',
    resSelloFinal: 'Selo final · Simulador de Sombras. Desbloqueado.',
    credencialTxt: (c) => `Serie · ${c}`,
    casiTxt: (l, o) => `Apanhaches ${l} de ${o} Manolit∞. Non pasa nada, ninguén nace sabendo. Outra vez?`,
    nivelDe: (n, total, sello) => `Nivel ${n} de ${total} · Selo «${sello}»`,
    campoAria: (n) => `Campo de xogo do nivel ${n}`,
    preguntaBurbuja: (q) => `Nivel superado. A ver esta pregunta. ${q}`,
    resPuntos: (p) => `Puntos conseguidos · ${p}`,
    resAtrapados: (n) => `Manolit∞ apanhados · ${n}`,
    resNivel: (n, total) => `Nivel alcanzado · ${n} de ${total}`,
    resSellos: (n, total, lista) => `Selos de protección · ${n} de ${total}${lista ? ' (' + lista + ')' : ''}`,
    aprendido: (lec) => `E unha cousa que levas para sempre. ${lec}`,
    burbujaParcial: (n) => `Levas ${n} de 6 selos. Cando queiras seguimos, o certificado espérache.`,
    marcador: (s, l, o, p) => `${s}s · ${l}/${o} Manolit∞ · ${p} pts`,
    uvLinea: (u) => `Agora mesmo o índice UV é ${u}. Crema, gorra e sombra nas horas centrais.`,
    piezas: {
      mascota: 'Manolit∞', sol: 'sol directo, nocivo', sombra: 'nube de sombra',
      salud: 'corazón', agua: 'gota de auga', temp: 'termómetro', prevencion: 'escudo'
    },
    intro: [
      'Manolit∞ Aire ensínache como está o aire da túa cidade agora mesmo, se fai calor e por onde hai sombra.',
      'Debuxa no mapa as sombras reais de edificios e árbores, como un simulador. Así ves que rúas van á sombra e cales van ao sol.',
      'Serve para moverte pola cidade sen chamuscarche. Pós orixe e destino, e búscache a ruta con máis sombra.',
      'A sombra é infraestrutura de saúde. Con onda de calor, camiñar á sombra é a diferenza entre un traxecto levadeiro e un risco.',
      'É de balde, sen anuncios e sen contas. O teu nome non sae do teu dispositivo.'
    ],
    niveles: [
      {
        nombre: 'Radiación', sello: 'sol',
        consejoCampo: 'Apaña os Manolit∞ e esquiva os soles, que restan puntos.',
        lecciones: [
          'A radiación UV non se ve nin quenta a pel ao momento. Por iso queima sen avisar, sobre todo entre as 12 e as 17 h.',
          'Con índice UV de 6 ou máis toca protección seria: crema, gorra, gafas e sombra a miúdo.',
          'Consultar o UV do día custa dez segundos e evita queimaduras. Aquí o tes no panel científico.'
        ],
        pregunta: 'Cando é máis agresiva a radiación UV?',
        opciones: ['A primeira hora da mañá', 'Entre as 12 e as 17 h', 'Ao solpor'],
        fbOk: 'Correcto. Nas horas centrais o sol cae case vertical e o UV dispara.',
        fbNo: 'Non. A primeira hora e ao solpor o sol vai moi inclinado. O tramo malo é de 12 a 17 h.'
      },
      {
        nombre: 'Sombra e rutas', sello: 'sombra',
        consejoCampo: 'As nubes son sombra útil. Apañaas, valen máis puntos.',
        lecciones: [
          'Pasar do sol á sombra baixa a sensación térmica varios graos ao momento. É protección real, non un capricho.',
          'Árbores, toldos, soportais e rúas estreitas son sombra que xa existe. Planear a ruta usándoa é cuidarte.',
          'Manolit∞ Aire debuxa esas sombras no mapa para que escollas a ruta fresca, non a curta.'
        ],
        pregunta: 'Nunha camiñata longa con calor, que ruta escolles?',
        opciones: ['A máis curta aínda que vaia a pleno sol', 'A que encadea sombras aínda que tarde algo máis', 'A da avenida ancha'],
        fbOk: 'Iso é. Encadear sombra vale máis que aforrar dous minutos ao sol.',
        fbNo: 'Non. A ruta curta ao sol acumula radiación e calor. Mellor un pouco máis longa e á sombra.'
      },
      {
        nombre: 'Golpe de calor', sello: 'salud',
        consejoCampo: 'Os corazóns son saúde. Colleos.',
        lecciones: [
          'A calor non afecta igual a todos. Maiores, peques, embarazadas e quen traballa na rúa a sofren antes e máis forte.',
          'Dor de cabeza, mareo, calambres ou confusión con calor son sinais de alarma. Sombra, auga e axuda, sen esperar.',
          'O golpe de calor é unha emerxencia médica. Se alguén está confuso ou moi quente, chama ao 112.'
        ],
        pregunta: 'Unha persoa maior marea e está moi quente. Que fas?',
        opciones: ['Deixala descansar ao sol un intre', 'Levala á sombra, darlle auga e chamar ao 112 se empeora', 'Darlle un abrigo'],
        fbOk: 'Correcto. Sombra, hidratación e, se está confusa ou empeora, 112 sen dubidar.',
        fbNo: 'Non. Mareo e calor corporal alta son sinal seria. Sombra, auga e axuda médica se empeora.'
      },
      {
        nombre: 'Hidratación', sello: 'agua',
        consejoCampo: 'As gotas son auga. Apaña unhas cantas.',
        lecciones: [
          'Con calor perdes auga antes de notar sede. Esperar a ter sede é chegar tarde.',
          'Bebe a golpes e a miúdo durante todo o día. Con ondas de calor, tamén sales e comida lixeira.',
          'As fontes públicas son infraestrutura de saúde. Saber onde están no teu barrio sálvache un mal momento.'
        ],
        pregunta: 'Cal é a pauta correcta de hidratación con calor?',
        opciones: ['Beber só cando aperta a sede', 'Golpes frecuentes durante todo o día', 'Só auga moi fría de golpe'],
        fbOk: 'Iso é. Golpes frecuentes, sen esperar a sede.',
        fbNo: 'Non. A sede intensa chega cando xa vas deshidratado. Mellor previr con golpes ao longo do día.'
      },
      {
        nombre: 'Microclima urbano', sello: 'temp',
        consejoCampo: 'Os termómetros miden a illa de calor. Colleos.',
        lecciones: [
          'Dúas rúas do mesmo barrio poden diferir varios graos. O asfalto e as fachadas escuras gardan calor e soltana de noite.',
          'É a illa de calor urbana. Non é teoría, é o teu barrio ás dez da noite.',
          'Escoller rúa é escoller temperatura. Parques, auga e arbolado arrefrían o contorno de verdade.'
        ],
        pregunta: 'Que zona estará máis fresca unha tarde de calor?',
        opciones: ['Unha avenida ancha de asfalto', 'Un aparcadoiro ao sol', 'Unha rúa estreita con árbores'],
        fbOk: 'Correcto. Estreita e arbolada, sombra e evapotranspiración traballando para ti.',
        fbNo: 'Non. O asfalto ancho e espido garda calor coma unha placa. A fresca é a estreita con árbores.'
      },
      {
        nombre: 'Ondas de calor', sello: 'prevencion',
        consejoCampo: 'Os escudos son de quen se prepara. A por eles.',
        lecciones: [
          'As ondas de calor avísanse con días. Prepararse antes é gañar: auga, persianas baixadas e ventilar de noite.',
          'Localiza o teu refuxio climático máis próximo: biblioteca, centro cívico ou calquera espazo público climatizado.',
          'Esos días, mira como están os maiores e os peques do teu contorno. É a medida máis efectiva que existe.'
        ],
        pregunta: 'Anuncian onda de calor para mañá. Que é o sensato?',
        opciones: ['Non cambiar nada, xa pasará', 'Facer deporte ao mediodía para aclimatarse', 'Preparar auga, baixar persianas e localizar un refuxio fresco'],
        fbOk: 'Esa é a actitude. Quen se prepara sofre a onda pola metade.',
        fbNo: 'Non. O sensato é prepararse antes: auga, persianas, ventilar de noite e refuxio localizado.'
      }
    ]
  },

  // Euskera de elaboración propia (07-oct-2026): pendiente de revisión
  // humana antes de publicar.
  eu: {
    titulo: 'Probatu Manolit∞-rekin',
    cerrarAria: 'Itxi Manolit∞ jokoa',
    queEs: 'Zer da Manolit∞ Aire',
    siguiente: 'Hurrengoa',
    saltar: 'Introa saltatu',
    jugar: 'Hasi',
    repetir: 'Maila errepikatu',
    terminar: 'Amaitu eta nire laburpena ikusi',
    seguir: 'Jolasten jarraitu',
    verDiploma: 'Nire ziurtagiria ikusi',
    preguntaRapida: 'Galdera azkarra',
    casiTitulo: 'Ia-ia duzu',
    finCompleto: '6 zigiluak zureak dira',
    finParcial: 'Gaurko zure laburpena',
    nombreLabel: 'Zure izena, nahi baduzu bakarrik',
    notaPriv: 'Ziurtagiria hemen bertan egiten da, zure gailuan. Zure izena ez da gordetzen ezta inora bidaltzen ere.',
    btnSvg: 'SVG ziurtagiria deskargatu',
    btnPdf: 'PDF ziurtagiria deskargatu',
    introHola: 'Kaixo, Manolit∞ naiz. Hasi aurretik lau zatitan kontatzen dizuet zer den hau.',
    solUy: 'Eguzki hori da saihestu beharrekoa. Segi aurrera.',
    nocivoUy: 'Eguzki zuzena harrapatu duzu. 10 puntu gutxiago, eta beste gauza batera.',
    casiBurbuja: 'Ia-ia. Errepikatu maila nahi duzunean, hemen inork ez du zigortzen.',
    burbujaCompleto: 'Zorionak. Jokoa osatu duzu 6 babes-zigiluekin.',
    decirCompleto: 'Zorionak. Beroaren sei babes-zigilu eta itzal-en simuladorearen zigilua lortu dituzu.',
    diplomaOkSvg: 'SVG ziurtagiria deskargatuta. Gorde ondo.',
    diplomaOkPdf: 'PDF ziurtagiria deskargatuta.',
    diplomaErrSvg: 'Ezin izan dut ziurtagiria egin. Saiatu berriz geroago.',
    diplomaErrPdf: 'PDFa ez da atera. Saiatu SVGarekin, berdina balio du.',
    muroAria: 'Babes-zigiluak',
    finalCorto: 'finala',
    resSelloFinal: 'Azken zigilua · Itzal-en Simuladorea. Desblokeatuta.',
    credencialTxt: (c) => `Seriea · ${c}`,
    casiTxt: (l, o) => `${o} Manolit∞-tatik ${l} harrapatu dituzu. Ez da ezer gertatzen, inork ez du jaiotzean ikasten. Berriz?`,
    nivelDe: (n, total, sello) => `${n}. maila, guztira ${total} · «${sello}» zigilua`,
    campoAria: (n) => `${n}. mailako jolas-eremua`,
    preguntaBurbuja: (q) => `Maila gaindituta. Galdera hau ea. ${q}`,
    resPuntos: (p) => `Lortutako puntuak · ${p}`,
    resAtrapados: (n) => `Harrapatutako Manolit∞ · ${n}`,
    resNivel: (n, total) => `Lortutako maila · ${n} / ${total}`,
    resSellos: (n, total, lista) => `Babes-zigiluak · ${n} / ${total}${lista ? ' (' + lista + ')' : ''}`,
    aprendido: (lec) => `Eta betirako eramaten duzun gauza bat. ${lec}`,
    burbujaParcial: (n) => `6 zigilutik ${n} dituzu. Nahi duzunean jarraitzen dugu, ziurtagiria zain zaitu.`,
    marcador: (s, l, o, p) => `${s}s · ${l}/${o} Manolit∞ · ${p} pt`,
    uvLinea: (u) => `Oraintxe UV indizea ${u} da. Krema, txanoa eta itzala eguneko erdiko orduetan.`,
    piezas: {
      mascota: 'Manolit∞', sol: 'eguzki zuzena, kaltegarria', sombra: 'itzal-hodeia',
      salud: 'bihotza', agua: 'ur-tanta', temp: 'termometroa', prevencion: 'ezkutua'
    },
    intro: [
      'Manolit∞ Aire-k erakusten dizu nola dagoen zure hiriko airea oraintxe, beroa egiten duen eta non dagoen itzala.',
      'Eraikinen eta zuhaitzen benetako itzalak marrazten ditu mapan, simuladore bat bezala. Horrela ikusten duzu zein kale doazen itzalean eta zein eguzkian.',
      'Hirian zehar erretu gabe mugitzeko balio du. Jatorria eta helmuga jarri, eta itzal gehien duen ibilbidea bilatzen dizu.',
      'Itzala osasun-azpiegitura da. Bero-uhinarekin, itzalean ibiltzea da ibilbide jasangarriaren eta arriskuaren arteko aldea.',
      'Doakoa da, iragarkirik eta konturik gabe. Zure izena ez da zure gailutik ateratzen.'
    ],
    niveles: [
      {
        nombre: 'Erradiazioa', sello: 'sol',
        consejoCampo: 'Harrapatu Manolit∞-ak eta saihestu eguzkiak, puntuak kentzen dituzte.',
        lecciones: [
          'UV erradiazioa ez da ikusten eta ez du larruazala berotzen unean. Horregatik erretzen du abisatu gabe, batez ere 12:00 eta 17:00 artean.',
          'UV indizea 6 edo gehiago denean babes serioa behar da: krema, txanoa, betaurrekoak eta itzala sarri.',
          'Eguneko UVa kontsultatzeak hamar segundo kostatzen du eta erredurak saihesten ditu. Hemen duzu panel zientifikoan.'
        ],
        pregunta: 'Noiz da UV erradiazioa agresiboenak?',
        opciones: ['Goizean goiz', '12:00 eta 17:00 artean', 'Iluntzean'],
        fbOk: 'Zuzena. Erdiko orduetan eguzkia ia bertikalki erortzen da eta UVa gora egiten du.',
        fbNo: 'Ez. Goiz eta iluntzeko eguzkia oso inklinatuta doa. Tartea txarra 12:00etatik 17:00etara da.'
      },
      {
        nombre: 'Itzala eta ibilbideak', sello: 'sombra',
        consejoCampo: 'Hodeiak itzal erabilgarria dira. Harrapa itzazu, puntu gehiago balio dute.',
        lecciones: [
          'Eguzkitik itzalera pasatzeak bero-sentsazioa hainbat gradu jaistean du uneoro. Benetako babesa da, ez kapritxoa.',
          'Zuhaitzak, toldoak, arkupeak eta kale estuak dagoeneko dagoen itzala dira. Ibilbidea hori erabiliz planificatzea zure burua zaintzea da.',
          'Manolit∞ Aire-k itzal horiek mapan marrazten ditu ibilbide freskoa aukera dezazun, ez laburra.'
        ],
        pregunta: 'Beroko ibilaldi luze batean, zein ibilbide aukeratzen duzu?',
        opciones: ['Laburrena, eguzki betean joan arren', 'Itzalak kateatzen dituena, pixka bat gehiago iraun arren', 'Etorbide zabalarena'],
        fbOk: 'Hori da. Itzala kateatzeak merezi du eguzkitan bi minutu aurreztea baino.',
        fbNo: 'Ez. Eguzkiko ibilbide laburrak erradiazioa eta beroa metatzen du. Hobe pixka bat luzeagoa eta itzalean.'
      },
      {
        nombre: 'Bero-kolpea', sello: 'salud',
        consejoCampo: 'Bihotzak osasuna dira. Harrapa itzazu.',
        lecciones: [
          'Beroak ez du denok berdin eragiten. Zaharrak, haurrak, haurdun daudenak eta kalean lan egiten duenak lehenago eta indartsuago jasaten dute.',
          'Buruko mina, zorabioa, karranpak edo nahasmena beroarekin alarma-seinaleak dira. Itzala, ura eta laguntza, itxaron gabe.',
          'Bero-kolpea larrialdi medikoa da. Norbait nahasita edo oso bero badago, deitu 112ra.'
        ],
        pregunta: 'Adineko pertsona bat zorabiaturik eta oso bero dago. Zer egiten duzu?',
        opciones: ['Eguzkitan atseden hartzen utzi', 'Itzalera eraman, ura eman eta 112ra deitu okerreratzen bada', 'Berokia eman'],
        fbOk: 'Zuzena. Itzala, hidratazioa eta, nahasita edo okerreratzen bada, 112 zalantzarik gabe.',
        fbNo: 'Ez. Zorabioa eta gorputz-bero altua seinale larria da. Itzala, ura eta laguntza medikoa okerreratzen bada.'
      },
      {
        nombre: 'Hidratazioa', sello: 'agua',
        consejoCampo: 'Tantak ura dira. Harrapatu batzuk.',
        lecciones: [
          'Beroarekin ura galtzen duzu edaria sentitu aurretik. Edaria itxarotea berandu iristea da.',
          'Edan kordoka eta sarri egun osoan zehar. Bero-uhinekin, gatzak eta janari arina ere.',
          'Iturri publikoak osasun-azpiegitura dira. Zure auzoan non dauden jakiteak txarto pasatzea saihesten dizu.'
        ],
        pregunta: 'Zein da hidratazio-jarraibide zuzena beroarekin?',
        opciones: ['Edaria dagoenean bakarrik edan', 'Kordoka maiz egun osoan', 'Ur oso hotza bat-batean bakarrik'],
        fbOk: 'Hori da. Kordoka maiz, edaria itxaron gabe.',
        fbNo: 'Ez. Edarri bortitza deshidratatuta zaudenean iristen da. Hobe prebenitzea egun zehar kordoka.'
      },
      {
        nombre: 'Mikroklima urbanoa', sello: 'temp',
        consejoCampo: 'Termometroek bero-uhartea neurtzen dute. Harrapa itzazu.',
        lecciones: [
          'Auzo bereko bi kalek hainbat graduko aldea izan dezakete. Asfaltoak eta fatxada ilunek beroa gordetzen dute eta gauean askatzen dute.',
          'Hori da bero-uharte urbanoa. Ez da teoria, zure auzoa da gaueko hamarretan.',
          'Kalea aukeratzea tenperatura aukeratzea da. Parkeek, urak eta zuhaitzek benetan hozten dute ingurunea.'
        ],
        pregunta: 'Zein gune egongo da freskoen beroko arratsalde batean?',
        opciones: ['Asfaltozko etorbide zabal bat', 'Eguzkiko aparkaleku bat', 'Zuhaitz dituen kale estu bat'],
        fbOk: 'Zuzena. Estua eta zuhaitzez betea, itzala eta lurraren isuria zuri lanean.',
        fbNo: 'Ez. Asfalto zabal eta biluziak beroa gordetzen du plaka bat bezala. Freskoa zuhaitz dituen estua da.'
      },
      {
        nombre: 'Bero-uhinak', sello: 'prevencion',
        consejoCampo: 'Ezkutuak prestatzen direnena dira. Goazen haiengana.',
        lecciones: [
          'Bero-uhinak egunekin aurreratzen dira. Aurretik prestatzea irabaztea da: ura, pertxanak jaitsita eta gauez aireztatzea.',
          'Bilatu zure klima-babesleku hurbilena: liburutegia, zentro zibikoa edo edozein leku publiko klimatizatu.',
          'Egun horietan, begira zure inguruko zaharrak eta haurrak nola dauden. Existitzen den neurri eraginkorrena da.'
        ],
        pregunta: 'Biharrerako bero-uhina iragarri dute. Zer da zentzuduna?',
        opciones: ['Ez ezer aldatu, pasako da', 'Eguerdian kirola egin ohitutzeko', 'Ura prestatu, pertxanak jaitsi eta leku fresko bat lokalizatu'],
        fbOk: 'Hori da jarrera. Prestatzen duenak uhina erdiz jasaten du.',
        fbNo: 'Ez. Zentzuduna aurretik prestatzea da: ura, pertxanak, gauez aireztatu eta babeslekua lokalizatuta.'
      }
    ]
  },

  // Georgiano de elaboración propia (07-oct-2026): pendiente de revisión
  // humana antes de publicar.
  ka: {
    titulo: 'გამოართხი საკუთარ თავი მანოლიტ∞-თან',
    cerrarAria: 'მანოლიტ∞-ის თამაშის დახურვა',
    queEs: 'რა არის Manolit∞ Aire',
    siguiente: 'შემდეგი',
    saltar: 'ინტროს გამოტოვება',
    jugar: 'დაწყება',
    repetir: 'დონის გამეორება',
    terminar: 'დასრულება და ჩემი შეჯამების ნახვა',
    seguir: 'თამაშის გაგრძელება',
    verDiploma: 'ჩემი სერტიფიკატის ნახვა',
    preguntaRapida: 'სწრაფი კითხვა',
    casiTitulo: 'თითქმის გაქვს',
    finCompleto: '6 ბეჭედი შენია',
    finParcial: 'შენი დღევანდელი შეჯამება',
    nombreLabel: 'შენი სახელი, მხოლოდ თუ გინდა',
    notaPriv: 'სერტიფიკატი მზადდება აქვე, შენს მოწყობილობაზე. შენი სახელი არ ინახება და არსად მიემგზავრება.',
    btnSvg: 'SVG სერტიფიკატის ჩამოტვირთვა',
    btnPdf: 'PDF სერტიფიკატის ჩამოტვირთვა',
    introHola: 'გამარჯობა, მე მანოლიტ∞ ვარ. დაწყებამდე ოთხ ნაწილად მოგიყვები რა არის ეს.',
    solUy: 'ეს მზეა, რომელიც უნდა გაექცე. გააგრძელე.',
    nocivoUy: 'პირდაპირი მზე დაიჭირე. მინუს 10 ქულა და წინ.',
    casiBurbuja: 'თითქმის. გაიმეორე დონე როდესაც გინდა, აქ არავინ საჯის.',
    burbujaCompleto: 'გილოცავ. თამაში 6 დამცავი ბეჭდით დაასრულე.',
    decirCompleto: 'გილოცავ. მიიღე სითბოს ექვსი დამცავი ბეჭედი და ჩრდილების სიმულატორის ბეჭედი.',
    diplomaOkSvg: 'SVG სერტიფიკატი ჩამოტვირთულია. კარგად შეინახე.',
    diplomaOkPdf: 'PDF სერტიფიკატი ჩამოტვირთულია.',
    diplomaErrSvg: 'სერტიფიკატი ვერ გავაკეთე. სცადე მოგვიანებით.',
    diplomaErrPdf: 'PDF ვერ გამოვიდა. სცადე SVG, იგივე ღირს.',
    muroAria: 'დამცავი ბეჭდები',
    finalCorto: 'ფინალი',
    resSelloFinal: 'საბოლოო ბეჭედი · ჩრდილების სიმულატორი. განბლოკილია.',
    credencialTxt: (c) => `სერია · ${c}`,
    casiTxt: (l, o) => `დაიჭირე ${l} მანოლიტ∞ ${o}-დან. არაფერია, არავინ იბადება ცოდნით. კიდევ?`,
    nivelDe: (n, total, sello) => `დონე ${n} / ${total} · ბეჭედი «${sello}»`,
    campoAria: (n) => `დონის ${n} სათამაშო ველი`,
    preguntaBurbuja: (q) => `დონე გადალახულია. აი ეს კითხვა. ${q}`,
    resPuntos: (p) => `მიღებული ქულები · ${p}`,
    resAtrapados: (n) => `დაჭერილი მანოლიტ∞ · ${n}`,
    resNivel: (n, total) => `მიღწეული დონე · ${n} / ${total}`,
    resSellos: (n, total, lista) => `დამცავი ბეჭდები · ${n} / ${total}${lista ? ' (' + lista + ')' : ''}`,
    aprendido: (lec) => `და ერთი რამ, რაც სამუდამოდ დაგრჩება. ${lec}`,
    burbujaParcial: (n) => `გაქვს ${n} ბეჭედი 6-დან. როდესაც გინდა გავაგრძელოთ, სერტიფიკატი გელოდება.`,
    marcador: (s, l, o, p) => `${s}წმ · ${l}/${o} მანოლიტ∞ · ${p} ქულა`,
    uvLinea: (u) => `ახლა UV ინდექსი ${u}ა. კრემი, ქუდი და ჩრდილი დღის შუა საათებში.`,
    piezas: {
      mascota: 'მანოლიტ∞', sol: 'პირდაპირი მზე, მავნე', sombra: 'ჩრდილის ღრუბელი',
      salud: 'გული', agua: 'წყლის წვეთი', temp: 'თერმომეტრი', prevencion: 'ფარი'
    },
    intro: [
      'Manolit∞ Aire გაჩვენებს შენი ქალაქის ჰაერს ახლავე, თბილა თუ არა და სად არის ჩრდილი.',
      'რუკაზე ხატავს შენობებისა და ხეების ნამდვილ ჩრდილებს, სიმულატორივით. ასე ხედავ რომელი ქუჩები ჩრდილშია და რომელი მზეზე.',
      'გამოიყენე ქალაქში გადასაადგილებლად გადახურების გარეშე. დაასვი საწყისი და დანიშნულება და ის იპოვის ყველაზე ჩრდილიან მარშრუტს.',
      'ჩრდილი ჯანდაცვის ინფრასტრუქტურაა. სითბოს ტალღისას ჩრდილში სიარულია განსხვავება ატანილ მგზავრობასა და რისკს შორის.',
      'უფასოა, რეკლამებისა და ანგარიშების გარეშე. შენი სახელი არ ტოვებს შენს მოწყობილობას.'
    ],
    niveles: [
      {
        nombre: 'რადიაცია', sello: 'sol',
        consejoCampo: 'დაიჭირე მანოლიტ∞-ები და გაექცე მზეებს, ისინი ქულებს აკლებენ.',
        lecciones: [
          'UV რადიაცია უხილავია და კანს მაშინვე არ ათბობს. ამიტომ წვავს გაფრთხილების გარეშე, განსაკუთრებით 12-დან 17 საათამდე.',
          'UV ინდექსით 6 ან მეტით სერიოზული დაცვა გჭირდება: კრემი, ქუდი, სათვალე და ჩრდილი ხშირად.',
          'დღის UV-ს შემოწმება ათი წამი ღირს და დამწვრობას აცილებს. აქ გაქვს სამეცნიერო პანელში.'
        ],
        pregunta: 'როდის არის UV რადიაცია ყველაზე აგრესიული?',
        opciones: ['დილით ადრე', '12-დან 17 საათამდე', 'მზის ჩასვლისას'],
        fbOk: 'სწორია. შუა საათებში მზე თითქმის ვერტიკალურად ცვივა და UV მატულობს.',
        fbNo: 'არა. დილისა და მზის ჩასვლის მზე ძალიან დახრილია. ცუდი მონაკვეთია 12-დან 17-მდე.'
      },
      {
        nombre: 'ჩრდილი და მარშრუტები', sello: 'sombra',
        consejoCampo: 'ღრუბლები სასარგებლო ჩრდილია. დაიჭირე, მეტ ქულას ღირს.',
        lecciones: [
          'მზიდან ჩრდილში გადასვლა თბილი შეგრძნებას რამდენიმე გრადუსით ამცირებს მაშინვე. ეს ნამდვილი დაცვაა, არა სურვილი.',
          'ხეები, ტენტები, თავნახები და ვიწრო ქუჩები უკვე არსებული ჩრდილია. მარშრუტის მის გარშემო დაგეგმვა თავის ზრუნვაა.',
          'Manolit∞ Aire ხატავს ამ ჩრდილებს რუკაზე, რომ გრილი მარშრუტი აირჩიო და არა მოკლე.'
        ],
        pregunta: 'სიცხეში გრძელ ფეხსაცმელზე რომელ მარშრუტს ირჩევ?',
        opciones: ['უმოკლესს, მზეზე მაშინვე', 'იმას, რომელიც ჩრდილებს აერთებს, ცოტა მეტი ხნის მიუხედავად', 'ფართო გამზირს'],
        fbOk: 'სწორედ. ჩრდილის ჯაჭვი ორი წუთის დაზოგვაზე მეტს ღირს.',
        fbNo: 'არა. მოკლე მზიანი მარშრუტი რადიაციასა და სითბოს აგროვებს. უმჯობესია ცოტა გრძელი და ჩრდილიანი.'
      },
      {
        nombre: 'სითბოს დარტყმა', sello: 'salud',
        consejoCampo: 'გულები ჯანმრთელობაა. დაიჭირე ისინი.',
        lecciones: [
          'სითბო ყველას არ ეხება ერთნაირად. ხანდაზმულები, პატარა ბავშვები, ორსულები და ქუჩაში მომუშავეები უფრო ადრე და ძლიერად ტანჯვენ.',
          'თავის ტკივილი, თავბრუსხვევა, ტერფები ან დაბნეულობა სიცხეში საგანგაშო სიგნალებია. ჩრდილი, წყალი და დახმარება, ლოდინის გარეშე.',
          'სითბოს დარტყმა სამედიცინო გადაუდებელია. თუ ვინმე დაბნეულია ან ძალიან ცხელა, დარეკე 112.'
        ],
        pregunta: 'ხანდაზმული ადამიანი თავბრუსხვევს და ძალიან ცხელა. რას აკეთებ?',
        opciones: ['მზეზე დაისვენებს', 'ჩრდილში გადაიყვან, წყალი მიეცი და 112 დაურეკე თუ გაუარესდა', 'პალტო მიაცვი'],
        fbOk: 'სწორია. ჩრდილი, ჰიდრატაცია და, თუ დაბნეულია ან გაუარესდება, 112 ყოყმანის გარეშე.',
        fbNo: 'არა. თავბრუსხვევა და მაღალი სხეულის სითბო სერიოზული სიგნალია. ჩრდილი, წყალი და სამედიცინო დახმარება.'
      },
      {
        nombre: 'ჰიდრატაცია', sello: 'agua',
        consejoCampo: 'წვეთები წყალია. დაიჭირე რამდენიმე.',
        lecciones: [
          'სიცხეში წყალს წყურვილის შეგრძნებამდე კარგავ. წყურვილის ლოდინი დაგვიანებაა.',
          'სვი პატარა ყლუპებით და ხშირად მთელი დღე. სითბოს ტალღებში ასევე მარილი და მსუბუქი საკვები.',
          'საჯარო შადრევნები ჯანდაცვის ინფრასტრუქტურაა. მათი ადგილის ცოდნა შენს უბანში ცუდ მომენტს გიშოულებს.'
        ],
        pregunta: 'რა არის სწორი ჰიდრატაციის წესი სიცხეში?',
        opciones: ['მხოლოდ ძლიერი წყურვილისას სმა', 'ხშირი პატარა ყლუპები მთელი დღე', 'მხოლოდ ძალიან ცივი წყალი ერთდროულად'],
        fbOk: 'სწორედ. ხშირი ყლუპები, წყურვილის ლოდინის გარეშე.',
        fbNo: 'არა. ძლიერი წყურვილი მოდის, როცა უკვე დეჰიდრატირებული ხარ. უმჯობესია მთელი დღე ყლუპებით პრევენცია.'
      },
      {
        nombre: 'ურბანული მიკროკლიმა', sello: 'temp',
        consejoCampo: 'თერმომეტრები სითბოს კუნძულს ზომავს. დაიჭირე ისინი.',
        lecciones: [
          'ერთი უბნის ორ ქუჩას შეიძლება რამდენიმე გრადუსი განსხვავება ჰქონდეს. ასფალტი და მუქი ფასადები სითბოს ინახავს და ღამით უშვებს.',
          'ეს არის ურბანული სითბოს კუნძული. ეს თეორია არაა, შენი უბანია ღამის ათ საათზე.',
          'ქუჩის არჩევა ტემპერატურის არჩევაა. პარკები, წყალი და ხეები ნამდვილად აგრილებს გარემოს.'
        ],
        pregunta: 'რომელი ზონა იქნება უფრო გრილი ცხელა შუადღეს?',
        opciones: ['ფართო ასფალტის გამზირი', 'მზიანი პარკინგი', 'ვიწრო ქუჩა ხეებით'],
        fbOk: 'სწორია. ვიწრო და ხეებიანი, ჩრდილი და აორთქლება შენთვის მუშაობს.',
        fbNo: 'არა. ფართო შიშველი ასფალტი სითბოს ტაფასავით ინახავს. გრილი ვიწრო ხეებიანია.'
      },
      {
        nombre: 'სითბოს ტალღები', sello: 'prevencion',
        consejoCampo: 'ფარები მათია, ვინც ემზადება. წადი მათზე.',
        lecciones: [
          'სითბოს ტალღები რამდენიმე დღით ადრე იცნობება. წინასწარ მომზადება გამარჯვებაა: წყალი, ჩამოწეული ჟალუზები და ღამის ვენტილაცია.',
          'იპოვე შენი უახლოესი კლიმატური თავშესაფარი: ბიბლიოთეკა, საზოგადოებრივი ცენტრი ან ნებისმიერი კონდიცირებადი საჯარო სივრცე.',
          'იმ დღეებში შეამოწმე შენი გარშემო ხანდაზმულები და ბავშვები. ეს ყველაზე ეფექტური ღონისძიებაა.'
        ],
        pregunta: 'ხვალისთვის სითბოს ტალღა გამოაცხადეს. რა არის ჭკვიანური?',
        opciones: ['არაფრის შეცვლა, ისე გაივლის', 'შუადღის ვარჯიში შეჩვევისთვის', 'წყლის მომზადება, ჟალუზების ჩამოწევა და გრილი თავშესაფრის პოვნა'],
        fbOk: 'ეს არის დამოკიდებულება. ვინც ემზადება, ტალღას ნახევრად იტანს.',
        fbNo: 'არა. ჭკვიანური წინასწარ მომზადებაა: წყალი, ჟალუზები, ღამის ვენტილაცია და ნაპოვი თავშესაფარი.'
      }
    ]
  }
};

/* Respaldo limpio: si falta una clave en un idioma se coge la
   española. Funciona igual con strings que con funciones.
   07-oct-2026: con modo 'ciudadano' el respaldo es el corpus
   ciudadano, nunca el infantil: los dos modos no se mezclan. */
export function textosDe(lang, modo) {
  const corpus = (modo === 'ciudadano') ? TEXTOS_CIUDADANO : TEXTOS;
  const base = corpus.es;
  const pack = corpus[lang] || base;
  return new Proxy(pack, {
    get(obj, clave) {
      if (clave in obj) return obj[clave];
      return base[clave];
    }
  });
}

/* Compatibilidad: la intro en español sigue exportada sola. */
export const INTRO_QUE_ES = TEXTOS.es.intro;

/* ---------------- sprites SVG (lenguaje Manolit) ---------------- */
const GRANATE = '#7A0016', DORADO = '#E6A100', TEAL = '#007A87';

/* La mascota Manolit∞: cuerpo de gota con su infinito, ondas teal,
   círculo dorado, piernas y brazos que andan en contrafase. */
const SVG_MASCOTA = `<svg viewBox="0 0 120 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="overflow:visible">
  <g class="jm-pierna-izq" style="transform-origin:60px 118px">
    <path d="M 60,118 L 45,155" stroke="${GRANATE}" stroke-width="6" stroke-linecap="round" fill="none"/>
    <ellipse cx="43" cy="158" rx="7" ry="4.5" fill="${GRANATE}"/>
  </g>
  <g class="jm-pierna-der" style="transform-origin:60px 118px">
    <path d="M 60,118 L 75,155" stroke="${GRANATE}" stroke-width="6" stroke-linecap="round" fill="none"/>
    <ellipse cx="77" cy="158" rx="7" ry="4.5" fill="${GRANATE}"/>
  </g>
  <g class="jm-brazo-izq" style="transform-origin:26px 76px">
    <path d="M 26,76 L 6,104" stroke="${GRANATE}" stroke-width="5" stroke-linecap="round" fill="none"/>
    <circle cx="5" cy="106" r="4.5" fill="${DORADO}" stroke="${GRANATE}" stroke-width="2.5"/>
  </g>
  <g class="jm-brazo-der" style="transform-origin:94px 76px">
    <path d="M 94,76 L 114,104" stroke="${GRANATE}" stroke-width="5" stroke-linecap="round" fill="none"/>
    <circle cx="115" cy="106" r="4.5" fill="${DORADO}" stroke="${GRANATE}" stroke-width="2.5"/>
  </g>
  <path d="M 60,18 C 22,58 22,108 60,132 C 98,108 98,58 60,18 Z" fill="rgba(2,4,6,0.35)" stroke="${GRANATE}" stroke-width="5" stroke-linejoin="round"/>
  <circle cx="60" cy="63" r="26" fill="${DORADO}"/>
  <path d="M 40,68 Q 50,61 60,68 T 80,68" fill="none" stroke="${TEAL}" stroke-width="3" stroke-linecap="round"/>
  <path d="M 43,75 Q 51.5,69.5 60,75 T 77,75" fill="none" stroke="${TEAL}" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M 60,58 C 45,42 45,72 60,58 C 75,42 75,72 60,58 Z" fill="none" stroke="${GRANATE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const SVG_NUBE = `<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="overflow:visible">
  <path d="M 34,72 A 16,16 0 0 1 36,42 A 20,20 0 0 1 72,28 A 17,17 0 0 1 102,46 A 13,13 0 0 1 98,72 Z" fill="rgba(2,4,6,0.35)" stroke="${GRANATE}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M 44,56 Q 54,50 64,56 T 84,56" fill="none" stroke="${TEAL}" stroke-width="3" stroke-linecap="round"/>
  <path d="M 48,64 Q 56,59 64,64 T 80,64" fill="none" stroke="${TEAL}" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M 60,74 C 55,81 55,86 60,89 C 65,86 65,81 60,74 Z" fill="${DORADO}"/>
</svg>`;

const SVG_SOL = `<svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g stroke="${DORADO}" stroke-width="4" stroke-linecap="round">
    <line x1="45" y1="6" x2="45" y2="16"/><line x1="45" y1="74" x2="45" y2="84"/>
    <line x1="6" y1="45" x2="16" y2="45"/><line x1="74" y1="45" x2="84" y2="45"/>
    <line x1="17" y1="17" x2="24" y2="24"/><line x1="66" y1="66" x2="73" y2="73"/>
    <line x1="73" y1="17" x2="66" y2="24"/><line x1="24" y1="66" x2="17" y2="73"/>
  </g>
  <circle cx="45" cy="45" r="19" fill="${DORADO}" stroke="${GRANATE}" stroke-width="4"/>
</svg>`;

const SVG_CORAZON = `<svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M45 76 C22 58 12 44 12 30 C12 19 21 12 30 12 C37 12 42 16 45 22 C48 16 53 12 60 12 C69 12 78 19 78 30 C78 44 68 58 45 76 Z" fill="${GRANATE}"/>
  <line x1="45" y1="32" x2="45" y2="52" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
  <line x1="35" y1="42" x2="55" y2="42" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>
</svg>`;

const SVG_GOTA = `<svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M45 10 C45 10 22 40 22 56 C22 70 32 80 45 80 C58 80 68 70 68 56 C68 40 45 10 45 10 Z" fill="${TEAL}"/>
  <ellipse cx="37" cy="52" rx="5" ry="9" fill="#FFFFFF" opacity="0.5"/>
</svg>`;

const SVG_TERMO = `<svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="39" y="8" width="12" height="46" rx="6" fill="#FFFFFF" stroke="${GRANATE}" stroke-width="4"/>
  <circle cx="45" cy="66" r="15" fill="${GRANATE}"/>
  <rect x="41" y="30" width="8" height="34" fill="${GRANATE}"/>
</svg>`;

const SVG_ESCUDO = `<svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M45 8 L76 20 L76 44 C76 63 63 75 45 82 C27 75 14 63 14 44 L14 20 Z" fill="${DORADO}"/>
  <path d="M32 44 L41 54 L60 32" stroke="${GRANATE}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const SPRITES = { mascota: SVG_MASCOTA, sol: SVG_SOL, sombra: SVG_NUBE, salud: SVG_CORAZON, agua: SVG_GOTA, temp: SVG_TERMO, prevencion: SVG_ESCUDO };

/* ---------------- estilos del juego (se inyectan una vez) ---------------- */
function ponerEstilos() {
  if (document.getElementById('jmEstilos')) return;
  const st = document.createElement('style');
  st.id = 'jmEstilos';
  st.textContent = `
.jm-panel{ width:min(680px,100%); margin:14px auto 0; padding:14px 14px 18px; box-sizing:border-box;
  background:var(--surface, rgba(255,255,255,0.92)); border:2px solid ${GRANATE}; border-radius:18px;
  color:var(--ink, #0D1F26); font-family:var(--font-body, system-ui, sans-serif); }
.jm-cab{ display:flex; align-items:center; gap:10px; }
.jm-cab-mascota{ width:44px; flex:none; }
.jm-cab-mascota svg{ width:100%; height:auto; display:block; }
.jm-titulo{ font-size:1.25rem; font-weight:800; margin:0; color:${GRANATE}; flex:1; }
.jm-x{ min-width:44px; min-height:44px; border-radius:12px; border:2px solid ${GRANATE}; background:#fff;
  color:${GRANATE}; font-size:1.15rem; font-weight:700; cursor:pointer; }
.jm-sellos{ display:flex; gap:6px; justify-content:center; margin:10px 0 4px; flex-wrap:wrap; }
.jm-sello{ width:46px; text-align:center; font-family:var(--font-mono, monospace); font-size:10px;
  color:${GRANATE}; opacity:0.3; }
.jm-sello span{ display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.jm-sello svg{ width:40px; height:40px; display:block; margin:0 auto; }
.jm-sello.jm-ok{ opacity:1; }
.jm-burbuja{ position:relative; background:#fff; border:2px solid ${GRANATE}; border-radius:14px;
  padding:10px 12px; margin:8px 0 10px; font-size:0.98rem; line-height:1.45; min-height:44px; }
.jm-burbuja::before{ content:''; position:absolute; top:-9px; left:26px; width:14px; height:14px;
  background:#fff; border-left:2px solid ${GRANATE}; border-top:2px solid ${GRANATE};
  transform:rotate(45deg); }
.jm-cuerpo{ min-height:220px; }
.jm-leccion{ font-size:1rem; line-height:1.5; margin:0 0 10px; }
.jm-kicker{ font-family:var(--font-mono, monospace); font-size:0.8rem; letter-spacing:0.08em;
  color:${TEAL}; text-transform:uppercase; margin:0 0 6px; }
.jm-h3{ font-size:1.3rem; color:${GRANATE}; margin:2px 0 8px; }
.jm-marc{ display:flex; justify-content:space-between; gap:8px; font-family:var(--font-mono, monospace);
  font-size:0.95rem; margin:0 0 6px; }
.jm-progreso{ height:8px; border-radius:6px; background:rgba(122,0,22,0.14); margin:0 0 8px; overflow:hidden; }
.jm-progreso-fill{ height:100%; width:0%; border-radius:6px;
  background:linear-gradient(90deg, ${TEAL}, ${DORADO}); transition:width .25s ease; }
.jm-campo{ position:relative; height:clamp(240px, 42vh, 400px); overflow:hidden; border-radius:14px;
  border:2px solid ${GRANATE};
  background:linear-gradient(180deg, #8fd3ff 0%, #d7f1ff 70%, #eafaf1 100%); touch-action:manipulation; }
.jm-pieza{ position:absolute; top:-72px; left:0; width:56px; height:56px; padding:0; border:none;
  background:transparent; cursor:pointer; will-change:transform;
  animation:jmCae var(--jm-caida, 2400ms) linear forwards; }
.jm-pieza svg{ width:100%; height:100%; display:block; overflow:visible; pointer-events:none; }
.jm-pieza:focus-visible{ outline:3px solid ${GRANATE}; outline-offset:2px; border-radius:12px; }
.jm-pieza.jm-cogida{ animation:none; transition:opacity .18s ease, transform .18s ease; opacity:0; }
.jm-pop{ position:absolute; font-family:var(--font-mono, monospace); font-weight:700; color:${GRANATE};
  pointer-events:none; animation:jmPop .5s ease-out forwards; }
.jm-campo.jm-pausa .jm-pieza, .jm-campo.jm-pausa .jm-pop{ animation-play-state:paused; }
.jm-campo.jm-pausa .jm-pieza *, .jm-campo.jm-pausa svg *{ animation-play-state:paused !important; }
.jm-btn{ display:inline-block; min-height:44px; padding:10px 18px; margin:8px 8px 0 0; border-radius:12px;
  border:2px solid ${GRANATE}; background:${DORADO}; color:#2A1A05; font-weight:700; font-size:1rem;
  cursor:pointer; }
.jm-btn.jm-sec{ background:#fff; color:${GRANATE}; }
.jm-btn:focus-visible{ outline:3px solid ${TEAL}; outline-offset:2px; }
.jm-ops{ display:flex; flex-direction:column; gap:8px; margin-top:8px; }
.jm-ops .jm-btn{ width:100%; margin:0; text-align:left; }
.jm-fb{ font-weight:700; margin-top:10px; }
.jm-fb.jm-bien{ color:#0B6B44; }
.jm-fb.jm-casi{ color:${GRANATE}; }
.jm-res{ list-style:none; padding:0; margin:8px 0; }
.jm-res li{ padding:4px 0; font-size:1rem; }
.jm-nombre{ width:100%; max-width:320px; min-height:44px; font-size:1rem; padding:8px 10px;
  border:2px solid ${GRANATE}; border-radius:10px; margin-top:6px; }
.jm-nota{ font-size:0.85rem; color:${TEAL}; margin-top:6px; }
.jm-puntos-intro{ display:flex; gap:6px; justify-content:center; margin:6px 0 2px; }
.jm-punto{ width:10px; height:10px; border-radius:50%; background:${GRANATE}; opacity:0.25; }
.jm-punto.jm-act{ opacity:1; }
.jm-diploma-prev{ margin:12px 0 4px; border:2px solid ${GRANATE}; border-radius:12px; overflow:hidden;
  background:#FBFAF7; }
.jm-diploma-prev svg{ width:100%; height:auto; display:block; }
.jm-cred{ font-family:var(--font-mono, monospace); font-size:0.85rem; color:${TEAL}; margin-top:6px; }
.jm-holo-anim{ animation:jmHolo 3.6s linear infinite; }
.jm-holo-off .jm-holo-anim{ animation-play-state:paused; }
@keyframes jmHolo{ from{ transform:translateX(-460px); } to{ transform:translateX(1050px); } }
@keyframes jmCae{ to{ transform:translateY(720px); } }
@keyframes jmPop{ 0%{ opacity:0; transform:translateY(6px); } 25%{ opacity:1; } 100%{ opacity:0; transform:translateY(-16px); } }
@keyframes jmVaivenPierna{ 0%,100%{ transform:rotate(7deg); } 50%{ transform:rotate(-7deg); } }
@keyframes jmVaivenBrazo{ 0%,100%{ transform:rotate(8deg); } 50%{ transform:rotate(-8deg); } }
.jm-pieza .jm-pierna-izq, .jm-cab-mascota .jm-pierna-izq{ animation:jmVaivenPierna 1.6s ease-in-out infinite; }
.jm-pieza .jm-pierna-der, .jm-cab-mascota .jm-pierna-der{ animation:jmVaivenPierna 1.6s ease-in-out -0.8s infinite; }
.jm-pieza .jm-brazo-izq, .jm-cab-mascota .jm-brazo-izq{ animation:jmVaivenBrazo 1.6s ease-in-out -0.8s infinite; }
.jm-pieza .jm-brazo-der, .jm-cab-mascota .jm-brazo-der{ animation:jmVaivenBrazo 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce){
  .jm-pieza{ animation:none; }
  .jm-pieza *, .jm-cab-mascota *{ animation:none !important; }
  .jm-pop{ animation-duration:0.001s; }
  .jm-holo-anim{ animation:none !important; }
  .jm-progreso-fill{ transition:none; }
}
/* Modo ciudadano (07-oct-2026, NUEVA ORDEN punto 4): mismo juego,
   acabado sobrio para adultos. Teal como acento de cabecera y
   progreso, burbuja con filo teal, sin perder la marca. */
.jm-adulto .jm-titulo{ color:${TEAL}; }
.jm-adulto .jm-x{ border-color:${TEAL}; color:${TEAL}; }
.jm-adulto .jm-burbuja{ border-color:${TEAL}; }
.jm-adulto .jm-burbuja::before{ border-left-color:${TEAL}; border-top-color:${TEAL}; }
.jm-adulto .jm-sello{ color:${TEAL}; }
.jm-adulto .jm-campo{ border-color:${TEAL}; }
.jm-adulto .jm-h3{ color:${TEAL}; }
/* Pieza nociva (sol directo): aro granate discontinuo para que se
   lea como "eso no se coge" sin asustar. */
.jm-pieza.jm-nociva{ outline:3px dashed ${GRANATE}; outline-offset:2px; border-radius:50%; }`;
  document.head.appendChild(st);
}

/* ---------------- utilidades ---------------- */
function nodo(tag, clase, texto) {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto != null) el.textContent = texto;
  return el;
}

// solo en memoria: la intro se ve una vez por visita y por modo
// (peque y ciudadano tienen intros distintas, no se mezclan)
const introVistas = { peque: false, ciudadano: false };

/* ============================================================
   iniciarJuegoManolit(contenedor, opciones)
   opciones:
     - getLang: función que devuelve el idioma actual de la web
       ('es', 'ca', 'eu', 'gl', 'en' o 'ka'). Si falta, 'es'.
     - decir: función opcional para leer en voz alta (solo si la
       voz ya tiene permiso, lo decide quien la pasa)
     - onCerrar: callback al cerrar el panel (para devolver el foco)
     - cargarCertificado: función que importa js/certificado-manolito.js
   Devuelve { destruir }.
   ============================================================ */
export function iniciarJuegoManolit(contenedor, opciones = {}) {
  const getLang = typeof opciones.getLang === 'function' ? opciones.getLang : () => 'es';
  const decir = typeof opciones.decir === 'function' ? opciones.decir : () => {};
  const onCerrar = typeof opciones.onCerrar === 'function' ? opciones.onCerrar : () => {};
  const cargarCert = opciones.cargarCertificado || (() => import('./certificado-manolito.js'));
  const reduceMov = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 07-oct-2026 (NUEVA ORDEN punto 4): el juego vive en dos modos,
  // peque (por defecto) y ciudadano. Mismo motor, corpus y diploma
  // distintos. Nunca se mezclan: el modo se fija al abrir el panel.
  const modo = (opciones.modo === 'ciudadano') ? 'ciudadano' : 'peque';

  ponerEstilos();

  /* ---- estado de la partida (solo memoria) ---- */
  const estado = {
    pantalla: 'intro', pasoIntro: 0, nivel: 0,
    puntos: 0, atrapados: 0, sellos: [],
    enJuego: false, pausado: false,
    finEnMs: 0, ultimoSpawnMs: 0, piezas: [], llevadas: 0,
    intervalo: null, pausaEnMs: 0, ultimoTextoMarc: '',
    lang: String(getLang() || 'es'),
    respondida: false, fbBien: false, finCompleto: false,
    credencial: '', observador: null,
    modo: modo
  };
  const T = () => textosDe(estado.lang, estado.modo);
  const nvTxt = () => T().niveles[estado.nivel] || textosDe('es', estado.modo).niveles[estado.nivel];

  /* ---- esqueleto del panel ---- */
  contenedor.innerHTML = '';
  const panel = nodo('div', 'jm-panel' + (modo === 'ciudadano' ? ' jm-adulto' : ''));
  panel.setAttribute('role', 'region');

  const cab = nodo('div', 'jm-cab');
  const mascotaCab = nodo('div', 'jm-cab-mascota');
  mascotaCab.innerHTML = SVG_MASCOTA;
  const titulo = nodo('h3', 'jm-titulo');
  titulo.id = 'jmTitulo';
  const btnX = nodo('button', 'jm-x', '✕');
  btnX.type = 'button';
  cab.append(mascotaCab, titulo, btnX);

  const muro = nodo('div', 'jm-sellos');

  const burbuja = nodo('div', 'jm-burbuja');
  burbuja.setAttribute('aria-live', 'polite');

  const cuerpo = nodo('div', 'jm-cuerpo');

  panel.append(cab, muro, burbuja, cuerpo);
  contenedor.appendChild(panel);

  function pintarCab() {
    titulo.textContent = T().titulo;
    panel.setAttribute('aria-label', T().titulo);
    btnX.setAttribute('aria-label', T().cerrarAria);
    muro.setAttribute('aria-label', T().muroAria);
  }

  function pintarMuro() {
    muro.innerHTML = '';
    const pack = T();
    for (let i = 0; i < NIVELES.length; i++) {
      const cfg = NIVELES[i];
      const txt = pack.niveles[i];
      const s = nodo('span', 'jm-sello' + (estado.sellos.includes(cfg.id) ? ' jm-ok' : ''));
      s.innerHTML = SPRITES[cfg.id];
      s.appendChild(nodo('span', null, txt ? txt.sello : cfg.id));
      muro.appendChild(s);
    }
    const fin = nodo('span', 'jm-sello' + (estado.sellos.length === NIVELES.length ? ' jm-ok' : ''));
    fin.innerHTML = SVG_MASCOTA;
    fin.appendChild(nodo('span', null, pack.finalCorto));
    muro.appendChild(fin);
  }

  function ponerBurbuja(txt) {
    // si el texto es idéntico al anterior, un espacio duro al final
    // fuerza el cambio y el lector de pantalla lo vuelve a anunciar
    burbuja.textContent = (burbuja.textContent === txt) ? txt + ' ' : txt;
  }

  function cerrar() {
    destruir();
    onCerrar();
  }

  /* ---------------- motor del campo de juego ---------------- */
  function pararReloj() {
    if (estado.intervalo) { clearInterval(estado.intervalo); estado.intervalo = null; }
  }

  function quitarPiezas() {
    for (const p of estado.piezas) p.el.remove();
    estado.piezas = [];
  }

  function pausarJuego() {
    if (!estado.enJuego || estado.pausado) return;
    estado.pausado = true;
    estado.pausaEnMs = Date.now();
    pararReloj();
    const campo = cuerpo.querySelector('.jm-campo');
    if (campo) campo.classList.add('jm-pausa');
  }

  function reanudarJuego() {
    if (!estado.enJuego || !estado.pausado) return;
    estado.pausado = false;
    const delta = Date.now() - estado.pausaEnMs;
    estado.finEnMs += delta;
    estado.ultimoSpawnMs += delta;
    for (const p of estado.piezas) p.nacidaEnMs += delta;
    const campo = cuerpo.querySelector('.jm-campo');
    if (campo) campo.classList.remove('jm-pausa');
    estado.intervalo = setInterval(tick, 250);
  }

  const alVisibilidad = () => {
    if (document.hidden) pausarJuego(); else reanudarJuego();
  };
  document.addEventListener('visibilitychange', alVisibilidad);

  const alEscape = (e) => {
    if (e.key !== 'Escape') return;
    if (e.target && e.target.id === 'jmNombre') return; // escribir el nombre no cierra
    e.preventDefault();
    cerrar();
  };
  document.addEventListener('keydown', alEscape);

  /* Cambio de idioma en caliente: repinta la pantalla actual sin
     tocar puntos, sellos ni el reloj de la partida. */
  const alIdioma = (e) => {
    const nuevo = e && e.detail && e.detail.lang ? String(e.detail.lang) : '';
    if (!nuevo || nuevo === estado.lang) return;
    estado.lang = nuevo;
    repintar();
  };
  document.addEventListener('langChanged', alIdioma);

  function repintar() {
    pintarCab();
    pintarMuro();
    switch (estado.pantalla) {
      case 'intro': pintarIntro(true); break;
      case 'nivel': pintarNivelInfo(); break;
      case 'juego': {
        // el campo sigue cayendo: solo marcador y consejo cambian
        const campo = cuerpo.querySelector('.jm-campo');
        if (campo) {
          campo.setAttribute('aria-label', T().campoAria(estado.nivel + 1));
          estado.ultimoTextoMarc = '';
          pintarMarcador(campo, NIVELES[estado.nivel], true);
        }
        break;
      }
      case 'pregunta': pintarPregunta(true); break;
      case 'casi': pintarCasi(true); break;
      case 'fin': pintarFin(estado.finCompleto, true); break;
      default: break;
    }
  }

  function spawnPieza(nv, campo) {
    /* 07-oct-2026 (NUEVA ORDEN punto 4): en modo ciudadano también caen
       piezas nocivas (sol directo). Si las atrapas sin querer quitan
       10 puntos y nada más: la partida nunca se pierde por eso.
       En el nivel 1 el sol ya era pieza de esquivar, así que allí la
       probabilidad extra no aplica (todo sol es nocivo). */
    const esCiudadano = estado.modo === 'ciudadano';
    const probNociva = esCiudadano ? (nv.id === 'sol' ? 0 : 0.14) : 0;
    const esNociva = Math.random() < probNociva;
    const esTema = !esNociva && Math.random() < nv.probTema;
    const tipo = esNociva ? 'sol' : (esTema ? nv.id : 'mascota');
    // En ciudadano cualquier sol es nocivo (también los del nivel 1).
    const nociva = esCiudadano && tipo === 'sol';
    const b = nodo('button', 'jm-pieza' + (nociva ? ' jm-nociva' : ''));
    b.type = 'button';
    b.innerHTML = SPRITES[tipo];
    b.setAttribute('aria-label', T().piezas[tipo] || tipo);
    b.style.setProperty('--jm-caida', nv.caidaMs + 'ms');
    const ancho = campo.clientWidth || 300;
    b.style.left = Math.floor(Math.random() * Math.max(1, ancho - 60)) + 'px';
    if (reduceMov) {
      const alto = campo.clientHeight || 260;
      b.style.top = Math.floor(Math.random() * Math.max(1, alto - 130)) + 'px';
    }
    const pieza = { el: b, tipo, nacidaEnMs: Date.now(), vidaMs: nv.caidaMs + 350 };
    const coger = (ev) => {
      if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      if (b.dataset.cogida) return;
      b.dataset.cogida = '1';
      let topPx = null;
      try {
        if (typeof ev.clientY === 'number') {
          const r = campo.getBoundingClientRect();
          topPx = Math.max(4, Math.min(ev.clientY - r.top, (campo.clientHeight || 260) - 24));
        }
      } catch (e2) { }
      if (nociva) {
        // nociva atrapada: quita 10 puntos (sin bajar de 0) y sigue
        // la partida como si nada. Nunca quita sellos ni la partida.
        estado.puntos = Math.max(0, estado.puntos - 10);
        pop(campo, b, '−10', topPx);
        ponerBurbuja(T().nocivoUy || T().solUy);
      } else if (tipo === 'mascota') {
        estado.puntos += 10; estado.atrapados += 1; estado.llevadas += 1;
        pop(campo, b, '+10', topPx);
      } else if (nv.temaPuntos > 0) {
        estado.puntos += nv.temaPuntos;
        pop(campo, b, '+' + nv.temaPuntos, topPx);
      } else {
        ponerBurbuja(T().solUy);
      }
      b.classList.add('jm-cogida');
      estado.piezas = estado.piezas.filter(p => p !== pieza);
      setTimeout(() => b.remove(), 220);
      pintarMarcador(campo, nv, true);
    };
    b.addEventListener('pointerdown', coger);
    b.addEventListener('keydown', coger);
    campo.appendChild(b);
    estado.piezas.push(pieza);
  }

  function pop(campo, piezaEl, txt, topPx) {
    const p = nodo('span', 'jm-pop', txt);
    p.style.left = piezaEl.style.left;
    p.style.top = Math.max(4, topPx != null ? topPx : 60) + 'px';
    campo.appendChild(p);
    setTimeout(() => p.remove(), 550);
  }

  function pintarMarcador(campo, nv, forzar) {
    const restante = Math.max(0, Math.ceil((estado.finEnMs - Date.now()) / 1000));
    const txt = T().marcador(restante, estado.llevadas, nv.objetivo, estado.puntos);
    if (forzar || txt !== estado.ultimoTextoMarc) {
      estado.ultimoTextoMarc = txt;
      const m = campo.parentNode.querySelector('.jm-marc');
      if (m) m.textContent = txt;
      const fill = campo.parentNode.querySelector('.jm-progreso-fill');
      if (fill) fill.style.width = Math.min(100, Math.round(estado.llevadas / nv.objetivo * 100)) + '%';
    }
  }

  function tick() {
    if (!estado.enJuego || estado.pausado) return;
    const ahora = Date.now();
    const nv = NIVELES[estado.nivel];
    const campo = cuerpo.querySelector('.jm-campo');
    if (!campo) { pararReloj(); return; }
    for (const p of [...estado.piezas]) {
      if (ahora - p.nacidaEnMs > p.vidaMs) {
        p.el.remove();
        estado.piezas = estado.piezas.filter(x => x !== p);
      }
    }
    if (ahora - estado.ultimoSpawnMs >= nv.spawnMs && estado.piezas.length < 7) {
      estado.ultimoSpawnMs = ahora;
      spawnPieza(nv, campo);
    }
    pintarMarcador(campo, nv, false);
    if (ahora >= estado.finEnMs) {
      pararReloj();
      estado.enJuego = false;
      const conseguido = estado.llevadas >= nv.objetivo;
      if (conseguido) { estado.respondida = false; pintarPregunta(); } else pintarCasi();
    }
  }

  /* ---------------- pantallas ---------------- */
  function pintarIntro(enRepintado) {
    estado.pantalla = 'intro';
    pintarCab();
    pintarMuro();
    const pack = T();
    const intro = pack.intro && pack.intro.length ? pack.intro : textosDe('es', estado.modo).intro;
    if (estado.pasoIntro >= intro.length) estado.pasoIntro = intro.length - 1;
    cuerpo.innerHTML = '';
    const kicker = nodo('p', 'jm-kicker', pack.queEs);
    const txt = nodo('p', 'jm-leccion', intro[estado.pasoIntro]);
    txt.setAttribute('tabindex', '-1');
    const puntos = nodo('div', 'jm-puntos-intro');
    intro.forEach((_, i) => {
      puntos.appendChild(nodo('span', 'jm-punto' + (i === estado.pasoIntro ? ' jm-act' : '')));
    });
    const btnSi = nodo('button', 'jm-btn', estado.pasoIntro < intro.length - 1 ? pack.siguiente : pack.jugar);
    btnSi.type = 'button';
    btnSi.addEventListener('click', () => {
      if (estado.pasoIntro < intro.length - 1) { estado.pasoIntro += 1; pintarIntro(); }
      else { introVistas[estado.modo] = true; pintarNivelInfo(); }
    });
    const btnNo = nodo('button', 'jm-btn jm-sec', pack.saltar);
    btnNo.type = 'button';
    btnNo.addEventListener('click', () => { introVistas[estado.modo] = true; pintarNivelInfo(); });
    cuerpo.append(kicker, txt, puntos, btnSi, btnNo);
    ponerBurbuja(pack.introHola);
    if (!enRepintado) txt.focus();
  }

  function pintarNivelInfo() {
    estado.pantalla = 'nivel';
    pintarCab();
    pintarMuro();
    const pack = T();
    const nv = NIVELES[estado.nivel];
    const nt = nvTxt();
    cuerpo.innerHTML = '';
    const kicker = nodo('p', 'jm-kicker', pack.nivelDe(estado.nivel + 1, NIVELES.length, nt.sello));
    const h = nodo('h4', 'jm-h3', nt.nombre);
    h.setAttribute('tabindex', '-1');
    cuerpo.append(kicker, h);
    for (const lec of nt.lecciones) cuerpo.appendChild(nodo('p', 'jm-leccion', lec));
    const uv = uvDeLaWeb();
    if (estado.nivel === 0 && uv != null && uv >= 6) {
      cuerpo.appendChild(nodo('p', 'jm-leccion', pack.uvLinea(Math.round(uv))));
    }
    const btn = nodo('button', 'jm-btn', pack.jugar);
    btn.type = 'button';
    btn.addEventListener('click', pintarJuego);
    cuerpo.appendChild(btn);
    ponerBurbuja(pack.nivelDe(estado.nivel + 1, NIVELES.length, nt.sello) + '. ' + nt.consejoCampo);
    h.focus();
  }

  function pintarJuego() {
    estado.pantalla = 'juego';
    pintarCab();
    pararReloj(); // guardia: ni doble clic ni doble Enter arma dos relojes
    const nv = NIVELES[estado.nivel];
    cuerpo.innerHTML = '';
    const marc = nodo('div', 'jm-marc');
    const prog = nodo('div', 'jm-progreso');
    prog.setAttribute('aria-hidden', 'true');
    const fill = nodo('div', 'jm-progreso-fill');
    prog.appendChild(fill);
    const campo = nodo('div', 'jm-campo');
    campo.setAttribute('role', 'group');
    campo.setAttribute('aria-label', T().campoAria(estado.nivel + 1));
    cuerpo.append(marc, prog, campo);
    estado.enJuego = true; estado.pausado = false;
    estado.llevadas = 0; estado.piezas = [];
    estado.finEnMs = Date.now() + nv.duracion * 1000;
    estado.ultimoSpawnMs = Date.now() - nv.spawnMs + 350;
    estado.ultimoTextoMarc = '';
    pintarMarcador(campo, nv, true);
    ponerBurbuja(nvTxt().consejoCampo);
    if (document.hidden) { pausarJuego(); return; }
    estado.intervalo = setInterval(tick, 250);
  }

  function pintarPregunta(enRepintado) {
    estado.pantalla = 'pregunta';
    pintarCab();
    const pack = T();
    const nv = NIVELES[estado.nivel];
    const nt = nvTxt();
    quitarPiezas();
    cuerpo.innerHTML = '';
    const h = nodo('h4', 'jm-h3', pack.preguntaRapida);
    h.setAttribute('tabindex', '-1');
    const q = nodo('p', 'jm-leccion', nt.pregunta);
    const ops = nodo('div', 'jm-ops');
    nt.opciones.forEach((op, i) => {
      const b = nodo('button', 'jm-btn', op);
      b.type = 'button';
      b.disabled = estado.respondida;
      b.addEventListener('click', () => {
        if (estado.respondida) return;
        estado.respondida = true;
        estado.fbBien = i === nv.correcta;
        for (const x of ops.querySelectorAll('button')) x.disabled = true;
        const fbTxt = estado.fbBien ? nt.fbOk : nt.fbNo;
        const fb = nodo('p', 'jm-fb ' + (estado.fbBien ? 'jm-bien' : 'jm-casi'), fbTxt);
        cuerpo.appendChild(fb);
        ponerBurbuja(fbTxt);
        decir(fbTxt);
        if (!estado.sellos.includes(nv.id)) estado.sellos.push(nv.id);
        pintarMuro();
        pintarBotonSeguir();
      });
      ops.appendChild(b);
    });
    cuerpo.append(h, q, ops);
    if (estado.respondida) {
      // repintado tras cambio de idioma con la pregunta ya contestada
      const fbTxt = estado.fbBien ? nt.fbOk : nt.fbNo;
      const fb = nodo('p', 'jm-fb ' + (estado.fbBien ? 'jm-bien' : 'jm-casi'), fbTxt);
      cuerpo.appendChild(fb);
      ponerBurbuja(fbTxt);
      pintarBotonSeguir();
    } else {
      ponerBurbuja(pack.preguntaBurbuja(nt.pregunta));
    }
    if (!enRepintado) h.focus();

    function pintarBotonSeguir() {
      const btnSeguir = nodo('button', 'jm-btn', estado.nivel < NIVELES.length - 1 ? pack.siguiente : pack.verDiploma);
      btnSeguir.type = 'button';
      btnSeguir.addEventListener('click', () => {
        if (estado.nivel < NIVELES.length - 1) { estado.nivel += 1; pintarNivelInfo(); }
        else pintarFin(true);
      });
      cuerpo.appendChild(btnSeguir);
      if (!enRepintado) btnSeguir.focus();
    }
  }

  function pintarCasi(enRepintado) {
    estado.pantalla = 'casi';
    pintarCab();
    const pack = T();
    const nv = NIVELES[estado.nivel];
    quitarPiezas();
    cuerpo.innerHTML = '';
    const h = nodo('h4', 'jm-h3', pack.casiTitulo);
    h.setAttribute('tabindex', '-1');
    const txt = nodo('p', 'jm-leccion', pack.casiTxt(estado.llevadas, nv.objetivo));
    const btnRe = nodo('button', 'jm-btn', pack.repetir);
    btnRe.type = 'button';
    btnRe.addEventListener('click', pintarNivelInfo);
    const btnFin = nodo('button', 'jm-btn jm-sec', pack.terminar);
    btnFin.type = 'button';
    btnFin.addEventListener('click', () => pintarFin(false));
    cuerpo.append(h, txt, btnRe, btnFin);
    ponerBurbuja(pack.casiBurbuja);
    if (!enRepintado) h.focus();
  }

  function nombreSello(id) {
    const i = NIVELES.findIndex(n => n.id === id);
    if (i < 0) return id;
    const nt = T().niveles[i];
    return nt ? nt.sello : id;
  }

  function pintarFin(completo, enRepintado) {
    estado.pantalla = 'fin';
    estado.finCompleto = completo;
    estado.enJuego = false;
    pararReloj();
    quitarPiezas();
    pintarCab();
    pintarMuro();
    const pack = T();
    cuerpo.innerHTML = '';
    const h = nodo('h4', 'jm-h3', completo ? pack.finCompleto : pack.finParcial);
    h.setAttribute('tabindex', '-1');
    const lista = nodo('ul', 'jm-res');
    const datos = [
      pack.resPuntos(estado.puntos),
      pack.resAtrapados(estado.atrapados),
      pack.resNivel(Math.min(estado.nivel + (completo ? 1 : 0), NIVELES.length), NIVELES.length),
      pack.resSellos(estado.sellos.length, NIVELES.length, estado.sellos.map(nombreSello).join(', '))
    ];
    if (completo) datos.push(pack.resSelloFinal);
    for (const d of datos) lista.appendChild(nodo('li', null, d));
    const ultimaLeccion = textosDe(estado.lang, estado.modo).niveles[Math.max(0, estado.sellos.length - 1)].lecciones[0];
    const aprendido = nodo('p', 'jm-leccion', pack.aprendido(ultimaLeccion));
    cuerpo.append(h, lista, aprendido);

    if (completo) {
      const cajaCert = nodo('div');
      const lab = nodo('label', 'jm-leccion', pack.nombreLabel);
      const inp = nodo('input', 'jm-nombre');
      inp.type = 'text';
      inp.id = 'jmNombre';
      inp.maxLength = 40;
      inp.autocomplete = 'off';
      lab.setAttribute('for', 'jmNombre');
      const nota = nodo('p', 'jm-nota', pack.notaPriv);
      const btnSvg = nodo('button', 'jm-btn', pack.btnSvg);
      btnSvg.type = 'button';
      const btnPdf = nodo('button', 'jm-btn', pack.btnPdf);
      btnPdf.type = 'button';
      const hacer = () => ({
        nombre: inp.value.trim().slice(0, 40),
        puntos: estado.puntos,
        sellos: [...estado.sellos],
        fecha: new Date().toLocaleDateString(document.documentElement.lang || 'es'),
        lang: estado.lang,
        credencial: estado.credencial,
        modo: estado.modo
      });
      btnSvg.addEventListener('click', async () => {
        btnSvg.disabled = true;
        try {
          const cert = await cargarCert();
          if (!estado.credencial) estado.credencial = cert.nuevaCredencial();
          cert.descargarSVG('certificado-manolit.svg', cert.construirCertificadoSVG(hacer()));
          ponerBurbuja(pack.diplomaOkSvg);
        } catch (e) {
          ponerBurbuja(pack.diplomaErrSvg);
        } finally { btnSvg.disabled = false; }
      });
      btnPdf.addEventListener('click', async () => {
        btnPdf.disabled = true;
        try {
          const cert = await cargarCert();
          if (!estado.credencial) estado.credencial = cert.nuevaCredencial();
          cert.descargarPDF('certificado-manolit.pdf', cert.construirCertificadoSVG(hacer()));
          ponerBurbuja(pack.diplomaOkPdf);
        } catch (e) {
          ponerBurbuja(pack.diplomaErrPdf);
        } finally { btnPdf.disabled = false; }
      });
      cajaCert.append(lab, inp, nota, btnSvg, btnPdf);
      cuerpo.appendChild(cajaCert);
      ponerBurbuja(pack.burbujaCompleto);
      decir(pack.decirCompleto);
      pintarDiplomaPrevio(cajaCert, hacer, pack);
    } else {
      const btnMas = nodo('button', 'jm-btn', pack.seguir);
      btnMas.type = 'button';
      btnMas.addEventListener('click', pintarNivelInfo);
      cuerpo.appendChild(btnMas);
      ponerBurbuja(pack.burbujaParcial(estado.sellos.length));
    }
    if (!enRepintado) h.focus();
  }

  /* Vista previa del diploma en pantalla, con el brillo de la banda
     moviéndose muy despacio. El brillo se pausa cuando la vista no
     está visible y con prefers-reduced-motion no se mueve nunca.
     El SVG descargado es siempre estático (la animación vive en el
     CSS de la página, no en el archivo). */
  function pintarDiplomaPrevio(cajaCert, hacer, pack) {
    (async () => {
      try {
        const cert = await cargarCert();
        if (!estado.credencial) estado.credencial = cert.nuevaCredencial();
        if (estado.pantalla !== 'fin' || !estado.finCompleto) return;
        const prev = nodo('div', 'jm-diploma-prev');
        prev.innerHTML = cert.construirCertificadoSVG(hacer());
        const cred = nodo('p', 'jm-cred', pack.credencialTxt(estado.credencial));
        cajaCert.appendChild(prev);
        cajaCert.appendChild(cred);
        // pausa del brillo cuando no está visible (batería)
        if (!reduceMov && typeof IntersectionObserver === 'function') {
          estado.observador = new IntersectionObserver((entradas) => {
            for (const en of entradas) prev.classList.toggle('jm-holo-off', !en.isIntersecting);
          });
          estado.observador.observe(prev);
        } else {
          prev.classList.add('jm-holo-off');
        }
      } catch (e) { /* la vista previa es opcional: las descargas siguen */ }
    })();
  }

  /* Lee el UV que ya muestra la propia web (sin pedir nada a la red). */
  function uvDeLaWeb() {
    const el = document.getElementById('sciUV');
    if (!el) return null;
    const n = parseFloat(String(el.textContent).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  btnX.addEventListener('click', cerrar);

  /* ---------------- arranque y limpieza ---------------- */
  pintarCab();
  if (introVistas[estado.modo]) pintarNivelInfo(); else pintarIntro();

  function destruir() {
    estado.enJuego = false;
    pararReloj();
    quitarPiezas();
    if (estado.observador) { estado.observador.disconnect(); estado.observador = null; }
    document.removeEventListener('visibilitychange', alVisibilidad);
    document.removeEventListener('keydown', alEscape);
    document.removeEventListener('langChanged', alIdioma);
    contenedor.innerHTML = '';
  }

  return { destruir };
}
