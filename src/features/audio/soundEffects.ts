/**
 * Original synthesised effects (Web Audio). No external audio files, so there is nothing to license or credit.
 * Every recipe schedules short oscillator and noise events against `now`; nothing keeps running after it ends.
 */
export const SOUND_IDS = ['coinToss', 'coinLand', 'bid', 'award', 'discard', 'goal', 'finalWhistle'] as const
export type SoundId = (typeof SOUND_IDS)[number]

interface Tone { readonly type: OscillatorType; readonly from: number; readonly to?: number; readonly at: number; readonly length: number; readonly gain: number; readonly vibrato?: number }
interface Noise { readonly at: number; readonly length: number; readonly gain: number; readonly from: number; readonly to: number; readonly q?: number; readonly swell?: boolean }
interface Recipe { readonly tones: readonly Tone[]; readonly noise?: readonly Noise[] }

export const RECIPES: Readonly<Record<SoundId, Recipe>> = {
  coinToss: { tones: [{ type: 'sine', from: 520, to: 1300, at: 0, length: .28, gain: .35 }, { type: 'triangle', from: 2600, at: .26, length: .1, gain: .12 }] },
  coinLand: { tones: [{ type: 'triangle', from: 1900, at: 0, length: .09, gain: .4 }, { type: 'triangle', from: 1500, at: .13, length: .08, gain: .25 }, { type: 'triangle', from: 1700, at: .24, length: .06, gain: .14 }] },
  bid: { tones: [{ type: 'square', from: 660, at: 0, length: .06, gain: .12 }, { type: 'square', from: 880, at: .07, length: .09, gain: .12 }] },
  award: { tones: [{ type: 'sine', from: 523, at: 0, length: .14, gain: .3 }, { type: 'sine', from: 659, at: .1, length: .14, gain: .3 }, { type: 'sine', from: 784, at: .2, length: .3, gain: .3 }, { type: 'triangle', from: 1568, at: .24, length: .22, gain: .1 }] },
  discard: { tones: [{ type: 'triangle', from: 320, to: 140, at: 0, length: .22, gain: .22 }], noise: [{ at: 0, length: .22, gain: .25, from: 3000, to: 600 }] },
  goal: {
    tones: [{ type: 'sawtooth', from: 440, at: 0, length: .55, gain: .1 }, { type: 'sawtooth', from: 554, at: 0, length: .55, gain: .1 }, { type: 'sawtooth', from: 659, at: .12, length: .6, gain: .1 }],
    noise: [{ at: 0, length: 1.1, gain: .45, from: 700, to: 1100, q: .7, swell: true }],
  },
  finalWhistle: { tones: [{ type: 'sine', from: 2900, at: 0, length: .22, gain: .22, vibrato: 38 }, { type: 'sine', from: 2900, at: .3, length: .22, gain: .22, vibrato: 38 }, { type: 'sine', from: 2900, at: .6, length: .55, gain: .22, vibrato: 38 }] },
}

export function scheduleSound(context: AudioContext, destination: AudioNode, id: SoundId, now: number) {
  const recipe = RECIPES[id]
  for (const tone of recipe.tones) {
    const oscillator = context.createOscillator(); const gain = context.createGain()
    const start = now + tone.at; const end = start + tone.length
    oscillator.type = tone.type
    oscillator.frequency.setValueAtTime(tone.from, start)
    if (tone.to) oscillator.frequency.exponentialRampToValueAtTime(tone.to, end)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(tone.gain, start + Math.min(.02, tone.length / 3))
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    oscillator.connect(gain); gain.connect(destination)
    if (tone.vibrato) {
      const lfo = context.createOscillator(); const depth = context.createGain()
      lfo.frequency.value = tone.vibrato; depth.gain.value = 60
      lfo.connect(depth); depth.connect(oscillator.frequency); lfo.start(start); lfo.stop(end + .02)
    }
    oscillator.start(start); oscillator.stop(end + .02)
  }
  for (const burst of recipe.noise ?? []) {
    const frames = Math.max(1, Math.floor(context.sampleRate * burst.length))
    const buffer = context.createBuffer(1, frames, context.sampleRate); const data = buffer.getChannelData(0)
    for (let index = 0; index < frames; index++) data[index] = Math.random() * 2 - 1
    const source = context.createBufferSource(); const filter = context.createBiquadFilter(); const gain = context.createGain()
    const start = now + burst.at; const end = start + burst.length
    source.buffer = buffer; filter.type = 'bandpass'; filter.Q.value = burst.q ?? 1
    filter.frequency.setValueAtTime(burst.from, start); filter.frequency.exponentialRampToValueAtTime(burst.to, end)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(burst.gain, burst.swell ? start + burst.length * .35 : start + .02)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    source.connect(filter); filter.connect(gain); gain.connect(destination); source.start(start); source.stop(end + .02)
  }
}
