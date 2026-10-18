# Modo «Fútbol Argentino» (habilitado)

18/10/2026. Pedido del usuario en la lista de pendientes. El modo **Global clásico sigue siendo el predeterminado**; el nuevo es una opción elegible en la pantalla de inicio.

## Qué hace
- Nuevo modo `ARGENTINA_CLUBS` («Fútbol Argentino» / «Argentine football» / «Futebol Argentino»): juega con los 200 registros de ARG-B01..B04, elegidos por **carrera verificada en clubes de Argentina** (`leagueCountryCode: ARG`), nunca por nacionalidad (hay COL, PAR, URU y CHI en el pool).
- `modeCatalog.ts`: `ARGENTINA_PLAYERS` (Player planos arg_*), `ARGENTINA_METADATA` (carreras de cada registro), `catalogForMode`, `PLAYABLE_MODES = {GLOBAL_CLASSIC, ARGENTINA_CLUBS}`; el resto de los modos temáticos sigue «Próximamente».
- La página de la subasta usa el catálogo del modo elegido para subasta, descartes, CPU, HUD, tableros, organización, suplentes, partido y pantalla de resultado (`MatchScreen` recibe `catalog`). La partida recuerda su modo; «Reproducir sorteo» detecta solo a qué catálogo pertenece un contexto exportado (el `catalogKey` ya es específico del catálogo).
- Historial de sorteos por modo (`reclutador.duel-draws.v1` para Global —sin cambios— y `...v1.argentina_clubs`), para no mezclar ni perder el existente.
- `checkEconomicViability` y `evaluateMode` aceptan ids permitidos opcionales (el comportamiento por defecto de catalog_v1 no cambia); `validatePlayer` ya lo aceptaba.

## Verificación
- Disponibilidad: el diagnóstico del modo es «available» y compatible con CPU; sin metadatos queda «metadata_pending».
- 60 duelos completos en el pool argentino (subasta con pases y ofertas, descartes, equipos completos y partido): ningún equipo ilegal y todos los titulares son arg_*.
- Prueba de página: elegir el modo, iniciar, tirar la moneda y ver como primer futbolista el que corresponde a la semilla en la colección argentina; el historial se guarda en su propia clave y no toca la de Global.
- Navegador integrado: el primer sorteado fue Marcelo Salas (colección argentina).
- Suite completa: 643 de 643; typecheck, lint, build y `catalog:audit` correctos.

## Límites
- Los jugadores arg_* no tienen auditoría de club actual ni fotos/banderas por id (se usa el respaldo neutral; la bandera por nacionalidad sí funciona). El club actual figura «No verificado».
- Los ratings siguen siendo editoriales y sin revisión humana; el sesgo hacia River/Boca de los lotes está documentado en cada QA de lote.
- El Draft Libre sigue con los 150 del modo Global; no hay mezcla de los 150 con los 200 en un mismo pool.
- No probado en Firefox ni con un jugador humano de punta a punta (solo el flujo hasta el primer futbolista y las 60 simulaciones).
