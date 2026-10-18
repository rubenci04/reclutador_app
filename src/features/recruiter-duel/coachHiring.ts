import { COACH_CATALOG, coachById } from '../coaches/coachCatalog'
import { COACH_OFFER_SIZE, COACH_RESERVE, coachEffect } from '../coaches/coachRules'
import type { Coach } from '../coaches/coachTypes'
import { createSeededRandom, shuffleSeeded } from '../local-match/seededRandom'
import { budgetOf } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame, RecruiterId } from './auctionTypes'

const SIDES: readonly RecruiterId[] = ['recruiter_one', 'recruiter_two']

/**
 * The coaches each recruiter may choose from, derived from the game seed (no extra state, replayable). The two offers never
 * share a coach, and each holds one coach at the reserved price, so nobody is ever left unable to hire.
 */
export function coachOffers(seed: string): Readonly<Record<RecruiterId, readonly Coach[]>> {
  const shuffled = shuffleSeeded(COACH_CATALOG, createSeededRandom(`${seed}:coaches`))
  const cheap = shuffled.filter((coach) => coach.price === COACH_RESERVE).slice(0, SIDES.length)
  const rest = shuffled.filter((coach) => !cheap.includes(coach))
  const order = (coaches: readonly Coach[]) => [...coaches].sort((a, b) => b.price - a.price || a.surname.localeCompare(b.surname))
  const offer = (index: number) => order([cheap[index], ...rest.slice(index * (COACH_OFFER_SIZE - 1), (index + 1) * (COACH_OFFER_SIZE - 1))])
  return { recruiter_one: offer(0), recruiter_two: offer(1) }
}

/** What the recruiter can still hire: his offer, only while the squads are being organised, only with money and without a coach yet. */
export function coachMarket(game: RecruiterDuelGame, participant: RecruiterId): Coach[] {
  if (game.phase !== 'TEAMS_COMPLETED' || !game.config?.coaches || game.teams[participant].coachId) return []
  const left = budgetOf(game) - game.teams[participant].spent
  return coachOffers(game.seed)[participant].filter((coach) => coach.price <= left)
}

export function chooseCoach(game: RecruiterDuelGame, participant: RecruiterId, coachId: string): AuctionTransition {
  if (game.phase !== 'TEAMS_COMPLETED') return { ok: false, error: 'invalid_transition' }
  const coach = coachMarket(game, participant).find((candidate) => candidate.id === coachId)
  if (!coach) return { ok: false, error: 'invalid_coach' }
  const team = game.teams[participant]
  return { ok: true, game: { ...game, teams: { ...game.teams, [participant]: { ...team, coachId: coach.id, spent: team.spent + coach.price } } } }
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

export const coachOf = (game: Pick<RecruiterDuelGame, 'teams'>, participant: RecruiterId) => coachById(game.teams[participant].coachId)
