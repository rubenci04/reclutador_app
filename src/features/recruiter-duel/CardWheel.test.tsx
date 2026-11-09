import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { AuctionPage, COIN_TOSS_MS } from './AuctionPage'
import { CardWheel } from './CardWheel'
import { NAME_COLORS, POSITION_COLORS, WHEEL_NAMES, WHEEL_POSITIONS, wheelNames } from './cardWheelModel'
import * as setting from './cardWheelSetting'
import * as draws from './drawHistory'

/** Each stage sets its timer after rendering, so the clock has to move one stage at a time. */
const through = (...stages: number[]) => stages.forEach((ms) => act(() => vi.advanceTimersByTime(ms)))

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
  it('gives every position its own colour and the wheel of names plenty of different ones', () => {
    expect(new Set(WHEEL_POSITIONS.map((code) => POSITION_COLORS[code])).size).toBe(WHEEL_POSITIONS.length)
    expect(new Set(NAME_COLORS).size).toBe(NAME_COLORS.length)
    expect(NAME_COLORS.length).toBeGreaterThanOrEqual(WHEEL_NAMES)
  })
})

describe('CardWheel', () => {
  const player = DRAFT_CATALOG.find((p) => p.position === 'DEF')!
  const wheel = wheelNames(DRAFT_CATALOG, player, 'wheel-ui', 0)
  const view = async (auto = false) => {
    const i18n = await createI18n('en')
    const onDone = vi.fn(); const onDisable = vi.fn()
    render(<I18nextProvider i18n={i18n}><CardWheel player={player} names={wheel.names} nameIndex={wheel.index} spinner="Ana" auto={auto} counter={{ current: 3, total: 22 }} onDone={onDone} onDisable={onDisable} /></I18nextProvider>)
    return { onDone, onDisable }
  }
  it('waits for the person to press the button, then draws the position, then the names, then names the card and finishes', async () => {
    vi.useFakeTimers()
    const { onDone } = await view()
    expect(screen.getByText('Card 3 of 22')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ana, spin the wheel!' })).toBeInTheDocument()
    expect(document.querySelectorAll('.card-wheel-position .card-wheel-label')).toHaveLength(4)
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByRole('heading', { name: 'Ana, spin the wheel!' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'SPIN!' }))
    expect(screen.getByRole('heading', { name: 'Drawing the position…' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'SPIN!' })).toBeNull()
    act(() => vi.advanceTimersByTime(1800))
    expect(screen.getByRole('heading', { name: 'Drawing the player: Defender' })).toBeInTheDocument()
    expect(document.querySelector('.card-wheel-chip')).toHaveTextContent('Defender')
    expect([...document.querySelectorAll('.card-wheel-label')].map((node) => node.textContent)).toEqual(wheel.names.map((candidate) => candidate.name))
    act(() => vi.advanceTimersByTime(2400))
    expect(screen.getByRole('heading', { name: `It is ${player.name}!` })).toBeInTheDocument()
    expect(document.querySelectorAll('.card-wheel-confetti i').length).toBeGreaterThan(0)
    expect(document.querySelector('.card-wheel-result')).toHaveTextContent(`OVR ${player.overall_rating} · base ${player.price} M`)
    expect(onDone).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(2000))
    expect(onDone).toHaveBeenCalledTimes(1)
  })
  it('lets the computer spin by itself, without a button', async () => {
    vi.useFakeTimers()
    const { onDone } = await view(true)
    expect(screen.getByRole('heading', { name: 'Ana spins the wheel…' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'SPIN!' })).toBeNull()
    through(900)
    expect(screen.getByRole('heading', { name: 'Drawing the position…' })).toBeInTheDocument()
    through(1800, 2400, 2000)
    expect(onDone).toHaveBeenCalledTimes(1)
  })
  it('lands the pointer on the stored card: the stopped angle puts its segment at the top', async () => {
    vi.useFakeTimers()
    await view(true)
    through(900, 1800)
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
  async function toTheWheel(seed: string, rival: 'hot' | 'cpu') {
    vi.useFakeTimers()
    vi.mocked(setting.cardWheelEnabled).mockReturnValue(true)
    vi.spyOn(draws, 'newDrawSeed').mockReturnValue(seed)
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} teamName="Ana" /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: rival === 'hot' ? 'Two players on this device' : i18n.t('entry.cpu') }))
    fireEvent.click(screen.getByRole('button', { name: /^Global/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Heads' }))
    act(() => vi.advanceTimersByTime(COIN_TOSS_MS))
    return i18n
  }
  it('local friends: the player who opens the round spins; the board and the bidding wait until the wheel is done', async () => {
    await toTheWheel('wheel-flow', 'hot')
    expect(document.querySelector('.card-wheel')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /, spin the wheel!$/ })).toBeInTheDocument()
    expect(screen.queryByLabelText('Bid amount')).toBeNull()
    expect(document.querySelector('.auction-board')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'SPIN!' }))
    through(1800, 2400, 2000)
    expect(document.querySelector('.card-wheel')).toBeNull()
    expect(screen.getByLabelText('Bid amount')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(5000))
    expect(document.querySelector('.card-wheel')).toBeNull()
  })
  it('against the CPU: the wheel turns by itself on the computer turn and waits for a click on the person turn', async () => {
    await toTheWheel('wheel-cpu', 'cpu')
    const heading = document.querySelector('.card-wheel h2')?.textContent ?? ''
    const cpuOpens = /spins the wheel…$/.test(heading)
    expect(cpuOpens ? heading.startsWith('CPU') : /^Ana, spin the wheel!$/.test(heading)).toBe(true)
    expect(!!screen.queryByRole('button', { name: 'SPIN!' })).toBe(!cpuOpens)
  })
  it('remembers that the wheel was switched off and skips every later card', async () => {
    await toTheWheel('wheel-never', 'hot')
    fireEvent.click(screen.getByRole('button', { name: 'Do not show the wheel again' }))
    expect(setting.setCardWheelEnabled).toHaveBeenCalledWith(false)
    expect(screen.getByLabelText('Bid amount')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }))
    expect(document.querySelector('.card-wheel')).toBeNull()
  })
})
