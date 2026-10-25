import type { Player } from '../../types/player'
import { recordedCollection } from '../player-catalog/recordedCollections'
import { DRAFT_CATALOG } from '../draft/catalog'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { autoCompleteStep, beginBidding, budgetOf, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, rosterIds, startDuelMatch } from '../recruiter-duel/auctionEngine'
import type { AuctionTransition, RecruiterDuelGame, RecruiterId } from '../recruiter-duel/auctionTypes'
import { coachOffersFor } from '../recruiter-duel/coachHiring'
import { crossCategoryCatalog } from '../recruiter-duel/crossCategoryDraw'
import { dealFor } from './onlineDuel'

export type DuelVerification =
  | { readonly ok: true; readonly coverage: 'full' | 'partial' }
  | { readonly ok: false; readonly reason: 'deal' | 'coin' | 'replay' | 'teams' | 'spent' | 'roster' | 'match_result' }

const SIDES: readonly RecruiterId[] = ['recruiter_one', 'recruiter_two']
/** PostgreSQL stores jsonb with its own key order, so objects are compared by content, never by the order of their keys. */
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, entry]) => [key, canonical(entry)])) : value
const same = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
const PRE_TEAMS = ['LOBBY', 'COIN_TOSS', 'REVEAL_PLAYER', 'BIDDING', 'ROUND_RESULT', 'NEXT_ROUND', 'DISCARD_RESULT']

/** Same catalogue choice the duel page makes for a shared game. */
export function duelCatalog(game: RecruiterDuelGame): readonly Player[] {
  if (game.legacyCatalog || !game.manualBench) return DRAFT_CATALOG
  return recordedCollection(game.drawContext?.catalogKey) ?? (game.categoryPair ? crossCategoryCatalog(game.categoryPair.recruiter_one, game.categoryPair.recruiter_two) : catalogForMode(game.coachMode ?? 'GLOBAL_CLASSIC'))
}

/** Moves through the phases that need no decision (reveals, next card) until `target` or the first phase that waits for someone. */
function settle(game: RecruiterDuelGame, catalog: readonly Player[], target: string): RecruiterDuelGame {
  let current = game
  for (let step = 0; step < 100 && current.phase !== target; step++) {
    const next: AuctionTransition | null = current.phase === 'DISCARD_RESULT' ? revealDiscardReplacement(current)
      : current.phase === 'NEXT_ROUND' ? revealNextAuctionRound(current)
      : current.phase === 'REVEAL_PLAYER' ? beginBidding(current)
      : current.phase === 'ROUND_RESULT' ? nextAuctionRound(current, catalog)
      : null
    if (!next?.ok) break
    current = next.game
  }
  return current
}

/**
 * Re-runs a shared duel with the rules engine and compares it with the state received. Pure and deterministic.
 * Covered: the deal (cards and order come from the seed), the coin (the winner follows the server's toss), every bid, pass,
 * discard and award of the record (so prices, winners and spending), the teams during the auctions, who owns what after
 * them (signed players, coach and substitutes against the spending) and the match result (recomputed from the final squads
 * and the stored strategies). Not covered: the secret strategies themselves (the server holds them), the lineup order and
 * formation chosen by each player, and the configuration chosen by the host (it is fixed, not checked against a default).
 */
