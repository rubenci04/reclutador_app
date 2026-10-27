import type { MatchBlock, MatchEvent, MatchSide, MatchStats } from '../matchTypes'
import type { ChanceOutcome } from './figuresModel'
import type { ChanceKind } from './engineConstants'

/** Ball position as a percentage of the pitch: x from the left, y from the top. The local side attacks upwards, the CPU side downwards. */
export interface Spot { readonly x: number; readonly y: number }

/** One chance, ready to be shown: where the ball goes while it is built, where it ends, and the score once it is over. */
export interface PlayFrame {
  readonly kind: 'play'
  readonly key: string
  readonly side: MatchSide
  readonly minute: number
  readonly segment: number
  readonly chance: ChanceKind
  readonly outcome: ChanceOutcome
  readonly playerId?: string
  readonly build: Spot
  readonly finish: Spot
  readonly scoreAfter: Readonly<Record<MatchSide, number>>
}
export interface MarkFrame { readonly kind: 'kickoff' | 'halftime' | 'fulltime'; readonly key: string; readonly minute: number; readonly segment: number; readonly scoreAfter: Readonly<Record<MatchSide, number>> }
export type Frame = PlayFrame | MarkFrame

const LANES = [24, 50, 76] as const
const hash = (text: string) => { let h = 0; for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h) }
/** Depth 0 is the side's own goal line, 1 the rival's goal line; the local side builds from the bottom, the CPU from the top. */
const spot = (side: MatchSide, x: number, depth: number): Spot => ({ x, y: Math.round((side === 'local' ? 1 - depth : depth) * 1000) / 10 })

function buildSpot(side: MatchSide, chance: ChanceKind, seed: string): Spot {
  if (chance === 'corner') return spot(side, hash(seed) % 2 ? 4 : 96, 0.985)
  if (chance === 'free-kick') return spot(side, LANES[hash(seed) % 3], 0.76)
  if (chance === 'penalty') return spot(side, 50, 0.88)
  return spot(side, LANES[hash(seed) % 3], 0.66)
}
function finishSpot(side: MatchSide, outcome: ChanceOutcome, seed: string): Spot {
  const sway = (hash(seed) % 11) - 5
  if (outcome === 'goal') return spot(side, 50 + sway, 1.015)
  if (outcome === 'save') return spot(side, 50 + sway, 0.955)
  if (outcome === 'blocked') return spot(side, 50 + sway * 3, 0.84)
  return spot(side, hash(seed) % 2 ? 90 : 10, 1.02)
}

/** Groups the events of the blocks into frames: one per chance (an attack event opens it), plus kickoff, half-time and full time. */
export function framesFromBlocks(blocks: readonly MatchBlock[], finished: boolean): readonly Frame[] {
  const frames: Frame[] = [{ kind: 'kickoff', key: 'kickoff', minute: 0, segment: 0, scoreAfter: { local: 0, cpu: 0 } }]
  const score = { local: 0, cpu: 0 }
  blocks.forEach((block, segment) => {
    let group: MatchEvent[] = []
    const flush = () => {
      if (!group.length) return
      const attack = group[0]; const side = attack.side!
      const end = group[group.length - 1]
      const outcome: ChanceOutcome = end.type === 'goal' ? 'goal' : end.type === 'save' ? 'save' : end.type === 'recovery' ? 'blocked' : 'off'
      const chance: ChanceKind = attack.setPiece ?? (group.some((e) => e.type === 'corner') ? 'corner' : 'open')
      if (outcome === 'goal') score[side]++
      const key = `${segment}-${attack.at}-${side}-${frames.length}`
      frames.push({ kind: 'play', key, side, minute: attack.at ?? block.minute, segment, chance, outcome, playerId: attack.playerId, build: buildSpot(side, chance, key), finish: finishSpot(side, outcome, key), scoreAfter: { ...score } })
      group = []
    }
    for (const event of block.events) {
      if (event.type === 'substitution' || event.type === 'final') continue
      if (event.type === 'attack') flush()
      group.push(event)
    }
    flush()
    if (segment === 2) frames.push({ kind: 'halftime', key: 'halftime', minute: 45, segment, scoreAfter: { ...score } })
  })
  if (finished) frames.push({ kind: 'fulltime', key: 'fulltime', minute: 90, segment: 5, scoreAfter: { ...score } })
  return frames
}

/** Statistics of the plays shown so far, counted exactly as the engine counts them. */
export function statsFromFrames(frames: readonly Frame[]): Record<MatchSide, MatchStats> {
  const empty = (): { -readonly [K in keyof MatchStats]: MatchStats[K] } => ({ shots: 0, shotsOnTarget: 0, saves: 0, recoveries: 0, corners: 0, possession: 50 })
  const stats = { local: empty(), cpu: empty() }
  const attacks = { local: 0, cpu: 0 }
  for (const frame of frames) {
    if (frame.kind !== 'play') continue
    const own = stats[frame.side]; const other = stats[frame.side === 'local' ? 'cpu' : 'local']
    attacks[frame.side]++; own.shots++
    if (frame.chance === 'corner') own.corners = (own.corners ?? 0) + 1
    if (frame.outcome === 'goal') own.shotsOnTarget++
    if (frame.outcome === 'save') { own.shotsOnTarget++; other.saves++ }
    if (frame.outcome === 'blocked') other.recoveries++
  }
  const total = attacks.local + attacks.cpu
  stats.local.possession = total ? Math.round(attacks.local / total * 100) : 50
  stats.cpu.possession = 100 - stats.local.possession
  return stats
}
