import batch01 from '../../data/argentina_collection_v1/ARG-B01.json'
import batch02 from '../../data/argentina_collection_v1/ARG-B02.json'
import batch03 from '../../data/argentina_collection_v1/ARG-B03.json'
import batch04 from '../../data/argentina_collection_v1/ARG-B04.json'
import type { Position } from '../../types/football'
import type { Player } from '../../types/player'
import { ARGENTINA_EXPANSION, validateArgentinaCandidates, type ArgentinaCandidate, type ArgentinaCareer } from './argentinaExpansion'
import { canonicalClubId } from './clubRegistry'
import { normalizePlayerName } from './playerIdentity'
import { validatePlayer } from './validatePlayer'

/** Sporting record of one ARG-B01 player: facts are in `careers`/`evidence`, ratings are editorial. */
export interface ArgentinaRecord extends Player {
  readonly identityKey: string
  readonly inclusionReasons: ArgentinaCandidate['inclusionReasons']
  readonly careers: readonly ArgentinaCareer[]
  readonly evidence: string
  readonly sourceUrl: string
  readonly editorialStatus: 'SECONDARY_SOURCE_VERIFIED'
}

/** Ids of one batch (1-based): ARG-B01 is arg_001..arg_050, ARG-B02 arg_051..arg_100, and so on. */
export const batchIds = (batch: number): readonly string[] => Array.from({ length: 50 }, (_, index) => `arg_${String((batch - 1) * 50 + index + 1).padStart(3, '0')}`)
export const ARG_B01_IDS = batchIds(1)
/** Kept outside DRAFT_CATALOG: the Argentine mode is prepared, never enabled. */
export const ARG_B01: readonly ArgentinaRecord[] = batch01 as unknown as readonly ArgentinaRecord[]
export const ARG_B02: readonly ArgentinaRecord[] = batch02 as unknown as readonly ArgentinaRecord[]
/** Every Argentine record created so far, in id order. */
export const ARG_B03: readonly ArgentinaRecord[] = batch03 as unknown as readonly ArgentinaRecord[]
export const ARG_B04: readonly ArgentinaRecord[] = batch04 as unknown as readonly ArgentinaRecord[]
export const ARG_RECORDS: readonly ArgentinaRecord[] = [...ARG_B01, ...ARG_B02, ...ARG_B03, ...ARG_B04]

/** Candidate view used by the shared Argentine contract validator. */
export function toCandidate(record: ArgentinaRecord): ArgentinaCandidate {
  return { canonicalId: record.id, identityKey: record.identityKey, position: record.position as Position, careers: record.careers, inclusionReasons: record.inclusionReasons }
}

export interface ArgentinaBatchReport {
  readonly valid: boolean
  readonly issues: readonly string[]
  readonly positionCounts: Readonly<Record<Position, number>>
  readonly tierCounts: Readonly<Record<'S' | 'A' | 'B' | 'C' | 'D', number>>
  readonly clubCount: number
}

const tierOf = (overall: number) => (overall >= 94 ? 'S' : overall >= 89 ? 'A' : overall >= 84 ? 'B' : overall >= 79 ? 'C' : 'D') as 'S' | 'A' | 'B' | 'C' | 'D'

/** `previous` holds earlier Argentine batches so a person cannot appear twice across batches. */
export function validateArgentinaBatch(records: readonly ArgentinaRecord[], existing: readonly Player[], batch = 1, previous: readonly ArgentinaRecord[] = []): ArgentinaBatchReport {
  const ids = batchIds(batch)
  const issues: string[] = []
  const positionCounts: Record<Position, number> = { ARQ: 0, DEF: 0, MED: 0, DEL: 0 }
  const tierCounts = { S: 0, A: 0, B: 0, C: 0, D: 0 }
  const names = new Set([...existing, ...previous].map((player) => normalizePlayerName(player.name)))
  const seenNames = new Set<string>()
  const clubs = new Set<string>()
  if (records.length > 50) issues.push('over_quota')
  records.forEach((record, index) => {
    const result = validatePlayer(record, ids)
    if (!result.valid) issues.push(`${record.id ?? index}:${result.issues.map((issue) => issue.code).join(',')}`)
    if (record.id !== ids[index]) issues.push(`${record.id}:id_sequence`)
    const key = normalizePlayerName(record.name)
    if (names.has(key) || seenNames.has(key)) issues.push(`${record.id}:duplicate_name`)
    seenNames.add(key)
    if (record.editorialStatus !== 'SECONDARY_SOURCE_VERIFIED' || !record.sourceUrl.startsWith('https://') || record.evidence.trim().length < 20) issues.push(`${record.id}:evidence`)
    if (canonicalClubId(record.club_tag) === null) issues.push(`${record.id}:unknown_club_tag`)
    for (const career of record.careers) {
      clubs.add(career.clubId)
      if (canonicalClubId(career.clubId) === null) issues.push(`${record.id}:unknown_club:${career.clubId}`)
    }
    if (!record.careers.some((career) => career.countryCode === 'ARG')) issues.push(`${record.id}:no_argentine_career`)
    positionCounts[record.position] += 1
    tierCounts[tierOf(record.overall_rating)] += 1
  })
  const batchQuota = ARGENTINA_EXPANSION.batches[batch - 1].quotas
  for (const position of Object.keys(batchQuota) as Position[]) {
    if (positionCounts[position] > batchQuota[position]) issues.push(`quota:${position}`)
  }
  if (!validateArgentinaCandidates(records.map(toCandidate), existing, new Set(previous.map((record) => record.identityKey)))) issues.push('candidate_contract')
  return { valid: issues.length === 0, issues, positionCounts, tierCounts, clubCount: clubs.size }
}

/** Basis of the future "Fútbol Argentino" mode: played in Argentine clubs, never nationality. */
export const playedInArgentina = (record: Pick<ArgentinaRecord, 'careers'>) => record.careers.some((career) => career.countryCode === 'ARG')
