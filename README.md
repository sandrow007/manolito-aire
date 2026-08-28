# Manolit∞ Aire

Mapa 3D de sombras urbanas, rutas peatonales frescas, calidad del aire 
en tiempo real e histórico de irradiación solar (NASA POWER). 
Proyecto ciudadano, gratuito, sin registro y sin publicidad.

🔗 [manolitoaire.com](https://manolitoaire.com)

## Por qué existe y debería de existir 

[2-3 frases del origen — lo de Sevilla y el calor]

## Qué hace

- Mapa 3D con sombras dinámicas en tiempo real
- Ruta peatonal optimizada (Dijkstra térmico)
- Nubosidad real (OpenWeatherMap)
- Calidad del aire (Copernicus CAMS vía Open-Meteo)
- Histórico de irradiación solar desde 1984 (NASA POWER)

## Stack técnico

- JavaScript (ES6+), sin frameworks pesados
- WebGL (OpenGlobus / Three.js)
- Turf.js, SunCalc
- Cloudflare Workers como proxy de API

## Privacidad

100% cálculo en cliente. No se envían datos de rutas ni ubicación a 
servidores. Ver [Privacidad](https://manolitoaire.com/privacidad.html).

## Accesibilidad

Diseñado para WCAG 2.1 AA — compatible con lectores de pantalla 
(NVDA, VoiceOver, JAWS) y modo de alto contraste integrado.

## Licencia

Copyleft-next 0.3.1 — ver [LICENSE](./LICENSE).

## Apoyo

Los servidores no son gratis. Si quieres ayudar: 
[Ko-fi](https://ko-fi.com/manolitoinfinito)
    
© 2026 Sandro 
 Obra registrada - Propiedad Intelectual
  Junta de Andalucía - Consejería de Cultura y Deporte
   Nº Expediente: RTA-3147-26
   Nº Registro: 2026999010353785
     Fecha: 28/08/2026 · AGPL-3.0 . Código libre para la humanidad.
