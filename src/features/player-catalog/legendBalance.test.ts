import { describe, expect, it } from 'vitest'
import mexican from '../../data/league-collections/mexico.json'
import policy from '../../data/league-collections/legendBalancePolicy.json'
import preBalance from '../../data/league-collections/preBalanceCollections.json'
import { BALANCED_LEGEND_EDITIONS, LEAGUE_PLAYERS, LEAGUE_PROVENANCE, WORLD_EDITIONS } from './leagueCollections'
import { GLOBAL_LEGENDS, MASTER_CATALOG, personKey } from './globalCollection'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { crossCategoryCatalog } from '../recruiter-duel/crossCategoryDraw'
import { RECORDED_COLLECTIONS, recordedCollection } from './recordedCollections'
import { catalogKey, createDrawContext, parseReplay } from '../recruiter-duel/drawHistory'
import { calculatePlayerPrice } from './calculatePlayerPrice'
import { getClubVisual, neutralClubVisual } from './clubVisuals'
import { getClubIdentity } from './clubRegistry'
import { balancedRatings } from './legendBalance'
import { validatePlayer } from './validatePlayer'
import { preflightMatchConfig, CLASSIC_CONFIG } from '../recruiter-duel/matchConfig'
import type { ThemedModeId } from '../themed-modes/modeTypes'

const row = (id: string) => LEAGUE_PROVENANCE.find((p) => p.id === id)!
const exceptions = new Set(policy.exceptions.map((entry) => entry.id))
const count = (values: readonly number[], value: number) => values.filter((v) => v === value).length

describe('DATA-VIS-002 Liga MX club identities', () => {
  const clubs = [...new Map(mexican.map((r) => [r.club_tag, r.club])).entries()]
  it('covers all 28 Mexican club tags with a name and a visual of their own', () => {
    expect(clubs).toHaveLength(28)
    for (const [tag, name] of clubs) {
      const visual = getClubVisual(tag)
      expect(visual.id, tag).not.toBe(neutralClubVisual.id)
      expect(visual.primary, tag).not.toBe(neutralClubVisual.primary)
      expect(getClubIdentity(tag)?.name, tag).toBe(name)
    }
  })
  it('gives the twelve main clubs distinct colour pairs', () => {
    const main = ['club_america', 'guadalajara', 'cruz_azul', 'toluca', 'pumas_unam', 'tigres_uanl', 'monterrey', 'atlas', 'santos_laguna', 'club_leon', 'pachuca', 'necaxa']
    const pairs = main.map((tag) => { const v = getClubVisual(tag); return `${v.primary}|${v.secondary}|${v.pattern ?? ''}` })
    expect(new Set(pairs).size).toBe(main.length)
  })
})

