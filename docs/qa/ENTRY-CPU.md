# ENTRY-CPU — 20/10/2026

Base 15d9fbc. Rama codex/simple-entry-stronger-cpu.

Inicio con CPU, online y dos jugadores; se retira el acceso visible a Draft Libre. Se conserva su código histórico sin eliminar partidas. Categorías y ajustes locales solo después de elegir rival, con importes y reserva existentes. Online conserva categorías en lobby del anfitrión; no se agregan presupuestos personalizados que su contrato actual no admite. Reglas de sesión y alcance online bajo expansiones. No se cambian esquemas ni sincronización.

CPU Difícil por defecto, Fácil y Normal siguen elegibles. Difícil añade valoración relativa a los pares disponibles del puesto y mayor peso a calidad; mantiene reserva de técnico, reserva para completar el plantel, máximo técnico y límites de puja. No lee futuras cartas ni estrategia humana. Estrategia Difícil: elige entre las mejores aptitudes de su propio once con tolerancia .015 y desempate reproducible. Normal conserva su selección histórica ponderada. No se cambia el simulador ni se promete una tasa de victoria determinada; medir balance humano queda pendiente.

Pruebas de navegación actualizadas a la retirada de Draft Libre; prueba nueva de 100 semillas exige estrategia de alta aptitud y determinismo. Suite completa y build registrados en la entrega. Intento de QA visual bloqueado: navegador local deshabilitado en Work settings. No se presentan capturas previas como evidencia nueva.

El pedido de simplificar otras secciones se continúa sobre UX-003 y ARG-UX-FIX: ajustes, reglas y explicaciones secundarias plegados; identidad, cartas y canchas conservadas. No se rehacen pantallas de partido ni mecánicas fuera de los cambios descritos. Sin push ni deploy.

Validación final: typecheck, lint y build PASS; 885/885 pruebas en 81 archivos (99,37 s). Advertencia existente de bundle >500 kB. Salida: ENTRY-CPU-final-tests.txt.
