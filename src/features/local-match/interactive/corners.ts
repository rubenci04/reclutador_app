import type { Player } from '../../../types/player'
import type { MatchEvent, MatchSide, PlayStep } from '../matchTypes'
import { formationSlots } from '../../tactics/formations'
import { defenderDuelChance } from './individualDuels'
import { directedChances, HEADER_DIRECTIONS, type HeaderDirection } from './directedHeader'
import { blockChance, crosserQuality, defenderQuality, keeperOf, rivalDefenderFor, passChance, playContext, scoringChance, shooterQuality, shotOnTargetChance, type PendingPlay, type PlayChoice, type PlayContext, type Sector, type StepResult } from './attackTree'

export const CORNERS_VERSION = 'corners-v1' as const
export const CORNER_DELIVERIES = ['CORNER_NEAR', 'CORNER_FAR', 'CORNER_SHORT'] as const
export type CornerDelivery = typeof CORNER_DELIVERIES[number]
export type CornerMarking = 'MAN_MARK' | 'ZONE'
export type CornerCause = 'DEFLECTION' | 'CLEARANCE' | 'SAVE'
export interface CornerAction {
  readonly version: typeof CORNERS_VERSION
  readonly id: string
  readonly awardedTo: MatchSide
  readonly cause: CornerCause
  readonly concededById: string
  readonly kickerId: string
  readonly targetId: string
  readonly defenderId: string
  readonly farDefenderId: string
  readonly keeperId: string
  readonly receiverId: string
  readonly sector: Sector
}
export interface CornerEvent extends CornerAction {
  readonly delivery?: CornerDelivery
  readonly marking?: CornerMarking
  readonly direction?: HeaderDirection
  readonly keeperDirection?: HeaderDirection
  readonly markerId?: string
}
/** Intentions only, never a shot result; sampled before the defending user's choice. */
export interface CornerPlan { readonly delivery: CornerDelivery; readonly direction: HeaderDirection; readonly keeper: HeaderDirection }
export interface CornerState { readonly version: typeof CORNERS_VERSION; plan: CornerPlan | null; families: ('OPEN_PLAY' | 'CORNER')[] }
export const CORNER_STEPS = ['CORNER_DEFLECTED', 'CORNER_CONCEDED_CLEAR', 'CORNER_CONCEDED_SAVE', 'CORNER_AWARDED', 'CORNER_RUNUP', 'CORNER_DELIVERY', 'CORNER_CONTEST', 'CORNER_WON', 'CORNER_ZONE', 'CORNER_CONTACT', 'CORNER_FLIGHT', 'CORNER_CLEAR', 'CORNER_EXIT', 'CORNER_BLOCK', 'CORNER_WIDE', 'CORNER_OVER', 'CORNER_SAVE', 'CORNER_GOAL', 'CORNER_SHORT_PASS', 'CORNER_SHORT_ADVANCE', 'CORNER_SHOT'] as const
export type CornerStep = typeof CORNER_STEPS[number]
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
export const otherSide = (side: MatchSide): MatchSide => side === 'local' ? 'cpu' : 'local'
/** Selection is private policy, not an extra sporting opportunity or a forced corner per game. */
export const cornerFamilyChance = (previous: CornerState['families'][number] | undefined) => previous === 'CORNER' ? .15 : .45
export const cornerPlan = (values: readonly number[]): CornerPlan => ({ delivery: CORNER_DELIVERIES[Math.min(2, Math.floor(values[2] * 3))], direction: HEADER_DIRECTIONS[Math.min(2, Math.floor(values[3] * 3))], keeper: HEADER_DIRECTIONS[Math.min(2, Math.floor(values[4] * 3))] })
export function cornerContext(ctx: PlayContext, side: MatchSide): PlayContext {
  return side === 'local' ? ctx : { ...ctx, local: ctx.cpu, cpu: ctx.local, effective: { local: ctx.effective.cpu, cpu: ctx.effective.local }, strategy: { local: ctx.strategy.cpu, cpu: ctx.strategy.local } }
}
const player = (ctx: PlayContext, id: string) => ctx.catalog.find((p) => p.id === id)!
export const cornerDeliveryChance = (kicker: Player, defender: Player, edge: number, delivery: CornerDelivery) => clamp(.79 + (crosserQuality(kicker) - defenderQuality(defender)) * .004 + edge + (delivery === 'CORNER_NEAR' ? .04 : -.04), .35, .94)
/** Zone is collective coverage, not a second OVR duel. Failed coverage leaves the target free. */
export const zoneCoverageChance = (defender: Player, kicker: Player, edge: number, delivery: CornerDelivery) => clamp(.44 + (.6 * defender.def_rating + .4 * defender.men_rating - crosserQuality(kicker)) * .006 + edge * .5 + (delivery === 'CORNER_SHORT' ? .10 : delivery === 'CORNER_NEAR' ? .04 : -.06), .18, .76)
const event = (ctx: PlayContext, action: CornerEvent, side: MatchSide, type: MatchEvent['type'], step: CornerStep, id: string): MatchEvent => ({ minute: ctx.minute, side, type, step, playerId: id, corner: action })

