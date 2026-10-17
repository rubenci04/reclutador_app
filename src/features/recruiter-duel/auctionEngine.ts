import { DRAFT_BUDGET_MILLIONS } from '../../data/catalogRules'
import type { Player } from '../../types/player'
import { createEmptyLineup, summarizeDraft } from '../draft/draftModel'
import { DRAFT_SLOTS, type DraftSlotId } from '../draft/draftTypes'
import { MATCH_RULES_VERSION } from '../local-match/matchTypes'
import { createSeededRandom, shuffleSeeded } from '../local-match/seededRandom'
import { simulateMatch } from '../local-match/simulator'
import { validContext, type DrawContext } from './drawHistory'
import type { AuctionCreation, AuctionRound, AuctionTransition, AwardReason, CoinSide, RecruiterDuelGame, RecruiterId, RecruiterTeam, RoundAward } from './auctionTypes'

const FIRST: RecruiterId = 'recruiter_one'
const SECOND: RecruiterId = 'recruiter_two'
const POSITIONS = ['ARQ', 'DEF', 'MED', 'DEL'] as const
const opponent = (participant: RecruiterId): RecruiterId => participant === FIRST ? SECOND : FIRST
const emptyTeam = (): RecruiterTeam => ({ lineup: createEmptyLineup(), spent: 0 })
const playerMap = (catalog: readonly Player[]) => new Map(catalog.map((player) => [player.id, player] as const))
const teamCount = (team: RecruiterTeam, position: Player['position']) => DRAFT_SLOTS.filter((slot) => slot.position === position && team.lineup[slot.id]).length
export const positionProgress = (team: RecruiterTeam, position: Player['position']) => {
  const capacity = DRAFT_SLOTS.filter((slot) => slot.position === position).length
  const filled = teamCount(team, position)
  return { filled, capacity, remaining: capacity - filled }
}
const teamHasSpace = (team: RecruiterTeam, position: Player['position']) => teamCount(team, position) < DRAFT_SLOTS.filter((slot) => slot.position === position).length
const firstOpenSlot = (team: RecruiterTeam, position: Player['position']) => DRAFT_SLOTS.find((slot) => slot.position === position && !team.lineup[slot.id])?.id

