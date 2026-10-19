import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { generateCpuTeam } from './cpuTeam'
import { MatchScreen } from './MatchScreen'
import { MATCH_RULES_VERSION } from './matchTypes'
import { simulateMatch } from './simulator'

afterEach(() => vi.useRealTimers())

describe('match playback', () => {
  it('reveals action-v2 one opportunity at a time, with live stats and the same replay', async () => {
    vi.useFakeTimers()
    const result = simulateMatch({ localLineup: generateCpuTeam(DRAFT_CATALOG, 'v2-screen-local').team.lineup, cpuLineup: generateCpuTeam(DRAFT_CATALOG, 'v2-screen-cpu').team.lineup, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: 'v2-screen', actionModel: 'action-v2' })
    const i18n = await createI18n('en'); const finished = vi.fn()
    const view = render(<I18nextProvider i18n={i18n}><MatchScreen result={result} onFinished={finished} onReturn={vi.fn()} onRematch={vi.fn()} /></I18nextProvider>)
    expect(screen.getByText('Engine: action-v2')).toBeInTheDocument()
    const stats = view.container.querySelector('.match-stats')!
    expect(stats.querySelector('div')?.textContent).toBe('0Shots0')
    act(() => vi.advanceTimersByTime(625))
    expect(view.container.querySelectorAll('.match-narration li').length).toBeGreaterThanOrEqual(2)
    expect(view.container.querySelectorAll('.match-narration li').length).toBeLessThan(5)
    expect(finished).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(14375))
    expect(finished).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Full time')).toBeInTheDocument()
    expect(stats.querySelector('div')?.textContent).toBe(`${result.stats.local.shots}Shots${result.stats.cpu.shots}`)
    fireEvent.click(screen.getByRole('button', { name: 'Replay match' }))
    expect(stats.querySelector('div')?.textContent).toBe('0Shots0')
    act(() => vi.advanceTimersByTime(15000))
    expect(screen.getByText(new RegExp(`${result.score.local}–${result.score.cpu}`))).toBeInTheDocument()
  })
  it('finishes six timed blocks and replays a calculated result without invoking a rematch', async () => {
    vi.useFakeTimers()
    const local = generateCpuTeam(DRAFT_CATALOG, 'screen-local')
    const cpu = generateCpuTeam(DRAFT_CATALOG, 'screen-cpu')
    const result = simulateMatch({ localLineup: local.team.lineup, cpuLineup: cpu.team.lineup, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: 'screen-result' })
    const rematch = vi.fn(); const back = vi.fn(); const finished = vi.fn(); const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><MatchScreen result={result} onRematch={rematch} onReturn={back} onFinished={finished} /></I18nextProvider>)
    expect(screen.getByText(`Global power: ${result.strengths.local.global}`)).toBeInTheDocument()
    const goalIndex = result.blocks.findIndex((block) => block.events.some((event) => event.type === 'goal'))
    expect(goalIndex).toBeGreaterThanOrEqual(0)
    if (goalIndex >= 0) {
      act(() => vi.advanceTimersByTime((goalIndex + 1) * 2500))
      expect(screen.getByText(/Goal for /)).toHaveClass('goal-flash')
    }
    act(() => vi.advanceTimersByTime(15_000))
    expect(screen.getByText('Full time')).toBeInTheDocument()
    expect(finished).toHaveBeenCalledTimes(1)
    expect(screen.getByText(new RegExp(`${result.score.local}–${result.score.cpu}`))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Replay match' }))
    act(() => vi.advanceTimersByTime(15_000))
    expect(rematch).not.toHaveBeenCalled()
    expect(screen.getByText(new RegExp(`${result.score.local}–${result.score.cpu}`))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Rematch' }))
    expect(rematch).toHaveBeenCalledTimes(1)
  })
})

describe('tactical summary', () => {
  const build = (tactics?: { local: 'NEUTRAL' | 'HIGH_PRESS'; cpu: 'NEUTRAL' | 'LOW_BLOCK' }) => {
    const local = generateCpuTeam(DRAFT_CATALOG, 'summary-local').team.lineup; const cpu = generateCpuTeam(DRAFT_CATALOG, 'summary-cpu').team.lineup
    return simulateMatch({ localLineup: local, cpuLineup: cpu, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: 'summary', ...(tactics ? { tactics: { version: 'tactics-v1' as const, ...tactics } } : {}) })
  }
  const finish = async (result: ReturnType<typeof build>) => {
    vi.useFakeTimers()
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><MatchScreen result={result} onRematch={vi.fn()} onReturn={vi.fn()} /></I18nextProvider>)
    act(() => vi.advanceTimersByTime(15_000))
  }
  it('names both strategies and shows the stored average adjustments after full time', async () => {
    const result = build({ local: 'HIGH_PRESS', cpu: 'LOW_BLOCK' })
    await finish(result)
    const region = screen.getByRole('region', { name: 'Match tactics' })
    expect(region).toHaveTextContent('High press'); expect(region).toHaveTextContent('Low block')
    expect(region).toHaveTextContent(`Defensive power ${result.tactics!.adjustments.cpu.defense > 0 ? '+' : '−'}${Math.abs(result.tactics!.adjustments.cpu.defense).toFixed(1)}`)
    expect(region).toHaveTextContent(/does not guarantee a win/)
  })
  it('says no adjustments for NEUTRAL', async () => {
    await finish(build({ local: 'NEUTRAL', cpu: 'NEUTRAL' }))
    expect(screen.getAllByText('No tactical adjustments.')).toHaveLength(2)
  })
  it('renders nothing for results stored before tactics existed', async () => {
    const { tactics: _omit, ...legacy } = build()
    void _omit
    await finish(legacy as ReturnType<typeof build>)
    expect(screen.queryByRole('region', { name: 'Match tactics' })).not.toBeInTheDocument()
  })
})
