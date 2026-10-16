import { describe, expect, expectTypeOf, it } from 'vitest'
import { CATALOG_VERSION, EXPECTED_PLAYER_IDS, FORMATION_QUOTAS, POSITION_QUOTAS, TIER_RULES } from '../../data/catalogRules'
import { INITIAL_SETUP } from '../../data/initialSetup'
import { PITCH_SLOTS } from '../../data/initialSetup'
import type { Position } from '../../types/football'
import { ERAS, PLAYER_TIERS, type ChemistryIdentity, type Era, type Player, type PlayerCatalog } from '../../types/player'
import { calculatePlayerPrice } from './calculatePlayerPrice'
import { getPlayerTier } from './getPlayerTier'
import { syntheticCatalog, syntheticEleven, syntheticPlayer } from './testFixtures'
import { checkEconomicViability, validateCatalog, validateVersionedCatalog } from './validateCatalog'
import { validatePlayer } from './validatePlayer'

describe('pricing and tiers', () => {
  it.each([[75, 3], [84, 6], [90, 11], [99, 25]])('prices rating %i at %iM', (rating, price) => {
    expect(calculatePlayerPrice(rating)).toBe(price)
  })
  it.each([74, 100, 75.5, NaN, Infinity, -Infinity, '90', null, undefined])('rejects invalid overall %s in both functions', (value) => {
    expect(() => calculatePlayerPrice(value as number)).toThrow(RangeError)
    expect(() => getPlayerTier(value as number)).toThrow(RangeError)
  })
  it.each([[75, 'D'], [78, 'D'], [79, 'C'], [83, 'C'], [84, 'B'], [88, 'B'], [89, 'A'], [93, 'A'], [94, 'S'], [99, 'S']])('classifies %i as %s', (rating, tier) => {
    expect(getPlayerTier(rating as number)).toBe(tier)
  })
  it('covers all ratings with monotonic integer prices and exactly one tier', () => {
    let previous = 0
    for (let rating = 75; rating <= 99; rating++) {
      const price = calculatePlayerPrice(rating)
      expect(Number.isInteger(price)).toBe(true)
      expect(price).toBeGreaterThanOrEqual(previous)
      const tier = getPlayerTier(rating)
      expect(rating).toBeGreaterThanOrEqual(TIER_RULES[tier].min)
      expect(rating).toBeLessThanOrEqual(TIER_RULES[tier].max)
      previous = price
    }
  })
})

describe('individual runtime validation', () => {
  it('validates a small record without imposing catalog quotas', () => {
    expect(validatePlayer(syntheticPlayer(0)).valid).toBe(true)
  })
  it.each([null, undefined, 1, 'record', []])('handles non-record %s without throwing', (record) => {
    expect(validatePlayer(record)).toMatchObject({ valid: false, issues: [{ code: 'invalid_record' }] })
  })
  it.each(Object.keys(syntheticPlayer(0)))('rejects missing field %s', (field) => {
    const record: Record<string, unknown> = { ...syntheticPlayer(0) }
    delete record[field]
    expect(validatePlayer(record).issues).toContainEqual({ code: 'missing_field', field })
  })
  it.each(['name', 'nationality', 'club_tag', 'era'])('rejects blank %s', (field) => {
    expect(validatePlayer({ ...syntheticPlayer(0), [field]: '  ' }).valid).toBe(false)
  })
  it.each(['plr_000', 'plr_501', 'plr_1', 'PLR_001', '', 'plr_001 '])('rejects invalid id %s', (id) => {
    expect(validatePlayer({ ...syntheticPlayer(0), id }).valid).toBe(false)
  })
  it.each(['GK', 'CB', 'Arquero', 'DEF/MED'])('rejects non-MVP position %s', (position) => {
    expect(validatePlayer({ ...syntheticPlayer(0), position }).issues).toContainEqual({ code: 'invalid_position', field: 'position', actual: position })
  })
  it.each(ERAS)('accepts reference decade %s', (era) => {
    const reference_year = Number(era.slice(0, 4)) + (era === '2020s' ? 2 : 8)
    expect(validatePlayer({ ...syntheticPlayer(0), era, reference_year, category: reference_year >= 2016 ? 'contemporary' : 'legend' }).valid).toBe(true)
  })
  it.each(['1940s', '2030s', '1950', 1950])('rejects unknown era %s', (era) => {
    expect(validatePlayer({ ...syntheticPlayer(0), era }).valid).toBe(false)
  })
  it.each(['ARG', 'ENG', 'NED', 'GER'])('accepts football association %s', (nationality) => {
    expect(validatePlayer({ ...syntheticPlayer(0), nationality }).valid).toBe(true)
  })
  it.each(['DEU', 'NLD', 'GBR', 'arg', 'ZZZ'])('rejects unsupported or ISO alias %s', (nationality) => {
    expect(validatePlayer({ ...syntheticPlayer(0), nationality }).valid).toBe(false)
  })
  it.each(['overall_rating', 'att_rating', 'def_rating', 'phy_rating', 'men_rating', 'price'])('validates numerical field %s against hostile inputs', (field) => {
    for (const value of [NaN, Infinity, -Infinity, 60.5, '60', null, undefined, {}, -1, 100]) {
      expect(validatePlayer({ ...syntheticPlayer(0), [field]: value }).valid).toBe(false)
    }
  })
  it.each(['att_rating', 'def_rating', 'phy_rating', 'men_rating'])('accepts 40/99 and rejects 39 in %s', (field) => {
    expect(validatePlayer({ ...syntheticPlayer(0), [field]: 40 }).valid).toBe(true)
    expect(validatePlayer({ ...syntheticPlayer(0), [field]: 99 }).valid).toBe(true)
    expect(validatePlayer({ ...syntheticPlayer(0), [field]: 39 }).valid).toBe(false)
  })
  it('reports a manipulated price with the computed expected price', () => {
    expect(validatePlayer({ ...syntheticPlayer(0, 'DEL', 99), price: 3 }).issues)
      .toContainEqual({ code: 'price_mismatch', field: 'price', expected: 25, actual: 3 })
  })
  it('rejects punctuation-only names and noncanonical club tags', () => {
    expect(validatePlayer({ ...syntheticPlayer(0), name: '---' }).valid).toBe(false)
    expect(validatePlayer({ ...syntheticPlayer(0), club_tag: 'Club Name' }).valid).toBe(false)
  })
})

