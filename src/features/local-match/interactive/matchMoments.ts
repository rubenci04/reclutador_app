import type { MatchEvent, MatchSide } from '../matchTypes'
import { formationSlots } from '../../tactics/formations'
import type { Player } from '../../../types/player'
import { defenderDuelChance } from './individualDuels'
import { DEFENSE_CHOICES, blockChance, keeperOf, receiverQuality, scoringChance, shooterQuality, shotOnTargetChance, type DribbleSector, type PendingPlay, type PlayChoice, type PlayContext, type StepResult } from './attackTree'

export const MOMENTS_VERSION = 'match-moments-v1' as const
export interface MomentSelection { readonly opportunity: number; readonly side: MatchSide; readonly protagonistId: string }
export interface MomentDirector {
  version: typeof MOMENTS_VERSION
  target: number
  nextEligible: number
  nextSide: MatchSide
  selected: MomentSelection[]
}
/** No sporting draws or future events. Only a private policy stream is consulted. */
export function createDirector(random: () => number): MomentDirector {
  return { version: MOMENTS_VERSION, target: random() < .65 ? 3 : 2, nextEligible: 2 + Math.floor(random() * 5), nextSide: random() < .5 ? 'local' : 'cpu', selected: [] }
}
export function eligibleMoment(d: MomentDirector, opportunity: number, side: MatchSide) {
  return d.selected.length < d.target && opportunity >= d.nextEligible && side === d.nextSide
}
export function recordMoment(d: MomentDirector, selection: MomentSelection, random: () => number) {
  d.selected.push(selection)
  d.nextEligible = selection.opportunity + 7 + Math.floor(random() * 3)
  d.nextSide = selection.side === 'local' ? 'cpu' : 'local'
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
/** Estimates, not biographical skills: interception favours reading/defence; pressure favours physical strength. */
export function defenseChance(defender: Player, attacker: Player, choice: PlayChoice, ctx: PlayContext) {
  if (ctx.duels) return defenderDuelChance(attacker.overall_rating, defender.overall_rating)
  const quality = choice === 'INTERCEPT' ? .5 * defender.def_rating + .3 * defender.men_rating + .2 * defender.overall_rating
    : .35 * defender.def_rating + .45 * defender.phy_rating + .2 * defender.overall_rating
  // Strategy/coach/formation are already in effective strengths: no second bonus.
  const edge = clamp((ctx.effective.local.defense - ctx.effective.cpu.attack) * .004 + (ctx.effective.local.midfield - ctx.effective.cpu.midfield) * .002, -.08, .08)
  return clamp(.46 + (quality - receiverQuality(attacker)) * .009 + edge, .18, .78)
}
export function planDefense(ctx: PlayContext, id: string, random: () => number, excluded: readonly string[]): { play: PendingPlay; protagonist: Player } | null {
  const onPitch = (side: MatchSide, positions: readonly string[]) => formationSlots(ctx[side].formation).flatMap((slot) => {
    const p = ctx.catalog.find((p) => p.id === ctx[side].lineup[slot.id]); return p && positions.includes(slot.position) ? [p] : []
  }).sort((a, b) => a.id.localeCompare(b.id))
  const defenders = onPitch('local', ['DEF', 'MED']); const attackers = onPitch('cpu', ['MED', 'DEL'])
  const fresh = defenders.filter((p) => !excluded.includes(p.id)); const pool = fresh.length ? fresh : defenders
  if (!pool.length || !attackers.length) return null
  const defender = pool[Math.floor(random() * pool.length)]; const attacker = attackers[Math.floor(random() * attackers.length)]
  // SIM-MINI-003: the lane is drawn after the traditional draws and only when the hand-played version is on, so the old stream is untouched.
  const defense = ctx.defenseMini ? { lane: pickAttackLane(ctx.strategy, random) } : undefined
  return { protagonist: attacker, play: { id, node: 'DEFEND', protagonistId: defender.id, attackerId: attacker.id, receiverId: null, sector: null, ...(defense ? { defense } : {}),
    options: (defense ? DEFENSE_CHOICES : (['INTERCEPT', 'PRESS'] as const)).map((choice) => ({ choice, available: true, playerId: defender.id, rivalId: attacker.id })) } }
}
/** Where the CPU attacker will go: even, with more weight on the flanks under WIDE_PLAY. Drawn once, before the player chooses. */
export function pickAttackLane(strategy: PlayContext['strategy'], random: () => number): DribbleSector {
  const wide = strategy.cpu === 'WIDE_PLAY'
  const flank = wide ? 1.3 : 1
  const ticket = random() * (2 * flank + (wide ? .7 : 1))
  return ticket < flank ? 'LEFT' : ticket < 2 * flank ? 'RIGHT' : 'CENTER'
}
/** Hand-played defense: reading the lane, the defender's DEF/MEN/PHY, the timing and the strategy move the odds; clamped, never certain. */
export function interactiveDefenseChance(defender: Player, attacker: Player, choice: PlayChoice, lane: DribbleSector, precision: number | undefined, ctx: PlayContext) {
  const skill = precision === undefined ? 0 : clamp(precision, 0, 1) - .5
  const press = choice === 'PRESS'
  const base = defenseChance(defender, attacker, press ? 'PRESS' : 'INTERCEPT', ctx)
  const read = choice.startsWith('DEFEND_') ? choice === `DEFEND_${lane}` ? .2 : -.1 : 0
  const tactics = press ? (ctx.strategy.local === 'HIGH_PRESS' ? .03 : 0) : ctx.strategy.local === 'LOW_BLOCK' ? .02 : 0
  return clamp(base + read + tactics + skill * .24, .1, .85)
}
export function resolveDefense(ctx: PlayContext, play: PendingPlay, choice: PlayChoice, random: () => number, precision?: number): StepResult {
  const defender = ctx.catalog.find((p) => p.id === play.protagonistId)!
  const attacker = ctx.catalog.find((p) => p.id === play.attackerId)!
  const keeper = keeperOf(ctx.local, ctx.catalog)!
  const event = (side: MatchSide, type: MatchEvent['type'], step: MatchEvent['step'], who: Player): MatchEvent => ({ minute: ctx.minute, side, type, step, playerId: who.id })
  const chance = play.defense ? interactiveDefenseChance(defender, attacker, choice, play.defense.lane, precision, ctx) : defenseChance(defender, attacker, choice, ctx)
  if (random() < chance) return { events: [event('local', 'recovery', choice === 'PRESS' ? 'PRESS_OK' : 'INTERCEPT_OK', defender)], next: null }
  const events = [event('cpu', 'pass', choice === 'PRESS' ? 'PRESS_BEATEN' : 'CPU_RETAIN', attacker)]
  // A failed press leaves a clearer chance; an unsuccessful interception can still delay the attacker.
  const edge = clamp((ctx.effective.cpu.attack - ctx.effective.local.defense) * .003, -.08, .08)
  if (random() < blockChance(attacker, defender, edge) + (choice !== 'PRESS' ? .08 : 0)) events.push(event('local', 'recovery', 'DEFENSE_BLOCK', defender))
  else if (random() >= shotOnTargetChance(attacker)) events.push(event('cpu', 'shot', 'CPU_WIDE', attacker))
  else if (random() < scoringChance(shooterQuality(attacker), keeper, edge, choice === 'PRESS' ? .04 : 0)) events.push(event('cpu', 'goal', 'CPU_GOAL', attacker))
  else events.push(event('local', 'save', 'DEFENSE_SAVE', keeper))
  return { events, next: null }
}
