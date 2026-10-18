import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { calculatePlayerPrice } from './calculatePlayerPrice'
import { ARG_B01, playedInArgentina, validateArgentinaBatch01 } from './argentinaBatch01'
import { normalizePlayerName } from './playerIdentity'

describe('ARG-B01 first Argentine batch', () => {
  it('passes the batch validator with the planned quotas', () => {
    const report = validateArgentinaBatch01(ARG_B01, DRAFT_CATALOG)
    expect(report.issues).toEqual([])
    expect(ARG_B01).toHaveLength(50)
    expect(report.positionCounts).toEqual({ ARQ: 6, DEF: 16, MED: 15, DEL: 13 })
  })
  it('does not concentrate in the top tier and spans many clubs', () => {
    const report = validateArgentinaBatch01(ARG_B01, DRAFT_CATALOG)
    expect(report.tierCounts.S).toBeLessThanOrEqual(5)
    expect(report.clubCount).toBeGreaterThanOrEqual(25)
    expect(new Set(ARG_B01.map((player) => player.club_tag)).size).toBeGreaterThanOrEqual(10)
  })
  it('keeps the batch out of the 150-player catalog without duplicates', () => {
    const ids = new Set(DRAFT_CATALOG.map((player) => player.id))
    const names = new Set(DRAFT_CATALOG.map((player) => normalizePlayerName(player.name)))
    for (const player of ARG_B01) {
      expect(ids.has(player.id)).toBe(false)
      expect(names.has(normalizePlayerName(player.name))).toBe(false)
    }
    expect(new Set(ARG_B01.map((player) => player.identityKey)).size).toBe(50)
  })
  it('prices every record with the centralized formula', () => {
    for (const player of ARG_B01) expect(player.price).toBe(calculatePlayerPrice(player.overall_rating))
  })
  it('selects by Argentine clubs, not nationality, and includes foreigners', () => {
    expect(ARG_B01.every(playedInArgentina)).toBe(true)
    expect(ARG_B01.some((player) => player.nationality !== 'ARG')).toBe(true)
  })
  it('rejects a duplicate of an existing player', () => {
    const existing = DRAFT_CATALOG[0]
    const clone = { ...ARG_B01[0], name: existing.name }
    expect(validateArgentinaBatch01([clone, ...ARG_B01.slice(1)], DRAFT_CATALOG).valid).toBe(false)
  })
})
