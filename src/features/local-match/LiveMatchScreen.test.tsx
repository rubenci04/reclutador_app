import { webcrypto } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { audio } from '../audio/audioEngine'
import { FRAME_MS, LiveMatchScreen } from './LiveMatchScreen'
import { liveFrames } from './livePresentation'
import { LiveSeriesScreen } from './LiveSeriesScreen'
import { liveSession } from './interactive/liveFixtures.test-support'
import type { Session } from './interactive'
import * as simulator from './simulator'
import * as interactive from './interactive'
import { must, treeSession } from './interactive/liveFixtures.test-support'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
/** Entries of the commentary revealed so far. */
const entries = () => screen.queryByRole('list', { name: 'Match commentary' })?.children.length ?? 0
const scoreboard = () => screen.getByRole('status', { name: /Home \d+–\d+ Away/ }).getAttribute('aria-label')!
const shownScore = () => { const m = /Home (\d+)–(\d+) Away/.exec(scoreboard())!; return { local: Number(m[1]), cpu: Number(m[2]) } }
const goalsListed = () => screen.queryAllByRole('listitem').filter((item) => item.classList.contains('goal-event')).length
const tick = (ms: number) => { for (let elapsed = 0; elapsed < ms; elapsed += 50) act(() => { vi.advanceTimersByTime(Math.min(50, ms - elapsed)) }) }
function runToEnd(onStep?: (step: number) => void) {
  for (let step = 0; step < 600 && !screen.queryByRole('button', { name: 'Replay match' }); step++) {
    onStep?.(step)
    const confirm = screen.queryByRole('button', { name: 'Confirm decision' })
    if (confirm) fireEvent.click(confirm); else tick(100)
  }
  expect(screen.getByRole('button', { name: 'Replay match' })).toBeInTheDocument()
}
function finish(hot = false) {
  for (let i = 0; i < 30 && !screen.queryByRole('button', { name: 'Replay match' }); i++) {
    const confirm = screen.queryByRole('button', { name: 'Confirm decision' })
    if (confirm) fireEvent.click(confirm)
    else if (hot && screen.queryByRole('button', { name: 'I am Away · continue' })) click('I am Away · continue')
    else click('View next block')
  }
  expect(screen.queryByRole('button', { name: 'View next block' })).not.toBeInTheDocument()
}
async function open(hot = false, language: 'en' | 'es-AR' | 'pt-BR' = 'en') {
  vi.useFakeTimers()
  const i18n = await createI18n(language); const done = vi.fn<(session: Session) => void>(); const home = vi.fn()
  render(<I18nextProvider i18n={i18n}><LiveMatchScreen origin={liveSession()} versusCpu={!hot} difficulty="HARD" names={{ local: 'Home', cpu: 'Away' }} closed={false} onFinished={done} onReturn={home} /></I18nextProvider>)
  return { i18n, done, home }
}

