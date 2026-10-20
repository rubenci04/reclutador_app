import { DRAFT_BUDGET_MILLIONS } from '../../data/catalogRules'
import { coachReserveFor, coachEffect } from '../coaches/coachRules'
import { coachById } from '../coaches/coachCatalog'
import { formationSlots, organizeFormation, isFormationId, type FormationId } from '../tactics/formations'
import type { Player } from '../../types/player'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { createEmptyLineup, summarizeDraft } from '../draft/draftModel'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { MATCH_RULES_VERSION } from '../local-match/matchTypes'
import { createSeededRandom, shuffleSeeded } from '../local-match/seededRandom'
import { isValidOrganizedLineup, simulateMatch } from '../local-match/simulator'
import { swapWithinLine, type LineupSwapError } from '../tactics/lineupOrdering'
import type { FormationRole } from '../tactics/roles'
import { suggestLineup } from '../tactics/roleProfiles'
import { TACTICS_VERSION, isStrategyId, type StrategyId } from '../tactics/strategies'
import { validContext, type DrawContext } from './drawHistory'
import { CLASSIC_CONFIG, SUBSTITUTE_POSITIONS, preflightMatchConfig, rosterComposition, type MatchConfig } from './matchConfig'
import type { AuctionActionError, AuctionCreation, AuctionRound, AuctionTransition, AwardReason, CoinSide, RecruiterDuelGame, RecruiterId, RecruiterTeam, RoundAward } from './auctionTypes'

/** The one source of the budget of a game: its configuration, or the classic value for games without one. */
export const budgetOf = (game: Pick<RecruiterDuelGame, 'config'>) => game.config?.budget ?? DRAFT_BUDGET_MILLIONS
/** Budget the auctions may use: what is left after the money kept aside for the coach. */
export const auctionBudgetOf = (game: Pick<RecruiterDuelGame, 'config'>) => budgetOf(game) - coachReserveFor(game.config)
const FIRST: RecruiterId = 'recruiter_one'
const SECOND: RecruiterId = 'recruiter_two'
const POSITIONS = ['ARQ', 'DEF', 'MED', 'DEL'] as const
const opponent = (participant: RecruiterId): RecruiterId => participant === FIRST ? SECOND : FIRST
const emptyTeam = (config: MatchConfig = CLASSIC_CONFIG): RecruiterTeam => ({ lineup: createEmptyLineup(), spent: 0, ...(config.substitutes ? { bench: SUBSTITUTE_POSITIONS.map((position) => ({ position, playerId: null })) } : {}) })
const playerMap = (catalog: readonly Player[]) => new Map(catalog.map((player) => [player.id, player] as const))
const benchSlots = (team: RecruiterTeam) => team.bench ?? []
const teamCount = (team: RecruiterTeam, position: Player['position']) => formationSlots(team.formation).filter((slot) => slot.position === position && team.lineup[slot.id]).length + benchSlots(team).filter((slot) => slot.position === position && slot.playerId).length
const capacityOf = (team: RecruiterTeam, position: Player['position']) => formationSlots(team.formation).filter((slot) => slot.position === position).length + benchSlots(team).filter((slot) => slot.position === position).length
export const positionProgress = (team: RecruiterTeam, position: Player['position']) => {
  const capacity = capacityOf(team, position)
  const filled = teamCount(team, position)
  return { filled, capacity, remaining: capacity - filled }
}
const teamHasSpace = (team: RecruiterTeam, position: Player['position']) => teamCount(team, position) < capacityOf(team, position)
/** Every player of the roster, starters first, then bench. */
export const rosterIds = (team: RecruiterTeam) => [...Object.values(team.lineup), ...benchSlots(team).map((slot) => slot.playerId)]
export const isRosterComplete = (team: RecruiterTeam) => rosterIds(team).every(Boolean)
/** Places a signing in the first open starter slot of its line, otherwise in the bench slot of that position. Null when full. */
function placeInTeam(team: RecruiterTeam, position: Player['position'], playerId: string, price: number): RecruiterTeam | null {
  const slot = DRAFT_SLOTS.find((candidate) => candidate.position === position && !team.lineup[candidate.id])
  if (slot) return { ...team, lineup: { ...team.lineup, [slot.id]: playerId }, spent: team.spent + price }
  const benchIndex = benchSlots(team).findIndex((candidate) => candidate.position === position && !candidate.playerId)
  if (benchIndex < 0) return null
  return { ...team, bench: benchSlots(team).map((candidate, index) => index === benchIndex ? { ...candidate, playerId } : candidate), spent: team.spent + price }
}

