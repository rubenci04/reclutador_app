import { webcrypto } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { LiveMatchScreen } from './LiveMatchScreen'
import { LiveSeriesScreen } from './LiveSeriesScreen'
import { liveSession } from './interactive/liveFixtures.test-support'
import type { Session } from './interactive'
import * as simulator from './simulator'
import * as interactive from './interactive'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const blocks = () => screen.getByRole('list', { name: 'Confirmed blocks' }).children.length
function finish(hot = false) {
  for (let i = 0; i < 30 && !screen.queryByRole('button', { name: 'Replay match' }); i++) {
    const confirm = screen.queryByRole('button', { name: 'Confirm decision' })
    if (confirm) fireEvent.click(confirm)
    else if (hot && screen.queryByRole('button', { name: 'I am Away · continue' })) click('I am Away · continue')
    else click('View next block')
  }
  expect(screen.queryByRole('button', { name: 'View next block' })).not.toBeInTheDocument()
}
async function open(hot = false, language: 'en' | 'es-AR' | 'pt-BR' = 'en') {
  vi.useFakeTimers()
  const i18n = await createI18n(language); const done = vi.fn<(session: Session) => void>(); const home = vi.fn()
  render(<I18nextProvider i18n={i18n}><LiveMatchScreen origin={liveSession()} versusCpu={!hot} difficulty="HARD" names={{ local: 'Home', cpu: 'Away' }} closed={false} onFinished={done} onReturn={home} /></I18nextProvider>)
  return { i18n, done, home }
}

