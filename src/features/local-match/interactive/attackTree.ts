import type { Player } from '../../../types/player'
import type { DraftLineup } from '../../draft/draftTypes'
import { formationSlots, type FormationId } from '../../tactics/formations'
import type { StrategyId } from '../../tactics/strategies'
import type { MatchEvent, MatchSide, PlayStep, TeamStrength } from '../matchTypes'
import type { FreeKickEvent } from './freeKicks'
import type { CornerEvent } from './corners'
import type { AerialAction } from './directedHeader'
import { defenderDuelChance } from './individualDuels'

/**
 * attack-tree-v1: the first interactive attack. One eligible opportunity of the local side (against the CPU) is played as
 * a short chain of decisions instead of the batch draws. The chain has its own seeded stream (`<seed>:tree`), so the main
 * block stream, the substitution stream and every historical result are untouched.
 *
 * The footballers only expose the five catalogue ratings, so each role below is a documented estimate built from them:
 *   passer (progressive pass)   .5 attack + .3 mental + .2 overall
 *   receiver (control)          .4 attack + .3 mental + .3 overall
 *   crosser (delivery)          .5 attack + .3 mental + .2 overall
 *   header                      .45 attack + .35 physical + .2 overall
 *   shooter                     .5 attack + .3 overall + .2 mental
 *   defender                    .5 defence + .25 physical + .25 mental
 *   goalkeeper                  .6 overall + .4 defence
 * Every probability is clamped well inside (0, 1): a better player improves the odds and never guarantees the outcome.
 */
export const ATTACK_TREE_VERSION = 'attack-tree-v1' as const
export const ATTACK_TREE_LIMIT = 3
/** A cross that finds a free head is a better chance than an average shot; it pays for the extra risk of the delivery. */
const HEADER_BONUS = .06

export type Sector = 'LEFT' | 'RIGHT'
/** SIM-MINI-001: the three lanes of the dribble challenge. */
export type DribbleSector = 'LEFT' | 'CENTER' | 'RIGHT'
/** The command a hand-played defense sends: PRESS, or anticipating one lane. */
export const defenseChoice = (pick: DribbleSector | 'PRESS') => (pick === 'PRESS' ? 'PRESS' : `DEFEND_${pick}`) as PlayChoice
export const DRIBBLE_VERSION = 'dribble-mini-v1' as const
export const DRIBBLE_CHOICES = ['DRIBBLE_LEFT', 'DRIBBLE_CENTER', 'DRIBBLE_RIGHT'] as const
export const DEFENSE_VERSION = 'defense-mini-v1' as const
export const SHOT_VERSION = 'precision-shot-v1' as const
/** The hand-played defense keeps the two traditional options (the first one is the automatic fallback) and adds the three lanes. */
export const DEFENSE_CHOICES = ['INTERCEPT', 'PRESS', 'DEFEND_LEFT', 'DEFEND_CENTER', 'DEFEND_RIGHT'] as const
export type PlayChoice = 'FK_LEFT' | 'FK_CENTER' | 'FK_RIGHT' | 'FK_CROSS' | 'FK_SHORT' | 'WALL_JUMP' | 'WALL_HOLD' | 'CORNER_NEAR' | 'CORNER_FAR' | 'CORNER_SHORT' | 'MAN_MARK' | 'ZONE' | 'LEFT' | 'RIGHT' | 'CROSS' | 'SHOOT' | 'INTERCEPT' | 'PRESS' | 'NEAR_POST' | 'GOAL_CENTER' | 'FAR_POST' | 'DRIBBLE_LEFT' | 'DRIBBLE_CENTER' | 'DRIBBLE_RIGHT' | 'DEFEND_LEFT' | 'DEFEND_CENTER' | 'DEFEND_RIGHT'
export type PlayNode = 'DRIBBLE' | 'FK_ATTACK' | 'FK_DEFEND' | 'FK_HEADER' | 'CORNER_ATTACK' | 'CORNER_DEFEND' | 'CORNER_HEADER' | 'DIRECTION' | 'FINISH' | 'DEFEND' | 'HEADER'
export interface PlayOption { readonly choice: PlayChoice; readonly available: boolean; readonly playerId: string | null; readonly rivalId: string | null }
export interface PendingPlay {
  readonly id: string
  readonly node: PlayNode
  readonly protagonistId: string
  /** Set once the pass succeeded. */
  readonly receiverId: string | null
  readonly sector: Sector | null
  readonly options: readonly PlayOption[]
  readonly attackerId?: string
  /** DRIBBLE node only: the lane the CPU defender decided to cover, fixed before the player chooses (hidden by the interface until the reveal). */
  readonly dribble?: { readonly cover: DribbleSector }
  /** DEFEND node only (defense-mini-v1): the lane the CPU attacker will use, fixed before the player chooses. */
  readonly defense?: { readonly lane: DribbleSector }
  readonly aerial?: AerialAction
  readonly freeKick?: FreeKickEvent
  readonly corner?: CornerEvent
}
export interface PlayLogEntry { readonly id: string; readonly playId: string; readonly node: PlayNode; readonly choice: PlayChoice; /** DRIBBLE, FK_ATTACK and DEFEND nodes only: timing precision (0-1) the player achieved. */ readonly precision?: number }

