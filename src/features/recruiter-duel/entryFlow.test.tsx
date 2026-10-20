import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { AuctionPage } from './AuctionPage'
import { HelpLauncher } from '../onboarding/HelpLauncher'
import { StageGuide } from '../onboarding/StageGuide'
import { helpStore } from '../onboarding/helpStore'
import { TUTORIAL_STEPS } from '../onboarding/helpTopics'

beforeEach(() => { localStorage.clear(); helpStore.forgetMemory() })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

it.each(['es-AR', 'en', 'pt-BR'] as const)('offers rivals first and an unchanged classic start in %s', async (language) => {
  const i18n = await createI18n(language)
  const online = vi.fn(); const free = vi.fn()
  render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={free} onOnline={online} /></I18nextProvider>)
  expect(screen.queryByRole('button', { name: i18n.t('duel.start') })).toBeNull()
  expect(screen.queryByRole('heading', { name: i18n.t('categoryTree.title') })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.online') }))
  expect(online).toHaveBeenCalledOnce()
  expect(screen.queryByRole('button', { name: i18n.t('duel.freeDraft') })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.cpu') }))
  expect(screen.getByRole('heading', { name: i18n.t('entry.cpu') })).toHaveFocus()
  expect(screen.getByText(i18n.t('entry.defaults', { budget: 150, reserve: 8 }))).toBeVisible()
  expect(screen.getByRole('button', { name: i18n.t('duel.start') })).toBeEnabled()
  const details = screen.getByText(i18n.t('entry.customize')).closest('details')!
  expect(details).not.toHaveAttribute('open')
  fireEvent.click(screen.getByText(i18n.t('entry.customize')))
  expect(within(details).getByLabelText(i18n.t('cpu.opponent'))).toHaveValue('cpu')
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(i18n.t('setup.custom')) }))
  fireEvent.change(screen.getByLabelText(i18n.t('setup.nameOne'), { exact: false }), { target: { value: 'Club A' } })
  fireEvent.click(screen.getByRole('button', { name: '150M' }))
  fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.back') }))
  expect(screen.getByRole('heading', { name: i18n.t('entry.chooseRival') })).toHaveFocus()
  fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.local') }))
  fireEvent.click(screen.getByText(i18n.t('entry.customize')))
  expect(screen.getByLabelText(i18n.t('setup.nameOne'), { exact: false })).toHaveValue('Club A')
  expect(screen.getByRole('button', { name: '150M' })).toHaveAttribute('aria-pressed', 'true')
})

it('limits onboarding to three steps and persists opting out even when skipped', async () => {
  const i18n = await createI18n('en')
  expect(TUTORIAL_STEPS).toHaveLength(3)
  render(<I18nextProvider i18n={i18n}><HelpLauncher /><StageGuide stage="squad" /></I18nextProvider>)
  const dialog = screen.getByRole('dialog')
  expect(screen.getByRole('heading', { name: 'Build your eleven' })).toHaveFocus()
  fireEvent.click(within(dialog).getByRole('checkbox'))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Skip' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(helpStore.getSnapshot()).toMatchObject({ tutorialSeen: true, hints: false })
  expect(screen.queryByText(i18n.t('playtest.guides.squad.title'))).toBeNull()
  screen.getByRole('button', { name: 'How to play' }).focus()
  fireEvent.click(screen.getByRole('button', { name: 'How to play' }))
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  expect(screen.getByRole('button', { name: 'How to play' })).toHaveFocus()
})

it('opens the mobile pitch directly and returns home only after confirmation', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('max-width'), addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  const i18n = await createI18n('en')
  render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
  fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.local') }))
  fireEvent.click(screen.getByRole('button', { name: i18n.t('duel.start') }))
  fireEvent.click(screen.getByRole('button', { name: 'Heads' }))
  fireEvent.click(screen.getByRole('button', { name: i18n.t('coin.skip') }))
  expect(screen.getByRole('button', { name: i18n.t('duel.beginBidding') })).toBeEnabled()
  const pitches = screen.getByRole('region', { name: i18n.t('teamProgress.title') })
  expect(within(pitches).getByRole('button', { name: i18n.t('teamProgress.title') })).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(screen.getByRole('button', { name: i18n.t('hud.showPitches') }))
  expect(pitches).toHaveFocus()
  expect(within(pitches).getByRole('button', { name: i18n.t('teamProgress.title') })).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('button', { name: i18n.t('duel.beginBidding') })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: i18n.t('navigation.home') }))
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  expect(screen.getByRole('button', { name: i18n.t('duel.beginBidding') })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: i18n.t('navigation.home') }))
  act(() => within(screen.getByRole('dialog')).getByRole('button', { name: i18n.t('navigation.home') }).click())
  expect(screen.getByRole('heading', { name: i18n.t('entry.chooseRival') })).toHaveFocus()
})
