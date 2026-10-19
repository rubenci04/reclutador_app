import type { Player } from '../../types/player'
import type { Position } from '../../types/football'
import { DRAFT_SLOTS, type DraftLineup } from '../draft/draftTypes'
import { createSeededRandom, shuffleSeeded } from '../local-match/seededRandom'
import { personKey } from '../player-catalog/globalCollection'
import { catalogForMode } from '../themed-modes/modeCatalog'
import type { ThemedModeId } from '../themed-modes/modeTypes'
import { coachReserveFor } from '../coaches/coachRules'
import type { MatchConfig } from './matchConfig'
import type { RecruiterId } from './auctionTypes'

/**
 * Live draw for two different categories: each side gets its own seeded sequence of cards from ITS category and
 * decides on each one independently (sign at the base price or discard). There is no shared auction, so no bidding.
 * The engine only keeps the state consistent: a card that cannot be signed without breaking the eleven is skipped,
 * and a side without discards left must take the card in front of it.
 */
export const DUAL_SIDES: readonly RecruiterId[] = ['recruiter_one', 'recruiter_two']
export const DUAL_DISCARDS = 3
const CAPACITY: Readonly<Record<Position, number>> = { ARQ: 1, DEF: 4, MED: 3, DEL: 3 }
const POSITIONS = ['ARQ', 'DEF', 'MED', 'DEL'] as const

export type SkipReason = 'positionFull' | 'budget'
export interface DualEvent { readonly kind: 'sign' | 'discard' | 'skip'; readonly playerId: string; readonly price?: number; readonly reason?: SkipReason }
export interface DualSide {
  readonly category: ThemedModeId
  readonly deck: readonly string[]
  readonly cursor: number
  readonly signed: readonly { readonly playerId: string; readonly price: number }[]
  readonly discards: number
  /** Everything that happened since the side last acted, newest last (skips are automatic). */
  readonly events: readonly DualEvent[]
}
export interface DualDraft {
  readonly seed: string
  readonly config: MatchConfig
  /** Budget to spend on the eleven (the coach reserve is kept aside). */
  readonly budget: number
  readonly sides: Readonly<Record<RecruiterId, DualSide>>
}
export type DualError = 'auction_pool_unavailable'
export type DualCreation = { readonly ok: true; readonly draft: DualDraft } | { readonly ok: false; readonly error: DualError }

const byId = (catalog: readonly Player[]) => new Map(catalog.map((player) => [player.id, player]))
const counts = (side: DualSide, players: Map<string, Player>) => {
  const result: Record<Position, number> = { ARQ: 0, DEF: 0, MED: 0, DEL: 0 }
  for (const entry of side.signed) result[players.get(entry.playerId)!.position]++
  return result
}
const spent = (side: DualSide) => side.signed.reduce((sum, entry) => sum + entry.price, 0)

/** Can the missing slots still be filled with the cheapest of these cards? */
function completable(have: Record<Position, number>, left: number, remaining: readonly Player[]) {
  let need = 0
  for (const position of POSITIONS) {
    const missing = CAPACITY[position] - have[position]
    if (missing <= 0) continue
    const prices = remaining.filter((player) => player.position === position).map((player) => player.price).sort((a, b) => a - b)
    if (prices.length < missing) return false
    need += prices.slice(0, missing).reduce((sum, price) => sum + price, 0)
  }
  return need <= left
}

export const isSideComplete = (side: DualSide) => side.signed.length === DRAFT_SLOTS.length
export const dualComplete = (draft: DualDraft) => DUAL_SIDES.every((id) => isSideComplete(draft.sides[id]))
export const sideBudgetLeft = (draft: DualDraft, id: RecruiterId) => draft.budget - spent(draft.sides[id])
export const sideCounts = (draft: DualDraft, id: RecruiterId, catalog: readonly Player[]) => counts(draft.sides[id], byId(catalog))

export function createDualDraft(first: ThemedModeId, second: ThemedModeId, seed: string, config: MatchConfig): DualCreation {
  const budget = config.budget - (config.coaches ? coachReserveFor(config) : 0)
  const rarity = createSeededRandom(`${seed}:rarity`)
  const eligible = (mode: ThemedModeId) => catalogForMode(mode).filter((player) => player.overall_rating < 98 || rarity() < .25)
  const unique = (players: readonly Player[]) => [...new Map(players.map((player) => [personKey(player), player])).values()]
  const one = unique(eligible(first)); const two = unique(eligible(second))
  // A person who could appear in both draws goes to one side only, decided by the seed.
  const coin = createSeededRandom(`${seed}:overlap`)
  const shared = new Set(one.map(personKey).filter((key) => two.some((player) => personKey(player) === key)))
  const toFirst = new Set([...shared].filter(() => coin() < .5))
  const deckOne = one.filter((player) => !shared.has(personKey(player)) || toFirst.has(personKey(player)))
  const deckTwo = two.filter((player) => !shared.has(personKey(player)) || !toFirst.has(personKey(player)))
  const decks = [shuffleSeeded(deckOne, createSeededRandom(`${seed}:deck:one`)), shuffleSeeded(deckTwo, createSeededRandom(`${seed}:deck:two`))]
  const empty: Record<Position, number> = { ARQ: 0, DEF: 0, MED: 0, DEL: 0 }
  if (!decks.every((deck) => completable(empty, budget, deck))) return { ok: false, error: 'auction_pool_unavailable' }
  const side = (category: ThemedModeId, deck: readonly Player[]): DualSide => ({ category, deck: deck.map((player) => player.id), cursor: 0, signed: [], discards: DUAL_DISCARDS, events: [] })
  return { ok: true, draft: settleAll({ seed, config, budget, sides: { recruiter_one: side(first, decks[0]), recruiter_two: side(second, decks[1]) } }, byId([...deckOne, ...deckTwo])) }
}