describe('DATA-VIS-002 legend balance (legend-balance-v1)', () => {
  const modes = ['ARGENTINA_LEGENDS', 'BRAZIL_LEGENDS', 'MEXICO_LEGENDS'] as const satisfies readonly ThemedModeId[]
  it('keeps argentine and brazilian legends at 92, with explicit 93 exceptions only', () => {
    for (const mode of ['ARGENTINA_LEGENDS', 'BRAZIL_LEGENDS'] as const) {
      const ovr = catalogForMode(mode).map((p) => p.overall_rating)
      expect(Math.max(...ovr)).toBe(93)
      for (const player of catalogForMode(mode)) if (player.overall_rating > 92) expect(exceptions.has(player.id), player.id).toBe(true)
      expect(count(ovr, 92)).toBeLessThanOrEqual(Math.ceil(ovr.length * 0.15))
    }
  })
  it('caps mexican legends at 90 without piling them on the maximum', () => {
    const ovr = catalogForMode('MEXICO_LEGENDS').map((p) => p.overall_rating)
    expect(Math.max(...ovr)).toBe(90)
    expect(count(ovr, 90)).toBeLessThanOrEqual(15)
  })
  it.each(modes)('%s keeps the 001-150 hierarchy, ids and Top 150 size', (mode) => {
    const players = catalogForMode(mode)
    expect(players).toHaveLength(150)
    const ordered = [...players].sort((a, b) => row(a.id).sourceRank - row(b.id).sourceRank)
    const bySource = [...players].sort((a, b) => row(b.id).sourceRating - row(a.id).sourceRating || row(a.id).sourceRank - row(b.id).sourceRank)
    // Hierarchy: a higher source OVR never ends below a lower source OVR.
    for (let i = 1; i < bySource.length; i++) if (!exceptions.has(bySource[i].id)) expect(bySource[i].overall_rating).toBeLessThanOrEqual(bySource[i - 1].overall_rating)
    expect(ordered.map((p) => row(p.id).sourceRank)).toEqual(Array.from({ length: 150 }, (_, i) => i + 1))
    for (const player of players) expect(LEAGUE_PLAYERS.some((p) => p.id === player.id)).toBe(true)
  })
  it('never raises an edition and leaves untouched editions identical to the source', () => {
    for (const mode of modes) for (const player of catalogForMode(mode)) {
      const source = LEAGUE_PLAYERS.find((p) => p.id === player.id)!
      expect(player.overall_rating).toBeLessThanOrEqual(source.overall_rating)
      if (player.overall_rating === source.overall_rating) expect(player).toEqual(source)
    }
    expect(catalogForMode('ENGLAND_LEGENDS')).toEqual(catalogForMode('ENGLAND_LEGENDS').map((p) => LEAGUE_PLAYERS.find((s) => s.id === p.id)))
    for (const mode of ['SPAIN_LEGENDS', 'ITALY_LEGENDS'] as const) for (const p of catalogForMode(mode)) expect(p).toEqual(LEAGUE_PLAYERS.find((s) => s.id === p.id))
  })
  it('prices and derived attributes follow the effective OVR and stay inside the Player contract', () => {
    const ids = [...BALANCED_LEGEND_EDITIONS.keys()]
    for (const player of BALANCED_LEGEND_EDITIONS.values()) {
      expect(player.price, player.id).toBe(calculatePlayerPrice(player.overall_rating))
      expect(validatePlayer(player, ids).valid, player.id).toBe(true)
      for (const value of [player.att_rating, player.def_rating, player.phy_rating, player.men_rating]) expect(value).toBeLessThanOrEqual(99)
    }
    for (const mode of modes) expect(preflightMatchConfig(catalogForMode(mode), { ...CLASSIC_CONFIG, budget: 200, coaches: true, coachReserve: 8 })).toMatchObject({ ok: true })
  })
  it('does not edit source rows: raw OVRs of the supplied files are intact', () => {
    expect(Math.max(...LEAGUE_PROVENANCE.filter((p) => p.league === 'BRA' && p.category === 'legend').map((p) => p.sourceRating))).toBe(99)
    expect(Math.max(...mexican.filter((p) => p.category === 'legend').map((p) => p.sourceRating))).toBe(96)
    expect(balancedRatings('MEXICO_LEGENDS', mexican.filter((r) => r.category === 'legend')).size).toBe(150)
  })
})

describe('DATA-VIS-002 world editions and history', () => {
  it('keeps the 177 Global Legends at their source OVR, one person each', () => {
    expect(GLOBAL_LEGENDS).toHaveLength(177)
    expect(new Set(GLOBAL_LEGENDS.map(personKey)).size).toBe(177)
    const pele = GLOBAL_LEGENDS.find((p) => p.id === 'world_import_bra_bra_leg_edson_arantes_do_nascimento')!
    expect(pele.overall_rating).toBe(99)
    expect(catalogForMode('BRAZIL_LEGENDS').find((p) => p.id === 'import_bra_bra_leg_edson_arantes_do_nascimento')!.overall_rating).toBe(93)
    expect(personKey(pele)).toBe(personKey(MASTER_CATALOG.find((p) => p.id === 'import_bra_bra_leg_edson_arantes_do_nascimento')!))
    for (const edition of GLOBAL_LEGENDS) {
      const source = MASTER_CATALOG.find((p) => p.id === edition.id.replace(/^world_/, ''))!
      expect(edition.overall_rating, edition.id).toBe(source.overall_rating)
    }
    expect(WORLD_EDITIONS.every((p) => p.id.startsWith('world_'))).toBe(true)
  })
  it('does not put a rebalanced and an unbalanced copy of the same id in a cross pool', () => {
    const pool = crossCategoryCatalog('BRAZIL_LEGENDS', 'SOUTH_AMERICA_LEGENDS')
    expect(new Set(pool.map((p) => p.id)).size).toBe(pool.length)
    expect(pool.find((p) => p.id === 'import_bra_bra_leg_edson_arantes_do_nascimento')!.overall_rating).toBe(93)
  })
  it('keeps pre-balance catalogues for saved games and replays', () => {
    for (const [mode, ids] of Object.entries(preBalance)) {
      const key = catalogKey(ids.map((id) => MASTER_CATALOG.find((p) => p.id === id)!))
      const recorded = recordedCollection(key)
      expect(recorded, mode).toBeDefined()
      expect(recorded!.map((p) => p.id)).toEqual(ids)
      expect(Math.max(...recorded!.map((p) => p.overall_rating)), mode).toBeGreaterThan(93)
      expect(parseReplay(JSON.stringify({ seed: 'old', context: createDrawContext(recorded!) }), recorded!)).not.toBeNull()
    }
    expect(RECORDED_COLLECTIONS.some((c) => c.mode === 'BRAZIL_LEGENDS')).toBe(true)
  })
})
