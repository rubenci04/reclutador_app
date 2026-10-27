import { createSeededRandom } from './seededRandom'
import type { MatchResult, MatchSide } from './matchTypes'
import { playMatch } from './engine/figuresMatch'
import { TACTICS_VERSION, type StrategyId } from '../tactics/strategies'
import { organizeFormation, type FormationId } from '../tactics/formations'
import type { DraftLineup } from '../draft/draftTypes'
import type { Player } from '../../types/player'

export function seriesStanding(matches: readonly MatchResult[]) {
  const wins = { local: 0, cpu: 0 }
  for (const match of matches) if (match.winner !== 'draw') wins[match.winner]++
  const homeAway = matches[0]?.seriesFormat === 'home-away'
  const closed = homeAway ? matches.length >= 2 && wins.local !== wins.cpu || matches.length >= 3 : matches.length === 3 && wins.local !== wins.cpu || matches.length >= 5
  return { wins, closed, needsPenalties: closed && wins.local === wins.cpu }
}

/** What a game of the series is played with: the eleven, the bench, the formation and the strategy of each side. */
export interface SeriesSetup {
  readonly lineups: Readonly<Record<MatchSide, DraftLineup>>
  readonly benches?: Readonly<Record<MatchSide, readonly string[]>>
  readonly formations?: Readonly<Record<MatchSide, FormationId>>
  readonly tactics?: Readonly<Record<MatchSide, StrategyId>>
}

export const seriesSetup = (result: MatchResult): SeriesSetup => ({
  lineups: { local: result.local.lineup, cpu: result.cpu.lineup },
  ...(result.benches ? { benches: { local: result.benches.local.map((p) => p.id), cpu: result.benches.cpu.map((p) => p.id) } } : {}),
  ...(result.formations ? { formations: result.formations } : {}),
  ...(result.tactics ? { tactics: result.tactics.selection } : {}),
})

/** Re-arranges one side into another formation with the same players; null when the roster cannot fill it. */
export function changeSeriesFormation(setup: SeriesSetup, side: MatchSide, formation: FormationId, catalog: readonly Player[]): SeriesSetup | null {
  const owned = [...Object.values(setup.lineups[side]), ...(setup.benches?.[side] ?? [])].filter((id): id is string => Boolean(id))
  const lineup = organizeFormation(owned, formation, catalog)
  if (!lineup) return null
  const starters = new Set(Object.values(lineup))
  const rest = owned.filter((id) => !starters.has(id))
  const other: MatchSide = side === 'local' ? 'cpu' : 'local'
  return {
    ...setup,
    lineups: { ...setup.lineups, [side]: lineup },
    ...(setup.benches ? { benches: { ...setup.benches, [side]: rest } } : {}),
    formations: { ...(setup.formations ?? { local: '4-3-3', cpu: '4-3-3' }), [side]: formation, [other]: setup.formations?.[other] ?? '4-3-3' },
  }
}

/** A formation change can put a substitute in the eleven, so the cost of the new eleven also bounds the budget check. */
const lineupCost = (lineup: DraftLineup, catalog: readonly Player[]) => Object.values(lineup).reduce((sum, id) => sum + (catalog.find((p) => p.id === id)?.price ?? 0), 0)

/** Same budget, coach and roster bonus as the first game; only the event seed changes, plus whatever the setup changed. */
export function nextSeriesMatch(first: MatchResult, index: number, catalog: readonly Player[], setup: SeriesSetup = seriesSetup(first)) {
  return playMatch({
    ...(first.engineVersion ? { engineVersion: first.engineVersion } : {}),
    localLineup: setup.lineups.local, cpuLineup: setup.lineups.cpu, catalog,
    catalogVersion: first.catalogVersion, rulesVersion: first.rulesVersion,
    seed: `${first.seed}:series:${index}`, actionModel: first.actionModel,
    seriesFormat: first.seriesFormat,
    formations: setup.formations,
    budget: Math.max(100, first.local.spent, first.cpu.spent, lineupCost(setup.lineups.local, catalog), lineupCost(setup.lineups.cpu, catalog)),
    rosterBonus: Boolean(first.quality), coaches: first.coaches,
    ...(setup.benches ? { benches: { local: [...setup.benches.local], cpu: [...setup.benches.cpu] } } : {}),
    ...(setup.tactics ? { tactics: { version: TACTICS_VERSION, ...setup.tactics } } : {}),
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
