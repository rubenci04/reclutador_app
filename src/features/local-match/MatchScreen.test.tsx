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
  it('finishes six timed blocks and replays a calculated result without invoking a rematch', async () => {
    vi.useFakeTimers()
    const local = generateCpuTeam(DRAFT_CATALOG, 'screen-local')
    const cpu = generateCpuTeam(DRAFT_CATALOG, 'screen-cpu')
    const result = simulateMatch({ localLineup: local.team.lineup, cpuLineup: cpu.team.lineup, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: 'screen-result' })
    const rematch = vi.fn(); const back = vi.fn(); const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><MatchScreen result={result} onRematch={rematch} onReturn={back} /></I18nextProvider>)
    act(() => vi.advanceTimersByTime(15_000))
    expect(screen.getByText('Full time')).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`${result.score.local}–${result.score.cpu}`))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Replay match' }))
    act(() => vi.advanceTimersByTime(15_000))
    expect(rematch).not.toHaveBeenCalled()
    expect(screen.getByText(new RegExp(`${result.score.local}–${result.score.cpu}`))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Rematch' }))
    expect(rematch).toHaveBeenCalledTimes(1)
  })
})
