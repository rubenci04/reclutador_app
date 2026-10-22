import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { CATEGORY_GROUPS } from './categoryTree'
import { catalogForMode, modeSource, PLAYABLE_MODES } from './modeCatalog'
import { regionalPlayersForMode, REGIONAL_MODE_IDS } from './regionalCatalog'
import { LATIN_AMERICAN_ASSOCIATIONS, EUROPEAN_NATIONALITIES } from './nationalityRegions'
import { defaultBudgetForMode } from '../player-catalog/leagueCollections'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { CLASSIC_CONFIG, preflightMatchConfig } from '../recruiter-duel/matchConfig'
import { eligiblePlayers } from './filterEngine'
import { THEMED_MODES } from './modes'
import { coachesForMode } from '../coaches/coachContext'

describe('category tree and nationality collections', () => {
  it('has nine categories, two editions each and no mixed legacy league in the visible tree', () => {
    expect(CATEGORY_GROUPS.map((g) => g.id)).toEqual(['argentina', 'brazil', 'mexico', 'spain', 'england', 'italy', 'global', 'latinAmerica', 'europe'])
    expect(CATEGORY_GROUPS.every((g) => g.modes.length === 2)).toBe(true)
    expect(new Set(CATEGORY_GROUPS.flatMap((g) => [...g.modes])).size).toBe(18)
    expect(CATEGORY_GROUPS.flatMap((g) => [...g.modes])).not.toContain('ARGENTINA_CLUBS')
    expect(catalogForMode('ARGENTINA_CLUBS')).toHaveLength(200)
  })
  it('includes Portuguese Cristiano in Europe current and accepts an outside-Europe club fixture', () => {
    const cristiano = DRAFT_CATALOG.find((p) => p.name === 'Cristiano Ronaldo')!
    expect(cristiano.nationality).toBe('POR')
    const outside = { ...cristiano, club_tag: 'al_nassr' }
    expect(eligiblePlayers([outside], THEMED_MODES.find((m) => m.id === 'EUROPE_CURRENT')!, {})).toEqual([outside])
    expect(catalogForMode('EUROPE_CURRENT')).toContain(cristiano)
    expect(catalogForMode('SOUTH_AMERICA_CURRENT')).not.toContain(cristiano)
    expect(catalogForMode('EUROPE_CURRENT').filter((p) => p.name.includes('Cristiano'))).toHaveLength(1)
  })
  it('includes Latin Americans outside CONMEBOL, and European countries beyond the old limited set', () => {
    const definition = THEMED_MODES.find((m) => m.id === 'SOUTH_AMERICA_CURRENT')!
    const players = ['MEX', 'CRC', 'PAN', 'CUB', 'BRA', 'USA', 'CAN', 'ENG'].map((nationality, index) => ({ ...DRAFT_CATALOG[0], id: `region_${index}`, nationality, club_tag: 'club_in_japan' }))
    expect(eligiblePlayers(players, definition, {}).map((p) => p.nationality)).toEqual(['MEX', 'CRC', 'PAN', 'CUB', 'BRA'])
    expect(['HUN', 'SRB', 'IRL', 'CZE', 'POR'].every((code) => EUROPEAN_NATIONALITIES.has(code))).toBe(true)
    expect(catalogForMode('SOUTH_AMERICA_CURRENT').some((p) => p.nationality === 'MEX')).toBe(true)
  })
  it.each(REGIONAL_MODE_IDS)('%s is separated by nationality and edition, affordable, and CPU compatible', (id) => {
    const players = catalogForMode(id)
    expect(PLAYABLE_MODES.has(id)).toBe(true)
    expect(players).toBe(regionalPlayersForMode(id))
    expect(modeSource(id).players).toBe(players)
    const region = id.startsWith('EUROPE') ? EUROPEAN_NATIONALITIES : LATIN_AMERICAN_ASSOCIATIONS
    const historical = id.includes('LEGENDS')
    expect(players.every((p) => region.has(p.nationality) && p.category === (historical ? 'legend' : 'contemporary'))).toBe(true)
    const budget = defaultBudgetForMode(id)
    expect(budget).toBe(historical ? 220 : 160)
    expect(preflightMatchConfig(players, { ...CLASSIC_CONFIG, budget, coaches: true, coachReserve: 8 }).ok).toBe(true)
    expect(generateCpuTeam(players, `regional-${id}`, budget).team.players).toHaveLength(11)
    const coaches = coachesForMode(id)
    expect(coaches.length).toBeGreaterThanOrEqual(3)
    expect(coaches.every((c) => region.has(c.nationality) && c.status === (historical ? 'LEGEND' : 'ACTIVE'))).toBe(true)
  })
})
