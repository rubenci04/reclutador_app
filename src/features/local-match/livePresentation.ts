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

/** Splits confirmed blocks into one frame per opportunity (a new frame starts at every attack after the first of its block). */
export function liveFrames(blocks: readonly MatchBlock[]): readonly LiveFrame[] {
  const frames: LiveFrame[] = []
  const score = { local: 0, cpu: 0 }
  blocks.forEach((block, blockIndex) => {
    const groups: MatchEvent[][] = [[]]
    let hasAttack = false
    for (const item of block.events) {
      if (item.type === 'attack' && hasAttack) groups.push([])
      if (item.type === 'attack') hasAttack = true
      groups[groups.length - 1].push(item)
    }
    const filled = groups.filter((group) => group.length)
    filled.forEach((events, index) => {
      for (const item of events) if (item.type === 'goal' && item.side) score[item.side]++
      frames.push({ key: `${blockIndex}:${index}`, minute: block.minute, events, score: { ...score }, lastOfBlock: index === filled.length - 1 })
    })
    if (!filled.length) frames.push({ key: `${blockIndex}:0`, minute: block.minute, events: [], score: { ...score }, lastOfBlock: true })
  })
  return frames
}

/** Sounds a revealed frame triggers. The caller keeps a ledger keyed by frame so pause, speed or replay never repeat them. */
export function frameSounds(frame: LiveFrame): readonly SoundId[] {
  const sounds: SoundId[] = []
  if (frame.events.some((item) => item.type === 'goal')) sounds.push('goal')
  else if (frame.events.some((item) => item.type === 'shot' || item.type === 'save')) sounds.push('shot')
  if (frame.lastOfBlock && frame.minute === 45) sounds.push('halfTimeWhistle')
  if (frame.lastOfBlock && frame.minute === 90) sounds.push('finalWhistle')
  return sounds
}

/** The last attack-like event of a frame decides what the board shows. Null before anything is revealed. */
export function frameFocus(frame: LiveFrame | undefined): MatchEvent | null {
  if (!frame) return null
  const priority = ['goal', 'save', 'shot', 'attack', 'recovery'] as const
  for (const type of priority) { const found = frame.events.find((item) => item.type === type); if (found) return found }
  return null
}
