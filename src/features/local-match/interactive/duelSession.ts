import type { Player } from '../../../types/player'
import type { RecruiterDuelGame, RecruiterId } from '../../recruiter-duel/auctionTypes'
import { budgetOf } from '../../recruiter-duel/auctionEngine'
import { coachById } from '../../coaches/coachCatalog'
import { coachEffect } from '../../coaches/coachRules'
import { isStrategyId, type StrategyId } from '../../tactics/strategies'
import { createSession } from './session'
import type { Outcome, SessionOptions, SessionInput } from './types'

/** Local boundary only. No batch simulation, auction mutation or online contract changes. */
export function createDuelSession(game: RecruiterDuelGame, catalog: readonly Player[], strategies: Readonly<Record<RecruiterId, StrategyId>>, attackTree: boolean | 'match-moments-v1' | 'directed-header-v1' = false, halftimeRules = false): Outcome {
  if (game.phase !== 'TEAMS_COMPLETED') return { ok: false, error: 'INVALID_PHASE' }
  if (!isStrategyId(strategies.recruiter_one) || !isStrategyId(strategies.recruiter_two)) return { ok: false, error: 'INVALID_STRATEGY' }
  const budget = budgetOf(game)
  const coach = (id: RecruiterId) => { const hired = coachById(game.teams[id].coachId); return hired ? { id: hired.id, ...coachEffect(hired, strategies[id]) } : null }
  const bench = (id: RecruiterId) => (game.teams[id].bench ?? []).flatMap((slot) => slot.playerId ? [slot.playerId] : [])
  const ledger = (id: RecruiterId) => {
    const team = game.teams[id]; const hired = coachById(team.coachId)
    const coachPaid = hired ? team.coachPrice ?? hired.price : 0
    return { spent: team.spent - coachPaid, coachPaid, budget }
  }
  const source: SessionInput = { localLineup: game.teams.recruiter_one.lineup, cpuLineup: game.teams.recruiter_two.lineup, catalog, catalogVersion: 'catalog_v1', rulesVersion: 'local-match-v2', actionModel: 'action-v3', seriesFormat: 'home-away', seed: `${game.seed}:match`, budget, rosterBonus: true, formations: { local: game.teams.recruiter_one.formation ?? '4-3-3', cpu: game.teams.recruiter_two.formation ?? '4-3-3' }, benches: { local: bench('recruiter_one'), cpu: bench('recruiter_two') }, coaches: { local: coach('recruiter_one'), cpu: coach('recruiter_two') }, tactics: { version: 'tactics-v1', local: strategies.recruiter_one, cpu: strategies.recruiter_two } }
  const options: SessionOptions = { sessionId: `${game.seed}:live`, benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, acquisition: { local: ledger('recruiter_one'), cpu: ledger('recruiter_two') }, ...(attackTree === 'match-moments-v1' || attackTree === 'directed-header-v1' ? { moments: { version: 'match-moments-v1' }, ...(attackTree === 'directed-header-v1' ? { aerial: { version: 'directed-header-v1' } } : {}) } : attackTree ? { attackTree: { version: 'attack-tree-v1' } } : {}) }
  return createSession(source, { ...options, ...(halftimeRules ? { matchRules: { version: 'halftime-ovr-v1' as const } } : {}) })
}