export function currentCard(draft: DualDraft, id: RecruiterId, catalog: readonly Player[]): Player | null {
  const side = draft.sides[id]
  if (isSideComplete(side)) return null
  return byId(catalog).get(side.deck[side.cursor]) ?? null
}

function replaceSide(draft: DualDraft, id: RecruiterId, side: DualSide): DualDraft { return { ...draft, sides: { ...draft.sides, [id]: side } } }

/** Skips automatically every card that cannot be signed; stops at the first one that can, or when the side is complete. */
function settle(draft: DualDraft, id: RecruiterId, players: Map<string, Player>): DualDraft {
  let current = draft
  for (;;) {
    const side = current.sides[id]
    if (isSideComplete(side)) return current
    const card = players.get(side.deck[side.cursor])
    if (!card) return current
    const reason = signBlock(current, id, card, players)
    if (!reason) return current
    current = replaceSide(current, id, { ...side, cursor: side.cursor + 1, events: [...side.events, { kind: 'skip', playerId: card.id, reason }] })
  }
}
const settleAll = (draft: DualDraft, players: Map<string, Player>) => DUAL_SIDES.reduce((current, id) => settle(current, id, players), draft)

function signBlock(draft: DualDraft, id: RecruiterId, card: Player, players: Map<string, Player>): SkipReason | null {
  const side = draft.sides[id]; const have = counts(side, players)
  if (have[card.position] >= CAPACITY[card.position]) return 'positionFull'
  const left = draft.budget - spent(side)
  const after = { ...have, [card.position]: have[card.position] + 1 }
  const rest = side.deck.slice(side.cursor + 1).map((playerId) => players.get(playerId)!)
  return card.price <= left && completable(after, left - card.price, rest) ? null : 'budget'
}

/** Discarding is allowed with discards left and only when the rest of the draw can still complete the eleven. */
export function canDiscard(draft: DualDraft, id: RecruiterId, catalog: readonly Player[]) {
  const side = draft.sides[id]
  if (isSideComplete(side) || side.discards <= 0) return false
  const players = byId(catalog)
  return completable(counts(side, players), draft.budget - spent(side), side.deck.slice(side.cursor + 1).map((playerId) => players.get(playerId)!))
}

export type DualResult = { readonly ok: true; readonly draft: DualDraft } | { readonly ok: false; readonly error: 'complete' | 'not_allowed' }

export function signCard(draft: DualDraft, id: RecruiterId, catalog: readonly Player[]): DualResult {
  const players = byId(catalog); const side = draft.sides[id]
  const card = isSideComplete(side) ? undefined : players.get(side.deck[side.cursor])
  if (!card) return { ok: false, error: 'complete' }
  if (signBlock(draft, id, card, players)) return { ok: false, error: 'not_allowed' }
  const next = replaceSide(draft, id, { ...side, cursor: side.cursor + 1, signed: [...side.signed, { playerId: card.id, price: card.price }], events: [{ kind: 'sign', playerId: card.id, price: card.price }] })
  return { ok: true, draft: settle(next, id, players) }
}

export function discardCard(draft: DualDraft, id: RecruiterId, catalog: readonly Player[]): DualResult {
  const players = byId(catalog); const side = draft.sides[id]
  const card = isSideComplete(side) ? undefined : players.get(side.deck[side.cursor])
  if (!card) return { ok: false, error: 'complete' }
  if (!canDiscard(draft, id, catalog)) return { ok: false, error: 'not_allowed' }
  const next = replaceSide(draft, id, { ...side, cursor: side.cursor + 1, discards: side.discards - 1, events: [{ kind: 'discard', playerId: card.id }] })
  return { ok: true, draft: settle(next, id, players) }
}

/**
 * The computer's own decision on the card in front of it. It signs when the card is good for its slot and fair for what it has
 * left, discards otherwise while it can, and takes the card when it has no discard left.
 */
export function cpuAct(draft: DualDraft, id: RecruiterId, catalog: readonly Player[]): DualResult {
  const players = byId(catalog); const side = draft.sides[id]
  const card = isSideComplete(side) ? undefined : players.get(side.deck[side.cursor])
  if (!card) return { ok: false, error: 'complete' }
  if (!canDiscard(draft, id, catalog)) return signCard(draft, id, catalog)
  const slotsLeft = DRAFT_SLOTS.length - side.signed.length
  const fair = (draft.budget - spent(side)) / slotsLeft
  const samePosition = side.deck.slice(side.cursor).map((playerId) => players.get(playerId)!).filter((player) => player.position === card.position).map((player) => player.overall_rating).sort((a, b) => a - b)
  const median = samePosition[Math.floor(samePosition.length / 2)] ?? 0
  const good = card.overall_rating >= median && card.price <= fair * 1.6
  return good ? signCard(draft, id, catalog) : discardCard(draft, id, catalog)
}

/** The eleven of a finished side, placed in the first free slot of each position (the 4-3-3 the rest of the game starts from). */
export function sideLineup(side: DualSide, catalog: readonly Player[]): { readonly lineup: DraftLineup; readonly spent: number; readonly players: readonly Player[] } {
  const players = byId(catalog)
  const lineup = Object.fromEntries(DRAFT_SLOTS.map((slot) => [slot.id, null])) as DraftLineup
  for (const entry of side.signed) {
    const player = players.get(entry.playerId)!
    const slot = DRAFT_SLOTS.find((candidate) => candidate.position === player.position && !lineup[candidate.id])!
    lineup[slot.id] = player.id
  }
  return { lineup, spent: spent(side), players: side.signed.map((entry) => players.get(entry.playerId)!) }
}
