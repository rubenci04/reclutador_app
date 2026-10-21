import { describe, expect, it } from 'vitest'
import top from '../../data/league-collections/europeTop150.json'
import preEurope from '../../data/league-collections/preEuropeTopCollections.json'
import { ALL_CURRENT, MASTER_CATALOG, personKey } from './globalCollection'
import { EUROPE_CURRENT_POOL, EUROPE_TOP_REPORT, EUROPE_TOP_RESOLUTION, EUROPE_TOP_SIZE } from './europeTop150'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { EUROPEAN_NATIONALITIES } from '../themed-modes/nationalityRegions'
import { normalizePlayerName as norm } from './playerIdentity'
import { catalogKey, createDrawContext, CURRENT_DRAW_POLICY, parseReplay } from '../recruiter-duel/drawHistory'
import { createRecruiterDuel } from '../recruiter-duel/auctionEngine'
import { CLASSIC_CONFIG } from '../recruiter-duel/matchConfig'
import { recordedCollection } from './recordedCollections'

const europe = catalogForMode('EUROPE_CURRENT')
const config = { ...CLASSIC_CONFIG, budget: 150, coaches: true, coachReserve: 8 }

describe('UX-DRAW-007 Europe Actualidad Top 150', () => {
  it('is the editorial Top 150: 150 distinct 2026 identities, ranked first and completed provisionally', () => {
    expect(top.rows).toHaveLength(150)
    expect(top.rows.map((row) => row.rank)).toEqual(Array.from({ length: 150 }, (_, index) => index + 1))
    expect(europe).toBe(EUROPE_CURRENT_POOL)
    expect(europe).toHaveLength(EUROPE_TOP_SIZE)
    expect(new Set(europe.map(personKey)).size).toBe(150)
    expect(new Set(europe.map((p) => p.id)).size).toBe(150)
    expect(europe.every((p) => p.category === 'contemporary' && EUROPEAN_NATIONALITIES.has(p.nationality))).toBe(true)
    expect(EUROPE_TOP_REPORT.reconciled + EUROPE_TOP_REPORT.provisional.length).toBe(150)
    expect(EUROPE_TOP_REPORT.missing.length).toBe(150 - EUROPE_TOP_REPORT.reconciled)
    // The first positions are the ranked people, in ranking order.
    const ranked = EUROPE_TOP_RESOLUTION.filter((row) => row.status === 'RECONCILED')
    expect(europe.slice(0, ranked.length).map((p) => p.id)).toEqual(ranked.map((row) => row.editionId))
  })
  it('reconciles each ranked row only to the same person: exact or documented name and the same nationality', () => {
    const byId = new Map(MASTER_CATALOG.map((p) => [p.id, p]))
    for (const row of EUROPE_TOP_RESOLUTION.filter((r) => r.status === 'RECONCILED')) {
      const edition = byId.get(row.editionId!)!
      expect(edition.nationality, row.name).toBe(row.nationality)
      expect(edition.category, row.name).toBe('contemporary')
      if (!row.note) expect(norm(edition.name), row.name).toBe(norm(row.name))
      expect(ALL_CURRENT.includes(edition), row.name).toBe(true)
    }
    for (const row of EUROPE_TOP_RESOLUTION.filter((r) => r.status !== 'RECONCILED')) {
      expect(row.editionId).toBeNull()
      expect(row.note, row.name).toBeTruthy()
    }
    // A homonym without proof is not merged.
    expect(EUROPE_TOP_RESOLUTION.find((row) => row.name === 'Vitinha')?.status).toBe('AMBIGUOUS')
  })
  it('contains the explicitly audited stars with their 2026 edition and without historical editions', () => {
    for (const name of ['Rodri', 'Kylian Mbappé', 'Lamine Yamal', 'Erling Haaland', 'Harry Kane', 'Jude Bellingham', 'Pedri', 'Marc Cucurella', 'Robert Lewandowski']) {
      const found = europe.filter((p) => norm(p.name) === norm(name))
      expect(found, name).toHaveLength(1)
      expect(found[0].category).toBe('contemporary')
      expect(found[0].reference_year, name).toBeGreaterThan(2015)
    }
    expect(europe.some((p) => p.id.startsWith('import_') && p.category === 'legend')).toBe(false)
    // Rodri and Lewandowski keep their own 2026-era edition; the historical editions stay in Europe Leyendas only.
    expect(catalogForMode('EUROPE_LEGENDS').some((p) => norm(p.name) === norm('Robert Lewandowski'))).toBe(true)
  })
  it('does not admit a candidate only because of a European nationality', () => {
    const vombergar = MASTER_CATALOG.find((p) => p.name === 'Andrés Vombergar')!
    expect(vombergar.nationality).toBe('SVN')
    expect(preEurope.EUROPE_CURRENT).toContain(vombergar.id) // the earlier nationality filter let him in
    expect(europe.some((p) => p.id === vombergar.id)).toBe(false)
    // Any filler is a 2026 edition rated above him, not a name-based exclusion.
    for (const id of EUROPE_TOP_REPORT.provisional) expect(MASTER_CATALOG.find((p) => p.id === id)!.overall_rating).toBeGreaterThan(vombergar.overall_rating)
  })
  it('keeps the earlier Europe catalogue reproducible for saved games and replays', () => {
    const old = preEurope.EUROPE_CURRENT.map((id) => MASTER_CATALOG.find((p) => p.id === id)!)
    expect(old.length).toBeGreaterThan(300)
    const recorded = recordedCollection(catalogKey(old))
    expect(recorded?.map((p) => p.id)).toEqual(old.map((p) => p.id))
    const replay = JSON.stringify({ seed: 'before-top-150', context: createDrawContext(old, [], 'rarity-v2') })
    expect(parseReplay(replay, old)).not.toBeNull()
  })
  it('is playable: enough goalkeepers and each line, deterministic draws, viable budgets', () => {
    const count = (position: string) => europe.filter((p) => p.position === position).length
    expect(count('ARQ')).toBeGreaterThanOrEqual(8)
    for (const [position, minimum] of [['DEF', 25], ['MED', 25], ['DEL', 20]] as const) expect(count(position)).toBeGreaterThanOrEqual(minimum)
    for (let index = 0; index < 12; index++) {
      const context = createDrawContext(europe, [], CURRENT_DRAW_POLICY)
      const first = createRecruiterDuel(europe, `eu-${index}`, context, config)
      expect(first.ok, `eu-${index}`).toBe(true)
      expect(createRecruiterDuel(europe, `eu-${index}`, context, config)).toEqual(first)
    }
  })
  it('gives the stars a reasonable presence in a small fixed sample (diagnosis: the old pool diluted them)', () => {
    const stars = new Set(EUROPE_TOP_RESOLUTION.filter((row) => row.rank <= 25 && row.editionId).map((row) => personKey(MASTER_CATALOG.find((p) => p.id === row.editionId)!)))
    const old = preEurope.EUROPE_CURRENT.map((id) => MASTER_CATALOG.find((p) => p.id === id)!)
    const perGame = (pool: typeof europe) => {
      let total = 0, games = 0
      for (let index = 0; index < 25; index++) {
        const created = createRecruiterDuel(pool, `stars-${index}`, createDrawContext(pool, [], CURRENT_DRAW_POLICY), config)
        if (!created.ok) continue
        games++
        total += created.game.rounds.filter((round) => stars.has(personKey(pool.find((p) => p.id === round.playerId)!))).length
      }
      return total / games
    }
    const now = perGame(europe), before = perGame(old)
    expect(now).toBeGreaterThanOrEqual(1.5)
    expect(now).toBeGreaterThan(before * 1.5)
  })
})