describe('full catalog consistency', () => {
  it('accepts exactly 500 distinct synthetic records with all quotas and a viable eleven', () => {
    const result = validateCatalog(syntheticCatalog())
    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
    expect(result.positionCounts).toEqual(POSITION_QUOTAS)
    expect(result.tierCounts).toEqual({ S: 60, A: 100, B: 150, C: 120, D: 70 })
    expect(result.validPlayerCount).toBe(500)
    expect(result.economy.status).toBe('feasible')
    expect(new Set(result.economy.playerIds).size).toBe(11)
    expect(result.economy.minimumCost).toBeLessThanOrEqual(100)
  })
  it.each([null, {}, 'catalog'])('handles invalid catalog %s', (input) => {
    expect(validateCatalog(input).issues).toContainEqual({ code: 'invalid_catalog', expected: 'array' })
  })
  it('detects missing count and exact missing ID', () => {
    const result = validateCatalog(syntheticCatalog().slice(0, 499))
    expect(result.issues).toContainEqual({ code: 'invalid_count', expected: 500, actual: 499 })
    expect(result.issues).toContainEqual({ code: 'missing_id', field: 'id', expected: 'plr_500' })
  })
  it('detects duplicate IDs and their displaced IDs', () => {
    const records = syntheticCatalog()
    records[1] = { ...records[1], id: 'plr_001' }
    const result = validateCatalog(records)
    expect(result.issues).toContainEqual({ code: 'duplicate_id', field: 'id', index: 1, actual: 'plr_001' })
    expect(result.issues).toContainEqual({ code: 'missing_id', field: 'id', expected: 'plr_002' })
    expect(result.economy.status).toBe('not_evaluated')
  })
  it('detects normalized duplicate names even across positions and eras', () => {
    const records = syntheticCatalog()
    records[0] = { ...records[0], name: 'Fútbol Ejemplo' }
    records[99] = { ...records[99], name: ' FUTBOL-EJEMPLO ', era: '2020s', reference_year: 2022 }
    expect(validateCatalog(records).issues.some((issue) => issue.code === 'duplicate_player')).toBe(true)
  })
  it('detects positional distribution drift', () => {
    const records = syntheticCatalog()
    records[0] = { ...records[0], position: 'DEL' }
    expect(validateCatalog(records).issues).toContainEqual({ code: 'position_distribution', field: 'ARQ', expected: 60, actual: 59 })
  })
  it('detects tier drift independently from valid prices', () => {
    const records = syntheticCatalog()
    records[0] = { ...records[0], overall_rating: 75, price: 3 }
    expect(validateCatalog(records).issues).toContainEqual({ code: 'tier_distribution', field: 'S', expected: 60, actual: 59 })
  })
  it('includes indices for record errors and refuses to use tampered prices for feasibility', () => {
    const records = syntheticCatalog()
    records[0] = { ...records[0], price: 3 }
    const result = validateCatalog(records)
    expect(result.issues.some((issue) => issue.code === 'price_mismatch' && issue.index === 0)).toBe(true)
    expect(result.economy.status).toBe('not_evaluated')
  })
  it('does not skip sparse array holes', () => {
    const records = syntheticCatalog()
    delete records[1]
    expect(validateCatalog(records).issues).toContainEqual({ code: 'invalid_record', index: 1 })
  })
  it('requires the versioned envelope to use catalog_v1', () => {
    expect(validateVersionedCatalog({ version: CATALOG_VERSION, players: syntheticCatalog() }).valid).toBe(true)
    expect(validateVersionedCatalog({ version: 'catalog_v2', players: syntheticCatalog() }).issues[0].code).toBe('invalid_version')
    expect(validateVersionedCatalog(syntheticCatalog()).valid).toBe(false)
  })
})

