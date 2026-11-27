# -*- coding: utf-8 -*-
"""
preprocesar_ine_vulnerabilidad.py — Manolit∞ Aire
==========================================================================
Cruza los datos REALES de vulnerabilidad con las secciones censales del
GeoJSON de Clima 2050 (data/andalucia_clima_2050.geojson) y escribe un
GeoJSON ligero con seis propiedades por polígono: las tres que ya había
(municipio, area, risk_level) más tres medidas oficiales:

  renta_media_ud   € por unidad de consumo (Atlas de Distribución de Renta
                   de los hogares del INE, dato por sección censal).
  mayores65_pct    % de personas de 65 años o más (padrón, sección censal).
  pct_antes_1979   % de viviendas con año de construcción anterior a 1979,
                   sacado del Catastro (INSPIRE bu:Building).

CÓMO SE EJECUTA (en tu máquina, con red):
    pip install shapely requests
    python preprocesar_ine_vulnerabilidad.py --entrada data/andalucia_clima_2050.geojson ^
        --ine-renta renta_seccion_2023.csv ^
        --ine-edad  edad_seccion_2023.csv ^
        --salida data/andalucia_clima_2050.geojson

Las fuentes se descargan A MANO desde el INE, porque su servidor no acepta
peticiones automáticas (comprobado: la descarga se queda colgada y devuelve
HTML en vez de CSV). En https://www.ine.es/ busca el operativo, pestaña
«Secciones censales», y descarga el CSV. Se aceptan separador ';' o ',' y
cualquiera de los dos nombres de columna habituales (id / CUSEC).

NINGÚN DATO SE INVENTA. Si una sección no aparece en el INE, esas
propiedades salen null, y el mapa simplemente no enseña esa línea. Si un
campo falta, se conserva el valor que ya tuviera el GeoJSON. Nunca se
rellena con ceros.

El Catastro (1979) se consulta manzana a manzana con el MISMO endpoint que
usa la web (/catastro-edificios, capa bu:Building, que sí publica
dateOfConstruction). El resultado queda en un JSON de caché local, de modo
que se puede parar y reanudar sin repetir trabajo.

Los datos de renta y edad por sección son datos agregados: no hay personas
identificables, y ese es justo el formato que exige el RGPD.
==========================================================================
"""

import argparse
import csv
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

try:
    from shapely.geometry import shape
    from shapely.strtree import STRtree
except ImportError:  # pragma: no cover
    print('Falta shapely. Instala con: pip install shapely requests', file=sys.stderr)
    raise

CATASTRO = 'https://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx'
UA = 'manolito-aire/1.0 (manolitoaire.com; preproceso offline)'
# Misma caja que admite el WFS sin devolver 500 (ver worker.js).
BLOQUE = 0.006
# Un edificio es "de antes de 1979" si su fecha de inicio es anterior a este
# año: es cuando la normativa española empieza a exigir aislamiento térmico.
CORTE = 1979
SALIDA_CATASTRO = 'data/_catastro_1979_cache.json'


# ---------------------------------------------------------------------------
# Lectura de los CSV del INE
# ---------------------------------------------------------------------------
def _normalizar(nombre):
    return (nombre.strip().lower().replace('"', '')
            .replace('á', 'a').replace('é', 'e').replace('í', 'i')
            .replace('ó', 'o').replace('ú', 'u'))


def leer_csv_ine(ruta, nombre_valor):
    """Devuelve {cusec: float}. Tolera ';' o ',', BOM, y columnas de miles.

    nombre_valor: palabras que deben aparecer en la columna de valor
    (por ejemplo 'total' o '65'). La primera columna que las contenga gana.
    """
    datos = {}
    with open(ruta, encoding='utf-8-sig', newline='') as f:
        muestra = f.read(4096)
        f.seek(0)
        delim = ';' if muestra.count(';') >= muestra.count(',') else ','
        lector = csv.reader(f, delimiter=delim)
        cabecera = next(lector, None)
        if not cabecera:
            return datos
        cols = [_normalizar(c) for c in cabecera]
        col_id = next((i for i, c in enumerate(cols) if c in ('id', 'cusec', 'seccion', 'seccion censal')), None)
        if col_id is None:
            col_id = next((i for i, c in enumerate(cols) if 'cusec' in c or c == 'id'), 0)
        col_val = next((i for i, c in enumerate(cols) if c != col_id and all(p in c for p in nombre_valor)), None)
        if col_val is None:
            raise ValueError(f'No encuentro la columna de valor {nombre_valor} en {ruta}. Cabecera: {cabecera}')
        for fila in lector:
            if len(fila) <= max(col_id, col_val):
                continue
            ident = fila[col_id].strip().strip('"')
            if not ident.isdigit():
                continue
            cifra = fila[col_val].strip().strip('"').replace('.', '').replace(',', '.')
            try:
                datos[ident] = float(cifra)
            except ValueError:
                continue  # vacío o confidencial: se queda SIN dato, no en cero
    return datos


