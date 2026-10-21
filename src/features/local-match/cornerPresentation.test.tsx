import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { LiveMatchScreen } from './LiveMatchScreen'
import { audio } from '../audio/audioEngine'
import { cornerSession, stepCornerSession } from './interactive/cornerFixtures.test-support'
import type { PlayNode } from './interactive'
import type { MatchEvent } from './matchTypes'
import { cornerBeatDuration, cornerScene } from './cornerGeometry'
import { frameSounds, type LiveFrame } from './livePresentation'
import { eventKey, eventVariant } from './matchFeed'
import { TacticalBoard } from './TacticalBoard'
import * as geometry from './cornerGeometry'

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const pending = (node: PlayNode) => {
  for (let seed = 0; seed < 30; seed++) {
    let s = cornerSession(`corners:${seed}`)
    while (s.phase !== 'FINISHED') { if (s.kernel.partial?.play?.node === node) return s; s = stepCornerSession(s) }
  }
  throw Error('corner_node_fixture_missing')
}
const tick = (ms: number) => { for (let n = 0; n < ms; n += 25) act(() => { vi.advanceTimersByTime(Math.min(25, ms - n)) }) }
async function open(node: PlayNode, language: 'es-AR' | 'en' | 'pt-BR' = 'en') {
  vi.useFakeTimers(); const i18n = await createI18n(language), origin = pending(node)
  render(<I18nextProvider i18n={i18n}><LiveMatchScreen origin={origin} versusCpu difficulty="NORMAL" names={{ local: 'Home', cpu: 'Away' }} closed={false} onFinished={() => {}} onReturn={() => {}} /></I18nextProvider>)
  fireEvent.click(screen.getByRole('button', { name: i18n.t('liveDT.nextBlock') }))
  return { i18n, origin }
}
describe('corners presentation and controls', () => {
  it.each(['es-AR', 'en', 'pt-BR'] as const)('offers three offensive choices, two defensive choices and shared directed heading with focus in %s', async (language) => {
    for (const node of ['CORNER_ATTACK', 'CORNER_DEFEND', 'CORNER_HEADER'] as const) {
      const { i18n, origin } = await open(node, language)
      const title = i18n.t(node === 'CORNER_ATTACK' ? 'corner.attack' : node === 'CORNER_DEFEND' ? 'corner.defend' : 'aerial.title')
      expect(screen.getByRole('heading', { name: title })).toHaveFocus()
      const corner = origin.kernel.partial!.play!.corner!
      const narration = i18n.t(node === 'CORNER_HEADER' ? 'match.play.CORNER_WON' : 'match.play.CORNER_AWARDED', { player: origin.kernel.input.catalog.find((p) => p.id === corner.targetId)!.name, team: corner.awardedTo === 'local' ? 'Home' : 'Away' })
      expect(document.querySelector('.live-now')).toHaveTextContent(narration)
      expect(document.querySelectorAll('.play-card')).toHaveLength(node === 'CORNER_DEFEND' ? 2 : 3)
      expect(screen.getByRole('group', { name: i18n.t('navigation.playback') })).toBeInTheDocument()
      expect(screen.queryByText(i18n.t('halftime.question'))).not.toBeInTheDocument()
      cleanup(); vi.useRealTimers()
    }
  })
  it('waits for direction without an outcome, pauses/speeds the corner and sounds once for each real contact', async () => {
    const sounds = vi.spyOn(audio, 'play').mockReturnValue(true)
    const { i18n } = await open('CORNER_ATTACK')
    const count = (id: string) => sounds.mock.calls.filter(([s]) => s === id).length
    const before = count('cross')
    fireEvent.click(document.querySelector('.play-card-CORNER_NEAR')!)
    tick(100); fireEvent.click(screen.getByRole('button', { name: i18n.t('navigation.pause') })); tick(3000)
    expect(count('cross')).toBe(before)
    fireEvent.change(screen.getByRole('combobox', { name: i18n.t('navigation.speed') }), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: i18n.t('navigation.resume') })); tick(2000)
    expect(count('cross')).toBe(before + 1)
    expect(screen.getByRole('heading', { name: i18n.t('aerial.title') })).toBeInTheDocument()
    const headers = count('header'), goals = count('goal'); tick(6000)
    expect(count('header')).toBe(headers); expect(count('goal')).toBe(goals)
    const direction = document.querySelector('.play-card-FAR_POST')!; fireEvent.click(direction); fireEvent.click(direction)
    expect(count('header')).toBe(headers + 1)
    tick(2000); expect(count('header')).toBe(headers + 1)
  })
  it('short play and reduced motion never invent another decision or duplicate the corner', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    const { i18n } = await open('CORNER_ATTACK')
    fireEvent.click(screen.getByRole('checkbox', { name: i18n.t('liveDT.skipAnimations') }))
    const short = document.querySelector('.play-card-CORNER_SHORT')!; fireEvent.click(short); fireEvent.click(short); tick(350)
    expect(screen.queryByRole('heading', { name: i18n.t('aerial.title') })).not.toBeInTheDocument()
    expect(document.querySelectorAll('.moment-history li').length).toBeGreaterThan(0)
  })
  it('varies only the narration of confirmed facts and keeps historical keys unchanged by default', () => {
    const variants = new Set<number>()
    for (let minute = 15; minute <= 90; minute += 15) for (const playerId of ['A', 'B', 'C', 'D']) {
      const e: MatchEvent = { minute: minute as MatchEvent['minute'], side: 'local', type: 'recovery', playerId }
      variants.add(eventVariant(e)); expect(eventKey(e)).toBe('match.events.recovery'); expect(eventKey(e, true)).toContain('match.variants.recovery.player.')
      expect(eventKey({ ...e, step: 'CORNER_CLEAR' }, true)).toBe('match.play.CORNER_CLEAR')
    }
    expect(variants.size).toBe(3)
  })
  it('uses corner/header/clear/save/goal effects but never adds contacts during flight or positional phases', () => {
    const origin = pending('CORNER_ATTACK'), corner = origin.kernel.partial!.play!.corner!
    const frame = (step: MatchEvent['step'], type: MatchEvent['type'] = 'corner'): LiveFrame => ({ key: 'corner', minute: 45, events: [{ minute: 45, side: 'local', type, step, corner }], score: { local: 0, cpu: 0 }, lastOfBlock: false })
    expect(frameSounds(frame('CORNER_DELIVERY', 'pass'))).toEqual(['cross']); expect(frameSounds(frame('CORNER_CONTACT', 'pass'))).toEqual(['header'])
    for (const step of ['CORNER_RUNUP', 'CORNER_CONTEST', 'CORNER_ZONE', 'CORNER_WON'] as const) expect(frameSounds(frame(step))).toEqual([])
    expect(frameSounds(frame('CORNER_FLIGHT', 'pass'))).toEqual([]); expect(frameSounds(frame('CORNER_CLEAR', 'recovery'))).toEqual(['intercept'])
    expect(frameSounds(frame('CORNER_SAVE', 'save'))).toEqual(['shot']); expect(frameSounds(frame('CORNER_GOAL', 'goal'))).toEqual(['goal'])
    expect(frameSounds({ ...frame('CORNER_FLIGHT', 'pass'), lastOfBlock: true })).toEqual(['halfTimeWhistle'])
  })
})

