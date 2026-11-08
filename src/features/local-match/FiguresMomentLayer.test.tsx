import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { createSeededRandom } from './seededRandom'
import { FiguresMomentLayer } from './FiguresMomentLayer'
import { PRECISION_BAR_KEY, setPrecisionBar } from './precisionSetting'
import type { Moment } from './engine/figuresModel'

afterEach(() => { vi.useRealTimers(); localStorage.removeItem(PRECISION_BAR_KEY) })
const moment = (type: Moment['type']): Moment => ({ segment: 2, type, side: 'local', intent: 'open', difficulty: .4, baseProbability: .2 })

describe('figures moment minigame', () => {
  it('shows the timing bar by default for a new player', async () => {
    localStorage.removeItem(PRECISION_BAR_KEY)
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><FiguresMomentLayer moment={moment('penalty')} seed="mini-1" onResolve={vi.fn()} /></I18nextProvider>)
    expect(screen.getByRole('checkbox', { name: 'Precision bar' })).toBeChecked()
    expect(screen.getByRole('img', { name: i18n.t('fm.moment.bar') })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Play target' }).querySelectorAll('button')).toHaveLength(3)
    expect(document.querySelector('.fm-mini-arena.is-goal')).toBeInTheDocument()
  })
  it('uses the chosen lane against a fixed cover and resolves a penalty once', async () => {
    vi.useFakeTimers(); setPrecisionBar(false)
    const i18n = await createI18n('en')
    const resolved = vi.fn()
    render(<I18nextProvider i18n={i18n}><FiguresMomentLayer moment={moment('penalty')} seed="mini-1" onResolve={resolved} /></I18nextProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Left' }))
    expect(screen.getByRole('button', { name: 'Left' })).toHaveAttribute('aria-pressed', 'true')
    const go = document.querySelector('.fm-moment-go')!
    fireEvent.click(go); fireEvent.click(go)
    const cover = ['LEFT', 'CENTER', 'RIGHT'][Math.floor(createSeededRandom('mini-1:figure-mini:2:penalty:local')() * 3)]
    act(() => vi.advanceTimersByTime(220))
    expect(resolved).toHaveBeenCalledOnce()
    expect(resolved).toHaveBeenCalledWith(cover === 'LEFT' ? .4 : .56)
  })
  it('shows a wall for free kicks and a keeper challenge for saves in Portuguese', async () => {
    setPrecisionBar(false)
    const i18n = await createI18n('pt-BR')
    const view = render(<I18nextProvider i18n={i18n}><FiguresMomentLayer moment={moment('free-kick')} seed="mini-2" onResolve={vi.fn()} /></I18nextProvider>)
    expect(view.container.querySelectorAll('.fm-mini-wall i')).toHaveLength(3)
    view.rerender(<I18nextProvider i18n={i18n}><FiguresMomentLayer key="save" moment={moment('save')} seed="mini-2" onResolve={vi.fn()} /></I18nextProvider>)
    expect(screen.getByText('Escolha onde cobrir e pare a barra. O ataque já tem uma direção.')).toBeInTheDocument()
    expect(view.container.querySelector('.fm-mini-wall')).toBeNull()
  })
})
