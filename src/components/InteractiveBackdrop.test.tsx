import { afterEach, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { InteractiveBackdrop } from './InteractiveBackdrop'

afterEach(() => vi.unstubAllGlobals())

it('moves the decorative ball with a mouse, leaves touch alone and never captures input', () => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const view = render(<InteractiveBackdrop />)
  const backdrop = view.container.querySelector('.interactive-backdrop')!
  const ball = view.container.querySelector('.interactive-backdrop-ball') as HTMLElement
  expect(backdrop).toHaveAttribute('aria-hidden', 'true')
  window.dispatchEvent(Object.assign(new Event('pointermove'), { pointerType: 'mouse', clientX: window.innerWidth, clientY: 0 }))
  expect(ball.style.left).toBe('88%')
  expect(ball.style.top).toBe('24%')
  window.dispatchEvent(Object.assign(new Event('pointermove'), { pointerType: 'touch', clientX: 0, clientY: 0 }))
  expect(ball.style.left).toBe('88%')
})
