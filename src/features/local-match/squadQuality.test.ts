import { describe, expect, it } from 'vitest'
import { writeFileSync } from 'node:fs'
import type { Player } from '../../types/player'
import { DRAFT_SLOTS, type DraftLineup } from '../draft/draftTypes'
import { coachEffect } from '../coaches/coachRules'
import { MATCH_RULES_VERSION } from './matchTypes'
import { composeStrength, QUALITY_BONUS_CAP, squadQuality, squadTier } from './squadQuality'
import { simulateMatch, initiativeChance } from './simulator'
import { TACTICS_VERSION } from '../tactics/strategies'

// Synthetic sporting fixtures; price is fixed to isolate quality from spending.
const team = (prefix: string, rating: number, attributes = 80): Player[] => DRAFT_SLOTS.map((slot, index) => ({ id: `${prefix}_${index}`, name: `Synthetic ${prefix} ${index}`, position: slot.position, category: 'contemporary', reference_year: 2020, era: '2020s', nationality: 'ARG', club_tag: 'fixture', overall_rating: rating, att_rating: attributes, def_rating: attributes, phy_rating: attributes, men_rating: attributes, price: 1 }))
const lineup = (players: readonly Player[]): DraftLineup => Object.fromEntries(DRAFT_SLOTS.map((slot, index) => [slot.id, players[index].id])) as DraftLineup
const inputFor = (local: Player[], cpu: Player[], seed: string) => ({ localLineup: lineup(local), cpuLineup: lineup(cpu), catalog: [...local, ...cpu], catalogVersion: 'catalog_v1' as const, rulesVersion: MATCH_RULES_VERSION, seed })

describe('bounded squad quality', () => {
  it('distinguishes S+ at 98 without changing catalog tiers, and increases with each upgrade', () => {
    expect([75, 79, 84, 89, 94, 97, 98, 99].map((overall_rating) => squadTier({ overall_rating }))).toEqual(['D', 'C', 'B', 'A', 'S', 'S', 'S+', 'S+'])
    const players = team('local', 75)
    let previous = 0
    for (const index of players.keys()) {
      players[index] = { ...players[index], overall_rating: 98 }
      const quality = squadQuality(players)
      expect(quality.bonus).toBeGreaterThanOrEqual(previous)
      expect(quality.bonus).toBeLessThanOrEqual(QUALITY_BONUS_CAP)
      expect(quality.counts['S+']).toBe(index + 1)
      previous = quality.bonus
    }
    expect(previous).toBe(3)
    expect(squadQuality(players.map((player) => ({ ...player, nationality: 'JPN', category: 'legend', price: 8 })))).toEqual(squadQuality(players))
  })

  it('shares exact bonus composition and keeps initiative symmetric', () => {
    const base = { attack: 80, defense: 80, midfield: 80, global: 80 }
    const plus = composeStrength(base, 2, coachEffect({ tier: 'S', focus: 'ATTACK' }), { attack: 1, defense: -1, midfield: 0 })
    expect(plus.attack).toBe(85.5)
    expect(plus.global).toBe(83.7)
    expect(initiativeChance(plus, base)).toBeGreaterThan(.5)
    expect(initiativeChance(plus, base) + initiativeChance(base, plus)).toBeCloseTo(1, 12)
  })

  it('records tier composition and actual mean effects, while classic simulations remain unchanged', () => {
    const local = team('local', 98), cpu = team('cpu', 75)
    const input = inputFor(local, cpu, 'tiers-replay')
    const classic = simulateMatch(input)
    expect(classic.quality).toBeUndefined()
    expect(simulateMatch({ ...input, rosterBonus: false })).toEqual(classic)
    const result = simulateMatch({ ...input, rosterBonus: true })
    expect(result.quality?.initial.local.counts['S+']).toBe(11)
    expect(result.quality?.meanBonus).toEqual({ local: 3, cpu: 0 })
    expect(result.strengths.local).toEqual(result.strengths.cpu)
    expect(simulateMatch({ ...input, rosterBonus: true })).toEqual(result)
  })

  it('counts only players on the pitch after substitutions', () => {
    const local = team('local', 75), cpu = team('cpu', 75)
    const incoming = { ...local[8], id: 'elite_bench', overall_rating: 99 }
    for (let seed = 0; seed < 40; seed++) {
      const input = inputFor(local, cpu, `quality-sub-${seed}`)
      const result = simulateMatch({ ...input, catalog: [...input.catalog, incoming], rosterBonus: true, benches: { local: [incoming.id], cpu: [] } })
      expect(result.quality?.initial.local.bonus).toBe(0)
      const substitution = result.substitutions?.events[0]
      // The entering S+ adds .6 only for blocks at or after his substitution.
      const blocksOnPitch = substitution ? [15, 30, 45, 60, 75, 90].filter((minute) => minute >= substitution.minute).length : 0
      expect(result.quality?.meanBonus.local).toBe(Math.round(.6 * blocksOnPitch / 6 * 100) / 100)
    }
  })
})

it('calibrates equal teams, tier quality and combined quality/coach/tactics over 6,000 matches', () => {
  const scenarios = [
    { name: 'equal', local: team('local', 84), cpu: team('cpu', 84), coach: false },
    { name: 'tier_only', local: team('local', 98), cpu: team('cpu', 75), coach: false },
    { name: 'stronger_roster_coach_tactic', local: team('local', 94, 92), cpu: team('cpu', 79, 79), coach: true },
  ]
  const results = scenarios.map((scenario) => {
    const totals = { name: scenario.name, games: 2000, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }
    for (let index = 0; index < totals.games; index++) {
      const result = simulateMatch({ ...inputFor(scenario.local, scenario.cpu, `quality-balance-${index}`), rosterBonus: true,
        ...(scenario.coach ? { coaches: { local: { id: 'synthetic_coach', ...coachEffect({ tier: 'S', focus: 'MIDFIELD' }, 'MIDFIELD_CONTROL') }, cpu: null }, tactics: { version: TACTICS_VERSION, local: 'MIDFIELD_CONTROL' as const, cpu: 'NEUTRAL' as const } } : {}) })
      totals[result.winner === 'local' ? 'wins' : result.winner === 'cpu' ? 'losses' : 'draws']++
      totals.goalsFor += result.score.local; totals.goalsAgainst += result.score.cpu
      expect(result.stats.local.possession + result.stats.cpu.possession).toBe(100)
    }
    return totals
  })
  expect(Math.abs(results[0].wins - results[0].losses) / 2000).toBeLessThan(.05)
  expect(results[1].wins).toBeGreaterThan(results[0].wins)
  expect(results[2].wins).toBeGreaterThan(results[1].wins)
  expect(results[2].losses).toBeGreaterThan(0)
  writeFileSync('docs/qa/SIMULATION-COACHES-calibration.json', JSON.stringify({ version: 'squad-quality-v1', synthetic: true, results }, null, 2) + '\n')
})
