import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ALL_CURRENT, GLOBAL_CURRENT, GLOBAL_CURRENT_ALL, GLOBAL_LEGENDS, GLOBAL_LEGENDS_ALL, GLOBAL_LEGEND_CANDIDATES, MASTER_CATALOG, personKey } from './globalCollection'
import { categoryRanking, orderedCategory, rankBadge } from './categoryRanking'
import { LEAGUE_PROVENANCE } from './leagueCollections'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { recordedCollection } from './recordedCollections'
import frozen from '../../data/league-collections/preRank008Collections.json'
import { catalogKey, createDrawContext, CURRENT_DRAW_POLICY } from '../recruiter-duel/drawHistory'
import { createRecruiterDuel } from '../recruiter-duel/auctionEngine'
import { CLASSIC_CONFIG } from '../recruiter-duel/matchConfig'
import { createCrossCategoryDraw } from '../recruiter-duel/crossCategoryDraw'
import type { Player } from '../../types/player'

const POSITIONS = ['ARQ', 'DEF', 'MED', 'DEL'] as const
const stats = (players: readonly Player[]) => {
  const of = (list: readonly Player[]) => list.length ? { count: list.length, min: Math.min(...list.map((p) => p.overall_rating)), max: Math.max(...list.map((p) => p.overall_rating)), mean: Math.round(list.reduce((s, p) => s + p.overall_rating, 0) / list.length * 10) / 10 } : null
  return { all: of(players), ...Object.fromEntries(POSITIONS.map((position) => [position, of(players.filter((p) => p.position === position))])) }
}
const league = new Map(LEAGUE_PROVENANCE.map((row) => [row.id, row.league]))
const origin = (p: Player) => league.get(p.id.replace(/^world_/, '')) ?? 'CATALOG'
const byOrigin = (players: readonly Player[]) => players.reduce<Record<string, number>>((m, p) => ({ ...m, [origin(p)]: (m[origin(p)] ?? 0) + 1 }), {})

describe('RANK-008 Global Top 150', () => {
  it('has exactly 150 distinct identities per category and no weaker edition while a better one of the position was left out', () => {
    for (const pool of [GLOBAL_CURRENT, GLOBAL_LEGENDS]) {
      expect(pool).toHaveLength(150)
      expect(new Set(pool.map(personKey)).size).toBe(150)
      expect(new Set(pool.map((p) => p.id)).size).toBe(150)
    }
    expect(catalogForMode('GLOBAL_CLASSIC')).toBe(GLOBAL_CURRENT)
    expect(catalogForMode('LEGENDS_ONLY')).toBe(GLOBAL_LEGENDS)
    expect(GLOBAL_CURRENT.every((p) => p.category === 'contemporary') && GLOBAL_LEGENDS.every((p) => p.category === 'legend')).toBe(true)
    expect(Math.min(...GLOBAL_CURRENT.map((p) => p.overall_rating))).toBeGreaterThanOrEqual(80)
    for (const position of POSITIONS) {
      const inside = GLOBAL_CURRENT.filter((p) => p.position === position), outside = GLOBAL_CURRENT_ALL.filter((p) => p.position === position && !GLOBAL_CURRENT.includes(p))
      expect(Math.max(...outside.map((p) => p.overall_rating)), position).toBeLessThanOrEqual(Math.min(...inside.map((p) => p.overall_rating)))
    }
    expect(GLOBAL_LEGEND_CANDIDATES.length).toBeGreaterThan(177)
  })
  it('keeps the principal figures, the master and the archive', () => {
    for (const name of ['Lionel Messi', 'Kylian Mbappé', 'Erling Haaland', 'Rodri', 'Lamine Yamal', 'Vinícius Júnior', 'Harry Kane']) expect(GLOBAL_CURRENT.some((p) => p.name === name), name).toBe(true)
    expect(GLOBAL_LEGENDS.slice(0, 3).map((p) => p.name)).toEqual(['Lionel Messi', 'Diego Maradona', 'Pelé'])
    expect(GLOBAL_LEGENDS.slice(0, 3).map((p) => p.overall_rating)).toEqual([99, 98, 99])
    expect(GLOBAL_LEGENDS_ALL).toHaveLength(177)
    expect(GLOBAL_CURRENT_ALL).toHaveLength(frozen.GLOBAL_CLASSIC.length)
    expect(ALL_CURRENT).toHaveLength(1039)
    for (const id of [...frozen.GLOBAL_CLASSIC, ...frozen.LEGENDS_ONLY]) expect(MASTER_CATALOG.some((p) => p.id === id), id).toBe(true)
    expect(GLOBAL_LEGENDS.find((p) => p.name === 'Pelé')!.id.startsWith('world_')).toBe(true)
    expect(catalogForMode('BRAZIL_LEGENDS').find((p) => p.name === 'Pelé')!.overall_rating).toBeLessThan(99)
  })
  it('makes the 22-card auction viable with depth at every position', () => {
    for (const [mode, pool, budget] of [['GLOBAL_CLASSIC', GLOBAL_CURRENT, 200], ['LEGENDS_ONLY', GLOBAL_LEGENDS, 250]] as const) {
      for (const position of POSITIONS) expect(pool.filter((p) => p.position === position).length, `${mode} ${position}`).toBeGreaterThanOrEqual({ ARQ: 8, DEF: 20, MED: 20, DEL: 20 }[position])
      for (let i = 0; i < 8; i++) expect(createRecruiterDuel(pool, `rank8-${mode}-${i}`, createDrawContext(pool, [], CURRENT_DRAW_POLICY), { ...CLASSIC_CONFIG, budget, coaches: true, coachReserve: 8 }).ok, `${mode} ${i}`).toBe(true)
    }
  })
  it('recovers the pools in force before this change', () => {
    for (const [mode, ids] of Object.entries(frozen)) {
      const old = ids.map((id) => MASTER_CATALOG.find((p) => p.id === id)!)
      expect(recordedCollection(catalogKey(old))?.map((p) => p.id), mode).toEqual(ids)
    }
  })
  it('writes the audit of the selection: statistics, origin and the best excluded candidates with the reason', () => {
    const excluded = (all: readonly Player[], pool: readonly Player[], reason: string) => all.filter((p) => !pool.includes(p)).slice(0, 30).map((p) => ({ id: p.id, name: p.name, position: p.position, ovr: p.overall_rating, origin: origin(p), reason }))
    const legendsRest = [...GLOBAL_LEGEND_CANDIDATES].sort((a, b) => b.overall_rating - a.overall_rating)
    writeFileSync('docs/qa/GLOBAL-TOP-150-audit.json', JSON.stringify({
      version: 'global-top-150-v1',
      current: { stats: stats(GLOBAL_CURRENT), origin: byOrigin(GLOBAL_CURRENT), cutoffOvr: GLOBAL_CURRENT[149].overall_rating, excludedBest: excluded(GLOBAL_CURRENT_ALL, GLOBAL_CURRENT, 'below the 150th by quality order (OVR, 2026 edition, league editorial rank)') },
      legends: { stats: stats(GLOBAL_LEGENDS), origin: byOrigin(GLOBAL_LEGENDS), cutoffOvr: GLOBAL_LEGENDS[149].overall_rating, candidates: GLOBAL_LEGEND_CANDIDATES.length, newcomers: GLOBAL_LEGENDS.filter((p) => !GLOBAL_LEGENDS_ALL.includes(p)).length, excludedBest: excluded(legendsRest, GLOBAL_LEGENDS, 'below the 150th by quality order; still in the archive and the master') },
    }, null, 1) + '\n')
    expect(stats(GLOBAL_CURRENT).all!.min).toBeGreaterThanOrEqual(80)
  })
})

