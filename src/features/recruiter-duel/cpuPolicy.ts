import type { Player } from '../../types/player'
import { createSeededRandom } from '../local-match/seededRandom'
import { auctionBudgetOf, currentRound, maximumSafeBid, passAuction, placeBid, positionProgress } from './auctionEngine'
import { squadTier } from '../local-match/squadQuality'
import type { AuctionTransition, RecruiterDuelGame, RecruiterTeam } from './auctionTypes'

export const CPU_STRATEGIES = ['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'] as const
export type CpuStrategy = (typeof CPU_STRATEGIES)[number]
export const CPU_DIFFICULTIES = ['EASY', 'NORMAL', 'HARD'] as const
export type CpuDifficulty = (typeof CPU_DIFFICULTIES)[number]
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
  /** Usable auction budget after the coach reserve; omitted means the classic 100M budget. */
  readonly budget?: number
  readonly difficulty?: CpuDifficulty
  /** Public standing offer on the card; only HARD reads it. */
  readonly currentBid?: number | null
}

const HARD_POINT_VALUE = .6
const HARD_IDLE_SHARE = .6
/** EASY: cards at or above this share of the peers still on offer count as elite; some are overlooked, the rest get at most a small premium. */
const EASY_ELITE_PERCENTILE = .5
const EASY_OVERLOOK = .3
const EASY_ELITE_STRETCH = 1
const EASY_BARGAIN_PERCENTILE = .35
const EASY_BARGAIN_STRETCH = 2
const HARD_PICKY = 1
const HARD_PICKY_SLOTS = 7

const profiles = {
  CONSERVATIVE: { premium: -1.8, risk: .82, jump: 1 },
  BALANCED: { premium: .2, risk: 1, jump: 2 },
  AGGRESSIVE: { premium: 2.2, risk: 1.2, jump: 3 },
} as const

/** Fixed for the round: no current bid is an input to the private valuation. */
export function privateValuation(context: CpuPublicContext, strategy: CpuStrategy): number {
  const { player, team } = context
  const open = (position: Player['position']) => positionProgress(team, position).remaining
  if (!open(player.position)) return 0
  const profile = profiles[strategy]
  const roleAttribute = player.position === 'ARQ' || player.position === 'DEF' ? player.def_rating : player.position === 'DEL' ? player.att_rating : (player.men_rating + player.att_rating) / 2
  const quality = ((player.overall_rating - 83) * .13 + (roleAttribute - 80) * .06 + (player.phy_rating + player.men_rating - 160) * .025)
  const difficulty = context.difficulty ?? 'NORMAL'
  const random = createSeededRandom(`${context.seed}:cpu:${strategy}:${context.roundIndex}:${player.id}`)
  const preference = (random() - .5) * (difficulty === 'HARD' ? 1 : difficulty === 'EASY' ? 8 : 5)
  const need = open(player.position) / positionProgress(team, player.position).capacity
  // Reserve using the published catalogue, never the unrevealed 22-player order.
  const unavailable = new Set([...context.acquiredIds, player.id])
  let reserve = 0
  for (const position of ['ARQ', 'DEF', 'MED', 'DEL'] as const) {
    const missing = open(position) - (position === player.position ? 1 : 0)
    const cheapest = context.publicCatalog.filter((candidate) => candidate.position === position && !unavailable.has(candidate.id)).sort((a, b) => a.price - b.price).slice(0, missing)
    if (cheapest.length !== missing) return 0
    reserve += cheapest.reduce((sum, candidate) => sum + candidate.price, 0)
  }
  const budget = context.budget ?? 100
  const budgetCap = budget - team.spent - reserve
  const slotsLeft = (['ARQ', 'DEF', 'MED', 'DEL'] as const).reduce((total, position) => total + open(position), 0)
  const opportunityCap = (budget - team.spent) / Math.max(1, slotsLeft) * profile.risk + Math.max(0, quality) + 2
  const availablePeers = context.publicCatalog.filter((candidate) => candidate.position === player.position && !unavailable.has(candidate.id))
  const strongerPeers = availablePeers.filter((candidate) => candidate.overall_rating >= player.overall_rating).length
  const percentile = availablePeers.length ? availablePeers.filter((p) => p.overall_rating < player.overall_rating).length / availablePeers.length : 0
  const comparativeValue = difficulty === 'HARD' ? Math.max(0, percentile - .45) * 7 : 0
  const scouting = comparativeValue + (difficulty === 'HARD' ? Math.max(0, quality) * .6 + (squadTier(player) === 'S+' ? 1.5 : 0) + (strongerPeers < open(player.position) ? 1 : 0) : difficulty === 'EASY' ? -1.5 : 0)
  if (difficulty === 'HARD') {
    // Quality against the public pool still on offer at this position; the CPU lets clearly weaker cards go while it has slots to spare.
    const ratings = availablePeers.map((candidate) => candidate.overall_rating).sort((x, y) => x - y)
    const median = ratings[Math.floor(ratings.length / 2)] ?? player.overall_rating
    const gain = player.overall_rating - median
    if (gain < -HARD_PICKY && slotsLeft > HARD_PICKY_SLOTS) return 0
    const perSlot = budgetCap / Math.max(1, slotsLeft)
    // Money not spent is worth nothing: the surplus per open slot keeps growing the cap while slots run out.
    const hard = player.price + quality + profile.premium + preference + need + Math.max(0, gain) * perSlot * HARD_POINT_VALUE * profile.risk + (gain > -1 ? perSlot * HARD_IDLE_SHARE : 0)
    // Denying an elite signing to the rival is worth a little more once it is already being contested.
    const contested = context.currentBid != null && gain >= 4 ? 2 : 0
    return Math.max(0, Math.floor(Math.min(budgetCap, hard + contested)))
  }
  const base = Math.max(0, Math.floor(Math.min(budgetCap, opportunityCap + scouting, player.price + quality + profile.premium + preference + need + scouting)))
  if (difficulty === 'EASY' && percentile >= EASY_ELITE_PERCENTILE) {
    // The beginner CPU overlooks many of the best cards on offer and never stretches for the rest.
    const overlooked = createSeededRandom(`${context.seed}:cpu-easy:${strategy}:${context.roundIndex}:${player.id}`)() < EASY_OVERLOOK
    return overlooked ? 0 : Math.min(base, player.price + EASY_ELITE_STRETCH)
  }
  // ...and it likes bargains too much: the weaker cards of the pool are worth a little extra to it, which fills its slots with them.
  if (difficulty === 'EASY' && percentile < EASY_BARGAIN_PERCENTILE) return Math.max(base, Math.floor(Math.min(budgetCap, player.price + EASY_BARGAIN_STRETCH)))
  return base
}

