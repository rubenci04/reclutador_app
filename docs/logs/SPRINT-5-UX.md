# Sprint 5 — Legibilidad y UX de la subasta, y limpieza del repo

Sin navegador disponible: todos los cambios visuales son conservadores (unidades relativas, sin alturas fijas) y no se verificaron a ojo. **Revisá en el celular (320-390 px) los selectores de abajo.**

## Parte A — Tamaños de texto
Todo `font-size` de 11px, .68rem y 12px pasó a **.8rem** salvo lo decorativo o la geometría de la cancha. Además .78rem/.75rem de `.budget-breakdown`, `.turn-strip` y `.turn-clock` pasaron a .8rem. Anchos fijos con riesgo de cortar texto: `.match-score small` (86px/62px → `min-width` + `overflow-wrap:anywhere`) y `.storage-error` (260px → `min(260px, 100vw − 32px)`).

### Selectores modificados (font-size → .8rem)
- `.language-control label (12px -> .8rem)`
- `.language-control select (12px -> .8rem)`
- `.storage-error (12px -> .8rem)`
- `.status (.68rem -> .8rem)`
- `.muted (12px -> .8rem)`
- `dt (12px -> .8rem)`
- `.pending (.68rem -> .8rem)`
- `.language-control select (11px -> .8rem)`
- `.budget-amount small,.summary-stats dt (11px -> .8rem)`
- `.viability (11px -> .8rem)`
- `.confirmation-card p (12px -> .8rem)`
- `.confirmation-card small (11px -> .8rem)`
- `.catalog-filters label (.68rem -> .8rem)`
- `.player-card-main p (.68rem -> .8rem)`
- `.player-card-meta (12px -> .8rem)`
- `.catalog-player button (11px -> .8rem)`
- `.draft-alert (12px -> .8rem)`
- `.match-scoreboard small (11px -> .8rem)`
- `.match-score small (11px -> .8rem)`
- `.match-narration li (12px -> .8rem)`
- `.match-stats small (11px -> .8rem)`
- `.match-summary>p (11px -> .8rem)`
- `.match-summary dt (.68rem -> .8rem)`
- `.match-scoreboard strong (11px -> .8rem)`
- `.mode-list button strong (12px -> .8rem)`
- `.mode-list button span (.68rem -> .8rem)`
- `.mode-list button small (11px -> .8rem)`
- `.duel-intro label,.bid-panel label (12px -> .8rem)`
- `.auction-heading p:last-child (12px -> .8rem)`
- `.recruiter-scores small (.68rem -> .8rem)`
- `.single-player-card article small (.68rem -> .8rem)`
- `.single-player-card p (12px -> .8rem)`
- `.bid-panel p,.award-result p (12px -> .8rem)`
- `.team-comparison p (11px -> .8rem)`
- `.club-name (12px -> .8rem)`
- `.catalog-player .club-name (.68rem -> .8rem)`
- `.catalog-player .club-name (11px -> .8rem)`
- `.club-detail-label (.68rem -> .8rem)`
- `.club-career-status (12px -> .8rem)`
- `.club-audit-date (.68rem -> .8rem)`
- `.catalog-player .club-detail-label,.catalog-player .club-audit-date (11px -> .8rem)`
- `.catalog-player .club-career-status (.68rem -> .8rem)`
- `.hud-turn (.68rem -> .8rem)`
- `.hud-positions li small (.68rem -> .8rem)`
- `.hud-ceiling small (.68rem -> .8rem)`
- `.hud-positions li (.68rem -> .8rem)`
- `.player-ratings small (.68rem -> .8rem)`
- `.coach-details (12px -> .8rem)`
- `.team-progress .team-missing (12px -> .8rem)`
- `.hud-details summary (11px -> .8rem)`
- `.live-match .board-focus label (.68rem -> .8rem)`
- `.coach-stats small (11px -> .8rem)`
- `.bid-figures dt (.68rem -> .8rem)`
- `.bid-figures small (.68rem -> .8rem)`
- `.live-market-title (.68rem -> .8rem)`

