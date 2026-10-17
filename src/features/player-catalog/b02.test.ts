import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import B01 from '../../data/catalog_v1/batches/B01.json'
import B02 from '../../data/catalog_v1/batches/B02.json'
import aliases from '../../data/catalog_v1/identityAliases.json'
import manifest from '../../data/catalog_v1/manifest.json'
import { loadCatalogV1 } from '../../data/catalog_v1'
import { getBatchPlayerIds } from '../../data/catalogRules'
import { assembleCatalog } from './assembleCatalog'
import { calculatePlayerPrice } from './calculatePlayerPrice'
import { createIdentityResolver, playerIdentityKey, resolvePlayerIdentity } from './playerIdentity'
import { validateBatch, validateCatalog } from './validateCatalog'
import { validatePlayer } from './validatePlayer'

const cumulative = [...B01, ...B02]
const representativeAliases = [
  ['Leo Messi', 'plr_038'], [' L. MESSI ', 'plr_038'], ['Lionel Andrés Messi', 'plr_038'],
  ['CR7', 'plr_039'], ['Cristiano Ronaldo dos Santos Aveiro', 'plr_039'],
  ['Neymar Jr.', 'plr_040'], ['Neymar da Silva Santos Junior', 'plr_040'],
  ['Dibu Martínez', 'plr_003'], ['Daniel Alves', 'plr_013'], ['Carlos Henrique Casimiro', 'plr_027'],
  ['Carlos Alberto Sánchez Moreno', 'plr_035'], ['Carlos Sánchez Moreno', 'plr_035'],
  ['Kepler Laveran de Lima Ferreira', 'plr_062'],
  ['Heung-min Son', 'plr_043'], ['Alisson Becker', 'plr_051'],
  ['Ederson Santana de Moraes', 'plr_053'], ['Memo Ochoa', 'plr_055'],
  ['Ngolo Kante', 'plr_074'], ['Kun Agüero', 'plr_093'], ['Sergio Leonel Aguero', 'plr_093'],
  ['K. Mbappe', 'plr_088'], ['Mo Salah', 'plr_090'],
] as const

describe('B02 individual data audit', () => {
  it.each(B02.map((player) => [player.id, player] as const))('%s meets the player contract and central price rule', (_, player) => {
    const result = validatePlayer(player)
    expect(result.issues).toEqual([])
    expect(result.valid).toBe(true)
    expect(player.price).toBe(calculatePlayerPrice(player.overall_rating))
    expect(player.price).toBeGreaterThanOrEqual(3)
    expect(player.price).toBeLessThanOrEqual(25)
    expect(player.category).toBe('contemporary')
    expect(player.reference_year).toBeGreaterThanOrEqual(2016)
    expect(player.reference_year).toBeLessThanOrEqual(2026)
    expect(player.era).toBe(`${Math.floor(player.reference_year / 10) * 10}s`)
    expect(new Set([player.att_rating, player.def_rating, player.phy_rating, player.men_rating]).size).toBeGreaterThan(1)
  })
  it('approves the exact B02 quotas without a global approval', () => {
    const report = validateBatch(B02, 'B02')
    expect(report).toMatchObject({ mode: 'partial', status: 'approved', valid: true, validPlayerCount: 50 })
    expect(report.positionCounts).toEqual({ ARQ: 6, DEF: 16, MED: 15, DEL: 13 })
    expect(report.tierCounts).toEqual({ S: 6, A: 10, B: 15, C: 12, D: 7 })
    expect(report.categoryCounts).toEqual({ contemporary: 50, legend: 0 })
    expect(B02.map((player) => player.id)).toEqual(getBatchPlayerIds('B02'))
    expect(report.economy.status).toBe('not_evaluated')
  })
  it('rejects incomplete batches, manipulated prices and foreign IDs', () => {
    expect(validateBatch(B02.slice(1), 'B02').valid).toBe(false)
    const manipulated = B02.map((player, index) => index === 0 ? { ...player, price: 3 } : player)
    expect(validateBatch(manipulated, 'B02').issues.some((issue) => issue.code === 'price_mismatch')).toBe(true)
    expect(validateBatch(B02, 'B01').valid).toBe(false)
  })
  it('expands regional representation with real players and distinct role profiles', () => {
    for (const code of ['ARG', 'CHI', 'COL', 'ECU', 'SEN', 'MAR', 'TUN', 'EGY', 'JPN', 'IRN', 'MEX', 'CRC', 'PAN', 'USA']) {
      expect(B02.some((player) => player.nationality === code)).toBe(true)
    }
    expect(new Set(B02.map((player) => player.club_tag)).size).toBeGreaterThanOrEqual(20)
    expect(B02.every((player) => !/synthetic/i.test(player.name))).toBe(true)
  })
})

