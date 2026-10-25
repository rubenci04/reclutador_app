import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { LiveMatchScreen } from './LiveMatchScreen'
import { liveSession } from './interactive/liveFixtures.test-support'
import type { Session } from './interactive'
import { isFrontLine, SHOUT_MINUTES, shoutActive, shoutOffset, shoutReadyAt } from './touchlineShouts'

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
