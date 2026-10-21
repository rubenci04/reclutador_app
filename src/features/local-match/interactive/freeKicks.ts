import type { Player } from '../../../types/player'
import type { MatchEvent, MatchSide } from '../matchTypes'
import { formationSlots } from '../../tactics/formations'
import { defenderDuelChance } from './individualDuels'
import { HEADER_DIRECTIONS, directedChances, type HeaderDirection } from './directedHeader'
import { cornerContext, otherSide, zoneCoverageChance } from './corners'
import { blockChance, crosserQuality, defenderQuality, keeperQuality, keeperOf, passChance, playContext, scoringChance, shooterQuality, shotOnTargetChance, type PendingPlay, type PlayChoice, type PlayContext, type StepResult } from './attackTree'

export const FREE_KICKS_VERSION = 'free-kicks-v1' as const
export const FREE_KICK_STEPS = ['FK_CONTACT_LEGAL', 'FK_CONTACT_BEATEN', 'FK_FOUL', 'FK_AWARDED', 'FK_SETUP', 'FK_RUNUP', 'FK_WALL', 'FK_SHOT', 'FK_CROSS', 'FK_SHORT', 'FK_ADVANCE', 'FK_CONTEST', 'FK_WON', 'FK_HEADER_CONTACT', 'FK_FLIGHT', 'FK_BLOCK', 'FK_WIDE', 'FK_OVER', 'FK_SAVE', 'FK_GOAL', 'FK_CLEAR'] as const
export type FreeKickStep = typeof FREE_KICK_STEPS[number]
export type FreeKickZone = 'CENTRAL_OUTSIDE' | 'WIDE_OUTSIDE' | 'DEEP_OUTSIDE'
export type WallChoice = 'WALL_JUMP' | 'WALL_HOLD'
export type FreeKickFamily = 'OPEN_PLAY' | 'CORNER' | 'FREE_KICK'
export interface FoulRecord {
  readonly version: typeof FREE_KICKS_VERSION
  readonly id: string
  readonly awardedTo: MatchSide
  readonly offenderId: string
  readonly victimId: string
  readonly attempt: 'TACKLE' | 'PRESSURE'
  /** Symbolic zone, never measured tracking coordinates. All three are outside the penalty area. */
  readonly zone: FreeKickZone
  readonly kickerId: string
  readonly targetId: string
  readonly receiverId: string
  readonly defenderId: string
  readonly wallIds: readonly string[]
  readonly keeperId: string
  /** Reserved consequence slot: this version awards only a free kick. */
  readonly consequence: 'FREE_KICK_ONLY'
}
export interface FreeKickEvent extends FoulRecord {
  readonly execution?: 'DIRECT' | 'CROSS' | 'SHORT' | 'HEADER'
  readonly wall?: WallChoice
  readonly marking?: 'MAN_MARK' | 'ZONE'
  readonly direction?: HeaderDirection
  readonly keeperDirection?: HeaderDirection
  readonly trajectory?: 'HIGH' | 'LOW'
}
export interface FreeKickPlan { readonly direction: HeaderDirection; readonly keeper: HeaderDirection; readonly trajectory: 'HIGH' | 'LOW'; readonly indirect: 'FK_CROSS' | 'FK_SHORT' }
export interface FreeKickState { readonly version: typeof FREE_KICKS_VERSION; plan: FreeKickPlan | null; families: FreeKickFamily[] }
export const FK_DIRECT = ['FK_LEFT', 'FK_CENTER', 'FK_RIGHT'] as const
export const FK_INDIRECT = ['FK_CROSS', 'FK_SHORT'] as const
export const FK_NODES = ['FK_ATTACK', 'FK_DEFEND', 'FK_HEADER'] as const
export const FK_CHOICES = [...FK_DIRECT, ...FK_INDIRECT, 'WALL_JUMP', 'WALL_HOLD'] as const
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const directEligible = (zone: FreeKickZone) => zone === 'CENTRAL_OUTSIDE'
/** Contact selection is less frequent immediately after this family; the director's cap is unchanged. */
export const contactEligibleChance = (previous?: FreeKickFamily) => previous === 'FREE_KICK' ? .25 : .85
export const foulChance = (attacker: Player, defender: Player, attempt: FoulRecord['attempt'], edge: number) => clamp(.64 + (attacker.phy_rating - defender.phy_rating) * .003 + (80 - defender.def_rating) * .003 + (80 - defender.men_rating) * .002 + (attempt === 'TACKLE' ? .08 : -.08) + edge * .5, .18, .86)
const actor = (ctx: PlayContext, id: string) => ctx.catalog.find((p) => p.id === id)!
const event = (ctx: PlayContext, a: FreeKickEvent, step: FreeKickStep, type: MatchEvent['type'], side: MatchSide, playerId: string): MatchEvent => ({ minute: ctx.minute, side, type, step, playerId, freeKick: a })
/** Eight setup draws. Only a FAILED individual challenge can become a foul. Intentions are fixed here, never results. */
export function planFreeKick(ctx: PlayContext, side: MatchSide, id: string, random: () => number) {
  const placed = (who: MatchSide) => formationSlots(ctx[who].formation).flatMap((slot) => { const p = ctx.catalog.find((p) => p.id === ctx[who].lineup[slot.id]); return p ? [p] : [] })
  const own = placed(side), rival = placed(otherSide(side))
  const attackers = own.filter((p) => p.position === 'MED' || p.position === 'DEL').sort((a, b) => crosserQuality(b) - crosserQuality(a) || a.id.localeCompare(b.id))
  const kicker = attackers.find((p) => own.some((q) => q.position === 'DEL' && q.id !== p.id)), victim = attackers.find((p) => p.id !== kicker?.id), target = own.find((p) => p.position === 'DEL' && p.id !== kicker?.id), receiver = attackers.find((p) => p.id !== kicker?.id && p.id !== target?.id)
  const wall = rival.filter((p) => p.position === 'DEF').sort((a, b) => defenderQuality(b) - defenderQuality(a) || a.id.localeCompare(b.id)).slice(0, 3), defender = wall[0], keeper = keeperOf(ctx[otherSide(side)], ctx.catalog)
  if (!kicker || !victim || !target || !receiver || !defender || !keeper || wall.length < 2) return null
  const r = Array.from({ length: 8 }, random), attempt = r[0] < .5 ? 'TACKLE' : 'PRESSURE'
  const a: FoulRecord = { version: FREE_KICKS_VERSION, id, awardedTo: side, offenderId: defender.id, victimId: victim.id, attempt, zone: r[3] < .5 ? 'CENTRAL_OUTSIDE' : r[3] < .8 ? 'WIDE_OUTSIDE' : 'DEEP_OUTSIDE', kickerId: kicker.id, targetId: target.id, receiverId: receiver.id, defenderId: defender.id, wallIds: wall.map((p) => p.id), keeperId: keeper.id, consequence: 'FREE_KICK_ONLY' }
  const won = r[1] < defenderDuelChance(victim.overall_rating, defender.overall_rating)
  const foul = !won && r[2] < foulChance(victim, defender, attempt, playContext(cornerContext(ctx, side)))
  const events = [event(ctx, a, foul ? 'FK_FOUL' : won ? 'FK_CONTACT_LEGAL' : 'FK_CONTACT_BEATEN', 'pass', otherSide(side), defender.id)]
  if (!foul) return { events, play: null, plan: null }
  const plan: FreeKickPlan = { direction: HEADER_DIRECTIONS[Math.floor(r[4] * 3)], keeper: HEADER_DIRECTIONS[Math.floor(r[5] * 3)], trajectory: r[6] < .5 ? 'HIGH' : 'LOW', indirect: r[7] < .6 ? 'FK_CROSS' : 'FK_SHORT' }
  events.push(event(ctx, a, 'FK_AWARDED', 'pass', side, kicker.id), event(ctx, a, 'FK_SETUP', 'pass', side, kicker.id))
  return { events, plan, play: freeKickPending(a) }
}
export function freeKickPending(a: FreeKickEvent, header = false): PendingPlay {
  const defending = a.awardedTo === 'cpu'
  const choices: readonly PlayChoice[] = header ? HEADER_DIRECTIONS : defending ? directEligible(a.zone) ? ['WALL_JUMP', 'WALL_HOLD'] : ['MAN_MARK', 'ZONE'] : directEligible(a.zone) ? FK_DIRECT : FK_INDIRECT
  return { id: a.id, node: header ? 'FK_HEADER' : defending ? 'FK_DEFEND' : 'FK_ATTACK', protagonistId: header ? a.targetId : defending ? a.defenderId : a.kickerId, receiverId: header ? a.targetId : null, sector: 'LEFT', freeKick: a, options: choices.map((choice) => ({ choice, available: true, playerId: defending ? a.defenderId : header || choice === 'FK_CROSS' ? a.targetId : choice === 'FK_SHORT' ? a.receiverId : a.kickerId, rivalId: defending ? a.kickerId : a.defenderId })) }
}
/** Accuracy, estimated power, wall obstruction and keeper are separate from the OVR contact/marking duel. */
export function freeKickChances(kicker: Player, wall: readonly Player[], keeper: Player, direction: HeaderDirection, trajectory: FreeKickPlan['trajectory'], wallChoice: WallChoice, keeperDirection: HeaderDirection, edge: number) {
  const precision = .55 * kicker.att_rating + .30 * kicker.men_rating + .15 * kicker.overall_rating
  const power = .65 * kicker.phy_rating + .35 * kicker.att_rating
  const defense = wall.reduce((sum, p) => sum + defenderQuality(p), 0) / wall.length
  return {
    block: clamp(.24 + (defense - precision) * .004 + (trajectory === 'HIGH' ? wallChoice === 'WALL_JUMP' ? .12 : -.06 : wallChoice === 'WALL_HOLD' ? .09 : -.08) - edge * .3, .06, .58),
    onTarget: clamp((direction === 'GOAL_CENTER' ? .77 : .64) + (precision - 80) * .005 + (trajectory === 'LOW' ? .04 : -.03) + edge * .3, .30, .93),
    goal: clamp((direction === 'GOAL_CENTER' ? .22 : .36) + (precision - keeperQuality(keeper)) * .005 + (power - 80) * .002 + (direction === keeperDirection ? -.10 : .035) + edge * .4, .06, .62),
  }
}
/** Eight draws per execution; four fresh draws only after an accepted header direction. No further short-pass question. */
export function resolveFreeKick(ctx: PlayContext, play: PendingPlay, choice: PlayChoice, plan: FreeKickPlan, random: () => number): StepResult {
  const origin = play.freeKick!, side = origin.awardedTo, other = otherSide(side), edge = playContext(cornerContext(ctx, side))
  const r = Array.from({ length: play.node === 'FK_HEADER' ? 4 : 8 }, random)
  const direct = directEligible(origin.zone), defending = play.node === 'FK_DEFEND', header = play.node === 'FK_HEADER'
  const execution = header ? 'HEADER' : direct ? 'DIRECT' : (defending ? plan.indirect : choice) === 'FK_SHORT' ? 'SHORT' : 'CROSS'
  const direction = header ? choice as HeaderDirection : defending ? plan.direction : choice === 'FK_LEFT' ? 'NEAR_POST' : choice === 'FK_RIGHT' ? 'FAR_POST' : 'GOAL_CENTER'
  const a: FreeKickEvent = { ...origin, execution, ...(direct ? { wall: defending ? choice as WallChoice : 'WALL_JUMP' } : defending ? { marking: choice as 'MAN_MARK' | 'ZONE' } : {}) }
  const kicker = actor(ctx, a.kickerId), defender = actor(ctx, a.defenderId), target = actor(ctx, execution === 'SHORT' ? a.receiverId : execution === 'DIRECT' ? a.kickerId : a.targetId), keeper = actor(ctx, a.keeperId)
  const ev = (step: FreeKickStep, type: MatchEvent['type'], who = side, id = kicker.id, data = a) => event(ctx, data, step, type, who, id)
  const clear = () => ev('FK_CLEAR', 'recovery', other, defender.id)
  const events: MatchEvent[] = header ? [] : [ev('FK_RUNUP', 'pass')]
  if (!direct && !header) {
    events.push(ev(execution === 'SHORT' ? 'FK_SHORT' : 'FK_CROSS', 'pass', side, execution === 'SHORT' ? a.receiverId : a.kickerId))
    const delivered = execution === 'SHORT' ? passChance(kicker, target, defender, edge, { local: 'NEUTRAL', cpu: 'NEUTRAL' }) : clamp(.79 + (crosserQuality(kicker) - defenderQuality(defender)) * .004 + edge, .35, .94)
    if (r[0] >= delivered) return { events: [...events, clear()], next: null }
    events.push(ev('FK_CONTEST', 'pass', side, target.id))
    const recovered = choice === 'ZONE' ? r[1] < zoneCoverageChance(defender, kicker, edge, execution === 'SHORT' ? 'CORNER_SHORT' : 'CORNER_NEAR') : r[1] < defenderDuelChance(target.overall_rating, defender.overall_rating)
    if (recovered) return { events: [...events, clear()], next: null }
    events.push(ev(execution === 'SHORT' ? 'FK_ADVANCE' : 'FK_WON', 'pass', side, target.id))
    if (execution === 'CROSS' && !defending) return { events, next: freeKickPending(a, true) }
  }
  const aimed: FreeKickEvent = { ...a, direction: header ? direction : direct ? direction : plan.direction }
  const reacted: FreeKickEvent = { ...aimed, keeperDirection: plan.keeper, ...(direct ? { trajectory: plan.trajectory } : {}) }
  if (direct) events.push(ev('FK_WALL', 'pass', other, defender.id, { ...a, trajectory: plan.trajectory }))
  events.push(ev(header || execution === 'CROSS' ? 'FK_HEADER_CONTACT' : 'FK_SHOT', 'pass', side, target.id, aimed))
  const chances = direct ? freeKickChances(kicker, a.wallIds.map((id) => actor(ctx, id)), keeper, direction, plan.trajectory, a.wall!, plan.keeper, edge) : execution === 'SHORT' ? { block: blockChance(target, defender, edge), onTarget: shotOnTargetChance(target), goal: scoringChance(shooterQuality(target), keeper, edge) } : directedChances(target, defender, keeper, aimed.direction!, plan.keeper, edge)
  const rolls = header ? r : r.slice(2, 6)
  if (rolls[0] < chances.block) return { events: [...events, ev('FK_BLOCK', 'recovery', other, defender.id, reacted)], next: null }
  events.push(ev('FK_FLIGHT', 'pass', side, target.id, reacted))
  if (rolls[1] >= chances.onTarget) events.push(ev(rolls[3] < .48 ? 'FK_OVER' : 'FK_WIDE', 'shot', side, target.id, reacted))
  else if (rolls[2] < chances.goal) events.push(ev('FK_GOAL', 'goal', side, target.id, reacted))
  else events.push(ev('FK_SAVE', 'save', other, keeper.id, reacted))
  return { events, next: null }
}
