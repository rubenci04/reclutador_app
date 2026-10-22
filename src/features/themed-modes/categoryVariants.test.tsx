import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import type { Player } from '../../types/player'
import { DRAFT_CATALOG } from '../draft/catalog'
import { eligiblePlayers } from './filterEngine'
import { ARGENTINA_PLAYERS, catalogForMode, modeSource, PLAYABLE_MODES } from './modeCatalog'
import type { MetadataIndex } from './metadata'
import { THEMED_MODES } from './modes'
import { THEMED_MODE_IDS, type ThemedModeId } from './modeTypes'
import { ModeSelector } from './ModeSelector'
import { CATEGORY_GROUPS } from './categoryTree'

const definition = (id: ThemedModeId) => THEMED_MODES.find((mode) => mode.id === id)!
const player = (id: string, category: Player['category'], nationality = 'ARG'): Player => ({
  ...DRAFT_CATALOG[0], id, category, nationality,
})

describe('current and legend category variants', () => {
  it('keeps the selected edition when opening another category or returning to the main menu', async () => {
    const i18n = await createI18n('en')
    const onChange = vi.fn()
    render(<I18nextProvider i18n={i18n}><ModeSelector selected="ARGENTINA_CURRENT" onChange={onChange} /></I18nextProvider>)
    expect(screen.getByRole('status')).toHaveTextContent('Argentine league current players 2026')
    fireEvent.click(screen.getByRole('button', { name: /^Europe/ }))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Back to categories' }))
    expect(screen.getAllByRole('button')).toHaveLength(9)
    expect(screen.getByRole('status')).toHaveTextContent('Argentine league current players 2026')
    fireEvent.click(screen.getByRole('button', { name: /^Argentine league/ }))
    expect(screen.getByRole('button', { name: /^Argentine league current players 2026/ })).toHaveAttribute('aria-pressed', 'true')
    expect(onChange).not.toHaveBeenCalled()
  })
  it.each(['es-AR', 'en', 'pt-BR'] as const)('renders the nine categories in the exact 3x3 reading and tab order in %s', async (language) => {
    const i18n = await createI18n(language)
    const { container } = render(<I18nextProvider i18n={i18n}><ModeSelector selected="ARGENTINA_CURRENT" onChange={vi.fn()} /></I18nextProvider>)
    const order = ['argentina', 'brazil', 'mexico', 'spain', 'england', 'italy', 'global', 'latinAmerica', 'europe']
    expect(CATEGORY_GROUPS.map((g) => g.id)).toEqual(order)
    const buttons = [...container.querySelectorAll('.category-groups > button')]
    expect(buttons.map((b) => b.querySelector('strong')?.textContent)).toEqual(order.map((id) => i18n.t(`categoryTree.groups.${id}`)))
    for (const [index, group] of CATEGORY_GROUPS.entries()) {
      expect(buttons[index].hasAttribute('tabindex')).toBe(false)
      fireEvent.click(container.querySelectorAll('.category-groups > button')[index])
      const names = screen.getAllByRole('button').map((button) => button.textContent ?? '')
      for (const mode of group.modes) expect(names.some((name) => name.includes(i18n.t(`categoryTree.options.${mode}`))), mode).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: i18n.t('categoryTree.back') }))
    }
  })
  it('keeps the two original catalogs intact and enables the supplied league editions', () => {
    expect(catalogForMode('GLOBAL_CLASSIC')).toHaveLength(150)
    expect(catalogForMode('ARGENTINA_CLUBS')).toEqual(ARGENTINA_PLAYERS)
    const legends = catalogForMode('ARGENTINA_LEGENDS')
    expect(legends).toHaveLength(150)
    expect(legends.every((record) => record.category === 'legend')).toBe(true)
    const source = modeSource('ARGENTINA_LEGENDS')
    expect(source.players).toEqual(legends)
    expect(source.metadata).toEqual({}) // Supplied scope is not fabricated verified career metadata.
    const current = modeSource('ARGENTINA_CURRENT')
    expect(current.players).toHaveLength(150)
    expect(PLAYABLE_MODES.has('ARGENTINA_CURRENT')).toBe(true)
    expect(PLAYABLE_MODES.has('LEGENDS_ONLY')).toBe(true)
  })

  it.each([
    ['ARGENTINA_CURRENT', 'ARGENTINA_LEGENDS', { countryCode: 'ARG' }],
    ['BRAZIL_CURRENT', 'BRAZIL_LEGENDS', { leagueId: 'bra_serie_a' }],
    ['SPAIN_LEAGUE', 'SPAIN_LEGENDS', { leagueId: 'esp_la_liga' }],
    ['ITALY_CURRENT', 'ITALY_LEGENDS', { leagueId: 'ita_serie_a' }],
    ['ENGLAND_LEAGUE', 'ENGLAND_LEGENDS', { leagueId: 'eng_premier_league' }],
  ] as const)('%s / %s require verified league careers and separate versions, regardless of nationality', (current, legends, career) => {
    const players = [player('plr_001', 'contemporary', 'JPN'), player('plr_002', 'legend', 'JPN'), player('plr_003', 'legend')]
    const metadata: MetadataIndex = Object.fromEntries(players.map((record, index) => [record.id, {
      playerId: record.id,
      careers: [{ clubId: 'test_club', ...career, source: { provider: 'editorial', verification: index === 2 ? 'unverified' : 'verified' } }],
    }]))
    expect(eligiblePlayers(players, definition(current), metadata)).toEqual([players[0]])
    expect(eligiblePlayers(players, definition(legends), metadata)).toEqual([players[1]])
    expect(eligiblePlayers(players, definition(legends), {})).toEqual([])
    const otherLeague: MetadataIndex = { [players[1].id]: { playerId: players[1].id, careers: [{ clubId: 'other', countryCode: 'USA', leagueId: 'usa_mls', source: { provider: 'editorial', verification: 'verified' } }] } }
    expect(eligiblePlayers(players, definition(legends), otherLeague)).toEqual([])
  })

  it('separates South America and Europe by association and version, independently of club location', () => {
    const players = [player('plr_001', 'contemporary', 'BRA'), player('plr_002', 'legend', 'ARG'), player('plr_003', 'contemporary', 'ESP'), player('plr_004', 'legend', 'ENG'), player('plr_005', 'legend', 'JPN')]
    const metadata: MetadataIndex = { plr_002: { playerId: 'plr_002', careers: [{ clubId: 'european_club', leagueConfederation: 'UEFA', source: { provider: 'editorial', verification: 'verified' } }] } }
    expect(eligiblePlayers(players, definition('SOUTH_AMERICA_CURRENT'), metadata)).toEqual([players[0]])
    expect(eligiblePlayers(players, definition('SOUTH_AMERICA_LEGENDS'), metadata)).toEqual([players[1]])
    expect(eligiblePlayers(players, definition('EUROPE_CURRENT'), metadata)).toEqual([players[2]])
    expect(eligiblePlayers(players, definition('EUROPE_LEGENDS'), metadata)).toEqual([players[3]])
  })

  it.each(['es-AR', 'en', 'pt-BR'] as const)('translates the nine categories and their editions in %s', async (language) => {
    const i18n = await createI18n(language)
    expect(THEMED_MODES.map((mode) => mode.id).sort()).toEqual([...THEMED_MODE_IDS].sort())
    expect(new Set(THEMED_MODES.map((mode) => mode.id)).size).toBe(THEMED_MODE_IDS.length)
    for (const mode of THEMED_MODES) {
      for (const field of ['name', 'description']) expect(i18n.getResource(language, 'common', `modes.items.${mode.translationKey}.${field}`)).toEqual(expect.any(String))
    }
    const onChange = vi.fn()
    render(<I18nextProvider i18n={i18n}><ModeSelector selected="GLOBAL_CLASSIC" onChange={onChange} /></I18nextProvider>)
    expect(screen.getAllByRole('button')).toHaveLength(9)
    for (const group of CATEGORY_GROUPS) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp('^' + i18n.t('categoryTree.groups.' + group.id)) }))
      expect(screen.getByRole('heading', { name: i18n.t('categoryTree.groups.' + group.id) })).toHaveFocus()
      for (const id of group.modes) {
        const button = screen.getByRole('button', { name: new RegExp('^' + i18n.t('categoryTree.options.' + id)) })
        expect(button).toBeEnabled()
        fireEvent.click(button)
        expect(onChange).toHaveBeenLastCalledWith(id)
      }
      fireEvent.click(screen.getByRole('button', { name: i18n.t('categoryTree.back') }))
    }
    expect(onChange).toHaveBeenCalledTimes(18)
  })
})
