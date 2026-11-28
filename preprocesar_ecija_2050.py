# -*- coding: utf-8 -*-
"""
preprocesar_ecija_2050.py — Manolit∞ Aire
==========================================================================
Genera la cartografía de Clima 2050 de Écija (INE 41039) y la integra en el
archivo maestro (data/andalucia_clima_2050.geojson) y en su versión ligera
(data/andalucia_clima_2050_ligero.geojson), dejando además el archivo
independiente data/riesgo-termico-2050-ecija.geojson (mismo patrón que los
de Bollullos de la Mitación y Mairena del Aljarafe).

GEOMETRÍA (real, oficial): secciones censales del INE, servidas por su
GeoServer (https://www.ine.es/geoserver/wfs, capa Secciones_2025) filtradas
por CUSEC LIKE '41039%'. El INE devuelve 35 elementos: 30 secciones
(TIPO=SECCIONADO) y 5 agregados de distrito (TIPO=DISTRITO, CSEC=000) que se
DESCARTAN. La respuesta queda en caché (data/_ine_secciones_41039_cache.json)
para poder reejecutar sin volver a pedirla.

NOMBRE DE ÁREA ("distrito - barrio"):
  - Écija tiene una división administrativa en 4 distritos (DC, D1, D2, D3;
    según Wikipedia) PERO ningún organismo publica sus límites en formato
    digital (ni INE, ni IECA, ni el nodo IDEAndalucía del Ayuntamiento, ni
    OpenStreetMap tienen esa división). Por eso el prefijo "Distrito 0X" es
    el DISTRITO CENSAL del INE (CDIS dentro del CUSEC), que sí es oficial y
    verificable; NO corresponde a los códigos administrativos DC/D1/D2/D3.
  - Barrios: los 8 barrios reconocidos del listado municipal (Casco Antiguo,
    El Valle, Las Moreras, La Zarzuela, El Balcón de Écija-La Alhambra,
    La Paz, La Almazara, La Guita) no tienen geometría pública. Cada uno se
    ancla a un punto REAL y documentado de OpenStreetMap/Nominatim (ver la
    tabla ANCLAS: parque, plaza o calle homónima; "La Guita" es el nombre
    popular de la barriada de Santa Ana, según prensa local). Una sección
    recibe el nombre del barrio si el ancla cae dentro de su polígono o es
    el ancla más cercana a su punto representativo a 700 m o menos, y solo
    en secciones urbanas (< 1 km²: las dos secciones rurales del término —
    el diseminado este y el resto del campo, 853 y 125 km² — quedan fuera).
  - Si no hay barrio asignable, el área es "Sección <CUSEC> - Distrito 0X"
    (mismo criterio que las secciones de Sevilla en el maestro).

RIESGO: EMULADO, NO son datos reales. risk_level = hash del CUSEC mod 4 con
la MISMA función hash del frontend (h = h*31 + código, sin signo), idéntica
a la usada en Bollullos de la Mitación. El frontend deriva los días >40 °C.

NINGÚN DATO SE INVENTA: los nombres de barrio son una APROXIMACIÓN espacial
documentada ancla a ancla; donde no hay barrio verificable se usa el código
de sección censal. Todo queda declarado en la metadata del GeoJSON.

CÓMO SE EJECUTA (en tu máquina, con red la primera vez):
    pip install shapely
    python preprocesar_ecija_2050.py                # todo: ecija + maestro + ligero
    python preprocesar_ecija_2050.py --solo-ecija   # solo data/riesgo-termico-2050-ecija.geojson
    python preprocesar_ecija_2050.py --sin-cache    # fuerza la descarga al INE
==========================================================================
"""

import argparse
import json
import math
import os
import sys
import urllib.parse
import urllib.request

try:
    from shapely.geometry import shape, Point
except ImportError:  # pragma: no cover
    print('Falta shapely. Instala con: pip install shapely', file=sys.stderr)
    raise

