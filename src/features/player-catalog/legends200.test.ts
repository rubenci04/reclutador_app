import { describe, expect, it } from 'vitest'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { catalogKey } from '../recruiter-duel/drawHistory'
import { createRecruiterDuel } from '../recruiter-duel/auctionEngine'
import { CLASSIC_CONFIG, preflightMatchConfig } from '../recruiter-duel/matchConfig'
import { personKey } from './globalCollection'
import { defaultBudgetForMode } from './leagueCollections'
import { categoryRanking } from './categoryRanking'
import { RECORDED_COLLECTIONS, recordedCollection } from './recordedCollections'
import type { ThemedModeId } from '../themed-modes/modeTypes'

// legends-200-v1: the nostalgic categories open to 200 cards wherever the database holds them.
const TWO_HUNDRED = ['LEGENDS_ONLY', 'SOUTH_AMERICA_LEGENDS', 'EUROPE_LEGENDS', 'ITALY_LEGENDS'] as const satisfies readonly ThemedModeId[]
// These leagues supply exactly 150 legend rows; going to 200 needs 50 new editorial rows each.
const STILL_150 = ['ARGENTINA_LEGENDS', 'BRAZIL_LEGENDS', 'MEXICO_LEGENDS', 'SPAIN_LEGENDS', 'ENGLAND_LEGENDS'] as const satisfies readonly ThemedModeId[]

describe('legends-200-v1', () => {
  it.each(TWO_HUNDRED)('%s plays with 200 distinct people, only legends, ranked 1 to 200, and is playable', (mode) => {
    const pool = catalogForMode(mode)
    expect(pool).toHaveLength(200)
    expect(new Set(pool.map(personKey)).size).toBe(200)
    expect(new Set(pool.map((p) => p.id)).size).toBe(200)
    expect(pool.every((p) => p.category === 'legend')).toBe(true)
    expect(categoryRanking(mode).size).toBe(200)
    for (const position of ['ARQ', 'DEF', 'MED', 'DEL'] as const) expect(pool.filter((p) => p.position === position).length, position).toBeGreaterThanOrEqual(8)
    const config = { ...CLASSIC_CONFIG, budget: defaultBudgetForMode(mode), coaches: true, coachReserve: 8 }
    expect(preflightMatchConfig(pool, config)).toMatchObject({ ok: true })
    expect(createRecruiterDuel(pool, `legends-200-${mode}`, undefined, config).ok).toBe(true)
  })
  it('keeps the other leagues at the rows the database supplies and every current category at 150', () => {
    for (const mode of STILL_150) expect(catalogForMode(mode), mode).toHaveLength(150)
    for (const mode of ['GLOBAL_CLASSIC', 'ARGENTINA_CURRENT', 'BRAZIL_CURRENT', 'MEXICO_CURRENT', 'SPAIN_LEAGUE', 'ENGLAND_LEAGUE', 'ITALY_CURRENT', 'SOUTH_AMERICA_CURRENT', 'EUROPE_CURRENT'] as const) expect(catalogForMode(mode), mode).toHaveLength(150)
  })
  it('freezes the 150-card pools of the four categories so games played before the change still replay exactly', () => {
    for (const mode of TWO_HUNDRED) {
      const frozen = RECORDED_COLLECTIONS.filter((row) => row.mode === mode && row.players.length === 150)
      expect(frozen.length, mode).toBeGreaterThan(0)
      for (const row of frozen) expect(recordedCollection(catalogKey(row.players))).toBe(row.players)
    }
  })
})
