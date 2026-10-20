import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { TacticalBoard, type TacticalBoardProps } from './TacticalBoard'
import * as geometry from './aerialGeometry'
import { liveInput } from './interactive/liveFixtures.test-support'
import type { AerialEvent } from './interactive/directedHeader'
import { frameSounds } from './livePresentation'
import type { LiveFrame } from './livePresentation'

const input = liveInput()
const action: AerialEvent = { version: 'directed-header-v1', crosserId: input.localLineup.LW!, targetId: input.localLineup.ST!, defenderId: input.cpuLineup.LCB!, sector: 'LEFT' }
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('R-04B visual continuity (not browser QA)', () => {
  it('keeps the whole pose continuous across every aerial beat, including all endings', () => {
    const sequence = ['AERIAL_CROSS', 'AERIAL_CONTEST', 'AERIAL_WON', 'DIRECTED_HEADER_CONTACT', 'DIRECTED_HEADER_FLIGHT'] as const
    const aimed = { ...action, direction: 'FAR_POST', keeperDirection: 'NEAR_POST' } as const
    let prior = geometry.aerialScene(action, 'AERIAL_CROSS', 0)
    for (const step of sequence) {
      const before = geometry.aerialScene(aimed, step, 0, prior)
      expect(before).toEqual(prior)
      prior = geometry.aerialScene(aimed, step, 1, prior)
    }
    expect(prior.ball.x).toBeLessThan(.95) // no goal mouth reached before the confirmed ending
    for (const ending of ['DIRECTED_HEADER_GOAL', 'DIRECTED_HEADER_SAVE', 'DIRECTED_HEADER_WIDE', 'DIRECTED_HEADER_OVER'] as const) {
      expect(geometry.aerialScene(aimed, ending, 0, prior)).toEqual(prior)
      expect(geometry.aerialScene(aimed, ending, 1, prior).ball).not.toEqual(prior.ball)
    }
    const clearStart = geometry.aerialScene(action, 'AERIAL_CROSS', 1)
    expect(geometry.aerialScene(action, 'AERIAL_CLEAR', 0, clearStart)).toEqual(clearStart)
    const mid = geometry.aerialScene(action, 'AERIAL_CONTEST', .5)
    expect(mid.jump).toBeGreaterThan(.06)
    expect(Math.hypot(mid.players[action.targetId].x - mid.players[action.defenderId].x, mid.players[action.targetId].y - mid.players[action.defenderId].y)).toBeGreaterThan(.06)
    expect(geometry.aerialScene(action, 'AERIAL_WON', 1).keeper).toEqual({ x: .96, y: .5 })
    expect(geometry.aerialScene(aimed, 'DIRECTED_HEADER_CONTACT', 1).keeper).toEqual({ x: .96, y: .5 })
  })

  it('keeps ball attached during the run-up and continuous at release', () => {
    const p = geometry.aerialScene(action, 'AERIAL_CROSS', .1)
    expect(p.ball.x - p.players[action.crosserId].x).toBeCloseTo(.018)
    const before = geometry.aerialScene(action, 'AERIAL_CROSS', .25)
    const after = geometry.aerialScene(action, 'AERIAL_CROSS', .250001)
    expect(after.ball.x).toBeCloseTo(before.ball.x, 5); expect(after.height).toBeCloseTo(before.height, 5)
  })

  it('freezes the canvas clock on pause, retains elapsed progress on speed/focus/rerender and snaps reduced motion', async () => {
    const callbacks = new Map<number, FrameRequestCallback>(); let id = 0
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { callbacks.set(++id, fn); return id })
    vi.stubGlobal('cancelAnimationFrame', (key: number) => callbacks.delete(key))
    const ctx = new Proxy({ measureText: () => ({ width: 50 }) }, { get: (target, key) => Reflect.get(target, key) ?? (() => undefined) })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
    const scene = vi.spyOn(geometry, 'aerialScene')
    const i18n = await createI18n('en')
    let props: TacticalBoardProps = { formations: { local: '4-3-3', cpu: '4-3-3' }, lineups: { local: input.localLineup, cpu: input.cpuLineup }, catalog: input.catalog, names: { local: 'Home', cpu: 'Away' }, play: { kind: 'pass', side: 'local', playerId: action.crosserId, aerial: action, step: 'AERIAL_CROSS' }, tick: 1, focus: 'full', speed: 1, animate: true }
    const node = () => <I18nextProvider i18n={i18n}><TacticalBoard {...props} /></I18nextProvider>
    const ui = render(node())
    const raf = (time: number) => act(() => { const current = [...callbacks.values()]; callbacks.clear(); current.forEach((cb) => cb(time)) })
    raf(0); raf(100); raf(200)
    // Paint draws the trail too; all sampled progresses are <= the actual frame progress.
    const maxProgress = () => Math.max(...scene.mock.calls.map((c) => c[2]))
    expect(maxProgress()).toBeCloseTo(.2)
    props = { ...props, paused: true }; ui.rerender(node()); scene.mockClear(); raf(1000)
    expect(scene.mock.calls.every((c) => c[2] <= .200001)).toBe(true)
    props = { ...props, paused: false, focus: 'cpu', speed: 2, play: { ...props.play } }; ui.rerender(node()); scene.mockClear()
    raf(2000); raf(2100); expect(maxProgress()).toBeCloseTo(.4)
    props = { ...props, animate: false }; ui.rerender(node()); scene.mockClear(); raf(2200)
    expect(maxProgress()).toBe(1)
    ui.unmount(); expect(callbacks.size).toBe(0)
  })

  it('does not turn contest/win/flight into extra pass sounds', () => {
    const frame = (step: 'AERIAL_CROSS' | 'AERIAL_CONTEST' | 'AERIAL_WON' | 'DIRECTED_HEADER_CONTACT' | 'DIRECTED_HEADER_FLIGHT'): LiveFrame => ({ key: step, minute: 30, events: [{ minute: 30, side: 'local', type: 'pass', step, aerial: action }], score: { local: 0, cpu: 0 }, lastOfBlock: false })
    expect(frameSounds(frame('AERIAL_CROSS'))).toEqual(['cross'])
    expect(frameSounds(frame('DIRECTED_HEADER_CONTACT'))).toEqual(['header'])
    for (const phase of ['AERIAL_CONTEST', 'AERIAL_WON', 'DIRECTED_HEADER_FLIGHT'] as const) expect(frameSounds(frame(phase))).toEqual([])
  })
})
