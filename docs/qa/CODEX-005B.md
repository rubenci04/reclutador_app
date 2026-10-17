# QA — CODEX-005B · Reclutador

Fecha: 2026-10-17

## Cambios entregados

- La marca visible pasa a **Reclutador** en cabeceras y metadatos. Se conservan `draft-legends.draft-v1`, `catalog_v1`, `plr_*`, rutas y carpetas; no hay migración de persistencia necesaria.
- El duelo ahora genera 22 futbolistas únicos y los ofrece de a uno: 2 ARQ, 8 DEF, 6 MED y 6 DEL. Cada adjudicación ocupa un único puesto del ganador; el rival no recibe una carta automática.
- La moneda se elige con Cara/Cruz. Semilla, lado elegido, resultado, ganador y orden alternado de apertura se almacenan en el estado y el registro.
- Las pujas validan precio base, incremento, presupuesto, cupos 1/4/3/3 y una asignación viable de todas las cartas pendientes. Un doble pase prueba prioridad y luego rival antes de fallar de manera controlada.
- Las tarjetas usan avatar local, nacionalidad, posición, tier, club, precio y rating. `PlayerCardVisual.thumbnail` deja lista una miniatura opcional con fuente, licencia y atribución, sin imágenes ni API remotas.
- El simulador existente recibe ambos onces sólo tras completar las 22 rondas. El resultado se conserva para reproducirlo; no se recalcula durante el render.

## Validación automatizada

| Comando | Resultado |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS — 11 archivos, 440 pruebas, 26.92 s |
| Estrés en `auctionEngine.test.ts` | PASS — 1.000 semillas, dos onces completos, 0–100M y 22 IDs exclusivos |
| `npm run build` | PASS — Vite produjo `dist/` |
| `npm run catalog:audit` | PASS parcial — B01/B02/B03: 150 registros válidos; catálogo global sigue `pending` con 350 IDs faltantes |

La cobertura del motor verifica el sorteo reproducible, una carta por ronda, distribución posicional, cara o cruz persistente, alternancia, puja, doble pase, reserva de presupuesto, completitud, exclusividad e integración explícita del simulador. La interfaz verifica cara/cruz antes de la subasta y los controles Ofertar/Pasar.

## QA visual ejecutada

El navegador integrado pudo abrir `http://127.0.0.1:5173/`. Se verificaron en escritorio y a 390×844 px:

1. Inicio de Reclutador, selector Global disponible y Draft Libre accesible.
2. Elección de Cara/Cruz y pantalla animada de moneda.
3. Primera carta individual: marcador de ronda 1/22, saldos, avatar local, metadatos y prioridad.
4. Controles de oferta y pase: precio base 8M y máximo seguro 17M para la carta inspeccionada.
5. Diseño móvil sin desborde horizontal en la carta, saldos y acción de inicio de subasta.

La revisión manual complementaria debe recorrer las 22 rondas, confirmar la comparación de onces, iniciar el partido, usar Reproducir partido sin nueva simulación, probar Revancha/Nueva partida/volver al menú y repetir los textos en inglés y portugués.

## Incidencias y límites

La primera apertura de `127.0.0.1:5174` excedió el tiempo de conexión; el servidor existente en `127.0.0.1:5173` respondió y permitió completar la QA visual. No se configuraron servicios externos, Supabase, modo online, CPU pujadora, importación automática de imágenes ni nuevas tandas de futbolistas.

## Estado de Git

Rama de trabajo: `feat/single-player-auctions-visuals`. El cierre se registra en un commit local específico; no se realiza push ni deploy.
