# Instrucciones para colaborar en Manolit∞ Aire

Gracias por querer mejorar este proyecto. Manolit∞ Aire es software ciudadano, abierto (AGPL-3.0) y mantenido por una sola persona. Estas son las reglas técnicas que hay que conocer antes de tocar nada. Son pocas y están aquí para que la web siga siendo rápida, estable y coherente.

## 1. La regla de oro

Al pulsar F12 no puede aparecer ni un solo error en consola. Ni uno. Si tu cambio introduce un error, un aviso de recurso roto o una excepción, no está terminado.

## 2. Estructura del proyecto

- `index.html` es la página principal (mapa, contadores, chat y pie).
- `manolito-aire-comparativa.html` es la comparativa de consumo de agua.
- `about.html` explica por qué existe el proyecto.
- `aviso-legal.html`, `privacidad.html` y `cookies.html` son las páginas legales.
- `css/style.css` y `css/ambientes.css` contienen todos los estilos.
- `js/` contiene la lógica (mapa, sombras 3D, árboles, idiomas, tutorial).
- `sw.js` es el service worker (caché y funcionamiento offline).
- `worker.js` es el Cloudflare Worker que sirve la web y las APIs.

## 3. El service worker manda

Cada vez que cambies **cualquier** archivo servido (HTML, CSS o JS), sube la constante `VERSION` de `sw.js` con la fecha y una letra nueva, y anota el cambio en el comentario de la cabecera. Si no lo haces, los visitantes seguirán viendo la versión vieja desde la caché y creerán que tu arreglo no funciona.

## 4. Despliegue

La web vive en Cloudflare Workers. El despliegue real lo hace el mantenedor con `npx wrangler deploy`. Tras cada despliegue hay que recargar con Ctrl+Mayús+R para forzar la caché nueva. Tus pull requests no se despliegan solas.

## 5. Estilo de código y de textos

- Los cambios deben ser aditivos siempre que sea posible. No recortes funciones ni bloques que no entiendas; si algo sobra, coméntalo en la pull request y se decide juntos.
- Nada de dependencias de pago ni servicios que exijan tarjeta.
- Nunca subas claves de API ni secretos al repositorio. Ni en el código, ni en los comentarios, ni en los mensajes de commit.
- En los textos visibles de la web no se usan guiones largos ni punto y coma. Frases cortas, como habla una persona.
- Sin emojis en la interfaz. La única excepción es el símbolo de accesibilidad.
- Los textos nuevos deben existir en los seis idiomas (`js/i18n.js`): ES, CA, EU, GL, EN y KA.

## 6. Rendimiento y batería

La web está pensada para móviles con calor y poca batería. Antes de añadir trabajo en bucle, recuerda:

- Usa `setInterval` con tiempos razonables en lugar de `requestAnimationFrame` cuando no haga falta pintar cada frame.
- Pausa los temporizadores cuando `document.hidden` sea true.
- Limpia siempre los intervalos y los listeners al salir (`pagehide`).
- Nada de animaciones infinitas ni de librerías pesadas para cosas pequeñas.

## 7. Navegación

Los enlaces internos se abren en la misma pestaña. Los externos se abren en pestaña nueva con `rel="noopener"`. Hay un script al final de cada página que lo garantiza; respétalo al crear enlaces nuevos.

## 8. Cómo probar en local

Basta con servir la carpeta y abrir el navegador:

```
python3 -m http.server 8765
```

Luego entra en `http://localhost:8765/index.html`, acepta las cookies del aviso y comprueba la consola con F12. Prueba siempre en una ventana estrecha simulando móvil antes de proponer el cambio.

## 9. Cómo proponer mejoras

1. Haz un fork del repositorio.
2. Crea una rama con un nombre claro.
3. Haz tus cambios siguiendo estas reglas y sube la `VERSION` de `sw.js`.
4. Abre una pull request explicando qué mejora, cómo lo has probado y si la consola queda limpia.

Las ideas que encajen con la filosofía del proyecto (gratis para la ciudadanía, sin anuncios, sin rastreadores, consumo mínimo de recursos) son bienvenidas. Las que la traicionen, no.

## 10. Filosofía que no se negocia

Sin publicidad. Sin registros obligatorios. Sin venta de datos. Sin muros de pago para las personas. El código es AGPL-3.0, así que cualquier mejora que se distribuya debe seguir siendo abierta. Si algún día este proyecto traiciona estos principios, dejará de llamarse Manolit∞.
