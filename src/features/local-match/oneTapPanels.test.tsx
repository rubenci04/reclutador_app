import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { DribblePanel } from './DribblePanel'
import { DefensePanel } from './DefensePanel'
import { ShotPanel } from './ShotPanel'
import { PRECISION_BAR_KEY, setPrecisionBar } from './precisionSetting'
import type { PendingPlay } from './interactive/attackTree'

// Panels without a pitch driver (penalty shoot-out, direct shots, stand-alone drills): with the precision bar off a touch on a lane,
// on the goal or on a lane button plays at once, with no separate confirm button.
afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.removeItem(PRECISION_BAR_KEY) })
beforeEach(() => { vi.useFakeTimers(); setPrecisionBar(false) })

const [kicker, keeper] = DRAFT_CATALOG
const play = { id: 'p1', node: 'DRIBBLE', receiverId: kicker.id, attackerId: kicker.id, protagonistId: keeper.id, options: [{ choice: 'DRIBBLE_CENTER', available: true, playerId: kicker.id, rivalId: keeper.id }], dribble: { cover: 'LEFT' }, defense: { lane: 'RIGHT' } } as unknown as PendingPlay
const flush = () => act(() => { vi.advanceTimersByTime(300) })
async function mount(node: React.ReactNode, language: 'es-AR' | 'en' | 'pt-BR' = 'en') {
  const i18n = await createI18n(language)
  render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>)
  return i18n
}

describe('shot panel (penalties, direct free kick)', () => {
  it('a touch on a third of the goal shoots once with the neutral precision, with no confirm button', async () => {
    const onShoot = vi.fn()
    await mount(<ShotPanel mode="PENALTY" kicker={kicker} keeper={keeper} onShoot={onShoot} />)
    expect(document.querySelector('.shot-panel .primary-action')).toBeNull()
    expect(document.querySelector('.market-hint')).toHaveTextContent('Tap a destination to play')
    fireEvent.click(document.querySelector('rect[data-lane="RIGHT"]')!)
    expect(screen.getByRole('radio', { name: /Right/ })).toHaveAttribute('aria-checked', 'true')
    expect(onShoot).not.toHaveBeenCalled()
    fireEvent.click(document.querySelector('rect[data-lane="LEFT"]')!); fireEvent.click(screen.getByRole('radio', { name: /Right/ }))
    flush()
    expect(onShoot).toHaveBeenCalledTimes(1)
    expect(onShoot).toHaveBeenCalledWith('RIGHT', .5)
  })
  it('a lane button shoots in one click; the keyboard needs arrows to aim and one Enter to shoot', async () => {
    const onShoot = vi.fn()
    await mount(<ShotPanel mode="FREE_KICK" kicker={kicker} keeper={keeper} onShoot={onShoot} />)
    fireEvent.click(screen.getByRole('radio', { name: /Centre/ })); flush()
    expect(onShoot).toHaveBeenCalledWith('CENTER', .5)
    cleanup(); onShoot.mockClear()
    await mount(<ShotPanel mode="FREE_KICK" kicker={kicker} keeper={keeper} onShoot={onShoot} />)
    const region = screen.getByRole('region')
    fireEvent.keyDown(region, { key: 'ArrowLeft' }); expect(onShoot).not.toHaveBeenCalled()
    fireEvent.keyDown(region, { key: 'Enter' }); flush()
    expect(onShoot).toHaveBeenCalledTimes(1); expect(onShoot).toHaveBeenCalledWith('LEFT', .5)
  })
  it('with the bar on it is the two-step flow again: pick, then confirm', async () => {
    setPrecisionBar(true)
    const onShoot = vi.fn()
    await mount(<ShotPanel mode="PENALTY" kicker={kicker} keeper={keeper} onShoot={onShoot} />)
    fireEvent.click(screen.getByRole('radio', { name: /Left/ })); flush()
    expect(onShoot).not.toHaveBeenCalled()
    expect(document.querySelector('.shot-panel .primary-action')).not.toBeNull()
    fireEvent.click(document.querySelector('.shot-panel .primary-action')!)
    expect(onShoot).toHaveBeenCalledTimes(1)
  })
})

describe('dribble and defence panels without a pitch', () => {
  it('a lane button plays the dribble once, with the neutral precision', async () => {
    const onChoose = vi.fn()
    await mount(<DribblePanel play={play} catalog={DRAFT_CATALOG} onChoose={onChoose} />)
    expect(document.querySelector('.dribble-panel .primary-action')).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: /Left/ })); fireEvent.click(screen.getByRole('radio', { name: /Right/ }))
    flush()
    expect(onChoose).toHaveBeenCalledTimes(1); expect(onChoose).toHaveBeenCalledWith('DRIBBLE_LEFT', .5)
  })
  it('a pick plays the defence once (lane or press), and the traditional answer still works', async () => {
    const onChoose = vi.fn()
    await mount(<DefensePanel play={play} catalog={DRAFT_CATALOG} onChoose={onChoose} />)
    expect(document.querySelector('.defense-panel .primary-action')).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: /Press/i })); fireEvent.click(screen.getByRole('radio', { name: /Anticipate left/ }))
    flush()
    expect(onChoose).toHaveBeenCalledTimes(1); expect(onChoose).toHaveBeenCalledWith('PRESS', .5)
    cleanup(); onChoose.mockClear()
    await mount(<DefensePanel play={play} catalog={DRAFT_CATALOG} onChoose={onChoose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Resolve with the traditional system' }))
    expect(onChoose).toHaveBeenCalledWith('INTERCEPT')
  })
  it.each(['es-AR', 'en', 'pt-BR'] as const)('shows the new texts in %s', async (language) => {
    const i18n = await mount(<DribblePanel play={play} catalog={DRAFT_CATALOG} onChoose={vi.fn()} />, language)
    expect(document.querySelector('.market-hint')).toHaveTextContent(i18n.t('field.tapTarget'))
    expect(i18n.t('field.chooseWithButtons')).not.toBe('field.chooseWithButtons')
    expect(i18n.t('field.precisionLabel')).not.toBe('field.precisionLabel'); expect(i18n.t('field.precisionHint')).not.toBe('field.precisionHint')
  })
})
