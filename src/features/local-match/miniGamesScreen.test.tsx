import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PRECISION_BAR_KEY, setPrecisionBar } from './precisionSetting'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { LiveMatchScreen } from './LiveMatchScreen'
import { LiveSeriesScreen } from './LiveSeriesScreen'
import { PenaltyShootoutScreen } from './PenaltyShootoutScreen'
import { createSession } from './interactive'
import type { Session, SessionOptions } from './interactive'
import { liveInput, must } from './interactive/liveFixtures.test-support'

// These tests cover the two-step flow (pick, then stop the bar), which is what the precision-bar setting turns on; the default one-tap flow has its own tests.
beforeEach(() => setPrecisionBar(true))
afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.removeItem(PRECISION_BAR_KEY) })
const OPTIONS = { benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, acquisition: { local: { spent: 69, coachPaid: 1, budget: 150 }, cpu: { spent: 70, coachPaid: 0, budget: 150 } }, moments: { version: 'match-moments-v1' }, aerial: { version: 'directed-header-v1' }, matchRules: { version: 'halftime-ovr-v1' }, corners: { version: 'corners-v1' }, freeKicks: { version: 'free-kicks-v1' }, precisionShot: { version: 'precision-shot-v1' }, defenseMini: { version: 'defense-mini-v1' }, shootout: { version: 'penalty-shootout-v1' } } as const
const tick = (ms: number) => { for (let elapsed = 0; elapsed < ms; elapsed += 50) act(() => { vi.advanceTimersByTime(50) }) }
const names = { local: 'Home', cpu: 'Away' }
const origin = (seed: string, extra: Partial<SessionOptions> = {}) => must(createSession(liveInput(seed), { sessionId: 'mini-screen', ...OPTIONS, ...extra } as never))

async function openMatch(seed: string) {
  vi.useFakeTimers()
  const i18n = await createI18n('en'); const done = vi.fn<(session: Session) => void>()
  render(<I18nextProvider i18n={i18n}><LiveMatchScreen origin={origin(seed)} versusCpu difficulty="HARD" names={names} closed={false} onFinished={done} onReturn={vi.fn()} /></I18nextProvider>)
  fireEvent.click(screen.getByLabelText('Skip animations'))
  return done
}
const region = (name: string) => screen.queryByRole('region', { name })
/** Plays the real screen with the traditional answers until `stop` is true or the match ends. */
const advance = (stop: () => boolean) => {
  for (let i = 0; i < 1200 && !stop() && !screen.queryByRole('button', { name: 'Replay match' }); i++) {
    const confirm = screen.queryByRole('button', { name: 'Confirm decision' }) ?? screen.queryByRole('button', { name: /^Keep strategy/ })
    const traditional = screen.queryByRole('button', { name: 'Resolve with the traditional system' })
    const play = screen.queryAllByRole('button').find((b) => b.classList.contains('play-card') && !(b as HTMLButtonElement).disabled && !b.classList.contains('dribble-lane-button'))
    if (confirm) fireEvent.click(confirm)
    else if (traditional) fireEvent.click(traditional)
    else if (play) fireEvent.click(play)
    else tick(100)
  }
}
async function find(label: string, wanted: string) {
  for (let n = 0; n < 40; n++) {
    cleanup()
    const done = await openMatch(`${wanted}-${n}`)
    advance(() => Boolean(region(label)))
    if (region(label)) return done
  }
  throw new Error(`never offered: ${label}`)
}

