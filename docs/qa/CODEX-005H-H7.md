# CODEX-005H · H7 — Tutorial de primera visita y ayudas en el juego

18/10/2026. Pedido adicional del usuario tras H1–H6. Código en `src/features/onboarding/`.

## Tutorial
- Se abre **solo la primera vez** que se abre la página (cualquier modo) y se puede omitir. Seis pasos: objetivo, subasta, presupuesto y cupos, ordenar el equipo, estrategia y partido, y **teclas para jugar** (Tab / Shift+Tab, Enter o Espacio, flechas en el campo de oferta, Esc para cerrar la guía, arrastrar para reordenar).
- Se marca como visto al terminar, omitir o con Esc. El botón «?» (abajo a la derecha, `aria-label` «Cómo jugar») lo vuelve a abrir cuando se quiera.
- Accesibilidad: `role="dialog"` con `aria-modal`, el foco va al título en cada paso y vuelve al elemento anterior al cerrar, Tab queda dentro del diálogo, Esc cierra; sin animación con `prefers-reduced-motion`.
- Textos completos en es-AR, en y pt-BR (pasos, teclas, botones, avisos); el test de i18n exige las mismas claves.

## Ayudas contextuales
- Una nota breve (`role="note"`) según el momento: configuración, cara o cruz, jugador revelado, ofertas, resultado de ronda y equipos completos. No aparece durante descarte, sorteo de moneda, simulación ni resultado final.
- Cada una tiene «Entendido» (la descarta para siempre) y «No mostrar más ayudas» (las apaga todas). Desde el último paso del tutorial hay una casilla para mostrarlas u ocultarlas. Sin temporizadores ni robo de foco.
- Preferencias en `localStorage` (`reclutador.help.v1`: tutorial visto, ayudas activas, temas descartados), siempre dentro de try/catch; si el navegador bloquea el almacenamiento, funciona en memoria durante la sesión. No se guarda nada personal ni credenciales.

## Pruebas
`onboarding.test.tsx` (8): apertura en la primera visita y recorrido de los seis pasos con las teclas, no repetir, omitir/Esc/reabrir, es-AR y pt-BR, almacenamiento bloqueado, apertura en `HomePage`, mapa fase→tema, descartar/apagar/restablecer y la ayuda de la configuración en la página real. Suite completa: 621 de 621; typecheck, lint y build correctos. Verificado a mano en el navegador integrado a 375 px (tutorial legible y botón de omitir; la ayuda aparece tras omitir).

## Límites
- Las ayudas no cubren el Draft Libre ni el modo de formación personalizada ni el partido; la guía describe el flujo principal. El botón «?» es fijo y puede tapar parte del pie en pantallas muy bajas.
- No se probó con lectores de pantalla reales ni en Firefox.
