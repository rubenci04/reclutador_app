import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DiceRoller } from './DiceRoller'
import { diceTier } from './diceTier'

const renderDice = async (props: Partial<Parameters<typeof DiceRoller>[0]> = {}) => {
  const i18n = await createI18n('en')
  return render(<I18nextProvider i18n={i18n}><DiceRoller position="DEL" tier="A" roundNumber={3} {...props} /></I18nextProvider>)
}

describe('DiceRoller', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('lands on the drawn position and tier and announces them', async () => {
    const { container } = await renderDice()
    expect(screen.getByRole('img')).toHaveAccessibleName('Draw dice, round 3: position Forward, tier A')
    expect(container.querySelector('.die-position')?.getAttribute('data-value')).toBe('DEL')
    expect(container.querySelector('.die-tier')?.getAttribute('data-value')).toBe('A')
    expect(container.querySelector('.dice-roller')?.classList.contains('is-rolling')).toBe(true)
  })
  it('does not animate when reduced motion is requested or rolling is off', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const { container } = await renderDice()
    expect(container.querySelector('.dice-roller')?.classList.contains('is-rolling')).toBe(false)
    vi.unstubAllGlobals()
    const second = await renderDice({ rolling: false })
    expect(second.container.querySelector('.dice-roller')?.classList.contains('is-rolling')).toBe(false)
  })
  it('maps ratings to the display tier', () => {
    expect(diceTier(99)).toBe('S+')
    expect(diceTier(95)).toBe('S')
    expect(diceTier(80)).toBe('C')
  })
})
