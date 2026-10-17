# CODEX-005G-B — Descartes, equilibrio y animaciones

Fecha: 17/10/2026. Base comprobada: `61b6e3a`, rama `codex/current-club-audit`, árbol limpio. Se leyeron AGENTS, README, ROADMAP, TASK_BOARD, TEST_PLAN, ADR-0008, QA 005G-A y módulos relacionados. Catálogo: 150 registros conservados, sin nuevos futbolistas.

## Descartes implementados

- Reserva única de tres por partida, compartida por ambos participantes. Dos pases sin oferta descartan si existe reemplazo legal; un pase individual o frente a oferta rival no consume reserva.
- El reemplazo conserva posición, índice de ronda y prioridad. Equipos y gastos mantienen sus valores; solo una adjudicación avanza la ronda. Se completan 22 fichajes, con hasta tres candidatos adicionales.
- Se excluyen todos los IDs fichados, descartados y previstos en otras rondas. Una carta descartada nunca vuelve a aparecer. El registro incluye `discard` con ronda, ID retirado y reemplazo.
- Búsqueda finita entre los candidatos elegibles: orden canónico por ID, claves aleatorias ponderadas por historial original, semilla `seed:discard:uso:ronda`; cada candidato se comprueba con la misma viabilidad exacta de reparto y presupuestos. No se intenta una cantidad indefinida de sorteos.
- El contexto original y la misma secuencia de acciones/economía producen los mismos reemplazos. DISCARD_RESULT conserva la decisión ya aceptada; revelar no sortea otra vez. Acciones durante esa fase y doble revelación se rechazan.
- Reserva agotada: segundo pase sin oferta anuncia receptor/importe y requiere **Confirmar adjudicación obligatoria**. Si no hay reemplazo viable aunque quede reserva, no se consume un descarte y se comunica la misma resolución legal antes de confirmar. Esta excepción evita bloquear partidas con pools pequeños o saldos que impiden cualquier sustitución. Si tampoco hay adjudicación legal, `NO_LEGAL_ASSIGNMENT` bloquea y no modifica fondos ni planteles.
- Contador 3/3 → 0/3 visible durante reclutamiento y partido. Confirmación distinta de Pasar para descarte conjunto. Resorteo animado de 350 ms (sin espera con movimiento reducido), sin reiniciar gastos ni fichajes.
- La entrada de oferta ahora identifica también el ID del candidato: un resorteo en la misma ronda no recupera el importe del candidato anterior. Los registros CPU incorporan ese ID para que el aviso de decisión no quede asociado a la carta descartada.

## Defectos confirmados y correcciones del partido

**Semillas.** El duelo usa la semilla nueva de 005F y su sufijo `:match`; repetir deliberadamente un resultado conserva la misma simulación. Draft Libre, en cambio, usaba `local-match-1-IDs` al entrar con un once persistido porque su contador local se reiniciaba al remontar. Se comprobó el flujo y se reemplazó por semilla criptográfica creada exclusivamente en inicio/revancha. La generación segura se comparte con el duelo; no ocurre durante render. Si falla, aparece un error traducido. Reproducción conserva el resultado calculado.

**Sesgo de orden.** No había una condición especial para favorecer al humano, pero la iniciativa solo usaba el margen ofensivo del primer equipo:

```
v1: presión = (A_local − D_rival) + 0,45 × (M_local − M_rival)
v2: presión = [(A_local − D_rival) − (A_rival − D_local)] / 2
              + 0,45 × (M_local − M_rival)
probabilidad de iniciativa = clamp(0,5 + presión / 150, 0,24, 0,76)
```

La versión v1 puede favorecer o perjudicar al primer lado incluso con equipos idénticos, según la diferencia ataque/defensa. En v2, equipos equivalentes dan exactamente 0,5; intercambiar equipos complementa la probabilidad. La división por dos compara simétricamente los dos márgenes conservando la escala. No se ajustaron probabilidades para perseguir una tasa de victorias: tiro, puntería, gol, límites y seis bloques mantienen sus fórmulas previas. Nueva versión `local-match-v2`; las semillas siguen siendo deterministas y el resultado ya calculado no se recalcula al reproducirse.

**Validez de planteles.** El resumen del draft contaba once selecciones pero no bastaba para garantizar once IDs distintos en posiciones correctas. El simulador ahora valida unicidad de los once slots y correspondencia posicional, además de completitud y presupuesto. No admite equipos incompletos, duplicados ni un arquero colocado como delantero.