/** Pure feasibility search: every remaining individual card must still fit a legal 4-3-3 and budget. */
export function canFinishRounds(rounds: readonly AuctionRound[], fromIndex: number, teams: Readonly<Record<RecruiterId, RecruiterTeam>>, catalog: Map<string, Player>, budget: number = DRAFT_BUDGET_MILLIONS) {
  const leftBudget = budget - teams[FIRST].spent
  const rightBudget = budget - teams[SECOND].spent
  if (leftBudget < 0 || rightBudget < 0) return false
  let costs = new Set([0]); let total = 0
  for (const position of POSITIONS) {
    const needed = capacityOf(teams[FIRST], position) - teamCount(teams[FIRST], position)
    const otherNeeded = capacityOf(teams[SECOND], position) - teamCount(teams[SECOND], position)
    const candidates = rounds.slice(fromIndex).filter((round) => round.position === position).map((round) => catalog.get(round.playerId))
    if (needed < 0 || otherNeeded < 0 || candidates.length !== needed + otherNeeded || candidates.some((candidate) => !candidate || candidate.position !== position)) return false
    const sums = Array.from({ length: needed + 1 }, () => new Set<number>())
    sums[0].add(0)
    for (const candidate of candidates) {
      total += candidate!.price
      for (let count = needed; count > 0; count--) for (const sum of sums[count - 1]) sums[count].add(sum + candidate!.price)
    }
    const combined = new Set<number>()
    for (const cost of costs) for (const sum of sums[needed]) if (cost + sum <= leftBudget) combined.add(cost + sum)
    costs = combined
  }
  return [...costs].some((cost) => total - cost <= rightBudget)
}

/**
 * Share of the two budgets that the base prices of the drawn cards may add up to. The rest is room to bid above the base
 * price, so offers are not capped from the first round. Later attempts relax it; the last one only asks for feasibility.
 */
export const DRAW_BASE_SHARE = [0.75, 0.85, 1] as const

/** Swaps expensive cards (more likely the dearer they are) for cheaper unused players of the same position until the share is met. */
function shaveToShare(selected: AuctionRound[], catalog: readonly Player[], cap: number, random: () => number, protectStars = false) {
  const price = new Map(catalog.map((player) => [player.id, player.price] as const))
  const chosen = new Set(selected.map((round) => round.playerId))
  let total = selected.reduce((sum, round) => sum + price.get(round.playerId)!, 0)
  for (let guard = 0; total > cap && guard < 300; guard++) {
    const weights = selected.map((round) => protectStars && catalog.find((p) => p.id === round.playerId)!.overall_rating >= 98 ? 0 : price.get(round.playerId)! ** 2)
    if (!weights.some((w) => w > 0)) break
    let ticket = random() * weights.reduce((sum, weight) => sum + weight, 0); let index = 0
    while (index < weights.length - 1 && ticket >= weights[index]) { ticket -= weights[index]; index++ }
    const round = selected[index]; const cost = price.get(round.playerId)!
    const cheaper = catalog.filter((player) => player.position === round.position && !chosen.has(player.id) && player.price < cost).sort((a, b) => a.id.localeCompare(b.id))
    if (!cheaper.length) continue
    const pick = cheaper[Math.floor(random() * cheaper.length)]
    chosen.delete(round.playerId); chosen.add(pick.id)
    selected[index] = { position: round.position, playerId: pick.id }
    total += pick.price - cost
  }
}

function createRounds(catalog: readonly Player[], seed: string, context: DrawContext | undefined, relaxation: number, config: MatchConfig, baseShare: number): AuctionRound[] | null {
  const random = createSeededRandom(`${seed}:pool`)
  const composition = rosterComposition(config)
  const required = { ARQ: composition.ARQ * 2, DEF: composition.DEF * 2, MED: composition.MED * 2, DEL: composition.DEL * 2 } as const
  const selected: AuctionRound[] = []
  for (const position of POSITIONS) {
    const eligible = catalog.filter((candidate) => candidate.position === position)
    const strength = relaxation * Math.min(1, Math.max(0, (eligible.length - required[position]) / required[position]))
    const options = context ? eligible.sort((a, b) => a.id.localeCompare(b.id)).map((player) => {
      const appearances = context.recent.filter((draw) => draw.includes(player.id)).length
      const weight = (context.policy === 'rarity-v2' && player.overall_rating >= 98 ? .25 : 1) / (1 + 2 * strength * appearances)
      return { player, key: -Math.log(Math.max(Number.MIN_VALUE, random())) / weight }
    }).sort((a, b) => a.key - b.key || a.player.id.localeCompare(b.player.id)).slice(0, required[position]).map(({ player }) => player)
      : shuffleSeeded(eligible, random).slice(0, required[position])
    if (options.length !== required[position]) return null
    selected.push(...options.map((candidate) => ({ position, playerId: candidate.id })))
  }
  shaveToShare(selected, catalog, Math.floor(baseShare * 2 * config.budget), random, context?.policy === 'rarity-v2')
  const ordered = shuffleSeeded(selected, random)
  return canFinishRounds(ordered, 0, { recruiter_one: emptyTeam(config), recruiter_two: emptyTeam(config) }, playerMap(catalog), config.budget - coachReserveFor(config)) ? ordered : null
}

