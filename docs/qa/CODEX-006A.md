# CODEX-006A — Base online y seguridad

Fecha: 2026-10-18. Estado: parcial; implementación local validada, Supabase real pendiente.

Inicio: rama `codex/current-club-audit`, HEAD `3de32b4`. `.claude/` ajeno sin versionar, preservado. No había integración, archivos de credenciales ni variables SUPABASE en el entorno. No se accedió a ningún proyecto remoto. Docker CLI disponible, daemon no iniciado; Supabase CLI y psql no disponibles.

Entregado: cliente oficial `@supabase/supabase-js`, `.env.example` sin valores, identidad anónima deduplicada, contratos/validadores, migración `202610180001_online_foundation.sql`, RLS y permisos mínimos. Las siete tablas tienen RLS, el esquema privado no se expone y el ledger no tiene SELECT de cliente. Los slots únicos y la PK de membresía impiden usar una identidad en ambos puestos. Ver ADR-0011 para responsabilidades, semilla, versiones, economía y temporizadores futuros.

La migración fue **aplicada y ejecutada** en PostgreSQL WASM (`@electric-sql/pglite`, dependencia exclusiva de desarrollo). El shim de prueba solo crea roles/auth.uid/auth.users de plataforma; el SQL de producción corre íntegro. Cinco pruebas SQL comprueban lectura por miembros, aislamiento de estrategias, denegación a extraños, denegación a anon, escrituras prohibidas incluso al anfitrión, unicidad de identidades/slots y rechazo de presupuesto no habilitado. Tres pruebas de contratos comprueban nombres, comandos y configuración pública. No es una prueba del servicio Auth ni del servidor Realtime.

Validación: `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` aprobados. 651/651 pruebas en 43 archivos (643 existentes + 8 nuevas); 8/8 online. Build conserva aviso de chunk mayor a 500 kB; sin error. Sin cambios en simulador ni calibración masiva deportiva.

Pendiente externo: crear/elegir proyecto Supabase propio, habilitar Anonymous Sign-Ins y protección de abuso apropiada, aplicar migraciones en orden mediante `supabase db reset` en local o revisión SQL en proyecto autorizado. Copiar `.env.example` a `.env.local`, completar URL y **publishable key** públicas; nunca secret/service-role ni contraseñas en Git. `npm ci` y `npm run dev`. La clave de proyecto no reemplaza la identidad de usuario.

RLS en Supabase real, JWT, renovación Auth y dos navegadores: NO EJECUTADOS por falta de proyecto/configuración. No declarar online funcional hasta superar esa integración. La prueba local es reproducible con `npx vitest run src/features/online/database.test.ts`.
