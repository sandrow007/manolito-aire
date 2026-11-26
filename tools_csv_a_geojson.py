# -*- coding: utf-8 -*-
"""
Convierte el CSV oficial "Parques_y_Jardines_Inventario_de_Arboles_sevilla.csv"
(ayuntamiento de Sevilla) a GeoJSON para js/arboles-sevilla.js.

- Las X,Y del CSV están en UTM huso 30N sobre ETRS89 => EPSG:25830
  (Sevilla: lon ~ -6.0, lat ~ 37.38; huso 30 = 6E-0W. El 29N daría
  coordenadas fuera de Sevilla, se verifica abajo).
- Filtra árboles cuyo punto cae a menos de MIN_DIST_M de un árbol ya
  existente en OpenStreetMap (descargado de Overpass para toda Sevilla),
  para no dibujar el mismo árbol dos veces (OSM + inventario oficial).
"""
import csv, json, math, sys, time
from pyproj import Transformer

CSV = 'Parques_y_Jardines_Inventario_de_Arboles_sevilla.csv'
SALIDA = 'data/arboles-inventario-sevilla.geojson'
OSM_JSON = 'data/arboles-osm-sevilla.json'

MIN_DIST_M = 7.0   # radio anti-duplicado frente a OSM

t = Transformer.from_crs('EPSG:25830', 'EPSG:4326', always_xy=True)

# ---------------------------------------------------------------------------
# 1. Árboles OSM: nodo natural=tree en el bbox de Sevilla (vía Overpass)
# ---------------------------------------------------------------------------
BBOX = '-6.12,37.28,-5.80,37.46'  # S,W,N,E alrededor de Sevilla

def descargar_osm():
    import urllib.request, urllib.parse
    query = ('[out:json][timeout:120];'
             'node["natural"="tree"](%s);out body;' % BBOX)
    urls = [
        '/arboles-proxy-test',  # no existe: lo dejamos por si hay proxy local
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
    ]
    datos = None
    for url in urls[1:]:  # el primero no existe, se salta
        try:
            print('Probando', url)
            req = urllib.request.Request(
                url,
                data=('data=' + urllib.parse.quote(query)).encode('utf-8'),
                headers={'Content-Type': 'application/x-www-form-urlencoded',
                         'User-Agent': 'manolito-aire/1.0 (convertidor CSV)'}
            )
            with urllib.request.urlopen(req, timeout=180) as r:
                datos = json.load(r)
            if datos.get('elements'):
                print('OK:', len(datos['elements']), 'árboles OSM')
                break
        except Exception as e:
            print('  fallo:', e)
            datos = None
    if datos is None:
        sys.exit('No se pudo descargar OSM; aborta para no duplicar árboles.')
    with open(OSM_JSON, 'w', encoding='utf-8') as f:
        json.dump(datos, f)
    return datos

try:
    with open(OSM_JSON, encoding='utf-8') as f:
        osm = json.load(f)
    print('OSM leído de caché local')
except Exception:
    osm = descargar_osm()

osm_pts = []
for el in osm.get('elements', []):
    if el.get('type') == 'node' and el.get('lat') is not None:
        osm_pts.append((el['lon'], el['lat']))
print('Árboles OSM en Sevilla:', len(osm_pts))

# Rejilla espacial para no comparar contra los ~40k puntos de OSM uno a uno
CEL = 0.004  # ~440 m
rejilla = {}
for lon, lat in osm_pts:
    rejilla.setdefault((int(lat / CEL), int(lon / CEL)), []).append((lon, lat))

def hay_osm_cerca(lon, lat):
    cy, cx = int(lat / CEL), int(lon / CEL)
    # radio 7 m << tamaño de celda; mirar 3x3 basta
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            for plon, plat in rejilla.get((cy + dy, cx + dx), ()):
                d = math.hypot((plon - lon) * math.cos(lat * math.pi / 180) * 111320,
                               (plat - lat) * 110540)
                if d < MIN_DIST_M:
                    return True
    return False

# ---------------------------------------------------------------------------
# 2. CSV -> GeoJSON
# ---------------------------------------------------------------------------
features = []
total = saltos_coord = duplicados = sin_especie = 0
especies = {}

with open(CSV, encoding='utf-8-sig', newline='') as f:
    lector = csv.DictReader(f)
    for fila in lector:
        total += 1
        try:
            x = float(fila['X']); y = float(fila['Y'])
        except (ValueError, KeyError):
            saltos_coord += 1
            continue
        lon, lat = t.transform(x, y)
        # Sanidad: debe caer dentro del bbox de Sevilla
        if not (-6.12 <= lon <= -5.80 and 37.28 <= lat <= 37.46):
            saltos_coord += 1
            continue
        especie = (fila.get('ESPECIE') or '').strip()
        # Registros sin árbol real: alcorque vacío / tocón tras poda.
        if especie.lower().startswith(('marra', 'toc')) or 'vacio' in especie.lower():
            saltos_coord += 1
            continue
        if not especie:
            sin_especie += 1
        altura = None
        try:
            altura = float((fila.get('ALTURA') or '').strip())
        except ValueError:
            pass
        if hay_osm_cerca(lon, lat):
            duplicados += 1
            continue
        especies[especie or '(sin especie)'] = especies.get(especie or '(sin especie)', 0) + 1
        features.append({
            'type': 'Feature',
            'geometry': {'type': 'Point', 'coordinates': [round(lon, 6), round(lat, 6)]},
            'properties': {
                'species': especie or None,
                'altura': altura,
                'perimetro': (fila.get('PERIMETRO') or '').strip() or None,
                'distrito': (fila.get('DISTRITO') or '').strip() or None,
            },
        })

geojson = {
    'type': 'FeatureCollection',
    'name': 'arboles-inventario-sevilla',
    'attribution': 'Ayuntamiento de Sevilla, Inventario de Árboles de Parques y Jardines',
    'features': features,
}
with open(SALIDA, 'w', encoding='utf-8') as f:
    # separadores compactos y claves cortas: el GeoJSON lo consume
    # js/arboles-sevilla.js, que solo lee estas 4 claves. Sin espacios ni
    # saltos el archivo baja de ~55 MB a ~33 MB (mejor para móvil y CDN).
    # Nota: 'perimetro' se guarda en CENTÍMETROS, tal como viene en el CSV;
    # es js/arboles-sevilla.js quien lo convierte a metros (etiqueta
    # circumference) antes de llamar a estimarDimensionesArbol().
    json.dump(geojson, f, ensure_ascii=False, separators=(',', ':'))

print('Total filas CSV:', total)
print('Descartadas por coordenada inválida:', saltos_coord)
print('Descartadas por solaparse con OSM (<%sm):' % MIN_DIST_M, duplicados)
print('Sin especie:', sin_especie)
print('Especies únicas:', len(especies))
print('Features finales:', len(features))
print('Escrito:', SALIDA)
top = sorted(especies.items(), key=lambda kv: -kv[1])[:15]
for e, n in top:
    print('   %5d  %s' % (n, e))
