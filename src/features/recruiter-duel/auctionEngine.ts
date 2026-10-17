import { DRAFT_BUDGET_MILLIONS } from '../../data/catalogRules'
import type { Player } from '../../types/player'
import { createEmptyLineup, summarizeDraft } from '../draft/draftModel'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { MATCH_RULES_VERSION } from '../local-match/matchTypes'
import { createSeededRandom, shuffleSeeded } from '../local-match/seededRandom'
import { simulateMatch } from '../local-match/simulator'
import type { AuctionCreation, AuctionPair, AuctionTransition, RecruiterDuelGame, RecruiterId, RecruiterTeam, RoundAward } from './auctionTypes'

const FIRST: RecruiterId = 'recruiter_one'
const SECOND: RecruiterId = 'recruiter_two'
const opponent = (participant: RecruiterId): RecruiterId => participant === FIRST ? SECOND : FIRST
const emptyTeam = (): RecruiterTeam => ({ lineup: createEmptyLineup(), spent: 0 })

function playerMap(catalog: readonly Player[]) { return new Map(catalog.map((player) => [player.id, player] as const)) }
function player(pair: AuctionPair, catalog: Map<string, Player>, alternate = false) { return catalog.get(alternate ? pair.alternateId : pair.primaryId)! }

function canFinish(pairs: readonly AuctionPair[], fromIndex: number, leftSpent: number, rightSpent: number, catalog: Map<string, Player>) {
  let states = new Set([`${leftSpent}:${rightSpent}`])
  for (let index = fromIndex; index < pairs.length; index++) {
    const pair = pairs[index]; const primary = player(pair, catalog); const alternate = player(pair, catalog, true)
    const next = new Set<string>()
    for (const state of states) {
      const [left, right] = state.split(':').map(Number)
      if (left + primary.price <= DRAFT_BUDGET_MILLIONS && right + alternate.price <= DRAFT_BUDGET_MILLIONS) next.add(`${left + primary.price}:${right + alternate.price}`)
      if (left + alternate.price <= DRAFT_BUDGET_MILLIONS && right + primary.price <= DRAFT_BUDGET_MILLIONS) next.add(`${left + alternate.price}:${right + primary.price}`)
    }
    states = next
    if (!states.size) return false
  }
  return states.size > 0
}

function createPairs(catalog: readonly Player[], seed: string): AuctionPair[] | null {
  const random = createSeededRandom(`${seed}:pool`)
  const pairs: AuctionPair[] = []
  for (const slot of DRAFT_SLOTS) {
    const already = new Set(pairs.flatMap((pair) => [pair.primaryId, pair.alternateId]))
    const options = shuffleSeeded(catalog.filter((candidate) => candidate.position === slot.position && !already.has(candidate.id)), random)
    const primary = options[0]; const alternate = options[1]
    if (!primary || !alternate) return null
    pairs.push({ slotId: slot.id, position: slot.position, primaryId: primary.id, alternateId: alternate.id })
  }
  const ordered = shuffleSeeded(pairs, random)
  return canFinish(ordered, 0, 0, 0, playerMap(catalog)) ? ordered : null
}

/** Builds exactly 22 unique players in 11 positional pairs with bounded deterministic attempts. */
export function createRecruiterDuel(catalog: readonly Player[], seed: string): AuctionCreation {
  for (let attempt = 0; attempt < 48; attempt++) {
    const pairs = createPairs(catalog, `${seed}:attempt:${attempt}`)
    if (!pairs) continue
    const random = createSeededRandom(`${seed}:coin`)
    const coinTossWinner: RecruiterId = random() < .5 ? FIRST : SECOND
    const openingOrder = pairs.map((_, index) => index % 2 === 0 ? coinTossWinner : opponent(coinTossWinner))
    return { ok: true, game: { seed, phase: 'LOBBY', pairs, roundIndex: 0, coinTossWinner, openingOrder, teams: { recruiter_one: emptyTeam(), recruiter_two: emptyTeam() }, activeParticipant: null, currentBid: null, lastAward: null, record: [{ type: 'coin_toss', winner: coinTossWinner }], matchResult: null } }
  }
  return { ok: false, error: 'auction_pool_unavailable' }
}

