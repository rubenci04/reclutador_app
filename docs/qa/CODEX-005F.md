# CODEX-005F — Variedad de sorteos y equipos en vivo

Fecha: 17/10/2026. Base comprobada: `9ebc97f`, CODEX-005E, rama `codex/current-club-audit`, árbol inicialmente limpio. Se leyeron AGENTS, README, ROADMAP, TASK_BOARD, TEST_PLAN, ADR-0002 y los módulos afectados. Los 150 registros deportivos permanecen intactos.

## Diagnóstico

La interfaz inicializaba la semilla con `hot-seat-001` y cada inicio reutilizaba su valor. Volver del partido conservaba esa semilla; la revancha únicamente preparaba el sufijo `-rematch`. Con el mismo catálogo, la semilla fija repite los **22 jugadores y su orden**, no solamente cinco. No había un historial reciente del sorteo.

El motor anterior barajaba por posición y descartaba hasta 48 propuestas que no podían repartirse legalmente entre dos presupuestos de 100M. No seleccionaba por tier; el rechazo económico favorecía indirectamente cartas más baratas. Un barajado uniforme no favorece estadísticamente los primeros registros, pero su resultado para una semilla dependía del orden de entrada. La variante nueva ordena por ID antes de asignar claves aleatorias; se probó con el catálogo invertido.

Cinco coincidencias entre **dos** sorteos no demuestran un defecto. Con cuotas 2/8/6/6 sobre 18/48/45/39 jugadores, el solapamiento esperado sin restricción económica es `Σ(k²/n) = 3,2786`. Cinco jugadores comunes a **las cuatro** partidas es otro evento. No se dispone de las semillas del reporte original para reconstruirlo; la semilla fija es un defecto confirmado por inspección y pruebas, no una reconstrucción de esas cuatro partidas.

## Implementación

- Nueva partida y revancha obtienen 128 bits mediante `crypto.getRandomValues`, exclusivamente desde la acción de inicio. Revancha conserva las opciones de rival/perfil y vuelve a sortear. Nueva partida desde el resultado también vuelve a sortear. Reproducir partido conserva sus eventos y resultado; no genera semilla ni historial nuevos.
- `drawHistory.ts`: historial local `reclutador.duel-draws.v1`, cinco partidas iniciadas como máximo, incluyendo las abandonadas. Guarda semilla y contexto; reconstruye sus selecciones determinísticamente. Importar un sorteo no altera ese historial.
- El contexto versionado incluye los últimos cinco conjuntos y la identidad completa del catálogo ordenado, incluidos atributos/precios. Se incorpora a la partida y se puede copiar/importar en la interfaz. No necesita localStorage original. Un catálogo incompatible, versión desconocida, IDs inválidos/duplicados, historial excesivo o JSON inválido produce rechazo controlado. Al cambiar el catálogo se descarta el historial incompatible con aviso.
- Muestreo ponderado sin reemplazo por posición con claves exponenciales y peso `1/(1 + 2 × intensidad × apariciones)`: todos los pesos son positivos. Con cinco apariciones e intensidad máxima, el peso mínimo es 1/11. No se excluye permanentemente a nadie ni se cambian ratings/precios.
- Intensidad inicial reducida por posición cuando hay menos del doble de candidatos que cupos: `min(1, (disponibles−cupos)/cupos)`, limitada inferiormente a cero. Exactamente los candidatos necesarios implica reutilización inevitable sin penalización.
- Máximo 48 propuestas: intensidad adicional 1 en intentos 1–16, 0,5 en 17–32 y 0 en 33–48. `drawDiagnostics` registra intentos, intensidad y posiciones con pool pequeño. Cada propuesta conserva el mismo chequeo exacto de viabilidad de ambos onces. Sin contexto se conserva la política anterior para compatibilidad del motor y comparación estadística.
- Lectura/escritura bloqueada, cuota agotada o historial corrupto: la partida nueva sigue funcionando y aparece un aviso traducido; la reproducción usa el contexto exportado. Si no se dispone de entropía segura, se informa el error sin usar una semilla fija.
- `TeamProgressBoard`: dos onces con 22 espacios en total, nombre, posición, rating, precio realmente adjudicado, X/11, saldo y faltantes. Deriva de `game.teams` y `game.record`; React solamente mantiene la apertura del panel móvil.
- Escritorio: ambos paneles debajo de la subasta. Hasta 640 px: panel inferior desplegable, `aria-expanded`, `aria-controls` y contenido oculto correctamente; sigue el flujo del documento y no cubre botones.
- Oferta deshabilitada y explicación traducida del cupo posicional; DEF conserva sus cuatro plazas. El motor continúa rechazando adjudicaciones inviables y permitiendo los pases/asignaciones existentes. CPU, simulador, catálogo, imágenes y reglas económicas no se modificaron.
- Traducciones simultáneas es-AR/en/pt-BR. CODEX-005G documentado como propuesta, sin implementación táctica.

## Muestra reproducible

