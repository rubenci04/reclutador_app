# Partido interactivo — Parte 2: pantalla del partido (27/10/2026)

Rama `claude/sprint-9-10`. Sin Supabase, sin promoción a producción (solo versión de vista previa).

## Qué cambió
- El modo «en vivo» (por defecto contra la CPU y en la misma compu) ya no usa el motor viejo: `AuctionPage` arma el partido con `duelMatchInput` (mismos datos que `startDuelMatch`) y lo juega con `FiguresSeriesScreen` → `FiguresMatchScreen`, que pide el motor tramo a tramo (`simulateFiguresMatch` con `humanSides` y `qualities`). Contra la CPU juega solo la persona (`local`); en hot-seat los momentos se alternan entre las dos.
- Pantalla nueva (primero celular, probada en 360×640 y 390×844, sin scroll horizontal): marcador y reloj arriba; cancha SVG con los 22 monigotes (`PlayerAvatar`, apariencia real) en la posición de su formación; pelota que va a la zona de cada jugada (construcción → final: gol, atajada, bloqueo o afuera); una sola línea de relato (≤ 8 palabras, es-AR/en/pt-BR); Pausar / Saltar / Ver detalle (≥ 48 px).
- «Ver detalle» (y al final): estadísticas, córners, alineaciones y goles. Las estadísticas salen de las mismas jugadas mostradas y coinciden con el resultado del motor (prueba `figuresMatch/FiguresMatchScreen`).
- Momento: el partido se pausa y aparece una capa con título corto («Penal para vos», «Defendé el centro»…). Un toque resuelve: con la «Barra de precisión» apagada (por defecto) la calidad es neutra (0,5); encendida, la barra de timing en movimiento decide la calidad (1 en el centro). Sin confirmación extra; con «reducir movimiento» no hay transiciones y la barra queda neutra.
- Serie ida/vuelta/desempate: `FiguresSeriesScreen` (próximo partido con `seriesMatchInput`, formación y táctica de `SeriesPrep`, penales a mano contra la CPU).
- Sin cambios: simulación rápida, online (todo automático) y partido del draft.
- Motor viejo: queda `simulateMatch` para partidas guardadas y los componentes `LiveMatchScreen`/`LiveSeriesScreen`, ya sin uso desde `AuctionPage` (se pueden borrar en otro sprint).

## Pruebas
`figuresMatch/FiguresMatchScreen.test.tsx` (frames = resultado, momentos con un toque, ≤ 8 palabras por línea), `AuctionPage.test.tsx` y `fullFlow.test.tsx` actualizados al flujo nuevo del modo en vivo.
