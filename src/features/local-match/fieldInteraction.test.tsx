import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { LiveMatchScreen } from './LiveMatchScreen'
import { createSession } from './interactive'
import type { Session, SessionOptions } from './interactive'
import { liveInput, must } from './interactive/liveFixtures.test-support'
import { nearestHit } from './shortName'

// SIM-FIELD-002: finishing and defending by touching the pitch of the real live screen. jsdom has no layout, so the board paints at 640 px
// (1 client pixel = 1 painted pixel) and the fake 2D context records where the offered teammate, the press zone and the lanes were drawn.
const OPTIONS = { benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, acquisition: { local: { spent: 69, coachPaid: 1, budget: 150 }, cpu: { spent: 70, coachPaid: 0, budget: 150 } }, moments: { version: 'match-moments-v1' }, aerial: { version: 'directed-header-v1' }, matchRules: { version: 'halftime-ovr-v1' }, corners: { version: 'corners-v1' }, freeKicks: { version: 'free-kicks-v1' }, precisionShot: { version: 'precision-shot-v1' }, defenseMini: { version: 'defense-mini-v1' }, shootout: { version: 'penalty-shootout-v1' } } as const
const names = { local: 'Home', cpu: 'Away' }
const RADIUS = 640 * .0145
const drawn = { text: [] as { t: string; x: number; y: number }[], arcs: [] as { x: number; y: number; r: number }[] }
const tick = (ms: number) => { for (let elapsed = 0; elapsed < ms; elapsed += 50) act(() => { vi.advanceTimersByTime(50) }) }
const canvas = () => document.querySelector('canvas.tactical-canvas') as HTMLCanvasElement
const tap = (x: number, y: number) => fireEvent.click(canvas(), { clientX: x, clientY: y })
const goalTap = () => tap(630, 207)
const mateTap = () => { const mate = drawn.text.filter((c) => c.t === 'A').at(-1)!; tap(mate.x, mate.y + RADIUS * 2.9) }
const pressTap = () => { const ring = drawn.arcs.filter((c) => Math.abs(c.r - RADIUS * 2.7) < .01).at(-1)!; tap(ring.x, ring.y) }
const laneTap = (lane: 'LEFT' | 'CENTER' | 'RIGHT') => tap(40, { LEFT: 100, CENTER: 207, RIGHT: 315 }[lane])

beforeEach(() => {
  drawn.text.length = 0; drawn.arcs.length = 0
  const fake = new Proxy({ measureText: () => ({ width: 30 }), fillText: (t: string, x: number, y: number) => drawn.text.push({ t, x, y }), arc: (x: number, y: number, r: number) => drawn.arcs.push({ x, y, r }) } as Record<string, unknown>, { get: (target, key: string) => key in target ? target[key] : () => {}, set: () => true })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fake as never)
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

async function openMatch(seed: string) {
  vi.useFakeTimers()
  const i18n = await createI18n('en'); const done = vi.fn<(session: Session) => void>()
  const origin = must(createSession(liveInput(seed), { sessionId: 'field-screen', ...OPTIONS } as never as SessionOptions))
  render(<I18nextProvider i18n={i18n}><LiveMatchScreen origin={origin} versusCpu difficulty="HARD" names={names} closed={false} onFinished={done} onReturn={vi.fn()} /></I18nextProvider>)
  fireEvent.click(screen.getByLabelText('Skip animations'))
  return done
}
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
async function reach(prefix: string, stop: () => boolean) {
  for (let n = 0; n < 60; n++) {
    cleanup(); vi.restoreAllMocks(); beforeEachMock()
    const done = await openMatch(`${prefix}-${n}`)
    advance(stop)
    if (stop()) { tick(100); return { done, seed: `${prefix}-${n}` } }
  }
  throw new Error(`never offered: ${prefix}`)
}
function beforeEachMock() {
  const fake = new Proxy({ measureText: () => ({ width: 30 }), fillText: (t: string, x: number, y: number) => drawn.text.push({ t, x, y }), arc: (x: number, y: number, r: number) => drawn.arcs.push({ x, y, r }) } as Record<string, unknown>, { get: (target, key: string) => key in target ? target[key] : () => {}, set: () => true })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fake as never)
}
const finishOf = (done: { mock: { calls: Session[][] } }) => done.mock.calls[0][0].result!.plays!
const canShoot = () => document.querySelector('.play-card-SHOOT') !== null
const canCross = () => document.querySelector('.play-card-CROSS:not(:disabled)') !== null
const defending = () => screen.queryByRole('region', { name: 'Interactive defence' }) !== null

describe('SIM-FIELD-002 nearest hit areas', () => {
  it('lets a circle win over the lane under it and ignores points outside every area', () => {
    const hits = [{ x: 100, y: 100, r: 0, hw: 80, hh: 40, label: 'DEF:LEFT' }, { x: 100, y: 100, r: 20, label: 'DEF:PRESS' }]
    expect(nearestHit(hits, 105, 100)?.label).toBe('DEF:PRESS'); expect(nearestHit(hits, 40, 100)?.label).toBe('DEF:LEFT')
    expect(nearestHit(hits, 40, 160)).toBeNull(); expect(nearestHit([], 1, 1)).toBeNull()
  })
})

