import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { audio } from '../audio/audioEngine'
import { DRAFT_CATALOG } from '../draft/catalog'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { createSeededRandom } from '../local-match/seededRandom'
import { MatchScreen } from '../local-match/MatchScreen'
import { MATCH_RULES_VERSION } from '../local-match/matchTypes'
import { simulateMatch } from '../local-match/simulator'
import { AuctionPage, COIN_TOSS_MS } from './AuctionPage'
import * as drawHistory from './drawHistory'
import { FootballCoin } from './FootballCoin'
import { soundForRecord } from './useAuctionSounds'

const storedResult = (seed: string) => createSeededRandom(`${seed}:coin`)() < .5 ? 'heads' : 'tails'
let play: MockInstance<typeof audio.play>
beforeEach(() => { localStorage.clear(); vi.spyOn(drawHistory, 'newDrawSeed').mockReturnValue('coin-seed-1'); play = vi.spyOn(audio, 'play').mockReturnValue(false) })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear() })

describe('football coin', () => {
  it('draws a football for heads and a stadium for tails, and shows the stored side', async () => {
    const i18n = await createI18n('en')
    const view = render(<I18nextProvider i18n={i18n}><FootballCoin side="tails" /></I18nextProvider>)
    expect(view.container.querySelector('.coin-front .ball-patch')).not.toBeNull()
    expect(view.container.querySelector('.coin-front .stadium-pitch')).toBeNull()
    expect(view.container.querySelector('.coin-back .stadium-pitch')).not.toBeNull()
    expect(view.container.querySelector('.coin-back .ball-patch')).toBeNull()
    expect(view.container.querySelector('.football-coin')).toHaveAttribute('data-side', 'tails')
    expect(screen.getByRole('img', { name: 'Coin: Tails' })).toHaveTextContent('Tails · Stadium')
    view.rerender(<I18nextProvider i18n={i18n}><FootballCoin side="heads" /></I18nextProvider>)
    expect(screen.getByRole('img', { name: 'Coin: Heads' })).toHaveTextContent('Heads · Ball')
  })
  it.each(['es-AR', 'pt-BR'] as const)('names the faces in %s', async (language) => {
    const i18n = await createI18n(language)
    render(<I18nextProvider i18n={i18n}><FootballCoin side="tails" /></I18nextProvider>)
    expect(screen.getByRole('img').textContent).toMatch(language === 'es-AR' ? /Estadio/ : /Estádio/)
  })
})

describe('coin flow in the duel', () => {
  const start = async () => {
    vi.useFakeTimers()
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.local') }))
    fireEvent.click(screen.getByText(i18n.t('entry.customize')))
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
  }
  it('shows both faces before choosing, then lands on exactly the stored side', async () => {
    await start()
    expect(document.querySelectorAll('.coin-face-choice .coin-art-heads')).toHaveLength(1)
    expect(document.querySelectorAll('.coin-face-choice .coin-art-tails')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Heads' })).toHaveTextContent('Ball'); expect(screen.getByRole('button', { name: 'Tails' })).toHaveTextContent('Stadium')
    const expected = storedResult('coin-seed-1')
    fireEvent.click(screen.getByRole('button', { name: 'Tails' }))
    const tossing = document.querySelector('.football-coin.tossing')!
    expect(tossing).toHaveAttribute('data-side', expected)
    act(() => vi.advanceTimersByTime(COIN_TOSS_MS - 1))
    expect(document.querySelector('.football-coin.tossing')).not.toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('img', { name: `Coin: ${expected === 'heads' ? 'Heads' : 'Tails'}` })).toBeInTheDocument()
    expect(document.querySelector('.football-coin')).toHaveAttribute('data-side', expected)
    expect(screen.getByText(/starts recruiting/)).toBeInTheDocument()
  })
  it('lets the animation be skipped without changing the result, and ignores a second click', async () => {
    await start()
    const expected = storedResult('coin-seed-1')
    const heads = screen.getByRole('button', { name: 'Heads' })
    act(() => { heads.click(); heads.click() })
    fireEvent.click(screen.getByRole('button', { name: 'Skip animation' }))
    expect(document.querySelector('.football-coin')).toHaveAttribute('data-side', expected)
    expect(document.querySelector('.football-coin.tossing')).toBeNull()
    act(() => vi.advanceTimersByTime(COIN_TOSS_MS * 2))
    expect(document.querySelector('.football-coin')).toHaveAttribute('data-side', expected)
    expect(play.mock.calls.filter(([id]) => id === 'coinToss')).toHaveLength(1)
  })
  it('with reduced motion goes straight to the stored face', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    await start()
    fireEvent.click(screen.getByRole('button', { name: 'Heads' }))
    act(() => vi.advanceTimersByTime(1300))
    expect(document.querySelector('.football-coin')).toHaveAttribute('data-side', storedResult('coin-seed-1'))
    expect(document.querySelector('.football-coin.tossing')).toBeNull()
  })
})

