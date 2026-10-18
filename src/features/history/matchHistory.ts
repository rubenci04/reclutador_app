import { useSyncExternalStore } from 'react'

export type HistoryOutcome = 'recruiter_one' | 'recruiter_two' | 'draw'

/** One finished duel. Stored locally only; names are the ones the players typed. */
export interface HistoryEntry {
  readonly id: string
  readonly at: string
  readonly mode: string
  readonly opponent: 'cpu' | 'hotseat'
  readonly names: { readonly recruiter_one: string; readonly recruiter_two: string }
  readonly outcome: HistoryOutcome
  /** Final score; null when the duel ended by abandonment. */
  readonly score: { readonly recruiter_one: number; readonly recruiter_two: number } | null
  readonly abandonedBy: 'recruiter_one' | 'recruiter_two' | null
}

export const HISTORY_KEY = 'reclutador.history.v1'
export const HISTORY_LIMIT = 100
const EMPTY: readonly HistoryEntry[] = []

const isCount = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 100
function valid(entry: unknown): entry is HistoryEntry {
  if (typeof entry !== 'object' || entry === null) return false
  const e = entry as Record<string, unknown>
  const names = e.names as Record<string, unknown> | undefined
  const score = e.score as Record<string, unknown> | null | undefined
  return typeof e.id === 'string' && e.id.length > 0 && e.id.length <= 200 && typeof e.at === 'string' && typeof e.mode === 'string'
    && (e.opponent === 'cpu' || e.opponent === 'hotseat') && !!names && typeof names.recruiter_one === 'string' && typeof names.recruiter_two === 'string'
    && ['recruiter_one', 'recruiter_two', 'draw'].includes(e.outcome as string)
    && (score === null || (!!score && isCount(score.recruiter_one) && isCount(score.recruiter_two)))
    && (e.abandonedBy === null || e.abandonedBy === 'recruiter_one' || e.abandonedBy === 'recruiter_two')
}
export function parseHistory(raw: string | null): readonly HistoryEntry[] {
  if (!raw || raw.length > 400_000) return EMPTY
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? value.filter(valid).slice(0, HISTORY_LIMIT) : EMPTY
  } catch { return EMPTY }
}

const readRaw = () => { try { return localStorage.getItem(HISTORY_KEY) } catch { return null } }
let lastRaw: string | null | undefined
let lastValue: readonly HistoryEntry[] = EMPTY
/** Fallback when the browser refuses to store: the session still shows its own results. */
let memory: readonly HistoryEntry[] | null = null
const listeners = new Set<() => void>()

function getSnapshot(): readonly HistoryEntry[] {
  const raw = readRaw()
  if (raw === null && memory) return memory
  if (raw !== lastRaw) { lastRaw = raw; lastValue = parseHistory(raw) }
  return lastValue
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }

/** Newest first. The same id is never stored twice (a duel is recorded once even if the screen re-renders). */
function record(entry: HistoryEntry) {
  const current = getSnapshot()
  if (current.some((item) => item.id === entry.id)) return
  const next = [entry, ...current].slice(0, HISTORY_LIMIT)
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); memory = null } catch { memory = next }
  listeners.forEach((listener) => listener())
}
function clear() {
  try { localStorage.removeItem(HISTORY_KEY) } catch { /* nothing stored */ }
  memory = null
  listeners.forEach((listener) => listener())
}
export const matchHistory = { getSnapshot, subscribe, record, clear, forgetMemory: () => { memory = null; listeners.forEach((listener) => listener()) } }
export const useMatchHistory = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

export interface HistorySummary { readonly played: number; readonly wins: number; readonly draws: number; readonly losses: number; readonly abandoned: number }
/** Wins and losses from the point of view of recruiter one, the person at the device. */
export function summarize(entries: readonly HistoryEntry[], opponent: 'cpu' | 'hotseat'): HistorySummary {
  const own = entries.filter((entry) => entry.opponent === opponent)
  return {
    played: own.length,
    wins: own.filter((entry) => entry.outcome === 'recruiter_one').length,
    draws: own.filter((entry) => entry.outcome === 'draw').length,
    losses: own.filter((entry) => entry.outcome === 'recruiter_two').length,
    abandoned: own.filter((entry) => entry.abandonedBy !== null).length,
  }
}
