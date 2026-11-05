/* ============================================================
   tutorial.js · El paseo de bienvenida de Manolit∞ Aire

   Cómo funciona, sin líos:
   - La primera visita (con cookies aceptadas y la intro ya pasada)
     te enseña la web paso a paso con driver.js.
   - driver.js solo se descarga cuando hace falta, así el resto de
     visitas se ahorran esas peticiones y esos kilobytes.
   - Si cambias de idioma con el tutorial abierto, se rehace al
     momento en el idioma nuevo.
   - El botón de ayuda de la web llama a window.iniciarTutorialManolito.

   Reglas de la casa para los textos: frases cortas, como se habla,
   sin tecnicismos y sin dos puntos, punto y coma ni rayas largas.
   ============================================================ */
"use strict";
(function () {

  const CLAVE_VISTO = "tutorial_visto";

  /* Los textos del tutorial en los seis idiomas de la casa.
     Cada paso tiene su número comentado para que editarlo sea fácil.
     OJO: el orden de este array NO es el orden del paseo, el orden
     del recorrido manda en construirPasos(), más abajo. */
  const TEXTOS = {
    es: {
      next: "Siguiente",
      prev: "Anterior",
      done: "Finalizar",
      progreso: "{{current}} de {{total}}",
      pasos: [
        /* 0 · ciudad */       { title: "Elige tu ciudad", desc: "Desde aquí cambias de ciudad y ves el aire que hace allí ahora mismo." },
        /* 1 · modos */        { title: "¿Cómo te lo cuento?", desc: "La misma información explicada de varias maneras. Elige la que mejor te venga." },
        /* 2 · mapa aire */    { title: "El aire, ahora mismo", desc: "Cada punto del mapa es una estación de medición de verdad. Tócalo y te cuenta lo que estás respirando." },
        /* 3 · gráfica */      { title: "La gráfica del aire", desc: "Pasa el dedo por la línea y verás la hora y el valor exactos. La parte continua es lo ya medido y la discontinua es lo que está por venir." },
        /* 4 · ruta */         { title: "Busca tu ruta con sombra", desc: "Escribe de dónde sales y a dónde vas, o toca Mi ubicación. Manolit∞ te lleva por la sombra cuando aprieta el calor y por el sol si activas el modo invierno." },
        /* 5 · mapa 3D */      { title: "El mapa 3D", desc: "Los edificios echan la sombra que les toca a cada hora. Acerca, gira y mueve la hora del día para verlo. Y si te pones a caminar, el trozo de ruta ya andado se pone gris, como en Google Maps." },
        /* 6 · planetario */   { title: "El planetario", desc: "Debajo del mapa tienes un planetario pequeño. La Tierra gira y ves a qué altura anda el sol a cada hora. Mueve la hora y mira cómo se mueven las sombras." },
        /* 7 · lidar */        { title: "El visor LiDAR", desc: "Bajo el planetario hay un botón que abre los modelos LiDAR. Son nubes de puntos reales de la ciudad, punto a punto. Para curiosos con ganas de trastear." },
        /* 8 · capas */        { title: "Abre las capas", desc: "Con el botón de capas abres este panel. Desde aquí enciendes y apagas lo que ves en el mapa. Te las enseño por partes." },
        /* 9 · irradiación */  { title: "El sol de cada sitio", desc: "Con el botón Irradiación solar tocas cualquier punto y ves cuánto sol recibe a lo largo del año, con datos de la NASA." },
        /* 10 · árboles */     { title: "Árboles y paseo virtual", desc: "Activa Árboles para ver su sombra y con el Paseo virtual 3D caminas por las calles en primera persona sin salir de casa." },
        /* 11 · chat */        { title: "Pregúntale a Manolit∞", desc: "El botón M∞ abre el chat. Escríbele o háblale por el micro y te responde en voz alta." },
        /* 12 · tus datos */   { title: "Tus datos, contigo", desc: "En Sincronizar y Exportar te llevas tus ajustes en un archivo y los pasas a otro dispositivo. Sin cuentas y sin servidores." },
        /* 13 · ko-fi */       { title: "Apoya la causa", desc: "Manolit∞ es gratis y lo seguirá siendo. Si algún día quieres echar una mano con los gastos, aquí está el Ko-fi." },
        /* 14 · hermanos */    { title: "Los hermanos de Manolit∞", desc: "Por aquí andan también Manolit∞ Forestal e Islas de Calor Sevilla, hechos con el mismo cariño." },
        /* 15 · agua */        { title: "El agua que no se ve", desc: "Aquí ves el agua que gastan los anuncios del mundo mientras miras esta página. Tu visita gasta unos 2 mililitros, medidos. Entra en la comparativa y calcula los litros que consume tu móvil por culpa de anuncios que nadie pidió." },
        /* 16 · capas: sombras y sol */ { title: "Sombras y sol", desc: "Sombras dibuja la sombra de cada edificio a la hora que quieras. Posición del sol te enseña dónde está en el cielo. Y con Irradiación solar tocas un punto y ves cuánto sol recibe al año." },
        /* 17 · capas: entorno */       { title: "Entorno y clima", desc: "Árboles suma su sombra al mapa. Nubes enseña las de verdad. Calidad del aire pinta cómo respira tu zona en España y Microclima estima cuánto cambia el calor de un sitio a otro." },
        /* 18 · capas: mapa base */     { title: "Mapa base", desc: "Cambia entre mapa claro, IGN u oscuro. Edificios 3D levanta la ciudad y Catastro 3D añade los datos oficiales del Catastro." },
        /* 19 · capas: rutas */         { title: "Rutas y movilidad", desc: "Ruta dibuja tu camino. Aquí también planificas un viaje, buscas aparcamiento y enciendes fuentes de agua, carriles bici y transporte público con sus paradas y horarios." }
      ]
    },
    ca: {
      next: "Següent",
      prev: "Anterior",
      done: "Finalitzar",
      progreso: "{{current}} de {{total}}",
      pasos: [
        /* 0 · ciutat */       { title: "Escull la teva ciutat", desc: "Des d'aquí canvies de ciutat i veus l'aire que hi fa ara mateix." },
        /* 1 · maneres */      { title: "Com t'ho explico?", desc: "La mateixa informació explicada de diverses maneres. Tria la que millor et vagi." },
        /* 2 · mapa aire */    { title: "L'aire, ara mateix", desc: "Cada punt del mapa és una estació de mesura de veritat. Toca'l i t'explica què estàs respirant." },
        /* 3 · gràfica */      { title: "La gràfica de l'aire", desc: "Passa el dit per la línia i veuràs l'hora i el valor exactes. La part contínua és el ja mesurat i la discontínua és el que està per venir." },
        /* 4 · ruta */         { title: "Cerca la teva ruta amb ombra", desc: "Escriu d'on surts i on vas, o toca La meva ubicació. Manolit∞ et porta per l'ombra quan apreta la calor i pel sol si actives el mode hivern." },
        /* 5 · mapa 3D */      { title: "El mapa 3D", desc: "Els edificis fan l'ombra que els toca a cada hora. Apropa, gira i mou l'hora del dia per veure-ho. I si et poses a caminar, el tros de ruta ja fet es posa gris, com a Google Maps." },
        /* 6 · planetari */    { title: "El planetari", desc: "Sota el mapa tens un planetari petit. La Terra gira i veus a quina alçada va el sol a cada hora. Mou l'hora i mira com es mouen les ombres." },
        /* 7 · lidar */        { title: "El visor LiDAR", desc: "Sota el planetari hi ha un botó que obre els models LiDAR. Són núvols de punts reals de la ciutat, punt a punt. Per a curiosos amb ganes de trastejar." },
        /* 8 · capes */        { title: "Obre les capes", desc: "Amb el botó de capes obres aquest panell. Des d'aquí engegues i apagues el que veus al mapa. Te les ensenyo per parts." },
        /* 9 · irradiació */   { title: "El sol de cada lloc", desc: "Amb el botó Irradiació solar toques qualsevol punt i veus quant sol rep al llarg de l'any, amb dades de la NASA." },
        /* 10 · arbres */      { title: "Arbres i passeig virtual", desc: "Activa Arbres per veure la seva ombra i amb el Passeig virtual 3D camines pels carrers en primera persona sense sortir de casa." },
        /* 11 · xat */         { title: "Pregunta a Manolit∞", desc: "El botó M∞ obre el xat. Escriu-li o parla-li pel micro i et respon en veu alta." },
        /* 12 · dades */       { title: "Les teves dades, amb tu", desc: "A Sincronitzar i Exportar t'emportes els ajustos en un fitxer i els passes a un altre dispositiu. Sense comptes i sense servidors." },
        /* 13 · ko-fi */       { title: "Dona suport a la causa", desc: "Manolit∞ és gratis i ho seguirà sent. Si algun dia vols donar un cop de mà amb les despeses, aquí tens el Ko-fi." },
        /* 14 · germans */     { title: "Els germans de Manolit∞", desc: "Per aquí també hi ha Manolit∞ Forestal i Illes de Calor Sevilla, fets amb la mateixa cura." },
        /* 15 · aigua */       { title: "L'aigua que no es veu", desc: "Aquí veus l'aigua que gasten els anuncis del món mentre mires aquesta pàgina. La teva visita en gasta uns 2 mil·lilitres, mesurats. Entra a la comparativa i calcula els litres que consumeix el teu mòbil per culpa d'anuncis que ningú no ha demanat." },
        /* 16 · capes: ombres i sol */ { title: "Ombres i sol", desc: "Ombres dibuixa l'ombra de cada edifici a l'hora que vulguis. Posició del sol et mostra on és al cel. I amb Irradiació solar toques un punt i veus quant sol rep a l'any." },
        /* 17 · capes: entorn */       { title: "Entorn i clima", desc: "Arbres suma la seva ombra al mapa. Núvols ensenya els de veritat. Qualitat de l'aire pinta com respira la teva zona a Espanya i Microclima estima quant canvia la calor d'un lloc a un altre." },
        /* 18 · capes: mapa base */    { title: "Mapa base", desc: "Canvia entre mapa clar, IGN o fosc. Edificis 3D aixeca la ciutat i Cadastre 3D afegeix les dades oficials del Cadastre." },
        /* 19 · capes: rutes */        { title: "Rutes i mobilitat", desc: "Ruta dibuixa el teu camí. Aquí també planifiques un viatge, cerques aparcament i enceses fonts d'aigua, carrils bici i transport públic amb les seves parades i horaris." }
      ]
    },
    eu: {
      next: "Hurrengoa",
      prev: "Aurrekoa",
      done: "Amaitu",
      progreso: "{{current}} / {{total}}",
      pasos: [
        /* 0 · hiria */        { title: "Hautatu zure hiria", desc: "Hemendik aldatzen duzu hiria eta bertan une honetan dagoen airea ikusten duzu." },
        /* 1 · moduak */       { title: "Nola kontatu?", desc: "Informazio bera, hainbat modutan azalduta. Aukeratu zuri ondoen datorkizuna." },
        /* 2 · aire mapa */    { title: "Airea, une honetan", desc: "Mapako puntu bakoitza benetako neurketa-estazioa da. Ukitu eta zer arnasten ari zaren kontatuko dizu." },
        /* 3 · grafikoa */     { title: "Airearen grafikoa", desc: "Pasatu hatza lerrotik eta ordua eta balio zehatza ikusiko dituzu. Zati jarraia dagoeneko neurtutakoa da eta etena datorrena." },
        /* 4 · ibilbidea */    { title: "Bilatu zure bidea itzalpean", desc: "Idatzi nondik zatozen eta nora zoazen, edo ukitu Nire kokapena. Manolit∞-k itzaletik eramaten zaitu beroa denean eta eguzkitik negu modua pizten baduzu." },
        /* 5 · 3D mapa */      { title: "3D mapa", desc: "Eraikinek ordu bakoitzean dagokien itzala egiten dute. Hurbildu, biratu eta mugitu eguneko ordua ikusteko. Eta ibiltzen hasten bazara, dagoeneko egindako bide-zatia gris bihurtzen da, Google Maps-en bezala." },
        /* 6 · planetarioa */  { title: "Planetarioa", desc: "Maparen azpian planetario txiki bat duzu. Lurra biratzen da eta eguzkia zein altueran dagoen ikusten duzu orduro. Mugitu ordua eta begiratu nola mugitzen diren itzalak." },
        /* 7 · lidar */        { title: "LiDAR bisorea", desc: "Planetarioaren azpian botoi bat dago LiDAR ereduak irekitzen dituena. Hiriaren benetako puntu-hodeiak dira, puntuz puntu. Trasteatu nahi dutenentzat." },
        /* 8 · geruzak */      { title: "Ireki geruzak", desc: "Geruzen botoiarekin panel hau irekitzen duzu. Hemendik mapan ikusten duzuna pizten eta itzaltzen duzu. Zatika erakutsiko dizkizut." },
        /* 9 · irradioa */     { title: "Leku bakoitzeko eguzkia", desc: "Eguzki-irradiazioa botoiarekin edozein puntu ukitu eta urtean zehar zenbat eguzki jasotzen duen ikusi dezakezu, NASAren datuekin." },
        /* 10 · zuhaitzak */   { title: "Zuhaitzak eta paseo birtuala", desc: "Piztu Zuhaitzak haien itzala ikusteko eta 3D paseo birtualarekin kaleetan zehar ibil zaitezke lehen pertsonan etxetik irten gabe." },
        /* 11 · txata */       { title: "Galdetu Manolit∞-ri", desc: "M∞ botoiak txata irekitzen du. Idatzi edo hitz egin mikroarekin eta ozenki erantzuten dizu." },
        /* 12 · datuak */      { title: "Zure datuak, zurekin", desc: "Sinkronizatu eta Esportatu atalean zure ezarpenak fitxategi batean eramaten dituzu eta beste gailu batera pasatzen. Konturik eta zerbitzaririk gabe." },
        /* 13 · ko-fi */       { title: "Babestu kausa", desc: "Manolit∞ doakoa da eta hala jarraituko du. Egunen batean gastuetan lagundu nahi baduzu, hemen duzu Ko-fi." },
        /* 14 · anaiak */      { title: "Manolit∞ren anai-arrebak", desc: "Hemen daude baita ere Manolit∞ Forestal eta Sevillako Bero-Uharteak, zaintza berarekin eginak." },
        /* 15 · ura */         { title: "Ikusi ez den ura", desc: "Hemen ikusiko duzu munduko iragarkiek gastatzen duten ura orrialde hau begira zauden bitartean. Zure bisitak 2 mililitro inguru gastatzen ditu, neurriak. Sartu konparatiban eta kalkulatu zure mugikorrak inork eskatu gabeko iragarriengatik gastatzen dituen litroak." },
        /* 16 · geruzak: itzalak eta eguzkia */ { title: "Itzalak eta eguzkia", desc: "Itzalak eraikin bakoitzaren itzala marrazten du nahi duzun orduan. Eguzkiaren posizioak zeruan non dagoen erakusten dizu. Eta Eguzki-irradiazioarekin puntu bat ukitu eta urtean zenbat eguzki jasotzen duen ikusiko duzu." },
        /* 17 · geruzak: ingurunea */           { title: "Ingurunea eta klima", desc: "Zuhaitzek beren itzala gehitzen diote mapari. Hodeiek benetakoak erakusten dituzte. Airearen kalitateak zure inguruak Espainian nola arnasten duen margotzen du eta Mikroklimak leku batetik bestera beroa zenbat aldatzen den kalkulatzen du." },
        /* 18 · geruzak: oinarrizko mapa */     { title: "Oinarrizko mapa", desc: "Aldatu mapa argia, IGN edo iluna artean. 3D eraikinek hiria altxatzen dute eta 3D katastroak Katastroaren datu ofizialak gehitzen ditu." },
        /* 19 · geruzak: ibilbideak */          { title: "Ibilbideak eta mugikortasuna", desc: "Ibilbideak zure bidea marrazten du. Hemen bidaia bat planifikatu, aparkalekua bilatu eta ur-iturriak, bizikleta-bideak eta garraio publikoa piztu ditzakezu, geltokiekin eta ordutegiekin." }
      ]
    },
    gl: {
      next: "Seguinte",
      prev: "Anterior",
      done: "Rematar",
      progreso: "{{current}} de {{total}}",
      pasos: [
        /* 0 · cidade */       { title: "Escolle a túa cidade", desc: "Desde aquí cambias de cidade e ves o aire que hai alí agora mesmo." },
        /* 1 · modos */        { title: "Como cho conto?", desc: "A mesma información explicada de varias maneiras. Escolle a que mellor che veña." },
        /* 2 · mapa aire */    { title: "O aire, agora mesmo", desc: "Cada punto do mapa é unha estación de medición de verdade. Tócao e cóntache o que estás a respirar." },
        /* 3 · gráfica */      { title: "A gráfica do aire", desc: "Pasa o dedo pola liña e verás a hora e o valor exactos. A parte continua é o xa medido e a descontinua é o que está por vir." },
        /* 4 · ruta */         { title: "Busca a túa ruta con sombra", desc: "Escribe de onde saes e a onde vas, ou toca A miña ubicación. Manolit∞ lévate pola sombra cando aperta a calor e polo sol se activas o modo inverno." },
        /* 5 · mapa 3D */      { title: "O mapa 3D", desc: "Os edificios botan a sombra que lles toca a cada hora. Achega, xira e move a hora do día para velo. E se te pós a camiñar, o anaco de ruta xa feito ponse gris, como en Google Maps." },
        /* 6 · planetario */   { title: "O planetario", desc: "Debaixo do mapa tes un planetario pequeno. A Terra xira e ves a que altura anda o sol a cada hora. Move a hora e mira como se moven as sombras." },
        /* 7 · lidar */        { title: "O visor LiDAR", desc: "Debaixo do planetario hai un botón que abre os modelos LiDAR. Son nubes de puntos reais da cidade, punto a punto. Para curiosos con ganas de trastear." },
        /* 8 · capas */        { title: "Abre as capas", desc: "Co botón de capas abres este panel. Desde aquí acendes e apagas o que ves no mapa. Ensínoas por partes." },
        /* 9 · irradiación */  { title: "O sol de cada sitio", desc: "Co botón Irradiación solar tocas calquera punto e ves canto sol recibe ao longo do ano, con datos da NASA." },
        /* 10 · árbores */     { title: "Árbores e paseo virtual", desc: "Activa Árbores para ver a súa sombra e co Paseo virtual 3D camiñas polas rúas en primeira persoa sen saír da casa." },
        /* 11 · chat */        { title: "Pregúntalle a Manolit∞", desc: "O botón M∞ abre o chat. Escríbelle ou fálalle polo micro e respóndeche en voz alta." },
        /* 12 · datos */       { title: "Os teus datos, contigo", desc: "En Sincronizar e Exportar levas os teus axustes nun ficheiro e pásasos a outro dispositivo. Sen contas e sen servidores." },
        /* 13 · ko-fi */       { title: "Apoia a causa", desc: "Manolit∞ é de balde e vai seguir a selo. Se algún día queres botar unha man cos gastos, aquí tes o Ko-fi." },
        /* 14 · irmáns */      { title: "Os irmáns de Manolit∞", desc: "Por aquí andan tamén Manolit∞ Forestal e Illas de Calor Sevilla, feitos co mesmo cariño." },
        /* 15 · auga */        { title: "A auga que non se ve", desc: "Aquí ves a auga que gastan os anuncios do mundo mentres miras esta páxina. A túa visita gasta uns 2 mililitros, medidos. Entra na comparativa e calcula os litros que consume o teu móbil por culpa de anuncios que ninguén pediu." },
        /* 16 · capas: sombras e sol */ { title: "Sombras e sol", desc: "Sombras debuxa a sombra de cada edificio á hora que queiras. Posición do sol móstrache onde está no ceo. E con Irradiación solar tocas un punto e ves canto sol recibe ao ano." },
        /* 17 · capas: contorno */      { title: "Contorno e clima", desc: "Árbores suma a súa sombra ao mapa. Nubes ensina as de verdade. Calidade do aire pinta como respira a túa zona en España e Microclima estima canto cambia a calor duns sitios a outros." },
        /* 18 · capas: mapa base */     { title: "Mapa base", desc: "Cambia entre mapa claro, IGN ou escuro. Edificios 3D levanta a cidade e Catastro 3D engade os datos oficiais do Catastro." },
        /* 19 · capas: rutas */         { title: "Rutas e mobilidade", desc: "Ruta debuxa o teu camiño. Aquí tamén planificas unha viaxe, buscas aparcadoiro e acendes fontes de auga, carrís bici e transporte público coas súas paradas e horarios." }
      ]
    },
    en: {
      next: "Next",
      prev: "Previous",
      done: "Done",
      progreso: "{{current}} of {{total}}",
      pasos: [
        /* 0 · city */         { title: "Choose your city", desc: "From here you switch city and see the air over there right now." },
        /* 1 · modes */        { title: "How should I tell you?", desc: "The same information explained in a few different ways. Pick the one that suits you best." },
        /* 2 · air map */      { title: "The air, right now", desc: "Every dot on the map is a real measuring station. Tap it and it tells you what you are breathing." },
        /* 3 · chart */        { title: "The air chart", desc: "Run your finger along the line and you will see the exact hour and value. The solid part is what was measured and the dashed part is what is on its way." },
        /* 4 · route */        { title: "Find your shady route", desc: "Type where you leave from and where you are going, or tap My location. Manolit∞ takes you through the shade when the heat is on and through the sun if you switch on winter mode." },
        /* 5 · 3D map */       { title: "The 3D map", desc: "Buildings cast the shadow that belongs to each hour. Zoom in, spin around and move the time of day to see it. And once you start walking, the part of the route you have already covered turns grey, just like in Google Maps." },
        /* 6 · planetarium */  { title: "The planetarium", desc: "Under the map you have a small planetarium. The Earth spins and you can see how high the sun is at every hour. Move the hour and watch how the shadows move." },
        /* 7 · lidar */        { title: "The LiDAR viewer", desc: "Below the planetarium there is a button that opens the LiDAR models. They are real point clouds of the city, point by point. For curious people who like to tinker." },
        /* 8 · layers */       { title: "Open the layers", desc: "The layers button opens this panel. From here you switch on and off what you see on the map. I'll show them part by part." },
        /* 9 · irradiation */  { title: "The sun of each place", desc: "With the Solar irradiation button you tap any point and see how much sun it gets through the year, with NASA data." },
        /* 10 · trees */       { title: "Trees and virtual walk", desc: "Switch on Trees to see their shade and with the 3D virtual walk you can stroll the streets first person without leaving home." },
        /* 11 · chat */        { title: "Ask Manolit∞", desc: "The M∞ button opens the chat. Write to it or talk through the mic and it answers out loud." },
        /* 12 · your data */   { title: "Your data, with you", desc: "In Sync and Export you take your settings in a file and move them to another device. No accounts and no servers." },
        /* 13 · ko-fi */       { title: "Support the cause", desc: "Manolit∞ is free and it will stay free. If one day you want to lend a hand with the costs, here is the Ko-fi." },
        /* 14 · siblings */    { title: "The Manolit∞ siblings", desc: "Around here you also have Manolit∞ Forestal and Seville Heat Islands, made with the same care." },
        /* 15 · water */       { title: "The water you cannot see", desc: "Here you can watch the water the world's ads are burning while you look at this page. Your visit spends about 2 millilitres, measured. Step into the comparison and work out the litres your phone burns because of ads nobody asked for." },
        /* 16 · layers: shadows and sun */ { title: "Shadows and sun", desc: "Shadows draws the shadow of every building at the hour you pick. Sun position shows where it sits in the sky. And with Solar irradiation you tap a spot and see how much sun it gets over the year." },
        /* 17 · layers: surroundings */    { title: "Surroundings and climate", desc: "Trees adds their shade to the map. Clouds shows the real ones. Air quality paints how your area breathes in Spain and Microclimate estimates how much the heat changes from one spot to the next." },
        /* 18 · layers: base map */        { title: "Base map", desc: "Switch between the light, IGN or dark map. 3D buildings raises the city and 3D cadastre adds the official cadastre data." },
        /* 19 · layers: routes */          { title: "Routes and mobility", desc: "Route draws your way. Here you also plan a trip, look for parking and switch on drinking fountains, bike lanes and public transport with their stops and timetables." }
      ]
    },
    ka: {
      next: "შემდეგი",
      prev: "წინა",
      done: "დასრულება",
      progreso: "{{current}} / {{total}}",
      pasos: [
        /* 0 · ქალაქი */       { title: "აირჩიე შენი ქალაქი", desc: "აქედან ცვლი ქალაქს და ხედავ, როგორი ჰაერია იქ ამ წუთას." },
        /* 1 · რეჟიმები */     { title: "როგორ მოგიყვე?", desc: "იგივე ინფორმაცია, რამდენიმეგვარად ახსნილი. აირჩიე შენთვის ყველაზე მოსახერხებელი." },
        /* 2 · ჰაერის რუკა */  { title: "ჰაერი, ამ წუთას", desc: "რუკაზე თითოეული წერტილი ნამდვილი საზომი სადგურია. შეეხე და გეტყვის, რას სუნთხავ." },
        /* 3 · გრაფიკა */      { title: "ჰაერის გრაფიკა", desc: "გადაატარე თითი ხაზს და ნახავ ზუსტ საათსა და მნიშვნელობას. უწყვეტი ნაწილი უკვე გაზომილია, წყვეტილი კი ის, რაც მოდის." },
        /* 4 · მარშრუტი */     { title: "იპოვე ჩრდილიანი გზა", desc: "ჩაწერე საიდან გადიხარ და სად მიდიხარ, ან დააჭირე ჩემს მდებარეობას. Manolit∞ სიცხეში ჩრდილით გიძღვება, ზამთრის რეჟიმის ჩართვისას კი მზით." },
        /* 5 · 3D რუკა */      { title: "3D რუკა", desc: "შენობები ყოველ საათზე შესაბამის ჩრდილს აგდებენ. მოაუარე, შეატრიალე და შეცვალე დღის დრო, რომ ნახო. როცა სიარულს იწყებ, უკვე გავლილი მარშრუტის ნაწილი ნაცრისფრად ეღერება, როგორც Google Maps-ში." },
        /* 6 · პლანეტარიუმი */ { title: "პლანეტარიუმი", desc: "რუკის ქვემოთ პატარა პლანეტარიუმი გაქვს. დედამიწა ტრიალებს და ხედავ, რა სიმაღლეზეა მზე ყოველ საათზე. შეცვალე საათი და უყურე, როგორ მოძრაობენ ჩრდილები." },
        /* 7 · lidar */        { title: "LiDAR საყურებელი", desc: "პლანეტარიუმის ქვემოთ ღილაკია, რომელიც LiDAR მოდელებს ხსნის. ეს ქალაქის ნამდვილი წერტილოვანი ღრუბლებია, წერტილ-წერტილ. ცნობისმოყვარეებისთვის." },
        /* 8 · ფენები */       { title: "გახსენი შრეები", desc: "შრეების ღილაკით ამ პანელს ხსნი. აქედან რთავ და ითიშავ იმას, რასაც რუკაზე ხედავ. ნაწილ-ნაწილ გაჩვენებ." },
        /* 9 · ინსოლაცია */    { title: "თითოეული ადგილის მზე", desc: "მზის ინსოლაციის ღილაკით შეეხე ნებისმიერ წერტილს და ნახავ, რამდენ მზეს იღებს ის წლის განმავლობაში, NASA-ს მონაცემებით." },
        /* 10 · ხეები */       { title: "ხეები და ვირტუალური გასეირნება", desc: "ჩართე ხეები მათი ჩრდილის სანახავად, 3D ვირტუალური გასეირნებით კი ქუჩებში პირველი პირის ხედით ისეირნე სახლიდან გაუსვლელად." },
        /* 11 · ჩატი */        { title: "ჰკითხე Manolit∞-ს", desc: "M∞ ღილაკი ჩატს ხსნის. დაუწერე ან ელაპარაკე მიკროფონით და ხმამაღლა გიპასუხებს." },
        /* 12 · მონაცემები */  { title: "შენი მონაცემები შენთან", desc: "სინქრონიზაცია და ექსპორტში შენს პარამეტრებს ფაილში იღებ და სხვა მოწყობილობაზე გადაგაქვს. ანგარიშებისა და სერვერების გარეშე." },
        /* 13 · ko-fi */       { title: "მხარი დაუჭირე საქმეს", desc: "Manolit∞ უფასოა და უფასოდ დარჩება. თუ როდესმე გინდა ხარჯებში ხელის შეწყობა, აქ არის Ko-fi." },
        /* 14 · ძმები */       { title: "Manolit∞-ს ძმები", desc: "აქვე არიან Manolit∞ Forestal და სევილიის სითბოს კუნძულები, იგივე ზრუნვით შექმნილი." },
        /* 15 · წყალი */       { title: "წყალი, რომელიც არ ჩანს", desc: "აქ ხედავ, რამდენ წყალს ხმარობს მსოფლიო რეკლამა, სანამ ამ გვერდს უყურებ. შენი ვიზიტი დაახლოებით 2 მილილიტრს ხმარობს, გაზომილი მნიშვნელობაა. შედი შედარებაში და დაითვალე, რამდენ ლიტრს წვავს შენი ტელეფონი არავის მოთხოვნილი რეკლამების გამო." },
        /* 16 · შრეები: ჩრდილები და მზე */ { title: "ჩრდილები და მზე", desc: "ჩრდილები ხაზავს ყოველი შენობის ჩრდილს შენთვის სასურველ საათზე. მზის პოზიცია გიჩვენებს, სად არის მზე ცაზე. მზის რადიაციით კი ნებისმიერ წერტილს შეეხები და ნახავ, წელიწადში რამდენ მზეს იღებს." },
        /* 17 · შრეები: გარემო */          { title: "გარემო და კლიმა", desc: "ხეები რუკას თავის ჩრდილს უმატებს. ღრუბლები ნამდვილ ღრუბლებს აჩვენებს. ჰაერის ხარისხი ესპანეთში შენი ადგილის ჰაერს ხატავს, მიკროკლიმა კი აფასებს, რამდენად იცვლება სიცხე ერთი ადგილიდან მეორემდე." },
        /* 18 · შრეები: საბაზისო რუკა */   { title: "საბაზისო რუკა", desc: "გადართე ღია, IGN ან მუქი რუკა. 3D შენობები ქალაქს ამაღლებს, 3D კადასტრი კი კადასტრის ოფიციალურ მონაცემებს ამატებს." },
        /* 19 · შრეები: მარშრუტები */      { title: "მარშრუტები და მობილობა", desc: "მარშრუტი შენს გზას ხაზავს. აქვე გეგმავ მოგზაურობას, ეძებ პარკინგს და რთავ სასმელი წყლის შადრევნებს, ველობილიკებს და საზოგადოებრივ ტრანსპორტს გაჩერებებითა და განრიგით." }
      ]
    },
    ar: {
      next: "التالي",
      prev: "السابق",
      done: "إنهاء",
      progreso: "{{current}} من {{total}}",
      pasos: [
        /* 0 · المدينة */      { title: "اختر مدينتك", desc: "من هنا تغيّر المدينة وتشاهد جودة الهواء فيها الآن." },
        /* 1 · الأنماط */      { title: "كيف تريد الشرح؟", desc: "نفس المعلومات لكن بعدة طرق. اختر الطريقة الأنسب لك." },
        /* 2 · خريطة الهواء */ { title: "الهواء الآن", desc: "كل نقطة على الخريطة محطة قياس حقيقية. المسها لتعرف ماذا تتنفس." },
        /* 3 · الرسم */        { title: "منحنى الهواء", desc: "مرر إصبعك على الخط لتظهر الساعة والقيمة الدقيقة. الجزء المتصل مقاس فعليًا والمتقطع لما سيأتي." },
        /* 4 · المسار */       { title: "ابحث عن مسارك المظلل", desc: "اكتب نقطة الانطلاق والوجهة أو اضغط موقعي. Manolit∞ يوجّهك عبر الظل عند الحر، أو عبر الشمس إذا فعّلت وضع الشتاء." },
        /* 5 · خريطة 3D */     { title: "الخريطة ثلاثية الأبعاد", desc: "المباني ترسم ظلها الحقيقي حسب الساعة. قرّب ودوّر وغيّر وقت اليوم لتراه. وعند بدء المشي يتحول الجزء الذي قطعته إلى الرمادي مثل Google Maps." },
        /* 6 · الكوكب */       { title: "القبة الفلكية", desc: "أسفل الخريطة توجد قبة فلكية صغيرة. تدور الأرض وترى ارتفاع الشمس كل ساعة. حرّك الوقت وراقب حركة الظلال." },
        /* 7 · lidar */        { title: "عارض LiDAR", desc: "أسفل القبة زر يفتح نماذج LiDAR. إنها سحب نقاط حقيقية للمدينة، نقطة بنقطة، لعشاق الاستكشاف." },
        /* 8 · الطبقات */      { title: "افتح الطبقات", desc: "بزر الطبقات تفتح هذه اللوحة. من هنا تشغّل وتطفئ ما تراه على الخريطة. سأريك إياها جزءًا جزءًا." },
        /* 9 · الإشعاع */      { title: "شمس كل مكان", desc: "بزر الإشعاع الشمسي المس أي نقطة لترى كمية الشمس التي تصلها طوال السنة ببيانات NASA." },
        /* 10 · الأشجار */     { title: "الأشجار والمشي الافتراضي", desc: "فعّل الأشجار لرؤية ظلها، ومع المشي الافتراضي ثلاثي الأبعاد يمكنك التجول في الشوارع من منظور الشخص الأول دون مغادرة البيت." },
        /* 11 · الدردشة */     { title: "اسأل Manolit∞", desc: "زر M∞ يفتح الدردشة. اكتب له أو تحدث عبر الميكروفون وسيجيبك بصوت مرتفع." },
        /* 12 · بياناتك */     { title: "بياناتك معك", desc: "في المزامنة والتصدير تحفظ إعداداتك في ملف وتنقلها إلى جهاز آخر. بلا حسابات وبلا خوادم." },
        /* 13 · ko-fi */       { title: "ادعم الفكرة", desc: "Manolit∞ مجاني وسيبقى مجانيًا. إذا رغبت يومًا في المساعدة بالمصاريف فهنا Ko-fi." },
        /* 14 · الأشقاء */     { title: "أشقاء Manolit∞", desc: "ستجد هنا أيضًا Manolit∞ Forestal وجزر حرارة إشبيلية، بنفس العناية." },
        /* 15 · الماء */       { title: "الماء غير المرئي", desc: "هنا ترى الماء الذي تستهلكه إعلانات العالم بينما تتصفح هذه الصفحة. زيارتك تستهلك نحو 2 ملليلتر فقط، بقياس فعلي. ادخل المقارنة واحسب كم لتر يستهلكه هاتفك بسبب إعلانات لم يطلبها أحد." },
        /* 16 · الطبقات: الظلال والشمس */ { title: "الظلال والشمس", desc: "الظلال ترسم ظل كل مبنى في الساعة التي تختارها. موضع الشمس يريك أين تقف في السماء. ومع الإشعاع الشمسي تلمس أي نقطة وترى كم شمسًا تتلقى على مدار السنة." },
        /* 17 · الطبقات: البيئة */        { title: "البيئة والمناخ", desc: "الأشجار تضيف ظلها إلى الخريطة. السحب تعرض السحب الحقيقية. جودة الهواء ترسم كيف يتنفس مكانك في إسبانيا، والمناخ المحلي يقدّر كم تتغير الحرارة من مكان إلى آخر." },
        /* 18 · الطبقات: الخريطة الأساسية */ { title: "الخريطة الأساسية", desc: "بدّل بين الخريطة الفاتحة وIGN والداكنة. المباني ثلاثية الأبعاد ترفع المدينة، والسجل العقاري ثلاثي الأبعاد يضيف بيانات السجل الرسمية." },
        /* 19 · الطبقات: المسارات */      { title: "المسارات والتنقل", desc: "المسار يرسم طريقك. وهنا أيضًا تخطط رحلة وتبحث عن موقف سيارات وتشغّل نوافير الشرب ومسارات الدراجات والنقل العام مع محطاته ومواعيده." }
      ]
    }
  };

  function idiomaActivo() {
    try {
      if (typeof window.getCurrentLang === "function") {
        const lang = window.getCurrentLang();
        if (TEXTOS[lang]) return lang;
      }
      const langHtml = document.documentElement.getAttribute("lang");
      if (langHtml && TEXTOS[langHtml.split("-")[0]]) return langHtml.split("-")[0];
      const langGuardado = localStorage.getItem("manolito_lang");
      if (langGuardado && TEXTOS[langGuardado]) return langGuardado;
    } catch (e) { /* sin idioma guardado se usa el español */ }
    return "es";
  }

  function obtenerTraducciones() {
    return TEXTOS[idiomaActivo()] || TEXTOS.es;
  }

  function yaVioElTutorial() {
    try { return localStorage.getItem(CLAVE_VISTO) === "true"; } catch (e) { return false; }
  }

  function marcarTutorialVisto() {
    try { localStorage.setItem(CLAVE_VISTO, "true"); } catch (e) { /* modo incógnito */ }
  }

  function cookiesAceptadas() {
    try { return localStorage.getItem("manolito_cookies_choice") === "accepted"; } catch (e) { return false; }
  }

  /* El orden del paseo sigue la posición REAL de cada cosa en la página, de
     arriba hacia abajo y sin volver atrás (antes el final saltaba de
     «Sincronizar» a Ko-fi y a la familia, y subía de golpe). Cada paso
     espera a que su destino exista y esté visible antes de avanzar, porque
     varias secciones se montan de forma diferida al hacer scroll.

     Las capas se explican con el panel ABIERTO y por secciones. Las
     secciones no tienen contenedor propio (son un título y sus filas), así
     que se destacan con un recuadro invisible («fantasma») calculado sobre
     ellas: no se toca ni se envuelve nada del panel real. */
  const DEFINICION_PASOS = [
    { sel: "#modeGrid", i: 1, side: "bottom", align: "start" },
    { sel: ".rs-form", i: 4, side: "bottom", align: "start" },
    { sel: "#shadowRouteMap", i: 5, side: "top", align: "center" },
    // Primero se abre el panel de capas y después se baja a Árboles y a las
    // secciones: el panel queda desplegado desde aquí hasta el planetario.
    { sel: "#rsPlanetarioCapas", i: 8, side: "left", align: "center", capas: true },
    { sel: "#rsMonteArboles", i: 10, side: "left", align: "center", capas: true },
    { seccion: 0, i: 16, side: "left", align: "center", capas: true },
    { seccion: 1, i: 17, side: "left", align: "center", capas: true },
    { seccion: 2, i: 18, side: "left", align: "center", capas: true },
    { seccion: 3, i: 19, side: "left", align: "center", capas: true },
    { sel: ".rs-planetario", i: 6, side: "top", align: "center" },
    { sel: ".rs-btn-lidar", i: 7, side: "top", align: "center" },
    { sel: "#cityDropdownBtn", i: 0, side: "bottom", align: "start" },
    { sel: "#map", i: 2, side: "top", align: "center" },
    { sel: "#airChart", i: 3, side: "top", align: "center" },
    { sel: ".chat-fab", i: 11, side: "left", align: "end" },
    { sel: "#ecoAgua", i: 15, side: "top", align: "center" },
    { sel: ".donacion-boton", i: 13, side: "top", align: "center" },
    { sel: ".footer-family", i: 14, side: "top", align: "center" },
    { sel: "#btnSyncExport", i: 12, side: "top", align: "center" }
  ];

  let pasosActivos = [];
  let capasAbiertasPorTutorial = false;
  let fantasma = null;
  let huboPasos = false;

  function panelCapas() { return document.getElementById("rsPlanetarioCapas"); }
  function panelCapasAbierto() {
    const panel = panelCapas();
    return !!panel && !panel.classList.contains("rs-capas-cerrada");
  }
  // Se abre y se cierra con el botón flotante de siempre: el estado, el
  // foco y los atributos aria los gobierna el mismo código que usa la gente.
  function abrirCapas() {
    if (panelCapasAbierto()) return;
    const boton = document.getElementById("rsBtnCapasFlotante");
    if (!boton) return;
    boton.click();
    capasAbiertasPorTutorial = true;
  }
  function cerrarCapas() {
    if (!capasAbiertasPorTutorial) return;
    capasAbiertasPorTutorial = false;
    if (panelCapasAbierto()) {
      const boton = document.getElementById("rsBtnCapasFlotante");
      if (boton) boton.click();
    }
  }

  function quitarFantasma() {
    if (fantasma) { fantasma.remove(); fantasma = null; }
  }

  function ancestroConScroll(el) {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const overflow = window.getComputedStyle(n).overflowY;
      if ((overflow === "auto" || overflow === "scroll") && n.scrollHeight > n.clientHeight + 1) return n;
    }
    return null;
  }

  // Un único div invisible (#rsTutoFantasma) que Driver destaca por
  // selector; aquí solo se le da el rectángulo que toca en cada paso.
  function ponerFantasma(x1, y1, x2, y2) {
    if (!fantasma || !fantasma.isConnected) {
      fantasma = document.createElement("div");
      fantasma.id = "rsTutoFantasma";
      fantasma.className = "rs-tuto-fantasma";
      fantasma.setAttribute("aria-hidden", "true");
      document.body.appendChild(fantasma);
    }
    fantasma.style.left = x1 + "px";
    fantasma.style.top = y1 + "px";
    fantasma.style.width = (x2 - x1) + "px";
    fantasma.style.height = (y2 - y1) + "px";
    return fantasma;
  }

  // Coloca el recuadro invisible sobre un título de sección y sus filas.
  // Si la lista tiene scroll propio, sube el título arriba y recorta el
  // recuadro a lo que de verdad se ve. Sin sección, cubre el panel entero.
  function colocarFantasma(indice) {
    const lista = document.getElementById("rsListaCapas");
    const titulo = lista && lista.querySelectorAll(".rs-capa-grupo-tit")[indice];
    const panel = panelCapas();
    if (!titulo) {
      if (!panel) return null;
      const r = panel.getBoundingClientRect();
      return ponerFantasma(r.left, r.top, r.right, r.bottom);
    }
    const nodos = [titulo];
    for (let n = titulo.nextElementSibling; n && !n.classList.contains("rs-capa-grupo-tit"); n = n.nextElementSibling) {
      if (!n.hidden && n.getClientRects().length) nodos.push(n);
    }
    const scroller = ancestroConScroll(titulo);
    if (scroller) {
      scroller.scrollTop += titulo.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 6;
    }
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    nodos.forEach((n) => {
      const r = n.getBoundingClientRect();
      x1 = Math.min(x1, r.left); y1 = Math.min(y1, r.top);
      x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom);
    });
    if (scroller) {
      const s = scroller.getBoundingClientRect();
      x1 = Math.max(x1, s.left); x2 = Math.min(x2, s.right);
      y1 = Math.max(y1, s.top); y2 = Math.min(y2, s.bottom);
    }
    if (!(x2 > x1 && y2 > y1)) {
      if (!panel) return null;
      const r = panel.getBoundingClientRect();
      return ponerFantasma(r.left, r.top, r.right, r.bottom);
    }
    return ponerFantasma(x1, y1, x2, y2);
  }

  // Deja la página en el estado que pide el paso (panel de capas abierto
  // solo en sus pasos, recuadro colocado) y devuelve el elemento a destacar.
  // Driver 1.3.1 no acepta funciones como destino, así que esto se llama
  // SIEMPRE justo antes de mostrar un paso (irAlPaso).
  function resolverElemento(def) {
    if (def.capas) abrirCapas(); else cerrarCapas();
    document.body.classList.toggle("tuto-capas", !!def.capas);
    // El recuadro de sección solo existe en sus pasos; en cualquier otro se
    // quita, o se quedaba su borde naranja flotando en los pasos siguientes.
    if (def.seccion == null) quitarFantasma();
    if (def.seccion != null) return colocarFantasma(def.seccion);
    const elemento = document.querySelector(def.sel);
    // Una fila suelta del panel (p. ej. Árboles) puede quedar fuera de la
    // parte visible de la lista: se centra dentro de su propio scroll.
    if (elemento && def.capas && def.sel !== "#rsPlanetarioCapas") {
      const scroller = ancestroConScroll(elemento);
      if (scroller) {
        const r = elemento.getBoundingClientRect();
        const s = scroller.getBoundingClientRect();
        scroller.scrollTop += (r.top - s.top) - (scroller.clientHeight - r.height) / 2;
      }
    }
    return elemento;
  }

  function irAlPaso(indice) {
    const def = pasosActivos[indice];
    if (!driverActivo || !def) return;
    resolverElemento(def);
    driverActivo.drive(indice);
  }

  function limpiarEstadoTutorial() {
    cerrarCapas();
    quitarFantasma();
    document.body.classList.remove("tuto-capas");
  }

  function construirPasos() {
    const p = obtenerTraducciones().pasos;
    pasosActivos = DEFINICION_PASOS.filter((d) => (d.seccion != null
      ? !!document.getElementById("rsListaCapas") && !!panelCapas()
      : !!document.querySelector(d.sel)));
    return pasosActivos.map((d) => ({
      element: d.seccion != null ? "#rsTutoFantasma" : d.sel,
      popover: { title: p[d.i].title, description: p[d.i].desc, side: d.side, align: d.align },
      // El panel de capas se anima al abrir: se recalcula el recuadro cuando acaba.
      onHighlighted: () => {
        if (!d.capas) return;
        window.setTimeout(() => {
          if (!driverActivo) return;
          if (d.seccion != null) colocarFantasma(d.seccion);
          if (typeof driverActivo.refresh === "function") driverActivo.refresh();
        }, 380);
      }
    }));
  }

  let driverActivo = null;
  let driverPromesa = null;
  let tutorialEnCurso = false;

  function obtenerFactoriaDriver() {
    if (typeof window.driver === "function") return window.driver;
    if (window.driver && typeof window.driver.driver === "function") return window.driver.driver;
    if (window.driver && window.driver.js && typeof window.driver.js.driver === "function") return window.driver.js.driver;
    return null;
  }

  /* driver.js solo se descarga cuando de verdad hace falta (primera
     visita o botón de ayuda). Las visitas de cada día se ahorran
     por completo esas peticiones y esos kilobytes. */
  function cargarDriver() {
    if (obtenerFactoriaDriver()) return Promise.resolve();
    if (driverPromesa) return driverPromesa;
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css";
    document.head.appendChild(css);
    driverPromesa = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.js.iife.js";
      s.onload = () => resolve();
      s.onerror = reject;
      document.body.appendChild(s);
    });
    return driverPromesa;
  }

  // forzar=true es para cuando alguien lo pide a mano (boton de ayuda,
  // pruebas...); el arranque automatico de la primera visita va sin forzar
  // y respeta el "solo sale una vez".
  function lanzarTutorial(forzar) {
    if (!forzar && yaVioElTutorial()) return;
    if (document.getElementById("manolitoSplash")) return;
    if (!cookiesAceptadas()) return;
    cargarDriver().then(() => lanzarTutorialConDriver(forzar)).catch(() => { /* sin red no hay tutorial, y no pasa nada */ });
  }

  // Al terminar o cerrar el paseo se vuelve solo al mapa principal (móvil y
  // escritorio). Se descuenta la cabecera fija para que no tape el título.
  function volverAlMapaPrincipal() {
    const seccion = document.getElementById("main-content") || document.getElementById("shadowRouteMap");
    if (!seccion) return;
    const cabecera = document.querySelector(".topbar");
    const alturaCabecera = cabecera ? cabecera.getBoundingClientRect().height : 0;
    const arriba = seccion.getBoundingClientRect().top + window.scrollY - alturaCabecera - 8;
    const sinMovimiento = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    window.scrollTo({ top: Math.max(0, arriba), behavior: sinMovimiento ? "auto" : "smooth" });
  }

  function configDriver(textos, pasos) {
    return {
      allowClose: true,
      smoothScroll: true,
      scrollIntoViewOptions: { behavior: "smooth", block: "center", inline: "nearest" },
      showButtons: ["next", "previous", "close"],
      showProgress: true,
      progressText: textos.progreso,
      nextBtnText: textos.next,
      prevBtnText: textos.prev,
      doneBtnText: textos.done,
      // Zona explicada más marcada: el resto se oscurece más y el hueco
      // lleva margen y esquinas redondeadas (estilo en css/style.css).
      popoverClass: "manolito-tour",
      overlayOpacity: 0.74,
      stagePadding: 10,
      stageRadius: 14,
      // Las flechas y Escape las gestiona este archivo (abajo): hay que
      // preparar el panel de capas ANTES de mostrar cada paso.
      allowKeyboardControl: false,
      steps: pasos,
      // Solo se vuelve al mapa si el paseo llegó a enseñar algún paso: si
      // Driver falla al arrancar, la página no debe moverse.
      onHighlightStarted: () => { huboPasos = true; },
      onNextClick: () => avanzarAlPasoVisible(1),
      onPrevClick: () => avanzarAlPasoVisible(-1),
      onDestroyed: () => {
        marcarTutorialVisto();
        limpiarEstadoTutorial();
        driverActivo = null;
        tutorialEnCurso = false;
        const volver = huboPasos;
        huboPasos = false;
        if (volver) window.requestAnimationFrame(volverAlMapaPrincipal);
      }
    };
  }

  // Si Driver falla a medias, puede dejar puesto el bloqueo de clics
  // (.driver-active) sin ninguna tarjeta que permita salir. Esto lo
  // deshace SIEMPRE: la web nunca debe quedarse sin responder.
  function liberarPaginaDeDriver() {
    try { if (driverActivo && typeof driverActivo.destroy === "function") driverActivo.destroy(); } catch (e) { /* ya destruido */ }
    document.querySelectorAll(".driver-overlay, .driver-popover").forEach((n) => n.remove());
    document.body.classList.remove("driver-active", "driver-fade", "driver-simple");
    document.querySelectorAll(".driver-active-element").forEach((n) => n.classList.remove("driver-active-element"));
  }

  function lanzarTutorialConDriver(forzar) {
    if (!forzar && yaVioElTutorial()) return;
    if (document.getElementById("manolitoSplash")) return;
    if (!cookiesAceptadas()) return;
    // El paseo puede arrancar por dos caminos a la vez (el cierre de la
    // intro y el observer propio); sin esta guarda saldrían dos paseos
    // montados uno encima de otro.
    if (driverActivo || tutorialEnCurso) return;
    const driverFactory = obtenerFactoriaDriver();
    if (!driverFactory) return;
    const textos = obtenerTraducciones();
    try {
      const pasos = construirPasos();
      if (!pasos.length) return;
      tutorialEnCurso = true;
      driverActivo = driverFactory(configDriver(textos, pasos));
      driverActivo.drive();
    } catch (e) {
      liberarPaginaDeDriver();
      driverActivo = null;
      tutorialEnCurso = false;
      limpiarEstadoTutorial();
      console.debug("[tutorial] No se pudo arrancar el paseo:", e);
      /* si driver falla, la web sigue funcionando igual */
    }
  }

  // Sitúa el destino a la vista sin saltos raros. En móvil la tarjeta del
  // tutorial ocupa la parte baja, así que lo que se explica sube a la zona
  // libre de arriba. Las capas viven dentro del mapa: solo hace falta que
  // el panel esté a la vista.
  function alinearEnPantalla(elemento, def) {
    const alto = window.innerHeight;
    if (def.capas) {
      const panel = panelCapas();
      if (!panel) return;
      const r = panel.getBoundingClientRect();
      if (r.top < 0 || r.bottom > alto) panel.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const r = elemento.getBoundingClientRect();
    const movil = window.matchMedia("(max-width: 600px)").matches;
    if (!movil || r.height > alto * 0.6) {
      elemento.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      return;
    }
    const libre = alto * 0.58;
    const arriba = Math.max(12, (libre - r.height) / 2);
    window.scrollBy({ top: r.top - arriba, behavior: "smooth" });
  }

  /* Los controles propios evitan que Driver.js avance a un objetivo
     desmontado/oculto mientras la página aún lo está creando al hacer scroll. */
  function avanzarAlPasoVisible(direccion) {
    if (!driverActivo) return;
    const pasos = pasosActivos;
    let indice = typeof driverActivo.getActiveIndex === "function" ? driverActivo.getActiveIndex() : 0;
    if (typeof indice !== "number") indice = 0;
    const nuevoIndice = indice + direccion;
    if (nuevoIndice < 0 || nuevoIndice >= pasos.length) {
      if (direccion > 0 && typeof driverActivo.destroy === "function") driverActivo.destroy();
      else if (typeof driverActivo.drive === "function") driverActivo.drive(0);
      return;
    }
    const def = pasos[nuevoIndice];
    const intentarAvance = (intento) => {
      if (!driverActivo) return;
      const elemento = resolverElemento(def);
      if (!elemento) {
        if (intento < 12) window.setTimeout(() => intentarAvance(intento + 1), 250);
        return;
      }
      const estilo = window.getComputedStyle(elemento);
      const visible = estilo.display !== "none" &&
        estilo.visibility !== "hidden" &&
        elemento.getClientRects().length > 0;
      if (!visible) {
        if (intento < 12) window.setTimeout(() => intentarAvance(intento + 1), 250);
        return;
      }
      alinearEnPantalla(elemento, def);
      window.setTimeout(() => {
        if (driverActivo && elemento.isConnected) irAlPaso(nuevoIndice);
      }, 350);
    };
    intentarAvance(0);
  }

  /* Arranque: solo si ya aceptaste las cookies y la intro ya pasó.
     Si el splash sigue puesto, se vigila con un observer hasta que
     desaparezca. (Arreglado sep-2026: antes el evento de cookies
     llamaba a una función mal escrita que no existía y ensuciaba
     la consola con un error rojo al aceptar las cookies.) */
  function verificarYArrancar() {
    if (yaVioElTutorial()) return;
    if (!document.getElementById("manolitoSplash") && cookiesAceptadas()) {
      setTimeout(lanzarTutorial, 500);
      return;
    }
    const observer = new MutationObserver(() => {
      if (!document.getElementById("manolitoSplash") && cookiesAceptadas()) {
        observer.disconnect();
        setTimeout(lanzarTutorial, 500);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Teclado del paseo: flechas para avanzar y retroceder, Escape para salir.
  document.addEventListener("keydown", (ev) => {
    if (!driverActivo || ev.defaultPrevented) return;
    if (ev.target && ev.target.closest && ev.target.closest("input, textarea, select")) return;
    if (ev.key === "Escape") {
      driverActivo.destroy();
    } else if (ev.key === "ArrowRight") {
      ev.preventDefault();
      avanzarAlPasoVisible(1);
    } else if (ev.key === "ArrowLeft") {
      ev.preventDefault();
      avanzarAlPasoVisible(-1);
    }
  });

  // Si cambias de idioma con el tutorial abierto, se rehace al momento.
  document.addEventListener("langChanged", () => {
    if (!driverActivo) return;
    const textos = obtenerTraducciones();
    driverActivo.setConfig(configDriver(textos, construirPasos()));
    try {
      const indice = typeof driverActivo.getActiveIndex === "function" ? driverActivo.getActiveIndex() : 0;
      if (typeof indice === "number") irAlPaso(indice);
    } catch (e) { /* se queda en el paso en el que estaba */ }
  });

  // La web llama a esto sola en la primera visita (sin argumentos, respeta
  // el "solo sale una vez"). Con true lo fuerzas aunque ya se haya visto.
  window.iniciarTutorialManolito = function (forzar) {
    lanzarTutorial(forzar === true);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", verificarYArrancar);
  } else {
    verificarYArrancar();
  }

  document.addEventListener("cookiesAceptadas", () => {
    verificarYArrancar();
  });

})();
