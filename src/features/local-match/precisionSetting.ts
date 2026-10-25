import { useEffect, useRef, useSyncExternalStore } from 'react'

/**
 * "Precision bar" setting. Off (the default): one tap on a destination resolves the play. On: the earlier two-step flow
 * (pick, then stop the moving bar). Kept in localStorage; a blocked or missing storage just means the default.
 */
export const PRECISION_BAR_KEY = 'reclutador.precision-bar-v1'
/** Neutral precision used when the bar is off (the same value the reduced-motion path already sends). */
export const NEUTRAL_PRECISION = 0.5
/** Time the chosen destination stays highlighted before the result is shown. */
export const TAP_FEEDBACK_MS = 220
const reducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const tapFeedbackDelay = () => (reducedMotion() ? 0 : TAP_FEEDBACK_MS)

let fallback = false
const listeners = new Set<() => void>()
function read(): boolean {
  try { return window.localStorage.getItem(PRECISION_BAR_KEY) === 'on' } catch { return fallback }
}
export function setPrecisionBar(enabled: boolean) {
  fallback = enabled
  try { window.localStorage.setItem(PRECISION_BAR_KEY, enabled ? 'on' : 'off') } catch { /* the choice lasts until the page closes */ }
  listeners.forEach((listener) => listener())
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const usePrecisionBar = () => useSyncExternalStore(subscribe, read, () => false)

/** Runs a play once after the chosen destination had a moment to show: a second tap on the same panel is ignored. */
export function useTapOnce() {
  const done = useRef(false); const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (run: () => void) => {
    if (done.current) return
    done.current = true
    const go = () => { done.current = false; run() }
    const delay = tapFeedbackDelay()
    if (delay === 0) go(); else timer.current = window.setTimeout(go, delay)
  }
}
