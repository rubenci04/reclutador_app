import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import B01 from '../../data/catalog_v1/batches/B01.json'
import B02 from '../../data/catalog_v1/batches/B02.json'
import B03 from '../../data/catalog_v1/batches/B03.json'
import aliases from '../../data/catalog_v1/identityAliases.json'
import manifest from '../../data/catalog_v1/manifest.json'
import { loadCatalogV1 } from '../../data/catalog_v1'
import { getBatchPlayerIds } from '../../data/catalogRules'
import { assembleCatalog } from './assembleCatalog'
import { calculatePlayerPrice } from './calculatePlayerPrice'
import { playerIdentityKey, resolvePlayerIdentity } from './playerIdentity'
import { validateBatch, validateCatalog } from './validateCatalog'
import { validatePlayer } from './validatePlayer'

const cumulative = [...B01, ...B02, ...B03]
const identityCases = [
  ['Gigi Buffon', 'plr_101'], ['Bono', 'plr_104'],
  ['Daniel Carvajal Ramos', 'plr_108'], ['Marcos Aoás Corrêa', 'plr_110'],
  ['Min-jae Kim', 'plr_115'], ['Rodrigo Hernández Cascante', 'plr_123'],
  ['Pedro González López', 'plr_128'], ['El Toro', 'plr_141'],
  ['La Araña', 'plr_142'], ['Richarlison de Andrade', 'plr_143'],
  ['Raphael Dias Belloli', 'plr_144'], ['Hee-chan Hwang', 'plr_149'],
] as const

describe('B03 individual integrity', () => {
  it.each(B03.map((player) => [player.id, player] as const))('%s meets the contract, version period and central price', (_, player) => {
    expect(validatePlayer(player)).toMatchObject({ valid: true, issues: [] })
    expect(player.price).toBe(calculatePlayerPrice(player.overall_rating))
    expect(player.category).toBe('contemporary')
    expect(player.reference_year).toBeGreaterThanOrEqual(2016)
    expect(player.reference_year).toBeLessThanOrEqual(2026)
    expect(player.era).toBe(`${Math.floor(player.reference_year / 10) * 10}s`)
  })
  it('approves exactly 50 with the required positions, tiers and reserved IDs', () => {
    const report = validateBatch(B03, 'B03')
    expect(report).toMatchObject({ valid: true, status: 'approved', mode: 'partial', validPlayerCount: 50, issues: [] })
    expect(report.positionCounts).toEqual({ ARQ: 6, DEF: 16, MED: 15, DEL: 13 })
    expect(report.tierCounts).toEqual({ S: 6, A: 10, B: 15, C: 12, D: 7 })
    expect(B03.map((player) => player.id)).toEqual(getBatchPlayerIds('B03'))
  })
  it('rejects removed rows, altered prices, positions, tiers and wrong intervals', () => {
    expect(validateBatch(B03.slice(1), 'B03').valid).toBe(false)
    for (const [change, code] of [
      [{ price: 3 }, 'price_mismatch'], [{ position: 'DEL' }, 'position_distribution'],
      [{ overall_rating: 75, price: 3 }, 'tier_distribution'],
    ] as const) {
      const rows = B03.map((player, index) => index === 0 ? { ...player, ...change } : player)
      expect(validateBatch(rows, 'B03').issues.some((issue) => issue.code === code)).toBe(true)
    }
    expect(validateBatch(B03, 'B04').valid).toBe(false)
  })
})

