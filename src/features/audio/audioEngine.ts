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
 * AudioContext is unlocked by a real user gesture. Effects requested while suspended are dropped, never queued late.
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
  let resuming: Promise<boolean> | undefined
  const listeners = new Set<() => void>()
  const ensure = () => {
    if (context) return context
    try {
      context = createContext()
      if (context) { master = context.createGain(); master.gain.value = preferences.volume; master.connect(context.destination) }
    } catch { context = undefined }
    return context
  }
  const unlock = (): Promise<boolean> => {
    if (!preferences.enabled || preferences.volume <= 0) return Promise.resolve(false)
    const ready = ensure()
    if (!ready) return Promise.resolve(false)
    if (ready.state === 'running') return Promise.resolve(true)
    if (ready.state !== 'suspended') return Promise.resolve(false)
    if (!resuming) {
      try { resuming = ready.resume().then(() => ready.state === 'running', () => false).finally(() => { resuming = undefined }) }
      catch { return Promise.resolve(false) }
    }
    return resuming
  }
  return {
    unlock,
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
      if (ready.state === 'suspended') { void unlock(); return false }
      if (ready.state !== 'running') return false
      scheduleSound(ready, master, id, ready.currentTime + .005)
      return true
    },
  }
}

export const audio = createAudioEngine()
