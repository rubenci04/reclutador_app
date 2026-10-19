import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { generateCpuTeam } from './cpuTeam'
import { simulateMatch } from './simulator'
import { MATCH_RULES_VERSION } from './matchTypes'
import { playbackFrames, visibleStats } from './playback'

describe('opportunity playback', () => {
  const input = { localLineup: generateCpuTeam(DRAFT_CATALOG, 'playback-local').team.lineup, cpuLineup: generateCpuTeam(DRAFT_CATALOG, 'playback-cpu').team.lineup, catalog: DRAFT_CATALOG, seed: 'playback-v2', catalogVersion: 'catalog_v1' as const, rulesVersion: MATCH_RULES_VERSION }
  it('reveals 24 separate opportunities preserving events, goals, substitutions and final score', () => {
    const result = simulateMatch({ ...input, actionModel: 'action-v2' })
    const frames = playbackFrames(result)
    expect(frames).toHaveLength(24)
    expect(frames.every((f) => f.events.filter((e) => e.type === 'attack').length === 1)).toBe(true)
    expect(frames.flatMap((f) => f.events)).toEqual(result.blocks.flatMap((b) => b.events))
    expect(frames.at(-1)?.score).toEqual(result.score)
    expect(visibleStats([]).local.shots).toBe(0)
    const stats = visibleStats(frames.flatMap((f) => f.events))
    for (const side of ['local', 'cpu'] as const) for (const stat of ['shots', 'shotsOnTarget', 'saves', 'recoveries'] as const) expect(stats[side][stat]).toBe(result.stats[side][stat])
  })
  it('retains the six-block playback of earlier versions', () => {
    for (const actionModel of [undefined, 'action-v1'] as const) {
      const result = simulateMatch({ ...input, actionModel })
      expect(playbackFrames(result)).toBe(result.blocks)
    }
  })
})
