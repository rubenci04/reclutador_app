import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { LiveMatchScreen } from './LiveMatchScreen'
import { liveSession } from './interactive/liveFixtures.test-support'
import type { Session } from './interactive'
import { isFrontLine, SHOUT_ADJUSTMENT, SHOUT_MINUTES, SHOUTS, shoutActive, shoutOffset, shoutReadyAt, shoutTacticalAdjustment } from './touchlineShouts'
import { liveInput } from './interactive/liveFixtures.test-support'
import { advanceBlock, callTouchlineShout, createSession } from './interactive'

afterEach(() => { cleanup(); vi.useRealTimers() })
const tick = (ms: number) => { for (let elapsed = 0; elapsed < ms; elapsed += 50) act(() => { vi.advanceTimersByTime(50) }) }

describe('SIM-FIELD-004 shout rules', () => {
  it('keeps a shout on the pitch for one block and blocks calling it again until the block ends', () => {
    const calls = { PRESS: 30 }
    expect(shoutActive(calls, 'PRESS', 29)).toBe(false); expect(shoutActive(calls, 'PRESS', 30)).toBe(true); expect(shoutActive(calls, 'PRESS', 30 + SHOUT_MINUTES - 1)).toBe(true); expect(shoutActive(calls, 'PRESS', 30 + SHOUT_MINUTES)).toBe(false)
    expect(shoutReadyAt(calls, 'PRESS')).toBe(45); expect(shoutReadyAt(calls, 'COMPACT')).toBe(0); expect(shoutActive({}, 'COMPACT', 10)).toBe(false)
  })
  it('moves only outfield circles: pressing steps up 4%, closing the lines pulls defenders to the axis, keepers stay', () => {
    expect(shoutOffset([], { x: .4, y: .2 }, false)).toEqual({ x: 0, y: 0 })
    expect(shoutOffset(['PRESS'], { x: .4, y: .2 }, false).x).toBeCloseTo(.04, 10)
    expect(shoutOffset(['PRESS'], { x: .15, y: .2 }, false).x).toBe(0)
    expect(shoutOffset(['COMPACT'], { x: .15, y: .2 }, false).y).toBeGreaterThan(0)
    expect(shoutOffset(['COMPACT'], { x: .15, y: .8 }, false).y).toBeLessThan(0)
    expect(shoutOffset(['PRESS', 'COMPACT'], { x: .03, y: .5 }, true)).toEqual({ x: 0, y: 0 })
    expect(isFrontLine({ x: .7 })).toBe(true); expect(isFrontLine({ x: .3 })).toBe(false)
  })
})

describe('SIM-FIELD-004 shouts on the live screen', () => {
  async function play(shout: boolean) {
    vi.useFakeTimers()
    const i18n = await createI18n('en'); const done = vi.fn<(session: Session) => void>()
    render(<I18nextProvider i18n={i18n}><LiveMatchScreen origin={liveSession('shouts')} versusCpu difficulty="HARD" names={{ local: 'Home', cpu: 'Away' }} closed={false} onFinished={done} onReturn={vi.fn()} /></I18nextProvider>)
    const press = screen.getByRole('button', { name: /Press high/ })
    if (shout) {
      fireEvent.click(press)
      expect(press).toHaveAttribute('aria-pressed', 'true'); expect(press).toBeDisabled()
      expect(screen.getByRole('button', { name: /Close ranks/ })).not.toBeDisabled()
    }
    for (let i = 0; i < 600 && !screen.queryByRole('button', { name: 'Replay match' }); i++) {
      const confirm = screen.queryByRole('button', { name: 'Confirm decision' })
      if (confirm) fireEvent.click(confirm); else tick(100)
    }
    expect(screen.getByRole('button', { name: 'Replay match' })).toBeInTheDocument()
    return done
  }
  it('never changes the match: the same game reaches the same final result with and without shouts', async () => {
    const plain = await play(false); const plainResult = JSON.stringify(plain.mock.calls[0]?.[0].result)
    cleanup()
    const shouted = await play(true)
    expect(JSON.stringify(shouted.mock.calls[0]?.[0].result)).toBe(plainResult)
  }, 60_000)
})

