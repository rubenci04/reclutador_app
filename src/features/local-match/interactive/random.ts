import { hashSeed } from '../seededRandom'

/** Serializable RNG; bit-for-bit equivalent to the historical generator. */
export interface RngCheckpoint {
  readonly algorithm: 'mulberry32-v1'
  readonly state: number
  readonly draws: number
}

export function initialCheckpoint(seed: string): RngCheckpoint {
  return { algorithm: 'mulberry32-v1', state: hashSeed(seed) || 1, draws: 0 }
}

/** A zero internal state is valid on resume; the seed fallback applies only at creation. */
export function nextCheckpoint(current: RngCheckpoint): { value: number; checkpoint: RngCheckpoint } {
  if (current.algorithm !== 'mulberry32-v1' || !Number.isInteger(current.state) || current.state < 0 || current.state > 0xffffffff || !Number.isSafeInteger(current.draws) || current.draws < 0 || current.draws === Number.MAX_SAFE_INTEGER) throw new Error('invalid_rng_checkpoint')
  const state = ((current.state | 0) + 0x6D2B79F5) | 0
  let value = Math.imul(state ^ state >>> 15, 1 | state)
  value = (value + Math.imul(value ^ value >>> 7, 61 | value)) ^ value
  return { value: ((value ^ value >>> 14) >>> 0) / 4294967296, checkpoint: { algorithm: 'mulberry32-v1', state: state >>> 0, draws: current.draws + 1 } }
}
