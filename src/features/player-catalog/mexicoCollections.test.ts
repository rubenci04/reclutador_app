import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import mexican from '../../data/league-collections/mexico.json'
import { ELIGIBLE_LEAGUE_PLAYERS, ELIGIBLE_TOP_RANK, LEAGUE_PLAYERS, LEAGUE_PROVENANCE, defaultBudgetForMode } from './leagueCollections'
import { ALL_CURRENT, ALL_LEGENDS, GLOBAL_LEGENDS, MASTER_CATALOG, personKey } from './globalCollection'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { crossCategoryCatalog } from '../recruiter-duel/crossCategoryDraw'
import { CLASSIC_CONFIG, preflightMatchConfig } from '../recruiter-duel/matchConfig'
import { calculatePlayerPrice } from './calculatePlayerPrice'
import type { ThemedModeId } from '../themed-modes/modeTypes'

const LEAGUE_MODES: readonly ThemedModeId[] = [
  'ARGENTINA_CURRENT', 'ARGENTINA_LEGENDS', 'BRAZIL_CURRENT', 'BRAZIL_LEGENDS', 'ENGLAND_LEAGUE', 'ENGLAND_LEGENDS',
  'SPAIN_LEAGUE', 'SPAIN_LEGENDS', 'ITALY_CURRENT', 'ITALY_LEGENDS', 'MEXICO_CURRENT', 'MEXICO_LEGENDS',
]
const config = (mode: ThemedModeId) => ({ ...CLASSIC_CONFIG, budget: defaultBudgetForMode(mode), coaches: true, coachReserve: 8 })

describe('DATA-MX-001 Liga MX import', () => {
  it('preserves the 150 + 150 supplied rows, their order, original OVR and tactical position', () => {
    const text = readFileSync('docs/ranking_liga_mx_2026_top_150_actuales_y_150_leyendas.txt', 'utf8')
    const lines = text.split(/\r?\n/).filter(l => /^\d{3}\s*\|/.test(l))
    expect(mexican).toHaveLength(300)
    for (const [index, row] of mexican.entries()) {
      expect(row.sourceLine).toBe(lines[index])
      expect(row.sourceSha256).toBe(createHash('sha256').update(text).digest('hex'))
      const cells = lines[index].split('|').map(s => s.trim())
      expect([row.name, row.abbreviation, row.sourceNationality, row.sourcePosition, row.sourceFoot, row.club]).toEqual(cells.slice(1, 7))
      expect(row.sourceRank).toBe(index % 150 + 1)
      expect(row.sourceClubPeriod).toBe(index < 150 ? null : cells[7])
      const player = LEAGUE_PLAYERS.find(p => p.id === row.id)!
      expect(player.overall_rating).toBe(Number(cells.at(-1)))
      expect(player.price).toBe(calculatePlayerPrice(row.sourceRating))
      expect(player.category).toBe(index < 150 ? 'contemporary' : 'legend')
    }
    expect(new Set(mexican.map(r => r.id)).size).toBe(300)
    expect(new Set(mexican.map(r => r.sourceId)).size).toBe(300)
  })
  it('keeps homonyms apart and reconciles reviewed same-person editions', () => {
    const key = (id: string) => personKey(MASTER_CATALOG.find(p => p.id === id)!)
    expect(key('import_mex_act_001')).not.toBe(key('import_bra_bra_act_paulo_henrique_sampaio_filho'))
    expect(key('import_mex_act_093')).not.toBe(key('import_bra_bra_act_alan_steven_franco_palma'))
    const same = [
      ['import_mex_act_005', 'import_arg_act_006'], ['import_mex_act_015', 'plr_004'],
      ['import_mex_leg_005', 'import_esp_esp_leg_hugo_sanchez_marquez'], ['import_mex_leg_133', 'import_bra_bra_leg_ronaldo_de_assis_moreira'],
      ['import_mex_leg_140', 'import_esp_esp_leg_claudio_javier_lopez'],
    ]
    for (const [a, b] of same) expect(key(a), a).toBe(key(b))
  })
})

