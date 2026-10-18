# Simulación, técnicos y dificultad CPU — QA

Fecha: 18/10/2026. Decisión: ADR-0013. Fuentes y límites de datos: research/COACH_REVIEW.md.

## Controles finales ejecutados

- npm run typecheck: PASS.
- npm run lint: PASS.
- npm test: PASS, 56 archivos, 747 pruebas, sin omitidas; duración 62,86 s.
- npm run build: PASS. Advertencia preexistente sobre chunks mayores de 500 kB; sin bloquear compilación.
- git diff --check: PASS.

## Calibración ejecutada: 6.000 partidos sintéticos

Mismas 2.000 semillas en cada escenario; precios sintéticos fijos para aislar efectos, sin presentar los onces como planteles comerciales asequibles. Resultado completo: SIMULATION-COACHES-calibration.json.

| Escenario | Victorias | Empates | Derrotas | Victoria % |
|---|---|---|---|---|
| Equipos iguales | 576 | 848 | 576 | 28,8 |
| Atributos iguales; once S+ contra D, solo diferencia de calidad | 692 | 814 | 494 | 34,6 |
| Atributos y niveles superiores + técnico S + control del mediocampo | 1403 | 493 | 104 | 70,15 |

El tercer escenario combina causas, no aísla una táctica ni un técnico. Siguen existiendo derrotas del equipo superior; no hay victoria garantizada. Se verifica simetría de iniciativa, determinismo, tope, mejora con upgrades, estadísticas coherentes y contribución de suplentes solo tras entrar. Los resultados sintéticos no son una tasa esperada para todas las partidas reales.

## CPU: 270 duelos del catálogo real

SIMULATION-COACHES-cpu.json: 30 semillas comunes por cada una de nueve combinaciones EASY/NORMAL/HARD × CONSERVATIVE/BALANCED/AGGRESSIVE; humano con política de oferta base+2. Todos completan 22 jugadores exclusivos y ambos onces; gasto de jugadores hasta 92M, contratación de técnico posterior y gasto total hasta 100M. El poder inicial del panel coincide con el promedio efectivo del partido sin táctica ni sustituciones. La dificultad queda registrada en las decisiones y las ofertas no superan su valoración privada.

En BALANCED, las medias de los onces CPU observadas son 84,03 (EASY), 84,23 (NORMAL) y 85,13 (HARD). Es evidencia de estas semillas/política, no una garantía universal de victoria ni una clasificación definitiva de dificultad. La agresividad puede aumentar el gasto sin mejorar siempre la media.

La batería histórica de 3.000 duelos también corrió en la suite. Su salida nueva se conserva en SIMULATION-COACHES-legacy-cpu.json; CODEX-005C-stress.json se restaura a su evidencia original para no reescribir historia.

## Integración e idiomas

Parser de reserva estricto, default antiguo 1M, default nuevo 8M, oferta con S y 1M, doce técnicos exclusivos, exportación del contexto con coachReserve y afinidad guardada en resultado. Cartas y selector de reserva verificados mediante DOM en es-AR/en/pt-BR. La suite mantiene las pruebas de Draft Libre, modalidades, tácticas, persistencia y online local.

## Pruebas no ejecutadas y límites

- QA visual de escritorio/móvil: NO EJECUTADA. En esta sesión, el navegador integrado resolvió el preview local del proyecto a otra aplicación; la limitación está registrada en CATEGORIES-LEGENDS.md. No se presenta DOM como verificación de layout.
- Playtest humano del balance: PENDIENTE. Las constantes son una primera calibración explícita y acotada.
- Auditoría factual completa de las 100 biografías/equipos actuales: PENDIENTE. Se corrigieron once fichas parcialmente y se muestra equipo de referencia y edad aproximada al año 2026. No se anuncia empleo actual verificado.
- Sin despliegue ni cambios de servicios externos. No se validó esta nueva versión en un backend real con dos personas; solo regresión local de online existente.
- Se conservan los resultados grabados; recalcular un duelo histórico con la nueva capa puede producir otro resultado, documentado en ADR-0013.
