import { describe, expect, it } from 'vitest'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import manifest from '../../data/catalog_v1/manifest.json'
import B01 from '../../data/catalog_v1/batches/B01.json'
import B02 from '../../data/catalog_v1/batches/B02.json'
import B03 from '../../data/catalog_v1/batches/B03.json'
import { loadCatalogV1 } from '../../data/catalog_v1'
import { BATCH_IDS, BATCH_POSITION_QUOTAS, BATCH_SIZE, CATEGORY_POSITION_QUOTAS, getBatchCategory, getBatchPlayerIds } from '../../data/catalogRules'
import { POSITIONS, type Position } from '../../types/football'
import { PLAYER_CATEGORIES, PLAYER_TIERS, type BatchId, type Player } from '../../types/player'
import { createI18n, languages } from '../../i18n'
import { assembleCatalog, validateManifest } from './assembleCatalog'
import { calculatePlayerPrice } from './calculatePlayerPrice'
import { getPlayerTier } from './getPlayerTier'
import { syntheticCatalog, syntheticEleven, syntheticPlayer } from './testFixtures'
import { checkEconomicViability, validateBatch, validateCatalog } from './validateCatalog'
import { validatePlayer } from './validatePlayer'

function syntheticBatch(id: BatchId): Player[] {
  const positions = POSITIONS.flatMap((position) => Array<Position>(BATCH_POSITION_QUOTAS[position]).fill(position))
  const ratings = [94, 89, 84, 79, 75].flatMap((rating, tier) => Array<number>([6, 10, 15, 12, 7][tier]).fill(rating))
  const offset = (Number(id.slice(1)) - 1) * BATCH_SIZE
  return positions.map((position, index) => ({
    ...syntheticPlayer(offset + index, position, ratings[index]), category: getBatchCategory(id),
    reference_year: Number(id.slice(1)) <= 6 ? 2018 : 1986,
    era: Number(id.slice(1)) <= 6 ? '2010s' : '1980s',
  }))
}

describe('real B01 data audit', () => {
  it.each(B01.map((player) => [player.id, player] as const))('%s is individually valid with a calculated price', (_, player) => {
    expect(validatePlayer(player).issues).toEqual([])
    expect(player.price).toBe(calculatePlayerPrice(player.overall_rating))
    expect(player.category).toBe('contemporary')
    expect(player.reference_year).toBeGreaterThanOrEqual(2016)
    expect(player.reference_year).toBeLessThanOrEqual(2026)
  })
  it('meets all B01 quotas and reserves its exact ID interval', () => {
    const result = validateBatch(B01, 'B01')
    expect(result).toMatchObject({ valid: true, mode: 'partial', status: 'approved', validPlayerCount: 50 })
    expect(result.positionCounts).toEqual({ ARQ: 6, DEF: 16, MED: 15, DEL: 13 })
    expect(result.tierCounts).toEqual({ S: 6, A: 10, B: 15, C: 12, D: 7 })
    expect(result.categoryCounts).toEqual({ contemporary: 50, legend: 0 })
    expect(B01.map((player) => player.id)).toEqual(getBatchPlayerIds('B01'))
    expect(result.economy.status).toBe('not_evaluated')
  })
  it('has international and South American representation without synthetic placeholders', () => {
    expect(new Set(B01.map((player) => player.nationality)).size).toBeGreaterThanOrEqual(15)
    expect(new Set(B01.map((player) => player.club_tag)).size).toBeGreaterThanOrEqual(20)
    expect(B01.filter((player) => player.nationality === 'ARG').length).toBeGreaterThanOrEqual(8)
    expect(B01.some((player) => /synthetic/i.test(player.name))).toBe(false)
  })
  it('retains the 50/500 regression scenario and checks the current implemented files', () => {
    const originalManifest = { ...manifest, batches: manifest.batches.map((batch) => ({ ...batch, status: batch.id === 'B01' ? 'implemented' : 'pending' })) }
    const result = assembleCatalog(originalManifest, { B01 })
    expect(result.status).toBe('partial')
    expect(result.issues).toEqual([])
    expect(result.fullReport).toMatchObject({ mode: 'complete', valid: false, status: 'pending', validPlayerCount: 50, economy: { status: 'not_evaluated' } })
    expect(result.fullReport.issues).toContainEqual({ code: 'invalid_count', expected: 500, actual: 50 })
    expect(manifest.batches.filter((batch) => batch.status === 'implemented').map((batch) => batch.id)).toEqual(['B01', 'B02', 'B03'])
    expect(readdirSync(resolve('src/data/catalog_v1/batches')).sort()).toEqual(['B01.json', 'B02.json', 'B03.json'])
  })
})

