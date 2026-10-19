# Pedido de playtest — 19/10/2026

Alcance autorizado, seguimiento de trabajo (no confundir planificación con entrega):

- Global actual: 300 identidades distintas de los mejores disponibles, versiones actuales/históricas coexistentes (Messi, Cristiano, Neuer), sin duplicar persona dentro de un mismo equipo.
- Fichas: escudo cromático, avatar propio con camiseta, fuente, estado de carrera, posición específica y períodos históricos disponibles con procedencia; no inventar datos faltantes.
- Investigación de APIs gratuitas y fotografías de técnicos con licencia/atribución.
- Suplentes: intercambio elegido por el usuario, no entradas aleatorias automáticas.
- Serie nueva: ida/vuelta, tercero si empatan y penales si continúa la igualdad; conservar versiones antiguas.
- Nueva partida vuelve a elegir categoría; revancha conserva categoría.
- Rivales de la misma u otra categoría con propiedad/elegibilidad validadas.
- Guía modal por etapas: equipo, técnico/suplentes, estrategia, partido, continuación de serie y explicación final basada en contribuciones reales y azar.
- Nueve formaciones futbolísticas con roles/layouts/composición válidos y afinidad táctica acotada. Tabla comparativa y estudio de límites.
- Estética: fondos, botones, cartas, animación de partido; movimiento reducido y tres idiomas.

Se preservan `.claude/` y el cambio preexistente en docs/qa/CODEX-005C-stress.json. No se alteran servicios externos ni se atribuyen a datos de diseño verificaciones biográficas que no tienen.

Reanudación: cuadro táctico del usuario implementado con nueve esquemas y tabla es-AR/en/pt-BR. Hasta tres reservas manuales, incluso dos MED para el 4-5-1. Camisetas de cancha y avatar con paleta del club/selección de referencia, escudo SVG propio con exterior transparente y paneles de colores. No se infiere selección por nacionalidad cuando la referencia es un club. Pendiente futuro explícito: auditoría común de OVR/atributos/precios (incluidos jugadores mal valorados); conservar procedencia, comparar por rol y época, revisar estimaciones por posición antes de modificar ratings.

Validación final: 810 pruebas aprobadas en 66 archivos; typecheck, lint y build aprobados. QA visual parcial de escritorio/móvil y cuadro táctico antes de deshabilitarse Browser Use; escudo final verificado por DOM. Se preservan archivos ajenos. El primer dry-run de Wrangler sin versión intentó resolver una versión nueva no instalada y no ejecutó despliegue; se usa la versión anterior explícita.

Publicación: commit de implementación 10ece7d subido a origin/codex/current-club-audit. Dry-run aprobado con Wrangler 4.151.1 (341 assets). El despliegue mutativo en reclutador-app fue rechazado por revisión automática: autorización previa considerada insuficiente para este nuevo despliegue específico. Se solicitó aprobación del commit/destino exactos. **No hubo nuevo despliegue de producción**; no presentar el push como publicación del sitio.
