# Sprint 8 — Volver a editar formación, táctica y técnico antes del partido

Alcance: partidas locales (contra la CPU y dos jugadores en la misma computadora). Online no se tocó.

## Qué cambió
- **Volver a editar** (`AuctionPage.tsx`): en la pantalla de poder y en la de elección de táctica hay un botón «Volver a editar mi equipo» (contra la CPU) o «Volver a editar: <nombre>» (uno por jugador en hot-seat). Pide confirmación (`ConfirmNavigation`) y avisa que las tácticas ya elegidas se descartan **para los dos lados** y hay que elegirlas de nuevo. Efecto: ese jugador vuelve a la etapa 1 (formación, orden del once, suplentes, técnico); se reinicia `strategyChoice`. En hot-seat el otro jugador conserva su once confirmado y solo vuelve a elegir táctica. Se conservan los suplentes comprados y el once organizado. El foco va al título de la etapa y el indicador «Paso n de 3» se actualiza solo.
- **Cambiar de táctica:** en hot-seat, mientras el segundo jugador no haya confirmado (pantalla de traspaso y su propia pantalla de elección) aparece «Cambiar la táctica de <primero>»: descarta la elección del primero sin mostrarla. Contra la CPU, después de confirmar aparece «Cambiar mi táctica» antes de empezar. Para que eso no permita contrarrestar a la CPU, **la táctica de la CPU ya no se muestra antes del inicio** (tarjeta sellada: «La vas a ver cuando empiece el partido»); antes se veía en la revelación previa al inicio.
- **Técnico:** `releaseCoach(game, participant)` (`coachHiring.ts`, pura): solo en `TEAMS_COMPLETED`, con técnicos activos, sin `matchResult` y con algo que liberar; resta `coachPrice` de `spent` y borra `coachId`, `coachPrice`, `coachTier` y `coachDeclined`. En la etapa de organización, `CoachMarket` muestra «Cambiar de técnico» (devuelve el precio y reabre la oferta) y, si se había rechazado, aparece «Contratar un técnico». La oferta depende del dinero disponible, así que tras el reembolso vuelve a ser la misma de antes. Respeta el saldo y las reservas del mercado.
- **CPU:** conserva su equipo y su técnico. Su táctica sale de su propio once y la semilla (`selectCpuStrategy`), no del humano; no hizo falta recalcular nada.
- Textos en es-AR, en y pt-BR (`stages.backToEdit*`, `strategyChoice.changeMine/changeFor/sealedCpu`, `coach.change/changeHint/hireAfterDecline/declinedNote`).

## Regla de exclusividad de técnicos (tal como está, sin cambios)
**No son exclusivos.** Cada recruiter recibe su propia oferta, sembrada por lado (`${seed}:coaches:${side}`) desde el mismo pool de su categoría, y `chooseCoach` solo mira la oferta propia: los dos pueden contratar al mismo técnico (el comentario del código lo dice: «Opponents may share a coach»). Hay una prueba que lo documenta con semillas reales. No se cambió la regla; queda para decisión del dueño.

## Online (solo reporte)
`OnlineTeamsStage` ya permite volver a editar el once y la formación hasta elegir estrategia (`onEdit`), pero no permite cambiar de técnico una vez contratado ni volver tras elegir la estrategia: esa elección secreta queda fijada en el servidor (`online_set_strategy` rechaza cambiarla). Tiene, por lo tanto, un problema parecido solo para el técnico; no se tocó.

## Límites
- Cambiar de táctica contra la CPU sella la táctica de la CPU hasta el inicio del partido; si se prefiere mostrarla, habría que quitar el cambio de táctica.
- «Volver a editar» no permite modificar compras ya hechas de la subasta (solo formación, orden, suplentes y técnico).
- Verificación visual en celular pendiente (no hay navegador): mirar `.return-to-edit`, la tarjeta sellada `.strategy-sealed` y el cartel «Contratar un técnico».

## Pruebas
`coachRelease.test.ts` (reembolso exacto, campos limpiados, rechazos fuera de fase/sin técnico/tras el partido, regla de técnico compartido); `fullFlow.test.tsx` bloque C: contra la CPU (confirmar → poder → volver → cambiar formación y técnico → confirmar → táctica → cambiar táctica → empezar; el partido arranca con la formación y el técnico nuevos y `spent` = precios pagados + suplentes + técnico) y hot-seat (cambiar táctica antes de que confirme el segundo, volver reinicia las elecciones sin filtrar la previa, el otro once se conserva).
