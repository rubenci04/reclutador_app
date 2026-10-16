# Draft Legends — reglas de trabajo

- Leer README.md, docs/ROADMAP.md, docs/TASK_BOARD.md y docs/TEST_PLAN.md antes de modificar el proyecto.
- Toda funcionalidad nueva con textos visibles debe entregar simultáneamente traducciones es-AR, en y pt-BR, incluidos accesibilidad y errores. Procedimiento: docs/decisions/ADR-0002.md.
- Mantener códigos internos ARQ | DEF | MED | DEL; traducir únicamente etiquetas. Nombres propios y Draft Legends permanecen intactos.
- Arquitectura por funcionalidades en src/features; componentes compartidos en src/components. TypeScript strict. No agregar abstracciones sin uso.
- Ejecutar npm run typecheck, npm run lint, npm test y npm run build. Documentar pruebas no ejecutadas y sus impedimentos.
- Respetar el alcance de cada encargo. No implementar fases posteriores ni configurar servicios externos sin instrucción.
- Conservar decisiones y planificación; registrar contradicciones y actividades reales en docs/logs y el tablero.
- Nunca guardar credenciales. No realizar push ni deploy en CODEX-001.