describe('SIM-FIELD-002 attack on the board', () => {
  it('keeps the direct pass of SIM-FIELD-001 on DIRECTION', { timeout: 120_000 }, async () => {
    const { done } = await reach('field-dir', () => document.querySelector('.play-card-LEFT') !== null && drawn.text.some((c) => c.t === 'A'))
    expect(document.querySelector('.board-pick-hint')?.textContent).toBe('Tap your teammate')
    mateTap(); mateTap()
    advance(() => false)
    expect(finishOf(done).filter((e) => e.node === 'DIRECTION' && e.choice === 'LEFT').length).toBeGreaterThan(0)
  })
  it('FINISH: tapping the goal sends SHOOT exactly once and shows the same result as its card', { timeout: 120_000 }, async () => {
    const { done, seed } = await reach('field-fin', canShoot)
    expect(document.querySelector('.is-board-secondary')).not.toBeNull()
    expect(document.querySelector('.board-pick-hint')?.textContent).toMatch(/^Tap the goal/)
    goalTap(); goalTap()
    advance(() => false)
    const viaBoard = finishOf(done)
    expect(viaBoard.filter((e) => e.node === 'FINISH' && e.choice === 'SHOOT').length).toBeGreaterThan(0)
    const board = done.mock.calls[0][0].result
    cleanup(); vi.restoreAllMocks(); beforeEachMock()
    const again = await openMatch(seed)
    advance(canShoot); fireEvent.click(document.querySelector('.play-card-SHOOT')!)
    advance(() => false)
    expect(again.mock.calls[0][0].result).toEqual(board)
  })
  it('FINISH: tapping the teammate sends CROSS and an area outside the goal and the teammate does nothing', { timeout: 120_000 }, async () => {
    const { done } = await reach('field-cross', () => canCross() && drawn.text.some((c) => c.t === 'A'))
    expect(document.querySelector('.board-pick-hint')?.textContent).toBe('Tap the goal or your teammate')
    tap(300, 400)
    expect(document.querySelector('.play-card-SHOOT')).not.toBeNull()
    mateTap()
    expect(document.querySelector('.play-card-SHOOT')).toBeNull()
    advance(() => false)
    expect(finishOf(done).filter((e) => e.node === 'FINISH' && e.choice === 'CROSS')).toHaveLength(1)
  })
})

describe('SIM-FIELD-002 defense on the board', () => {
  it('lane tap selects and starts the bar, the next timed tap executes once and no zone survives the moment', { timeout: 120_000 }, async () => {
    const { done } = await reach('field-def', () => defending() && drawn.arcs.length > 0)
    expect(document.querySelector('.board-pick-hint')?.textContent).toBe('Anticipate a lane or press')
    expect(document.querySelector('.defense-panel.is-board-driven')).not.toBeNull()
    expect(document.querySelector('.tactical-board .dribble-bar')).toBeNull()
    laneTap('LEFT')
    expect(screen.getByRole('radio', { name: /Anticipate left/ })).toHaveAttribute('aria-checked', 'true')
    expect(document.querySelector('.tactical-board .dribble-bar')).not.toBeNull()
    expect(document.querySelector('.board-pick-hint')?.textContent).toBe('Tap again to stop the bar')
    laneTap('RIGHT')
    expect(defending()).toBe(true)
    tick(500)
    laneTap('RIGHT')
    const scene = document.querySelector('.defense-scene') as HTMLElement
    expect(scene).not.toBeNull(); expect(scene.getAttribute('data-pick')).toBe('LEFT')
    expect(scene.getAttribute('data-result')).toMatch(/^(RECOVERED|BEATEN_(BLOCK|WIDE|SAVE|GOAL))$/)
    expect(defending()).toBe(false)
    laneTap('LEFT'); tick(500); laneTap('LEFT')
    expect(document.querySelectorAll('.defense-scene')).toHaveLength(1)
    tick(3000); advance(() => false)
    const plays = finishOf(done).filter((e) => e.node === 'DEFEND')
    expect(plays.filter((e) => e.choice === 'DEFEND_LEFT' && typeof e.precision === 'number')).toHaveLength(1)
  })
  it('the press zone sends PRESS and the cards, keyboard and traditional answer still work', { timeout: 120_000 }, async () => {
    const { done } = await reach('field-press', () => defending() && drawn.arcs.some((c) => Math.abs(c.r - RADIUS * 2.7) < .01))
    pressTap()
    expect(screen.getByRole('radio', { name: /Press/ })).toHaveAttribute('aria-checked', 'true')
    fireEvent.keyDown(screen.getByRole('region', { name: 'Interactive defence' }), { key: 'ArrowRight' })
    expect(screen.getByRole('radio', { name: /Anticipate right/ })).toHaveAttribute('aria-checked', 'true')
    fireEvent.keyDown(screen.getByRole('region', { name: 'Interactive defence' }), { key: 'ArrowDown' })
    tick(500); pressTap()
    expect(document.querySelector('.defense-scene')!.getAttribute('data-pick')).toBe('PRESS')
    tick(3000); advance(() => false)
    expect(finishOf(done).filter((e) => e.node === 'DEFEND' && e.choice === 'PRESS' && typeof e.precision === 'number')).toHaveLength(1)
  })
  it('gives the same sporting result as the cards when the precision is the same (reduced motion: neutral precision)', { timeout: 120_000 }, async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: /reduce/.test(query), media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }))
    const { done, seed } = await reach('field-same', defending)
    expect(document.querySelector('.tactical-board .dribble-bar')).toBeNull()
    laneTap('CENTER'); expect(document.querySelector('.board-pick-hint')?.textContent).toBe('Tap again to confirm')
    tick(500); laneTap('CENTER')
    tick(3000); advance(() => false)
    const board = done.mock.calls[0][0].result
    cleanup(); vi.restoreAllMocks(); beforeEachMock()
    const cards = await openMatch(seed)
    advance(defending)
    fireEvent.click(screen.getByRole('radio', { name: /Anticipate centre/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm defence' }))
    tick(3000); advance(() => false)
    expect(cards.mock.calls[0][0].result).toEqual(board)
  })
})
