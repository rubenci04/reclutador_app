# Sprint 9 — navegación, fotos y tablero

Fecha: 25/10/2026. Rama: claude/sprint-9-10. Continuación del árbol existente, sin rehacer las funcionalidades entregadas.

## Cambios entregados

- Liga Argentina / Actuales es la categoría inicial compartida por AuctionPage y OnlinePage (DEFAULT_MODE).
- Tocar una categoría la selecciona inmediatamente: conserva la edición elegida si pertenece a esa categoría y, en caso contrario, elige la primera disponible. Actuales/Leyendas actualiza EditionHero; anuncio aria-live polite y scroll suave al hero, sin animación con prefers-reduced-motion.
- SHOW_PLAYER_PHOTOS=false: jugadores con PlayerAvatar y técnicos con CoachAvatar de traje; créditos de fotos ocultos. Fotos archivadas en assets-archive/photos fuera de public; manifiestos conservados. La decisión vigente es el muñeco estándar para todos, sin nuevos rasgos: player-appearance.json está vacío. AVATARS-DESIGN conserva propuestas para el futuro, sin autorización para implementarlas.
- Barra de precisión apagada inicialmente y persistida en localStorage. El tablero resuelve la decisión con un toque; alternativa accesible bajo «Elegir con botones», protección frente a toque repetido y feedback compatible con movimiento reducido. Textos, errores y accesibilidad en es-AR, en y pt-BR.
- Hooks, constantes y almacenamiento separados en precisionSetting.ts; PrecisionBarToggle.tsx exporta solamente el componente. No se modificaron reglas, probabilidades ni catálogo para hacer pasar pruebas.

## Investigación y pruebas corregidas

La primera ejecución dirigida de categoryVariants, AuctionPage, auctionFocus, coachFlow y TeamPitchBoard reprodujo exactamente 17 fallas (24 aprobadas de 41). La repetición dirigida pasó las 41.

- categoryVariants: abrir una categoría ahora llama intencionalmente a onChange. Se verifican el modo emitido y las llamadas al abrir Europa y Argentina; el recorrido completo en tres idiomas exige 27 llamadas (9 categorías + 18 ediciones), antes 18. El componente controlado conserva selected hasta que el padre lo actualiza.
- AuctionPage: fixtures, semillas, comparación ronda a ronda e historial usan Global; las pruebas eligen Global explícitamente antes de iniciar. No se eliminaron aserciones de foco, presupuesto, historial ni progresión.
- AuctionPage y TeamPitchBoard: las pruebas de Messi exigen PlayerAvatar y ausencia de fotografía; se conserva la comprobación del diálogo, precio y detalles.
- coachFlow: el mock crea TEAMS_COMPLETED con IDs de GLOBAL_CURRENT. Al iniciar, AuctionPage fija coachMode a la categoría elegida, ahora Argentina; los IDs del once Global no se resuelven en el catálogo activo y no aparece la etapa de vestuario/mercado esperada. El fixture era inconsistente con la selección, no un problema de scroll o aria-live. Elegir Global restaura el contrato y mantiene todas las aserciones de técnico, suplentes y tres pasos en los tres idiomas.
- auctionFocus: earlyCompletion busca una semilla usando DRAFT_CATALOG, pero la UI empezaba con Argentina. La misma cadena de semilla no describe la misma subasta con otro catálogo: cambian candidatos, viabilidad y decisiones CPU, por lo que no se alcanza el cierre anticipado humano esperado. Elegir Global explícitamente recupera el escenario; se mantienen el ledger a precio base, 22 IDs, límites de gasto, resumen CPU y control manual hot-seat.

## Validación final

- npm run typecheck: aprobado, salida 0.
- npm run lint: aprobado, salida 0; 0 errores y 4 advertencias react-refresh/only-export-components (3 en DribblePanel.tsx y 1 en ShotPanel.tsx). precisionSetting ya no genera advertencias.
- npm test -- --maxWorkers=4: aprobado, salida 0; 1.554 pruebas pasadas y 3 omitidas de 1.557 totales; 144 archivos pasados y 3 omitidos de 147. Duración: 229,14 s.
- Las 3 omitidas son mediciones opt-in existentes: cpuBidding.measure (CPU_BIDDING), cpuSeries.measure (CPU_SERIES) y cpuSprint1.measure (CPU_MEASURE). No se habilitaron mediciones ajenas al cierre del sprint; ninguna prueba falló.
- npm run build: aprobado, salida 0; TypeScript + Vite, compilación de assets en 2,19 s.
- git diff --cached --check: comprobación final sin errores de whitespace.
- Se prepara un único commit del código y documentación de este sprint; se excluye .claude/launch.json, configuración local preexistente ajena a la entrega. Push autorizado a origin/claude/sprint-9-10, sin force; no actualiza producción.

## Alcance, contradicciones y pendientes

- docs/DEPLOY.md y el tablero conservan una publicación anterior llamada «sprints 9–10». No acredita que estos cambios sin commitear ya estuvieran publicados: esta entrega es adicional sobre claude/sprint-9-10.
- Se preserva la planificación histórica. El push de esta entrega no promueve una versión del Worker ni actualiza la web publicada.
- No se aplican migraciones Supabase ni se toca main; no se usa pull, checkout, stash, reset, clean, force-push ni wrangler deploy.
- QA visual, escucha y playtest humano de las interacciones nuevas pendientes; las pruebas DOM no acreditan layout ni movimiento real. Online requiere las migraciones pendientes de los sprints anteriores, que no se aplican en este encargo.
- Vista previa opcional no subida: no hay ejecutable Wrangler en node_modules/.bin y npx --no-install wrangler versions upload --help no devolvió un resultado utilizable; se detuvo sin instalar ni iniciar sesión. No se intentó subir ni promover tráfico.
