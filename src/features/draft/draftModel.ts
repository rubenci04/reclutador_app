import { DRAFT_BUDGET_MILLIONS } from '../../data/catalogRules'
import { getPlayerTier } from '../player-catalog/getPlayerTier'
import type { Player, PlayerTier } from '../../types/player'
import { DRAFT_SLOT_IDS, DRAFT_SLOTS, type DraftLineup, type DraftSlotId, type DraftSummary } from './draftTypes'

export const DRAFT_STORAGE_VERSION = 1

export function createEmptyLineup(): DraftLineup {
  return Object.fromEntries(DRAFT_SLOT_IDS.map((slot) => [slot, null])) as DraftLineup
}

export function playerById(players: readonly Player[]) {
  return new Map(players.map((player) => [player.id, player] as const))
}

function selectedIds(lineup: DraftLineup) {
  return new Set(DRAFT_SLOT_IDS.flatMap((slot) => lineup[slot] ? [lineup[slot]] : []))
}

export function remainingMinimumCost(lineup: DraftLineup, players: readonly Player[]): number | null {
  const selected = selectedIds(lineup)
  let total = 0
  for (const position of ['ARQ', 'DEF', 'MED', 'DEL'] as const) {
    const openCount = DRAFT_SLOTS.filter((slot) => slot.position === position && !lineup[slot.id]).length
    const cheapest = players.filter((player) => player.position === position && !selected.has(player.id))
      .sort((a, b) => a.price - b.price || a.id.localeCompare(b.id)).slice(0, openCount)
    if (cheapest.length !== openCount) return null
    total += cheapest.reduce((sum, player) => sum + player.price, 0)
  }
  return total
}

export function summarizeDraft(lineup: DraftLineup, players: readonly Player[]): DraftSummary {
  const byId = playerById(players)
  const selectedPlayers = DRAFT_SLOT_IDS.flatMap((slot) => {
    const id = lineup[slot]
    const player = id ? byId.get(id) : undefined
    return player ? [player] : []
  })
  const spent = selectedPlayers.reduce((total, player) => total + player.price, 0)
  const selectedCount = selectedPlayers.length
  const minimumCompletionCost = remainingMinimumCost(lineup, players)
  const canCompleteWithinBudget = minimumCompletionCost !== null && spent + minimumCompletionCost <= DRAFT_BUDGET_MILLIONS
  const tiers = { S: 0, A: 0, B: 0, C: 0, D: 0 } satisfies Record<PlayerTier, number>
  selectedPlayers.forEach((player) => { tiers[getPlayerTier(player.overall_rating)]++ })
  return {
    selectedPlayers, selectedCount, spent, remaining: DRAFT_BUDGET_MILLIONS - spent,
    averageRating: selectedCount ? Math.round(selectedPlayers.reduce((sum, player) => sum + player.overall_rating, 0) / selectedCount) : null,
    tierCounts: tiers, minimumCompletionCost, canCompleteWithinBudget,
    canConfirm: selectedCount === DRAFT_SLOT_IDS.length && spent <= DRAFT_BUDGET_MILLIONS,
  }
}

export function validatePersistedDraft(input: unknown, players: readonly Player[]) {
  if (typeof input !== 'object' || input === null) return { valid: false as const, lineup: createEmptyLineup(), confirmed: false }
  const record = input as Record<string, unknown>
  if (record.schema !== DRAFT_STORAGE_VERSION || typeof record.confirmed !== 'boolean' || typeof record.lineup !== 'object' || record.lineup === null) {
    return { valid: false as const, lineup: createEmptyLineup(), confirmed: false }
  }
  const raw = record.lineup as Record<string, unknown>
  if (Object.keys(raw).length !== DRAFT_SLOT_IDS.length || Object.keys(raw).some((key) => !DRAFT_SLOT_IDS.includes(key as DraftSlotId))) {
    return { valid: false as const, lineup: createEmptyLineup(), confirmed: false }
  }
  const byId = playerById(players)
  const lineup = createEmptyLineup()
  const ids = new Set<string>()
  for (const slot of DRAFT_SLOTS) {
    const value = raw[slot.id]
    if (value !== null && typeof value !== 'string') return { valid: false as const, lineup: createEmptyLineup(), confirmed: false }
    if (!value) continue
    const player = byId.get(value)
    if (!player || player.position !== slot.position || ids.has(value)) return { valid: false as const, lineup: createEmptyLineup(), confirmed: false }
    ids.add(value)
    lineup[slot.id] = value
  }
  const summary = summarizeDraft(lineup, players)
  if (summary.spent > DRAFT_BUDGET_MILLIONS || !summary.canCompleteWithinBudget || (record.confirmed && !summary.canConfirm)) {
    return { valid: false as const, lineup: createEmptyLineup(), confirmed: false }
  }
  return { valid: true as const, lineup, confirmed: record.confirmed }
}
