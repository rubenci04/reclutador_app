# Reclutador

Videojuego web de draft de fútbol (antes *Draft Legends*). Dos reclutadores compiten por cada futbolista en una subasta con presupuesto limitado, arman su once (4-3-3 y otras formaciones), contratan técnico y suplentes, eligen una estrategia y juegan una partida simulada.

## Modos de juego
- **Duelo de Reclutadores (misma computadora):** dos personas alternan turnos de puja en un mismo dispositivo.
- **Contra la CPU:** dificultades Fácil, Normal y Difícil, con tres perfiles de puja.
- **Versus Online:** sala con enlace o código de seis caracteres; el motor corre en ambos navegadores (partida amistosa, ver `docs/logs/SPRINT-2-ONLINE.md` y `SPRINT-3-ONLINE.md`).
- **Dirigir partido y draft libre:** partidas locales interactivas y armado de un equipo sin subasta.
- **Categorías:** Global, ligas nacionales (Argentina, Inglaterra, España, Brasil, México, Italia…), Latinoamérica y Europa, cada una con jugadores actuales y leyendas.
- Textos en español (es-AR), inglés y portugués (pt-BR).

## Cómo correrlo
```bash
npm install
npm run dev        # servidor local (Vite muestra la dirección)
```
El modo online necesita `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en `.env.local` (solo claves públicas; nunca se guardan credenciales en el repo). Sin ellas, todo lo demás funciona.

## Cómo probarlo
```bash
npm run typecheck
npm run lint
npm test -- --maxWorkers=4
npm run build
```
Los tests de calibración no escriben archivos en `docs/qa`; para regenerarlos: `WRITE_QA=1 npm test`. Las mediciones de la CPU y del simulador son opt-in (`CPU_MEASURE=<etiqueta>` o `CPU_SERIES=1`, ver `docs/logs/SPRINT-1-CPU.md` y `SPRINT-4-BALANCE.md`).

## Estructura
- `src/features/`: una carpeta por funcionalidad (`recruiter-duel` subasta y CPU, `online` salas, `local-match` simulador, `tactics`, `coaches`, `draft`, `player-catalog`, `themed-modes`, `history`, `audio`…).
- `src/components/`: componentes compartidos. `src/i18n/`: traducciones. `src/styles/`: CSS.
- `supabase/migrations/`: SQL del modo online (se aplican a mano, en orden, en el SQL Editor de Supabase).
- `docs/`: planificación y registros. `scripts/`: auditorías de catálogo y contraste.

## Documentación
- Reglas de trabajo: [AGENTS.md](AGENTS.md)
- [Roadmap](docs/ROADMAP.md) · [Tablero de tareas](docs/TASK_BOARD.md) · [Plan de pruebas](docs/TEST_PLAN.md)
- [Decisiones (ADR)](docs/decisions/) · [Registros por sprint](docs/logs/) · [Despliegue](docs/DEPLOY.md)
- [Historial de cambios](docs/CHANGELOG.md) (README histórico completo)