describe('TECH-005 tactical-shouts-v1', () => {
  const opted = (seed?: string) => { const created = createSession(liveInput(seed), { sessionId: 'shout-fixture', benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, acquisition: { local: { spent: 69, coachPaid: 1, budget: 150 }, cpu: { spent: 70, coachPaid: 0, budget: 150 } }, touchlineShouts: 'tactical-shouts-v1' }); if (!created.ok) throw new Error(created.error); return created.value }
  const get = <T,>(outcome: { ok: true; value: T } | { ok: false; error: string }): T => { if (!outcome.ok) throw new Error(outcome.error); return outcome.value }
  it('gives every shout a gain and a cost, sums the active ones and never leaves ±3 per sector', () => {
    expect(shoutTacticalAdjustment([])).toEqual({ attack: 0, defense: 0, midfield: 0 })
    expect(shoutTacticalAdjustment(['ONE_ON_ONE'])).toEqual({ attack: 1.5, defense: 0, midfield: -1.5 })
    expect(shoutTacticalAdjustment(['PRESS'])).toEqual({ attack: .5, defense: -2, midfield: 1.8 })
    expect(shoutTacticalAdjustment(['COMPACT'])).toEqual({ attack: -2, defense: 2, midfield: 0 })
    const both = shoutTacticalAdjustment(['PRESS', 'COMPACT'])
    expect(both.attack).toBeCloseTo(-1.5); expect(both.defense).toBeCloseTo(0); expect(both.midfield).toBeCloseTo(1.8)
    expect(shoutTacticalAdjustment(['PRESS', 'PRESS'])).toEqual(shoutTacticalAdjustment(['PRESS']))
    for (const shout of SHOUTS) { const values = Object.values(SHOUT_ADJUSTMENT[shout]); expect(Math.max(...values)).toBeGreaterThan(0); expect(Math.min(...values)).toBeLessThan(0) }
    const subsets = [[], ...SHOUTS.map((shout) => [shout]), ['ONE_ON_ONE', 'PRESS'], ['ONE_ON_ONE', 'COMPACT'], ['PRESS', 'COMPACT'], [...SHOUTS]] as const
    for (const subset of subsets) for (const value of Object.values(shoutTacticalAdjustment(subset))) expect(Math.abs(value)).toBeLessThanOrEqual(3)
  })
  it('is refused by sessions that did not opt in, so historical sessions are untouched', () => {
    expect(callTouchlineShout(liveSession(), 'PRESS')).toEqual({ ok: false, error: 'UNSUPPORTED_ORDER' })
    expect(liveSession().kernel.shoutCalls).toBeUndefined()
  })
  it('without a shout the opt-in session plays exactly like the historical one', () => {
    expect(get(advanceBlock(opted('shout-same'))).kernel.blocks).toEqual(get(advanceBlock(liveSession('shout-same'))).kernel.blocks)
  })
  it('applies the shout to the local side only, for the block it covers, and enforces the cooldown', () => {
    const base = get(advanceBlock(opted('shout-press'))).kernel.adjustmentTotals
    const called = get(callTouchlineShout(opted('shout-press'), 'PRESS'))
    expect(callTouchlineShout(called, 'PRESS')).toEqual({ ok: false, error: 'INVALID_PHASE' })
    expect(called.kernel.shoutCalls).toEqual({ PRESS: called.kernel.shoutCalls!.PRESS })
    const after = get(advanceBlock(called)).kernel.adjustmentTotals
    expect(after.local.midfield - base.local.midfield).toBeCloseTo(1.8)
    expect(after.local.defense - base.local.defense).toBeCloseTo(-2)
    expect(after.local.attack - base.local.attack).toBeCloseTo(.5)
    expect(after.cpu).toEqual(base.cpu)
    expect(callTouchlineShout(get(advanceBlock(called)), 'COMPACT').ok).toBe(true)
  })
})
