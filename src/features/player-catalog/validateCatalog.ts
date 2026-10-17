import {
  BATCH_IDS, BATCH_POSITION_QUOTAS, BATCH_SIZE, CATALOG_SIZE, CATALOG_VERSION,
  CATEGORY_POSITION_QUOTAS, CATEGORY_QUOTAS, DRAFT_BUDGET_MILLIONS, EXPECTED_PLAYER_IDS,
  FORMATION_QUOTAS, POSITION_QUOTAS, TIER_RULES, getBatchCategory, getBatchPlayerIds,
} from '../../data/catalogRules'
import { POSITIONS } from '../../types/football'
import { PLAYER_CATEGORIES, PLAYER_TIERS, type BatchId, type CatalogValidation, type EconomicViability, type Player, type ValidationIssue } from '../../types/player'
import { getPlayerTier } from './getPlayerTier'
import { normalizePlayerName, validatePlayer } from './validatePlayer'
import { playerIdentityKey } from './playerIdentity'

const notEvaluated = (): EconomicViability => ({ status: 'not_evaluated', minimumCost: null, playerIds: [] })

function inspectRecords(input: unknown) {
  const issues: ValidationIssue[] = []
  const positionCounts = { ARQ: 0, DEF: 0, MED: 0, DEL: 0 }
  const tierCounts = { S: 0, A: 0, B: 0, C: 0, D: 0 }
  const categoryCounts = { contemporary: 0, legend: 0 }
  const categoryPositionCounts = {
    contemporary: { ARQ: 0, DEF: 0, MED: 0, DEL: 0 },
    legend: { ARQ: 0, DEF: 0, MED: 0, DEL: 0 },
  }
  const players: Player[] = []
  const indexedPlayers: { player: Player; index: number }[] = []
  const ids = new Set<string>()
  const names = new Set<string>()
  if (!Array.isArray(input)) issues.push({ code: 'invalid_catalog', expected: 'array' })
  const records: readonly unknown[] = Array.isArray(input) ? input : []
  // Indexed iteration catches sparse-array holes, unlike map/forEach.
  for (let index = 0; index < records.length; index++) {
    const record = records[index]
    const result = validatePlayer(record)
    if (typeof record === 'object' && record !== null && !Array.isArray(record)) {
      const fields = record as Record<string, unknown>
      if (typeof fields.id === 'string') {
        if (ids.has(fields.id)) issues.push({ code: 'duplicate_id', index, field: 'id', actual: fields.id })
        ids.add(fields.id)
      }
      if (typeof fields.name === 'string' && normalizePlayerName(fields.name)) {
        const name = playerIdentityKey(fields.name)
        if (names.has(name)) issues.push({ code: 'duplicate_player', index, field: 'name', actual: fields.name })
        names.add(name)
      }
    }
    if (!result.valid) {
      issues.push(...result.issues.map((issue) => ({ ...issue, index })))
      continue
    }
    const player = result.player
    players.push(player)
    indexedPlayers.push({ player, index })
    positionCounts[player.position]++
    tierCounts[getPlayerTier(player.overall_rating)]++
    categoryCounts[player.category]++
    categoryPositionCounts[player.category][player.position]++
  }
  return { issues, players, indexedPlayers, ids, recordCount: records.length, positionCounts, tierCounts, categoryCounts, categoryPositionCounts }
}

