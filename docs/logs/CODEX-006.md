# Registro CODEX-006 — 18/10/2026

- Encargo leído junto con AGENTS, README, ROADMAP, TASK_BOARD, TEST_PLAN, ADR-0002, ADR-0008, ADR-0010 y contratos locales de subasta/configuración. Sin contrato de salas anterior.
- Estado inicial verificado: codex/current-club-audit, 3de32b4, únicamente .claude/ ajeno sin versionar.
- No hay configuración Supabase. Docker daemon ausente. Se agrega PostgreSQL embebido para ejecutar migraciones y permisos localmente, sin crear servicios remotos.
- Dependencias oficiales descargadas tras fallo DNS del sandbox, con escalación permitida. Sin credenciales ni acceso a backend remoto.
- Contradicción de planificación: F05 figuraba pendiente y los documentos históricos mencionaban online fuera de alcance; CODEX-006 autoriza ahora A/B y condiciona C a validación real. Los antecedentes se conservan.
- 006A implementada y validada localmente; aceptación de integración parcial. Se admite continuar B con adaptadores de prueba según el encargo, sin afirmar validación remota ni iniciar C.
