import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { ROLE_PROFILES, roleAptitude, suggestLineup, type RoleProfiles } from './roleProfiles'
import { FORMATION_ROLES, ROLE_LINE } from './roles'

const lineup = generateCpuTeam(DRAFT_CATALOG, 'h1-roles').team.lineup

describe('role documentation', () => {
  it('ships empty: nothing is invented from the generic position, so every role is UNKNOWN', () => {
    expect(Object.keys(ROLE_PROFILES)).toHaveLength(0)
    for (const role of FORMATION_ROLES) expect(roleAptitude(lineup[role], role)).toBe('UNKNOWN')
    expect(suggestLineup(lineup)).toEqual(lineup)
  })
  it('reads NATURAL, ADAPTED and UNKNOWN only from documented profiles', () => {
    const winger = lineup.RW!
    const profiles: RoleProfiles = { [winger]: { natural: ['RW'], alternative: ['LW'], source: 'test fixture', verifiedAt: '2026-10-18' } }
    expect(roleAptitude(winger, 'RW', profiles)).toBe('NATURAL')
    expect(roleAptitude(winger, 'LW', profiles)).toBe('ADAPTED')
    expect(roleAptitude(winger, 'ST', profiles)).toBe('UNKNOWN')
    expect(roleAptitude(null, 'ST', profiles)).toBe('UNKNOWN')
  })
  it('suggests an initial order inside each line without moving anyone across lines or losing players', () => {
    const striker = lineup.LW!; const winger = lineup.ST!
    const profiles: RoleProfiles = {
      [striker]: { natural: ['ST'], alternative: [], source: 'test fixture', verifiedAt: '2026-10-18' },
      [winger]: { natural: ['LW'], alternative: ['RW'], source: 'test fixture', verifiedAt: '2026-10-18' },
    }
    const suggested = suggestLineup(lineup, profiles)
    expect(suggested.ST).toBe(striker); expect(suggested.LW).toBe(winger)
    expect(new Set(Object.values(suggested))).toEqual(new Set(Object.values(lineup)))
    for (const role of FORMATION_ROLES) {
      const before = DRAFT_CATALOG.find((p) => p.id === lineup[role])!; const after = DRAFT_CATALOG.find((p) => p.id === suggested[role])!
      expect(after.position).toBe(ROLE_LINE[role]); expect(before.position).toBe(after.position)
    }
    // untouched lines keep their order, and the result does not mutate the input
    expect(suggested.GK).toBe(lineup.GK); expect(suggested.LCB).toBe(lineup.LCB)
    expect(lineup.ST).toBe(winger)
  })
})
