import { useSyncExternalStore } from 'react'

export interface HelpPrefs {
  /** The first-visit tutorial was closed (finished or skipped). */
  readonly tutorialSeen: boolean
  /** Contextual tips during the game. */
  readonly hints: boolean
  /** Tip topics the player already dismissed. */
  readonly dismissed: readonly string[]
}

export const HELP_KEY = 'reclutador.help.v1'
const DEFAULTS: HelpPrefs = { tutorialSeen: false, hints: true, dismissed: [] }

function parse(raw: string | null): HelpPrefs {
  if (!raw) return DEFAULTS
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return DEFAULTS
    const record = value as Record<string, unknown>
    return {
      tutorialSeen: record.tutorialSeen === true,
      hints: record.hints !== false,
      dismissed: Array.isArray(record.dismissed) ? record.dismissed.filter((item): item is string => typeof item === 'string').slice(0, 32) : [],
    }
  } catch { return DEFAULTS }
}

const readRaw = () => { try { return localStorage.getItem(HELP_KEY) } catch { return null } }
let lastRaw: string | null | undefined
let lastPrefs: HelpPrefs = DEFAULTS
/** Used only when the browser refuses to store (private window, blocked data): the session still behaves. */
let memory: HelpPrefs | null = null
const listeners = new Set<() => void>()

/** The snapshot follows the stored text, so clearing storage resets it and there is no stale module cache. */
function getSnapshot(): HelpPrefs {
  const raw = readRaw()
  if (raw === null && memory) return memory
  if (raw !== lastRaw) { lastRaw = raw; lastPrefs = parse(raw) }
  return lastPrefs
}
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
function update(patch: Partial<HelpPrefs>) {
  const next: HelpPrefs = { ...getSnapshot(), ...patch }
  try { localStorage.setItem(HELP_KEY, JSON.stringify(next)); memory = null } catch { memory = next }
  listeners.forEach((listener) => listener())
}

export const helpStore = {
  getSnapshot, subscribe,
  markTutorialSeen: () => update({ tutorialSeen: true }),
  setHints: (hints: boolean) => update({ hints }),
  dismiss: (topic: string) => { const current = getSnapshot(); if (!current.dismissed.includes(topic)) update({ dismissed: [...current.dismissed, topic] }) },
  /** Brings every tip back (the tutorial stays marked as seen). */
  resetTips: () => update({ dismissed: [], hints: true }),
  /** Forgets the in-memory fallback (used by tests and after storage works again). */
  forgetMemory: () => { memory = null; listeners.forEach((listener) => listener()) },
}

export const useHelpPrefs = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
