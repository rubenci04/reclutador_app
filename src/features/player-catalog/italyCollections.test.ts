import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import italian from '../../data/league-collections/italy.json'
import aliases from '../../data/league-collections/italyIdentityAliases.json'
import { LEAGUE_PLAYERS } from './leagueCollections'
import { ALL_CURRENT, GLOBAL_LEGENDS, MASTER_CATALOG, personKey, WORLD_LEGEND_POLICY } from './globalCollection'
import { calculatePlayerPrice } from './calculatePlayerPrice'
import { catalogForMode } from '../themed-modes/modeCatalog'
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
    // Master source keeps 200 rows per edition; new games use only the first 150 editorial positions.
    expect(catalogForMode('ITALY_CURRENT')).toHaveLength(150)
    expect(catalogForMode('ITALY_LEGENDS')).toHaveLength(150)
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
    // SOUTH_AMERICA_LEGENDS is the editorial Top 150 since DATA-REG-003C: local legends stay in their national mode.
    expect(catalogForMode('ARGENTINA_LEGENDS').some(p => p.name.includes('Maidana'))).toBe(true)
    expect(WORLD_LEGEND_POLICY.approved).toHaveLength(GLOBAL_LEGENDS.length)
    expect(WORLD_LEGEND_POLICY.unresolvedNames).toContain('Rafael Márquez')
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
