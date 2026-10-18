import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { calculatePlayerPrice } from './calculatePlayerPrice'
import { ARG_B01, ARG_B02, ARG_RECORDS, batchIds, playedInArgentina, validateArgentinaBatch } from './argentinaBatches'
import { normalizePlayerName } from './playerIdentity'

const BATCHES = [{ number: 1, records: ARG_B01 }, { number: 2, records: ARG_B02 }] as const

describe.each(BATCHES)('Argentine batch $number', ({ number, records }) => {
  const previous = ARG_RECORDS.filter((record) => !records.includes(record) && record.id < records[0].id)
  it('passes the batch validator with the planned quotas', () => {
    const report = validateArgentinaBatch(records, DRAFT_CATALOG, number, previous)
    expect(report.issues).toEqual([])
    expect(records).toHaveLength(50)
    expect(report.positionCounts).toEqual({ ARQ: 6, DEF: 16, MED: 15, DEL: 13 })
  })
  it('does not concentrate in the top tier and spans many clubs', () => {
    const report = validateArgentinaBatch(records, DRAFT_CATALOG, number, previous)
    expect(report.tierCounts.S).toBeLessThanOrEqual(5)
    expect(report.clubCount).toBeGreaterThanOrEqual(25)
    expect(new Set(records.map((player) => player.club_tag)).size).toBeGreaterThanOrEqual(10)
  })
  it('keeps ids in the batch range and out of the 150-player catalog', () => {
    const ids = new Set(DRAFT_CATALOG.map((player) => player.id))
    const names = new Set(DRAFT_CATALOG.map((player) => normalizePlayerName(player.name)))
    expect(records.map((player) => player.id)).toEqual(batchIds(number))
    for (const player of records) { expect(ids.has(player.id)).toBe(false); expect(names.has(normalizePlayerName(player.name))).toBe(false) }
    expect(new Set(records.map((player) => player.identityKey)).size).toBe(50)
  })
  it('prices every record with the centralized formula', () => {
    for (const player of records) expect(player.price).toBe(calculatePlayerPrice(player.overall_rating))
  })
  it('selects by Argentine clubs, not nationality', () => {
    expect(records.every(playedInArgentina)).toBe(true)
  })
})

describe('across batches', () => {
  it('has no person twice and keeps foreigners eligible', () => {
    expect(new Set(ARG_RECORDS.map((player) => player.identityKey)).size).toBe(ARG_RECORDS.length)
    expect(new Set(ARG_RECORDS.map((player) => normalizePlayerName(player.name))).size).toBe(ARG_RECORDS.length)
    expect(ARG_RECORDS.some((player) => player.nationality !== 'ARG')).toBe(true)
  })
  it('rejects a duplicate of an existing or an earlier player', () => {
    const existing = { ...ARG_B01[0], name: DRAFT_CATALOG[0].name }
    expect(validateArgentinaBatch([existing, ...ARG_B01.slice(1)], DRAFT_CATALOG).valid).toBe(false)
    const repeated = { ...ARG_B02[0], name: ARG_B01[0].name }
    expect(validateArgentinaBatch([repeated, ...ARG_B02.slice(1)], DRAFT_CATALOG, 2, ARG_B01).valid).toBe(false)
  })
})