/** Builds the unique cards of the duel: 22 in the classic mode (2 ARQ, 8 DEF, 6 MED, 6 DEL), 28 with substitutes. */
export function createRecruiterDuel(catalog: readonly Player[], seed: string, context?: DrawContext, config: MatchConfig = CLASSIC_CONFIG): AuctionCreation {
  const preflight = preflightMatchConfig(catalog, config)
  if (!preflight.ok) return { ok: false, error: preflight.reason === 'budget_range' ? 'budget_range' : preflight.reason === 'budget_too_low' ? 'budget_too_low' : 'auction_pool_unavailable' }
  if (new Set(catalog.map((player) => player.id)).size !== catalog.length || (context && !validContext(context, catalog))) return { ok: false, error: 'auction_pool_unavailable' }
  for (let attempt = 0; attempt < 48; attempt++) {
    const relaxation = attempt < 16 ? 1 : attempt < 32 ? .5 : 0
    const shares = context?.policy === 'rarity-v2' ? [.85, .925, 1] : DRAW_BASE_SHARE
    const rounds = createRounds(catalog, `${seed}:attempt:${attempt}`, context, relaxation, config, shares[Math.min(2, Math.floor(attempt / 16))])
    if (!rounds) continue
    return { ok: true, game: { seed, ...(config === CLASSIC_CONFIG ? {} : { config }), ...(context ? { drawContext: structuredClone(context) } : {}), drawDiagnostics: { attempts: attempt + 1, relaxation, smallPoolPositions: POSITIONS.filter((position) => catalog.filter((player) => player.position === position).length < 4 * rosterComposition(config)[position]) }, phase: 'LOBBY', rounds, roundIndex: 0, discardsRemaining: 3, discardedPlayerIds: [], lastDiscard: null, coinCall: null, coinResult: null, coinTossWinner: null, openingOrder: [], teams: { recruiter_one: emptyTeam(config), recruiter_two: emptyTeam(config) }, activeParticipant: null, currentBid: null, passedParticipants: [], lastAward: null, record: [], matchResult: null } }
  }
  return { ok: false, error: 'auction_pool_unavailable' }
}

export const currentRound = (game: RecruiterDuelGame) => game.rounds[game.roundIndex]
export const openingPriority = (game: RecruiterDuelGame) => game.openingOrder[game.roundIndex]
/** Bounded search; never reuses an awarded, reserved or discarded candidate. */
export function discardReplacement(game: RecruiterDuelGame, catalog: readonly Player[]): AuctionRound | null {
  if (game.discardsRemaining <= 0 || game.phase !== 'BIDDING' || game.currentBid) return null
  const round = currentRound(game)
  if (!round) return null
  const unavailable = new Set([...game.rounds.map((entry) => entry.playerId), ...game.discardedPlayerIds, ...Object.values(game.teams).flatMap((team) => Object.values(team.lineup))])
  const random = createSeededRandom(`${game.seed}:discard:${3 - game.discardsRemaining}:${game.roundIndex}`)
  const candidates = catalog.filter((player) => player.position === round.position && !unavailable.has(player.id)).sort((a, b) => a.id.localeCompare(b.id)).map((player) => {
    const appearances = game.drawContext?.recent.filter((draw) => draw.includes(player.id)).length ?? 0
    return { player, key: -Math.log(Math.max(Number.MIN_VALUE, random())) * (1 + 2 * appearances) * Math.max(.5, player.price / 8) }
  }).sort((a, b) => a.key - b.key || a.player.id.localeCompare(b.player.id))
  const map = playerMap(catalog)
  for (const { player } of candidates) {
    const replacement = { position: round.position, playerId: player.id }
    const rounds = game.rounds.map((entry, index) => index === game.roundIndex ? replacement : entry)
    if (canFinishRounds(rounds, game.roundIndex, game.teams, map, auctionBudgetOf(game))) return replacement
  }
  return null
}
const transition = (game: RecruiterDuelGame, patch: Partial<RecruiterDuelGame>): AuctionTransition => ({ ok: true, game: { ...game, ...patch } })

export function startCoinToss(game: RecruiterDuelGame, calledSide: CoinSide): AuctionTransition {
  if (game.phase !== 'LOBBY') return { ok: false, error: 'invalid_transition' }
  const coinResult: CoinSide = createSeededRandom(`${game.seed}:coin`)() < .5 ? 'heads' : 'tails'
  return transition(game, { phase: 'COIN_TOSS', coinCall: calledSide, coinResult })
}

/** The decision was stored when confirming the side; animation never recalculates it. */
export function revealCoinToss(game: RecruiterDuelGame): AuctionTransition {
  if (game.phase !== 'COIN_TOSS' || !game.coinCall || !game.coinResult) return { ok: false, error: 'invalid_transition' }
  const winner: RecruiterId = game.coinCall === game.coinResult ? FIRST : SECOND
  const openingOrder = game.rounds.map((_, index) => index % 2 === 0 ? winner : opponent(winner))
  const direct = game.categoryPair && game.categoryPair.recruiter_one !== game.categoryPair.recruiter_two
  return transition(game, { phase: direct ? 'TEAMS_COMPLETED' : 'REVEAL_PLAYER', coinTossWinner: winner, openingOrder, record: [...game.record, { type: 'coin_toss', calledSide: game.coinCall, result: game.coinResult, winner }] })
}

export function beginBidding(game: RecruiterDuelGame): AuctionTransition {
  const priority = openingPriority(game)
  return game.phase === 'REVEAL_PLAYER' && priority ? transition(game, { phase: 'BIDDING', activeParticipant: priority, currentBid: null, passedParticipants: [], lastAward: null }) : { ok: false, error: 'invalid_transition' }
}