export interface Squad { readonly lineup: DraftLineup; readonly formation: FormationId }
export interface PlayContext {
  readonly minute: MatchEvent['minute']
  readonly catalog: readonly Player[]
  readonly local: Squad
  readonly cpu: Squad
  readonly effective: Readonly<Record<MatchSide, TeamStrength>>
  readonly strategy: Readonly<Record<MatchSide, StrategyId>>
  readonly effectiveOnly?: boolean
  readonly duels?: 'ovr-duels-v1'
  /** Set only while the dribble challenge may still appear (enabled, and not yet played in this match). */
  readonly dribble?: typeof DRIBBLE_VERSION
  /** Set only while the first CPU attack of the match may still be defended by hand. */
  readonly defenseMini?: typeof DEFENSE_VERSION
}

const clamp = (value: number, lower: number, upper: number) => Math.max(lower, Math.min(upper, value))
export const passerQuality = (p: Player) => .5 * p.att_rating + .3 * p.men_rating + .2 * p.overall_rating
export const receiverQuality = (p: Player) => .4 * p.att_rating + .3 * p.men_rating + .3 * p.overall_rating
export const crosserQuality = (p: Player) => .5 * p.att_rating + .3 * p.men_rating + .2 * p.overall_rating
export const headerQuality = (p: Player) => .45 * p.att_rating + .35 * p.phy_rating + .2 * p.overall_rating
export const shooterQuality = (p: Player) => .5 * p.att_rating + .3 * p.overall_rating + .2 * p.men_rating
export const defenderQuality = (p: Player) => .5 * p.def_rating + .25 * p.phy_rating + .25 * p.men_rating
export const keeperQuality = (p: Player) => .6 * p.overall_rating + .4 * p.def_rating
export const dribblerQuality = (p: Player) => .5 * p.att_rating + .3 * p.men_rating + .2 * p.overall_rating

/** Midfield and attack-versus-defence balance of the vigente effective strengths (already include strategy, coach, formation, squad). */
export function playContext(ctx: Pick<PlayContext, 'effective'>) {
  return clamp((ctx.effective.local.midfield - ctx.effective.cpu.midfield) * .004 + (ctx.effective.local.attack - ctx.effective.cpu.defense) * .003, -.08, .08)
}

export function passChance(passer: Player, receiver: Player, defender: Player, edge: number, strategy: Readonly<Record<MatchSide, StrategyId>>) {
  const wide = (strategy.local === 'WIDE_PLAY' ? .03 : 0) + (strategy.cpu === 'LOW_BLOCK' ? -.02 : 0)
  return clamp(.74 + (passerQuality(passer) - 80) * .004 + (receiverQuality(receiver) - 80) * .007 - (defenderQuality(defender) - 80) * .006 + edge + wide, .28, .90)
}
export function crossChance(crosser: Player, target: Player, defender: Player, edge: number) {
  return clamp(.66 + (crosserQuality(crosser) - 80) * .005 + (headerQuality(target) - 80) * .003 - (defenderQuality(defender) - 80) * .005 + edge, .22, .82)
}
export const blockChance = (shooter: Player, defender: Player, edge: number) => clamp(.15 + (defenderQuality(defender) - 80) * .004 - (shooterQuality(shooter) - 80) * .003 - edge * .5, .06, .38)
export const shotOnTargetChance = (shooter: Player) => clamp(.74 + (shooterQuality(shooter) - 80) * .004, .45, .88)
export const headerOnTargetChance = (target: Player, defender: Player) => clamp(.76 + (headerQuality(target) - 80) * .004 - (defenderQuality(defender) - 80) * .002, .45, .88)
export const scoringChance = (quality: number, keeper: Player, edge: number, bonus = 0) => clamp(.42 + bonus + (quality - 80) * .006 - (keeperQuality(keeper) - 80) * .006 + edge * .5, .10, .56)

