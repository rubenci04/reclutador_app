/**
 * Additive, reviewable metadata. Its absence means unknown, never false.
 * Canonical Player records and their stable plr_* IDs remain untouched.
 */
export type VerificationStatus = 'verified' | 'unverified' | 'unknown'
export type ExternalProvider = 'wikidata' | 'openfootball' | 'api_football' | 'sportmonks' | 'editorial'

export interface SourceReference {
  readonly provider: ExternalProvider
  readonly externalId?: string
  readonly url?: string
  readonly retrievedAt?: string
  readonly verification: VerificationStatus
}

export interface CareerSpell {
  readonly competitionIds?: readonly string[]
  readonly clubId: string
  readonly leagueId?: string
  readonly countryCode?: string
  /** Confederation of the league, never inferred from the footballer's nationality. */
  readonly leagueConfederation?: 'CONMEBOL' | 'UEFA'
  readonly startedYear?: number
  readonly endedYear?: number
  readonly source: SourceReference
}

export interface NationalTeamRecord {
  readonly associationCode: string
  readonly startedYear?: number
  readonly endedYear?: number
  readonly source: SourceReference
}

export interface CompetitionAppearance {
  readonly competitionId: string
  readonly editionId?: string
  readonly year?: number
  readonly source: SourceReference
}

export interface PlayerMetadata {
  readonly playerId: string
  readonly canonicalExternalIds?: readonly SourceReference[]
  readonly careers?: readonly CareerSpell[]
  readonly nationalTeam?: NationalTeamRecord
  readonly competitions?: readonly CompetitionAppearance[]
}

export type MetadataIndex = Readonly<Record<string, PlayerMetadata | undefined>>

/** No historical claims are supplied in this foundation; modes stay unavailable until reviewed data exists. */
export const EMPTY_METADATA: MetadataIndex = {}

export interface MetadataValidation { readonly valid: boolean; readonly issues: readonly string[] }

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }

function hasSource(value: unknown) {
  if (!isRecord(value)) return false
  return typeof value.provider === 'string' && ['wikidata', 'openfootball', 'api_football', 'sportmonks', 'editorial'].includes(value.provider)
    && typeof value.verification === 'string' && ['verified', 'unverified', 'unknown'].includes(value.verification)
}

/** Boundary validation for future import files. Unknown evidence is allowed; malformed evidence is not. */
export function validateMetadata(input: unknown, playerIds: ReadonlySet<string>): MetadataValidation {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { valid: false, issues: ['metadata_not_object'] }
  const issues: string[] = []
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!isRecord(value)) { issues.push(`invalid_entry:${key}`); continue }
    const record = value as Record<string, unknown>
    if (record.playerId !== key || !playerIds.has(key)) issues.push(`unknown_player:${key}`)
    for (const group of ['careers', 'competitions', 'canonicalExternalIds'] as const) {
      if (record[group] !== undefined && !Array.isArray(record[group])) issues.push(`invalid_${group}:${key}`)
    }
    for (const career of (record.careers as unknown[] | undefined) ?? []) {
      if (!isRecord(career) || typeof career.clubId !== 'string' || !hasSource(career.source)) issues.push(`invalid_career:${key}`)
    }
    for (const appearance of (record.competitions as unknown[] | undefined) ?? []) {
      if (!isRecord(appearance) || typeof appearance.competitionId !== 'string' || !hasSource(appearance.source)) issues.push(`invalid_competition:${key}`)
    }
    for (const external of (record.canonicalExternalIds as unknown[] | undefined) ?? []) {
      if (!hasSource(external)) issues.push(`invalid_external_id:${key}`)
    }
    if (record.nationalTeam !== undefined && (!isRecord(record.nationalTeam) || typeof record.nationalTeam.associationCode !== 'string' || !hasSource(record.nationalTeam.source))) issues.push(`invalid_national_team:${key}`)
  }
  return { valid: issues.length === 0, issues }
}