describe('corner geometry is a representation, not browser evidence', () => {
  it('preserves pose between phases on both sides, keeps the keeper until the shot, and stops before goal until outcome', () => {
    for (const awardedTo of ['local', 'cpu'] as const) {
      const a = { ...pending('CORNER_HEADER').kernel.partial!.play!.corner!, awardedTo, direction: 'FAR_POST' as const, keeperDirection: 'NEAR_POST' as const }
      let prior = cornerScene(a, 'CORNER_AWARDED', 0)
      const samePose = (next: typeof prior, old: typeof prior) => { expect(next.height).toBeCloseTo(old.height); expect(next.jump).toBeCloseTo(old.jump); expect(next.ball.x).toBeCloseTo(old.ball.x); expect(next.ball.y).toBeCloseTo(old.ball.y); for (const id of Object.keys(old.players)) { expect(next.players[id].x).toBeCloseTo(old.players[id].x); expect(next.players[id].y).toBeCloseTo(old.players[id].y) } }
      const keeper = prior.keeper
      for (const step of ['CORNER_AWARDED', 'CORNER_RUNUP', 'CORNER_DELIVERY', 'CORNER_CONTEST', 'CORNER_WON', 'CORNER_CONTACT', 'CORNER_FLIGHT'] as const) {
        samePose(cornerScene(a, step, 0, prior), prior)
        if (step === 'CORNER_CONTEST') expect(cornerScene(a, step, .5, prior).jump).toBeGreaterThan(.06)
        prior = cornerScene(a, step, 1, prior)
        if (step !== 'CORNER_FLIGHT') expect(prior.keeper).toEqual(keeper)
      }
      expect(awardedTo === 'local' ? prior.ball.x < .95 : prior.ball.x > .05).toBe(true)
      for (const ending of ['CORNER_GOAL', 'CORNER_SAVE', 'CORNER_WIDE', 'CORNER_OVER', 'CORNER_CLEAR', 'CORNER_EXIT'] as const) samePose(cornerScene(a, ending, 0, prior), prior)
      const saved = cornerScene(a, 'CORNER_SAVE', 1, prior); expect(saved.ball).toEqual(saved.keeper)
      const short = { ...a, delivery: 'CORNER_SHORT' as const }, start = cornerScene(short, 'CORNER_SHORT_PASS', 1, prior)
      for (const t of [0, .25, .5, 1]) { const pose = cornerScene(short, 'CORNER_SHORT_ADVANCE', t, start); expect(Math.abs(pose.ball.x - pose.players[a.receiverId].x)).toBeLessThan(.019); expect(pose.ball.y).toBeCloseTo(pose.players[a.receiverId].y) }
    }
  })
  it('Canvas freezes corner progress on pause, retains progress on speed/focus and snaps only when omission is requested', async () => {
    const origin = pending('CORNER_ATTACK'), a = origin.kernel.partial!.play!.corner!, calls = new Map<number, FrameRequestCallback>(); let id = 0
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { calls.set(++id, fn); return id }); vi.stubGlobal('cancelAnimationFrame', (n: number) => calls.delete(n))
    const fake = new Proxy({ measureText: () => ({ width: 30 }) }, { get: (target, key) => key in target ? target[key as keyof typeof target] : () => {}, set: () => true })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fake as never)
    const scene = vi.spyOn(geometry, 'cornerScene'), i18n = await createI18n('en')
    const props = { catalog: origin.kernel.input.catalog, lineups: { local: origin.kernel.input.localLineup, cpu: origin.kernel.input.cpuLineup }, formations: { local: '4-3-3' as const, cpu: '4-3-3' as const }, names: { local: 'Home', cpu: 'Away' }, tick: 1, play: { kind: 'pass' as const, side: 'local' as const, corner: a, step: 'CORNER_DELIVERY' as const }, animate: true, focus: 'cpu' as const, speed: 1 }
    const renderBoard = (patch = {}) => <I18nextProvider i18n={i18n}><TacticalBoard {...props} {...patch} /></I18nextProvider>
    const ui = render(renderBoard()), frame = (time: number) => { const list = [...calls.values()]; calls.clear(); act(() => list.forEach((fn) => fn(time))) }
    frame(0); frame(100); const before = scene.mock.calls.at(-1)![2]
    ui.rerender(renderBoard({ paused: true })); frame(300); expect(scene.mock.calls.at(-1)![2]).toBe(before)
    ui.rerender(renderBoard({ speed: 2, focus: 'full' })); frame(400); frame(500)
    expect(scene.mock.calls.at(-1)![2]).toBeCloseTo(before + 200 / cornerBeatDuration('CORNER_DELIVERY'))
    ui.rerender(renderBoard({ animate: false })); frame(600); expect(scene.mock.calls.at(-1)![2]).toBe(1)
    ui.unmount(); expect(calls.size).toBe(0)
  })
})
