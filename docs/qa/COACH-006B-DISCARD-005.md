# COACH-006B + DISCARD-005 — Técnicos competitivos y cinco descartes

Base: `main` 95c65b3. Sin cambios en el simulador, los precios de futbolistas ni la subasta (cuotas, viabilidad, `club-spread-v3`).

## 1. coach-market-v3 (`config.coachMarket = 'coach-market-v3'`)
**Nivel S+** (`COACH_TIERS`): precio 12 M, bonificación 3,2 (S: 8 M, 2,5). El tope de `coachEffect` era 3 y sigue siendo 3 para todos los niveles anteriores (su máximo es 2,875); solo S+ sube a 3,4. El simulador no se toca: consume el mismo `coachEffect`.

**Niveles editoriales** (`src/data/coaches-v3.json`; son diseño de juego, no un ranking factual). Antes casi todas las leyendas y 33 técnicos actuales eran S. En v3:
- **S+ (8):** Guardiola, Ancelotti, Ferguson, Cruyff, Sacchi, Menotti, Bilardo, Luis Enrique.
- **S:** lista explícita (Scaloni, Simeone, Flick, Mourinho, Deschamps, Tuchel, Nagelsmann, Arteta, Inzaghi, Conte, De la Fuente, Bielsa, Lippi, Trapattoni, Capello, Bianchi, H. Herrera, Michels, Zagallo, del Bosque, Clough, Sabella, Gallardo, Pochettino, Santana, Zubeldía, Shankly, Paisley, Wenger, Ramsey, Muñoz).
- Todo otro S anterior baja a **A**; Italia y México revisados: Ranieri, Pioli, De Zerbi, Mohamed, Vucetich, Almada, Milutinović y Aguirre suben a A; Italiano y Reinoso a B.
- Las ofertas, precios y tiers de v1 y v2 no cambian (prueba: ningún pool v1/v2 contiene S+ ni los añadidos, y todo precio sigue siendo el de su nivel; el catálogo histórico sigue en 120 identidades).

**Selección de las seis cartas** (`offerV3`): solo técnicos del pool propio de la categoría que el participante puede pagar, a su precio real (sin descuento oculto ni técnicos de otra liga). Se toman los niveles de arriba hacia abajo hasta reunir seis y, dentro de esa franja, se cubre ataque, defensa, mediocampo y equilibrio y se completa con el mejor nivel prefiriendo la especialidad menos repetida. Con presupuesto alto salen S+/S/A (p. ej. Global: Guardiola, Ancelotti, Luis Enrique, Simeone, Bielsa, De la Fuente); con 5 M quedan A; con 2 M los C; si nada es asequible no se ofrece ninguno. Ya no se exige «uno de cada nivel».

**Pools ampliados** (trayectoria en esa liga, no nacionalidad; períodos y fuentes en el JSON): Italia con Mourinho (Inter), Ancelotti (Milan), De Zerbi (Sassuolo), Luis Enrique (Roma), Gattuso (Milan) y Bianchi (Roma); México con Almeyda (Guadalajara) y Bielsa (América); Argentina actual con Bielsa, Pochettino, Simeone, Almeyda, Gago, Alfaro, Domínguez y Coudet; leyendas de Inglaterra (Shankly, Paisley, Wenger, Robson, Ramsey), España (Muñoz, Aragonés) y Brasil (Parreira, Scolari); Tite entra como activo brasileño. Quedan pools finitos: Brasil y México Leyendas solo tienen coaches A/B y a veces menos de seis candidatos asequibles.

**Estado y CPU:** el equipo guarda `coachTier` al contratar en v3 (`hiredCoachOf`), de modo que el motor y los paneles usan el nivel con el que se contrató. La CPU en v3 (`autoChooseCoach`) puntúa la bonificación de cada técnico (con la afinidad de su estrategia táctica real, `selectCpuStrategy`) ponderada por cuánto está por debajo del promedio cada sector de su once; es determinista y desempata por precio. v1/v2 conservan la suma bruta. Online sigue en `coach-market-v2`.

## 2. DISCARD-005 (`config.discards = 'discards-5-v1'`)
- Nuevas partidas locales (clásicas y personalizadas) empiezan con **5 descartes compartidos** (no por jugador); sin marcador (partidas guardadas, repeticiones, online) siguen en 3. `discardLimitOf(config)` alimenta `createRecruiterDuel` y el HUD (`discardsTotal`; `SHARED_DISCARDS = 3` desapareció).
- `discardReplacement` calculaba su flujo aleatorio con `3 − restantes`; ahora usa la cantidad de descartes ya hechos (`discardedPlayerIds.length`), idéntica para partidas de tres y correcta para cinco. Sigue sin reutilizar cartas sorteadas, adjudicadas ni descartadas, mantiene posición/cuotas/viabilidad/`club-spread-v3`, y si no hay reemplazo legal no consume un descarte.
- Contador «Descartes 5/5» con cinco puntos; en el navegador integrado se verificó 5/5 al empezar y el flujo termina normalmente.

## 3. Pruebas y comprobaciones
`coach006b.test.ts` (S+, mercados históricos intactos, niveles, 11 categorías × presupuestos: asequible, real, distinto, reproducible, propio; seis competitivos con especialidades distintas, descenso con menos dinero, pools por trayectoria, contratación y `coachTier`, CPU por sector débil y determinista) y `discard005.test.tsx` (5 vs 3, cinco reemplazos únicos y reproducibles, sexta jugada sin descarte, subasta que termina, HUD y puntos). Pruebas existentes actualizadas por el cambio deliberado: 120 identidades históricas sin los añadidos, 0/5 descartes, exportación con los nuevos marcadores y la prueba de subasta de pantalla ahora usa la misma configuración que la aplicación (200 M, 5 descartes, técnicos v3).
typecheck, lint y build: OK.

## Pendiente
Online conserva presupuestos anteriores, 3 suplentes, 3 descartes y `coach-market-v2` hasta una migración coordinada con el servidor.

## Resultado final
`npm test` (suite completa una vez): 121 archivos, 1.305 pruebas aprobadas y 1 fallida por tiempo (la prueba de pantalla que agota cinco descartes tardó 5,06 s con la suite en paralelo, justo sobre el límite de 5 s); se le dio un margen de 20 s y su archivo se repitió en solitario: 13/13 aprobadas.
