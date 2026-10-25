import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { boardDots, contextualPlayerOffset, type BoardDot, type BoardPlay } from './boardGeometry'
import { FORMATION_IDS } from '../tactics/formations'
import { TacticalBoard, type TacticalBoardProps } from './TacticalBoard'
import { liveInput } from './interactive/liveFixtures.test-support'

const input = liveInput()
const formations = { local: '4-3-3', cpu: '4-3-3' } as const
const lineups = { local: input.localLineup, cpu: input.cpuLineup }
const dots = boardDots(formations, lineups)
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('contextual football movement is presentation only', () => {
  it('supports the attack by depth, converges on the ball and retreats in a separate defensive block', () => {
    const play = Object.freeze({ kind: 'attack', side: 'local' } as const), ball = Object.freeze({ x: .7, y: .2 })
    const forward = dots.find(dot => dot.side === 'local' && dot.slotId === 'LW')!
    const defender = dots.find(dot => dot.side === 'cpu' && dot.slotId === 'LCB')!
    const offset = contextualPlayerOffset(forward, play, ball, false)
    expect(offset.x).toBeGreaterThanOrEqual(.1); expect(offset.x).toBeLessThanOrEqual(.16)
    expect(offset.y).toBeCloseTo((ball.y - forward.home.y) * .15)
    const retreat = contextualPlayerOffset(defender, play, ball, false)
    expect(retreat.x).toBeGreaterThan(0)
    expect(retreat.y).toBeCloseTo((ball.y - defender.home.y) * .18)
    expect(new Set(dots.filter(dot => dot.side === 'local').map(dot => contextualPlayerOffset(dot, play, ball, false).x)).size).toBeGreaterThan(3)
    expect(contextualPlayerOffset(forward, play, ball, true).x).toBeGreaterThanOrEqual(offset.x)
  })
  it('mirrors both axes and both teams, and recognises the attacking side of a save', () => {
    for (const dot of dots) {
      const mirror: BoardDot = { ...dot, side: dot.side === 'local' ? 'cpu' : 'local', home: { x: 1 - dot.home.x, y: 1 - dot.home.y } }
      const a = contextualPlayerOffset(dot, { kind: 'attack', side: 'local' }, { x: .75, y: .22 }, true)
      const b = contextualPlayerOffset(mirror, { kind: 'attack', side: 'cpu' }, { x: .25, y: .78 }, true)
      expect(b.x).toBeCloseTo(-a.x); expect(b.y).toBeCloseTo(-a.y)
      expect(contextualPlayerOffset(dot, { kind: 'save', side: 'cpu' }, { x: .75, y: .22 }, true)).toEqual(a)
    }
  })
  it('keeps all 22 dots within the pitch in every formation, with quiet inactive poses and no clock/RNG', () => {
    const random = vi.spyOn(Math, 'random'), clock = vi.spyOn(performance, 'now')
    for (const formation of FORMATION_IDS) {
      const team = boardDots({ local: formation, cpu: formation }, lineups)
      expect(team).toHaveLength(22)
      for (const dot of team) {
        for (const side of ['local', 'cpu'] as const) {
          const offset = contextualPlayerOffset(dot, { kind: 'shot', side }, { x: 1, y: 0 }, true)
          expect(dot.home.x + offset.x).toBeGreaterThanOrEqual(.035)
          expect(dot.home.x + offset.x).toBeLessThanOrEqual(.965)
          expect(dot.home.y + offset.y).toBeGreaterThanOrEqual(.04)
          expect(dot.home.y + offset.y).toBeLessThanOrEqual(.96)
        }
        for (const kind of ['idle', 'substitution', 'final'] as const) expect(contextualPlayerOffset(dot, { kind, side: 'local' }, { x: 1, y: 0 }, true)).toEqual({ x: 0, y: 0 })
      }
    }
    expect(random).not.toHaveBeenCalled(); expect(clock).not.toHaveBeenCalled()
  })
})

