import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { AuctionPage, COIN_TOSS_MS } from './AuctionPage'
import { CardWheel } from './CardWheel'
import { WHEEL_NAMES, wheelNames } from './cardWheelModel'
import * as setting from './cardWheelSetting'
import * as engine from './auctionEngine'
import * as draws from './drawHistory'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); vi.mocked(setting.cardWheelEnabled).mockReturnValue(false) })

describe('card wheel model', () => {
  const player = DRAFT_CATALOG.find((p) => p.position === 'MED')!
  it('lists the real card among other players of its position, with distinct names and a stable order', () => {
    const wheel = wheelNames(DRAFT_CATALOG, player, 'seed-a', 3)
    expect(wheel.names).toHaveLength(WHEEL_NAMES)
    expect(wheel.names[wheel.index]).toBe(player)
    expect(wheel.names.every((candidate) => candidate.position === player.position)).toBe(true)
    expect(new Set(wheel.names.map((candidate) => candidate.name)).size).toBe(WHEEL_NAMES)
    expect(wheelNames(DRAFT_CATALOG, player, 'seed-a', 3)).toEqual(wheel)
    expect(wheelNames(DRAFT_CATALOG, player, 'seed-a', 4).names).not.toEqual(wheel.names)
  })
  it('keeps the real card even with a tiny pool', () => {
    const wheel = wheelNames([player], player, 'tiny', 0)
    expect(wheel.names).toEqual([player])
    expect(wheel.index).toBe(0)
  })
})

describe('CardWheel', () => {
  const player = DRAFT_CATALOG.find((p) => p.position === 'DEF')!
  const wheel = wheelNames(DRAFT_CATALOG, player, 'wheel-ui', 0)
  const view = async () => {
    const i18n = await createI18n('en')
    const onDone = vi.fn(); const onDisable = vi.fn()
    render(<I18nextProvider i18n={i18n}><CardWheel player={player} names={wheel.names} nameIndex={wheel.index} onDone={onDone} onDisable={onDisable} /></I18nextProvider>)
    return { onDone, onDisable }
  }
  it('draws the position first, then the names of that position, then names the card and finishes', async () => {
    vi.useFakeTimers()
    const { onDone } = await view()
    expect(screen.getByRole('heading', { name: 'Drawing the position…' })).toBeInTheDocument()
    expect(document.querySelectorAll('.card-wheel-position .card-wheel-label')).toHaveLength(4)
    act(() => vi.advanceTimersByTime(1700))
    expect(screen.getByRole('heading', { name: 'Drawing the player: Defender' })).toBeInTheDocument()
    expect([...document.querySelectorAll('.card-wheel-label')].map((node) => node.textContent)).toEqual(wheel.names.map((candidate) => candidate.name))
    act(() => vi.advanceTimersByTime(2300))
    expect(screen.getByRole('heading', { name: `It is ${player.name}!` })).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(900))
    expect(onDone).toHaveBeenCalledTimes(1)
  })
  it('lands the pointer on the stored card: the stopped angle puts its segment at the top', async () => {
    vi.useFakeTimers()
    await view()
    act(() => vi.advanceTimersByTime(1700))
    const size = 360 / wheel.names.length
    const end = Number.parseFloat((document.querySelector('.card-wheel-names') as HTMLElement).style.getPropertyValue('--wheel-end'))
    const atTop = ((-end % 360) + 360) % 360
    expect(Math.floor(atTop / size)).toBe(wheel.index)
  })
  it('can be skipped or switched off', async () => {
    const first = await view()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(first.onDone).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Do not show the wheel again' }))
    expect(first.onDisable).toHaveBeenCalledTimes(1)
  })
  it('goes straight through with reduced motion', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    const { onDone } = await view()
    act(() => vi.advanceTimersByTime(10))
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})

describe('card wheel in the auction', () => {
  async function toTheWheel(seed: string) {
    vi.useFakeTimers()
    vi.mocked(setting.cardWheelEnabled).mockReturnValue(true)
    vi.spyOn(draws, 'newDrawSeed').mockReturnValue(seed)
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Two players on this device' }))
    fireEvent.click(screen.getByRole('button', { name: /^Global/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Heads' }))
    act(() => vi.advanceTimersByTime(COIN_TOSS_MS))
  }
  it('holds the board behind the wheel, then opens the bidding and does not repeat it for the same card', async () => {
    const pass = vi.spyOn(engine, 'passAuction')
    await toTheWheel('wheel-flow')
    expect(document.querySelector('.card-wheel')).toBeInTheDocument()
    expect(screen.queryByLabelText('Bid amount')).toBeNull()
    expect(document.querySelector('.auction-board')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(document.querySelector('.card-wheel')).toBeNull()
    expect(screen.getByLabelText('Bid amount')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(5000))
    expect(document.querySelector('.card-wheel')).toBeNull()
    expect(pass).not.toHaveBeenCalled()
  })
  it('remembers that the wheel was switched off and skips every later card', async () => {
    await toTheWheel('wheel-never')
    fireEvent.click(screen.getByRole('button', { name: 'Do not show the wheel again' }))
    expect(setting.setCardWheelEnabled).toHaveBeenCalledWith(false)
    expect(screen.getByLabelText('Bid amount')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }))
    expect(document.querySelector('.card-wheel')).toBeNull()
  })
})
