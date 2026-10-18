# Triage del informe QA externo (2026-10-18)

Cada hallazgo se contrastó con el código antes de actuar.

## Aplicado ahora (DL-F04-UX-005)
- Draft Libre: ModeSelector era inerte (el estado `mode` no se usaba; DraftPage, PlayerSelector y useDraftStore usan DRAFT_CATALOG). Se retiró el selector; soportar modos en Draft Libre queda fuera de alcance.
- Contador «Descartes disponibles» fuera de la pantalla del partido.
- Modos no jugables agrupados en <details> «Próximas colecciones (N)».

## Futuro (tablero): DL-F05-ONLINE-005, DL-F05-ONLINE-006, DL-F04-TACTICS-008

## Contradicciones con el informe (no se actuó)
- Carrera STALE_STATE en COIN_TOSS/DISCARD_RESULT: no es un fallo. useOnlineSync reaplica la intención sobre el estado más reciente y, si la fase ya avanzó, la intención devuelve el mismo estado y no envía nada. Restringir al anfitrión empeoraría el caso de pestaña del anfitrión en segundo plano (temporizadores limitados).
- Cierre de SIMULATING online: el servidor acepta la fase y MatchScreen se muestra igual; solo falta marcar la sala FINISHED, que va con DL-F05-ONLINE-005.

## Sin prioridad por ahora
Botones de REVEAL_PLAYER/ROUND_RESULT por rol (decisión de diseño), unificar suplentes, descartes individuales (ya anotado en DL-F04-UX-004), Edge Functions y pg_cron (DL-F05-ONLINE-001).
