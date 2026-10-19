import { describe, expect, it } from 'vitest'
import { CATEGORY_GROUPS } from '../themed-modes/categoryTree'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { defaultBudgetForMode } from '../player-catalog/leagueCollections'
import { generateCpuTeam } from './cpuTeam'
import { MATCH_RULES_VERSION } from './matchTypes'
import { simulateMatch } from './simulator'

describe('action-v2 real collections diagnostic', () => {
  it('reduces goalless matches on all 14 available editions without inventing goals', () => {
    const results = []
    for (const id of CATEGORY_GROUPS.flatMap((g) => [...g.modes])) {
      const catalog = catalogForMode(id); const budget = defaultBudgetForMode(id)
      const localLineup = generateCpuTeam(catalog, `real-${id}-local`, budget - 8).team.lineup
      const owned = new Set(Object.values(localLineup))
      const cpuLineup = generateCpuTeam(catalog.filter((p) => !owned.has(p.id)), `real-${id}-cpu`, budget - 8).team.lineup
      let oldZeros = 0; let newZeros = 0; let oldGoals = 0; let newGoals = 0
      for (let index = 0; index < 300; index++) {
        for (const actionModel of ['action-v1', 'action-v2'] as const) {
          const result = simulateMatch({ localLineup, cpuLineup, catalog, budget, seed: `real-${id}-${index}`, actionModel, rosterBonus: true, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION })
          const goals = result.score.local + result.score.cpu
          if (actionModel === 'action-v1') { oldGoals += goals; if (!goals) oldZeros++ }
          else {
            newGoals += goals; if (!goals) newZeros++
            expect(result.blocks.flatMap((b) => b.events).filter((e) => e.type === 'goal')).toHaveLength(goals)
            expect(result.stats.local.saves + result.score.cpu).toBe(result.stats.cpu.shotsOnTarget)
            expect(result.stats.cpu.saves + result.score.local).toBe(result.stats.local.shotsOnTarget)
          }
        }
      }
      results.push({ id, samples: 300, oldZeros, newZeros, oldGoals, newGoals })
    }
    console.info('Real catalog action comparison', JSON.stringify(results))
    for (const row of results) {
      expect(row.newGoals, row.id).toBeGreaterThan(row.oldGoals)
      expect(row.newZeros / row.samples, row.id).toBeLessThan(.06)
    }
  }, 30_000)
})
