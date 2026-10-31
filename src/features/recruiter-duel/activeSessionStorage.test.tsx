import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { AuctionPage, COIN_TOSS_MS } from './AuctionPage'
import { ACTIVE_SESSION_KEY, clearActiveSession, readActiveSession, saveActiveSession, type ActiveSession } from './activeSessionStorage'
import * as engine from './auctionEngine'
import * as drawHistory from './drawHistory'
import { GLOBAL_CURRENT } from '../player-catalog/globalCollection'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { CLASSIC_CONFIG } from './matchConfig'

beforeEach(() => { localStorage.clear(); vi.spyOn(drawHistory, 'newDrawSeed').mockReturnValue('session-007') })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear() })

const stored = () => readActiveSession()
const baseSession = (): ActiveSession => {
  const created = engine.createRecruiterDuel(GLOBAL_CURRENT, 'stored-seed', undefined, CLASSIC_CONFIG)
  if (!created.ok) throw new Error(created.error)
  return { version: 1, localGame: created.game, dual: null, live: false, matchMode: 'live', strategyChoice: null, lineupConfirmed: { seed: '', recruiter_one: false, recruiter_two: false }, opponentMode: 'hotseat', strategy: 'BALANCED', difficulty: 'HARD', pauseMs: 650, mode: 'GLOBAL_CLASSIC', gameMode: 'GLOBAL_CLASSIC', secondCategory: 'same' }
}
async function mount() {
  const i18n = await createI18n('en')
  return render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
}
async function startLocalDuel() {
  const view = await mount()
  fireEvent.click(screen.getByRole('button', { name: 'Two players on this device' }))
  fireEvent.click(screen.getByRole('button', { name: /^Global/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
  return view
}

describe('active session storage', () => {
  it('stores and reads back a session under its versioned key', () => {
    const session = baseSession()
    expect(saveActiveSession(session)).toBe(true)
    expect(Object.keys(localStorage)).toEqual([ACTIVE_SESSION_KEY])
    expect(stored()).toEqual(session)
    clearActiveSession()
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull()
  })
  it.each([
    ['malformed JSON', '{"version":1,'],
    ['another version', JSON.stringify({ ...baseSession(), version: 2 })],
    ['no game at all', JSON.stringify({ ...baseSession(), localGame: null })],
    ['a game without rounds', JSON.stringify({ ...baseSession(), localGame: { ...baseSession().localGame, rounds: [] } })],
    ['an unknown phase', JSON.stringify({ ...baseSession(), localGame: { ...baseSession().localGame, phase: 'HALFTIME' } })],
    ['a game without teams', JSON.stringify({ ...baseSession(), localGame: { ...baseSession().localGame, teams: null } })],
    ['an empty seed', JSON.stringify({ ...baseSession(), localGame: { ...baseSession().localGame, seed: '' } })],
    ['a dual draw without sides', JSON.stringify({ ...baseSession(), localGame: null, dual: { draft: { seed: 'x', config: {}, budget: 100 }, first: 'GLOBAL_CLASSIC', second: 'GLOBAL_CLASSIC', vsCpu: false } })],
    ['an unknown category', JSON.stringify({ ...baseSession(), mode: 'NOWHERE' })],
    ['a pause out of range', JSON.stringify({ ...baseSession(), pauseMs: 99999 })],
  ])('discards %s and removes it', (_label, raw) => {
    localStorage.setItem(ACTIVE_SESSION_KEY, raw)
    expect(stored()).toBeNull()
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull()
  })
  it('accepts a dual draw in progress', () => {
    const dual = { draft: { seed: 'dual-seed', config: CLASSIC_CONFIG, budget: 100, sides: { recruiter_one: { category: 'GLOBAL_CLASSIC', deck: ['a'], cursor: 0, signed: [], discards: 0, events: [] }, recruiter_two: { category: 'GLOBAL_CLASSIC', deck: ['b'], cursor: 0, signed: [], discards: 0, events: [] } } }, first: 'GLOBAL_CLASSIC', second: 'GLOBAL_CLASSIC', vsCpu: true } as const
    saveActiveSession({ ...baseSession(), localGame: null, dual } as unknown as ActiveSession)
    expect(stored()?.dual?.draft.seed).toBe('dual-seed')
  })
  it('survives blocked storage without throwing', () => {
    const blocked = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') }, removeItem: () => { throw new Error('denied') } }
    expect(saveActiveSession(baseSession(), blocked)).toBe(false)
    expect(readActiveSession(blocked)).toBeNull()
    expect(() => clearActiveSession(blocked)).not.toThrow()
  })
  it('ignores corrupt data on mount and shows the start screen', async () => {
    localStorage.setItem(ACTIVE_SESSION_KEY, '{"version":1,"localGame":{"seed":42}}')
    await mount()
    expect(screen.getByRole('button', { name: 'Two players on this device' })).toBeInTheDocument()
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull()
  })
})

describe('reload of a local game', () => {
  it('resumes the auction in BIDDING with the same card after a reload', async () => {
    vi.useFakeTimers()
    const first = await startLocalDuel()
    fireEvent.click(screen.getByRole('button', { name: 'Heads' }))
    act(() => vi.advanceTimersByTime(COIN_TOSS_MS))
    const before = stored()
    expect(before?.localGame?.phase).toBe('BIDDING')
    const card = document.querySelector('.auction-candidate')?.textContent
    first.unmount()
    await mount()
    expect(screen.getByLabelText('Bid amount')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start duel' })).toBeNull()
    expect(document.querySelector('.auction-candidate')?.textContent).toBe(card)
    expect(stored()?.localGame).toEqual(before?.localGame)
  })
  it('resumes the locker room in TEAMS_COMPLETED keeping the confirmed eleven', async () => {
    const created = engine.createRecruiterDuel(GLOBAL_CURRENT, 'locker-session', undefined, CLASSIC_CONFIG)
    if (!created.ok) throw new Error(created.error)
    const one = generateCpuTeam(GLOBAL_CURRENT, 'session-one').team.lineup
    const used = new Set(Object.values(one))
    const two = generateCpuTeam(GLOBAL_CURRENT.filter((player) => !used.has(player.id)), 'session-two').team.lineup
    vi.spyOn(engine, 'createRecruiterDuel').mockReturnValue({ ok: true, game: { ...created.game, phase: 'TEAMS_COMPLETED', teams: { recruiter_one: { lineup: one, spent: 60 }, recruiter_two: { lineup: two, spent: 60 } } } })
    const first = await startLocalDuel()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm eleven' }))
    expect(stored()?.lineupConfirmed).toMatchObject({ seed: 'locker-session', recruiter_one: true, recruiter_two: false })
    first.unmount()
    await mount()
    expect(stored()?.localGame?.phase).toBe('TEAMS_COMPLETED')
    // Only the second recruiter is left to confirm: the first confirmation came back with the game.
    fireEvent.click(screen.getByRole('button', { name: 'Confirm eleven' }))
    expect(screen.getByRole('button', { name: 'Confirm strategy' })).toBeInTheDocument()
  })
  it('restarts an interrupted directed match at kick-off with the stored elevens and tactics', async () => {
    const created = engine.createRecruiterDuel(GLOBAL_CURRENT, 'live-session', undefined, CLASSIC_CONFIG)
    if (!created.ok) throw new Error(created.error)
    const one = generateCpuTeam(GLOBAL_CURRENT, 'live-one').team.lineup
    const used = new Set(Object.values(one))
    const two = generateCpuTeam(GLOBAL_CURRENT.filter((player) => !used.has(player.id)), 'live-two').team.lineup
    const game = { ...created.game, phase: 'TEAMS_COMPLETED' as const, manualBench: true, teams: { recruiter_one: { lineup: one, spent: 60 }, recruiter_two: { lineup: two, spent: 60 } } }
    saveActiveSession({ ...baseSession(), localGame: game, live: true, opponentMode: 'cpu', strategyChoice: { seed: 'live-session', choice: { step: 'REVEALED', first: 'HIGH_PRESS', second: 'LOW_BLOCK', secondIsCpu: true } } })
    await mount()
    expect(document.querySelector('.fm-series')).toBeInTheDocument()
    expect(stored()?.live).toBe(true)
  })
  it('clears the stored game when going back home', async () => {
    vi.useFakeTimers()
    await startLocalDuel()
    expect(stored()).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Back to home' }).at(-1)!)
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull()
    expect(screen.getByRole('button', { name: 'Two players on this device' })).toBeInTheDocument()
  })
  it('never reads or writes the session for an online room', async () => {
    saveActiveSession(baseSession())
    const i18n = await createI18n('en')
    const online = { game: baseSession().localGame!, mySide: 'recruiter_one', connection: 'connected', submit: vi.fn(), exit: vi.fn(), forfeit: vi.fn(), flipCoin: vi.fn() }
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY)
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} online={online as unknown as Parameters<typeof AuctionPage>[0]['online']} /></I18nextProvider>)
    expect(localStorage.getItem(ACTIVE_SESSION_KEY)).toBe(raw)
  })
})