# ---------------------------------------------------------------------------
# Catastro: % de viviendas anteriores a 1979
# ---------------------------------------------------------------------------
def _anillo(gml_pos):
    nums = [float(x) for x in gml_pos.split()]
    return [(nums[i + 1], nums[i]) for i in range(0, len(nums) - 1, 2)]


def pedir_bloque(s, w, n, e):
    """[(poligono_shapely, ano)] del Catastro en una caja. [] si falla."""
    params = {
        'service': 'wfs', 'version': '2', 'request': 'getfeature',
        'typenames': 'bu:Building', 'srsname': 'EPSG:4326',
        'BBOX': f'{s:.6f},{w:.6f},{n:.6f},{e:.6f}',
    }
    url = CATASTRO + '?' + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            texto = r.read().decode('utf-8', 'replace')
    except Exception as exc:  # red, 500 del Catastro...
        print(f'  [catastro] fallo {s:.3f},{w:.3f}: {exc}')
        return []
    salida = []
    trozos = texto.split('<bu-ext2d:Building ')[1:]
    for trozo in trozos:
        m_ano = re.search(r'dateOfConstruction[\s\S]*?<bu-core2d:beginning>\s*(\d{4})', trozo)
        ano = int(m_ano.group(1)) if m_ano else None
        for m in re.finditer(r'<gml:exterior>[\s\S]*?<gml:posList[^>]*>([^<]+)</gml:posList>', trozo):
            ring = _anillo(m.group(1))
            if len(ring) >= 4:
                try:
                    salida.append((shape({'type': 'Polygon', 'coordinates': [ring]}), ano))
                except Exception:
                    pass
    return salida


