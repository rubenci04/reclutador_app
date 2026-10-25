# Trabajo paralelo con Claude y Codex

Cada agente debe usar su propia carpeta y su propia rama. Dos ramas en una misma carpeta no aíslan cambios sin commit.

La carpeta original conserva el trabajo de Claude. Codex publicó el sprint 8 desde un worktree aislado sobre de39d72. No ejecutar git reset --hard, git clean, checkout de archivos ni push --force para integrar ambos trabajos.

Para Claude: primero guardar TODO su trabajo local en una rama de respaldo propia y hacer commit antes de actualizar archivos. Después git fetch origin y fusionar origin/main en esa rama, resolviendo archivos compartidos conservando las mejoras de ambos. Si Git presenta conflictos, revisarlos; no elegir ours/theirs para todo el archivo sin inspección. Ejecutar typecheck, lint, test y build, subir su rama y abrir un PR a main. Los archivos de sprint 8 que ya sean idénticos a main no necesitan reimplementarse.

Para trabajos futuros: crear otra carpeta con git worktree add ../reclutador-claude -b claude/sprint-9-10 origin/main y abrir esa carpeta en Claude. Mantener la copia original de trabajo hasta comprobar que todos sus cambios están guardados. Un agente publica/integrará a main por vez.

El push a GitHub y el deploy del Worker reclutador-app son pasos separados; seguir docs/DEPLOY.md. No confundir el antiguo proyecto Pages con producción. Compartir siempre rama y SHA publicado entre agentes.
