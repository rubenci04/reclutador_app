import { describe, expect, it } from 'vitest'
import { DUEL_STEPS, duelEdge, HOLD_MIN_MS, isPerfect, RING_MS, ringPrecision, ringScale } from './deliveryRing'

describe('SIM-FIELD-003 delivery ring', () => {
  it('contracts from 3x to exactly 1x at the perfect moment and keeps shrinking after it', () => {
    expect(ringScale(0)).toBe(3); expect(ringScale(RING_MS)).toBe(1)
    expect(ringScale(RING_MS / 2)).toBeGreaterThan(1); expect(ringScale(RING_MS / 2)).toBeLessThan(3)
    expect(ringScale(RING_MS * 1.5)).toBeLessThan(1); expect(ringScale(RING_MS * 10)).toBeGreaterThan(0)
  })
  it('turns the release moment into a 0-1 precision, perfect at the match and 0 at either extreme', () => {
    expect(ringPrecision(RING_MS)).toBe(1); expect(ringPrecision(0)).toBe(0); expect(ringPrecision(RING_MS * 2)).toBe(0); expect(ringPrecision(RING_MS * 5)).toBe(0)
    expect(ringPrecision(RING_MS - 90)).toBe(.9); expect(isPerfect(RING_MS - 90)).toBe(true); expect(isPerfect(RING_MS / 2)).toBe(false)
  })
  it('treats a short press as a plain tap and formats the duel edge with its sign', () => {
    expect(HOLD_MIN_MS).toBeLessThan(RING_MS / 2)
    expect(duelEdge(91, 86)).toBe('+5'); expect(duelEdge(80, 84)).toBe('-4'); expect(duelEdge(80, 80)).toBe('0')
    expect(DUEL_STEPS).toEqual(expect.arrayContaining(['CARRY_OK', 'DRIBBLE_OK', 'INTERCEPT_OK', 'AERIAL_WON']))
  })
})
