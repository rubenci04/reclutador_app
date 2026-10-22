import { useCallback, useEffect, useRef, useState } from 'react'
import { markerAt, precisionAt } from './DribblePanel'

export const reducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Shared timing mechanic of the hand-played actions (SIM-MINI-002/003): a marker sweeps the bar and the player stops it.
 * `stop()` returns the precision (1 in the middle, 0 at the ends). With reduced motion nothing moves and the precision is neutral (0.5).
 */
export function useTimingBar(active: boolean) {
  const motionOff = reducedMotion()
  const [marker, setMarker] = useState(.5)
  const startedAt = useRef(0); const frame = useRef(0)
  useEffect(() => {
    if (!active || motionOff) return
    startedAt.current = performance.now()
    const tick = () => { setMarker(markerAt(performance.now() - startedAt.current)); frame.current = requestAnimationFrame(tick) }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [active, motionOff])
  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current)
    return motionOff ? .5 : precisionAt(markerAt(performance.now() - startedAt.current))
  }, [motionOff])
  return { marker, stop, motionOff }
}