function canAward(game: RecruiterDuelGame, winner: RecruiterId, price: number, catalog: Map<string, Player>) {
  const round = currentRound(game); const candidate = round && catalog.get(round.playerId)
  if (!round || !candidate || !Number.isInteger(price) || price < candidate.price) return false
  const team = game.teams[winner]
  if (!teamHasSpace(team, round.position) || team.spent + price > auctionBudgetOf(game)) return false
  const placed = placeInTeam(team, round.position, candidate.id, price)
  if (!placed) return false
  const teams = { ...game.teams, [winner]: placed }
  return canFinishRounds(game.rounds, game.roundIndex + 1, teams, catalog, auctionBudgetOf(game))
}

/** Highest legal price while reserving all missing positions and budget for both recruiters. */
export function maximumSafeBid(game: RecruiterDuelGame, participant: RecruiterId, catalogInput: readonly Player[]) {
  const catalog = playerMap(catalogInput); const round = currentRound(game); const candidate = round && catalog.get(round.playerId)
  if (!candidate) return 0
  const minimum = game.currentBid ? game.currentBid.amount + 1 : candidate.price
  // Feasibility is monotone in the winning price; binary search avoids repeated full scans.
  if (!canAward(game, participant, minimum, catalog)) return 0
  let low = minimum; let high = auctionBudgetOf(game) - game.teams[participant].spent
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (canAward(game, participant, middle, catalog)) low = middle
    else high = middle - 1
  }
  return low
}

export type AuctionBlockCode = 'NOT_YOUR_TURN' | 'POSITION_FULL' | 'INSUFFICIENT_BUDGET' | 'FUTURE_BUDGET_RESERVED' | 'CPU_THINKING' | 'ACTION_PENDING' | 'INVALID_OFFER' | 'NO_LEGAL_ASSIGNMENT'
/** One source for UI diagnostics, using exactly the award feasibility predicate. */
export function auctionAvailability(game: RecruiterDuelGame, participant: RecruiterId, catalogInput: readonly Player[], offer?: number, cpuThinking = false) {
  const catalog = playerMap(catalogInput)
  const candidate = catalog.get(currentRound(game)?.playerId)
  const minimum = game.currentBid ? game.currentBid.amount + 1 : candidate?.price ?? 0
  const maximum = maximumSafeBid(game, participant, catalogInput)
  let pending: AuctionBlockCode | null = null
  if (game.phase !== 'BIDDING' || !candidate) pending = 'ACTION_PENDING'
  else if (cpuThinking) pending = 'CPU_THINKING'
  else if (game.activeParticipant !== participant) pending = 'NOT_YOUR_TURN'
  const amount = offer ?? minimum
  const reason: AuctionBlockCode | null = pending
    ?? (candidate && !teamHasSpace(game.teams[participant], candidate.position) ? 'POSITION_FULL' : null)
    ?? (minimum > auctionBudgetOf(game) - game.teams[participant].spent ? 'INSUFFICIENT_BUDGET' : null)
    ?? (maximum < minimum ? 'FUTURE_BUDGET_RESERVED' : null)
    ?? (!Number.isInteger(amount) || amount < minimum ? 'INVALID_OFFER' : null)
    ?? (amount > auctionBudgetOf(game) - game.teams[participant].spent ? 'INSUFFICIENT_BUDGET' : null)
    ?? (amount > maximum ? 'FUTURE_BUDGET_RESERVED' : null)
  let fallback: RoundAward | null = null
  const priority = openingPriority(game)
  if (candidate && priority && !game.currentBid && game.phase === 'BIDDING') {
    const priorityViable = canAward(game, priority, candidate.price, catalog)
    const otherViable = canAward(game, opponent(priority), candidate.price, catalog)
    if (priorityViable || otherViable) fallback = { winner: priorityViable ? priority : opponent(priority), playerId: candidate.id, price: candidate.price, reason: priorityViable && otherViable ? 'double_pass_priority' : 'forced_viability' }
  }
  const replacement = discardReplacement(game, catalogInput)
  const passAward: RoundAward | null = game.currentBid
    ? { winner: game.currentBid.participant, playerId: candidate?.id ?? '', price: game.currentBid.amount, reason: 'voluntary_bid' }
    : game.passedParticipants.length && !replacement ? fallback : null
  const assignmentCode = passAward && passAward.reason !== 'voluntary_bid' ? 'MANDATORY_ASSIGNMENT' as const : null
  const passReason = pending ?? (!game.currentBid && !replacement && !fallback ? 'NO_LEGAL_ASSIGNMENT' as const : null)
  return { minimum, maximum, bid: { enabled: reason === null, reason }, pass: { enabled: passReason === null, reason: passReason }, fallback, passAward, assignmentCode, replacement, discardReason: game.discardsRemaining > 0 && !game.currentBid && !replacement ? 'NO_LEGAL_REPLACEMENT' as const : null }
}

