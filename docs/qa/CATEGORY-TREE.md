# QA — Categorías jerárquicas

Fecha: 19/10/2026. ADR-0015. Entrega junto a action-v2: ver ACTION-V2.md.

- Árbol probado en es-AR/en/pt-BR: siete entradas, catorce ediciones habilitadas, foco al abrir/volver, resumen seleccionado y navegación que no cambia la selección.
- Argentina actual usa la colección nueva; las ocho colecciones por liga conservan sus 150 registros. La mixta anterior queda fuera del árbol y permanece reproducible.
- Europa y Latinoamérica separan versiones y filtran nacionalidad. Pruebas con México, Costa Rica, Panamá y Cuba; se excluyen Estados Unidos/Canadá del conjunto latinoamericano. Países europeos ampliados; Cristiano real incluido en Europa actual. Ficha sintética en Al-Nassr confirma independencia del club sin modificar el club histórico de referencia.
- Homónimos Matheuzinho se conservan. Cuatro catálogos regionales con dos onces exclusivos asequibles y generador CPU reproducible; técnicos regionales por nacionalidad y época. Presupuestos 100M actuales/150M históricos.
- La nueva prueba con datos reales de action-v2 completa dos equipos exclusivos de cada una de las catorce ediciones.
- Typecheck, lint y build ejecutados sin errores. Batería completa: 786 pruebas en 63 archivos, ninguna omitida. Salida final: category-action-final-test-run.txt; resultados finales en ACTION-V2.md.
- QA visual de escritorio/móvil NO EJECUTADA: el navegador primero devolvió timeout contra Vite y luego «Local browser use is disabled in Work settings», incluso con la URL local abierta por el usuario. No se infiere calidad visual a partir de DOM. No se solicita cambiar permisos para terminar los cambios funcionales.

Límites: catálogo regional actual combina versiones contemporary existentes con datos de las cuatro bases; no constituye investigación universal ni ranking oficial actualizado. Mantiene los atributos/años de las fichas ya disponibles. Leyendas activas fuera de una liga no se reutilizan como versiones actuales inventadas.
