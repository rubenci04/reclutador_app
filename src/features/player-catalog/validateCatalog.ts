import { CATALOG_SIZE, CATALOG_VERSION, DRAFT_BUDGET_MILLIONS, EXPECTED_PLAYER_IDS, FORMATION_QUOTAS, POSITION_QUOTAS, TIER_RULES } from '../../data/catalogRules'
import { POSITIONS } from '../../types/football'
import { PLAYER_TIERS, type CatalogValidation, type EconomicViability, type Player, type ValidationIssue } from '../../types/player'
import { getPlayerTier } from './getPlayerTier'
import { normalizePlayerName, validatePlayer } from './validatePlayer'

function checkEconomy(players: readonly Player[]): EconomicViability {
  const chosen: Player[] = []
  for (const position of POSITIONS) {
    const candidates = players.filter((player) => player.position === position)
      .sort((a, b) => a.price - b.price || a.id.localeCompare(b.id))
    if (candidates.length < FORMATION_QUOTAS[position]) {
      return { status: 'insufficient_players', minimumCost: null, playerIds: [] }
    }
    chosen.push(...candidates.slice(0, FORMATION_QUOTAS[position]))
  }
  const minimumCost = chosen.reduce((sum, player) => sum + player.price, 0)
  return { status: minimumCost <= DRAFT_BUDGET_MILLIONS ? 'feasible' : 'over_budget', minimumCost, playerIds: chosen.map((player) => player.id) }
}

/** Validates untrusted arrays; small fixtures still receive full-catalog quota errors. */
export function validateCatalog(input: unknown): CatalogValidation {
  const issues: ValidationIssue[] = []
  const positionCounts = { ARQ: 0, DEF: 0, MED: 0, DEL: 0 }
  const tierCounts = { S: 0, A: 0, B: 0, C: 0, D: 0 }
  const players: Player[] = []
  const ids = new Set<string>()
  const names = new Set<string>()
  let unsafeEconomy = false
  if (!Array.isArray(input)) issues.push({ code: 'invalid_catalog', expected: 'array' })
  const records: readonly unknown[] = Array.isArray(input) ? input : []
  if (records.length !== CATALOG_SIZE) issues.push({ code: 'invalid_count', expected: CATALOG_SIZE, actual: records.length })
  // Indexed iteration deliberately catches sparse-array holes as invalid records.
  for (let index = 0; index < records.length; index++) {
    const record = records[index]
    const result = validatePlayer(record)
    if (typeof record === 'object' && record !== null && !Array.isArray(record)) {
      const fields = record as Record<string, unknown>
      if (typeof fields.id === 'string') {
        if (ids.has(fields.id)) { issues.push({ code: 'duplicate_id', index, field: 'id', actual: fields.id }); unsafeEconomy = true }
        ids.add(fields.id)
      }
      if (typeof fields.name === 'string' && normalizePlayerName(fields.name)) {
        const name = normalizePlayerName(fields.name)
        if (names.has(name)) { issues.push({ code: 'duplicate_player', index, field: 'name', actual: fields.name }); unsafeEconomy = true }
        names.add(name)
      }
    }
    if (!result.valid) {
      issues.push(...result.issues.map((issue) => ({ ...issue, index })))
      unsafeEconomy = true
      continue
    }
    players.push(result.player)
    positionCounts[result.player.position]++
    tierCounts[getPlayerTier(result.player.overall_rating)]++
  }
  for (const id of EXPECTED_PLAYER_IDS) {
    if (!ids.has(id)) issues.push({ code: 'missing_id', field: 'id', expected: id })
  }
  for (const position of POSITIONS) {
    if (positionCounts[position] !== POSITION_QUOTAS[position]) {
      issues.push({ code: 'position_distribution', field: position, expected: POSITION_QUOTAS[position], actual: positionCounts[position] })
    }
  }
  for (const tier of PLAYER_TIERS) {
    if (tierCounts[tier] !== TIER_RULES[tier].count) {
      issues.push({ code: 'tier_distribution', field: tier, expected: TIER_RULES[tier].count, actual: tierCounts[tier] })
    }
  }
  const economy: EconomicViability = unsafeEconomy
    ? { status: 'not_evaluated', minimumCost: null, playerIds: [] }
    : checkEconomy(players)
  if (economy.status === 'over_budget') issues.push({ code: 'budget_exceeded', expected: DRAFT_BUDGET_MILLIONS, actual: economy.minimumCost })
  if (economy.status === 'insufficient_players') issues.push({ code: 'insufficient_positions', expected: '1 ARQ + 4 DEF + 3 MED + 3 DEL' })
  return { valid: issues.length === 0, issues, validPlayerCount: players.length, positionCounts, tierCounts, economy }
}

/** Envelope validation keeps the version explicit without weakening array validation. */
export function validateVersionedCatalog(input: unknown): CatalogValidation {
  const record = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {}
  const result = validateCatalog(record.players)
  if (record.version === CATALOG_VERSION) return result
  return { ...result, valid: false, issues: [{ code: 'invalid_version', field: 'version', expected: CATALOG_VERSION, actual: record.version }, ...result.issues] }
}