describe('SIM-005 live match controls', () => {
  it.each(['en', 'es-AR', 'pt-BR'] as const)('localizes controls and focuses each decision without stealing select focus: %s', async (lang) => {
    const { i18n } = await open(false, lang)
    expect(screen.getByRole('heading', { name: i18n.t('liveDT.title') })).toBeInTheDocument()
    click(i18n.t('liveDT.nextBlock')); click(i18n.t('liveDT.nextBlock'))
    expect(screen.getByRole('heading', { name: i18n.t('liveDT.turn', { name: 'Home' }) })).toHaveFocus()
    fireEvent.click(screen.getByRole('radio', { name: i18n.t('liveDT.STRATEGY') }))
    const strategy = screen.getByRole('combobox', { name: i18n.t('liveDT.strategy') })
    strategy.focus(); fireEvent.change(strategy, { target: { value: 'LOW_BLOCK' } })
    expect(strategy).toHaveFocus()
  })

  it('pauses, resumes, changes speed, skips motion without skipping decisions and saves a trusted local pause', async () => {
    vi.stubGlobal('crypto', webcrypto)
    const { done } = await open()
    click('Pause'); act(() => vi.advanceTimersByTime(20_000)); expect(blocks()).toBe(0)
    click('Resume playback'); fireEvent.change(screen.getByRole('combobox', { name: 'Speed' }), { target: { value: '4' } })
    act(() => vi.advanceTimersByTime(625)); expect(blocks()).toBe(1)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Skip animations' }))
    act(() => vi.advanceTimersByTime(38)); expect(blocks()).toBe(2)
    act(() => vi.advanceTimersByTime(20_000)); expect(blocks()).toBe(2)
    expect(screen.getByRole('button', { name: 'View next block' })).toBeDisabled()
    const checkpoint = vi.spyOn(interactive, 'checkpointSession'); const restore = vi.spyOn(interactive, 'restoreSession')
    await act(async () => { click('Save local pause'); await checkpoint.mock.results[0].value })
    await act(async () => { click('Restore pause'); await restore.mock.results[0].value })
    expect(blocks()).toBe(2)
    click('Confirm decision')
    expect(screen.getByRole('button', { name: 'Restore pause' })).toBeDisabled()
    finish(); expect(done).toHaveBeenCalledTimes(1)
  })

  it('accepts one manual substitution, guards rapid duplicate commands and replays the registered result', async () => {
    const { done } = await open(); const batch = vi.spyOn(simulator, 'simulateMatch')
    click('View next block'); click('View next block')
    fireEvent.click(screen.getByRole('radio', { name: 'Make a substitution' }))
    expect(screen.getByRole('button', { name: 'Confirm decision' })).toBeDisabled()
    fireEvent.change(screen.getByRole('combobox', { name: 'Coming on' }), { target: { value: 'live_local_11' } })
    const out = screen.getByRole('combobox', { name: 'Going off' })
    fireEvent.change(out, { target: { value: liveSession().kernel.input.localLineup.LB } })
    const button = screen.getByRole('button', { name: 'Confirm decision' })
    act(() => { button.click(); button.click() })
    finish()
    expect(done).toHaveBeenCalledTimes(1)
    const final = done.mock.calls[0][0]
    expect(final.applied).toHaveLength(8); expect(final.entered.local).toEqual(['live_local_11'])
    expect(final.window).toBeNull()
    const record = JSON.parse((screen.getByRole('textbox', { name: 'Versioned record' }) as HTMLTextAreaElement).value)
    expect(record.origin.kernel.blocks).toHaveLength(0); expect(record.result.version).toBe('interactive-result-v1')
    click('Replay match'); act(() => vi.advanceTimersByTime(16_000))
    expect(batch).not.toHaveBeenCalled(); expect(done).toHaveBeenCalledTimes(1)
  })

  it('separates hot-seat decisions, hides the first instruction and requires both confirmations at every window', async () => {
    const { done } = await open(true)
    click('View next block'); click('View next block')
    fireEvent.click(screen.getByRole('radio', { name: 'Change strategy' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Strategy' }), { target: { value: 'LOW_BLOCK' } })
    click('Confirm decision')
    expect(screen.getByRole('heading', { name: 'Hand the device to Away' })).toBeInTheDocument()
    expect(screen.queryByText('Low block')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    click('I am Away · continue')
    expect(screen.getByRole('heading', { name: 'Away’s turn' })).toHaveFocus()
    expect(screen.queryByText('Low block')).not.toBeInTheDocument()
    click('Confirm decision'); finish(true)
    expect(done).toHaveBeenCalledTimes(1)
    expect(done.mock.calls[0][0].applied).toHaveLength(8)
    expect(done.mock.calls[0][0].applied[0].order).toEqual({ type: 'STRATEGY', parameters: { strategy: 'LOW_BLOCK' } })
  })

  it('explicitly uses KEEP for all pending windows when simulating the rest and confirms exit', async () => {
    const { done, home } = await open()
    click('Exit match')
    const exit = screen.getByRole('dialog'); expect(within(exit).getByRole('button', { name: 'Stay here' })).toHaveFocus()
    fireEvent.keyDown(exit, { key: 'Escape' }); expect(home).not.toHaveBeenCalled()
    click('Simulate the rest')
    expect(screen.getByRole('dialog')).toHaveTextContent('both teams will keep their strategy and lineup (KEEP), including the CPU')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Simulate the rest' }))
    for (let i = 0; i < 10; i++) act(() => vi.advanceTimersByTime(150))
    expect(done).toHaveBeenCalledTimes(1)
    expect(done.mock.calls[0][0].applied.map((d) => d.order.type)).toEqual(Array(8).fill('KEEP'))
    click('Back to home')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Back to home' }))
    expect(home).toHaveBeenCalledTimes(1)
  })
})

describe('SIM-005 live series', () => {
  it('retains roster and ledger through preparation, resolves every match and records the series once', async () => {
    vi.useFakeTimers(); const i18n = await createI18n('en'); const recorded = vi.fn(); const home = vi.fn()
    const origin = liveSession('series-live')
    render(<I18nextProvider i18n={i18n}><LiveSeriesScreen origin={origin} versusCpu difficulty="HARD" names={{ local: 'Home', cpu: 'Away' }} onSeriesFinished={recorded} onReturn={home} onRematch={vi.fn()} onNewMatch={vi.fn()} /></I18nextProvider>)
    finish()
    expect(recorded).not.toHaveBeenCalled()
    for (let index = 0; index < 2; index++) {
      const prepare = screen.queryByRole('button', { name: 'Prepare next game' })
      if (!prepare) break
      fireEvent.click(prepare)
      fireEvent.click(screen.getByRole('radio', { name: /High press/ })); click('Confirm strategy'); click('Start match')
      expect(blocks()).toBe(0); finish()
    }
    expect(recorded).toHaveBeenCalledTimes(1)
    const textareas = screen.getAllByRole('textbox', { name: 'Versioned record' }) as HTMLTextAreaElement[]
    const archive = JSON.parse(textareas.at(-1)!.value)
    expect(archive.matches.length).toBeGreaterThanOrEqual(2)
    for (const match of archive.matches) {
      expect(match.result.decisions).toHaveLength(8)
      expect(match.origin.options.acquisition).toEqual(origin.options.acquisition)
      expect(match.origin.input.localLineup).toEqual(origin.kernel.input.localLineup)
    }
    click('Replay match'); act(() => vi.advanceTimersByTime(16_000))
    expect(recorded).toHaveBeenCalledTimes(1)
  })
})
