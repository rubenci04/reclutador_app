# Ruleta de cartas y fondo interactivo — 09/11/2026

## Diagnóstico: por qué no se veía lo anterior

- Producción (Worker `reclutador-app`) ya servía el último código: `assets/index-BbEjJnsh.js`, idéntico al build local de `e15736f`/`c257021`, con la ruleta de turno, el fondo con pelota y los minijuegos.
- **Ningún despliegue del Worker vino de Git.** `wrangler deployments list` muestra todos como «Source: Unknown (deployment)», subidos a mano con Wrangler. Un push a GitHub no despliega nada; hay que publicar con Wrangler (ver `docs/DEPLOY.md`).
- El fondo existía pero era una cancha pequeña en la esquina inferior derecha, al 34 % de opacidad y detrás de paneles opacos: prácticamente invisible.
- Los minijuegos del partido sí están en producción y funcionan (ver verificación).

## Cambios

- **Ruleta de cartas (reemplaza la ruleta de dos nombres del turno inicial, que se eliminó).** En cada carta de partidas locales, primero gira una ruleta de posiciones (ARQ/DEF/MED/DEL, etiquetas traducidas) y luego una ruleta de 8 nombres de esa posición que frena en la carta real; después se abre la puja. Se puede omitir (botón) o desactivar para siempre («No mostrar más la ruleta», guardado en `reclutador.card-wheel.v1`); con movimiento reducido pasa directo.
  - **La carta ya está fijada por el sorteo de la partida** (semilla). La ruleta solo la presenta, igual que la moneda; los otros siete nombres son relleno visual determinista (misma semilla y ronda → misma ruleta) y no son «posibles resultados». No consume ni altera el azar del motor.
  - La CPU y el pase automático esperan a que termine la ruleta. Una partida restaurada tras recargar no repite la ruleta de la carta actual.
  - Solo partidas locales; online sin cambios (el reloj de turno corre en el servidor y la ruleta lo retrasaría).
  - Archivos: `CardWheel.tsx`, `cardWheelModel.ts`, `cardWheelSetting.ts`; textos `wheel.*` en es-AR/en/pt-BR.
- **Fondo interactivo:** cancha completa detrás de toda la app (líneas, áreas y dos arcos en los bordes). La pelota vive encima de la interfaz, sigue al mouse con retraso y desplazamiento (no tapa lo que se toca) y, al hacer clic en un espacio que no sea un control, patea al arco del lado del puntero y muestra «¡GOL!» (`backdrop.goal`). Sin efecto en pantallas táctiles ni con movimiento reducido; `pointer-events: none`. Se bajó la opacidad de `.duel-shell` de 70 % a 55 % para que la cancha se asome.

## Verificación

- Pruebas nuevas: `CardWheel.test.tsx` (8: modelo, etapas, ángulo de frenado, omitir/desactivar, movimiento reducido, integración con la subasta) e `InteractiveBackdrop.test.tsx` (reescrita). `src/test/setup.ts` apaga la ruleta por defecto en las pruebas de flujo.
- Navegador real (Vite local, 1024×768, es-AR): la ruleta de posición, la de nombres (Defensor) y el resultado se ven; el nombre que sale en el texto coincide con la carta que se subasta; el tiro del fondo llega al arco izquierdo con el «¡GOL!». Los nombres de posición se cortaban («Arqu…») y se corrigió el relleno.
- Minijuegos del partido (sesión de prueba cargada con la restauración de TECH-001): el partido arranca con «Tiro libre para vos» (arco, barrera, tres destinos, barra de sincronización, «¡Ahora!»); al frenar la barra se resuelve («Atajada del arquero») y sigue el partido con cancha y muñecos.

## Límites

- No se verificó en celular ni los demás minijuegos (penales, defensa, córner, gambeta); solo el tiro libre.
- La ruleta agrega unos 5 s por carta si no se omite (22 cartas): por eso el botón de omitir y la opción de apagarla. Si se prefiere más corta (p. ej. una sola ruleta) es un ajuste de `STAGE_MS` en `CardWheel.tsx`.
- Publicado el mismo día con Wrangler (ver `docs/DEPLOY.md`): versión 94407272-fda8-41f6-bb7f-31306fcba3ac al 100 %. Sin QA visual en la URL pública tras publicar; solo HTTP y SHA-256 de los archivos.
