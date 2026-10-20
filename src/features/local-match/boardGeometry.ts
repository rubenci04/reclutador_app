import { formationSlots, type FormationId } from '../tactics/formations'
import type { DraftLineup } from '../draft/draftTypes'
import type { MatchEventType, MatchSide } from './matchTypes'

/**
 * The only thing the board knows about the action. Today it comes from one confirmed event; a future typed event
 * sequence (passes, carries) can feed the same shape without changing the drawing code.
 */
export interface BoardPlay {
  readonly kind: MatchEventType | 'idle'
  /** Side the event is credited to (the side that saves, for a save). */
  readonly side: MatchSide | null
  /** Only drawn as the highlighted footballer when the confirmed event names him and he is in that side's lineup. */
  readonly playerId?: string
  /** Player the ball came from (the protagonist of an interactive play), only when a confirmed event names him. */
  readonly fromPlayerId?: string
}
export type BoardFocus = 'full' | 'local' | 'cpu'
export interface Point { readonly x: number; readonly y: number }
export interface BoardDot { readonly side: MatchSide; readonly slotId: string; readonly playerId: string | null; readonly home: Point }

const TOWARD: Readonly<Record<MatchSide, 1 | -1>> = { local: 1, cpu: -1 }
export const IDLE_PLAY: BoardPlay = { kind: 'idle', side: null }

/** Normalised pitch (0–1 on both axes), local attacks to the right and the cpu to the left. */
export function homePoint(side: MatchSide, slot: { x: number; y: number }): Point {
  const depth = (100 - slot.y) / 100 * .46 + .03
  return { x: side === 'local' ? depth : 1 - depth, y: side === 'local' ? slot.x / 100 : 1 - slot.x / 100 }
}

export function boardDots(formations: Readonly<Record<MatchSide, FormationId>>, lineups: Readonly<Record<MatchSide, DraftLineup>>): readonly BoardDot[] {
  return (['local', 'cpu'] as const).flatMap((side) => formationSlots(formations[side]).map((slot) => ({ side, slotId: slot.id, playerId: lineups[side][slot.id as keyof DraftLineup], home: homePoint(side, slot) })))
}

/** Lines of the team in possession step up; the other side drops slightly. Sober, never a claim about individual runs. */
export function teamShift(play: BoardPlay, side: MatchSide): number {
  if (!play.side || play.kind === 'idle' || play.kind === 'substitution' || play.kind === 'final') return 0
  const attacking = play.kind === 'save' ? (play.side === 'local' ? 'cpu' : 'local') : play.side
  const strength = play.kind === 'recovery' ? .04 : play.kind === 'attack' || play.kind === 'pass' ? .08 : .12
  return (attacking === side ? strength : -strength * .4) * TOWARD[side]
}

export function ballPoint(play: BoardPlay): Point {
  const side = play.side
  if (!side || play.kind === 'idle' || play.kind === 'substitution' || play.kind === 'final') return { x: .5, y: .5 }
  const dir = TOWARD[side]
  switch (play.kind) {
    case 'recovery': return { x: .5 - dir * .1, y: .5 }
    case 'attack': case 'pass': return { x: .5 + dir * .14, y: .5 }
    case 'shot': return { x: .5 + dir * .34, y: .5 }
    case 'goal': return { x: dir === 1 ? .985 : .015, y: .5 }
    case 'save': return { x: side === 'local' ? .06 : .94, y: .5 } // the saving side's goalkeeper area
    default: return { x: .5, y: .5 }
  }
}

/** Visible window (fractions of the pitch width) for each focus; the goal labels keep orientation in every view. */
export function focusWindow(focus: BoardFocus): { readonly from: number; readonly to: number } {
  return focus === 'local' ? { from: 0, to: .55 } : focus === 'cpu' ? { from: .45, to: 1 } : { from: 0, to: 1 }
}

export function attackingSide(play: BoardPlay): MatchSide | null {
  if (!play.side || play.kind === 'idle' || play.kind === 'substitution' || play.kind === 'final') return null
  return play.kind === 'save' ? (play.side === 'local' ? 'cpu' : 'local') : play.side
}
