import type { Player } from '../../../types/player'
import { defenderDuelChance } from './individualDuels'
import { formationSlots } from '../../tactics/formations'
import type { MatchEvent, MatchSide, PlayStep } from '../matchTypes'
import { crosserQuality, defenderQuality, keeperOf, keeperQuality, playContext, type PendingPlay, type PlayContext, type Sector, type StepResult } from './attackTree'

export const AERIAL_VERSION = 'directed-header-v1' as const
export const HEADER_DIRECTIONS = ['NEAR_POST', 'GOAL_CENTER', 'FAR_POST'] as const
export type HeaderDirection = typeof HEADER_DIRECTIONS[number]
export const isHeaderDirection = (v: unknown): v is HeaderDirection => HEADER_DIRECTIONS.some((d) => d === v)
/** Public sporting actors. A keeper's private intention is never part of a pending action. */
export interface AerialAction {
  readonly version: typeof AERIAL_VERSION
  readonly crosserId: string
  readonly targetId: string
  readonly defenderId: string
  readonly sector: Sector
}
export interface AerialEvent extends AerialAction {
  readonly direction?: HeaderDirection
  /** Only revealed after the human submitted the header direction. */
  readonly keeperDirection?: HeaderDirection
}
export interface AerialState { readonly version: typeof AERIAL_VERSION; keeperPlan: HeaderDirection | null }
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
/** Derived aerial estimate, not a verified heading/jumping statistic. All four available attacking ratings participate. */
export const aerialQuality = (p: Player) => .35 * p.att_rating + .30 * p.phy_rating + .20 * p.men_rating + .15 * p.overall_rating
export const deliveryChance = (crosser: Player, defender: Player, edge: number) => clamp(.83 + (crosserQuality(crosser) - defenderQuality(defender)) * .004 + edge, .40, .94)
export const aerialDuelChance = (target: Player, defender: Player, edge: number) => clamp(.76 + (aerialQuality(target) - defenderQuality(defender)) * .007 + edge * .6, .25, .92)
/** The choice trades precision for a harder save. Keeper intention is sampled BEFORE the choice, never chosen to defeat it. */
export function directedChances(target: Player, defender: Player, keeper: Player, direction: HeaderDirection, keeperPlan: HeaderDirection, edge: number) {
  const q = aerialQuality(target); const d = defenderQuality(defender)
  const placement = clamp((target.men_rating - target.phy_rating) * .003, -.08, .08)
  const precision = direction === 'GOAL_CENTER' ? .86 : direction === 'NEAR_POST' ? .78 - placement : .70 + placement
  const difficulty = direction === 'GOAL_CENTER' ? .32 : direction === 'NEAR_POST' ? .42 : .53
  return {
    block: clamp(.12 + (d - q) * .004 - edge * .4, .04, .30),
    onTarget: clamp(precision + (q - 80) * .004 - (d - 80) * .0015 + edge * .4, .40, .95),
    goal: clamp(difficulty + (q - 80) * .005 - (keeperQuality(keeper) - 80) * .005 - (d - 80) * .001 + edge * .4 + (direction === keeperPlan ? -.16 : .05), .08, .68),
  }
}

/** Near/far are relative to the incoming wing, in the attacker's orientation. Both pitch directions mirror correctly. */
export function headerGoalPoint(sector: Sector, direction: HeaderDirection, attackSide: MatchSide = 'local') {
  const nearY = (sector === 'LEFT') === (attackSide === 'local') ? .43 : .57
  return { x: attackSide === 'local' ? .985 : .015, y: direction === 'GOAL_CENTER' ? .5 : direction === 'NEAR_POST' ? nearY : 1 - nearY }
}
const event = (ctx: PlayContext, action: AerialEvent, side: MatchSide, type: MatchEvent['type'], step: PlayStep, playerId: string): MatchEvent => ({ minute: ctx.minute, side, type, step, playerId, aerial: action })