describe('SIM-005 live match controls', () => {
  it.each(['en', 'es-AR', 'pt-BR'] as const)('localizes controls and focuses each decision without stealing select focus: %s', async (lang) => {
    const { i18n } = await open(false, lang)
    expect(screen.getByRole('heading', { name: i18n.t('liveDT.title') })).toBeInTheDocument()
    click(i18n.t('liveDT.nextBlock')); click(i18n.t('liveDT.nextBlock'))
    expect(screen.getByRole('heading', { name: i18n.t('liveDT.turn', { name: 'Home' }) })).toHaveFocus()
    fireEvent.click(screen.getByRole('radio', { name: i18n.t('liveDT.STRATEGY') }))
    const strategy = screen.getByRole('combobox', { name: i18n.t('liveDT.strategy') })
    strategy.focus(); fireEvent.change(strategy, { target: { value: 'LOW_BLOCK' } })
    expect(strategy).toHaveFocus()
  })

  it('pauses, resumes, changes speed, skips motion without skipping decisions and saves a trusted local pause', async () => {
    vi.stubGlobal('crypto', webcrypto)
    const { done } = await open()
    click('Pause'); tick(20_000); expect(entries()).toBe(0); expect(scoreboard()).toContain("Minute 0'")
    click('Resume playback'); fireEvent.change(screen.getByRole('combobox', { name: 'Speed' }), { target: { value: '4' } })
    tick(FRAME_MS / 4); expect(scoreboard()).toContain("Minute 0'") // block confirmed, first moment not yet shown
    tick(FRAME_MS / 4); expect(scoreboard()).toContain("Minute 15'")
    fireEvent.click(screen.getByRole('checkbox', { name: 'Skip animations' }))
    tick(5_000); expect(scoreboard()).toContain('Decision window · 30′')
    const shown = entries(); tick(20_000); expect(entries()).toBe(shown)
    expect(screen.getByRole('button', { name: 'View next block' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Confirm decision' })).toBeInTheDocument()
    const checkpoint = vi.spyOn(interactive, 'checkpointSession'); const restore = vi.spyOn(interactive, 'restoreSession')
    await act(async () => { click('Save local pause'); await checkpoint.mock.results[0].value })
    await act(async () => { click('Restore pause'); await restore.mock.results[0].value })
    expect(entries()).toBe(shown)
    click('Confirm decision')
    expect(screen.getByRole('button', { name: 'Restore pause' })).toBeDisabled()
    finish(); expect(done).toHaveBeenCalledTimes(1)
  })

  it('accepts one manual substitution, guards rapid duplicate commands and replays the registered result', async () => {
    const { done } = await open(); const batch = vi.spyOn(simulator, 'simulateMatch')
    click('View next block'); click('View next block')
    fireEvent.click(screen.getByRole('radio', { name: 'Make a substitution' }))
    expect(screen.getByRole('button', { name: 'Confirm decision' })).toBeDisabled()
    fireEvent.change(screen.getByRole('combobox', { name: 'Coming on' }), { target: { value: 'live_local_11' } })
    const out = screen.getByRole('combobox', { name: 'Going off' })
    fireEvent.change(out, { target: { value: liveSession().kernel.input.localLineup.LB } })
    const button = screen.getByRole('button', { name: 'Confirm decision' })
    act(() => { button.click(); button.click() })
    finish()
    expect(done).toHaveBeenCalledTimes(1)
    const final = done.mock.calls[0][0]
    expect(final.applied).toHaveLength(8); expect(final.entered.local).toEqual(['live_local_11'])
    expect(final.window).toBeNull()
    const record = JSON.parse((screen.getByRole('textbox', { name: 'Versioned record' }) as HTMLTextAreaElement).value)
    expect(record.origin.kernel.blocks).toHaveLength(0); expect(record.result.version).toBe('interactive-result-v1')
    click('Replay match'); act(() => vi.advanceTimersByTime(16_000))
    expect(batch).not.toHaveBeenCalled(); expect(done).toHaveBeenCalledTimes(1)
  })

  it('separates hot-seat decisions, hides the first instruction and requires both confirmations at every window', async () => {
    const { done } = await open(true)
    click('View next block'); click('View next block')
    fireEvent.click(screen.getByRole('radio', { name: 'Change strategy' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Strategy' }), { target: { value: 'LOW_BLOCK' } })
    click('Confirm decision')
    expect(screen.getByRole('heading', { name: 'Hand the device to Away' })).toBeInTheDocument()
    expect(screen.queryByText('Low block')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /^(Keep|Change strategy|Make a substitution)$/ })).not.toBeInTheDocument()
    click('I am Away · continue')
    expect(screen.getByRole('heading', { name: 'Away’s turn' })).toHaveFocus()
    expect(screen.queryByText('Low block')).not.toBeInTheDocument()
    click('Confirm decision'); finish(true)
    expect(done).toHaveBeenCalledTimes(1)
    expect(done.mock.calls[0][0].applied).toHaveLength(8)
    expect(done.mock.calls[0][0].applied[0].order).toEqual({ type: 'STRATEGY', parameters: { strategy: 'LOW_BLOCK' } })
  })

  it('explicitly uses KEEP for all pending windows when simulating the rest and confirms exit', async () => {
    const { done, home } = await open()
    click('Exit match')
    const exit = screen.getByRole('dialog'); expect(within(exit).getByRole('button', { name: 'Stay here' })).toHaveFocus()
    fireEvent.keyDown(exit, { key: 'Escape' }); expect(home).not.toHaveBeenCalled()
    click('Simulate the rest')
    expect(screen.getByRole('dialog')).toHaveTextContent('both teams will keep their strategy and lineup (KEEP), including the CPU')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Simulate the rest' }))
    tick(5_000)
    expect(done).toHaveBeenCalledTimes(1)
    expect(done.mock.calls[0][0].applied.map((d) => d.order.type)).toEqual(Array(8).fill('KEEP'))
    click('Back to home')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Back to home' }))
    expect(home).toHaveBeenCalledTimes(1)
  })
})

describe('SIM-005R-01 audiovisual presentation', () => {
  const soundCount = (play: { mock: { calls: unknown[][] } }, id: string) => play.mock.calls.filter((call) => call[0] === id).length
  const expectedSounds = (session: Session) => {
    const frames = liveFrames(session.kernel.blocks)
    return { goals: frames.filter((f) => f.events.some((e) => e.type === 'goal')).length, shots: frames.filter((f) => !f.events.some((e) => e.type === 'goal') && f.events.some((e) => e.type === 'shot' || e.type === 'save')).length }
  }

  it('whistles at kick-off, half time and full time, with every goal and shot sounding once even when paused or sped up', async () => {
    const play = vi.spyOn(audio, 'play').mockReturnValue(true)
    const { done } = await open()
    expect(soundCount(play, 'kickoffWhistle')).toBe(1)
    fireEvent.change(screen.getByRole('combobox', { name: 'Speed' }), { target: { value: '4' } })
    runToEnd((step) => { if (step % 9 === 0) click('Pause'); if (step % 9 === 4 && screen.queryByRole('button', { name: 'Resume playback' })) click('Resume playback') })
    const expected = expectedSounds(done.mock.calls[0][0])
    expect(expected.goals).toBeGreaterThan(0)
    expect(soundCount(play, 'goal')).toBe(expected.goals); expect(soundCount(play, 'shot')).toBe(expected.shots)
    expect(soundCount(play, 'kickoffWhistle')).toBe(1); expect(soundCount(play, 'halfTimeWhistle')).toBe(1); expect(soundCount(play, 'finalWhistle')).toBe(1)
    tick(30_000); expect(soundCount(play, 'finalWhistle')).toBe(1)
  })

  it('plays each sound once when blocks are jumped manually and none while paused', async () => {
    const play = vi.spyOn(audio, 'play').mockReturnValue(true)
    const { done } = await open()
    click('Pause'); tick(30_000)
    expect(play.mock.calls.map((call) => call[0])).toEqual(['kickoffWhistle'])
    finish()
    const blocksWithGoals = done.mock.calls[0][0].kernel.blocks.filter((block) => block.events.some((e) => e.type === 'goal')).length
    expect(soundCount(play, 'goal')).toBe(blocksWithGoals); expect(soundCount(play, 'halfTimeWhistle')).toBe(1); expect(soundCount(play, 'finalWhistle')).toBe(1)
  })

  it('narrates progressively, keeps the scoreboard in step with the goals shown and records the result only after full time', async () => {
    const { done } = await open()
    fireEvent.change(screen.getByRole('combobox', { name: 'Speed' }), { target: { value: '4' } })
    tick(FRAME_MS / 4); tick(FRAME_MS / 4)
    const block = must(interactive.advanceBlock(liveSession())).kernel.blocks[0]
    expect(entries()).toBeGreaterThan(0); expect(entries()).toBeLessThan(block.events.length)
    runToEnd(() => {
      const score = shownScore(); expect(score.local + score.cpu).toBe(goalsListed())
      if (!screen.queryByRole('button', { name: 'Replay match' })) expect(done).not.toHaveBeenCalled()
    })
    expect(done).toHaveBeenCalledTimes(1)
    const result = interactive.exportResult(done.mock.calls[0][0]); if (!result.ok) throw new Error(result.error)
    expect(shownScore()).toEqual(result.value.result.score)
    expect(screen.getByText('Full time.')).toBeInTheDocument()
  })

  it('draws the tactical board with an accessible description and zone focus', async () => {
    await open()
    expect(screen.getByRole('img', { name: /Tactical board: Home \(left goal\) and Away \(right goal\)/ })).toBeInTheDocument()
    expect(document.querySelector('.tactical-caption')).toHaveTextContent('Waiting for the next move')
    fireEvent.change(screen.getByRole('combobox', { name: 'Speed' }), { target: { value: '4' } })
    tick(FRAME_MS / 4 * 2)
    expect(document.querySelector('.tactical-caption')).toHaveTextContent(/(Home|Away) attacks|Waiting/)
    expect(screen.getByRole('radio', { name: 'Whole pitch' })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: 'Away half' })); expect(screen.getByRole('radio', { name: 'Away half' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Home half' })).not.toBeChecked()
  })

  it('shows a decision that pauses the match, keeps scoreboard and board visible and highlights the chosen option', async () => {
    await open()
    click('View next block'); click('View next block')
    const panel = screen.getByRole('region', { name: 'Home’s turn' })
    expect(within(panel).getByText(/Minute 30′ · Home \d+–\d+ Away/)).toBeInTheDocument()
    expect(scoreboard()).toContain('Decision window · 30′'); expect(screen.getByRole('img', { name: /Tactical board/ })).toBeVisible()
    for (const label of ['Keep', 'Change strategy', 'Make a substitution']) expect(within(panel).getByRole('radio', { name: label })).toBeInTheDocument()
    expect(within(panel).getByRole('radio', { name: 'Keep' })).toBeChecked()
    expect(within(panel).getByRole('status')).toHaveTextContent('You will keep your strategy and lineup.')
    fireEvent.click(within(panel).getByRole('radio', { name: 'Change strategy' }))
    fireEvent.change(within(panel).getByRole('combobox', { name: 'Strategy' }), { target: { value: 'LOW_BLOCK' } })
    expect(within(panel).getByRole('status')).toHaveTextContent('You will switch to Low block.')
    const shown = entries(); tick(60_000); expect(entries()).toBe(shown); expect(scoreboard()).toContain('Decision window · 30′')
    click('Confirm decision'); expect(screen.queryByRole('region', { name: 'Home’s turn' })).not.toBeInTheDocument()
  })

  it('does not skip a pending decision when animations are skipped and honours reduced motion without changing the pace', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), onchange: null, dispatchEvent: vi.fn() }))
    await open()
    expect(document.querySelector('main')).toHaveClass('live-no-motion')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Skip animations' })); tick(10_000)
    expect(screen.getByRole('button', { name: 'Confirm decision' })).toBeInTheDocument(); expect(scoreboard()).toContain('Decision window · 30′')
  })

  it('pauses while the exit dialog is open and resumes afterwards', async () => {
    const { home } = await open()
    click('Exit match'); tick(30_000); expect(entries()).toBe(0)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Stay here' })); tick(FRAME_MS * 2)
    expect(entries()).toBeGreaterThan(0); expect(home).not.toHaveBeenCalled()
  })
})