export function currentPair(game: RecruiterDuelGame) { return game.pairs[game.roundIndex] }
export function openingPriority(game: RecruiterDuelGame) { return game.openingOrder[game.roundIndex] }

function transition(game: RecruiterDuelGame, patch: Partial<RecruiterDuelGame>): AuctionTransition { return { ok: true, game: { ...game, ...patch } } }

export function startCoinToss(game: RecruiterDuelGame): AuctionTransition {
  return game.phase === 'LOBBY' ? transition(game, { phase: 'COIN_TOSS' }) : { ok: false, error: 'invalid_transition' }
}

/** The winner was fixed at game creation; this transition only reveals the stored result. */
export function revealCoinToss(game: RecruiterDuelGame): AuctionTransition {
  return game.phase === 'COIN_TOSS' ? transition(game, { phase: 'REVEAL_PAIR' }) : { ok: false, error: 'invalid_transition' }
}

export function beginBidding(game: RecruiterDuelGame): AuctionTransition {
  return game.phase === 'REVEAL_PAIR' ? transition(game, { phase: 'BIDDING', activeParticipant: openingPriority(game), currentBid: null, lastAward: null }) : { ok: false, error: 'invalid_transition' }
}

function canAward(game: RecruiterDuelGame, primaryWinner: RecruiterId, primaryPrice: number, catalog: Map<string, Player>) {
  const pair = currentPair(game); if (!pair || !Number.isInteger(primaryPrice) || primaryPrice < player(pair, catalog).price) return false
  const alternateWinner = opponent(primaryWinner); const primaryTeam = game.teams[primaryWinner]; const alternateTeam = game.teams[alternateWinner]
  const alternatePrice = player(pair, catalog, true).price
  if (primaryTeam.spent + primaryPrice > DRAFT_BUDGET_MILLIONS || alternateTeam.spent + alternatePrice > DRAFT_BUDGET_MILLIONS) return false
  const leftSpent = primaryWinner === FIRST ? primaryTeam.spent + primaryPrice : alternateTeam.spent + alternatePrice
  const rightSpent = primaryWinner === SECOND ? primaryTeam.spent + primaryPrice : alternateTeam.spent + alternatePrice
  return canFinish(game.pairs, game.roundIndex + 1, leftSpent, rightSpent, catalog)
}

/** Highest amount that can win the current primary while reserving a legal future for both teams. */
export function maximumSafeBid(game: RecruiterDuelGame, participant: RecruiterId, catalogInput: readonly Player[]) {
  const catalog = playerMap(catalogInput); const pair = currentPair(game); if (!pair) return 0
  const minimum = game.currentBid ? game.currentBid.amount + 1 : player(pair, catalog).price
  let maximum = 0
  for (let amount = minimum; amount <= DRAFT_BUDGET_MILLIONS; amount++) if (canAward(game, participant, amount, catalog)) maximum = amount
  return maximum
}

export function placeBid(game: RecruiterDuelGame, participant: RecruiterId, amount: number, catalogInput: readonly Player[]): AuctionTransition {
  if (game.phase !== 'BIDDING') return { ok: false, error: 'invalid_transition' }
  if (game.activeParticipant !== participant) return { ok: false, error: 'not_your_turn' }
  const catalog = playerMap(catalogInput); const pair = currentPair(game); if (!pair) return { ok: false, error: 'invalid_bid' }
  const minimum = game.currentBid ? game.currentBid.amount + 1 : player(pair, catalog).price
  if (!Number.isInteger(amount) || amount < minimum) return { ok: false, error: 'invalid_bid' }
  if (!canAward(game, participant, amount, catalog)) return { ok: false, error: 'unsafe_bid' }
  return transition(game, { currentBid: { participant, amount }, activeParticipant: opponent(participant), record: [...game.record, { type: 'bid', round: game.roundIndex, participant, amount }] })
}

