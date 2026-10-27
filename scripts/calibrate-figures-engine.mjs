// Calibration of the figures engine (figures-v1): 20,000 matches per case. Usage: node scripts/calibrate-figures-engine.mjs
import { createServer } from 'vite'
const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const { playFiguresMatch } = await vite.ssrLoadModule('/src/features/local-match/engine/figuresModel.ts')
  const C = await vite.ssrLoadModule('/src/features/local-match/engine/engineConstants.ts')
  const N = 20000
  const flat = (value) => ({ attack: value, midfield: value, defense: value, keeper: value })
  const side = (lines, tempo = 0) => ({ lines: Array(C.SEGMENTS).fill(lines), tempo })
  const cases = [
    { name: 'Parejos (0)', local: flat(85), cpu: flat(85) },
    { name: 'Favorito +5', local: flat(90), cpu: flat(85) },
    { name: 'Favorito +10', local: flat(95), cpu: flat(85) },
    { name: 'Favorito +15', local: flat(100), cpu: flat(85) },
    { name: 'Favorito +20', local: flat(105), cpu: flat(85) },
    { name: 'Ataque +10 vs defensa igual', local: { ...flat(85), attack: 95 }, cpu: flat(85) },
    { name: 'Mediocampo +10', local: { ...flat(85), midfield: 95 }, cpu: flat(85) },
    { name: 'Arquero +10 (rival)', local: flat(85), cpu: { ...flat(85), keeper: 95 } },
    { name: 'Táctica ofensiva (ambos 85)', local: flat(85), cpu: flat(85), tempo: 0.1 },
    { name: 'Bloque bajo (ambos 85)', local: flat(85), cpu: flat(85), tempo: -0.1 },
  ]
  const rows = cases.map((c) => {
    const t = { w: 0, d: 0, l: 0, goals: 0, favGoals: 0, shots: 0, onTarget: 0, corners: 0, penalties: 0, freeKicks: 0, saves: 0, moments: 0, momentGoals: 0 }
    for (let i = 0; i < N; i++) {
      const setup = { seed: `cal-${c.name}-${i}`, sides: { local: side(c.local, c.tempo ?? 0), cpu: side(c.cpu, c.tempo ?? 0) } }
      const r = playFiguresMatch(setup)
      t.goals += r.score.local + r.score.cpu; t.favGoals += r.score.local
      if (r.score.local > r.score.cpu) t.w++; else if (r.score.local < r.score.cpu) t.l++; else t.d++
      for (const s of r.segments) {
        for (const ch of s.chances) {
          t.shots++; if (ch.outcome === 'goal' || ch.outcome === 'save') t.onTarget++; if (ch.outcome === 'save') t.saves++
          if (ch.kind === 'corner') t.corners++; if (ch.kind === 'penalty') t.penalties++; if (ch.kind === 'free-kick') t.freeKicks++
        }
        if (s.moment) { t.moments++; if (s.moment.goal) t.momentGoals++ }
      }
    }
    const pct = (x) => (100 * x / N).toFixed(1)
    const avg = (x) => (x / N).toFixed(2)
    return { name: c.name, row: `| ${c.name} | ${pct(t.w)} / ${pct(t.d)} / ${pct(t.l)} | ${avg(t.goals)} | ${avg(t.favGoals)} - ${avg(t.goals - t.favGoals)} | ${avg(t.shots)} | ${avg(t.onTarget)} | ${avg(t.corners)} | ${avg(t.penalties)} | ${avg(t.moments)} |` }
  })
  const header = `| Caso | Gana / Empata / Pierde (local) | Goles | Goles local - visitante | Tiros | A puerta | Córners | Penales | Momentos |\n|---|---|---|---|---|---|---|---|---|`
  const table = [header, ...rows.map((r) => r.row)].join('\n')
  console.log(table)
} finally { await vite.close() }
