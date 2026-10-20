# UX-NAV-005 — Navegación coherente y acciones rápidas

20/10/2026. Base local `1421387` (SIM-004B), rama `codex/ux-nav-005`. No se sustituyó la base por main remoto ni se reescribió el historial. Se leyeron instrucciones/documentación vigente, UX-004, SIM-004A/B y las pantallas involucradas. Sin push, merge, deploy ni cambios de Supabase.

## Auditoría y destinos finales

| Área / acción | Comportamiento comprobado o conservado |
| --- | --- |
| Partido terminado · Volver al inicio | El duelo limpia la sesión local y retorna a los tres rivales del menú, con foco en su encabezado. No reabre el once/draft terminado. Sólo un botón de salida, en encabezado; se elimina duplicado del resumen. |
| Partido activo · Salir del partido | Confirmación explícita, cancelar/Escape preserva pantalla y foco. La reproducción se detiene mientras el diálogo está abierto. En local se advierte pérdida de sesión/serie incompleta. |
| Serie incompleta | Se confirma la salida incluso después de terminar un encuentro si aún falta resolver la serie. No se confunde final de encuentro con final de serie. |
| Nueva partida local | Retorna a configuración para iniciar otro reclutamiento. En Draft Libre histórico limpia el once; no usa por defecto el callback de revancha. |
| Revancha | Mantiene acción existente: en duelo vuelve a sortear contra el mismo rival/contexto. Hint accesible describe nueva partida contra el mismo rival, sin prometer conservar plantel. Draft Libre conserva su semántica histórica; no se altera generación. |
| Repetir partido | Reinicia sólo reproducción del MatchResult registrado; no llama al simulador, no genera seed ni reclutamiento. Pausa y velocidad se aplican a frames de ese resultado. |
| Siguiente partido / preparar próximo | Continúa la serie y el plantel mediante las funciones vigentes. No se salta elección táctica ni traspaso de dispositivo. Volver al resumen sólo se ofrece antes de confirmar estrategias; descarta la preparación no confirmada y devuelve foco al botón de preparar. |
| Online · Volver a salas | Sale de la reproducción al formulario de salas. No llama forfeit, submitState, startDuel ni closeRoom. Las acciones falsas de revancha/nueva partida online se ocultan: hoy no crean otra partida online. |
| Online · Volver al inicio | Del lobby/formulario al menú principal; no se presenta como abandonar competición. Recuperación de sala mantiene la lógica existente. |
| Online · abandonar / eliminar / salir de sala | Abandono competitivo mantiene su confirmación propia y lado autenticado. Eliminar/salir del lobby ahora exige confirmación; conserva RPC y contratos existentes. |
| Inicio / configuración | Tres rivales, vuelta a selección de rival y categorías con foco; conserva configuración no confirmada. Acceso al inicio durante reclutamiento local con advertencia explícita de pérdida de elecciones. |
| Moneda | Conserva Omitir animación; únicamente revela el resultado ya elegido. No omite moneda ni decisión de puja. |
| Subasta · Ver canchas | Abre realmente la cancha plegada móvil, enfoca su región y desplaza hacia ella; respeta movimiento reducido. No oferta, pasa ni confirma fichajes. |
| Técnicos / banco / once / tácticas | Se conservan secuencia y decisiones. El acceso al inicio requiere confirmación; no introduce contratación, cambios ni elección táctica automática. |
| Historial | Resultados y borrado confirmado existentes; el contexto pasa a llamarse Repetir reclutamiento para distinguirlo de repetir el partido registrado. No se inventa un replay de partido a partir de un historial que sólo guarda resumen. |
| Explicación de resultado | Escape cierra el análisis y el foco pasa a su botón de reapertura; se puede consultar otra vez. No modifica resultado. |
| Draft Libre histórico | Se corrige también su salida: callback al menú principal (o ruta raíz si se monta aislado), sin volver al draft finalizado. Se quita acceso de cabecera que permitía salir del partido sin pasar por confirmación. |

## Implementación y accesibilidad

