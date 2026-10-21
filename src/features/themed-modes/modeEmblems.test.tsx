import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { ModeSelector } from './ModeSelector'
import { THEMED_MODE_IDS } from './modeTypes'
import { MODE_VISUALS } from './modeVisuals'
import { flagUrl } from '../recruiter-duel/visualAssets'

const view = async () => {
  const i18n = await createI18n('en')
  return render(<I18nextProvider i18n={i18n}><ModeSelector selected="GLOBAL_CLASSIC" onChange={() => undefined} /></I18nextProvider>)
}

describe('category artwork', () => {
  it('uses the globe, one flag per country and a map per continent as card backdrops', async () => {
    const { container } = await view()
    expect(container.querySelector('[data-testid="globe"]')).not.toBeNull()
    expect(container.querySelector('img.mode-flag[src="/assets/flags/ar.svg"]')).not.toBeNull()
    expect(container.querySelectorAll('img.mode-flag')).toHaveLength(5)
    expect(container.querySelector('img.mode-flag[src="/assets/flags/it.svg"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="map-south-america"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="map-europe"]')).not.toBeNull()
  })
  it('splits each category into current players (football) and legends (star)', async () => {
    const { container } = await view()
    fireEvent.click(screen.getByRole('button', { name: /^Argentine league/ }))
    expect(screen.getByRole('heading', { name: /Current players/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Legends/ })).toBeInTheDocument()
    expect(container.querySelectorAll('[data-testid="icon-current"]').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('[data-testid="icon-legend"]').length).toBeGreaterThan(0)
  })
  it('defines a visual with resolvable flags for every mode', () => {
    for (const id of THEMED_MODE_IDS) {
      const visual = MODE_VISUALS[id]
      expect(visual.accent).toMatch(/^#/)
      for (const code of visual.flags) expect(flagUrl(code), `${id}:${code}`).toBeDefined()
    }
  })
})
