import { describe, expect, it } from 'vitest'
import europeFigures from '../../data/league-collections/europeFigures.json'
import southAmericaFigures from '../../data/league-collections/southAmericaFigures.json'
import southAmericaTop from '../../data/league-collections/southAmericaTop150.json'
import frozen from '../../data/league-collections/preDataReg003BCollections.json'
import { GLOBAL_CURRENT, MASTER_CATALOG, personKey } from './globalCollection'
import { EUROPE_CURRENT_POOL, EUROPE_TOP_REPORT, EUROPE_TOP_RESOLUTION, EUROPE_TOP_VERSION } from './europeTop150'
import { SOUTH_AMERICA_CURRENT_POOL, SOUTH_AMERICA_MEXICO_NATIONALITIES, SOUTH_AMERICA_TOP_REPORT, SOUTH_AMERICA_TOP_RESOLUTION, SOUTH_AMERICA_TOP_VERSION } from './southAmericaTop150'
import { LEAGUE_PLAYERS, LEAGUE_PROVENANCE } from './leagueCollections'
import { calculatePlayerPrice } from './calculatePlayerPrice'
import { validatePlayer } from './validatePlayer'
import { getClubIdentity } from './clubRegistry'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { catalogKey, createDrawContext, CURRENT_DRAW_POLICY, parseReplay } from '../recruiter-duel/drawHistory'
import { createRecruiterDuel } from '../recruiter-duel/auctionEngine'
import { CLASSIC_CONFIG } from '../recruiter-duel/matchConfig'
import { recordedCollection } from './recordedCollections'
import { normalizePlayerName as norm } from './playerIdentity'

const europe = catalogForMode('EUROPE_CURRENT')
const southAmerica = catalogForMode('SOUTH_AMERICA_CURRENT')
const config = { ...CLASSIC_CONFIG, budget: 150, coaches: true, coachReserve: 8 }
const editions = [...europeFigures.filter((row) => row.sourceRank > 50), ...southAmericaFigures]

describe('DATA-REG-003B Europe Actualidad completed', () => {
  it('resolves every pending row of ranks 51-150 and leaves no provisional filler', () => {
    expect(EUROPE_TOP_VERSION).toBe('europe-top-150-v3')
    expect(europeFigures).toHaveLength(13 + 31)
    expect(EUROPE_TOP_REPORT.reconciled).toBe(150)
    expect(EUROPE_TOP_REPORT.provisional).toHaveLength(0)
    expect(EUROPE_TOP_REPORT.missing).toEqual([])
    expect(EUROPE_TOP_RESOLUTION.every((row) => row.status === 'RECONCILED')).toBe(true)
    expect(europe).toBe(EUROPE_CURRENT_POOL)
    expect(europe).toHaveLength(150)
    expect(new Set(europe.map(personKey)).size).toBe(150)
    expect(europe.map((p) => p.id)).toEqual(EUROPE_TOP_RESOLUTION.map((row) => row.editionId))
  })
  it('keeps homonyms and the historical Milinković-Savić edition apart', () => {
    const sergej = europe.filter((p) => norm(p.name) === norm('Sergej Milinković-Savić'))
    expect(sergej.map((p) => p.id)).toEqual(['import_eur_act_sergej_milinkovic_savic'])
    expect(MASTER_CATALOG.find((p) => p.id === 'import_ita_leg_150')!.category).toBe('legend')
    for (const id of ['import_esp_esp_leg_marcos_antonio_senna_da_silva', 'import_bra_bra_act_marcos_antonio_silva_santos']) expect(europe.some((p) => p.id === id), id).toBe(false)
    expect(europe.filter((p) => norm(p.name) === norm('Aleksandar Pavlović'))).toHaveLength(1)
    expect(personKey(MASTER_CATALOG.find((p) => p.id === 'import_eur_act_aleksandar_pavlovic')!)).not.toBe(personKey(MASTER_CATALOG.find((p) => p.id === 'import_ita_act_047')!))
    expect(europe.some((p) => p.name === 'Vanja Milinković-Savić')).toBe(false)
  })
})

