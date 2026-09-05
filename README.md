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



     --____---_________----________---____---__****--_________---____-_


---

## 💼 Uso Comercial y Licenciamiento Dual (Para Empresas)

**Manolit∞ Aire** es, y siempre será, un proyecto de código abierto, libre y comunitario bajo la licencia **AGPL 3.0**. Creo firmemente en un internet abierto donde el conocimiento se comparte.

Sin embargo, entiendo que las grandes compañías y plataformas comerciales operan bajo dinámicas de software cerrado y modelos de negocio privados. Debido a los estrictos términos de copyleft de la licencia AGPL 3.0, **cualquier plataforma comercial que integre este código está obligada legalmente a liberar todo su propio código fuente**.

Si representas a una empresa y deseas desplegar, integrar o explotar las funciones de este motor de rutas en vuestros sistemas cerrados sin comprometer vuestra propiedad intelectual, ofrezco **acuerdos de licencia comercial privada y adaptada**.

### 🛠️ ¿Qué ofrezco a grandes compañías?
* **Licencia Comercial Exclusiva:** Despliega el motor de sombras e integración de mapas sin las obligaciones de la AGPL 3.0.
* **Modularidad a medida:** Posibilidad de adquirir funciones específicas del "Core" (motor geométrico) excluyendo módulos experimentales o capas de datos según vuestras necesidades.
* **Integración y Soporte:** Consultoría directa para adaptar el algoritmo a vuestra infraestructura urbana o de reparto.

Si vuestra organización quiere evitar conflictos legales con el software libre y prefiere un ecosistema cerrado firmado y autorizado por el autor original, contacta en:

📬 **[sandro.a007@gmail.com]**

