import { useEffect, useRef } from 'react'

/** A decorative football follows the pointer across the background pitch toward its goal. */
export function InteractiveBackdrop() {
  const ball = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let frame = 0
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const x = Math.max(8, Math.min(88, 8 + event.clientX / window.innerWidth * 80))
        const y = Math.max(24, Math.min(78, 24 + event.clientY / window.innerHeight * 54))
        if (ball.current) { ball.current.style.left = `${x}%`; ball.current.style.top = `${y}%` }
      })
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(frame) }
  }, [])
  return <div className="interactive-backdrop" aria-hidden="true">
    <div className="interactive-backdrop-pitch"><span className="interactive-backdrop-centre" /><span className="interactive-backdrop-goal" /><span ref={ball} className="interactive-backdrop-ball">⚽</span></div>
  </div>
}