describe('auction sounds', () => {
  it('plays each event once, from new records, and not again when the screen re-renders', async () => {
    vi.useFakeTimers()
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: i18n.t('entry.local') }))
    fireEvent.click(screen.getByText(i18n.t('entry.customize')))
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    expect(play).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Heads' }))
    expect(play.mock.calls.map(([id]) => id)).toEqual(['coinToss'])
    act(() => vi.advanceTimersByTime(COIN_TOSS_MS))
    expect(play.mock.calls.map(([id]) => id)).toEqual(['coinToss', 'diceRoll', 'coinLand'])
    fireEvent.click(screen.getByRole('button', { name: 'Start auction' }))
    const minimum = (screen.getByLabelText('Bid amount') as HTMLInputElement).min
    fireEvent.change(screen.getByLabelText('Bid amount'), { target: { value: minimum } })
    expect(play).toHaveBeenCalledTimes(3)
    fireEvent.click(screen.getByRole('button', { name: 'Bid' }))
    expect(play.mock.calls.map(([id]) => id)).toEqual(['coinToss', 'diceRoll', 'coinLand', 'bid'])
    fireEvent.change(screen.getByLabelText('Bid amount'), { target: { value: String(Number(minimum) + 1) } })
    act(() => vi.advanceTimersByTime(5000))
    expect(play).toHaveBeenCalledTimes(4)
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }))
    expect(play.mock.calls.map(([id]) => id)).toEqual(['coinToss', 'diceRoll', 'coinLand', 'bid', 'signing'])
    expect(screen.getByText('YOU WON THE AUCTION!')).toBeInTheDocument()
    expect(screen.getByText(/signs .* for \d+M\./, { selector: '.win-summary' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(5000))
    expect(play).toHaveBeenCalledTimes(5)
  })
  it('keeps the plain award sound for mandatory awards and the signing cue for auction wins', () => {
    const award = (reason: 'voluntary_bid' | 'forced_viability' | 'auto_complete') => ({ type: 'award' as const, round: 0, winner: 'recruiter_one' as const, playerId: 'plr_001', price: 5, reason })
    expect(soundForRecord(award('voluntary_bid'))).toBe('signing')
    expect(soundForRecord(award('forced_viability'))).toBe('award')
    expect(soundForRecord(award('auto_complete'))).toBe('award')
  })
})

describe('match sounds', () => {
  const build = () => {
    for (let index = 0; index < 60; index++) {
      const local = generateCpuTeam(DRAFT_CATALOG, `snd-a-${index}`).team.lineup; const cpu = generateCpuTeam(DRAFT_CATALOG, `snd-b-${index}`).team.lineup
      const result = simulateMatch({ localLineup: local, cpuLineup: cpu, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: `snd-${index}` })
      if (result.score.local + result.score.cpu >= 1) return result
    }
    throw new Error('no match with goals found')
  }
  it('plays goals only for blocks already shown, one final whistle, and repeats them on replay', async () => {
    vi.useFakeTimers()
    const result = build(); const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><MatchScreen result={result} onRematch={vi.fn()} onReturn={vi.fn()} /></I18nextProvider>)
    expect(play).not.toHaveBeenCalled()
    const goalsIn = (blocks: number) => result.blocks.slice(0, blocks).flatMap((block) => block.events).filter((event) => event.type === 'goal').length
    for (let block = 1; block <= 6; block++) {
      act(() => vi.advanceTimersByTime(2500))
      expect(play.mock.calls.filter(([id]) => id === 'goal')).toHaveLength(goalsIn(block))
      expect(play.mock.calls.filter(([id]) => id === 'finalWhistle')).toHaveLength(block === 6 ? 1 : 0)
    }
    act(() => vi.advanceTimersByTime(10_000))
    expect(play.mock.calls.filter(([id]) => id === 'finalWhistle')).toHaveLength(1)
    const total = goalsIn(6)
    fireEvent.click(screen.getByRole('button', { name: 'Replay match' }))
    expect(play.mock.calls.filter(([id]) => id === 'goal')).toHaveLength(total)
    act(() => vi.advanceTimersByTime(15_000))
    expect(play.mock.calls.filter(([id]) => id === 'goal')).toHaveLength(total * 2)
    expect(play.mock.calls.filter(([id]) => id === 'finalWhistle')).toHaveLength(2)
  })
})
