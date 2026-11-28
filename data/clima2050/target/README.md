# GeoJSON TARGET para la capa Clima 2050

Este directorio es el punto de entrega del archivo **precalculado fuera de la
web** con TARGET/UMEP. La capa "Clima 2050" del frontend lo consume ya
generado; **TARGET no se ejecuta en el navegador** (sin Python ni WASM en el
frontend).

## Qué hay que copiar aquí

```
data/clima2050/target/clima_2050_target.geojson
```

El archivo lo genera el pipeline externo descrito en
[`scripts/target/README.md`](../../scripts/target/README.md) (TARGET en
Python o UMEP/QGIS). **No hay ningún archivo en este directorio de momento**:
mientras no exista, la capa sigue funcionando con la emulación actual
(inspirada en Sola-Caraballo et al.) sin cambiar nada.

## Esquema mínimo

`FeatureCollection` con una feature por polígono (mismas unidades que el
maestro actual: secciones/áreas de Sevilla, Mairena del Aljarafe y Bollullos
de la Mitación). Geometría `Polygon` o `MultiPolygon`.

Obligatorias en `properties` de cada feature:

| Propiedad    | Tipo           | Descripción                          |
| ------------ | -------------- | ------------------------------------ |
| `municipio`  | string         | Nombre del municipio                 |
| `area`       | string         | Nombre de la zona/área               |
| `risk_level` | entero 0–3     | Clase ordinal de riesgo              |

Opcionales (si faltan, la web muestra "no disponible" y no inventa nada):

| Propiedad             | Tipo   | Descripción                            |
| --------------------- | ------ | -------------------------------------- |
| `dias40`              | número | Días al año >40 °C (simulación TARGET) |
| `noches_tropicales`   | número | Noches tropicales al año               |
| `hazard_index`        | número | Índice de peligrosidad                 |
| `vulnerability_index` | número | Índice de vulnerabilidad               |

Metadatos (se leen del primer feature que los declare, o del
`FeatureCollection`):

| Campo          | Valor esperado                    |
| -------------- | --------------------------------- |
| `source`       | `"TARGET"`                        |
| `scenario`     | `"RCP4.5"` o `"SSP2-4.5"`         |
| `year`         | `2050`                            |
| `resolution_m` | `100`                             |

## Validación

Antes de desplegar, compruébalo con el mismo validador que usa la web:

```bash
node scripts/validate-target-geojson.mjs
# o contra otra ruta:
node scripts/validate-target-geojson.mjs data/clima2050/target/clima_2050_target.geojson
```

`VÁLIDO` (exit 0) = la web lo usará como fuente TARGET. `NO VÁLIDO` (exit 1)
= la web caerá automáticamente a la emulación actual, con un aviso discreto
en consola, y nada se rompe.

## Comportamiento si el archivo falta o es inválido

- La capa, el popup y el informe PDF siguen con la **emulación actual**,
  byte a byte como antes.
- No se muestran errores en la interfaz; solo un `console.info` discreto.
- Jamás se inventan datos TARGET: los campos ausentes se muestran como
  "no disponible".