async function canvasHarness(play: BoardPlay = { kind: 'attack', side: 'local', playerId: input.localLineup.ST! }, options = true, reduced = false) {
  let now = 0, nextId = 0
  const callbacks = new Map<number, FrameRequestCallback>()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callbacks.set(++nextId, callback); return nextId })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id))
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  let preference = reduced, notify = () => {}
  vi.stubGlobal('matchMedia', () => ({ get matches() { return preference }, addEventListener: (_: string, listener: () => void) => { notify = listener }, removeEventListener: vi.fn() }))
  const text: { value: string; x: number; y: number }[] = [], fills: number[] = []
  const state: Record<string, unknown> = { globalAlpha: 1 }
  const stack: unknown[] = []
  Object.assign(state, {
    measureText: () => ({ width: 30 }),
    clearRect: () => { text.length = 0; fills.length = 0 },
    save: () => stack.push(state.globalAlpha), restore: () => { state.globalAlpha = stack.pop() ?? 1 },
    fillText: (value: string, x: number, y: number) => text.push({ value, x, y }),
    fill: () => fills.push(state.globalAlpha as number),
  })
  const ctx = new Proxy(state, { get: (target, key) => Reflect.get(target, key) ?? (() => {}) })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
  const pick = vi.fn(), i18n = await createI18n('en')
  let props: TacticalBoardProps = { formations, lineups, catalog: input.catalog, names: { local: 'Home', cpu: 'Away' }, play, tick: 1, focus: 'full', speed: 1, animate: true, ...(options ? { choices: [{ playerId: input.localLineup.LW!, label: 'A' }, { playerId: input.localLineup.RW!, label: 'B' }], onPick: pick } : {}) }
  const node = () => <I18nextProvider i18n={i18n}><TacticalBoard {...props} /></I18nextProvider>
  const ui = render(node())
  const frame = (time: number) => act(() => { now = time; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback(time)) })
  const mate = () => text.find(item => item.value === 'A')!
  return { ui, pick, callbacks, fills, mate, frame, change: (patch: Partial<TacticalBoardProps>) => { props = { ...props, ...patch }; ui.rerender(node()) }, reduce: () => act(() => { preference = true; notify() }) }
}

describe('Canvas runs, trail and lifecycle', () => {
  it('keeps receivers running after settling, updates hit areas and freezes their pose on manual pause', async () => {
    const h = await canvasHarness()
    for (let t = 0; t <= 3000; t += 100) h.frame(t)
    const first = { ...h.mate() }
    h.frame(3100)
    expect(h.mate().x).not.toBeCloseTo(first.x, 2)
    expect(h.callbacks.size).toBe(1)
    const frozen = { ...h.mate() }
    h.change({ paused: true }); h.frame(4000)
    expect(h.mate()).toEqual(frozen); expect(h.callbacks.size).toBe(0)
    h.change({ paused: false }); h.frame(4100); h.frame(4200)
    const mate = h.mate()
    fireEvent.click(document.querySelector('canvas')!, { clientX: mate.x, clientY: mate.y + 640 * .0145 * 2.9 })
    expect(h.pick).toHaveBeenCalledExactlyOnceWith('A')
    h.frame(4300); h.frame(4400)
    expect(h.fills).toEqual(expect.arrayContaining([.35, .20, .08]))
    h.ui.unmount(); expect(h.callbacks.size).toBe(0)
  })
  it('draws a decreasing three-circle trail while a shot moves and stops repainting once settled', async () => {
    const h = await canvasHarness({ kind: 'shot', side: 'local', playerId: input.localLineup.ST! }, false)
    h.frame(0); h.frame(100); h.frame(200); h.frame(300)
    expect(h.fills).toEqual(expect.arrayContaining([.35, .20, .08]))
    for (let t = 400; t <= 5000 && h.callbacks.size; t += 100) h.frame(t)
    expect(h.callbacks.size).toBe(0)
    expect(h.fills).not.toContain(.35)
  })
  it('honours reduced motion initially and when the preference changes, keeping static options clickable', async () => {
    const h = await canvasHarness(undefined, true, true)
    h.frame(0)
    expect(h.callbacks.size).toBe(0); expect(h.fills).not.toContain(.35)
    const mate = h.mate()
    fireEvent.click(document.querySelector('canvas')!, { clientX: mate.x, clientY: mate.y + 640 * .0145 * 2.9 })
    expect(h.pick).toHaveBeenCalledExactlyOnceWith('A')
    h.ui.unmount()
    const animated = await canvasHarness()
    animated.frame(0); animated.frame(100)
    expect(animated.callbacks.size).toBe(1)
    animated.reduce(); animated.frame(200)
    expect(animated.callbacks.size).toBe(0); expect(animated.fills).not.toContain(.35)
  })
})
