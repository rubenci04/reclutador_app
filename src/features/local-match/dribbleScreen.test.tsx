import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { LiveMatchScreen } from './LiveMatchScreen'
import { createSession } from './interactive'
import type { Session } from './interactive'
import { liveInput, must } from './interactive/liveFixtures.test-support'

afterEach(() => { cleanup(); vi.useRealTimers() })
const OPTIONS = { benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, acquisition: { local: { spent: 69, coachPaid: 1, budget: 150 }, cpu: { spent: 70, coachPaid: 0, budget: 150 } }, moments: { version: 'match-moments-v1' }, aerial: { version: 'directed-header-v1' }, matchRules: { version: 'halftime-ovr-v1' }, dribble: { version: 'dribble-mini-v1' } } as const
const tick = (ms: number) => { for (let elapsed = 0; elapsed < ms; elapsed += 50) act(() => { vi.advanceTimersByTime(50) }) }

/** Plays the real screen until the dribble challenge shows up; null when this seed never offers one. */
async function open(seed: string, dribble = true) {
  vi.useFakeTimers()
  const i18n = await createI18n('en'); const done = vi.fn<(session: Session) => void>()
  const origin = must(createSession(liveInput(seed), { sessionId: 'dribble-screen', ...OPTIONS, ...(dribble ? {} : { dribble: undefined }) } as never))
  render(<I18nextProvider i18n={i18n}><LiveMatchScreen origin={origin} versusCpu difficulty="HARD" names={{ local: 'Home', cpu: 'Away' }} closed={false} onFinished={done} onReturn={vi.fn()} /></I18nextProvider>)
  fireEvent.click(screen.getByLabelText('Skip animations'))
  return done
}
const advance = (stopAt: () => boolean) => {
  for (let i = 0; i < 900 && !stopAt() && !screen.queryByRole('button', { name: 'Replay match' }); i++) {
    const play = screen.queryAllByRole('button').find((b) => b.classList.contains('play-card') && !(b as HTMLButtonElement).disabled && !b.classList.contains('dribble-lane-button'))
    const confirm = screen.queryByRole('button', { name: 'Confirm decision' }) ?? screen.queryByRole('button', { name: /^Keep strategy/ })
    if (confirm) fireEvent.click(confirm)
    else if (play && !screen.queryByRole('heading', { name: 'Dribble!' })) fireEvent.click(play)
    else tick(100)
  }
}
const panelOpen = () => Boolean(screen.queryByRole('heading', { name: 'Dribble!' }))

describe('SIM-MINI-001 in the live match screen', () => {
  it('plays the dribble with the mouse, shows the confirmed scene, records it and lets the match continue', async () => {
    let found = false
    for (let n = 0; n < 12 && !found; n++) {
      cleanup()
      const done = await open(`once-${n}`)
      advance(panelOpen)
      if (!panelOpen()) continue
      found = true
      fireEvent.click(screen.getByRole('radio', { name: /Left/ }))
      tick(300)
      fireEvent.click(screen.getByRole('button', { name: 'Now!' }))
      expect(document.querySelector('.dribble-scene')).not.toBeNull()
      expect(document.querySelector('.dribble-scene')!.getAttribute('data-lane')).toBe('LEFT')
      expect(panelOpen()).toBe(false)
      advance(() => false)
      expect(screen.getByRole('button', { name: 'Replay match' })).toBeInTheDocument()
      const plays = done.mock.calls[0][0].result!.plays!
      expect(plays.filter((entry) => entry.node === 'DRIBBLE')).toHaveLength(1)
      expect(plays.find((entry) => entry.node === 'DRIBBLE')).toMatchObject({ choice: 'DRIBBLE_LEFT' })
      expect(typeof plays.find((entry) => entry.node === 'DRIBBLE')!.precision).toBe('number')
    }
    expect(found).toBe(true)
  })

  it('supports the keyboard and the traditional resolution', async () => {
    let tried = 0
    for (let n = 0; n < 12 && tried < 2; n++) {
      cleanup()
      const done = await open(`once-${n}`)
      advance(panelOpen)
      if (!panelOpen()) continue
      tried++
      const panel = screen.getByRole('region', { name: 'Interactive dribble' })
      if (tried === 1) {
        fireEvent.keyDown(panel, { key: 'ArrowRight' })
        expect(screen.getByRole('radio', { name: /Right/ })).toHaveAttribute('aria-checked', 'true')
        fireEvent.keyDown(panel, { key: ' ' })
      } else fireEvent.click(screen.getByRole('button', { name: 'Resolve with the traditional system' }))
      expect(panelOpen()).toBe(false)
      advance(() => false)
      const entry = done.mock.calls[0][0].result!.plays!.find((e) => e.node === 'DRIBBLE')!
      expect(entry.choice).toBe(tried === 1 ? 'DRIBBLE_RIGHT' : 'DRIBBLE_CENTER')
    }
    expect(tried).toBe(2)
  })

  it('never offers it without the option', async () => {
    const done = await open('once-1', false)
    advance(() => false)
    if (!done.mock.calls.length) throw new Error('STUCK: ' + screen.queryAllByRole('button').map((b) => b.textContent).join(' | '))
    expect(done.mock.calls[0][0].result!.plays!.some((entry) => entry.node === 'DRIBBLE')).toBe(false)
  })
})
