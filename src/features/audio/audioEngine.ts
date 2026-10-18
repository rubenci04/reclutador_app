import { scheduleSound, type SoundId } from './soundEffects'

export const AUDIO_STORAGE_KEY = 'reclutador.audio.v1'
export interface AudioPreferences { readonly enabled: boolean; readonly volume: number }
export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = { enabled: true, volume: .6 }

interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
interface EngineDependencies { readonly storage?: () => StorageLike | undefined; readonly createContext?: () => AudioContext | undefined }

const clampVolume = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : DEFAULT_AUDIO_PREFERENCES.volume))

/** Reads defensively: private mode, blocked storage or corrupt JSON all fall back to the defaults. */
export function readAudioPreferences(storage: StorageLike | undefined): AudioPreferences {
  try {
    const raw = storage?.getItem(AUDIO_STORAGE_KEY)
    if (!raw) return DEFAULT_AUDIO_PREFERENCES
    const parsed = JSON.parse(raw) as Partial<AudioPreferences>
    return { enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_AUDIO_PREFERENCES.enabled, volume: typeof parsed.volume === 'number' ? clampVolume(parsed.volume) : DEFAULT_AUDIO_PREFERENCES.volume }
  } catch { return DEFAULT_AUDIO_PREFERENCES }
}

/**
 * Small sound engine. The AudioContext is created lazily on the first `play`, which only happens after a user action,
 * and a context the browser keeps suspended (autoplay policy) simply skips the sound instead of queueing it.
 */
export function createAudioEngine(dependencies: EngineDependencies = {}) {
  const getStorage = dependencies.storage ?? (() => { try { return window.localStorage } catch { return undefined } })
  const createContext = dependencies.createContext ?? (() => {
    const Constructor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
    return Constructor ? new Constructor() : undefined
  })
  let preferences = readAudioPreferences(getStorage())
  let context: AudioContext | undefined
  let master: GainNode | undefined
  const listeners = new Set<() => void>()
  const ensure = () => {
    if (context) return context
    try {
      context = createContext()
      if (context) { master = context.createGain(); master.gain.value = preferences.volume; master.connect(context.destination) }
    } catch { context = undefined }
    return context
  }
  return {
    getPreferences: () => preferences,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    setPreferences(patch: Partial<AudioPreferences>) {
      preferences = { enabled: patch.enabled ?? preferences.enabled, volume: patch.volume === undefined ? preferences.volume : clampVolume(patch.volume) }
      if (master) master.gain.value = preferences.volume
      try { getStorage()?.setItem(AUDIO_STORAGE_KEY, JSON.stringify(preferences)) } catch { /* the preference simply lasts for this visit */ }
      listeners.forEach((listener) => listener())
    },
    /** Returns true only when a sound was actually scheduled. */
    play(id: SoundId): boolean {
      if (!preferences.enabled || preferences.volume <= 0) return false
      const ready = ensure()
      if (!ready || !master) return false
      if (ready.state === 'suspended') { void ready.resume().catch(() => undefined); return false }
      if (ready.state !== 'running') return false
      scheduleSound(ready, master, id, ready.currentTime + .005)
      return true
    },
  }
}

export const audio = createAudioEngine()
