# Pipeline TARGET → GeoJSON para Clima 2050

Cómo generar `data/clima2050/target/clima_2050_target.geojson` con datos
reales de simulación. **Todo esto corre fuera de la web**: el frontend solo
lee el archivo ya generado. TARGET no se ejecuta en el navegador ni se añade
Python/WASM al frontend (regla dura del proyecto).

## Opciones de motor

### Opción A — TARGET (Python)

TARGET (*Tool for Assessment of Urban Heat Risk*) corre como pipeline de
escritorio/Python a partir de sus notebooks/scripts de referencia. Flujo
recomendado:

1. Preparar los datos de entrada (ver abajo) en una rejilla regular de
   **100 m** sobre el área de estudio (Sevilla, Mairena del Aljarafe y
   Bollullos de la Mitación).
2. Ejecutar la simulación para el escenario y año elegidos
   (**RCP4.5/SSP2-4.5, 2050**).
3. De las salidas, extraer como mínimo: clase de riesgo térmico (mapear a
   entero 0–3), días >40 °C y noches tropicales por celda; si el modelo los
   da, también `hazard_index` y `vulnerability_index`.

### Opción B — UMEP + QGIS

[UMEP](https://umep-docs.netlify.app/) (Urban Multi-scale Environmental
Predictor) es un plugin de QGIS que incluye herramientas de análisis térmico
urbano y solvers relacionados. Flujo recomendado:

1. Instalar QGIS LTS + plugin UMEP.
2. Generar la rejilla de 100 m y los datos de entrada con las herramientas
   de preprocesado de UMEP.
3. Ejecutar el solver correspondiente con la forzante del escenario elegido.
4. Revisar las salidas en QGIS y exportar la rejilla resultante a GeoJSON
   (WGS 84 / EPSG:4326).

## Datos de entrada

- **DEM** (modelo digital de elevaciones), ~100 m o remuestreado a 100 m.
- **Cobertura/uso del suelo** (CORINE, SIOSE o similar), con clases de
  vegetación, agua, suelo edificado e impermeable.
- **Parámetros urbanos**: albedo, rugosidad, fracción de vegetación,
  alturas de edificio si se dispone de ellas (p. ej. Catastro 3D).
- **Forzante meteorológica** del escenario (RCP4.5 / SSP2-4.5, año 2050):
  temperatura, humedad, viento, radiación; de un modelo regionalizado
  documentado.
- **Rejilla de salida**: 100 m, WGS 84 / EPSG:4326.

## Agregación a los polígonos del frontend

La web pinta polígonos ya existentes (521 secciones censales de Sevilla, 9
áreas estadísticas de Mairena del Aljarafe, 6 secciones censales de
Bollullos de la Mitación), que están en
`data/andalucia_clima_2050_ligero.geojson` (claves cortas `m`, `a`, `r`).
Para que el archivo TARGET encaje con esas unidades:

1. Reproyectar la rejilla de salida a EPSG:4326.
2. Agregar (media ponderada por superficie, o mediana; documentar el
   criterio) cada variable al polígono de cada sección/área.
3. Mapear la variable de riesgo a `risk_level` entero 0–3 con umbrales
   documentados en el propio archivo (campo `metadata`).
4. Escribir las propiedades largas (`municipio`, `area`, `risk_level`, más
   las opcionales) — **no** las claves cortas del archivo ligero.

## Salida esperada

Un `FeatureCollection` GeoJSON con el esquema descrito en
[`data/clima2050/target/README.md`](../../data/clima2050/target/README.md):
obligatorias `municipio`, `area`, `risk_level` (0–3); opcionales `dias40`,
`noches_tropicales`, `hazard_index`, `vulnerability_index`; metadatos
`source: "TARGET"`, `scenario: "RCP4.5"` o `"SSP2-4.5"`, `year: 2050`,
`resolution_m: 100`.

## Comando de importación

Con el archivo generado (por ejemplo `salida_target.geojson`):

```bash
# 1) Validar contra el esquema mínimo (mismo validador que usa la web)
node scripts/validate-target-geojson.mjs salida_target.geojson

# 2) Copiar al punto de entrega que lee la web
cp salida_target.geojson data/clima2050/target/clima_2050_target.geojson

# 3) Validar de nuevo ya en su sitio
node scripts/validate-target-geojson.mjs
```

## Notas

- **No subas simulaciones inventadas como si fueran reales.** Si necesitas
  probar la integración sin correr TARGET, usa el fixture sintético de
  `tests/fixtures/` (está marcado como fixture y no es dato de producción).
- Si el archivo no existe o no valida, la web sigue con la emulación actual:
  no se rompe nada y se muestra un aviso discreto en consola.
- Los campos opcionales ausentes se muestran como "no disponible"; la web
  nunca los deriva con la fórmula emulada cuando la fuente es TARGET.
