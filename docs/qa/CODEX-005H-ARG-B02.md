# ARG-B02 — segundo lote argentino

18/10/2026. Datos: `src/data/argentina_collection_v1/ARG-B02.json` (`arg_051`–`arg_100`); validador común `argentinaBatches.ts` (valida B01 y B02 contra los 150 y entre sí).

- 50 registros: 6 ARQ / 16 DEF / 15 MED / 13 DEL. Niveles: S 1, A 5, B 21, C 19, D 4. 44 clubes en las carreras; club de referencia: River 11, Boca 6, Newell's 6, Independiente 4, Estudiantes 4, resto repartido (Ferro, Racing, San Lorenzo, Vélez, Huracán, Argentinos, Banfield, Gimnasia, Rosario Central, Lanús). Boca+River = 34 % (B01: 58 %).
- Mismo contrato que B01: selección por haber jugado en clubes argentinos; ratings editoriales; hechos (clubes, años, títulos) de Wikipedia consultada el 18/10/2026 mediante extractos resumidos; sin roles; sin habilitar el modo.
- Durante la validación se detectaron y reemplazaron cinco duplicados con los 150 (Otamendi, Di María, Agüero, Mac Allister y Julián Álvarez ya estaban en el catálogo): el validador por alias los rechaza.
- Límites: los extractos se tomaron de resúmenes automáticos de las páginas; algunos honores (p. ej. Di María) quedaron fuera al retirarse. Di Stéfano usa año de referencia 1950 (mínimo del catálogo). Rubén Paz figura como URU.
- Pruebas: `argentinaBatches.test.ts` parametrizada por lote; 412 pruebas del catálogo aprobadas.