Se ejecutaron **1.000 sorteos por política (2.000 en total)**, con semillas `005F-sample-0..999`. Antes: motor anterior con semillas distintas, sin historial. Después: política nueva con las cinco selecciones anteriores. Es una comparación determinista de algoritmos, no una estimación de partidas reales del usuario. Las frecuencias por cada uno de los 150 IDs están en [CODEX-005F-draws.json](CODEX-005F-draws.json).

| Indicador | Antes | Después |
|---|---:|---:|
| Solapamiento medio con la partida anterior (999 pares) | 3,3063 | 1,8118 |
| Pares con ≥5 coincidencias | 211/999 (21,12%) | 26/999 (2,60%) |
| Coincidencias medias con la unión de hasta cinco previas | 12,1071 | 8,1451 |
| Ventanas de cuatro con ≥5 jugadores comunes (997 ventanas) | 0 | 0 |
| Mayor intersección de cuatro partidas | 2 | 1 |
| Frecuencia mínima/máxima por jugador en 1.000 sorteos | 89/209 | 93/187 |
| Intentos máximos para obtener un pool viable | 6 | 11 |
| Sorteos que llegaron a relajación por reintentos | 0 | 0 |
| Costo base medio de las 22 cartas | 178,269M | 181,161M |

En ambos grupos: ARQ 2.000, DEF 8.000, MED 6.000, DEL 6.000 selecciones; 22 IDs exclusivos por sorteo; 1.000/1.000 propuestas aceptadas económicamente viables. No existen cupos de tier en el sorteo actual. Distribución agregada:

| Tier | Esperado uniforme por posición, sin presupuesto (sobre 22.000) | Antes | Después |
|---|---:|---:|---:|
| S | 2.649,6 | 2.168 | 2.284 |
| A | 4.394,9 | 4.072 | 4.120 |
| B | 6.538,5 | 6.521 | 6.665 |
| C | 5.346,2 | 5.846 | 5.677 |
| D | 3.070,9 | 3.393 | 3.254 |

La selección conserva el sesgo económico necesario para poder completar ambos equipos. La muestra posterior incluyó a los 150 futbolistas; no garantiza frecuencias iguales ni ausencia de repeticiones. La primera comparación usa semillas distintas: la interfaz defectuosa con la semilla fija habría producido 22 coincidencias por par.

Para regenerar el JSON en PowerShell:

```powershell
$env:DRAW_DIAGNOSTICS='1'
npx vitest run src/features/recruiter-duel/drawVariety.test.ts
Remove-Item Env:DRAW_DIAGNOSTICS
```

## Pruebas reales

- `npm run typecheck`: aprobado.
- `npm run lint`: aprobado.
- `npm test -- -t '^(?!.*(?:plays 3,000|2,400-match)).*$'`: **482 aprobadas, dos omitidas, 484 totales**, 17 archivos. Incluye diagnóstico de 2.000 sorteos, las 1.000 subastas completas de regresión y un recorrido de interfaz de 22 rondas, partido, reproducción y revancha.
- Se omitieron solamente las baterías existentes de 3.000 partidos CPU y diagnóstico de 2.400 partidos: el simulador no cambió. No se ejecutaron miles de simulaciones futbolísticas.
- `npm run build`: aprobado.
- Verificado: fuente de entropía, ausencia de llamadas durante render, siete inicios con retención exacta de cinco, exportación/importación tras borrar almacenamiento, catálogo invertido, contextos incompatibles/corruptos, persistencia bloqueada, pool escaso con repetición inevitable, pool imposible y término acotado.
- Paneles en tres idiomas: 22 espacios, adjudicación por encima del precio base, actualización de ambos equipos hasta 11/11 y saldos reales. Desplegable móvil con semántica de botón y cambio a escritorio probado en DOM con matchMedia controlado. Cupos completos deshabilitan oferta con explicación; después del primer DEF siguen quedando tres; pases y finalización legales.

## QA visual y pendientes

**QA visual en navegador NO EJECUTADA.** Se intentó abrir `http://127.0.0.1:5173/`; la herramienta respondió `Local browser use is disabled in Work settings`. No se modificó la configuración del usuario. Las pruebas DOM no verifican píxeles ni sustituyen inspección visual.

Pendiente: revisar escritorio, 390 y 360 px, nombres largos, foco visible, lectura real con lector de pantalla, ausencia de desbordamiento horizontal y separación del desplegable respecto de pujar/pasar. Los estilos permanecen en flujo normal, sin posicionamiento flotante. Sin capturas visuales certificadas en esta entrega.

## Archivos y Git

Nuevos: `drawHistory.ts`, `drawVariety.test.ts`, `TeamProgressBoard.tsx`, `TeamProgressBoard.test.tsx` en `src/features/recruiter-duel`; este informe, su JSON estadístico y `docs/logs/CODEX-005F.md`.

Modificados: `AuctionPage.tsx`, `AuctionPage.test.tsx`, `auctionEngine.ts`, `auctionTypes.ts`, los tres diccionarios `common.json`, `src/styles/index.css`, `docs/ROADMAP.md` y `docs/TASK_BOARD.md`.

Entrega mediante commit local específico en la rama existente; su hash se informa al finalizar. Sin push ni deploy. No se amplió el catálogo ni se inició CODEX-005G. El árbol debe quedar limpio tras el commit.
