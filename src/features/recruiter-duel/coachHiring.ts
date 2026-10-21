import { coachById } from '../coaches/coachCatalog'
import { coachesForMode } from '../coaches/coachContext'
import type { ThemedModeId } from '../themed-modes/modeTypes'
import { COACH_OFFER_SIZE, COACH_OFFER_SIZE_V2, COACH_RESERVE, coachMarketOf, coachReserveFor, coachEffect } from '../coaches/coachRules'
import type { Coach } from '../coaches/coachTypes'
import { createSeededRandom, shuffleSeeded } from '../local-match/seededRandom'
import { budgetOf } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame, RecruiterId } from './auctionTypes'

const SIDES: readonly RecruiterId[] = ['recruiter_one', 'recruiter_two']

/**
 * Three distinct coaches per recruiter, derived from seed and collection.
 * Opponents may share a coach; each has a starter contract within the reserve.
 */
const FOCUSES = ['ATTACK', 'DEFENSE', 'MIDFIELD', 'BALANCED'] as const

/**
 * coach-market-v2: up to six distinct coaches from the category's own pool, all affordable with what is left.
 * Deterministic in the seed; keeps the starter contract, always tries the strongest affordable coach, then one coach
 * per specialisation (attack, defence, midfield, balanced) and then unused tiers. Never borrows coaches from other leagues.
 */
function offerV2(seed: string, side: RecruiterId, reserve: number, mode: ThemedModeId | undefined, budget: number | undefined): readonly Coach[] {
  const shuffled = shuffleSeeded(coachesForMode(mode, 'v2'), createSeededRandom(`${seed}:coaches:${side}`))
  if (!shuffled.length) return []
  const cheap = [...shuffled].sort((a, b) => a.price - b.price)[0]
  const affordable = shuffled.filter((c) => c.id !== cheap.id && (budget === undefined || c.price <= budget))
  const picked: Coach[] = [{ ...cheap, price: Math.min(cheap.price, reserve) }]
  const free = (c: Coach) => !picked.some((p) => p.id === c.id)
  const fresh = (candidates: readonly Coach[]) => candidates.find((c) => free(c) && !picked.some((p) => p.tier === c.tier)) ?? candidates.find(free)
  const add = (c?: Coach) => { if (c && picked.length < COACH_OFFER_SIZE_V2) picked.push(c) }
  add([...affordable].sort((a, b) => b.price - a.price)[0])
  for (const focus of FOCUSES) if (!picked.some((p) => p.focus === focus)) add(fresh(affordable.filter((c) => c.focus === focus)))
  for (const c of affordable) if (!picked.some((p) => p.tier === c.tier)) add(c)
  for (const c of affordable) if (free(c)) add(c)
  return picked.sort((a, b) => b.price - a.price || a.id.localeCompare(b.id))
}

export function coachOffers(seed: string, reserve: number = COACH_RESERVE, mode?: ThemedModeId, left?: Readonly<Record<RecruiterId, number>>, market: 'v1' | 'v2' = 'v1'): Readonly<Record<RecruiterId, readonly Coach[]>> {
  if (market === 'v2') return { recruiter_one: offerV2(seed, SIDES[0], reserve, mode, left?.[SIDES[0]]), recruiter_two: offerV2(seed, SIDES[1], reserve, mode, left?.[SIDES[1]]) }
  const pool = coachesForMode(mode)
  const offer = (side: RecruiterId): readonly Coach[] => {
    const shuffled = shuffleSeeded(pool, createSeededRandom(`${seed}:coaches:${side}`))
    const cheap = [...shuffled].sort((a, b) => a.price - b.price)[0]
    // With the money left known, the other cards are only coaches that recruiter can actually pay for.
    const others = shuffled.filter((c) => c.id !== cheap.id && (left === undefined || c.price <= left[side]))
    const top = [...others].sort((a, b) => b.price - a.price)[0]
    const rest = others.filter((c) => c.id !== top?.id)
    // A contextual starter contract guarantees an affordable option even in a
    // historical pool without D coaches. Identity and strength remain unchanged.
    return [{ ...cheap, price: Math.min(cheap.price, reserve) }, ...(top ? [top] : []), ...rest.slice(0, COACH_OFFER_SIZE - 2)].sort((a, b) => b.price - a.price)
  }
  return { recruiter_one: offer(SIDES[0]), recruiter_two: offer(SIDES[1]) }
}