export function verifyDuelState(game: RecruiterDuelGame): DuelVerification {
  if (!game.manualBench || game.legacyCatalog || !game.config || !game.coachMode) return { ok: true, coverage: 'partial' }
  const catalog = duelCatalog(game)
  const byId = new Map(catalog.map((player) => [player.id, player] as const))
  const fail = (reason: Exclude<DuelVerification, { ok: true }>['reason']): DuelVerification => ({ ok: false, reason })

  // The toss: whoever called it wins when the server's face matches.
  if (game.coinTossWinner && (!game.coinCall || !game.coinResult || game.coinTossWinner !== (game.coinCall === game.coinResult ? 'recruiter_one' : 'recruiter_two'))) return fail('coin')
  if (game.phase === 'LOBBY' || !game.coinCall || !game.coinResult) return game.phase === 'LOBBY' || game.phase === 'COIN_TOSS' ? { ok: true, coverage: 'full' } : fail('coin')

  let initial: RecruiterDuelGame
  try { initial = dealFor(game.categoryPair?.recruiter_one ?? game.coachMode, game.categoryPair?.recruiter_two ?? game.coachMode, game.seed, game.config) } catch { return fail('deal') }
  if (game.phase === 'COIN_TOSS') return { ok: true, coverage: 'full' }

  const tossed = revealCoinToss({ ...initial, phase: 'COIN_TOSS', coinCall: game.coinCall, coinResult: game.coinResult })
  if (!tossed.ok) return fail('coin')
  let replay = tossed.game
  const apply = (result: AuctionTransition) => { if (result.ok) replay = result.game; return result.ok }
  for (const entry of game.record) {
    if (entry.type === 'coin_toss' || entry.type === 'discard') continue
    if (entry.type === 'cpu_decision') return fail('replay')
    if (entry.type === 'award') { if (entry.reason === 'auto_complete' && !apply(autoCompleteStep(settle(replay, catalog, 'BIDDING'), entry.winner, catalog))) return fail('replay'); continue }
    replay = settle(replay, catalog, 'BIDDING')
    if (!apply(entry.type === 'bid' ? placeBid(replay, entry.participant, entry.amount, catalog) : passAuction(replay, entry.participant, catalog))) return fail('replay')
  }
  // Every bid, pass, discard and award, in order, with the prices the engine derives.
  if (!same(replay.record, game.record)) return fail('replay')

  if (PRE_TEAMS.includes(game.phase)) {
    replay = settle(replay, catalog, game.phase)
    if (replay.phase !== game.phase) return fail('replay')
    if (!same(replay.teams, game.teams) || !same(replay.rounds, game.rounds) || replay.roundIndex !== game.roundIndex || replay.discardsRemaining !== game.discardsRemaining
      || !same(replay.currentBid, game.currentBid) || replay.activeParticipant !== game.activeParticipant || !same(replay.openingOrder, game.openingOrder)) return fail('teams')
    return { ok: true, coverage: 'full' }
  }

  replay = settle(replay, catalog, 'TEAMS_COMPLETED')
  if (replay.phase !== 'TEAMS_COMPLETED' || !same(replay.openingOrder, game.openingOrder)) return fail('replay')
  const owned = new Set<string>()
  for (const side of SIDES) {
    const signed = new Set(rosterIds(replay.teams[side]))
    const team = game.teams[side]
    const roster = rosterIds(team)
    if (roster.some((id) => !id) || new Set(roster).size !== roster.length || [...signed].some((id) => !roster.includes(id))) return fail('roster')
    // Anything beyond the signings is a substitute bought afterwards, priced by the catalogue.
    const bought = roster.filter((id) => id && !signed.has(id))
    if (bought.some((id) => !byId.has(id!))) return fail('roster')
    for (const id of roster) { if (owned.has(id!)) return fail('roster'); owned.add(id!) }
    const coachPrice = team.coachId ? team.coachPrice ?? NaN : 0
    if (team.coachId && !coachOffersFor(replay, side).some((coach) => coach.id === team.coachId && coach.price === coachPrice)) return fail('spent')
    const expected = replay.teams[side].spent + coachPrice + bought.reduce((total, id) => total + byId.get(id!)!.price, 0)
    if (team.spent !== expected || team.spent > budgetOf(game)) return fail('spent')
  }
  if (game.matchResult) {
    if (!game.strategies) return fail('match_result')
    const played = startDuelMatch({ ...game, phase: 'TEAMS_COMPLETED', matchResult: null }, catalog, game.strategies, !!game.matchResult.actionModel)
    if (!played.ok || !same(played.game.matchResult, game.matchResult)) return fail('match_result')
  }
  return { ok: true, coverage: 'full' }
}
