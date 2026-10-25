import { describe, expect, it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { CATEGORY_GROUPS } from '../themed-modes/categoryTree'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { defaultBudgetForMode } from '../player-catalog/leagueCollections'
import { createRecruiterDuel } from './auctionEngine'
import { createDrawContext } from './drawHistory'
import { CLASSIC_CONFIG } from './matchConfig'

describe('collection size and draw rarity', () => {
  it('keeps all sixteen editions playable without an artificial upper cap', () => {
    const counts = CATEGORY_GROUPS.flatMap((g) => g.modes).map((mode) => {
      const players = catalogForMode(mode)
      expect(players.length, mode).toBeGreaterThanOrEqual(150)
      expect(new Set(players.map(p => p.id)).size).toBe(players.length)
      return { mode, count: players.length, stars: players.filter((p) => p.overall_rating >= 98).length, positions: Object.fromEntries(['ARQ', 'DEF', 'MED', 'DEL'].map((pos) => [pos, players.filter((p) => p.position === pos).length])) }
    })
    if (process.env.WRITE_QA === '1') writeFileSync('docs/qa/COLLECTION-SIZES.json', JSON.stringify(counts, null, 2) + '\n')
  })
  // A larger sample keeps the rare-star ratio statistically stable now that the global pool is larger (few S+ editions).
  const DRAWS = 480
  it.each(['GLOBAL_CLASSIC', 'LEGENDS_ONLY', 'SPAIN_LEGENDS'] as const)('%s keeps S+ rare but obtainable while maintaining seeded variety and exclusive positions', (mode) => {
    const catalog = catalogForMode(mode)
    const byId = new Map(catalog.map((p) => [p.id, p]))
    const config = { ...CLASSIC_CONFIG, budget: defaultBudgetForMode(mode), coaches: true, coachReserve: 8 }
    let baselineStars = 0; let rareStars = 0
    const unique = new Set<string>(); const signatures = new Set<string>()
    for (let i = 0; i < DRAWS; i++) {
      for (const policy of [undefined, 'rarity-v2'] as const) {
        const result = createRecruiterDuel(catalog, `rarity:${mode}:${i}`, createDrawContext(catalog, [], policy), config)
        expect(result.ok).toBe(true)
        if (!result.ok) continue
        expect(new Set(result.game.rounds.map((r) => r.playerId)).size).toBe(22)
        const stars = result.game.rounds.filter((r) => byId.get(r.playerId)!.overall_rating >= 98).length
        if (policy) {
          rareStars += stars
          result.game.rounds.forEach((r) => unique.add(r.playerId))
          signatures.add(result.game.rounds.map((r) => r.playerId).join(','))
          for (const [pos, count] of [['ARQ', 2], ['DEF', 8], ['MED', 6], ['DEL', 6]] as const) expect(result.game.rounds.filter((r) => r.position === pos)).toHaveLength(count)
        } else baselineStars += stars
      }
    }
    const theoreticalUniformStars = DRAWS * (['ARQ', 'DEF', 'MED', 'DEL'] as const).reduce((sum, pos, i) => sum + [2, 8, 6, 6][i] * catalog.filter((p) => p.position === pos && p.overall_rating >= 98).length / catalog.filter((p) => p.position === pos).length, 0)
    const report = { mode, draws: DRAWS, baselineStars, rareStars, theoreticalUniformStars, uniquePlayers: unique.size, distinctDraws: signatures.size }
    console.info('rarity-v2', JSON.stringify(report))
    if (process.env.WRITE_QA === '1') writeFileSync(`docs/qa/RARITY-${mode}.json`, JSON.stringify(report, null, 2) + '\n')
    // Old economy often eliminated every star. Rarity must not make them impossible.
    expect(rareStars).toBeGreaterThan(0)
    expect(rareStars).toBeLessThan(theoreticalUniformStars * .65)
    expect(rareStars / DRAWS).toBeLessThan(.15)
    expect(unique.size).toBeGreaterThan(catalog.length * .65)
    expect(signatures.size).toBe(DRAWS)
  }, 90000)
})