describe('generation and fixed reference-year contract', () => {
  it.each([2016, 2026])('accepts contemporary boundary %i', (year) => {
    expect(validatePlayer({ ...syntheticPlayer(0), reference_year: year, era: year === 2016 ? '2010s' : '2020s' }).valid).toBe(true)
  })
  it.each([2015, 2027, 2018.5, NaN, Infinity, '2018', null])('rejects contemporary reference %s', (reference_year) => {
    expect(validatePlayer({ ...syntheticPlayer(0), reference_year }).valid).toBe(false)
  })
  it('accepts historical reference 1950 and rejects a legend after 2015', () => {
    expect(validatePlayer({ ...syntheticPlayer(0), category: 'legend', reference_year: 1950, era: '1950s' }).valid).toBe(true)
    expect(validatePlayer({ ...syntheticPlayer(0), category: 'legend', reference_year: 2015 }).valid).toBe(true)
    expect(validatePlayer({ ...syntheticPlayer(0), category: 'legend' }).valid).toBe(false)
  })
  it('rejects a mismatched decade and an unsupported category', () => {
    expect(validatePlayer({ ...syntheticPlayer(0), era: '2020s' }).issues.some((issue) => issue.code === 'era_mismatch')).toBe(true)
    expect(validatePlayer({ ...syntheticPlayer(0), category: 'modern' }).valid).toBe(false)
  })
  it('accepts all extended IDs without allowing 501', () => {
    expect(validatePlayer(syntheticPlayer(499)).valid).toBe(true)
    expect(validatePlayer(syntheticPlayer(500)).valid).toBe(false)
  })
  it.each(languages)('translates both generation labels in %s', async (language) => {
    const instance = await createI18n(language)
    const expected = {
      'es-AR': ['Contemporáneos', 'Leyendas'], en: ['Contemporary players', 'Legends'], 'pt-BR': ['Contemporâneos', 'Lendas'],
    }
    expect(PLAYER_CATEGORIES.map((category) => instance.t(`catalog.categories.${category}`))).toEqual(expected[language])
  })
})

describe('partial versus complete validation', () => {
  it.each(BATCH_IDS)('validates a synthetic %s independently of missing future batches', (id) => {
    expect(validateBatch(syntheticBatch(id), id)).toMatchObject({ valid: true, mode: 'partial' })
  })
  it('never approves only 50 or the old 100 records globally', () => {
    expect(validateCatalog(B01).valid).toBe(false)
    expect(validateCatalog(syntheticCatalog().slice(0, 100)).valid).toBe(false)
  })
  it('detects wrong batch ID interval and unexpected batch identifier', () => {
    expect(validateBatch(B01, 'B02').valid).toBe(false)
    expect(validateBatch(B01, 'B11' as BatchId).issues[0].code).toBe('unexpected_batch')
  })
  it('validates tiers, positions and generation independently in partial mode', () => {
    expect(validateBatch(B01.slice(1), 'B01').valid).toBe(false)
    const wrongTier = B01.map((player, index) => index === 0 ? { ...player, overall_rating: 75, price: 3 } : player)
    expect(validateBatch(wrongTier, 'B01').issues.some((issue) => issue.code === 'tier_distribution')).toBe(true)
    const wrongPosition = B01.map((player, index) => index === 0 ? { ...player, position: 'DEL' } : player)
    expect(validateBatch(wrongPosition, 'B01').issues.some((issue) => issue.code === 'position_distribution')).toBe(true)
    const legends = B01.map((player) => ({ ...player, category: 'legend', reference_year: 2015 }))
    expect(validateBatch(legends, 'B01').issues.some((issue) => issue.code === 'batch_category')).toBe(true)
  })
  it('catches duplicate identities and malformed records inside a batch', () => {
    const rows: unknown[] = [...B01]
    rows[1] = { ...B01[1], name: B01[0].name.toUpperCase() }
    rows[3] = null
    const result = validateBatch(rows, 'B01')
    expect(result.issues.some((issue) => issue.code === 'duplicate_player')).toBe(true)
    expect(result.issues).toContainEqual({ code: 'invalid_record', index: 3 })
  })
  it('enforces category-position cross quotas even when global category and position totals agree', () => {
    const rows = syntheticCatalog()
    const firstLegendDef = rows.findIndex((player) => player.category === 'legend' && player.position === 'DEF')
    rows[0] = { ...rows[0], position: 'DEF' }
    rows[firstLegendDef] = { ...rows[firstLegendDef], position: 'ARQ' }
    const report = validateCatalog(rows)
    expect(report.positionCounts).toEqual({ ARQ: 60, DEF: 160, MED: 150, DEL: 130 })
    expect(report.categoryCounts).toEqual({ contemporary: 300, legend: 200 })
    expect(report.valid).toBe(false)
    expect(report.issues.some((issue) => issue.code === 'category_position_distribution')).toBe(true)
  })
  it('retains the 300/200 matrix and all 500 IDs in a synthetic complete contract test', () => {
    const report = validateCatalog(syntheticCatalog())
    expect(report.valid).toBe(true)
    expect(report.categoryPositionCounts).toEqual(CATEGORY_POSITION_QUOTAS)
  })
  it('does not trust manipulated subset prices in reusable economics', () => {
    expect(checkEconomicViability([{ ...syntheticEleven()[0], price: 0 }, ...syntheticEleven().slice(1)]).status).toBe('not_evaluated')
  })
})

