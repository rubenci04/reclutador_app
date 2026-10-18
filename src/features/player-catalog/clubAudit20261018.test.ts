import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { PLAYER_CLUB_AUDIT, PLAYER_CLUB_AUDIT_2026_10_17, PLAYER_CLUB_AUDIT_2026_10_18, auditCoverage, capturePlayerClubs, validatePlayerClubSnapshots } from './playerClubs'
import { getClubIdentity } from './clubRegistry'

describe('current club review of 2026-10-18 (H4)', () => {
  it('keeps both dated files valid, unique per player/date and anchored to the untouched sporting reference', () => {
    expect(PLAYER_CLUB_AUDIT_2026_10_17).toHaveLength(25)
    expect(validatePlayerClubSnapshots(PLAYER_CLUB_AUDIT, DRAFT_CATALOG)).toEqual({ valid: true, issues: [] })
    expect(new Set(PLAYER_CLUB_AUDIT_2026_10_18.map((row) => row.playerId)).size).toBe(PLAYER_CLUB_AUDIT_2026_10_18.length)
    for (const row of PLAYER_CLUB_AUDIT_2026_10_18) {
      expect(row.asOfDate).toBe('2026-10-18')
      expect(row.referenceClubId).toBe(DRAFT_CATALOG.find((player) => player.id === row.playerId)!.club_tag)
    }
  })

  it('never turns missing evidence into a current club, a retirement or a free agent', () => {
    for (const row of PLAYER_CLUB_AUDIT_2026_10_18) {
      if (row.verificationStatus === 'PENDING') expect(row).toMatchObject({ currentClubId: null, careerStatus: 'UNKNOWN' })
      if (row.careerStatus === 'ACTIVE') { expect(getClubIdentity(row.currentClubId!)).toBeDefined(); expect(row.sourceUrl).toMatch(/^https:\/\//); expect(row.clubHistory.some((spell) => spell.clubId === row.currentClubId)).toBe(true) }
      if (row.careerStatus === 'RETIRED') { expect(row.currentClubId).toBeNull(); expect(row.sourceUrl).toMatch(/^https:\/\//) }
      expect(row.careerStatus).not.toBe('FREE_AGENT')
    }
  })

  it('reports coverage over the 150 originals exactly and the audit document states the same figures', () => {
    const coverage = auditCoverage(DRAFT_CATALOG)
    expect(coverage.total).toBe(150)
    expect(coverage.reviewed + coverage.unreviewed).toBe(150)
    expect(coverage.verified + coverage.pending).toBe(coverage.reviewed)
    expect(coverage.active + coverage.retired + coverage.freeAgent).toBe(coverage.verified)
    const document = readFileSync('docs/CURRENT_CLUB_AUDIT.md', 'utf8')
    expect(document).toContain(`Cobertura exacta al 2026-10-18: ${coverage.reviewed}/150 revisados`)
    expect(document).toContain(`${coverage.verified} verificados`)
    expect(document).toContain(`${coverage.pending} pendientes`)
    expect(document).toContain(`${coverage.unreviewed} sin revisar`)
  })

  it('selects the review by date without rewriting history and leaves the sporting data alone', () => {
    const messi = DRAFT_CATALOG.find((player) => player.id === 'plr_038')!
    expect(capturePlayerClubs(messi, '2026-10-17').asOfDate).toBe('2026-10-17')
    expect(capturePlayerClubs(messi)).toMatchObject({ currentClubId: 'inter_miami', careerStatus: 'ACTIVE' })
    const romero = DRAFT_CATALOG.find((player) => player.id === 'plr_016')!
    expect(capturePlayerClubs(romero)).toMatchObject({ currentClubId: 'atletico_madrid', referenceClubId: 'tottenham_hotspur' })
    expect(romero.club_tag).toBe('tottenham_hotspur')
  })
})
