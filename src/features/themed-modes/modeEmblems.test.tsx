import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { ModeSelector } from './ModeSelector'
import { THEMED_MODE_IDS } from './modeTypes'
import { MODE_VISUALS } from './modeVisuals'
import { flagUrl } from '../recruiter-duel/visualAssets'

describe('mode emblems', () => {
  it('renders a globe for the global group and flags inside country groups', async () => {
    const i18n = await createI18n('en')
    const { container } = render(<I18nextProvider i18n={i18n}><ModeSelector selected="GLOBAL_CLASSIC" onChange={() => undefined} /></I18nextProvider>)
    expect(container.querySelector('[data-testid="globe"]')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Argentine league/ }))
    expect(container.querySelector('img.mode-flag[src="/assets/flags/ar.svg"]')).not.toBeNull()
  })
  it('shows the gold globe for world legends', async () => {
    const i18n = await createI18n('en')
    const { container } = render(<I18nextProvider i18n={i18n}><ModeSelector selected="GLOBAL_CLASSIC" onChange={() => undefined} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: /^Global/ }))
    expect(container.querySelector('[data-testid="globe-gold"]')).not.toBeNull()
  })
  it('defines a visual with resolvable flags for every mode', () => {
    for (const id of THEMED_MODE_IDS) {
      const visual = MODE_VISUALS[id]
      expect(visual.accent).toMatch(/^#/)
      for (const code of visual.flags) expect(flagUrl(code), `${id}:${code}`).toBeDefined()
    }
  })
})