describe('DATA-REG-003B editorial editions', () => {
  it('are independent 2026 editions with provenance, registered clubs, editorial OVR and the existing price and attribute rules', () => {
    expect(editions).toHaveLength(31 + 14)
    expect(new Set(editions.map((row) => row.id)).size).toBe(45)
    const ids = LEAGUE_PLAYERS.map((p) => p.id)
    for (const row of editions) {
      const player = LEAGUE_PLAYERS.find((p) => p.id === row.id)!
      expect(player.category).toBe('contemporary')
      expect(player.reference_year).toBe(2026)
      expect(player.price).toBe(calculatePlayerPrice(row.sourceRating))
      expect(player.overall_rating).toBe(row.sourceRating)
      expect(player.dominantFoot).toBe(row.dominantFoot)
      expect(['RIGHT', 'LEFT', 'BOTH', 'UNKNOWN']).toContain(row.dominantFoot)
      expect(row.sourceUrl).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//)
      expect(row.provenanceNote).toContain('editorial')
      expect(getClubIdentity(row.club_tag), row.club_tag).toBeDefined()
      expect(validatePlayer(player, ids).valid, row.id).toBe(true)
      expect(LEAGUE_PROVENANCE.some((p) => p.id === row.id)).toBe(true)
    }
    // Feet are fixed only where the source states them.
    expect(Object.fromEntries(editions.filter((row) => ['Lennart Karl', 'António Silva', 'Endrick', 'Darwin Núñez', 'Theo Hernández'].includes(row.name)).map((row) => [row.name, row.dominantFoot]))).toEqual({ 'Lennart Karl': 'LEFT', 'António Silva': 'RIGHT', Endrick: 'LEFT', 'Darwin Núñez': 'RIGHT', 'Theo Hernández': 'UNKNOWN' })
  })
  it('does not touch the six national Top 150s and adds no duplicates to Global Actual', () => {
    for (const mode of ['SPAIN_LEAGUE', 'ENGLAND_LEAGUE', 'ITALY_CURRENT', 'ARGENTINA_CURRENT', 'BRAZIL_CURRENT', 'MEXICO_CURRENT'] as const) {
      const pool = catalogForMode(mode)
      expect(pool, mode).toHaveLength(150)
      expect(pool.some((p) => p.id.startsWith('import_eur_') || p.id.startsWith('import_sam_')), mode).toBe(false)
    }
    expect(new Set(GLOBAL_CURRENT.map(personKey)).size).toBe(GLOBAL_CURRENT.length)
  })
})