/** A genuine deflection/clearance/parried save is confirmed before the corner is offered. Exactly five setup draws. */
export function planCorner(ctx: PlayContext, side: MatchSide, id: string, random: () => number, excluded: readonly string[] = []): { play: PendingPlay; protagonist: Player; events: readonly MatchEvent[]; plan: CornerPlan } | null {
  const onPitch = (who: MatchSide) => formationSlots(ctx[who].formation).flatMap((slot) => { const p = ctx.catalog.find((p) => p.id === ctx[who].lineup[slot.id]); return p ? [{ slot, p }] : [] })
  const own = onPitch(side), rival = onPitch(otherSide(side))
  const candidates = own.filter(({ p }) => p.position === 'MED' || p.position === 'DEL').sort((a, b) => crosserQuality(b.p) - crosserQuality(a.p) || a.p.id.localeCompare(b.p.id))
  const kicker = candidates.find(({ p }) => !excluded.includes(p.id))?.p ?? candidates[0]?.p
  const target = own.filter(({ p }) => p.position === 'DEL' && p.id !== kicker?.id).sort((a, b) => b.p.att_rating - a.p.att_rating || a.p.id.localeCompare(b.p.id))[0]?.p
  const receiver = candidates.find(({ p }) => p.id !== kicker?.id && p.id !== target?.id)?.p
  const defender = rival.filter(({ p }) => p.position === 'DEF').sort((a, b) => defenderQuality(b.p) - defenderQuality(a.p) || a.p.id.localeCompare(b.p.id))[0]?.p
  const keeper = keeperOf(ctx[otherSide(side)], ctx.catalog)
  if (!kicker || !target || !receiver || !defender || !keeper) return null
  const values = Array.from({ length: 5 }, random)
  const cause: CornerCause = values[0] < 1 / 3 ? 'DEFLECTION' : values[0] < 2 / 3 ? 'CLEARANCE' : 'SAVE'
  const sector = values[1] < .5 ? 'LEFT' : 'RIGHT'
  const nearMarker = rivalDefenderFor(sector === 'LEFT' ? 35 : 65, ctx[otherSide(side)], ctx.catalog) ?? defender
  const farMarker = rivalDefenderFor(sector === 'LEFT' ? 65 : 35, ctx[otherSide(side)], ctx.catalog) ?? defender
  const a: CornerAction = { version: CORNERS_VERSION, id, awardedTo: side, cause, concededById: cause === 'SAVE' ? keeper.id : nearMarker.id, kickerId: kicker.id, targetId: target.id, defenderId: nearMarker.id, farDefenderId: farMarker.id, keeperId: keeper.id, receiverId: receiver.id, sector }
  const precursor = cause === 'SAVE' ? event(ctx, a, otherSide(side), 'save', 'CORNER_CONCEDED_SAVE', keeper.id) : cause === 'CLEARANCE' ? event(ctx, a, otherSide(side), 'recovery', 'CORNER_CONCEDED_CLEAR', nearMarker.id) : event(ctx, a, side, 'shot', 'CORNER_DEFLECTED', target.id)
  return { protagonist: side === 'local' ? kicker : target, plan: cornerPlan(values), events: [precursor, event(ctx, a, side, 'corner', 'CORNER_AWARDED', kicker.id)], play: { id, node: side === 'local' ? 'CORNER_ATTACK' : 'CORNER_DEFEND', protagonistId: side === 'local' ? kicker.id : nearMarker.id, receiverId: null, sector: a.sector, corner: a,
    options: side === 'local' ? CORNER_DELIVERIES.map((choice) => ({ choice, available: true, playerId: choice === 'CORNER_SHORT' ? receiver.id : target.id, rivalId: choice === 'CORNER_FAR' ? farMarker.id : nearMarker.id })) : (['MAN_MARK', 'ZONE'] as const).map((choice) => ({ choice, available: true, playerId: nearMarker.id, rivalId: target.id })) } }
}

