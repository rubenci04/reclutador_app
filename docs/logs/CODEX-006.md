# Registro CODEX-006 — 18/10/2026

- Encargo leído junto con AGENTS, README, ROADMAP, TASK_BOARD, TEST_PLAN, ADR-0002, ADR-0008, ADR-0010 y contratos locales de subasta/configuración. Sin contrato de salas anterior.
- Estado inicial verificado: codex/current-club-audit, 3de32b4, únicamente .claude/ ajeno sin versionar.
- No hay configuración Supabase. Docker daemon ausente. Se agrega PostgreSQL embebido para ejecutar migraciones y permisos localmente, sin crear servicios remotos.
- Dependencias oficiales descargadas tras fallo DNS del sandbox, con escalación permitida. Sin credenciales ni acceso a backend remoto.
- Contradicción de planificación: F05 figuraba pendiente y los documentos históricos mencionaban online fuera de alcance; CODEX-006 autoriza ahora A/B y condiciona C a validación real. Los antecedentes se conservan.
- 006A implementada y validada localmente; aceptación de integración parcial. Se admite continuar B con adaptadores de prueba según el encargo, sin afirmar validación remota ni iniciar C.
- Commit independiente A: 663cd60. Typecheck/lint/build y 651 pruebas aprobados. La suite existente regenera docs/qa/CODEX-005C-stress.json; se restaura su contenido histórico tras cada suite completa (no había cambios iniciales del usuario en ese archivo).
- B agrega segunda migración ejecutada, RPC de lobby autenticados y transaccionales, Broadcast privado de invalidación, interfaz/reconexión/recuperación y textos en tres idiomas. El inicio termina en COIN_TOSS pendiente sin operación competitiva; no se inicia C.
- Navegador integrado no conecta a Vite aislado; Vite fuera del sandbox permitió revisar pantalla sin configuración, menú e idiomas en escritorio/390/360. No se usó un backend remoto ni se simularon como reales dos identidades del navegador.
- Git requiere escalación para escribir índice/commits por permisos del sandbox; aprobada automáticamente. .claude/ preservado y excluido expresamente. Sin push ni deploy.
- Cierre B: typecheck, lint y build aprobados; 676 pruebas en 45 archivos, incluidas 33 online. Dos migraciones aplicadas solo en PostgreSQL embebido, cero remotas; E2E con dos identidades reales NO EJECUTADO. Se detienen ambos Vite propios de QA. Se conserva aviso histórico de bundle grande. Próximo paso: configuración autorizada y matriz de Auth/RLS/Realtime/concurrencia con dos perfiles independientes.
