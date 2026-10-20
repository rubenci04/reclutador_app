# COACH-FLOW — 20/10/2026

Base ab909cf. Rama codex/coach-bench-tactics-flow. Se leyeron las reglas y documentos de preparación. Se preservaron cambios ajenos del informe de estrés y .claude, además del log local DEPLOY-AB909CF.

## Flujo

Al terminar el draft se presenta primero CoachMarket. Elegir técnico o continuar sin técnico abre inmediatamente SubstituteMarket y LineupOrganizer debajo, en la misma página y con el saldo actualizado. Las compras y cambios siguen las funciones de dominio existentes. Confirmar el once cierra esa sección; con ambos participantes confirmados aparecen TeamPowerPanel y StrategyChoicePanel. No hay mercados ni controles del once duplicados en tácticas. En CPU se conserva contratación automática del rival; hot-seat completa este recorrido por cada persona. Online usa el mismo orden local por participante, sin cambiar el contrato remoto ni la privacidad de estrategias.

Los cambios se realizan sobre la cancha mediante arrastre o dos toques de la misma línea. La lista de cambios alternativa y las ayudas siguen disponibles plegadas. Se conservan errores y validación de identidad, propiedad, formación y presupuesto. Confirmar tras una compra refleja el once final. No se obliga a comprar suplentes, ni a contratar técnico si la persona decide continuar sin él. Si técnicos están desactivados se pasa directamente a suplentes/once.

Animación breve de entrada en mercado/once y elevación de cartas al interactuar. Se respeta prefers-reduced-motion. Se reutilizan textos existentes de los tres idiomas, sin nuevas frases largas. No se modificaron fórmulas del simulador, datos de futbolistas ni versiones guardadas.

## Técnicos

El catálogo real tiene 120 identidades (100 originales y 20 adicionales), no 150. Se seleccionaron editorialmente 65 S, un 54,17 %: las 32 leyendas y 33 actuales. ELITE_CURRENT registra explícitamente los apellidos de los actuales seleccionados; no se decide por posición en el array. Las leyendas se consideran referencias históricas destacadas a pedido del usuario; no es una clasificación deportiva verificada.

Se conserva cada ID y el contexto de liga/época. Nivel S usa el precio de catálogo existente de 8M y su bonus existente de 2,5 puntos, sin cambiar las fórmulas de afinidad. Por tanto, las promociones tienen efecto real en poder y precio. El contrato contextual económico de la oferta puede seguir reduciendo un precio para asegurar una opción dentro de la reserva elegida: no se cambia la potencia por ese descuento. Las partidas con resultados ya calculados no se recalculan; reproducir una semilla nueva con el catálogo actualizado puede producir otro resultado.

## Validación y límites

Pruebas nuevas: porcentaje/identidades/precios de los 120 técnicos y recorrido de UI que exige decisión de técnico, comprueba mercado antes de once y ocultación completa al pasar a tácticas. Pruebas anteriores de CPU/hot-seat/online adaptadas para hacer la decisión explícita antes de confirmar. Se conservan pruebas de gestos de banco y selección, presupuesto, táctica y simulación.

Intento de navegador: no disponible, Local browser use is disabled in Work settings. No se afirma nueva QA visual, uso de lector de pantalla, escucha ni E2E remoto. La prueba online usa la base local de pruebas. Pendientes: revisar fluidez real en teléfono, evaluar en playtest el aumento de S y la selección editorial. Build conserva aviso de chunks >500 kB.

Sin push, deploy, migraciones o modificaciones a Supabase en este encargo.

Resultados finales: npm run typecheck, npm run lint y npm run build PASS. npm test: 887/887 pruebas, 83 archivos, 71,19 s. Salida completa en COACH-FLOW-final-tests.txt. Los fallos iniciales de navegación se resolvieron haciendo explícita la decisión del técnico en las pruebas existentes; también se corrigió la cuenta inicial estimada de 118 al total real 120.