describe('SIM-005R-02 interactive attack in the live screen', { timeout: 60_000 }, () => {
  const cards = () => screen.queryAllByRole('button').filter((b) => b.classList.contains('play-card'))
  const panel = () => screen.queryByRole('region', { name: 'Attack: your decision' })
  async function openTree(seed = 'tree-ui') {
    vi.useFakeTimers()
    const i18n = await createI18n('en'); const done = vi.fn<(session: Session) => void>()
    render(<I18nextProvider i18n={i18n}><LiveMatchScreen origin={treeSession(seed)} versusCpu difficulty="HARD" names={{ local: 'Home', cpu: 'Away' }} closed={false} onFinished={done} onReturn={vi.fn()} /></I18nextProvider>)
    return { done }
  }
  /** Runs the match choosing the first enabled card at every node; the hook can interfere (pause, speed) between steps. */
  function playAll(hook?: (step: number) => void) {
    for (let step = 0; step < 900 && !screen.queryByRole('button', { name: 'Replay match' }); step++) {
      hook?.(step)
      const open = cards().find((card) => !(card as HTMLButtonElement).disabled)
      const confirm = screen.queryByRole('button', { name: 'Confirm decision' })
      if (open) fireEvent.click(open); else if (confirm) fireEvent.click(confirm); else tick(100)
    }
    expect(screen.getByRole('button', { name: 'Replay match' })).toBeInTheDocument()
  }
  const untilPanel = () => { for (let step = 0; step < 900 && !panel(); step++) { const confirm = screen.queryByRole('button', { name: 'Confirm decision' }); if (confirm) fireEvent.click(confirm); else tick(100) } expect(panel()).toBeInTheDocument() }

  it('stops the match at the first node with named, rated teammates, keeps score and board visible and ignores time', async () => {
    await openTree(); untilPanel()
    const first = panel()!
    expect(within(first).getByRole('heading', { name: 'Where do you want to progress?' })).toHaveFocus()
    expect(cards().map((card) => card.textContent)).toEqual([expect.stringMatching(/ALeft wingReceiver: .+ · \d+/), expect.stringMatching(/BRight wingReceiver: .+ · \d+/)])
    expect(first).toHaveTextContent(/\(\d+\) has the ball/); expect(first).toHaveTextContent(/Marked by .+ · \d+/)
    expect(screen.getByRole('img', { name: /Tactical board/ })).toBeInTheDocument(); expect(scoreboard()).toMatch(/Home \d+–\d+ Away/)
    const shown = entries(); tick(60_000); expect(entries()).toBe(shown); expect(panel()).toBeInTheDocument()
  })

  it('resolves a card once, then offers cross or shot, and a double tap cannot resolve the second node', async () => {
    const { done } = await openTree('tree-ui-two')
    for (let guard = 0; guard < 40; guard++) {
      untilPanel()
      const button = cards()[0] as HTMLButtonElement
      act(() => { button.click(); button.click() })
      tick(1_500)
      if (screen.queryByRole('heading', { name: /The pass found/ })) break
    }
    expect(screen.queryByRole('heading', { name: /The pass found/ })).toBeInTheDocument()
    expect(cards().map((card) => card.querySelector('strong')!.textContent)).toEqual(['Send a cross', 'Go for goal'])
    playAll(); expect(done).toHaveBeenCalledTimes(1)
    const plays = done.mock.calls[0][0].result!.plays!
    expect(new Set(plays.map((p) => p.id)).size).toBe(plays.length)
    expect(plays.filter((p) => p.node === 'FINISH').length).toBeLessThanOrEqual(plays.filter((p) => p.node === 'DIRECTION').length)
  })

  it('shows the narration, score and statistics of every confirmed step and plays pass, interception and goal sounds once', async () => {
    const play = vi.spyOn(audio, 'play').mockReturnValue(true)
    const { done } = await openTree('tree-ui-sound')
    fireEvent.change(screen.getByRole('combobox', { name: 'Speed' }), { target: { value: '4' } })
    playAll((step) => { const score = shownScore(); expect(score.local + score.cpu).toBe(goalsListed()); if (step % 11 === 0) click('Pause'); if (step % 11 === 5 && screen.queryByRole('button', { name: 'Resume playback' })) click('Resume playback') })
    const session = done.mock.calls[0][0]
    const frames = liveFrames(session.kernel.blocks)
    const count = (id: string) => play.mock.calls.filter((call) => call[0] === id).length
    expect(count('pass')).toBe(frames.filter((f) => !f.events.some((e) => e.type === 'goal' || e.type === 'shot' || e.type === 'save') && f.events.some((e) => e.type === 'pass')).length)
    expect(count('intercept')).toBe(frames.filter((f) => !f.events.some((e) => e.type === 'goal' || e.type === 'shot' || e.type === 'save') && !f.events.some((e) => e.type === 'pass') && f.events.some((e) => e.type === 'recovery' && e.step)).length)
    expect(count('goal')).toBe(frames.filter((f) => f.events.some((e) => e.type === 'goal')).length)
    expect(count('pass')).toBeGreaterThan(0)
    expect(count('kickoffWhistle')).toBe(1); expect(count('finalWhistle')).toBe(1)
    expect(screen.getAllByRole('listitem').some((item) => /Pass out|Ball out|whips|wins the ball and starts/.test(item.textContent ?? ''))).toBe(true)
  })

  it('pausing, speeding up or skipping animations never changes the match', async () => {
    const run = async (interfere: boolean) => {
      const { done } = await openTree('tree-ui-pause')
      playAll(interfere ? (step) => { if (step === 3) click('Pause'); if (step === 6) click('Resume playback'); if (step === 8) fireEvent.change(screen.getByRole('combobox', { name: 'Speed' }), { target: { value: '4' } }); if (step === 12) fireEvent.click(screen.getByRole('checkbox', { name: 'Skip animations' })) } : undefined)
      const result = JSON.stringify(done.mock.calls[0][0].result); cleanup(); vi.useRealTimers(); return result
    }
    expect(await run(true)).toBe(await run(false))
  })

  it('simulating the rest resolves pending and future plays with the documented default and finishes once', async () => {
    const { done } = await openTree('tree-ui-rest'); untilPanel()
    click('Simulate the rest')
    expect(screen.getByRole('dialog')).toHaveTextContent('Pending attacking plays are resolved automatically')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Simulate the rest' }))
    tick(20_000)
    expect(done).toHaveBeenCalledTimes(1)
    const final = done.mock.calls[0][0]
    expect(final.result!.plays!.length).toBeGreaterThan(0); expect(final.applied.every((d) => d.order.type === 'KEEP')).toBe(true)
  })

  it('replays the registered match, plays included, without touching the engine', async () => {
    const { done } = await openTree('tree-ui-replay'); const advance = vi.spyOn(interactive, 'advanceBlock'); const submit = vi.spyOn(interactive, 'submitPlay')
    playAll(); const calls = [advance.mock.calls.length, submit.mock.calls.length]
    click('Replay match'); tick(16_000)
    expect([advance.mock.calls.length, submit.mock.calls.length]).toEqual(calls); expect(done).toHaveBeenCalledTimes(1)
    expect(screen.getAllByRole('listitem').some((item) => /Pass out|Ball out|wins the ball and starts/.test(item.textContent ?? ''))).toBe(true)
  })
})