**Poder global.** `global = redondear_a_un_decimal((ataque + defensa + mediocampo) / 3)`. Es un resumen en la escala de los atributos, adicional al rating promedio, mostrado con explicación y análisis sectorial conservado. No es un bono ni un factor nuevo de goles. Los once contribuyen mediante los grupos posicionales existentes:

- Ataque: ATT de DEL 55%, MED 25%, DEF 10%, ARQ 10%.
- Defensa: DEF de ARQ 30%, DEF 48%, MED 16%, DEL 6%.
- Mediocampo: MEN de MED 45%, PHY de MED 20%, MEN de DEF 15%, DEL 10% y ARQ 10%.

El gasto y el rating promedio no entran en esas fórmulas. PHY influye actualmente a través del grupo MED; no se inventaron contribuciones específicas de roles laterales/extremos. Un poder global mayor resume calidad, pero diferencias sectoriales siguen importando y no garantiza una victoria. Las muestras con superioridad equilibrada confirman ventaja estadística en ambos lados.

## Calibración real reproducible

Se ejecutaron **6.000 partidos por versión**: tres escenarios, 1.000 semillas por escenario y orientación, intercambiando los equipos con las mismas semillas. Son 12.000 ejecuciones comparativas, no 12.000 semillas independientes. Semillas `005G-B-calibration-0..999`.

Fixtures exclusivamente sintéticos y separados del catálogo: dos planteles 4-3-3 de IDs distintos, 44M cada uno y rating promedio 80. B: ATT 80, DEF 70, PHY/MEN 75 para todos; A: mismos atributos más 0, 5 o 15. Así se aísla la contribución de atributos/posición, sin confundir presupuesto o rating con fortaleza. Los registros deportivos reales no se editaron. Poder A/B: 75/75, 80/75 y 90/75 (diferencias 0, 5 y 15).

Resultados desde la perspectiva del equipo A; cada fila suma 1.000:

| Escenario / ubicación de A | V1: V/E/D | V2: V/E/D | Goles A/B V1 | Goles A/B V2 |
|---|---|---|---|---|
| Equivalentes / primero | 362/373/265 | 309/379/312 | 0,760/0,592 | 0,678/0,674 |
| Equivalentes / segundo | 265/373/362 | 312/379/309 | 0,592/0,760 | 0,674/0,678 |
| Moderadamente superior / primero | 476/338/186 | 409/355/236 | 0,954/0,455 | 0,846/0,554 |
| Moderadamente superior / segundo | 358/374/268 | 420/361/219 | 0,761/0,617 | 0,850/0,543 |
| Claramente superior / primero | 692/233/75 | 639/268/93 | 1,411/0,249 | 1,280/0,303 |
| Claramente superior / segundo | 559/303/138 | 617/275/108 | 1,113/0,392 | 1,240/0,334 |

La diferencia de victorias por ubicación de A cae de 97 a 3 en equivalentes, de 118 a 11 en superioridad moderada y de 133 a 22 en superioridad clara. Las discrepancias residuales son observaciones de esta muestra finita, no una prueba de equiprobabilidad exacta de marcadores por semilla. La ventaja del mejor equipo no se impone como garantía: A superior todavía pierde 93–108 partidos en el escenario claro.

Distribuciones completas de marcadores, promedios y sectores: [antes](CODEX-005G-B-before.json) y [después](CODEX-005G-B-after.json). Se comprobaron goles de eventos contra marcador final en las 6.000 simulaciones de cada muestra. El archivo anterior se capturó ejecutando el simulador v1 antes de editarlo; no se generó retroactivamente con v2.

Para regenerar la muestra posterior en PowerShell:

```powershell
$env:MATCH_CALIBRATION='after'
npx vitest run src/features/local-match/calibration.test.ts
Remove-Item Env:MATCH_CALIBRATION
```

El diagnóstico protege el archivo anterior: regenerarlo exige el simulador original v1 de la base `61b6e3a`. El código nuevo no debe escribirse sobre el informe histórico anterior.

## Animaciones y accesibilidad