export function placeBid(game: RecruiterDuelGame, participant: RecruiterId, amount: number, catalogInput: readonly Player[]): AuctionTransition {
  if (game.phase !== 'BIDDING') return { ok: false, error: 'invalid_transition' }
  if (game.activeParticipant !== participant) return { ok: false, error: 'not_your_turn' }
  const catalog = playerMap(catalogInput); const round = currentRound(game); const candidate = round && catalog.get(round.playerId)
  if (!candidate) return { ok: false, error: 'invalid_bid' }
  const minimum = game.currentBid ? game.currentBid.amount + 1 : candidate.price
  if (!Number.isInteger(amount) || amount < minimum) return { ok: false, error: 'invalid_bid' }
  if (!canAward(game, participant, amount, catalog)) return { ok: false, error: 'unsafe_bid' }
  const bidGame = { ...game, currentBid: { participant, amount }, record: [...game.record, { type: 'bid' as const, round: game.roundIndex, participant, amount }] }
  return game.passedParticipants.includes(opponent(participant)) ? award(bidGame, participant, amount, catalog) : transition(bidGame, { activeParticipant: opponent(participant) })
}

function award(game: RecruiterDuelGame, winner: RecruiterId, price: number, catalog: Map<string, Player>, reason: AwardReason = 'voluntary_bid'): AuctionTransition {
  if (!canAward(game, winner, price, catalog)) return { ok: false, error: 'invalid_award' }
  const round = currentRound(game)!; const placed = placeInTeam(game.teams[winner], round.position, round.playerId, price)
  if (!placed) return { ok: false, error: 'invalid_award' }
  const teams = { ...game.teams, [winner]: placed }
  const lastAward: RoundAward = { winner, playerId: round.playerId, price, reason }
  return transition(game, { phase: 'ROUND_RESULT', teams, activeParticipant: null, currentBid: null, passedParticipants: [], lastAward, record: [...game.record, { type: 'award', round: game.roundIndex, winner, playerId: round.playerId, price, reason }] })
}

export function passAuction(game: RecruiterDuelGame, participant: RecruiterId, catalogInput: readonly Player[]): AuctionTransition {
  if (game.phase !== 'BIDDING') return { ok: false, error: 'invalid_transition' }
  if (game.activeParticipant !== participant) return { ok: false, error: 'not_your_turn' }
  const catalog = playerMap(catalogInput)
  const passed = { ...game, passedParticipants: [...game.passedParticipants, participant], record: [...game.record, { type: 'pass' as const, round: game.roundIndex, participant }] }
  if (game.currentBid) return award(passed, game.currentBid.participant, game.currentBid.amount, catalog)
  if (game.passedParticipants.length === 0) return transition(passed, { activeParticipant: opponent(participant) })
  const replacement = discardReplacement(game, catalogInput)
  if (replacement) {
    const playerId = currentRound(game).playerId
    return transition(passed, { phase: 'DISCARD_RESULT', rounds: game.rounds.map((round, index) => index === game.roundIndex ? replacement : round), discardsRemaining: game.discardsRemaining - 1, discardedPlayerIds: [...game.discardedPlayerIds, playerId], lastDiscard: { playerId, replacementId: replacement.playerId }, passedParticipants: [], activeParticipant: null, currentBid: null, record: [...passed.record, { type: 'discard', round: game.roundIndex, playerId, replacementId: replacement.playerId }] })
  }
  const round = currentRound(game); const candidate = round && catalog.get(round.playerId); const priority = openingPriority(game)
  if (!candidate || !priority) return { ok: false, error: 'invalid_award' }
  const otherViable = canAward(passed, opponent(priority), candidate.price, catalog)
  const direct = award(passed, priority, candidate.price, catalog, otherViable ? 'double_pass_priority' : 'forced_viability')
  if (direct.ok) return direct
  const other = award(passed, opponent(priority), candidate.price, catalog, 'forced_viability')
  return other.ok ? other : { ok: false, error: 'no_legal_assignment' }
}

export const revealDiscardReplacement = (game: RecruiterDuelGame): AuctionTransition => game.phase === 'DISCARD_RESULT' && game.lastDiscard ? transition(game, { phase: 'REVEAL_PLAYER', lastDiscard: null }) : { ok: false, error: 'invalid_transition' }

export function nextAuctionRound(game: RecruiterDuelGame, catalog: readonly Player[]): AuctionTransition {
  if (game.phase !== 'ROUND_RESULT') return { ok: false, error: 'invalid_transition' }
  if (game.roundIndex < game.rounds.length - 1) {
    const from = game.roundIndex + 1
    const needsStarter = (position: Player['position']) => [FIRST, SECOND].some((side) => DRAFT_SLOTS.some((slot) => slot.position === position && !game.teams[side].lineup[slot.id]))
    const startersPending = POSITIONS.some(needsStarter)
    const eligible = (round: AuctionRound) => startersPending ? needsStarter(round.position) : [FIRST, SECOND].some((side) => teamHasSpace(game.teams[side], round.position))
    const index = game.rounds.findIndex((round, i) => i >= from && eligible(round))
    if (index < 0) return { ok: false, error: 'teams_invalid' }
    // Move a pending card, never invent a signing, consume RNG or discard a card.
    // Exact remaining quotas and the feasibility search are independent of order.
    const rounds = [...game.rounds]
    ;[rounds[from], rounds[index]] = [rounds[index], rounds[from]]
    return transition(game, { phase: 'NEXT_ROUND', roundIndex: from, rounds, lastAward: null })
  }
  const valid = [FIRST, SECOND].every((participant) => {
    const summary = summarizeDraft(game.teams[participant].lineup, catalog, budgetOf(game))
    const team = game.teams[participant]
    return summary.canConfirm && summary.spent <= team.spent && team.spent <= budgetOf(game)
      && new Set(Object.values(team.lineup)).size === 11 && isRosterComplete(team)
      && new Set(rosterIds(team)).size === rosterIds(team).length
      && benchSlots(team).every((slot) => catalog.find((player) => player.id === slot.playerId)?.position === slot.position)
      && DRAFT_SLOTS.every((slot) => catalog.find((player) => player.id === team.lineup[slot.id])?.position === slot.position)
  })
  // Initial placement uses verified role documentation only (none yet: the lineup stays as awarded).
  const teams = { recruiter_one: { ...game.teams.recruiter_one, lineup: suggestLineup(game.teams.recruiter_one.lineup) }, recruiter_two: { ...game.teams.recruiter_two, lineup: suggestLineup(game.teams.recruiter_two.lineup) } }
  return valid ? transition(game, { phase: 'TEAMS_COMPLETED', lastAward: null, teams }) : { ok: false, error: 'teams_invalid' }
}

