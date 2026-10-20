# SIM-004B — Simulador incremental

20/10/2026. Rama `codex/sim-004b`, base `e37e3b0` con SIM-004A y las últimas entregas locales UX-004/COACH-FLOW. Sin push ni despliegue.

## Contrato definitivo y API para SIM-005

Punto de entrada: `src/features/local-match/interactive/index.ts`; tipos completos compilados en `types.ts`. Nuevos contratos: `interactive-session-v1`, `action-v3-incremental-v1`, `interactive-command-v1`, `interactive-result-v1` e `interactive-subs-v1` para el registro nuevo. Las versiones históricas no cambian.

- `createSession(input, options): Outcome<Session>`: admite action-v3 explícito; clona entradas y valida planteles exclusivos, formación, hasta tres suplentes y contabilidad. Opciones: sessionId suministrado por llamador (máximo 128 caracteres para que las claves derivadas de ventana quepan en el contrato), modo de banco por lado y ledger opcional de adquisición. Sin ledger usa precios base como fixture local; un adaptador competitivo debe suministrar gasto real autorizado, incluido técnico. No se compra nada durante el partido.
- `advanceBlock(session)`: calcula exactamente un bloque. Abre ventanas tras 30/45/60/75 y rechaza avance hasta resolverlas. No calcula ni almacena bloques posteriores. Al confirmar 90 finaliza una vez, incluida la única tirada final de posesión.
- `inspectSession(session)`: proyección copiada con bloques confirmados, marcador, estadísticas visibles, once y ventana/listos. Excluye semilla, RNG, recibos y planes privados. La posesión provisional usa ataques visibles; la posesión del motor está disponible al terminar.
- `decisionFor(session, participant, id, order)`: constructor para una ventana vigente; IDs externos al dominio. `submitDecision(session, authenticatedSide, raw)` valida contrato estricto, participante, revisión, ventana y bloque, elegibilidad y unicidad. La identidad autenticada debe venir del adaptador de autoridad, no del payload remoto.
- `applyWindow(session)`: exige ambos planes aceptados y aplica local/cpu en orden fijo, atómicamente, sin RNG ni alteración del prefijo. KEEP, STRATEGY y una sustitución por ventana/lado; POSTURE devuelve UNSUPPORTED_ORDER. Una estrategia usa índice temporal absoluto y efectos de técnico iniciales congelados, sin bonus nuevos.
- `finishSession(session)`: finalización única; repetirla devuelve copia sin consumir RNG. `exportResult(session)` sólo funciona en FINISHED y devuelve el sobre versionado con MatchResult, instrucciones aplicadas y registro de sustituciones/modos.
- `receiptFor(session,id)`: recupera aceptación/rechazo original. Repetir ID/payload en `submitDecision` devuelve DUPLICATE_COMMAND sin aplicar nada; otro payload con ese ID devuelve ID_CONFLICT. El transporte futuro puede devolver el recibo original como acuse idempotente. Esta distinción concreta el pedido B de rechazar comandos repetidos.
- `checkpointSession(session, digestProvider?)`: JSON más metadatos SHA-256 de autoridad. `restoreSession(raw, trustedAuthority, digestProvider?)`: validación de forma, versiones, invariantes deportivos y digest oficial. Inicializa únicamente las referencias de origen para validarlas; no regenera bloques ni consume RNG. Estas dos operaciones usan Web Crypto asíncrono, sin temporizadores ni aleatoriedad. El proveedor es argumento de ejecución, nunca se serializa.

`Outcome` devuelve `ok/value` o `ok:false/error`. Para un comando con envoltorio válido pero rechazado incluye `rejected: {session,receipt}`: nueva revisión de auditoría, mismo estado deportivo/RNG. El adaptador puede persistir ese rechazo explícitamente. Payload mal formado o actor ajeno no agrega datos privados ni modifica la sesión; su auditoría de seguridad corresponde a la autoridad. No hay mutaciones parciales.

El snapshot conserva catálogo/inputs iniciales completos, semilla, cursor y ambos RNG, sumas sin redondear, onces iniciales y actuales, bancos, política de cambios, propiedad, salientes/entrantes, tácticas, goles, estadísticas, bloques, cambios pendientes, ventana bilateral, recibos y órdenes aplicadas. La finalización está representada por fase FINISHED y resultado no nulo; no hay closures, Map/Set ni funciones persistidas.