describe('RANK-008 ranking in the categories', () => {
  it('is the editorial position in the category played, once per category', () => {
    expect(categoryRanking('GLOBAL_CLASSIC')).toBe(categoryRanking('GLOBAL_CLASSIC'))
    expect(categoryRanking('GLOBAL_CLASSIC').size).toBe(150)
    expect(rankBadge('LEGENDS_ONLY', GLOBAL_LEGENDS[0].id)).toEqual({ rank: 1, total: 150 })
    expect(rankBadge('LEGENDS_ONLY', GLOBAL_LEGENDS[2].id)).toEqual({ rank: 3, total: 150 })
    expect(rankBadge('GLOBAL_CLASSIC', 'unknown')).toBeNull()
    expect(rankBadge(undefined, 'x')).toBeNull()
    for (const mode of ['SPAIN_LEAGUE', 'ARGENTINA_LEGENDS', 'EUROPE_CURRENT', 'SOUTH_AMERICA_LEGENDS'] as const) {
      const order = orderedCategory(mode)
      expect(categoryRanking(mode).size).toBe(order.length)
      expect(new Set(order.map((p) => categoryRanking(mode).rankOf(p.id))).size).toBe(order.length)
    }
  })
  it('opens Argentina Actual with Paredes and Di Maria and keeps the rest by effective OVR', () => {
    const order = orderedCategory('ARGENTINA_CURRENT')
    expect(order.slice(0, 2).map((p) => p.name)).toEqual(['Leandro Paredes', 'Ángel Di María'])
    expect(order.slice(2).every((p, i, rest) => i === 0 || rest[i - 1].overall_rating >= p.overall_rating)).toBe(true)
    expect(order[2].name).toBe('Thiago Almada')
    for (const name of ['Ángel Correa', 'Nicolás Otamendi', 'Santiago Ascacíbar', 'Tomás Aranda', 'Leonel Flores']) expect(order.some((p) => p.name === name), name).toBe(true)
    expect(order).toHaveLength(150)
  })
  it('uses the category assigned to each participant in a crossing', () => {
    const created = createCrossCategoryDraw('GLOBAL_CLASSIC', 'ARGENTINA_CURRENT', 'rank8-cross', { ...CLASSIC_CONFIG, budget: 200 })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const pair = created.game.categoryPair!
    const argentine = orderedCategory('ARGENTINA_CURRENT')[5]
    expect(rankBadge(pair.recruiter_two, argentine.id)).toEqual({ rank: 6, total: 150 })
    expect(rankBadge(pair.recruiter_one, argentine.id)?.rank).not.toBe(6)
  })
})
