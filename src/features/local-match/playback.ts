import type { MatchBlock, MatchEvent, MatchResult, MatchSide, MatchStats } from './matchTypes'

/** Reveal one opportunity at a time; never change the stored match or its seed. */
export function playbackFrames(result: MatchResult): readonly MatchBlock[] {
  if (result.actionModel !== 'action-v2') return result.blocks
  const frames: MatchBlock[] = []
  const score = { local: 0, cpu: 0 }
  for (const block of result.blocks) {
    let events: MatchEvent[] = []
    let hasAttack = false
    const flush = () => {
      for (const item of events) if (item.type === 'goal' && item.side) score[item.side]++
      frames.push({ minute: block.minute, events, score: { ...score } })
    }
    for (const item of block.events) {
      if (item.type === 'attack' && hasAttack) { flush(); events = [] }
      if (item.type === 'attack') hasAttack = true
      events.push(item)
    }
    if (events.length) flush()
  }
  return frames
}

export function visibleStats(events: readonly MatchEvent[]): Record<MatchSide, MatchStats> {
  const empty = () => ({ shots: 0, shotsOnTarget: 0, saves: 0, recoveries: 0, possession: 50 })
  const stats = { local: empty(), cpu: empty() }
  const attacks = { local: 0, cpu: 0 }
  for (const event of events) {
    if (!event.side) continue
    const side = event.side; const other = side === 'local' ? 'cpu' : 'local'
    if (event.type === 'attack') attacks[side]++
    if (event.type === 'shot') stats[side].shots++
    if (event.type === 'goal') { stats[side].shots++; stats[side].shotsOnTarget++ }
    if (event.type === 'save') { stats[side].saves++; stats[other].shots++; stats[other].shotsOnTarget++ }
    if (event.type === 'recovery') stats[side].recoveries++
  }
  const total = attacks.local + attacks.cpu
  stats.local.possession = total ? Math.round(attacks.local / total * 100) : 50
  stats.cpu.possession = 100 - stats.local.possession
  return stats
}