## Compatibilidad y decisiones de implementación

`simulateMatch`, sus consumidores, matchTypes, seededRandom, playback y matchSeries históricos permanecen **sin modificar**. El kernel por bloques conserva el orden aritmético del motor y comparte sus funciones de fuerza, iniciativa, ventaja, probabilidades, tácticas, formaciones y calidad. Se mantiene el bucle batch anterior como oráculo independiente, en vez de conectarlo a una nueva ruta durante esta entrega. Es una decisión conservadora respecto de la extracción compartida propuesta en A: evita convertir una regresión del adaptador en un cambio silencioso de todas las partidas. El bucle versionado duplicado exige mantener ambas rutas bajo paridad si se modifica una regla en el futuro.

RNG reanudable promovido desde el experimento A a `interactive/random.ts`; el acceso anterior del experimento lo reexporta. Mismo algoritmo, dos cursores separados, cero válido al restaurar. El flujo subs sigue compartido entre equipos automáticos en orden local/cpu y conserva intentos sin slot elegible. No se cambia el generador histórico ni se añade ningún draw por KEEP, consulta, validación, cambio táctico o manual.

Modo de banco explícito e inmutable por lado: none / auto-subs-v1 / manual-v1. Manual no ejecuta la política automática de ese lado; no hay reentrada, doble uso, ARQ manual ni cambio de línea. Se conserva el gasto adquirido y se recalculan fuerza/features para el siguiente bloque. El registro de banco manual/mixto se exporta en el sobre nuevo; no se etiqueta falsamente como subs-v1 dentro de MatchResult. Sin intervenciones y con la misma configuración automática, el MatchResult completo coincide con el histórico.

## Ejemplo reproducible

Ejecutar desde la raíz:

```powershell
npx --no-install vitest run src/features/local-match/interactive/session.test.ts
```

El fixture `fixture('interactive','4-3-3',true)` del archivo genera 28 jugadores sintéticos de IDs estables, sin depender de cambios editoriales. Su flujo probado equivale a:

```ts
let session = get(createSession(input, { sessionId: 'demo' }));
session = get(advanceBlock(session)); // confirma 15
session = get(advanceBlock(session)); // confirma 30, abre ventana
const saved = await checkpointSession(session); // guardar authority separada y protegida
session = get(await restoreSession(saved.snapshot, saved.authority));
for (const side of ['local', 'cpu'] as const) {
  const command = decisionFor(session, side, `demo:30:${side}`,
    { type: 'KEEP', parameters: {} });
  session = get(submitDecision(session, side, command));
}
session = get(applyWindow(session));
session = get(advanceBlock(session)); // recién ahora genera 45
// Repetir en 45/60/75; al confirmar 90:
// const envelope = get(exportResult(session));
// envelope.result es el MatchResult histórico-compatible sin intervenciones.
```

`get` es el helper del test que exige `ok` y extrae `value`; un consumidor real debe manejar el código estructurado. `input` es el fixture descrito, no un catálogo remoto. El caso con cambios manuales guarda/restaura también después de aplicar una sustitución y antes de generar su bloque.

## Cobertura y huellas de regresión

- Antes de modificar: 11/11 pruebas A aprobadas, 24 golden existentes intactos.
- Paridad completa: 18 sesiones (nueve formaciones × sin/con banco), restauración en las cuatro ventanas y al finalizar; mismo siguiente encuentro de serie.
- Kernel: 48 comparaciones completas adicionales, clásico/action-v1/v2/v3 × doce semillas; las sesiones públicas aceptan únicamente v3.
- Calibración pareada: 168 encuentros (14 ediciones × 12 semillas), seis estrategias, con/sin subs, **0 diferencias** entre objetos completos. Totales de ambos motores: 793 goles, 136 victorias locales, 20 empates, 12 victorias CPU. Es una muestra de regresión con planteles seleccionados en orden de catálogo y presupuesto de laboratorio, no una calibración de igualdad entre rivales ni una modificación de presupuestos jugables.
- SHA-256 del informe `SIM-004B-calibration.json`: `a8075ed66a5f22e539cbef2680224397fdec1ff050a7c6cc790192248a89f12a`. Incluye huella por colección de los doce resultados completos.
- Repetición de instrucciones/semilla, llegada en ambos órdenes, prefijo inmutable, errores de ventana/revisión/versión/actor, recibos recuperables, JSON parcial, corrupción incluso con digest recalculado, exclusividad/posición, tres cambios, reentrada/doble uso prohibidos, modo mixto y sustitución automática fallida.
- Pie dominante sólo metadata: mismos bloques, stats y fuerza tras cambiarlo. Los objetos de jugadores exportados sí reflejan su metadata, como corresponde.
- Inputs y sesiones congelados en pruebas para detectar mutaciones; consulta no expone futuro/seed ni planes rivales.