export const revealNextAuctionRound = (game: RecruiterDuelGame): AuctionTransition => game.phase === 'NEXT_ROUND' ? transition(game, { phase: 'REVEAL_PLAYER' }) : { ok: false, error: 'invalid_transition' }

/**
 * Starts the match from the organised elevens. `strategies` are optional (NEUTRAL when omitted) and are validated here,
 * together with both lineups, instead of letting the simulator throw. Secret simultaneous choice belongs to C3.
 */
export function startDuelMatch(game: RecruiterDuelGame, catalog: readonly Player[], strategies?: Readonly<Record<RecruiterId, unknown>>, actionModel = false): AuctionTransition {
  if (game.phase !== 'TEAMS_COMPLETED') return { ok: false, error: 'invalid_transition' }
  if (![FIRST, SECOND].every((participant) => isValidOrganizedLineup(game.teams[participant].lineup, catalog, budgetOf(game), game.teams[participant].formation))) return { ok: false, error: 'teams_invalid' }
  const chosen = strategies ?? { recruiter_one: 'NEUTRAL', recruiter_two: 'NEUTRAL' }
  if (!isStrategyId(chosen.recruiter_one) || !isStrategyId(chosen.recruiter_two)) return { ok: false, error: 'invalid_strategy' }
  const stored: Record<RecruiterId, StrategyId> = { recruiter_one: chosen.recruiter_one, recruiter_two: chosen.recruiter_two }
  const benchIds = (participant: RecruiterId) => benchSlots(game.teams[participant]).flatMap((slot) => slot.playerId ? [slot.playerId] : [])
  const benches = { local: benchIds(FIRST), cpu: benchIds(SECOND) }
  const coachFor = (participant: RecruiterId) => { const coach = coachById(game.teams[participant].coachId); return coach ? { id: coach.id, ...coachEffect(coach, stored[participant]) } : null }
  const coaches = { local: coachFor(FIRST), cpu: coachFor(SECOND) }
  const matchResult = simulateMatch({ ...(game.teams[FIRST].formation || game.teams[SECOND].formation || actionModel ? { formations: { local: game.teams[FIRST].formation ?? '4-3-3', cpu: game.teams[SECOND].formation ?? '4-3-3' } } : {}), ...(actionModel ? { seriesFormat: 'home-away' as const, actionModel: 'action-v3' as const } : {}), localLineup: game.teams[FIRST].lineup, cpuLineup: game.teams[SECOND].lineup, catalog, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: `${game.seed}:match`, rosterBonus: true, ...(game.config ? { budget: game.config.budget } : {}), ...(!game.manualBench && (benches.local.length || benches.cpu.length) ? { benches } : {}), ...(coaches.local || coaches.cpu ? { coaches } : {}), tactics: { version: TACTICS_VERSION, local: stored.recruiter_one, cpu: stored.recruiter_two } })
  return transition(game, { phase: 'SIMULATING', matchResult, strategies: stored })
}

/** Candidates per line (DEF, MED, DEL) in the substitute pool. */
export const SUBSTITUTE_POOL_PER_LINE = 3

/**
 * Where substitutes come from: first the players that came out as cards and were discarded (nobody owns them), then, for
 * every line short of ${SUBSTITUTE_POOL_PER_LINE}, seeded extras of the same catalog nobody owns. Same pool for both recruiters, derived from the seed.
 */
export function substitutePool(game: RecruiterDuelGame, catalog: readonly Player[]): Player[] {
  const lines = SUBSTITUTE_POSITIONS as readonly string[]
  const owned = new Set([...rosterIds(game.teams[FIRST]), ...rosterIds(game.teams[SECOND])])
  const byId = playerMap(catalog)
  const discarded = game.discardedPlayerIds.flatMap((id) => { const player = byId.get(id); return player && lines.includes(player.position) && !owned.has(id) ? [player] : [] })
  const random = createSeededRandom(`${game.seed}:bench`)
  const used = new Set(discarded.map((player) => player.id))
  const extras = SUBSTITUTE_POSITIONS.flatMap((position) => {
    const missing = SUBSTITUTE_POOL_PER_LINE - discarded.filter((player) => player.position === position).length
    const eligible = catalog.filter((player) => player.position === position && !owned.has(player.id) && !used.has(player.id)).sort((a, b) => a.id.localeCompare(b.id))
    return missing > 0 ? shuffleSeeded(eligible, random).slice(0, missing) : []
  })
  return [...discarded, ...extras]
}

