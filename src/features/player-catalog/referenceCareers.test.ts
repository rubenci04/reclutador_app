import { describe, expect, it } from 'vitest'
import { LEAGUE_PLAYERS } from './leagueCollections'
import { playerCareerReferences } from './playerDetails'
import { referenceCareers } from './referenceCareers'
import { coachesForMode } from '../coaches/coachContext'
import type { ThemedModeId } from '../themed-modes/modeTypes'

describe('reference club periods', () => {
  it('covers all 600 imported legend cards with sourced years at their reference club', () => {
    const legends = LEAGUE_PLAYERS.filter(p => p.category === 'legend')
    expect(legends).toHaveLength(600)
    for (const player of legends) {
      const periods = playerCareerReferences(player)
      expect(periods.length, player.id).toBeGreaterThan(0)
      for (const period of periods) {
        expect(period.url).toMatch(/^https:\/\//)
        expect(period.from).toBeGreaterThan(1850)
        if (period.to !== null) expect(period.to).toBeGreaterThanOrEqual(period.from)
      }
    }
  })
  it.each([
    ['import_esp_esp_leg_lionel_andres_messi_cuccittini', 2004, 2021],
    ['import_esp_esp_leg_cristiano_ronaldo_dos_santos_aveiro', 2009, 2018],
    ['import_esp_esp_leg_diego_armando_maradona', 1982, 1984],
    ['import_esp_esp_leg_alfredo_stefano_di_stefano_laulhe', 1953, 1964],
    ['import_esp_esp_leg_hugo_sanchez_marquez', 1985, 1992],
    ['import_esp_esp_leg_sergio_ramos_garcia', 2005, 2021],
    ['import_esp_esp_leg_gareth_frank_bale', 2013, 2022],
  ])('%s shows the reference spell rather than another club', (id, from, to) => {
    const player = LEAGUE_PLAYERS.find(p => p.id === id)!
    expect(playerCareerReferences(player)).toContainEqual(expect.objectContaining({ from, to }))
  })
  it('keeps Cristiano’s United spells separate from his Madrid edition', () => {
    const player = LEAGUE_PLAYERS.find(p => p.id === 'import_eng_epl_ley_001')!
    expect(playerCareerReferences(player).map(p => [p.from, p.to])).toEqual([[2003, 2009], [2021, 2022]])
  })
  it('covers every primary and secondary coach affiliation used by an edition', () => {
    const modes: ThemedModeId[] = ['GLOBAL_CLASSIC', 'LEGENDS_ONLY', 'ARGENTINA_CURRENT', 'ARGENTINA_LEGENDS', 'ENGLAND_LEAGUE', 'ENGLAND_LEGENDS', 'SPAIN_LEAGUE', 'SPAIN_LEGENDS', 'BRAZIL_CURRENT', 'BRAZIL_LEGENDS', 'EUROPE_CURRENT', 'EUROPE_LEGENDS', 'SOUTH_AMERICA_CURRENT', 'SOUTH_AMERICA_LEGENDS']
    for (const mode of modes) for (const coach of coachesForMode(mode)) for (const team of [coach.team, coach.secondaryTeam]) {
      if (team) expect(referenceCareers(coach.id, team).length, `${mode}: ${coach.id}: ${team}`).toBeGreaterThan(0)
    }
    expect(referenceCareers('coach_071', 'FC Barcelona').map(p => [p.from, p.to])).toEqual([[1983, 1984]])
    expect(referenceCareers('coach_092', 'Manchester United').map(p => [p.from, p.to])).toEqual([[1986, 2013]])
  })
})
