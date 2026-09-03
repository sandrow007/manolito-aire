"use strict";
! function() {
	const e = "tutorial_visto",
		a = {
			es: {
				next: "Siguiente",
				prev: "Anterior",
				done: "Finalizar",
				pasos: [{
					title: "Elige tu ciudad",
					desc: "Cambia aquí la ciudad para ver su aire en tiempo real."
				}, {
					title: "¿Cómo quieres que te lo cuente?",
					desc: "Elige el modo que mejor te venga — mismo dato, explicado distinto."
				}, {
					title: "El aire de España, ahora mismo",
					desc: "Cada punto es una estación real. Tócalo para ver el detalle."
				}, {
					title: "Tu ruta bajo la sombra",
					desc: "Escribe el origen y el destino (o toca Mi ubicación) y pulsa «Buscar ruta»: Manolit∞ traza el camino con más sombra; si hace frío, activa el «Modo invierno» y la ruta buscará el sol."
				}, {
					title: "Mapa 3D y sombras en vivo",
					desc: "Los edificios proyectan su sombra real a cada minuto. Gira, acerca, mueve la hora del día y prueba el «Paseo virtual»: Manolit∞ camina contigo y, si activas la «Guía por voz», te cuenta cada paso en voz alta."
				}, {
					title: "Capas del mapa",
					desc: "Activa o quita edificios 3D, sombras, ruta o la posición del sol. Y con el botón «Capas de mapa» despliegas o escondes los estilos: mapa claro, IGN o Catastro 3D."
				}, {
					title: "Irradiación solar histórica",
					desc: "Pulsa el botón «Irradiación Solar» y toca cualquier punto: verás cuánto sol recibe según la NASA, por año, mes, día y hora."
				}, {
					title: "Árboles y paseo virtual",
					desc: "Activa «Árboles» para ver su sombra fresca, y con «Paseo virtual 3D» camina en primera persona por las calles sin salir de casa."
				}, {
					title: "Pregúntale a Manolit∞",
					desc: "¿Algo no te queda claro? Toca el botón M∞ y pregúntaselo: escríbele o háblale con el micrófono y te responde en voz alta."
				}, {
					title: "Apoya la causa",
					desc: "Manolit∞ siempre será gratis. Si quieres colaborar con los servidores, puedes apoyar en Ko-fi aquí."
				}, {
					title: "Los hermanos de Manolit∞",
					desc: "Puedes visitar los proyectos (como Manolit∞ Forestal e Islas de Calor Sevilla)."
				}]
			},
			ca: {
				next: "Següent",
				prev: "Anterior",
				done: "Finalitzar",
				pasos: [{
					title: "Escull la teva ciutat",
					desc: "Canvia aquí la ciutat per veure el seu aire en temps real."
				}, {
					title: "Com vols que t'ho expliqui?",
					desc: "Tria el mode que millor et vagi — mateixa dada, explicat diferent."
				}, {
					title: "L'aire d'Espanya, ara mateix",
					desc: "Cada punt és una estació real. Toca'l per veure el detall."
				}, {
					title: "La teva ruta sota l'ombra",
					desc: "Escriu l'origen i la destinació (o toca La meva ubicació) i prem «Cerca ruta»: Manolit∞ traça el camí amb més ombra; si fa fred, activa el «Mode hivern» i la ruta cercarà el sol."
				}, {
					title: "Mapa 3D i ombres en viu",
					desc: "Els edificis projecten la seva ombra real a cada minut. Gira, apropa, mou l'hora del dia i prova el «Passeig virtual»: Manolit∞ camina amb tu i, si actives la «Guia per veu», t'explica cada pas en veu alta."
				}, {
					title: "Capes del mapa",
					desc: "Activa o treu edificis 3D, ombres, ruta o la posició del sol. I amb el botó «Capes de mapa» desplegues o amagues els estils: mapa clar, IGN o Cadastre 3D."
				}, {
					title: "Irradiació solar històrica",
					desc: "Prem el botó «Irradiació solar» i toca qualsevol punt: veuràs quant sol rep segons la NASA, per any, mes, dia i hora."
				}, {
					title: "Arbres i passeig virtual",
					desc: "Activa «Arbres» per veure la seva ombra fresca, i amb «Passeig virtual 3D» camina en primera persona pels carrers sense sortir de casa."
				}, {
					title: "Pregunta a Manolit∞",
					desc: "Alguna cosa no et queda clara? Toca el botó M∞ i pregunta-li: escriu-li o parla-li amb el micròfon i et respon en veu alta."
				}, {
					title: "Dona suport a la causa",
					desc: "Manolit∞ sempre serà gratis. Si vols col·laborar amb els servidors, pots donar suport a Ko-fi aquí."
				}, {
					title: "Els germans de Manolit∞",
					desc: "Pots visitar els projectes (com ara Manolit∞ Forestal i Illes de Calor Sevilla)."
				}]
			},
			eu: {
				next: "Hurrengoa",
				prev: "Aurrekoa",
				done: "Amaitu",
				pasos: [{
					title: "Hautatu zure hiria",
					desc: "Aldatu hemen hiria bere airea denbora errealean ikusteko."
				}, {
					title: "Nola kontatzea nahi duzu?",
					desc: "Aukeratu onena datorkizun modua — datu bera, ezberdin azaldua."
				}, {
					title: "Espainiako airea, orain bertan",
					desc: "Puntu bakoitza benetako estazioa da. Ukitu xehetasuna ikusteko."
				}, {
					title: "Zure ibilbidea itzalpean",
					desc: "Idatzi jatorria eta helmuga (edo ukitu Nire kokapena) eta sakatu «Bilatu ibilbidea»: Manolit∞-ek itzal gehien duen bidea marrazten du; hotz egiten badu, aktibatu «Negu modua» eta ibilbideak eguzkia bilatuko du."
				}, {
					title: "3D mapa eta zuzeneko itzalak",
					desc: "Eraikinek benetako itzala proiektatzen dute minuturo. Biratu, hurbildu, mugitu eguneko ordua eta probatu «Ibilaldi birtuala»: Manolit∞ zurekin dabil eta, «Ahots bidezko gida» aktibatzen baduzu, urrats bakoitza ozenki kontatzen dizu."
				}, {
					title: "Maparen geruzak",
					desc: "Aktibatu edo kendu 3D eraikinak, itzalak, ibilbidea edo eguzkiaren posizioa. Eta «Mapa geruzak» botoiarekin estiloak zabaldu edo ezkutatzen dituzu: mapa argia, IGN edo Katastroa 3D."
				}, {
					title: "Eguzki-irradiazio historikoa",
					desc: "Sakatu «Eguzki-irradiazioa» botoia eta ukitu edozein puntu: NASAren arabera zenbat eguzki jasotzen duen ikusiko duzu, urtez, hilabetez, egunez eta orduz."
				}, {
					title: "Zuhaitzak eta paseo birtuala",
					desc: "Aktibatu «Zuhaitzak» haien itzal freskoa ikusteko, eta «3D paseo birtuala»-rekin lehen pertsonan ibili kaleetan etxetik atera gabe."
				}, {
					title: "Galdetu Manolit∞-ri",
					desc: "Zerbait ez zaizu argi geratzen? Sakatu M∞ botoia eta galdetu: idatzi edo hitz egin mikrofonoarekin eta ozenki erantzuten dizu."
				}, {
					title: "Babestu kausa",
					desc: "Manolit∞ beti doakoa izango da. Zerbitzariak lagundu nahi baduzu, Ko-fi bidez egin dezakezu hemen."
				}, {
					title: "Manolit∞ren anai-arrebak",
					desc: "Proiektuak bisitatu ditzakezu (hala nola Manolit∞ Forestal eta Sevillako Bero-Uharteak)."
				}]
			},
			gl: {
				next: "Seguinte",
				prev: "Anterior",
				done: "Rematar",
				pasos: [{
					title: "Escolle a túa cidade",
					desc: "Cambia aquí a cidade para ver o seu aire en tempo real."
				}, {
					title: "Como queres que o conte?",
					desc: "Escolle o modo que mellor che veña — mesmo dato, explicado distinto."
				}, {
					title: "O aire de España, agora mesmo",
					desc: "Cada punto é unha estación real. Tócao para ver o detalle."
				}, {
					title: "A túa ruta baixo a sombra",
					desc: "Escribe a orixe e o destino (ou toca A miña ubicación) e preme «Buscar ruta»: Manolit∞ traza o camiño con máis sombra; se fai frío, activa o «Modo inverno» e a ruta buscará o sol."
				}, {
					title: "Mapa 3D e sombras en vivo",
					desc: "Os edificios proxectan a súa sombra real a cada minuto. Xira, achega, move a hora do día e proba o «Paseo virtual»: Manolit∞ camiña contigo e, se activas a «Guía por voz», cóntache cada paso en voz alta."
				}, {
					title: "Capas do mapa",
					desc: "Activa ou quita edificios 3D, sombras, ruta ou a posición do sol. E co botón «Capas de mapa» despregas ou agochas os estilos: mapa claro, IGN ou Catastro 3D."
				}, {
					title: "Irradiación solar histórica",
					desc: "Preme o botón «Irradiación solar» e toca calquera punto: verás canto sol recibe segundo a NASA, por ano, mes, día e hora."
				}, {
					title: "Árbores e paseo virtual",
					desc: "Activa «Árbores» para ver a súa sombra fresca, e con «Paseo virtual 3D» camiña en primeira persoa polas rúas sen saír da casa."
				}, {
					title: "Pregúntalle a Manolit∞",
					desc: "Algo non che queda claro? Toca o botón M∞ e pregúntalle: escríbelle ou fálalle co micrófono e respóndeche en voz alta."
				}, {
					title: "Apoia a causa",
					desc: "Manolit∞ sempre será gratis. Se queres colaborar cos servidores, podes apoiar en Ko-fi aquí."
				}, {
					title: "Os irmáns de Manolit∞",
					desc: "Podes visitar os proxectos (como Manolit∞ Forestal e Illas de Calor Sevilla)."
				}]
			},
			en: {
				next: "Next",
				prev: "Previous",
				done: "Done",
				pasos: [{
					title: "Choose your city",
					desc: "Change the city here to see its air in real time."
				}, {
					title: "How do you want me to tell you?",
					desc: "Choose the mode that suits you best — same data, explained differently."
				}, {
					title: "Spain's air, right now",
					desc: "Each point is a real station. Tap it to see details."
				}, {
					title: "Your route in the shade",
					desc: "Type the origin and destination (or tap My location) and press 'Find route': Manolit∞ traces the shadiest way; if it is cold, switch on 'Winter mode' and the route will chase the sun."
				}, {
					title: "3D map and live shadows",
					desc: "Buildings cast their real shadow every minute. Rotate, zoom, move the time of day and try the 'Virtual walk': Manolit∞ walks with you and, if you switch on the 'Voice guide', it tells you every step out loud."
				}, {
					title: "Map layers",
					desc: "Turn 3D buildings, shadows, route or the sun's position on and off. And with the 'Map layers' button you fold or unfold the styles: light map, IGN or 3D Cadastre."
				}, {
					title: "Historical solar irradiation",
					desc: "Tap the 'Solar Irradiation' button and touch any point: see how much sun it gets from NASA data, by year, month, day and hour."
				}, {
					title: "Trees and virtual walk",
					desc: "Turn on 'Trees' to see their cool shade, and with '3D virtual walk' stroll first-person through the streets without leaving home."
				}, {
					title: "Ask Manolit∞",
					desc: "Something not clear? Tap the M∞ button and ask: type or talk with the microphone and it answers out loud."
				}, {
					title: "Support the cause",
					desc: "Manolit∞ will always be free. If you want to help with servers, you can support via Ko-fi here."
				}, {
					title: "Manolit∞'s siblings",
					desc: "You can visit our projects (such as Manolit∞ Forestal and Seville Heat Islands)."
				}]
			},
			ka: {
				next: "შემდეგი",
				prev: "წინა",
				done: "დასრულება",
				pasos: [{
					title: "აირჩიე შენი ქალაქი",
					desc: "შეცვალე აქ ქალაქი, რომ მისი ჰაერი რეალურ დროში ნახო."
				}, {
					title: "როგორ გინდა, რომ მოგიყვე?",
					desc: "აირჩიე შესაბამისი რეჟიმი — იგივე მონაცემი, სხვაგვარად ახსნილი."
				}, {
					title: "ესპანეთის ჰაერი, ამ წუთას",
					desc: "თითოეული წერტილი ნამდვილი სადგურია. შეეხე დეტალების სანახავად."
				}, {
					title: "შენი მარშრუტი ჩრდილში",
					desc: "ჩაწერე საწყისი და დანიშნულება (ან დააჭირე ჩემი მდებარეობა) და დააჭირე «მარშრუტის ძიებას»: Manolit∞ ყველაზე ჩრდილიან გზას ხაზავს; თუ ცივა, ჩართე «ზამთრის რეჟიმი» და მარშრუტი მზეს ეძებს."
				}, {
					title: "3D რუკა და ცოცხალი ჩრდილები",
					desc: "შენობები ყოველ წუთს რეალურ ჩრდილს ასახავენ. შეატრიალე, მოაუარე, შეცვალე დღის დრო და სცადე «ვირტუალური გასეირნება»: Manolit∞ შენთან ერთად დადის და, თუ «ხმოვან გიდს» ჩართავ, თითოეულ ნაბიჯს ხმამაღლა გიყვება."
				}, {
					title: "რუკის ფენები",
					desc: "ჩართე ან გამორთე 3D შენობები, ჩრდილები, მარშრუტი ან მზის პოზიცია. ხოლო ღილაკით «რუკის ფენები» სტილებს ანვარიელებ ან მალავ: ნათელი რუკა, IGN ან კადასტრი 3D."
				}, {
					title: "მზის ისტორიული ინსოლაცია",
					desc: "დააჭირე ღილაკს «მზის ინსოლაცია» და შეეხე ნებისმიერ წერტილს: ნახავ, რამდენ მზეს იღებს NASA-ს მონაცემებით — წლით, თვით, დღით და საათით."
				}, {
					title: "ხეები და ვირტუალური გასეირნება",
					desc: "ჩართე «ხეები» მათი გრილი ჩრდილის სანახავად, ხოლო «3D ვირტუალური გასეირნებით» პირველი პირის ხედით ისეირნე ქუჩებში სახლიდან გაუსვლელად."
				}, {
					title: "ჰკითხე Manolit∞-ს",
					desc: "რაღაც გაუგებარია? დააჭირე M∞ ღილაკს და ჰკითხე: დაუწერე ან ელაპარაკე მიკროფონით და ხმით გიპასუხებს."
				}, {
					title: "მხარი დაუჭირე საქმეს",
					desc: "Manolit∞ ყოველთვის უფასო იქნება. თუ გინდა სერვერების მხარდაჭერა, შეგიძლია Ko-fi-ზე აქ."
				}, {
					title: "Manolit∞-ს ძმები",
					desc: "შეგიძლია ეწვიო პროექტებს (მაგ. Manolit∞ Forestal და Sevilla Heat Islands)."
				}]
			}
		};

	function obtenerTraducciones() {
		const e = function idiomaActivo() {
			try {
				if ("function" == typeof window.getCurrentLang) {
					const e = window.getCurrentLang();
					if (a[e]) return e
				}
				const e = document.documentElement.getAttribute("lang");
				if (e && a[e.split("-")[0]]) return e.split("-")[0];
				const t = localStorage.getItem("manolito_lang");
				if (t && a[t]) return t
			} catch (e) {}
			return "es"
		}();
		return a[e] || a.es
	}

	function yaVioElTutorial() {
		try {
			return "true" === localStorage.getItem(e)
		} catch (e) {
			return !1
		}
	}

	function cookiesAceptadas() {
		try {
			return "accepted" === localStorage.getItem("manolito_cookies_choice")
		} catch (e) {
			return !1
		}
	}

	function construirPasos() {
		const e = obtenerTraducciones();
		return [{
			element: ".rs-form",
			popover: {
				title: e.pasos[3].title,
				description: e.pasos[3].desc,
				side: "bottom",
				align: "start"
			}
		}, {
			element: "#shadowRouteMap",
			popover: {
				title: e.pasos[4].title,
				description: e.pasos[4].desc,
				side: "top",
				align: "center"
			}
		}, {
			element: ".rs-layer-toggles",
			popover: {
				title: e.pasos[5].title,
				description: e.pasos[5].desc,
				side: "top",
				align: "center"
			}
		}, {
			element: "#shadowRouteMap",
			popover: {
				title: e.pasos[6].title,
				description: e.pasos[6].desc,
				side: "top",
				align: "center"
			}
		}, {
			element: "#shadowRouteMap",
			popover: {
				title: e.pasos[7].title,
				description: e.pasos[7].desc,
				side: "top",
				align: "center"
			}
		}, {
			element: "#cityDropdownBtn",
			popover: {
				title: e.pasos[0].title,
				description: e.pasos[0].desc,
				side: "bottom",
				align: "start"
			}
		}, {
			element: "#modeGrid",
			popover: {
				title: e.pasos[1].title,
				description: e.pasos[1].desc,
				side: "top",
				align: "start"
			}
		}, {
			element: "#map",
			popover: {
				title: e.pasos[2].title,
				description: e.pasos[2].desc,
				side: "top",
				align: "center"
			}
		}, {
			element: ".chat-fab",
			popover: {
				title: e.pasos[8].title,
				description: e.pasos[8].desc,
				side: "left",
				align: "end"
			}
		}, {
			element: ".donacion-boton",
			popover: {
				title: e.pasos[9].title,
				description: e.pasos[9].desc,
				side: "top",
				align: "center"
			}
		}, {
			element: ".footer-family",
			popover: {
				title: e.pasos[10].title,
				description: e.pasos[10].desc,
				side: "top",
				align: "center"
			}
		}]
	}
	let t = null;

	function lanzarTutorial() {
		if (yaVioElTutorial()) return;
		if (document.getElementById("manolitoSplash")) return;
		if (!cookiesAceptadas()) return;
		const a = function obtenerFactoriaDriver() {
			return "function" == typeof window.driver ? window.driver : window.driver && "function" == typeof window.driver.driver ? window.driver.driver : window.driver && window.driver.js && "function" == typeof window.driver.js.driver ? window.driver.js.driver : null
		}();
		if (!a) return;
		const i = obtenerTraducciones();
		try {
			t = a({
				allowClose: !0,
				showButtons: ["next", "previous", "close"],
				showProgress: !0,
				nextBtnText: i.next,
				prevBtnText: i.prev,
				doneBtnText: i.done,
				steps: construirPasos(),
				onDestroyed: () => {
					! function marcarTutorialVisto() {
						try {
							localStorage.setItem(e, "true")
						} catch (e) {}
					}(), t = null
				}
			}), t.drive()
		} catch (e) {}
	}

	function verificarYArrancar() {
		if (yaVioElTutorial()) return;
		if (!document.getElementById("manolitoSplash") && cookiesAceptadas()) return void setTimeout(lanzarTutorial, 500);
		const e = new MutationObserver(() => {
			!document.getElementById("manolitoSplash") && cookiesAceptadas() && (e.disconnect(), setTimeout(lanzarTutorial, 500))
		});
		e.observe(document.body, {
			childList: !0,
			subtree: !0
		})
	}
	document.addEventListener("langChanged", () => {
		if (!t) return;
		const e = obtenerTraducciones();
		t.setConfig({
			allowClose: !0,
			showProgress: !0,
			nextBtnText: e.next,
			prevBtnText: e.prev,
			doneBtnText: e.done,
			steps: construirPasos()
		});
		try {
			const e = "function" == typeof t.getActiveIndex ? t.getActiveIndex() : 0;
			"number" == typeof e && "function" == typeof t.drive && t.drive(e)
		} catch (e) {}
	}), window.iniciarTutorialManolito = function() {
		lanzarTutorial()
	}, "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", verificarYArrancar) : verificarYArrancar(), document.addEventListener("cookiesAceptadas", () => {
		verificarYArrancar()
	})
}();