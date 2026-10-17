import { describe, expect, it } from 'vitest'
import { DRAFT_SLOT_IDS, DRAFT_SLOTS } from '../draft/draftTypes'
import { createEmptyLineup, validatePersistedDraft } from '../draft/draftModel'
import { DRAFT_CATALOG } from '../draft/catalog'
import { swapWithinLine } from './lineupOrdering'
import { FORMATION_ROLES, ROLE_LINE, migrateLegacyLineupKeys } from './roles'
import { generateCpuTeam } from '../local-match/cpuTeam'

const filled = () => Object.fromEntries(DRAFT_SLOT_IDS.map((slot) => [slot, `p_${slot}`])) as ReturnType<typeof createEmptyLineup>

describe('formation roles', () => {
  it('defines the eleven 4-3-3 roles with CDM and keeps internal line codes', () => {
    expect([...FORMATION_ROLES].sort()).toEqual(['CDM', 'GK', 'LB', 'LCB', 'LCM', 'LW', 'RB', 'RCB', 'RCM', 'RW', 'ST'])
    expect(FORMATION_ROLES.filter((role) => ROLE_LINE[role] === 'ARQ')).toEqual(['GK'])
    for (const slot of DRAFT_SLOTS) expect(ROLE_LINE[slot.id]).toBe(slot.position)
  })
})

describe('swapWithinLine', () => {
  it('swaps two players of the same line without mutating the input', () => {
    const lineup = filled(); const before = { ...lineup }
    const result = swapWithinLine(lineup, 'LCB', 'RCB')
    if (!result.ok) throw new Error(result.error)
    expect(result.lineup.LCB).toBe('p_RCB'); expect(result.lineup.RCB).toBe('p_LCB')
    expect(lineup).toEqual(before); expect(result.lineup).not.toBe(lineup)
    expect([...Object.values(result.lineup)].sort()).toEqual([...Object.values(lineup)].sort())
  })
  it('swaps across the three forwards and the three midfielders', () => {
    expect(swapWithinLine(filled(), 'LW', 'ST').ok).toBe(true)
    expect(swapWithinLine(filled(), 'CDM', 'RCM').ok).toBe(true)
  })
  it('rejects swaps between lines and never moves the goalkeeper', () => {
    for (const slot of FORMATION_ROLES.filter((role) => role !== 'GK')) expect(swapWithinLine(filled(), 'GK', slot)).toEqual({ ok: false, error: 'different_line' })
    expect(swapWithinLine(filled(), 'LB', 'ST')).toEqual({ ok: false, error: 'different_line' })
    expect(swapWithinLine(filled(), 'GK', 'GK')).toEqual({ ok: false, error: 'same_slot' })
  })
  it('returns controlled errors for empty and unknown slots', () => {
    expect(swapWithinLine({ ...filled(), LB: null }, 'LB', 'RB')).toEqual({ ok: false, error: 'empty_slot' })
    expect(swapWithinLine(filled(), 'CM' as never, 'RCM')).toEqual({ ok: false, error: 'unknown_slot' })
  })
})

describe('legacy CM slot migration', () => {
  it('renames CM to CDM without altering other keys', () => {
    expect(migrateLegacyLineupKeys({ CM: 'a', GK: 'b' })).toEqual({ CDM: 'a', GK: 'b' })
    const current = { CDM: 'a' }
    expect(migrateLegacyLineupKeys(current)).toBe(current)
  })
  it('restores a persisted draft saved with the CM slot', () => {
    const team = generateCpuTeam(DRAFT_CATALOG, 'legacy-cm').team.lineup
    const { CDM, ...rest } = team
    const restored = validatePersistedDraft({ schema: 1, confirmed: true, lineup: { ...rest, CM: CDM } }, DRAFT_CATALOG)
    expect(restored.valid).toBe(true)
    expect(restored.lineup.CDM).toBe(CDM)
  })
})
