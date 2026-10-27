// Conversión y filtrado de paradas de transporte público.
// MOTIS devuelve 'lat'/'lon' (a veces en notación científica o con coma decimal)
// y algunas versiones/el proxy pueden responder GeoJSON (Feature<Point>).
(() => {
  'use strict';

  const LIMITE_PARADAS = 400;

  function numero(valor) {
    if (valor == null) return NaN;
    return Number(typeof valor === 'string' ? valor.replace(',', '.') : valor);
  }

  function coordenadasValidas(lat, lon) {
    return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  function toFeature(place, nombrePorDefecto) {
    if (!place) return null;
    const properties = place.properties || place;
    const geometry = place.geometry;
    const original = geometry && Array.isArray(geometry.coordinates) ? geometry.coordinates : null;
    const lat = original ? numero(original[1]) : numero(properties.lat != null ? properties.lat : properties.latitude);
    const lon = original ? numero(original[0]) : numero(properties.lon != null ? properties.lon : properties.longitude);
    if (!coordenadasValidas(lat, lon)) return null;
    const stopId = properties.stopId != null ? properties.stopId : (properties.id != null ? properties.id : null);
    return {
      type: 'Feature',
      id: place.id != null ? String(place.id) : stopId != null ? String(stopId) : 'stop:' + lat + ':' + lon,
      properties: { ...properties, stopId: stopId, name: properties.name || nombrePorDefecto || 'Parada' },
      geometry: { type: 'Point', coordinates: [lon, lat] }
    };
  }

  function listaDeParadas(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.stops)) return raw.stops;
    if (raw && Array.isArray(raw.features)) return raw.features;
    if (raw && raw.type === 'Feature') return [raw];
    return null;
  }

  function featuresDeParadas(coleccion, nombrePorDefecto) {
    const features = [];
    for (const place of coleccion) {
      const feature = toFeature(place, nombrePorDefecto);
      if (feature) features.push(feature);
      if (features.length >= LIMITE_PARADAS) break;
    }
    return features;
  }

  window.ManolitoTransporteParadas = { toFeature, listaDeParadas, featuresDeParadas, LIMITE_PARADAS };
})();
