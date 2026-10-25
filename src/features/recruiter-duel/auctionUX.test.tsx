import { expect, it, vi } from 'vitest'
import { act, render, screen, fireEvent, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { TeamPowerPanel } from './TeamPowerPanel'
import { teamPower } from './teamPower'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { DRAFT_CATALOG } from '../draft/catalog'
import { createRecruiterDuel } from './auctionEngine'
import { defaultBudgetForMode } from '../player-catalog/leagueCollections'
import { CATEGORY_GROUPS } from '../themed-modes/categoryTree'
import { AuctionPage, COIN_TOSS_MS } from './AuctionPage'
import * as drawHistory from './drawHistory'

it.each(['es-AR', 'en', 'pt-BR'] as const)('provides readable CPU pause shortcuts while retaining manual input in %s', async language => {
  const i18n = await createI18n(language)
  render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={() => {}} /></I18nextProvider>)
  fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.cpu') }))
  fireEvent.click(screen.getByText(i18n.t('entry.customize')))
  const input = screen.getByRole('spinbutton', { name: i18n.t('cpu.pause') })
  const presets = screen.getByRole('group', { name: i18n.t('cpu.pause') })
  for (const [key, ms] of [['fast', 250], ['normal', 650], ['slow', 1200]] as const) {
    const button = within(presets).getByRole('button', { name: i18n.t(`cpu.pausePreset.${key}`, { ms }) })
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(input).toHaveValue(ms)
  }
  fireEvent.change(input, { target: { value: '450' } })
  expect(input).toHaveValue(450)
  expect(within(presets).queryByRole('button', { pressed: true })).toBeNull()
})

it('groups category and both confirmed exit actions before the auction wallet', async () => {
  vi.useFakeTimers()
  const seed = vi.spyOn(drawHistory, 'newDrawSeed').mockReturnValue('compact-top-strip')
  const i18n = await createI18n('en')
  try {
    const { container } = render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={() => {}} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.local') }))
    fireEvent.click(screen.getByRole('button', { name: i18n.t('duel.start') }))
    fireEvent.click(screen.getByRole('button', { name: i18n.t('duel.heads') }))
    act(() => vi.advanceTimersByTime(COIN_TOSS_MS))
    const strip = container.querySelector('.auction-top-strip')!
    expect(container.querySelector('.duel-shell')).toHaveClass('has-active-game')
    expect(strip.querySelector('.active-category-banner')).not.toBeNull()
    expect(within(strip as HTMLElement).getByRole('button', { name: i18n.t('navigation.home') })).toBeEnabled()
    expect(within(strip as HTMLElement).getByRole('button', { name: i18n.t('abandon.open') })).toBeEnabled()
    expect(strip.compareDocumentPosition(container.querySelector('.auction-header')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  } finally { seed.mockRestore(); vi.useRealTimers() }
})

it('uses 160/220 for new edition defaults (roster-budget-v3)', () => {
  for (const id of CATEGORY_GROUPS.flatMap((g) => g.modes)) expect(defaultBudgetForMode(id)).toBe(id.includes('LEGENDS') ? 220 : 160)
})

it.each(['es-AR', 'en', 'pt-BR'] as const)('distinguishes base and effective strength and shows the goalkeeper without changing power in %s', async (language) => {
  const created = createRecruiterDuel(DRAFT_CATALOG, 'ux-four')
  if (!created.ok) throw new Error(created.error)
  const lineup = generateCpuTeam(DRAFT_CATALOG, 'ux-four').team.lineup
  const game = { ...created.game, teams: { ...created.game.teams, recruiter_one: { lineup, spent: 90 } } }
  const before = teamPower(game, 'recruiter_one', DRAFT_CATALOG)!
  const keeper = DRAFT_CATALOG.find((p) => p.id === lineup.GK)!
  const i18n = await createI18n(language)
  const view = render(<I18nextProvider i18n={i18n}><TeamPowerPanel game={game} catalog={DRAFT_CATALOG} sides={['recruiter_one']} names={{ recruiter_one: 'A', recruiter_two: 'B' }} /></I18nextProvider>)
  expect(screen.getByText(i18n.t('auctionUX.effective'))).toBeVisible()
  expect(screen.getByText(i18n.t('auctionUX.base', { value: before.base.global.toFixed(1) }))).toBeVisible()
  expect(screen.getByText(i18n.t('auctionUX.keeper', { name: keeper.name, rating: keeper.overall_rating }))).toBeVisible()
  expect(view.container.querySelector('.power-details')).not.toHaveAttribute('open')
  fireEvent.click(screen.getByText(i18n.t('auctionUX.bonuses')))
  expect(view.container.querySelector('.power-details')).toHaveAttribute('open')
  expect(teamPower(game, 'recruiter_one', DRAFT_CATALOG)).toEqual(before)
})
