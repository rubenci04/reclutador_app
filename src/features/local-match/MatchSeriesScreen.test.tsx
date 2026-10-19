import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { generateCpuTeam } from './cpuTeam'
import { simulateMatch } from './simulator'
import { MATCH_RULES_VERSION } from './matchTypes'
import { MatchSeriesScreen } from './MatchSeriesScreen'
import * as series from './matchSeries'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
describe('series playback', () => {
  it('offers same-squad matches, two extra games and one penalty winner; replay never records twice', async () => {
    vi.useFakeTimers()
    const first = simulateMatch({ localLineup: generateCpuTeam(DRAFT_CATALOG, 'series-dom-1').team.lineup, cpuLineup: generateCpuTeam(DRAFT_CATALOG, 'series-dom-2').team.lineup, catalog: DRAFT_CATALOG, seed: 'series-dom', catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION })
    const draw = { ...first, winner: 'draw' as const }
    vi.spyOn(series, 'nextSeriesMatch').mockImplementation((_first, index) => ({ ...draw, seed: `series-dom-${index}` }))
    const finished = vi.fn(); const newDraft = vi.fn()
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><MatchSeriesScreen result={draw} onSeriesFinished={finished} onReturn={vi.fn()} onRematch={newDraft} /></I18nextProvider>)
    for (let index = 1; index <= 5; index++) {
      act(() => vi.advanceTimersByTime(15000))
      if (index < 5) {
        expect(finished).not.toHaveBeenCalled()
        fireEvent.click(screen.getByRole('button', { name: index >= 3 ? 'Play tiebreak · same squad' : 'Next match · same squad' }))
      }
    }
    expect(screen.getByText(/Penalty shootout:/)).toBeInTheDocument()
    expect(finished).toHaveBeenCalledTimes(1)
    expect(series.nextSeriesMatch).toHaveBeenCalledTimes(4)
    expect(newDraft).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Replay match' }))
    expect(screen.queryByText(/Penalty shootout:/)).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(15000))
    expect(finished).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/Penalty shootout:/)).toBeInTheDocument()
  })
})