describe('SIM-MINI-002 free kick on the real live screen', () => {
  it('shows the close-up, plays the confirmed kick on it, records the precision and lets the match continue', { timeout: 120_000 }, async () => {
    const done = await find('Precision shot', 'mini-fk')
    expect(screen.getByRole('heading', { name: 'Free kick!' })).toBeInTheDocument()
    expect(document.querySelector('.shot-panel svg')).not.toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: /Right/ }))
    tick(300)
    fireEvent.click(screen.getByRole('button', { name: 'Now!' }))
    const scene = document.querySelector('.shot-scene') as HTMLElement
    expect(scene).not.toBeNull()
    expect(scene.getAttribute('data-direction')).toBe('RIGHT')
    expect(['GOAL', 'SAVE', 'WIDE', 'OVER', 'BLOCK']).toContain(scene.getAttribute('data-outcome'))
    expect(region('Precision shot')).toBeNull()
    tick(3000)
    advance(() => false)
    // GAMEPLAY-POLISH-010: the final comparison is a visible summary, not a modal window.
    expect(document.querySelector('.result-inline')).not.toBeNull(); expect(document.querySelector('dialog[open]')).toBeNull()
    expect(document.querySelector('.result-inline')!.textContent).toMatch(/Decisive moments/); expect(document.querySelector('.result-inline details')).not.toBeNull()
    const plays = done.mock.calls[0][0].result!.plays!
    expect(plays.filter((entry) => entry.node === 'FK_ATTACK' && entry.choice === 'FK_RIGHT' && typeof entry.precision === 'number')).toHaveLength(1)
  })
  it('offers the traditional resolution and the keyboard', { timeout: 120_000 }, async () => {
    await find('Precision shot', 'mini-fk-kb')
    const panel = region('Precision shot')!
    fireEvent.keyDown(panel, { key: 'ArrowLeft' })
    expect(screen.getByRole('radio', { name: /Left/ })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Resolve with the traditional system' }))
    expect(region('Precision shot')).toBeNull()
    expect(document.querySelector('.shot-scene')).toBeNull()
  })
})

describe('SIM-MINI-003 interactive defense on the real live screen', () => {
  it('lets the player anticipate a lane, reveals the CPU lane with the outcome and continues the match', { timeout: 120_000 }, async () => {
    const done = await find('Interactive defence', 'mini-def')
    expect(screen.getByRole('heading', { name: 'Defend!' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /Anticipate left/ }))
    tick(300)
    fireEvent.click(screen.getByRole('button', { name: 'Now!' }))
    const scene = document.querySelector('.defense-scene') as HTMLElement
    expect(scene).not.toBeNull()
    expect(scene.getAttribute('data-pick')).toBe('LEFT')
    expect(['LEFT', 'CENTER', 'RIGHT']).toContain(scene.getAttribute('data-intent'))
    expect(scene.getAttribute('data-result')).toMatch(/^(RECOVERED|BEATEN_(BLOCK|WIDE|SAVE|GOAL))$/)
    tick(3000)
    advance(() => false)
    const plays = done.mock.calls[0][0].result!.plays!
    expect(plays.filter((entry) => entry.node === 'DEFEND' && entry.choice === 'DEFEND_LEFT' && typeof entry.precision === 'number')).toHaveLength(1)
  })
  it('keeps the traditional answer', { timeout: 120_000 }, async () => {
    const done = await find('Interactive defence', 'mini-def-trad')
    fireEvent.click(screen.getByRole('button', { name: 'Resolve with the traditional system' }))
    advance(() => false)
    const entry = done.mock.calls[0][0].result!.plays!.find((e) => e.node === 'DEFEND')!
    expect(entry.choice).toBe('INTERCEPT'); expect(entry).not.toHaveProperty('precision')
  })
})

