import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../i18n'
import { InteractiveBackdrop } from './InteractiveBackdrop'
import { GOAL_INSET, ballAt, shotTarget } from './backdropMotion'

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })
const pointer = (type: string, init: { pointerType: string; clientX: number; clientY: number; button?: number }) => window.dispatchEvent(Object.assign(new Event(type), { button: 0, ...init }))
const viewport = { x: window.innerWidth, y: window.innerHeight }

describe('backdrop motion', () => {
  it('rests under the pointer but never leaves the pitch, and shoots at the goal on the pointer side', () => {
    expect(ballAt({ x: 300, y: 200 }, { x: 1000, y: 600 })).toEqual({ x: 300, y: 200 })
    expect(ballAt({ x: -50, y: 9999 }, { x: 1000, y: 600 })).toEqual({ x: GOAL_INSET, y: 570 })
    expect(shotTarget({ x: 100, y: 300 }, { x: 1000, y: 600 }, 0).x).toBe(GOAL_INSET)
    expect(shotTarget({ x: 900, y: 300 }, { x: 1000, y: 600 }, 1).x).toBe(1000 - GOAL_INSET)
    expect(shotTarget({ x: 900, y: 300 }, { x: 1000, y: 600 }, 0).y).toBe(240)
    expect(shotTarget({ x: 900, y: 300 }, { x: 1000, y: 600 }, 9).y).toBeCloseTo(360)
  })
})

describe('InteractiveBackdrop', () => {
  const mount = async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const i18n = await createI18n('en')
    return render(<I18nextProvider i18n={i18n}><button>Press me</button><InteractiveBackdrop /></I18nextProvider>)
  }
  it('keeps the ball on the background pitch, behind the interface, and rolls it after the mouse but not after touch', async () => {
    const view = await mount()
    const ball = view.container.querySelector('.interactive-backdrop-ball') as HTMLElement
    expect(view.container.querySelector('.interactive-backdrop')).toHaveAttribute('aria-hidden', 'true')
    expect(ball.parentElement).toBe(view.container.querySelector('.interactive-backdrop'))
    const at = ballAt({ x: 200, y: 100 }, viewport)
    pointer('pointermove', { pointerType: 'mouse', clientX: 200, clientY: 100 })
    expect(ball.style.transform).toBe(`translate(${at.x}px, ${at.y}px)`)
    expect(ball).toHaveClass('is-live')
    pointer('pointermove', { pointerType: 'touch', clientX: 0, clientY: 0 })
    expect(ball.style.transform).toBe(`translate(${at.x}px, ${at.y}px)`)
  })
  it('shoots at the goal on a click on empty space, announces a goal and then rolls again; buttons are left alone', async () => {
    vi.useFakeTimers()
    const view = await mount()
    const ball = view.container.querySelector('.interactive-backdrop-ball') as HTMLElement
    const burst = view.container.querySelector('.interactive-backdrop-burst') as HTMLElement
    expect(burst).toHaveTextContent('GOAL!')
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Press me' }), { pointerType: 'mouse', button: 0 })
    expect(ball).not.toHaveClass('is-shot')
    pointer('pointerdown', { pointerType: 'mouse', clientX: 10, clientY: 10 })
    expect(ball).toHaveClass('is-shot')
    expect(ball.style.transform).toContain(`translate(${GOAL_INSET}px`)
    vi.advanceTimersByTime(560)
    expect(burst).toHaveClass('is-on')
    expect(ball).not.toHaveClass('is-shot')
    vi.advanceTimersByTime(1100)
    expect(burst).not.toHaveClass('is-on')
    pointer('pointermove', { pointerType: 'mouse', clientX: 300, clientY: 300 })
    expect(ball.style.transform).toBe(`translate(300px, 300px)`)
  })
  it('stays still with reduced motion', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    const view = await mount()
    pointer('pointermove', { pointerType: 'mouse', clientX: 200, clientY: 100 })
    expect((view.container.querySelector('.interactive-backdrop-ball') as HTMLElement).style.transform).toBe('')
  })
})