describe('DATA-REG-003B South America + Mexico Actualidad Top 150', () => {
  it('is a true Top 150 of the eleven associations: 150 unique identities, no Central America or Caribbean', () => {
    expect(SOUTH_AMERICA_TOP_VERSION).toBe('south-america-mexico-top-150-v1')
    expect(southAmericaTop.rows).toHaveLength(150)
    expect(southAmericaTop.rows.map((row) => row.rank)).toEqual(Array.from({ length: 150 }, (_, index) => index + 1))
    expect(southAmerica).toBe(SOUTH_AMERICA_CURRENT_POOL)
    expect(southAmerica).toHaveLength(150)
    expect(new Set(southAmerica.map(personKey)).size).toBe(150)
    expect(new Set(southAmerica.map((p) => p.id)).size).toBe(150)
    expect(southAmerica.every((p) => p.category === 'contemporary' && SOUTH_AMERICA_MEXICO_NATIONALITIES.has(p.nationality))).toBe(true)
    expect(southAmerica.some((p) => ['CRC', 'PAN', 'GUA', 'HON', 'SLV', 'NCA', 'CUB', 'DOM', 'HAI', 'PUR'].includes(p.nationality))).toBe(false)
    expect(SOUTH_AMERICA_TOP_REPORT.reconciled + SOUTH_AMERICA_TOP_REPORT.provisional.length).toBe(150)
    expect(SOUTH_AMERICA_TOP_REPORT.missing).toHaveLength(150 - SOUTH_AMERICA_TOP_REPORT.reconciled)
    const ranked = SOUTH_AMERICA_TOP_RESOLUTION.filter((row) => row.status === 'RECONCILED')
    expect(southAmerica.slice(0, ranked.length).map((p) => p.id)).toEqual(ranked.map((row) => row.editionId))
  })
  it('contains the principal figures: every name of ranks 1-50 is present and the later gaps are documented', () => {
    expect(SOUTH_AMERICA_TOP_RESOLUTION.filter((row) => row.rank <= 50 && row.status !== 'RECONCILED')).toEqual([])
    expect(SOUTH_AMERICA_TOP_REPORT.missing.every((row) => row.rank > 50)).toBe(true)
    expect(southAmericaFigures).toHaveLength(14)
    for (const name of ['Lionel Messi', 'Vinícius Júnior', 'Willian Pacho', 'Raphinha', 'Luis Díaz', 'Lautaro Martínez', 'Federico Valverde', 'Julián Quiñones', 'Éder Militão', 'Gabriel Martinelli', 'Darwin Núñez', 'Santiago Giménez']) {
      expect(southAmerica.some((p) => norm(p.name) === norm(name)), name).toBe(true)
    }
  })
  it('keeps homonyms apart (Martinelli, Ederson, Pedro, André, Pepê)', () => {
    const resolved = (rank: number) => SOUTH_AMERICA_TOP_RESOLUTION.find((row) => row.rank === rank)!.editionId
    expect(resolved(22)).toBe('import_sam_act_gabriel_martinelli')
    expect(SOUTH_AMERICA_TOP_RESOLUTION.some((row) => row.editionId === 'import_bra_bra_act_matheus_martinelli_lima')).toBe(false)
    expect(resolved(28)).toBe('plr_053')
    expect(resolved(65)).toBe('import_bra_bra_act_pedro_guilherme_abreu_dos_santos')
    expect(resolved(43)).toBe('import_sam_act_andre')
    expect(resolved(111)).toBeNull()
    expect(personKey(MASTER_CATALOG.find((p) => p.id === 'plr_053')!)).not.toBe(personKey(MASTER_CATALOG.find((p) => p.id === 'import_ita_act_017')!))
    expect(MASTER_CATALOG.find((p) => p.id === 'import_bra_bra_leg_claudio_andre_mergen_taffarel')!.category).toBe('legend')
    expect(southAmerica.every((p) => p.category === 'contemporary')).toBe(true)
  })
})

describe('DATA-REG-003B compatibility and viability', () => {
  it('recovers the catalogues in force before this change and their replays', () => {
    for (const [mode, ids] of Object.entries(frozen)) {
      const old = ids.map((id) => MASTER_CATALOG.find((p) => p.id === id)!)
      expect(old.every(Boolean), mode).toBe(true)
      expect(recordedCollection(catalogKey(old))?.map((p) => p.id), mode).toEqual(ids)
      expect(parseReplay(JSON.stringify({ seed: 'old', context: createDrawContext(old, [], 'rarity-v2') }), old), mode).not.toBeNull()
    }
    expect(frozen.EUROPE_CURRENT).toHaveLength(150)
    expect(frozen.SOUTH_AMERICA_CURRENT.length).toBeGreaterThan(500)
    expect(frozen.EUROPE_CURRENT.join()).not.toBe(europe.map((p) => p.id).join())
    expect(frozen.SOUTH_AMERICA_CURRENT.join()).not.toBe(southAmerica.map((p) => p.id).join())
  })
  it('stays economically playable', () => {
    for (const pool of [europe, southAmerica]) {
      for (let index = 0; index < 10; index++) expect(createRecruiterDuel(pool, `reg3b-${index}`, createDrawContext(pool, [], CURRENT_DRAW_POLICY), config).ok, `reg3b-${index}`).toBe(true)
      expect(pool.filter((p) => p.position === 'ARQ').length).toBeGreaterThanOrEqual(8)
    }
  })
})
