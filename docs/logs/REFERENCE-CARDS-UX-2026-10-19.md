# Registro — categorías y cartas — 19/10/2026

Se implementa el pedido de categoría visible, años por club de referencia, tarjetas de técnicos con nacionalidad/fotos/trayectoria e intercambio de suplentes desde la cancha. Se leyeron README, roadmap, tablero, plan de pruebas y ADR-0002. Se preservan el archivo de stress modificado y `.claude/` ajenos a esta entrega.

Alcance, fuentes y límites: docs/qa/REFERENCE-CARDS-UX.md. Cobertura medida: 600 cartas históricas y todas las referencias de técnicos ofrecidos. Se agregan 95 retratos a los cinco existentes; Vaccari y Holan siguen sin foto libre encontrada. Discrepancia de inicio de Dirceu documentada.

Primer pase: tres expectativas DOM antiguas asumían que toda la tarjeta del técnico era un botón. Se actualizan para comprobar equipo en la tarjeta y precio/contratación en el botón. La regresión de Bale se ajusta a la vinculación 2013–2022 documentada, con préstamo. Segundo pase completo: 824/824 pruebas, 67 archivos. Typecheck, lint y build aprobados. Después se compactan los datos del navegador y se repiten regresiones afectadas, lint y build.

Navegador local deshabilitado en Work: no se declara QA visual completa. Se inspeccionan tres retratos de muestra y se prueban cuatro gestos DOM con rechazo de línea incorrecta y cierre tras confirmar.

Se prepara commit y push autorizado en `codex/current-club-audit`. No se confunde push con publicación en Cloudflare ni se modifican variables del servicio externo.
