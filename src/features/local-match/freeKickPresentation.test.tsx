import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { LiveMatchScreen } from './LiveMatchScreen'
import { audio } from '../audio/audioEngine'
import { pendingFreeKick } from './interactive/freeKickFixtures.test-support'
import { freeKickScene } from './freeKickGeometry'
import { frameSounds, type LiveFrame } from './livePresentation'
import type { MatchEvent, PlayStep } from './matchTypes'
import type { FreeKickEvent } from './interactive/freeKicks'
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const tick = (ms: number) => { for (let n = 0; n < ms; n += 25) act(() => { vi.advanceTimersByTime(Math.min(25, ms - n)) }) }
async function open(node: 'FK_ATTACK' | 'FK_DEFEND' | 'FK_HEADER', language: 'es-AR' | 'en' | 'pt-BR' = 'en', direct = true) {
  vi.useFakeTimers(); const i18n = await createI18n(language), origin = pendingFreeKick(node, direct)
  render(<I18nextProvider i18n={i18n}><LiveMatchScreen origin={origin} versusCpu difficulty="NORMAL" names={{ local: 'Home', cpu: 'Away' }} closed={false} onFinished={() => {}} onReturn={() => {}} /></I18nextProvider>)
  fireEvent.click(screen.getByRole('button', { name: i18n.t('liveDT.nextBlock') }))
  return { origin, i18n }
}
describe('free kick presentation', () => {
  it.each(['es-AR', 'en', 'pt-BR'] as const)('shows compact targets, wall choices, actual taker and focus in %s', async (language) => {
    for (const node of ['FK_ATTACK', 'FK_DEFEND', 'FK_HEADER'] as const) {
      const { origin, i18n } = await open(node, language)
      expect(screen.getByRole('heading', { name: i18n.t(node === 'FK_ATTACK' ? 'freeKick.direct' : node === 'FK_DEFEND' ? 'freeKick.defend' : 'aerial.title') })).toHaveFocus()
      expect(document.querySelectorAll('.play-card')).toHaveLength(node === 'FK_DEFEND' ? 2 : 3)
      const a = origin.kernel.partial!.play!.freeKick!, player = origin.kernel.input.catalog.find((p) => p.id === (node === 'FK_HEADER' ? a.targetId : a.kickerId))!
      expect(document.querySelector('.live-moment')).toHaveTextContent(player.name)
      expect(screen.queryByText(i18n.t('halftime.question'))).not.toBeInTheDocument()
      expect(document.querySelectorAll('.header-target-icon')).toHaveLength(node === 'FK_DEFEND' ? 0 : 3)
      cleanup(); vi.useRealTimers()
    }
  })
  it('offers cross/short or coverage for indirect zones', async () => {
    for (const node of ['FK_ATTACK', 'FK_DEFEND'] as const) {
      await open(node, 'en', false); expect(document.querySelectorAll('.play-card')).toHaveLength(2)
      expect(document.querySelector('.play-card-FK_LEFT')).toBeNull()
      expect(document.querySelector(node === 'FK_ATTACK' ? '.play-card-FK_CROSS' : '.play-card-ZONE')).toBeInTheDocument()
      cleanup(); vi.useRealTimers()
    }
  })
  it('waits indefinitely, accepts one click, pauses/speeds/skips and never repeats the strike', async () => {
    const sounds = vi.spyOn(audio, 'play').mockReturnValue(true), { i18n } = await open('FK_ATTACK')
    const initialShots = sounds.mock.calls.filter(([s]) => s === 'shot').length; tick(5000); expect(sounds.mock.calls.filter(([s]) => s === 'shot')).toHaveLength(initialShots)
    const button = document.querySelector('.play-card-FK_LEFT')!; fireEvent.click(button); fireEvent.click(button)
    tick(100); fireEvent.click(screen.getByRole('button', { name: i18n.t('navigation.pause') })); const before = sounds.mock.calls.length; tick(3000); expect(sounds).toHaveBeenCalledTimes(before)
    fireEvent.change(screen.getByRole('combobox', { name: i18n.t('navigation.speed') }), { target: { value: '4' } }); fireEvent.click(screen.getByRole('button', { name: i18n.t('navigation.resume') })); tick(260); fireEvent.click(screen.getByRole('button', { name: i18n.t('navigation.pause') }))
    const strikes = sounds.mock.calls.filter(([s]) => s === 'shot').length; expect(strikes).toBe(initialShots + 1)
    fireEvent.click(screen.getByRole('checkbox', { name: i18n.t('liveDT.skipAnimations') })); tick(300); expect(sounds.mock.calls.filter(([s]) => s === 'shot')).toHaveLength(strikes)
  })
  it('reduced motion keeps the defensive choice and does not infer a result', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    await open('FK_DEFEND'); tick(4000); expect(document.querySelectorAll('.play-card')).toHaveLength(2)
    expect(document.querySelector('.play-card-WALL_HOLD')).toBeInTheDocument()
  })
  it('maps only genuine contact, execution, block and save sounds', () => {
    const expected = { FK_FOUL: ['foulContact'], FK_RUNUP: [], FK_WALL: [], FK_SHOT: ['shot'], FK_CROSS: ['cross'], FK_HEADER_CONTACT: ['header'], FK_FLIGHT: [], FK_BLOCK: ['wallBlock'], FK_SAVE: ['keeperSave'], FK_GOAL: ['goal'] }
    for (const [step, sounds] of Object.entries(expected)) {
      const e = { minute: 45, side: 'local', type: 'pass', step, freeKick: {} } as MatchEvent
      const f: LiveFrame = { key: step, minute: 45, events: [e], score: { local: 0, cpu: 0 }, lastOfBlock: false }
      expect(frameSounds(f)).toEqual(sounds)
    }
  })
  it('stages a stationary outside-area ball, real wall, bilateral continuity and no early goal', () => {
    const a = pendingFreeKick('FK_ATTACK').kernel.partial!.play!.freeKick!
    let start = freeKickScene(a, 'FK_SETUP', 1)
    expect(start.ball.x).toBeLessThan(.84); expect(a.wallIds.every((id) => start.players[id])).toBe(true)
    const run = freeKickScene(a, 'FK_RUNUP', 1, start); expect(run.ball).toEqual(start.ball); expect(run.players[a.kickerId].x).toBeGreaterThan(start.players[a.kickerId].x)
    for (const step of ['FK_RUNUP', 'FK_WALL', 'FK_SHOT', 'FK_FLIGHT', 'FK_SAVE'] as PlayStep[]) {
      const data: FreeKickEvent = { ...a, wall: 'WALL_JUMP', direction: 'FAR_POST', keeperDirection: 'NEAR_POST', trajectory: 'HIGH' }
      expect(freeKickScene(data, step, 0, start).ball).toEqual(start.ball)
      const end = freeKickScene(data, step, 1, start), mirrored = freeKickScene({ ...data, awardedTo: 'cpu' }, step, 1, { ...start, ball: { x: 1 - start.ball.x, y: 1 - start.ball.y }, players: Object.fromEntries(Object.entries(start.players).map(([id, p]) => [id, { x: 1 - p.x, y: 1 - p.y }])), keeper: { x: 1 - start.keeper.x, y: 1 - start.keeper.y } })
      expect(end.ball.x + mirrored.ball.x).toBeCloseTo(1); if (step === 'FK_FLIGHT') expect(end.ball.x).toBeLessThan(.98)
      if (step === 'FK_SAVE') expect(end.ball).toEqual(end.keeper)
      start = end
    }
  })
})