WFS_INE = 'https://www.ine.es/geoserver/wfs'
CAPA_INE = 'WMS_INE_SECCIONES_G01:Secciones_2025'
UA = 'manolito-aire/1.0 (manolitoaire.com; preproceso offline)'
CACHE_INE = 'data/_ine_secciones_41039_cache.json'
SALIDA_ECIJA = 'data/riesgo-termico-2050-ecija.geojson'
MAESTRO = 'data/andalucia_clima_2050.geojson'
LIGERO = 'data/andalucia_clima_2050_ligero.geojson'

MUNICIPIO = 'Écija'
# Las secciones urbanas de Écija miden 0,03-0,51 km²; las rurales 125-853 km².
AREA_URBANA_MAX_KM2 = 1.0
# Ancla más lejana aceptada para dar nombre de barrio a una sección urbana.
DISTANCIA_ANCLA_MAX_M = 700.0

# Anclas REALES de los 8 barrios del listado municipal. Cada una es un
# elemento verificable de OpenStreetMap/Nominatim homónimo del barrio (o su
# nombre popular documentado), con su fuente. NO son límites de barrio.
ANCLAS = [
    # barrio, lon, lat, fuente del ancla
    ('Casco Antiguo', -5.0792630, 37.5411551,
     'Plaza de España (Nominatim, place=square), corazón del centro histórico'),
    ('El Valle', -5.0777347, 37.5557328,
     'OSM nodo 1241635270, place=locality "El Valle"'),
    ('Las Moreras', -5.08909, 37.54824,
     'OSM vía 258868381, leisure=park "Parque de las Moreras"'),
    ('La Zarzuela', -5.09010, 37.54342,
     'OSM vía 559901429, place=square "Plaza de la Zarzuela"'),
    ('El Balcón de Écija-La Alhambra', -5.09084, 37.53964,
     'OSM vía 258867597, highway=residential "Calle Alhambra"'),
    ('La Paz', -5.0888300, 37.5363730,
     'Nominatim, leisure=park "Parque de la Paz"'),
    ('La Almazara', -5.08730, 37.53570,
     'OSM vía 258870521, highway=living_street "Calle Almazara"'),
    ('La Guita', -5.07449, 37.54301,
     'OSM vía 553643501 "Iglesia de Santa Ana": la barriada de Santa Ana es '
     'popularmente conocida como "La Guita" (ecijaweb.com 18-01-2022; '
     'ecijaldia.es 30-10-2025)'),
]

NIVELES = ['Bajo', 'Medio', 'Alto', 'Crítico']


# ---------------------------------------------------------------------------
# INE: descarga con caché
# ---------------------------------------------------------------------------
def descargar_secciones(ruta_cache, sin_cache=False):
    """FeatureCollection crudo del INE (35 elementos: 30 secciones + 5
    agregados de distrito). Usa la caché si existe; --sin-cache fuerza la
    descarga."""
    if not sin_cache and os.path.exists(ruta_cache):
        with open(ruta_cache, encoding='utf-8') as f:
            return json.load(f)
    params = {
        'service': 'WFS', 'version': '2.0.0', 'request': 'GetFeature',
        'typename': CAPA_INE, 'outputFormat': 'application/json',
        'srsName': 'EPSG:4326', 'CQL_FILTER': "CUSEC LIKE '41039%'",
    }
    url = WFS_INE + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        coleccion = json.loads(r.read().decode('utf-8'))
    with open(ruta_cache, 'w', encoding='utf-8') as f:
        json.dump(coleccion, f, ensure_ascii=False)
    return coleccion


# ---------------------------------------------------------------------------
# Asignación de barrios
# ---------------------------------------------------------------------------
def _area_km2(geom, lat=37.54):
    """Área aproximada en km² a partir de grados (suficiente para separar el
    tejido urbano de las secciones rurales; no se publica)."""
    return geom.area * (111.32 ** 2) * math.cos(math.radians(lat))