/** The cards shown to each recruiter: three coaches (six in coach-market-v2) of the category's current (or legend) pool that fit what is left. */
export function coachOffersFor(game: RecruiterDuelGame, participant: RecruiterId): readonly Coach[] {
  const left = (side: RecruiterId) => budgetOf(game) - game.teams[side].spent
  return coachOffers(game.seed, coachReserveFor(game.config), game.categoryPair?.[participant] ?? game.coachMode, { recruiter_one: left('recruiter_one'), recruiter_two: left('recruiter_two') }, coachMarketOf(game.config))[participant]
}

/** What the recruiter can still hire: his offer, only while the squads are being organised, only with money and without a coach yet. */
export function coachMarket(game: RecruiterDuelGame, participant: RecruiterId): Coach[] {
  if (game.phase !== 'TEAMS_COMPLETED' || !game.config?.coaches || game.teams[participant].coachId) return []
  const left = budgetOf(game) - game.teams[participant].spent
  return coachOffersFor(game, participant).filter((coach) => coach.price <= left)
}

export function chooseCoach(game: RecruiterDuelGame, participant: RecruiterId, coachId: string): AuctionTransition {
  if (game.phase !== 'TEAMS_COMPLETED') return { ok: false, error: 'invalid_transition' }
  const coach = coachMarket(game, participant).find((candidate) => candidate.id === coachId)
  if (!coach) return { ok: false, error: 'invalid_coach' }
  const team = game.teams[participant]
  return { ok: true, game: { ...game, teams: { ...game.teams, [participant]: { ...team, coachId: coach.id, coachPrice: coach.price, spent: team.spent + coach.price } } } }
}

/** Chooses to go without a coach; opens the substitute step. Only while a coach could still be hired. */
export function declineCoach(game: RecruiterDuelGame, participant: RecruiterId): AuctionTransition {
  if (game.phase !== 'TEAMS_COMPLETED' || !game.config?.coaches || game.teams[participant].coachId) return { ok: false, error: 'invalid_transition' }
  return { ok: true, game: { ...game, teams: { ...game.teams, [participant]: { ...game.teams[participant], coachDeclined: true } } } }
}

const power = (coach: Coach) => { const effect = coachEffect(coach); return effect.attack + effect.defense + effect.midfield }

/** The CPU hires the strongest coach it can afford (cheaper on a tie). Deterministic; does nothing when it already has one. */
export function autoChooseCoach(game: RecruiterDuelGame, participant: RecruiterId): RecruiterDuelGame {
  const best = [...coachMarket(game, participant)].sort((a, b) => power(b) - power(a) || a.price - b.price || a.id.localeCompare(b.id))[0]
  if (!best) return declineCoach(game, participant).ok ? { ...game, teams: { ...game.teams, [participant]: { ...game.teams[participant], coachDeclined: true } } } : game
  const result = chooseCoach(game, participant, best.id)
  return result.ok ? result.game : game
}

/** The hired coach with the price actually paid; looked up in the recruiter's category pool, not in a budget-dependent offer. */
export function coachOf(game: RecruiterDuelGame, participant: RecruiterId): Coach | undefined {
  const team = game.teams[participant]
  if (!team.coachId) return undefined
  const coach = coachesForMode(game.categoryPair?.[participant] ?? game.coachMode, coachMarketOf(game.config)).find((candidate) => candidate.id === team.coachId) ?? coachById(team.coachId)
  return coach ? { ...coach, price: team.coachPrice ?? coach.price } : undefined
}
