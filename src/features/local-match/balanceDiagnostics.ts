import type { Player } from '../../types/player'
import { createEmptyLineup } from '../draft/draftModel'
import { DRAFT_SLOTS, type DraftLineup } from '../draft/draftTypes'
import { generateCpuTeam } from './cpuTeam'
import { MATCH_RULES_VERSION, type MatchSide } from './matchTypes'
import { simulateMatch } from './simulator'

export type DiagnosticScenarioId = 'balanced' | 'budget_gap' | 'star_concentration'
type RelativeStrength = 'local_stronger' | 'even' | 'cpu_stronger'

export interface ScenarioDiagnostic {
  readonly id: DiagnosticScenarioId
  readonly matches: number
  readonly outcomes: Readonly<Record<MatchSide | 'draw', number>>
  readonly goals: number
  readonly zeroZero: number
  readonly extremeScores: number
  readonly scorelines: Readonly<Record<string, number>>
  readonly relativeStrength: Readonly<Record<RelativeStrength, number>>
}

export interface BalanceDiagnostic {
  readonly matchesPerScenario: number
  readonly totalMatches: number
  readonly scenarios: readonly ScenarioDiagnostic[]
}

function cheapestLineup(catalog: readonly Player[]): DraftLineup {
  const lineup = createEmptyLineup()
  const used = new Set<string>()
  for (const slot of DRAFT_SLOTS) {
    const player = catalog
      .filter((candidate) => candidate.position === slot.position && !used.has(candidate.id))
      .sort((left, right) => left.price - right.price || left.id.localeCompare(right.id))[0]
    if (!player) throw new Error('diagnostic_catalog_incomplete')
    lineup[slot.id] = player.id
    used.add(player.id)
  }
  return lineup
}

/** Keeps the cheapest legal base, then spends the available headroom on the three forwards. */
function starConcentratedLineup(catalog: readonly Player[]): DraftLineup {
  const lineup = cheapestLineup(catalog)
  const selected = new Set(Object.values(lineup).filter((id): id is string => id !== null))
  let spent = Object.values(lineup).reduce((total, id) => total + (catalog.find((player) => player.id === id)?.price ?? 0), 0)
  for (const slot of DRAFT_SLOTS.filter((candidate) => candidate.position === 'DEL')) {
    const currentId = lineup[slot.id]!
    const current = catalog.find((player) => player.id === currentId)!
    const candidate = catalog
      .filter((player) => player.position === 'DEL' && (!selected.has(player.id) || player.id === currentId) && spent - current.price + player.price <= 100)
      .sort((left, right) => right.overall_rating - left.overall_rating || right.att_rating - left.att_rating || left.id.localeCompare(right.id))[0]
    if (!candidate) continue
    lineup[slot.id] = candidate.id
    selected.delete(currentId); selected.add(candidate.id)
    spent += candidate.price - current.price
  }
  return lineup
}

function relativeStrength(localRating: number, cpuRating: number): RelativeStrength {
  if (localRating >= cpuRating + 1) return 'local_stronger'
  if (cpuRating >= localRating + 1) return 'cpu_stronger'
  return 'even'
}

function emptyScenario(id: DiagnosticScenarioId, matches: number): ScenarioDiagnostic {
  return { id, matches, outcomes: { local: 0, cpu: 0, draw: 0 }, goals: 0, zeroZero: 0, extremeScores: 0, scorelines: {}, relativeStrength: { local_stronger: 0, even: 0, cpu_stronger: 0 } }
}

function addMatch(summary: ScenarioDiagnostic, winner: MatchSide | 'draw', localScore: number, cpuScore: number, localRating: number, cpuRating: number) {
  const outcomes = { ...summary.outcomes, [winner]: summary.outcomes[winner] + 1 }
  const key = `${localScore}-${cpuScore}`
  const scorelines = { ...summary.scorelines, [key]: (summary.scorelines[key] ?? 0) + 1 }
  const relative = relativeStrength(localRating, cpuRating)
  return {
    ...summary,
    outcomes,
    goals: summary.goals + localScore + cpuScore,
    zeroZero: summary.zeroZero + Number(localScore === 0 && cpuScore === 0),
    extremeScores: summary.extremeScores + Number(Math.max(localScore, cpuScore) >= 5),
    scorelines,
    relativeStrength: { ...summary.relativeStrength, [relative]: summary.relativeStrength[relative] + 1 },
  }
}

/** Reproducible statistical sample. It changes neither runtime odds nor the catalog economy. */
export function runBalanceDiagnostic(catalog: readonly Player[], matchesPerScenario = 800): BalanceDiagnostic {
  if (!Number.isInteger(matchesPerScenario) || matchesPerScenario <= 0) throw new Error('invalid_diagnostic_sample')
  const economical = cheapestLineup(catalog)
  const concentrated = starConcentratedLineup(catalog)
  const scenarios: ScenarioDiagnostic[] = []
  for (const id of ['balanced', 'budget_gap', 'star_concentration'] as const) {
    let summary = emptyScenario(id, matchesPerScenario)
    for (let index = 0; index < matchesPerScenario; index++) {
      const localLineup = id === 'balanced' ? generateCpuTeam(catalog, `diagnostic-${id}-local-${index}`).team.lineup : id === 'budget_gap' ? economical : concentrated
      const cpuLineup = generateCpuTeam(catalog, `diagnostic-${id}-cpu-${index}`).team.lineup
      const match = simulateMatch({ localLineup, cpuLineup, catalog, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: `diagnostic-${id}-${index}` })
      summary = addMatch(summary, match.winner, match.score.local, match.score.cpu, match.local.averageRating, match.cpu.averageRating)
    }
    scenarios.push(summary)
  }
  return { matchesPerScenario, totalMatches: matchesPerScenario * scenarios.length, scenarios }
}
