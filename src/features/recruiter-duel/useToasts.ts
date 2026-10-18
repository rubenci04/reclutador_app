import { useCallback, useEffect, useRef, useState } from 'react'

export type NoticeTone = 'info' | 'success' | 'warning'
export interface Notice { readonly id: number; readonly tone: NoticeTone; readonly text: string }

const VISIBLE = 3
const LIFETIME_MS: Readonly<Record<NoticeTone, number>> = { info: 6000, success: 7000, warning: 12000 }

/** A short list of messages that remove themselves; the same text is never shown twice at once. */
export function useToasts() {
  const [notices, setNotices] = useState<readonly Notice[]>([])
  const counter = useRef(0)
  const timers = useRef(new Map<number, number>())
  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id)); timers.current.delete(id)
    setNotices((current) => current.filter((notice) => notice.id !== id))
  }, [])
  const push = useCallback((tone: NoticeTone, text: string) => {
    const id = ++counter.current
    setNotices((current) => [...current.filter((notice) => notice.text !== text), { id, tone, text }].slice(-VISIBLE))
    timers.current.set(id, window.setTimeout(() => dismiss(id), LIFETIME_MS[tone]))
  }, [dismiss])
  useEffect(() => { const pending = timers.current; return () => { pending.forEach((timer) => window.clearTimeout(timer)); pending.clear() } }, [])
  return { notices, push, dismiss }
}