/**
 * Substitutes bought with the money left, after the eleven and the coach: one per line (DEF, MED, DEL), from the pool above,
 * only what the recruiter can still pay and only while both recruiters still have money. Best rated first. Empty outside TEAMS_COMPLETED.
 */
export function substituteMarket(game: RecruiterDuelGame, participant: RecruiterId, catalog: readonly Player[]): Player[] {
  if (game.phase !== 'TEAMS_COMPLETED') return []
  const team = game.teams[participant]
  if (game.config?.coaches && !team.coachId && !team.coachDeclined) return []
  if (benchSlots(team).length >= 3) return []
  const left = budgetOf(game) - team.spent
  if (!game.manualBench && budgetOf(game) - game.teams[opponent(participant)].spent <= 0) return []
  const taken = new Set(benchSlots(team).map((slot) => slot.position))
  const eligible = game.categoryPair ? new Set(catalogForMode(game.categoryPair[participant]).map((p) => p.id)) : null
  return substitutePool(game, eligible ? catalog.filter((p) => eligible.has(p.id)) : catalog).filter((player) => (game.manualBench || !taken.has(player.position)) && player.price <= left)
    .sort((a, b) => b.overall_rating - a.overall_rating || a.price - b.price || a.id.localeCompare(b.id))
}

/**
 * Puts a substitute in the eleven in place of a starter of the same line; the starter takes his place on the bench.
 * Money and ownership do not change. Only the eleven plays the match, so this is how a signing becomes a starter.
 */
export function swapBenchWithStarter(game: RecruiterDuelGame, participant: RecruiterId, benchIndex: number, slotId: string): AuctionTransition {
  if (game.phase !== 'TEAMS_COMPLETED') return { ok: false, error: 'invalid_transition' }
  const team = game.teams[participant]
  const bench = benchSlots(team)[benchIndex]
  const slot = formationSlots(team.formation).find((candidate) => candidate.id === slotId)
  const starterId = slot ? team.lineup[slot.id] : null
  if (!bench?.playerId || !slot || !starterId || slot.position !== bench.position) return { ok: false, error: 'invalid_substitute' }
  const swapped: RecruiterTeam = { ...team, lineup: { ...team.lineup, [slot.id]: bench.playerId }, bench: benchSlots(team).map((candidate, index) => index === benchIndex ? { ...candidate, playerId: starterId } : candidate) }
  return transition(game, { teams: { ...game.teams, [participant]: swapped } })
}

export function buySubstitute(game: RecruiterDuelGame, participant: RecruiterId, playerId: string, catalog: readonly Player[]): AuctionTransition {
  if (game.phase !== 'TEAMS_COMPLETED') return { ok: false, error: 'invalid_transition' }
  const player = substituteMarket(game, participant, catalog).find((candidate) => candidate.id === playerId)
  if (!player) return { ok: false, error: 'invalid_substitute' }
  const team = game.teams[participant]
  const bought: RecruiterTeam = { ...team, bench: [...benchSlots(team), { position: player.position, playerId: player.id }], spent: team.spent + player.price }
  return transition(game, { teams: { ...game.teams, [participant]: bought } })
}

/** The CPU spends what is left on its best affordable substitute of each line. Deterministic. */
export function autoBuySubstitutes(game: RecruiterDuelGame, participant: RecruiterId, catalog: readonly Player[]): RecruiterDuelGame {
  let current = game
  for (const position of SUBSTITUTE_POSITIONS) {
    const pick = substituteMarket(current, participant, catalog).find((player) => player.position === position)
    if (!pick) continue
    const result = buySubstitute(current, participant, pick.id, catalog)
    if (result.ok) current = result.game
  }
  if (current.manualBench) {
    for (let index = 0; index < benchSlots(current.teams[participant]).length; index++) {
      const team = current.teams[participant]; const place = benchSlots(team)[index]
      const incoming = catalog.find((p) => p.id === place.playerId)
      const slots = formationSlots(team.formation).filter((s) => s.position === place.position)
      const weakest = [...slots].sort((a, b) => catalog.find((p) => p.id === team.lineup[a.id])!.overall_rating - catalog.find((p) => p.id === team.lineup[b.id])!.overall_rating)[0]
      if (incoming && weakest && incoming.overall_rating > catalog.find((p) => p.id === team.lineup[weakest.id])!.overall_rating) {
        const swap = swapBenchWithStarter(current, participant, index, weakest.id)
        if (swap.ok) current = swap.game
      }
    }
  }
  return current
}

export const completeDuelMatch = (game: RecruiterDuelGame): AuctionTransition => game.phase === 'SIMULATING' ? transition(game, { phase: 'MATCH_RESULT' }) : { ok: false, error: 'invalid_transition' }

export type LineupReorder =
  | { readonly ok: true; readonly game: RecruiterDuelGame }
  | { readonly ok: false; readonly error: LineupSwapError | 'invalid_transition' }