describe('manifest and deterministic consolidation', () => {
  it('validates metadata and rejects missing, repeated or misclassified manifest entries', () => {
    expect(validateManifest(manifest)).toBe(true)
    expect(validateManifest({ ...manifest, referenceDate: '2027-01-01' })).toBe(false)
    expect(validateManifest({ ...manifest, expectedTotal: 100 })).toBe(false)
    expect(validateManifest({ ...manifest, batches: manifest.batches.slice(1) })).toBe(false)
    expect(validateManifest({ ...manifest, batches: [...manifest.batches.slice(1), manifest.batches[1]] })).toBe(false)
    expect(validateManifest({ ...manifest, batches: manifest.batches.map((batch) => ({ ...batch, category: 'legend' })) })).toBe(false)
    expect(assembleCatalog(null, {}).status).toBe('invalid')
  })
  it('detects unexpected files and discrepancies between supplied data and manifest states', () => {
    expect(assembleCatalog(manifest, {}).status).toBe('invalid')
    expect(assembleCatalog(manifest, { B01 }).issues.some((issue) => issue.code === 'batch_state_mismatch')).toBe(true)
    expect(assembleCatalog(manifest, { B01, B02, B03, B04: syntheticBatch('B04') }).issues.some((issue) => issue.code === 'batch_state_mismatch')).toBe(true)
    expect(assembleCatalog(manifest, { B01, B11: [] }).issues.some((issue) => issue.code === 'unexpected_batch')).toBe(true)
  })
  it('sorts batches and players independently of input ordering without mutating inputs', () => {
    const two = { ...manifest, batches: manifest.batches.map((batch) => ({ ...batch, status: ['B01', 'B02'].includes(batch.id) ? 'implemented' : 'pending' })).reverse() }
    const first = syntheticBatch('B01').reverse()
    const second = syntheticBatch('B02').reverse()
    const before = structuredClone(first)
    const result = assembleCatalog(two, { B02: second, B01: first })
    expect(result.status).toBe('partial')
    expect(result.players.map((player) => player.id)).toEqual([...getBatchPlayerIds('B01'), ...getBatchPlayerIds('B02')])
    expect(first).toEqual(before)
  })
  it('catches normalized cross-batch duplicates despite accents, case and spaces', () => {
    const two = { ...manifest, batches: manifest.batches.map((batch) => batch.id === 'B02' ? { ...batch, status: 'implemented' } : batch) }
    const first = syntheticBatch('B01')
    const second = syntheticBatch('B02')
    first[0] = { ...first[0], name: 'Álvaro Ejemplo' }
    second[0] = { ...second[0], name: ' ALVARO   EJEMPLO ' }
    const result = assembleCatalog(two, { B01: first, B02: second })
    expect(result.status).toBe('invalid')
    expect(result.issues.some((issue) => issue.code === 'duplicate_player')).toBe(true)
  })
  it('proves the ten-batch completion path with synthetic data, not the real catalog', () => {
    const complete = { ...manifest, batches: manifest.batches.map((batch) => ({ ...batch, status: 'implemented' })) }
    const data = Object.fromEntries([...BATCH_IDS].reverse().map((id) => [id, syntheticBatch(id)]))
    expect(assembleCatalog(complete, data)).toMatchObject({ status: 'complete', fullReport: { valid: true, validPlayerCount: 500 } })
    const bad = data.B10.map((player) => ({ ...player, overall_rating: 75, price: 3 }))
    expect(assembleCatalog(complete, { ...data, B10: bad }).status).toBe('invalid')
  })
  it('checks all implemented prices, tiers and counts through the same domain rules', () => {
    const result = loadCatalogV1()
    for (const tier of PLAYER_TIERS) expect(result.fullReport.tierCounts[tier]).toBe([...B01, ...B02, ...B03].filter((player) => getPlayerTier(player.overall_rating) === tier).length)
  })
})