## Controles finales

- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm test`: PASS, **925/925 pruebas, 86 archivos, 87,83 s**; salida completa en `SIM-004B-tests.txt`.
- Tras el último límite de longitud de sessionId, prueba focalizada final de motor + golden: **34/34, 2 archivos, 4,87 s**, salida en `SIM-004B-targeted.txt`; se repitieron typecheck/lint/build. No se actualizaron los snapshots golden de A.
- `npm run build`: PASS, 245 módulos; mismos nombres de assets productivos que la entrega anterior. Advertencia de tamaño ya existente: AuctionPage 1.898,71 kB / 312,64 kB gzip; este módulo no se conecta al bundle de la app actual.
- `git diff --check`: sin errores de contenido; avisos CRLF del entorno. Informes JSON generados de entregas anteriores restaurados; informe stress ajeno recuperado de la copia previa a esta tarea.

La primera ejecución completa excedió el timeout predeterminado de 5 s en la comparación de 168 parejas (5,439 s bajo carga), sin reportar divergencia. Ese único test tiene ahora margen de 30 s; no se modificaron sus aserciones ni las expectativas golden. Se añadió después un caso de restauración con secuencia mixta de órdenes y rechazos y validación de que no pueda omitirse una ventana.

## Riesgos y límites

El SHA-256 no autentica por sí mismo al usuario: `trustedAuthority` debe leerse de almacenamiento oficial separado. Aceptar el digest enviado por el mismo cliente anularía esa protección. Sesiones locales restauradas requieren conservar también ese registro; no hay migración automática ni escritura en localStorage. La validación no reconstruye oportunidades pasadas; combina checks de estructura/invariantes con el digest de todos los campos oficiales.

`InstructionPolicy` prepara un contrato puro de vista, participante, seed/cursor privado y banco disponible → orden/próximo cursor. No se implementa una política nueva ni cambia la dificultad vigente. Los contratos de sesión/orden/revisión están preparados para un adaptador de autoridad, pero no se integran al RPC de estado online actual ni se calculan nuevos resultados competitivos en navegadores. Falta autoridad compartida, CAS/transacciones, autenticación, límites de red y prueba real de dos identidades, todos fuera de esta entrega. La proyección inspeccionada no contiene el resultado futuro.

Para auditar/reproducir un encuentro con intervenciones hay que conservar su checkpoint de origen y registro junto al sobre de resultado: MatchResult es el formato histórico de salida, no un reemplazo del input archivado y su ledger. La equivalencia del núcleo está acreditada con los inputs actuales; no demuestra portabilidad a otra implementación aritmética ni balance subjetivo de las nuevas decisiones.

No se conecta al nuevo MatchScreen ni se construye DT en vivo; no cambia home/subasta, ratings, precios, presupuestos, RNG histórico, Supabase, formación automática ni atributos de arquero. Los textos nuevos son documentación/códigos internos, sin UI nueva que traducir. Sin necesidad de QA visual para esta API de dominio. Los snapshots completos priorizan auditoría sobre tamaño; optimización de checkpoints futuros queda pendiente. Máximo de 256 recibos por sesión; al agotarse se devuelve INVALID_PAYLOAD sin truncar auditoría previa.

## Archivos

Nuevos: `interactive/{types,random,kernel,validation,snapshotValidation,session,index}.ts`, `session.test.ts`, este informe, registro `docs/logs/SIM-004B.md`, calibración y salida de pruebas. Ajustes: reexport del experimento RNG, nota de implementación ADR-0018, tablero y plan de pruebas. Ningún archivo ajeno se incluye en el commit.