def _dist_m(lon1, lat1, lon2, lat2):
    dx = (lon1 - lon2) * 88900.0 * math.cos(math.radians(37.54))
    dy = (lat1 - lat2) * 111000.0
    return math.hypot(dx, dy)


def asignar_barrio(geom):
    """Nombre del barrio de la sección o None si no hay ancla verificable.

    Reglas, en este orden:
      1. Sección rural (>= 1 km²): None siempre (el diseminado este y el
         resto del término NO son ningún barrio urbano).
      2. Ancla(s) dentro del polígono: gana la más cercana al punto
         representativo (La Paz y La Almazara comparten sección).
      3. Ancla más cercana al punto representativo a <= 700 m.
      4. Nada: None y el área cae al código de sección.
    """
    if _area_km2(geom) >= AREA_URBANA_MAX_KM2:
        return None
    rp = geom.representative_point()
    dentro = [a for a in ANCLAS if geom.covers(Point(a[1], a[2]))]
    if dentro:
        return min(dentro, key=lambda a: _dist_m(rp.x, rp.y, a[1], a[2]))[0]
    candidata = min(ANCLAS, key=lambda a: _dist_m(rp.x, rp.y, a[1], a[2]))
    if _dist_m(rp.x, rp.y, candidata[1], candidata[2]) <= DISTANCIA_ANCLA_MAX_M:
        return candidata[0]
    return None


# ---------------------------------------------------------------------------
# Riesgo EMULADO (mismo método que Bollullos de la Mitación)
# ---------------------------------------------------------------------------
def hash_texto(t):
    """Copia EXACTA del hashTexto de js/clima-2050.js (h*31+c, sin signo)."""
    h = 0
    for ch in t:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return h


def risk_level(cusec):
    return hash_texto(cusec) % 4


# ---------------------------------------------------------------------------
def construir_features_ecija(coleccion_ine):
    """Lista de (feature_master, aviso) con EXACTAMENTE municipio/area/
    risk_level, como exige el maestro."""
    features = []
    n_barrio = 0
    for f in coleccion_ine.get('features', []):
        p = f.get('properties', {})
        if p.get('TIPO') != 'SECCIONADO':
            continue  # los TIPO=DISTRITO (CSEC=000) son agregados, no secciones
        cusec = str(p.get('CUSEC') or '').strip()
        cdis = str(p.get('CDIS') or '').strip()
        if not (cusec.isdigit() and cdis.isdigit()):
            continue
        geom = shape(f['geometry'])
        barrio = asignar_barrio(geom)
        if barrio:
            area = f'Distrito {cdis} - {barrio}'
            n_barrio += 1
        else:
            area = f'Sección {cusec} - Distrito {cdis}'
        features.append({
            'type': 'Feature',
            'properties': {
                'municipio': MUNICIPIO,
                'area': area,
                'risk_level': risk_level(cusec),
            },
            'geometry': f['geometry'],
        })
    features.sort(key=lambda f: f['properties']['area'])
    return features, n_barrio


def redondear(coords, n=5):
    if isinstance(coords[0], (int, float)):
        return [round(coords[0], n), round(coords[1], n)]
    return [redondear(c, n) for c in coords]


