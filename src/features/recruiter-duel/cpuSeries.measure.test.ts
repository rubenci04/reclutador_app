import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { resolveSeries } from '../local-match/matchSeries'
import { CPU_DIFFICULTIES, CPU_STRATEGIES } from './cpuPolicy'
import { startDuelMatch } from './auctionEngine'
import type { RecruiterDuelGame } from './auctionTypes'
import { HUMANS, playMeasured } from './cpuSimulation'

/**
 * Sprint 4 measurement (opt-in, does not touch the simulator): CPU_SERIES=1 writes docs/qa/SPRINT-4-sim-balance.json.
 * Same squads are played twice: the current game (action-v3, home-and-away series via resolveSeries) and the quick single match.
 */
const catalog = catalogForMode('GLOBAL_CLASSIC')
const ovr = (game: RecruiterDuelGame, side: 'recruiter_one' | 'recruiter_two') => { const ids = Object.values(game.teams[side].lineup); return ids.reduce((sum, id) => sum + catalog.find((p) => p.id === id)!.overall_rating, 0) / ids.length }
const play = (game: RecruiterDuelGame, actionModel: boolean) => { const started = startDuelMatch(game, catalog, undefined, actionModel); if (!started.ok) throw new Error(started.error); return started.game.matchResult! }
const pct = (value: number, total: number) => Math.round(value / Math.max(1, total) * 1000) / 10

function series(game: RecruiterDuelGame) {
  const first = play(game, true)
  const resolved = resolveSeries(first, catalog)
  return { winner: resolved.winner, penalties: !!resolved.penalties, matches: resolved.matches.length }
}

export const TRANCHES = [['0-0.5', 0, .5], ['0.5-1', .5, 1], ['1-2', 1, 2], ['2-3', 2, 3], ['>3', 3, Infinity]] as const

describe.skipIf(!process.env.CPU_SERIES)('sprint 4 simulator balance in series', () => {
  it('measures mirror teams and the win probability by OVR difference, series against the quick match', () => {
    const mirror = { series: { n: 0, localWins: 0, cpuWins: 0, penalties: 0, matches: 0 }, quick: { n: 0, localWins: 0, draws: 0, cpuWins: 0 } }
    const buckets = TRANCHES.map(([label]) => ({ label, n: 0, seriesBetterWins: 0, seriesPenalties: 0, seriesMatches: 0, quickBetterWins: 0, quickDraws: 0, quickWorseWins: 0 }))
    let games = 0
    for (const human of HUMANS) for (const difficulty of CPU_DIFFICULTIES) for (const strategy of CPU_STRATEGIES) for (let index = 0; index < 40; index++) {
      const game = playMeasured(`bal-${human}-${difficulty}-${strategy}-${index}`, strategy, difficulty, human)
      games++
      // Mirror: both sides get the eleven of the CPU (all three humans, all difficulties give varied squads).
      const twin: RecruiterDuelGame = { ...game, teams: { recruiter_one: { ...game.teams.recruiter_two, lineup: { ...game.teams.recruiter_two.lineup } }, recruiter_two: game.teams.recruiter_two } }
      if (index < 20) {
        const s = series(twin); mirror.series.n++; mirror.series[s.winner === 'local' ? 'localWins' : 'cpuWins']++; mirror.series.penalties += Number(s.penalties); mirror.series.matches += s.matches
        const q = play(twin, false); mirror.quick.n++; mirror.quick[q.winner === 'local' ? 'localWins' : q.winner === 'cpu' ? 'cpuWins' : 'draws']++
      }
      const [humanOvr, cpuOvr] = [ovr(game, 'recruiter_one'), ovr(game, 'recruiter_two')]
      const diff = Math.abs(humanOvr - cpuOvr); const better = humanOvr >= cpuOvr ? 'local' : 'cpu'
      const bucket = buckets[TRANCHES.findIndex(([, low, high]) => diff >= low && diff < high)]
      const s = series(game); const q = play(game, false)
      bucket.n++; bucket.seriesBetterWins += Number(s.winner === better); bucket.seriesPenalties += Number(s.penalties); bucket.seriesMatches += s.matches
      if (q.winner === 'draw') bucket.quickDraws++; else if (q.winner === better) bucket.quickBetterWins++; else bucket.quickWorseWins++
    }
    const report = {
      catalog: 'GLOBAL_CLASSIC', games, note: 'Better team = higher mean OVR of the eleven (ties count for the human). No coaches, no substitutes. Same squads in both models.',
      mirror: {
        series: { ...mirror.series, localWinPct: pct(mirror.series.localWins, mirror.series.n), cpuWinPct: pct(mirror.series.cpuWins, mirror.series.n), penaltyPct: pct(mirror.series.penalties, mirror.series.n), avgMatchesPerSeries: Math.round(mirror.series.matches / mirror.series.n * 100) / 100 },
        quick: { ...mirror.quick, localWinPct: pct(mirror.quick.localWins, mirror.quick.n), drawPct: pct(mirror.quick.draws, mirror.quick.n), cpuWinPct: pct(mirror.quick.cpuWins, mirror.quick.n) },
      },
      byOvrDifference: buckets.map((b) => ({ ...b, seriesBetterWinPct: pct(b.seriesBetterWins, b.n), seriesPenaltyPct: pct(b.seriesPenalties, b.n), seriesAvgMatches: Math.round(b.seriesMatches / Math.max(1, b.n) * 100) / 100, quickBetterWinPct: pct(b.quickBetterWins, b.n), quickDrawPct: pct(b.quickDraws, b.n), quickWorseWinPct: pct(b.quickWorseWins, b.n) })),
    }
    writeFileSync('docs/qa/SPRINT-4-sim-balance.json', JSON.stringify(report, null, 2) + '\n')
    expect(games).toBeGreaterThanOrEqual(300)
  }, 1_800_000)
})