describe('accumulated B01 + B02', () => {
  it('keeps every B01 record and price unchanged from CODEX-003A', () => {
    // Parsed-record hash ignores checkout newline conversion, while pinning all values and IDs.
    expect(createHash('sha256').update(JSON.stringify(B01)).digest('hex'))
      .toBe('b065963920db1d597181621c5ee5eb3ba2426f274f9e605d40e3beebe30c02ee')
    expect(loadCatalogV1().players.slice(0, 50)).toEqual(B01)
  })
  it('approves both partial batches and accumulates exactly 100 distinct contemporary identities', () => {
    const report = loadCatalogV1()
    expect(report.status).toBe('partial')
    expect(report.issues).toEqual([])
    expect(report.batchReports.B01?.valid).toBe(true)
    expect(report.batchReports.B02?.valid).toBe(true)
    expect(report.players).toHaveLength(100)
    expect(new Set(report.players.map((player) => player.id)).size).toBe(100)
    expect(new Set(report.players.map((player) => playerIdentityKey(player.name))).size).toBe(100)
    expect(report.fullReport.positionCounts).toEqual({ ARQ: 12, DEF: 32, MED: 30, DEL: 26 })
    expect(report.fullReport.tierCounts).toEqual({ S: 12, A: 20, B: 30, C: 24, D: 14 })
    expect(report.fullReport.categoryCounts).toEqual({ contemporary: 100, legend: 0 })
  })
  it('keeps global completion pending and identifies the 400 missing IDs', () => {
    const report = validateCatalog(cumulative)
    expect(report).toMatchObject({ mode: 'complete', valid: false, status: 'pending', validPlayerCount: 100 })
    expect(report.issues).toContainEqual({ code: 'invalid_count', expected: 500, actual: 100 })
    expect(report.issues.filter((issue) => issue.code === 'missing_id')).toHaveLength(400)
    expect(report.economy.status).toBe('not_evaluated')
  })
  it('matches the manifest and remains deterministic for shuffled batches and rows', () => {
    expect(manifest.batches.filter((batch) => batch.status === 'implemented').map((batch) => batch.id)).toEqual(['B01', 'B02'])
    expect(manifest.batches.slice(2).every((batch) => batch.status === 'pending')).toBe(true)
    const snapshot = structuredClone(cumulative)
    const shuffled = assembleCatalog({ ...manifest, batches: [...manifest.batches].reverse() }, { B02: [...B02].reverse(), B01: [...B01].reverse() })
    expect(shuffled.players).toEqual(loadCatalogV1().players)
    expect(cumulative).toEqual(snapshot)
  })
})

describe('reviewed aliases and person identity', () => {
  it('covers every implemented canonical name and abbreviation in a collision-free registry', () => {
    expect(Object.keys(aliases)).toEqual(cumulative.map((player) => player.id))
    for (const player of cumulative) {
      expect(resolvePlayerIdentity(player.name)).toBe(player.id)
      for (const name of aliases[player.id as keyof typeof aliases]) {
        expect(resolvePlayerIdentity(`  ${name.toUpperCase()}  `)).toBe(player.id)
      }
    }
  })
  it.each(representativeAliases)('resolves %s to %s', (name, id) => {
    expect(resolvePlayerIdentity(name)).toBe(id)
  })
  it.each(representativeAliases)('rejects a second identity under the alias %s', (name, id) => {
    const original = cumulative.find((player) => player.id === id)!
    const duplicate = { ...original, id: 'plr_101', name, era: '2020s', reference_year: 2022, club_tag: 'another_club' }
    const result = validateCatalog([...cumulative, duplicate])
    expect(result.valid).toBe(false)
    expect(result.status).toBe('invalid')
    expect(result.issues.some((issue) => issue.code === 'duplicate_player')).toBe(true)
    expect(result.issues.some((issue) => issue.code === 'identity_mismatch')).toBe(true)
  })
  it('does not guess identities by partial names or merge different Sánchez players', () => {
    expect(resolvePlayerIdentity('Messi')).toBe('plr_038')
    expect(resolvePlayerIdentity('Kun')).toBe('plr_093')
    expect(resolvePlayerIdentity('Ronaldo')).toBeUndefined()
    expect(resolvePlayerIdentity('Sánchez')).toBeUndefined()
    expect(playerIdentityKey('Carlos Sánchez')).not.toBe(playerIdentityKey('Alexis Sánchez'))
    expect(resolvePlayerIdentity('Carlos Sánchez Moreno')).toBe('plr_035')
    expect(resolvePlayerIdentity('Jugador Sánchez')).toBeUndefined()
  })
  it('refuses ambiguous alias definitions rather than assigning an arbitrary player', () => {
    expect(() => createIdentityResolver({ plr_001: ['J. Example'], plr_002: ['J. Example'] })).toThrow('ambiguous_player_alias')
    expect(() => createIdentityResolver({ plr_001: ['  '] })).toThrow('ambiguous_player_alias')
  })
  it('detects exact ID collisions as well as alias collisions between batches', () => {
    const wrongId = B02.map((player, index) => index === 0 ? { ...player, id: B01[0].id } : player)
    expect(assembleCatalog(manifest, { B01, B02: wrongId }).issues.some((issue) => issue.code === 'duplicate_id')).toBe(true)
    const wrongName = B02.map((player, index) => index === 0 ? { ...player, name: 'Neymar Jr.' } : player)
    expect(assembleCatalog(manifest, { B01, B02: wrongName }).issues.some((issue) => issue.code === 'duplicate_player')).toBe(true)
  })
})
