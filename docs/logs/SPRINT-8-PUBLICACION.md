# Publicación sprint 8 — 25/10/2026

Pedido explícito de commit, push y despliegue del trabajo de esta conversación. Preparado en worktree aislado, rama codex/sprint-8-publicacion, base de39d72. La carpeta original de Claude permanece intacta.

Incluye mejoras online, responsive, presupuesto/vestuario, QA/performance, movimiento contextual y todos los nodos Canvas. Excluye deliveryRing, su test, deliveryPrecision, pulsación larga, overlay de duelos y cambios posteriores del motor de Claude. attackTree/kernel/session/snapshotValidation permanecen idénticos a la base.

Primera suite aislada: 1.445/1.447; dos hashes de fuentes TXT difirieron sólo por CRLF del checkout nuevo. Bytes de las fuentes restaurados a la copia original tras verificar contenido idéntico. No se modifican hashes ni tests para ocultarlo. Repetición aprobada: 1.447 pruebas en 133 archivos, 175,17 s. Se fija eol=lf en .gitattributes exclusivamente para ambas fuentes, cuyos hashes se calcularon sobre LF, para evitar el mismo problema en futuros checkouts de Windows. Typecheck, lint y build iniciales aprobados (tres warnings previos de Fast Refresh; aviso debugName de bundler).

Validación final: typecheck, lint, npm test -- --maxWorkers=4 y build aprobados; verificación de chunks (50 JS, máximo 341.461 bytes, 1.200 filas idénticas a las fuentes) y dry-run de Wrangler 4.151.3 aprobados. El build incorpora sólo URL y clave publishable pública de Supabase en memoria; no se copió .env.local. Push/deploy: pendiente de registrar tras ejecución.

Guía de integración: docs/PARALLEL_WORK.md. No copiar .env.local ni guardar secretos en Git.

## Push y bloqueo de producción

Commit de código bc7648c, subido correctamente a origin/codex/sprint-8-publicacion. La revisión automática rechazó el comando de push a main y despliegue Worker por considerar insuficiente la autorización explícita para producción (también citó la restricción histórica de CODEX-001). No se ejecutaron push a main ni deploy; requieren confirmación explícita del usuario. Producción permanece anterior a sprint 8.
