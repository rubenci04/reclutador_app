import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { audio } from '../audio/audioEngine'
import { LiveMatchScreen } from './LiveMatchScreen'
import * as api from './interactive'
import { keepWindow } from './interactive/liveModel'
import { liveInput, must } from './interactive/liveFixtures.test-support'

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function pendingHeader(node: 'HEADER' | 'FINISH' = 'HEADER') {
  let s = must(api.createSession(liveInput('aerial-restore-0'), { sessionId: 'header-ui', moments: { version: 'match-moments-v1' }, aerial: { version: 'directed-header-v1' } }))
  for (let n = 0; n < 100; n++) {
    if (s.phase === 'PLAY') {
      const p = s.kernel.partial!.play!
      if (p.node === node) return s
      const choice = p.node === 'DEFEND' ? 'INTERCEPT' : p.node === 'FINISH' ? p.options.find((o) => o.choice === 'CROSS' && o.available)?.choice ?? 'SHOOT' : p.options.find((o) => o.available)!.choice
      s = must(api.submitPlay(s, { version: 'interactive-play-command-v1', id: `${p.id}:${p.node}`, sessionId: s.sessionId, expectedRevision: s.revision, playId: p.id, node: p.node, choice }))
    } else s = must(s.phase === 'WINDOW' ? keepWindow(s) : api.advanceBlock(s))
  }
  throw new Error('missing_header_fixture')
}
const tick = (ms: number) => { for (let n = 0; n < ms; n += 50) act(() => { vi.advanceTimersByTime(Math.min(50, ms - n)) }) }
async function open(language: 'es-AR' | 'en' | 'pt-BR', node: 'HEADER' | 'FINISH' = 'HEADER') {
  vi.useFakeTimers(); const i18n = await createI18n(language); const origin = pendingHeader(node)
  const ui = render(<I18nextProvider i18n={i18n}><LiveMatchScreen origin={origin} versusCpu difficulty="NORMAL" names={{ local: 'Home', cpu: 'Away' }} closed={false} onFinished={vi.fn()} onReturn={vi.fn()} /></I18nextProvider>)
  fireEvent.click(screen.getByRole('button', { name: i18n.t('liveDT.nextBlock') }))
  return { i18n, origin, ui }
}

describe('directed header presentation', () => {
  it('reveals a chosen header immediately and preserves the remaining beat duration through pause and speed changes', async () => {
    await open('en')
    fireEvent.click(screen.getByRole('button', { name: /Goal centre/ }))
    const now = () => document.querySelector('.live-now')!.textContent!
    expect(now()).toMatch(/heads it!/)
    tick(100); fireEvent.click(screen.getByRole('button', { name: 'Pause' })); tick(4000)
    expect(now()).toMatch(/heads it!/)
    fireEvent.change(screen.getByRole('combobox', { name: 'Speed' }), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Resume playback' }))
    tick(100); expect(now()).toMatch(/heads it!/)
    tick(25); expect(now()).toMatch(/flies towards goal/)
  })

  it('schedules cross sound at release, cancels it on pause and resumes it once at the remaining offset', async () => {
    const play = vi.spyOn(audio, 'play').mockReturnValue(true)
    await open('en', 'FINISH')
    fireEvent.click(screen.getByRole('button', { name: /Send a cross/ }))
    const count = () => play.mock.calls.filter(([id]) => id === 'cross').length
    expect(count()).toBe(0)
    tick(100); fireEvent.click(screen.getByRole('button', { name: 'Pause' })); tick(1000)
    expect(count()).toBe(0)
    fireEvent.change(screen.getByRole('combobox', { name: 'Speed' }), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Resume playback' }))
    tick(50); expect(count()).toBe(0)
    tick(25); expect(count()).toBe(1)
    tick(2000); expect(count()).toBe(1)
  })

  it.each(['es-AR', 'en', 'pt-BR'] as const)('offers three localized goal targets, focuses the question and only accepts one tap: %s', async (language) => {
    const { i18n, origin } = await open(language)
    const panel = screen.getByRole('region', { name: i18n.t('aerial.label') })
    expect(within(panel).getByRole('heading', { name: i18n.t('aerial.title') })).toHaveFocus()
    expect(within(panel).getAllByRole('button')).toHaveLength(3)
    expect(panel.querySelectorAll('.header-target-icon')).toHaveLength(3)
    expect(panel.querySelector('details')!.open).toBe(false)
    const submit = vi.spyOn(api, 'submitPlay'); const before = JSON.stringify(origin)
    tick(60000); expect(submit).not.toHaveBeenCalled(); expect(JSON.stringify(origin)).toBe(before)
    const button = within(panel).getByRole('button', { name: new RegExp(i18n.t('play.choice.FAR_POST')) })
    act(() => { button.click(); button.click() })
    expect(submit).toHaveBeenCalledTimes(1)
    const next = submit.mock.results[0].value
    expect(next.ok).toBe(true)
    if (next.ok) {
      expect(next.value.kernel.tree!.log.at(-1)).toMatchObject({ node: 'HEADER', choice: 'FAR_POST' })
      expect(next.value.kernel.aerial!.keeperPlan).toBeNull()
    }
    expect(screen.queryByRole('region', { name: i18n.t('aerial.label') })).toBeNull()
  })

  it('plays cross/contact once when pausing and accelerating, and respects reduced motion', async () => {
    const play = vi.spyOn(audio, 'play').mockReturnValue(true)
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    const { i18n, ui } = await open('en')
    expect(ui.container.querySelector('.live-no-motion')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' })); tick(5000)
    fireEvent.change(screen.getByRole('combobox', { name: 'Speed' }), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Resume playback' }))
    fireEvent.click(within(screen.getByRole('region', { name: i18n.t('aerial.label') })).getByRole('button', { name: /Goal centre/ }))
    tick(5000)
    expect(play.mock.calls.filter(([id]) => id === 'cross')).toHaveLength(1)
    expect(play.mock.calls.filter(([id]) => id === 'header')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' })); tick(3000)
    fireEvent.click(screen.getByRole('button', { name: 'Resume playback' })); tick(2000)
    expect(play.mock.calls.filter(([id]) => id === 'header')).toHaveLength(1)
  })
})