### Se dejaron como estaban (decorativos o geometría de la cancha; decidir tras verlos en el celular)
`.eyebrow (.68rem)`, `.mode-line .eyebrow (11px)`, `.pitch-heading (.68rem)`, `.slot-label (11px)`, `.pitch-caption (.68rem)`, `.site-footer (.68rem)`, `.site-footer>span:last-child (11px)`, `.eyebrow (11px)`, `.player-token strong (11px)`, `.player-token span (11px)`, `.draft-footer (.68rem)`, `.tier (11px)`, `.header-mode (11px)`, `.player-avatar span (.68rem)`, `.club-monogram (11px)`, `.visual-credits (12px)`, `.pitch-shirt (11px)`, `.pitch-shirt (.68rem)`, `.power-global span (12px)`, `.mode-variant (11px)`, `.dealer-puck (11px)`, `.event-icon (12px)`, `.dribble-attacker text, .dribble-defender text (.68rem)`, `.shot-keeper text (11px)`

## Parte A — Contraste (WCAG)
Script: `node scripts/contrast-auction.cjs` (panel de puja, medidor de riesgo, avisos y reloj de turno; colores tomados de `src/styles/index.css`, con las transparencias mezcladas sobre el fondo). Mínimo 4,5:1 para texto y 3:1 para el relleno del medidor. Resultado final, después de la corrección:

| Par | Ratio | Resultado |
|---|---|---|
| Panel p / award text | 11.86 | ok |
| Panel label | 10.44 | ok |
| Input value | 18.67 | ok |
| Figures dt (opacity .8) | 8.5 | ok |
| Figures dd | 12.42 | ok |
| Figures small (opacity .75) | 7.66 | ok |
| Team status | 12.76 | ok |
| Team needs | 11.78 | ok |
| Turn strip P1 | 11.59 | ok |
| Turn strip P2 | 5.45 | ok |
| Banner text | 13.05 | ok |
| Banner list | 10.39 | ok |
| Blocked banner text | 15.17 | ok |
| Bid chip | 13.3 | ok |
| Bid chip max | 13.23 | ok |
| Risk label text | 14.97 | ok |
| Budget breakdown | 11.86 | ok |
| Budget offerable | 13.81 | ok |
| Primary button | 14.36 | ok |
| Secondary button | 13.81 | ok |
| Details summary | 14.28 | ok |
| Details text | 14.32 | ok |
| Turn clock text | 16.56 | ok |
| Turn clock late | 10.54 | ok |
| Risk fill safe (non-text) | 4.92 | ok |
| Risk fill warn (non-text) | 5.84 | ok |
| Risk fill danger (non-text) | 4.05 | ok |

Único incumplimiento hallado: el relleno «peligro» (#ef4444, 2,98:1) → `--bet-danger` pasó a #f87171 (4,05:1). El texto de botones deshabilitados queda exento (WCAG).

## Parte B — Medidor de riesgo
`AuctionBidPanel`: junto al medidor hay una etiqueta visible con símbolo (✓ Seguro, ! Cuidado, ✕ Peligro; en: Safe/Careful/Danger; pt-BR: Seguro/Cuidado/Perigo) y el relleno tiene un patrón distinto por nivel (liso, rayas diagonales, trama cruzada). El `aria-label` del medidor se mantiene; la etiqueta visible es `aria-hidden` para no repetirlo. Claves nuevas: `bidTable.riskText.*`. Para mirar: `.risk-row` (se envuelve en 320 px).

## Parte C — Aviso que filtraba información
`auctionBanner.blocked.FUTURE_BUDGET_RESERVED` ya no muestra la suma de precios de las cartas restantes ni el total restante de ambos equipos: explica que hay que reservar dinero para completar el plantel de los dos equipos y da el precio, el máximo seguro y el consejo. Tres idiomas; `AuctionPage` dejó de calcular esas sumas. Prueba nueva en `AuctionBidPanel.test.tsx`.

## Parte D — Limpieza
- Los nueve tests (`tacticalCalibration`, `cpuPolicy`, `substitutes`, `cpuDifficulty`, `drawVariety`, `collectionBalance`, `globalTop`, `calibration`, `attackTree`) solo escriben en `docs/qa` con `WRITE_QA=1`; las aserciones corren igual.
- `README.md` nuevo y corto; el texto anterior, íntegro, está en `docs/CHANGELOG.md`.
