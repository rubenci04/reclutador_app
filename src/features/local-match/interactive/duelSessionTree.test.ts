import { describe, expect, it } from 'vitest'
import type { RecruiterDuelGame } from '../../recruiter-duel/auctionTypes'
import { createRecruiterDuel } from '../../recruiter-duel/auctionEngine'
import { createDuelSession } from './duelSession'
import { liveInput, must } from './liveFixtures.test-support'
import { nextLiveSession } from './liveModel'

function teamsCompleted(): { game: RecruiterDuelGame; catalog: ReturnType<typeof liveInput>['catalog'] } {
  const input = liveInput()
  const created = createRecruiterDuel(input.catalog, 'tree-boundary')
  if (!created.ok) throw new Error(created.error)
  const team = (lineup: typeof input.localLineup, side: 'local' | 'cpu') => ({ lineup, formation: '4-3-3' as const, spent: 69, bench: input.benches![side].map((id) => ({ playerId: id, position: input.catalog.find((p) => p.id === id)!.position })) })
  return { catalog: input.catalog, game: { ...created.game, phase: 'TEAMS_COMPLETED', config: { version: 1, budget: 150, substitutes: true, coaches: false, names: { recruiter_one: null, recruiter_two: null } }, teams: { recruiter_one: team(input.localLineup, 'local'), recruiter_two: team(input.cpuLineup, 'cpu') } } }
}

describe('SIM-005R-02 boundary: only the CPU duel opts in', () => {
  it('enables attack-tree-v1 for a CPU duel, keeps it in later games of the series and leaves hot-seat on the previous flow', () => {
    const { game, catalog } = teamsCompleted(); const strategies = { recruiter_one: 'HIGH_PRESS', recruiter_two: 'LOW_BLOCK' } as const
    const cpu = must(createDuelSession(game, catalog, strategies, true))
    expect(cpu.options.attackTree).toEqual({ version: 'attack-tree-v1' }); expect(cpu.kernel.tree).toMatchObject({ started: 0, limit: 3, log: [] }); expect(cpu.kernel.partial).toBeNull()
    const hotSeat = must(createDuelSession(game, catalog, strategies))
    expect(hotSeat.options.attackTree).toBeUndefined(); expect(hotSeat.kernel.tree).toBeUndefined()
    const second = must(nextLiveSession(cpu, 2, { lineups: { local: cpu.kernel.input.localLineup, cpu: cpu.kernel.input.cpuLineup }, benches: cpu.kernel.input.benches, formations: cpu.kernel.input.formations, tactics: { local: 'LOW_BLOCK', cpu: 'HIGH_PRESS' } }))
    expect(second.kernel.tree).toMatchObject({ started: 0, log: [] }); expect(second.kernel.rng.tree).not.toEqual(cpu.kernel.rng.tree)
  })
})