describe('economic proof', () => {
  it('finds the cheapest distinct eleven regardless of input order and does not mutate data', () => {
    const records = [...syntheticEleven(75), syntheticPlayer(11, 'DEL', 99)].reverse()
    const before = structuredClone(records)
    const economy = checkEconomicViability(records)
    expect(economy).toMatchObject({ status: 'feasible', minimumCost: 33 })
    expect(economy.playerIds).not.toContain('plr_012')
    expect(records).toEqual(before)
    const chosen = records.filter((player) => economy.playerIds.includes(player.id))
    for (const [position, count] of Object.entries(FORMATION_QUOTAS)) {
      expect(chosen.filter((player) => player.position === position)).toHaveLength(count)
    }
    expect(validateCatalog(records).valid).toBe(false) // Subset economics never implies catalog completeness.
  })
  it('retains the CODEX-002 100-record adversarial 101M economic fixture as a subset', () => {
    // ARQ: 12 D; DEF: 12 S + 20 A; MED: 30 B; DEL: 24 C + 2 D.
    const ratings = [
      ...Array<number>(12).fill(78), ...Array<number>(12).fill(99), ...Array<number>(20).fill(93),
      ...Array<number>(30).fill(88), ...Array<number>(24).fill(83), ...Array<number>(2).fill(78),
    ]
    const positions: Position[] = [...Array<Position>(12).fill('ARQ'), ...Array<Position>(32).fill('DEF'), ...Array<Position>(30).fill('MED'), ...Array<Position>(26).fill('DEL')]
    const records = positions.map((position, index) => syntheticPlayer(index, position, ratings[index]))
    expect(checkEconomicViability(records)).toMatchObject({ status: 'over_budget', minimumCost: 101 })
    expect(validateCatalog(records)).toMatchObject({ valid: false, status: 'pending', economy: { status: 'not_evaluated' } })
  })
  it('accepts exactly the 100M budget boundary', () => {
    const records = syntheticEleven(90) // 11 × 11 − 8 − 8 − 5 = 100, using independently known prices.
    records[0] = syntheticPlayer(0, 'ARQ', 75)
    records[1] = syntheticPlayer(1, 'DEF', 75)
    records[2] = syntheticPlayer(2, 'DEF', 84)
    expect(checkEconomicViability(records)).toMatchObject({ status: 'feasible', minimumCost: 100 })
  })
  it('reports insufficient positions instead of an invented minimum', () => {
    expect(checkEconomicViability(syntheticEleven().slice(1))).toEqual({ status: 'insufficient_players', minimumCost: null, playerIds: [] })
  })
})

describe('contract compatibility', () => {
  it('keeps types explicit and chemistry a subset of the stable player fields', () => {
    expectTypeOf<Player['position']>().toEqualTypeOf<Position>()
    expectTypeOf<Player['era']>().toEqualTypeOf<Era>()
    expectTypeOf<Player['price']>().toEqualTypeOf<number>()
    expectTypeOf<PlayerCatalog['version']>().toEqualTypeOf<'catalog_v1'>()
    expectTypeOf<ChemistryIdentity>().toEqualTypeOf<Pick<Player, 'id' | 'nationality' | 'club_tag' | 'era'>>()
    expect(PLAYER_TIERS).toHaveLength(5)
    expect(EXPECTED_PLAYER_IDS).toHaveLength(500)
    expect(new Set(EXPECTED_PLAYER_IDS).size).toBe(500)
  })
  it('keeps UI setup and illustrative slots consistent with shared rules', () => {
    expect(INITIAL_SETUP).toEqual({ budgetMillions: 100, formation: '4-3-3', starters: 0, teamSize: 11 })
    for (const [position, count] of Object.entries(FORMATION_QUOTAS)) {
      expect(PITCH_SLOTS.filter((slot) => slot.position === position)).toHaveLength(count)
    }
  })
})