`ConfirmNavigation` es un diálogo compartido con título/descripción accesibles, foco inicial en cancelar, ciclo de Tab/Shift+Tab, Escape y restauración del foco; protege doble clic en confirmación. Los nuevos textos, a11y y advertencias se entregan en es-AR/en/pt-BR. La clave legacy `match.returnDraft` conserva compatibilidad, pero su texto pasa a Volver al inicio y ninguna pantalla de partido la usa como etiqueta antigua.

Controles de reproducción: pausa/continuar y velocidades 1×/2×/4×, visibles sólo mientras se reproduce. El resultado y sus estadísticas no se recalculan. Los controles no actúan sobre la API incremental SIM-004B ni resuelven ventanas tácticas. Encabezados y regiones usan foco programático sin scroll brusco; el destino de marca en partido es `#match-main`. Microanimación de diálogo de 150 ms desactivada con `prefers-reduced-motion`.

## Pruebas y controles

Se agregan pruebas DOM/teclado en tres idiomas: salida activa/cancelación, foco cíclico y doble clic, pausa y velocidad real con timers controlados, repetición sin llamar al simulador, un solo botón de salida, advertencia de serie incompleta y vuelta al resumen. Se amplía el recorrido de subasta/serie para comprobar regreso al menú final y ausencia de draft/configuración reabiertos. Online con gateway de prueba verifica salida sin llamadas competitivas ni cierre de sala y confirma explícitamente eliminación. En móvil simulado, Ver canchas abre panel y no inicia la subasta ni omite decisiones.

- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm test`: **933/933 pruebas, 87 archivos, 82,44 s**, salida completa en `UX-NAV-005-tests.txt`. Incluye los golden y las pruebas de SIM-004B intactos.
- Pruebas focalizadas de navegación/teclado/historial/entrada: **15/15, 3 archivos, 4,12 s**, salida en `UX-NAV-005-targeted.txt`.
- `npm run build`: PASS, 246 módulos, 945 ms. Advertencia de tamaño de chunk ya existente: AuctionPage 1.904,87 kB (314,59 kB gzip); no impide compilar y optimizarlo queda fuera de alcance.
- `git diff --check`: sin errores de contenido, avisos CRLF del entorno.

Se actualizaron expectativas antiguas de etiquetas y regreso tras abandono (ahora menú de rivales), manteniendo las aserciones de derrota e historial. La primera suite completa encontró esas expectativas y la eliminación online que ahora requiere confirmación; la ejecución final completa aprueba los nuevos recorridos. No se cambiaron expectativas de resultados deportivos.

## Límites y riesgos

QA de teclado y móvil es mediante Testing Library/jsdom, no inspección de layout ni toque en navegador real. No se declara nueva QA visual de anchuras, animaciones reales o lector de pantalla. El acceso del navegador local fue rechazado por política de la herramienta en esta sesión; no se usa una vía alternativa para eludirla.

Salir de reproducción online ya no cierra la sala compartida del anfitrión: evita interrumpir la vista del rival. La sala conserva su expiración/limpieza vigente; no se agrega servicio de limpieza ni nueva migración. En partidas antiguas con reproducción compartida, sólo se abandona la vista local; el resultado ya calculado no se revoca. No se afirma E2E con dos identidades reales ni cambios de backend.

Sin cambios a fórmulas, ratings, precios, presupuestos, semillas, contratos de simulación, fixtures golden, lógica de series o Supabase. SIM-005 no iniciado. Archivos ajenos preservados: informe stress, `.claude/`, registro de deploy anterior y dos listados editoriales TXT sin seguimiento.

## Archivos principales

Nuevo `src/components/ConfirmNavigation.tsx` y pruebas `local-match/navigation.test.tsx`; ajustes en MatchScreen, MatchSeriesScreen, ResultExplanation, SeriesPrep, AuctionPage, DualDraftScreen, TeamProgressBoard, DraftPage, OnlinePage, pruebas de navegación/historial/online, tres diccionarios y CSS. Registro, tablero y plan de pruebas actualizados para esta entrega.
