import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ballAt, shotTarget } from './backdropMotion'

const INTERACTIVE = 'button, a, input, select, textarea, summary, label, dialog, [role="button"]'
const SHOT_MS = 560
const BURST_MS = 1100

/**
 * Decorative pitch behind the whole app, plus a football that trails the mouse pointer. Clicking empty space shoots it at the nearest goal.
 * It never captures input, does nothing on touch screens and stays still with reduced motion.
 */
export function InteractiveBackdrop() {
  const { t } = useTranslation()
  const ball = useRef<HTMLSpanElement>(null)
  const burst = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0; let shooting = false
    const timers: number[] = []
    const place = (x: number, y: number) => { if (ball.current) { ball.current.classList.add('is-live'); ball.current.style.transform = `translate(${x}px, ${y}px)` } }
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || shooting) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => { const at = ballAt({ x: event.clientX, y: event.clientY }); place(at.x, at.y) })
    }
    const shoot = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.button !== 0 || shooting || (event.target instanceof Element && event.target.closest(INTERACTIVE))) return
      shooting = true
      const goal = shotTarget({ x: event.clientX, y: event.clientY }, { x: window.innerWidth, y: window.innerHeight }, Math.random())
      ball.current?.classList.add('is-shot'); place(goal.x, goal.y)
      timers.push(window.setTimeout(() => {
        if (burst.current) { burst.current.style.left = `${goal.x}px`; burst.current.style.top = `${goal.y}px`; burst.current.classList.remove('is-on'); void burst.current.offsetWidth; burst.current.classList.add('is-on') }
        ball.current?.classList.remove('is-shot'); shooting = false
      }, SHOT_MS))
      timers.push(window.setTimeout(() => burst.current?.classList.remove('is-on'), SHOT_MS + BURST_MS))
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', shoot, { passive: true })
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', shoot); cancelAnimationFrame(frame); timers.forEach((timer) => window.clearTimeout(timer)) }
  }, [])
  return <>
    <div className="interactive-backdrop" aria-hidden="true">
      <div className="interactive-backdrop-pitch">
        <span className="interactive-backdrop-half" /><span className="interactive-backdrop-centre" />
        <span className="interactive-backdrop-box interactive-backdrop-box-left" /><span className="interactive-backdrop-box interactive-backdrop-box-right" />
        <span className="interactive-backdrop-goal interactive-backdrop-goal-left" /><span className="interactive-backdrop-goal interactive-backdrop-goal-right" />
      </div>
    </div>
    <span ref={ball} className="interactive-backdrop-ball" aria-hidden="true">⚽</span>
    <span ref={burst} className="interactive-backdrop-burst" aria-hidden="true">{t('backdrop.goal')}</span>
  </>
}
