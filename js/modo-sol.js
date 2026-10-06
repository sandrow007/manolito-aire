/* ============================================================
   MANOLIT AIRE · js/modo-sol.js
   Licencia: AGPL-3.0, igual que el resto del proyecto.
   ------------------------------------------------------------
   Modo sol: cuando está activo, Manolit se pasa al lado del sol
   y recomienda disfrutarlo con humor suave en vez de buscar
   sombra.

   REGLA DE SEGURIDAD (no se salta nadie): nunca se anima a
   tomar el sol sin protección. Desde UV 6 el consejo incluye
   crema y sombrero; desde UV 8 además manda descansar a la
   sombra. Si no hay dato de UV no se bloquea nada: sale un
   consejo genérico de sol suave.

   06-oct-2026 · orden directa de Sandro. Versión sin emojis:
   regla de la casa (cero emojis en la interfaz) y además estos
   textos los lee en voz alta speechSynthesis y las regiones
   aria-live, donde los emojis suenan fatal.
   ============================================================ */

// Consejos genéricos de sol suave. Salen cuando no hay dato de
// UV (sin red, API caída) y también de relleno de buen humor.
export const TIPS_SOL = [
  '¡Vamoh, un ratito de sol! Que los huesos también quieren su poquito de gloria.',
  'Ponte al sol como los gatos, miarma. Diez minutitos y a otra cosa.',
  'El sol de por la mañana es el bueno. Aprovecha, que la sombrita ya vendrá sola.',
  '¡A la calle! Que hasta los naranjos hacen la fotosíntesis con estilo.'
];

// Consejo según el índice UV actual. La protección va primero y
// la broma después: con UV alto el mensaje SIEMPRE lleva crema,
// sombrero y, si aprieta de verdad, descanso a la sombra.
export function consejoUV(uv) {
  if (uv === null || uv === undefined || !Number.isFinite(Number(uv))) {
    return TIPS_SOL[Math.floor(Math.random() * TIPS_SOL.length)];
  }
  const n = Math.round(Number(uv));
  if (n >= 8) {
    return `UV ${n}. Esto ya es fuego serio, miarma. Crema, sombrero y un descanso a la sombra cada dos horas, que el sol no perdona.`;
  }
  if (n >= 6) {
    return `UV ${n}. El sol aprieta de verdad. Crema y sombrero bien puestos, y luego ya nos ponemos guapos.`;
  }
  if (n >= 3) {
    return `UV ${n}. Sol agradable, de los que alegran la mañana. Disfrútalo sin prisa.`;
  }
  return `UV ${n}. Sol suavecito, perfecto para un paseo largo sin preocuparse de ná.`;
}

// UV actual vía Open-Meteo (API gratuita, sin clave, CORS
// abierto). Si la red falla LANZA error: quien llama decide el
// plan B (consejo genérico) y la interfaz nunca se queda
// colgada. En la integración se intenta primero nuestro worker
// (/prevision), que ya devuelve uv_index, y esta función queda
// como respaldo directo.
export async function obtenerUV(lat, lon) {
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=uv_index`);
  if (!r.ok) throw new Error('uv ' + r.status);
  const j = await r.json();
  return j.current?.uv_index ?? null;
}
