"""Preprocesado offline del mapa Köppen-Geiger de Beck et al. (2018).

Convierte el ráster global de 1 km (Beck_KG_V1_present_0p0083.tif) en una
rejilla categórica de 0.1° para el cliente (data/koppen-rejilla.json), que
js/sqi-calidad-sombra.js carga UNA vez al arrancar para asignar el
coeficiente K de amortiguación del factor LUR por zona climática.

Fuente (CC BY 4.0, cita obligatoria):
  Beck, H.E. et al. (2018): Present and future Köppen-Geiger climate
  classification maps at 1-km resolution. Scientific Data 5:180214.
  https://doi.org/10.6084/m9.figshare.6396959

Uso:
  1. Descargar https://ndownloader.figshare.com/files/12407516 y extraer
     Beck_KG_V1_present_0p0083.tif junto a este script (o pasar su ruta).
  2. python preprocesar_koppen.py [ruta_al_tif]
     Requiere rasterio y numpy (solo para este preprocesado, no en runtime).

Salida: JSON con los bytes de la rejilla en base64 (0 = océano/sin dato,
1-30 = clase Köppen según legend.txt de Beck). La rejilla se recorre por
filas de norte a sur; celda (fila, col) = lat 90 - (fila+0.5)*0.1,
lon -180 + (col+0.5)*0.1. En cliente se consulta por índice, sin red.
"""

import base64
import gzip
import json
import sys

import numpy as np
import rasterio.warp
from rasterio.enums import Resampling
from rasterio.transform import from_origin

RES = 0.1
ANCHO = int(round(360 / RES))   # 3600 columnas
ALTO = int(round(180 / RES))    # 1800 filas

CLASES = {
    0: "sin dato", 1: "Af", 2: "Am", 3: "Aw", 4: "BWh", 5: "BWk",
    6: "BSh", 7: "BSk", 8: "Csa", 9: "Csb", 10: "Csc", 11: "Cwa",
    12: "Cwb", 13: "Cwc", 14: "Cfa", 15: "Cfb", 16: "Cfc", 17: "Dsa",
    18: "Dsb", 19: "Dsc", 20: "Dsd", 21: "Dwa", 22: "Dwb", 23: "Dwc",
    24: "Dwd", 25: "Dfa", 26: "Dfb", 27: "Dfc", 28: "Dfd", 29: "ET",
    30: "EF",
}


def main():
    ruta = sys.argv[1] if len(sys.argv) > 1 else "Beck_KG_V1_present_0p0083.tif"
    with rasterio.open(ruta) as src:
        destino = np.zeros((ALTO, ANCHO), dtype=np.uint8)
        # Moda (no media): es una variable categórica, la clase dominante
        # de las ~12x12 celdas de 1 km es la que representa cada celda 0.1°.
        rasterio.warp.reproject(
            source=rasterio.band(src, 1),
            destination=destino,
            src_transform=src.transform,
            src_crs=src.crs,
            dst_transform=from_origin(-180, 90, RES, RES),
            dst_crs="EPSG:4326",
            resampling=Resampling.mode,
        )

    salida = {
        "fuente": "Beck et al. 2018, Scientific Data 5:180214 (CC BY 4.0)",
        "url": "https://doi.org/10.6084/m9.figshare.6396959",
        "periodo": "1980-2016",
        "res": RES,
        "oeste": -180,
        "norte": 90,
        "ancho": ANCHO,
        "alto": ALTO,
        "clases": CLASES,
        "datos_b64": base64.b64encode(destino.tobytes()).decode("ascii"),
    }
    ruta_salida = "data/koppen-rejilla.json"
    with open(ruta_salida, "w", encoding="utf-8") as f:
        json.dump(salida, f, separators=(",", ":"))

    valores, cuentas = np.unique(destino, return_counts=True)
    print("Clases presentes:", {CLASES[int(v)]: int(c) for v, c in zip(valores, cuentas)})
    with open(ruta_salida, "rb") as f:
        comprimido = gzip.compress(f.read())
    print("JSON: %.2f MB · gzip: %.2f MB" % (
        len(salida["datos_b64"]) * 0.75 / 1e6 * 4 / 3, len(comprimido) / 1e6))


if __name__ == "__main__":
    main()
