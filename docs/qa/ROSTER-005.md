# ROSTER-005 — Presupuesto, cinco suplentes y billetera visible

Base: `main` 452a23d. Sin cambios en la subasta principal (22 cartas), los precios de futbolistas y técnicos, ni en las probabilidades del simulador.

## 1. Presupuestos (`defaultBudgetForMode`, `roster-budget-v2`)
| Partida nueva | Antes | Ahora |
|---|---|---|
| Actualidad / ligas | 150 M | **200 M** |
| Leyendas | 200 M | **250 M** |
| Cruce entre categorías | el mayor | el mayor (250 M si alguna es de Leyendas) |
| Personalizada | importe elegido | importe elegido (se agregó el preset 250 M; límites 60–300 M intactos) |

Se conservan la reserva del técnico y las validaciones (`preflightMatchConfig`). Las partidas guardadas y las repeticiones llevan su `config.budget` y no cambian.
**Online (pendiente coordinado):** las salas nuevas siguen usando los presupuestos anteriores (150/200 M, `legacyOnlineBudgetForMode`) y las reglas de tres suplentes; cambiar el estado compartido o el servidor exige una migración coordinada que no se hizo.

## 2. Hasta cinco suplentes opcionales (`bench-5-v1`)
- Marcador `config.bench = 'bench-5-v1'` en `MatchConfig` (lo valida `parseMatchConfig`). Sin marcador (partidas, repeticiones y salas online anteriores) el límite sigue siendo 3 y no se ofrece arquero.
- Reutiliza `substitutePool`, `substituteMarket` y `buySubstitute`; nuevo `benchStatus` (plazas ocupadas / límite, derivado del juego). Los 11 titulares se compran primero en la subasta de siempre; el banco se compra después, con el sobrante, tras elegir o rechazar al técnico. **No hay adjudicaciones obligatorias nuevas.**
- Reglas: 0 a 5, cualquier posición (incluido un arquero, línea nueva del mercado), sin repetir futbolistas del propio o del rival, solo lo que el saldo permite. La etapa se puede cerrar con «Terminar suplentes» (y reabrir mientras los planteles no estén bloqueados); contador «Suplentes 0/5».
- CPU (`autoBuySubstitutes`): compra al mejor asequible de DEF, MED, DEL y ARQ y luego rellena con el mejor asequible hasta 5, nunca más de lo que puede pagar.
- Intercambios titular–suplente sin cambios: un arquero solo entra por el puesto de arquero.
- Único toque fuera de la subasta: `isValidBench` del simulador aceptaba bancos de hasta 3; el máximo pasó a 5 (`MAX_BENCH`). Es solo validación: la política de cambios (`subs-v1`, un cambio por minuto 45/60/75, máximo 3 cambios) y sus probabilidades no cambian.

## 3. Billetera permanente (`Wallet.tsx`)
Barra compacta pegajosa (`position: sticky; top: 0`) con icono, nombre del equipo, saldo grande («137 M»), barra de presupuesto, reserva del técnico pendiente, máximo ofertable durante la puja y un desplegable «Desglose» (presupuesto, gastado, saldo, reserva, máximo y acceso al marcador completo). El marcador existente queda debajo (`top: var(--wallet-h)`), sin duplicar el HUD completo.
- Los valores salen de `buildWalletModel` (saldo = presupuesto − gasto; máximo ofertable = `maximumSafeBid` del motor); no hay saldo paralelo y se actualiza en el mismo render de cada compra o contratación.
- Quién se ve: online, el propio jugador; contra la CPU, la persona; en hot-seat, quien puja o abre la ronda, y en la etapa de técnico/suplentes, quien está organizando.
- Textos en es-AR, en y pt-BR (`wallet.*`, `market.*`). Medidor oculto a lectores de pantalla; el saldo se anuncia como estado.

## 4. Comprobaciones
- Pruebas: `roster005.test.tsx` (presupuestos y mezcla, online legado sin marcador, versionado de la configuración, bancos de 0 a 5 con arquero y sin repetidos, saldo ajustado, partida de 3 suplentes intacta, CPU, billetera con saldo/máximo/reserva y actualización, contador, terminar y reabrir). Expectativas actualizadas por el cambio deliberado: 200/250 M, preset 250, exportación con `bench`, banco inválido de 6.
- Visual (navegador integrado, 375 px y escritorio): la billetera acompaña el scroll sobre la ficha del futbolista, los botones de puja y el mercado de suplentes sin taparlos; saldo 200 → 197 M tras una adjudicación; reserva «8 M» y «Máx. ofertable» visibles; contador 0/5 → 1/5 y saldo 120 → 115 M al comprar un arquero. No se probó con teclado virtual real.
- typecheck, lint y build: OK.

## Resultado final
`npm test` (una sola ejecución completa al cierre): 119 archivos, 1.284 pruebas aprobadas, 0 fallidas.
