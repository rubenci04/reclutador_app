import { checkEconomicViability } from '../player-catalog/validateCatalog'
import { generateCpuTeam } from '../local-match/cpuTeam'
import type { Player } from '../../types/player'
import { CONMEBOL_ASSOCIATIONS, UEFA_ASSOCIATIONS } from './modes'
import type { MetadataIndex } from './metadata'
import type { ModeAvailability, ModeDiagnostic, ThemedModeDefinition } from './modeTypes'

function hasVerifiedCareer(playerId: string, rule: ThemedModeDefinition['rule'], metadata: MetadataIndex) {
  return metadata[playerId]?.careers?.some((career) => {
    if (career.source.verification !== 'verified') return false
    if (rule.clubId && career.clubId !== rule.clubId) return false
    if (rule.leagueId && career.leagueId !== rule.leagueId) return false
    if (rule.leagueCountryCode && career.countryCode !== rule.leagueCountryCode) return false
    if (rule.leagueConfederation && career.leagueConfederation !== rule.leagueConfederation) return false
    if (rule.careerYearRange && (career.startedYear === undefined || career.endedYear === undefined || career.endedYear < rule.careerYearRange[0] || career.startedYear > rule.careerYearRange[1])) return false
    return true
  }) ?? false
}

function hasVerifiedAppearance(playerId: string, competitionId: string, year: number | undefined, metadata: MetadataIndex) {
  return metadata[playerId]?.competitions?.some((appearance) => appearance.competitionId === competitionId && appearance.year === year && appearance.source.verification === 'verified') ?? false
}

function requiresMetadata(definition: ThemedModeDefinition) {
  const rule = definition.rule
  return Boolean(rule.clubId || rule.leagueId || rule.leagueCountryCode || rule.leagueConfederation || rule.careerYearRange || rule.competitionId)
}

/** Uses the same deterministic generator as a match, without relaxing themed rules. */
export function isCpuCompatible(players: readonly Player[]) {
  try {
    generateCpuTeam(players, 'themed-mode-compatibility')
    return true
  } catch {
    return false
  }
}

export function eligiblePlayers(catalog: readonly Player[], definition: ThemedModeDefinition, metadata: MetadataIndex): Player[] {
  return catalog.filter((player) => {
    const rule = definition.rule
    if (rule.nationality && player.nationality !== rule.nationality) return false
    if (rule.category && player.category !== rule.category) return false
    if (rule.era && player.era !== rule.era) return false
    if (rule.yearRange && (player.reference_year < rule.yearRange[0] || player.reference_year > rule.yearRange[1])) return false
    if (rule.confederation === 'CONMEBOL' && !CONMEBOL_ASSOCIATIONS.has(player.nationality)) return false
    if (rule.confederation === 'UEFA' && !UEFA_ASSOCIATIONS.has(player.nationality)) return false
    if ((rule.clubId || rule.leagueId || rule.leagueCountryCode || rule.leagueConfederation || rule.careerYearRange) && !hasVerifiedCareer(player.id, rule, metadata)) return false
    if (rule.competitionId && !hasVerifiedAppearance(player.id, rule.competitionId, rule.editionYear, metadata)) return false
    return true
  })
}

/** Calculates availability from verified records only; unknown metadata never becomes an implicit yes. */
export function evaluateMode(catalog: readonly Player[], definition: ThemedModeDefinition, metadata: MetadataIndex, allowedIds?: readonly string[]): { readonly players: readonly Player[]; readonly diagnostic: ModeDiagnostic } {
  const players = eligiblePlayers(catalog, definition, metadata)
  const metadataNeeded = requiresMetadata(definition)
  const economy = checkEconomicViability(players, allowedIds)
  const cpuCompatible = economy.status === 'feasible' && isCpuCompatible(players)
  let availability: ModeAvailability = 'available'
  let reason: ModeDiagnostic['reason'] = 'ready'
  if (metadataNeeded && players.length === 0) { availability = 'metadata_pending'; reason = 'metadata' }
  else if (economy.status === 'insufficient_players') { availability = 'insufficient_players'; reason = 'positions' }
  else if (economy.status === 'over_budget') { availability = 'over_budget'; reason = 'budget' }
  else if (!cpuCompatible) { availability = 'cpu_incompatible'; reason = 'cpu' }
  return { players, diagnostic: { id: definition.id, eligibleCount: players.length, availability, missingMetadata: metadataNeeded && players.length === 0, cpuCompatible, reason, minimumCost: economy.minimumCost } }
}
