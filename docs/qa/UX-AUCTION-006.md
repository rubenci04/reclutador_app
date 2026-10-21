# UX-AUCTION-006 — Subasta compacta, protagonista y cierre inteligente

## Antes → después
- **Antes:** la fase de oferta apilaba carta completa, avisos repetidos (banner, «acción disponible», consecuencias), reserva, capacidad, riesgo y botones; al ofertar había que subir para ver al futbolista. El nombre del equipo era un título más.
- **Después** (`AuctionBidPanel.tsx`, `AuctionPlayerBar.tsx`): el panel se organiza en tres bloques — (A) barra compacta del futbolista (avatar/foto, nombre, posición, OVR, club de referencia, precio base, pie hábil) con `position: sticky` *dentro* del panel (no fija, no tapa Ofertar ni el teclado); (B) nombre del equipo grande en el color del turno, estado «N jugadores por completar · Disponible XM» (con «Necesitás DEF ×2…» cuando faltan uno o dos) y cuatro cifras: oferta actual, mínima, disponible y máxima; (C) campo de importe + fichas rápidas pegados a **Ofertar** (botón grande) y **Pasar**. Un solo aviso visible (rival ofertó / bloqueo con su motivo). Consecuencias de ofertar o pasar, reserva y cupo de posición quedan en «Más información y consecuencias»; los casos excepcionales (reemplazo, adjudicación obligatoria, pase bloqueado) siguen visibles. `#auction-action-reason` es sólo para lectores de pantalla. Las validaciones y cifras salen del motor (`auctionAvailability`).
- El nombre personalizado se ve más grande en el inicio, en el HUD del equipo propio y en el turno; los ids internos no cambian.

## Cierre automático
Se reutiliza la base existente (`canAutoComplete` / `autoCompleteStep` / `autoCompleteAll`, `cpuAuto`, `mustSkip`): contra la CPU, cuando el humano ya tiene su once, la CPU toma el resto por el ledger a precio base. Cambios: mensaje «Tu equipo está completo. El rival termina sus incorporaciones.», resumen desplegable posterior «Ver qué fichó {rival} y cuánto pagó», y avance automático (1,4 s) del resultado de una ronda cuando la CPU se llevó una carta de una línea que el humano ya había llenado (o una adjudicación forzada por viabilidad); el botón sigue disponible. Hot-seat sigue pidiendo confirmación explícita («Completar mi equipo») y online no crea pasos locales (sólo el lado propio puede ofrecer el atajo). No cambian sorteo, presupuestos, precios ni la secuencia económica.

## Pruebas
`auctionFocus.test.tsx` (9): identidad del futbolista en el panel y cuatro cifras en es-AR/en/pt-BR, botones accesibles (`aria-describedby` resolubles), nombre personalizado, cierre contra la CPU con ledger a precio base y presupuesto ≤ tope, resumen de fichajes, el humano con puestos pendientes no recibe adjudicaciones automáticas, hot-seat sin automatización, online sin `submit` ni panel automático, avance automático sólo sin decisión humana. Pruebas existentes de flujo completo, hot-seat y online siguen pasando.

## Limitaciones
- Revisión visual: a 375 px se comprobó en el navegador del panel (captura parcial: barra del futbolista, nombre del turno, las cuatro cifras, fichas, importe y Ofertar/Pasar visibles juntos; sin scroll horizontal; Ofertar queda a ~460 px de la barra sticky). 768 y 1280 px no se capturaron; solo se confirmó por CSS que la grilla de cifras es de 4 columnas.
- El estado «Necesitás…» se calcula con los cupos del HUD; no hay prueba visual con teclado virtual real.

## Resultado
typecheck, lint y build OK; `npm test`: 113 archivos, 1226 pruebas aprobadas, 0 fallidas.
