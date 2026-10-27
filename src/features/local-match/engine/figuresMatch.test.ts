import { describe, expect, it } from 'vitest'
import type { Player } from '../../../types/player'
import { DRAFT_CATALOG } from '../../draft/catalog'
import { createEmptyLineup } from '../../draft/draftModel'
import { DRAFT_SLOTS } from '../../draft/draftTypes'
import { MATCH_MINUTES, MATCH_RULES_VERSION } from '../matchTypes'
import { simulateMatch, type SimulationInput } from '../simulator'
import { ENGINE_VERSION, SEGMENTS } from './engineConstants'
import { baseLines, playMatch, simulateFiguresMatch } from './figuresMatch'

/** Synthetic attribute-controlled squads, never inserted into the sporting catalog. */
function fixture(gap: number) {
  const catalog: Player[] = []
  const a = createEmptyLineup(); const b = createEmptyLineup()
  for (const [side, lineup] of [['a', a], ['b', b]] as const) {
    DRAFT_SLOTS.forEach((slot, index) => {
      const extra = side === 'a' ? gap : 0
      const player: Player = { ...DRAFT_CATALOG.find((candidate) => candidate.position === slot.position)!, id: `fixture_${side}_${index}`, name: `Fixture ${side} ${index}`, position: slot.position, price: 4, overall_rating: 80, att_rating: 80 + extra, def_rating: 70 + extra, phy_rating: 75 + extra, men_rating: 75 + extra }
      catalog.push(player); lineup[slot.id] = player.id
    })
  }
  return { catalog, a, b }
}
const input = (gap: number, seed: string, extra: Partial<SimulationInput> = {}): SimulationInput => {
  const { catalog, a, b } = fixture(gap)
  return { localLineup: a, cpuLineup: b, catalog, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed, engineVersion: ENGINE_VERSION, actionModel: 'action-v3', ...extra }
}

describe('figures engine on real lineups', () => {
  it('stamps the engine version and keeps score, blocks and statistics coherent', () => {
    for (let index = 0; index < 40; index++) {
      const r = playMatch(input(5, `integration-${index}`))
      expect(r.engineVersion).toBe(ENGINE_VERSION)
      expect(r.blocks.map((b) => b.minute)).toEqual([...MATCH_MINUTES])
      const events = r.blocks.flatMap((b) => b.events)
      for (const side of ['local', 'cpu'] as const) {
        expect(events.filter((e) => e.type === 'goal' && e.side === side).length).toBe(r.score[side])
        const other = side === 'local' ? 'cpu' : 'local'
        expect(r.stats[side].saves).toBe(events.filter((e) => e.type === 'save' && e.side === side).length)
        expect(r.stats[side].shotsOnTarget).toBe(r.score[side] + r.stats[other].saves)
        expect(r.stats[side].shots).toBeGreaterThanOrEqual(r.stats[side].shotsOnTarget)
      }
      expect(r.stats.local.possession + r.stats.cpu.possession).toBe(100)
      expect(r.blocks[SEGMENTS - 1].score).toEqual(r.score)
      expect(r.moments!.length).toBeLessThanOrEqual(6)
    }
  })
  it('same seed gives the same match; the classic simulator is untouched and carries no engine version', () => {
    expect(playMatch(input(0, 'det-1'))).toEqual(playMatch(input(0, 'det-1')))
    const { engineVersion: _unused, ...classic } = input(0, 'det-2')
    void _unused
    expect(playMatch(classic).engineVersion).toBeUndefined()
    expect(playMatch(classic)).toEqual(simulateMatch(classic))
  })
  it('the stronger squad wins most of the time and the lines follow the ratings', () => {
    let wins = 0
    for (let index = 0; index < 400; index++) { const r = playMatch(input(10, `strong-${index}`)); if (r.winner === 'local') wins++ }
    expect(wins / 400).toBeGreaterThan(0.55)
    const { catalog, a, b } = fixture(10)
    const players = (lineup: typeof a) => Object.values(lineup).map((id) => catalog.find((p) => p.id === id)!)
    expect(baseLines(players(a)).attack).toBeGreaterThan(baseLines(players(b)).attack + 9)
  })
  it('step by step: waits for the quality of a person and finishes with the same shape', () => {
    const config = input(0, 'steps-int')
    let qualities: Record<number, number> = {}
    let run = simulateFiguresMatch(config, { humanSides: ['local'], qualities })
    let asked = 0
    while (!run.result) { asked++; qualities = { ...qualities, [run.waiting!.segment]: 0.8 }; run = simulateFiguresMatch(config, { humanSides: ['local'], qualities }) }
    expect(asked).toBeGreaterThan(0)
    expect(run.result.moments!.some((m) => !m.automatic)).toBe(true)
  })
})