function teamWithAward(team: RecruiterTeam, slotId: AuctionPair['slotId'], playerId: string, price: number): RecruiterTeam {
  return { lineup: { ...team.lineup, [slotId]: playerId }, spent: team.spent + price }
}

function award(game: RecruiterDuelGame, primaryWinner: RecruiterId, primaryPrice: number, catalog: Map<string, Player>): AuctionTransition {
  if (!canAward(game, primaryWinner, primaryPrice, catalog)) return { ok: false, error: 'invalid_award' }
  const pair = currentPair(game); if (!pair) return { ok: false, error: 'invalid_award' }
  const alternateWinner = opponent(primaryWinner); const alternatePrice = player(pair, catalog, true).price
  const teams: Record<RecruiterId, RecruiterTeam> = {
    ...game.teams,
    [primaryWinner]: teamWithAward(game.teams[primaryWinner], pair.slotId, pair.primaryId, primaryPrice),
    [alternateWinner]: teamWithAward(game.teams[alternateWinner], pair.slotId, pair.alternateId, alternatePrice),
  }
  const lastAward: RoundAward = { primaryWinner, primaryPrice, alternateWinner, alternatePrice }
  return transition(game, { phase: 'ROUND_RESULT', teams, activeParticipant: null, currentBid: null, lastAward, record: [...game.record, { type: 'award', round: game.roundIndex, primaryWinner, primaryPrice, alternateWinner, alternatePrice }] })
}

export function passAuction(game: RecruiterDuelGame, participant: RecruiterId, catalogInput: readonly Player[]): AuctionTransition {
  if (game.phase !== 'BIDDING') return { ok: false, error: 'invalid_transition' }
  if (game.activeParticipant !== participant) return { ok: false, error: 'not_your_turn' }
  const catalog = playerMap(catalogInput)
  const passed = { ...game, record: [...game.record, { type: 'pass' as const, round: game.roundIndex, participant }] }
  if (game.currentBid) return award(passed, game.currentBid.participant, game.currentBid.amount, catalog)
  const priority = openingPriority(game); const pair = currentPair(game)!
  const direct = award(passed, priority, player(pair, catalog).price, catalog)
  return direct.ok ? direct : award(passed, opponent(priority), player(pair, catalog).price, catalog)
}

export function nextAuctionRound(game: RecruiterDuelGame, catalog: readonly Player[]): AuctionTransition {
  if (game.phase !== 'ROUND_RESULT') return { ok: false, error: 'invalid_transition' }
  if (game.roundIndex < game.pairs.length - 1) return transition(game, { phase: 'NEXT_ROUND', roundIndex: game.roundIndex + 1, lastAward: null })
  const valid = [FIRST, SECOND].every((participant) => {
    const summary = summarizeDraft(game.teams[participant].lineup, catalog)
    return summary.canConfirm && summary.spent === game.teams[participant].spent
  })
  return valid ? transition(game, { phase: 'TEAMS_COMPLETED', lastAward: null }) : { ok: false, error: 'teams_invalid' }
}

export function revealNextAuctionRound(game: RecruiterDuelGame): AuctionTransition {
  return game.phase === 'NEXT_ROUND' ? transition(game, { phase: 'REVEAL_PAIR' }) : { ok: false, error: 'invalid_transition' }
}

export function startDuelMatch(game: RecruiterDuelGame, catalog: readonly Player[]): AuctionTransition {
  if (game.phase !== 'TEAMS_COMPLETED') return { ok: false, error: 'invalid_transition' }
  const matchResult = simulateMatch({ localLineup: game.teams[FIRST].lineup, cpuLineup: game.teams[SECOND].lineup, catalog, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: `${game.seed}:match` })
  return transition(game, { phase: 'SIMULATING', matchResult })
}

export function completeDuelMatch(game: RecruiterDuelGame): AuctionTransition {
  return game.phase === 'SIMULATING' ? transition(game, { phase: 'MATCH_RESULT' }) : { ok: false, error: 'invalid_transition' }
}
