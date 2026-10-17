/** Small deterministic PRNG: every game action carries its seed in the result. */
export function hashSeed(seed: string) {
  let value = 2166136261
  for (let index = 0; index < seed.length; index++) value = Math.imul(value ^ seed.charCodeAt(index), 16777619)
  return value >>> 0
}

export function createSeededRandom(seed: string) {
  let state = hashSeed(seed) || 1
  return () => {
    state |= 0
    state = (state + 0x6D2B79F5) | 0
    let value = Math.imul(state ^ state >>> 15, 1 | state)
    value = (value + Math.imul(value ^ value >>> 7, 61 | value)) ^ value
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

export function shuffleSeeded<T>(values: readonly T[], random: () => number): T[] {
  const shuffled = [...values]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }
  return shuffled
}