describe('DATA-MX-001 Top 150 eligibility', () => {
  it.each(LEAGUE_MODES)('%s offers exactly the first 150 editorial positions, unique and by rank', (mode) => {
    const catalog = catalogForMode(mode)
    expect(catalog).toHaveLength(150)
    expect(new Set(catalog.map(p => p.id)).size).toBe(150)
    const ranks = catalog.map(p => LEAGUE_PROVENANCE.find(row => row.id === p.id)!.sourceRank).sort((a, b) => a - b)
    expect(ranks).toEqual(Array.from({ length: 150 }, (_, i) => i + 1))
  })
  it('keeps the Italian master source whole while excluding positions 151-200 from new games', () => {
    const italy = LEAGUE_PROVENANCE.filter(p => p.league === 'ITA')
    expect(italy).toHaveLength(400)
    expect(LEAGUE_PLAYERS.filter(p => p.id.startsWith('import_ita_'))).toHaveLength(400)
    expect(MASTER_CATALOG.filter(p => p.id.startsWith('import_ita_'))).toHaveLength(400)
    expect(ELIGIBLE_LEAGUE_PLAYERS.filter(p => p.id.startsWith('import_ita_'))).toHaveLength(300)
    expect(italy.filter(p => p.sourceRank > ELIGIBLE_TOP_RANK).every(p => !ALL_CURRENT.some(c => c.id === p.id) && !ALL_LEGENDS.some(c => c.id === p.id))).toBe(true)
  })
  it.each(LEAGUE_MODES)('%s is playable: goalkeepers, positions, affordable budget, CPU preflight', (mode) => {
    const catalog = catalogForMode(mode)
    const count = (position: string) => catalog.filter(p => p.position === position).length
    expect(count('ARQ')).toBeGreaterThanOrEqual(5)
    for (const position of ['DEF', 'MED', 'DEL']) expect(count(position)).toBeGreaterThanOrEqual(15)
    expect(defaultBudgetForMode(mode)).toBe(mode.endsWith('LEGENDS') ? 200 : 150)
    expect(preflightMatchConfig(catalog, config(mode))).toMatchObject({ ok: true })
  })
  it('supports crossing Mexico with every other league', () => {
    for (const other of LEAGUE_MODES.filter(m => !m.startsWith('MEXICO'))) {
      expect(preflightMatchConfig(crossCategoryCatalog('MEXICO_CURRENT', other), config('MEXICO_CURRENT')), other).toMatchObject({ ok: true })
    }
  })
})

describe('DATA-MX-001 combined collections', () => {
  const master = (id: string) => MASTER_CATALOG.find(p => p.id === id)!
  it('routes Mexican-league players by nationality, not by where they play', () => {
    const sa = catalogForMode('SOUTH_AMERICA_CURRENT'), eu = catalogForMode('EUROPE_CURRENT')
    const inSa = (id: string) => sa.some(p => personKey(p) === personKey(master(id)))
    const inEu = (id: string) => eu.some(p => personKey(p) === personKey(master(id)))
    expect(inSa('import_mex_act_002')).toBe(true)
    expect(inSa('import_mex_act_003')).toBe(true)
    expect(master('import_mex_act_001').nationality).toBe('POR')
    expect(inSa('import_mex_act_001')).toBe(false)
    expect(inEu('import_mex_act_001')).toBe(true)
    const eligibleMexicans = mexican.filter(r => r.category === 'contemporary' && r.nationality === 'MEX')
    expect(eligibleMexicans.every(r => inSa(r.id))).toBe(true)
  })
  it('deduplicates people in every combined collection and sets no 150 cap', () => {
    for (const mode of ['SOUTH_AMERICA_CURRENT', 'SOUTH_AMERICA_LEGENDS', 'EUROPE_CURRENT', 'EUROPE_LEGENDS', 'GLOBAL_CLASSIC', 'LEGENDS_ONLY'] as const) {
      const pool = catalogForMode(mode)
      expect(new Set(pool.map(personKey)).size, mode).toBe(pool.length)
    }
    for (const mode of ['SOUTH_AMERICA_CURRENT', 'GLOBAL_CLASSIC'] as const) expect(catalogForMode(mode).length).toBeGreaterThan(150)
  })
  it('does not turn every Mexican legend into a Global Legend', () => {
    expect(GLOBAL_LEGENDS.filter(p => p.id.startsWith('import_mex_'))).toHaveLength(0)
    expect(catalogForMode('SOUTH_AMERICA_LEGENDS').some(p => p.id.startsWith('import_mex_leg_'))).toBe(true)
  })
})
