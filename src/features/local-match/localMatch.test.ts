import { describe, expect, it } from 'vitest'
import type { Player } from '../../types/player'
import { DRAFT_CATALOG } from '../draft/catalog'
import { createEmptyLineup } from '../draft/draftModel'
import { DRAFT_SLOTS, type DraftLineup } from '../draft/draftTypes'
import { generateCpuTeam } from './cpuTeam'
import { runBalanceDiagnostic } from './balanceDiagnostics'
import { MATCH_RULES_VERSION } from './matchTypes'
import { calculateTeamStrength, simulateMatch } from './simulator'

function validLineup(catalog: readonly Player[], offset = 0): DraftLineup {
  const lineup = createEmptyLineup()
  const used = new Set<string>()
  for (const slot of DRAFT_SLOTS) {
    const options = catalog.filter((player) => player.position === slot.position && !used.has(player.id)).sort((left, right) => left.price - right.price || left.id.localeCompare(right.id))
    const player = options[Math.min(offset, options.length - 1)]
    lineup[slot.id] = player.id; used.add(player.id)
  }
  return lineup
}

function simulate(seed: string) {
  const cpu = generateCpuTeam(DRAFT_CATALOG, `cpu-${seed}`)
  return simulateMatch({ localLineup: validLineup(DRAFT_CATALOG), cpuLineup: cpu.team.lineup, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed })
}

describe('local CPU match', () => {
  it('builds a valid seeded CPU 4-3-3 under 100M, preferring the target band', () => {
    const cpu = generateCpuTeam(DRAFT_CATALOG, 'cpu-proof')
    expect(cpu.team.players).toHaveLength(11)
    expect(new Set(cpu.team.players.map((player) => player.id)).size).toBe(11)
    expect(cpu.team.spent).toBeLessThanOrEqual(100)
    expect(cpu.targetReached).toBe(true)
    expect(cpu.team.players.filter((player) => player.position === 'ARQ')).toHaveLength(1)
    expect(cpu.team.players.filter((player) => player.position === 'DEF')).toHaveLength(4)
    expect(cpu.team.players.filter((player) => player.position === 'MED')).toHaveLength(3)
    expect(cpu.team.players.filter((player) => player.position === 'DEL')).toHaveLength(3)
  })
  it('is reproducible for a seed and varies under a different explicit seed', () => {
    const first = generateCpuTeam(DRAFT_CATALOG, 'same'); const second = generateCpuTeam(DRAFT_CATALOG, 'same')
    expect(first).toEqual(second)
    const variants = new Set(Array.from({ length: 10 }, (_, index) => generateCpuTeam(DRAFT_CATALOG, `variant-${index}`).team.players.map((player) => player.id).join(',')))
    expect(variants.size).toBeGreaterThan(1)
    expect(simulate('repeat')).toEqual(simulate('repeat'))
  })
  it('falls back to the best legal budget when no target-band combination exists', () => {
    const inexpensive = DRAFT_SLOTS.map((slot, index) => ({ ...DRAFT_CATALOG.find((player) => player.position === slot.position)!, id: `plr_9${String(index).padStart(2, '0')}`, price: 3 }))
    const cpu = generateCpuTeam(inexpensive, 'fallback')
    expect(cpu.targetReached).toBe(false)
    expect(cpu.team.spent).toBe(33)
  })
  it('rejects an invalid local lineup and derives strengths from positional attributes', () => {
    const cpu = generateCpuTeam(DRAFT_CATALOG, 'valid')
    expect(() => simulateMatch({ localLineup: createEmptyLineup(), cpuLineup: cpu.team.lineup, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: 'bad' })).toThrow('invalid_match_lineup')
    const result = simulate('strengths')
    expect(result.strengths.local.defense).toBeGreaterThan(0)
    expect(result.strengths.local.midfield).toBeGreaterThan(0)
    expect(result.strengths.local.attack).toBeGreaterThan(0)
    const reinforced = { ...result.local, players: result.local.players.map((player) => player.position === 'ARQ' || player.position === 'DEF' ? { ...player, def_rating: 99 } : player) }
    expect(calculateTeamStrength(reinforced).defense).toBeGreaterThan(result.strengths.local.defense)
    const sharper = { ...result.local, players: result.local.players.map((player) => ({ ...player, att_rating: 99 })) }
    const tougher = { ...result.local, players: result.local.players.map((player) => ({ ...player, phy_rating: 99, men_rating: 99 })) }
    expect(calculateTeamStrength(sharper).attack).toBeGreaterThan(result.strengths.local.attack)
    expect(calculateTeamStrength(tougher).midfield).toBeGreaterThan(result.strengths.local.midfield)
  })
  it('keeps score, goals and derived statistics coherent across the six blocks', () => {
    const result = simulate('events')
    expect(result.blocks).toHaveLength(6)
    const events = result.blocks.flatMap((block) => block.events)
    for (const side of ['local', 'cpu'] as const) {
      const goals = events.filter((event) => event.type === 'goal' && event.side === side).length
      const shots = events.filter((event) => event.type === 'shot' && event.side === side).length + goals + events.filter((event) => event.type === 'save' && event.side !== side).length
      const onTarget = goals + events.filter((event) => event.type === 'save' && event.side !== side).length
      expect(result.score[side]).toBe(goals)
      expect(result.stats[side].shots).toBe(shots)
      expect(result.stats[side].shotsOnTarget).toBe(onTarget)
      expect(result.stats[side].recoveries).toBe(events.filter((event) => event.type === 'recovery' && event.side === side).length)
    }
    expect(events.filter((event) => event.type === 'final')).toHaveLength(1)
    expect(result.stats.local.possession + result.stats.cpu.possession).toBe(100)
  })
  it('runs a deterministic 2,400-match diagnostic by matchup and relative strength', () => {
    const diagnostic = runBalanceDiagnostic(DRAFT_CATALOG)
    expect(diagnostic.totalMatches).toBe(2400)
    expect(diagnostic.scenarios).toHaveLength(3)
    for (const scenario of diagnostic.scenarios) {
      expect(scenario.outcomes.local + scenario.outcomes.cpu + scenario.outcomes.draw).toBe(800)
      expect(scenario.goals).toBeGreaterThan(0)
      expect(Object.values(scenario.scorelines).reduce((sum, count) => sum + count, 0)).toBe(800)
      expect(Object.values(scenario.relativeStrength).reduce((sum, count) => sum + count, 0)).toBe(800)
    }
    expect(runBalanceDiagnostic(DRAFT_CATALOG, 8)).toEqual(runBalanceDiagnostic(DRAFT_CATALOG, 8))
  }, 30_000)
})