function minimumEleven(players: readonly Player[]): EconomicViability {
  const chosen: Player[] = []
  for (const position of POSITIONS) {
    const candidates = players.filter((player) => player.position === position)
      .sort((a, b) => a.price - b.price || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    if (candidates.length < FORMATION_QUOTAS[position]) {
      return { status: 'insufficient_players', minimumCost: null, playerIds: [] }
    }
    chosen.push(...candidates.slice(0, FORMATION_QUOTAS[position]))
  }
  const minimumCost = chosen.reduce((sum, player) => sum + player.price, 0)
  return { status: minimumCost <= DRAFT_BUDGET_MILLIONS ? 'feasible' : 'over_budget', minimumCost, playerIds: chosen.map((player) => player.id) }
}

/** Reusable subset proof; never implies full-catalog approval or implements CPU selection. */
export function checkEconomicViability(input: unknown): EconomicViability {
  const inspected = inspectRecords(input)
  return inspected.issues.length ? notEvaluated() : minimumEleven(inspected.players)
}

function validateScope(input: unknown, batchId?: BatchId): CatalogValidation {
  const inspected = inspectRecords(input)
  const { issues, players, ids, recordCount, positionCounts, tierCounts, categoryCounts, categoryPositionCounts } = inspected
  const hasRecordErrors = issues.length > 0
  const expectedCount = batchId ? BATCH_SIZE : CATALOG_SIZE
  if (recordCount !== expectedCount) issues.push({ code: 'invalid_count', expected: expectedCount, actual: recordCount })
  const expectedIds = batchId ? getBatchPlayerIds(batchId) : EXPECTED_PLAYER_IDS
  for (const id of expectedIds) {
    if (!ids.has(id)) issues.push({ code: 'missing_id', field: 'id', expected: id })
  }
  if (batchId) {
    for (const { player, index } of inspected.indexedPlayers) {
      if (!expectedIds.includes(player.id)) issues.push({ code: 'invalid_id', index, field: 'id', actual: player.id, expected: batchId })
      if (player.category !== getBatchCategory(batchId)) issues.push({ code: 'batch_category', index, field: 'category', expected: getBatchCategory(batchId), actual: player.category })
    }
  }
  const positionQuotas = batchId ? BATCH_POSITION_QUOTAS : POSITION_QUOTAS
  for (const position of POSITIONS) {
    if (positionCounts[position] !== positionQuotas[position]) {
      issues.push({ code: 'position_distribution', field: position, expected: positionQuotas[position], actual: positionCounts[position] })
    }
  }
  for (const tier of PLAYER_TIERS) {
    const expected = batchId ? TIER_RULES[tier].count / BATCH_IDS.length : TIER_RULES[tier].count
    if (tierCounts[tier] !== expected) issues.push({ code: 'tier_distribution', field: tier, expected, actual: tierCounts[tier] })
  }
  if (!batchId) {
    for (const category of PLAYER_CATEGORIES) {
      if (categoryCounts[category] !== CATEGORY_QUOTAS[category]) {
        issues.push({ code: 'category_distribution', field: category, expected: CATEGORY_QUOTAS[category], actual: categoryCounts[category] })
      }
      for (const position of POSITIONS) {
        const actual = categoryPositionCounts[category][position]
        const expected = CATEGORY_POSITION_QUOTAS[category][position]
        if (actual !== expected) issues.push({ code: 'category_position_distribution', field: `${category}.${position}`, expected, actual })
      }
    }
  }
  // Only complete, structurally consistent catalogs receive a global economic proof.
  const economy = !batchId && issues.length === 0 ? minimumEleven(players) : notEvaluated()
  if (economy.status === 'over_budget') issues.push({ code: 'budget_exceeded', expected: DRAFT_BUDGET_MILLIONS, actual: economy.minimumCost })
  if (economy.status === 'insufficient_players') issues.push({ code: 'insufficient_positions', expected: '1 ARQ + 4 DEF + 3 MED + 3 DEL' })
  const status = issues.length === 0 ? 'approved' : !batchId && !hasRecordErrors && recordCount < CATALOG_SIZE ? 'pending' : 'invalid'
  return {
    mode: batchId ? 'partial' : 'complete', status, valid: status === 'approved', issues,
    validPlayerCount: players.length, positionCounts, tierCounts, categoryCounts, categoryPositionCounts, economy,
  }
}

/** Full validation always requires 500 players; no implicit small-fixture mode. */
export function validateCatalog(input: unknown): CatalogValidation { return validateScope(input) }

export function validateBatch(input: unknown, batchId: BatchId): CatalogValidation {
  if (!BATCH_IDS.includes(batchId)) {
    const result = validateScope(input)
    return { ...result, mode: 'partial', status: 'invalid', valid: false, issues: [{ code: 'unexpected_batch', actual: batchId }, ...result.issues], economy: notEvaluated() }
  }
  return validateScope(input, batchId)
}

export function validateVersionedCatalog(input: unknown): CatalogValidation {
  const record = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {}
  const result = validateCatalog(record.players)
  if (record.version === CATALOG_VERSION) return result
  return { ...result, status: 'invalid', valid: false, economy: notEvaluated(), issues: [{ code: 'invalid_version', field: 'version', expected: CATALOG_VERSION, actual: record.version }, ...result.issues] }
}
