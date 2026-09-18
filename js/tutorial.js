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
      pasos: [
        /* 0 · ciudad */       { title: "Elige tu ciudad", desc: "Desde aquí cambias de ciudad y ves el aire que hace allí ahora mismo." },
        /* 1 · modos */        { title: "¿Cómo te lo cuento?", desc: "La misma información explicada de varias maneras. Elige la que mejor te venga." },
        /* 2 · mapa aire */    { title: "El aire, ahora mismo", desc: "Cada punto del mapa es una estación de medición de verdad. Tócalo y te cuenta lo que estás respirando." },
        /* 3 · gráfica */      { title: "La gráfica del aire", desc: "Pasa el dedo por la línea y verás la hora y el valor exactos. La parte continua es lo ya medido y la discontinua es lo que está por venir." },
        /* 4 · ruta */         { title: "Busca tu ruta con sombra", desc: "Escribe de dónde sales y a dónde vas, o toca Mi ubicación. Manolit∞ te lleva por la sombra cuando aprieta el calor y por el sol si activas el modo invierno." },
        /* 5 · mapa 3D */      { title: "El mapa 3D", desc: "Los edificios echan la sombra que les toca a cada hora. Acerca, gira y mueve la hora del día para verlo. Y si te pones a caminar, el trozo de ruta ya andado se pone gris, como en Google Maps." },
        /* 6 · planetario */   { title: "El planetario", desc: "Debajo del mapa tienes un planetario pequeño. La Tierra gira y ves a qué altura anda el sol a cada hora. Mueve la hora y mira cómo se mueven las sombras." },
        /* 7 · lidar */        { title: "El visor LiDAR", desc: "Bajo el planetario hay un botón que abre los modelos LiDAR. Son nubes de puntos reales de la ciudad, punto a punto. Para curiosos con ganas de trastear." },
        /* 8 · capas */        { title: "Las capas", desc: "Aquí enciendes o apagas edificios, sombras, ruta y sol. Con el botón Capas de mapa cambias el estilo del mapa base." },
        /* 9 · irradiación */  { title: "El sol de cada sitio", desc: "Con el botón Irradiación solar tocas cualquier punto y ves cuánto sol recibe a lo largo del año, con datos de la NASA." },
        /* 10 · árboles */     { title: "Árboles y paseo virtual", desc: "Activa Árboles para ver su sombra y con el Paseo virtual 3D caminas por las calles en primera persona sin salir de casa." },
        /* 11 · chat */        { title: "Pregúntale a Manolit∞", desc: "El botón M∞ abre el chat. Escríbele o háblale por el micro y te responde en voz alta." },
        /* 12 · tus datos */   { title: "Tus datos, contigo", desc: "En Sincronizar y Exportar te llevas tus ajustes en un archivo y los pasas a otro dispositivo. Sin cuentas y sin servidores." },
        /* 13 · ko-fi */       { title: "Apoya la causa", desc: "Manolit∞ es gratis y lo seguirá siendo. Si algún día quieres echar una mano con los gastos, aquí está el Ko-fi." },
        /* 14 · hermanos */    { title: "Los hermanos de Manolit∞", desc: "Por aquí andan también Manolit∞ Forestal e Islas de Calor Sevilla, hechos con el mismo cariño." },
        /* 15 · agua */        { title: "El agua que no se ve", desc: "Aquí ves el agua que gastan los anuncios del mundo mientras miras esta página. Tu visita gasta unos 2 mililitros, medidos. Entra en la comparativa y calcula los litros que consume tu móvil por culpa de anuncios que nadie pidió." }
      ]
    },
    ca: {
      next: "Següent",
      prev: "Anterior",
      done: "Finalitzar",
      pasos: [
        /* 0 · ciutat */       { title: "Escull la teva ciutat", desc: "Des d'aquí canvies de ciutat i veus l'aire que hi fa ara mateix." },
        /* 1 · maneres */      { title: "Com t'ho explico?", desc: "La mateixa informació explicada de diverses maneres. Tria la que millor et vagi." },
        /* 2 · mapa aire */    { title: "L'aire, ara mateix", desc: "Cada punt del mapa és una estació de mesura de veritat. Toca'l i t'explica què estàs respirant." },
        /* 3 · gràfica */      { title: "La gràfica de l'aire", desc: "Passa el dit per la línia i veuràs l'hora i el valor exactes. La part contínua és el ja mesurat i la discontínua és el que està per venir." },
        /* 4 · ruta */         { title: "Cerca la teva ruta amb ombra", desc: "Escriu d'on surts i on vas, o toca La meva ubicació. Manolit∞ et porta per l'ombra quan apreta la calor i pel sol si actives el mode hivern." },
        /* 5 · mapa 3D */      { title: "El mapa 3D", desc: "Els edificis fan l'ombra que els toca a cada hora. Apropa, gira i mou l'hora del dia per veure-ho. I si et poses a caminar, el tros de ruta ja fet es posa gris, com a Google Maps." },
        /* 6 · planetari */    { title: "El planetari", desc: "Sota el mapa tens un planetari petit. La Terra gira i veus a quina alçada va el sol a cada hora. Mou l'hora i mira com es mouen les ombres." },
        /* 7 · lidar */        { title: "El visor LiDAR", desc: "Sota el planetari hi ha un botó que obre els models LiDAR. Són núvols de punts reals de la ciutat, punt a punt. Per a curiosos amb ganes de trastejar." },
        /* 8 · capes */        { title: "Les capes", desc: "Aquí engegues o apagues edificis, ombres, ruta i sol. Amb el botó Capes de mapa canvies l'estil del mapa base." },
        /* 9 · irradiació */   { title: "El sol de cada lloc", desc: "Amb el botó Irradiació solar toques qualsevol punt i veus quant sol rep al llarg de l'any, amb dades de la NASA." },
        /* 10 · arbres */      { title: "Arbres i passeig virtual", desc: "Activa Arbres per veure la seva ombra i amb el Passeig virtual 3D camines pels carrers en primera persona sense sortir de casa." },
        /* 11 · xat */         { title: "Pregunta a Manolit∞", desc: "El botó M∞ obre el xat. Escriu-li o parla-li pel micro i et respon en veu alta." },
        /* 12 · dades */       { title: "Les teves dades, amb tu", desc: "A Sincronitzar i Exportar t'emportes els ajustos en un fitxer i els passes a un altre dispositiu. Sense comptes i sense servidors." },
        /* 13 · ko-fi */       { title: "Dona suport a la causa", desc: "Manolit∞ és gratis i ho seguirà sent. Si algun dia vols donar un cop de mà amb les despeses, aquí tens el Ko-fi." },
        /* 14 · germans */     { title: "Els germans de Manolit∞", desc: "Per aquí també hi ha Manolit∞ Forestal i Illes de Calor Sevilla, fets amb la mateixa cura." },
        /* 15 · aigua */       { title: "L'aigua que no es veu", desc: "Aquí veus l'aigua que gasten els anuncis del món mentre mires aquesta pàgina. La teva visita en gasta uns 2 mil·lilitres, mesurats. Entra a la comparativa i calcula els litres que consumeix el teu mòbil per culpa d'anuncis que ningú no ha demanat." }
      ]
    },
    eu: {
      next: "Hurrengoa",
      prev: "Aurrekoa",
      done: "Amaitu",
      pasos: [
        /* 0 · hiria */        { title: "Hautatu zure hiria", desc: "Hemendik aldatzen duzu hiria eta bertan une honetan dagoen airea ikusten duzu." },
        /* 1 · moduak */       { title: "Nola kontatu?", desc: "Informazio bera, hainbat modutan azalduta. Aukeratu zuri ondoen datorkizuna." },
        /* 2 · aire mapa */    { title: "Airea, une honetan", desc: "Mapako puntu bakoitza benetako neurketa-estazioa da. Ukitu eta zer arnasten ari zaren kontatuko dizu." },
        /* 3 · grafikoa */     { title: "Airearen grafikoa", desc: "Pasatu hatza lerrotik eta ordua eta balio zehatza ikusiko dituzu. Zati jarraia dagoeneko neurtutakoa da eta etena datorrena." },
        /* 4 · ibilbidea */    { title: "Bilatu zure bidea itzalpean", desc: "Idatzi nondik zatozen eta nora zoazen, edo ukitu Nire kokapena. Manolit∞-k itzaletik eramaten zaitu beroa denean eta eguzkitik negu modua pizten baduzu." },
        /* 5 · 3D mapa */      { title: "3D mapa", desc: "Eraikinek ordu bakoitzean dagokien itzala egiten dute. Hurbildu, biratu eta mugitu eguneko ordua ikusteko. Eta ibiltzen hasten bazara, dagoeneko egindako bide-zatia gris bihurtzen da, Google Maps-en bezala." },
        /* 6 · planetarioa */  { title: "Planetarioa", desc: "Maparen azpian planetario txiki bat duzu. Lurra biratzen da eta eguzkia zein altueran dagoen ikusten duzu orduro. Mugitu ordua eta begiratu nola mugitzen diren itzalak." },
        /* 7 · lidar */        { title: "LiDAR bisorea", desc: "Planetarioaren azpian botoi bat dago LiDAR ereduak irekitzen dituena. Hiriaren benetako puntu-hodeiak dira, puntuz puntu. Trasteatu nahi dutenentzat." },
        /* 8 · geruzak */      { title: "Geruzak", desc: "Hemen pizten edo itzaltzen dituzu eraikinak, itzalak, ibilbidea eta eguzkia. Mapa geruzak botoiarekin oinarrizko maparen estiloa aldatzen duzu." },
        /* 9 · irradioa */     { title: "Leku bakoitzeko eguzkia", desc: "Eguzki-irradiazioa botoiarekin edozein puntu ukitu eta urtean zehar zenbat eguzki jasotzen duen ikusi dezakezu, NASAren datuekin." },
        /* 10 · zuhaitzak */   { title: "Zuhaitzak eta paseo birtuala", desc: "Piztu Zuhaitzak haien itzala ikusteko eta 3D paseo birtualarekin kaleetan zehar ibil zaitezke lehen pertsonan etxetik irten gabe." },
        /* 11 · txata */       { title: "Galdetu Manolit∞-ri", desc: "M∞ botoiak txata irekitzen du. Idatzi edo hitz egin mikroarekin eta ozenki erantzuten dizu." },
        /* 12 · datuak */      { title: "Zure datuak, zurekin", desc: "Sinkronizatu eta Esportatu atalean zure ezarpenak fitxategi batean eramaten dituzu eta beste gailu batera pasatzen. Konturik eta zerbitzaririk gabe." },
        /* 13 · ko-fi */       { title: "Babestu kausa", desc: "Manolit∞ doakoa da eta hala jarraituko du. Egunen batean gastuetan lagundu nahi baduzu, hemen duzu Ko-fi." },
        /* 14 · anaiak */      { title: "Manolit∞ren anai-arrebak", desc: "Hemen daude baita ere Manolit∞ Forestal eta Sevillako Bero-Uharteak, zaintza berarekin eginak." },
        /* 15 · ura */         { title: "Ikusi ez den ura", desc: "Hemen ikusiko duzu munduko iragarkiek gastatzen duten ura orrialde hau begira zauden bitartean. Zure bisitak 2 mililitro inguru gastatzen ditu, neurriak. Sartu konparatiban eta kalkulatu zure mugikorrak inork eskatu gabeko iragarriengatik gastatzen dituen litroak." }
      ]
    },
    gl: {
      next: "Seguinte",
      prev: "Anterior",
      done: "Rematar",
      pasos: [
        /* 0 · cidade */       { title: "Escolle a túa cidade", desc: "Desde aquí cambias de cidade e ves o aire que hai alí agora mesmo." },
        /* 1 · modos */        { title: "Como cho conto?", desc: "A mesma información explicada de varias maneiras. Escolle a que mellor che veña." },
        /* 2 · mapa aire */    { title: "O aire, agora mesmo", desc: "Cada punto do mapa é unha estación de medición de verdade. Tócao e cóntache o que estás a respirar." },
        /* 3 · gráfica */      { title: "A gráfica do aire", desc: "Pasa o dedo pola liña e verás a hora e o valor exactos. A parte continua é o xa medido e a descontinua é o que está por vir." },
        /* 4 · ruta */         { title: "Busca a túa ruta con sombra", desc: "Escribe de onde saes e a onde vas, ou toca A miña ubicación. Manolit∞ lévate pola sombra cando aperta a calor e polo sol se activas o modo inverno." },
        /* 5 · mapa 3D */      { title: "O mapa 3D", desc: "Os edificios botan a sombra que lles toca a cada hora. Achega, xira e move a hora do día para velo. E se te pós a camiñar, o anaco de ruta xa feito ponse gris, como en Google Maps." },
        /* 6 · planetario */   { title: "O planetario", desc: "Debaixo do mapa tes un planetario pequeno. A Terra xira e ves a que altura anda o sol a cada hora. Move a hora e mira como se moven as sombras." },
        /* 7 · lidar */        { title: "O visor LiDAR", desc: "Debaixo do planetario hai un botón que abre os modelos LiDAR. Son nubes de puntos reais da cidade, punto a punto. Para curiosos con ganas de trastear." },
        /* 8 · capas */        { title: "As capas", desc: "Aquí acendes ou apagas edificios, sombras, ruta e sol. Co botón Capas de mapa cambias o estilo do mapa base." },
        /* 9 · irradiación */  { title: "O sol de cada sitio", desc: "Co botón Irradiación solar tocas calquera punto e ves canto sol recibe ao longo do ano, con datos da NASA." },
        /* 10 · árbores */     { title: "Árbores e paseo virtual", desc: "Activa Árbores para ver a súa sombra e co Paseo virtual 3D camiñas polas rúas en primeira persoa sen saír da casa." },
        /* 11 · chat */        { title: "Pregúntalle a Manolit∞", desc: "O botón M∞ abre o chat. Escríbelle ou fálalle polo micro e respóndeche en voz alta." },
        /* 12 · datos */       { title: "Os teus datos, contigo", desc: "En Sincronizar e Exportar levas os teus axustes nun ficheiro e pásasos a outro dispositivo. Sen contas e sen servidores." },
        /* 13 · ko-fi */       { title: "Apoia a causa", desc: "Manolit∞ é de balde e vai seguir a selo. Se algún día queres botar unha man cos gastos, aquí tes o Ko-fi." },
        /* 14 · irmáns */      { title: "Os irmáns de Manolit∞", desc: "Por aquí andan tamén Manolit∞ Forestal e Illas de Calor Sevilla, feitos co mesmo cariño." },
        /* 15 · auga */        { title: "A auga que non se ve", desc: "Aquí ves a auga que gastan os anuncios do mundo mentres miras esta páxina. A túa visita gasta uns 2 mililitros, medidos. Entra na comparativa e calcula os litros que consume o teu móbil por culpa de anuncios que ninguén pediu." }
      ]
    },
    en: {
      next: "Next",
      prev: "Previous",
      done: "Done",
      pasos: [
        /* 0 · city */         { title: "Choose your city", desc: "From here you switch city and see the air over there right now." },
        /* 1 · modes */        { title: "How should I tell you?", desc: "The same information explained in a few different ways. Pick the one that suits you best." },
        /* 2 · air map */      { title: "The air, right now", desc: "Every dot on the map is a real measuring station. Tap it and it tells you what you are breathing." },
        /* 3 · chart */        { title: "The air chart", desc: "Run your finger along the line and you will see the exact hour and value. The solid part is what was measured and the dashed part is what is on its way." },
        /* 4 · route */        { title: "Find your shady route", desc: "Type where you leave from and where you are going, or tap My location. Manolit∞ takes you through the shade when the heat is on and through the sun if you switch on winter mode." },
        /* 5 · 3D map */       { title: "The 3D map", desc: "Buildings cast the shadow that belongs to each hour. Zoom in, spin around and move the time of day to see it. And once you start walking, the part of the route you have already covered turns grey, just like in Google Maps." },
        /* 6 · planetarium */  { title: "The planetarium", desc: "Under the map you have a small planetarium. The Earth spins and you can see how high the sun is at every hour. Move the hour and watch how the shadows move." },
        /* 7 · lidar */        { title: "The LiDAR viewer", desc: "Below the planetarium there is a button that opens the LiDAR models. They are real point clouds of the city, point by point. For curious people who like to tinker." },
        /* 8 · layers */       { title: "The layers", desc: "Here you switch buildings, shadows, route and sun on or off. With the Map layers button you change the base map style." },
        /* 9 · irradiation */  { title: "The sun of each place", desc: "With the Solar irradiation button you tap any point and see how much sun it gets through the year, with NASA data." },
        /* 10 · trees */       { title: "Trees and virtual walk", desc: "Switch on Trees to see their shade and with the 3D virtual walk you can stroll the streets first person without leaving home." },
        /* 11 · chat */        { title: "Ask Manolit∞", desc: "The M∞ button opens the chat. Write to it or talk through the mic and it answers out loud." },
        /* 12 · your data */   { title: "Your data, with you", desc: "In Sync and Export you take your settings in a file and move them to another device. No accounts and no servers." },
        /* 13 · ko-fi */       { title: "Support the cause", desc: "Manolit∞ is free and it will stay free. If one day you want to lend a hand with the costs, here is the Ko-fi." },
        /* 14 · siblings */    { title: "The Manolit∞ siblings", desc: "Around here you also have Manolit∞ Forestal and Seville Heat Islands, made with the same care." },
        /* 15 · water */       { title: "The water you cannot see", desc: "Here you can watch the water the world's ads are burning while you look at this page. Your visit spends about 2 millilitres, measured. Step into the comparison and work out the litres your phone burns because of ads nobody asked for." }
      ]
    },
    ka: {
      next: "შემდეგი",
      prev: "წინა",
      done: "დასრულება",
      pasos: [
        /* 0 · ქალაქი */       { title: "აირჩიე შენი ქალაქი", desc: "აქედან ცვლი ქალაქს და ხედავ, როგორი ჰაერია იქ ამ წუთას." },
        /* 1 · რეჟიმები */     { title: "როგორ მოგიყვე?", desc: "იგივე ინფორმაცია, რამდენიმეგვარად ახსნილი. აირჩიე შენთვის ყველაზე მოსახერხებელი." },
        /* 2 · ჰაერის რუკა */  { title: "ჰაერი, ამ წუთას", desc: "რუკაზე თითოეული წერტილი ნამდვილი საზომი სადგურია. შეეხე და გეტყვის, რას სუნთხავ." },
        /* 3 · გრაფიკა */      { title: "ჰაერის გრაფიკა", desc: "გადაატარე თითი ხაზს და ნახავ ზუსტ საათსა და მნიშვნელობას. უწყვეტი ნაწილი უკვე გაზომილია, წყვეტილი კი ის, რაც მოდის." },
        /* 4 · მარშრუტი */     { title: "იპოვე ჩრდილიანი გზა", desc: "ჩაწერე საიდან გადიხარ და სად მიდიხარ, ან დააჭირე ჩემს მდებარეობას. Manolit∞ სიცხეში ჩრდილით გიძღვება, ზამთრის რეჟიმის ჩართვისას კი მზით." },
        /* 5 · 3D რუკა */      { title: "3D რუკა", desc: "შენობები ყოველ საათზე შესაბამის ჩრდილს აგდებენ. მოაუარე, შეატრიალე და შეცვალე დღის დრო, რომ ნახო. როცა სიარულს იწყებ, უკვე გავლილი მარშრუტის ნაწილი ნაცრისფრად ეღერება, როგორც Google Maps-ში." },
        /* 6 · პლანეტარიუმი */ { title: "პლანეტარიუმი", desc: "რუკის ქვემოთ პატარა პლანეტარიუმი გაქვს. დედამიწა ტრიალებს და ხედავ, რა სიმაღლეზეა მზე ყოველ საათზე. შეცვალე საათი და უყურე, როგორ მოძრაობენ ჩრდილები." },
        /* 7 · lidar */        { title: "LiDAR საყურებელი", desc: "პლანეტარიუმის ქვემოთ ღილაკია, რომელიც LiDAR მოდელებს ხსნის. ეს ქალაქის ნამდვილი წერტილოვანი ღრუბლებია, წერტილ-წერტილ. ცნობისმოყვარეებისთვის." },
        /* 8 · ფენები */       { title: "ფენები", desc: "აქ რთავ ან თიშავ შენობებს, ჩრდილებს, მარშრუტსა და მზეს. რუკის ფენების ღილაკით ცვლი საბაზისო რუკის სტილს." },
        /* 9 · ინსოლაცია */    { title: "თითოეული ადგილის მზე", desc: "მზის ინსოლაციის ღილაკით შეეხე ნებისმიერ წერტილს და ნახავ, რამდენ მზეს იღებს ის წლის განმავლობაში, NASA-ს მონაცემებით." },
        /* 10 · ხეები */       { title: "ხეები და ვირტუალური გასეირნება", desc: "ჩართე ხეები მათი ჩრდილის სანახავად, 3D ვირტუალური გასეირნებით კი ქუჩებში პირველი პირის ხედით ისეირნე სახლიდან გაუსვლელად." },
        /* 11 · ჩატი */        { title: "ჰკითხე Manolit∞-ს", desc: "M∞ ღილაკი ჩატს ხსნის. დაუწერე ან ელაპარაკე მიკროფონით და ხმამაღლა გიპასუხებს." },
        /* 12 · მონაცემები */  { title: "შენი მონაცემები შენთან", desc: "სინქრონიზაცია და ექსპორტში შენს პარამეტრებს ფაილში იღებ და სხვა მოწყობილობაზე გადაგაქვს. ანგარიშებისა და სერვერების გარეშე." },
        /* 13 · ko-fi */       { title: "მხარი დაუჭირე საქმეს", desc: "Manolit∞ უფასოა და უფასოდ დარჩება. თუ როდესმე გინდა ხარჯებში ხელის შეწყობა, აქ არის Ko-fi." },
        /* 14 · ძმები */       { title: "Manolit∞-ს ძმები", desc: "აქვე არიან Manolit∞ Forestal და სევილიის სითბოს კუნძულები, იგივე ზრუნვით შექმნილი." },
        /* 15 · წყალი */       { title: "წყალი, რომელიც არ ჩანს", desc: "აქ ხედავ, რამდენ წყალს ხმარობს მსოფლიო რეკლამა, სანამ ამ გვერდს უყურებ. შენი ვიზიტი დაახლოებით 2 მილილიტრს ხმარობს, გაზომილი მნიშვნელობაა. შედი შედარებაში და დაითვალე, რამდენ ლიტრს წვავს შენი ტელეფონი არავის მოთხოვნილი რეკლამების გამო." }
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

  /* El orden del paseo sigue el recorrido natural por la página:
     primero la ruta y su mapa 3D, luego el aire y su gráfica, y al
     final lo común de la casa (el agua de los anuncios, el chat, tus
     datos, el Ko-fi y los proyectos hermanos). El paso del agua
     señala la sección «El agua que no se ve», desde donde se entra
     a la comparativa para calcular los litros que gasta un móvil
     por culpa de los anuncios que nadie pidió. */
  function construirPasos() {
    const p = obtenerTraducciones().pasos;
    const paso = (element, indice, side, align) => ({
      element,
      popover: { title: p[indice].title, description: p[indice].desc, side, align }
    });
    return [
      paso(".rs-form", 4, "bottom", "start"),
      paso("#shadowRouteMap", 5, "top", "center"),
      paso(".rs-layer-toggles", 8, "top", "center"),
      paso("#shadowRouteMap", 9, "top", "center"),
      paso("#shadowRouteMap", 10, "top", "center"),
      paso(".rs-planetario", 6, "top", "center"),
      paso(".rs-btn-lidar", 7, "top", "center"),
      paso("#cityDropdownBtn", 0, "bottom", "start"),
      paso("#modeGrid", 1, "top", "start"),
      paso("#map", 2, "top", "center"),
      paso("#airChart", 3, "top", "center"),
      paso("#ecoAgua", 15, "top", "center"),
      paso(".chat-fab", 11, "left", "end"),
      paso("#btnSyncExport", 12, "top", "center"),
      paso(".donacion-boton", 13, "top", "center"),
      paso(".footer-family", 14, "top", "center")
      // Si algún elemento no está en la página (por ejemplo un HTML
      // viejo servido desde caché), ese paso se salta y el paseo
      // sigue como si nada.
    ].filter((s) => !s.element || document.querySelector(s.element));
  }

  let driverActivo = null;
  let driverPromesa = null;

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

  function lanzarTutorialConDriver(forzar) {
    if (!forzar && yaVioElTutorial()) return;
    if (document.getElementById("manolitoSplash")) return;
    if (!cookiesAceptadas()) return;
    // El paseo puede arrancar por dos caminos a la vez (el cierre de la
    // intro y el observer propio); sin esta guarda saldrían dos paseos
    // montados uno encima de otro.
    if (driverActivo) return;
    const driverFactory = obtenerFactoriaDriver();
    if (!driverFactory) return;
    // Aviso al cargador perezoso del mapa (index.html): el tutorial enseña
    // los controles del mapa, así que el motor 3D tiene que nacer ya aunque
    // la sección no haya estado visible 1 segundo.
    try { window.dispatchEvent(new Event('manolit:iniciar-tutorial')); } catch (e) { /* navegador antiguo: el mapa cargará por el observer */ }
    const textos = obtenerTraducciones();
    try {
      driverActivo = driverFactory({
        allowClose: true,
        showButtons: ["next", "previous", "close"],
        showProgress: true,
        nextBtnText: textos.next,
        prevBtnText: textos.prev,
        doneBtnText: textos.done,
        steps: construirPasos(),
        onDestroyed: () => {
          marcarTutorialVisto();
          driverActivo = null;
        }
      });
      driverActivo.drive();
    } catch (e) { /* si driver falla, la web sigue funcionando igual */ }
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

  // Si cambias de idioma con el tutorial abierto, se rehace al momento.
  document.addEventListener("langChanged", () => {
    if (!driverActivo) return;
    const textos = obtenerTraducciones();
    driverActivo.setConfig({
      allowClose: true,
      showProgress: true,
      nextBtnText: textos.next,
      prevBtnText: textos.prev,
      doneBtnText: textos.done,
      steps: construirPasos(),
      onDestroyed: () => {
        marcarTutorialVisto();
        driverActivo = null;
      }
    });
    try {
      const indice = typeof driverActivo.getActiveIndex === "function" ? driverActivo.getActiveIndex() : 0;
      if (typeof indice === "number" && typeof driverActivo.drive === "function") driverActivo.drive(indice);
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
