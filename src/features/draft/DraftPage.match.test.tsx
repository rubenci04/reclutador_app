import { afterEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from './catalog'
import { DraftPage } from './DraftPage'
import { useDraftStore } from './draftState'
import { generateCpuTeam } from '../local-match/cpuTeam'
import * as random from '../local-match/seededRandom'
import * as simulation from '../local-match/engine/figuresMatch'

afterEach(() => { vi.restoreAllMocks(); useDraftStore.getState().reset() })
it('requests entropy only on starts and uses fresh match seeds after remounting the same eleven', async () => {
  const i18n = await createI18n('en')
  const lineup = generateCpuTeam(DRAFT_CATALOG, 'draft-freshness').team.lineup
  useDraftStore.setState({ lineup, confirmed: true })
  const entropy = vi.spyOn(random, 'createSecureSeed').mockReturnValueOnce('entropy-one').mockReturnValueOnce('entropy-two')
  const simulator = vi.spyOn(simulation, 'playMatch')
  for (let index = 0; index < 2; index++) {
    const view = render(<I18nextProvider i18n={i18n}><DraftPage /></I18nextProvider>)
    expect(entropy).toHaveBeenCalledTimes(index)
    fireEvent.click(screen.getByRole('button', { name: 'Play against CPU' }))
    expect(entropy).toHaveBeenCalledTimes(index + 1)
    expect(simulator.mock.calls[index][0].seed).toBe(index ? 'local-match-entropy-two' : 'local-match-entropy-one')
    view.unmount()
  }
})
