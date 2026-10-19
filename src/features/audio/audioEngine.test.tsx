import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { AUDIO_STORAGE_KEY, DEFAULT_AUDIO_PREFERENCES, audio, createAudioEngine, readAudioPreferences } from './audioEngine'
import { AudioControls } from './AudioControls'
import { RECIPES, SOUND_IDS } from './soundEffects'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return { data, getItem: (key: string) => data[key] ?? null, setItem: (key: string, value: string) => { data[key] = value } }
}

function fakeContext(state: AudioContextState = 'running') {
  const started: string[] = []
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() })
  const node = () => ({ connect: vi.fn(), gain: param(), frequency: param(), Q: { value: 0 }, type: '', start: vi.fn(() => started.push('start')), stop: vi.fn(), buffer: null as unknown })
  const context = {
    state, currentTime: 0, sampleRate: 8000, destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createGain: vi.fn(node), createOscillator: vi.fn(node), createBiquadFilter: vi.fn(node), createBufferSource: vi.fn(node),
    createBuffer: vi.fn((_c: number, frames: number) => ({ getChannelData: () => new Float32Array(frames) })),
  }
  return { context: context as unknown as AudioContext, started, raw: context }
}

describe('audio preferences', () => {
  it('defaults safely and survives corrupt or blocked storage', () => {
    expect(readAudioPreferences(undefined)).toEqual(DEFAULT_AUDIO_PREFERENCES)
    expect(readAudioPreferences(memoryStorage({ [AUDIO_STORAGE_KEY]: '{oops' }))).toEqual(DEFAULT_AUDIO_PREFERENCES)
    expect(readAudioPreferences({ getItem: () => { throw new Error('blocked') }, setItem: () => undefined })).toEqual(DEFAULT_AUDIO_PREFERENCES)
    expect(readAudioPreferences(memoryStorage({ [AUDIO_STORAGE_KEY]: JSON.stringify({ enabled: false, volume: 7 }) }))).toEqual({ enabled: false, volume: 1 })
  })
  it('persists the switch and the volume for the next visit', () => {
    const storage = memoryStorage()
    const first = createAudioEngine({ storage: () => storage, createContext: () => undefined })
    first.setPreferences({ enabled: false }); first.setPreferences({ volume: .3 })
    const second = createAudioEngine({ storage: () => storage, createContext: () => undefined })
    expect(second.getPreferences()).toEqual({ enabled: false, volume: .3 })
  })
  it('keeps working for the visit when storage refuses to save', () => {
    const engine = createAudioEngine({ storage: () => ({ getItem: () => null, setItem: () => { throw new Error('full') } }), createContext: () => undefined })
    expect(() => engine.setPreferences({ volume: .2 })).not.toThrow()
    expect(engine.getPreferences().volume).toBe(.2)
  })
})

describe('audio engine', () => {
  it('has a recipe for every sound and creates no context before the first play', () => {
    expect(SOUND_IDS).toEqual(['coinToss', 'coinLand', 'bid', 'award', 'signing', 'discard', 'diceRoll', 'goal', 'finalWhistle'])
    for (const id of SOUND_IDS) expect(RECIPES[id].tones.length + (RECIPES[id].noise?.length ?? 0)).toBeGreaterThan(0)
    const createContext = vi.fn(() => undefined)
    createAudioEngine({ storage: () => memoryStorage(), createContext })
    expect(createContext).not.toHaveBeenCalled()
  })
  it('plays every effect on a running context, scaled by the stored volume', () => {
    const { context, raw, started } = fakeContext('running')
    const engine = createAudioEngine({ storage: () => memoryStorage(), createContext: () => context })
    for (const id of SOUND_IDS) expect(engine.play(id)).toBe(true)
    expect(started.length).toBeGreaterThan(SOUND_IDS.length)
    engine.setPreferences({ volume: .25 })
    const master = raw.createGain.mock.results[0].value as { gain: { value: number } }
    expect(master.gain.value).toBe(.25)
  })
  it('stays silent when disabled, muted or when the browser keeps the context suspended', () => {
    const running = fakeContext('running')
    const off = createAudioEngine({ storage: () => memoryStorage(), createContext: () => running.context })
    off.setPreferences({ enabled: false })
    expect(off.play('goal')).toBe(false)
    off.setPreferences({ enabled: true, volume: 0 })
    expect(off.play('goal')).toBe(false)
    expect(running.started).toHaveLength(0)
    const blocked = fakeContext('suspended')
    const engine = createAudioEngine({ storage: () => memoryStorage(), createContext: () => blocked.context })
    expect(engine.play('goal')).toBe(false)
    expect(blocked.raw.resume).toHaveBeenCalledTimes(1)
    expect(blocked.started).toHaveLength(0)
    expect(createAudioEngine({ storage: () => memoryStorage(), createContext: () => undefined }).play('goal')).toBe(false)
  })
})

describe('AudioControls', () => {
  afterEach(() => { audio.setPreferences(DEFAULT_AUDIO_PREFERENCES); localStorage.clear() })
  it('toggles effects, changes the volume and stores both', async () => {
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AudioControls /></I18nextProvider>)
    const toggle = screen.getByRole('button', { name: 'Sound effects' })
    const slider = screen.getByRole('slider', { name: 'Effects volume' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true'); expect(slider).toBeEnabled()
    fireEvent.change(slider, { target: { value: '35' } })
    expect(JSON.parse(localStorage.getItem(AUDIO_STORAGE_KEY)!)).toEqual({ enabled: true, volume: .35 })
    expect(slider).toHaveAttribute('aria-valuetext', '35 percent')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false'); expect(toggle).toHaveTextContent('Sound: off'); expect(slider).toBeDisabled()
    expect(JSON.parse(localStorage.getItem(AUDIO_STORAGE_KEY)!)).toEqual({ enabled: false, volume: .35 })
  })
})