describe('SIM-MINI-002 penalty shootout screen', () => {
  const input = liveInput('shootout-screen')
  const rosters = { local: input.catalog.filter((p) => Object.values(input.localLineup).includes(p.id)), cpu: input.catalog.filter((p) => Object.values(input.cpuLineup).includes(p.id)) }
  async function mount() {
    vi.useFakeTimers(); const i18n = await createI18n('en'); const finished = vi.fn()
    render(<I18nextProvider i18n={i18n}><PenaltyShootoutScreen seed="screen-seed" rosters={rosters} catalog={input.catalog} names={names} onFinished={finished} /></I18nextProvider>)
    return finished
  }
  it('has no winner before the kicks, shoots by hand, chooses the dive when the CPU kicks, and reports once', async () => {
    const finished = await mount()
    expect(screen.queryByText(/wins the series|Winner/i)).toBeNull()
    expect(screen.getByRole('heading', { name: 'Penalty!' })).toBeInTheDocument()
    for (let guard = 0; guard < 140 && !finished.mock.calls.length; guard++) {
      if (document.querySelector('.shot-scene')) { tick(3000); continue }
      const shot = region('Precision shot'); const dive = region('Choose where the keeper dives')
      if (shot) { fireEvent.click(within(shot).getByRole('radio', { name: /Centre/ })); fireEvent.click(within(shot).getByRole('button', { name: 'Now!' })) }
      else if (dive) { fireEvent.click(within(dive).getByRole('button', { name: /Left/ })) }
      else tick(100)
    }
    expect(finished).toHaveBeenCalledTimes(1)
    const result = finished.mock.calls[0][0]
    expect(result.winner).not.toBeNull()
    expect(result.kicks.every((kick: { source: string }) => kick.source === 'MANUAL')).toBe(true)
    expect(result.kicks.length).toBeGreaterThanOrEqual(6)
    tick(2000); expect(finished).toHaveBeenCalledTimes(1)
  })
  it('offers the traditional resolution of the remaining kicks', async () => {
    const finished = await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Resolve the rest with the traditional system' }))
    tick(100)
    expect(finished).toHaveBeenCalledTimes(1)
    expect(finished.mock.calls[0][0].kicks.every((kick: { source: string }) => kick.source === 'AUTO')).toBe(true)
  })
})

describe('SIM-MINI-002 series decided by hand', () => {
  it('waits for the confirmed kicks before naming the winner and records the series once', async () => {
    let found = false
    for (let n = 0; n < 20 && !found; n++) {
      cleanup(); vi.useFakeTimers()
      const i18n = await createI18n('en'); const recorded = vi.fn()
      render(<I18nextProvider i18n={i18n}><LiveSeriesScreen origin={origin(`mini-series-${n}`)} versusCpu difficulty="HARD" names={names} onSeriesFinished={recorded} onReturn={vi.fn()} onRematch={vi.fn()} onNewMatch={vi.fn()} /></I18nextProvider>)
      fireEvent.click(screen.getByLabelText('Skip animations'))
      for (let games = 0; games < 5; games++) {
        advance(() => false)
        if (screen.queryByRole('region', { name: 'Penalty shootout' })) break
        const prepare = screen.queryByRole('button', { name: 'Prepare next game' })
        if (!prepare) break
        fireEvent.click(prepare)
        fireEvent.click(screen.getByRole('radio', { name: /High press/ })); fireEvent.click(screen.getByRole('button', { name: 'Confirm strategy' })); fireEvent.click(screen.getByRole('button', { name: 'Start match' }))
        fireEvent.click(screen.getByLabelText('Skip animations'))
      }
      const shootout = screen.queryByRole('region', { name: 'Penalty shootout' })
      if (!shootout) continue
      found = true
      expect(recorded).not.toHaveBeenCalled()
      expect(screen.queryByText(/wins the series/)).toBeNull()
      for (let guard = 0; guard < 140 && !recorded.mock.calls.length; guard++) {
        if (document.querySelector('.shot-scene')) { tick(3000); continue }
        const shot = region('Precision shot'); const dive = region('Choose where the keeper dives')
        if (shot) { fireEvent.click(within(shot).getByRole('radio', { name: /Left/ })); fireEvent.click(within(shot).getByRole('button', { name: 'Now!' })) }
        else if (dive) { fireEvent.click(within(dive).getByRole('button', { name: /Right/ })) }
        else tick(100)
      }
      expect(recorded).toHaveBeenCalledTimes(1)
      expect(recorded.mock.calls[0][0]).toMatch(/^(local|cpu)$/)
      expect(screen.getAllByText(/wins the series/i).length).toBeGreaterThan(0)
      const archive = JSON.parse((screen.getAllByRole('textbox', { name: 'Versioned record' }).at(-1) as HTMLTextAreaElement).value)
      expect(archive.shootout.version).toBe('penalty-shootout-v1'); expect(archive.shootout.winner).toBe(recorded.mock.calls[0][0])
    }
    expect(found).toBe(true)
  }, 120_000)
})
