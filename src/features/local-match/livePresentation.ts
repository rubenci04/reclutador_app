import type { SoundId } from '../audio/soundEffects'
import type { MatchBlock, MatchEvent, MatchSide } from './matchTypes'

/** One revealable moment of an already confirmed block. Presentation only: it never alters or recomputes the block. */
export interface LiveFrame {
  readonly key: string
  readonly minute: MatchBlock['minute']
  readonly events: readonly MatchEvent[]
  readonly score: Readonly<Record<MatchSide, number>>
  readonly lastOfBlock: boolean
}

/** A block that is still open because an interactive play is waiting for a decision. */
export interface OpenBlock { readonly minute: MatchBlock['minute']; readonly events: readonly MatchEvent[] }

/**
 * Splits confirmed blocks into one frame per beat: a new frame starts at every attack after the first of its block and at
 * every step of an interactive attack (pass, cross, shot...), so each confirmed decision is revealed on its own.
 * An open block is shown too, but never as "last of its block" (no half-time or full-time whistle yet).
 */
export function liveFrames(blocks: readonly MatchBlock[], open: OpenBlock | null = null): readonly LiveFrame[] {
  const frames: LiveFrame[] = []
  const score = { local: 0, cpu: 0 }
  const all: { readonly minute: MatchBlock['minute']; readonly events: readonly MatchEvent[]; readonly open: boolean }[] = [...blocks.map((block) => ({ minute: block.minute, events: block.events, open: false })), ...(open ? [{ minute: open.minute, events: open.events, open: true }] : [])]
  all.forEach((block, blockIndex) => {
    const groups: MatchEvent[][] = [[]]
    let hasAttack = false
    for (const item of block.events) {
      const startsStep = item.step !== undefined && item.step !== 'BUILD' && item.step !== 'DEFENSE_BUILD'
      if (item.type === 'attack' && hasAttack || startsStep && groups[groups.length - 1].length) groups.push([])
      if (item.type === 'attack') hasAttack = true
      groups[groups.length - 1].push(item)
    }
    const filled = groups.filter((group) => group.length)
    filled.forEach((events, index) => {
      for (const item of events) if (item.type === 'goal' && item.side) score[item.side]++
      frames.push({ key: `${blockIndex}:${index}`, minute: block.minute, events, score: { ...score }, lastOfBlock: !block.open && index === filled.length - 1 })
    })
    if (!filled.length && !block.open) frames.push({ key: `${blockIndex}:0`, minute: block.minute, events: [], score: { ...score }, lastOfBlock: true })
  })
  return frames
}

/** Sounds a revealed frame triggers. The caller keeps a ledger keyed by frame so pause, speed or replay never repeat them. */
export function frameSounds(frame: LiveFrame): readonly SoundId[] {
  const sounds: SoundId[] = []
  if (frame.events.some((item) => item.step === 'CORNER_DELIVERY')) sounds.push('cross')
  else if (frame.events.some((item) => item.step === 'CORNER_CONTACT')) sounds.push('header')
  else if (frame.events.some((item) => item.step === 'CORNER_SHOT')) sounds.push('shot')
  else if (frame.events.some((item) => item.step === 'AERIAL_CROSS')) sounds.push('cross')
  else if (frame.events.some((item) => item.step === 'DIRECTED_HEADER_CONTACT')) sounds.push('header')
  // Contest/win/flight are visual phases, not extra contacts with the ball.
  else if (frame.events.some((item) => item.aerial && item.type === 'pass')) return sounds
  else if (frame.events.some((item) => item.corner && ['CORNER_FLIGHT', 'CORNER_SHORT_ADVANCE'].includes(item.step ?? ''))) { /* No extra contact; retain block-ending whistles. */ }
  else if (frame.events.some((item) => item.type === 'goal')) sounds.push('goal')
  else if (frame.events.some((item) => item.type === 'shot' || item.type === 'save')) sounds.push('shot')
  else if (frame.events.some((item) => item.type === 'pass' && item.step !== 'CARRY_OK')) sounds.push('pass')
  else if (frame.events.some((item) => item.type === 'recovery' && item.step)) sounds.push('intercept')
  if (frame.lastOfBlock && frame.minute === 45) sounds.push('halfTimeWhistle')
  if (frame.lastOfBlock && frame.minute === 90) sounds.push('finalWhistle')
  return sounds
}

/** Cross audio follows release after the short run-up; no delayed sounds are queued after a skipped beat. */
export const frameSoundOffset = (sound: SoundId) => sound === 'cross' ? 250 : 0

/** The most important event of a frame decides what the board shows. Null before anything is revealed. */
export function frameFocus(frame: LiveFrame | undefined): MatchEvent | null {
  if (!frame) return null
  const priority = ['goal', 'save', 'shot', 'corner', 'pass', 'attack', 'recovery'] as const
  for (const type of priority) { const found = frame.events.find((item) => item.type === type); if (found) return found }
  return null
}