/** Only delivery/duel draws happen here. A successful return contains no header result or outcome draw. */
export function sendDirectedCross(ctx: PlayContext, play: PendingPlay, random: () => number): StepResult & { readonly keeperPlan: HeaderDirection | null } {
  const option = play.options.find((o) => o.choice === 'CROSS' && o.available)
  const crosser = ctx.catalog.find((p) => p.id === play.receiverId)
  const target = ctx.catalog.find((p) => p.id === option?.playerId)
  const defender = ctx.catalog.find((p) => p.id === option?.rivalId)
  // Recheck the actual formation/lineup, not just an old option or the player's generic position.
  const validTarget = target && formationSlots(ctx.local.formation).some((s) => s.position === 'DEL' && ctx.local.lineup[s.id] === target.id) && target.id !== crosser?.id
  if (!crosser || !target || !defender || !validTarget || !play.sector) throw new Error('invalid_aerial_target')
  const action: AerialAction = { version: AERIAL_VERSION, crosserId: crosser.id, targetId: target.id, defenderId: defender.id, sector: play.sector }
  const events = [event(ctx, action, 'local', 'pass', 'AERIAL_CROSS', crosser.id)]
  const edge = playContext(ctx)
  if (random() >= deliveryChance(crosser, defender, edge)) return { events: [...events, event(ctx, action, 'cpu', 'recovery', 'AERIAL_CLEAR', defender.id)], next: null, keeperPlan: null }
  events.push(event(ctx, action, 'local', 'pass', 'AERIAL_CONTEST', target.id))
  const winDuel = ctx.duels ? 1 - defenderDuelChance(target.overall_rating, defender.overall_rating) : aerialDuelChance(target, defender, edge)
  if (random() >= winDuel) return { events: [...events, event(ctx, action, 'cpu', 'recovery', 'AERIAL_CLEAR', defender.id)], next: null, keeperPlan: null }
  events.push(event(ctx, action, 'local', 'pass', 'AERIAL_WON', target.id))
  const keeperPlan = HEADER_DIRECTIONS[Math.floor(random() * HEADER_DIRECTIONS.length)]
  return { events, keeperPlan, next: { id: play.id, node: 'HEADER', protagonistId: play.protagonistId, receiverId: target.id, sector: play.sector, aerial: action,
    options: HEADER_DIRECTIONS.map((choice) => ({ choice, available: true, playerId: target.id, rivalId: defender.id })) } }
}

/** Header outcomes are drawn only after the pending HEADER choice is accepted. */
export function resolveDirectedHeader(ctx: PlayContext, play: PendingPlay, direction: HeaderDirection, keeperPlan: HeaderDirection, random: () => number): StepResult {
  const action = play.aerial!
  const target = ctx.catalog.find((p) => p.id === action.targetId)!
  const defender = ctx.catalog.find((p) => p.id === action.defenderId)!
  const keeper = keeperOf(ctx.cpu, ctx.catalog)!
  const chances = directedChances(target, defender, keeper, direction, keeperPlan, playContext(ctx))
  const aimed = { ...action, direction }
  const reacted = { ...aimed, keeperDirection: keeperPlan }
  const events = [event(ctx, aimed, 'local', 'pass', 'DIRECTED_HEADER_CONTACT', target.id)]
  if (random() < chances.block) return { events: [...events, event(ctx, reacted, 'cpu', 'recovery', 'DIRECTED_HEADER_BLOCK', defender.id)], next: null }
  events.push(event(ctx, reacted, 'local', 'pass', 'DIRECTED_HEADER_FLIGHT', target.id))
  if (random() >= chances.onTarget) events.push(event(ctx, reacted, 'local', 'shot', random() < .48 ? 'DIRECTED_HEADER_OVER' : 'DIRECTED_HEADER_WIDE', target.id))
  else if (random() < chances.goal) events.push(event(ctx, reacted, 'local', 'goal', 'DIRECTED_HEADER_GOAL', target.id))
  else events.push(event(ctx, reacted, 'cpu', 'save', 'DIRECTED_HEADER_SAVE', keeper.id))
  return { events, next: null }
}
