import { createSeededRandom } from './seededRandom'
import type { MatchResult, MatchSide } from './matchTypes'
import { simulateMatch } from './simulator'
import { TACTICS_VERSION } from '../tactics/strategies'
import type { Player } from '../../types/player'

export function seriesStanding(matches: readonly MatchResult[]) {
  const wins = { local: 0, cpu: 0 }
  for (const match of matches) if (match.winner !== 'draw') wins[match.winner]++
  const closed = matches.length === 3 && wins.local !== wins.cpu || matches.length >= 5
  return { wins, closed, needsPenalties: closed && wins.local === wins.cpu }
}

/** Same eleven, bench, coach, strategy and budget. Only the event seed changes. */
export function nextSeriesMatch(first: MatchResult, index: number, catalog: readonly Player[]) {
  return simulateMatch({
    localLineup: first.local.lineup, cpuLineup: first.cpu.lineup, catalog,
    catalogVersion: first.catalogVersion, rulesVersion: first.rulesVersion,
    seed: `${first.seed}:series:${index}`, actionModel: first.actionModel,
    budget: Math.max(100, first.local.spent, first.cpu.spent),
    rosterBonus: Boolean(first.quality), coaches: first.coaches,
    ...(first.benches ? { benches: { local: first.benches.local.map((p) => p.id), cpu: first.benches.cpu.map((p) => p.id) } } : {}),
    ...(first.tactics ? { tactics: { version: TACTICS_VERSION, ...first.tactics.selection } } : {}),
  })
}

/** Five kicks each, then sudden death; bounded fallback has equal probability. */
export function seriesPenalties(first: MatchResult): { score: Record<MatchSide, number>; winner: MatchSide } {
  const random = createSeededRandom(`${first.seed}:series:penalties`)
  const score = { local: 0, cpu: 0 }
  for (let kick = 0; kick < 5; kick++) for (const side of ['local', 'cpu'] as const) if (random() < .75) score[side]++
  for (let round = 0; score.local === score.cpu && round < 50; round++) {
    if (random() < .75) score.local++
    if (random() < .75) score.cpu++
  }
  if (score.local === score.cpu) score[random() < .5 ? 'local' : 'cpu']++
  return { score, winner: score.local > score.cpu ? 'local' : 'cpu' }
}

/** Both online participants derive the complete series from the stored seed. */
export function resolveSeries(first: MatchResult, catalog: readonly Player[]) {
  const matches = [first]
  while (!seriesStanding(matches).closed) matches.push(nextSeriesMatch(first, matches.length + 1, catalog))
  const standing = seriesStanding(matches)
  const penalties = standing.needsPenalties ? seriesPenalties(first) : null
  const winner: MatchSide = penalties?.winner ?? (standing.wins.local > standing.wins.cpu ? 'local' : 'cpu')
  return { matches, ...standing, penalties, winner }
}
