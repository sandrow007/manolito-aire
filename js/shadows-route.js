"use strict";
! function() {
    const e = {
        centroInicial: [-5.9845, 37.3891],
        zoomInicial: 15.5,
        pitchInicial: 55,
        bearingInicial: -15,
        nominatimUrl: "https://nominatim.openstreetmap.org/search",
        nominatimReverseUrl: "https://nominatim.openstreetmap.org/reverse",
        osrmUrl: "https://routing.openstreetmap.de/routed-foot/route/v1",
        velocidadCaminandoKmh: 4.8,
        airQualityUrl: "https://air-quality-api.open-meteo.com/v1/air-quality",
        styleUrlClaro: "https://tiles.openfreemap.org/styles/liberty",
        edificiosLayerId: "building-3d",
        fetchTimeoutMs: 9e3,
        fetchRetries: 2,
        alturaPorDefectoM: 9,
        maxEdificiosSombra: 220,
        loteSombraSize: 30,
        duracionVueloInicialMs: 2e3,
        priorizarSombra: !0,
        maxDetourSombra: 1.5,
        maxAlternativasSombra: 3,
        usarRedLocalTermica: !0,
        usarOverpassTermica: !0,
        redPeatonalUrl: "data/red-peatonal.geojson",
        redPeatonalMargenM: 500,
        factorPenalizacionSol: .7,
        maxNodosRedPeatonal: 8e4,
        overpassRedPeatonalUrls: ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.osm.ch/api/interpreter"],
        overpassTimeoutS: 15,
        paseoAlturaOjoM: 1.65,
        paseoVelocidadMs: 2,
        paseoVelocidadGiro: 1.6,
        paseoLookAheadM: 25,
        paseoMaxPitch: 72,
        paseoSincroMs: 600,
        paseoSuavizado: .12
    };

    function t(e, o) {
        try {
            const o = window.getMessages;
            if ("function" == typeof o) {
                const a = o();
                if (a && null != a[e]) return a[e]
            }
        } catch (e) {}
        return null != o ? o : e
    }

    function leerVar(e) {
        return getComputedStyle(document.documentElement).getPropertyValue(e).trim()
    }

    function cederAlNavegador() {
        return new Promise(e => {
            "requestIdleCallback" in window ? requestIdleCallback(() => e(), {
                timeout: 120
            }) : setTimeout(e, 0)
        })
    }
    class MinHeap {
        constructor() {
            this.heap = []
        }
        isEmpty() {
            return 0 === this.heap.length
        }
        push(e) {
            this.heap.push(e), this._bubbleUp(this.heap.length - 1)
        }
        pop() {
            const e = this.heap;
            if (0 === e.length) return null;
            const o = e[0],
                a = e.pop();
            return e.length > 0 && (e[0] = a, this._sinkDown(0)), o
        }
        _bubbleUp(e) {
            const o = this.heap,
                a = o[e];
            for (; e > 0;) {
                const r = e - 1 >> 1;
                if (o[r].dist <= a.dist) break;
                o[e] = o[r], e = r
            }
            o[e] = a
        }
        _sinkDown(e) {
            const o = this.heap,
                a = o.length,
                r = o[e];
            for (;;) {
                let r = e;
                const n = 1 + (e << 1),
                    i = n + 1;
                if (n < a && o[n].dist < o[r].dist && (r = n), i < a && o[i].dist < o[r].dist && (r = i), r === e) break;
                o[e] = o[r], e = r
            }
            o[e] = r
        }
    }
    const o = new Map;
    let a = null;

    function bboxClave(e) {
        return e.map(e => e.toFixed(5)).join(",")
    }

    function bboxContiene(e, o) {
        return o[0] >= e[0] && o[1] >= e[1] && o[2] <= e[2] && o[3] <= e[3]
    }

    function overpassJsonAGeojson(e) {
        const o = {},
            a = [];
        for (const r of e.elements || []) "node" === r.type ? o[r.id] = [r.lon, r.lat] : "way" === r.type && a.push(r);
        const r = [];
        for (const e of a) {
            const a = [];
            for (const r of e.nodes || []) o[r] && a.push(o[r]);
            a.length >= 2 && r.push({
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: a
                },
                properties: e.tags || {}
            })
        }
        return turf.featureCollection(r)
    }
    async function obtenerRedPeatonal(r) {
        for (const e of o.values())
            if (bboxContiene(e.bbox, r)) return e.geojson;
        if (e.usarRedLocalTermica) {
            const n = await async function cargarRedPeatonalLocal() {
                return a || (a = (async () => {
                    try {
                        const a = await fetch(e.redPeatonalUrl);
                        if (!a.ok) throw new Error(`HTTP ${a.status}`);
                        const r = await a.json();
                        if (!r || !Array.isArray(r.features)) throw new Error("GeoJSON inválido");
                        const n = turf.bbox(r);
                        return o.set(bboxClave(n), {
                            bbox: n,
                            geojson: r
                        }), {
                            bbox: n,
                            geojson: r
                        }
                    } catch (e) {
                        return console.warn("[Dijkstra térmico] No se pudo cargar la red peatonal local:", e.message), null
                    } finally {
                        a = null
                    }
                })(), a)
            }();
            if (n && n.geojson.features.length && bboxContiene(n.bbox, r)) return n.geojson
        }
        if (e.usarOverpassTermica) {
            const a = await async function descargarRedPeatonalOverpass(o) {
                const a = `[out:json][timeout:${e.overpassTimeoutS}]; way["highway"~"footway|pedestrian|path|living_street|steps|residential|tertiary|secondary|primary"](${o[1]},${o[0]},${o[3]},${o[2]}); out body; >; out skel qt;`;
                let r = null;
                for (const o of e.overpassRedPeatonalUrls) {
                    const n = new AbortController,
                        i = setTimeout(() => n.abort(), 1e3 * e.overpassTimeoutS + 3e3);
                    try {
                        const e = await fetch(o, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
                            },
                            body: "data=" + encodeURIComponent(a),
                            signal: n.signal
                        });
                        if (!e.ok) throw new Error(`HTTP ${e.status}`);
                        return overpassJsonAGeojson(await e.json())
                    } catch (e) {
                        r = e;
                        continue
                    } finally {
                        clearTimeout(i)
                    }
                }
                throw r || new Error("Overpass no disponible")
            }(r);
            if (a.features.length) return o.set(bboxClave(r), {
                bbox: r,
                geojson: a
            }), a
        }
        return null
    }

    function encontrarNodoCercano(e, o, a) {
        let r = -1,
            n = 1 / 0;
        for (let i = 0; i < e.nodos.length; i++) {
            const s = e.nodos[i],
                l = (s[0] - o) * (s[0] - o) + (s[1] - a) * (s[1] - a);
            l < n && (n = l, r = i)
        }
        return r
    }

    function calcularPenalizacionSolar(o, a) {
        if (!a || a.altitude <= 0) return 0;
        try {
            const e = void 0 !== M && M && M.features ? M.features : [];
            for (const a of e)
                if (turf.booleanPointInPolygon(turf.point(o), a)) return 0
        } catch (e) {}
        const r = Math.max(0, Math.sin(a.altitude));
        return e.factorPenalizacionSol * r
    }
    async function calcularRutaDijkstraTermico(o, a) {
        const r = performance.now(),
            n = turf.lineString([
                [o.lon, o.lat],
                [a.lon, a.lat]
            ]),
            i = turf.bboxPolygon(turf.bbox(n)),
            s = turf.bbox(turf.buffer(i, e.redPeatonalMargenM, {
                units: "meters"
            })),
            l = await obtenerRedPeatonal(s);
        if (!l) throw new Error("Red peatonal no disponible (ni local ni Overpass)");
        const c = function filtrarRedPorBBox(e, o) {
            try {
                const a = turf.bboxPolygon(o);
                return turf.featureCollection(e.features.filter(e => {
                    try {
                        return turf.booleanIntersects(e, a)
                    } catch (e) {
                        return !1
                    }
                }))
            } catch (e) {
                return turf.featureCollection([])
            }
        }(l, s);
        if (!c.features.length) throw new Error("La red peatonal no cubre el área de la ruta");
        const u = function construirGrafoDesdeGeojson(e) {
            const o = [],
                a = [],
                r = new Map;

            function getNodoIdx(e, n) {
                const i = function coordKey(e, o) {
                    return `${e.toFixed(8)},${o.toFixed(8)}`
                }(e, n);
                let s = r.get(i);
                return null == s && (s = o.length, o.push([e, n]), a.push([]), r.set(i, s)), s
            }
            return turf.featureEach(e, e => {
                const o = e.geometry;
                if (!o) return;
                let r;
                if ("LineString" === o.type) r = [o.coordinates];
                else {
                    if ("MultiLineString" !== o.type) return;
                    r = o.coordinates
                }
                for (const e of r)
                    if (e && !(e.length < 2))
                        for (let o = 0; o < e.length - 1; o++) {
                            const r = e[o],
                                n = e[o + 1],
                                i = getNodoIdx(r[0], r[1]),
                                s = getNodoIdx(n[0], n[1]),
                                l = turf.distance(r, n, {
                                    units: "meters"
                                });
                            l <= 0 || (a[i].push({
                                to: s,
                                longitudM: l
                            }), a[s].push({
                                to: i,
                                longitudM: l
                            }))
                        }
            }), {
                nodos: o,
                adj: a,
                idxPorKey: r
            }
        }(c);
        if (u.nodos.length > e.maxNodosRedPeatonal) throw new Error("La red peatonal filtrada es demasiado densa para este cálculo");
        const d = encontrarNodoCercano(u, o.lon, o.lat),
            m = encontrarNodoCercano(u, a.lon, a.lat);
        if (-1 === d || -1 === m) throw new Error("No se ha podido enganchar origen/destino a la red peatonal");
        const p = {
                lat: .5 * (o.lat + a.lat),
                lon: .5 * (o.lon + a.lon)
            },
            g = function dijkstraTermico(e, o, a, r) {
                const n = e.nodos.length,
                    i = new Float64Array(n).fill(1 / 0),
                    s = new Int32Array(n).fill(-1),
                    l = new Uint8Array(n);
                i[o] = 0;
                const c = new MinHeap;
                for (c.push({
                        nodo: o,
                        dist: 0
                    }); !c.isEmpty();) {
                    const o = c.pop();
                    if (!o) break;
                    const n = o.nodo;
                    if (l[n]) continue;
                    if (l[n] = 1, n === a) break;
                    const u = e.nodos[n][0],
                        d = e.nodos[n][1];
                    for (let o = 0; o < e.adj[n].length; o++) {
                        const a = e.adj[n][o],
                            m = a.to;
                        if (l[m]) continue;
                        const p = calcularPenalizacionSolar([.5 * (u + e.nodos[m][0]), .5 * (d + e.nodos[m][1])], r),
                            g = a.longitudM * (1 + p),
                            f = i[n] + g;
                        f < i[m] && (i[m] = f, s[m] = n, c.push({
                            nodo: m,
                            dist: f
                        }))
                    }
                }
                if (i[a] === 1 / 0) return {
                    camino: [],
                    costeTermicoM: 1 / 0
                };
                const u = [];
                for (let o = a; - 1 !== o; o = s[o]) u.push(e.nodos[o]);
                return u.reverse(), {
                    camino: u,
                    costeTermicoM: i[a]
                }
            }(u, d, m, SunCalc.getPosition(obtenerHoraEfectiva(), p.lat, p.lon));
        if (g.camino.length < 2) throw new Error("Dijkstra térmico no ha encontrado camino");
        const f = turf.length(turf.lineString(g.camino), {
                units: "kilometers"
            }),
            b = f / e.velocidadCaminandoKmh * 60;
        let h = null;
        if (M && M.features && M.features.length) try {
            const e = turf.lineString(g.camino);
            h = Math.round(100 * calcularCoberturaSombra(e, M.features))
        } catch (e) {}
        return console.log(`[Dijkstra térmico] ${g.camino.length} nodos · coste ${g.costeTermicoM.toFixed(1)} m · ${(performance.now()-r).toFixed(2)} ms`), {
            geojson: {
                type: "LineString",
                coordinates: g.camino
            },
            distanciaKm: f.toFixed(2),
            duracionMin: Math.round(b),
            esReal: !0,
            duracionEstimada: !0,
            coberturaSombraPct: h,
            esDijkstraTermico: !0
        }
    }

    function sincronizarArboles() {
        try {
            "function" == typeof window.manolitAireRecalcularArboles && window.manolitAireRecalcularArboles()
        } catch (e) {
            console.warn("No se ha podido sincronizar la sombra de los árboles:", e)
        }
    }
    const r = document.getElementById("shadowRouteMap");
    if (!r) return;
    const n = r.parentElement || r;
    "static" === getComputedStyle(n).position && (n.style.position = "relative");
    const i = new maplibregl.Map({
        container: "shadowRouteMap",
        style: e.styleUrlClaro,
        center: e.centroInicial,
        zoom: Math.max(e.zoomInicial - 2.3, 1),
        pitch: 0,
        bearing: 0,
        attributionControl: !0
    });
    window.manolitAireMap = i, i.addControl(new maplibregl.NavigationControl({
        visualizePitch: !0
    }));
    let s = !1,
        l = [],
        c = !1,
        u = !1,
        d = null,
        m = 0,
        p = null,
        g = 0,
        f = {
            x: 0,
            y: 0,
            bearing: 0
        },
        b = 0,
        h = 0,
        y = new Map,
        v = {
            active: !1,
            startX: 0,
            startY: 0,
            dx: 0,
            dy: 0,
            pointerId: null
        },
        x = null,
        w = 0;
    const C = new Set;
    addEventListener("keydown", e => C.add(e.code)), addEventListener("keyup", e => C.delete(e.code)), i.on("load", () => {
        const o = (i.getStyle().layers || []).find(e => "fill-extrusion" === e.type && /building/i.test(e.id));
        if (o) {
            e.edificiosLayerId = o.id, s = !0;
            try {
                i.setPaintProperty(e.edificiosLayerId, "fill-extrusion-color", ["interpolate", ["linear"],
                    ["coalesce", ["get", "render_height"],
                        ["get", "height"], 8
                    ], 0, "#8fb3e8", 30, "#5f8fd6", 70, "#3f6bc0", 140, "#274a96"
                ]), i.setPaintProperty(e.edificiosLayerId, "fill-extrusion-opacity", .93), i.setPaintProperty(e.edificiosLayerId, "fill-extrusion-vertical-gradient", !0)
            } catch (e) {
                console.warn("No se ha podido aplicar el color vivo a los edificios:", e)
            }
        }
        i.addSource("sombras-halo", {
                type: "geojson",
                data: turf.featureCollection([])
            }), i.addLayer({
                id: "capa-sombras-halo",
                type: "fill",
                source: "sombras-halo",
                paint: {
                    "fill-color": "#0b1220",
                    "fill-opacity": .1
                }
            }, s ? e.edificiosLayerId : void 0), i.addSource("sombras", {
                type: "geojson",
                data: turf.featureCollection([])
            }), i.addLayer({
                id: "capa-sombras",
                type: "fill",
                source: "sombras",
                paint: {
                    "fill-color": "#0b1220",
                    "fill-opacity": .28
                }
            }, s ? e.edificiosLayerId : void 0), i.addSource("ruta", {
                type: "geojson",
                data: turf.featureCollection([])
            }), i.addLayer({
                id: "capa-ruta-outline",
                type: "line",
                source: "ruta",
                layout: {
                    "line-cap": "round",
                    "line-join": "round"
                },
                paint: {
                    "line-color": "#1a0d00",
                    "line-width": 9,
                    "line-opacity": .85
                }
            }), i.addLayer({
                id: "capa-ruta-glow",
                type: "line",
                source: "ruta",
                layout: {
                    "line-cap": "round",
                    "line-join": "round"
                },
                paint: {
                    "line-color": "#ff9500",
                    "line-width": 11,
                    "line-opacity": .35,
                    "line-blur": 8
                }
            }), i.addLayer({
                id: "capa-ruta",
                type: "line",
                source: "ruta",
                layout: {
                    "line-cap": "round",
                    "line-join": "round"
                },
                paint: {
                    "line-color": "#ff7b00",
                    "line-width": 5,
                    "line-opacity": 1
                }
            }), i.addSource("ruta-sombra", {
                type: "geojson",
                data: turf.featureCollection([])
            }), i.addLayer({
                id: "capa-ruta-sombra-outline",
                type: "line",
                source: "ruta-sombra",
                layout: {
                    "line-cap": "round",
                    "line-join": "round"
                },
                paint: {
                    "line-color": "#00151a",
                    "line-width": 9,
                    "line-opacity": .9
                }
            }), i.addLayer({
                id: "capa-ruta-sombra",
                type: "line",
                source: "ruta-sombra",
                layout: {
                    "line-cap": "round",
                    "line-join": "round"
                },
                paint: {
                    "line-color": "#00d4ff",
                    "line-width": 5,
                    "line-opacity": .95
                }
            }), i.addSource("puntos-manuales", {
                type: "geojson",
                data: turf.featureCollection([])
            }), i.addLayer({
                id: "capa-puntos-manuales",
                type: "circle",
                source: "puntos-manuales",
                paint: {
                    "circle-radius": 7,
                    "circle-color": leerVar("--accent") || "#0eedc0",
                    "circle-stroke-width": 2,
                    "circle-stroke-color": "#FBFAF7"
                }
            }), i.addSource("precision-ubicacion", {
                type: "geojson",
                data: turf.featureCollection([])
            }), i.addLayer({
                id: "capa-precision-ubicacion",
                type: "fill",
                source: "precision-ubicacion",
                paint: {
                    "fill-color": leerVar("--accent") || "#00f2ff",
                    "fill-opacity": .12
                }
            }, "capa-puntos-manuales"), i.addLayer({
                id: "capa-precision-ubicacion-borde",
                type: "line",
                source: "precision-ubicacion",
                paint: {
                    "line-color": leerVar("--accent") || "#00f2ff",
                    "line-width": 1,
                    "line-opacity": .4
                }
            }, "capa-puntos-manuales"),
            function inyectarControlesTiempo() {
                if (document.getElementById("rsTimeControls")) return;
                ! function inyectarEstilosPanel() {
                    if (document.getElementById("rsPanelEstilos")) return;
                    const e = document.createElement("style");
                    e.id = "rsPanelEstilos", e.textContent = "\n      #rsTimeControls{\n        position:absolute; left:12px; bottom:12px; z-index:5;\n        width:max-content; min-width:190px; max-width:calc(100% - 24px);\n        background:linear-gradient(160deg, rgba(251,250,247,0.96) 0%, rgba(255,107,26,0.16) 100%);\n        backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);\n        border:1px solid rgba(255,107,26,0.4); border-radius:14px;\n        box-shadow:0 8px 22px rgba(22,35,46,0.16);\n        padding:10px 13px; font-family:inherit; color:var(--ink, #0D1F26);\n        transition:opacity .18s ease, transform .18s ease;\n      }\n      #rsTimeControls .rs-cuerpo{ overflow:visible; }\n      #rsTimeControls.rs-cerrado .rs-cuerpo{ display:none; }\n      #rsTimeControls .rs-fila{ display:flex; align-items:center; gap:8px; }\n      #rsTimeControls .rs-cabecera{ display:flex; align-items:center; justify-content:space-between; gap:8px; }\n      #rsTimeControls.rs-cerrado .rs-cabecera{ margin-bottom:0; }\n      #rsTimeControls:not(.rs-cerrado) .rs-cabecera{ margin-bottom:7px; }\n      #rsTimeControls .rs-eyebrow{\n        font-size:8.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--sky-mid, #17788A);\n        font-weight:700;\n      }\n      #rsPlegarBtn{\n        appearance:none; border:none; background:transparent; color:var(--sky-mid, #17788A);\n        cursor:pointer; padding:2px 4px; opacity:.75; line-height:0;\n      }\n      #rsPlegarBtn:hover{ opacity:1; }\n      #rsPlegarBtn svg{ display:block; transition:transform .2s ease; }\n      #rsTimeControls.rs-cerrado #rsPlegarBtn svg{ transform:rotate(180deg); }\n      #rsTimeLabel{\n        font-family:var(--font-mono, 'IBM Plex Mono', monospace);\n        font-size:12px; letter-spacing:.02em; color:#C24500; font-weight:700;\n      }\n      #rsGoldenBadge{\n        font-size:8.5px; font-weight:700; letter-spacing:.04em; padding:2px 7px 2px 5px;\n        border-radius:999px; border:1px solid rgba(255,107,26,0.5); white-space:nowrap;\n        background:rgba(255,107,26,0.14);\n        display:inline-flex; align-items:center; gap:4px; color:#C24500;\n      }\n      #rsGoldenBadge::before{ content:''; width:5px; height:5px; border-radius:50%; background:currentColor; }\n      #rsTimeControls .rs-divisor{\n        height:1px; margin:8px 0; background:var(--line, rgba(14,59,71,0.14));\n      }\n      #rsTimeSlider{\n        -webkit-appearance:none; appearance:none; width:100%; height:16px; background:transparent; cursor:pointer; margin:4px 0 1px;\n      }\n      #rsTimeSlider::-webkit-slider-runnable-track{\n        height:3px; background:var(--line, rgba(14,59,71,0.18)); border-radius:2px;\n      }\n      #rsTimeSlider::-webkit-slider-thumb{\n        -webkit-appearance:none; margin-top:-6px; width:14px; height:14px; border-radius:50%;\n        background:var(--accent, #FF6B1A); border:2px solid var(--paper, #FBFAF7); box-shadow:0 1px 4px rgba(22,35,46,0.25);\n      }\n      #rsTimeSlider::-moz-range-track{ height:3px; background:var(--line, rgba(14,59,71,0.18)); border-radius:2px; }\n      #rsTimeSlider::-moz-range-thumb{\n        width:12px; height:12px; border-radius:50%; background:var(--accent, #FF6B1A); border:2px solid var(--paper, #FBFAF7);\n      }\n      #rsTimeControls .rs-botones{ display:flex; gap:5px; flex-wrap:wrap; margin-top:8px; }\n      #rsTimeControls button{\n        flex:1; min-width:0; font-size:9px; letter-spacing:.04em; text-transform:uppercase;\n        padding:6px 6px; border-radius:9px; border:1px solid var(--line, rgba(14,59,71,0.14));\n        background:var(--mist, #EDF1F0); color:var(--sky-deep, #0E3B47);\n        cursor:pointer; font-weight:700; transition:background .15s,border-color .15s;\n      }\n      #rsTimeControls button:hover{ background:var(--accent-soft, rgba(255,107,26,0.16)); border-color:var(--accent, #FF6B1A); }\n      #rsTimeControls button:active{ background:var(--accent-soft, rgba(255,107,26,0.3)); }\n      #rsTimeControls button.rs-btn-capturar{ flex-basis:100%; color:var(--sky-mid, #17788A); }\n      @media (max-width:480px){ #rsTimeControls{ min-width:170px; } } }\n    ", document.head.appendChild(e)
                }();
                const e = document.createElement("div");
                e.id = "rsTimeControls";
                const o = document.createElement("div");
                o.className = "rs-cabecera";
                const a = document.createElement("span");
                a.className = "rs-eyebrow", a.id = "rsEyebrowSol", a.textContent = t("sunPosition", "Posición solar");
                const r = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                r.setAttribute("viewBox", "0 0 60 34"), r.setAttribute("width", "48"), r.setAttribute("height", "28"), r.innerHTML = '\n      <g id="rsSolGrupo" style="transition:opacity .3s;">\n        <path d="M 4 30 A 26 26 0 0 1 56 30" fill="none" stroke="#c98a4b" stroke-width="1" stroke-dasharray="1.5 3" opacity="0.55"/>\n        <line x1="4" y1="30" x2="56" y2="30" stroke="#ffffff22" stroke-width="1"/>\n        <circle id="rsSolPunto" cx="30" cy="4" r="3.4" fill="#e7b06a"/>\n      </g>';
                const i = document.createElement("button");
                i.id = "rsPlegarBtn", i.type = "button", i.setAttribute("aria-label", "Mostrar u ocultar el panel de posición solar"), i.innerHTML = '<svg width="11" height="7" viewBox="0 0 11 7"><path d="M1 1l4.5 4.5L10 1" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>', i.addEventListener("click", async () => {
                    const o = e.classList.contains("rs-cerrado");
                    e.classList.toggle("rs-cerrado"), o && (asegurarActivacionSolar(), await recalcularSombrasVisibles(), actualizarIluminacionSolar(), await actualizarTramosSombraRuta(), sincronizarArboles())
                }), e.classList.add("rs-cerrado"), o.append(a, r, i);
                const s = document.createElement("div");
                s.className = "rs-cuerpo";
                const l = document.createElement("div");
                l.className = "rs-fila", l.style.justifyContent = "space-between", A = document.createElement("span"), A.id = "rsTimeLabel";
                const c = document.createElement("span");
                c.id = "rsGoldenBadge", c.style.visibility = "hidden", c.textContent = t("goldenHour", "Hora dorada"), l.append(A, c), I = document.createElement("input"), I.type = "range", I.id = "rsTimeSlider", I.min = "0", I.max = "1439", I.step = "5", I.value = String(minutosDesdeFecha(new Date)), I.addEventListener("input", () => {
                    L = !0, T = u ? T : new Date, clearTimeout(D), D = setTimeout(() => aplicarCambioDeHora(u), 90), actualizarEtiquetaTiempo(u)
                });
                let u = !1;
                const d = document.createElement("div");
                d.className = "rs-divisor";
                const m = document.createElement("div");

                function crearBoton(e, o) {
                    const a = document.createElement("button");
                    return a.type = "button", o && (a.id = o), a.textContent = e, a
                }
                m.className = "rs-botones";
                const p = crearBoton(t("now", "Ahora"), "rsBtnAhora"),
                    g = crearBoton(t("btnSummer", "Verano"), "rsBtnVerano"),
                    f = crearBoton(t("btnWinter", "Invierno"), "rsBtnInvierno"),
                    b = crearBoton(t("captureView", "Capturar vista"), "rsBtnCapturar");
                b.className = "rs-btn-capturar", p.addEventListener("click", () => {
                    L = !1, u = !1, T = new Date, I.value = String(minutosDesdeFecha(new Date)), aplicarCambioDeHora(!1)
                }), g.addEventListener("click", () => {
                    L = !0, u = "verano", T = fechaSolsticio("verano"), I.value = "780", aplicarCambioDeHora("verano")
                }), f.addEventListener("click", () => {
                    L = !0, u = "invierno", T = fechaSolsticio("invierno"), I.value = "780", aplicarCambioDeHora("invierno")
                }), b.addEventListener("click", capturarVista), m.append(p, g, f, b), s.append(l, I, d, m), e.append(o, s), n.appendChild(e), actualizarEtiquetaTiempo(!1)
            }(),
            function inyectarControlesMapa() {
                if (document.getElementById("rsMapControls")) return;
                ! function inyectarEstilosMapaControles() {
                    if (document.getElementById("rsMapaEstilos")) return;
                    const e = document.createElement("style");
                    e.id = "rsMapaEstilos", e.textContent = "\n      #rsMapControls{\n        position:absolute; left:12px; top:12px; right:12px; z-index:5; display:flex; gap:5px; flex-wrap:wrap;\n      }\n      #rsMapControls button{\n        font-family:inherit; font-size:9.5px; letter-spacing:.04em; text-transform:uppercase;\n        font-weight:700; padding:6px 11px; border-radius:999px;\n        border:1px solid var(--line, rgba(14,59,71,0.14));\n        background:rgba(251,250,247,0.92); color:var(--sky-deep, #0E3B47);\n        backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);\n        cursor:pointer; box-shadow:0 3px 10px rgba(22,35,46,0.12); transition:background .15s,border-color .15s,color .15s;\n      }\n      #rsMapControls button:hover{ background:var(--accent-soft, rgba(255,107,26,0.16)); border-color:var(--accent, #FF6B1A); }\n      #rsMapControls button.rs-activo{ background:var(--accent-soft, rgba(255,107,26,0.16)); border-color:var(--accent, #FF6B1A); color:var(--sky-deep, #0E3B47); }\n      @media (max-width:480px){ #rsMapControls button{ padding:5px 9px; font-size:8.5px; } }\n\n      /* Joystick virtual para paseo 3D */\n      #rsJoystick{\n        position:absolute; right:24px; bottom:24px; width:96px; height:96px;\n        border-radius:50%; background:rgba(251,250,247,0.5);\n        border:1px solid var(--line, rgba(14,59,71,0.2)); touch-action:none;\n        backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);\n        z-index:6; display:none; pointer-events:auto;\n      }\n      #rsJoystickKnob{\n        position:absolute; left:50%; top:50%; width:38px; height:38px;\n        transform:translate(-50%,-50%); border-radius:50%;\n        background:var(--accent, #FF6B1A); border:2px solid var(--paper, #FBFAF7);\n        box-shadow:0 3px 10px rgba(22,35,46,0.3); touch-action:none;\n      }\n      #rsJoystick.rs-visible{ display:block; }\n      @media (max-width:480px){\n        #rsJoystick{ width:78px; height:78px; right:16px; bottom:16px; }\n        #rsJoystickKnob{ width:32px; height:32px; }\n      }\n    ", document.head.appendChild(e)
                }();
                const o = document.createElement("div");
                o.id = "rsMapControls";
                const a = document.createElement("button");
                a.type = "button", a.id = "rsBtnPickMap", a.textContent = t("pickMap", "Elegir en el mapa"), F = a;
                const r = document.createElement("button");
                r.type = "button", r.id = "rsBtnMyLocation", r.textContent = t("myLocation", "Mi ubicación");
                const s = document.createElement("button");
                s.type = "button", s.id = "rsBtnWalk", s.textContent = t("walkModeStart", "Iniciar caminata");
                const l = document.createElement("button");
                l.type = "button", l.id = "rsBtnPaseo", l.textContent = t("virtualWalkStart", "Paseo virtual 3D");
                const c = document.createElement("button");

                function reiniciarTodo() {
                    detenerPaseoVirtual(), salirDeModoClick(), detenerCaminata(), N.value = "", q.value = "", U.delete(N), U.delete(q), i.getSource("ruta")?.setData(turf.featureCollection([])), i.getSource("ruta-sombra")?.setData(turf.featureCollection([])), i.getSource("puntos-manuales")?.setData(turf.featureCollection([])), i.getSource("precision-ubicacion")?.setData(turf.featureCollection([])), $ && ($.remove(), $ = null), V && (V.remove(), V = null), B = null, mostrarEstado(""), mostrarBadgeSombra(null)
                }

                function salirDeModoClick() {
                    z = !1, R = null, y = !1, a.classList.remove("rs-activo"), i.getSource("puntos-manuales")?.setData(turf.featureCollection([]))
                }
                c.type = "button", c.id = "rsBtnReset", c.textContent = t("resetBtn", "Reiniciar"), c.addEventListener("click", reiniciarTodo), a.addEventListener("click", () => {
                    if (z) return salirDeModoClick(), void mostrarEstado("");
                    z = !0, R = null, y = !1, a.classList.add("rs-activo"), mostrarEstado(t("clickOrigin", "Haz clic en el mapa para marcar el origen."))
                });
                let y = !1,
                    E = null;
                r.addEventListener("click", () => {
                    "geolocation" in navigator ? (mostrarEstado(t("locationAsking", "Pidiendo permiso de ubicación…")), navigator.geolocation.getCurrentPosition(async e => {
                        const o = e.coords.latitude,
                            r = e.coords.longitude,
                            n = Math.round(e.coords.accuracy || 0);
                        U.set(N, {
                            lat: o,
                            lon: r,
                            nombre: t("myLocation", "Mi ubicación"),
                            texto: t("myLocation", "Mi ubicación")
                        }), N.value = t("myLocation", "Mi ubicación");
                        const s = turf.point([r, o]);
                        if (i.getSource("puntos-manuales")?.setData(turf.featureCollection([s])), n > 0) {
                            const e = turf.circle([r, o], n / 1e3, {
                                units: "kilometers",
                                steps: 48
                            });
                            i.getSource("precision-ubicacion")?.setData(turf.featureCollection([e]))
                        } else i.getSource("precision-ubicacion")?.setData(turf.featureCollection([]));
                        const l = n > 0 ? ` (${t("locationPrecision","precisión reportada por el navegador")}: ±${n} m — ${t("locationNote","sin GPS real puede ser orientativa")})` : "";
                        mostrarEstado(`${t("locationMarked","Ubicación marcada como origen")}${l} — ${t("chooseDestination","toca un punto del mapa para poner el destino.")}`, "ok"), i.flyTo({
                            center: [r, o],
                            zoom: Math.max(i.getZoom(), 15),
                            duration: 900
                        }), E = {
                            lat: o,
                            lon: r,
                            nombre: t("myLocation", "Mi ubicación")
                        }, y = !0, z = !0, R = null, a.classList.add("rs-activo")
                    }, () => mostrarEstado(t("locationDenied", "No se ha podido obtener tu ubicación (¿has denegado el permiso?)."), "error"), {
                        enableHighAccuracy: !0,
                        timeout: 1e4,
                        maximumAge: 0
                    })) : mostrarEstado(t("errorGeolocation", "Este navegador no permite compartir tu ubicación."), "error")
                });
                let S = null,
                    k = null;

                function detenerCaminata() {
                    null != S && navigator.geolocation.clearWatch(S), S = null, k && (k.remove(), k = null), s.classList.remove("rs-activo"), s.textContent = t("walkModeStart", "Iniciar caminata")
                }

                function entrarPaseoVirtual() {
                    if (u) return;
                    null != S && detenerCaminata(), x = {
                        center: i.getCenter(),
                        zoom: i.getZoom(),
                        pitch: i.getPitch(),
                        bearing: i.getBearing(),
                        maxPitch: i.getMaxPitch()
                    };
                    const o = i.getCenter();
                    p = maplibregl.MercatorCoordinate.fromLngLat(o), g = p.meterInMercatorCoordinateUnits(), f.x = 0, f.y = 0, f.bearing = i.getBearing() || 0, b = 0, h = 0, i.dragPan.disable(), i.scrollZoom.disable(), i.dragRotate.disable(), i.touchZoomRotate.disable(), i.doubleClickZoom.disable(), i.keyboard.disable(), i.setMaxPitch(e.paseoMaxPitch), u = !0, m = performance.now(), w = 0, asegurarActivacionSolar(), i.getSource("sombras-halo")?.setData(turf.featureCollection([])), l && (l.classList.add("rs-activo"), l.textContent = t("virtualWalkStop", "Salir del paseo")), mostrarEstado(t("virtualWalkHint", "Arrastra para mirar • Joystick para moverte • Esc para salir"));
                    const a = document.getElementById("rsJoystick");
                    a && "ontouchstart" in window && a.classList.add("rs-visible"), d = requestAnimationFrame(loopPaseo)
                }

                function detenerPaseoVirtual() {
                    if (!u) return;
                    u = !1, d && cancelAnimationFrame(d), d = null, i.dragPan.enable(), i.scrollZoom.enable(), i.dragRotate.enable(), i.touchZoomRotate.enable(), i.doubleClickZoom.enable(), i.keyboard.enable(), x ? (i.setMaxPitch(x.maxPitch), i.jumpTo({
                        center: x.center,
                        zoom: x.zoom,
                        pitch: x.pitch,
                        bearing: x.bearing
                    }), P = {
                        lat: x.center.lat,
                        lon: x.center.lng
                    }, x = null) : i.setMaxPitch(60), l.classList.remove("rs-activo"), l.textContent = t("virtualWalkStart", "Paseo virtual 3D"), mostrarEstado("");
                    const e = document.getElementById("rsJoystick");
                    e && (e.style.display = "none", e.classList.remove("rs-visible")), v.active = !1, actualizarCacheEdificios(), document.getElementById("rsToggleSombras")?.checked && recalcularSombrasVisibles(), sincronizarArboles()
                }

                function paseoToLngLat(e, o) {
                    return new maplibregl.MercatorCoordinate(p.x + e * g, p.y + o * g, 0).toLngLat()
                }

                function actualizarCamaraPaseo(o) {
                    if ("function" != typeof i.getFreeCameraOptions || "function" != typeof i.setFreeCameraOptions) return console.warn("[paseo virtual] Esta versión de MapLibre GL JS no soporta cámara libre (getFreeCameraOptions). Revisa la versión cargada en el HTML."), mostrarEstado(t("virtualWalkUnsupported", "Tu navegador o la versión del mapa cargada no soporta el paseo virtual 3D ahora mismo."), "error"), void detenerPaseoVirtual();
                    const a = i.getFreeCameraOptions();
                    a.position = maplibregl.MercatorCoordinate.fromLngLat(o, e.paseoAlturaOjoM), a.setPitchBearing(e.paseoMaxPitch, f.bearing), i.setFreeCameraOptions(a)
                }

                function sincronizarSombrasPaseo(o, a) {
                    a - w < e.paseoSincroMs || (w = a, P = {
                        lat: o.lat,
                        lon: o.lng
                    }, actualizarCacheEdificios(), document.getElementById("rsToggleSombras")?.checked && recalcularSombrasVisibles(), B && actualizarTramosSombraRuta(), sincronizarArboles())
                }

                function loopPaseo(o) {
                    if (!u) return;
                    const a = Math.min(.05, (o - m) / 1e3);
                    m = o;
                    let r = 0,
                        n = 0;
                    (C.has("KeyW") || C.has("ArrowUp")) && (r += 1), (C.has("KeyS") || C.has("ArrowDown")) && (r -= 1), (C.has("KeyA") || C.has("ArrowLeft")) && (n -= 1), (C.has("KeyD") || C.has("ArrowRight")) && (n += 1), v.active && (r = -v.dy, n = .6 * v.dx);
                    const i = Math.min(1, e.paseoSuavizado + 2 * a);
                    if (h += (n - h) * i, b += (r - b) * i, Math.abs(h) > .01 && (f.bearing += 90 * h * a), Math.abs(b) > .01) {
                        const o = b * e.paseoVelocidadMs * a,
                            r = f.bearing * Math.PI / 180;
                        f.x += Math.sin(r) * o, f.y -= Math.cos(r) * o
                    }
                    const s = paseoToLngLat(f.x, f.y);
                    actualizarCamaraPaseo(s), sincronizarSombrasPaseo(s, o), d = requestAnimationFrame(loopPaseo)
                }

                function cargarScriptLocal(e) {
                    return document.querySelector(`script[src="${e}"]`) ? Promise.resolve() : new Promise((o, a) => {
                        const r = document.createElement("script");
                        r.src = e, r.onload = o, r.onerror = a, document.body.appendChild(r)
                    })
                }

                function botonCapaFijo(e, o, a) {
                    const r = document.createElement("button");
                    return r.type = "button", r.id = e, r.textContent = o, r.addEventListener("click", () => {
                        if ("1" === r.dataset.listo) return;
                        if ("1" === r.dataset.cargando) return;
                        r.dataset.cargando = "1", r.dataset.autoActivar = "1";
                        const e = r.textContent;
                        r.textContent = "…", cargarScriptLocal(a).catch(() => {
                            delete r.dataset.cargando, delete r.dataset.autoActivar, r.textContent = e, mostrarEstado(t("layerLoadError", "No se ha podido cargar la capa. Inténtalo de nuevo."), "error")
                        })
                    }), r
                }
                s.addEventListener("click", () => {
                    if (null != S) return detenerCaminata(), void mostrarEstado("");
                    if (u && detenerPaseoVirtual(), !("geolocation" in navigator)) return void mostrarEstado(t("errorGeolocation", "Este navegador no permite compartir tu ubicación."), "error");
                    s.classList.add("rs-activo"), s.textContent = t("walkModeStop", "Detener caminata"), mostrarEstado(t("walkModeTracking", "Siguiendo tu ubicación…"));
                    const e = document.createElement("div");
                    e.style.cssText = `width:16px;height:16px;border-radius:50%;background:${leerVar("--sky-deep")||"#0E3B47"};border:3px solid var(--paper);box-shadow:0 0 0 6px ${leerVar("--sky-deep")||"#0E3B47"}33;`, k = new maplibregl.Marker({
                        element: e
                    }), S = navigator.geolocation.watchPosition(e => {
                        const o = e.coords.latitude,
                            a = e.coords.longitude;
                        k._map || k.addTo(i), k.setLngLat([a, o]), i.easeTo({
                            center: [a, o],
                            duration: 600
                        }), P = {
                            lat: o,
                            lon: a
                        }, B && actualizarTramosSombraRuta(), sincronizarArboles()
                    }, () => mostrarEstado(t("locationDenied", "No se ha podido obtener tu ubicación (¿has denegado el permiso?)."), "error"), {
                        enableHighAccuracy: !0,
                        maximumAge: 2e3,
                        timeout: 12e3
                    })
                }), addEventListener("keydown", e => {
                    "Escape" === e.code && u && detenerPaseoVirtual()
                }), l.addEventListener("click", () => {
                    u ? detenerPaseoVirtual() : entrarPaseoVirtual()
                }), window.__rsDetenerPaseoVirtual = detenerPaseoVirtual;
                const M = botonCapaFijo("rsBtnArboles", t("treesBtn", "Árboles"), "js/arboles-globales.js"),
                    L = botonCapaFijo("rsBtnIrradiacion", t("irrLayerBtn", "Irradiación Solar"), "js/irradiacion-solar.js");
                o.append(a, r, s, l, c, M, L), n.appendChild(o), i.on("click", e => {
                    if (!z) return;
                    const {
                        lat: o,
                        lng: a
                    } = e.lngLat;
                    if (y && E) {
                        const e = E,
                            r = {
                                lat: o,
                                lon: a
                            };
                        return i.getSource("puntos-manuales")?.setData(turf.featureCollection([turf.point([e.lon, e.lat]), turf.point([a, o])])), q.value = t("pointMap", "Punto marcado en el mapa"), salirDeModoClick(), manejarBusqueda({
                            ...e
                        }, {
                            ...r,
                            nombre: t("pointMap", "Punto marcado en el mapa")
                        }), void geocodificarInverso(o, a).then(e => {
                            q.value = e
                        })
                    }
                    if (!R) return R = {
                        lat: o,
                        lon: a
                    }, i.getSource("puntos-manuales")?.setData(turf.featureCollection([turf.point([a, o])])), N.value = t("pointMap", "Punto marcado en el mapa"), mostrarEstado(t("clickDestiny", "Origen marcado — haz clic en el destino.")), void geocodificarInverso(o, a).then(e => {
                        N.value = e
                    });
                    const r = R,
                        n = {
                            lat: o,
                            lon: a
                        };
                    i.getSource("puntos-manuales")?.setData(turf.featureCollection([turf.point([r.lon, r.lat]), turf.point([a, o])])), q.value = t("pointMap", "Punto marcado en el mapa"), salirDeModoClick(), manejarBusqueda({
                        ...r,
                        nombre: t("pointMap", "Punto marcado en el mapa")
                    }, {
                        ...n,
                        nombre: t("pointMap", "Punto marcado en el mapa")
                    }), geocodificarInverso(r.lat, r.lon).then(e => {
                        N.value = e
                    }), geocodificarInverso(o, a).then(e => {
                        q.value = e
                    })
                })
            }(),
            function inyectarSolVisual() {
                if (document.getElementById("rsSolVisual")) return;
                const e = document.createElement("style");
                e.id = "rsSolVisualEstilos", e.textContent = "\n      #rsSolVisual{\n        position:absolute; width:34px; height:34px; border-radius:50%;\n        background:radial-gradient(circle, #fff6d8 0%, #ffcf7a 45%, rgba(255,207,122,0) 75%);\n        box-shadow:0 0 22px 10px rgba(255,207,122,0.55);\n        transform:translate(-50%,-50%);\n        pointer-events:none; z-index:4; display:none;\n        transition:left .25s linear, top .25s linear, opacity .25s ease;\n      }\n    ", document.head.appendChild(e);
                const o = document.createElement("div");
                o.id = "rsSolVisual", n.appendChild(o)
            }(),
            function inyectarBadgeSombra() {
                if (document.getElementById("rsShadowBadge")) return;
                const e = document.createElement("style");
                e.id = "rsShadowBadgeEstilos", e.textContent = "\n      #rsShadowBadge{\n        position:absolute; left:50%; transform:translateX(-50%); bottom:12px;\n        z-index:6; display:none; align-items:center; gap:8px;\n        background:rgba(251,250,247,0.94); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);\n        border:1px solid var(--line, rgba(14,59,71,0.14)); border-radius:999px;\n        padding:5px 10px 5px 13px; font-size:10.5px; color:var(--sky-deep, #0E3B47);\n        box-shadow:0 6px 16px rgba(22,35,46,0.16); max-width:calc(100% - 24px);\n        white-space:nowrap;\n      }\n      #rsShadowBadge.rs-visible{ display:inline-flex; }\n      #rsShadowBadgeCerrar{\n        background:transparent; border:none; color:var(--sky-mid, #17788A); font-size:14px;\n        cursor:pointer; line-height:1; padding:0 2px;\n      }\n      #rsShadowBadgeCerrar:hover{ color:var(--ink, #0D1F26); }\n      @media (max-width:480px){ #rsShadowBadge{ font-size:10.5px; bottom:8px; padding:5px 8px 5px 12px; } }\n    ", document.head.appendChild(e);
                const o = document.createElement("div");
                o.id = "rsShadowBadge";
                const a = document.createElement("span");
                a.id = "rsShadowBadgeTexto";
                const r = document.createElement("button");
                r.id = "rsShadowBadgeCerrar", r.type = "button", r.textContent = "×", r.setAttribute("aria-label", "Cerrar"), r.addEventListener("click", () => o.classList.remove("rs-visible")), o.append(a, r), n.appendChild(o)
            }(),
            function conectarTogglesDeCapas() {
                ! function inyectarControlToggleMapaOscuro() {
                    if (document.getElementById("rsMapStyleToggle")) return;
                    const e = document.createElement("style");
                    e.id = "rsMapStyleToggleEstilos", e.textContent = '\n      #rsMapStyleToggle{\n        position:absolute; right:12px; bottom:12px; z-index:5;\n      }\n      #rsMapStyleToggle button{\n        font-family:inherit; font-size:9.5px; letter-spacing:.04em; text-transform:uppercase;\n        font-weight:700; padding:6px 11px; border-radius:999px;\n        border:1px solid var(--line, rgba(14,59,71,0.14));\n        background:rgba(251,250,247,0.92); color:var(--sky-deep, #0E3B47);\n        backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);\n        cursor:pointer; box-shadow:0 3px 10px rgba(22,35,46,0.12); transition:background .15s,border-color .15s;\n      }\n      #rsMapStyleToggle button:hover{ background:var(--accent-soft, rgba(255,107,26,0.16)); border-color:var(--accent, #FF6B1A); }\n      .rs-mapa-oscuro-activo #shadowRouteMap .maplibregl-canvas{\n        filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92) saturate(0.85);\n      }\n      /* Cuando TODA la web está en modo oscuro, el mapa se oscurece solo:\n         si no, queda como un foco blanco en medio de la página */\n      [data-theme="dark"] #shadowRouteMap .maplibregl-canvas{\n        filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92) saturate(0.85);\n      }\n      /* Web oscura + botón pulsado a mano = el usuario pide el mapa claro */\n      [data-theme="dark"] .rs-mapa-oscuro-activo #shadowRouteMap .maplibregl-canvas{\n        filter: none;\n      }\n    ', document.head.appendChild(e);
                    const o = document.createElement("div");
                    o.id = "rsMapStyleToggle";
                    const a = document.createElement("button");
                    a.type = "button", a.id = "rsBtnMapaOscuro", a.textContent = t("darkMapOn", "Mapa oscuro");
                    const sincronizarEtiquetaMapa = () => {
                        const e = "dark" === document.documentElement.getAttribute("data-theme") ? !j : j;
                        a.textContent = e ? t("darkMapOff", "Mapa claro") : t("darkMapOn", "Mapa oscuro")
                    };
                    new MutationObserver(sincronizarEtiquetaMapa).observe(document.documentElement, {
                        attributes: !0,
                        attributeFilter: ["data-theme"]
                    }), a.addEventListener("click", () => {
                        j = !j, n.classList.toggle("rs-mapa-oscuro-activo", j), sincronizarEtiquetaMapa()
                    }), sincronizarEtiquetaMapa(), o.appendChild(a), n.appendChild(o)
                }();
                const o = document.getElementById("rsToggleEdificios"),
                    a = document.getElementById("rsToggleSombras"),
                    r = document.getElementById("rsToggleRuta"),
                    l = document.getElementById("rsToggleSol");
                o?.addEventListener("change", () => {
                    s && i.setLayoutProperty(e.edificiosLayerId, "visibility", o.checked ? "visible" : "none")
                }), a?.addEventListener("change", () => {
                    asegurarActivacionSolar(), recalcularSombrasVisibles(), sincronizarArboles()
                }), r?.addEventListener("change", () => {
                    const e = r.checked ? "visible" : "none";
                    i.setLayoutProperty("capa-ruta", "visibility", e), i.setLayoutProperty("capa-ruta-outline", "visibility", e), i.setLayoutProperty("capa-ruta-glow", "visibility", e), i.setLayoutProperty("capa-ruta-sombra", "visibility", e), i.setLayoutProperty("capa-ruta-sombra-outline", "visibility", e)
                }), l?.addEventListener("change", () => {
                    asegurarActivacionSolar(), actualizarIluminacionSolar()
                })
            }(), setTimeout(() => {
                i.easeTo({
                    pitch: e.pitchInicial,
                    bearing: e.bearingInicial,
                    zoom: e.zoomInicial,
                    duration: e.duracionVueloInicialMs,
                    essential: !0
                })
            }, 150)
    });
    const E = function crearDebounce(e, o) {
        let a = null;
        return (...r) => {
            clearTimeout(a), a = setTimeout(() => e(...r), o)
        }
    }(() => {
        S && !u && (actualizarCacheEdificios(), document.getElementById("rsToggleSombras")?.checked && recalcularSombrasVisibles(), sincronizarArboles())
    }, 220);
    i.on("moveend", E), i.on("move", () => actualizarSolVisualEnMapa());
    let S = !1;

    function asegurarActivacionSolar() {
        S || (S = !0, actualizarCacheEdificios())
    }

    function actualizarCacheEdificios() {
        s && i.getLayer(e.edificiosLayerId) && (l = i.queryRenderedFeatures({
            layers: [e.edificiosLayerId]
        }).slice(0, e.maxEdificiosSombra))
    }

    function unirDosPoligonos(e, o) {
        try {
            const a = turf.union(turf.featureCollection([e, o]));
            if (a) return a
        } catch (e) {}
        try {
            const a = turf.union(e, o);
            if (a) return a
        } catch (e) {}
        return e
    }

    function calcularVolumenSombra(e, o, a) {
        const r = e.geometry.coordinates[0];
        let n = e;
        for (let e = 0; e < r.length - 1; e++) {
            const i = r[e],
                s = r[e + 1],
                l = turf.transformTranslate(turf.point(i), o, a, {
                    units: "kilometers"
                }).geometry.coordinates,
                c = turf.transformTranslate(turf.point(s), o, a, {
                    units: "kilometers"
                }).geometry.coordinates;
            try {
                n = unirDosPoligonos(n, turf.polygon([
                    [i, s, c, l, i]
                ]))
            } catch (e) {
                continue
            }
        }
        return n
    }

    function obtenerHoraEfectiva() {
        return L ? obtenerFechaDelSlider() : new Date
    }
    window.manolitAireHoraEfectiva = () => obtenerHoraEfectiva(), window.manolitAireCentroSol = () => {
        const e = P || i.getCenter();
        return {
            lat: e.lat,
            lon: e.lon ?? e.lng
        }
    };
    let k = 0,
        M = turf.featureCollection([]);
    async function recalcularSombrasVisibles(o) {
        if (!i.getSource("sombras")) return;
        const a = ++k,
            r = o || obtenerHoraEfectiva(),
            n = P || i.getCenter(),
            c = n.lat,
            u = n.lon ?? n.lng,
            d = SunCalc.getPosition(r, c, u);
        if (function actualizarBadgeHoraDorada(e, o, a) {
                const r = document.getElementById("rsGoldenBadge"),
                    n = SunCalc.getPosition(e, o, a),
                    i = 180 * n.altitude / Math.PI;
                let s = null,
                    l = null;
                try {
                    const r = SunCalc.getTimes(e, o, a);
                    s = r.solarNoon.getTime();
                    const n = e.getTime(),
                        i = n >= r.sunrise.getTime() && n <= r.goldenHourEnd.getTime() || n >= r.goldenHour.getTime() && n <= r.sunset.getTime(),
                        c = n >= r.dawn.getTime() && n <= r.sunrise.getTime() || n >= r.sunset.getTime() && n <= r.dusk.getTime();
                    l = i ? "dorada" : c ? "azul" : null
                } catch (e) {}
                r && ("dorada" === l ? (r.textContent = t("goldenHour", "Hora dorada"), r.style.visibility = "visible", r.style.color = "#e7b06a", r.style.background = "#e7b06a22", r.style.borderColor = "#e7b06a55") : "azul" === l ? (r.textContent = t("blueHour", "Hora azul"), r.style.visibility = "visible", r.style.color = "#7fb3c9", r.style.background = "#7fb3c922", r.style.borderColor = "#7fb3c955") : r.style.visibility = "hidden");
                ! function actualizarIndicadorSolar(e, o) {
                    const a = document.getElementById("rsSolPunto"),
                        r = document.getElementById("rsSolGrupo");
                    if (!a || !r) return;
                    if (null == e || e <= 0) return void(r.style.opacity = "0.25");
                    r.style.opacity = "1";
                    const n = 30,
                        i = 30,
                        s = 26,
                        l = Math.max(0, Math.min(90, e)),
                        c = (o ? 180 - l : l) * Math.PI / 180,
                        u = n + s * Math.cos(c),
                        d = i - s * Math.sin(c);
                    a.setAttribute("cx", u.toFixed(1)), a.setAttribute("cy", d.toFixed(1))
                }(i, null == s || e.getTime() <= s)
            }(r, c, u), !document.getElementById("rsToggleSombras")?.checked) return i.getSource("sombras").setData(turf.featureCollection([])), i.getSource("sombras-halo")?.setData(turf.featureCollection([])), void(M = turf.featureCollection([]));
        if (d.altitude <= 0) return i.getSource("sombras").setData(turf.featureCollection([])), i.getSource("sombras-halo")?.setData(turf.featureCollection([])), M = turf.featureCollection([]), void mostrarAvisoSol(t("sunBelow", "El sol está bajo el horizonte a esa hora — no hay sombras que proyectar."));
        if (mostrarAvisoSol(""), !s || !l.length) return i.getSource("sombras").setData(turf.featureCollection([])), i.getSource("sombras-halo")?.setData(turf.featureCollection([])), void(M = turf.featureCollection([]));
        const m = (180 * d.azimuth / Math.PI + 180 + 180) % 360,
            p = [];
        for (let o = 0; o < l.length; o += e.loteSombraSize) {
            if (a !== k) return;
            const r = l.slice(o, o + e.loteSombraSize);
            for (const o of r) try {
                const a = (Number(o.properties.height ?? o.properties.render_height) || e.alturaPorDefectoM) / Math.tan(d.altitude);
                if (!isFinite(a) || a <= 0) continue;
                const r = o.geometry;
                if (!r || "Polygon" !== r.type && "MultiPolygon" !== r.type) continue;
                const n = a / 1e3,
                    i = turf.flatten(turf.feature(r)).features;
                for (const e of i) {
                    const o = calcularVolumenSombra(e, n, m);
                    o && p.push(o)
                }
            } catch (e) {
                continue
            }
            if (a !== k) return;
            i.getSource("sombras")?.setData(turf.featureCollection(p)), o + e.loteSombraSize < l.length && await cederAlNavegador()
        }
        if (a !== k) return;
        const g = turf.featureCollection(p);
        if (i.getSource("sombras")?.setData(g), M = g, p.length <= 160) try {
            const e = turf.buffer(g, 3.5, {
                units: "meters",
                steps: 4
            });
            a === k && i.getSource("sombras-halo")?.setData(e || turf.featureCollection([]))
        } catch (e) {
            i.getSource("sombras-halo")?.setData(turf.featureCollection([]))
        } else i.getSource("sombras-halo")?.setData(turf.featureCollection([]))
    }

    function mostrarAvisoSol(e) {
        const o = document.getElementById("rsSunNote");
        o && (o.textContent = e)
    }
    setInterval(() => {
        !S || L || u || (i.loaded() && recalcularSombrasVisibles(), actualizarIluminacionSolar(), sincronizarArboles())
    }, 6e4);
    let P = null,
        B = null;
    async function actualizarTramosSombraRuta() {
        const e = i.getSource("ruta-sombra");
        if (e) {
            if (!B || !M.features.length) return e.setData(turf.featureCollection([])), void mostrarBadgeSombra(null);
            try {
                const o = turf.lineChunk(B, .01, {
                        units: "kilometers"
                    }),
                    a = o.features.filter(e => {
                        const o = e.geometry.coordinates;
                        return function puntoEnSombra(e) {
                            for (const o of M.features) try {
                                if (turf.booleanPointInPolygon(e, o)) return !0
                            } catch (e) {}
                            return !1
                        }(turf.point(o[Math.floor(o.length / 2)] || o[0]))
                    });
                e.setData(turf.featureCollection(a)), o.features.length ? mostrarBadgeSombra(Math.round(a.length / o.features.length * 100)) : mostrarBadgeSombra(null)
            } catch (o) {
                console.warn("No se ha podido calcular qué tramos de la ruta están en sombra:", o), e.setData(turf.featureCollection([]))
            }
        }
    }

    function calcularAnguloSol(e) {
        const o = P || i.getCenter(),
            a = o.lat,
            r = o.lon ?? o.lng,
            n = SunCalc.getPosition(e || obtenerHoraEfectiva(), a, r);
        return {
            azimutDeg: (180 * n.azimuth / Math.PI + 180) % 360,
            alturaDeg: 180 * n.altitude / Math.PI
        }
    }

    function actualizarIluminacionSolar(e) {
        const o = document.getElementById("rsToggleSol");
        if (!o) return;
        if (!o.checked) return i.setSky(void 0), c = !1, i.setLight({
            anchor: "viewport",
            color: "#ffffff",
            intensity: .35,
            position: [1.5, 0, 40]
        }), void actualizarSolVisualEnMapa();
        const {
            azimutDeg: a,
            alturaDeg: r
        } = calcularAnguloSol(e), n = r <= 0, s = Math.max(0, 90 - Math.max(r, 0));
        i.setLight({
            anchor: "map",
            color: n ? "#3a4a63" : "#fff6e6",
            intensity: n ? .15 : Math.min(1, .35 + r / 90),
            position: [1.5, a, s]
        }), i.setSky({
            "sky-color": n ? "#0a1220" : "#199EF3",
            "sky-horizon-blend": .5,
            "horizon-color": n ? "#2a3a55" : "#ffffff",
            "atmosphere-blend": ["interpolate", ["linear"],
                ["zoom"], 0, 1, 10, 1, 12, .3
            ]
        }), c = !0, actualizarSolVisualEnMapa()
    }

    function actualizarSolVisualEnMapa() {
        const e = document.getElementById("rsSolVisual"),
            o = document.getElementById("rsToggleSol");
        if (!e) return;
        if (!o || !o.checked) return void(e.style.display = "none");
        const {
            azimutDeg: a,
            alturaDeg: r
        } = calcularAnguloSol();
        if (r <= 0) return void(e.style.display = "none");
        const s = n.getBoundingClientRect();
        if (!s.width || !s.height) return;
        const l = (a - i.getBearing()) * Math.PI / 180,
            c = s.width / 2,
            u = .55 * s.height,
            d = .44 * Math.min(s.width, s.height),
            m = Math.min(r, 90) / 90,
            p = c + d * Math.sin(l),
            g = u - d * m * .9 - .04 * s.height;
        e.style.left = `${Math.max(16,Math.min(s.width-16,p))}px`, e.style.top = `${Math.max(16,Math.min(s.height-16,g))}px`, e.style.opacity = String(.55 + .45 * m), e.style.display = "block"
    }

    function mostrarBadgeSombra(e) {
        const o = document.getElementById("rsShadowBadge"),
            a = document.getElementById("rsShadowBadgeTexto");
        o && a && null != e ? (a.textContent = `${e}% ${t("shadeCoverage","del trayecto en sombra")}`, o.classList.add("rs-visible")) : o?.classList.remove("rs-visible")
    }
    let L = !1,
        T = new Date,
        I = null,
        A = null,
        D = null;

    function fechaSolsticio(e) {
        const o = (new Date).getFullYear();
        return "verano" === e ? new Date(o, 5, 21, 12, 0, 0) : new Date(o, 11, 21, 12, 0, 0)
    }

    function minutosDesdeFecha(e) {
        return 60 * e.getHours() + e.getMinutes()
    }

    function obtenerFechaDelSlider() {
        const e = new Date(T),
            o = Number(I?.value ?? minutosDesdeFecha(new Date));
        return e.setHours(Math.floor(o / 60), o % 60, 0, 0), e
    }

    function actualizarEtiquetaTiempo(e) {
        if (!A) return;
        const o = obtenerFechaDelSlider(),
            a = "verano" === e ? t("summerSolstice", "Solsticio de verano") + " — " : "invierno" === e ? t("winterSolstice", "Solsticio de invierno") + " — " : L ? t("simulating", "Simulando") + " — " : t("now", "Ahora") + " — ";
        A.textContent = a + function formatoHora(e) {
            return e.toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit"
            })
        }(o)
    }
    async function aplicarCambioDeHora(e) {
        actualizarEtiquetaTiempo(e);
        try {
            const e = P || i.getCenter();
            window.planetarioNotificarHora?.(obtenerFechaDelSlider(), e.lat, e.lon ?? e.lng)
        } catch (e) {}
        await recalcularSombrasVisibles(), actualizarIluminacionSolar(), await actualizarTramosSombraRuta(), sincronizarArboles()
    }
    let z = !1,
        R = null,
        F = null;
    let j = !1;

    function capturarVista() {
        try {
            i.once("render", () => {
                try {
                    const e = i.getCanvas().toDataURL("image/png"),
                        o = document.createElement("a");
                    o.href = e, o.download = `manolito-aire-${Date.now()}.png`, document.body.appendChild(o), o.click(), o.remove()
                } catch (e) {
                    console.error("No se ha podido exportar la vista como imagen:", e), mostrarEstado(t("captureError", "No se ha podido generar la imagen (limitación del servidor de mapas). Prueba a hacer una captura de pantalla normal."), "error")
                }
            }), i.triggerRepaint()
        } catch (e) {
            console.error("No se ha podido exportar la vista como imagen:", e), mostrarEstado(t("captureError", "No se ha podido generar la imagen (limitación del servidor de mapas). Prueba a hacer una captura de pantalla normal."), "error")
        }
    }
    async function fetchConReintentos(o, a = {}, r = e.fetchRetries) {
        for (let n = 0; n <= r; n++) {
            const i = new AbortController,
                s = setTimeout(() => i.abort(), e.fetchTimeoutMs);
            try {
                const e = await fetch(o, {
                    ...a,
                    signal: i.signal
                });
                if (clearTimeout(s), !e.ok) throw new Error(`HTTP ${e.status}`);
                return await e.json()
            } catch (e) {
                if (clearTimeout(s), n === r) throw e;
                await new Promise(e => setTimeout(e, 600 * (n + 1)))
            }
        }
    }
    async function consultarNominatim(o) {
        const a = new URL(e.nominatimUrl);
        return a.searchParams.set("q", o), a.searchParams.set("format", "json"), a.searchParams.set("limit", "1"), fetchConReintentos(a.toString(), {
            headers: {
                "Accept-Language": "es"
            }
        })
    }
    async function geocodificarInverso(o, a) {
        try {
            const r = new URL(e.nominatimReverseUrl);
            r.searchParams.set("lat", o), r.searchParams.set("lon", a), r.searchParams.set("format", "json");
            const n = await fetchConReintentos(r.toString(), {
                headers: {
                    "Accept-Language": "es"
                }
            }, 1);
            return n?.display_name || `${o.toFixed(5)}, ${a.toFixed(5)}`
        } catch (e) {
            return `${o.toFixed(5)}, ${a.toFixed(5)}`
        }
    }
    async function calcularRutaReal(o, a) {
        const r = `${o.lon},${o.lat};${a.lon},${a.lat}`,
            n = `${e.osrmUrl}/foot/${r}?overview=full&geometries=geojson`;
        try {
            const o = await fetchConReintentos(n);
            if ("Ok" === o?.code && o.routes?.[0]) {
                const a = o.routes[0].distance / 1e3;
                let r = o.routes[0].duration / 60;
                let n = !1;
                return ((r > 0 ? a / (r / 60) : 0) > 9 || r <= 0) && (r = a / e.velocidadCaminandoKmh * 60, n = !0), {
                    geojson: o.routes[0].geometry,
                    distanciaKm: a.toFixed(2),
                    duracionMin: Math.round(r),
                    esReal: !0,
                    duracionEstimada: n
                }
            }
            throw new Error("OSRM no ha devuelto una ruta válida.")
        } catch (e) {
            return console.warn("Routing real no disponible, usando línea directa:", e), {
                geojson: {
                    type: "LineString",
                    coordinates: [
                        [o.lon, o.lat],
                        [a.lon, a.lat]
                    ]
                },
                distanciaKm: null,
                duracionMin: null,
                esReal: !1
            }
        }
    }

    function calcularCoberturaSombra(e, o) {
        if (!o.length) return 0;
        try {
            const a = "Feature" === e.type ? e : turf.feature(e),
                r = turf.lineChunk(a, .015, {
                    units: "kilometers"
                }).features;
            if (!r.length) return 0;
            let n = 0;
            for (const e of r) {
                const a = e.geometry.coordinates,
                    r = turf.point(a[Math.floor(a.length / 2)] || a[0]);
                for (const e of o) try {
                    if (turf.booleanPointInPolygon(r, e)) {
                        n++;
                        break
                    }
                } catch (e) {}
            }
            return n / r.length
        } catch (e) {
            return 0
        }
    }
    async function calcularRutaConPrioridadSombra(o, a) {
        if (!e.priorizarSombra) return calcularRutaReal(o, a);
        if (e.usarRedLocalTermica) try {
            return await calcularRutaDijkstraTermico(o, a)
        } catch (e) {
            console.warn("[Routing] Dijkstra térmico local no disponible, se recurre a OSRM:", e.message)
        }
        try {
            const r = `${o.lon},${o.lat};${a.lon},${a.lat}`,
                n = `${e.osrmUrl}/foot/${r}?overview=full&geometries=geojson&alternatives=true`,
                c = await fetchConReintentos(n);
            if ("Ok" !== c?.code || !c.routes?.length) return calcularRutaReal(o, a);
            const u = c.routes.slice(0, e.maxAlternativasSombra);
            if (1 === u.length) return calcularRutaReal(o, a);
            const d = u.flatMap(e => e.geometry.coordinates);
            if (d.length < 2) return calcularRutaReal(o, a);
            const m = turf.bbox(turf.lineString(d));
            i.jumpTo({
                center: [(m[0] + m[2]) / 2, (m[1] + m[3]) / 2],
                zoom: Math.max(i.getZoom(), 16)
            }), await
            function esperarMapaListo(e = 4e3) {
                return new Promise(o => {
                    let a = !1;
                    const terminar = () => {
                        a || (a = !0, o())
                    };
                    i.once("idle", terminar), setTimeout(terminar, e)
                })
            }(), actualizarCacheEdificios();
            const p = {
                    lat: (o.lat + a.lat) / 2,
                    lon: (o.lon + a.lon) / 2
                },
                g = SunCalc.getPosition(obtenerHoraEfectiva(), p.lat, p.lon);
            let f = [];
            g.altitude > 0 && s && l.length && (f = await async function generarPoligonosSombraPara(o, a) {
                if (!a || a.altitude <= 0) return [];
                const r = (180 * a.azimuth / Math.PI + 180 + 180) % 360,
                    n = [];
                for (const i of o) try {
                    const o = (Number(i.properties.height ?? i.properties.render_height) || e.alturaPorDefectoM) / Math.tan(a.altitude);
                    if (!isFinite(o) || o <= 0) continue;
                    const s = i.geometry;
                    if (!s || "Polygon" !== s.type && "MultiPolygon" !== s.type) continue;
                    const l = o / 1e3,
                        c = turf.flatten(turf.feature(s)).features;
                    for (const e of c) {
                        const o = calcularVolumenSombra(e, l, r);
                        o && n.push(o)
                    }
                } catch (e) {
                    continue
                }
                return n
            }(l, g));
            const b = Math.min(...u.map(e => e.distance / 1e3));
            let h = null;
            for (const o of u) {
                const a = o.distance / 1e3,
                    r = f.length ? calcularCoberturaSombra(o.geometry, f) : 0,
                    n = a <= b * e.maxDetourSombra,
                    i = {
                        ruta: o,
                        distanciaKm: a,
                        cobertura: r,
                        dentroDeMargen: n
                    };
                h ? !n || h.dentroDeMargen ? n === h.dentroDeMargen && (r > h.cobertura + .02 || Math.abs(r - h.cobertura) <= .02 && a < h.distanciaKm) && (h = i) : h = i : h = i
            }
            const y = h.distanciaKm;
            let v = h.ruta.duration / 60;
            let x = !1;
            return ((v > 0 ? y / (v / 60) : 0) > 9 || v <= 0) && (v = y / e.velocidadCaminandoKmh * 60, x = !0), {
                geojson: h.ruta.geometry,
                distanciaKm: y.toFixed(2),
                duracionMin: Math.round(v),
                esReal: !0,
                duracionEstimada: x,
                coberturaSombraPct: f.length ? Math.round(100 * h.cobertura) : null
            }
        } catch (e) {
            return console.warn("Routing con prioridad de sombra no disponible, usando ruta normal:", e), calcularRutaReal(o, a)
        }
    }

    function pintarPanelAQI(e) {
        if (!e) return;
        const o = document.getElementById("rsAqiPlaceholder"),
            a = document.getElementById("rsAqiContent"),
            r = document.getElementById("rsAqiCategory");
        if (!o || !a || !r) return;
        const n = e.us_aqi,
            i = function clasificarAQI(e) {
                return null == e || Number.isNaN(e) ? {
                    etiqueta: t("aqiNoData", "Sin datos"),
                    color: leerVar("--sky-mid")
                } : e <= 50 ? {
                    etiqueta: t("aqiGood", "Buena"),
                    color: leerVar("--breath-good")
                } : e <= 100 ? {
                    etiqueta: t("aqiModerate", "Moderada"),
                    color: leerVar("--breath-mid")
                } : {
                    etiqueta: t("aqiBad", "Mala"),
                    color: leerVar("--breath-bad")
                }
            }(n);
        document.getElementById("rsAqiValue").textContent = null != n ? Math.round(n) : "--";
        const s = document.getElementById("rsAqiCategory");
        s.textContent = i.etiqueta, s.style.color = i.color, s.style.background = i.color + "26", document.getElementById("rsPm25").textContent = null != e.pm2_5 ? `${e.pm2_5} µg/m³` : "--", document.getElementById("rsPm10").textContent = null != e.pm10 ? `${e.pm10} µg/m³` : "--", document.getElementById("rsO3").textContent = null != e.ozone ? `${e.ozone} µg/m³` : "--", document.getElementById("rsNo2").textContent = null != e.nitrogen_dioxide ? `${e.nitrogen_dioxide} µg/m³` : "--", o.style.display = "none", a.style.display = "block"
    }
    let $ = null,
        V = null;
    const N = document.getElementById("rsOrigen"),
        q = document.getElementById("rsDestino"),
        H = document.getElementById("rsBuscarBtn"),
        O = document.getElementById("rsStatus");

    function mostrarEstado(e, o) {
        O.textContent = e, O.style.color = leerVar("error" === o ? "--breath-bad" : "ok" === o ? "--breath-good" : "--sky-mid")
    }

    function ponerCargando(e) {
        H.disabled = e, H.textContent = e ? t("searching", "Buscando…") : t("searchBtn", "Buscar ruta")
    }
    const U = new Map;

    function crearAutocompletado(o, a) {
        const r = document.getElementById(a);
        if (!r) return;
        let n = null,
            i = null,
            s = -1,
            l = [];

        function seleccionarSugerencia(e) {
            o.value = e.display_name, U.set(o, {
                lat: parseFloat(e.lat),
                lon: parseFloat(e.lon),
                nombre: e.display_name,
                texto: e.display_name
            }), r.innerHTML = "", r.style.display = "none", s = -1
        }

        function resaltarActivo() {
            const e = r.querySelectorAll("li[data-idx]");
            e.forEach((e, o) => {
                e.style.background = o === s ? (leerVar("--accent") || "#09ffbd") + "22" : ""
            }), s >= 0 && e[s] && e[s].scrollIntoView({
                block: "nearest"
            })
        }
        o.addEventListener("input", () => {
            U.delete(o), s = -1;
            const a = o.value.trim();
            if (clearTimeout(n), a.length < 3) return r.innerHTML = "", void(r.style.display = "none");
            n = setTimeout(async () => {
                i && i.abort(), i = new AbortController;
                try {
                    const o = new URL(e.nominatimUrl);
                    o.searchParams.set("q", a), o.searchParams.set("format", "json"), o.searchParams.set("limit", "6"), o.searchParams.set("addressdetails", "1"), o.searchParams.set("countrycodes", "es");
                    const n = await fetch(o.toString(), {
                        headers: {
                            "Accept-Language": "es"
                        },
                        signal: i.signal
                    });
                    ! function pintarSugerencias(e, o) {
                        if (l = [], !e || 0 === e.length) return r.innerHTML = `<li class="rs-sug-empty">${t("noResults","Sin resultados")}</li>`, void(r.style.display = "block");
                        e = function reordenarPorCiudadEscrita(e, o) {
                            const a = o.toLowerCase();
                            return [...e].sort((e, o) => {
                                const r = (e.address?.city || e.address?.town || e.address?.village || "").toLowerCase(),
                                    n = (o.address?.city || o.address?.town || o.address?.village || "").toLowerCase(),
                                    i = r && a.includes(r) ? 1 : 0;
                                return (n && a.includes(n) ? 1 : 0) - i
                            })
                        }(e, o), l = e, s = -1, r.innerHTML = e.map((e, o) => {
                            const a = e.address?.city || e.address?.town || e.address?.village || e.address?.municipality || "";
                            return `<li data-idx="${o}">\n            <span class="rs-sug-linea1">${e.display_name.split(",")[0]}</span>\n            <span class="rs-sug-linea2">${a?a+" — ":""}${e.address?.state||""}</span>\n          </li>`
                        }).join(""), r.style.display = "block", r.querySelectorAll("li[data-idx]").forEach(o => {
                            o.addEventListener("click", () => seleccionarSugerencia(e[Number(o.dataset.idx)]))
                        })
                    }(await n.json(), a)
                } catch (e) {
                    "AbortError" !== e.name && (r.innerHTML = "")
                }
            }, 350)
        }), o.addEventListener("keydown", e => {
            "none" !== r.style.display && l.length > 0 && ("ArrowDown" === e.key ? (e.preventDefault(), s = (s + 1) % l.length, resaltarActivo()) : "ArrowUp" === e.key ? (e.preventDefault(), s = (s - 1 + l.length) % l.length, resaltarActivo()) : "Enter" === e.key && s >= 0 ? (e.preventDefault(), e.stopImmediatePropagation(), seleccionarSugerencia(l[s])) : "Escape" === e.key && (r.style.display = "none", s = -1))
        }), document.addEventListener("click", e => {
            e.target === o || r.contains(e.target) || (r.style.display = "none")
        })
    }
    async function resolverPunto(e) {
        const o = U.get(e),
            a = e.value.trim();
        return o && o.texto === a ? o : async function geocodificar(e) {
            const o = [e, `${e}, España`, e.replace(/\s*\d+\s*$/, "").trim(), `${e.replace(/\s*\d+\s*$/,"").trim()}, España`].filter((e, o, a) => e && a.indexOf(e) === o);
            for (const e of o) {
                try {
                    const o = await consultarNominatim(e);
                    if (o && o.length > 0) return {
                        lat: parseFloat(o[0].lat),
                        lon: parseFloat(o[0].lon),
                        nombre: o[0].display_name
                    }
                } catch (e) {}
                await new Promise(e => setTimeout(e, 350))
            }
            throw new Error(`${t("notFound","No se ha encontrado")}: "${e}". ${t("tryFormat","Prueba a escribirla como calle, número, ciudad")}.`)
        }(a)
    }
    async function manejarBusqueda(e, o) {
        if (e && o) return ejecutarBusquedaConPuntos(e, o);
        const a = N.value.trim(),
            r = q.value.trim();
        if (a && r) {
            ponerCargando(!0), mostrarEstado(t("geocoding", "Geocodificando direcciones…"));
            try {
                const [e, o] = await Promise.all([resolverPunto(N), resolverPunto(q)]);
                await ejecutarBusquedaConPuntos(e, o)
            } catch (e) {
                console.error(e), mostrarEstado(e.message || t("errorSearch", "Error al buscar la ruta. Inténtalo de nuevo."), "error"), ponerCargando(!1)
            }
        } else mostrarEstado(t("fillBoth", "Introduce origen y destino."), "error")
    }
    async function ejecutarBusquedaConPuntos(o, a) {
        ponerCargando(!0), mostrarEstado(t("calculating", "Calculando ruta real por calles…"));
        try {
            const r = await calcularRutaConPrioridadSombra(o, a);
            i.getSource("ruta").setData(turf.feature(r.geojson)), i.getSource("puntos-manuales")?.setData(turf.featureCollection([])), i.getSource("precision-ubicacion")?.setData(turf.featureCollection([])),
                function pintarMarcadores(e, o) {
                    $ && $.remove(), V && V.remove();
                    const pin = e => {
                        const o = document.createElement("div");
                        return o.style.cssText = `width:16px;height:16px;border-radius:50%;background:${e};border:3px solid var(--paper);box-shadow:0 0 0 2px ${e}66;`, o
                    };
                    $ = new maplibregl.Marker({
                        element: pin(leerVar("--accent") || "#00f2ff")
                    }).setLngLat([e.lon, e.lat]).setPopup((new maplibregl.Popup).setHTML(`<b>${t("origin","Origen")}</b><br>${e.nombre}`)).addTo(i), V = new maplibregl.Marker({
                        element: pin(leerVar("--sky-deep") || "#0E3B47")
                    }).setLngLat([o.lon, o.lat]).setPopup((new maplibregl.Popup).setHTML(`<b>${t("destiny","Destino")}</b><br>${o.nombre}`)).addTo(i)
                }(o, a);
            const n = r.geojson.coordinates.reduce((e, o) => e.extend(o), new maplibregl.LngLatBounds(r.geojson.coordinates[0], r.geojson.coordinates[0]));
            if (i.fitBounds(n, {
                    padding: 70,
                    maxZoom: 17,
                    duration: 800
                }), P = {
                    lat: o.lat,
                    lon: o.lon
                }, B = r.esReal ? turf.feature(r.geojson) : null, asegurarActivacionSolar(), await recalcularSombrasVisibles(), actualizarIluminacionSolar(), await actualizarTramosSombraRuta(), sincronizarArboles(), r.esReal) {
                const e = r.duracionEstimada ? ` (${t("routeEstimated","tiempo estimado a paso normal")})` : "",
                    o = null != r.coberturaSombraPct ? ` · ${r.coberturaSombraPct}% ${t("shadeCoverage","en sombra")}` : "";
                mostrarEstado(`${t("routeReal","Ruta real")}: ${r.distanciaKm} km · ${r.duracionMin} ${t("minWalk","min a pie")}${e}${o}.`, "ok"), mostrarBadgeSombra(r.coberturaSombraPct)
            } else mostrarEstado(t("routeFallback", "No se pudo calcular la ruta por calles (servidor de rutas ocupado) — mostrando línea directa."), "error"), mostrarBadgeSombra(null);
            try {
                pintarPanelAQI(await async function obtenerCalidadAire(o, a) {
                    const r = new URL(e.airQualityUrl);
                    r.searchParams.set("latitude", o), r.searchParams.set("longitude", a), r.searchParams.set("current", ["us_aqi", "pm2_5", "pm10", "ozone", "nitrogen_dioxide"].join(",")), r.searchParams.set("timezone", "auto");
                    const n = await fetchConReintentos(r.toString());
                    if (!n || !n.current) throw new Error("La API de calidad del aire no ha devuelto datos.");
                    return n.current
                }(o.lat, o.lon))
            } catch (e) {
                console.error(e), mostrarEstado(t("airDataUnavailable", "No se ha podido cargar la calidad del aire ahora mismo (demasiadas peticiones). Prueba de nuevo en unos segundos."), "error")
            }
        } catch (e) {
            console.error(e), mostrarEstado(e.message || t("errorSearch", "Error al buscar la ruta. Inténtalo de nuevo."), "error")
        } finally {
            ponerCargando(!1)
        }
    }
    crearAutocompletado(N, "rsSugerenciasOrigen"), crearAutocompletado(q, "rsSugerenciasDestino"), ponerCargando(!1), N && !N.value && N.setAttribute("placeholder", t("originPlaceholder", N.getAttribute("placeholder"))), q && !q.value && q.setAttribute("placeholder", t("destinationPlaceholder", q.getAttribute("placeholder")));
    const _ = document.getElementById("rsRouteMapTitle");
    _ && (_.textContent = t("routeMapTitle", _.textContent)), H.addEventListener("click", manejarBusqueda), [N, q].forEach(e => {
        e.addEventListener("keydown", e => {
            "Enter" === e.key && (e.preventDefault(), manejarBusqueda())
        })
    }), document.addEventListener("langChanged", () => {
        F && (F.textContent = t("pickMap", "Elegir en el mapa"));
        const e = document.getElementById("rsBtnMyLocation");
        e && (e.textContent = t("myLocation", "Mi ubicación"));
        const o = document.getElementById("rsBtnWalk");
        o && !o.classList.contains("rs-activo") && (o.textContent = t("walkModeStart", "Iniciar caminata"));
        const a = document.getElementById("rsBtnPaseo");
        a && (a.textContent = u ? t("virtualWalkStop", "Salir del paseo") : t("virtualWalkStart", "Paseo virtual 3D"));
        const r = document.getElementById("rsBtnMapaOscuro");
        if (r) {
            const e = "dark" === document.documentElement.getAttribute("data-theme") ? !j : j;
            r.textContent = e ? t("darkMapOff", "Mapa claro") : t("darkMapOn", "Mapa oscuro")
        }
        const n = document.getElementById("rsEyebrowSol");
        n && (n.textContent = t("sunPosition", "Posición solar"));
        const i = document.getElementById("rsBtnCapturar");
        i && (i.textContent = t("captureView", "Capturar vista"));
        const s = document.getElementById("rsBtnAhora");
        s && (s.textContent = t("now", "Ahora"));
        const l = document.getElementById("rsBtnVerano");
        l && (l.textContent = t("btnSummer", "Verano"));
        const c = document.getElementById("rsBtnInvierno");
        c && (c.textContent = t("btnWinter", "Invierno")), ponerCargando(!1), A && actualizarEtiquetaTiempo(!1), N && !N.value && N.setAttribute("placeholder", t("originPlaceholder", N.getAttribute("placeholder"))), q && !q.value && q.setAttribute("placeholder", t("destinationPlaceholder", q.getAttribute("placeholder")));
        const d = document.getElementById("rsRouteMapTitle");
        d && (d.textContent = t("routeMapTitle", d.textContent));
        const m = document.getElementById("rsBtnReset");
        m && (m.textContent = t("resetBtn", "Reiniciar"))
    }), i.on("load", () => {
        ! function inyectarJoystick() {
            if (document.getElementById("rsJoystick")) return;
            const e = document.createElement("div");
            e.id = "rsJoystick";
            const o = document.createElement("div");
            o.id = "rsJoystickKnob", e.appendChild(o), n.appendChild(e), e.addEventListener("pointerdown", a => {
                if (!u) return;
                a.preventDefault(), e.setPointerCapture(a.pointerId), v.active = !0, v.pointerId = a.pointerId;
                const r = e.getBoundingClientRect(),
                    n = r.left + r.width / 2,
                    i = r.top + r.height / 2;
                v.startX = n, v.startY = i, v.dx = 0, v.dy = 0, o.style.transform = "translate(-50%, -50%) translate(0px, 0px)", e.classList.add("rs-visible")
            }), e.addEventListener("pointermove", e => {
                if (!u || !v.active || e.pointerId !== v.pointerId) return;
                const a = e.clientX - v.startX,
                    r = e.clientY - v.startY,
                    n = Math.sqrt(a * a + r * r),
                    i = n > 28 ? 28 / n : 1;
                v.dx = a * i / 28, v.dy = r * i / 28, o.style.transform = `translate(-50%, -50%) translate(${a*i}px, ${r*i}px)`
            });
            const limpiarJoystick = () => {
                v.active = !1, v.dx = 0, v.dy = 0, o.style.transform = "translate(-50%, -50%) translate(0px, 0px)"
            };
            e.addEventListener("pointerup", limpiarJoystick), e.addEventListener("pointercancel", limpiarJoystick), e.addEventListener("lostpointercapture", limpiarJoystick)
        }()
    }), r.addEventListener("pointerdown", e => {
        if (u && !e.target.closest("#rsJoystick")) {
            y.set(e.pointerId, {
                x: e.clientX,
                y: e.clientY
            });
            try {
                r.setPointerCapture(e.pointerId)
            } catch (e) {}
        }
    }), r.addEventListener("pointermove", e => {
        if (!u) return;
        const o = y.get(e.pointerId);
        if (!o) return;
        const a = e.clientX - o.x;
        f.bearing -= .3 * a, o.x = e.clientX, o.y = e.clientY
    }), r.addEventListener("pointerup", e => y.delete(e.pointerId)), r.addEventListener("pointercancel", e => y.delete(e.pointerId))
}();