/** Reorders one team within a line after the auctions. Ownership and `spent` never change. */
export function reorderTeamLineup(game: RecruiterDuelGame, participant: RecruiterId, slotA: FormationRole, slotB: FormationRole): LineupReorder {
  if (game.phase !== 'TEAMS_COMPLETED') return { ok: false, error: 'invalid_transition' }
  const slots = formationSlots(game.teams[participant].formation)
  if (game.teams[participant].formation && game.teams[participant].formation !== '4-3-3') {
    if (!slots.some((s) => s.id === slotA) || !slots.some((s) => s.id === slotB) || slots.find((s) => s.id === slotA)!.position !== slots.find((s) => s.id === slotB)!.position) return { ok: false, error: 'different_line' }
    const team = game.teams[participant]
    return { ok: true, game: { ...game, teams: { ...game.teams, [participant]: { ...team, lineup: { ...team.lineup, [slotA]: team.lineup[slotB], [slotB]: team.lineup[slotA] } } } } }
  }
  const swapped = swapWithinLine(game.teams[participant].lineup, slotA, slotB)
  if (!swapped.ok) return swapped
  return { ok: true, game: { ...game, teams: { ...game.teams, [participant]: { ...game.teams[participant], lineup: swapped.lineup } } } }
}

export function chooseFormation(game: RecruiterDuelGame, participant: RecruiterId, formation: FormationId, catalog: readonly Player[]): AuctionTransition {
  if (game.phase !== 'TEAMS_COMPLETED' || !isFormationId(formation)) return { ok: false, error: 'invalid_transition' }
  const team = game.teams[participant]
  const owned = [...Object.values(team.lineup), ...(team.bench ?? []).map((p) => p.playerId)].filter((id): id is string => Boolean(id))
  const lineup = organizeFormation(owned, formation, catalog)
  if (!lineup) return { ok: false, error: 'teams_invalid' }
  const starters = new Set(Object.values(lineup))
  const bench = owned.filter((id) => !starters.has(id)).map((id) => ({ playerId: id, position: catalog.find((p) => p.id === id)!.position }))
  return transition(game, { teams: { ...game.teams, [participant]: { ...team, formation, lineup, bench } } })
}

const isComplete = isRosterComplete

/**
 * Early completion is only possible when the rival already has all eleven, so every remaining card can only go to
 * `participant`; and only before any offer or pass on the card in play. Nothing is decided without a caller.
 */
export function canAutoComplete(game: RecruiterDuelGame, participant: RecruiterId) {
  const waiting = game.phase === 'REVEAL_PLAYER' || (game.phase === 'BIDDING' && !game.currentBid && game.passedParticipants.length === 0)
  return waiting && currentRound(game) !== undefined && isComplete(game.teams[opponent(participant)]) && !isComplete(game.teams[participant])
}

/** Awards the card in play to `participant` at its base price through the normal award ledger, then moves to the next card. */
export function autoCompleteStep(game: RecruiterDuelGame, participant: RecruiterId, catalogInput: readonly Player[]): AuctionTransition {
  if (!canAutoComplete(game, participant)) return { ok: false, error: isComplete(game.teams[opponent(participant)]) ? 'invalid_transition' : 'rival_incomplete' }
  const catalog = playerMap(catalogInput); const candidate = catalog.get(currentRound(game).playerId)
  if (!candidate) return { ok: false, error: 'no_legal_assignment' }
  const awarded = award({ ...game, phase: 'BIDDING' }, participant, candidate.price, catalog, 'auto_complete')
  if (!awarded.ok) return { ok: false, error: 'no_legal_assignment' }
  const next = nextAuctionRound(awarded.game, catalogInput)
  return next.ok && next.game.phase === 'NEXT_ROUND' ? revealNextAuctionRound(next.game) : next
}

/** All remaining cards at once. Atomic: any failure returns an error and the received game stays untouched. */
export function autoCompleteAll(game: RecruiterDuelGame, participant: RecruiterId, catalog: readonly Player[]): AuctionTransition {
  let current = game
  while (current.phase !== 'TEAMS_COMPLETED') {
    const step = autoCompleteStep(current, participant, catalog)
    if (!step.ok) return step
    current = step.game
  }
  return { ok: true, game: current }
}

export type AutoCompletePreview =
  | { readonly ok: true; readonly items: readonly { readonly playerId: string; readonly price: number }[]; readonly totalCost: number; readonly finalBudget: number }
  | { readonly ok: false; readonly error: AuctionActionError }

/** What «complete my team» would do, computed with the same steps that confirming executes. */
export function previewAutoComplete(game: RecruiterDuelGame, participant: RecruiterId, catalog: readonly Player[]): AutoCompletePreview {
  const result = autoCompleteAll(game, participant, catalog)
  if (!result.ok) return result
  const items = result.game.record.slice(game.record.length).flatMap((entry) => entry.type === 'award' ? [{ playerId: entry.playerId, price: entry.price }] : [])
  const totalCost = items.reduce((total, item) => total + item.price, 0)
  return { ok: true, items, totalCost, finalBudget: budgetOf(game) - result.game.teams[participant].spent }
}
