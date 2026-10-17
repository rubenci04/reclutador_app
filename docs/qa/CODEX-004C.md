# QA — CODEX-004C · El Reclutador

Fecha: 17/10/2026. Rama: `feat/el-reclutador-modes-foundation`.

## Entrega comprobada

La presentación comercial ahora es **El Reclutador** en cabecera, título HTML y documentación principal. `PRODUCT.name` concentra la marca. No se renombraron la clave `draft-legends.draft-v1`, `catalog_v1`, IDs `plr_*`, rutas ni carpetas: la prueba confirma que un borrador válido del esquema 1 se conserva compatible sin migración.

Se agregaron contratos TypeScript aditivos de metadatos y procedencia, reglas de once, filtro puro y diagnóstico de modalidades. El selector muestra las once modalidades, su cantidad elegible real y su estado; solo Global queda activable en esta versión. Las restantes quedan pendientes hasta que haya datos revisados y el flujo de partido consuma el catálogo filtrado. No se agregaron jugadores, torneos, conectores ni claves externas.

## Batería reproducible del simulador

La prueba `runBalanceDiagnostic(DRAFT_CATALOG)` ejecutó 2.400 partidos deterministas: semillas explícitas, 800 por escenario. El generador CPU conserva su banda habitual de 95–100M cuando existe; el escenario de diferencia de presupuesto enfrenta el once mínimo legal al CPU, y el de concentración conserva la base económica mínima e invierte el margen en los tres delanteros de mayor rating posible. No cambia precios ni probabilidades.

| Escenario | Local / CPU / empates | Goles | Goles por partido | 0-0 | 5+ de un equipo |
|---|---:|---:|---:|---:|---:|
| Equilibrado | 216 / 243 / 341 | 815 | 1,019 | 259 | 0 |
| Diferencia de presupuesto | 125 / 344 / 331 | 837 | 1,046 | 259 | 0 |
| Superestrellas concentradas | 199 / 266 / 335 | 886 | 1,108 | 236 | 0 |
| Total | 540 / 853 / 1.007 | 2.538 | 1,058 | 754 | 0 |

Fortaleza relativa por escenario: el conjunto equilibrado se repartió en 259 locales más fuertes, 287 equivalentes y 254 CPU más fuertes; en los dos escenarios intencionalmente desiguales, CPU fue más fuerte en los 800 casos. La diferencia de presupuesto reduce la victoria local a 15,6%; la concentración ofensiva la lleva a 24,9%, pero aún queda debajo del escenario equilibrado (27,0%). Esto muestra que el presupuesto y la composición influyen sin demostrar un error aritmético.

Distribución de marcadores registrada (cantidad):

| Escenario | Marcadores no nulos |
|---|---|
| Equilibrado | 0-0: 259; 0-1: 181; 1-0: 143; 1-1: 81; 2-0: 47; 0-2: 36; 2-1: 19; 1-2: 18; 3-0: 6; 0-3: 6; 1-3: 2; 2-2: 1; 3-1: 1 |
| Diferencia de presupuesto | 0-0: 259; 0-1: 215; 1-0: 95; 0-2: 86; 1-1: 71; 1-2: 23; 0-3: 16; 2-0: 15; 2-1: 15; 1-3: 3; 1-4: 1; 2-2: 1 |
| Superestrellas concentradas | 0-0: 236; 0-1: 177; 1-0: 138; 1-1: 96; 0-2: 52; 2-0: 37; 1-2: 27; 2-1: 20; 0-3: 6; 1-3: 3; 2-2: 3; 3-0: 2; 4-0: 2; 0-4: 1 |

### Diagnóstico matemático

No apareció un defecto matemático demostrado. El reparto de posesión y ataques usa la diferencia de ataque contra defensa y el 45% de la diferencia de mediocampo; cada encuentro tiene seis bloques, con remate, remate al arco y gol encadenados. Esa estructura produce pocas oportunidades efectivas: 1,058 goles por partido y 31,4% de 0-0 explican el 41,9% de empates total. La ventaja CPU agregada se explica por dos escenarios diseñados con CPU más fuerte; el escenario equilibrado queda 27,0% local, 30,4% CPU y 42,6% empate.

Las pruebas de regresión elevan ATT y verifican aumento de ataque; elevan DEF en ARQ/DEF y verifican aumento defensivo; elevan PHY y MEN y verifican aumento de mediocampo. La simulación permanece determinista, y los eventos siguen siendo coherentes con marcador, remates, atajadas, recuperaciones y posesión.

Antes de cambiar el balance, las alternativas subjetivas son: aumentar el número de bloques; elevar una o más probabilidades condicionales; introducir un desempate solo para modos que lo requieran; o conservar esta frecuencia como modo corto y defensivo. Cada alternativa altera experiencia de producto, por lo que no se aplicó ninguna sin una decisión explícita.

## Comprobaciones automatizadas

En una copia temporal aislada del proyecto, restaurada desde `package-lock.json` sin red debido a una carpeta `node_modules` local bloqueada, se ejecutaron:

| Comando o alcance | Resultado |
|---|---|
| `tsc --noEmit` | OK |
| `npm test` | OK — 431 pruebas en 9 archivos |
| `npm run lint` | OK |
| `npm run build` | OK — Vite completó 85 módulos |
| `npm run catalog:audit` | OK — B01/B02/B03 parciales aprobados; 150/500, global pendiente como se espera |
| Diagnóstico de 2.400 partidos | OK — 2.400 resultados, repetición de 24 partidos idéntica |

Las verificaciones se hicieron en una copia temporal del mismo árbol fuente porque la instalación `npm ci` en el workspace falla al intentar desvincular `lightningcss.win32-x64-msvc.node` con `EPERM`. No se eliminó ni se modificó ese archivo bloqueado; la copia temporal restauró el lockfile sin red y ejecutó la batería completa.

## QA visual manual pendiente

Se intentó nuevamente acceder al navegador integrado. La herramienta informó: `Local browser use is disabled in Work settings`. Por eso no se aprueba la revisión visual.

Para completarla localmente:

```powershell
cd 'C:\Users\rea_0\Documents\ChatGPT\Fútbol Draft'
npm ci
npm run dev
```

Abrir la URL de Vite en escritorio, 390 px y 360 px y confirmar:

1. Global clásico sigue disponible; las modalidades pendientes muestran cantidad y no habilitan un draft alternativo.
2. Elegir once, respetar presupuesto, confirmar y abrir el partido CPU.
3. La reproducción llega a 90', los eventos coinciden con marcador y las estadísticas.
4. Reproducir conserva resultado; revancha crea una semilla nueva; volver mantiene el draft.
5. Cambiar es-AR, inglés y pt-BR antes y durante el partido, con la marca El Reclutador intacta.
6. Revisar foco visible, teclado, reducción de movimiento y ausencia de desborde horizontal en móvil.