def integrar(features, ruta, ligero=False):
    """Añade Écija al maestro (o al ligero) de forma idempotente: primero
    quita cualquier feature de Écija que hubiera, luego añade las nuevas."""
    with open(ruta, encoding='utf-8') as f:
        coleccion = json.load(f)
    clave_mun = 'm' if ligero else 'municipio'
    coleccion['features'] = [f for f in coleccion.get('features', [])
                             if f.get('properties', {}).get(clave_mun) != MUNICIPIO]
    for f in features:
        if ligero:
            coleccion['features'].append({
                'type': 'Feature',
                'properties': {'m': MUNICIPIO, 'a': f['properties']['area'],
                               'r': f['properties']['risk_level']},
                'geometry': {'type': f['geometry']['type'],
                             'coordinates': redondear(f['geometry']['coordinates'])},
            })
        else:
            coleccion['features'].append(f)
    meta = coleccion.setdefault('metadata', {})
    meta['origen'] = (
        'Geometría real INE: 521 secciones censales de Sevilla (vía '
        'ctafur/sevillaGeojson, GPL-3.0), 9 áreas estadísticas de Mairena del '
        'Aljarafe (secciones INE 41059 agrupadas según PMUS/PMVS 2024-2029), '
        '6 secciones censales de Bollullos de la Mitación (INE 41016) y 30 '
        'secciones censales de Écija (INE 41039, WFS Secciones_2025).'
    )
    if ligero:
        meta['n'] = len(coleccion['features'])
    with open(ruta, 'w', encoding='utf-8') as f:
        json.dump(coleccion, f, ensure_ascii=False, separators=(',', ':'))
    return len(coleccion['features'])


def main():
    ap = argparse.ArgumentParser(description='Genera el GeoJSON de Clima 2050 de Écija (41039) y lo integra en el maestro y su versión ligera.')
    ap.add_argument('--solo-ecija', action='store_true', help='no toca el maestro ni el ligero')
    ap.add_argument('--sin-cache', action='store_true', help='fuerza la descarga al INE')
    ap.add_argument('--cache', default=CACHE_INE)
    args = ap.parse_args()

    coleccion_ine = descargar_secciones(args.cache, args.sin_cache)
    features, n_barrio = construir_features_ecija(coleccion_ine)
    if len(features) != 30:
        sys.exit(f'Esperaba 30 secciones censales de Écija y salen {len(features)}: revisa la respuesta del INE.')

    salida = {
        'type': 'FeatureCollection',
        'metadata': {
            'origen': 'Geometría real: 30 secciones censales de Écija (INE, GeoServer WFS Secciones_2025, municipio 41039; se descartan los 5 agregados TIPO=DISTRITO).',
            'areas': ('Écija tiene división administrativa en 4 distritos (DC, D1, D2, D3) SIN límites digitales '
                      'públicos: el prefijo "Distrito 0X" es el DISTRITO CENSAL del INE (CDIS del CUSEC), no el '
                      'administrativo. Los 8 barrios del listado municipal se anclan a puntos reales de OSM/'
                      'Nominatim homónimos (tabla ANCLAS del script); una sección urbana (<1 km²) toma el barrio '
                      'cuyo ancla cae dentro de su polígono o el más cercano a <=700 m de su punto representativo. '
                      'Sin barrio verificable: "Sección <CUSEC> - Distrito 0X".'),
            'riesgo': ('EMULADO: risk_level 0-3 por hash determinista del CUSEC (h*31+c mod 4), igual que '
                       'Bollullos de la Mitación; los días >40 °C los deriva el frontend. NO son datos reales.'),
            'propiedades': 'municipio (Écija), area (Distrito censal - barrio, o Sección CUSEC - Distrito), risk_level (0=Bajo,1=Medio,2=Alto,3=Crítico)',
        },
        'features': features,
    }
    with open(SALIDA_ECIJA, 'w', encoding='utf-8') as f:
        json.dump(salida, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{SALIDA_ECIJA}: {len(features)} secciones ({n_barrio} con barrio, {len(features) - n_barrio} por código)')

    if not args.solo_ecija:
        total_m = integrar(features, MAESTRO, ligero=False)
        total_l = integrar(features, LIGERO, ligero=True)
        print(f'{MAESTRO}: {total_m} polígonos')
        print(f'{LIGERO}: {total_l} polígonos (n actualizado)')

    niveles = {}
    for f in features:
        niveles[f['properties']['risk_level']] = niveles.get(f['properties']['risk_level'], 0) + 1
    print('risk_level:', {NIVELES[k]: v for k, v in sorted(niveles.items())})


if __name__ == '__main__':
    main()