describe('150-player cumulative audit', () => {
  it('preserves every original B01 and B02 field, including prices', () => {
    const hash = (rows: unknown) => createHash('sha256').update(JSON.stringify(rows)).digest('hex')
    expect(hash(B01)).toBe('b065963920db1d597181621c5ee5eb3ba2426f274f9e605d40e3beebe30c02ee')
    expect(hash(B02)).toBe('74e53126ce583439ceba3e9788221b3861710277010ba93f4b4a881c9e94f2b9')
    expect(loadCatalogV1().players.slice(0, 100)).toEqual([...B01, ...B02])
  })
  it('approves three partial batches and exactly 150 unique identities and IDs', () => {
    const result = loadCatalogV1()
    expect(result.status).toBe('partial')
    expect(result.issues).toEqual([])
    expect(Object.values(result.batchReports).every((report) => report.valid)).toBe(true)
    expect(result.players).toEqual(cumulative)
    expect(new Set(result.players.map((player) => player.id)).size).toBe(150)
    expect(new Set(result.players.map((player) => playerIdentityKey(player.name))).size).toBe(150)
    expect(result.fullReport.positionCounts).toEqual({ ARQ: 18, DEF: 48, MED: 45, DEL: 39 })
    expect(result.fullReport.tierCounts).toEqual({ S: 18, A: 30, B: 45, C: 36, D: 21 })
    expect(result.fullReport.categoryCounts).toEqual({ contemporary: 150, legend: 0 })
  })
  it('keeps complete validation pending with precisely plr_151 through plr_500 absent', () => {
    const result = validateCatalog(cumulative)
    expect(result).toMatchObject({ mode: 'complete', status: 'pending', valid: false, validPlayerCount: 150 })
    expect(result.issues).toContainEqual({ code: 'invalid_count', expected: 500, actual: 150 })
    const missing = result.issues.filter((issue) => issue.code === 'missing_id')
    expect(missing).toHaveLength(350)
    expect(missing.map((issue) => issue.expected)).toEqual(Array.from({ length: 350 }, (_, index) => `plr_${index + 151}`))
    expect(result.economy.status).toBe('not_evaluated')
  })
  it('implements only B01–B03 and produces the same order from reversed inputs without mutation', () => {
    expect(manifest.batches.filter((batch) => batch.status === 'implemented').map((batch) => batch.id)).toEqual(['B01', 'B02', 'B03'])
    expect(manifest.batches.slice(3).every((batch) => batch.status === 'pending')).toBe(true)
    const data = { B03: [...B03].reverse(), B01: [...B01].reverse(), B02: [...B02].reverse() }
    const snapshot = structuredClone(data)
    const result = assembleCatalog({ ...manifest, batches: [...manifest.batches].reverse() }, data)
    expect(result.players).toEqual(cumulative)
    expect(result.issues).toEqual([])
    expect(data).toEqual(snapshot)
  })
  it('rejects cross-batch IDs and aliases regardless of club and decade', () => {
    const wrongId = B03.map((player, index) => index === 0 ? { ...player, id: B02[0].id } : player)
    expect(assembleCatalog(manifest, { B01, B02, B03: wrongId }).issues.some((issue) => issue.code === 'duplicate_id')).toBe(true)
    for (const name of ['Leo Messi', 'Kun Agüero']) {
      const rows = B03.map((player, index) => index === 0 ? { ...player, name, club_tag: 'another_club', reference_year: 2022, era: '2020s' } : player)
      const result = assembleCatalog(manifest, { B01, B02, B03: rows })
      expect(result.issues.some((issue) => issue.code === 'duplicate_player')).toBe(true)
      expect(result.issues.some((issue) => issue.code === 'identity_mismatch')).toBe(true)
    }
  })
})

describe('B03 reviewed aliases in the existing registry', () => {
  it('resolves every canonical name and registered variant of all 150 players', () => {
    expect(Object.keys(aliases)).toEqual(cumulative.map((player) => player.id))
    for (const player of cumulative) {
      expect(resolvePlayerIdentity(player.name)).toBe(player.id)
      for (const name of aliases[player.id as keyof typeof aliases]) {
        expect(resolvePlayerIdentity(`  ${name.toUpperCase()}  `)).toBe(player.id)
      }
    }
  })
  it.each(identityCases)('links %s to %s', (name, id) => {
    expect(resolvePlayerIdentity(name)).toBe(id)
  })
  it.each(identityCases)('rejects reusing the identity behind %s', (name, id) => {
    const original = cumulative.find((player) => player.id === id)!
    const report = validateCatalog([...cumulative, { ...original, id: 'plr_151', name, club_tag: 'another_club', reference_year: 2024, era: '2020s' }])
    expect(report.issues.some((issue) => issue.code === 'duplicate_player')).toBe(true)
    expect(report.issues.some((issue) => issue.code === 'identity_mismatch')).toBe(true)
  })
  it('keeps Lisandro, Lautaro and Emiliano distinct and leaves L. Martínez unresolved', () => {
    expect(resolvePlayerIdentity('L. Martínez')).toBeUndefined()
    expect(resolvePlayerIdentity('Li. Martínez')).toBe('plr_116')
    expect(resolvePlayerIdentity('La. Martínez')).toBe('plr_141')
    expect(resolvePlayerIdentity('Dibu')).toBe('plr_003')
    expect(new Set(['Lisandro Martínez', 'Lautaro Martínez', 'Emiliano Martínez'].map(playerIdentityKey)).size).toBe(3)
    expect(resolvePlayerIdentity('Kim')).toBeUndefined()
    expect(resolvePlayerIdentity('R.')).toBeUndefined()
    expect(playerIdentityKey('Kim Min-jae')).not.toBe(playerIdentityKey('Kim Seung-gyu'))
  })
})