describe('SIM-005 live series', () => {
  it('retains roster and ledger through preparation, resolves every match and records the series once', async () => {
    vi.useFakeTimers(); const i18n = await createI18n('en'); const recorded = vi.fn(); const home = vi.fn()
    const origin = liveSession('series-live')
    render(<I18nextProvider i18n={i18n}><LiveSeriesScreen origin={origin} versusCpu difficulty="HARD" names={{ local: 'Home', cpu: 'Away' }} onSeriesFinished={recorded} onReturn={home} onRematch={vi.fn()} onNewMatch={vi.fn()} /></I18nextProvider>)
    finish()
    expect(recorded).not.toHaveBeenCalled()
    for (let index = 0; index < 2; index++) {
      const prepare = screen.queryByRole('button', { name: 'Prepare next game' })
      if (!prepare) break
      fireEvent.click(prepare)
      fireEvent.click(screen.getByRole('radio', { name: /High press/ })); click('Confirm strategy'); click('Start match')
      expect(entries()).toBe(0); finish()
    }
    expect(recorded).toHaveBeenCalledTimes(1)
    const textareas = screen.getAllByRole('textbox', { name: 'Versioned record' }) as HTMLTextAreaElement[]
    const archive = JSON.parse(textareas.at(-1)!.value)
    expect(archive.matches.length).toBeGreaterThanOrEqual(2)
    for (const match of archive.matches) {
      expect(match.result.decisions).toHaveLength(8)
      expect(match.origin.options.acquisition).toEqual(origin.options.acquisition)
      expect(match.origin.input.localLineup).toEqual(origin.kernel.input.localLineup)
    }
    click('Replay match'); act(() => vi.advanceTimersByTime(16_000))
    expect(recorded).toHaveBeenCalledTimes(1)
  })
})
