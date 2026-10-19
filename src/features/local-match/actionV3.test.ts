import { describe, expect, it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { DRAFT_SLOTS, type DraftLineup } from '../draft/draftTypes'
import { GLOBAL_CURRENT, ALL_GLOBAL_LEGENDS } from '../player-catalog/globalCollection'
import { LEAGUE_PLAYERS } from '../player-catalog/leagueCollections'
import { COACH_CATALOG } from '../coaches/coachCatalog'
import { coachEffect } from '../coaches/coachRules'
import { MATCH_RULES_VERSION } from './matchTypes'
import { simulateMatch, type SimulationInput } from './simulator'
import { opportunityChances, finishingChance } from './probabilityModel'
import { playbackFrames } from './playback'

const catalog = [...GLOBAL_CURRENT, ...ALL_GLOBAL_LEGENDS, ...LEAGUE_PLAYERS].filter((p, i, all) => all.findIndex((q) => q.id === p.id) === i)
const lineupFor = (names: readonly string[]): DraftLineup => {
  const players = names.map((name) => { const p = catalog.find((p) => p.name === name); if (!p) throw new Error(name); return p })
  const used = new Set<string>()
  return Object.fromEntries(DRAFT_SLOTS.map((slot) => { const p = players.find((p) => !used.has(p.id) && p.position === slot.position); if (!p) throw new Error(`position:${slot.id}`); used.add(p.id); return [slot.id, p.id] })) as DraftLineup
}
const local = ['Túlio Maravilha', 'Claudio López', 'Lionel Messi', "Andrés D'Alessandro", 'Roberto Telch', 'Javier Mascherano', 'Alfio Basile', 'Gabriel Heinze', 'Branco', 'Zózimo', 'Zetti']
const cpu = ['Claudio Caniggia', 'Maxi Rodríguez', 'Domingo Tarasconi', 'Elano', 'Pedro Rocha', 'Diego Simeone', 'Luizinho', 'Bellini', 'Gerardo Bedoya', 'Walter Samuel', 'Carlos Germano']

describe('action-v3 measured balance', () => {
  it('keeps complementary opportunities, bounded finishing and a visible star contribution', () => {
    const a = { global: 92.7, attack: 87.98, defense: 91.48, midfield: 98.76 }; const b = { global: 90.7, attack: 92.93, defense: 92.67, midfield: 86.42 }
    expect(opportunityChances(a, b) + opportunityChances(b, a)).toBeCloseTo(1)
    expect(opportunityChances(a, b)).toBeGreaterThan(.61)
    expect(finishingChance(a, b, 1) - finishingChance(a, b, 0)).toBeCloseTo(.012)
    expect(finishingChance(a, b, 20)).toBe(finishingChance(a, b, 3))
  })
  it('measures the reported matchup and progression across margins, including three-loss risk', () => {
    const bianchi = COACH_CATALOG.find((c) => c.surname === 'Bianchi')!
    const bilardo = COACH_CATALOG.find((c) => c.surname === 'Bilardo')!
    const localLineup = lineupFor(local); const cpuLineup = lineupFor(cpu)
    const selected = new Set([...Object.values(localLineup), ...Object.values(cpuLineup)])
    const fixture: SimulationInput = { localLineup, cpuLineup, catalog: catalog.filter((p) => selected.has(p.id)), budget: 150, rulesVersion: MATCH_RULES_VERSION, catalogVersion: 'catalog_v1', seed: 'reported', rosterBonus: true, tactics: { version: 'tactics-v1', local: 'MIDFIELD_CONTROL', cpu: 'COUNTER_ATTACK' }, coaches: { local: { id: bianchi.id, ...coachEffect(bianchi, 'MIDFIELD_CONTROL') }, cpu: { id: bilardo.id, ...coachEffect(bilardo, 'COUNTER_ATTACK') } } }
    const measure = (input: SimulationInput) => {
      let wins = 0; let draws = 0; let zeros = 0; let goals = 0; let streak = 0; let tripleLosses = 0
      for (let i = 0; i < 1500; i++) {
        const result = simulateMatch({ ...input, seed: `v3-calibration:${i}` })
        if (result.winner === 'local') wins++
        if (result.winner === 'draw') draws++
        goals += result.score.local + result.score.cpu
        if (result.score.local + result.score.cpu === 0) zeros++
        streak = result.winner === 'cpu' ? streak + 1 : 0
        if (streak >= 3) tripleLosses++
        if (i === 0 && input.actionModel === 'action-v3') expect(playbackFrames(result)).toHaveLength(24)
      }
      return { samples: 1500, wins, draws, losses: 1500 - wins - draws, zeros, goalsPerGame: goals / 1500, tripleLosses, independentTripleLossRisk: ((1500 - wins - draws) / 1500) ** 3 }
    }
    const reportedBefore = measure({ ...fixture, actionModel: 'action-v2' })
    const reportedAfter = measure({ ...fixture, actionModel: 'action-v3' })
    const margins = [0, 2, 3, 4, 5].map((delta) => {
      const ids = new Set(Object.values(fixture.localLineup))
      const synthetic = fixture.catalog.map((p) => { const rating = 80 + (ids.has(p.id) ? delta : 0); return { ...p, overall_rating: rating, att_rating: rating, def_rating: rating, phy_rating: rating, men_rating: rating, price: 3 } })
      return { delta, ...measure({ ...fixture, catalog: synthetic, rosterBonus: false, coaches: undefined, tactics: undefined, actionModel: 'action-v3' }) }
    })
    const report = { reportedBefore, reportedAfter, effectiveStrengths: simulateMatch({ ...fixture, actionModel: 'action-v3' }).effectiveStrengths, margins }
    console.info('action-v3 calibration', JSON.stringify(report))
    writeFileSync('docs/qa/ACTION-V3-calibration.json', JSON.stringify(report, null, 2) + '\n')
    expect(reportedAfter.wins).toBeGreaterThan(reportedBefore.wins + 120)
    expect(reportedAfter.wins / 1500).toBeGreaterThan(.6)
    expect(reportedAfter.independentTripleLossRisk).toBeLessThan(.03)
    expect(margins[0].wins / 1500).toBeGreaterThan(.3)
    expect(margins[0].wins / 1500).toBeLessThan(.47)
    expect(margins[1].wins / 1500).toBeGreaterThan(.65)
    for (let i = 1; i < margins.length; i++) expect(margins[i].wins).toBeGreaterThan(margins[i - 1].wins)
    expect(margins.every((m) => m.zeros / 1500 < .04)).toBe(true)
  }, 30000)
})
