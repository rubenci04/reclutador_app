import { describe, expect, it } from 'vitest'
import europeLegendFigures from '../../data/league-collections/europeLegendFigures.json'
import southTop from '../../data/league-collections/southAmericaLegends150.json'
import europeTop from '../../data/league-collections/europeLegends150.json'
import frozen from '../../data/league-collections/preDataReg003CCollections.json'
import { GLOBAL_LEGENDS_ALL as GLOBAL_LEGENDS, MASTER_CATALOG, personKey } from './globalCollection'
import { EUROPE_LEGENDS_POOL, EUROPE_LEGENDS_REPORT, EUROPE_LEGENDS_RESOLUTION, EUROPE_LEGENDS_VERSION, SOUTH_AMERICA_LEGENDS_POOL, SOUTH_AMERICA_LEGENDS_REPORT, SOUTH_AMERICA_LEGENDS_RESOLUTION, SOUTH_AMERICA_LEGENDS_VERSION } from './legendTops'
import { SOUTH_AMERICA_MEXICO_NATIONALITIES } from './southAmericaTop150'
import { BALANCED_LEGEND_EDITIONS, LEAGUE_PLAYERS, LEAGUE_PROVENANCE } from './leagueCollections'
import { calculatePlayerPrice } from './calculatePlayerPrice'
import { validatePlayer } from './validatePlayer'
import { getClubIdentity } from './clubRegistry'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { EUROPEAN_NATIONALITIES } from '../themed-modes/nationalityRegions'
import { catalogKey, createDrawContext, CURRENT_DRAW_POLICY, parseReplay } from '../recruiter-duel/drawHistory'
import { createRecruiterDuel } from '../recruiter-duel/auctionEngine'
import { CLASSIC_CONFIG } from '../recruiter-duel/matchConfig'
import { recordedCollection } from './recordedCollections'
import { normalizePlayerName as norm } from './playerIdentity'

const south = catalogForMode('SOUTH_AMERICA_LEGENDS')
const europe = catalogForMode('EUROPE_LEGENDS')
const config = { ...CLASSIC_CONFIG, budget: 200, coaches: true, coachReserve: 8 }

