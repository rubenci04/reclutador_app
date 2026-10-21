import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { it, expect } from 'vitest'
import { createI18n } from '../../i18n'
import { PlayerIdentity } from './PlayerIdentity'
import { LEAGUE_PLAYERS } from '../player-catalog/leagueCollections'
import type { DominantFoot } from '../../types/player'

it.each([
  ['es-AR', 'Pie dominante', ['Diestro', 'Zurdo', 'Ambidiestro', 'Sin verificar']],
  ['en', 'Dominant foot', ['Right-footed', 'Left-footed', 'Both-footed', 'Unverified']],
  ['pt-BR', 'Pé dominante', ['Destro', 'Canhoto', 'Ambidestro', 'Não verificado']],
] as const)('renders compact full foot labels and accessible names in %s', async (language, prefix, labels) => {
  const i18n = await createI18n(language)
  const values = ['RIGHT', 'LEFT', 'BOTH', 'UNKNOWN', undefined] as const satisfies readonly (DominantFoot | undefined)[]
  for (const [index, foot] of values.entries()) {
    const { container, unmount } = render(<I18nextProvider i18n={i18n}><PlayerIdentity player={{ ...LEAGUE_PLAYERS[0], dominantFoot: foot }} /></I18nextProvider>)
    const label = labels[Math.min(index, 3)]
    expect(screen.getByLabelText(`${prefix}: ${label}`)).toHaveTextContent(label)
    expect(container.querySelector('.preferred-foot')?.tagName).toBe('SPAN')
    expect(container.querySelector('.preferred-foot')?.closest('p')).toHaveTextContent('Argentina')
    unmount()
  }
})