CSS/SVG propio: entrada de carta 240 ms, retirada 350 ms, oferta 300 ms, aparición de camiseta 280 ms y celebración de gol 700 ms. La celebración procede del último bloque revelado y no incrementa el marcador. Son efectos de presentación sobre decisiones almacenadas, sin nuevas adjudicaciones/azar. Prefers-reduced-motion desactiva movimientos y elimina la espera del descarte. Textos, confirmaciones, errores, poder y gol traducidos es-AR/en/pt-BR. Sin fotos, audio ni recursos externos nuevos.

## QA ejecutada

- `npm run typecheck`, `npm run lint`, `npm run build`: aprobados.
- `npm test -- -t '^(?!.*(?:plays 3,000|2,400-match|diagnoses 1,000)).*$'`: **498 aprobadas, tres omitidas, 501 totales**, 22 archivos. Incluye calibración posterior de 6.000 partidos, 1.000 subastas completas con tres descartes, recorrido UI hasta ambos 11/11 y partido/reproducción/revancha.
- Se omitieron solamente las baterías históricas de 3.000 partidos CPU, el diagnóstico antiguo de 2.400 encuentros y la comparación de 1.000 sorteos por política de 005F. Se adaptaron sus helpers cuando correspondía sin sobrescribir sus resultados históricos. La calibración nueva cubre el algoritmo modificado.
- Específicos: seis pruebas de descartes, reserva compartida, pase individual/oferta vigente, misma posición/prioridad, mantenimiento de fichajes y saldos, 25 IDs revelados/22 adjudicados, no retorno de descartados, búsqueda inviable/escasa, fallback anunciado, error preciso sin efectos y rechazo de doble ejecución.
- Partido: iniciativa simétrica/complementaria, planteles completos únicos y posicionales, PHY/MEN/ATT/DEF, poder agregado, ausencia de bonus al variar solo precios en fixtures, marcador/eventos y posesión. Semillas nuevas al remontar Draft Libre, entropía solo en inicio, celebración de un gol real y reproducción sin rematch.
- `npm run catalog:audit`: salida 0, 150 consistentes, cero incidencias y B01/B02/B03 parcialmente aprobados; global pending/false y 350 IDs faltantes. No hay aprobación de catálogo completo ni cambios de contenido en la auditoría histórica regenerada.
- **QA visual NO EJECUTADA**: intento de navegador integrado a `http://127.0.0.1:5173/` devuelve `Local browser use is disabled in Work settings`. Sin modificar configuración ni certificar píxeles mediante pruebas DOM.

## Playtest manual pendiente

1. Iniciar duelo, moneda y subasta. Ver 3/3. Pasar con ambos sin oferta: confirmar descarte, retirada y NUEVO SORTEO; contador 2/3. Posición, ronda, prioridad, gastos y fichajes deben conservarse.
2. Repetir hasta 0/3. Ningún descartado reaparece; el siguiente doble pase anuncia receptor/precio y pide confirmar adjudicación. Probar una oferta rival seguida de pasar: adjudica esa oferta sin consumir descartes.
3. Continuar hasta 22 fichajes exclusivos y ambos 11/11. Comprobar cupos y saldos no negativos, apariciones de camisetas y que un doble clic no descarta/adjudica dos veces. Para reproducir, usar contexto original y la misma secuencia de ofertas/pases.
4. Iniciar partido, comparar poder global y sectores, comprobar celebración solo al revelar un gol y marcador coherente. Reproducir mantiene resultado; revancha genera otra semilla. En Draft Libre, volver a entrar con el mismo once y comenzar: no debe recrear la primera semilla anterior.
5. Revisar escritorio, 390 y 360 px, tres idiomas, lector de pantalla y movimiento reducido. Ninguna animación debe tapar controles ni crear scroll horizontal; el descarte reducido debe revelar inmediatamente sin movimiento. Verificar gol, mensajes de reserva agotada y fallback sin reemplazo.

## Archivos y Git

Nuevos: `discards.test.ts`, `calibration.test.ts`, ambos JSON estadísticos, este informe, registro de trabajo y `DraftPage.match.test.tsx`. Modificados: motor/tipos/CPU y pruebas de subastas, AuctionPage, helpers de regresión, simulador/tipos/PRNG/MatchScreen y pruebas, semilla de DraftPage y drawHistory, tres diccionarios, CSS, README, ADR-0008 y TASK_BOARD.

Entrega mediante commit local específico en `codex/current-club-audit`; hash informado al finalizar y árbol limpio verificado tras commit. Sin push/deploy, Supabase, formaciones nuevas, tácticas avanzadas ni expansión del catálogo.
