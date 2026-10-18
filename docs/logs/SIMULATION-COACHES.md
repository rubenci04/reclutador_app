# Simulación, técnicos y CPU — 18/10/2026

## Continuidad y alcance

Se completó el push previamente bloqueado tras autorización explícita del usuario: d81eb51 en origin/codex/current-club-audit (rubenci04/reclutador_app). El remoto quedó asociado a esa rama; no se desplegó. El pedido posterior autoriza pulir simulación, técnicos y dificultad CPU en el mismo proyecto.

Antes de editar se volvieron a leer README, ROADMAP, TASK_BOARD y TEST_PLAN, además de ADR-0002 y COACHES. Se inspeccionó el código real: los 100 técnicos y su efecto ya existían, aunque el usuario creía que no estaban implementados; la documentación antigua del tablero también decía online sin técnicos, contradiciendo onlineDuel y COACHES. Se amplió el módulo existente y se registró el estado actual sin borrar las decisiones históricas. El directorio .claude/ ajeno y sin seguimiento se conserva fuera de los commits.

## Trabajo realizado

- squad-quality-v1: S+ para medias 98–99 en simulación, composición del once y bonus acumulado con tope; no altera el modelo/IDs/precios del catálogo.
- Fuerza efectiva compartida entre panel y simulador. El partido muestra promedios efectivos, incluidos táctica, técnico y suplentes que entraron; la posesión incorpora los mismos bonus de mediocampo.
- coachReserve en MatchConfig: selector 1–8M, valor nuevo 8M, compatibilidad 1M antigua; las ofertas, presupuesto seguro, preflight y CPU respetan la reserva. Cada oferta nueva con reserva completa incluye un S y otro de 1M.
- Se conservan las 100 cartas (70/30, 54 ARG), se corrigen parcialmente once fichas mediante fuentes y se diferencia equipo de referencia de empleo actual. Edades aproximadas a 2026 y años de vida. Los niveles de Luis Enrique y Bianchi pasan a S como decisiones editoriales; no se favorece por nacionalidad.
- Afinidad técnico/táctica acotada y dificultad CPU separada de agresividad, con decisiones registradas. La CPU no recibe ventaja oculta en la simulación ni conoce la selección secreta humana.
- Textos es-AR/en/pt-BR simultáneos, pruebas de integración y calibración. ADR-0013 explicita el cambio respecto del S+ editorial anteriormente propuesto y los límites de reproducción entre versiones.

Las primeras ejecuciones detectaron dos expectativas anteriores que ya no correspondían: el panel sin técnico ahora incluye calidad de plantel y el contexto de una partida nueva incluye coachReserve:8. Se actualizaron con aserciones de la nueva conducta; el resto de la regresión se conserva. Una hipótesis de prueba sobre presupuesto 60M fue reemplazada por una frontera sintética controlada, porque el catálogo real sí podía formar los equipos con esa reserva.

Los tests históricos regeneran CODEX-005C-stress.json. Se conserva su versión original y se guarda el resultado actual en SIMULATION-COACHES-legacy-cpu.json, sin reescribir evidencia histórica. Resultados finales y limitaciones: qa/SIMULATION-COACHES.md.
