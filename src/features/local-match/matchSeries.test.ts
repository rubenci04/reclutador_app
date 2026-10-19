import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { generateCpuTeam } from './cpuTeam'
import { MATCH_RULES_VERSION } from './matchTypes'
import { simulateMatch, type SimulationInput } from './simulator'
import { nextSeriesMatch, resolveSeries, seriesPenalties, seriesStanding } from './matchSeries'
import { onlineHistoryEntry } from '../online/onlineDuel'
import { createRecruiterDuel } from '../recruiter-duel/auctionEngine'

const localLineup = generateCpuTeam(DRAFT_CATALOG, 'series-local').team.lineup
const cpuLineup = generateCpuTeam(DRAFT_CATALOG, 'series-cpu').team.lineup
const input: SimulationInput = { localLineup, cpuLineup, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: 'series', actionModel: 'action-v1', rosterBonus: true, coaches: { local: { id: 'coach', attack: 2, defense: 1, midfield: 1 }, cpu: null }, tactics: { version: 'tactics-v1', local: 'HIGH_PRESS', cpu: 'LOW_BLOCK' } }

describe('three matches plus two tiebreaks', () => {
  it('plays three before deciding, adds exactly two after a tie, and requires penalties when still tied', () => {
    const base = simulateMatch(input)
    const win = { ...base, winner: 'local' as const }; const loss = { ...base, winner: 'cpu' as const }; const draw = { ...base, winner: 'draw' as const }
    expect(seriesStanding([win, win]).closed).toBe(false)
    expect(seriesStanding([win, draw, loss])).toMatchObject({ closed: false })
    expect(seriesStanding([win, draw, loss, win]).closed).toBe(false)
    expect(seriesStanding([win, draw, loss, win, loss])).toMatchObject({ closed: true, needsPenalties: true })
    expect(seriesStanding([win, draw, win])).toMatchObject({ closed: true, wins: { local: 2, cpu: 0 } })
  })
  it('keeps both teams, coaches and strategies with a fresh reproducible seed; penalties always resolve', () => {
    const outside = DRAFT_CATALOG.filter((p) => ![...Object.values(localLineup), ...Object.values(cpuLineup)].includes(p.id) && p.position !== 'ARQ')
    const first = simulateMatch({ ...input, benches: { local: outside.slice(0, 3).map((p) => p.id), cpu: outside.slice(3, 6).map((p) => p.id) } })
    const next = nextSeriesMatch(first, 2, DRAFT_CATALOG)
    expect(next).toEqual(nextSeriesMatch(first, 2, DRAFT_CATALOG))
    expect(next.seed).not.toBe(first.seed)
    expect(next.local).toEqual(first.local); expect(next.cpu).toEqual(first.cpu)
    expect(next.coaches).toEqual(first.coaches); expect(next.tactics?.selection).toEqual(first.tactics?.selection)
    expect(next.benches).toEqual(first.benches)
    for (let index = 0; index < 100; index++) {
      const first = { ...simulateMatch(input), seed: `penalties-${index}` }
      const penalties = seriesPenalties(first)
      expect(penalties.score.local).not.toBe(penalties.score.cpu)
      expect(penalties).toEqual(seriesPenalties(first))
    }
  })
  it('gives online participants the same series winner with mirrored history and no shared input mutation', () => {
    const created = createRecruiterDuel(DRAFT_CATALOG, 'online-series')
    if (!created.ok) throw new Error(created.error)
    const first = simulateMatch(input)
    const initial = structuredClone(first)
    const game = { ...created.game, phase: 'SIMULATING' as const, matchResult: first }
    const series = resolveSeries(first, DRAFT_CATALOG)
    expect(first).toEqual(initial)
    expect(series.matches.length === 3 || series.matches.length === 5).toBe(true)
    const host = onlineHistoryEntry(game, 'recruiter_one', null)!
    const guest = onlineHistoryEntry(game, 'recruiter_two', null)!
    expect(host.outcome).not.toBe('draw')
    expect(guest.outcome).not.toBe(host.outcome)
    expect(host.score?.recruiter_one).toBe(guest.score?.recruiter_two)
    expect(host.score?.recruiter_two).toBe(guest.score?.recruiter_one)
  })
})

describe.each(['action-v1', 'action-v2'] as const)('%s calibration', (actionModel) => {
  it('adds activity and increases winning chances progressively at 2, 3 and 5 global points', () => {
    const selected = new Set(Object.values(localLineup))
    const cpuSelected = new Set(Object.values(cpuLineup))
    // Independent unique elevens; uniform synthetic attributes isolate global power.
    const localPlayers = DRAFT_CATALOG.filter((p) => selected.has(p.id)).map((p) => ({ ...p, id: `local_${p.id}` }))
    const cpuPlayers = DRAFT_CATALOG.filter((p) => cpuSelected.has(p.id)).map((p) => ({ ...p, id: `cpu_${p.id}` }))
    const line = (original: typeof localLineup, prefix: string) => Object.fromEntries(Object.entries(original).map(([slot, id]) => [slot, `${prefix}_${id}`])) as typeof localLineup
    const outcomes: { delta: number; wins: number; draws: number; goals: number; goalless: number }[] = []
    for (const delta of [0, 2, 3, 4, 5]) {
      const catalog = [...localPlayers.map((p) => ({ ...p, overall_rating: 80 + delta, att_rating: 80 + delta, def_rating: 80 + delta, phy_rating: 80 + delta, men_rating: 80 + delta, price: 3 })), ...cpuPlayers.map((p) => ({ ...p, overall_rating: 80, att_rating: 80, def_rating: 80, phy_rating: 80, men_rating: 80, price: 3 }))]
      let wins = 0; let draws = 0; let goals = 0; let goalless = 0
      for (let index = 0; index < 1500; index++) {
        const match = simulateMatch({ localLineup: line(localLineup, 'local'), cpuLineup: line(cpuLineup, 'cpu'), catalog, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: `action-balance-${index}`, actionModel })
        if (match.winner === 'local') wins++
        if (match.winner === 'draw') draws++
        goals += match.score.local + match.score.cpu
        if (match.score.local + match.score.cpu === 0) goalless++
        if (index === 0) {
          expect(match.blocks.flatMap((b) => b.events).filter((e) => e.type === 'attack')).toHaveLength(actionModel === 'action-v2' ? 24 : 18)
          expect(match.stats.local.possession + match.stats.cpu.possession).toBe(100)
          expect(match.blocks.flatMap((b) => b.events).filter((e) => e.type === 'goal')).toHaveLength(match.score.local + match.score.cpu)
        }
      }
      outcomes.push({ delta, wins, draws, goals, goalless })
    }
    console.info(`${actionModel} calibration / 1500 seeds per margin`, JSON.stringify(outcomes))
    expect(outcomes[0].wins / 1500).toBeGreaterThan(.3)
    expect(outcomes[0].wins / 1500).toBeLessThan(.45)
    for (let index = 1; index < outcomes.length; index++) expect(outcomes[index].wins).toBeGreaterThan(outcomes[index - 1].wins)
    expect(outcomes[3].wins / 1500).toBeGreaterThan(.55)
    expect(outcomes[3].wins / 1500).toBeLessThan(.9)
    if (actionModel === 'action-v2') {
      expect(outcomes.every((o) => o.goalless / 1500 < .035)).toBe(true)
      expect(outcomes[0].goals / 1500).toBeGreaterThan(4)
      expect(outcomes[2].wins / 1500).toBeGreaterThan(.65)
    }
  }, 30_000)
})