export function decideCpu(context: CpuPublicContext, strategy: CpuStrategy, currentBid: number | null, technicalMaximum: number): CpuDecision {
  const maximum = privateValuation({ ...context, currentBid }, strategy)
  const minimum = currentBid === null ? context.player.price : currentBid + 1
  const pass = (reason: CpuReason): CpuDecision => ({ action: 'pass', reason, privateMaximum: maximum })
  if (positionProgress(context.team, context.player.position).remaining === 0) return pass('position_full')
  if (minimum > maximum) return pass(currentBid === null ? 'opportunity_cost' : 'private_limit')
  if (minimum > technicalMaximum) return pass('technical_limit')
  const random = createSeededRandom(`${context.seed}:cpu-offer:${strategy}:${context.roundIndex}:${minimum}`)
  const amount = Math.min(maximum, technicalMaximum, minimum + Math.floor(random() * profiles[strategy].jump))
  return { action: 'bid', amount, reason: currentBid === null ? 'opening_value' : 'competitive_value', privateMaximum: maximum }
}

/** No timer here. UI owns the configurable thinking pause. */
export function takeCpuTurn(game: RecruiterDuelGame, catalog: readonly Player[], strategy: CpuStrategy, difficulty: CpuDifficulty = 'NORMAL'): AuctionTransition {
  if (game.phase !== 'BIDDING' || game.activeParticipant !== 'recruiter_two') return { ok: false, error: 'invalid_transition' }
  const player = catalog.find((candidate) => candidate.id === currentRound(game)?.playerId)
  if (!player) return { ok: false, error: 'invalid_bid' }
  const context: CpuPublicContext = { budget: auctionBudgetOf(game), difficulty, seed: game.seed, roundIndex: game.roundIndex, player, team: game.teams.recruiter_two, publicCatalog: catalog, acquiredIds: Object.values(game.teams).flatMap((team) => Object.values(team.lineup).filter((id): id is string => id !== null)) }
  const decision = decideCpu(context, strategy, game.currentBid?.amount ?? null, maximumSafeBid(game, 'recruiter_two', catalog))
  const audited: RecruiterDuelGame = { ...game, record: [...game.record, { type: 'cpu_decision', round: game.roundIndex, playerId: player.id, strategy, difficulty, ...decision }] }
  return decision.action === 'bid' ? placeBid(audited, 'recruiter_two', decision.amount!, catalog) : passAuction(audited, 'recruiter_two', catalog)
}
