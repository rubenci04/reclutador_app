import type { Player } from '../../types/player'
import { getClubIdentity } from './clubRegistry'
import { CAREER_STATUSES, type PlayerClubSnapshot } from './playerClubTypes'
import auditData from '../../data/player-clubs/2026-10-17.json'
import auditData20261018 from '../../data/player-clubs/2026-10-18.json'

/** Cut-off of the current review (H4). Earlier files are kept and still selectable by date. */
export const CLUB_AUDIT_AS_OF = '2026-10-18'
export const PLAYER_CLUB_AUDIT_2026_10_17 = auditData as readonly PlayerClubSnapshot[]
export const PLAYER_CLUB_AUDIT_2026_10_18 = auditData20261018 as readonly PlayerClubSnapshot[]
export const PLAYER_CLUB_AUDIT: readonly PlayerClubSnapshot[] = [...PLAYER_CLUB_AUDIT_2026_10_17, ...PLAYER_CLUB_AUDIT_2026_10_18]

/** Exact coverage over a catalogue, using each player's latest snapshot not after `asOfDate`. */
export function auditCoverage(catalog: readonly Player[], asOfDate = CLUB_AUDIT_AS_OF, snapshots: readonly PlayerClubSnapshot[] = PLAYER_CLUB_AUDIT) {
  const latest = (player: Player) => snapshots.filter((row) => row.playerId === player.id && row.asOfDate <= asOfDate).sort((a, b) => b.asOfDate.localeCompare(a.asOfDate) || b.revision - a.revision)[0]
  const rows = catalog.map(latest)
  const reviewed = rows.filter((row) => row !== undefined)
  const verified = reviewed.filter((row) => row.verificationStatus === 'VERIFIED')
  return {
    total: catalog.length, reviewed: reviewed.length, unreviewed: catalog.length - reviewed.length,
    verified: verified.length, active: verified.filter((row) => row.careerStatus === 'ACTIVE').length, retired: verified.filter((row) => row.careerStatus === 'RETIRED').length, freeAgent: verified.filter((row) => row.careerStatus === 'FREE_AGENT').length,
    pending: reviewed.length - verified.length,
  }
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
function https(value: unknown): value is string {
  try { return typeof value === 'string' && new URL(value).protocol === 'https:' } catch { return false }
}
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }

/** Import boundary: rejects unknown players/clubs, inconsistent states and invalid provenance. */
export function validatePlayerClubSnapshots(input: unknown, catalog: readonly Player[]) {
  const issues: string[] = []; const seen = new Set<string>()
  if (!Array.isArray(input)) return { valid: false, issues: ['not_array'] }
  for (const raw of input) {
    if (!record(raw)) { issues.push('invalid_record'); continue }
    const player = catalog.find((candidate) => candidate.id === raw.playerId)
    const key = `${raw.playerId}:${raw.asOfDate}:${raw.revision}`
    if (seen.has(key)) issues.push(`duplicate_snapshot:${key}`)
    seen.add(key)
    if (!player || raw.referenceClubId !== player.club_tag) issues.push(`invalid_reference:${key}`)
    if (typeof raw.referenceClubId !== 'string' || !getClubIdentity(raw.referenceClubId)) issues.push(`unknown_club:${key}`)
    if (!validDate(raw.asOfDate) || !Number.isInteger(raw.revision) || Number(raw.revision) < 1) issues.push(`invalid_revision_date:${key}`)
    if (!CAREER_STATUSES.includes(raw.careerStatus as never) || !['VERIFIED','PENDING','CONFLICT'].includes(String(raw.verificationStatus))) issues.push(`invalid_status:${key}`)
    if (!['PARTIAL','NOT_REVIEWED'].includes(String(raw.historyCoverage)) || typeof raw.auditNote !== 'string' || !raw.auditNote.trim()) issues.push(`invalid_audit:${key}`)
    if (raw.sourceUrl !== null && !https(raw.sourceUrl)) issues.push(`invalid_source:${key}`)
    if (raw.verificationStatus === 'VERIFIED' && (!https(raw.sourceUrl) || raw.careerStatus === 'UNKNOWN')) issues.push(`missing_evidence:${key}`)
    if (raw.verificationStatus !== 'VERIFIED' && (raw.currentClubId !== null || raw.careerStatus !== 'UNKNOWN')) issues.push(`unverified_current:${key}`)
    if (raw.careerStatus === 'ACTIVE') {
      if (typeof raw.currentClubId !== 'string' || !getClubIdentity(raw.currentClubId)) issues.push(`invalid_current:${key}`)
    } else if (raw.currentClubId !== null) issues.push(`status_has_club:${key}`)
    if (raw.announcedAt !== undefined && (!validDate(raw.announcedAt) || !validDate(raw.asOfDate) || raw.announcedAt > raw.asOfDate || !['VERIFIED','USER_SUPPLIED'].includes(String(raw.announcementDateVerification)))) issues.push(`invalid_announcement:${key}`)
    if (!Array.isArray(raw.clubHistory)) { issues.push(`invalid_history:${key}`); continue }
    for (const entry of raw.clubHistory) {
      if (!record(entry) || typeof entry.clubId !== 'string' || !getClubIdentity(entry.clubId) || !https(entry.sourceUrl) || !validDate(entry.asOfDate) || !validDate(raw.asOfDate) || entry.asOfDate > raw.asOfDate || !['VERIFIED','PENDING','CONFLICT'].includes(String(entry.verificationStatus))) { issues.push(`invalid_history:${key}`); continue }
      if (!record(entry.source) || entry.source.url !== entry.sourceUrl || entry.source.retrievedAt !== entry.asOfDate || (entry.verificationStatus === 'VERIFIED' && entry.source.verification !== 'verified')) issues.push(`history_evidence:${key}`)
      if ([entry.startedYear, entry.endedYear].some((year) => year !== undefined && (!Number.isInteger(year) || Number(year) < 1800 || Number(year) > Number(raw.asOfDate!.toString().slice(0,4)))) || (entry.startedYear !== undefined && entry.endedYear !== undefined && Number(entry.startedYear) > Number(entry.endedYear))) issues.push(`history_dates:${key}`)
    }
  }
  return { valid: issues.length === 0, issues }
}

/** Explicit date selection prevents a future refresh from silently replacing this audit. */
export function capturePlayerClubs(player: Player, asOfDate = CLUB_AUDIT_AS_OF, snapshots: readonly PlayerClubSnapshot[] = PLAYER_CLUB_AUDIT): PlayerClubSnapshot {
  const match = snapshots.filter((snapshot) => snapshot.playerId === player.id && snapshot.asOfDate <= asOfDate)
    .sort((a,b) => b.asOfDate.localeCompare(a.asOfDate) || b.revision-a.revision)[0]
  const result: PlayerClubSnapshot = match && validatePlayerClubSnapshots([match], [player]).valid ? match : { playerId:player.id, revision:1, referenceClubId:player.club_tag, currentClubId:null, careerStatus:'UNKNOWN', clubHistory:[], historyCoverage:'NOT_REVIEWED', asOfDate, sourceUrl:null, verificationStatus:'PENDING', auditNote:'Not reviewed or invalid evidence at this date.' }
  // Defensive copy for consumers that retain a match/report snapshot; never mutate the sports record.
  return structuredClone(result)
}
