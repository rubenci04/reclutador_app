import type { Player } from '../../../types/player'
import type { MatchSide } from '../matchTypes'
import { initialCheckpoint, nextCheckpoint, type RngCheckpoint } from './random'
import { keeperQuality, shooterQuality, type DribbleSector } from './attackTree'

/**
 * penalty-shootout-v1: the series tie-break shot by hand (local series against the CPU only). Pure and serializable.
 * Every intention of the CPU (its keeper's dive, or its kicker's side and accuracy) is drawn BEFORE the player acts and stored in
 * `pending`; the result of a kick is then drawn from the same seeded stream with a fixed number of draws. The winner is derived
 * only from confirmed kicks. Quick series, online series and historical games keep `seriesPenalties` untouched.
 */
export const SHOOTOUT_VERSION = 'penalty-shootout-v1' as const
export type Lane = DribbleSector
export type KickOutcome = 'GOAL' | 'SAVED' | 'MISSED'
export interface KickRecord {
  readonly round: number
  readonly side: MatchSide
  readonly kickerId: string
  readonly keeperId: string
  readonly direction: Lane
  readonly dive: Lane
  /** 0-1 timing of the kick. Hand-played: what the player achieved (the CPU's own accuracy for its kicks). */
  readonly precision: number
  readonly outcome: KickOutcome
  readonly source: 'MANUAL' | 'AUTO'
}
export interface PendingKick {
  readonly round: number
  readonly side: MatchSide
  readonly kickerId: string
  readonly keeperId: string
  /** CPU kicks: its side and accuracy, fixed before the player picks where the keeper dives. */
  readonly cpuShot: { readonly direction: Lane; readonly precision: number } | null
  /** Local kicks: the CPU keeper's dive, fixed before the player confirms the shot. */
  readonly cpuDive: Lane | null
}
export interface Shootout {
  readonly version: typeof SHOOTOUT_VERSION
  readonly seed: string
  readonly rng: RngCheckpoint
  readonly takers: Readonly<Record<MatchSide, readonly string[]>>
  readonly keepers: Readonly<Record<MatchSide, string>>
  readonly kicks: readonly KickRecord[]
  readonly score: Readonly<Record<MatchSide, number>>
  readonly pending: PendingKick | null
  readonly winner: MatchSide | null
  /** Set only if 50 sudden-death rounds stayed level (bounded fallback, as in the traditional model). */
  readonly coinToss: boolean
}
export type ShootoutInput = { readonly direction: Lane; readonly precision: number } | { readonly dive: Lane }
export const LANES: readonly Lane[] = ['LEFT', 'CENTER', 'RIGHT']
const REGULATION = 5
const SUDDEN_DEATH_LIMIT = 50
const clamp = (value: number, lower: number, upper: number) => Math.max(lower, Math.min(upper, value))

/** Documented estimates built from the five catalogue ratings; clamped, so no skill guarantees a goal or a save. */
export function penaltyChances(kicker: Player, keeper: Player, direction: Lane, dive: Lane, precision: number) {
  const skill = clamp(precision, 0, 1) - .5
  const gap = keeperQuality(keeper) - shooterQuality(kicker)
  return {
    miss: clamp(.09 - skill * .14 - (shooterQuality(kicker) - 80) * .002, .02, .2),
    save: direction === dive ? clamp(.52 + gap * .006 - skill * .2, .22, .72) : clamp(.05 + gap * .002, .02, .10),
  }
}

const quality = (player: Player) => shooterQuality(player)
/** Field players by kicking quality, then the goalkeeper last; the order repeats if the shootout goes beyond eleven kicks. */
export function takerOrder(players: readonly Player[]): readonly string[] {
  const field = players.filter((p) => p.position !== 'ARQ').sort((a, b) => quality(b) - quality(a) || a.id.localeCompare(b.id))
  return [...field, ...players.filter((p) => p.position === 'ARQ')].map((p) => p.id)
}

function draw(state: Shootout): { value: number; state: Shootout } {
  const next = nextCheckpoint(state.rng)
  return { value: next.value, state: { ...state, rng: next.checkpoint } }
}
const laneOf = (value: number): Lane => LANES[Math.min(2, Math.floor(value * 3))]

/** Opens the next kick (null when decided): the CPU's intention is drawn here, before anyone chooses. */
function prepare(current: Shootout, catalog: readonly Player[]): Shootout {
  if (current.winner) return { ...current, pending: null }
  const index = current.kicks.length
  const round = Math.floor(index / 2) + 1
  const side: MatchSide = index % 2 === 0 ? 'local' : 'cpu'
  const other: MatchSide = side === 'local' ? 'cpu' : 'local'
  const order = current.takers[side]
  const kickerId = order[(round - 1) % order.length]
  let state = current
  let cpuDive: Lane | null = null
  let cpuShot: PendingKick['cpuShot'] = null
  if (side === 'local') {
    const roll = draw(state); state = roll.state; cpuDive = laneOf(roll.value)
  } else {
    const aim = draw(state); state = aim.state
    const accuracy = draw(state); state = accuracy.state
    const kicker = catalog.find((p) => p.id === kickerId)!
    cpuShot = { direction: laneOf(aim.value), precision: Math.round(clamp(.5 + (quality(kicker) - 82) * .012 + (accuracy.value - .5) * .5, 0, 1) * 100) / 100 }
  }
  return { ...state, pending: { round, side, kickerId, keeperId: current.keepers[other], cpuShot, cpuDive } }
}