type Placed = { readonly slot: { readonly id: string; readonly x: number; readonly y: number; readonly position: string }; readonly player: Player }
function placed(squad: Squad, catalog: readonly Player[]): Placed[] {
  return formationSlots(squad.formation).flatMap((slot) => { const player = catalog.find((p) => p.id === squad.lineup[slot.id as keyof DraftLineup]); return player ? [{ slot, player }] : [] })
}
const byId = (a: Player, b: Player) => a.id.localeCompare(b.id)

/** The most advanced real attacking teammate on that flank. Null when the formation leaves nobody there. */
export function receiverFor(sector: Sector, squad: Squad, catalog: readonly Player[], protagonistId: string): Placed | null {
  const wing = placed(squad, catalog).filter(({ slot, player }) => player.id !== protagonistId && (slot.position === 'MED' || slot.position === 'DEL') && (sector === 'LEFT' ? slot.x < 45 : slot.x > 55))
  return wing.sort((a, b) => a.slot.y - b.slot.y || b.player.att_rating - a.player.att_rating || byId(a.player, b.player))[0] ?? null
}
/** Rival defender who faces that point: the rival's slots are mirrored across the width. */
export function rivalDefenderFor(x: number, rival: Squad, catalog: readonly Player[]): Player | null {
  const defenders = placed(rival, catalog).filter(({ slot }) => slot.position === 'DEF')
  return defenders.sort((a, b) => Math.abs(100 - a.slot.x - x) - Math.abs(100 - b.slot.x - x) || byId(a.player, b.player))[0]?.player ?? null
}
export function keeperOf(squad: Squad, catalog: readonly Player[]): Player | null { return placed(squad, catalog).find(({ slot }) => slot.position === 'ARQ')?.player ?? null }
/** Best other forward as the target of a cross. */
export function crossTarget(squad: Squad, catalog: readonly Player[], receiverId: string): Placed | null {
  return placed(squad, catalog).filter(({ slot, player }) => slot.position === 'DEL' && player.id !== receiverId).sort((a, b) => b.player.att_rating - a.player.att_rating || byId(a.player, b.player))[0] ?? null
}

/** Chooses the protagonist among the midfielders really on the pitch, weighted by mental rating (who reads the game). */
export function pickProtagonist(squad: Squad, catalog: readonly Player[], random: () => number): Player | null {
  const mids = placed(squad, catalog).filter(({ slot }) => slot.position === 'MED').map(({ player }) => player).sort(byId)
  if (!mids.length) return null
  const weights = mids.map((p) => Math.max(1, p.men_rating - 60) ** 2)
  let ticket = random() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < mids.length; i++) { ticket -= weights[i]; if (ticket <= 0) return mids[i] }
  return mids[mids.length - 1]
}

/** First node. Null (the opportunity is then resolved by the ordinary block model) when no flank has a valid receiver. */
export function planPlay(ctx: PlayContext, id: string, random: () => number, excluded: readonly string[] = []): { play: PendingPlay; protagonist: Player } | null {
  const fresh = ctx.catalog.filter((p) => !excluded.includes(p.id))
  const protagonist = pickProtagonist(ctx.local, fresh, random) ?? pickProtagonist(ctx.local, ctx.catalog, random)
  if (!protagonist) return null
  const options = (['LEFT', 'RIGHT'] as const).map((sector): PlayOption => {
    const receiver = receiverFor(sector, ctx.local, ctx.catalog, protagonist.id)
    const rival = receiver ? rivalDefenderFor(receiver.slot.x, ctx.cpu, ctx.catalog) : null
    return { choice: sector, available: Boolean(receiver && rival), playerId: receiver?.player.id ?? null, rivalId: rival?.id ?? null }
  })
  if (!options.some((o) => o.available)) return null
  return { protagonist, play: { id, node: 'DIRECTION', protagonistId: protagonist.id, receiverId: null, sector: null, options } }
}