function clearCorner(ctx: PlayContext, a: CornerEvent, exit: boolean): MatchEvent[] {
  const side = otherSide(a.awardedTo)
  return [event(ctx, a, side, 'recovery', 'CORNER_CLEAR', a.markerId ?? a.defenderId), ...(exit ? [event(ctx, a, side, 'pass', 'CORNER_EXIT', a.markerId ?? a.defenderId)] : [])]
}
function finishCorner(ctx: PlayContext, a: CornerEvent, plan: CornerPlan, rolls: readonly number[], short: boolean): readonly MatchEvent[] {
  const oriented = cornerContext(ctx, a.awardedTo), edge = playContext(oriented)
  const target = player(ctx, short ? a.receiverId : a.targetId), defender = player(ctx, a.markerId ?? a.defenderId), keeper = player(ctx, a.keeperId)
  const chances = directedChances(target, defender, keeper, a.direction ?? plan.direction, plan.keeper, edge)
  const action: CornerEvent = { ...a, direction: a.direction ?? plan.direction }
  const reacted: CornerEvent = { ...action, keeperDirection: plan.keeper }
  const events = [event(ctx, action, a.awardedTo, 'pass', short ? 'CORNER_SHOT' : 'CORNER_CONTACT', target.id)]
  if (rolls[0] < (short ? blockChance(target, defender, edge) : chances.block)) return [...events, event(ctx, reacted, otherSide(a.awardedTo), 'recovery', 'CORNER_BLOCK', defender.id)]
  events.push(event(ctx, reacted, a.awardedTo, 'pass', 'CORNER_FLIGHT', target.id))
  if (rolls[1] >= (short ? shotOnTargetChance(target) : chances.onTarget)) events.push(event(ctx, reacted, a.awardedTo, 'shot', rolls[3] < .48 ? 'CORNER_OVER' : 'CORNER_WIDE', target.id))
  else if (rolls[2] < (short ? scoringChance(shooterQuality(target), keeper, edge) : chances.goal)) events.push(event(ctx, reacted, a.awardedTo, 'goal', 'CORNER_GOAL', target.id))
  else events.push(event(ctx, reacted, otherSide(a.awardedTo), 'save', 'CORNER_SAVE', keeper.id))
  return events
}

/** Eight draws per accepted execution/marking; four only AFTER accepting header direction. Unused draws are discarded. */
export function resolveCorner(ctx: PlayContext, play: PendingPlay, choice: PlayChoice, plan: CornerPlan, random: () => number): StepResult {
  const a = play.corner!
  if (play.node === 'CORNER_HEADER') {
    if (!HEADER_DIRECTIONS.includes(choice as HeaderDirection)) throw new Error('invalid_corner_header')
    return { events: finishCorner(ctx, { ...a, delivery: a.delivery, direction: choice as HeaderDirection }, plan, Array.from({ length: 4 }, random), false), next: null }
  }
  const rolls = Array.from({ length: 8 }, random)
  const oriented = cornerContext(ctx, a.awardedTo), edge = playContext(oriented)
  const delivery = play.node === 'CORNER_ATTACK' ? choice as CornerDelivery : plan.delivery
  const action: CornerEvent = { ...a, delivery, markerId: delivery === 'CORNER_FAR' ? a.farDefenderId : a.defenderId, ...(play.node === 'CORNER_DEFEND' ? { marking: choice as CornerMarking } : {}) }
  const kicker = player(ctx, a.kickerId), defender = player(ctx, action.markerId!), target = player(ctx, a.targetId), receiver = player(ctx, a.receiverId)
  const events = [event(ctx, action, a.awardedTo, 'corner', 'CORNER_RUNUP', kicker.id)]
  if (delivery === 'CORNER_SHORT') {
    if (rolls[0] >= passChance(kicker, receiver, defender, edge, { local: 'NEUTRAL', cpu: 'NEUTRAL' })) return { events: [...events, ...clearCorner(ctx, action, rolls[7] < .45)], next: null }
    events.push(event(ctx, action, a.awardedTo, 'pass', 'CORNER_SHORT_PASS', receiver.id))
  } else {
    events.push(event(ctx, action, a.awardedTo, 'pass', 'CORNER_DELIVERY', kicker.id))
    if (rolls[0] >= cornerDeliveryChance(kicker, defender, edge, delivery)) return { events: [...events, ...clearCorner(ctx, action, rolls[7] < .45)], next: null }
  }
  const duelTarget = delivery === 'CORNER_SHORT' ? receiver : target
  const recovered = choice === 'ZONE' ? rolls[1] < zoneCoverageChance(defender, kicker, edge, delivery) : rolls[1] < defenderDuelChance(duelTarget.overall_rating, defender.overall_rating)
  events.push(event(ctx, action, a.awardedTo, 'corner', choice === 'ZONE' ? 'CORNER_ZONE' : 'CORNER_CONTEST', duelTarget.id))
  if (recovered) return { events: [...events, ...clearCorner(ctx, action, rolls[7] < .45)], next: null }
  if (delivery === 'CORNER_SHORT') {
    events.push(event(ctx, action, a.awardedTo, 'pass', 'CORNER_SHORT_ADVANCE', receiver.id))
    return { events: [...events, ...finishCorner(ctx, action, plan, rolls.slice(2, 6), true)], next: null }
  }
  events.push(event(ctx, action, a.awardedTo, 'corner', 'CORNER_WON', target.id))
  if (a.awardedTo === 'cpu') return { events: [...events, ...finishCorner(ctx, action, plan, rolls.slice(2, 6), false)], next: null }
  return { events, next: { ...play, node: 'CORNER_HEADER', protagonistId: target.id, receiverId: target.id, corner: action, options: HEADER_DIRECTIONS.map((choice) => ({ choice, available: true, playerId: target.id, rivalId: defender.id })) } }
}

export const cornerStep = (step: PlayStep | undefined): step is CornerStep => CORNER_STEPS.includes(step as CornerStep)