export function startShootout(seed: string, rosters: Readonly<Record<MatchSide, readonly Player[]>>, catalog: readonly Player[]): Shootout {
  const keeperOf = (side: MatchSide) => (rosters[side].find((p) => p.position === 'ARQ') ?? rosters[side][0]).id
  const base: Shootout = { version: SHOOTOUT_VERSION, seed, rng: initialCheckpoint(`${seed}:series:penalty-shootout-v1`), takers: { local: takerOrder(rosters.local), cpu: takerOrder(rosters.cpu) }, keepers: { local: keeperOf('local'), cpu: keeperOf('cpu') }, kicks: [], score: { local: 0, cpu: 0 }, pending: null, winner: null, coinToss: false }
  return prepare(base, catalog)
}

/** True once one side cannot be caught (first five each) or a sudden-death round ended unequal. */
export function decidedBy(kicks: readonly KickRecord[], score: Readonly<Record<MatchSide, number>>): MatchSide | null {
  const taken = { local: kicks.filter((k) => k.side === 'local').length, cpu: kicks.filter((k) => k.side === 'cpu').length }
  if (taken.local < REGULATION || taken.cpu < REGULATION) {
    const left = { local: Math.max(0, REGULATION - taken.local), cpu: Math.max(0, REGULATION - taken.cpu) }
    if (score.local > score.cpu + left.cpu) return 'local'
    if (score.cpu > score.local + left.local) return 'cpu'
    return null
  }
  if (taken.local === taken.cpu && score.local !== score.cpu) return score.local > score.cpu ? 'local' : 'cpu'
  return null
}

/** Resolves the pending kick with the player's confirmed input. Returns null if the input does not fit the pending kick. */
export function takeKick(current: Shootout, input: ShootoutInput, catalog: readonly Player[], source: KickRecord['source'] = 'MANUAL'): { state: Shootout; kick: KickRecord } | null {
  const pending = current.pending
  if (!pending || current.winner) return null
  let direction: Lane; let dive: Lane; let precision: number
  if (pending.side === 'local') {
    if (!('direction' in input) || !LANES.includes(input.direction) || !Number.isFinite(input.precision)) return null
    direction = input.direction; dive = pending.cpuDive!; precision = Math.round(clamp(input.precision, 0, 1) * 100) / 100
  } else {
    if (!('dive' in input) || !LANES.includes(input.dive)) return null
    direction = pending.cpuShot!.direction; dive = input.dive; precision = pending.cpuShot!.precision
  }
  const kicker = catalog.find((p) => p.id === pending.kickerId)!; const keeper = catalog.find((p) => p.id === pending.keeperId)!
  const chances = penaltyChances(kicker, keeper, direction, dive, precision)
  const miss = draw(current); const save = draw(miss.state)
  const outcome: KickOutcome = miss.value < chances.miss ? 'MISSED' : save.value < chances.save ? 'SAVED' : 'GOAL'
  const kick: KickRecord = { round: pending.round, side: pending.side, kickerId: pending.kickerId, keeperId: pending.keeperId, direction, dive, precision, outcome, source }
  const kicks = [...current.kicks, kick]
  const score = { ...current.score, [pending.side]: current.score[pending.side] + (outcome === 'GOAL' ? 1 : 0) }
  let state: Shootout = { ...save.state, kicks, score, pending: null }
  let winner = decidedBy(kicks, score)
  if (!winner && kicks.length >= 2 * (REGULATION + SUDDEN_DEATH_LIMIT) && kicks.length % 2 === 0) {
    const toss = draw(state); state = { ...toss.state, coinToss: true }
    winner = toss.value < .5 ? 'local' : 'cpu'
  }
  return { state: prepare({ ...state, winner }, catalog), kick }
}

/** The traditional alternative: the remaining kicks are decided by the engine itself (side and timing drawn from the same stream). Flagged AUTO. */
export function finishAutomatically(current: Shootout, catalog: readonly Player[]): Shootout {
  let state = current
  for (let guard = 0; state.pending && guard < 4 * (REGULATION + SUDDEN_DEATH_LIMIT); guard++) {
    const aim = draw(state); const accuracy = draw(aim.state)
    const input: ShootoutInput = state.pending.side === 'local' ? { direction: laneOf(aim.value), precision: .5 } : { dive: laneOf(aim.value) }
    const result = takeKick({ ...accuracy.state, pending: state.pending }, input, catalog, 'AUTO')
    if (!result) break
    state = result.state
  }
  return state
}
