import { coachById } from '../coaches/coachCatalog'
import { coachesForMode } from '../coaches/coachContext'
import type { ThemedModeId } from '../themed-modes/modeTypes'
import { COACH_OFFER_SIZE, COACH_RESERVE, coachReserveFor, coachEffect } from '../coaches/coachRules'
import type { Coach } from '../coaches/coachTypes'
import { createSeededRandom, shuffleSeeded } from '../local-match/seededRandom'
import { budgetOf } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame, RecruiterId } from './auctionTypes'

const SIDES: readonly RecruiterId[] = ['recruiter_one', 'recruiter_two']

/**
 * Three distinct coaches per recruiter, derived from seed and collection.
 * Opponents may share a coach; each has a starter contract within the reserve.
 */
export function coachOffers(seed: string, reserve: number = COACH_RESERVE, mode?: ThemedModeId): Readonly<Record<RecruiterId, readonly Coach[]>> {
  const pool = coachesForMode(mode)
  const offer = (side: RecruiterId): readonly Coach[] => {
    const shuffled = shuffleSeeded(pool, createSeededRandom(`${seed}:coaches:${side}`))
    const cheap = [...shuffled].sort((a, b) => a.price - b.price)[0]
    const top = [...shuffled].filter((c) => c.id !== cheap.id).sort((a, b) => b.price - a.price)[0]
    const rest = shuffled.filter((c) => c.id !== cheap.id && c.id !== top?.id)
    // A contextual starter contract guarantees an affordable option even in a
    // historical pool without D coaches. Identity and strength remain unchanged.
    return [{ ...cheap, price: Math.min(cheap.price, reserve) }, ...(top ? [top] : []), ...rest.slice(0, COACH_OFFER_SIZE - 2)].sort((a, b) => b.price - a.price)
  }
  return { recruiter_one: offer(SIDES[0]), recruiter_two: offer(SIDES[1]) }
}

/** What the recruiter can still hire: his offer, only while the squads are being organised, only with money and without a coach yet. */
export function coachMarket(game: RecruiterDuelGame, participant: RecruiterId): Coach[] {
  if (game.phase !== 'TEAMS_COMPLETED' || !game.config?.coaches || game.teams[participant].coachId) return []
  const left = budgetOf(game) - game.teams[participant].spent
  return coachOffers(game.seed, coachReserveFor(game.config), game.coachMode)[participant].filter((coach) => coach.price <= left)
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

export const coachOf = (game: RecruiterDuelGame, participant: RecruiterId) => coachOffers(game.seed, coachReserveFor(game.config), game.coachMode)[participant].find((coach) => coach.id === game.teams[participant].coachId) ?? coachById(game.teams[participant].coachId)