/** Pure feasibility search: every remaining individual card must still fit a legal 4-3-3 and budget. */
export function canFinishRounds(rounds: readonly AuctionRound[], fromIndex: number, teams: Readonly<Record<RecruiterId, RecruiterTeam>>, catalog: Map<string, Player>) {
  const leftBudget = DRAFT_BUDGET_MILLIONS - teams[FIRST].spent
  const rightBudget = DRAFT_BUDGET_MILLIONS - teams[SECOND].spent
  if (leftBudget < 0 || rightBudget < 0) return false
  let costs = new Set([0]); let total = 0
  for (const position of POSITIONS) {
    const capacity = DRAFT_SLOTS.filter((slot) => slot.position === position).length
    const needed = capacity - teamCount(teams[FIRST], position)
    const otherNeeded = capacity - teamCount(teams[SECOND], position)
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

function createRounds(catalog: readonly Player[], seed: string, context?: DrawContext, relaxation = 1): AuctionRound[] | null {
  const random = createSeededRandom(`${seed}:pool`)
  const required = { ARQ: 2, DEF: 8, MED: 6, DEL: 6 } as const
  const selected: AuctionRound[] = []
  for (const position of POSITIONS) {
    const eligible = catalog.filter((candidate) => candidate.position === position)
    const strength = relaxation * Math.min(1, Math.max(0, (eligible.length - required[position]) / required[position]))
    const options = context ? eligible.sort((a, b) => a.id.localeCompare(b.id)).map((player) => {
      const appearances = context.recent.filter((draw) => draw.includes(player.id)).length
      const weight = 1 / (1 + 2 * strength * appearances)
      return { player, key: -Math.log(Math.max(Number.MIN_VALUE, random())) / weight }
    }).sort((a, b) => a.key - b.key || a.player.id.localeCompare(b.player.id)).slice(0, required[position]).map(({ player }) => player)
      : shuffleSeeded(eligible, random).slice(0, required[position])
    if (options.length !== required[position]) return null
    selected.push(...options.map((candidate) => ({ position, playerId: candidate.id })))
  }
  const ordered = shuffleSeeded(selected, random)
  return canFinishRounds(ordered, 0, { recruiter_one: emptyTeam(), recruiter_two: emptyTeam() }, playerMap(catalog)) ? ordered : null
}

/** Builds exactly 22 unique players: 2 ARQ, 8 DEF, 6 MED and 6 DEL. */
export function createRecruiterDuel(catalog: readonly Player[], seed: string, context?: DrawContext): AuctionCreation {
  if (new Set(catalog.map((player) => player.id)).size !== catalog.length || (context && !validContext(context, catalog))) return { ok: false, error: 'auction_pool_unavailable' }
  for (let attempt = 0; attempt < 48; attempt++) {
    const relaxation = attempt < 16 ? 1 : attempt < 32 ? .5 : 0
    const rounds = createRounds(catalog, `${seed}:attempt:${attempt}`, context, relaxation)
    if (!rounds) continue
    const coinResult: CoinSide = createSeededRandom(`${seed}:coin`)() < .5 ? 'heads' : 'tails'
    return { ok: true, game: { seed, ...(context ? { drawContext: structuredClone(context) } : {}), drawDiagnostics: { attempts: attempt + 1, relaxation, smallPoolPositions: POSITIONS.filter((position) => catalog.filter((player) => player.position === position).length < 2 * ({ ARQ: 2, DEF: 8, MED: 6, DEL: 6 }[position])) }, phase: 'LOBBY', rounds, roundIndex: 0, coinCall: null, coinResult, coinTossWinner: null, openingOrder: [], teams: { recruiter_one: emptyTeam(), recruiter_two: emptyTeam() }, activeParticipant: null, currentBid: null, passedParticipants: [], lastAward: null, record: [], matchResult: null } }
  }
  return { ok: false, error: 'auction_pool_unavailable' }
}

export const currentRound = (game: RecruiterDuelGame) => game.rounds[game.roundIndex]
export const openingPriority = (game: RecruiterDuelGame) => game.openingOrder[game.roundIndex]
const transition = (game: RecruiterDuelGame, patch: Partial<RecruiterDuelGame>): AuctionTransition => ({ ok: true, game: { ...game, ...patch } })

export function startCoinToss(game: RecruiterDuelGame, calledSide: CoinSide): AuctionTransition {
  return game.phase === 'LOBBY' ? transition(game, { phase: 'COIN_TOSS', coinCall: calledSide }) : { ok: false, error: 'invalid_transition' }
}

/** Coin result is stored during creation; this transition only reveals it after the chosen side. */
export function revealCoinToss(game: RecruiterDuelGame): AuctionTransition {
  if (game.phase !== 'COIN_TOSS' || !game.coinCall) return { ok: false, error: 'invalid_transition' }
  const winner: RecruiterId = game.coinCall === game.coinResult ? FIRST : SECOND
  const openingOrder = game.rounds.map((_, index) => index % 2 === 0 ? winner : opponent(winner))
  return transition(game, { phase: 'REVEAL_PLAYER', coinTossWinner: winner, openingOrder, record: [...game.record, { type: 'coin_toss', calledSide: game.coinCall, result: game.coinResult, winner }] })
}

export function beginBidding(game: RecruiterDuelGame): AuctionTransition {
  const priority = openingPriority(game)
  return game.phase === 'REVEAL_PLAYER' && priority ? transition(game, { phase: 'BIDDING', activeParticipant: priority, currentBid: null, passedParticipants: [], lastAward: null }) : { ok: false, error: 'invalid_transition' }
}

function teamWithAward(team: RecruiterTeam, slotId: DraftSlotId, playerId: string, price: number): RecruiterTeam {
  return { lineup: { ...team.lineup, [slotId]: playerId }, spent: team.spent + price }
}

function canAward(game: RecruiterDuelGame, winner: RecruiterId, price: number, catalog: Map<string, Player>) {
  const round = currentRound(game); const candidate = round && catalog.get(round.playerId)
  if (!round || !candidate || !Number.isInteger(price) || price < candidate.price) return false
  const team = game.teams[winner]
  if (!teamHasSpace(team, round.position) || team.spent + price > DRAFT_BUDGET_MILLIONS) return false
  const slotId = firstOpenSlot(team, round.position)
  if (!slotId) return false
  const teams = { ...game.teams, [winner]: teamWithAward(team, slotId, candidate.id, price) }
  return canFinishRounds(game.rounds, game.roundIndex + 1, teams, catalog)
}

/** Highest legal price while reserving all missing positions and budget for both recruiters. */
export function maximumSafeBid(game: RecruiterDuelGame, participant: RecruiterId, catalogInput: readonly Player[]) {
  const catalog = playerMap(catalogInput); const round = currentRound(game); const candidate = round && catalog.get(round.playerId)
  if (!candidate) return 0
  const minimum = game.currentBid ? game.currentBid.amount + 1 : candidate.price
  // Feasibility is monotone in the winning price; binary search avoids repeated full scans.
  if (!canAward(game, participant, minimum, catalog)) return 0
  let low = minimum; let high = DRAFT_BUDGET_MILLIONS - game.teams[participant].spent
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (canAward(game, participant, middle, catalog)) low = middle
    else high = middle - 1
  }
  return low
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
  const round = currentRound(game)!; const team = game.teams[winner]; const slotId = firstOpenSlot(team, round.position)
  if (!slotId) return { ok: false, error: 'invalid_award' }
  const teams = { ...game.teams, [winner]: teamWithAward(team, slotId, round.playerId, price) }
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
  const round = currentRound(game); const candidate = round && catalog.get(round.playerId); const priority = openingPriority(game)
  if (!candidate || !priority) return { ok: false, error: 'invalid_award' }
  const otherViable = canAward(passed, opponent(priority), candidate.price, catalog)
  const direct = award(passed, priority, candidate.price, catalog, otherViable ? 'double_pass_priority' : 'forced_viability')
  return direct.ok ? direct : award(passed, opponent(priority), candidate.price, catalog, 'forced_viability')
}

export function nextAuctionRound(game: RecruiterDuelGame, catalog: readonly Player[]): AuctionTransition {
  if (game.phase !== 'ROUND_RESULT') return { ok: false, error: 'invalid_transition' }
  if (game.roundIndex < game.rounds.length - 1) return transition(game, { phase: 'NEXT_ROUND', roundIndex: game.roundIndex + 1, lastAward: null })
  const valid = [FIRST, SECOND].every((participant) => {
    const summary = summarizeDraft(game.teams[participant].lineup, catalog)
    const team = game.teams[participant]
    return summary.canConfirm && summary.spent <= team.spent && team.spent <= DRAFT_BUDGET_MILLIONS
      && new Set(Object.values(team.lineup)).size === 11
      && DRAFT_SLOTS.every((slot) => catalog.find((player) => player.id === team.lineup[slot.id])?.position === slot.position)
  })
  return valid ? transition(game, { phase: 'TEAMS_COMPLETED', lastAward: null }) : { ok: false, error: 'teams_invalid' }
}

export const revealNextAuctionRound = (game: RecruiterDuelGame): AuctionTransition => game.phase === 'NEXT_ROUND' ? transition(game, { phase: 'REVEAL_PLAYER' }) : { ok: false, error: 'invalid_transition' }

export function startDuelMatch(game: RecruiterDuelGame, catalog: readonly Player[]): AuctionTransition {
  if (game.phase !== 'TEAMS_COMPLETED') return { ok: false, error: 'invalid_transition' }
  const matchResult = simulateMatch({ localLineup: game.teams[FIRST].lineup, cpuLineup: game.teams[SECOND].lineup, catalog, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: `${game.seed}:match` })
  return transition(game, { phase: 'SIMULATING', matchResult })
}

export const completeDuelMatch = (game: RecruiterDuelGame): AuctionTransition => game.phase === 'SIMULATING' ? transition(game, { phase: 'MATCH_RESULT' }) : { ok: false, error: 'invalid_transition' }
