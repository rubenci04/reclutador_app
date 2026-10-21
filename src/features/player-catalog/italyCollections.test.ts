import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import italian from '../../data/league-collections/italy.json'
import aliases from '../../data/league-collections/italyIdentityAliases.json'
import { LEAGUE_PLAYERS } from './leagueCollections'
import { ALL_CURRENT, GLOBAL_LEGENDS, MASTER_CATALOG, personKey, WORLD_LEGEND_POLICY } from './globalCollection'
import { calculatePlayerPrice } from './calculatePlayerPrice'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { EUROPEAN_NATIONALITIES, LATIN_AMERICAN_ASSOCIATIONS } from '../themed-modes/nationalityRegions'
import { RECORDED_COLLECTIONS, recordedCollection } from './recordedCollections'
import { catalogKey, createDrawContext, parseReplay, readDrawHistory } from '../recruiter-duel/drawHistory'

describe('DATA-ITA-001 collections', () => {
  it('preserves exactly the 200 + 200 supplied rows and prices without invented individual skills', () => {
    const text = readFileSync('docs/ranking_serie_a_2026_top_200_actuales_y_200_leyendas.txt', 'utf8')
    const lines = text.split(/\r?\n/).filter(l => /^\d{3}\s*\|/.test(l))
    expect(italian).toHaveLength(400)
    for (const [index, row] of italian.entries()) {
      expect(row.sourceLine).toBe(lines[index])
      expect(row.sourceSha256).toBe(createHash('sha256').update(text).digest('hex'))
      const cells = lines[index].split('|').map(s => s.trim())
      expect([row.name, row.abbreviation, row.sourceNationality, row.sourcePosition, row.sourceFoot, row.club]).toEqual(cells.slice(1, 7))
      const player = LEAGUE_PLAYERS.find(p => p.id === row.id)!
      expect(player.overall_rating).toBe(Number(cells.at(-1)))
      expect(player.price).toBe(calculatePlayerPrice(row.sourceRating))
      expect(player.dominantFoot).toBe(row.dominantFoot)
      expect(player.category).toBe(index < 200 ? 'contemporary' : 'legend')
      expect(row.sourceClubPeriod).toBe(index < 200 ? null : cells[7])
    }
    expect(catalogForMode('ITALY_CURRENT')).toHaveLength(200)
    expect(catalogForMode('ITALY_LEGENDS')).toHaveLength(200)
  })
  it('merges reviewed editions while preserving namesakes and source OVRs', () => {
    for (const group of aliases) expect(new Set(group.map(id => personKey(MASTER_CATALOG.find(p => p.id === id)!))).size).toBe(1)
    const edersons = ALL_CURRENT.filter(p => /éderson|ederson/i.test(p.name))
    expect(edersons.some(p => p.position === 'MED')).toBe(true)
    expect(edersons.some(p => p.position === 'ARQ')).toBe(true)
    expect(new Set(edersons.map(personKey)).size).toBe(edersons.length)
    for (const p of GLOBAL_LEGENDS.filter(p => p.id.startsWith('import_'))) expect(p.overall_rating).toBe(LEAGUE_PLAYERS.find(row => row.id === p.id)!.overall_rating)
  })
  it('uses an explicit closed WORLD policy and retains local legends regionally', () => {
    expect(new Set(GLOBAL_LEGENDS.map(personKey)).size).toBe(GLOBAL_LEGENDS.length)
    for (const name of ['Pelé', 'Maradona', 'Ronaldo', 'Maldini', 'Neuer']) expect(GLOBAL_LEGENDS.some(p => p.name.includes(name))).toBe(true)
    expect(GLOBAL_LEGENDS.some(p => p.name.includes('Maidana'))).toBe(false)
    for (const mode of ['ARGENTINA_LEGENDS', 'SOUTH_AMERICA_LEGENDS'] as const) expect(catalogForMode(mode).some(p => p.name.includes('Maidana'))).toBe(true)
    expect(WORLD_LEGEND_POLICY.approved).toHaveLength(GLOBAL_LEGENDS.length)
    expect(WORLD_LEGEND_POLICY.unresolvedNames).toContain('Rafael Márquez')
  })
  it('grows all regional pools by association independently of league and retains every eligible identity', () => {
    for (const [mode, scope, category] of [
      ['EUROPE_CURRENT', EUROPEAN_NATIONALITIES, 'contemporary'], ['EUROPE_LEGENDS', EUROPEAN_NATIONALITIES, 'legend'],
      ['SOUTH_AMERICA_CURRENT', LATIN_AMERICAN_ASSOCIATIONS, 'contemporary'], ['SOUTH_AMERICA_LEGENDS', LATIN_AMERICAN_ASSOCIATIONS, 'legend'],
    ] as const) {
      const players = catalogForMode(mode), keys = new Set(players.map(personKey))
      expect(players.length).toBeGreaterThanOrEqual(300)
      expect(keys.size).toBe(players.length)
      for (const row of italian.filter(p => scope.has(p.nationality) && p.category === category)) expect(keys.has(personKey(LEAGUE_PLAYERS.find(p => p.id === row.id)!)), row.name).toBe(true)
    }
    expect(catalogForMode('GLOBAL_CLASSIC')).toEqual(expect.arrayContaining([...ALL_CURRENT]))
  })
  it('reads full expanded replay/history payloads and frozen previous collections', () => {
    const players = catalogForMode('GLOBAL_CLASSIC')
    const replay = { seed: 'italy-replay', context: createDrawContext(players) }
    const json = JSON.stringify(replay)
    expect(json.length).toBeGreaterThan(250_000)
    expect(parseReplay(json, players)).toEqual(replay)
    const history = { version: 1, games: Array.from({ length: 5 }, () => replay) }
    expect(readDrawHistory({ getItem: () => JSON.stringify(history) }, players)).toEqual({ history, warning: false })
    for (const old of RECORDED_COLLECTIONS) {
      expect(recordedCollection(catalogKey(old.players))).toEqual(old.players)
      expect(parseReplay(JSON.stringify({ seed: 'old', context: createDrawContext(old.players) }), old.players)).not.toBeNull()
    }
  })
})