describe('DATA-REG-003C regional Legends Top 150', () => {
  it.each([
    ['South America + Mexico', south, SOUTH_AMERICA_LEGENDS_POOL, SOUTH_AMERICA_LEGENDS_REPORT, SOUTH_AMERICA_LEGENDS_RESOLUTION, southTop, SOUTH_AMERICA_MEXICO_NATIONALITIES],
    ['Europe', europe, EUROPE_LEGENDS_POOL, EUROPE_LEGENDS_REPORT, EUROPE_LEGENDS_RESOLUTION, europeTop, EUROPEAN_NATIONALITIES],
  ] as const)('%s is an editorial ranking of 150 people plus provisional filler up to 200 unique historical identities, not a nationality filter', (_name, pool, expected, report, resolution, top, nationalities) => {
    expect(pool).toBe(expected)
    expect(top.rows.map((row) => row.rank)).toEqual(Array.from({ length: 150 }, (_, index) => index + 1))
    expect(resolution).toHaveLength(150)
    expect(pool).toHaveLength(200)
    expect(new Set(pool.map(personKey)).size).toBe(200)
    expect(new Set(pool.map((p) => p.id)).size).toBe(200)
    expect(pool.every((p) => p.category === 'legend' && nationalities.has(p.nationality) && !p.id.startsWith('world_'))).toBe(true)
    expect(report.reconciled + report.provisional.length).toBe(200)
    expect(report.missing).toHaveLength(150 - report.reconciled)
    // Ranked people come first, in ranking order; the rest is documented provisional filler.
    const ranked = resolution.filter((row) => row.status === 'RECONCILED')
    expect(pool.slice(0, ranked.length).map((p) => p.id)).toEqual(ranked.map((row) => row.editionId))
    expect(pool.slice(ranked.length).map((p) => p.id)).toEqual(report.provisional)
    expect(resolution.filter((row) => row.rank <= 20 && row.status !== 'RECONCILED')).toEqual([])
  })
  it('is versioned', () => {
    expect(SOUTH_AMERICA_LEGENDS_VERSION).toBe('south-america-mexico-legends-150-v1')
    expect(EUROPE_LEGENDS_VERSION).toBe('europe-legends-150-v1')
  })
  it('keeps the principal figures, local legend-balance-v1 editions and homonyms apart', () => {
    for (const name of ['Lionel Messi', 'Pelé', 'Diego Maradona', 'Alfredo Di Stéfano', 'Garrincha', 'Hugo Sánchez', 'Rafael Márquez']) expect(south.some((p) => norm(p.name) === norm(name)), name).toBe(true)
    for (const name of ['Cristiano Ronaldo', 'Johan Cruyff', 'Franz Beckenbauer', 'Ferenc Puskás', 'Eusébio', 'Lev Yashin', 'Gerd Müller']) expect(europe.some((p) => norm(p.name) === norm(name)), name).toBe(true)
    for (const player of [...south, ...europe]) {
      const balanced = BALANCED_LEGEND_EDITIONS.get(player.id)
      if (balanced) expect(player).toBe(balanced)
    }
    const row = (rows: typeof SOUTH_AMERICA_LEGENDS_RESOLUTION, rank: number) => rows.find((r) => r.rank === rank)!
    expect(row(SOUTH_AMERICA_LEGENDS_RESOLUTION, 11).editionId).toBe('import_eng_epl_ley_008')
    expect(row(SOUTH_AMERICA_LEGENDS_RESOLUTION, 120).editionId).toBe('import_mex_leg_015')
    expect(row(SOUTH_AMERICA_LEGENDS_RESOLUTION, 135).status).toBe('MISSING')
    expect(row(EUROPE_LEGENDS_RESOLUTION, 8).editionId).toBe('import_eur_leg_eusebio')
    expect(row(EUROPE_LEGENDS_RESOLUTION, 143).editionId).toBe('import_esp_esp_leg_kepler_laveran_de_lima_ferreira')
    expect(europe.some((p) => p.id === 'import_bra_bra_leg_jose_macia')).toBe(false)
    // Current stars named by the legends ranking without a historical edition stay pending; they are never swapped for a current edition.
    for (const rank of [101, 147]) expect(row(EUROPE_LEGENDS_RESOLUTION, rank).status).toBe('MISSING')
    expect(europe.every((p) => p.category === 'legend')).toBe(true)
  })
  it('adds only documented editions for missing top-20 figures and keeps Global Legends untouched', () => {
    expect(europeLegendFigures.map((row) => row.name).sort()).toEqual(['Eusébio', 'Franz Beckenbauer', 'Gerd Müller', 'Lev Yashin'])
    expect(europeLegendFigures.length).toBeLessThanOrEqual(5)
    const ids = LEAGUE_PLAYERS.map((p) => p.id)
    for (const row of europeLegendFigures) {
      const player = LEAGUE_PLAYERS.find((p) => p.id === row.id)!
      expect(row.sourceRank).toBeLessThanOrEqual(20)
      expect(player.category).toBe('legend')
      expect(player.price).toBe(calculatePlayerPrice(row.sourceRating))
      expect(row.sourceUrl).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//)
      expect(row.sourceClubPeriod).toMatch(/^\d{4}-\d{4}$/)
      expect(row.provenanceNote).toContain('editorial')
      expect(getClubIdentity(row.club_tag), row.club_tag).toBeDefined()
      expect(validatePlayer(player, ids).valid, row.id).toBe(true)
      expect(LEAGUE_PROVENANCE.some((p) => p.id === row.id && p.league === 'EUR')).toBe(true)
      expect(GLOBAL_LEGENDS.some((p) => p.id === row.id)).toBe(false)
    }
    expect(europeLegendFigures.find((row) => row.name === 'Lev Yashin')!.nationality).toBe('RUS')
    expect(GLOBAL_LEGENDS.every((p) => !p.id.startsWith('import_eur_leg_'))).toBe(true)
    // World editions keep their source OVR.
    const world = MASTER_CATALOG.find((p) => p.id === 'world_import_arg_ley_001')
    if (world) expect(world.overall_rating).toBe(Math.min(99, LEAGUE_PROVENANCE.find((p) => p.id === 'import_arg_ley_001')!.sourceRating))
  })
  it('recovers the catalogues in force before this change and their replays', () => {
    for (const [mode, ids] of Object.entries(frozen)) {
      const old = ids.map((id) => MASTER_CATALOG.find((p) => p.id === id)!)
      expect(old.every(Boolean), mode).toBe(true)
      expect(recordedCollection(catalogKey(old))?.map((p) => p.id), mode).toEqual(ids)
      expect(parseReplay(JSON.stringify({ seed: 'old', context: createDrawContext(old, [], 'rarity-v2') }), old), mode).not.toBeNull()
    }
    expect(frozen.SOUTH_AMERICA_LEGENDS.join()).not.toBe(south.map((p) => p.id).join())
    expect(frozen.EUROPE_LEGENDS.join()).not.toBe(europe.map((p) => p.id).join())
  })
  it('stays economically playable', () => {
    for (const pool of [south, europe]) {
      for (let index = 0; index < 10; index++) expect(createRecruiterDuel(pool, `reg3c-${index}`, createDrawContext(pool, [], CURRENT_DRAW_POLICY), config).ok, `reg3c-${index}`).toBe(true)
      expect(pool.filter((p) => p.position === 'ARQ').length).toBeGreaterThanOrEqual(8)
    }
  })
})
