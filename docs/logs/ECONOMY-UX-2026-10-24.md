# Presupuesto y vestuario — 24/10/2026

- El estado de partida ya tenía el desglose junto al medidor, el pase excepcional ámbar, CoachMarket antes del mercado, el banner compacto de espera y las claves budgetBreakdown/locker en es-AR, en y pt-BR. Se conservan textos, etiquetas accesibles y reglas del motor.
- AuctionBidPanel muestra siempre saldo, reservado y máximo ofertable, incluso sin el HUD opcional: toma el saldo del juego y el máximo de availability, sin cambiar fórmulas ni guardar valores derivados.
- Vestuario: los dos humanos pueden resolver sus técnicos antes de abrir el escaparate compartido. El indicador conserva el paso DT mientras falte cualquiera de los dos técnicos, incluida la CPU. Se mantienen las confirmaciones individuales del once y el orden CoachMarket → BenchShowcase/SubstituteMarket → LineupOrganizer.
- Nuevas regresiones: desglose visible fuera de details en tres idiomas, fallback sin HUD, clase ámbar y callback de pasar; recorrido DT → diez suplentes → formación en tres idiomas, sin mostrar cartas mientras queda un DT pendiente. coachFlow, gameplayPolish y fullFlow conservan sus comportamientos existentes.

Controles finales: `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` terminan con código 0. **1.402 pruebas en 132 archivos**, sin fallos. Lint conserva tres advertencias previas de Fast Refresh en DribblePanel; build sin advertencias de chunks grandes. Sin publicación ni cambios de economía, motor o partidas históricas.
