import type { Player } from '../../types/player'
import type { DraftLineup } from '../draft/draftTypes'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { MATCH_RULES_VERSION } from '../local-match/matchTypes'
import { simulateMatch } from '../local-match/simulator'
import { STRATEGY_IDS, TACTICS_VERSION, type StrategyId } from './strategies'
import { TACTICAL_GAINS } from './tacticalModel'

export interface CellTally { wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; matches: number }
export type Matrix = Record<StrategyId, Record<StrategyId, CellTally>>

const emptyCell = (): CellTally => ({ wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, matches: 0 })
const emptyMatrix = (): Matrix => Object.fromEntries(STRATEGY_IDS.map((a) => [a, Object.fromEntries(STRATEGY_IDS.map((b) => [b, emptyCell()]))])) as Matrix

function play(matrix: Matrix, catalog: readonly Player[], local: DraftLineup, cpu: DraftLineup, seedPrefix: string, seeds: number) {
  for (const a of STRATEGY_IDS) for (const b of STRATEGY_IDS) {
    const cell = matrix[a][b]
    for (let index = 0; index < seeds; index++) {
      const result = simulateMatch({ localLineup: local, cpuLineup: cpu, catalog, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: `${seedPrefix}-${index}`, tactics: { version: TACTICS_VERSION, local: a, cpu: b } })
      cell.matches++; cell.goalsFor += result.score.local; cell.goalsAgainst += result.score.cpu
      if (result.score.local > result.score.cpu) cell.wins++; else if (result.score.local === result.score.cpu) cell.draws++; else cell.losses++
    }
  }
}

/** Points per match (win 1, draw 0.5) of each strategy for the local side against every opponent strategy. */
export function strategyScores(matrix: Matrix) {
  return Object.fromEntries(STRATEGY_IDS.map((a) => {
    const cells = STRATEGY_IDS.map((b) => matrix[a][b])
    const matches = cells.reduce((t, c) => t + c.matches, 0)
    return [a, (cells.reduce((t, c) => t + c.wins + c.draws / 2, 0)) / matches]
  })) as Record<StrategyId, number>
}

export function runTacticalCalibration(catalog: readonly Player[], options: { equivalentTeams: number; seedsPerEquivalentCell: number; seedsPerStrengthCell: number; poolSize: number }) {
  const equivalent = emptyMatrix()
  const teamSeeds: string[] = []
  for (let team = 0; team < options.equivalentTeams; team++) {
    const seed = `c2-equivalent-team-${team}`; teamSeeds.push(seed)
    const lineup = generateCpuTeam(catalog, seed).team.lineup
    play(equivalent, catalog, lineup, lineup, `c2-eq-${team}`, options.seedsPerEquivalentCell)
  }
  const pool = Array.from({ length: options.poolSize }, (_, index) => generateCpuTeam(catalog, `c2-pool-${index}`).team)
  const ranked = [...pool].sort((left, right) => right.averageRating - left.averageRating || left.spent - right.spent)
  const strong = ranked[0]; const weak = ranked[ranked.length - 1]
  const strongVsWeak = emptyMatrix()
  play(strongVsWeak, catalog, strong.lineup, weak.lineup, 'c2-sw', options.seedsPerStrengthCell)
  const weakVsStrong = emptyMatrix()
  play(weakVsStrong, catalog, weak.lineup, strong.lineup, 'c2-ws', options.seedsPerStrengthCell)
  const share = (cell: CellTally) => (cell.wins + cell.draws / 2) / cell.matches
  let maxSymmetryGap = 0
  for (const a of STRATEGY_IDS) for (const b of STRATEGY_IDS) maxSymmetryGap = Math.max(maxSymmetryGap, Math.abs(share(equivalent[a][b]) - (1 - share(equivalent[b][a]))))
  const shares = STRATEGY_IDS.flatMap((a) => STRATEGY_IDS.map((b) => share(equivalent[a][b])))
  const strongShares = STRATEGY_IDS.flatMap((a) => STRATEGY_IDS.map((b) => share(strongVsWeak[a][b])))
  const weakShares = STRATEGY_IDS.flatMap((a) => STRATEGY_IDS.map((b) => share(weakVsStrong[a][b])))
  return {
    rulesVersion: MATCH_RULES_VERSION, tacticsVersion: TACTICS_VERSION, gains: TACTICAL_GAINS, options,
    equivalent: { teamSeeds, matrix: equivalent, scores: strategyScores(equivalent), minShare: Math.min(...shares), maxShare: Math.max(...shares), maxSymmetryGap, neutralMirror: equivalent.NEUTRAL.NEUTRAL },
    strength: {
      strong: { averageRating: strong.averageRating, spent: strong.spent }, weak: { averageRating: weak.averageRating, spent: weak.spent },
      strongLocal: { matrix: strongVsWeak, scores: strategyScores(strongVsWeak), minShare: Math.min(...strongShares), maxShare: Math.max(...strongShares) },
      weakLocal: { matrix: weakVsStrong, scores: strategyScores(weakVsStrong), minShare: Math.min(...weakShares), maxShare: Math.max(...weakShares) },
    },
  }
}