def construir_cache_catastro(secciones, ruta_cache):
    """Recorre las cajas que tocan las secciones y guarda (polígono, año)."""
    cache = {'cajas': {}}
    if os.path.exists(ruta_cache):
        with open(ruta_cache, encoding='utf-8') as f:
            cache = json.load(f)
    cajas = set()
    for geom in secciones:
        minx, miny, maxx, maxy = geom.bounds
        cy = int(miny // BLOQUE)
        while cy * BLOQUE <= maxy:
            cx = int(minx // BLOQUE)
            while cx * BLOQUE <= maxx:
                cajas.add((cy, cx))
                cx += 1
            cy += 1
    pendientes = sorted(cajas)
    print(f'Catastro: {len(pendientes)} cajas de {BLOQUE}° ({len(cache["cajas"])} ya en caché)')
    for i, (cy, cx) in enumerate(pendientes, 1):
        clave = f'{cy}x{cx}'
        if clave in cache['cajas']:
            continue
        s, n = cy * BLOQUE, (cy + 1) * BLOQUE
        w, e = cx * BLOQUE, (cx + 1) * BLOQUE
        edificios = [([[[x, y] for x, y in pol.exterior.coords]], ano)
                     for pol, ano in pedir_bloque(s, w, n, e)]
        cache['cajas'][clave] = edificios
        if i % 20 == 0:
            with open(ruta_cache, 'w', encoding='utf-8') as f:
                json.dump(cache, f)
            print(f'  {i}/{len(pendientes)} cajas guardadas')
        time.sleep(0.15)  # cortesía con el servicio público
    with open(ruta_cache, 'w', encoding='utf-8') as f:
        json.dump(cache, f)
    return cache


def pct_antes_1979(secciones, cache):
    edificios = []
    for caja in cache['cajas'].values():
        for coords, ano in caja:
            if ano is None:
                continue
            try:
                edificios.append((shape({'type': 'Polygon', 'coordinates': coords}), ano))
            except Exception:
                continue
    if not edificios:
        return [None] * len(secciones)
    arbol = STRtree([g for g, _ in edificios])
    geoms = [g for g, _ in edificios]
    resultado = []
    for sec in secciones:
        antes = total = 0
        for idx in arbol.query(sec):
            if not geoms[idx].intersects(sec):
                continue
            total += 1
            if edificios[idx][1] < CORTE:
                antes += 1
        resultado.append(round(100.0 * antes / total, 1) if total >= 3 else None)
    return resultado


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description='Cruza renta, mayores de 65 y viviendas anteriores a 1979 con el GeoJSON de Clima 2050.')
    ap.add_argument('--entrada', default='data/andalucia_clima_2050.geojson')
    ap.add_argument('--salida', default='data/andalucia_clima_2050.geojson')
    ap.add_argument('--ine-renta', help='CSV del Atlas de Distribución de Renta (sección censal)')
    ap.add_argument('--ine-edad', help='CSV de población por edad (sección censal, 65+ o total)')
    ap.add_argument('--sin-catastro', action='store_true', help='salta el cruce del Catastro')
    ap.add_argument('--catastro-cache', default=SALIDA_CATASTRO)
    args = ap.parse_args()

    if not os.path.exists(args.entrada):
        sys.exit(f'No encuentro {args.entrada}. Ejecútalo desde la raíz del proyecto.')
    if args.salida == args.entrada:
        respaldo = args.entrada + '.bak'
        if not os.path.exists(respaldo):
            with open(args.entrada, 'rb') as src, open(respaldo, 'wb') as dst:
                dst.write(src.read())
            print(f'Respaldo del original en {respaldo}')
    with open(args.entrada, encoding='utf-8') as f:
        coleccion = json.load(f)
    features = coleccion.get('features', [])
    print(f'{len(features)} polígonos en {args.entrada}')

    # CUSEC por feature. El master solo guarda municipio/area/risk_level, así
    # que el código va dentro del texto del área ("Sección 4109101001 -
    # Distrito 01"). Se acepta también un 'cusec' o 'seccion' explícito por si
    # algún día el GeoJSON lo trae como propiedad. Las áreas agregadas de
    # Mairena no tienen CUSEC propio: se quedan sin dato, sin inventarlo.
    cusecs = []
    for f in features:
        p = f.get('properties', {})
        c = str(p.get('cusec') or p.get('seccion') or '').strip()
        if not c.isdigit():
            m = re.search(r'\b(\d{10})\b', str(p.get('area') or ''))
            c = m.group(1) if m else ''
        cusecs.append(c if c.isdigit() else None)

    renta = leer_csv_ine(args.ine_renta, ['renta', 'media']) if args.ine_renta else {}
    edad_total = leer_csv_ine(args.ine_edad, ['total']) if args.ine_edad else None
    edad_65 = leer_csv_ine(args.ine_edad, ['65']) if args.ine_edad else {}
    if args.ine_renta:
        print(f'Renta INE: {len(renta)} secciones')
    if args.ine_edad:
        print(f'Edad INE: {len(edad_65)} secciones con dato de 65+')

    secciones = []
    indice_valido = []
    for i, f in enumerate(features):
        try:
            secciones.append(shape(f['geometry']))
            indice_valido.append(i)
        except Exception:
            continue
    antes79 = [None] * len(features)
    if not args.sin_catastro:
        cache = construir_cache_catastro(secciones, args.catastro_cache)
        valores = pct_antes_1979(secciones, cache)
        for j, i in enumerate(indice_valido):
            antes79[i] = valores[j]

    con_renta = con_edad = con_1979 = 0
    for i, f in enumerate(features):
        p = f.setdefault('properties', {})
        c = cusecs[i]
        if c and c in renta:
            p['renta_media_ud'] = renta[c]
            con_renta += 1
        if c and edad_65:
            t = (edad_total or {}).get(c)
            if t and edad_65.get(c) is not None:
                p['mayores65_pct'] = round(100.0 * edad_65[c] / t, 1)
                con_edad += 1
        if antes79[i] is not None:
            p['pct_antes_1979'] = antes79[i]
            con_1979 += 1

    meta = coleccion.setdefault('metadata', {})
    meta['vulnerabilidad'] = {
        'renta_media_ud': 'INE, Atlas de Distribución de Renta de los hogares, por sección censal',
        'mayores65_pct': 'INE, población de 65 años o más por sección censal',
        'pct_antes_1979': f'Catastro INSPIRE (bu:Building, dateOfConstruction), viviendas con inicio anterior a {CORTE}',
        'nota': 'Secciones sin dato quedan con la propiedad ausente. Nunca se rellena con ceros.',
    }
    with open(args.salida, 'w', encoding='utf-8') as f:
        json.dump(coleccion, f, ensure_ascii=False, separators=(',', ':'))
    tam = os.path.getsize(args.salida) / 1024
    print(f'Guardado {args.salida} ({tam:.0f} KB)')
    print(f'  con renta: {con_renta} · con 65+: {con_edad} · con antes de 1979: {con_1979} de {len(features)}')


if __name__ == '__main__':
    main()
