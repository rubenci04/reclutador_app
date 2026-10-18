import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { StrategyChoicePanel } from '../recruiter-duel/StrategyChoicePanel'
import { selectCpuStrategy } from './cpuStrategy'
import { STRATEGY_IDS } from './strategies'
import { acknowledgeHandover, confirmStrategy, revealedStrategies, startStrategyChoice, type StrategyChoice } from './strategyChoice'

const ok = (result: ReturnType<typeof confirmStrategy>) => { if (!result.ok) throw new Error(result.error); return result.choice }

describe('strategy choice state machine', () => {
  it('walks first pick, handover, second pick, reveal and reveals nothing before the end', () => {
    let choice = startStrategyChoice()
    expect(choice.step).toBe('FIRST'); expect(revealedStrategies(choice)).toBeNull()
    choice = ok(confirmStrategy(choice, 'HIGH_PRESS'))
    expect(choice.step).toBe('HANDOVER'); expect(revealedStrategies(choice)).toBeNull()
    expect(confirmStrategy(choice, 'LOW_BLOCK')).toEqual({ ok: false, error: 'invalid_step' })
    const handed = acknowledgeHandover(choice); if (!handed.ok) throw new Error('handover')
    expect(handed.choice.step).toBe('SECOND'); expect(revealedStrategies(handed.choice)).toBeNull()
    expect(acknowledgeHandover(handed.choice)).toEqual({ ok: false, error: 'invalid_step' })
    const done = ok(confirmStrategy(handed.choice, 'LOW_BLOCK'))
    expect(revealedStrategies(done)).toEqual({ first: 'HIGH_PRESS', second: 'LOW_BLOCK' })
  })
  it('accepts each of the six strategies and rejects anything else, with no double confirmation', () => {
    for (const id of STRATEGY_IDS) expect(ok(confirmStrategy(startStrategyChoice(), id)).first).toBe(id)
    for (const bad of ['TIKI_TAKA', '', null, undefined, 3]) expect(confirmStrategy(startStrategyChoice(), bad)).toEqual({ ok: false, error: 'invalid_strategy' })
    const revealed = ok(confirmStrategy(startStrategyChoice('LOW_BLOCK'), 'WIDE_PLAY'))
    expect(confirmStrategy(revealed, 'NEUTRAL')).toEqual({ ok: false, error: 'invalid_step' })
    expect(revealed.first).toBe('WIDE_PLAY')
  })
  it('CPU mode: the CPU pick exists before the human confirms, stays hidden, and is never changed by the human pick', () => {
    const lineup = generateCpuTeam(DRAFT_CATALOG, 'choice-cpu').team.lineup
    const cpu = selectCpuStrategy(lineup, DRAFT_CATALOG, 'game-seed')
    const before = startStrategyChoice(cpu)
    expect(before.second).toBe(cpu); expect(revealedStrategies(before)).toBeNull()
    for (const human of STRATEGY_IDS) {
      const done = ok(confirmStrategy(before, human))
      expect(done.step).toBe('REVEALED'); expect(done.second).toBe(cpu)
      expect(selectCpuStrategy(lineup, DRAFT_CATALOG, 'game-seed')).toBe(cpu)
    }
    // Reproducible: the same eleven and seed give the same CPU choice.
    expect(selectCpuStrategy(lineup, DRAFT_CATALOG, 'game-seed')).toBe(cpu)
  })
})

describe('StrategyChoicePanel', () => {
  const names = { first: 'Ana', second: 'Beto' }
  const mount = async (choice: StrategyChoice, handlers = { onConfirm: vi.fn(), onHandover: vi.fn(), onStart: vi.fn() }) => {
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><StrategyChoicePanel choice={choice} chooser="Ana" nextChooser="Beto" names={names} {...handlers} /></I18nextProvider>)
    return handlers
  }
  it('shows six cards each with aim, advantage and risk, and confirms only after selecting', async () => {
    const handlers = await mount(startStrategyChoice())
    expect(screen.getAllByRole('radio')).toHaveLength(6)
    expect(screen.getAllByText('Aims to:')).toHaveLength(6); expect(screen.getAllByText('Advantage:')).toHaveLength(6); expect(screen.getAllByText('Risk:')).toHaveLength(6)
    expect(screen.getByText(/No strategy guarantees a win/)).toBeInTheDocument()
    const confirm = screen.getByRole('button', { name: 'Confirm strategy' })
    expect(confirm).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: /Counter-attack/ }))
    fireEvent.click(confirm)
    expect(handlers.onConfirm).toHaveBeenCalledExactlyOnceWith('COUNTER_ATTACK')
  })
  it('handover and reveal screens show no pick before both confirmed', async () => {
    const handover = ok(confirmStrategy(startStrategyChoice(), 'HIGH_PRESS'))
    const handlers = await mount(handover)
    expect(screen.getByRole('heading', { name: 'Hand the device to Beto' })).toBeInTheDocument()
    expect(screen.queryByText('High press')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /I am Beto/ }))
    expect(handlers.onHandover).toHaveBeenCalledTimes(1)
  })
  it('reveals both strategies together and starts the match once', async () => {
    const revealed = ok(confirmStrategy(startStrategyChoice('LOW_BLOCK'), 'HIGH_PRESS'))
    const handlers = await mount(revealed)
    expect(screen.getByText('High press')).toBeInTheDocument(); expect(screen.getByText('Low block')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start match' }))
    expect(handlers.onStart).toHaveBeenCalledTimes(1)
  })
})
