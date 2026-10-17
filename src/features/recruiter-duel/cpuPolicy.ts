import { FORMATION_QUOTAS } from '../../data/catalogRules'
import type { Player } from '../../types/player'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { createSeededRandom } from '../local-match/seededRandom'
import { currentRound, maximumSafeBid, passAuction, placeBid } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame, RecruiterTeam } from './auctionTypes'

export const CPU_STRATEGIES = ['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'] as const
export type CpuStrategy = (typeof CPU_STRATEGIES)[number]
export type CpuReason = 'position_full' | 'private_limit' | 'opportunity_cost' | 'technical_limit' | 'opening_value' | 'competitive_value'
export interface CpuDecision { readonly action: 'bid' | 'pass'; readonly amount?: number; readonly reason: CpuReason; readonly privateMaximum: number }

/** Deliberately cannot receive future rounds, the rival's strategy, or a hidden valuation. */
export interface CpuPublicContext {
  readonly seed: string
  readonly roundIndex: number
  readonly player: Player
  readonly team: RecruiterTeam
  readonly publicCatalog: readonly Player[]
  readonly acquiredIds: readonly string[]
}

const profiles = {
  CONSERVATIVE: { premium: -1.8, risk: .82, jump: 1 },
  BALANCED: { premium: .2, risk: 1, jump: 2 },
  AGGRESSIVE: { premium: 2.2, risk: 1.2, jump: 3 },
} as const

/** Fixed for the round: no current bid is an input to the private valuation. */
export function privateValuation(context: CpuPublicContext, strategy: CpuStrategy): number {
  const { player, team } = context
  const open = (position: Player['position']) => DRAFT_SLOTS.filter((slot) => slot.position === position && !team.lineup[slot.id]).length
  if (!open(player.position)) return 0
  const profile = profiles[strategy]
  const roleAttribute = player.position === 'ARQ' || player.position === 'DEF' ? player.def_rating : player.position === 'DEL' ? player.att_rating : (player.men_rating + player.att_rating) / 2
  const quality = ((player.overall_rating - 83) * .13 + (roleAttribute - 80) * .06 + (player.phy_rating + player.men_rating - 160) * .025)
  const random = createSeededRandom(`${context.seed}:cpu:${strategy}:${context.roundIndex}:${player.id}`)
  const preference = (random() - .5) * 5
  const need = open(player.position) / FORMATION_QUOTAS[player.position]
  // Reserve using the published catalogue, never the unrevealed 22-player order.
  const unavailable = new Set([...context.acquiredIds, player.id])
  let reserve = 0
  for (const position of ['ARQ', 'DEF', 'MED', 'DEL'] as const) {
    const missing = open(position) - (position === player.position ? 1 : 0)
    const cheapest = context.publicCatalog.filter((candidate) => candidate.position === position && !unavailable.has(candidate.id)).sort((a, b) => a.price - b.price).slice(0, missing)
    if (cheapest.length !== missing) return 0
    reserve += cheapest.reduce((sum, candidate) => sum + candidate.price, 0)
  }
  const budgetCap = 100 - team.spent - reserve
  const slotsLeft = Object.values(team.lineup).filter((id) => !id).length
  const opportunityCap = (100 - team.spent) / Math.max(1, slotsLeft) * profile.risk + Math.max(0, quality) + 2
  return Math.max(0, Math.floor(Math.min(budgetCap, opportunityCap, player.price + quality + profile.premium + preference + need)))
}

export function decideCpu(context: CpuPublicContext, strategy: CpuStrategy, currentBid: number | null, technicalMaximum: number): CpuDecision {
  const maximum = privateValuation(context, strategy)
  const minimum = currentBid === null ? context.player.price : currentBid + 1
  const pass = (reason: CpuReason): CpuDecision => ({ action: 'pass', reason, privateMaximum: maximum })
  if (!DRAFT_SLOTS.some((slot) => slot.position === context.player.position && !context.team.lineup[slot.id])) return pass('position_full')
  if (minimum > maximum) return pass(currentBid === null ? 'opportunity_cost' : 'private_limit')
  if (minimum > technicalMaximum) return pass('technical_limit')
  const random = createSeededRandom(`${context.seed}:cpu-offer:${strategy}:${context.roundIndex}:${minimum}`)
  const amount = Math.min(maximum, technicalMaximum, minimum + Math.floor(random() * profiles[strategy].jump))
  return { action: 'bid', amount, reason: currentBid === null ? 'opening_value' : 'competitive_value', privateMaximum: maximum }
}

/** No timer here. UI owns the configurable thinking pause. */
export function takeCpuTurn(game: RecruiterDuelGame, catalog: readonly Player[], strategy: CpuStrategy): AuctionTransition {
  if (game.phase !== 'BIDDING' || game.activeParticipant !== 'recruiter_two') return { ok: false, error: 'invalid_transition' }
  const player = catalog.find((candidate) => candidate.id === currentRound(game)?.playerId)
  if (!player) return { ok: false, error: 'invalid_bid' }
  const context: CpuPublicContext = { seed: game.seed, roundIndex: game.roundIndex, player, team: game.teams.recruiter_two, publicCatalog: catalog, acquiredIds: Object.values(game.teams).flatMap((team) => Object.values(team.lineup).filter((id): id is string => id !== null)) }
  const decision = decideCpu(context, strategy, game.currentBid?.amount ?? null, maximumSafeBid(game, 'recruiter_two', catalog))
  const audited: RecruiterDuelGame = { ...game, record: [...game.record, { type: 'cpu_decision', round: game.roundIndex, strategy, ...decision }] }
  return decision.action === 'bid' ? placeBid(audited, 'recruiter_two', decision.amount!, catalog) : passAuction(audited, 'recruiter_two', catalog)
}
