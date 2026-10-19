import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { GLOBAL_CURRENT, personKey } from '../player-catalog/globalCollection'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { FORMATION_IDS, formationAffinity, formationSlots, organizeFormation } from '../tactics/formations'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { MATCH_RULES_VERSION } from '../local-match/matchTypes'
import { isValidOrganizedLineup, simulateMatch } from '../local-match/simulator'
import { nextSeriesMatch, seriesStanding } from '../local-match/matchSeries'
import { createCrossCategoryDraw, crossCategoryCatalog } from './crossCategoryDraw'
import { CLASSIC_CONFIG } from './matchConfig'
import { chooseFormation, startDuelMatch, substituteMarket } from './auctionEngine'
import { GuideDialog } from '../../components/GuideDialog'
import { PlayerIdentity } from './PlayerIdentity'
import { buildInitialDuel } from '../online/onlineDuel'
import { startCoinToss, revealCoinToss } from './auctionEngine'
import { getClubVisual } from '../player-catalog/clubVisuals'
import { buySubstitute } from './auctionEngine'

describe('playtest expansion', () => {
  it('allows two midfield reserves to form 4-5-1 without changing ownership or spending', () => {
    const created = createCrossCategoryDraw('ARGENTINA_CURRENT', 'BRAZIL_CURRENT', 'two-midfielders', { ...CLASSIC_CONFIG, budget: 150 })
    if (!created.ok) throw new Error(created.error)
    const catalog = crossCategoryCatalog('ARGENTINA_CURRENT', 'BRAZIL_CURRENT')
    let game = created.game
    for (let i = 0; i < 2; i++) {
      const midfielder = substituteMarket(game, 'recruiter_one', catalog).find((p) => p.position === 'MED')!
      const bought = buySubstitute(game, 'recruiter_one', midfielder.id, catalog)
      if (!bought.ok) throw new Error(bought.error)
      game = bought.game
    }
    const spent = game.teams.recruiter_one.spent
    const changed = chooseFormation(game, 'recruiter_one', '4-5-1', catalog)
    expect(changed.ok).toBe(true)
    if (changed.ok) {
      expect(changed.game.teams.recruiter_one.spent).toBe(spent)
      expect(isValidOrganizedLineup(changed.game.teams.recruiter_one.lineup, catalog, 150, '4-5-1')).toBe(true)
    }
  })
  it('starts contextual online categories with the existing lobby contract and opens direct draws after the toss', () => {
    const initial = buildInitialDuel({ host: 'Ana', guest: 'Beto' }, 'SPAIN_LEGENDS', 'ARGENTINA_CURRENT')
    expect(initial.phase).toBe('LOBBY')
    expect(initial.coachMode).toBe('SPAIN_LEGENDS')
    expect(initial.config?.budget).toBe(150)
    expect(initial.categoryPair).toEqual({ recruiter_one: 'SPAIN_LEGENDS', recruiter_two: 'ARGENTINA_CURRENT' })
    const tossed = startCoinToss(initial, 'heads')
    if (!tossed.ok) throw new Error(tossed.error)
    const opened = revealCoinToss(tossed.game)
    expect(opened.ok && opened.game.phase).toBe('TEAMS_COMPLETED')
  })
  it('offers 300 distinct current people, including active world legends in both editions and nationality regions', () => {
    expect(GLOBAL_CURRENT).toHaveLength(300)
    expect(new Set(GLOBAL_CURRENT.map(personKey)).size).toBe(300)
    for (const surname of ['Messi', 'Cristiano', 'Neuer']) {
      expect(GLOBAL_CURRENT.some((p) => p.name.includes(surname))).toBe(true)
      expect(catalogForMode('LEGENDS_ONLY').some((p) => p.name.includes(surname))).toBe(true)
    }
    for (const mode of ['EUROPE_CURRENT', 'EUROPE_LEGENDS'] as const) {
      expect(catalogForMode(mode).some((p) => p.name.includes('Cristiano'))).toBe(true)
      expect(catalogForMode(mode).some((p) => p.name.includes('Neuer'))).toBe(true)
      expect(catalogForMode(mode).some((p) => p.name.includes('Messi'))).toBe(false)
    }
  })
  it.each(FORMATION_IDS)('builds and simulates %s only with the required real positions and preserves it throughout the series', (formation) => {
    const owned = (['ARQ', 'DEF', 'MED', 'DEL'] as const).flatMap((pos, i) => GLOBAL_CURRENT.filter((p) => p.position === pos).slice(0, Math.max([1, 4, 3, 3][i], formationSlots(formation).filter((s) => s.position === pos).length)).map((p) => p.id))
    const lineup = organizeFormation(owned, formation, GLOBAL_CURRENT)!
    expect(isValidOrganizedLineup(lineup, GLOBAL_CURRENT, 300, formation)).toBe(true)
    for (const slot of formationSlots(formation)) expect(GLOBAL_CURRENT.find((p) => p.id === lineup[slot.id])!.position).toBe(slot.position)
    const result = simulateMatch({ localLineup: lineup, cpuLineup: lineup, catalog: GLOBAL_CURRENT, budget: 300, formations: { local: formation, cpu: formation }, rulesVersion: MATCH_RULES_VERSION, catalogVersion: 'catalog_v1', seed: `formation:${formation}`, actionModel: 'action-v2', seriesFormat: 'home-away' })
    expect(nextSeriesMatch(result, 2, GLOBAL_CURRENT).formations).toEqual(result.formations)
    expect(Object.values(result.strengths.local).every(Number.isFinite)).toBe(true)
    expect(organizeFormation([], formation, GLOBAL_CURRENT)).toBeNull()
  })
  it('bounds affinity and closes new series after two decisive legs, or three tied legs', () => {
    expect(formationAffinity('5-4-1', 'LOW_BLOCK')).toEqual({ attack: 0, defense: 1.5, midfield: 0 })
    expect(formationAffinity('4-3-3', 'LOW_BLOCK').defense).toBe(0)
    const team = generateCpuTeam(GLOBAL_CURRENT, 'series').team
    const first = simulateMatch({ localLineup: team.lineup, cpuLineup: team.lineup, catalog: GLOBAL_CURRENT, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: 'series', seriesFormat: 'home-away' })
    const draw = { ...first, winner: 'draw' as const }; const win = { ...first, winner: 'local' as const }
    expect(seriesStanding([win]).closed).toBe(false)
    expect(seriesStanding([win, draw]).closed).toBe(true)
    expect(seriesStanding([draw, draw]).closed).toBe(false)
    expect(seriesStanding([draw, draw, draw])).toMatchObject({ closed: true, needsPenalties: true })
  })
  it('draws exclusive category-specific elevens, keeps coach/bench eligibility, and disables automatic substitutions', () => {
    const config = { ...CLASSIC_CONFIG, budget: 150, coaches: true, coachReserve: 8 }
    const created = createCrossCategoryDraw('ARGENTINA_CURRENT', 'EUROPE_LEGENDS', 'cross', config)
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const catalog = crossCategoryCatalog('ARGENTINA_CURRENT', 'EUROPE_LEGENDS')
    const game = created.game
    for (const side of ['recruiter_one', 'recruiter_two'] as const) {
      const eligible = new Set(catalogForMode(game.categoryPair![side]).map((p) => p.id))
      expect(Object.values(game.teams[side].lineup).every((id) => eligible.has(id!))).toBe(true)
      expect(game.teams[side].spent).toBeLessThanOrEqual(142)
    }
    expect(chooseFormation(game, 'recruiter_one', '5-4-1', catalog).ok).toBe(false)
    const declined = { ...game, teams: { ...game.teams, recruiter_one: { ...game.teams.recruiter_one, coachDeclined: true } } }
    expect(substituteMarket(declined, 'recruiter_one', catalog).every((p) => catalogForMode('ARGENTINA_CURRENT').some((q) => q.id === p.id))).toBe(true)
    const played = startDuelMatch(game, catalog, undefined, true)
    expect(played.ok).toBe(true)
    if (played.ok) expect(played.game.matchResult?.substitutions).toBeUndefined()
    expect(createCrossCategoryDraw('ARGENTINA_CURRENT', 'EUROPE_LEGENDS', 'cross', config)).toEqual(created)
  })
  it.each(['es-AR', 'en', 'pt-BR'] as const)('renders an acknowledged guide and translated role/source/avatar in %s', async (language) => {
    const i18n = await createI18n(language); const close = vi.fn()
    const view = render(<I18nextProvider i18n={i18n}><GuideDialog title={i18n.t('playtest.guides.squad.title')} body={i18n.t('playtest.guides.squad.body')} onClose={close} /></I18nextProvider>)
    expect(screen.getByRole('dialog')).toHaveAccessibleName(i18n.t('playtest.guides.squad.title'))
    fireEvent.click(screen.getByRole('button', { name: i18n.t('playtest.understood') })); expect(close).toHaveBeenCalledOnce()
    view.unmount()
    expect(i18n.t('playtest.occupation.WIDE_PLAY')).not.toContain('playtest.')
    render(<I18nextProvider i18n={i18n}><PlayerIdentity player={catalogForMode('ARGENTINA_CURRENT')[0]} /></I18nextProvider>)
    expect(document.body.textContent).not.toContain('playtest.')
    expect(document.querySelector('.player-character')).toBeInTheDocument()
    expect(getClubVisual('selection_argentina').primary).toBe('#82c9ec')
    expect(screen.getByRole('link', { name: i18n.t('playerClubs.source') })).toHaveAttribute('href')
  })
})