export interface StepResult { readonly events: readonly MatchEvent[]; readonly next: PendingPlay | null }

/** Where the defender will cover: leaning to the attacker's flank, more central against a low block. Drawn once, before the player chooses. */
export function pickCover(sector: Sector, strategy: Readonly<Record<MatchSide, StrategyId>>, random: () => number): DribbleSector {
  const flank = sector === 'LEFT' ? 'LEFT' : 'RIGHT'; const far = sector === 'LEFT' ? 'RIGHT' : 'LEFT'
  const weights: Record<DribbleSector, number> = { LEFT: 1, CENTER: 1 + (strategy.cpu === 'LOW_BLOCK' ? .3 : 0), RIGHT: 1 }
  weights[flank] += .3 + (strategy.cpu === 'HIGH_PRESS' ? .2 : 0); weights[far] -= .3
  const order: readonly DribbleSector[] = ['LEFT', 'CENTER', 'RIGHT']
  let ticket = random() * order.reduce((sum, key) => sum + weights[key], 0)
  for (const key of order) { ticket -= weights[key]; if (ticket <= 0) return key }
  return 'CENTER'
}

/** Chance of beating the defender: ratings of both players, the lane against the cover, the timing precision and the strategies. Clamped, never certain. */
export function dribbleChance(attacker: Player, defender: Player, lane: DribbleSector, cover: DribbleSector, precision: number, edge: number, strategy: Readonly<Record<MatchSide, StrategyId>>) {
  const timing = (clamp(precision, 0, 1) - .5) * .24
  const read = lane === cover ? -.22 : .06
  const tactics = (strategy.local === 'WIDE_PLAY' && lane !== 'CENTER' ? .03 : 0) + (strategy.local === 'COUNTER_ATTACK' && lane === 'CENTER' ? .02 : 0) - (strategy.cpu === 'LOW_BLOCK' && lane === 'CENTER' ? .03 : 0) - (strategy.cpu === 'HIGH_PRESS' ? .02 : 0)
  return clamp(.5 + (dribblerQuality(attacker) - defenderQuality(defender)) * .008 + edge + timing + read + tactics, .12, .85)
}

export function availableChoice(play: PendingPlay, choice: unknown): choice is PlayChoice {
  return play.options.some((o) => o.choice === choice && o.available)
}

