import { afterEach, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { MatchScreen } from './MatchScreen'
import { MatchSeriesScreen } from './MatchSeriesScreen'
import { DRAFT_CATALOG } from '../draft/catalog'
import { generateCpuTeam } from './cpuTeam'
import { simulateMatch } from './simulator'
import * as simulator from './simulator'
import { ConfirmNavigation } from '../../components/ConfirmNavigation'

const result = simulateMatch({ localLineup: generateCpuTeam(DRAFT_CATALOG, 'nav-local').team.lineup, cpuLineup: generateCpuTeam(DRAFT_CATALOG, 'nav-cpu').team.lineup, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: 'local-match-v2', actionModel: 'action-v3', seed: 'nav-result' })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

it.each(['es-AR', 'en', 'pt-BR'] as const)('uses truthful exits, confirmation and playback controls in %s', async (language) => {
  vi.useFakeTimers()
  const i18n = await createI18n(language); const back = vi.fn(); const rematch = vi.fn(); const finished = vi.fn()
  const simulate = vi.spyOn(simulator, 'simulateMatch')
  const view = render(<I18nextProvider i18n={i18n}><MatchScreen result={result} onRematch={rematch} onReturn={back} onFinished={finished} /></I18nextProvider>)
  expect(screen.getByRole('main')).toHaveFocus()
  const exit = screen.getByRole('button', { name: i18n.t('navigation.exitMatch') })
  fireEvent.click(exit)
  expect(screen.getByRole('button', { name: i18n.t('navigation.cancel') })).toHaveFocus()
  act(() => vi.advanceTimersByTime(15000))
  expect(finished).not.toHaveBeenCalled()
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  expect(exit).toHaveFocus(); expect(back).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: i18n.t('navigation.pause') }))
  const events = view.container.querySelectorAll('.match-narration li').length
  act(() => vi.advanceTimersByTime(3000))
  expect(view.container.querySelectorAll('.match-narration li')).toHaveLength(events)
  fireEvent.change(screen.getByRole('combobox', { name: i18n.t('navigation.speed') }), { target: { value: '4' } })
  fireEvent.click(screen.getByRole('button', { name: i18n.t('navigation.resume') }))
  act(() => vi.advanceTimersByTime(3750))
  expect(finished).toHaveBeenCalledOnce()
  expect(screen.queryByRole('button', { name: i18n.t('navigation.pause') })).toBeNull()
  expect(screen.getAllByRole('button', { name: i18n.t('navigation.home') })).toHaveLength(1)
  expect(screen.queryByText(/Volver al draft|Back to draft|Voltar ao draft/)).toBeNull()
  const original = JSON.stringify(result)
  fireEvent.click(screen.getByRole('button', { name: i18n.t('match.replay') }))
  expect(screen.getByRole('main')).toHaveFocus()
  act(() => vi.advanceTimersByTime(3750))
  expect(JSON.stringify(result)).toBe(original); expect(simulate).not.toHaveBeenCalled(); expect(rematch).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: i18n.t('navigation.home') }))
  expect(back).toHaveBeenCalledOnce()
})

it('keeps a confirmation keyboard-contained, restores trigger focus and commits only once', async () => {
  const i18n = await createI18n('en'); const confirmed = vi.fn(); const user = userEvent.setup()
  render(<I18nextProvider i18n={i18n}><ConfirmNavigation label="Exit" message="Progress will be lost" onConfirm={confirmed} /></I18nextProvider>)
  await user.tab(); expect(screen.getByRole('button', { name: 'Exit' })).toHaveFocus()
  await user.keyboard('{Enter}')
  const dialog = screen.getByRole('dialog'); const cancel = within(dialog).getByRole('button', { name: 'Stay here' }); const confirm = within(dialog).getByRole('button', { name: 'Exit' })
  expect(cancel).toHaveFocus()
  await user.tab({ shift: true }); expect(confirm).toHaveFocus()
  await user.tab(); expect(cancel).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(screen.getByRole('button', { name: 'Exit' })).toHaveFocus()
  expect(confirmed).not.toHaveBeenCalled()
  await user.keyboard('{Enter}')
  const button = within(screen.getByRole('dialog')).getByRole('button', { name: 'Exit' })
  act(() => { button.click(); button.click() })
  expect(confirmed).toHaveBeenCalledOnce()
})

it('warns before leaving an unfinished series and keeps its next match available after cancel', async () => {
  vi.useFakeTimers(); const i18n = await createI18n('en'); const back = vi.fn()
  render(<I18nextProvider i18n={i18n}><MatchSeriesScreen result={{ ...result, seriesFormat: 'home-away' }} canAdjust onReturn={back} onRematch={vi.fn()} /></I18nextProvider>)
  act(() => vi.advanceTimersByTime(15000))
  fireEvent.click(screen.getByRole('button', { name: i18n.t('playtest.understood') }))
  fireEvent.click(screen.getByRole('button', { name: 'Back to home' }))
  expect(screen.getByRole('dialog')).toHaveTextContent(i18n.t('navigation.seriesExitWarning'))
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  expect(back).not.toHaveBeenCalled()
  const prepare = screen.getByRole('button', { name: i18n.t('seriesPrep.prepare') })
  expect(prepare).toBeEnabled()
  fireEvent.click(prepare)
  expect(screen.getByRole('heading', { name: i18n.t('seriesPrep.title') })).toHaveFocus()
  fireEvent.click(screen.getByRole('button', { name: i18n.t('navigation.backSummary') }))
  expect(screen.getByRole('button', { name: i18n.t('seriesPrep.prepare') })).toHaveFocus()
})