/** One node of the tree. All draws come from the supplied tree stream, in a fixed order. */
export function resolvePlay(ctx: PlayContext, play: PendingPlay, choice: PlayChoice, random: () => number, precision = .5): StepResult {
  const player = (id: string | null) => ctx.catalog.find((p) => p.id === id)!
  const event = (side: MatchSide, type: MatchEvent['type'], step: PlayStep, who: Player): MatchEvent => ({ minute: ctx.minute, side, type, playerId: who.id, step })
  const edge = playContext(ctx)
  const option = play.options.find((o) => o.choice === choice)!
  const finishNode = (receiver: Player, sector: Sector): PendingPlay => {
    const target = crossTarget(ctx.local, ctx.catalog, receiver.id)
    const targetDefender = target ? rivalDefenderFor(target.slot.x, ctx.cpu, ctx.catalog) : null
    const shotDefender = rivalDefenderFor(placed(ctx.local, ctx.catalog).find((p) => p.player.id === receiver.id)!.slot.x, ctx.cpu, ctx.catalog)
    return { id: play.id, node: 'FINISH', protagonistId: play.protagonistId, receiverId: receiver.id, sector, options: [
      { choice: 'CROSS', available: Boolean(target && targetDefender), playerId: target?.player.id ?? null, rivalId: targetDefender?.id ?? null },
      { choice: 'SHOOT', available: Boolean(shotDefender), playerId: receiver.id, rivalId: shotDefender?.id ?? null },
    ] }
  }
  if (play.node === 'DRIBBLE') {
    const lane = (choice as string).slice('DRIBBLE_'.length) as DribbleSector
    const attacker = player(play.receiverId); const defender = player(option.rivalId)
    if (random() < dribbleChance(attacker, defender, lane, play.dribble!.cover, precision, edge, ctx.effectiveOnly ? { local: 'NEUTRAL', cpu: 'NEUTRAL' } : ctx.strategy)) return { events: [event('local', 'pass', 'DRIBBLE_OK', attacker)], next: finishNode(attacker, play.sector!) }
    return { events: [event('cpu', 'recovery', 'DRIBBLE_LOST', defender)], next: null }
  }
  if (play.node === 'DIRECTION') {
    const sector = choice as Sector
    const passer = player(play.protagonistId); const receiver = player(option.playerId); const defender = player(option.rivalId)
    if (random() < passChance(passer, receiver, defender, edge, ctx.effectiveOnly ? { local: 'NEUTRAL', cpu: 'NEUTRAL' } : ctx.strategy)) {
      // Delivery is not a 1v1. Once received, the winger must beat the actual marker to advance.
      if (ctx.dribble) {
        // SIM-MINI-001: the carry is played by hand. The defender's lane is decided now, before the player moves.
        const cover = pickCover(sector, ctx.strategy, random)
        return { events: [event('local', 'pass', sector === 'LEFT' ? 'PASS_LEFT_OK' : 'PASS_RIGHT_OK', receiver)], next: { id: play.id, node: 'DRIBBLE', protagonistId: play.protagonistId, receiverId: receiver.id, sector, dribble: { cover }, options: DRIBBLE_CHOICES.map((c) => ({ choice: c, available: true, playerId: receiver.id, rivalId: defender.id })) } }
      }
      if (ctx.duels && random() < defenderDuelChance(receiver.overall_rating, defender.overall_rating)) return { events: [event('local', 'pass', sector === 'LEFT' ? 'PASS_LEFT_OK' : 'PASS_RIGHT_OK', receiver), event('cpu', 'recovery', 'CARRY_LOST', defender)], next: null }
      const target = crossTarget(ctx.local, ctx.catalog, receiver.id)
      const targetDefender = target ? rivalDefenderFor(target.slot.x, ctx.cpu, ctx.catalog) : null
      const shotDefender = rivalDefenderFor(placed(ctx.local, ctx.catalog).find((p) => p.player.id === receiver.id)!.slot.x, ctx.cpu, ctx.catalog)
      return {
        events: [event('local', 'pass', sector === 'LEFT' ? 'PASS_LEFT_OK' : 'PASS_RIGHT_OK', receiver), ...(ctx.duels ? [event('local', 'pass', 'CARRY_OK', receiver)] : [])],
        next: { id: play.id, node: 'FINISH', protagonistId: play.protagonistId, receiverId: receiver.id, sector, options: [
          { choice: 'CROSS', available: Boolean(target && targetDefender), playerId: target?.player.id ?? null, rivalId: targetDefender?.id ?? null },
          { choice: 'SHOOT', available: Boolean(shotDefender), playerId: receiver.id, rivalId: shotDefender?.id ?? null },
        ] },
      }
    }
    return { events: [event('cpu', 'recovery', sector === 'LEFT' ? 'PASS_LEFT_LOST' : 'PASS_RIGHT_LOST', defender)], next: null }
  }
  const receiver = player(play.receiverId); const keeper = keeperOf(ctx.cpu, ctx.catalog)!
  const defender = player(option.rivalId)
  if (choice === 'CROSS') {
    const target = player(option.playerId)
    if (!(random() < crossChance(receiver, target, defender, edge))) return { events: [event('cpu', 'recovery', 'CROSS_LOST', defender)], next: null }
    const delivered = event('local', 'pass', 'CROSS_OK', receiver)
    if (!(random() < headerOnTargetChance(target, defender))) return { events: [delivered, event('local', 'shot', 'HEADER_WIDE', target)], next: null }
    if (random() < scoringChance(headerQuality(target), keeper, edge, HEADER_BONUS)) return { events: [delivered, event('local', 'goal', 'HEADER_GOAL', target)], next: null }
    return { events: [delivered, event('cpu', 'save', 'HEADER_SAVED', keeper)], next: null }
  }
  if (random() < blockChance(receiver, defender, edge)) return { events: [event('cpu', 'recovery', 'SHOT_BLOCKED', defender)], next: null }
  if (!(random() < shotOnTargetChance(receiver))) return { events: [event('local', 'shot', 'SHOT_WIDE', receiver)], next: null }
  if (random() < scoringChance(shooterQuality(receiver), keeper, edge)) return { events: [event('local', 'goal', 'SHOT_GOAL', receiver)], next: null }
  return { events: [event('cpu', 'save', 'SHOT_SAVED', keeper)], next: null }
}
